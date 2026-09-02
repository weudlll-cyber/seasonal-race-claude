// ============================================================
// File:        audit-sprite-crops.mjs
// Path:        scripts/audit-sprite-crops.mjs
// Project:     RaceArena
// Created:     2026-06-03
// Description: Measures body bounding box and fill ratio for each racer
//              spritesheet across all animation frames, and compares against
//              the registry's recorded bodyFillX/bodyFillY; requires sharp.
// ============================================================

/**
 * audit-sprite-crops.mjs
 * Measures the body bounding box and fill ratio for each racer spritesheet, and compares the result
 * against the bodyFillX/bodyFillY the registry records.
 *
 * For each sheet it takes the union of the opaque bounding box across that type's frames (laid out
 * horizontally; the frame count comes from the registry, the frame size from the PNG).
 *
 * ★ TWO RULES, AND THEY DO NOT ALWAYS AGREE. The bare opaque bbox ("plain") is what produced the
 * registry's pinned values. `computeSpriteBoundingBox` ("product") additionally sheds sparse edge
 * strips, and is what the Racer Editor's `measureBodyFill` would return if a sheet were re-measured
 * today. Both are computed and both are reported, because reporting only one would make a real
 * disagreement look like agreement — or the reverse.
 *
 * THIS TOOL MEASURES AND CORRECTS NOTHING. bodyFillX/bodyFillY reach the race
 * (`headlessRaceSimulator.js`, `RaceScreen/index.jsx` and row layout), so changing one changes both
 * the picture and the result. A disagreement here is a finding, not a fix.
 */

import sharp from "sharp";
import { computeSpriteBoundingBox } from "../client/src/modules/racer-types/backgroundRemoval.js";
import { existsSync } from "fs";
import { join } from "path";

const ASSETS_DIR = join(process.cwd(), "client/public/assets/racers");

// ── THE RACER SET AND ITS GEOMETRY, READ RATHER THAN RESTATED (SPRITE-AUDIT-DERIVATION-1) ─────────────
//
// THIS TABLE WAS THE DEFECT. It hardcoded frameWidth/frameHeight/frameCount/displaySize for twenty
// types, and its frame geometry disagreed with the registry on EIGHT of them and its displaySize on
// FIVE, since `11093fff` (2026-06-03) — the commit that introduced the table and the cropped sheets
// in one go, so it was never right. Run with those numbers the tool slices a 150-px-tall sheet into
// 128-px windows and reports a fill ratio for a window that is not a frame: it returns
// `bodyFillX = 1.000` for horse, snake, rocket, motorbike, luge, koi and snowmobile.
//
// That is why `bodyFillX`/`bodyFillY` were said to have a home and no derivation. They HAVE one — it
// is this file — and it was reading its inputs from a copy.
//
// TWO SOURCES, EACH ASKED FOR WHAT IT OWNS:
//   the PNG        frameWidth and frameHeight. A decoded sheet knows its own dimensions, and this
//                  file already had them in `info` and threw them away.
//   the REGISTRY   frameCount, displaySize, spriteUrl and the RECORDED bodyFill values to compare
//                  against. frameCount is the one input a PNG cannot yield — a strip of N frames
//                  looks exactly like a strip of 2N — so it must come from the one home for it.
const RT = await import("../client/src/modules/racer-types/index.js");
const RACER_TYPES = RT.RACER_TYPE_IDS.map((id) => {
  const c = RT.RACER_TYPES[id].config;
  const snap = RT.CONFIG_SNAPSHOT[id];
  return {
    id,
    // `spriteUrl` is a browser path; the audit wants the file's basename under ASSETS_DIR.
    file: String(c.spriteUrl).split("/").pop(),
    frameCount: c.frameCount,
    // displaySize is Dev-Screen tunable, so take the frozen pre-override snapshot — a developer's
    // local tuning must not change what this audit reports about the shipped artwork.
    displaySize: snap && "displaySize" in snap ? snap.displaySize : c.displaySize,
    recordedFillX: c.bodyFillX,
    recordedFillY: c.bodyFillY,
    // Recorded geometry, kept ONLY to report disagreement with the sheet. It is never measured with.
    recordedFrameWidth: c.frameWidth,
    recordedFrameHeight: c.frameHeight,
  };
});

