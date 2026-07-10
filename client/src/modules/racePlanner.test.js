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

  it('exposes correct phase fractions (defaults)', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
    expect(plan.phaseFractions.pulkStart).toBe(0.25);
    expect(plan.phaseFractions.pulkEnd).toBe(0.5);
    expect(plan.phaseFractions.transitionEnd).toBe(0.75);
    expect(plan.phaseFractions.corridorEnd).toBe(1.0);
  });

  it('absolute phase times are derived from targetDurationMs', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
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

// ── v4 PHASE COLLAPSE (Step 5): OUTCOME begins at the chaos boundary; PULK collapsed, v4-off intact ──
describe('createRacePlan — v4 phase collapse', () => {
  it('v4-OFF: phase structure is the reactive default (pulkEnd 0.5 / corridorStart 0.55), untouched', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { directorV4Enabled: false, corridorStart: 0.55 },
      BASE_SEED
    );
    expect(plan.phaseFractions.pulkEnd).toBe(0.5);
    expect(plan.phaseFractions.corridorStart).toBe(0.55);
  });

  it('v4-ON (default outcome-start): PULK collapses — pulkEnd == corridorStart == 0.25 (OUTCOME from the chaos boundary)', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { directorV4Enabled: true, corridorStart: 0.55 }, // corridorStart shortcut is OVERRIDDEN by the v4 collapse
      BASE_SEED
    );
    expect(plan.phaseFractions.corridorStart).toBe(0.25);
    expect(plan.phaseFractions.pulkEnd).toBe(0.25);
    expect(plan.phaseFractions.pulkStart).toBe(0.25); // zero-width PULK + TRANSITION = the two-phase model
  });

  it('v4-ON honours a custom directorV4OutcomeStart (owner sweet-spot control)', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { directorV4Enabled: true, directorV4OutcomeStart: 0.35 },
      BASE_SEED
    );
    expect(plan.phaseFractions.corridorStart).toBe(0.35);
    expect(plan.phaseFractions.pulkEnd).toBe(0.35);
  });

  it('under v4 the controller reports OUTCOME already at 0.30 (steering live); v4-off is still pre-OUTCOME there', () => {
    const on = createTrajectoryController(
      createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, { directorV4Enabled: true }, BASE_SEED)
    );
    const off = createTrajectoryController(
      createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, { directorV4Enabled: false }, BASE_SEED)
    );
    // phaseProgress 0.30: v4 collapsed OUTCOME-start 0.25 → OUTCOME; reactive start 0.55 → not yet.
    expect(on.getPhase(0.3 * TARGET_DUR_MS, 0.3)).toBe('OUTCOME');
    expect(off.getPhase(0.3 * TARGET_DUR_MS, 0.3)).not.toBe('OUTCOME');
  });

  it('the earlier OUTCOME steers the pack LOOSE, not rank-locked (pack strictness < 1.0)', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { directorV4Enabled: true, directorV4PackBandStrictness: 0.5 },
      BASE_SEED
    );
    // Collapsing OUTCOME earlier must NOT exact-rank-lock the pack — heroes need weaving room (A4).
    expect(plan._v4Enabled).toBe(true);
    expect(plan._v4PackBandStrictness).toBeGreaterThan(0);
    expect(plan._v4PackBandStrictness).toBeLessThan(1.0);
  });

  it('reopenable PULK: directorV4OutcomeStart is the PULK-END control; corridorStart := pulkEnd', () => {
    // New contract: under v4, OUTCOME begins exactly where PULK ends (no TRANSITION). Raising the
    // PULK-end control (directorV4OutcomeStart) above pulkStart opens a real PULK window.
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { directorV4Enabled: true, pulkStart: 0.2, directorV4OutcomeStart: 0.5 },
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
    // TRANSITION never appears under v4 (corridorStart == pulkEnd).
    for (let p = 0; p <= 1.0; p += 0.02) expect(ctrl.getPhase(0, p)).not.toBe('TRANSITION');
  });

  it('pulkStart shortcut threads into phaseFractions and is clamp-hardened (v4-OFF)', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { pulkStart: 0.1 },
      BASE_SEED
    );
    expect(plan.phaseFractions.pulkStart).toBe(0.1);
    expect(plan.phaseFractions.pulkEnd).toBe(0.5); // reactive default preserved
    // A pulkStart past corridorEnd is anchored to [0, corridorEnd] and pulls pulkEnd/corridorStart up
    // — ordered, never inverted.
    const plan2 = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { pulkStart: 1.5 },
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

// ── createTrajectoryController — v4 areaBonus instant cut (Stage 1, C-2) ──────

