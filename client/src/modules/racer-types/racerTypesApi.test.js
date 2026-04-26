// ============================================================
// File:        racerTypesApi.test.js
// Path:        client/src/modules/racer-types/racerTypesApi.test.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Tests for the B7 racer-type override API:
//              listAllRacerTypes, getRacerTypeById,
//              setRacerTypeOverride, resetRacerTypeOverride.
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./spriteLoader.js', () => ({
  getCachedSprite: vi.fn(),
  loadSprite: vi.fn().mockResolvedValue({}),
  _clearSpriteCache: vi.fn(),
}));

vi.mock('./spriteTinter.js', () => {
  const getCoatVariants = vi.fn().mockResolvedValue(new Map());
  getCoatVariants.cached = vi.fn();
  return {
    getCoatVariants,
    tintSprite: vi.fn().mockReturnValue({}),
    tintSpriteWithMask: vi.fn().mockReturnValue({}),
    _clearTintCache: vi.fn(),
    _clearMaskedTintCache: vi.fn(),
  };
});

import {
  listAllRacerTypes,
  getRacerTypeById,
  setRacerTypeOverride,
  resetRacerTypeOverride,
  RACER_TYPE_IDS,
  HorseRacerType,
} from './index.js';

beforeEach(() => {
  localStorage.clear();
});

describe('listAllRacerTypes', () => {
  it('returns an entry for every registered type', () => {
    const list = listAllRacerTypes();
    expect(list).toHaveLength(RACER_TYPE_IDS.length);
    expect(list.map((t) => t.id).sort()).toEqual([...RACER_TYPE_IDS].sort());
  });

  it('all types are active by default (no overrides)', () => {
    const list = listAllRacerTypes();
    for (const t of list) {
      expect(t.isActive, `${t.id} should be active`).toBe(true);
    }
  });

  it('reflects a disabled override', () => {
    setRacerTypeOverride('snail', false);
    const list = listAllRacerTypes();
    const snail = list.find((t) => t.id === 'snail');
    expect(snail.isActive).toBe(false);
  });

  it('each entry has id, name, emoji, speedMultiplier, isActive', () => {
    const [first] = listAllRacerTypes();
    expect(typeof first.id).toBe('string');
    expect(typeof first.name).toBe('string');
    expect(typeof first.emoji).toBe('string');
    expect(typeof first.speedMultiplier).toBe('number');
    expect(typeof first.isActive).toBe('boolean');
  });
});

describe('getRacerTypeById', () => {
  it('returns the correct type instance', () => {
    expect(getRacerTypeById('horse')).toBe(HorseRacerType);
  });

  it('falls back to HorseRacerType for unknown ids', () => {
    expect(getRacerTypeById('unknown-xyz')).toBe(HorseRacerType);
  });

  it('returns correct type for all 12 ids', () => {
    for (const id of RACER_TYPE_IDS) {
      const rt = getRacerTypeById(id);
      expect(rt, `${id}: should return a type`).toBeTruthy();
      expect(rt.config.id, `${id}: config.id mismatch`).toBe(id);
    }
  });
});

describe('setRacerTypeOverride', () => {
  it('disabling a type persists to localStorage', () => {
    setRacerTypeOverride('duck', false);
    const raw = JSON.parse(localStorage.getItem('racearena:racerTypeOverrides'));
    expect(raw.duck).toBe(false);
  });

  it('re-enabling removes the override entry', () => {
    setRacerTypeOverride('duck', false);
    setRacerTypeOverride('duck', true);
    const raw = JSON.parse(localStorage.getItem('racearena:racerTypeOverrides'));
    expect(raw).not.toHaveProperty('duck');
  });

  it('isActive reflects the override in listAllRacerTypes', () => {
    setRacerTypeOverride('rocket', false);
    const rocket = listAllRacerTypes().find((t) => t.id === 'rocket');
    expect(rocket.isActive).toBe(false);

    setRacerTypeOverride('rocket', true);
    const rocketAfter = listAllRacerTypes().find((t) => t.id === 'rocket');
    expect(rocketAfter.isActive).toBe(true);
  });
});

describe('resetRacerTypeOverride', () => {
  it('removes the override for the given id', () => {
    setRacerTypeOverride('horse', false);
    resetRacerTypeOverride('horse');
    const raw = JSON.parse(localStorage.getItem('racearena:racerTypeOverrides') ?? '{}');
    expect(raw).not.toHaveProperty('horse');
  });

  it('restores isActive to true after disable + reset', () => {
    setRacerTypeOverride('plane', false);
    resetRacerTypeOverride('plane');
    const plane = listAllRacerTypes().find((t) => t.id === 'plane');
    expect(plane.isActive).toBe(true);
  });

  it('is a no-op for a type with no override', () => {
    expect(() => resetRacerTypeOverride('giraffe')).not.toThrow();
    const giraffe = listAllRacerTypes().find((t) => t.id === 'giraffe');
    expect(giraffe.isActive).toBe(true);
  });
});