async function measureSpritesheet(filePath, frameCount) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  // THE FRAME GEOMETRY COMES FROM THE SHEET, not from a table. This is the whole repair: `info`
  // was already here and was being ignored in favour of a copy that had drifted.
  const frameWidth = width / frameCount;
  const frameHeight = height;
  if (!Number.isInteger(frameWidth)) {
    throw new Error(
      `${filePath}: width ${width} is not divisible by frameCount ${frameCount} — the sheet and the ` +
        `registry disagree about how many frames it holds, and that cannot be guessed.`,
    );
  }

  const ALPHA_THRESHOLD = 10;

  // Per-frame bounding boxes, then union them — the same shape as `measureBodyFill`
  // (client/src/screens/RacerEditor/canvasUtils.js), which is what actually authored the registry's
  // bodyFillX/bodyFillY. The bbox itself comes from the PRODUCT function rather than a copy of it,
  // for the same reason the frame geometry now comes from the sheet.
  let unionMinX = Infinity,
    unionMinY = Infinity;
  let unionMaxX = -Infinity,
    unionMaxY = -Infinity;
  // The plain opaque bbox, WITHOUT the product rule's sparse-edge shedding. Carried alongside so a
  // reader can see whether the shedding is doing anything on these sheets or merely could.
  let rawMinX = Infinity,
    rawMinY = Infinity;
  let rawMaxX = -Infinity,
    rawMaxY = -Infinity;
  let totalOpaquePixels = 0;

  for (let f = 0; f < frameCount; f++) {
    const frameOffX = f * frameWidth;
    // Repack the frame as RGBA in frame-local coordinates, which is what computeSpriteBoundingBox
    // expects (it indexes (y * width + x) * 4 + 3).
    const frame = new Uint8ClampedArray(frameWidth * frameHeight * 4);
    for (let y = 0; y < frameHeight; y++) {
      for (let lx = 0; lx < frameWidth; lx++) {
        const src = (y * width + frameOffX + lx) * channels;
        const dst = (y * frameWidth + lx) * 4;
        frame[dst] = data[src];
        frame[dst + 1] = channels >= 3 ? data[src + 1] : data[src];
        frame[dst + 2] = channels >= 3 ? data[src + 2] : data[src];
        const alpha = data[src + channels - 1];
        frame[dst + 3] = alpha;
        if (alpha >= ALPHA_THRESHOLD) {
          if (lx < rawMinX) rawMinX = lx;
          if (lx > rawMaxX) rawMaxX = lx;
          if (y < rawMinY) rawMinY = y;
          if (y > rawMaxY) rawMaxY = y;
          totalOpaquePixels++;
        }
      }
    }
    const bbox = computeSpriteBoundingBox({
      width: frameWidth,
      height: frameHeight,
      data: frame,
    });
    if (bbox) {
      if (bbox.minX < unionMinX) unionMinX = bbox.minX;
      if (bbox.minY < unionMinY) unionMinY = bbox.minY;
      if (bbox.maxX > unionMaxX) unionMaxX = bbox.maxX;
      if (bbox.maxY > unionMaxY) unionMaxY = bbox.maxY;
    }
  }

  if (unionMinX === Infinity) {
    return {
      unionMinX: 0,
      unionMinY: 0,
      unionMaxX: 0,
      unionMaxY: 0,
      totalOpaquePixels: 0,
      bboxFillRatio: 0,
    };
  }

  // THE SHEET-TIGHTNESS HALF OF THIS TOOL USES THE PLAIN BBOX, and says so, because "how much
  // transparent margin is on this sheet" is a question about the artwork, not about the product's
  // shedding rule. Mixing the two silently is how the two halves came to disagree by 9px on koi.
  const bodyWidth = rawMaxX - rawMinX + 1;
  const bodyHeight = rawMaxY - rawMinY + 1;
  const productWidth = unionMaxX - unionMinX + 1;
  const productHeight = unionMaxY - unionMinY + 1;
  const framePx = frameWidth * frameHeight;
  // Bounding-box fill ratio: what fraction of the frame does the union bbox occupy?
  const bboxFillRatio = (bodyWidth * bodyHeight) / framePx;
  // Pixel fill ratio: average opaque pixels per frame vs frame area
  const avgOpaquePxPerFrame = totalOpaquePixels / frameCount;
  const pixelFillRatio = avgOpaquePxPerFrame / framePx;

  return {
    unionMinX: rawMinX,
    unionMinY: rawMinY,
    unionMaxX: rawMaxX,
    unionMaxY: rawMaxY,
    bodyWidth,
    bodyHeight,
    totalOpaquePixels,
    avgOpaquePxPerFrame: Math.round(avgOpaquePxPerFrame),
    framePx,
    bboxFillRatio,
    pixelFillRatio,
    // THE DERIVATION THE REGISTRY'S VALUES ARE CREDITED TO, now actually produced rather than left
    // as an intermediate for someone to divide by hand.
    // TWO RULES, REPORTED SEPARATELY, because they do not always agree and only one of them
    // authored the registry. `product*` is what the Racer Editor would measure TODAY
    // (computeSpriteBoundingBox, which sheds sparse edge strips); `plain*` is the bare opaque
    // bounding box, which is what the registry's pinned values were actually produced by.
    productFillX: productWidth / frameWidth,
    productFillY: productHeight / frameHeight,
    plainFillX: bodyWidth / frameWidth,
    plainFillY: bodyHeight / frameHeight,
    frameWidth,
    frameHeight,
    sheetWidth: width,
    sheetHeight: height,
  };
}

