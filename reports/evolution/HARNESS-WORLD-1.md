# HARNESS-WORLD-1 — his race replays exactly: forty of forty, to the millisecond

**Branch** `night/2026-09-12b` · **not merged** · **nothing minted** · **no golden race re-recorded** ·
**no clamp, gain, ease duration or role touched.** This piece changes what the MEASURING path
computes, never what the product does.

★ **READ-ONLY ON HIS DATA.** One `GET /api/races/QN3HDP` through his own authenticated session;
nothing created, altered or deleted in his store. The payload was saved to a scratch file outside the
repository and every run below reads that file.

---

## 1 · ★★ THE REPLAY, WHICH IS THE WHOLE POINT

`QN3HDP` replayed from its own stored inputs — seed 3, the forty names it carries, motorbike,
city-circuit, 2 laps, and its seven `worldConfigs` blocks handed to the driver whole — against what
the record says happened.

| | |
|---|---|
| ★★ **POSITIONS IDENTICAL** | ★ **40 of 40** |
| ★★ **FINISHING TIMES IDENTICAL (ms)** | ★ **40 of 40** |
| first field that still differs | ★ **none** |

    node scripts/diag/replay-stored-race.mjs --race=<QN3HDP payload>
    POSITIONS IDENTICAL:     40 of 40
    FINISH TIMES IDENTICAL:  40 of 40
    ★ IDENTICAL — every position and every finishing time in milliseconds.

The full forty, stored beside replayed:

| # | name | ms | # | name | ms | # | name | ms | # | name | ms |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Bolt | 80032 | 11 | Blitz | 81488 | 21 | Maverick | 82320 | 31 | Flash | 83328 |
| 2 | Flare | 80304 | 12 | Raptor | 81568 | 22 | Dash | 82432 | 32 | Shadow | 83408 |
| 3 | Raven | 80432 | 13 | Hawk | 81712 | 23 | Ridge | 82496 | 33 | Rocket | 83552 |
| 4 | Apex | 80656 | 14 | Pixel | 81744 | 24 | Storm | 82592 | 34 | Arrow | 83568 |
| 5 | Surge | 80752 | 15 | Nova | 81808 | 25 | Thunder | 82720 | 35 | Falcon | 83696 |
| 6 | Orbit | 80800 | 16 | Blaze | 81840 | 26 | Vortex | 82800 | 36 | Phoenix | 83792 |
| 7 | **Breeze** | **80832** | 17 | Mercury | 81904 | 27 | Turbo | 82816 | 37 | Speedy | 83808 |
| 8 | Titan | 80848 | 18 | Swift | 81984 | 28 | Sparrow | 83088 | 38 | Nitro | 83888 |
| 9 | Atlas | 81072 | 19 | Eagle | 82112 | 29 | Gale | 83088 | 39 | Phantom | 84144 |
| 10 | Drift | 81216 | 20 | Quasar | 82128 | 30 | Comet | 83248 | 40 | Zephyr | 84576 |

Every cell above is BOTH columns — stored and replayed agree in all eighty numbers.

★ **THE TIE IS PART OF THE PROOF.** `Sparrow` and `Gale` both finish at **83 088 ms**, and the replay
puts them in the record's order. Order comes from `finishRank` (`raceCore.js:705`) on the replay side
and from the stored `results` array's own order on his; a comparison that re-sorted by time would have
been free to call that pair right by luck.

★ **THE PREVIOUS FIGURE, REPRODUCED EXACTLY AS A CONTROL.** Racing the same record under
`DEFAULT_CONFIG_WORLD` — the harness as it was before this piece — gives **10 of 40 positions and 2 of
40 times**, which is STORED-RACE-PARITY-1's number to the position. The defect and its repair are the
same measurement.

★★ **AND ONE THING THE REPLAY ESTABLISHES THAT WAS NOT ASKED FOR.** The SHIPPED world at stage
`wild`, with nothing else taken from his record, also reproduces `QN3HDP` **40 of 40 and 40 of 40**.
So **his install's race sliders are the shipped defaults, and the Race Action stage is the entire
difference** between his race and the harness's. That was assumed all week; it is now measured.

