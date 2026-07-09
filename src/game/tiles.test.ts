import { geoMercator } from "d3-geo";
import type { Feature, FeatureCollection } from "geojson";
import { describe, expect, it } from "vitest";
import { computeTerrainTiles, TERRAIN_MAX_ZOOM, terrainTileUrl } from "./tiles";

const WIDTH = 1000;
const HEIGHT = 800;

/** A projection fitted to a small bbox around Cuneo, like a real province. */
function cuneoProjection() {
  const bbox: Feature = {
    type: "Feature",
    properties: null,
    geometry: {
      type: "Polygon",
      // Counter-clockwise ring — d3-geo's spherical geometry reads the interior
      // by right-hand winding; a clockwise ring would be treated as the whole
      // globe minus this hole and collapse the fit.
      coordinates: [
        [
          [7.0, 44.2],
          [7.0, 44.7],
          [7.9, 44.7],
          [7.9, 44.2],
          [7.0, 44.2],
        ],
      ],
    },
  };
  const collection: FeatureCollection = {
    type: "FeatureCollection",
    features: [bbox],
  };
  return geoMercator().fitExtent(
    [
      [24, 24],
      [WIDTH - 24, HEIGHT - 24],
    ],
    collection,
  );
}

/** Standard slippy-map tile index for a lon/lat at a zoom level. */
function slippyTile(lon: number, lat: number, z: number) {
  const n = 2 ** z;
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { x, y };
}

describe("computeTerrainTiles", () => {
  it("returns tiles that cover the whole viewport", () => {
    const tiles = computeTerrainTiles(cuneoProjection(), WIDTH, HEIGHT);
    expect(tiles.length).toBeGreaterThan(0);

    const minX = Math.min(...tiles.map((t) => t.px));
    const minY = Math.min(...tiles.map((t) => t.py));
    const maxX = Math.max(...tiles.map((t) => t.px + t.size));
    const maxY = Math.max(...tiles.map((t) => t.py + t.size));
    expect(minX).toBeLessThanOrEqual(0);
    expect(minY).toBeLessThanOrEqual(0);
    expect(maxX).toBeGreaterThanOrEqual(WIDTH);
    expect(maxY).toBeGreaterThanOrEqual(HEIGHT);
  });

  it("emits a contiguous grid of equal-sized tiles at one zoom", () => {
    const tiles = computeTerrainTiles(cuneoProjection(), WIDTH, HEIGHT);
    const z = tiles[0].z;
    const size = tiles[0].size;
    expect(tiles.every((t) => t.z === z)).toBe(true);
    expect(tiles.every((t) => Math.abs(t.size - size) < 1e-6)).toBe(true);

    // Neighbouring tile indices are exactly one tile-size apart.
    for (const t of tiles) {
      const right = tiles.find((o) => o.x === t.x + 1 && o.y === t.y);
      if (right) expect(right.px - t.px).toBeCloseTo(size, 6);
      const below = tiles.find((o) => o.x === t.x && o.y === t.y + 1);
      if (below) expect(below.py - t.py).toBeCloseTo(size, 6);
    }
  });

  it("aligns tile indices to the standard slippy-map scheme", () => {
    const projection = cuneoProjection();
    const tiles = computeTerrainTiles(projection, WIDTH, HEIGHT);
    const z = tiles[0].z;

    // The centre of the fitted bbox must land in the slippy tile it belongs to,
    // and that tile must be one we emitted at the correct paint position.
    const lon = 7.45;
    const lat = 44.45;
    const expected = slippyTile(lon, lat, z);
    const tile = tiles.find((t) => t.x === expected.x && t.y === expected.y);
    expect(tile).toBeDefined();

    const [px, py] = projection([lon, lat]) as [number, number];
    // biome-ignore lint/style/noNonNullAssertion: asserted defined above.
    const t = tile!;
    expect(px).toBeGreaterThanOrEqual(t.px);
    expect(px).toBeLessThanOrEqual(t.px + t.size);
    expect(py).toBeGreaterThanOrEqual(t.py);
    expect(py).toBeLessThanOrEqual(t.py + t.size);
  });

  it("never exceeds the provider's max zoom", () => {
    const tiles = computeTerrainTiles(cuneoProjection(), WIDTH, HEIGHT);
    expect(tiles.every((t) => t.z <= TERRAIN_MAX_ZOOM && t.z >= 0)).toBe(true);
  });

  it("returns nothing for a degenerate projection", () => {
    const dead = geoMercator().scale(0);
    expect(computeTerrainTiles(dead, WIDTH, HEIGHT)).toEqual([]);
  });

  it("builds provider URLs from tile coordinates", () => {
    expect(terrainTileUrl({ x: 1, y: 2, z: 3 })).toBe(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/3/2/1",
    );
  });
});
