# REPEAT-PROOF-1 — a repeat IS the same race, to the millisecond, through all three doors

> **THE OWNER'S WALKTHROUGH ITEM PASSES.** Through all three doors — the history row's button, a
> typed short key, and a pasted long identifier — every one of 20 racers finished at the **identical
> millisecond**, with this machine's Race Action deliberately switched from `quiet` to `wild`
> beforehand; and the `wild` control proves that setting would otherwise have changed the winner.

**Date:** 2026-09-07
**Branch:** `feat/team-races-1` @ `21bfe5c4`. **Not merged** — the owner merges once this reports PASS.
`night/2026-09-06` untouched.
**Fingerprints:** `node scripts/engine-reach.mjs --check reports/evolution/REPEAT-PROOF-1.md reports/evolution/INDEX.md`
→ verbatim:

```
 ENGINE REACH: none of 2 path(s) carry a change that can reach the race engine.
  2 outside the hull (cannot reach the engine at all): reports/evolution/REPEAT-PROOF-1.md, reports/evolution/INDEX.md
```

Golden races **PASS** — see Checks. ★ Worth stating rather than glossing: `npm run verify` **SKIPPED**
the standalone `golden-races` guard, correctly and out loud — *"nothing changed · declares 29 file(s)
by import closure"* — because this piece changes nothing the engine can reach. It was therefore run
explicitly, and the four `src/modules/parity/golden*.test.js` files passed inside the client suite as
well.

**Nothing was minted. Nothing was built, changed, or fixed.** No source file outside this report and
its index line was touched.

---

# PART 1 — the decisive test

## Which environment this proof was taken in — stated plainly

★ **It was taken on a PRODUCTION build, and NOT through the browser harness.** PROD-SAVE-1's finding
stands unchanged and is the reason: `playwright.config.js:38` pins `baseURL` to the **dev** server
and `playwright.config.js:78` starts the app with `npm run dev`, so **the harness cannot drive a
production build.** It was therefore driven by hand, exactly as PROD-SAVE-1 drove its own proof.

What was actually run, so a later reader can repeat it:

| | |
|---|---|
| client | `vite build` with `VITE_API_URL=http://localhost:4401`, i.e. **the production bundle** — `index-B-oU3DJf.js`, 910.60 kB / 272.01 kB gzip |
| served from | a **non-synced** out-directory under `AppData\Local\Temp` (never `client/dist`, which is inside OneDrive), on `:5401` |
| API | an **isolated** instance on `:4401` with its own `RA_DATA_DIR` under the scratchpad, seeded from `server/seeds` and given its own first account — the same isolation shape `playwright.config.js` uses |
| the owner's install | **never touched.** His API on `:4000` was left running and his `server/data/races.sqlite` was opened **read-only** for Part 2 and written to by nothing |
| build id in the bundle | `21bfe5c4` — the branch head |

**One honest caveat about the server, named rather than discovered later.** The bundle was served
with `vite preview`, not with `scripts/serve-production.mjs`, which VERIFY-RULES R10 requires for eye
tests and perf logs. R10 exists for *frame-timing fidelity* — `serve-production.mjs` copies out of the
synced tree because a OneDrive-backed `client/dist` produced a 1016 ms frame. That does not weaken
this proof, and the data says so: the four runs below took **99, 99, 99 and 100 s** of wall clock and
produced **bit-identical** physics. Frame timing moved; the race did not. The leave-behind on `:4173`
uses the project's own `serve-production.mjs` (end of report).

## What was done

1. A race was run and stored — Quick Test, City Circuit, 20 racers, 2 laps, drawn seed **9774**,
   Race Action **`quiet`** (the shipped default, `defaults.js:47`). Short key **`4395YU`**.
2. ★ **The setting was then changed**: Race Action `quiet` → **`wild`** on the Dev Screen
   (`DevScreen/sections/RaceDefaults.jsx`). Confirmed in the store:
   `racearena:raceDefaults → "raceActionStage":"wild"`. `wild` moves **both** of the stage's keys —
   `pulkChallengerBoost` to 0.12 and `pulkLeaderBrake` to 0.15 (`defaults.js:1162-1165`).
3. The stored race was repeated through all three doors, in this order, with the machine left on
   `wild` throughout.
4. Every racer's finishing time was compared **at full precision**, from the server rows.

## The three doors, and that each was a genuinely different path

| door | what was done | evidence it took its own path |
|---|---|---|
| **A — the row button** | Dev Screen → Race History → **Run again** on row `4395YU` | `repeatRace.armRepeat` wrote the identifier to `KEYS.RACE_SEED` and the screen adopted it; navigated straight to `/race` |
| **B — the typed short key** | `4395YU` typed **character by character** into the seed field, then **find this race**, then **Start Race** | the screen showed *"That looks like a race key. 4395YU"*, then the lookup replaced it with `RA1-…`; `handleStartRace` refuses a key that has not been looked up (`SetupScreen.jsx:884`) |
| **C — the pasted long identifier** | field **cleared to empty first**, then the 3,703-character `RA1-…` string delivered as a paste (native value setter + `InputEvent{inputType:'insertFromPaste'}`) | field value `""` before, 3,703 after; the screen answered *"Ready: this identifier runs 20 racers on custom-a698039d-…, seed 9774. It supplies the racers, the track and the settings — **nothing on this screen is used**."* This is the pasted-string path, checked against the **running** build |

## ★ Every racer, finishing time in milliseconds — original against each repeat

Read from the server rows, not from the screen. Not rounded.

| pos | racer | idx | ORIGINAL `4395YU` | door A `BQA6TZ` | door B `QYMJTG` | door C `2JSFVF` | max Δ ms |
|---|---|---|---|---|---|---|---|
| 1 | Apex | 14 | 78480 | 78480 | 78480 | 78480 | 0 |
| 2 | Dash | 18 | 78768 | 78768 | 78768 | 78768 | 0 |
| 3 | Blitz | 13 | 78848 | 78848 | 78848 | 78848 | 0 |
| 4 | Surge | 17 | 78864 | 78864 | 78864 | 78864 | 0 |
| 5 | Blaze | 1 | 79152 | 79152 | 79152 | 79152 | 0 |
| 6 | Nitro | 6 | 79168 | 79168 | 79168 | 79168 | 0 |
| 7 | Rocket | 2 | 79216 | 79216 | 79216 | 79216 | 0 |
| 8 | Ridge | 15 | 79248 | 79248 | 79248 | 79248 | 0 |
| 9 | Storm | 10 | 79376 | 79376 | 79376 | 79376 | 0 |
| 10 | Speedy | 4 | 79408 | 79408 | 79408 | 79408 | 0 |
| 11 | Nova | 19 | 79440 | 79440 | 79440 | 79440 | 0 |
| 12 | Bolt | 8 | 79584 | 79584 | 79584 | 79584 | 0 |
| 13 | Thunder | 5 | 80832 | 80832 | 80832 | 80832 | 0 |
| 14 | Turbo | 0 | 81056 | 81056 | 81056 | 81056 | 0 |
| 15 | Flare | 16 | 81376 | 81376 | 81376 | 81376 | 0 |
| 16 | Comet | 11 | 81696 | 81696 | 81696 | 81696 | 0 |
| 17 | Arrow | 12 | 82128 | 82128 | 82128 | 82128 | 0 |
| 18 | Drift | 7 | 82592 | 82592 | 82592 | 82592 | 0 |
| 19 | Zephyr | 9 | 82992 | 82992 | 82992 | 82992 | 0 |
| 20 | Flash | 3 | 83040 | 83040 | 83040 | 83040 | 0 |

