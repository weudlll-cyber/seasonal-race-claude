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

export { DEFAULT_BASE_SPEED_CONFIG };

/** Load config from localStorage, merging with defaults. */
export function loadBaseSpeedConfig() {
  const stored = storageGet(KEYS.BASE_SPEED_CONFIG, null);
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_BASE_SPEED_CONFIG };
  const merged = { ...DEFAULT_BASE_SPEED_CONFIG, ...stored };
  // Guard: min must be > 0 and < max
  if (merged.min <= 0 || merged.min >= merged.max) return { ...DEFAULT_BASE_SPEED_CONFIG };
  return merged;
}

/** Persist config to localStorage. */
export function saveBaseSpeedConfig(config) {
  storageSet(KEYS.BASE_SPEED_CONFIG, config);
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
