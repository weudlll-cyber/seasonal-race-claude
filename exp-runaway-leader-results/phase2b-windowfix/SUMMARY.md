# Gap-Cap Re-Roll Bias — Phase-2b (window-fix re-run + strength axis)

SIM-only, scheduled rolls only, window end on the roll schedule's REALIZED-duration basis (fix `9ff3bf3`). All 4 tracks, **N=50**, seed=1 (f40a7a6 seeds). Facts only — arm decision is the owner's.
STOP gates PASSED: V0 overall 22.5% (within 22.5% ±2); window-eligible rolls > 0 on all tracks (closed tracks were 0 pre-fix).

## Gates
runaway <10% overall AND ≤15% every track AND within-3.0L-of-P1 runaway-median ≥ 2 AND parade ≤2% AND action Δ ≥ 0 AND B1&B2 ≥70% (every track) AND Holm ≤2/4.

| arm | runaway | per track (lh/ms/sr/do) | max | within3 (run/all) | parade | action Δ | B1min | B2min | Holm | winRolls | biased | duty | PASS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| V0 | 22.5% | 18.0% / 20.0% / 28.0% / 24.0% | 28.0% | 0 / 2 | 2.0% | +0.00 | 70.8% | 71.6% | 2/4 | 0 | 0.0 | 0.00 | ❌ |
| SYM-1.5-s05 | 12.0% | 14.0% / 10.0% / 22.0% / 2.0% | 22.0% | 0 / 2 | 1.0% | -0.05 | 68.4% | 69.0% | 2/4 | 113 | 12.2 | 0.71 | ❌ |
| DOWN-1.5-s05 | 12.0% | 14.0% / 10.0% / 20.0% / 4.0% | 20.0% | 0 / 2 | 0.5% | +0.23 | 70.0% | 68.0% | 2/4 | 113 | 6.7 | 0.58 | ❌ |
| SYM-2.0-s05 | 12.5% | 14.0% / 12.0% / 18.0% / 6.0% | 18.0% | 0 / 2 | 1.0% | +0.31 | 70.8% | 71.6% | 2/4 | 113 | 6.8 | 0.57 | ❌ |
| DOWN-2.0-s05 | 12.5% | 14.0% / 14.0% / 18.0% / 4.0% | 18.0% | 0 / 2 | 2.0% | +0.65 | 70.4% | 70.4% | 2/4 | 113 | 3.7 | 0.48 | ❌ |
| SYM-1.5-s075 | 9.0% | 14.0% / 6.0% / 16.0% / 0.0% | 16.0% | 0 / 2 | 0.0% | +1.30 | 67.6% | 68.0% | 2/4 | 113 | 12.0 | 0.69 | ❌ |
| SYM-1.5-s10 | 8.5% | 12.0% / 6.0% / 16.0% / 0.0% | 16.0% | 0 / 2 | 1.5% | -0.27 | 71.2% | 70.0% | 2/4 | 113 | 11.9 | 0.68 | ❌ |
| DOWN-1.5-s075 | 11.0% | 14.0% / 8.0% / 20.0% / 2.0% | 20.0% | 0 / 2 | 0.5% | +1.22 | 70.0% | 67.6% | 2/4 | 113 | 6.8 | 0.58 | ❌ |
| DOWN-1.5-s10 | 11.0% | 12.0% / 8.0% / 22.0% / 2.0% | 22.0% | 0 / 2 | 0.0% | +0.99 | 70.8% | 69.0% | 1/4 | 113 | 6.7 | 0.57 | ❌ |

Per-track column order: luger-hill / mountainstreet / searound / dirt-oval. Raw: `per-arm-track.csv`. winRolls = mean window-eligible rolls/race (STOP-gate denominator); biased = mean biased rolls/race; duty = leader duty-cycle (the "held" gauge).
