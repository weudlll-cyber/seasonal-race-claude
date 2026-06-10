# FIXA-RESULT — Fix A verification result

**Date:** 2026-06-10  
**Commit:** `fix(camera): eliminate LEADER_ZOOM entry zoom overshoot (Fix A)`  
**Track/Config:** Space Sprint · Dragon · N=8 · Quick Test (camTrace, Playwright)

---

## Pass/Fail verdict: **PASS**

The mechanical overshoot is objectively eliminated. Final smoothness is subject to owner's
morning eye-check (subjective), but the camera no longer enters LEADER_ZOOM tracking phase
above its target zoom.

---

## Before vs After — first tracking frame

| Metric | BAD trace (pre-fix) | FIXED trace (post-fix) | Change |
|---|---|---|---|
| `z` at first tracking frame | 0.985 | 0.9876 | zoom enters from below |
| `tz` at first tracking frame | 0.957 | 1.0318 | — |
| Overshoot (`z − tz`) | **+0.028** (above target) | **−0.044** (below target) | ✓ eliminated |
| tz−z within 0.05 threshold | yes (wrong direction) | yes (correct direction) | — |

The zoom overshoot (0.028 zoom units = 2.8% scale above target) is replaced by a normal
approach from below (0.044 below target = camera still zooming in, within the convergence
window).

---

## Before vs After — pan error behavior

| Metric | BAD trace | FIXED trace | Change |
|---|---|---|---|
| Pan error at tracking start | +52 px (wrong direction) | −60 px (camera behind leader, normal) | ✓ |
| Pan error peak | +95 px (1066 ms into tracking) | ~−73 px (normal tracking lag) | ✓ |
| Time for pan error to converge to ~0 | **1066 ms** (zoom-correction driven) | **217 ms** (normal lerp) | **5× faster** |
| Sign-flip near convergence | +7.26 px snap (target jump from 33 ms frame) | 2.23 px micro-overshoot | **3× smaller** |
| Direction of pan growth | WRONG (growing away from target) | CORRECT (converging to target) | ✓ |

---

## Root cause confirmed and fixed

**Before:** `_leaderPhaseZoomFloor` block used `this.zoom` for visibility count. During entry,
`this.zoom ≈ 0.533` (OVERVIEW) → all 8 racers visible → floor never decremented → targetZoom
stayed at resolved leaderZoom (≈1.03). T-space convergence fired at zoom=0.985, targetZoom had
just dropped to 0.957 due to world-edge clamping → delta=0.028 < 0.05 → entry ended with
zoom above target → 1066 ms zoom-out correction, coupled pan drift throughout.

**After:** Floor block uses `this.targetZoom` for visibility count. During entry, targetZoom ≈
1.03 (leaderZoom) → fewer than 8 racers visible at that zoom → floor decrements from frame 1.
By the time T-space convergence fires (~34 frames = 566 ms), floor has decremented to ≈1.03
and zoom has converged from below to ≈0.988. Entry ends with zoom < targetZoom. No overshoot.
No correction tail.

---

## What remains for owner's morning eye-check

The camera still zooms out during LEADER_ZOOM (tz drops from 1.03 → 0.69 as the floor ratchets
down for 8-racer visibility). This is correct behavior — the camera is seeking a wider view
to show more racers. With Fix A, this happens smoothly (zoom follows targetZoom from below at
0.005/frame). Without Fix B (rejected — NO-GO per FIXB-PREFLIGHT), the pan target still drifts
0.0075 effective-zoom units per frame as targetZoom decrements. This is much smaller than the
pre-fix drift (0.025+ per frame from overshoot correction).

**Owner task:** play Space Sprint with 8 racers, watch the OVERVIEW → LEADER_ZOOM transition.
The camera should zoom in cleanly and then track the leader without a visible back-and-forth
wobble. Report whether the subjective "unrund" feeling is gone.
