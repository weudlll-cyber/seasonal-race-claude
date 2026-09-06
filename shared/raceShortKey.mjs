// ============================================================
// File:        raceShortKey.mjs
// Path:        shared/raceShortKey.mjs
// Project:     RaceArena — RACE-HISTORY-4, moved here by SHARED-CANONICAL-1
// Description: THE SHORT NAME A RACE CAN BE READ ALOUD BY — its alphabet, its length, and how a
//              typed one is read. The ONE home for all three.
//
// ── WHY IT IS HERE AND NOT IN client/, WHICH IS A CORRECTION ────────────────────────────────────
//
// It used to live at `client/src/modules/raceShortKey.js`, and its header argued that the server
// should reach across and import it — citing `server/src/races/contentAddress.js` importing
// `client/src/modules/raceConfigWorld.js` as the direction "the project already uses".
//
// ★ THAT PRECEDENT WAS A DEFECT, NOT A PATTERN. The root `.dockerignore` is an allow-list: it
// re-includes `server/src`, `server/utils`, `server/seeds`, `server/package.json` and NAMED FILES
// under `shared/`, and deliberately excludes the client source, which has no business in a server
// image. So every one of those imports is unresolvable in the image and the containerised server
// cannot start. `raceStore.js` and `shortKey.js` both import from this module, so both carried the
// same defect.
//
// The rule the project actually uses is the one `shared/nameLimits.mjs` established: something that
// must be IDENTICAL in two runtimes lives above both packages. Neither can import from the other —
// the server is not part of the client's build, and a server importing from a UI package has its
// layering backwards.
//
// ── WHY THE WHOLE MODULE MOVED, RATHER THAN THE THREE EXPORTS THE SERVER USES ───────────────────
//
// The server imports `SHORT_KEY_ALPHABET`, `SHORT_KEY_LENGTH` and `normalizeShortKey`; only
// `looksLikeShortKey` is client-only, and it is one line over `normalizeShortKey`. Splitting the
// file would have put the alphabet here and a function that tests against the alphabet somewhere
// else — two homes for one rule, which is the thing this file exists to prevent. It has no imports,
// so nothing browser-only travels with it.
//
// ★ WHAT IT DELIBERATELY IS NOT: a permission. Knowing a key grants nothing — see the header of
// `server/src/races/shortKey.js`, which owns that argument, and which adds the generator that needs
// `node:crypto` and has no business in a browser bundle.
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
