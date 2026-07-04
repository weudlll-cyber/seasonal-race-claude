// ============================================================
// File:        raceGovernor.test.js
// Path:        client/src/modules/raceGovernor.test.js
// Project:     RaceArena
// Description: Unit tests for the Pre-OUTCOME Field Governor — Stage 1 dead-zoned
//              edge-limiter. Covers: EXACTLY-1.0 inside the dead zone (middle free),
//              symmetric edge brake/lift past the bound, group-escape closure, tail lift,
//              track+duration-independent spacing bound, Action→(spacings,A) map, the
//              barrier curve, structural OUTCOME-off, exact fade, slew, determinism.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  applyGovernor,
  governorActionToParams,
  governorRestoringForce,
  governorPhaseWeight,
} from './raceGovernor.js';

const CFG = {
  enabled: true,
  drama: 0.5,
  k0: 0.03,
  spacingMin: 2.0,
  spacingMax: 4.0,
  boundFloorFraction: 0.0, // 0 in tests so the spacing bound is exercised directly (not floored)
  rampWidth: 0.5,
  aMin: 0.005,
  aMax: 0.02,
  frequency: 3,
  maxEffect: 0.12,
  maxStepPerFrame: 0.02,
};
// No-shuffle variant to isolate the edge force (dead zone must read EXACTLY 1.0).
const NOSHUF = { ...CFG, aMin: 0, aMax: 0 };

const mkRacers = (ts) => ts.map((t, i) => ({ index: i, t, finished: false, governorMult: 1.0 }));
const ctx = (over = {}) => ({
  progress: 0.3,
  pulkEndFrac: 0.5,
  corrStartFrac: 0.55,
  seed: 1,
  ...over,
});
const runN = (racers, cfg, n, over) => {
  for (let i = 0; i < n; i++) applyGovernor(racers, 1.0, 'PULK', ctx(over), cfg);
};

describe('governorRestoringForce — barrier curve (unchanged)', () => {
  it('0 at center, soft near center, reaches maxEffect near |x|=1, symmetric', () => {
    expect(governorRestoringForce(0, 0.03, 0.12)).toBe(0);
    expect(governorRestoringForce(0.1, 0.03, 0.12)).toBeCloseTo(0.03 * (0.1 / 0.9), 4);
    expect(governorRestoringForce(0.999, 0.03, 0.12)).toBeCloseTo(0.12, 6);
    expect(governorRestoringForce(-0.4, 0.03, 0.12)).toBeCloseTo(
      -governorRestoringForce(0.4, 0.03, 0.12),
      9
    );
  });
});

describe('governorActionToParams — spacings + shuffle up with Action', () => {
  it('Action raises the spacing bound AND shuffle amplitude', () => {
    const lo = governorActionToParams(0, CFG);
    const hi = governorActionToParams(1, CFG);
    expect(lo.spacings).toBeCloseTo(2.0, 6);
    expect(hi.spacings).toBeCloseTo(4.0, 6);
    expect(hi.A).toBeGreaterThan(lo.A);
  });
});

describe('applyGovernor — dead zone (a): EXACTLY 1.0 in the middle', () => {
  it('a racer well inside the bound gets governorMult EXACTLY 1.0 (no residual pull)', () => {
    // 10 racers within ±0.018; bound (drama .5 → 3 spacings / 10) = 0.3 ≫ any gap → all free.
    const racers = mkRacers([0.518, 0.514, 0.51, 0.506, 0.502, 0.498, 0.494, 0.49, 0.486, 0.482]);
    runN(racers, NOSHUF, 20);
    racers.forEach((r) => expect(r.governorMult).toBe(1.0));
  });
});

