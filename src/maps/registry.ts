import provinces from "./provinces.json";
import type { ComuniCollection, MapDefinition, ProvinceMeta } from "./types";

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
    features: collection.features.map((f) => ({
      name: f.properties.name,
      istat: f.properties.istat,
      geometry: f.geometry,
    })),
  };
}
