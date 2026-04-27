import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  computeAutoScaleFactor,
  computeCameraZoomFactor,
  computeOpenTrackCameraZoomFactor,
  REFERENCE_CAMERA_ZOOM,
  DEFAULT_AUTO_SCALE_CONFIG,
  loadAutoScaleConfig,
  saveAutoScaleConfig,
} from './autoSpriteScale.js';
import { OPEN_TRACK_BASE_ZOOM } from './camera/openTrackCamera.js';

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
      minScale: 0.65,
      maxScale: 2.5,
      minVisiblePixels: 32,
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
    // 50 / 10 / 23 ≈ 0.217, below minScale 0.65 (Befund-3 fix: was 0.4)
    expect(computeAutoScaleFactor(50, 10, DEFAULT_AUTO_SCALE_CONFIG)).toBe(0.65);
  });

  it('clamps to maxScale for very wide track or few racers', () => {
    // 2000 / 1 / 23 ≈ 86.9, above maxScale 2.5
    expect(computeAutoScaleFactor(2000, 1, DEFAULT_AUTO_SCALE_CONFIG)).toBe(2.5);
  });

  it('returns minScale when racerCount is 0', () => {
    expect(computeAutoScaleFactor(140, 0, DEFAULT_AUTO_SCALE_CONFIG)).toBe(0.65);
  });

  it('returns minScale when trackWidth is 0', () => {
    expect(computeAutoScaleFactor(0, 6, DEFAULT_AUTO_SCALE_CONFIG)).toBe(0.65);
  });

  it('returns minScale when both are 0', () => {
    expect(computeAutoScaleFactor(0, 0, DEFAULT_AUTO_SCALE_CONFIG)).toBe(0.65);
  });

  it('minScale 0.65 floor: 6 racers on 50px track still returns at least 0.65', () => {
    // 50 / 6 / 23 ≈ 0.362 — below old minScale 0.4 and new 0.65 — floor prevents tiny sprites
    const result = computeAutoScaleFactor(50, 6, DEFAULT_AUTO_SCALE_CONFIG);
    expect(result).toBeGreaterThanOrEqual(0.65);
  });

  it('scales proportionally with larger referenceValue', () => {
    // doubling referenceValue halves the factor (before clamping)
    // Use minScale=0.3 so 0.507 is not clamped
    const cfg = { ...DEFAULT_AUTO_SCALE_CONFIG, referenceValue: 46, minScale: 0.3 };
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

describe('computeOpenTrackCameraZoomFactor', () => {
  it('at cam.zoom=1: factor = REFERENCE / BASE ≈ 0.933', () => {
    expect(computeOpenTrackCameraZoomFactor(1)).toBeCloseTo(
      REFERENCE_CAMERA_ZOOM / OPEN_TRACK_BASE_ZOOM,
      5
    );
  });

  it('on-screen size is invariant: factor × effZoom = REFERENCE_CAMERA_ZOOM', () => {
    // factor × (BASE × camZoom) = REFERENCE regardless of camZoom
    for (const z of [0.8, 1.0, 1.4, 1.6]) {
      const effZoom = OPEN_TRACK_BASE_ZOOM * z;
      const onScreen = computeOpenTrackCameraZoomFactor(z) * effZoom;
      expect(onScreen).toBeCloseTo(REFERENCE_CAMERA_ZOOM, 5);
    }
  });

  it('open-track on-screen size matches closed-track reference (backward-compat)', () => {
    // Closed 1280 at LEADER_ZOOM: displaySize × factor(1.4) × cam.zoom(1.4) = displaySize × 1.4
    const closedOnScreen = computeCameraZoomFactor(1.4) * 1.4;
    // Open track at cam.zoom=1.0: displaySize × factor × effZoom = displaySize × 1.4
    const openOnScreen = computeOpenTrackCameraZoomFactor(1.0) * (OPEN_TRACK_BASE_ZOOM * 1.0);
    expect(openOnScreen).toBeCloseTo(closedOnScreen, 5);
  });

  it('returns 1 for invalid input', () => {
    expect(computeOpenTrackCameraZoomFactor(0)).toBe(1);
    expect(computeOpenTrackCameraZoomFactor(-1)).toBe(1);
    expect(computeOpenTrackCameraZoomFactor(null)).toBe(1);
  });
});

describe('computeAutoScaleFactor — pixel floor', () => {
  it('pixel floor raises factor above minScale for snail (displaySize=35, 20 racers)', () => {
    // Without pixel floor: 140/20/23 ≈ 0.304, clamped to minScale=0.65 → 35×0.65×1.4=31.85 < 32
    // With pixel floor: floor = 32/(35×1.4) ≈ 0.653 > minScale=0.65 → raised above minScale
    const factor = computeAutoScaleFactor(140, 20, DEFAULT_AUTO_SCALE_CONFIG, 35);
    // factor is set by pixel floor (> minScale), on-screen ≈ exactly 32px
    expect(factor).toBeGreaterThan(DEFAULT_AUTO_SCALE_CONFIG.minScale);
    expect(35 * factor * REFERENCE_CAMERA_ZOOM).toBeCloseTo(32, 0); // within ±0.5px
  });

  it('auto-scale minimum visible pixels — horse (displaySize=40) >= 32px', () => {
    const factor = computeAutoScaleFactor(140, 20, DEFAULT_AUTO_SCALE_CONFIG, 40);
    const onScreenPixels = 40 * factor * REFERENCE_CAMERA_ZOOM;
    expect(onScreenPixels).toBeGreaterThanOrEqual(32);
  });

  it('pixel floor does not affect 6-racer case (lane factor dominates)', () => {
    const withFloor = computeAutoScaleFactor(140, 6, DEFAULT_AUTO_SCALE_CONFIG, 40);
    const withoutFloor = computeAutoScaleFactor(140, 6, DEFAULT_AUTO_SCALE_CONFIG);
    // 140/6/23 ≈ 1.014 — well above any pixel floor
    expect(withFloor).toBeCloseTo(withoutFloor, 5);
  });

  it('custom minVisiblePixels=48 raises floor for small displaySize', () => {
    const cfg = { ...DEFAULT_AUTO_SCALE_CONFIG, minVisiblePixels: 48 };
    const factor = computeAutoScaleFactor(140, 20, cfg, 35);
    // floor = 48 / (35 × 1.4) ≈ 0.980 → on screen ≈ 48px
    expect(35 * factor * REFERENCE_CAMERA_ZOOM).toBeCloseTo(48, 0);
  });

  it('without displaySize, falls back to minScale-only behavior', () => {
    // No pixel floor when displaySize not provided
    const factor = computeAutoScaleFactor(140, 20, DEFAULT_AUTO_SCALE_CONFIG);
    expect(factor).toBe(DEFAULT_AUTO_SCALE_CONFIG.minScale);
  });
});
