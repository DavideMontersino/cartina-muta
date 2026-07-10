import type { Position } from "geojson";
import { describe, expect, it } from "vitest";
import type { WaterFeature } from "../src/maps/types";
import {
  assembleRings,
  cleanRing,
  elementsToCollection,
  elementToFeature,
  overpassQuery,
  prominence,
  selectFeatures,
  simplifyLine,
  waterKind,
} from "./extract-water";

describe("waterKind", () => {
  it("maps OSM tags to water kinds", () => {
    expect(waterKind({ waterway: "river" })).toBe("river");
    expect(waterKind({ waterway: "canal" })).toBe("canal");
    expect(waterKind({ natural: "water" })).toBe("lake");
    expect(waterKind({ natural: "water", water: "reservoir" })).toBe(
      "reservoir",
    );
    expect(waterKind({ landuse: "reservoir" })).toBe("reservoir");
  });

  it("ignores non-water and (by default) streams", () => {
    expect(waterKind({ highway: "residential" })).toBeNull();
    expect(waterKind({})).toBeNull();
    expect(waterKind({ waterway: "stream" })).toBeNull();
  });
});

describe("cleanRing", () => {
  it("rounds coordinates and drops consecutive duplicates", () => {
    const ring: Position[] = [
      [7.123456, 44.123456],
      [7.123458, 44.123457], // rounds to the same point → dropped
      [7.2, 44.2],
    ];
    expect(cleanRing(ring)).toEqual([
      [7.1235, 44.1235],
      [7.2, 44.2],
    ]);
  });
});

describe("simplifyLine", () => {
  it("drops near-collinear points but keeps endpoints", () => {
    const line: Position[] = [
      [0, 0],
      [1, 0.00001], // within tolerance of the 0–2 segment
      [2, 0],
    ];
    expect(simplifyLine(line, 0.0006)).toEqual([
      [0, 0],
      [2, 0],
    ]);
  });

  it("keeps points that deviate beyond the tolerance", () => {
    const line: Position[] = [
      [0, 0],
      [1, 1],
      [2, 0],
    ];
    expect(simplifyLine(line, 0.0006)).toHaveLength(3);
  });
});

describe("assembleRings", () => {
  it("stitches split segments into a closed ring", () => {
    const rings = assembleRings([
      [
        [0, 0],
        [1, 0],
      ],
      [
        [1, 0],
        [1, 1],
      ],
      [
        [1, 1],
        [0, 0],
      ],
    ]);
    expect(rings).toHaveLength(1);
    expect(rings[0][0]).toEqual(rings[0][rings[0].length - 1]);
  });

  it("drops segments that never close", () => {
    expect(
      assembleRings([
        [
          [0, 0],
          [1, 0],
        ],
      ]),
    ).toEqual([]);
  });
});

describe("elementToFeature", () => {
  it("turns a river way into a LineString", () => {
    const f = elementToFeature({
      type: "way",
      tags: { waterway: "river", name: "Tanaro" },
      geometry: [
        { lat: 44.0, lon: 7.0 },
        { lat: 44.1, lon: 7.2 },
      ],
    });
    expect(f?.geometry.type).toBe("LineString");
    expect(f?.properties).toEqual({ kind: "river", name: "Tanaro" });
  });

  it("turns a closed water way into a Polygon and omits an absent name", () => {
    const f = elementToFeature({
      type: "way",
      tags: { natural: "water" },
      geometry: [
        { lat: 44.0, lon: 7.0 },
        { lat: 44.0, lon: 7.1 },
        { lat: 44.1, lon: 7.1 },
        { lat: 44.1, lon: 7.0 },
        { lat: 44.0, lon: 7.0 },
      ],
    });
    expect(f?.geometry.type).toBe("Polygon");
    expect(f?.properties).toEqual({ kind: "lake" });
  });

  it("returns null for non-water elements", () => {
    expect(
      elementToFeature({
        type: "way",
        tags: { highway: "track" },
        geometry: [],
      }),
    ).toBeNull();
  });
});

describe("selectFeatures", () => {
  const river = (name?: string, len = 0.001): WaterFeature => ({
    type: "Feature",
    properties: name ? { kind: "river", name } : { kind: "river" },
    geometry: {
      type: "LineString",
      coordinates: [
        [0, 0],
        [len, 0],
      ],
    },
  });

  it("keeps named short rivers but drops unnamed short ones", () => {
    const kept = selectFeatures([
      river("Tanaro", 0.001),
      river(undefined, 0.001),
    ]);
    expect(kept).toHaveLength(1);
    expect(kept[0].properties.name).toBe("Tanaro");
  });

  it("ranks by prominence (longer rivers first)", () => {
    const kept = selectFeatures([river("Short", 0.02), river("Long", 0.2)]);
    expect(kept[0].properties.name).toBe("Long");
    expect(prominence(kept[0])).toBeGreaterThan(prominence(kept[1]));
  });
});

describe("overpassQuery", () => {
  it("formats the bbox as south,west,north,east", () => {
    const q = overpassQuery([6.85, 44.06, 8.27, 44.86]);
    expect(q).toContain("44.06,6.85,44.86,8.27");
    expect(q).toContain('waterway"~"^(river|canal)$"');
  });
});

describe("elementsToCollection", () => {
  it("collects only convertible water elements", () => {
    const c = elementsToCollection([
      {
        type: "way",
        tags: { waterway: "river" },
        geometry: [
          { lat: 0, lon: 0 },
          { lat: 1, lon: 1 },
        ],
      },
      { type: "node" },
      { type: "way", tags: { building: "yes" }, geometry: [] },
    ]);
    expect(c.features).toHaveLength(1);
  });
});
