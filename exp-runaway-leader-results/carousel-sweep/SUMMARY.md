# Carousel Sweep v3 — SUMMARY

8 arms x 4 known tracks x N=100, fixed baseline seeds 1–100, identical seeds across every arm (all
deltas paired). Build `45e774b` + sweep harness; OFF fingerprint `72c3360fb75225ef` re-verified before
the first arm. A1 STOP gate PASSED — reproduced the committed baseline exactly on **both** metrics
(runaway 18/18/30/28, p1Contest 5/10/3/3). Facts only; the decisions are the owner's.

---

## The finding that governs every other number

`contestWindowStart` moves the **measurement window** as well as the carousel schedule. Two arms
prove it independently, and both were run with the carousel provably inert:

| arm | window | carousel cast | p1Contest |
|---|---|---|---|
| A1-V0 | 0.80 | – | **5.3%** |
| A2b | 0.70 | **0 / 400** | **18.0%** |
| A6-CTL | 0.62 | **0 / 400** (control) | **31.3%** |

**Moving the window from 0.80 to 0.62 is worth +26.0pp of `p1ContestRate` with no mechanism running
at all** (106 seeds gained, 2 lost). The classifier counts `distinctLeaders >= 3` and
`leadChangeCount >= 3` as absolute totals over the window, so a wider window inflates them
mechanically.

A6 is a clean control by construction: its runaway (23.5%), top-5 action (34.83), B1min (70.6%),
B2min (69.9%) and Holm (2/4) are **identical to A1 to the digit** — none of those are windowed
metrics — so A6 differs from A1 in the contest measurement window and in nothing else.

Consequently **no carousel arm is compared against A1 anywhere below.** The 0.62 arms are read against
A6; A2b is its own 0.70 control.

---

## 1. Did the branch-priority fix move the gap-reroll numbers?

**No — within noise, and directionally favourable. The committed 10-track headline stands
provisionally.**

A0 re-ran the confirmed setting (symmetric, G=1.5, s=1.0) on the same seeds, post-fix, against the
committed pre-fix run:

| track | runaway pre → post | per-seed flips | p1Contest pre → post |
|---|---|---|---|
| luger-hill | 10 → 10 | 0 | 6 → 6 |
| mountainstreet | 6 → 5 | 1 | 8 → 8 |
| searound | 14 → 13 | 3 | 3 → 4 |
| dirt-oval | 3 → 2 | 1 | 3 → 5 |
| **overall** | **8.3% → 7.5%** | **5 / 400 (1.25%)** | **5.0% → 5.8%** |

−3 races is **0.55 sd** on a binomial with sd 5.5. Every one of the five flipped seeds moved *away*
from runaway, which is the direction the fix predicts (it stops braking chasers that broke from the
pack). No full 10-track re-measurement needs scheduling before a default-ON decision.

**Caveat to carry:** this is a clean paired test of *the fix's effect* on 4 tracks. It is not a
re-measurement of the 10-track 8.3% headline — the other 6 tracks are untested post-fix. Quote the
headline with that qualifier.

**A0 is also the runaway reference for every GR-bearing arm below: 7.5%, not the pre-fix 8.3%.**

## 2. Window: is 0.70 viable, and which window do the combination arms use?

**0.70 is NOT viable: cast 0 / 400, `window-too-short-for-rotation` on every single race** — unanimous,
no partial casting anywhere. Reported as non-viable rather than substituted, per the spec.

The combination arms therefore run at **0.62**, where casting reaches 55.5%. A2b did not beat A2 on
either casting (0% vs 55.5%) or completion (n/a vs 29.3%), so the spec's condition for moving the
later arms to 0.70 was not met.

A2b's failure is itself informative: at 0.70 the window `[0.70, releaseProgress − 0.07]` is
0.20 progress wide, and a full 3-way rotation at the feasibility-derived climb span does not fit. The
viable band is narrow — the build smoke found 0.66 already too short, and 0.62 works.

## 3. Is the wall broken?

**Yes — but not by the carousel. The carousel is net-negative against its own window control in
3 of 4 arms, and a drag even in the arm that wins.**

Mechanism over control, paired per seed:

| arm | vs control | seeds gained | seeds lost |
|---|---|---|---|
| A2 carousel alone | **−9.3pp** | 32 | 69 |
| A3 + gap-reroll G=1.5 | **−3.3pp** | 53 | 66 |
| A4 + role-bias | **−0.8pp** | 56 | 59 |
| A5 + span lever G=0.75 | **+13.0pp** | 92 | 40 |

The cast / no-cast split settles the A2 inversion I flagged mid-sweep as unresolved. Within each arm,
the same seed sets are read in the control:

| arm | cast races (n=222) | no-cast races (n=178) |
|---|---|---|
| A2 | **−17.1pp** | +0.6pp |
| A3 | **−11.3pp** | +6.7pp |
| A4 | **−6.8pp** | +6.7pp |
| A5 | **+4.5pp** | **+23.6pp** |

