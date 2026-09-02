// ============================================================
// File:        canvasUtils.test.js
// Path:        client/src/screens/RacerEditor/canvasUtils.test.js
// Project:     RaceArena
// Description: Tests for measureBodyFill (B-mess honesty proof, D6b-finalize).
//
// Honesty proofs (L126 — RED without / GREEN with):
// (b-frame) computeOpaqueBoundingBox is called once PER FRAME (not once on
//   the full strip). RED if called with width = frameCount×frameWidth instead
//   of frameWidth.
//
// These tests MOCK the bounding box, so they pin the union arithmetic and say
// nothing about WHICH box rule is used. That is pinned unmocked, against real
// pixels, in canvasUtils.bodyRule.test.js — see the note there.
// (b-union) bodyFillX/Y are derived from the per-frame union bbox.
//   Content fills half a frame → bodyFillX ≈ 0.5.
// (b-null) Fully transparent strip → null returned (no division by zero).
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ── Module mock ────────────────────────────────────────────────────────────────

vi.mock('../../modules/racer-types/backgroundRemoval.js', () => ({
  computeOpaqueBoundingBox: vi.fn(),
}));

// ── Imports (after mock) ───────────────────────────────────────────────────────

import { measureBodyFill } from './canvasUtils.js';
import { computeOpaqueBoundingBox } from '../../modules/racer-types/backgroundRemoval.js';

// ── Canvas + Image mock helpers ────────────────────────────────────────────────

const FRAME_SIZE = 128;

let OrigImage;
let createElementSpy;

function buildMockCtx() {
  return {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn((x, y, w, h) => ({
      width: w,
      height: h,
      data: new Uint8ClampedArray(w * h * 4),
    })),
  };
}

function installMocks(stripWidth, stripHeight) {
  // Mock Image so onload fires immediately with controlled dimensions.
  OrigImage = globalThis.Image;
  globalThis.Image = class MockImage {
    constructor() {
      this.onload = null;
      this.onerror = null;
      this.naturalWidth = stripWidth;
      this.naturalHeight = stripHeight;
    }
    set src(_url) {
      if (this.onload) this.onload();
    }
  };

  // Mock document.createElement('canvas') → fake canvas with a mock 2D context.
  const mockCtx = buildMockCtx();
  const mockCanvas = { width: 0, height: 0, getContext: vi.fn().mockReturnValue(mockCtx) };
  const realCreate = document.createElement.bind(document);
  createElementSpy = vi
    .spyOn(document, 'createElement')
    .mockImplementation((tag) => (tag === 'canvas' ? mockCanvas : realCreate(tag)));
  return mockCtx;
}

function uninstallMocks() {
  if (OrigImage) globalThis.Image = OrigImage;
  createElementSpy?.mockRestore();
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('measureBodyFill (B-mess honesty proof, D6b-finalize)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: 2-frame strip (2×128 wide, 128 tall)
    installMocks(FRAME_SIZE * 2, FRAME_SIZE);
  });

  afterEach(() => {
    uninstallMocks();
  });

  it('(b-frame) computeOpaqueBoundingBox called once per frame, not once on full strip', async () => {
    computeOpaqueBoundingBox.mockReturnValue({ minX: 0, maxX: 63, minY: 0, maxY: 127 });
    await measureBodyFill('data:image/png;base64,abc', 2);
    expect(computeOpaqueBoundingBox).toHaveBeenCalledTimes(2);
  });

  it('(b-frame) imageData passed to computeOpaqueBoundingBox has frame dimensions, not strip width', async () => {
    computeOpaqueBoundingBox.mockReturnValue(null);
    await measureBodyFill('data:image/png;base64,abc', 2);
    for (const call of computeOpaqueBoundingBox.mock.calls) {
      const imageData = call[0];
      // Each call must receive frame-local imageData (128×128), NOT the full strip (256×128).
      expect(imageData.width).toBe(FRAME_SIZE);
      expect(imageData.height).toBe(FRAME_SIZE);
    }
  });

  it('(b-union) content filling half frame width → bodyFillX ≈ 0.5', async () => {
    // minX=0, maxX=63 → unionWidth = 64 → bodyFillX = 64/128 = 0.5
    computeOpaqueBoundingBox.mockReturnValue({ minX: 0, maxX: 63, minY: 0, maxY: 127 });
    const result = await measureBodyFill('data:image/png;base64,abc', 2);
    expect(result).not.toBeNull();
    expect(result.bodyFillX).toBeCloseTo(64 / 128);
    expect(result.bodyFillY).toBeCloseTo(1.0);
  });

  it('(b-null) all frames transparent → null returned', async () => {
    computeOpaqueBoundingBox.mockReturnValue(null);
    const result = await measureBodyFill('data:image/png;base64,abc', 2);
    expect(result).toBeNull();
  });

  it('union spans all frames — bbox across different frames is combined', async () => {
    // Frame 0: top half only (minY=0, maxY=63), Frame 1: bottom half (minY=64, maxY=127)
    computeOpaqueBoundingBox
      .mockReturnValueOnce({ minX: 0, maxX: 63, minY: 0, maxY: 63 })
      .mockReturnValueOnce({ minX: 0, maxX: 63, minY: 64, maxY: 127 });
    const result = await measureBodyFill('data:image/png;base64,abc', 2);
    // union minY=0, maxY=127 → height=128 → bodyFillY=1.0
    expect(result.bodyFillY).toBeCloseTo(1.0);
    // union minX=0, maxX=63 → width=64 → bodyFillX≈0.5
    expect(result.bodyFillX).toBeCloseTo(0.5);
  });

  it('frameWidth and frameHeight are included in the result', async () => {
    computeOpaqueBoundingBox.mockReturnValue({ minX: 0, maxX: 63, minY: 0, maxY: 127 });
    const result = await measureBodyFill('data:image/png;base64,abc', 2);
    expect(result.frameWidth).toBe(FRAME_SIZE);
    expect(result.frameHeight).toBe(FRAME_SIZE);
  });

  it('4-frame strip: computeOpaqueBoundingBox called 4 times', async () => {
    // Reinstall with 4-frame strip dimensions.
    uninstallMocks();
    installMocks(FRAME_SIZE * 4, FRAME_SIZE);
    computeOpaqueBoundingBox.mockReturnValue({ minX: 0, maxX: 63, minY: 0, maxY: 127 });
    await measureBodyFill('data:image/png;base64,abc', 4);
    expect(computeOpaqueBoundingBox).toHaveBeenCalledTimes(4);
  });
});
