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

  it('schemaVersion=2 stored config is migrated to v14 and merged with defaults', () => {
    storageGet.mockReturnValue({
      schemaVersion: 2,
      maxTargetScreenPx: 200,
      spritePctOfCanvas: {
        overview: 0.05,
        leader: 0.08,
        battle: 0.12,
        comeback: 0.065,
      },
      maxStateDuration: 4000,
      endgameThreshold: 0.85,
      tagVisibleMaxCount: 10,
      showCameraStateHud: true,
    });
    const cfg = loadCameraConfig();
    expect(cfg.maxTargetScreenPx).toBe(200);
    expect(cfg.schemaVersion).toBe(15);
  });

  it('schemaVersion=2: respects stored spritePctOfCanvas.leader → migrated to spriteScale', () => {
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
    // 0.1 × 720 = 72 → spriteScale = 72/36 = 2.0
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spriteScale).toBe(72 / 36);
    expect(cfg.spritePctOfCanvas.leader).toBe(0.1);
  });

  it('schemaVersion=2: missing spritePctOfCanvas sub-keys fall back to scale defaults', () => {
    storageGet.mockReturnValue({
      schemaVersion: 2,
      spritePctOfCanvas: { leader: 0.1 }, // only leader overridden
    });
    const cfg = loadCameraConfig();
    // leader: Math.round(0.1×720)=72 → spriteScale=72/36=2.0; others fall back to default spriteScale
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spriteScale).toBe(72 / 36);
    expect(cfg.cameraStateProfiles.OVERVIEW.spriteScale).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.OVERVIEW.spriteScale
    );
    expect(cfg.cameraStateProfiles.BATTLE_ZOOM.spriteScale).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.BATTLE_ZOOM.spriteScale
    );
  });
});

describe('saveCameraConfig', () => {
  it('writes schemaVersion: 15', () => {
    const config = { ...DEFAULT_CAMERA_CONFIG };
    saveCameraConfig(config);
    expect(storageSet).toHaveBeenCalledWith(
      'racearena:cameraConfig',
      expect.objectContaining({ schemaVersion: 15 })
    );
  });

  it('writes schemaVersion: 15 even when not in input config', () => {
    saveCameraConfig({ maxTargetScreenPx: 160 });
    expect(storageSet).toHaveBeenCalledWith(
      'racearena:cameraConfig',
      expect.objectContaining({ schemaVersion: 15 })
    );
  });
});

describe('loadCameraConfig — v11→v12 migration', () => {
  it('v11 config gains countdownStartZoomSpritePx and countdownDurationMs at defaults', () => {
    storageGet.mockReturnValue({
      schemaVersion: 11,
      cameraStateProfiles: DEFAULT_CAMERA_CONFIG.cameraStateProfiles,
      postStartHoldMs: 7000,
    });
    const cfg = loadCameraConfig();
    // v11 chains through v12, v13, v14, and v15
    expect(cfg.schemaVersion).toBe(15);
    expect(cfg.countdownStartZoomSpritePx).toBe(DEFAULT_CAMERA_CONFIG.countdownStartZoomSpritePx);
    expect(cfg.countdownDurationMs).toBe(DEFAULT_CAMERA_CONFIG.countdownDurationMs);
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
    expect(cfg.schemaVersion).toBe(15);
  });

  it('v2 config without battleMaxDuration migrates to v14 and gets default battleMaxDurationMs', () => {
    storageGet.mockReturnValue({
      schemaVersion: 2,
      maxTargetScreenPx: 200,
    });
    const cfg = loadCameraConfig();
    expect(cfg.schemaVersion).toBe(15);
    expect(cfg.maxTargetScreenPx).toBe(200);
    expect('battleMaxDuration' in cfg).toBe(false);
    expect(cfg.battleMaxDurationMs).toBe(DEFAULT_CAMERA_CONFIG.battleMaxDurationMs);
  });

  it('schemaVersion=3 config with battleMaxDurationMs is migrated to v14', () => {
    storageGet.mockReturnValue({
      schemaVersion: 3,
      battleMaxDurationMs: 8000,
    });
    const cfg = loadCameraConfig();
    expect(cfg.battleMaxDurationMs).toBe(8000);
    expect('battleMaxDuration' in cfg).toBe(false);
    expect(cfg.schemaVersion).toBe(15);
  });
});

