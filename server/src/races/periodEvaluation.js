// ============================================================
// File:        periodEvaluation.js
// Path:        server/src/races/periodEvaluation.js
// Project:     RaceArena — PERIOD-EVALUATION-1 (2026-10-04)
// Description: The PERIOD EVALUATION the owner commissioned on 2026-09-25 (docs/BACKLOG.md): over a
//              period the user chooses, a table of the races run in it, counted by NAME.
//
// ── THE RULES, EACH THE OWNER'S DECISION OF 2026-10-04 UNLESS SAID OTHERWISE ────────────────────
//
// 1. QUICK TESTS DO NOT COUNT — the row's own hard requirement (2026-09-25). A race counts only
//    when its stored source says it is a real race: `isRealRace` from `shared/raceSource.mjs`, a
//    POSITIVE equality. A race with no marker (every race stored before 2026-09-25) is a test.
// 2. ONE NAME, ONE ROW, matched IGNORING CASE AND SURROUNDING OR REPEATED SPACES —
//    `playerNameKey` from `shared/playerNames.mjs`, the same rule that refuses a doubled name in a
//    roster. A row shows the name as it was FIRST written in the period (trimmed, spaces collapsed).
// 3. ONLY FINISHED RESULTS COUNT — no DNF. A racer who did not cross the line (`finishTimeMs` is
//    null; the stored order lists them after every finisher) adds nothing to that name's row, not
//    even a race. Places are therefore counted among finishers only, which they are already: the
//    stored `results` are in finishing order with the finishers first.
// 4. THE SAME NAME TWICE IN ONE RACE is not allowed any more, and every roster path refuses it. A
//    race stored BEFORE that refusal may still carry one; it counts ONCE, at its better place.
// 5. PODIUM = places 1 to 3 (`PODIUM_PLACES`, shared/podium.mjs).
// 6. THE ORDER: wins, then 2nd places, then 3rd places, then races. A tie on all four is broken by
//    the name, so the table is the same every time it is asked for.
// 7. NO POINTS ARE COMPUTED HERE. The points rule is a server-wide setting (`pointsRule.js`) that
//    the client applies to `places`.
// ============================================================

import { isRealRace } from '../../../shared/raceSource.mjs';
import { playerNameKey } from '../../../shared/playerNames.mjs';
import { PODIUM_PLACES } from '../../../shared/podium.mjs';

/** Did this result cross the line? See rule 3. */
const finished = (result) => result?.finishTimeMs != null;

/** Rule 6 — the one order of the evaluation's rows. */
function compareEvaluationRows(a, b) {
  return (
    b.wins - a.wins ||
    (b.places[2] ?? 0) - (a.places[2] ?? 0) ||
    (b.places[3] ?? 0) - (a.places[3] ?? 0) ||
    b.races - a.races ||
    a.name.localeCompare(b.name)
  );
}

/**
 * Evaluate the races of one period.
 *
 * @param {Array<{raceSource?: string|null, results: Array<{name: string, finishTimeMs?: number|null}>}>} races
 *   the period's races, oldest first, each with `results` in finishing order (as the store returns them)
 * @returns {{ counted: number, quickTestsExcluded: number,
 *   rows: Array<{ name: string, races: number, wins: number, podiums: number,
 *                 places: Record<number, number> }> }}
 */
export function evaluatePeriod(races) {
  const byKey = new Map();
  let counted = 0;
  let excluded = 0;
  for (const race of races) {
    if (!isRealRace(race.raceSource)) {
      excluded++;
      continue;
    }
    counted++;
    const seenInRace = new Set();
    race.results.forEach((result, i) => {
      if (!finished(result)) return;
      const key = playerNameKey(result.name);
      if (!key || seenInRace.has(key)) return; // rule 4: the better place is the earlier one
      seenInRace.add(key);
      const place = i + 1;
      let row = byKey.get(key);
      if (!row) {
        row = {
          name: result.name.trim().replace(/\s+/g, ' '),
          races: 0,
          wins: 0,
          podiums: 0,
          places: {},
        };
        byKey.set(key, row);
      }
      row.races++;
      if (place === 1) row.wins++;
      if (place <= PODIUM_PLACES) row.podiums++;
      row.places[place] = (row.places[place] ?? 0) + 1;
    });
  }
  const rows = [...byKey.values()].sort(compareEvaluationRows);
  return { counted, quickTestsExcluded: excluded, rows };
}
