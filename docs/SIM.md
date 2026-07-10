# SIM.md — Simulation System Documentation

## Table of Contents

1. [Overview](#1-overview)
2. [How to Run](#2-how-to-run)
3. [All Metrics](#3-all-metrics)
4. [Parameter Sweep Methodology](#4-parameter-sweep-methodology)
5. [The 8 Interdependent Parameters](#5-the-8-interdependent-parameters)
6. [Known Limitations](#6-known-limitations)
7. [Lessons Learned](#7-lessons-learned)
8. [Closed-Track finishT, Speed & Shared-Config Defaults](#8-closed-track-finisht-speed--shared-config-defaults)

---

## 1. Overview

### What the simulation does

The simulation system runs headless races — no rendering, no camera, no DOM — using the same physics modules the browser game imports. It was created to answer one core question: **does a racer's starting row unfairly determine their final position?**

Beyond fairness, the sim also measures lateral movement quality (zigzag, overlap, braking), overtake naturalness, and Race Plan zone hit rates. These metrics allow parameter tuning without waiting for visual inspection in the browser.

### How it relates to the browser game

The sim imports the identical JavaScript modules the browser uses:

- `raceBehavior.js` — avoidance, home force, speed braking
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

### File locations

| File | Purpose |
|---|---|
| `scripts/sim-fairness.mjs` | Main headless simulator — single run, full metric report |
| `scripts/param-sweep.mjs` | 5-axis Phase 1 sweep (cartesian or OAT combos) |
| `scripts/param-sweep-full.mjs` | 8-axis autonomous sweep (LHS + extension + Phase 2) |
| `scripts/sweep-lateral.mjs` | Lateral-velocity targeted sweep (feat/lateral-velocity) |
| `scripts/param-sweep-braking.mjs` | Braking-parameter focused sweep |
| `scripts/param-sweep-braking-phase2.mjs` | Phase 2 validation for braking sweep |
| `scripts/param-sweep-phase2.mjs` | Standalone Phase 2 validator |

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
  --dur=60             # override race duration in seconds (optional)
```

### Fixed seed (deterministic runs)

```sh
node scripts/sim-fairness.mjs --seed=42 --races=100
```

With `--seed=N` (N > 0), race `i` uses seed `(N−1)×N_RACES + i + 1`. This makes runs fully reproducible. Use fixed seeds when comparing parameter sets — otherwise random variation can mask real differences.

`--seed=0` (the default) uses `Math.random()` for exploration. Never use seed 0 for parameter comparisons.

> **Determinism fix (2026-07, commit `3f9a055`).** Before this fix, `--seed` did NOT
> fully control a run: the start-row shuffle (`rowLayout.js` → `RandomHelper.shuffle`)
> used global `Math.random()` and ran *before* the per-race seeded scope, so two runs
> with the same `--seed` produced different start-row assignments. The fix makes
> `shuffle(array, rng = Math.random)` take an optional RNG (default `Math.random`, so the
> **browser game is byte-for-byte unchanged**); the sim now seeds the combo row-layout RNG
> before the race loop. `--seed=N` now controls the *whole* batch. Verify with a same-seed
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
# Single track + racer + duration
node scripts/sim-fairness.mjs --track=space-sprint --racer=rocket --dur=60 --races=200 --seed=42

# All tracks, extended run
node scripts/sim-fairness.mjs --races=200 --seed=42 --race-plan=true
```

### Running a parameter sweep

**Phase 1 — broad exploration (1000 combos, 10 races each):**

```sh
node scripts/param-sweep-full.mjs
```

**Quick sanity check (9 combos, 3 races each):**

```sh
node scripts/param-sweep-full.mjs --quick
```

**Phase 1 only (no Phase 2 validation):**

```sh
node scripts/param-sweep-full.mjs --phase1only
```

The sweep writes progress to `client/tmp/sweep-full-progress.log` and the final report to `client/tmp/full-sweep-report.md`.

### Behavior config overrides

```sh
# Override specific behavior fields via JSON
node scripts/sim-fairness.mjs \
  --behavior='{"lateralForce":0.016,"lateralDamping":0.30}' \
  --avoidanceWarmupMs=800

# TEF (tStart-Equalization-Feedback)
node scripts/sim-fairness.mjs \
  --tefActive=true --tefAlpha=0.03 --tefMaxGap=0.015 --tefIsOpenOnly=true

# v4 threshold-based bonus
node scripts/sim-fairness.mjs \
  --v4ThresholdActive=true \
  --v4InitialBoost=1.20 \
  --v4Thresholds=20,40,60,80 \
  --v4BoostSchedule=1.20,1.15,1.10,1.05,1.0 \
  --v4MetricType=physical_overtake \
  --v4LateralProximity=0.3
```

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
|---|---|---|
| B1 | 1–5 | +6% |
| B2 | 6–15 | +4% |
| B3 | 16–25 | +2% |
| B4 | 26–40 | ±0% |
| B5 | 41+ | −2% |

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

**What it measures:** Whether any pair of racer *centers* are nearly coincident — roughly within 3–4 px in both axes simultaneously.

**Good:** Lower is better. No hard cutoff.

**Limitations — IMPORTANT:** This metric is **blind to rendered-body overlap during overtaking** (Lesson 126). Physics keeps centers at least `physSlot` apart (≈30–40 px), so the threshold (~3–4 px) is never reached under normal avoidance. The metric reads 0% even while racers' *rendered bodies* (which can be 20–40 px long) visually cross during a pass. Use `honestOverlapRate` to detect real body-box intersections.

---

### honestOverlapRate (new body-extent metric)

**Formula:** Fraction of active racer-pair-frames (after 4 s warmup) where both of the following hold simultaneously:
- Longitudinal gap `< effectiveDisplaySize × bodyFillY` (rendered bodies touch or overlap lengthwise)
- Lateral gap `< effectiveDisplaySize × bodyFillX` (rendered bodies touch or overlap laterally)

For closed tracks, the longitudinal distance wraps by one lap (`tPos mod 1`) so same-lap adjacent pairs at the lap seam are correctly detected.

**What it measures:** Whether the rendered body boxes of two racers actually intersect — the same criterion a viewer would use to judge visual stacking. Catches overtaking overlap that the old metric misses.

**Good:** Lower is better. Typical values: open tracks 0.5–4% (dragon-type wide bodies); closed short ovals 5–8% (pack crowding — see Known Limitations). A value of 0% means no body-box intersections at any moment after warmup.

**Limitations:** A non-zero value on *closed tracks* is almost always **same-lap pack crowding** (many bodies on a short perimeter), not lapping — measured directly: max progress spread in 60s homogeneous races is 0.2–0.55 laps, well below the 1.0-lap threshold for a genuine lap-over. The open-track counterpart (Lesson P-1 BACKLOG) is actual body-crossing during overtaking and is a physics bug under investigation.

---

### fairChanceExactRate / fairChanceTop5Rate / fairChanceByRow

**Formula:**
- `fairChanceExactRate`: of all B1-assigned racers (targetRank 1–5) across all races in the combo, what fraction finished at their *exact* assigned rank?
- `fairChanceTop5Rate`: same denominator, what fraction finished *anywhere* in positions 1–5?
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

**Limitations:** Open tracks always show `maxRealSpread = 0` and `honestSameLapFraction = null` — the lapping metrics are meaningless there. Lapping *could* occur on closed tracks if the race is long enough or racer speeds differ greatly; `maxRealSpread ≥ 1.0` would confirm it.

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

### Governor field-shape telemetry (`stats.governorShape`)

**Flag:** surfaced automatically when the governor ran (`--governorEnabled=true` or `--governorDirectorEnabled=true`).

**Fields (all in *racer-lengths* — arc-distance ÷ mean drawn body length, so they are lap-count- and track-independent):**

| Field | Meaning |
|---|---|
| `govGapLenMean` | mean leader→**median** gap (large = the leader is far ahead of the pack) |
| `govGapLenMax` | peak leader→median gap over the race |
| `govGap2ndLenMean` | mean leader→**2nd** gap (small = a close, contested front) |
| `govFieldLenMean` | field spread p10−p90 (how strung-out the pack is) |
| `govRankSwapRate` | adjacent rank swaps per step (raw position churn across the whole field) |

**Where it lives:** per race in `rawData[]` (identical across racers of a race) and aggregated per combo in `results[].stats.governorShape`. It is computed by the governor block in `runSingleRace` (single source: `arcT` + the governor's `lenScale`); this doc-stage only *propagates* it — the earlier code computed the values on the per-race result **array** but the `rawData` spread emitted per-racer **elements**, so they were dropped (and the combo copy was mis-filed under `avgNaturalness`). Nothing about *how* they are computed changed.

---

### Front-action metric (`results[].frontAction`)

**Flag:** `--front-action` (read-only observer, breakaway-diag pattern — a run without the flag is byte-identical). Raw per-combo aggregates are also written to `results/front-action/front-action-<diagLabel>.json`.

**What it measures:** the owner's priority-1 experience — a *contested, lead-changing FRONT* — over the **pre-OUTCOME / governor-active window only** (`progress < corridorStart`). It is the sweep's action objective.

| Field | Meaning | Static procession | Contested front |
|---|---|---|---|
| `leadChangesMean` | P1-identity changes per race | ~0–1 | many |
| `distinctP1Mean` | # of racers who ever hold P1 | 1–2 | several |
| `leadChangeRate` | P1 changes ÷ pre-OUTCOME step | ~0 | high |
| `podiumShuffleRate` | fraction of steps where the ordered top-3 changes (a fight for the LEAD vs churn deep in the field) | ~0 | high |
| `gap2ndLenMean` / `gapMedLenMean` | **front reach** — leader→2nd / leader→median in racer-lengths (*reuses the governor gaps*); a close front is small gap2nd, a lone breakaway is large gapMed | — | small gap2nd |
| `unpredictability.rankVsP1Frac` / `rankVsTop3Frac` | **counter-metric:** \|Spearman\| between a racer's assigned `targetRank` and its early front-running time, pooled across all races/seeds. **LOW = fair** — the early leader is *not* secretly the assigned winner. Action must not come from bias. | — | must stay LOW |

**Calibration reference (acceptance check — the metric must agree with the owner's eye):**
The **seed-1 Searound × Manta** case (surge + rubber-band OFF, governor + director ON) is a **known "no action" race** — a lone breakaway with no real front fight. The metric scores it LOW, confirming it measures what the eye sees. The reference is **pinned to exact parameters** (below) because the gap measures are *means over the pre-OUTCOME window* and therefore depend on `--dur` — an unpinned reference is ambiguous.

```
node scripts/sim-fairness.mjs --track=searound --racer=manta --dur=120 --races=1 --seed=1 \
     --governorEnabled=true --governorDirectorEnabled=true --rubber-band=false \
     --front-action --diagLabel=calib --out=client/tmp/calib
```

Exact pinned parameters: **track=searound, racer=manta, seed=1, dur=120, races=1**, surge OFF (default), rubber-band OFF (`--rubber-band=false`), governor + director ON. Measured at HEAD `b930b1b`:

→ `leadChangeRate ≈ 0.0007` (≈0.07 %), `podiumShuffleRate ≈ 0.004` (≈0.4 %), `gapMedLenMean ≈ 20.4` racer-lengths (leader far ahead of the median = lone breakaway), `gap2ndLenMean ≈ 4.7`. All contest dimensions read LOW.

**`gapMedLenMean` is a MEAN, not a peak — it scales with `--dur`.** It is the mean leader→median gap over the whole pre-OUTCOME window, so a longer race (more early-window steps of an ever-widening breakaway) reads a larger mean. Same case at **`--dur=60`**: `gapMedLenMean ≈ 11` len (mean) while the *peak* `stats.governorShape.govGapLenMax ≈ 22` len; at `--dur=120` the mean is ≈ 20 vs peak ≈ 37. When comparing runs, hold `--dur` fixed (or compare `govGapLenMax` peaks). Any future "action" mechanism must move `leadChangeRate` / `podiumShuffleRate` up **without** raising `unpredictability.*`.

---

### The Action axis (`--action=<0..1>`) — director sweep coupling

**Flag:** `--action=<0..1>` (read-only sweep hypothesis — **not** a shipped default; lives in the sweep layer). One owner-facing scalar `action` (0 = calm → 1 = wild) — the prototype of the future SetupScreen "Action" slider — coupled to the contest-injector (director) knobs. Unset → no-op (byte-identical run). Realized knobs are surfaced in the JSON `meta.action` / `meta.directorKnobs` and the config log. Single source: `ACTION_COUPLING` + `actionToDirectorKnobs()` in `sim-fairness.mjs`.

**Coupling (endpoints + interpolation):**

| Director knob | action=0 | action=1 | Interpolation |
|---|---|---|---|
| `PullStrength` | 0.03 | 0.12 | linear (action↑ → stronger anchor pull) |
| `Dwell` | 0.16 | 0.04 | linear (action↑ → shorter dwell = faster cast turnover) |
| `CastSize` | 4 | 2 | `round(4 − 2·action)` (loose pack → tight duel; 3 at mid) |
| `AnchorOffset` | 2.0 | 2.0 | **FIXED** at config default (anchor spread handled separately) |
| `Settling` | 0.05 | 0.05 | **FIXED** at config default (fairness parameter, never on the axis) |

The endpoints bracket the shipped director default (cast 3 / dwell 0.08 / pull 0.06), so the default sits inside the swept range. The axis is monotonic 0→1 = calm→wild.

**Round-1 (coarse) sweep matrix** — per-track default racer, established open=60 / closed=40 count, but a **uniform 60 s** duration for all tracks (equal length for comparability, deliberately NOT each track's own `defaultDuration`):

| Track | Topology | Racer | Racers | Duration |
|---|---|---|---|---|
| searound | closed | manta | 40 | 60 s |
| garden-path | closed | snail | 40 | 60 s |
| mountainstreet | open | boarder | 60 | 60 s |
| seatrack | open | dolphin | 60 | 60 s |

Each (track × action-point) runs **30 distinct seeds** (`--seed=1 --races=30` → seeds 1–30). Governor tail-lift ON + director ON, surge + rubber-band OFF (clean base), no spread-cap. Coarse pass = 8 action-points evenly across `[0,1]`; a `--racer` that is surface-incompatible with its track **errors** (never a silent skip). Raw + aggregated tables land under `results/action-sweep-r1/`. Read: locate the *attractive but still fair* region — high `leadChangeRate` / `podiumShuffleRate` with `rankVsP1Frac` LOW and band-reach (B3 zone-success) ≥ 70%.

---

## 4. Parameter Sweep Methodology

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

| Metric | Cutoff | Rationale |
|---|---|---|
| `outcomeReached` | < 1.0 | All races must complete — a partial run cannot be scored |
| `natOvt` | < 1.0 (strict) | All position changes must be physically close-quarters |
| `natOvt` | < 0.90 (relaxed fallback) | Used if the strict cutoff eliminates all survivors |
| `zigzagScore` | ≥ 0.005 | Visible lateral oscillation — disqualifies any combo immediately |

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

### Governor/director action sweep — objective (upcoming)

Now that front-action is *measurable* (`results[].frontAction` above), the next sweep optimizes the 15 governor/director DevScreen values for **front-action** (`leadChangeRate` / `podiumShuffleRate` up) subject to the **unpredictability** counter-metric staying LOW and the existing fairness gate holding. Its second output is a **knob-reduction** decision:

- **Candidates to PIN to fixed constants** — barrier-shape + safety internals that should not be owner-facing: `governorK0`, `governorRampWidth`, `governorFrequency`, `governorLengthFloor`, `governorMaxEffect`, `governorMaxStepPerFrame`, `governorAMin`, `governorAMax`. The sweep confirms front-action is insensitive to these across their range → they become constants.
- **Candidates to KEEP as owner-facing "action" levers** — the few that actually move `leadChangeRate` / `podiumShuffleRate` (expected: director cast size / dwell / pull strength / anchor offset, and governor drama / length band). These feed the later cleanup step that reduces the DevScreen to **~5 well-explained knobs plus a single SetupScreen "Action" slider**.

This is documentation of the objective only — **no DevScreen change and no default change** happens in the measurement step that added the metric.

---

## 5. Physics Behavior Parameters

The following parameters control lateral collision avoidance, home-lane restoration, and speed braking. They must be tuned together — changing one in isolation typically breaks another.

The values below are the **Phase 5 winners** — locked into `storage/defaults.js` after the `feat/open-track-overlap` sweep. One parameter (`avoidanceDistance`) is retired from the browser gate. `speedBrakeYThreshold` (0.18) is still read by the browser as a same-lane fallback when track width is unavailable (`raceBehavior.js`); kept for both browser and sim use.

### Parameter table

| Parameter | Default | Range (sweep) | What it controls |
|---|---|---|---|
| `lateralForce` | 0.0114 | 0.006–0.024 | Force applied to `physicalYVelocity` per frame when another racer is within the geometric avoidance gate |
| `lateralDamping` | 0.16 | 0.05–0.45 | Velocity retention per frame: `velocity *= lateralDamping`. Hard cap < 0.50 (code constraint) |
| `homeForceStrength` | 0.030 | 0.015–0.065 | Restoring force pulling a racer back toward their home lane when not avoiding anyone |
| `homeForceReductionOnOverlap` | 0.30 | 0.02–0.45 | Multiplier applied to home force when overlapping — reduces home pull so avoidance can work |
| `avoidanceBufferPct` | 0.20 | — | Buffer fraction beyond body contact before the avoidance gate fires (20% lead time); replaces the old fixed `avoidanceDistance` in the browser gate |
| `speedBrakeFactor` | 0.945 | 0.87–0.995 | Speed multiplier applied when braking; 0.945 = 5.5% speed reduction per brake frame |
| `speedBrakeTMultiplier` | 1.5 | 0.5–3.0 | Longitudinal lead-time multiplier for the body-based brake zone (replaces the old fixed `speedBrakeTThreshold`) |
| `avoidanceDistance` *(retired from browser gate)* | 0.18 | 0.07–0.28 | Former fixed proximity threshold in normalized track coordinates; replaced by body-based geometric gate + `avoidanceBufferPct`. Kept for sim script backward compat. |
| `speedBrakeYThreshold` | 0.18 | 0.05–0.22 | Default same-lane lateral threshold; still read by the browser as a fallback when track width is unavailable (`raceBehavior.js`). Body-based detection takes precedence when `trackWidth > 0`. |

### Why they must be changed together

**lateralForce ↔ lateralDamping:** Force is applied to velocity; damping determines how long the impulse persists. Strong force with high damping produces sharp, short pushes. Weak force with low damping produces slow, wide drifts. The interaction determines oscillation frequency — changing one without the other typically either causes zigzag (too little damping) or sluggish avoidance (too much damping).

**homeForceStrength ↔ homeForceReductionOnOverlap:** During overlap, home force must be suppressed or it fights the avoidance push — both forces act at the same time and cancel each other. The reduction multiplier must be tuned to match `lateralForce`: stronger avoidance force requires a lower (more suppressed) home force during overlap.

**speedBrakeTMultiplier ↔ speedBrakeFactor:** Braking triggers when the longitudinal gap between two racers is less than `speedBrakeTMultiplier × bodyLength`. A tight multiplier with a weak brake factor produces many small slow-downs. A loose multiplier with a strong brake factor produces few but severe slow-downs. Both affect `brakeRate` and `stableOvertakes`.

**avoidanceBufferPct ↔ lateralForce:** The buffer fraction determines how early avoidance fires relative to actual body contact. A larger buffer with small force produces prolonged gentle pushes (high `lateralSpeedScore`). A smaller buffer with large force produces sharp last-moment corrections (potential zigzag near the threshold).

### Dev Screen

The physics sliders (`lateralForce`, `lateralDamping`, `homeForceStrength`, `homeForceReductionOnOverlap`, `avoidanceDistance`, `speedBrakeFactor`, `speedBrakeTMultiplier`, `speedBrakeYThreshold`) were removed from the Dev Screen during `feat/dynamic-speed-brake`. The Phase 5 winner values are now locked in `storage/defaults.js`. To test new values, override via `--behavior='{"lateralForce":…}'` in the sim, or apply a temporary patch in `storage/defaults.js` and run the browser gate.

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

*(docs/LESSONS.md, Lesson 106)*

Prior to feat/lateral-velocity, lateral forces were applied directly to `physicalY`. With opposing forces (home force vs. avoidance), the sign could flip frame-to-frame, producing visible oscillation in tight packs.

The fix: accumulate forces into `physicalYVelocity`, then apply with damping:

```js
physicalYVelocity = physicalYVelocity * lateralDamping + netForce;
physicalY += physicalYVelocity;
```

**Sim result:** −37% `lateralSpeedScore`, −44% `zigzagScore` at the same or lower `overlapRate`. Zone success rates were unchanged (+0.3pp, within noise).

**Key insight:** Smoothing and accuracy are decoupled. Physics-based smoothing (velocity + damping) is more robust than threshold-based filtering because it scales naturally with the unit-normalized physicalY space, without requiring per-track tuning.

### L107 — LHS extension outperforms uniform coverage

*(docs/LESSONS.md, Lesson 107)*

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

### finishT on closed tracks = `lapsFromDuration(durationSec)`

Closed-track `finishT` is the **lap-count bucket** `lapsFromDuration(durationSec)` from
`client/src/modules/camera/lapUtils.js`:

| duration | laps |
|----------|------|
| < 60 s   | 1    |
| 60–89 s  | 2    |
| 90–119 s | 3    |
| ≥ 120 s  | 4    |

This is the **same function the browser always used** (`RaceScreen/index.jsx`), and the same one
`headlessRaceSimulator.js` and `sim-race-visual.mjs` use. Before `8f57cba`, `sim-fairness.mjs`
instead derived closed-track `finishT` from a continuous natural-distance formula
(`computeFinishT`), which produced ≈4.2 laps for a 60 s race instead of 2 — i.e. the fairness
gates were measured over ~2× the real lap count and ~2× the on-screen speed. `8f57cba` switched
the closed branch to `lapsFromDuration`. **`computeFinishT` is now OPEN-TRACK ONLY** — do not
route closed tracks through it (a comment in the source warns against reintroducing the bug).

### race_baseSpeed — single unified formula (both topologies)

`sim-fairness.mjs` now back-solves speed via the shared `computeRaceBaseSpeed` helper, identical
term-for-term to the browser. See the master formula in
[ARCHITECTURE.md](ARCHITECTURE.md) (`race_baseSpeed` section) — not duplicated here. Key point:
`closedSsf = pathLengthPx / 3200` enters the speed denominator (and `closedSsf = 1` for open),
so a single formula covers both track types. The `speedMultiplier` in the denominator cancels
the post-multiply, giving the browser's racer-type-independent base pace on closed tracks.

### DURATION_VARIANTS = `[30, 60, 120]`

The default sweep duration set is `[30, 60, 120]` (was `[30, 120]`). **60 s was added** because it
is the actual default player-facing scenario (default race duration → `lapsFromDuration(60) = 2`
laps), which the prior `[30, 120]` set never exercised. `--dur=<n>` still overrides to a single
duration.

### Shared-config CLI defaults (no hand-mirrored literals) — `9cfa953`

As of `9cfa953`, the Race-Plan and rubber-band CLI-arg defaults are **read from the shared
DevScreen config objects at module load**, not from hardcoded literals — so a change to the shared
default propagates to the sim automatically and can never silently drift from the browser. The
`argVal(name, default)` override is preserved (e.g. `--corridorEnd=0.9` still works for experiments):

| CLI flag | default source |
|----------|----------------|
| `--bonusMult` | `DEFAULT_RACE_DYNAMICS_CONFIG.racePlanBonusStrengthMultiplier` (2.0) |
| `--bonusTransitionEnd` | `DEFAULT_RACE_DYNAMICS_CONFIG.racePlanBonusTransitionEnd` (0.75) |
| `--bonusFadeDuration` | `DEFAULT_RACE_DYNAMICS_CONFIG.racePlanBonusFadeDuration` (1500) |
| `--corridorStart` | `DEFAULT_RACE_DYNAMICS_CONFIG.racePlanCorridorStart` (0.55) |
| `--corridorEnd` | `DEFAULT_RACE_DYNAMICS_CONFIG.racePlanCorridorEnd` (1.0) |
| `--rubber-band` / `--rbFlatBoost` / `--rbGapThreshold` / `--rbRampMs` | `DEFAULT_RUBBER_BAND_CONFIG` (enabled/flatBoost/gapThreshold/boostRampMs) |

Before `9cfa953`, `corridorEnd` defaulted to a hardcoded `0.95` (vs shared `1.0`) and `bonusMult`
to `1.0` (vs shared `2.0`) — both silently wrong vs the browser. This is now structurally
impossible for these fields.

**Exception — `RB_ENDGAME_THRESHOLD` stays a hardcoded literal (0.9)** by design. The browser
sources its rubber-band endgame gate from `DEFAULT_CAMERA_CONFIG.endgameThreshold` (a camera-config
field cross-reused for gameplay, `index.jsx:876`) — a known architectural smell. Splitting it into
a dedicated `rubberBandEndgameThreshold` field is a browser-side change tracked separately in the
backlog; the sim does not import camera config just for this value.

### `--race-plan` default is now `true` (browser-faithful)

`--race-plan` defaults to **`true`** as of `9cfa953` — the browser's controller is always active
(there is no off-switch). `--race-plan=false` remains available as an explicit opt-out for sweep
experiments (baseline / controller-off comparisons).

---

*Last updated: 2026-06-30. See also: [LESSONS.md](LESSONS.md), [ARCHITECTURE.md](ARCHITECTURE.md), [ROADMAP.md](ROADMAP.md).*

---

## 2026-07-10 — INFRA update (sim-trust): current state of the sim

This document was the most stale; the items below correct it against source.

- **Size & structure:** `scripts/sim-fairness.mjs` is now **~3522 lines** (`wc -l`), not ~5000. Observers
  are factored into `scripts/sim/observers/` (`fairness-stats.mjs`, `gap-metrics.mjs`, `report.mjs`).
  `scripts/sim/experiments/` no longer exists (it went with the last experiment).
- **Dormant experiments: ALL FOUR DELETED** — TEF (`tefMult`), ROW_SPLIT (`startRowBoostMult`), the V4
  start-row experiment, and **tier2** (`tier2Mult`). Non-comment `grep tier2` = 0. (2026-07-10 correction:
  an earlier draft of this section wrongly read an orphaned comment header — "TIER-2 … attached ONLY when
  `--tier2` active" — as a live path; it was a dead comment with the `STRIP_METRICS` block directly under
  it. The three stale tier2 comments have been removed. **A stale comment is a lie with authority** — see
  LESSONS.md.)
- **The sim IMPORTS the shipped physics; it does not re-implement it.** `advanceRacerT` (raceStep.js),
  `applyGovernor`/`arcT` (raceGovernor.js), `raceLengths.js`, `racePlanner.js` are all imported. The
  divergence risk lives only in the *inputs* each engine computes before the shared t-update — audited
  in `docs/FORCE-PARITY.md`.
- **Stage-0 config pipeline:** `--config=world.json` is honoured or the run **ABORTS loud**
  (`WORLD_SCHEMA_MISMATCH`, exit 2) — never runs-and-ignores. With no `--config`, a prominent
  **ASSUMED-DEFAULTS** banner prints and every result is stamped provisional. `WORLD_SCHEMA_VERSION` +
  `hashWorld` stamp each result (`raceConfigWorld.js`). Golden: `scripts/night-sweep/golden-stage0.mjs`.
- **Gap-space observers, in RACER LENGTHS** (`scripts/sim/observers/gap-metrics.mjs`): lengths-behind,
  leader→P2, top-5 spread, field p10–p90, field median, the frontmost-gap (detached-group) curve, plus
  the deadRace/visibleComeback ingredients. Seconds are a secondary column only. Enabled by
  `--gap-metrics`; byte-neutral when off.
- **THE STANDING RULE — rank-space metrics cannot see a dead race.** `gap-metrics.test.mjs` is the
  executable proof: two synthetic races with **identical final ranks**, one bunched and one strung out —
  every rank-space metric is identical, every gap-space metric differs. If it ever fails, a rank metric
  started depending on gaps or a gap metric went blind to them; stop.
