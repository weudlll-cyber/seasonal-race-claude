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

// ── Stored-key carry-over: the directorV4* → choreo* rename (Stage 5a). Single source of truth.
// A raceDynamicsConfig persisted BEFORE the rename carries its customized VALUES over to the new
// choreo* keys; the old keys are then dropped. Migrated values flow through the SAME validation
// below (under their new key/range) — the migration never bypasses validation and never touches any
// key outside this map, so no removed mechanism can be resurrected.
export const CHOREO_KEY_MIGRATION = {
  directorV4Intensity: 'choreoIntensity',
  directorV4PackBandStrictness: 'choreoPackBandStrictness',
  directorV4SuppressChaosBonusB1: 'choreoSuppressChaosBonusB1',
  directorV4ReleaseProgress: 'choreoReleaseProgress',
  directorV4ResolveB2: 'choreoResolveB2',
  directorV4ResolveB3: 'choreoResolveB3',
  directorV4ResolveB4: 'choreoResolveB4',
  directorV4ResolveB5: 'choreoResolveB5',
  directorV4OutcomeStart: 'choreoOutcomeStart',
};

// Copy-on-write: never mutate the caller's object. An old key carries over ONLY if the new key is
// not already present (an explicit new value wins), then the old key is removed.
function migrateChoreoKeys(stored) {
  let out = stored;
  for (const [oldKey, newKey] of Object.entries(CHOREO_KEY_MIGRATION)) {
    if (!Object.prototype.hasOwnProperty.call(out, oldKey)) continue;
    if (out === stored) out = { ...stored };
    if (!Object.prototype.hasOwnProperty.call(out, newKey)) out[newKey] = out[oldKey];
    delete out[oldKey];
  }
  return out;
}

export function loadRaceDynamicsConfig() {
  const rawStored = storageGet(KEYS.RACE_DYNAMICS_CONFIG);
  if (!rawStored || typeof rawStored !== 'object') return { ...DEFAULT_RACE_DYNAMICS_CONFIG };
  const stored = migrateChoreoKeys(rawStored);
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
    merged.choreoOutcomeStart > 0.55
  ) {
    return { ...DEFAULT_RACE_DYNAMICS_CONFIG };
  }
  return merged;
}

export function saveRaceDynamicsConfig(config) {
  return storageSet(KEYS.RACE_DYNAMICS_CONFIG, config);
}
