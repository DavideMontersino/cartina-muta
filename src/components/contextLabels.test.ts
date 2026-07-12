import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  type LabelSeed,
  type PlaceConfig,
  placeLabels,
} from "./contextLabels";

/** Build a blocked grid with a central rectangle (the "province") set to 1. */
function provinceGrid(
  cfg: PlaceConfig,
  frac = { x0: 0.25, y0: 0.25, x1: 0.75, y1: 0.75 },
): Uint8Array {
  const { gw, gh } = cfg;
  const grid = new Uint8Array(gw * gh);
  const gx0 = Math.floor(frac.x0 * gw);
  const gx1 = Math.floor(frac.x1 * gw);
  const gy0 = Math.floor(frac.y0 * gh);
  const gy1 = Math.floor(frac.y1 * gh);
  for (let y = gy0; y < gy1; y++) {
    for (let x = gx0; x < gx1; x++) grid[y * gw + x] = 1;
  }
  return grid;
}

/** The complement of a grid: 1 where `g` is 0. Used to turn an obstacle mask
 *  into a `within` (allowed) mask for the region-pinning tests. */
function invert(g: Uint8Array): Uint8Array {
  const out = new Uint8Array(g.length);
  for (let i = 0; i < g.length; i++) out[i] = g[i] ? 0 : 1;
  return out;
}

type Placed = {
  x: number;
  y: number;
  angle: number;
  fontVB: number;
  name: string;
  lines: string[];
};

/** Widest line (chars) of a placed label — the box's run is driven by it. */
const widestLine = (l: Placed): number =>
  Math.max(...l.lines.map((s) => Math.max(1, s.length)));

/** The four corners of a placed label's (unpadded) oriented box, in viewBox units. */
function corners(cfg: PlaceConfig, l: Placed): Array<[number, number]> {
  const r = (l.angle * Math.PI) / 180;
  const ux = Math.cos(r);
  const uy = Math.sin(r);
  const vx = -uy;
  const vy = ux;
  const hL = 0.5 * cfg.charWidth * widestLine(l) * l.fontVB;
  const hH = 0.5 * cfg.lineHeight * l.lines.length * l.fontVB;
  const pts: Array<[number, number]> = [];
  for (const sl of [-hL, hL])
    for (const sh of [-hH, hH])
      pts.push([l.x + sl * ux + sh * vx, l.y + sl * uy + sh * vy]);
  return pts;
}

/** Is the oriented box of a placed label clear of an obstacle grid? Samples the
 *  rotated box (matching the placer's own emptiness test). */
function boxClearOfProvince(
  cfg: PlaceConfig,
  grid: Uint8Array,
  l: Placed,
): boolean {
  const { gw, gh, viewW, viewH, charWidth, lineHeight } = cfg;
  const cellW = viewW / gw;
  const cellH = viewH / gh;
  const cell = Math.min(cellW, cellH);
  const r = (l.angle * Math.PI) / 180;
  const ux = Math.cos(r);
  const uy = Math.sin(r);
  const vx = -uy;
  const vy = ux;
  const hL = 0.5 * charWidth * widestLine(l) * l.fontVB;
  const hH = 0.5 * lineHeight * l.lines.length * l.fontVB;
  const nL = Math.max(1, Math.ceil((2 * hL) / cell));
  const nH = Math.max(1, Math.ceil((2 * hH) / cell));
  for (let i = 0; i <= nL; i++) {
    const sl = -hL + (2 * hL * i) / nL;
    for (let j = 0; j <= nH; j++) {
      const sh = -hH + (2 * hH * j) / nH;
      const x = l.x + sl * ux + sh * vx;
      const y = l.y + sl * uy + sh * vy;
      const gx = Math.min(gw - 1, Math.max(0, Math.floor(x / cellW)));
      const gy = Math.min(gh - 1, Math.max(0, Math.floor(y / cellH)));
      if (grid[gy * gw + gx]) return false;
    }
  }
  return true;
}

