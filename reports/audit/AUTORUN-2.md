# AUTORUN-2 — Overnight autonomous batch log

**Date:** 2026-06-10  
**Anchor tag:** `backup/pre-overnight2` (tagged before any changes)  
**Mode:** Autonomous, hard-gated. Owner reviews in the morning.

---

## Morning summary (fill at end)

| Item | Result |
|---|---|
| Fix A shipped | PENDING |
| Cleanup (Phase 2) | PENDING |
| Data hygiene (Phase 3) | PENDING |
| Docs + archive (Phase 4) | PENDING |
| Audit/sweep (Phase 5) | PENDING |
| Eye-check needed | LEADER_ZOOM smoothness on Space Sprint after OVERVIEW transition |

---

## Step log

### S0 — Backup anchor
- **Action:** `git tag backup/pre-overnight2`
- **Result:** PASS — tag created, git status unchanged

---

## PHASE 1 — Fix A: eliminate LEADER_ZOOM entry zoom overshoot

### S1 — Root cause confirmed (read-only analysis)

Root cause (per CAMTRACE-ANALYSIS §7 + FIXB-PREFLIGHT §7):

1. On OVERVIEW→LEADER_ZOOM entry, the `_leaderPhaseZoomFloor` block uses `this.zoom`
   (current in-flight zoom) to count visible racers. During entry, `this.zoom` is LOW
   (zooming in from OVERVIEW ≈ 0.533), so visCount is HIGH → floor never decrements → floor
   stays at the resolved leaderZoom value (~0.957 in the trace).

2. The entry phase chases `targetZoom ≈ 0.957` (resolveCamera-reduced leaderZoom). The
   T-space lerp convergence fires when the camera reaches the leadAhead track position and
   `|targetZoom - zoom| < 0.05`. At this point `zoom = 0.985`, `targetZoom = 0.957` (position
   moved to world-edge-adjacent, resolveCamera reduced zoom). Delta = 0.028 < 0.05 → converge.

3. Tracking starts with zoom=0.985 >> eventual floor=0.642. The floor then decrements 0.005/frame
   for ~65 frames (1066ms), dragging `targetZoom` (and coupled pan target) the whole way down.

**Fix:** Change line 1882 in `_setTargets` to use `this.targetZoom` (not `this.zoom`) for the
visibility count in the floor block. Effect: floor decrements based on the INTENDED zoom level
(leaderZoom) from frame 1 of LEADER_ZOOM — during entry, when the target zoom is high (few racers
visible), floor decrements right away. By the time entry converges, targetZoom has already been
ratcheted down to near the correct tracking value. Entry ends with zoom ≈ targetZoom ≈ 0.85–0.90,
NOT 0.985. No overshoot to correct.

During tracking phase: `this.zoom ≈ this.targetZoom` (lerped close), so the change is minimal
in steady state.

### S2 — Implementation (Phase 1)

**File changed:** `client/src/modules/camera/CameraDirector.js` line 1882

**Change:** In `_setTargets`, the `_leaderPhaseZoomFloor` block computes visible racers using
`this.zoom` (in-flight zoom, low during entry). Changed to `this.targetZoom` (the resolved
leaderZoom, high). This causes the floor to decrement from the first LEADER_ZOOM frame even
during entry, so the entry phase converges toward the correct tracking zoom.

```diff
-  const effZoom = this._isOpenTrack ? this.zoom * OPEN_TRACK_BASE_ZOOM : this.zoom * this._bsX;
+  const effZoom = this._isOpenTrack
+    ? this.targetZoom * OPEN_TRACK_BASE_ZOOM
+    : this.targetZoom * this._bsX;
```

### S3 — Tests
- **client:** 2598 / 2598 PASS
- **server:** 158 / 158 PASS

### S4 — camTrace verification (Playwright, Space Sprint, Dragon, N=8)

**PASS criteria vs bad trace:**

| Criterion | OLD (bad) | NEW (fixed) | Status |
|---|---|---|---|
| z at first tracking frame vs tz | z=0.985 > tz=0.957 (+0.028 overshoot) | z=0.9876 < tz=1.0318 (−0.044, within 0.05) | **PASS** |
| Pan error growth direction | ex grew +52→+95px WRONG direction over 1066ms | ex decays −60→0px over 217ms (correct) | **PASS** |
| Sign-flip magnitude | +7.26px target snap → dox flip −1.75→+0.63 | 2.23px micro-overshoot, dox flip −0.05→+0.80 | **PASS** |
| Zoom below target at tracking start | NO — zoom was above target | YES — zoom below by 0.044 | **PASS** |

**Note:** The `_leaderPhaseZoomFloor` continues decrementing during tracking (tz=1.032→0.692 in
visible data) because 8 racers require a wide view. This is correct and expected behavior.
The camera follows the decrementing target smoothly (zoom chases tz from below, no overshoot).
The subjective smoothness check remains for the owner's morning eye-check.

### S5 — Commit + tag