---

## 2 · ★ WHAT WAS REUSED FOR THE STAGE — NAMED, BECAUSE NOTHING WAS WRITTEN TWICE

| what | where it lives | how this piece reaches it |
|---|---|---|
| ★ **the application** | `client/src/modules/raceActionStage.js:78` — `applyRaceActionStage(dynamicsConfig, stage)` | imported by `raceDriver.mjs:47` and called in **one** place, `worldForActionStage` (`raceDriver.mjs:115`) |
| the stage table and the fallback | `defaults.js` → `RACE_ACTION_STAGES`, read through `raceActionStageValues` / `normalizeRaceActionStage` | never restated; the driver re-exports `normalizeRaceActionStage` rather than owning a copy |
| ★ **the reproduce rule** | `client/src/screens/RaceScreen/index.jsx:526-528` | mirrored, not re-derived — see below |

★★ **THE BROWSER'S OWN APPLICATION POINT IS UNREACHABLE FROM NODE, AND THAT IS WHY THE REUSE IS ONE
LEVEL DOWN.** `exportRaceConfig.buildWorldConfig` (line 107) is the browser's world builder, but it
reaches `localStorage` through the config loaders. So this piece reuses the function UNDER it —
`applyRaceActionStage` itself, the single author of the two keys — exactly as
`scripts/golden/goldenRace.mjs:91` already does on the node side. **That precedent is the model, not a
new pattern.**

★★ **THE REPRODUCE RULE IS THE PRODUCT'S, QUOTED FROM ITS OWN COMMENT.** `RaceScreen/index.jsx`
says it before this piece existed:

> *"The stage is applied on TOP of the stored dynamics, and the identifier records the config world
> AFTER that application (`buildWorldConfig` does the same), so a reproduced race takes the recorded
> block whole rather than re-applying a stage to it."*

— and the line under it branches on exactly that: `overrideConfigs?.raceDynamicsConfig ? … :
applyRaceActionStage(loadRaceDynamicsConfig(), stage)`. **`buildRace(geo, identity, cam, storedWorld)`
is the harness's half of that same branch.** Measured on `QN3HDP`: the stored
`raceDynamicsConfig` already carries `pulkChallengerBoost 0.12` and `pulkLeaderBrake 0.15`, so
re-applying the stage would be a second author of a value the record already states.

---

## 3 · WHAT WAS BUILT — THREE THINGS, ALL IN USE

1. **`buildRace` takes a config world** — `scripts/lib/raceDriver.mjs:344`,
   `buildRace(geo, identity, cameraConfig, configWorld = DEFAULT_CONFIG_WORLD)`; line 360 is
   `const W = configWorld ?? DEFAULT_CONFIG_WORLD` where it was `const W = DEFAULT_CONFIG_WORLD`.
   ★ **The default is unchanged**, so the 80 files that import this driver race exactly the race they raced
   before — which §5 measures rather than asserts.
   ★ **Two of the world's seven keys are accepted and IGNORED here, named so nobody concludes
   otherwise from a green replay**: the frame clock is `runRace`'s own fixed 60 Hz loop, and the
   camera config is its own parameter.
   ★ **ONE LIMITATION NAMED AT SOURCE AND NOT FIXED**: `raceHash` hashes the identity and the CAMERA
   config, so **two arms that differ only in their world stamp the same `race=` hash**. Widening it
   would move that line for every instrument in the tree, which is its own piece; until then a
   harness running two worlds has to say so itself, as `replay-stored-race.mjs` does.
2. **`worldForActionStage(stage, base = DEFAULT_CONFIG_WORLD)`** — `raceDriver.mjs:115`. For the case
   where an instrument has a STAGE and no world. Four lines, one of them `applyRaceActionStage`.
3. **`scripts/diag/replay-stored-race.mjs`** — the replay above. It refuses rather than substitutes:
   an unknown `geometryId`, a `targetLaps` that disagrees with the track record, or a missing world
   block is an error, because a replay that quietly filled one in would be the defect it was built to
   expose. It never talks to the store — it reads a saved `GET` payload, so no instrument in this
   repository carries a credential.

