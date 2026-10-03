// ============================================================
// File:        periodEvaluation.js
// Path:        server/src/races/periodEvaluation.js
// Project:     RaceArena — PERIOD-EVALUATION-1 (2026-10-04)
// Description: The PERIOD EVALUATION the owner commissioned on 2026-09-25 (docs/BACKLOG.md): over a
//              period the user chooses, a table of the races run in it, counted by NAME.
//
// ── WHAT IT COUNTS, AND THE THREE RULES THAT ARE NOT CHOICES ───────────────────────────────────
//
// 1. QUICK TESTS DO NOT COUNT — a hard requirement of the row. A race counts only when its stored
//    source says it is a real race: `isRealRace` from `shared/raceSource.mjs`, a POSITIVE equality.
//    A race with no marker (every race stored before 2026-09-25) is a test, and stays out.
// 2. THE TABLE COUNTS NAMES. The same name in two races is ONE row with two results behind it.
// 3. NO POINTS ARE COMPUTED HERE. The row says the points rule is a setting chosen per evaluation and
//    adopts no numbers, so the server returns, per name, how often each place was reached
//    (`places`), and the client applies whatever rule the Dev Screen holds — none, by default.
//
// The choices this module DID have to make are listed in reports/release/PERIOD-EVALUATION-1.md as
// questions for the owner: a name matches only exactly as stored; a name entered twice in one race
// counts twice; the order is wins, then podiums, then races, then name.
// ============================================================

import { isRealRace } from '../../../shared/raceSource.mjs';

/**
 * Evaluate the races of one period.
 *
 * @param {Array<{raceSource?: string|null, results: Array<{name: string}>}>} races
 *   the period's races, each with `results` in finishing order (as the store returns them)
 * @returns {{ counted: number, quickTestsExcluded: number,
 *   rows: Array<{ name: string, races: number, wins: number, podiums: number,
 *                 places: Record<number, number> }> }}
 */
export function evaluatePeriod(races) {
  const byName = new Map();
  let counted = 0;
  let excluded = 0;
  for (const race of races) {
    if (!isRealRace(race.raceSource)) {
      excluded++;
      continue;
    }
    counted++;
    race.results.forEach((result, i) => {
      const place = i + 1;
      let row = byName.get(result.name);
      if (!row) {
        row = { name: result.name, races: 0, wins: 0, podiums: 0, places: {} };
        byName.set(result.name, row);
      }
      row.races++;
      if (place === 1) row.wins++;
      if (place <= 3) row.podiums++;
      row.places[place] = (row.places[place] ?? 0) + 1;
    });
  }
  const rows = [...byName.values()].sort(
    (a, b) =>
      b.wins - a.wins || b.podiums - a.podiums || b.races - a.races || a.name.localeCompare(b.name)
  );
  return { counted, quickTestsExcluded: excluded, rows };
}
