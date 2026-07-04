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
  /** Region-click guessing (timer/complete modes): fires with the clicked region's index. */
  onPick?: (index: number) => void;
  /** Free-form guessing (energy mode): fires with the clicked [lon, lat], wherever on the map it lands. */
  onGuessPoint?: (point: [number, number]) => void;
  /** Enables drag-to-pan and pinch/wheel-to-zoom (energy mode's mobile-first map). */
  panZoom?: boolean;
  interactive: boolean;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
/** Pointer movement below this (px, in screen space) counts as a tap, not a pan drag. */
const TAP_MOVE_THRESHOLD_PX = 8;

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

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
      moved: boolean;
    }
  | {
      kind: "pinch";
      startTransform: Transform;
      startDistance: number;
    };

export function MapCanvas({
  map,
  status,
  flashIndex,
  wrongIndex,
  wrongKey,
  revealIndex,
  onPick,
  onGuessPoint,
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

  const toViewBoxPoint = useCallback(
    (clientX: number, clientY: number): [number, number] | null => {
      const svg = svgRef.current;
      const ctm = svg?.getScreenCTM();
      if (!svg || !ctm) return null;
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const p = pt.matrixTransform(ctm.inverse());
      return [p.x, p.y];
    },
    [],
  );

  const guessAt = useCallback(
    (clientX: number, clientY: number) => {
      if (!onGuessPoint) return;
      const viewBoxPoint = toViewBoxPoint(clientX, clientY);
      const point = viewBoxPoint ? projected.invert(viewBoxPoint) : null;
      if (point) onGuessPoint(point);
    },
    [onGuessPoint, toViewBoxPoint, projected],
  );

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
        setTransform({
          ...g.startTransform,
          x: g.startTransform.x + dx,
          y: g.startTransform.y + dy,
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
      const wasTap = panZoom && g?.kind === "pan" && !g.moved;
      pointers.current.delete(e.pointerId);
      if (pointers.current.size === 0) gesture.current = null;
      if (wasTap && interactive) guessAt(e.clientX, e.clientY);
    },
    [panZoom, interactive, guessAt],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // panZoom mode handles taps itself via pointerup (so drags don't guess).
      if (panZoom || !interactive) return;
      guessAt(e.clientX, e.clientY);
    },
    [panZoom, interactive, guessAt],
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
    // biome-ignore lint/a11y/useKeyWithClickEvents: the free-click map guess (energy mode) has no keyboard-friendly equivalent, same as the per-region paths below.
    <svg
      ref={svgRef}
      className="map-canvas"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label={map.name}
      preserveAspectRatio="xMidYMid meet"
      style={
        panZoom
          ? {
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              touchAction: "none",
            }
          : undefined
      }
      onClick={onGuessPoint && !panZoom ? handleClick : undefined}
      onPointerDown={panZoom ? handlePointerDown : undefined}
      onPointerMove={panZoom ? handlePointerMove : undefined}
      onPointerUp={panZoom ? handlePointerUp : undefined}
      onPointerCancel={panZoom ? handlePointerUp : undefined}
      onWheel={panZoom ? handleWheel : undefined}
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
              onClick={
                interactive && onPick && !onGuessPoint
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
    </svg>
  );
}
