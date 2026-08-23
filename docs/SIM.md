# SIM.md — Simulation System Documentation

**Owns:** the headless simulator — how to run it, what every metric means, and the fingerprint lineage. The measurement stack built on top of it is [SWEEP-HARNESS.md](SWEEP-HARNESS.md)'s.

> **⚠️ Pre-unification baseline.** Absolute sim numbers anywhere in this document (band-reach, runaway, P1-contest, physics-tax, gate results) predate the plan-grid unification (parity step 2a, 2026-07-23) and are pending re-measurement — see [reports/BASELINE-INVALIDATED.md](../reports/BASELINE-INVALIDATED.md). They remain as history.

## Table of Contents

1. [Overview](#1-overview)
2. [How to Run](#2-how-to-run)
3. [All Metrics](#3-all-metrics)
4. [Parameter Sweep Methodology](#4-parameter-sweep-methodology)
5. [Physics Behavior Parameters](#5-physics-behavior-parameters)
6. [Known Limitations](#6-known-limitations)
7. [Lessons Learned](#7-lessons-learned)
8. [Closed-Track finishT, Speed & Shared-Config Defaults](#8-closed-track-finisht-speed--shared-config-defaults)

---

## 1. Overview

### What the simulation does

The simulation system runs headless races — no rendering, no camera, no DOM — using the same physics modules the browser game imports. It was created to answer one core question: **does a racer's starting row unfairly determine their final position?**

Beyond fairness, the sim also measures lateral movement quality (zigzag, overlap, braking), overtake naturalness, and Race Plan zone hit rates. These metrics allow parameter tuning without waiting for visual inspection in the browser.

### How it relates to the browser game

**ONE loop, shared (step-order alignment, 2026-07-24).** The sim no longer has a per-frame loop of its
own. `runSingleRace`'s single-race stepping IS the browser's real per-step advance,
`raceCore.stepRacePhysics` — the exact function `RaceScreen` renders through (extracted, DOM-free, in
[`client/src/modules/raceCore.js`](../client/src/modules/raceCore.js)). The sim builds the race, then in
its loop calls `stepRacePhysics(state, cfg)` and runs its observers **around** it (they read state
between steps; they never steer). So a browser race and a sim race on the same identity + roster are
**byte-identical by construction** — the standing proof is `realArm == simArm` in
`client/src/modules/parity/goldenEquality.test.js` and the 600-identity soak (GOLDEN-SOAK.md). This
closed the last three divergences — **D-INIT** (per-step order), **D-RUNOUT** (finished-racer runout)
and **D-NAME** (the roster-name avoidance tiebreak; the sim now carries the browser's roster names). See
[reports/parity/DIVERGENCE-AUDIT.md](../reports/parity/DIVERGENCE-AUDIT.md) §2f.

Both sides import the identical physics modules:

- `raceCore.js` — the shared init + per-step advance (`createRaceFromIdentity` + `stepRacePhysics`)
- `raceBehavior.js` — soft steering, hard separation, avoidance, speed braking
- `rowLayout.js` — start position layout and speed bonus
- `racePlanner.js` — Race Plan zone targeting
- `lapUtils.js` — speed scale factor and reference FPS
- `EditorShape.js` — track geometry

**What the sim can predict:**

- Whether a parameter set produces fair win distributions across start rows
- Whether lateral motion is smooth (low zigzag, low overlap)
- Whether racers reach their assigned Race Plan zones
- Whether overtakes happen at natural spacing
- Whether all races complete within the allotted time

**What it cannot predict:**

- Visual quality, animation smoothness, or "feel" in the browser
- Camera behavior (zoom, pan, framing)
- Pulk density as perceived by a human observer
- Performance under network latency or frame-rate variation
- Any effect that only emerges at the actual rendering resolution

**The Sim-Browser Parity Rule:** every mechanics change must be mirrored in the sim before any parameter is applied to the game. The sim is not a sandbox — it is a prediction tool. After any sim-approved change, a browser check is always required.

### Browser determinism (Quick-Test seed)

Since 2026-07, the browser can replay a race exactly — the same mechanism the sim uses.

| Quick-Test seed field | behavior                                                                                                                                                                                                                                                                                        |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **empty** (default)   | **Random but replayable.** Each race draws a fresh seed (1–9999) _before_ it starts, then runs fully deterministic with it. Every race differs — the normal Quick-Test case, no input needed — and the HUD shows the drawn value, so any race can be replayed afterwards by typing that number. |
| **a typed number**    | **Fixed.** Every run with that number is the same race, move-for-move.                                                                                                                                                                                                                          |
| ~~0~~                 | Not reachable from Quick-Test: 0 is clamped up to 1, and an empty field means _random_, not _unseeded_.                                                                                                                                                                                         |

In both Quick-Test cases the seed drives the plan _and_ the dynamics: start rows, initial `spreadFactor`s, every scheduled re-roll, and both roll jitters.

The normal **"Start Race"** path **draws a seed too, since 2026-08-23 (SEED-REAL-RACE-1)**, through the same `resolveQuickTestSeed` and with the same three cases above. Its field lives in the host-facing **Race Settings** panel rather than in the Quick-Test row, and it persists in `localStorage` — the seed the last race actually ran with is kept there as well, so a drawn seed survives the browser being closed even though the field stays empty. **So a real race is reproducible now, which it was not before: `racePlanSeed: 0` meant the plan was unseeded (`seed > 0` is the condition for using mulberry32) and the dynamics came from the native `Math.random()`.**

**`0` remains the UNSEEDED value and is still reachable — by a stored race written before that date.** It is not back-filled: a race that ran unseeded is reported as not reproducible rather than given a seed it never had.

The random draw happens once in `SetupScreen/quickTestSeed.js` (`resolveQuickTestSeed`), **before** the race — so the race itself stays a pure function of the seed. **One module serves both start paths**, deliberately: two sets of semantics for the same idea would have drifted the first time one of them was fixed. A drawn seed is never written back into the field, which is what keeps the next race random instead of pinning it to the first drawn value.

Mechanism (parity step 1, 2026-07-23): the race-init effect in `RaceScreen/index.jsx` builds ONE explicit seeded stream, `makeRaceRng(racePlanSeed).physics`, and threads it through every physics draw site — start-row shuffle, initial `spreadFactor`s, both roll jitters, and every scheduled re-roll — the same shared `makeRaceRng` (racePlanner.js) the sim now uses. This **replaces the former global-`Math.random` swap**, whose defect was that per-frame render draws (camera framing, trail/particle spawns) consumed the same global and shifted the physics stream by frame rate, camera state and slow-mo. With an explicit stream those render draws stay on the native `Math.random` and can no longer touch the race. With `seed <= 0` `makeRaceRng` returns the native generator, so every pre-existing unseeded path is byte-identical to before. **That branch is no longer reached by a NEW race** — both start paths now draw a positive seed — but it is still reached by a race stored before 2026-08-23, which is exactly why it stays.

> **Practical note.** Before this change the HUD showed `seed:1` on every Quick-Test while the races clearly differed — the number was the _plan_ seed only, and the dynamics were unseeded. The HUD now reads `seed:N` only when the race really is reproducible — which, since 2026-08-23, is every newly started race on either path — and `unseeded` on the legacy `racePlanSeed: 0` path, which only a stored race can still take.
>
> **The seeded browser race is now frame-rate independent** — a given seed replays move-for-move regardless of frame pacing, camera state or slow-mo (proven by `RaceScreen/seedDeterminism.test.js`, which asserts identical finishing order + checkpointed progress across wildly different pacing profiles). This is the property parity step 1 delivered by isolating the physics RNG from render.
>
> **Cross-tool parity (updated 2026-07-23, parity step 2a — D-GRID unified).** The browser and sim now draw the _same physics stream_ AND the _same start-row grid_ for a seed: one per-race shuffle feeds both the race plan's target-ranks and the physical placement, on both sides (the sim's former per-combo FNV grid is deleted). To reproduce a browser seed `S` in the sim, run `--seed=S --races=1` (the sim derives race `i` as `(N−1)×N_RACES + i + 1`, which is `S` at `N=1, i=0`) with the same track, racer count and shipped default config. With those matched, the finishing order should agree. The **speed/duration model is now shared too** (2026-07 ship): both sides call `deriveRaceDuration` in `client/src/modules/durationModel.js`, so finishT, `race_baseSpeed`, the re-roll schedule and the plan duration are identical by construction — `scripts/diag/micro-divergence.mjs` reports a checkpoint diff of exactly zero. Reproduce a browser race with `--laps=N` (closed) or `--seconds=S` (open), or `--track-defaults` for the shipped defaults. The remaining known gap is any config the sim reads from defaults rather than an exported world; a full headless golden-test harness is deferred. The pre-unification absolute baselines are retired — see [reports/BASELINE-INVALIDATED.md](../reports/BASELINE-INVALIDATED.md).

### File locations

| File                              | Purpose                                                                                                                                                        |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/sim-fairness.mjs`        | Main headless simulator and flag-driven harness — single run, full metric report; shares its physics modules with the browser (the single source for both)     |
| `scripts/fingerprint-default.mjs` | Byte-identity gate — hashes the shipped-default sim run across all 10 tracks to prove a change left the default game byte-identical                            |
| `scripts/camera-fingerprint.mjs`  | The CAMERA's change detector — every director decision on every frame across all 10 tracks. Current value: [fingerprints.json](fingerprints.json)              |
| `scripts/render-fingerprint.mjs`  | The RENDER path's change detector — the draw-call SEQUENCE at sixteen fixed frames, reaching the finish. Current value: [fingerprints.json](fingerprints.json) |
| `scripts/exp-runaway-leader.mjs`  | Living reference sweep orchestrator (spawn per track → classify → CSV + `SUMMARY.md`); see [SWEEP-HARNESS.md](SWEEP-HARNESS.md)                                |

> The standalone `param-sweep*` scripts (5-axis, 8-axis LHS+Phase-2, braking, lateral) that older
> revisions of this doc listed have all been **deleted**. Sweeping is now done through the
> flag-driven `sim-fairness.mjs` harness (the same modules the browser runs);
> `fingerprint-default.mjs` gates default-behaviour identity. The measurement stack as a whole —
> observers, the orchestrator pattern, the determinism rule, output conventions — is documented in
> **[SWEEP-HARNESS.md](SWEEP-HARNESS.md)**.
>
> **Retired 2026-07-20 (cleanup step 4):** the `overnight-pulklr-sweep.sh` + `pp-pulklr-sweep.mjs`
> regression pair. Standing gates are now `fingerprint-default.mjs` (byte-identity) + the
> `sim-fairness.mjs` harness driven by flags; ad-hoc single-knob sweeps remain (below). Recoverable at
> commit `0bb639d~1` (the state before the step-4 deletion).

### What the race engine can reach

<!-- BEGIN GENERATED: engine reach — gen-engine-reach-doc.mjs -->

**This list is GENERATED, never typed** — `node scripts/gen-engine-reach-doc.mjs` reads the
closure from `scripts/engine-reach.mjs` and each purpose from the FILE'S OWN header. These are the
**36 files that can change the race**: touch one and the world fingerprint is owed, which
is exactly what the pre-commit tripwire and `npm run verify` route on.

A file whose header states no purpose is listed as **UNKNOWN**. That is a true statement about the
repository rather than a guess — give the FILE a header line and this table improves by itself.

| File | What it is, in its own words |
|---|---|
| `modules/autoSpriteScale.js` | Auto-sprite-scaling formula and config storage (D10). |
| `modules/camera/lapUtils.js` | **UNKNOWN** — the file's header states no purpose |
| `modules/durationModel.js` | THE canonical speed/duration derivation — ONE model, used verbatim by the browser (RaceScreen/SetupScreen) and by the headless sims. |
| `modules/heroChoreography.js` | Pure hero position-curve helper for the choreo choreographed director (Step 1). |
| `modules/heroCurveGenerator.js` | choreo Step 2 — PURE hero-curve GENERATOR. |
| `modules/raceBaseSpeed.js` | Duration-driven base speed for the race engine (PR-A2). |
| `modules/raceBehavior.js` | Pure racer-behavior logic for D7b: lane-free avoidance and drafting on continuous physicalY in normalized track-width space. |
| `modules/raceBehaviorConfig.js` | Storage CRUD for race-behavior tuning config (D7b). |
| `modules/raceConfigWorld.js` | Stage 0: the SINGLE source of truth for the exported "world" config. |
| `modules/raceCore.js` | the REAL race init + per-step advance, extracted from screens/RaceScreen/index.jsx so it is importable WITHOUT the DOM. |
| `modules/raceDynamicsConfig.js` | Storage CRUD for race-dynamics (re-roll) tuning config. |
| `modules/raceGovernor.js` | The PULK-phase contest director. |
| `modules/raceLengths.js` | the ONE source for the racer-LENGTH unit. |
| `modules/racePlanner.js` | Race Plan / Trajectory Generator — Phase 3A M2v2 Pure JS, no DOM/React dependencies. |
| `modules/raceStep.js` | the ONE per-frame t-update, imported by BOTH the browser race loop (screens/RaceScreen/index.jsx) AND the fairness sim (scripts/sim-fairness.mjs). |
| `modules/rowLayout.js` | D7c row-start layout logic: racer-to-row assignment (shuffled), physicalY distribution within a row, speed-bonus compensation for rear rows, and track-capacity auto-default. |
| `modules/storage/configDiff.js` | CONFIG-DIFF-2 |
| `modules/storage/defaults.js` | Default data for all storage keys — the value that applies wherever a stored config has no entry for a key. |
| `modules/storage/storage.js` | localStorage key registry and low-level read/write helpers |
| `modules/track-editor/EditorShape.js` | Race-engine shape adapter for track-editor geometry; wraps inner/outer Catmull-Rom splines. |
| `modules/track-editor/catmullRom.js` | Pure Catmull-Rom spline math — no DOM, no React. |
| `modules/utils/RandomHelper.js` | Shuffle and random assignment utilities used in the setup flow |
| `utils/mathUtils.js` | Shared interpolation helpers — single source of truth (see Lessons on "one source"). |
| `scripts/sim-fairness.mjs` | Headless fairness simulation — tests whether start-row position affects win probability across all tracks and racer types, with speedBonusMult (catch-up) fully active. |
| `scripts/sim/observers/comeback-reality.mjs` | **UNKNOWN** — the file's header states no purpose |
| `scripts/sim/observers/escape-episodes.mjs` | **UNKNOWN** — the file's header states no purpose |
| `scripts/sim/observers/fairness-stats.mjs` | **UNKNOWN** — the file's header states no purpose |
| `scripts/sim/observers/front-liveliness.mjs` | **UNKNOWN** — the file's header states no purpose |
| `scripts/sim/observers/gap-metrics.mjs` | **UNKNOWN** — the file's header states no purpose |
| `scripts/sim/observers/hero-adherence.mjs` | **UNKNOWN** — the file's header states no purpose |
| `scripts/sim/observers/outcome-front-battle.mjs` | **UNKNOWN** — the file's header states no purpose |
| `scripts/sim/observers/physics-tax.mjs` | **UNKNOWN** — the file's header states no purpose |
| `scripts/sim/observers/pulk-contest.mjs` | **UNKNOWN** — the file's header states no purpose |
| `scripts/sim/observers/release-contest.mjs` | **UNKNOWN** — the file's header states no purpose |
| `scripts/sim/observers/report.mjs` | **UNKNOWN** — the file's header states no purpose |
| `scripts/sim/observers/runaway-parade.mjs` | **UNKNOWN** — the file's header states no purpose |

36 files, 13 of them UNKNOWN.

<!-- END GENERATED: engine reach -->

---

## 2. How to Run

### Basic usage

```sh
node scripts/sim-fairness.mjs
```

Runs 50 races on all track×racer×duration combos. Writes two files to `client/tmp/`:

- `fairness-data.json` — machine-readable results
- `fairness-report.md` — human-readable Markdown report

### Core options

```sh
node scripts/sim-fairness.mjs \
  --races=100          # races per track×racer×duration combo (default: 50)
  --racers=40          # racers per race (default: 40)
  --openRacers=60      # racers for open-track combos (overrides --racers for open tracks)
  --closedRacers=40    # racers for closed-track combos (overrides --racers for closed tracks)
  --out=client/tmp     # output directory (default: client/tmp)
  --track=river-run    # run only this track (optional filter)
  --racer=horse        # run only this racer type (optional filter)
  --laps=2             # CLOSED tracks: lap count (the canonical closed-track input)
  --seconds=45         # OPEN tracks: race time in seconds (the canonical open-track input)
  --track-defaults     # each track at its own shipped default (laps / seconds), one variant
  --normalSpeed=150    # override the one normal track speed in px/s (shipped default 150)
  --dur=60             # measurement-protocol seconds; on closed tracks mapped per track to laps
```

### Fixed seed (deterministic runs)

```sh
node scripts/sim-fairness.mjs --seed=42 --races=100
```

With `--seed=N` (N > 0), race `i` uses seed `(N−1)×N_RACES + i + 1`. This makes runs fully reproducible. Use fixed seeds when comparing parameter sets — otherwise random variation can mask real differences.

`--seed=0` (the default) uses `Math.random()` for exploration. Never use seed 0 for parameter comparisons.

> **Determinism fix (2026-07, commit `3f9a055`).** Before this fix, `--seed` did NOT
> fully control a run: the start-row shuffle (`rowLayout.js` → `RandomHelper.shuffle`)
> used global `Math.random()` and ran _before_ the per-race seeded scope, so two runs
> with the same `--seed` produced different start-row assignments. The fix makes
> `shuffle(array, rng = Math.random)` take an optional RNG (default `Math.random`, so the
> **browser game is byte-for-byte unchanged**); the sim now seeds the combo row-layout RNG
> before the race loop. `--seed=N` now controls the _whole_ batch. Verify with a same-seed
> double-run: two runs at the same seed must be **bit-identical** (identical SHA256).
>
> **Gate methodology.** A hard "band-reach ≥70% per track on ONE 50-race run" gate is a
> coin-flip for tracks whose band sits near 70% (mid-field B3 does on several tracks:
> seed variance ≈ ±1.5–2.5pp). Use **pooled multi-seed data (~300 races/track, e.g. 6×50)**
> for pass/fail decisions; paired HEAD-vs-baseline per seed to isolate a change's effect.

### Race Plan mode

```sh
node scripts/sim-fairness.mjs --race-plan=true --bonusMult=1.0
```

Activates the Race Plan controller. Required when testing zone hit rates (`racePlanSuccessRate`). `--bonusMult` scales the speed bonus given to racers heading toward their target zone.

### Running on specific tracks

```sh
# Single track + racer, canonical inputs (open track → seconds; closed track → --laps=N)
node scripts/sim-fairness.mjs --track=space-sprint --racer=rocket --seconds=60 --races=200 --seed=42

# All tracks, extended run
node scripts/sim-fairness.mjs --races=200 --seed=42 --race-plan=true
```

### Running a sweep

There is no standalone sweep binary. A sweep is `sim-fairness.mjs` invoked repeatedly with
different mechanism flags — the same modules the browser runs. A multi-combo sweep is a thin
**orchestrator** around the harness (spawn per track → classify → CSV); the pattern, the observers it
draws on, and the determinism rule are documented in **[SWEEP-HARNESS.md](SWEEP-HARNESS.md)**, with
`scripts/exp-runaway-leader.mjs` as the living reference.

> **Retired 2026-07-20 (cleanup step 4):** the `overnight-pulklr-sweep.sh` +
> `pp-pulklr-sweep.mjs` regression pair (formerly documented here as the "one live regression sweep",
> configs A0 vs D2/D8). PulkLeadRotation shipped; the pair is no longer maintained. Recoverable at commit
> `0bb639d~1` (the state before the step-4 deletion). The standing gates are the byte-identity fingerprint + the flag-driven harness.

**Ad-hoc single-knob sweep** — drive the harness directly and vary one flag:

```sh
node scripts/sim-fairness.mjs --track=searound --racer=manta --dur=60 \
     --races=100 --seed=1 --pulkLeadRotationDropDepthLengths=<lengths>
```

**Byte-identity gate (before/after any change to prove the default game is unchanged):**

```sh
node scripts/fingerprint-default.mjs before     # run on the base
node scripts/fingerprint-default.mjs after      # run after the change; compare the two SHA-256 hashes
```

### Behavior config overrides

```sh
# Override specific behavior fields via JSON
node scripts/sim-fairness.mjs \
  --behavior='{"lateralForce":0.016,"lateralDamping":0.30}' \
  --avoidanceWarmupMs=<ms>
```

> The `--tef*` (tStart-Equalization-Feedback) and `--v4Threshold*` / `--v4InitialBoost` /
> `--v4BoostSchedule` / `--v4MetricType` example flags that older revisions of this section listed
> are **gone** — the TEF, ROW_SPLIT, and V4 start-row experiments were all deleted (see the INFRA
> note at the end of this file). The `--v4LateralProximity` flag survives, but only as a shared
> overtake-proximity constant read by the `--hero-map` observer; its name is historical.

### Comeback analysis

```sh
node scripts/sim-fairness.mjs --race-plan=true --comeback-analysis=true \
  --cbMinPositions=3 --cbWindowSec=5 --cbEndgameThresh=0.85
```

### Diagnostic snapshot mode

```sh
node scripts/sim-fairness.mjs \
  --diagnosticMode=true \
  --track=space-sprint --racer=rocket --dur=60
```

Writes per-race JSON snapshots at 0.0s, 0.2s, 0.4s, 0.6s, 0.8s, 1.0s, 2.0s, 5.0s showing brake-zone pairs, close pairs, and lateral pushes.

---

## 3. All Metrics

### Fairness: p-value (chi-square)

**Formula:** Chi-square goodness-of-fit test on win counts per start row vs. expected uniform distribution.

**What it measures:** Whether racers in the front rows win significantly more often than racers in the back rows. A fair race gives every row a win rate proportional to its size.

**Good:** p ≥ 0.05 (fail to reject the null hypothesis that rows win equally). Lower p means stronger evidence of unfairness.

**Limitations:** Requires enough races to detect small effects. With 50 races and 40 racers, a p-value of 0.05–0.15 is the realistic achievable range even for fair mechanics. Measure trends across runs, not single values.

---

### racePlanSuccessRate (overall)

**Formula:** `hits / total` across all racers, where a "hit" means the racer's final rank falls within their assigned Bereich (zone).

**What it measures:** How effectively the Race Plan controller steers racers to their target zone.

**Good:** ≥ 0.90 (90% of racers reach their assigned zone). Values below 0.75 indicate the controller is not operating.

**Limitations:** Only meaningful when `--race-plan=true`. At very high values (> 0.95), the race may feel "scripted" if racers are being pushed too aggressively.

---

### successRatePerTargetZone (B1–B5)

**Formula:** Per-zone hit rate — hits in zone Bk / total racers assigned to Bk.

**Zone boundaries:**

| Zone | Rank range | Speed bonus |
| ---- | ---------- | ----------- |
| B1   | 1–5        | +6%         |
| B2   | 6–15       | +4%         |
| B3   | 16–25      | +2%         |
| B4   | 26–40      | ±0%         |
| B5   | 41+        | −2%         |

**What it measures:** Whether the Race Plan system works uniformly across all target positions or favors front/rear zones.

**Good:** All zones within 5–10pp of each other and close to overall `racePlanSuccessRate`.

**Limitations:** B1 is hardest to hit (narrowest rank band). Apparent B1 underperformance may be noise at low race counts.

---

### zigzagScore

**Formula:** Average `|Δ(physicalYVelocity)|` per racer-frame, computed in the stable phase (after the first 4 seconds of warmup, before the race ends).

**What it measures:** Direction-reversal rate of lateral motion. High zigzag means racers are oscillating left-right instead of moving smoothly.

**Good:** < 0.003. Values above 0.005 are the Phase 1 hard cutoff — combos above this threshold are eliminated immediately.

**Limitations:** Correlates with `lateralSpeedScore` but captures different behavior. A racer that moves slowly but constantly reverses direction has high zigzag and low lateral speed. They should be read together.

---

### lateralSpeedScore

**Formula:** Average `|physicalYVelocity|` per racer-frame in the stable phase (after 4s warmup).

**What it measures:** Magnitude of lateral motion. Low values mean racers hold their lane; high values mean frequent repositioning.

**Good:** Lower is better. The velocity-based physics (Lesson 106) reduced this by 37% vs. the prior direct-force implementation.

**Limitations:** Does not distinguish necessary avoidance moves from unnecessary jitter. Must be read alongside `overlapRate` — lower lateral speed at higher overlap is not an improvement.

---

### brakeRate

**Formula:** Fraction of racer-frames (in the stable phase) where the speed brake is active.

**What it measures:** How often racers are slowing down due to proximity to another racer. High brake rate degrades overall race progression.

**Good:** Lower is better. No hard threshold defined; used as a tie-breaker in Phase 2 scoring.

**Limitations:** Braking is sometimes correct and necessary (tight pack, closing gap). A combo that eliminates all braking may allow racers to overlap freely.

---

### stableOvertakes

**Formula:** Count of confirmed lead-swaps where the leading racer stays ahead for at least 3 seconds, measured in the 20%–80% window of the race.

**What it measures:** Meaningful position changes — not flickering swaps caused by jitter. Higher values mean more race action.

**Good:** Higher is better. Used as a positive term in Phase 2 scoring.

**Limitations:** Only counts the stable-phase window. Start chaos and finish sprints are excluded. Low values on short tracks or with few racers are expected.

---

### overlapRate (old center-proximity metric)

**Formula:** Fraction of racer-pair-frames where `|dT| < 0.10 × bodyFillY × displaySize / pathLengthPx` AND `|dY| < 0.10 × bodyFillX × displaySize / trackWidth`. Thresholds are 10% of each body-fill diameter, converting to normalized track coordinates.

**What it measures:** Whether any pair of racer _centers_ are nearly coincident — roughly within 3–4 px in both axes simultaneously.

**Good:** Lower is better. No hard cutoff.

**Limitations — IMPORTANT:** This metric is **blind to rendered-body overlap during overtaking** (Lesson 126). Physics keeps centers at least `physSlot` apart (≈30–40 px), so the threshold (~3–4 px) is never reached under normal avoidance. The metric reads 0% even while racers' _rendered bodies_ (which can be 20–40 px long) visually cross during a pass. Use `honestOverlapRate` to detect real body-box intersections.

---

### honestOverlapRate (new body-extent metric)

**Formula:** Fraction of active racer-pair-frames (after 4 s warmup) where both of the following hold simultaneously:

- Longitudinal gap `< effectiveDisplaySize × bodyFillY` (rendered bodies touch or overlap lengthwise)
- Lateral gap `< effectiveDisplaySize × bodyFillX` (rendered bodies touch or overlap laterally)

For closed tracks, the longitudinal distance wraps by one lap (`tPos mod 1`) so same-lap adjacent pairs at the lap seam are correctly detected.

**What it measures:** Whether the rendered body boxes of two racers actually intersect — the same criterion a viewer would use to judge visual stacking. Catches overtaking overlap that the old metric misses.

**Good:** Lower is better. Typical values: open tracks 0.5–4% (dragon-type wide bodies); closed short ovals 5–8% (pack crowding — see Known Limitations). A value of 0% means no body-box intersections at any moment after warmup.

**Limitations:** A non-zero value on _closed tracks_ is almost always **same-lap pack crowding** (many bodies on a short perimeter), not lapping — measured directly: max progress spread in 60s homogeneous races is 0.2–0.55 laps, well below the 1.0-lap threshold for a genuine lap-over. The open-track counterpart (Lesson P-1 BACKLOG) is actual body-crossing during overtaking and is a physics bug under investigation.

---

### fairChanceExactRate / fairChanceTop5Rate / fairChanceByRow

**Formula:**

- `fairChanceExactRate`: of all B1-assigned racers (targetRank 1–5) across all races in the combo, what fraction finished at their _exact_ assigned rank?
- `fairChanceTop5Rate`: same denominator, what fraction finished _anywhere_ in positions 1–5?
- `fairChanceByRow`: same rates broken down by each racer's **starting row**. Answers whether back-row designated racers reach top-5 as often as front-row ones.

**What it measures:** Whether the race plan's B1 designation actually delivers racers to the top positions, and whether the row-blind lottery is truly row-blind in practice.

**Good:** `fairChanceTop5Rate` ~60% (measured across 66 combos at N=50–60); `fairChanceExactRate` ~18% (stochastic noise from re-rolls means racers land near but not exactly at their assigned rank). `fairChanceByRow` should be flat across rows — a systematic drop for back rows would indicate the P-controller cannot overcome the start deficit.

**Requires:** `--race-plan=true`. Returns null when race plan is inactive.

**Limitations:** At N=10 races, per-row `n` is very small (often 1–5 racers). The per-row rates are sampling-noisy — N=50 or more is needed before interpreting row-to-row differences as structural.

---

### maxRealSpread / honestSameLapFraction / honestCrossLapFraction (closed tracks only)

**Formula:**

- `maxRealSpread`: maximum `(t_leading − t_trailing)` observed across all active racer pairs and all frames during the race, in laps (1.0 = one full lap).
- `honestSameLapFraction`: fraction of honest-overlap events where `|ra.t − rb.t| < 1.0` (same lap or seam-adjacent).
- `honestCrossLapFraction`: fraction where `|ra.t − rb.t| ≥ 1.0` (genuine lapping: leader is 1+ full lap ahead).

**What it measures:** Whether lapping actually occurs, and whether closed-track honest overlap comes from same-lap crowding or genuine lap-crossing events.

**Good:** In 60-second homogeneous-field races, `maxRealSpread` < 1.0 and `honestCrossLapFraction` = 0% (confirmed across all tested combos). This means all closed-track honest overlap is same-lap crowding.

**Requires:** Closed track (`isOpen = false`). Returns 0 / null for open tracks.

**Limitations:** Open tracks always show `maxRealSpread = 0` and `honestSameLapFraction = null` — the lapping metrics are meaningless there. Lapping _could_ occur on closed tracks if the race is long enough or racer speeds differ greatly; `maxRealSpread ≥ 1.0` would confirm it.

---

### overlapResolutionFrames

**Formula:** Average consecutive frames a pair stays within the overlap zone before separating.

**What it measures:** How quickly the avoidance system resolves a collision. Short resolution times mean brief glancing contact; long times mean racers are stuck together.

**Good:** Lower is better. Used as a penalty in Phase 1 scoring.

**Limitations:** A single long-stuck pair can inflate the average significantly. Pair count should be checked alongside the average.

---

### natOvt (natural overtake fraction)

**Formula:** Fraction of overtakes where the time gap between racers just before the position swap is ≤ 30% of the reference inter-racer distance (`finishT / nRacers`).

**What it measures:** Whether overtakes happen at close quarters (natural) or because of sudden speed jumps at large gaps (unnatural, often caused by a bonus mis-fire).

**Good:** ≥ 1.0 (strict Phase 1 cutoff) or ≥ 0.90 (relaxed fallback). Values below 0.90 indicate bonus mechanics are producing teleport-style position changes.

**Limitations:** The 30% threshold is a calibrated heuristic, not a physical law. A race with very few overtakes can have 100% natOvt by default — high natOvt does not guarantee action-filled racing.

---

### outcomeReached

**Formula:** Fraction of simulated races that completed before the sim timeout.

**What it measures:** Basic sanity — do all racers finish?

**Good:** 1.0 (Phase 1 hard cutoff). A value below 1.0 means some parameter combo caused an infinite loop or degenerate state.

**Limitations:** A race that completes but takes 10× the expected time also passes this metric. `finishTime` outliers must be checked separately.

---

> **Removed:** the classic reactive director / governor (`applyGovernor`, `arcT`,
> `--governorEnabled`, `--governorDirectorEnabled`, `governorShape`) that older revisions of
> this doc documented has been **deleted**. The only shipped field-shaping mechanism now is the
> unconditional choreography + PulkLeadRotation (see the field-shape / gap metrics below and the
> Gap-space observers in §8). No `--governor*` flag exists.

---

### Field-shape / gap metrics (in _racer-lengths_)

The former governor telemetry is now covered by the front-action gap fields
(`gap2ndLenMean` / `gapMedLenMean`, below) and by the dedicated **gap-space observers**
(`--gap-metrics`, `scripts/sim/observers/gap-metrics.mjs`) documented in §8. All are reported in
_racer-lengths_ (arc-distance ÷ mean drawn body length), so they are lap-count- and
track-independent.

---

### Front-action metric (`results[].frontAction`)

**Flag:** `--front-action` (read-only observer, breakaway-diag pattern — a run without the flag is byte-identical). Raw per-combo aggregates are also written to `results/front-action/front-action-<diagLabel>.json`.

**What it measures:** the owner's priority-1 experience — a _contested, lead-changing FRONT_ — over the **pre-OUTCOME window only** (`progress < corridorStart`). It is the sweep's action objective.

| Field                                              | Meaning                                                                                                                                                                                                                                            | Static procession | Contested front |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | --------------- |
| `leadChangesMean`                                  | P1-identity changes per race                                                                                                                                                                                                                       | ~0–1              | many            |
| `distinctP1Mean`                                   | # of racers who ever hold P1                                                                                                                                                                                                                       | 1–2               | several         |
| `leadChangeRate`                                   | P1 changes ÷ pre-OUTCOME step                                                                                                                                                                                                                      | ~0                | high            |
| `podiumShuffleRate`                                | fraction of steps where the ordered top-3 changes (a fight for the LEAD vs churn deep in the field)                                                                                                                                                | ~0                | high            |
| `gap2ndLenMean` / `gapMedLenMean`                  | **front reach** — leader→2nd / leader→median in racer-lengths; a close front is small gap2nd, a lone breakaway is large gapMed                                                                                                                     | —                 | small gap2nd    |
| `unpredictability.rankVsP1Frac` / `rankVsTop3Frac` | **counter-metric:** \|Spearman\| between a racer's assigned `targetRank` and its early front-running time, pooled across all races/seeds. **LOW = fair** — the early leader is _not_ secretly the assigned winner. Action must not come from bias. | —                 | must stay LOW   |

**Calibration reference (acceptance check — the metric must agree with the owner's eye):**
The **seed-1 Searound × Manta** case is a **known "no action" race** — a lone breakaway with no real front fight. The metric scores it LOW, confirming it measures what the eye sees. The reference is **pinned to exact parameters** (below) because the gap measures are _means over the pre-OUTCOME window_ and therefore depend on `--dur` — an unpinned reference is ambiguous.

```
node scripts/sim-fairness.mjs --track=searound --racer=manta --dur=120 --races=1 --seed=1 \
     --front-action --diagLabel=calib --out=client/tmp/calib
```

Exact pinned parameters: **track=searound, racer=manta, seed=1, dur=120, races=1**, shipped choreography + PulkLeadRotation (unconditional). The numbers below were measured against the pre-cleanup HEAD `b930b1b` (classic-director world, which still had the removed surge + rubber-band forces) and are kept as an order-of-magnitude reference for the shape of a "no action" race; re-measure on current HEAD before using them as a hard gate:

→ `leadChangeRate ≈ 0.0007` (≈0.07 %), `podiumShuffleRate ≈ 0.004` (≈0.4 %), `gapMedLenMean ≈ 20.4` racer-lengths (leader far ahead of the median = lone breakaway), `gap2ndLenMean ≈ 4.7`. All contest dimensions read LOW.

**`gapMedLenMean` is a MEAN, not a peak — it scales with `--dur`.** It is the mean leader→median gap over the whole pre-OUTCOME window, so a longer race (more early-window steps of an ever-widening breakaway) reads a larger mean. Hold `--dur` fixed when comparing runs. Any future "action" mechanism must move `leadChangeRate` / `podiumShuffleRate` up **without** raising `unpredictability.*`.

---

---

### Early-decided grid (`--early-decided`) — who was in front, at a given progress

**Flag:** `--early-decided` (read-only; **requires `--gap-metrics`**). Records the **top-FIFTEEN racer indices on a 0.01 progress grid** — 100 rows per race, written as `gapMetrics.earlyDecidedGrid`. Unset → zero extra work, byte-identical run (the world fingerprint was proved unmoved when it landed).

**What it is FOR.** Nothing else in the tree records racer IDENTITY at a progress point: gap-metrics samples GAPS at its checkpoints (`frontGaps` is an array of distances), action-metrics keeps only first/last/min/max rank per racer, and hero-map covers heroes only. So questions of the form _"of the racers who finish in the top five, how many were already there at progress p?"_ had no instrument until this one. It rides INSIDE the gap-metrics block and reuses that block's own `gmOrder` and its checkpoint trigger, so **"position at progress p" has one definition in the tree, not two**.

**Why fifteen and not five.** The width is the point: one grid answers both the narrow reading (top-5 membership) and the front-GROUP reading, without a second run or a second definition. Which cut defines "the leading group" is an open owner question, and the observer refuses to choose one for him.

**How the first block read it:** at progress **0.60 / 0.70 / 0.80 / 0.90**, plus a derived _last-unsettled_ point at 0.01 resolution, and counts of racers entering or leaving the final top five after 0.80 and 0.90. **At N=30 an individual percentage carries a Wilson 95% interval of roughly ±16 points** — the distributions and the trend across checkpoints are what that N supports; a few points between two cells do not exist at it. Baseline figures: [EARLY-DECIDED-1](../reports/evolution/EARLY-DECIDED-1.md).

### Brake depth (`--brake-depth`) — the SLOW side of the naturalness envelope

**Flag:** `--brake-depth` (read-only; **requires `--action-metrics`**). Over that block's own window and
inside its own racer loop, records per race the **minimum realised speed factor**, the **minimum
`governorMult`**, and the **share of racer-frames sitting at the brake's own lower bound**, written as
`brakeDepth` on each race. Unset → zero extra work, byte-identical run (the world fingerprint was
proved unmoved when it landed, and again when it was merged).

**What it is FOR, and why nothing else answers it.** `amNatMax` is a **maximum** — the tree measured
how FAST a racer goes, against the 1.20 ceiling, and never how SLOW the leader brake makes one go,
while the brake is the shipped action lever. This is the counterpart on the other side.

**The bound it reports is NOT the ±12% envelope, and that is why it reports depth rather than clamp
hits.** `raceGovernor.js` computes the braked floor as `1 − max(maxEffect, leaderBrake)`, so the floor
**expands with the brake** and the ±`maxEffect` clamp stops binding the moment `leaderBrake` is the
larger number. The observer computes the floor from that same expression, so **"at the bound" means
here what it means in the force.** The envelope's two sides are not symmetric in code —
[ENVELOPE-ONE-SIDED-1](../reports/evolution/ENVELOPE-ONE-SIDED-1.md) establishes which side is
enforced and which is only described.

**One caution when reading it against a cap.** `minSpeedFactor` is the realised factor —
`spreadFactor × trajectoryMult × governorMult × areaBonusMult` — while the fast-side ceiling clamps
only `spreadFactor × governorMult`. **The instrument and the clamp do not cover the same product**, so
a realised maximum slightly above the computed cap is expected rather than a breach.

**How the blocks read it:** the mean over races of each race's own minimum, plus the count of races
below the documented 0.80 floor — a mean alone hides the distribution, and at a brake of 0.15 the mean
sits just inside the floor while half the individual races are already under it. Baselines:
[BRAKE-CURVE-1](../reports/evolution/BRAKE-CURVE-1.md) (the curve),
[LADDER-VALIDATION-1](../reports/evolution/LADDER-VALIDATION-1.md) (ten tracks, two field sizes).

### The Action axis (`--action=<0..1>`) — reserved stub

**Flag:** `--action=<0..1>` (read-only sweep hypothesis — **not** a shipped default). One owner-facing scalar `action` (0 = calm → 1 = wild), intended as the prototype of a future SetupScreen "Action" slider. Unset → no-op (byte-identical run).

**Current state: the axis is an empty stub.** Its original coupling drove the _classic reactive director_ knobs (cast size / dwell / pull / anchor). That director was **deleted** in the pulk cleanup (Stage-4), and the coupling went with it — `--action` no longer maps to anything and has no effect on a race. The flag is retained as a placeholder for a future re-target onto the PulkLeadRotation strengths (`pulkChallengerBoost`, `pulkLeaderBrake`, drop-depth, etc.); until then, sweep the individual `--pulk*` flags directly.

---

## 4. Parameter Sweep Methodology

> **Historical.** This section documents the two-phase LHS methodology of the deleted
> `param-sweep*` binaries (see the note in §1). Those scripts and their report artifacts
> (`sweep-phase1-report.md`, `full-sweep-report.md`) no longer exist. It is retained because the
> hard-cutoff rationale, the scoring intuition, and the lessons below (L106/L107) still inform how
> the surviving flag-driven harness is driven. For the current live sweep see §2 → "Running a sweep".

### Two-phase approach

The sweep uses two phases to balance coverage and confidence.

**Phase 1 — Broad exploration**

- Generates 1000 combos using Latin Hypercube Sampling (LHS) across the 8-parameter space.
- Runs 10 races per combo on 3 representative tracks (Space Sprint, Luger Hill, Dirt Oval).
- Applies hard cutoffs immediately — combos that fail are discarded.
- Survivors are scored and ranked.

**Phase 2 — Confirmation**

- Takes the top 10 survivors from Phase 1.
- Re-runs each with 100 races per track (10× more data).
- Scores by a weighted formula combining all quality metrics.
- Returns a single winner recommendation.

### Hard cutoffs and rationale

| Metric           | Cutoff                    | Rationale                                                        |
| ---------------- | ------------------------- | ---------------------------------------------------------------- |
| `outcomeReached` | < 1.0                     | All races must complete — a partial run cannot be scored         |
| `natOvt`         | < 1.0 (strict)            | All position changes must be physically close-quarters           |
| `natOvt`         | < 0.90 (relaxed fallback) | Used if the strict cutoff eliminates all survivors               |
| `zigzagScore`    | ≥ 0.005                   | Visible lateral oscillation — disqualifies any combo immediately |

There are no hard cutoffs on `overlapRate`, `brakeRate`, or `stableOvertakes` — these are soft penalties in the scoring formula.

### Dynamic extension

After Phase 1 ranking, if the top-10 mean for any parameter is within 18% of that parameter's range boundary, an extension phase generates 200 additional combos centered on the top-10 centroid with ±20% range. This provides local density without re-running the full sweep.

The extension phase found better scores (−5.5) than the initial 1000-combo LHS phase (−2.8) in the feat/lateral-velocity sweep, confirming that densification around promising regions beats uniform coverage at equivalent cost (see Lesson 107).

### Phase 2 scoring formula

```
score = racePlanSuccessRate × 10
      − zigzagScore × 5
      − lateralSpeedScore × 3
      − brakeRate × 2
      + stableOvertakes × 2
      − overlapRate × 1
      − pMin × 0.3
```

Where `pMin` is the minimum p-value across all tested tracks. Higher score is better.

### How to interpret results

- **Phase 1 report** (`sweep-phase1-report.md`): overview table + per-track survivor detail. Focus on whether any combos survived all three tracks, not on individual track scores.
- **Full sweep report** (`full-sweep-report.md`): Phase 2 winner with per-track breakdown, parameter values, and boundary analysis.
- **Boundary analysis**: if the winner's parameter values are at or near the range limits, the true optimum may lie outside the tested range. Consider extending.
- **Track variance**: a winner that scores well on Space Sprint but poorly on Dirt Oval is not a real winner — all tracks must pass.

### Known limitations of the sweep

- LHS guarantees one sample per stratum but does not guarantee finding the global optimum. The Phase 1 result is a good starting point, not a proof of optimality.
- 10 races per combo (Phase 1) is too few to distinguish small differences in p-value. Phase 2 with 100 races is required before applying any result to the game.
- The sweep tests three specific tracks. A winner may perform differently on tracks not in the test set.
- All combos are tested with `--seed=42` (deterministic). The seed 42 was chosen for the sweep; results may differ with other seeds. Browser validation always uses live (unseeded) runs.

### PulkLeadRotation action sweep — the live objective

The classic governor/director knob-reduction sweep this section once described is **obsolete** —
that director and its ~15 DevScreen knobs (`governorK0`, `governorRampWidth`, `governorMaxEffect`,
director cast/dwell/pull, etc.) were deleted. The shipped world has exactly one action mechanism:
the unconditional choreography + **PulkLeadRotation** (`applyPulkLeadRotation` writes `governorMult`
in the PULK phase `[chaos boundary, choreoOutcomeStart]`, faded to 1.0 by OUTCOME).

Optimizing the PulkLeadRotation strengths (`--pulkLeadRotationDropDepthLengths`, `--pulkChallengerBoost`,
`--pulkBoostHeadroom`, `--pulkLeaderBrake`, …) means driving the harness directly for
**front-action / pulk-contest** (the `--action-metrics` observer) subject to the **unpredictability**
counter-metric staying LOW and the fairness gate (band-reach, 0 Holm-unfair start rows — [FAIRNESS.md](FAIRNESS.md)) holding vs
the mechanism-off floor (`--race-plan=false`). Compare an A0 floor against drop-depth 2/8 across the 10
standard tracks by hand or a small orchestrator (see [SWEEP-HARNESS.md](SWEEP-HARNESS.md)).

> The `overnight-pulklr-sweep.sh` + `pp-pulklr-sweep.mjs` pair that once automated this A0-vs-D2/D8
> comparison was **retired 2026-07-20** (cleanup step 4; recoverable at commit `0bb639d~1`). The
> knob and its flags are unchanged — only the dedicated wrapper is gone.

---

## 5. Physics Behavior Parameters

The following parameters control lateral collision avoidance and speed braking. They must be tuned together — changing one in isolation typically breaks another.

The values below are the **Phase 5 winners** — locked into `storage/defaults.js` after the `feat/open-track-overlap` sweep. One parameter (`avoidanceDistance`) is retired from the browser gate. `speedBrakeYThreshold` is still read by the browser as a same-lane fallback when track width is unavailable (`raceBehavior.js`); kept for both browser and sim use.

> **Home force is gone.** The `homeForceStrength` / `homeForceReductionOnOverlap` home-lane
> restoring spring that older revisions of this table listed was **removed** (Commit A of the
> lateral-physics cleanup); the config keys no longer exist in `storage/defaults.js` and neither
> engine reads them. The live lateral model is Soft Steering (a single target spring) plus a Hard
> Separation backstop — see the FORCE-MAP force map. The `lateralForce` / `lateralDamping`
> / brake parameters below are still read by `raceBehavior.js`.

### Parameter table

| Parameter                                         | Default | Range (sweep) | What it controls                                                                                                                                                                               |
| ------------------------------------------------- | ------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lateralForce`                                    | 0.0114  | 0.006–0.024   | Force applied to `physicalYVelocity` per frame when another racer is within the geometric avoidance gate                                                                                       |
| `lateralDamping`                                  | 0.16    | 0.05–0.45     | Velocity retention per frame: `velocity *= lateralDamping`. Hard cap < 0.50 (code constraint)                                                                                                  |
| `avoidanceBufferPct`                              | 0.20    | —             | Buffer fraction beyond body contact before the avoidance gate fires (20% lead time); replaces the old fixed `avoidanceDistance` in the browser gate                                            |
| `speedBrakeFactor`                                | 0.945   | 0.87–0.995    | Speed multiplier applied when braking; 0.945 = 5.5% speed reduction per brake frame                                                                                                            |
| `speedBrakeTMultiplier`                           | 1.5     | 0.5–3.0       | Longitudinal lead-time multiplier for the body-based brake zone (replaces the old fixed `speedBrakeTThreshold`)                                                                                |
| `avoidanceDistance` _(retired from browser gate)_ | 0.18    | 0.07–0.28     | Former fixed proximity threshold in normalized track coordinates; replaced by body-based geometric gate + `avoidanceBufferPct`. Kept for sim script backward compat.                           |
| `speedBrakeYThreshold`                            | 0.18    | 0.05–0.22     | Default same-lane lateral threshold; still read by the browser as a fallback when track width is unavailable (`raceBehavior.js`). Body-based detection takes precedence when `trackWidth > 0`. |

### Why they must be changed together

**lateralForce ↔ lateralDamping:** Force is applied to velocity; damping determines how long the impulse persists. Strong force with high damping produces sharp, short pushes. Weak force with low damping produces slow, wide drifts. The interaction determines oscillation frequency — changing one without the other typically either causes zigzag (too little damping) or sluggish avoidance (too much damping).

**speedBrakeTMultiplier ↔ speedBrakeFactor:** Braking triggers when the longitudinal gap between two racers is less than `speedBrakeTMultiplier × bodyLength`. A tight multiplier with a weak brake factor produces many small slow-downs. A loose multiplier with a strong brake factor produces few but severe slow-downs. Both affect `brakeRate` and `stableOvertakes`.

**avoidanceBufferPct ↔ lateralForce:** The buffer fraction determines how early avoidance fires relative to actual body contact. A larger buffer with small force produces prolonged gentle pushes (high `lateralSpeedScore`). A smaller buffer with large force produces sharp last-moment corrections (potential zigzag near the threshold).

### Dev Screen

The physics sliders (`lateralForce`, `lateralDamping`, `avoidanceDistance`, `speedBrakeFactor`, `speedBrakeTMultiplier`, `speedBrakeYThreshold`) were removed from the Dev Screen during `feat/dynamic-speed-brake`. The Phase 5 winner values are now locked in `storage/defaults.js`. To test new values, override via `--behavior='{"lateralForce":…}'` in the sim, or apply a temporary patch in `storage/defaults.js` and run the browser gate.

---

## 6. Known Limitations

### What the sim cannot measure

**Visual quality and perceived feel.** All sim metrics are mathematical averages over many races. A racer pack that "feels alive" to a human observer produces the same `pulkTimeFraction` as one that feels static. Lateral smoothness metrics (`zigzagScore`, `lateralSpeedScore`) are correlated with visual quality but not identical to it.

**Camera behavior.** The sim has no camera. Zoom level, pan speed, and framing quality are entirely outside the measurement domain. A parameter set that produces correct physics may still look wrong if the camera cannot frame the pack.

**N-scaling beyond test count.** All sweeps run at N=40–50 racers. A winner found at N=40 may perform differently at N=8 (lobby game) or N=80. The scaling behavior is untested.

**Short races (< 30s).** The minimum tested duration is 30 seconds. Behavior at 10–20s is extrapolated, not measured. The warmup exclusion (first 4s) removes a larger fraction of a 10s race than a 60s race.

**Catch-up tuning without `speedBonusMult`.** The sim always runs with `speedBonusMult` active. The baseline (bonus off) is not tested. Results apply only to the bonused configuration.

**Track-specific effects in Phase 1.** Phase 1 scoring aggregates across three tracks. A combo that is excellent on two tracks and broken on one may still survive Phase 1 if the aggregate score is high enough. Always check per-track p-values in Phase 2.

**`liteOverlapRate` is blind to rendered-body overlap.** The center-proximity metric reads ~0% in all tested conditions because physics prevents centers from reaching its threshold (~3–4 px). Real visual stacking during overtakes (bodies crossing lengthwise) is invisible to it. Use `honestOverlapRate` for body-level overlap measurement (Lesson 126).

**Closed-track `honestOverlapRate` is pack crowding, not lapping.** Short closed ovals (path ≤ 3300 px) produce 5–8% honest overlap in 60s homogeneous fields because 40 racers occupy 30–40% of the perimeter by body length. Direct measurement confirms lapping does not occur: `maxRealSpread` is 0.2–0.55 laps (well below 1.0) and `honestCrossLapFraction` is 0% in all tested combos.

### Start-phase warmup exclusion (first 4 seconds)

All naturalness metrics (`zigzagScore`, `lateralSpeedScore`, `brakeRate`, `stableOvertakes`) exclude the first 4 seconds of each race. This is because:

1. At race start, all 40–50 racers launch from a tight grid. Avoidance, braking, and lateral forces all fire simultaneously, producing metrics that are not representative of steady-state racing.
2. The Race Plan controller ramps up its influence over the first few seconds. Including this ramp in the metrics would penalize combos that produce correct behavior after the ramp completes.

The 4-second boundary was chosen empirically: it covers 2–3 typical racer-length separations at nominal speed, after which the field has spread enough for individual avoidance to dominate over start-grid crowding.

### Why browser check is always mandatory

Even after a sim winner is found and validated with 100 races per track at fixed seed, the browser check is required because:

- The sim runs at a fixed framerate (REFERENCE_FPS). The browser's actual framerate varies.
- Rendering triggers sprite caching, audio, and UI event processing — none of which are in the sim loop.
- The camera system reads racer positions and may influence the perceived race even when physics are correct.
- Human perception of "natural" motion cannot be reduced to any single metric.

---

## 7. Lessons Learned

### L106 — Velocity-based physics eliminates zigzag at zero overlap cost

_(docs/LESSONS.md, Lesson 106)_

Prior to feat/lateral-velocity, lateral forces were applied directly to `physicalY`. With opposing forces (home force vs. avoidance), the sign could flip frame-to-frame, producing visible oscillation in tight packs.

The fix: accumulate forces into `physicalYVelocity`, then apply with damping:

```js
physicalYVelocity = physicalYVelocity * lateralDamping + netForce;
physicalY += physicalYVelocity;
```

**Sim result:** −37% `lateralSpeedScore`, −44% `zigzagScore` at the same or lower `overlapRate`. Zone success rates were unchanged (+0.3pp, within noise).

**Key insight:** Smoothing and accuracy are decoupled. Physics-based smoothing (velocity + damping) is more robust than threshold-based filtering because it scales naturally with the unit-normalized physicalY space, without requiring per-track tuning.

### L107 — LHS extension outperforms uniform coverage

_(docs/LESSONS.md, Lesson 107)_

The 8-parameter sweep used Latin Hypercube Sampling (LHS) for Phase 1. LHS guarantees one sample per stratum but does not densify around promising regions. After Phase 1, the top-10 centroid was used to generate 200 extension combos within a ±20% window.

**Finding:** The extension phase found better scores (−5.5) than the initial 1000-combo LHS phase (−2.8), even though 1000 combos is a large Phase 1 by any standard.

**Pattern codified:**

1. LHS Phase 1 — broad coverage (≥ 500 combos)
2. Check whether top-10 mean is within 18% of any range boundary
3. If yes: generate 200 extension combos centered on the top-10 centroid with ±20% range
4. Phase 2 — 100-race validation on the top-5 survivors

**Key insight:** The number of survivors that reach Phase 2 matters more than the total Phase 1 sweep size. Tight hard cutoffs (especially `zigzagScore ≥ 0.005`) reduce the search space dramatically and prevent physically invalid combos from polluting Phase 2.

### Surprise: avoidanceDistance going very low

Across multiple sweeps, the best-performing combos consistently favored lower `avoidanceDistance` values than the default (0.15) — often in the 0.07–0.10 range. This was unexpected: the intuition was that racers should react earlier (larger distance) to avoid collisions.

The actual finding: smaller avoidance distance means racers react only when genuinely close, producing fewer unnecessary lateral moves. Combined with velocity-based physics, close-range reactions are smooth rather than jerky. Larger distances triggered avoidance for racers that would have naturally passed without intervention, inflating `lateralSpeedScore` and `brakeRate`.

### What surprised us about the sweep scores

Phase 2 scoring consistently showed that `racePlanSuccessRate` and lateral quality metrics are largely orthogonal. A combo that excels at zone targeting does not necessarily produce smoother lateral motion, and vice versa. This justifies the weighted scoring formula — both must be optimized simultaneously, and the weights reflect that zone targeting (weight 10) is the primary objective while smoothness (weights 3–5) is a secondary constraint.

---

## 8. Closed-Track finishT, Speed & Shared-Config Defaults

This section documents the closed-track finish-line / speed mechanism and the shared-config
default wiring as they exist after the June 2026 parity work (`8f57cba`, `9cfa953`). The intent
is that `sim-fairness.mjs` is a faithful predictor of the browser — every player-facing tunable
is sourced from the same module the browser/DevScreen use, never hand-mirrored.

### THE canonical speed/duration model (speed/duration ship, 2026-07)

There is exactly **one** speed normalisation and **one** duration derivation in the project, in
`client/src/modules/durationModel.js`. The browser (`RaceScreen`, `SetupScreen`) and every sim
(`sim-fairness.mjs`, `sim-race-visual.mjs`, `headlessRaceSimulator.js`) import it and use the
returned scalars verbatim. Nothing downstream re-derives a duration.

**The pace.** One number, `baseSpeedConfig.normalSpeedPxPerSec` (adjustable in Dev Screen →
Dynamics → Speed → _Normal Track Speed_, shipped **150 px/s** — the owner's pick; see
[reports/parity/REBASELINE.md](../reports/parity/REBASELINE.md)), times the race type's multiplier:

```
paceSpeed = normalSpeedPxPerSec × speedMultiplier          [world px/s]
```

`paceSpeedPxPerSec()` is the single definition; every helper below takes its result, never the
bare normal speed. A mean racer of that type travels exactly `paceSpeed` px/s — **on a closed
track and on an open track alike**. That cross-topology equality is the owner's law and is pinned
by `durationModel.test.js` → _the owner's law_.

**The derivation** (`deriveRaceDuration`), with `P = paceSpeed`:

|            | operator picks       | finishT                                                               | duration                               |
| ---------- | -------------------- | --------------------------------------------------------------------- | -------------------------------------- |
| **CLOSED** | `laps` (integer ≥ 1) | `laps`                                                                | **derived**: `laps × pathLengthPx / P` |
| **OPEN**   | `seconds`            | **derived**: `P × seconds / pathLengthPx`, capped at `1 − runoutZone` | the chosen seconds                     |

For open tracks, `naturalMaxSeconds = (1 − runoutZone) × pathLengthPx / P` is the longest race the
track holds at pace. Choosing **more** time than that is allowed: the finish line pins to the
physical end and the whole field is slowed uniformly by `paceScale = naturalMax / requested`,
so the race still lasts exactly the chosen time. There is **no speed-up** counterpart — the
shortest closed race is one lap, whatever it lasts.

Because the pace carries the type factor, **a slower type takes proportionally longer** over the
same laps: `duration(M) = duration(1) / M`. A snail race and an F1 race are not the same length.
On open tracks, which are time-bounded, the type moves the _finish line_ instead:
`finishT(M) = finishT(1) × M`. The pace is defined by the **mean** racer; the base-speed spread
only widens the finishing field around it, and enters the setup **display** via
`fieldFinishWindow()` — never an engine input.

`raceBaseSpeed` is `computeRaceBaseSpeed(finishT, realizedDurationSec × speedMultiplier)`, so the
engine's `r.baseSpeed = raceBaseSpeed × M × spreadFactor` puts the mean racer at `paceSpeed`.

**One clock.** `realizedDurationSec` is the single duration scalar. `race_baseSpeed`, the re-roll
schedule (`rollCount` / `rollInterval` / `lastRollDeadline`), the plan's `targetDurationMs`, the
`racePlanEnabled` gate and every phase/easing fraction key on it, on **both** sides.

#### What this deleted

| deleted                                                         | was                                                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `lapsFromDuration`                                              | the closed-track laps staircase (< 60 s → 1, 60–89 → 2, 90–119 → 3, ≥ 120 → 4) |
| `computeClosedTrackSsf` / `REFERENCE_CLOSED_PATH_PX`            | closed normalisation `pathLengthPx / 3200`                                     |
| `computeSpeedScaleFactor` (+ hidden `_MIN_SCALE = 0.5` clamp)   | open normalisation `pathLengthPx / 2000`                                       |
| `computeFinishT`                                                | the sim's open-track finish-line formula                                       |
| `estimateClosedTrackDurationSec`, `openTrackDurationRange`      | display-only mirrors of the above                                              |
| the N-calibrated expected-minimum spread factor **in the pace** | made the pace depend on racer count                                            |

The staircase survives **only** as `legacyLapsFromDefaultDuration()`, a migration helper for
tracks still carrying a pre-ship `defaultDuration`. Nothing in a running race calls it.

#### The seam this closed

Before this ship the browser derived `finishT` from the _setting_ (60 → 2 laps) but derived
`race_baseSpeed`, the re-roll schedule and the plan duration from a _nominal_ traversal time
(`estimatedSecondsPerLap × laps ≈ 28 s`), while the sim keyed all of them to the raw
`durationSec = 60`. Same seed, two different races — a 2.14× pace ratio on searound/manta.
`scripts/diag/micro-divergence.mjs` now re-runs its A/B arms through the shared model and reports
a checkpoint diff of **exactly zero**. See [reports/parity/MICRO-DIVERGENCE.md](../reports/parity/MICRO-DIVERGENCE.md).

### Fingerprint rule (binding)

The shipped-default fingerprint (`scripts/fingerprint-default.mjs`) hashes **behaviour** — race
results — so lint, reformatting and comment edits cannot move it. Therefore:

**Compute it exactly ONCE per world (ON flagless, OFF with `--gapRerollEnabled=false`), on the
FINAL COMMITTED state — after lint and after the commit.** No pre-change measurement, no
intermediate measurements, and none of either in a report. Debug runs during development are fine
and stay unreported. A commit that claims byte-identity, and a commit that moves the numbers by
design, each get one measurement of the pair on their final state; record old → new.

**Current shipped-default fingerprint (2026-07-31 — RACER-MOTION-2, lateral acceleration cap).** The shipped
world is COMBO15 (speed 150 px/s + gap-reroll ON G=0.5/s=1.0 + FAIR-ARRIVAL chaos steer + faB60 draw-bias,
chaos window 0.15) PLUS the **avoidance margin hysteresis** (`softSteeringObstacleMargin`, RACER-FLAPPING-2)
PLUS the **lateral acceleration cap** (`maxLateralAccelPerStep` — bounds the per-tick change in a racer's
lateral step so a dodge eases in/out instead of snapping to full swerve; the hard-separation safety is
untouched). This is the SECOND engine change since COMBO15. Because the cap is in the avoidance integrator
(which runs in BOTH worlds), **both** hashes moved. The current print is:

| world                                                                      | fingerprint                                          |
| -------------------------------------------------------------------------- | ---------------------------------------------------- |
| ON (flagless — the shipped game = COMBO15 + margin hysteresis + accel cap) | **current — [fingerprints.json](fingerprints.json)** |
| OFF (`--gapRerollEnabled=false` — pre-feature world)                       | **current — [fingerprints.json](fingerprints.json)** |

The ON hash moved by design at each world change (retune `e93ffa70dad562a1` → plan-grid `0ecca5e2dbe6526e`
→ speed/duration `e80f78a0da6a9993` → type-mult `eda28d614f5e47d9` → step-order `8b13ccbe96992cc0` →
speed-150 `6fdfe851dbb4ca72` → gap-flip `7c70b1eae7d31e22` → COMBO15 `ded0a126048e4cdb` → RACER-FLAPPING-2
`62400c8e88cdbe59` (**the pre-motion anchor, SUPERSEDED 2026-07-31**) → **RACER-MOTION-2, which produced the
CURRENT world — its value is in [fingerprints.json](fingerprints.json), not here**). The OFF invariant moved
again at the same time (`8d0bd4d2d92ded24`, **superseded 2026-07-31**, → the current OFF invariant, same
record) because the accel cap is present with gap-reroll OFF too. To reproduce the pre-motion world set `--behavior='{"maxLateralAccelPerStep":0}'` (a valid slider
position, parity rule) — that returns `62400c8e88cdbe59` (ON) / `8d0bd4d2d92ded24` (OFF). To reproduce the
pre-flapping world additionally set `--behavior='{"maxLateralAccelPerStep":0,"softSteeringObstacleMargin":0}'`
— that returns `ded0a126048e4cdb` (ON) / `f8f7d9c2fd3283e9` (OFF). To
reproduce the pre-combo15 world set
`--chaosSteer=false --bandBias=false --pulkStart=0.25` (a valid slider position, parity rule) — that
returns the `7c70b1eae7d31e22` print. Baseline metrics: [reports/evolution/FAIR-ARRIVAL-GATE.md](../reports/evolution/FAIR-ARRIVAL-GATE.md)
(the N=100 gate record) + [reports/parity/REBASELINE.md](../reports/parity/REBASELINE.md). **The dated
subsections below are accreting history — their fingerprints were current on their date; this block is the
current print.**

**The ON hash did NOT move at SHIP-THE-NIGHT (2026-08-10, `a4cb669a`), and that is the entry worth
making**: two engine changes landed in the pair loop at once — a deduplication and a two-axis cull
that skips 96.6 % of pairs at 100 racers — and the hash held on all ten per-track values, separately
and merged. **For a cull, the unchanged world IS the correctness proof**, not a side note: it is what
establishes that every skipped pair was one both gates would have rejected. The same ship moved the
CAMERA and RENDER prints (`outcomePhaseThreshold` 0.65 → 0.75); both are in
[fingerprints.json](fingerprints.json) with their lineage.

### CLI race-length inputs

The sim takes the **same two operator inputs the browser takes**, so any browser race is
expressible as a sim invocation:

```
--laps=<n>          CLOSED tracks: the lap count (finishT = laps; duration derived)
--seconds=<s>       OPEN tracks:   the race time (finish line derived; slowdown past natural max)
--track-defaults    each track at ITS OWN shipped default (defaultLaps / defaultDurationSec),
                    one variant — this is the shipped-default game the fingerprint measures
--normalSpeed=<v>   override the one normal track speed (px/s) for a sweep
```

**Measurement-protocol mapping.** `--dur=<s>` is retained for the fixed-seconds scaling runs
(30 / 60 / 120 / 300 s). On **open** tracks it is the seconds directly. On **closed** tracks it is
mapped per track by `lapsForApproxSeconds(s, pathLengthPx, V)` = `max(1, round(s × V / L))` — the
lap count whose derived duration is closest to `s` on that track. That is the model read backwards,
not a staircase constant, so it tracks the normal speed automatically — recompute per speed via
`lapsForApproxSeconds`, never a fixed table. At the shipped **150 px/s**, e.g. searound (5147 px) maps
`--dur=30 / 60 / 120 / 300` → **1 / 2 / 3 / 9 laps** (the counts fall as the pace slows from the 225-era
example, exactly because the mapping tracks the speed).

`DURATION_VARIANTS` (default `[30, 60, 120]`) remains the sweep loop variable and now carries the
protocol **seconds**; `--seconds=` overrides it, `--track-defaults` collapses it to one per-track
default.

### race_baseSpeed

`raceBaseSpeed` comes straight from `deriveRaceDuration` — it is
`computeRaceBaseSpeed(finishT, realizedDurationSec × speedMultiplier)`, one expression for both
topologies. The old `ems × closedSsf` / `ssf` denominators are gone. See the master formula in
[ARCHITECTURE.md](ARCHITECTURE.md).

### Shared-config CLI defaults (no hand-mirrored literals) — `9cfa953`

As of `9cfa953`, the Race-Plan CLI-arg defaults are **read from the shared
DevScreen config objects at module load**, not from hardcoded literals — so a change to the shared
default propagates to the sim automatically and can never silently drift from the browser. The
`argVal(name, default)` override is preserved (e.g. `--corridorEnd=0.9` still works for experiments):

| CLI flag               | default source                                                 |
| ---------------------- | -------------------------------------------------------------- |
| `--bonusMult`          | `DEFAULT_RACE_DYNAMICS_CONFIG.racePlanBonusStrengthMultiplier` |
| `--bonusTransitionEnd` | `DEFAULT_RACE_DYNAMICS_CONFIG.racePlanBonusTransitionEnd`      |
| `--bonusFadeDuration`  | `DEFAULT_RACE_DYNAMICS_CONFIG.racePlanBonusFadeDuration`       |
| `--corridorStart`      | `DEFAULT_RACE_DYNAMICS_CONFIG.racePlanCorridorStart`           |
| `--corridorEnd`        | `DEFAULT_RACE_DYNAMICS_CONFIG.racePlanCorridorEnd`             |

Before `9cfa953`, `corridorEnd` defaulted to a hardcoded `0.95` (vs shared `1.0`) and `bonusMult`
to `1.0` (vs shared `2.0`) — both silently wrong vs the browser. This is now structurally
impossible for these fields.

> The rubber-band CLI flags (`--rubber-band` / `--rbFlatBoost` / `--rbGapThreshold` / `--rbRampMs`)
> that a `9cfa953`-era revision of this table listed are **gone**: the rubber-band speed force and
> its `DEFAULT_RUBBER_BAND_CONFIG` were removed from both the browser and the sim, so no `--rubber-band*`
> flag exists any longer. (The CameraDirector's `endgameThreshold` is a _different_, still-live camera
> gate — see the Camera section in ARCHITECTURE.md — not the removed speed force.)

### `--race-plan` default is now `true` (browser-faithful)

`--race-plan` defaults to **`true`** as of `9cfa953` — the browser's controller is always active
(there is no off-switch). `--race-plan=false` remains available as an explicit opt-out for sweep
experiments (baseline / controller-off comparisons).

---

_Last updated: 2026-07-14 (sim-trust: sweep-scripts table, usage, governor/director sections, and tier2/golden-stage0 refs corrected to the shipped choreography + PulkLeadRotation world). See also: [LESSONS.md](LESSONS.md), [ARCHITECTURE.md](ARCHITECTURE.md), [ROADMAP.md](ROADMAP.md)._

---

## Comeback Reality Measurement (`--comeback-reality`)

**Observer:** `scripts/sim/observers/comeback-reality.mjs` (pure functions, read-only, POST-RACE).
**Flag:** `--comeback-reality` — **requires `--hero-map`** (it reuses the per-race hero observations; adds
zero per-frame work, so a run without the flag is byte-identical). A run writes an **uncommitted** report
dir `results/comeback-reality-sweep-<date>/` (`report.md` + `detail.json` + one `comeback-<track>.json`
per track; per-track files accumulate across per-track invocations and re-aggregate each run).

**Purpose.** Empirical check behind camera-foresight **B4**: does a hero cast as a **comebacker** actually
climb close to its authored `finalRank`, and is the designation a reliable pointer to real climbing? A
comebacker is a hero whose anchor rank is behind its target by more than `ROLE_MARGIN_RANKS` (reused from
`hero-adherence.mjs` — one source; rank 1 = front, so it must CLIMB).

**Per-comebacker metrics** (rank 1 = front, lower is better):

- `climbPlanned` = `anchorRank − targetRank` (how far it was authored to climb).
- `climbAchieved` = `max(0, anchorRank − finalRank)` (how far it really climbed).
- `targetReached` = `finalRank ≤ targetRank` (landed at or better than target).
- `rankDeltaToTarget` = `finalRank − targetRank` (0 = exact, − = over-achieved, + = short).
- `climbFracOfPlan` = `climbAchieved / climbPlanned`.
- `nearTarget` = `|rankDeltaToTarget| ≤ 3`.

**Aggregates** (`summarizeComebacker`): means of the above + `targetReachRate`, `nearTargetRate`, and an
achieved/planned-climb histogram. **Reliability** (`reliabilityStats`, per race): does the designated
comebacker rank as the top / top-3 climber, and did ≥1 comebacker realise ≥50% of its planned climb.

**Scope caveat (honest).** `heroObs` records only the cast (heroes), so the reliability "top climber"
ranking is **among the cast**, not against the full field — a full-field comparison would need per-racer
anchor ranks the sim does not collect (adding that would enlarge the byte-identity surface). Read the
reliability rates as "within the cast".

**Interpretation / acceptance (for the B4 go/no-go).** Plan is _sound_ if comebacker `finalRank` lands
within mean ±2–3 of `targetRank` (|Δ→target| ≥ 5 ⇒ unreliable); designation is _reliable_ if the comebacker
is a top-3 climber (in the cast) in ≥60% of races. Note the top-3-in-cast bar is near-trivial for a 2–4
hero cast — read the stronger `topClimberRate` (rank-1 in the cast) in `detail.json` alongside it.

**Standard run** (one invocation per track with its surface-compatible default racer, since `--track` is
single-valued and a forced `--racer` errors on surface-incompatible tracks):

```
node scripts/sim-fairness.mjs --track=<id> --racer=<trackDefault> --dur=60 --races=50 --seed=1 \
     --hero-map --comeback-reality --skip-main-output
```

---

## 2026-07-10 — INFRA update (sim-trust): current state of the sim

This document was the most stale; the items below correct it against source.

- **Size & structure:** `scripts/sim-fairness.mjs` is now **~3716 lines** (`wc -l`), not ~5000. Observers
  are factored into `scripts/sim/observers/` (`fairness-stats.mjs`, `gap-metrics.mjs`, `report.mjs`).
  `scripts/sim/experiments/` no longer exists (it went with the last experiment).
- **Dormant experiments: ALL FOUR DELETED** — TEF (`tefMult`), ROW_SPLIT (`startRowBoostMult`), the V4
  start-row experiment, and **tier2** (`tier2Mult`). Non-comment `grep tier2` = 0. (2026-07-10 correction:
  an earlier draft of this section wrongly read an orphaned comment header — "TIER-2 … attached ONLY when
  `--tier2` active" — as a live path; it was a dead comment with the `STRIP_METRICS` block directly under
  it. The three stale tier2 comments have been removed. **A stale comment is a lie with authority** — see
  LESSONS.md.)
- **The sim IMPORTS the shipped physics; it does not re-implement it.** `advanceRacerT` (raceStep.js),
  `applyPulkLeadRotation` / `arcT` / `computeDirectorCeiling` (raceGovernor.js — the classic
  `applyGovernor` reactive director is deleted; only the unconditional lead-rotation path remains),
  `raceLengths.js`, `racePlanner.js` (`createRacePlan` / `createTrajectoryController`) are all
  imported. The divergence risk lives only in the _inputs_ each engine computes before the shared
  t-update — audited in `archive/FORCE-PARITY.md`.
- **Stage-0 config pipeline:** `--config=world.json` is honoured or the run **ABORTS loud**
  (`WORLD_SCHEMA_MISMATCH`, exit 2) — never runs-and-ignores. With no `--config`, a prominent
  **ASSUMED-DEFAULTS** banner prints and every result is stamped provisional. `WORLD_SCHEMA_VERSION` +
  `hashWorld` stamp each result (`raceConfigWorld.js`). (The former `scripts/night-sweep/golden-stage0.mjs`
  golden and the whole `scripts/night-sweep/` directory are **deleted**; default-behaviour identity is
  now gated by `scripts/fingerprint-default.mjs`.)
- **Gap-space observers, in RACER LENGTHS** (`scripts/sim/observers/gap-metrics.mjs`): lengths-behind,
  leader→P2, top-5 spread, field p10–p90, field median, the frontmost-gap (detached-group) curve, plus
  the deadRace/visibleComeback ingredients. Seconds are a secondary column only. Enabled by
  `--gap-metrics`; byte-neutral when off.
- **THE STANDING RULE — rank-space metrics cannot see a dead race.** `gap-metrics.test.mjs` is the
  executable proof: two synthetic races with **identical final ranks**, one bunched and one strung out —
  every rank-space metric is identical, every gap-space metric differs. If it ever fails, a rank metric
  started depending on gaps or a gap metric went blind to them; stop.

---

## 2026-07-20 — catch-up (B2-Heroes, current servo model, retained shelved flags)

State of the shipped action model after the B2-Heroes work, for anyone reading the sim in isolation.

### B2-Heroes "Attack & Fall" (SHIPPED ON, cast size `b2AttackHeroes`)

Extra choreographed heroes cast from FRONT-post-chaos B2-finishers that **climb to ~rank 5 mid-race,
then fall back and free-reorder in B2**. Shipped defaults: **count slider 0–5 (default 3)**,
`b2AttackPeakRank`, attack window **timing 0.40–0.70**, `b2AttackFinalRank`, **band-arrival
release** (`b2AttackBandArrival=true` — the servo frees an attacker the moment it re-enters B2 on the
way down). Result: **+21% top-5 OUTCOME action** vs the no-attacker floor, B1/B2 band-reach clearing the gate on all
four tracks, Holm at the pre-existing 2/4 baseline. `count=0` restores the pre-feature game
byte-identical (fingerprint `4ec8e64dd2641ad3`); the shipped `count=3` default is `72c3360fb75225ef`.
The action knob is `finalRank` (release HEIGHT), not peak depth; count scales super-additively
(1→+7%, 2→+10%, 3→+21%). Source: `heroCurveGenerator.js castHeroes` + `attackerTiming`;
`racePlanner.js` `atkParams` branch.

### Today's servo model in brief

- **Strictness** — how tightly a racer is held to its authored band corridor. **Heroes run strictness
  1.0** (fully steered along their curve). **Pack** runs at `choreoPackBandStrictness` (the shipped
  pack corridor strength).
- **Front-contest release** — the front group is released from strict steering at
  `_choreoReleaseProgress`, so the leaders can free-contest the very end.
- **Attacker path** — an `attacker-b2` hero is **Tracked to its FinalRank, then Freed** (band-arrival):
  steered down toward `b2AttackFinalRank`, then released to free-reorder the instant it re-enters B2,
  bypassing the 0.80 B2 resolve.

This is the single steering path — choreography + PulkLeadRotation; there is no reactive governor/director
(that and its ~15 knobs were deleted, see §4 and ARCHITECTURE.md).

### Two release paths that were built, measured, and REMOVED (2026-07-23)

Both LOST to the B2-attackers and are recorded here as the evidence for **why liberation loses** (see
LESSONS.md — "action lives in orchestration, not liberation"). They were kept for a while as default-OFF
flags and then deleted in the dead-mechanisms cleanup ship; the code is recoverable from git history at
tag `pre/dead-mechanisms-cleanup`.

- **Pack strictness release** — non-hero pack runs strictness-0 inside its band.
  **Why it lost:** breaks B2 band-reach on luger-hill + searound (67–69%) + Holm 3/4 via an **endgame
  edge-leak** — 92% of leaks after progress 0.90; free racers at the band edge get shuffled out with no
  runway. Diagnosis archived under `reports/exp-archive/`.
- **Universal band-arrival** — free B1-heroes + normal pack inside their assigned band. **Why it lost:**
  fairness HELD (immediate re-steer) but **−6% action** — freeing settles the field.

The spatial re-steer threshold they shared (`packReSteerThreshold`) SURVIVES: the live B2-attacker
release reads it. Removing the two paths left both fingerprints byte-identical.

---

## 2026-07-20 — Gap-cap re-roll bias (SIM-ONLY, flag-gated)

The runaway investigation's mechanism (`docs/CONCEPT-COHESION.md`), built as a shared deterministic
transform `computeGapBiasedTarget` in `client/src/modules/racePlanner.js` (beside `computePulkBiasedTarget`,
which is untouched) and activated ONLY from the sim harness. It loads the periodic re-roll dice: a racer
that has opened a hole **behind** itself (arc gap > G to the racer behind) draws slower next roll; in
symmetric mode a **dropped** racer (gap > G to the racer ahead) draws faster — always inside the honest
±8.1% band. All gaps ≤ G → bit-exact no-op.

**Flags (sim only):**

- `--gapRerollThresholdLengths=<G>` — engages the bias (absent → OFF → byte-identical).
- `--gapRerollMode=symmetric|down` — `down` biases only the escapee slower; `symmetric` also lifts dropped racers.
- `--gapRerollStrength=<s>` (default 0.5) — fraction-to-edge = `min(1, s·(gap−G))`.

**Window (config-derived, zero hardcoded constants):** engages only for scheduled rolls at/after the LIVE
`choreoOutcomeStart` whose 3 s ease-in transition settles before the last-roll deadline
(`reRollLastPositionPercent·targetDur − reRollTransitionDuration`). Both bounds move if the owner changes
`choreoOutcomeStart` / `reRollLastPositionPercent` / `reRollTransitionDuration`.

**Fairness decision (binding):** SCHEDULED ROLLS ONLY — the transform never fires an off-schedule/early
re-roll. **OFF = byte-identical** (fingerprint `72c3360fb75225ef` verified; the browser never passes the
gap/length context so the transform early-returns there). Watch metrics: `gapBiasedRolls` per race and the
leader duty-cycle (max share of one racer's window rolls that were biased — the "held" kill-condition gauge).

### 2026-07-21 — Browser wiring + DevScreen controls (default OFF, eye-test)

After the N=200 confirmation on all 10 tracks (V0 23% → symmetric/G=1.5/strength=1.0 8.3%, action +, band-reach held the gate), the shared transform was wired into the BROWSER re-roll loop (`RaceScreen/index.jsx`) exactly as the sim does — the browser threads ITS OWN realized-duration `lastRollDeadline` + `physicsTs` + the shared `lenScaleFrom(pathLengthPx, meanDrawnBodyLen)` / `isOpen` into `computeGapBiasedTarget` (the ONE-CLOCK principle; the transform never re-derives a duration). The transform behavior is FROZEN.

**Config keys (`DEFAULT_RACE_DYNAMICS_CONFIG`), current shipped values:** `gapRerollEnabled: true`, `gapRerollThresholdLengths: 0.5`, `gapRerollStrength: 1.0`, `gapRerollMode: 'symmetric'`, `gapRerollDevMarker: false` — shipped ON 2026-07-22, retuned 2026-07-23 (from G=1.5 / strength=1.0), **flipped 2026-07-26 to G=0.5 / strength=1.0** (confirmed candidate). When `gapRerollEnabled` is false the browser passes `gapRerollThresholdLengths: null` into `createRacePlan` → the transform early-returns the raw draw → **the shipped game is byte-identical** (OFF invariant `f8f7d9c2fd3283e9`; the pre-unification `72c3360fb75225ef` is historical). The sim harness keeps its CLI semantics (`--gapReroll*` override, unchanged); it does not read these browser defaults.

**DevScreen (Dynamics section):** Gap-Reroll toggle, G (0.5–4.0), strength (0–1.5), mode symmetric/down-only, and a rendering-only dev-marker (a cyan ring flashing on a racer the instant its roll was biased — zero sim effect). Changes take effect on the next race (same pattern as the B2-attacker count). A backup/ship tag follows only after the owner's eye-test.

### 2026-07-22 — Front act: `contestWindowStart`; front lead rotation + role-biased dice (REMOVED 2026-07-23)

**`contestWindowStart` — the front act own key. LIVE, KEPT.** The sustained-P1-battle observer
(`scripts/sim/observers/outcome-front-battle.mjs`) reads `contestWindowStart`. It previously rode on
`choreoResolveB2`, which is _B2 own_ resolve checkpoint: tuning B2 for a B2 reason silently moved the
front-battle measurement window and would have invalidated every committed baseline. It is initialised
to the shipped `choreoResolveB2` value (0.8), so the `p1-contest-baseline` numbers stay exactly
comparable; from here the two are independent. Sim flag: `--contestWindowStart=<0..1>`. Validation
(browser path) requires `choreoOutcomeStart < contestWindowStart < choreoReleaseProgress`.

**The front lead rotation and its role-biased scheduled dice were REMOVED on 2026-07-23** (dead-
mechanisms cleanup ship). Both were built sim-first and default OFF, so the shipped game never ran
them. The greenfield night run then measured the rotation as the WORST arm — a suppressor of the very
lead changes it was built to create — so the whole mechanism was deleted rather than left as a loaded
gun in the config: the config keys, the generator casting/schedule/waypoint code, the servo role-bias
transform and saturation telemetry, the sim flags, the handover-telemetry observer, and the unit test
file. Removing it left BOTH fingerprints byte-identical (ON `e93ffa70dad562a1`, OFF
`72c3360fb75225ef`), which is the proof it had never been on any live path. The design write-up and
both independent concept reviews remain under `reports/proposals/`; the code is recoverable from git
history at tag `pre/dead-mechanisms-cleanup`.

**Gap-reroll branch-priority fix (behaviour change, gated by `gapRerollEnabled` / the sim flag).**
When BOTH `gapBehind > G` and `gapAhead > G`, the **larger imbalance** now decides the direction;
ties keep the old gapBehind-first behaviour. Previously `gapBehind` returned unconditionally, so a
racer that had broken from the pack — a hole behind it, but still further off the leader — was tilted
SLOWER, structurally suppressing the chase (the small-G diagnostic measured this misdirection firing
6.6x more often at small G). In `down` mode the affected case now yields **no** tilt rather than a
misdirected brake. This does not touch the OFF fingerprint (the gap-reroll is off by default), but it
**does change measured gap-reroll results** — the confirmed `G=1.5 s=1.0` numbers predate it.

### 2026-07-22 — Gap-reroll SHIPPED DEFAULT ON (symmetric, G=1.5, strength=1.0)

The measured winner setting is now the shipped configuration. No other tuning value changed.

**Fingerprints — the shipped default moved; record both.**

| world                                                     | fingerprint            | status                                                                                                                                                            |
| --------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| shipped default (gap-reroll **ON**, retuned G=0.75 s=0.5) | **`e93ffa70dad562a1`** | at 2026-07-23 — **SUPERSEDED** (see the current pair under _Fingerprint rule_ above; ON is now `7c70b1eae7d31e22` after the speed-150 ship + the 2026-07-26 flip) |
| gap-reroll OFF (`--gapRerollEnabled=false`)               | `72c3360fb75225ef`     | pre-unification OFF — **superseded**; the OFF invariant is now `f8f7d9c2fd3283e9`                                                                                 |
| previous shipped default (ON, G=1.5 s=1.0)                | `efd0f4ad8eca08fa`     | **SUPERSEDED** by `e93ffa70dad562a1`                                                                                                                              |
| pre-feature default                                       | `72c3360fb75225ef`     | superseded as a _default_; still the OFF world                                                                                                                    |

Turning the feature off restores the pre-feature game **byte-identically** — the OFF fingerprint is
bit-for-bit the value it has always been. That is the guarantee that survives the default flip.

### 2026-07-23 — Gap-reroll RETUNED (symmetric, G=0.75, strength=0.5)

Only the two tuning values changed; the transform itself is untouched.

**Why.** `frac = min(1, strength·(gap−G))` saturates once the gap exceeds `G+1`, so at s=1.0 **46% of
all corrections applied to the leader were full slams to the band floor** — visible braking. G alone
cannot soften that (lowering G lowers the saturation point too; measured: corrections got _harder_).
Strength is the only knob that reduces the magnitude of an individual correction.

**Gate** (400 races/arm, 4 standard tracks, paired seeds, 40 closed / 60 open fields, 60 s):

| metric                                          | G=0.75 s=0.5           | G=1.5 s=1.0        |
| ----------------------------------------------- | ---------------------- | ------------------ |
| pooled band-reach (PRIMARY, racer-row weighted) | **71.6%**              | 71.6%              |
| Holm-flagged tracks                             | 2/4                    | 2/4                |
| tiltSaturated                                   | **18.7%**              | 46.0%              |
| tilt frac median                                | **0.371**              | 0.906              |
| escapeDepth median / worst                      | **1.97 / 7.29 L**      | 2.71 / 12.07 L     |
| front-group-at-line                             | **4.05**               | 3.86               |
| runaway / parade / duo                          | **8.3% / 0.8% / 4.0%** | 9.5% / 1.3% / 6.3% |
| dead finales                                    | 14.5%                  | 14.7%              |

Fairness is **exactly neutral** (identical pooled band-reach and Holm count); the change buys
correction _softness_ and a shallower worst-case escape. Duration sanity (30/120/300 s, N=25):
candidate ≥ current on band-reach at every duration. At 30 s both arms sit at ~66% band-reach — a
pre-existing short-race limitation, not introduced here.

Evidence `reports/greenfield/gate-retune/`; driver `scripts/exp-gate-retune.mjs` (branch
`pre/greenfield-proto`, commit `bf4ff90`). **Caveats:** arms are paired as experimental control, not
as a paired estimator, so the deltas are differences of independent means; only pooled band-reach is
racer-row weighted (context metrics are race-row means); episode-derived and `tiltFrac`-family metrics
are mechanically G-coupled and comparable only at fixed G — the primary is G-independent.

**The sim now follows the shipped default.** `sim-fairness.mjs` previously engaged the gap-reroll only
when `--gapRerollThresholdLengths` was passed and never read `gapRerollEnabled` at all, so flipping the
browser default alone would have left the sim predicting a game that no longer exists — a
sim/browser parity break, and the shipped-default fingerprint could not have changed. It now reads
`DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollEnabled`, and mode/strength default to the shipped values
(`symmetric` / `1.0`) instead of the old experiment defaults.

> **Consequence for sweeps — a flagless sim run is no longer the OFF world.** Any arm that means
> "gap-reroll off" must now pass **`--gapRerollEnabled=false`** explicitly. All OFF arms in
> `exp-runaway-leader.mjs` were updated accordingly, so every committed baseline stays reproducible.
> An explicit `--gapRerollThresholdLengths` still engages the transform on its own, so existing ON
> arms are unchanged.

`scripts/fingerprint-default.mjs` now passes any extra `--flags` through to the sim, which is how the
OFF world is measured once a mechanism ships ON:

```
node scripts/fingerprint-default.mjs shipped                            -> efd0f4ad8eca08fa
node scripts/fingerprint-default.mjs off --gapRerollEnabled=false       -> 72c3360fb75225ef
```

**DevScreen:** the Gap-Reroll toggle is unchanged and now reads ON by default (it renders from the
merged `DEFAULT_RACE_DYNAMICS_CONFIG`, so no separate default was needed).

**Measurement caveat that travels with the headline.** The 10-track result quoted for this setting —
**runaway 23.0% → 8.3%** (N=200, all 10 tracks) — was measured **before** the gap-reroll
branch-priority fix. The fix was re-qualified afterwards on a 4-track paired test at the same seeds
(A0, `67a1053`): runaway **8.3% → 7.5%**, only **5/400 seed flips**, −0.55 sd — within noise, and every
flip moved _away_ from runaway. The 6 tracks outside that test are untested post-fix. Quote the
headline with this qualifier.
