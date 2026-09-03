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
    // choreoOutcomeStart — the PULK/OUTCOME seam. Shipped 0.60.
    //
    // ★★ TWO NUMBERS HERE, AND THEY ARE DELIBERATELY DIFFERENT.
    //
    //   THE ACCEPTED RANGE IS [0.25, 0.60], and the Dev Screen's slider enforces it. THE TOP IS
    //   0.60 BECAUSE THAT IS THE EDGE OF WHAT HAS BEEN MEASURED, not because the mechanism stops
    //   there. The mechanism's wall is 0.70 — `choreoResolveB3` is a fixed 0.70, so B3's settling
    //   window `[this, 0.70]` is ZERO wide there — and SWEEP 2 measured 0.70 as holding the gate on
    //   3 of 4 tracks. But SWEEP 2 is 2026-07-17, before the speed-150 re-baseline, COMBO15,
    //   gap-reroll's flip and the B2 attackers at count 3. NOTHING ABOVE 0.60 HAS BEEN MEASURED ON
    //   THE TREE THAT SHIPS. The owner raised the slider to 0.70 on 2026-09-03 and REVERSED IT ON
    //   2026-09-04 for exactly that reason.
    //
    //   THIS LOADER STILL TOLERATES UP TO 0.70, and that is not an oversight. The slider stood at
    //   0.70 for a day, so a stored 0.65 is reachable — and this validator REJECTS THE WHOLE OBJECT
    //   on any failure, silently returning every default. Tightening it to 0.60 would throw away an
    //   operator's brake, boost, intensity and attacker count to correct one key they can no longer
    //   set anyway. A tolerated 0.65 costs one clamp on open; a tightened bound costs the config.
    //   (This project takes no migrations, by standing rule, so there is no third option.)
    //
    //   THE RESIDUAL IS REPORTED, NOT HIDDEN: a stored 0.65 loads, and the slider clamps it to 0.60
    //   the moment it is touched — CONTROL-BOUNDS-1's defect in miniature, on a value only reachable
    //   during one day's window. It is on the morning sheet rather than silently repaired.
    //
    // ★ THIS BOUND AND THE DEV SCREEN'S MUST MOVE TOGETHER, and that is not a style note. It was
    // 0.6 here while the widget was being raised to 0.70, which would have let an operator set 0.65
    // or 0.70 and have this loader REJECT THE WHOLE OBJECT and silently return every default —
    // losing every other tuning in the config with it. A widget that can write a value its loader
    // throws away is worse than one that cannot reach the value at all.
    typeof merged.choreoOutcomeStart !== 'number' ||
    merged.choreoOutcomeStart < 0.25 ||
    merged.choreoOutcomeStart > 0.7 ||
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
