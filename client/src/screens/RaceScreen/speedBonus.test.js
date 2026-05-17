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
  // All calls use finishT=1.0 (closed) so formula == legacy N×tOffset — regression values
  // are identical to pre-Phase-1B. The bonus now also depends on finishT; these tests
  // cover the finishT=1.0 fixed point and are unaffected by jitter or spline changes.
  const rowGapPx = 39; // 26 * 1.5 (default rowGapMultiplier)
  const pathLengthPx = 5000;
  const factor = 1.0;
  const finishT = 1.0; // closed track, 1 lap — new required param
  const isOpen = false;
  const totalRows = 3;

  it('front row (rowIndex=0) gets no bonus', () => {
    expect(computeSpeedBonus(0, rowGapPx, pathLengthPx, factor, finishT, isOpen, totalRows)).toBe(
      0
    );
  });

  it('row 1 gets a positive bonus equal to 1×rowGap / pathLength when finishT=1.0', () => {
    const bonus = computeSpeedBonus(1, rowGapPx, pathLengthPx, factor, finishT, isOpen, totalRows);
    expect(bonus).toBeCloseTo(rowGapPx / pathLengthPx, 8);
    expect(bonus).toBeGreaterThan(0);
  });

  it('row 2 gets twice the bonus of row 1', () => {
    const b1 = computeSpeedBonus(1, rowGapPx, pathLengthPx, factor, finishT, isOpen, totalRows);
    const b2 = computeSpeedBonus(2, rowGapPx, pathLengthPx, factor, finishT, isOpen, totalRows);
    expect(b2).toBeCloseTo(b1 * 2, 8);
  });

  it('rear-row bonus is deterministic — unaffected by jitter or spline changes (for fixed finishT)', () => {
    // Given fixed geometry and finishT, bonus is deterministic (no randomness involved).
    const bonus = computeSpeedBonus(2, rowGapPx, pathLengthPx, factor, finishT, isOpen, totalRows);
    const expected = (2 * rowGapPx) / pathLengthPx; // finishT=1.0 → row0Distance=1 → legacy formula
    expect(bonus).toBeCloseTo(expected, 8);
  });
});
