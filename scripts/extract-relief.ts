/**
 * Bakes a self-made, theme-tinted shaded-relief raster per province.
 *
 * Pipeline: fetch the covering Terrarium terrain-RGB DEM tiles for the
 * province bbox (+ context margin), stitch them into an elevation grid sampled
 * uniformly in Web Mercator, compute a Horn hillshade, tint by a hypsometric
 * colour ramp keyed to the game's parchment palette, and write one PNG per
 * province to `src/maps/relief/<id>.png` plus a sibling `<id>.json` holding the
 * image's WGS84 bounds so the app can place it under the comuni.
 *
 * Because the image is generated in Web Mercator (the app projects with
 * d3.geoMercator), a lon/lat rectangle maps to an axis-aligned rectangle in the
 * projected plane — so the app places it by projecting just the NW/SE corners.
 *
 * DEM source: AWS Terrain Tiles / Terrarium terrain-RGB (Mapzen), elevation
 * decoded as (R*256 + G + B/256) − 32768 — no GDAL needed. Cached to
 * `.cache/relief-tiles/` (gitignored) so re-bakes are cheap.
 *
 *   npm run extract-relief         # bake every province
 *   npm run extract-relief cn      # bake just one (fast iteration)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TUNABLE LOOK & FEEL — edit these and re-bake to restyle the relief.
 * ───────────────────────────────────────────────────────────────────────────*/

/** Sun position for the hillshade, degrees. Azimuth 315° = classic NW light. */
const SUN_AZIMUTH_DEG = 315;
const SUN_ALTITUDE_DEG = 45;
/** Vertical exaggeration applied to slopes before shading. */
const Z_FACTOR = 1.3;
/**
 * How hard the hillshade darkens/lightens the tint. 0 = flat colour (no
 * relief), 1 = full multiply. The shade is centred on mid-grey so lit slopes
 * brighten and shadowed slopes darken the hypsometric colour.
 */
const HILLSHADE_STRENGTH = 0.85;
/** Long edge of the output image, px. Short edge follows the bbox aspect. */
const OUTPUT_LONG_SIDE = 1024;
/** Fraction of the province bbox added on every side for surrounding context. */
const CONTEXT_MARGIN = 0.18;
/** Slippy zoom of the DEM tiles fetched. z11 ≈ 76 m/px — plenty for a province. */
const DEM_ZOOM = 11;

/** In-theme pale sea/water tint for elevation ≤ 0 and nodata. */
const SEA_COLOR: Rgb = [176, 201, 197];

/**
 * Hypsometric colour ramp, tinted to the parchment palette: muted greens in
 * the valleys → tans → browns → pale peaks. Stops are `[elevation_m, [r,g,b]]`,
 * ascending; between stops the colour is linearly interpolated.
 */
const HYPSOMETRIC_RAMP: Array<[number, Rgb]> = [
  [0, [143, 157, 99]], // lowland — muted olive green
  [250, [170, 172, 110]], // low hills
  [600, [193, 178, 120]], // foothills — olive tan
  [1100, [198, 168, 112]], // tan
  [1800, [180, 143, 100]], // brown
  [2600, [151, 122, 93]], // dark brown
  [3400, [199, 182, 151]], // high — pale brown
  [4200, [236, 229, 210]], // peaks — pale parchment
];

/* ─────────────────────────────────────────────────────────────────────────*/

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import {
  type Bbox,
  collectionBbox,
  expandBbox,
  latToMercY,
  lonToMercX,
  mercYToLat,
  tileCover,
} from "./lib/geo";
import { encodePng } from "./lib/png";

export type Rgb = [number, number, number];

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

/** Linear interpolation between two colours. */
function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

/** Map an elevation (metres) to a hypsometric colour via the ramp. */
export function hypsometricColor(
  elev: number,
  ramp: Array<[number, Rgb]> = HYPSOMETRIC_RAMP,
): Rgb {
  if (elev <= ramp[0][0]) return ramp[0][1];
  const last = ramp[ramp.length - 1];
  if (elev >= last[0]) return last[1];
  for (let i = 1; i < ramp.length; i++) {
    if (elev <= ramp[i][0]) {
      const [e0, c0] = ramp[i - 1];
      const [e1, c1] = ramp[i];
      return mixRgb(c0, c1, (elev - e0) / (e1 - e0));
    }
  }
  return last[1];
}

/**
 * Horn hillshade at grid cell (col, row): illumination in [0,1] from the sun.
 * `dx`/`dy` are the ground spacing (metres) between adjacent cells; edges clamp
 * to the border. Returns the standard cos-of-incidence term, floored at 0.
 */
export function hillshade(
  grid: Float32Array,
  width: number,
  height: number,
  col: number,
  row: number,
  dx: number,
  dy: number,
  azimuthDeg = SUN_AZIMUTH_DEG,
  altitudeDeg = SUN_ALTITUDE_DEG,
  zFactor = Z_FACTOR,
): number {
  const cx = Math.max(0, Math.min(width - 1, col));
  const cy = Math.max(0, Math.min(height - 1, row));
  const at = (c: number, r: number) => {
    const ci = Math.max(0, Math.min(width - 1, c));
    const ri = Math.max(0, Math.min(height - 1, r));
    return grid[ri * width + ci];
  };
  const x = cx;
  const y = cy;
  // 3×3 window (a b c / d e f / g h i).
  const a = at(x - 1, y - 1);
  const b = at(x, y - 1);
  const c = at(x + 1, y - 1);
  const d = at(x - 1, y);
  const f = at(x + 1, y);
  const g = at(x - 1, y + 1);
  const h = at(x, y + 1);
  const i = at(x + 1, y + 1);

  const dzdx = (c + 2 * f + i - (a + 2 * d + g)) / (8 * dx);
  const dzdy = (g + 2 * h + i - (a + 2 * b + c)) / (8 * dy);

  const zenith = ((90 - altitudeDeg) * Math.PI) / 180;
  const azimuth = ((360 - azimuthDeg + 90) * Math.PI) / 180;
  const slope = Math.atan(zFactor * Math.hypot(dzdx, dzdy));
  let aspect = Math.atan2(dzdy, -dzdx);
  if (aspect < 0) aspect += 2 * Math.PI;

  const shade =
    Math.cos(zenith) * Math.cos(slope) +
    Math.sin(zenith) * Math.sin(slope) * Math.cos(azimuth - aspect);
  return Math.max(0, shade);
}

