import { describe, expect, it } from "vitest";
import { clampAxis } from "./usePanZoom";

// viewBox axis of length 1000 (centre 500). The "content" [lo,hi] is the
// projected province; clampAxis keeps it covering the viewport when zoomed.
const CENTER = 500;

describe("clampAxis", () => {
  it("pins the offset to 0 at the fit zoom (scale 1)", () => {
    // Province spans the whole axis with a little padding — at scale 1 it can't
    // pan at all, so any drag is pulled back to centred (0).
    expect(clampAxis(200, 1, CENTER, 24, 976)).toBeCloseTo(0, 6);
    expect(clampAxis(-200, 1, CENTER, 24, 976)).toBeCloseTo(0, 6);
  });

  it("centres content smaller than the viewport", () => {
    // A 200-wide province centred at 500, zoomed 1× → stays centred whatever the
    // drag.
    expect(clampAxis(999, 1, CENTER, 400, 600)).toBeCloseTo(0, 6);
  });

  it("allows panning within the overscan when zoomed in, but no further", () => {
    // Province [0,1000] at 2× is 2000 wide on screen; the viewport (1000) can
    // slide within ±500 of centre. clampAxis is expressed as the <g> offset.
    const lo = 0;
    const hi = 1000;
    const s = 2;
    // A huge leftward drag clamps to the max offset that still covers the right
    // edge; a huge rightward drag clamps to the min. They must be finite and
    // symmetric about 0 for a centred province.
    const left = clampAxis(-10000, s, CENTER, lo, hi);
    const right = clampAxis(10000, s, CENTER, lo, hi);
    expect(right).toBeCloseTo(-left, 6);
    expect(right).toBeGreaterThan(0);
    // Inside the range, the requested offset passes through unchanged.
    expect(clampAxis(100, s, CENTER, lo, hi)).toBeCloseTo(100, 6);
  });

  it("keeps the province edge from crossing into the viewport", () => {
    // At the clamped extreme, the province must still cover the viewport: the
    // left edge projects to ≤ 0 and the right edge to ≥ 1000.
    const s = 3;
    const lo = 100;
    const hi = 900;
    const off = clampAxis(-100000, s, CENTER, lo, hi);
    const shift = CENTER * (1 - s);
    const screenLeft = s * lo + off + shift;
    const screenRight = s * hi + off + shift;
    expect(screenLeft).toBeLessThanOrEqual(0.001);
    expect(screenRight).toBeGreaterThanOrEqual(1000 - 0.001);
  });
});
