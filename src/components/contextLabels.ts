/**
 * Free-space placement for the outside-only context labels (neighbour /
 * country / sea names) drawn around the target province.
 *
 * The problem: the province is fit to nearly the whole viewBox, so a naive
 * "project the neighbour centroid and clamp into the box" drops labels straight
 * onto the province we're asking the player to read. Instead we treat the
 * target province as an *obstacle* and pack each label into the largest free
 * rectangle we can find near its geographic anchor — at whichever readable angle
 * (horizontal, vertical, or a diagonal through a wedge-shaped gap) fits it
 * biggest — maximising the font size and simply dropping any label that has
 * nowhere legible to go.
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
  /**
   * Cells the label's *centre* must fall inside (1 = allowed) — its own region
   * on screen (this neighbour province's polygon, or the sea). Pins the name to
   * its own area; when that area isn't visible, the label is dropped. The box may
   * still extend past the region into blank margin, but never onto an `avoid`
   * surface (the target, the sea, or another province).
   */
  anchor?: Uint8Array;
  /**
   * Cells the label's box must stay *outside* (1 = obstacle): the played
   * province, the wrong surface, and every other region. For a foreign country —
   * which has no baked shape to anchor to — this is the only constraint, keeping
   * it off every known surface so it lands on the foreign parchment.
   */
  avoid?: Uint8Array;
}

/** A placed label: viewBox centre, rotation, and the maximised font size. */
export interface PlacedLabel {
  key: string;
  name: string;
  kind: ContextLabelKind;
  nick: boolean;
  x: number;
  y: number;
  /** SVG rotation in degrees, in (−90, 90] so text is always read the right way up. */
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
  /**
   * Readable text orientations to try, in degrees (SVG rotation, clockwise). Any
   * value works; they're normalised to (−90°, 90°] so text is never upside-down.
   * A fan through the diagonals lets a wedge-shaped gap (e.g. a coastal arc) take
   * a slanted label that a strict horizontal/vertical pair would miss.
   */
  angles: number[];
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
  step: 4,
  angles: [0, 22.5, -22.5, 45, -45, 67.5, -67.5, 90],
};

/** Order labels are placed in — earlier kinds claim space first. */
const KIND_ORDER: Record<ContextLabelKind, number> = {
  country: 0,
  sea: 1,
  province: 2,
};

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

/** Fold any angle (deg) into (−90, 90] — the same line, read the right way up. */
function readable(deg: number): number {
  let a = deg % 180;
  if (a > 90) a -= 180;
  else if (a <= -90) a += 180;
  return a;
}

/**
 * An oriented text box centred at (cx,cy): a half-length `hL` along the text
 * direction (unit vector `ux,uy`) and a half-height `hH` across it (`vx,vy`).
 */
interface OrientedBox {
  cx: number;
  cy: number;
  ux: number;
  uy: number;
  vx: number;
  vy: number;
  hL: number;
  hH: number;
}

function makeBox(
  cx: number,
  cy: number,
  angleDeg: number,
  hL: number,
  hH: number,
): OrientedBox {
  const r = (angleDeg * Math.PI) / 180;
  const ux = Math.cos(r);
  const uy = Math.sin(r);
  return { cx, cy, ux, uy, vx: -uy, vy: ux, hL, hH };
}

/**
 * True if the oriented box lies fully inside the viewBox (minus `edge`) and
 * covers no obstacle cell. Samples the box on a grid at roughly cell resolution
 * — the obstacles here are large filled regions, so nothing thin slips between
 * samples. Early-exits on the first hit.
 */
function boxIsClear(
  b: OrientedBox,
  obstacle: Uint8Array,
  cfg: PlaceConfig,
  edge: number,
): boolean {
  const { gw, gh, viewW, viewH } = cfg;
  const cellW = viewW / gw;
  const cellH = viewH / gh;
  const cell = Math.min(cellW, cellH);

  // Corners must sit inside the viewBox margin (they're the box's extremes).
  for (const sl of [-b.hL, b.hL]) {
    for (const sh of [-b.hH, b.hH]) {
      const x = b.cx + sl * b.ux + sh * b.vx;
      const y = b.cy + sl * b.uy + sh * b.vy;
      if (x < edge || x > viewW - edge || y < edge || y > viewH - edge) {
        return false;
      }
    }
  }

  // Sample at cell resolution in both directions so no obstacle cell slips
  // between samples (an obstacle can intrude anywhere along the length, and a
  // thin border can clip the height).
  const nL = Math.max(1, Math.ceil((2 * b.hL) / cell));
  const nH = Math.max(1, Math.ceil((2 * b.hH) / cell));
  for (let i = 0; i <= nL; i++) {
    const sl = -b.hL + (2 * b.hL * i) / nL;
    for (let j = 0; j <= nH; j++) {
      const sh = -b.hH + (2 * b.hH * j) / nH;
      const x = b.cx + sl * b.ux + sh * b.vx;
      const y = b.cy + sl * b.uy + sh * b.vy;
      const gx = clamp(Math.floor(x / cellW), 0, gw - 1);
      const gy = clamp(Math.floor(y / cellH), 0, gh - 1);
      if (obstacle[gy * gw + gx]) return false;
    }
  }
  return true;
}

