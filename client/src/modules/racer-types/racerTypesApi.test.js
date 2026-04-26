// ============================================================
// File:        racerTypesApi.test.js
// Path:        client/src/modules/racer-types/racerTypesApi.test.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Tests for the racer-type override API:
//              listAllRacerTypes, getRacerTypeById,
//              setRacerTypeOverride, resetRacerTypeOverride,
//              normalizeOverrideMap, CONFIG_SNAPSHOT, applyTunableOverride,
//              restoreTunableDefault (D3.5.5 additions).
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
  normalizeOverrideMap,
  CONFIG_SNAPSHOT,
  TUNABLE_FIELDS,
  applyTunableOverride,
  restoreTunableDefault,
  RACER_TYPE_IDS,
  RACER_TYPES,
  HorseRacerType,
} from './index.js';

beforeEach(() => {
  localStorage.clear();
  // Restore snapshot values to live config so each test starts clean
  for (const id of RACER_TYPE_IDS) {
    for (const f of TUNABLE_FIELDS) {
      restoreTunableDefault(id, f);
    }
  }
});

// ── normalizeOverrideMap ──────────────────────────────────────────────────

describe('normalizeOverrideMap', () => {
  it('converts legacy { id: false } to { id: { isActive: false } }', () => {
    const result = normalizeOverrideMap({ snail: false });
    expect(result.snail).toEqual({ isActive: false });
  });

  it('passes through already-object entries unchanged', () => {
    const result = normalizeOverrideMap({ horse: { speedMultiplier: 1.2 } });
    expect(result.horse).toEqual({ speedMultiplier: 1.2 });
  });

  it('ignores non-false primitives', () => {
    const result = normalizeOverrideMap({ duck: true });
    expect(result).not.toHaveProperty('duck');
  });

  it('handles empty map', () => {
    expect(normalizeOverrideMap({})).toEqual({});
  });

  it('handles null/undefined input gracefully', () => {
    expect(normalizeOverrideMap(null)).toEqual({});
    expect(normalizeOverrideMap(undefined)).toEqual({});
  });
});

// ── CONFIG_SNAPSHOT ───────────────────────────────────────────────────────

describe('CONFIG_SNAPSHOT', () => {
  it('has an entry for every registered type', () => {
    expect(Object.keys(CONFIG_SNAPSHOT).sort()).toEqual([...RACER_TYPE_IDS].sort());
  });

  it('captures all TUNABLE_FIELDS for each type', () => {
    for (const id of RACER_TYPE_IDS) {
      for (const f of TUNABLE_FIELDS) {
        expect(CONFIG_SNAPSHOT[id]).toHaveProperty(f);
      }
    }
  });

  it('horse speedMultiplier snapshot matches HorseRacerType config', () => {
    expect(CONFIG_SNAPSHOT.horse.speedMultiplier).toBe(1.0);
  });

  it('snail speedMultiplier snapshot is 0.30', () => {
    expect(CONFIG_SNAPSHOT.snail.speedMultiplier).toBe(0.3);
  });

  it('snapshot is frozen (immutable)', () => {
    expect(Object.isFrozen(CONFIG_SNAPSHOT)).toBe(true);
    expect(Object.isFrozen(CONFIG_SNAPSHOT.horse)).toBe(true);
  });
});

