import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import type { RegionStatus } from "../game/engine";
import { projectMap, VIEW_H, VIEW_W } from "../game/geo";
import type { MapDefinition } from "../maps/types";
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
}

export interface MapCanvasRef {
  flyTo: (cx: number, cy: number, scale: number) => void;
  resetZoom: () => void;
}

/** viewBox centre — pan/zoom scale about this so zooming keeps the map centred. */
const CENTER_X = VIEW_W / 2;
const CENTER_Y = VIEW_H / 2;

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
    },
    ref,
  ) => {
    const projected = useMemo(() => projectMap(map), [map]);
    const shapes = projected.features;
    const [hover, setHover] = useState<number | null>(null);

    const { svgRef, transformCss, style, handlers, setTransform } = usePanZoom(
      {
        enabled: panZoom && interactive && !isAnimating,
        centerX: CENTER_X,
        centerY: CENTER_Y,
        onTap: onPick,
      },
    );

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
        className={`map-canvas ${isAnimating ? "map-canvas--animating" : ""}`}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label={map.name}
        preserveAspectRatio="xMidYMid meet"
        style={panZoom ? style : undefined}
        {...handlers}
      >
        <title>{map.name}</title>
        <g style={panZoom ? { transform: transformCss, transformOrigin: '0 0' } : undefined}>
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
      </svg>
    );
  },
);
