import type { MultiPolygon, Polygon, Position } from "geojson";
import { describe, expect, it } from "vitest";
import {
  clipAndSimplify,
  inRings,
  labelAnchor,
  largestRingCentroid,
  outerRings,
} from "./extract-context";
import type { Bbox } from "./lib/geo";

const square = (
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): Polygon => ({
  type: "Polygon",
  coordinates: [
    [
      [minX, minY],
      [maxX, minY],
      [maxX, maxY],
      [minX, maxY],
      [minX, minY],
    ],
  ],
});

describe("outerRings", () => {
  it("returns the outer ring of a Polygon and drops holes", () => {
    const poly: Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [4, 0],
          [4, 4],
          [0, 4],
          [0, 0],
        ],
        [
          [1, 1],
          [2, 1],
          [2, 2],
          [1, 2],
          [1, 1],
        ], // hole — dropped
      ],
    };
    expect(outerRings(poly)).toHaveLength(1);
  });

  it("returns one ring per polygon of a MultiPolygon", () => {
    const multi: MultiPolygon = {
      type: "MultiPolygon",
      coordinates: [
        square(0, 0, 1, 1).coordinates,
        square(2, 2, 3, 3).coordinates,
      ],
    };
    expect(outerRings(multi)).toHaveLength(2);
  });
});

describe("clipAndSimplify", () => {
  const bbox: Bbox = [0, 0, 10, 10];

  it("keeps a ring that overlaps the bbox and closes it", () => {
    const rings = clipAndSimplify(square(-5, -5, 5, 5), bbox);
    expect(rings).toHaveLength(1);
    const r = rings[0];
    expect(r[0]).toEqual(r[r.length - 1]);
    // Clipped to the bbox's lower-left quadrant.
    for (const [x, y] of r) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
    }
  });

  it("drops a ring entirely outside the bbox", () => {
    expect(clipAndSimplify(square(20, 20, 30, 30), bbox)).toEqual([]);
  });
});

describe("inRings", () => {
  const rings = [square(0, 0, 10, 10).coordinates[0]] as Position[][];
  it("detects inside vs outside", () => {
    expect(inRings([5, 5], rings)).toBe(true);
    expect(inRings([15, 5], rings)).toBe(false);
  });
});

describe("largestRingCentroid", () => {
  it("returns the centroid of the single ring when given one", () => {
    const rings = [square(0, 0, 10, 10).coordinates[0]] as Position[][];
    const c = largestRingCentroid(rings);
    expect(c).not.toBeNull();
    expect(c?.[0]).toBeCloseTo(5, 3);
    expect(c?.[1]).toBeCloseTo(5, 3);
  });

  it("picks the larger ring when given multiple", () => {
    const big = square(0, 0, 10, 10).coordinates[0] as Position[];
    const small = square(20, 20, 21, 21).coordinates[0] as Position[];
    const c = largestRingCentroid([small, big]);
    // centroid should be the big square's centre, not the small one
    expect(c?.[0]).toBeCloseTo(5, 3);
    expect(c?.[1]).toBeCloseTo(5, 3);
  });

  it("returns null for an empty array", () => {
    expect(largestRingCentroid([])).toBeNull();
  });
});

describe("labelAnchor", () => {
  const target = [square(0, 0, 4, 4).coordinates[0]] as Position[][];

  it("anchors at the largest ring's centroid when outside the target", () => {
    const neighbour = [square(10, 0, 20, 10).coordinates[0]] as Position[][];
    const at = labelAnchor(neighbour, target);
    expect(at).not.toBeNull();
    // Centroid of the 10..20 × 0..10 square.
    expect(at?.[0]).toBeCloseTo(15, 3);
    expect(at?.[1]).toBeCloseTo(5, 3);
  });

  it("returns null when the anchor would fall inside the target province", () => {
    const overlapping = [square(0, 0, 4, 4).coordinates[0]] as Position[][];
    expect(labelAnchor(overlapping, target)).toBeNull();
  });
});
