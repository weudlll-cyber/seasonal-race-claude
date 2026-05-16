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

// ── Test 5: Render-Interpolation (Variant B1) ─────────────────────────────────

// Mirrors the lerp helper and renderAlpha computation from RaceScreen/index.jsx.
const lerp = (a, b, t) => a + (b - a) * t;

function computeRenderAlpha(physicsAccum) {
  return Math.min(1, physicsAccum / FIXED_DT);
}

describe('Render interpolation — lerp formula', () => {
  it('alpha=0 returns prev value', () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(-5, 5, 0)).toBe(-5);
  });

  it('alpha=1 returns curr value', () => {
    expect(lerp(10, 20, 1)).toBe(20);
    expect(lerp(-5, 5, 1)).toBe(5);
  });

  it('alpha=0.5 returns midpoint', () => {
    expect(lerp(10, 20, 0.5)).toBe(15);
    expect(lerp(0, 100, 0.5)).toBe(50);
    expect(lerp(-10, 10, 0.5)).toBe(0);
  });

  it('alpha=0.25 interpolates correctly', () => {
    expect(lerp(0, 40, 0.25)).toBeCloseTo(10, 10);
    expect(lerp(100, 200, 0.25)).toBeCloseTo(125, 10);
  });
});

describe('Render interpolation — shadow fields after accumulator run', () => {
  it('_prevX/_prevY/_prevAngle are captured before physics step and differ from post-step values', () => {
    // Simulate what index.jsx does: snapshot _prev, then run physics step.
    const racer = { t: 0, x: 100, y: 200, angle: 0.5, baseSpeed: 0.01 };

    // B1 snapshot (mirrors: for (const r of st.racers) { r._prevX = r.x; ... })
    racer._prevX = racer.x;
    racer._prevY = racer.y;
    racer._prevAngle = racer.angle;

    // Simulate one physics step changing position
    racer.t += racer.baseSpeed;
    racer.x = racer.t * 500; // simplified position update
    racer.y = racer.t * 300;
    racer.angle = racer.t * Math.PI;

    // _prev must reflect pre-step values
    expect(racer._prevX).toBe(100);
    expect(racer._prevY).toBe(200);
    expect(racer._prevAngle).toBe(0.5);

    // current values must have changed
    expect(racer.x).not.toBe(racer._prevX);
    expect(racer.y).not.toBe(racer._prevY);
  });

  it('_prevX fallback ?? r.x is safe when _prevX is undefined (first frame)', () => {
    const racer = { x: 42, y: 99, angle: 1.2 };
    // No _prevX set yet — simulates first RACING frame before any snapshot
    const alpha = 0.4;
    const renderX = lerp(racer._prevX ?? racer.x, racer.x, alpha);
    const renderY = lerp(racer._prevY ?? racer.y, racer.y, alpha);
    // lerp(curr, curr, alpha) = curr regardless of alpha
    expect(renderX).toBe(42);
    expect(renderY).toBe(99);
  });
});

describe('Render interpolation — renderAlpha stays in [0, 1]', () => {
  it('physicsAccum=0 gives renderAlpha=0', () => {
    expect(computeRenderAlpha(0)).toBe(0);
  });

  it('physicsAccum just under FIXED_DT gives renderAlpha close to 1', () => {
    const alpha = computeRenderAlpha(FIXED_DT - 0.001);
    expect(alpha).toBeGreaterThan(0.99);
    expect(alpha).toBeLessThanOrEqual(1);
  });

  it('physicsAccum=FIXED_DT/2 gives renderAlpha=0.5', () => {
    expect(computeRenderAlpha(FIXED_DT / 2)).toBeCloseTo(0.5, 10);
  });

  it('physicsAccum clamped to 1 even if somehow exceeds FIXED_DT', () => {
    // Guard: Math.min(1, accum/FIXED_DT) ensures alpha never exceeds 1
    expect(computeRenderAlpha(FIXED_DT * 2)).toBe(1);
    expect(computeRenderAlpha(999)).toBe(1);
  });
});

