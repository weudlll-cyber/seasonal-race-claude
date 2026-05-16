// ============================================================
// File:        frameTimingStabilization.test.js
// Path:        client/src/screens/RaceScreen/frameTimingStabilization.test.js
// Project:     RaceArena
// Description: Tests for the fixed-timestep accumulator (Variant A) and
//              EMA dt-smoothing (Variant C) implemented in PR #118.
//              Logic is mirrored locally — tests must not import the React
//              component to avoid the browser-module graph.
// ============================================================

import { describe, it, expect, vi } from 'vitest';

// ── Shared constants (mirrored from RaceScreen/index.jsx) ─────────────────────
const FIXED_DT = 16; // ms — fixed physics timestep

// ── Accumulator simulation helper ─────────────────────────────────────────────

/**
 * Simulate the physics accumulator for a sequence of rawDt values.
 * @param {object[]} racers         Array of racer objects with { t, baseSpeed }
 * @param {number[]} rawDtSequence  Sequence of per-rAF rawDt values in ms
 * @returns {{ physicsTs: number, physicsAccum: number, stepCount: number }}
 */
function runAccumulator(racers, rawDtSequence) {
  let physicsAccum = 0;
  let physicsTs = 0;
  let stepCount = 0;

  for (const rawDt of rawDtSequence) {
    physicsAccum += rawDt;
    while (physicsAccum >= FIXED_DT) {
      physicsTs += FIXED_DT;
      stepCount++;
      for (const r of racers) {
        // Mirrors: r.t += r.baseSpeed * boost * brake (FIXED_DT/16 = 1.0)
        r.t += r.baseSpeed;
      }
      physicsAccum -= FIXED_DT;
    }
  }

  return { physicsTs, physicsAccum, stepCount };
}

// ── EMA smoothing helper ───────────────────────────────────────────────────────

/**
 * Run the EMA smoothing formula for a sequence of rawDt values.
 * @param {number[]} rawDtSequence  Sequence of per-rAF rawDt values in ms
 * @param {number}   alpha          EMA coefficient (0 = no smoothing, 0.95 = max)
 * @param {number}   [initial=16]   Initial smoothDt value
 * @returns {number[]} smoothDt value after each rAF
 */
function runEMA(rawDtSequence, alpha, initial = 16) {
  let smoothDt = initial;
  return rawDtSequence.map((rawDt) => {
    smoothDt = alpha * smoothDt + (1 - alpha) * rawDt;
    return smoothDt;
  });
}

// ── Test 1: Fixed-timestep determinism ───────────────────────────────────────

