import { describe, expect, it } from "vitest";
import {
  bandGeometry,
  buildBands,
  decodeElevation,
  gridSize,
  gridToLonLat,
} from "./extract-relief";
import type { Bbox } from "./lib/geo";
import { signedArea } from "./lib/geo";

describe("decodeElevation", () => {
  it("decodes Terrarium terrain-RGB to metres", () => {
    expect(decodeElevation(128, 0, 0)).toBe(0);
    expect(decodeElevation(143, 1, 0)).toBeCloseTo(3841, 5);
    expect(decodeElevation(0, 0, 0)).toBe(-32768);
  });
});

describe("gridToLonLat", () => {
  const bbox: Bbox = [7, 44, 8, 45];

  it("maps grid corners to the bbox corners (y down = north→south)", () => {
    const nw = gridToLonLat(0, 0, 100, 100, bbox);
    const se = gridToLonLat(100, 100, 100, 100, bbox);
    expect(nw[0]).toBeCloseTo(7, 6); // west
    expect(nw[1]).toBeCloseTo(45, 6); // north (grid y=0)
    expect(se[0]).toBeCloseTo(8, 6); // east
    expect(se[1]).toBeCloseTo(44, 6); // south
  });
});

describe("gridSize", () => {
  it("puts the long side on the wider Mercator axis", () => {
    const wide = gridSize([6.6, 44.4, 8.5, 44.9], 480);
    expect(wide.width).toBe(480);
    expect(wide.height).toBeLessThan(480);
  });
});

describe("bandGeometry", () => {
  const bbox: Bbox = [7, 44, 8, 45];

  it("maps a grid polygon to WGS84 with a clockwise exterior ring", () => {
    // A counter-clockwise square in grid space (y-down).
    const grid = {
      type: "MultiPolygon" as const,
      coordinates: [
        [
          [
            [20, 20],
            [20, 80],
            [80, 80],
            [80, 20],
            [20, 20],
          ],
        ],
      ],
    };
    const geom = bandGeometry(grid, 100, 100, bbox);
    expect(geom).not.toBeNull();
    const ring = geom?.coordinates[0][0] as number[][];
    // Closed and clockwise (negative signed area) so spherical geoPath fills it.
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(signedArea(ring)).toBeLessThan(0);
    // All vertices inside the bbox.
    for (const [x, y] of ring) {
      expect(x).toBeGreaterThanOrEqual(7);
      expect(x).toBeLessThanOrEqual(8);
      expect(y).toBeGreaterThanOrEqual(44);
      expect(y).toBeLessThanOrEqual(45);
    }
  });

  it("returns null when nothing survives", () => {
    const empty = { type: "MultiPolygon" as const, coordinates: [] };
    expect(bandGeometry(empty, 100, 100, bbox)).toBeNull();
  });
});

describe("buildBands", () => {
  it("emits a band per threshold that the data reaches", () => {
    // A 20×20 grid: a central plateau at 1000 m, 0 elsewhere.
    const w = 20;
    const h = 20;
    const values = new Array(w * h).fill(0);
    for (let y = 6; y < 14; y++) {
      for (let x = 6; x < 14; x++) values[y * w + x] = 1000;
    }
    const bands = buildBands(values, w, h, [7, 44, 8, 45], [0, 500, 1500]);
    // Threshold 0 covers everything; 500 covers the plateau; 1500 nothing.
    const levels = bands.map((b) => b.properties.level);
    expect(levels).toContain(0);
    expect(levels).toContain(1);
    expect(bands.every((b) => b.geometry.coordinates.length > 0)).toBe(true);
  });
});
