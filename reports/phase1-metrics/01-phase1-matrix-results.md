# Phase-1 Matrix Results — Fair-Chance + Honest Overlap Metrics

**Branch:** `feat/phase1-metrics`  
**Date:** 2026-06-05  
**Sim:** `scripts/sim-fairness.mjs` — additive changes only, all pre-existing outputs preserved  
**Run:** `--openRacers=60 --closedRacers=40 --dur=60 --races=10 --race-plan=true --seed=1`  
**Duration:** 394 s  
**Combos:** 66 total (all eligible track × racer pairs, surface-class filter)  
**Output JSON:** `client/tmp/phase1-metrics/fairness-data.json`

---

## Part 1 — Step-3 Gate: Honest Overlap Metric Is Non-Blind

**Test:** Space Sprint × rocket × 30s, 5 races, seed=1, N=40

| Metric | Value | Verdict |
|---|---|---|
| **liteOverlapRate** (old, center-proximity, 10% body threshold) | **0.0%** | Blind — confirms existing issue |
| **honestOverlapRate** (new, full body-extent, all pairs, open+closed) | **1.2%** | ✅ Non-zero — metric catches overtaking overlap |
| Gap | +1.2% | Old metric missed 100% of what the new one detects |

**What the honest metric measures:** For every active non-finished pair, every frame (after 4s warmup), it checks whether the rendered body boxes overlap in both axes simultaneously:
- Longitudinal: `|Δt| × pathLengthPx < effectiveDisplaySize × bodyFillY`
- Lateral: `|ΔphysicalY| × trackWidth/2 < effectiveDisplaySize × bodyFillX`

For closed tracks, Δt wraps modulo finishT so lapping pairs are correctly detected. The old metric had a 10% threshold on both axes — so tight it never fires when avoidance is active.

**Gate conclusion: ✅ PASS — metric is non-blind. Phase-1 matrix proceeded.**

---

## Part 2 — Coverage and Fairness Summary

### Combo count by topology

| Topology | Tracks | Combos |
|---|---|---|
| Open | 5 | 27 |
| Closed | 5 | 39 |
| **Total** | **10** | **66** |

All surface-class eligible pairs at 60s/10 races each.

### Fairness verdict (χ² win-rate test, p-threshold 0.05)

| Category | Count | % |
|---|---|---|
| **Fair (p ≥ 0.05)** | **66** | **100%** |
| Unfair (p < 0.05) | 0 | 0% |

**All 66 combos are statistically fair.** The race plan's row-blind rank lottery delivers row-independent win rates at 60s/10-race power.

---

## Part 3 — Per-Combo Results (Open Tracks)

*Closed-track combos omitted from naturalnness/overlap/fair-chance rows — sim reports those metrics for open tracks only in the current implementation. Fairness (χ²) is reported for all.*

### River Run (open, 60 racers)

| Racer | p-val | 1.5×gate | B1exact% | B1top5% | gap% | honest% | old% |
|---|---|---|---|---|---|---|---|
| duck | 0.535 | ✅ | 16% | 58% | 42% | 2.6% | 0.0% |
| dragon | 0.899 | ✅ | 18% | 58% | 40% | 3.2% | 0.0% |
| rocket | 0.501 | ❌ R0=20% | 18% | 62% | 44% | 0.6% | 0.0% |
| koi | 0.899 | ✅ | 24% | 68% | 44% | 2.6% | 0.0% |
| turtle | 0.272 | ❌ R0=10% | 20% | 70% | 50% | 2.2% | 0.0% |
| manta | 0.501 | ❌ R0=20% | 18% | 62% | 44% | 2.2% | 0.0% |
| dolphin | 0.059 | ❌ R0=0%,R1=60% | 20% | 62% | 42% | 1.2% | 0.0% |

### Space Sprint (open, 60 racers)

| Racer | p-val | 1.5×gate | B1exact% | B1top5% | gap% | honest% | old% |
|---|---|---|---|---|---|---|---|
| dragon | 0.272 | ❌ R1=10% | 14% | 66% | 52% | 3.8% | 0.0% |
| rocket | 0.080 | ❌ R1=0% | 22% | 60% | 38% | 0.7% | 0.0% |
| plane | 0.535 | ✅ | 20% | 70% | 50% | 2.3% | 0.0% |

### Luger Hill (open, 60 racers)

