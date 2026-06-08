# Probe: Space Sprint × Dragon — Brake-Strength Scan

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-05
**Sim:** `scripts/sim-fairness.mjs`
**Setup:** `--track=space-sprint --racer=dragon --openRacers=60 --dur=60 --races=20 --race-plan=true --seed=1`
**Purpose:** Exploratory scan — does increasing `speedBrakeFactor` reduce honest overlap? Fairness cost?
**Note:** Exploratory only. No defaults written. No auto-merge.

---

## Tested Values

`speedBrakeFactor` controls the speed multiplier when avoidance braking is active.
Default is `0.945` (5.5% speed reduction). "Stronger" = lower factor = larger reduction.

| Label    | speedBrakeFactor | Speed reduction |
|----------|-----------------|-----------------|
| Baseline | 0.945           | 5.5%            |
| +25%     | 0.931           | 6.9%            |
| +50%     | 0.918           | 8.25%           |
| +75%     | 0.904           | 9.6%            |
| +100%    | 0.890           | 11.0%           |

---

## Results Table

| Brake strength | Factor | honest% | old% | p-val | 1.5×gate | zigzag   | brakeRate | B1exact | B1top5 |
|---------------|--------|---------|------|-------|----------|----------|-----------|---------|--------|
| Baseline      | 0.945  | 3.7%    | 0.0% | 0.819 | ✅ PASS  | 0.000173 | 86.0%     | 15%     | 62%    |
| +25%          | 0.931  | 3.6%    | 0.0% | 0.210 | ❌ FAIL (R1=15%) | 0.000172 | 86.5% | 16% | 59% |
| +50%          | 0.918  | 3.6%    | 0.0% | 0.389 | ❌ FAIL (R2=20%) | 0.000171 | 87.3% | 14% | 60% |
| +75%          | 0.904  | 3.5%    | 0.0% | 0.527 | ✅ PASS  | 0.000167 | 87.0%     | 24%     | 58%    |
| +100%         | 0.890  | 3.5%    | 0.0% | 0.710 | ✅ PASS  | 0.000170 | 87.8%     | 15%     | 58%    |

Overlap resolution (avg consecutive frames a pair stays overlapping before separating):
- Baseline: 40.6 fr → +100%: 35.6 fr  (pairs separate ~5 frames faster at max strength)

---

## Engagement Finding

**The brake IS firing — massively.** At baseline the speed brake is active on **86% of all
racer-frame observations**. This rises only slightly (to 87–88%) as brake strength increases,
confirming engagement is not the bottleneck. The brake fires throughout the race, not just
in isolated overtaking windows.

Despite near-universal brake engagement, honest overlap drops only **0.2 percentage points**
(3.7% → 3.5%) across the full 2× strength range. The brake engages; it just cannot separate
wide-body racers laterally. Speed braking controls longitudinal gap (t-space), but the honest
overlap condition requires both longitudinal **and** lateral overlap. A braked racer is slower
but still occupying the same physical-Y lane — the lateral dimension is governed by home-force
and lateral avoidance, not speed braking.

The only statistically meaningful change from stronger braking is a ~5-frame reduction in
per-pair overlap **duration** (resolution: 40.6 fr → 35.6 fr). Pairs break away fractionally
faster, but not often enough to register as a meaningful drop in the overlap rate.

The 1.5×-gate failures at +25% and +50% are N=20 sampling noise; they vanish at +75% and
+100%. All p-values remain well above 0.05. Zigzag is flat across all values — no wobble.

---

## Plain Read

Doubling brake strength moves honest overlap by 0.2 pp (3.7% → 3.5%) — barely above
measurement noise. Fairness holds across the entire scan (all p ≥ 0.21, all ≥ 0.05),
and zigzag is unchanged, so there is no cost from stronger braking either. **The brake
is not the right knob for overlap.** With 86% of racer-frames already braking, the speed
brake is essentially a global speed floor for the whole field — it suppresses longitudinal
crowding uniformly but does nothing to push racers apart laterally. Dragon's 3.7% honest
overlap comes from its wide body (bfX=0.836) catching brief lateral adjacency during
overtaking; that adjacency is resolved by home-force and lateral avoidance, not speed.
**The engagement window is not the problem** — the brake fires constantly. The gap to
close is in the lateral separation axis, which `speedBrakeFactor` does not touch.

---

## Next Steps

1. **Lateral force scan** — `lateralForce` and `homeForceStrength` are the parameters that
   resolve physicalY adjacency. These are the axes most likely to reduce honest overlap for
   wide-body racers without a global speed cost.
2. **avoidanceDistance threshold** — the brake fires at 86% because `avoidanceDistance=0.18`
   encompasses a large fraction of the field (avg racer spacing ≈ 0.436/60 ≈ 0.0073, so the
   brake zone covers ~25 racers' worth of spacing). Tightening this threshold would make braking
   more selective and might make future strength changes more legible.
3. **Dragon-specific body width** — since overlap scales with bfX (dragon is 0.836 vs rocket at
   0.278), a targeted probe on `speedBrakeYThreshold` (the lateral proximity check that gates
   whether braking fires at all) may reveal whether the lateral gate is too wide or too narrow.
