// ============================================================
// File:        raceBehaviorConfig.js
// Path:        client/src/modules/raceBehaviorConfig.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Storage CRUD for race-behavior tuning config (D7b).
//              Follows the baseSpeedConfig.js pattern.
// ============================================================

import { storageGet, storageSet, KEYS } from './storage/storage.js';
import { DEFAULT_RACE_BEHAVIOR_CONFIG } from './storage/defaults.js';
import { easeInOutCubic } from '../utils/mathUtils.js';
import { resolveFromDefaults, diffFromDefaults, pruneStored } from './storage/configDiff.js';
import { applyKeyRules } from './storage/configValidate.js';
import { reportRejectedKeys, reportStoreDefects } from './storage/configReport.js';

export { DEFAULT_RACE_BEHAVIOR_CONFIG };

// ── Start-phase brake ramp ─────────────────────────────────────────────────────

/**
 * Return the effective speedBrakeFactor for this frame, applying the open-track
 * warmup ramp when applicable.
 *
 * On closed tracks (isOpen=false) or when avoidanceWarmupMs=0: returns
 * config.speedBrakeFactor unchanged (no ramp, identical to legacy behaviour).
 *
 * On open tracks during the warmup window: returns a value between 1.0 (no
 * braking at t=0) and config.speedBrakeFactor (full braking at t=warmupMs),
 * shaped by an easeInOutCubic curve.
 *
 * @param {object} config        behaviorConfig (must contain speedBrakeFactor, avoidanceWarmupMs)
 * @param {boolean} isOpen       true for open tracks
 * @param {number}  raceElapsedMs  ms elapsed since race start (physicsTs / raceTs)
 * @returns {number}
 */
export function computeEffectiveBrakeFactor(config, isOpen, raceElapsedMs) {
  if (!isOpen || !(config.avoidanceWarmupMs > 0)) return config.speedBrakeFactor;
  const brakeScale = easeInOutCubic(Math.min(1, raceElapsedMs / config.avoidanceWarmupMs));
  return 1.0 - brakeScale * (1.0 - config.speedBrakeFactor);
}

// Old default before D7c Phase 4 — migrate stored 0.7 → 0.95
const LEGACY_START_SPREAD_DEFAULT = 0.7;

/**
 * PER-KEY-REJECT-1: what this store accepts, one rule per constraint.
 *
 * These are the SAME predicates the single `||`-chain held, negated one at a time - the set of
 * ACCEPTED configs is unchanged, and this module's suite pins that. What changed is the
 * CONSEQUENCE: a failing key now falls back to its own default and the other forty-two survive,
 * where before one bad `draftingConeAngle` returned every default in the store.
 *
 * `isFinite` rather than `Number.isFinite` wherever the original used it - the global coerces its
 * argument, so the two disagree on a numeric STRING. Keeping each predicate exactly as it was is
 * the point; tightening one here would be a behaviour change smuggled inside a repair.
 *
 * ONE CROSS-KEY RULE: the look-before-brake re-engage margin must sit below the brake-zone
 * multiplier, else no pass window exists. It names BOTH keys, because nothing in a stored object
 * says which of the two is the mistake.
 */
