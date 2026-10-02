// ============================================================
// File:        raceCamera.js
// Path:        client/src/screens/RaceScreen/raceCamera.js
// Project:     RaceArena — P4-RACESCREEN-SPLIT-1
// Description: The camera a browser race is filmed with, built and SEEDED once at race start: the
//              CameraDirector with the race's world and corridor width, its random seed derived
//              from the race seed, the viewer probe told which race it is watching, and the
//              director told whether the ceremony opens on a brand card.
//
// WHAT IT OWNS AND WHY IT IS ITS OWN MODULE. Camera seeding is one of the three concerns DC2 arc 4
// named when it proposed this split (P4: "camera seeding" beside the rAF loop and the ceremony),
// and it is the one whose ORDER matters to reproducibility: the seed must be set before the first
// frame asks the director for a shot, and it must be the one the marker records. Gathering the
// construction and the seeding into one function makes that sequence one call instead of thirty
// lines interleaved with React state resets in RaceScreen's init effect.
//
// WHAT STAYS IN RACESCREEN: the DECISION whether this race opens on a brand card (it reads the
// branding profile, which the director "cannot know"), the React state resets that go with it,
// and the live-truth console line, which reads the director RaceScreen stores.
//
// MOVED VERBATIM (P4-RACESCREEN-SPLIT-1): the same constructor arguments in the same order, the
// same seed derivation, the same probe payload, the same two setter calls in the same order.
// `shapeRef.current` arrives as `shape`, `raceData.trackId ?? null` as `trackId`, the racer count
// as `nRacers` (RaceScreen passes `raceState.racers.length`, the value the probe always read).
// The comments are the ones that sat beside this code in RaceScreen.
// ============================================================

import { CameraDirector } from '../../modules/camera/CameraDirector.js';
import { cameraSeedForRace } from '../../modules/camera/cameraSeed.js';
import { beginViewerProbe } from '../../modules/viewerProbe.js';

/**
 * Build and seed the race's CameraDirector.
 *
 * @param {object} p
 * @param {number} p.worldWidth
 * @param {number} p.worldHeight
 * @param {boolean} p.isOpenTrack
 * @param {object} p.cameraConfig          the race's camera config (frozen at mount)
 * @param {number} p.drawnBodyWidthRefPx   the body-size reference the engine was built with
 * @param {object} p.shape                 the track's EditorShape
 * @param {number} p.trackWidthPx          the corridor width
 * @param {number} p.racePlanSeed          the race seed
 * @param {string|null} p.trackId          the track id, for the viewer probe
 * @param {number} p.nRacers               the field size, for the viewer probe
 * @param {boolean} p.ceremonyBrandActive  whether the ceremony opens on a brand card
 * @returns {{ director: CameraDirector, cameraRandomSeed: number }}
 */
export function createRaceCamera({
  worldWidth,
  worldHeight,
  isOpenTrack,
  cameraConfig,
  drawnBodyWidthRefPx,
  shape,
  trackWidthPx,
  racePlanSeed,
  trackId,
  nRacers,
  ceremonyBrandActive,
}) {
  const director = new CameraDirector(
    worldWidth,
    worldHeight,
    isOpenTrack,
    cameraConfig,
    drawnBodyWidthRefPx,
    shape,
    // CAMERA-ZOOM-UNIT-1: the corridor width every zoom setting is expressed in — the SAME
    // number the physics uses (geometry.width, spline estimate only for tracks without one).
    trackWidthPx
  );
  // CAMERA-REPRO-1: the camera makes its OWN random draws (which state to cut to, when the next
  // OVERVIEW is due), and it needs a seed for them. That seed used to be DRAWN from Math.random
  // per race, which made a marked moment replayable but the same race seed irreproducible —
  // measured at 165 physics steps running a different state between two runs of race seed 9.
  // CAMERA-SEED-AND-LINE-1 derives it from the race's own seed instead; the marker still carries
  // the value, so every existing replay path is unchanged.
  // CAMERA-SEED-AND-LINE-1: DERIVED FROM THE RACE SEED, not drawn. Same race seed, same camera,
  // shot for shot — so a picture he reports can be stood in again. `cameraSeed.js` states the
  // trade and the unseeded case; `racePlanSeed` is bound in RaceScreen from `raceData`.
  const cameraRandomSeed = cameraSeedForRace(racePlanSeed);
  // VIEWER-INVARIANTS-1: the race's identity, echoed into every violation this run produces so an
  // event names the race it happened in. Inert unless ?viewerprobe=1.
  beginViewerProbe({
    track: trackId,
    seed: racePlanSeed,
    racers: nRacers,
    cameraSeed: cameraRandomSeed,
    trackWidthPx,
  });
  director.setRandomSeed(cameraRandomSeed);
  // CEREMONY-OPENING-1: the answer RaceScreen decided — the only thing the director is told about
  // branding, once, and every consumer of the schedule inherits it.
  director.setCeremonyBrandActive(ceremonyBrandActive);
  return { director, cameraRandomSeed };
}
