// ============================================================
// File:        durationModel.js
// Path:        client/src/modules/durationModel.js
// Project:     RaceArena
// Created:     2026-07-23
// Description: THE canonical speed/duration derivation — ONE model, used verbatim
//              by the browser (RaceScreen/SetupScreen) and by the headless sims.
//
// THE MODEL
//   There is exactly ONE speed normalisation in the game: a fixed NORMAL TRACK SPEED
//   in world pixels per second (baseSpeedConfig.normalSpeedPxPerSec), identical for
//   every track and every racer class. A mean racer moves at that speed, full stop.
//
//   From it, everything else is a division:
//     meanTSpeed   = V / (pathLengthPx * REFERENCE_FPS)      [t per physics frame]
//     CLOSED  race: operator picks LAPS      -> finishT = laps
//                   duration is DERIVED      -> laps * pathLengthPx / V
//     OPEN    race: operator picks SECONDS   -> finishT = V * seconds / pathLengthPx,
//                   capped at (1 - runoutZone). Asking for more time than the track
//                   physically holds at normal speed is allowed and scales the pace
//                   of the WHOLE field down uniformly by `paceScale` so it fits.
//
//   One clock: `realizedDurationSec` is the single duration scalar. race_baseSpeed,
//   the re-roll schedule, the plan's targetDurationMs, the racePlanEnabled gate and
//   every phase/easing fraction key on it — on BOTH sides. The former nominal-vs-raw
//   split (browser paced from estimatedSecondsPerLap*laps, sim from raw durationSec)
//   does not exist in this model; there is nothing left to diverge.
//
// WHAT THIS REPLACED (all deleted at the speed/duration ship):
//   - computeSpeedScaleFactor + its hidden 0.5 _MIN_SCALE clamp (open, len/2000)
//   - computeClosedTrackSsf / REFERENCE_CLOSED_PATH_PX          (closed, len/3200)
//   - lapsFromDuration                                          (the laps staircase)
//   - estimateClosedTrackDurationSec / openTrackDurationRange   (display-only mirrors)
//   - the N-calibrated expected-minimum spread factor in the PACE. Pace is defined by
//     the MEAN racer; the spread only widens the finishing FIELD around it, and enters
//     the setup DISPLAY via fieldFinishWindow() rather than the engine input.
// ============================================================

import { computeRaceBaseSpeed } from './raceBaseSpeed.js';
import { DEFAULT_BASE_SPEED_CONFIG } from './storage/defaults.js';

/** Smallest race an operator can ask for on a closed track: one lap, whatever it lasts. */
export const MIN_LAPS = 1;

/** Floor for the open-track seconds picker (a race shorter than this is not a race). */
export const OPEN_TRACK_MIN_SECONDS = 10;

/**
 * The one normal track speed, in world px/s, read from the (DevScreen-adjustable) speed config.
 * Falls back to the shipped default for malformed/legacy stored configs.
 *
 * @param {object} [baseSpeedConfig=DEFAULT_BASE_SPEED_CONFIG]
 * @returns {number} px/s
 */
export function normalSpeedFrom(baseSpeedConfig = DEFAULT_BASE_SPEED_CONFIG) {
  const v = baseSpeedConfig?.normalSpeedPxPerSec;
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_BASE_SPEED_CONFIG.normalSpeedPxPerSec;
}

/**
 * Longest race an OPEN track can hold at normal speed: the time a mean racer needs to
 * reach the finish line at (1 - runoutZone). Times beyond this are still selectable —
 * they trigger the uniform slowdown (see deriveRaceDuration).
 *
 * @param {number} pathLengthPx
 * @param {number} normalSpeedPxPerSec
 * @param {number} [runoutZone=0.05]
 * @returns {number} seconds
 */
export function naturalMaxSeconds(pathLengthPx, normalSpeedPxPerSec, runoutZone = 0.05) {
  if (!(pathLengthPx > 0) || !(normalSpeedPxPerSec > 0)) return 0;
  return ((1 - runoutZone) * pathLengthPx) / normalSpeedPxPerSec;
}

/**
 * Derived duration of a CLOSED race: distance / speed, nothing else.
 *
 * @param {number} laps
 * @param {number} pathLengthPx
 * @param {number} normalSpeedPxPerSec
 * @returns {number} seconds for the mean racer
 */
export function secondsForLaps(laps, pathLengthPx, normalSpeedPxPerSec) {
  if (!(pathLengthPx > 0) || !(normalSpeedPxPerSec > 0)) return 0;
  return (laps * pathLengthPx) / normalSpeedPxPerSec;
}

