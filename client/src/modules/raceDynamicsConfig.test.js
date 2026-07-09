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
  STORAGE_CHANGE_EVENT: 'racearena:storage-change',
}));

import { storageGet, storageSet } from './storage/storage.js';

beforeEach(() => {
  vi.clearAllMocks();
  storageGet.mockReturnValue(null);
});

describe('DEFAULT_RACE_DYNAMICS_CONFIG', () => {
  it('has expected default values', () => {
    expect(DEFAULT_RACE_DYNAMICS_CONFIG).toEqual({
      reRollVariationPercent: 75,
      reRollTransitionDuration: 3.0,
      reRollIntervalDivisor: 10,
      reRollLastPositionPercent: 95,
      trajectoryTransitionDuration: 1.0,
      racePlanBonusStrengthMultiplier: 2.0,
      racePlanBonusTransitionEnd: 0.75,
      racePlanBonusFadeDuration: 1500,
      racePlanCorridorStart: 0.55,
      racePlanCorridorEnd: 1.0,
      racePlanMinDurationSec: 30,
      pulkBiasGain: 2.0,
      governorMaxEffect: 0.12,
      governorMaxStepPerFrame: 0.01,
      // SHIPPED DEFAULT: the event-driven two-way director (catch-up + fall-back) + phase-split.
      governorDirectorEnabled: true,
      governorDirectorPullStrength: 0.06,
      governorDirectorSettling: 0.05,
      governorDirectorLeaderBrake: 0.1,
      governorDirectorChallengerBoost: 0.06,
      governorDirectorLingerBrake: 0.6,
      governorDirectorCeilingCap: true,
      governorDirectorBoostHeadroom: 0.0,
      directorV4Enabled: false,
      directorV4SuppressChaosBonusB1: false,
      directorV4Intensity: 0.6,
      directorV4PackBandStrictness: 0.5,
      directorV4ReleaseProgress: 0.97,
      directorV4ResolveB2: 0.8,
      directorV4ResolveB3: 0.7,
      directorV4ResolveB4: 0.65,
      directorV4ResolveB5: 0.6,
      directorV4OutcomeStart: 0.25,
      governorDirectorFrontPool: 8,
      governorDirectorBoostOncePerRace: true,
      governorDirectorMaxParallelBoosts: 3,
      governorDirectorBoostDurationMin: 1500,
      governorDirectorBoostDurationMax: 4000,
      governorDirectorCatchThreshold: 2.0,
      governorDirectorFallbackEnabled: true,
      governorDirectorFallbackFromPool: 5,
      governorDirectorFallbackMaxCount: 2,
      governorDirectorFallbackUntilPosition: 12,
      governorDirectorFallbackProtectMs: 2500,
      phaseSplitBonusEnabled: true,
      areaBonusEarly: 1.0,
      areaBonusPulk: 0,
      areaBonusPost: 1.0,
      rowBonusEarly: 1,
      rowBonusPulk: 0,
      rowBonusPost: 1,
    });
  });

  it('all numeric defaults are positive; PULK-phase bonuses default 0 (off during PULK)', () => {
    // The winning phase-split turns the area/row bonuses OFF during the PULK window (0 is valid).
    const offAtZero = new Set(['areaBonusPulk', 'rowBonusPulk', 'governorDirectorBoostHeadroom']);
    for (const [key, val] of Object.entries(DEFAULT_RACE_DYNAMICS_CONFIG)) {
      if (typeof val !== 'number') continue;
      if (offAtZero.has(key)) expect(val).toBeGreaterThanOrEqual(0);
      else expect(val).toBeGreaterThan(0);
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
    expect(cfg.reRollTransitionDuration).toBe(3.0);
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

  it('returns defaults when governorDirectorBoostHeadroom is negative', () => {
    storageGet.mockReturnValue({
      ...DEFAULT_RACE_DYNAMICS_CONFIG,
      governorDirectorBoostHeadroom: -0.05,
    });
    expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
  });

  it('accepts a positive governorDirectorBoostHeadroom', () => {
    storageGet.mockReturnValue({
      ...DEFAULT_RACE_DYNAMICS_CONFIG,
      governorDirectorBoostHeadroom: 0.05,
    });
    expect(loadRaceDynamicsConfig().governorDirectorBoostHeadroom).toBe(0.05);
  });

  it('returns defaults when directorV4Enabled is not a boolean', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_DYNAMICS_CONFIG, directorV4Enabled: 'yes' });
    expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
  });

  it('accepts directorV4Enabled=true', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_DYNAMICS_CONFIG, directorV4Enabled: true });
    expect(loadRaceDynamicsConfig().directorV4Enabled).toBe(true);
  });

  it('returns defaults when directorV4Intensity is out of [0,1]', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_DYNAMICS_CONFIG, directorV4Intensity: 1.5 });
    expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
  });

  it('returns defaults when directorV4PackBandStrictness is out of [0,1]', () => {
    storageGet.mockReturnValue({
      ...DEFAULT_RACE_DYNAMICS_CONFIG,
      directorV4PackBandStrictness: -0.2,
    });
    expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
  });

  it('returns defaults when a v4 resolve/release progress is out of (0,1]', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_DYNAMICS_CONFIG, directorV4ReleaseProgress: 1.2 });
    expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
    storageGet.mockReturnValue({ ...DEFAULT_RACE_DYNAMICS_CONFIG, directorV4ResolveB3: 0 });
    expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
  });

  it('returns defaults when directorV4OutcomeStart is out of [0.25, 0.55]', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_DYNAMICS_CONFIG, directorV4OutcomeStart: 0.2 });
    expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
    storageGet.mockReturnValue({ ...DEFAULT_RACE_DYNAMICS_CONFIG, directorV4OutcomeStart: 0.6 });
    expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
  });

  it('accepts a valid directorV4OutcomeStart', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_DYNAMICS_CONFIG, directorV4OutcomeStart: 0.35 });
    expect(loadRaceDynamicsConfig().directorV4OutcomeStart).toBe(0.35);
  });

  it('does not mutate DEFAULT_RACE_DYNAMICS_CONFIG', () => {
    storageGet.mockReturnValue({ reRollVariationPercent: 100 });
    loadRaceDynamicsConfig();
    expect(DEFAULT_RACE_DYNAMICS_CONFIG.reRollVariationPercent).toBe(75);
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
