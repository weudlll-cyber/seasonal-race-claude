// ============================================================
// File:        registerRacerType.test.js
// Path:        client/src/modules/racer-types/registerRacerType.test.js
// Project:     RaceArena
// Description: Tests that registerRacerType triggers getCoatVariants warm-up
//              with the correct blend mode derived from config.tintMode.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Shared stub for all 12 built-in type mocks.
// Must include all TUNABLE_FIELDS + fields read by warmUpAllRacerTypes.
const _stub = vi.hoisted(() => ({
  config: {
    coats: [{ id: 'default', name: 'Default', tint: null }],
    spriteUrl: '/mock.png',
    tintMode: 'multiply',
    speedMultiplier: 1.0,
    displaySize: 40,
    basePeriodMs: 600,
    leaderRingColor: '#ffd700',
    leaderEllipseRx: 16,
    leaderEllipseRy: 10,
  },
}));

vi.mock('./HorseRacerType.js', () => ({ HorseRacerType: _stub, HORSE_COATS: [] }));
vi.mock('./DuckRacerType.js', () => ({ DuckRacerType: _stub, DUCK_COATS: [] }));
vi.mock('./SnailRacerType.js', () => ({ SnailRacerType: _stub, SNAIL_COATS: [] }));
vi.mock('./ElephantRacerType.js', () => ({ ElephantRacerType: _stub }));
vi.mock('./GiraffeRacerType.js', () => ({ GiraffeRacerType: _stub }));
vi.mock('./SnakeRacerType.js', () => ({ SnakeRacerType: _stub }));
vi.mock('./DragonRacerType.js', () => ({ DragonRacerType: _stub }));
vi.mock('./F1RacerType.js', () => ({ F1RacerType: _stub }));
vi.mock('./RocketRacerType.js', () => ({ RocketRacerType: _stub }));
vi.mock('./BuggyRacerType.js', () => ({ BuggyRacerType: _stub }));
vi.mock('./MotorbikeRacerType.js', () => ({ MotorbikeRacerType: _stub }));
vi.mock('./PlaneRacerType.js', () => ({ PlaneRacerType: _stub }));

vi.mock('./SpriteRacerType.js', () => {
  function SpriteRacerType(cfg) {
    this.config = { ...cfg };
  }
  return { SpriteRacerType };
});

vi.mock('./spriteTinter.js', () => {
  const getCoatVariants = vi.fn().mockResolvedValue(new Map());
  getCoatVariants.cached = vi.fn();
  return { getCoatVariants };
});

vi.mock('./spriteLoader.js', () => ({
  loadSprite: vi.fn().mockResolvedValue({}),
  getCachedSprite: vi.fn(),
}));

vi.mock('../storage/storage.js', () => ({
  storageGet: vi.fn().mockReturnValue(null),
  storageSet: vi.fn(),
  KEYS: { RACER_TYPE_OVERRIDES: 'test:overrides' },
  STORAGE_CHANGE_EVENT: 'racearena:storage-change',
}));

vi.mock('./racerTypeStorage.js', () => ({
  loadStoredRacerTypes: vi.fn().mockReturnValue([]),
  saveStoredRacerType: vi.fn(),
  deleteStoredRacerType: vi.fn(),
}));

vi.mock('./trailStyles.js', () => ({
  getTrailFactory: vi.fn().mockReturnValue(() => []),
}));

import { registerRacerType, _resetLoadedRacerTypesForTesting } from './index.js';
import { getCoatVariants } from './spriteTinter.js';

const BASE_CONFIG = {
  id: 'test-custom',
  name: 'Test',
  emoji: '🐱',
  spriteDataUrl: 'data:image/png;base64,abc123',
  frameCount: 4,
  basePeriodMs: 600,
  displaySize: 40,
  trailStyle: 'dust',
  coats: [{ id: 'base', name: 'Base', tint: null }],
  defaultCoatId: 'base',
  primaryColor: '#ff0000',
};

describe('registerRacerType — getCoatVariants warm-up', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetLoadedRacerTypesForTesting();
  });

  afterEach(() => {
    _resetLoadedRacerTypesForTesting();
  });

  it('calls getCoatVariants with "multiply" when tintMode is absent (constructor default)', () => {
    registerRacerType(BASE_CONFIG);
    expect(getCoatVariants).toHaveBeenCalledWith(
      BASE_CONFIG.spriteDataUrl,
      BASE_CONFIG.coats,
      'multiply'
    );
  });

  it('calls getCoatVariants with "auto" when tintMode is explicitly "auto"', () => {
    registerRacerType({ ...BASE_CONFIG, tintMode: 'auto' });
    expect(getCoatVariants).toHaveBeenCalledWith(
      BASE_CONFIG.spriteDataUrl,
      BASE_CONFIG.coats,
      'auto'
    );
  });

  it('calls getCoatVariants with "screen" when tintMode is "screen"', () => {
    registerRacerType({ ...BASE_CONFIG, id: 'test-screen', tintMode: 'screen' });
    expect(getCoatVariants).toHaveBeenCalledWith(
      BASE_CONFIG.spriteDataUrl,
      BASE_CONFIG.coats,
      'screen'
    );
  });

  it('calls getCoatVariants with "multiply" when tintMode is "multiply"', () => {
    registerRacerType({ ...BASE_CONFIG, id: 'test-multiply', tintMode: 'multiply' });
    expect(getCoatVariants).toHaveBeenCalledWith(
      BASE_CONFIG.spriteDataUrl,
      BASE_CONFIG.coats,
      'multiply'
    );
  });

  it('returns a SpriteRacerType instance with the correct id', () => {
    const instance = registerRacerType(BASE_CONFIG);
    expect(instance.config.id).toBe('test-custom');
  });
});
