// ============================================================
// File:        racerDisplayFields.js
// Path:        client/src/screens/RaceScreen/racerDisplayFields.js
// Project:     RaceArena — P4-RACESCREEN-SPLIT-1
// Description: The render-only fields RaceScreen puts on each physics racer once the race is built:
//              the roster's display fields, the icon, the coat, the pattern, the start number and
//              the per-racer surface-trail emitter.
//
// WHAT IT OWNS AND WHY IT IS ITS OWN MODULE. The race engine builds racers that carry physics and
// nothing a viewer sees; this is the step that turns them into racers that can be DRAWN. It sat in
// RaceScreen's race-init effect between the engine call and the scoreboard setup, and it is
// self-contained: it reads the roster, the racer type and the race seed and writes fields that the
// engine never reads. Its ordering guarantee is the reason it is worth reading on its own — it runs
// AFTER the race is built and consumes nothing from the race's random stream, so it cannot
// participate in building it (the comments below say why each field is safe).
//
// MOVED VERBATIM (P4-RACESCREEN-SPLIT-1): the same loop, the same field order, the same
// never-overwrite-a-physics-field copy. The physics racers arrive as `racers` (RaceScreen passes
// `raceState.racers`) and the roster as `rosterRacers` (`raceData.racers`). The comments are the
// ones that sat beside this code in RaceScreen.
// ============================================================

import { getCoatsByType } from '../../racer-types/index.js';
import { assignRaceNumbers } from '../../modules/raceNumbers.js';
import { assignCoat, assignPattern, PATTERN_IDS } from '../../racer-types/coatAssignment.js';
import { resolveTrailEmitter } from '../../modules/surface-effects/trailResolver.js';

// ── Augment the extracted physics racers with render-only fields (icon/colour/coat/pattern/
// trail/emitter). Done IN PLACE so the render array and the physics array stepRacePhysics mutates
// are the SAME objects. `for (k in src) if (!(k in r))` copies the roster's display fields without
// ever overwriting a physics field — reproducing the former `{ ...r, ...physics }` spread exactly.
// None of these draw from raceRng (coat/pattern hash the name), so the physics stream is untouched.
/**
 * @param {object[]} racers          the physics racers (`raceState.racers`), mutated in place
 * @param {object[]} rosterRacers    the race payload's roster (`raceData.racers`), same order
 * @param {object} p
 * @param {number} p.racePlanSeed    the race seed — the start numbers are drawn from it
 * @param {string|null} p.trackEmoji the racer type's emoji, if it has one
 * @param {string} p.typeId          the racer type id (selects the coat set)
 * @param {object} p.racerType       the racer type (resolves the trail emitter)
 * @param {string[]} p.trackSurfaceClasses the track's surface classes
 */
export function attachRacerDisplayFields(
  racers,
  rosterRacers,
  { racePlanSeed, trackEmoji, typeId, racerType, trackSurfaceClasses }
) {
  // RACE-NUMBERS-1: one permutation for the whole field, drawn from the seed on its own generator.
  const raceNumbers = assignRaceNumbers(racers.length, racePlanSeed);
  for (let i = 0; i < racers.length; i++) {
    const r = racers[i];
    const src = rosterRacers[i];
    for (const k in src) if (!(k in r)) r[k] = src[k];
    r.icon = trackEmoji ?? src.icon;
    r.coatId = getCoatsByType(typeId) ? assignCoat(src.name, getCoatsByType(typeId)) : undefined;
    r.patternId = assignPattern(src.name, PATTERN_IDS);
    // RACE-NUMBERS-1: the start number is a RENDER-ONLY field, attached here beside the coat and
    // the pattern — AFTER the race has been built, so it cannot participate in building it. The
    // draw itself consumes no shared stream (see raceNumbers.js); attaching it here as well means
    // there is no ordering by which it could.
    r.raceNumber = raceNumbers[r.index] ?? null;
    // VRE-4: one emitter instance per racer (stateful generators must not be shared)
    r.surfaceEmitter = resolveTrailEmitter(racerType, trackSurfaceClasses);
  }
}
