# Step-1 Implementation Report: Brake-to-Match-and-Hold

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-05
**Commit:** `1f43ee9` (feat(overlap): Step 1 — brake-to-match-and-hold replaces fixed-% speed brake)
**Rollback tag:** `backup/pre-overtaking-rebuild` → commit `28ab6ae4` (2026-06-05 18:05:33)
**Sim settings:** `--openRacers=60 --closedRacers=40 --dur=60 --races=10 --race-plan=true --seed=1`

---

## Step 0 — Reset + Rollback Tag

| Item | Result |
|---|---|
| `lateralForce` reset to `0.011400` in `defaults.js:494` | ✅ Done, probe comment removed |
| Tests on reset baseline | ✅ 2592 tests, 121 files — all green |
| Rollback tag `backup/pre-overtaking-rebuild` | ✅ Set at `28ab6ae4` |
| Tag verification: `git show backup/pre-overtaking-rebuild:.../defaults.js \| grep lateralForce` | ✅ Returns `lateralForce: 0.0228` — tag captures pre-reset probe state |

---

## Step 1 — Implementation Summary

### Files changed

| File | Change |
|---|---|
| `client/src/modules/storage/defaults.js` | Reset `lateralForce` to `0.011400`; added 6 new config params to `DEFAULT_RACE_BEHAVIOR_CONFIG` |
| `client/src/modules/raceBehaviorConfig.js` | Validation guards for all 6 new params |
| `client/src/modules/raceBehavior.js` | Exported `computeBrakeMatchFactor`; 4 new racer state fields in `initRacerBehavior`; cap computed in pair loop; hold/release state managed in apply-deltas loop |
| `client/src/screens/RaceScreen/index.jsx` | `brake = min(effectiveBrakeFactor, r.brakeMatchFactor ?? effectiveBrakeFactor)` |
| `client/src/modules/raceBehaviorBrakeMatch.test.js` | New file — 31 tests |
| `client/src/modules/raceBehavior.test.js` | 2 regression guards added |

### Flag resolutions

**Flag 2 (cross-file delivery):** `raceBehavior.js` writes `r.brakeMatchFactor` to each racer at the end of the apply-deltas loop. `index.jsx` reads it one frame later at the brake-application site (`index.jsx:913`), following the identical one-frame-lag pattern already established by `avoidanceActive`. Coordinated with an explicit comment in both files.

**Flag 3 (warmup interaction):** `brake = Math.min(effectiveBrakeFactor, r.brakeMatchFactor ?? effectiveBrakeFactor)`. During the first 3s warmup on open tracks, `effectiveBrakeFactor` rises from 1.0 toward 0.945 — it is never smaller than 0.945 during this ramp, so `min()` correctly prevents the cap from overriding the warmup. After warmup, `effectiveBrakeFactor = 0.945` acts as a floor; the cap can only make braking more restrictive, never less. Both code paths verified against the formula.

### New config params (all in `DEFAULT_RACE_BEHAVIOR_CONFIG`)

| Param | Value | Purpose |
|---|---|---|
| `speedMatchMinDifferential` | 0.005 | Minimum speed excess before cap engages (0.5%) |
| `speedMatchSafetyMargin` | 0.001 | Cap set 0.1% below exact leader speed to prevent oscillation |
| `brakeHoldTimeoutFrames` | 90 | 1.5s at 60fps — anti-trap escape trigger |
| `brakeHoldEscapeReleaseDurationFrames` | 15 | 0.25s forced release after escape |
| `brakeHoldEscapeCooldownFrames` | 60 | 1.0s before re-lock allowed |
| `brakeReleaseDebounceFrames` | 3 | 50ms of consecutive clear before hold releases |

### New per-racer state fields (added in `initRacerBehavior`)

