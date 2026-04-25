// ============================================================
// File:        coatAssignment.js
// Path:        client/src/modules/racer-types/coatAssignment.js
// Project:     RaceArena
// Description: Deterministic coat assignment for horse racers.
//              djb2 hash of player name, modulo coat count.
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
