// ============================================================
// File:        isValidId.js
// Path:        server/utils/isValidId.js
// Project:     RaceArena
// Description: Single-source ID validation for server routes (L129).
//              Consumed by brands.js, playerGroups.js, racers.js, surfaceClasses.js.
// ============================================================

/**
 * Returns true if id is a non-empty lowercase alphanumeric string
 * (hyphens and underscores allowed). Returns false for any other value
 * including null, undefined, and non-string types.
 * @param {unknown} id
 * @returns {boolean}
 */
export function isValidId(id) {
  return typeof id === 'string' && /^[a-z0-9_-]+$/.test(id);
}
