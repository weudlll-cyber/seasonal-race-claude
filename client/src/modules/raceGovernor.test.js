// ============================================================
// File:        raceGovernor.test.js
// Path:        client/src/modules/raceGovernor.test.js
// Project:     RaceArena
// Description: Unit tests for the PULK-phase contest director (raceGovernor.js). Covers: the
//              arc-distance helper, the phase-weight fade, the draw-aware reachability gate, the
//              additive boost-headroom ceiling, and applyPulkLeadRotation — until-P1 attackers, the
//              outsider slot, the distance-based ex-leader brake, and the min-hold grace.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  arcT,
  applyPulkLeadRotation,
  directorReachable,
  governorPhaseWeight,
  computeDirectorCeiling,
  NATURALNESS_CEILING,
} from './raceGovernor.js';

// Fresh per-race director state. applyPulkLeadRotation lazily attaches its own `leadRot` field.
const mkDir = () => ({});

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
  it('S2 — uses the FORCE-clamped boost: challengerBoost > maxEffect cannot admit past the clamp', () => {
    // Leader draw 1.15 (unbraked), chaser 1.00. Raw boost 0.30 → 1.30 > 1.15 (would WRONGLY admit),
    // but the force clamps the boost at maxEffect 0.12 → 1.12 < 1.15 → NOT reachable. The clamp flips it.
    expect(directorReachable(1.0, 1.15, 0.3, 0, 0.0, 0.12)).toBe(false); // clamped 1.12 < 1.15
    expect(directorReachable(1.0, 1.15, 0.3, 0, 0.0, Infinity)).toBe(true); // unclamped would over-admit
    // boost <= maxEffect is byte-identical to the unclamped estimate (no regression at the owner's 0.10).
    expect(directorReachable(0.92, 1.08, 0.1, 0, 0.1, 0.12)).toBe(true); // same verdict as the 5-arg case
    expect(directorReachable(0.92, 1.08, 0.1, 0, 0.1)).toBe(true); // default maxEffect = Infinity
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

  it('min-hold gates ONLY the new leader brake — chasers boost NORMALLY during the grace', () => {
    const dir = mkDir();
    const racers = mkRacers([8, 7, 6, 5, 4]);
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 100 }), LR); // 100 < 750 grace window
    expect(dir.leadRot.brakeSet.get(0).engagedAfterMs).toBe(850); // grace = leadTake(100) + minHold(750)
    expect(racers[0].governorMult).toBeCloseTo(1.0, 6); // new leader NOT braked yet (its own grace)
    expect(racers[1].governorMult).toBeGreaterThan(1.0); // BUT the eligible chaser IS boosting (not suppressed)
  });

  it('minHoldMs 0: the new leader brake engages immediately (engagedAfterMs == leadTake)', () => {
    const dir = mkDir();
    const racers = mkRacers([8, 7, 6, 5, 4]);
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 100 }), { ...LR, minHoldMs: 0 });
    expect(dir.leadRot.brakeSet.get(0).engagedAfterMs).toBe(100); // no grace
    expect(racers[0].governorMult).toBeLessThan(1.0); // braked at once
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
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 0 }), slow); // ONE boosted frame from 1.0
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

  it('S1 — heroes do NOT consume the attacker window: a hero-clogged front still fills the slots', () => {
    const dir = mkDir();
    const cfg = { ...LR, frontPool: 3 }; // old window = ranks 2..3 (only 2 non-leader slots)
    const racers = mkRacers([8, 7, 6, 5, 4, 3]);
    racers[1].isHeroChoreographed = true; // rank 2 hero
    racers[2].isHeroChoreographed = true; // rank 3 hero → old model: window is all-hero → elig empty
    racers[3].isHeroChoreographed = true; // rank 4 hero
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 0 }), cfg);
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 800 }), cfg); // hold expired
    // New: heroes skipped without consuming the window → the first (frontPool-1)=2 NON-heroes are idx4,idx5.
    expect(racers[4].governorMult).toBeGreaterThan(1.0); // real chaser boosted despite the hero clog
    expect(racers[5].governorMult).toBeGreaterThan(1.0); // second slot filled from behind the heroes too
    expect(racers[1].governorMult).toBeCloseTo(1.0, 6); // heroes are STILL never boosted
    expect(racers[2].governorMult).toBeCloseTo(1.0, 6);
    expect(racers[3].governorMult).toBeCloseTo(1.0, 6);
  });

  it('S1 constraint — the widened scan still reachability-gates: a hopeless low-draw chaser is NOT admitted', () => {
    const dir = mkDir();
    const cfg = { ...LR, frontPool: 3 };
    const racers = mkRacers([8, 7, 6, 5]);
    racers[1].isHeroChoreographed = true; // heroes clog ranks 2..3
    racers[2].isHeroChoreographed = true;
    racers[0].spreadFactor = 1.2; // leader very high draw
    racers[3].spreadFactor = 0.8; // deep chaser: even full boost cannot out-pace the braked leader
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 0 }), cfg);
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 800 }), cfg);
    // rBest = 0.8*(1+min(0.1,0.12)) = 0.88; leaderBraked = 1.2*(1-0.1) = 1.08 → unreachable → no admit.
    expect(dir.leadRot.attackers[0].idx).toBe(-1); // NOT parked in a deadlock — simply not admitted
    expect(racers[3].governorMult).toBeCloseTo(1.0, 6); // hopeless chaser is not boosted
  });

  it('S1 — attacker and outsider never collide on the same racer in one frame', () => {
    const dir = mkDir();
    const cfg = { ...LR, frontPool: 3, outsiderMaxReachLengths: 100 };
    const racers = mkRacers([8, 7, 6, 5, 4]); // idx4 is deep enough to be an outsider candidate
    racers[1].isHeroChoreographed = true; // hero clog pushes the non-hero window deeper
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 0 }), cfg);
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 800 }), cfg);
    const a0 = dir.leadRot.attackers[0].idx;
    const a1 = dir.leadRot.attackers[1].idx;
    const os = dir.leadRot.outsider.idx;
    if (os >= 0) {
      expect(os).not.toBe(a0);
      expect(os).not.toBe(a1); // outsider draws from OUTSIDE the (hero-extended) front window
    }
  });

  it('S3 — brakeSet safety timeout: a dethroned member that never reaches dropDepth is force-released', () => {
    const dir = mkDir();
    const racers = mkRacers([8, 7.9, 6, 5, 4]);
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 0 }), LR); // idx0 leads, engaged at 750
    racers[0].t = 7.9;
    racers[1].t = 8.0; // idx1 takes the lead; idx0 dethroned
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 800 }), LR); // idx0 braked, hovers 0.1 back
    expect(dir.leadRot.brakeSet.has(0)).toBe(true);
    // idx0 stays 0.1 behind (< dropDepth 2) so distance-release never fires — only the timeout can.
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 750 + 12001 }), LR);
    expect(dir.leadRot.brakeSet.has(0)).toBe(false); // force-released by the safety net
  });

  it('S3 — the CURRENT leader is EXEMPT from the timeout (a long uninterrupted lead keeps its brake)', () => {
    const dir = mkDir();
    const racers = mkRacers([8, 7, 6, 5, 4]);
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 0 }), LR); // idx0 leads, engaged at 750
    applyPulkLeadRotation(racers, 1.0, ctx(dir, { currentMs: 750 + 12001 }), LR); // never dethroned
    expect(dir.leadRot.brakeSet.has(0)).toBe(true); // leader is exempt → still a member
    expect(racers[0].governorMult).toBeLessThan(1.0); // still braked (the mechanism, not a stall)
  });
});
