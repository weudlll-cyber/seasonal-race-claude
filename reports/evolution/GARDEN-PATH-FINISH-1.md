# GARDEN-PATH-FINISH-1 — the cause was the RACER-TYPE input, it was removed on 2026-08-25, and the brief's symptom no longer exists: ten of ten tracks finish 40/40

**Date:** 2026-09-02 · **Nothing tracked was edited; no branch, no commit.** · **DIAGNOSE ONLY.**

---

## 0. VERDICT IN FIVE LINES

- **The symptom does not reproduce.** At the brief's own identity — n=40, 60 s requested, each
  track's own `defaultRacerTypeId` — **all ten tracks finish 40 of 40** through
  `scripts/lib/raceDriver.mjs` `runRace`, with and without `slowmo`. Not one race is discarded.
- **"Nine of ten" is REFUTED.** It was never nine. The 2026-08-25 diagnosis
  (`reports/evolution/GARDEN-PATH-NO-FINISH-1.md`) found **one** track. Today the worst track,
  dirt-oval, sits at **56.5%** of the ceiling; garden-path, the old offender, at **44.7%**.
- **The named cause is the RACER-TYPE input**, and it moved out from under the failure in
  `d73ec6a9` (GARDEN-PATH-DEFAULTS-1, 2026-08-25): garden-path `defaultRacerTypeId` `snail` →
  `beetle` **and** `defaultLaps` `4` → `2`. **424.2 s → 70.7 s, a factor of 6.0.**
- **The 200 s ceiling is not a wall clock, and the standing explanation of it was wrong.**
  `raceDriver.mjs:259` calls it "a 200 s wall-clock ceiling". There is **no real-time source
  anywhere in the file**. Measured: dirt-oval n=40 seed=1, the loop's clock read **93.32 s** while
  **5.26 s** of real time had passed.
- **One live input divergence remains that is physics**, and it is the `roster: null` class exactly:
  the driver runs a **nameless** field where the browser runs `["Turbo","Blaze","Rocket",…]`, and
  `stablePairBit` hashes `r.name`.

---

## 1. THE PREMISE, MEASURED

`scripts/lib/raceDriver.mjs` `runRace`. Identity: `n=40 · racer=track-default · 60 s · 1280x720 ·
roster=none (index strings)`, seeds 1/2/3, `slowmo` off and on (24 harnesses pass `slowmo: true`).
`frames` is against the 12,000-frame ceiling.

| track | racer | realizedDur s | **no slowmo** frames (seed 1/2/3) | **slowmo** frames (seed 1/2/3) | finished, every seed |
| --- | --- | ---: | --- | --- | --- |
| city-circuit | motorbike | 77.8 | 5083 / 5041 / 5034 | 5880 / 6053 / 5864 | **40/40** |
| dirt-oval | horse | 87.2 | 5600 / 5622 / 5585 | **6785 / 6673 / 6455** | **40/40** |
| garden-path | beetle | 70.7 | 4626 / 4540 / 4585 | 5322 / 5341 / 5299 | **40/40** |
| ice-track | snowmobile | 73.5 | 4801 / 4738 / 4727 | 5808 / 5699 / 5629 | **40/40** |
| luger-hill | luge | 60.0 | 3772 / 3786 / 3760 | 4261 / 4380 / 4613 | **40/40** |
| mountainstreet | boarder | 60.0 | 3799 / 3790 / 3842 | 4499 / 4505 / 4567 | **40/40** |
| river-run | duck | 60.0 | 3801 / 3747 / 3861 | 4291 / 4379 / 4495 | **40/40** |
| searound | manta | 62.4 | 4110 / 4093 / 4101 | 4853 / 4645 / 4432 | **40/40** |
| seatrack | dolphin | 60.0 | 3778 / 3766 / 3728 | 4222 / 4551 / 4389 | **40/40** |
| space-sprint | rocket | 60.0 | 3840 / 3793 / 3815 | 4492 / 4548 / 4355 | **40/40** |

**Tracks where all 40 finish on every seed: 10/10, in both arms.** Worst cell: dirt-oval under
slowmo at **6,785 / 12,000 = 56.5%**. There is no near-miss behind it.

**The project's own purpose-built diagnostic agrees.** `scripts/diag/gp-exit.mjs`, written for
GARDEN-PATH-NO-FINISH-1 to read the exit state directly rather than infer it from empty output, run
today on all ten tracks at `--racers=40 --seeds=1` (its own `slowmo: true`, full default roster):

