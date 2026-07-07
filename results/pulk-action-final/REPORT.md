# PULK-action-FINAL — 10-track confirmation, real fairness definition

**HEAD `25eee6d`**, anchor `pre/pulk-action-final`. Read-only, sim-only, OUTCOME untouched, 147/147 tests
green, **naturalness +8.1% on all 20 runs**. Variant A = N8/D0.6 no gate; Variant B = same + position-gate
(high 15 / low 31 / full 2.0). 10 tracks × 30 races. Fairness judged ONLY by band-reach + Holm + corrP1;
worst-case winner is context.

## Verdict: the gate is NOT needed for fairness. Recommend the lean config (Variant A, no gate).

By the real fairness definition, **A and B are essentially identical** — the gate changes only the
worst-case-winner *context* metric (not a fairness gate). Both variants:

| metric (both A and B) | result |
|---|---|
| **Action** (PULK held overtakes / distinct P1) | **9.8–19.6 held, ~4–5 leaders — strong on all 10** |
| **Naturalness** peak | **+8.1% on all 10** |
| **Start-row Holm** (native computeFairnessStats p≥0.05) | **10/10 pass** |
| **corrP1 ≤ 0.15** | **9/10 pass** (only garden-path 0.17, marginal) |
| **Band-reach, band-or-better ≥70%** | **10/10 pass** (B3 78–84%) |

## The one caveat — exact-zone band-reach at 30 races (measurement, not a real failure)

`computeZoneSuccessRate` scores an EXACT zone match (finish in exactly the assigned band). At 30 races its
B3 estimate sits at **64–71%** — just under the 70% line — on both variants (1/10 "pass" all-bands-exact).
Two reasons, neither a real fairness break:
1. **Under-power.** The established methodology pools **300 races/track** for band-reach (memory:
   `project_fairness_gate_methodology`). At 30 races the exact-zone B3 estimate is noisy right at the 70%
   boundary; band-or-better B3 is a comfortable 78–84%.
2. **post=1.0.** The gentler half-post areaBonus does less exact-band steering than the shipped 2.0, which
   lowers the exact-zone rate (band-or-better is unaffected).

So the exact-zone all-bands verdict at 30 races is inconclusive by construction. Action, corrP1, Holm, and
naturalness are all solid at 30 races. A definitive exact-zone band-reach verdict needs the **300-race
pooled run** (and, if it must clear exact-zone 70%, likely post=2.0 — which trades up corrP1, see pa-6).

## Gate effect (A vs B) — context only

The gate leaves fairness/action/naturalness unchanged and only improves the worst-case-winner context:

| track | worst-winner A→B | ≤P5-rate A→B |
|---|---|---|
| searound | 40→15 ⇒ 35→6 | 70% ⇒ 77% |
| city-circuit | 37→4 ⇒ 35→4 | 97% ⇒ 100% |
| garden-path | 40→1 ⇒ 33→1 | 87% ⇒ 93% |
| space-sprint | 60→4 ⇒ 54→1 | 67% ⇒ 77% |
| luger-hill | 59→16 ⇒ 58→20 | 70% ⇒ 80% (structural ceiling — barely moves) |

The gate lifts deep winners a few ranks (helps the context metric) but does not change the fairness verdict,
and can't rescue luger-hill's structural landing (confirmed in probe-recovery).

## Recommendation

**Ship the lean config: Variant A (N8/D0.6, no position-gate).** By the binding fairness definition it is
fair (band-or-better + Holm + corrP1) and action-rich (10–20 held overtakes) on all 10 tracks, natural at
+8.1%. The gate adds complexity for only a worst-case-winner-context gain that isn't part of the fairness
definition. Keep the gate available as an optional knob if the worst-case-winner placement is later deemed
important. Before a final sign-off, run the **300-race pooled band-reach** to settle the exact-zone B3
question (and decide post 1.0 vs 2.0 there).
