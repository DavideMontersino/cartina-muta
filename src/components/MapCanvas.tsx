import { geoPath } from "d3-geo";
import type { Feature } from "geojson";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import type { RegionStatus } from "../game/engine";
import { projectMap, VIEW_H, VIEW_W } from "../game/geo";
import { loadContext, loadRelief, loadWater } from "../maps/registry";
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
}

export interface MapCanvasRef {
  flyTo: (cx: number, cy: number, scale: number) => void;
  resetZoom: () => void;
}

/** viewBox centre — pan/zoom scale about this so zooming keeps the map centred. */
const CENTER_X = VIEW_W / 2;
const CENTER_Y = VIEW_H / 2;

/**
 * Base on-screen size (viewBox units) for the map labels, by kind. Divided by
 * the current pan/zoom scale so a label stays a fixed size on screen at any
 * zoom while staying pinned to its geographic anchor.
 */
const LABEL_SIZE = { country: 36, sea: 30, province: 28 } as const;
const CONTEXT_ORDER = { sea: 0, province: 1, country: 2 } as const;

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
    },
    ref,
  ) => {
    const projected = useMemo(() => projectMap(map), [map]);
    const shapes = projected.features;
    const [hover, setHover] = useState<number | null>(null);

    const { context, relief, water } = useLayers(map.id, terrain);
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
        .map((f, i) => ({
          key: `ctx-${i}`,
          kind: f.properties.kind,
          d: path(f as Feature) ?? "",
        }));

      const contextLabels = (context?.labels ?? []).flatMap((l, i) => {
        const p = project(l.at);
        if (!p) return [];
        const nick = nicknameFor(l.name);
        return [
          {
            key: `lbl-${i}`,
            kind: l.kind,
            name: nick ?? l.name,
            nick: nick !== null,
            x: p[0],
            y: p[1],
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

      return { contextShapes, contextLabels, bands, waterways };
    }, [context, relief, water, projected.projection]);

    const { svgRef, transform, transformCss, style, handlers, setTransform } =
      usePanZoom({
        enabled: panZoom && interactive && !isAnimating,
        centerX: CENTER_X,
        centerY: CENTER_Y,
        bounds: mapBounds,
        onTap: onPick,
      });

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
        className={`map-canvas ${isAnimating ? "map-canvas--animating" : ""} ${terrain ? "map-canvas--terrain" : ""}`}
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
                />
              ))}
            </g>
          )}

          {/* Relief bands + waterways, clipped to the province. */}
          {hasTerrain && (
            <g
              className="terrain-layer"
              clipPath={`url(#${clipId})`}
              pointerEvents="none"
            >
              {drawn.bands.map((b) => (
                <path
                  key={b.key}
                  d={b.d}
                  className={`relief-band relief-band--${b.level}`}
                />
              ))}
              {drawn.waterways.map((w) => (
                <path
                  key={w.key}
                  d={w.d}
                  className={`water water--${w.kind} ${w.area ? "water--body" : "water--line"}`}
                />
              ))}
            </g>
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
              engraved script at a fixed on-screen size (counter-scaled by the
              current zoom). Never inside the target province — see the bake. */}
          {drawn.contextLabels.length > 0 && (
            <g className="context-labels" pointerEvents="none">
              {drawn.contextLabels.map((l) => (
                <text
                  key={l.key}
                  x={l.x}
                  y={l.y}
                  className={`context-label context-label--${l.kind} ${l.nick ? "context-label--nick" : ""}`}
                  style={{
                    fontSize: LABEL_SIZE[l.kind] / transform.scale,
                    strokeWidth: 4 / transform.scale,
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