**It is suppression, not selection.** In every arm, the races where the carousel fired did worse than
the races where it did not — and the no-cast races track the control almost exactly in A2 (+0.6pp),
which is what an inert mechanism should do. Even in A5, the carousel's races gain 4.5pp while the
races it skipped gain 23.6pp: the span lever is doing the work and the carousel is costing ~19pp of it.

The second, independent line of evidence is **top-5 action**, which is measured over OUTCOME and is
*not* windowed, so it cannot be confounded:

| arm | action | vs A1 |
|---|---|---|
| A1-V0 / A6-CTL | 34.83 / 34.83 | — |
| A2b (0% cast) | 34.42 | −0.41 |
| A2 / A3 / A4 (55.5% cast) | 30.38 / 30.37 / 30.47 | **≈ −4.4** |
| A5 (55.5% cast) | 31.78 | **−3.05** |

Every arm where the carousel actually cast loses ~13% of top-5 action; the arms where it did not cast
lose nothing. **On this metric the carousel arms fail the `action Δ >= 0` gate outright.**

The mechanism reading is consistent across all of it: the carousel steers three participants into
authored slots at strictness 1.0 and *holds* them between handovers. Authored slot-holding produces
fewer lead changes than leaving three close racers to fight — which is the same rank-pinning that
created the 93% `leadChangeCount` wall in the first place.

Completion supports this: **only 29–35% of authored handovers are ever dwell-confirmed**, and the
tear location shows why — of ~214 torn rotations per arm, **~140–152 die at the FIRST handover**, the
rest at the second. The rotation rarely survives its opening exchange, so what mostly reaches the
track is the pinning, not the handovers.

## 4. Role-bias contribution and span-lever effect

Isolated against the shared control, each lever changes exactly one thing from the arm above it:

| step | lever | delta vs control |
|---|---|---|
| A2 → A3 | + gap-reroll G=1.5 | **+6.0pp** |
| A3 → A4 | + role-biased dice | **+2.5pp** |
| A4 → A5 | G 1.5 → 0.75 (span lever) | **+13.8pp** |

**Role-bias adds a real but small +2.5pp**, and it is the only lever that measurably improves the
carousel's own machinery: cast rate is identical (55.5% — casting is decided before the race, so it
cannot change it) while completion rises 31.8% → 34.9%. It costs runaway: 7.5% → 10.3%.

**The span lever is the only thing that clears the cliff: +13.8pp, the largest single effect in the
sweep.** It does so by tightening the front — median rank1→3 span falls to 2.63 L in A5 against 3.01 L
in A4 — which is exactly the cliff variable the handover re-analysis predicted (93% → 28% → 2% at
spans of 1.5 / 2.0 / 2.5 L). The prediction that span governs the outcome is confirmed; the prediction
that the *carousel* would exploit it is not.

## 5. Best arm and its binding blocker

**Best arm: A5-CAR-G075-RB** — the only arm that beats its window control (+13.0pp), highest absolute
`p1Contest` (44.3%), best front-tightness (2.63 L), lowest parade (0.8%), and saturation comfortably
inside the gate (15.9% mean; 4 races above 50% across 400).

**It is blocked, and not by one thing:**

| gate | A5 | reference | verdict |
|---|---|---|---|
| p1Contest vs owner target | 44.3% | 60% | below |
| runaway | **10.3%** | A0 post-fix **7.5%** | **FAIL** |
| top-5 action Δ | **−3.05** | ≥ 0 vs A1 | **FAIL** |
| parade | 0.8% | ≤ 2% | pass |
| servo saturation | 15.9% mean | ≤ 50% | pass |
| B1min / B2min | 72.8% / 71.0% | ≥ 70% | pass (N=100 underpowered) |
| Holm | 2/4 | secondary | — |

**The single binding blocker, stated as the data supports it: the carousel itself.** Both failing
gates trace to the mechanism rather than to the levers around it — the action loss appears only in
arms where the carousel casts, and the runaway rise arrives with role-bias, which exists only to serve
the carousel. A5's entire gain over control comes from levers that do not require the carousel to be
running, while the carousel subtracts ~19pp from that gain in the races where it fires.

The measurement this observation implies — **G=0.75 at window 0.62 with the carousel OFF** — was not
in the arm list and was not run. It is the one arm that would confirm or refute the reading above,
and it is a single ~22-minute arm on the existing harness (`--arms=` selector, same seeds).

## Band-reach note

N=100 per track is underpowered for the band gates, so deltas are primary and no pass/fail is declared
on single-track edges. All arms sit in a narrow 69–73% B1min band; A0 is the lowest at 69.2%. Pooled
~300/track remains reserved for gate decisions.

---

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