**Plainly: every value is identical.** Racers whose finishing time or name differs anywhere:
**0 of 20**. The `results` JSON of all four rows is **byte-identical**, as are `winners` and
`world_configs`. Finishing ORDER is identical position by position. This race has **20 distinct
finishing times** — no ties — so the order is decided by the times alone and nothing is being hidden
by a tie-break.

Every stored input agrees too — `identifier_version`, `build_id` `21bfe5c4`, `geometry_id`,
`racer_type_id` `motorbike`, `race_plan_seed` 9774, **`race_action_stage` `quiet` on all four rows
while the machine sat on `wild`**, `race_plan_enabled`, `target_laps` 2, `target_duration_sec` null,
`world_schema_version` 2, `world_configs` (7,357 chars, byte-identical), `roster_id`,
`racer_types_id`.

## Elapsed seconds beside them — expected to differ, and they do

| run | door | key | finished at | `elapsedSec` | physics: last crossing | wall ÷ physics |
|---|---|---|---|---|---|---|
| 1 | ORIGINAL | `4395YU` | 17:14:58.381Z | **99 s** | 83.040 s | 1.192 |
| 2 | door A | `BQA6TZ` | 17:18:08.169Z | **99 s** | 83.040 s | 1.192 |
| 3 | door B | `QYMJTG` | 17:21:15.081Z | **99 s** | 83.040 s | 1.192 |
| 4 | door C | `2JSFVF` | 17:24:08.747Z | **100 s** | 83.040 s | 1.204 |

Door C shows **100 s where the others show 99 s, for a race that is bit-identical**. That single
second is the whole of Part 3 in one line: `elapsedSec` is wall clock, and the race is not.

Click-to-stored-row was **121.0 s, 121.1 s, 121.1 s and 122.4 s** — of which ~99 s is the race
proper and the remaining ~22 s is countdown, the ending phases and the podium ceremony.

## ★ The control — `wild` would in fact have changed this race

Without this, "the repeat matched" could be explained by the setting doing nothing. It does
something. The same track, the same 20 names, the same **seed 9774**, the same 2 laps — only the
stage differs:

| | `quiet` (the four rows above) | `wild` (`VCTSSS`, seed 9774) |
|---|---|---|
| winners | **Apex, Dash, Blitz** | **Surge, Apex, Dash** |
| P1 time | 78 480 ms | 79 232 ms |
| last crossing | 83 040 ms | 82 208 ms |
| `elapsedSec` | 99 s | 96 s |

**A different winner and a different time for every racer.** A second `wild` run at a drawn seed
(`EJVF64`, seed 2046) also recorded `race_action_stage: wild`, confirming the setting was live for
every new race on the machine at the time the three repeats were run.

## Verdict

**PASS.** The three doors reproduce a stored race exactly — order and every finishing time to the
millisecond — while the machine is set to a stage that provably produces a different race. The only
value that moves between a race and its repeat is `elapsedSec`, and Part 3 says why.

**What was reused, nothing built twice:** `repeatRace.armRepeat` / `takeArmedRepeat`, the identifier
encode/decode in `raceIdentifier.js`, `shared/raceShortKey.mjs` + the server's `shortKey.js` lookup,
`SetupScreen.startRaceFromIdentifier` (the one starter), the local `raceHistory` store and the
server `raceStore`, and the isolation shape of `playwright.config.js` (own port, own `RA_DATA_DIR`,
first account via bootstrap token). No harness, no helper and no script was added.

---

# PART 2 — the owner's own two runs, read-only

Both rows were read from **his** `server/data/races.sqlite`, opened **read-only**
(`new DatabaseSync(path, { readOnly: true })`). Nothing was deleted, rewritten or re-run; no copy
was needed, so none was made.

The two rows are `DJ3ZMF` (2026-09-07T15:09:34.824Z, `elapsed_sec` 45) and `NU3Q2U`
(15:48:58.364Z, `elapsed_sec` 44) — 17:09:34 and 17:48:58 in his local time.

## Every input

| field | DJ3ZMF | NU3Q2U | same? |
|---|---|---|---|
| identifier_version | 1 | 1 | YES |
| build_id | caf8768a | caf8768a | YES |
| geometry_id | custom-a698039d-f1aa-4a7c-a5e0-3a60958526e0 | same | YES |
| racer_type_id | motorbike | motorbike | YES |
| race_plan_seed | 1095 | 1095 | YES |
| race_action_stage | quiet | quiet | YES |
| race_plan_enabled | 1 | 1 | YES |
| target_laps | 1 | 1 | YES |
| target_duration_sec | (null) | (null) | YES |
| world_schema_version | 2 | 2 | YES |
| world_configs (7,354 chars) | — | — | **YES — byte-identical** |
| roster_id | e7f2c606…1afb88e2 | same | YES |
| racer_types_id | a151c223…9c0c3970 | same | YES |
| team_normalized | seasonal entertainment | same | YES |
| winners | ["Arrow","Flare","Surge"] | same | YES |
| **elapsed_sec** | **45** | **44** | **NO — wall clock only, see Part 3** |

## ★ Every racer, finishing time in milliseconds

All 40, in finishing order. `Δ` is NU3Q2U − DJ3ZMF.

