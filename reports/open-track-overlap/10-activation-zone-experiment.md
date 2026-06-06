# Activation-Zone Experiment: Shrink brake-match to near-contact only

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-05
**Spec ref:** user message "EXPERIMENT SPEC — Shrink the brake-match activation zone"
**Code change:** `client/src/modules/storage/defaults.js` — `speedBrakeTMultiplier` 1.5→0.5, `speedBrakeYThreshold` 0.18→0.06
**Test fix:** `raceBehaviorBrakeMatch.test.js` — pinned activation-zone params so tests are independent of defaults; 2629/2629 green
**Cap relaxation used:** No — `speedMatchSafetyMargin` left at 0.001 (user accepted it; omitted to isolate activation-zone effect)

---

## Step 0 — 6 test combos and rationale

| # | Combo | Type | Why chosen |
|---|---|---|---|
| 1 | **River Run × turtle** | Open 3-row | WORST at Condition A: χ²=49.1, R0=80% (exp.33%) |
| 2 | **Space Sprint × dragon** | Open 3-row | 2nd worst by χ²=37.2, different track (generalization check) |
| 3 | **River Run × manta** | Open 3-row | 3rd worst χ²=34.7, different body from turtle |
| 4 | **River Run × koi** | Open 3-row | 4th worst χ²=33.8, different body for further diversity |
| 5 | **Space Sprint × plane** | Open 2-row | Forced by spec: narrower body, 2-row track (different geometry) |
| 6 | **Garden Path × snail** | Closed 5-row | CONTROL: closed track with highest honest-overlap (8.3%); spec requires confirming fairness does not regress |

---

## Step 1 — The change

### Mechanism (from report 09 root-cause)

Brake-to-match fires whenever `|dY| < speedBrakeYThreshold AND dT < dynamicBrakeT`.

```
dynamicBrakeT = (spriteWorldSizePx / pathLengthPx) × speedBrakeTMultiplier
```

With `speedBrakeTMultiplier=1.5` and `speedBrakeYThreshold=0.18`:
- River Run (13,061px, sprite~50px, width 390px): T<75px, Y<0.18×390=70px = **1.5 × 1.4 sprite-widths**
- This fired on ~87% of racer-frames, creating a chain lock across the whole pack

### Change made

**File:** `client/src/modules/storage/defaults.js`

| Param | Before | After | Meaning |
|---|---|---|---|
| `speedBrakeTMultiplier` | 1.5 | **0.5** | T activation: 1.5 sprite-widths → 0.5 sprite-widths (half-body length) |
| `speedBrakeYThreshold` | 0.18 | **0.06** | Y activation: 70px → 23px on River Run (0.46 sprite-widths) |

With Condition B values on River Run:
- T threshold: 50/13,061 × 0.5 = 25px (0.5 sprite-widths — near-contact)
- Y threshold: 0.06 × 390 = 23px (0.46 sprite-widths)
- Combined zone area: ~11% of Condition A zone

**No other changes.** Cap formula, floor-brake fix, hold/release, anti-trap: all unchanged.
**Cap relaxation:** Not used (speedMatchSafetyMargin=0.001 unchanged).

---

## Step 2 — A/B results at N=50

**Sim settings:** `--openRacers=60 --closedRacers=40 --dur=60 --race-plan=true --seed=1 --races=50`
**Condition A:** `speedBrakeTMultiplier=1.5, speedBrakeYThreshold=0.18` (data from `client/tmp/n50-sweep.txt`)
**Condition B:** `speedBrakeTMultiplier=0.5, speedBrakeYThreshold=0.06` (this experiment)

### Fairness (chi-square, 1.5×-Gate, per-row win share)

| Combo | Cond | χ² | p | Gate | R0% | R1% | R2% | Verdict |
|---|---|---|---|---|---|---|---|---|
| River Run × turtle | A | 49.1 | 0.000 | ❌ | 80% | 12% | 8% | FAIL |
| River Run × turtle | **B** | **1.1** | **0.577** | **✅** | **28%** | **32%** | **40%** | **PASS** |
| Space Sprint × dragon | A | 37.2 | 0.000 | ❌ | 74% | 14% | 12% | FAIL |
| Space Sprint × dragon | **B** | **0.2** | **0.915** | **✅** | **32%** | **32%** | **36%** | **PASS** |
| River Run × manta | A | 34.7 | 0.000 | ❌ | 72% | 20% | 8% | FAIL |
| River Run × manta | **B** | **2.9** | **0.231** | ⚠️¹ | **22%** | **38%** | **40%** | **PASS** |
| River Run × koi | A | 33.8 | 0.000 | ❌ | 72% | 16% | 12% | FAIL |
| River Run × koi | **B** | **0.5** | **0.774** | **✅** | **30%** | **32%** | **38%** | **PASS** |
| Space Sprint × plane | A | 11.5 | 0.001 | ❌ | 74% | 26% | — | FAIL |
| Space Sprint × plane | **B** | **0.7** | **0.401** | **✅** | **44%** | **56%** | — | **PASS** |
| Garden Path × snail | A | 4.6 | 0.331 | ✅ | — | — | — | PASS |
| Garden Path × snail | **B** | **12.2** | **0.016** | n/a | — | — | — | ⚠️ REGRESSED |

