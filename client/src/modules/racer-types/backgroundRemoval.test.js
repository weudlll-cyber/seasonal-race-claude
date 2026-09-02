// ============================================================
// File:        backgroundRemoval.test.js
// Path:        client/src/modules/racer-types/backgroundRemoval.test.js
// Project:     RaceArena
// Created:     2026-05-27
// Description: Unit tests for backgroundRemoval.js
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  hasTransparentBackground,
  sampleColor,
  removeBackground,
  computeOpaqueBoundingBox,
  computeSpriteBoundingBox,
  computeSpriteOffset,
} from './backgroundRemoval.js';

function makeImageData(width, height, fillFn) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const [r, g, b, a] = fillFn(x, y);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  }
  return { width, height, data };
}

describe('computeSpriteBoundingBox', () => {
  it('returns correct min/max/center for a simple ImageData with known opaque pixels', () => {
    // 8×8 canvas; only pixels at (2,1) and (4,3) are opaque
    const img = makeImageData(8, 8, (x, y) => {
      if ((x === 2 && y === 1) || (x === 4 && y === 3)) return [255, 0, 0, 255];
      return [0, 0, 0, 0];
    });
    const bbox = computeSpriteBoundingBox(img);
    expect(bbox).not.toBeNull();
    expect(bbox.minX).toBe(2);
    expect(bbox.maxX).toBe(4);
    expect(bbox.minY).toBe(1);
    expect(bbox.maxY).toBe(3);
    expect(bbox.centerX).toBe(3);
    expect(bbox.centerY).toBe(2);
  });

  it('returns null for a fully transparent ImageData', () => {
    const img = makeImageData(8, 8, () => [0, 0, 0, 0]);
    expect(computeSpriteBoundingBox(img)).toBeNull();
  });
});

describe('computeOpaqueBoundingBox — the OWNING rule for a racer body', () => {
  // The owner, 2026-09-02: a racer's body is the opaque bounding box of the artwork, tails and
  // fins included. docs/RACER_DATA_MODEL.md is the rule's home. These tests pin the two ways
  // this function deliberately differs from computeSpriteBoundingBox, so that neither can be
  // "tidied" into the other without going red.

  it('keeps a sparse edge strip that the shedding rule would trim — the tail is body', () => {
    // 200×200 so the shedding rule's strip is nX = nY = 6 and its threshold is 5%.
    // Solid block rows 20–139; then a single opaque column at x=100 down to row 179.
    const img = makeImageData(200, 200, (x, y) => {
      if (y >= 20 && y <= 139 && x >= 40 && x <= 159) return [255, 0, 0, 255];
      if (y >= 140 && y <= 179 && x === 100) return [255, 0, 0, 255];
      return [0, 0, 0, 0];
    });
    expect(computeOpaqueBoundingBox(img).maxY).toBe(179);
    // The same artwork under the shedding rule loses the tail.
    expect(computeSpriteBoundingBox(img).maxY).toBeLessThan(179);
  });

  it('alpha exactly 10 is INSIDE the body box, and outside the shedding box', () => {
    // This one alpha level decides beetle and koi against the registry's pinned values
    // (measured 2026-09-02: >= 10 reproduces 20 of 20, > 10 reproduces 18 of 20).
    const img = makeImageData(8, 8, (x, y) => {
      if (x === 4 && y === 4) return [255, 0, 0, 255];
      if (x === 1 && y === 1) return [255, 0, 0, 10];
      return [0, 0, 0, 0];
    });
    expect(computeOpaqueBoundingBox(img).minX).toBe(1);
    expect(computeSpriteBoundingBox(img).minX).toBe(4);
  });

  it('returns null for a fully transparent ImageData', () => {
    expect(computeOpaqueBoundingBox(makeImageData(8, 8, () => [0, 0, 0, 0]))).toBeNull();
  });

  it('reports the same centre as the shedding box when nothing is shed', () => {
    const img = makeImageData(8, 8, (x, y) => {
      if ((x === 2 && y === 1) || (x === 4 && y === 3)) return [255, 0, 0, 255];
      return [0, 0, 0, 0];
    });
    expect(computeOpaqueBoundingBox(img)).toEqual(computeSpriteBoundingBox(img));
  });
});

