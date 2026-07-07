// ============================================================
// File:        raceZoneConfig.js
// Path:        client/src/modules/raceZoneConfig.js
// Project:     RaceArena
// Created:     2026-06-19
// Description: Storage CRUD for race-zone config.
// ============================================================

import { storageGet, storageSet, KEYS } from './storage/storage.js';
import { DEFAULT_RACE_ZONE_CONFIG } from './storage/defaults.js';

export { DEFAULT_RACE_ZONE_CONFIG };

export function loadRaceZoneConfig() {
  const stored = storageGet(KEYS.RACE_ZONE_CONFIG);
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_RACE_ZONE_CONFIG };
  const merged = { ...DEFAULT_RACE_ZONE_CONFIG, ...stored };
  if (
    typeof merged.enabled !== 'boolean' ||
    merged.position < 0 ||
    merged.position > 1 ||
    merged.width < 0.01 ||
    merged.width > 0.2
  ) {
    return { ...DEFAULT_RACE_ZONE_CONFIG };
  }
  // brakeStrength is clamped at load time, not only enforced by the slider.
  merged.brakeStrength = Math.max(0.8, Math.min(1.0, merged.brakeStrength));
  return merged;
}

export function saveRaceZoneConfig(config) {
  return storageSet(KEYS.RACE_ZONE_CONFIG, config);
}
