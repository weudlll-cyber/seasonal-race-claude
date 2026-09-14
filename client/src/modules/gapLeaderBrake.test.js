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
