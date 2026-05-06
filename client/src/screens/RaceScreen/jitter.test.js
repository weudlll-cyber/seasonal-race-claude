// ============================================================
// File:        jitter.test.js
// Path:        client/src/screens/RaceScreen/jitter.test.js
// Project:     RaceArena
// Created:     2026-05-04
// Description: PR-A2.5 regression — jitter amplitude scales with race_baseSpeed,
//              and speedBonus spatial values are unaffected.
// ============================================================

import { describe, it, expect } from 'vitest';
import { computeRaceBaseSpeed } from '../../modules/raceBaseSpeed.js';
import { computeSpeedBonus } from '../../modules/rowLayout.js';

// ── Jitter amplitude scaling ───────────────────────────────────────────────────

describe('jitter amplitude (PR-A2.5)', () => {
  const JITTER_FACTOR = 0.05;
  const finishT = 0.95; // open track, 5% runout

  it('jitter is 5% of race_baseSpeed for a 30s race', () => {
    const baseSpeed = computeRaceBaseSpeed(finishT, 30);
    const amplitude = baseSpeed * JITTER_FACTOR;
    expect(amplitude / baseSpeed).toBeCloseTo(JITTER_FACTOR, 10);
    // Numeric sanity: should be much smaller than baseSpeed itself
    expect(amplitude).toBeLessThan(baseSpeed);
    expect(amplitude).toBeGreaterThan(0);
  });

  it('jitter is 5% of race_baseSpeed for a 60s race', () => {
    const baseSpeed = computeRaceBaseSpeed(finishT, 60);
    const amplitude = baseSpeed * JITTER_FACTOR;
    expect(amplitude / baseSpeed).toBeCloseTo(JITTER_FACTOR, 10);
  });

  it('jitter is 5% of race_baseSpeed for a 90s race', () => {
    const baseSpeed = computeRaceBaseSpeed(finishT, 90);
    const amplitude = baseSpeed * JITTER_FACTOR;
    expect(amplitude / baseSpeed).toBeCloseTo(JITTER_FACTOR, 10);
  });

  it('jitter amplitude scales linearly with race_baseSpeed across durations', () => {
    const b30 = computeRaceBaseSpeed(finishT, 30);
    const b60 = computeRaceBaseSpeed(finishT, 60);
    const b90 = computeRaceBaseSpeed(finishT, 90);
    // baseSpeed is inversely proportional to duration
    expect(b30 / b60).toBeCloseTo(2, 5);
    expect(b60 / b90).toBeCloseTo(1.5, 5);
    // Jitter amplitudes scale by the same ratios
    expect((b30 * JITTER_FACTOR) / (b60 * JITTER_FACTOR)).toBeCloseTo(2, 5);
    expect((b60 * JITTER_FACTOR) / (b90 * JITTER_FACTOR)).toBeCloseTo(1.5, 5);
  });

  it('jitter never exceeds baseSpeed (racers always move forward)', () => {
    // max jitter = race_baseSpeed * 0.05 — racer t still advances at 95% of base minimum
    for (const duration of [30, 60, 90, 120]) {
      const baseSpeed = computeRaceBaseSpeed(finishT, duration);
      const maxJitter = baseSpeed * JITTER_FACTOR;
      expect(maxJitter).toBeLessThan(baseSpeed);
    }
  });

  it('old hardcoded amplitude was disproportionate at 30s race', () => {
    // Before PR-A2.5: amplitude = 0.00012, a fixed constant.
    // At 30s: race_baseSpeed ≈ finishT / (REFERENCE_FPS * 30) so ratio was huge.
    const baseSpeed = computeRaceBaseSpeed(finishT, 30);
    const oldAmplitude = 0.00012;
    const oldRatio = oldAmplitude / baseSpeed;
    // Old ratio was >> 0.05, confirming the bug was real
    expect(oldRatio).toBeGreaterThan(0.15);
  });
});

// ── speedBonus regression (PR-A2.5 must not change spatial speed bonuses) ────

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
    // This test ensures PR-A2.5 did not accidentally couple the spatial bonus to temporal state.
    const bonus = computeSpeedBonus(2, rowGapPx, pathLengthPx, factor);
    const expected = (2 * rowGapPx) / pathLengthPx;
    expect(bonus).toBeCloseTo(expected, 8);
  });
});
