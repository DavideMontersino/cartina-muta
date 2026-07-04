import type { ProvinceMeta } from "./types";

/** Lowercase and strip accents so "forli" matches "Forlì". */
export const normalize = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

/**
 * Filter provinces for the autocomplete. Empty query returns the first `limit`
 * provinces (already sorted by name); otherwise matches province name, region,
 * or 2-letter id. Name matches rank above region matches.
 */
export function filterProvinces(
  provinces: ProvinceMeta[],
  query: string,
  limit = 8,
): ProvinceMeta[] {
  const q = normalize(query);
  if (!q) return provinces.slice(0, limit);

  const scored: Array<{ p: ProvinceMeta; rank: number }> = [];
  for (const p of provinces) {
    const name = normalize(p.name);
    if (name.startsWith(q)) scored.push({ p, rank: 0 });
    else if (name.includes(q)) scored.push({ p, rank: 1 });
    else if (p.id === q) scored.push({ p, rank: 2 });
    else if (normalize(p.region).includes(q)) scored.push({ p, rank: 3 });
  }

  return scored
    .sort((a, b) => a.rank - b.rank || a.p.name.localeCompare(b.p.name, "it"))
    .slice(0, limit)
    .map((s) => s.p);
}