| Racer | p-val | 1.5×gate | B1exact% | B1top5% | gap% | honest% | old% |
|---|---|---|---|---|---|---|---|
| dragon | 0.220 | ✅ | 12% | 58% | 46% | 4.3% | 0.0% |
| rocket | 0.676 | ❌ R1=20% | 8% | 64% | 56% | 0.5% | 0.0% |
| plane | 0.059 | ❌ R0=60%,R1=0% | 10% | 56% | 46% | 3.0% | 0.0% |
| luge | 0.090 | ✅ | 28% | 62% | 34% | 1.4% | 0.0% |
| snowmobile | 0.936 | ✅ | 28% | 52% | 24% | 1.8% | 0.0% |

### Mountainstreet (open, 60 racers)

| Racer | p-val | 1.5×gate | B1exact% | B1top5% | gap% | honest% | old% |
|---|---|---|---|---|---|---|---|
| horse | 0.147 | ❌ R0=10%,R2=60% | 22% | 66% | 44% | 1.0% | 0.0% |
| dragon | 0.501 | ❌ R0=20% | 26% | 62% | 36% | 3.3% | 0.0% |
| f1 | 0.147 | ❌ R1=10%,R2=60% | 20% | 72% | 52% | 2.0% | 0.0% |
| motorbike | 0.272 | ❌ R0=10% | 18% | 60% | 42% | 1.1% | 0.0% |
| beetle | 0.501 | ❌ R2=20% | 14% | 60% | 46% | 1.0% | 0.0% |
| boarder | 0.272 | ❌ R1=10% | 18% | 62% | 44% | 1.0% | 0.0% |

### Seatrack (open, 60 racers)

| Racer | p-val | 1.5×gate | B1exact% | B1top5% | gap% | honest% | old% |
|---|---|---|---|---|---|---|---|
| duck | 0.535 | ✅ | 32% | 66% | 34% | 2.6% | 0.0% |
| dragon | 0.676 | ❌ R0=20% | 12% | 54% | 42% | 3.5% | 0.0% |
| rocket | 0.899 | ✅ | 10% | 52% | 42% | 0.6% | 0.0% |
| koi | 0.501 | ❌ R0=20% | 20% | 60% | 40% | 2.6% | 0.0% |
| turtle | 0.080 | ❌ R2=0% | 22% | 64% | 42% | 2.3% | 0.0% |
| manta | 0.899 | ✅ | 20% | 64% | 44% | 2.2% | 0.0% |
| dolphin | 0.899 | ✅ | 14% | 54% | 40% | 1.2% | 0.0% |

### Closed-track combos (fairness only, N=40)

All 39 closed combos: p ≥ 0.051 (lowest was Garden Path × giraffe at 0.051). No honest overlap reported for closed tracks in current output — that data is computed inside `runSingleRace` but not yet emitted to per-combo console for closed tracks (the `avgNaturalness` section only prints for `isOpen`). The JSON has the values; the console suppresses them. This is a known gap, noted in Part 5.

---

## Part 4 — Aggregate Metrics

### Fair-chance placement (B1 racers, all open combos)

Across all 27 open combos:

| Metric | Range | Typical |
|---|---|---|
| **B1exact%** (finish exactly on assigned rank) | 8–32% | ~18–20% |
| **B1top5%** (finish anywhere in top 5) | 52–72% | ~61% |
| **Gap** (top5 − exact) | 24–56% | ~42% |

Interpretation:
- Each B1 racer has roughly a **60% chance of landing in the top 5** (much better than the random ~8.3% for a 60-racer field without steering)
- Only ~19% land at their precise assigned rank — stochastic re-rolls and avoidance naturally scatter around the target
- The gap (~42%) represents racers who "reached top 5 but not their exact slot" — this is the expected noise from a proportional controller with re-roll variance

### Honest overlap by racer type (open combos)

| Racer | Body aspect ratio (Y/X) | Typical honest% |
|---|---|---|
| dragon | 1.074 | **3.2–4.3%** |
| dolphin | 2.207 | 1.2% |
| koi | 1.582 | 2.6% |
| duck | 1.000 | 2.6% |
| plane | 1.112 | 2.3–3.0% |
| manta | 1.272 | 2.2% |
| turtle | 1.270 | 2.2–2.3% |
| horse | 2.268 | 1.0% |
| motorbike | 2.000 | 1.1% |
| f1 | 1.717 | 2.0% |
| beetle | 1.688 | 1.0% |
| boarder | 1.807 | 1.0% |
| snowmobile | 1.735 | 1.8% |
| luge | 2.047 | 1.4% |
| rocket | 2.883 | **0.5–0.7%** |

**Pattern:** Dragon (wide body, bfX=0.836) has the highest honest overlap (3.2–4.3%). Rocket (narrow body, bfX=0.278) has the lowest (0.5–0.7%) — its lateral threshold is so tight that even side-by-side overtaking rarely triggers the lateral condition.

