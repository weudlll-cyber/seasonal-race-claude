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
    typeof merged.governorDirectorPullStrength !== 'number' ||
    merged.governorDirectorPullStrength < 0 ||
    typeof merged.governorDirectorSettling !== 'number' ||
    merged.governorDirectorSettling < 0 ||
    typeof merged.governorDirectorLeaderBrake !== 'number' ||
    merged.governorDirectorLeaderBrake < 0 ||
    typeof merged.governorDirectorChallengerBoost !== 'number' ||
    merged.governorDirectorChallengerBoost < 0 ||
    typeof merged.governorDirectorFrontPool !== 'number' ||
    merged.governorDirectorFrontPool < 0 ||
    typeof merged.governorDirectorBoostOncePerRace !== 'boolean' ||
    typeof merged.governorDirectorLingerBrake !== 'number' ||
    merged.governorDirectorLingerBrake < 0 ||
    typeof merged.governorDirectorCeilingCap !== 'boolean' ||
    typeof merged.governorDirectorBoostHeadroom !== 'number' ||
    merged.governorDirectorBoostHeadroom < 0 ||
    typeof merged.directorV4Enabled !== 'boolean' ||
    // Event-driven catch-up + active fall-back (rebuild).
    typeof merged.governorDirectorMaxParallelBoosts !== 'number' ||
    merged.governorDirectorMaxParallelBoosts < 0 ||
    typeof merged.governorDirectorBoostDurationMin !== 'number' ||
    merged.governorDirectorBoostDurationMin < 0 ||
    typeof merged.governorDirectorBoostDurationMax !== 'number' ||
    merged.governorDirectorBoostDurationMax < 0 ||
    typeof merged.governorDirectorCatchThreshold !== 'number' ||
    merged.governorDirectorCatchThreshold < 0 ||
    typeof merged.governorDirectorFallbackEnabled !== 'boolean' ||
    typeof merged.governorDirectorFallbackFromPool !== 'number' ||
    merged.governorDirectorFallbackFromPool < 0 ||
    typeof merged.governorDirectorFallbackMaxCount !== 'number' ||
    merged.governorDirectorFallbackMaxCount < 0 ||
    typeof merged.governorDirectorFallbackUntilPosition !== 'number' ||
    merged.governorDirectorFallbackUntilPosition < 0 ||
    typeof merged.governorDirectorFallbackProtectMs !== 'number' ||
    merged.governorDirectorFallbackProtectMs < 0
  ) {
    return { ...DEFAULT_RACE_DYNAMICS_CONFIG };
  }
  return merged;
}

export function saveRaceDynamicsConfig(config) {
  return storageSet(KEYS.RACE_DYNAMICS_CONFIG, config);
}
