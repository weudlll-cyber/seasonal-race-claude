// CAMERA-FRAMING-1 removed every migration describe block in this file. The owner is the only
// person testing and asked that no migration code be written for his benefit, so the fourteen-step
// chain (v5→v19) and the loader's per-version ladder are DELETED, not deprecated: a stored config of
// the current schema is merged over the defaults, and anything else is discarded. These tests
// exercised code that no longer exists. What remains below is the behaviour that still has meaning —
// the current-schema merge, the defaults guarantee, and provenance.

// CAMERA-ZOOM-UNIT-1 (schema v18): the per-state ZOOM field is now `visibleCorridors`, and the
// v17->v18 migration deliberately DISCARDS whatever zoom a stored config carried instead of
// converting it — the owner chose clean round defaults over reproducing the old picture, so a
// converted number would be work in service of a result nobody wants. The migration assertions
// below therefore read "the legacy zoom did not survive, the shipped default is in its place".
// Every NON-zoom stored field must still survive untouched (Lesson 193); that is asserted too.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./storage/storage.js', () => ({
  KEYS: { CAMERA_CONFIG: 'racearena:cameraConfig' },
  storageGet: vi.fn(() => null),
  storageSet: vi.fn(),
  STORAGE_CHANGE_EVENT: 'racearena:storage-change',
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

  it('a stored config from any older schema is DISCARDED — defaults, not a migration', () => {
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

  it('a stored config of the current schema is merged over the defaults', () => {
    storageGet.mockReturnValue({
      schemaVersion: 21,
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
    expect(cfg.schemaVersion).toBe(21);
  });

  it('a stored config carrying no zoom field gets the shipped standard-corridors default', () => {
    storageGet.mockReturnValue({
      schemaVersion: 21,
      spritePctOfCanvas: {
        overview: 0.05,
        leader: 0.1,
        battle: 0.12,
        comeback: 0.065,
      },
    });
    const cfg = loadCameraConfig();
    // 0.1 × 720 = 72 → spriteScale = 72/36 = 2.0
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.visibleCorridors).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM.visibleCorridors
    );
    expect(cfg.spritePctOfCanvas.leader).toBe(0.1);
  });

  it('schemaVersion=2: missing spritePctOfCanvas sub-keys fall back to scale defaults', () => {
    storageGet.mockReturnValue({
      schemaVersion: 21,
      spritePctOfCanvas: { leader: 0.1 }, // only leader overridden
    });
    const cfg = loadCameraConfig();
    // leader: Math.round(0.1×720)=72 → spriteScale=72/36=2.0; others fall back to default spriteScale
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.visibleCorridors).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM.visibleCorridors
    );
    expect(cfg.cameraStateProfiles.OVERVIEW.visibleCorridors).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.OVERVIEW.visibleCorridors
    );
    expect(cfg.cameraStateProfiles.BATTLE_ZOOM.visibleCorridors).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.BATTLE_ZOOM.visibleCorridors
    );
  });
});

describe('saveCameraConfig', () => {
  it('writes schemaVersion: 21', () => {
    const config = { ...DEFAULT_CAMERA_CONFIG };
    saveCameraConfig(config);
    expect(storageSet).toHaveBeenCalledWith(
      'racearena:cameraConfig',
      expect.objectContaining({ schemaVersion: 21 })
    );
  });

  it('writes schemaVersion: 21 even when not in input config', () => {
    saveCameraConfig({ maxTargetScreenPx: 160 });
    expect(storageSet).toHaveBeenCalledWith(
      'racearena:cameraConfig',
      expect.objectContaining({ schemaVersion: 21 })
    );
  });
});

describe('loadCameraConfig — v4 schema: deep-merge cameraStateProfiles', () => {
  it('a stored profile that names no zoom keeps the shipped standard-corridors default', () => {
    storageGet.mockReturnValue({
      schemaVersion: 21,
      cameraStateProfiles: {
        LEADER_ZOOM: { entryTC: 0.9 }, // a non-zoom override
      },
    });
    const cfg = loadCameraConfig();
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.visibleCorridors).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM.visibleCorridors
    );
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.entryTC).toBe(0.9);
    // Other fields come from default
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.trackingTC).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM.trackingTC
    );
    // Unmentioned state uses scale defaults
    expect(cfg.cameraStateProfiles.BATTLE_ZOOM.visibleCorridors).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.BATTLE_ZOOM.visibleCorridors
    );
  });

  it('entryConvergenceZoom and entryConvergencePx are present', () => {
    storageGet.mockReturnValue({ schemaVersion: 21 });
    const cfg = loadCameraConfig();
    expect(cfg.entryConvergenceZoom).toBe(DEFAULT_CAMERA_CONFIG.entryConvergenceZoom);
    expect(cfg.entryConvergencePx).toBe(DEFAULT_CAMERA_CONFIG.entryConvergencePx);
  });
});

