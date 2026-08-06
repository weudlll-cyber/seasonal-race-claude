// ============================================================
// File:        gen-aquatic-masks.mjs
// Path:        scripts/gen-aquatic-masks.mjs
// Project:     RaceArena
// Usage:       node scripts/gen-aquatic-masks.mjs
// Description: Generates pattern mask PNGs for turtle, manta, and dolphin
//              racer types. All masks use alpha=brightness so that
//              tintSpriteWithMask / tintSpriteBodyAndMask clip correctly:
//                alpha=255 → fully opaque → tint applied at full strength
//                alpha=0   → transparent  → pixel left untouched
//                1-254    → soft anti-aliased edge
//
//              Output files (in client/public/assets/racers/):
//                turtle-mask-plates.png   2048×128  (16 frames × 128×128)
//                turtle-mask-borders.png  2048×128
//                manta-mask-shoulders.png 2048×128
//                dolphin-mask-belly.png   4096×256  (16 frames × 256×256)
// ============================================================

import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const { PNG } = require("pngjs");

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../../");
const OUT = path.join(ROOT, "client/public/assets/racers");
const FC = 16;

// ── Helpers ──────────────────────────────────────────────────────────────────

function blobBrightness(px, py, bx, by, rx, ry, edge = 0.3) {
  const dx = (px - bx) / rx;
  const dy = (py - by) / ry;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d >= 1) return 0;
  const t = 1 - d;
  const soft = Math.min(1, t / edge);
  return Math.round(255 * soft * soft);
}

function renderBlobs(blobs, fw, fh) {
  const buf = new Uint8Array(fw * fh);
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      let v = 0;
      for (const b of blobs) {
        v = Math.max(
          v,
          blobBrightness(x, y, b.cx, b.cy, b.rx, b.ry, b.edge ?? 0.3),
        );
      }
      buf[y * fw + x] = v;
    }
  }
  return buf;
}

// alpha channel = grayscale value (transparent background, opaque patches)
function tileToSheet(frameBuf, fw, fh) {
  const sheet = new PNG({ width: fw * FC, height: fh });
  sheet.data.fill(0);
  for (let f = 0; f < FC; f++) {
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const v = frameBuf[y * fw + x];
        const i = (y * fw * FC + f * fw + x) * 4;
        sheet.data[i] = sheet.data[i + 1] = sheet.data[i + 2] = v;
        sheet.data[i + 3] = v;
      }
    }
  }
  return sheet;
}

function save(sheet, name, fw) {
  const outPath = path.join(OUT, name);
  fs.writeFileSync(outPath, PNG.sync.write(sheet));
  console.log(`Written: ${name}  (${fw * FC}×${sheet.height})`);
}

// ── Turtle masks (128×128 frame) ─────────────────────────────────────────────
// Top-down shell plate pattern: 4 vertebral scutes along spine + 6 costal scutes.
// Head is at the left end, tail at right — plates are in the central body area.

const TFW = 128;
const TFH = 128;

function genTurtlePlates() {
  // Shell occupies roughly center of the 128×128 frame.
  // Vertebral (spine) plates: 4 large blobs along y≈62, spaced x 30-98
  // Costal plates: 3 per side, slightly above/below center
  const blobs = [
    // Vertebral row
    { cx: 32, cy: 62, rx: 14, ry: 10, edge: 0.35 },
    { cx: 52, cy: 58, rx: 14, ry: 11, edge: 0.35 },
    { cx: 72, cy: 58, rx: 14, ry: 11, edge: 0.35 },
    { cx: 92, cy: 62, rx: 13, ry: 10, edge: 0.35 },
    // Upper costal plates
    { cx: 40, cy: 44, rx: 12, ry: 8, edge: 0.4 },
    { cx: 62, cy: 42, rx: 13, ry: 8, edge: 0.4 },
    { cx: 84, cy: 44, rx: 12, ry: 8, edge: 0.4 },
    // Lower costal plates
    { cx: 40, cy: 78, rx: 12, ry: 8, edge: 0.4 },
    { cx: 62, cy: 80, rx: 13, ry: 8, edge: 0.4 },
    { cx: 84, cy: 78, rx: 12, ry: 8, edge: 0.4 },
  ];
  return renderBlobs(blobs, TFW, TFH);
}

