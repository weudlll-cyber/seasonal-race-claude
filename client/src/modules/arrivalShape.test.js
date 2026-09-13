// ============================================================
// File:        client/src/modules/arrivalShape.test.js
// Project:     RaceArena
//
// ★ WHAT THIS FILE OWNS: THE arrival shape — the one the owner described on 2026-09-13, and since
//   SERVO-RANKS-1 the only one in the tree. Three properties, one per part of the shape:
//     (a) the taper reaches natural speed BEFORE he arrives, which is the whole difference from C;
//     (b) once he has arrived he is neither pushed nor braked inside his block;
//     (c) the net is band steering, it corrects him only OUTSIDE the block, and it NEVER fires while
//         he is ahead of it — a racer drawn 2nd who is leading the race is fair and is left alone.
//
// ★ WHAT IT DELIBERATELY DOES NOT DO. It does not measure whether the shape is GOOD — which distance
//   works, what the peak gap becomes, whether he still lands in his block — those are population
//   questions and they belong to the sweep, not to a unit test. It no longer compares against the
//   measurement variants A–D or the other taper distances — they were measured and deleted, and
//   those numbers live in ARRIVAL-SHAPE-E-1. It does not touch the gate, fairness, or the camera,
//   and it does not assert anything about casting: the servo's arithmetic is the subject.
// ============================================================

import { describe, it, expect, afterEach, vi } from 'vitest';
import { approachDrive, ARRIVAL_TAPER_START_RANKS } from './racePlanner.js';

// ── (a) THE TAPER ─────────────────────────────────────────────────────────────
// `approachDrive(rankError, startRanks)` → the fraction of the drive still commanded.

