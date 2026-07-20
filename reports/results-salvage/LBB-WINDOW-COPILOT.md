# LBB-WINDOW — Copilot concept review (read-only)

## Scope

Read-only concept review. No code edits, no commits, no new sweep.
Only existing source and existing artifacts were used.

Checked artifacts:
- results/lbb-dodge-speed-2026-07-16/REPORT.md
- results/lbb-spring-sweep-2026-07-16/REPORT.md
- results/lbb-trace-3-2026-07-15/REPORT.md
- results/lbb-trace-2-2026-07-15/raw-nod.json
- server/data/tracks/mountainstreet.json
- client/src/modules/raceBehavior.js

Not read:
- results/LBB-WINDOW-CC.md

## 0) Geometry first: measured values in pixels

Track used by the existing measurements: mountainstreet, width 300 px, path length 15665.2231 px.

From existing trace fields (dynamicBrakeT, brakeSameLaneY) and source formula:
- brakeContactLength is the touching center-to-center length distance.
- dynamicBrakeT = (brakeContactLength / pathLength) times speedBrakeTMultiplier.

Measured/recomputed values:
- brakeSameLaneY median: 0.095
- brakeContactWidth: 0.095 times (300/2) = 14.25 px
- brakeContactLength: 25.7431 px
- gate-open center distance at multiplier 1.5: 38.6146 px
- actual air at multiplier 1.5: 38.6146 - 25.7431 = 12.8715 px

Interpretation:
- On this track and racer set, one body length is about 25.74 px (equal-length pair assumption, which matches this boarder-only setup).
- Current 1.5 multiplier means about 0.5 body lengths of air.

## 1) Is the concept sound?

Short answer:
- The concept is physically sound for natural-looking lane change only if runway and lateral speed are co-designed from one source.
- It is not sound as a pure single-knob widening of the current coupled brake+dodge window.

Arithmetic with measured body length and measured lateral traverse:
- Lateral traverse to clear one half-span is about 14.25 px.
- Time for 14.25 px traverse:
  - 18 degrees (0.78 px/frame lateral): about 18.3 frames
  - 43 degrees (2.24 px/frame lateral): about 6.4 frames

Air budget by multiplier m:
- air(m) = (m - 1) times 25.7431 px
- m=1.5 gives 12.87 px
- m=2.5 gives 38.61 px
- m=3.0 gives 51.49 px
- m=4.0 gives 77.23 px

Time budget against closing rate c:
- Tmax = air / c

Using your closing-rate table:
- At c=0.24 px/frame (10% faster):
  - m=1.5: Tmax about 53.6 frames
  - m=2.5: Tmax about 160.9 frames
- At c=1.11 px/frame (worst case):
  - m=1.5: Tmax about 11.6 frames
  - m=2.5: Tmax about 34.8 frames
  - m=3.0: Tmax about 46.4 frames

Implication:
- 18-frame natural traverse fails at m=1.5 in worst case.
- 18-frame natural traverse fits at m>=2.5 in worst case.

Conclusion for Q1:
- Yes, runway exists for natural steering angle, but not at current 1.5 in worst-case closure.
- A wider dodge start window can make it viable, but coupling that widening to earlier braking for everyone is the risk (Q2).

## 2) The crux risk: widening both dodge window and brake window

Source fact:
- dynamicBrakeT currently gates both dodge evaluation and braking.

Consequence of widening m directly:
- m=1.5 to m=3.0 doubles the longitudinal zone where blocked trailers brake.
- m=1.5 to m=5.0 increases it by 3.33x.

This directly hits the noWindowEver population (already measured 27-37%):
- Those cases cannot dodge by definition.
- If the same zone is widened, those cases start braking much earlier.

That is exactly the failure mode that can reintroduce the Owner complaint:
- long brake-before-pass behavior can return, even if dodge angle improves.

Does widening both ever help via gentler braking?
- Possibly for a subset, but unproven.
- Risk balance is unfavorable without decoupling because many blocked cases pay earlier-brake cost immediately.

Answer to Q2:
- Attack confirmed: coupled widening is high-risk.
- Recommendation: separate dodge window and brake window; do not scale both with one multiplier.

## 3) What must move together (single-source coupling)

Values that must stay synchronized:
- maxLateralSpeedPerStep
- lookBeforeBrakePassStrength
- LATERAL_LAUNCH_RAMP_FRAMES
- tLat via rampedLateralSteps(lbHalfSpan, vLatMax, rampFrames)
- dTStart = max(safeReengageT, lbTHalf + vClose times (tLat + lagFrames))
- lookBeforeBrakeLagFrames
- lookBeforeBrakeReengageTMultiplier floor
- safeReengageT and reengageFloorT

Why:
- If any copied constant diverges, trigger timing no longer matches achievable lateral motion.
- That recreates the exact desync class already seen: either authorize moves that cannot complete, or suppress moves that could complete.

## 4) Non-penetration: does structural guarantee survive?

Current structural guarantee is from condition (a), plus frame-wise re-check:
- lag-safe margin with worst-case vClose and lagFrames
- frame-by-frame re-evaluation of availability and reengage

