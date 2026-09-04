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
import { applyKeyRules } from './storage/configValidate.js';
import { reportRejectedKeys, reportStoreDefects } from './storage/configReport.js';

export { DEFAULT_RACE_DYNAMICS_CONFIG };

// ── Stored-key carry-over: RETIRED. The PULK-cleanup rename shim (RENAMED_KEY_MIGRATION +
// migrateRenamedKeys, Stage-5a directorV4*→choreo* and Stage-5b-i governor*→pulk*) was removed:
// single-player with localStorage cleared between runs, so there is no persisted pre-rename config to
// carry over. A stale blob holding old keys is handled by the RESOLVER, which walks the DEFAULT keys
// and therefore never lets a retired key into the config at all.
//
// *(This block used to end "a stale blob simply fails validation and falls back to defaults". That
// was a description of the whole-object reject, and PER-KEY-REJECT-1 removed it on 2026-09-04:
// nothing here falls back to every default any more, and a retired key was never a validation
// failure in the first place - the resolver drops it before validation sees it.)*

/**
 * PER-KEY-REJECT-1: what this store accepts, one rule per constraint.
 *
 * THIS IS THE STORE THE DEFECT WAS WORST IN. Forty-odd keys sat behind a single `return
 * { ...DEFAULT_RACE_DYNAMICS_CONFIG }`, so one stored value outside its range took the brake, the
 * boost, the intensity, the attacker count and the whole race plan with it - silently, with no line
 * anywhere naming the key that did it. The predicates below are the SAME ones that chain held,
 * negated one at a time, so the set of ACCEPTED configs is unchanged; what changed is that a
 * rejection now costs exactly the key that caused it.
 *
 * TWO SHAPES WERE FLATTENED IN THE PROCESS, both of them for precision rather than tidiness:
 *   - the `[releaseProgress, resolveB2..B5].some(...)` array became FIVE rules. As one rule it named
 *     five keys, so a bad `choreoResolveB4` would have reverted the other four resolves with it.
 *   - `contestWindowStart` became three: its own type check, and the two ORDERING rules that also
 *     name the key on the other side of the comparison.
 *
 * AND ONE CONDITION WAS DROPPED AS A DUPLICATE: `trajectoryTransitionDuration <= 0` appeared TWICE
 * in the old chain, at positions 3 and 6. Two identical clauses in one `||` accept exactly what one
 * does, so nothing moved.
 */