describe('createTrajectoryController — v4 areaBonus instant cut', () => {
  function v4Racers() {
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
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { directorV4Enabled: true },
      BASE_SEED
    );
    const racers = v4Racers();
    createTrajectoryController(plan).update(racers, 1000, fracOf(plan) - 0.05);
    for (const r of racers)
      expect(r.areaBonusMult).toBeCloseTo(plan._racerAreaBonus.get(r.index) ?? 1.0, 5);
  });

  it('INSTANT-cuts areaBonus to 1.0 for EVERY racer from the chaos boundary (no fade)', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { directorV4Enabled: true },
      BASE_SEED
    );
    const racers = v4Racers();
    const p = fracOf(plan) + 0.01;
    createTrajectoryController(plan).update(racers, TARGET_DUR_MS * p, p);
    for (const r of racers) expect(r.areaBonusMult).toBeCloseTo(1.0, 5);
  });

  it('spoiler switch suppresses the B1-target pool bonus during chaos (default off keeps it)', () => {
    const on = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { directorV4Enabled: true, directorV4SuppressChaosBonusB1: true },
      BASE_SEED
    );
    const off = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { directorV4Enabled: true },
      BASE_SEED
    );
    const rOn = v4Racers();
    const rOff = v4Racers();
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

  it('sets full areaBonusMult in TRANSITION phase', () => {
    const ctrl = createTrajectoryController(plan);
    const racers = makeRacers();
    ctrl.update(racers, plan._phases.transEnd - 1000); // just before OUTCOME
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

  it('POST phase (pre-fade): scale = areaBonusPost / refStrength = 0.5', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, SPLIT_CFG, BASE_SEED);
    const ctrl = createTrajectoryController(plan);
    const racers = makeSplitRacers();
    ctrl.update(racers, 0.6 * TARGET_DUR_MS, 0.6); // 0.5 ≤ progress < transEnd 0.75 → no fade yet
    expectSplit(plan, racers, 1.0 / 2.0);
  });

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

  it('zero-width PULK (pulkStart == pulkEnd): clean EARLY/POST split, no NaN', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { ...SPLIT_CFG, phaseFractions: { pulkStart: 0.25, pulkEnd: 0.25 } },
      BASE_SEED
    );
    const ctrl = createTrajectoryController(plan);
    // Below the collapsed boundary → EARLY.
    const early = makeSplitRacers();
    ctrl.update(early, 0.1 * TARGET_DUR_MS, 0.1);
    expectSplit(plan, early, 1.0 / 2.0);
    // At/above the boundary → POST (PULK window is empty), finite, correct scale.
    const post = makeSplitRacers();
    ctrl.update(post, 0.6 * TARGET_DUR_MS, 0.6);
    for (const r of post) expect(Number.isFinite(r.areaBonusMult)).toBe(true);
    expectSplit(plan, post, 1.0 / 2.0);
  });
});

// ── createTrajectoryController — phase transitions ────────────────────────────

describe('createTrajectoryController — getPhase', () => {
  it('returns correct phases for all time ranges (default: corrStart=0.55 < transEnd=0.75)', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
    const ctrl = createTrajectoryController(plan);
    const { pulkStart, pulkEnd, corrStart, corrEnd } = plan._phases;

    expect(ctrl.getPhase(0)).toBe('PRE_PULK');
    expect(ctrl.getPhase(pulkStart - 1)).toBe('PRE_PULK');
    expect(ctrl.getPhase(pulkStart)).toBe('PULK');
    expect(ctrl.getPhase(pulkEnd - 1)).toBe('PULK');
    expect(ctrl.getPhase(pulkEnd)).toBe('TRANSITION');
    expect(ctrl.getPhase(corrStart - 1)).toBe('TRANSITION');
    expect(ctrl.getPhase(corrStart)).toBe('OUTCOME');
    expect(ctrl.getPhase(corrEnd - 1)).toBe('OUTCOME');
    expect(ctrl.getPhase(corrEnd)).toBe('FINAL');
    expect(ctrl.getPhase(corrEnd + 10_000)).toBe('FINAL');
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
      { corridorStart: 0.4 },
      BASE_SEED
    );
    expect(plan.phaseFractions.corridorStart).toBe(0.5); // clamped up to pulkEnd
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
      { corridorStart: 0.5 },
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

  it('(c) well-ordered config is unchanged (regression guard: default fractions byte-identical)', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
    expect(plan.phaseFractions.pulkStart).toBe(0.25);
    expect(plan.phaseFractions.pulkEnd).toBe(0.5);
    expect(plan.phaseFractions.corridorStart).toBe(0.55);
    expect(plan.phaseFractions.corridorEnd).toBe(1.0);
    // A well-ordered non-default corridorStart passes through untouched.
    const plan2 = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { corridorStart: 0.7 },
      BASE_SEED
    );
    expect(plan2.phaseFractions.corridorStart).toBe(0.7);
    expect(plan2.phaseFractions.pulkEnd).toBe(0.5);
  });
});

// ── Leader-progress phase clock (C0) ──────────────────────────────────────────

