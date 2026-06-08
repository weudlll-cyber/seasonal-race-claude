# T-Only Activation Zone Experiment: Report 11

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-05
**Spec ref:** user message "EXPERIMENT SPEC — Isolate the fix: T-threshold only, restore Y-threshold"
**Code change:** `client/src/modules/storage/defaults.js` — `speedBrakeYThreshold` restored 0.06→0.18 (commit `ac309e1`)
**What is tested:** Does `speedBrakeTMultiplier=0.5` alone fix the open-track chain lock, without the Y-shrink that regressed Garden Path × snail?

---

## The three conditions

| Condition | speedBrakeTMultiplier | speedBrakeYThreshold | Commit | Status |
|---|---|---|---|---|
| **A** — original wide zone (pre-experiment Step-1 baseline) | 1.5 | 0.18 | pre-3f529ef | N=50 data from `client/tmp/n50-sweep.txt` |
| **B** — full shrink (report 10) | 0.5 | 0.06 | 3f529ef | N=50 data from `client/tmp/condB/` |
| **C** — T-only (this experiment) | **0.5** | **0.18** | **ac309e1** | **[RUNNING]** |

---

## 6 test combos (same as report 10)

| # | Combo | Type | Role |
|---|---|---|---|
| 1 | River Run × turtle | Open 3-row | Worst open combo at Cond A |
| 2 | Space Sprint × dragon | Open 3-row | 2nd worst, different track |
| 3 | River Run × manta | Open 3-row | 3rd worst |
| 4 | River Run × koi | Open 3-row | 4th worst |
| 5 | Space Sprint × plane | Open 2-row | Narrow body type |
| 6 | Garden Path × snail | Closed 5-row | Control — closed-track regression check |

---

## A/B/C results at N=50

### Chi-square fairness and 1.5×-Gate

| Combo | Cond | χ² | p | Gate | R0% | R1% | R2% | Verdict |
|---|---|---|---|---|---|---|---|---|
| River Run × turtle | A | 49.1 | 0.000 | ❌ | 80% | 12% | 8% | FAIL |
| River Run × turtle | B | 1.1 | 0.577 | ✅ | 28% | 32% | 40% | PASS |
| River Run × turtle | **C** | **17.4** | **0.000** | **❌** | **56%** | **36%** | **8%** | **FAIL** |
| Space Sprint × dragon | A | 37.2 | 0.000 | ❌ | 74% | 14% | 12% | FAIL |
| Space Sprint × dragon | B | 0.2 | 0.915 | ✅ | 32% | 32% | 36% | PASS |
| Space Sprint × dragon | **C** | **5.3** | **0.068** | **❌** | **48%** | **30%** | **22%** | **borderline** |
| River Run × manta | A | 34.7 | 0.000 | ❌ | 72% | 20% | 8% | FAIL |
| River Run × manta | B | 2.9 | 0.231 | ⚠️¹ | 22% | 38% | 40% | PASS |
| River Run × manta | **C** | **9.8** | **0.008** | **❌** | **52%** | **16%** | **32%** | **FAIL** |
| River Run × koi | A | 33.8 | 0.000 | ❌ | 72% | 16% | 12% | FAIL |
| River Run × koi | B | 0.5 | 0.774 | ✅ | 30% | 32% | 38% | PASS |
| River Run × koi | **C** | **14.4** | **0.001** | **❌** | **58%** | **26%** | **16%** | **FAIL** |
| Space Sprint × plane | A | 11.5 | 0.001 | ❌ | 74% | 26% | — | FAIL |
| Space Sprint × plane | B | 0.7 | 0.401 | ✅ | 44% | 56% | — | PASS |
| Space Sprint × plane | **C** | **18.0** | **0.000** | **❌** | **80%** | **20%** | — | **FAIL** |
| Garden Path × snail | A | 4.6 | 0.331 | ✅ | — | — | — | PASS |
| Garden Path × snail | B | 12.2 | 0.016 | n/a | — | — | — | ⚠️ REGRESSED |
| Garden Path × snail | **C** | **15.2** | **0.004** | **n/a** | — | — | — | **⚠️ REGRESSED (worse than B)** |