| pos | racer | idx | DJ3ZMF | NU3Q2U | Δ ms | | pos | racer | idx | DJ3ZMF | NU3Q2U | Δ ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Arrow | 36 | 38016 | 38016 | 0 | | 21 | Blitz | 5 | 41072 | 41072 | 0 |
| 2 | Flare | 17 | 38848 | 38848 | 0 | | 22 | Atlas | 1 | 41152 | 41152 | 0 |
| 3 | Surge | 2 | 39056 | 39056 | 0 | | 23 | Shadow | 6 | 41152 | 41152 | 0 |
| 4 | Falcon | 29 | 39424 | 39424 | 0 | | 24 | Mercury | 9 | 41216 | 41216 | 0 |
| 5 | Dash | 22 | 39568 | 39568 | 0 | | 25 | Blaze | 12 | 41472 | 41472 | 0 |
| 6 | Maverick | 3 | 39680 | 39680 | 0 | | 26 | Phoenix | 34 | 41472 | 41472 | 0 |
| 7 | Vortex | 16 | 39840 | 39840 | 0 | | 27 | Titan | 32 | 41568 | 41568 | 0 |
| 8 | Turbo | 11 | 40096 | 40096 | 0 | | 28 | Pixel | 18 | 41744 | 41744 | 0 |
| 9 | Breeze | 10 | 40144 | 40144 | 0 | | 29 | Nitro | 33 | 41776 | 41776 | 0 |
| 10 | Phantom | 15 | 40176 | 40176 | 0 | | 30 | Eagle | 35 | 41872 | 41872 | 0 |
| 11 | Thunder | 13 | 40352 | 40352 | 0 | | 31 | Walter | 39 | 41872 | 41872 | 0 |
| 12 | Apex | 25 | 40384 | 40384 | 0 | | 32 | Ridge | 19 | 41888 | 41888 | 0 |
| 13 | Rocket | 31 | 40464 | 40464 | 0 | | 33 | Drift | 21 | 41952 | 41952 | 0 |
| 14 | Flash | 0 | 40672 | 40672 | 0 | | 34 | Orbit | 27 | 41968 | 41968 | 0 |
| 15 | Storm | 7 | 40752 | 40752 | 0 | | 35 | Comet | 14 | 42032 | 42032 | 0 |
| 16 | Gale | 4 | 40800 | 40800 | 0 | | 36 | Nova | 38 | 42160 | 42160 | 0 |
| 17 | Raven | 23 | 40832 | 40832 | 0 | | 37 | Raptor | 30 | 42336 | 42336 | 0 |
| 18 | Quasar | 26 | 40944 | 40944 | 0 | | 38 | Bolt | 20 | 42352 | 42352 | 0 |
| 19 | Zephyr | 8 | 40992 | 40992 | 0 | | 39 | Speedy | 37 | 42368 | 42368 | 0 |
| 20 | Swift | 28 | 41024 | 41024 | 0 | | 40 | Hawk | 24 | 42624 | 42624 | 0 |

**Rows differing in any field — name, index, lap, progress or finishing time: 0 of 40.** The
`results` JSON of the two rows is **byte-identical** (4,126 characters each). This race **does**
carry three ties — Atlas/Shadow at 41 152 ms, Blaze/Phoenix at 41 472 ms and Eagle/Walter at
41 872 ms — and each is broken the **same way round** in both rows. That is confirmation rather than
extra evidence: two racers crossing inside one 16 ms step are ranked by the loop's order over
`st.racers` (`raceCore.js:666-671`), i.e. by racer index, which is deterministic by construction —
1 before 6, 12 before 34, 35 before 39, in both rows.

## Verdict

★ **They are the same race.** Every input matches and every one of forty finishing times matches to
the millisecond. **The 45 s / 44 s difference is wall clock only** — one second of how long he sat
watching, not one millisecond of racing. Nothing diverges, so there is no first divergent field to
name, and there is no defect in the repeat.

A third row is worth noting because it is *not* a counter-example: `8EDU7R` (14:06:35Z, `elapsed_sec`
57) carries the **same seed 1095, same roster, same geometry and the same three winners in the same
order**, but was recorded under build `dd8eb948` rather than `caf8768a`. Its `results` are also
byte-identical to the pair. That is the identifier's build field doing exactly what it is for: the
build moved between the two, and the race did not.

---

# PART 3 — what `elapsedSec` is

★ **It is WALL CLOCK, measured while watching, rounded to whole seconds. It is not a property of the
simulation.**

The chain, with its address at each link:

1. **`client/src/screens/RaceScreen/index.jsx:1185`** — when the last racer crosses, the race screen
   writes the `raceResults` payload with:

   ```js
   elapsedTime: Math.round((ts - st.raceStart) / 1000),
   ```

   `ts` is the `requestAnimationFrame` frame timestamp, and `st.raceStart = ts`
   (**`index.jsx:993`**) is the frame on which RACING began. So the value is
   *(frame clock at the last crossing) − (frame clock at the start)*, in real seconds.
2. **`client/src/modules/raceHistory.js:87`** — the local entry takes it verbatim:
   `duration: parsed?.elapsedTime`.
3. **`client/src/modules/raceHistory.js:140`** — the server payload renames it:
   `elapsedSec: entry.duration`.
4. **`server/src/races/raceStore.js:321`** — it is stored as `elapsed_sec`, and read back at
   **`raceStore.js:415`**.
5. **`client/src/screens/DevScreen/sections/RaceHistory.jsx:74`** — the history table's **Duration**
   column reads `duration: race.elapsedSec`, and it is rendered at `RaceHistory.jsx:425` as `${row.duration}s`.

**Contrast, so the difference is unmistakable.** The per-racer finishing time is the *other* kind of
number entirely: **`client/src/modules/raceCore.js:672`** sets `r.finishTimeMs = physicsTs`, the
simulation clock, which advances in strict `FIXED_DT = 16 ms` quanta (`raceCore.js:51`) and is
frame-rate independent. That is why every table above is exact and this one column is not.

**The consequence, reported and not changed:** two runs of the same race **cannot** show the same
`elapsedSec` except by coincidence, and the Duration column is showing a person something they will
read as part of the race. Part 1 caught it happening — door C reads **100 s** for a race that is
bit-identical to three others reading 99 s; the owner's own pair reads 45 s and 44 s. ★ The column
was not changed, not rounded and not renamed.

---

# PART 4 — where the testing time goes

★ **No recommendation is made here and nothing was changed.** These are the numbers and what each
option would cost.

★ **Nothing here was re-run merely to put a stopwatch on it. Every run listed had its own reason, and
the reason is named so the reader can judge it:**

| run | why it happened | what it also measured |
|---|---|---|
| `npm run verify` | the check this piece owes | `client-suite 281.3s (ran alone)`, and which guards were skipped |
| `npm test` (client, direct) | verify prints only PASS + a duration, so it cannot show the breakdown; and the split experiment needed a **control arm from the same machine on the same evening** | the `Duration … environment …` line the owner quoted |
| the 137 pure files under jsdom, then under `--environment=node` | to find out whether the classification in question 2 is TRUE, which is a correctness question, not a timing one | the saving, and the one file that breaks |
| `seed-field-typing.spec.js` | the only artefact on disk for it recorded a **FAILURE**; this branch's headline fix had no green record here | question 4's whole split, and six live geometry drops |
| `check-golden-races.mjs` | `verify` skipped it, and the piece requires golden races to pass | the headless engine's cost |

Everything else is taken from what the runners already printed, from the report Playwright had
already written on 2026-09-02, from the six production-build races Part 1 ran for its own reasons,
and from the specs' own source.

## PART 4A — THE UNIT SUITE

### 1. What `environment` actually is, and how often it is created

