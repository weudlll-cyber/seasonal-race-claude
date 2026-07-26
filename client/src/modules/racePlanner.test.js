// ============================================================
// File:        racePlanner.test.js
// Path:        client/src/modules/racePlanner.test.js
// Project:     RaceArena
// Description: Unit tests for createRacePlan and createTrajectoryController.
//              Covers: seed determinism, P-controller arithmetic,
//              pulk selection invariants, phase transitions.
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { createRacePlan, createTrajectoryController } from './racePlanner.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRacers(count, rowSize = 14) {
  return Array.from({ length: count }, (_, i) => ({
    index: i,
    startRowIndex: Math.floor(i / rowSize),
    t: 0,
    finished: false,
    avoidanceActive: false,
    trajectoryMult: 1.0,
    baseSpeed: 0.001,
  }));
}

const FINISH_T = 0.6;
const TARGET_DUR_MS = 60_000; // 60s
const BASE_RACERS = makeRacers(70, 14); // 5 rows of 14
const BASE_SEED = 42;

// ── createRacePlan ────────────────────────────────────────────────────────────

describe('createRacePlan', () => {
  it('is deterministic with the same seed', () => {
    const p1 = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
    const p2 = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
    expect(p1.winnerRacerId).toBe(p2.winnerRacerId);
    expect(p1.pulkRacerIds).toEqual(p2.pulkRacerIds);
  });

  it('produces different results with different seeds', () => {
    const plans = [1, 2, 3, 99, 1000].map((s) =>
      createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, s)
    );
    const winners = plans.map((p) => p.winnerRacerId);
    // Very unlikely all 5 seeds pick the same winner
    const unique = new Set(winners);
    expect(unique.size).toBeGreaterThan(1);
  });

  it('stores the seed in the plan', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, 7);
    expect(plan.seed).toBe(7);
  });

  it('_racerTargetRank is a complete permutation of 1..n', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
    expect(plan._racerTargetRank).toBeInstanceOf(Map);
    expect(plan._racerTargetRank.size).toBe(BASE_RACERS.length);
    const ranks = [...plan._racerTargetRank.values()].sort((a, b) => a - b);
    expect(ranks).toEqual(Array.from({ length: BASE_RACERS.length }, (_, i) => i + 1));
  });

  it('winnerRacerId has targetRank=1', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, seed);
      expect(plan._racerTargetRank.get(plan.winnerRacerId)).toBe(1);
    }
  });

  it('winner is always a valid racer index', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, seed);
      expect(plan.winnerRacerId).toBeGreaterThanOrEqual(0);
      expect(plan.winnerRacerId).toBeLessThan(BASE_RACERS.length);
    }
  });

  it('winner is never in pulkRacerIds', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, seed);
      expect(plan.pulkRacerIds).not.toContain(plan.winnerRacerId);
    }
  });

  it('always selects exactly 3 pulk racers', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, seed);
      expect(plan.pulkRacerIds).toHaveLength(3);
    }
  });

  it('pulk racer IDs are all distinct', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, seed);
      const unique = new Set(plan.pulkRacerIds);
      expect(unique.size).toBe(3);
    }
  });

  it('exposes correct phase fractions (reopened PULK, OutcomeStart 0.5)', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { choreoOutcomeStart: 0.5 },
      BASE_SEED
    );
    expect(plan.phaseFractions.pulkStart).toBe(0.25);
    expect(plan.phaseFractions.pulkEnd).toBe(0.5);
    expect(plan.phaseFractions.corridorStart).toBe(0.5); // choreography collapse: corridorStart := pulkEnd
    expect(plan.phaseFractions.corridorEnd).toBe(1.0);
  });

  it('absolute phase times are derived from targetDurationMs', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { choreoOutcomeStart: 0.5 },
      BASE_SEED
    );
    expect(plan._phases.pulkStart).toBeCloseTo(0.25 * TARGET_DUR_MS, 0);
    expect(plan._phases.pulkEnd).toBeCloseTo(0.5 * TARGET_DUR_MS, 0);
  });

  it('respects postStartHoldMs as minimum pulkStart', () => {
    const holdMs = 20_000;
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { postStartHoldMs: holdMs },
      BASE_SEED
    );
    // pulkStart fraction = 0.25 × 60000 = 15000ms < 20000ms, so holdMs wins
    expect(plan._phases.pulkStart).toBe(holdMs);
  });

  it('accepts config overrides for controllerParams', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { controllerParams: { gain: 5.0, maxMult: 1.15, minMult: 0.9 } },
      BASE_SEED
    );
    expect(plan.controllerParams.gain).toBe(5.0);
    expect(plan.controllerParams.maxMult).toBe(1.15);
    expect(plan.controllerParams.minMult).toBe(0.9);
  });

  it('falls back gracefully with seed=0 (non-deterministic mode)', () => {
    expect(() => createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, 0)).not.toThrow();
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, 0);
    expect(plan.seed).toBe(0);
    expect(plan.pulkRacerIds).toHaveLength(3);
  });
});

// ── PHASE COLLAPSE: OUTCOME begins where PULK ends (choreography is unconditional) ──
describe('createRacePlan — phase collapse', () => {
  it('default outcome-start: PULK collapses — pulkEnd == corridorStart == 0.25 (OUTCOME from the chaos boundary)', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { corridorStart: 0.55 }, // corridorStart shortcut is OVERRIDDEN by the choreography collapse
      BASE_SEED
    );
    expect(plan.phaseFractions.corridorStart).toBe(0.25);
    expect(plan.phaseFractions.pulkEnd).toBe(0.25);
    expect(plan.phaseFractions.pulkStart).toBe(0.25); // zero-width PULK + TRANSITION = the two-phase model
  });

  it('honours a custom choreoOutcomeStart (owner sweet-spot control)', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { choreoOutcomeStart: 0.35 },
      BASE_SEED
    );
    expect(plan.phaseFractions.corridorStart).toBe(0.35);
    expect(plan.phaseFractions.pulkEnd).toBe(0.35);
  });

  it('the earlier OUTCOME steers the pack LOOSE, not rank-locked (pack strictness < 1.0)', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { choreoPackBandStrictness: 0.5 },
      BASE_SEED
    );
    // Collapsing OUTCOME earlier must NOT exact-rank-lock the pack — heroes need weaving room (A4).
    expect(plan._choreoEnabled).toBe(true);
    expect(plan._choreoPackBandStrictness).toBeGreaterThan(0);
    expect(plan._choreoPackBandStrictness).toBeLessThan(1.0);
  });

  it('reopenable PULK: choreoOutcomeStart is the PULK-END control; corridorStart := pulkEnd', () => {
    // New contract: under choreo, OUTCOME begins exactly where PULK ends (no TRANSITION). Raising the
    // PULK-end control (choreoOutcomeStart) above pulkStart opens a real PULK window.
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { pulkStart: 0.2, choreoOutcomeStart: 0.5 },
      BASE_SEED
    );
    expect(plan.phaseFractions.pulkStart).toBe(0.2);
    expect(plan.phaseFractions.pulkEnd).toBe(0.5);
    expect(plan.phaseFractions.corridorStart).toBe(0.5); // corridorStart := live pulkEnd
    // The PULK phase is now reachable (non-zero width): 0.2 <= p < 0.5.
    const ctrl = createTrajectoryController(plan);
    expect(ctrl.getPhase(0, 0.19)).toBe('PRE_PULK');
    expect(ctrl.getPhase(0, 0.35)).toBe('PULK');
    expect(ctrl.getPhase(0, 0.5)).toBe('OUTCOME');
    // TRANSITION never appears under choreo (corridorStart == pulkEnd).
    for (let p = 0; p <= 1.0; p += 0.02) expect(ctrl.getPhase(0, p)).not.toBe('TRANSITION');
  });

  it('pulkStart shortcut threads into phaseFractions and is clamp-hardened', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { pulkStart: 0.1, choreoOutcomeStart: 0.5 },
      BASE_SEED
    );
    expect(plan.phaseFractions.pulkStart).toBe(0.1);
    expect(plan.phaseFractions.pulkEnd).toBe(0.5);
    // A pulkStart past corridorEnd is anchored to [0, corridorEnd] and pulls pulkEnd/corridorStart up
    // — ordered, never inverted.
    const plan2 = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { pulkStart: 1.5, choreoOutcomeStart: 0.5 },
      BASE_SEED
    );
    expect(plan2.phaseFractions.pulkStart).toBe(1.0); // clamped to corridorEnd
    expect(plan2.phaseFractions.pulkStart).toBeLessThanOrEqual(plan2.phaseFractions.pulkEnd);
    expect(plan2.phaseFractions.pulkEnd).toBeLessThanOrEqual(plan2.phaseFractions.corridorStart);
    expect(plan2.phaseFractions.corridorStart).toBeLessThanOrEqual(
      plan2.phaseFractions.corridorEnd
    );
  });
});

// ── createTrajectoryController — P-controller arithmetic ─────────────────────

