const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function crc32(buf) {
  let crc = -1;
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcData = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function createPNG(w, h, r, g, b) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = [];
  for (let y = 0; y < h; y++) {
    raw.push(0);
    for (let x = 0; x < w; x++) raw.push(r, g, b);
  }
  const compressed = zlib.deflateSync(Buffer.from(raw));
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const dir = path.join(__dirname, "..", "public", "assets", "images");
fs.mkdirSync(dir, { recursive: true });

const files = [
  ["logo.png", 2, 2, 255, 215, 0],
  ["btn-normal.png", 2, 2, 50, 50, 80],
  ["btn-hover.png", 2, 2, 80, 80, 120],
  ["btn-active.png", 2, 2, 120, 120, 160],
  ["loading-bg.png", 2, 2, 34, 34, 34],
  ["loading-fill.png", 2, 2, 0, 200, 0],
  ["particle.png", 2, 2, 255, 255, 255],
];

files.forEach(([name, w, h, r, g, b]) => {
  fs.writeFileSync(path.join(dir, name), createPNG(w, h, r, g, b));
  console.log(`Created ${name}`);
});
