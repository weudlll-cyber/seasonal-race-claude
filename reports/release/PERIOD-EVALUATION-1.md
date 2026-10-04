# PERIOD-EVALUATION-1 — the period evaluation, built to the row

**2026-10-04, branch `feat/period-evaluation` (NOT merged until the owner has looked).** Built to the
PERIOD EVALUATION row in `docs/BACKLOG.md` (commissioned 2026-09-25). **Part one** below is the first
build and its eleven questions. **The owner answered all eleven the same day; part two is the build
that follows his answers, and where the two disagree, part two is current.**

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

## The eleven questions, as asked (all answered 2026-10-04 — see part two)

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

## Part two — the owner's answers of 2026-10-04, built

**His answers**, recorded as given:

| # | question | the owner's answer, 2026-10-04 | where it is now |
| --- | --- | --- | --- |
| 1 | the same name | match **ignoring case and surrounding or repeated spaces** | `shared/playerNames.mjs`, `playerNameKey` — ONE helper, used by the evaluation and by every roster refusal below |
| 2 | a name twice in one race | **not allowed** | refused on every roster path (table below); the server answers **400** |
| 3 | the order | **wins, then 2nd places, then 3rd places, then races** | `compareEvaluationRows` in `server/src/races/periodEvaluation.js`; a tie on all four is broken by the name |
| 4 | the podium | **places 1–3** | unchanged |
| 5 | the default period | **the current month** | first day to last day of the current month |
| 6 | the time zone | **UTC** | a day runs 00:00 to 00:00 UTC, whatever the computer's own zone |
| 7 | racers who did not finish | **only completed races count — no DNF** | a result without a finishing time adds nothing to that name, not even a race |
| 8 | where it lives | **stays a Dev Screen section** | unchanged |
| 9 | the points rule | **server-wide: stored on the server, readable by every signed-in user, editable by admins only** | `server/src/races/pointsRule.js`; `GET` and an admin-only `PUT /api/races/evaluation/points-rule` |
| 10 | long periods | **more than 366 days is refused, with a clear message** | the server answers 400; the section says so before asking |
| 11 | who may see it | **not admin-only** | unchanged: every signed-in user, for their own team |

### What changed

- **The table** has two more columns, **2nd** and **3rd**, because they now decide the order. With
  points on, it is ordered by points, and the decided order settles equal points. *His answer did
  not mention points; ordering a points table by anything else would be strange, so this is a
  judgement — say if it should be the decided order even then.*
- **Names:** "Ada", " ada " and "ADA" are one row, shown as first written in the period (trimmed,
  spaces collapsed). A race stored before the refusal existed may still carry a name twice; it
  counts once, at its better place.
- **The points rule moved to the server.** One JSON file in the data directory
  (`period-points-rule.json`), off with an empty ladder until an admin saves one. **The browser key
  and its loader are gone:** `PERIOD_EVALUATION_CONFIG` in `storage.js` and
  `DEFAULT_PERIOD_EVALUATION_CONFIG` in `defaults.js` are removed, and both files are back to
  master's content. On the Dev Screen, a non-admin sees the two controls **disabled**, with the
  note *"The points rule is the same for everyone on this server. Only an admin can change it."*; an
  admin gets a **Save points rule** button.
- **The route policy:** `PUT /api/races/evaluation/points-rule` is an admin entry in `ROUTE_POLICY`
  (`server/src/auth/guards.js`). Without it the drift test fails on its own — a PUT under
  `/api/races` is on no operator allowlist — and a new pin states both halves (setting is admin,
  reading is not).
- **The image** carries the new shared module: named in `server/Dockerfile` and the root
  `.dockerignore`, as every file of `shared/` must be.

### The same name twice — every roster path

| path | where | before | now |
| --- | --- | --- | --- |
| typing a name on the setup screen | `client/src/screens/SetupScreen/PlayerSetup.jsx:41` | **allowed** | refused, naming the name (`player-name-error`, the same line an over-long name uses) |
| adding a player group | `client/src/screens/SetupScreen/PlayerGroupPicker.jsx:83` | **already refused in part:** a name already in the field was not added twice, with a notice — but compared exactly, and a name the group itself carried twice passed | the same refusal, reused: compared by the shared rule, and covering a name doubled inside the group |
| a roster arriving whole — the Dev Screen's *Load to Setup* | `SetupScreen.jsx:226` (hand-off), gate at `:365` | **allowed** | the start line refuses: a warning naming the name (`doubled-name-refusal`), Start disabled with the same sentence, and the click handler refuses too (`:930`) |
| a race identifier (also what *Run again* and a looked-up short key put in the field) | `SetupScreen.jsx:841` | **allowed** | refused at Start, naming the name (`identifier-error`) |
| Quick Test | `SetupScreen.jsx:1044` (refusal), `:1059` (fill) | **already refused in part:** a fill name already in the field was skipped — compared exactly | the fill compares by the shared rule, and Quick Test is refused while the field holds a doubled name |
| the Track Editor's test race | `client/src/screens/TrackEditor/testRace.js:75` | a built-in list | unchanged — the three built-in lists were checked: **no doubled name** under the new rule |
| saving a player group on the Dev Screen | `client/src/screens/DevScreen/sections/PlayerGroupsManager.jsx:106` | **allowed** | refused, naming the name |
| the server: a player group | `server/src/routes/playerGroups.js:94` | **allowed** | **400**, naming the name |
| the server: a race upload | `server/src/races/raceStore.js:274` (via `POST /api/races`) | **allowed** | **400** `INVALID_ROSTER`, naming the name, nothing stored |

