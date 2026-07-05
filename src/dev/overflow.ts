/**
 * No-scroll invariant helpers. Campanilismi is a single-screen game: `<body>`
 * has `overflow: hidden`, so any content that spills past the viewport is
 * silently clipped and becomes unreachable (this is exactly how the game-mode
 * selector once ended up off-screen). These pure functions measure that spill
 * so a dev-time guard — and unit tests — can catch it. Kept free of DOM access
 * so the math is testable in isolation.
 */

export interface Overflow {
  /** Pixels of content past the right edge of the viewport. */
  x: number;
  /** Pixels of content past the bottom edge of the viewport. */
  y: number;
}

/** How far the document extends beyond the viewport, clamped at 0 (never negative). */
export function measureOverflow(
  scrollWidth: number,
  scrollHeight: number,
  innerWidth: number,
  innerHeight: number,
): Overflow {
  return {
    x: Math.max(0, scrollWidth - innerWidth),
    y: Math.max(0, scrollHeight - innerHeight),
  };
}

/**
 * Whether an overflow is meaningful. A 1px default tolerance absorbs sub-pixel
 * rounding from fractional layout sizes, which would otherwise cry wolf.
 */
export function hasOverflow(overflow: Overflow, tolerance = 1): boolean {
  return overflow.x > tolerance || overflow.y > tolerance;
}

/** Human-readable summary for warnings, e.g. "12px horizontal, 40px vertical". */
export function describeOverflow(overflow: Overflow): string {
  const parts: string[] = [];
  if (overflow.x > 0) parts.push(`${overflow.x}px horizontal`);
  if (overflow.y > 0) parts.push(`${overflow.y}px vertical`);
  return parts.join(", ");
}