describe('applyGovernor — edge engages past the bound (b, c, d)', () => {
  it('(b) a lone leader far past the bound is braked; a lone tail is lifted; middle free', () => {
    const cfg = { ...NOSHUF, spacingMin: 1, spacingMax: 1 }; // 1 spacing; 3 racers → bound ≈ 0.333
    const racers = mkRacers([0.9, 0.5, 0.1]); // gaps ±0.4 ≫ bound → past the edge
    runN(racers, cfg, 40);
    expect(racers[0].governorMult).toBeLessThan(1.0); // leader braked
    expect(racers[2].governorMult).toBeGreaterThan(1.0); // tail lifted
    expect(racers[1].governorMult).toBe(1.0); // median racer inside dead zone → untouched
  });

  it('(c) group escape: leader AND 2nd both beyond median+bound are BOTH braked', () => {
    const cfg = { ...NOSHUF, spacingMin: 1, spacingMax: 1 };
    const racers = mkRacers([0.9, 0.88, 0.2, 0.18, 0.16]); // two escape together, three trail
    runN(racers, cfg, 40);
    expect(racers[0].governorMult).toBeLessThan(1.0); // leader braked
    expect(racers[1].governorMult).toBeLessThan(1.0); // 2nd ALSO braked (median-referenced)
  });

  it('(d) a far-back tail racer is lifted', () => {
    const cfg = { ...NOSHUF, spacingMin: 1, spacingMax: 1 };
    const racers = mkRacers([0.55, 0.5, 0.45, 0.1]); // last racer far behind median
    runN(racers, cfg, 40);
    expect(racers[3].governorMult).toBeGreaterThan(1.0);
  });
});

describe('applyGovernor — track+duration-independent bound (e)', () => {
  it('same spacing layout gives the same brake on short vs long / few- vs many-lap races', () => {
    const cfg = { ...NOSHUF, spacingMin: 1, spacingMax: 1 };
    const layout = [0.6, 0.5, 0.4]; // relative layout; gaps scale with finishT
    const shortR = mkRacers(layout.map((t) => t * 0.2)); // finishT 0.2 (few laps)
    const longR = mkRacers(layout.map((t) => t * 5.0)); // finishT 5.0 (many laps)
    for (let i = 0; i < 40; i++) {
      applyGovernor(shortR, 0.2, 'PULK', ctx(), cfg);
      applyGovernor(longR, 5.0, 'PULK', ctx(), cfg);
    }
    for (let j = 0; j < 3; j++) {
      expect(shortR[j].governorMult).toBeCloseTo(longR[j].governorMult, 9);
    }
  });
});

describe('applyGovernor — structural OUTCOME-off (f)', () => {
  it('EXACTLY 1.0 in OUTCOME for every corridorStart; disabled → 1.0', () => {
    for (const corr of [0.5, 0.55, 0.7, 0.9]) {
      const racers = mkRacers([0.9, 0.5, 0.1]);
      racers.forEach((r) => (r.governorMult = 0.7));
      applyGovernor(racers, 1.0, 'OUTCOME', ctx({ progress: corr, corrStartFrac: corr }), CFG);
      racers.forEach((r) => expect(r.governorMult).toBe(1.0));
    }
    const off = mkRacers([0.9, 0.1]);
    off.forEach((r) => (r.governorMult = 0.9));
    applyGovernor(off, 1.0, 'PULK', ctx(), { ...CFG, enabled: false });
    off.forEach((r) => expect(r.governorMult).toBe(1.0));
  });
});

describe('governorPhaseWeight — exact fade (unchanged)', () => {
  it('1.0 before the window, EXACTLY 0 at corrStart, eased near-zero span', () => {
    expect(governorPhaseWeight(0.3, 0.5, 0.55)).toBe(1.0);
    expect(governorPhaseWeight(0.55, 0.5, 0.55)).toBe(0);
    expect(governorPhaseWeight(0.5, 0.5, 0.5)).toBe(0);
    const wMid = governorPhaseWeight(0.47, 0.5, 0.5);
    expect(wMid).toBeGreaterThan(0);
    expect(wMid).toBeLessThan(1);
  });
});

describe('applyGovernor — slew smoothness (g) + determinism (h)', () => {
  it('per-step change never exceeds maxStepPerFrame', () => {
    const cfg = { ...CFG, spacingMin: 1, spacingMax: 1 };
    const racers = mkRacers([0.95, 0.5, 0.05]);
    let prev = racers.map((r) => r.governorMult);
    for (let i = 0; i < 60; i++) {
      applyGovernor(racers, 1.0, 'PULK', ctx({ progress: 0.1 + i * 0.004 }), cfg);
      racers.forEach((r, j) =>
        expect(Math.abs(r.governorMult - prev[j])).toBeLessThanOrEqual(cfg.maxStepPerFrame + 1e-9)
      );
      prev = racers.map((r) => r.governorMult);
    }
  });
  it('two identical seeded sequences are byte-identical', () => {
    const run = () => {
      const racers = mkRacers([0.9, 0.7, 0.5, 0.3, 0.1]);
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
