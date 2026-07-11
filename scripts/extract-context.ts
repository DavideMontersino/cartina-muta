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
import polygonClipping from "polygon-clipping";

// polygon-clipping's variadic tuple types don't accept a spread of Position[][][];
// wrap with plain rest-param signatures.
const union = polygonClipping.union as unknown as (
  ...geoms: Position[][][][]
) => Position[][][];
const difference = polygonClipping.difference as unknown as (
  subject: Position[][][],
  ...clips: Position[][][][]
) => Position[][][];

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

/** Margin added around the province bbox. Generous so the backdrop overflows
 *  the viewBox on every side — no straight bbox edge shows at the default fit. */
const CONTEXT_MARGIN = 0.4;
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

/** Centroid of the largest (by area) ring in a set, or null if rings is empty. */
export function largestRingCentroid(rings: Ring[]): [number, number] | null {
  let best: Ring | null = null;
  let bestArea = 0;
  for (const r of rings) {
    let a = 0;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      a += r[j][0] * r[i][1] - r[i][0] * r[j][1];
    }
    if (Math.abs(a) > bestArea) {
      bestArea = Math.abs(a);
      best = r;
    }
  }
  if (!best) return null;
  const c = ringCentroid(best);
  return c ? [c[0], c[1]] : null;
}

/** Pick the largest ring's centroid as a label anchor, if outside the target. */
export function labelAnchor(
  rings: Ring[],
  targetRings: Ring[],
): [number, number] | null {
  const c = largestRingCentroid(rings);
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

/** Clip a geometry's outer rings to the bbox as a polygon-clipping MultiPolygon. */
function toClippedMp(geom: Polygon | MultiPolygon, bbox: Bbox): Position[][][] {
  const polys: Position[][][] = [];
  for (const ring of outerRings(geom)) {
    const clipped = clipRingToBbox(ring as Ring, bbox);
    if (clipped.length >= 3) polys.push([clipped]);
  }
  return polys;
}

/** Wind (exterior CW, holes CCW), simplify + round a polygon-clipping result. */
function toWoundGeometry(mp: Position[][][]): MultiPolygon | null {
  const out: Position[][][] = [];
  for (const poly of mp) {
    const rings: Position[][] = [];
    for (let r = 0; r < poly.length; r++) {
      const wound = ensureWinding(
        simplifyLine(poly[r], SIMPLIFY_TOLERANCE),
        r === 0,
      ).map(
        (p): Position => [roundTo(p[0], PRECISION), roundTo(p[1], PRECISION)],
      );
      if (wound.length < 3) continue;
      const [fx, fy] = wound[0];
      const [lx, ly] = wound[wound.length - 1];
      if (fx !== lx || fy !== ly) wound.push([fx, fy]);
      if (wound.length >= 4) rings.push(wound);
    }
    if (rings.length) out.push(rings);
  }
  return out.length ? { type: "MultiPolygon", coordinates: out } : null;
}

/**
 * The sea around the province: one merged fill shape plus a label per named sea.
 *
 * The fill is the Natural-Earth sea **minus the Italian landmass** (the union of
 * all openpolis provinces): subtracting the land makes the sea abut the exact
 * openpolis coastline, so there is a single coastline (no second edge from NE)
 * and no need to cover an overreaching sea with opaque land. A sea is "present"
 * if any bbox probe point (outside the target) falls inside it — which ignores
 * far-away oceans whose bbox wraps the globe.
 */
function seaContext(
  overview: NeFeature[],
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

  const labels: ContextLabel[] = [...anchor.entries()].map(([name, at]) => ({
    name,
    kind: "sea",
    at,
  }));
  if (!present.size) return { shapes: [], labels };

  const seaParts = [...present.values()]
    .map((sea) => toClippedMp(sea.geometry, bbox))
    .filter((mp) => mp.length);
  const landParts = overview
    .map((f) => toClippedMp(f.geometry, bbox))
    .filter((mp) => mp.length);
  if (!seaParts.length) return { shapes: [], labels };

  const seaUnion = union(...seaParts);
  const land = landParts.length ? union(...landParts) : [];
  const merged = land.length ? difference(seaUnion, land) : seaUnion;

  const geometry = toWoundGeometry(merged);
  const shapes: ContextShape[] = geometry
    ? [{ type: "Feature", properties: { kind: "sea", name: "Mare" }, geometry }]
    : [];
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
  // Centroid of the target province — used to nudge neighbour labels away from
  // the clip bbox edge so they don't land under the canvas clip boundary.
  const targetCentroid = largestRingCentroid(targetRings);
  const bboxW = bbox[2] - bbox[0];
  const bboxH = bbox[3] - bbox[1];
  // Fraction of bbox size that defines the "near edge" danger zone.
  // 0.15 ≈ just inside the CONTEXT_MARGIN band that was added around the province.
  const EDGE_FRAC = 0.15;
  const NUDGE = 0.4;

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
    let at = labelAnchor(rings, targetRings);
    if (at && targetCentroid) {
      const [lon, lat] = at;
      const nearEdge =
        lon < bbox[0] + bboxW * EDGE_FRAC ||
        lon > bbox[2] - bboxW * EDGE_FRAC ||
        lat < bbox[1] + bboxH * EDGE_FRAC ||
        lat > bbox[3] - bboxH * EDGE_FRAC;
      if (nearEdge) {
        const nudged: [number, number] = [
          roundTo(lon + NUDGE * (targetCentroid[0] - lon), PRECISION),
          roundTo(lat + NUDGE * (targetCentroid[1] - lat), PRECISION),
        ];
        // Only apply if the nudged point stays outside the target province.
        if (!inRings(nudged, targetRings)) at = nudged;
      }
    }
    if (at) labels.push({ name: f.properties.name, kind: "province", at });
  }

  // Adjacent foreign countries — LABEL ONLY, no shape. A country polygon comes
  // from a different dataset than the Italian provinces, so filling/outlining it
  // would double the France–Italy border and leave gaps. The frontier is drawn
  // once, from the Italian provinces' own edges; France is just a name on paper.
  for (const c of countries) {
    if ((c.properties.NAME || c.properties.ADMIN) === "Italy") continue;
    const rings = clipAndSimplify(c.geometry, bbox);
    if (!rings.length) continue;
    const name =
      c.properties.NAME_IT || c.properties.NAME || c.properties.ADMIN;
    const at = labelAnchor(rings, targetRings);
    if (at) labels.push({ name, kind: "country", at });
  }

  const sea = seaContext(overview, seas, bbox, targetRings);
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
  // Optional province ids to bake (one or more); no args → every province.
  const args = process.argv.slice(2);
  const overview = JSON.parse(
    readFileSync(resolve(MAPS_DIR, "overview.json"), "utf8"),
  ).features as NeFeature[];
  const countries = await loadNaturalEarth("ne_10m_admin_0_countries.geojson");
  const seas = await loadNaturalEarth("ne_10m_geography_marine_polys.geojson");

  const provinces: string[] = args.length
    ? args
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
