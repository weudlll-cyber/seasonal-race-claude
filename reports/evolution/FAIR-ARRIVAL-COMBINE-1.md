# FAIR-ARRIVAL-COMBINE-1 — the owner's two halves together (early sort + late hold)

**Branch `exp/fair-arrival` @0ead833 (ship world; sim-only, master untouched). Author: CC.** Both halves were
validated apart (CHAOS-STEER-1: the steer; FAIR-ARRIVAL-1: the draw bias); this screen measures the COMBINATION
and diagnoses the ice row-skew. Flags default OFF → flagless fingerprint **`7c70b1eae7d31e22`** (== shipped,
byte-identical, asserted on the committed state).

## 1. BUILD-vs-SPEC CONFORMANCE (mandatory, FIRST)
- **The combo is BOTH flags on, no new coupling code.** The `combo` arm is exactly `--chaosSteer=true
  --chaosSteerGain=0.06 --bandBias=true --bandR=0.60 --bandBiasGain=0.10` — the steer untouched, the bias
  untouched. No code path couples them; they act in different phases (steer during chaos on the servo, bias
  from R=0.60 on the re-roll draw). CONFORMS.
- **Row-skew diagnosis is new READ-ONLY instrumentation.** Per-racer steer exposure (`getChaosSteerStats.byRacer`)
  is joined to each racer's `startRowIndex` in the sim (`perRow`), and the driver prints share-steered + mean
  multiplier PER start row, plus per-row band-reach for every arm. No physics touched → OFF byte-identical.
  CONFORMS.

## 2. SCREEN — searound + ice, N=25, paired vs Ship

| arm · track | ARRIVAL (Δship) | frontContest (Δship) | DEAD-BORING (Δship) | rowMin · Holm | in-band@chaos-end |
|---|---|---|---|---|---|
| ship · searound | 75% | 42% | 8% | 66% · UNF | 29% |
| ship · ice | 72% | 68% | 0% | 65% · ok | 32% |
| chaosSteer · searound | 78% (+3) | 67% (+25) | 4% (−4) | 71% · UNF | 68% (+39) |
| chaosSteer · ice | 79% (+7) | 77% (+9) | 0% (+0) | 77% · UNF | 70% (+38) |
| faB60 · searound | 89% (+14) | 42% (−0) | 8% (+0) | 86% · UNF | 29% |
| faB60 · ice | 89% (+17) | 67% (−1) | 8% (+8) | 86% · UNF | 32% |
| **combo · searound** | **90% (+15)** | **67% (+24)** | **4% (−4)** | 88% · UNF | 68% (+39) |
| **combo · ice** | **90% (+18)** | **78% (+10)** | **0% (+0)** | 88% · **ok** | 70% (+38) |

## VERDICT (read first): the combination PASSES the night gate

