// ============================================================
// File:        cameraConfig.js
// Path:        client/src/modules/cameraConfig.js
// Project:     RaceArena
// Created:     2026-05-04
// Description: Storage CRUD for camera tuning config.
//
//              NO MIGRATIONS. The owner is the only person testing and asked, explicitly, that no
//              migration code be written for his benefit (CAMERA-FRAMING-1). So the rule here is the
//              simplest one that can be true: a stored config of the CURRENT schema version is
//              merged over the defaults; anything else is discarded and the defaults are used. His
//              camera settings reset once per schema bump, deliberately and visibly.
//
//              What this replaced: a fourteen-step migration chain (v5→v19) plus a per-version ladder
//              in the loader — ~400 lines of module and ~700 of test, maintained for a population of
//              one who did not want it. Deleted in CAMERA-FRAMING-1, not deprecated.
//
//              Schema v20 (CAMERA-FRAMING-1): PHOTO_FINISH gains its own profile; the dynamic
//              zoom-out floor (minRacersVisible / leaderMinZoom / leaderMinZoomFraction /
//              zoomOutStepPerFrame) and OVERVIEW-FRAMING-1's headcount fit (overviewFrameRacers /
//              overviewMinSpriteFrac) are gone with the mechanisms they configured.
// ============================================================

import { storageGet, storageSet, KEYS } from './storage/storage.js';
import { DEFAULT_CAMERA_CONFIG } from './storage/defaults.js';

export { DEFAULT_CAMERA_CONFIG };

function mergeStateProfiles(storedProfiles) {
  const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
  const out = {};
  for (const state of Object.keys(defProfiles)) {
    out[state] = { ...defProfiles[state], ...(storedProfiles[state] ?? {}) };
  }
  return out;
}

// Resolve the stored camera config: current schema → merged over defaults, anything else → defaults.
function resolveStoredCameraConfig() {
  const stored = storageGet(KEYS.CAMERA_CONFIG);
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_CAMERA_CONFIG };

  if (stored.schemaVersion !== 20) return { ...DEFAULT_CAMERA_CONFIG };

  // v20: merge top-level fields, then deep-merge cameraStateProfiles.
  const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
  if (stored.cameraStateProfiles) {
    merged.cameraStateProfiles = mergeStateProfiles(stored.cameraStateProfiles);
  }
  return merged;
}

/**
 * The live camera config: the stored config resolved through its migration path, then guaranteed to be
 * DEFAULTS overlaid by stored keys. CAMERA-FOCUS-4 systemic rule (bug class #3 — "the flag never reaches
 * the live config"): a stored config may OVERRIDE a value but can NEVER silently omit new machinery — any
 * top-level DEFAULT key absent from the resolved config is filled from DEFAULT here, on every branch. The
 * 'legacy' constructor fallback in CameraDirector therefore only ever fires for a truly bare test caller
 * (`new CameraDirector()` with no config), never for a real persisted config.
 */
export function loadCameraConfig() {
  const resolved = resolveStoredCameraConfig();
  const out = { ...resolved };
  for (const key of Object.keys(DEFAULT_CAMERA_CONFIG)) {
    if (!(key in out)) out[key] = DEFAULT_CAMERA_CONFIG[key];
  }
  return out;
}

/**
 * CAMERA-FOCUS-4 LIVE TRUTH — read-only provenance of the resolved camera config. For each top-level
 * key it reports whether the resolved value came from the STORED config or from DEFAULT, plus the stored
 * schema version. Lets the race-start console line prove — in one glance — that a persisted config did
 * NOT silently omit new machinery (e.g. cameraTransitionGrammar). No behaviour change.
 * @returns {{ resolved: object, sources: Record<string,'stored'|'default'>, storedSchemaVersion: number|null, hadStored: boolean }}
 */
export function cameraConfigProvenance() {
  const stored = storageGet(KEYS.CAMERA_CONFIG);
  const storedObj = stored && typeof stored === 'object' ? stored : {};
  const resolved = loadCameraConfig();
  const sources = {};
  for (const key of Object.keys(DEFAULT_CAMERA_CONFIG)) {
    sources[key] = Object.prototype.hasOwnProperty.call(storedObj, key) ? 'stored' : 'default';
  }
  return {
    resolved,
    sources,
    storedSchemaVersion:
      typeof storedObj.schemaVersion === 'number' ? storedObj.schemaVersion : null,
    hadStored: !!stored && typeof stored === 'object',
  };
}

export function saveCameraConfig(config) {
  return storageSet(KEYS.CAMERA_CONFIG, { ...config, schemaVersion: 20 });
}
