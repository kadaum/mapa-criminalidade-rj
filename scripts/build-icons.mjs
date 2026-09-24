import fs from 'node:fs/promises';
import sharp from 'sharp';

const root = new URL('../public/', import.meta.url);
const svg = await fs.readFile(new URL('favicon.svg', root));
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((size) => sharp(svg).resize(size, size).png().toBuffer()));

const directory = Buffer.alloc(6 + 16 * sizes.length);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(sizes.length, 4);
let offset = directory.length;
for (let i = 0; i < sizes.length; i++) {
  const start = 6 + 16 * i;
  directory.writeUInt8(sizes[i], start);
  directory.writeUInt8(sizes[i], start + 1);
  directory.writeUInt16LE(1, start + 4);
  directory.writeUInt16LE(32, start + 6);
  directory.writeUInt32LE(pngs[i].length, start + 8);
  directory.writeUInt32LE(offset, start + 12);
  offset += pngs[i].length;
}
await fs.writeFile(new URL('favicon.ico', root), Buffer.concat([directory, ...pngs]));

const appleGlyph = await sharp(svg).resize(144, 144).png().toBuffer();
const appleIcon = await sharp({ create: { width: 180, height: 180, channels: 4, background: '#0b2338' } })
  .composite([{ input: appleGlyph, left: 18, top: 18 }])
  .png()
  .toBuffer();
await fs.writeFile(new URL('apple-touch-icon.png', root), appleIcon);
console.log(JSON.stringify({ faviconSizes: sizes, appleTouchSize: 180 }));
