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
import { resolveFromDefaults, diffFromDefaults, pruneStored } from './storage/configDiff.js';

export { DEFAULT_RACE_DYNAMICS_CONFIG };

// ── Stored-key carry-over: RETIRED. The PULK-cleanup rename shim (RENAMED_KEY_MIGRATION +
// migrateRenamedKeys, Stage-5a directorV4*→choreo* and Stage-5b-i governor*→pulk*) was removed:
// single-player with localStorage cleared between runs, so there is no persisted pre-rename config to
// carry over. A stale blob still holding old keys now simply fails validation and falls back to
// defaults (graceful + intended).

export function loadRaceDynamicsConfig() {
  pruneStoredRaceDynamicsConfig();
  const merged = resolveFromDefaults(
    storageGet(KEYS.RACE_DYNAMICS_CONFIG),
    DEFAULT_RACE_DYNAMICS_CONFIG
  );
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
    // racePlanPulkStart — the CHAOS→PULK boundary (DevScreen control). Honest validated range
    // [0.10, 0.60] per the measured chain-world plateau; shipped default 0.15 (COMBO15).
    typeof merged.racePlanPulkStart !== 'number' ||
    merged.racePlanPulkStart < 0.1 ||
    merged.racePlanPulkStart > 0.6 ||
    typeof merged.choreoOutcomeStart !== 'number' ||
    merged.choreoOutcomeStart < 0.25 ||
    merged.choreoOutcomeStart > 0.6 ||
    // Front-act window. Same whole-object-reject pattern as everything above. contestWindowStart must
    // sit inside the OUTCOME act it measures: after OUTCOME begins and strictly before the release,
    // else the measurement window is empty or spans a phase it was never meant to cover.
    typeof merged.contestWindowStart !== 'number' ||
    merged.contestWindowStart <= merged.choreoOutcomeStart ||
    merged.contestWindowStart >= merged.choreoReleaseProgress
  ) {
    return { ...DEFAULT_RACE_DYNAMICS_CONFIG };
  }
  return merged;
}

/**
 * CONFIG-DIFF-2: the one-time prune of the stored config — drop every key equal to its current
 * default, so an untouched key goes back to following the default. The rule lives in
 * `storage/configDiff.js`; the only thing that lives here is which storage key it belongs to.
 *
 * Idempotent and write-free when there is nothing to drop, so it is safe to call on every load.
 */
export function pruneStoredRaceDynamicsConfig() {
  const { pruned, changed } = pruneStored(
    storageGet(KEYS.RACE_DYNAMICS_CONFIG),
    DEFAULT_RACE_DYNAMICS_CONFIG
  );
  if (changed) storageSet(KEYS.RACE_DYNAMICS_CONFIG, pruned);
  return changed;
}

export function saveRaceDynamicsConfig(config) {
  return storageSet(
    KEYS.RACE_DYNAMICS_CONFIG,
    diffFromDefaults(config, DEFAULT_RACE_DYNAMICS_CONFIG)
  );
}