**One simulated browser per TEST FILE — 252 of them per run.** Not per test, and not per worker.
Established at source:

- **`client/vitest.config.js:19`** sets `environment: 'jsdom'` for the whole project, and
  **zero of the 252 test files carry a `@vitest-environment` docblock**, so there is no file that
  opts out. All 252 get one.
- **`vitest/dist/chunks/base.RR7zL1h0.js:141-170`** — `setupBaseEnvironment` loads the environment
  package and calls `environment.setup(globalThis, …)`, timing the whole of it into
  `_environmentTime`, which **`base.RR7zL1h0.js:176`** hands to the reporter as
  `state.durations.environment`. **So the `ENVIRONMENT` figure is that timer summed over files — it
  is the cost of standing a jsdom up, not of running anything in it.** It also includes loading the
  jsdom package itself and the Node loader hooks, which is why it is large.
- **`vitest/dist/chunks/init.D98-gwRW.js:237`** — `worker.setup` runs once per `"start"` message,
  i.e. **once per worker process**, and
- **`vitest/dist/chunks/cli-api.Cjt90eJu.js:3459` and `:3502`** — a runner is put back on
  `sharedRunners` and reused **only when `task.isolate === false`**; otherwise `runner.stop()` is
  called after every task. `isolate` defaults to **`true`**
  (`vitest/dist/chunks/defaults.9aQKnqFk.js:47`) and this project does not set it.

**One file → one worker process → one `"start"` → one jsdom.** 252 files, 252 jsdoms per run.
**How many of the 252 files need one at all** is question 2.

### 2. How the 252 files split, and what a split would cost

Every test file was classified by whether it references any browser API at all — `@testing-library/react`,
`render(`, `document.`, `window.`, `localStorage`, `sessionStorage`, `navigator.`, canvas/SVG,
`requestAnimationFrame`, observers, or a `.jsx` import.

| | files |
|---|---|
| reference a browser API — **need jsdom** | **115** |
| reference none — **pure logic on today's evidence** | **137** |
| total | **252** |

Where the 137 sit: `src/modules/racer-types` (31), `src/modules/camera` (26),
`src/screens/RaceScreen` (17 — the physics and endgame maths, not the component),
`src/modules/parity` (6), four small directories (`track-editor` 3, `TrackEditor` 3, `branding` 2,
`diagnostics` 2), and **47 lone files** spread across `src/modules`, `src/screens`, `src/services`
and `src/utils`. 31 + 26 + 17 + 6 + 10 + 47 = 137.

★ **This is a STATIC classification, and it was then MEASURED rather than trusted.** A file that names
no browser API can still *import* a module that touches one at load. All 137 were run under
`--environment=node`: **136 passed, 1 failed.** The measurement, the saving and the file that broke
are in 4-A-2 below.

**★ WHAT THE SPLIT WOULD COST, per group — this is the part that must not be assumed harmless:**

- **`src/modules/camera` (26 files).** The camera reads viewport geometry and, in the live path,
  `requestAnimationFrame`. Moved out of jsdom, these files stop being able to prove anything about
  the camera *as mounted* — they would prove the geometry functions only. Given
  `project_camera_nondeterminism` (the camera has its own `Math.random()` seed and diverges on any
  frame-timing change), that is a group where "it passed in Node" and "it behaves in a browser" are
  already known to be different questions.
- **`src/screens/RaceScreen` (17 files).** These test the physics core, which is deliberately
  frame-rate independent (`raceCore.js` header; and Part 1 above is a live demonstration —
  99/99/99/100 s of wall clock, bit-identical physics). This is the group where the cost is
  genuinely lowest. But it is also the group where a future test *would* legitimately want to mount
  the screen, and a `environment: node` marker on the directory is a trap for whoever writes it.
- **`src/modules/racer-types` (31 files).** Registry and table data. The cost here is that sprite
  geometry checks which today could reach `Image`/canvas would silently become unable to.
- **`src/services` (6 files).** These stub `fetch`. Node has `fetch`, so they would run — but they
  would stop exercising the browser's `credentials: 'include'` cookie semantics, which is what the
  API layer's whole session behaviour rests on. ★ **Measured: all six passed. The file that actually
  broke was `src/modules/serverStatus.test.js`, which I had classified as safe** — see 4-A-2. The
  hazard is real; it was simply not where reading the imports suggested.
- **Across all groups:** the deeper cost is that the split becomes a **standing rule a new test has
  to know about**. This project has already paid for one of those (`auth.setup.js`'s header: a
  helper a spec author can forget, whose failure mode looks like an unrelated bug). A per-directory
  environment marker has exactly that shape.

### 3. Does the suite run in parallel, and what bounds it

Yes — **4 workers**, and the bound is written down with its measurement in
**`client/vitest.config.js:57`**: `maxWorkers: 4`. The comment records nine runs in three arms:
unbounded gave 14 and then 6 failures with the worst test at 10,457 ms against a 5,000 ms default
timeout; bounded to 4 gave **0 failures**, worst 4,402 ms. **It costs about 29% wall clock
(313 s → 403 s mean) and the owner accepted that on 2026-08-27.** `retry: 0` (`vitest.config.js:63`),
so nothing is hidden by a second attempt — this run's ledger line was
`RETRY LEDGER: DISABLED — retry is 0`.

The other half of the bound is scheduling: `scripts/verify.mjs:338` marks `client-suite`
**`exclusive: true`**, so it runs alone. This run's line: `PASS client-suite 281.3s (ran alone)`,
inside a `wall clock 311.3s` verify.

### 4-A. The measured numbers

Four runs. The first is the `verify` this piece owes; the second is the control the split experiment
needed; the third and fourth are that experiment's two arms.

| run | files | tests | **wall** | transform | setup | import | tests | **environment** |
|---|---|---|---|---|---|---|---|---|
| the owner's quoted run | 252 | 4604 | 274.22 s | 21.55 | 69.91 | 69.60 | 222.03 | **626.24 s** |
| **this piece, full suite** | 252 | 4604 | **247.44 s** | 17.63 | 54.22 | 66.33 | 229.95 | **530.71 s** |
| arm A — the 137 pure-logic files, jsdom | 137 | 2456 | 175.78 s | 13.36 | 40.03 | 31.61 | 174.05 | **381.10 s** |
| arm B — **the same 137 under `--environment=node`** | 137 | 2456 | **86.02 s** | 13.37 | 41.38 | 31.81 | 193.04 | **0.049 s** |

★ **The owner's headline claim is RE-ESTABLISHED and it holds.** Building the environments cost
**530.71 s against 229.95 s of running tests — 2.31×** on this machine today (2.82× in his run). Per
file that is **2.11 s of jsdom for every one of the 252**, before a single assertion.

And the same run's `verify` line, for the wall clock the gate actually pays:
`PASS client-suite 281.3s (ran alone)` inside `wall clock 311.3s — PASS 12 FAIL 0 SKIP 21`.

