// ============================================================
// File:        registry.test.js
// Path:        client/src/modules/surface-effects/__tests__/registry.test.js
// Project:     RaceArena
// Description: Unit tests for the surface-class registry — defaults, override
//              resolution, and resolveActiveSurfaceClass logic.
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  listAllSurfaceClasses,
  getSurfaceClass,
  getGeneratorForClass,
  resolveActiveSurfaceClass,
  loadServerClasses,
  resetToDefaults,
  filterRacerTypesForTrack,
  GENERATORS,
} from '../registry.js';
import { DEFAULT_SURFACE_CLASSES, DEFAULT_CLASS_IDS } from '../defaults.js';

beforeEach(() => {
  resetToDefaults();
});

// ── Code defaults ─────────────────────────────────────────────────────────────

describe('DEFAULT_SURFACE_CLASSES', () => {
  it('contains exactly 9 classes', () => {
    expect(DEFAULT_SURFACE_CLASSES.length).toBe(9);
  });

  it('all have unique ids', () => {
    const ids = DEFAULT_SURFACE_CLASSES.map((c) => c.id);
    expect(new Set(ids).size).toBe(9);
  });

  it('all reference a valid generatorId', () => {
    for (const cls of DEFAULT_SURFACE_CLASSES) {
      expect(GENERATORS).toHaveProperty(cls.generatorId);
    }
  });

  it('all have isDefault: true', () => {
    for (const cls of DEFAULT_SURFACE_CLASSES) {
      expect(cls.isDefault).toBe(true);
    }
  });

  it('DEFAULT_CLASS_IDS contains all 9 expected ids', () => {
    const expected = ['asphalt', 'sand', 'earth', 'mud', 'grass', 'snow', 'ice', 'water', 'air'];
    for (const id of expected) {
      expect(DEFAULT_CLASS_IDS.has(id)).toBe(true);
    }
  });
});

// ── Registry — baseline ───────────────────────────────────────────────────────

describe('listAllSurfaceClasses', () => {
  it('returns 9 classes when no server classes loaded', () => {
    expect(listAllSurfaceClasses().length).toBe(9);
  });

  it('returns a copy — mutations do not affect the registry', () => {
    const list = listAllSurfaceClasses();
    list.push({ id: 'fake' });
    expect(listAllSurfaceClasses().length).toBe(9);
  });
});

describe('getSurfaceClass', () => {
  it('returns the class for a known id', () => {
    const cls = getSurfaceClass('mud');
    expect(cls).toBeDefined();
    expect(cls.id).toBe('mud');
    expect(cls.generatorId).toBe('splash');
  });

  it('returns undefined for unknown id', () => {
    expect(getSurfaceClass('nonexistent')).toBeUndefined();
  });
});

describe('getGeneratorForClass', () => {
  it('returns the generator module for a known class', () => {
    const gen = getGeneratorForClass('water');
    expect(gen).toBeDefined();
    expect(gen.id).toBe('splash');
  });

  it('returns undefined for unknown class id', () => {
    expect(getGeneratorForClass('unknown')).toBeUndefined();
  });
});

// ── loadServerClasses — override resolution ───────────────────────────────────

describe('loadServerClasses', () => {
  it('applies default overrides — class config is replaced', () => {
    loadServerClasses([
      {
        id: 'mud',
        label: 'Super Mud',
        generatorId: 'splash',
        config: { color: '#ff0000' },
        isDefault: false,
        isOverride: true,
      },
    ]);
    const cls = getSurfaceClass('mud');
    expect(cls.label).toBe('Super Mud');
    expect(cls.config.color).toBe('#ff0000');
  });

  it('adds custom classes — total count increases', () => {
    loadServerClasses([
      {
        id: 'lava',
        label: 'Lava',
        generatorId: 'particle',
        config: { color: '#ff4400' },
        isDefault: false,
        isOverride: false,
      },
    ]);
    expect(listAllSurfaceClasses().length).toBe(10);
    expect(getSurfaceClass('lava')).toBeDefined();
  });

  it('after resetToDefaults() overrides are gone', () => {
    loadServerClasses([
      {
        id: 'mud',
        label: 'Overridden',
        generatorId: 'splash',
        config: {},
        isDefault: false,
        isOverride: true,
      },
    ]);
    resetToDefaults();
    const cls = getSurfaceClass('mud');
    expect(cls.label).toBe('Mud');
  });

  it('non-override server entry with default id is treated as custom', () => {
    loadServerClasses([
      {
        id: 'asphalt',
        label: 'Custom Asphalt',
        generatorId: 'line',
        config: {},
        isDefault: false,
        isOverride: false,
      },
    ]);
    // asphalt appears twice — once from defaults, once as custom. Total = 10.
    const all = listAllSurfaceClasses();
    expect(all.length).toBe(10);
  });
});

