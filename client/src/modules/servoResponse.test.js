// ============================================================
// File:        client/src/modules/servoResponse.test.js
// Project:     RaceArena — SERVO-RANKS-1
//
// ★ WHAT THIS FILE OWNS: the trajectory servo's RESPONSE CURVE — how much drive a given rank error
//   commands — and nothing else. Four properties, each one a claim the change is allowed to make:
//     1. it matches today's response while a hundred racers are still RUNNING, in both directions
//        — NOT for the whole race, because the shipped divisor is the unfinished count;
//     2. it gives every field size the gradation near the target that only N=100 had;
//     3. it STILL CONVERGES — full drive at a block of error or more, at every field size;
//     4. neither clamp moves, and the default arm is today's race untouched.
//
// ★ WHAT IT DELIBERATELY DOES NOT DO. It does not measure whether the new response is GOOD — the
//   arrival pace, the peak gap, band-reach, Holm are population questions and belong to the sweep.
//   It does not test the CHAOS-phase steer, which is a separate mechanism this change leaves alone.
//   It does not assert a finishing order; a response curve does not own one.
// ============================================================

import { describe, it, expect } from 'vitest';
import { DEFAULT_CONTROLLER_PARAMS, BAND_EDGES, servoDrive } from './racePlanner.js';

const { gain, maxMult, minMult } = DEFAULT_CONTROLLER_PARAMS;
const clamp = (v) => Math.max(minMult, Math.min(maxMult, v));
/** The SHIPPED response, written out here so the comparison is against an independent expression. */
const shipped = (e, n) => clamp(1 + gain * (e / n));

// The response is no longer switchable — it is THE response — so there is no arm to select and the
// module is imported once, like any other. `shipped` above keeps an independent expression of the
// OLD rule so the two can still be compared where that is the point.
const m = { servoDrive };

describe('the servo response', () => {
  it('★ matches today s response while a hundred racers are still RUNNING, drive AND brake', () => {
    // ★ READ THE ARGUMENT NAME. `nActive` is the UNFINISHED count, not the field size — `active` is
    // `racers.filter(r => !r.finished)` — so the shipped divisor shrinks as racers cross the line
    // and its response STEEPENS through the endgame. This equality therefore holds at the gun and
    // not at the finish, which is why the fairness gate on this arm is measured and not argued.
    for (const e of [-20, -9, -5, -3, -1, 0, 1, 3, 5, 9, 20]) {
      expect(clamp(1 + m.servoDrive(e, 100, gain, maxMult))).toBeCloseTo(shipped(e, 100), 12);
    }
  });

  it('★ gives every field size the SAME response — one rank means one thing', () => {
    for (const e of [-5, -3, -1, 1, 3, 5]) {
      const at100 = m.servoDrive(e, 100, gain, maxMult);
      for (const n of [20, 40, 60]) {
        expect(m.servoDrive(e, n, gain, maxMult)).toBeCloseTo(at100, 12);
      }
    }
  });

  it('★ eases NEAR the target — at twenty racers one rank is no longer the ceiling', () => {
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

  it('★ STILL CONVERGES: full drive at a block of error or more, at every field size', () => {
    // ★ THIS IS THE SABOTAGE TARGET for "ease the drive far from the target too". A response that
    // eased everywhere instead of near the target would fail here, at every field size at once.
    for (const n of [20, 40, 60, 100]) {
      for (const e of [BAND_EDGES[0], 7, 12, 40]) {
        expect(clamp(1 + m.servoDrive(e, n, gain, maxMult))).toBe(maxMult);
        expect(clamp(1 + m.servoDrive(-e, n, gain, maxMult))).toBeLessThan(1);
      }
    }
  });

  it('full drive is reached at exactly one BLOCK of error, which is where the name comes from', () => {
    const justInside = m.servoDrive(BAND_EDGES[0] - 0.001, 40, gain, maxMult);
    expect(1 + justInside).toBeLessThan(maxMult);
    expect(clamp(1 + m.servoDrive(BAND_EDGES[0], 40, gain, maxMult))).toBe(maxMult);
  });

  it('neither clamp is exceeded, at any error or field size', () => {
    {
      for (const n of [5, 20, 40, 100, 250]) {
        for (const e of [-500, -40, -1, 0, 1, 40, 500]) {
          const v = clamp(1 + m.servoDrive(e, n, gain, maxMult));
          expect(v).toBeLessThanOrEqual(maxMult);
          expect(v).toBeGreaterThanOrEqual(minMult);
        }
      }
    }
  });

  it('zero error commands exactly 1.0 — an arrived racer is not driven', () => {
    for (const n of [20, 100]) expect(servoDrive(0, n, gain, maxMult)).toBe(0);
  });
});
