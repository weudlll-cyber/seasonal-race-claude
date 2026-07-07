// ============================================================
// File:        raceGovernor.test.js
// Path:        client/src/modules/raceGovernor.test.js
// Project:     RaceArena
// Description: Unit tests for the rebuilt pre-OUTCOME contest-injector "director". Covers: the
//              arc-distance helper, the phase-weight fade, the seeded director key, and applyGovernor
//              — structural OUTCOME/director-off, the leader brake, the two-way front contest
//              (catch-up boosts AND active fall-backs), the ±maxEffect + ceiling-cap envelope, the
//              per-frame slew, the exact fade to 1.0 in OUTCOME, and determinism.
// ============================================================

import { describe, it, expect } from 'vitest';
import { arcT, applyGovernor, governorPhaseWeight, directorStreamKey } from './raceGovernor.js';

// Fresh per-race director state (the shape applyGovernor lazily fills).
const mkDir = () => ({
  boostSlots: [],
  fallSlots: [],
  boosted: new Set(),
  protectedUntil: new Map(),
  poolFallback: 0,
  ev: 0,
  prevLeader: -1,
  leaderSinceMs: 0,
  lingerTarget: -1,
  lingerUntilMs: 0,
});

// Director cfg. lenScale = 1 in ctx (pathLengthPx / meanBodyLen), so a t-gap maps 1:1 to lengths.
const BASE = {
  maxEffect: 0.12,
  maxStepPerFrame: 0.02,
  directorEnabled: true,
  directorLeaderBrake: 0.15,
  directorChallengerBoost: 0.1,
  directorPullStrength: 0.06,
  directorFrontPool: 12,
  directorBoostOncePerRace: false,
  directorLingerBrake: 0, // linger off → the leader is braked every frame
  directorCeilingCap: 0,
  directorSettling: 0,
  directorMaxParallelBoosts: 3,
  directorBoostDurationMin: 500,
  directorBoostDurationMax: 2000,
  directorCatchThreshold: 1.0,
  directorFallbackEnabled: false,
  directorFallbackFromPool: 5,
  directorFallbackMaxCount: 2,
  directorFallbackUntilPosition: 12,
  directorFallbackProtectMs: 1000,
};

const mkRacers = (ts) =>
  ts.map((t, i) => ({ index: i, t, finished: false, governorMult: 1.0, spreadFactor: 1.0 }));

const ctx = (dir, over = {}) => ({
  progress: 0.3,
  pulkEndFrac: 0.5,
  corrStartFrac: 0.55,
  seed: 1,
  pathLengthPx: 1,
  meanBodyLen: 1,
  isOpen: true,
  currentMs: 0,
  dirState: dir,
  ...over,
});

// Run n frames, advancing the ms clock (currentMs) and progress; returns the dirState used.
function runFrames(racers, cfg, n, { progress = 0.3, phase = 'PULK' } = {}) {
  const dir = mkDir();
  for (let i = 0; i < n; i++) {
    applyGovernor(racers, 1.0, phase, ctx(dir, { currentMs: i * 16, progress }), cfg);
  }
  return dir;
}

describe('arcT — track-arc distance', () => {
  it('CLOSED: within-lap min-arc with wrap; OPEN: raw |a−b|', () => {
    expect(arcT(0.9, 0.1, false)).toBeCloseTo(0.2, 9);
    expect(arcT(0.9, 0.1, true)).toBeCloseTo(0.8, 9);
    expect(arcT(3.6, 0.5, false)).toBeCloseTo(arcT(0.6, 0.5, false), 9); // lap-count independent
  });
});

describe('governorPhaseWeight — exact fade', () => {
  it('1.0 before the window, EXACTLY 0 at corrStart', () => {
    expect(governorPhaseWeight(0.3, 0.5, 0.55)).toBe(1.0);
    expect(governorPhaseWeight(0.55, 0.5, 0.55)).toBe(0);
    const wMid = governorPhaseWeight(0.47, 0.5, 0.5);
    expect(wMid).toBeGreaterThan(0);
    expect(wMid).toBeLessThan(1);
  });
});

describe('directorStreamKey — rank-blind seeded key', () => {
  it('deterministic and in [0,1)', () => {
    for (let i = 0; i < 10; i++) {
      const k = directorStreamKey(i, 7);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThan(1);
      expect(directorStreamKey(i, 7)).toBe(k);
    }
    expect(directorStreamKey(0, 7)).not.toBe(directorStreamKey(1, 7));
  });
});

describe('applyGovernor — structural off', () => {
  it('OUTCOME phase → EXACTLY 1.0 for every racer', () => {
    const racers = mkRacers([0.5, 0.3, 0.1]);
    racers.forEach((r) => (r.governorMult = 0.7));
    applyGovernor(racers, 1.0, 'OUTCOME', ctx(mkDir(), { progress: 0.6 }), BASE);
    racers.forEach((r) => expect(r.governorMult).toBe(1.0));
  });
  it('director disabled → EXACTLY 1.0', () => {
    const racers = mkRacers([0.5, 0.3, 0.1]);
    racers.forEach((r) => (r.governorMult = 0.8));
    applyGovernor(racers, 1.0, 'PULK', ctx(mkDir()), { ...BASE, directorEnabled: false });
    racers.forEach((r) => expect(r.governorMult).toBe(1.0));
  });
});

