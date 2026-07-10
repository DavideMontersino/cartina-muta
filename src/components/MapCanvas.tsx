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
import {
  loadContext,
  loadRelief,
  loadWater,
  type Relief,
} from "../maps/registry";
import type {
  ContextCollection,
  MapDefinition,
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
  /** Paints the tinted hillshade + waterways + neighbour/country context. */
  terrain?: boolean;
}

export interface MapCanvasRef {
  flyTo: (cx: number, cy: number, scale: number) => void;
  resetZoom: () => void;
}

/** viewBox centre — pan/zoom scale about this so zooming keeps the map centred. */
const CENTER_X = VIEW_W / 2;
const CENTER_Y = VIEW_H / 2;

const ATTRIBUTION =
  "Rilievo: Terrain Tiles · Acque © OpenStreetMap · Confini: Natural Earth";

interface TerrainData {
  id: string;
  relief: Relief | null;
  water: WaterCollection | null;
  context: ContextCollection | null;
}

/**
 * Loads a province's baked terrain layers when the toggle is on. Keyed on the
 * province id + enabled flag so the three call sites stay untouched; ignores a
 * resolve that arrives after the province changed.
 */
function useTerrainData(id: string, enabled: boolean): TerrainData | null {
  const [data, setData] = useState<TerrainData | null>(null);
  useEffect(() => {
    if (!enabled) {
      setData(null);
      return;
    }
    let cancelled = false;
    Promise.all([loadRelief(id), loadWater(id), loadContext(id)]).then(
      ([relief, water, context]) => {
        if (!cancelled) setData({ id, relief, water, context });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [id, enabled]);
  return data && data.id === id ? data : null;
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

    const data = useTerrainData(map.id, terrain);

    // Project the terrain layers into this viewBox once the data is loaded.
    const layers = useMemo(() => {
      if (!terrain || !data) return null;
      const projection = projected.projection;
      const path = geoPath(projection);

      // Hillshade: a lon/lat rectangle → an axis-aligned rect in the projected
      // plane, so place the image by projecting just its NW and SE corners.
      let relief: {
        href: string;
        x: number;
        y: number;
        width: number;
        height: number;
      } | null = null;
      if (data.relief) {
        const [west, south, east, north] = data.relief.bounds;
        const nw = projection([west, north]);
        const se = projection([east, south]);
        if (nw && se) {
          relief = {
            href: data.relief.url,
            x: nw[0],
            y: nw[1],
            width: se[0] - nw[0],
            height: se[1] - nw[1],
          };
        }
      }

      const context = (data.context?.features ?? []).map((f, i) => ({
        key: `ctx-${i}`,
        kind: f.properties.kind,
        d: path(f as Feature) ?? "",
      }));

      const contextLabels = (data.context?.labels ?? []).flatMap((l, i) => {
        const p = projection(l.at);
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

      const water = (data.water?.features ?? []).map((f, i) => {
        const line = f.geometry.type.includes("Line");
        return {
          key: `wat-${i}`,
          kind: f.properties.kind,
          area: !line,
          d: path(f as Feature) ?? "",
        };
      });

      return { relief, context, contextLabels, water };
    }, [terrain, data, projected.projection]);

    const { svgRef, transformCss, style, handlers, setTransform } = usePanZoom({
      enabled: panZoom && interactive && !isAnimating,
      centerX: CENTER_X,
      centerY: CENTER_Y,
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
          {layers && (
            <g className="terrain-layer" pointerEvents="none">
              {layers.relief && (
                <image
                  href={layers.relief.href}
                  x={layers.relief.x}
                  y={layers.relief.y}
                  width={layers.relief.width}
                  height={layers.relief.height}
                  preserveAspectRatio="none"
                />
              )}
              {layers.context.map((c) => (
                <path
                  key={c.key}
                  d={c.d}
                  className={`context-shape context-shape--${c.kind}`}
                />
              ))}
              {layers.water.map((w) => (
                <path
                  key={w.key}
                  d={w.d}
                  className={`water water--${w.kind} ${w.area ? "water--body" : "water--line"}`}
                />
              ))}
            </g>
          )}
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
          {layers && layers.contextLabels.length > 0 && (
            <g className="context-labels" pointerEvents="none">
              {layers.contextLabels.map((l) => (
                <text
                  key={l.key}
                  x={l.x}
                  y={l.y}
                  className={`context-label context-label--${l.kind} ${l.nick ? "context-label--nick" : ""}`}
                >
                  {l.name}
                </text>
              ))}
            </g>
          )}
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
        </g>
        {terrain && (
          <text className="terrain-attribution" x={VIEW_W - 6} y={VIEW_H - 6}>
            {ATTRIBUTION}
          </text>
        )}
      </svg>
    );
  },
);
