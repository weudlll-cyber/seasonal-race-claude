// ============================================================
// File:        raceShortKey.test.js
// Path:        client/src/modules/raceShortKey.test.js
// Project:     RaceArena — RACE-HISTORY-4
// Description: The short key's alphabet and reader.
//
//              ★ THE PROPERTY THAT MATTERS: a mistyped key is REFUSED, never folded onto another
//              valid key. Folding is what would show somebody a race they did not ask for.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  SHORT_KEY_ALPHABET,
  SHORT_KEY_LENGTH,
  normalizeShortKey,
  looksLikeShortKey,
} from './raceShortKey.js';

describe('the alphabet', () => {
  it('★ contains NEITHER member of each confusable pair', () => {
    // Both halves are gone, so there is nothing to fold and nothing to fold wrongly.
    for (const ch of ['0', 'O', '1', 'I', 'L']) {
      expect(SHORT_KEY_ALPHABET.includes(ch), `${ch} must not be in the alphabet`).toBe(false);
    }
  });

  it('has no duplicates and is all upper case', () => {
    expect(new Set(SHORT_KEY_ALPHABET).size).toBe(SHORT_KEY_ALPHABET.length);
    expect(SHORT_KEY_ALPHABET).toBe(SHORT_KEY_ALPHABET.toUpperCase());
  });

  it('is large enough that six characters is a big space', () => {
    // 31^6 ≈ 887 million. The number is not asserted; the property is that it is not small.
    expect(SHORT_KEY_ALPHABET.length ** SHORT_KEY_LENGTH).toBeGreaterThan(100_000_000);
  });
});

describe('normalizeShortKey', () => {
  it('accepts a key as issued', () => {
    expect(normalizeShortKey('ABC234')).toBe('ABC234');
  });

  it('forgives case, surrounding space, and the separators people write keys with', () => {
    for (const typed of ['abc234', ' ABC234 ', 'ABC-234', 'abc 234', 'a b c 2 3 4']) {
      expect(normalizeShortKey(typed), typed).toBe('ABC234');
    }
  });

  it('★ REFUSES a character outside the alphabet rather than guessing what was meant', () => {
    // A person who types O where the key has Q gets an error — not a different, valid key.
    for (const bad of ['ABC23O', 'ABC23I', 'ABC231', 'ABC230', 'ABC23L']) {
      expect(normalizeShortKey(bad), bad).toBeNull();
    }
  });

  it('refuses the wrong length', () => {
    expect(normalizeShortKey('ABC23')).toBeNull();
    expect(normalizeShortKey('ABC2345')).toBeNull();
    expect(normalizeShortKey('')).toBeNull();
  });

  it('refuses anything that is not a string', () => {
    for (const bad of [null, undefined, 42, {}, []]) expect(normalizeShortKey(bad)).toBeNull();
  });

  it('does not mistake a seed or a long identifier for a key', () => {
    expect(looksLikeShortKey('4242')).toBe(false);
    expect(looksLikeShortKey('RA1-eyJhIjoid2lsZCJ9')).toBe(false);
  });

  it('looksLikeShortKey is a SHAPE test and says nothing about existence', () => {
    // A well-formed key that names no race is still well-formed. Only the server can say more.
    expect(looksLikeShortKey('ZZZZZZ')).toBe(true);
  });
});
