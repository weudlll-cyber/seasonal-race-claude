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

// Old default before D7c Phase 4 — migrate stored 0.7 → 0.95
const LEGACY_START_SPREAD_DEFAULT = 0.7;

export function loadRaceBehaviorConfig() {
  const stored = storageGet(KEYS.RACE_BEHAVIOR_CONFIG);
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_RACE_BEHAVIOR_CONFIG };
  const merged = { ...DEFAULT_RACE_BEHAVIOR_CONFIG, ...stored };
  // Migrate: if the stored spread is the old default, silently upgrade it
  if (merged.startSpreadRange === LEGACY_START_SPREAD_DEFAULT) {
    merged.startSpreadRange = DEFAULT_RACE_BEHAVIOR_CONFIG.startSpreadRange;
  }
  if (
    merged.startSpreadRange <= 0 ||
    merged.startSpreadRange > 1 ||
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
    merged.draftingBoost < 1 ||
    merged.runoutZone < 0 ||
    merged.runoutZone > 0.2 ||
    merged.minLateralEpsilon <= 0 ||
    merged.minLateralEpsilon > 0.1 ||
    merged.crowdNormalizationExponent < 0 ||
    merged.crowdNormalizationExponent > 1 ||
    typeof merged.symmetricAvoidance !== 'boolean' ||
    !Number.isInteger(merged.draftingMaxTargets) ||
    merged.draftingMaxTargets < 1 ||
    merged.draftingMaxTargets > 5 ||
    merged.avoidanceStrictness < 0 ||
    merged.avoidanceStrictness > 1 ||
    merged.startPhaseSpreadThreshold <= 0 ||
    merged.startPhaseSpreadThreshold > 0.2 ||
    merged.startPhaseAvoidanceFactor < 0 ||
    merged.startPhaseAvoidanceFactor > 2 ||
    merged.startPhaseHomeForceFactor < 0 ||
    merged.startPhaseHomeForceFactor > 1
  ) {
    return { ...DEFAULT_RACE_BEHAVIOR_CONFIG };
  }
  return merged;
}

export function saveRaceBehaviorConfig(config) {
  return storageSet(KEYS.RACE_BEHAVIOR_CONFIG, config);
}
