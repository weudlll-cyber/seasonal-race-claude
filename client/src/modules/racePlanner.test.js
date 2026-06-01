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
    expect(plan.phaseFractions.corridorEnd).toBe(0.95);
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

  it('_phases.corrEnd defaults to 0.95 × targetDurationMs', () => {
    const plan = createRacePlan(BASE_RACERS, FINISH_T, TARGET_DUR_MS, {}, BASE_SEED);
    expect(plan._phases.corrEnd).toBeCloseTo(0.95 * TARGET_DUR_MS, 0);
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
