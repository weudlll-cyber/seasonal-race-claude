# FIXB-PREFLIGHT — Pre-flight analysis for Fix B (stable pan target)

**Date:** 2026-06-10  
**Basis:** Read-only. No source changes.  
**Scope:** Fix B from CAMTRACE-ANALYSIS §9 — compute `targetOffsetX/Y` using `targetZoom`  
          instead of `this.zoom` in `_setOpenTrackTargets` / `_setClosedTrackTargets`.

---

## 1. Current computation path — confirmed with line numbers

### Open track (`_setOpenTrackTargets`, CameraDirector.js:1583–1610)

```js
_setOpenTrackTargets(target, stateZoom, frameSize, extraMinEffZoom = 0) {
  const BASE = OPEN_TRACK_BASE_ZOOM;
  const minEffZoom = Math.max(this.overviewZoom * BASE, extraMinEffZoom);
  const stateEffZoom = stateZoom * BASE;

  // CALL 1 — determines targetZoom
  const zoomResolved = resolveCamera({ desiredEffZoom: stateEffZoom, ... });
  this.targetZoom = zoomResolved.effectiveZoom / BASE;  // :1596

  // CALL 2 — determines targetOffsetX/Y — uses THIS.ZOOM (in-flight)
  const currEffZoom = Math.max(this.zoom * BASE, minEffZoom);  // :1598 ← THE LINE
  const panResolved = resolveCamera({ desiredEffZoom: currEffZoom, ... });
  this.targetOffsetX = -panResolved.camX * panResolved.effectiveZoom;  // :1607
  this.targetOffsetY = -panResolved.camY * panResolved.effectiveZoom;  // :1608
  this._lastResolvedPanTarget = panResolved;                           // :1609
}
```

**Confirmed: line 1598** `currEffZoom = Math.max(this.zoom * BASE, minEffZoom)` uses `this.zoom`
(in-flight, still correcting), not `targetZoom`.

### Closed track (`_setClosedTrackTargets`, CameraDirector.js:1549–1573)

Identical structure:
```js
const currEffZoom = Math.max(this.zoom * this._bsX, minEffZoom);  // :1561 ← same pattern
const panResolved = resolveCamera({ desiredEffZoom: currEffZoom, ... });
this.targetOffsetX = -panResolved.camX * panResolved.effectiveZoom;  // :1570
```

**Both functions have the same bug.** Fix B must touch both if applied to all states.

### The design comment at line 1541–1547

```
// Because call 2 uses the live zoom value, the pan target smoothly chases the
// racer as zoom lerps 1→stateZoom, keeping the target within the inner frame
// throughout the transition rather than snapping on entry.
```

**This comment explains the INTENT of the current design**: keeping the leader in the inner
frame while the zoom is transitioning. Fix B proposes trading this guarantee for a stable
pan target. The trade-off must be understood before implementing.

### Call ordering within `update()`

```
_setTargets(...)           :797   ← sets targetZoom, targetOffsetX/Y using this.zoom
_leaderPhaseZoomFloor(...)  :1878  ← may further reduce targetZoom by 0.005/frame
this.zoom += ... * lf       :808   ← zoom lerps AFTER targetZoom is set
this.offsetX += ... * lf    :814   ← pan lerps AFTER targets are set
```

`_leaderPhaseZoomFloor` runs AFTER `_setOpenTrackTargets` and FURTHER REDUCES `targetZoom`.
This is critical for §3c and §4.

---

## 2. Paper simulation of Fix B

**Proposed change (line 1598):**
```js
// Before:
const currEffZoom = Math.max(this.zoom * BASE, minEffZoom);

// After (Fix B):
const currEffZoom = Math.max(this.targetZoom * BASE, minEffZoom);
```

(With corresponding change at line 1561 for closed tracks.)

### What changes frame-to-frame

The pan target formula: `targetOffsetX = -camX * effZoom + CW/2`
where `effZoom = panResolved.effectiveZoom ≤ desiredEffZoom`.

