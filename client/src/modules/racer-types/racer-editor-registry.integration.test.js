// ============================================================
// File:        racer-editor-registry.integration.test.js
// Path:        client/src/modules/racer-types/racer-editor-registry.integration.test.js
// Project:     RaceArena
// Created:     2026-05-27
// Updated:     D6b — registerRacerType/removeRacerType are now async server-side.
//              Tests for the write path + new-style registry injection.
//              Full D6b honesty proofs live in racer-server-load.test.js.
// Description: Integration tests for the user-created racer type registry
//              (listAllRacerTypes, getCoatsByType, getRacerTypeLabel, built-in
//              collision guard, query functions — Phase 1 of racer-editor).
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Server mocks (needed because registerRacerType/removeRacerType call racerApi) ──

vi.mock('../../services/racerApi.js', () => ({
  fetchRacers: vi.fn().mockResolvedValue([]),
  createRacer: vi.fn().mockResolvedValue({}),
  updateRacer: vi.fn().mockResolvedValue({}),
  deleteRacer: vi.fn().mockResolvedValue(undefined),
  uploadRacerSprite: vi.fn().mockResolvedValue({ spriteFile: 'test.png' }),
}));

vi.mock('../../services/api.js', () => ({ API_BASE_URL: 'http://test' }));

// ── Minimal type stubs so SpriteRacerType can be constructed without real sprites ──

vi.mock('./spriteLoader.js', () => ({
  loadSprite: vi.fn().mockResolvedValue({}),
  getCachedSprite: vi.fn(),
  _clearSpriteCache: vi.fn(),
}));

vi.mock('./spriteTinter.js', () => {
  const getCoatVariants = vi.fn().mockResolvedValue(new Map());
  getCoatVariants.cached = vi.fn();
  return {
    getCoatVariants,
    tintSprite: vi.fn().mockReturnValue({}),
    tintSpriteWithMask: vi.fn().mockReturnValue({}),
    tintSpriteBodyAndMask: vi.fn().mockReturnValue({}),
    tintSpriteWithDualMask: vi.fn().mockReturnValue({}),
    detectTintMode: vi.fn().mockReturnValue('multiply'),
    getPatternedVariant: vi.fn().mockReturnValue(null),
    _clearTintCache: vi.fn(),
    _clearMaskedTintCache: vi.fn(),
  };
});

vi.mock('./trailStyles.js', () => ({
  getTrailFactory: vi.fn().mockReturnValue(() => []),
}));

import {
  listAllRacerTypes,
  getRacerType,
  getCoatsByType,
  getRacerTypeLabel,
  RACER_TYPE_IDS,
  removeRacerType,
  registerRacerType,
  _resetLoadedRacerTypesForTesting,
  _resetRacersReadyForTesting,
  _setLoadedRacerTypeForTesting,
} from './index.js';

const TEST_COAT = { id: 'default', name: 'Default', tint: null };

// Fake SpriteRacerType-like instance injected directly into registry.
function makeFakeType(id, name, emoji, overrides = {}) {
  return {
    config: {
      id,
      name,
      emoji,
      coats: [TEST_COAT],
      speedMultiplier: 1.0,
      displaySize: 40,
      basePeriodMs: 600,
      tintMode: 'multiply',
      spriteUrl: `http://test/api/racers/${id}/sprite`,
      surfaceClasses: [],
      ...overrides,
    },
    getSpeedMultiplier: () => overrides.speedMultiplier ?? 1.0,
    getEmoji: () => emoji,
  };
}

const FAKE_PARROT = makeFakeType('test-parrot', 'Parrot', '🦜');

beforeEach(() => {
  localStorage.clear();
  _resetLoadedRacerTypesForTesting();
  _resetRacersReadyForTesting();
  vi.clearAllMocks();
});

// ── Query functions on built-in types (unaffected by D6b) ────────────────────

