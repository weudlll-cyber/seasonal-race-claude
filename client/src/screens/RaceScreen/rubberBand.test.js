// ============================================================
// File:        rubberBand.test.js
// Path:        client/src/screens/RaceScreen/rubberBand.test.js
// Project:     RaceArena
// Description: Unit tests for the rubber-band "cap the lead" mechanism. Tests the
//              REAL shared helper (raceRubberBand.js), not a re-implementation.
// ============================================================

import { describe, it, expect } from 'vitest';
import { DEFAULT_RUBBER_BAND_CONFIG } from '../../modules/storage/defaults.js';
import {
  computeMedianT,
  rubberBandTargetMult,
  applyRubberBand,
} from '../../modules/raceRubberBand.js';

const CFG = {
  enabled: true,
  brakeThreshold: 0.03,
  gapScale: 0.025,
  maxBrake: 0.1,
  boostRampMs: 2000,
  rubberBandEndgameThreshold: 0.9,
};

function makeRacer(t, finished = false) {
  return {
    t,
    finished,
    rubberBandMult: 1.0,
    rubberBandMultPrev: 1.0,
    rubberBandMultTarget: 1.0,
    rubberBandTransStart: 0,
  };
}

// ── DEFAULT_RUBBER_BAND_CONFIG shape ──────────────────────────────────────────

describe('DEFAULT_RUBBER_BAND_CONFIG', () => {
  it('has the cap-the-lead keys', () => {
    for (const k of [
      'enabled',
      'brakeThreshold',
      'gapScale',
      'maxBrake',
      'boostRampMs',
      'rubberBandEndgameThreshold',
    ]) {
      expect(DEFAULT_RUBBER_BAND_CONFIG).toHaveProperty(k);
    }
  });

  it('does not have the removed boost-all keys', () => {
    expect(DEFAULT_RUBBER_BAND_CONFIG).not.toHaveProperty('flatBoost');
    expect(DEFAULT_RUBBER_BAND_CONFIG).not.toHaveProperty('gapThreshold');
  });

  it('is DEFAULT-ON (fairness sweep passed at maxBrake 0.10)', () => {
    expect(DEFAULT_RUBBER_BAND_CONFIG.enabled).toBe(true);
  });

  it('defaults are within valid ranges; maxBrake locked at ≤ 0.10', () => {
    const c = DEFAULT_RUBBER_BAND_CONFIG;
    expect(c.brakeThreshold).toBeGreaterThanOrEqual(0);
    expect(c.brakeThreshold).toBeLessThan(1);
    expect(c.gapScale).toBeGreaterThan(0);
    expect(c.maxBrake).toBeGreaterThanOrEqual(0);
    expect(c.maxBrake).toBeLessThanOrEqual(0.1); // 0.15 ceiling sweep-locked
    expect(c.boostRampMs).toBeGreaterThan(0);
    expect(c.rubberBandEndgameThreshold).toBeGreaterThan(0);
    expect(c.rubberBandEndgameThreshold).toBeLessThanOrEqual(1);
  });
});

// ── rubberBandTargetMult — proportional brake formula stress test ─────────────

describe('rubberBandTargetMult', () => {
  it('myGap = brakeThreshold → 1.0 (no brake, no discontinuity)', () => {
    expect(rubberBandTargetMult(CFG.brakeThreshold, CFG)).toBeCloseTo(1.0, 12);
  });

  it('myGap < brakeThreshold → 1.0', () => {
    expect(rubberBandTargetMult(0.0, CFG)).toBeCloseTo(1.0, 12);
    expect(rubberBandTargetMult(CFG.brakeThreshold - 0.001, CFG)).toBeCloseTo(1.0, 12);
    expect(rubberBandTargetMult(-0.5, CFG)).toBeCloseTo(1.0, 12); // lapped racer: never braked
  });

  it('myGap = brakeThreshold + gapScale → full brake (1 - maxBrake)', () => {
    expect(rubberBandTargetMult(CFG.brakeThreshold + CFG.gapScale, CFG)).toBeCloseTo(
      1 - CFG.maxBrake,
      12
    );
  });

  it('myGap huge → clamped at 1 - maxBrake (no overshoot)', () => {
    expect(rubberBandTargetMult(100, CFG)).toBeCloseTo(1 - CFG.maxBrake, 12);
  });

  it('halfway up the ramp → half brake (linear)', () => {
    const half = CFG.brakeThreshold + CFG.gapScale / 2;
    expect(rubberBandTargetMult(half, CFG)).toBeCloseTo(1 - CFG.maxBrake / 2, 12);
  });

  it('is monotonic non-increasing in myGap', () => {
    let prev = Infinity;
    for (let g = 0; g <= 0.12; g += 0.005) {
      const m = rubberBandTargetMult(g, CFG);
      expect(m).toBeLessThanOrEqual(prev + 1e-12);
      prev = m;
    }
  });
});

