import type { GeoProjection } from "d3-geo";

/**
 * Optional raster "terrain" basemap: shaded relief + waterways rendered behind
 * the comuni so players can orient by mountains, valleys and rivers. The tiles
 * are standard Web-Mercator XYZ tiles, aligned to the map's own geoMercator
 * projection (see game/geo.ts) so they land in the exact same pixel space.
 *
 * The math here mirrors d3-tile: given a projection and the viewport size, work
 * out which {z}/{x}/{y} tiles cover the view and where each one paints.
 */

const TILE_SIZE = 256;
const TAU = 2 * Math.PI;

/**
 * Esri "World Terrain Base": shaded relief + hydrography, key-free on a robust
 * global CDN, and — unlike OpenTopoMap/OSM — free of place labels, so the
 * layer can't spoil the blind-map guess by naming the comune. Swap this single
 * URL to change providers; keep MAX_ZOOM in sync with the provider's depth.
 */
export const TERRAIN_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}";

/** Deepest zoom the provider serves; deeper requests are clamped (upscaled). */
export const TERRAIN_MAX_ZOOM = 13;

/** Attribution required by the provider's terms; shown on the map when active. */
export const TERRAIN_ATTRIBUTION = "Rilievo: Esri, USGS, NOAA";

export interface TerrainTile {
  /** XYZ tile coordinates. */
  x: number;
  y: number;
  z: number;
  /** Where to paint the tile, in viewBox pixels. */
  px: number;
  py: number;
  /** Rendered edge length in viewBox pixels (square). */
  size: number;
}

export function terrainTileUrl(
  tile: Pick<TerrainTile, "x" | "y" | "z">,
): string {
  return TERRAIN_TILE_URL.replace("{z}", String(tile.z))
    .replace("{x}", String(tile.x))
    .replace("{y}", String(tile.y));
}

/**
 * The set of XYZ tiles covering the [0,0]–[width,height] viewport under the
 * given Web-Mercator projection, each with its paint position and size. Returns
 * `[]` if the projection isn't usable (missing/degenerate scale).
 */
export function computeTerrainTiles(
  projection: GeoProjection,
  width: number,
  height: number,
  maxZoom = TERRAIN_MAX_ZOOM,
): TerrainTile[] {
  const worldSize = (projection.scale?.() ?? 0) * TAU;
  if (!Number.isFinite(worldSize) || worldSize <= 0) return [];

  // Prime meridian / equator projects to the centre of the world square.
  const centre = projection([0, 0]);
  if (!centre || !Number.isFinite(centre[0]) || !Number.isFinite(centre[1])) {
    return [];
  }
  const [cx, cy] = centre;

  // Ideal fractional zoom, clamped to what the provider serves. Below the ideal
  // zoom `k` grows past TILE_SIZE, upscaling coarser tiles to fill the gap.
  const zIdeal = Math.max(0, Math.log2(worldSize / TILE_SIZE));
  const z = Math.max(0, Math.min(maxZoom, Math.round(zIdeal)));
  const k = 2 ** (zIdeal - z) * TILE_SIZE;

  // Top-left of the whole world square, in viewBox pixels.
  const left = cx - worldSize / 2;
  const top = cy - worldSize / 2;

  const n = 2 ** z; // tiles per axis at this zoom
  const xmin = Math.max(0, Math.floor((0 - left) / k));
  const xmax = Math.min(n, Math.ceil((width - left) / k));
  const ymin = Math.max(0, Math.floor((0 - top) / k));
  const ymax = Math.min(n, Math.ceil((height - top) / k));

  const tiles: TerrainTile[] = [];
  for (let ty = ymin; ty < ymax; ty++) {
    for (let tx = xmin; tx < xmax; tx++) {
      tiles.push({
        x: tx,
        y: ty,
        z,
        px: tx * k + left,
        py: ty * k + top,
        size: k,
      });
    }
  }
  return tiles;
}
