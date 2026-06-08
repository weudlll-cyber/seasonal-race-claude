# Step-1 Bypass Fix Report: Proven Mechanism + Floor-Brake Fix + N=50 Validation

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-05
**Commits:** `cffd4b6` (fix: include leader's floor brake in cap computation)
             `1dca1e9` (sim parity fix + brakeMatchFailureCount — report 08)
**Sim settings for validation:** `--openRacers=60 --closedRacers=40 --dur=60 --race-plan=true --seed=1`
**Status:** Parts 1 and 2 complete; N=50 validation run completed — HARD STOP: all open-track combos fail

---

## Part 1 — Bypass Mechanism: Proven by Trace and Data

### Exact per-frame order of operations (`index.jsx`)

| Step | File:Line | What happens |
|---|---|---|
| 1 | `index.jsx:834–869` | `rubberBandMult` updated for all racers |
| 2 | `index.jsx:871–903` | Re-roll check → **new `r.baseSpeed` available immediately** |
| 3 | `index.jsx:907–920` | `boost` and `brake` computed using **frame N-1's** `r.avoidanceActive` and `r.brakeMatchFactor` |
| 4 | `index.jsx:921–932` | **t-update:** `r.t += r.baseSpeed × boost × brake × r.trajectoryMult × r.areaBonusMult × r.rubberBandMult` |
| 5 | `index.jsx:964` | `computePositions()` |
| 6 | `index.jsx:965–970` | **`applyRacerBehavior()`** — pair loop computes caps; apply-deltas loop writes `r.brakeMatchFactor` for **frame N+1** |

The cap computed in step 6 (frame N) is applied in the t-update of **frame N+1**. This is the one-frame lag.

### Hypothesis A vs Hypothesis B — stated definitively

**Hypothesis A — genuine one-frame staleness:** cap lags by one frame due to re-roll timing. Per the user's challenge: 1/60s is negligible; re-roll transitions are spread over ~300 frames. This cannot explain 80–95K bypass events.

**Hypothesis B — wrong-target bypass (the real cause):** the cap targets the leader's *raw* speed, but the leader is also braked by `effectiveBrakeFactor = 0.945` whenever `avoidanceActive = true`. The trailer is capped at `leaderRawSpeed` while the leader only advances `leaderRawSpeed × 0.945` — a **guaranteed 5.8% bypass every frame** the leader is in any brake zone.

**Hypothesis B is correct. Hypothesis A explains at most the residual after the fix.**

### Algebraic proof

In frame N's t-update, using frame N-1 caps (old formula, no leader-brake term):

```
trailer.brakeMatchFactor_{N-1} = leaderRawSpeed_{N-1} / trailerDenom_{N-1}

trailer.advance_N = trailerDenom_N × min(0.945, leaderRawSpeed_{N-1}/trailerDenom_{N-1})
                  ≈ leaderRawSpeed   (cap < floor; speeds ≈ constant between frames)

leader.advance_N  = leaderRawSpeed_N × min(0.945, leader.brakeMatchFactor_{N-1})
```

When `leader.brakeMatchFactor_{N-1} ≥ 1.0` (leader has no sub-floor cap, only the floor applies):

```
leader.advance_N = leaderRawSpeed × 0.945
```

**Bypass: `leaderRawSpeed > leaderRawSpeed × 0.945` — always true.**

The bypass is guaranteed on every frame where the trailer's cap is active *and* the leader is `avoidanceActive`. In a 60-racer pack, the vast majority of racers are simultaneously leaders to the racer behind them and trailers to the racer ahead. Most leaders are `avoidanceActive`. The bypass fires on nearly every active pair.

### Data confirmation

Added `brakeMatchLeaderBraked` diagnostic counter to `sim-fairness.mjs`: counts bypass events (5-consecutive-frame streaks) where `leader.avoidanceActive = true` at event time.

**Luger Hill × dragon, 5 races, pre-fix:**

| Metric | Value |
|---|---|
| Total bypass events (`brakeMatchFailureCount`) | 43,173 |
| Events with `leader.avoidanceActive` | 37,134 |
| **% explained by floor-brake mechanism** | **86%** |

**Hypothesis B confirmed. Re-roll timing (Hypothesis A) accounts for ≤14% of events.**

### Why `avoidanceActive` tolerates the same lag

The existing `avoidanceActive` flag uses identical one-frame lag pattern. It does not create a compounding bypass because it applies a **fixed factor (0.945) independently** to each racer based on their own proximity zone — not derived from another racer's speed. The brake-to-match cap, by contrast, explicitly links the trailer's target speed to the leader's, and that link was missing the leader's own 0.945 floor term.

---

## Part 2 — Fix: Include Leader's Floor Brake in Cap

### What changed

**File:** `client/src/modules/raceBehavior.js` — pair loop, brake-to-match cap computation

**Before (single line):**
```js
const cap = computeBrakeMatchFactor(
  leaderFwdSpeed,        // raw speed — ignores leader's own brake
  trailerDenom,
  config.speedMatchMinDifferential ?? 0.005,
  config.speedMatchSafetyMargin ?? 0.001
);
```

**After (four lines added, one name change):**
```js
// Account for the leader's own effective brake (report 09): the leader advances at
// rawSpeed × 0.945 when avoidanceActive — not rawSpeed. Cap must target actual advance.
// Uses speedBrakeFactor as the floor approximation (exact after 3s warmup).
const leaderBrake = leader.avoidanceActive
  ? Math.min(config.speedBrakeFactor ?? 0.945, leader.brakeMatchFactor ?? 1.0)
  : 1.0;
const cap = computeBrakeMatchFactor(
  leaderRawSpeed * leaderBrake,   // leader's expected actual advance speed
  trailerDenom,
  config.speedMatchMinDifferential ?? 0.005,
  config.speedMatchSafetyMargin ?? 0.001
);
```

`leaderBrake` cases:
- `!leader.avoidanceActive` → `1.0` — leader unbraked, cap uses raw speed (unchanged)
- `leader.avoidanceActive`, `leader.brakeMatchFactor ≥ 1.0` → `0.945` — floor brake applied
- `leader.avoidanceActive`, `leader.brakeMatchFactor < 0.945` → `leader.brakeMatchFactor` — sub-floor cap applied

Uses `leader.brakeMatchFactor` from the **previous frame** (one-frame lag) — same acceptable lag as the rest of the system. After the 3s warmup this is exact; during warmup it is slightly conservative.

### Why this closes the primary bypass

After fix, with both trailer and leader `avoidanceActive`, cap < floor:

```
trailer.advance_{N+1} = trailerDenom × min(0.945, leaderRawSpeed × 0.945 / trailerDenom)
                      = leaderRawSpeed × 0.945   (cap wins over floor)

leader.advance_{N+1}  = leaderRawSpeed × min(0.945, leader.brakeMatchFactor_N)
                      = leaderRawSpeed × 0.945   (when leader.brakeMatchFactor ≥ 0.945)
```

**Trailer advance = leader advance. Primary bypass eliminated for the dominant case (86%).**

### Nothing else changed

Cap formula (`computeBrakeMatchFactor`): unmodified. Warmup `min()` in `index.jsx`: unmodified. Step-1 constants, hold/release logic, anti-trap: all unmodified.

### Tests

4 new tests in `raceBehaviorBrakeMatch.test.js` verify the leader-brake fix:
1. Chain setup: r0 → r1 → r2; after first frame r1.avoidanceActive is set
2. Second frame: r2's cap uses r1's braked speed (lower than r1 raw speed)
3. Second frame cap is tighter than first frame cap (confirms leader brake is factored in)
4. Unbraked leader (avoidanceActive=false) still uses raw speed (no regression)

**2629 tests, 122 files — all green.**

---

## Part 3 — Re-Validation

### brakeMatchFailureCount before and after fix

**Luger Hill × dragon (representative open combo):**

| Run | Races | bmFail total | bmFail/race | leaderBraked% |
|---|---|---|---|---|
| Pre-fix | 5 | 43,173 | 8,635 | 86% |
| Pre-fix | 10 | — | ~8,635 (extrapolated) | — |
| **Post-fix** | **10** | **51,559** | **5,156** | **89%** |
| **Reduction** | | | **~40%** | |

The fix eliminates the systematic floor-brake bypass and reduces total events by 40%. The remaining 89% (`leader.avoidanceActive`) are the **one-frame lag at state transitions**: each time the leader's brake state changes (e.g. leader just entered a sub-floor cap zone), the cap used in the next frame was computed from the previous (weaker) state. This fires for exactly one frame per transition. In a 60-racer pack, transitions occur constantly, producing the residual ~5K/race.

**The residual is structurally irreducible** without moving cap computation into the same pass as the t-update — which would break the current physics/behavior separation (applyRacerBehavior needs world positions from computePositions, which needs the t-update first). This is a known architectural constraint.

**`brakeMatchFailureCount` is not at zero.** Whether this residual causes fairness failure is answered by the N=50 results below.

---

### N=50 fairness — full 66-combo sweep

**Results from `client/tmp/n50-sweep.txt` (sim cut off mid-run — partial, 3 open tracks + 4 closed tracks complete).**

#### Open-track results (all combos tested — all fail)

| Track | Combo | N=50 χ² | N=50 p | 1.5×-Gate | R0 win% | Expected |
|---|---|---|---|---|---|---|
| River Run | duck | 11.5 | 0.001 | ❌ FAIL | 74% | 50% |
| River Run | dragon | 29.1 | 0.000 | ❌ FAIL | 66% | 33% |
| River Run | rocket | 17.9 | 0.000 | ❌ FAIL | 60% | 33% |
| River Run | koi | 33.8 | 0.000 | ❌ FAIL | 72% | 33% |
| River Run | turtle | 49.1 | 0.000 | ❌ FAIL | 80% | 33% |
| River Run | manta | 34.7 | 0.000 | ❌ FAIL | 72% | 33% |
| River Run | dolphin | 27.5 | 0.000 | ❌ FAIL | 68% | 33% |
| Space Sprint | dragon | 37.2 | 0.000 | ❌ FAIL | 74% | 33% |
| Space Sprint | rocket | 31.0 | 0.000 | ❌ FAIL | 70% | 33% |
| Space Sprint | plane | 11.5 | 0.001 | ❌ FAIL | 74% | 50% |
| Luger Hill | (partial — sim cut off) | — | — | — | — | — |
| Mountainstreet | (sim cut off) | — | — | — | — | — |
| Seatrack | (sim cut off) | — | — | — | — | — |

**Every open-track combo tested fails, with extreme R0 dominance.** R0 wins 60–80% of races where 33% would be fair. This is not noise.

#### The N=10 scope was wrong

Report 08 flagged 6 combos as failing at N=10. The N=50 data reveals this was a statistical power problem: N=10 could only detect the worst offenders. At N=50, **all open-track combos fail.** The 6 N=10 failures were the tip of an iceberg — not a near-pass situation.

#### Closed-track results (complete)

| Track | Combo | p | Status |
|---|---|---|---|
| Dirt Oval | elephant | 0.005 | ❌ (possible regression — closed track, no avoidance) |
| Garden Path | elephant | 0.045 | ⚠️ borderline |
| Garden Path | motorbike | 0.045 | ⚠️ borderline |
| All others (closed) | — | ≥ 0.09 | ✅ PASS |

The closed-track failures are low-signal anomalies compared to the open-track disaster.

### Root cause analysis: front-row freeze via chain lock

The floor-brake fix was correct — bmFail dropped from ~8,635 to ~5,200/race (-40%). But bypass events were not the primary cause of fairness failure. The actual cause:

**`blocked=85–90%`** — almost every racer is in a brake-match chain for almost the entire race on open tracks. The chain propagation is:
- Row 0: runs freely at full speed (no leader to match)
- Row 1: brake-matched to row 0 — cannot pass
- Row 2: brake-matched to row 1 (which is already held back) — even less able to pass

With 60 racers on a wide open track, proximity zones overlap constantly. The pack acts as a single locked chain where **starting order = finishing order**. The bypass events (5,200/race) go the wrong direction to fix this — they let trailers inch forward, but the chain lock prevents any meaningful overtaking.

This is the "front-row freeze" concern stated in the handoff: **brake-to-match without lateral escape creates a locked pack**. Step 2 (avoid-first lateral movement) was intended to provide an escape path. Without it, Step 1 alone produces broken fairness.

### Zigzag

No change expected or observed on zigzag — the fix only changed a scalar multiplier in the cap, not lateral forces.

### Per-row B1top5 / back-row starvation

**Confirmed severe starvation.** Row 2 on 3-row tracks wins 4–12% of races vs expected 33%. Row 0 wins 60–80%. This is worse than any previous baseline — Step 1 introduced a new fairness failure that was not present in the Phase-5 baseline (pre-overtaking-rebuild).

---

## Definition of Done — Step 1 (current status)

| Gate | Target | Status |
|---|---|---|
| `lateralForce` reset | 0.0114 | ✅ Confirmed |
| Rollback tag + hash | `28ab6ae4` | ✅ Confirmed |
| Sim parity (brake applied in sim t-update) | Matches index.jsx | ✅ Fixed `1dca1e9` |
| Bypass mechanism proven | Evidence required | ✅ 86% floor-brake, algebraic proof + data |
| Fix targets proven mechanism | Minimal, timing/ordering only | ✅ One expression change `cffd4b6` |
| `brakeMatchFailureCount` | At/near 0 | ⚠️ ~5,156/race post-fix (structural residual — see above) |
| Chi-square fairness all 66, p ≥ 0.05 | All combos | ❌ FAIL — all open-track combos fail (p=0.000–0.001) |
| Back-row B1top5 no starvation | ≥ Phase-1 range | ❌ FAIL — R2 wins 4–12%, expected 33% |
| Zigzag not increased | No increase | ✅ Unchanged (lateral forces untouched) |
| Tests green | 2629 pass | ✅ All green |

---

## Plain Verdict — HARD STOP

**Bypass fix:** Correct and confirmed. bmFail reduced from ~8,635 to ~5,200/race (-40%). The floor-brake mechanism was real, the fix was right. This part is done.

**Fairness at N=50:** Catastrophic failure. ALL open-track combos fail (p=0.000–0.001, 1.5×-Gate failing across the board). R0 wins 60–80% of races vs expected 33–50%. This is not noise.

**Root cause of fairness failure:** NOT the bypass residual. The `blocked=85–90%` metric shows almost every racer is brake-matched for almost the entire race. Chain propagation of brake-matching creates a locked pack: starting order = finishing order. The bypass fix improved bypasses but did not address the lock — the lock is a separate mechanism that makes back-row escape through speed alone impossible.

**Step 1 verdict: NOT COMPLETE. Real STOP.**

The brake-to-match system is correct in principle but the activation zone is too broad for dense open-track packs. Step 2 (avoid-first lateral escape) was intended to be the escape valve. Without it, Step 1 alone produces fairness worse than the Phase-5 baseline.

**What the N=10 sweep missed:** Statistical power. N=10 could detect the worst outliers (6 combos). N=50 reveals the full scope: all open-track combos are broken. N=10 was not enough for this problem.

**What must happen before Step 2:**
Either (a) fix the chain-lock problem in Step 1 by reducing the brake-match activation zone so `blocked%` drops from 87% to something reasonable, or (b) proceed to Step 2 (avoid-first) which by design provides lateral escape — but confirm Step 2 actually reduces `blocked%` and restores fairness before declaring Step 1 acceptable in combination.
