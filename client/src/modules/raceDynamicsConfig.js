// ============================================================
// File:        raceDynamicsConfig.js
// Path:        client/src/modules/raceDynamicsConfig.js
// Project:     RaceArena
// Created:     2026-05-04
// Description: Storage CRUD for race-dynamics (re-roll) tuning config.
//              Follows the baseSpeedConfig.js pattern.
// ============================================================

import { storageGet, storageSet, KEYS } from './storage/storage.js';
import { DEFAULT_RACE_DYNAMICS_CONFIG } from './storage/defaults.js';

export { DEFAULT_RACE_DYNAMICS_CONFIG };

export function loadRaceDynamicsConfig() {
  const stored = storageGet(KEYS.RACE_DYNAMICS_CONFIG);
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_RACE_DYNAMICS_CONFIG };
  const merged = { ...DEFAULT_RACE_DYNAMICS_CONFIG, ...stored };
  if (
    merged.reRollVariationPercent <= 0 ||
    merged.reRollTransitionDuration <= 0 ||
    merged.trajectoryTransitionDuration <= 0 ||
    merged.reRollIntervalDivisor <= 0 ||
    merged.reRollLastPositionPercent <= 0 ||
    merged.reRollLastPositionPercent > 100 ||
    merged.trajectoryTransitionDuration <= 0 ||
    // PULK-surge fields: reject the whole stored object to defaults if any is out of range
    // (same whole-object-reject pattern as the legacy fields above). Bounds are validation
    // limits; the fallback values come from DEFAULT_RACE_DYNAMICS_CONFIG (single source).
    typeof merged.pulkSurgeEnabled !== 'boolean' ||
    typeof merged.pulkSurgeFraction !== 'number' ||
    merged.pulkSurgeFraction < 0 ||
    merged.pulkSurgeFraction > 0.5 ||
    typeof merged.pulkSurgeBonus !== 'number' ||
    merged.pulkSurgeBonus < 0 ||
    merged.pulkSurgeBonus > 0.12 ||
    typeof merged.pulkSurgeRampInMs !== 'number' ||
    merged.pulkSurgeRampInMs < 0 ||
    merged.pulkSurgeRampInMs > 5000 ||
    typeof merged.pulkSurgeRampOutMs !== 'number' ||
    merged.pulkSurgeRampOutMs < 0 ||
    merged.pulkSurgeRampOutMs > 5000 ||
    typeof merged.pulkBrakeExemptStrength !== 'number' ||
    merged.pulkBrakeExemptStrength < 0 ||
    merged.pulkBrakeExemptStrength > 1 ||
    // Governor fields (Stage B): same whole-object-reject pattern; bounds are validation
    // limits, fallbacks come from DEFAULT_RACE_DYNAMICS_CONFIG (single source).
    typeof merged.governorEnabled !== 'boolean' ||
    typeof merged.governorDrama !== 'number' ||
    merged.governorDrama < 0 ||
    merged.governorDrama > 1 ||
    typeof merged.governorK0 !== 'number' ||
    merged.governorK0 <= 0 ||
    typeof merged.governorLengthMin !== 'number' ||
    merged.governorLengthMin <= 0 ||
    typeof merged.governorLengthMax !== 'number' ||
    merged.governorLengthMax < merged.governorLengthMin ||
    typeof merged.governorLengthFloor !== 'number' ||
    merged.governorLengthFloor <= 0 ||
    typeof merged.governorRampWidth !== 'number' ||
    merged.governorRampWidth <= 0 ||
    typeof merged.governorAMin !== 'number' ||
    merged.governorAMin < 0 ||
    typeof merged.governorAMax !== 'number' ||
    merged.governorAMax < merged.governorAMin ||
    typeof merged.governorFrequency !== 'number' ||
    merged.governorFrequency <= 0 ||
    typeof merged.governorMaxEffect !== 'number' ||
    merged.governorMaxEffect < 0 ||
    merged.governorMaxEffect > 0.5 ||
    typeof merged.governorMaxStepPerFrame !== 'number' ||
    merged.governorMaxStepPerFrame <= 0
  ) {
    return { ...DEFAULT_RACE_DYNAMICS_CONFIG };
  }
  return merged;
}

export function saveRaceDynamicsConfig(config) {
  return storageSet(KEYS.RACE_DYNAMICS_CONFIG, config);
}
