import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
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
  /** Changes on every wrong guess so the label remounts and its fade
   * animation restarts, even for repeated rapid-fire wrong guesses. */
  wrongKey: number;
  /** Index to briefly reveal after a skip, or null. */
  revealIndex: number | null;
  /** Fires with the clicked/tapped region's index. Correctness lives in the reducer. */
  onPick?: (index: number) => void;
  /** Enables drag-to-pan and pinch/wheel-to-zoom (energy mode's mobile-first map). */
  panZoom?: boolean;
  interactive: boolean;
}

const MIN_SCALE = 1;
const MAX_SCALE = 6;
/** Pointer movement below this (px, in screen space) counts as a tap, not a pan drag. */
const TAP_MOVE_THRESHOLD_PX = 8;
/** viewBox centre — pan/zoom scale about this so zooming keeps the map centred. */
const CENTER_X = VIEW_W / 2;
const CENTER_Y = VIEW_H / 2;

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/**
 * Pan (in viewBox units) and zoom applied to the map content. Kept as an inner
 * SVG `<g>` transform — NOT a CSS transform on the <svg>. Guesses are resolved
 * by which comune path the browser hit-tests under the pointer, so there is no
 * screen→lon/lat inversion to get wrong (WebKit's getScreenCTM() ignores CSS
 * transforms on the SVG element, which used to corrupt every energy-mode tap).
 */
interface Transform {
  x: number;
  y: number;
  scale: number;
}

type Gesture =
  | {
      kind: "pan";
      startTransform: Transform;
      startClient: { x: number; y: number };
      /** viewBox units per client px (getScreenCTM scale) at gesture start. */
      viewScale: number;
      /** Region index under the finger at press time — dispatched if this stays a tap. */
      downIndex: number | null;
      moved: boolean;
    }
  | {
      kind: "pinch";
      startTransform: Transform;
      startDistance: number;
    };

/** Reads the comune index off the nearest ancestor path with a data-index. */
function indexUnder(target: EventTarget | null): number | null {
  const el = (target as Element | null)?.closest?.("[data-index]");
  const raw = el?.getAttribute("data-index");
  return raw === null || raw === undefined ? null : Number(raw);
}

export function MapCanvas({
  map,
  status,
  flashIndex,
  wrongIndex,
  wrongKey,
  revealIndex,
  onPick,
  panZoom = false,
  interactive,
}: MapCanvasProps) {
  const projected = useMemo(() => projectMap(map), [map]);
  const shapes = projected.features;
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [transform, setTransform] = useState<Transform>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (!panZoom || !interactive) return;
      (e.target as Element).setPointerCapture?.(e.pointerId);
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.current.size === 1) {
        gesture.current = {
          kind: "pan",
          startTransform: transform,
          startClient: { x: e.clientX, y: e.clientY },
          viewScale: svgRef.current?.getScreenCTM()?.a || 1,
          downIndex: indexUnder(e.target),
          moved: false,
        };
      } else if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        gesture.current = {
          kind: "pinch",
          startTransform: transform,
          startDistance: Math.hypot(a.x - b.x, a.y - b.y),
        };
      }
    },
    [panZoom, interactive, transform],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (!panZoom || !gesture.current || !pointers.current.has(e.pointerId))
        return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const g = gesture.current;

      if (g.kind === "pan" && pointers.current.size === 1) {
        const dx = e.clientX - g.startClient.x;
        const dy = e.clientY - g.startClient.y;
        if (Math.hypot(dx, dy) > TAP_MOVE_THRESHOLD_PX) g.moved = true;
        // Pan lives in viewBox units (the <g> transform space), so scale the
        // client-px drag back into viewBox units via the getScreenCTM factor.
        setTransform({
          ...g.startTransform,
          x: g.startTransform.x + dx / g.viewScale,
          y: g.startTransform.y + dy / g.viewScale,
        });
      } else if (g.kind === "pinch" && pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        const scale = clamp(
          g.startTransform.scale * (distance / g.startDistance),
          MIN_SCALE,
          MAX_SCALE,
        );
        setTransform({ ...g.startTransform, scale });
      }
    },
    [panZoom],
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      const g = gesture.current;
      pointers.current.delete(e.pointerId);
      if (pointers.current.size === 0) gesture.current = null;
      // A clean tap (no pan drift) on a comune counts as a guess for that comune.
      if (panZoom && interactive && g?.kind === "pan" && !g.moved) {
        const index = g.downIndex ?? indexUnder(e.target);
        if (index !== null && Number.isInteger(index)) onPick?.(index);
      }
    },
    [panZoom, interactive, onPick],
  );

  const handleWheel = useCallback(
    (e: ReactWheelEvent<SVGSVGElement>) => {
      if (!panZoom || !interactive) return;
      setTransform((t) => ({
        ...t,
        scale: clamp(
          t.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15),
          MIN_SCALE,
          MAX_SCALE,
        ),
      }));
    },
    [panZoom, interactive],
  );

  return (
    <svg
      ref={svgRef}
      className="map-canvas"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label={map.name}
      preserveAspectRatio="xMidYMid meet"
      style={panZoom ? { touchAction: "none" } : undefined}
      onPointerDown={panZoom ? handlePointerDown : undefined}
      onPointerMove={panZoom ? handlePointerMove : undefined}
      onPointerUp={panZoom ? handlePointerUp : undefined}
      onPointerCancel={panZoom ? handlePointerUp : undefined}
      onWheel={panZoom ? handleWheel : undefined}
    >
      <title>{map.name}</title>
      <g
        transform={
          panZoom
            ? `translate(${transform.x + CENTER_X} ${transform.y + CENTER_Y}) scale(${transform.scale}) translate(${-CENTER_X} ${-CENTER_Y})`
            : undefined
        }
      >
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
            key={wrongKey}
            x={shapes[wrongIndex].cx}
            y={shapes[wrongIndex].cy}
            className="wrong-label"
            pointerEvents="none"
          >
            {map.features[wrongIndex].name}
          </text>
        )}
      </g>
    </svg>
  );
}
