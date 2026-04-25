// ============================================================
// File:        coatAssignment.test.js
// Path:        client/src/modules/racer-types/coatAssignment.test.js
// Project:     RaceArena
// Description: Tests for deterministic coat assignment — djb2 hash
//              and coat selection from player name.
// ============================================================

import { describe, it, expect } from 'vitest';
import { hashStringToInt, assignCoat } from './coatAssignment.js';

const ELEVEN_COATS = Array.from({ length: 11 }, (_, i) => ({ id: `coat${i}` }));

describe('hashStringToInt', () => {
  it('is deterministic: same string produces the same integer', () => {
    expect(hashStringToInt('Alice')).toBe(hashStringToInt('Alice'));
    expect(hashStringToInt('Bob the racer')).toBe(hashStringToInt('Bob the racer'));
  });

  it('produces different values for different strings', () => {
    const values = new Set(['Alice', 'Bob', 'Charlie', 'Dave', 'Eve'].map(hashStringToInt));
    expect(values.size).toBe(5);
  });

  it('always returns a non-negative integer', () => {
    for (const name of ['Alice', '', 'zzzzzzzzzzzzzzz', '123', '!@#$%']) {
      const h = hashStringToInt(name);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(h)).toBe(true);
    }
  });

  it('distribution: 100 names use at least 9 of 11 buckets', () => {
    const seen = new Set();
    for (let i = 0; i < 100; i++) {
      seen.add(hashStringToInt(`player${i}`) % 11);
    }
    expect(seen.size).toBeGreaterThanOrEqual(9);
  });
});

describe('assignCoat', () => {
  it('is deterministic: same name always returns the same coatId', () => {
    expect(assignCoat('Alice', ELEVEN_COATS)).toBe(assignCoat('Alice', ELEVEN_COATS));
    expect(assignCoat('Bob', ELEVEN_COATS)).toBe(assignCoat('Bob', ELEVEN_COATS));
  });

  it('empty string returns the first coat', () => {
    expect(assignCoat('', ELEVEN_COATS)).toBe(ELEVEN_COATS[0].id);
  });

  it('null returns the first coat', () => {
    expect(assignCoat(null, ELEVEN_COATS)).toBe(ELEVEN_COATS[0].id);
  });

  it('undefined returns the first coat', () => {
    expect(assignCoat(undefined, ELEVEN_COATS)).toBe(ELEVEN_COATS[0].id);
  });

  it('different names mostly get different coats — at least 8 distinct coats in 20 names', () => {
    const names = Array.from({ length: 20 }, (_, i) => `Player ${i}`);
    const assigned = new Set(names.map((n) => assignCoat(n, ELEVEN_COATS)));
    expect(assigned.size).toBeGreaterThanOrEqual(8);
  });
});
