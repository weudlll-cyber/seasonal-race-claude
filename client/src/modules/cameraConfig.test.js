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

  it('schemaVersion=2 stored config is migrated to v7 and merged with defaults', () => {
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
    expect(cfg.schemaVersion).toBe(7);
  });

  it('schemaVersion=2: respects stored spritePctOfCanvas.leader → migrated to spritePx', () => {
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
    // 0.1 × 720 = 72
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spritePx).toBe(72);
    expect(cfg.spritePctOfCanvas.leader).toBe(0.1);
  });

  it('schemaVersion=2: missing spritePctOfCanvas sub-keys fall back to pixel defaults', () => {
    storageGet.mockReturnValue({
      schemaVersion: 2,
      spritePctOfCanvas: { leader: 0.1 }, // only leader overridden
    });
    const cfg = loadCameraConfig();
    // leader: Math.round(0.1×720)=72; overview/battle use pixel defaults
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spritePx).toBe(72);
    expect(cfg.cameraStateProfiles.OVERVIEW.spritePx).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.OVERVIEW.spritePx
    );
    expect(cfg.cameraStateProfiles.BATTLE_ZOOM.spritePx).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.BATTLE_ZOOM.spritePx
    );
  });
});

describe('saveCameraConfig', () => {
  it('writes schemaVersion: 7', () => {
    const config = { ...DEFAULT_CAMERA_CONFIG };
    saveCameraConfig(config);
    expect(storageSet).toHaveBeenCalledWith(
      'racearena:cameraConfig',
      expect.objectContaining({ schemaVersion: 7 })
    );
  });

  it('writes schemaVersion: 7 even when not in input config', () => {
    saveCameraConfig({ maxTargetScreenPx: 160 });
    expect(storageSet).toHaveBeenCalledWith(
      'racearena:cameraConfig',
      expect.objectContaining({ schemaVersion: 7 })
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
    expect(cfg.schemaVersion).toBe(7);
  });

  it('v2 config without battleMaxDuration migrates to v7 and gets default battleMaxDurationMs', () => {
    storageGet.mockReturnValue({
      schemaVersion: 2,
      maxTargetScreenPx: 200,
    });
    const cfg = loadCameraConfig();
    expect(cfg.schemaVersion).toBe(7);
    expect(cfg.maxTargetScreenPx).toBe(200);
    expect('battleMaxDuration' in cfg).toBe(false);
    expect(cfg.battleMaxDurationMs).toBe(DEFAULT_CAMERA_CONFIG.battleMaxDurationMs);
  });

  it('schemaVersion=3 config with battleMaxDurationMs is migrated to v7', () => {
    storageGet.mockReturnValue({
      schemaVersion: 3,
      battleMaxDurationMs: 8000,
    });
    const cfg = loadCameraConfig();
    expect(cfg.battleMaxDurationMs).toBe(8000);
    expect('battleMaxDuration' in cfg).toBe(false);
    expect(cfg.schemaVersion).toBe(7);
  });
});

describe('loadCameraConfig — v3→v4 migration: cameraStateProfiles built from legacy fields', () => {
  it('LEADER_ZOOM.spritePx is derived from stored spritePctOfCanvas.leader (0.11→79px)', () => {
    storageGet.mockReturnValue({
      schemaVersion: 3,
      spritePctOfCanvas: { overview: 0.05, leader: 0.11, battle: 0.12, comeback: 0.065 },
      cameraTransitionSeconds: { overview: 1.5, leader: 0.3, battle: 0.3, comeback: 0.3 },
    });
    const cfg = loadCameraConfig();
    // Math.round(0.11 × 720) = Math.round(79.2) = 79
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spritePx).toBe(79);
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

  it('missing legacy fields fall back to DEFAULT_CAMERA_CONFIG profile pixel values', () => {
    storageGet.mockReturnValue({ schemaVersion: 3 });
    const cfg = loadCameraConfig();
    const defProf = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spritePx).toBe(defProf.LEADER_ZOOM.spritePx);
    expect(cfg.cameraStateProfiles.OVERVIEW.trackingTC).toBe(defProf.OVERVIEW.trackingTC);
  });
});

describe('loadCameraConfig — v4 schema: deep-merge cameraStateProfiles', () => {
  it('stored v4 cameraStateProfiles are merged and spritePct→spritePx converted', () => {
    storageGet.mockReturnValue({
      schemaVersion: 4,
      cameraStateProfiles: {
        LEADER_ZOOM: { spritePct: 0.15 }, // only spritePct overridden (v4 format)
      },
    });
    const cfg = loadCameraConfig();
    // migrateV6toV7 converts 0.15 × 720 = 108
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spritePx).toBe(108);
    expect('spritePct' in cfg.cameraStateProfiles.LEADER_ZOOM).toBe(false);
    // Other fields come from default
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.trackingTC).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM.trackingTC
    );
    // Unmentioned state uses pixel defaults
    expect(cfg.cameraStateProfiles.BATTLE_ZOOM.spritePx).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.BATTLE_ZOOM.spritePx
    );
  });

  it('entryConvergenceZoom and entryConvergencePx are present', () => {
    storageGet.mockReturnValue({ schemaVersion: 4 });
    const cfg = loadCameraConfig();
    expect(cfg.entryConvergenceZoom).toBe(DEFAULT_CAMERA_CONFIG.entryConvergenceZoom);
    expect(cfg.entryConvergencePx).toBe(DEFAULT_CAMERA_CONFIG.entryConvergencePx);
  });
});