describe('createTrajectoryController — P-controller arithmetic', () => {
  let plan;

  beforeEach(() => {
    plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
  });

  it('sets trajectoryMult=1.0 on all racers outside OUTCOME phase', () => {
    const ctrl = createTrajectoryController(plan);
    const racers = BASE_RACERS.map((r) => ({ ...r, trajectoryMult: 1.0 }));
    // elapsedMs = 10000ms (< pulkStart=15000) → PRE_PULK
    ctrl.update(racers, 10_000);
    for (const r of racers) expect(r.trajectoryMult).toBe(1.0);
  });

  it('sets trajectoryMultTarget=1.0 on all racers in TRANSITION phase', () => {
    const ctrl = createTrajectoryController(plan);
    const racers = BASE_RACERS.map((r) => ({
      ...r,
      trajectoryMult: 1.0,
      trajectoryMultTarget: 1.0,
      trajectoryMultPrev: 1.0,
      trajectoryMultTransStart: 0,
    }));
    const transMs = plan._phases.corrStart - 1000; // just before OUTCOME begins
    ctrl.update(racers, transMs);
    for (const r of racers) expect(r.trajectoryMultTarget).toBe(1.0);
  });

  it('clamps trajectoryMultTarget to [minMult, maxMult] in OUTCOME phase', () => {
    const ctrl = createTrajectoryController(plan);
    const outcomeMs = plan._phases.transEnd + 1000;
    const { winnerRacerId } = plan;

    // winner (targetRank=1) placed last → large positive rankError → clamped to maxMult
    const racers = BASE_RACERS.map((r) => ({
      ...r,
      t: r.index === winnerRacerId ? 0.1 : 0.5,
      finished: false,
      avoidanceActive: false,
      trajectoryMult: 1.0,
      trajectoryMultTarget: 1.0,
      trajectoryMultPrev: 1.0,
      trajectoryMultTransStart: 0,
    }));
    ctrl.update(racers, outcomeMs);

    const winner = racers.find((r) => r.index === winnerRacerId);
    expect(winner.trajectoryMultTarget).toBeLessThanOrEqual(
      plan.controllerParams.maxMult + plan._stochasticNoise + 0.001
    );
    expect(winner.trajectoryMultTarget).toBeGreaterThanOrEqual(
      plan.controllerParams.minMult - 0.001
    );
  });

  it('P-controller arithmetic: winner at last rank → target clamped to maxMult', () => {
    const ctrl = createTrajectoryController(plan);
    const { transEnd, midSwitch } = plan._phases;
    const outcomeMs = (transEnd + midSwitch) / 2;

    const racers = BASE_RACERS.map((r) => ({
      ...r,
      t: r.index === plan.winnerRacerId ? 0.1 : 0.5,
      finished: false,
      avoidanceActive: false,
      trajectoryMult: 1.0,
      trajectoryMultTarget: 1.0,
      trajectoryMultPrev: 1.0,
      trajectoryMultTransStart: 0,
    }));
    ctrl.update(racers, outcomeMs);
    const w = racers.find((r) => r.index === plan.winnerRacerId);

    const NOISE_TOL = plan._stochasticNoise + 0.002;
    expect(w.trajectoryMultTarget).toBeLessThanOrEqual(plan.controllerParams.maxMult + NOISE_TOL);
    expect(w.trajectoryMultTarget).toBeGreaterThan(plan.controllerParams.maxMult - NOISE_TOL);
  });

  it('P-controller arithmetic: racer with last targetRank at rank 1 → target clamped to minMult', () => {
    const ctrl = createTrajectoryController(plan);
    const { transEnd, midSwitch } = plan._phases;
    const outcomeMs = (transEnd + midSwitch) / 2;

    const n = BASE_RACERS.length;
    const lastTargetRankId = [...plan._racerTargetRank.entries()].find(([, r]) => r === n)[0];

    const racers = BASE_RACERS.map((r) => ({
      ...r,
      t: r.index === lastTargetRankId ? 0.9 : 0.5,
      finished: false,
      avoidanceActive: false,
      trajectoryMult: 1.0,
      trajectoryMultTarget: 1.0,
      trajectoryMultPrev: 1.0,
      trajectoryMultTransStart: 0,
    }));
    ctrl.update(racers, outcomeMs);
    const w = racers.find((r) => r.index === lastTargetRankId);

    const NOISE_TOL = plan._stochasticNoise + 0.002;
    expect(w.trajectoryMultTarget).toBeGreaterThanOrEqual(
      plan.controllerParams.minMult - NOISE_TOL
    );
    expect(w.trajectoryMultTarget).toBeLessThan(plan.controllerParams.minMult + NOISE_TOL);
  });

  it('no intervention (target≈1.0) when winner (targetRank=1) is already at rank 1', () => {
    const ctrl = createTrajectoryController(plan);
    const { transEnd } = plan._phases;
    const outcomeMs = transEnd + 1000;

    // Place winner at rank 1 (highest t) — targetRank=1, currentRank=1, rankError=0
    const racers = BASE_RACERS.map((r) => ({
      ...r,
      t: r.index === plan.winnerRacerId ? 0.9 : 0.5,
      finished: false,
      avoidanceActive: false,
      trajectoryMult: 1.0,
      trajectoryMultTarget: 1.0,
      trajectoryMultPrev: 1.0,
      trajectoryMultTransStart: 0,
      areaBonusMult: 1.0,
    }));
    ctrl.update(racers, outcomeMs);
    const w = racers.find((r) => r.index === plan.winnerRacerId);
    // rankError=0 → target = 1.0 + noise only
    const NOISE_TOL = plan._stochasticNoise + 0.001;
    expect(w.trajectoryMultTarget).toBeGreaterThanOrEqual(1.0 - NOISE_TOL);
    expect(w.trajectoryMultTarget).toBeLessThanOrEqual(1.0 + NOISE_TOL);
  });
});

// ── createRacePlan — areaBonus assignment ─────────────────────────────────────

describe('createRacePlan — areaBonus', () => {
  it('assigns _racerAreaBonus for every racer', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
    expect(plan._racerAreaBonus).toBeInstanceOf(Map);
    expect(plan._racerAreaBonus.size).toBe(BASE_RACERS.length);
  });

  it('B1 racers (targetRank 1-5) get bonus 1.03', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
    for (const [racerIdx, targetRank] of plan._racerTargetRank) {
      if (targetRank <= 5) {
        expect(plan._racerAreaBonus.get(racerIdx)).toBe(1.03);
      }
    }
  });

  it('B5 racers (targetRank 41+) get bonus 0.99', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
    for (const [racerIdx, targetRank] of plan._racerTargetRank) {
      if (targetRank > 40) {
        expect(plan._racerAreaBonus.get(racerIdx)).toBe(0.99);
      }
    }
  });

  it('uses custom areaBonusByArea from config', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { areaBonusByArea: { B1: 1.05, B2: 1.04, B3: 1.03, B4: 1.0, B5: 0.97 } },
      BASE_SEED
    );
    for (const [racerIdx, targetRank] of plan._racerTargetRank) {
      if (targetRank <= 5) {
        expect(plan._racerAreaBonus.get(racerIdx)).toBe(1.05);
      }
    }
  });

  it('stores _areaBonusFadeDuration default 1500ms', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
    expect(plan._areaBonusFadeDuration).toBe(1500);
  });
});

// ── createTrajectoryController — choreo areaBonus instant cut (Stage 1, C-2) ──────

describe('createTrajectoryController — choreo areaBonus instant cut', () => {
  function choreoRacers() {
    return BASE_RACERS.map((r) => ({
      ...r,
      t: 0.5,
      finished: false,
      avoidanceActive: false,
      trajectoryMult: 1.0,
      trajectoryMultTarget: 1.0,
      trajectoryMultPrev: 1.0,
      trajectoryMultTransStart: 0,
      areaBonusMult: 1.0,
    }));
  }
  const fracOf = (plan) => plan._phases.pulkStart / plan._targetDurationMs;

  it('keeps full areaBonus during CHAOS (before the chaos boundary)', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
    const racers = choreoRacers();
    createTrajectoryController(plan).update(racers, 1000, fracOf(plan) - 0.05);
    for (const r of racers)
      expect(r.areaBonusMult).toBeCloseTo(plan._racerAreaBonus.get(r.index) ?? 1.0, 5);
  });

  it('INSTANT-cuts areaBonus to 1.0 for EVERY racer from the chaos boundary (no fade)', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
    const racers = choreoRacers();
    const p = fracOf(plan) + 0.01;
    createTrajectoryController(plan).update(racers, TARGET_DUR_MS * p, p);
    for (const r of racers) expect(r.areaBonusMult).toBeCloseTo(1.0, 5);
  });

  it('spoiler switch suppresses the B1-target pool bonus during chaos (default off keeps it)', () => {
    const on = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { choreoSuppressChaosBonusB1: true },
      BASE_SEED
    );
    const off = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
    const rOn = choreoRacers();
    const rOff = choreoRacers();
    createTrajectoryController(on).update(rOn, 1000, fracOf(on) - 0.05);
    createTrajectoryController(off).update(rOff, 1000, fracOf(off) - 0.05);
    for (const r of rOn)
      if ((on._racerTargetRank.get(r.index) ?? 99) <= 5)
        expect(r.areaBonusMult).toBeCloseTo(1.0, 5);
    // default off: at least one B1 racer keeps its 1.03 bonus
    expect(
      rOff.some(
        (r) =>
          (off._racerTargetRank.get(r.index) ?? 99) <= 5 && Math.abs(r.areaBonusMult - 1.03) < 1e-6
      )
    ).toBe(true);
  });
});

// ── createTrajectoryController — areaBonusMult ───────────────────────────

