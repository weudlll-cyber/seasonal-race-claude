// ============================================================
// File:        timeLeft.test.js
// Path:        client/src/modules/registration/timeLeft.test.js
// Project:     RaceArena — REGISTRATION-1
// Description: The countdown text of a registration: days and hours, hours and minutes, minutes and
//              seconds, and "Closed" at or past the deadline.
// ============================================================

import { describe, it, expect } from 'vitest';
import { formatTimeLeft, msUntil } from './timeLeft.js';

const S = 1000;
const M = 60 * S;
const H = 60 * M;
const D = 24 * H;

describe('formatTimeLeft', () => {
  it('reads the way a person reads it, at each scale', () => {
    expect(formatTimeLeft(3 * D + 4 * H + 5 * M)).toBe('3 days 4 h');
    expect(formatTimeLeft(1 * D + 30 * M)).toBe('1 day 0 h');
    expect(formatTimeLeft(2 * H + 5 * M + 9 * S)).toBe('2 h 05 min');
    expect(formatTimeLeft(14 * M + 5 * S)).toBe('14 min 05 s');
    expect(formatTimeLeft(999)).toBe('0 min 00 s');
  });

  it('is "Closed" at zero, below it, and for nonsense', () => {
    for (const v of [0, -1, NaN, Infinity]) expect(formatTimeLeft(v)).toBe('Closed');
  });
});

describe('msUntil', () => {
  it('is the distance to the deadline, never negative', () => {
    const now = Date.parse('2026-10-21T10:00:00Z');
    expect(msUntil('2026-10-21T10:05:00Z', now)).toBe(5 * M);
    expect(msUntil('2026-10-21T09:00:00Z', now)).toBe(0);
    expect(msUntil('not a date', now)).toBe(0);
  });
});
