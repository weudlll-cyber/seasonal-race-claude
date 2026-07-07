// ============================================================
// File:        raceGovernor.test.js
// Path:        client/src/modules/raceGovernor.test.js
// Project:     RaceArena
// Description: Unit tests for the Pre-OUTCOME contest-injector "director". Covers: the
//              arc-distance helper (closed wrap / open raw), the phase-weight fade + the
//              director's rank-blind seeded featured-cast rotation, the one-sided anchor pull
//              (legacy fallback), the TWO-SIDED contest (leader brake + challenger boost —
//              the shipped shape), the shared realism envelope (±maxEffect clamp + per-frame
//              slew), structural OUTCOME-off, and determinism.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  arcT,
  applyGovernor,
  governorPhaseWeight,
  governorFadeStart,
  directorFeaturedSet,
  directorStreamKey,
} from './raceGovernor.js';

// Director cfg — no shuffle/tail-lift fields (retired). lenScale = 1 in ctx below.
const DIRCFG = {
  maxEffect: 0.12,
  maxStepPerFrame: 0.02,
  directorEnabled: true,
  directorCastSize: 2,
  directorDwell: 0.08,
  directorAnchorOffset: 2.0,
  directorPullStrength: 0.06,
  directorSettling: 0.05,
};

const mkRacers = (ts) => ts.map((t, i) => ({ index: i, t, finished: false, governorMult: 1.0 }));
// Default context: OPEN track with lenScale = pathLengthPx / meanBodyLen = 1, so an arc gap in
// t maps 1:1 to racer-lengths.
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

describe('governorPhaseWeight — exact fade', () => {
  it('1.0 before the window, EXACTLY 0 at corrStart, eased near-zero span', () => {
    expect(governorPhaseWeight(0.3, 0.5, 0.55)).toBe(1.0);
    expect(governorPhaseWeight(0.55, 0.5, 0.55)).toBe(0);
    expect(governorPhaseWeight(0.5, 0.5, 0.5)).toBe(0);
    const wMid = governorPhaseWeight(0.47, 0.5, 0.5);
    expect(wMid).toBeGreaterThan(0);
    expect(wMid).toBeLessThan(1);
  });
});

describe('directorStreamKey — rank-blind seeded key', () => {
  it('deterministic, in [0,1), and produces a non-trivial order', () => {
    for (let i = 0; i < 10; i++) {
      const k = directorStreamKey(i, 7);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThan(1);
      expect(directorStreamKey(i, 7)).toBe(k); // deterministic
    }
    expect(directorStreamKey(0, 7)).not.toBe(directorStreamKey(1, 7));
  });
});

describe('directorFeaturedSet — rank-blind rotating cast', () => {
  const cutoff = governorFadeStart(0.5, 0.55) - DIRCFG.directorSettling; // matches applyGovernor
  it('features exactly castSize racers before the cutoff, null at/after (settling)', () => {
    const racers = mkRacers([0.9, 0.7, 0.5, 0.3, 0.1, -0.1]);
    const set = directorFeaturedSet(racers, 3, 0.2, 2, 0.08, cutoff);
    expect(set.size).toBe(2);
    // At/after the cutoff no cast is featured (field relaxes before the fade).
    expect(directorFeaturedSet(racers, 3, cutoff, 2, 0.08, cutoff)).toBeNull();
    expect(directorFeaturedSet(racers, 3, cutoff + 0.01, 2, 0.08, cutoff)).toBeNull();
  });
  it('membership depends ONLY on index+seed, NOT on current position (rank-blind)', () => {
    // Same indices, different t orderings → identical featured set (position cannot influence it).
    const a = mkRacers([0.9, 0.7, 0.5, 0.3, 0.1]);
    const b = mkRacers([0.1, 0.3, 0.5, 0.7, 0.9]); // same indices 0..4, reversed positions
    const sa = directorFeaturedSet(a, 11, 0.15, 2, 0.08, cutoff);
    const sb = directorFeaturedSet(b, 11, 0.15, 2, 0.08, cutoff);
    expect([...sa].sort()).toEqual([...sb].sort());
  });
  it('over a full pass the spotlight covers every racer (round-robin)', () => {
    const racers = mkRacers([0.9, 0.7, 0.5, 0.3, 0.1, -0.1]); // n=6, cast=2 → 3 slots per pass
    const union = new Set();
    for (let slot = 0; slot < 3; slot++) {
      const s = directorFeaturedSet(racers, 5, slot * 0.08 + 0.001, 2, 0.08, 1.0);
      for (const idx of s) union.add(idx);
    }
    expect(union.size).toBe(6);
  });
});