export const RACE_BEHAVIOR_RULES = [
  {
    keys: ['startSpreadRange'],
    ok: (c) => !(c.startSpreadRange <= 0 || c.startSpreadRange > 1),
    why: 'it must be above 0 and at most 1',
  },
  {
    keys: ['comfortThreshold'],
    ok: (c) => !(c.comfortThreshold <= 0 || c.comfortThreshold >= 1),
    why: 'it must be strictly between 0 and 1',
  },
  {
    keys: ['softRepulsionStrength'],
    ok: (c) => !(c.softRepulsionStrength <= 0),
    why: 'it must be above 0',
  },
  { keys: ['lateralForce'], ok: (c) => !(c.lateralForce <= 0), why: 'it must be above 0' },
  { keys: ['maxLateral'], ok: (c) => !(c.maxLateral <= 0), why: 'it must be above 0' },
  {
    keys: ['speedBrakeYThreshold'],
    ok: (c) => !(c.speedBrakeYThreshold <= 0),
    why: 'it must be above 0',
  },
  {
    keys: ['speedBrakeTMultiplier'],
    ok: (c) => !(c.speedBrakeTMultiplier <= 0),
    why: 'it must be above 0',
  },
  {
    keys: ['speedBrakeFactor'],
    ok: (c) => !(c.speedBrakeFactor <= 0 || c.speedBrakeFactor > 1),
    why: 'it must be above 0 and at most 1',
  },
  {
    keys: ['draftingMaxDistance'],
    ok: (c) => !(c.draftingMaxDistance <= 0),
    why: 'it must be above 0',
  },
  {
    keys: ['draftingConeAngle'],
    ok: (c) => !(c.draftingConeAngle <= 0 || c.draftingConeAngle >= 180),
    why: 'it must be above 0 and below 180 degrees',
  },
  { keys: ['draftingBoost'], ok: (c) => !(c.draftingBoost < 1), why: 'it must be at least 1' },
  {
    keys: ['runoutZone'],
    ok: (c) => !(c.runoutZone < 0 || c.runoutZone > 0.2),
    why: 'it must be between 0 and 0.2',
  },
  {
    keys: ['avoidanceWarmupMs'],
    ok: (c) => !(!isFinite(c.avoidanceWarmupMs) || c.avoidanceWarmupMs < 0),
    why: 'it must be a finite number of milliseconds and not negative',
  },
  {
    keys: ['lateralDamping'],
    ok: (c) => !(c.lateralDamping <= 0 || c.lateralDamping >= 1),
    why: 'it must be strictly between 0 and 1',
  },
  {
    keys: ['speedMatchMinDifferential'],
    ok: (c) => !(c.speedMatchMinDifferential <= 0),
    why: 'it must be above 0',
  },
  {
    keys: ['speedMatchSafetyMargin'],
    ok: (c) => !(c.speedMatchSafetyMargin <= 0 || c.speedMatchSafetyMargin >= 1),
    why: 'it must be strictly between 0 and 1',
  },
  {
    keys: ['brakeHoldTimeoutFrames'],
    ok: (c) => !!(c.brakeHoldTimeoutFrames > 0),
    why: 'it must be above 0 frames',
  },
  {
    keys: ['brakeHoldEscapeReleaseDurationFrames'],
    ok: (c) => !!(c.brakeHoldEscapeReleaseDurationFrames > 0),
    why: 'it must be above 0 frames',
  },
  {
    keys: ['brakeHoldEscapeCooldownFrames'],
    ok: (c) => !!(c.brakeHoldEscapeCooldownFrames > 0),
    why: 'it must be above 0 frames',
  },
  {
    keys: ['brakeReleaseDebounceFrames'],
    ok: (c) => !!(c.brakeReleaseDebounceFrames > 0),
    why: 'it must be above 0 frames',
  },
  // Layer 1 (Soft Steering): positive-float guards. Lenient by design - clearancePct and
  // hysteresisY default to 0.0, so they allow 0; strength must be > 0.
  {
    keys: ['softSteeringStrength'],
    ok: (c) => !(!isFinite(c.softSteeringStrength) || c.softSteeringStrength <= 0),
    why: 'it must be a finite number above 0',
  },
  {
    keys: ['softSteeringClearancePct'],
    ok: (c) => !(!isFinite(c.softSteeringClearancePct) || c.softSteeringClearancePct < 0),
    why: 'it must be a finite number and not negative',
  },
  {
    keys: ['softSteeringHysteresisY'],
    ok: (c) => !(!isFinite(c.softSteeringHysteresisY) || c.softSteeringHysteresisY < 0),
    why: 'it must be a finite number and not negative',
  },
  {
    keys: ['lookBeforeBrakePassStrength'],
    ok: (c) => !(!isFinite(c.lookBeforeBrakePassStrength) || c.lookBeforeBrakePassStrength <= 0),
    why: 'it must be a finite number above 0',
  },
  {
    keys: ['lookBeforeBrakeReengageTMultiplier'],
    ok: (c) =>
      !(
        !isFinite(c.lookBeforeBrakeReengageTMultiplier) || c.lookBeforeBrakeReengageTMultiplier < 1
      ),
    why: 'it must be a finite number of at least 1 - a margin below the touching distance would drop the brake past contact',
  },
  {
    keys: ['lookBeforeBrakeReengageTMultiplier', 'speedBrakeTMultiplier'],
    ok: (c) => !(c.lookBeforeBrakeReengageTMultiplier >= c.speedBrakeTMultiplier),
    why: 'the re-engage margin must stay below the brake-zone multiplier, else no pass window exists',
  },
  // lookBeforeBrakeLagFrames: whole frames of worst-case closing reserved for the one-frame
  // brake-application lag; at least 1 (the lag frame itself).
  {
    keys: ['lookBeforeBrakeLagFrames'],
    ok: (c) => !(!isFinite(c.lookBeforeBrakeLagFrames) || c.lookBeforeBrakeLagFrames < 1),
    why: 'it must be a finite number of at least 1 frame',
  },
  // lookBeforeBrakeMinDifferential: dedicated real-overtake bar for the LBB pass path; must be > 0
  // (the same positivity guard as speedMatchMinDifferential).
  {
    keys: ['lookBeforeBrakeMinDifferential'],
    ok: (c) =>
      !(!isFinite(c.lookBeforeBrakeMinDifferential) || c.lookBeforeBrakeMinDifferential <= 0),
    why: 'it must be a finite number above 0',
  },
];

