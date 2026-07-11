import { geoPath } from "d3-geo";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import type { RegionStatus } from "../game/engine";
import { projectMap, VIEW_H, VIEW_W } from "../game/geo";
import {
  loadContext,
  loadProvinceOutline,
  loadRelief,
  loadWater,
  PROVINCES,
} from "../maps/registry";
import type {
  ContextCollection,
  MapDefinition,
  ReliefCollection,
  WaterCollection,
} from "../maps/types";
import { nicknameFor } from "../phrases/nicknames";
import { usePanZoom } from "./usePanZoom";

interface MapCanvasProps {
  map: MapDefinition;
  status: RegionStatus[];
  /** Index currently flashing red after a wrong guess, or null. */
  flashIndex: number | null;
  /** Index to briefly reveal after a skip, or null. */
  revealIndex: number | null;
  /** Fires with the clicked/tapped region's index. Correctness lives in the reducer. */
  onPick?: (index: number) => void;
  /** Enables drag-to-pan and pinch/wheel-to-zoom. */
  panZoom?: boolean;
  interactive: boolean;
  isAnimating?: boolean;
  /** Adds the tinted relief bands + waterways (clipped to the province). */
  terrain?: boolean;
  /**
   * Hardcore mode (GitHub #34): hide every pending comune's fill + border so
   * only resolved (found/missed) comuni — and the one momentarily flashing
   * under a tap — are visible. Regions stay tappable (transparent fill still
   * receives pointer events).
   */
  hideBorders?: boolean;
}

export interface MapCanvasRef {
  flyTo: (cx: number, cy: number, scale: number) => void;
  resetZoom: () => void;
}

/** viewBox centre — pan/zoom scale about this so zooming keeps the map centred. */
const CENTER_X = VIEW_W / 2;
const CENTER_Y = VIEW_H / 2;

/**
 * Target physical pixel sizes for context labels. On small / portrait screens
 * the SVG shrinks so viewBox-unit sizes become too tiny; the ResizeObserver in
 * MapCanvas converts these physical targets back to viewBox units and clamps to
 * reasonable floors/ceilings so the labels always feel right-sized for the map.
 */
const LABEL_TARGET_PX = { country: 18, sea: 15, province: 14 } as const;
/** Floor: the label never goes below this in viewBox units (matches the old fixed size). */
const LABEL_MIN_VB = { country: 36, sea: 30, province: 28 } as const;
/** Ceiling: prevents labels from swamping the canvas on very small screens. */
const LABEL_MAX_VB = { country: 54, sea: 46, province: 42 } as const;
const CONTEXT_ORDER = { sea: 0, province: 1, country: 2 } as const;

/** Region of each province by name, for tinting neighbours by region. */
const REGION_BY_PROVINCE = new Map(PROVINCES.map((p) => [p.name, p.region]));

/**
 * A gentle, deterministic tint per region so neighbouring provinces of the same
 * region share a colour — grouping them at a glance — without a hand-kept
 * palette. Hues are spread around the wheel by the golden angle over the fixed,
 * sorted region set, so even geographically adjacent regions land far apart;
 * low saturation over the parchment (fill drawn at a low opacity in CSS) keeps
 * each a quiet wash.
 */
const REGION_HUE = new Map(
  [...new Set(PROVINCES.map((p) => p.region))]
    .sort()
    .map((region, i) => [region, Math.round((i * 137.508) % 360)] as const),
);

function regionTint(region: string): string | null {
  const hue = REGION_HUE.get(region);
  return hue === undefined ? null : `hsl(${hue} 42% 66%)`;
}

interface Layers {
  context: ContextCollection | null;
  relief: ReliefCollection | null;
  water: WaterCollection | null;
}

/**
 * Loads a province's map layers. Context (neighbour/country/sea outlines +
 * labels) always loads so it's visible in every game; relief + waterways load
 * only when the terrain toggle is on. Keyed on the province id so a late resolve
 * for a previous province is ignored.
 */
