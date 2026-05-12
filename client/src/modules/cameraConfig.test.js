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

  it('schemaVersion=2 stored config is migrated to v4 and merged with defaults', () => {
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
    expect(cfg.schemaVersion).toBe(4);
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
  it('writes schemaVersion: 4', () => {
    const config = { ...DEFAULT_CAMERA_CONFIG };
    saveCameraConfig(config);
    expect(storageSet).toHaveBeenCalledWith(
      'racearena:cameraConfig',
      expect.objectContaining({ schemaVersion: 4 })
    );
  });

  it('writes schemaVersion: 4 even when not in input config', () => {
    saveCameraConfig({ maxTargetScreenPx: 160 });
    expect(storageSet).toHaveBeenCalledWith(
      'racearena:cameraConfig',
      expect.objectContaining({ schemaVersion: 4 })
    );
  });
});

describe('loadCameraConfig — v2/v3 migration', () => {
  it('migrates battleMaxDuration to battleMaxDurationMs (non-default value confirms migration ran)', () => {
    storageGet.mockReturnValue({
      schemaVersion: 2,
      battleMaxDuration: 9999,
    });
    const cfg = loadCameraConfig();
    expect(cfg.battleMaxDurationMs).toBe(9999);
    expect('battleMaxDuration' in cfg).toBe(false);
    expect(cfg.schemaVersion).toBe(4);
  });

  it('v2 config without battleMaxDuration migrates to v4 and gets default battleMaxDurationMs', () => {
    storageGet.mockReturnValue({
      schemaVersion: 2,
      maxTargetScreenPx: 200,
    });
    const cfg = loadCameraConfig();
    expect(cfg.schemaVersion).toBe(4);
    expect(cfg.maxTargetScreenPx).toBe(200);
    expect('battleMaxDuration' in cfg).toBe(false);
    expect(cfg.battleMaxDurationMs).toBe(DEFAULT_CAMERA_CONFIG.battleMaxDurationMs);
  });

  it('schemaVersion=3 config with battleMaxDurationMs is migrated to v4', () => {
    storageGet.mockReturnValue({
      schemaVersion: 3,
      battleMaxDurationMs: 8000,
    });
    const cfg = loadCameraConfig();
    expect(cfg.battleMaxDurationMs).toBe(8000);
    expect('battleMaxDuration' in cfg).toBe(false);
    expect(cfg.schemaVersion).toBe(4);
  });
});

describe('loadCameraConfig — v3→v4 migration: cameraStateProfiles built from legacy fields', () => {
  it('LEADER_ZOOM.spritePct matches stored spritePctOfCanvas.leader', () => {
    storageGet.mockReturnValue({
      schemaVersion: 3,
      spritePctOfCanvas: { overview: 0.05, leader: 0.11, battle: 0.12, comeback: 0.065 },
      cameraTransitionSeconds: { overview: 1.5, leader: 0.3, battle: 0.3, comeback: 0.3 },
    });
    const cfg = loadCameraConfig();
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spritePct).toBe(0.11);
  });

  it('BATTLE_ZOOM.maxStateDuration picks up battleMaxDurationMs (BATTLE had its own cap)', () => {
    storageGet.mockReturnValue({
      schemaVersion: 3,
      battleMaxDurationMs: 9000,
      maxStateDuration: 4000,
    });
    const cfg = loadCameraConfig();
    expect(cfg.cameraStateProfiles.BATTLE_ZOOM.maxStateDuration).toBe(9000);
    expect(cfg.cameraStateProfiles.OVERVIEW.maxStateDuration).toBe(4000);
  });

  it('OVERVIEW.trackingTC comes from cameraTransitionSeconds.overview', () => {
    storageGet.mockReturnValue({
      schemaVersion: 3,
      cameraTransitionSeconds: { overview: 2.5, leader: 0.4, battle: 0.4, comeback: 0.4 },
    });
    const cfg = loadCameraConfig();
    expect(cfg.cameraStateProfiles.OVERVIEW.trackingTC).toBe(2.5);
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.trackingTC).toBe(0.4);
  });

  it('minStateHold comes from global minStateHoldMs', () => {
    storageGet.mockReturnValue({
      schemaVersion: 3,
      minStateHoldMs: 7000,
    });
    const cfg = loadCameraConfig();
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.minStateHold).toBe(7000);
    expect(cfg.cameraStateProfiles.BATTLE_ZOOM.minStateHold).toBe(7000);
  });

  it('missing legacy fields fall back to DEFAULT_CAMERA_CONFIG profile values', () => {
    storageGet.mockReturnValue({ schemaVersion: 3 });
    const cfg = loadCameraConfig();
    const defProf = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spritePct).toBe(defProf.LEADER_ZOOM.spritePct);
    expect(cfg.cameraStateProfiles.OVERVIEW.trackingTC).toBe(defProf.OVERVIEW.trackingTC);
  });
});

describe('loadCameraConfig — v4 schema: deep-merge cameraStateProfiles', () => {
  it('stored v4 cameraStateProfiles are merged with defaults (missing sub-keys get defaults)', () => {
    storageGet.mockReturnValue({
      schemaVersion: 4,
      cameraStateProfiles: {
        LEADER_ZOOM: { spritePct: 0.15 }, // only spritePct overridden
      },
    });
    const cfg = loadCameraConfig();
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spritePct).toBe(0.15);
    // Other fields come from default
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.trackingTC).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM.trackingTC
    );
    // Unmentioned state uses defaults entirely
    expect(cfg.cameraStateProfiles.BATTLE_ZOOM.spritePct).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.BATTLE_ZOOM.spritePct
    );
  });

  it('entryConvergenceZoom and entryConvergencePx are present', () => {
    storageGet.mockReturnValue({ schemaVersion: 4 });
    const cfg = loadCameraConfig();
    expect(cfg.entryConvergenceZoom).toBe(DEFAULT_CAMERA_CONFIG.entryConvergenceZoom);
    expect(cfg.entryConvergencePx).toBe(DEFAULT_CAMERA_CONFIG.entryConvergencePx);
  });
});
