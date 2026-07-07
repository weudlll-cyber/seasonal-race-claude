# Rank-Proto Stufe 2c — ENGAGEMENT-blend action slider: monotonicity confirmed

## Design
The ACTION slider is now ENGAGEMENT: `blendedTarget = 1 + engagement·(showTarget − 1)` in the pre-OUTCOME
controller. action 0 → engagement 0 → every target = 1.0 (controller NEUTRAL = calm baseline). action 1 →
engagement 1 → full show-target steering (wild). No new speed authority (the ±clamp is unchanged; only the
FRACTION applied scales). Show-target SHAPE fixed (frontBand 8 / wanderDwell 0.06 / frontConcentration 3).
The dead Stufe-2 shape coupling (action→band/rotation/concentration) is removed; actionToShowLevers now
returns only { showEngagement }.

## Action-range curves (2 tracks × 30 seeds)

### searound (closed)
| action | stableOvt | distinctP1 | leadΔ% | corrP1 | B3 |
|--------|-----------|-----------|-------|-------|----|
| 0.0 | 5.9 | 2.57 | 0.059 | 0.00 | 65% |
| 0.25 | 7.1 | 2.83 | 0.073 | 0.01 | 65% |
| 0.5 | 8.8 | 3.33 | 0.088 | 0.02 | 68% |
| 0.75 | 11.6 | 3.97 | 0.12 | 0.03 | 69% |
| 1.0 | 14.1 | 4.57 | 0.142 | 0.01 | 72% |
→ stableOvertakes **RISING** (5.9→14.1, ~2.4×), distinctP1 **RISING** (2.6→4.6), leadΔ **RISING**.

### seatrack (open)
| action | stableOvt | distinctP1 | leadΔ% | corrP1 | B3 |
|--------|-----------|-----------|-------|-------|----|
| 0.0 | 16.7 | 2.47 | 0.088 | 0.00 | 61% |
| 0.25 | 18.2 | 3.07 | 0.157 | 0.02 | 64% |
| 0.5 | 20.9 | 3.57 | 0.193 | 0.00 | 64% |
| 0.75 | 24.5 | 4.87 | 0.265 | 0.01 | 63% |
| 1.0 | 28.7 | 6.27 | 0.338 | 0.01 | 67% |
→ stableOvertakes **RISING** (16.7→28.7), distinctP1 **RISING** (2.5→6.3), leadΔ **RISING** (0.09→0.34%).

## VERDICT — GREEN: monotonic AND fair on both tracks → ready for owner eye-test + Stufe 3

- **MONOTONIC (the goal): ✅** All three action metrics (stableOvertakes, distinctP1, leadChangeRate) rise
  monotonically from baseline at action 0 to full at action 1 on BOTH tracks. The engagement blend spans the
  baseline→~2× range by construction; the endpoints match the measured Stufe-1 references (searound stableOvt
  ~6→~14, seatrack ~17→~29). The slider is finally a clean calm→wild dial.
- **FAIR at every level: ✅** corrP1 0.00–0.03 across the whole range on both tracks. Band-reach is NOT
  degraded by engagement — B3 at action 0 (65%/61%) IS the no-action baseline read (the combo/single-racer
  property established in Stufe 2), and it actually RISES with action (→72%/67%). So the mechanism holds fairness.
- **Caveats (honest):** B3 absolute is borderline (61–72%, <70% at low action) — but that is the baseline
  property, not caused by the mechanism (it's present at action 0 = pure baseline); the official pooled-300 +
  ordinal gate should decide a ship. Closed-track absolute leadΔ stays low (0.06–0.14%) — a physics limit
  (permanent leader, no lateral room) — but it RISES monotonically and the real-overtaking metric
  (stableOvertakes) is strong (~2.4×). Score on stableOvertakes.

## Eye-test preset (for the owner)
DevScreen → **Dynamics Tuning** → **"Rank-Action candidate (experimental)"** SubCard:
1. Check **"Enable Rank-Action (show-target)"**.
2. Turn OFF the other pre-OUTCOME mechanics for a clean look: uncheck the **Field Governor** (Enable + Director).
3. Drag the **Action** slider 0 → 100% and start a race; watch the front go from a calm procession (0%) to a
   lively, lead-trading front (~2× overtaking at 100%). Everything default OFF — this ships nothing on.

## Readiness
GREEN → ready for the owner eye-test and Stufe 3 (4-track fairness confirm at the chosen action level).