describe('loadCameraConfig — v3→v4 migration: cameraStateProfiles built from legacy fields', () => {
  it('LEADER_ZOOM.spriteScale is derived from stored spritePctOfCanvas.leader (0.11→79px→79/36)', () => {
    storageGet.mockReturnValue({
      schemaVersion: 3,
      spritePctOfCanvas: { overview: 0.05, leader: 0.11, battle: 0.12, comeback: 0.065 },
      cameraTransitionSeconds: { overview: 1.5, leader: 0.3, battle: 0.3, comeback: 0.3 },
    });
    const cfg = loadCameraConfig();
    // Math.round(0.11 × 720) = Math.round(79.2) = 79 → spriteScale = 79/36
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spriteScale).toBe(79 / 36);
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

  it('missing legacy fields fall back to DEFAULT_CAMERA_CONFIG profile scale values', () => {
    storageGet.mockReturnValue({ schemaVersion: 3 });
    const cfg = loadCameraConfig();
    const defProf = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spriteScale).toBe(defProf.LEADER_ZOOM.spriteScale);
    expect(cfg.cameraStateProfiles.OVERVIEW.trackingTC).toBe(defProf.OVERVIEW.trackingTC);
  });
});

describe('loadCameraConfig — v4 schema: deep-merge cameraStateProfiles', () => {
  it('stored v4 cameraStateProfiles are merged and spritePct→spritePx→spriteScale converted', () => {
    storageGet.mockReturnValue({
      schemaVersion: 4,
      cameraStateProfiles: {
        LEADER_ZOOM: { spritePct: 0.15 }, // only spritePct overridden (v4 format)
      },
    });
    const cfg = loadCameraConfig();
    // migrateV6toV7 converts 0.15 × 720 = 108 → migrateV13toV14: 108/36 = 3.0
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spriteScale).toBe(3.0);
    expect('spritePct' in cfg.cameraStateProfiles.LEADER_ZOOM).toBe(false);
    // Other fields come from default
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.trackingTC).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM.trackingTC
    );
    // Unmentioned state uses scale defaults
    expect(cfg.cameraStateProfiles.BATTLE_ZOOM.spriteScale).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.BATTLE_ZOOM.spriteScale
    );
  });

  it('entryConvergenceZoom and entryConvergencePx are present', () => {
    storageGet.mockReturnValue({ schemaVersion: 4 });
    const cfg = loadCameraConfig();
    expect(cfg.entryConvergenceZoom).toBe(DEFAULT_CAMERA_CONFIG.entryConvergenceZoom);
    expect(cfg.entryConvergencePx).toBe(DEFAULT_CAMERA_CONFIG.entryConvergencePx);
  });
});

describe('loadCameraConfig — v5→v7 migration: leadInDuration reset + spritePct→spriteScale', () => {
  it('v5 config with old leadInDuration=1.0 is migrated: leadInDuration reset, spritePct→spriteScale', () => {
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
    expect(cfg.schemaVersion).toBe(15);
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
    // spritePct→spritePx→spriteScale: 0.09×720=65→65/36, 0.14×720≈101→101/36, 0.07×720=50→50/36, 0.05×720=36→1.0
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spriteScale).toBe(65 / 36);
    expect(cfg.cameraStateProfiles.BATTLE_ZOOM.spriteScale).toBe(101 / 36);
    expect(cfg.cameraStateProfiles.COMEBACK_ZOOM.spriteScale).toBe(50 / 36);
    expect(cfg.cameraStateProfiles.OVERVIEW.spriteScale).toBe(1.0);
    expect('spritePct' in cfg.cameraStateProfiles.LEADER_ZOOM).toBe(false);
  });

  it('v5→v7 migration preserves non-leadInDuration, non-spritePct fields; converts spritePct→spriteScale', () => {
    storageGet.mockReturnValue({
      schemaVersion: 5,
      cameraStateProfiles: {
        LEADER_ZOOM: { spritePct: 0.15, leadInDuration: 1.0 },
      },
    });
    const cfg = loadCameraConfig();
    // Math.round(0.15 × 720) = 108 → spriteScale = 108/36 = 3.0
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spriteScale).toBe(3.0);
    expect('spritePct' in cfg.cameraStateProfiles.LEADER_ZOOM).toBe(false);
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.leadInDuration).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM.leadInDuration
    );
  });

  it('v6 stored config with user-tuned leadInDuration is preserved after v6→v14 migration', () => {
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
    // user-tuned leadInDuration 0.8 survives; spritePct=0.09 → spriteScale=65/36
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.leadInDuration).toBe(0.8);
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spriteScale).toBe(65 / 36);
    expect(cfg.schemaVersion).toBe(15);
  });
});

