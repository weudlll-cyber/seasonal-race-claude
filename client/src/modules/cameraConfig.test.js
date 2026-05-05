import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./storage/storage.js', () => ({
  KEYS: { CAMERA_CONFIG: 'racearena:cameraConfig' },
  storageGet: vi.fn(() => null),
  storageSet: vi.fn(),
}));

import { storageGet, storageSet } from './storage/storage.js';
import { loadCameraConfig, saveCameraConfig } from './cameraConfig.js';
import { DEFAULT_CAMERA_CONFIG } from './storage/defaults.js';

beforeEach(() => {
  vi.clearAllMocks();
  storageGet.mockReturnValue(null);
});

describe('loadCameraConfig', () => {
  it('returns DEFAULT_CAMERA_CONFIG when storage is empty', () => {
    const cfg = loadCameraConfig();
    expect(cfg).toEqual(DEFAULT_CAMERA_CONFIG);
  });

  it('migration schema v1 (missing schemaVersion) → DEFAULT_CAMERA_CONFIG', () => {
    storageGet.mockReturnValue({
      leaderZoomMultiplier: 1.8,
      battleZoomMultiplier: 2.5,
      comebackZoomMultiplier: 1.5,
      minSpritePctOfCanvas: 0.05,
      maxTargetScreenPx: 160,
    });
    const cfg = loadCameraConfig();
    expect(cfg).toEqual(DEFAULT_CAMERA_CONFIG);
  });

  it('migration schemaVersion=1 (explicit old version) → DEFAULT_CAMERA_CONFIG', () => {
    storageGet.mockReturnValue({
      schemaVersion: 1,
      leaderZoomMultiplier: 1.8,
      minSpritePctOfCanvas: 0.05,
    });
    const cfg = loadCameraConfig();
    expect(cfg).toEqual(DEFAULT_CAMERA_CONFIG);
  });

  it('does not crash on old localStorage shape — no field missing errors', () => {
    storageGet.mockReturnValue({ leaderZoomMultiplier: 1.5, maxTargetScreenPx: 200 });
    expect(() => loadCameraConfig()).not.toThrow();
  });

  it('schemaVersion=2 stored config is merged with defaults', () => {
    storageGet.mockReturnValue({
      schemaVersion: 2,
      maxTargetScreenPx: 200,
      spritePctOfCanvas: {
        overview: 0.05,
        leader: 0.08,
        battle: 0.12,
        comeback: 0.065,
      },
      battleGapThreshold: 0.1,
      maxStateDuration: 4000,
      endgameThreshold: 0.85,
      tagVisibleMaxCount: 10,
      showCameraStateHud: true,
    });
    const cfg = loadCameraConfig();
    expect(cfg.maxTargetScreenPx).toBe(200);
    expect(cfg.schemaVersion).toBe(2);
  });

  it('schemaVersion=2: respects stored spritePctOfCanvas.leader', () => {
    storageGet.mockReturnValue({
      schemaVersion: 2,
      spritePctOfCanvas: {
        overview: 0.05,
        leader: 0.1,
        battle: 0.12,
        comeback: 0.065,
      },
    });
    const cfg = loadCameraConfig();
    expect(cfg.spritePctOfCanvas.leader).toBe(0.1);
  });

  it('schemaVersion=2: missing spritePctOfCanvas sub-keys fall back to defaults', () => {
    storageGet.mockReturnValue({
      schemaVersion: 2,
      spritePctOfCanvas: { leader: 0.1 }, // only leader overridden
    });
    const cfg = loadCameraConfig();
    expect(cfg.spritePctOfCanvas.leader).toBe(0.1);
    expect(cfg.spritePctOfCanvas.overview).toBe(DEFAULT_CAMERA_CONFIG.spritePctOfCanvas.overview);
    expect(cfg.spritePctOfCanvas.battle).toBe(DEFAULT_CAMERA_CONFIG.spritePctOfCanvas.battle);
  });
});

describe('saveCameraConfig', () => {
  it('writes schemaVersion: 2', () => {
    const config = { ...DEFAULT_CAMERA_CONFIG };
    saveCameraConfig(config);
    expect(storageSet).toHaveBeenCalledWith(
      'racearena:cameraConfig',
      expect.objectContaining({ schemaVersion: 2 })
    );
  });

  it('writes schemaVersion: 2 even when not in input config', () => {
    saveCameraConfig({ maxTargetScreenPx: 160 });
    expect(storageSet).toHaveBeenCalledWith(
      'racearena:cameraConfig',
      expect.objectContaining({ schemaVersion: 2 })
    );
  });
});
