// ============================================================
// File:        overlayRendering.test.js
// Path:        client/src/screens/RaceScreen/drawing/overlayRendering.test.js
// Project:     RaceArena
// Created:     2026-06-10
// Description: Contract tests for the countdown digits. Canvas calls are stubbed but not asserted;
//              only the returned integer is verified.
//
//              REWRITTEN BY START-BOARD-1. The old tests pinned 3-2-1-GO! against elapsed time with
//              no duration at all, which is precisely the defect: the overlay owned a count of its
//              own while the phase owned a length, and nothing compared them. Asserting the old
//              numbers harder would have made the bug permanent. What is asserted now is the
//              RELATION — the digits are the phase's length, counted down — at more than one
//              setting, because a single setting cannot distinguish "derived" from "hard-coded to
//              the number that setting happens to produce".
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { drawCountdownOverlay, countdownDigit } from './overlayRendering.js';

function makeCtxMock() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 50 }),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    textAlign: '',
    textBaseline: '',
    font: '',
    fillStyle: '',
    shadowBlur: 0,
    shadowColor: '',
  };
}

describe('the countdown digits are the phase length, counted down', () => {
  // WHAT BREAKS IF DELETED: the whole repair. The overlay could go back to owning a count and the
  // only symptom would be "GO!" standing still for a second, which is what shipped for months.
  // WHAT GOES UNNOTICED WITHOUT IT: a countdown whose digits and whose phase disagree — visible
  // only as dead air at the one moment the race is supposed to start.
  it('4000 ms shows 4-3-2-1 and GO! lands at zero', () => {
    const at = (ms) => countdownDigit(ms, 4000);
    expect(at(0)).toBe(4);
    expect(at(999)).toBe(4);
    expect(at(1000)).toBe(3);
    expect(at(2000)).toBe(2);
    expect(at(3000)).toBe(1);
    expect(at(3999)).toBe(1); // the last second still reads 1 — ceil, not floor
    expect(at(4000)).toBe(0); // GO! exactly at the gun, not a second early
  });

  // WHAT BREAKS IF DELETED: the claim that the digits are DERIVED. One setting cannot tell a
  // derivation from a constant that happens to match it.
  // WHAT GOES UNNOTICED: the owner changing countdownDurationMs and the digits ignoring him.
  it('follows a DIFFERENT setting without the source being touched', () => {
    const at = (ms) => countdownDigit(ms, 6000);
    expect(at(0)).toBe(6);
    expect(at(2500)).toBe(4);
    expect(at(5999)).toBe(1);
    expect(at(6000)).toBe(0);
    // And a short one, where the old hard-coded 3 would have over-counted rather than under-counted.
    expect(countdownDigit(0, 2000)).toBe(2);
    expect(countdownDigit(1999, 2000)).toBe(1);
    expect(countdownDigit(2000, 2000)).toBe(0);
  });

  // WHAT BREAKS IF DELETED: the guard against a NaN or absent duration painting "NaN" on screen.
  // WHAT GOES UNNOTICED: a caller that forgets the argument — the failure would be silent garbage.
  it('never returns a negative or non-finite digit, whatever it is handed', () => {
    for (const [e, d] of [
      [0, 0],
      [99999, 4000],
      [-1, 4000],
      [1000, undefined],
      [NaN, 4000],
      [1000, NaN],
    ]) {
      const n = countdownDigit(e, d);
      expect(Number.isFinite(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
    }
  });

  it('the drawn overlay returns the same digit it paints', () => {
    expect(drawCountdownOverlay(makeCtxMock(), 0, 4000)).toBe(4);
    expect(drawCountdownOverlay(makeCtxMock(), 4000, 4000)).toBe(0);
    expect(drawCountdownOverlay(makeCtxMock(), 0, 6000)).toBe(6);
  });

  // WHAT BREAKS IF DELETED: a countdown longer than the colour palette would index past its end.
  // WHAT GOES UNNOTICED: a crash-shaped defect the moment somebody sets a 10 s countdown.
  it('survives a countdown longer than the colour palette', () => {
    expect(() => drawCountdownOverlay(makeCtxMock(), 0, 10000)).not.toThrow();
    expect(drawCountdownOverlay(makeCtxMock(), 0, 10000)).toBe(10);
  });
});