### 4-A-2. ★ What the split would actually save, and what it costs — measured, not asserted

The 137 files classified as pure logic were run **as they are**, with no edit to any of them, once
under jsdom and once under `--environment=node`:

- ★ **The saving is real and it is large: 175.78 s → 86.02 s, a drop of 89.8 s (−51.1%).** The
  environment column collapses from 381.10 s to **49 ms**.
- ★ **And it is bigger than "the environment sum ÷ 4 workers" predicts, which is the interesting
  part.** In arm A, `tests 174.05 s` against `wall 175.78 s` — the four workers were barely packing
  at all, because each was mostly standing up a jsdom. In arm B, `tests 193.04 s` against
  `wall 86.02 s` — the same tests, taking *longer* in aggregate, finished in half the wall clock
  because the workers could finally overlap. **The environment cost was not merely additive; it was
  serialising the pool.**
- ★ **The cost showed up immediately, and it is exactly the kind that must not be assumed away:**
  **136 of 137 passed; one file failed, with 4 tests.** `src/modules/serverStatus.test.js` does
  `vi.spyOn(globalThis, 'fetch')` (line 65 onward) and asserts the banner clears on a successful
  call. Under Node that stub no longer stands in front of what `apiClient.js:77` calls, the real
  request to `http://example.invalid` fails, and the test reads `'unreachable'` where it expects
  `'reachable'`. **A test that stubs the browser's `fetch` stops stubbing anything.** My static
  classifier had flagged the `src/services` group as the risky one; those six files passed, and the
  file that broke was one I had put in the safe pile. ★ **That is the honest measure of the
  classifier: right about 136, wrong about 1, and wrong in a direction it could not see.**

★ **What this does NOT establish, said plainly.** It does **not** say the full suite would drop by
89.8 s. Those 137 files carry 381.10 s of the full run's 530.71 s of environment (71.8%), but in a
full run the other 115 files still need jsdoms and the pool would repack differently. **The 89.8 s is
a measurement of a subset run alone — an upper bound on that subset's contribution, not a prediction
for the suite.** Nothing here was changed to obtain it: both arms ran the files exactly as they sit
in the tree, and the second differs only by a command-line flag.

## PART 4B — THE BROWSER SPECS

### 4. Where one spec's wall clock goes

Measured on **`seed-field-typing.spec.js`** — the spec the owner's question is about. It was run
because the only artefact on disk for it was a **FAILURE** (`test-results/.last-run.json`,
`"status": "failed"`, 18:50 today — the red run of SEED-FIELD-TYPING-1), so this branch's headline fix
had no green record on this machine. It has one now:

```
  ok 2 › ★ a short key TYPED character by character runs that race (3.9m)
  ok 3 › the same key PASTED still works (1.9m)
  ok 4 › a number TYPED is still a seed, and an identifier PASTED still works (3.8m)
  ok 5 › an unknown key TYPED is refused with a message, and starts nothing (2.3s)
  Slow test file: [chromium] › e2e\seed-field-typing.spec.js (9.6m)
  5 passed (9.9m)
```

Wall clock around the whole command: **595.80 s (9.93 min)**.

| component | seconds | share | how it was obtained |
|---|---|---|---|
| **harness start-up + teardown** — the isolated API, `vite dev`, browser launch | **≈ 15 s** | **2.5%** | run total (9.9 m) − spec file (9.6 m) − the setup project |
| **the login** — `auth.setup.js` creates the account and signs in through the real form | **≈ 3 s** | **0.5%** | its own reported duration |
| **getting to the point under test** — every navigation, tab click, keystroke, key lookup, plus every assertion | **≈ 13 s** | **2.2%** | the remainder; and it is corroborated directly by test 5, which is *nothing but* approach and assertions and costs **2.3 s** |
| ★ **THE RACES, run in real time — five of them** | **≈ 565 s** | ★ **94.8%** | see below |

★ **What one race costs, derived four independent ways from the same run.** The race counts come from
reading the spec: `ok 2` runs 2 races (`aStoredKey` + the repeat), `ok 3` runs 1, `ok 4` runs 2
(the typed number + `aStoredKey`), `ok 5` runs none.

| estimate | arithmetic | race cost |
|---|---|---|
| `ok 2` ÷ 2 | 234 s ÷ 2 | 117 s |
| `ok 4` ÷ 2 | 228 s ÷ 2 | 114 s |
| `ok 3` − its approach | 114 s − ~4 s | ~110 s |
| `ok 4` − `ok 3` (one extra race) | 228 − 114 | 114 s |

**≈ 113 s per race, and the four agree to within 3%.** ★ And note what that means: these are
**2-racer** races, and they cost about what Part 1's **20-racer** production races cost (121 s).
The two used different tracks, so it is suggestive rather than controlled — but it points hard at the
race's own length, not the field size, being the wall clock.

★ **The one-line answer to the owner's question.** Proving that an input field accepts letters cost
9.9 minutes. **Of that, 2.3 seconds was the proof that needs no race** (`ok 5`: type an unknown key,
watch it be refused, confirm nothing started) **and 9.4 minutes was watching five races finish.**
Fifteen seconds of it was the harness.

### 5. What each spec proves, and whether reaching the finish line is required

The suite is **16 spec files, 121 tests**, plus `auth.setup.js` — counted from source on this branch
(`^\s*test\(`; no `test.skip` and no `test.fixme` anywhere, and `test.describe` is not miscounted).
★ For the avoidance of a false correction later: `docs/NIGHT-RUN.md:121-122` records **106** as of
2026-09-02, and that is not in conflict — it is master's count, and `git log master..HEAD` shows this
branch has added or changed six spec files since: `seed-field-typing`, `race-history`,
`race-history-real-route`, `race-history-never-vanishes`, `race-save` and `teams-session`.
Playwright's own report from the
run already on disk gives the shape of a test that runs **no** race: **27 tests across
`d11-ux-verification` and `d355-smoke` totalled 117.3 s — a mean of 4.3 s, none over 12.6 s.** A test
that watches a race to the finish costs **~121 s** (Part 1's four production-build runs, click to
stored row). ★ **The ratio is about 28×.**

