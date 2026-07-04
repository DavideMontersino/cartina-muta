import { describe, expect, it } from "vitest";
import { toMapFeature } from "./registry";
import type { ComuniCollection } from "./types";

const square = {
  type: "Polygon" as const,
  coordinates: [
    [
      [0, 0],
      [0, 10],
      [10, 10],
      [10, 0],
      [0, 0],
    ],
  ],
};

describe("toMapFeature", () => {
  it("passes through population and centroid when present", () => {
    const f: ComuniCollection["features"][number] = {
      type: "Feature",
      properties: {
        name: "Test",
        istat: "001001",
        population: 5000,
        centroid: [1, 2],
      },
      geometry: square,
    };
    const feature = toMapFeature(f);
    expect(feature.population).toBe(5000);
    expect(feature.centroid).toEqual([1, 2]);
  });

  it("falls back to population 1 and a geometry-derived centroid when absent (pre-population-join data)", () => {
    const f: ComuniCollection["features"][number] = {
      type: "Feature",
      properties: { name: "Test", istat: "001001" },
      geometry: square,
    };
    const feature = toMapFeature(f);
    expect(feature.population).toBe(1);
    expect(feature.centroid[0]).toBeCloseTo(5, 1);
    expect(feature.centroid[1]).toBeCloseTo(5, 1);
  });
});
