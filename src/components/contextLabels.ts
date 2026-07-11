/**
 * Free-space placement for the outside-only context labels (neighbour /
 * country / sea names) drawn around the target province.
 *
 * The problem: the province is fit to nearly the whole viewBox, so a naive
 * "project the neighbour centroid and clamp into the box" drops labels straight
 * onto the province we're asking the player to read. Instead we treat the
 * target province as an *obstacle* and pack each label into the largest free
 * rectangle we can find near its geographic anchor — horizontal or rotated 90°,
 * whichever fits bigger — maximising the font size and simply dropping any label
 * that has nowhere legible to go.
 *
 * Everything here is pure and grid-based (a `blocked` occupancy grid in), so it
 * unit-tests without a browser. The caller rasterises the province shapes into
 * that grid (canvas) and feeds projected anchor seeds. Placement is in viewBox
 * units and independent of on-screen scale — the SVG letterboxes the viewBox
 * (`preserveAspectRatio=meet`), so the surrounding land shown is the same at any
 * window aspect/orientation, and the labels sit inside the pan/zoom group so
 * pinch/pan never moves them relative to the map.
 */

export type ContextLabelKind = "province" | "country" | "sea";

/** A label to place, with its projected anchor (viewBox units, may be off-box). */
export interface LabelSeed {
  name: string;
  kind: ContextLabelKind;
  /** True when `name` is a nickname (rendered italic/bold). */
  nick: boolean;
  seedX: number;
  seedY: number;
}

/** A placed label: viewBox centre, rotation, and the maximised font size. */
export interface PlacedLabel {
  key: string;
  name: string;
  kind: ContextLabelKind;
  nick: boolean;
  x: number;
  y: number;
  /** Rotation in degrees: 0 (horizontal) or ±90 (reads up on the left, down on the right). */
  angle: number;
  /** Geometric max font size in viewBox units (scale-independent). */
  fontVB: number;
}

export interface PlaceConfig {
  /** Occupancy grid resolution. */
  gw: number;
  gh: number;
  viewW: number;
  viewH: number;
  /** Text metrics as fractions of the font size (viewBox units). */
  charWidth: number;
  lineHeight: number;
  /** Breathing room around every label box (viewBox units). */
  padVB: number;
  /** Smallest font worth placing (viewBox units); below this the label is dropped. */
  minFontVB: number;
  /** Per-kind ceiling so one label can't swallow a whole corner. */
  maxFontVB: Record<ContextLabelKind, number>;
  /** How far a label may stray from its anchor before we'd rather drop it. */
  maxSeedDist: number;
  /** Penalty (font-units per viewBox unit of drift) balancing size vs. proximity. */
  distPenalty: number;
  /** Candidate-centre stride in grid cells (coarser = faster, less precise). */
  step: number;
}

export const DEFAULT_CONFIG: PlaceConfig = {
  gw: 200,
  gh: 160,
  viewW: 1000,
  viewH: 800,
  // Advance per character / font size. The map label is a wide script face, so
  // this is deliberately generous — overestimating width reserves a box the text
  // can't overflow, keeping it clear of the province rather than clipping onto it.
  charWidth: 0.68,
  lineHeight: 1.05,
  padVB: 7,
  minFontVB: 22,
  maxFontVB: { country: 84, sea: 74, province: 60 },
  maxSeedDist: 460,
  distPenalty: 0.05,
  step: 3,
};

/** Order labels are placed in — earlier kinds claim space first. */
const KIND_ORDER: Record<ContextLabelKind, number> = {
  country: 0,
  sea: 1,
  province: 2,
};

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

/** Summed-area table over an occupancy grid for O(1) rectangle-sum queries. */
function buildSAT(grid: Uint8Array, gw: number, gh: number): Int32Array {
  const W = gw + 1;
  const sat = new Int32Array(W * (gh + 1));
  for (let y = 0; y < gh; y++) {
    let rowSum = 0;
    for (let x = 0; x < gw; x++) {
      rowSum += grid[y * gw + x];
      sat[(y + 1) * W + (x + 1)] = sat[y * W + (x + 1)] + rowSum;
    }
  }
  return sat;
}

