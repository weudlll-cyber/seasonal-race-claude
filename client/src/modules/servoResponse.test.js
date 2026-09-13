// ============================================================
// File:        client/src/modules/servoResponse.test.js
// Project:     RaceArena — SERVO-RANKS-1
//
// ★ WHAT THIS FILE OWNS: the trajectory servo's RESPONSE CURVE — how much drive a given rank error
//   commands — and nothing else. Four properties, each one a claim the change is allowed to make:
//     1. it is EXACTLY today's response at a hundred racers, in both directions;
//     2. it gives every field size the gradation near the target that only N=100 had;
//     3. it STILL CONVERGES — full drive at a block of error or more, at every field size;
//     4. neither clamp moves, and the default arm is today's race untouched.
//
// ★ WHAT IT DELIBERATELY DOES NOT DO. It does not measure whether the new response is GOOD — the
//   arrival pace, the peak gap, band-reach, Holm are population questions and belong to the sweep.
//   It does not test the CHAOS-phase steer, which is a separate mechanism this change leaves alone.
//   It does not assert a finishing order; a response curve does not own one.
// ============================================================

import { describe, it, expect, afterEach, vi } from 'vitest';
import { DEFAULT_CONTROLLER_PARAMS, BAND_EDGES, SERVO_RESPONSE } from './racePlanner.js';

const { gain, maxMult, minMult } = DEFAULT_CONTROLLER_PARAMS;
const clamp = (v) => Math.max(minMult, Math.min(maxMult, v));
/** The SHIPPED response, written out here so the comparison is against an independent expression. */
const shipped = (e, n) => clamp(1 + gain * (e / n));

async function withArm(arm) {
  vi.resetModules();
  vi.stubEnv('RA_SERVO_RESPONSE', arm);
  return import('./racePlanner.js');
}

describe('the servo response', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('defaults to today s response, so an unset key changes no race', () => {
    expect(SERVO_RESPONSE).toBe('field');
  });

  it('the `field` arm reproduces the shipped arithmetic exactly', async () => {
    const m = await withArm('field');
    for (const n of [20, 40, 60, 100]) {
      for (const e of [-9, -5, -1, 0, 1, 3, 5, 9]) {
        expect(clamp(1 + m.servoDrive(e, n, gain, maxMult))).toBeCloseTo(shipped(e, n), 12);
      }
    }
  });

  it('★ is EXACTLY today s response at a hundred racers, drive AND brake', async () => {
    // The property that makes the risk one-sided: the field size whose band-reach has half a point
    // of margin against its own gate is the one this cannot move.
    const m = await withArm('ranks');
    for (const e of [-20, -9, -5, -3, -1, 0, 1, 3, 5, 9, 20]) {
      expect(clamp(1 + m.servoDrive(e, 100, gain, maxMult))).toBeCloseTo(shipped(e, 100), 12);
    }
  });

  it('★ gives every field size the SAME response — one rank means one thing', async () => {
    const m = await withArm('ranks');
    for (const e of [-5, -3, -1, 1, 3, 5]) {
      const at100 = m.servoDrive(e, 100, gain, maxMult);
      for (const n of [20, 40, 60]) {
        expect(m.servoDrive(e, n, gain, maxMult)).toBeCloseTo(at100, 12);
      }
    }
  });

  it('★ eases NEAR the target — at twenty racers one rank is no longer the ceiling', async () => {
    const m = await withArm('ranks');
    // Today: one rank of error at twenty racers already commands the full +10%, which is why the
    // multiplier is pinned at the ceiling for the whole approach and cannot fall in time.
    expect(shipped(1, 20)).toBe(maxMult);
    expect(clamp(1 + m.servoDrive(1, 20, gain, maxMult))).toBeCloseTo(1.02, 12);
    expect(clamp(1 + m.servoDrive(2, 20, gain, maxMult))).toBeCloseTo(1.04, 12);
    expect(clamp(1 + m.servoDrive(3, 20, gain, maxMult))).toBeCloseTo(1.06, 12);
    // strictly increasing over the approach, so the trace has a gradient to follow down
    const ramp = [1, 2, 3, 4, 5].map((e) => m.servoDrive(e, 20, gain, maxMult));
    for (let i = 1; i < ramp.length; i++) expect(ramp[i]).toBeGreaterThan(ramp[i - 1]);
  });

  it('★ STILL CONVERGES: full drive at a block of error or more, at every field size', async () => {
    // ★ THIS IS THE SABOTAGE TARGET for "ease the drive far from the target too". A response that
    // eased everywhere instead of near the target would fail here, at every field size at once.
    const m = await withArm('ranks');
    for (const n of [20, 40, 60, 100]) {
      for (const e of [BAND_EDGES[0], 7, 12, 40]) {
        expect(clamp(1 + m.servoDrive(e, n, gain, maxMult))).toBe(maxMult);
        expect(clamp(1 + m.servoDrive(-e, n, gain, maxMult))).toBeLessThan(1);
      }
    }
  });

  it('full drive is reached at exactly one BLOCK of error, which is where the name comes from', async () => {
    const m = await withArm('ranks');
    const justInside = m.servoDrive(BAND_EDGES[0] - 0.001, 40, gain, maxMult);
    expect(1 + justInside).toBeLessThan(maxMult);
    expect(clamp(1 + m.servoDrive(BAND_EDGES[0], 40, gain, maxMult))).toBe(maxMult);
  });

  it('neither clamp is exceeded, at any error or field size, in either arm', async () => {
    for (const arm of ['field', 'ranks']) {
      const m = await withArm(arm);
      for (const n of [5, 20, 40, 100, 250]) {
        for (const e of [-500, -40, -1, 0, 1, 40, 500]) {
          const v = clamp(1 + m.servoDrive(e, n, gain, maxMult));
          expect(v).toBeLessThanOrEqual(maxMult);
          expect(v).toBeGreaterThanOrEqual(minMult);
        }
      }
    }
  });

  it('zero error commands exactly 1.0 in both arms — an arrived racer is not driven', async () => {
    for (const arm of ['field', 'ranks']) {
      const m = await withArm(arm);
      for (const n of [20, 100]) expect(m.servoDrive(0, n, gain, maxMult)).toBe(0);
    }
  });
});
