// ============================================================
// File:        raceGovernor.test.js
// Path:        client/src/modules/raceGovernor.test.js
// Project:     RaceArena
// Description: Unit tests for the Pre-OUTCOME Field Governor (progressive rubber-band
//              redesign). Covers: barrier curve (soft→stiff, monotonic, reaches maxEffect
//              at the bound, no flat spot below it), both-sides symmetry, Action→(bound,A)
//              map with k0 fixed + min-floor, length→t bound conversion, structural
//              OUTCOME-off, exact fade (incl. near-zero span), slew smoothness, determinism.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  applyGovernor,
  governorShufflePhase,
  governorActionToParams,
  governorRestoringForce,
  governorPhaseWeight,
} from './raceGovernor.js';

const CFG = {
  enabled: true,
  drama: 0.5,
  k0: 0.03,
  lengthBoundMin: 2.0,
  lengthBoundMax: 3.2,
  lengthBoundFloor: 2.0,
  aMin: 0.005,
  aMax: 0.02,
  frequency: 3,
  maxEffect: 0.12,
  maxStepPerFrame: 0.01,
};

const mkRacers = (ts) => ts.map((t, i) => ({ index: i, t, finished: false, governorMult: 1.0 }));
const ctx = (over = {}) => ({
  progress: 0.3,
  pulkEndFrac: 0.5,
  corrStartFrac: 0.55,
  seed: 1,
  oneLenT: 0.01,
  ...over,
});

describe('governorRestoringForce — barrier curve', () => {
  const k0 = 0.03;
  const me = 0.12;
  it('is 0 at center and soft near center (≈ k0·x/(1−x))', () => {
    expect(governorRestoringForce(0, k0, me)).toBe(0);
    expect(governorRestoringForce(0.1, k0, me)).toBeCloseTo(k0 * (0.1 / 0.9), 4);
  });
  it('is monotonic non-decreasing and strictly rising in the soft region (no flat spot below cap)', () => {
    let prev = -1;
    for (let x = 0; x <= 0.99; x += 0.03) {
      const f = governorRestoringForce(x, k0, me);
      expect(f).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = f;
    }
    expect(governorRestoringForce(0.5, k0, me)).toBeGreaterThan(
      governorRestoringForce(0.3, k0, me)
    );
  });
  it('reaches maxEffect near the bound and is symmetric', () => {
    expect(governorRestoringForce(0.999, k0, me)).toBeCloseTo(me, 6);
    expect(governorRestoringForce(-0.4, k0, me)).toBeCloseTo(
      -governorRestoringForce(0.4, k0, me),
      9
    );
  });
});

describe('governorActionToParams — bound + shuffle up, k0 fixed, floor', () => {
  it('Action raises the length bound AND shuffle amplitude', () => {
    const lo = governorActionToParams(0, CFG);
    const hi = governorActionToParams(1, CFG);
    expect(lo.lengthBound).toBeCloseTo(2.0, 6);
    expect(hi.lengthBound).toBeCloseTo(3.2, 6);
    expect(hi.lengthBound).toBeGreaterThan(lo.lengthBound);
    expect(hi.A).toBeGreaterThan(lo.A);
  });
  it('min-floor cannot go below the safe minimum', () => {
    const floored = governorActionToParams(0, {
      ...CFG,
      lengthBoundMin: 1.0,
      lengthBoundFloor: 2.0,
    });
    expect(floored.lengthBound).toBeCloseTo(2.0, 6); // 1.0 requested, clamped up to the floor
  });
});

describe('applyGovernor — structural OUTCOME-off (a)', () => {
  it('governorMult is EXACTLY 1.0 in OUTCOME/FINAL for every corridorStart', () => {
    for (const corr of [0.5, 0.55, 0.7, 0.9]) {
      const racers = mkRacers([0.5, 0.3, 0.7]);
      racers.forEach((r) => (r.governorMult = 0.8));
      applyGovernor(racers, 1.0, 'OUTCOME', ctx({ progress: corr, corrStartFrac: corr }), CFG);
      racers.forEach((r) => expect(r.governorMult).toBe(1.0));
      applyGovernor(racers, 1.0, 'FINAL', ctx({ progress: 1.0, corrStartFrac: corr }), CFG);
      racers.forEach((r) => expect(r.governorMult).toBe(1.0));
    }
  });
  it('disabled → all governorMult pinned to 1.0', () => {
    const racers = mkRacers([0.6, 0.4]);
    racers.forEach((r) => (r.governorMult = 0.9));
    applyGovernor(racers, 1.0, 'PULK', ctx(), { ...CFG, enabled: false });
    racers.forEach((r) => expect(r.governorMult).toBe(1.0));
  });
});

