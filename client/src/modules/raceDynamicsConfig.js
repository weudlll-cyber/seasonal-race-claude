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
    // Shared director contest STRENGTHS (rides the realism envelope): same whole-object-reject pattern.
    typeof merged.governorDirectorLeaderBrake !== 'number' ||
    merged.governorDirectorLeaderBrake < 0 ||
    typeof merged.governorDirectorChallengerBoost !== 'number' ||
    merged.governorDirectorChallengerBoost < 0 ||
    typeof merged.governorDirectorFrontPool !== 'number' ||
    merged.governorDirectorFrontPool < 0 ||
    typeof merged.governorDirectorCeilingCap !== 'boolean' ||
    typeof merged.governorDirectorBoostHeadroom !== 'number' ||
    merged.governorDirectorBoostHeadroom < 0 ||
    typeof merged.directorV4SuppressChaosBonusB1 !== 'boolean' ||
    typeof merged.directorV4Intensity !== 'number' ||
    merged.directorV4Intensity < 0 ||
    merged.directorV4Intensity > 1 ||
    typeof merged.directorV4PackBandStrictness !== 'number' ||
    merged.directorV4PackBandStrictness < 0 ||
    merged.directorV4PackBandStrictness > 1 ||
    [
      merged.directorV4ReleaseProgress,
      merged.directorV4ResolveB2,
      merged.directorV4ResolveB3,
      merged.directorV4ResolveB4,
      merged.directorV4ResolveB5,
    ].some((v) => typeof v !== 'number' || v <= 0 || v > 1) ||
    typeof merged.directorV4OutcomeStart !== 'number' ||
    merged.directorV4OutcomeStart < 0.25 ||
    merged.directorV4OutcomeStart > 0.55
  ) {
    return { ...DEFAULT_RACE_DYNAMICS_CONFIG };
  }
  return merged;
}

export function saveRaceDynamicsConfig(config) {
  return storageSet(KEYS.RACE_DYNAMICS_CONFIG, config);
}
