import { geoCentroid } from "d3-geo";
import type { MultiPolygon, Polygon } from "geojson";
import provinces from "./provinces.json";
import type {
  ComuniCollection,
  ContextCollection,
  MapDefinition,
  MapFeature,
  OverviewCollection,
  ProvinceMeta,
  ReliefCollection,
  WaterCollection,
} from "./types";

/**
 * The province index — small, always loaded. Each province's border geometry
 * lives in its own data/<id>.json chunk, loaded on demand by loadMap().
 *
 * To regenerate everything from the ISTAT source: `npm run extract-map`.
 */
export const PROVINCES: ProvinceMeta[] = provinces;

/** Lazy per-province geometry loaders, one code-split chunk each. */
const dataLoaders = import.meta.glob<{ default: ComuniCollection }>(
  "./data/*.json",
);

export const getProvince = (id: string): ProvinceMeta | undefined =>
  PROVINCES.find((p) => p.id === id);

const displayName = (name: string) => `Provincia di ${name}`;

/**
 * Maps a raw extracted feature to the app-facing MapFeature shape, filling in
 * population/centroid for data extracted before those fields existed (falls
 * back to population 1 — uniform weight — and a geometry-derived centroid).
 */
export function toMapFeature(
  f: ComuniCollection["features"][number],
): MapFeature {
  return {
    name: f.properties.name,
    istat: f.properties.istat,
    geometry: f.geometry,
    population: f.properties.population ?? 1,
    centroid: f.properties.centroid ?? geoCentroid(f.geometry),
  };
}

/** Load a province's full playable map (borders + names). */
export async function loadMap(id: string): Promise<MapDefinition> {
  const meta = getProvince(id);
  if (!meta) throw new Error(`Unknown province: ${id}`);

  const loader = dataLoaders[`./data/${id}.json`];
  if (!loader) throw new Error(`Missing map data for province: ${id}`);

  const { default: collection } = await loader();
  return {
    id: meta.id,
    name: displayName(meta.name),
    unit: { singular: "comune", plural: "comuni" },
    features: collection.features.map(toMapFeature),
  };
}

/* ── Optional terrain layers ────────────────────────────────────────────────
   Baked per province by scripts/extract-{relief,water,context}.ts and loaded
   lazily only when the terrain toggle is on. Each is code-split, and a province
   with no baked data simply resolves to null (the layer renders nothing). */

const reliefLoaders = import.meta.glob<{ default: ReliefCollection }>(
  "./relief/*.json",
);
const waterLoaders = import.meta.glob<{ default: WaterCollection }>(
  "./water/*.json",
);
const contextLoaders = import.meta.glob<{ default: ContextCollection }>(
  "./context/*.json",
);

/** Load the baked relief (vector hypsometric bands), or null if none is baked. */
export async function loadRelief(id: string): Promise<ReliefCollection | null> {
  const loader = reliefLoaders[`./relief/${id}.json`];
  if (!loader) return null;
  return (await loader()).default;
}

/** Load the baked waterways for a province, or null if none is baked. */
export async function loadWater(id: string): Promise<WaterCollection | null> {
  const loader = waterLoaders[`./water/${id}.json`];
  if (!loader) return null;
  return (await loader()).default;
}

/** Load the baked context (neighbours/countries/labels), or null if none. */
export async function loadContext(
  id: string,
): Promise<ContextCollection | null> {
  const loader = contextLoaders[`./context/${id}.json`];
  if (!loader) return null;
  return (await loader()).default;
}

/* The picker's dissolved province boundaries, lazy-loaded and cached so the one
   591 KB parse is shared with the home-screen picker (same module chunk). */
let overviewPromise: Promise<OverviewCollection> | null = null;
function loadOverview(): Promise<OverviewCollection> {
  if (!overviewPromise) {
    overviewPromise = import("./overview.json").then(
      (m) => m.default as OverviewCollection,
    );
  }
  return overviewPromise;
}

/**
 * The dissolved outer boundary of a province. Used to frame the blind (hardcore)
 * map, where every comune border is hidden — without it the player faces a blank
 * page. Sourced from the always-available overview data, so it works for every
 * province (unlike the per-province baked context/terrain).
 */
export async function loadProvinceOutline(
  id: string,
): Promise<Polygon | MultiPolygon | null> {
  const overview = await loadOverview();
  return (
    overview.features.find((f) => f.properties.id === id)?.geometry ?? null
  );
}