describe('createTrajectoryController — areaBonusMult', () => {
  let plan;

  beforeEach(() => {
    plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
  });

  function makeRacers() {
    return BASE_RACERS.map((r) => ({
      ...r,
      t: 0.5,
      finished: false,
      avoidanceActive: false,
      trajectoryMult: 1.0,
      trajectoryMultTarget: 1.0,
      trajectoryMultPrev: 1.0,
      trajectoryMultTransStart: 0,
      areaBonusMult: 1.0,
    }));
  }

  it('sets full areaBonusMult in PRE_PULK phase', () => {
    const ctrl = createTrajectoryController(plan);
    const racers = makeRacers();
    ctrl.update(racers, plan._phases.pulkStart - 1000); // before PULK
    for (const r of racers) {
      const expected = plan._racerAreaBonus.get(r.index) ?? 1.0;
      expect(r.areaBonusMult).toBeCloseTo(expected, 5);
    }
  });

  it('areaBonusMult = 1.0 for B4 racers in all phases', () => {
    const ctrl = createTrajectoryController(plan);
    const racers = makeRacers();
    ctrl.update(racers, plan._phases.pulkStart - 500);
    for (const r of racers) {
      const targetRank = plan._racerTargetRank.get(r.index);
      if (targetRank > 25 && targetRank <= 40) {
        expect(r.areaBonusMult).toBeCloseTo(1.0, 5);
      }
    }
  });

  it('fades areaBonusMult toward 1.0 at OUTCOME entry', () => {
    const ctrl = createTrajectoryController(plan);
    const racers = makeRacers();
    const halfFade = plan._phases.transEnd + plan._areaBonusFadeDuration / 2;
    ctrl.update(racers, halfFade);
    for (const r of racers) {
      const origBonus = plan._racerAreaBonus.get(r.index) ?? 1.0;
      // At halfway through fade: value should be between 1.0 and origBonus
      expect(r.areaBonusMult).toBeGreaterThanOrEqual(Math.min(1.0, origBonus) - 0.001);
      expect(r.areaBonusMult).toBeLessThanOrEqual(Math.max(1.0, origBonus) + 0.001);
    }
  });

  it('areaBonusMult = 1.0 after fade completes in OUTCOME', () => {
    const ctrl = createTrajectoryController(plan);
    const racers = makeRacers();
    ctrl.update(racers, plan._phases.transEnd + plan._areaBonusFadeDuration + 100);
    for (const r of racers) {
      expect(r.areaBonusMult).toBeCloseTo(1.0, 5);
    }
  });

  // C0-fix regression: with the leader-progress phase clock the fade TRIGGER can fire while the
  // wall-clock elapsedMs is still well below transEnd (leader ahead of median pace). The old code
  // computed elapsedFade = elapsedMs - transEnd → NEGATIVE → unclamped easeInOutCubic(4·t³) blew
  // areaBonusMult up to 5–556× (or negative), teleporting/reversing racers. The fade must instead
  // be anchored at the trigger moment so areaBonusMult always stays in-band.
  it('does NOT blow up areaBonusMult when the progress trigger fires before elapsedMs reaches transEnd', () => {
    const ctrl = createTrajectoryController(plan);
    const racers = makeRacers();
    // transEnd = 0.75 × 60000 = 45000ms; transEndFrac = 0.75.
    // phaseProgress=0.80 fires the fade; elapsedMs=20000 is far below transEnd (leader 25000ms ahead).
    ctrl.update(racers, 20_000, 0.8);
    for (const r of racers) {
      const origBonus = plan._racerAreaBonus.get(r.index) ?? 1.0;
      // In-band: between origBonus and 1.0 (here exactly origBonus, since elapsedFade starts at 0).
      expect(Number.isFinite(r.areaBonusMult)).toBe(true);
      expect(r.areaBonusMult).toBeGreaterThanOrEqual(Math.min(1.0, origBonus) - 0.001);
      expect(r.areaBonusMult).toBeLessThanOrEqual(Math.max(1.0, origBonus) + 0.001);
      // Hard guard against the old blow-up / negative-speed regression.
      expect(r.areaBonusMult).toBeGreaterThan(0.9);
      expect(r.areaBonusMult).toBeLessThan(1.1);
    }
  });

  it('completes the fade _areaBonusFadeDuration real ms after the trigger, regardless of elapsedMs−transEnd', () => {
    const ctrl = createTrajectoryController(plan);
    const racers = makeRacers();
    // Trigger fires at elapsedMs=20000 (well before transEnd=45000): anchors _fadeStartMs=20000.
    ctrl.update(racers, 20_000, 0.8);
    // One full fade duration later in real ms → fade complete → areaBonusMult == 1.0.
    ctrl.update(racers, 20_000 + plan._areaBonusFadeDuration + 100, 0.82);
    for (const r of racers) {
      expect(r.areaBonusMult).toBeCloseTo(1.0, 5);
    }
  });
});

// ── createTrajectoryController — areaBonus phase-split (INFRA 5A shared rescale) ──
// The rescale that used to live in index.jsx (browser) and behind the sim's --areaBonus* flags now
// runs HERE, so both engines inherit one split. Shipped strengths: EARLY 1.0 / PULK 0 / POST 1.0,
// reference strength = bonusStrengthMultiplier (2.0). scale = phaseStrength / refStrength.

describe('createTrajectoryController — areaBonus phase-split', () => {
  const SPLIT_CFG = {
    bonusStrengthMultiplier: 2.0,
    phaseSplitBonusEnabled: true,
    areaBonusEarly: 1.0,
    areaBonusPulk: 0,
    areaBonusPost: 1.0,
    choreoOutcomeStart: 0.5, // reopened PULK [0.25,0.5) (the shipped world; choreography unconditional)
  };

  function makeSplitRacers() {
    return BASE_RACERS.map((r) => ({
      ...r,
      t: 0.5,
      finished: false,
      avoidanceActive: false,
      trajectoryMult: 1.0,
      trajectoryMultTarget: 1.0,
      trajectoryMultPrev: 1.0,
      trajectoryMultTransStart: 0,
      areaBonusMult: 1.0,
    }));
  }

  // Expected areaBonusMult BEFORE the transEnd fade begins: 1 + (rawBonus − 1) × scale.
  function expectSplit(plan, racers, scale) {
    for (const r of racers) {
      const raw = plan._racerAreaBonus.get(r.index) ?? 1.0;
      expect(r.areaBonusMult).toBeCloseTo(1 + (raw - 1) * scale, 6);
    }
  }

  it('EARLY (chaos) phase: scale = areaBonusEarly / refStrength = 0.5', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, SPLIT_CFG, BASE_SEED);
    const ctrl = createTrajectoryController(plan);
    const racers = makeSplitRacers();
    ctrl.update(racers, 0.1 * TARGET_DUR_MS, 0.1); // progress 0.1 < pulkStart 0.25
    expectSplit(plan, racers, 1.0 / 2.0);
  });

  it('PULK phase: areaBonusPulk = 0 → scale 0 → areaBonusMult == 1.0 for every racer', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, SPLIT_CFG, BASE_SEED);
    const ctrl = createTrajectoryController(plan);
    const racers = makeSplitRacers();
    ctrl.update(racers, 0.35 * TARGET_DUR_MS, 0.35); // 0.25 ≤ progress < 0.5
    for (const r of racers) expect(r.areaBonusMult).toBeCloseTo(1.0, 6);
  });

  // NOTE: under unconditional choreography the areaBonus is instant-cut to 1.0 from the chaos boundary
  // (pulkStart), so the POST-phase scale is never applied (POST → 1.0). The retired choreo-OFF "POST
  // pre-fade scale" + "zero-width PULK POST split" tests were removed with that world. EARLY (chaos)
  // scale + the PULK cut remain covered above.

  it('phaseSplitBonusEnabled = false → no rescale (raw controller value, byte-identical)', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { ...SPLIT_CFG, phaseSplitBonusEnabled: false },
      BASE_SEED
    );
    const ctrl = createTrajectoryController(plan);
    const racers = makeSplitRacers();
    ctrl.update(racers, 0.1 * TARGET_DUR_MS, 0.1);
    expectSplit(plan, racers, 1.0); // scale 1.0 ≡ raw untouched
  });

  it('areaBonusMult stays 1.0 for B4 racers in every phase (raw bonus already 1.0)', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, SPLIT_CFG, BASE_SEED);
    const ctrl = createTrajectoryController(plan);
    const racers = makeSplitRacers();
    ctrl.update(racers, 0.1 * TARGET_DUR_MS, 0.1);
    for (const r of racers) {
      const tr = plan._racerTargetRank.get(r.index);
      if (tr > 25 && tr <= 40) expect(r.areaBonusMult).toBeCloseTo(1.0, 6);
    }
  });
});

// ── createTrajectoryController — phase transitions ────────────────────────────

describe('createTrajectoryController — getPhase', () => {
  it('returns correct phases for all time ranges (collapse: OUTCOME begins at pulkEnd, no TRANSITION)', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { choreoOutcomeStart: 0.5 },
      BASE_SEED
    );
    const ctrl = createTrajectoryController(plan);
    const { pulkStart, pulkEnd, corrEnd } = plan._phases;

    expect(ctrl.getPhase(0)).toBe('PRE_PULK');
    expect(ctrl.getPhase(pulkStart - 1)).toBe('PRE_PULK');
    expect(ctrl.getPhase(pulkStart)).toBe('PULK');
    expect(ctrl.getPhase(pulkEnd - 1)).toBe('PULK');
    expect(ctrl.getPhase(pulkEnd)).toBe('OUTCOME'); // OUTCOME begins exactly at pulkEnd (corridorStart := pulkEnd)
    expect(ctrl.getPhase(corrEnd - 1)).toBe('OUTCOME');
    expect(ctrl.getPhase(corrEnd)).toBe('FINAL');
    expect(ctrl.getPhase(corrEnd + 10_000)).toBe('FINAL');
    // TRANSITION never appears (zero-width span).
    for (let t = 0; t <= corrEnd; t += corrEnd / 50)
      expect(ctrl.getPhase(t)).not.toBe('TRANSITION');
  });
});

// ── Phase-boundary hardening (Stage A): corridorStart >= pulkEnd, well-ordered spans ──

