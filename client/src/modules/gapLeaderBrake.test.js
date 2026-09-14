// ============================================================
// File:        gapLeaderBrake.test.js
// Path:        client/src/modules/gapLeaderBrake.test.js
// Project:     RaceArena — GAP-BRAKE-1 / GAP-BRAKE-ARRIVAL-1 / GAP-BRAKE-RATE-1
//
// WHAT THIS PINS: the properties the owner asked for by name, and nothing else.
//
//   1. THE GATE IS A SIZE. Below the allowance the brake does not engage — the owner's own July
//      objection to a rank-based brake, "a leader ten pixels clear must not be braked", and the
//      reason this mechanism is gap-based at all.
//   2. ★ THE STRENGTH IS A CHANGE. It RISES while the gap grows and FALLS while it shrinks, and on
//      a shrinking gap it FADES rather than switching off — it is still pulling when the gap comes
//      back past the allowance, and reaches zero only once the gap is gone.
//   3. THE CEILING IS HIS 10%, and nothing here can ever raise a speed.
//   4. The command REACHES the speed: the transition clock is not restarted under the ease.
//
// ★ THE FIXTURE HAZARD, WRITTEN DOWN BECAUSE IT ALREADY BIT ONCE. An earlier test in this file
// stayed GREEN under sabotage because its leader was the racer the plan drew to WIN: the servo then
// asks for ~1.0, the brake's command is always the lower of the two, and `Math.min` and a plain
// override are indistinguishable. Every assertion below therefore says which case it needs —
// `drawnWinnerLeader` when the brake must be the binding constraint, `deepFieldLeader` when the
// servo must be saturated so that the two folds disagree — and the sabotage that each one catches
// is named in its own comment.
// ============================================================

import { describe, it, expect } from 'vitest';
import { createRacePlan, createTrajectoryController } from './racePlanner.js';
import { DEFAULT_RACE_DYNAMICS_CONFIG } from './storage/defaults.js';

const FINISH_T = 2.0;
const TARGET_DUR_MS = 60_000;
const PATH_LENGTH_PX = 6000;
const ALLOWED_PX = DEFAULT_RACE_DYNAMICS_CONFIG.gapBrakeAllowedGapPx;
const CEILING = DEFAULT_RACE_DYNAMICS_CONFIG.gapBrakeMaxAuthority;
const WINDOW_END = DEFAULT_RACE_DYNAMICS_CONFIG.gapBrakeWindowEnd;
const STEP_MS = 16; // the engine's fixed physics step (raceCore FIXED_DT)

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
function makeController({
  on = true,
  allowedPx = ALLOWED_PX,
  windowEnd = WINDOW_END,
  ceiling = CEILING,
} = {}) {
  const plan = createRacePlan(
    makeRacers(40),
    FINISH_T,
    TARGET_DUR_MS,
    {
      gapBrakeEnabled: on,
      gapBrakeAllowedGapPx: allowedPx,
      gapBrakeWindowEnd: windowEnd,
      gapBrakeMaxAuthority: ceiling,
      pathLengthPx: PATH_LENGTH_PX,
    },
    42
  );
  return { plan, ctrl: createTrajectoryController(plan) };
}

/**
 * Put the field on the track with a chosen leader→2nd gap, run ONE controller update at
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

/**
 * Lay out the field for a multi-step drive and hand back the racer who will lead.
 *
 * `role` decides WHICH hazard the fixture is built against:
 *   - 'drawnWinner' — the leader is the racer the plan drew to finish FIRST, so his servo asks for
 *     ~1.0 and THE BRAKE IS THE BINDING CONSTRAINT. Required by every assertion about the brake's
 *     own strength; without it the servo's floor would be what is read.
 *   - 'deepField' — the leader is a racer drawn to finish deep, so his servo is SATURATED at
 *     `minMult`. Required by the assertions that separate `Math.min` from a plain override.
 */
function layOutField(ctrl, progress, role = 'drawnWinner') {
  const racers = makeRacers(40);
  const packT = FINISH_T * progress;
  const lead =
    role === 'deepField'
      ? (racers.find((r) => (ctrl.getTargetRank(r.index) ?? 0) >= 20) ?? racers[39])
      : (racers.find((r) => ctrl.getTargetRank(r.index) === 1) ?? racers[0]);
  const rest = racers.filter((r) => r.index !== lead.index);
  rest[0].t = packT;
  for (let i = 1; i < rest.length; i++) rest[i].t = packT - i * 1e-6;
  return { racers, lead, second: rest[0], packT };
}

