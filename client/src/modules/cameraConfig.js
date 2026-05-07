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
    if (patched.spritePctOfCanvas) {
      merged.spritePctOfCanvas = {
        ...DEFAULT_CAMERA_CONFIG.spritePctOfCanvas,
        ...patched.spritePctOfCanvas,
      };
    }
    normalizeCameraTransitionSeconds(merged);
    return merged;
  }

  if (stored.schemaVersion !== 3) return { ...DEFAULT_CAMERA_CONFIG };
  const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
  if (stored.spritePctOfCanvas) {
    merged.spritePctOfCanvas = {
      ...DEFAULT_CAMERA_CONFIG.spritePctOfCanvas,
      ...stored.spritePctOfCanvas,
    };
  }
  normalizeCameraTransitionSeconds(merged);
  return merged;
}

export function saveCameraConfig(config) {
  return storageSet(KEYS.CAMERA_CONFIG, { ...config, schemaVersion: 3 });
}
