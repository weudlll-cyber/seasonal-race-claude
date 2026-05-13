// ============================================================
// File:        raceBehaviorConfig.test.js
// Path:        client/src/modules/raceBehaviorConfig.test.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Unit tests for race-behavior config CRUD (D7b).
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadRaceBehaviorConfig,
  saveRaceBehaviorConfig,
  DEFAULT_RACE_BEHAVIOR_CONFIG,
} from './raceBehaviorConfig.js';

vi.mock('./storage/storage.js', () => ({
  KEYS: { RACE_BEHAVIOR_CONFIG: 'racearena:raceBehaviorConfig' },
  storageGet: vi.fn(),
  storageSet: vi.fn(),
}));

import { storageGet, storageSet } from './storage/storage.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DEFAULT_RACE_BEHAVIOR_CONFIG', () => {
  it('startSpreadRange is 0.95 (D7c Phase 4)', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.startSpreadRange).toBe(0.95);
  });

  it('runoutZone is 0.05 (D7c Phase 4)', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.runoutZone).toBe(0.05);
  });

  it('has enabled: true', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.enabled).toBe(true);
  });

  it('has soft-launch defaults', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.enableSoftLaunch).toBe(true);
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.softLaunchDurationSeconds).toBe(3.0);
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.softLaunchRampMode).toBe('linear');
  });

  it('has positive homeForceStrength', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.homeForceStrength).toBeGreaterThan(0);
  });

  it('comfortThreshold is between 0 and 1', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.comfortThreshold).toBeGreaterThan(0);
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.comfortThreshold).toBeLessThan(1);
  });

  it('has positive avoidanceDistance', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.avoidanceDistance).toBeGreaterThan(0);
  });

  it('speedBrakeFactor is between 0 and 1', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.speedBrakeFactor).toBeGreaterThan(0);
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.speedBrakeFactor).toBeLessThanOrEqual(1);
  });

  it('draftingBoost >= 1', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.draftingBoost).toBeGreaterThanOrEqual(1);
  });

  it('draftingConeAngle is between 0 and 180', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.draftingConeAngle).toBeGreaterThan(0);
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.draftingConeAngle).toBeLessThan(180);
  });
});

describe('loadRaceBehaviorConfig', () => {
  it('returns defaults when nothing stored', () => {
    storageGet.mockReturnValue(null);
    const cfg = loadRaceBehaviorConfig();
    expect(cfg).toEqual(DEFAULT_RACE_BEHAVIOR_CONFIG);
  });

  it('merges stored values with defaults', () => {
    storageGet.mockReturnValue({ avoidanceDistance: 0.5, draftingBoost: 1.2 });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg.avoidanceDistance).toBe(0.5);
    expect(cfg.draftingBoost).toBe(1.2);
    expect(cfg.enabled).toBe(DEFAULT_RACE_BEHAVIOR_CONFIG.enabled);
  });

  it('returns defaults when homeForceStrength <= 0', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_BEHAVIOR_CONFIG, homeForceStrength: 0 });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg).toEqual(DEFAULT_RACE_BEHAVIOR_CONFIG);
  });

  it('returns defaults when comfortThreshold >= 1', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_BEHAVIOR_CONFIG, comfortThreshold: 1.0 });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg).toEqual(DEFAULT_RACE_BEHAVIOR_CONFIG);
  });

  it('returns defaults when speedBrakeFactor > 1', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_BEHAVIOR_CONFIG, speedBrakeFactor: 1.5 });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg).toEqual(DEFAULT_RACE_BEHAVIOR_CONFIG);
  });

  it('returns defaults when draftingBoost < 1', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_BEHAVIOR_CONFIG, draftingBoost: 0.9 });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg).toEqual(DEFAULT_RACE_BEHAVIOR_CONFIG);
  });

  it('returns defaults when draftingConeAngle >= 180', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_BEHAVIOR_CONFIG, draftingConeAngle: 180 });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg).toEqual(DEFAULT_RACE_BEHAVIOR_CONFIG);
  });

  it('returns defaults when softLaunchDurationSeconds is out of range', () => {
    storageGet.mockReturnValue({
      ...DEFAULT_RACE_BEHAVIOR_CONFIG,
      softLaunchDurationSeconds: 11,
    });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg).toEqual(DEFAULT_RACE_BEHAVIOR_CONFIG);
  });

  it('returns defaults when softLaunchRampMode is invalid', () => {
    storageGet.mockReturnValue({
      ...DEFAULT_RACE_BEHAVIOR_CONFIG,
      softLaunchRampMode: 'curve',
    });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg).toEqual(DEFAULT_RACE_BEHAVIOR_CONFIG);
  });

  it('accepts enableSoftLaunch=false as valid stored value', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_BEHAVIOR_CONFIG, enableSoftLaunch: false });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg.enableSoftLaunch).toBe(false);
  });

  it('accepts enabled: false as a valid stored value', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_BEHAVIOR_CONFIG, enabled: false });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg.enabled).toBe(false);
  });
});

describe('loadRaceBehaviorConfig — startSpreadRange migration', () => {
  it('migrates stored 0.7 (old default) → 0.95 (new default)', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_BEHAVIOR_CONFIG, startSpreadRange: 0.7 });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg.startSpreadRange).toBe(0.95);
  });

  it('preserves custom spread 0.5 (user-tuned, not the old default)', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_BEHAVIOR_CONFIG, startSpreadRange: 0.5 });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg.startSpreadRange).toBe(0.5);
  });

  it('preserves custom spread 0.8', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_BEHAVIOR_CONFIG, startSpreadRange: 0.8 });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg.startSpreadRange).toBe(0.8);
  });

  it('runoutZone 0.0 (minimum) is valid', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_BEHAVIOR_CONFIG, runoutZone: 0.0 });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg.runoutZone).toBe(0.0);
  });

  it('runoutZone 0.20 (maximum) is valid', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_BEHAVIOR_CONFIG, runoutZone: 0.2 });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg.runoutZone).toBe(0.2);
  });

  it('runoutZone > 0.20 → returns defaults', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_BEHAVIOR_CONFIG, runoutZone: 0.5 });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg).toEqual(DEFAULT_RACE_BEHAVIOR_CONFIG);
  });

  it('runoutZone < 0 → returns defaults', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_BEHAVIOR_CONFIG, runoutZone: -0.01 });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg).toEqual(DEFAULT_RACE_BEHAVIOR_CONFIG);
  });
});

describe('saveRaceBehaviorConfig', () => {
  it('calls storageSet with the config', () => {
    const cfg = { ...DEFAULT_RACE_BEHAVIOR_CONFIG };
    saveRaceBehaviorConfig(cfg);
    expect(storageSet).toHaveBeenCalledWith('racearena:raceBehaviorConfig', cfg);
  });
});
