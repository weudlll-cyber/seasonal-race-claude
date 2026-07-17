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

// ── Stored-key carry-over: RETIRED. The PULK-cleanup rename shim (RENAMED_KEY_MIGRATION +
// migrateRenamedKeys, Stage-5a directorV4*→choreo* and Stage-5b-i governor*→pulk*) was removed:
// single-player with localStorage cleared between runs, so there is no persisted pre-rename config to
// carry over. A stale blob still holding old keys now simply fails validation and falls back to
// defaults (graceful + intended).

export function loadRaceDynamicsConfig() {
  const rawStored = storageGet(KEYS.RACE_DYNAMICS_CONFIG);
  if (!rawStored || typeof rawStored !== 'object') return { ...DEFAULT_RACE_DYNAMICS_CONFIG };
  const stored = rawStored;
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
    // Pulk realism envelope (±maxEffect clamp + slew): same whole-object-reject pattern; bounds are
    // validation limits, fallbacks come from DEFAULT_RACE_DYNAMICS_CONFIG.
    typeof merged.pulkEnvelopeMaxEffect !== 'number' ||
    merged.pulkEnvelopeMaxEffect < 0 ||
    merged.pulkEnvelopeMaxEffect > 0.5 ||
    typeof merged.pulkEnvelopeMaxStepPerFrame !== 'number' ||
    merged.pulkEnvelopeMaxStepPerFrame <= 0 ||
    // Pulk contest STRENGTHS (ride the realism envelope): same whole-object-reject pattern.
    typeof merged.pulkLeaderBrake !== 'number' ||
    merged.pulkLeaderBrake < 0 ||
    typeof merged.pulkChallengerBoost !== 'number' ||
    merged.pulkChallengerBoost < 0 ||
    typeof merged.pulkFrontPool !== 'number' ||
    merged.pulkFrontPool < 0 ||
    typeof merged.pulkCeilingCap !== 'boolean' ||
    typeof merged.pulkBoostHeadroom !== 'number' ||
    merged.pulkBoostHeadroom < 0 ||
    typeof merged.choreoSuppressChaosBonusB1 !== 'boolean' ||
    typeof merged.choreoIntensity !== 'number' ||
    merged.choreoIntensity < 0 ||
    merged.choreoIntensity > 1 ||
    typeof merged.choreoPackBandStrictness !== 'number' ||
    merged.choreoPackBandStrictness < 0 ||
    merged.choreoPackBandStrictness > 1 ||
    [
      merged.choreoReleaseProgress,
      merged.choreoResolveB2,
      merged.choreoResolveB3,
      merged.choreoResolveB4,
      merged.choreoResolveB5,
    ].some((v) => typeof v !== 'number' || v <= 0 || v > 1) ||
    typeof merged.choreoOutcomeStart !== 'number' ||
    merged.choreoOutcomeStart < 0.25 ||
    merged.choreoOutcomeStart > 0.6
  ) {
    return { ...DEFAULT_RACE_DYNAMICS_CONFIG };
  }
  return merged;
}

export function saveRaceDynamicsConfig(config) {
  return storageSet(KEYS.RACE_DYNAMICS_CONFIG, config);
}
