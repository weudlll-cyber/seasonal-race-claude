// ============================================================
// File:        gen-snowmobile-sprite.mjs
// Path:        scripts/gen-snowmobile-sprite.mjs
// Project:     RaceArena
// Usage:       node scripts/gen-snowmobile-sprite.mjs
// Description: Downscales snowboard-ride.png (17328×1083, 16 frames of
//              1083×1083) to snowmobile.png (3072×192, 16 frames of
//              192×192) using Lanczos3 resampling.
//              Source snowboard-ride.png is left untouched.
// ============================================================

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../');
const SRC  = path.join(ROOT, 'client/public/assets/racers/snowboard-ride.png');
const OUT  = path.join(ROOT, 'client/public/assets/racers/snowmobile.png');

const FRAME_COUNT    = 16;
const OUT_FRAME_SIZE = 192;

const meta = await sharp(SRC).metadata();
const srcW = meta.width;
const srcH = meta.height;
const frameW = Math.round(srcW / FRAME_COUNT);

console.log(`Source:  ${srcW}×${srcH}  (${FRAME_COUNT} frames of ${frameW}×${srcH})`);
console.log(`Output:  ${OUT_FRAME_SIZE * FRAME_COUNT}×${OUT_FRAME_SIZE}  (${FRAME_COUNT} frames of ${OUT_FRAME_SIZE}×${OUT_FRAME_SIZE})`);

const frameBufs = [];
for (let i = 0; i < FRAME_COUNT; i++) {
  const buf = await sharp(SRC)
    .extract({ left: i * frameW, top: 0, width: frameW, height: srcH })
    .resize(OUT_FRAME_SIZE, OUT_FRAME_SIZE, {
      kernel: sharp.kernel.lanczos3,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  frameBufs.push(buf);
  process.stdout.write(`  frame ${String(i).padStart(2)} done\r`);
}
console.log(`  all ${FRAME_COUNT} frames resized`);

const outW = OUT_FRAME_SIZE * FRAME_COUNT;
const outH = OUT_FRAME_SIZE;

const composites = frameBufs.map((buf, i) => ({
  input: buf,
  left: i * OUT_FRAME_SIZE,
  top: 0,
}));

const outBuf = await sharp({
  create: {
    width: outW,
    height: outH,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(composites)
  .png()
  .toBuffer();

await sharp(outBuf).toFile(OUT);
const outMeta = await sharp(OUT).metadata();
console.log(`Written: ${OUT.split('/').pop()}  ${outMeta.width}×${outMeta.height}  (${(outBuf.length / 1024).toFixed(0)} KB)`);