describe('loadCameraConfig — v5→v7 migration: leadInDuration reset + spritePct→spritePx', () => {
  it('v5 config with old leadInDuration=1.0 is migrated: leadInDuration reset, spritePct→spritePx', () => {
    storageGet.mockReturnValue({
      schemaVersion: 5,
      cameraStateProfiles: {
        LEADER_ZOOM: {
          spritePct: 0.09,
          trackingTC: 0.25,
          entryTC: 0.8,
          leadInDuration: 1.0,
          leadOutDuration: 1.5,
          innerFramePct: 0.7,
          maxStateDuration: 8000,
          minStateHold: 5000,
        },
        BATTLE_ZOOM: {
          spritePct: 0.14,
          trackingTC: 0.25,
          entryTC: 0.8,
          leadInDuration: 0.5,
          leadOutDuration: 1.0,
          innerFramePct: 0.7,
          maxStateDuration: 8000,
          minStateHold: 5000,
        },
        COMEBACK_ZOOM: {
          spritePct: 0.07,
          trackingTC: 0.25,
          entryTC: 0.8,
          leadInDuration: 1.0,
          leadOutDuration: 1.5,
          innerFramePct: 0.7,
          maxStateDuration: 8000,
          minStateHold: 5000,
        },
        OVERVIEW: {
          spritePct: 0.05,
          trackingTC: 1.5,
          entryTC: 1.5,
          leadInDuration: 0,
          leadOutDuration: 0,
          innerFramePct: 0.7,
          maxStateDuration: 4000,
          minStateHold: 5000,
        },
      },
    });
    const cfg = loadCameraConfig();
    expect(cfg.schemaVersion).toBe(7);
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.leadInDuration).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM.leadInDuration
    );
    expect(cfg.cameraStateProfiles.BATTLE_ZOOM.leadInDuration).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.BATTLE_ZOOM.leadInDuration
    );
    expect(cfg.cameraStateProfiles.COMEBACK_ZOOM.leadInDuration).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.COMEBACK_ZOOM.leadInDuration
    );
    expect(cfg.cameraStateProfiles.OVERVIEW.leadInDuration).toBe(0);
    // spritePct→spritePx: 0.09×720=65, 0.14×720≈101, 0.07×720=50, 0.05×720=36
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spritePx).toBe(65);
    expect(cfg.cameraStateProfiles.BATTLE_ZOOM.spritePx).toBe(101);
    expect(cfg.cameraStateProfiles.COMEBACK_ZOOM.spritePx).toBe(50);
    expect(cfg.cameraStateProfiles.OVERVIEW.spritePx).toBe(36);
    expect('spritePct' in cfg.cameraStateProfiles.LEADER_ZOOM).toBe(false);
  });

  it('v5→v7 migration preserves non-leadInDuration, non-spritePct fields; converts spritePct→spritePx', () => {
    storageGet.mockReturnValue({
      schemaVersion: 5,
      cameraStateProfiles: {
        LEADER_ZOOM: { spritePct: 0.15, leadInDuration: 1.0 },
      },
    });
    const cfg = loadCameraConfig();
    // Math.round(0.15 × 720) = 108
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spritePx).toBe(108);
    expect('spritePct' in cfg.cameraStateProfiles.LEADER_ZOOM).toBe(false);
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.leadInDuration).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM.leadInDuration
    );
  });

  it('v6 stored config with user-tuned leadInDuration is preserved after v6→v7 migration', () => {
    storageGet.mockReturnValue({
      schemaVersion: 6,
      cameraStateProfiles: {
        LEADER_ZOOM: {
          spritePct: 0.09,
          trackingTC: 0.25,
          entryTC: 0.8,
          leadInDuration: 0.8,
          leadOutDuration: 1.5,
          innerFramePct: 0.7,
          maxStateDuration: 8000,
          minStateHold: 5000,
        },
      },
    });
    const cfg = loadCameraConfig();
    // user-tuned leadInDuration 0.8 survives; spritePct=0.09 → spritePx=65
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.leadInDuration).toBe(0.8);
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spritePx).toBe(65);
    expect(cfg.schemaVersion).toBe(7);
  });
});

