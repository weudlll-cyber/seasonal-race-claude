# REPORT — Runaway-Winner & Parade-Finish Baseline Sweep (read-only)

**Scope:** MEASUREMENT ONLY. No sim behavior changed. Two new race-level metrics added to the
investigations harness; current master (2e14663), shipped defaults, `b2AttackHeroes=3` ON, no config overrides.

## What was built

- **`scripts/sim/observers/runaway-parade.mjs`** — pure classifier module (no state, no I/O, no mutation).
  Holds the two metric definitions + thresholds (`RUNAWAY_PARADE_DEFAULTS`) and `classifyRace()`.
- **`scripts/sim/observers/runaway-parade.test.mjs`** — 14 unit cases; each spec clause exercised both ways.
- **`scripts/sim-fairness.mjs`** — read-only, fully flag-gated `--runaway-parade` observer (additive, +126 lines).
  Collects per race: leader identity + lead over P2 at progress 0.90; the running MIN lead of that leader
  over the field across [0.90, its own finish] (the "never challenged" signal); the finish-snapshot front
  consecutive gaps; and each racer's average speed over the final 5%. Never mutates race state; a no-flag run
  does zero extra work and is byte-identical.
- **`scripts/exp-runaway-leader.mjs`** — orchestrator. Spawns the sim once per track (default racer read from
  each track seed's `defaultRacerTypeId`), classifies every race with the module, emits CSV + `SUMMARY.md`.

## No blocker

Every required signal was obtainable as a pure read-only observation of the existing `racers` array
(leader identity at 0.90, the [0.90,1.0] challenge min, finish-snapshot front gaps, per-racer final-5% speed).
No sim file needed modifying, so nothing was reported as a blocker.

## Result (N=100 seeded races/track, seed=1, dur=60s, all 4 tracks)

| track | type | runawayWinnerRate | paradeFinishRate |
|---|---|---|---|
| luger-hill | open | 18% | 1% |
| mountainstreet | open | 18% | 3% |
| searound | closed | 30% | 1% |
| dirt-oval | closed | 28% | 3% |
| **OVERALL** | **all** | **23.5%** | **2.0%** |

- **Runaway winners** are common on the closed tracks (~30%), lower on the open tracks (18%). Across all 400
  races, `≥leadLen@0.90` (99) ≈ runaway winners (94): once a leader is ≥3 lengths clear at progress 0.90 it
  almost always converts to an unchallenged win — only ~5 such leads were later challenged.
- **Parade finishes** are rare (2%). Every parade group was size 2–3, with an internal speed spread of ≤0.10
  (mean 0.04) over the final 5% — confirming the "same speed" (paced, side-by-side) signature.

Full data: `runaway-parade-summary.csv`, `runaway-parade-races.csv`, `races-<track>.csv`.

## Verification

- **Determinism:** re-ran luger-hill with the same seeds → `races-luger-hill.csv` byte-identical
  (md5 `93ba0b8818b4f9b9f3506cc75c3ddae2`, both runs).
- **Diff scope:** only `scripts/sim-fairness.mjs` (harness, additive) + new files under `scripts/` +
  `exp-runaway-leader-results/`. ZERO sim behavior files (raceBehavior, raceGovernor, rowLayout,
  heroCurveGenerator, racePlanner, defaults.js). Per spec, no fingerprint run required.
- **Tests:** all 27 observer tests pass (`node --test scripts/sim/observers/*.test.mjs`), incl. the 14 new ones.

## Hygiene note

- The sim's `--out` is forced under repo ROOT (`join(ROOT, out)`), so sim run artifacts can't be redirected to
  the non-OneDrive scratchpad; they land in `client/tmp/` (gitignored), like the other exp drivers. Only the
  small final CSVs + markdown go to `exp-runaway-leader-results/`. Noted, not fixed (out of scope).
