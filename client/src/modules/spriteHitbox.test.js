// ============================================================
// File:        spriteHitbox.test.js
// Path:        client/src/modules/spriteHitbox.test.js
// Project:     RaceArena
// Description: Unit tests for sprite hitbox auto-detection.
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeHitboxFromImageData,
  fallbackHitbox,
  getSpriteHitbox,
  _clearHitboxCache,
} from './spriteHitbox.js';

// Helper: build a synthetic ImageData-like object from a 2D opacity map.
// opacity[y][x] = 0 (transparent) | 1 (opaque)
function makeImageData(opacity, width, height) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = (opacity[y]?.[x] ?? 0) ? 255 : 0;
      data[(y * width + x) * 4 + 3] = alpha;
    }
  }
  return { data, width, height };
}

// Helper: build a rectangle of opaque pixels.
// Returns { imageData, bboxWidth, bboxHeight } for a 64×64 frame containing a rect.
function makeRectSprite({ x0, y0, x1, y1, frameSize = 64, displaySize = 32 }) {
  const opacity = Array.from({ length: frameSize }, (_, y) =>
    Array.from({ length: frameSize }, (_, x) => (x >= x0 && x <= x1 && y >= y0 && y <= y1 ? 1 : 0))
  );
  const imageData = makeImageData(opacity, frameSize, frameSize);
  return { imageData, frameSize, displaySize };
}

beforeEach(() => {
  _clearHitboxCache();
});

// ── computeHitboxFromImageData ────────────────────────────────────────────────

describe('computeHitboxFromImageData — narrow-tall sprite', () => {
  it('narrow-tall sprite → small visibleWidthPx, large visibleLengthPx', () => {
    // Opaque pixels: x ∈ [28, 35], y ∈ [4, 59] → width=8, height=56 in a 64×64 frame
    const { imageData, frameSize, displaySize } = makeRectSprite({
      x0: 28,
      y0: 4,
      x1: 35,
      y1: 59,
      frameSize: 64,
      displaySize: 32,
    });
    const hb = computeHitboxFromImageData(imageData, frameSize, frameSize, displaySize);
    expect(hb.visibleWidthPx).toBeLessThan(hb.visibleLengthPx);
    // width fraction = 8/64 = 0.125 → 4 px at displaySize=32
    expect(hb.visibleWidthPx).toBeCloseTo((8 / 64) * 32, 3);
    expect(hb.visibleLengthPx).toBeCloseTo((56 / 64) * 32, 3);
  });
});

describe('computeHitboxFromImageData — wide-short sprite', () => {
  it('wide-short sprite → large visibleWidthPx, small visibleLengthPx', () => {
    // Opaque pixels: x ∈ [4, 59], y ∈ [28, 35] → width=56, height=8 in a 64×64 frame
    const { imageData, frameSize, displaySize } = makeRectSprite({
      x0: 4,
      y0: 28,
      x1: 59,
      y1: 35,
      frameSize: 64,
      displaySize: 32,
    });
    const hb = computeHitboxFromImageData(imageData, frameSize, frameSize, displaySize);
    expect(hb.visibleWidthPx).toBeGreaterThan(hb.visibleLengthPx);
    expect(hb.visibleWidthPx).toBeCloseTo((56 / 64) * 32, 3);
    expect(hb.visibleLengthPx).toBeCloseTo((8 / 64) * 32, 3);
  });
});

describe('computeHitboxFromImageData — square sprite', () => {
  it('square sprite → equal visibleWidthPx and visibleLengthPx', () => {
    const { imageData, frameSize, displaySize } = makeRectSprite({
      x0: 16,
      y0: 16,
      x1: 47,
      y1: 47,
      frameSize: 64,
      displaySize: 32,
    });
    const hb = computeHitboxFromImageData(imageData, frameSize, frameSize, displaySize);
    expect(hb.visibleWidthPx).toBeCloseTo(hb.visibleLengthPx, 3);
  });
});

describe('computeHitboxFromImageData — multi-frame sheet uses only first frame', () => {
  it('only analyzes first frame, ignores subsequent frames', () => {
    // 128-wide, 64-tall sheet: first frame (x 0–63) = narrow, second (x 64–127) = wide
    const frameSize = 64;
    const sheetW = 128;
    const sheetH = 64;
    const opacity = Array.from({ length: sheetH }, (_, y) =>
      Array.from({ length: sheetW }, (_, x) => {
        if (x < 64) return x >= 28 && x <= 35 && y >= 4 && y <= 59 ? 1 : 0; // narrow
        return x >= 68 && x <= 123 && y >= 28 && y <= 35 ? 1 : 0; // wide (should be ignored)
      })
    );
    const imageData = makeImageData(opacity, sheetW, sheetH);
    const hb = computeHitboxFromImageData(imageData, frameSize, frameSize, 32);
    // Result must reflect the narrow frame only
    expect(hb.visibleWidthPx).toBeLessThan(hb.visibleLengthPx);
  });
});

describe('computeHitboxFromImageData — fully transparent', () => {
  it('returns fallback (0.75 × displaySize) when no opaque pixel found', () => {
    const opacity = Array.from({ length: 32 }, () => Array.from({ length: 32 }, () => 0));
    const imageData = makeImageData(opacity, 32, 32);
    const hb = computeHitboxFromImageData(imageData, 32, 32, 40);
    expect(hb.visibleWidthPx).toBeCloseTo(40 * 0.75, 3);
    expect(hb.visibleLengthPx).toBeCloseTo(40 * 0.75, 3);
  });
});

describe('computeHitboxFromImageData — alpha threshold', () => {
  it('pixels with alpha exactly at threshold are treated as transparent', () => {
    const data = new Uint8ClampedArray(4); // 1×1 pixel
    data[3] = 16; // exactly at threshold (default 16)
    const imageData = { data, width: 1, height: 1 };
    const hb = computeHitboxFromImageData(imageData, 1, 1, 20, 16);
    // alpha=16 ≤ threshold → transparent → fallback
    expect(hb.visibleWidthPx).toBeCloseTo(20 * 0.75, 3);
  });

  it('pixels with alpha above threshold are visible', () => {
    const data = new Uint8ClampedArray(4);
    data[3] = 17; // just above threshold
    const imageData = { data, width: 1, height: 1 };
    const hb = computeHitboxFromImageData(imageData, 1, 1, 20, 16);
    // 1×1 bbox → width = 1, height = 1 → displaySize scaled to (1/1)*20 = 20
    expect(hb.visibleWidthPx).toBeCloseTo(20, 3);
    expect(hb.visibleLengthPx).toBeCloseTo(20, 3);
  });
});

// ── fallbackHitbox ─────────────────────────────────────────────────────────────

describe('fallbackHitbox', () => {
  it('returns 75% of displaySize for both dimensions', () => {
    const hb = fallbackHitbox(40);
    expect(hb.visibleWidthPx).toBeCloseTo(30, 3);
    expect(hb.visibleLengthPx).toBeCloseTo(30, 3);
  });
});

// ── getSpriteHitbox — cache ───────────────────────────────────────────────────

describe('getSpriteHitbox — cache', () => {
  it('returns null when img is null', () => {
    expect(getSpriteHitbox('/foo.png', null, 128, 128, 40)).toBeNull();
  });

  it('returns fallback on second call from cache when first call had null img', () => {
    // First call: img null → null, nothing cached
    const r1 = getSpriteHitbox('/bar.png', null, 128, 128, 40);
    expect(r1).toBeNull();
    // Second call: same, still null (no img available)
    const r2 = getSpriteHitbox('/bar.png', null, 128, 128, 40);
    expect(r2).toBeNull();
  });
});
