# Rank-Proto Stufe 2b — front-concentration coupling: action-range MONOTONICITY test

Concentration lever: action 0→conc8(spread) … 1→conc1(all fight rank 1). frontBand/dwell FIXED. show-target ON, all else OFF.

GOAL: stableOvertakes AND distinctP1 rise (or not fall) as action 0→1 on BOTH tracks. FAIR: corrP1≤0.15, band-reach ≥ baseline.

## searound
| action | conc | leadΔ% | podium% | distP1 | stableOvt | corrP1 | B1 | B2 | B3 | B4 |
|-------|-----|-------|--------|-------|----------|-------|----|----|----|----|
| 0.0 | 8 | 0.12 | 0.834 | 4.2 | 14.55 | 0.02 | 82% | 79% | 68%⚠ | 87% |
| 0.25 | 6 | 0.131 | 0.706 | 4.33 | 14.48 | 0.00 | 81% | 75% | 63%⚠ | 86% |
| 0.5 | 5 | 0.141 | 0.803 | 4.5 | 14.25 | 0.01 | 79% | 77% | 69%⚠ | 87% |
| 0.75 | 3 | 0.142 | 0.863 | 4.57 | 14.06 | 0.01 | 79% | 77% | 72% | 88% |
| 1.0 | 1 | 0.148 | 0.906 | 4.53 | 14.07 | 0.01 | 79% | 76% | 68%⚠ | 88% |

- stableOvertakes 0→1: [14.55, 14.48, 14.25, 14.06, 14.07] → **falling**
- distinctP1 0→1: [4.2, 4.33, 4.5, 4.57, 4.53] → **non-monotonic**

## seatrack
| action | conc | leadΔ% | podium% | distP1 | stableOvt | corrP1 | B1 | B2 | B3 | B4 |
|-------|-----|-------|--------|-------|----------|-------|----|----|----|----|
| 0.0 | 8 | 0.343 | 1.763 | 6.4 | 29.27 | 0.03 | 83% | 76% | 64%⚠ | 72% |
| 0.25 | 6 | 0.323 | 1.606 | 6.3 | 28.72 | 0.02 | 82% | 76% | 65%⚠ | 73% |
| 0.5 | 5 | 0.353 | 1.677 | 6.43 | 29.43 | 0.01 | 81% | 75% | 68%⚠ | 73% |
| 0.75 | 3 | 0.338 | 1.574 | 6.27 | 28.68 | 0.01 | 83% | 76% | 67%⚠ | 72% |
| 1.0 | 1 | 0.322 | 1.696 | 5.83 | 28.43 | 0.01 | 83% | 76% | 66%⚠ | 72% |

- stableOvertakes 0→1: [29.27, 28.72, 29.43, 28.68, 28.43] → **non-monotonic**
- distinctP1 0→1: [6.4, 6.3, 6.43, 6.27, 5.83] → **non-monotonic**

## VERDICT — reshape IMPROVED closed-track direction + robustly FAIR, but the slider dynamic range is NARROW (not cleanly monotonic → NOT ready for Stufe 3 as a wide slider)

**Reshape partially WORKED (vs Stufe 2):**
- Closed (searound) **leadΔ now RISES with action: 0.12→0.13→0.14→0.14→0.15%** — the Stufe-2 INVERSION (leadΔ fell 0.145→0.09) is FIXED. distinctP1 also mostly rises (4.2→4.5). Concentrating featured racers toward rank 1 does raise the front fight on closed tracks. ✅ direction fixed.

**FAIR at every level — strong:**
- corrP1 0.00–0.03 across the entire range on both tracks. Band-reach B3 63–72% (borderline, same as the no-action baseline established in Stufe 2 — NOT degraded by the mechanism). Fair everywhere.

**BUT the dynamic range is NARROW — not a clean monotonic calm→wild:**
- Closed: only leadΔ rises (and only from 0.12→0.15%, tiny absolute); stableOvertakes is FLAT (14.6→14.1). Open (seatrack): EVERYTHING is flat — leadΔ ~0.33, distinctP1 ~6, stableOvt ~29 across all action levels (the open track is already saturated at calm). So the slider barely moves the total action; the levers (concentration/band/rotation) have LOW leverage.
- Strict monotonicity gate: NOT met — front-action does not clearly rise on BOTH tracks (open is flat; closed stableOvt flat).

**Honest read + next hypothesis:** the show-target produces a roughly FIXED, fair, ~2×-baseline amount of action that is largely INVARIANT to the show-target SHAPE levers — the total action is set by the FIXED controller authority + track physics, not by concentration/width/rotation. The reshape fixed the *direction* on closed tracks but cannot widen the *range*, because these levers don't control how much the mechanism engages. A genuine calm→wild slider needs a higher-leverage lever: **an ENGAGEMENT blend** — action 0 = controller neutral (baseline, no show-target) → action 1 = full show-target — which would monotonically scale from baseline to full action by construction. That is the Stufe-2c hypothesis.

**RECOMMENDATION:** do NOT proceed to Stufe 3 expecting a wide monotonic slider — the shape levers give a narrow range. Two honest options: (a) accept the mechanism as a FIXED fair-and-exciting operating point (no wide slider; ~2× baseline overtaking, corrP1 ~0.01) and take THAT to Stufe 3 for a 4-track fairness confirm; or (b) first test the ENGAGEMENT-blend lever (Stufe-2c) to get a real calm→wild range, then Stufe 3. Recommend (b) — the owner wants a slider, and engagement-blend is the lever with the leverage to deliver one.

Caveat: score on stableOvertakes (real overtakes ~2× baseline, esp. open); closed-track absolute leadΔ stays low (~0.1–0.15%) regardless of action — a physics limit (permanent leader, no lateral room), not fixable by the slider.