describe('approachDrive — the taper reaches natural speed before he arrives', () => {
  it('is untouched outside the taper and full drive at the moment it starts', () => {
    expect(approachDrive(9, 2)).toBe(1);
    expect(approachDrive(3, 2)).toBe(1);
    expect(approachDrive(2, 2)).toBe(1); // two ranks out: he BEGINS to slow here, not before
  });

  it('★ is exactly zero a whole rank BEFORE his place, at the distance the owner named', () => {
    // This is the property the shape exists for: the drive is off while he still has a rank to
    // cover, so the multiplier he carries across his place is 1.0 and he is not still accelerating.
    expect(approachDrive(1, 2)).toBe(0);
    expect(approachDrive(0.5, 2)).toBe(0);
    expect(approachDrive(0, 2)).toBe(0);
  });

  it('★ the shipped distance is the one the sweep chose, and it eases over its whole span', () => {
    // The distance is not a free parameter any more: 2 000 races chose it. Pinned so a later edit
    // to the constant is a deliberate act with a number to beat, not a quiet drift.
    expect(ARRIVAL_TAPER_START_RANKS).toBe(4);
    // full drive at the span's edge, no drive one rank short — the span, end to end
    expect(approachDrive(ARRIVAL_TAPER_START_RANKS, ARRIVAL_TAPER_START_RANKS)).toBe(1);
    expect(approachDrive(1, ARRIVAL_TAPER_START_RANKS)).toBe(0);
  });

  it('eases — neither a step nor a straight line — and never leaves [0,1]', () => {
    const xs = Array.from({ length: 401 }, (_, i) => i / 100); // 0 … 4
    const ys = xs.map((e) => approachDrive(e, 2));
    for (const y of ys) {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    }
    // Monotone non-decreasing: closing the gap never hands him MORE drive.
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeGreaterThanOrEqual(ys[i - 1] - 1e-12);
    // smoothstep, not linear — at the span's midpoint a straight line would read 0.5 as well, so
    // the shape is pinned at the ends instead: zero slope at both, i.e. no corner in the trace.
    expect(approachDrive(1.01, 2)).toBeLessThan(0.001);
    expect(approachDrive(1.99, 2)).toBeGreaterThan(0.999);
    expect(approachDrive(1.5, 2)).toBeCloseTo(0.5, 6);
  });

  it('his own fallback order falls out of the one parameter', () => {
    // ONE rank: the drive reaches zero only AT his place ("if two ranks is too early").
    expect(approachDrive(1, 1)).toBe(1);
    expect(approachDrive(0.5, 1)).toBeCloseTo(0.5, 6);
    expect(approachDrive(0, 1)).toBe(0);
    // ZERO ranks: no taper at all — full drive until he arrives. Identical to B by construction.
    expect(approachDrive(5, 0)).toBe(1);
    expect(approachDrive(1, 0)).toBe(1);
    expect(approachDrive(0.001, 0)).toBe(1);
  });

  it('never reverses a drive and never amplifies one', () => {
    // A negative error means he is PAST his place — that is (b)'s business, not the taper's, and the
    // servo only ever calls this with a positive error. Whatever it is asked, it returns a factor.
    for (const d of [0, 1, 2, 3]) {
      for (const e of [-5, -1, -0.1, 0, 0.1, 1, 2, 7]) {
        const f = approachDrive(e, d);
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThanOrEqual(1);
      }
    }
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

  it('★ (b) arrived and leading, he is not braked — drawn 2nd, winning, left alone', async () => {
    const { ctrl } = await heldComebackController();
    let racers = fieldWithHeroAt(DRAWN); // one frame at his place latches the arrival
    ctrl.update(racers, 50_000, AFTER_HELD_RELEASE);
    racers = fieldWithHeroAt(1); // now he takes the lead. The owner: that is FAIR.
    ctrl.update(racers, 50_100, AFTER_HELD_RELEASE);
    expect(commanded(racers)).toBe(1.0);
  });

  it('★ (c) the net does nothing anywhere inside his block', async () => {
    const { ctrl } = await heldComebackController();
    let racers = fieldWithHeroAt(DRAWN);
    ctrl.update(racers, 50_000, AFTER_HELD_RELEASE);
    for (const rank of [1, 2, 3, 4, 5]) {
      racers = fieldWithHeroAt(rank);
      ctrl.update(racers, 50_000 + rank, AFTER_HELD_RELEASE);
      expect(commanded(racers)).toBe(1.0);
    }
  });

  it('★ (c) it catches him once he falls OUT of his block, and lets go again by itself', async () => {
    const { ctrl } = await heldComebackController();
    let racers = fieldWithHeroAt(DRAWN);
    ctrl.update(racers, 50_000, AFTER_HELD_RELEASE);
    racers = fieldWithHeroAt(9); // past the B1 edge of 5 → pushed forward
    ctrl.update(racers, 50_100, AFTER_HELD_RELEASE);
    expect(commanded(racers)).toBeGreaterThan(1.0);
    racers = fieldWithHeroAt(4); // back inside → the correction stops; nothing has to release it
    ctrl.update(racers, 50_200, AFTER_HELD_RELEASE);
    expect(commanded(racers)).toBe(1.0);
  });

  it('★ (c) the correction aims at the block EDGE, not at his drawn rank', async () => {
    // At rank 9, drawn 2nd: steering to the exact rank would be an error of 7; band steering is an
    // error of 4 (9 − the edge at 5). That distinction IS "unsteered inside the block".
    // A HUNDRED racers, deliberately: at twenty, both errors saturate `maxMult` and the two rules
    // are indistinguishable at the output — the clamp would hide exactly what is under test.
    const { mod, ctrl } = await heldComebackController(N_LARGE);
    let racers = fieldWithHeroAt(DRAWN, N_LARGE);
    ctrl.update(racers, 50_000, AFTER_HELD_RELEASE);
    racers = fieldWithHeroAt(9, N_LARGE);
    ctrl.update(racers, 50_100, AFTER_HELD_RELEASE);
    const { gain, maxMult } = mod.DEFAULT_CONTROLLER_PARAMS;
    expect(commanded(racers)).toBeCloseTo(1.0 + (gain * 4) / N_LARGE, 2);
    // ...and it is NOT exact-rank steering, which at an error of 7 would have hit the ceiling.
    expect(commanded(racers)).toBeLessThan(maxMult - 0.01);
  });

  it('★ (a) he is at natural speed by the time he reaches his place', async () => {
    const { ctrl } = await heldComebackController();
    const racers = fieldWithHeroAt(DRAWN + 1); // one rank short, still closing
    ctrl.update(racers, 50_000, AFTER_HELD_RELEASE);
    expect(commanded(racers)).toBe(1.0);
  });

  it('★ (a) two ranks out he is still driving — it is a taper, not an off-switch', async () => {
    const { ctrl } = await heldComebackController();
    const racers = fieldWithHeroAt(DRAWN + 2);
    ctrl.update(racers, 50_000, AFTER_HELD_RELEASE);
    expect(commanded(racers)).toBeGreaterThan(1.0);
  });

  it('★ the observation records WHERE the taper began and the approach it measured', async () => {
    // The report's headline numbers are read off these fields, so they are pinned rather than
    // trusted: the taper-start rank, the approach trail, and the arrival time they are measured
    // against. Without this, a silently-null field would read as "the taper never fired".
    const { ctrl } = await heldComebackController();
    // Walk him in from outside the taper span to his place, one rank per frame.
    for (const [i, rank] of [9, 8, 7, 6, 5, 4, 3, 2].entries()) {
      ctrl.update(fieldWithHeroAt(rank), 50_000 + i * 100, AFTER_HELD_RELEASE);
    }
    const o = ctrl.collectTelemetry().arrivalObs[0];
    // 4 ranks + drawn 2 ⇒ the drive first eases at rank 6 (a rank error of 4 is the span's edge, where
    // the factor is still 1; the first REDUCED frame is rank 5). Recorded, not assumed.
    expect(o.taperStartRank).toBe(5);
    expect(o.taperStartMs).toBe(50_400);
    expect(o.arrivalMs).toBe(50_700); // the frame he first reached rank 2
    // The trail carries one entry per rank change, oldest first, so "where was he one second before
    // he arrived" is answerable exactly.
    expect(o.trail.map((t) => t.rank)).toEqual([9, 8, 7, 6, 5, 4, 3, 2]);
    expect(o.trail[0].ms).toBe(50_000);
  });

  it('telemetry counts the taper and the net, and stays silent under A', async () => {
    const e = await heldComebackController();
    let racers = fieldWithHeroAt(DRAWN + 1);
    e.ctrl.update(racers, 50_000, AFTER_HELD_RELEASE);
    racers = fieldWithHeroAt(DRAWN);
    e.ctrl.update(racers, 50_100, AFTER_HELD_RELEASE);
    racers = fieldWithHeroAt(9);
    e.ctrl.update(racers, 50_200, AFTER_HELD_RELEASE);
    const tel = e.ctrl.collectTelemetry();
    expect(tel.eTaperFrames).toBeGreaterThan(0);
    expect(tel.eFreeFrames).toBeGreaterThan(0);
    expect(tel.eNetFrames).toBe(1);
    expect(tel.eArrivalMults).toHaveLength(1);
    expect(tel.eArrivalMults[0]).toBe(1.0); // ★ the pace he carried across his place
    // The observation row is what the arm-vs-arm table is built from.
    expect(tel.arrivalObs).toHaveLength(1);
    expect(tel.arrivalObs[0].arrivalMult).toBe(1.0);
    expect(tel.arrivalObs[0].worstRankAfter).toBe(9); // the drift the net is there to bound

    // The observation is recorded for every held comebacker — there is no arm to be silent under
    // any more, and a telemetry block with nothing to say would have no baseline to offer.
    expect(tel.arrivalObs[0].drawn).toBe(DRAWN);
  });
});
