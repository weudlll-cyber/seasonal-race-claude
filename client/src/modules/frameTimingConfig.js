// ============================================================
// File:        frameTimingConfig.js
// Path:        client/src/modules/frameTimingConfig.js
// Project:     RaceArena
// Description: Storage CRUD for frame-timing config (EMA smoothing alpha).
//              Follows the raceDynamicsConfig.js pattern.
// ============================================================

import { storageGet, storageSet, KEYS } from './storage/storage.js';
import { DEFAULT_FRAME_TIMING_CONFIG } from './storage/defaults.js';
import { resolveFromDefaults, diffFromDefaults, pruneStored } from './storage/configDiff.js';

export { DEFAULT_FRAME_TIMING_CONFIG };

export function loadFrameTimingConfig() {
  pruneStoredFrameTimingConfig();
  const merged = resolveFromDefaults(
    storageGet(KEYS.FRAME_TIMING_CONFIG),
    DEFAULT_FRAME_TIMING_CONFIG
  );
  if (
    typeof merged.dtSmoothingAlpha !== 'number' ||
    merged.dtSmoothingAlpha < 0 ||
    merged.dtSmoothingAlpha > 0.95
  ) {
    return { ...DEFAULT_FRAME_TIMING_CONFIG };
  }
  if (typeof merged.renderInterpolation !== 'boolean') {
    merged.renderInterpolation = DEFAULT_FRAME_TIMING_CONFIG.renderInterpolation;
  }
  return merged;
}

/**
 * CONFIG-DIFF-2: the one-time prune of the stored config — drop every key equal to its current
 * default, so an untouched key goes back to following the default. The rule lives in
 * `storage/configDiff.js`; the only thing that lives here is which storage key it belongs to.
 *
 * Idempotent and write-free when there is nothing to drop, so it is safe to call on every load.
 */
export function pruneStoredFrameTimingConfig() {
  const { pruned, changed } = pruneStored(
    storageGet(KEYS.FRAME_TIMING_CONFIG),
    DEFAULT_FRAME_TIMING_CONFIG
  );
  if (changed) storageSet(KEYS.FRAME_TIMING_CONFIG, pruned);
  return changed;
}

export function saveFrameTimingConfig(config) {
  return storageSet(
    KEYS.FRAME_TIMING_CONFIG,
    diffFromDefaults(config, DEFAULT_FRAME_TIMING_CONFIG)
  );
}