/**
 * Inverse of secondsForLaps: the lap count whose derived duration is closest to `seconds`
 * on this track. This is the documented mapping the measurement protocol's fixed-seconds
 * scaling runs (30 / 60 / 120 / 300 s) use to reach a canonical closed-track race — it is
 * NOT a staircase constant, it is the model read backwards, so it tracks the normal speed.
 *
 * @param {number} seconds
 * @param {number} pathLengthPx
 * @param {number} normalSpeedPxPerSec
 * @returns {number} integer laps >= MIN_LAPS
 */
export function lapsForApproxSeconds(seconds, pathLengthPx, normalSpeedPxPerSec) {
  if (!(pathLengthPx > 0) || !(normalSpeedPxPerSec > 0)) return MIN_LAPS;
  return Math.max(MIN_LAPS, Math.round((seconds * normalSpeedPxPerSec) / pathLengthPx));
}

/**
 * THE canonical derivation. Both engines call this and use the returned scalars verbatim;
 * nothing downstream may re-derive a duration from anything else.
 *
 * @param {object}  p
 * @param {boolean} p.isOpen
 * @param {number}  p.pathLengthPx
 * @param {number}  [p.laps]              CLOSED: operator-chosen lap count (integer >= 1)
 * @param {number}  [p.requestedSeconds]  OPEN:   operator-chosen race time in seconds
 * @param {number}  p.normalSpeedPxPerSec
 * @param {number}  [p.speedMultiplier=1] racer-class factor — cancels out of the PACE by
 *                                        construction (one normal speed for all classes);
 *                                        it is divided out here and re-multiplied per racer.
 * @param {number}  [p.runoutZone=0.05]
 * @returns {{
 *   finishT: number,               // laps (closed) or 0..1 position (open)
 *   realizedDurationSec: number,   // THE clock — every duration-keyed term uses this
 *   raceBaseSpeed: number,         // engine input: r.baseSpeed = raceBaseSpeed * M * spreadFactor * bonus
 *   paceScale: number,             // 1 = normal speed; < 1 = uniform slowdown (open, over-long time)
 *   naturalMaxSec: number,         // open only: longest race at normal speed (0 for closed)
 *   slowdownActive: boolean,
 *   effectiveSpeedPxPerSec: number // V * paceScale — what a mean racer actually travels at
 * }}
 */
export function deriveRaceDuration({
  isOpen,
  pathLengthPx,
  laps,
  requestedSeconds,
  normalSpeedPxPerSec,
  speedMultiplier = 1.0,
  runoutZone = 0.05,
}) {
  const V = normalSpeedPxPerSec;
  const L = pathLengthPx;
  const EMPTY = {
    finishT: 0,
    realizedDurationSec: 0,
    raceBaseSpeed: 0,
    paceScale: 1,
    naturalMaxSec: 0,
    slowdownActive: false,
    effectiveSpeedPxPerSec: 0,
  };
  if (!(L > 0) || !(V > 0)) return EMPTY;

  let finishT;
  let paceScale = 1;
  let natMax = 0;

  if (isOpen) {
    const seconds = Math.max(0, requestedSeconds ?? 0);
    if (!(seconds > 0)) return EMPTY;
    natMax = naturalMaxSeconds(L, V, runoutZone);
    if (seconds <= natMax) {
      // In range: the finish line lands exactly where a mean racer is after `seconds`.
      finishT = (V * seconds) / L;
    } else {
      // Beyond the track's natural maximum: the finish line is pinned at the physical end
      // and the WHOLE field is slowed uniformly so the chosen time is what the race takes.
      finishT = 1 - runoutZone;
      paceScale = natMax / seconds;
    }
  } else {
    const n = Math.max(MIN_LAPS, Math.round(laps ?? MIN_LAPS));
    finishT = n;
  }

  const effectiveSpeedPxPerSec = V * paceScale;
  // One expression, one clock: time = distance / speed. For open in-range this returns the
  // requested seconds exactly; under slowdown it also returns the requested seconds (that is
  // what paceScale is for); for closed it is the derived laps * length / speed.
  const realizedDurationSec = (finishT * L) / effectiveSpeedPxPerSec;
  // speedMultiplier is divided out here and re-multiplied on every racer
  // (r.baseSpeed = raceBaseSpeed * M * spreadFactor), so the class cancels to M^0:
  // one normal speed for ALL classes, exactly as specified.
  const raceBaseSpeed = computeRaceBaseSpeed(finishT, realizedDurationSec * speedMultiplier);

  return {
    finishT,
    realizedDurationSec,
    raceBaseSpeed,
    paceScale,
    naturalMaxSec: natMax,
    slowdownActive: paceScale < 1,
    effectiveSpeedPxPerSec,
  };
}