And **`scripts/lib/raceDriverWorld.test.mjs`** (4 tests, in `script-suite`) pins the three properties
that would have caught the defect the day it was written: the default is still the default, the
parameter is load-bearing, and the stage is not re-implemented.

---

## 4 · ★ SABOTAGE — BOTH BITE

| # | the mutation | result |
|---|---|---|
| **(a)** | `raceDriver.mjs:360` put back to `const W = DEFAULT_CONFIG_WORLD` **at source** | ★ replay falls to **10 of 40 / 2 of 40**; `raceDriverWorld.test.mjs` goes red on **exactly one** test — "the world parameter is load-bearing" |
| **(a′)** | the same thing via the instrument's own arm, `--world=default` | ★ **10 of 40 / 2 of 40** |
| **(b)** | the WRONG stage applied — `--stage=quiet` | ★ **10 of 40 / 2 of 40**, first difference at **position 1: stored Bolt, replay Flare** |
| **(b′)** | the wrong stage the other way — `--stage=medium` | ★ **7 of 40 / 0 of 40**, first difference at **position 1: stored Bolt, replay Breeze** |
| control | the RIGHT stage — `--stage=wild` | **40 of 40 / 40 of 40** (§1's last paragraph) |

Both source mutations were reverted and the 40/40 re-measured afterwards.

---

## 5 · ★★ THE DEFAULT PATH IS UNMOVED — MEASURED, NOT ARGUED

Both arms run on the same machine, the baseline in a worktree at `85262b1b` (this branch's tip before
the piece), the new one in the working tree.

| fingerprint | baseline `85262b1b` | ★ with this piece | |
|---|---|---|---|
| **world** | `b35cf477c09a1116` | `b35cf477c09a1116` | ★ **UNMOVED** |
| **world-off** (`--gapRerollEnabled=false`) | `19ccb497041a0dae` | `19ccb497041a0dae` | ★ **UNMOVED** |
| **camera** | `3df640a42e934312` | `3df640a42e934312` | ★ **UNMOVED** |
| **render** | `6a84085e79535dd6` | `6a84085e79535dd6` | ★ ****UNMOVED**** |

The world fingerprint's ten per-track hashes are identical one by one (`city-circuit e7892d5e2af7`,
`dirt-oval fcc5ff32690e`, `garden-path 1547a1c74ee7`, `ice-track a7479a60f6e0`, `luger-hill
40b3708513fa`, `mountainstreet 4d6806ad7360`, `river-run 1c1b63b9b65b`, `searound 51b0a1eb844c`,
`seatrack b18640daf688`, `space-sprint a6e33ec01973`) — the two runs' output differs in one line, the
elapsed-time stamp.

★ **THESE ARE THE BRANCH'S VALUES, NOT `docs/fingerprints.json`'s.** The branch has carried moved
world/camera/render fingerprints since ARRIVAL-STEERED-AGAIN-1, by design and unminted. What this
table proves is that **HARNESS-WORLD-1 moved none of them further.**

★ **GOLDEN RACES: PASS.** `check-golden-races: 2 race(s), every finishing position and time as
recorded (632 ms)` — `closed-garden-path-12` (12 racers, 35.35 s in 2 439 frames) and
`open-river-run-6` (6 racers, 30.00 s in 1 898 frames).

★ **`npm run verify` PLAIN: PASS 25 · FAIL 5 · SKIP 4** — **the same tally and the same five guards
ARRIVAL-STEERED-AGAIN-1 recorded on this branch.** Each red, and why it is not this piece's:

| guard | why it is red | how that was established |
|---|---|---|
| **client-suite** (3 golden parity pins) | they assert race OUTCOMES — one expects `Breeze` to win and gets `Surge` — which moved when ARRIVAL-STEERED-AGAIN-1 changed `racePlanner.js` | ★ **structural, not an appeal to history**: the failing tests import `scripts/parity/replay.mjs`, and `scripts/parity/` contains **zero** references to `raceDriver`. Nothing in the client's import closure reaches the file this piece changed |
| **world-fingerprint** | measured `b35cf477c09a1116` against the record's `8a1977187e9c99b4` | the branch left the record behind in ARRIVAL-STEERED-AGAIN-1, unminted and by design. ★ The measured value is **identical to the baseline worktree's** (§5) |
| **camera-fingerprint** | measured `3df640a42e934312` against the record | same, and same proof |
| **render-fingerprint** | measured `6a84085e79535dd6` against the record's `5e5fdc3fb6656d68` | same, and same proof |
| **check-runin-frame** | 2 cases — **dirt-oval n=40** (worst −353 px, OVERVIEW) and **luger-hill n=100** (−146 px, LEADER_ZOOM) | ★ **the guard's whole output is BYTE-IDENTICAL between the baseline worktree and this tree** (both runs diffed, only the elapsed-time line differs). ★ **AND A SMALL CORRECTION TO THE BRANCH'S OWN RECORD**: ARRIVAL-VARIANTS-1 and RACE-NEVER-ENDS-1 both name it as "`check-runin-frame` on luger-hill" — **it has been TWO cases, not one**, at `85262b1b` as well |

★ **`server-suite` PASS. `script-suite` PASS** — which is where this piece's own test runs.

★ **ONE CITATION REPOINTED, AND ONE LEFT ALONE.** The new comment blocks shift `raceHash` from line
162 to 207, and `client/src/modules/raceIdentifierReproduction.test.js:13` cited it by line. It is
repointed — the same thing ARRIVAL-VARIANTS-1 did when its switch moved a `docs/FORCE-MAP.md`
citation. ★ **`client/src/modules/diagnostics/trackCorridor.test.js:57` cites `raceDriver.mjs:121 and
:147` and is NOT repointed: it was ALREADY stale at `85262b1b`** (those lines held a comment and
`canonical()` there too, not the `width ?? getActualTrackWidth()` it describes). **Reported, not
quietly fixed — it is not this piece's drift.**
★ **`golden-races` PASS** as a verify guard too, not only standalone.

★ **NOTHING WAS MINTED AND NO GOLDEN RACE WAS RE-RECORDED.**

---

## 6 · ★ THE OTHER INSTRUMENTS WITH THE SAME DEFECT — REPORTED, NOT FIXED

Per the brief only the driver was changed. Addresses, and whether each can now be given a world:

| instrument | address | the defect | can it be given a world now? |
|---|---|---|---|
| ★ **`scripts/camera-fingerprint.mjs`** | **line 148**, `const W = DEFAULT_CONFIG_WORLD` | its OWN copy of the driver's build (its own `createRaceFromIdentity` at line 167), with the same hardcode; no stage | ★ **not yet** — it does not call `buildRace`. One parameter on its race builder, or a switch to `buildRace`, would do it |
| ★ **`scripts/render-fingerprint.mjs`** | **line 308**, same line | a third copy of the same build, same hardcode | ★ **not yet**, same shape of fix |
| ★ **`scripts/sim-fairness.mjs`** | world merge at **line 275**, `WORLD?.configs?.[key] ? {...def, ...WORLD.configs[key]} : def` | ★ **half-defective**: it CAN already be handed a world via `--config=world.json` — but it applies **no stage** (`grep -c applyRaceActionStage` → 0) and its `--config` wants the EXPORT blob shape (`{schemaVersion, configs}`), not a stored race's flat `worldConfigs` | ★ **yes, today, with no code change** — write the stored `worldConfigs` out as `{schemaVersion: 2, configs: {…}}`. A `--stage=` flag would be the smaller door |
| `scripts/fingerprint-default.mjs` | spawns `sim-fairness.mjs` | inherits the above. ★ **Its own header, line 71, already says so**: `raceActionStage.js` is not among the modules that run | ★ **yes**, by passing `--config` through to the sim |
| `scripts/parity/goldenRunner.mjs` | `browserArm`, **line 580**, `loadRaceDynamicsConfig()` | its `browserArm` claims to derive inputs "exactly as SetupScreen + RaceScreen do" — but the browser applies the stage on top of that loader (`RaceScreen/index.jsx:528`) and this arm does not | ★ **not yet**; the honest fix is one `applyRaceActionStage` in `browserArm` with the stage as an identity field |
| ★ `scripts/golden/goldenRace.mjs` | **line 91** | ★ **NOT DEFECTIVE — this one is the precedent.** It applies the fixture's own stage and says why in its comment | already correct |
| the other ~78 files that import the driver | — | all race the default world, which for most is what they should do | ★ **yes, today** — a fourth argument to `buildRace`, no other change |

