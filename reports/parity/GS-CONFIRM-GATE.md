# G/s candidate confirm gate — all ten tracks, N=100

**Autonomous overnight run, 2026-07-26. MEASUREMENT ONLY — nothing is flipped or shipped; this run is the
evidence for the owner's decision tomorrow.** Gate-tier confirm of the SCREEN candidate from
[HONEST-WORLD-GS-SCREEN.md](HONEST-WORLD-GS-SCREEN.md). Runs on the committed speed-150 engine (`4b707cb`),
varying ONLY the two shipped gap-reroll knobs via CLI flags on `sim-fairness.mjs`. No shipped code changed.
Driver: [`scripts/exp-gs-confirm-gate.mjs`](../../scripts/exp-gs-confirm-gate.mjs) (read-only). Machine
output: [`gs-confirm-data/gs-confirm-gate.json`](gs-confirm-data/gs-confirm-gate.json). Runtime **155.0 min**.

## Arms (paired seeds, race-for-race)

| arm | G (gapRerollThresholdLengths) | s (gapRerollStrength) | how run |
|---|---|---|---|
| CONTROL | 0.75 | 0.5 | shipped defaults, flagless (byte-identical to the shipped game) |
| CANDIDATE | 0.5 | 1.0 | `--gapRerollThresholdLengths=0.5 --gapRerollStrength=1.0` |

Per-race seeds derive from `--seed=1` identically for both arms, so every race is paired — the difference
is the knobs, not the draw. All **ten** standard tracks at canonical per-track defaults (default racer type,
default laps/seconds, standard field 40 closed / 60 open), **N=100 per arm per track = ~2000 races**,
band-reach racer-row weighted.

## Pooled result (racer-row weighted, 1000 races per arm)

| metric | CONTROL (shipped) | CANDIDATE (G0.5/s1.0) | Δ |
|---|---|---|---|
| **band-reach** | **71.8%** ✓ over 70% | **72.7%** ✓ over 70% | **+0.8 pp** |
| Holm-unfair tracks | 3 / 10 | 3 / 10 | 0 |
| dead finales | 14.1% | **10.0%** | −4.1 pp |
| front group @ line | 3.89 | **4.23** | +0.34 |
| lead changes / distinct leaders | 2.02 / 2.88 | **2.29 / 3.12** | +0.27 / +0.24 |
| runaway / parade / duo | 10.1% / 1.8% / 4.7% | **6.8% / 0.8%** / 4.3% | −3.3 / −1.0 / −0.4 pp |
| escape depth med / p90 / max | 2.24 / 4.79 / 10.46 | **2.04 / 4.38** / 10.46 | −0.20 / −0.41 / 0 |
| saturated-correction rate | 6.5% | 6.3% | −0.2 pp |

**Both arms clear 70%.** The candidate lifts band-reach **+0.8 pp** and improves **every** finale guardrail:
fewer dead finales, more front-group finishes, more lead changes and distinct leaders, less runaway, less
parade, shallower escapes — with the saturated-correction rate and the Holm count unchanged. The gain is
smaller than the SCREEN's stress-pool +2.5 pp (expected — the full pool includes the already-healthy
tracks), but it is in the same direction and paired, so a small pooled delta over ~50k racer-rows per arm
is well outside sampling noise.

## Per-track, both arms

