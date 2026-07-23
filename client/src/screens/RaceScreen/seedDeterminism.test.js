// ============================================================
// File:        seedDeterminism.test.js
// Path:        client/src/screens/RaceScreen/seedDeterminism.test.js
// Project:     RaceArena
// Created:     2026-07-22  (rewritten 2026-07-23 for parity step 1 — RNG isolation)
// Description: Browser race determinism. Parity step 1 replaced the global-`Math.random`
//              swap with ONE explicit seeded stream (makeRaceRng) threaded through every
//              physics draw site. This test proves the NEW, stronger property: a seeded race
//              is reproducible AND independent of frame pacing, camera state and slow-mo,
//              because render-only draws (camera, trails) stay on the native `Math.random`
//              and can no longer perturb the physics stream. It covers the WHOLE race —
//              finishing order + per-racer progress at fixed physics-time checkpoints — not
//              just the pre-race init. A coupled-mode contrast reproduces the pre-fix bug so
//              the pacing-invariance assertion cannot pass vacuously.
// ============================================================

import { describe, it, expect, afterEach } from 'vitest';
import { makeRaceRng, mulberry32 } from '../../modules/racePlanner.js';
import { computeEvenRowLayout } from '../../modules/rowLayout.js';
import { easeInOutCubic } from '../../utils/mathUtils.js';

// Nothing in this suite swaps the global anymore — the whole point of the change. This guard is
// defensive: if any test (or a future regression) leaves a seeded generator installed, restore it.
const NATIVE_RANDOM = Math.random;
afterEach(() => {
  Math.random = NATIVE_RANDOM;
});

const BASE_SPEED_MIN = 0.9;
const BASE_SPEED_MAX = 1.1;
const BASE_SPEED_MEAN = 1.0;
const HALF_WIDTH = (BASE_SPEED_MAX - BASE_SPEED_MIN) / BASE_SPEED_MEAN / 2;

// ── The five physics draw sites, mirrored from RaceScreen/index.jsx, now taking an EXPLICIT rng ──
// index.jsx:551 (row shuffle), :630 (spreadFactor), :633 (rollJitter), :1136 (re-roll target),
// :1179 (jOff). Threading `rng` here is the same shape the real code now uses.
function initRaceDraws(
  rng,
  { nRacers = 12, rowCount = 3, rollInterval = 12000, rollsPerRacer = 4 } = {}
) {
  const rowLayout = computeEvenRowLayout(nRacers, rowCount, rng); // 1. start rows
  const spreadFactors = [];
  const firstRollOffsets = [];
  for (let i = 0; i < nRacers; i++) {
    spreadFactors.push(
      (BASE_SPEED_MIN + rng() * (BASE_SPEED_MAX - BASE_SPEED_MIN)) / BASE_SPEED_MEAN
    ); // 2
    firstRollOffsets.push((rng() - 0.5) * 2 * rollInterval * 0.2); // 3
  }
  const reRolls = [];
  for (let roll = 0; roll < rollsPerRacer; roll++) {
    for (let i = 0; i < nRacers; i++) {
      reRolls.push(spreadFactors[i] + (rng() - 0.5) * 2 * HALF_WIDTH); // 4
      reRolls.push((rng() - 0.5) * 2 * rollInterval * 0.2); // 5
    }
  }
  return { rowLayout, spreadFactors, firstRollOffsets, reRolls };
}

describe('seeded init draws from one explicit stream (makeRaceRng)', () => {
  it('two races on the same seed produce identical init draw sequences', () => {
    const a = initRaceDraws(makeRaceRng(42).physics);
    const b = initRaceDraws(makeRaceRng(42).physics);
    expect(b.rowLayout).toEqual(a.rowLayout);
    expect(b.spreadFactors).toEqual(a.spreadFactors);
    expect(b.firstRollOffsets).toEqual(a.firstRollOffsets);
    expect(b.reRolls).toEqual(a.reRolls);
    // non-vacuous: the re-roll sequence is long and not constant
    expect(a.reRolls.length).toBeGreaterThan(50);
    expect(new Set(a.reRolls).size).toBeGreaterThan(10);
  });

  it('different seeds produce different races', () => {
    const a = initRaceDraws(makeRaceRng(1).physics);
    const b = initRaceDraws(makeRaceRng(2).physics);
    expect(b.spreadFactors).not.toEqual(a.spreadFactors);
    expect(b.reRolls).not.toEqual(a.reRolls);
  });

  it('seed <= 0 yields the native generator (unseeded / exploration path)', () => {
    expect(makeRaceRng(0).physics).toBe(Math.random);
    expect(makeRaceRng(-1).physics).toBe(Math.random);
  });
});

