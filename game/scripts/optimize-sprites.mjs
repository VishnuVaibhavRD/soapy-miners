/**
 * Trims the transparent padding baked into each camp sprite and downscales
 * it to display resolution.
 *
 * Why: the camp positions objects by their "feet" (the bottom edge of the
 * element box). When a PNG carries transparent padding the drawn subject
 * floats above that box by a different amount per image, so ground shadows
 * detach and objects in the same row sit at different heights.
 *
 * Originals are moved to art-source/ (outside public/) before overwriting.
 */
import {
  existsSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import {
  deflateSync,
  inflateSync,
} from "node:zlib";

const PUBLIC_DIR = "public/images/game";
const BACKUP_DIR = "art-source";
const MAX_EDGE = 512;
const ALPHA_CUTOFF = 8;

const SPRITES = [
  "blacksmith.png",
  "gold-trader.png",
  "market-stall.png",
  "mine-entrance.png",
  "quai-mine-entrance.png",
  "storage-chest.png",
];

/* ---------- PNG decode (8-bit RGBA, non-interlaced) ---------- */

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

    chunks.push({
      type,
      data: buf.subarray(
        off + 8,
        off + 8 + len
      ),
    });

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

function decode(buf) {
  const chunks = readChunks(buf);
  const ihdr = chunks.find(
    (c) => c.type === "IHDR"
  ).data;

  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);

  if (
    ihdr[8] !== 8 ||
    ihdr[9] !== 6 ||
    ihdr[12] !== 0
  ) {
    throw new Error(
      "expected 8-bit RGBA non-interlaced"
    );
  }

  const raw = inflateSync(
    Buffer.concat(
      chunks
        .filter((c) => c.type === "IDAT")
        .map((c) => c.data)
    )
  );

  const bpp = 4;
  const stride = width * bpp;
  const out = Buffer.alloc(
    height * stride
  );

  let pos = 0;

  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const row = y * stride;
    const prev = (y - 1) * stride;

    for (let x = 0; x < stride; x++) {
      const rb = raw[pos + x];
      const a =
        x >= bpp ? out[row + x - bpp] : 0;
      const b = y > 0 ? out[prev + x] : 0;
      const c =
        x >= bpp && y > 0
          ? out[prev + x - bpp]
          : 0;

      let v;

      switch (filter) {
        case 0:
          v = rb;
          break;
        case 1:
          v = rb + a;
          break;
        case 2:
          v = rb + b;
          break;
        case 3:
          v = rb + ((a + b) >> 1);
          break;
        case 4:
          v = rb + paeth(a, b, c);
          break;
        default:
          throw new Error(
            `bad filter ${filter}`
          );
      }

      out[row + x] = v & 0xff;
    }

    pos += stride;
  }

  return { width, height, data: out };
}

/* ---------- PNG encode ---------- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);

  for (let n = 0; n < 256; n++) {
    let c = n;

    for (let k = 0; k < 8; k++) {
      c =
        c & 1
          ? 0xedb88320 ^ (c >>> 1)
          : c >>> 1;
    }

    t[n] = c;
  }

  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;

  for (let i = 0; i < buf.length; i++) {
    c =
      CRC_TABLE[(c ^ buf[i]) & 0xff] ^
      (c >>> 8);
  }

  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);

  const body = Buffer.concat([
    Buffer.from(type, "latin1"),
    data,
  ]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));

  return Buffer.concat([
    len,
    body,
    crc,
  ]);
}

function encode({ width, height, data }) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const stride = width * 4;
  const rows = Buffer.alloc(
    height * (stride + 1)
  );

  for (let y = 0; y < height; y++) {
    rows[y * (stride + 1)] = 0;

    data.copy(
      rows,
      y * (stride + 1) + 1,
      y * stride,
      y * stride + stride
    );
  }

  return Buffer.concat([
    Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d,
      0x0a, 0x1a, 0x0a,
    ]),
    chunk("IHDR", ihdr),
    chunk(
      "IDAT",
      deflateSync(rows, { level: 9 })
    ),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------- ops ---------- */

function alphaBox(img) {
  const { width, height, data } = img;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (
        data[
          y * width * 4 + x * 4 + 3
        ] > ALPHA_CUTOFF
      ) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  return { minX, minY, maxX, maxY };
}

function crop(img, box) {
  const w = box.maxX - box.minX + 1;
  const h = box.maxY - box.minY + 1;
  const out = Buffer.alloc(w * h * 4);

  for (let y = 0; y < h; y++) {
    img.data.copy(
      out,
      y * w * 4,
      (y + box.minY) * img.width * 4 +
        box.minX * 4,
      (y + box.minY) * img.width * 4 +
        (box.minX + w) * 4
    );
  }

  return {
    width: w,
    height: h,
    data: out,
  };
}

/** Box-filter downscale on premultiplied alpha to avoid edge halos. */
function resize(img, w, h) {
  const out = Buffer.alloc(w * h * 4);
  const sx = img.width / w;
  const sy = img.height / h;

  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y * sy);
    const y1 = Math.min(
      img.height,
      Math.max(
        y0 + 1,
        Math.floor((y + 1) * sy)
      )
    );

    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * sx);
      const x1 = Math.min(
        img.width,
        Math.max(
          x0 + 1,
          Math.floor((x + 1) * sx)
        )
      );

      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;

      for (let yy = y0; yy < y1; yy++) {
        for (
          let xx = x0;
          xx < x1;
          xx++
        ) {
          const i =
            yy * img.width * 4 + xx * 4;
          const al = img.data[i + 3];

          r += img.data[i] * al;
          g += img.data[i + 1] * al;
          b += img.data[i + 2] * al;
          a += al;
          n++;
        }
      }

      const o = y * w * 4 + x * 4;
      const avgA = a / n;

      if (a > 0) {
        out[o] = Math.round(r / a);
        out[o + 1] = Math.round(g / a);
        out[o + 2] = Math.round(b / a);
      }

      out[o + 3] = Math.round(avgA);
    }
  }

  return { width: w, height: h, data: out };
}

/* ---------- run ---------- */

if (!existsSync(BACKUP_DIR)) {
  mkdirSync(BACKUP_DIR, {
    recursive: true,
  });
}

for (const name of SPRITES) {
  const target = join(PUBLIC_DIR, name);
  const backup = join(BACKUP_DIR, name);

  if (!existsSync(backup)) {
    copyFileSync(target, backup);
  }

  const before = statSync(target).size;
  const img = decode(
    readFileSync(backup)
  );

  const box = alphaBox(img);
  let next = crop(img, box);

  const scale = Math.min(
    1,
    MAX_EDGE /
      Math.max(next.width, next.height)
  );

  if (scale < 1) {
    next = resize(
      next,
      Math.max(
        1,
        Math.round(next.width * scale)
      ),
      Math.max(
        1,
        Math.round(next.height * scale)
      )
    );
  }

  writeFileSync(target, encode(next));

  const after = statSync(target).size;

  console.log(
    `${name.padEnd(24)} ${img.width}x${img.height} -> ${next.width}x${next.height}  ` +
      `${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB  ` +
      `(-${(100 - (after / before) * 100).toFixed(0)}%)`
  );
}
