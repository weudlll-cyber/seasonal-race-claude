// ============================================================
// File:        standardCoats.test.js
// Path:        client/src/modules/racer-types/standardCoats.test.js
// Project:     RaceArena
// Created:     2026-05-30
// Description: Unit tests for STANDARD_COAT_PALETTE.
// ============================================================

import { describe, it, expect } from 'vitest';
import { STANDARD_COAT_PALETTE } from './standardCoats.js';

const HEX_RE = /^#[0-9a-f]{6}$/;

describe('STANDARD_COAT_PALETTE', () => {
  it('has exactly 20 entries', () => {
    expect(STANDARD_COAT_PALETTE).toHaveLength(20);
  });

  it('first entry is the base coat (tint: null)', () => {
    expect(STANDARD_COAT_PALETTE[0].id).toBe('base');
    expect(STANDARD_COAT_PALETTE[0].tint).toBeNull();
  });

  it('all non-base entries have valid lowercase 6-digit hex tint strings', () => {
    for (const coat of STANDARD_COAT_PALETTE) {
      if (coat.tint === null) continue;
      expect(coat.tint, `${coat.id}: tint`).toMatch(HEX_RE);
    }
  });

  it('exactly one entry has tint: null', () => {
    const nullTints = STANDARD_COAT_PALETTE.filter((c) => c.tint === null);
    expect(nullTints).toHaveLength(1);
  });

  it('all ids are unique', () => {
    const ids = STANDARD_COAT_PALETTE.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all entries have id, name, and tint fields', () => {
    for (const coat of STANDARD_COAT_PALETTE) {
      expect(typeof coat.id, `${coat.id}: id type`).toBe('string');
      expect(typeof coat.name, `${coat.id}: name type`).toBe('string');
      expect(coat.tint === null || typeof coat.tint === 'string', `${coat.id}: tint type`).toBe(
        true
      );
    }
  });
});
