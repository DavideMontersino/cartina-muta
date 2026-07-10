/**
 * Bakes rivers / canals / lakes / reservoirs per province from OpenStreetMap
 * (via Overpass) into `src/maps/water/<id>.json` — vector GeoJSON in WGS84
 * lon/lat, so the app projects it with the map's own projection and it aligns
 * to the comuni automatically.
 *
 * Mirrors extract-map conventions: coordinates rounded to PRECISION decimals
 * with consecutive duplicates dropped, and the pure helpers (tag→kind mapping,
 * ring cleaning, ring assembly, element conversion) are split from I/O and
 * unit-tested in extract-water.test.ts.
 *
 *   npm run extract-water          # bake every province
 *   npm run extract-water cn       # bake just one
 *
 * Be gentle to the public Overpass instance: requests are throttled and cached
 * to `.cache/water/` (gitignored) so re-bakes don't re-hit the API.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Position } from "geojson";
import type {
  WaterCollection,
  WaterFeature,
  WaterKind,
} from "../src/maps/types";
import {
  type Bbox,
  collectionBbox,
  ensureWinding,
  simplifyLine,
} from "./lib/geo";

// Re-exported for extract-water.test.ts (the implementation now lives in lib/geo).
export { simplifyLine } from "./lib/geo";

/** Coordinate decimal places — 4 ≈ 11 m, matching extract-map. */
const PRECISION = 4;
/** Douglas-Peucker tolerance (degrees, ~0.0006 ≈ 65 m) — thins dense vertices. */
const SIMPLIFY_TOLERANCE = 0.0006;
/** Pause between provinces (ms) so we don't hammer the public API. */
const THROTTLE_MS = 1500;
/** Include (dense) streams as well as rivers/canals. Off keeps the layer legible. */
const INCLUDE_STREAMS = false;
/** Drop water polygons with fewer than this many points (specks, legibility). */
const MIN_POLYGON_POINTS = 5;

/* Legibility caps — OSM is exhaustive (every irrigation ditch and alpine tarn),
 * so rank by size and keep only the features that read at province zoom. */

/** Minimum river length (degrees, ~0.01 ≈ 1.1 km); named rivers always kept. */
const MIN_RIVER_LEN = 0.012;
/** Minimum canal length; canals are mostly plains irrigation — keep the long/named. */
const MIN_CANAL_LEN = 0.05;
/** Minimum water-body area (deg², ~4e-6 ≈ a 200 m pond). */
const MIN_BODY_AREA = 4e-6;
/** Hard cap on features per province, largest first. */
const MAX_FEATURES = 500;

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const USER_AGENT =
  "cartina-muta/1.0 (+https://github.com/davidemontersino/cartina-muta)";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DATA_DIR = resolve(ROOT, "src/maps/data");
const WATER_DIR = resolve(ROOT, "src/maps/water");
const CACHE_DIR = resolve(ROOT, ".cache/water");

/* ── Pure helpers (unit-tested) ────────────────────────────────────────────*/

/** Map an OSM element's tags to our water kind, or null if it isn't water. */
export function waterKind(tags: Record<string, string>): WaterKind | null {
  const waterway = tags.waterway;
  if (waterway === "river") return "river";
  if (waterway === "canal") return "canal";
  if (waterway === "stream") return INCLUDE_STREAMS ? "stream" : null;
  if (tags.landuse === "reservoir" || tags.water === "reservoir") {
    return "reservoir";
  }
  if (tags.natural === "water") {
    // basin/riverbank etc. render like lakes; treat named reservoirs specially.
    return tags.water === "reservoir" ? "reservoir" : "lake";
  }
  return null;
}

const roundTo = (n: number, places: number) => Number(n.toFixed(places));

/** Round a line/ring's coordinates and drop consecutive duplicate points. */
export function cleanRing(ring: Position[], places = PRECISION): Position[] {
  const out: Position[] = [];
  for (const [lng, lat] of ring) {
    const p: Position = [roundTo(lng, places), roundTo(lat, places)];
    const prev = out[out.length - 1];
    if (!prev || prev[0] !== p[0] || prev[1] !== p[1]) out.push(p);
  }
  return out;
}

const ptKey = (p: Position) => `${p[0]},${p[1]}`;
const isClosed = (r: Position[]) =>
  r.length >= 4 && ptKey(r[0]) === ptKey(r[r.length - 1]);

/**
 * Simplify a closed ring, force clockwise winding (so d3's spherical geoPath
 * fills the interior, not the whole viewport), and re-close it; returns null if
 * it collapses below a valid polygon ring (4 points incl. the closing point).
 */