Under Fix B: `desiredEffZoom = targetZoom * BASE` (stable value between frames, subject only to
`_leaderPhaseZoomFloor` step-down of 0.005/frame).

Under current code: `desiredEffZoom = this.zoom * BASE` (changes at every lerp step, much faster
during large corrections).

**During the large zoom correction (ts=50649, z=0.985 → targetZoom=0.642):**

| Frame | `this.zoom` | `targetZoom` | Pan shift under FIX B | Pan shift under CURRENT |
|---|---|---|---|---|
| First tracked | 0.985 | 0.957 | ∝ Δ(targetZoom)=−0.005 → ~8 canvas px shift/frame | ∝ Δ(this.zoom)≈−0.005 → ~8 px (similar here) |
| Mid-correction | 0.80 | 0.642 | ∝ 0.005 → ~8 px/frame | ∝ Δ(this.zoom)≈−0.025 → ~40 px/frame |
| Near-convergence | 0.645 | 0.642 | ∝ 0.005 → ~8 px/frame | ∝ Δ(this.zoom)≈−0.003 → ~5 px/frame |

Fix B reduces pan target drift during the **fast zoom-correction phase** (where `Δ(this.zoom)`
per frame is large) but has the same rate during steady `_leaderPhaseZoomFloor` step-down.

### Does Fix B preserve the final destination?

Yes. Once `this.zoom` converges to `targetZoom`, `this.zoom * BASE ≡ targetZoom * BASE`. Both
code paths give the same `desiredEffZoom`, so the pan converges to the same final position.
Fix B only changes the **path taken**, not the **destination**.

---

## 3. Edge cases

### 3a. World-edge clamping (no black borders)

`resolveCamera` always clamps `camX, camY` inside world bounds, regardless of `desiredEffZoom`.
The clamp uses: `camXMax = worldWidth - canvasW / effZoom`.

With Fix B using a LOWER `desiredEffZoom` (targetZoom < this.zoom during correction):
- Lower effZoom → lower `camXMax` → stricter right-edge clamp
- A lower `desiredEffZoom` can return `panResolved.effectiveZoom ≤ desiredEffZoom`
- `targetOffsetX = -camX * panResolved.effectiveZoom` with the clamped `camX`

When the renderer displays this at the CURRENT (higher) zoom:
```
displayed camX = -targetOffsetX / this.zoom / BASE
               = camX_clamped_at_targetZoom × targetZoom / this.zoom
               < camX_clamped_at_targetZoom   (because targetZoom < this.zoom)
```

The displayed left edge is CLOSER to origin than the clamped position, meaning the right edge
is at: `camX_displayed + CW/currEffZoom_displayed < bMaxX` — still inside world bounds. ✓

**World-edge no-black-borders guarantee: PRESERVED under Fix B.**

The reason: Fix B computes the pan at a wider zoom level (lower effZoom), which is a stricter
containment than the current narrower zoom. The actual display at higher zoom shows an even
narrower sub-view, which is necessarily inside the wider-view bounds.

### 3b. Inner-frame guarantee — VIOLATED during large zoom overshoot

**This is the critical blocker.**

The inner-frame guarantee says the leader must appear within the central `innerFramePct=70%` of
the displayed canvas. `resolveCamera` ensures this for `desiredEffZoom`, but the renderer uses
`this.zoom`, not `desiredEffZoom`.