describe('createRacePlan — phase-boundary hardening', () => {
  it('(a) corridorStart below pulkEnd is clamped up to pulkEnd; TRANSITION not inverted', () => {
    // corridorStart=0.4 < pulkEnd=0.5 → effective corridorStart floored to 0.5.
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { corridorStart: 0.4, choreoOutcomeStart: 0.5 },
      BASE_SEED
    );
    expect(plan.phaseFractions.corridorStart).toBe(0.5); // choreography collapse: corridorStart := pulkEnd
    expect(plan.phaseFractions.pulkEnd).toBe(0.5);

    // Ordered, no inversion: PRE_PULK → PULK → (zero-span TRANSITION) → OUTCOME → FINAL.
    const ctrl = createTrajectoryController(plan);
    expect(ctrl.getPhase(0, 0.1)).toBe('PRE_PULK');
    expect(ctrl.getPhase(0, 0.3)).toBe('PULK');
    expect(ctrl.getPhase(0, 0.49)).toBe('PULK'); // still PULK just below pulkEnd
    expect(ctrl.getPhase(0, 0.5)).toBe('OUTCOME'); // OUTCOME starts exactly at pulkEnd
    expect(ctrl.getPhase(0, 0.99)).toBe('OUTCOME');
    expect(ctrl.getPhase(0, 1.0)).toBe('FINAL');
  });

  it('(b) corridorStart == pulkEnd → TRANSITION span is zero, never returned; no NaN', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { corridorStart: 0.5, choreoOutcomeStart: 0.5 },
      BASE_SEED
    );
    expect(plan.phaseFractions.corridorStart).toBe(0.5);
    // Zero-duration TRANSITION: pulkEnd and corrStart coincide in ms.
    expect(plan._phases.corrStart).toBe(plan._phases.pulkEnd);
    expect(Number.isFinite(plan._phases.corrStart)).toBe(true);

    const ctrl = createTrajectoryController(plan);
    // Sweep the fraction range: TRANSITION must never appear; OUTCOME starts at 0.5.
    for (let p = 0; p <= 1.0; p += 0.02) {
      expect(ctrl.getPhase(0, p)).not.toBe('TRANSITION');
    }
    expect(ctrl.getPhase(0, 0.49)).toBe('PULK');
    expect(ctrl.getPhase(0, 0.5)).toBe('OUTCOME');
  });

  it('(c) the choreography collapse sets corridorStart := pulkEnd, overriding any passed corridorStart', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { choreoOutcomeStart: 0.5 },
      BASE_SEED
    );
    expect(plan.phaseFractions.pulkStart).toBe(0.25);
    expect(plan.phaseFractions.pulkEnd).toBe(0.5);
    expect(plan.phaseFractions.corridorStart).toBe(0.5); // := pulkEnd (collapse)
    expect(plan.phaseFractions.corridorEnd).toBe(1.0);
    // A passed corridorStart is OVERRIDDEN by the collapse (never passed through).
    const plan2 = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { corridorStart: 0.7, choreoOutcomeStart: 0.5 },
      BASE_SEED
    );
    expect(plan2.phaseFractions.corridorStart).toBe(0.5); // collapse wins over the passed 0.7
    expect(plan2.phaseFractions.pulkEnd).toBe(0.5);
  });
});

// ── Leader-progress phase clock (C0) ──────────────────────────────────────────

describe('createTrajectoryController — leader-progress phase clock', () => {
  // Unconditional choreography (OutcomeStart 0.5): pulkStart=0.25, pulkEnd=0.5, corridorStart=0.5 (:=pulkEnd), corridorEnd=1.0.
  it('getPhase selects by fraction when phaseProgress is supplied (elapsedMs ignored)', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { choreoOutcomeStart: 0.5 },
      BASE_SEED
    );
    const ctrl = createTrajectoryController(plan);

    // elapsedMs=0 would be PRE_PULK on the legacy path; phaseProgress drives the result instead.
    expect(ctrl.getPhase(0, 0.6)).toBe('OUTCOME'); // 0.5 <= 0.6 < 1.0
    expect(ctrl.getPhase(0, 0.3)).toBe('PULK'); // 0.25 <= 0.3 < 0.5
    expect(ctrl.getPhase(0, 0.1)).toBe('PRE_PULK'); // < 0.25
    expect(ctrl.getPhase(0, 0.97)).toBe('OUTCOME'); // corridorEnd=1.0 → P-controller active until the line
    expect(ctrl.getPhase(0, 1.0)).toBe('FINAL'); // >= corridorEnd (1.0)
  });

  it('honours phase boundaries as fractions [0,1]', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { choreoOutcomeStart: 0.5 },
      BASE_SEED
    );
    const ctrl = createTrajectoryController(plan);
    // Fraction boundaries are single-sourced from the absolute ms phases.
    const pulkStart = plan._phases.pulkStart / TARGET_DUR_MS;
    const pulkEnd = plan._phases.pulkEnd / TARGET_DUR_MS;
    const corrEnd = plan._phases.corrEnd / TARGET_DUR_MS;
    expect(ctrl.getPhase(0, pulkStart - 0.001)).toBe('PRE_PULK');
    expect(ctrl.getPhase(0, pulkStart)).toBe('PULK');
    expect(ctrl.getPhase(0, pulkEnd)).toBe('OUTCOME'); // collapse: OUTCOME begins at pulkEnd (corridorStart := pulkEnd)
    expect(ctrl.getPhase(0, corrEnd)).toBe('FINAL');
  });

  it('phaseProgress=null preserves the legacy elapsedMs behaviour (open bit-identical)', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
    const ctrl = createTrajectoryController(plan);
    const { corrStart } = plan._phases;

    // Legacy path: elapsedMs against absolute ms boundaries.
    expect(ctrl.getPhase(0)).toBe('PRE_PULK');
    expect(ctrl.getPhase(0, null)).toBe('PRE_PULK');
    expect(ctrl.getPhase(corrStart)).toBe('OUTCOME');
    expect(ctrl.getPhase(corrStart, null)).toBe('OUTCOME');

    // Red-without / green-with proof: same elapsedMs=0, but a non-null fraction in OUTCOME range
    // flips the phase — confirming the new clock is actually consulted.
    expect(ctrl.getPhase(0)).toBe('PRE_PULK');
    expect(ctrl.getPhase(0, 0.6)).toBe('OUTCOME');
  });

  it('derives the fraction boundaries single-source (postStartHold reflected, ties to L126)', () => {
    // postStartHold raises pulkStart to 20000ms → fraction 20000/60000 ≈ 0.333 (not the raw 0.25).
    const holdMs = 20_000;
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { postStartHoldMs: holdMs, choreoOutcomeStart: 0.5 },
      BASE_SEED
    );
    const ctrl = createTrajectoryController(plan);
    const pulkStartFrac = plan._phases.pulkStart / TARGET_DUR_MS; // 0.333…
    expect(ctrl.getPhase(0, pulkStartFrac - 0.01)).toBe('PRE_PULK');
    expect(ctrl.getPhase(0, pulkStartFrac + 0.01)).toBe('PULK');
    // Raw 0.25 would be PULK if the boundary were not single-sourced from the ms value.
    expect(ctrl.getPhase(0, 0.3)).toBe('PRE_PULK');
  });

  it('computePulkBiasedTarget gates on phaseProgress when supplied', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { choreoOutcomeStart: 0.5 },
      BASE_SEED
    );
    const ctrl = createTrajectoryController(plan);
    const racers = makeRacers(70, 14);
    const pulkIdx = plan.pulkRacerIds[0];
    const spreadMin = 0.5;
    const spreadMax = 1.5;
    const raw = 1.0;

    // elapsedMs=0 (PRE_PULK on legacy) but phaseProgress=0.3 (PULK) → bias path is active.
    const biased = ctrl.computePulkBiasedTarget(pulkIdx, raw, spreadMin, spreadMax, racers, 0, 0.3);
    // Outside PULK (phaseProgress=0.6 = OUTCOME) → raw is returned unchanged.
    const passthrough = ctrl.computePulkBiasedTarget(
      pulkIdx,
      raw,
      spreadMin,
      spreadMax,
      racers,
      0,
      0.6
    );
    expect(passthrough).toBe(raw);
    // In PULK the function runs its bias logic (may equal raw if pulk is centred, but it executed
    // the PULK branch rather than the early return — at minimum it stays within clamp bounds).
    expect(biased).toBeGreaterThanOrEqual(spreadMin);
    expect(biased).toBeLessThanOrEqual(spreadMax);
  });
});

// ── Monotonic raceProgress (C0 game/sim loop invariant) ───────────────────────

describe('monotonic raceProgress invariant', () => {
  // Mirrors the inline update in index.jsx / sim-fairness.mjs:
  //   raceProgress = min(1, max(raceProgress, rawProgress)) — only when an unfinished leader exists.
  function step(raceProgress, leaderT, finishT) {
    const rawProgress = leaderT > -Infinity ? leaderT / finishT : 0;
    if (leaderT > -Infinity) return Math.min(1, Math.max(raceProgress, rawProgress));
    return raceProgress; // no unfinished racer → unchanged
  }

  it('never regresses when rawProgress drops (leader finishes, next leader is further back)', () => {
    const finishT = 1.0;
    let clock = 0;
    // Leader climbs to 0.9 …
    clock = step(clock, 0.3, finishT);
    expect(clock).toBeCloseTo(0.3);
    clock = step(clock, 0.9, finishT);
    expect(clock).toBeCloseTo(0.9);
    // … leader finishes; new highest unfinished racer is only at 0.6 → rawProgress falls.
    clock = step(clock, 0.6, finishT);
    expect(clock).toBeCloseTo(0.9); // held at the maximum, did NOT regress
  });

  it('clamps to 1 and leaves clock unchanged when no unfinished racer remains', () => {
    const finishT = 1.0;
    let clock = step(0.95, 1.4, finishT); // overshoot clamps to 1
    expect(clock).toBe(1);
    clock = step(clock, -Infinity, finishT); // all finished → unchanged
    expect(clock).toBe(1);
  });
});

// ── computePulkBiasedTarget ───────────────────────────────────────────────────

