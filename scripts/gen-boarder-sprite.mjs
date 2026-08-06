// ============================================================
// File:        gen-boarder-sprite.mjs
// Path:        scripts/gen-boarder-sprite.mjs
// Project:     RaceArena
// Usage:       node scripts/gen-boarder-sprite.mjs
// Description: Generates boarder-sprite.png (1536×128, 12 frames) from the
//              static boarder.png source frame (128×128, transparent bg).
//
//              Animation zones:
//                Head   — rows  0..25   (top 20%)    — static
//                Body   — rows 26..102  (middle 60%) — push + carve
//                Feet   — rows 103..127 (bottom 20%) — static
//
//              Effects (full 2π sine cycle over 12 frames):
//                Push rhythm : torso vertical scale ±4%  (sine)
//                Carving     : body horizontal shift ±3px (cosine, 90° offset)
// ============================================================

import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const { PNG } = require("pngjs");

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../../");
const SRC = path.join(ROOT, "client/public/assets/racers/boarder.png");
const OUT = path.join(ROOT, "client/public/assets/racers/boarder-sprite.png");

const FRAME_COUNT = 12;
const MAX_EXPAND = 0.04; // ±4% body vertical scale (push rhythm)
const MAX_CARVE = 3; // ±3px horizontal shift   (carving)
const HEAD_F = 0.2; // head  = top 20% of height
const FEET_F = 0.8; // feet  = bottom 20% of height

// ---- load source and rotate 180° ----
const srcBuf = fs.readFileSync(SRC);
const srcOrig = PNG.sync.read(srcBuf);
const W = srcOrig.width;
const H = srcOrig.height;

// Rotate 180°: pixel (x,y) ← original pixel (W-1-x, H-1-y)
const src = new PNG({ width: W, height: H });
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const si = ((H - 1 - y) * W + (W - 1 - x)) * 4;
    const di = (y * W + x) * 4;
    src.data[di] = srcOrig.data[si];
    src.data[di + 1] = srcOrig.data[si + 1];
    src.data[di + 2] = srcOrig.data[si + 2];
    src.data[di + 3] = srcOrig.data[si + 3];
  }
}

const headBot = Math.round(H * HEAD_F); // first body row (inclusive)
const feetTop = Math.round(H * FEET_F); // first feet row (inclusive)
const bodyMid = (headBot + feetTop - 1) / 2; // centre of body zone

console.log(`Source: ${SRC}`);
console.log(`Frame size: ${W} × ${H}  |  frames: ${FRAME_COUNT}`);
console.log(`Output:  ${OUT}  (${W * FRAME_COUNT} × ${H})`);
console.log(`Head rows:  0 – ${headBot - 1}`);
console.log(
  `Body rows:  ${headBot} – ${feetTop - 1}  (centre ${bodyMid.toFixed(1)})`,
);
console.log(`Feet rows:  ${feetTop} – ${H - 1}`);

// ---- helpers ----
function readSrc(x, y) {
  const i = (y * W + x) * 4;
  return [src.data[i], src.data[i + 1], src.data[i + 2], src.data[i + 3]];
}

function sampleBilinear(x, srcY) {
  if (srcY < 0 || srcY > H - 1) return [0, 0, 0, 0];
  const y0 = Math.floor(srcY);
  const y1 = Math.min(y0 + 1, H - 1);
  const t = srcY - y0;
  const [r0, g0, b0, a0] = readSrc(x, y0);
  const [r1, g1, b1, a1] = readSrc(x, y1);
  return [
    Math.round(r0 + t * (r1 - r0)),
    Math.round(g0 + t * (g1 - g0)),
    Math.round(b0 + t * (b1 - b0)),
    Math.round(a0 + t * (a1 - a0)),
  ];
}

function writeDst(sheet, frame, x, y, rgba) {
  const i = (y * (W * FRAME_COUNT) + frame * W + x) * 4;
  sheet.data[i] = rgba[0];
  sheet.data[i + 1] = rgba[1];
  sheet.data[i + 2] = rgba[2];
  sheet.data[i + 3] = rgba[3];
}

// ---- build sheet ----
const sheet = new PNG({ width: W * FRAME_COUNT, height: H });
sheet.data.fill(0);

for (let f = 0; f < FRAME_COUNT; f++) {
  const phase = (f / FRAME_COUNT) * 2 * Math.PI;

  const pushExpansion = MAX_EXPAND * Math.sin(phase); // push rhythm
  const pushScale = 1 + pushExpansion;
  const carveShift = Math.round(MAX_CARVE * Math.cos(phase)); // carving

  console.log(
    `  frame ${String(f).padStart(2)}: ` +
      `push=${(pushExpansion * 100).toFixed(1).padStart(5)}%  ` +
      `carve=${String(carveShift).padStart(3)}px`,
  );

  for (let y = 0; y < H; y++) {
    const inHead = y < headBot;
    const inFeet = y >= feetTop;
    const inBody = !inHead && !inFeet;

    for (let x = 0; x < W; x++) {
      if (inHead || inFeet) {
        // Head and feet: pixel-exact static copy.
        writeDst(sheet, f, x, y, readSrc(x, y));
      } else {
        // Body: apply carve shift (horizontal) and push scale (vertical).
        const srcX = x - carveShift;
        if (srcX < 0 || srcX >= W) {
          writeDst(sheet, f, x, y, [0, 0, 0, 0]);
          continue;
        }
        const srcYFloat = bodyMid + (y - bodyMid) / pushScale;
        const srcYClamped = Math.max(headBot, Math.min(feetTop - 1, srcYFloat));
        writeDst(sheet, f, x, y, sampleBilinear(srcX, srcYClamped));
      }
    }
  }
}

// ---- write ----
const outBuf = PNG.sync.write(sheet);
fs.writeFileSync(OUT, outBuf);
console.log(`\nWritten: ${OUT}  (${outBuf.length} bytes)`);
