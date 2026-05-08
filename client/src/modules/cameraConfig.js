// ============================================================
// File:        cameraConfig.js
// Path:        client/src/modules/cameraConfig.js
// Project:     RaceArena
// Created:     2026-05-04
// Description: Storage CRUD for camera tuning config.
//              Follows the raceDynamicsConfig.js pattern.
//              Schema v2 migration: old configs (no schemaVersion or schemaVersion≠2)
//              are discarded and replaced with fresh defaults rather than merged.
//              This prevents stale multiplier fields from silently overriding the
//              new spritePctOfCanvas logic.
//              Schema v4 (2026-05-08): introduces per-state cameraStateProfiles.
//              v3→v4 migration builds profiles from legacy spritePctOfCanvas /
//              cameraTransitionSeconds so user-tuned values survive the upgrade.
// ============================================================

import { storageGet, storageSet, KEYS } from './storage/storage.js';
import { DEFAULT_CAMERA_CONFIG } from './storage/defaults.js';

export { DEFAULT_CAMERA_CONFIG };

// Converts a scalar cameraTransitionSeconds (stored by v3 configs) to the object
// form expected by CameraDirector. Mutates the merged config in-place.
function normalizeCameraTransitionSeconds(config) {
  if (typeof config.cameraTransitionSeconds === 'number') {
    const s = config.cameraTransitionSeconds;
    const def = DEFAULT_CAMERA_CONFIG.cameraTransitionSeconds;
    config.cameraTransitionSeconds = {
      overview: s,
      leader: def.leader,
      battle: def.battle,
      comeback: def.comeback,
    };
  }
}

// Build a cameraStateProfiles object from legacy spritePctOfCanvas / cameraTransitionSeconds
// fields present on a v2/v3 config.  Preserves any user-tuned per-state values.
function buildProfilesFromLegacy(config) {
  const sp = config.spritePctOfCanvas ?? {};
  const tc =
    typeof config.cameraTransitionSeconds === 'object'
      ? config.cameraTransitionSeconds
      : DEFAULT_CAMERA_CONFIG.cameraTransitionSeconds;
  const innerFramePct = config.targetInnerFramePct ?? 0.7;
  const globalMax = config.maxStateDuration ?? 4000;
  const globalMin = config.minStateHoldMs ?? 5000;
  const def = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;

  return {
    OVERVIEW: {
      ...def.OVERVIEW,
      spritePct: sp.overview ?? def.OVERVIEW.spritePct,
      trackingTC: tc.overview ?? def.OVERVIEW.trackingTC,
      entryTC: tc.overview ?? def.OVERVIEW.entryTC,
      innerFramePct,
      maxStateDuration: globalMax,
      minStateHold: globalMin,
    },
    LEADER_ZOOM: {
      ...def.LEADER_ZOOM,
      spritePct: sp.leader ?? def.LEADER_ZOOM.spritePct,
      trackingTC: tc.leader ?? def.LEADER_ZOOM.trackingTC,
      entryTC: tc.leader ?? def.LEADER_ZOOM.entryTC,
      innerFramePct,
      maxStateDuration: globalMax,
      minStateHold: globalMin,
    },
    BATTLE_ZOOM: {
      ...def.BATTLE_ZOOM,
      spritePct: sp.battle ?? def.BATTLE_ZOOM.spritePct,
      trackingTC: tc.battle ?? def.BATTLE_ZOOM.trackingTC,
      entryTC: tc.battle ?? def.BATTLE_ZOOM.entryTC,
      innerFramePct,
      // BATTLE had its own maxStateDuration in v3
      maxStateDuration: config.battleMaxDurationMs ?? 6000,
      minStateHold: globalMin,
    },
    COMEBACK_ZOOM: {
      ...def.COMEBACK_ZOOM,
      spritePct: sp.comeback ?? def.COMEBACK_ZOOM.spritePct,
      trackingTC: tc.comeback ?? def.COMEBACK_ZOOM.trackingTC,
      entryTC: tc.comeback ?? def.COMEBACK_ZOOM.entryTC,
      innerFramePct,
      maxStateDuration: globalMax,
      minStateHold: globalMin,
    },
  };
}

function migrateV3toV4(config) {
  if (config.cameraStateProfiles) return { ...config, schemaVersion: 4 };
  return {
    ...config,
    cameraStateProfiles: buildProfilesFromLegacy(config),
    entryConvergenceZoom: DEFAULT_CAMERA_CONFIG.entryConvergenceZoom,
    entryConvergencePx: DEFAULT_CAMERA_CONFIG.entryConvergencePx,
    schemaVersion: 4,
  };
}

export function loadCameraConfig() {
  const stored = storageGet(KEYS.CAMERA_CONFIG);
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_CAMERA_CONFIG };

  // v2 → v3 migration: rename battleMaxDuration to battleMaxDurationMs
  if (stored.schemaVersion === 2) {
    const patched = { ...stored, schemaVersion: 3 };
    if ('battleMaxDuration' in patched) {
      patched.battleMaxDurationMs = patched.battleMaxDuration;
      delete patched.battleMaxDuration;
    }
    const merged = { ...DEFAULT_CAMERA_CONFIG, ...patched };
    // v2/v3 configs never had cameraStateProfiles; strip the default so
    // migrateV3toV4 always calls buildProfilesFromLegacy instead of short-circuiting.
    delete merged.cameraStateProfiles;
    if (patched.spritePctOfCanvas) {
      merged.spritePctOfCanvas = {
        ...DEFAULT_CAMERA_CONFIG.spritePctOfCanvas,
        ...patched.spritePctOfCanvas,
      };
    } else {
      delete merged.spritePctOfCanvas;
    }
    normalizeCameraTransitionSeconds(merged);
    // Fall through to v3→v4 migration
    return migrateV3toV4(merged);
  }

  if (stored.schemaVersion === 3) {
    const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
    // Strip default profiles so buildProfilesFromLegacy constructs them from legacy fields.
    delete merged.cameraStateProfiles;
    if (stored.spritePctOfCanvas) {
      merged.spritePctOfCanvas = {
        ...DEFAULT_CAMERA_CONFIG.spritePctOfCanvas,
        ...stored.spritePctOfCanvas,
      };
    } else {
      // User never stored spritePctOfCanvas — remove default so buildProfilesFromLegacy
      // falls through to profile defaults for each field via the `?? def.STATE.spritePct` chain.
      delete merged.spritePctOfCanvas;
    }
    normalizeCameraTransitionSeconds(merged);
    return migrateV3toV4(merged);
  }

  if (stored.schemaVersion !== 4) return { ...DEFAULT_CAMERA_CONFIG };

  // v4: merge top-level fields, then deep-merge cameraStateProfiles
  const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
  if (stored.cameraStateProfiles) {
    const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
    merged.cameraStateProfiles = {};
    for (const state of Object.keys(defProfiles)) {
      merged.cameraStateProfiles[state] = {
        ...defProfiles[state],
        ...(stored.cameraStateProfiles[state] ?? {}),
      };
    }
  }
  return merged;
}

export function saveCameraConfig(config) {
  return storageSet(KEYS.CAMERA_CONFIG, { ...config, schemaVersion: 4 });
}
