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
//              Schema v5 (2026-05-09): replaces pixel-based leadInDistance /
//              followDuration / leadOutDistance with time-based leadInDuration /
//              leadOutDuration (seconds). v4→v5 migration preserves all non-phase
//              profile fields; phase fields reset to new defaults.
//              Schema v6 (2026-05-15): reduces leadInDuration defaults
//              (LEADER/COMEBACK 1.0→0.3, BATTLE 0.5→0.2) to prevent the camera
//              arriving at a position where the leader is near the viewport edge.
//              v5→v6 migration resets leadInDuration to new defaults.
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
// Phase fields (leadInDuration, leadOutDuration) always use v5 defaults.
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
      spritePct: sp.overview ?? def.OVERVIEW.spritePct,
      trackingTC: tc.overview ?? def.OVERVIEW.trackingTC,
      entryTC: tc.overview ?? def.OVERVIEW.entryTC,
      innerFramePct,
      maxStateDuration: globalMax,
      minStateHold: globalMin,
      leadInDuration: def.OVERVIEW.leadInDuration,
      leadOutDuration: def.OVERVIEW.leadOutDuration,
    },
    LEADER_ZOOM: {
      spritePct: sp.leader ?? def.LEADER_ZOOM.spritePct,
      trackingTC: tc.leader ?? def.LEADER_ZOOM.trackingTC,
      entryTC: tc.leader ?? def.LEADER_ZOOM.entryTC,
      innerFramePct,
      maxStateDuration: globalMax,
      minStateHold: globalMin,
      leadInDuration: def.LEADER_ZOOM.leadInDuration,
      leadOutDuration: def.LEADER_ZOOM.leadOutDuration,
    },
    BATTLE_ZOOM: {
      spritePct: sp.battle ?? def.BATTLE_ZOOM.spritePct,
      trackingTC: tc.battle ?? def.BATTLE_ZOOM.trackingTC,
      entryTC: tc.battle ?? def.BATTLE_ZOOM.entryTC,
      innerFramePct,
      // BATTLE had its own maxStateDuration in v3
      maxStateDuration: config.battleMaxDurationMs ?? 6000,
      minStateHold: globalMin,
      leadInDuration: def.BATTLE_ZOOM.leadInDuration,
      leadOutDuration: def.BATTLE_ZOOM.leadOutDuration,
    },
    COMEBACK_ZOOM: {
      spritePct: sp.comeback ?? def.COMEBACK_ZOOM.spritePct,
      trackingTC: tc.comeback ?? def.COMEBACK_ZOOM.trackingTC,
      entryTC: tc.comeback ?? def.COMEBACK_ZOOM.entryTC,
      innerFramePct,
      maxStateDuration: globalMax,
      minStateHold: globalMin,
      leadInDuration: def.COMEBACK_ZOOM.leadInDuration,
      leadOutDuration: def.COMEBACK_ZOOM.leadOutDuration,
    },
  };
}

function migrateV3toV5(config) {
  if (config.cameraStateProfiles) {
    // Already has profiles (shouldn't happen on v3, but guard): migrate to v5 format
    return migrateV4toV5({ ...config, schemaVersion: 4 });
  }
  return {
    ...config,
    cameraStateProfiles: buildProfilesFromLegacy(config),
    entryConvergenceZoom: DEFAULT_CAMERA_CONFIG.entryConvergenceZoom,
    entryConvergencePx: DEFAULT_CAMERA_CONFIG.entryConvergencePx,
    schemaVersion: 5,
  };
}

// v4→v5: preserve non-phase profile fields; reset phase fields to new duration-based defaults.
function migrateV4toV5(config) {
  const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
  const oldProfiles = config.cameraStateProfiles ?? {};
  const newProfiles = {};
  for (const state of Object.keys(defProfiles)) {
    const old = oldProfiles[state] ?? {};
    newProfiles[state] = {
      spritePct: old.spritePct ?? defProfiles[state].spritePct,
      trackingTC: old.trackingTC ?? defProfiles[state].trackingTC,
      entryTC: old.entryTC ?? defProfiles[state].entryTC,
      innerFramePct: old.innerFramePct ?? defProfiles[state].innerFramePct,
      maxStateDuration: old.maxStateDuration ?? defProfiles[state].maxStateDuration,
      minStateHold: old.minStateHold ?? defProfiles[state].minStateHold,
      // Phase fields: always reset to new defaults (px → seconds not convertible)
      leadInDuration: defProfiles[state].leadInDuration,
      leadOutDuration: defProfiles[state].leadOutDuration,
    };
  }
  return {
    ...config,
    cameraStateProfiles: newProfiles,
    schemaVersion: 5,
  };
}

// v5→v6: reset leadInDuration to new (reduced) defaults to prevent camera arriving with
// the leader at the viewport edge. All other profile fields are preserved.
function migrateV5toV6(config) {
  const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
  const oldProfiles = config.cameraStateProfiles ?? {};
  const newProfiles = {};
  for (const state of Object.keys(defProfiles)) {
    const old = oldProfiles[state] ?? {};
    newProfiles[state] = {
      ...old,
      leadInDuration: defProfiles[state].leadInDuration,
    };
  }
  return {
    ...config,
    cameraStateProfiles: newProfiles,
    schemaVersion: 6,
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
    // migrateV3toV5 always calls buildProfilesFromLegacy instead of short-circuiting.
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
    return migrateV5toV6(migrateV3toV5(merged));
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
    return migrateV5toV6(migrateV3toV5(merged));
  }

  if (stored.schemaVersion === 4) {
    // v4→v5→v6: preserve zoom/TC fields, reset phase fields, reduce leadInDuration.
    return migrateV5toV6(migrateV4toV5({ ...DEFAULT_CAMERA_CONFIG, ...stored }));
  }

  if (stored.schemaVersion === 5) {
    // v5→v6: reset leadInDuration to reduced defaults; other profile fields preserved.
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
    return migrateV5toV6(merged);
  }

  if (stored.schemaVersion !== 6) return { ...DEFAULT_CAMERA_CONFIG };

  // v6: merge top-level fields, then deep-merge cameraStateProfiles
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
  return storageSet(KEYS.CAMERA_CONFIG, { ...config, schemaVersion: 6 });
}
