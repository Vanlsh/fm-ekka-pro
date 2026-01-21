const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const OUTPUT_DIR = path.join(__dirname, "..", "build");
const ICONSET_DIR = path.join(OUTPUT_DIR, "icon.iconset");

const BG = { r: 15, g: 23, b: 42, a: 255 }; // #0f172a
const FG = { r: 248, g: 250, b: 252, a: 255 }; // #f8fafc

const LETTERS = {
  E: [
    "11111",
    "10000",
    "11110",
    "10000",
    "11110",
    "10000",
    "11111",
  ],
  K: [
    "10001",
    "10010",
    "10100",
    "11000",
    "10100",
    "10010",
    "10001",
  ],
  A: [
    "01110",
    "10001",
    "10001",
    "11111",
    "10001",
    "10001",
    "10001",
  ],
};

const WORD = ["E", "K", "K", "A"];
const GRID_W = WORD.length * 5 + (WORD.length - 1); // 1 column gap
const GRID_H = 7;

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const typeBuf = Buffer.from(type);
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([lengthBuf, typeBuf, data, crcBuf]);
};

const encodePNG = (width, height, rgba) => {
  const rowLen = width * 4;
  const raw = Buffer.alloc((rowLen + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (rowLen + 1);
    raw[rowStart] = 0; // filter
    rgba.copy(raw, rowStart + 1, y * rowLen, (y + 1) * rowLen);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

const drawIcon = (size) => {
  const pixels = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const idx = i * 4;
    pixels[idx] = BG.r;
    pixels[idx + 1] = BG.g;
    pixels[idx + 2] = BG.b;
    pixels[idx + 3] = BG.a;
  }

  const padding = Math.floor(size * 0.16);
  const usableW = size - padding * 2;
  const usableH = size - padding * 2;
  const scale = Math.max(
    1,
    Math.floor(Math.min(usableW / GRID_W, usableH / GRID_H))
  );
  const textW = GRID_W * scale;
  const textH = GRID_H * scale;
  const startX = Math.floor((size - textW) / 2);
  const startY = Math.floor((size - textH) / 2);

  let cursorX = 0;
  WORD.forEach((letter) => {
    const grid = LETTERS[letter];
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < 5; x++) {
        if (grid[y][x] !== "1") continue;
        const px = startX + (cursorX + x) * scale;
        const py = startY + y * scale;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const ix = (py + dy) * size + (px + dx);
            const idx = ix * 4;
            pixels[idx] = FG.r;
            pixels[idx + 1] = FG.g;
            pixels[idx + 2] = FG.b;
            pixels[idx + 3] = FG.a;
          }
        }
      }
    }
    cursorX += 6; // 5 + 1 gap
  });

  return encodePNG(size, size, pixels);
};

const writeFile = (filePath, data) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, data);
};

const buildIconSet = () => {
  fs.mkdirSync(ICONSET_DIR, { recursive: true });
  const sizes = [
    { size: 16, name: "icon_16x16.png" },
    { size: 32, name: "icon_16x16@2x.png" },
    { size: 32, name: "icon_32x32.png" },
    { size: 64, name: "icon_32x32@2x.png" },
    { size: 128, name: "icon_128x128.png" },
    { size: 256, name: "icon_128x128@2x.png" },
    { size: 256, name: "icon_256x256.png" },
    { size: 512, name: "icon_256x256@2x.png" },
    { size: 512, name: "icon_512x512.png" },
    { size: 1024, name: "icon_512x512@2x.png" },
  ];
  sizes.forEach(({ size, name }) => {
    const png = drawIcon(size);
    writeFile(path.join(ICONSET_DIR, name), png);
  });

  const appPng = drawIcon(1024);
  writeFile(path.join(OUTPUT_DIR, "icon.png"), appPng);

  const icoPng = drawIcon(256);
  const ico = buildIco([icoPng]);
  writeFile(path.join(OUTPUT_DIR, "icon.ico"), ico);
};

const buildIco = (pngBuffers) => {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  let offset = 6 + count * 16;
  const entries = [];
  const images = [];

  pngBuffers.forEach((png) => {
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    const entry = Buffer.alloc(16);
    entry[0] = width >= 256 ? 0 : width;
    entry[1] = height >= 256 ? 0 : height;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    entries.push(entry);
    images.push(png);
  });

  return Buffer.concat([header, ...entries, ...images]);
};

buildIconSet();