/**
 * Largest font (viewBox units) whose text box fits centred at (cx,cy) at
 * `angleDeg`. Bigger font ⇒ bigger box ⇒ monotonically harder to fit, so a
 * binary search converges. Returns 0 when even `minFontVB` won't fit.
 */
function maxFontFit(
  cx: number,
  cy: number,
  angleDeg: number,
  runHalf: number,
  capHalf: number,
  maxFont: number,
  obstacle: Uint8Array,
  cfg: PlaceConfig,
): number {
  const fits = (f: number): boolean =>
    boxIsClear(
      makeBox(
        cx,
        cy,
        angleDeg,
        runHalf * f + cfg.padVB,
        capHalf * f + cfg.padVB,
      ),
      obstacle,
      cfg,
      cfg.padVB,
    );

  if (!fits(cfg.minFontVB)) return 0;
  // Cap the search at the kind's own ceiling — smaller boxes are cheaper to
  // test and the caller wouldn't render bigger anyway.
  if (fits(maxFont)) return maxFont;
  let lo = cfg.minFontVB;
  let hi = maxFont;
  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Stamp an oriented (padded) box into the obstacle grid — its axis-aligned
 *  cell bounds, filtered to cells whose centre is inside the rotated box. */
function stampBox(grid: Uint8Array, b: OrientedBox, cfg: PlaceConfig): void {
  const { gw, gh, viewW, viewH } = cfg;
  const cellW = viewW / gw;
  const cellH = viewH / gh;
  const reach = Math.hypot(b.hL, b.hH);
  const gx0 = clamp(Math.floor((b.cx - reach) / cellW), 0, gw - 1);
  const gx1 = clamp(Math.floor((b.cx + reach) / cellW), 0, gw - 1);
  const gy0 = clamp(Math.floor((b.cy - reach) / cellH), 0, gh - 1);
  const gy1 = clamp(Math.floor((b.cy + reach) / cellH), 0, gh - 1);
  for (let gy = gy0; gy <= gy1; gy++) {
    const y = (gy + 0.5) * cellH;
    for (let gx = gx0; gx <= gx1; gx++) {
      const x = (gx + 0.5) * cellW;
      const dx = x - b.cx;
      const dy = y - b.cy;
      const along = dx * b.ux + dy * b.uy;
      const across = dx * b.vx + dy * b.vy;
      if (Math.abs(along) <= b.hL && Math.abs(across) <= b.hH) {
        grid[gy * gw + gx] = 1;
      }
    }
  }
}

/**
 * Place every label in the largest free box near its anchor. Each label is
 * pinned to its own region: its box centre must land on that region (`anchor`)
 * and its box must avoid the played province, the wrong surface, and every other
 * region (`avoid`) — so a neighbour never lands on the wrong province. A country,
 * having no baked shape, is constrained by `avoid` alone. Boxes of labels already
 * placed are added to the obstacle so names never stack. A label whose region
 * isn't visible, or that can't fit a legible box, is dropped.
 */
export function placeLabels(
  seeds: LabelSeed[],
  config: Partial<PlaceConfig> = {},
): PlacedLabel[] {
  const cfg: PlaceConfig = { ...DEFAULT_CONFIG, ...config };
  const { gw, gh, viewW, viewH, charWidth, lineHeight, padVB, step } = cfg;
  const cellW = viewW / gw;
  const cellH = viewH / gh;
  const n = gw * gh;

  // Boxes of already-placed labels, added to each label's own constraint so no
  // two labels ever overlap regardless of region.
  const placedMask = new Uint8Array(n);
  const obstacle = new Uint8Array(n);
  const rebuild = (seed: LabelSeed): void => {
    const av = seed.avoid;
    for (let i = 0; i < n; i++) obstacle[i] = placedMask[i] | (av ? av[i] : 0);
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
    // Obstacle for this label = outside-its-region ∪ every label already placed.
    rebuild(seed);

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

    const anchorMask = seed.anchor;
    for (let gy = 0; gy < gh; gy += step) {
      const cy = (gy + 0.5) * cellH;
      for (let gx = 0; gx < gw; gx += step) {
        const at = gy * gw + gx;
        if (obstacle[at]) continue;
        // Pin the label's centre to its own region on screen.
        if (anchorMask && !anchorMask[at]) continue;
        const cx = (gx + 0.5) * cellW;
        const dist = Math.hypot(cx - sx, cy - sy);
        if (dist > cfg.maxSeedDist) continue;

        // Try each readable orientation; a slanted gap can hold a bigger label.
        for (const angle of cfg.angles) {
          const font = maxFontFit(
            cx,
            cy,
            angle,
            runHalf,
            capHalf,
            kindMax,
            obstacle,
            cfg,
          );
          if (font < cfg.minFontVB) continue;
          const score = font - cfg.distPenalty * dist;
          if (!best || score > best.score) {
            best = { x: cx, y: cy, angle: readable(angle), font, score };
          }
        }
      }
    }

    if (!best) continue;

    stampBox(
      placedMask,
      makeBox(
        best.x,
        best.y,
        best.angle,
        runHalf * best.font + padVB,
        capHalf * best.font + padVB,
      ),
      cfg,
    );

    placed.push({
      key: `lbl-${i}`,
      name: seed.name,
      kind: seed.kind,
      nick: seed.nick,
      x: best.x,
      y: best.y,
      angle: best.angle,
      fontVB: best.font,
    });
  }

  return placed;
}
