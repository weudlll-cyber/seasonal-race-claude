// ============================================================
// File:        crop-dolphin-sprite.mjs
// Path:        scripts/crop-dolphin-sprite.mjs
// Project:     RaceArena
// Usage:       node scripts/crop-dolphin-sprite.mjs
// Description: Crops dolphin-swim.png tightly around the visible dolphin
//              body and rescales each frame to 256×256 px.
//
//              Steps:
//                1. Find the union bounding box of non-transparent pixels
//                   across all 16 frames.
//                2. Expand the bbox by PADDING pixels on each side,
//                   clamped to the frame bounds.
//                3. Crop each frame to that region and resize to 256×256
//                   using Lanczos3 (contain — preserves aspect ratio,
//                   fills remaining space with transparency).
//                4. Composite all 16 frames into a 4096×256 spritesheet
//                   and overwrite dolphin-swim.png in-place.
// ============================================================

import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../../");
const SPRITE_PATH = path.join(
  ROOT,
  "client/public/assets/racers/dolphin-swim.png",
);

const FRAME_COUNT = 16;
const OUT_FRAME_SIZE = 256;
const PADDING = 40;
const ALPHA_THRESHOLD = 10;

const meta = await sharp(SPRITE_PATH).metadata();
const totalW = meta.width;
const totalH = meta.height;
const frameW = Math.round(totalW / FRAME_COUNT);
const frameH = totalH;

console.log(
  `Input: ${totalW}×${totalH}  (${FRAME_COUNT} frames of ${frameW}×${frameH})`,
);

// --- Step 1: find union bounding box across all frames ---
let uMinX = frameW,
  uMaxX = 0,
  uMinY = frameH,
  uMaxY = 0;

for (let i = 0; i < FRAME_COUNT; i++) {
  const { data } = await sharp(SPRITE_PATH)
    .extract({ left: i * frameW, top: 0, width: frameW, height: frameH })
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let y = 0; y < frameH; y++) {
    for (let x = 0; x < frameW; x++) {
      if (data[(y * frameW + x) * 4 + 3] > ALPHA_THRESHOLD) {
        if (x < uMinX) uMinX = x;
        if (x > uMaxX) uMaxX = x;
        if (y < uMinY) uMinY = y;
        if (y > uMaxY) uMaxY = y;
      }
    }
  }
}

console.log(
  `Union bbox:  (${uMinX},${uMinY}) → (${uMaxX},${uMaxY})  body ${uMaxX - uMinX + 1}×${uMaxY - uMinY + 1}`,
);

// --- Step 2: expand by padding, clamp to frame ---
const cropX = Math.max(0, uMinX - PADDING);
const cropY = Math.max(0, uMinY - PADDING);
const cropRight = Math.min(frameW - 1, uMaxX + PADDING);
const cropBottom = Math.min(frameH - 1, uMaxY + PADDING);
const cropW = cropRight - cropX + 1;
const cropH = cropBottom - cropY + 1;

console.log(`Crop region: x=${cropX} y=${cropY}  ${cropW}×${cropH}`);

// --- Step 3: crop + resize each frame ---
const frameBufs = [];
for (let i = 0; i < FRAME_COUNT; i++) {
  const buf = await sharp(SPRITE_PATH)
    .extract({
      left: i * frameW + cropX,
      top: cropY,
      width: cropW,
      height: cropH,
    })
    .resize(OUT_FRAME_SIZE, OUT_FRAME_SIZE, {
      kernel: sharp.kernel.lanczos3,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  frameBufs.push(buf);
}

// --- Step 4: composite all frames side by side ---
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

await sharp(outBuf).toFile(SPRITE_PATH);

const outMeta = await sharp(SPRITE_PATH).metadata();
console.log(
  `Written:  ${outMeta.width}×${outMeta.height}  (${FRAME_COUNT} frames of ${OUT_FRAME_SIZE}×${OUT_FRAME_SIZE})  ${(outBuf.length / 1024).toFixed(0)} KB`,
);