/** Sum of the inclusive cell rectangle [gx0..gx1] × [gy0..gy1]. */
function rectSum(
  sat: Int32Array,
  W: number,
  gx0: number,
  gy0: number,
  gx1: number,
  gy1: number,
): number {
  return (
    sat[(gy1 + 1) * W + (gx1 + 1)] -
    sat[gy0 * W + (gx1 + 1)] -
    sat[(gy1 + 1) * W + gx0] +
    sat[gy0 * W + gx0]
  );
}

/**
 * Largest font (viewBox units) whose text box — half-extents `hx`,`hy` per
 * font unit — fits centred at (cx,cy) without touching an obstacle or the
 * viewBox edge. Monotonic in font size, so a binary search suffices.
 */
function maxFontFit(
  cx: number,
  cy: number,
  hxPerFont: number,
  hyPerFont: number,
  sat: Int32Array,
  cfg: PlaceConfig,
): number {
  const { gw, gh, viewW, viewH, padVB, minFontVB } = cfg;
  const W = gw + 1;
  const cellW = viewW / gw;
  const cellH = viewH / gh;
  const edge = padVB;

  const fits = (f: number): boolean => {
    const hx = hxPerFont * f + padVB;
    const hy = hyPerFont * f + padVB;
    const x0 = cx - hx;
    const x1 = cx + hx;
    const y0 = cy - hy;
    const y1 = cy + hy;
    if (x0 < edge || x1 > viewW - edge || y0 < edge || y1 > viewH - edge) {
      return false;
    }
    const gx0 = clamp(Math.floor(x0 / cellW), 0, gw - 1);
    const gx1 = clamp(Math.floor(x1 / cellW), 0, gw - 1);
    const gy0 = clamp(Math.floor(y0 / cellH), 0, gh - 1);
    const gy1 = clamp(Math.floor(y1 / cellH), 0, gh - 1);
    return rectSum(sat, W, gx0, gy0, gx1, gy1) === 0;
  };

  if (!fits(minFontVB)) return 0;
  // Binary search the largest font that still fits.
  let lo = minFontVB;
  let hi = cfg.maxFontVB.country; // absolute upper bound; caller clamps per-kind
  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Stamp a placed label's (padded) box into the obstacle grid. */
function stampBox(
  grid: Uint8Array,
  cx: number,
  cy: number,
  hx: number,
  hy: number,
  cfg: PlaceConfig,
): void {
  const { gw, gh, viewW, viewH } = cfg;
  const cellW = viewW / gw;
  const cellH = viewH / gh;
  const gx0 = clamp(Math.floor((cx - hx) / cellW), 0, gw - 1);
  const gx1 = clamp(Math.floor((cx + hx) / cellW), 0, gw - 1);
  const gy0 = clamp(Math.floor((cy - hy) / cellH), 0, gh - 1);
  const gy1 = clamp(Math.floor((cy + hy) / cellH), 0, gh - 1);
  for (let y = gy0; y <= gy1; y++) {
    for (let x = gx0; x <= gx1; x++) grid[y * gw + x] = 1;
  }
}

/**
 * Per-kind "keep off" masks (1 = obstacle). Sea names must land on water, land
 * names (province / country) must land on ground — so each kind avoids the
 * opposite surface as well as the target province.
 */
export interface ObstacleMasks {
  /** Land labels avoid this: the target province ∪ the sea. */
  land: Uint8Array;
  /** Sea labels avoid this: all land (target province ∪ neighbours). */
  sea: Uint8Array;
}

/**
 * Place every label in the largest free box near its anchor. Each kind routes
 * around its own obstacle mask (see {@link ObstacleMasks}) plus every label
 * already placed, so names never stack, never land on the province, and sea
 * names stay on water. Labels that can't fit `minFontVB` near their anchor are
 * dropped.
 */
export function placeLabels(
  masks: ObstacleMasks,
  seeds: LabelSeed[],
  config: Partial<PlaceConfig> = {},
): PlacedLabel[] {
  const cfg: PlaceConfig = { ...DEFAULT_CONFIG, ...config };
  const { gw, gh, viewW, viewH, charWidth, lineHeight, padVB, step } = cfg;
  const cellW = viewW / gw;
  const cellH = viewH / gh;
  const n = gw * gh;

  const baseFor = (kind: ContextLabelKind) =>
    kind === "sea" ? masks.sea : masks.land;

  // Boxes of already-placed labels, unioned with each kind's base mask so no two
  // labels ever overlap regardless of kind.
  const placedMask = new Uint8Array(n);
  const obstacle = new Uint8Array(n);
  const rebuild = (kind: ContextLabelKind): Int32Array => {
    const base = baseFor(kind);
    for (let i = 0; i < n; i++) obstacle[i] = base[i] | placedMask[i];
    return buildSAT(obstacle, gw, gh);
  };

  const ordered = seeds
    .map((seed, i) => ({ seed, i }))
    .sort(
      (a, b) => KIND_ORDER[a.seed.kind] - KIND_ORDER[b.seed.kind] || a.i - b.i,
    );

  const placed: PlacedLabel[] = [];

  for (const { seed, i } of ordered) {
    const len = Math.max(1, seed.name.length);
    const capHalf = 0.5 * lineHeight;
    const runHalf = 0.5 * charWidth * len;
    const kindMax = cfg.maxFontVB[seed.kind];
    // Obstacle for this label = its surface mask ∪ every label already placed.
    const sat = rebuild(seed.kind);

    // Keep the anchor addressable even when the neighbour projects off-box.
    const sx = clamp(seed.seedX, padVB, viewW - padVB);
    const sy = clamp(seed.seedY, padVB, viewH - padVB);

    let best: {
      x: number;
      y: number;
      angle: number;
      font: number;
      score: number;
    } | null = null;

    for (let gy = 0; gy < gh; gy += step) {
      const cy = (gy + 0.5) * cellH;
      for (let gx = 0; gx < gw; gx += step) {
        if (obstacle[gy * gw + gx]) continue;
        const cx = (gx + 0.5) * cellW;
        const dx = cx - sx;
        const dy = cy - sy;
        const dist = Math.hypot(dx, dy);
        if (dist > cfg.maxSeedDist) continue;

        // Horizontal: wide box. Vertical (±90°): tall box (swap extents).
        for (const angle of [0, 90] as const) {
          const hxPerFont = angle === 0 ? runHalf : capHalf;
          const hyPerFont = angle === 0 ? capHalf : runHalf;
          let font = maxFontFit(cx, cy, hxPerFont, hyPerFont, sat, cfg);
          if (font < cfg.minFontVB) continue;
          if (font > kindMax) font = kindMax;
          const score = font - cfg.distPenalty * dist;
          if (!best || score > best.score) {
            best = { x: cx, y: cy, angle, font, score };
          }
        }
      }
    }

    if (!best) continue;

    const hxPerFont = best.angle === 0 ? runHalf : capHalf;
    const hyPerFont = best.angle === 0 ? capHalf : runHalf;
    stampBox(
      placedMask,
      best.x,
      best.y,
      hxPerFont * best.font + padVB,
      hyPerFont * best.font + padVB,
      cfg,
    );

    // Read up on the left half, down on the right — the cartographic default.
    const angle = best.angle === 0 ? 0 : best.x < viewW / 2 ? -90 : 90;
    placed.push({
      key: `lbl-${i}`,
      name: seed.name,
      kind: seed.kind,
      nick: seed.nick,
      x: best.x,
      y: best.y,
      angle,
      fontVB: best.font,
    });
  }

  return placed;
}