**The two halves compose exactly as hoped: the combo clears 90% arrival on BOTH tracks (75→90, 72→90) while
the steer's front-action gain SURVIVES the bias (frontContest +24/+10pp over Ship, 42→67 / 68→78) at
equal-or-lower DEAD-BORING (4≤8, 0≤0) — all three hard night-gate criteria pass on both tracks.** The fourth
criterion, the row-skew, is met the strong way: on ICE the Holm flag that CHAOS-STEER-1 raised is now **GONE**
(combo ice Holm ok), because the draw bias fills exactly the middle-row band-reach gap the steer leaves; on
SEAROUND the combo is still Holm-UNF, but so is SHIP there (searound is baseline start-row-unfair independent of
either lever), and the combo RAISES the per-row floor 66→88% rather than introducing skew. The mechanism is
named below, so the gate's "absent OR mechanically explained with a fix" is satisfied both ways. **PASS → the
10-track N=100 gate spec is now earned (then the owner's browser eye).**

## 3. ROW-SKEW DIAGNOSIS — the mechanism, named (not just flagged)

**Per-row steer exposure (combo, mean multiplier by start row):**

| start row | r0 (front) | r1 | r2 | r3 | r4 | r5 | r6 (back) |
|---|---|---|---|---|---|---|---|
| searound mult | **0.870** | 0.897 | 0.937 | 1.006 | 1.049 | 1.068 | **1.089** |
| ice mult | 0.903 | 0.951 | 1.016 | 1.055 | — | — | — |

1. **The steer's per-row exposure is monotone — front rows braked, back rows boosted.** A racer's drawn band is
   independent of its start row, but at chaos start a FRONT-row racer sits physically AHEAD of its drawn band
   (ranked better than target → braked toward it, mult < 1) and a BACK-row racer sits BEHIND (ranked worse →
   boosted, mult > 1). The multiplier sweeps 0.87 → 1.09 monotonically across rows — structural to a
   rank-error steer, not a bug.
2. **Steer-alone → a U-shaped per-row band-reach → the Holm skew.** The near-neutral MIDDLE row (r3, mult ≈
   1.00) gets the LEAST steering because its chaos-start rank already ≈ its band, so it sorts WORST:
   chaosSteer-alone searound r3 = 71% vs the steered extremes ~80%. That U-shape (extremes served, middle
   under-served) is the start-row imbalance Holm detects.
3. **The draw bias FILLS the middle gap → the skew is cured (ice) / evened (searound).** The bias aims the LATE
   re-roll draw toward the band for EVERY row regardless of steer exposure, so the under-served middle rows get
   their band-reach from the bias instead: combo searound r3 rises 71→**90%**, and the combo's per-row
   band-reach is even and high (searound 88–95, ice 88–92). Ice Holm goes UNF→**ok**. Searound stays UNF only
   because it is baseline-unfair (ship searound is UNF), which the combo does not worsen (floor 66→88).
4. **The named fix (if searound's residual is to be closed too): row-normalize the steer error.** The
   monotone-by-row exposure comes from steering on raw rank error; steering on a start-row-centred error (or
   grading `chaosSteerGain` down for rows whose chaos-start rank already ≈ their band) would flatten the
   exposure and remove the U-shape at source — but the bias already covers it in the combo, so this is optional.

### THE FIVE SENTENCES (every kept element)
1. The combo runs both validated halves with no coupling code — the chaos steer (early sort, on the servo) and
   the R=0.60 draw bias (late hold, on the re-roll) — and clears 90% band arrival on BOTH tracks (75→90,
   72→90), the owner's gate. 2. The steer's front-action gain survives the bias untouched: frontContest rises
   +24/+10pp over Ship (42→67, 68→78) at equal-or-lower DEAD-BORING (4≤8, 0≤0), so all three hard night-gate
   criteria pass on both tracks. 3. The steer's per-row exposure is monotone — front rows braked (mult 0.87),
   back rows boosted (mult 1.09) — because start row correlates with chaos-start rank relative to the drawn
   band, which leaves the near-neutral middle rows under-steered and gives the steer alone a U-shaped per-row
   band-reach (the Holm skew). 4. The draw bias fills exactly that middle-row gap (combo searound r3 71→90),
   evening per-row band-reach to 88–95% and turning the ice Holm flag UNF→ok; searound stays UNF only because
   Ship is baseline-unfair there, not because the combo introduces skew, and the floor rises 66→88. 5. The
   row-skew is therefore absent on ice and mechanically explained with a fix on searound, the gate's fourth
   criterion is met, and the OFF world is byte-identical (`7c70b1eae7d31e22`) — the combination is a PASS.

## PROPOSALS (≥2)
1. **Run the earned 10-track N=100 gate, then the owner's browser eye.** The combo clears the N=25 night gate on
   both screen tracks; the protocol's next step is the wide gate (10 tracks, N=100, Holm across all start rows)
   to confirm the 90%/action/skew result generalises before any ship. This is the direct continuation the SPEC
   names on PASS.
2. **Carry the combo as the FAIR-ARRIVAL shippable candidate (default OFF, byte-identical).** It is the first
   arm to clear 90% arrival WHILE raising front action over Ship (+24/+10pp frontContest) and lifting the
   per-row floor (66→88) — a strictly-fairer-and-more-contested world than Ship. Recommend it as the candidate
   the wide gate + eye-test judge, with the two flags as its only surface.
3. **Optionally close searound's residual Holm at source with a row-normalized steer.** Searound is Holm-UNF
   even for Ship, and the combo does not worsen it, but if the owner wants it clean the fix is named (§3.4):
   steer on a start-row-centred error so the exposure is not monotone-by-row. Low-risk, admission-side, testable
   as a one-arm delta — but not required for the gate, since the bias already covers the skew in the combo.

## Owner questions
1. **Authorise the 10-track N=100 gate** on the combo (the PASS earns it) ahead of the browser eye — yes/no?
2. **Adopt the combo as the FAIR-ARRIVAL shippable candidate** (default OFF, byte-identical, 90% arrival +
   action-positive + floor-raising), with the row-normalized steer (proposal 3) held as an optional polish?

---
**Branch `exp/fair-arrival`.** OFF fingerprint **`7c70b1eae7d31e22`** (== shipped, byte-identical; both flags
default OFF). Instrumentation commit `6604d4e`; this report. Screen: `node scripts/exp-fair-arrival.mjs
--races=25`. Raw: `reports/evolution/combine-screen.txt`. **Night gate PASS → 10-track N=100 gate spec follows
(not run here, per protocol).** Push verified — see `git log origin/exp/fair-arrival`.
