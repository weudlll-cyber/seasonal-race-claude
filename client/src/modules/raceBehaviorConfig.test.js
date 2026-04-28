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
  it('has enabled: true', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.enabled).toBe(true);
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

  it('accepts enabled: false as a valid stored value', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_BEHAVIOR_CONFIG, enabled: false });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg.enabled).toBe(false);
  });
});

describe('saveRaceBehaviorConfig', () => {
  it('calls storageSet with the config', () => {
    const cfg = { ...DEFAULT_RACE_BEHAVIOR_CONFIG };
    saveRaceBehaviorConfig(cfg);
    expect(storageSet).toHaveBeenCalledWith('racearena:raceBehaviorConfig', cfg);
  });
});
