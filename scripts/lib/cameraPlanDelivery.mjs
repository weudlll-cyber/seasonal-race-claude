// ============================================================
// File:        scripts/lib/cameraPlanDelivery.mjs
// Project:     RaceArena — CAMERA-PLAN-BLIND-1
//
// WHAT THIS OWNS: handing the authored `cameraPlan` to a CameraDirector the way the PRODUCT hands it
// over, so an instrument runs the camera the browser runs. One place, used by every instrument that
// drives a director, because the alternative is nine copies of a four-line rule drifting apart.
//
// ── ★ THE HOLE THIS CLOSES, AND WHY IT WAS INVISIBLE ───────────────────────────────────────────
//
// `RaceScreen/index.jsx:1072-1078` delivers the plan ONCE, MID-RACE, on the first frame it exists —
// the heroes are cast inside `racePlanController.update`, so the plan is null at the start line and
// appears later. Every instrument instead called `updateRacePlan(b1Indices)` with NO cameraPlan and
// never called `setCameraPlan` at all.
//
// The consequence is exact and it is not a degradation: `comebackDetector.setPlan(null)` leaves
// `_cast` null forever, so `isCast()` is false for every racer and ANY behaviour gated on a racer
// being CAST as a comebacker cannot fire on an instrument. COMEBACK-PRECEDENCE-1 shipped a change
// that alters what the camera shows, in 47 of 96 races, and **the camera fingerprint went green** —
// blind by construction, not inert. Same class as the `isOutcomePhase` defect that cost two mints.
//
// ── WHO USES THIS, AND WHO CANNOT (re-confirmed 2026-09-13) ────────────────────────────────────
//
// SIX instruments now see the cast, not three. FIVE deliver through THIS helper:
// `camera-fingerprint`, `render-fingerprint`, `check-ending-frame`, `exp-anchor-truth-ab` and
// `finish-band-truth`. The sixth, `camera-replay.mjs`, delivers the plan correctly but through its
// OWN inline copy of the rule (at its `setCameraPlan` call) rather than through here -- which is the
// duplication this file exists to prevent. Left as it is on 2026-09-13 rather than half-changed: a
// swap was attempted, broke the replay loop's control flow, and was reverted. Named, not fixed.
//
// THREE CANNOT, and it is structural rather than an oversight, so nobody should wire them up:
//   · `exp-camera-bisect.mjs`    — replays RECORDED frames; there is no controller to ask.
//   · `sim-race-visual.mjs`      — builds no race plan at all.
//   · `diag/start-formation.mjs` — runs the COUNTDOWN only, and the cast does not exist yet.
// ★ A GREEN FROM ANY OF THOSE THREE IS NOT A CLEARANCE for behaviour gated on a racer being CAST.
// Each of them says so in its own header, because that is where a reader will be standing.
//
// ── WHAT IT DELIBERATELY DOES NOT DO ───────────────────────────────────────────────────────────
//
//   · IT DOES NOT INVENT A PLAN. If the controller has none — race plan off, or a closed track with
//     no heroes — nothing is delivered and the director keeps the behaviour it has today. The point
//     is to stop DIFFERING from the product, not to force a plan into runs that have none.
//   · IT DOES NOT DELIVER AT THE START LINE. Delivering early would be a different wrongness: the
//     product cannot know the cast before the choreo boundary, so an instrument that did would be
//     running a camera the browser cannot produce.
//   · IT DELIVERS EXACTLY ONCE, like the product. `setCameraPlan` deliberately does not clear the
//     detector's rank history, and calling it every frame would be a second behaviour nobody ships.
// ============================================================

/**
 * A per-race delivery closure mirroring `RaceScreen/index.jsx:1072-1078`.
 *
 * Call it once per frame, inside the loop, BEFORE `cd.update(...)` — the product delivers from the
 * same frame body, and the director must see the plan on the frame it first exists rather than one
 * frame later.
 *
 * @param {object} cd  the CameraDirector driving this race
 * @param {object|null|undefined} racePlanController  `raceCfg.racePlanController`, if the race has one
 * @returns {() => boolean} true on the frame the plan was handed over; false on every other frame
 */
export function makeCameraPlanDelivery(cd, racePlanController) {
  let delivered = false;
  return () => {
    if (delivered || !racePlanController || !cd) return false;
    const cp = racePlanController.getCameraPlan?.();
    if (!cp) return false;
    cd.setCameraPlan(cp);
    delivered = true;
    return true;
  };
}
