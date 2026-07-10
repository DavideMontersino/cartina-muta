/**
 * Minimal, dependency-free PNG encoder (8-bit RGB) built on Node's built-in
 * zlib. Enough to write the baked hillshade rasters without pulling in a native
 * image library — the terrain pipeline stays install-light (see extract-relief).
 *
 * Rows are Paeth-filtered (PNG filter type 4) before deflate, which compresses
 * the smooth relief gradients far better than storing them raw.
 */
import { deflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/** Paeth predictor (PNG spec 6.6): pick the neighbour closest to a+b−c. */
export function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * Paeth-filter an RGB pixel buffer (`width*height*3` bytes) into deflate-ready
 * scanlines, each prefixed with the filter-type byte. Pure — unit-testable.
 */
export function filterRgb(
  rgb: Uint8Array,
  width: number,
  height: number,
): Buffer {
  const bpp = 3;
  const stride = width * bpp;
  const out = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    const outStart = y * (stride + 1);
    out[outStart] = 4; // filter type: Paeth
    for (let x = 0; x < stride; x++) {
      const raw = rgb[rowStart + x];
      const a = x >= bpp ? rgb[rowStart + x - bpp] : 0;
      const b = y > 0 ? rgb[rowStart - stride + x] : 0;
      const c = y > 0 && x >= bpp ? rgb[rowStart - stride + x - bpp] : 0;
      out[outStart + 1 + x] = (raw - paeth(a, b, c)) & 0xff;
    }
  }
  return out;
}

/** Encode an 8-bit RGB pixel buffer as a PNG file. */
export function encodePng(
  rgb: Uint8Array,
  width: number,
  height: number,
): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour (RGB)
  ihdr[10] = 0; // compression: deflate
  ihdr[11] = 0; // filter method: adaptive
  ihdr[12] = 0; // interlace: none

  const idat = deflateSync(filterRgb(rgb, width, height), { level: 9 });

  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
