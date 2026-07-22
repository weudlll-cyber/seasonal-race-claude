# P1 Contest Score — baseline (V0 vs gap-reroll winner), N=100, 60s

Read-only measurement of the merged "sustained multi-racer P1 battle" metric. 4 known tracks (default racer each), fixed baseline seeds 1–100, scheduled rolls only, 4 parallel jobs. No sim behavior file was touched — **no fingerprint** to check. **Facts only: p1ContestRate carries no threshold here — the gate is the owner's call, and the C1 concept follows separately.**

## Observer parameters
- Window W = **[0.8, first finish]**. The start is the LIVE `choreoResolveB2` config value, read at runtime — no hardcoded progress constant. The window CLOSES at the first finish: past it, racers leave the live ordering by finishing and rank 1 is inherited straight down the field (measured to 1.0, every race reports ~40 "distinct leaders").
- Front group = live racers within **3 lengths of P1, INCLUDING P1** (so `minGroup` 3 = the leader plus two chasers). Note this differs from runaway-parade's `within3P1At090`, which counts only the racers BEHIND P1.
- Lengths via the shared lap-aware path (`arcT × govLenScale`) — the same one every other observer uses.
- REAL P1 ACTION iff **all four**: distinctLeaders ≥ 3, leadChangeCount ≥ 3, maxLeadHoldShare ≤ 0.7, frontContestFraction ≥ 0.5. `p1LongestMultiSec` is reported but is NOT a criterion (a seconds quantity, its threshold would be track- and duration-dependent).

## STOP gate
✅ V0 reproduced the known runaway baseline exactly (luger-hill 18, mountainstreet 18, searound 30, dirt-oval 28).

## Headline
- **V0** — 5.3% of races contain a real, sustained P1 battle; in the median race the front is contested for 55% of the window and 1 distinct racers lead.
- **R97-ON** — 5.0% of races contain a real, sustained P1 battle; in the median race the front is contested for 73% of the window and 2 distinct racers lead.

**Delta R97-ON − V0 (what the current winner already contributes):** p1ContestRate -0.2 pp, median distinctLeaders +1.0, median leadChangeCount +1.0, median maxLeadHoldShare -0.143, median frontContestFraction +0.179, median p1LongestMultiSec +2.61.

## Overall, by V0-race class
`normal` = V0 was not a runaway. `runaway` = V0 was AND the arm still is. `converted` = V0 was, the arm is not. Classes are defined by V0 and applied unchanged to both arms, so each column is the same set of races in both. For V0 itself `converted` is empty by construction. Cells are median [p25–p75].

| arm | class | races | p1ContestRate | distinctLeaders | leadChangeCount | maxLeadHoldShare | frontContestFraction | p1LongestMultiSec |
|---|---|---|---|---|---|---|---|---|
| V0 | all | 400 | 5.3% | 1.0 [1.0–2.0] | 0.0 [0.0–1.0] | 1.000 [0.679–1.000] | 0.555 [0.020–1.000] | 7.87 [0.21–11.38] |
| V0 | normal | 306 | 6.9% | 2.0 [1.0–2.0] | 1.0 [0.0–2.0] | 0.882 [0.629–1.000] | 0.836 [0.407–1.000] | 10.54 [5.25–12.90] |
| V0 | runaway | 94 | 0.0% | 1.0 [1.0–1.0] | 0.0 [0.0–0.0] | 1.000 [1.000–1.000] | 0.000 [0.000–0.029] | 0.00 [0.00–0.30] |
| V0 | converted | 0 | – | – | – | – | – | – |
| R97-ON | all | 400 | 5.0% | 2.0 [1.0–2.0] | 1.0 [0.0–1.0] | 0.857 [0.638–1.000] | 0.734 [0.372–1.000] | 10.48 [4.96–11.94] |
| R97-ON | normal | 306 | 6.2% | 2.0 [1.0–2.0] | 1.0 [0.0–2.0] | 0.819 [0.621–1.000] | 0.869 [0.468–1.000] | 10.75 [6.75–13.25] |
| R97-ON | runaway | 31 | 0.0% | 1.0 [1.0–1.0] | 0.0 [0.0–0.0] | 1.000 [1.000–1.000] | 0.000 [0.000–0.138] | 0.00 [0.00–2.26] |
| R97-ON | converted | 63 | 1.6% | 2.0 [1.0–2.0] | 1.0 [0.0–1.0] | 0.844 [0.659–1.000] | 0.552 [0.356–0.804] | 8.98 [5.04–14.80] |

