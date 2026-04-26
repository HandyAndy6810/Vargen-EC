/**
 * Generates all required Expo image assets using only Node built-ins.
 * Produces: icon.png (1024), adaptive-icon.png (1024), splash.png (1284x2778), favicon.png (48)
 * Brand: orange (#f26a2a) background, white lightning bolt — Vargen Electrical
 */
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC32 ──────────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ── PNG chunk builder ──────────────────────────────────────────────────────
function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const l = Buffer.allocUnsafe(4); l.writeUInt32BE(data.length, 0);
  const v = crc32(Buffer.concat([t, data]));
  const cr = Buffer.allocUnsafe(4); cr.writeUInt32BE(v, 0);
  return Buffer.concat([l, t, data, cr]);
}

// ── PNG encoder ───────────────────────────────────────────────────────────
function makePNG(w, h, pixelFn) {
  const row = 1 + w * 4;
  const raw = Buffer.alloc(h * row);
  for (let y = 0; y < h; y++) {
    raw[y * row] = 0; // filter: none
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = pixelFn(x / w, y / h);
      const i = y * row + 1 + x * 4;
      raw[i] = r; raw[i+1] = g; raw[i+2] = b; raw[i+3] = a;
    }
  }
  const comp = zlib.deflateSync(raw, { level: 6 });
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', comp),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Point-in-polygon (ray casting) ────────────────────────────────────────
function pip(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

// ── Lightning bolt polygon (0..1 space) ───────────────────────────────────
// Classic bolt: wide top-right, narrows, crosses mid, widens bottom-left
const BOLT = [
  [0.63, 0.07],
  [0.30, 0.50],
  [0.50, 0.50],
  [0.26, 0.93],
  [0.62, 0.48],
  [0.43, 0.48],
  [0.70, 0.07],
];

function inBolt(nx, ny, pad = 0.13) {
  const bx = (nx - pad) / (1 - 2 * pad);
  const by = (ny - pad) / (1 - 2 * pad);
  return pip(bx, by, BOLT);
}

// ── Colour palette ────────────────────────────────────────────────────────
const ORANGE = [242, 106, 42, 255];
const INK    = [20, 19, 16, 255];
const WHITE  = [255, 255, 255, 255];

// ── Generate ──────────────────────────────────────────────────────────────
const out = path.join(__dirname, 'mobile/assets/images');
fs.mkdirSync(out, { recursive: true });

const assets = [
  // [filename, width, height, bgColor, boltColor, boltPad]
  ['icon.png',          1024, 1024, ORANGE, WHITE,  0.13],
  ['adaptive-icon.png', 1024, 1024, ORANGE, WHITE,  0.13],
  ['splash.png',        1284, 2778, INK,    ORANGE, 0.30],
  ['favicon.png',         48,   48, ORANGE, WHITE,  0.10],
];

for (const [name, w, h, bg, bolt, pad] of assets) {
  process.stdout.write(`Generating ${name} (${w}×${h})…`);
  const buf = makePNG(w, h, (nx, ny) => inBolt(nx, ny, pad) ? bolt : bg);
  fs.writeFileSync(path.join(out, name), buf);
  console.log(' ✓');
}

console.log('\nAll assets written to mobile/assets/images/');
