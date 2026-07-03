/**
 * Extracts a single province's municipalities from the national ISTAT/openpolis
 * boundary dataset and writes a compact GeoJSON for the game to consume.
 *
 * Source: https://github.com/openpolis/geojson-italy (ODbL). Download the file
 *   geojson/limits_IT_municipalities.geojson to the repo root as
 *   `italy-municipalities.geojson` (see README), then run:  npm run extract-map
 *
 * To add a new map, add an entry to PROVINCES below and re-run.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

/** Provinces to extract. `prov_name` matches the source dataset property. */
const PROVINCES = [
  { id: "cuneo", provName: "Cuneo", outDir: "src/maps/cuneo" },
] as const;

/** Coordinate decimal places to keep. 4 ≈ 11m precision — plenty for a click game. */
const PRECISION = 4;

type Position = [number, number];
type Ring = Position[];
type Polygon = Ring[];
type MultiPolygon = Polygon[];

interface SourceFeature {
  type: "Feature";
  properties: {
    name: string;
    prov_name: string;
    com_istat_code: string;
  };
  geometry:
    | { type: "Polygon"; coordinates: Polygon }
    | { type: "MultiPolygon"; coordinates: MultiPolygon };
}

interface SourceCollection {
  type: "FeatureCollection";
  features: SourceFeature[];
}

const round = (n: number) => Number(n.toFixed(PRECISION));

/** Round a ring's coordinates and drop consecutive duplicate points. */
function simplifyRing(ring: Ring): Ring {
  const out: Ring = [];
  for (const [lng, lat] of ring) {
    const p: Position = [round(lng), round(lat)];
    const prev = out[out.length - 1];
    if (!prev || prev[0] !== p[0] || prev[1] !== p[1]) out.push(p);
  }
  return out;
}

const simplifyPolygon = (poly: Polygon): Polygon =>
  poly.map(simplifyRing).filter((r) => r.length >= 4);

function simplifyGeometry(geom: SourceFeature["geometry"]) {
  if (geom.type === "Polygon") {
    return {
      type: "Polygon" as const,
      coordinates: simplifyPolygon(geom.coordinates),
    };
  }
  return {
    type: "MultiPolygon" as const,
    coordinates: geom.coordinates
      .map(simplifyPolygon)
      .filter((p) => p.length > 0),
  };
}

function main() {
  const srcPath = resolve(ROOT, "italy-municipalities.geojson");
  console.log(`Reading ${srcPath} ...`);
  const src = JSON.parse(readFileSync(srcPath, "utf8")) as SourceCollection;

  for (const province of PROVINCES) {
    const features = src.features
      .filter((f) => f.properties.prov_name === province.provName)
      .map((f) => ({
        type: "Feature" as const,
        properties: {
          name: f.properties.name,
          istat: f.properties.com_istat_code,
        },
        geometry: simplifyGeometry(f.geometry),
      }))
      .sort((a, b) => a.properties.name.localeCompare(b.properties.name, "it"));

    if (features.length === 0) {
      throw new Error(
        `No municipalities found for province "${province.provName}"`,
      );
    }

    const collection = { type: "FeatureCollection" as const, features };
    const outPath = resolve(ROOT, province.outDir, "comuni.json");
    writeFileSync(outPath, JSON.stringify(collection));
    const kb = Math.round(Buffer.byteLength(JSON.stringify(collection)) / 1024);
    console.log(
      `  ${province.id}: ${features.length} comuni -> ${province.outDir}/comuni.json (${kb} KB)`,
    );
  }
}

main();
