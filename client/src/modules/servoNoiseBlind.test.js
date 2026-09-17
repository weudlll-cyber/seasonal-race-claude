// ============================================================
// File:        servoNoiseBlind.test.js
// Path:        client/src/modules/servoNoiseBlind.test.js
// Project:     RaceArena — SERVO-NARROW-1
//
// WHAT THIS PINS: that the servo's ease is NOT restarted by its own noise, and that the noise still
// reaches the speed. Those are the two halves of the change and they pull in opposite directions —
// a "fix" that stopped the noise reaching the speed would pass a naive restart test and be a
// different mechanism, so both are asserted.
//
// ★ THE FIXTURE HAZARD, WRITTEN DOWN BECAUSE IT HAS BITTEN THIS AREA TWICE. A test here can pass
// under its own sabotage if its racer is one whose command is CLAMPED: a clamped command has its
// noise clipped away by `clamp(..., minMult, ceilFor)` and therefore does not move at all, so the
// shipped setter never restarts either and the two behaviours are indistinguishable. Every test
// below therefore uses a racer sitting WELL INSIDE the clamp, and asserts that first — see
// `expectUnclamped`. SERVO-FAULT-1 measured the consequence of getting this wrong: racers 16+ ranks
// off their place are 100% clamped and arrive 94.6% either way.
// ============================================================

import { describe, it, expect } from 'vitest';
import { createRacePlan, createTrajectoryController } from './racePlanner.js';

const FINISH_T = 2.0;
const TARGET_DUR_MS = 60_000;
const N = 40;
const STEP_MS = 16;
const TARGET_EPSILON = 0.001; // the setter's own, racePlanner.js:704