describe('createTrajectoryController — computePulkBiasedTarget', () => {
  let plan, ctrl, racers;

  beforeEach(() => {
    // OutcomeStart 0.5 → a real PULK window [0.25, 0.5) so the bias path is exercisable.
    plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { choreoOutcomeStart: 0.5 },
      BASE_SEED
    );
    ctrl = createTrajectoryController(plan);
    racers = BASE_RACERS.map((r) => ({ ...r, t: 0.3, finished: false }));
  });

  it('returns rawSample unchanged outside PULK phase', () => {
    const pulkId = plan.pulkRacerIds[0];
    const rawSample = 0.95;
    const prePulkMs = plan._phases.pulkStart - 1;
    const result = ctrl.computePulkBiasedTarget(pulkId, rawSample, 0.7, 1.3, racers, prePulkMs);
    expect(result).toBe(rawSample);
  });

  it('returns rawSample unchanged for non-pulk racers in PULK phase', () => {
    const nonPulkId = BASE_RACERS.find(
      (r) => !plan.pulkRacerIds.includes(r.index) && r.index !== plan.winnerRacerId
    )?.index;
    const rawSample = 0.95;
    const pulkMs = plan._phases.pulkStart + 100;
    const result = ctrl.computePulkBiasedTarget(nonPulkId, rawSample, 0.7, 1.3, racers, pulkMs);
    expect(result).toBe(rawSample);
  });

  it('biases toward center for a pulk racer behind the pulk centre', () => {
    const pulkId = plan.pulkRacerIds[0];
    const pulkMs = plan._phases.pulkStart + 100;

    // Set pulk racers: racer 0 is behind, others at 0.4
    const testRacers = racers.map((r) => ({
      ...r,
      t: plan.pulkRacerIds.includes(r.index) && r.index === pulkId ? 0.2 : 0.4,
    }));

    const rawSample = 1.0; // neutral
    const result = ctrl.computePulkBiasedTarget(pulkId, rawSample, 0.7, 1.3, testRacers, pulkMs);
    // racer is behind centre → positive tError → biased target > rawSample
    expect(result).toBeGreaterThan(rawSample);
  });

  it('result is always clamped to [spreadMin, spreadMax]', () => {
    const pulkId = plan.pulkRacerIds[0];
    const pulkMs = plan._phases.pulkStart + 100;
    const spreadMin = 0.8;
    const spreadMax = 1.2;

    // Force extreme bias by placing racer far behind
    const testRacers = racers.map((r) => ({
      ...r,
      t: plan.pulkRacerIds.includes(r.index) && r.index === pulkId ? 0.01 : 0.9,
    }));

    const result = ctrl.computePulkBiasedTarget(
      pulkId,
      0.8,
      spreadMin,
      spreadMax,
      testRacers,
      pulkMs
    );
    expect(result).toBeGreaterThanOrEqual(spreadMin);
    expect(result).toBeLessThanOrEqual(spreadMax);
  });
});

// ── collectTelemetry ──────────────────────────────────────────────────────────

describe('createTrajectoryController — collectTelemetry', () => {
  it('returns zero fractions before any updates', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
    const ctrl = createTrajectoryController(plan);
    const tel = ctrl.collectTelemetry();
    expect(tel.winnerBlockedFractionInOutcome).toBe(0);
    expect(tel.planBiasDeltaMean).toBe(0);
    expect(tel.pulkBiasEventCount).toBe(0);
    expect(tel.racersInCorridorFraction).toBe(0);
    expect(tel.corridorViolationMean).toBe(0);
    expect(tel.corridorViolationMax).toBe(0);
    expect(tel.bidirectionalBoostFraction).toBe(0);
    expect(tel.bidirectionalBrakeFraction).toBe(0);
    expect(tel.racersBlockedInOutcome).toBe(0);
  });

  it('resets counters after collection', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
    const ctrl = createTrajectoryController(plan);
    const racers = BASE_RACERS.map((r) => ({
      ...r,
      t: 0.3,
      finished: false,
      avoidanceActive: false,
    }));
    const outcomeMs = plan._phases.transEnd + 1000;

    ctrl.update(racers, outcomeMs); // accumulate some steps
    ctrl.collectTelemetry(); // collect + reset

    const tel2 = ctrl.collectTelemetry();
    expect(tel2.winnerBlockedFractionInOutcome).toBe(0);
  });
});

// ── Timing parameters: corridorStart, corridorEnd, bonusTransitionEnd ─────────

describe('createRacePlan — timing parameter defaults', () => {
  it('corridorStart := pulkEnd (choreography collapse): follows choreoOutcomeStart', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { choreoOutcomeStart: 0.5 },
      BASE_SEED
    );
    expect(plan.phaseFractions.corridorStart).toBe(0.5);
    expect(plan.phaseFractions.corridorStart).toBe(plan.phaseFractions.pulkEnd);
  });

  it('_phases.corrStart := pulkEnd × targetDurationMs (collapse)', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { choreoOutcomeStart: 0.5 },
      BASE_SEED
    );
    expect(plan._phases.corrStart).toBeCloseTo(0.5 * TARGET_DUR_MS, 0);
  });

  it('_phases.corrEnd defaults to 1.0 × targetDurationMs', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
    expect(plan._phases.corrEnd).toBeCloseTo(1.0 * TARGET_DUR_MS, 0);
  });

  it('_areaBonusFadeDuration defaults to 1500ms', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
    expect(plan._areaBonusFadeDuration).toBe(1500);
  });
});

describe('createRacePlan — top-level timing shortcuts', () => {
  // NOTE: a corridorStart config override is no longer honored — the choreography collapse sets
  // corridorStart := pulkEnd unconditionally (see the "phase collapse" + "phase-boundary hardening"
  // suites). Only corridorEnd / bonusTransitionEnd remain independent shortcuts.

  it('corridorEnd config override is stored in phaseFractions and _phases', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { corridorEnd: 0.85 },
      BASE_SEED
    );
    expect(plan.phaseFractions.corridorEnd).toBe(0.85);
    expect(plan._phases.corrEnd).toBeCloseTo(0.85 * TARGET_DUR_MS, 0);
  });

  it('bonusTransitionEnd config override updates transitionEnd in phaseFractions', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { bonusTransitionEnd: 0.5 },
      BASE_SEED
    );
    expect(plan.phaseFractions.transitionEnd).toBe(0.5);
    expect(plan._phases.transEnd).toBeCloseTo(0.5 * TARGET_DUR_MS, 0);
  });

  it('bonusFadeDuration config override is stored in _areaBonusFadeDuration', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { bonusFadeDuration: 3000 },
      BASE_SEED
    );
    expect(plan._areaBonusFadeDuration).toBe(3000);
  });

  it('corridorStart (:= pulkEnd) > corridorEnd is clamped to corridorEnd (constraint enforcement)', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { choreoOutcomeStart: 0.99, corridorEnd: 0.8 }, // collapse: corridorStart := pulkEnd 0.99 → clamp to 0.8
      BASE_SEED
    );
    expect(plan.phaseFractions.corridorStart).toBe(0.8);
    expect(plan._phases.corrStart).toBeCloseTo(0.8 * TARGET_DUR_MS, 0);
  });
});

describe('createTrajectoryController — corridorStart gates P-controller', () => {
  it('P-controller inactive just before corridorStart', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { corridorStart: 0.75 },
      BASE_SEED
    );
    const ctrl = createTrajectoryController(plan);
    const justBefore = plan._phases.corrStart - 1;

    const racers = BASE_RACERS.map((r) => ({
      ...r,
      t: r.index === plan.winnerRacerId ? 0.1 : 0.5,
      finished: false,
      avoidanceActive: false,
      trajectoryMult: 1.0,
      trajectoryMultTarget: 1.0,
      trajectoryMultPrev: 1.0,
      trajectoryMultTransStart: 0,
      areaBonusMult: 1.0,
    }));
    ctrl.update(racers, justBefore);
    // All targets must be 1.0 (no correction outside OUTCOME)
    for (const r of racers) expect(r.trajectoryMultTarget).toBe(1.0);
  });

  it('P-controller active just after corridorStart', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { corridorStart: 0.75 },
      BASE_SEED
    );
    const ctrl = createTrajectoryController(plan);
    const justAfter = plan._phases.corrStart + 1;

    // Place winner last so its target deviates from 1.0
    const racers = BASE_RACERS.map((r) => ({
      ...r,
      t: r.index === plan.winnerRacerId ? 0.01 : 0.9,
      finished: false,
      avoidanceActive: false,
      trajectoryMult: 1.0,
      trajectoryMultTarget: 1.0,
      trajectoryMultPrev: 1.0,
      trajectoryMultTransStart: 0,
      areaBonusMult: 1.0,
    }));
    ctrl.update(racers, justAfter);
    const winner = racers.find((r) => r.index === plan.winnerRacerId);
    expect(winner.trajectoryMultTarget).toBeGreaterThan(1.0); // boosted toward rank 1
  });

  it('P-controller inactive just after corridorEnd', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { corridorEnd: 0.8 },
      BASE_SEED
    );
    const ctrl = createTrajectoryController(plan);
    const afterEnd = plan._phases.corrEnd + 1;

    const racers = BASE_RACERS.map((r) => ({
      ...r,
      t: r.index === plan.winnerRacerId ? 0.01 : 0.9,
      finished: false,
      avoidanceActive: false,
      trajectoryMult: 1.0,
      trajectoryMultTarget: 1.0,
      trajectoryMultPrev: 1.0,
      trajectoryMultTransStart: 0,
      areaBonusMult: 1.0,
    }));
    ctrl.update(racers, afterEnd);
    for (const r of racers) expect(r.trajectoryMultTarget).toBe(1.0);
  });

  it('getPhase returns OUTCOME between corrStart and corrEnd', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { corridorStart: 0.7, corridorEnd: 0.9 },
      BASE_SEED
    );
    const ctrl = createTrajectoryController(plan);
    const { corrStart, corrEnd } = plan._phases;
    expect(ctrl.getPhase(corrStart)).toBe('OUTCOME');
    expect(ctrl.getPhase((corrStart + corrEnd) / 2)).toBe('OUTCOME');
    expect(ctrl.getPhase(corrEnd - 1)).toBe('OUTCOME');
    expect(ctrl.getPhase(corrEnd)).toBe('FINAL');
  });

  // NOTE: the TRANSITION phase no longer exists (choreography collapse: corridorStart := pulkEnd),
  // so the former "TRANSITION between the transEnd boundary and corrStart" test was removed with it.
});