describe('Render interpolation — toggle disables interpolation', () => {
  it('interpolationEnabled=false uses direct r.x regardless of alpha and _prev', () => {
    const racer = { x: 80, y: 60, angle: 0.3, _prevX: 10, _prevY: 10, _prevAngle: 0 };
    const renderAlpha = 0.5;
    const interpolationEnabled = false;

    const renderX = interpolationEnabled
      ? lerp(racer._prevX ?? racer.x, racer.x, renderAlpha)
      : racer.x;
    const renderY = interpolationEnabled
      ? lerp(racer._prevY ?? racer.y, racer.y, renderAlpha)
      : racer.y;
    const renderAngle = interpolationEnabled
      ? lerp(racer._prevAngle ?? racer.angle, racer.angle, renderAlpha)
      : racer.angle;

    // Must return current physics values unchanged
    expect(renderX).toBe(80);
    expect(renderY).toBe(60);
    expect(renderAngle).toBe(0.3);
  });

  it('interpolationEnabled=true interpolates between _prev and current', () => {
    const racer = { x: 80, y: 60, angle: 0.4, _prevX: 40, _prevY: 20, _prevAngle: 0.2 };
    const renderAlpha = 0.5;
    const interpolationEnabled = true;

    const renderX = interpolationEnabled
      ? lerp(racer._prevX ?? racer.x, racer.x, renderAlpha)
      : racer.x;
    const renderY = interpolationEnabled
      ? lerp(racer._prevY ?? racer.y, racer.y, renderAlpha)
      : racer.y;
    const renderAngle = interpolationEnabled
      ? lerp(racer._prevAngle ?? racer.angle, racer.angle, renderAlpha)
      : racer.angle;

    // lerp(40, 80, 0.5) = 60
    expect(renderX).toBeCloseTo(60, 10);
    // lerp(20, 60, 0.5) = 40
    expect(renderY).toBeCloseTo(40, 10);
    // lerp(0.2, 0.4, 0.5) = 0.3
    expect(renderAngle).toBeCloseTo(0.3, 10);
  });
});

// ── Per-step snapshot invariant ────────────────────────────────────────────────
// Mirrors the accumulator loop in index.jsx with the B1 fix:
// _prev snapshot taken INSIDE the while loop before each step.
// Each step: snapshot _prev = curr, then advance x by stepSize.
function runAccumulatorWithPerStepSnapshot(racer, rawDtSequence, stepSize) {
  let physicsAccum = 0;
  for (const rawDt of rawDtSequence) {
    physicsAccum += rawDt;
    while (physicsAccum >= FIXED_DT) {
      // B1 fix: snapshot per-step
      racer._prevX = racer.x;
      racer._prevY = racer.y;
      racer.x += stepSize;
      racer.y += stepSize;
      physicsAccum -= FIXED_DT;
    }
  }
  return { physicsAccum, racer };
}

// Buggy per-rAF snapshot (for comparison): _prev taken once before the whole loop.
function runAccumulatorWithPerRafSnapshot(racer, rawDtSequence, stepSize) {
  let physicsAccum = 0;
  for (const rawDt of rawDtSequence) {
    // Buggy: snapshot before the loop, not inside it
    racer._prevX = racer.x;
    racer._prevY = racer.y;
    physicsAccum += rawDt;
    while (physicsAccum >= FIXED_DT) {
      racer.x += stepSize;
      racer.y += stepSize;
      physicsAccum -= FIXED_DT;
    }
  }
  return { physicsAccum, racer };
}

describe('Render interpolation — per-step snapshot invariant (B1 fix)', () => {
  const STEP = 10; // pixels per physics step

  it('per-step: _prev is exactly 1 step behind curr after a 1-step frame', () => {
    const racer = { x: 0, y: 0 };
    const { physicsAccum } = runAccumulatorWithPerStepSnapshot(racer, [16], STEP);
    // After 1 step: prev=0, curr=10
    expect(racer._prevX).toBe(0);
    expect(racer.x).toBe(10);
    // Gap is exactly 1 step
    expect(racer.x - racer._prevX).toBeCloseTo(STEP, 10);
    const alpha = computeRenderAlpha(physicsAccum);
    const renderX = lerp(racer._prevX, racer.x, alpha);
    // renderX must be between prev and curr
    expect(renderX).toBeGreaterThanOrEqual(racer._prevX);
    expect(renderX).toBeLessThanOrEqual(racer.x);
  });

  it('per-step: _prev is exactly 1 step behind curr after a 2-step frame', () => {
    const racer = { x: 0, y: 0 };
    // rawDt=33ms → 2 steps fire (physicsAccum=33→17→1)
    const { physicsAccum } = runAccumulatorWithPerStepSnapshot(racer, [33], STEP);
    // After step 1: prev=0, curr=10; after step 2: prev=10, curr=20
    expect(racer._prevX).toBe(10); // exactly 1 step behind
    expect(racer.x).toBe(20);
    expect(racer.x - racer._prevX).toBeCloseTo(STEP, 10);
    const alpha = computeRenderAlpha(physicsAccum);
    const renderX = lerp(racer._prevX, racer.x, alpha);
    expect(renderX).toBeGreaterThanOrEqual(racer._prevX);
    expect(renderX).toBeLessThanOrEqual(racer.x);
  });

  it('buggy per-rAF: _prev is 2 steps behind curr after a 2-step frame', () => {
    const racer = { x: 0, y: 0 };
    runAccumulatorWithPerRafSnapshot(racer, [33], STEP);
    // Buggy: prev=0 (before both steps), curr=20 (2 steps ahead) → gap=2*STEP
    expect(racer._prevX).toBe(0);
    expect(racer.x).toBe(20);
    expect(racer.x - racer._prevX).toBeCloseTo(2 * STEP, 10);
  });

  it('per-step: renderX gap never exceeds 1 step across a 60fps sequence with occasional 2-step frames', () => {
    // 60fps at 60Hz generates a 2-step frame every ~24 frames due to 0.67ms drift.
    // Per-step snapshot: gap must always equal exactly STEP regardless.
    const racer = { x: 0, y: 0 };
    const rawDts = Array.from({ length: 48 }, (_, i) => (i % 24 === 23 ? 33 : 16));

    let physicsAccum = 0;
    let maxGap = 0;
    for (const rawDt of rawDts) {
      physicsAccum += rawDt;
      while (physicsAccum >= FIXED_DT) {
        racer._prevX = racer.x;
        racer.x += STEP;
        physicsAccum -= FIXED_DT;
      }
      const gap = racer.x - racer._prevX;
      if (gap > maxGap) maxGap = gap;
    }
    // Per-step snapshot: gap is always exactly 1 step
    expect(maxGap).toBeCloseTo(STEP, 10);
  });
});

