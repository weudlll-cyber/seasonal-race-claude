// ============================================================
// File:        raceBehaviorConfig.js
// Path:        client/src/modules/raceBehaviorConfig.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Storage CRUD for race-behavior tuning config (D7b).
//              Follows the baseSpeedConfig.js pattern.
// ============================================================

import { storageGet, storageSet, KEYS } from './storage/storage.js';
import { DEFAULT_RACE_BEHAVIOR_CONFIG } from './storage/defaults.js';

export { DEFAULT_RACE_BEHAVIOR_CONFIG };

export function loadRaceBehaviorConfig() {
  const stored = storageGet(KEYS.RACE_BEHAVIOR_CONFIG);
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_RACE_BEHAVIOR_CONFIG };
  const merged = { ...DEFAULT_RACE_BEHAVIOR_CONFIG, ...stored };
  if (
    merged.homeForceStrength <= 0 ||
    merged.comfortThreshold <= 0 ||
    merged.comfortThreshold >= 1 ||
    merged.softRepulsionStrength <= 0 ||
    merged.avoidanceDistance <= 0 ||
    merged.tWeight <= 0 ||
    merged.yWeight <= 0 ||
    merged.lateralForce <= 0 ||
    merged.maxLateral <= 0 ||
    merged.speedBrakeYThreshold <= 0 ||
    merged.speedBrakeTThreshold <= 0 ||
    merged.speedBrakeFactor <= 0 ||
    merged.speedBrakeFactor > 1 ||
    merged.draftingMaxDistance <= 0 ||
    merged.draftingConeAngle <= 0 ||
    merged.draftingConeAngle >= 180 ||
    merged.draftingBoost < 1
  ) {
    return { ...DEFAULT_RACE_BEHAVIOR_CONFIG };
  }
  return merged;
}

export function saveRaceBehaviorConfig(config) {
  storageSet(KEYS.RACE_BEHAVIOR_CONFIG, config);
}
