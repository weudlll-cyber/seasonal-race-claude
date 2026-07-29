# BATTLE-WEIGHT-ZERO-1 — weight 0 never enters; the pool/selector are defensive by construction

**Base: `origin/master` @9e351c0. Author: CC.** Two zero-related defects in the camera event director.
Presentation-only; fingerprint `ded0a126048e4cdb` stays IDENTICAL.

## VERDICT (read first): FIXED both sides. Pool pushes are weight-gated; the selector never returns a zero.
A 0.00 weight on any camera-event slider now means "never", consistently — guarded at the push site AND by the
selector itself, so even a future miswired caller can't surface a zero-weight state.

## STEP 0 — CONFIRM both defects
**DEFECT A (owner symptom):** BATTLE was pushed to the candidate pool on `if (hasBattle && battleCooledDown)`
(`CameraDirector.js:1136`) with `weight: this._battleWeight` but **no `> 0` check**; when BATTLE is the sole
eligible event (the common mid-race case) the pool is `[{BATTLE, weight:0}]`, and the selector's
`if (candidates.length === 1) return candidates[0]` returned it regardless of the zero weight → BATTLE fired.
**DEFECT B (structural):** even with several candidates, an all-zero pool made `total = 0`, so
`r = Math.random()*0 = 0`, and the first loop iteration's `r -= weight` left `r <= 0` → the selector returned
the first (arbitrary) candidate instead of no-pick.

## STEP 1 — POOL SIDE
Every pool push is now guarded by `weight > 0` — BATTLE, LEAD_CHANGE, COMEBACK (the guard is on the outer
condition, so the comeback detector isn't even run when its weight is 0), and OVERVIEW. A 0.00 slider excludes
that event from the pool entirely, uniformly.

## STEP 2 — SELECTOR SIDE (defense in depth)
`_weightedRandomPick` now (a) filters out every candidate with `weight <= 0` before summing, and (b) returns
`null` (no-pick) when the filtered pool is empty OR the total weight is not `> 0` — so a length-1 zero-weight
pool and a zero-sum pool both yield no-pick instead of an arbitrary candidate. Positive-weight pools still pick
proportionally exactly as before (verified statistically), so at the shipped defaults (all weights > 0) behavior
is unchanged.

## STEP 3 — EMPTY-POOL BEHAVIOR
When the selector returns no-pick the director already falls to its defined default — `LEADER_ZOOM` with reason
`leader: default (no active candidates)` — which is a sane LEADER hold, **not** BATTLE, and is correct late-race
when few events are eligible (the leader is always a valid subject).

## STEP 4 — MANDATORY STATES UNTOUCHED
Start-phase OVERVIEW, post-start LEADER hold, the endgame LEADER / LEAD_CHANGE exception, and the finish states
(PHOTO_FINISH / finish-drama / FINISH_OVERVIEW) are all decided **before** the weighted pool (they are the `if`
branches above the `else { pool }`) and use no weights — confirmed by tests that fire them with all four pool
weights set to 0.

## STEP 5 — TESTS (11 new; `CameraDirector.test.js`, 360 camera tests green)
Selector unit: single zero-weight → null · all-zero/zero-sum → null · empty → null · mixed pool never returns
the zero member · positive weights pick proportionally. Pool integration: **BATTLE weight 0 across 300 frames
with a pulk eligible every frame → never BATTLE** (owner's case) · BATTLE weight > 0 control → DOES fire ·
LEAD_CHANGE weight 0 with a pending lead change → never · all weights 0 → LEADER default. Mandatory: start-phase
OVERVIEW and endgame LEADER both fire with all pool weights 0.

## VERIFY
Fingerprint `ded0a126048e4cdb` IDENTICAL (camera is presentation-only) · full suite 162 files / **3346 tests
green** · eslint + build clean. Owner eye: with BATTLE weight 0 the battle view never appears; every other
event and the mandatory states behave normally.

## THE FIVE SENTENCES
1. BATTLE (weight 0) entered because its pool push lacked a `weight > 0` guard and the selector's single-candidate
   early-return handed it back regardless of weight.
2. Separately, the selector returned an arbitrary candidate for a zero-sum pool because `Math.random()*0 = 0`
   satisfied the first `r <= 0` check.
3. The pool side now guards every push with `weight > 0` so a 0.00 slider means "never" for every event
   consistently.
4. The selector side filters non-positive weights and returns no-pick for an empty or zero-sum pool, so even a
   miswired caller can never surface a zero-weight state — and no-pick falls to the sane LEADER default, never
   BATTLE.
5. Mandatory Start/Endgame/Finish states live outside the pool and are untouched; behavior is unchanged at the
   shipped defaults (fingerprint identical, 3346 tests green).

## PROPOSALS (≥2)
1. **Centralize the "weight 0 = off" contract in one push helper.** The four pool pushes now repeat the
   `&& weight > 0` guard; a small `pushEvent(state, weight, reason, data)` that no-ops on `weight <= 0` would make
   the contract impossible to forget when a fifth event is added, complementing the selector's defense in depth.
2. **Show the live candidate pool + weights in the camera HUD.** The owner tunes these weights by eye; a HUD line
   listing this frame's eligible candidates and their weights (and "no-pick → LEADER default" when empty) would
   make a 0-weight exclusion visible immediately instead of inferred from what the camera does.
3. **Add a DevScreen hint that 0 disables an event.** A one-line note on each camera-event weight slider ("0 =
   never") would set the expectation at the control, matching the now-consistent behavior.

---
**Presentation-layer only** (`CameraDirector.js` pool guards + selector + 11 tests). Shipped fingerprint
`ded0a126048e4cdb` unchanged.
