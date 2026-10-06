// ============================================================
// File:        quickTestRace.js
// Path:        client/src/screens/SetupScreen/quickTestRace.js
// Project:     RaceArena — PARTICLES-VISIBILITY-12
// Description: The race a Quick Test starts, built from a track, its field and its racer type.
//              Moved out of SetupScreen.jsx `handleQuickTest` unchanged, so the Track Editor's
//              test race starts the SAME race by the same code — one builder, two callers, no
//              second copy of the race's inputs. Setup keeps everything that is Setup's own: the
//              geometry and capacity refusals, the racer-type selector and the name filling.
// ============================================================

import {
  deriveRaceDuration,
  paceSpeedPxPerSec,
  trackDefaultLaps,
  trackDefaultSeconds,
} from '../../modules/durationModel.js';
import { getRacerType } from '../../racer-types/index.js';
import { normalizeRaceActionStage } from '../../modules/raceActionStage.js';
import { RACE_SOURCE } from '../../../../shared/raceSource.mjs';

/**
 * The `activeRace` payload of a Quick Test — the track's own canonical defaults.
 *
 * @param {object} p
 * @param {object} p.track                the server track (id, name, geometryId, world size, …)
 * @param {object} p.geom                 its geometry (`getTrack(track.geometryId)`)
 * @param {Array<{name:string}>} p.racers the field, in order
 * @param {string} p.racerTypeId          the type this race runs
 * @param {object} p.raceDefaults         the host's race defaults (KEYS.RACE_DEFAULTS)
 * @param {number} p.normalSpeedPxPerSec  `normalSpeedFrom(loadBaseSpeedConfig())`
 * @param {number} p.runoutZone           `loadRaceBehaviorConfig().runoutZone`
 * @param {number} p.racePlanMinDur       `loadRaceDynamicsConfig().racePlanMinDurationSec`
 * @param {number} p.racePlanSeed         the seed, already resolved
 * @returns {object} the race, ready for `sessionStorage.activeRace`
 */
export function buildQuickTestRace({
  track,
  geom,
  racers,
  racerTypeId,
  raceDefaults,
  normalSpeedPxPerSec,
  runoutZone,
  racePlanMinDur,
  racePlanSeed,
}) {
  const quickIsOpen = !geom.closed;
  // Quick Test runs the track's own canonical defaults: its lap count (closed) or its
  // clamped default seconds (open) — the same inputs the sim CLI takes, so any Quick-Test
  // race is expressible as a sim invocation.
  const quickPathLengthPx = geom?.pathLengthPx ?? 0;
  const quickLaps = trackDefaultLaps(track);
  // The default seconds are clamped at THIS race's pace, so the Quick-Test type's own
  // multiplier decides the ceiling — not the track's default type.
  const quickSpeedMultiplier = getRacerType(racerTypeId)?.getSpeedMultiplier() ?? 1.0;
  const quickSeconds = trackDefaultSeconds(
    track,
    quickPathLengthPx,
    paceSpeedPxPerSec(normalSpeedPxPerSec, quickSpeedMultiplier),
    runoutZone
  );
  const quickModel = deriveRaceDuration({
    isOpen: quickIsOpen,
    pathLengthPx: quickPathLengthPx,
    laps: quickLaps,
    requestedSeconds: quickSeconds,
    normalSpeedPxPerSec,
    speedMultiplier: quickSpeedMultiplier,
    runoutZone,
  });
  const quickRealizedDurationSec = quickModel.realizedDurationSec;
  return {
    racers,
    trackId: track.id,
    trackName: track.name,
    geometryId: track.geometryId ?? null,
    racerTypeId,
    worldWidth: track.worldWidth ?? 1280,
    worldHeight: track.worldHeight ?? 720,
    duration: raceDefaults.duration,
    eventName: 'Quick Test',
    raceMode: quickIsOpen ? 'time' : 'laps',
    targetLaps: quickIsOpen ? undefined : quickLaps,
    targetDurationSec: quickIsOpen ? quickSeconds : undefined,
    realizedDurationSec: quickRealizedDurationSec,
    paceScale: quickModel.paceScale,
    trackSurfaceClasses: track.surfaceClasses ?? [],
    racePlanEnabled: quickRealizedDurationSec >= racePlanMinDur,
    // The caller draws it (resolveQuickTestSeed), once, BEFORE the race starts — the race itself is
    // then a pure function of it (RaceScreen seeds Math.random from this value). A drawn seed is not
    // written back into Setup's field, so the next Quick-Test draws a fresh one.
    racePlanSeed,
    // RACE-ACTION-CONTROL-1 — the same stage the normal path carries. Quick Test is the harness
    // path the camera-replay tool records against, so leaving it out would make a Quick-Test
    // recording silently un-replayable the moment the host is on a non-quiet stage.
    raceActionStage: normalizeRaceActionStage(raceDefaults.raceActionStage),
    // ★★ RACE-SOURCE-1 — THE ONE WRITER THAT IS NOT A REAL RACE. A period evaluation must not
    // count these, and this field is the only thing that will ever say so: `eventName` below is
    // 'Quick Test' by default but is not evidence, because the ordinary path takes that text from
    // the host and he can type the same words.
    raceSource: RACE_SOURCE.QUICK_TEST,
    timestamp: new Date().toISOString(),
  };
}