export function loadRaceBehaviorConfig() {
  pruneStoredRaceBehaviorConfig();
  const merged = resolveFromDefaults(
    storageGet(KEYS.RACE_BEHAVIOR_CONFIG),
    DEFAULT_RACE_BEHAVIOR_CONFIG
  );
  // Migrate: if the stored spread is the old default, silently upgrade it. STILL NEEDED — this is a
  // VALUE migration, and 0.7 is a legitimate stored value the resolver has no opinion about.
  if (merged.startSpreadRange === LEGACY_START_SPREAD_DEFAULT) {
    merged.startSpreadRange = DEFAULT_RACE_BEHAVIOR_CONFIG.startSpreadRange;
  }
  // CONFIG-DIFF-2 REMOVED the speedBrakeTThreshold -> speedBrakeTMultiplier migration that sat here.
  // It is not lost, it is SUBSUMED: it deleted a retired key from the spread-merged object and then
  // supplied the new key's default when the old one had been stored. The resolver now walks the
  // DEFAULT keys, so a retired stored key never enters the object at all and an absent new key is
  // already its default. Both halves are structural now, and a hand-maintained list of renamed keys
  // is exactly what this block exists to stop accumulating.
  const { config, rejected, storeDefects } = applyKeyRules(
    merged,
    DEFAULT_RACE_BEHAVIOR_CONFIG,
    RACE_BEHAVIOR_RULES
  );
  reportRejectedKeys(KEYS.RACE_BEHAVIOR_CONFIG, rejected);
  reportStoreDefects(KEYS.RACE_BEHAVIOR_CONFIG, storeDefects);
  return config;
}

/**
 * CONFIG-DIFF-2: the one-time prune of the stored config — drop every key equal to its current
 * default, so an untouched key goes back to following the default. Idempotent and write-free when
 * there is nothing to drop.
 */
export function pruneStoredRaceBehaviorConfig() {
  const { pruned, changed } = pruneStored(
    storageGet(KEYS.RACE_BEHAVIOR_CONFIG),
    DEFAULT_RACE_BEHAVIOR_CONFIG
  );
  if (changed) storageSet(KEYS.RACE_BEHAVIOR_CONFIG, pruned);
  return changed;
}

export function saveRaceBehaviorConfig(config) {
  return storageSet(
    KEYS.RACE_BEHAVIOR_CONFIG,
    diffFromDefaults(config, DEFAULT_RACE_BEHAVIOR_CONFIG)
  );
}
