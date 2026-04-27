// ============================================================
// File:        raceBehaviorConfig.test.js
// Path:        client/src/modules/raceBehaviorConfig.test.js
// Project:     RaceArena
// Created:     2026-04-27
// Description: Unit tests for race-behavior config CRUD (D11).
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

  it('has positive avoidance values', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.avoidanceDistance).toBeGreaterThan(0);
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.avoidanceLateralForce).toBeGreaterThan(0);
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.avoidanceMaxLateral).toBeGreaterThan(0);
  });

  it('avoidanceSpeedBrake is between 0 and 1', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.avoidanceSpeedBrake).toBeGreaterThan(0);
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.avoidanceSpeedBrake).toBeLessThanOrEqual(1);
  });

  it('draftingBoostFactor >= 1', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.draftingBoostFactor).toBeGreaterThanOrEqual(1);
  });
});

describe('loadRaceBehaviorConfig', () => {
  it('returns defaults when nothing stored', () => {
    storageGet.mockReturnValue(null);
    const cfg = loadRaceBehaviorConfig();
    expect(cfg).toEqual(DEFAULT_RACE_BEHAVIOR_CONFIG);
  });

  it('merges stored values with defaults', () => {
    storageGet.mockReturnValue({ avoidanceDistance: 120, draftingBoostFactor: 1.2 });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg.avoidanceDistance).toBe(120);
    expect(cfg.draftingBoostFactor).toBe(1.2);
    expect(cfg.enabled).toBe(DEFAULT_RACE_BEHAVIOR_CONFIG.enabled);
  });

  it('returns defaults when stored config has invalid avoidanceDistance', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_BEHAVIOR_CONFIG, avoidanceDistance: -1 });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg).toEqual(DEFAULT_RACE_BEHAVIOR_CONFIG);
  });

  it('returns defaults when avoidanceSpeedBrake > 1', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_BEHAVIOR_CONFIG, avoidanceSpeedBrake: 1.5 });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg).toEqual(DEFAULT_RACE_BEHAVIOR_CONFIG);
  });

  it('returns defaults when draftingBoostFactor < 1', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_BEHAVIOR_CONFIG, draftingBoostFactor: 0.9 });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg).toEqual(DEFAULT_RACE_BEHAVIOR_CONFIG);
  });

  it('returns defaults when avoidanceReturnSpeed >= 1', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_BEHAVIOR_CONFIG, avoidanceReturnSpeed: 1.0 });
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
