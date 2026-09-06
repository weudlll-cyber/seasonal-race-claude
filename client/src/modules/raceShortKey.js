// ============================================================
// File:        raceShortKey.js
// Path:        client/src/modules/raceShortKey.js
// Project:     RaceArena — RACE-HISTORY-4
// Created:     2026-09-06
// Description: THE SHORT NAME A RACE CAN BE READ ALOUD BY — its alphabet, its length, and how a
//              typed one is read. The ONE home for all three.
//
//              ★ WHY THIS LIVES ON THE CLIENT AND THE SERVER IMPORTS IT. Both sides need the same
//              answer to "is this string a key": the setup screen, to tell a key from a seed before
//              it asks the server anything, and the server, to look one up. Two copies of an
//              alphabet is the silent-divergence shape — one side would accept a character the
//              other rejects, and the failure would be a race that cannot be fetched by the key it
//              was given. `server/src/races/shortKey.js` imports this and adds only the generator,
//              which needs `node:crypto` and has no business in a browser bundle. The direction is
//              the one the project already uses: `server/src/races/contentAddress.js` imports
//              `raceConfigWorld.js` the same way, as `scripts/sim-fairness.mjs:111` does.
//
//              This module has NO imports, so nothing browser-only travels with it.
//
//              ★ WHAT IT DELIBERATELY IS NOT: a permission. Knowing a key grants nothing — see the
//              header of the server module, which owns that argument.
//
// ── THE ALPHABET, AND WHY BOTH HALVES OF EACH CONFUSABLE PAIR ARE GONE ──────────────────────────
// Excluded: 0 and O, 1 and I and L. The usual approach (Crockford base32) keeps 0 and 1 and FOLDS
// O onto 0 and I/L onto 1 when reading. That is right for a machine identifier being re-entered,
// and wrong here, for one reason:
//
//   ★ A FOLD CAN LAND ON SOMEBODY ELSE'S RACE. If O folds to 0, a person who mistypes a key by one
//   character does not get an error — they get a DIFFERENT VALID KEY, and if that key exists in
//   their team they are shown a race they never asked for and have no reason to doubt. With both
//   members of each pair absent, a typed O is not a character this alphabet has, so it is a typo
//   the person is TOLD about rather than one silently turned into another race.
//
// Input is still forgiving about everything that cannot cause that: case, surrounding whitespace,
// and the spaces or dashes a person adds while writing a key down.
// ============================================================

/** 31 characters: digits 2-9, letters A-Z without I, L and O. */
export const SHORT_KEY_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/**
 * Six characters — 31^6, about 887 million. Long enough that the server's retry-on-collision loop
 * effectively never runs twice, short enough to say in one breath.
 */
export const SHORT_KEY_LENGTH = 6;

/**
 * What a person typed, as a key — or `null` if it cannot be one.
 *
 * @param {unknown} raw
 * @returns {string|null}
 */
export function normalizeShortKey(raw) {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.trim().toUpperCase().replace(/[\s-]/g, '');
  if (cleaned.length !== SHORT_KEY_LENGTH) return null;
  for (const ch of cleaned) {
    if (!SHORT_KEY_ALPHABET.includes(ch)) return null;
  }
  return cleaned;
}

/**
 * Is this string SHAPED like a short key?
 *
 * A shape test, never an existence test: a `true` here means "this could be a key", and only the
 * server can say whether it names a race this team may see.
 */
export function looksLikeShortKey(raw) {
  return normalizeShortKey(raw) !== null;
}
