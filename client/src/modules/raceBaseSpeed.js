// ============================================================
// File:        raceBaseSpeed.js
// Path:        client/src/modules/raceBaseSpeed.js
// Project:     RaceArena
// Created:     2026-05-03
// Description: Duration-driven base speed for the race engine (PR-A2).
//              Replaces the speedScaleFactor architecture with a direct
//              finishT / targetDuration formula so the operator-chosen
//              race duration is the primary input.
// ============================================================

import { REFERENCE_FPS } from './camera/lapUtils.js';

/**
 * Computes the per-frame t-progress rate such that a racer with
 * speedMultiplier=1.0 and spreadFactor=1.0 reaches finishT in exactly
 * targetDurationSeconds.
 *
 * Individual racer:
 *   r.baseSpeed = computeRaceBaseSpeed(finishT, targetDuration)
 *                 * speedMultiplier
 *                 * spreadFactor   (= random[min,max] / BASE_SPEED_MEAN)
 *                 * (1 + speedBonus)
 *
 * @param {number} finishT               - Laps (closed) or 0..1 position (open)
 * @param {number} targetDurationSeconds - Desired duration for the median racer
 * @returns {number} t-progress per frame at REFERENCE_FPS
 */
export function computeRaceBaseSpeed(finishT, targetDurationSeconds) {
  if (!targetDurationSeconds || targetDurationSeconds <= 0) return 0;
  return finishT / (REFERENCE_FPS * targetDurationSeconds);
}