/**
 * Drive the controller one step per entry of `gapProfile` (world px, leader→2nd) and record what
 * the brake did each step. One place that steps the clock, so no test invents its own cadence.
 */
function driveGapProfile(ctrl, gapProfile, { progress = 0.8, role = 'drawnWinner' } = {}) {
  const { racers, lead, packT } = layOutField(ctrl, progress, role);
  const log = [];
  for (let k = 0; k < gapProfile.length; k++) {
    lead.t = packT + gapProfile[k] / PATH_LENGTH_PX;
    ctrl.update(racers, 40_000 + k * STEP_MS, progress);
    const st = ctrl.getGapBrakeStats();
    log.push({
      k,
      gapPx: gapProfile[k],
      engaged: st.engaged,
      strength: st.strength,
      dGapPx: st.dGapPx,
      fired: st.firedFrames,
      target: lead.trajectoryMultTarget,
      transStart: lead.trajectoryMultTransStart,
    });
  }
  return { racers, lead, log, stats: ctrl.getGapBrakeStats() };
}

/** A gap that climbs from `from` to `to` over `steps`, then falls back to `end` over `fall`. */
function growThenShrink({ from = 0, to = 260, steps = 240, end = 0, fall = 480 } = {}) {
  const p = [];
  for (let k = 0; k < steps; k++) p.push(from + ((to - from) * k) / steps);
  for (let k = 0; k <= fall; k++) p.push(to + ((end - to) * k) / fall);
  return p;
}