★★ **THE TWO FINGERPRINTS ARE THE SUBTLE CASE AND SHOULD NOT BE "FIXED" CARELESSLY.** A fingerprint's
job IS to race the shipped world, and the shipped default stage is `quiet`, so **they are right to
measure what they measure.** What they cannot do is answer a question about any other world, and they
each carry a private copy of a race build — always separate from the driver's, and now one
parameter behind it. The defect is the
duplication and the impossibility, not the value.

---

## 7 · ★★ THE CONSEQUENCE — WHICH OF THIS WEEK'S CONCLUSIONS DESCRIBE A WORLD HE DOES NOT RACE

`wild` is `pulkChallengerBoost 0.12` + `pulkLeaderBrake 0.15`; every sweep this week ran `0.06` and
`0.10`. Both are **pulk-phase governor keys** — `raceCore.js:371-373` hands them to `raceGovernor.js` as
`leaderBrake` and `challengerBoost` — and neither appears in the arrival servo, which is what decides
the split below. **Nothing here was re-run, as instructed.**

### ★ SURVIVES — arithmetic in which neither key appears

| conclusion | why it holds at any stage |
|---|---|
| the servo clamp saturates once `rankError > 0.05 · nActive` (TAPER-INVISIBLE-1) | it is `clamp(1 + gain·(err/nActive) + noise, …)` and nothing else |
| `choreoReleaseProgress 0.97` zeroes a top-5 hero's rank error for the final 3% (DRAWN-PLACE-TRUTH-1 §3) | an address, not a sample |
| the arrival ceiling is field-size independent (ARRIVAL-SOLVE-1 §1) | `arrivalCeiling(rankError, maxMult, 4, 1.02)` takes no field size |
| the taper's effective distance is ~2 ranks at N=20/40 | the ceiling's own shape |
| a cast comebacker is **never** drawn first | `heroCurveGenerator.js` excludes the winner from the pool — a code exclusion |
| the on-screen conversion, ≈5.7× (1.100 = 85 px/s, 1.02 = 17) | pure arithmetic |

### ★★ DESCRIBES `quiet` — unmeasured at `wild`