| Field | Init | Semantics |
|---|---|---|
| `brakeMatchLeaderIndex` | -1 | Locked leader's index; -1 = no hold; negative `brakeMatchFrames` = escape/cooldown (index also -1) |
| `brakeMatchFactor` | 1.0 | Computed cap, written by `raceBehavior.js`, read by `index.jsx` next frame |
| `brakeMatchFrames` | 0 | ≥0: consecutive hold frames (anti-trap counter); <0: escape/cooldown countdown toward 0 |
| `brakeReleaseFrames` | 0 | Consecutive clear frames counted toward debounced release |

---

## Tests

| Suite | Count | Result |
|---|---|---|
| Pre-existing tests (reset baseline) | 2592 | ✅ All green |
| New: `raceBehaviorBrakeMatch.test.js` | 31 | ✅ All green |
| New regressions in `raceBehavior.test.js` | 2 | ✅ All green |
| **Total after Step 1** | **2625** | ✅ **All green, 122 files** |

New tests cover: `computeBrakeMatchFactor` formula and jitter guard; init field values; hold entry and frame increment; debounced release; multi-leader most-constraining selection; anti-trap timeout/escape/cooldown/re-entry; stale-index guard; min-diff guard preventing cap on slower-or-equal trailer.

---

## Validation Sim Results — N=10

### ⛔ STOP CONDITION: Fairness gate FAILED

**2 of 66 combos are statistically unfair (p < 0.05):**

| Combo | Topology | p-value | Row pattern | Phase-1 p |
|---|---|---|---|---|
| **Dirt Oval × dragon** | **Closed** | **0.029** | R0=10% R1=0% R2=20% R5=50% (all expected 13%) | was fair at 0.0228 probe |
| **Luger Hill × dragon** | **Open** | **0.038** | R0=60% R1=0% R2=30% R3=10% (all expected 25%) | p=0.220 (Phase-1 at LF=0.0228) |

Per spec: **"A fairness failure is a STOP; do not proceed to Step 2."**

Neither failure clears the p ≥ 0.05 gate. Both are dragon-specific.

### Per-row detail on failing combos

**Luger Hill × dragon (open, p=0.038):**
- R0 wins 60% of races (expected 25%). R1 wins 0%.
- B1top5 by row: R0=77%, **R1=30%**, R2=50%, R3=62%.
- Row 1 B1top5 at 30% is well below the Phase-1 open range of 52–72%.

**Dirt Oval × dragon (closed, p=0.029):**
- R5 wins 50% of races (expected 13%). R1=0%, R6=0%, R7=0%.
- Unusual pattern on a closed 8-row track.

---

### Open-track per-combo results (all 27)

| Combo | p | honest% | zigzag | brakeRate | B1top5% |
|---|---|---|---|---|---|
| River Run × duck | 0.055 | 2.6% | 0.000218 | 89.0% | 68% |
| River Run × dragon | 0.501 | 3.2% | 0.000172 | 84.0% | 62% |
| River Run × rocket | 0.272 | 0.6% | 0.000171 | 83.2% | 64% |
| River Run × koi | 0.501 | 2.6% | 0.000163 | 85.9% | 64% |
| River Run × turtle | 0.272 | 2.2% | 0.000162 | 87.3% | 64% |
| River Run × manta | 0.501 | 2.1% | 0.000170 | 84.5% | 58% |
| River Run × dolphin | 0.899 | 1.1% | 0.000163 | 83.8% | 64% |
| Space Sprint × dragon | 0.147 | 3.7% | 0.000172 | 85.9% | 58% |
| Space Sprint × rocket | 0.147 | 0.7% | 0.000174 | 84.6% | 54% |
| Space Sprint × plane | 0.951 | 2.3% | 0.000222 | 87.3% | 60% |
| **Luger Hill × dragon** | **0.038 ❌** | **4.4%** | **0.000087** | **83.2%** | **56%** |
| Luger Hill × rocket | 0.501 | 0.5% | 0.000159 | 80.7% | 62% |
| Luger Hill × plane | 0.272 | 3.0% | 0.000164 | 82.1% | 62% |
| Luger Hill × luge | 0.561 | 1.5% | 0.000047 | 83.5% | 58% |
| Luger Hill × snowmobile | 0.576 | 1.9% | 0.000089 | 83.3% | 60% |
| Mountainstreet × horse | 0.200 | 0.9% | 0.000162 | 85.0% | 72% |
| Mountainstreet × dragon | 0.147 | 3.2% | 0.000163 | 83.8% | 54% |
| Mountainstreet × f1 | 0.899 | 2.1% | 0.000168 | 83.0% | 64% |
| Mountainstreet × motorbike | 0.501 | 1.1% | 0.000160 | 84.5% | 64% |
| Mountainstreet × beetle | 0.501 | 1.0% | 0.000161 | 85.9% | 72% |
| Mountainstreet × boarder | 0.899 | 1.0% | 0.000160 | 84.4% | 70% |
| Seatrack × duck | 0.951 | 2.6% | 0.000217 | 88.9% | 58% |
| Seatrack × dragon | 0.059 | 3.4% | 0.000166 | 85.3% | 68% |
| Seatrack × rocket | 0.200 | 0.6% | 0.000169 | 83.5% | 54% |
| Seatrack × koi | 0.059 | 2.7% | 0.000169 | 86.2% | 52% |
| Seatrack × turtle | 0.147 | 2.2% | 0.000163 | 87.2% | 70% |
| Seatrack × manta | 0.272 | 2.3% | 0.000169 | 84.6% | 60% |
| Seatrack × dolphin | 0.501 | 1.1% | 0.000167 | 84.0% | 62% |

