// ============================================================
// File:        scripts/lib/runinAccepted.mjs
// Project:     RaceArena — RUNIN-ACCEPTED-1
//
// WHAT THIS IS: the NAMED, CLOSED list of run-in cases where `check-runin-frame` measures the finish
// band leaving the canvas and the picture has nonetheless been judged and accepted. It is two
// entries. It is not a threshold, not a tolerance and not a pattern — it is two races, named one by
// one, and every other race the guard measures stays exactly as strict as it was.
//
// WHY IT LIVES IN ITS OWN FILE rather than inside the guard: so it can be TESTED without running the
// guard. `check-runin-frame.mjs` does its work at module load and takes about three quarters of a
// minute; a test that had to import it could not assert on this list cheaply, and a list nobody can
// cheaply assert on is a list that quietly grows. `runinAccepted.test.mjs` is the assertion.
//
// ── THE ACCEPTANCE, 2026-09-14 ──────────────────────────────────────────────────────────────────
//
// On 2026-09-14 the owner looked at the run-in on a PRODUCTION BUILD and judged the picture
// acceptable. The acceptance covers the two cases below and nothing else.
//
// ★ WHAT WAS MEASURED, so a later reader can see what was accepted rather than infer it
// (reports/evolution/RUNIN-FRAME-SHAPE-1.md carries the full measurement):
//
//   dirt-oval,  40 racers, seed 9 — 15 frames off canvas, at race progress 0.950 to 0.953,
//                                   depth median 144 / p90 259 / max 289 screen px.
//   luger-hill, 100 racers, seed 9 —  5 frames off canvas, at race progress 0.950 to 0.951,
//                                   depth median 46 / p90 74 / max 82 screen px.
//
//   In every one of those 20 frames the binding term is `state` — the endgame SCHEDULE is the sole
//   author of the width, which is its design. All 20 sit in the FIRST 3% of the endgame window and
//   the band returns on its own: the deciles on dirt-oval read -353, then +120, +119, +119, +115,
//   +114, +109, +97, +86, +191.
//
// ★★ THIS IS AN OLD BEHAVIOUR THAT THE GUARD'S ONE-SEED SAMPLE WAS HIDING, AND THAT IS THE REASON
// THE LIST IS TWO ENTRIES RATHER THAN A REPAIR. The camera module, `defaults.js` and this guard are
// byte-identical to the master that was green. Measured over twelve seeds on dirt-oval at 40 racers,
// MASTER LOSES THE LINE TOO — on seed 11, 15 frames, 210 px, at progress 0.9502, by the same
// mechanism. The branch did not introduce it; it moved which seed the guard's single sample lands
// on. The guard's own `blind` list already said so: "one seed per track; a line that leaves only on
// some other race is not covered."
//
// ── WHAT THIS LIST DOES NOT DO ──────────────────────────────────────────────────────────────────
//
//   · It does not widen any threshold. `offCanvas === 0` is still the condition on every case.
//   · It does not accept a case that never shows the band at all. `everOnCanvas` is required, so
//     "it leaves and comes back" stays accepted and "it is never there" stays a failure — those are
//     different pictures and only the first one was looked at.
//   · It does not match by track alone, by field size alone, or by pattern. Track AND field size AND
//     seed must all match, so a different seed on the same track is a failure exactly as before.
//
// ★ IF A LATER CHANGE MOVES THESE NUMBERS, THE ACCEPTANCE DOES NOT AUTOMATICALLY COVER IT. What was
// judged is the picture described above. A materially different one on the same two races is a new
// question for the owner, not something this file already answered — see docs/DEAD-ENDS.md.
// ============================================================

/**
 * The accepted cases. Track id, field size and race seed must ALL match.
 * @type {ReadonlyArray<{track: string, racers: number, seed: number, why: string}>}
 */
export const RUNIN_ACCEPTED = Object.freeze([
  Object.freeze({
    track: "dirt-oval",
    racers: 40,
    seed: 9,
    why: "accepted 2026-09-14 on a production build — 15 frames at progress 0.950-0.953, binding term `state`, band returns on its own; master loses it on seed 11 by the same mechanism",
  }),
  Object.freeze({
    track: "luger-hill",
    racers: 100,
    seed: 9,
    why: "accepted 2026-09-14 on a production build — 5 frames at progress 0.950-0.951, binding term `state`, band returns on its own",
  }),
]);

/**
 * Is this exact race one the owner accepted?
 *
 * ALL THREE FIELDS MUST MATCH. `everOnCanvas` is required as well: the acceptance is of a band that
 * leaves and comes back, which is what was looked at. A band that is never on the canvas at any
 * point of the window is a different picture and stays a failure.
 *
 * @param {{track: string, racers: number, seed: number, everOnCanvas: boolean}} c
 * @returns {boolean}
 */
export function isAcceptedRunInCase({ track, racers, seed, everOnCanvas }) {
  if (everOnCanvas !== true) return false;
  return RUNIN_ACCEPTED.some(
    (a) => a.track === track && a.racers === racers && a.seed === seed
  );
}
