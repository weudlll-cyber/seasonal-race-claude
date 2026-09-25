// ============================================================
// File:        raceSource.mjs
// Path:        shared/raceSource.mjs
// Project:     RaceArena — RACE-SOURCE-1
// Created:     2026-09-25
// Description: HOW A RACE WAS STARTED, and the one rule for reading it back. The vocabulary lives
//              here so the client that writes it and the server that stores it cannot drift apart.
//
// ── WHY IT EXISTS ─────────────────────────────────────────────────────────────────────────────
// The PERIOD EVALUATION (BACKLOG PART ONE) must not count Quick Tests, and on 2026-09-25 nothing
// stored said which races were Quick Tests. Reconstructing it from the values was refused: the only
// tells were `eventName: 'Quick Test'` — a literal a host can type by hand — and a skipped
// `rememberStartedRace`, which is an absence and not a fact. A guess is exactly what this marker
// exists to avoid, so the race records how it was started, at the moment it is saved.
//
// ── WHY A NAMED SOURCE AND NOT A BOOLEAN ──────────────────────────────────────────────────────
// `isTest: true` answers one question and closes the door on every other. A named source can grow a
// third value the day something genuinely third exists; a boolean would have to be replaced. Two
// values exist today and **nothing here invents a third**.
//
// ── ★★ THE LOAD-BEARING RULE: ABSENT IS NOT REAL ──────────────────────────────────────────────
// A race counts as a real race ONLY when it says so explicitly. A row with no marker — which is
// every row stored before 2026-09-25 — is a TEST race, not a real one. `isRealRace` is written as a
// positive equality for that reason: there is no `!== QUICK_TEST` anywhere, because that form reads
// "unknown means real" and would quietly promote every legacy row the first time somebody counted.
//
// The owner's decision of 2026-09-25 is what makes that free: every race stored so far is a test
// race, and none of them is carried over when the move to a server happens. So the rule and the
// truth already agree, and nothing has to be back-filled to make them.
//
// ★ A LATER READER WHO WANTS "IS THIS A TEST" MUST STILL ASK `!isRealRace(...)`, not compare
//   against QUICK_TEST. The two are not the same question the moment a third value exists.
// ============================================================

/**
 * The two ways a race can be started today.
 *
 * `RACE` covers BOTH ordinary starts: the one from the setup screen's own selection, and the one
 * whose inputs came from a race identifier. An identifier start is an ordinary race whose settings
 * were read from a string instead of from the screen — it is not a third kind of race.
 */
export const RACE_SOURCE = Object.freeze({
  RACE: 'race',
  QUICK_TEST: 'quick-test',
});

/** Every value this vocabulary recognises. Exported so callers can validate without re-listing. */
export const RACE_SOURCES = Object.freeze(Object.values(RACE_SOURCE));

/**
 * Is this stored race a REAL race?
 *
 * ★★ ABSENT IS NOT REAL. `null`, `undefined`, `''` and anything unrecognised all answer `false`.
 * Do not rewrite this as a negation — see the header.
 *
 * @param {unknown} source the stored `raceSource` / `race_source` value
 * @returns {boolean}
 */
export function isRealRace(source) {
  return source === RACE_SOURCE.RACE;
}

/**
 * The value to STORE for a source that arrived from a client, or `null` when there is none to store.
 *
 * `null` for absent and `null` for unrecognised, deliberately: the storage layer must never invent a
 * source, and of the two ways to be wrong, recording a race as a test is recoverable while recording
 * a test as a race silently corrupts a standing. An unrecognised value is worth a word from the
 * caller, which is why this reports it rather than only returning — see `raceStore.js`.
 *
 * @param {unknown} value
 * @returns {{ source: string|null, unrecognised: boolean }}
 */
export function normalizeRaceSource(value) {
  if (value === null || value === undefined || value === '') {
    return { source: null, unrecognised: false };
  }
  const s = String(value);
  if (RACE_SOURCES.includes(s)) return { source: s, unrecognised: false };
  return { source: null, unrecognised: true };
}