| conclusion | where | does it plausibly survive `wild`? |
|---|---|---|
| **arrival pace** 1.033 / 1.051 / 1.037 / 1.048 by field size | ARRIVAL-SOLVE-1, ARRIVAL-STEERED-AGAIN-1 §3 | ★ **plausibly, and conservatively.** The ceiling is a clamp on a rank error the boost makes SMALLER — a challenger who closes earlier arrives with less error. The shape should hold; the fourth decimal will not |
| **peak gap while leading** 0.178 / 0.141 / 0.146 / 0.163 canvas widths | ARRIVAL-STEERED-AGAIN-1 §1 | ★ **plausibly, as an upper bound.** When the comebacker leads he IS the leader, and `wild` brakes leaders half again harder. BRAKE-CURVE-1 measured brake 0.15 at **+22% leading-group overtakes** and **+33% leader changes** |
| **block rate** 85.0% pooled (88.9 / 86.5 / 88.6 / 74.2) | ARRIVAL-STEERED-AGAIN-1 §3 | ★ **the −3 pp COMPARISON plausibly survives; the absolute does not.** Both arms move together, but where a comebacker lands relative to his band is exactly what these two keys reshape |
| **band-reach** 91.7 / 89.6 / 86.8 / 88.9% against the 70% gate | ARRIVAL-STEERED-AGAIN-1 §3 | ★ **survives AS A PRODUCT GATE and only as that.** The shipped stage is `quiet`, so the gate measures the shipped game correctly. For a host who has chosen `wild` it is unmeasured — though ACTION-FAIRNESS-1 and BRAKE-CURVE-1 both found band arrival never binding on these levers |
| **Holm 0 / 2 / 3 / 7** | ARRIVAL-STEERED-AGAIN-1 §3 | same as band-reach: it is the shipped world's figure, and the shipped world is `quiet` |
| the **ceiling schedule** and the arrival-shape sweeps (ARRIVAL-SHAPE-E-1, SERVO-RANKS-1) — 700–1 200 races each | those reports | ★ **the RANKING of shapes plausibly survives** (all arms move together); **no absolute in them describes his race** |
| **ARRIVAL-VARIANTS-1's** four-variant table | that report | same — a same-races comparison, so the ordering is the durable part |
| **COMEBACK-LEAD-WINDOW-1's** 2.5–6 s lead window, peak 0.27% of distance | that report | ★ **probably NOT unchanged.** It measures a leader pulling away, which is the exact thing `pulkLeaderBrake` acts on |
| **RACE-NEVER-ENDS-1's** 80–110 s of race clock, zero unfinished | that report | ★ **survives.** It is the duration model against a frame rate; a few percent of speed either way does not reach it |
| **DRAWN-PLACE-TRUTH-1 §1** and **LEADER-GAP-1 §1** — the seed-3 single-race traces | those reports | ★ **already withdrawn** as "his race" by STORED-RACE-PARITY-1. ★ **They are now RE-ESTABLISHABLE exactly**, which they were not this morning |

★★ **ONE MEASURED FACT ABOUT HIS STAGE THAT IS ALREADY ON RECORD AND BEARS ON ALL OF THE ABOVE.**
WILD-STAGE-1 (master `f34a2909`) measured `brake 0.15 + boost 0.12` — **his stage** — as **breaching
the 0.80 naturalness floor** (0.7928 / 0.7908, whole interval below, 22 of 30 races) where **neither
lever alone does.** So the world he watches is the one combination the action work found to be
outside that envelope. **This report neither re-measures nor recommends anything about it; it is
named because every "what he sees" conclusion above sits inside it.**

### ★ WHAT RE-ESTABLISHING THE ONES THAT MATTER WOULD COST

Three are worth it, in this order: **the on-screen gap** (clause 2 — the thing he can actually see),
**the block rate**, and **the arrival pace**.

- **Instrument cost: one line each.** Every one of those sweeps runs on `buildRace`, which now takes
  a world; the edit is a fourth argument of `worldForActionStage("wild")`. `sim-fairness.mjs` needs
  no edit at all — it already takes `--config`.
- **Machine cost: one arm, not two.** The `quiet` numbers are already in hand from frozen
  instruments, so only the `wild` arm has to be run. Measured here: a whole replay run — node
  start-up, module load and a 40-racer 2-lap race — is **4.4 s**, of which roughly **2.5 s is the
  race itself**. A 1 200-race arm (10 tracks × 4 field sizes × 30 seeds) is therefore of the order of
  **an hour single-threaded and 10–15 minutes at `--jobs=6`**, per conclusion. ★ That is keyed on the
  N=40 race measured here; **the N=100 cells cost more**, so treat it as the floor rather than the
  figure.
- ★ **What it does NOT cost: a rebuild.** Nothing has to be built to re-establish any of them.

---

## 8 · DISCLOSURE — A RACE IN HIS HISTORY THAT IS MINE

★ **Race `SF8GEZ`** (2026-09-13T17:19:22Z, winner **Nova**, roster "40 Racer Testgroup") **was created
by a previous piece's browser test and is not his.** It was deliberately left in place rather than
deleted, because deleting from his store is itself an alteration. **He should delete it himself.**

This piece created nothing in his store: one `GET`, no `POST`, and no copy of his data inside the
repository. ★ **The scratch copy of the `QN3HDP` payload was deleted after the runs above**, so the
instrument that replays it now has no data of his to read — which is why `replay-stored-race.mjs`
takes the payload as an argument rather than carrying one.
