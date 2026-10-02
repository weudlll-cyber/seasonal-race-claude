// ============================================================
// File:        battleSlowmo.js
// Path:        client/src/screens/RaceScreen/battleSlowmo.js
// Project:     RaceArena — P4-RACESCREEN-SPLIT-1
// Description: The slow-motion clock RaceScreen runs during BATTLE_ZOOM and PHOTO_FINISH: when it
//              engages and releases, its fade in and out, the BATTLE focus fade that shares its
//              duration, and the slowed wall clock (`st.slowmoTs`). Returns the factor this frame's
//              wall time is scaled by before it enters the physics accumulator.
//
// WHAT IT OWNS AND WHY IT IS ITS OWN MODULE. This was the first half of a 50-line block in
// RaceScreen's RACING branch whose second half is the fixed-timestep accumulator. The two are
// different questions — "how fast is time running on screen right now" versus "how many physics
// steps does that buy" — and only the second is the loop's. The ACCUMULATOR LINE stays in
// RaceScreen (`st.physicsAccum += rawDt * effectiveSlowmoFactor`), immediately after the call,
// so the physics clock still reads in one place. Slow motion is a uniform, global time dilation;
// the headless sim is sim-time based, so fairness is unaffected (the 15a note below).
//
// MOVED VERBATIM (P4-RACESCREEN-SPLIT-1): the same reads with the same defaults, the same state
// writes in the same order. The camera config arrives as a parameter (RaceScreen passes
// `cameraConfigRef.current`), the director's `hudState` as `hud`. The comments are the ones that
// sat beside this code in RaceScreen.
// ============================================================

import { stepFocusFade } from './renderState.js';
import { DEFAULT_CAMERA_CONFIG } from '../../modules/storage/defaults.js';

/**
 * ── BATTLE slowmo — one frame of the slow-motion clock.
 *
 * @param {object} st            the live race state (`slowmo*` fields and the focus fade, mutated)
 * @param {string|undefined} hud the director's `hudState` this frame
 * @param {number} ts            the frame timestamp
 * @param {number} rawDt         this frame's capped wall delta in ms
 * @param {object} cameraConfig  the race's camera config (RaceScreen's `cameraConfigRef.current`)
 * @returns {number} the effective slow-motion factor for this frame (1 = normal speed)
 */
export function advanceSlowmo(st, hud, ts, rawDt, cameraConfig) {
  const isBattleZoom = hud === 'BATTLE_ZOOM';
  // 15a: the photo-finish shot reuses the same slow-motion path as BATTLE (uniform,
  // global time-dilation — headless sim is sim-time based, fairness unaffected).
  const isPhotoFinish = hud === 'PHOTO_FINISH';
  const isSlowmoState = isBattleZoom || isPhotoFinish;
  const smFactor = isPhotoFinish
    ? (cameraConfig.photoFinishSlowmoFactor ?? DEFAULT_CAMERA_CONFIG.photoFinishSlowmoFactor)
    : (cameraConfig.battleSlowmoFactor ?? DEFAULT_CAMERA_CONFIG.battleSlowmoFactor);
  const smMinDurMs =
    (cameraConfig.battleSlowmoMinDuration ?? DEFAULT_CAMERA_CONFIG.battleSlowmoMinDuration) * 1000;
  const smFadeDurMs =
    (cameraConfig.battleSlowmoFadeDuration ?? DEFAULT_CAMERA_CONFIG.battleSlowmoFadeDuration) *
    1000;
  if (isSlowmoState && !st.slowmoActive) {
    st.slowmoActive = true;
    st.slowmoStartWallTs = ts;
    st.slowmoIsPhotoFinish = isPhotoFinish;
  }
  if (!isSlowmoState && st.slowmoActive) {
    // 15a-predictive: a PHOTO_FINISH slowmo releases IMMEDIATELY when the shot ends
    // (state left PHOTO_FINISH on the 2nd crossing) so normal speed returns for the
    // zoom-out. BATTLE slowmo keeps its min-duration guard unchanged.
    const releaseOk = st.slowmoIsPhotoFinish || ts - st.slowmoStartWallTs >= smMinDurMs;
    if (releaseOk) {
      st.slowmoActive = false;
      st.slowmoIsPhotoFinish = false;
    }
  }
  const fadeStep = smFadeDurMs > 0 ? rawDt / smFadeDurMs : Infinity;
  st.slowmoFadeProgress = st.slowmoActive
    ? Math.min(1, st.slowmoFadeProgress + fadeStep)
    : Math.max(0, st.slowmoFadeProgress - fadeStep);
  const effectiveSlowmoFactor = 1.0 - (1.0 - smFactor) * st.slowmoFadeProgress;
  // ── BATTLE focus fade (same duration as slowmo fade) ─────────────────
  stepFocusFade(st, isBattleZoom, rawDt, smFadeDurMs);
  if (st.slowmoTs === null) st.slowmoTs = ts;
  st.slowmoTs += rawDt * effectiveSlowmoFactor;
  return effectiveSlowmoFactor;
}