function makeRacers(count = N) {
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

// ★ V1 IS BEHIND A SWITCH, DEFAULT OFF (defaults.js `servoNoiseBlindEnabled`), so this fixture has
// to ask for it explicitly. That is not a weakening: the two tests below went RED the moment the
// switch was added and before this line was, which is the proof that the switch really gates the
// mechanism rather than leaving it always-on. `makeShippedController` below is the other side of it.
function makeController(seed = 42) {
  const plan = createRacePlan(
    makeRacers(),
    FINISH_T,
    TARGET_DUR_MS,
    { servoNoiseBlindEnabled: true },
    seed
  );
  return { plan, ctrl: createTrajectoryController(plan) };
}

/** The same fixture with V1 at its SHIPPED default — the path a player runs today. */
function makeShippedController(seed = 42) {
  const plan = createRacePlan(makeRacers(), FINISH_T, TARGET_DUR_MS, {}, seed);
  return { plan, ctrl: createTrajectoryController(plan) };
}

/**
 * Hold the whole field STILL at a fixed progress and step the controller. With nobody moving, every
 * racer's rank is constant, so the deterministic part of every command is constant too and the ONLY
 * thing that can move a target is the noise. That is exactly the discrimination this file needs.
 */
function driveStatic(ctrl, steps, { progress = 0.8 } = {}) {
  const racers = makeRacers();
  const packT = FINISH_T * progress;
  // a fixed, strictly decreasing ladder so the ranking is stable and unambiguous
  for (const r of racers) r.t = packT - r.index * 1e-4;
  const log = [];
  for (let k = 0; k < steps; k++) {
    ctrl.update(racers, 40_000 + k * STEP_MS, progress);
    log.push(
      racers.map((r) => ({
        target: r.trajectoryMultTarget,
        transStart: r.trajectoryMultTransStart,
        mult: r.trajectoryMult,
      }))
    );
  }
  return { racers, log };
}

// ★ HOW FAR INSIDE THE CLAMP COUNTS AS UNCLAMPED. A margin of 1e-6 is not enough and was the first
// version of this file: it selected a racer sitting at 0.8503 against a 0.85 floor, which is pinned
// in practice — his command cannot move DOWN at all, so neither setter restarts and the fixture
// proves nothing. One rank of steering is gain/nActive = 2.0/40 = 0.05, so a fifth of a rank is a
// margin with a reason rather than a round number.
const CLAMP_MARGIN = 0.01;

/** A racer whose command is comfortably inside [minMult, maxMult] — the case the change is about. */
function pickUnclamped(plan, log, racers) {
  const { minMult, maxMult } = plan.controllerParams;
  for (let i = 0; i < racers.length; i++) {
    const t = log[log.length - 1][i].target;
    if (t > minMult + CLAMP_MARGIN && t < maxMult - CLAMP_MARGIN) return i;
  }
  return -1;
}

function expectUnclamped(plan, log, idx) {
  const { minMult, maxMult } = plan.controllerParams;
  const t = log[log.length - 1][idx].target;
  // ★ the guard that stops this file passing under its own sabotage
  expect(t).toBeGreaterThan(minMult + CLAMP_MARGIN);
  expect(t).toBeLessThan(maxMult - CLAMP_MARGIN);
}

describe('SERVO-NARROW-1 — the servo does not restart its own ease on its own noise', () => {
  it('★ the noise MOVES the written target every step (so it still reaches the speed)', () => {
    // If this fails, the change has stopped the noise reaching the racer — a different mechanism
    // from the one that was measured, and the reason the restart test alone is not enough.
    const { plan, ctrl } = makeController();
    const { racers, log } = driveStatic(ctrl, 80);
    const idx = pickUnclamped(plan, log, racers);
    expect(idx).toBeGreaterThanOrEqual(0);
    expectUnclamped(plan, log, idx);

    const targets = log.map((row) => row[idx].target);
    const distinct = new Set(targets.map((t) => t.toFixed(9)));
    // ★ The field is static, so the deterministic part of his command cannot move. Every distinct
    // value in this series is therefore the NOISE, arriving in the written target.
    expect(distinct.size).toBeGreaterThan(10);
    const spread = Math.max(...targets) - Math.min(...targets);
    expect(spread).toBeGreaterThan(0);
    // and it is noise-sized rather than a rank step: well under one rank (gain/nActive = 0.05)
    expect(spread).toBeLessThan(0.05);
  });

  it('★ the ease is NOT restarted while only the noise moves (remove the change and this goes red)', () => {
    // ★ THE DISCRIMINATION: the field is static, so every racer's rank — and therefore the
    // deterministic part of his command — is constant for the whole run. The shipped setter sees a
    // target moving by more than TARGET_EPSILON and restarts; the noise-blind one sees a
    // deterministic part that never moves and does not.
    const { plan, ctrl } = makeController();
    const { racers, log } = driveStatic(ctrl, 80);
    const idx = pickUnclamped(plan, log, racers);
    expect(idx).toBeGreaterThanOrEqual(0);
    expectUnclamped(plan, log, idx);

    const starts = log.map((row) => row[idx].transStart);
    const restarts = starts.filter((s, i) => i > 0 && s !== starts[i - 1]).length;
    expect(restarts).toBe(0);
  });

  it('★ and because it is not restarted, the ease COMPLETES and the command arrives', () => {
    // The multiplier is computed in raceCore from the three fields the controller writes, so this
    // asserts the controller's own contract: once the transition duration has elapsed with no
    // restart, `elapsed >= TT_DUR_MS` and raceCore returns the target itself.
    const { plan, ctrl } = makeController();
    const steps = Math.ceil(1000 / STEP_MS) + 20; // past the 1000 ms transition
    const { racers, log } = driveStatic(ctrl, steps);
    const idx = pickUnclamped(plan, log, racers);
    expect(idx).toBeGreaterThanOrEqual(0);
    expectUnclamped(plan, log, idx);

    const last = log[log.length - 1][idx];
    const elapsed = 40_000 + (steps - 1) * STEP_MS - last.transStart;
    expect(elapsed).toBeGreaterThanOrEqual(1000);
  });

  it('★ AT THE SHIPPED DEFAULT THE SWITCH IS OFF — the noise restarts the ease, as it always did', () => {
    // ★ THE OTHER SIDE OF THE SWITCH, and the one the owner needs. V1 is a full re-baseline he has
    // not accepted, and it must not be on together with the gap brake (BRAKE-JERK-1). "Default off"
    // is worth nothing unless something fails when it stops being off, so this is the exact inverse
    // of the test above, run through `makeShippedController` — the same fixture with no key set.
    const { plan, ctrl } = makeShippedController();
    const { racers, log } = driveStatic(ctrl, 80);
    const idx = pickUnclamped(plan, log, racers);
    expect(idx).toBeGreaterThanOrEqual(0);
    expectUnclamped(plan, log, idx);

    const starts = log.map((row) => row[idx].transStart);
    const restarts = starts.filter((s, i) => i > 0 && s !== starts[i - 1]).length;
    // The field is static, so the deterministic part cannot move — every restart here is the NOISE
    // re-triggering the shipped `_setTarget`, which is precisely the behaviour V1 removes.
    // ★ THE BAR IS SET FROM THE MEASUREMENT, NOT FROM A GUESS. This fixture restarts on 16 of its 79
    // steps (~20%): `_setTarget` compares against the last ACCEPTED target, and two draws from
    // U(-0.0008, +0.0008) clear the 0.001 epsilon only part of the time. The first version of this
    // line asserted ">40" on an assumption that most steps restart, and went red for that reason
    // rather than for a real one. What discriminates is 16 against V1's exactly 0, so the bar sits
    // well above zero and well below 16 — it cannot pass with the switch on.
    expect(restarts).toBeGreaterThan(5);
  });

  it('a rank change DOES still restart the ease — the deterministic part is still obeyed', () => {
    // The change must not make the setter deaf to real movement. ★ The racer is the one already
    // NEAREST his drawn place, so his command sits near 1.0 — far from either clamp — and a rank
    // step of gain/nActive = 0.05 really can move it. Picking a racer pinned at a clamp is the
    // mistake this file's header warns about, and it is what the first version of this test did.
    const { plan, ctrl } = makeController();
    const racers = makeRacers();
    const progress = 0.8;
    const packT = FINISH_T * progress;
    for (const r of racers) r.t = packT - r.index * 1e-4;
    ctrl.update(racers, 40_000, progress);

    let idx = -1,
      best = Infinity;
    for (let i = 0; i < racers.length; i++) {
      const drawn = ctrl.getTargetRank(i);
      if (drawn == null) continue;
      const d = Math.abs(i + 1 - drawn);
      if (d < best) {
        best = d;
        idx = i;
      }
    }
    expect(idx).toBeGreaterThanOrEqual(0);
    const { minMult, maxMult } = plan.controllerParams;
    expect(racers[idx].trajectoryMultTarget).toBeGreaterThan(minMult + CLAMP_MARGIN);
    expect(racers[idx].trajectoryMultTarget).toBeLessThan(maxMult - CLAMP_MARGIN);

    // walk him two places forward, slowly, and watch the transition clock
    let restarts = 0,
      prev = racers[idx].trajectoryMultTransStart;
    for (let k = 1; k < 40; k++) {
      const place = Math.max(0, idx - Math.floor(k / 10));
      racers[idx].t = packT - place * 1e-4 + 5e-5;
      ctrl.update(racers, 40_000 + k * STEP_MS, progress);
      const ts = racers[idx].trajectoryMultTransStart;
      if (ts !== prev) restarts++;
      prev = ts;
    }
    expect(restarts).toBeGreaterThan(0);
  });
});
