// ============================================================
// File:        registerRacerType.test.js
// Path:        client/src/modules/racer-types/registerRacerType.test.js
// Project:     RaceArena
// Description: Sanity tests for the D6b async registerRacerType.
//              Full write-path honesty proofs (createRacer, uploadRacerSprite,
//              stale-registry-clear, etc.) live in racer-server-load.test.js.
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Module mocks ───────────────────────────────────────────────────────────────

const _stub = vi.hoisted(() => ({
  config: {
    id: 'horse',
    coats: [{ id: 'default', name: 'Default', tint: null }],
    spriteUrl: '/mock.png',
    tintMode: 'multiply',
    speedMultiplier: 1.0,
    displaySize: 40,
    basePeriodMs: 600,
    leaderRingColor: '#ffd700',
    leaderEllipseRx: 16,
    leaderEllipseRy: 10,
    minTargetScreenPx: 40,
    surfaceClasses: [],
    surfaceEffectOverrides: {},
  },
  getEmoji: () => '🐴',
  getSpeedMultiplier: () => 1.0,
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
vi.mock('./LugeRacerType.js', () => ({ LugeRacerType: _stub }));
vi.mock('./BeetleRacerType.js', () => ({ BeetleRacerType: _stub }));
vi.mock('./BoarderRacerType.js', () => ({ BoarderRacerType: _stub }));
vi.mock('./KoiRacerType.js', () => ({ KoiRacerType: _stub }));
vi.mock('./TurtleRacerType.js', () => ({ TurtleRacerType: _stub }));
vi.mock('./MantaRacerType.js', () => ({ MantaRacerType: _stub }));
vi.mock('./DolphinRacerType.js', () => ({ DolphinRacerType: _stub }));
vi.mock('./SnowmobileRacerType.js', () => ({ SnowmobileRacerType: _stub }));

vi.mock('./SpriteRacerType.js', () => {
  function SpriteRacerType(cfg) {
    this.config = { ...cfg };
  }
  return { SpriteRacerType, BODY_LONG_AXIS_MAX_RATIO: 5.0 };
});

vi.mock('./spriteTinter.js', () => {
  const getCoatVariants = vi.fn().mockResolvedValue(new Map());
  getCoatVariants.cached = vi.fn();
  return { getCoatVariants };
});

vi.mock('./spriteLoader.js', () => ({
  loadSprite: vi.fn().mockResolvedValue({}),
  getCachedSprite: vi.fn(),
  _clearSpriteCache: vi.fn(),
}));

vi.mock('../storage/storage.js', () => ({
  storageGet: vi.fn().mockReturnValue(null),
  storageSet: vi.fn(),
  KEYS: { RACER_TYPE_OVERRIDES: 'test:overrides' },
  STORAGE_CHANGE_EVENT: 'racearena:storage-change',
}));

vi.mock('./trailStyles.js', () => ({
  getTrailFactory: vi.fn().mockReturnValue(() => []),
}));

vi.mock('../../services/racerApi.js', () => ({
  fetchRacers: vi.fn().mockResolvedValue([]),
  createRacer: vi.fn().mockResolvedValue({}),
  updateRacer: vi.fn().mockResolvedValue({}),
  deleteRacer: vi.fn().mockResolvedValue(undefined),
  uploadRacerSprite: vi.fn().mockResolvedValue({ spriteFile: 'test.png' }),
}));

vi.mock('../../services/api.js', () => ({ API_BASE_URL: 'http://test' }));

import { registerRacerType, _resetLoadedRacerTypesForTesting } from './index.js';

const BASE_CONFIG = {
  id: 'test-custom',
  name: 'Test',
  emoji: '🐱',
  spriteDataUrl:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  frameCount: 4,
  basePeriodMs: 600,
  displaySize: 40,
  trailStyle: 'dust',
  coats: [{ id: 'base', name: 'Base', tint: null }],
  defaultCoatId: 'base',
  primaryColor: '#ff0000',
  speedMultiplier: 1.0,
  tintMode: 'auto',
};

beforeEach(() => {
  vi.clearAllMocks();
  _resetLoadedRacerTypesForTesting();
});

describe('registerRacerType — D6b async server write path', () => {
  it('is async — returns a Promise', () => {
    const result = registerRacerType(BASE_CONFIG);
    expect(result).toBeInstanceOf(Promise);
    return result; // let vitest await it so unhandled rejection doesn't pollute
  });

  it('rejects for built-in id collision without calling server', async () => {
    const { createRacer } = await import('../../services/racerApi.js');
    await expect(registerRacerType({ ...BASE_CONFIG, id: 'horse' })).rejects.toThrow('built-in');
    expect(createRacer).not.toHaveBeenCalled();
  });

  it('resolves successfully for a valid new racer', async () => {
    await expect(registerRacerType(BASE_CONFIG)).resolves.toBeUndefined();
  });
});
