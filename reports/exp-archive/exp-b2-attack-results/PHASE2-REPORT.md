# B2-Heroes + Pack-Release — Phase 2 Hybrid Report + Final Synthesis

**Date:** 2026-07-19 | **Author:** CC | **Status:** Complete — Owner decision (go/pivot/hybrid)
**Sweep:** 3 arms × 4 tracks × 100 races = **1,200 races**, seed=1, 60s, `--hero-map` (Holm on all arms).
**Raw data:** `exp-b2-attack-results/phase2/{ALL,Arm*}.csv` + `sweep.log`. Baseline reference: 29.27 top-5 swaps/race (no features).

## Results (vs no-feature baseline = 29.27)

| arm | config | top-5/race | Δ | B1 (all tracks) | B2 (all tracks) | Holm |
|---|---|---|---|---|---|---|
| **Arm-A** | pack-release V3 alone | 33.52 | **+15%** | ≥70% ✓ | luger 67.2%, searound 69.5% ✗ | 3/4 |
| **Arm-B** | B2 attackers ×3 alone | 35.48 | **+21%** | ≥70% ✓ | ≥70% ✓ (min searound 70.1%) | 2/4 |
| **Arm-C** | both | 37.08 | **+27%** | ≥70% ✓ | luger 68.8%, searound 68.8% ✗ | 3/4 |

## Findings

**1. Composition is partial-stacking with interference (sub-additive).** Both (+27%) > either alone, but additive would be ~+36% (pack +15 ⊕ B2 +21). Actual +27% captures ~75% of the combined potential → the released pack and the authored attackers compete for the same front-slot space, diluting each other by ~25%. Not catastrophic, but they don't cleanly add.

**2. B2-attackers DOMINATE pack-release — the headline.** Arm-B (B2 ×3 alone) beats Arm-A (pack V3 alone) on *both* axes:
   - **More action:** +21% vs +15%.
   - **Cleaner fairness:** Arm-B holds **B2 ≥70% on every track** and keeps Holm at baseline (2/4, zero added damage). Arm-A breaks B2 on luger + searound (67-69%) and pushes Holm to 3/4 (adds dirt-oval).
   The fairness costs in Arm-A and Arm-C trace **entirely to the pack lever** — the attackers never damage B2 or Holm.

**3. The hybrid's extra action comes bundled with the pack lever's fairness costs.** Arm-C (+27%) is the highest action, but it inherits exactly the B2-break (luger + searound <70%) and the Holm 3/4 that the pack lever carries. You cannot get the +27% without re-accepting pack-release's fairness dip.

**4. Count=3 still hasn't hit a wall** (yield 0.98 across all arms). B2-alone at count=4+ is unexplored and could push the fairness-clean number above +21%.

## Recommendation: **ship B2-attackers count=3 alone (Arm-B); do NOT ship pack-release**

The three-phase program converges on a clear answer. **B2 count=3 alone is the best option on the table:** +21% top-5 OUTCOME action (the second-largest of any single lever tested, and *more* than pack-release), with **every fairness gate clean** (B1 + B2 ≥70% on all four tracks, Holm at the pre-existing baseline with zero added damage). It strictly dominates pack-release, which delivers less action *and* incurs a B2-break + Holm regression.

**Pack-release should be shelved** (kept as flag-gated dead code, default OFF — it's already byte-identical): B2-attackers give more action for less fairness cost, so there's no reason to ship the pack lever, alone or in the hybrid.

**The hybrid (Arm-C, +27%) is a conditional option**, not the default: it buys ~+6 action points over B2-alone, but only by re-accepting pack-release's B2-break and Holm-3/4. Take it *only* if the owner's eye-test says the extra motion is worth the fairness dip on luger + searound.

### Two things gate the final call (both the Owner's)
1. **Eye-test.** B2 count=3 is *authored* action — 3 scripted attackers surging to rank 5 then falling. On the numbers it's excellent, but whether 3 simultaneous authored duels read as "a race" or "choreography" is the human judgment. Record 2-3 Arm-B races on luger-hill + searound. (Pack-release's action was emergent — a different feel — but it's dominated on the numbers, so the eye-test choice is really Arm-B vs Arm-C.)
2. **Optional probe:** count=4 B2-alone, to see if the fairness-clean action pushes past +21% before committing.

### If Arm-B is chosen → integration
- Wire `b2AttackHeroes=3, b2AttackPeakRank=5, b2AttackFinalRank=7` into the browser (default OFF) + a DevScreen toggle, so the eye-test runs the identical code the sim measured. Byte-identical-OFF is already proven (`4ec8e64dd2641ad3`); tests 130/130.
- The pre-existing baseline Holm 2/4 (luger-hill + searound) remains a *separate* open issue worth its own investigation — it predates every feature here and is not caused by B2-attackers.

## Evidence trail (full program)
- Concept reviews: `CONCEPT-REVIEW-CC.md` (pack-release), `CONCEPT-REVIEW-CC-B2HEROES.md`.
- Pack-release sweep: `EXP-PACK-RELEASE-REPORT.md` (V3 = +15%, B2-break, Holm +1).
- B2 Phase 1a: `PHASE1A-REPORT.md` (finalRank is the knob; peak depth irrelevant).
- B2 Phase 1b: `PHASE1B-REPORT.md` (count scales: 1→+7%, 2→+10%, 3→+21%).
- Count=3 Holm confirm: 2/4 = baseline, no regression.
- Phase 2 hybrid: this report.
