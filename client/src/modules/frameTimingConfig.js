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
 * SCOREBOARD-CADENCE-1: the band the standings cadence may take, and its one home. The Dev Screen
 * control and the loader's validation both read these, so a control that offered a value the loader
 * rejects would silently snap back to the default and look like the setting did nothing.
 *
 * The floor is 100 ms rather than 0 because below roughly that the list is being rebuilt more often
 * than a person can read it, which spends the exact cost this key exists to control for no gain the
 * eye can see. The ceiling is 2000 ms: past two seconds the standings stop being live and become a
 * periodic report, which is a different product and not a cadence choice.
 */
export const SCOREBOARD_INTERVAL_MIN_MS = 100;
export const SCOREBOARD_INTERVAL_MAX_MS = 2000;

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
    typeof merged.scoreboardIntervalMs !== 'number' ||
    !Number.isFinite(merged.scoreboardIntervalMs) ||
    merged.scoreboardIntervalMs < SCOREBOARD_INTERVAL_MIN_MS ||
    merged.scoreboardIntervalMs > SCOREBOARD_INTERVAL_MAX_MS
  ) {
    merged.scoreboardIntervalMs = DEFAULT_FRAME_TIMING_CONFIG.scoreboardIntervalMs;
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