describe('applyGovernor — two-sided symmetry + length→t bound conversion (b, d)', () => {
  it('brakes the leader (<1), lifts the straggler (>1), symmetric about 1.0', () => {
    const noShuffle = { ...CFG, aMin: 0, aMax: 0 };
    const racers = mkRacers([0.6, 0.4]); // median 0.5 → gaps ±0.1 (well past bound → full force)
    for (let i = 0; i < 40; i++) applyGovernor(racers, 1.0, 'PULK', ctx(), noShuffle);
    expect(racers[0].governorMult).toBeLessThan(1.0);
    expect(racers[1].governorMult).toBeGreaterThan(1.0);
    expect(racers[0].governorMult + racers[1].governorMult).toBeCloseTo(2.0, 6);
  });
  it('the bound is measured in lengths via oneLenT (racer beyond bound → full brake)', () => {
    // drama 0 → bound 2.0 len; oneLenT 0.01 → gapBound 0.02 t. Leader 0.05 above median = 5 len ≫ bound.
    const noShuffle = { ...CFG, drama: 0, aMin: 0, aMax: 0 };
    const racers = mkRacers([0.55, 0.5, 0.45]); // median 0.5, leader gap +0.05
    for (let i = 0; i < 40; i++)
      applyGovernor(racers, 1.0, 'PULK', ctx({ oneLenT: 0.01 }), noShuffle);
    expect(racers[0].governorMult).toBeCloseTo(1 - CFG.maxEffect, 3); // clamped to full brake
  });
});

describe('governorShufflePhase — zero-mean, deterministic, rank-decoupled (c)', () => {
  it('ensemble of sin(phase) is ~zero-mean over many racers', () => {
    let sum = 0;
    const N = 500;
    for (let i = 0; i < N; i++) sum += Math.sin(governorShufflePhase(i, 1));
    expect(Math.abs(sum / N)).toBeLessThan(0.15);
  });
  it('is deterministic and varies by index/seed', () => {
    expect(governorShufflePhase(5, 1)).toBe(governorShufflePhase(5, 1));
    expect(governorShufflePhase(5, 1)).not.toBe(governorShufflePhase(6, 1));
    expect(governorShufflePhase(5, 1)).not.toBe(governorShufflePhase(5, 2));
  });
});

describe('governorPhaseWeight — exact fade to 1.0, incl. near-zero span (d)', () => {
  it('is 1.0 before the fade window and EXACTLY 0 at corrStart', () => {
    expect(governorPhaseWeight(0.3, 0.5, 0.55)).toBe(1.0);
    expect(governorPhaseWeight(0.55, 0.5, 0.55)).toBe(0);
    expect(governorPhaseWeight(0.9, 0.5, 0.55)).toBe(0);
  });
  it('near-zero TRANSITION span: fade widens backward, reaches 0 at corrStart, no jump', () => {
    expect(governorPhaseWeight(0.5, 0.5, 0.5)).toBe(0);
    const wMid = governorPhaseWeight(0.47, 0.5, 0.5);
    expect(wMid).toBeGreaterThan(0);
    expect(wMid).toBeLessThan(1);
    expect(governorPhaseWeight(0.44, 0.5, 0.5)).toBe(1.0);
  });
});

describe('applyGovernor — slew-limited smoothness (e)', () => {
  it('per-step change never exceeds maxStepPerFrame', () => {
    const racers = mkRacers([0.9, 0.5, 0.1]);
    let prev = racers.map((r) => r.governorMult);
    for (let i = 0; i < 60; i++) {
      applyGovernor(racers, 1.0, 'PULK', ctx({ progress: 0.1 + i * 0.004 }), CFG);
      racers.forEach((r, j) => {
        expect(Math.abs(r.governorMult - prev[j])).toBeLessThanOrEqual(CFG.maxStepPerFrame + 1e-9);
      });
      prev = racers.map((r) => r.governorMult);
    }
  });
});

describe('applyGovernor — determinism / parity (f)', () => {
  it('two identical seeded sequences produce byte-identical governorMult', () => {
    const run = () => {
      const racers = mkRacers([0.8, 0.6, 0.4, 0.2]);
      const out = [];
      for (let i = 0; i < 25; i++) {
        applyGovernor(racers, 1.0, 'PULK', ctx({ progress: 0.05 + i * 0.01, seed: 42 }), CFG);
        out.push(racers.map((r) => r.governorMult));
      }
      return out;
    };
    expect(run()).toEqual(run());
  });
});