describe('applyGovernor — director pull (one-sided anchor, legacy fallback)', () => {
  it('featured racers are pulled toward the front anchor; non-featured stay EXACTLY 1.0', () => {
    const racers = mkRacers([0.7, 0.5, 0.3, 0.1]);
    const cutoff = governorFadeStart(0.5, 0.55) - DIRCFG.directorSettling;
    const feat = directorFeaturedSet(
      racers,
      1,
      0.3,
      DIRCFG.directorCastSize,
      DIRCFG.directorDwell,
      cutoff
    );
    runN(racers, DIRCFG, 20); // ctx seed defaults to 1 → same featured set
    racers.forEach((r) => {
      if (feat.has(r.index))
        expect(r.governorMult).toBeGreaterThan(1.0); // anchor +2len → forward pull
      else expect(r.governorMult).toBe(1.0); // non-featured untouched by this layer
    });
  });

  it('mean-reverting: featured ahead of the anchor is pulled back, behind is pulled forward', () => {
    // anchorOffset 0 → anchor = median; cast = all → every racer featured.
    const cfg = { ...DIRCFG, directorAnchorOffset: 0, directorCastSize: 4 };
    const racers = mkRacers([0.7, 0.5, 0.3]); // median 0.5
    runN(racers, cfg, 20);
    expect(racers[0].governorMult).toBeLessThan(1.0); // ahead of anchor → braked back toward it
    expect(racers[2].governorMult).toBeGreaterThan(1.0); // behind anchor → pulled forward
    expect(racers[1].governorMult).toBeCloseTo(1.0, 9); // at the anchor → zero
  });

  it('never exceeds ±maxEffect and is pinned EXACTLY 1.0 in OUTCOME', () => {
    const racers = mkRacers([0.7, 0.5, 0.3, 0.1]);
    for (let i = 0; i < 60; i++) applyGovernor(racers, 1.0, 'PULK', ctx({ progress: 0.1 }), DIRCFG);
    racers.forEach((r) => {
      expect(r.governorMult).toBeLessThanOrEqual(1 + DIRCFG.maxEffect + 1e-9);
      expect(r.governorMult).toBeGreaterThanOrEqual(1 - DIRCFG.maxEffect - 1e-9);
    });
    applyGovernor(racers, 1.0, 'OUTCOME', ctx({ progress: 0.55, corrStartFrac: 0.55 }), DIRCFG);
    racers.forEach((r) => expect(r.governorMult).toBe(1.0));
  });

  it('director off → EXACTLY 1.0 (adding the layer while off changes nothing)', () => {
    const racers = mkRacers([0.7, 0.5, 0.3]);
    racers.forEach((r) => (r.governorMult = 0.8));
    applyGovernor(racers, 1.0, 'PULK', ctx(), { ...DIRCFG, directorEnabled: false });
    racers.forEach((r) => expect(r.governorMult).toBe(1.0));
  });
});

