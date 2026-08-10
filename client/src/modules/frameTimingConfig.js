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

/**
 * CANVAS-SCALE-1: the range the render scale may take, and its one home. The Dev Screen slider, the
 * loader's validation and the renderer all read these — a slider that offered a value the loader
 * rejects would silently snap back to the default and look like the setting did nothing.
 *
 * The floor is 0.4 rather than 0: below roughly that the name tags stop being readable at all, so a
 * lower value could only ever be a mistake. The ceiling is 1.0 because the reference size is what
 * the whole render path draws in — going above it would not sharpen anything the layout knows about,
 * it would only cost.
 */
export const RENDER_SCALE_MIN = 0.4;
export const RENDER_SCALE_MAX = 1.0;

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
  if (
    typeof merged.renderScale !== 'number' ||
    !Number.isFinite(merged.renderScale) ||
    merged.renderScale < RENDER_SCALE_MIN ||
    merged.renderScale > RENDER_SCALE_MAX
  ) {
    merged.renderScale = DEFAULT_FRAME_TIMING_CONFIG.renderScale;
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