// ── Front distance leash (SIM-ONLY gap-space brake on the runaway leader) ───────
// The leash is driven ONLY when the plan carries frontLeash config AND update() is passed the
// optional 4th arg (leader→P2 length). Tests keep phaseProgress FIXED at 0.70 so the choreo
// generator (which fires only when progress increases) never casts — isolating the pack + leash —
// and set stochasticNoise: 0 so servo targets are deterministic.
describe('createTrajectoryController — front distance leash', () => {
  const PROG = 0.7; // inside both OUTCOME and the leash window [0.60, 0.92]
  const MS = 42_000;
  const LEASH_CFG = { frontLeashMaxLengths: 2.5, frontLeashGainPct: 3, stochasticNoise: 0 };

  // Racers with a chosen leader (highest t). `demote` optionally lifts N other racers above the
  // leader (to push the leashed racer down the live order for the B1-floor test).
  function racersWithLeader(leaderIdx, demote = 0) {
    const rs = makeRacers(70, 14).map((r) => ({
      ...r,
      t: 0.3,
      trajectoryMult: 1.0,
      trajectoryMultTarget: 1.0,
      trajectoryMultPrev: 1.0,
      trajectoryMultTransStart: 0,
    }));
    rs[leaderIdx].t = 0.5; // clear leader
    for (let k = 0, put = 0; put < demote && k < rs.length; k++) {
      if (k === leaderIdx) continue;
      rs[k].t = 0.6; // above the leader → demotes the leashed racer
      put++;
    }
    return rs;
  }

  it('proportional brake scales with excess and clamps to [0.85, 1.0]', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, LEASH_CFG, BASE_SEED);
    const W = plan.winnerRacerId;
    // gap 4.0: brake = 1 − 0.03·(4.0−2.5) = 0.955
    let ctrl = createTrajectoryController(plan);
    let rs = racersWithLeader(W);
    ctrl.update(rs, MS, PROG, 4.0);
    expect(rs.find((r) => r.index === W).trajectoryMultTarget).toBeCloseTo(0.955, 6);
    // gap 7.5: brake = 1 − 0.03·5.0 = 0.85 → floor, never below
    ctrl = createTrajectoryController(plan);
    rs = racersWithLeader(W);
    ctrl.update(rs, MS, PROG, 7.5);
    const braked = rs.find((r) => r.index === W).trajectoryMultTarget;
    expect(braked).toBeCloseTo(0.85, 6);
    expect(braked).toBeGreaterThanOrEqual(0.85);
  });

  it('is exactly 1.0 (disengaged) when the gap is at/below the max', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, LEASH_CFG, BASE_SEED);
    const W = plan.winnerRacerId; // winner at rank 1 → rankError 0 → servo 1.0
    const ctrl = createTrajectoryController(plan);
    const rs = racersWithLeader(W);
    ctrl.update(rs, MS, PROG, 2.0); // 2.0 < max 2.5 → never engages
    expect(rs.find((r) => r.index === W).trajectoryMultTarget).toBe(1.0);
  });

  it('hysteresis: engages above max, holds through (max−0.5, max], releases below max−0.5; no chatter', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, LEASH_CFG, BASE_SEED);
    // A NON-winner leader so the servo target (disengaged) is distinguishable from the leash's 1.0.
    const W = plan.winnerRacerId;
    const leader = W === 0 ? 1 : 0;
    const servoTarget = (() => {
      // one-shot: read the servo-only target for `leader` at rank 1 with the leash absent
      const p = createRacePlan(
        BASE_RACERS,
        FINISH_T,
        TARGET_DUR_MS,
        { stochasticNoise: 0 },
        BASE_SEED
      );
      const c = createTrajectoryController(p);
      const rs = racersWithLeader(leader);
      c.update(rs, MS, PROG); // no 4th arg → leash off
      return rs.find((r) => r.index === leader).trajectoryMultTarget;
    })();
    expect(servoTarget).not.toBe(1.0); // non-winner ⇒ servo steers it (so 1.0 vs servo is observable)

    const ctrl = createTrajectoryController(plan);
    const rs = racersWithLeader(leader);
    ctrl.update(rs, MS, PROG, 3.0); // > max → ENGAGE
    expect(rs.find((r) => r.index === leader).trajectoryMultTarget).toBeCloseTo(1 - 0.03 * 0.5, 6);
    ctrl.update(rs, MS, PROG, 2.3); // in (max−0.5, max] → STILL engaged → leash holds at 1.0
    expect(rs.find((r) => r.index === leader).trajectoryMultTarget).toBe(1.0);
    ctrl.update(rs, MS, PROG, 1.9); // < max−0.5 → DISENGAGE → servo returns
    expect(rs.find((r) => r.index === leader).trajectoryMultTarget).toBeCloseTo(servoTarget, 6);

    // No chatter: from a FRESH (disengaged) controller a gap of 2.3 (≤ max) must NOT engage.
    const ctrl2 = createTrajectoryController(plan);
    const rs2 = racersWithLeader(leader);
    ctrl2.update(rs2, MS, PROG, 2.3);
    expect(rs2.find((r) => r.index === leader).trajectoryMultTarget).toBeCloseTo(servoTarget, 6);
  });

  it('window: inactive outside [0.60, 0.92]', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, LEASH_CFG, BASE_SEED);
    const W = plan.winnerRacerId;
    // 0.95 > 0.92 → out of window → winner (rank1) stays at natural 1.0 despite a 4.0 gap
    let ctrl = createTrajectoryController(plan);
    let rs = racersWithLeader(W);
    ctrl.update(rs, MS, 0.95, 4.0);
    expect(rs.find((r) => r.index === W).trajectoryMultTarget).toBe(1.0);
    // in-window control: same gap DOES brake
    ctrl = createTrajectoryController(plan);
    rs = racersWithLeader(W);
    ctrl.update(rs, MS, 0.7, 4.0);
    expect(rs.find((r) => r.index === W).trajectoryMultTarget).toBeCloseTo(0.955, 6);
  });

  it('B1 floor: disengages once the leashed racer falls to live rank ≥ 3, and when gap < 1.0', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, LEASH_CFG, BASE_SEED);
    const W = plan.winnerRacerId;
    // rank floor
    let ctrl = createTrajectoryController(plan);
    let rs = racersWithLeader(W);
    ctrl.update(rs, MS, PROG, 4.0); // engage, latch W (rank 1)
    expect(rs.find((r) => r.index === W).trajectoryMultTarget).toBeCloseTo(0.955, 6);
    rs = racersWithLeader(W, 2); // W now rank 3 (two racers lifted above)
    ctrl.update(rs, MS, PROG, 4.0); // leashedRank ≥ 3 → forcibly disengage
    // winner at rank 3, target rank 1 → servo BOOSTS (target > 1.0), proving the leash is off
    expect(rs.find((r) => r.index === W).trajectoryMultTarget).toBeGreaterThan(1.0);
    // gap floor
    ctrl = createTrajectoryController(plan);
    rs = racersWithLeader(W);
    ctrl.update(rs, MS, PROG, 4.0); // engage
    ctrl.update(rs, MS, PROG, 0.5); // gap < 1.0 → disengage → winner rank1 → servo 1.0
    expect(rs.find((r) => r.index === W).trajectoryMultTarget).toBe(1.0);
  });

  it('no-config path is byte-identical whether or not the 4th arg is passed', () => {
    // No frontLeash config ⇒ the leash block is skipped and the 4th arg is never read.
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { stochasticNoise: 0 },
      BASE_SEED
    );
    const W = plan.winnerRacerId;
    const cA = createTrajectoryController(plan);
    const cB = createTrajectoryController(plan);
    const rsA = racersWithLeader(W);
    const rsB = racersWithLeader(W);
    for (let f = 0; f < 3; f++) {
      cA.update(rsA, MS, PROG); // 3 args
      cB.update(rsB, MS, PROG, 9.9); // 4 args with a large gap — must be ignored
    }
    for (let i = 0; i < rsA.length; i++) {
      expect(rsB[i].trajectoryMultTarget).toBe(rsA[i].trajectoryMultTarget);
    }
  });
});

