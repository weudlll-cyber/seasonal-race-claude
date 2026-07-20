# Speed-Ramping Fairness Test (Simulation, design sandbox) — REMOVE + REPLACE

Flag-gated `--speedRamp` **removes the three existing smoothers** (re-roll spreadFactor easing,
trajectoryMult easing, governor slew → all instant) and **replaces them with ONE global acceleration
cap** of X·|target| per frame (0.5/0.3/0.7%/frame); collision-brake bypasses it. 4 tracks × 100 races,
seed=1, default racer, 40 closed / 60 open, choreoOutcomeStart=0.6 (shipped default). Off = byte-identical.

**This is a DESIGN SANDBOX**, not a browser prediction — it measures a hypothetical "if we shipped this
unified model" build. **Smoothness is guaranteed ≤ the cap by construction**, so no separate smoothness metric.

## B1 / B2 band-reach vs BASELINE (the fairness question)

| Variant | B1 mean | ΔB1 | B2 mean | ΔB2 | B3 mean | Holm-unfair tracks |
|---|---|---|---|---|---|---|
| BASELINE (off) | 77.6% | — | 73.6% | — | 66.0% | 1/4 |
| RAMP_0_5 (0.5%/frame) | 75.1% | -2.5pp | 68.5% | -5.0pp | 57.0% | 0/4 |
| RAMP_0_3 (0.3%/frame) | 75.8% | -1.9pp | 68.4% | -5.2pp | 57.4% | 0/4 |
| RAMP_0_7 (0.7%/frame) | 75.6% | -2.0pp | 68.7% | -4.9pp | 57.0% | 0/4 |

## Per-track B1 / B2 (gate is per-track ≥70%)

| Variant | city-circuit B1/B2 | dirt-oval B1/B2 | mountainstreet B1/B2 | ice-track B1/B2 |
|---|---|---|---|---|
| BASELINE | 79.4%/75.4% | 80.4%/76.7% | 71.6%/67.2% | 79.2%/75.1% |
| RAMP_0_5 | 77.0%/70.2% | 77.8%/71.2% | 70.0%/63.1% | 75.6%/69.7% |
| RAMP_0_3 | 78.4%/70.8% | 78.6%/71.8% | 69.4%/62.1% | 76.6%/69.0% |
| RAMP_0_7 | 77.8%/70.8% | 79.4%/72.7% | 70.6%/63.0% | 74.6%/68.3% |

## PULK action vs BASELINE (does the cap throttle the pulk?)

leadChangesPulk mean per config (N=100 races), averaged across tracks.

| Variant | PULK leadChanges | Δ vs BASELINE |
|---|---|---|
| BASELINE (off) | 9.86 | — |
| RAMP_0_5 (0.5%/frame) | 10.14 | +2.9% |
| RAMP_0_3 (0.3%/frame) | 8.96 | -9.1% |
| RAMP_0_7 (0.7%/frame) | 10.55 | +7.1% |

## Verdict

- **The absolute B2≥70% gate is not passable at this config even at BASELINE** — B2 < 70% on
  mountainstreet (a pre-existing property of choreoOutcomeStart=0.6, not caused by the cap).
  So the meaningful test is the **relative** effect of the cap vs BASELINE (the Δ columns above).

- **Fairness impact of the cap: ≤ 5.2pp** on B1/B2 across all ramp variants —
  material; see the Δ columns.
- **PULK action at 0.5%: +2.9% vs BASELINE** — action is essentially unchanged.
- **Smoothness: guaranteed** — by construction no frame changes effective speed by more than the cap.

_Sandbox result only. If adopted, the cap must be built in the SHARED raceStep.js (browser+sim, flag-gated)
and re-gated, so the browser and the prediction tool stay in parity._

---
_Configs present: 16/16._

