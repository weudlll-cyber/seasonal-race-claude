// ============================================================
// File:        plannerTuningConfig.test.js
// Path:        client/src/modules/plannerTuningConfig.test.js
// Project:     RaceArena
// Created:     2026-05-13
// Description: Tests for plannerTuningConfig storage CRUD and defaults.
//              Part of speed-range-fix sprint (PR #94 follow-up).
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DEFAULT_PLANNER_TUNING_CONFIG,
  loadPlannerTuningConfig,
  savePlannerTuningConfig,
} from './plannerTuningConfig.js';

vi.mock('./storage/storage.js', () => ({
  KEYS: { PLANNER_TUNING_CONFIG: 'racearena:plannerTuningConfig' },
  storageGet: vi.fn(() => null),
  storageSet: vi.fn(),
}));

import { storageGet, storageSet } from './storage/storage.js';

beforeEach(() => {
  vi.clearAllMocks();
  storageGet.mockReturnValue(null);
});

describe('DEFAULT_PLANNER_TUNING_CONFIG', () => {
  it('has all required keys', () => {
    const keys = [
      'aSMin',
      'aSMax',
      'vYMax',
      'aYMax',
      'safetyBufferS',
      'safetyBufferY',
      'horizonSeconds',
      'wSpeed',
      'wCenterline',
      'wDraft',
      'wSmoothY',
      'wSmoothS',
    ];
    for (const key of keys) {
      expect(DEFAULT_PLANNER_TUNING_CONFIG).toHaveProperty(key);
    }
  });

  it('aSMin is -50', () => {
    expect(DEFAULT_PLANNER_TUNING_CONFIG.aSMin).toBe(-50.0);
  });

  it('aSMax is 30', () => {
    expect(DEFAULT_PLANNER_TUNING_CONFIG.aSMax).toBe(30.0);
  });

  it('vYMax is 30', () => {
    expect(DEFAULT_PLANNER_TUNING_CONFIG.vYMax).toBe(30.0);
  });

  it('aYMax is 90', () => {
    expect(DEFAULT_PLANNER_TUNING_CONFIG.aYMax).toBe(90.0);
  });

  it('safetyBufferS is 14', () => {
    expect(DEFAULT_PLANNER_TUNING_CONFIG.safetyBufferS).toBe(14);
  });

  it('safetyBufferY is 4', () => {
    expect(DEFAULT_PLANNER_TUNING_CONFIG.safetyBufferY).toBe(4);
  });

  it('horizonSeconds is 0.8', () => {
    expect(DEFAULT_PLANNER_TUNING_CONFIG.horizonSeconds).toBe(0.8);
  });

  it('wSpeed is 1.6', () => {
    expect(DEFAULT_PLANNER_TUNING_CONFIG.wSpeed).toBe(1.6);
  });

  it('wCenterline is 0.015', () => {
    expect(DEFAULT_PLANNER_TUNING_CONFIG.wCenterline).toBe(0.015);
  });

  it('wDraft is 0.7', () => {
    expect(DEFAULT_PLANNER_TUNING_CONFIG.wDraft).toBe(0.7);
  });
});

describe('loadPlannerTuningConfig', () => {
  it('returns defaults when storage is empty', () => {
    storageGet.mockReturnValue(null);
    expect(loadPlannerTuningConfig()).toEqual(DEFAULT_PLANNER_TUNING_CONFIG);
  });

  it('merges stored values with defaults', () => {
    storageGet.mockReturnValue({ aSMin: -80, horizonSeconds: 1.2 });
    const cfg = loadPlannerTuningConfig();
    expect(cfg.aSMin).toBe(-80);
    expect(cfg.horizonSeconds).toBe(1.2);
    expect(cfg.aSMax).toBe(30.0);
  });

  it('returns defaults when stored value is not an object', () => {
    storageGet.mockReturnValue(42);
    expect(loadPlannerTuningConfig()).toEqual(DEFAULT_PLANNER_TUNING_CONFIG);
  });

  it('does not mutate DEFAULT_PLANNER_TUNING_CONFIG', () => {
    storageGet.mockReturnValue({ aSMin: -100 });
    loadPlannerTuningConfig();
    expect(DEFAULT_PLANNER_TUNING_CONFIG.aSMin).toBe(-50.0);
  });
});

describe('savePlannerTuningConfig', () => {
  it('writes config to storage', () => {
    const cfg = { ...DEFAULT_PLANNER_TUNING_CONFIG, aSMin: -80 };
    savePlannerTuningConfig(cfg);
    expect(storageSet).toHaveBeenCalledWith('racearena:plannerTuningConfig', cfg);
  });
});
