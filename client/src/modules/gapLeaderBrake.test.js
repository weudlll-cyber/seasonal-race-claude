// ============================================================
// File:        gapLeaderBrake.test.js
// Path:        client/src/modules/gapLeaderBrake.test.js
// Project:     RaceArena — GAP-BRAKE-1
//
// WHAT THIS PINS: the two properties the owner asked for by name, and nothing else.
//
//   1. IT BRAKES A RUNAWAY LEADER inside its window. Delete the brake and this file goes RED.
//   2. ★ IT DOES NOT FIRE BELOW THE ALLOWANCE. This is the owner's own July objection to a
//      rank-based brake — "a leader ten pixels clear must not be braked" — and it is the reason
//      this mechanism is gap-based at all. A brake that pulls at a small gap is a defect, not a
//      tuning question, so it is pinned as hard as the firing case.
//
// Both are asserted on the CONTROLLER, not on a whole race: the controller is where the decision is
// made, and a race-level assertion would pass or fail for a dozen reasons that have nothing to do
// with this mechanism.
// ============================================================

import { describe, it, expect } from 'vitest';
import { createRacePlan, createTrajectoryController } from './racePlanner.js';
import { DEFAULT_RACE_DYNAMICS_CONFIG } from './storage/defaults.js';

const FINISH_T = 2.0;
const TARGET_DUR_MS = 60_000;
const PATH_LENGTH_PX = 6000;
const ALLOWED_PX = DEFAULT_RACE_DYNAMICS_CONFIG.gapBrakeAllowedGapPx;

function makeRacers(count) {
  return Array.from({ length: count }, (_, i) => ({
    index: i,
    startRowIndex: Math.floor(i / 10),
    t: 0,
    finished: false,
    avoidanceActive: false,
    trajectoryMult: 1.0,
    trajectoryMultTarget: 1.0,
    baseSpeed: 0.001,
  }));
}

/**
 * A controller with the brake configured. `on` false reproduces the shipped default.
 * `corridorStart` is left to the config so the window START stays the resolved OUTCOME boundary —
 * the test never hardcodes a fraction, for the same reason the mechanism does not.
 */
function makeController({ on = true, allowedPx = ALLOWED_PX, windowEnd = 0.92 } = {}) {
  const plan = createRacePlan(
    makeRacers(40),
    FINISH_T,
    TARGET_DUR_MS,
    {
      gapBrakeEnabled: on,
      gapBrakeAllowedGapPx: allowedPx,
      gapBrakeWindowEnd: windowEnd,
      pathLengthPx: PATH_LENGTH_PX,
    },
    42
  );
  return { plan, ctrl: createTrajectoryController(plan) };
}

/**
 * Put the field on the track with a chosen leader→2nd gap, run one controller update at
 * `progress`, and report what the leader was commanded.
 *
 * The gap is set in WORLD PX and converted back to t the way the mechanism reads it
 * (t counts path lengths), so the test speaks the owner's distance, not an internal fraction.
 */
function leaderTargetAt(ctrl, plan, { gapPx, progress, ms = 40_000 }) {
  const racers = makeRacers(40);
  // A tight pack at the same t, then the leader pushed ahead by exactly `gapPx`.
  // P2 sits EXACTLY at packT and the rest trail behind it, so the leader->2nd gap is exactly
  // `gapPx` and not `gapPx` plus the pack's own spacing. (It was the spacing, not a float error,
  // that first made the "does not fire AT the allowance" case fire 0.006 px over.)
  const packT = FINISH_T * progress;
  racers[1].t = packT;
  for (const r of racers) if (r.index > 1) r.t = packT - r.index * 1e-6;
  racers[0].t = packT + gapPx / PATH_LENGTH_PX;
  ctrl.update(racers, ms, progress);
  return { leader: racers[0], racers, packT };
}

