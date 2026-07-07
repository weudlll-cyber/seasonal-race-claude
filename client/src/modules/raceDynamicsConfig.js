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
    typeof merged.pulkBiasGain !== 'number' ||
    merged.pulkBiasGain < 0 ||
    // Director realism envelope (shared ±maxEffect clamp + slew): same whole-object-reject
    // pattern; bounds are validation limits, fallbacks come from DEFAULT_RACE_DYNAMICS_CONFIG.
    typeof merged.governorMaxEffect !== 'number' ||
    merged.governorMaxEffect < 0 ||
    merged.governorMaxEffect > 0.5 ||
    typeof merged.governorMaxStepPerFrame !== 'number' ||
    merged.governorMaxStepPerFrame <= 0 ||
    // Contest-injector "director" fields: same whole-object-reject pattern.
    typeof merged.governorDirectorEnabled !== 'boolean' ||
    typeof merged.governorDirectorCastSize !== 'number' ||
    merged.governorDirectorCastSize < 1 ||
    typeof merged.governorDirectorDwell !== 'number' ||
    merged.governorDirectorDwell <= 0 ||
    typeof merged.governorDirectorAnchorOffset !== 'number' ||
    merged.governorDirectorAnchorOffset < 0 ||
    typeof merged.governorDirectorPullStrength !== 'number' ||
    merged.governorDirectorPullStrength < 0 ||
    typeof merged.governorDirectorSettling !== 'number' ||
    merged.governorDirectorSettling < 0
  ) {
    return { ...DEFAULT_RACE_DYNAMICS_CONFIG };
  }
  return merged;
}

export function saveRaceDynamicsConfig(config) {
  return storageSet(KEYS.RACE_DYNAMICS_CONFIG, config);
}