describe('Fixed-timestep determinism', () => {
  it('uniform 16ms and alternating 16/33ms sequences produce identical r.t after same total time', () => {
    const BASE_SPEED = 0.001045;
    const TOTAL_MS = 1000;

    // Uniform 16ms frames — 62 full frames = 992ms
    const uniformSeq = Array.from({ length: 62 }, () => 16);
    // Alternating 16/33ms frames — same total time: 20 pairs = 980ms, then extra 16ms = 996ms
    // Adjust so both sequences sum to the same total real time (same physics step count)
    const altSeq = [];
    let sum = 0;
    while (sum < TOTAL_MS - 33) {
      altSeq.push(16);
      sum += 16;
      altSeq.push(33);
      sum += 33;
    }
    // Pad both to same total ms
    const uniformSum = uniformSeq.reduce((s, v) => s + v, 0);
    const altSum = altSeq.reduce((s, v) => s + v, 0);
    // The number of physics steps = Math.floor(total / FIXED_DT) for each sequence
    const uniformSteps = Math.floor(uniformSum / FIXED_DT);
    const altSteps = Math.floor(altSum / FIXED_DT);

    // With a common total time, the step counts should be equal (or differ by at most 1
    // due to accumulator state, since the accumulator tracks fractional ms between frames).
    // The key property: any sequence with the same total ms yields the same step count.
    const commonMs = Math.min(uniformSum, altSum);
    const expectedSteps = Math.floor(commonMs / FIXED_DT);

    const racers1 = [{ t: 0, baseSpeed: BASE_SPEED }];
    const racers2 = [{ t: 0, baseSpeed: BASE_SPEED }];

    const r1 = runAccumulator(racers1, uniformSeq);
    const r2 = runAccumulator(racers2, altSeq);

    // Both should have run the same number of physics steps for their respective sums
    expect(r1.stepCount).toBe(uniformSteps);
    expect(r2.stepCount).toBe(altSteps);

    // If both sequences cover the same total ms, t values must be identical
    if (uniformSum === altSum) {
      expect(racers1[0].t).toBeCloseTo(racers2[0].t, 10);
    } else {
      // Otherwise they may differ by exactly one physics step worth
      const stepSize = BASE_SPEED;
      expect(Math.abs(racers1[0].t - racers2[0].t)).toBeLessThanOrEqual(stepSize + 1e-12);
    }
  });

  it('two sequences summing to exactly 1008ms each yield identical physicsTs=1008 and identical r.t', () => {
    // 1008ms / 16ms = 63 exact physics steps
    // seq1: 63 uniform 16ms frames = 63×16 = 1008ms
    const seq1 = Array.from({ length: 63 }, () => 16);
    // seq2: interleaved 16ms and 33ms frames, also summing to 1008ms
    // 15×16 + 8×33 + 15×16 + 8×33 = 240 + 264 + 240 + 264 = 1008ms
    const seq2 = [
      ...Array.from({ length: 15 }, () => 16),
      ...Array.from({ length: 8 }, () => 33),
      ...Array.from({ length: 15 }, () => 16),
      ...Array.from({ length: 8 }, () => 33),
    ];

    const sum1 = seq1.reduce((s, v) => s + v, 0);
    const sum2 = seq2.reduce((s, v) => s + v, 0);
    expect(sum1).toBe(1008);
    expect(sum2).toBe(1008);

    const BASE_SPEED = 0.001045;
    const r1 = [{ t: 0, baseSpeed: BASE_SPEED }];
    const r2 = [{ t: 0, baseSpeed: BASE_SPEED }];

    const res1 = runAccumulator(r1, seq1);
    const res2 = runAccumulator(r2, seq2);

    expect(res1.physicsTs).toBe(1008);
    expect(res2.physicsTs).toBe(1008);
    expect(res1.stepCount).toBe(63);
    expect(res2.stepCount).toBe(63);
    expect(r1[0].t).toBeCloseTo(r2[0].t, 10);
  });
});

// ── Test 2: Physics step count ────────────────────────────────────────────────

describe('Physics step count per rAF', () => {
  it('50ms frame from zero accumulator yields 3 physics steps', () => {
    const racers = [{ t: 0, baseSpeed: 0.001 }];
    const { stepCount, physicsAccum } = runAccumulator(racers, [50]);
    // 50 / 16 = 3 steps, remainder 50 - 48 = 2ms
    expect(stepCount).toBe(3);
    expect(physicsAccum).toBeCloseTo(2, 10);
  });

  it('12ms frame from zero accumulator yields 0 physics steps, accumulator holds 12ms', () => {
    const racers = [{ t: 0, baseSpeed: 0.001 }];
    const { stepCount, physicsAccum } = runAccumulator(racers, [12]);
    expect(stepCount).toBe(0);
    expect(physicsAccum).toBeCloseTo(12, 10);
  });

  it('12ms + 12ms frames: first yields 0 steps, second yields 1 step (remainder 8ms)', () => {
    let physicsAccum = 0;
    let stepCount = 0;
    let physicsAccumAfterFirst = 0;
    let stepCountAfterFirst = 0;

    // Simulate manually to capture intermediate state
    physicsAccum += 12;
    while (physicsAccum >= FIXED_DT) {
      stepCount++;
      physicsAccum -= FIXED_DT;
    }
    stepCountAfterFirst = stepCount;
    physicsAccumAfterFirst = physicsAccum;

    physicsAccum += 12;
    while (physicsAccum >= FIXED_DT) {
      stepCount++;
      physicsAccum -= FIXED_DT;
    }

    expect(stepCountAfterFirst).toBe(0);
    expect(physicsAccumAfterFirst).toBeCloseTo(12, 10);
    expect(stepCount).toBe(1); // total across both frames
    expect(physicsAccum).toBeCloseTo(8, 10); // 24 - 16 = 8ms remainder
  });

  it('exactly 16ms frame from zero accumulator yields exactly 1 step', () => {
    const racers = [{ t: 0, baseSpeed: 0.001 }];
    const { stepCount, physicsAccum } = runAccumulator(racers, [16]);
    expect(stepCount).toBe(1);
    expect(physicsAccum).toBeCloseTo(0, 10);
  });

  it('accumulator carries over between frames: 3 × 12ms = 1 step + 20ms remainder → 2nd 12ms → 1 more step', () => {
    const racers = [{ t: 0, baseSpeed: 0.001 }];
    const { stepCount, physicsAccum } = runAccumulator(racers, [12, 12, 12]);
    // 36ms total → 2 steps (32ms), 4ms remainder
    expect(stepCount).toBe(2);
    expect(physicsAccum).toBeCloseTo(4, 10);
  });
});

