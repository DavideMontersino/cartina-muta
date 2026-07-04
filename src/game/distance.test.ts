import { describe, expect, it } from "vitest";
import { bearingDegrees, haversineKm, pointInGeometry } from "./distance";

describe("haversineKm", () => {
  it("is zero for identical points", () => {
    expect(haversineKm([7.55, 44.38], [7.55, 44.38])).toBeCloseTo(0, 6);
  });

  it("matches a known distance (Turin to Milan, ~directional straight-line)", () => {
    // Turin (7.6869, 45.0703) to Milan (9.1900, 45.4642) — real straight-line
    // distance is ~126 km.
    const d = haversineKm([7.6869, 45.0703], [9.19, 45.4642]);
    expect(d).toBeGreaterThan(120);
    expect(d).toBeLessThan(132);
  });
});

describe("bearingDegrees", () => {
  it("is ~0 (north) when the target is directly north", () => {
    const b = bearingDegrees([9, 45], [9, 46]);
    expect(b).toBeCloseTo(0, 0);
  });

  it("is ~90 (east) when the target is directly east", () => {
    const b = bearingDegrees([9, 45], [10, 45]);
    expect(b).toBeCloseTo(90, 0);
  });

  it("is ~180 (south) when the target is directly south", () => {
    const b = bearingDegrees([9, 45], [9, 44]);
    expect(b).toBeCloseTo(180, 0);
  });

  it("is ~270 (west) when the target is directly west", () => {
    const b = bearingDegrees([9, 45], [8, 45]);
    expect(b).toBeCloseTo(270, 0);
  });
});

describe("pointInGeometry", () => {
  const square: [number, number][] = [
    [0, 0],
    [0, 10],
    [10, 10],
    [10, 0],
    [0, 0],
  ];

  it("is true for a point inside a Polygon", () => {
    expect(
      pointInGeometry([5, 5], { type: "Polygon", coordinates: [square] }),
    ).toBe(true);
  });

  it("is false for a point outside a Polygon", () => {
    expect(
      pointInGeometry([50, 50], { type: "Polygon", coordinates: [square] }),
    ).toBe(false);
  });

  it("is false for a point inside a hole", () => {
    const hole: [number, number][] = [
      [4, 4],
      [4, 6],
      [6, 6],
      [6, 4],
      [4, 4],
    ];
    const withHole = { type: "Polygon" as const, coordinates: [square, hole] };
    expect(pointInGeometry([5, 5], withHole)).toBe(false);
    expect(pointInGeometry([1, 1], withHole)).toBe(true);
  });

  it("is true for a point inside any part of a MultiPolygon", () => {
    const farAway: [number, number][] = [
      [100, 100],
      [100, 110],
      [110, 110],
      [110, 100],
      [100, 100],
    ];
    const multi = {
      type: "MultiPolygon" as const,
      coordinates: [[square], [farAway]],
    };
    expect(pointInGeometry([105, 105], multi)).toBe(true);
    expect(pointInGeometry([5, 5], multi)).toBe(true);
    expect(pointInGeometry([50, 50], multi)).toBe(false);
  });
});