// ── computeMedianT — raw cumulative-t, ignores finished ───────────────────────

describe('computeMedianT', () => {
  it('odd count → single middle (raw t)', () => {
    expect(computeMedianT([makeRacer(0.1), makeRacer(0.5), makeRacer(0.9)])).toBeCloseTo(0.5, 12);
  });

  it('even count → mean of two central order-statistics', () => {
    expect(
      computeMedianT([makeRacer(0.1), makeRacer(0.4), makeRacer(0.6), makeRacer(0.9)])
    ).toBeCloseTo(0.5, 12);
  });

  it('ignores finished racers', () => {
    expect(computeMedianT([makeRacer(0.1), makeRacer(0.5), makeRacer(2.0, true)])).toBeCloseTo(
      0.3,
      12
    ); // median of [0.1, 0.5] only
  });

  it('uses RAW cumulative-t, not tPos (multi-lap aware)', () => {
    // t can exceed 1.0 on closed tracks; a 1.5-lap racer must count as ahead, not mod-1.
    expect(computeMedianT([makeRacer(0.4), makeRacer(0.6), makeRacer(1.5)])).toBeCloseTo(0.6, 12);
  });

  it('null when no non-finished racers', () => {
    expect(computeMedianT([makeRacer(0.5, true)])).toBeNull();
  });
});

// ── applyRubberBand — integration ─────────────────────────────────────────────

describe('applyRubberBand', () => {
  it('disabled → no-op (rubberBandMult stays 1.0)', () => {
    const racers = [makeRacer(1.5), makeRacer(0.5), makeRacer(0.4)];
    applyRubberBand(racers, 2, 5000, { ...CFG, enabled: false });
    for (const r of racers) expect(r.rubberBandMult).toBe(1.0);
  });

  it('brakes only the far-ahead racer; bulk stays 1.0', () => {
    // finishT=2; leader t=1.0 (progress 0.5 < 0.9 → active). median of [1.0,0.5,0.5,0.4] = 0.5.
    const racers = [makeRacer(1.0), makeRacer(0.5), makeRacer(0.5), makeRacer(0.4)];
    applyRubberBand(racers, 2, 0, CFG); // set targets (ramp starts at 1.0)
    applyRubberBand(racers, 2, CFG.boostRampMs, CFG); // ramp reaches target
    // leader myGap = (1.0-0.5)/2 = 0.25 ≫ threshold+scale → full brake
    expect(racers[0].rubberBandMult).toBeCloseTo(1 - CFG.maxBrake, 6);
    // bulk myGap ≤ 0 → untouched (preserves controller sorting room)
    expect(racers[1].rubberBandMult).toBeCloseTo(1.0, 6);
    expect(racers[2].rubberBandMult).toBeCloseTo(1.0, 6);
    expect(racers[3].rubberBandMult).toBeCloseTo(1.0, 6);
  });

  it('brakes ALL front-breakaway racers (gap-based, not just leader)', () => {
    // Two racers far ahead of the median → both braked (no shift-to-2nd).
    const racers = [
      makeRacer(1.0),
      makeRacer(0.95),
      makeRacer(0.3),
      makeRacer(0.3),
      makeRacer(0.3),
    ];
    applyRubberBand(racers, 2, 0, CFG);
    applyRubberBand(racers, 2, CFG.boostRampMs, CFG);
    expect(racers[0].rubberBandMult).toBeLessThan(1.0);
    expect(racers[1].rubberBandMult).toBeLessThan(1.0); // the new "2nd" is also braked
    expect(racers[2].rubberBandMult).toBeCloseTo(1.0, 6);
  });

  it('hard-off above endgame threshold → targets release to 1.0', () => {
    // finishT=2; leader t=1.9 → progress 0.95 ≥ 0.9 → not braking → release.
    const racers = [makeRacer(1.9), makeRacer(0.5)];
    racers[0].rubberBandMult = 0.9; // pretend previously braked
    racers[0].rubberBandMultTarget = 0.9;
    applyRubberBand(racers, 2, 0, CFG); // sets target back to 1.0
    applyRubberBand(racers, 2, CFG.boostRampMs, CFG); // ramps to 1.0
    expect(racers[0].rubberBandMult).toBeCloseTo(1.0, 6);
  });

  it('finished racers forced to 1.0', () => {
    const racers = [makeRacer(1.0), makeRacer(0.9, true)];
    racers[1].rubberBandMult = 0.85;
    applyRubberBand(racers, 2, CFG.boostRampMs, CFG);
    expect(racers[1].rubberBandMult).toBe(1.0);
  });
});
