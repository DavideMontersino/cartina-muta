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

/** Same obstacle for both surfaces — the common case in these tests. */
const both = (g: Uint8Array) => ({ land: g, sea: g });

type Placed = {
  x: number;
  y: number;
  angle: number;
  fontVB: number;
  name: string;
};

/** The four corners of a placed label's (unpadded) oriented box, in viewBox units. */
function corners(cfg: PlaceConfig, l: Placed): Array<[number, number]> {
  const r = (l.angle * Math.PI) / 180;
  const ux = Math.cos(r);
  const uy = Math.sin(r);
  const vx = -uy;
  const vy = ux;
  const hL = 0.5 * cfg.charWidth * l.name.length * l.fontVB;
  const hH = 0.5 * cfg.lineHeight * l.fontVB;
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
  const hL = 0.5 * charWidth * l.name.length * l.fontVB;
  const hH = 0.5 * lineHeight * l.fontVB;
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

  it("never places a label over the target province", () => {
    const grid = provinceGrid(cfg);
    // Anchors on all four sides of the province.
    const seeds: LabelSeed[] = [
      { name: "Nord", kind: "province", nick: false, seedX: 500, seedY: 60 },
      { name: "Sud", kind: "province", nick: false, seedX: 500, seedY: 740 },
      { name: "Ovest", kind: "province", nick: false, seedX: 60, seedY: 400 },
      { name: "Est", kind: "province", nick: false, seedX: 940, seedY: 400 },
    ];
    const placed = placeLabels(both(grid), seeds);
    expect(placed.length).toBeGreaterThan(0);
    for (const l of placed) {
      expect(boxClearOfProvince(cfg, grid, l)).toBe(true);
    }
  });

  it("keeps every placed label inside the viewBox", () => {
    const grid = provinceGrid(cfg);
    const seeds: LabelSeed[] = [
      { name: "Francia", kind: "country", nick: false, seedX: 40, seedY: 40 },
      { name: "Mare", kind: "sea", nick: false, seedX: 960, seedY: 760 },
    ];
    for (const l of placeLabels(both(grid), seeds)) {
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
        kind: "province",
        nick: false,
        seedX: 60,
        seedY: 400,
      },
    ];
    const placed = placeLabels(both(grid), seeds);
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
        kind: "province",
        nick: false,
        seedX: cx0,
        seedY: cy0,
      },
    ];
    const placed = placeLabels(both(grid), seeds);
    expect(placed).toHaveLength(1);
    // The (1,1) direction is +45° in SVG's y-down coordinates.
    expect(placed[0].angle).toBeGreaterThan(20);
    expect(placed[0].angle).toBeLessThan(70);
    expect(boxClearOfProvince(cfg, grid, placed[0])).toBe(true);
  });

  it("drops a label when there is no room near its anchor", () => {
    // Province covers everything but a sliver too thin for min font.
    const grid = provinceGrid(cfg, { x0: 0.02, y0: 0.02, x1: 0.99, y1: 0.99 });
    const seeds: LabelSeed[] = [
      { name: "Cuneo", kind: "province", nick: false, seedX: 500, seedY: 400 },
    ];
    expect(placeLabels(both(grid), seeds)).toHaveLength(0);
  });

  it("keeps a sea label off the land even when its anchor is near land", () => {
    // Land fills the left 70%; the sea is the right 30%. A sea label seeded on
    // the land edge must still land on water (the `sea` mask blocks all land).
    const land = provinceGrid(cfg, { x0: 0, y0: 0, x1: 0.7, y1: 1 });
    const seeds: LabelSeed[] = [
      { name: "Mar Ligure", kind: "sea", nick: false, seedX: 680, seedY: 400 },
    ];
    const placed = placeLabels({ land, sea: land }, seeds);
    expect(placed).toHaveLength(1);
    // Its whole box must be clear of the land mask.
    expect(boxClearOfProvince(cfg, land, placed[0])).toBe(true);
    expect(placed[0].x).toBeGreaterThan(0.7 * cfg.viewW);
  });

  it("does not overlap two labels competing for the same side", () => {
    const grid = provinceGrid(cfg);
    const seeds: LabelSeed[] = [
      { name: "Uno", kind: "province", nick: false, seedX: 500, seedY: 70 },
      { name: "Due", kind: "province", nick: false, seedX: 520, seedY: 80 },
    ];
    const placed = placeLabels(both(grid), seeds);
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