function genTurtleBorders() {
  // Shell outline ellipse minus plate centers = the border/seam regions between plates.
  const shellBlob = [{ cx: 62, cy: 62, rx: 54, ry: 40, edge: 0.12 }];
  const shellBuf = renderBlobs(shellBlob, TFW, TFH);
  const platesBuf = genTurtlePlates();

  const out = new Uint8Array(TFW * TFH);
  for (let i = 0; i < out.length; i++) {
    // Border = shell area * (1 - plate centers), then brightened so it's visible
    const border = shellBuf[i] * (1 - platesBuf[i] / 255);
    out[i] = Math.round(Math.min(255, border * 1.4));
  }
  return out;
}

// ── Manta mask (128×128 frame) ───────────────────────────────────────────────
// Two symmetrical shoulder patches in upper-wing area.
// Manta viewed from above: wide, flat, wings extend left/right from narrow body.

const MFW = 128;
const MFH = 128;

function genMantaShoulders() {
  // Left shoulder patch — two overlapping ellipses for organic shape
  // Right shoulder patch — mirrored
  const blobs = [
    { cx: 35, cy: 44, rx: 18, ry: 11, edge: 0.35 },
    { cx: 44, cy: 50, rx: 14, ry: 9, edge: 0.4 },
    // Right mirror
    { cx: 93, cy: 44, rx: 18, ry: 11, edge: 0.35 },
    { cx: 84, cy: 50, rx: 14, ry: 9, edge: 0.4 },
  ];
  return renderBlobs(blobs, MFW, MFH);
}

// ── Dolphin mask (256×256 frame) ─────────────────────────────────────────────
// Belly / lighter ventral area: two soft lateral strips visible from above.
// Dark dorsal midline stays transparent; sides brighten to near-white.
// Y range 40-220 covers the full body height within the tight-cropped frame.

const DFW = 256;
const DFH = 256;

function genDolphinBelly() {
  const buf = new Uint8Array(DFW * DFH);
  const yMin = 40;
  const yMax = 220;
  const yMid = (yMin + yMax) / 2; // 130
  const yHalf = (yMax - yMin) / 2; // 90

  for (let y = 0; y < DFH; y++) {
    for (let x = 0; x < DFW; x++) {
      // Vertical: smooth parabolic window clamped to y=40..220
      const dy = (y - yMid) / yHalf;
      const vertFactor = Math.max(0, 1 - dy * dy);

      // Horizontal: two Gaussian peaks at 30% and 70% of frame width.
      // At center (50%) the Gaussians are ~8% of peak — near-transparent
      // dark back — brightening outward to full white at the ventral sides.
      const rx = x / DFW;
      const sigma = 0.09;
      const leftG = Math.exp(-Math.pow((rx - 0.3) / sigma, 2) / 2);
      const rightG = Math.exp(-Math.pow((rx - 0.7) / sigma, 2) / 2);
      const h = Math.max(leftG, rightG);

      buf[y * DFW + x] = Math.round(255 * Math.min(1, h * vertFactor));
    }
  }
  return buf;
}

// ── Generate all masks ────────────────────────────────────────────────────────

const masks = [
  { name: "turtle-mask-plates.png", gen: genTurtlePlates, fw: TFW, fh: TFH },
  { name: "turtle-mask-borders.png", gen: genTurtleBorders, fw: TFW, fh: TFH },
  {
    name: "manta-mask-shoulders.png",
    gen: genMantaShoulders,
    fw: MFW,
    fh: MFH,
  },
  { name: "dolphin-mask-belly.png", gen: genDolphinBelly, fw: DFW, fh: DFH },
];

for (const { name, gen, fw, fh } of masks) {
  const frameBuf = gen();
  const sheet = tileToSheet(frameBuf, fw, fh);
  save(sheet, name, fw);
}

console.log("\nAll aquatic masks generated.");