describe('GAP-BRAKE-1 — the gap-based leader brake', () => {
  it('★ BRAKES a leader whose lead is well past the allowance (remove the brake and this goes red)', () => {
    const { plan, ctrl } = makeController();
    // Three allowances clear: far past the ramp, so the command must sit at the floor.
    const { leader } = leaderTargetAt(ctrl, plan, { gapPx: ALLOWED_PX * 3, progress: 0.8 });
    expect(leader.trajectoryMultTarget).toBeLessThan(1.0);
    // The ramp saturates at twice the allowance, so at three the floor is commanded exactly.
    expect(leader.trajectoryMultTarget).toBeCloseTo(plan.controllerParams.minMult, 6);

    const stats = ctrl.getGapBrakeStats();
    expect(stats.firedFrames).toBe(1);
    expect(stats.minMultCommanded).toBeCloseTo(plan.controllerParams.minMult, 6);
  });

  it('★ DOES NOT FIRE below the allowed gap — the owner\'s "ten pixels clear" case', () => {
    const { ctrl } = makeController();
    // A tenth of the allowance: a normal close front.
    leaderTargetAt(ctrl, null, { gapPx: ALLOWED_PX * 0.1, progress: 0.8 });
    const stats = ctrl.getGapBrakeStats();
    expect(stats.windowFrames).toBe(1); // it looked
    expect(stats.firedFrames).toBe(0); // and did nothing
    expect(stats.minFiringGapPx).toBe(Infinity);
  });

  it('does not fire AT the allowance either — the allowance is allowed', () => {
    const { ctrl } = makeController();
    leaderTargetAt(ctrl, null, { gapPx: ALLOWED_PX, progress: 0.8 });
    expect(ctrl.getGapBrakeStats().firedFrames).toBe(0);
  });

  it('fires just above the allowance, and only gently there', () => {
    const { plan, ctrl } = makeController();
    const { leader } = leaderTargetAt(ctrl, plan, { gapPx: ALLOWED_PX * 1.02, progress: 0.8 });
    const stats = ctrl.getGapBrakeStats();
    expect(stats.firedFrames).toBe(1);
    expect(stats.minFiringGapPx).toBeGreaterThan(ALLOWED_PX);
    // ★ ASSERT THE BRAKE'S OWN COMMAND, not the leader's final target. The final target is
    // min(servo, brake), and this fixture's leader is far ahead of his drawn rank, so the SERVO is
    // already saturated at the floor — reading the folded value would test the servo, not this.
    // 2% past the allowance = 2% of the way down the ramp, not a step to the floor.
    expect(stats.minMultCommanded).toBeGreaterThan(plan.controllerParams.minMult);
    expect(stats.minMultCommanded).toBeLessThan(1.0);
    // and whatever the servo wanted, the written target is never ABOVE the brake's command
    expect(leader.trajectoryMultTarget).toBeLessThanOrEqual(stats.minMultCommanded + 1e-9);
  });

  it('★ NEVER fires on a gap at or below the allowance, swept across the whole window', () => {
    const { ctrl } = makeController();
    for (let p = 0.6; p <= 0.92; p += 0.01) {
      for (const frac of [0.0, 0.05, 0.25, 0.5, 0.75, 0.9, 0.99, 1.0]) {
        leaderTargetAt(ctrl, null, { gapPx: ALLOWED_PX * frac, progress: p });
      }
    }
    const stats = ctrl.getGapBrakeStats();
    expect(stats.windowFrames).toBeGreaterThan(200); // it really did look, many times
    expect(stats.firedFrames).toBe(0);
  });

  it('is silent OUTSIDE its window — before OUTCOME begins and after the window end', () => {
    const { plan, ctrl } = makeController();
    const before = plan.phaseFractions.corridorStart - 0.05;
    leaderTargetAt(ctrl, null, { gapPx: ALLOWED_PX * 5, progress: before, ms: 20_000 });
    leaderTargetAt(ctrl, null, { gapPx: ALLOWED_PX * 5, progress: 0.98, ms: 55_000 });
    const stats = ctrl.getGapBrakeStats();
    expect(stats.windowFrames).toBe(0);
    expect(stats.firedFrames).toBe(0);
  });

  it('the window START follows the OUTCOME boundary rather than a constant', () => {
    const { plan, ctrl } = makeController();
    // Same quantity the PULK brake ends at: phaseFractions.corridorStart.
    expect(ctrl.getGapBrakeStats().windowStart).toBeCloseTo(plan.phaseFractions.corridorStart, 6);
    expect(ctrl.getGapBrakeStats().windowEnd).toBe(0.92);
  });

  it('is completely inert when the switch is off — the shipped state', () => {
    const { ctrl } = makeController({ on: false });
    leaderTargetAt(ctrl, null, { gapPx: ALLOWED_PX * 10, progress: 0.8 });
    const stats = ctrl.getGapBrakeStats();
    expect(stats.enabled).toBe(false);
    expect(stats.windowFrames).toBe(0);
    expect(stats.firedFrames).toBe(0);
  });

  it('ships OFF, so a default config produces no brake at all', () => {
    expect(DEFAULT_RACE_DYNAMICS_CONFIG.gapBrakeEnabled).toBe(false);
  });
});

