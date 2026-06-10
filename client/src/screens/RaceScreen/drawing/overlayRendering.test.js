// ============================================================
// File:        overlayRendering.test.js
// Path:        client/src/screens/RaceScreen/drawing/overlayRendering.test.js
// Project:     RaceArena
// Created:     2026-06-10
// Description: Contract tests for drawCountdownOverlay — return value (n) at
//              each second boundary. Canvas calls are stubbed but not asserted;
//              only the returned integer is verified.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { drawCountdownOverlay } from './overlayRendering.js';

function makeCtxMock() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 50 }),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    textAlign: '',
    textBaseline: '',
    font: '',
    fillStyle: '',
    shadowBlur: 0,
    shadowColor: '',
  };
}

describe('drawCountdownOverlay — return value', () => {
  // ── Invariant: 3 at start and up to (but not including) 1 s ─────────────────
  it('returns 3 at elapsed 0 ms and at the boundary just before 1 s (999 ms)', () => {
    const ctx = makeCtxMock();
    expect(drawCountdownOverlay(ctx, 0)).toBe(3);
    expect(drawCountdownOverlay(ctx, 999)).toBe(3);
  });

  // ── Invariant: steps down by 1 at each whole second ─────────────────────────
  it('returns 2 at elapsed 1000 ms', () => {
    expect(drawCountdownOverlay(makeCtxMock(), 1000)).toBe(2);
  });

  it('returns 1 at elapsed 2000 ms', () => {
    expect(drawCountdownOverlay(makeCtxMock(), 2000)).toBe(1);
  });

  // ── Invariant: 0 ("GO!") at exactly 3 s and is floor-clamped, not ceil ──────
  it('returns 0 at elapsed 3000 ms', () => {
    expect(drawCountdownOverlay(makeCtxMock(), 3000)).toBe(0);
  });

  it('returns 0 (clamped) for large elapsed values', () => {
    expect(drawCountdownOverlay(makeCtxMock(), 99999)).toBe(0);
  });
});