// ── Gap-cap re-roll bias (docs/CONCEPT-COHESION.md "loaded dice") ───────────────
// The transform is SIM-only (threshold null ⇒ passthrough) and PURE (deterministic, no RNG).
describe('createTrajectoryController — gap-cap re-roll bias', () => {
  const SMIN = 0.9,
    SMAX = 1.1,
    LS = 30,
    ISOPEN = true;
  // build a plan with gapReroll config + the window inputs
  function planWith(cfg = {}) {
    return createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      {
        gapRerollThresholdLengths: 2.0,
        gapRerollMode: 'symmetric',
        gapRerollStrength: 0.5,
        reRollLastPositionPercent: 95,
        reRollTransitionDuration: 3.0,
        choreoOutcomeStart: 0.6,
        stochasticNoise: 0,
        ...cfg,
      },
      BASE_SEED
    );
  }
  // a live field: `self` at t, one racer `behind` (t - gapBehindT), one `ahead` (t + gapAheadT).
  function field(selfT, gapBehindT, gapAheadT) {
    const rs = [{ index: 0, t: selfT, finished: false }];
    if (gapBehindT != null) rs.push({ index: 1, t: selfT - gapBehindT, finished: false });
    if (gapAheadT != null) rs.push({ index: 2, t: selfT + gapAheadT, finished: false });
    return rs;
  }
  // lastRollDeadlineMs defaults large (90s) so the UPPER bound never interferes unless a test sets it.
  const call = (ctrl, racers, raw, prog = 0.7, ms = 40_000, deadline = 90_000) =>
    ctrl.computeGapBiasedTarget(0, raw, SMIN, SMAX, racers, ms, prog, LS, ISOPEN, deadline);

  it('direction: a hole behind (gapBehind > G) shifts the draw SLOWER, both modes', () => {
    for (const mode of ['symmetric', 'down']) {
      const ctrl = createTrajectoryController(planWith({ gapRerollMode: mode }));
      // gapBehind = 0.1·LS = 3.0 > G 2.0 → frac = 0.5·(3−2)=0.5 → 1.0 − 0.5·(1.0−0.9)=0.95
      expect(call(ctrl, field(0.6, 0.1, null), 1.0)).toBeCloseTo(0.95, 6);
    }
  });

  it('direction: symmetric lifts a dropped racer (gapAhead > G) FASTER; down mode does NOT', () => {
    const sym = createTrajectoryController(planWith({ gapRerollMode: 'symmetric' }));
    // self dropped: gapAhead = 0.1·LS = 3.0 > G; gapBehind small (0.02·LS=0.6 ≤ G) → shift up: 1.0+0.5·(1.1−1.0)=1.05
    expect(call(sym, field(0.5, 0.02, 0.1), 1.0)).toBeCloseTo(1.05, 6);
    const down = createTrajectoryController(planWith({ gapRerollMode: 'down' }));
    expect(call(down, field(0.5, 0.02, 0.1), 1.0)).toBe(1.0); // down mode never lifts
  });

  it('dead zone: all gaps ≤ G → bit-exact passthrough', () => {
    const ctrl = createTrajectoryController(planWith());
    const raw = 1.0273; // arbitrary
    // gapBehind = 0.05·30 = 1.5 ≤ 2.0; no racer ahead → exact passthrough
    expect(call(ctrl, field(0.6, 0.05, null), raw)).toBe(raw);
  });

  it('proportionality + honest-band clamp: frac saturates to 1 → exactly the band edge, never beyond', () => {
    const ctrl = createTrajectoryController(planWith());
    // gapBehind = 0.3·30 = 9.0 → frac = min(1, 0.5·7)=1 → fully to SMIN
    const down = call(ctrl, field(0.6, 0.3, null), 1.05);
    expect(down).toBeCloseTo(SMIN, 9);
    expect(down).toBeGreaterThanOrEqual(SMIN);
    // symmetric up saturates to SMAX
    const up = call(createTrajectoryController(planWith()), field(0.4, 0.01, 0.3), 0.95);
    expect(up).toBeCloseTo(SMAX, 9);
    expect(up).toBeLessThanOrEqual(SMAX);
  });

  it('window LOWER bound derives from choreoOutcomeStart (moves when it changes)', () => {
    const big = field(0.6, 0.3, null); // gapBehind 9 → would shift hard if in-window
    const base = createTrajectoryController(planWith({ choreoOutcomeStart: 0.6 }));
    expect(call(base, big, 1.05, 0.7)).toBeLessThan(1.05); // 0.70 ≥ 0.60 → in window → biased
    expect(call(base, big, 1.05, 0.5)).toBe(1.05); // 0.50 < 0.60 → before window → passthrough
    const later = createTrajectoryController(planWith({ choreoOutcomeStart: 0.8 }));
    expect(call(later, big, 1.05, 0.7)).toBe(1.05); // now 0.70 < 0.80 → passthrough (boundary MOVED)
  });

  it('window UPPER bound = (passed lastRollDeadline − reRollTransitionDuration); moves with both', () => {
    const big = field(0.6, 0.3, null);
    const base = createTrajectoryController(planWith()); // transDur = 3000
    // deadline 57000 → windowEnd = 54000
    expect(call(base, big, 1.05, 0.7, 40_000, 57_000)).toBeLessThan(1.05); // 40s ≤ 54s → biased
    expect(call(base, big, 1.05, 0.7, 55_000, 57_000)).toBe(1.05); // 55s > 54s → passthrough
    // MOVES with the passed deadline (= reRollLastPositionPercent · realizedDur): shrink to 30000 → end 27000
    expect(call(base, big, 1.05, 0.7, 40_000, 30_000)).toBe(1.05); // 40s > 27s → passthrough
    // MOVES with reRollTransitionDuration: 10s → windowEnd = 57000 − 10000 = 47000
    const longTrans = createTrajectoryController(planWith({ reRollTransitionDuration: 10 }));
    expect(call(longTrans, big, 1.05, 0.7, 50_000, 57_000)).toBe(1.05); // 50s > 47s → passthrough
    expect(call(longTrans, big, 1.05, 0.7, 45_000, 57_000)).toBeLessThan(1.05); // 45s ≤ 47s → biased
  });

  it('REGRESSION (window basis): a realized-duration deadline > target keeps late closed-track rolls eligible', () => {
    // The bug: windowEnd derived from targetDur (60s → target-based end 54000). On closed tracks the
    // realized duration is LONGER (e.g. 90s), so lastRollDeadline = 0.95·90000 = 85500 and a roll at 55s
    // is well inside the schedule — but the OLD target-based end (54000) wrongly excluded it (0 biased
    // rolls on dirt-oval/searound). With the realized-based deadline passed in, it is eligible.
    const ctrl = createTrajectoryController(planWith()); // transDur 3000
    const big = field(0.6, 0.3, null);
    const realizedDeadline = 0.95 * 90_000; // 85500ms — closed-track realized schedule
    expect(call(ctrl, big, 1.05, 0.7, 55_000, realizedDeadline)).toBeLessThan(1.05); // eligible (fixed)
    // Same roll under a target-basis deadline (54000-ish) would be excluded — proving the basis matters:
    expect(call(ctrl, big, 1.05, 0.7, 55_000, 0.95 * 60_000)).toBe(1.05); // 55s > 54000−3000 → passthrough
  });

  it('SPEED-ROBUSTNESS: for ANY realized duration (ssf/speed shifts up & down) the window works with NO retuning', () => {
    // realizedDurationSec = targetSeconds · expectedMinSF · closedSsf — varies with speedMultiplier,
    // spread factors, and closed-track ssf. The transform is speed-agnostic: it consumes the harness's
    // realized lastRollDeadline. Across a wide realized-duration range, a roll just inside the window is
    // biased and one just outside is not — using the SAME plan config every time (no retuning).
    const ctrl = createTrajectoryController(planWith()); // transDur 3000, choreoOutcomeStart 0.6
    const big = field(0.6, 0.3, null);
    const LASTPOS = 0.95,
      TRANS = 3000;
    for (const realizedSec of [24, 30, 45, 60, 90, 132]) {
      const deadline = LASTPOS * realizedSec * 1000; // harness formula (realized basis)
      const windowEnd = deadline - TRANS;
      // a progress-eligible roll just INSIDE the window → biased
      expect(call(ctrl, big, 1.05, 0.7, windowEnd - 1, deadline)).toBeLessThan(1.05);
      // just OUTSIDE → passthrough
      expect(call(ctrl, big, 1.05, 0.7, windowEnd + 1, deadline)).toBe(1.05);
    }
  });

  it('config absent → passthrough byte-identical (no gapReroll keys)', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { stochasticNoise: 0 },
      BASE_SEED
    );
    const ctrl = createTrajectoryController(plan);
    const raw = 1.0731;
    expect(call(ctrl, field(0.6, 0.5, null), raw)).toBe(raw); // huge gap, but feature OFF → exact input
  });

  it('createRacePlan plumbs gap-reroll config + reRollTransitionDuration into the plan (browser path)', () => {
    // The browser passes threshold ONLY when enabled; disabled ⇒ null ⇒ transform passthrough.
    const on = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      {
        gapRerollThresholdLengths: 1.5,
        gapRerollMode: 'down',
        gapRerollStrength: 1.0,
        reRollTransitionDuration: 3.0,
      },
      BASE_SEED
    );
    expect(on._gapRerollThresholdLengths).toBe(1.5);
    expect(on._gapRerollMode).toBe('down');
    expect(on._gapRerollStrength).toBe(1.0);
    expect(on._reRollTransitionDurationMs).toBe(3000); // seconds→ms for the window-end derivation
    // disabled path (browser passes null): transform is a no-op regardless of gaps/window
    const off = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { gapRerollThresholdLengths: null },
      BASE_SEED
    );
    expect(off._gapRerollThresholdLengths).toBe(null);
    const ctrl = createTrajectoryController(off);
    expect(
      ctrl.computeGapBiasedTarget(
        0,
        1.05,
        0.9,
        1.1,
        [
          { index: 0, t: 0.6, finished: false },
          { index: 1, t: 0.1, finished: false },
        ],
        40_000,
        0.7,
        30,
        true,
        57_000
      )
    ).toBe(1.05);
  });

  it('determinism: same inputs → same output', () => {
    const ctrl = createTrajectoryController(planWith());
    const rs = field(0.6, 0.12, null);
    const a = call(ctrl, rs, 1.02);
    const b = call(ctrl, rs, 1.02);
    expect(b).toBe(a);
  });
});