// ============================================================
// GAP-BRAKE-ARRIVAL-1 — the two properties that make the command actually reach the speed.
//
// ★ WHY THESE ARE ASSERTED ON THE CLOCK AND THE TARGET, NOT ON trajectoryMult. The multiplier
// itself is computed in raceCore.js:565-574 from three fields the controller writes; asserting on
// it here would mean copying that formula into the test, which is a second home for it. What the
// controller OWNS is those three fields, and arrival is exactly the property that the transition
// clock is not restarted out from under the ease while the brake is pulling.
// ============================================================

/**
 * Drive a controller with a leader who is steadily pulling away, one call per step, and record
 * what the controller wrote for him each step.
 */
function driveWideningGap(
  ctrl,
  { steps = 60, startGapPx = 0, gapPerStep = 1.0, progress = 0.8 } = {}
) {
  const racers = makeRacers(40);
  const packT = FINISH_T * progress;
  // ★ THE LEADER MUST BE THE RACER THE PLAN DREW TO WIN. The brake only binds when its command is
  // BELOW the servo's own (the Math.min at racePlanner.js:1211-1214). A leader far ahead of his
  // drawn place saturates the servo at minMult, and then the brake is silent by design and this
  // test would assert nothing. Drawn rank 1 gives rankError 0, so the servo asks for ~1.0 and the
  // brake is the binding constraint -- which is the case under test.
  const lead = racers.find((r) => ctrl.getTargetRank(r.index) === 1) ?? racers[0];
  const rest = racers.filter((r) => r.index !== lead.index);
  rest[0].t = packT;
  for (let i = 1; i < rest.length; i++) rest[i].t = packT - i * 1e-6;
  const log = [];
  for (let k = 0; k < steps; k++) {
    lead.t = packT + (startGapPx + gapPerStep * k) / PATH_LENGTH_PX;
    ctrl.update(racers, 40_000 + k * 16, progress);
    log.push({
      k,
      gapPx: (lead.t - rest[0].t) * PATH_LENGTH_PX,
      target: lead.trajectoryMultTarget,
      transStart: lead.trajectoryMultTransStart,
      fired: ctrl.getGapBrakeStats().firedFrames,
    });
  }
  return { racers, lead, log };
}

