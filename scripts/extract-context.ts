/**
 * Bakes the geographic *context* around each province into
 * `src/maps/context/<id>.json`: neighbouring Italian provinces (dissolved — no
 * comuni borders), adjacent foreign countries, and outside-only labels
 * (neighbour / country / sea names). Everything is clipped to the same
 * margin-expanded bbox the relief raster uses, so the province never floats in
 * a void, and — crucially for a blind-map game — **no label ever lands inside
 * the target province.**
 *
 * Sources (all reachable without OSM/DEM egress):
 *   - Neighbours: src/maps/overview.json (already in-repo).
 *   - Countries:  Natural Earth ne_10m_admin_0_countries (GitHub raw).
 *   - Sea names:  Natural Earth ne_10m_geography_marine_polys (GitHub raw).
 *
 *   npm run extract-context        # bake every province
 *   npm run extract-context cn     # bake just one
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { MultiPolygon, Polygon, Position } from "geojson";
import type {
  ContextCollection,
  ContextLabel,
  ContextShape,
} from "../src/maps/types";
import {
  type Bbox,
  clipRingToBbox,
  collectionBbox,
  ensureWinding,
  expandBbox,
  pointInRing,
  ringCentroid,
  simplifyLine,
} from "./lib/geo";

/** Margin added around the province bbox — matches extract-relief. */
const CONTEXT_MARGIN = 0.18;
/** Coordinate decimal places — context is a coarse backdrop, 3 ≈ 110 m. */
const PRECISION = 3;
/** Douglas-Peucker tolerance for context outlines (degrees, ~0.0015 ≈ 165 m). */
const SIMPLIFY_TOLERANCE = 0.0015;
/** Grid resolution when probing which seas touch the bbox. */
const SEA_PROBE = 64;

const NE_BASE =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson";
const USER_AGENT =
  "cartina-muta/1.0 (+https://github.com/davidemontersino/cartina-muta)";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const MAPS_DIR = resolve(ROOT, "src/maps");
const DATA_DIR = resolve(MAPS_DIR, "data");
const CONTEXT_DIR = resolve(MAPS_DIR, "context");
const CACHE_DIR = resolve(ROOT, ".cache/natural-earth");

type Ring = Position[];

/* ── Pure helpers (unit-tested) ────────────────────────────────────────────*/

const roundTo = (n: number, p: number) => Number(n.toFixed(p));

/** Outer rings of a Polygon/MultiPolygon (holes dropped — context is a backdrop). */
export function outerRings(geom: Polygon | MultiPolygon): Ring[] {
  if (geom.type === "Polygon") return [geom.coordinates[0]];
  return geom.coordinates.map((p) => p[0]);
}

/**
 * Clip a geometry's outer rings to the bbox, simplify + round each, and drop
 * rings that collapse. Returns the kept rings (each a valid closed ring).
 */
export function clipAndSimplify(
  geom: Polygon | MultiPolygon,
  bbox: Bbox,
): Ring[] {
  const out: Ring[] = [];
  for (const ring of outerRings(geom)) {
    const clipped = clipRingToBbox(ring as Ring, bbox);
    if (clipped.length < 3) continue;
    // Clockwise winding so d3's spherical geoPath fills the interior, not the
    // whole viewport (matches the comuni convention).
    const simplified = ensureWinding(
      simplifyLine(clipped, SIMPLIFY_TOLERANCE),
      true,
    ).map(([x, y]): Position => [roundTo(x, PRECISION), roundTo(y, PRECISION)]);
    if (simplified.length < 3) continue;
    // Re-close the ring.
    const [fx, fy] = simplified[0];
    const [lx, ly] = simplified[simplified.length - 1];
    if (fx !== lx || fy !== ly) simplified.push([fx, fy]);
    if (simplified.length >= 4) out.push(simplified);
  }
  return out;
}

/** True if a point falls inside any of the target province's outer rings. */
export function inRings(pt: Position, rings: Ring[]): boolean {
  return rings.some((r) => pointInRing(pt, r));
}

/** Pick the largest ring's centroid as a label anchor, if outside the target. */
export function labelAnchor(
  rings: Ring[],
  targetRings: Ring[],
): [number, number] | null {
  let best: Ring | null = null;
  let bestArea = 0;
  for (const r of rings) {
    let a = 0;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      a += r[j][0] * r[i][1] - r[i][0] * r[j][1];
    }
    a = Math.abs(a);
    if (a > bestArea) {
      bestArea = a;
      best = r;
    }
  }
  if (!best) return null;
  const c = ringCentroid(best);
  if (!c || inRings(c, targetRings)) return null;
  return [roundTo(c[0], PRECISION), roundTo(c[1], PRECISION)];
}

/* ── I/O ───────────────────────────────────────────────────────────────────*/

interface NeFeature {
  properties: Record<string, string>;
  geometry: Polygon | MultiPolygon;
}

async function loadNaturalEarth(file: string): Promise<NeFeature[]> {
  const cachePath = resolve(CACHE_DIR, file);
  if (!existsSync(cachePath)) {
    const res = await fetch(`${NE_BASE}/${file}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${file}`);
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(cachePath, Buffer.from(await res.arrayBuffer()));
  }
  return JSON.parse(readFileSync(cachePath, "utf8")).features as NeFeature[];
}

