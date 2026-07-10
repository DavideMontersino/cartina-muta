import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { encodePng, filterRgb, paeth } from "./png";

describe("paeth", () => {
  it("picks the neighbour closest to a+b−c", () => {
    expect(paeth(10, 20, 10)).toBe(20); // p=20 → b
    expect(paeth(10, 20, 30)).toBe(10); // p=0 → a (|p-a|=10 smallest)
    expect(paeth(0, 0, 0)).toBe(0);
  });
});

/** Undo Paeth (filter 4) scanlines back into an RGB buffer. */
function unfilter(filtered: Buffer, width: number, height: number): Uint8Array {
  const bpp = 3;
  const stride = width * bpp;
  const out = new Uint8Array(width * height * bpp);
  let rp = 0;
  for (let y = 0; y < height; y++) {
    expect(filtered[rp++]).toBe(4);
    for (let x = 0; x < stride; x++) {
      const v = filtered[rp++];
      const a = x >= bpp ? out[y * stride + x - bpp] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0;
      out[y * stride + x] = (v + paeth(a, b, c)) & 0xff;
    }
  }
  return out;
}

describe("filterRgb", () => {
  it("is reversible (Paeth filter then unfilter round-trips)", () => {
    const width = 4;
    const height = 3;
    const rgb = new Uint8Array(width * height * 3);
    for (let i = 0; i < rgb.length; i++) rgb[i] = (i * 37) % 256;
    const filtered = filterRgb(rgb, width, height);
    expect(Array.from(unfilter(filtered, width, height))).toEqual(
      Array.from(rgb),
    );
  });
});

describe("encodePng", () => {
  it("writes a valid PNG whose IDAT inflates to the filtered pixels", () => {
    const width = 2;
    const height = 2;
    const rgb = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 0]);
    const png = encodePng(rgb, width, height);

    // PNG signature.
    expect(Array.from(png.subarray(0, 8))).toEqual([
      137, 80, 78, 71, 13, 10, 26, 10,
    ]);
    // First chunk is IHDR carrying the dimensions.
    expect(png.toString("ascii", 12, 16)).toBe("IHDR");
    expect(png.readUInt32BE(16)).toBe(width);
    expect(png.readUInt32BE(20)).toBe(height);

    // Locate IDAT, inflate, and confirm it decodes back to the pixels.
    const idatStart = png.indexOf(Buffer.from("IDAT", "ascii"));
    const len = png.readUInt32BE(idatStart - 4);
    const idat = png.subarray(idatStart + 4, idatStart + 4 + len);
    const decoded = unfilter(inflateSync(idat), width, height);
    expect(Array.from(decoded)).toEqual(Array.from(rgb));
  });
});
