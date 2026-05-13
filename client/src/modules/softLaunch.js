// ============================================================
// File:        softLaunch.js
// Path:        client/src/modules/softLaunch.js
// Project:     RaceArena
// Created:     2026-05-13
// Description: Soft-launch activation factor for progressive anti-collision.
// ============================================================

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

/**
 * Compute anti-collision activation for the current frame.
 * Countdown is always 0. During race start, the factor ramps to 1.
 *
 * @param {{
 *   isRacing: boolean,
 *   raceElapsedMs: number,
 *   enableSoftLaunch: boolean,
 *   softLaunchDurationSeconds: number,
 *   softLaunchRampMode: 'linear' | 'twoStep'
 * }} input
 * @returns {number} factor in [0, 1]
 */
export function computeSoftLaunchFactor(input) {
  const {
    isRacing,
    raceElapsedMs,
    enableSoftLaunch,
    softLaunchDurationSeconds,
    softLaunchRampMode,
  } = input;

  if (!isRacing) return 0;
  if (!enableSoftLaunch) return 1;

  const durationMs = Math.max(0, softLaunchDurationSeconds) * 1000;
  if (durationMs === 0) return 1;

  const progress = clamp01(raceElapsedMs / durationMs);

  if (softLaunchRampMode === 'twoStep') {
    if (progress <= 0) return 0;
    if (progress < 0.5) return 0.5;
    return 1;
  }

  return progress;
}
