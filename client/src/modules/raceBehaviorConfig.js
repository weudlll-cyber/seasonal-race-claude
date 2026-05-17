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

export { DEFAULT_RACE_BEHAVIOR_CONFIG };

// ── Start-phase brake ramp ─────────────────────────────────────────────────────

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

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
  const stored = storageGet(KEYS.RACE_BEHAVIOR_CONFIG);
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_RACE_BEHAVIOR_CONFIG };
  const merged = { ...DEFAULT_RACE_BEHAVIOR_CONFIG, ...stored };
  // Migrate: if the stored spread is the old default, silently upgrade it
  if (merged.startSpreadRange === LEGACY_START_SPREAD_DEFAULT) {
    merged.startSpreadRange = DEFAULT_RACE_BEHAVIOR_CONFIG.startSpreadRange;
  }
  if (
    merged.startSpreadRange <= 0 ||
    merged.startSpreadRange > 1 ||
    merged.homeForceStrength <= 0 ||
    merged.homeForceReductionOnOverlap < 0 ||
    merged.homeForceReductionOnOverlap > 1 ||
    merged.comfortThreshold <= 0 ||
    merged.comfortThreshold >= 1 ||
    merged.softRepulsionStrength <= 0 ||
    merged.avoidanceDistance <= 0 ||
    merged.tWeight <= 0 ||
    merged.yWeight <= 0 ||
    merged.lateralForce <= 0 ||
    merged.maxLateral <= 0 ||
    merged.speedBrakeYThreshold <= 0 ||
    merged.speedBrakeTThreshold <= 0 ||
    merged.speedBrakeFactor <= 0 ||
    merged.speedBrakeFactor > 1 ||
    merged.draftingMaxDistance <= 0 ||
    merged.draftingConeAngle <= 0 ||
    merged.draftingConeAngle >= 180 ||
    merged.draftingBoost < 1 ||
    merged.runoutZone < 0 ||
    merged.runoutZone > 0.2 ||
    !isFinite(merged.avoidanceWarmupMs) ||
    merged.avoidanceWarmupMs < 0
  ) {
    return { ...DEFAULT_RACE_BEHAVIOR_CONFIG };
  }
  return merged;
}

export function saveRaceBehaviorConfig(config) {
  return storageSet(KEYS.RACE_BEHAVIOR_CONFIG, config);
}
