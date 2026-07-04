/**
 * Extracts every Italian province's municipalities from the national
 * ISTAT/openpolis boundary dataset into compact per-province GeoJSON files the
 * game loads lazily, plus two small always-loaded artifacts:
 *
 *   - src/maps/provinces.json  — the province index (id, name, region, count).
 *   - src/maps/overview.json   — province boundaries (municipalities dissolved
 *                                per province) for the national picker map.
 *
 * Source: https://github.com/openpolis/geojson-italy (ODbL). Download the file
 *   geojson/limits_IT_municipalities.geojson to the repo root as
 *   `italy-municipalities.geojson` (see README), then run:  npm run extract-map
 *
 * Province ids are the lowercased 2-letter ISTAT acronym (e.g. Cuneo -> "cn").
 *
 * Each comune also gets a `population` (for the energy-run mode's weighted
 * sampling) and a `centroid` (for distance-based scoring). Population is
 * joined from an optional `istat-popolazione.csv` at the repo root — two
 * columns, `istat,population`, header row optional (see CREDIT.md for where
 * to source it). Comuni missing from that file, or if it isn't present at
 * all, fall back to population 1 (weighted sampling then degrades to
 * uniform). Centroids are computed from the (already simplified) geometry —
 * no extra data needed.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { geoCentroid } from "d3-geo";
import { merge } from "topojson-client";
import { topology } from "topojson-server";
import { presimplify, simplify } from "topojson-simplify";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const MAPS_DIR = resolve(ROOT, "src/maps");
const DATA_DIR = resolve(MAPS_DIR, "data");
const POPULATION_CSV_PATH = resolve(ROOT, "istat-popolazione.csv");

/** Coordinate decimal places for per-province maps. 4 ≈ 11m — plenty. */
const PRECISION = 4;
/** Coordinate decimal places for the (already simplified) national overview. */
const OVERVIEW_PRECISION = 4;
/**
 * Topology quantization for the overview merge (grid cells across the whole
 * Italy bbox). Needs to be fine enough that distinct arc vertices along
 * adjacent municipality borders don't snap to the same grid cell — too
 * coarse a grid corrupts the shared topology before it's even simplified,
 * producing self-intersecting rings once dissolved (visible as triangulated
 * bowties on the picker map).
 */
const OVERVIEW_QUANTIZATION = 1e6;
/**
 * Visvalingam-Whyatt effective-area threshold (steradians²) for
 * topojson-simplify. Removing points via topology-aware simplification
 * *before* merging keeps shared borders consistent across provinces — unlike
 * naive per-vertex coordinate rounding, which independently perturbs each
 * ring's points and reliably turns a sweeping dissolved border into a
 * self-intersecting one. Tuned empirically: small enough that no province
 * silhouette visibly degrades at the picker's zoomed-out scale, large enough
 * to keep the file compact.
 */
const OVERVIEW_SIMPLIFY_WEIGHT = 1e-5;

export type Position = [number, number];
export type Ring = Position[];
export type Polygon = Ring[];
export type MultiPolygon = Polygon[];
export type Geometry =
  | { type: "Polygon"; coordinates: Polygon }
  | { type: "MultiPolygon"; coordinates: MultiPolygon };

export interface SourceFeature {
  type: "Feature";
  properties: {
    name: string;
    prov_name: string;
    prov_acr: string;
    reg_name: string;
    com_istat_code: string;
  };
  geometry: Geometry;
}

export interface SourceCollection {
  type: "FeatureCollection";
  features: SourceFeature[];
}

const roundTo = (n: number, places: number) => Number(n.toFixed(places));

/** Round a ring's coordinates and drop consecutive duplicate points. */
function simplifyRing(ring: Ring, places: number): Ring {
  const out: Ring = [];
  for (const [lng, lat] of ring) {
    const p: Position = [roundTo(lng, places), roundTo(lat, places)];
    const prev = out[out.length - 1];
    if (!prev || prev[0] !== p[0] || prev[1] !== p[1]) out.push(p);
  }
  return out;
}

const simplifyPolygon = (poly: Polygon, places: number): Polygon =>
  poly.map((r) => simplifyRing(r, places)).filter((r) => r.length >= 4);

function simplifyGeometry(geom: Geometry, places: number): Geometry {
  if (geom.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: simplifyPolygon(geom.coordinates, places),
    };
  }
  return {
    type: "MultiPolygon",
    coordinates: geom.coordinates
      .map((p) => simplifyPolygon(p, places))
      .filter((p) => p.length > 0),
  };
}

const provinceId = (acr: string) => acr.toLowerCase();
const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, "it");
const kb = (obj: unknown) =>
  Math.round(Buffer.byteLength(JSON.stringify(obj)) / 1024);

interface ProvinceMeta {
  id: string;
  name: string;
  region: string;
  count: number;
}

/**
 * Parses `istat,population` CSV rows (a header row, if present, is skipped —
 * any row whose population column isn't numeric is ignored). Pure, no file
 * I/O, so it's unit-testable.
 */
export function parsePopulationCsv(csv: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const line of csv.split(/\r?\n/)) {
    const [istatRaw, populationRaw] = line.split(",");
    const istat = istatRaw?.trim();
    const population = Number(populationRaw?.trim());
    if (!istat || !Number.isFinite(population)) continue;
    map.set(istat, population);
  }
  return map;
}