describe('loadCameraConfig — v6→v7 migration: spritePct→spriteScale', () => {
  it('v6 config with default spritePct values produces correct scale values', () => {
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
    expect(cfg.schemaVersion).toBe(15);
    // Migration formula: Math.round(spritePct × 720) → /36 for spriteScale
    expect(cfg.cameraStateProfiles.OVERVIEW.spriteScale).toBe(1.0); // 0.05×720=36→36/36=1.0
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spriteScale).toBe(65 / 36); // 0.09×720=64.8→65
    expect(cfg.cameraStateProfiles.BATTLE_ZOOM.spriteScale).toBe(101 / 36); // 0.14×720=100.8→101
    expect(cfg.cameraStateProfiles.COMEBACK_ZOOM.spriteScale).toBe(50 / 36); // 0.07×720=50.4→50
    // spritePct key must not survive
    expect('spritePct' in cfg.cameraStateProfiles.OVERVIEW).toBe(false);
    expect('spritePct' in cfg.cameraStateProfiles.LEADER_ZOOM).toBe(false);
  });

  it('v6 config with custom spritePct=0.20 → spriteScale=4.0', () => {
    storageGet.mockReturnValue({
      schemaVersion: 6,
      cameraStateProfiles: {
        LEADER_ZOOM: { spritePct: 0.2, leadInDuration: 0.3 },
      },
    });
    const cfg = loadCameraConfig();
    // Math.round(0.20 × 720) = 144 → spriteScale = 144/36 = 4.0
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spriteScale).toBe(4.0);
    expect(cfg.schemaVersion).toBe(15);
  });

  it('v7 stored config is migrated to v14, user-tuned spritePx converted to spriteScale', () => {
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
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spriteScale).toBe(80 / 36);
    expect(cfg.schemaVersion).toBe(15);
  });

  it('v9 stored config is migrated to v14, leadAheadEnabled and leadOutEnabled injected into LEADER/BATTLE/COMEBACK', () => {
    storageGet.mockReturnValue({
      schemaVersion: 9,
      cameraStateProfiles: {
        OVERVIEW: { ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.OVERVIEW },
        LEADER_ZOOM: {
          spritePx: 80,
          trackingTC: 0.25,
          entryTC: 0.8,
          leadInDuration: 0.3,
          leadOutDuration: 1.5,
          innerFramePct: 0.7,
          maxStateDuration: 8000,
          minStateHold: 5000,
          maxEntryDurationMs: 5000,
          // no leadAheadEnabled or leadOutEnabled — both should be injected as false
        },
        BATTLE_ZOOM: { ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.BATTLE_ZOOM },
        COMEBACK_ZOOM: { ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.COMEBACK_ZOOM },
      },
    });
    const cfg = loadCameraConfig();
    expect(cfg.schemaVersion).toBe(15);
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.leadAheadEnabled).toBe(false);
    expect(cfg.cameraStateProfiles.BATTLE_ZOOM.leadAheadEnabled).toBe(false);
    expect(cfg.cameraStateProfiles.COMEBACK_ZOOM.leadAheadEnabled).toBe(false);
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.leadOutEnabled).toBe(false);
    expect(cfg.cameraStateProfiles.BATTLE_ZOOM.leadOutEnabled).toBe(false);
    expect(cfg.cameraStateProfiles.COMEBACK_ZOOM.leadOutEnabled).toBe(false);
    // User-tuned spritePx converted to spriteScale
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spriteScale).toBe(80 / 36);
  });

  it('v8 stored config is migrated to v14, overviewOffsetPx injected into OVERVIEW profile', () => {
    storageGet.mockReturnValue({
      schemaVersion: 8,
      cameraStateProfiles: {
        OVERVIEW: {
          spritePx: 36,
          trackingTC: 1.5,
          entryTC: 1.5,
          leadInDuration: 0,
          leadOutDuration: 0,
          innerFramePct: 0.7,
          maxStateDuration: 4000,
          minStateHold: 5000,
          maxEntryDurationMs: 10000,
          // no overviewOffsetPx — should be injected by migration
        },
        LEADER_ZOOM: { ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM },
        BATTLE_ZOOM: { ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.BATTLE_ZOOM },
        COMEBACK_ZOOM: { ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.COMEBACK_ZOOM },
      },
    });
    const cfg = loadCameraConfig();
    expect(cfg.schemaVersion).toBe(15);
    expect(cfg.cameraStateProfiles.OVERVIEW.overviewOffsetPx).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.OVERVIEW.overviewOffsetPx
    );
  });
});

