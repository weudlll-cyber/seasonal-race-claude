// ============================================================
// File:        raceNumbers.test.js
// Path:        client/src/modules/raceNumbers.test.js
// Project:     RaceArena — RACE-NUMBERS-1
//
// WHAT THIS GUARDS: that the start-number draw is a permutation, is reproducible from the seed, and
// — the one that matters most — CANNOT SHIFT THE RACE.
//
// In this project the race is a sequence of draws off one seeded generator, so a single extra call
// upstream shifts every later draw. A numbering that consumed from that stream would silently decide
// who wins: the race would still be deterministic and still reproducible, just a DIFFERENT race than
// the same seed produced yesterday. That is the failure this file exists to make impossible.
//
// R7's two questions are answered at each test.
// ============================================================

import { describe, it, expect } from 'vitest';
import { assignRaceNumbers, raceNumberLabel } from './raceNumbers.js';
import { mulberry32 } from './racePlanner.js';

describe('the draw cannot shift the race (RACE-NUMBERS-1)', () => {
  // What breaks if deleted: someone could "simplify" the numbering onto the race's own rng.
  // What goes unnoticed: everything that matters. Races stay deterministic and reproducible, so
  // nothing looks broken — they are simply different races than the seed used to produce, and every
  // measurement taken before the change silently stops applying.
  it('consumes nothing from a generator handed to it — it has no way to', () => {
    // The proof is structural: assignRaceNumbers takes no rng argument at all, so there is no
    // parameter through which it could advance a shared stream. This pins that signature.
    expect(assignRaceNumbers.length).toBe(2);
  });

  it('leaves an independent generator at exactly the position it was', () => {
    // Stand in for the race's stream: draw ten values, run the numbering, draw ten more, and require
    // the second ten to be what they would have been with no numbering at all.
    const control = mulberry32(5601);
    const expected = Array.from({ length: 20 }, () => control());

    const live = mulberry32(5601);
    const first = Array.from({ length: 10 }, () => live());
    assignRaceNumbers(40, 5601);
    const second = Array.from({ length: 10 }, () => live());

    expect([...first, ...second]).toEqual(expected);
  });

  it('does not touch Math.random either — the unseeded race runs on it', () => {
    // An unseeded race (seed <= 0) draws from Math.random directly, so a "fall back to Math.random"
    // implementation would consume from the race's stream in exactly the case it thought was safe.
    const real = Math.random;
    let calls = 0;
    Math.random = () => {
      calls++;
      return real();
    };
    try {
      assignRaceNumbers(40, 0);
      assignRaceNumbers(40, -1);
      assignRaceNumbers(40, 5601);
    } finally {
      Math.random = real;
    }
    expect(calls).toBe(0);
  });
});

describe('every racer gets a number and no two share one (RACE-NUMBERS-1)', () => {
  // What breaks if deleted: a duplicate or a gap could appear.
  // What goes unnoticed: two racers wearing the same number. The picture looks correct — every racer
  // has a label — and the one thing the number exists for, telling two racers apart, is gone.
  it('is a permutation of 1..N, for every field size the game allows', () => {
    for (const n of [1, 2, 20, 40, 60, 100]) {
      const nums = assignRaceNumbers(n, 5601);
      expect(nums).toHaveLength(n);
      expect(new Set(nums).size).toBe(n);
      expect([...nums].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i + 1));
    }
  });

  it('is reproducible from the seed, and different seeds give different draws', () => {
    expect(assignRaceNumbers(40, 5601)).toEqual(assignRaceNumbers(40, 5601));
    expect(assignRaceNumbers(40, 5601)).not.toEqual(assignRaceNumbers(40, 5602));
  });

  it('survives the degenerate inputs a live screen can produce', () => {
    expect(assignRaceNumbers(0, 5601)).toEqual([]);
    expect(assignRaceNumbers(-3, 5601)).toEqual([]);
    expect(assignRaceNumbers(NaN, 5601)).toEqual([]);
    // An unseeded race still gets a valid permutation, just a fixed one.
    expect(new Set(assignRaceNumbers(40, 0)).size).toBe(40);
  });
});

describe('the label never exceeds three characters (RACE-NUMBERS-1)', () => {
  // What breaks if deleted: the label could grow.
  // What goes unnoticed: the entire point of the design. A wide label stops pointing at the racer
  // under it, which is the defect ROLL-CALL-PAIRING-1 measured and this whole direction exists to
  // avoid — and it would come back gradually, as fields grow, rather than all at once.
  it('is at most three characters for every number the game can produce', () => {
    for (const n of [1, 9, 10, 99, 100]) {
      expect(raceNumberLabel(n).length).toBeLessThanOrEqual(3);
    }
  });

  it('stays at three even if a field ever exceeded the cap', () => {
    // The promise holds by construction rather than by arithmetic that happens to be true today.
    expect(raceNumberLabel(1000).length).toBeLessThanOrEqual(3);
    expect(raceNumberLabel(123456).length).toBeLessThanOrEqual(3);
  });

  it('renders nothing rather than "null" when there is no number', () => {
    expect(raceNumberLabel(null)).toBe('');
    expect(raceNumberLabel(undefined)).toBe('');
    expect(raceNumberLabel(NaN)).toBe('');
  });
});
