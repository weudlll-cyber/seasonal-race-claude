// ============================================================
// File:        RandomHelper.test.js
// Path:        client/src/modules/utils/RandomHelper.test.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Unit tests for shuffle, assignRacers, and randomInt utilities
// ============================================================

import { shuffle, assignRacers, randomInt } from './RandomHelper.js';

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

// ── assignRacers ─────────────────────────────────────────────

describe('assignRacers', () => {
  it('returns one entry per player name', () => {
    const result = assignRacers(['Alice', 'Bob', 'Carol']);
    expect(result).toHaveLength(3);
  });

  it('gives each entry a name and a racerNumber', () => {
    const result = assignRacers(['Alice', 'Bob']);
    result.forEach((entry) => {
      expect(entry).toHaveProperty('name');
      expect(entry).toHaveProperty('racerNumber');
    });
  });

  it('uses 1-based sequential racer numbers (each number unique)', () => {
    const result = assignRacers(['A', 'B', 'C', 'D']);
    const numbers = result.map((p) => p.racerNumber).sort((a, b) => a - b);
    expect(numbers).toEqual([1, 2, 3, 4]);
  });

  it('maps player names correctly', () => {
    const names = ['Alice', 'Bob', 'Carol'];
    const result = assignRacers(names);
    const resultNames = result.map((p) => p.name).sort();
    expect(resultNames).toEqual([...names].sort());
  });

  it('returns an empty array for empty input', () => {
    expect(assignRacers([])).toEqual([]);
  });

  it('handles a single player', () => {
    const result = assignRacers(['Solo']);
    expect(result).toEqual([{ name: 'Solo', racerNumber: 1 }]);
  });
});

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

// ══════════════════════════════════════════════════════════════════════════════════════════════
// PLAYER-GROUPS-1 — object entries, and every field of them surviving.
//
// SABOTAGE — before this, `assignRacers` rebuilt each player from its NAME. That was harmless for
//   as long as a player WAS a name; the moment one carries which group it came from, the rebuild
//   erases it on every add, every remove and every reshuffle — silently, and in three callers.
//   What breaks if I delete this: the helper could go back to `{ name, racerNumber }` and the
//   grouped roster would empty itself one click at a time.
// ══════════════════════════════════════════════════════════════════════════════════════════════

describe('assignRacers with object entries', () => {
  it('preserves every field of an object entry and overwrites only racerNumber', () => {
    const out = assignRacers([{ name: 'Anna', group: 'Reds', racerNumber: 99 }]);
    expect(out).toEqual([{ name: 'Anna', group: 'Reds', racerNumber: 1 }]);
  });

  it('still takes plain strings, so every existing caller is unchanged', () => {
    expect(assignRacers(['Solo'])).toEqual([{ name: 'Solo', racerNumber: 1 }]);
  });

  it('takes a MIXED list — a group arriving beside a hand-typed name', () => {
    const out = assignRacers([{ name: 'Anna', group: 'Reds' }, 'Zoe']);
    expect(out.map((p) => p.name).sort()).toEqual(['Anna', 'Zoe']);
    expect(out.find((p) => p.name === 'Anna').group).toBe('Reds');
    expect(out.find((p) => p.name === 'Zoe').group).toBeUndefined();
  });

  it('numbers stay 1..N with no repeat, whatever the entry shape', () => {
    const out = assignRacers([{ name: 'a', group: 'g' }, 'b', { name: 'c' }]);
    expect([...out.map((p) => p.racerNumber)].sort((x, y) => x - y)).toEqual([1, 2, 3]);
  });

  it('does not mutate the entries it was given', () => {
    const entry = { name: 'Anna', group: 'Reds' };
    assignRacers([entry]);
    expect(entry).toEqual({ name: 'Anna', group: 'Reds' });
  });
});