/**
 * Compose an elevation and its hillshade into a final in-theme colour: sea/
 * nodata gets the flat sea tint; land is the hypsometric colour multiplied by
 * the hillshade (centred so lit slopes brighten, shadows darken).
 */
export function shadeColor(elev: number, shade: number): Rgb {
  if (!Number.isFinite(elev) || elev <= 0) return SEA_COLOR;
  const base = hypsometricColor(elev);
  // Centre the shade on 0.5 so mid-slopes keep the true colour.
  const factor = 1 + HILLSHADE_STRENGTH * (shade - 0.5) * 2;
  return [
    Math.max(0, Math.min(255, base[0] * factor)),
    Math.max(0, Math.min(255, base[1] * factor)),
    Math.max(0, Math.min(255, base[2] * factor)),
  ];
}

/** Output pixel dimensions for a bbox, long side = `long`, aspect in Mercator. */
export function outputSize(
  bbox: Bbox,
  long = OUTPUT_LONG_SIDE,
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
  x: number;
  y: number;
  /** Decoded elevations, row-major, TILE_SIZE×TILE_SIZE. */
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
  // Inflate IDAT with the built-in zlib, then undo the per-row PNG filters.
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
    // Nearest-neighbour is ample: z11 DEM (~76 m/px) is finer than the ~1024px
    // province image, so the output already downsamples the elevation grid.
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

async function bakeProvince(id: string): Promise<number> {
  const dataPath = resolve(DATA_DIR, `${id}.json`);
  if (!existsSync(dataPath)) throw new Error(`no map data for province ${id}`);
  const collection = JSON.parse(readFileSync(dataPath, "utf8"));
  const bbox = expandBbox(collectionBbox(collection.features), CONTEXT_MARGIN);
  const { width, height } = outputSize(bbox);

  // Fetch the covering DEM tiles.
  const cover = tileCover(bbox, DEM_ZOOM);
  const tiles = new Map<string, DemTile>();
  for (let ty = cover.yMin; ty <= cover.yMax; ty++) {
    for (let tx = cover.xMin; tx <= cover.xMax; tx++) {
      const elev = await loadTile(DEM_ZOOM, tx, ty);
      tiles.set(`${tx},${ty}`, { x: tx, y: ty, elev });
    }
  }
  const sample = makeSampler(tiles, DEM_ZOOM);

  // Sample an elevation grid uniformly in Web Mercator (so linear placement
  // between the projected NW/SE corners is exact).
  const mxW = lonToMercX(bbox[0]);
  const mxE = lonToMercX(bbox[2]);
  const myN = latToMercY(bbox[3]);
  const myS = latToMercY(bbox[1]);
  const elevGrid = new Float32Array(width * height);
  for (let row = 0; row < height; row++) {
    const my = myN + ((row + 0.5) / height) * (myS - myN);
    const lat = mercYToLat(my);
    for (let col = 0; col < width; col++) {
      const mx = mxW + ((col + 0.5) / width) * (mxE - mxW);
      const lon = mx * 360 - 180;
      elevGrid[row * width + col] = sample(lon, lat);
    }
  }

  // Ground spacing (metres) between output cells at the bbox centre latitude.
  const latMid = (bbox[1] + bbox[3]) / 2;
  const metresPerDegLat = 110540;
  const metresPerDegLon = 111320 * Math.cos((latMid * Math.PI) / 180);
  const dx = ((bbox[2] - bbox[0]) / width) * metresPerDegLon;
  const dy = ((bbox[3] - bbox[1]) / height) * metresPerDegLat;

  // Shade + tint into an RGB buffer.
  const rgb = new Uint8Array(width * height * 3);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const elev = elevGrid[row * width + col];
      const shade = hillshade(elevGrid, width, height, col, row, dx, dy);
      const [r, g, b] = shadeColor(elev, shade);
      const o = (row * width + col) * 3;
      rgb[o] = Math.round(r);
      rgb[o + 1] = Math.round(g);
      rgb[o + 2] = Math.round(b);
    }
  }

  mkdirSync(RELIEF_DIR, { recursive: true });
  const png = encodePng(rgb, width, height);
  writeFileSync(resolve(RELIEF_DIR, `${id}.png`), png);
  writeFileSync(
    resolve(RELIEF_DIR, `${id}.json`),
    JSON.stringify({
      bounds: bbox.map((v) => Number(v.toFixed(5))),
      width,
      height,
    }),
  );
  return png.length;
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

  let total = 0;
  for (const id of provinces) {
    process.stdout.write(`relief ${id} … `);
    const bytes = await bakeProvince(id);
    total += bytes;
    console.log(`${Math.round(bytes / 1024)} KB`);
  }
  console.log(
    `Baked ${provinces.length} province(s) → src/maps/relief/ (${Math.round(
      total / 1024,
    )} KB total)`,
  );
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
