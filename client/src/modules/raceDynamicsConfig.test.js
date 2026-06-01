// ============================================================
// File:        raceDynamicsConfig.test.js
// Path:        client/src/modules/raceDynamicsConfig.test.js
// Project:     RaceArena
// Created:     2026-05-04
// Description: PR-A3 tests — raceDynamicsConfig storage CRUD.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DEFAULT_RACE_DYNAMICS_CONFIG,
  loadRaceDynamicsConfig,
  saveRaceDynamicsConfig,
} from './raceDynamicsConfig.js';

vi.mock('./storage/storage.js', () => ({
  KEYS: { RACE_DYNAMICS_CONFIG: 'racearena:raceDynamicsConfig' },
  storageGet: vi.fn(() => null),
  storageSet: vi.fn(),
}));

import { storageGet, storageSet } from './storage/storage.js';

beforeEach(() => {
  vi.clearAllMocks();
  storageGet.mockReturnValue(null);
});

describe('DEFAULT_RACE_DYNAMICS_CONFIG', () => {
  it('has expected default values', () => {
    expect(DEFAULT_RACE_DYNAMICS_CONFIG).toEqual({
      reRollVariationPercent: 58,
      reRollTransitionDuration: 5.0,
      reRollIntervalDivisor: 15,
      reRollLastPositionPercent: 80,
      trajectoryTransitionDuration: 1.5,
      racePlanBonusStrengthMultiplier: 2.0,
      racePlanBonusTransitionEnd: 0.75,
      racePlanBonusFadeDuration: 1500,
      racePlanCorridorStart: 0.55,
      racePlanCorridorEnd: 0.95,
    });
  });

  it('all defaults are positive numbers', () => {
    for (const val of Object.values(DEFAULT_RACE_DYNAMICS_CONFIG)) {
      expect(val).toBeGreaterThan(0);
    }
  });
});

describe('loadRaceDynamicsConfig', () => {
  it('returns defaults when storage is empty', () => {
    storageGet.mockReturnValue(null);
    expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
  });

  it('merges stored values with defaults', () => {
    storageGet.mockReturnValue({ reRollVariationPercent: 50 });
    const cfg = loadRaceDynamicsConfig();
    expect(cfg.reRollVariationPercent).toBe(50);
    expect(cfg.reRollTransitionDuration).toBe(5.0);
  });

  it('returns defaults when stored value is not an object', () => {
    storageGet.mockReturnValue(42);
    expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
  });

  it('returns defaults when reRollVariationPercent is 0', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_DYNAMICS_CONFIG, reRollVariationPercent: 0 });
    expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
  });

  it('returns defaults when reRollTransitionDuration is negative', () => {
    storageGet.mockReturnValue({
      ...DEFAULT_RACE_DYNAMICS_CONFIG,
      reRollTransitionDuration: -1,
    });
    expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
  });

  it('returns defaults when trajectoryTransitionDuration is 0', () => {
    storageGet.mockReturnValue({
      ...DEFAULT_RACE_DYNAMICS_CONFIG,
      trajectoryTransitionDuration: 0,
    });
    expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
  });

  it('returns defaults when reRollLastPositionPercent > 100', () => {
    storageGet.mockReturnValue({
      ...DEFAULT_RACE_DYNAMICS_CONFIG,
      reRollLastPositionPercent: 101,
    });
    expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
  });

  it('does not mutate DEFAULT_RACE_DYNAMICS_CONFIG', () => {
    storageGet.mockReturnValue({ reRollVariationPercent: 100 });
    loadRaceDynamicsConfig();
    expect(DEFAULT_RACE_DYNAMICS_CONFIG.reRollVariationPercent).toBe(58);
  });

  it('accepts valid custom values', () => {
    storageGet.mockReturnValue({
      reRollVariationPercent: 100,
      reRollTransitionDuration: 3.0,
      reRollIntervalDivisor: 10,
      reRollLastPositionPercent: 70,
    });
    const cfg = loadRaceDynamicsConfig();
    expect(cfg.reRollVariationPercent).toBe(100);
    expect(cfg.reRollIntervalDivisor).toBe(10);
    expect(cfg.reRollLastPositionPercent).toBe(70);
  });
});

describe('saveRaceDynamicsConfig', () => {
  it('writes config to storage', () => {
    const cfg = { ...DEFAULT_RACE_DYNAMICS_CONFIG, reRollVariationPercent: 50 };
    saveRaceDynamicsConfig(cfg);
    expect(storageSet).toHaveBeenCalledWith('racearena:raceDynamicsConfig', cfg);
  });
});