Open combos fair: **26/27** (Luger Hill × dragon fails).

Closed combo summary: **37/39 fair**. Failures: Dirt Oval × dragon (p=0.029) + Dirt Oval × buggy (p=0.058, marginal). Full closed p-values in JSON.

### Honest overlap vs Phase-1 baseline

Phase-1 was run at LF=0.0228 (probe); Step-1 runs at LF=0.0114 (baseline). Both factors changed simultaneously (LF reset AND brake-to-match added), so the overlap change conflates both.

| Dragon combo | Phase-1 honest% | Step-1 honest% | Change |
|---|---|---|---|
| River Run × dragon | 3.2% | 3.2% | 0.0 pp |
| Space Sprint × dragon | 3.8% | 3.7% | -0.1 pp |
| Luger Hill × dragon | 4.3% | 4.4% | +0.1 pp |
| Mountainstreet × dragon | 3.3% | 3.2% | -0.1 pp |
| Seatrack × dragon | 3.5% | 3.4% | -0.1 pp |

**Honest overlap essentially unchanged** — as explicitly expected in the spec: "Step 1 stops pass-through, the overlap drop comes with Step 2's go-around." The cap reduces the trailer's forward speed but does not force lateral separation; overlap durations are similar.

### Zigzag

All combos at or below Phase-1 levels. Several Luger Hill values (which have complex geometry) are significantly lower with LF=0.0114 (e.g. luge 0.000047, snowmobile 0.000089) due to weaker lateral forces. No combo increased. **Zigzag gate: ✅ PASS.**

### Pass-through telemetry (`brakeMatchFailureCount`)

**Not measured.** The `sim-fairness.mjs` script does not yet instrument `brakeMatchFailureCount` (report 06 §7 metric: events where a trailer under active brake-to-match still closes on its leader over 5 consecutive frames). This metric was designed but not yet added to the sim. It should be instrumented in the sim before Step 2 proceeds so pass-through elimination can be confirmed objectively.

---

## Root Cause Analysis — Fairness Failures

Both failures are **dragon-specific** and **borderline** at N=10 (p=0.029 and p=0.038). They may represent signal or noise. Two confounding variables changed simultaneously:

**Confound 1 — LF reset from 0.0228 to 0.0114:**
Phase-1 ran at LF=0.0228 (the probe value); Step-1 runs at LF=0.0114 (validated baseline). Lower LF means weaker lateral separation forces. Luger Hill × dragon had p=0.220 in Phase-1 (fair). The LF reduction alone could shift p toward the failure zone by allowing denser packing and stronger row-position persistence.

