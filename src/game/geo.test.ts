import { describe, expect, it } from "vitest";
import { CENTER_X, CENTER_Y, centerOn, IDENTITY_TRANSFORM } from "./geo";

/**
 * The `<g>` transform usePanZoom applies is
 *   translate(x+CENTER_X, y+CENTER_Y) scale(s) translate(-CENTER_X,-CENTER_Y)
 * i.e. a viewBox point `p` renders at `(p - CENTER) * s + CENTER + (x, y)`.
 * These tests assert `centerOn` lands the requested point on the viewport
 * centre under exactly that mapping.
 */
const project = (
  px: number,
  py: number,
  t: { x: number; y: number; scale: number },
): [number, number] => [
  (px - CENTER_X) * t.scale + CENTER_X + t.x,
  (py - CENTER_Y) * t.scale + CENTER_Y + t.y,
];

describe("centerOn", () => {
  it("puts the requested point at the viewport centre", () => {
    const t = centerOn(120, 640, 2.4);
    const [sx, sy] = project(120, 640, t);
    expect(sx).toBeCloseTo(CENTER_X);
    expect(sy).toBeCloseTo(CENTER_Y);
  });

  it("keeps that point centred regardless of scale", () => {
    for (const scale of [1, 1.5, 2.4, 6]) {
      const [sx, sy] = project(300, 200, centerOn(300, 200, scale));
      expect(sx).toBeCloseTo(CENTER_X);
      expect(sy).toBeCloseTo(CENTER_Y);
    }
  });

  it("centring the viewBox centre at scale 1 is the identity view", () => {
    expect(centerOn(CENTER_X, CENTER_Y, 1)).toEqual(IDENTITY_TRANSFORM);
  });
});
