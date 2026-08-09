// ============================================================
// File:        frameCameraInputs.js
// Path:        client/src/screens/RaceScreen/frameCameraInputs.js
// Project:     RaceArena — FRAME-INPUTS-1
//
// THE ONE PLACE THAT BUILDS THE `camera` OBJECT A FRAME IS DRAWN FROM.
//
// ── WHY THIS EXISTS, AND IT IS NOT A TIDY-UP ────────────────────────────────────────────────────
// `RaceScreen/index.jsx` used to assemble that object as a LITERAL at the call site, listing three
// fields by hand. The director exposed more than three, and the renderer read more than three — so
// `camera.anchorRacerIndex` was `undefined` on every frame of every live race, the leader fallback
// fired always, and the racer the camera was actually on never carried his name. The owner reported
// it as "the comebacker shows no name"; it was the whole subject mechanism, silently absent.
//
// The same literal made `camera.state` undefined, so `exemptAll: camera.state === 'PHOTO_FINISH'`
// was false on every frame and the photo-finish exemption had never fired at all — a second defect
// nobody had seen, because it fails by doing nothing.
//
// ── WHY A FUNCTION AND NOT "PASS THE DIRECTOR" ──────────────────────────────────────────────────
// Handing `renderRaceFrame` the director itself would also have fixed both, and it was the first
// thing I considered. It is rejected for one reason: the renderer's inputs are the thing tests and
// harnesses construct, and a contract of "anything a CameraDirector has" cannot be constructed
// without one. This keeps the surface small and NAMED, which is what lets a probe build a frame's
// worth of inputs in four lines.
//
// ── WHAT MAKES THIS DIFFERENT FROM THE LITERAL IT REPLACES ──────────────────────────────────────
// Not that it is a function — a function can go stale exactly as a literal did. It is that the field
// list is DECLARED here and CHECKED against what the renderer actually reads, by a test that greps
// the renderer's source for `camera.<field>` and fails if any of them is absent from this list.
// "Remember to add it in two places" is what failed; the guard is that forgetting is now a red test.
// ============================================================

/**
 * Every field of the frame's `camera` object that comes straight off the director.
 *
 * ONE HOME. Add a field here and both the game and every harness get it; the test in
 * `frameCameraInputs.test.js` fails if the renderer reads one that is not on this list.
 */
export const FRAME_CAMERA_FIELDS = [
  // Which shot the director is in. Read for the photo-finish exemption.
  'state',
  // WHO the shot is about (CAMERA-FOCUS-1). Null in BATTLE_ZOOM and OVERVIEW, where there is no
  // single subject; the renderer falls back to the leader only there.
  'anchorRacerIndex',
  // The locked comeback racer, for the comeback HUD.
  'comebackLockedRacerIndex',
  // The director's own diagnostic HUD state.
  'hudState',
];

/**
 * Build the `camera` input for one frame from a live director.
 *
 * @param {object|null} director  a CameraDirector, or null before one exists
 * @returns {object} the frame's camera inputs — never null, so the renderer never has to guard
 */
export function frameCameraInputs(director) {
  const out = {};
  for (const key of FRAME_CAMERA_FIELDS) out[key] = director?.[key] ?? null;
  // A METHOD, not a field, and it stays a closure so it keeps its `this`. Reading it off the
  // director like the others would hand the renderer an unbound function.
  out.detectBattleGroup = (racers) => director?.detectBattleGroup?.(racers) ?? null;
  return out;
}