> `garden-path n=40 seed=1: frames=5366 finishedCount=40/40 leaderT=2.0164/2 (100.8% of the race)
> racers with a finishRank=40 -> harness returns a result`

**Ten of ten print `-> harness returns a result`. Zero print `NULL (the race is DISCARDED)`.**

At the browser control's own field size, `garden-path n=20`, seeds 1/2/3:
**5473 / 5253 / 5409 frames, 20/20 finished, leader at 100.8% of the race, all three return a result.**

---

## 2. THE CONTROL — the browser, twice, and both halves agree

### 2a. `goldenRunner.realArm` — the arm `goldenRealArm.test.js` pins byte-identical to the browser

`scripts/parity/goldenRunner.mjs:628`. n=40, seed=5601, each track's own `defaultRacerTypeId`,
Quick-Test roster, and the **browser's own** laps/seconds (`trackDefaultLaps` / `trackDefaultSeconds`).
`realArm`'s cap is `Math.max(realizedDurationSec * 3, 600) * 1000` (`goldenRunner.mjs:703`), never
reached here.

| track | racer | shape | browser laps/sec | realizedDur s | **DNF** | last finisher s | vs a 200 s bound |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| city-circuit | motorbike | CLOSED | 2 laps | 77.8 | **0** | 83.28 | fits, 42% |
| dirt-oval | horse | CLOSED | 2 laps | 87.2 | **0** | 94.22 | fits, 47% |
| garden-path | beetle | CLOSED | 2 laps | 70.7 | **0** | 76.24 | fits, 38% |
| ice-track | snowmobile | CLOSED | 2 laps | 73.5 | **0** | 79.63 | fits, 40% |
| luger-hill | luge | OPEN | 59 s | 59.0 | **0** | 61.86 | fits, 31% |
| mountainstreet | boarder | OPEN | 60 s | 60.0 | **0** | 62.80 | fits, 31% |
| river-run | duck | OPEN | 60 s | 60.0 | **0** | 64.21 | fits, 32% |
| searound | manta | CLOSED | 2 laps | 62.4 | **0** | 67.94 | fits, 34% |
| seatrack | dolphin | OPEN | 60 s | 60.0 | **0** | 62.59 | fits, 31% |
| space-sprint | rocket | OPEN | 90 s | 90.0 | **0** | 93.54 | fits, 47% |

**The control finishes where the driver finishes. Both arms are 10/10.** The brief's decisive test —
"if it finishes there and not in the driver, the fault is the driver's" — never fires, because it
finishes in both.

A caveat found rather than assumed: `goldenRunner.buildIdentity:274-277` does **not** use the
browser's `trackDefaultSeconds` for open tracks — it derives its own `max(10, floor(natMax × 0.6))`,
giving luger-hill **35 s** and seatrack **40 s**. I pinned `requestedSeconds` to `trackDefaultSeconds`
to make the arm browser-faithful on the duration axis. Read without that pin, `realArm` measures the
golden harness's own shape, not the product's default.

### 2b. The real browser, tonight — supplied by the coordinator's e2e run, and reconciled here

`client/e2e/garden-path-finishes.spec.js` on the isolated instance (ports 4399/5399, temp data dir).
I could not run it myself (§8), so I checked every number it produced against the product's own model.

**Test 1 FAILED**, `Expected: > 200, Received: 71`. The setup screen's per-lap estimates for
garden-path, beside `deriveRaceDuration` evaluated at the beetle's M=0.90 and
`pathLengthPx = 4772.74`, `normalSpeedPxPerSec = 150`:

| laps | screen, measured tonight | `laps × 4772.74 / (150 × 0.90)`, derived here | agree |
| ---: | ---: | ---: | --- |
| 1 | 35 s | 35.35 s | ✓ |
| **2 — the harness's own lap count** | **71 s** | **70.72 s** | ✓ |
| 3 | 106 s | 106.06 s | ✓ |
| **4 — the track's default before `d73ec6a9`** | **141 s** | **141.42 s** | ✓ |

The screen prints `Math.round(raceDurationModel.realizedDurationSec)` — `SetupScreen.jsx:351`,
rendered at `:959`. All four match to the rounding. **Every lap choice is now under 200 s**, so in
the spec's own words *"if the product estimated UNDER the ceiling, the ceiling could not be the
cause."*