describe('GAP-BRAKE-1 — the gate is a SIZE, and it is unchanged', () => {
  it('★ DOES NOT ENGAGE below the allowed gap — the owner\'s "ten pixels clear" case', () => {
    const { ctrl } = makeController();
    leaderTargetAt(ctrl, null, { gapPx: ALLOWED_PX * 0.1, progress: 0.8 });
    const stats = ctrl.getGapBrakeStats();
    expect(stats.windowFrames).toBe(1); // it looked
    expect(stats.firedFrames).toBe(0); // and did nothing
    expect(stats.engaged).toBe(false);
    expect(stats.minEngageGapPx).toBe(Infinity);
  });

  it('does not engage AT the allowance either — the allowance is allowed', () => {
    const { ctrl } = makeController();
    leaderTargetAt(ctrl, null, { gapPx: ALLOWED_PX, progress: 0.8 });
    expect(ctrl.getGapBrakeStats().firedFrames).toBe(0);
    expect(ctrl.getGapBrakeStats().engaged).toBe(false);
  });

  it('★ NEVER ENGAGES on a gap at or below the allowance, swept across the whole window', () => {
    // ★ SABOTAGE THIS CATCHES: relaxing the gate to `>=`, or moving it onto the SMOOTHED gap (which
    // lags, and would let a falling gap engage below the allowance). Both go red here.
    const { ctrl } = makeController();
    for (let p = 0.6; p <= WINDOW_END; p += 0.01) {
      for (const frac of [0.0, 0.05, 0.25, 0.5, 0.75, 0.9, 0.99, 1.0]) {
        leaderTargetAt(ctrl, null, { gapPx: ALLOWED_PX * frac, progress: p });
      }
    }
    const stats = ctrl.getGapBrakeStats();
    expect(stats.windowFrames).toBeGreaterThan(200); // it really did look, many times
    expect(stats.firedFrames).toBe(0);
    expect(stats.minEngageGapPx).toBe(Infinity);
  });

  it('★ the smallest gap it ever ENGAGED at is above the allowance, over a full grow-and-shrink', () => {
    // The strong form of the gate, on the profile the mechanism actually meets: the gap climbs
    // through the allowance, the brake engages, and then FOLLOWS IT DOWN past the allowance. The
    // firing gap is therefore allowed to go below it — the ENGAGE gap is not, and that is the one
    // asserted. ★ SABOTAGE THIS CATCHES: re-engaging inside the fade (which would re-seed the
    // strength from the size at a sub-allowance gap).
    const { ctrl } = makeController();
    const { stats } = driveGapProfile(ctrl, growThenShrink());
    expect(stats.firedFrames).toBeGreaterThan(300); // it really did act
    expect(stats.minEngageGapPx).toBeGreaterThan(ALLOWED_PX);
    expect(stats.minFiringGapPx).toBeLessThan(ALLOWED_PX); // ...and it did follow the gap down
  });

  it('is silent OUTSIDE its window — before OUTCOME begins and after the window end', () => {
    const { plan, ctrl } = makeController();
    const before = plan.phaseFractions.corridorStart - 0.05;
    leaderTargetAt(ctrl, null, { gapPx: ALLOWED_PX * 5, progress: before, ms: 20_000 });
    leaderTargetAt(ctrl, null, { gapPx: ALLOWED_PX * 5, progress: 0.99, ms: 55_000 });
    const stats = ctrl.getGapBrakeStats();
    expect(stats.windowFrames).toBe(0);
    expect(stats.firedFrames).toBe(0);
  });

  it('the window START follows the OUTCOME boundary rather than a constant', () => {
    const { plan, ctrl } = makeController();
    expect(ctrl.getGapBrakeStats().windowStart).toBeCloseTo(plan.phaseFractions.corridorStart, 6);
    expect(ctrl.getGapBrakeStats().windowEnd).toBe(WINDOW_END);
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

describe('GAP-BRAKE-RATE-1 — the strength is a CHANGE, not a size', () => {
  it('★ RISES for as long as the gap keeps growing (red if the strength stops following growth)', () => {
    // ★ WHAT THIS CATCHES: anything that stops the integrator following growth — freezing the
    // strength at its entry value, dropping the growth branch, or clamping the rise below the
    // ceiling. The gap here ENGAGES barely over the allowance, so the entry seed is ~0 and every
    // bit of the strength that follows was earned by growth.
    //
    // ★ WHAT IT DOES *NOT* CATCH, said plainly so nobody over-trusts it: restoring the old SIZE
    // ramp. On a gap that only ever grows the two laws agree by construction — both reach full
    // authority one allowance past the allowance — so no growing profile can separate them. The
    // test below, on the give-back, is the one that does.
    const { ctrl } = makeController();
    const profile = [];
    for (let k = 0; k < 400; k++) profile.push(ALLOWED_PX * 1.02 + k * 0.6);
    const { log } = driveGapProfile(ctrl, profile);

    const engaged = log.filter((e) => e.engaged);
    expect(engaged.length).toBeGreaterThan(300);
    expect(engaged[0].strength).toBeLessThan(CEILING * 0.05); // it really did start from nothing

    // it never falls while the (smoothed) gap is growing...
    const falls = [];
    for (let i = 1; i < log.length; i++) {
      if (!log[i].engaged || !log[i - 1].engaged) continue;
      if (log[i].dGapPx > 0 && log[i].strength < log[i - 1].strength - 1e-12) falls.push(i);
    }
    expect(falls).toEqual([]);

    // ...and it climbs, step after step, all the way to the owner's ceiling.
    const risingSteps = engaged.filter((e, i) => i > 0 && e.strength > engaged[i - 1].strength);
    expect(risingSteps.length).toBeGreaterThan(200);
    expect(engaged[engaged.length - 1].strength).toBeCloseTo(CEILING, 6);
  });

  it('★ gives back LESS authority per pixel closed than the size law did', () => {
    // ★ THIS IS THE REDESIGN, AS AN INEQUALITY, and it is the half that actually fixes the
    // parking. On a gap that only ever GREW the two laws agree by construction — both hand over the
    // whole authority after one allowance of growth past the allowance — so no growth profile can
    // tell them apart. They part company the moment the brake starts WINNING:
    //
    //     old (size ramp)  dS/S = dGap / (gap - allowance)
    //     new (this law)   dS/S = dGap /  gap
    //
    // and `gap > gap - allowance` always, so the new law surrenders strictly less of its strength
    // for every pixel it closes — which is why the gap no longer settles where brake and drive
    // balance. Restore the size ramp and the measured give-back jumps to the old ratio: red.
    const { ctrl } = makeController();
    const { log } = driveGapProfile(
      ctrl,
      growThenShrink({ to: 240, steps: 240, end: 0, fall: 600 })
    );
    const peak = log.reduce((a, b) => (b.strength > a.strength ? b : a));
    const shrinking = log.filter((e) => e.k > peak.k && e.engaged && e.dGapPx < 0);
    expect(shrinking.length).toBeGreaterThan(200);

    // measured over the whole shrink, against what the size ramp would have surrendered
    let worst = 0;
    for (let i = 1; i < shrinking.length; i++) {
      const a = shrinking[i - 1],
        b = shrinking[i];
      if (!(a.strength > 0)) continue;
      const measured = (a.strength - b.strength) / a.strength; // fraction of strength given back
      const sizeLaw = -b.dGapPx / Math.max(1e-9, b.gapPx - ALLOWED_PX); // what the ramp would give back
      if (b.gapPx > ALLOWED_PX * 1.1) worst = Math.max(worst, measured - sizeLaw);
    }
    expect(worst).toBeLessThanOrEqual(0); // never gives back more than the old law, anywhere
  });

  it('★ FADES on a shrinking gap instead of switching off at the allowance', () => {
    // ★ WHAT THIS CATCHES, and it is the owner's whole objection to the first build: the old law
    // returned ZERO authority at the allowance, so the brake released exactly where the gap was
    // still one full allowance wide and the leader snapped back. Restore any "release when
    // gap <= allowance" and the first assertion goes red.
    const { ctrl } = makeController();
    const { log } = driveGapProfile(ctrl, growThenShrink());

    const peak = log.reduce((a, b) => (b.strength > a.strength ? b : a));
    // the first step after the peak at which the gap has come back to the allowance
    const backAtAllowance = log.find((e) => e.k > peak.k && e.gapPx <= ALLOWED_PX);
    expect(backAtAllowance).toBeDefined();
    // ★ still engaged, and still pulling meaningfully — NOT zero, NOT released
    expect(backAtAllowance.engaged).toBe(true);
    expect(backAtAllowance.strength).toBeGreaterThan(CEILING * 0.25);

    // it goes DOWN from there, monotonically, and only reaches nothing once the gap has gone
    const after = log.filter((e) => e.k >= backAtAllowance.k && e.engaged);
    for (let i = 1; i < after.length; i++) {
      if (after[i].dGapPx < 0) {
        expect(after[i].strength).toBeLessThanOrEqual(after[i - 1].strength + 1e-12);
      }
    }
    const released = log.find((e) => e.k > backAtAllowance.k && !e.engaged);
    expect(released).toBeDefined();
    expect(released.gapPx).toBeLessThan(ALLOWED_PX * 0.5); // the gap really was closed by then
  });

  it('never RISES while the gap is shrinking', () => {
    const { ctrl } = makeController();
    const { log } = driveGapProfile(ctrl, growThenShrink());
    const rises = [];
    for (let i = 1; i < log.length; i++) {
      if (!log[i].engaged || !log[i - 1].engaged) continue;
      if (log[i].dGapPx < 0 && log[i].strength > log[i - 1].strength + 1e-12) rises.push(i);
    }
    expect(rises).toEqual([]);
  });

  it("★ NEVER exceeds the owner's ceiling, however hard the gap is driven", () => {
    // ★ SABOTAGE THIS CATCHES: dropping the `Math.min(ceiling, ...)` on the growth branch, or
    // reading the engine floor (`1 - minMult` = 0.15) instead of his key. Either takes the strength
    // past 0.10 on this profile, which opens a gap of forty allowances.
    const { plan, ctrl } = makeController();
    const profile = [];
    for (let k = 0; k < 900; k++) profile.push(k * 4); // up to 3600 px = 40 allowances
    const { log, stats } = driveGapProfile(ctrl, profile);
    expect(stats.maxStrength).toBeGreaterThan(CEILING * 0.9); // it really did saturate
    expect(stats.maxStrength).toBeLessThanOrEqual(CEILING + 1e-12);
    expect(stats.minMultCommanded).toBeGreaterThanOrEqual(1 - CEILING - 1e-12);
    // and the ceiling is HIS, not the engine's floor
    expect(stats.minMultCommanded).toBeGreaterThan(plan.controllerParams.minMult);
    for (const e of log) expect(e.strength).toBeLessThanOrEqual(CEILING + 1e-12);
  });

  it('★ NEVER writes a target above the one the same controller writes with the brake OFF', () => {
    // Two controllers, identical racer states, stepped in lockstep. The braked one may write a
    // LOWER target; it must never write a higher one. That is the whole "only ever slows" claim,
    // and it is the `Math.min` at the fold that guarantees it.
    const on = makeController({ on: true });
    const off = makeController({ on: false });
    const A = layOutField(on.ctrl, 0.8, 'drawnWinner');
    const B = layOutField(off.ctrl, 0.8, 'drawnWinner');
    expect(A.lead.index).toBe(B.lead.index); // same plan, same seed — same drawn winner
    const profile = growThenShrink({ to: 300, steps: 200, fall: 300 });
    let higher = 0;
    for (let k = 0; k < profile.length; k++) {
      A.lead.t = A.packT + profile[k] / PATH_LENGTH_PX;
      B.lead.t = B.packT + profile[k] / PATH_LENGTH_PX;
      on.ctrl.update(A.racers, 40_000 + k * STEP_MS, 0.8);
      off.ctrl.update(B.racers, 40_000 + k * STEP_MS, 0.8);
      if (A.lead.trajectoryMultTarget > B.lead.trajectoryMultTarget + 1e-12) higher++;
    }
    expect(on.ctrl.getGapBrakeStats().firedFrames).toBeGreaterThan(200); // the brake really acted
    expect(higher).toBe(0);
  });

  it('★ keeps the harder SERVO pull when the brake asks for less — the case that catches an override', () => {
    // ★ WHY THIS CASE EXISTS, AND WHY THE TEST ABOVE IS NOT ENOUGH. Replacing the fold's `Math.min`
    // with a plain override leaves the test above GREEN: its leader is the racer drawn to win, so
    // the servo asks for ~1.0 and the brake's command is always the lower of the two — min and
    // override agree, and the mutation is invisible. The case that separates them is a leader FAR
    // AHEAD of his drawn place: the servo saturates at `minMult` = 0.85 and asks for that, while a
    // lead just over the allowance asks for ~0.999. An override would hand him 0.999 and make him
    // FASTER. Verified by sabotage: this goes red when the min is removed.
    const { plan, ctrl } = makeController();
    const { racers, lead, packT } = layOutField(ctrl, 0.8, 'deepField');
    lead.t = packT + (ALLOWED_PX * 1.05) / PATH_LENGTH_PX;
    ctrl.update(racers, 40_000, 0.8);
    const stats = ctrl.getGapBrakeStats();
    expect(stats.engaged).toBe(true); // the brake did speak
    expect(stats.minMultCommanded).toBeGreaterThan(0.99); // ...and gently
    // ...and what was written is the servo's floor, not the brake's gentler number.
    expect(lead.trajectoryMultTarget).toBeCloseTo(plan.controllerParams.minMult, 9);
    expect(lead.trajectoryMultTarget).toBeLessThan(0.95);
  });

  it("the rate window is the engine's own trajectory-transition duration, not a number of its own", () => {
    const { ctrl } = makeController();
    expect(ctrl.getGapBrakeStats().rateWindowMs).toBe(
      DEFAULT_RACE_DYNAMICS_CONFIG.trajectoryTransitionDuration * 1000
    );
  });
});

// ============================================================
// GAP-BRAKE-ARRIVAL-1 — the two properties that make the command actually reach the speed.
//
// ★ WHY THESE ARE ASSERTED ON THE CLOCK AND THE TARGET, NOT ON trajectoryMult. The multiplier
// itself is computed in raceCore.js from three fields the controller writes; asserting on it here
// would mean copying that formula into the test, which is a second home for it. What the controller
// OWNS is those three fields, and arrival is exactly the property that the transition clock is not
// restarted out from under the ease while the brake is pulling.
// ============================================================

describe('GAP-BRAKE-ARRIVAL-1 — the command reaches the speed', () => {
  it('★ does NOT restart the transition while the brake is pulling (remove the fix and this goes red)', () => {
    const { ctrl } = makeController();
    const profile = [];
    for (let k = 0; k < 120; k++) profile.push(ALLOWED_PX * 1.2 + k * 1.0);
    const { log } = driveGapProfile(ctrl, profile);
    const pulling = log.filter((e, i) => i > 0 && e.fired > log[i - 1].fired);
    expect(pulling.length).toBeGreaterThan(80); // it really did pull, most steps

    // the target MOVED over the run -- otherwise the next assertion would be vacuous
    const targets = pulling.map((e) => e.target);
    expect(Math.max(...targets) - Math.min(...targets)).toBeGreaterThan(0.01);

    // ...and the clock did not restart while it moved.
    const starts = new Set(pulling.slice(1).map((e) => e.transStart));
    expect(starts.size).toBe(1);
  });

  it('the written target is exactly 1 - strength once the brake is the binding constraint', () => {
    // The brake's command has ONE home; this asserts the written value against the state the
    // controller reports, never against a second copy of the law.
    const { ctrl } = makeController();
    const profile = [];
    for (let k = 0; k < 120; k++) profile.push(ALLOWED_PX * 1.2 + k * 1.0);
    const { log } = driveGapProfile(ctrl, profile);
    const last = log[log.length - 1];
    expect(last.engaged).toBe(true);
    expect(last.target).toBeCloseTo(1 - last.strength, 9);
  });
});
