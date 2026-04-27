import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  computeAutoScaleFactor,
  computeCameraZoomFactor,
  REFERENCE_CAMERA_ZOOM,
  DEFAULT_AUTO_SCALE_CONFIG,
  loadAutoScaleConfig,
  saveAutoScaleConfig,
} from './autoSpriteScale.js';

// Mock storage module
vi.mock('./storage/storage.js', () => ({
  KEYS: { AUTO_SCALE_CONFIG: 'racearena:autoScaleConfig' },
  storageGet: vi.fn(() => null),
  storageSet: vi.fn(),
}));

import { storageGet, storageSet } from './storage/storage.js';

beforeEach(() => {
  vi.clearAllMocks();
  storageGet.mockReturnValue(null);
});

describe('DEFAULT_AUTO_SCALE_CONFIG', () => {
  it('has expected defaults', () => {
    expect(DEFAULT_AUTO_SCALE_CONFIG).toEqual({
      enabled: true,
      referenceValue: 23,
      minScale: 0.4,
      maxScale: 2.5,
    });
  });
});

describe('computeAutoScaleFactor', () => {
  it('returns ≈ 1.0 for default track (140px) and 6 racers', () => {
    const factor = computeAutoScaleFactor(140, 6, DEFAULT_AUTO_SCALE_CONFIG);
    // 140 / 6 / 23 ≈ 1.014
    expect(factor).toBeGreaterThan(0.99);
    expect(factor).toBeLessThan(1.1);
  });

  it('clamps to minScale for very narrow track or many racers', () => {
    // 50 / 10 / 23 ≈ 0.217, below minScale 0.4
    expect(computeAutoScaleFactor(50, 10, DEFAULT_AUTO_SCALE_CONFIG)).toBe(0.4);
  });

  it('clamps to maxScale for very wide track or few racers', () => {
    // 2000 / 1 / 23 ≈ 86.9, above maxScale 2.5
    expect(computeAutoScaleFactor(2000, 1, DEFAULT_AUTO_SCALE_CONFIG)).toBe(2.5);
  });

  it('returns minScale when racerCount is 0', () => {
    expect(computeAutoScaleFactor(140, 0, DEFAULT_AUTO_SCALE_CONFIG)).toBe(0.4);
  });

  it('returns minScale when trackWidth is 0', () => {
    expect(computeAutoScaleFactor(0, 6, DEFAULT_AUTO_SCALE_CONFIG)).toBe(0.4);
  });

  it('returns minScale when both are 0', () => {
    expect(computeAutoScaleFactor(0, 0, DEFAULT_AUTO_SCALE_CONFIG)).toBe(0.4);
  });

  it('scales proportionally with larger referenceValue', () => {
    // doubling referenceValue halves the factor (before clamping)
    const cfg = { ...DEFAULT_AUTO_SCALE_CONFIG, referenceValue: 46 };
    const factor = computeAutoScaleFactor(140, 6, cfg);
    // 140 / 6 / 46 ≈ 0.507
    expect(factor).toBeCloseTo(0.507, 2);
  });

  it('respects custom minScale', () => {
    const cfg = { ...DEFAULT_AUTO_SCALE_CONFIG, minScale: 0.2 };
    // 20 / 10 / 23 ≈ 0.087, below minScale 0.2 → clamped to 0.2
    expect(computeAutoScaleFactor(20, 10, cfg)).toBe(0.2);
  });

  it('respects custom maxScale', () => {
    const cfg = { ...DEFAULT_AUTO_SCALE_CONFIG, maxScale: 1.5 };
    expect(computeAutoScaleFactor(2000, 1, cfg)).toBe(1.5);
  });

  it('returns exact neutral at trackWidth/racerCount == referenceValue', () => {
    const factor = computeAutoScaleFactor(23, 1, DEFAULT_AUTO_SCALE_CONFIG);
    expect(factor).toBe(1);
  });
});

describe('loadAutoScaleConfig', () => {
  it('returns DEFAULT_AUTO_SCALE_CONFIG when storage is empty', () => {
    storageGet.mockReturnValue(null);
    const cfg = loadAutoScaleConfig();
    expect(cfg).toEqual(DEFAULT_AUTO_SCALE_CONFIG);
  });

  it('merges stored values with defaults', () => {
    storageGet.mockReturnValue({ enabled: true, referenceValue: 30 });
    const cfg = loadAutoScaleConfig();
    expect(cfg.enabled).toBe(true);
    expect(cfg.referenceValue).toBe(30);
    expect(cfg.minScale).toBe(DEFAULT_AUTO_SCALE_CONFIG.minScale);
    expect(cfg.maxScale).toBe(DEFAULT_AUTO_SCALE_CONFIG.maxScale);
  });

  it('returns defaults when stored value is not an object', () => {
    storageGet.mockReturnValue(42);
    const cfg = loadAutoScaleConfig();
    expect(cfg).toEqual(DEFAULT_AUTO_SCALE_CONFIG);
  });

  it('does not mutate DEFAULT_AUTO_SCALE_CONFIG', () => {
    storageGet.mockReturnValue({ enabled: true });
    loadAutoScaleConfig();
    expect(DEFAULT_AUTO_SCALE_CONFIG.enabled).toBe(true);
  });
});

describe('saveAutoScaleConfig', () => {
  it('writes config to storage', () => {
    const cfg = { enabled: true, referenceValue: 30, minScale: 0.3, maxScale: 3.0 };
    saveAutoScaleConfig(cfg);
    expect(storageSet).toHaveBeenCalledWith('racearena:autoScaleConfig', cfg);
  });
});

describe('computeCameraZoomFactor', () => {
  it('returns 1.0 at the reference zoom (1280-track LEADER state)', () => {
    expect(computeCameraZoomFactor(REFERENCE_CAMERA_ZOOM)).toBeCloseTo(1.0);
  });

  it('returns ≈ 4.67 at zoom=0.3 (6000px track)', () => {
    expect(computeCameraZoomFactor(0.3)).toBeCloseTo(1.4 / 0.3, 3);
    expect(computeCameraZoomFactor(0.3)).toBeCloseTo(4.667, 2);
  });

  it('returns ≈ 3.11 at zoom=0.45 (4000px track)', () => {
    expect(computeCameraZoomFactor(0.45)).toBeCloseTo(1.4 / 0.45, 3);
    expect(computeCameraZoomFactor(0.45)).toBeCloseTo(3.111, 2);
  });

  it('returns 1 for zoom=0 (guard against divide-by-zero)', () => {
    expect(computeCameraZoomFactor(0)).toBe(1);
  });

  it('returns 1 for negative or falsy zoom (guard)', () => {
    expect(computeCameraZoomFactor(-1)).toBe(1);
    expect(computeCameraZoomFactor(null)).toBe(1);
  });

  it('on-screen sprite size is invariant: displaySize × factor × zoom = displaySize × REFERENCE_CAMERA_ZOOM', () => {
    // The whole point: sprite in world-space × cameraZoomFactor × zoom = constant on screen
    for (const zoom of [0.3, 0.45, 0.9, 1.4, 2.0]) {
      const onScreen = computeCameraZoomFactor(zoom) * zoom;
      expect(onScreen).toBeCloseTo(REFERENCE_CAMERA_ZOOM, 5);
    }
  });
});
