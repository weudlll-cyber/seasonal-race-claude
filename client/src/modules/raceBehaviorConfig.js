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
  if (
    merged.startSpreadRange <= 0 ||
    merged.startSpreadRange > 1 ||
    merged.comfortThreshold <= 0 ||
    merged.comfortThreshold >= 1 ||
    merged.softRepulsionStrength <= 0 ||
    merged.lateralForce <= 0 ||
    merged.maxLateral <= 0 ||
    merged.speedBrakeYThreshold <= 0 ||
    merged.speedBrakeTMultiplier <= 0 ||
    merged.speedBrakeFactor <= 0 ||
    merged.speedBrakeFactor > 1 ||
    merged.draftingMaxDistance <= 0 ||
    merged.draftingConeAngle <= 0 ||
    merged.draftingConeAngle >= 180 ||
    merged.draftingBoost < 1 ||
    merged.runoutZone < 0 ||
    merged.runoutZone > 0.2 ||
    !isFinite(merged.avoidanceWarmupMs) ||
    merged.avoidanceWarmupMs < 0 ||
    merged.lateralDamping <= 0 ||
    merged.lateralDamping >= 1 ||
    merged.speedMatchMinDifferential <= 0 ||
    merged.speedMatchSafetyMargin <= 0 ||
    merged.speedMatchSafetyMargin >= 1 ||
    !(merged.brakeHoldTimeoutFrames > 0) ||
    !(merged.brakeHoldEscapeReleaseDurationFrames > 0) ||
    !(merged.brakeHoldEscapeCooldownFrames > 0) ||
    !(merged.brakeReleaseDebounceFrames > 0) ||
    // Layer 1 (Soft Steering): positive-float guards. Lenient by design —
    // clearancePct and hysteresisY default to 0.0, so they allow 0; strength must be > 0.
    !isFinite(merged.softSteeringStrength) ||
    merged.softSteeringStrength <= 0 ||
    !isFinite(merged.softSteeringClearancePct) ||
    merged.softSteeringClearancePct < 0 ||
    !isFinite(merged.softSteeringHysteresisY) ||
    merged.softSteeringHysteresisY < 0 ||
    // Look-before-brake: pass strength must be > 0; re-engage margin must be ≥ 1 (a
    // margin below the touching distance would drop the brake past contact) and < the
    // brake-zone multiplier (else no pass window exists).
    !isFinite(merged.lookBeforeBrakePassStrength) ||
    merged.lookBeforeBrakePassStrength <= 0 ||
    !isFinite(merged.lookBeforeBrakeReengageTMultiplier) ||
    merged.lookBeforeBrakeReengageTMultiplier < 1 ||
    merged.lookBeforeBrakeReengageTMultiplier >= merged.speedBrakeTMultiplier ||
    // lookBeforeBrakeLagFrames: whole frames of worst-case closing reserved for the
    // one-frame brake-application lag; ≥ 1 (at least the lag frame itself).
    !isFinite(merged.lookBeforeBrakeLagFrames) ||
    merged.lookBeforeBrakeLagFrames < 1 ||
    // lookBeforeBrakeMinDifferential: dedicated real-overtake bar for the LBB pass path;
    // must be > 0 (same positivity guard as speedMatchMinDifferential).
    !isFinite(merged.lookBeforeBrakeMinDifferential) ||
    merged.lookBeforeBrakeMinDifferential <= 0
  ) {
    return { ...DEFAULT_RACE_BEHAVIOR_CONFIG };
  }
  return merged;
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
