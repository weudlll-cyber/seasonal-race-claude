// ============================================================
// File:        canvasUtils.bodyRule.test.js
// Path:        client/src/screens/RacerEditor/canvasUtils.bodyRule.test.js
// Project:     RaceArena
// Created:     2026-09-02
// Description: Pins WHICH bounding-box rule measureBodyFill measures with.
//              The owner, 2026-09-02: a racer's body is the opaque bounding
//              box of the artwork, tails and fins included. The rule and the
//              decision live in docs/RACER_DATA_MODEL.md § "What a racer's
//              BODY is"; this file is what stops the code drifting off it.
//
// WHY A SECOND FILE. canvasUtils.test.js mocks the bounding box in order to pin
// the per-frame union arithmetic. A mocked box cannot notice which real rule is
// wired in — which is precisely how the editor came to measure with the
// shedding rule while all forty registry values had been produced by the plain
// one (SPRITE-AUDIT-DERIVATION-1). So this file mocks NOTHING below the canvas:
// real pixels go in, the real box functions run, and the number that comes out
// is compared against both rules by name.
//
// THE SABOTAGE THIS MUST CATCH (proven 2026-09-02): point measureBodyFill back
// at computeSpriteBoundingBox and `the tail is body` goes red, reporting 0.62
// where the body rule says 0.80.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { measureBodyFill } from './canvasUtils.js';
import {
  computeOpaqueBoundingBox,
  computeSpriteBoundingBox,
} from '../../modules/racer-types/backgroundRemoval.js';

const FRAME = 100;

/**
 * One frame carrying a solid body with a SPARSE TAIL below it — the manta's shape,
 * reduced to the smallest thing that separates the two rules.
 *
 *   rows  0– 9   empty
 *   rows 10–69   solid block, columns 20–79
 *   rows 70–89   the tail: a single opaque column at x = 50
 *   rows 90–99   empty
 *
 * The plain box keeps the tail: y spans 10–89, so bodyFillY = 80/100 = 0.80.
 * The shedding box eats it three rows at a time until it meets the solid block,
 * stopping at y = 71, so it would report 62/100 = 0.62.
 */
function frameWithSparseTail() {
  const data = new Uint8ClampedArray(FRAME * FRAME * 4);
  const set = (x, y, alpha) => {
    data[(y * FRAME + x) * 4 + 3] = alpha;
  };
  for (let y = 10; y <= 69; y++) for (let x = 20; x <= 79; x++) set(x, y, 255);
  for (let y = 70; y <= 89; y++) set(50, y, 255);
  return { width: FRAME, height: FRAME, data };
}

let OrigImage;
let createElementSpy;

function installCanvas(imageData) {
  OrigImage = globalThis.Image;
  globalThis.Image = class MockImage {
    constructor() {
      this.onload = null;
      this.onerror = null;
      this.naturalWidth = FRAME;
      this.naturalHeight = FRAME;
    }
    set src(_url) {
      if (this.onload) this.onload();
    }
  };
  // The canvas is stubbed because jsdom has no 2D context. The PIXELS are real,
  // and they are what the box functions actually run on.
  const ctx = {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(() => imageData),
  };
  const canvas = { width: 0, height: 0, getContext: vi.fn().mockReturnValue(ctx) };
  const realCreate = document.createElement.bind(document);
  createElementSpy = vi
    .spyOn(document, 'createElement')
    .mockImplementation((tag) => (tag === 'canvas' ? canvas : realCreate(tag)));
}

describe('measureBodyFill measures with the OWNING rule (the owner, 2026-09-02)', () => {
  beforeEach(() => {
    installCanvas(frameWithSparseTail());
  });

  afterEach(() => {
    if (OrigImage) globalThis.Image = OrigImage;
    createElementSpy?.mockRestore();
  });

  it('the two rules genuinely disagree on this frame, so the assertion below can fail', () => {
    const img = frameWithSparseTail();
    const plain = computeOpaqueBoundingBox(img);
    const shed = computeSpriteBoundingBox(img);
    expect(plain.maxY).toBe(89);
    expect(shed.maxY).toBe(71);
  });

  it('the tail is body — bodyFillY is the plain box, not the shed one', async () => {
    const result = await measureBodyFill('data:image/png;base64,abc', 1);
    expect(result).not.toBeNull();
    // 0.80 = the plain box keeps the tail. 0.62 = the shedding box trimmed it.
    expect(result.bodyFillY).toBeCloseTo(0.8, 5);
    expect(result.bodyFillY).not.toBeCloseTo(0.62, 2);
  });

  it('the axis the tail does not touch is unaffected, so the check is not just "bigger"', async () => {
    const result = await measureBodyFill('data:image/png;base64,abc', 1);
    // Both rules agree on X here (60/100). A rule swap must not move it.
    expect(result.bodyFillX).toBeCloseTo(0.6, 5);
  });
});
