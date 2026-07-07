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
      pulkSurgeEnabled: true,
      pulkSurgeFraction: 0.2,
      pulkSurgeBonus: 0.1,
      pulkSurgeRampInMs: 1200,
      pulkSurgeRampOutMs: 1200,
      pulkBrakeExemptStrength: 0.5,
      governorEnabled: false,
      governorDrama: 0.5,
      governorK0: 0.03,
      governorLengthMin: 2.0,
      governorLengthMax: 3.0,
      governorLengthFloor: 1.0,
      governorRampWidth: 0.5,
      governorAMin: 0.005,
      governorAMax: 0.02,
      governorFrequency: 3,
      governorMaxEffect: 0.12,
      governorMaxStepPerFrame: 0.01,
      governorDirectorEnabled: false,
      governorDirectorCastSize: 3,
      governorDirectorDwell: 0.08,
      governorDirectorAnchorOffset: 2.0,
      governorDirectorPullStrength: 0.06,
      governorDirectorSettling: 0.05,
      governorDirectorLeaderBrake: 0,
      governorDirectorChallengerBoost: 0,
      showTargetMode: false,
      showEngagement: 1.0,
      showFrontBand: 8,
      showWanderDwell: 0.06,
      showFrontConcentration: 3,
      // PULK-action smart-boost + phase-split + preview (all OFF/neutral by default).
      governorDirectorFrontPool: 0,
      governorDirectorBoostOncePerRace: false,
      governorDirectorLingerBrake: 0,
      governorDirectorCeilingCap: false,
      phaseSplitBonusEnabled: false,
      areaBonusEarly: 2.0,
      areaBonusPulk: 2.0,
      areaBonusPost: 2.0,
      rowBonusEarly: 1,
      rowBonusPulk: 1,
      rowBonusPost: 1,
      pulkActionPreview: false,
    });
  });

  it('all numeric defaults are positive (surge flag boolean); two-sided contest knobs default 0 (off)', () => {
    // Action-1 two-sided contest knobs are OFF-at-0 by default (byte-identical legacy path).
    const offAtZero = new Set([
      'governorDirectorLeaderBrake',
      'governorDirectorChallengerBoost',
      // PULK-action smart-boost knobs — OFF-at-0 by default (legacy path byte-identical).
      'governorDirectorFrontPool',
      'governorDirectorLingerBrake',
    ]);
    for (const [key, val] of Object.entries(DEFAULT_RACE_DYNAMICS_CONFIG)) {
      if (typeof val !== 'number') continue;
      if (offAtZero.has(key)) expect(val).toBeGreaterThanOrEqual(0);
      else expect(val).toBeGreaterThan(0);
    }
    expect(typeof DEFAULT_RACE_DYNAMICS_CONFIG.pulkSurgeEnabled).toBe('boolean');
    expect(typeof DEFAULT_RACE_DYNAMICS_CONFIG.showTargetMode).toBe('boolean');
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

  it('returns defaults when pulkSurgeBonus is out of range (0.9 > 0.12)', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_DYNAMICS_CONFIG, pulkSurgeBonus: 0.9 });
    const cfg = loadRaceDynamicsConfig();
    expect(cfg).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
    expect(cfg.pulkSurgeBonus).toBe(DEFAULT_RACE_DYNAMICS_CONFIG.pulkSurgeBonus);
  });

  it('returns defaults when pulkBrakeExemptStrength is out of range (5 > 1)', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_DYNAMICS_CONFIG, pulkBrakeExemptStrength: 5 });
    const cfg = loadRaceDynamicsConfig();
    expect(cfg).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
    expect(cfg.pulkBrakeExemptStrength).toBe(DEFAULT_RACE_DYNAMICS_CONFIG.pulkBrakeExemptStrength);
  });

  it('falls back to default (true) when pulkSurgeEnabled is not a boolean', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_DYNAMICS_CONFIG, pulkSurgeEnabled: 'yes' });
    const cfg = loadRaceDynamicsConfig();
    expect(cfg).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
    expect(cfg.pulkSurgeEnabled).toBe(true);
  });

  it('accepts valid in-range surge values', () => {
    storageGet.mockReturnValue({
      ...DEFAULT_RACE_DYNAMICS_CONFIG,
      pulkSurgeEnabled: true,
      pulkSurgeFraction: 0.3,
      pulkSurgeBonus: 0.08,
      pulkBrakeExemptStrength: 0.7,
    });
    const cfg = loadRaceDynamicsConfig();
    expect(cfg.pulkSurgeEnabled).toBe(true);
    expect(cfg.pulkSurgeFraction).toBe(0.3);
    expect(cfg.pulkSurgeBonus).toBe(0.08);
    expect(cfg.pulkBrakeExemptStrength).toBe(0.7);
  });
});

describe('saveRaceDynamicsConfig', () => {
  it('writes config to storage', () => {
    const cfg = { ...DEFAULT_RACE_DYNAMICS_CONFIG, reRollVariationPercent: 50 };
    saveRaceDynamicsConfig(cfg);
    expect(storageSet).toHaveBeenCalledWith('racearena:raceDynamicsConfig', cfg);
  });
});
