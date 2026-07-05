// ============================================================
// File:        raceRubberBand.test.js
// Path:        client/src/modules/raceRubberBand.test.js
// Project:     RaceArena
// Description: Unit tests for the rubber-band brake, focused on the PULK-surge
//              partial brake exemption (surgeExemptStrength).
// ============================================================

import { describe, it, expect } from 'vitest';
import { applyRubberBand } from './raceRubberBand.js';

// Rubber-band config that puts a front-breakaway racer into full-brake territory.
// brakeThreshold 0.05, gapScale 0.2, maxBrake 0.1 → a gap of 0.4 ramps to full brake (target 0.9).
const CFG = {
  enabled: true,
  brakeThreshold: 0.05,
  gapScale: 0.2,
  maxBrake: 0.1,
  boostRampMs: 1000,
  rubberBandEndgameThreshold: 0.9,
};

// Field: one front racer (large gap) plus three followers pinning the median low.
// medianT of [0.5, 0.1, 0.1, 0.1] = 0.1 → front racer gap = (0.5 - 0.1)/1 = 0.4 → full brake.
function makeField(frontSurgeMult) {
  const mk = (index, t, pulkSurgeMult) => ({
    index,
    t,
    finished: false,
    rubberBandMult: 1.0,
    rubberBandMultPrev: 1.0,
    rubberBandMultTarget: 1.0,
    rubberBandTransStart: 0,
    pulkSurgeMult,
  });
  return [
    mk(0, 0.5, frontSurgeMult), // front breakaway racer
    mk(1, 0.1, 1.0),
    mk(2, 0.1, 1.0),
    mk(3, 0.1, 1.0),
  ];
}

const FINISH_T = 1.0;
const NOW_MS = 5000;

describe('applyRubberBand — PULK-surge partial brake exemption', () => {
  it('surgeExemptStrength 0 → surging racer gets the full brake', () => {
    const racers = makeField(1.1); // front racer is surging
    applyRubberBand(racers, FINISH_T, NOW_MS, CFG, 0);
    // Full brake target = 1 - maxBrake = 0.9 (reduction 0.1).
    expect(racers[0].rubberBandMultTarget).toBeCloseTo(0.9, 6);
  });

  it('surgeExemptStrength 0.5 → surging racer gets half the brake reduction', () => {
    const racers = makeField(1.1); // front racer is surging
    applyRubberBand(racers, FINISH_T, NOW_MS, CFG, 0.5);
    // effectiveTarget = 1 - (1 - 0.9) * (1 - 0.5) = 1 - 0.05 = 0.95 (reduction halved).
    expect(racers[0].rubberBandMultTarget).toBeCloseTo(0.95, 6);
  });

  it('exemption only applies to surging racers (pulkSurgeMult > 1)', () => {
    const racers = makeField(1.0); // front racer NOT surging
    applyRubberBand(racers, FINISH_T, NOW_MS, CFG, 0.5);
    // Not surging → exemption ignored → full brake target unchanged.
    expect(racers[0].rubberBandMultTarget).toBeCloseTo(0.9, 6);
  });
});

// ── Brake-1 TIP-FOCUS mode (rubberBandTipThreshold > 0) ───────────────────────
describe('applyRubberBand — Brake-1 tip-focus (leader-only, leader→2nd gap)', () => {
  // Field: leader at 0.5, 2nd at 0.1, two more at 0.1 → leader→2nd gap = 0.4.
  // tipThreshold 0.05, gapScale 0.2, maxBrake 0.15 → ramp = (0.4-0.05)/0.2 clamps to 1 → full −15%.
  const TIP_CFG = {
    enabled: true,
    brakeThreshold: 0.03, // legacy field, must be IGNORED in tip-focus
    gapScale: 0.2,
    maxBrake: 0.15,
    boostRampMs: 1000,
    rubberBandEndgameThreshold: 0.9,
    rubberBandTipThreshold: 0.05,
  };
  const mk = (index, t) => ({
    index,
    t,
    finished: false,
    rubberBandMult: 1.0,
    rubberBandMultPrev: 1.0,
    rubberBandMultTarget: 1.0,
    rubberBandTransStart: 0,
  });

  it('brakes ONLY the instantaneous leader; the rest of the field runs free', () => {
    const racers = [mk(0, 0.5), mk(1, 0.1), mk(2, 0.1), mk(3, 0.1)];
    applyRubberBand(racers, FINISH_T, NOW_MS, TIP_CFG, 0);
    expect(racers[0].rubberBandMultTarget).toBeCloseTo(0.85, 6); // leader: full −15%
    expect(racers[1].rubberBandMultTarget).toBeCloseTo(1.0, 6); // 2nd: free
    expect(racers[2].rubberBandMultTarget).toBeCloseTo(1.0, 6);
    expect(racers[3].rubberBandMultTarget).toBeCloseTo(1.0, 6);
  });

  it('a close front (leader→2nd gap below tipThreshold) runs free', () => {
    // leader 0.12, 2nd 0.10 → gap 0.02 < tipThreshold 0.05 → no brake anywhere.
    const racers = [mk(0, 0.12), mk(1, 0.1), mk(2, 0.05), mk(3, 0.05)];
    applyRubberBand(racers, FINISH_T, NOW_MS, TIP_CFG, 0);
    expect(racers[0].rubberBandMultTarget).toBeCloseTo(1.0, 6);
  });

  it('does not brake ahead-of-median non-leaders that the legacy path would (tip-focus is leader-only)', () => {
    // 2nd (0.4) is far ahead of median but is NOT the leader → legacy would brake it, tip-focus does not.
    const racers = [mk(0, 0.5), mk(1, 0.4), mk(2, 0.05), mk(3, 0.05)];
    applyRubberBand(racers, FINISH_T, NOW_MS, TIP_CFG, 0);
    expect(racers[1].rubberBandMultTarget).toBeCloseTo(1.0, 6); // 2nd runs free under tip-focus
  });

  it('tipThreshold = 0 (default) falls back to the legacy median-gap brake (unchanged)', () => {
    const racers = [mk(0, 0.5), mk(1, 0.1), mk(2, 0.1), mk(3, 0.1)];
    // Legacy CFG (no tip field): median 0.1, leader gap 0.4 → full brake at maxBrake 0.1.
    applyRubberBand(racers, FINISH_T, NOW_MS, CFG, 0);
    expect(racers[0].rubberBandMultTarget).toBeCloseTo(0.9, 6);
  });
});