// ── v10 → v11 migration: leadOutEnabled ──────────────────────────────────────

describe('loadCameraConfig — v10→v11 migration: leadOutEnabled', () => {
  it('v10 config without leadOutEnabled gets it injected as false for LEADER/BATTLE/COMEBACK', () => {
    storageGet.mockReturnValue({
      schemaVersion: 10,
      cameraStateProfiles: {
        OVERVIEW: { ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.OVERVIEW },
        LEADER_ZOOM: {
          spritePx: 75,
          trackingTC: 0.25,
          entryTC: 0.8,
          leadInDuration: 0.3,
          leadOutDuration: 1.5,
          innerFramePct: 0.7,
          maxStateDuration: 8000,
          minStateHold: 5000,
          maxEntryDurationMs: 5000,
          leadAheadEnabled: true, // user had turned it on
          // no leadOutEnabled — should be injected as false
        },
        BATTLE_ZOOM: {
          ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.BATTLE_ZOOM,
          leadAheadEnabled: false,
        },
        COMEBACK_ZOOM: {
          ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.COMEBACK_ZOOM,
          leadAheadEnabled: false,
        },
      },
    });
    const cfg = loadCameraConfig();
    expect(cfg.schemaVersion).toBe(15);
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.leadOutEnabled).toBe(false);
    expect(cfg.cameraStateProfiles.BATTLE_ZOOM.leadOutEnabled).toBe(false);
    expect(cfg.cameraStateProfiles.COMEBACK_ZOOM.leadOutEnabled).toBe(false);
    // Existing user-tuned values preserved; spritePx converted to spriteScale
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.leadAheadEnabled).toBe(true);
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spriteScale).toBe(75 / 36);
    // OVERVIEW is not touched
    expect('leadOutEnabled' in cfg.cameraStateProfiles.OVERVIEW).toBe(false);
  });

  it('v10 config with leadOutEnabled: true already set keeps it as true', () => {
    storageGet.mockReturnValue({
      schemaVersion: 10,
      cameraStateProfiles: {
        OVERVIEW: { ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.OVERVIEW },
        LEADER_ZOOM: {
          ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM,
          leadOutEnabled: true, // user explicitly enabled it
        },
        BATTLE_ZOOM: { ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.BATTLE_ZOOM },
        COMEBACK_ZOOM: { ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.COMEBACK_ZOOM },
      },
    });
    const cfg = loadCameraConfig();
    expect(cfg.schemaVersion).toBe(15);
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.leadOutEnabled).toBe(true);
  });

  it('v11 config is migrated to v14 with merged profiles', () => {
    storageGet.mockReturnValue({
      schemaVersion: 11,
      cameraStateProfiles: {
        OVERVIEW: { ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.OVERVIEW },
        LEADER_ZOOM: {
          ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM,
          leadOutEnabled: true,
          spritePx: 90,
        },
        BATTLE_ZOOM: { ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.BATTLE_ZOOM },
        COMEBACK_ZOOM: { ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.COMEBACK_ZOOM },
      },
    });
    const cfg = loadCameraConfig();
    expect(cfg.schemaVersion).toBe(15);
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.leadOutEnabled).toBe(true);
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spriteScale).toBe(90 / 36);
  });
});

