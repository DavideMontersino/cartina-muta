import { useMemo, useState } from "react";
import type { RegionStatus } from "../game/engine";
import { projectMap, VIEW_H, VIEW_W } from "../game/geo";
import type { MapDefinition } from "../maps/types";

interface MapCanvasProps {
  map: MapDefinition;
  status: RegionStatus[];
  /** Index currently flashing red after a wrong guess, or null. */
  flashIndex: number | null;
  /** Index whose name to reveal briefly after a wrong guess, or null. */
  wrongIndex: number | null;
  /** Index to briefly reveal after a skip, or null. */
  revealIndex: number | null;
  onPick: (index: number) => void;
  interactive: boolean;
}

export function MapCanvas({
  map,
  status,
  flashIndex,
  wrongIndex,
  revealIndex,
  onPick,
  interactive,
}: MapCanvasProps) {
  const shapes = useMemo(() => projectMap(map), [map]);
  const [hover, setHover] = useState<number | null>(null);

  return (
    <svg
      className="map-canvas"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label={map.name}
      preserveAspectRatio="xMidYMid meet"
    >
      <title>{map.name}</title>
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
              d={s.d}
              className={cls}
              onClick={interactive ? () => onPick(i) : undefined}
              onPointerEnter={interactive ? () => setHover(i) : undefined}
              onPointerLeave={interactive ? () => setHover(null) : undefined}
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
      {wrongIndex !== null && (
        <text
          x={shapes[wrongIndex].cx}
          y={shapes[wrongIndex].cy}
          className="wrong-label"
          pointerEvents="none"
        >
          {map.features[wrongIndex].name}
        </text>
      )}
    </svg>
  );
}
