// ============================================================
// File:        racerNames.test.js
// Path:        client/src/modules/racerNames.test.js
// Project:     RaceArena — QUICKTEST-NAMES-1
//
// WHAT THIS GUARDS: that adding two rosters did not touch the shipped one, and that each roster
// keeps its own order.
//
// WHY IT IS WORTH MORE THAN IT LOOKS. A racer's name is an ENGINE INPUT — `stablePairBit` hashes
// `r.name` into the avoidance tie-break, and renaming a roster once changed the finishing order in
// 24 of 24 races and the winner in 14 of 24. So a leak from a new list into the default path is not
// a cosmetic bug: it silently changes who wins, and the golden parity runner reads the same list, so
// the test whose job is to catch divergence would be the one lying.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  QUICK_TEST_NAMES,
  QUICK_TEST_NAMES_LONG,
  QUICK_TEST_NAMES_MIXED,
  QUICK_TEST_NAME_SETS,
  DEFAULT_NAME_SET,
  resolveNameSet,
  identifyNameSet,
} from './racerNames.js';

describe('the default path cannot be reached by a new roster (QUICKTEST-NAMES-1)', () => {
  // What breaks if deleted: a new set could become the default and every race would change.
  // What goes unnoticed: exactly that — the races would still run, still look fine, and the
  // winners would be different. There is no symptom to notice.
  it('resolves the default to the ORIGINAL ARRAY BY IDENTITY, not merely an equal one', () => {
    expect(resolveNameSet(DEFAULT_NAME_SET)).toBe(QUICK_TEST_NAMES);
    expect(resolveNameSet('current')).toBe(QUICK_TEST_NAMES);
  });

  it('falls back to the original for anything unrecognised, missing or malformed', () => {
    // Every one of these is a value the selector could produce after a rename, a stale stored
    // preference, or a hand-edited localStorage entry.
    for (const bad of [undefined, null, '', 'nonsense', 'Current', 'LONG', 0, false]) {
      expect(resolveNameSet(bad)).toBe(QUICK_TEST_NAMES);
    }
  });

  it('keeps the shipped roster free of every new name', () => {
    const shipped = new Set(QUICK_TEST_NAMES);
    for (const n of QUICK_TEST_NAMES_LONG) expect(shipped.has(n)).toBe(false);
    for (const n of QUICK_TEST_NAMES_MIXED) expect(shipped.has(n)).toBe(false);
  });

  it('still starts exactly where it always started', () => {
    // The first entries are pinned because ORDER is what the engine consumes: racer i takes name i.
    // If a new set were ever prepended or the list re-sorted, this is what would catch it.
    expect(QUICK_TEST_NAMES.slice(0, 5)).toEqual(['Turbo', 'Blaze', 'Rocket', 'Flash', 'Speedy']);
    expect(QUICK_TEST_NAMES[QUICK_TEST_NAMES.length - 1]).toBe('Mamba');
    expect(QUICK_TEST_NAMES).toHaveLength(70);
  });
});

