/**
 * Bakes a province's relief as **vector hypsometric contour bands** (not a
 * raster). Fetches the covering Terrarium terrain-RGB DEM tiles, stitches an
 * elevation grid sampled uniformly in Web Mercator, and runs it through
 * `d3-contour` at a set of elevation thresholds to produce nested band polygons
 * written to `src/maps/relief/<id>.json` (WGS84 GeoJSON).
 *
 * Why vector: resolution-independent (crisp at any zoom), tiny, clips cleanly
 * to the province, and the colours live in CSS — retune the palette without a
 * re-bake. The app stacks the bands low→high, tints each by level, and strokes
 * their outlines as contour lines (see components/MapCanvas.tsx).
 *
 * DEM source: AWS Terrain Tiles / Terrarium terrain-RGB (Mapzen), elevation
 * decoded as (R*256 + G + B/256) − 32768. Tiles cached to `.cache/relief-tiles/`.
 *
 *   npm run extract-relief         # bake every province
 *   npm run extract-relief cn      # bake just one
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TUNABLE LOOK & FEEL — edit these and re-bake to restyle the relief. (Colours
 * are CSS, in src/styles/theme.css — only the *shape* of the bands is baked.)
 * ───────────────────────────────────────────────────────────────────────────*/

/**
 * Elevation thresholds (metres) — the lower bound of each hypsometric band.
 * Band `i` covers [THRESHOLDS[i], THRESHOLDS[i+1]); the last band is open-ended.
 * More (or closer) thresholds = finer contour lines. Keep in sync with the
 * `.relief-band--N` colours in theme.css.
 */
const THRESHOLDS = [0, 150, 350, 600, 900, 1300, 1800, 2400, 3000, 3700];
/** Long edge (cells) of the elevation grid fed to d3-contour. */
const GRID_LONG_SIDE = 480;
/** Fraction of the province bbox added on every side (small — bands are clipped
 *  to the province in-app, this just lets edge contours close cleanly). */
const CONTEXT_MARGIN = 0.06;
/** Douglas-Peucker tolerance for band rings (degrees, ~0.0009 ≈ 100 m). */
const SIMPLIFY_TOLERANCE = 0.0009;
/** Slippy zoom of the DEM tiles fetched. z11 ≈ 76 m/px. */
const DEM_ZOOM = 11;

/* ─────────────────────────────────────────────────────────────────────────*/

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import { contours } from "d3-contour";
import type { MultiPolygon, Position } from "geojson";
import type { ReliefBand, ReliefCollection } from "../src/maps/types";
import {
  type Bbox,
  collectionBbox,
  ensureWinding,
  expandBbox,
  latToMercY,
  lonToMercX,
  mercYToLat,
  simplifyLine,
  tileCover,
} from "./lib/geo";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DATA_DIR = resolve(ROOT, "src/maps/data");
const RELIEF_DIR = resolve(ROOT, "src/maps/relief");
const CACHE_DIR = resolve(ROOT, ".cache/relief-tiles");
const TILE_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium";
const USER_AGENT =
  "cartina-muta/1.0 (+https://github.com/davidemontersino/cartina-muta)";
const TILE_SIZE = 256;

/* ── Pure helpers (unit-tested in extract-relief.test.ts) ──────────────────*/

/** Decode a Terrarium terrain-RGB sample to metres of elevation. */
export function decodeElevation(r: number, g: number, b: number): number {
  return r * 256 + g + b / 256 - 32768;
}

/**
 * Map a d3-contour grid coordinate (x in [0,width], y in [0,height], y down) to
 * a WGS84 `[lon, lat]`, given the grid's Web-Mercator bounds. Pure/testable.
 */
export function gridToLonLat(
  gx: number,
  gy: number,
  width: number,
  height: number,
  bbox: Bbox,
): Position {
  const mxW = lonToMercX(bbox[0]);
  const mxE = lonToMercX(bbox[2]);
  const myN = latToMercY(bbox[3]);
  const myS = latToMercY(bbox[1]);
  const lon = (mxW + (gx / width) * (mxE - mxW)) * 360 - 180;
  const lat = mercYToLat(myN + (gy / height) * (myS - myN));
  return [lon, lat];
}

const roundTo = (n: number, p: number) => Number(n.toFixed(p));

