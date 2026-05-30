// ============================================================
// File:        coatAssignment.js
// Path:        client/src/modules/racer-types/coatAssignment.js
// Project:     RaceArena
// Description: Deterministic coat and pattern assignment.
//              djb2 hash of player name, modulo palette size.
//              Pattern uses a salted hash to stay uncorrelated from color.
// ============================================================

/**
 * djb2 hash: maps an arbitrary string to a non-negative integer.
 * Deterministic — same input always produces the same output.
 *
 * @param {string} str
 * @returns {number}
 */
export function hashStringToInt(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Assign a coat id to a player deterministically.
 * Empty / null names fall back to the first coat in the list.
 *
 * @param {string|null|undefined} playerName
 * @param {Array<{id: string}>} coatList
 * @returns {string} coat id
 */
export function assignCoat(playerName, coatList) {
  if (!playerName) return coatList[0].id;
  const idx = hashStringToInt(playerName) % coatList.length;
  return coatList[idx].id;
}

/** The three available coat patterns. */
export const PATTERN_IDS = ['solid', 'stripes', 'dots'];

// XOR salt applied to the raw hash before taking modulo for pattern selection.
// Chosen as the 32-bit Fibonacci hashing constant so it produces a different
// bucket distribution from the un-salted color hash.
const _PATTERN_SALT = 0x9e3779b9;

/**
 * Assign a pattern id to a player.
 * Currently always returns 'solid' — stripes/dots are disabled because
 * they are too visually dominant at current sprite sizes and make racers
 * hard to distinguish. The hash logic is preserved for future re-enablement.
 *
 * @param {string|null|undefined} _playerName
 * @param {string[]} _patternList - e.g. PATTERN_IDS
 * @returns {string} pattern id
 */
export function assignPattern(_playerName, _patternList) {
  return 'solid';
}