describe('loadCameraConfig — v6→v7 migration: spritePct→spritePx', () => {
  it('v6 config with default spritePct values produces correct pixel values', () => {
    storageGet.mockReturnValue({
      schemaVersion: 6,
      cameraStateProfiles: {
        OVERVIEW: {
          spritePct: 0.05,
          trackingTC: 1.5,
          entryTC: 1.5,
          leadInDuration: 0,
          leadOutDuration: 0,
          innerFramePct: 0.7,
          maxStateDuration: 4000,
          minStateHold: 5000,
        },
        LEADER_ZOOM: {
          spritePct: 0.09,
          trackingTC: 0.25,
          entryTC: 0.8,
          leadInDuration: 0.3,
          leadOutDuration: 1.5,
          innerFramePct: 0.7,
          maxStateDuration: 8000,
          minStateHold: 5000,
        },
        BATTLE_ZOOM: {
          spritePct: 0.14,
          trackingTC: 0.25,
          entryTC: 0.8,
          leadInDuration: 0.2,
          leadOutDuration: 1.0,
          innerFramePct: 0.7,
          maxStateDuration: 8000,
          minStateHold: 5000,
        },
        COMEBACK_ZOOM: {
          spritePct: 0.07,
          trackingTC: 0.25,
          entryTC: 0.8,
          leadInDuration: 0.3,
          leadOutDuration: 1.5,
          innerFramePct: 0.7,
          maxStateDuration: 8000,
          minStateHold: 5000,
        },
      },
    });
    const cfg = loadCameraConfig();
    expect(cfg.schemaVersion).toBe(7);
    // Migration formula: Math.round(spritePct × 720)
    expect(cfg.cameraStateProfiles.OVERVIEW.spritePx).toBe(36); // 0.05×720=36
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spritePx).toBe(65); // 0.09×720=64.8→65
    expect(cfg.cameraStateProfiles.BATTLE_ZOOM.spritePx).toBe(101); // 0.14×720=100.8→101
    expect(cfg.cameraStateProfiles.COMEBACK_ZOOM.spritePx).toBe(50); // 0.07×720=50.4→50
    // spritePct key must not survive
    expect('spritePct' in cfg.cameraStateProfiles.OVERVIEW).toBe(false);
    expect('spritePct' in cfg.cameraStateProfiles.LEADER_ZOOM).toBe(false);
  });

  it('v6 config with custom spritePct=0.20 → spritePx=144', () => {
    storageGet.mockReturnValue({
      schemaVersion: 6,
      cameraStateProfiles: {
        LEADER_ZOOM: { spritePct: 0.2, leadInDuration: 0.3 },
      },
    });
    const cfg = loadCameraConfig();
    // Math.round(0.20 × 720) = 144
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spritePx).toBe(144);
    expect(cfg.schemaVersion).toBe(7);
  });

  it('v7 stored config with user-tuned spritePx is preserved (no further migration)', () => {
    storageGet.mockReturnValue({
      schemaVersion: 7,
      cameraStateProfiles: {
        LEADER_ZOOM: {
          spritePx: 80,
          trackingTC: 0.25,
          entryTC: 0.8,
          leadInDuration: 0.3,
          leadOutDuration: 1.5,
          innerFramePct: 0.7,
          maxStateDuration: 8000,
          minStateHold: 5000,
        },
      },
    });
    const cfg = loadCameraConfig();
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spritePx).toBe(80);
    expect(cfg.schemaVersion).toBe(7);
  });
});