// ── TWO-SIDED contest (leader brake + challenger boost) — the shipped shape ───
describe('applyGovernor — two-sided contest', () => {
  // castSize ≥ N → the whole field is featured (deterministic: every non-leader is a challenger).
  const TWO = {
    ...DIRCFG,
    directorCastSize: 10,
    directorSettling: 0,
    directorLeaderBrake: 0.15,
    directorChallengerBoost: 0.1,
    directorPullStrength: 0.06,
  };
  const runTwo = (racers, cfg, n = 40) => {
    for (let i = 0; i < n; i++) applyGovernor(racers, 1.0, 'PULK', ctx({ progress: 0.1 }), cfg);
  };

  it('brakes the instantaneous leader and boosts the challengers behind it', () => {
    const racers = mkRacers([0.5, 0.3, 0.1]); // idx0 leader, idx1/idx2 challengers
    runTwo(racers, TWO);
    expect(racers[0].governorMult).toBeLessThan(1.0); // leader braked
    expect(racers[1].governorMult).toBeGreaterThan(1.0); // challenger boosted toward leader
    expect(racers[2].governorMult).toBeGreaterThan(1.0);
  });

  it('brake side reaches below the symmetric −maxEffect floor (asymmetric, down to −leaderBrake)', () => {
    const racers = mkRacers([0.5, 0.3, 0.1]);
    runTwo(racers, TWO, 80);
    expect(racers[0].governorMult).toBeLessThan(1 - TWO.maxEffect + 1e-9); // below 0.88
    expect(racers[0].governorMult).toBeGreaterThanOrEqual(1 - TWO.directorLeaderBrake - 1e-9); // ≥ 0.85
  });

  it('challenger boost never exceeds +maxEffect (natural ceiling) and is capped at challengerBoost', () => {
    // Gap 2.9 lengths × pullStrength 0.06 = 0.174 > challengerBoost 0.10 → saturates at the cap.
    const racers = mkRacers([3.0, 0.1, 0.05]);
    runTwo(racers, TWO, 80);
    racers.forEach((r) => expect(r.governorMult).toBeLessThanOrEqual(1 + TWO.maxEffect + 1e-9));
    expect(racers[1].governorMult).toBeCloseTo(1 + TWO.directorChallengerBoost, 2); // capped at +0.10
  });

  it('still fades to EXACTLY 1.0 in OUTCOME', () => {
    const racers = mkRacers([0.5, 0.3, 0.1]);
    racers.forEach((r) => (r.governorMult = 0.9));
    applyGovernor(racers, 1.0, 'OUTCOME', ctx({ progress: 0.55, corrStartFrac: 0.55 }), TWO);
    racers.forEach((r) => expect(r.governorMult).toBe(1.0));
  });

  it('both strengths 0 → byte-identical to omitting them (legacy one-sided anchor pull)', () => {
    const a = mkRacers([0.5, 0.3, 0.1]);
    const b = mkRacers([0.5, 0.3, 0.1]);
    const withZeros = { ...TWO, directorLeaderBrake: 0, directorChallengerBoost: 0 };
    const omitted = { ...TWO };
    delete omitted.directorLeaderBrake;
    delete omitted.directorChallengerBoost;
    runTwo(a, withZeros, 25);
    runTwo(b, omitted, 25);
    a.forEach((r, i) => expect(r.governorMult).toBeCloseTo(b[i].governorMult, 12));
  });
});

describe('applyGovernor — realism envelope: slew + determinism', () => {
  const TWO = {
    ...DIRCFG,
    directorCastSize: 10,
    directorSettling: 0,
    directorLeaderBrake: 0.15,
    directorChallengerBoost: 0.1,
    maxStepPerFrame: 0.02,
  };
  it('per-step change never exceeds maxStepPerFrame', () => {
    const racers = mkRacers([0.95, 0.5, 0.05]);
    let prev = racers.map((r) => r.governorMult);
    for (let i = 0; i < 60; i++) {
      applyGovernor(racers, 1.0, 'PULK', ctx({ progress: 0.1 + i * 0.004 }), TWO);
      racers.forEach((r, j) =>
        expect(Math.abs(r.governorMult - prev[j])).toBeLessThanOrEqual(TWO.maxStepPerFrame + 1e-9)
      );
      prev = racers.map((r) => r.governorMult);
    }
  });
  it('two identical seeded sequences are byte-identical', () => {
    const run = () => {
      const racers = mkRacers([0.9, 0.7, 0.5, 0.3, 0.1]);
      const out = [];
      for (let i = 0; i < 25; i++) {
        applyGovernor(racers, 1.0, 'PULK', ctx({ progress: 0.05 + i * 0.01, seed: 42 }), TWO);
        out.push(racers.map((r) => r.governorMult));
      }
      return out;
    };
    expect(run()).toEqual(run());
  });
});
