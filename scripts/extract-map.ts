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
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { merge } from "topojson-client";
import { topology } from "topojson-server";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const MAPS_DIR = resolve(ROOT, "src/maps");
const DATA_DIR = resolve(MAPS_DIR, "data");

/** Coordinate decimal places for per-province maps. 4 ≈ 11m — plenty. */
const PRECISION = 4;
/** Coarser rounding for the zoomed-out national overview. 2 ≈ 1.1km (~1px). */
const OVERVIEW_PRECISION = 2;
/** Topology quantization for the overview merge (grid cells across the bbox). */
const OVERVIEW_QUANTIZATION = 2000;

type Position = [number, number];
type Ring = Position[];
type Polygon = Ring[];
type MultiPolygon = Polygon[];
type Geometry =
  | { type: "Polygon"; coordinates: Polygon }
  | { type: "MultiPolygon"; coordinates: MultiPolygon };

interface SourceFeature {
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

interface SourceCollection {
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

function main() {
  const srcPath = resolve(ROOT, "italy-municipalities.geojson");
  console.log(`Reading ${srcPath} ...`);
  const src = JSON.parse(readFileSync(srcPath, "utf8")) as SourceCollection;

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
      .map((f) => ({
        type: "Feature" as const,
        properties: {
          name: f.properties.name,
          istat: f.properties.com_istat_code,
        },
        geometry: simplifyGeometry(f.geometry, PRECISION),
      }))
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

/**
 * Merge each province's municipality polygons into a single boundary via a
 * shared topology (so internal borders dissolve cleanly), then write a compact
 * FeatureCollection for the picker map.
 */
function buildOverview(
  src: SourceCollection,
  provinceId: (acr: string) => string,
) {
  const inputFeatures = src.features.map((f) => ({
    type: "Feature" as const,
    properties: {
      pid: provinceId(f.properties.prov_acr),
      name: f.properties.prov_name,
    },
    geometry: f.geometry,
  }));

  const topo = topology(
    // biome-ignore lint/suspicious/noExplicitAny: topojson types don't cover raw FeatureCollection input.
    { munis: { type: "FeatureCollection", features: inputFeatures } as any },
    OVERVIEW_QUANTIZATION,
    // biome-ignore lint/suspicious/noExplicitAny: topojson types are loose here.
  ) as any;

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

  const overview = { type: "FeatureCollection" as const, features };
  writeFileSync(resolve(MAPS_DIR, "overview.json"), JSON.stringify(overview));
  console.log(`  overview: ${features.length} provinces (${kb(overview)} KB)`);
}

main();
