// ============================================================
// File:        racer-types.integration.test.js
// Path:        client/src/modules/racer-types/racer-types.integration.test.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Cross-type integration tests for all 12 racer types (D3.5.3).
//              Validates invariants that must hold across the entire registry.
// ============================================================

import { describe, test, expect } from 'vitest';
import {
  RACER_TYPES,
  COATS_BY_TYPE,
  warmUpAllRacerTypes,
  _resetWarmUpForTesting,
} from './index.js';

const EXPECTED_IDS = [
  'horse',
  'duck',
  'snail',
  'elephant',
  'giraffe',
  'snake',
  'dragon',
  'f1',
  'rocket',
  'buggy',
  'motorbike',
  'plane',
];

describe('Racer-Types Registry — D3.5.3 Integration', () => {
  test('registry contains all 12 expected racer types', () => {
    expect(Object.keys(RACER_TYPES).sort()).toEqual(EXPECTED_IDS.sort());
  });

  test('all types have unique ids', () => {
    const ids = Object.values(RACER_TYPES).map((t) => t.config.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('registry key matches config.id for every type', () => {
    for (const [key, type] of Object.entries(RACER_TYPES)) {
      expect(type.config.id).toBe(key);
    }
  });

  test('all types have exactly 11 coats', () => {
    for (const [id, type] of Object.entries(RACER_TYPES)) {
      expect(type.config.coats, `${id}: coat count`).toHaveLength(11);
    }
  });

  test('every type has exactly one base coat (tint: null)', () => {
    for (const [id, type] of Object.entries(RACER_TYPES)) {
      const baseCoats = type.config.coats.filter((c) => c.tint === null);
      expect(baseCoats, `${id}: null-tint count`).toHaveLength(1);
    }
  });

  test('all coat objects have id, name, and tint fields', () => {
    for (const [id, type] of Object.entries(RACER_TYPES)) {
      for (const coat of type.config.coats) {
        expect(typeof coat.id, `${id}/${coat.id}: id type`).toBe('string');
        expect(typeof coat.name, `${id}/${coat.id}: name type`).toBe('string');
        expect(
          coat.tint === null || typeof coat.tint === 'string',
          `${id}/${coat.id}: tint type`
        ).toBe(true);
      }
    }
  });

  test('mask-tinted types have valid maskUrl', () => {
    for (const [id, type] of Object.entries(RACER_TYPES)) {
      if (type.config.tintMode === 'mask') {
        expect(type.config.maskUrl, `${id}: maskUrl`).toBeTruthy();
        expect(typeof type.config.maskUrl, `${id}: maskUrl type`).toBe('string');
      }
    }
  });

  test('mask-tinted types are buggy, motorbike, plane', () => {
    const maskTypes = Object.entries(RACER_TYPES)
      .filter(([, t]) => t.config.tintMode === 'mask')
      .map(([id]) => id)
      .sort();
    expect(maskTypes).toEqual(['buggy', 'motorbike', 'plane']);
  });

  test('all types have valid spriteUrl pointing to /assets/racers/', () => {
    for (const [id, type] of Object.entries(RACER_TYPES)) {
      expect(type.config.spriteUrl, `${id}: spriteUrl`).toMatch(/^\/assets\/racers\/.+\.png$/);
    }
  });

  test('dragon has frameCount === 16 (unique among all types)', () => {
    expect(RACER_TYPES.dragon.config.frameCount).toBe(16);
    const others = Object.entries(RACER_TYPES).filter(([id]) => id !== 'dragon');
    for (const [id, type] of others) {
      expect(type.config.frameCount, `${id}: frameCount should not be 16`).not.toBe(16);
    }
  });

  test('COATS_BY_TYPE has entry for every registered type', () => {
    expect(Object.keys(COATS_BY_TYPE).sort()).toEqual(Object.keys(RACER_TYPES).sort());
  });

  test('COATS_BY_TYPE values match config.coats', () => {
    for (const [id, coats] of Object.entries(COATS_BY_TYPE)) {
      expect(coats).toBe(RACER_TYPES[id].config.coats);
    }
  });

  test('warmUpAllRacerTypes is idempotent', () => {
    expect(() => {
      warmUpAllRacerTypes();
      warmUpAllRacerTypes();
    }).not.toThrow();
  });

  test('warmUpAllRacerTypes re-runs after reset', () => {
    _resetWarmUpForTesting();
    expect(() => warmUpAllRacerTypes()).not.toThrow();
  });
});