function useLayers(id: string, terrain: boolean): Layers {
  const [context, setContext] = useState<ContextCollection | null>(null);
  const [terrainData, setTerrainData] = useState<{
    id: string;
    relief: ReliefCollection | null;
    water: WaterCollection | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setContext(null);
    loadContext(id).then((c) => {
      if (!cancelled) setContext(c);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!terrain) {
      setTerrainData(null);
      return;
    }
    let cancelled = false;
    Promise.all([loadRelief(id), loadWater(id)]).then(([relief, water]) => {
      if (!cancelled) setTerrainData({ id, relief, water });
    });
    return () => {
      cancelled = true;
    };
  }, [id, terrain]);

  const active = terrainData && terrainData.id === id ? terrainData : null;
  return {
    context,
    relief: active?.relief ?? null,
    water: active?.water ?? null,
  };
}

/**
 * Loads a province's dissolved outer boundary, used to frame the hardcore map
 * (every comune border is hidden, so without it the player faces a blank page).
 * Only fetches when `enabled`; keyed on the province id so a late resolve for a
 * previous province is ignored.
 */
function useProvinceOutline(
  id: string,
  enabled: boolean,
): Polygon | MultiPolygon | null {
  const [outline, setOutline] = useState<{
    id: string;
    geometry: Polygon | MultiPolygon | null;
  } | null>(null);

  useEffect(() => {
    if (!enabled) {
      setOutline(null);
      return;
    }
    let cancelled = false;
    loadProvinceOutline(id).then((geometry) => {
      if (!cancelled) setOutline({ id, geometry });
    });
    return () => {
      cancelled = true;
    };
  }, [id, enabled]);

  return outline && outline.id === id ? outline.geometry : null;
}

