// ============================================================
// File:        crop-sprite-sheets.mjs
// Path:        scripts/crop-sprite-sheets.mjs
// Project:     RaceArena
// Created:     2026-06-03
// Description: Crops flagged racer spritesheets to tight body bounding box —
//              per-frame extract → crop → resize → stitch; requires sharp.
// ============================================================

/**
 * crop-sprite-sheets.mjs
 * Crops flagged racer spritesheets to tight body bounding box.
 * For each flagged type: per-frame extract → crop → resize → stitch.
 * Mask files are cropped with the same parameters as their main sprite.
 *
 * Usage: node scripts/crop-sprite-sheets.mjs
 */

import sharp from 'sharp';
import { join } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const ASSETS_DIR = join(process.cwd(), 'client/public/assets/racers');

// Types where bbox fill < 50%, measured by audit-sprite-crops.mjs.
// unionMin/Max are per-frame-local coordinates of the non-transparent body union.
const FLAGGED_TYPES = [
  {
    id: 'horse',
    file: 'horse-trot.png', maskFiles: [],
    frameWidth: 128, frameHeight: 128, frameCount: 8,
    unionMinX: 37, unionMinY: 4, unionMaxX: 89, unionMaxY: 123,
  },
  {
    id: 'giraffe',
    file: 'giraffe-walk.png', maskFiles: [],
    frameWidth: 128, frameHeight: 128, frameCount: 8,
    unionMinX: 46, unionMinY: 7, unionMaxX: 80, unionMaxY: 105,
  },
  {
    id: 'snake',
    file: 'snake-crawl.png', maskFiles: [],
    frameWidth: 128, frameHeight: 128, frameCount: 8,
    unionMinX: 35, unionMinY: 1, unionMaxX: 92, unionMaxY: 125,
  },
  {
    id: 'rocket',
    file: 'rocket-fly.png', maskFiles: [],
    frameWidth: 128, frameHeight: 128, frameCount: 8,
    unionMinX: 43, unionMinY: 7, unionMaxX: 84, unionMaxY: 127,
  },
  {
    id: 'motorbike',
    file: 'motorbike-walk.png',
    maskFiles: ['motorbike-walk-mask.png'],
    frameWidth: 128, frameHeight: 128, frameCount: 8,
    unionMinX: 34, unionMinY: 2, unionMaxX: 93, unionMaxY: 121,
  },
  {
    id: 'luge',
    file: 'luge-slide.png', maskFiles: [],
    frameWidth: 64, frameHeight: 64, frameCount: 16,
    unionMinX: 20, unionMinY: 8, unionMaxX: 43, unionMaxY: 57,
  },
  {
    id: 'beetle',
    file: 'beetle.png', maskFiles: [],
    frameWidth: 128, frameHeight: 128, frameCount: 8,
    unionMinX: 46, unionMinY: 32, unionMaxX: 81, unionMaxY: 93,
  },
  {
    id: 'boarder',
    file: 'boarder-sprite.png', maskFiles: [],
    frameWidth: 128, frameHeight: 128, frameCount: 12,
    unionMinX: 44, unionMinY: 32, unionMaxX: 83, unionMaxY: 104,
  },
  {
    id: 'koi',
    file: 'koi-swim.png',
    maskFiles: ['koi-mask-kohaku.png', 'koi-mask-ogon.png', 'koi-mask-sanke.png', 'koi-mask-showa.png'],
    frameWidth: 565, frameHeight: 565, frameCount: 16,
    unionMinX: 188, unionMinY: 145, unionMaxX: 376, unionMaxY: 440,
  },
  {
    id: 'turtle',
    file: 'turtle-swim.png',
    maskFiles: ['turtle-mask-plates.png', 'turtle-mask-borders.png'],
    frameWidth: 128, frameHeight: 128, frameCount: 16,
    unionMinX: 31, unionMinY: 19, unionMaxX: 96, unionMaxY: 103,
  },
  {
    id: 'dolphin',
    file: 'dolphin-swim.png',
    maskFiles: ['dolphin-mask-belly.png'],
    frameWidth: 256, frameHeight: 256, frameCount: 16,
    unionMinX: 75, unionMinY: 12, unionMaxX: 180, unionMaxY: 244,
  },
  {
    id: 'snowmobile',
    file: 'snowmobile.png', maskFiles: [],
    frameWidth: 192, frameHeight: 192, frameCount: 16,
    unionMinX: 62, unionMinY: 43, unionMaxX: 129, unionMaxY: 160,
  },
];

