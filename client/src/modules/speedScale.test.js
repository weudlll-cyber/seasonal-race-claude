// ============================================================
// File:        speedScale.test.js
// Path:        client/src/modules/speedScale.test.js
// Project:     RaceArena
// Created:     2026-04-27
// Description: Unit tests for the B-17 speed-scale formula and config helpers
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  computeSpeedScaleFactor,
  loadSpeedScaleConfig,
  saveSpeedScaleConfig,
} from './speedScale.js';
import { DEFAULT_SPEED_SCALE_CONFIG } from './storage/defaults.js';

vi.mock('./storage/storage.js', () => ({
  KEYS: { SPEED_SCALE_CONFIG: 'racearena:speedScaleConfig' },
  storageGet: vi.fn(() => null),
  storageSet: vi.fn(),
}));

import { storageGet, storageSet } from './storage/storage.js';

beforeEach(() => {
  vi.clearAllMocks();
  storageGet.mockReturnValue(null);
});

describe('DEFAULT_SPEED_SCALE_CONFIG', () => {
  it('has expected defaults', () => {
    expect(DEFAULT_SPEED_SCALE_CONFIG).toEqual({
      enabled: true,
      referencePathLength: 2000,
      minScale: 0.5,
      maxScale: 10.0,
    });
  });
});

describe('computeSpeedScaleFactor', () => {
  const cfg = DEFAULT_SPEED_SCALE_CONFIG;

  it('returns 1 when disabled', () => {
    expect(computeSpeedScaleFactor(4000, { ...cfg, enabled: false })).toBe(1);
  });

  it('returns 1 when pathLengthPx is null', () => {
    expect(computeSpeedScaleFactor(null, cfg)).toBe(1);
  });

  it('returns 1 when pathLengthPx is 0', () => {
    expect(computeSpeedScaleFactor(0, cfg)).toBe(1);
  });

  it('returns 1.0 at the reference path length', () => {
    expect(computeSpeedScaleFactor(2000, cfg)).toBeCloseTo(1.0, 5);
  });

  it('returns 2.0 for a path twice the reference length', () => {
    expect(computeSpeedScaleFactor(4000, cfg)).toBeCloseTo(2.0, 5);
  });

  it('returns 0.5 for a path half the reference length', () => {
    expect(computeSpeedScaleFactor(1000, cfg)).toBeCloseTo(0.5, 5);
  });

  it('clamps at maxScale for very long paths', () => {
    expect(computeSpeedScaleFactor(100000, cfg)).toBe(cfg.maxScale);
  });

  it('clamps at minScale for very short paths', () => {
    expect(computeSpeedScaleFactor(1, cfg)).toBe(cfg.minScale);
  });

  it('respects custom referencePathLength', () => {
    const custom = { ...cfg, referencePathLength: 1000 };
    expect(computeSpeedScaleFactor(1000, custom)).toBeCloseTo(1.0, 5);
    expect(computeSpeedScaleFactor(2000, custom)).toBeCloseTo(2.0, 5);
  });

  it('respects custom min/max clamp values', () => {
    const custom = { ...cfg, minScale: 0.8, maxScale: 1.5 };
    expect(computeSpeedScaleFactor(50, custom)).toBe(0.8);
    expect(computeSpeedScaleFactor(50000, custom)).toBe(1.5);
  });
});

describe('loadSpeedScaleConfig', () => {
  it('returns DEFAULT_SPEED_SCALE_CONFIG when nothing is stored', () => {
    storageGet.mockReturnValue(null);
    expect(loadSpeedScaleConfig()).toEqual(DEFAULT_SPEED_SCALE_CONFIG);
  });

  it('merges stored overrides with defaults', () => {
    storageGet.mockReturnValue({ referencePathLength: 3000 });
    const cfg = loadSpeedScaleConfig();
    expect(cfg.referencePathLength).toBe(3000);
    expect(cfg.enabled).toBe(DEFAULT_SPEED_SCALE_CONFIG.enabled);
    expect(cfg.minScale).toBe(DEFAULT_SPEED_SCALE_CONFIG.minScale);
    expect(cfg.maxScale).toBe(DEFAULT_SPEED_SCALE_CONFIG.maxScale);
  });
});

describe('saveSpeedScaleConfig', () => {
  it('calls storageSet with the correct key', () => {
    const config = { ...DEFAULT_SPEED_SCALE_CONFIG, referencePathLength: 3000 };
    saveSpeedScaleConfig(config);
    expect(storageSet).toHaveBeenCalledWith('racearena:speedScaleConfig', config);
  });
});

describe('maxScale=10 — Space Sprint consistency (Q-25)', () => {
  // Space Sprint empirical values from §7.1 of CAMERA_DIRECTOR.md
  const SPACE_SPRINT_PATH_PX = 19772;
  const REFERENCE_FPS = 62.5;
  const BASE_SPEED_MEAN = 0.001045;

  it('Space Sprint ssf is no longer capped at 4.0 with maxScale=10', () => {
    const ssf = computeSpeedScaleFactor(SPACE_SPRINT_PATH_PX, DEFAULT_SPEED_SCALE_CONFIG);
    // raw = 19772/2000 = 9.886; maxScale=10 => not capped
    expect(ssf).toBeCloseTo(9.886, 2);
    expect(ssf).toBeGreaterThan(4.0);
  });

  it('Space Sprint visual pixel rate matches River Run rate within 5% with maxScale=10 (B-17)', () => {
    const RIVER_RUN_PATH_PX = 6156;
    const ssfSpace = computeSpeedScaleFactor(SPACE_SPRINT_PATH_PX, DEFAULT_SPEED_SCALE_CONFIG);
    const ssfRiver = computeSpeedScaleFactor(RIVER_RUN_PATH_PX, DEFAULT_SPEED_SCALE_CONFIG);
    // B-17: visual traversal rate (px/s) = baseSpeedMean * REFERENCE_FPS / ssf * pathLengthPx
    // ssf = pathLengthPx / referencePathLength, so rate = baseSpeedMean * REFERENCE_FPS * referencePathLength (constant)
    const rateSpace = (BASE_SPEED_MEAN * REFERENCE_FPS * SPACE_SPRINT_PATH_PX) / ssfSpace;
    const rateRiver = (BASE_SPEED_MEAN * REFERENCE_FPS * RIVER_RUN_PATH_PX) / ssfRiver;
    expect(Math.abs(rateSpace - rateRiver) / rateRiver).toBeLessThan(0.05);
  });

  it('Space Sprint race duration at maxScale=10 is approximately 144s', () => {
    const ssf = computeSpeedScaleFactor(SPACE_SPRINT_PATH_PX, DEFAULT_SPEED_SCALE_CONFIG);
    const runoutZone = 0.05;
    const naturalSeconds = (ssf * (1 - runoutZone)) / (BASE_SPEED_MEAN * REFERENCE_FPS);
    expect(naturalSeconds).toBeGreaterThan(130);
    expect(naturalSeconds).toBeLessThan(160);
  });
});