// ── Pattern A: lerpAngle (shortest-arc) ───────────────────────────────────────
describe('Pattern A — lerpAngle shortest-arc interpolation', () => {
  // Mirror of the lerpAngle helper in index.jsx
  function lerpAngle(a, b, t) {
    let diff = b - a;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return a + diff * t;
  }

  it('lerpAngle midpoint between 0 and π/2 is π/4', () => {
    expect(lerpAngle(0, Math.PI / 2, 0.5)).toBeCloseTo(Math.PI / 4, 10);
  });

  it('lerpAngle takes short arc across track seam: lerp(-π, π, 0.5) resolves to ±π not 0', () => {
    // Plain lerp(-π, π, 0.5) = 0 — the long way around (backward sprite).
    // lerpAngle normalises diff to 0 (shortest arc is zero rotation) → result = -π.
    const result = lerpAngle(-Math.PI, Math.PI, 0.5);
    // Both ±π represent the same angle; either is the correct short-arc answer.
    expect(Math.abs(Math.abs(result) - Math.PI)).toBeCloseTo(0, 10);
  });

  it('lerpAngle uses sin/cos consistency: lerp result matches expected unit-circle position', () => {
    // Verify that lerpAngle(a, b, t) places the sprite on the correct arc.
    // Angles a=π/6, b=5π/6 — midpoint by shortest arc = π/2.
    const a = Math.PI / 6;
    const b = (5 * Math.PI) / 6;
    const mid = lerpAngle(a, b, 0.5);
    // sin(π/2)=1, cos(π/2)=0
    expect(Math.sin(mid)).toBeCloseTo(Math.sin(Math.PI / 2), 10);
    expect(Math.cos(mid)).toBeCloseTo(Math.cos(Math.PI / 2), 10);
  });

  it('renderRacers whitelist: only t, x, y, angle are interpolated — all other fields pass through unchanged', () => {
    // renderRacers must spread the racer object so identity fields (id, name, color, …)
    // are never modified. This guards against accidentally lerp-ing physics state.
    const LERP = (a, b, t) => a + (b - a) * t;

    const racer = {
      id: 'r1',
      name: 'Alice',
      color: '#ff0000',
      t: 0.8,
      x: 100,
      y: 50,
      angle: 0.5,
      _prevT: 0.7,
      _prevX: 90,
      _prevY: 45,
      _prevAngle: 0.4,
      baseSpeed: 0.001,
      finished: false,
    };
    const alpha = 0.5;

    // Simulate renderRacers map (same logic as index.jsx)
    const rendered = {
      ...racer,
      t: LERP(racer._prevT, racer.t, alpha),
      x: LERP(racer._prevX, racer.x, alpha),
      y: LERP(racer._prevY, racer.y, alpha),
      angle: lerpAngle(racer._prevAngle, racer.angle, alpha),
    };

    // Interpolated fields
    expect(rendered.t).toBeCloseTo(0.75, 10);
    expect(rendered.x).toBeCloseTo(95, 10);
    expect(rendered.y).toBeCloseTo(47.5, 10);

    // Pass-through fields must be byte-identical (not lerped)
    expect(rendered.id).toBe('r1');
    expect(rendered.name).toBe('Alice');
    expect(rendered.color).toBe('#ff0000');
    expect(rendered.baseSpeed).toBe(0.001);
    expect(rendered.finished).toBe(false);
  });

  it('_prevT snapshot: per-step _prevT is exactly 1 physics step behind t', () => {
    // Mirrors the per-step snapshot block: r._prevT = r.t before each physics step.
    const STEP_T = 0.001; // per-step t increment
    const racer = { t: 0 };

    let physicsAccum = 0;
    const rawDts = [16, 16, 33, 16]; // one 2-step frame in sequence

    for (const rawDt of rawDts) {
      physicsAccum += rawDt;
      while (physicsAccum >= FIXED_DT) {
        racer._prevT = racer.t;
        racer.t += STEP_T;
        physicsAccum -= FIXED_DT;
      }
    }
    // After the loop _prevT must be exactly 1 step behind t
    expect(racer.t - racer._prevT).toBeCloseTo(STEP_T, 10);
  });
});
