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
import { DEFAULT_CONFIG, type LabelSeed, placeLabels } from "./contextLabels";
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
 * Readability floor, in *physical* pixels, below which a placed context label
 * is hidden rather than shown too small to read. Placement maximises the font
 * geometrically (in viewBox units); the ResizeObserver-measured scale converts
 * this on-screen floor back to viewBox units so labels drop out on tiny screens
 * instead of rendering as illegible specks.
 */
const LABEL_FLOOR_PX = { country: 11, sea: 10, province: 9 } as const;
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

/**
 * Rasterise a set of projected SVG `d` paths into a `gw × gh` occupancy grid —
 * 1 where any path covers, 0 elsewhere — so the label placer can treat those
 * shapes as obstacles to route names around. Uses an offscreen 2D canvas: fill
 * every path, then read back the alpha channel.
 */
function rasterizePaths(ds: string[], gw: number, gh: number): Uint8Array {
  const out = new Uint8Array(gw * gh);
  const canvas = document.createElement("canvas");
  canvas.width = gw;
  canvas.height = gh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return out;
  ctx.scale(gw / VIEW_W, gh / VIEW_H);
  ctx.fillStyle = "#000";
  for (const d of ds) {
    if (d) ctx.fill(new Path2D(d));
  }
  const { data } = ctx.getImageData(0, 0, gw, gh);
  for (let i = 0; i < gw * gh; i++) {
    if (data[i * 4 + 3] > 10) out[i] = 1;
  }
  return out;
}

/** Bitwise-OR two equal-length occupancy grids into a fresh grid. */
function orMasks(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] | b[i];
  return out;
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

      return { contextShapes, bands, waterways, outline };
    }, [context, relief, water, outlineGeom, projected.projection]);

    // Free-space placement for the outside-only context labels. Scale-independent
    // (the viewBox letterboxes, so the surrounding land shown is the same at any
    // aspect/orientation) and computed from the projected province rasterised as
    // an obstacle, so no label ever lands on the province being played. Recomputed
    // only when the map or its context data changes — not on pan/zoom or resize.
    const placedLabels = useMemo(() => {
      if (typeof document === "undefined" || !context?.labels?.length)
        return [];
      const project = projected.projection;
      const path = geoPath(project);
      const seeds: LabelSeed[] = context.labels.flatMap((l) => {
        const p = project(l.at);
        if (!p) return [];
        const nick = nicknameFor(l.name, map.id);
        return [
          {
            name: nick ?? l.name,
            kind: l.kind,
            nick: nick !== null,
            seedX: p[0],
            seedY: p[1],
          },
        ];
      });
      if (!seeds.length) return [];

      const { gw, gh } = DEFAULT_CONFIG;
      // Rasterise the three surfaces the labels care about.
      const target = rasterizePaths(
        shapes.map((s) => s.d),
        gw,
        gh,
      );
      const neighbourDs: string[] = [];
      const seaDs: string[] = [];
      for (const f of context.features) {
        const d = path(f as Feature) ?? "";
        if (f.properties.kind === "sea") seaDs.push(d);
        else neighbourDs.push(d);
      }
      const neighbours = rasterizePaths(neighbourDs, gw, gh);
      const sea = rasterizePaths(seaDs, gw, gh);

      // Land names avoid the province + sea; sea names avoid all land.
      return placeLabels(
        { land: orMasks(target, sea), sea: orMasks(target, neighbours) },
        seeds,
      );
    }, [context, projected.projection, shapes, map.id]);

    const { svgRef, transformCss, style, handlers, setTransform } = usePanZoom({
      enabled: panZoom && interactive && !isAnimating,
      centerX: CENTER_X,
      centerY: CENTER_Y,
      bounds: mapBounds,
      onTap: onPick,
    });

    // Track the SVG's rendered pixel size so the label readability floor
    // (LABEL_FLOOR_PX) can hide names too small to read on the current screen.
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
              engraved script pinned to the map: placed in the free space around
              the province (never on it), font maximised to the gap and rotated
              90° where a tall gap fits it bigger. Sized in viewBox units so they
              scale with the terrain as you zoom. A physical-pixel floor hides any
              label too small to read on the current screen. */}
          {placedLabels.length > 0 && (
            <g className="context-labels" pointerEvents="none">
              {placedLabels.flatMap((l) => {
                const s = svgScale > 0 ? svgScale : 1;
                if (l.fontVB * s < LABEL_FLOOR_PX[l.kind]) return [];
                return [
                  <text
                    key={l.key}
                    x={l.x}
                    y={l.y}
                    transform={
                      l.angle ? `rotate(${l.angle} ${l.x} ${l.y})` : undefined
                    }
                    className={`context-label context-label--${l.kind} ${l.nick ? "context-label--nick" : ""}`}
                    style={{
                      fontSize: l.fontVB,
                      strokeWidth: 4,
                    }}
                  >
                    {l.name}
                  </text>,
                ];
              })}
            </g>
          )}
        </g>
      </svg>
    );
  },
);