describe('loadCameraConfig — v12→v13 migration', () => {
  it('v12 config gains stateOverlayEnabled and stateOverlayDurationMs at defaults', () => {
    storageGet.mockReturnValue({
      schemaVersion: 12,
      cameraStateProfiles: DEFAULT_CAMERA_CONFIG.cameraStateProfiles,
      postStartHoldMs: 7000,
    });
    const cfg = loadCameraConfig();
    expect(cfg.schemaVersion).toBe(15);
    expect(cfg.stateOverlayEnabled).toBe(DEFAULT_CAMERA_CONFIG.stateOverlayEnabled);
    expect(cfg.stateOverlayDurationMs).toBe(DEFAULT_CAMERA_CONFIG.stateOverlayDurationMs);
  });

  it('v12 config preserves an explicitly stored stateOverlayEnabled: false', () => {
    storageGet.mockReturnValue({
      schemaVersion: 12,
      stateOverlayEnabled: false,
      cameraStateProfiles: DEFAULT_CAMERA_CONFIG.cameraStateProfiles,
    });
    const cfg = loadCameraConfig();
    expect(cfg.schemaVersion).toBe(15);
    expect(cfg.stateOverlayEnabled).toBe(false);
  });

  it('v12 config preserves an explicitly stored stateOverlayDurationMs', () => {
    storageGet.mockReturnValue({
      schemaVersion: 12,
      stateOverlayDurationMs: 5000,
      cameraStateProfiles: DEFAULT_CAMERA_CONFIG.cameraStateProfiles,
    });
    const cfg = loadCameraConfig();
    expect(cfg.stateOverlayDurationMs).toBe(5000);
  });

  it('fresh DEFAULT_CAMERA_CONFIG has schemaVersion 15 and stateOverlay fields', () => {
    // Verify the defaults themselves are correct for a brand-new installation.
    storageGet.mockReturnValue(null);
    const cfg = loadCameraConfig();
    expect(cfg.schemaVersion).toBe(15);
    expect(cfg.stateOverlayEnabled).toBe(true);
    expect(cfg.stateOverlayDurationMs).toBe(3500);
  });
});

describe('loadCameraConfig — v13→v14 migration: spritePx → spriteScale', () => {
  it('v13 config with spritePx converts to spriteScale (÷36) for all profiles', () => {
    storageGet.mockReturnValue({
      schemaVersion: 13,
      cameraStateProfiles: {
        OVERVIEW: { ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.OVERVIEW, spritePx: 36 },
        LEADER_ZOOM: { ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM, spritePx: 65 },
        BATTLE_ZOOM: { ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.BATTLE_ZOOM, spritePx: 101 },
        COMEBACK_ZOOM: { ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.COMEBACK_ZOOM, spritePx: 50 },
        LEAD_CHANGE: { ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEAD_CHANGE, spritePx: 65 },
      },
    });
    const cfg = loadCameraConfig();
    expect(cfg.schemaVersion).toBe(15);
    expect(cfg.cameraStateProfiles.OVERVIEW.spriteScale).toBe(1.0);
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spriteScale).toBe(65 / 36);
    expect(cfg.cameraStateProfiles.BATTLE_ZOOM.spriteScale).toBe(101 / 36);
    expect(cfg.cameraStateProfiles.COMEBACK_ZOOM.spriteScale).toBe(50 / 36);
    expect(cfg.cameraStateProfiles.LEAD_CHANGE.spriteScale).toBe(65 / 36);
    expect('spritePx' in cfg.cameraStateProfiles.LEADER_ZOOM).toBe(false);
  });

  it('v13 config with custom spritePx=108 → spriteScale=3.0', () => {
    storageGet.mockReturnValue({
      schemaVersion: 13,
      cameraStateProfiles: {
        LEADER_ZOOM: { ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM, spritePx: 108 },
      },
    });
    const cfg = loadCameraConfig();
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spriteScale).toBe(3.0);
    expect(cfg.schemaVersion).toBe(15);
  });

  it('v13 config with spriteScale already set is not overwritten', () => {
    storageGet.mockReturnValue({
      schemaVersion: 13,
      cameraStateProfiles: {
        LEADER_ZOOM: {
          ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM,
          spriteScale: 2.5,
        },
      },
    });
    const cfg = loadCameraConfig();
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spriteScale).toBe(2.5);
  });

  it('v14 stored config migrates to v15, user-tuned spriteScale is preserved unchanged', () => {
    storageGet.mockReturnValue({
      schemaVersion: 14,
      cameraStateProfiles: {
        ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles,
        LEADER_ZOOM: { ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM, spriteScale: 2.0 },
      },
    });
    const cfg = loadCameraConfig();
    expect(cfg.schemaVersion).toBe(15);
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spriteScale).toBe(2.0);
  });
});

