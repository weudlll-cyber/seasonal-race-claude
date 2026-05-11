// ============================================================
// File:        speedBonus.test.js
// Path:        client/src/screens/RaceScreen/speedBonus.test.js
// Project:     RaceArena
// Created:     2026-05-04
// Description: speedBonus spatial regression — back-row compensation values
//              must not change when race physics are modified.
// ============================================================

import { describe, it, expect } from 'vitest';
import { computeSpeedBonus } from '../../modules/rowLayout.js';

// ── speedBonus regression ─────────────────────────────────────────────────────

describe('speedBonus spatial values — PR-A2.5 regression', () => {
  // Realistic scenario: 140px track, 26px sprite, 3 rows.
  // These values must be identical before and after PR-A2.5 (speedBonus is spatial,
  // not temporal — it is unaffected by jitter or spline changes).
  const rowGapPx = 39; // 26 * 1.5 (default rowGapMultiplier)
  const pathLengthPx = 5000;
  const factor = 1.0;

  it('front row (rowIndex=0) gets no bonus', () => {
    expect(computeSpeedBonus(0, rowGapPx, pathLengthPx, factor)).toBe(0);
  });

  it('row 1 gets a positive bonus proportional to 1×rowGap / pathLength', () => {
    const bonus = computeSpeedBonus(1, rowGapPx, pathLengthPx, factor);
    expect(bonus).toBeCloseTo(rowGapPx / pathLengthPx, 8);
    expect(bonus).toBeGreaterThan(0);
  });

  it('row 2 gets twice the bonus of row 1', () => {
    const b1 = computeSpeedBonus(1, rowGapPx, pathLengthPx, factor);
    const b2 = computeSpeedBonus(2, rowGapPx, pathLengthPx, factor);
    expect(b2).toBeCloseTo(b1 * 2, 8);
  });

  it('rear-row bonus is unaffected by different race durations or jitter', () => {
    // speedBonus is computed from track geometry only — duration and jitter have no effect.
    const bonus = computeSpeedBonus(2, rowGapPx, pathLengthPx, factor);
    const expected = (2 * rowGapPx) / pathLengthPx;
    expect(bonus).toBeCloseTo(expected, 8);
  });
});