export const RACE_DYNAMICS_RULES = [
  {
    keys: ['reRollVariationPercent'],
    ok: (c) => !(c.reRollVariationPercent <= 0),
    why: 'it must be above 0',
  },
  {
    keys: ['reRollTransitionDuration'],
    ok: (c) => !(c.reRollTransitionDuration <= 0),
    why: 'it must be above 0',
  },
  {
    keys: ['trajectoryTransitionDuration'],
    ok: (c) => !(c.trajectoryTransitionDuration <= 0),
    why: 'it must be above 0',
  },
  {
    keys: ['reRollIntervalDivisor'],
    ok: (c) => !(c.reRollIntervalDivisor <= 0),
    why: 'it must be above 0',
  },
  {
    keys: ['reRollLastPositionPercent'],
    ok: (c) => !(c.reRollLastPositionPercent <= 0 || c.reRollLastPositionPercent > 100),
    why: 'it must be above 0 and at most 100',
  },
  {
    keys: ['pulkBiasGain'],
    ok: (c) => !(typeof c.pulkBiasGain !== 'number' || c.pulkBiasGain < 0),
    why: 'it must be a number and not negative',
  },
  // Pulk realism envelope (+/- maxEffect clamp + slew). Bounds are validation limits; the fallback
  // is the key's own default, from DEFAULT_RACE_DYNAMICS_CONFIG.
  {
    keys: ['pulkEnvelopeMaxEffect'],
    ok: (c) =>
      !(
        typeof c.pulkEnvelopeMaxEffect !== 'number' ||
        c.pulkEnvelopeMaxEffect < 0 ||
        c.pulkEnvelopeMaxEffect > 0.5
      ),
    why: 'it must be a number between 0 and 0.5',
  },
  {
    keys: ['pulkEnvelopeMaxStepPerFrame'],
    ok: (c) =>
      !(typeof c.pulkEnvelopeMaxStepPerFrame !== 'number' || c.pulkEnvelopeMaxStepPerFrame <= 0),
    why: 'it must be a number above 0',
  },
  // Pulk contest STRENGTHS - they ride the realism envelope above.
  {
    keys: ['pulkLeaderBrake'],
    ok: (c) => !(typeof c.pulkLeaderBrake !== 'number' || c.pulkLeaderBrake < 0),
    why: 'it must be a number and not negative',
  },
  {
    keys: ['pulkChallengerBoost'],
    ok: (c) => !(typeof c.pulkChallengerBoost !== 'number' || c.pulkChallengerBoost < 0),
    why: 'it must be a number and not negative',
  },
  {
    keys: ['pulkFrontPool'],
    ok: (c) => !(typeof c.pulkFrontPool !== 'number' || c.pulkFrontPool < 0),
    why: 'it must be a number and not negative',
  },
  {
    keys: ['pulkCeilingCap'],
    ok: (c) => !(typeof c.pulkCeilingCap !== 'boolean'),
    why: 'it must be true or false',
  },
  {
    keys: ['pulkBoostHeadroom'],
    ok: (c) => !(typeof c.pulkBoostHeadroom !== 'number' || c.pulkBoostHeadroom < 0),
    why: 'it must be a number and not negative',
  },
  {
    keys: ['choreoSuppressChaosBonusB1'],
    ok: (c) => !(typeof c.choreoSuppressChaosBonusB1 !== 'boolean'),
    why: 'it must be true or false',
  },
  {
    keys: ['choreoIntensity'],
    ok: (c) =>
      !(typeof c.choreoIntensity !== 'number' || c.choreoIntensity < 0 || c.choreoIntensity > 1),
    why: 'it must be a number between 0 and 1',
  },
  {
    keys: ['choreoPackBandStrictness'],
    ok: (c) =>
      !(
        typeof c.choreoPackBandStrictness !== 'number' ||
        c.choreoPackBandStrictness < 0 ||
        c.choreoPackBandStrictness > 1
      ),
    why: 'it must be a number between 0 and 1',
  },
  ...[
    'choreoReleaseProgress',
    'choreoResolveB2',
    'choreoResolveB3',
    'choreoResolveB4',
    'choreoResolveB5',
  ].map((key) => ({
    keys: [key],
    ok: (c) => !(typeof c[key] !== 'number' || c[key] <= 0 || c[key] > 1),
    why: 'it must be a number above 0 and at most 1',
  })),
  // racePlanPulkStart - the CHAOS->PULK boundary (DevScreen control). Honest validated range
  // [0.10, 0.60] per the measured chain-world plateau; shipped default 0.15 (COMBO15).
  {
    keys: ['racePlanPulkStart'],
    ok: (c) =>
      !(
        typeof c.racePlanPulkStart !== 'number' ||
        c.racePlanPulkStart < 0.1 ||
        c.racePlanPulkStart > 0.6
      ),
    why: 'it must be a number between 0.10 and 0.60, the measured chain-world plateau',
  },
  // ── choreoOutcomeStart - the PULK/OUTCOME seam. Shipped 0.60. ─────────────────────────────────
  //
  // ★★ TWO NUMBERS HERE, AND THEY ARE DELIBERATELY DIFFERENT.
  //
  //   THE ACCEPTED RANGE IS [0.25, 0.60], and the Dev Screen's slider enforces it. THE TOP IS
  //   0.60 BECAUSE THAT IS THE EDGE OF WHAT HAS BEEN MEASURED, not because the mechanism stops
  //   there. The mechanism's wall is 0.70 - `choreoResolveB3` is a fixed 0.70, so B3's settling
  //   window `[this, 0.70]` is ZERO wide there - and SWEEP 2 measured 0.70 as holding the gate on
  //   3 of 4 tracks. But SWEEP 2 is 2026-07-17, before the speed-150 re-baseline, COMBO15,
  //   gap-reroll's flip and the B2 attackers at count 3. NOTHING ABOVE 0.60 HAS BEEN MEASURED ON
  //   THE TREE THAT SHIPS. The owner raised the slider to 0.70 on 2026-09-03 and REVERSED IT ON
  //   2026-09-04 for exactly that reason.
  //
  //   THIS LOADER STILL TOLERATES UP TO 0.70. Until 2026-09-04 that was load-bearing and said so:
  //   the slider stood at 0.70 for a day, so a stored 0.65 is reachable, and this validator
  //   discarded the WHOLE OBJECT on any failure - tightening the bound would have thrown away an
  //   operator's brake, boost, intensity and attacker count to correct one key. **PER-KEY-REJECT-1
  //   REMOVED THAT COST.** A rejected key now falls back to its own default alone and the operator
  //   is told which one. So the tolerance is no longer protecting anything, and whether to tighten
  //   it to 0.60 is now a plain question about the bound rather than a hostage situation.
  //
  // ★ THIS BOUND AND THE DEV SCREEN'S MUST STILL MOVE TOGETHER. It was 0.6 here while the widget
  // was being raised to 0.70. A widget that can write a value its loader rejects is a control that
  // silently does nothing - which is a smaller fault than it was, but still a fault.
  {
    keys: ['choreoOutcomeStart'],
    ok: (c) =>
      !(
        typeof c.choreoOutcomeStart !== 'number' ||
        c.choreoOutcomeStart < 0.25 ||
        c.choreoOutcomeStart > 0.7
      ),
    why: 'it must be a number between 0.25 and 0.70',
  },
  // Front-act window. `contestWindowStart` must sit inside the OUTCOME act it measures: after
  // OUTCOME begins and strictly before the release, else the measurement window is empty or spans a
  // phase it was never meant to cover. THREE rules rather than one, so that a bad
  // `contestWindowStart` does not revert the two keys it is compared against.
  {
    keys: ['contestWindowStart'],
    ok: (c) => !(typeof c.contestWindowStart !== 'number'),
    why: 'it must be a number',
  },
  {
    keys: ['contestWindowStart', 'choreoOutcomeStart'],
    ok: (c) => !(c.contestWindowStart <= c.choreoOutcomeStart),
    why: 'the front-act window must begin after OUTCOME does',
  },
  {
    keys: ['contestWindowStart', 'choreoReleaseProgress'],
    ok: (c) => !(c.contestWindowStart >= c.choreoReleaseProgress),
    why: 'the front-act window must begin strictly before the release',
  },
];

export function loadRaceDynamicsConfig() {
  pruneStoredRaceDynamicsConfig();
  const merged = resolveFromDefaults(
    storageGet(KEYS.RACE_DYNAMICS_CONFIG),
    DEFAULT_RACE_DYNAMICS_CONFIG
  );
  const { config, rejected, storeDefects } = applyKeyRules(
    merged,
    DEFAULT_RACE_DYNAMICS_CONFIG,
    RACE_DYNAMICS_RULES
  );
  reportRejectedKeys(KEYS.RACE_DYNAMICS_CONFIG, rejected);
  reportStoreDefects(KEYS.RACE_DYNAMICS_CONFIG, storeDefects);
  return config;
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
