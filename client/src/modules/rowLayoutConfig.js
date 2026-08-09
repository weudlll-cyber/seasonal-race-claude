// ============================================================
// File:        rowLayoutConfig.js
// Path:        client/src/modules/rowLayoutConfig.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: Storage CRUD for D7c row-start layout config.
//              Follows the raceBehaviorConfig.js pattern.
// ============================================================

import { storageGet, storageSet, KEYS } from './storage/storage.js';
import { DEFAULT_ROW_LAYOUT_CONFIG } from './storage/defaults.js';
import { resolveFromDefaults, diffFromDefaults, pruneStored } from './storage/configDiff.js';

export { DEFAULT_ROW_LAYOUT_CONFIG };

export function loadRowLayoutConfig() {
  pruneStoredRowLayoutConfig();
  const merged = resolveFromDefaults(storageGet(KEYS.ROW_LAYOUT_CONFIG), DEFAULT_ROW_LAYOUT_CONFIG);
  if (
    merged.rowGapMultiplier <= 0 ||
    merged.speedBonusFactor < 0 ||
    merged.maxCapacityFactor <= 0 ||
    merged.maxCapacityFactor > 1
  ) {
    return { ...DEFAULT_ROW_LAYOUT_CONFIG };
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
export function pruneStoredRowLayoutConfig() {
  const { pruned, changed } = pruneStored(
    storageGet(KEYS.ROW_LAYOUT_CONFIG),
    DEFAULT_ROW_LAYOUT_CONFIG
  );
  if (changed) storageSet(KEYS.ROW_LAYOUT_CONFIG, pruned);
  return changed;
}

export function saveRowLayoutConfig(config) {
  return storageSet(KEYS.ROW_LAYOUT_CONFIG, diffFromDefaults(config, DEFAULT_ROW_LAYOUT_CONFIG));
}