**Test 2 PASSED:** `[garden-path] field=20 FIRST CROSSING after 121.3 s of wall clock; 11 finish
time(s) on the scoreboard at that moment`. The product finishes garden-path. The 121.3 s is wall
clock on a loaded headless machine and is **not** the race's length — `RaceScreen/index.jsx:988`
caps rAF catch-up at two physics steps per frame, so the race clock runs behind real time under
load. The honest figure for that race is the model's **70.7 s**, and the driver at the matched
n=20 identity finishes it in 5,253–5,473 frames.

---

## 3. WHAT `ts` ACTUALLY IS — the ceiling is not a wall clock

`raceDriver.mjs:319`

```
while (st.finishedCount < identity.racers && ts - raceStart < 200000) {
```

`ts` starts at 0 (`:287`), advances by `RAW0 = 1000/60` through the countdown (`:299`) and by
`RAW = frameMsOf(frame)` — default `1000/60` — per race frame (`:368`). It is a **synthetic 60 Hz
frame clock**. `grep -n "performance.now\|Date.now\|hrtime" scripts/lib/raceDriver.mjs` returns
**nothing**.

Measured, n=40 seed=1, each track's own default racer, timed against `process.hrtime`:

| track | slowmo | frames | `ts - raceStart` s | `st.physicsTs` s | **REAL wall s** | 12,000 frames buy |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| dirt-oval | false | 5600 | 93.32 | 93.33 | **5.26** | 200.0 s of race |
| dirt-oval | **true** | 6785 | 113.07 | 93.33 | 21.62 | **165.1 s of race** |
| garden-path | false | 4626 | 77.08 | 77.09 | 18.40 | 200.0 s of race |
| garden-path | **true** | 5322 | 88.68 | 77.09 | 26.64 | **173.9 s of race** |
| river-run | false | 3801 | 63.33 | 63.34 | 20.40 | 200.0 s of race |
| river-run | **true** | 4291 | 71.50 | 63.34 | 15.04 | **177.2 s of race** |

**Three consequences, two of which correct the standing account.**

1. **It is not wall clock.** 93.32 s of loop clock cost 5.26 s of real time. `raceDriver.mjs:259`'s
   "a 200 s wall-clock ceiling" is a misnomer, and it is the sentence that both the 2026-08-25
   report and `garden-path-finishes.spec.js:27` took at face value.
2. **Without slowmo the ceiling IS exactly race time.** `ts - raceStart` and `st.physicsTs` agree to
   one frame (93.32 vs 93.33). `accum += RAW` at 16.667 ms/frame, drained by `FIXED_DT = 16`
   (`raceCore.js:52`) at ≤ 2 steps/frame, averages 1.042 steps per frame — the two-step cap never
   binds at 60 Hz. So the driver's dt **is** the browser's dt, and 12,000 frames are 200.0 s of race.
3. **With slowmo it is not.** `hooks.slowmo` dilates the physics accumulator (`raceDriver.mjs:342`)
   while `ts` keeps running, so 12,000 frames buy only **165–178 s** of race. The effective ceiling
   for the 24 harnesses that pass `slowmo: true` is **~165 s, 17% below the 200 s every document
   states.** This is the one part of the old account that was understated rather than wrong.

---

## 4. THE CAUSE, NAMED, WITH ITS NUMBER

**The cause is the racer-type input** — the brief's fifth candidate, *"an input the harness defaults
away, the way `roster: null` was"* — with one correction: the harness did **not** default it away.
`buildRace` reads `geo.defaultRacerTypeId` correctly (`raceDriver.mjs:167-169`). The track's value
was a snail, and the harness faithfully raced one.

Verified by me in the commit, `git show d73ec6a9 -- server/seeds/tracks/garden-path.json`:

```
-  "defaultRacerTypeId": "snail",      -  "defaultLaps": 4
+  "defaultRacerTypeId": "beetle",     +  "defaultLaps": 2
```

| state | racer | M | laps the browser runs | realizedDurationSec | against 200 s |
| --- | --- | ---: | ---: | ---: | --- |
| before `d73ec6a9` | snail | 0.30 | **4** | **424.2 s** | 212% over |
| before `d73ec6a9`, at the driver's hardcoded 2 | snail | 0.30 | 2 | **212.1 s** | 106% — over by 12 s |
| **today** | **beetle** | **0.90** | **2** | **70.7 s** | **35% — fits** |