/**
 * Turn one d3-contour MultiPolygon (grid space) into a winding-correct,
 * simplified, WGS84 MultiPolygon: each polygon's exterior ring is forced
 * clockwise and its holes counter-clockwise, matching the comuni so d3's
 * spherical geoPath fills the interior (not the whole viewport). Returns null if
 * nothing survives.
 */
export function bandGeometry(
  grid: MultiPolygon,
  width: number,
  height: number,
  bbox: Bbox,
): MultiPolygon | null {
  const polys: Position[][][] = [];
  for (const poly of grid.coordinates) {
    const rings: Position[][] = [];
    for (let r = 0; r < poly.length; r++) {
      const lonlat = poly[r].map((p) =>
        gridToLonLat(p[0], p[1], width, height, bbox),
      );
      const simplified = simplifyLine(lonlat, SIMPLIFY_TOLERANCE).map(
        (p): Position => [roundTo(p[0], 4), roundTo(p[1], 4)],
      );
      if (simplified.length < 4) continue;
      // Exterior (r===0) clockwise; holes counter-clockwise.
      const wound = ensureWinding(simplified, r === 0);
      const [fx, fy] = wound[0];
      const [lx, ly] = wound[wound.length - 1];
      if (fx !== lx || fy !== ly) wound.push([fx, fy]);
      rings.push(wound);
    }
    if (rings.length) polys.push(rings);
  }
  return polys.length ? { type: "MultiPolygon", coordinates: polys } : null;
}

/**
 * Build hypsometric band features from an elevation grid via d3-contour. Band
 * `i` is the region ≥ THRESHOLDS[i]; drawn stacked low→high in the app.
 */
export function buildBands(
  values: number[],
  width: number,
  height: number,
  bbox: Bbox,
  thresholds = THRESHOLDS,
): ReliefBand[] {
  const generate = contours().size([width, height]).thresholds(thresholds);
  const bands: ReliefBand[] = [];
  const rings = generate(values);
  for (let i = 0; i < rings.length; i++) {
    const geometry = bandGeometry(
      rings[i] as MultiPolygon,
      width,
      height,
      bbox,
    );
    if (!geometry) continue;
    bands.push({
      type: "Feature",
      properties: {
        level: i,
        min: thresholds[i],
        max: thresholds[i + 1] ?? null,
      },
      geometry,
    });
  }
  return bands;
}

/** Output grid dimensions for a bbox, long side = `long`, aspect in Mercator. */
export function gridSize(
  bbox: Bbox,
  long = GRID_LONG_SIDE,
): { width: number; height: number } {
  const wx = lonToMercX(bbox[2]) - lonToMercX(bbox[0]);
  const wy = latToMercY(bbox[1]) - latToMercY(bbox[3]);
  if (wx >= wy) {
    return { width: long, height: Math.max(1, Math.round((long * wy) / wx)) };
  }
  return { width: Math.max(1, Math.round((long * wx) / wy)), height: long };
}

/* ── DEM tiles → elevation sampler (I/O) ───────────────────────────────────*/

interface DemTile {
  elev: Float32Array;
}