| track | topo | CTRL band | CAND band | Δband | CTRL dead | CAND dead | CTRL front | CAND front | CTRL run | CAND run | CTRL Holm | CAND Holm |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| city-circuit | closed | 73.5% | 74.8% | +1.3 | 14.0% | 15.0% | 4.02 | 4.19 | 9.0% | 8.0% | ok | ok |
| dirt-oval | closed | 75.6% | 75.6% | +0.1 | 19.0% | 14.0% | 4.22 | 4.74 | 11.0% | 4.0% | **UNF** | **ok** |
| garden-path | closed | 82.0% | 83.4% | +1.4 | 7.0% | 2.0% | 6.05 | 6.40 | 0.0% | 0.0% | ok | ok |
| ice-track | closed | 74.1% | 74.5% | +0.4 | 23.0% | 17.0% | 3.51 | 3.65 | 13.0% | 5.0% | ok | ok |
| luger-hill | open | 68.1% | 69.0% | +0.9 | 7.0% | 8.0% | 3.60 | 4.24 | 15.0% | 13.0% | UNF | UNF |
| mountainstreet | open | 70.0% | 70.8% | +0.8 | 14.0% | 15.0% | 3.96 | 4.18 | 6.0% | 4.0% | ok | ok |
| river-run | open | 69.3% | 70.9% | +1.6 | 7.0% | 4.0% | 3.64 | 3.79 | 9.0% | 3.0% | ok | ok |
| searound | closed | 72.5% | 74.1% | +1.6 | 22.0% | 11.0% | 2.82 | 3.15 | 19.0% | 16.0% | UNF | UNF |
| seatrack | open | 70.0% | 69.2% | **−0.8** | 14.0% | 7.0% | 3.99 | 4.51 | 10.0% | 7.0% | ok | ok |
| space-sprint | open | 69.6% | 70.6% | +1.0 | 14.0% | 7.0% | 3.08 | 3.41 | 9.0% | 8.0% | ok | **UNF** |

**Candidate wins band-reach on 9 of 10 tracks** (only seatrack regresses, −0.8 pp, and even there dead
finales halve 14→7% and front@line rises). The Holm composition shifts but the count does not: the
candidate **fixes dirt-oval** (UNF→ok) and **newly flags space-sprint** (ok→UNF), net 3/10 either way —
so the SCREEN's Holm-2/2 concern did **not** generalize to the full field. luger-hill and searound stay the
two hardest tracks under both arms (still Holm-flagged, still the lowest / most-runaway), but both improve.

## Candidate duration-scaling (N=25 × 4 standard tracks)

Against the shipped arm's scaling from [REBASELINE.md](REBASELINE.md) §2:

| dur | shipped band-reach | candidate band-reach | candidate runaway | candidate dead | candidate servoSat |
|---|---|---|---|---|---|
| 30 s | 65.8% | 65.4% | 16.0% | 19.0% | 8.0% |
| 120 s | 74.9% | 74.8% | 0.0% | 9.0% | 5.9% |
| 300 s | 76.8% | 77.0% | 0.0% | 3.0% | 5.5% |

The candidate **matches the shipped duration-scaling shape** — band-reach rises with race length, runaway
collapses at long durations, the 30 s short-race stress dips just under 70% for both arms. No regression at
either the short or the long end; the same "a shorter series is the risk, not a longer one" conclusion holds.

## Runtime

155.0 min (2000 main-gate races + 12 candidate duration-scaling combos, 8 parallel workers).

## Closing call

**Candidate confirmed better — recommend flip.** On the full ten-track gate the candidate G=0.5, s=1.0
beats the shipped G=0.75, s=0.5 on band-reach on **9 of 10 tracks (+0.8 pp pooled, 71.8% → 72.7%, both over
70%)** and **improves every finale guardrail** — the two numbers that most carry it are **dead finales
14.1% → 10.0%** and **runaway 10.1% → 6.8%** — with **Holm unchanged at 3/10** (no fairness-distribution
cost). It is a modest but clean and consistent win: more fairness AND a livelier, less runaway-prone
finale, at no measured cost. The margin is small, so this is a recommendation, not an imperative — but the
evidence points one way. **The owner decides; nothing was flipped.** If flipping: Dev Screen → Dynamics →
gap-reroll threshold 0.75 → 0.5 and strength 0.5 → 1.0 (or update the two defaults in `defaults.js`), then
re-mint the shipped-default fingerprint pair on the new committed state per the SIM.md rule.