describe('createTrajectoryController — leader-progress phase clock', () => {
  // Defaults: pulkStart=0.25, pulkEnd=0.5, corridorStart=0.55, corridorEnd=1.0.
  it('getPhase selects by fraction when phaseProgress is supplied (elapsedMs ignored)', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
    const ctrl = createTrajectoryController(plan);

    // elapsedMs=0 would be PRE_PULK on the legacy path; phaseProgress drives the result instead.
    expect(ctrl.getPhase(0, 0.6)).toBe('OUTCOME'); // 0.55 <= 0.6 < 1.0
    expect(ctrl.getPhase(0, 0.3)).toBe('PULK'); // 0.25 <= 0.3 < 0.5
    expect(ctrl.getPhase(0, 0.1)).toBe('PRE_PULK'); // < 0.25
    expect(ctrl.getPhase(0, 0.97)).toBe('OUTCOME'); // corridorEnd=1.0 → P-controller active until the line
    expect(ctrl.getPhase(0, 1.0)).toBe('FINAL'); // >= corridorEnd (1.0)
  });

  it('honours phase boundaries as fractions [0,1]', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
    const ctrl = createTrajectoryController(plan);
    // Fraction boundaries are single-sourced from the absolute ms phases.
    const pulkStart = plan._phases.pulkStart / TARGET_DUR_MS;
    const pulkEnd = plan._phases.pulkEnd / TARGET_DUR_MS;
    const corrStart = plan._phases.corrStart / TARGET_DUR_MS;
    const corrEnd = plan._phases.corrEnd / TARGET_DUR_MS;
    expect(ctrl.getPhase(0, pulkStart - 0.001)).toBe('PRE_PULK');
    expect(ctrl.getPhase(0, pulkStart)).toBe('PULK');
    expect(ctrl.getPhase(0, pulkEnd)).toBe('TRANSITION');
    expect(ctrl.getPhase(0, corrStart)).toBe('OUTCOME');
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
      { postStartHoldMs: holdMs },
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
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
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
    plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
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
  it('corridorStart defaults to 0.55 in phaseFractions', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
    expect(plan.phaseFractions.corridorStart).toBe(0.55);
  });

  it('_phases.corrStart defaults to 0.55 × targetDurationMs', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
    expect(plan._phases.corrStart).toBeCloseTo(0.55 * TARGET_DUR_MS, 0);
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
  it('corridorStart config override is stored in phaseFractions', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { corridorStart: 0.75 },
      BASE_SEED
    );
    expect(plan.phaseFractions.corridorStart).toBe(0.75);
    expect(plan._phases.corrStart).toBeCloseTo(0.75 * TARGET_DUR_MS, 0);
  });

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

  it('bonusTransitionEnd and corridorStart can differ independently', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { bonusTransitionEnd: 0.5, corridorStart: 0.75 },
      BASE_SEED
    );
    expect(plan._phases.transEnd).toBeCloseTo(0.5 * TARGET_DUR_MS, 0);
    expect(plan._phases.corrStart).toBeCloseTo(0.75 * TARGET_DUR_MS, 0);
  });

  it('corridorStart > corridorEnd is clamped to corridorEnd (constraint enforcement)', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { corridorStart: 0.99, corridorEnd: 0.8 },
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

  it('getPhase returns TRANSITION between corrStart boundary and corrStart', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { corridorStart: 0.7 },
      BASE_SEED
    );
    const ctrl = createTrajectoryController(plan);
    const { corrStart } = plan._phases;
    expect(ctrl.getPhase(corrStart - 1)).toBe('TRANSITION');
  });
});

describe('createTrajectoryController — bonusTransitionEnd independent from corridorStart', () => {
  it('areaBonusMult fades at transEnd even when corridorStart is later', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { bonusTransitionEnd: 0.5, corridorStart: 0.75 },
      BASE_SEED
    );
    const ctrl = createTrajectoryController(plan);

    const racers = BASE_RACERS.map((r) => ({
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

    // Just before bonusTransitionEnd (50%) → full bonus
    ctrl.update(racers, plan._phases.transEnd - 100);
    for (const r of racers) {
      const expected = plan._racerAreaBonus.get(r.index) ?? 1.0;
      expect(r.areaBonusMult).toBeCloseTo(expected, 4);
    }

    // After full fade (transEnd + fadeDuration) → 1.0
    ctrl.update(racers, plan._phases.transEnd + plan._areaBonusFadeDuration + 100);
    for (const r of racers) expect(r.areaBonusMult).toBeCloseTo(1.0, 4);
  });

  it('areaBonusMult still full between bonusTransitionEnd (50%) and corridorStart (75%)', () => {
    const plan = createRacePlan(
      BASE_RACERS,
      FINISH_T,
      TARGET_DUR_MS,
      { bonusTransitionEnd: 0.5, corridorStart: 0.75 },
      BASE_SEED
    );
    const ctrl = createTrajectoryController(plan);

    const racers = BASE_RACERS.map((r) => ({
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

    // In the gap zone (60% = between 50% fade-done and 75% corrStart) → bonus faded, P-ctrl off
    const midGap = plan._phases.transEnd + plan._areaBonusFadeDuration + 1000;
    ctrl.update(racers, midGap);
    // areaBonusMult should be 1.0 (fully faded)
    for (const r of racers) expect(r.areaBonusMult).toBeCloseTo(1.0, 4);
    // trajectoryMultTarget should be 1.0 (P-ctrl not yet active)
    for (const r of racers) expect(r.trajectoryMultTarget).toBe(1.0);
  });
});
