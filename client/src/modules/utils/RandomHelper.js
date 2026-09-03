// ============================================================
// File:        RandomHelper.js
// Path:        client/src/modules/utils/RandomHelper.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Shuffle and random assignment utilities used in the setup flow
// ============================================================

/**
 * Fisher-Yates in-place shuffle — uniform distribution over all permutations.
 * Returns the same array reference (mutated) for convenience.
 *
 * @param {Array}    array
 * @param {Function} [rng=Math.random]  source of uniform [0,1) values. Defaults to
 *   Math.random so all existing (browser) callers are byte-for-byte unchanged; the
 *   headless sim passes a deterministic PRNG so a --seed reproduces the exact permutation.
 */
export function shuffle(array, rng = Math.random) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ── `assignRacers` WAS HERE, and it is gone (DROP-RACER-NUMBER-1, 2026-09-04) ────────────────
//
// It existed to give every player a shuffled `racerNumber`, which the Players tab drew as a `#3`
// badge beside the name. THE OWNER RETIRED BOTH on 2026-09-04, and his reasoning is the shape of
// the removal rather than a note beside it: **the badge created an expectation it did not meet.**
// He read it as deciding the numbers the racers carry in the race, and it decided nothing — those
// come from `raceNumbers.js`, drawn from the race SEED on a generator of its own.
//
// ★ DO NOT RE-ADD IT THINKING IT IS `raceNumber`. Two fields, one letter apart, and only one of
// them ever reaches a race. SHUFFLE-REACH-1 traced the pair; this comment is here because the
// near-collision is exactly how a removed mechanism comes back.
//
// `shuffle` below STAYS and is unrelated: `rowLayout.js` uses it for the start grid, seeded.

/**
 * Pick a random integer in [min, max] inclusive.
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