**424.2 s → 70.7 s is a factor of 6.0.** I confirmed the middle row by running it: garden-path, racer
forced to `snail`, n=40 seed=1, 60 s, slowmo → **12001 / 12000 frames, 0/40 finished, NULL —
DISCARDED**. The mechanism still works exactly as described in 2026-08. It simply has no input left
that triggers it.

**`d73ec6a9` also closed the report's *second* divergence, silently.** The 2026-08-25 finding that
"the harness runs 2 laps where the product runs 4" ended when that commit set `defaultLaps: 2`.
**The hardcode was not repaired — the data moved to meet it.**

---

## 5. THE BRIEF'S CANDIDATES, RANKED

| # | candidate | verdict | the number |
| --- | --- | --- | --- |
| 1 | **the racer-type input** | **THE BINDING CAUSE — and it is closed.** | snail 0.30 → beetle 0.90; 424.2 s → 70.7 s |
| 2 | the requested duration reaching the driver, and in what unit | **REAL and LIVE, but not the finish cause** — §6a, §6b | 5 of 10 tracks discard `identity.seconds` outright; space-sprint runs −33% |
| 3 | the lap count | **a hardcode, currently harmless** — §6c | `raceDriver.mjs:201`; agrees with `trackDefaultLaps` on 5 of 5 closed tracks today |
| 4 | the distance model / the driver's dt vs the browser's | **NOT a fault.** Both are `FIXED_DT = 16` (`raceCore.js:52`); the driver feeds `accum` the same 16.667 ms/frame the browser's rAF does, and the two-step cap never binds at 60 Hz. | `ts - raceStart` = `physicsTs` to one frame: 93.32 vs 93.33 |
| 5 | the finish detection | **NOT a fault, and it cannot disagree with the mode.** `raceCore.js:668-672` is the *browser's own* predicate — `RaceScreen` renders through the same `stepRacePhysics`. `st.finishT` and the open/closed branch are set by one call to `deriveRaceDuration`, so predicate and mode come from the same place by construction. | fires on 400 of 400 races in §1; leader ends at 100.7–101.0% of `finishT` on every track |
| 5b | the roster — the `roster: null` class | **LIVE, and it IS physics** — §6d | driver field is nameless; browser's is `["Turbo","Blaze","Rocket",…]` |

**The binding cause is #1 and it is closed. Nothing on this list currently prevents a finish.**

---

## 6. WHAT IS STILL DIVERGENT — four findings that survive

None causes a non-finish. All four are the same class: a fact with an owner, restated as a literal
in the harness.

### 6a. `identity.seconds` is DISCARDED on all five closed tracks, while the identity line prints it

`raceDriver.mjs:201-203` passes `laps: shape.isOpen ? 1 : 2` and `requestedSeconds: identity.seconds`;
`durationModel.js:197-199` ignores `requestedSeconds` entirely on the closed branch. Measured,
n=40 seed=5601, each track's own default racer:

| track | shape | `seconds: 10` → | `seconds: 60` → | `seconds: 300` → |
| --- | --- | ---: | ---: | ---: |
| city-circuit / dirt-oval / garden-path / ice-track / searound | CLOSED | 77.8 / 87.2 / 70.7 / 73.5 / 62.4 | **identical** | **identical** |
| luger-hill / mountainstreet / river-run / seatrack / space-sprint | OPEN | 10.0 | 60.0 | 300.0 |

While that is true, `formatIdentity` prints
`RACE IDENTITY: n=40 · raceSeed=5601 · camSeed=2246827914 · racer=track-default · 300s · 1280x720 · roster=none`.

**On half the tracks the identity line states a duration the race does not have** — an R16 violation
inside the one function written to prevent R16 violations. All 15 raceDriver harnesses pass the
literal `seconds: 60`, and none has a `--dur` flag (that flag belongs to `sim-fairness.mjs`, a
different path), so today the printed claim is always the same wrong "60s".

### 6b. Two OPEN tracks run a materially different race from the product

`trackDefaultSeconds` clamps the track's stored default at *this race's* pace; the driver substitutes
a literal 60.

