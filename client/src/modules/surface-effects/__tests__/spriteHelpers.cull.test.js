// @vitest-environment node
// ============================================================
// File:        spriteHelpers.cull.test.js
// Path:        client/src/modules/surface-effects/__tests__/spriteHelpers.cull.test.js
// Project:     RaceArena — PARTICLES-VISIBILITY-2
// Description: The viewport cull must test each axis with its own scale. A closed track scales the
//              world differently across and down; the cull used the across scale for both, and on
//              Dirt Oval it threw away 90% of the on-screen dust with the camera on the bottom straight.
// ============================================================
import { describe, it, expect } from 'vitest';
import { cullBounds, isVisible, isSegmentVisible } from '../generators/spriteHelpers.js';

// Twice as wide as it is tall: world x → 2x on screen, world y → 1x. A 100x100 canvas.
const anisotropicCtx = {
  getTransform: () => ({ a: 2, b: 0, c: 0, d: 1, e: 0, f: 0 }),
  canvas: { width: 100, height: 100 },
};

describe('cullBounds', () => {
  it('keeps BOTH axis scales from the transform', () => {
    const cull = cullBounds(anisotropicCtx);
    expect(cull.sx).toBe(2);
    expect(cull.sy).toBe(1);
  });
});

describe('isVisible — each axis with its own scale', () => {
  const cull = cullBounds(anisotropicCtx);

  it('keeps a particle whose SCREEN y is on the canvas although y × (x scale) is not', () => {
    // Screen y = 80 × 1 = 80: on the canvas. Testing y with the x scale gave 160 and culled it.
    expect(isVisible(cull, 10, 80, 1)).toBe(true);
  });

  it('still culls a particle that really is below the canvas', () => {
    expect(isVisible(cull, 10, 150, 1)).toBe(false);
  });

  it('still tests x with the x scale', () => {
    // Screen x = 60 × 2 = 120: off a 100-wide canvas.
    expect(isVisible(cull, 60, 10, 1)).toBe(false);
    expect(isVisible(cull, 40, 10, 1)).toBe(true);
  });

  it('pads each axis by the radius in THAT axis', () => {
    // Centre at screen y = 102, radius 3 world → 3 px down: the circle reaches back onto the canvas.
    expect(isVisible(cull, 10, 102, 3)).toBe(true);
    expect(isVisible(cull, 10, 104, 3)).toBe(false);
  });
});

describe('isSegmentVisible — the same correction for the line generator', () => {
  const cull = cullBounds(anisotropicCtx);

  it('keeps a segment whose SCREEN y is on the canvas although y × (x scale) is not', () => {
    expect(isSegmentVisible(cull, 10, 70, 20, 80, 1)).toBe(true);
  });

  it('still culls a segment that really is below the canvas', () => {
    expect(isSegmentVisible(cull, 10, 150, 20, 160, 1)).toBe(false);
  });

  it('still tests x with the x scale', () => {
    expect(isSegmentVisible(cull, 60, 10, 70, 20, 1)).toBe(false);
  });
});
