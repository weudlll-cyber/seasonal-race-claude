# SWEEP-HARNESS.md — The Measurement Infrastructure

*(Added 2026-07-20, cleanup step 4. Describes the permanent sim-measurement stack as a whole: the
observers, the orchestrator pattern for a new sweep, the determinism rule, and the output conventions.
For how to RUN the base harness and what each metric means, see [SIM.md](SIM.md).)*

The sim is one headless simulator — `scripts/sim-fairness.mjs` — that shares its physics modules with
the browser (the single source for both). Everything else here is **read-only instrumentation**: pure
observers that read race state / results and return numbers, never mutating a race. Every observer is
**flag-gated** so a no-flag run does zero extra work and stays byte-identical (the fingerprint gate).

## Observers (`scripts/sim/observers/`)

Each is SIM-ONLY and read-only. "Flag" is the `sim-fairness.mjs` switch that turns its collection on.

- **`fairness-stats.mjs`** — the core fairness statistics (a pure move out of the harness, computation
  unchanged): `computeFairnessStats` / `computeExtendedFairnessStats`, `computeZoneSuccessRate`
  (band-reach), chi-square p-value, Spearman, Holm-adjusted per-start-row fairness. Reads race RESULTS,
  depends only on `BAND_EDGES`. Always on — it produces the standard report's fairness verdict. No flag.

- **`report.mjs`** — read-only human-report generation (`buildReport`, the diagnostic tables A–E,
  comeback report). Turns race results into the Markdown `fairness-report.md`. Always on. No flag.

- **`gap-metrics.mjs`** — INFRA-5C **gap-space** metrics in RACER LENGTHS (the shared HUD scale):
  `lengthsBehindLeader`, leader→P2 gap, top-5 spread, field p10–p90, per-progress checkpoints
  (0.25/0.50/0.75/0.90 + at-the-line), plus provisional `deadRaceFlag` / `visibleComeback`. Exists
  because every RANK-space metric is blind to a dead race (a racer is "reachedFront" fifteen lengths
  behind a lone winner). Flag: `--gap-metrics`.

- **`pulk-contest.mjs`** — PULK-window contest + density, fed frame-by-frame from the `--action-metrics`
  PULK loop (piggybacks its live-order sort, adds no second loop): `maxLinkGapLengths` (largest
  adjacent-rank gap = has the field torn?), held top-5 overtakes (a swap that stuck ≥750 ms),
  `fullSpreadLengths`, `leaderSnapshot` (identity + lead-over-P2, used by `--runaway-leader`). Flag:
  `--action-metrics` (with `--runaway-leader` for the boundary snapshots).

- **`runaway-parade.mjs`** — the two dead-endgame classifiers (baseline 2026-07-20):
  **RUNAWAY_WINNER** (leader ≥ `leadLen` clear at progress `windowStart`, wins, never challenged in
  `[windowStart,1.0]`) and **PARADE_FINISH** (a side-by-side leading group ≥2 detached ≥ `farLen` from
  the field). Pure classifier + `RUNAWAY_PARADE_DEFAULTS`; the sim collects the raw per-race record.
  Flag: `--runaway-parade`. Living reference for a new sweep — see below.

- **`hero-adherence.mjs`** — post-race hero **story-adherence** over the `--hero-map` per-hero
  observations (`heroObs`): did a hero resolve into its assigned final band (`reachedTargetBand`),
  `climbFrac` (share of frames still climbing), `reachedTargetProg`, peak depth. Also the ONE source of
  `heroRole` / `ROLE_MARGIN_RANKS` (a comebacker = cast behind its target by > margin). Flag: `--hero-map`.

- **`comeback-reality.mjs`** — post-race, also over `--hero-map` `heroObs`: does a hero CAST as a
  comebacker actually climb close to its authored `finalRank`, and is that designation a reliable
  pointer to real climbing? Reuses `heroRole` from hero-adherence. Scope caveat (honest): `heroObs`
  records only the cast, so the reliability ranking is AMONG THE CAST, not the full field. Flag:
  `--hero-map` (+ `--comeback-reality` for the sweep rollup).

- **`cohesion.mjs`** — Stage-0 **LINK** observer: the field's gap structure in racer lengths, per frame
  (`link = arcT(ahead.t, behind.t, isOpen) × lenScale`). MEASURE-ONLY — no correction is applied; it
  marks where a hypothetical correction WOULD apply. Carries the open-vs-closed lap-seam golden
  (`cohesion.test.mjs`) that a prior cohesion attempt died on. Read-only, fed frame-by-frame.

