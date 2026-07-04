// ============================================================
// File:        raceGovernor.test.js
// Path:        client/src/modules/raceGovernor.test.js
// Project:     RaceArena
// Description: Unit tests for the Pre-OUTCOME Field Governor (Stage B core).
//              Covers: structural OUTCOME-off, cohesion symmetry, zero-mean/rank-
//              decoupled shuffle, exact fade-to-1.0 (incl. near-zero TRANSITION span),
//              slew-limited smoothness, and determinism.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  applyGovernor,
  governorShufflePhase,
  governorDramaToKA,
  governorPhaseWeight,
} from './raceGovernor.js';

const CFG = {
  enabled: true,
  drama: 0.5,
  kMin: 0.04,
  kMax: 0.1,
  aMin: 0.005,
  aMax: 0.02,
  frequency: 3,
  gapRef: 0.03,
  maxEffect: 0.12,
  maxStepPerFrame: 0.01,
};

const mkRacers = (ts) => ts.map((t, i) => ({ index: i, t, finished: false, governorMult: 1.0 }));
const ctx = (over = {}) => ({
  progress: 0.3,
  pulkEndFrac: 0.5,
  corrStartFrac: 0.55,
  seed: 1,
  ...over,
});

describe('applyGovernor — structural OUTCOME-off (a)', () => {
  it('governorMult is EXACTLY 1.0 in OUTCOME/FINAL for every corridorStart', () => {
    for (const corr of [0.5, 0.55, 0.7, 0.9]) {
      // Pre-seed non-1.0 values to prove OUTCOME hard-sets exactly 1.0 (not rate-limited).
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

describe('applyGovernor — cohesion symmetry (b)', () => {
  it('brakes the leader (gap>0 → <1) and lifts the straggler (gap<0 → >1)', () => {
    const noShuffle = { ...CFG, aMin: 0, aMax: 0 }; // isolate cohesion
    const racers = mkRacers([0.6, 0.4]); // median 0.5 → leader gap +0.1, straggler −0.1
    for (let i = 0; i < 40; i++) {
      applyGovernor(racers, 1.0, 'PULK', ctx(), noShuffle);
    }
    expect(racers[0].governorMult).toBeLessThan(1.0); // leader braked
    expect(racers[1].governorMult).toBeGreaterThan(1.0); // straggler lifted
    // Symmetric about 1.0 (same gap magnitude, no shuffle).
    expect(racers[0].governorMult + racers[1].governorMult).toBeCloseTo(2.0, 6);
  });
});

describe('governorShufflePhase — zero-mean, deterministic, rank-decoupled (c)', () => {
  it('ensemble of sin(phase) is ~zero-mean over many racers', () => {
    let sum = 0;
    const N = 500;
    for (let i = 0; i < N; i++) sum += Math.sin(governorShufflePhase(i, 1));
    expect(Math.abs(sum / N)).toBeLessThan(0.15);
  });

  it('is deterministic (same index+seed → same phase) and varies by index/seed', () => {
    expect(governorShufflePhase(5, 1)).toBe(governorShufflePhase(5, 1));
    expect(governorShufflePhase(5, 1)).not.toBe(governorShufflePhase(6, 1));
    expect(governorShufflePhase(5, 1)).not.toBe(governorShufflePhase(5, 2));
  });

  it('phase is a pure function of (index, seed) — cannot correlate with target rank', () => {
    // Structural: the function takes no rank argument. A random rank permutation is therefore
    // uncorrelated with the phase by construction — verify the correlation is small.
    const N = 60;
    const phases = Array.from({ length: N }, (_, i) => governorShufflePhase(i, 7));
    // Correlate the phase against index order; the hash makes it ~uncorrelated. Since the
    // function takes no rank, ANY rank↔index mapping inherits this same near-zero correlation.
    const ranks = Array.from({ length: N }, (_, i) => i);
    const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
    const mp = mean(phases);
    const mr = mean(ranks);
    let cov = 0;
    let vp = 0;
    let vr = 0;
    for (let i = 0; i < N; i++) {
      cov += (phases[i] - mp) * (ranks[i] - mr);
      vp += (phases[i] - mp) ** 2;
      vr += (ranks[i] - mr) ** 2;
    }
    const corr = cov / (Math.sqrt(vp * vr) || 1);
    expect(Math.abs(corr)).toBeLessThan(0.3);
  });
});

describe('governorPhaseWeight — exact fade to 1.0, incl. near-zero span (d)', () => {
  it('is 1.0 before the fade window and EXACTLY 0 at corrStart', () => {
    expect(governorPhaseWeight(0.3, 0.5, 0.55)).toBe(1.0);
    expect(governorPhaseWeight(0.55, 0.5, 0.55)).toBe(0);
    expect(governorPhaseWeight(0.9, 0.5, 0.55)).toBe(0);
  });

  it('near-zero TRANSITION span: fade widens backward, reaches 0 at corrStart, no jump', () => {
    // pulkEnd == corrStart == 0.5 → real span 0, widened to MIN_FADE_SPAN (0.05) into PULK.
    expect(governorPhaseWeight(0.5, 0.5, 0.5)).toBe(0); // exactly 0 at corrStart
    const wMid = governorPhaseWeight(0.47, 0.5, 0.5); // inside the widened fade
    expect(wMid).toBeGreaterThan(0);
    expect(wMid).toBeLessThan(1); // eased (not a 1→0 jump)
    expect(governorPhaseWeight(0.44, 0.5, 0.5)).toBe(1.0); // before the widened window
  });
});

describe('applyGovernor — slew-limited smoothness (e)', () => {
  it('per-step change never exceeds maxStepPerFrame (no sudden switch)', () => {
    const racers = mkRacers([0.9, 0.5, 0.1]); // a leader far ahead → big cohesion target
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

describe('governorDramaToKA — endpoints', () => {
  it('more drama → less cohesion (k down) and more shuffle (A up)', () => {
    const lo = governorDramaToKA(0, CFG);
    const hi = governorDramaToKA(1, CFG);
    expect(lo.k).toBeCloseTo(CFG.kMax, 6);
    expect(hi.k).toBeCloseTo(CFG.kMin, 6);
    expect(lo.A).toBeCloseTo(CFG.aMin, 6);
    expect(hi.A).toBeCloseTo(CFG.aMax, 6);
    expect(hi.A).toBeLessThan(hi.k); // max-drama: A < k → equilibrium spread stays bounded
    expect(lo.A).toBeGreaterThan(0); // min-drama: shuffle floor > 0 → no dead train
  });
});
