// ============================================================
// File:        raceResults.js
// Path:        client/src/screens/RaceScreen/raceResults.js
// Project:     RaceArena — P4-RACESCREEN-SPLIT-1
// Description: The hand-over from the race screen to the result screen: the finish order and the
//              `raceResults` payload RaceScreen writes to sessionStorage on the frame the last racer
//              crosses.
//
// WHAT IT OWNS AND WHY IT IS ITS OWN MODULE. This is the CONTRACT between two screens — the shape
// ResultScreen reads back — and it sat inline in the middle of RaceScreen's physics accumulator,
// between the finish detection and the ending's timers. It is pure: it reads the race state it is
// given and builds two arrays and one object, writing nothing. The WRITE (`sessionStorage.setItem`)
// and the test-race gate in front of it stay in RaceScreen, beside the other things that frame
// does, so the one place a result is handed on is still visible at the call site.
//
// Moved verbatim (P4-RACESCREEN-SPLIT-1): same filters, same sorts, same fields in the same order,
// same arithmetic. The comments are the ones that sat beside this code in RaceScreen.
// ============================================================

import { lapProgress } from '../../modules/camera/lapUtils.js';

/**
 * The finishing order as RaceScreen has always computed it at the last crossing: finishers by
 * `finishRank`, then anyone not finished by progress. `byRank[0]` is the winner the closing card
 * names.
 *
 * @param {object[]} racers  the race's racers
 * @returns {{ byRank: object[], rest: object[] }}
 */
export function splitFinishOrder(racers) {
  const byRank = racers.filter((r) => r.finished).sort((a, b) => a.finishRank - b.finishRank);
  const rest = racers.filter((r) => !r.finished).sort((a, b) => b.t - a.t);
  return { byRank, rest };
}

/**
 * The `raceResults` payload the result screen reads.
 *
 * @param {object} p
 * @param {object[]} p.byRank      from `splitFinishOrder`
 * @param {object[]} p.rest        from `splitFinishOrder`
 * @param {object} p.st            the live race state (`finishT`, `raceStart`)
 * @param {number} p.ts            the frame timestamp of the last crossing
 * @param {object} p.raceData      the race payload this screen was started with
 * @param {object} p.cfgWorld      the config world this race ran with
 * @returns {object}
 */
export function buildRaceResults({ byRank, rest, st, ts, raceData, cfgWorld }) {
  return {
    finishOrder: [...byRank, ...rest].map((r) => ({
      name: r.name,
      icon: r.icon,
      color: r.color,
      index: r.index,
      lap: r.lap ?? 1,
      progress: Math.min(lapProgress(r.t, st.finishT) * 100, 100),
      finishTimeMs: r.finishTimeMs ?? null,
    })),
    elapsedTime: Math.round((ts - st.raceStart) / 1000),
    race: raceData,
    // RACE-SAVE-3: THE CONFIG WORLD THIS RACE ACTUALLY RAN WITH, carried to the result
    // screen rather than re-gathered there.
    //
    // `raceData` alone cannot describe a race. Two of the identifier's nine inputs are
    // read from the HOST at race start and never travel in the payload — the config
    // world is one of them (`cfgWorld` in RaceScreen, the same value the badge and the camera
    // marker use). The result screen has only `raceData`, so it would have to gather
    // the world itself, from the loaders that read the Dev Screen AS IT IS NOW: change
    // a setting while the race is on screen and the stored race would claim values it
    // never ran. That is the exact class RACE-IDENTIFIER-1 exists to prevent, and it is
    // why this is a carry rather than a second gather.
    worldConfig: cfgWorld,
  };
}