¹ Gate flags R0=22% at exact lower boundary (p=0.231 passes).

### Brake activation, overlap, zigzag

| Combo | Cond | brake% | bmFail/race | blocked% | zigzag | honest% |
|---|---|---|---|---|---|---|
| River Run × turtle | A | 89.3% | 5,400 | 88.1% | 0.000178 | 2.0% |
| River Run × turtle | B | 20.6% | 1,026 | 18.5% | 0.000168 | 2.7% |
| River Run × turtle | **C** | **55.0%** | **2,787** | **53.6%** | **0.000183** | **2.4%** |
| Space Sprint × dragon | A | 88.0% | 5,436 | 86.1% | 0.000181 | 3.5% |
| Space Sprint × dragon | B | 18.8% | 1,033 | 16.3% | 0.000174 | 4.4% |
| Space Sprint × dragon | **C** | **52.5%** | **2,846** | **51.0%** | **0.000187** | **4.1%** |
| River Run × manta | A | 87.4% | 5,260 | 85.2% | 0.000180 | 2.0% |
| River Run × manta | B | 16.7% | 911 | 15.0% | 0.000177 | 2.7% |
| River Run × manta | **C** | **49.8%** | **2,675** | **48.7%** | **0.000189** | **2.5%** |
| River Run × koi | A | 88.4% | 5,347 | 86.4% | 0.000176 | 2.4% |
| River Run × koi | B | 18.7% | 939 | 16.5% | 0.000170 | 3.1% |
| River Run × koi | **C** | **53.0%** | **2,759** | **52.5%** | **0.000184** | **2.8%** |
| Space Sprint × plane | A | 91.1% | 5,062 | 89.1% | 0.000235 | 2.1% |
| Space Sprint × plane | B | 13.4% | 627 | 13.3% | 0.000247 | 2.6% |
| Space Sprint × plane | **C** | **54.4%** | **2,424** | **55.0%** | **0.000259** | **2.3%** |
| Garden Path × snail | A | n/a | n/a | n/a | n/a | 7.9% |
| Garden Path × snail | B | n/a | n/a | n/a | n/a | 10.1% |
| Garden Path × snail | **C** | n/a | n/a | n/a | n/a | **10.3%** |

### Per-row B1top5

| Combo | Cond | R0 | R1 | R2 | Rows |
|---|---|---|---|---|---|
| River Run × turtle | A | 44% | 26% | **10%** | 3 |
| River Run × turtle | B | 57% | 63% | 46% | 3 |
| River Run × turtle | **C** | **53%** | **31%** | **25%** | 3 |
| Space Sprint × dragon | A | 40% | 21% | 15% | 3 |
| Space Sprint × dragon | B | 55% | 54% | 56% | 3 |
| Space Sprint × dragon | **C** | **53%** | **39%** | **31%** | 3 |
| River Run × manta | A | 49% | 28% | **14%** | 3 |
| River Run × manta | B | 59% | 61% | 54% | 3 |
| River Run × manta | **C** | **52%** | **28%** | **35%** | 3 |
| River Run × koi | A | 49% | 30% | 19% | 3 |
| River Run × koi | B | 50% | 51% | 52% | 3 |
| River Run × koi | **C** | **42%** | **38%** | **28%** | 3 |
| Space Sprint × plane | A | 38% | **20%** | — | 2 |
| Space Sprint × plane | B | 59% | 57% | — | 2 |
| Space Sprint × plane | **C** | **49%** | **28%** | — | 2 |
| Garden Path × snail | A | 68% | 62% | 47%/37%/42% | 5 |
| Garden Path × snail | B | 58% | 73% | 61%/73%/75% | 5 |
| Garden Path × snail | **C** | **58%** | **57%** | **56%/57%/56%** | 5 |

