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

export function loadCameraConfig() {
  const stored = storageGet(KEYS.CAMERA_CONFIG);
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_CAMERA_CONFIG };
  if (stored.schemaVersion !== 2) return { ...DEFAULT_CAMERA_CONFIG };
  const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
  if (stored.spritePctOfCanvas) {
    merged.spritePctOfCanvas = {
      ...DEFAULT_CAMERA_CONFIG.spritePctOfCanvas,
      ...stored.spritePctOfCanvas,
    };
  }
  return merged;
}

export function saveCameraConfig(config) {
  return storageSet(KEYS.CAMERA_CONFIG, { ...config, schemaVersion: 2 });
}