describe('computeSpriteBoundingBox — edge-strip filtering', () => {
  // All tests use 200×200 images so nX = nY = clamp(round(200×0.03),2,8) = 6.
  // THRESHOLD = 0.05.  A single leaked pixel in a 6×101 strip (threshold=30.3) is discarded.

  it('single leaked pixel at right edge is excluded from the bounding box', () => {
    // Solid content block [50..150, 50..150]; one leaked pixel at (199, 100).
    // After iterative trimming, maxX converges to 151 (the first strip containing real content).
    const img = makeImageData(200, 200, (x, y) => {
      if (x >= 50 && x <= 150 && y >= 50 && y <= 150) return [0, 0, 255, 255];
      if (x === 199 && y === 100) return [255, 0, 0, 255];
      return [0, 0, 0, 0];
    });
    const bbox = computeSpriteBoundingBox(img);
    expect(bbox).not.toBeNull();
    expect(bbox.maxX).toBe(151); // NOT extended to the leaked pixel at x=199
    expect(bbox.minX).toBe(50);
  });

  it('dense content near right edge is correctly included', () => {
    // Content extends all the way to x=190 — the right strip is dense and must not be trimmed.
    const img = makeImageData(200, 200, (x, y) => {
      if (x >= 50 && x <= 190 && y >= 50 && y <= 150) return [0, 0, 255, 255];
      return [0, 0, 0, 0];
    });
    const bbox = computeSpriteBoundingBox(img);
    expect(bbox).not.toBeNull();
    expect(bbox.maxX).toBe(190);
  });

  it('thin one-pixel-wide appendage spanning full bbox height is not discarded', () => {
    // Main body [20..120, 20..180]; appendage: single column at x=195, y=[20..180].
    // The appendage makes up 161/(6×161)=1/6≈17% of the right edge strip — well above 5%.
    const img = makeImageData(200, 200, (x, y) => {
      if (x >= 20 && x <= 120 && y >= 20 && y <= 180) return [0, 0, 255, 255];
      if (x === 195 && y >= 20 && y <= 180) return [0, 255, 0, 255];
      return [0, 0, 0, 0];
    });
    const bbox = computeSpriteBoundingBox(img);
    expect(bbox).not.toBeNull();
    expect(bbox.maxX).toBe(195); // appendage is retained
  });

  it('fully transparent image returns null (unchanged behaviour)', () => {
    const img = makeImageData(200, 200, () => [0, 0, 0, 0]);
    expect(computeSpriteBoundingBox(img)).toBeNull();
  });
});

describe('computeSpriteOffset', () => {
  it('returns { offsetX: 0, offsetY: 0 } for a sprite already centered', () => {
    // 8×8 image; opaque pixels at x=2 and x=6, y=2 and y=6 → centerX=(2+6)/2=4, centerY=4
    const img = makeImageData(8, 8, (x, y) => {
      if ((x === 2 || x === 6) && (y === 2 || y === 6)) return [255, 0, 0, 255];
      return [0, 0, 0, 0];
    });
    const offset = computeSpriteOffset(img, 8, 8);
    // centerX=4, canvasWidth/2=4 → offsetX = 0
    expect(offset.offsetX).toBe(0);
    expect(offset.offsetY).toBe(0);
  });

  it('returns correct offset for a sprite in the top-left corner', () => {
    // 8×8 image; opaque pixels only at x=0..1, y=0..1 → centerX=0.5, centerY=0.5
    const img = makeImageData(8, 8, (x, y) => {
      if (x <= 1 && y <= 1) return [255, 0, 0, 255];
      return [0, 0, 0, 0];
    });
    const offset = computeSpriteOffset(img, 8, 8);
    // offsetX = 8/2 - 0.5 = 3.5
    expect(offset.offsetX).toBe(3.5);
    expect(offset.offsetY).toBe(3.5);
  });

  it('returns { offsetX: 0, offsetY: 0 } when bounding box is null (fully transparent)', () => {
    const img = makeImageData(8, 8, () => [0, 0, 0, 0]);
    expect(computeSpriteOffset(img, 8, 8)).toEqual({ offsetX: 0, offsetY: 0 });
  });
});

describe('hasTransparentBackground', () => {
  it('returns true when all edge pixels are transparent', () => {
    const img = makeImageData(16, 16, () => [0, 0, 0, 0]);
    expect(hasTransparentBackground(img)).toBe(true);
  });

  it('returns false when all pixels are opaque', () => {
    const img = makeImageData(16, 16, () => [255, 255, 255, 255]);
    expect(hasTransparentBackground(img)).toBe(false);
  });
});

describe('sampleColor', () => {
  it('returns correct RGB for a given pixel coordinate', () => {
    const img = makeImageData(4, 4, (x, y) => [x * 10, y * 10, 50, 255]);
    expect(sampleColor(img, 2, 3)).toEqual({ r: 20, g: 30, b: 50 });
  });
});

describe('removeBackground', () => {
  it('sets alpha to 0 for pixels within tolerance of sampled color', () => {
    const img = makeImageData(1, 1, () => [100, 150, 200, 255]);
    const result = removeBackground(img, { r: 100, g: 150, b: 200 }, 30);
    expect(result.data[3]).toBe(0);
  });

  it('sets partial alpha for pixels in the feather zone', () => {
    // sampledColor=(0,0,0), tolerance=20, pixel=(25,0,0)
    // distance=25, feather zone: 20..30
    // alpha = round(255 * (25-20) / 10) = round(127.5) = 128
    const img = makeImageData(1, 1, () => [25, 0, 0, 255]);
    const result = removeBackground(img, { r: 0, g: 0, b: 0 }, 20);
    expect(result.data[3]).toBe(128);
  });

  it('leaves alpha unchanged for pixels outside the feather zone', () => {
    // distance=200 >> outerBound=15
    const img = makeImageData(1, 1, () => [200, 0, 0, 255]);
    const result = removeBackground(img, { r: 0, g: 0, b: 0 }, 10);
    expect(result.data[3]).toBe(255);
  });

  it('does not mutate the input ImageData', () => {
    const img = makeImageData(2, 2, () => [100, 100, 100, 255]);
    const originalData = Array.from(img.data);
    removeBackground(img, { r: 100, g: 100, b: 100 }, 20);
    expect(Array.from(img.data)).toEqual(originalData);
  });

  it('returns an ImageData with the same dimensions as input', () => {
    const img = makeImageData(8, 6, () => [50, 50, 50, 200]);
    const result = removeBackground(img, { r: 50, g: 50, b: 50 }, 10);
    expect(result.width).toBe(8);
    expect(result.height).toBe(6);
  });
});
