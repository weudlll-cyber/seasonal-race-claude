# Runaway Speed-Source Diagnostic — WHERE does the leader's late overspeed come from?

Read-only, unmodified baseline (all gap-servo config absent, shipped defaults). All 4 tracks, **N=100 per track**, seed=1 (same seeds as the f40a7a6 baseline). Top-15 live ranks decomposed at samples 0.70/0.75/0.80/0.85/0.90/0.95.
Consistency gate PASSED (runaway = baseline). Cross-check PASSED: on all 36000 non-finish-clamped records, effSpeed == product of the recorded factors (within 1e-9) — the decomposition is complete, no factor missed.

**Speed chain (from `raceStep.js advanceRacerT`):** `effSpeed = baseSpeed · boost · brake · rowEnvMult · trajectoryMult · areaBonusMult · governorMult` (× dt), then a FINISH clamp only. `rowEnvMult` = rowBonusPost; `areaBonusMult` = areaBonusPost. baseSpeed = const · **spreadFactor** · speedBonusMult. There is **no single pre-finish speed clamp** — each factor is clamped at its own source (trajectoryMult∈[0.85,1.10]; spreadFactor∈natural band ≤ ~1.081; governorMult∈pulk envelope).

## Headline
Among runaway races, the largest P1-vs-chaser speed-delta source in [0.70, 0.95] is **spreadFactor** (median P1 1.080101 vs P2–P15 1.030700, ratio 1.0479). P1's median trajectoryMult is **0.952** — BELOW 1.0, i.e. the servo is BRAKING the leader, not boosting it; P1 runs servo-clamped (traj ≥ maxMult) in 0.0% of samples. So the escape speed is the leader's NATURAL re-roll draw, not the servo or areaBonus.

## Component decomposition — P1 vs P2–P15 median (variable factors, window [0.70,0.95])
### RUNAWAY races
| factor | P1 median | P2–P15 median | ratio | delta |
|---|---|---|---|---|
| spreadFactor | 1.080101 | 1.030700 | 1.0479 | +0.049401 |
| speedBonusMult | 1.006045 | 1.006045 | 1.0000 | +0.000000 |
| boost | 1.000000 | 1.000000 | 1.0000 | +0.000000 |
| brake | 1.000000 | 1.000000 | 1.0000 | +0.000000 |
| rowEnvMult | 1.000000 | 1.000000 | 1.0000 | +0.000000 |
| trajectoryMult | 0.951742 | 0.937551 | 1.0151 | +0.014191 |
| areaBonusMult | 1.000000 | 1.000000 | 1.0000 | +0.000000 |
| governorMult | 1.000000 | 1.000000 | 1.0000 | +0.000000 |

### NON-RUNAWAY races
| factor | P1 median | P2–P15 median | ratio | delta |
|---|---|---|---|---|
| spreadFactor | 1.066455 | 1.034590 | 1.0308 | +0.031865 |
| speedBonusMult | 1.005515 | 1.005515 | 1.0000 | +0.000000 |
| boost | 1.000000 | 1.000000 | 1.0000 | +0.000000 |
| brake | 1.000000 | 1.000000 | 1.0000 | +0.000000 |
| rowEnvMult | 1.000000 | 1.000000 | 1.0000 | +0.000000 |
| trajectoryMult | 0.950187 | 0.950200 | 1.0000 | -0.000013 |
| areaBonusMult | 1.000000 | 1.000000 | 1.0000 | +0.000000 |
| governorMult | 1.000000 | 1.000000 | 1.0000 | +0.000000 |

## Clamp saturation + headroom per position — RUNAWAY races
`satShare` = fraction of samples with trajectoryMult pinned at the servo ceiling (1.10). `servoHead` = median (maxMult − traj) — how much MORE the servo could add. `bandHead` = median (natCeil − spreadFactor) — natural-speed headroom.
| pos | n | satShare | servoHead | bandHead | median effSpeed |
|---|---|---|---|---|---|
| P1 | 564 | 0.0% | 0.148 | 0.001258 | 0.000287 |
| P2 | 564 | 0.0% | 0.174 | 0.021524 | 0.000264 |
| P3 | 564 | 0.0% | 0.153 | 0.036891 | 0.000262 |
| P4 | 564 | 1.6% | 0.225 | 0.036791 | 0.000261 |
| P5 | 564 | 3.5% | 0.179 | 0.029661 | 0.000262 |
| P6 | 564 | 4.6% | 0.150 | 0.047516 | 0.000260 |
| P7 | 564 | 7.4% | 0.126 | 0.071425 | 0.000260 |
| P8 | 564 | 9.0% | 0.149 | 0.072362 | 0.000262 |
| P9 | 564 | 13.5% | 0.151 | 0.059954 | 0.000262 |
| P10 | 564 | 11.7% | 0.141 | 0.062185 | 0.000262 |
| P11 | 564 | 15.1% | 0.150 | 0.066919 | 0.000266 |
| P12 | 564 | 13.8% | 0.172 | 0.059048 | 0.000260 |
| P13 | 564 | 12.4% | 0.177 | 0.053745 | 0.000265 |
| P14 | 564 | 10.5% | 0.225 | 0.041180 | 0.000261 |
| P15 | 564 | 12.4% | 0.194 | 0.043563 | 0.000261 |

*(Fight potential: a chaser with large `servoHead` AND `bandHead` COULD be sped up to close the gap; a leader already at low headroom cannot pull much further away.)*

## Gap structure at 0.90 — median consecutive gap (lengths) + how many sit within 3.0L of P1
| pos gap | P1→P2 | P2→P3 | P3→P4 | P4→P5 | P5→P6 | P6→P7 | P7→P8 | P8→P9 | P9→P10 | P10→P11 | P11→P12 | P12→P13 | P13→P14 | P14→P15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RUNAWAY | 4.921 | 0.923 | 0.542 | 0.235 | 0.218 | 0.240 | 0.232 | 0.227 | 0.366 | 0.381 | 0.371 | 0.306 | 0.236 | 0.237 |
| non-runaway | 1.194 | 0.956 | 0.754 | 0.295 | 0.238 | 0.360 | 0.275 | 0.264 | 0.281 | 0.379 | 0.350 | 0.362 | 0.257 | 0.239 |

Racers within 3.0L of P1 at 0.90 (of P2..P15): RUNAWAY median **0** (mean 0.00, n=94); non-runaway median 2 (mean 3.23, n=306).

Raw per-(race×sample×position) rows: `speed-source-<track>.csv`.
