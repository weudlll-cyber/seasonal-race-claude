# Gap-Cap Re-Roll Bias — Phase-2 Exploration Sweep

SIM-only gap-cap re-roll bias (docs/CONCEPT-COHESION.md), scheduled rolls only. All 4 tracks, **N=50 per track**, seed=1 (same seeds as the f40a7a6 baseline). Strength 0.5 (threshold-first). Facts only — the arm decision is the owner's.
V0 STOP gate PASSED (V0 overall runaway 22.5% within 22.5% ±2).

## Gates
runaway <10% overall AND ≤15% every track AND within-3.0L-of-P1 runaway-median ≥ 2 AND parade ≤2% AND action Δ ≥ 0 AND B1&B2 ≥70% (every track) AND Holm ≤2/4.

| arm | runaway overall | per track (lh/ms/sr/do) | max | within3 (run / all) | parade | action Δ | B1min | B2min | Holm | biasedRolls | dutyCycle | PASS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| V0 | 22.5% | 18.0% / 20.0% / 28.0% / 24.0% | 28.0% | 0 / 2 | 2.0% | +0.00 | 70.8% | 71.6% | 2/4 | 0.0 | 0.00 | ❌ |
| SYM-1.5 | 19.5% | 14.0% / 10.0% / 30.0% / 24.0% | 30.0% | 0 / 2 | 1.0% | +0.04 | 72.4% | 71.0% | 2/4 | 4.3 | 0.53 | ❌ |
| SYM-2.0 | 20.0% | 14.0% / 12.0% / 30.0% / 24.0% | 30.0% | 0 / 2 | 2.0% | +0.23 | 70.8% | 71.8% | 2/4 | 2.3 | 0.36 | ❌ |
| DOWN-1.5 | 19.5% | 14.0% / 10.0% / 30.0% / 24.0% | 30.0% | 0 / 2 | 1.0% | +0.02 | 71.6% | 71.8% | 2/4 | 2.4 | 0.39 | ❌ |
| DOWN-2.0 | 20.5% | 14.0% / 14.0% / 30.0% / 24.0% | 30.0% | 0 / 2 | 2.0% | +0.25 | 71.2% | 71.2% | 2/4 | 1.2 | 0.28 | ❌ |

Per-track column order: luger-hill / mountainstreet / searound / dirt-oval. Raw per-(arm×track): `per-arm-track.csv`.
Watch metrics: `biasedRolls` = mean gap-biased rolls/race; `dutyCycle` = mean leader duty-cycle (share of one racer's window rolls biased — the "held" gauge, high = reads as a spring).
