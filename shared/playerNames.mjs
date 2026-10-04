// ============================================================
// File:        playerNames.mjs
// Path:        shared/playerNames.mjs
// Project:     RaceArena — PERIOD-EVALUATION-1 (the owner's decisions of 2026-10-04)
//
// THE ONE HOME for WHEN TWO PLAYER NAMES ARE THE SAME NAME. Read by the client and by the server,
// for the same reason `nameLimits.mjs` beside it is: the rule has to be identical on both sides of
// the HTTP boundary, so it lives above both.
//
// THE OWNER'S DECISION, 2026-10-04: names match IGNORING CASE and SURROUNDING OR REPEATED SPACES.
// "Ada", "ada", " Ada " and "ADA" are one person; "Ada  Lovelace" and "Ada Lovelace" are one person.
// Two things follow from that one rule, and both read it from here:
//   · the period evaluation counts "Ada" and "ada" in ONE row;
//   · the SAME NAME TWICE IN ONE RACE is NOT allowed (also his decision of 2026-10-04), so every
//     place a roster is assembled refuses a roster in which two entries share a key.
//
// WHAT IT DOES NOT DO: it never changes a name. The roster keeps exactly what was typed — a name is
// physics (`stablePairBit` hashes it), so rewriting one would change the race. The key is used to
// COMPARE, and nothing else.
// ============================================================

/**
 * The comparison key of a player name: trimmed, every run of white space one space, lower case.
 * Two names are the same name exactly when their keys are equal.
 *
 * @param {unknown} name
 * @returns {string}  "" for anything that is not a string
 */
export function playerNameKey(name) {
  if (typeof name !== "string") return "";
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * The names in `list` that occur more than once by `playerNameKey`, each ONCE, as first written
 * (trimmed), in the order their second occurrence is reached. Empty when there is none.
 *
 * Returns the offenders rather than a boolean because every caller has to TELL SOMEBODY WHICH NAME
 * is doubled — the same reasoning as `tooLongNames` in `nameLimits.mjs`.
 *
 * @param {unknown[]} list
 * @returns {string[]}
 */
export function doubledNames(list) {
  if (!Array.isArray(list)) return [];
  const first = new Map();
  const doubled = new Map();
  for (const n of list) {
    const key = playerNameKey(n);
    if (!key) continue;
    if (!first.has(key)) first.set(key, n.trim());
    else if (!doubled.has(key)) doubled.set(key, first.get(key));
  }
  return [...doubled.values()];
}

/**
 * THE REFUSAL, worded once so the client and the server say the same thing.
 *
 * @param {string[]} doubled  from `doubledNames`
 * @param {"race"|"group"} [where]  what the names are in — a race, or a saved player group
 * @returns {string}
 */
export function doubledNamesMessage(doubled, where = "race") {
  const quoted = doubled.map((n) => `"${n}"`).join(", ");
  const why =
    "Every racer needs a different name (capitals and extra spaces do not make a name different).";
  return doubled.length === 1
    ? `The name ${quoted} is in this ${where} twice. ${why}`
    : `These names are in this ${where} twice: ${quoted}. ${why}`;
}