| spec | tests | full races run | must a race FINISH to prove it? |
|---|---|---|---|
| `garden-path-finishes.spec.js` | 1 | 1 (to **first crossing** only) | ★ **YES — and it is already short-circuited.** The claim is *garden-path crosses the line*; it polls `__viewerProbe().crossed` and stops there instead of waiting for the field. |
| `race-save.spec.js` | 1 | 1 | ★ **YES.** The claim is *a race finishes with the server gone, is kept, and goes up when it returns*. The finish IS the subject. |
| `race-history.spec.js` | 3 | 6 | **Partly.** 3 of the 6 create the row that is then acted on; the 3 repeats are the proof — and a repeat's claim ("repeats one exactly as it ran") does need its result. |
| `race-history-real-route.spec.js` | 2 | 2 | ★ **NO.** Both tests assert about the **list** and the **filter**. The race is the fixture. |
| `race-history-never-vanishes.spec.js` | 1 | 1 | ★ **NO.** The claim is about a row still being **listed**. |
| `seed-field-typing.spec.js` | 4 | 5 | ★ **MOSTLY NO — this is the owner's own example.** *A field that accepts a typed key is proved when the race STARTS.* Test 1 asserts `repeat.seed === original.seed` **read from history**, which exists only after the finish — but the same seed is written to `sessionStorage.activeRace` at start (`SetupScreen.jsx:855`, `:953`, `:1064` — one per start path) and read there by the race screen (`RaceScreen/index.jsx:604`), and `d9-smoke.spec.js` already reads that field at `/race`. So the assertion has a home that does not require the finish. Test 3's typed-number half is the same shape. Test 2 needs **no** race for its assertion and runs one to obtain a key; test 4 needs none and runs none. |
| `d9-smoke.spec.js` | 22 | 0 (4 partial mounts) | ★ **NO — and it is the model.** Its Quick Test tests navigate to `/race`, read `sessionStorage.activeRace`, and stop. Seconds, not minutes. |
| `quicktest-vs-harness.spec.js` | 1 | 0 (1 partial mount) | ★ **NO.** It dumps what the browser hands the engine. |
| `race-identifier.spec.js` | 4 | 0 | ★ **NO.** Encode/decode. |
| `d11-ux-verification.spec.js` | 12 | 0 (3 started, then abandoned) | ★ **NO — and V8 is the pattern worth copying.** It presses **Start Race**, waits a fixed `6000 ms`, and asserts the console produced no errors (`d11:199-201`). It is the suite's most expensive test at **12.6 s** — a race *started* costs 12.6 s where a race *finished* costs minutes. |
| `d355-smoke.spec.js` | 14 | 0 | ★ **NO.** Racer-type editor. |
| `camera-polish-ux-verification.spec.js` | 31 | 0 (6 brief `/race` visits) | ★ **NO.** It navigates to `/race` and waits a fixed `1200 ms` six times; no race is ever finished. |
| `vre-2-ux-verification.spec.js` | 16 | 0 | ★ **NO.** |
| `b1617-smoke.spec.js` | 4 | 0 | ★ **NO.** |
| `d355`/`fix-list-tracks-world-dimensions.spec.js` | 3 | 0 | ★ **NO.** |
| `teams-session.spec.js` | 2 | 0 | ★ **NO.** |

**Specs that MUST finish a race:** `race-save.spec.js` (1), `garden-path-finishes.spec.js` (1, and it
already stops at the first crossing), and the three *repeat* halves inside `race-history.spec.js`.
**Specs that must NOT need to:** every other one — `race-history-real-route`,
`race-history-never-vanishes`, and three of the four tests in `seed-field-typing`.

### 6. ★ How many races are run for SET-UP rather than for PROOF

Counted across the whole suite, by reading every call site.

| spec | races | of which pure set-up | what the set-up race is for |
|---|---|---|---|
| `race-history.spec.js` | 6 | **3** | each test's `runARace` creates the row the test then repeats or filters |
| `seed-field-typing.spec.js` | 5 | **3** | `aStoredKey()` runs a whole race **solely to obtain a six-character key** — called from three of the four tests |
| `race-history-real-route.spec.js` | 2 | **2** | the tests assert about the list; the race is the fixture |
| `race-history-never-vanishes.spec.js` | 1 | **1** | as above |
| `race-save.spec.js` | 1 | 0 | the race is the subject |
| `garden-path-finishes.spec.js` | 1 (to first crossing) | 0 | the race is the subject |
| **total** | **16** | **★ 9** | |

★ **Nine of the sixteen races this suite runs exist only to reach the state a test acts on.**

★ **What one of them costs is MEASURED, in question 4 above: ≈ 113 s.** So the nine set-up races are
**about 17 minutes of pure approach**, in a suite documented at about ten minutes per full run — which
is to say the approach is not a rounding error in the suite's cost, it is most of it.

★ **And the field size is not the lever, which is worth knowing before anyone reaches for it.**
Part 1's races were 20 racers on City Circuit over 2 laps and cost ~121 s each; the suite's races are
**2-racer** races and cost ~113 s. The suite already made them as small as it can and it bought
almost nothing — **every race-running spec except `garden-path-finishes.spec.js` sets the field to two**
(`race-history:44` and `:192`, `race-history-real-route:37`, `race-history-never-vanishes:50`,
`race-save:51`, `seed-field-typing:30`), and `race-save.spec.js` says why in its own comment:
*"the smallest field that is still a race: `raceResults` is written when EVERY racer has finished, so
the field size is the wall clock."* ★ **The half of that which is certainly true is the first half**
— `raceResults` is written only when the last racer finishes. **What the two measurements suggest is
that the field size is NOT the wall clock:** 2 racers on the suite's track cost 113 s and 20 racers
on City Circuit cost 121 s, because on a closed track the last finish is set by the LAP, not by how
many are running it. ★ **Stated as a suggestion, not a result, because the two runs used different
tracks and are therefore not a controlled comparison** — the controlled version would be one track,
two field sizes, and it was not run here.

It is the same class of waste already found once and fixed: the note the owner
quotes — two tests that "ran a whole race just to reach an enabled Start button" — was
`makeStartable`, which now adds one player and clicks one track instead
(`seed-field-typing.spec.js:42`), and that alone took the spec from **19.1 min to 10.1 min**.

### 7. What a short-circuit would cost

Four ways to reach a finished race without watching one in real time. What each stops proving:

| option | mechanism, if it were built | what it would stop proving |
|---|---|---|
| **(a) fewer racers** | the specs already do this — five of the six race-running specs fill the field with `2` | traffic. Overtaking, avoidance and the pulk are field-size effects; a 2-racer race exercises none of them. ★ **And it has already been spent for very little**: the suite's 2-racer races cost **113 s**, against **121 s** for Part 1's 20-racer races (different tracks, so suggestive rather than controlled). A lap is a lap. |
| **(b) fewer laps / an open track** | pick a 1-lap closed track or a short open one | little, for a test that is not about the track. This is the cheapest real saving and the specs partly do it already. Part 1's City Circuit ran **2 laps = 83.0 s of physics** regardless of the 30 s duration setting, because a closed track is a **laps** race — so "set the duration to 30 s" is not a lever here at all, and that is worth knowing before anyone reaches for it. |
| **(c) fast-forward — raise the catch-up cap** | `RaceScreen/index.jsx:1070` caps physics at **2 steps per rAF** (`_catchupSteps++ < 2`), i.e. at most ~32 ms of physics per frame. A dev-only lift would let a race run as fast as the CPU allows. | ★ **Nothing about the PHYSICS** — Part 1 is the evidence: four runs, wall clocks 99/99/99/100 s, bit-identical results; the browser already runs **19% slower than its own physics clock** (measured ratio 1.192–1.204) and the outcome does not move. ★ **But everything about the CAMERA and the ENDING**, which are wall-clock and frame-timing concerns by construction and are known to diverge on any frame-timing change. A fast-forwarded race could never carry a camera or ending proof. |
| **(d) a seeded / injected result** | write `raceResults` into `sessionStorage` and navigate to `/results` | ★ **the engine, entirely.** It proves the result screen and the store, which is genuinely what several of the nine set-up races above are actually for — but a test using it must never be read as proving a race ran. |