/**
 * Compute crop parameters from bounding box.
 * cropSize = max(bodyWidth, bodyHeight) + 30 (15px padding each side)
 * targetSize:  < 128 → 128,  128–256 → cropSize,  > 256 → 256
 */
function computeCropParams(type) {
  const bodyWidth  = type.unionMaxX - type.unionMinX + 1;
  const bodyHeight = type.unionMaxY - type.unionMinY + 1;
  const squareBody = Math.max(bodyWidth, bodyHeight);
  const cropSize   = squareBody + 30;

  let targetSize;
  if (cropSize < 128)      targetSize = 128;
  else if (cropSize <= 256) targetSize = cropSize;
  else                      targetSize = 256;

  // Center of the union bounding box in frame-local coordinates
  const bboxCx = (type.unionMinX + type.unionMaxX) / 2;
  const bboxCy = (type.unionMinY + type.unionMaxY) / 2;

  // Top-left of the crop region in frame-local coordinates (may be negative)
  const extractX = Math.floor(bboxCx - cropSize / 2);
  const extractY = Math.floor(bboxCy - cropSize / 2);

  return { bodyWidth, bodyHeight, squareBody, cropSize, targetSize, bboxCx, bboxCy, extractX, extractY };
}

/**
 * Crop a single spritesheet (or mask file with matching layout).
 * Each frame is extracted, padded, cropped, and resized individually,
 * then all frames are stitched into a new horizontal spritesheet.
 */
