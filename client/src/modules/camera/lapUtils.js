// ============================================================
// File:        lapUtils.js
// Path:        client/src/modules/camera/lapUtils.js
// Project:     RaceArena
// Created:     2026-04-22
// Description: Testable utility functions for multi-lap race logic and speed estimation
// ============================================================

// Race physics constants (mirror RaceScreen baseSpeed range)
export const BASE_SPEED_MIN = 0.00085;
export const BASE_SPEED_MAX = 0.0012;
export const BASE_SPEED_MEAN = (BASE_SPEED_MIN + BASE_SPEED_MAX) / 2; // 0.001025
export const REFERENCE_FPS = 62.5; // 1000 / 16ms reference frame

// Number of laps for a closed-track race based on configured duration
export function lapsFromDuration(seconds) {
  if (seconds >= 120) return 4;
  if (seconds >= 90) return 3;
  if (seconds >= 60) return 2;
  return 1;
}

// Overall progress 0..1 across all laps (t accumulates past 1 each lap)
export function lapProgress(t, maxLaps) {
  return Math.min(t / maxLaps, 1);
}

// Current lap number (1-indexed), capped at maxLaps
export function currentLap(t, maxLaps) {
  return Math.min(Math.floor(t) + 1, maxLaps);
}

// Estimated seconds for an average racer to complete one t=0..1 traverse (one lap equivalent)
export function estimatedSecondsPerLap(speedMultiplier) {
  return 1 / (BASE_SPEED_MEAN * speedMultiplier * REFERENCE_FPS);
}

// Finish-line position (0..1) on an open track so the fastest racer crosses it in targetSeconds
export function openTrackFinishT(targetSeconds, speedMultiplier) {
  return Math.min(1, BASE_SPEED_MAX * speedMultiplier * REFERENCE_FPS * targetSeconds);
}