// ── resolveActiveSurfaceClass ─────────────────────────────────────────────────

describe('resolveActiveSurfaceClass', () => {
  it('returns matching class when racer and track share a class', () => {
    const result = resolveActiveSurfaceClass(['mud', 'earth'], ['earth', 'grass']);
    expect(result).toBeDefined();
    expect(result.id).toBe('earth');
  });

  it('returns the first match in racer order', () => {
    // racer: ['mud', 'earth'], track: ['earth', 'mud'] → first racer match is 'mud'
    const result = resolveActiveSurfaceClass(['mud', 'earth'], ['earth', 'mud']);
    expect(result.id).toBe('mud');
  });

  it('returns null when there is no intersection', () => {
    const result = resolveActiveSurfaceClass(['asphalt'], ['water']);
    expect(result).toBeNull();
  });

  it('returns null when racer list is empty', () => {
    expect(resolveActiveSurfaceClass([], ['mud'])).toBeNull();
  });

  it('returns null when track list is empty', () => {
    expect(resolveActiveSurfaceClass(['mud'], [])).toBeNull();
  });

  it('returns null for non-array inputs', () => {
    expect(resolveActiveSurfaceClass(null, ['mud'])).toBeNull();
    expect(resolveActiveSurfaceClass(['mud'], undefined)).toBeNull();
  });
});

// ── filterRacerTypesForTrack ──────────────────────────────────────────────────

describe('filterRacerTypesForTrack', () => {
  it('returns all racers when track classes is empty array', () => {
    const racerTypes = [{ id: 'horse' }, { id: 'duck' }];
    const result = filterRacerTypesForTrack(racerTypes, [], () => ['earth']);
    expect(result).toHaveLength(2);
  });

  it('returns all racers when track classes is undefined', () => {
    const racerTypes = [{ id: 'horse' }];
    expect(filterRacerTypesForTrack(racerTypes, undefined, () => ['earth'])).toHaveLength(1);
  });

  it('returns all racers when track classes is null', () => {
    const racerTypes = [{ id: 'horse' }];
    expect(filterRacerTypesForTrack(racerTypes, null, () => ['earth'])).toHaveLength(1);
  });

  it('includes racers with at least one overlapping class', () => {
    const racerTypes = [{ id: 'horse' }, { id: 'duck' }, { id: 'plane' }];
    const classesByType = { horse: ['earth', 'grass'], duck: ['water'], plane: ['air'] };
    const result = filterRacerTypesForTrack(
      racerTypes,
      ['earth', 'water'],
      (id) => classesByType[id] ?? []
    );
    expect(result.map((r) => r.id)).toEqual(['horse', 'duck']);
  });

  it('excludes racers with no overlapping class', () => {
    const racerTypes = [{ id: 'plane' }];
    const result = filterRacerTypesForTrack(racerTypes, ['earth'], () => ['air']);
    expect(result).toHaveLength(0);
  });

  it('always includes racers with empty surfaceClasses (Heimat-Trail fallback)', () => {
    const racerTypes = [{ id: 'legacy' }];
    const result = filterRacerTypesForTrack(racerTypes, ['earth'], () => []);
    expect(result).toHaveLength(1);
  });

  it('always includes racers when getRacerClassesFn returns null', () => {
    const racerTypes = [{ id: 'legacy' }];
    const result = filterRacerTypesForTrack(racerTypes, ['earth'], () => null);
    expect(result).toHaveLength(1);
  });

  it('returns empty array when no racers are compatible', () => {
    const racerTypes = [{ id: 'plane' }, { id: 'rocket' }];
    const classesByType = { plane: ['air'], rocket: ['air', 'water'] };
    const result = filterRacerTypesForTrack(racerTypes, ['earth'], (id) => classesByType[id] ?? []);
    expect(result).toHaveLength(0);
  });

  it('is order-preserving — result follows input order', () => {
    const racerTypes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const classesByType = { a: ['earth'], b: ['air'], c: ['earth', 'air'] };
    const result = filterRacerTypesForTrack(racerTypes, ['earth'], (id) => classesByType[id] ?? []);
    expect(result.map((r) => r.id)).toEqual(['a', 'c']);
  });

  it('returns empty array when input racerTypes is empty', () => {
    const result = filterRacerTypesForTrack([], ['earth'], () => ['earth']);
    expect(result).toHaveLength(0);
  });
});
