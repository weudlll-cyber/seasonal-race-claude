// ============================================================
// File:        particleRendering.test.js
// Path:        client/src/screens/RaceScreen/drawing/particleRendering.test.js
// Project:     RaceArena
// Created:     2026-06-10
// Description: Contract tests for emitBurst — particle count, origin, and
//              palette invariants. No canvas mock needed (pure data mutation).
// ============================================================

import { describe, it, expect } from 'vitest';
import { emitBurst } from './particleRendering.js';

const BURST_PALETTE = ['#ffd700', '#ff6b35', '#ff3388', '#00ffcc', '#fff', '#ff0', '#0ff'];

describe('emitBurst', () => {
  // ── Invariant: exactly 45 particles per burst ────────────────────────────────
  it('appends exactly 45 particles to the provided array', () => {
    const arr = [];
    emitBurst(arr, 0, 0);
    expect(arr).toHaveLength(45);
  });

  // ── Invariant: each particle carries the supplied origin and initial alpha ───
  it('every particle carries the supplied origin coordinates and alpha 1', () => {
    const arr = [];
    emitBurst(arr, 100, 200);
    for (const p of arr) {
      expect(p.x).toBe(100);
      expect(p.y).toBe(200);
      expect(p.alpha).toBe(1);
    }
  });

  // ── Invariant: color is always drawn from the known palette ──────────────────
  it('every particle color is drawn from the known palette', () => {
    const arr = [];
    emitBurst(arr, 0, 0);
    for (const p of arr) {
      expect(BURST_PALETTE).toContain(p.color);
    }
  });
});
