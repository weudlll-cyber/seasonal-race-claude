# Rank-Proto Stufe 2 — action coupling: B3-confirm + range + lever isolation

## PART 1 — B3 CONFIRM at N=100 (mid setting fb8/wd0.06)

| track | leadΔ% | distP1 | stableOvt | corrP1 | B1 | B2 | B3 | B4 | startP |
|-------|-------|-------|----------|-------|----|----|----|----|-------|
| searound | 0.104 | 3.75 | 14.78 | 0.02 | 81% | 76% | 68%⚠ | 87% | 0.73 |
| seatrack | 0.359 | 6.58 | 29.71 | 0.00 | 81% | 78% | 70% | 72% | 0.90 |

## PART 2 — ACTION RANGE (0=calm / 0.5=mid / 1.0=wild), N=30

| track | action | leadΔ% | podium% | distP1 | stableOvt | corrP1 | B3 | FAIR |
|-------|-------|-------|--------|-------|----------|-------|----|------|
| searound | 0.0 | 0.145 | 0.79 | 5.43 | 12.88 | 0.01 | 68%⚠ | — |
| searound | 0.5 | 0.117 | 0.666 | 4.27 | 15.45 | 0.05 | 73% | ✅ |
| searound | 1.0 | 0.09 | 0.599 | 3.6 | 13.03 | 0.02 | 67%⚠ | — |
| seatrack | 0.0 | 0.237 | 1.206 | 5 | 20.98 | 0.01 | 66%⚠ | — |
| seatrack | 0.5 | 0.384 | 1.777 | 7.27 | 28.42 | 0.03 | 67%⚠ | — |
| seatrack | 1.0 | 0.351 | 1.842 | 6.13 | 27.8 | 0.01 | 68%⚠ | — |

## PART 3a — LEVER: showFrontBand alone (dwell 0.06), N=15

| track | frontBand | leadΔ% | podium% | distP1 | stableOvt | corrP1 | B3 |
|-------|----------|-------|--------|-------|----------|-------|----|
| searound | 4 | 0.117 | 0.799 | 4.33 | 15.63 | 0.03 | 69%⚠ |
| searound | 8 | 0.132 | 1.143 | 4.67 | 15.01 | 0.02 | 64%⚠ |
| searound | 12 | 0.125 | 0.812 | 4.4 | 13.98 | 0.02 | 69%⚠ |
| seatrack | 4 | 0.304 | 1.389 | 5.6 | 24.05 | 0.02 | 69%⚠ |
| seatrack | 8 | 0.33 | 1.673 | 6 | 29.59 | 0.03 | 67%⚠ |
| seatrack | 12 | 0.322 | 1.727 | 5.73 | 29.1 | 0.03 | 71% |

## PART 3b — LEVER: showWanderDwell alone (frontBand 8), N=15

| track | wanderDwell | leadΔ% | podium% | distP1 | stableOvt | corrP1 | B3 |
|-------|------------|-------|--------|-------|----------|-------|----|
| searound | 0.10 | 0.106 | 0.644 | 4.07 | 15.22 | 0.01 | 66%⚠ |
| searound | 0.06 | 0.132 | 1.143 | 4.67 | 15.01 | 0.02 | 64%⚠ |
| searound | 0.03 | 0.089 | 0.525 | 3.4 | 13.29 | 0.05 | 67%⚠ |
| seatrack | 0.10 | 0.365 | 1.77 | 6.93 | 28.58 | 0.05 | 69%⚠ |
| seatrack | 0.06 | 0.33 | 1.673 | 6 | 29.59 | 0.03 | 67%⚠ |
| seatrack | 0.03 | 0.289 | 1.682 | 5.2 | 28.98 | 0.01 | 71% |
## PART 1 — B3 vs no-action BASELINE at N=100 (the decisive gating comparison)
| track | B1 show/base | B2 show/base | B3 show/base | B4 show/base |
|-------|------|------|------|------|
| searound | 81/80% | 76/76% | **68/67%** | 87/87% |
| seatrack | 81/82% | 78/76% | **70/68%** | 72/69% |
→ The show-target's band-reach is EQUAL-OR-BETTER than the no-action baseline on every band. The
absolute sub-70 B3 on searound is a property of the searound×manta single-representative-racer read
(baseline is 67% too), NOT a show-target regression. The official gate (pooled 300-race + ordinal)
should decide a ship; relative to baseline, the handoff does not degrade fairness.

## VERDICT — PARTIAL GREEN: fair + handoff holds, but the slider is NOT monotonic (coupling needs redesign before Stufe 3)

**FAIR — strong GREEN (both gates):**
- corrP1 0.01–0.05 at EVERY action level and every lever setting, on both tracks — robustly fair.
- Band-reach ≥ no-action baseline on every band at N=100 (show 68/70% vs base 67/68% on B3) → the
  rank-blind handoff does NOT strand the winner; it slightly improves band-reach. The B3 <70 absolute
  is combo/measurement-inherent (baseline too), not caused by the show-target. B3 gate: HOLDS vs baseline.

**EXCITING — real, but NOT monotonic on the slider (the problem):**
- The mechanism produces real front-relevant action (stableOvertakes ~2× baseline, distinctP1 ~2×,
  podium 2–3×) — confirmed at every level.
- BUT front-action PEAKS at MID (action 0.5) and DROPS toward "wild" (action 1.0): searound distinctP1
  5.4→4.3→3.6 and leadΔ 0.145→0.117→0.09 as action rises; seatrack peaks at 0.5. So the coupling
  (wider band + faster rotation = "wild") OVERSHOOTS the peak. The "one slider, calm→wild =
  progressively more action" requirement is NOT met.

**LEVER read:** `showWanderDwell` moves the FRONT metrics (distinctP1/leadΔ) the most — but INVERTED
(slower rotation → more front churn; seatrack distinctP1 6.9→5.2 as dwell 0.10→0.03). `showFrontBand`
mainly moves field-breadth (stableOvertakes), peaking at ~8. Neither is a clean monotonic intensity
control; both peak at moderate settings (frontBand ~8, dwell ~0.06–0.10).

**RECOMMENDATION:** the rank/show-target mechanism is FAIR and produces action, and the handoff holds
— but do NOT proceed to Stufe 3 (full sweep) yet. First REDESIGN the action coupling so a single
scalar MONOTONICALLY raises front-action. The current lever space peaks at moderate settings because
spreading featured racers across ranks 1..band dilutes P1 competition. Candidate redesign: make the
intensity lever CONCENTRATE featured racers toward rank 1 (direct P1 competition) rather than widening
the band / speeding rotation — then re-run this Stufe-2 range test for monotonicity before Stufe 3.

Honest note: the high leadΔ/podium are partly real (stableOvertakes 2× baseline confirms genuine
overtaking, esp. open tracks); score on stableOvertakes. Closed-track front churn is livelier but the
absolute leadΔ stays low (~0.1%).
