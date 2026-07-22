# Carousel Sweep v3 — carousel x gap-reroll x role-bias x span lever

4 known tracks (default racer each), N=100 per arm, fixed baseline seeds 1–100 — identical seeds across every arm, so all deltas are paired. Scheduled rolls only. Build: carousel + role-biased dice + gap-reroll branch-priority fix, all default OFF; OFF fingerprint `72c3360fb75225ef` re-verified before the first arm. **Facts only — the decisions are the owner's.**

> **Reporting rule (binding).** `contestWindowStart` moves the MEASUREMENT window as well as the carousel schedule, so a carousel arm at 0.62 is **not** comparable to A1 at 0.80. Every carousel arm is read against its matching **window control**: **A6** (carousel OFF, window 0.62) for the 0.62 arms. A2b at 0.70 cast 0/400, so it is its own control.

## Arms
| arm | carousel | contestWindowStart | gap-reroll G | roleBias | control |
|---|---|---|---|---|---|
| A1-V0 | off | 0.80 | off | 0 | — |
| A0-GR | off | 0.80 | 1.5 | 0 | A1-V0 |
| A6-CTL-w62 | **off (control)** | 0.62 | off | 0 | A1-V0 |
| A2b-CAR-w70 | on (0% cast) | 0.70 | off | 0 | — |
| A2-CAR-w62 | on | 0.62 | off | 0 | A6-CTL-w62 |
| A3-CAR-GR | on | 0.62 | 1.5 | 0 | A6-CTL-w62 |
| A4-CAR-GR-RB | on | 0.62 | 1.5 | 1.0 | A6-CTL-w62 |
| A5-CAR-G075-RB | on | 0.62 | 0.75 | 1.0 | A6-CTL-w62 |

## Co-optimization table
| arm | p1Contest | **vs control** | runaway | parade | action | B1min | B2min | Holm | cast | completion | sat mean/max |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A1-V0 | 5.3% | — | 23.5% | 2.0% | 34.83 | 70.6% | 69.9% | 2/4 | 0.0% | – | – / – |
| A0-GR | 5.8% | +0.5pp vs A1-V0 | 7.5% | 2.0% | 35.07 | 69.2% | 68.8% | 2/4 | 0.0% | – | – / – |
| A6-CTL-w62 | 31.3% | +26.0pp vs A1-V0 | 23.5% | 2.0% | 34.83 | 70.6% | 69.9% | 2/4 | 0.0% | – | – / – |
| A2b-CAR-w70 | 18.0% | — | 22.5% | 1.5% | 34.42 | 70.6% | 69.5% | 2/4 | 0.0% | – | – / – |
| A2-CAR-w62 | 22.0% | -9.3pp vs A6-CTL-w62 | 21.8% | 2.0% | 30.38 | 72.2% | 70.0% | 3/4 | 55.5% | 29.3% | 15.7% / 57.5% |
| A3-CAR-GR | 28.0% | -3.3pp vs A6-CTL-w62 | 7.5% | 1.8% | 30.37 | 72.4% | 70.0% | 2/4 | 55.5% | 31.8% | 16.1% / 60.3% |
| A4-CAR-GR-RB | 30.5% | -0.8pp vs A6-CTL-w62 | 10.3% | 2.0% | 30.47 | 72.2% | 69.5% | 2/4 | 55.5% | 34.9% | 15.7% / 59.3% |
| A5-CAR-G075-RB | 44.3% | +13.0pp vs A6-CTL-w62 | 10.3% | 0.8% | 31.78 | 72.8% | 71.0% | 2/4 | 55.5% | 32.9% | 15.9% / 59.3% |

## Five primitives (median per arm)
| arm | distinctLeaders | leadChangeCount | maxLeadHoldShare | frontContestFraction | p1LongestMultiSec |
|---|---|---|---|---|---|
| A1-V0 | 1 | 0 | 1.000 | 0.555 | 7.87 |
| A0-GR | 2 | 1 | 0.858 | 0.734 | 10.45 |
| A6-CTL-w62 | 3 | 2 | 0.660 | 0.699 | 16.22 |
| A2b-CAR-w70 | 2 | 1 | 0.775 | 0.649 | 12.05 |
| A2-CAR-w62 | 3 | 2 | 0.694 | 0.574 | 13.31 |
| A3-CAR-GR | 3 | 2 | 0.634 | 0.668 | 15.15 |
| A4-CAR-GR-RB | 3 | 2 | 0.614 | 0.641 | 13.33 |
| A5-CAR-G075-RB | 3 | 3 | 0.565 | 0.708 | 14.72 |

## Mechanism over control — paired per seed
The spec's question 3 ("is the wall broken") is answered here, not in the table above.

| arm | control | arm p1 | control p1 | **delta** | seeds gained | seeds lost |
|---|---|---|---|---|---|---|
| A0-GR | A1-V0 | 5.8% | 5.3% | **+0.5pp** | 11 | 9 |
| A6-CTL-w62 | A1-V0 | 31.3% | 5.3% | **+26.0pp** | 106 | 2 |
| A2-CAR-w62 | A6-CTL-w62 | 22.0% | 31.3% | **-9.3pp** | 32 | 69 |
| A3-CAR-GR | A6-CTL-w62 | 28.0% | 31.3% | **-3.3pp** | 53 | 66 |
| A4-CAR-GR-RB | A6-CTL-w62 | 30.5% | 31.3% | **-0.8pp** | 56 | 59 |
| A5-CAR-G075-RB | A6-CTL-w62 | 44.3% | 31.3% | **+13.0pp** | 92 | 40 |