describe('makeRaceRng never touches the global (the isolation invariant)', () => {
  it('building and drawing from a seeded stream leaves Math.random untouched', () => {
    const before = Math.random;
    const rng = makeRaceRng(5).physics;
    for (let i = 0; i < 100; i++) rng();
    expect(Math.random).toBe(before); // never swapped, unlike the old mechanism
  });

  it('two streams on the same seed are independent instances with identical output', () => {
    const a = makeRaceRng(9).physics;
    const b = makeRaceRng(9).physics;
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b()); // b is not advanced by a's draws
    expect(seqB).toEqual(seqA);
  });
});

// ── Whole-race harness ────────────────────────────────────────────────────────────────────────
// A compact race loop that mirrors index.jsx's physics: fixed 16ms steps; per-racer scheduled
// re-rolls (target + jitter drawn from the physics stream) eased over a transition; t advanced by
// baseSpeed·spreadFactor. Around the physics it interleaves RENDER draws (camera + trails) that hit
// the GLOBAL Math.random — the count varies per frame with pacing and camera state, exactly the
// pollution source parity step 1 removed. In the fixed engine the physics stream is `raceRng`
// (isolated), so render draws cannot perturb it; in `coupled` mode the physics stream IS the global,
// reproducing the pre-fix bug where frame pacing changed the outcome.
const FIXED_DT = 16;
const NR = 16;
const ROWS = 4;
const RACE_BASE_SPEED = 0.0011; // ~1090 steps to the line at spreadFactor≈1 → dozens of re-rolls
const FINISH_T = 1.2;
const ROLL_INTERVAL = 400; // ms  (~25 steps)
const TRANSITION = 160; // ms
const LAST_ROLL_DEADLINE = 60000; // ms — re-rolls run the whole race
const CHECK_EVERY = 100; // steps
const MAX_STEPS = 3000;

function simulateRace(seed, pacing) {
  // Physics stream. Fixed engine → isolated `raceRng`. Coupled (pre-fix) → the global, which the
  // render draws below also consume, so a given seed installs a deterministic global generator.
  let rng;
  if (pacing.coupled) {
    Math.random = mulberry32(seed);
    rng = Math.random;
  } else {
    rng = makeRaceRng(seed).physics;
  }

  // init — physics draws in index.jsx order (before any render frame, so always identical)
  const rowLayout = computeEvenRowLayout(NR, ROWS, rng);
  const rowBy = new Map(rowLayout.assignments.map((a) => [a.racerIndex, a.rowIndex]));
  const racers = Array.from({ length: NR }, (_, i) => {
    const spreadFactor =
      (BASE_SPEED_MIN + rng() * (BASE_SPEED_MAX - BASE_SPEED_MIN)) / BASE_SPEED_MEAN;
    const jitter = (rng() - 0.5) * 2 * ROLL_INTERVAL * 0.2;
    return {
      index: i,
      row: rowBy.get(i) ?? 0,
      t: 0,
      spreadFactor,
      spreadFactorPrev: spreadFactor,
      spreadFactorTarget: spreadFactor,
      transitionStartTime: 0,
      nextRollTime: ROLL_INTERVAL + jitter,
      finished: false,
      finishStep: Infinity,
    };
  });

  let physicsTs = 0;
  let step = 0;
  let frame = 0;
  let finishedCount = 0;
  const checkpoints = [];

  while (finishedCount < NR && step < MAX_STEPS) {
    // one rendered frame: render-only draws hit the GLOBAL Math.random. Count varies with pacing.
    const renderDraws = pacing.renderDrawsPerFrame(frame);
    for (let d = 0; d < renderDraws; d++) Math.random();
    frame++;

    // up to N fixed physics steps this frame (the browser's catch-up / slow-mo cadence)
    const stepsThisFrame = pacing.stepsPerFrame(frame);
    for (let s = 0; s < stepsThisFrame && finishedCount < NR; s++) {
      physicsTs += FIXED_DT;
      step++;
      for (const r of racers) {
        if (r.finished) continue;
        if (physicsTs >= r.nextRollTime && physicsTs < LAST_ROLL_DEADLINE) {
          const rawTarget = r.spreadFactor + (rng() - 0.5) * 2 * HALF_WIDTH;
          const newTarget = Math.max(
            BASE_SPEED_MIN / BASE_SPEED_MEAN,
            Math.min(BASE_SPEED_MAX / BASE_SPEED_MEAN, rawTarget)
          );
          r.spreadFactorPrev = r.spreadFactor;
          r.spreadFactorTarget = newTarget;
          r.transitionStartTime = physicsTs;
          const jOff = (rng() - 0.5) * 2 * ROLL_INTERVAL * 0.2;
          r.nextRollTime = physicsTs + ROLL_INTERVAL + jOff;
        }
        const el = physicsTs - r.transitionStartTime;
        r.spreadFactor =
          el < TRANSITION
            ? r.spreadFactorPrev +
              (r.spreadFactorTarget - r.spreadFactorPrev) * easeInOutCubic(el / TRANSITION)
            : r.spreadFactorTarget;
        r.t += RACE_BASE_SPEED * r.spreadFactor;
        if (r.t >= FINISH_T) {
          r.finished = true;
          r.finishStep = step;
          finishedCount++;
        }
      }
      if (step % CHECK_EVERY === 0) checkpoints.push({ step, t: racers.map((r) => r.t) });
    }
  }

  const order = [...racers]
    .sort((a, b) => a.finishStep - b.finishStep || b.t - a.t || a.index - b.index)
    .map((r) => r.index);
  return { order, checkpoints, steps: step };
}

