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
import {
  arcT,
  applyGovernor,
  applyPulkLeadRotation,
  directorReachable,
  governorPhaseWeight,
  directorStreamKey,
  computeDirectorCeiling,
  NATURALNESS_CEILING,
} from './raceGovernor.js';

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
  pulkStartFrac: 0.25,
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

// PulkRaceDirector — pulkOnly scope + N1 forced lead-rotation.
describe('applyGovernor — PulkRaceDirector (pulkOnly + N1 rotation)', () => {
  it('pulkOnly: active in PULK (leader braked), inert in PRE_PULK', () => {
    const cfg = { ...BASE, pulkOnly: true };
    const pre = mkRacers([8, 7, 6, 5, 4]);
    applyGovernor(pre, 1.0, 'PRE_PULK', ctx(mkDir(), { progress: 0.1 }), cfg);
    pre.forEach((r) => expect(r.governorMult).toBe(1.0)); // PRE_PULK excluded under pulkOnly
    const pulk = mkRacers([8, 7, 6, 5, 4]);
    applyGovernor(pulk, 1.0, 'PULK', ctx(mkDir(), { progress: 0.3 }), cfg);
    expect(pulk[0].governorMult).toBeLessThan(1.0); // leader braked once inside PULK
  });

  it('N1: a P1 held past maxLeadHoldMs is demoted into a fall-back slot (lead rotates)', () => {
    const cfg = {
      ...BASE,
      pulkOnly: true,
      maxLeadHoldMs: 500,
      directorFallbackEnabled: true,
      directorFallbackMaxCount: 2,
    };
    const racers = mkRacers([8, 7, 6, 5, 4, 3, 2, 1]); // index 0 is the clear, persistent leader
    const dir = mkDir();
    let demotedBeforeCap = false,
      demotedAfterCap = false;
    for (let i = 0; i < 150; i++) {
      const ms = i * 16;
      applyGovernor(racers, 1.0, 'PULK', ctx(dir, { currentMs: ms, progress: 0.3 }), cfg);
      const leaderInFall = dir.fallSlots.some((sl) => sl.idx === 0);
      if (ms < 500 && leaderInFall) demotedBeforeCap = true;
      if (ms >= 500 && leaderInFall) demotedAfterCap = true;
    }
    expect(demotedBeforeCap).toBe(false); // the leader is not a fall-back target before its cap trips
    expect(demotedAfterCap).toBe(true); // N1 pushes the over-holding leader into a fall-back slot
  });

  it('N1 off (maxLeadHoldMs 0): the leader is NEVER demoted (classic fall-back excludes P1)', () => {
    const cfg = {
      ...BASE,
      pulkOnly: true,
      maxLeadHoldMs: 0,
      directorFallbackEnabled: true,
      directorFallbackMaxCount: 2,
    };
    const racers = mkRacers([8, 7, 6, 5, 4, 3, 2, 1]);
    const dir = mkDir();
    let leaderEverInFall = false;
    for (let i = 0; i < 150; i++) {
      applyGovernor(racers, 1.0, 'PULK', ctx(dir, { currentMs: i * 16, progress: 0.3 }), cfg);
      if (dir.fallSlots.some((sl) => sl.idx === 0)) leaderEverInFall = true;
    }
    expect(leaderEverInFall).toBe(false);
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

describe('computeDirectorCeiling (additive boost-headroom + naturalness clamp)', () => {
  // Shipped ±8.1% band: max 0.00113, mean 0.001045 → band max factor ≈ 1.0813.
  const MAX = 0.00113;
  const MEAN = 0.001045;
  const bandMax = MAX / MEAN;

  it('boostHeadroom 0 → exactly the band max (byte-identical to the pre-headroom cap)', () => {
    expect(computeDirectorCeiling(MAX, MEAN, 0)).toBeCloseTo(bandMax, 12);
    // default arg is 0 too
    expect(computeDirectorCeiling(MAX, MEAN)).toBeCloseTo(bandMax, 12);
  });

  it('adds headroom in speed-factor points (additive, not multiplicative)', () => {
    expect(computeDirectorCeiling(MAX, MEAN, 0.05)).toBeCloseTo(bandMax + 0.05, 12);
    expect(computeDirectorCeiling(MAX, MEAN, 0.08)).toBeCloseTo(bandMax + 0.08, 12);
  });

  it('hard-clamps to NATURALNESS_CEILING (1.20) so no config/band can breach the ±20% leitplanke', () => {
    // Construct a band whose max factor is 1.15, then add 0.10 → 1.25 → clamps to 1.20.
    expect(computeDirectorCeiling(1.15, 1.0, 0.1)).toBe(NATURALNESS_CEILING);
    // Even an absurd headroom cannot exceed the clamp.
    expect(computeDirectorCeiling(MAX, MEAN, 999)).toBe(NATURALNESS_CEILING);
  });

  it('available headroom shrinks automatically as the band widens (scales with band)', () => {
    // Wider band (max factor 1.15) leaves less room under the 1.20 clamp than a narrow band (1.08).
    const narrow = computeDirectorCeiling(1.08, 1.0, 0.15); // 1.08 + 0.15 = 1.23 → 1.20
    const wide = computeDirectorCeiling(1.15, 1.0, 0.15); // 1.15 + 0.15 = 1.30 → 1.20
    expect(narrow).toBe(NATURALNESS_CEILING);
    expect(wide).toBe(NATURALNESS_CEILING);
    // Below the clamp, a wider band yields a higher ceiling for the SAME headroom (additive).
    expect(computeDirectorCeiling(1.15, 1.0, 0.02)).toBeGreaterThan(
      computeDirectorCeiling(1.08, 1.0, 0.02)
    );
  });

  it('negative headroom is floored to 0; non-positive mean returns 0', () => {
    expect(computeDirectorCeiling(MAX, MEAN, -0.05)).toBeCloseTo(bandMax, 12);
    expect(computeDirectorCeiling(MAX, 0, 0.05)).toBe(0);
  });
});

// ── PulkLeadRotation — until-P1 attackers + outsider + distance ex-leader brake + min-hold ──
const LR = {
  enabled: true,
  attackerSlots: 2,
  dropDepthLengths: 2,
  outsiderMaxReachLengths: 15,
  deadlockTimeoutMs: 12000,
  minHoldMs: 750,
  frontPool: 8,
  leaderBrake: 0.1,
  challengerBoost: 0.1,
  maxEffect: 0.12,
  maxStepPerFrame: 0.5, // fast slew so a target is reached within one frame in tests
  ceilingCap: 0,
};

describe('directorReachable — draw + ceiling aware', () => {
  it('a booster that can out-pace the BRAKED leader is reachable', () => {
    expect(directorReachable(0.92, 1.08, 0.1, 0, 0.1)).toBe(true); // 1.012 > 0.972
  });
  it('a booster that cannot out-pace an UNBRAKED high-draw leader is not', () => {
    expect(directorReachable(0.92, 1.08, 0.1, 0, 0.0)).toBe(false); // 1.012 < 1.08
  });
  it('the ceiling cap can pull the booster below the leader → not reachable', () => {
    expect(directorReachable(1.0, 1.0, 0.1, 1.0, 0.0)).toBe(false); // capped at 1.0, not > 1.0
  });
});

describe('applyPulkLeadRotation', () => {
  it('OFF (enabled false): every governorMult slews to 1.0', () => {
    const racers = mkRacers([8, 7, 6, 5, 4]);
    racers.forEach((r) => (r.governorMult = 0.8));
    applyPulkLeadRotation(racers, 1.0, ctx(mkDir()), { ...LR, enabled: false });
    racers.forEach((r) => expect(r.governorMult).toBeCloseTo(1.0, 6));
  });

  it('outside the PULK window (OUTCOME): no effect', () => {
    const racers = mkRacers([8, 7, 6, 5, 4]);
    applyPulkLeadRotation(racers, 1.0, ctx(mkDir(), { progress: 0.6 }), LR);
    racers.forEach((r) => expect(r.governorMult).toBeCloseTo(1.0, 6));
  });

  it('min-hold: a fresh P1 runs free and no boost fires inside the hold window', () => {
    const racers = mkRacers([8, 7, 6, 5, 4]);
    applyPulkLeadRotation(racers, 1.0, ctx(mkDir(), { currentMs: 100 }), LR); // 100 < 750
    racers.forEach((r) => expect(r.governorMult).toBeCloseTo(1.0, 6));
  });

  it('after the hold: the P1 is braked and the current P2 (reachable non-hero) is boosted', () => {
    const dir = mkDir();
    const racers = mkRacers([8, 7, 6, 5, 4]);
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 0 }), LR);
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 800 }), LR); // hold expired, same P1
    expect(racers[0].governorMult).toBeLessThan(1.0); // P1 braked
    expect(racers[1].governorMult).toBeGreaterThan(1.0); // P2 boosted
  });

  it('FLAT boost: a chosen booster targets the FULL challengerBoost regardless of distance behind', () => {
    // Two attacker slots boost P2 (1 length back) and P3 (2 back). Distance-proportional would give
    // P2 < P3; FLAT gives them the SAME target = 1 + challengerBoost. LR.maxStepPerFrame 0.5 reaches it.
    const dir = mkDir();
    const racers = mkRacers([8, 7, 6, 5, 4]);
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 0 }), LR);
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 800 }), LR); // hold expired → both boosted
    expect(racers[1].governorMult).toBeCloseTo(1 + LR.challengerBoost, 6); // P2 at full boost
    expect(racers[2].governorMult).toBeCloseTo(1 + LR.challengerBoost, 6); // P3 at the SAME full boost
    // Not distance-scaled: the closer chaser is not weaker than the farther one.
    expect(racers[1].governorMult).toBeCloseTo(racers[2].governorMult, 6);
  });

  it('FLAT boost is slew-smoothed: it ramps to full over frames, not in one jump', () => {
    const dir = mkDir();
    const racers = mkRacers([8, 7, 6, 5, 4]);
    const slow = { ...LR, maxStepPerFrame: 0.02 }; // realistic slew
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 0 }), slow);
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 800 }), slow); // first boosted frame
    // One frame moved P2 up by ≤ maxStepPerFrame (smooth ramp), not straight to full boost.
    expect(racers[1].governorMult).toBeGreaterThan(1.0);
    expect(racers[1].governorMult).toBeLessThanOrEqual(1 + slow.maxStepPerFrame + 1e-9);
  });

  it('hero-inclusive leader brake; a hero P2 is never boosted (a non-hero takes the slot)', () => {
    const dir = mkDir();
    const racers = mkRacers([8, 7, 6, 5, 4]);
    racers[0].isHeroChoreographed = true; // hero leads
    racers[1].isHeroChoreographed = true; // hero is P2
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 0 }), LR);
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 800 }), LR);
    expect(racers[0].governorMult).toBeLessThan(1.0); // hero leader IS braked
    expect(racers[1].governorMult).toBeCloseTo(1.0, 6); // hero P2 NOT boosted
    expect(racers[2].governorMult).toBeGreaterThan(1.0); // non-hero P3 boosted instead
  });

  it('settle-brake SET: a dethroned leader is braked until dropDepth behind the CURRENT leader, then released', () => {
    const dir = mkDir();
    const racers = mkRacers([8, 7.9, 6, 5, 4]);
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 0 }), LR); // idx0 leads (hold → 750)
    racers[0].t = 7.9;
    racers[1].t = 8.0; // idx1 takes the lead (0.1 ahead of idx0)
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 800 }), LR);
    expect(dir.leadRot.brakeSet.has(0)).toBe(true); // dethroned leader is a brake-set member
    expect(racers[0].governorMult).toBeLessThan(1.0); // braked (0.1 < 2 dropDepth)
    racers[0].t = 5.0; // now 3 lengths behind the new leader (8.0)
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 900 }), LR);
    expect(dir.leadRot.brakeSet.has(0)).toBe(false); // released (>= dropDepth behind CURRENT leader)
  });

  it('THE FIX — a dethroned leader stays braked THROUGH the next P1 change; MANY brake at once', () => {
    const dir = mkDir();
    const racers = mkRacers([8, 7.9, 7.8, 5, 4]);
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 0 }), LR); // idx0 leads
    racers[0].t = 7.9;
    racers[1].t = 8.0; // idx1 passes idx0
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 800 }), LR); // idx0 braked
    expect(racers[0].governorMult).toBeLessThan(1.0);
    // A SECOND P1 change: idx2 passes idx1; idx0 slips to 7.7 (still < 2 behind the new leader idx2)
    racers[1].t = 7.85;
    racers[2].t = 8.05;
    racers[0].t = 7.7;
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 1600 }), LR);
    // The old single-index model would have DROPPED idx0's brake here (overwritten by idx1). It must not:
    expect(dir.leadRot.brakeSet.has(0)).toBe(true); // idx0 STILL braked (0.35 < 2 behind current leader)
    expect(racers[0].governorMult).toBeLessThan(1.0);
    // idx1 (just dethroned, its own hold elapsed) is ALSO braked → several at once, each own target
    expect(dir.leadRot.brakeSet.has(1)).toBe(true);
    expect(racers[1].governorMult).toBeLessThan(1.0);
  });

  it('hold applies ONLY at onset: a later overtake does not restart the brake hold', () => {
    const dir = mkDir();
    const racers = mkRacers([8, 7.9, 6, 5, 4]);
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 0 }), LR); // idx0 leads, hold → 750
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 800 }), LR); // idx0 braked (past hold)
    expect(racers[0].governorMult).toBeLessThan(1.0);
    racers[0].t = 7.9;
    racers[1].t = 8.0; // idx0 overtaken
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 810 }), LR);
    expect(dir.leadRot.brakeSet.get(0).engagedAfterMs).toBe(750); // onset hold NOT re-stamped
    expect(racers[0].governorMult).toBeLessThan(1.0); // braked immediately — no new grace on overtake
  });

  it('signed lap-aware release: a lapped-far ex-leader IS released (arcT would wrap-keep it braked)', () => {
    const dir = mkDir();
    // closed track, lenScale = pathLengthPx/meanBodyLen = 10 (1 lap = 10 racer lengths)
    const c = (over) => ctx(dir, { isOpen: false, pathLengthPx: 10, meanBodyLen: 1, ...over });
    const racers = mkRacers([8, 7.9, 6, 5, 4]);
    applyPulkLeadRotation(racers, 1.0, c({ currentMs: 0 }), LR);
    racers[0].t = 7.9;
    racers[1].t = 8.0; // idx1 leads, idx0 dethroned + braked
    applyPulkLeadRotation(racers, 1.0, c({ currentMs: 800 }), LR);
    expect(dir.leadRot.brakeSet.has(0)).toBe(true);
    racers[0].t = 7.15; // 0.85 lap behind the leader → SIGNED 8.5 lengths (arcT would wrap to 1.5)
    applyPulkLeadRotation(racers, 1.0, c({ currentMs: 900 }), LR);
    expect(dir.leadRot.brakeSet.has(0)).toBe(false); // released via SIGNED distance (>= dropDepth 2)
  });

  it('deadlock timeout: a stuck target (never becomes P1) is cooled after deadlockTimeoutMs', () => {
    const dir = mkDir();
    const racers = mkRacers([8, 7, 6, 5, 4]);
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 0 }), LR);
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 800 }), LR);
    expect(dir.leadRot.attackers[0].idx).toBe(1); // P2 targeted
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 800 + 12001 }), LR);
    expect(dir.leadRot.cooldownUntil.get(1)).toBeGreaterThan(0); // stuck target cooled
  });
});
