// Renders art/icon.svg to all PNG sizes in public/icons/ (run: npm run icons).
import sharp from 'sharp';
import { readFile, mkdir } from 'node:fs/promises';

const svg = await readFile('art/icon.svg');
await mkdir('public/icons', { recursive: true });

for (const s of [48, 72, 96, 144, 192, 512])
  await sharp(svg).resize(s, s).png().toFile(`public/icons/icon-${s}.png`);

// maskable: same art, square-cornered so the launcher mask does the shaping
const maskable = (await readFile('art/icon.svg', 'utf8')).replace('rx="96"', 'rx="0"');
await sharp(Buffer.from(maskable)).resize(512, 512).png().toFile('public/icons/icon-512-maskable.png');

// Android splash: icon centered on the game's background color
const icon = await sharp(svg).resize(640, 640).png().toBuffer();
await sharp({ create: { width: 1080, height: 1920, channels: 4, background: '#04060c' } })
  .composite([{ input: icon, gravity: 'centre' }])
  .png().toFile('public/icons/splash.png');

console.log('wrote public/icons/ (6 sizes + maskable + splash)');