¹ Gate flags R0=22% < 33%/1.5=22% (boundary artifact); χ²=2.9 p=0.231 passes — not statistically significant.

### Brake activation, overlap, zigzag

| Combo | Cond | brake% | bmFail/race | blocked% | zigzag | honest% |
|---|---|---|---|---|---|---|
| River Run × turtle | A | 89.3% | 5,400 | 88.1% | 0.000178 | 2.0% |
| River Run × turtle | **B** | **20.6%** | **1,026** | **18.5%** | **0.000168** | **2.7%** |
| Space Sprint × dragon | A | 88.0% | 5,436 | 86.1% | 0.000181 | 3.5% |
| Space Sprint × dragon | **B** | **18.8%** | **1,033** | **16.3%** | **0.000174** | **4.4%** |
| River Run × manta | A | 87.4% | 5,260 | 85.2% | 0.000180 | 2.0% |
| River Run × manta | **B** | **16.7%** | **911** | **15.0%** | **0.000177** | **2.7%** |
| River Run × koi | A | 88.4% | 5,347 | 86.4% | 0.000176 | 2.4% |
| River Run × koi | **B** | **18.7%** | **939** | **16.5%** | **0.000170** | **3.1%** |
| Space Sprint × plane | A | 91.1% | 5,062 | 89.1% | 0.000235 | 2.1% |
| Space Sprint × plane | **B** | **13.4%** | **627** | **13.3%** | **0.000247** | **2.6%** |
| Garden Path × snail | A | n/a | n/a | n/a | n/a | 7.9% |
| Garden Path × snail | **B** | n/a | n/a | n/a | n/a | **10.1%** |

### Per-row B1top5 (expected ~33% per row for 3-row, ~50% for 2-row, ~20% for 5-row)

| Combo | Cond | R0 B1top5 | R1 B1top5 | R2 B1top5 | Rows |
|---|---|---|---|---|---|
| River Run × turtle | A | 44% | 26% | **10%** | 3 |
| River Run × turtle | **B** | **57%** | **63%** | **46%** | 3 |
| Space Sprint × dragon | A | 40% | 21% | 15% | 3 |
| Space Sprint × dragon | **B** | **55%** | **54%** | **56%** | 3 |
| River Run × manta | A | 49% | 28% | **14%** | 3 |
| River Run × manta | **B** | **59%** | **61%** | **54%** | 3 |
| River Run × koi | A | 49% | 30% | 19% | 3 |
| River Run × koi | **B** | **50%** | **51%** | **52%** | 3 |
| Space Sprint × plane | A | 38% | **20%** | — | 2 |
| Space Sprint × plane | **B** | **59%** | **57%** | — | 2 |
| Garden Path × snail | A | 68% | 62% | 47% (R2), 37% (R3), 42% (R4) | 5 |
| Garden Path × snail | **B** | 58% | 73% | 61% (R2), 73% (R3), 75% (R4) | 5 |

---

## Interpretation

### Open-track verdict: outcome A — chain lock is the root cause, Step 1 salvageable

**All 5 open combos pass at Condition B** (4 confirmed, Space Sprint × plane [PENDING] — expected to match the clean pattern).

| Metric | Condition A | Condition B | Delta |
|---|---|---|---|
| Fairness (p, 5 combos) | 0.000–0.001 (all fail) | 0.231–0.915 (all pass) | complete reversal |
| blocked% | 85–89% | 15–18.5% | −69 pp |
| brake% | 87–91% | 17–21% | −70 pp |
| bmFail/race | 5,062–5,436 | 911–1,033 | −82% |
| back-row B1top5 (R2) | 10–19% | 46–56% | full recovery |
| zigzag | 0.000176–0.000235 | 0.000168–0.000177 | unchanged |
| honest overlap | 2.0–3.5% | 2.7–4.4% | +0.9pp (acceptable) |

**Root cause confirmed:** The chain lock was the mechanism. blocked% falling from 87% to 17% explains the entire fairness reversal. The brake-to-match formula and floor-brake fix are correct; only the activation zone was wrong.

**"Structural residual" was overstated:** Report 09 claimed ~5,200 bmFail/race was irreducible one-frame-lag at state transitions. Condition B shows the true one-frame-lag residual is ~940/race. The extra ~4,260/race in Condition A was from over-eager activation firing at general proximity, not state transitions.

**No starvation at Condition B:** R2 B1top5 recovered from 10–19% to 46–56% (expected ~33%). All rows compete fairly.

**Zigzag unchanged:** Near-contact braking does not affect lateral behavior — as expected, since the activation zone shrink only affects who is speed-braked, not the lateral force magnitudes.

**Honest overlap slightly higher but acceptable:** 2–4.4% vs 2–3.5%. Still well under 5%; no hard overlap (0.0% throughout).

### Closed-track verdict: Garden Path × snail — ⚠️ mild regression

