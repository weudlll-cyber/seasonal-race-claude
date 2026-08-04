// ============================================================
// File:        renderState.js
// Path:        client/src/screens/RaceScreen/renderState.js
// Project:     RaceArena — RENDER-FINGERPRINT-1
//
// WHAT THIS IS FOR: the fields the RENDER layer adds on top of the physics state, and the one rule
// that drives a purely visual one. `stepRacePhysics` owns racers, finishT, laps and the clock; this
// owns what the picture needs and physics has no opinion about.
//
// WHY IT IS A FILE. `scripts/render-fingerprint.mjs` has to produce a state the renderer will
// accept. If it built one itself, the harness and the component would each have their own idea of
// what a frame's state is, and the instrument would drift from the thing it measures — quietly,
// because a missing field reads as `undefined` and most of them are falsy-tolerant. One definition,
// used by both.
// ============================================================

import { PHASE } from './racePhase.js';

/**
 * Attach the render/phase fields to an extracted physics state, in place.
 * One object, so `stepRacePhysics` and the renderer share it.
 * @param {object} raceState  the state from createRaceFromIdentity
 * @returns {object} the same object
 */
export function attachRenderState(raceState) {
  return Object.assign(raceState, {
    phase: PHASE.COUNTDOWN,
    countdownStart: null,
    raceStart: null,
    lastTs: null,
    physicsAccum: 0,
    smoothDt: 16,
    slowmoFadeProgress: 0,
    slowmoActive: false,
    slowmoStartWallTs: 0,
    // 15a-predictive: PHOTO_FINISH slowmo (releases without min-duration)
    slowmoIsPhotoFinish: false,
    slowmoTs: null,
    focusFadeProgress: 0,
    dustParticles: [],
    burstParticles: [],
    finalLapStartTs: null,
  });
}

/**
 * Advance the BATTLE focus fade — the ramp that dims everyone outside the battle group.
 *
 * It shares the slow-motion fade's duration deliberately: the darkening and the slow-down are one
 * dramatic gesture, and two independent ramps would let them drift apart on screen.
 *
 * @param {object} st            render state (mutated)
 * @param {boolean} isBattleZoom is the camera on a battle this frame
 * @param {number} rawDt         this frame's duration in ms
 * @param {number} fadeDurationMs
 */
export function stepFocusFade(st, isBattleZoom, rawDt, fadeDurationMs) {
  const step = fadeDurationMs > 0 ? rawDt / fadeDurationMs : Infinity;
  st.focusFadeProgress = isBattleZoom
    ? Math.min(1, st.focusFadeProgress + step)
    : Math.max(0, st.focusFadeProgress - step);
}

/**
 * The per-racer colours, in assignment order. They are a RENDER identity, not a physics one — the
 * race does not know a racer has a colour.
 */
export const RACER_COLORS = Object.freeze([
  '#ff6b35',
  '#4fc3f7',
  '#a5d6a7',
  '#ffcc02',
  '#ce93d8',
  '#f48fb1',
  '#80cbc4',
  '#ffab40',
  '#90caf9',
  '#ef9a9a',
]);

/**
 * Attach the per-racer fields the DRAWING reads and physics does not produce: the colour, the trail
 * buffer, and the surface-particle buffer. Everything else a racer is drawn from (position, angle,
 * name, index) comes from the race itself.
 *
 * The component adds three more on top that are outside this: `icon` and `coatId`/`patternId`, which
 * come from the roster rather than the race, and `surfaceEmitter`, which needs the racer type and
 * the track's surface classes. The render fingerprint therefore covers the drawing GIVEN an
 * identity assignment, not the assignment itself.
 */
export function attachRacerRenderState(racers) {
  for (let i = 0; i < racers.length; i++) {
    const r = racers[i];
    r.color = RACER_COLORS[i % RACER_COLORS.length];
    r.trail = [];
    r.surfaceParticles = [];
  }
  return racers;
}