function simplifyRing(ring: Position[]): Position[] | null {
  const s = ensureWinding(simplifyLine(ring, SIMPLIFY_TOLERANCE), true);
  const closed = ptKey(s[0]) !== ptKey(s[s.length - 1]) ? [...s, s[0]] : s;
  return closed.length >= 4 ? closed : null;
}

/**
 * Stitch a set of way segments (relation members) into closed rings by matching
 * shared endpoints — a light multipolygon assembler for lake/reservoir
 * relations. Segments that can't be closed are dropped.
 */
export function assembleRings(segments: Position[][]): Position[][] {
  const segs = segments.filter((s) => s.length >= 2);
  const used = new Array(segs.length).fill(false);
  const rings: Position[][] = [];

  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    let ring = segs[i].slice();
    let grew = true;
    while (grew && !isClosed(ring)) {
      grew = false;
      const end = ring[ring.length - 1];
      for (let j = 0; j < segs.length; j++) {
        if (used[j]) continue;
        const s = segs[j];
        if (ptKey(s[0]) === ptKey(end)) {
          ring = ring.concat(s.slice(1));
        } else if (ptKey(s[s.length - 1]) === ptKey(end)) {
          ring = ring.concat(s.slice(0, -1).reverse());
        } else {
          continue;
        }
        used[j] = true;
        grew = true;
        break;
      }
    }
    if (isClosed(ring)) rings.push(ring);
  }
  return rings;
}

/** Overpass `out geom` element shapes we care about. */
interface OsmWay {
  type: "way";
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
}
interface OsmRelation {
  type: "relation";
  tags?: Record<string, string>;
  members?: Array<{
    type: string;
    role: string;
    geometry?: Array<{ lat: number; lon: number }>;
  }>;
}
type OsmElement = OsmWay | OsmRelation | { type: string };

const toRing = (g: Array<{ lat: number; lon: number }>): Position[] =>
  g.map((p) => [p.lon, p.lat]);

/**
 * Convert one Overpass element to a water Feature (or null). Ways become
 * LineStrings (open waterways) or Polygons (closed water bodies); water
 * relations become MultiPolygons via {@link assembleRings}.
 */
export function elementToFeature(el: OsmElement): WaterFeature | null {
  const tags = ("tags" in el && el.tags) || {};
  const kind = waterKind(tags);
  if (!kind) return null;
  const name = tags.name;
  const isArea = kind === "lake" || kind === "reservoir";

  if (el.type === "way" && "geometry" in el && el.geometry) {
    const ring = cleanRing(toRing(el.geometry));
    if (isArea) {
      if (!isClosed(ring) || ring.length < MIN_POLYGON_POINTS) return null;
      const simplified = simplifyRing(ring);
      if (!simplified) return null;
      return {
        type: "Feature",
        properties: prune(kind, name),
        geometry: { type: "Polygon", coordinates: [simplified] },
      };
    }
    if (ring.length < 2) return null;
    return {
      type: "Feature",
      properties: prune(kind, name),
      geometry: {
        type: "LineString",
        coordinates: simplifyLine(ring, SIMPLIFY_TOLERANCE),
      },
    };
  }

  if (el.type === "relation" && "members" in el && el.members) {
    const outers = el.members
      .filter((m) => m.type === "way" && m.role !== "inner" && m.geometry)
      // biome-ignore lint/style/noNonNullAssertion: filtered to defined geometry.
      .map((m) => cleanRing(toRing(m.geometry!)));
    const rings = assembleRings(outers)
      .filter((r) => r.length >= MIN_POLYGON_POINTS)
      .map(simplifyRing)
      .filter((r): r is Position[] => r !== null);
    if (!rings.length) return null;
    return {
      type: "Feature",
      properties: prune(kind, name),
      geometry: { type: "MultiPolygon", coordinates: rings.map((r) => [r]) },
    };
  }
  return null;
}

/** Build the properties object, omitting an absent name for compactness. */
function prune(kind: WaterKind, name?: string): WaterFeature["properties"] {
  return name ? { kind, name } : { kind };
}

/** Convert a whole Overpass response into a water FeatureCollection. */
export function elementsToCollection(elements: OsmElement[]): WaterCollection {
  const features: WaterFeature[] = [];
  for (const el of elements) {
    const f = elementToFeature(el);
    if (f) features.push(f);
  }
  return { type: "FeatureCollection", features };
}

/** Sum of segment lengths (degrees) across a line geometry. */
function lineLength(coords: Position[] | Position[][]): number {
  const lines = (
    typeof coords[0]?.[0] === "number" ? [coords] : coords
  ) as Position[][];
  let total = 0;
  for (const line of lines) {
    for (let i = 1; i < line.length; i++) {
      total += Math.hypot(
        line[i][0] - line[i - 1][0],
        line[i][1] - line[i - 1][1],
      );
    }
  }
  return total;
}

