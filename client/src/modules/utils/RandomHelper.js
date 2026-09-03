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

/**
 * Assigns racer numbers (1-based) to a roster. Numbers are shuffled so assignment is
 * unpredictable.
 *
 * ENTRIES MAY BE STRINGS OR OBJECTS, and every field of an object entry SURVIVES — only
 * `racerNumber` is overwritten. That is what PLAYER-GROUPS-1 needed and it is why this takes both
 * shapes rather than a second function: the setup flow re-shuffles on every add and remove, so a
 * helper that rebuilt each player from its NAME ALONE silently erased anything else the roster
 * carried. It did, for as long as a player was only a name; the moment one carries which group it
 * came from, that erasure is a bug in every caller at once.
 *
 * @param {(string|{name: string})[]} entries  names, or player objects carrying at least `name`
 * @returns {{ name: string, racerNumber: number }[]}  the same objects, renumbered
 */
export function assignRacers(entries) {
  const numbers = entries.map((_, i) => i + 1);
  shuffle(numbers);
  return entries.map((entry, i) =>
    typeof entry === 'string'
      ? { name: entry, racerNumber: numbers[i] }
      : { ...entry, racerNumber: numbers[i] }
  );
}

/**
 * Pick a random integer in [min, max] inclusive.
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
