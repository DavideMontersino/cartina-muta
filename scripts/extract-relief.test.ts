import { describe, expect, it } from "vitest";
import {
  decodeElevation,
  hillshade,
  hypsometricColor,
  outputSize,
  shadeColor,
} from "./extract-relief";

describe("decodeElevation", () => {
  it("decodes Terrarium terrain-RGB to metres", () => {
    // 32768 offset: (128,0,0) → 0 m sea level.
    expect(decodeElevation(128, 0, 0)).toBe(0);
    // Monviso-ish: 32768 + 3841 = R*256+G+B/256 → R=143, G=1, B=0 → 3841.
    expect(decodeElevation(143, 1, 0)).toBeCloseTo(3841, 5);
    expect(decodeElevation(0, 0, 0)).toBe(-32768);
  });
});

describe("hypsometricColor", () => {
  it("clamps below the first and above the last stop", () => {
    expect(hypsometricColor(-100)).toEqual([143, 157, 99]);
    expect(hypsometricColor(9000)).toEqual([236, 229, 210]);
  });

  it("interpolates linearly between stops", () => {
    // Midway between 0 m [143,157,99] and 250 m [170,172,110].
    const mid = hypsometricColor(125);
    expect(mid[0]).toBeCloseTo(156.5, 5);
    expect(mid[1]).toBeCloseTo(164.5, 5);
    expect(mid[2]).toBeCloseTo(104.5, 5);
  });

  it("rises monotonically toward pale peaks (green→pale)", () => {
    expect(hypsometricColor(4200)[0]).toBeGreaterThan(hypsometricColor(0)[0]);
  });
});

describe("hillshade", () => {
  it("lights flat ground to cos(zenith) — full sun at altitude 45°", () => {
    const flat = new Float32Array(9).fill(100);
    const s = hillshade(flat, 3, 3, 1, 1, 30, 30);
    expect(s).toBeCloseTo(Math.cos((45 * Math.PI) / 180), 6);
  });

  it("brightens slopes facing the sun more than those facing away", () => {
    const w = 3;
    const h = 3;
    // Elevation rising toward the east → the slope *faces west*, toward the
    // NW sun (azimuth 315°), so it should be brighter than its east-facing twin.
    const facesWest = new Float32Array([0, 0, 100, 0, 0, 100, 0, 0, 100]);
    const facesEast = new Float32Array([100, 0, 0, 100, 0, 0, 100, 0, 0]);
    const litWest = hillshade(facesWest, w, h, 1, 1, 30, 30);
    const litEast = hillshade(facesEast, w, h, 1, 1, 30, 30);
    expect(litWest).toBeGreaterThan(litEast);
    expect(litEast).toBeGreaterThanOrEqual(0);
  });
});

describe("shadeColor", () => {
  it("paints sea/nodata with the flat sea tint", () => {
    expect(shadeColor(0, 0.9)).toEqual([176, 201, 197]);
    expect(shadeColor(-50, 0.5)).toEqual([176, 201, 197]);
    expect(shadeColor(Number.NaN, 0.5)).toEqual([176, 201, 197]);
  });

  it("keeps the true hypsometric colour at mid shade (0.5)", () => {
    const c = shadeColor(600, 0.5);
    expect(c).toEqual(hypsometricColor(600));
  });

  it("darkens shadowed land and brightens lit land", () => {
    const dark = shadeColor(600, 0.1);
    const bright = shadeColor(600, 0.9);
    expect(dark[0]).toBeLessThan(bright[0]);
    for (const ch of [...dark, ...bright]) {
      expect(ch).toBeGreaterThanOrEqual(0);
      expect(ch).toBeLessThanOrEqual(255);
    }
  });
});

describe("outputSize", () => {
  it("puts the long side on the wider Mercator axis", () => {
    const wide = outputSize([6.6, 44.4, 8.5, 44.9], 1024);
    expect(wide.width).toBe(1024);
    expect(wide.height).toBeLessThan(1024);
    const tall = outputSize([7.0, 43.0, 7.4, 45.5], 1024);
    expect(tall.height).toBe(1024);
    expect(tall.width).toBeLessThan(1024);
  });
});