**And the option that is not a short-circuit at all:** the same engine computes a race **headless**
through `runRaceHeadless()` (`raceCore.js:689`) in ~0.6 s (GOLDEN-RACES-1) and ~7.4 s for the
heaviest case (RECOMPUTE-COST-1). ★ **Re-measured here, in this piece's own golden-races run:
two races — 35.35 s of racing in 2,439 frames, and 30.00 s in 1,898 frames — computed in
`1025 ms` TOTAL.** That is 65 s of racing in one second, against 121 s of wall clock for 83 s of
racing in a browser: **roughly a 120× difference between computing a race and watching one.** That
path is already exercised inside the unit suite. What it cannot do is press a button, so it can
replace a *set-up* race's engine work only if something else supplies the stored row — which is
option (d).

### 8. ★ The harness cannot drive the production build — what fixing it would take

PROD-SAVE-1 established the blocker and it is unchanged: `playwright.config.js:38` pins
`baseURL` to the dev server, and `playwright.config.js:78` starts the app with `npm run dev`.
★ **Every browser proof this project has ever taken was taken against `npm run dev`** — a bundle
FRAME-GAP-2 measured as costing about a third of physics and hiding how the DOM scales with window
area, and one the owner never uses.

PROD-SAVE-1 named three things a production arm needs. **This piece performed the first one by
hand and can therefore price it:**

1. **Build with the e2e API's URL inlined.** Done here: `VITE_API_URL=http://localhost:4401 vite build`.
   ★ **Measured cost: 0.70 s and 0.73 s** on two runs — not the ~2.4 s PROD-SAVE-1 estimated, and
   negligible beside a 10-minute suite. The alternative it named (run the API on `:4000`, which the
   bundle already carries) remains a collision with the owner's own API and is still the wrong branch.
2. **The app `webServer` becomes `build` + a static server instead of `dev`.** `serve-production.mjs`
   copies `client/dist` out to `LOCALAPPDATA` and serves from there, so the harness would drive a
   different directory than it builds — the piece of real design PROD-SAVE-1 identified. Part 1
   sidestepped it by building **directly to a non-synced out-directory** and serving that, which is
   one shape the harness could take; it is not the only one and it is not proposed here.
3. **`baseURL` moves to that server's port.** One line.

**Which existing proofs would be worth more if it could.** Ranked by how much the dev/production
difference could plausibly change the answer:

- **Anything about frame timing, the camera or the ending.** FRAME-GAP-2's measured third-of-physics
  difference lands directly here. These are the proofs where a dev-build green is the weakest.
- **`garden-path-finishes.spec.js`.** Its own header says the wall-clock budget is ~7× the race
  length *because a headless browser advances the clock more slowly than the wall*. On a production
  bundle that margin is a different number, and the spec's stated rule is that an expiry **is a
  finding, not a budget to raise** — so it is currently guarding against a ceiling nobody has
  measured in the build that matters.
- **`race-save.spec.js` and the history specs.** PROD-SAVE-1 exists because a defect appeared on the
  production build that no dev-only spec had seen — although its cause turned out to be list
  ordering rather than the bundle.
- **Least affected:** `race-identifier`, `teams-session`, `d355`, `d11`, `vre-2` — encode/decode,
  session and config persistence, where the bundle is not plausibly the variable.

### 9. The flakes — the API failing to serve track geometries

★ **The line is the APP's, not the harness's, and it is a real race — but not between the harness and
its server in the way it reads.** Its home is
**`client/src/modules/storage/trackLoader.js:117`**:

```js
`[tracks] ${missing} of ${tracks.length} track geometries could not be cached — those tracks cannot be raced until the server answers for them`
```

The mechanism, at source:

- **`trackLoader.js:22`** — `FETCH_TIMEOUT_MS = 3000`. **`trackLoader.js:34-67`** — each geometry is
  one `fetch` under `withTimeout`, and a failure is caught, warned about, and returns `null`.
- **`trackLoader.js:114`** — all of them go through `Promise.allSettled`, so a dropped geometry
  **cannot** fail the list. Ten fetches leave at once, against one API.
- The consequence is the sharp part and `appReady.js` states it: `handleQuickTest` reads
  `geom ? !geom.closed : false`, so ★ **a MISSING geometry reads as a CLOSED track** — an open track
  quick-tested with its geometry dropped runs as a laps race and a spec asserting `raceMode === 'time'`
  reads `'laps'`.

**Is it a race between the harness and its own server?** In substance, yes. `playwright.config.js:66`
waits only for `/api/auth/setup-needed` to answer before starting the client, and `server/src/index.js`
calls `app.listen` immediately — so the readiness probe is satisfied by a server that has not yet
done its first-boot work against an empty `RA_DATA_DIR`. The first page load then fires ten geometry
requests at it with a 3 s budget each.

**How often, and has anything ever passed or failed because of it?** ★ **Yes — it has caused
failures, and that is documented at source rather than inferred.** `appReady.js`'s header records the
measurement: **four tests failed exactly 1 of 5 runs on 2026-08-16**, all four traced to this
mechanism and not to shared state. The suite's standing flake rate is recorded in the tree as
**about two tests per five runs** from that one shared mechanism
([DOCS-TWO-WEEKS.md:77](DOCS-TWO-WEEKS.md), re-measured over five full runs per
[DOC-TRUTH-2.md:374](DOC-TRUTH-2.md), and unchanged across both rounds of
[NIGHT-2026-08-17.md:226](../night/NIGHT-2026-08-17.md)). E2E-FLAKE-1 is the response: `ensureTrackGeometriesCached` asks the API which geometries
exist, polls localStorage for 6 s, and **reloads the page** up to 4 times, failing loudly on the last
attempt with the mechanism named. ★ **So the "7 of 10, then 10 of 10 could not be cached" lines in
SEED-FIELD-TYPING-1's log are the guard WORKING** — the app announcing a drop, the helper giving it
another page load — not a spec failing for reasons of its own. **Counter-evidence that it is
cold-server-bound:** across the six production-build races Part 1 ran against an API that had been up
for minutes, **zero** such warnings appeared in any of the six console logs; the only console error
in the whole of Part 1 was the expected pre-login `401` on `/api/auth/me`.

