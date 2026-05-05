// ============================================================
// File:        cameraConfig.js
// Path:        client/src/modules/cameraConfig.js
// Project:     RaceArena
// Created:     2026-05-04
// Description: Storage CRUD for camera tuning config.
//              Follows the raceDynamicsConfig.js pattern.
// ============================================================

import { storageGet, storageSet, KEYS } from './storage/storage.js';
import { DEFAULT_CAMERA_CONFIG } from './storage/defaults.js';

export { DEFAULT_CAMERA_CONFIG };

export function loadCameraConfig() {
  const stored = storageGet(KEYS.CAMERA_CONFIG);
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_CAMERA_CONFIG };
  return { ...DEFAULT_CAMERA_CONFIG, ...stored };
}

export function saveCameraConfig(config) {
  return storageSet(KEYS.CAMERA_CONFIG, config);
}
