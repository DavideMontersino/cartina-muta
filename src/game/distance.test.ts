import { describe, expect, it } from "vitest";
import { bearingDegrees, compassArrow, haversineKm } from "./distance";

describe("haversineKm", () => {
  it("is zero for identical points", () => {
    expect(haversineKm([7.55, 44.38], [7.55, 44.38])).toBeCloseTo(0, 6);
  });

  it("matches a known distance (Turin to Milan, ~straight-line)", () => {
    // Turin (7.6869, 45.0703) to Milan (9.1900, 45.4642) — ~126 km.
    const d = haversineKm([7.6869, 45.0703], [9.19, 45.4642]);
    expect(d).toBeGreaterThan(120);
    expect(d).toBeLessThan(132);
  });
});

describe("bearingDegrees", () => {
  it("is ~0 (north) when the target is directly north", () => {
    expect(bearingDegrees([9, 45], [9, 46])).toBeCloseTo(0, 0);
  });

  it("is ~90 (east) when the target is directly east", () => {
    expect(bearingDegrees([9, 45], [10, 45])).toBeCloseTo(90, 0);
  });

  it("is ~180 (south) when the target is directly south", () => {
    expect(bearingDegrees([9, 45], [9, 44])).toBeCloseTo(180, 0);
  });

  it("is ~270 (west) when the target is directly west", () => {
    expect(bearingDegrees([9, 45], [8, 45])).toBeCloseTo(270, 0);
  });
});

describe("compassArrow", () => {
  it("maps cardinal and intercardinal bearings to the right glyph", () => {
    expect(compassArrow(0)).toBe("↑");
    expect(compassArrow(45)).toBe("↗");
    expect(compassArrow(90)).toBe("→");
    expect(compassArrow(135)).toBe("↘");
    expect(compassArrow(180)).toBe("↓");
    expect(compassArrow(225)).toBe("↙");
    expect(compassArrow(270)).toBe("←");
    expect(compassArrow(315)).toBe("↖");
  });

  it("wraps around at 360 and handles negative bearings", () => {
    expect(compassArrow(360)).toBe("↑");
    expect(compassArrow(-45)).toBe("↖");
  });
});
