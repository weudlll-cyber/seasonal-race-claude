// ============================================================
// File:        racer-server-load.test.js
// Path:        client/src/modules/racer-types/racer-server-load.test.js
// Project:     RaceArena
// Description: Tests for D6a server-load path + ready signal + diagnostic.
//
//              Honesty proofs (L126 — RED without / GREEN with):
//              (a) getRacerType('does-not-exist') when ready=true →
//                  console.error spy triggered + HorseRacerType returned.
//                  RED: old silent ?? horse fallback; GREEN: explicit console.error.
//              (c) loadServerRacerTypes builds SpriteRacerType with
//                  spriteUrl = `${API_BASE_URL}/api/racers/<id>/sprite` (no base64).
//                  Server error → areRacersReady() becomes true (no permanent block).
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks (must precede all imports from the mocked modules) ───────────

vi.mock('../../services/racerApi.js', () => ({ fetchRacers: vi.fn() }));
vi.mock('../../services/api.js', () => ({ API_BASE_URL: 'http://test' }));

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
    tintSpriteBodyAndMask: vi.fn().mockReturnValue({}),
    tintSpriteWithDualMask: vi.fn().mockReturnValue({}),
    detectTintMode: vi.fn().mockReturnValue('multiply'),
    getPatternedVariant: vi.fn().mockReturnValue(null),
    _clearTintCache: vi.fn(),
    _clearMaskedTintCache: vi.fn(),
  };
});

// Minimal stub shared by all built-in type mocks
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
    frameCount: 4,
    trailFactory: null,
  },
  getEmoji: () => '🐴',
  getSpeedMultiplier: () => 1.0,
}));

vi.mock('./HorseRacerType.js', () => ({ HorseRacerType: _stub, HORSE_COATS: [] }));
vi.mock('./DuckRacerType.js', () => ({
  DuckRacerType: { ..._stub, config: { ..._stub.config, id: 'duck' } },
  DUCK_COATS: [],
}));
vi.mock('./SnailRacerType.js', () => ({
  SnailRacerType: { ..._stub, config: { ..._stub.config, id: 'snail' } },
  SNAIL_COATS: [],
}));
vi.mock('./ElephantRacerType.js', () => ({
  ElephantRacerType: { ..._stub, config: { ..._stub.config, id: 'elephant' } },
}));
vi.mock('./GiraffeRacerType.js', () => ({
  GiraffeRacerType: { ..._stub, config: { ..._stub.config, id: 'giraffe' } },
}));
vi.mock('./SnakeRacerType.js', () => ({
  SnakeRacerType: { ..._stub, config: { ..._stub.config, id: 'snake' } },
}));
vi.mock('./DragonRacerType.js', () => ({
  DragonRacerType: { ..._stub, config: { ..._stub.config, id: 'dragon' } },
}));
vi.mock('./F1RacerType.js', () => ({
  F1RacerType: { ..._stub, config: { ..._stub.config, id: 'f1' } },
}));
vi.mock('./RocketRacerType.js', () => ({
  RocketRacerType: { ..._stub, config: { ..._stub.config, id: 'rocket' } },
}));
vi.mock('./BuggyRacerType.js', () => ({
  BuggyRacerType: { ..._stub, config: { ..._stub.config, id: 'buggy' } },
}));
vi.mock('./MotorbikeRacerType.js', () => ({
  MotorbikeRacerType: { ..._stub, config: { ..._stub.config, id: 'motorbike' } },
}));
vi.mock('./PlaneRacerType.js', () => ({
  PlaneRacerType: { ..._stub, config: { ..._stub.config, id: 'plane' } },
}));
vi.mock('./LugeRacerType.js', () => ({
  LugeRacerType: { ..._stub, config: { ..._stub.config, id: 'luge' } },
}));
vi.mock('./BeetleRacerType.js', () => ({
  BeetleRacerType: { ..._stub, config: { ..._stub.config, id: 'beetle' } },
}));
vi.mock('./BoarderRacerType.js', () => ({
  BoarderRacerType: { ..._stub, config: { ..._stub.config, id: 'boarder' } },
}));
vi.mock('./KoiRacerType.js', () => ({
  KoiRacerType: { ..._stub, config: { ..._stub.config, id: 'koi' } },
}));
vi.mock('./TurtleRacerType.js', () => ({
  TurtleRacerType: { ..._stub, config: { ..._stub.config, id: 'turtle' } },
}));
vi.mock('./MantaRacerType.js', () => ({
  MantaRacerType: { ..._stub, config: { ..._stub.config, id: 'manta' } },
}));
vi.mock('./DolphinRacerType.js', () => ({
  DolphinRacerType: { ..._stub, config: { ..._stub.config, id: 'dolphin' } },
}));
vi.mock('./SnowmobileRacerType.js', () => ({
  SnowmobileRacerType: { ..._stub, config: { ..._stub.config, id: 'snowmobile' } },
}));

// Must be a vi.fn() so tests can use toHaveBeenCalledWith + mockImplementationOnce.
const MockSpriteRacerType = vi.hoisted(() =>
  vi.fn(function (cfg) {
    this.config = { ...cfg };
  })
);

vi.mock('./SpriteRacerType.js', () => ({
  SpriteRacerType: MockSpriteRacerType,
  BODY_LONG_AXIS_MAX_RATIO: 5.0,
}));

// ── Imports (after mocks) ──────────────────────────────────────────────────────

import {
  loadServerRacerTypes,
  areRacersReady,
  waitForRacersReady,
  getRacerType,
  getRacerTypeById,
  _resetRacersReadyForTesting,
  _resetLoadedRacerTypesForTesting,
  HorseRacerType,
} from './index.js';
import { fetchRacers } from '../../services/racerApi.js';
import { SpriteRacerType } from './SpriteRacerType.js';