| track | racer | BROWSER (`trackDefaultSeconds`) | DRIVER (`identity.seconds`) | difference |
| --- | --- | --- | --- | --- |
| **space-sprint** | rocket | **90 s** | 60 s | **−33% of the race** |
| **luger-hill** | luge | 59 s (`natMax` = 59.6) | 60 s | driver enters a **uniform slowdown the browser never enters**: `paceScale` 0.993 vs 1.000 |
| mountainstreet / river-run / seatrack | boarder / duck / dolphin | 60 s | 60 s | none |

Every camera and ending figure this project holds for **space-sprint** was measured on a race two
thirds the product's length. Not a finish defect — a coverage defect, and it is live.

### 6c. The lap count is a hardcode, not a read

`raceDriver.mjs:201` answers with `2` a question the product answers with `trackDefaultLaps(track)`
(`SetupScreen.jsx:517` on the Quick-Test path, `:280` on Start Race). It agrees on 5 of 5 closed
tracks **today only because `d73ec6a9` moved garden-path to 2**. An operator changing a track's
`defaultLaps` in the Track Manager moves the product and not the harness, with no signal.

### 6d. The input diff, field by field — river-run seed 13, n=20

The browser half is `quicktest-vs-harness.spec.js`'s `sessionStorage.activeRace` dump, supplied by
the coordinator. The driver half I built here from `resolveIdentity` + `buildRace` at the same
identity, with the roster omitted as all 15 harnesses run it.

| field | BROWSER (`activeRace`) | DRIVER (`raceDriver` defaults) | agree |
| --- | --- | --- | --- |
| `trackId` | `river-run` | `river-run` | ✓ |
| `geometryId` | `custom-dea6b35a-…` | `custom-dea6b35a-…` | ✓ |
| `racerTypeId` | `duck` | `duck` | ✓ |
| `raceMode` / `targetLaps` / `targetDurationSec` | `time` / `null` / `60` | *(no mode field)* / passes `laps: 1`, ignored on the open branch / `60` | ✓ in effect |
| **`realizedDurationSec`** | **59.99999999999999** | **59.99999999999999** | **✓ bit-identical** |
| `paceScale` | 1 | 1 | ✓ |
| `racePlanEnabled` | `true` | `true` | ✓ |
| `racePlanSeed` | 13 | 13 | ✓ |
| `fieldSize` | 20 | 20 | ✓ |
| **`firstEightNames`** | **`["Turbo","Blaze","Rocket","Flash","Speedy","Thunder","Nitro","Drift"]`** | **`[null,null,null,null,null,null,null,null]`** | **✗ — AND THIS IS PHYSICS** |
| `raceActionStage` | `"quiet"` | *(no such field; runs `DEFAULT_RACE_DYNAMICS_CONFIG`)* | ✓ **today only** |
| `winners` | 3 | *(no such field)* | display only, not an engine input |

**The names are the one live divergence, and it decides who wins.** `stablePairBit` in
`raceBehavior.js` hashes `r.name` and falls back to `r.index` when there is none — a nameless field
runs a *different race* from the browser at the same seed. `buildRace`'s roster block
(`raceDriver.mjs:230-234`) exists and is correct; it is **default OFF** (`resolveIdentity:109`,
`roster: partial.roster ?? null`), and 15 of 15 harnesses take the omission. This is FINISH-PAIR-1's
finding, still unpaid.

**`raceActionStage` agrees today only because `quiet` is defined as the shipped values.** Checked at
source: `RACE_ACTION_STAGES.quiet` reads `pulkChallengerBoost` 0.06 and `pulkLeaderBrake` 0.1 from
`DEFAULT_RACE_DYNAMICS_CONFIG` itself. **The driver has no `raceActionStage` axis at all**, so a race
the owner started on `medium` (`pulkChallengerBoost` 0.12) or `wild` (0.12 + `pulkLeaderBrake` 0.15)
is **inexpressible in the harness** — it would silently run `quiet`. Two of the three shipped stages
cannot be reproduced by any instrument on this driver.

---

## 7. THE MECHANISM IS UNARMED, NOT REPAIRED — where the breach line now sits

Measured breach boundary, n=40 seed=1, `slowmo: true`, full default roster:

