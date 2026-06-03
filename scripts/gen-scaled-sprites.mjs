// ============================================================
// File:        gen-scaled-sprites.mjs
// Path:        scripts/gen-scaled-sprites.mjs
// Project:     RaceArena
// Usage:       node scripts/gen-scaled-sprites.mjs
// Description: Downscales three aquatic racer spritesheets to their
//              target frame sizes using Lanczos3 resampling via sharp.
//              Overwrites source files in-place.
//
//              Input / output:
//                turtle-swim.png   12544×784  → 2048×128  (128×128 per frame)
//                manta-swim.png    13600×850  → 2048×128  (128×128 per frame)
//                dolphin-swim.png  32000×2000 → 2560×160  (160×160 per frame)
// ============================================================

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../');
const ASSETS = path.join(ROOT, 'client/public/assets/racers');

const SPECS = [
  { file: 'turtle-swim.png', dstW: 2048, dstH: 128 },
  { file: 'manta-swim.png', dstW: 2048, dstH: 128 },
  { file: 'dolphin-swim.png', dstW: 2560, dstH: 160 },
];

for (const { file, dstW, dstH } of SPECS) {
  const filePath = path.join(ASSETS, file);
  const buf = await sharp(filePath)
    .resize(dstW, dstH, { kernel: sharp.kernel.lanczos3, fit: 'fill' })
    .png()
    .toBuffer();
  const { width, height } = await sharp(buf).metadata();
  fs.writeFileSync(filePath, buf);
  console.log(`${file}: ${width}×${height}  (${(buf.length / 1024).toFixed(0)} KB)`);
}

console.log('\nAll sprites downscaled.');