async function cropSpritesheet(inputPath, outputPath, params) {
  const { frameWidth, frameHeight, frameCount, extractX, extractY, cropSize, targetSize } = params;

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const sheetWidth  = info.width;
  const sheetHeight = info.height;
  const channels    = info.channels;

  // How much to pad the frame before extracting the crop window
  const padLeft   = Math.max(0, -extractX);
  const padTop    = Math.max(0, -extractY);
  const padRight  = Math.max(0, (extractX + cropSize) - frameWidth);
  const padBottom = Math.max(0, (extractY + cropSize) - frameHeight);

  // Offset into the padded frame where the extract starts
  const extractInPaddedX = padLeft + extractX;
  const extractInPaddedY = padTop  + extractY;

  const processedFrames = [];

  for (let f = 0; f < frameCount; f++) {
    const frameOffX = f * frameWidth;

    // Step 1: Extract this frame from the sheet → intermediate PNG buffer
    // (Two extract() calls cannot be chained in one sharp pipeline.)
    let frameBuf = await sharp(data, {
      raw: { width: sheetWidth, height: sheetHeight, channels },
    })
      .extract({ left: frameOffX, top: 0, width: frameWidth, height: frameHeight })
      .png()
      .toBuffer();

    // Step 2: Extend with transparent padding so the crop window stays in-bounds
    if (padLeft > 0 || padTop > 0 || padRight > 0 || padBottom > 0) {
      frameBuf = await sharp(frameBuf)
        .extend({
          left: padLeft, top: padTop, right: padRight, bottom: padBottom,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
    }

    // Step 3: Extract the exact crop window, then resize if needed
    let cropPipeline = sharp(frameBuf).extract({
      left: extractInPaddedX, top: extractInPaddedY,
      width: cropSize, height: cropSize,
    });

    if (targetSize !== cropSize) {
      cropPipeline = cropPipeline.resize(targetSize, targetSize, { kernel: 'lanczos3' });
    }

    frameBuf = await cropPipeline.png().toBuffer();
    processedFrames.push(frameBuf);
  }

  // Stitch frames horizontally into a new spritesheet
  const stitchWidth = targetSize * frameCount;
  const composites  = processedFrames.map((buf, i) => ({
    input: buf,
    left: i * targetSize,
    top: 0,
  }));

  await sharp({
    create: {
      width: stitchWidth,
      height: targetSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(outputPath);
}

/**
 * Verify no body pixels sit at the 1-pixel border of the new sheet.
 * Returns true if the content is safely within bounds.
 */
async function verifyCrop(filePath, targetSize, frameCount) {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const ALPHA_THRESHOLD = 10;

  let clipped = false;
  for (let f = 0; f < frameCount; f++) {
    const offX = f * targetSize;
    for (let y = 0; y < targetSize; y++) {
      for (let lx = 0; lx < targetSize; lx++) {
        const gx = offX + lx;
        const idx = (y * width + gx) * channels;
        const alpha = data[idx + channels - 1];
        if (alpha >= ALPHA_THRESHOLD) {
          // Is this pixel on the 1px border?
          if (lx === 0 || lx === targetSize - 1 || y === 0 || y === targetSize - 1) {
            clipped = true;
          }
        }
      }
    }
  }
  return !clipped;
}

/**
 * Re-measure bbox fill ratio of the cropped sheet for reporting.
 */
async function remeasureFill(filePath, targetSize, frameCount) {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const ALPHA_THRESHOLD = 10;

  let unionMinX = Infinity, unionMinY = Infinity;
  let unionMaxX = -Infinity, unionMaxY = -Infinity;

  for (let f = 0; f < frameCount; f++) {
    const offX = f * targetSize;
    for (let y = 0; y < targetSize; y++) {
      for (let lx = 0; lx < targetSize; lx++) {
        const gx = offX + lx;
        const idx = (y * width + gx) * channels;
        if (data[idx + channels - 1] >= ALPHA_THRESHOLD) {
          if (lx < unionMinX) unionMinX = lx;
          if (lx > unionMaxX) unionMaxX = lx;
          if (y < unionMinY) unionMinY = y;
          if (y > unionMaxY) unionMaxY = y;
        }
      }
    }
  }

  if (unionMinX === Infinity) return { bboxFillRatio: 0, bodyWidth: 0, bodyHeight: 0 };
  const bodyWidth  = unionMaxX - unionMinX + 1;
  const bodyHeight = unionMaxY - unionMinY + 1;
  const bboxFillRatio = (bodyWidth * bodyHeight) / (targetSize * targetSize);
  return { bboxFillRatio, bodyWidth, bodyHeight };
}

async function main() {
  console.log('\n=== Sprite Crop Pass ===\n');

  for (const type of FLAGGED_TYPES) {
    const p = computeCropParams(type);
    console.log(`\n── ${type.id} ──`);
    console.log(`  Before: ${type.frameWidth}x${type.frameHeight} (${type.frameCount} frames)`);
    console.log(`  Body bbox: [${type.unionMinX},${type.unionMaxX}] x [${type.unionMinY},${type.unionMaxY}]  (${p.bodyWidth}x${p.bodyHeight})`);
    console.log(`  Crop: ${p.cropSize}px → target ${p.targetSize}px`);
    console.log(`  Extract offset in frame: (${p.extractX}, ${p.extractY})`);

    const mainInput  = join(ASSETS_DIR, type.file);
    const mainOutput = mainInput; // overwrite in-place

    const cropParams = {
      frameWidth: type.frameWidth, frameHeight: type.frameHeight, frameCount: type.frameCount,
      extractX: p.extractX, extractY: p.extractY,
      cropSize: p.cropSize, targetSize: p.targetSize,
    };

    // Crop main spritesheet
    await cropSpritesheet(mainInput, mainOutput, cropParams);
    console.log(`  Saved: ${type.file}`);

    // Crop mask files with same parameters
    for (const maskFile of type.maskFiles) {
      const maskPath = join(ASSETS_DIR, maskFile);
      await cropSpritesheet(maskPath, maskPath, cropParams);
      console.log(`  Saved mask: ${maskFile}`);
    }

    // Verify: no content clipped at frame edge
    const safe = await verifyCrop(mainOutput, p.targetSize, type.frameCount);
    if (!safe) {
      console.warn(`  WARNING: body pixels touch 1-px border — some content may be clipped!`);
    }

    // Re-measure fill ratio
    const after = await remeasureFill(mainOutput, p.targetSize, type.frameCount);
    console.log(`  After:  ${p.targetSize}x${p.targetSize}, body ${after.bodyWidth}x${after.bodyHeight}, bboxFill=${(after.bboxFillRatio * 100).toFixed(1)}%`);
    if (safe) console.log(`  Verification: OK — no border clipping`);
  }

  console.log('\n=== Summary: Config Updates Required ===\n');
  for (const type of FLAGGED_TYPES) {
    const p = computeCropParams(type);
    if (p.targetSize !== type.frameWidth || p.targetSize !== type.frameHeight) {
      console.log(`  ${type.id}: frameWidth/frameHeight: ${type.frameWidth} → ${p.targetSize}`);
    }
  }

  console.log('\nDone.\n');
}

main().catch(console.error);