The old metric reads 0.0% for ALL open combos regardless of racer type. Gap is uniform: honest metric adds 0.5–4.3% signal that was invisible before.

---

## Part 5 — Flagged Shortlist for Closer Look

Ranked by combined concern: 1.5× gate failure + honest overlap magnitude.

### Tier 1 — Drill in next (fairness + overlap both warrant attention)

| Combo | Reason |
|---|---|
| **Luger Hill × dragon × 60s** | Honest 4.3% (highest) + 1.5× gate PASS but narrowly (p=0.220 with small rows) |
| **Space Sprint × dragon × 60s** | Honest 3.8% (2nd highest) + 1.5× gate FAIL (R1=10%) |
| **Seatrack × dragon × 60s** | Honest 3.5% + 1.5× gate FAIL (R0=20%) |
| **Mountainstreet × dragon × 60s** | Honest 3.3% + 1.5× gate FAIL (R0=20%) |
| **River Run × dolphin × 60s** | p=0.059 (near threshold) + extreme R0=0%,R1=60% + 1.5× gate FAIL |

### Tier 2 — Watch (moderate concern, one dimension each)

| Combo | Reason |
|---|---|
| Luger Hill × plane × 60s | p=0.059 + extreme row split R0=60%,R1=0% |
| River Run × dragon × 60s | Honest 3.2% (wide body) |
| Luger Hill × rocket × 60s | B1top5=64% but B1exact=8% (widest gap vs. peers) |
| Seatrack × turtle × 60s | p=0.080 + 1.5× gate FAIL R2=0% |
| Space Sprint × rocket × 60s | p=0.080 + 1.5× gate FAIL R1=0% |

### Notes on 1.5× gate failures

At N=10 races, 1.5× gate failures are largely sampling noise. The chi-square p-values are all ≥0.059 — none are significant. However, the extremely skewed rows (R0=0% or R1=0% over 10 races) in the Tier 1 combos warrant a follow-up run with N=50 races to confirm whether the trend is real or noise.

---

## Part 6 — Pre-Existing Output Verification

All metrics present and unchanged in the JSON output (`client/tmp/phase1-metrics/fairness-data.json`):

| Pre-existing metric | Still emitted | Value unchanged |
|---|---|---|
| Per-row win rate, chi-square, p-value | ✅ | ✅ |
| avgRank, stdRank per row | ✅ | ✅ |
| liteOverlapRate (center-proximity) | ✅ | ✅ (0.0% for all open) |
| liteOverlapResolutionFrames | ✅ | ✅ |
| liteZigzagScore | ✅ | ✅ |
| liteLatSpeedScore | ✅ | ✅ |
| liteBrakeRate | ✅ | ✅ |
| liteStableOvertakes | ✅ | ✅ |
| racersInCorridorFraction | ✅ | ✅ |
| corridorViolationMean, corridorViolationMax | ✅ | ✅ |
| bidirectional boost/brake fractions | ✅ | ✅ |
| winnerBlockedFractionInOutcome | ✅ | ✅ |
| Zone success rate (B1–B5) | ✅ | ✅ |
| Mixing quota | ✅ | ✅ |
| All rawData fields (sollRank, sollBereich, etc.) | ✅ | ✅ |

**New fields added (additive, no rename or removal):**
- `honestOverlapRate` — body-extent overlap fraction (per race + avg)
- `fairChanceExactHits`, `fairChanceTop5Hits`, `fairChanceB1Count` — per race
- `avgNaturalness.honestOverlapRate`, `fairChanceExactRate`, `fairChanceTop5Rate`, `fairChanceB1Count` — per combo
- `nRacers` on combo result (for report labelling)

---

## Part 7 — Known Gaps for Next Session

1. **Closed-track honest overlap**: computed inside `runSingleRace` and in JSON, but not printed to console or included in the report table (the `isOpen` guard on the naturalness block suppresses it). To surface it: either remove the `isOpen` guard on the LateralQ console line, or add a separate closed-track block.

2. **N=10 variance**: All 1.5× gate failures are within sampling noise. The Tier 1 shortlist combos should be re-run with N=50 to distinguish signal from noise.

3. **Honest overlap on closed tracks**: Lapping should produce measurable honest overlap (racers at the same wrap-around position). This needs a targeted closed-track run to verify.

4. **Fair-chance per-row breakdown**: The current B1exact/B1top5 metrics are aggregated over all B1 racers regardless of their starting row. A per-row breakdown would show whether B1 racers from back rows actually reach top-5 as often as those from front rows — the more useful fairness question.

5. **Diagnostic script cleanup**: `scripts/diag-race-plan-fairchance.mjs` was created for investigation only. It can be deleted before merging.
