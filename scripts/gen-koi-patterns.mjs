// ============================================================
// File:        gen-koi-patterns.mjs
// Path:        scripts/gen-koi-patterns.mjs
// Project:     RaceArena
// Usage:       node scripts/gen-koi-patterns.mjs
// Description: Generates 4 koi pattern mask PNGs (9040×565px, 16-frame
//              spritesheet width) by tiling a 565×565 pattern frame 16x.
//
//              Mask format: alpha channel = brightness value.
//              alpha=0   (black)  → transparent → tintSpriteWithMask skips pixel
//              alpha=255 (white)  → fully opaque → tintColor applied at full strength
//              1-254             → soft anti-aliased edges
//
//              tintSpriteWithMask uses source-in composite which clips to
//              alpha, so transparent background pixels are correctly excluded
//              and only the patch/shimmer areas receive the coat tint.
//
//              Patterns:
//                kohaku — 2-3 large irregular patches, mid-body weighted
//                sanke  — 3-4 medium patches + 8-12 scattered accent dots
//                showa  — large coverage (~65% body) with white cutouts
//                ogon   — near-full-body with subtle radial shimmer
// ============================================================

import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');

const ROOT   = path.resolve(fileURLToPath(import.meta.url), '../../');
const OUT    = path.join(ROOT, 'client/public/assets/racers');
const FW     = 565;
const FH     = 565;
const FC     = 16;
const CX     = FW / 2;
const CY     = FH / 2;
const BODY_R = 220; // approximate fish body radius in the 565px frame

// ── PRNG (Mulberry32) ────────────────────────────────────────────────────────
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Returns brightness 0-255 for a single soft ellipse blob.
// (px,py) = pixel, (bx,by) = blob center, (rx,ry) = radii, edge = soft falloff width
function blobBrightness(px, py, bx, by, rx, ry, edge = 0.25) {
  const dx = (px - bx) / rx;
  const dy = (py - by) / ry;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d >= 1) return 0;
  // quadratic falloff near edge
  const t = 1 - d;
  const soft = Math.min(1, t / edge);
  return Math.round(255 * soft * soft);
}

// Paint all blobs onto a FW×FH buffer, return Uint8Array (one channel per pixel).
function renderBlobs(blobs) {
  const buf = new Uint8Array(FW * FH);
  for (let y = 0; y < FH; y++) {
    for (let x = 0; x < FW; x++) {
      let v = 0;
      for (const b of blobs) {
        v = Math.max(v, blobBrightness(x, y, b.cx, b.cy, b.rx, b.ry, b.edge ?? 0.3));
      }
      buf[y * FW + x] = v;
    }
  }
  return buf;
}

