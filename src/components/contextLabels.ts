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
   * Shorter names to fall back to, in preference order, when `name` can't be
   * placed at all. Used for the flavour nicknames: the plain province name rides
   * along here, so a nickname too long for a small visible sliver degrades to the
   * real name instead of dropping the label entirely. Candidates are tried in
   * order and the first that fits (down to the minimum font) wins — the fallback
   * is a rescue, not a preference — so only if none fit is the label dropped.
   */
  altNames?: string[];
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
  /**
   * Cells the box may overlap but *shouldn't* — capped at `softOverlapMax` of the
   * box (see PlaceConfig). Lets a sea name centred on a small water sliver hug the
   * coast (its tail over the neighbouring shore) instead of dropping, while still
   * staying mostly on the water.
   */
  softAvoid?: Uint8Array;
}

/** A placed label: viewBox centre, rotation, and the maximised font size. */
export interface PlacedLabel {
  key: string;
  /** The chosen string — `name`, or one of the seed's `altNames` when it fits better. */
  name: string;
  /**
   * The chosen string split into rendered lines (one entry = single line). The
   * placer may wrap a multi-word name to fit a squarer gap; the renderer stacks
   * these as tspans, centred on (x, y).
   */
  lines: string[];
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
  /** Max fraction of a box that may fall on its `softAvoid` cells (the coast). */
  softOverlapMax: number;
  /**
   * Max lines a multi-word name may wrap onto. A long two-word nickname packs a
   * squarer box wrapped than as one long ribbon, so it can sit horizontally (and
   * bigger) in a blobby gap instead of being stood up vertical. Single-word names
   * never wrap. 1 disables wrapping.
   */
  maxLines: number;
  /**
   * Readability penalty for steep text: a placement's score is scaled by
   * `1 − readabilityBias·|sin(angle)|`, so a vertical label must be this much
   * bigger than a horizontal one to win. Keeps names upright unless a genuinely
   * tall-narrow gap (a coastal column) only fits them stood up.
   */
  readabilityBias: number;
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
  padVB: 5,
  // Geometric floor only — a label smaller than this isn't worth placing at all.
  // The real "too small to read" decision is the scale-aware physical-pixel floor
  // at render time (see LABEL_FLOOR_PX in MapCanvas), so this stays low: a small
  // but genuinely-visible region (a coastal sea corner, a thin neighbour sliver)
  // keeps a shrunk-to-fit label instead of being dropped outright.
  minFontVB: 12,
  maxFontVB: { country: 84, sea: 74, province: 60 },
  maxSeedDist: 460,
  distPenalty: 0.05,
  step: 4,
  angles: [0, 22.5, -22.5, 45, -45, 67.5, -67.5, 90],
  softOverlapMax: 0.5,
  maxLines: 2,
  readabilityBias: 0.28,
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
  soft?: Uint8Array,
  softMax = 1,
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
  let total = 0;
  let softHits = 0;
  for (let i = 0; i <= nL; i++) {
    const sl = -b.hL + (2 * b.hL * i) / nL;
    for (let j = 0; j <= nH; j++) {
      const sh = -b.hH + (2 * b.hH * j) / nH;
      const x = b.cx + sl * b.ux + sh * b.vx;
      const y = b.cy + sl * b.uy + sh * b.vy;
      const gx = clamp(Math.floor(x / cellW), 0, gw - 1);
      const gy = clamp(Math.floor(y / cellH), 0, gh - 1);
      const cellIdx = gy * gw + gx;
      if (obstacle[cellIdx]) return false;
      if (soft?.[cellIdx]) softHits++;
      total++;
    }
  }
  // A sea name may hug the coast: allow limited overlap of its `soft` cells.
  return soft ? softHits <= softMax * total : true;
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
  soft?: Uint8Array,
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
      soft,
      cfg.softOverlapMax,
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
 * Split `words` into `k` contiguous lines, balancing the joined length of each
 * so the widest line is as short as possible (a small DP; names are only a few
 * words). Returns the k line strings, top to bottom.
 */
function balancedLines(words: string[], k: number): string[] {
  const n = words.length;
  const len = words.map((w) => w.length);
  // Length of words[i..j) joined by single spaces.
  const joinLen = (i: number, j: number): number => {
    let s = 0;
    for (let t = i; t < j; t++) s += len[t];
    return s + Math.max(0, j - i - 1);
  };
  // Best (min widest-line) split of words[i..] into g groups, with the first cut.
  const memo = new Map<string, { max: number; cut: number }>();
  const solve = (i: number, g: number): { max: number; cut: number } => {
    const key = `${i},${g}`;
    const hit = memo.get(key);
    if (hit) return hit;
    let res: { max: number; cut: number };
    if (g === 1) {
      res = { max: joinLen(i, n), cut: n };
    } else {
      res = { max: Number.POSITIVE_INFINITY, cut: i + 1 };
      for (let j = i + 1; j <= n - (g - 1); j++) {
        const widest = Math.max(joinLen(i, j), solve(j, g - 1).max);
        if (widest < res.max) res = { max: widest, cut: j };
      }
    }
    memo.set(key, res);
    return res;
  };

  const lines: string[] = [];
  let i = 0;
  for (let g = k; g >= 1; g--) {
    if (g === 1) {
      lines.push(words.slice(i).join(" "));
      break;
    }
    const { cut } = solve(i, g);
    lines.push(words.slice(i, cut).join(" "));
    i = cut;
  }
  return lines;
}

/**
 * All the line-wrappings to try for a name: 1 line, plus balanced splits up to
 * `maxLines` (never more lines than words). Single-word names yield one option.
 */
function lineOptions(name: string, maxLines: number): string[][] {
  const words = name.trim().split(/\s+/);
  const maxK = Math.max(1, Math.min(maxLines, words.length));
  const opts: string[][] = [];
  for (let k = 1; k <= maxK; k++) opts.push(balancedLines(words, k));
  return opts;
}

/** Score multiplier for text at `angleDeg`: 1 flat, down to 1−bias vertical. */
function readabilityFactor(angleDeg: number, bias: number): number {
  return 1 - bias * Math.abs(Math.sin((angleDeg * Math.PI) / 180));
}

/** The box half-extents (before adding font/pad) for one wrapping option. */
interface Shaped {
  lines: string[];
  /** Half-run along the text: driven by the widest line. */
  runHalf: number;
  /** Half-height across the text: driven by the line count. */
  capHalf: number;
}

/**
 * Best placement (largest readability-weighted box near the anchor) for a single
 * candidate string, trying every wrapping × orientation × grid centre. Returns
 * null when nothing legible fits.
 */
function searchName(
  name: string,
  obstacle: Uint8Array,
  anchorMask: Uint8Array | undefined,
  soft: Uint8Array | undefined,
  sx: number,
  sy: number,
  kindMax: number,
  cfg: PlaceConfig,
): {
  x: number;
  y: number;
  angle: number;
  font: number;
  score: number;
  shaped: Shaped;
} | null {
  const { gw, gh, viewW, viewH, charWidth, lineHeight, step } = cfg;
  const cellW = viewW / gw;
  const cellH = viewH / gh;

  const shapes: Shaped[] = lineOptions(name, cfg.maxLines).map((lines) => {
    const widest = Math.max(...lines.map((s) => Math.max(1, s.length)));
    return {
      lines,
      runHalf: 0.5 * charWidth * widest,
      capHalf: 0.5 * lineHeight * lines.length,
    };
  });

  let best: {
    x: number;
    y: number;
    angle: number;
    font: number;
    score: number;
    shaped: Shaped;
  } | null = null;

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

      for (const angle of cfg.angles) {
        const readable = readabilityFactor(angle, cfg.readabilityBias);
        for (const shaped of shapes) {
          const font = maxFontFit(
            cx,
            cy,
            angle,
            shaped.runHalf,
            shaped.capHalf,
            kindMax,
            obstacle,
            cfg,
            soft,
          );
          if (font < cfg.minFontVB) continue;
          const score = font * readable - cfg.distPenalty * dist;
          if (!best || score > best.score) {
            best = { x: cx, y: cy, angle, font, score, shaped };
          }
        }
      }
    }
  }
  return best;
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
  const { gw, gh, viewW, viewH, padVB } = cfg;
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
    const kindMax = cfg.maxFontVB[seed.kind];
    // Obstacle for this label = outside-its-region ∪ every label already placed.
    rebuild(seed);

    // Keep the anchor addressable even when the neighbour projects off-box.
    const sx = clamp(seed.seedX, padVB, viewW - padVB);
    const sy = clamp(seed.seedY, padVB, viewH - padVB);

    // Try the preferred name first, shrunk all the way to the minimum font, and
    // only fall through to a shorter fallback when it can't fit at all. This
    // keeps the fuller/nickname label — even small — rather than swapping to the
    // plain name whenever it happens to fit bigger; the short name is a rescue,
    // not a preference. (`searchName` already returns the largest font ≥ minFont
    // that fits, or null.)
    let chosen: {
      name: string;
      x: number;
      y: number;
      angle: number;
      font: number;
      shaped: Shaped;
    } | null = null;
    const candidates = [seed.name, ...(seed.altNames ?? [])];
    for (const cand of candidates) {
      const found = searchName(
        cand,
        obstacle,
        seed.anchor,
        seed.softAvoid,
        sx,
        sy,
        kindMax,
        cfg,
      );
      if (!found) continue;
      chosen = {
        name: cand,
        x: found.x,
        y: found.y,
        angle: readable(found.angle),
        font: found.font,
        shaped: found.shaped,
      };
      break;
    }

    if (!chosen) continue;

    stampBox(
      placedMask,
      makeBox(
        chosen.x,
        chosen.y,
        chosen.angle,
        chosen.shaped.runHalf * chosen.font + padVB,
        chosen.shaped.capHalf * chosen.font + padVB,
      ),
      cfg,
    );

    placed.push({
      key: `lbl-${i}`,
      name: chosen.name,
      lines: chosen.shaped.lines,
      kind: seed.kind,
      // Nick styling only when the flavour nickname itself was the one placed —
      // a plain-name fallback renders in the normal face.
      nick: seed.nick && chosen.name === seed.name,
      x: chosen.x,
      y: chosen.y,
      angle: chosen.angle,
      fontVB: chosen.font,
    });
  }

  return placed;
}
