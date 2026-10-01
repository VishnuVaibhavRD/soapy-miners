/**
 * Imports a generated backdrop into public/images/game at a sane weight.
 * Handles RGB and RGBA PNGs; downscales with a box filter.
 *
 * usage: node scripts/import-backdrop.mjs <source.png> <out-name> [maxEdge]
 */
import {
  readFileSync,
  writeFileSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import {
  deflateSync,
  inflateSync,
} from "node:zlib";

const [, , SRC, OUT, MAX_ARG] =
  process.argv;
const MAX_EDGE = Number(MAX_ARG) || 1024;
const DEST = join(
  "public/images/game",
  OUT
);

function readChunks(buf) {
  let off = 8;
  const chunks = [];

  while (off < buf.length) {
    const len = buf.readUInt32BE(off);

    chunks.push({
      type: buf.toString(
        "latin1",
        off + 4,
        off + 8
      ),
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
  const depth = ihdr[8];
  const color = ihdr[9];

  if (
    depth !== 8 ||
    (color !== 2 && color !== 6) ||
    ihdr[12] !== 0
  ) {
    throw new Error(
      `unsupported png depth=${depth} color=${color}`
    );
  }

  const channels = color === 6 ? 4 : 3;
  const raw = inflateSync(
    Buffer.concat(
      chunks
        .filter((c) => c.type === "IDAT")
        .map((c) => c.data)
    )
  );

  const stride = width * channels;
  const flat = Buffer.alloc(
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
        x >= channels
          ? flat[row + x - channels]
          : 0;
      const b = y > 0 ? flat[prev + x] : 0;
      const c =
        x >= channels && y > 0
          ? flat[prev + x - channels]
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

      flat[row + x] = v & 0xff;
    }

    pos += stride;
  }

  if (channels === 4) {
    return {
      width,
      height,
      data: flat,
    };
  }

  const rgba = Buffer.alloc(
    width * height * 4
  );

  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = flat[i * 3];
    rgba[i * 4 + 1] = flat[i * 3 + 1];
    rgba[i * 4 + 2] = flat[i * 3 + 2];
    rgba[i * 4 + 3] = 255;
  }

  return { width, height, data: rgba };
}

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

  return Buffer.concat([len, body, crc]);
}

/** Encode as opaque RGB — a backdrop never needs an alpha channel. */
function encodeRGB({
  width,
  height,
  data,
}) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;

  const stride = width * 3;
  const rows = Buffer.alloc(
    height * (stride + 1)
  );

  for (let y = 0; y < height; y++) {
    const o = y * (stride + 1);
    rows[o] = 0;

    for (let x = 0; x < width; x++) {
      const s = (y * width + x) * 4;
      rows[o + 1 + x * 3] = data[s];
      rows[o + 2 + x * 3] = data[s + 1];
      rows[o + 3 + x * 3] = data[s + 2];
    }
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
      let n = 0;

      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i =
            (yy * img.width + xx) * 4;

          r += img.data[i];
          g += img.data[i + 1];
          b += img.data[i + 2];
          n++;
        }
      }

      const o = (y * w + x) * 4;
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n);
      out[o + 3] = 255;
    }
  }

  return { width: w, height: h, data: out };
}

const img = decode(readFileSync(SRC));
const scale = Math.min(
  1,
  MAX_EDGE /
    Math.max(img.width, img.height)
);

const next =
  scale < 1
    ? resize(
        img,
        Math.round(img.width * scale),
        Math.round(img.height * scale)
      )
    : img;

writeFileSync(DEST, encodeRGB(next));

console.log(
  `${OUT}: ${img.width}x${img.height} -> ${next.width}x${next.height}  ` +
    `${(statSync(SRC).size / 1024).toFixed(0)}KB -> ${(statSync(DEST).size / 1024).toFixed(0)}KB`
);
