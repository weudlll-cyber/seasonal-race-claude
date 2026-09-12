// @vitest-environment node
// ============================================================
// File:        approachTaper.test.js
// Path:        client/src/modules/approachTaper.test.js
// Project:     RaceArena — COMEBACK-BRAKE-EARLY-1
//
// WHAT THIS PINS: the approach taper — the rule that makes a held racer's deceleration START BEFORE
// he reaches his drawn place instead of after it.
//
// ★ WHY IT EXISTS, measured rather than argued. The drive is `1 + gain * (error / nActive)` clamped
// at `maxMult`, and that clamp BINDS for the whole approach at ordinary field sizes: at 20 racers
// the servo commands the ceiling 1.100 five ranks out and still 1.100 ONE rank out. So the racer
// crossed his drawn place still commanded ten percent fast, and the brake that follows is eased in
// with `easeInOutCubic` (`raceCore.js:552-559`) — slowest at its start, 0.60 s to three quarters.
// That is the overshoot the owner watched.
//
// WHAT IT DELIBERATELY DOES NOT PIN:
//   · THE BRAKE'S STRENGTH. `minMult`, the gain and the ease duration are untouched by this piece,
//     and the taper returns a braking (negative) error unchanged — asserted below.
//   · That he still REACHES his drawn place, or what the peak gap becomes. Those are race outcomes
//     over ten tracks and four field sizes and they live in COMEBACK-BRAKE-EARLY-1, measured.
//   · The lead-in's SIZE as a matter of taste. Five ranks is a time argument: the ease needs 0.60 s,
//     and the last two ranks of a climb take only 0.38 s at the tenth percentile while the last five
//     take 1.17 s. The span is asserted here so a later change to it is a decision, not a drift.
// ============================================================

import { describe, it, expect } from 'vitest';
import { approachTaper, APPROACH_TAPER_RANKS } from './racePlanner.js';

describe('COMEBACK-BRAKE-EARLY-1 — the approach taper', () => {
  it('leaves a racer who is still far out completely alone', () => {
    for (const e of [5, 6, 9, 40]) expect(approachTaper(e, 5)).toBe(e);
  });

  it('★ never touches a BRAKING error — the strength of the brake is not this piece', () => {
    for (const e of [-0.5, -1, -3, -12]) expect(approachTaper(e, 5)).toBe(e);
    expect(approachTaper(0, 5)).toBe(0);
  });

  it('★ never reverses the drive, so it cannot push him backwards or leave him short', () => {
    for (let e = 0; e <= 5; e += 0.25) {
      const out = approachTaper(e, 5);
      expect(out).toBeGreaterThanOrEqual(0);
      expect(out).toBeLessThanOrEqual(e);
    }
  });

  it('falls monotonically as he closes, and reaches zero exactly at arrival', () => {
    let prev = Infinity;
    for (let e = 5; e >= 0; e -= 0.5) {
      const out = approachTaper(e, 5);
      expect(out).toBeLessThanOrEqual(prev);
      prev = out;
    }
    expect(approachTaper(0, 5)).toBe(0);
  });

  it('★ takes the command OFF the maxMult ceiling before he arrives — at every field size', () => {
    // the shipped controller law, written out so this test does not depend on the planner's internals
    const cmd = (e, n) => Math.min(1.1, Math.max(0.85, 1 + 2 * (e / n)));
    for (const n of [20, 40, 60, 100]) {
      // BEFORE: at one rank out the drive is still pinned at the ceiling for the small fields
      // AFTER: it is off the ceiling, which is the whole point
      const after = cmd(approachTaper(1, APPROACH_TAPER_RANKS), n);
      expect(after, `field ${n}`).toBeLessThan(1.1);
    }
    // and at 20 racers, which is where the ceiling bound hardest, the change is real
    expect(cmd(1, 20)).toBe(1.1);
    expect(cmd(approachTaper(1, APPROACH_TAPER_RANKS), 20)).toBeLessThan(1.05);
  });

  it('a degenerate lead-in disables it rather than dividing by zero', () => {
    expect(approachTaper(3, 0)).toBe(3);
    expect(approachTaper(3, -1)).toBe(3);
  });

  it('★ the lead-in spans five ranks — the span the measured times chose', () => {
    expect(APPROACH_TAPER_RANKS).toBe(5);
  });
});
