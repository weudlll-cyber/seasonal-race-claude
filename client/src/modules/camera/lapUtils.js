// ============================================================
// File:        lapUtils.js
// Path:        client/src/modules/camera/lapUtils.js
// Project:     RaceArena
// Created:     2026-04-22
// Description: Testable utility functions for multi-lap race logic and speed estimation
// ============================================================

import { DEFAULT_BASE_SPEED_CONFIG } from '../storage/defaults.js';

// Module-level defaults derived from config — single source of truth.
// Not exported: callers that need exact values should import DEFAULT_BASE_SPEED_CONFIG.
const _BASE_SPEED_MIN = DEFAULT_BASE_SPEED_CONFIG.min;
const _BASE_SPEED_MAX = DEFAULT_BASE_SPEED_CONFIG.max;
const _BASE_SPEED_MEAN = (_BASE_SPEED_MIN + _BASE_SPEED_MAX) / 2;

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
export function estimatedSecondsPerLap(speedMultiplier, baseSpeedMean = _BASE_SPEED_MEAN) {
  return 1 / (baseSpeedMean * speedMultiplier * REFERENCE_FPS);
}

// Finish-line position (0..1) on an open track so the fastest racer crosses it in targetSeconds.
// Pass baseSpeedMax explicitly when the live config value matters (e.g. RaceScreen at race start).
// Default uses DEFAULT_BASE_SPEED_CONFIG.max so SetupScreen previews stay consistent with defaults.
export function openTrackFinishT(targetSeconds, speedMultiplier, baseSpeedMax = _BASE_SPEED_MAX) {
  return Math.min(1, baseSpeedMax * speedMultiplier * REFERENCE_FPS * targetSeconds);
}
