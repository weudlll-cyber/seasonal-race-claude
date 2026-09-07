// ============================================================
// File:        teams.js
// Path:        server/src/auth/teams.js
// Project:     RaceArena
// Created:     2026-09-06
// Description: THE ONE HOME for what a team is, how two spellings are judged to be the same
//              team, and why a typo cannot silently split one.
//
//              A TEAM IS DATA ABOUT A USER, NOT A PERMISSION. Nothing in this file is consulted
//              by requireAuth or requireAdmin to decide what anybody may do. It exists so that a
//              later piece can ask "which team is this user in" and get an answer that two
//              members of one team always agree on.
//
// ── THE FAILURE THIS FILE IS BUILT AGAINST ──────────────────────────────────────────────────────
// The owner's decision of 2026-09-05 is that races are stored on the server and visible to
// everyone in the same team. That makes the team string a JOIN KEY. If an admin types
// "Seasonal Entertainment" for one user and "Seasonal entertainmnet" for the next, nothing
// fails, nothing logs, and nothing looks wrong — the two users simply never see each other's
// races. The symptom arrives months later as "where did my races go", and by then the split is
// spread across every race either of them stored. A join key that can be mistyped into a second
// key is the whole defect, so it is closed here rather than watched for.
//
// ── HOW IT IS CLOSED, IN TWO PARTS ──────────────────────────────────────────────────────────────
// Neither part alone is enough, and it is worth being exact about which failure each one takes.
//
//   PART 1 — NORMALISATION closes the VARIANT case (same word, different keystrokes).
//   "Seasonal Entertainment", "seasonal entertainment", " Seasonal  Entertainment " and a form
//   that pasted a non-breaking space all collapse to ONE key. These are not typos in the sense of
//   a misspelling; they are the same name entered differently, and they are the overwhelmingly
//   common case. A user whose team matches an existing team by this key ADOPTS THAT TEAM'S
//   EXISTING DISPLAY SPELLING (usersStore.createUser), so the store never accumulates two display
//   forms of one team and a later reader never has to guess which is canonical.
//
//   Normalisation CANNOT close a real misspelling: "entertainmnet" does not normalise to
//   "entertainment", and no amount of folding will make it. Anything that tried — edit distance,
//   fuzzy matching — would be guessing, and a join key repaired by guessing is worse than one
//   that is wrong loudly. Hence part 2.
//
//   PART 2 — A CLOSED SET closes the MISSPELLING case. The set of teams that exist is DERIVED
//   from the users already in the store (usersStore.listTeams), so it needs no second store to
//   hold it. A team that is not in that set is REFUSED — unless the caller states, in a separate
//   and explicit field, that it is founding a new team. So:
//
//     "Seasonal entertainmnet" matches no existing team  ->  refused, UNKNOWN_TEAM, and the error
//                                                            names the teams that do exist.
//     the admin fixes the typo, or ticks "new team"      ->  a second team exists ON PURPOSE.
//
// The property that matters is not "a typo is impossible" — an admin who ticks "new team" and
// then misspells it still gets a second team. It is that A TYPO IS NEVER ACCEPTED SILENTLY.
// Splitting a team now takes a deliberate second act, and the invisible-months-later symptom
// needs the split to have been silent.
//
// ── WHY NO NEW STORE ────────────────────────────────────────────────────────────────────────────
// The obvious shape is a teams table. It was not built, because the users store already holds
// every fact a teams table would: the set of live teams IS the set of teams on live users. A
// separate table would introduce a second home for that fact, and with it the drift the project's
// one-canonical-home rule exists to prevent — a team row with no members, a member naming a team
// with no row, and a migration to keep them agreeing. The one thing a users-derived set cannot do
// is remember a team with no members, and a team with no members has nothing to show anybody.
// ============================================================

/**
 * THE FOUNDING TEAM. Two places name it and they must not drift, so it is named once here:
 *
 *   1. `migrateTeams.js`, which backfills every user who predates teams.
 *   2. `POST /api/auth/setup`, which creates the very first admin — see the note there for why
 *      that one call site passes a constant while the admin-facing create path has no default.
 *
 * The exact spelling is the owner's, 2026-09-05: capital S, capital E.
 */
export const FOUNDING_TEAM = 'Seasonal Entertainment';

/**
 * The comparison key for two team names. NFC, not NFKC, and lowercased — deliberately the SAME
 * choice `normalizeUsername` makes, for the same reason recorded there: compatibility folding can
 * merge visually distinct names, and a merge is as wrong as a split.
 *
 * The one thing this does that username normalisation does not is COLLAPSE INTERNAL WHITESPACE.
 * A username is one token and a stray inner space is a different username; a team name is a
 * phrase a person types, and "Seasonal  Entertainment" with a double space is not a second team.
 * The class is widened to \s so a non-breaking space pasted out of a document folds too.
 *
 * @param {string} raw
 * @returns {string} the key — never shown to anybody, only compared
 */
export function normalizeTeam(raw) {
  return String(raw).trim().normalize('NFC').replace(/\s+/gu, ' ').toLowerCase();
}

/**
 * Validate a team name for shape only — that it is a non-empty string once trimmed. Whether it is
 * a team that EXISTS is a separate question and is answered in usersStore against the derived set;
 * this is the check that a caller passed something at all.
 *
 * @param {unknown} raw
 * @returns {boolean}
 */
export function isWellFormedTeam(raw) {
  return typeof raw === 'string' && raw.trim().length > 0;
}