const VALID_SERVER_CONFIG = {
  id: 'test-server-racer',
  name: 'Server Racer',
  emoji: '🚀',
  frameCount: 4,
  basePeriodMs: 500,
  displaySize: 60,
  trailStyle: 'dust',
  coats: [{ id: 'default', name: 'Default', tint: null }],
  primaryColor: '#ff0000',
  spriteFile: 'test-server-racer.jpg',
};

beforeEach(() => {
  vi.clearAllMocks();
  _resetRacersReadyForTesting();
  _resetLoadedRacerTypesForTesting();
});

// ── areRacersReady initial state ──────────────────────────────────────────────

describe('areRacersReady — initial state', () => {
  it('returns false before loadServerRacerTypes is called', () => {
    expect(areRacersReady()).toBe(false);
  });
});

// ── waitForRacersReady ────────────────────────────────────────────────────────

describe('waitForRacersReady', () => {
  it('resolves immediately when already ready', async () => {
    fetchRacers.mockResolvedValue([]);
    await loadServerRacerTypes();
    await expect(waitForRacersReady()).resolves.toBeUndefined();
  });

  it('resolves after loadServerRacerTypes completes', async () => {
    fetchRacers.mockResolvedValue([]);
    const p = waitForRacersReady();
    await loadServerRacerTypes();
    await expect(p).resolves.toBeUndefined();
  });
});

// ── HONESTY PROOF (c) — loadServerRacerTypes builds spriteUrl ─────────────────
//
// RED if spriteDataUrl (base64) is used; GREEN when spriteUrl = API URL.
// Server error path: ready is still set (no permanent block).

describe('Honesty proof (c) — loadServerRacerTypes (L126)', () => {
  it('builds SpriteRacerType with spriteUrl pointing to /api/racers/:id/sprite', async () => {
    fetchRacers.mockResolvedValue([VALID_SERVER_CONFIG]);
    await loadServerRacerTypes();
    expect(SpriteRacerType).toHaveBeenCalledWith(
      expect.objectContaining({
        spriteUrl: 'http://test/api/racers/test-server-racer/sprite',
      })
    );
  });

  it('does NOT use spriteDataUrl (base64) as spriteUrl', async () => {
    const cfgWithBase64 = { ...VALID_SERVER_CONFIG, spriteDataUrl: 'data:image/png;base64,abc' };
    fetchRacers.mockResolvedValue([cfgWithBase64]);
    await loadServerRacerTypes();
    expect(SpriteRacerType).toHaveBeenCalledWith(
      expect.objectContaining({ spriteUrl: 'http://test/api/racers/test-server-racer/sprite' })
    );
    expect(SpriteRacerType).not.toHaveBeenCalledWith(
      expect.objectContaining({ spriteUrl: 'data:image/png;base64,abc' })
    );
  });

  it('marks ready=true after successful load (even empty list)', async () => {
    fetchRacers.mockResolvedValue([]);
    expect(areRacersReady()).toBe(false);
    await loadServerRacerTypes();
    expect(areRacersReady()).toBe(true);
  });

  it('[server error] logs console.error and still marks ready=true', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchRacers.mockRejectedValue(new Error('Network error'));
    await loadServerRacerTypes();
    expect(areRacersReady()).toBe(true);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('[RaceArena] loadServerRacerTypes'),
      expect.stringContaining('Network error')
    );
    spy.mockRestore();
  });

  it('[per-racer error] logs console.error, skips bad racer, continues, marks ready', async () => {
    const badConfig = { id: 'bad-racer', trailStyle: 'dust', coats: null };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Regular function (not arrow) so it can be called with `new` before throwing.
    MockSpriteRacerType.mockImplementationOnce(function () {
      throw new Error('required field missing');
    });
    fetchRacers.mockResolvedValue([badConfig, VALID_SERVER_CONFIG]);
    await loadServerRacerTypes();
    expect(areRacersReady()).toBe(true);
    // per-racer error is logged as a single template-literal string.
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('bad-racer'));
    spy.mockRestore();
  });

  it('loaded type is retrievable via getRacerType after load', async () => {
    fetchRacers.mockResolvedValue([VALID_SERVER_CONFIG]);
    await loadServerRacerTypes();
    const type = getRacerType('test-server-racer');
    expect(type).toBeDefined();
    expect(type.config.id).toBe('test-server-racer');
  });
});

// ── HONESTY PROOF (a) — getRacerType diagnostic (L126) ────────────────────────
//
// RED: old code silently falls back to horse; no console.error fires.
// GREEN: console.error is called with the unknown id + ready state, THEN horse returned.

describe('Honesty proof (a) — getRacerType unknown-id diagnostic (L126)', () => {
  it('getRacerType("does-not-exist") → console.error fired + HorseRacerType returned', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = getRacerType('does-not-exist');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"does-not-exist"'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('ready='));
    expect(result).toBe(HorseRacerType);
    spy.mockRestore();
  });

  it('getRacerTypeById("does-not-exist") → console.error fired + HorseRacerType returned', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = getRacerTypeById('does-not-exist');
    expect(result).toBe(HorseRacerType);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('diagnostic reports ready=false before load', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    getRacerType('never-existed');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('ready=false'));
    spy.mockRestore();
  });

  it('diagnostic reports ready=true after load', async () => {
    fetchRacers.mockResolvedValue([]);
    await loadServerRacerTypes();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    getRacerType('still-unknown');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('ready=true'));
    spy.mockRestore();
  });

  it('known built-in type does NOT trigger console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    getRacerType('horse');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