// ── listAllRacerTypes ─────────────────────────────────────────────────────

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

  it('reflects a disabled override (new schema)', () => {
    setRacerTypeOverride('snail', 'isActive', false);
    const snail = listAllRacerTypes().find((t) => t.id === 'snail');
    expect(snail.isActive).toBe(false);
  });

  it('reflects a disabled override (legacy schema migrated)', () => {
    // Simulate pre-D3.5.5 storage
    localStorage.setItem('racearena:racerTypeOverrides', JSON.stringify({ snail: false }));
    const snail = listAllRacerTypes().find((t) => t.id === 'snail');
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

// ── getRacerTypeById ──────────────────────────────────────────────────────

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

// ── setRacerTypeOverride ──────────────────────────────────────────────────

describe('setRacerTypeOverride', () => {
  it('disabling a type (isActive=false) persists to localStorage in new schema', () => {
    setRacerTypeOverride('duck', 'isActive', false);
    const raw = JSON.parse(localStorage.getItem('racearena:racerTypeOverrides'));
    expect(raw.duck).toEqual({ isActive: false });
  });

  it('re-enabling (isActive=true) removes the isActive field', () => {
    setRacerTypeOverride('duck', 'isActive', false);
    setRacerTypeOverride('duck', 'isActive', true);
    const raw = JSON.parse(localStorage.getItem('racearena:racerTypeOverrides'));
    expect(raw).not.toHaveProperty('duck');
  });

  it('isActive reflects the override in listAllRacerTypes', () => {
    setRacerTypeOverride('rocket', 'isActive', false);
    expect(listAllRacerTypes().find((t) => t.id === 'rocket').isActive).toBe(false);
    setRacerTypeOverride('rocket', 'isActive', true);
    expect(listAllRacerTypes().find((t) => t.id === 'rocket').isActive).toBe(true);
  });

  it('setting speedMultiplier stores value and mutates live config', () => {
    setRacerTypeOverride('horse', 'speedMultiplier', 1.5);
    const raw = JSON.parse(localStorage.getItem('racearena:racerTypeOverrides'));
    expect(raw.horse.speedMultiplier).toBe(1.5);
    expect(RACER_TYPES.horse.config.speedMultiplier).toBe(1.5);
  });

  it('setting displaySize stores and applies to live config', () => {
    setRacerTypeOverride('snail', 'displaySize', 60);
    expect(RACER_TYPES.snail.config.displaySize).toBe(60);
    const raw = JSON.parse(localStorage.getItem('racearena:racerTypeOverrides'));
    expect(raw.snail.displaySize).toBe(60);
  });

  it('setting basePeriodMs stores and applies to live config', () => {
    setRacerTypeOverride('duck', 'basePeriodMs', 200);
    expect(RACER_TYPES.duck.config.basePeriodMs).toBe(200);
  });

  it('setting leaderRingColor stores and applies', () => {
    setRacerTypeOverride('horse', 'leaderRingColor', '#ff0000');
    expect(RACER_TYPES.horse.config.leaderRingColor).toBe('#ff0000');
  });

  it('setting leaderEllipseRx stores and applies', () => {
    setRacerTypeOverride('horse', 'leaderEllipseRx', 30);
    expect(RACER_TYPES.horse.config.leaderEllipseRx).toBe(30);
  });

  it('setting leaderEllipseRy stores and applies', () => {
    setRacerTypeOverride('horse', 'leaderEllipseRy', 20);
    expect(RACER_TYPES.horse.config.leaderEllipseRy).toBe(20);
  });

  it('coexists with isActive override on the same type', () => {
    setRacerTypeOverride('snail', 'isActive', false);
    setRacerTypeOverride('snail', 'speedMultiplier', 0.5);
    const raw = JSON.parse(localStorage.getItem('racearena:racerTypeOverrides'));
    expect(raw.snail).toEqual({ isActive: false, speedMultiplier: 0.5 });
  });

  it('corrupt JSON in localStorage does not throw', () => {
    localStorage.setItem('racearena:racerTypeOverrides', 'NOT_JSON');
    expect(() => setRacerTypeOverride('horse', 'speedMultiplier', 1.2)).not.toThrow();
  });
});

// ── resetRacerTypeOverride ────────────────────────────────────────────────

describe('resetRacerTypeOverride — single field', () => {
  it('removes just the specified field override', () => {
    setRacerTypeOverride('horse', 'speedMultiplier', 1.5);
    setRacerTypeOverride('horse', 'displaySize', 60);
    resetRacerTypeOverride('horse', 'speedMultiplier');
    const raw = JSON.parse(localStorage.getItem('racearena:racerTypeOverrides'));
    expect(raw.horse).not.toHaveProperty('speedMultiplier');
    expect(raw.horse.displaySize).toBe(60);
  });

  it('restores the live config value from snapshot', () => {
    const original = CONFIG_SNAPSHOT.horse.speedMultiplier;
    setRacerTypeOverride('horse', 'speedMultiplier', 1.9);
    expect(RACER_TYPES.horse.config.speedMultiplier).toBe(1.9);
    resetRacerTypeOverride('horse', 'speedMultiplier');
    expect(RACER_TYPES.horse.config.speedMultiplier).toBe(original);
  });

  it('removes the type entry entirely when last field is reset', () => {
    setRacerTypeOverride('duck', 'displaySize', 70);
    resetRacerTypeOverride('duck', 'displaySize');
    const raw = JSON.parse(localStorage.getItem('racearena:racerTypeOverrides') ?? '{}');
    expect(raw).not.toHaveProperty('duck');
  });

  it('is a no-op for a type with no override', () => {
    expect(() => resetRacerTypeOverride('giraffe', 'speedMultiplier')).not.toThrow();
    expect(RACER_TYPES.giraffe.config.speedMultiplier).toBe(
      CONFIG_SNAPSHOT.giraffe.speedMultiplier
    );
  });
});

describe('resetRacerTypeOverride — all fields', () => {
  it('removes all overrides for the given id', () => {
    setRacerTypeOverride('horse', 'speedMultiplier', 1.5);
    setRacerTypeOverride('horse', 'isActive', false);
    resetRacerTypeOverride('horse');
    const raw = JSON.parse(localStorage.getItem('racearena:racerTypeOverrides') ?? '{}');
    expect(raw).not.toHaveProperty('horse');
  });

  it('restores isActive to true after disable + full reset', () => {
    setRacerTypeOverride('plane', 'isActive', false);
    resetRacerTypeOverride('plane');
    expect(listAllRacerTypes().find((t) => t.id === 'plane').isActive).toBe(true);
  });

  it('restores all tunable fields to code defaults', () => {
    setRacerTypeOverride('snail', 'speedMultiplier', 0.9);
    setRacerTypeOverride('snail', 'displaySize', 70);
    resetRacerTypeOverride('snail');
    expect(RACER_TYPES.snail.config.speedMultiplier).toBe(CONFIG_SNAPSHOT.snail.speedMultiplier);
    expect(RACER_TYPES.snail.config.displaySize).toBe(CONFIG_SNAPSHOT.snail.displaySize);
  });

  it('is a no-op for a type with no override', () => {
    expect(() => resetRacerTypeOverride('giraffe')).not.toThrow();
    expect(listAllRacerTypes().find((t) => t.id === 'giraffe').isActive).toBe(true);
  });

  it('legacy isActive override migrated and reset clears it', () => {
    localStorage.setItem('racearena:racerTypeOverrides', JSON.stringify({ horse: false }));
    resetRacerTypeOverride('horse');
    expect(listAllRacerTypes().find((t) => t.id === 'horse').isActive).toBe(true);
  });
});

// ── applyTunableOverride / restoreTunableDefault ──────────────────────────

describe('applyTunableOverride', () => {
  it('mutates the live config without touching localStorage', () => {
    applyTunableOverride('horse', 'displaySize', 72);
    expect(RACER_TYPES.horse.config.displaySize).toBe(72);
    expect(localStorage.getItem('racearena:racerTypeOverrides')).toBeNull();
  });

  it('ignores unknown fieldNames without throwing', () => {
    expect(() => applyTunableOverride('horse', 'unknownField', 99)).not.toThrow();
  });

  it('ignores unknown typeIds without throwing', () => {
    expect(() => applyTunableOverride('not-a-type', 'speedMultiplier', 1.0)).not.toThrow();
  });
});

describe('restoreTunableDefault', () => {
  it('restores live config to snapshot value', () => {
    applyTunableOverride('snail', 'basePeriodMs', 100);
    restoreTunableDefault('snail', 'basePeriodMs');
    expect(RACER_TYPES.snail.config.basePeriodMs).toBe(CONFIG_SNAPSHOT.snail.basePeriodMs);
  });

  it('ignores unknown fieldNames without throwing', () => {
    expect(() => restoreTunableDefault('horse', 'notAField')).not.toThrow();
  });
});