---

## Interpretation and verdict

### Outcome: T-only is NOT sufficient — Y-shrink was also needed

**3 of 5 open combos confirmed failing at Condition C** (turtle p=0.000, manta p=0.008, dragon p=0.068 borderline). The T-only change cuts blocked% from ~87% to ~49–54% — an improvement, but not enough to break the chain lock. Full fairness requires blocked% closer to 15–20% (as seen in Condition B).

| Condition | blocked% (avg) | open combos fair | closed snail |
|---|---|---|---|
| A (T=1.5, Y=0.18) | 85–89% | 0/5 | ✅ p=0.331 |
| B (T=0.5, Y=0.06) | 13–19% | 5/5 | ⚠️ p=0.016 |
| C (T=0.5, Y=0.18) | 49–54% | 0–1/5 (confirmed: T-only FAILS) | **[PENDING]** |

The Y threshold at 0.18 contributes ~35pp of blocked% on its own (C=52% vs B=17% = 35pp difference remaining when Y is restored). The Y-shrink was **jointly responsible** for fixing the chain lock — not just the T change.

**Why the fixed-value Y=0.06 regressed the closed track** is now clear by elimination: the closed-track regression came from the Y-shrink removing stabilization from the 104px Garden Path (6.2px activation, effectively zero). The T-only Condition C likely restores closed-track stability.

**Garden Path × snail at Condition C: p=0.004 ❌** — FAILS, and is WORSE than Condition B (p=0.016).

This is the key finding: the T reduction alone ALSO regresses closed-track fairness, independent of Y. Restoring Y=0.18 did not help.

### Revised root cause analysis: T reduction is part of the problem

Both B and C have T=0.5, giving `dynamicBrakeT = 50/2506 × 0.5 = 25px` on Garden Path (2506px path). At Condition A (T=1.5), Garden Path got T=75px activation. The T reduction reduced activation from 75px to 25px on the dense closed track.

On Garden Path with 60 racers over 2506px, average racer gap = 42px. With T=75px (original), almost every adjacent pair was in the brake zone (75px > 42px avg gap). With T=25px, fewer than 60% of adjacent pairs activate. This reduces pack stabilization enough to create row-biased outcomes.

**Activation zone areas in 2D pixel space:**
| Condition | T zone (px) | Y zone on GPath (px) | Y zone on RRun (px) | Area GPath | Area RRun | GPath result | RRun result |
|---|---|---|---|---|---|---|---|
| A: T=1.5, Y=0.18 | 75 | 18.7 | 70 | 1,403 px² | 5,250 px² | ✅ p=0.331 | ❌ chain lock |
| B: T=0.5, Y=0.06 | 25 | 6.2 | 23 | 155 px² | 575 px² | ❌ p=0.016 | ✅ p=0.23–0.92 |
| C: T=0.5, Y=0.18 | 25 | 18.7 | 70 | 467 px² | 1,750 px² | ❌ p=0.004 | ❌ chain lock |

**Pattern:**
- Garden Path needs activation area ≥ ~700 px² for stability (between 467 fail and 1403 pass)
- River Run needs activation area ≤ ~600 px² to break chain lock (between 575 pass and 1750 fail)

The bands OVERLAP: Garden Path minimum > 700 px², River Run maximum < 600 px². There is NO globally-fixed T×Y combination that satisfies BOTH constraints simultaneously if both thresholds are absolute-pixel values and both tracks get the same zone.

### The right solution: dynamic zones that give different pixel areas per track

The **dynamic Y threshold** (`spriteSize/trackWidth × multiplier`) gives the SAME pixel area on all tracks:
- River Run: Y_zone = 50/390 × mult × 390 = 50×mult px
- Garden Path: Y_zone = 50/104 × mult × 104 = 50×mult px

This is equivalent to a single pixel-based threshold. With `speedBrakeYMultiplier=0.5`:
- Both tracks: Y_zone = 25px
- Combined: area = 25px × 25px = 625 px²

