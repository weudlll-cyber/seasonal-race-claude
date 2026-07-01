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