async function main() {
  console.log("\n=== Racer Spritesheet Audit ===\n");
  console.log(
    `${"ID".padEnd(12)} ${"Frame".padEnd(10)} ${"Body".padEnd(10)} ${"BBoxFill%".padEnd(11)} ${"PxFill%".padEnd(9)} ${"DispSz".padEnd(8)} ${"plain X/Y".padEnd(14)} ${"vs REGISTRY"}`,
  );
  console.log("-".repeat(120));

  const results = [];

  for (const type of RACER_TYPES) {
    const filePath = join(ASSETS_DIR, type.file);
    if (!existsSync(filePath)) {
      console.log(`${type.id.padEnd(12)} FILE NOT FOUND: ${type.file}`);
      continue;
    }

    try {
      const m = await measureSpritesheet(filePath, type.frameCount);
      const bboxFillPct = (m.bboxFillRatio * 100).toFixed(1);
      const pxFillPct = (m.pixelFillRatio * 100).toFixed(1);
      // Flag if bbox fill < 50% — body doesn't use half the frame area
      const flagged = m.bboxFillRatio < 0.5;
      const flag = flagged ? "*** CROP" : "";
      const frameStr = `${m.frameWidth}x${m.frameHeight}`;
      const bodyStr = `${m.bodyWidth}x${m.bodyHeight}`;
      // The registry stores these rounded to three decimals, so compare at three.
      const r3 = (v) => Math.round(v * 1000) / 1000;
      const plainX = r3(m.plainFillX),
        plainY = r3(m.plainFillY);
      const prodX = r3(m.productFillX),
        prodY = r3(m.productFillY);
      const plainAgrees = plainX === type.recordedFillX && plainY === type.recordedFillY;
      const prodAgrees = prodX === type.recordedFillX && prodY === type.recordedFillY;
      const geomDrift =
        m.frameWidth !== type.recordedFrameWidth || m.frameHeight !== type.recordedFrameHeight
          ? ` [registry geom ${type.recordedFrameWidth}x${type.recordedFrameHeight}]`
          : "";
      const verdict = plainAgrees
        ? prodAgrees
          ? "both agree"
          : `EDITOR WOULD DIFFER -> ${prodX.toFixed(3)}/${prodY.toFixed(3)}`
        : `PLAIN DIFFERS  recorded ${type.recordedFillX}/${type.recordedFillY}`;
      console.log(
        `${type.id.padEnd(12)} ${frameStr.padEnd(10)} ${bodyStr.padEnd(10)} ${(bboxFillPct + "%").padEnd(11)} ${(pxFillPct + "%").padEnd(9)} ${String(type.displaySize).padEnd(8)} ${(plainX.toFixed(3) + "/" + plainY.toFixed(3)).padEnd(14)} ${verdict}${geomDrift} ${flag}`,
      );
      results.push({
        ...type,
        ...m,
        bboxFillPct: parseFloat(bboxFillPct),
        pxFillPct: parseFloat(pxFillPct),
        flagged,
      });
    } catch (err) {
      console.log(`${type.id.padEnd(12)} ERROR: ${err.message}`);
    }
  }

  console.log("\n=== Flagged Types (bbox fill < 50%) ===\n");
  const flagged = results.filter((r) => r.flagged);
  if (flagged.length === 0) {
    console.log("None — all types have bbox fill ratio >= 50%.");
  } else {
    for (const r of flagged) {
      console.log(
        `  ${r.id}: frame=${r.frameWidth}x${r.frameHeight}, body=${r.bodyWidth}x${r.bodyHeight}, bboxFill=${r.bboxFillPct}%, pxFill=${r.pxFillPct}%`,
      );
      console.log(
        `    Bounding box: x=[${r.unionMinX},${r.unionMaxX}], y=[${r.unionMinY},${r.unionMaxY}]`,
      );
      const pad = 15;
      const squareBody = Math.max(r.bodyWidth, r.bodyHeight);
      const cropSize = squareBody + pad * 2;
      let targetSize;
      if (cropSize < 128) targetSize = 128;
      else if (cropSize <= 256) targetSize = cropSize;
      else targetSize = 256;
      console.log(
        `    Suggested crop: body=${squareBody}px + ${pad * 2}px padding = ${cropSize}px → target ${targetSize}px per frame`,
      );
    }
  }

  return results;
}

main().catch(console.error);
