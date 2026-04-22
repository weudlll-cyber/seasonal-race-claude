// ============================================================
// File:        lapUtils.js
// Path:        client/src/modules/camera/lapUtils.js
// Project:     RaceArena
// Created:     2026-04-22
// Description: Testable utility functions for multi-lap race logic
// ============================================================

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