**Which refused before:** two, both in part and both by silent skipping with exact comparison — the
group picker (with a notice) and the Quick Test fill (without one). **Which refuse now:** every path
above, with the same sentence from `doubledNamesMessage`: *"The name "Ada" is in this race twice.
Every racer needs a different name (capitals and extra spaces do not make a name different)."*

**A consequence worth knowing:** a race stored before today with a name twice can no longer be run
again from its key or identifier — it is refused with that sentence. That follows from his rule; a
repeat that ran anyway could not be stored.

### Tests and sabotage (part two)

| test | sabotage | went red |
| --- | --- | --- |
| `periodEvaluation.test.js` — names match ignoring case and spaces | names compared raw | yes |
| — no DNF: a non-finisher adds nothing | non-finishers counted | yes |
| — the order: wins, 2nds, 3rds, races — not podiums | ordered by podiums | yes |
| — a period of 367 days is refused with the sentence | the limit removed | yes |
| — a points rule that does not check out is refused whole | negative points accepted | yes |
| `routePolicyDrift.test.js` — setting the rule is admin, reading is not | the policy entry pointed elsewhere | yes (the pin and the drift check both) |
| `doubledNames.test.js` (server) — a race upload with a name twice → 400 | the store's refusal removed | yes |
| — a player group with a name twice is refused | the group refusal removed | yes |
| `doubledNames.test.jsx` (client) — typing a doubled name is refused | the typing refusal removed | yes |
| — a group adds no doubled name | the picker compares raw | yes |
| — a whole roster with a name twice cannot start; Quick Test refused too | the start gate removed | yes (three tests) |
| — an identifier with a name twice is refused | the identifier refusal removed | yes |
| `PeriodEvaluation.test.jsx` — a non-admin sees the controls disabled, with the note | everyone treated as admin | yes |
| — whole UTC days are asked for | a day started at +05:00 | yes |
| — over 366 days is refused before asking | the client limit removed | yes |
| `PlayerGroupsManager.test.jsx` — a group with a name twice is refused | the refusal removed | yes |

Every sabotage was checked to have applied (the mutated text found exactly once) before its run, and
the tree was compared before and after: unchanged.

**The camera measurements.** The branch's first commit had touched `defaults.js` and `storage.js`,
which both MEASURED stamps import, so both were re-run on this tree: **identical to the digit**
(tracking-lag four rows and 2.89×; straggler-truth four rows). **`engine-reach`:** no path of this
part can reach the race.

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
| `client/src/modules/storage/defaults.js` | 1642 | 1651, and **1642** after part two (back to master) |
| `client/src/modules/storage/storage.js` | 161 | 162, and **161** after part two (back to master) |
| `client/src/screens/DevScreen/DevScreen.jsx` | 308 | 319 |
| `client/src/services/racesApi.js` | 95 | 110 |

## Noticed and left

- **`B-UX2`'s sequencing note.** It says these controls belong in the reorganised Dev Screen. The
  brief of 2026-10-04 asked for them on the Dev Screen, so they are in today's. Question 8 asks
  where they should end up.
- **The browser gate does not cover the new section**, because no browser spec opens it. Its
  behaviour is covered by the component and server tests above.

**Part two:**

| file | before | after |
| --- | --- | --- |
| `shared/playerNames.mjs` | new | 71 |
| `server/src/races/pointsRule.js` | new | 84 |
| `server/src/races/doubledNames.test.js` | new | 114 |
| `server/src/races/periodEvaluation.js` | 62 | 91 |
| `server/src/races/periodEvaluation.test.js` | 149 | 268 |
| `server/src/routes/races.js` | 174 | 202 |
| `server/src/routes/playerGroups.js` | 196 | 202 |
| `server/src/races/raceStore.js` | 601 | 612 |
| `server/src/auth/guards.js` | 184 | 192 |
| `client/src/screens/DevScreen/sections/PeriodEvaluation.jsx` | 173 | 264 |
| `client/src/screens/DevScreen/sections/PeriodEvaluation.test.jsx` | 71 | 147 |
| `client/src/screens/SetupScreen/SetupScreen.jsx` | 1806 | 1849 |
| `client/src/screens/SetupScreen/PlayerSetup.jsx` | 135 | 144 |
| `client/src/screens/SetupScreen/PlayerGroupPicker.jsx` | 198 | 210 |
| `client/src/screens/SetupScreen/doubledNames.test.jsx` | new | 190 |
| `client/src/screens/DevScreen/sections/PlayerGroupsManager.jsx` | 328 | 337 |
| `client/src/services/racesApi.js` | 110 | 136 |

**Noticed and left:** `PlayerGroupsManager.test.jsx` carries two test titles in German (`zeigt sofort
Fehlermeldung…`, `normaler (nicht-default) Eintrag…`). They predate this work and are not owner
quotations; the language rule says they should be English. Not changed here, to keep this branch to
its subject.