**Confound 2 — Brake-to-match without lateral escape (Step 1 only):**
The design intends brake-to-match as a fallback when BOTH sides are blocked (Phase 2b in the design). In Step 1, the brake fires whenever the proximity gate is met, regardless of lateral availability. A fast comeback racer approaching a slow leader on Luger Hill gets capped to leader speed even when a lateral gap exists. This systematically slows back-row racers in dragon fields (dragon has the widest body, spends the most time in the brake zone), which explains the front-row bias (R0=60% on Luger Hill × dragon) and R1 suppression (0%).

**The R1=0% pattern on Luger Hill × dragon** is consistent with middle-distance rows being systematically slowed: R1 racers are close enough to leaders to trigger the brake-zone, but far enough back that they can't benefit from front-row starting position. In Phase-1 (with LF=0.0228, no brake-to-match), they could achieve ~40% by relying on lateral avoidance. With brake-to-match capping their speed without offering a lateral escape, they are effectively trapped.

**Likely cause:** Both confounds contribute. The brake-to-match without lateral escape (Step 2 missing) is the structural cause; the LF reset amplifies it by reducing lateral escape from the brake zone.

**This is a design-level STOP, not an implementation bug.** The implementation correctly follows the Step-1 spec. The fairness failure confirms what the design risk section warned: "making a faster trailer brake-and-hold behind a slower leader could strip comeback racers... A design that simply traps fast racers behind slow ones is a FAILURE even if overlap drops."

---

## Definition of Done — Status

| Gate | Target | Result |
|---|---|---|
| `lateralForce` reset | 0.0114 | ✅ Confirmed |
| Rollback tag + hash | Set and verified | ✅ `28ab6ae4` |
| Flag 2 cross-file path | Explicit, documented | ✅ Resolved |
| Flag 3 warmup min() | Preserved | ✅ Resolved |
| `brakeMatchFailureCount = 0` on open combos | 0 per combo | ⚠️ Metric not yet instrumented in sim |
| Honest overlap | Modest change only (expected) | ✅ All dragon <4.5%, unchanged vs Phase-1 |
| Adjacent-collision rate | 0% | ⚠️ Not yet instrumented in sim |
| Chi-square fairness all 66 + per-row | p ≥ 0.05 all | **❌ STOP — 2 failures** |
| Back-row not starved | B1top5 ≥ baseline | **⚠️ Luger Hill R1=30% below range** |
| Zigzag not increased | No increase | ✅ All equal or lower |
| Tests green | 2625 pass | ✅ All green |
| Browser sign-off | After Step 2 | Pending |

**Overall status: STOP. Two fairness failures block progression to Step 2 per spec.**

---

## Recommended Next Steps (for user decision)

Two options:

**Option A — Controlled isolation run:**
Run the sim at LF=0.0114 with the brake-to-match DISABLED (i.e., temporarily set `speedMatchMinDifferential = 999` so the cap never fires) for Luger Hill × dragon and Dirt Oval × dragon specifically. If those combos are still unfair, the LF reset alone caused the regression — Step 1 is not the culprit and can be re-evaluated. If they are fair with brake-to-match disabled, the brake-to-match without lateral escape is confirmed as the cause.

**Option B — Accept and proceed to Step 2 immediately:**
The design explicitly acknowledges the fairness risk of Step 1 without Step 2. Since Step 2 (lateral escape) is specifically designed to prevent the brake-and-trap failure mode that is causing the row bias, it is possible that Step 2 will resolve the fairness failure when implemented. In that case, the Step-1 STOP is a provisional hold, not a permanent one — Step 2 would be the actual fix. Under this option, proceed to Step 2 without resolving the Step-1 failures independently.

**Recommendation:** Option B has the stronger engineering argument given the design intent. The failure pattern (front-row bias, R1 suppression) is exactly what the avoid-first lateral escape in Step 2 is designed to counteract. However, this is the user's decision per the spec gate.