★ **AND IT HAPPENED AGAIN, LIVE, IN THIS PIECE'S OWN SPEC RUN — first-hand rather than quoted.** The
`seed-field-typing` run above (which happened to prove the branch green, not to study this) emitted
the tally line **six times**:

| tally line | times it fired |
|---|---|
| `[tracks] 10 of 10 track geometries could not be cached` | **3** |
| `[tracks] 6 of 10 track geometries could not be cached` | 2 |
| `[tracks] 7 of 10 track geometries could not be cached` | 1 |

with the individual per-track warnings naming `searound`, `dirt-oval`, `river-run`, `seatrack`,
`space-sprint`, `luger-hill`, `ice-track`, `garden-path`, `mountainstreet` — each *"Failed to fetch;
this track will be REFUSED rather than raced on a guess"*. ★ **Every one of those was a page load on
which the app had NOTHING to race with — and all five tests still passed**, because
`ensureTrackGeometriesCached` reloaded and the next attempt succeeded. **The guard is doing exactly
its job, and the underlying race is still there, at a rate of six page loads in one ten-minute
spec.** Note also that the failures are `Failed to fetch`, not a 3 s timeout expiring — the request
did not merely lose its race, it was refused, which points at the API's readiness rather than at its
speed.

**What is NOT established here:** how often the four page loads are still not enough. Nothing counts
that, and a run in which `ensureTrackGeometriesCached` exhausts its attempts fails with its own
message rather than being tallied anywhere. This run never reached that point.

---

# Source hygiene

**What this piece touched:** this report and its one line in `reports/evolution/INDEX.md`. Nothing
else — no engine, camera or drawing code, nothing in the store, the list, the field, the suites or
the harness.

**Records created by hand, and their disposal:**

- The **isolated instance** (API on `:4401`, its `RA_DATA_DIR`, the account `repeatproof`, the six
  races it recorded, and the production bundle served on `:5401`) lived entirely in the session
  scratchpad outside the repository and was **deleted**, both servers stopped.
- `client/dist-iso/` was created by the first build, noticed to be untracked-and-not-ignored, and
  **removed**; the rebuild went to the scratchpad instead. `git status` is clean.
- The owner's `server/data/races.sqlite` was opened **read-only** and has **no** row from this piece.
- `.playwright-mcp/` (browser snapshots and console logs from driving Part 1) was **removed**.
- **`git stash` was not used on this tree.**

**Nothing dead was left behind** within what this piece touched: it added no helper, no script and no
test, so there is nothing to retire.

---

# Checks

**`npm run verify` — plain, not `--premerge`. PASS.**

```
  PASS  client-suite        281.3s  (ran alone)
  PASS  check-hooks-installed 0.3s
  PASS  check-config-keys   0.4s
  PASS  check-doc-links     0.5s
  PASS  check-index         1.0s
  PASS  check-language-closed 1.2s
  PASS  check-fallback-agreement 1.4s
  PASS  check-config-claims 1.5s
  PASS  fingerprint-containment 4.1s
  PASS  check-writable      4.4s
  PASS  client-format-check 16.0s
  PASS  client-lint         29.9s

  client-suite        RETRY LEDGER: DISABLED — retry is 0, so no test can be retried and this run had nothing to count. A first-attempt failure fails the suite.

  wall clock 311.3s — sequential would have been 341.9s (1.1x)

  PASS 12   FAIL 0   SKIP 21
```

`golden-races` is one of the 21 skips, and it said why: *"nothing changed · declares 29 file(s) by
import closure · reach=1 entry point(s) · names=1 path(s) it does not import"*. It was therefore run
on its own, verbatim:

```
check-golden-races: closed-garden-path-12 — 12 racers, 35.35 s of racing in 2439 frames
check-golden-races: open-river-run-6 — 6 racers, 30.00 s of racing in 1898 frames
check-golden-races: 2 race(s), every finishing position and time as recorded (1025 ms).
```

**Fingerprints:** `node scripts/engine-reach.mjs --check reports/evolution/REPEAT-PROOF-1.md reports/evolution/INDEX.md`,
verbatim:

```
 ENGINE REACH: none of 2 path(s) carry a change that can reach the race engine.
  2 outside the hull (cannot reach the engine at all): reports/evolution/REPEAT-PROOF-1.md, reports/evolution/INDEX.md
```

**Nothing was minted.**

**`npm run verify` again, with this report and its index line in the tree. PASS.** The second run
selects only six guards and says why — the marker from the first run moved the base, and the only
change since is markdown, which reaches nothing else:

```
  PASS  check-hooks-installed 0.3s
  PASS  check-doc-links     0.4s
  PASS  check-index         0.6s
  PASS  check-config-claims 1.3s
  PASS  check-writable      3.3s
  PASS  fingerprint-containment 3.3s

  wall clock 3.4s — sequential would have been 9.2s (2.7x)

  PASS 6   FAIL 0   SKIP 27
```

★ **`check-index` is the one that matters here**: it passed with `REPEAT-PROOF-1.md` present, which
is the proof the report is indexed in both directions rather than an orphan.

---

# The production build, left served

`cd client && npm run build` (866 ms), then `node scripts/serve-production.mjs --port=4173` — the
project's own command, which copies the bundle **out of the synced tree** before serving it:

```
RaceArena PRODUCTION build
  served from : C:\Users\weudl\AppData\Local\racearena-preview   (outside the synced tree)
  copied from : C:\Users\weudl\OneDrive\Dokumente\Seasonal race claude\client\dist
  open        : http://localhost:4173/
```

**★ THE BUILD BADGE**, read out of the served bundle itself rather than off a screenshot —
`assets/index-B4OLwJGC.js` carries:

```js
{ commit: `21bfe5c4`, branch: `feat/team-races-1`, dirty: !0, reason: null }
```

so the HUD pill reads **`21bfe5c4+dirty`**. ★ **The `+dirty` is expected and is not a warning about
the code**: `dirty` is stamped at build time from the working tree, and the tree carried this report
and its index line uncommitted at that moment. **Nothing in `client/` or `server/` differs from
`21bfe5c4`** — `git status` showed exactly two paths, both under `reports/`. The bundle was rebuilt
and re-served after the commit; the badge it carries now is recorded in the line below.

★ **THE BADGE AS LEFT, after the commit — rebuilt and re-served.** `assets/index-qKq_H4X_.js`:

```js
{ commit: `bdfd55fc`, branch: `feat/team-races-1`, dirty: !1, reason: null }
```

**The HUD pill reads `bdfd55fc` — clean, no `+dirty`, `reason: null`.** `bdfd55fc` is this report's
own commit, one above the `21bfe5c4` the proof was taken on, and it changes only two files under
`reports/`. **`http://localhost:4173/` is serving that build now.**
