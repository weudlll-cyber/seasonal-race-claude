// ============================================================
// File:        racer-editor-registry.integration.test.js
// Path:        client/src/modules/racer-types/racer-editor-registry.integration.test.js
// Project:     RaceArena
// Created:     2026-05-27
// Description: Integration tests for the user-created racer type registry
//              (registerRacerType, removeRacerType, listAllRacerTypes,
//              getCoatsByType, getRacerTypeLabel — Phase 1 of racer-editor).
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerRacerType,
  removeRacerType,
  listAllRacerTypes,
  getRacerType,
  getCoatsByType,
  getRacerTypeLabel,
  RACER_TYPE_IDS,
  _resetLoadedRacerTypesForTesting,
} from './index.js';
import { loadStoredRacerTypes } from './racerTypeStorage.js';

const STORAGE_KEY = 'racearena:racerTypes:v1';

// Minimal valid config accepted by both racerTypeStorage and SpriteRacerType.
const TEST_COAT = { id: 'default', name: 'Default', tint: null };
const VALID_CONFIG = Object.freeze({
  id: 'test-parrot',
  name: 'Parrot',
  emoji: '🦜',
  spriteDataUrl: 'data:image/png;base64,abc123',
  frameCount: 1,
  basePeriodMs: 500,
  displaySize: 40,
  trailStyle: 'dust',
  coats: [TEST_COAT],
  primaryColor: '#00cc00',
});

beforeEach(() => {
  localStorage.removeItem(STORAGE_KEY);
  _resetLoadedRacerTypesForTesting();
});

describe('registerRacerType', () => {
  it('returns a SpriteRacerType instance', () => {
    const instance = registerRacerType(VALID_CONFIG);
    expect(typeof instance.getSpeedMultiplier).toBe('function');
    expect(typeof instance.getEmoji).toBe('function');
  });

  it('makes the type visible in listAllRacerTypes', () => {
    registerRacerType(VALID_CONFIG);
    const all = listAllRacerTypes();
    const found = all.find((t) => t.id === 'test-parrot');
    expect(found).toBeTruthy();
    expect(found.name).toContain('Parrot');
  });

  it('makes the type retrievable via getRacerType', () => {
    registerRacerType(VALID_CONFIG);
    const type = getRacerType('test-parrot');
    expect(type.config.id).toBe('test-parrot');
  });

  it('registered type appears after built-ins in listAllRacerTypes', () => {
    registerRacerType(VALID_CONFIG);
    const all = listAllRacerTypes();
    const builtInCount = RACER_TYPE_IDS.length;
    expect(all.length).toBe(builtInCount + 1);
    expect(all[all.length - 1].id).toBe('test-parrot');
  });

  it('throws when id collides with a built-in type', () => {
    expect(() => registerRacerType({ ...VALID_CONFIG, id: 'horse' })).toThrow(
      /collides with a built-in/
    );
  });

  it('throws when required storage field is missing', () => {
    const { emoji: _, ...noEmoji } = VALID_CONFIG;
    expect(() => registerRacerType(noEmoji)).toThrow(/required field "emoji" is missing/);
  });

  it('registered type is active by default', () => {
    registerRacerType(VALID_CONFIG);
    const all = listAllRacerTypes();
    const found = all.find((t) => t.id === 'test-parrot');
    expect(found.isActive).toBe(true);
  });
});

describe('removeRacerType', () => {
  it('removes a registered type from the live registry', () => {
    registerRacerType(VALID_CONFIG);
    removeRacerType('test-parrot');
    expect(listAllRacerTypes().find((t) => t.id === 'test-parrot')).toBeUndefined();
  });

  it('getRacerType falls back to horse for a removed id', () => {
    registerRacerType(VALID_CONFIG);
    removeRacerType('test-parrot');
    const fallback = getRacerType('test-parrot');
    expect(fallback.config.id).toBe('horse');
  });

  it('removes the type from localStorage', () => {
    registerRacerType(VALID_CONFIG);
    removeRacerType('test-parrot');
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    expect(stored.find((c) => c.id === 'test-parrot')).toBeUndefined();
  });

  it('throws when attempting to remove a built-in type', () => {
    expect(() => removeRacerType('horse')).toThrow(/is a built-in type/);
  });

  it('is a no-op for unknown non-built-in id', () => {
    // should not throw
    expect(() => removeRacerType('no-such-type')).not.toThrow();
  });
});

describe('getCoatsByType', () => {
  it('returns coats for a built-in type', () => {
    const coats = getCoatsByType('horse');
    expect(Array.isArray(coats)).toBe(true);
    expect(coats.length).toBeGreaterThan(0);
  });

  it('returns coats for a registered type', () => {
    registerRacerType(VALID_CONFIG);
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

  it('returns name + emoji for a registered type', () => {
    registerRacerType(VALID_CONFIG);
    const label = getRacerTypeLabel('test-parrot');
    expect(label).toBe('Parrot 🦜');
  });

  it('returns the id for an unknown type', () => {
    expect(getRacerTypeLabel('unknown-xyz')).toBe('unknown-xyz');
  });
});

describe('edit mode — stored config round-trip', () => {
  it('all editor-relevant fields survive a register → loadStoredRacerTypes round-trip', () => {
    const config = {
      ...VALID_CONFIG,
      name: 'Space Cat',
      emoji: '🐱',
      speedMultiplier: 1.3,
      displaySize: 52,
      trailStyle: 'sparkle',
      surfaceClasses: ['earth'],
      primaryColor: '#ff8800',
      frameCount: 16,
      basePeriodMs: 900,
      baseRotationOffset: 0.5,
    };
    registerRacerType(config);
    const stored = loadStoredRacerTypes().find((c) => c.id === 'test-parrot');
    expect(stored.name).toBe('Space Cat');
    expect(stored.emoji).toBe('🐱');
    expect(stored.speedMultiplier).toBe(1.3);
    expect(stored.displaySize).toBe(52);
    expect(stored.trailStyle).toBe('sparkle');
    expect(stored.primaryColor).toBe('#ff8800');
    expect(stored.frameCount).toBe(16);
    expect(stored.basePeriodMs).toBe(900);
    expect(stored.baseRotationOffset).toBe(0.5);
    expect(stored.surfaceClasses).toEqual(['earth']);
  });
});

describe('ID collision guard — editor level', () => {
  it('registerRacerType with a built-in id throws and does not persist', () => {
    const collidingConfig = { ...VALID_CONFIG, id: 'rocket' };
    expect(() => registerRacerType(collidingConfig)).toThrow(/collides with a built-in/);
    // Should not appear in storage
    expect(loadStoredRacerTypes().find((c) => c.id === 'rocket')).toBeUndefined();
    // Built-in 'rocket' type is unchanged
    const rocketType = getRacerType('rocket');
    expect(rocketType.config.id).toBe('rocket');
  });
});
