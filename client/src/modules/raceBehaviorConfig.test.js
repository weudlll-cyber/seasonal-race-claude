// ============================================================
// File:        raceBehaviorConfig.test.js
// Path:        client/src/modules/raceBehaviorConfig.test.js
// Project:     RaceArena
// Description: Unit tests for race-behavior config CRUD.
//              Old force-based constants replaced by slot-based constants.
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
  it('startSpreadRange is 0.95', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.startSpreadRange).toBe(0.95);
  });

  it('runoutZone is 0.05', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.runoutZone).toBe(0.05);
  });

  it('has enabled: true', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.enabled).toBe(true);
  });

  it('safetyMarginPx is non-negative', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.safetyMarginPx).toBeGreaterThanOrEqual(0);
  });

  it('lookAheadFrames is non-negative', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.lookAheadFrames).toBeGreaterThanOrEqual(0);
  });

  it('slotSearchRadiusPx is positive', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.slotSearchRadiusPx).toBeGreaterThan(0);
  });

  it('lateralReturnSpeed is 0.2', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.lateralReturnSpeed).toBe(0.2);
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

  it('does not have old force-based constants', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG).not.toHaveProperty('homeForceStrength');
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG).not.toHaveProperty('avoidanceDistance');
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG).not.toHaveProperty('lateralForce');
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG).not.toHaveProperty('comfortThreshold');
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG).not.toHaveProperty('softRepulsionStrength');
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG).not.toHaveProperty('tWeight');
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG).not.toHaveProperty('yWeight');
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG).not.toHaveProperty('maxLateral');
  });
});

describe('loadRaceBehaviorConfig', () => {
  it('returns defaults when nothing stored', () => {
    storageGet.mockReturnValue(null);
    const cfg = loadRaceBehaviorConfig();
    expect(cfg).toEqual(DEFAULT_RACE_BEHAVIOR_CONFIG);
  });

  it('merges stored values with defaults', () => {
    storageGet.mockReturnValue({ safetyMarginPx: 5, draftingBoost: 1.2 });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg.safetyMarginPx).toBe(5);
    expect(cfg.draftingBoost).toBe(1.2);
    expect(cfg.enabled).toBe(DEFAULT_RACE_BEHAVIOR_CONFIG.enabled);
  });

  it('returns defaults when slotSearchRadiusPx <= 0', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_BEHAVIOR_CONFIG, slotSearchRadiusPx: 0 });
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

  it('returns defaults when lateralReturnSpeed <= 0', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_BEHAVIOR_CONFIG, lateralReturnSpeed: 0 });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg).toEqual(DEFAULT_RACE_BEHAVIOR_CONFIG);
  });

  it('returns defaults when lateralReturnSpeed > 1', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_BEHAVIOR_CONFIG, lateralReturnSpeed: 1.1 });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg).toEqual(DEFAULT_RACE_BEHAVIOR_CONFIG);
  });

  it('accepts lateralReturnSpeed 1.0 (boundary)', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_BEHAVIOR_CONFIG, lateralReturnSpeed: 1.0 });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg.lateralReturnSpeed).toBe(1.0);
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

  it('preserves custom spread 0.5', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_BEHAVIOR_CONFIG, startSpreadRange: 0.5 });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg.startSpreadRange).toBe(0.5);
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
});

describe('saveRaceBehaviorConfig', () => {
  it('calls storageSet with the config', () => {
    const cfg = { ...DEFAULT_RACE_BEHAVIOR_CONFIG };
    saveRaceBehaviorConfig(cfg);
    expect(storageSet).toHaveBeenCalledWith('racearena:raceBehaviorConfig', cfg);
  });
});
