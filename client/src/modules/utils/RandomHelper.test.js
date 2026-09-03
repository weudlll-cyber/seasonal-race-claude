// ============================================================
// File:        RandomHelper.test.js
// Path:        client/src/modules/utils/RandomHelper.test.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Unit tests for the shuffle and randomInt utilities
// ============================================================

import { shuffle, randomInt } from './RandomHelper.js';

// ── shuffle ──────────────────────────────────────────────────

describe('shuffle', () => {
  it('returns the same array reference (in-place mutation)', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffle(arr)).toBe(arr);
  });

  it('preserves all original elements after shuffling', () => {
    const original = [1, 2, 3, 4, 5];
    const result = shuffle([...original]);
    expect(result.sort((a, b) => a - b)).toEqual(original);
  });

  it('handles an empty array without error', () => {
    expect(shuffle([])).toEqual([]);
  });

  it('handles a single-element array', () => {
    expect(shuffle([42])).toEqual([42]);
  });
});

// ── assignRacers — REMOVED 2026-09-04 (DROP-RACER-NUMBER-1) ─────────────────────────
//
// Eleven tests stood here and all eleven were correct about a function that no longer exists. The
// owner retired the `racerNumber` badge and the shuffle button it fed; `assignRacers` had no other
// purpose, so it went with them rather than staying as a mechanism with nothing on the other end.
//
// NOTHING REPLACES THEM, because nothing replaces the function: the roster is now `{ name }` and
// `{ name, group }` objects built inline. What DOES need pinning is that `racerNumber` is gone from
// the screen and the list is alphabetical — that is `PlayerSetup.test.jsx` and `rosterGroups`.
//
// `shuffle` above and `randomInt` below are untouched. `shuffle` is `rowLayout.js`'s, seeded, and
// decides the start grid; it was never what the button called.

// ── randomInt ────────────────────────────────────────────────

describe('randomInt', () => {
  it('always returns a value within [min, max] inclusive', () => {
    for (let i = 0; i < 200; i++) {
      const val = randomInt(3, 9);
      expect(val).toBeGreaterThanOrEqual(3);
      expect(val).toBeLessThanOrEqual(9);
    }
  });

  it('returns an integer (no fractional part)', () => {
    for (let i = 0; i < 50; i++) {
      expect(Number.isInteger(randomInt(0, 100))).toBe(true);
    }
  });

  it('returns min when min === max', () => {
    expect(randomInt(7, 7)).toBe(7);
  });

  it('works with a range of [0, 0]', () => {
    expect(randomInt(0, 0)).toBe(0);
  });
});

// The PLAYER-GROUPS-1 block that stood here — five tests on `assignRacers` taking object entries
// — went with the function on 2026-09-04 (DROP-RACER-NUMBER-1). It existed so a player's `group`
// survived renumbering; there is no renumbering now, and the roster is built inline.
