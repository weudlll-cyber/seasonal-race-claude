// ============================================================
// File:        trackScene.js
// Path:        client/src/screens/RaceScreen/trackScene.js
// Project:     RaceArena — P4-RACESCREEN-SPLIT-1
// Description: The track's static scene, prepared once at race start: the cached track-light
//              positions and their config, and the track-effect instances (from the stored track,
//              or from a Track Editor test race's unsaved effects).
//
// WHAT IT OWNS AND WHY IT IS ITS OWN MODULE. "Effect instantiation" is the third concern DC2 arc 4
// named when it proposed splitting RaceScreen (P4). Both halves here read the GEOMETRY and the race
// payload and build render-only objects the frame loop then consumes; neither touches React,
// physics or the camera. They sat in RaceScreen's init effect between the shape and the racer
// type. The ref that HOLDS the effects (`effectsRef`) and the cleanup that destroys them stay in
// RaceScreen — the component owns their lifetime; this only creates them.
//
// MOVED VERBATIM (P4-RACESCREEN-SPLIT-1): the same 800-sample edge read, the same spacing, the same
// default lights, the same effect source choice and the same `create(canvas, config, effectWorld)`
// call. `shapeRef.current` arrives as `shape`. The comments are the ones that sat beside this code
// in RaceScreen.
// ============================================================

import { getEffect } from '../../modules/track-effects/index.js';
import { extractEffects } from '../TrackEditor/trackEditorSave.js';
import {
  DEFAULT_TRACK_LIGHTS,
  LIGHT_SPACING_PX,
  sampleBoundaryAtInterval,
} from '../../modules/trackLights.js';

/**
 * The track lights for this race, computed once (not per frame).
 *
 * @param {object} shape     the track's EditorShape
 * @param {object} geometry  the stored track geometry (`trackLights`)
 * @returns {{ cachedLightPts: { outer: object[], inner: object[] }, trackLightsConfig: object }}
 */
export function cacheTrackLights(shape, geometry) {
  // Cache track-light positions once at race init (not per frame).
  // 800 samples gives ~18 px/sample on a 15 000 px track — accurate enough
  // for sampleBoundaryAtInterval to place lights at the target 30 px spacing.
  const { outer: edgeOuter, inner: edgeInner } = shape.getEdgePoints(800);
  const cachedLightPts = {
    outer: sampleBoundaryAtInterval(edgeOuter, LIGHT_SPACING_PX),
    inner: sampleBoundaryAtInterval(edgeInner, LIGHT_SPACING_PX),
  };
  const trackLightsConfig = geometry.trackLights ?? DEFAULT_TRACK_LIGHTS;
  return { cachedLightPts, trackLightsConfig };
}

/**
 * Instantiate the race's track effects.
 *
 * @param {HTMLCanvasElement} canvas  the race canvas
 * @param {object} raceData           the race payload (`testRace.effects` for a Track Editor test race)
 * @param {object} geometry           the stored track geometry
 * @param {number} worldWidth
 * @param {number} worldHeight
 * @returns {object[]} the effect instances (`update`, `destroy`, …)
 */
export function createTrackEffects(canvas, raceData, geometry, worldWidth, worldHeight) {
  // PARTICLES-VISIBILITY-2: track effects are drawn INSIDE the world transform (renderRaceFrame.js),
  // so the world size goes in as `create`'s third argument and every effect places its content over
  // the whole track. Passing the canvas alone put everything in a canvas-sized corner of the world.
  const effectWorld = { width: worldWidth, height: worldHeight };
  // PARTICLES-VISIBILITY-12: a test race from the Track Editor carries the editor's UNSAVED effects
  // in its payload (`raceData.testRace.effects`), so they are raced without being stored anywhere;
  // every other race reads the stored track's effects, as before.
  return extractEffects(raceData.testRace ? { effects: raceData.testRace.effects } : geometry)
    .map(({ id, config }) => {
      const manifest = getEffect(id);
      return manifest ? manifest.create(canvas, config, effectWorld) : null;
    })
    .filter(Boolean);
}
