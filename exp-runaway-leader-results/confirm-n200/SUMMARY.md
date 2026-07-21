# Gap-Cap Re-Roll — Overnight Confirmation (ALL 10 tracks, N=200, 60s)

Measurement only, feature frozen at master `b1f6617`. All 10 tracks (default racer each), N=200, seed set 1–200 (paired), scheduled rolls only. STOP gates PASSED: V0 first-100-seed = baseline on the 4 known tracks; window-eligible rolls > 0 on all 10 tracks in A2. Facts only — the arm decision is the owner's.

## Gate table (across ALL 10 tracks)
runaway <10% overall AND ≤15% every track AND parade ≤2% AND action Δ ≥ 0 AND B1&B2 ≥70% every track AND Holm ≤2/4.
| arm | runaway | max track | parade | action Δ | B1min | B2min | Holm | within3 med | biased | duty | PASS |
|---|---|---|---|---|---|---|---|---|---|---|---|
| V0 | 23.0% | 29.0% | 1.9% | +0.00 | 71.8% | 69.8% | 2/10 | 2 | 0.0 | 0.00 | ❌ |
| SYM-1.5-s075 | 8.8% | 16.0% | 1.0% | +0.38 | 69.9% | 69.7% | 3/10 | 2 | 11.8 | 0.70 | ❌ |
| SYM-1.5-s10 | 8.3% | 15.5% | 1.1% | +0.53 | 71.2% | 70.3% | 3/10 | 2 | 11.7 | 0.70 | ❌ |

## Per-track runawayWinnerRate (V0 / s075 / s10)
| track | type | V0 | SYM-1.5-s075 | SYM-1.5-s10 |
|---|---|---|---|---|
| dirt-oval | closed | 23.0% | 2.0% | 4.0% |
| river-run | open | 17.5% | 10.5% | 9.0% |
| space-sprint | open | 18.5% | 11.0% | 10.5% |
| garden-path | closed | 24.5% | 10.0% | 8.0% |
| city-circuit | closed | 29.0% | 9.0% | 6.0% |
| luger-hill | open | 16.0% | 8.0% | 8.5% |
| ice-track | closed | 26.5% | 6.5% | 7.5% |
| mountainstreet | open | 23.0% | 7.5% | 6.0% |
| searound | closed | 29.0% | 16.0% | 15.5% |
| seatrack | open | 23.0% | 7.5% | 8.5% |

## Paired per-seed conversion (of the V0-runaway pairs)
| arm | V0 runaways | converted | conv% | within3 of converted (p25/med/p75) | escapee: win/top3/drop | residual | residual gap@0.90 V0→arm (med) |
|---|---|---|---|---|---|---|---|
| SYM-1.5-s075 | 460 | 331 | 72.0% | 1/1/3 | 130/147/54 | 129 | 4.99→4.43 |
| SYM-1.5-s10 | 460 | 336 | 73.0% | 1/2/4 | 127/143/66 | 124 | 4.99→4.49 |

*converted = a V0-runaway (track,seed) that is NOT a runaway in the arm. within3 = racers within 3.0L of P1 at 0.90 in the arm (did the lonely march become a fight, with how many). escapee win/top3/drop = where V0's runaway leader finishes in the arm. residual = pairs still runaway; gap@0.90 shows whether the lead at least shrank.*

## Topology — do the 6 new tracks behave like the known groups, and does the mechanism hold?
New OPEN tracks (river-run, space-sprint, seatrack): V0 mean runaway 19.7% (known open ≈18–20%).
New CLOSED tracks (garden-path, city-circuit, ice-track): V0 mean runaway 26.7% (known closed ≈24–30%).
Mechanism (SYM-1.5-s10) mean runaway: open group 8.5%, closed group 8.2% (V0: open 19.6%, closed 26.4%).

## The three open questions (N=200 power)
- **searound vs the 15% cap:** s075 16.0%, s10 15.5% (cap 15%).
- **band-reach ≥70% on the strength arms:** s075 B1min 69.9% / B2min 69.7%; s10 B1min 71.2% / B2min 70.3% (all-track minima).
- **s075 vs s10 action:** Δ vs V0 = +0.38 (s075) vs +0.53 (s10).

Data: `per-arm-track.csv` (aggregates), `races-<arm>-<track>.csv` (per-seed, paired + determinism re-run target).
