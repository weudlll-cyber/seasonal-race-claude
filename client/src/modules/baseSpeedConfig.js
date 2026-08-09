// ============================================================
// File:        baseSpeedConfig.js
// Path:        client/src/modules/baseSpeedConfig.js
// Project:     RaceArena
// Created:     2026-04-27
// Description: Tunable BASE_SPEED min/max range for the race engine.
//              Smaller spread = racers stay closer together on the track.
//              Wider spread = more dramatic separation, but risks confusing
//              lap-wrap visual gaps on the minimap.
// ============================================================

import { KEYS, storageGet, storageSet } from './storage/storage.js';
import { DEFAULT_BASE_SPEED_CONFIG } from './storage/defaults.js';
import { resolveFromDefaults, diffFromDefaults, pruneStored } from './storage/configDiff.js';

export { DEFAULT_BASE_SPEED_CONFIG };

/** Load config from localStorage, merging with defaults. */
export function loadBaseSpeedConfig() {
  pruneStoredBaseSpeedConfig();
  const merged = resolveFromDefaults(
    storageGet(KEYS.BASE_SPEED_CONFIG, null),
    DEFAULT_BASE_SPEED_CONFIG
  );
  // Guard: min must be > 0 and < max
  if (merged.min <= 0 || merged.min >= merged.max) return { ...DEFAULT_BASE_SPEED_CONFIG };
  // MIGRATION: configs stored before the speed/duration ship carry only min/max. The spread
  // above merges the new normal-speed field in; this guard also repairs a stored value that
  // is absent, non-numeric or non-positive, so a legacy localStorage entry can never leave
  // the game without a pace.
  if (!Number.isFinite(merged.normalSpeedPxPerSec) || merged.normalSpeedPxPerSec <= 0) {
    merged.normalSpeedPxPerSec = DEFAULT_BASE_SPEED_CONFIG.normalSpeedPxPerSec;
  }
  return merged;
}

/** Persist config to localStorage. */
/**
 * CONFIG-DIFF-2: the one-time prune of the stored config — drop every key equal to its current
 * default, so an untouched key goes back to following the default. The rule lives in
 * `storage/configDiff.js`; the only thing that lives here is which storage key it belongs to.
 *
 * Idempotent and write-free when there is nothing to drop, so it is safe to call on every load.
 */
export function pruneStoredBaseSpeedConfig() {
  const { pruned, changed } = pruneStored(
    storageGet(KEYS.BASE_SPEED_CONFIG),
    DEFAULT_BASE_SPEED_CONFIG
  );
  if (changed) storageSet(KEYS.BASE_SPEED_CONFIG, pruned);
  return changed;
}

export function saveBaseSpeedConfig(config) {
  storageSet(KEYS.BASE_SPEED_CONFIG, diffFromDefaults(config, DEFAULT_BASE_SPEED_CONFIG));
}

/**
 * Spread percentage: how far each extreme is from the mean, as a % of the mean.
 * spread(0.00091, 0.00118) ≈ ±12.9%
 */
export function spreadPercent(min, max) {
  if (!min || !max || min >= max) return 0;
  const mean = (min + max) / 2;
  return ((max - min) / 2 / mean) * 100;
}
