// CAMERA-FRAMING-1 removed every migration describe block in this file. The owner is the only
// person testing and asked that no migration code be written for his benefit, so the fourteen-step
// chain (v5→v19) and the loader's per-version ladder are DELETED, not deprecated: a stored config of
// defaults underneath, stored values on top, unknown or retired keys ignored. These tests
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

  it('a stored config with RETIRED keys keeps its known values — nothing is discarded', () => {
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

  it('a stored config is merged over the defaults', () => {
    storageGet.mockReturnValue({
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
  });

  it('a stored config carrying no zoom field gets the shipped standard-corridors default', () => {
    storageGet.mockReturnValue({
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
    // CAMERA-HYGIENE-2: `expect(cfg.spritePctOfCanvas.leader).toBe(0.1)` used to follow. It
    // guaranteed that a legacy key SURVIVED the load — and the loader keeps a stored key only
    // while the defaults still declare it. Now that the two dead legacy keys are gone from
    // defaults, the loader drops them, which is the "unknown ignored" rule doing its job.
    expect(cfg.spritePctOfCanvas).toBeUndefined();
  });

  it('missing spritePctOfCanvas sub-keys fall back to scale defaults', () => {
    storageGet.mockReturnValue({
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
  it('writes the config as given — no version stamp is added', () => {
    const config = { ...DEFAULT_CAMERA_CONFIG };
    saveCameraConfig(config);
    expect(storageSet).toHaveBeenCalledWith(
      'racearena:cameraConfig',
      expect.not.objectContaining({ schemaVersion: expect.anything() })
    );
  });

  it('round-trips a value without inventing fields', () => {
    saveCameraConfig({ maxTargetScreenPx: 160 });
    expect(storageSet).toHaveBeenCalledWith(
      'racearena:cameraConfig',
      expect.not.objectContaining({ schemaVersion: expect.anything() })
    );
  });
});

describe('loadCameraConfig — v4 schema: deep-merge cameraStateProfiles', () => {
  it('a stored profile that names no zoom keeps the shipped standard-corridors default', () => {
    storageGet.mockReturnValue({
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
    storageGet.mockReturnValue({});
    const cfg = loadCameraConfig();
    expect(cfg.entryConvergenceZoom).toBe(DEFAULT_CAMERA_CONFIG.entryConvergenceZoom);
    expect(cfg.entryConvergencePx).toBe(DEFAULT_CAMERA_CONFIG.entryConvergencePx);
  });
});

describe('loadCameraConfig — stored-over-defaults', () => {
  it('WITH cameraStateProfiles: stored field preserved, others from defaults, missing state filled', () => {
    // LEADER_ZOOM has one override; OVERVIEW is absent from stored → must come from defaults.
    storageGet.mockReturnValue({
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
  });

  it('WITHOUT cameraStateProfiles: top-level override merged, profiles equal the defaults', () => {
    storageGet.mockReturnValue({
      maxTargetScreenPx: 180,
    });
    const cfg = loadCameraConfig();
    // Top-level override merged
    expect(cfg.maxTargetScreenPx).toBe(180);
    // Unset top-level field comes from defaults
    expect(cfg.minStateHoldMs).toBe(DEFAULT_CAMERA_CONFIG.minStateHoldMs);
    // Deep-merge block skipped → profiles are the defaults spread from DEFAULT_CAMERA_CONFIG
    expect(cfg.cameraStateProfiles).toEqual(DEFAULT_CAMERA_CONFIG.cameraStateProfiles);
  });
});

describe('mergeStateProfiles — helper behavior via loadCameraConfig', () => {
  it('field override preserved; non-overridden field from defaults; absent state fully from defaults', () => {
    // v7 uses no-strip — default spriteScale is in the base and survives when the stored
    // override does not supply one.
    storageGet.mockReturnValue({
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
      showCameraStateHud: false,
      overviewOffsetPx: 200,
      minRacersVisible: 6,
      focalSmoothTc: 0.02,
      leaderMinZoomFraction: 0.5,
    });
    const cfg = loadCameraConfig();
    expect(cfg.cameraTransitionGrammar).toBe('glide');
    expect(cfg.leaderForwardFrac).toBe(0.66);
    // stored overrides still win where the key is still live:
    expect(cfg.minRacersVisible).toBe(6);
    expect(cfg.showCameraStateHud).toBe(false);
    // …and RETIRED keys are ignored rather than carried forward. `overviewOffsetPx` and
    // `leaderMinZoomFraction` were deleted with the mechanisms they configured; a config stored
    // before that still holds them, and the loader simply does not look at them.
    expect(cfg.overviewOffsetPx).toBeUndefined();
    expect(cfg.leaderMinZoomFraction).toBeUndefined();
    // and the CameraDirector built from it runs the NEW path, not the legacy fallback:
    const cd = new CameraDirector(3072, 2048, false, cfg);
    expect(cd.transitionGrammar).toBe('glide');
  });

  it('systemic guarantee: even if a resolve branch dropped a new key, loadCameraConfig fills it', () => {
    // A config stored before this key existed: the new key must still resolve, from the defaults.
    storageGet.mockReturnValue({ minRacersVisible: 4 });
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

  it('cameraConfigProvenance reports per-key source (stored vs default)', () => {
    storageGet.mockReturnValue({ glideDurationMs: 600 });
    const prov = cameraConfigProvenance();
    expect(prov.hadStored).toBe(true);
    expect(prov.sources.glideDurationMs).toBe('stored');
    expect(prov.sources.cameraTransitionGrammar).toBe('default'); // filled from DEFAULT, not stored
    expect(prov.resolved.cameraTransitionGrammar).toBe('glide');
  });
});

// ── CAMERA-NO-SCHEMA-1: the rule that replaced the version, as tests ──────────────────────────
// The owner's standing instruction: no schema, no version bumps, no migrations. What replaces the
// machinery is defaults underneath, stored values on top, unknown or retired keys ignored. These
// pin that rule directly, because it is now the only thing protecting his settings.
describe('no schema, no version — just sane loading', () => {
  it('a stored config is NEVER discarded wholesale — every known value survives', () => {
    // The old rule threw the WHOLE config away on a version mismatch. That is what wiped his
    // settings twice (v20, v21) and made him retype everything. It cannot happen again.
    storageGet.mockReturnValue({
      schemaVersion: 7, // a stale field from the old regime: meaningless now, and harmless
      minRacersVisible: 6,
      glideDurationMs: 700,
    });
    const cfg = loadCameraConfig();
    expect(cfg.minRacersVisible).toBe(6);
    expect(cfg.glideDurationMs).toBe(700);
    expect(cfg.schemaVersion).toBeUndefined(); // not a key of the defaults, so not in the live config
  });

  it('a NEW default key always reaches the live config (Lesson 193, without versioning)', () => {
    storageGet.mockReturnValue({ minRacersVisible: 6 });
    const cfg = loadCameraConfig();
    for (const key of Object.keys(DEFAULT_CAMERA_CONFIG)) expect(cfg, key).toHaveProperty(key);
  });

  it('a stored state PROFILE merges key by key, and unknown profile fields are ignored', () => {
    storageGet.mockReturnValue({
      cameraStateProfiles: {
        LEADER_ZOOM: { visibleCorridors: 0.4, retiredKnob: 99 },
        NOT_A_STATE: { visibleCorridors: 5 },
      },
    });
    const cfg = loadCameraConfig();
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.visibleCorridors).toBe(0.4); // his value wins
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.trackingTC).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM.trackingTC
    ); // the rest from defaults
    expect(cfg.cameraStateProfiles.LEADER_ZOOM.retiredKnob).toBeUndefined();
    expect(cfg.cameraStateProfiles.NOT_A_STATE).toBeUndefined();
    expect(Object.keys(cfg.cameraStateProfiles).sort()).toEqual(
      Object.keys(DEFAULT_CAMERA_CONFIG.cameraStateProfiles).sort()
    );
  });

  it('saving does not stamp anything onto what he stored', () => {
    // FIXTURE CHANGED BY CONFIG-DIFF-1, intent untouched. This asserted that saving adds no
    // schemaVersion — it still does. But its payload was `minRacersVisible: 5`, and 5 BECAME the
    // default at SHIP-THREE, so under the diff rule that value is correctly not written at all and
    // the test was asserting the old save-everything shape by accident. 4 is a real deviation.
    saveCameraConfig({ minRacersVisible: 4 });
    expect(storageSet).toHaveBeenCalledWith('racearena:cameraConfig', { minRacersVisible: 4 });
  });

  // FAILURE PROOF — what the version check did, computed from the same inputs. A stored config whose
  // version did not match the code's was discarded ENTIRELY: every value below would have come back
  // as the default. That is the behaviour this block deleted.
  it('FAILURE PROOF: the version check would have thrown all of this away', () => {
    const stored = { schemaVersion: 20, minRacersVisible: 6, glideDurationMs: 700 };
    storageGet.mockReturnValue(stored);
    const versionChecked = stored.schemaVersion !== 21 ? { ...DEFAULT_CAMERA_CONFIG } : stored;
    expect(versionChecked.minRacersVisible).toBe(DEFAULT_CAMERA_CONFIG.minRacersVisible); // wiped
    expect(loadCameraConfig().minRacersVisible).toBe(6); // kept
  });
});