## Per track, by V0-race class

### luger-hill (open, luge)
| arm | class | races | p1ContestRate | distinctLeaders | leadChangeCount | maxLeadHoldShare | frontContestFraction | p1LongestMultiSec |
|---|---|---|---|---|---|---|---|---|
| V0 | all | 100 | 5.0% | 1.0 [1.0–2.0] | 0.0 [0.0–1.0] | 1.000 [0.693–1.000] | 0.930 [0.148–1.000] | 9.42 [1.44–11.04] |
| V0 | normal | 82 | 6.1% | 2.0 [1.0–2.0] | 1.0 [0.0–1.0] | 0.984 [0.672–1.000] | 1.000 [0.486–1.000] | 10.45 [4.59–11.10] |
| V0 | runaway | 18 | 0.0% | 1.0 [1.0–1.0] | 0.0 [0.0–0.0] | 1.000 [1.000–1.000] | 0.000 [0.000–0.117] | 0.00 [0.00–1.20] |
| V0 | converted | 0 | – | – | – | – | – | – |
| R97-ON | all | 100 | 6.0% | 1.0 [1.0–2.0] | 0.0 [0.0–1.0] | 1.000 [0.685–1.000] | 1.000 [0.372–1.000] | 10.42 [3.89–11.07] |
| R97-ON | normal | 82 | 7.3% | 2.0 [1.0–2.0] | 1.0 [0.0–1.0] | 0.906 [0.636–1.000] | 1.000 [0.604–1.000] | 10.56 [6.22–11.12] |
| R97-ON | runaway | 10 | 0.0% | 1.0 [1.0–1.0] | 0.0 [0.0–0.0] | 1.000 [1.000–1.000] | 0.138 [0.000–0.388] | 1.44 [0.00–2.75] |
| R97-ON | converted | 8 | 0.0% | 1.0 [1.0–2.0] | 0.0 [0.0–1.0] | 1.000 [0.960–1.000] | 0.359 [0.060–0.418] | 4.16 [0.72–5.01] |

### mountainstreet (open, boarder)
| arm | class | races | p1ContestRate | distinctLeaders | leadChangeCount | maxLeadHoldShare | frontContestFraction | p1LongestMultiSec |
|---|---|---|---|---|---|---|---|---|
| V0 | all | 100 | 10.0% | 2.0 [1.0–2.0] | 1.0 [0.0–1.0] | 0.970 [0.686–1.000] | 0.608 [0.136–1.000] | 5.66 [1.46–10.67] |
| V0 | normal | 82 | 12.2% | 2.0 [1.0–2.0] | 1.0 [0.0–2.0] | 0.888 [0.657–1.000] | 0.788 [0.286–1.000] | 7.54 [3.01–10.77] |
| V0 | runaway | 18 | 0.0% | 1.0 [1.0–1.0] | 0.0 [0.0–0.0] | 1.000 [1.000–1.000] | 0.000 [0.000–0.184] | 0.00 [0.00–1.98] |
| V0 | converted | 0 | – | – | – | – | – | – |
| R97-ON | all | 100 | 8.0% | 2.0 [1.0–3.0] | 1.0 [0.0–2.0] | 0.800 [0.615–1.000] | 0.757 [0.373–1.000] | 7.92 [3.98–10.90] |
| R97-ON | normal | 82 | 9.8% | 2.0 [2.0–3.0] | 1.0 [1.0–2.0] | 0.761 [0.594–0.975] | 0.825 [0.580–1.000] | 8.96 [4.67–10.90] |
| R97-ON | runaway | 5 | 0.0% | 1.0 [1.0–1.0] | 0.0 [0.0–0.0] | 1.000 [1.000–1.000] | 0.000 [0.000–0.000] | 0.00 [0.00–0.00] |
| R97-ON | converted | 13 | 0.0% | 2.0 [1.0–2.0] | 1.0 [0.0–1.0] | 0.846 [0.680–1.000] | 0.601 [0.354–1.000] | 5.01 [4.05–11.68] |

