// ============================================================
// File:        nameLimits.js
// Path:        shared/nameLimits.js
// Project:     RaceArena — NAME-LIMIT-1
//
// THE ONE HOME for how long a player name may be. Read by the client and by the server; no path
// that validates a name may carry its own number.
//
// WHY THIS FILE IS AT THE REPO ROOT AND NOT INSIDE client/ OR server/. The limit has to be the same
// on both sides of an HTTP boundary, and neither package can import from the other: the server is
// not part of the client's build, and a server that imports from a UI package has its layering
// backwards. A constant that must be identical in two runtimes has to live above both of them, or it
// is two constants with a promise attached. This project has already paid for that shape once —
// QUICK_TEST_NAMES was duplicated between a screen and the parity runner, and the duplication was a
// silent-divergence bug waiting for one side to be edited.
//
// WHAT WENT WRONG WITHOUT IT, measured before this file existed: the project gave THREE answers to
// "how long may a name be".
//   - the Players field said 32, via an HTML `maxLength` attribute and nothing else
//   - the server said 100, via its own `PLAYER_NAME_MAX`
//   - the renderer said nothing at all, and still does
// So the effective limit was 100 — a name entered through a saved player group could be three times
// longer than the field would accept, and nothing downstream cared.
//
// WHY AN ATTRIBUTE IS NOT ENFORCEMENT. `maxLength` stops typing. It does not stop a paste in some
// browsers, it does not stop a value set programmatically, and it does not exist at all on the
// server. It is a hint to one browser about one field; the rule has to be checked where the name
// ENTERS the system.
// ============================================================

/**
 * Maximum length of a player name, in characters.
 *
 * THE OWNER'S DECISION (2026-08-07): 32, and his reasoning was to start here and reduce later if it
 * proves too generous. It is deliberately not derived from anything — a name limit is a product
 * decision about what an operator may type, not a quantity to compute.
 *
 * For context rather than as a justification: at the shipped label size a 32-character name draws a
 * box of roughly 250 screen px on a 720-px frame, about a fifth of the frame width. The measured
 * numbers are in reports/night/NAME-LIMIT-1.md.
 */
export const PLAYER_NAME_MAX_LENGTH = 32;

/**
 * Is this a name the system will accept?
 *
 * Deliberately strict about TYPE as well as length: the server receives arbitrary JSON, so "not a
 * string" is a real case there and silently coercing it would put a `[object Object]` on the grid.
 *
 * @param {unknown} name
 * @returns {boolean}
 */
export function isNameLengthValid(name) {
  return (
    typeof name === "string" && name.trim().length <= PLAYER_NAME_MAX_LENGTH
  );
}

/**
 * The names in `list` that are too long, in the order they were given.
 *
 * Returns the offenders rather than a boolean because every caller has to TELL SOMEBODY WHICH ONE —
 * that is the whole difference between this and trimming. See the rejection rule below.
 *
 * @param {unknown[]} list
 * @returns {string[]}
 */
export function tooLongNames(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(
    (n) => typeof n === "string" && n.trim().length > PLAYER_NAME_MAX_LENGTH,
  );
}

/**
 * THE REJECTION RULE, so both sides word it the same way.
 *
 * OVER-LENGTH NAMES ARE REJECTED WITH A VISIBLE REASON. THEY ARE NEVER SILENTLY TRIMMED.
 *
 * The choice matters more than it looks. A name is a person at the event, and a trimmed name is a
 * label that person does not recognise on a screen in front of a room — while the operator, who
 * could have fixed it in one keystroke, is never told anything happened. Rejection costs one
 * correction and is immediately obvious; trimming costs nothing now and is discovered by the wrong
 * person later.
 *
 * @param {string[]} offenders
 * @returns {string} a message fit for a user, not a log line
 */
export function nameTooLongMessage(offenders) {
  const n = offenders.length;
  if (n === 0) return "";
  const shown = offenders.slice(0, 3).map((s) => `"${s.slice(0, 20)}…"`);
  const rest = n > 3 ? ` and ${n - 3} more` : "";
  return (
    `${n === 1 ? "This name is" : `${n} names are`} longer than ` +
    `${PLAYER_NAME_MAX_LENGTH} characters: ${shown.join(", ")}${rest}. ` +
    `Shorten ${n === 1 ? "it" : "them"} and try again.`
  );
}