It survives only if:
- slower lateral motion is propagated into tLat from the same source
- dTStart uses that updated tLat in every frame
- lagFrames and safeReengage floor remain active

It does not survive if:
- lateral speed is reduced without updating trigger math
- or trigger and motion are tuned independently.

So Q4 answer:
- Structural guarantee can survive the concept.
- It survives by strict single-source derivation, not by hard-separation fallback.

## 5) Second-order effects

CPU:
- Wider dodge zone means more candidate pairs entering side-free checks.
- Since side-free is O(n) inside pair iteration, this increases high-cost checks.
- Directionally: zone expansion from 1.5 to 3.0 can push this workload roughly toward 2x in dense phases.

Behavioral coupling:
- More simultaneous dodge attempts can increase side closures and withdrawals.
- Existing trace already shows dense local closures as a real mechanism.

Fairness and start-row impact:
- Earlier commitment can change who gets through first in traffic clusters.
- Requires full fairness re-gate; no claim can be made from one-race traces.

noWindowEver:
- This concept can only reduce noWindowEver if the issue is late entry timing, not true occupancy.
- If occupancy is dominant, widening dodge start may not help much while still increasing brake exposure if coupled.

## 6) Remaining-distance hypothesis check (full-span tLat mid-dodge)

Checked with existing trace-2 pair/racer rows, no new run.

Observed on sustained dodges in that dump:
- sustained runs not reaching target: 74
- of those, explicit withdrawal next frame: 67
- first false frame near dT approximately dTStart boundary (abs margin <= 0.00025): 65 of 67
- median margin at last true frame: +0.00000895
- median margin at first false frame: -0.00000620

This is strong evidence that withdrawal is boundary-driven and consistent with full-span timing pressure.

Implication:
- The remaining-distance point is likely real and load-bearing.
- Fixing remaining-distance accounting could recover a large part of reach behavior without a huge window change.
- Cheaper than widening the coupled brake window.

## 7) Recommendation with numbers

Verdict:
- Viable only as a split-window concept.
- Not viable as direct speedBrakeTMultiplier widening for both dodge and brake.

Recommended target region for first build candidate:
- keep brake window near current behavior (do not multiply by 3-5)
- dodge-start window equivalent to about m=2.5 to m=3.0 runway
- lateral profile target near 18-22 degrees peak in sustained dodges

One constant to derive from:
- desired lateral traverse time (or equivalent target angle under measured forward pace).

Everything else derived from it:
- vLat target and cap
- tLat via rampedLateralSteps
- dTStart via lag-safe formula

If forced to choose one plain number now:
- effective dodge-start multiplier around 2.5 is the smallest value that clears the worst-case 18-frame budget with measured geometry.

## 8) Acceptance criteria before any build

Dynamics and visual:
- sustained-dodge peak angle distribution near ordinary steering behavior:
  - report peak median, peak p90, and share above 30 degrees
- dodge reach percent materially above current 50% non-completion regime
- withdrawal reason audit: majority not caused by full-span over-requirement after remaining-distance update

Owner complaint guardrail:
- brakeThenDodge median braked frames must stay near control around 2
- explicit fail if it drifts back toward 35-50

Stability and safety:
- visible-weave count no worse than WITH-(d) baseline
- honestOverlapRate not above current accepted band
- structural non-penetration proof remains condition-(a)-based with hard-separation disabled in the proof case

Fairness and system:
- full re-gate: band-reach >= 70% and 0 Holm-unfair
- CPU profiling for side-free workload increase under dense traffic
- track set and seed breadth per standard fairness process, not single-race traces

## Quantification requested for brake-floor assumption

How often leader actually brakes during a dodge:
- In the existing trace-2 dodge rows, leader avoidanceActive is true on 1935 of 4140 dodge frames (46.7%).
- So on 53.3% of dodge frames the leader is not marked as currently braking.

How often the 0.945 floor prevents overlap that otherwise occurs:
- Not directly measurable from current dumps, because leader raw speed and brakeMatch factor are not captured in the pair rows needed for exact counterfactual replay.
- A strict checked claim cannot be made from existing fields alone.

What is checked instead:
- boundary-driven withdrawal evidence is strong (Q6).
- leader-braking incidence during dodge is quantified (46.7%).

## Checked vs not checked

Checked:
- source formulas for dynamicBrakeT, tLat, dTStart, safeReengage
- measured geometry in px from existing traces
- withdrawal boundary behavior from existing trace rows
- leader avoidanceActive rate during dodge frames

Not checked:
- exact counterfactual replay of the 0.945 floor impact on prevented overlaps
- full fairness and performance impact for a new parameter cell
- browser eye-test on a newly tuned split-window build

## Final call

The Owner concept is directionally correct about runway and natural angle.
But the implementation must be split-window and single-source derived.
A direct widening of the coupled brake+dodge multiplier is likely to trade visual smoothness for early-brake regressions in blocked traffic, which risks undoing the already-fixed complaint.