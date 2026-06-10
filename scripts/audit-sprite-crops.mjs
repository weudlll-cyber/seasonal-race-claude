// ============================================================
// File:        audit-sprite-crops.mjs
// Path:        scripts/audit-sprite-crops.mjs
// Project:     RaceArena
// Created:     2026-06-03
// Description: Measures body bounding box and fill ratio for each racer
//              spritesheet across all animation frames; requires sharp.
// ============================================================

/**
 * audit-sprite-crops.mjs
 * Measures the body bounding box and fill ratio for each racer spritesheet.
 * For each spritesheet, computes the union of non-transparent pixels across
 * all 16 frames (laid out horizontally), then reports fill ratio.
 */

import sharp from 'sharp';
import { existsSync } from 'fs';
import { join } from 'path';

const ASSETS_DIR = join(process.cwd(), 'client/public/assets/racers');

const RACER_TYPES = [
  { id: 'horse',      file: 'horse-trot.png',       frameWidth: 128, frameHeight: 128, frameCount:  8, displaySize: 40 },
  { id: 'duck',       file: 'duck-walk.png',         frameWidth: 128, frameHeight: 128, frameCount:  8, displaySize: 36 },
  { id: 'snail',      file: 'snail-crawl.png',       frameWidth: 128, frameHeight: 128, frameCount:  4, displaySize: 35 },
  { id: 'elephant',   file: 'elephant-walk.png',     frameWidth: 128, frameHeight: 128, frameCount:  8, displaySize: 44 },
  { id: 'giraffe',    file: 'giraffe-walk.png',      frameWidth: 128, frameHeight: 128, frameCount:  8, displaySize: 48 },
  { id: 'snake',      file: 'snake-crawl.png',       frameWidth: 128, frameHeight: 128, frameCount:  8, displaySize: 36 },
  { id: 'dragon',     file: 'dragon-fly.png',        frameWidth: 128, frameHeight: 128, frameCount: 16, displaySize: 50 },
  { id: 'f1',         file: 'f1-race.png',           frameWidth: 128, frameHeight: 128, frameCount:  8, displaySize: 38 },
  { id: 'rocket',     file: 'rocket-fly.png',        frameWidth: 128, frameHeight: 128, frameCount:  8, displaySize: 40 },
  { id: 'buggy',      file: 'buggy-bounce.png',      frameWidth: 128, frameHeight: 128, frameCount:  8, displaySize: 38 },
  { id: 'motorbike',  file: 'motorbike-walk.png',    frameWidth: 128, frameHeight: 128, frameCount:  8, displaySize: 36 },
  { id: 'plane',      file: 'plane-fly.png',         frameWidth: 128, frameHeight: 128, frameCount:  8, displaySize: 42 },
  { id: 'luge',       file: 'luge-slide.png',        frameWidth:  64, frameHeight:  64, frameCount: 16, displaySize: 40 },
  { id: 'beetle',     file: 'beetle.png',            frameWidth: 128, frameHeight: 128, frameCount:  8, displaySize: 38 },
  { id: 'boarder',    file: 'boarder-sprite.png',    frameWidth: 128, frameHeight: 128, frameCount: 12, displaySize: 40 },
  { id: 'koi',        file: 'koi-swim.png',          frameWidth: 565, frameHeight: 565, frameCount: 16, displaySize: 52 },
  { id: 'turtle',     file: 'turtle-swim.png',       frameWidth: 128, frameHeight: 128, frameCount: 16, displaySize: 48 },
  { id: 'manta',      file: 'manta-swim.png',        frameWidth: 128, frameHeight: 128, frameCount: 16, displaySize: 56 },
  { id: 'dolphin',    file: 'dolphin-swim.png',      frameWidth: 256, frameHeight: 256, frameCount: 16, displaySize: 52 },
  { id: 'snowmobile', file: 'snowmobile.png',        frameWidth: 192, frameHeight: 192, frameCount: 16, displaySize: 52 },
];