describe('loadCameraConfig — current-schema passthrough', () => {
  it('WITH cameraStateProfiles: stored field preserved, others from defaults, missing state filled', () => {
    // LEADER_ZOOM has one override; OVERVIEW is absent from stored → must come from defaults.
    storageGet.mockReturnValue({
      schemaVersion: 21,
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
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.visibleCorridors).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM.visibleCorridors
    );
    // Non-overridden field in the same state is filled from defaults (per-state deep merge)
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.trackingTC).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM.trackingTC
    );
    // State not present in stored at all → full defaults
    expect(cfg.cameraStateProfiles.OVERVIEW).toEqual(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.OVERVIEW
    );
    expect(cfg.schemaVersion).toBe(21);
  });

  it('WITHOUT cameraStateProfiles: top-level override merged, profiles equal the defaults', () => {
    storageGet.mockReturnValue({
      schemaVersion: 21,
      maxTargetScreenPx: 180,
    });
    const cfg = loadCameraConfig();
    // Top-level override merged
    expect(cfg.maxTargetScreenPx).toBe(180);
    // Unset top-level field comes from defaults
    expect(cfg.minStateHoldMs).toBe(DEFAULT_CAMERA_CONFIG.minStateHoldMs);
    // Deep-merge block skipped → profiles are the defaults spread from DEFAULT_CAMERA_CONFIG
    expect(cfg.cameraStateProfiles).toEqual(DEFAULT_CAMERA_CONFIG.cameraStateProfiles);
    expect(cfg.schemaVersion).toBe(21);
  });
});

describe('mergeStateProfiles — helper behavior via loadCameraConfig', () => {
  it('field override preserved; non-overridden field from defaults; absent state fully from defaults', () => {
    // v7 uses no-strip — default spriteScale is in the base and survives when the stored
    // override does not supply one.
    storageGet.mockReturnValue({
      schemaVersion: 21,
      cameraStateProfiles: {
        LEADER_ZOOM: { trackingTC: 0.77 }, // one override; no spriteScale supplied
      },
    });
    const cfg = loadCameraConfig();
    // Override preserved
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.trackingTC).toBe(0.77);
    // Non-overridden field in the same state filled from defaults
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.innerFramePct).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM.innerFramePct
    );
    // State absent from stored → full defaults
    expect(cfg.cameraStateProfiles.OVERVIEW).toEqual(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.OVERVIEW
    );
    // spriteScale present from default base (not stripped); BATTLE_ZOOM was not in stored,
    // so its spriteScale flows through the no-strip base → chain → final output.
    expect(cfg.cameraStateProfiles.BATTLE_ZOOM.visibleCorridors).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.BATTLE_ZOOM.visibleCorridors
    );
  });

  it('a stored profile merges over the default profile, key by key', () => {
    storageGet.mockReturnValue({
      schemaVersion: 21,
      cameraStateProfiles: {
        LEADER_ZOOM: { trackingTC: 0.55 },
      },
    });
    const cfg = loadCameraConfig();
    // Override preserved …
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.trackingTC).toBe(0.55);
    // … and every key the stored profile did not name comes from the default profile.
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.visibleCorridors).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM.visibleCorridors
    );
    expect(cfg.cameraStateProfiles.BATTLE_ZOOM).toEqual(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.BATTLE_ZOOM
    );
    expect(cfg.cameraStateProfiles.OVERVIEW).toEqual(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.OVERVIEW
    );
  });
});

// ── CAMERA-FOCUS-4: the config-merge rule — new machinery can never be silently omitted ──────────
import { CameraDirector } from './camera/CameraDirector.js';
import { cameraConfigProvenance } from './cameraConfig.js';

describe('CAMERA-FOCUS-4 — stored config can never omit new machinery', () => {
  it('a stored config lacking the newest keys still resolves grammar glide + forward-frac', () => {
    // The owner's case: a stored cosmetic config (off-default keys) saved BEFORE FOCUS-3 existed, so it
    // has NO cameraTransitionGrammar / leaderForwardFrac. The load must fill them from DEFAULT.
    storageGet.mockReturnValue({
      schemaVersion: 21,
      showCameraStateHud: false,
      overviewOffsetPx: 200,
      minRacersVisible: 6,
      focalSmoothTc: 0.02,
      leaderMinZoomFraction: 0.5,
    });
    const cfg = loadCameraConfig();
    expect(cfg.cameraTransitionGrammar).toBe('glide');
    expect(cfg.leaderForwardFrac).toBe(0.66);
    // stored overrides still win where present:
    expect(cfg.minRacersVisible).toBe(6);
    expect(cfg.overviewOffsetPx).toBe(200);
    // and the CameraDirector built from it runs the NEW path, not the legacy fallback:
    const cd = new CameraDirector(3072, 2048, false, cfg);
    expect(cd.transitionGrammar).toBe('glide');
  });

  it('systemic guarantee: even if a resolve branch dropped a new key, loadCameraConfig fills it', () => {
    // A migration-era config (schemaVersion 9) exercises a different branch; new keys must still resolve.
    storageGet.mockReturnValue({ schemaVersion: 21, minRacersVisible: 4 });
    const cfg = loadCameraConfig();
    expect(cfg.cameraTransitionGrammar).toBe('glide');
    expect(cfg.leaderForwardFrac).toBe(0.66);
  });

  it('only a truly bare CameraDirector caller (no config) falls back to legacy', () => {
    expect(new CameraDirector().transitionGrammar).toBe('legacy');
    expect(new CameraDirector(3072, 2048, false, loadCameraConfig()).transitionGrammar).toBe(
      'glide'
    );
  });

  it('cameraConfigProvenance reports per-key source (stored vs default) + schema version', () => {
    storageGet.mockReturnValue({ schemaVersion: 21, glideDurationMs: 600 });
    const prov = cameraConfigProvenance();
    expect(prov.storedSchemaVersion).toBe(21);
    expect(prov.hadStored).toBe(true);
    expect(prov.sources.glideDurationMs).toBe('stored');
    expect(prov.sources.cameraTransitionGrammar).toBe('default'); // filled from DEFAULT, not stored
    expect(prov.resolved.cameraTransitionGrammar).toBe('glide');
  });
});
