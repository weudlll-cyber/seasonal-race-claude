// ============================================================
// File:        frameTimingConfig.js
// Path:        client/src/modules/frameTimingConfig.js
// Project:     RaceArena
// Description: Storage CRUD for frame-timing config (EMA smoothing alpha).
//              Follows the raceDynamicsConfig.js pattern.
// ============================================================

import { storageGet, storageSet, KEYS } from './storage/storage.js';
import { DEFAULT_FRAME_TIMING_CONFIG } from './storage/defaults.js';

export { DEFAULT_FRAME_TIMING_CONFIG };

export function loadFrameTimingConfig() {
  const stored = storageGet(KEYS.FRAME_TIMING_CONFIG);
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_FRAME_TIMING_CONFIG };
  const merged = { ...DEFAULT_FRAME_TIMING_CONFIG, ...stored };
  if (
    typeof merged.dtSmoothingAlpha !== 'number' ||
    merged.dtSmoothingAlpha < 0 ||
    merged.dtSmoothingAlpha > 0.95
  ) {
    return { ...DEFAULT_FRAME_TIMING_CONFIG };
  }
  return merged;
}

export function saveFrameTimingConfig(config) {
  return storageSet(KEYS.FRAME_TIMING_CONFIG, config);
}
