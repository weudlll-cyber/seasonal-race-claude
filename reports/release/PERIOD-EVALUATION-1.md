# PERIOD-EVALUATION-1 — the period evaluation, built to the row

**2026-10-04, branch `feat/period-evaluation` (NOT merged). The owner's working tree is not on it;
he will look later.** Built to the PERIOD EVALUATION row in `docs/BACKLOG.md` (commissioned
2026-09-25).

## What the row asks, and where each part is

| the row | built as |
| --- | --- |
| a table over a period the user chooses, of the races run in it | Dev Screen → **Period Evaluation** (`client/src/screens/DevScreen/sections/PeriodEvaluation.jsx`): a From and a To date, *Evaluate this period*, a table |
| it counts NAMES — the same name in two races is one row | `server/src/races/periodEvaluation.js`, `evaluatePeriod`: one row per name, with races, wins, podiums and how often each place was reached |
| QUICK TESTS DO NOT COUNT (hard requirement) | the same module filters with `isRealRace` (`shared/raceSource.mjs`). A race with no marker is left out too ("absent is not real"), and the count of what was left out is shown |
| the races are per team | the store's new `listRacesInPeriod(team, from, to)` (`server/src/races/raceStore.js`), served by `GET /api/races/evaluation?from=&to=` (`server/src/routes/races.js`). The team comes from the session, as for every race read |
| the points rule is a setting, chosen per evaluation, with NO numbers adopted | `DEFAULT_PERIOD_EVALUATION_CONFIG` in `defaults.js`: **off, with an empty ladder**. Two controls in the same section: *Award points* and *Points per place*. A Points column appears only when the rule is on AND carries a ladder (`client/src/modules/periodPoints.js`) |

**By default** the table shows **Name · Races · Wins · Podiums**, and no points.

## Tests and sabotage

**Server** — `server/src/races/periodEvaluation.test.js`, 8 tests: the counting rule, the store's
period window, and the route.

| sabotage | went red |
| --- | --- |
| `race.raceSource === 'quick-test'` in place of `!isRealRace(...)` (the inversion the row warns of) | "ABSENT IS NOT REAL" |
| the window closed at `to` (`<=` for `<`) | "includes `from`, excludes `to`…" |
| the route declared after `/:shortKey` | all three route tests: "evaluation" was read as a short key |

**Client** — `periodPoints.test.js` (4) and `PeriodEvaluation.test.jsx` (3).

| sabotage | went red |
| --- | --- |
| points always on | "ships OFF…", "active only when…", "by default shows … NO points column" |
| the last day not counted whole | "asks for whole local days…" |

**Suites:** client 4979 passed, server 888 passed. **`engine-reach`** names `defaults.js` and
`storage.js` as able to reach the race, so all four fingerprints were verified with `--mint`:
**unchanged**.

## ★ The choices the row left open — questions for the owner

Each was built the plainest way and can be changed in one place.

1. **What is "the same name"?** Built: exactly as stored — "Ada" and "ada" are two rows, and so are
   "Ada" and "Ada " if a trailing space was ever stored. Should names match ignoring case and
   spaces?
2. **A name entered twice in ONE race** (two racers with the same name): built as two results for
   that name. Should it count once?
3. **The order of the table.** Built: wins, then podiums, then races, then name; with points on, by
   points. What decides a tie?
4. **What a "podium" is.** Built: places 1 to 3.
5. **The default period.** Built: from the first day of the current month to today. Should it be
   something else, such as the last 30 days, or remember the last period chosen?
6. **The time zone of a day.** Built: the browser's own. A day is whole in the computer the
   evaluation is run on.
7. **Racers who did not finish.** A stored race lists every racer in finishing order, with the ones
   who did not cross after them. Built: they count as having raced, at the place the list gives
   them. Should they be left out?
8. **Where it lives.** Built as a Dev Screen section in the OPERATOR tier, beside Race History. The
   row's own sequencing note says its controls belong in the reorganised Dev Screen (`B-UX2`), which
   is not built. Is the operator tier right, and should it later move to a screen of its own?
9. **The points rule's shape.** Built: points per place, 1st place first, a place beyond the list
   scoring 0, stored per browser like the other Dev Screen settings. Is that the rule, or should it
   also cover, say, the number of races?
10. **Very long periods.** The server reads every race of the period (no paging), which is right for
    an evaluation. Is there a longest period that should be refused?
11. **Who may see it.** Built: any signed-in user, for their own team — the same as the race list.
    Should it be admin-only?

## Lines before → after

| file | before | after |
| --- | --- | --- |
| `server/src/races/periodEvaluation.js` | new | 62 |
| `server/src/races/periodEvaluation.test.js` | new | 149 |
| `server/src/races/raceStore.js` | 578 | 601 |
| `server/src/routes/races.js` | 152 | 174 |
| `client/src/screens/DevScreen/sections/PeriodEvaluation.jsx` | new | 173 |
| `client/src/screens/DevScreen/sections/PeriodEvaluation.test.jsx` | new | 71 |
| `client/src/modules/periodPoints.js` | new | 51 |
| `client/src/modules/periodPoints.test.js` | new | 29 |
| `client/src/modules/storage/defaults.js` | 1642 | 1651 |
| `client/src/modules/storage/storage.js` | 161 | 162 |
| `client/src/screens/DevScreen/DevScreen.jsx` | 308 | 319 |
| `client/src/services/racesApi.js` | 95 | 110 |

## Noticed and left

- **`B-UX2`'s sequencing note.** It says these controls belong in the reorganised Dev Screen. The
  brief of 2026-10-04 asked for them on the Dev Screen, so they are in today's. Question 8 asks
  where they should end up.
- **The browser gate does not cover the new section**, because no browser spec opens it. Its
  behaviour is covered by the component and server tests above.
