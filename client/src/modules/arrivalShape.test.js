// ============================================================
// File:        client/src/modules/arrivalShape.test.js
// Project:     RaceArena
//
// ★ WHAT THIS FILE OWNS: THE arrival shape — the one the owner described on 2026-09-13, and since
//   SERVO-RANKS-1 the only one in the tree. Three properties, one per part of the shape:
//     (a) the taper reaches natural speed BEFORE he arrives, which is the whole difference from C;
//     (b) once he has arrived he is neither pushed nor braked inside his block;
//     (c) once he has arrived he is STEERED to his drawn place like any other racer — the
//         "unsteered inside his block" half was measured, costed at 3.3x the pre-shape gap, deleted.
//
// ★ WHAT IT DELIBERATELY DOES NOT DO. It does not measure whether the shape is GOOD — which distance
//   works, what the peak gap becomes, whether he still lands in his block — those are population
//   questions and they belong to the sweep, not to a unit test. It no longer compares against the
//   measurement variants A–D or the other taper distances — they were measured and deleted, and
//   those numbers live in ARRIVAL-SHAPE-E-1. It does not touch the gate, fairness, or the camera,
//   and it does not assert anything about casting: the servo's arithmetic is the subject.
// ============================================================

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  arrivalCeiling,
  ARRIVAL_CEILING_RANKS,
  ARRIVAL_CEILING_AT_PLACE,
  DEFAULT_CONTROLLER_PARAMS,
} from './racePlanner.js';

// ── (a) THE CEILING ──────────────────────────────────────────────────────────
// `arrivalCeiling(rankError, maxMult)` → HIS OWN drive ceiling that many ranks short of his place.

const { maxMult } = DEFAULT_CONTROLLER_PARAMS;

describe('arrivalCeiling — the lever that binds where the clamp did', () => {
  it('is the shipped clamp far out, and his settling ceiling at his place', () => {
    expect(arrivalCeiling(ARRIVAL_CEILING_RANKS, maxMult)).toBe(maxMult);
    expect(arrivalCeiling(99, maxMult)).toBe(maxMult);
    expect(arrivalCeiling(0, maxMult)).toBe(ARRIVAL_CEILING_AT_PLACE);
    expect(arrivalCeiling(-3, maxMult)).toBe(ARRIVAL_CEILING_AT_PLACE);
  });

  it('★ is the SAME at every field size — there is no nActive in it', () => {
    // This is the whole reason the ceiling replaced the taper. A rank-counted taper meant four
    // different things at four field sizes because the clamp discarded its reduction wherever the
    // error still saturated; a ceiling IS the commanded value wherever the raw drive saturates.
    // The function takes no field size, so this is a property of its signature, pinned.
    expect(arrivalCeiling.length).toBeLessThanOrEqual(4);
    for (const e of [0, 1, 2, 3, 4]) {
      const once = arrivalCeiling(e, maxMult);
      expect(arrivalCeiling(e, maxMult)).toBe(once); // no hidden per-call state
    }
  });

  it('★ falls monotonically as he closes, with no corner at either end', () => {
    const xs = Array.from({ length: 401 }, (_, i) => (i / 400) * ARRIVAL_CEILING_RANKS);
    const ys = xs.map((e) => arrivalCeiling(e, maxMult));
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeGreaterThanOrEqual(ys[i - 1] - 1e-12);
    // smoothstep: zero slope at both ends, so the trace has no kink where it leaves or lands
    expect(arrivalCeiling(0.01 * ARRIVAL_CEILING_RANKS, maxMult)).toBeCloseTo(
      ARRIVAL_CEILING_AT_PLACE,
      4
    );
    expect(arrivalCeiling(0.99 * ARRIVAL_CEILING_RANKS, maxMult)).toBeCloseTo(maxMult, 4);
  });

  it('★ can only ever TIGHTEN a ceiling, never raise one', () => {
    // It bounds the DRIVE. Nothing here may make any racer faster than the shipped clamp allows.
    for (const e of [-5, 0, 0.5, 1, 2, 3, 4, 10, 100]) {
      expect(arrivalCeiling(e, maxMult)).toBeLessThanOrEqual(maxMult);
      expect(arrivalCeiling(e, maxMult)).toBeGreaterThanOrEqual(
        Math.min(ARRIVAL_CEILING_AT_PLACE, maxMult)
      );
    }
  });

  it('never returns above the clamp it is given, even if asked for a looser floor', () => {
    // A caller passing a floor above the clamp must not widen it.
    expect(arrivalCeiling(0, 1.1, 4, 1.5)).toBe(1.1);
  });
});