function provinceDataBbox(id: string): Bbox {
  const c = JSON.parse(readFileSync(resolve(DATA_DIR, `${id}.json`), "utf8"));
  return collectionBbox(c.features);
}

/**
 * Seas touching the province bbox → a clipped fill shape + a label anchored on
 * open water. A sea is "present" if any bbox probe point (outside the target)
 * falls inside it — this correctly ignores far-away oceans whose bounding box
 * wraps the globe, and clips the sea to the bbox for the fill.
 */
function seaContext(
  seas: NeFeature[],
  bbox: Bbox,
  targetRings: Ring[],
): { shapes: ContextShape[]; labels: ContextLabel[] } {
  const [w, s, e, n] = bbox;
  const anchor = new Map<string, [number, number]>();
  const present = new Map<string, NeFeature>();
  for (let iy = 0; iy <= SEA_PROBE; iy++) {
    for (let ix = 0; ix <= SEA_PROBE; ix++) {
      const pt: Position = [
        w + ((e - w) * ix) / SEA_PROBE,
        s + ((n - s) * iy) / SEA_PROBE,
      ];
      if (inRings(pt, targetRings)) continue;
      for (const sea of seas) {
        const raw = sea.properties.name_it || sea.properties.name;
        if (!raw) continue;
        const name = raw.charAt(0).toUpperCase() + raw.slice(1);
        if (anchor.has(name)) continue;
        if (outerRings(sea.geometry).some((r) => pointInRing(pt, r))) {
          anchor.set(name, [
            roundTo(pt[0], PRECISION),
            roundTo(pt[1], PRECISION),
          ]);
          present.set(name, sea);
        }
      }
    }
  }

  const shapes: ContextShape[] = [];
  for (const [name, sea] of present) {
    const rings = clipAndSimplify(sea.geometry, bbox);
    if (rings.length) {
      shapes.push({
        type: "Feature",
        properties: { kind: "sea", name },
        geometry: { type: "MultiPolygon", coordinates: rings.map((r) => [r]) },
      });
    }
  }
  const labels: ContextLabel[] = [...anchor.entries()].map(([name, at]) => ({
    name,
    kind: "sea",
    at,
  }));
  return { shapes, labels };
}

async function bakeProvince(
  id: string,
  overview: NeFeature[],
  countries: NeFeature[],
  seas: NeFeature[],
): Promise<ContextCollection> {
  const bbox = expandBbox(provinceDataBbox(id), CONTEXT_MARGIN);
  const target = overview.find((f) => f.properties.id === id);
  if (!target) throw new Error(`no overview feature for ${id}`);
  const targetRings = outerRings(target.geometry);

  const features: ContextShape[] = [];
  const labels: ContextLabel[] = [];

  // Neighbouring provinces (everything but the target that survives the clip).
  for (const f of overview) {
    if (f.properties.id === id) continue;
    const rings = clipAndSimplify(f.geometry, bbox);
    if (!rings.length) continue;
    features.push({
      type: "Feature",
      properties: { kind: "province", name: f.properties.name },
      geometry: { type: "MultiPolygon", coordinates: rings.map((r) => [r]) },
    });
    const at = labelAnchor(rings, targetRings);
    if (at) labels.push({ name: f.properties.name, kind: "province", at });
  }

  // Adjacent foreign countries.
  for (const c of countries) {
    if ((c.properties.NAME || c.properties.ADMIN) === "Italy") continue;
    const rings = clipAndSimplify(c.geometry, bbox);
    if (!rings.length) continue;
    const name =
      c.properties.NAME_IT || c.properties.NAME || c.properties.ADMIN;
    features.push({
      type: "Feature",
      properties: { kind: "country", name },
      geometry: { type: "MultiPolygon", coordinates: rings.map((r) => [r]) },
    });
    const at = labelAnchor(rings, targetRings);
    if (at) labels.push({ name, kind: "country", at });
  }

  const sea = seaContext(seas, bbox, targetRings);
  // Sea shapes first so they render beneath the land context.
  features.unshift(...sea.shapes);
  labels.push(...sea.labels);

  const collection: ContextCollection = {
    type: "FeatureCollection",
    features,
    labels,
  };
  mkdirSync(CONTEXT_DIR, { recursive: true });
  writeFileSync(resolve(CONTEXT_DIR, `${id}.json`), JSON.stringify(collection));
  return collection;
}

async function main() {
  const arg = process.argv[2];
  const overview = JSON.parse(
    readFileSync(resolve(MAPS_DIR, "overview.json"), "utf8"),
  ).features as NeFeature[];
  const countries = await loadNaturalEarth("ne_10m_admin_0_countries.geojson");
  const seas = await loadNaturalEarth("ne_10m_geography_marine_polys.geojson");

  const provinces: string[] = arg
    ? [arg]
    : (
        JSON.parse(
          readFileSync(resolve(MAPS_DIR, "provinces.json"), "utf8"),
        ) as Array<{ id: string }>
      ).map((p) => p.id);

  for (const id of provinces) {
    process.stdout.write(`context ${id} … `);
    const c = await bakeProvince(id, overview, countries, seas);
    console.log(
      `${c.features.length} shapes, ${c.labels.length} labels ` +
        `(${c.labels.map((l) => l.name).join(", ")})`,
    );
  }
  console.log(`Baked ${provinces.length} province(s) → src/maps/context/`);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
