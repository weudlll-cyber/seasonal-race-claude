// ============================================================
// File:        raceBehaviorConfig.js
// Path:        client/src/modules/raceBehaviorConfig.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Storage CRUD for race-behavior tuning config — sight-model architecture.
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
    merged.sightHorizonFrames <= 0 ||
    merged.safetyMarginPx < 0 ||
    merged.laneCommitFrames < 0 ||
    merged.overtakeAggressionDefault < 0 ||
    merged.overtakeAggressionDefault > 1 ||
    merged.speedAdvantageThreshold < 0 ||
    merged.maxLateralStepPerFrame <= 0 ||
    merged.draftingActivationFrames <= 0 ||
    merged.speedBrakeFactor <= 0 ||
    merged.speedBrakeFactor > 1 ||
    merged.draftingMaxDistance <= 0 ||
    merged.draftingConeAngle <= 0 ||
    merged.draftingConeAngle >= 180 ||
    merged.draftingBoost < 1 ||
    merged.runoutZone < 0 ||
    merged.runoutZone > 0.2
  ) {
    return { ...DEFAULT_RACE_BEHAVIOR_CONFIG };
  }
  return merged;
}

export function saveRaceBehaviorConfig(config) {
  return storageSet(KEYS.RACE_BEHAVIOR_CONFIG, config);
}