describe('loadCameraConfig — v15 passthrough', () => {
  it('v15 WITH cameraStateProfiles: stored field preserved, non-stored field from defaults, missing state filled from defaults', () => {
    // LEADER_ZOOM has one override; OVERVIEW is absent from stored → must come from defaults.
    storageGet.mockReturnValue({
      schemaVersion: 15,
      maxTargetScreenPx: 250,
      cameraStateProfiles: {
        LEADER_ZOOM: { spriteScale: 3.0 },
      },
    });
    const cfg = loadCameraConfig();
    // Top-level override preserved
    expect(cfg.maxTargetScreenPx).toBe(250);
    // Unset top-level field comes from defaults
    expect(cfg.minStateHoldMs).toBe(DEFAULT_CAMERA_CONFIG.minStateHoldMs);
    // Stored field inside the state is preserved
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.spriteScale).toBe(3.0);
    // Non-overridden field in the same state is filled from defaults (per-state deep merge)
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.trackingTC).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM.trackingTC
    );
    // State not present in stored at all → full defaults
    expect(cfg.cameraStateProfiles.OVERVIEW).toEqual(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.OVERVIEW
    );
    expect(cfg.schemaVersion).toBe(15);
  });

  it('v15 WITHOUT cameraStateProfiles: top-level override merged, cameraStateProfiles equals defaults', () => {
    storageGet.mockReturnValue({
      schemaVersion: 15,
      maxTargetScreenPx: 180,
    });
    const cfg = loadCameraConfig();
    // Top-level override merged
    expect(cfg.maxTargetScreenPx).toBe(180);
    // Unset top-level field comes from defaults
    expect(cfg.minStateHoldMs).toBe(DEFAULT_CAMERA_CONFIG.minStateHoldMs);
    // Deep-merge block skipped → profiles are the defaults spread from DEFAULT_CAMERA_CONFIG
    expect(cfg.cameraStateProfiles).toEqual(DEFAULT_CAMERA_CONFIG.cameraStateProfiles);
    expect(cfg.schemaVersion).toBe(15);
  });
});

describe('loadCameraConfig — normalizeCameraTransitionSeconds scalar branch', () => {
  it('v3 config with scalar cameraTransitionSeconds is converted to object form', () => {
    // Legacy configs stored cameraTransitionSeconds as a plain number; the migration
    // converts it to { overview: scalar, leader/battle/comeback: from defaults }.
    storageGet.mockReturnValue({
      schemaVersion: 3,
      cameraTransitionSeconds: 2.5,
    });
    const cfg = loadCameraConfig();
    expect(cfg.schemaVersion).toBe(15);
    // The scalar becomes the overview TC; other keys come from DEFAULT_CAMERA_CONFIG.
    expect(cfg.cameraTransitionSeconds.overview).toBe(2.5);
    expect(cfg.cameraTransitionSeconds.leader).toBe(
      DEFAULT_CAMERA_CONFIG.cameraTransitionSeconds.leader
    );
    expect(cfg.cameraTransitionSeconds.battle).toBe(
      DEFAULT_CAMERA_CONFIG.cameraTransitionSeconds.battle
    );
    expect(cfg.cameraTransitionSeconds.comeback).toBe(
      DEFAULT_CAMERA_CONFIG.cameraTransitionSeconds.comeback
    );
  });
});
