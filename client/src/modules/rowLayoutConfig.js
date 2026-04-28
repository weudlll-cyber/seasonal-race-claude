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

export { DEFAULT_ROW_LAYOUT_CONFIG };

export function loadRowLayoutConfig() {
  const stored = storageGet(KEYS.ROW_LAYOUT_CONFIG);
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_ROW_LAYOUT_CONFIG };
  const merged = { ...DEFAULT_ROW_LAYOUT_CONFIG, ...stored };
  if (
    merged.pixelsPerRacer <= 0 ||
    merged.rowGapMultiplier <= 0 ||
    merged.speedBonusFactor < 0 ||
    merged.maxCapacityFactor <= 0 ||
    merged.maxCapacityFactor > 1
  ) {
    return { ...DEFAULT_ROW_LAYOUT_CONFIG };
  }
  return merged;
}

export function saveRowLayoutConfig(config) {
  storageSet(KEYS.ROW_LAYOUT_CONFIG, config);
}