describe('each roster keeps its own order (QUICKTEST-NAMES-1)', () => {
  // What breaks if deleted: a well-meaning sort or de-duplication of any list.
  // What goes unnoticed: every race run on that set becomes irreproducible against every
  // measurement taken before the change — including the sweep this block exists to produce.
  const sets = [
    ['current', QUICK_TEST_NAMES],
    ['long', QUICK_TEST_NAMES_LONG],
    ['mixed', QUICK_TEST_NAMES_MIXED],
  ];

  it('is not sorted — order is load-bearing, so alphabetical order would be evidence of a tidy-up', () => {
    for (const [name, list] of sets) {
      const sorted = [...list].sort();
      expect(list, `${name} must not be in alphabetical order`).not.toEqual(sorted);
    }
  });

  it('contains no duplicates, in any set', () => {
    for (const [name, list] of sets) {
      expect(new Set(list).size, `${name} has a duplicate`).toBe(list.length);
    }
  });

  it('pins the first and last entry of each set, which is what an index maps to', () => {
    expect(QUICK_TEST_NAMES_LONG[0]).toBe('Konstantin Brandner');
    expect(QUICK_TEST_NAMES_LONG[QUICK_TEST_NAMES_LONG.length - 1]).toBe('Philomena Ashgrove');
    expect(QUICK_TEST_NAMES_MIXED[0]).toBe('Al');
    expect(QUICK_TEST_NAMES_MIXED[QUICK_TEST_NAMES_MIXED.length - 1]).toBe('Noor');
  });

  it('holds the length profile the sweep measured, so the numbers stay attributable', () => {
    const len = (a) => a.map((n) => n.length);
    expect(Math.max(...len(QUICK_TEST_NAMES))).toBe(8);
    expect(Math.min(...len(QUICK_TEST_NAMES_LONG))).toBeGreaterThanOrEqual(15);
    // Every entry stays inside the cap the Players input enforces, or the roster would measure a
    // case the product cannot produce.
    for (const [name, list] of sets) {
      for (const n of list) {
        expect(n.length, `${name}: "${n}" exceeds the 32-character input cap`).toBeLessThanOrEqual(
          32
        );
      }
    }
  });

  it('offers exactly the three sets the selector offers', () => {
    expect(Object.keys(QUICK_TEST_NAME_SETS).sort()).toEqual(['current', 'long', 'mixed']);
  });
});

// ── PERF-WHERE-1 ─────────────────────────────────────────────────────────────────────────────────
describe('a live field can say which roster it is running (PERF-WHERE-1)', () => {
  const fieldOf = (list, n) =>
    Array.from({ length: n }, (_, i) => ({ name: list[i % list.length] }));

  // What breaks if deleted: a perf log would name the wrong roster, and the whole point of the
  // context block is that two logs become comparable. A WRONG label is worse than none.
  it('names each roster from the names alone, at a field it fills exactly', () => {
    for (const [key, list] of Object.entries(QUICK_TEST_NAME_SETS)) {
      expect(identifyNameSet(fieldOf(list, list.length))).toBe(key);
    }
  });

  it('still names it when the field is larger than the list and the names wrap', () => {
    // 100 racers against the 70-entry shipped roster is the ordinary quick-test case.
    expect(identifyNameSet(fieldOf(QUICK_TEST_NAMES, 100))).toBe('current');
    expect(identifyNameSet(fieldOf(QUICK_TEST_NAMES_LONG, 140))).toBe('long');
  });

  it('accepts a plain array of strings as well as racer objects', () => {
    expect(identifyNameSet(QUICK_TEST_NAMES_MIXED.slice(0, 10))).toBe('mixed');
  });

  it('answers `custom` for real player names rather than guessing the nearest roster', () => {
    // The ordinary case the moment a person joins a quick test. Guessing here would put a roster
    // name on a log that has none, which is exactly the kind of confident wrong answer the context
    // block exists to prevent.
    expect(identifyNameSet([{ name: 'Turbo' }, { name: 'Weudl' }])).toBe('custom');
    expect(identifyNameSet([{ name: 'Weudl' }])).toBe('custom');
  });

  it('answers `none` for an empty field or one with no names at all', () => {
    // Racers built by `createRaceFromIdentity` carry NO name — every measurement harness in this
    // repo starts from that state — so `none` is a real answer, not an error path.
    expect(identifyNameSet([])).toBe('none');
    expect(identifyNameSet(null)).toBe('none');
    expect(identifyNameSet([{ index: 0 }, { index: 1 }])).toBe('none');
  });

  it('is not fooled by the right names in the wrong ORDER', () => {
    // Order is load-bearing for this file, so a reversed roster is a DIFFERENT race and must not be
    // reported as the shipped one.
    const reversed = [...QUICK_TEST_NAMES].reverse().map((name) => ({ name }));
    expect(identifyNameSet(reversed)).toBe('custom');
  });
});
