import type { Position } from "geojson";
import { describe, expect, it } from "vitest";
import {
  clipRingToBbox,
  collectionBbox,
  ensureWinding,
  expandBbox,
  latToMercY,
  lonToMercX,
  mercYToLat,
  pointInRing,
  ringCentroid,
  signedArea,
  tileCover,
} from "./geo";

describe("collectionBbox", () => {
  it("covers every feature's coordinates", () => {
    const features = [
      {
        geometry: {
          coordinates: [
            [
              [7, 44],
              [8, 44],
              [8, 45],
              [7, 45],
              [7, 44],
            ],
          ],
        },
      },
      {
        geometry: {
          coordinates: [
            [
              [
                [6, 43],
                [6.5, 43],
                [6.5, 43.5],
                [6, 43],
              ],
            ],
          ],
        },
      },
    ];
    expect(collectionBbox(features)).toEqual([6, 43, 8, 45]);
  });
});

describe("expandBbox", () => {
  it("grows each side by the given fraction of width/height", () => {
    expect(expandBbox([0, 0, 10, 20], 0.1)).toEqual([-1, -2, 11, 22]);
  });
});

describe("mercator conversions", () => {
  it("maps the prime meridian / equator to the centre", () => {
    expect(lonToMercX(0)).toBeCloseTo(0.5, 12);
    expect(latToMercY(0)).toBeCloseTo(0.5, 12);
  });

  it("round-trips latitude through merc Y", () => {
    for (const lat of [-60, -44.5, 0, 12.3, 44.5, 70]) {
      expect(mercYToLat(latToMercY(lat))).toBeCloseTo(lat, 9);
    }
  });

  it("grows Y southward", () => {
    expect(latToMercY(45)).toBeLessThan(latToMercY(44));
  });
});

describe("clipRingToBbox", () => {
  const ring: Position[] = [
    [-5, -5],
    [5, -5],
    [5, 5],
    [-5, 5],
    [-5, -5],
  ];
  it("clips a ring to the bbox and stays within it", () => {
    const clipped = clipRingToBbox(ring, [0, 0, 10, 10]);
    expect(clipped.length).toBeGreaterThanOrEqual(3);
    for (const [x, y] of clipped) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(5);
      expect(y).toBeLessThanOrEqual(5);
    }
  });
  it("returns empty for a ring outside the bbox", () => {
    expect(clipRingToBbox(ring, [20, 20, 30, 30])).toEqual([]);
  });
});

describe("pointInRing", () => {
  const ring: Position[] = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ];
  it("distinguishes inside from outside", () => {
    expect(pointInRing([5, 5], ring)).toBe(true);
    expect(pointInRing([15, 5], ring)).toBe(false);
  });
});

describe("ringCentroid", () => {
  it("finds the centroid of a square", () => {
    const c = ringCentroid([
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
    ]);
    expect(c?.[0]).toBeCloseTo(2, 9);
    expect(c?.[1]).toBeCloseTo(2, 9);
  });
  it("returns null for a degenerate ring", () => {
    expect(
      ringCentroid([
        [0, 0],
        [1, 0],
      ]),
    ).toBeNull();
  });
});

describe("signedArea / ensureWinding", () => {
  const ccw: Position[] = [
    [0, 0],
    [4, 0],
    [4, 4],
    [0, 4],
  ]; // counter-clockwise → positive area

  it("signs area by winding", () => {
    expect(signedArea(ccw)).toBeGreaterThan(0);
    expect(signedArea([...ccw].reverse())).toBeLessThan(0);
  });

  it("reverses only when the winding doesn't match", () => {
    // Want clockwise: a CCW ring flips, an already-CW ring is untouched.
    expect(signedArea(ensureWinding(ccw, true))).toBeLessThan(0);
    const cw = [...ccw].reverse();
    expect(ensureWinding(cw, true)).toBe(cw); // same reference, no copy
  });
});

describe("tileCover", () => {
  it("covers a Cuneo-sized bbox and stays within the world grid", () => {
    const cover = tileCover([6.85, 44.06, 8.27, 44.86], 11);
    expect(cover.z).toBe(11);
    expect(cover.xMin).toBeLessThanOrEqual(cover.xMax);
    expect(cover.yMin).toBeLessThanOrEqual(cover.yMax);
    const n = 2 ** 11;
    expect(cover.xMin).toBeGreaterThanOrEqual(0);
    expect(cover.xMax).toBeLessThan(n);

    // The bbox's own corners must fall inside the returned tile range.
    const westTile = Math.floor(lonToMercX(6.85) * n);
    const eastTile = Math.floor(lonToMercX(8.27) * n);
    expect(cover.xMin).toBe(westTile);
    expect(cover.xMax).toBe(eastTile);
    // North edge → smaller Y index than the south edge.
    expect(cover.yMin).toBe(Math.floor(latToMercY(44.86) * n));
    expect(cover.yMax).toBe(Math.floor(latToMercY(44.06) * n));
  });
});