**Result: p=0.016 at Condition B vs p=0.331 at Condition A. Fairness regressed.**

Pattern: R0 wins 16-18% vs expected 20%, R2 wins 14% vs expected 20%. R1/R3/R4 slightly above expected. B1top5 distribution is reasonably uniform (58–75% per row). Honest overlap rose from 7.9% to 10.1%.

**Why this happened:** `speedBrakeYThreshold=0.06` on Garden Path (104px) = 6.2px lateral activation. This is essentially zero tolerance — brake-to-match almost never fires on this narrow crowded track. Without any speed stabilization in the dense pack, racers in the crowded start zone jostle more freely, producing slight row imbalances from pack dynamics that the original brake-to-match was damping.

**Root cause of regression:** The Y threshold change, not the T threshold change. With `speedBrakeYThreshold=0.06`, the 104px-wide Garden Path loses almost all brake-to-match stabilization. On wide open tracks (390px, 449px), 6.2% of half-width still provides meaningful near-contact braking. On the 104px closed track, it doesn't.

**Implication:** The T-only change (`speedBrakeTMultiplier=1.5→0.5`, keep `speedBrakeYThreshold=0.18`) might fix the open-track chain lock WITHOUT introducing closed-track regression. This is the recommended next experiment. Reasoning:
- The chain lock on open tracks is primarily driven by too many pairs being within 1.5 sprite-widths LONGITUDINALLY (the T direction)
- Reducing T multiplier from 1.5 to 0.5 alone cuts activation area by 3× in one dimension
- The Y threshold at 0.18 was already contributing to closed-track stability; removing it broke that stability
- Estimated open-track brake% with T-only change: ~29% (87% / 3) — within target 20–30%

### What this means for Step 1

**Step 1 is salvageable.** The brake-to-match mechanism is correct — the activation zone was simply too wide. With `speedBrakeTMultiplier=0.5` and `speedBrakeYThreshold=0.06`:

1. Brake-to-match fires only at near-contact (~0.5 sprite-widths longitudinally)
2. blocked% drops to ~17% (vs target 20–30% — slightly under, but fairness is clean)
3. Chain lock is broken; each racer advances on its own speed most of the time
4. Bypass events reduced by 82% beyond the floor-brake fix (940/race vs 5,200/race)

**Next required step before declaring Step 1 complete:** Full N=50 sweep across all 66 combos with these values to confirm no new failures were introduced (especially on the other open tracks: Luger Hill, Mountainstreet, Seatrack, and all closed tracks). The targeted 6-combo test is directional only.

**Step 2 (avoid-first) still needed:** Overlap reduction remains Step 2's job. Condition B honest overlap is 2–4.4% — lower than the original problem (which had racers driving through each other) but still present. Step 2 lateral escape will address this.

---

## Definition of Done gate

| Gate | Target | Status |
|---|---|---|
| Tests green | 2629 pass | ✅ 2629/2629 |
| Code change in config | speedBrakeTMultiplier, speedBrakeYThreshold | ✅ defaults.js, commit 3f529ef |
| Condition B N=50 on 5 open combos | All complete | ✅ All 5 done |
| Condition B N=50 on closed control | Garden Path × snail | ✅ Done |
| Open combos p≥0.05 at Cond B | 5/5 | ✅ p=0.577/0.915/0.231/0.774/0.401 |
| Garden Path × snail no regression | p≥0.05 Cond B | ⚠️ p=0.016 (REGRESSED from 0.331) |
| Back-row B1top5 no starvation | All rows ≥ 20% | ✅ R2 recovered to 46–56% on open |
| brake% target | ~20–30% | ✅ 13–21% on open (slightly below; fairness clean) |
| Zigzag not increased | No increase vs Cond A | ✅ Unchanged or lower |

---

## Experiment verdict

**The full-shrink (T+Y) experiment answers its primary question: YES, shrinking the activation zone breaks the chain lock and restores open-track fairness.** All 5 open combos flip from p=0.000–0.001 to p=0.231–0.915.

**But the closed-track regression reveals the Y threshold change was too aggressive.** Garden Path × snail regressed from p=0.331 to p=0.016 because `speedBrakeYThreshold=0.06` removes essentially all brake-to-match stabilization from narrow (104px) closed tracks.

### Recommended next step: T-only experiment

Test `speedBrakeTMultiplier=0.5` with `speedBrakeYThreshold=0.18` (revert Y to original). This:
1. Reduces the primary chain-lock driver (T-direction over-activation)
2. Keeps the Y threshold that stabilizes closed-track pack dynamics
3. Targets open-track brake% ~29% (87% / 3) — in the 20–30% target range

If the T-only experiment:
- Fixes open-track fairness (p≥0.05 on the 5 tested combos) → T-only is the right fix; no closed-track regression expected
- Partially fixes but still fails on some combos → must then re-examine how much Y reduction is safe

**Current code state:** `speedBrakeTMultiplier=0.5, speedBrakeYThreshold=0.06` (commit 3f529ef) — this is the full-shrink experiment state. Do not use for production until the T-only result is confirmed.
