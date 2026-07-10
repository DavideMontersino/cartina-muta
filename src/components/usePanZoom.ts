import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useRef,
  useState,
} from "react";

export interface PanZoomTransform {
  x: number;
  y: number;
  scale: number;
}

interface UsePanZoomOptions {
  /** Master switch — when false, no gesture handlers are attached at all. */
  enabled: boolean;
  centerX: number;
  centerY: number;
  minScale?: number;
  maxScale?: number;
  /**
   * The content bounds (viewBox coords) the view is kept within — typically the
   * played province's projected box, so you can't pan/zoom out to the empty
   * surroundings. Defaults to the full viewBox.
   */
  bounds?: { x0: number; y0: number; x1: number; y1: number };
  /** Fires with the data-index of the element under a clean tap (no pan drift). */
  onTap?: (index: number) => void;
}

/**
 * Clamp a pan offset on one axis so the content span [lo,hi] keeps covering the
 * viewport [0, 2·center] at the given zoom. If the content is smaller than the
 * viewport it's centred instead.
 */
export function clampAxis(
  offset: number,
  scale: number,
  center: number,
  lo: number,
  hi: number,
): number {
  const view = 2 * center;
  const shift = center * (1 - scale);
  const tLo = view - scale * hi;
  const tHi = -scale * lo;
  const t =
    tLo > tHi
      ? view / 2 - (scale * (lo + hi)) / 2
      : Math.min(tHi, Math.max(tLo, offset + shift));
  return t - shift;
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
  bounds,
  onTap,
}: UsePanZoomOptions) {
  const bx0 = bounds?.x0 ?? 0;
  const by0 = bounds?.y0 ?? 0;
  const bx1 = bounds?.x1 ?? 2 * centerX;
  const by1 = bounds?.y1 ?? 2 * centerY;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [transform, setTransform] = useState<PanZoomTransform>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (!enabled) return;
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
    [enabled, transform],
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
        const rawX = g.startTransform.x + dx / g.viewScale;
        const rawY = g.startTransform.y + dy / g.viewScale;
        const s = g.startTransform.scale;
        setTransform({
          ...g.startTransform,
          x: clampAxis(rawX, s, centerX, bx0, bx1),
          y: clampAxis(rawY, s, centerY, by0, by1),
        });
      } else if (g.kind === "pinch" && pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        const scale = clamp(
          g.startTransform.scale * (distance / g.startDistance),
          minScale,
          maxScale,
        );
        setTransform({
          ...g.startTransform,
          scale,
          x: clampAxis(g.startTransform.x, scale, centerX, bx0, bx1),
          y: clampAxis(g.startTransform.y, scale, centerY, by0, by1),
        });
      }
    },
    [enabled, minScale, maxScale, centerX, centerY, bx0, by0, bx1, by1],
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
      setTransform((t) => {
        const scale = clamp(
          t.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15),
          minScale,
          maxScale,
        );
        return {
          ...t,
          scale,
          x: clampAxis(t.x, scale, centerX, bx0, bx1),
          y: clampAxis(t.y, scale, centerY, by0, by1),
        };
      });
    },
    [enabled, minScale, maxScale, centerX, centerY, bx0, by0, bx1, by1],
  );

  // transformAttr/style reflect the current transform whenever the caller opts
  // in (independent of `enabled`), so toggling `enabled` off — e.g. a game
  // finishing — freezes the last pan/zoom in place instead of snapping back.
  const transformAttr = `translate(${transform.x + centerX} ${transform.y + centerY}) scale(${transform.scale}) translate(${-centerX} ${-centerY})`;
  // CSS-compatible version: CSS `translate()` needs commas and px units.
  // Used as an inline style so CSS `transition` can animate it.
  const transformCss = `translate(${transform.x + centerX}px, ${transform.y + centerY}px) scale(${transform.scale}) translate(${-centerX}px, ${-centerY}px)`;
  const style = { touchAction: "none" as const };

  return {
    svgRef,
    transform,
    setTransform,
    transformAttr,
    transformCss,
    style,
    handlers: {
      onPointerDown: enabled ? handlePointerDown : undefined,
      onPointerMove: enabled ? handlePointerMove : undefined,
      onPointerUp: enabled ? handlePointerUp : undefined,
      onPointerCancel: enabled ? handlePointerUp : undefined,
      onWheel: enabled ? handleWheel : undefined,
    },
  };
}
