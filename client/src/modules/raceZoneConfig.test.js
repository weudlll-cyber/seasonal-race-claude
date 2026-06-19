// ============================================================
// File:        raceZoneConfig.test.js
// Path:        client/src/modules/raceZoneConfig.test.js
// Project:     RaceArena
// Created:     2026-06-19
// Description: Unit tests for raceZoneConfig load/save + validation
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DEFAULT_RACE_ZONE_CONFIG,
  loadRaceZoneConfig,
  saveRaceZoneConfig,
} from './raceZoneConfig.js';

vi.mock('./storage/storage.js', () => ({
  KEYS: { RACE_ZONE_CONFIG: 'racearena:raceZoneConfig' },
  storageGet: vi.fn(() => null),
  storageSet: vi.fn(),
  STORAGE_CHANGE_EVENT: 'racearena:storage-change',
}));

import { storageGet, storageSet } from './storage/storage.js';

beforeEach(() => {
  vi.clearAllMocks();
  storageGet.mockReturnValue(null);
});

describe('DEFAULT_RACE_ZONE_CONFIG', () => {
  it('is disabled by default', () => {
    expect(DEFAULT_RACE_ZONE_CONFIG.enabled).toBe(false);
  });

  it('has valid field ranges', () => {
    const d = DEFAULT_RACE_ZONE_CONFIG;
    expect(d.position).toBeGreaterThanOrEqual(0);
    expect(d.position).toBeLessThanOrEqual(1);
    expect(d.width).toBeGreaterThanOrEqual(0.01);
    expect(d.width).toBeLessThanOrEqual(0.2);
    expect(d.brakeStrength).toBeGreaterThanOrEqual(0.8);
    expect(d.brakeStrength).toBeLessThanOrEqual(1.0);
  });
});

describe('loadRaceZoneConfig', () => {
  it('returns defaults when storage is empty', () => {
    storageGet.mockReturnValue(null);
    expect(loadRaceZoneConfig()).toEqual(DEFAULT_RACE_ZONE_CONFIG);
  });

  it('returns defaults when stored value is not an object', () => {
    storageGet.mockReturnValue(42);
    expect(loadRaceZoneConfig()).toEqual(DEFAULT_RACE_ZONE_CONFIG);
  });

  it('returns defaults when enabled is not a boolean', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_ZONE_CONFIG, enabled: 'yes' });
    expect(loadRaceZoneConfig()).toEqual(DEFAULT_RACE_ZONE_CONFIG);
  });

  it('returns defaults when enabled is a number', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_ZONE_CONFIG, enabled: 1 });
    expect(loadRaceZoneConfig()).toEqual(DEFAULT_RACE_ZONE_CONFIG);
  });

  it('returns defaults when position is below 0', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_ZONE_CONFIG, enabled: true, position: -0.1 });
    expect(loadRaceZoneConfig()).toEqual(DEFAULT_RACE_ZONE_CONFIG);
  });

  it('returns defaults when position is above 1', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_ZONE_CONFIG, enabled: true, position: 1.1 });
    expect(loadRaceZoneConfig()).toEqual(DEFAULT_RACE_ZONE_CONFIG);
  });

  it('returns defaults when width is below 0.01', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_ZONE_CONFIG, enabled: true, width: 0.005 });
    expect(loadRaceZoneConfig()).toEqual(DEFAULT_RACE_ZONE_CONFIG);
  });

  it('returns defaults when width is 0.5 (above 0.20)', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_ZONE_CONFIG, enabled: true, width: 0.5 });
    expect(loadRaceZoneConfig()).toEqual(DEFAULT_RACE_ZONE_CONFIG);
  });

  it('clamps brakeStrength 0.5 to 0.80', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_ZONE_CONFIG, enabled: true, brakeStrength: 0.5 });
    expect(loadRaceZoneConfig().brakeStrength).toBe(0.8);
  });

  it('clamps brakeStrength 1.5 to 1.00', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_ZONE_CONFIG, enabled: true, brakeStrength: 1.5 });
    expect(loadRaceZoneConfig().brakeStrength).toBe(1.0);
  });

  it('accepts a valid enabled config unchanged (brakeStrength already in range)', () => {
    const valid = { enabled: true, position: 0.25, width: 0.1, brakeStrength: 0.9 };
    storageGet.mockReturnValue(valid);
    expect(loadRaceZoneConfig()).toEqual(valid);
  });

  it('does not mutate DEFAULT_RACE_ZONE_CONFIG', () => {
    storageGet.mockReturnValue({ enabled: true, position: 0.7 });
    loadRaceZoneConfig();
    expect(DEFAULT_RACE_ZONE_CONFIG.position).toBe(0.5);
  });
});

describe('saveRaceZoneConfig', () => {
  it('writes config to storage', () => {
    const cfg = { enabled: true, position: 0.3, width: 0.05, brakeStrength: 0.85 };
    saveRaceZoneConfig(cfg);
    expect(storageSet).toHaveBeenCalledWith('racearena:raceZoneConfig', cfg);
  });
});