async function fetchWithRetry(url: string, tries = 4): Promise<Buffer> {
  let delay = 1000;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      if (attempt >= tries) throw err;
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

/** Decode a Terrarium PNG tile's raw pixels to a TILE_SIZE² elevation grid. */
function decodeTile(png: Buffer): Float32Array {
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat: Buffer[] = [];
  while (pos < png.length) {
    const len = png.readUInt32BE(pos);
    const type = png.toString("ascii", pos + 4, pos + 8);
    const data = png.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + len;
  }
  if (bitDepth !== 8) throw new Error(`unexpected bit depth ${bitDepth}`);
  const channels = colorType === 2 ? 3 : colorType === 6 ? 4 : 0;
  if (!channels) throw new Error(`unexpected colour type ${colorType}`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = new Float32Array(width * height);
  const line = new Uint8Array(stride);
  const prev = new Uint8Array(stride);
  let rp = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++];
    for (let x = 0; x < stride; x++) {
      const v = raw[rp++];
      const a = x >= channels ? line[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let recon: number;
      switch (filter) {
        case 0:
          recon = v;
          break;
        case 1:
          recon = v + a;
          break;
        case 2:
          recon = v + b;
          break;
        case 3:
          recon = v + ((a + b) >> 1);
          break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          recon = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default:
          throw new Error(`unknown PNG filter ${filter}`);
      }
      line[x] = recon & 0xff;
    }
    for (let px = 0; px < width; px++) {
      const o = px * channels;
      out[y * width + px] = decodeElevation(line[o], line[o + 1], line[o + 2]);
    }
    prev.set(line);
  }
  return out;
}

async function loadTile(
  z: number,
  x: number,
  y: number,
): Promise<Float32Array> {
  const cachePath = resolve(CACHE_DIR, `${z}_${x}_${y}.png`);
  let png: Buffer;
  if (existsSync(cachePath)) {
    png = readFileSync(cachePath);
  } else {
    png = await fetchWithRetry(`${TILE_URL}/${z}/${x}/${y}.png`);
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(cachePath, png);
  }
  return decodeTile(png);
}

/** Nearest-neighbour elevation lookup across a stitched set of DEM tiles. */
function makeSampler(tiles: Map<string, DemTile>, z: number) {
  const worldPx = 2 ** z * TILE_SIZE;
  return (lon: number, lat: number): number => {
    const gx = Math.max(0, Math.min(worldPx - 1, lonToMercX(lon) * worldPx));
    const gy = Math.max(0, Math.min(worldPx - 1, latToMercY(lat) * worldPx));
    const tx = Math.floor(gx / TILE_SIZE);
    const ty = Math.floor(gy / TILE_SIZE);
    const tile = tiles.get(`${tx},${ty}`);
    if (!tile) return Number.NaN;
    const lx = Math.floor(gx) - tx * TILE_SIZE;
    const ly = Math.floor(gy) - ty * TILE_SIZE;
    return tile.elev[ly * TILE_SIZE + lx];
  };
}

/* ── Bake one province ─────────────────────────────────────────────────────*/

async function bakeProvince(id: string): Promise<ReliefCollection> {
  const dataPath = resolve(DATA_DIR, `${id}.json`);
  if (!existsSync(dataPath)) throw new Error(`no map data for province ${id}`);
  const collection = JSON.parse(readFileSync(dataPath, "utf8"));
  const bbox = expandBbox(collectionBbox(collection.features), CONTEXT_MARGIN);
  const { width, height } = gridSize(bbox);

  // Fetch the covering DEM tiles.
  const cover = tileCover(bbox, DEM_ZOOM);
  const tiles = new Map<string, DemTile>();
  for (let ty = cover.yMin; ty <= cover.yMax; ty++) {
    for (let tx = cover.xMin; tx <= cover.xMax; tx++) {
      tiles.set(`${tx},${ty}`, { elev: await loadTile(DEM_ZOOM, tx, ty) });
    }
  }
  const sample = makeSampler(tiles, DEM_ZOOM);

  // Sample an elevation grid uniformly in Web Mercator (row 0 = north).
  const mxW = lonToMercX(bbox[0]);
  const mxE = lonToMercX(bbox[2]);
  const myN = latToMercY(bbox[3]);
  const myS = latToMercY(bbox[1]);
  const values = new Array<number>(width * height);
  for (let row = 0; row < height; row++) {
    const lat = mercYToLat(myN + ((row + 0.5) / height) * (myS - myN));
    for (let col = 0; col < width; col++) {
      const lon = (mxW + ((col + 0.5) / width) * (mxE - mxW)) * 360 - 180;
      const e = sample(lon, lat);
      // Sea/nodata → 0 so it falls in the lowest band (hidden by the province
      // clip anyway); d3-contour dislikes NaN.
      values[row * width + col] = Number.isFinite(e) && e > 0 ? e : 0;
    }
  }

  const bands = buildBands(values, width, height, bbox);
  const result: ReliefCollection = {
    type: "FeatureCollection",
    features: bands,
  };
  mkdirSync(RELIEF_DIR, { recursive: true });
  writeFileSync(resolve(RELIEF_DIR, `${id}.json`), JSON.stringify(result));
  return result;
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
    process.stdout.write(`relief ${id} … `);
    const r = await bakeProvince(id);
    const kb = Math.round(Buffer.byteLength(JSON.stringify(r)) / 1024);
    console.log(`${r.features.length} bands (${kb} KB)`);
  }
  console.log(`Baked ${provinces.length} province(s) → src/maps/relief/`);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
