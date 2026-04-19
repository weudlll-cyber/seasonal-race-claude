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
 */
export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Assigns racer numbers (1-based) to a list of player names.
 * Numbers are shuffled so assignment is unpredictable.
 *
 * @param {string[]} playerNames
 * @returns {{ name: string, racerNumber: number }[]}
 */
export function assignRacers(playerNames) {
  const numbers = playerNames.map((_, i) => i + 1);
  shuffle(numbers);
  return playerNames.map((name, i) => ({ name, racerNumber: numbers[i] }));
}

/**
 * Pick a random integer in [min, max] inclusive.
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
