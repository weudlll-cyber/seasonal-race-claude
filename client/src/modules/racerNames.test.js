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
