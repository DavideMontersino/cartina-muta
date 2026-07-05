import {
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RegionStatus } from "../game/engine";
import {
  CENTER_X,
  CENTER_Y,
  centerOn,
  IDENTITY_TRANSFORM,
  projectMap,
  VIEW_H,
  VIEW_W,
} from "../game/geo";
import type { MapDefinition } from "../maps/types";
import { usePanZoom } from "./usePanZoom";

/** Imperative view controls the game screen drives on a round transition. */
export interface MapCanvasHandle {
  /**
   * Fly the viewport onto region `index`, hold+flash it (so the player sees
   * where it was, even if it was off-screen), then fly back to the whole map.
   * `onDone` fires once the map has settled back on the full province.
   */
  reveal(index: number, onDone?: () => void): void;
  /** Ease the viewport back to the whole-province view. */
  resetView(): void;
}

interface MapCanvasProps {
  map: MapDefinition;
  status: RegionStatus[];
  /** Index currently flashing red after a wrong guess, or null. */
  flashIndex: number | null;
  /** Fires with the clicked/tapped region's index. Correctness lives in the reducer. */
  onPick?: (index: number) => void;
  /** Enables drag-to-pan and pinch/wheel-to-zoom. */
  panZoom?: boolean;
  interactive: boolean;
  ref?: Ref<MapCanvasHandle>;
}

/** Zoom level the reveal fly-to settles on before flashing the answer. */
const REVEAL_SCALE = 2.4;
/** Fly-out and fly-back durations (ms) — "smooth but quick" per the design. */
const REVEAL_FLY_MS = 480;
/** How long the answer stays centred and flashing before flying back (ms). */
const REVEAL_HOLD_MS = 750;
/** Duration of the plain zoom-out on a correct guess (ms). */
const RESET_MS = 420;

export function MapCanvas({
  map,
  status,
  flashIndex,
  onPick,
  panZoom = false,
  interactive,
  ref,
}: MapCanvasProps) {
  const projected = useMemo(() => projectMap(map), [map]);
  const shapes = projected.features;
  const [hover, setHover] = useState<number | null>(null);
  // The region being flown-to and flashed during a reveal, or null. Owned here
  // so the fly/flash/name-label stay in lockstep with the viewport animation.
  const [revealIndex, setRevealIndex] = useState<number | null>(null);
  const holdTimer = useRef<number | undefined>(undefined);

  const { svgRef, transformAttr, style, handlers, animateTo } = usePanZoom({
    enabled: panZoom && interactive,
    centerX: CENTER_X,
    centerY: CENTER_Y,
    onTap: onPick,
  });

  const cancelHold = useCallback(() => {
    window.clearTimeout(holdTimer.current);
    holdTimer.current = undefined;
  }, []);

  const resetView = useCallback(() => {
    cancelHold();
    setRevealIndex(null);
    animateTo(IDENTITY_TRANSFORM, RESET_MS);
  }, [animateTo, cancelHold]);

  const reveal = useCallback(
    (index: number, onDone?: () => void) => {
      cancelHold();
      const shape = shapes[index];
      if (!shape) {
        onDone?.();
        return;
      }
      setRevealIndex(index);
      animateTo(
        centerOn(shape.cx, shape.cy, REVEAL_SCALE),
        REVEAL_FLY_MS,
        () => {
          holdTimer.current = window.setTimeout(() => {
            animateTo(IDENTITY_TRANSFORM, REVEAL_FLY_MS, () => {
              setRevealIndex(null);
              onDone?.();
            });
          }, REVEAL_HOLD_MS);
        },
      );
    },
    [shapes, animateTo, cancelHold],
  );

  useImperativeHandle(ref, () => ({ reveal, resetView }), [reveal, resetView]);

  useEffect(() => () => cancelHold(), [cancelHold]);

  return (
    <svg
      ref={svgRef}
      className="map-canvas"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label={map.name}
      preserveAspectRatio="xMidYMid meet"
      style={panZoom ? style : undefined}
      {...handlers}
    >
      <title>{map.name}</title>
      <g transform={panZoom ? transformAttr : undefined}>
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
                onPointerLeave={interactive ? () => setHover(null) : undefined}
              />
            );
          })}
        </g>
        <g className="labels" pointerEvents="none">
          {shapes.map((s, i) => {
            // Label found comuni, plus the one being revealed — so the player
            // reads the name of the answer they missed while it's centred.
            if (status[i] !== "found" && revealIndex !== i) return null;
            return (
              <text
                key={map.features[i].istat}
                x={s.cx}
                y={s.cy}
                className={`region-label ${revealIndex === i ? "region-label--reveal" : ""}`}
              >
                {map.features[i].name}
              </text>
            );
          })}
        </g>
      </g>
    </svg>
  );
}
