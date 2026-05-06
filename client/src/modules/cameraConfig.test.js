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

  it('schemaVersion=2 stored config is migrated to v3 and merged with defaults', () => {
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
    expect(cfg.schemaVersion).toBe(3);
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
  it('writes schemaVersion: 3', () => {
    const config = { ...DEFAULT_CAMERA_CONFIG };
    saveCameraConfig(config);
    expect(storageSet).toHaveBeenCalledWith(
      'racearena:cameraConfig',
      expect.objectContaining({ schemaVersion: 3 })
    );
  });

  it('writes schemaVersion: 3 even when not in input config', () => {
    saveCameraConfig({ maxTargetScreenPx: 160 });
    expect(storageSet).toHaveBeenCalledWith(
      'racearena:cameraConfig',
      expect.objectContaining({ schemaVersion: 3 })
    );
  });
});

describe('loadCameraConfig — v2→v3 migration', () => {
  it('migrates battleMaxDuration to battleMaxDurationMs (non-default value confirms migration ran)', () => {
    storageGet.mockReturnValue({
      schemaVersion: 2,
      battleMaxDuration: 9999,
    });
    const cfg = loadCameraConfig();
    expect(cfg.battleMaxDurationMs).toBe(9999);
    expect('battleMaxDuration' in cfg).toBe(false);
    expect(cfg.schemaVersion).toBe(3);
  });

  it('v2 config without battleMaxDuration still migrates to v3 and gets default battleMaxDurationMs', () => {
    storageGet.mockReturnValue({
      schemaVersion: 2,
      maxTargetScreenPx: 200,
    });
    const cfg = loadCameraConfig();
    expect(cfg.schemaVersion).toBe(3);
    expect(cfg.maxTargetScreenPx).toBe(200);
    expect('battleMaxDuration' in cfg).toBe(false);
    expect(cfg.battleMaxDurationMs).toBe(DEFAULT_CAMERA_CONFIG.battleMaxDurationMs);
  });

  it('schemaVersion=3 config with battleMaxDurationMs is loaded without migration', () => {
    storageGet.mockReturnValue({
      schemaVersion: 3,
      battleMaxDurationMs: 8000,
    });
    const cfg = loadCameraConfig();
    expect(cfg.battleMaxDurationMs).toBe(8000);
    expect('battleMaxDuration' in cfg).toBe(false);
    expect(cfg.schemaVersion).toBe(3);
  });
});
