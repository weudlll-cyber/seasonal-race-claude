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

// Internal ssf computation for openTrackDurationRange — not a public API.
// Hardcoded constants match the former DEFAULT_SPEED_SCALE_CONFIG values.
const _REFERENCE_PATH_LENGTH = 2000;
const _MIN_SCALE = 0.5;
const _MAX_SCALE = 10.0;
function _computeSpeedScaleFactor(pathLengthPx) {
  if (!pathLengthPx || pathLengthPx <= 0) return 1;
  const raw = pathLengthPx / _REFERENCE_PATH_LENGTH;
  return Math.max(_MIN_SCALE, Math.min(_MAX_SCALE, raw));
}

/**
 * Reference path length for closed tracks.
 * Median of the five standard closed tracks: Dirt Oval (3245), City Circuit (3093),
 * Garden Path (2506), Ice Track (3037), plus headroom for larger custom tracks.
 * Used by computeClosedTrackSsf to normalize race_baseSpeed so all closed tracks
 * produce comparable physical traversal speeds regardless of path length.
 */
export const REFERENCE_CLOSED_PATH_PX = 3200;

const OPEN_TRACK_DURATION_MIN = 30;

/**
 * Speed scale factor for an open track: longer tracks scale the t-space speed
 * down so all tracks have comparable physical traversal times.
 * ssf = clamp(pathLengthPx / REFERENCE_PATH_LENGTH, 0.5, 10)
 *
 * Used by openTrackDurationRange (slider max) and the race engine (dynamic finishT).
 *
 * @param {number} pathLengthPx
 * @returns {number}
 */
export function computeSpeedScaleFactor(pathLengthPx) {
  return _computeSpeedScaleFactor(pathLengthPx);
}

/**
 * Speed scale factor for a closed track: longer paths scale race_baseSpeed down
 * so all closed tracks produce comparable on-screen traversal speeds.
 * closedSsf = pathLengthPx / REFERENCE_CLOSED_PATH_PX
 *
 * Applied as a multiplier to the targetDuration in computeRaceBaseSpeed, matching
 * the open-track ssf pattern. Standard closed tracks (~3000–3300 px) are within
 * ±3% of 1.0; larger tracks (e.g. Searound at 5147 px) are scaled down proportionally.
 *
 * @param {number} pathLengthPx
 * @returns {number}
 */
export function computeClosedTrackSsf(pathLengthPx) {
  if (!pathLengthPx || pathLengthPx <= 0) return 1;
  return pathLengthPx / REFERENCE_CLOSED_PATH_PX;
}

/**
 * Realized median-racer wall-clock duration for a CLOSED-track race, in seconds.
 *
 * The engine feeds a NOMINAL targetDuration (= estimatedSecondsPerLap × laps, length-blind) and
 * then scales the realized pace by ems (N-calibrated expected-min spread) and closedSsf (path
 * length). So the actual race lasts nominalTargetDur × ems × closedSsf — which, after the closed-
 * track world expansion (closedSsf ≈ 1.9–2.0), is ~2× the nominal. This helper reproduces that
 * realized duration for the setup DISPLAY and racePlanEnabled gate ONLY; it does NOT change the
 * engine inputs (estimatedSecondsPerLap stays the nominal targetDuration). Validated against
 * runSingleRace within <1% (city-circuit 51.5s, dirt-oval 58.5s, ice-track 49.3s).
 *
 * @param {number} laps
 * @param {number} pathLengthPx
 * @param {number} [speedMultiplier=1.0]
 * @param {number} [nRacers=40]
 * @param {object} [baseSpeedConfig=DEFAULT_BASE_SPEED_CONFIG]
 * @returns {number} realized wall-clock seconds for the median racer
 */
export function estimateClosedTrackDurationSec(
  laps,
  pathLengthPx,
  speedMultiplier = 1.0,
  nRacers = 40,
  baseSpeedConfig = DEFAULT_BASE_SPEED_CONFIG
) {
  const baseSpeedMean = (baseSpeedConfig.min + baseSpeedConfig.max) / 2;
  // Nominal targetDuration the engine receives (length-blind): estimatedSecondsPerLap × laps.
  const nominalTargetDur = laps / (baseSpeedMean * speedMultiplier * REFERENCE_FPS);
  // N-calibrated expected-minimum spread factor (mirrors RaceScreen/index.jsx term-for-term).
  const spreadMin = baseSpeedConfig.min / baseSpeedMean;
  const spreadMax = baseSpeedConfig.max / baseSpeedMean;
  const ems = spreadMin + (spreadMax - spreadMin) / (nRacers + 1);
  return nominalTargetDur * ems * computeClosedTrackSsf(pathLengthPx);
}

// Slider range [min, max] for the open-track duration picker.
// max = natural traversal time of the track given its path length and mean base speed,
// accounting for runoutZone.
export function openTrackDurationRange(
  pathLengthPx,
  baseSpeedConfig = DEFAULT_BASE_SPEED_CONFIG,
  speedMultiplier = 1.0,
  runoutZone = 0.05
) {
  const ssf = _computeSpeedScaleFactor(pathLengthPx);
  const baseSpeedMean = (baseSpeedConfig.min + baseSpeedConfig.max) / 2;
  const naturalSeconds =
    (ssf * (1 - runoutZone)) / (baseSpeedMean * speedMultiplier * REFERENCE_FPS);
  const max = Math.max(OPEN_TRACK_DURATION_MIN, Math.round(naturalSeconds));
  return { min: OPEN_TRACK_DURATION_MIN, max };
}
