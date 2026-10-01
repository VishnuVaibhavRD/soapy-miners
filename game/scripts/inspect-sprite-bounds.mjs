/**
 * Decodes each camp sprite and reports the bounding box of its
 * non-transparent pixels, so we can see how much dead padding each
 * PNG carries and where the subject actually sits inside the frame.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";

const DIR = "public/images/game";

function readChunks(buf) {
  let off = 8;
  const chunks = [];

  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString(
      "latin1",
      off + 4,
      off + 8
    );
    const data = buf.subarray(
      off + 8,
      off + 8 + len
    );

    chunks.push({ type, data });
    off += 12 + len;
  }

  return chunks;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);

  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function alphaBounds(file) {
  const buf = readFileSync(file);
  const chunks = readChunks(buf);

  const ihdr = chunks.find(
    (c) => c.type === "IHDR"
  ).data;

  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const depth = ihdr[8];
  const colorType = ihdr[9];
  const interlace = ihdr[12];

  if (
    depth !== 8 ||
    colorType !== 6 ||
    interlace !== 0
  ) {
    return {
      width,
      height,
      note: `unsupported (depth=${depth} color=${colorType} interlace=${interlace})`,
    };
  }

  const idat = Buffer.concat(
    chunks
      .filter((c) => c.type === "IDAT")
      .map((c) => c.data)
  );

  const raw = inflateSync(idat);
  const bpp = 4;
  const stride = width * bpp;

  const out = Buffer.alloc(
    height * stride
  );

  let pos = 0;

  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const rowStart = y * stride;
    const prevStart = (y - 1) * stride;

    for (let x = 0; x < stride; x++) {
      const rawByte = raw[pos + x];
      const a =
        x >= bpp
          ? out[rowStart + x - bpp]
          : 0;
      const b =
        y > 0 ? out[prevStart + x] : 0;
      const c =
        x >= bpp && y > 0
          ? out[prevStart + x - bpp]
          : 0;

      let val;

      switch (filter) {
        case 0:
          val = rawByte;
          break;
        case 1:
          val = rawByte + a;
          break;
        case 2:
          val = rawByte + b;
          break;
        case 3:
          val =
            rawByte +
            ((a + b) >> 1);
          break;
        case 4:
          val =
            rawByte +
            paeth(a, b, c);
          break;
        default:
          throw new Error(
            `bad filter ${filter}`
          );
      }

      out[rowStart + x] = val & 0xff;
    }

    pos += stride;
  }

  const ALPHA = 16;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let opaque = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha =
        out[y * stride + x * bpp + 3];

      if (alpha > ALPHA) {
        opaque++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxY < 0) {
    return {
      width,
      height,
      note: "fully transparent",
    };
  }

  return {
    width,
    height,
    minX,
    minY,
    maxX,
    maxY,
    padTop: (minY / height) * 100,
    padBottom:
      ((height - 1 - maxY) / height) *
      100,
    padLeft: (minX / width) * 100,
    padRight:
      ((width - 1 - maxX) / width) * 100,
    coverage:
      (opaque / (width * height)) * 100,
  };
}

const files = readdirSync(DIR).filter(
  (f) => f.endsWith(".png")
);

for (const f of files) {
  try {
    const r = alphaBounds(join(DIR, f));

    if (r.note) {
      console.log(
        `${f.padEnd(24)} ${r.width}x${r.height}  ${r.note}`
      );
      continue;
    }

    console.log(
      `${f.padEnd(24)} ${String(r.width).padStart(4)}x${String(r.height).padEnd(5)} ` +
        `subject=${r.maxX - r.minX + 1}x${r.maxY - r.minY + 1} ` +
        `padT=${r.padTop.toFixed(1)}% padB=${r.padBottom.toFixed(1)}% ` +
        `padL=${r.padLeft.toFixed(1)}% padR=${r.padRight.toFixed(1)}% ` +
        `ink=${r.coverage.toFixed(1)}%`
    );
  } catch (err) {
    console.log(
      `${f.padEnd(24)} ERROR ${err.message}`
    );
  }
}