describe("placeLabels", () => {
  const cfg = DEFAULT_CONFIG;

  it("never places a label over the target province (avoid)", () => {
    const grid = provinceGrid(cfg);
    // Anchors on all four sides; each label must stay off the central province.
    const seeds: LabelSeed[] = [
      {
        name: "Nord",
        kind: "country",
        nick: false,
        seedX: 500,
        seedY: 60,
        avoid: grid,
      },
      {
        name: "Sud",
        kind: "country",
        nick: false,
        seedX: 500,
        seedY: 740,
        avoid: grid,
      },
      {
        name: "Ovest",
        kind: "country",
        nick: false,
        seedX: 60,
        seedY: 400,
        avoid: grid,
      },
      {
        name: "Est",
        kind: "country",
        nick: false,
        seedX: 940,
        seedY: 400,
        avoid: grid,
      },
    ];
    const placed = placeLabels(seeds);
    expect(placed.length).toBeGreaterThan(0);
    for (const l of placed) {
      expect(boxClearOfProvince(cfg, grid, l)).toBe(true);
    }
  });

  it("keeps every placed label inside the viewBox", () => {
    const grid = provinceGrid(cfg);
    const seeds: LabelSeed[] = [
      {
        name: "Francia",
        kind: "country",
        nick: false,
        seedX: 40,
        seedY: 40,
        avoid: grid,
      },
      {
        name: "Mare",
        kind: "sea",
        nick: false,
        seedX: 960,
        seedY: 760,
        anchor: invert(grid),
        avoid: grid,
      },
    ];
    for (const l of placeLabels(seeds)) {
      for (const [x, y] of corners(cfg, l)) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(cfg.viewW);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(cfg.viewH);
      }
    }
  });

  it("rotates a label to fit a tall, narrow gap", () => {
    // Province fills the width except a narrow left column: only vertical fits.
    const grid = provinceGrid(cfg, { x0: 0.18, y0: 0.05, x1: 0.98, y1: 0.95 });
    const seeds: LabelSeed[] = [
      {
        name: "Piemonte",
        kind: "country",
        nick: false,
        seedX: 60,
        seedY: 400,
        avoid: grid,
      },
    ];
    const placed = placeLabels(seeds);
    expect(placed).toHaveLength(1);
    // A near-vertical orientation (not horizontal) is needed to fit the column.
    expect(Math.abs(placed[0].angle)).toBeGreaterThanOrEqual(60);
    expect(boxClearOfProvince(cfg, grid, placed[0])).toBe(true);
  });

  it("uses a diagonal orientation to fit a diagonal corridor", () => {
    // Free space is a slanted band along the (1,1) diagonal; everything else is
    // obstacle. Only a diagonally-oriented label fits — a wedge like a coast arc.
    const { gw, gh, viewW, viewH } = cfg;
    const grid = new Uint8Array(gw * gh);
    const cellW = viewW / gw;
    const cellH = viewH / gh;
    const cx0 = viewW / 2;
    const cy0 = viewH / 2;
    // Normal to the (1,1) direction is (1,-1)/√2; block cells far from the band.
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const px = (x + 0.5) * cellW - cx0;
        const py = (y + 0.5) * cellH - cy0;
        const perp = Math.abs((px - py) / Math.SQRT2);
        if (perp > 55) grid[y * gw + x] = 1;
      }
    }
    const seeds: LabelSeed[] = [
      {
        name: "Costiera",
        kind: "country",
        nick: false,
        seedX: cx0,
        seedY: cy0,
        avoid: grid,
      },
    ];
    const placed = placeLabels(seeds);
    expect(placed).toHaveLength(1);
    // The (1,1) direction is +45° in SVG's y-down coordinates.
    expect(placed[0].angle).toBeGreaterThan(20);
    expect(placed[0].angle).toBeLessThan(70);
    expect(boxClearOfProvince(cfg, grid, placed[0])).toBe(true);
  });

  it("drops a label when there is no room near its anchor", () => {
    // Obstacle covers everything but a sliver too thin for min font.
    const grid = provinceGrid(cfg, { x0: 0.02, y0: 0.02, x1: 0.99, y1: 0.99 });
    const seeds: LabelSeed[] = [
      {
        name: "Cuneo",
        kind: "country",
        nick: false,
        seedX: 500,
        seedY: 400,
        avoid: grid,
      },
    ];
    expect(placeLabels(seeds)).toHaveLength(0);
  });

  it("pins a label inside its own region and drops it when the region is absent", () => {
    // Region A is the right 30%; region B is nowhere on screen (empty mask).
    const regionA = invert(provinceGrid(cfg, { x0: 0, y0: 0, x1: 0.7, y1: 1 }));
    const regionB = new Uint8Array(cfg.gw * cfg.gh);
    const seeds: LabelSeed[] = [
      {
        name: "Presente",
        kind: "province",
        nick: false,
        seedX: 850,
        seedY: 400,
        anchor: regionA,
        avoid: invert(regionA),
      },
      {
        name: "Assente",
        kind: "province",
        nick: false,
        seedX: 850,
        seedY: 400,
        anchor: regionB,
        avoid: invert(regionB),
      },
    ];
    const placed = placeLabels(seeds);
    // Only the region that's on screen gets a label; it sits inside that region.
    expect(placed.map((l) => l.name)).toEqual(["Presente"]);
    expect(boxClearOfProvince(cfg, invert(regionA), placed[0])).toBe(true);
    expect(placed[0].x).toBeGreaterThan(0.7 * cfg.viewW);
  });

  it("keeps a sea label off the land even when its anchor is near land", () => {
    // Land fills the left 70%; the sea (anchor) is the right 30%. A sea label
    // seeded on the land edge must still land on water.
    const land = provinceGrid(cfg, { x0: 0, y0: 0, x1: 0.7, y1: 1 });
    const seeds: LabelSeed[] = [
      {
        name: "Mar Ligure",
        kind: "sea",
        nick: false,
        seedX: 680,
        seedY: 400,
        anchor: invert(land),
        avoid: land,
      },
    ];
    const placed = placeLabels(seeds);
    expect(placed).toHaveLength(1);
    // Its whole box must be clear of the land mask.
    expect(boxClearOfProvince(cfg, land, placed[0])).toBe(true);
    expect(placed[0].x).toBeGreaterThan(0.7 * cfg.viewW);
  });

  it("lets a sea name hug the coast when the water sliver is too small alone", () => {
    // Water is only a thin vertical sliver (right ~4%); the rest is coast. Even
    // wrapped, the name can't fit the sliver alone under a hard land-avoid, but
    // soft-avoid lets it spill onto the shore, staying centred on the water.
    const land = provinceGrid(cfg, { x0: 0, y0: 0, x1: 0.96, y1: 1 });
    const water = invert(land);
    const seeds: LabelSeed[] = [
      {
        name: "Mar Ligure",
        kind: "sea",
        nick: false,
        seedX: 970,
        seedY: 400,
        anchor: water,
        softAvoid: land, // coast: allowed, but capped
      },
    ];
    const placed = placeLabels(seeds);
    expect(placed).toHaveLength(1);
    // Centre sits on the water sliver…
    const cell =
      Math.floor(placed[0].y / (cfg.viewH / cfg.gh)) * cfg.gw +
      Math.floor(placed[0].x / (cfg.viewW / cfg.gw));
    expect(water[cell]).toBe(1);
    // …and it did NOT need to fit entirely on water (it hugs the coast).
    expect(boxClearOfProvince(cfg, land, placed[0])).toBe(false);
  });

  it("wraps a long two-word name to sit horizontally instead of vertical", () => {
    // Free space is a wide, short strip (450×200) — like a coastal band. A long
    // single-line ribbon can't lie flat in it, but split across two lines it
    // packs a squarer box that drops in horizontally, far bigger than any
    // vertical orientation the short height allows.
    const { gw, gh } = cfg;
    const grid = new Uint8Array(gw * gh).fill(1);
    const gx0 = Math.floor(0.5 * gw); // x ∈ [500, 950]
    const gx1 = Math.floor(0.95 * gw);
    const gy0 = Math.floor(0.375 * gh); // y ∈ [300, 500]
    const gy1 = Math.floor(0.625 * gh);
    for (let y = gy0; y < gy1; y++) {
      for (let x = gx0; x < gx1; x++) grid[y * gw + x] = 0;
    }
    const seeds: LabelSeed[] = [
      {
        name: "Ombrelloni sovrapprezzati",
        kind: "province",
        nick: true,
        seedX: 725,
        seedY: 400,
        anchor: invert(grid),
        avoid: grid,
      },
    ];
    const placed = placeLabels(seeds);
    expect(placed).toHaveLength(1);
    // It wrapped to two lines and reads roughly horizontal, not vertical.
    expect(placed[0].lines).toHaveLength(2);
    expect(Math.abs(placed[0].angle)).toBeLessThan(25);
    expect(boxClearOfProvince(cfg, grid, placed[0])).toBe(true);
  });

  it("falls back to a shorter name when the preferred one won't fit", () => {
    // Only a small square gap is free — too small for the long nickname at any
    // orientation, but the short fallback fits. The label survives as the plain
    // name rather than dropping.
    const { gw, gh } = cfg;
    const grid = new Uint8Array(gw * gh).fill(1);
    const gx0 = Math.floor(0.44 * gw); // ~120×96 vb gap around the centre
    const gx1 = Math.floor(0.56 * gw);
    const gy0 = Math.floor(0.44 * gh);
    const gy1 = Math.floor(0.56 * gh);
    for (let y = gy0; y < gy1; y++) {
      for (let x = gx0; x < gx1; x++) grid[y * gw + x] = 0;
    }
    const seeds: LabelSeed[] = [
      {
        name: "Ombrelloni sovrapprezzati",
        kind: "province",
        nick: true,
        seedX: 500,
        seedY: 400,
        anchor: invert(grid),
        avoid: grid,
        altNames: ["Imperia"],
      },
    ];
    const placed = placeLabels(seeds);
    expect(placed).toHaveLength(1);
    expect(placed[0].name).toBe("Imperia");
    // The fallback is the real name, so it drops the italic/bold nick styling.
    expect(placed[0].nick).toBe(false);
    expect(boxClearOfProvince(cfg, grid, placed[0])).toBe(true);
  });

  it("keeps the preferred name (shrunk to fit) over a shorter alt that fits bigger", () => {
    // A gap that fits the long preferred name only small, but the short fallback
    // much larger. The fallback is a rescue, not a preference: the preferred name
    // wins as long as it fits at all, even at a smaller font.
    const { gw, gh } = cfg;
    const grid = new Uint8Array(gw * gh).fill(1);
    const gx0 = 90; // x ∈ [450, 545] — ~95×45 vb
    const gx1 = 109;
    const gy0 = 76; // y ∈ [380, 425]
    const gy1 = 85;
    for (let y = gy0; y < gy1; y++) {
      for (let x = gx0; x < gx1; x++) grid[y * gw + x] = 0;
    }
    const seeds: LabelSeed[] = [
      {
        name: "Costiera Serena",
        kind: "province",
        nick: true,
        seedX: 497,
        seedY: 402,
        anchor: invert(grid),
        avoid: grid,
        altNames: ["Bari"],
      },
    ];
    const placed = placeLabels(seeds);
    expect(placed).toHaveLength(1);
    expect(placed[0].name).toBe("Costiera Serena");
    // It kept the nickname (small), so nick styling stays on.
    expect(placed[0].nick).toBe(true);
    expect(boxClearOfProvince(cfg, grid, placed[0])).toBe(true);
  });

  it("does not overlap two labels competing for the same side", () => {
    const grid = provinceGrid(cfg);
    const seeds: LabelSeed[] = [
      {
        name: "Uno",
        kind: "country",
        nick: false,
        seedX: 500,
        seedY: 70,
        avoid: grid,
      },
      {
        name: "Due",
        kind: "country",
        nick: false,
        seedX: 520,
        seedY: 80,
        avoid: grid,
      },
    ];
    const placed = placeLabels(seeds);
    // Both should land somewhere legal, clear of the province and each other.
    for (const l of placed) expect(boxClearOfProvince(cfg, grid, l)).toBe(true);
    if (placed.length === 2) {
      const [a, b] = placed;
      const overlap =
        Math.abs(a.x - b.x) < 40 &&
        Math.abs(a.y - b.y) < 40 &&
        a.angle === b.angle;
      expect(overlap).toBe(false);
    }
  });
});