### searound (closed, manta)
| arm | class | races | p1ContestRate | distinctLeaders | leadChangeCount | maxLeadHoldShare | frontContestFraction | p1LongestMultiSec |
|---|---|---|---|---|---|---|---|---|
| V0 | all | 100 | 3.0% | 1.0 [1.0–2.0] | 0.0 [0.0–1.0] | 1.000 [0.666–1.000] | 0.390 [0.000–0.929] | 7.10 [0.00–16.86] |
| V0 | normal | 70 | 4.3% | 2.0 [1.0–2.0] | 1.0 [0.0–2.0] | 0.810 [0.600–1.000] | 0.709 [0.368–1.000] | 11.87 [6.29–17.79] |
| V0 | runaway | 30 | 0.0% | 1.0 [1.0–1.0] | 0.0 [0.0–0.0] | 1.000 [1.000–1.000] | 0.000 [0.000–0.000] | 0.00 [0.00–0.00] |
| V0 | converted | 0 | – | – | – | – | – | – |
| R97-ON | all | 100 | 3.0% | 2.0 [1.0–2.0] | 1.0 [0.0–1.0] | 0.897 [0.653–1.000] | 0.570 [0.238–0.882] | 9.23 [4.72–15.54] |
| R97-ON | normal | 70 | 4.3% | 2.0 [1.0–3.0] | 1.0 [0.0–2.0] | 0.822 [0.615–1.000] | 0.760 [0.384–1.000] | 12.72 [7.04–17.73] |
| R97-ON | runaway | 13 | 0.0% | 1.0 [1.0–1.0] | 0.0 [0.0–0.0] | 1.000 [1.000–1.000] | 0.000 [0.000–0.124] | 0.00 [0.00–2.26] |
| R97-ON | converted | 17 | 0.0% | 2.0 [1.0–2.0] | 1.0 [0.0–1.0] | 0.749 [0.675–1.000] | 0.382 [0.271–0.653] | 7.07 [5.09–11.63] |

### dirt-oval (closed, horse)
| arm | class | races | p1ContestRate | distinctLeaders | leadChangeCount | maxLeadHoldShare | frontContestFraction | p1LongestMultiSec |
|---|---|---|---|---|---|---|---|---|
| V0 | all | 100 | 3.0% | 1.0 [1.0–2.0] | 0.0 [0.0–1.0] | 1.000 [0.683–1.000] | 0.533 [0.047–1.000] | 11.10 [1.06–22.21] |
| V0 | normal | 72 | 4.2% | 2.0 [1.0–2.0] | 1.0 [0.0–1.0] | 0.885 [0.621–1.000] | 0.752 [0.468–1.000] | 17.07 [9.92–22.61] |
| V0 | runaway | 28 | 0.0% | 1.0 [1.0–1.0] | 0.0 [0.0–0.0] | 1.000 [1.000–1.000] | 0.000 [0.000–0.000] | 0.00 [0.00–0.00] |
| V0 | converted | 0 | – | – | – | – | – | – |
| R97-ON | all | 100 | 3.0% | 2.0 [1.0–2.0] | 1.0 [0.0–1.0] | 0.802 [0.631–1.000] | 0.753 [0.459–1.000] | 16.61 [9.44–22.77] |
| R97-ON | normal | 72 | 2.8% | 2.0 [1.0–2.0] | 1.0 [0.0–1.0] | 0.803 [0.679–1.000] | 0.760 [0.465–1.000] | 16.61 [9.58–22.77] |
| R97-ON | runaway | 3 | 0.0% | 1.0 [1.0–2.0] | 0.0 [0.0–1.0] | 1.000 [1.000–1.000] | 0.000 [0.000–0.442] | 0.00 [0.00–9.44] |
| R97-ON | converted | 25 | 4.0% | 2.0 [2.0–2.0] | 1.0 [1.0–1.0] | 0.762 [0.554–0.947] | 0.753 [0.525–0.955] | 17.78 [11.94–23.31] |

Data: `per-arm-track-class.csv` (aggregates), `races-<arm>-<track>.csv` (per-seed; determinism re-run target).