All length conversions use the ONE shared helper (`client/src/modules/raceLengths.js`) — `lenScale`
is passed in, never re-derived in an observer. Each observer with a definition worth pinning ships a
`*.test.mjs` golden (`node --test scripts/sim/observers/*.test.mjs`).

## Building a new sweep — the orchestrator pattern

A "sweep" is not a new binary. It is a thin **orchestrator** that spawns `sim-fairness.mjs` once per
combo and post-processes what the sim writes. The living reference is
**[`scripts/exp-runaway-leader.mjs`](../scripts/exp-runaway-leader.mjs)**:

1. **Spawn per track (per combo).** One `sim-fairness.mjs` child per track, pinned to one track + one
   duration, with the observer flag(s) the sweep needs. Combos are independent + deterministic per seed,
   so run up to `--jobs` concurrently — identical results to serial, only wall-clock differs.
2. **Default racer from the seed, never hardcoded.** Read each track's `defaultRacerTypeId` from
   `server/seeds/tracks/<id>.json` (`--track` / `--racer`). Hardcoding a racer per track drifts.
3. **Classify with the pure observer module.** The orchestrator imports the observer's classifier
   (e.g. `classifyRace` from `runaway-parade.mjs`) and applies it to the raw per-race records the sim
   emitted — the metric DEFINITIONS live in the observer module, not the orchestrator.
4. **Emit small artifacts.** Per-race CSV + per-combo CSV + a summary CSV + a `SUMMARY.md` (and a short
   `REPORT.md` for the task write-up), into `exp-<name>-results/`.

If a metric needs a signal the sim does not yet emit, the rule is: add a **read-only, flag-gated**
observer to the harness (never a sim-behavior change), or REPORT the blocker. A no-flag run must stay
byte-identical.

## Determinism rule (verified every sweep)

`sim-fairness.mjs` seeds each race deterministically when `--seed > 0`
(`seed = (globalSeed − 1) × nRaces + raceIdx + 1`), so **same seeds → byte-identical output**. Every
sweep verifies it: re-run one combo with the same seeds and diff its CSV — it must be byte-identical
(md5 match). If it isn't, a nondeterminism crept in (unseeded `Math.random`, wall-clock, map-iteration
order) — stop and find it before trusting any number.

## Output conventions

| Location | Contents | Tracked? |
|---|---|---|
| `client/tmp/` | Regenerable sim scratch — the raw `fairness-data.json` / per-run observer JSON a sweep spawns and re-reads | **gitignored** (deletable; recreated on next run) |
| `exp-<name>-results/` | The small final CSVs + `SUMMARY.md` / `REPORT.md` of a sweep | **tracked** |
| `reports/` | Archived investigation evidence — concept reviews, closed-experiment result tables (`reports/exp-archive/`), salvaged one-off docs (`reports/results-salvage/`) | **tracked** — never moved once cited by a doc |

The sim writes its run artifacts under repo ROOT (`--out` is resolved relative to ROOT), so scratch
lands in `client/tmp/` rather than an external temp dir — a known hygiene limitation, not a per-sweep
choice. Keep heavy raw output in `client/tmp/`; commit only the small distilled CSVs/summaries.

## `exp-runaway-leader.mjs --p1-criteria` — which classifier condition blocks a race

Pure POST-ANALYSIS: reads the per-seed `races-<arm>-<track>.csv` files a `--p1-contest` run already
wrote and derives nothing that is not in them, so it needs **no sim run** and reproduces exactly from
committed data.

```
node scripts/exp-runaway-leader.mjs --p1-criteria [--out=<results dir>]
```

`p1ContestRate` is a conjunction of four conditions, and a flat rate between two arms can hide an arm
that improved three of them and still lost on the fourth. Two counts per condition:

- **fail%** — share of races failing it (conditions overlap, so these do not sum to 100).
- **sole** — races failing EXACTLY that one, i.e. the races a single change would flip.

Writes `criterion-breakdown.md` + `criterion-breakdown.csv` next to the baseline. On the committed
V0 / R97-ON baseline this is what identified `leadChangeCount < 3` as the wall (93% in both arms, sole
blocker in 27 / 38 races) while proximity was the least binding term.

### Front-act flag

Passed straight through to the sim by any sweep mode:

| flag | default | meaning |
|---|---|---|
| `--contestWindowStart` | 0.8 | front-act window start, read by the sustained-P1-battle observer |

`--contestWindowStart` moves the MEASUREMENT window, so an arm that changes it is not directly
comparable to a baseline measured at a different value — state the value in the arm table.

> The front-rotation flags that used to sit beside this one were removed with the mechanism itself
> (dead-mechanisms cleanup, 2026-07-23). An arm script that still passes them will simply have them
> ignored by the sim. Recoverable at tag `pre/dead-mechanisms-cleanup`.
