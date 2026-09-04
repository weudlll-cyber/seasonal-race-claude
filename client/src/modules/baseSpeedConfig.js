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
import { applyKeyRules } from './storage/configValidate.js';
import { reportRejectedKeys, reportStoreDefects } from './storage/configReport.js';

export { DEFAULT_BASE_SPEED_CONFIG };

/**
 * PER-KEY-REJECT-1: what this store accepts. The `normalSpeedPxPerSec` rule was ALREADY per-key —
 * it repaired that one field and left the rest alone, which is the behaviour this whole change
 * generalises. The min/max rule was the whole-object one; it is a CROSS-KEY rule, so it names both
 * and reverts whichever of them the operator actually set (see `storage/configValidate.js`).
 */
export const BASE_SPEED_RULES = [
  {
    keys: ['min', 'max'],
    ok: (c) => !(c.min <= 0 || c.min >= c.max),
    why: 'the minimum must be above 0 and below the maximum',
  },
  {
    keys: ['normalSpeedPxPerSec'],
    ok: (c) => !(!Number.isFinite(c.normalSpeedPxPerSec) || c.normalSpeedPxPerSec <= 0),
    why: 'it must be a finite speed above 0',
  },
];

/** Load config from localStorage, merging with defaults. */
export function loadBaseSpeedConfig() {
  pruneStoredBaseSpeedConfig();
  const merged = resolveFromDefaults(
    storageGet(KEYS.BASE_SPEED_CONFIG, null),
    DEFAULT_BASE_SPEED_CONFIG
  );
  const { config, rejected, storeDefects } = applyKeyRules(
    merged,
    DEFAULT_BASE_SPEED_CONFIG,
    BASE_SPEED_RULES
  );
  reportRejectedKeys(KEYS.BASE_SPEED_CONFIG, rejected);
  reportStoreDefects(KEYS.BASE_SPEED_CONFIG, storeDefects);
  return config;
}

/** Persist config to localStorage. */
/**
 * CONFIG-DIFF-2: the one-time prune of the stored config — drop every key equal to its current
 * default, so an untouched key goes back to following the default. The rule lives in
 * `storage/configDiff.js`; the only thing that lives here is which storage key it belongs to.
 *
 * Idempotent and write-free when there is nothing to drop, so it is safe to call on every load.
 */
function pruneStoredBaseSpeedConfig() {
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
