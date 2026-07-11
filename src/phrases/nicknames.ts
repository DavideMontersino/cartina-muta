import { PROVINCES } from "../maps/registry";
import {
  LABEL_NAME_TO_KEY,
  nationalLabelPools,
  provinceLabelPools,
} from "./data/labels";

const regionByProvinceName: Record<string, string> = Object.fromEntries(
  PROVINCES.map((p) => [p.name, p.region]),
);

function pickRandom(pool: string[]): string | null {
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildPool(key: string, provinceId?: string): string[] {
  const national = nationalLabelPools[key] ?? [];
  const local = provinceId ? (provinceLabelPools[provinceId]?.[key] ?? []) : [];
  return [...national, ...local];
}

/**
 * Returns a randomly picked phrase for a neighbour label, or null to keep the
 * real name. The pool is national + province-specific (additive), so phrases
 * from both layers are equally eligible.
 *
 * Falls back to the label's region pool when the province label itself has
 * no entry (e.g. "Vercelli" falls back to "Piemonte").
 *
 * @param name       Italian label name as it appears on the map (e.g. "Francia")
 * @param provinceId 2-letter id of the played province (e.g. "cn") for local flavour
 */
export function nicknameFor(name: string, provinceId?: string): string | null {
  const key = LABEL_NAME_TO_KEY[name];
  if (key) {
    const pool = buildPool(key, provinceId);
    if (pool.length > 0) return pickRandom(pool);
  }

  // Region fallback: if name is a province with no pool, try its region.
  const region = regionByProvinceName[name];
  if (region) {
    const regionKey = LABEL_NAME_TO_KEY[region];
    if (regionKey) {
      const pool = buildPool(regionKey, provinceId);
      if (pool.length > 0) return pickRandom(pool);
    }
  }

  return null;
}