// ── (b) + (c) THE SERVO ───────────────────────────────────────────────────────
// Driven through the real controller. The staged-comebacker state the servo reads (`_heroCurves`,
// `_heldRelease`, `_racerTargetRank`) is set on the plan directly, which is what the generator would
// otherwise have produced — the subject here is the servo's arithmetic, not the casting.

const FINISH_T = 0.6;
const TARGET_DUR_MS = 60_000;
// Field size matters to what the servo commands, because the error is divided by it: at twenty
// racers a one-rank error already saturates `maxMult`, at a hundred it does not. Tests that are
// ABOUT the clamp use 20; tests that need to read the error itself use 100, and say which.
const N_SMALL = 20;
const N_LARGE = 100;
const HERO = 0; // the staged comebacker
const DRAWN = 2; // his drawn place: 2nd, inside the top-5 block
// Past holdReleaseProgress (0.70, where his held curve ends and he is handed back) and before
// choreoReleaseProgress (0.97, where the front-contest release stops steering the whole B1 cluster).
// That window is where a comebacker used to be steered to his exact drawn rank all the way in.
const AFTER_HELD_RELEASE = 0.8;

/** Builds the field with the hero placed at `heroRank`; t descending = rank ascending. */
function fieldWithHeroAt(heroRank, n = N_SMALL) {
  const order = [];
  for (let i = 1; i < n; i++) order.push(i);
  order.splice(heroRank - 1, 0, HERO);
  const racers = Array.from({ length: n }, (_, i) => ({
    index: i,
    startRowIndex: Math.floor(i / 14),
    t: 0,
    finished: false,
    avoidanceActive: false,
    trajectoryMult: 1.0,
    trajectoryMultTarget: 1.0,
    trajectoryMultPrev: 1.0,
    trajectoryMultTransStart: 0,
    baseSpeed: 0.001,
    isHeroChoreographed: false,
  }));
  order.forEach((idx, rankIdx) => {
    racers[idx].t = 0.5 - rankIdx * 0.001;
  });
  racers[HERO].isHeroChoreographed = true;
  return racers;
}

/** A controller whose hero is a released HELD comebacker drawn at `DRAWN`. */
async function heldComebackController(n = N_SMALL) {
  // There is ONE arrival shape now, so nothing is selected — the module is imported as any other.
  const mod = await import('./racePlanner.js');
  const plan = mod.createRacePlan(fieldWithHeroAt(5, n), FINISH_T, TARGET_DUR_MS, {}, 42);
  plan._choreoGenerated = true; // the casting already happened — do not regenerate
  plan._heroCurves = new Map([[HERO, { waypoints: [] }]]);
  plan._heldRelease = new Map([[HERO, 0.7]]);
  plan._attackerParams = new Map();
  plan._racerTargetRank.set(HERO, DRAWN);
  return { mod, ctrl: mod.createTrajectoryController(plan) };
}

/** The multiplier the servo COMMANDS for the hero this frame (pre-ease). */
function commanded(racers) {
  return racers[HERO].trajectoryMultTarget;
}

