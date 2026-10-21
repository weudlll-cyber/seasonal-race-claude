// ============================================================
// File:        timeLeft.test.js
// Path:        client/src/modules/registration/timeLeft.test.js
// Project:     RaceArena — REGISTRATION-1
// Description: The countdown text of a registration: days and hours, hours and minutes, minutes and
//              seconds, and "Closed" at or past the deadline.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  closesSentence,
  deadlineProblem,
  formatDeadline,
  formatTimeLeft,
  localFromMs,
  msFromLocal,
  msUntil,
} from './timeLeft.js';

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

// Follow-up 1 (2026-10-21): the director's date fields.
describe('a chosen deadline, said plainly', () => {
  const at = new Date(2026, 9, 22, 19, 45).getTime(); // Thu 22 Oct 2026, 19:45 local time

  it('reads "Thu 22 Oct, 19:45" in English, in the given locale', () => {
    expect(formatDeadline(at, 'en-GB')).toBe('Thu 22 Oct, 19:45');
  });

  it('"Closes … (in …)" uses the countdown text', () => {
    expect(closesSentence(at, at - (D + 2 * H), 'en-GB')).toBe(
      'Closes Thu 22 Oct, 19:45 (in 1 day 2 h)'
    );
  });

  it('a datetime-local value and an instant convert both ways, to the minute', () => {
    expect(localFromMs(at)).toBe('2026-10-22T19:45');
    expect(msFromLocal('2026-10-22T19:45')).toBe(at);
    expect(Number.isNaN(msFromLocal(''))).toBe(true);
  });
});

describe('deadlineProblem — the server rules, checked before submitting', () => {
  const now = Date.parse('2026-10-21T10:00:00Z');

  it('accepts a time between 1 minute and 30 days ahead', () => {
    expect(deadlineProblem(now + M + S, { now })).toBeNull();
    expect(deadlineProblem(now + 30 * D, { now })).toBeNull();
  });

  it('names what is wrong: empty, past, under a minute, over 30 days', () => {
    expect(deadlineProblem(NaN, { now })).toBe('Choose a date and a time.');
    expect(deadlineProblem(now - M, { now })).toBe('This time is in the past.');
    expect(deadlineProblem(now + 30 * S, { now })).toMatch(/at least 1 minute/);
    expect(deadlineProblem(now + 30 * D + M, { now })).toMatch(/at most 30 days/);
  });

  it('an extension must be later than the current deadline and within 30 days of opening', () => {
    const rules = { now, openedAt: now - 2 * D, after: now + H };
    expect(deadlineProblem(now + 30 * M, rules)).toBe(
      'Choose a time later than the current deadline.'
    );
    expect(deadlineProblem(now + 2 * H, rules)).toBeNull();
    expect(deadlineProblem(now + 29 * D, rules)).toMatch(/more than 30 days after/);
  });
});
