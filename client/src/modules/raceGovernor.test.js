// ============================================================
// File:        raceGovernor.test.js
// Path:        client/src/modules/raceGovernor.test.js
// Project:     RaceArena
// Description: Unit tests for the Pre-OUTCOME Field Governor — Stage C dead-zoned
//              TAIL-LIFT. Covers: the arc-distance helper (closed wrap / open raw),
//              EXACTLY-1.0 inside the dead zone (middle free), ONE-SIDED edge (a racer past
//              the bound BEHIND the median is lifted; a leader ahead of the median is NEVER
//              braked, even escaping in a group — the ahead-median brake was retired),
//              TRUE-racer-length bound measured via arc-distance (LAP-COUNT + finishT
//              independent), Action→(lengths,A) map, barrier curve, structural OUTCOME-off,
//              exact fade, slew, determinism.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  arcT,
  applyGovernor,
  governorActionToParams,
  governorRestoringForce,
  governorPhaseWeight,
} from './raceGovernor.js';

const CFG = {
  enabled: true,
  drama: 0.5,
  k0: 0.03,
  lenMin: 2.0,
  lenMax: 4.0,
  lenFloor: 0.0, // 0 in tests so the length bound is exercised directly (not floored)
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
// Default context: OPEN track with lenScale = pathLengthPx / meanBodyLen = 1, so an arc gap in
// t maps 1:1 to racer-lengths (the bound values below read directly in the same 0..1 t-scale).
const ctx = (over = {}) => ({
  progress: 0.3,
  pulkEndFrac: 0.5,
  corrStartFrac: 0.55,
  seed: 1,
  pathLengthPx: 1,
  meanBodyLen: 1,
  isOpen: true,
  ...over,
});
const runN = (racers, cfg, n, over) => {
  for (let i = 0; i < n; i++) applyGovernor(racers, 1.0, 'PULK', ctx(over), cfg);
};

describe('arcT — track-arc distance', () => {
  it('CLOSED: within-lap min-arc with wrap (0.9↔0.1 = 0.2, not 0.8); different laps collapse', () => {
    expect(arcT(0.9, 0.1, false)).toBeCloseTo(0.2, 9);
    expect(arcT(0.1, 0.9, false)).toBeCloseTo(0.2, 9); // symmetric
    expect(arcT(0.6, 0.5, false)).toBeCloseTo(0.1, 9);
    // Lap-count independence: +3 laps on either operand is identical to lap 0.
    expect(arcT(3.6, 3.5, false)).toBeCloseTo(arcT(0.6, 0.5, false), 9);
    expect(arcT(3.6, 0.5, false)).toBeCloseTo(arcT(0.6, 0.5, false), 9);
  });
  it('OPEN: raw |a−b| (no wrap): 0.9↔0.1 = 0.8', () => {
    expect(arcT(0.9, 0.1, true)).toBeCloseTo(0.8, 9);
    expect(arcT(0.1, 0.9, true)).toBeCloseTo(0.8, 9);
  });
});

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

describe('governorActionToParams — length bound + shuffle up with Action', () => {
  it('Action raises the racer-length bound AND shuffle amplitude', () => {
    const lo = governorActionToParams(0, CFG);
    const hi = governorActionToParams(1, CFG);
    expect(lo.lengths).toBeCloseTo(2.0, 6);
    expect(hi.lengths).toBeCloseTo(4.0, 6);
    expect(hi.A).toBeGreaterThan(lo.A);
  });
  it('length bound is floored by lenFloor', () => {
    const floored = governorActionToParams(0, { ...CFG, lenMin: 0.1, lenFloor: 1.5 });
    expect(floored.lengths).toBeCloseTo(1.5, 6);
  });
});

describe('applyGovernor — dead zone: EXACTLY 1.0 in the middle', () => {
  it('a racer well inside the bound gets governorMult EXACTLY 1.0 (no residual pull)', () => {
    // 10 racers within ±0.018 lengths; bound (drama .5 → 3 lengths) ≫ any gap → all free.
    const racers = mkRacers([0.518, 0.514, 0.51, 0.506, 0.502, 0.498, 0.494, 0.49, 0.486, 0.482]);
    runN(racers, NOSHUF, 20);
    racers.forEach((r) => expect(r.governorMult).toBe(1.0));
  });
});

describe('applyGovernor — one-sided edge: lift behind, never brake ahead', () => {
  it('(b) a lone leader far past the bound is NOT braked; a lone tail is lifted; middle free', () => {
    const cfg = { ...NOSHUF, lenMin: 0.2, lenMax: 0.2 }; // bound 0.2 lengths
    const racers = mkRacers([0.9, 0.5, 0.1]); // gaps ±0.4 lengths ≫ bound → past the edge
    runN(racers, cfg, 40);
    expect(racers[0].governorMult).toBe(1.0); // leader ahead of median → NEVER braked (Stage C)
    expect(racers[2].governorMult).toBeGreaterThan(1.0); // tail lifted
    expect(racers[1].governorMult).toBe(1.0); // median racer inside dead zone → untouched
  });

  it('(c) group escape: leader AND 2nd both far beyond median+bound are BOTH left free (no brake)', () => {
    const cfg = { ...NOSHUF, lenMin: 0.2, lenMax: 0.2 };
    const racers = mkRacers([0.9, 0.88, 0.2, 0.18, 0.16]); // two escape together, three trail near median
    runN(racers, cfg, 40);
    expect(racers[0].governorMult).toBe(1.0); // leader far ahead of median → not braked (Stage C)
    expect(racers[1].governorMult).toBe(1.0); // 2nd also ahead of median → not braked
  });

  it('(d) a far-back tail racer is lifted', () => {
    const cfg = { ...NOSHUF, lenMin: 0.2, lenMax: 0.2 };
    const racers = mkRacers([0.55, 0.5, 0.45, 0.1]); // last racer far behind median
    runN(racers, cfg, 40);
    expect(racers[3].governorMult).toBeGreaterThan(1.0);
  });
});

describe('applyGovernor — LAP-COUNT + finishT independent (arc-length bound)', () => {
  it('same within-lap layout gives the same lift regardless of lap number OR finishT', () => {
    const cfg = { ...NOSHUF, lenMin: 0.2, lenMax: 0.2 };
    const layout = [0.8, 0.5, 0.2]; // within-lap positions; tail arc 0.3 behind median > 0.2 bound → bites
    // Closed track. lap0 vs +3 laps; finishT differs (irrelevant now — bound uses pathLengthPx).
    const lap0 = mkRacers(layout);
    const lap3 = mkRacers(layout.map((t) => t + 3));
    for (let i = 0; i < 40; i++) {
      applyGovernor(lap0, 1.0, 'PULK', ctx({ isOpen: false }), cfg);
      applyGovernor(lap3, 9.0, 'PULK', ctx({ isOpen: false }), cfg); // finishT 9 (≈9 laps)
    }
    for (let j = 0; j < 3; j++) {
      expect(lap0[j].governorMult).toBeCloseTo(lap3[j].governorMult, 9);
    }
    // And the tail IS actually lifted (proves the bound bites on the true within-lap arc,
    // not a finishT-shrunk gap that would read as inside the dead zone).
    expect(lap0[2].governorMult).toBeGreaterThan(1.0);
  });

  it('closed-track bound is scale-independent: same body-length layout on a 2× track ⇒ same lift', () => {
    const cfg = { ...NOSHUF, lenMin: 1.0, lenMax: 1.0 }; // 1 racer-length bound
    // Small track: pathLengthPx 100, body 10 → lenScale 10; a 0.1-t arc = 1 length.
    const small = mkRacers([0.65, 0.5, 0.35]);
    // Big track: pathLengthPx 200, body 20 → lenScale 10 too; identical racer-length gaps.
    const big = mkRacers([0.65, 0.5, 0.35]);
    for (let i = 0; i < 40; i++) {
      applyGovernor(
        small,
        1.0,
        'PULK',
        ctx({ isOpen: false, pathLengthPx: 100, meanBodyLen: 10 }),
        cfg
      );
      applyGovernor(
        big,
        1.0,
        'PULK',
        ctx({ isOpen: false, pathLengthPx: 200, meanBodyLen: 20 }),
        cfg
      );
    }
    for (let j = 0; j < 3; j++) {
      expect(small[j].governorMult).toBeCloseTo(big[j].governorMult, 9);
    }
  });
});

describe('applyGovernor — structural OUTCOME-off', () => {
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

describe('applyGovernor — slew smoothness + determinism', () => {
  it('per-step change never exceeds maxStepPerFrame', () => {
    const cfg = { ...CFG, lenMin: 0.2, lenMax: 0.2 };
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
