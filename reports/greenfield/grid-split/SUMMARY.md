# FINDING — the sim builds the start grid twice, from two different seeds

**Report-only. No races run, no behaviour changed.** Pure arithmetic over the two row-layout shuffles the sim already performs, replicated with the engine's own shared functions (`computeEvenRowLayout`, `mulberry32`/`makePRNG`, `comboLayoutSeed`).

## What the split is

`scripts/sim-fairness.mjs` builds the start grid **twice**, from two unrelated generators:

| grid | where | generator | varies per race? | feeds |
|---|---|---|---|---|
| **PLAN** | main loop | `makePRNG(comboLayoutSeed(track, racer, GLOBAL_SEED))` | **no** — constant for the whole batch | `planRacers` → `createRacePlan(...).startRowIndex` |
| **ACTUAL** | `runSingleRace` | `makePRNG(raceSeed)` (global swap) | yes | `assignmentByRacer` → where each racer really starts |

So the plan's belief about where a racer starts is drawn from a different seed than the racer's real start row, and the plan grid does not even change between races of a sweep. The browser has no such split — it derives one `assignmentByRacer` and uses it for both.

## How far apart the two grids are

Per track, 100 races, 40 racers, batch seed 1:

| track | rows | racers whose plan row ≠ actual row | mean abs row delta | max row delta | pulk racers truly in rows 1–3 (of 3) | pulk mis-selection |
|---|---|---|---|---|---|---|
| luger-hill | 5 | 79.8% | 1.60 | 4 | 1.91 | 36.3% |
| mountainstreet | 2 | 48.2% | 0.48 | 1 | 1.54 | 48.7% |
| searound | 7 | 85.3% | 2.23 | 6 | 1.34 | 55.3% |
| dirt-oval | 4 | 74.4% | 1.23 | 3 | 2.35 | 21.7% |
| **POOLED** | – | **71.9%** | **1.39** | 6 | **1.79** | **40.5%** |

### The two grids are statistically INDEPENDENT

This is the sharpest form of the finding. If the plan grid carried *no* information about the actual grid, the share of racers landing in a different row would be exactly `1 − 1/rows`. It is, on every track:

| track | rows | measured differ | independent expectation (1 − 1/rows) | delta |
|---|---|---|---|---|
| luger-hill | 5 | 79.8% | 80.0% | -0.2 pp |
| mountainstreet | 2 | 48.2% | 50.0% | -1.8 pp |
| searound | 7 | 85.3% | 85.7% | -0.5 pp |
| dirt-oval | 4 | 74.4% | 75.0% | -0.6 pp |

**The plan's `startRowIndex` carries essentially zero information about where the racer actually starts.** It is not "slightly stale" — it is an unrelated draw. Any plan logic that reasons about start rows is, in the sim, reasoning about a grid that does not exist.

## Blast radius — what actually reads `startRowIndex`

In `racePlanner.js` the plan consumes `startRowIndex` in exactly two places:

1. **`byRow`** — built and then **never read**. Dead code. Zero impact.
2. **`middleField` → `pulkPool` → `pulkRacerIds`** — the 3 racers that receive the PULK cohesion bias (`computePulkBiasedTarget` is the only consumer).

Crucially, **the target-rank assignment never reads `startRowIndex`** — it is a Fisher-Yates over the racers *array order*. That is why outcome fairness is grid-independent by construction and is **not** corrupted by this split.

**So the entire measurable consequence is: the PULK cohesion bias is applied to 3 racers selected as "middle field (rows 1–3)" on a grid they do not start on.**

## Which committed conclusions are sensitive?

**NOT sensitive — paired A-vs-B comparisons (safe).** Every arm in a sweep shares the same batch seed, track, racer and per-race seeds, so both grids — and therefore the identical mis-selection — are *the same in every arm*. The effect is common-mode and cancels in a paired difference. This covers the night run's A8 / A0-GR / A5 comparison, the 1200-race finale post-analysis, the composer sweeps, and the gap-reroll confirm: **their relative conclusions stand.**

**Potentially sensitive — absolute start-row fairness numbers.** The fairness gate conditions outcomes on the *actual* start row (taken from the result rows, i.e. the ACTUAL grid), so the measurement itself is reading the right rows. But the PULK bias — one of the mechanisms acting on the field — is targeted using the *other* grid. Absolute band-reach / Holm-per-row figures therefore describe an engine whose pulk bias is aimed slightly off the middle field. They are internally valid but are **not** the numbers a corrected engine would produce.

**Sensitive — browser ↔ sim parity.** This is the real cost. The browser uses one grid for both the plan and the actual start; the sim uses two. Under the project's standing rule that the sim is a *prediction tool for the browser*, the sim is predicting a slightly different mechanism than the one the browser runs. This is an additional, independent parity divergence beyond the plan-ordering issue documented in `docs/EYE-TEST-SEEDS.md`.

## Recommendation (no fix applied)

1. **Do not block the pending ship on this.** The G=0.75 decision rests on paired comparisons, which are provably unaffected.
2. **Treat it as a parity defect, not a fairness defect.** The fairness property (grid-independent assignment) is intact; what is broken is that the sim aims one mechanism using a grid the racers do not start on, and the browser does not.
3. **When fixed, the minimal change is to feed `runSingleRace`'s own `assignmentByRacer` into `planRacers`** (one grid per race, browser-shaped), rather than the batch-level `comboRowLayout`. That is a behaviour change: it moves pulk selection, so it **breaks the OFF fingerprint** and needs its own gate plus a re-baseline of absolute numbers. Schedule it with the parity work, not as a drive-by.
4. **Delete the dead `byRow`** in `racePlanner.js` at the same time (zero-risk, it is never read).

Data: `grid-split.csv`.