/** WGS84 centroid `[lon, lat]` of a Polygon/MultiPolygon geometry. */
export function computeCentroid(geometry: Geometry): Position {
  const [lon, lat] = geoCentroid(geometry);
  return [roundTo(lon, PRECISION), roundTo(lat, PRECISION)];
}

function loadPopulationByIstat(): Map<string, number> {
  if (!existsSync(POPULATION_CSV_PATH)) {
    console.warn(
      `  population: ${POPULATION_CSV_PATH} not found — every comune defaults ` +
        "to population 1 (weighted sampling degrades to uniform). See CREDIT.md.",
    );
    return new Map();
  }
  return parsePopulationCsv(readFileSync(POPULATION_CSV_PATH, "utf8"));
}

function main() {
  const srcPath = resolve(ROOT, "italy-municipalities.geojson");
  console.log(`Reading ${srcPath} ...`);
  const src = JSON.parse(readFileSync(srcPath, "utf8")) as SourceCollection;
  const populationByIstat = loadPopulationByIstat();

  // Group municipalities by province.
  const byProvince = new Map<string, SourceFeature[]>();
  for (const f of src.features) {
    const id = provinceId(f.properties.prov_acr);
    const list = byProvince.get(id);
    if (list) list.push(f);
    else byProvince.set(id, [f]);
  }

  rmSync(DATA_DIR, { recursive: true, force: true });
  mkdirSync(DATA_DIR, { recursive: true });

  const index: ProvinceMeta[] = [];

  for (const [id, group] of byProvince) {
    const { prov_name, reg_name } = group[0].properties;
    const features = group
      .map((f) => {
        const geometry = simplifyGeometry(f.geometry, PRECISION);
        return {
          type: "Feature" as const,
          properties: {
            name: f.properties.name,
            istat: f.properties.com_istat_code,
            population: populationByIstat.get(f.properties.com_istat_code) ?? 1,
            centroid: computeCentroid(geometry),
          },
          geometry,
        };
      })
      .sort((a, b) => byName(a.properties, b.properties));

    const collection = { type: "FeatureCollection" as const, features };
    writeFileSync(resolve(DATA_DIR, `${id}.json`), JSON.stringify(collection));
    index.push({
      id,
      name: prov_name,
      region: reg_name,
      count: features.length,
    });
  }

  index.sort(byName);
  writeFileSync(
    resolve(MAPS_DIR, "provinces.json"),
    JSON.stringify(index, null, 2),
  );

  // National overview: dissolve municipalities into one shape per province.
  buildOverview(src, provinceId);

  const totalComuni = index.reduce((n, p) => n + p.count, 0);
  console.log(
    `Extracted ${index.length} provinces, ${totalComuni} comuni -> src/maps/data/*.json`,
  );
}

interface OverviewFeature {
  type: "Feature";
  properties: { id: string; name: string };
  geometry: Geometry;
}

/**
 * Merge each province's municipality polygons into a single boundary via a
 * shared topology (so internal borders dissolve cleanly), simplifying the
 * topology first so the merge stays a valid, non-self-intersecting polygon.
 * Pure (no file I/O) so it's unit-testable; `buildOverview` below writes the
 * result for the real dataset.
 */
export function computeOverviewFeatures(
  src: SourceCollection,
  provinceId: (acr: string) => string,
): OverviewFeature[] {
  const inputFeatures = src.features.map((f) => ({
    type: "Feature" as const,
    properties: {
      pid: provinceId(f.properties.prov_acr),
      name: f.properties.prov_name,
    },
    geometry: f.geometry,
  }));

  let topo = topology(
    // biome-ignore lint/suspicious/noExplicitAny: topojson types don't cover raw FeatureCollection input.
    { munis: { type: "FeatureCollection", features: inputFeatures } as any },
    OVERVIEW_QUANTIZATION,
    // biome-ignore lint/suspicious/noExplicitAny: topojson types are loose here.
  ) as any;
  topo = simplify(presimplify(topo), OVERVIEW_SIMPLIFY_WEIGHT);

  const geoms = topo.objects.munis.geometries as Array<{
    properties: { pid: string; name: string };
  }>;
  const groups = new Map<string, typeof geoms>();
  for (const g of geoms) {
    const list = groups.get(g.properties.pid);
    if (list) list.push(g);
    else groups.set(g.properties.pid, [g]);
  }

  const features = [...groups.entries()]
    .map(([pid, gs]) => {
      const geometry = simplifyGeometry(
        // biome-ignore lint/suspicious/noExplicitAny: merge returns a GeoJSON geometry.
        merge(topo, gs as any) as Geometry,
        OVERVIEW_PRECISION,
      );
      return {
        type: "Feature" as const,
        properties: { id: pid, name: gs[0].properties.name },
        geometry,
      };
    })
    .sort((a, b) => byName(a.properties, b.properties));

  return features;
}

/** Compute the overview and write it to `src/maps/overview.json`. */
function buildOverview(
  src: SourceCollection,
  provinceId: (acr: string) => string,
) {
  const features = computeOverviewFeatures(src, provinceId);
  const overview = { type: "FeatureCollection" as const, features };
  writeFileSync(resolve(MAPS_DIR, "overview.json"), JSON.stringify(overview));
  console.log(`  overview: ${features.length} provinces (${kb(overview)} KB)`);
}

// Only run the extraction when executed directly (not when imported by tests).
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main();
}