/**
 * MIGRATION ONLY — the deleted `lapsFromDuration` staircase, preserved under a name that says
 * what it is. It maps a legacy per-track `defaultDuration` (seconds) to a default lap count so
 * tracks authored before the speed/duration ship keep their shipped intent. It is NOT part of
 * the live model: nothing in a running race calls it, and no new track should carry
 * `defaultDuration`. Seeded tracks have a baked `defaultLaps`; this is the fallback for
 * user-created tracks still in localStorage.
 *
 * @param {number} seconds
 * @returns {number} laps
 */
export function legacyLapsFromDefaultDuration(seconds) {
  if (seconds >= 120) return 4;
  if (seconds >= 90) return 3;
  if (seconds >= 60) return 2;
  return MIN_LAPS;
}

/**
 * The lap count a CLOSED track starts at in the setup UI.
 *
 * @param {object} track  track record (may carry defaultLaps, or a legacy defaultDuration)
 * @returns {number} integer laps >= MIN_LAPS
 */
export function trackDefaultLaps(track) {
  const laps = track?.defaultLaps;
  if (Number.isFinite(laps) && laps >= MIN_LAPS) return Math.round(laps);
  if (Number.isFinite(track?.defaultDuration)) {
    return legacyLapsFromDefaultDuration(track.defaultDuration);
  }
  return MIN_LAPS;
}

/**
 * The seconds an OPEN track starts at in the setup UI, CLAMPED to the track's natural maximum
 * at the current normal speed. Shipped defaults must never open into a slowdown warning; if the
 * owner later lowers the normal speed the clamp relaxes on its own, because it is evaluated
 * here rather than baked into the track record.
 *
 * @param {object} track
 * @param {number} pathLengthPx
 * @param {number} normalSpeedPxPerSec
 * @param {number} [runoutZone=0.05]
 * @returns {number} seconds
 */
export function trackDefaultSeconds(track, pathLengthPx, normalSpeedPxPerSec, runoutZone = 0.05) {
  const stored = Number.isFinite(track?.defaultDurationSec)
    ? track.defaultDurationSec
    : Number.isFinite(track?.defaultDuration)
      ? track.defaultDuration
      : 60;
  const natMax = naturalMaxSeconds(pathLengthPx, normalSpeedPxPerSec, runoutZone);
  if (!(natMax > 0)) return Math.max(OPEN_TRACK_MIN_SECONDS, Math.round(stored));
  return Math.max(OPEN_TRACK_MIN_SECONDS, Math.min(Math.round(stored), Math.floor(natMax)));
}

/**
 * Setup-display helper: where the FIELD lands around the mean racer's derived duration.
 * The pace is defined by the mean; the base-speed spread makes fast racers arrive earlier
 * and slow ones later. Expected extremes over n draws (order statistics of a uniform range).
 *
 * Display only — no engine term reads this.
 *
 * @param {number} realizedDurationSec  mean racer's derived duration
 * @param {number} nRacers
 * @param {object} [baseSpeedConfig=DEFAULT_BASE_SPEED_CONFIG]
 * @returns {{ medianSec: number, firstSec: number, lastSec: number }}
 */
export function fieldFinishWindow(
  realizedDurationSec,
  nRacers,
  baseSpeedConfig = DEFAULT_BASE_SPEED_CONFIG
) {
  const min = baseSpeedConfig?.min ?? DEFAULT_BASE_SPEED_CONFIG.min;
  const max = baseSpeedConfig?.max ?? DEFAULT_BASE_SPEED_CONFIG.max;
  const mean = (min + max) / 2;
  const n = Math.max(1, nRacers);
  const spreadMin = min / mean;
  const spreadMax = max / mean;
  // E[min] / E[max] of n uniform draws on [spreadMin, spreadMax].
  const expectedMin = spreadMin + (spreadMax - spreadMin) / (n + 1);
  const expectedMax = spreadMax - (spreadMax - spreadMin) / (n + 1);
  return {
    medianSec: realizedDurationSec,
    firstSec: realizedDurationSec / expectedMax,
    lastSec: realizedDurationSec / expectedMin,
  };
}
