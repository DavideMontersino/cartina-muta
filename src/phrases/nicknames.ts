import { PROVINCES } from "../maps/registry";

/** Province name (e.g. "Imperia") -> its region (e.g. "Liguria"). */
const regionByProvinceName: Record<string, string> = Object.fromEntries(
  PROVINCES.map((p) => [p.name, p.region]),
);

/**
 * Slightly-insulting nicknames for the lands around a played province, shown on
 * the map in place of the real neighbour/country label. Keyed by the exact
 * label text (a province name, a region name, or a country name). A province
 * label with no nickname of its own falls back to its region's nickname — so
 * "Liguria" covers Imperia, Savona, Genova and La Spezia at once.
 *
 * Keep it affectionate campanilismo, not actual slurs.
 */
const nicknames: Record<string, string> = {
  // Regions (apply to every neighbouring province in them, via region fallback)
  Liguria: "Terra dei tirchi",
  Lombardia: "Quelli col risotto giallo",
  "Valle d'Aosta": "I montanari col bilinguismo",
  // Countries
  Francia: "I cugini boriosi",
  Svizzera: "Quelli dei conti in banca",
};

/**
 * The nickname to show for a neighbour label, or null to keep the real name.
 * Resolution: the exact label name → (for a province) its region → null.
 */
export function nicknameFor(name: string): string | null {
  if (name in nicknames) return nicknames[name];
  const region = regionByProvinceName[name];
  if (region && region in nicknames) return nicknames[region];
  return null;
}