/** Absolute shoelace area (deg²) of a single ring. */
function ringArea(ring: Position[]): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return Math.abs(a) / 2;
}

/** Total area (deg²) of a polygon/multipolygon geometry (outer rings only). */
function polygonArea(geom: WaterFeature["geometry"]): number {
  if (geom.type === "Polygon") return ringArea(geom.coordinates[0]);
  if (geom.type === "MultiPolygon") {
    return geom.coordinates.reduce((s, p) => s + ringArea(p[0]), 0);
  }
  return 0;
}

const isLine = (f: WaterFeature) => f.geometry.type.includes("Line");

/** A single comparable "prominence" score used to rank & cap features. */
export function prominence(f: WaterFeature): number {
  if (isLine(f)) {
    return lineLength(f.geometry.coordinates as Position[] | Position[][]);
  }
  return Math.sqrt(polygonArea(f.geometry)) * 4; // perimeter-ish, comparable to length
}

/**
 * Rank features by prominence and keep only those legible at province zoom:
 * long/named rivers, long/named canals, water bodies above a min area — then a
 * hard cap on the total. Pure, so the thresholds are unit-testable.
 */
export function selectFeatures(features: WaterFeature[]): WaterFeature[] {
  const kept = features.filter((f) => {
    if (isLine(f)) {
      const len = lineLength(
        f.geometry.coordinates as Position[] | Position[][],
      );
      const min = f.properties.kind === "canal" ? MIN_CANAL_LEN : MIN_RIVER_LEN;
      return len >= min || Boolean(f.properties.name);
    }
    return polygonArea(f.geometry) >= MIN_BODY_AREA;
  });
  kept.sort((a, b) => prominence(b) - prominence(a));
  return kept.slice(0, MAX_FEATURES);
}

/** Overpass QL for the water within a bbox (`[west, south, east, north]`). */
export function overpassQuery(bbox: Bbox): string {
  const b = `${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]}`; // south,west,north,east
  const waterways = INCLUDE_STREAMS ? "river|canal|stream" : "river|canal";
  return `[out:json][timeout:90];
( way["waterway"~"^(${waterways})$"](${b});
  way["natural"="water"](${b});
  relation["natural"="water"](${b});
  way["landuse"="reservoir"](${b}); );
out geom;`;
}

/* ── I/O ───────────────────────────────────────────────────────────────────*/

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchOverpass(query: string, tries = 4): Promise<OsmElement[]> {
  let delay = 4000;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(OVERPASS_URL, {
        method: "POST",
        headers: {
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { elements: OsmElement[] };
      return json.elements ?? [];
    } catch (err) {
      if (attempt >= tries) throw err;
      await sleep(delay);
      delay *= 2;
    }
  }
}

function provinceBbox(id: string): Bbox {
  const collection = JSON.parse(
    readFileSync(resolve(DATA_DIR, `${id}.json`), "utf8"),
  );
  return collectionBbox(collection.features);
}

async function bakeProvince(id: string): Promise<WaterCollection> {
  const cachePath = resolve(CACHE_DIR, `${id}.json`);
  let elements: OsmElement[];
  if (existsSync(cachePath)) {
    elements = JSON.parse(readFileSync(cachePath, "utf8"));
  } else {
    elements = await fetchOverpass(overpassQuery(provinceBbox(id)));
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(cachePath, JSON.stringify(elements));
    await sleep(THROTTLE_MS);
  }
  const raw = elementsToCollection(elements);
  const collection: WaterCollection = {
    type: "FeatureCollection",
    features: selectFeatures(raw.features),
  };
  mkdirSync(WATER_DIR, { recursive: true });
  writeFileSync(resolve(WATER_DIR, `${id}.json`), JSON.stringify(collection));
  return collection;
}

async function main() {
  const arg = process.argv[2];
  const provinces: string[] = arg
    ? [arg]
    : (
        JSON.parse(
          readFileSync(resolve(ROOT, "src/maps/provinces.json"), "utf8"),
        ) as Array<{ id: string }>
      ).map((p) => p.id);

  for (const id of provinces) {
    process.stdout.write(`water ${id} … `);
    const c = await bakeProvince(id);
    const n = c.features.length;
    const lines = c.features.filter((f) =>
      f.geometry.type.includes("Line"),
    ).length;
    console.log(`${n} features (${lines} waterways, ${n - lines} bodies)`);
  }
  console.log(`Baked ${provinces.length} province(s) → src/maps/water/`);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
