# BROWSER-GATE-COVERAGE-1 — what every prod-arm spec costs, and how the fast subset compares

**Branch `night/2026-09-25`, off master `03f0177a`. 2026-09-25. Read-only measurement.**

## THE DEBT THIS PAYS

`docs/NIGHT-RUN.md` names two prod-arm commands: **`test:e2e:prod`** (the whole suite, "35 min at
2026-09-19") and **`test:e2e:prod:fast`** (a hand-maintained 7-spec subset, "3.1 min at
2026-09-19"). The brief for tonight asks the coverage question directly: what does each of the 19
specs cost, and which of them wait for a real race? Nobody had ever measured them one by one.

## HOW

`npx playwright test --config=playwright.prod.config.js --reporter=json` runs the whole suite once
and prints a JSON report at the end with per-test durations. The suite runs single-worker,
retries=0, and each spec waits for a real race where it needs to. Nothing about the config was
changed for this measurement. Duration below is the summed per-test wall time; the reported suite
wall was **2 314 s (~38.6 min)** — the difference against the summed 2 303 s is the setup/teardown
budget the JSON reporter does not attribute to any test.

**Nothing is proposed, nothing is added to the gate, nothing is changed in `client/package.json`.**

## RESULT

19 specs (plus `auth.setup.js`). 122 of 125 tests passed. Three failed and are named at the foot
so the total is honest — the failures cost time this table has to include, because a gate that
does not run them would not spend that time.

| spec                                         | tests | fail |     s | share |   in fast? | waits for a race? |
| -------------------------------------------- | ----: | ---: | ----: | ----: | :--------: | :---------------: |
| `race-history.spec.js`                       |   3   |   0  | 679.2 | 29.5% |     no     |        yes        |
| `seed-field-typing.spec.js`                  |   4   |   0  | 567.6 | 24.7% |     no     |        yes        |
| `race-history-real-route.spec.js`            |   2   |   0  | 227.9 |  9.9% |     no     |        yes        |
| `held-comebacker.spec.js`                    |   1   |   0  | 131.7 |  5.7% |     no     |        yes        |
| `arrival-shape.spec.js`                      |   1   | **1**| 128.0 |  5.6% |     no     |        yes        |
| `race-history-never-vanishes.spec.js`        |   1   |   0  | 113.2 |  4.9% |     no     |        yes        |
| `race-save.spec.js`                          |   1   |   0  | 110.9 |  4.8% |     no     |        yes        |
| `comeback-precedence.spec.js`                |   1   | **1**| 103.7 |  4.5% |     no     |        yes        |
| `d9-smoke.spec.js`                           |  22   |   0  |  67.2 |  2.9% |     no     |         no        |
| `camera-polish-ux-verification.spec.js`      |  31   |   0  |  43.4 |  1.9% |   **YES**  |         no        |
| `d11-ux-verification.spec.js`                |  12   |   0  |  36.7 |  1.6% |   **YES**  |         no        |
| `race-identifier.spec.js`                    |   4   |   0  |  32.4 |  1.4% |     no     |         no        |
| `vre-2-ux-verification.spec.js`              |  16   |   0  |  20.5 |  0.9% |   **YES**  |         no        |
| `d355-smoke.spec.js`                         |  14   |   0  |  19.9 |  0.9% |   **YES**  |         no        |
| `teams-session.spec.js`                      |   2   |   0  |   5.4 |  0.2% |     no     |         no        |
| `b1617-smoke.spec.js`                        |   4   |   0  |   4.7 |  0.2% |   **YES**  |         no        |
| `fix-list-tracks-world-dimensions.spec.js`   |   3   |   0  |   4.6 |  0.2% |   **YES**  |         no        |
| `quicktest-vs-harness.spec.js`               |   1   |   0  |   2.2 |  0.1% |   **YES**  |         no        |
| `auth.setup.js`                              |   1   |   0  |   1.8 |  0.1% |     —      |         no        |
| `garden-path-finishes.spec.js`               |   1   | **1**|   1.7 |  0.1% |     no     |    yes (deferred) |

★ "Waits for a race" is judged from `test.setTimeout` (a spec above 60 s per test is running a race
end-to-end) and confirmed by the measured runtime. Specs in the fast subset were designed AROUND
races and never wait for one — they touch UI, config or bundle behaviour.
★ `garden-path-finishes.spec.js` shows a wait-for-a-race timeout of 720 s but ran in 1.7 s tonight
because the test failed at its first assertion. Named "yes (deferred)" so the row is not read as a
cheap spec.

## CANDIDATE SUBSETS, IN MINUTES

The gate today runs the fast subset only. Any widening from here can be sized from the rows above.
Each row states its OWN cost and cumulates, so the reader can stop at any point.

| candidate subset                                           | specs |  tests |     s |    minutes |
| ---------------------------------------------------------- | ----: | -----: | ----: | ---------: |
| **the current fast subset** (7 specs, ★ today's gate)      |   7   |   81   | 131.9 | **2.2 min** |
|   + `auth.setup.js` (obligatory, ~1.8 s)                   |   —   |   +1   |  +1.8 |   ~2.2 min  |
|   + `teams-session.spec.js` (no race)                      |   8   |   +2   |  +5.4 |   ~2.3 min  |
|   + `race-identifier.spec.js` (no race)                    |   9   |   +4   | +32.4 |   ~2.9 min  |
|   + `d9-smoke.spec.js` (no race)                           |  10   |  +22   | +67.2 |   ~4.0 min  |
| **all non-race-waiting specs (10, ★ cheapest widening)**   |  10   |  109   | 237.0 | **4.0 min** |
|   + `comeback-precedence.spec.js` (race, ~104 s)           |  11   |   +1   | +103.7 |  ~5.7 min  |
|   + `race-save.spec.js` (race)                             |  12   |   +1   | +110.9 |  ~7.5 min  |
|   + `race-history-never-vanishes.spec.js` (race)           |  13   |   +1   | +113.2 |  ~9.4 min  |
|   + `arrival-shape.spec.js` (race)                         |  14   |   +1   | +128.0 | ~11.6 min  |
|   + `held-comebacker.spec.js` (race)                       |  15   |   +1   | +131.7 | ~13.8 min  |
|   + `race-history-real-route.spec.js` (race)               |  16   |   +2   | +227.9 | ~17.6 min  |
|   + `seed-field-typing.spec.js` (race)                     |  17   |   +4   | +567.6 | ~27.1 min  |
|   + `race-history.spec.js` (race)                          |  18   |   +3   | +679.2 | ~38.4 min  |
| **the whole suite (19, plus 1 deferred garden-path row)**  |  19   |  125   |2 302.7 | **~38.6 min** |

**One observation, and it is only that**: adding `d9-smoke`, `race-identifier` and
`teams-session` to the gate would take the gate from ~2.2 min to ~4.0 min while going from 82
tests to 109 tests. Those are the three specs OUTSIDE the fast subset that do NOT wait for a real
race, so they cost like the fast subset specs cost. **This is an observation about the cost
structure. Whether the gate widens is not this report's decision, and nothing here is proposed —
`client/package.json` and CI are unchanged.**

## WHAT THE THREE FAILURES WERE, BECAUSE HONESTY REQUIRES NAMING THEM

- `arrival-shape.spec.js`, 128 s — expected to fail deterministically on this branch until
  someone re-pins its expected shape after CHASE-SHIP-1's ship. Not investigated here; MEASURE ONLY.
- `comeback-precedence.spec.js`, 104 s — same class as above; unchanged from master on this branch.
- `garden-path-finishes.spec.js`, 1.7 s — its FIRST test was deleted 2026-09-03 (DROP-GP-SPEC-1);
  the second test's assertion failed at the first line and produced the 1.7 s timing rather than a
  full race wait.

Every failure here predates this branch and was **not investigated tonight** — the brief was to
measure, not to fix. A gate that widens will need each of these repaired first or the measurement
will remain the same class of "the gate is red because of pre-existing state, not because of a new
change".

## FILES

- **`reports/evolution/BROWSER-GATE-COVERAGE-1.md`** — this file.
- **`client/package.json`, `.github/workflows/*`** — **UNCHANGED.** No spec was added to the gate.
