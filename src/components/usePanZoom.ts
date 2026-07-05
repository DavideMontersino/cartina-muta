import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export interface PanZoomTransform {
  x: number;
  y: number;
  scale: number;
}

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

interface UsePanZoomOptions {
  /** Master switch — when false, no gesture handlers are attached at all. */
  enabled: boolean;
  centerX: number;
  centerY: number;
  minScale?: number;
  maxScale?: number;
  /** Fires with the data-index of the element under a clean tap (no pan drift). */
  onTap?: (index: number) => void;
}

const DEFAULT_MIN_SCALE = 1;
const DEFAULT_MAX_SCALE = 6;
/** Pointer movement below this (px, in screen space) counts as a tap, not a pan drag. */
const TAP_MOVE_THRESHOLD_PX = 8;

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

type Gesture =
  | {
      kind: "pan";
      startTransform: PanZoomTransform;
      startClient: { x: number; y: number };
      /** viewBox units per client px (getScreenCTM scale) at gesture start. */
      viewScale: number;
      /** Region index under the finger at press time — dispatched if this stays a tap. */
      downIndex: number | null;
      moved: boolean;
    }
  | {
      kind: "pinch";
      startTransform: PanZoomTransform;
      startDistance: number;
    };

/** Reads a `data-index` off the nearest ancestor element (typically an SVG path). */
function indexUnder(target: EventTarget | null): number | null {
  const el = (target as Element | null)?.closest?.("[data-index]");
  const raw = el?.getAttribute("data-index");
  return raw === null || raw === undefined ? null : Number(raw);
}

/**
 * Drag-to-pan and pinch/wheel-to-zoom for an SVG `<g>` transform, kept as
 * viewBox-space state (not a CSS transform on the `<svg>`) — guesses/taps are
 * resolved by which element the browser hit-tests under the pointer, so there
 * is no screen→content-space inversion to get wrong (WebKit's getScreenCTM()
 * ignores CSS transforms on the SVG element itself).
 */
export function usePanZoom({
  enabled,
  centerX,
  centerY,
  minScale = DEFAULT_MIN_SCALE,
  maxScale = DEFAULT_MAX_SCALE,
  onTap,
}: UsePanZoomOptions) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [transform, setTransform] = useState<PanZoomTransform>({
    x: 0,
    y: 0,
    scale: 1,
  });
  // Mirror of `transform` for reads that must not go stale between renders
  // (an animation samples the live value the instant it starts).
  const transformRef = useRef(transform);
  transformRef.current = transform;
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  const animationRef = useRef<number | undefined>(undefined);

  const stopAnimation = useCallback(() => {
    if (animationRef.current !== undefined) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
  }, []);

  // Tween the transform to `dest` over `durationMs` (eased), calling `onDone`
  // when it lands. Any in-flight animation or user gesture supersedes it.
  const animateTo = useCallback(
    (dest: PanZoomTransform, durationMs: number, onDone?: () => void) => {
      stopAnimation();
      const from = transformRef.current;
      if (durationMs <= 0) {
        setTransform(dest);
        onDone?.();
        return;
      }
      const startTime = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - startTime) / durationMs);
        const e = easeInOutCubic(p);
        setTransform({
          x: from.x + (dest.x - from.x) * e,
          y: from.y + (dest.y - from.y) * e,
          scale: from.scale + (dest.scale - from.scale) * e,
        });
        if (p < 1) {
          animationRef.current = requestAnimationFrame(step);
        } else {
          animationRef.current = undefined;
          onDone?.();
        }
      };
      animationRef.current = requestAnimationFrame(step);
    },
    [stopAnimation],
  );

  useEffect(() => () => stopAnimation(), [stopAnimation]);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (!enabled) return;
      stopAnimation();
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
    [enabled, transform, stopAnimation],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (!enabled || !gesture.current || !pointers.current.has(e.pointerId))
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
          minScale,
          maxScale,
        );
        setTransform({ ...g.startTransform, scale });
      }
    },
    [enabled, minScale, maxScale],
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      const g = gesture.current;
      pointers.current.delete(e.pointerId);
      if (pointers.current.size === 0) gesture.current = null;
      // A clean tap (no pan drift) counts as a pick for whatever was under it.
      if (enabled && g?.kind === "pan" && !g.moved) {
        const index = g.downIndex ?? indexUnder(e.target);
        if (index !== null && Number.isInteger(index)) onTap?.(index);
      }
    },
    [enabled, onTap],
  );

  const handleWheel = useCallback(
    (e: ReactWheelEvent<SVGSVGElement>) => {
      if (!enabled) return;
      stopAnimation();
      setTransform((t) => ({
        ...t,
        scale: clamp(
          t.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15),
          minScale,
          maxScale,
        ),
      }));
    },
    [enabled, minScale, maxScale, stopAnimation],
  );

  // transformAttr/style reflect the current transform whenever the caller opts
  // in (independent of `enabled`), so toggling `enabled` off — e.g. a game
  // finishing — freezes the last pan/zoom in place instead of snapping back.
  const transformAttr = `translate(${transform.x + centerX} ${transform.y + centerY}) scale(${transform.scale}) translate(${-centerX} ${-centerY})`;
  const style = { touchAction: "none" as const };

  return {
    svgRef,
    transform,
    transformAttr,
    style,
    animateTo,
    handlers: {
      onPointerDown: enabled ? handlePointerDown : undefined,
      onPointerMove: enabled ? handlePointerMove : undefined,
      onPointerUp: enabled ? handlePointerUp : undefined,
      onPointerCancel: enabled ? handlePointerUp : undefined,
      onWheel: enabled ? handleWheel : undefined,
    },
  };
}