| track | racer (M) | requested | realizedDur s | frames / 12000 | finished | outcome |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| dirt-oval | horse (1.00) | 60 s | 87.2 | 6800 (57%) | 40/40 | returns a result |
| dirt-oval | snake (0.75) | 60 s | 116.3 | 9091 (76%) | 40/40 | returns a result |
| dirt-oval | elephant (0.60) | 60 s | 145.4 | **10827 (90%)** | 40/40 | returns a result |
| dirt-oval | **snail (0.30)** | 60 s | 290.7 | **12001 (100%)** | **0/40** | **NULL — DISCARDED, silently** |
| garden-path | beetle (0.90) | 60 s | 70.7 | 5366 (45%) | 40/40 | returns a result |
| garden-path | **snail (0.30)** | 60 s | 212.1 | **12001 (100%)** | **0/40** | **NULL — DISCARDED, silently** |
| river-run | duck (0.85) | 60 s | 60.0 | 4571 (38%) | 40/40 | returns a result |
| river-run | duck (0.85) | **150 s** | 150.0 | **11599 (97%)** | 40/40 | returns a result |
| river-run | duck (0.85) | **200 s** | 200.0 | **12001 (100%)** | **0/40** | **NULL — DISCARDED, silently** |

**Under `slowmo` the breach is at realizedDurationSec ≈ 155–165 s, not 200.** Derived thresholds at
the driver's hardcoded 2 laps:

- **dirt-oval is the closest closed track to the line** — it breaches below a racer multiplier of
  **M ≈ 0.57** (`2 × 6541.5 / (150 × 155)`). Its horse is 1.00: a 43% margin in M.
- garden-path, now the *shortest* closed race, breaches only below **M ≈ 0.41**.
- On the five OPEN tracks the breach is independent of the racer: any harness passing
  `seconds` ≳ **155** loses the whole race on all five at once.

**And the silence is unchanged.** 77 files import the driver; **63 call `runRace`; exactly ONE reads
its return value** — `scripts/raceDriver.test.mjs:155`. Seven diagnostics still carry the
`filter(r => r.finishRank > 0)` → empty → `return null` pattern that makes a track vanish from a
table rather than show a zero. `runRace` still returns one indistinguishable `{frames, endTs}` for
"all finished", "ceiling hit" and "callback said stop".

---

## 8. WHAT I COULD NOT ESTABLISH

- **I could not run `client/e2e/garden-path-finishes.spec.js` myself.** Playwright refused with
  *"http://localhost:4399/api/auth/setup-needed is already used"* — the isolated e2e instance was
  held by a concurrent piece of this chain, and I did not kill it. The browser numbers in §2b are
  the coordinator's measurement; what is mine is the reconciliation of all four lap estimates
  against `deriveRaceDuration` (§2b's table), which agrees to the rounding. That is two independent
  derivations agreeing, not one measurement taken twice, and I do not present it as my own browser
  reading.
- **I could not construct any input that makes NINE of ten tracks fail.** The closest are: a snail
  across all ten at 60 s → **5 of 10** (the closed tracks only); any `seconds ≳ 155` → **5 of 10**
  (the open tracks only); both together → 10 of 10. **No combination gives nine**, and the brief
  names no exception track. I cannot reconstruct where "nine of ten" came from beyond noting that
  the 2026-08-25 report repeatedly writes *"every sweep reported 'nine tracks' honestly"* — i.e.
  **nine tracks SUCCEEDED and one vanished.** The most economical reading is that the count was
  inverted between that report and this brief.
- **Why the ceiling is 200 s specifically is still not recoverable from the code.** Unchanged from
  §6 of the 2026-08-25 report.
- **I tested n=40 throughout, plus n=20 for the matched browser control.** Every number here carries
  its n and should not be read at another field size; an N=40 arm says nothing about N=30 or N=65.
- **I did not measure the last finisher in a real browser.** The e2e spec asserts the FIRST crossing
  and stops there.

---

## 9. WHAT VERIFICATION APPLIES

**Nothing tracked was changed, so no fingerprint can speak.** Six measurement scripts were written
to the session scratchpad only; `git status` was clean at start and no write tool touched a tracked
path. The instruments run were the project's own: `scripts/lib/raceDriver.mjs` `runRace`,
`scripts/diag/gp-exit.mjs`, and `scripts/parity/goldenRunner.mjs` `realArm` — the last pinned to the
browser by `client/src/modules/parity/goldenRealArm.test.js`.