describe('the arrival shape in the servo', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('★ (b) arrived and leading, he IS braked back toward his drawn place', async () => {
    // The inverse of what this file asserted until 2026-09-13. He was left unsteered inside his
    // block so he would not FEEL braked; that cost 3.3x the pre-shape gap at twenty racers and is
    // deleted. With the eased ceiling he no longer arrives fighting the brake, which is the owner's
    // reason for putting it back.
    const { ctrl } = await heldComebackController();
    let racers = fieldWithHeroAt(DRAWN); // one frame at his place latches the arrival
    ctrl.update(racers, 50_000, AFTER_HELD_RELEASE);
    racers = fieldWithHeroAt(1); // now he leads, i.e. he is AHEAD of his drawn place
    ctrl.update(racers, 50_100, AFTER_HELD_RELEASE);
    expect(commanded(racers)).toBeLessThan(1.0);
  });

  it('★ (a) his ceiling binds on the approach, and it is HIS ceiling alone', async () => {
    const { mod, ctrl } = await heldComebackController();
    const racers = fieldWithHeroAt(DRAWN + 1); // one rank short, still closing
    ctrl.update(racers, 50_000, AFTER_HELD_RELEASE);
    const ceil = mod.arrivalCeiling(1, mod.DEFAULT_CONTROLLER_PARAMS.maxMult);
    expect(ceil).toBeLessThan(mod.DEFAULT_CONTROLLER_PARAMS.maxMult);
    expect(commanded(racers)).toBeLessThanOrEqual(ceil + 1e-9);
  });

  it('★ (a) further out his ceiling is looser, so it is a schedule and not an off-switch', async () => {
    const { mod, ctrl } = await heldComebackController();
    const near = mod.arrivalCeiling(1, mod.DEFAULT_CONTROLLER_PARAMS.maxMult);
    const far = mod.arrivalCeiling(3, mod.DEFAULT_CONTROLLER_PARAMS.maxMult);
    expect(far).toBeGreaterThan(near);
    const racers = fieldWithHeroAt(DRAWN + 3);
    ctrl.update(racers, 50_000, AFTER_HELD_RELEASE);
    expect(commanded(racers)).toBeGreaterThan(1.0);
  });

  it('★ the observation records WHERE his ceiling began to bind', async () => {
    // The report's headline numbers are read off these fields, so they are pinned rather than
    // trusted: a silently-null field would read as "the ceiling never bound".
    const { ctrl } = await heldComebackController();
    for (const [i, rank] of [9, 8, 7, 6, 5, 4, 3, 2].entries()) {
      ctrl.update(fieldWithHeroAt(rank), 50_000 + i * 100, AFTER_HELD_RELEASE);
    }
    const o = ctrl.collectTelemetry().arrivalObs[0];
    // drawn 2, span 4 ⇒ the ceiling first bites below rank 6, i.e. the first frame at rank 5.
    expect(o.ceilStartRank).toBe(5);
    expect(o.ceilStartMs).toBe(50_400);
    expect(o.ceilAtArrival).toBe(1.02);
    expect(o.arrivalMs).toBe(50_700);
    expect(o.trail.map((t) => t.rank)).toEqual([9, 8, 7, 6, 5, 4, 3, 2]);
  });

  it('telemetry records the arrival', async () => {
    const e = await heldComebackController();
    let racers = fieldWithHeroAt(DRAWN + 1);
    e.ctrl.update(racers, 50_000, AFTER_HELD_RELEASE);
    racers = fieldWithHeroAt(DRAWN);
    e.ctrl.update(racers, 50_100, AFTER_HELD_RELEASE);
    racers = fieldWithHeroAt(9);
    e.ctrl.update(racers, 50_200, AFTER_HELD_RELEASE);
    const tel = e.ctrl.collectTelemetry();
    expect(tel.arrivalObs).toHaveLength(1);
    expect(tel.arrivalObs[0].drawn).toBe(DRAWN);
    expect(tel.arrivalObs[0].worstRankAfter).toBe(9);
  });
});
