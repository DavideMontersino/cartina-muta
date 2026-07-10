/**
 * Small pure geo helpers shared by the terrain-baking scripts
 * (extract-relief, extract-water, extract-context): province bounding boxes,
 * Web-Mercator conversions, and slippy-tile cover math. No file I/O, so every
 * function here is directly unit-testable (see scripts/lib/geo.test.ts).
 */

/** WGS84 bounding box, `[west, south, east, north]` in degrees. */
export type Bbox = [number, number, number, number];

type Coord = number[];
// Nested coordinate arrays, as found in GeoJSON Polygon/MultiPolygon geometry.
type Coords = Coord | Coords[];

interface GeometryLike {
  coordinates: Coords;
}
interface FeatureLike {
  geometry: GeometryLike;
}

/** Grow a bbox in place to include a single `[lon, lat]` point. */
function extend(bbox: Bbox, lon: number, lat: number): void {
  if (lon < bbox[0]) bbox[0] = lon;
  if (lat < bbox[1]) bbox[1] = lat;
  if (lon > bbox[2]) bbox[2] = lon;
  if (lat > bbox[3]) bbox[3] = lat;
}

function scan(bbox: Bbox, coords: Coords): void {
  if (typeof coords[0] === "number") {
    extend(bbox, coords[0] as number, coords[1] as number);
    return;
  }
  for (const c of coords as Coords[]) scan(bbox, c);
}

/** Tight WGS84 bbox covering every feature's geometry. */
export function collectionBbox(features: FeatureLike[]): Bbox {
  const bbox: Bbox = [
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ];
  for (const f of features) scan(bbox, f.geometry.coordinates);
  return bbox;
}

/**
 * Expand a bbox outward by `margin` (a fraction of its own width/height) on
 * every side — used to pull in surrounding context (neighbour provinces, the
 * sea, adjacent countries) around the played province.
 */
export function expandBbox(bbox: Bbox, margin: number): Bbox {
  const [w, s, e, n] = bbox;
  const dx = (e - w) * margin;
  const dy = (n - s) * margin;
  return [w - dx, s - dy, e + dx, n + dy];
}

/** Normalised Web-Mercator X in [0,1] for a longitude. */
export const lonToMercX = (lon: number): number => (lon + 180) / 360;

/** Normalised Web-Mercator Y in [0,1] for a latitude (clamped near the poles). */
export function latToMercY(lat: number): number {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const rad = (clamped * Math.PI) / 180;
  return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2;
}

/** Inverse of {@link latToMercY}: latitude (degrees) for a normalised merc Y. */
export function mercYToLat(y: number): number {
  return (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;
}

export interface TileCover {
  z: number;
  /** Inclusive tile-index ranges covering the bbox at zoom `z`. */
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

// A lon/lat point. Kept as `number[]` (not a 2-tuple) so GeoJSON `Position`
// arrays pass straight through without casts.
type Pt = number[];

/**
 * Clip a polygon ring to a bbox rectangle (Sutherland–Hodgman). Input may be a
 * closed GeoJSON ring; returns the clipped ring's vertices (open, no repeated
 * closing point), or `[]` if the ring lies entirely outside the bbox.
 */
export function clipRingToBbox(ring: Pt[], bbox: Bbox): Pt[] {
  const [w, s, e, n] = bbox;
  // Drop a repeated closing vertex; Sutherland–Hodgman treats input as closed.
  let out: Pt[] =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring.slice();

  const clip = (
    inside: (p: Pt) => boolean,
    cut: (a: Pt, b: Pt) => Pt,
  ): void => {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i];
      const prev = input[(i + input.length - 1) % input.length];
      const curIn = inside(cur);
      const prevIn = inside(prev);
      if (curIn) {
        if (!prevIn) out.push(cut(prev, cur));
        out.push(cur);
      } else if (prevIn) {
        out.push(cut(prev, cur));
      }
    }
  };

  const atX = (a: Pt, b: Pt, x: number): Pt => {
    const t = (x - a[0]) / (b[0] - a[0]);
    return [x, a[1] + t * (b[1] - a[1])];
  };
  const atY = (a: Pt, b: Pt, y: number): Pt => {
    const t = (y - a[1]) / (b[1] - a[1]);
    return [a[0] + t * (b[0] - a[0]), y];
  };

  clip(
    (p) => p[0] >= w,
    (a, b) => atX(a, b, w),
  );
  if (out.length)
    clip(
      (p) => p[0] <= e,
      (a, b) => atX(a, b, e),
    );
  if (out.length)
    clip(
      (p) => p[1] >= s,
      (a, b) => atY(a, b, s),
    );
  if (out.length)
    clip(
      (p) => p[1] <= n,
      (a, b) => atY(a, b, n),
    );
  return out;
}

/** Perpendicular distance from point `p` to the segment `a`–`b`. */
function perpDistance(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Ramer–Douglas–Peucker line simplification. Keeps endpoints. */
export function simplifyLine(points: Pt[], tolerance: number): Pt[] {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let index = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDistance(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist <= tolerance) return [first, last];
  return simplifyLine(points.slice(0, index + 1), tolerance)
    .slice(0, -1)
    .concat(simplifyLine(points.slice(index), tolerance));
}

/** Shoelace signed area of a ring (positive = counter-clockwise in lon/lat). */
export function signedArea(ring: Pt[]): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return a / 2;
}

/**
 * Force a ring's winding. The comuni (and thus d3's spherical geoMercator in
 * this app) treat *clockwise* lon/lat exterior rings as solid; a ring wound the
 * other way makes geoPath fill its exterior — the whole viewport. Rewinding the
 * baked water/context rings to match keeps them from flooding the map.
 */
export function ensureWinding(ring: Pt[], clockwise: boolean): Pt[] {
  const isClockwise = signedArea(ring) < 0;
  return isClockwise === clockwise ? ring : ring.slice().reverse();
}

/** Whether a `[lon, lat]` point lies inside a polygon ring (ray casting). */
export function pointInRing(pt: Pt, ring: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (
      yi > pt[1] !== yj > pt[1] &&
      pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/** Area-weighted centroid of a ring (returns null for a degenerate ring). */
export function ringCentroid(ring: Pt[]): Pt | null {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const cross = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    area += cross;
    cx += (ring[j][0] + ring[i][0]) * cross;
    cy += (ring[j][1] + ring[i][1]) * cross;
  }
  if (area === 0) return null;
  return [cx / (3 * area), cy / (3 * area)];
}

/** The inclusive range of XYZ tiles covering a bbox at a given zoom. */
export function tileCover(bbox: Bbox, z: number): TileCover {
  const n = 2 ** z;
  const [w, s, e, north] = bbox;
  const xMin = Math.floor(lonToMercX(w) * n);
  const xMax = Math.floor(lonToMercX(e) * n);
  // Mercator Y grows southward, so the north edge yields the smaller index.
  const yMin = Math.floor(latToMercY(north) * n);
  const yMax = Math.floor(latToMercY(s) * n);
  return {
    z,
    xMin: Math.max(0, xMin),
    xMax: Math.min(n - 1, xMax),
    yMin: Math.max(0, yMin),
    yMax: Math.min(n - 1, yMax),
  };
}
