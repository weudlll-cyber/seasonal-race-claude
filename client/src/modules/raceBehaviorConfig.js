// ============================================================
// File:        raceBehaviorConfig.js
// Path:        client/src/modules/raceBehaviorConfig.js
// Project:     RaceArena
// Created:     2026-04-27
// Description: Storage CRUD for race-behavior tuning config (D11).
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
    merged.avoidanceDistance <= 0 ||
    merged.avoidanceLateralForce <= 0 ||
    merged.avoidanceMaxLateral <= 0 ||
    merged.avoidanceSpeedBrake <= 0 ||
    merged.avoidanceSpeedBrake > 1 ||
    merged.avoidanceReturnSpeed <= 0 ||
    merged.avoidanceReturnSpeed >= 1 ||
    merged.draftingDistanceT <= 0 ||
    merged.draftingLaneThreshold <= 0 ||
    merged.draftingBoostFactor < 1
  ) {
    return { ...DEFAULT_RACE_BEHAVIOR_CONFIG };
  }
  return merged;
}

export function saveRaceBehaviorConfig(config) {
  storageSet(KEYS.RACE_BEHAVIOR_CONFIG, config);
}