export const MapCanvas = forwardRef<MapCanvasRef, MapCanvasProps>(
  (
    {
      map,
      status,
      flashIndex,
      revealIndex,
      onPick,
      panZoom = false,
      interactive,
      isAnimating = false,
      terrain = false,
      hideBorders = false,
    },
    ref,
  ) => {
    const projected = useMemo(() => projectMap(map), [map]);
    const shapes = projected.features;
    const [hover, setHover] = useState<number | null>(null);
    // 0 = not yet measured; replaced on first ResizeObserver tick.
    const [svgScale, setSvgScale] = useState(0);

    // viewBox-unit font sizes that keep labels physically readable at any scale.
    // At scale ≥ 0.5 the formula yields values at or below the MIN floor, so the
    // labels look identical to the old fixed sizes on desktop. The sizes only grow
    // on small / portrait screens where scale < 0.5, smoothly closing the gap
    // between "map shrank but text stayed tiny" and "readable on every device".
    const labelSize = useMemo(() => {
      const s = svgScale > 0 ? svgScale : 1;
      return {
        country: Math.min(
          LABEL_MAX_VB.country,
          Math.max(LABEL_MIN_VB.country, LABEL_TARGET_PX.country / s),
        ),
        sea: Math.min(
          LABEL_MAX_VB.sea,
          Math.max(LABEL_MIN_VB.sea, LABEL_TARGET_PX.sea / s),
        ),
        province: Math.min(
          LABEL_MAX_VB.province,
          Math.max(LABEL_MIN_VB.province, LABEL_TARGET_PX.province / s),
        ),
      };
    }, [svgScale]);

    const { context, relief, water } = useLayers(map.id, terrain);
    const outlineGeom = useProvinceOutline(map.id, hideBorders);
    const clipId = `province-clip-${map.id}`;

    // The province's projected box — pan/zoom is clamped to it so you can't drift
    // out into the empty surroundings while zoomed in.
    const mapBounds = useMemo(() => {
      const [[x0, y0], [x1, y1]] = geoPath(projected.projection).bounds({
        type: "FeatureCollection",
        features: map.features.map((f) => ({
          type: "Feature",
          properties: null,
          geometry: f.geometry,
        })),
      });
      return { x0, y0, x1, y1 };
    }, [projected.projection, map]);

    // Project the vector layers into this viewBox.
    const drawn = useMemo(() => {
      const path = geoPath(projected.projection);
      const project = projected.projection;

      const contextShapes = [...(context?.features ?? [])]
        .sort(
          (a, b) =>
            CONTEXT_ORDER[a.properties.kind] - CONTEXT_ORDER[b.properties.kind],
        )
        .map((f, i) => {
          const region =
            f.properties.kind === "province"
              ? (REGION_BY_PROVINCE.get(f.properties.name) ?? null)
              : null;
          return {
            key: `ctx-${i}`,
            kind: f.properties.kind,
            tint: region ? regionTint(region) : null,
            d: path(f as Feature) ?? "",
          };
        });

      const contextLabels = (context?.labels ?? []).flatMap((l, i) => {
        const p = project(l.at);
        if (!p) return [];
        const nick = nicknameFor(l.name, map.id);
        const name = nick ?? l.name;
        const fontSize = labelSize[l.kind];
        // text-anchor: middle; dominant-baseline: middle — estimate the rendered
        // half-extents so we can clamp the anchor before it lands under the
        // SVG overflow:hidden boundary. 0.35 × fontSize is a conservative
        // per-character width for the italic map font; 0.55 × fontSize is the
        // cap-half-height. PAD adds a small breathing room at each edge.
        const halfW = Math.ceil(name.length * fontSize * 0.35);
        const halfH = Math.ceil(fontSize * 0.55);
        const PAD = 6;
        return [
          {
            key: `lbl-${i}`,
            kind: l.kind,
            name,
            nick: nick !== null,
            fontSize,
            x: Math.max(halfW + PAD, Math.min(VIEW_W - halfW - PAD, p[0])),
            y: Math.max(halfH + PAD, Math.min(VIEW_H - halfH - PAD, p[1])),
          },
        ];
      });

      const bands = (relief?.features ?? []).map((f, i) => ({
        key: `band-${i}`,
        level: f.properties.level,
        d: path(f as Feature) ?? "",
      }));

      const waterways = (water?.features ?? []).map((f, i) => ({
        key: `wat-${i}`,
        kind: f.properties.kind,
        area: !f.geometry.type.includes("Line"),
        d: path(f as Feature) ?? "",
      }));

      const outline = outlineGeom
        ? (path({
            type: "Feature",
            properties: null,
            geometry: outlineGeom,
          }) ?? "")
        : "";

      return { contextShapes, contextLabels, bands, waterways, outline };
    }, [
      context,
      relief,
      water,
      outlineGeom,
      projected.projection,
      map.id,
      labelSize,
    ]);

    const { svgRef, transformCss, style, handlers, setTransform } = usePanZoom({
      enabled: panZoom && interactive && !isAnimating,
      centerX: CENTER_X,
      centerY: CENTER_Y,
      bounds: mapBounds,
      onTap: onPick,
    });

    // Track the SVG's rendered pixel size so labelSize can compensate on small
    // or portrait screens (scale < 0.5) without affecting desktop rendering.
    useEffect(() => {
      const el = svgRef.current;
      if (!el) return;
      const ro = new ResizeObserver((entries) => {
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0) {
          setSvgScale(Math.min(width / VIEW_W, height / VIEW_H));
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    }, [svgRef]);

    useImperativeHandle(ref, () => ({
      flyTo: (cx: number, cy: number, scale: number) => {
        setTransform({
          x: -scale * (cx - CENTER_X),
          y: -scale * (cy - CENTER_Y),
          scale,
        });
      },
      resetZoom: () => {
        setTransform({ x: 0, y: 0, scale: 1 });
      },
    }));

    const hasTerrain =
      terrain && (drawn.bands.length > 0 || drawn.waterways.length > 0);

    return (
      <svg
        ref={svgRef}
        className={`map-canvas ${isAnimating ? "map-canvas--animating" : ""} ${terrain ? "map-canvas--terrain" : ""} ${hideBorders ? "map-canvas--hide-borders" : ""}`}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label={map.name}
        preserveAspectRatio="xMidYMid meet"
        style={panZoom ? style : undefined}
        {...handlers}
      >
        <title>{map.name}</title>
        <g
          style={
            panZoom
              ? { transform: transformCss, transformOrigin: "0 0" }
              : undefined
          }
        >
          {hasTerrain && (
            <defs>
              <clipPath id={clipId}>
                {shapes.map((s, i) => (
                  <path key={map.features[i].istat} d={s.d} />
                ))}
              </clipPath>
            </defs>
          )}

          {/* Context: sea + neighbour/country land, always visible. */}
          {drawn.contextShapes.length > 0 && (
            <g className="context-layer" pointerEvents="none">
              {drawn.contextShapes.map((c) => (
                <path
                  key={c.key}
                  d={c.d}
                  className={`context-shape context-shape--${c.kind}`}
                  style={c.tint ? { fill: c.tint } : undefined}
                />
              ))}
            </g>
          )}

          {/* Relief bands + waterways, clipped to the province. Relief sits in
              its own group so its alpha composites as a single unit (bands don't
              double-blend where they stack), letting the comune borders + rivers
              on top stay legible. */}
          {hasTerrain && (
            <g
              className="terrain-layer"
              clipPath={`url(#${clipId})`}
              pointerEvents="none"
            >
              <g className="relief-layer">
                {drawn.bands.map((b) => (
                  <path
                    key={b.key}
                    d={b.d}
                    className={`relief-band relief-band--${b.level}`}
                  />
                ))}
              </g>
              {drawn.waterways.map((w) => (
                <path
                  key={w.key}
                  d={w.d}
                  className={`water water--${w.kind} ${w.area ? "water--body" : "water--line"}`}
                />
              ))}
            </g>
          )}

          {/* Hardcore: the province's outer boundary, so the blind map isn't a
              blank page (every comune border is hidden until it's resolved). */}
          {hideBorders && drawn.outline && (
            <path
              className="province-outline"
              d={drawn.outline}
              pointerEvents="none"
            />
          )}

          {/* Comuni — interactive. */}
          <g>
            {shapes.map((s, i) => {
              const st = status[i];
              const isFlash = flashIndex === i;
              const isReveal = revealIndex === i;
              const cls = [
                "region",
                `region--${st}`,
                isFlash ? "region--flash" : "",
                isReveal ? "region--reveal" : "",
                hover === i ? "region--hover" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                // biome-ignore lint/a11y/noStaticElementInteractions: SVG map regions are inherently pointer-interactive; there is no keyboard-friendly way to click a specific comune shape.
                <path
                  key={map.features[i].istat}
                  data-index={i}
                  d={s.d}
                  className={cls}
                  onClick={
                    interactive && onPick && !panZoom
                      ? () => onPick(i)
                      : undefined
                  }
                  onPointerEnter={interactive ? () => setHover(i) : undefined}
                  onPointerLeave={
                    interactive ? () => setHover(null) : undefined
                  }
                />
              );
            })}
          </g>

          {/* Found-comune labels. */}
          <g className="labels" pointerEvents="none">
            {shapes.map((s, i) =>
              status[i] === "found" ? (
                <text
                  key={map.features[i].istat}
                  x={s.cx}
                  y={s.cy}
                  className="region-label"
                >
                  {map.features[i].name}
                </text>
              ) : null,
            )}
          </g>

          {/* Outside-only context labels (neighbour / country / sea), in an
              engraved script pinned to the map: sized in viewBox units so they
              scale with the terrain as you zoom (not held at a fixed on-screen
              size). Never inside the target province — see the bake. */}
          {drawn.contextLabels.length > 0 && (
            <g className="context-labels" pointerEvents="none">
              {drawn.contextLabels.map((l) => (
                <text
                  key={l.key}
                  x={l.x}
                  y={l.y}
                  className={`context-label context-label--${l.kind} ${l.nick ? "context-label--nick" : ""}`}
                  style={{
                    fontSize: l.fontSize,
                    strokeWidth: 4,
                  }}
                >
                  {l.name}
                </text>
              ))}
            </g>
          )}
        </g>
      </svg>
    );
  },
);