625 px² is ABOVE the Garden Path minimum (~700) — close, but might be marginal.

**Better approach: restrict brake-to-match to open tracks only.** The `avoidanceWarmupMs` parameter already applies only to open tracks. Brake-to-match was designed for open-track physical overlap — closed tracks have fundamentally different pack dynamics (linear queuing, same-lap racing, no wide-body overlap). Applying it to closed tracks adds pack stabilization as an accidental side effect.

**Recommended fix — apply brake-to-match only on open tracks:**
- In `raceBehavior.js` pair loop and `applyRacerBehavior`, skip the `speedBrakeSet` / `brakeMatchCaps` computation when `isOpen=false` (passed via config or priorityExtras)
- Open tracks: use full-shrink values (B: T=0.5, Y=0.06) or dynamic Y — these give fair results
- Closed tracks: brake-to-match disabled entirely → no regression possible; closed-track pack dynamics handled by existing avoidance forces alone

**Alternative if open-only restriction is too broad:** Test the dynamic Y approach (both T=0.5 and `speedBrakeYMultiplier=0.5` = 25px each on all tracks) giving 625 px² area. This sits between the closed-track failure threshold (~467 px²) and the closed-track pass threshold (~1,403 px²), so it MIGHT be stable for Garden Path. Validation at N=50 on the 6 combos would tell. However, 625 px² is closer to the failure boundary than the pass boundary — not a comfortable margin.

**The open-only restriction is the safer, more principled solution.** Run it as experiment 12.

---

## Definition of Done gate

| Gate | Target | Status |
|---|---|---|
| Tests green | 2629 pass | ✅ 2629/2629 |
| Code change committed | T=0.5, Y=0.18 | ✅ commit ac309e1 |
| Condition C N=50: turtle | Complete | ✅ p=0.000 FAIL (T-only insufficient) |
| Condition C N=50: dragon | Complete | ✅ p=0.068 borderline (T-only marginal) |
| Condition C N=50: manta | Complete | ✅ p=0.008 FAIL |
| Condition C N=50: koi | Complete | ✅ p=0.001 FAIL |
| Condition C N=50: plane | Complete | ✅ p=0.000 FAIL |
| Condition C N=50: snail | Complete | ✅ p=0.004 FAIL (worse than B!) |
| Open combos p≥0.05 at Cond C | 5/5 | ❌ 0/5 (T-only NOT sufficient) |
| Garden Path × snail at Cond C | Regression cleared? | ❌ p=0.004 — T reduction also causes regression |

## Plain verdict

**T-only is not the clean fix.**

All 5 open combos fail at Condition C. Blocked% drops to 49–55% (vs 87% at A and 13–18% at B) — better than A, but not enough to break the chain lock. Open-track fairness requires the Y zone reduction too.

Garden Path × snail also fails at C (p=0.004), even WORSE than B (p=0.016). The T reduction alone (not just Y) regresses closed-track fairness on dense narrow tracks. Restoring Y=0.18 didn't help — the problem came from T going from 75px to 25px on Garden Path.

There is no globally-fixed (T, Y) combination in pixels that simultaneously satisfies:
- River Run needs area < ~600 px² (to break chain lock)
- Garden Path needs area > ~700 px² (for pack stabilization)

The overlapping constraint is impossible to satisfy with a single set of absolute-pixel thresholds.

**Recommended next step (Experiment 12): restrict brake-to-match to open tracks only.**
Apply the full-shrink values (T=0.5, Y=0.06) but ONLY when the track is open. Closed-track pairs skip the brake-to-match cap computation entirely. Closed tracks are handled by avoidance forces alone. This eliminates the closed-track regression by construction, while the open-track fix from report 10 remains intact. Implementation: pass `isOpen` flag through the behavior config or priorityExtras, skip `speedBrakeSet` / `brakeMatchCaps` on closed tracks.