describe('getCoatsByType', () => {
  it('returns coats for a built-in type', () => {
    const coats = getCoatsByType('horse');
    expect(Array.isArray(coats)).toBe(true);
    expect(coats.length).toBeGreaterThan(0);
  });

  it('returns coats for an injected user-created type', () => {
    _setLoadedRacerTypeForTesting('test-parrot', FAKE_PARROT);
    const coats = getCoatsByType('test-parrot');
    expect(coats).toEqual([TEST_COAT]);
  });

  it('returns null for an unknown type', () => {
    expect(getCoatsByType('does-not-exist')).toBeNull();
  });
});

describe('getRacerTypeLabel', () => {
  it('returns the label for a built-in type', () => {
    const label = getRacerTypeLabel('horse');
    expect(label).toContain('Horse');
  });

  it('returns name + emoji for an injected user-created type', () => {
    _setLoadedRacerTypeForTesting('test-parrot', FAKE_PARROT);
    const label = getRacerTypeLabel('test-parrot');
    expect(label).toBe('Parrot 🦜');
  });

  it('returns the id for an unknown type', () => {
    expect(getRacerTypeLabel('unknown-xyz')).toBe('unknown-xyz');
  });
});

// ── Registry query after injection ───────────────────────────────────────────

describe('registry queries — injected user-created type', () => {
  beforeEach(() => {
    _setLoadedRacerTypeForTesting('test-parrot', FAKE_PARROT);
  });

  it('makes the type visible in listAllRacerTypes', () => {
    const all = listAllRacerTypes();
    const found = all.find((t) => t.id === 'test-parrot');
    expect(found).toBeTruthy();
    expect(found.name).toContain('Parrot');
  });

  it('makes the type retrievable via getRacerType', () => {
    const type = getRacerType('test-parrot');
    expect(type.config.id).toBe('test-parrot');
  });

  it('injected type appears after built-ins in listAllRacerTypes', () => {
    const all = listAllRacerTypes();
    const builtInCount = RACER_TYPE_IDS.length;
    expect(all.length).toBe(builtInCount + 1);
    expect(all[all.length - 1].id).toBe('test-parrot');
  });

  it('injected type is active by default', () => {
    const all = listAllRacerTypes();
    const found = all.find((t) => t.id === 'test-parrot');
    expect(found.isActive).toBe(true);
  });
});

// ── Built-in collision guard ──────────────────────────────────────────────────

describe('registerRacerType — built-in collision guard', () => {
  it('rejects with built-in error for a built-in id', async () => {
    await expect(registerRacerType({ id: 'horse' })).rejects.toThrow(/built-in/);
  });

  it('does not modify the live registry on collision', async () => {
    await registerRacerType({ id: 'rocket' }).catch(() => {});
    expect(getRacerType('rocket').config.id).toBe('rocket'); // still the real built-in
  });
});

// ── removeRacerType ───────────────────────────────────────────────────────────

describe('removeRacerType', () => {
  it('rejects when attempting to remove a built-in type', async () => {
    await expect(removeRacerType('horse')).rejects.toThrow(/built-in/);
  });

  it('removes an injected type from the live registry after server delete', async () => {
    _setLoadedRacerTypeForTesting('test-parrot', FAKE_PARROT);
    // fetchRacers returns empty list so reload clears registry
    const { fetchRacers } = await import('../../services/racerApi.js');
    fetchRacers.mockResolvedValue([]);
    await removeRacerType('test-parrot');
    expect(listAllRacerTypes().find((t) => t.id === 'test-parrot')).toBeUndefined();
  });

  it('getRacerType falls back to horse after removal', async () => {
    _setLoadedRacerTypeForTesting('test-parrot', FAKE_PARROT);
    const { fetchRacers } = await import('../../services/racerApi.js');
    fetchRacers.mockResolvedValue([]);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await removeRacerType('test-parrot');
    const fallback = getRacerType('test-parrot');
    expect(fallback.config.id).toBe('horse');
    spy.mockRestore();
  });
});
