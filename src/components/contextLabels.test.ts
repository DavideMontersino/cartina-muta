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

/** Is the (padded) box of a placed label clear of the province rectangle? */
function boxClearOfProvince(
  cfg: PlaceConfig,
  grid: Uint8Array,
  l: { x: number; y: number; angle: number; fontVB: number; name: string },
): boolean {
  const { gw, gh, viewW, viewH, charWidth, lineHeight, padVB } = cfg;
  const cellW = viewW / gw;
  const cellH = viewH / gh;
  const runHalf = 0.5 * charWidth * l.name.length * l.fontVB + padVB;
  const capHalf = 0.5 * lineHeight * l.fontVB + padVB;
  const hx = l.angle === 0 ? runHalf : capHalf;
  const hy = l.angle === 0 ? capHalf : runHalf;
  const gx0 = Math.max(0, Math.floor((l.x - hx) / cellW));
  const gx1 = Math.min(gw - 1, Math.floor((l.x + hx) / cellW));
  const gy0 = Math.max(0, Math.floor((l.y - hy) / cellH));
  const gy1 = Math.min(gh - 1, Math.floor((l.y + hy) / cellH));
  for (let y = gy0; y <= gy1; y++) {
    for (let x = gx0; x <= gx1; x++) {
      if (grid[y * gw + x]) return false;
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
      const runHalf = 0.5 * cfg.charWidth * l.name.length * l.fontVB;
      const capHalf = 0.5 * cfg.lineHeight * l.fontVB;
      const hx = l.angle === 0 ? runHalf : capHalf;
      const hy = l.angle === 0 ? capHalf : runHalf;
      expect(l.x - hx).toBeGreaterThanOrEqual(0);
      expect(l.x + hx).toBeLessThanOrEqual(cfg.viewW);
      expect(l.y - hy).toBeGreaterThanOrEqual(0);
      expect(l.y + hy).toBeLessThanOrEqual(cfg.viewH);
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
    expect(Math.abs(placed[0].angle)).toBe(90);
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