// Three pacing profiles — deliberately very different in frame rate, catch-up depth and render load:
const FAST = { renderDrawsPerFrame: (f) => (f % 7) + 1, stepsPerFrame: () => 2 }; // steady, light render
const SLOWMO = {
  renderDrawsPerFrame: (f) => 13 + (f % 5),
  stepsPerFrame: (f) => (f % 3 === 0 ? 1 : 2),
}; // slow-mo: heavy render, uneven steps
const HEADLESS = { renderDrawsPerFrame: () => 0, stepsPerFrame: () => 1 }; // no camera/trails — the sim's shape

describe('whole-race determinism is independent of frame pacing / camera / slow-mo', () => {
  it('same seed → identical finishing order and checkpoint progress across wildly different pacing', () => {
    const a = simulateRace(7, FAST);
    const b = simulateRace(7, SLOWMO);
    const c = simulateRace(7, HEADLESS); // browser-with-render vs the render-free sim shape

    expect(b.order).toEqual(a.order);
    expect(b.checkpoints).toEqual(a.checkpoints);
    expect(c.order).toEqual(a.order);
    expect(c.checkpoints).toEqual(a.checkpoints);

    // non-vacuous: the race ran long, re-rolled many times, and shuffled the field off start order
    expect(a.steps).toBeGreaterThan(500);
    expect(a.checkpoints.length).toBeGreaterThan(5);
    expect(new Set(a.order).size).toBe(NR);
    expect(a.order).not.toEqual([...Array(NR).keys()]);
  });

  it('holds for several seeds', () => {
    for (const seed of [1, 23, 512, 9999]) {
      const a = simulateRace(seed, FAST);
      const b = simulateRace(seed, SLOWMO);
      expect(b.order).toEqual(a.order);
      expect(b.checkpoints).toEqual(a.checkpoints);
    }
  });
});

describe('the pacing-invariance test is not vacuous (pre-fix coupling IS detected)', () => {
  it('coupled mode (global stream, the pre-fix bug) makes the race depend on frame pacing', () => {
    const a = simulateRace(7, { ...FAST, coupled: true });
    const b = simulateRace(7, { ...SLOWMO, coupled: true });
    // Init is identical (drawn before any render frame), but once render draws intervene the
    // shared-global physics stream diverges — the exact coupling parity step 1 removed.
    expect(b.checkpoints).not.toEqual(a.checkpoints);
  });
});