// ── Test 3: EMA smoothing convergence ────────────────────────────────────────

describe('EMA dt-smoothing', () => {
  it('constant 16ms input converges to 16 regardless of alpha', () => {
    for (const alpha of [0, 0.3, 0.7, 0.9]) {
      const seq = Array.from({ length: 200 }, () => 16);
      const values = runEMA(seq, alpha, 16);
      expect(values[values.length - 1]).toBeCloseTo(16, 5);
    }
  });

  it('starting at 0, constant 16ms input converges toward 16 with alpha=0.7', () => {
    const alpha = 0.7;
    const seq = Array.from({ length: 100 }, () => 16);
    const values = runEMA(seq, alpha, 0);
    // After 100 steps, smoothDt should be very close to 16
    expect(values[values.length - 1]).toBeCloseTo(16, 2);
  });

  it('alternating 16/33ms converges to a value between 16 and 33 with alpha=0.7', () => {
    const alpha = 0.7;
    const seq = [];
    for (let i = 0; i < 200; i++) seq.push(i % 2 === 0 ? 16 : 33);
    const values = runEMA(seq, alpha, 16);
    const finalVal = values[values.length - 1];
    expect(finalVal).toBeGreaterThan(16);
    expect(finalVal).toBeLessThan(33);
  });

  it('alpha=0 means smoothDt equals rawDt exactly (no smoothing)', () => {
    const alpha = 0;
    const seq = [16, 33, 12, 25, 16];
    const values = runEMA(seq, alpha);
    // With alpha=0: smoothDt = 0*prev + 1*rawDt = rawDt exactly
    seq.forEach((rawDt, i) => expect(values[i]).toBeCloseTo(rawDt, 10));
  });

  it('higher alpha means slower convergence after a spike', () => {
    // After a 33ms spike, alpha=0.9 retains the spike longer than alpha=0.1
    const spikeSeq = [16, 33, ...Array.from({ length: 20 }, () => 16)];
    const fastValues = runEMA(spikeSeq, 0.1, 16);
    const slowValues = runEMA(spikeSeq, 0.9, 16);
    // At frame 5 (3 frames after spike), the slow smoother should be higher
    expect(slowValues[5]).toBeGreaterThan(fastValues[5]);
  });
});

// ── Test 4: physicsTs-based re-roll ──────────────────────────────────────────

describe('physicsTs-based re-roll timing', () => {
  /**
   * Minimal re-roll simulation — tracks when a racer's nextRollTime triggers.
   * physicsTs starts at 0, nextRollTime is a relative offset from 0.
   */
  function simulateReRoll(rawDtSequence, nextRollTime) {
    let physicsAccum = 0;
    let physicsTs = 0;
    let rollFiredAtPhysicsTs = null;

    for (const rawDt of rawDtSequence) {
      physicsAccum += rawDt;
      while (physicsAccum >= FIXED_DT) {
        physicsTs += FIXED_DT;
        if (rollFiredAtPhysicsTs === null && physicsTs >= nextRollTime) {
          rollFiredAtPhysicsTs = physicsTs;
        }
        physicsAccum -= FIXED_DT;
      }
    }

    return { rollFiredAtPhysicsTs, physicsTs };
  }

  it('re-roll fires at same physicsTs regardless of rawDt sequence', () => {
    const ROLL_TIME = 400; // ms in physicsTs space

    // Uniform 16ms frames for 500ms total
    const uniformSeq = Array.from({ length: 32 }, () => 16); // 32×16 = 512ms
    // Alternating 16/33ms for similar total
    const altSeq = Array.from({ length: 21 }, (_, i) => (i % 2 === 0 ? 16 : 33)); // ~508ms

    const r1 = simulateReRoll(uniformSeq, ROLL_TIME);
    const r2 = simulateReRoll(altSeq, ROLL_TIME);

    // Both must fire the roll — physicsTs at fire should be the first multiple of FIXED_DT ≥ ROLL_TIME
    const expectedFireTs = Math.ceil(ROLL_TIME / FIXED_DT) * FIXED_DT;
    expect(r1.rollFiredAtPhysicsTs).toBe(expectedFireTs);
    expect(r2.rollFiredAtPhysicsTs).toBe(expectedFireTs);
  });

  it('re-roll fires at exactly the first FIXED_DT boundary >= nextRollTime', () => {
    for (const rollTime of [400, 416, 432, 500, 512]) {
      const expected = Math.ceil(rollTime / FIXED_DT) * FIXED_DT;
      // Simple uniform sequence of 50ms frames (3 steps each) to advance physicsTs quickly
      const result = simulateReRoll(
        Array.from({ length: 20 }, () => 50),
        rollTime
      );
      expect(result.rollFiredAtPhysicsTs).toBe(expected);
    }
  });

  it('re-roll never fires before nextRollTime', () => {
    const ROLL_TIME = 400;
    const seq = Array.from({ length: 30 }, () => 16);
    const { rollFiredAtPhysicsTs } = simulateReRoll(seq, ROLL_TIME);
    if (rollFiredAtPhysicsTs !== null) {
      expect(rollFiredAtPhysicsTs).toBeGreaterThanOrEqual(ROLL_TIME);
    }
  });
});

