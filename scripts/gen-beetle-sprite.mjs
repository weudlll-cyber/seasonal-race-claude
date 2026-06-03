// ============================================================
// File:        gen-beetle-sprite.mjs
// Path:        scripts/gen-beetle-sprite.mjs
// Project:     RaceArena
// Usage:       node scripts/gen-beetle-sprite.mjs
// Description: Generates beetle.png (1024×128, 8 frames) from the static
//              "vw beetle.png" source frame (1024×1024, black background).
//
//              Pipeline:
//                1. Remove black background (R+G+B < 15 → alpha=0;
//                   15–40 → partial alpha for anti-aliasing edges).
//                2. Box-average downsample 1024×1024 → 128×128.
//                3. For each of 8 frames: apply rotation ±3° (sine curve)
//                   via bilinear inverse-mapping at 128×128 resolution.
//                4. Write horizontal spritesheet 1024×128.
// ============================================================

import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../');
const SRC  = path.join(ROOT, 'client/public/assets/racers/vw beetle.png');
const OUT  = path.join(ROOT, 'client/public/assets/racers/beetle.png');

const FRAME_COUNT = 8;
const TARGET_W    = 128;
const TARGET_H    = 128;
const MAX_ANGLE   = (3 * Math.PI) / 180;  // 3° in radians

// ---- load source ----
const srcBuf = fs.readFileSync(SRC);
const src    = PNG.sync.read(srcBuf);
const SW     = src.width;
const SH     = src.height;

console.log(`Source: ${SRC}`);
console.log(`Source size: ${SW} × ${SH}  |  target frame: ${TARGET_W} × ${TARGET_H}`);
console.log(`Output:  ${OUT}  (${TARGET_W * FRAME_COUNT} × ${TARGET_H})`);

// ---- step 1: remove black background in-place ----
// Near-black pixels (R+G+B < 15) → alpha = 0
// Edge pixels (15 ≤ R+G+B < 40) → partial alpha for smooth edges
const BG_HARD = 15;
const BG_SOFT = 40;

for (let i = 0; i < src.data.length; i += 4) {
  const sum = src.data[i] + src.data[i + 1] + src.data[i + 2];
  if (sum < BG_HARD) {
    src.data[i + 3] = 0;
  } else if (sum < BG_SOFT) {
    src.data[i + 3] = Math.round(((sum - BG_HARD) / (BG_SOFT - BG_HARD)) * 255);
  }
  // else: keep original alpha (opaque car body pixels)
}
console.log('Background removed');

// ---- step 2: box-average downsample 1024 → 128 ----
const scale   = SW / TARGET_W;  // 8
const baseW   = TARGET_W;
const baseH   = TARGET_H;
const base    = new Uint8Array(baseW * baseH * 4);
const boxArea = scale * scale;

for (let oy = 0; oy < baseH; oy++) {
  for (let ox = 0; ox < baseW; ox++) {
    let sumR = 0, sumG = 0, sumB = 0, sumA = 0;
    for (let dy = 0; dy < scale; dy++) {
      for (let dx = 0; dx < scale; dx++) {
        const si = ((oy * scale + dy) * SW + (ox * scale + dx)) * 4;
        sumR += src.data[si];
        sumG += src.data[si + 1];
        sumB += src.data[si + 2];
        sumA += src.data[si + 3];
      }
    }
    const di = (oy * baseW + ox) * 4;
    base[di]     = Math.round(sumR / boxArea);
    base[di + 1] = Math.round(sumG / boxArea);
    base[di + 2] = Math.round(sumB / boxArea);
    base[di + 3] = Math.round(sumA / boxArea);
  }
}
console.log(`Downsampled to ${baseW} × ${baseH}`);

// ---- step 3: per-frame rotation with bilinear sampling ----

function readBase(x, y) {
  const xi = Math.max(0, Math.min(baseW - 1, x));
  const yi = Math.max(0, Math.min(baseH - 1, y));
  const i  = (yi * baseW + xi) * 4;
  return [base[i], base[i + 1], base[i + 2], base[i + 3]];
}

function sampleBilinear(sx, sy) {
  if (sx < 0 || sx > baseW - 1 || sy < 0 || sy > baseH - 1) return [0, 0, 0, 0];
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const x1 = Math.min(x0 + 1, baseW - 1);
  const y1 = Math.min(y0 + 1, baseH - 1);
  const tx = sx - x0;
  const ty = sy - y0;
  const [r00, g00, b00, a00] = readBase(x0, y0);
  const [r10, g10, b10, a10] = readBase(x1, y0);
  const [r01, g01, b01, a01] = readBase(x0, y1);
  const [r11, g11, b11, a11] = readBase(x1, y1);
  return [
    Math.round(r00 * (1 - tx) * (1 - ty) + r10 * tx * (1 - ty) + r01 * (1 - tx) * ty + r11 * tx * ty),
    Math.round(g00 * (1 - tx) * (1 - ty) + g10 * tx * (1 - ty) + g01 * (1 - tx) * ty + g11 * tx * ty),
    Math.round(b00 * (1 - tx) * (1 - ty) + b10 * tx * (1 - ty) + b01 * (1 - tx) * ty + b11 * tx * ty),
    Math.round(a00 * (1 - tx) * (1 - ty) + a10 * tx * (1 - ty) + a01 * (1 - tx) * ty + a11 * tx * ty),
  ];
}

// ---- build sheet ----
const sheet = new PNG({ width: TARGET_W * FRAME_COUNT, height: TARGET_H });
sheet.data.fill(0);

const cx = (baseW - 1) / 2;
const cy = (baseH - 1) / 2;

for (let f = 0; f < FRAME_COUNT; f++) {
  // Full sine-wave steering wobble: +3° → 0° → −3° → 0° → +3° …
  const angle = MAX_ANGLE * Math.sin((f / FRAME_COUNT) * 2 * Math.PI);
  const cosA  = Math.cos(angle);
  const sinA  = Math.sin(angle);

  console.log(`  frame ${f}: angle=${((angle * 180) / Math.PI).toFixed(2)}°`);

  for (let oy = 0; oy < TARGET_H; oy++) {
    for (let ox = 0; ox < TARGET_W; ox++) {
      // Inverse-rotate output pixel to find source pixel.
      const tx = ox - cx;
      const ty = oy - cy;
      const srcX = tx * cosA + ty * sinA + cx;
      const srcY = -tx * sinA + ty * cosA + cy;

      const rgba = sampleBilinear(srcX, srcY);
      const di   = (oy * (TARGET_W * FRAME_COUNT) + f * TARGET_W + ox) * 4;
      sheet.data[di]     = rgba[0];
      sheet.data[di + 1] = rgba[1];
      sheet.data[di + 2] = rgba[2];
      sheet.data[di + 3] = rgba[3];
    }
  }
}

// ---- write ----
const outBuf = PNG.sync.write(sheet);
fs.writeFileSync(OUT, outBuf);
console.log(`\nWritten: ${OUT}  (${outBuf.length} bytes)`);