## Cast-seed vs no-cast-seed split, against the control
Resolves whether the carousel SUPPRESSES contest or merely selects unusual races: for each carousel arm, the same seed sets are read in the control.

| arm | subset | n | arm p1 | control p1 | delta |
|---|---|---|---|---|---|
| A2-CAR-w62 | cast | 222 | 16.7% | 33.8% | **-17.1pp** |
| A2-CAR-w62 | not cast | 178 | 28.7% | 28.1% | **+0.6pp** |
| A3-CAR-GR | cast | 222 | 22.5% | 33.8% | **-11.3pp** |
| A3-CAR-GR | not cast | 178 | 34.8% | 28.1% | **+6.7pp** |
| A4-CAR-GR-RB | cast | 222 | 27.0% | 33.8% | **-6.8pp** |
| A4-CAR-GR-RB | not cast | 178 | 34.8% | 28.1% | **+6.7pp** |
| A5-CAR-G075-RB | cast | 222 | 38.3% | 33.8% | **+4.5pp** |
| A5-CAR-G075-RB | not cast | 178 | 51.7% | 28.1% | **+23.6pp** |

## Casting and tear location
| arm | cast rate | dominant no-cast reasons | authored→completed | first-tear histogram |
|---|---|---|---|---|
| A1-V0 | 0.0% | – | – | – |
| A0-GR | 0.0% | – | – | – |
| A6-CTL-w62 | 0.0% | – | – | – |
| A2b-CAR-w70 | 0.0% | window-too-short-for-rotation 400 | – | – |
| A2-CAR-w62 | 55.5% | lead-in-too-steep 174, rotation-torn-by-feasibility 4 | 130/444 (29.3%) | seg1: 152, seg2: 62 |
| A3-CAR-GR | 55.5% | lead-in-too-steep 174, rotation-torn-by-feasibility 4 | 141/444 (31.8%) | seg1: 151, seg2: 62 |
| A4-CAR-GR-RB | 55.5% | lead-in-too-steep 174, rotation-torn-by-feasibility 4 | 155/444 (34.9%) | seg1: 140, seg2: 70 |
| A5-CAR-G075-RB | 55.5% | lead-in-too-steep 174, rotation-torn-by-feasibility 4 | 146/444 (32.9%) | seg1: 138, seg2: 73 |

## Per-track p1ContestRate
| arm | luger-hill | mountainstreet | searound | dirt-oval |
|---|---|---|---|---|
| A1-V0 | 5.0% | 10.0% | 3.0% | 3.0% |
| A0-GR | 6.0% | 8.0% | 4.0% | 5.0% |
| A6-CTL-w62 | 32.0% | 35.0% | 21.0% | 37.0% |
| A2b-CAR-w70 | 22.0% | 19.0% | 17.0% | 14.0% |
| A2-CAR-w62 | 24.0% | 28.0% | 17.0% | 19.0% |
| A3-CAR-GR | 24.0% | 35.0% | 23.0% | 30.0% |
| A4-CAR-GR-RB | 25.0% | 34.0% | 25.0% | 38.0% |
| A5-CAR-G075-RB | 37.0% | 47.0% | 41.0% | 52.0% |

## Five strongest REAL-P1-ACTION seeds per arm (for the later browser eye-test)
Ranked by leadChangeCount, then distinctLeaders, then frontContestFraction, among races classified REAL P1 ACTION. The browser is not wired this step; these are recorded for when it is.

| arm | track:seed (leadChanges / distinct / frontContest) |
|---|---|
| A1-V0 | dirt-oval:64 (9/3/1.00), mountainstreet:90 (5/4/1.00), luger-hill:59 (4/4/1.00), mountainstreet:19 (4/4/1.00), mountainstreet:49 (4/4/1.00) |
| A0-GR | dirt-oval:45 (5/3/1.00), dirt-oval:87 (5/3/1.00), dirt-oval:13 (4/5/1.00), luger-hill:59 (4/4/1.00), luger-hill:70 (4/4/1.00) |
| A6-CTL-w62 | mountainstreet:56 (12/8/1.00), dirt-oval:64 (11/4/1.00), dirt-oval:40 (10/5/1.00), mountainstreet:67 (9/8/0.70), mountainstreet:83 (9/5/1.00) |
| A2b-CAR-w70 | dirt-oval:9 (17/6/1.00), luger-hill:70 (8/6/1.00), mountainstreet:56 (8/6/1.00), dirt-oval:74 (8/3/1.00), dirt-oval:32 (7/5/0.84) |
| A2-CAR-w62 | dirt-oval:9 (17/6/1.00), dirt-oval:40 (10/5/1.00), dirt-oval:54 (10/5/1.00), mountainstreet:67 (9/8/0.70), mountainstreet:56 (9/7/1.00) |
| A3-CAR-GR | dirt-oval:9 (12/6/1.00), mountainstreet:56 (10/7/1.00), dirt-oval:40 (10/5/1.00), dirt-oval:54 (10/5/0.99), mountainstreet:67 (9/7/1.00) |
| A4-CAR-GR-RB | dirt-oval:9 (12/6/1.00), mountainstreet:56 (10/7/1.00), dirt-oval:40 (10/5/1.00), mountainstreet:67 (9/7/1.00), mountainstreet:83 (9/5/1.00) |
| A5-CAR-G075-RB | dirt-oval:9 (14/7/0.97), mountainstreet:67 (10/8/1.00), mountainstreet:83 (9/5/1.00), dirt-oval:54 (9/5/1.00), dirt-oval:3 (8/6/0.87) |