describe('applyGovernor — leader brake', () => {
  it('the instantaneous leader (max t) is braked below 1.0 (linger off)', () => {
    const racers = mkRacers([0.5, 0.3, 0.1, -0.1, -0.3]);
    runFrames(racers, BASE, 30);
    // rank 1 = index 0 (highest t). It can only be braked (never boosted).
    expect(racers[0].governorMult).toBeLessThan(1.0);
    expect(racers[0].governorMult).toBeGreaterThanOrEqual(1 - BASE.directorLeaderBrake - 1e-9);
  });
});

describe('applyGovernor — catch-up boost', () => {
  it('at least one trailing challenger is boosted above 1.0', () => {
    const racers = mkRacers([0.9, 0.6, 0.4, 0.2, 0.0, -0.2, -0.4]);
    runFrames(racers, BASE, 40);
    const boosted = racers.filter((r, i) => i !== 0 && r.governorMult > 1.0 + 1e-6);
    expect(boosted.length).toBeGreaterThan(0);
    // boost never exceeds +maxEffect
    racers.forEach((r) => expect(r.governorMult).toBeLessThanOrEqual(1 + BASE.maxEffect + 1e-9));
  });
});

describe('applyGovernor — two directions (catch-up + fall-back)', () => {
  it('with fall-back on, some racer is boosted AND some non-leader is braked', () => {
    const cfg = { ...BASE, directorFallbackEnabled: true, directorFallbackMaxCount: 2 };
    const racers = mkRacers([1.0, 0.8, 0.6, 0.4, 0.2, 0.0, -0.2, -0.4, -0.6, -0.8]);
    runFrames(racers, cfg, 60);
    const maxMult = Math.max(...racers.map((r) => r.governorMult));
    // a non-leader braked below 1.0 (fall-back or linger); the leader alone braking is not enough,
    // so check a non-leader specifically.
    const nonLeaderBraked = racers.some((r, i) => i !== 0 && r.governorMult < 1.0 - 1e-6);
    expect(maxMult).toBeGreaterThan(1.0 + 1e-6); // catch-up present
    expect(nonLeaderBraked).toBe(true); // fall-back present
  });
});

describe('applyGovernor — realism envelope', () => {
  it('fades to EXACTLY 1.0 in OUTCOME', () => {
    const racers = mkRacers([0.5, 0.3, 0.1]);
    racers.forEach((r) => (r.governorMult = 0.9));
    applyGovernor(
      racers,
      1.0,
      'OUTCOME',
      ctx(mkDir(), { progress: 0.55, corrStartFrac: 0.55 }),
      BASE
    );
    racers.forEach((r) => expect(r.governorMult).toBe(1.0));
  });

  it('ceiling-cap keeps a boosted racer within the natural band max', () => {
    const cap = 1.081;
    const cfg = { ...BASE, directorCeilingCap: cap };
    const racers = mkRacers([1.0, 0.2, 0.1]);
    racers.forEach((r) => (r.spreadFactor = 1.05)); // near the band max already
    runFrames(racers, cfg, 40);
    racers.forEach((r) => expect(r.spreadFactor * r.governorMult).toBeLessThanOrEqual(cap + 1e-6));
  });

  it('per-step change never exceeds maxStepPerFrame', () => {
    const racers = mkRacers([0.9, 0.6, 0.3, 0.0, -0.3]);
    const dir = mkDir();
    let prev = racers.map((r) => r.governorMult);
    for (let i = 0; i < 50; i++) {
      applyGovernor(racers, 1.0, 'PULK', ctx(dir, { currentMs: i * 16 }), BASE);
      racers.forEach((r, j) =>
        expect(Math.abs(r.governorMult - prev[j])).toBeLessThanOrEqual(BASE.maxStepPerFrame + 1e-9)
      );
      prev = racers.map((r) => r.governorMult);
    }
  });

  it('two identical seeded sequences are byte-identical (deterministic, no Math.random)', () => {
    const cfg = { ...BASE, directorFallbackEnabled: true };
    const run = () => {
      const racers = mkRacers([0.9, 0.7, 0.5, 0.3, 0.1, -0.1, -0.3]);
      const dir = mkDir();
      const out = [];
      for (let i = 0; i < 30; i++) {
        applyGovernor(racers, 1.0, 'PULK', ctx(dir, { currentMs: i * 16, seed: 42 }), cfg);
        out.push(racers.map((r) => r.governorMult));
      }
      return out;
    };
    expect(run()).toEqual(run());
  });
});
