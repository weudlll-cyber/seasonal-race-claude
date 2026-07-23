// ============================================================
// File:        lapUtils.js
// Path:        client/src/modules/camera/lapUtils.js
// Project:     RaceArena
// Created:     2026-04-22
// Description: Lap bookkeeping for multi-lap races, plus the physics frame reference.
//
// The speed/duration derivations that used to live here — lapsFromDuration,
// estimatedSecondsPerLap, computeSpeedScaleFactor (open, length/2000 with a hidden
// 0.5 clamp), computeClosedTrackSsf (closed, length/3200), estimateClosedTrackDurationSec
// and openTrackDurationRange — were DELETED at the speed/duration ship. There is now
// exactly one speed normalisation and one duration derivation, in
// client/src/modules/durationModel.js, shared verbatim by the browser and the sims.
// ============================================================

export const REFERENCE_FPS = 62.5; // 1000 / 16ms reference frame

// Overall progress 0..1 across all laps (t accumulates past 1 each lap)
export function lapProgress(t, maxLaps) {
  return Math.min(t / maxLaps, 1);
}

// Current lap number (1-indexed), capped at maxLaps
export function currentLap(t, maxLaps) {
  return Math.min(Math.floor(t) + 1, maxLaps);
}
