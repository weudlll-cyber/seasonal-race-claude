// ============================================================
// File:        racer-types.integration.test.js
// Path:        client/src/modules/racer-types/racer-types.integration.test.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Cross-type integration tests for all 20 racer types
//              (D3.5.3 + luge + beetle + boarder + koi + turtle + manta + dolphin
//              + snowmobile).
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
  'luge',
  'beetle',
  'boarder',
  'koi',
  'turtle',
  'manta',
  'dolphin',
  'snowmobile',
];

describe('Racer-Types Registry — D3.5.3 Integration', () => {
  test('registry contains all 20 expected racer types', () => {
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

  test('each type has the expected coat count', () => {
    const VEHICLE_IDS = new Set(['buggy', 'f1', 'motorbike', 'plane', 'rocket']);
    const CUSTOM_17 = new Set(['luge', 'beetle', 'boarder']);
    const AQUATIC_18 = new Set(['turtle', 'dolphin']);
    for (const [id, type] of Object.entries(RACER_TYPES)) {
      let expected;
      if (id === 'koi' || id === 'snowmobile') expected = 16;
      else if (id === 'manta') expected = 9;
      else if (AQUATIC_18.has(id)) expected = 18;
      else if (CUSTOM_17.has(id)) expected = 17;
      else if (VEHICLE_IDS.has(id)) expected = 20;
      else expected = 11;
      expect(type.config.coats, `${id}: coat count`).toHaveLength(expected);
    }
  });

  test('standard types have exactly one base coat (tint: null); explicit-tint types have none', () => {
    // koi/turtle/manta/dolphin/snowmobile use explicit tints on all coats — no null-tint base coat.
    const NO_NULL_TINT = new Set(['koi', 'turtle', 'manta', 'dolphin', 'snowmobile']);
    for (const [id, type] of Object.entries(RACER_TYPES)) {
      const baseCoats = type.config.coats.filter((c) => c.tint === null);
      if (NO_NULL_TINT.has(id)) {
        expect(baseCoats, `${id}: should have no null-tint coat`).toHaveLength(0);
      } else {
        expect(baseCoats, `${id}: null-tint count`).toHaveLength(1);
      }
    }
  });

  test('koi: all coats use per-coat patternMask', () => {
    expect(RACER_TYPES.koi.config.coats.every((c) => c.patternMask)).toBe(true);
  });

  test('turtle: all coats have patternMask and borderMask', () => {
    for (const coat of RACER_TYPES.turtle.config.coats) {
      expect(coat.patternMask).toBeTruthy();
      expect(coat.borderMask).toBeTruthy();
    }
  });

  test('manta and dolphin: all coats have tint, patchTint, and patternMask', () => {
    for (const id of ['manta', 'dolphin']) {
      for (const coat of RACER_TYPES[id].config.coats) {
        expect(typeof coat.tint).toBe('string');
        expect(typeof coat.patchTint).toBe('string');
        expect(typeof coat.patternMask).toBe('string');
      }
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

  test('mask-tinted types have a global maskUrl or per-coat patternMask on every coat', () => {
    for (const [id, type] of Object.entries(RACER_TYPES)) {
      if (type.config.tintMode !== 'mask') continue;
      const hasGlobal = !!type.config.maskUrl;
      const hasPerCoat = type.config.coats?.every((c) => c.patternMask);
      expect(hasGlobal || hasPerCoat, `${id}: maskUrl or patternMask`).toBe(true);
    }
  });

  test('mask-tinted types are buggy, dolphin, koi, manta, motorbike, plane, turtle', () => {
    const maskTypes = Object.entries(RACER_TYPES)
      .filter(([, t]) => t.config.tintMode === 'mask')
      .map(([id]) => id)
      .sort();
    expect(maskTypes).toEqual(['buggy', 'dolphin', 'koi', 'manta', 'motorbike', 'plane', 'turtle']);
  });

  test('all types have valid spriteUrl pointing to /assets/racers/', () => {
    for (const [id, type] of Object.entries(RACER_TYPES)) {
      expect(type.config.spriteUrl, `${id}: spriteUrl`).toMatch(/^\/assets\/racers\/.+\.png$/);
    }
  });

  test('dragon, koi, luge, turtle, manta, dolphin, snowmobile have frameCount === 16; all other types do not', () => {
    const FC16 = new Set(['dragon', 'koi', 'luge', 'turtle', 'manta', 'dolphin', 'snowmobile']);
    for (const [id, type] of Object.entries(RACER_TYPES)) {
      if (FC16.has(id)) {
        expect(type.config.frameCount, `${id}: frameCount`).toBe(16);
      } else {
        expect(type.config.frameCount, `${id}: frameCount should not be 16`).not.toBe(16);
      }
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

  test('snowmobile: all 16 coats have non-null tint (multiply mode, no base coat)', () => {
    expect(RACER_TYPES.snowmobile.config.coats).toHaveLength(16);
    for (const coat of RACER_TYPES.snowmobile.config.coats) {
      expect(typeof coat.tint).toBe('string');
    }
  });
});