// Invert a brightness buffer (255-v).
function invertBuf(buf) {
  const out = new Uint8Array(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = 255 - buf[i];
  return out;
}

// Add two buffers (max blend).
function maxBuf(a, b) {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = Math.max(a[i], b[i]);
  return out;
}

// Tile a single-frame buffer 16 times to produce the full spritesheet mask.
function tileToSheet(frameBuf) {
  const sheet = new PNG({ width: FW * FC, height: FH });
  sheet.data.fill(0);
  for (let f = 0; f < FC; f++) {
    for (let y = 0; y < FH; y++) {
      for (let x = 0; x < FW; x++) {
        const v = frameBuf[y * FW + x];
        const i = (y * FW * FC + f * FW + x) * 4;
        sheet.data[i] = sheet.data[i + 1] = sheet.data[i + 2] = v;
        sheet.data[i + 3] = v;
      }
    }
  }
  return sheet;
}

function save(sheet, name) {
  const outPath = path.join(OUT, name);
  fs.writeFileSync(outPath, PNG.sync.write(sheet));
  console.log(`Written: ${outPath}  (${(FW * FC)}×${FH})`);
}

// ── Pattern generators ───────────────────────────────────────────────────────

function genKohaku() {
  const rng = mulberry32(0xc0de_0001);
  // 2-3 large irregular patches, mid-body weighted (avoid head/tail extremes)
  const blobs = [];
  const count = 2 + Math.floor(rng() * 2); // 2 or 3
  for (let i = 0; i < count; i++) {
    // Place in the central 60% of the body
    const angle = rng() * Math.PI * 2;
    const dist  = rng() * BODY_R * 0.55;
    blobs.push({
      cx:   CX + Math.cos(angle) * dist,
      cy:   CY + Math.sin(angle) * dist * 0.7,
      rx:   70 + rng() * 60,
      ry:   50 + rng() * 50,
      edge: 0.35,
    });
  }
  return renderBlobs(blobs);
}

function genSanke() {
  const rng = mulberry32(0xc0de_0002);
  const blobs = [];
  // 3-4 medium patches
  const patchCount = 3 + Math.floor(rng() * 2);
  for (let i = 0; i < patchCount; i++) {
    const angle = rng() * Math.PI * 2;
    const dist  = rng() * BODY_R * 0.6;
    blobs.push({
      cx:   CX + Math.cos(angle) * dist,
      cy:   CY + Math.sin(angle) * dist * 0.7,
      rx:   45 + rng() * 40,
      ry:   35 + rng() * 35,
      edge: 0.28,
    });
  }
  // 8-12 small accent dots scattered across body
  const dotCount = 8 + Math.floor(rng() * 5);
  for (let i = 0; i < dotCount; i++) {
    const angle = rng() * Math.PI * 2;
    const dist  = rng() * BODY_R * 0.75;
    blobs.push({
      cx:   CX + Math.cos(angle) * dist,
      cy:   CY + Math.sin(angle) * dist * 0.75,
      rx:   12 + rng() * 14,
      ry:   10 + rng() * 12,
      edge: 0.4,
    });
  }
  return renderBlobs(blobs);
}

function genShowa() {
  const rng = mulberry32(0xc0de_0003);
  // Large base coverage — start with full body oval then cut out white patches
  const baseBlobs = [{
    cx: CX, cy: CY,
    rx: BODY_R * 0.88,
    ry: BODY_R * 0.78,
    edge: 0.15,
  }];
  const baseBuf = renderBlobs(baseBlobs);

  // Cut-out white patches (subtract via inversion trick: use separate blob set)
  const cutBlobs = [];
  const cutCount = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < cutCount; i++) {
    const angle = rng() * Math.PI * 2;
    const dist  = rng() * BODY_R * 0.5;
    cutBlobs.push({
      cx:   CX + Math.cos(angle) * dist,
      cy:   CY + Math.sin(angle) * dist * 0.7,
      rx:   55 + rng() * 50,
      ry:   45 + rng() * 45,
      edge: 0.3,
    });
  }
  const cutBuf = renderBlobs(cutBlobs);

  // Subtract cut areas from base: base * (1 - cut/255)
  const out = new Uint8Array(FW * FH);
  for (let i = 0; i < out.length; i++) {
    out[i] = Math.round(baseBuf[i] * (1 - cutBuf[i] / 255));
  }
  return out;
}

function genOgon() {
  // Near-full body with subtle radial shimmer (very light gradient from center to edges)
  const buf = new Uint8Array(FW * FH);
  for (let y = 0; y < FH; y++) {
    for (let x = 0; x < FW; x++) {
      const dx = (x - CX) / (BODY_R * 0.9);
      const dy = (y - CY) / (BODY_R * 0.85);
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d >= 1) { buf[y * FW + x] = 0; continue; }
      // Shimmer: bright center fading to ~60% at edge
      const shimmer = 0.6 + 0.4 * (1 - d * d);
      buf[y * FW + x] = Math.round(255 * shimmer);
    }
  }
  return buf;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const patterns = [
  { name: 'koi-mask-kohaku.png', gen: genKohaku },
  { name: 'koi-mask-sanke.png',  gen: genSanke  },
  { name: 'koi-mask-showa.png',  gen: genShowa  },
  { name: 'koi-mask-ogon.png',   gen: genOgon   },
];

for (const { name, gen } of patterns) {
  const frameBuf = gen();
  const sheet    = tileToSheet(frameBuf);
  save(sheet, name);
}

console.log('\nAll 4 koi pattern masks generated.');