Under Fix B, leader screen position during correction:
```
leaderCanvasX = wx * this.zoom * BASE + this.offsetX
```
Where `this.offsetX` is lerping toward `targetOffsetX = CW/2 - wx * targetZoom * BASE`.
Once the pan has converged to the Fix B target (but zoom hasn't):
```
leaderCanvasX = CW/2 + wx × (this.zoom - targetZoom) × BASE
```

At maximum overshoot (`this.zoom = 0.985`, `targetZoom = 0.642`, `wx ≈ 1700`, `BASE = 1.5`):
```
leaderCanvasX = 640 + 1700 × 0.343 × 1.5 = 640 + 874 = 1514 px
```

CW = 1280 px. **The leader would be 234 pixels outside the right edge of the canvas.** Off-screen.

Even at partial convergence of the pan: if the pan has moved 50% toward Fix B target, the
leader would be at `640 + 874/2 = 1077 px` — near the right edge but technically visible.
The pan converges slowly (lerp factor ~0.05/frame), so the pan would only move partway toward
the off-screen target during the 1066ms correction phase.

**However**: the current code's comment explicitly states the in-flight zoom is used precisely to
prevent this ("keeping the target within the inner frame throughout the transition"). Fix B
removes this protection.

**Verdict: Fix B is NOT safe to apply globally without a guard. The inner-frame guarantee is
violated during any zoom overshoot > ~0.05 zoom units.**

### 3c. targetZoom stability during `_leaderPhaseZoomFloor` step-down

The trace shows `targetZoom` stepping down by 0.005–0.01 per frame for the ENTIRE leader-zoom
episode (ts=50649→53331+). This is driven by `_leaderPhaseZoomFloor` (lines 1887–1906), which
ratchets the floor down by `_zoomOutStepPerFrame = 0.005` per 16ms frame whenever the visible
racer count is below `_minRacersVisible`.

**Fix B does NOT eliminate pan target drift** — it reduces it from `Δ(this.zoom)` per frame to
`Δ(targetZoom)` per frame. During the `_leaderPhaseZoomFloor` step-down, both are 0.005/frame
(identical). Fix B helps only during the initial zoom correction (where `Δthis.zoom` >> 0.005/frame).

**Impact on the sign-flip event (ts≈52215–52615):**
At near-convergence, `this.zoom ≈ 0.64226` and `targetZoom ≈ 0.64204` (delta = 0.00022).
With Fix B and current code, `currEffZoom` is essentially the same → same pan target → no
improvement for the final snap at ts=52615.

**Fix B partially reduces the problem but does NOT fully solve it.** The sign-flip would still
occur when `_leaderPhaseZoomFloor` drops targetZoom in a 33ms gap (2× step = 0.010 instead of
0.005), shifting the pan target by ~2× more than a normal frame — just as happens at ts=52582.
Fix B reduces the amplitude of this snap but doesn't prevent it.

### 3d. Closed tracks — same issue

`_setClosedTrackTargets` has the same `currEffZoom = this.zoom * this._bsX` pattern at line
1561. The analysis is symmetric. The `_leaderPhaseZoomFloor` applies to LEADER_ZOOM on closed
tracks too (line 1879–1906). Fix B would need to change line 1561 as well if scoped to all
states.

On closed tracks the zoom range for LEADER_ZOOM is smaller (cam.zoom typically 1.0–1.5 vs
0.5–1.0 on open tracks), so the overshoot magnitude would be smaller. But the bug exists.

### 3e. OVERVIEW and FINISH_OVERVIEW — NOT affected (if scoped correctly)

OVERVIEW calls `_setOpenTrackTargets` with `_ovSnapZoom`, and the `_leaderPhaseZoomFloor`
block only runs for `LEADER_ZOOM || LEAD_CHANGE` (line 1879). OVERVIEW has its own zoom
dynamics that don't involve `_leaderPhaseZoomFloor`.

If Fix B is scoped specifically to LEADER_ZOOM and LEAD_CHANGE (not changing OVERVIEW's pan
computation), OVERVIEW is unaffected. Safe to scope.

---

## 4. Interaction with still-decreasing targetZoom

The trace showed `targetZoom` never stabilising (0.957→0.562) across the entire 2.7s window.
This is `_leaderPhaseZoomFloor` in action: too few racers visible → floor decrements 0.005/frame.

**Fix B with the still-decreasing targetZoom:**
- During `_leaderPhaseZoomFloor` step-down, `Δ(targetZoom) = 0.005/frame` (same as current code)
- Fix B provides no reduction in pan target drift during this phase
- The sign-flip event at ts=52582–52615 is driven by a 33ms gap that causes `Δ(targetZoom) =
  0.010/frame` (2×). Fix B sees the same 2× spike — the snap is not prevented.
- The `ex` sign-flip at ts=52232 (the initial overshoot) happens when `this.zoom ≈ targetZoom`
  (delta = 0.00022). Fix B is identical to current code at this point → the overshoot and
  subsequent backward drift are NOT fixed by Fix B.

**Honest verdict: Fix B alone does NOT fix the "unrund."** It reduces pan target drift during the
fast zoom correction (making `Δpan_target` ≈ 6× smaller in the first 500ms), but the events
that produce the visible discontinuity (near-convergence overshoot + `_leaderPhaseZoomFloor`
33ms double-step snap) are unaffected.

Fix B would shorten the unstable period from ~1066ms to ~100ms (because the pan error would not
grow during zoom correction), but the sign-flip mechanism would still fire once the camera
approaches convergence.

---

## 5. Go/No-Go

### Fix B as written (unconditional targetZoom) — **NO-GO**

Blocker: inner-frame guarantee violated during large zoom overshoot. Leader can go off-screen
by 870+ canvas pixels at max overshoot. The existing design comment (line 1541–1547) explicitly
documents that `this.zoom` is used FOR THIS REASON.

### Fix B with a near-convergence guard — **CONDITIONAL GO**

Safe subset: only use `targetZoom` for pan when `this.zoom` and `targetZoom` are close (within
a tolerance). This preserves the inner-frame guarantee during large corrections, while removing
the pan target drift once the camera is nearly settled.

**Minimal safe recipe:**

```js
// _setOpenTrackTargets line 1598 — change from:
const currEffZoom = Math.max(this.zoom * BASE, minEffZoom);

// To:
const ZOOM_STABLE_TOL = 0.02;  // ~2% zoom difference = safe pan target ahead
const zoomForPan = Math.abs(this.zoom - this.targetZoom) < ZOOM_STABLE_TOL
  ? this.targetZoom
  : this.zoom;
const currEffZoom = Math.max(zoomForPan * BASE, minEffZoom);
```

Apply the same guard at `_setClosedTrackTargets` line 1561 (substitute `this._bsX` for `BASE`).

**What this guard buys:**
- When `|this.zoom - targetZoom| < 0.02`: uses `targetZoom` → pan target stable against
  `_leaderPhaseZoomFloor` 0.005/frame steps → reduces near-convergence target drift by ~50%
  (still 0.005/frame from `_leaderPhaseZoomFloor`, but no zoom-correction contribution)
- When `|this.zoom - targetZoom| ≥ 0.02`: uses `this.zoom` → keeps current behavior → inner-
  frame guarantee preserved

**What this guard does NOT fix:**
- The `_leaderPhaseZoomFloor` 33ms double-step snap (target snaps 2× in a dropped frame)
- The near-convergence overshoot (dox sign-flip) caused by the camera passing the target
- The ENTRY PHASE ZOOM OVERSHOOT that is the primary cause (see §4 above)

### Scope: LEADER_ZOOM and LEAD_CHANGE only

OVERVIEW uses the same functions but has different zoom dynamics. The `_leaderPhaseZoomFloor`
only applies to LEADER_ZOOM/LEAD_CHANGE (line 1879). Safe to restrict the guard to only these
states, leaving OVERVIEW's pan computation unchanged.

However: since both `_setOpenTrackTargets` and `_setClosedTrackTargets` are shared across all
states, the cleanest approach is the guard (which is naturally near-zero for OVERVIEW where
`this.zoom` converges fast to a stable OVERVIEW zoom).

---

## 6. Fix A is required alongside Fix B

The CAMTRACE trace confirmed that the visible "unrund" has two components:
1. **1066ms of pan-error growth** (Fix B with guard reduces this to ~100ms)
2. **Near-convergence sign-flip + 33ms snap** (Fix B does NOT fix this)

Component 2 requires Fix A: preventing the entry phase from overshooting the tracking zoom.
Without Fix A, the camera will still overshoot (reach z=0.985 when target is z=0.642), and even
with Fix B's guard, the sign-flip and snap remain.

**Recommended: Fix A first, then optionally Fix B with guard.**

Fix A (from CAMTRACE-ANALYSIS §9):
> When `_lerpPhase` switches to `'tracking'`, if `this.zoom > this.targetZoom` by more than a
> threshold, apply a faster zoom convergence for the first ~10 frames to correct the overshoot.

This directly prevents the 1066ms zoom correction phase from occurring, which eliminates both
the pan-error growth (component 1) and reduces the magnitude of the near-convergence snap
(component 2). Fix B with guard could then be added for additional stability.

---

## 7. Does the bug affect other state transitions?

The user asked whether the zoom-pan coupling bug appears in other transitions beyond OVERVIEW →
LEADER_ZOOM.

**Yes — the mechanism is present in every transition that changes the zoom level significantly.**

The bug requires two conditions:
(a) Camera enters tracking phase with `this.zoom` significantly different from `targetZoom`
(b) Pan target is computed with `this.zoom` which is still correcting

All state transitions that involve a zoom change satisfy (b) by design. Whether (a) is also
true depends on how much the new state's zoom differs from the entry zoom:

| Transition | Zoom change | Likely magnitude | Bug expected? |
|---|---|---|---|
| OVERVIEW → LEADER_ZOOM | 0.53 → 0.64 (need to zoom IN, entry overshoots to 0.985) | LARGE (0.343 overshoot) | **YES — confirmed in trace** |
| LEADER_ZOOM → OVERVIEW | 0.985 → 0.53 (zoom OUT to overview) | Moderate (depends on leader zoom vs OVERVIEW zoom) | **Possible** — same coupling, but OVERVIEW entry phase has less tendency to overshoot the final zoom |
| LEADER_ZOOM → BATTLE_ZOOM | Leader zoom → battle zoom (may differ by ~0.1–0.3) | Small to moderate | Possible if zooms differ by >0.05 |
| BATTLE_ZOOM → LEADER_ZOOM | Similar range | Small to moderate | Same |
| ANY → LEAD_CHANGE | LEAD_CHANGE uses `this._leadChangeZoom`; snap cuts apply (`_leadChangeSnapPending` at line 801) | SNAP eliminates gradual correction | LEAD_CHANGE hard-cut avoids the slow-lerp issue |
| ANY → COMEBACK_ZOOM | Comeback zoom vs previous | Depends on config | Possible |

**The most severe case is OVERVIEW → LEADER_ZOOM** because:
1. The zoom change from OVERVIEW (≈0.53) to LEADER_ZOOM (≈0.64) is small, BUT
2. The entry phase lerps the camera in MORE than needed (to z≈0.985 in the trace)
3. This overshoot is 3× the actual required zoom change, causing 1066ms of correction

Why does the entry phase overshoot so much? The entry starts at OVERVIEW zoom (0.533) and
lerps toward `_leaderZoom` (let's say ≈0.85 based on config). But the resolveCamera zoom
reduction (`_leaderPhaseZoomFloor`) progressively reduces `targetZoom` to 0.642 during tracking.
During entry, `_leaderPhaseZoomFloor` is NULL (reset on state transition, line 1154) — so entry
uses the full `_leaderZoom ≈ 0.85+`. The camera zooms in to ≈0.985, then tracking phase starts
and `_leaderPhaseZoomFloor` immediately starts stepping targetZoom down toward 0.642.

**The root cause of the entry overshoot**: the entry phase's zoom target (`_leaderZoom`) is
larger than the tracking phase's effective zoom target (after `_leaderPhaseZoomFloor` applies).
Entry uses config zoom; tracking uses config zoom reduced by the visibility-based floor.

For transitions that don't involve `_leaderPhaseZoomFloor` (BATTLE_ZOOM, COMEBACK_ZOOM,
OVERVIEW), the entry target zoom and tracking target zoom are the same, so the overshoot is
smaller. The bug exists but is less severe.

**Scoped fix recommendation**: Address specifically the LEADER_ZOOM entry overshoot (Fix A) by
ensuring the entry zoom target is capped by the `_leaderPhaseZoomFloor` that will be applied
once tracking starts. This prevents the overshoot at the root rather than correcting it
reactively in tracking phase.