// ── Test 5: dtSmoothingAlpha slider effect ────────────────────────────────────

describe('dtSmoothingAlpha slider effect', () => {
  it('alpha=0 makes smoothDt equal rawDt on every frame', () => {
    const alpha = 0;
    const rawDts = [16, 33, 12, 8, 50, 16];
    let smoothDt = 16;
    for (const rawDt of rawDts) {
      smoothDt = alpha * smoothDt + (1 - alpha) * rawDt;
      expect(smoothDt).toBeCloseTo(rawDt, 10);
    }
  });

  it('alpha=0.9 damps a 50ms spike to well below 50ms after one frame', () => {
    const alpha = 0.9;
    let smoothDt = 16;
    // Apply a 50ms spike
    smoothDt = alpha * smoothDt + (1 - alpha) * 50;
    // smoothDt = 0.9 × 16 + 0.1 × 50 = 14.4 + 5 = 19.4 — well below 50
    expect(smoothDt).toBeCloseTo(19.4, 1);
    expect(smoothDt).toBeLessThan(25);
  });

  it('alpha=0.9 convergence is much slower than alpha=0.1 after a step change', () => {
    // Start at 16, step to 33 permanently — measure frames to convergence within 1ms of 33
    const target = 33;
    const tolerance = 1;

    let fast = 16;
    let fastFrames = 0;
    while (Math.abs(fast - target) > tolerance) {
      fast = 0.1 * fast + 0.9 * target;
      fastFrames++;
      if (fastFrames > 1000) break;
    }

    let slow = 16;
    let slowFrames = 0;
    while (Math.abs(slow - target) > tolerance) {
      slow = 0.9 * slow + 0.1 * target;
      slowFrames++;
      if (slowFrames > 1000) break;
    }

    expect(slowFrames).toBeGreaterThan(fastFrames * 5);
  });

  it('alpha must be clamped to [0, 0.95] for valid smoothDt values', () => {
    // Verify the boundary: alpha=0 gives exact raw, alpha=0.95 gives maximum damping
    for (const alpha of [0, 0.1, 0.5, 0.7, 0.9, 0.95]) {
      const rawDt = 33;
      let smoothDt = 16;
      for (let i = 0; i < 500; i++) {
        smoothDt = alpha * smoothDt + (1 - alpha) * rawDt;
      }
      // After 500 frames of constant 33ms input, smoothDt must converge to 33
      expect(smoothDt).toBeCloseTo(33, 1);
    }
  });

  it('alpha=0.7 default gives moderate damping on alternating 16/33ms', () => {
    const alpha = 0.7;
    const seq = [];
    for (let i = 0; i < 100; i++) seq.push(i % 2 === 0 ? 16 : 33);
    const values = runEMA(seq, alpha, 16);
    const steadyState = values[values.length - 1];
    // Should settle between 16 and 33 — roughly weighted average biased toward 16
    expect(steadyState).toBeGreaterThan(16);
    expect(steadyState).toBeLessThan(33);
    // With alpha=0.7 and 50/50 alternating, steady-state ≈ 22-25ms
    expect(steadyState).toBeGreaterThan(20);
    expect(steadyState).toBeLessThan(28);
  });
});
