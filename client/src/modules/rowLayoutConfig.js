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
import { applyKeyRules } from './storage/configValidate.js';
import { reportRejectedKeys, reportStoreDefects } from './storage/configReport.js';

export { DEFAULT_ROW_LAYOUT_CONFIG };

/**
 * PER-KEY-REJECT-1: what this store accepts, one rule per constraint. A failing key falls back to
 * ITS default and every other key survives — see `storage/configValidate.js` for the rule and for
 * why the fallback is the default rather than a clamp.
 */
export const ROW_LAYOUT_RULES = [
  { keys: ['rowGapMultiplier'], ok: (c) => !(c.rowGapMultiplier <= 0), why: 'it must be above 0' },
  {
    keys: ['speedBonusFactor'],
    ok: (c) => !(c.speedBonusFactor < 0),
    why: 'it must not be negative',
  },
  {
    keys: ['maxCapacityFactor'],
    ok: (c) => !(c.maxCapacityFactor <= 0 || c.maxCapacityFactor > 1),
    why: 'it must be above 0 and at most 1',
  },
];

export function loadRowLayoutConfig() {
  pruneStoredRowLayoutConfig();
  const merged = resolveFromDefaults(storageGet(KEYS.ROW_LAYOUT_CONFIG), DEFAULT_ROW_LAYOUT_CONFIG);
  const { config, rejected, storeDefects } = applyKeyRules(
    merged,
    DEFAULT_ROW_LAYOUT_CONFIG,
    ROW_LAYOUT_RULES
  );
  reportRejectedKeys(KEYS.ROW_LAYOUT_CONFIG, rejected);
  reportStoreDefects(KEYS.ROW_LAYOUT_CONFIG, storeDefects);
  return config;
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