describe('GAP-BRAKE-ARRIVAL-1 — the command reaches the speed', () => {
  it('★ does NOT restart the transition while the brake is pulling (remove the fix and this goes red)', () => {
    const { ctrl } = makeController();
    // a gap that grows by 1 px per step, from well past the allowance, so the command moves every
    // step by roughly 0.15/allowance -- which is the size that used to restart the ease.
    const { log } = driveWideningGap(ctrl, {
      steps: 60,
      startGapPx: ALLOWED_PX * 1.2,
      gapPerStep: 1.0,
    });
    const pulling = log.filter((e, i) => i > 0 && e.fired > log[i - 1].fired);
    expect(pulling.length).toBeGreaterThan(40); // it really did pull, most steps

    // the target MOVED over the run -- otherwise the next assertion would be vacuous
    const targets = pulling.map((e) => e.target);
    expect(Math.max(...targets) - Math.min(...targets)).toBeGreaterThan(0.01);

    // ...and the clock did not restart while it moved.
    const starts = new Set(pulling.slice(1).map((e) => e.transStart));
    expect(starts.size).toBe(1);
  });

  it('the target tracks the commanded value once the brake is the binding constraint', () => {
    const { plan, ctrl } = makeController();
    const { log } = driveWideningGap(ctrl, {
      steps: 60,
      startGapPx: ALLOWED_PX * 1.2,
      gapPerStep: 1.0,
    });
    const last = log[log.length - 1];
    const ramp = Math.min(1, Math.max(0, (last.gapPx - ALLOWED_PX) / ALLOWED_PX));
    const commanded = 1 - (1 - plan.controllerParams.minMult) * ramp;
    expect(last.target).toBeCloseTo(commanded, 9);
  });

  it('★ NEVER writes a target above the one the same controller writes with the brake OFF', () => {
    // Two controllers, identical racer states, stepped in lockstep. The braked one may write a
    // LOWER target; it must never write a higher one. That is the whole "only ever slows" claim,
    // and it is the Math.min at racePlanner.js:1211-1214 that guarantees it.
    const on = makeController({ on: true });
    const off = makeController({ on: false });
    const A = makeRacers(40),
      B = makeRacers(40);
    const progress = 0.8;
    const packT = FINISH_T * progress;
    // same reason as above: the leader is the racer drawn to win, so the servo is not saturated
    const li = A.find((r) => on.ctrl.getTargetRank(r.index) === 1)?.index ?? 0;
    for (const set of [A, B]) {
      const rest = set.filter((r) => r.index !== li);
      rest[0].t = packT;
      for (let i = 1; i < rest.length; i++) rest[i].t = packT - i * 1e-6;
    }
    let higher = 0;
    for (let k = 0; k < 120; k++) {
      const gapPx = ALLOWED_PX * 0.5 + k * 2.0; // crosses the allowance part-way through
      A[li].t = packT + gapPx / PATH_LENGTH_PX;
      B[li].t = packT + gapPx / PATH_LENGTH_PX;
      on.ctrl.update(A, 40_000 + k * 16, progress);
      off.ctrl.update(B, 40_000 + k * 16, progress);
      if (A[li].trajectoryMultTarget > B[li].trajectoryMultTarget + 1e-12) higher++;
    }
    expect(on.ctrl.getGapBrakeStats().firedFrames).toBeGreaterThan(50); // the brake really acted
    expect(higher).toBe(0);
  });

  it('★ keeps the harder SERVO pull when the brake asks for less — the case that catches an override', () => {
    // ★ WHY THIS CASE EXISTS, AND WHY THE TEST ABOVE IS NOT ENOUGH. Replacing the Math.min at
    // racePlanner.js:1211-1214 with a plain override left the test above GREEN: its leader is the
    // racer drawn to win, so the servo asks for ~1.0 and the brake's command is always the lower of
    // the two -- min and override agree, and the mutation is invisible. The case that separates them
    // is a leader FAR AHEAD of his drawn place: the servo saturates at minMult and asks for 0.85
    // while a lead barely over the allowance asks for ~0.99. An override would hand him 0.99 and
    // make him FASTER. Verified by sabotage: this assertion goes red when the min is removed.
    const { plan, ctrl } = makeController();
    const racers = makeRacers(40);
    const progress = 0.8;
    const packT = FINISH_T * progress;
    // a racer the plan drew to finish deep in the field, put in front: rankError is hugely negative
    const deep = racers.find((r) => (ctrl.getTargetRank(r.index) ?? 0) >= 20) ?? racers[39];
    const rest = racers.filter((r) => r.index !== deep.index);
    rest[0].t = packT;
    for (let i = 1; i < rest.length; i++) rest[i].t = packT - i * 1e-6;
    // a lead just over the allowance -> the brake asks for ~0.99, well ABOVE the servo's floor
    deep.t = packT + (ALLOWED_PX * 1.05) / PATH_LENGTH_PX;
    ctrl.update(racers, 40_000, progress);
    expect(ctrl.getGapBrakeStats().firedFrames).toBe(1); // the brake did speak
    // ...and what was written is the servo's floor, not the brake's gentler number.
    expect(deep.trajectoryMultTarget).toBeCloseTo(plan.controllerParams.minMult, 9);
    expect(deep.trajectoryMultTarget).toBeLessThan(0.95);
  });
});