// ── Gap-reroll BRANCH PRIORITY (C1 correctness fix) ─────────────────────────────
// When BOTH gaps exceed G the LARGER imbalance must decide the direction. The old code returned on
// gapBehind unconditionally, so a racer that had broken from the pack — a hole behind it, but still
// further behind the leader — was tilted SLOWER, structurally suppressing the chase.
describe('createTrajectoryController — gap-reroll branch priority', () => {
  const SMIN = 0.9,
    SMAX = 1.1,
    LS = 30,
    ISOPEN = true;
  function planWith(cfg = {}) {
    return createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      {
        gapRerollThresholdLengths: 2.0,
        gapRerollMode: 'symmetric',
        gapRerollStrength: 0.5,
        reRollLastPositionPercent: 95,
        reRollTransitionDuration: 3.0,
        choreoOutcomeStart: 0.6,
        stochasticNoise: 0,
        ...cfg,
      },
      BASE_SEED
    );
  }
  function field(selfT, gapBehindT, gapAheadT) {
    const rs = [{ index: 0, t: selfT, finished: false }];
    if (gapBehindT != null) rs.push({ index: 1, t: selfT - gapBehindT, finished: false });
    if (gapAheadT != null) rs.push({ index: 2, t: selfT + gapAheadT, finished: false });
    return rs;
  }
  const call = (ctrl, racers, raw, prog = 0.7, ms = 40_000, deadline = 90_000) =>
    ctrl.computeGapBiasedTarget(0, raw, SMIN, SMAX, racers, ms, prog, LS, ISOPEN, deadline);

  // THE REGRESSION: the exact case the small-G diagnostic found misdirected.
  it('both gaps > G and gapAhead LARGER → tilts FASTER (was: slower)', () => {
    const ctrl = createTrajectoryController(planWith());
    // gapBehind = 0.1·30 = 3.0 > G(2.0); gapAhead = 0.2·30 = 6.0 > G and LARGER.
    // The chaser is further off the leader than the hole it left → it must be lifted, not braked.
    // frac = min(1, 0.5·(6−2)) = 1 → full lift to spreadMax.
    expect(call(ctrl, field(0.5, 0.1, 0.2), 1.0)).toBeCloseTo(SMAX, 6);
  });

  it('both gaps > G and gapBehind LARGER → still tilts SLOWER (unchanged behaviour)', () => {
    const ctrl = createTrajectoryController(planWith());
    // gapBehind 6.0 > gapAhead 3.0 → the racer really has run away from the pack → brake.
    expect(call(ctrl, field(0.5, 0.2, 0.1), 1.0)).toBeCloseTo(SMIN, 6);
  });

  it('ties keep the old gapBehind-first behaviour (only misdirected cases change)', () => {
    const ctrl = createTrajectoryController(planWith());
    // gapBehind == gapAhead == 3.0 → down-tilt, exactly as before the fix.
    expect(call(ctrl, field(0.5, 0.1, 0.1), 1.0)).toBeCloseTo(0.95, 6);
  });

  it("'down' mode gives NO tilt when gapAhead is the larger imbalance", () => {
    const ctrl = createTrajectoryController(planWith({ gapRerollMode: 'down' }));
    // The up direction does not exist in down mode, so the correct action is to leave the chase
    // alone rather than apply the misdirected brake the old code applied.
    expect(call(ctrl, field(0.5, 0.1, 0.2), 1.0)).toBe(1.0);
  });
});

// ── contestWindowStart plumbing ────────────────────────────────────────────────
describe('createRacePlan — contestWindowStart', () => {
  it('defaults to choreoResolveB2 so pre-key callers and committed baselines are unchanged', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { choreoResolveB2: 0.83 },
      BASE_SEED
    );
    expect(plan._contestWindowStart).toBe(0.83);
  });
  it('once set it is independent of choreoResolveB2', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { choreoResolveB2: 0.83, contestWindowStart: 0.66 },
      BASE_SEED
    );
    expect(plan._contestWindowStart).toBe(0.66);
  });
});

// ── Finale front-compression (Evolution Act 2) ──────────────────────────────────
// A front-band-scoped, finale-windowed dice tilt layered on computeGapBiasedTarget. These tests drive the
// transform directly with the shipped gap-reroll made INERT (gapRerollThresholdLengths = 100, so the
// neighbour-gap branches never fire) — so any change to the returned draw is the finale overlay alone.
// lastRollDeadlineMs is passed null (the schedule cut does not apply). OFF byte-identity of the shipped
// game is separately proven by the fingerprint gate.
describe('createTrajectoryController — finale front-compression (Act 2)', () => {
  const N = 6; // ranks 1..6 → front band = 1..5, rank 6 = back band
  const racersN = makeRacers(N, N);
  const SPREAD_MIN = 0.9;
  const SPREAD_MAX = 1.1;
  const RAW = 1.0; // mid-band draw → room to tilt either way

  function buildPlan(overrides = {}) {
    return createRacePlan(
      racersN,
      FINISH_T,
      TARGET_DUR_MS,
      {
        gapRerollThresholdLengths: 100, // shipped gap-reroll inert
        gapRerollStrength: 1.0,
        gapRerollMode: 'symmetric',
        finaleFrontCompression: true,
        finaleContestWindowStart: 0.8,
        finaleContestWindowEnd: 0.9,
        finaleCatchupGateLengths: 1.0, // G_c
        finaleLeaderBleedGateLengths: 2.0, // G_b
        finaleCompressStrength: 1.0,
        ...overrides,
      },
      7
    );
  }
  const idxOfRank = (plan, rank) => [...plan._racerTargetRank].find(([, r]) => r === rank)[0];
  // Live field: place `leaderT`/`selfT` at the front, everyone else parked behind.
  function field(selfIdx, selfT, leaderIdx, leaderT) {
    return racersN.map((r) => ({
      index: r.index,
      t: r.index === selfIdx ? selfT : r.index === leaderIdx ? leaderT : 0.0,
      finished: false,
    }));
  }
  // arc-t → lengths scale 10: a t-gap of 0.10 = 1.0 length.
  const LEN = 10;
  const call = (ctrl, selfIdx, racers, progress) =>
    ctrl.computeGapBiasedTarget(
      selfIdx,
      RAW,
      SPREAD_MIN,
      SPREAD_MAX,
      racers,
      50_000,
      progress,
      LEN,
      true,
      null
    );

  it('(A) catch-up UP-tilt fires for a front-band pursuer past G_c (draws faster)', () => {
    const plan = buildPlan();
    const ctrl = createTrajectoryController(plan);
    const self = idxOfRank(plan, 2); // static front-band pursuer
    const leader = idxOfRank(plan, 1);
    // leader 0.85, self 0.70 → gap 0.15 × 10 = 1.5 lengths > G_c(1.0)
    const out = call(ctrl, self, field(self, 0.7, leader, 0.85), 0.85);
    expect(out).toBeGreaterThan(RAW);
    expect(ctrl.getFinaleTiltCounts()).toEqual({ up: 1, down: 0 });
  });

  it('(B) leader-bleed DOWN-tilt fires only when the leader gap exceeds the LARGER G_b (draws slower)', () => {
    const plan = buildPlan();
    const ctrl = createTrajectoryController(plan);
    const leader = idxOfRank(plan, 1); // static front-band member, made live leader
    // leader 0.85, P2 0.60 → gap 0.25 × 10 = 2.5 lengths > G_b(2.0)
    const out = call(ctrl, leader, field(leader, 0.85, idxOfRank(plan, 3), 0.6), 0.85);
    expect(out).toBeLessThan(RAW);
    expect(ctrl.getFinaleTiltCounts()).toEqual({ up: 0, down: 1 });
  });

  it('the leader gets NO bleed between G_c and G_b — B needs the larger gate', () => {
    const plan = buildPlan();
    const ctrl = createTrajectoryController(plan);
    const leader = idxOfRank(plan, 1);
    // leader 0.85, P2 0.70 → gap 1.5 lengths: > G_c but < G_b → no down-tilt on the leader.
    const out = call(ctrl, leader, field(leader, 0.85, idxOfRank(plan, 3), 0.7), 0.85);
    expect(out).toBe(RAW); // shipped inert + finale not armed → passthrough
    expect(ctrl.getFinaleTiltCounts()).toEqual({ up: 0, down: 0 });
  });

  it('OFF: the overlay is inert — no tilt, no counts (flag false)', () => {
    const plan = buildPlan({ finaleFrontCompression: false });
    const ctrl = createTrajectoryController(plan);
    const leader = idxOfRank(plan, 1);
    const out = call(ctrl, leader, field(leader, 0.85, idxOfRank(plan, 3), 0.6), 0.85); // wide gap
    expect(out).toBe(RAW);
    expect(ctrl.getFinaleTiltCounts()).toEqual({ up: 0, down: 0 });
  });

  it('window gate: no effect outside [windowStart, windowEnd]', () => {
    const plan = buildPlan();
    const ctrl = createTrajectoryController(plan);
    const self = idxOfRank(plan, 2);
    const leader = idxOfRank(plan, 1);
    const racers = field(self, 0.7, leader, 0.85); // would fire (A) at 1.5 lengths
    expect(call(ctrl, self, racers, 0.79)).toBe(RAW); // before the window
    expect(call(ctrl, self, racers, 0.95)).toBe(RAW); // after the window
    expect(ctrl.getFinaleTiltCounts()).toEqual({ up: 0, down: 0 });
  });

  it('front-band scope: a STATIC back-band racer is never tilted, even as the runaway leader', () => {
    const plan = buildPlan();
    const ctrl = createTrajectoryController(plan);
    const back = idxOfRank(plan, N); // static rank 6 → back band
    // Make the back-band racer the live leader with a wide P2 gap; finale must not fire.
    const out = call(ctrl, back, field(back, 0.85, idxOfRank(plan, 1), 0.6), 0.85);
    expect(out).toBe(RAW);
    expect(ctrl.getFinaleTiltCounts()).toEqual({ up: 0, down: 0 });
  });
});
