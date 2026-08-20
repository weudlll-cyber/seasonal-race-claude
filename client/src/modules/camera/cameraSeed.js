// ============================================================
// File:        cameraSeed.js
// Path:        client/src/modules/camera/cameraSeed.js
// Project:     RaceArena — CAMERA-SEED-AND-LINE-1
//
// THE CAMERA'S SEED COMES FROM THE RACE'S SEED. One rule, no knob.
//
// ── WHAT THIS REPLACES, AND WHY IT WAS WRONG ──────────────────────────────────────────────────
//
// `RaceScreen` used to draw the camera's seed from `Math.random()` on every race. That was a
// deliberate decision (CAMERA-REPRO-1) and it made the camera REPLAYABLE — the drawn seed rides in
// the `M` marker — but not REPRODUCIBLE: the same race seed gave a different camera every time, so
// a picture the owner reported could not be stood in again by anyone, including him. Measured
// (CAMERA-NONDETERMINISM-1): two runs of race seed 9 differing only in the camera seed diverged at
// physics step 967 with 165 steps running a DIFFERENT STATE.
//
// His decision, 2026-08-23: derive it from the race seed.
//
// ── WHAT IS GIVEN UP, DELIBERATELY ────────────────────────────────────────────────────────────
//
// "The same race twice with a different camera" is gone. The variety BETWEEN races is untouched:
// different race seeds still give different camera runs, because different seeds derive different
// camera seeds. That is the whole of the trade and it is his to make.
//
// ── THE DERIVATION FOLLOWS THIS PROJECT'S OWN PRECEDENT ───────────────────────────────────────
//
// `raceNumbers.js` already derives a subsystem's stream from the race seed, and its header states
// the reason for the salt: "The number stream is derived from the race seed rather than being the
// race seed, so that two things seeded 'from 5601' do not produce correlated sequences." The same
// applies here, with one addition — the salt used here must DIFFER from the one used there, or the
// camera and the start numbers would walk the same sequence for every race.
//
// ── THE UNSEEDED CASE, AND WHY IT IS NOT A KNOB ───────────────────────────────────────────────
//
// A race can have no seed: `SetupScreen` sets `racePlanSeed: 0` for Start Race, while Quick Test
// always carries one. There is nothing to derive from, so the rule has to say what happens, and
// there are only two candidates:
//
//   A CONSTANT, which is what `raceNumbers` uses — correct there, because start numbers are
//   display-only and nobody minds them repeating. Here it would make EVERY unseeded race use the
//   identical camera, which destroys the variety the owner explicitly kept.
//
//   `Math.random()`, which is exactly what happens today for every race. An unseeded race is
//   already irreproducible by definition, so nothing is lost, and the behaviour of that case is
//   unchanged rather than newly invented.
//
// The second is chosen. This is one rule with a defined answer for the degenerate input, not a
// toggle: no caller can select between them and there is no configuration key.
//
// NOTE the hazard `raceNumbers` names — an unseeded race runs its own physics off `Math.random`,
// so drawing from it here consumes one value from that stream. That is TODAY'S behaviour, not a
// new cost: the line this replaces made the identical draw on every race, seeded or not.
// ============================================================

/**
 * Decorrelation salt for the CAMERA's stream. Deliberately NOT `raceNumbers`' `0x9e3779b9`: two
 * subsystems salted with the same constant from the same race seed produce the same sequence, which
 * is the correlation the salt exists to prevent. This is the murmur3 finaliser constant; nothing
 * depends on its specific bits, only on it differing from the other one.
 */
const CAMERA_SEED_SALT = 0x85ebca6b;

/**
 * The camera's random seed for a race.
 *
 * @param {number} racePlanSeed  the race's own seed; <= 0 (or absent) means the race is unseeded
 * @param {() => number} [random=Math.random]  injected only so a test can prove the unseeded branch
 *   is reached; production callers pass nothing.
 * @returns {number} a positive 32-bit integer, never 0 (mulberry32 accepts 0, but 0 is also this
 *   project's "no seed" sentinel and returning it would make a seeded race look unseeded).
 */
export function cameraSeedForRace(racePlanSeed, random = Math.random) {
  const s = Number(racePlanSeed);
  if (Number.isFinite(s) && s > 0) {
    return (s ^ CAMERA_SEED_SALT) >>> 0 || 1;
  }
  return (random() * 0x7fffffff) >>> 0 || 1;
}