async function measureSpritesheet(filePath, frameWidth, frameHeight, frameCount) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  const ALPHA_THRESHOLD = 10;

  // Per-frame bounding boxes, then union them
  let unionMinX = Infinity, unionMinY = Infinity;
  let unionMaxX = -Infinity, unionMaxY = -Infinity;
  let totalOpaquePixels = 0;

  for (let f = 0; f < frameCount; f++) {
    const frameOffX = f * frameWidth;
    let fMinX = Infinity, fMinY = Infinity, fMaxX = -Infinity, fMaxY = -Infinity;
    for (let y = 0; y < frameHeight; y++) {
      for (let lx = 0; lx < frameWidth; lx++) {
        const gx = frameOffX + lx;
        const idx = (y * width + gx) * channels;
        const alpha = data[idx + channels - 1];
        if (alpha >= ALPHA_THRESHOLD) {
          if (lx < fMinX) fMinX = lx;
          if (lx > fMaxX) fMaxX = lx;
          if (y < fMinY) fMinY = y;
          if (y > fMaxY) fMaxY = y;
          totalOpaquePixels++;
        }
      }
    }
    if (fMinX !== Infinity) {
      if (fMinX < unionMinX) unionMinX = fMinX;
      if (fMinY < unionMinY) unionMinY = fMinY;
      if (fMaxX > unionMaxX) unionMaxX = fMaxX;
      if (fMaxY > unionMaxY) unionMaxY = fMaxY;
    }
  }

  if (unionMinX === Infinity) {
    return { unionMinX: 0, unionMinY: 0, unionMaxX: 0, unionMaxY: 0, totalOpaquePixels: 0, bboxFillRatio: 0 };
  }

  const bodyWidth = unionMaxX - unionMinX + 1;
  const bodyHeight = unionMaxY - unionMinY + 1;
  const framePx = frameWidth * frameHeight;
  // Bounding-box fill ratio: what fraction of the frame does the union bbox occupy?
  const bboxFillRatio = (bodyWidth * bodyHeight) / framePx;
  // Pixel fill ratio: average opaque pixels per frame vs frame area
  const avgOpaquePxPerFrame = totalOpaquePixels / frameCount;
  const pixelFillRatio = avgOpaquePxPerFrame / framePx;

  return {
    unionMinX, unionMinY, unionMaxX, unionMaxY,
    bodyWidth, bodyHeight,
    totalOpaquePixels,
    avgOpaquePxPerFrame: Math.round(avgOpaquePxPerFrame),
    framePx,
    bboxFillRatio,
    pixelFillRatio,
    sheetWidth: width,
    sheetHeight: height,
  };
}

async function main() {
  console.log('\n=== Racer Spritesheet Audit ===\n');
  console.log(
    `${'ID'.padEnd(12)} ${'Frame'.padEnd(10)} ${'Body'.padEnd(10)} ${'BBoxFill%'.padEnd(11)} ${'PxFill%'.padEnd(9)} ${'DispSz'.padEnd(8)} ${'Flag'}`
  );
  console.log('-'.repeat(75));

  const results = [];

  for (const type of RACER_TYPES) {
    const filePath = join(ASSETS_DIR, type.file);
    if (!existsSync(filePath)) {
      console.log(`${type.id.padEnd(12)} FILE NOT FOUND: ${type.file}`);
      continue;
    }

    try {
      const m = await measureSpritesheet(filePath, type.frameWidth, type.frameHeight, type.frameCount);
      const bboxFillPct = (m.bboxFillRatio * 100).toFixed(1);
      const pxFillPct = (m.pixelFillRatio * 100).toFixed(1);
      // Flag if bbox fill < 50% — body doesn't use half the frame area
      const flagged = m.bboxFillRatio < 0.5;
      const flag = flagged ? '*** CROP' : '';
      const frameStr = `${type.frameWidth}x${type.frameHeight}`;
      const bodyStr = `${m.bodyWidth}x${m.bodyHeight}`;
      console.log(
        `${type.id.padEnd(12)} ${frameStr.padEnd(10)} ${bodyStr.padEnd(10)} ${(bboxFillPct + '%').padEnd(11)} ${(pxFillPct + '%').padEnd(9)} ${String(type.displaySize).padEnd(8)} ${flag}`
      );
      results.push({ ...type, ...m, bboxFillPct: parseFloat(bboxFillPct), pxFillPct: parseFloat(pxFillPct), flagged });
    } catch (err) {
      console.log(`${type.id.padEnd(12)} ERROR: ${err.message}`);
    }
  }

  console.log('\n=== Flagged Types (bbox fill < 50%) ===\n');
  const flagged = results.filter(r => r.flagged);
  if (flagged.length === 0) {
    console.log('None — all types have bbox fill ratio >= 50%.');
  } else {
    for (const r of flagged) {
      console.log(`  ${r.id}: frame=${r.frameWidth}x${r.frameHeight}, body=${r.bodyWidth}x${r.bodyHeight}, bboxFill=${r.bboxFillPct}%, pxFill=${r.pxFillPct}%`);
      console.log(`    Bounding box: x=[${r.unionMinX},${r.unionMaxX}], y=[${r.unionMinY},${r.unionMaxY}]`);
      const pad = 15;
      const squareBody = Math.max(r.bodyWidth, r.bodyHeight);
      const cropSize = squareBody + pad * 2;
      let targetSize;
      if (cropSize < 128) targetSize = 128;
      else if (cropSize <= 256) targetSize = cropSize;
      else targetSize = 256;
      console.log(`    Suggested crop: body=${squareBody}px + ${pad*2}px padding = ${cropSize}px → target ${targetSize}px per frame`);
    }
  }

  return results;
}

main().catch(console.error);
