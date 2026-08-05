// ============================================================
// File:        gen-luge-sprite.mjs
// Path:        scripts/gen-luge-sprite.mjs
// Project:     RaceArena
// Usage:       node scripts/gen-luge-sprite.mjs
// Description: Generates the luge-slide.png spritesheet from the static
//              Luger.png source frame. The source is rotated 180° so the
//              racer travels feet-first. Produces 16 frames combining:
//                - Breathing: torso-only vertical scale, max 15%, sine curve
//                - Wobble: whole-body (except head) horizontal shift, max 2px,
//                  cosine curve (90° offset from breathing)
//              Output: 1024×64 px (16 frames × 64 wide).
// ============================================================

import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const { PNG } = require("pngjs");

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../../");
const SRC = path.join(ROOT, "client/public/assets/racers/Luger.png");
const OUT = path.join(ROOT, "client/public/assets/racers/luge-slide.png");

const FRAME_COUNT = 16;
const MAX_EXPAND = 0.15; // max 15% torso vertical scale
const MAX_WOBBLE = 2; // max 2px horizontal shift (body excl. head)
const TORSO_TOP_F = 0.25; // torso starts at 25% of frame height
const TORSO_BOT_F = 0.75; // torso ends   at 75% of frame height

// ---- load source ----
const srcBuf = fs.readFileSync(SRC);
const src = PNG.sync.read(srcBuf);
const W = src.width;
const H = src.height;

console.log(`Source: ${SRC}`);
console.log(`Frame size: ${W} × ${H}  |  frames: ${FRAME_COUNT}`);
console.log(`Output:  ${OUT}  (${W * FRAME_COUNT} × ${H})`);

// ---- rotate source 180° in-place (racer travels feet-first) ----
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const j = ((H - 1 - y) * W + (W - 1 - x)) * 4;
    if (i >= j) break;
    for (let c = 0; c < 4; c++) {
      const tmp = src.data[i + c];
      src.data[i + c] = src.data[j + c];
      src.data[j + c] = tmp;
    }
  }
}
console.log("Source rotated 180°");

// ---- zone boundaries ----
const torsoTop = Math.round(H * TORSO_TOP_F); // first torso row (inclusive)
const torsoBot = Math.round(H * TORSO_BOT_F); // first legs row  (exclusive)
const torsoMid = (torsoTop + torsoBot - 1) / 2;
const headBot = torsoTop; // head = rows 0 .. headBot-1

console.log(`Head rows:  0 – ${headBot - 1}`);
console.log(
  `Torso rows: ${torsoTop} – ${torsoBot - 1}  (center ${torsoMid.toFixed(1)})`,
);
console.log(`Legs rows:  ${torsoBot} – ${H - 1}`);

// ---- helpers ----
function readSrc(x, y) {
  const i = (y * W + x) * 4;
  return [src.data[i], src.data[i + 1], src.data[i + 2], src.data[i + 3]];
}

// Bilinear interpolation between row y0 and y0+1 for a given column x.
function sampleBilinear(x, srcY) {
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
  // Full 2π cycle over FRAME_COUNT frames for seamless loop.
  const phase = (f / FRAME_COUNT) * 2 * Math.PI;

  // Breathing: sine curve — positive = expand, negative = slight compression.
  const breatheExpansion = MAX_EXPAND * Math.sin(phase);
  const breatheScale = 1 + breatheExpansion;

  // Wobble: cosine curve (90° ahead of breathing) — peaks when breath is at zero.
  const wobbleShift = Math.round(MAX_WOBBLE * Math.cos(phase));

  console.log(
    `  frame ${String(f).padStart(2)}: ` +
      `breathe=${(breatheExpansion * 100).toFixed(1).padStart(5)}%  ` +
      `wobble=${String(wobbleShift).padStart(3)}px`,
  );

  for (let y = 0; y < H; y++) {
    const inHead = y < headBot;
    const inTorso = y >= torsoTop && y < torsoBot;

    for (let x = 0; x < W; x++) {
      if (inHead) {
        // Head: completely static — pixel-exact copy, no wobble.
        writeDst(sheet, f, x, y, readSrc(x, y));
      } else {
        // Body (torso + legs): apply horizontal wobble.
        const srcX = x - wobbleShift;
        if (srcX < 0 || srcX >= W) {
          // Wobble pushed this pixel off-canvas — transparent.
          writeDst(sheet, f, x, y, [0, 0, 0, 0]);
          continue;
        }

        if (inTorso) {
          // Torso: apply breathing scale (centred on torsoMid) + wobble.
          const srcYFloat = torsoMid + (y - torsoMid) / breatheScale;
          const srcYClamped = Math.max(
            torsoTop,
            Math.min(torsoBot - 1, srcYFloat),
          );
          writeDst(sheet, f, x, y, sampleBilinear(srcX, srcYClamped));
        } else {
          // Legs: wobble only, pixel-exact vertical copy.
          writeDst(sheet, f, x, y, readSrc(srcX, y));
        }
      }
    }
  }
}

// ---- write ----
const outBuf = PNG.sync.write(sheet);
fs.writeFileSync(OUT, outBuf);
console.log(`\nWritten: ${OUT}  (${outBuf.length} bytes)`);
