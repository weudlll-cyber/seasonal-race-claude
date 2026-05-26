# Diagnosis: PR #102 — Camera Backward-then-Forward Bug

**Branch:** `fix/camera-track-aware-transitions`  
**Commit:** `af256db`  
**Analyzed:** 2026-05-15 (read-only, no code changed)

---

## Point 1: Lap counter behavior in `_camT`

**Finding:**  
`_camT` is cumulative (unbounded float, e.g. 2.42 = lap 3, position 0.42). Normalization when accessing the track geometry happens inline with `((this._camT % 1) + 1) % 1` (CameraDirector.js:877, 897, 914). Racer `.t` is also cumulative (monotonically increasing until `raceState.finishT`). Both sides use the same coordinate system.

In `_transition()` (lines 725–730):
```javascript
if (this._camT === null) {
  this._camT = focusT; // focusT = ordered[0].t (cumulative)
}
```
When `_camT !== null`, the old value is retained — both come from the same cumulative T domain. No lap number discrepancy.

In `_shortestTDelta` (line 57):
```javascript
let delta = (to - from) % 1;
```
`% 1` strips the lap counter. The function thus operates on the fractional parts. This is correct and consistent.

**Relation to backward hypothesis:** Refuted. No lap counter bug. The user hypothesis "lap from old context vs. current" does not apply, as both values are cumulative and consistent.

**Example values:**  
- Leader lap 3: `t = 2.42`, `_camT = 2.42` → `getPosition(0.42, 0)` ✓  
- `_shortestTDelta(2.42, 2.48) = (2.48-2.42)%1 = 0.06` ✓

---

## Point 2: ShortestTDelta behavior with large lead-ahead

**Finding:**  
```javascript
function _shortestTDelta(from, to) {
  let delta = (to - from) % 1;
  if (delta > 0.5) delta -= 1;   // ← flips to negative!
  if (delta < -0.5) delta += 1;
  return delta;
}
```
When `(to - from) % 1 > 0.5`, the function returns a **negative** value — the short arc goes backward.

This happens when `leadAhead % 1 > 0.5` (since `_camT ≈ focusT` at transition start, so `to - from ≈ leadAhead`):

| leadAhead | leadAhead % 1 | `_shortestTDelta` | Movement |
|-----------|---------------|-------------------|----------|
| 0.06      | 0.06          | +0.06             | forward ✓ |
| 0.54      | 0.54          | −0.46             | **backward ✗** |
| 2.4       | 0.4           | +0.4              | forward, too far |
| 0.7       | 0.7           | −0.3              | **backward ✗** |
| 1.56      | 0.56          | −0.44             | **backward ✗** |

**Relation to backward observation:** Confirmed as mechanism. The question is: when does `leadAhead > 0.5` or `leadAhead % 1 > 0.5`? Answer: in point 3.

---

## Point 3: Transition start — initialization of `_camT` and the stale `_prevFocusT` problem

**Finding:**  
`_prevFocusT` is **NEVER** reset in `_transition()` (lines 698–757 fully checked). It is only initialized to `null` in the constructor (line 141).

The T-space lerp block in `update()` (lines 449–492) sets `_prevFocusT = fT` every frame — but **only when it is active**, i.e. when `_camT !== null && _transitionTargetT !== null`.

**Lifecycle at OVERVIEW → LEADER_ZOOM:**

**Phase A — OVERVIEW entry (T-space lerp active):**
- `_camT` set to `focusT` in `_transition()`
- T-space block runs: `_prevFocusT = fT` every frame
- Convergence fires: `|_shortestTDelta(_camT, leader.t)| < 0.005`

**Phase B — OVERVIEW tracking (T-space lerp INACTIVE):**
- `_camT = null` (convergence released it, line 543)
- T-space block does NOT run (`_camT === null`)
- `_prevFocusT` is **frozen** — holds value from last OVERVIEW entry frame
- OVERVIEW tracking lasts 15–25 seconds → racer keeps moving
- `_prevFocusT` is now **stale**

**Phase C — OVERVIEW → LEADER_ZOOM, frame 1:**
In `_transition()` (line 703): `_entrySpeedEstimate = NOMINAL_T_PER_FRAME = 0.001`

But immediately in `update()` frame 1, BEFORE `_transitionTargetT` from `_transition()` is used:
```javascript
if (this._prevFocusT !== null) {          // ← true, value frozen from phase A
  this._entrySpeedEstimate = Math.max(0, fT - this._prevFocusT);
}
this._prevFocusT = fT;                    // ← only now updated
const leadAhead = this._entrySpeedEstimate * FRAME_RATE * prof.leadInDuration;
this._transitionTargetT = fT + leadAhead; // ← already using wrong value!
```

`_entrySpeedEstimate` in `_transition()` is **immediately overwritten on frame 1** before `_transitionTargetT` is used.

**Concrete numbers:**  
- OVERVIEW tracking: 15 seconds = 900 frames, racer speed = 0.001 T/frame
- Racer moves: 0.001 × 900 = 0.9 T
- `_prevFocusT` frozen at `focusT_at_OVERVIEW_convergence = 2.38`
- Current: `fT = 3.28` (0.9 T later)
- Frame 1: `speed = 3.28 − 2.38 = 0.90` (that is 900× the real speed!)
- `leadAhead = 0.90 × 60 × 1.0 = 54.0`
- `54.0 % 1 = 0.0` → `_shortestTDelta = 0` → no movement frame 1 ✗

For 9-second OVERVIEW tracking (540 frames):
- `stale_speed = 0.54`; `leadAhead = 32.4`; `32.4 % 1 = 0.4` → forward
  
For ~9-frame OVERVIEW (special case, very short tracking):
- `stale_speed = 0.009`; `leadAhead = 0.54`; `0.54 % 1 = 0.54 > 0.5` → **backward −0.46 T!**

The result on frame 2 is always correct: `_prevFocusT = fT_frame1`, `speed = 0.001`, `leadAhead = 0.06`. Camera then moves forward.

**Frame 1 moves `_camT` wrong, then frame 2+ corrects — exactly the backward-then-forward pattern!**

**Relation to observation:** Confirmed as primary cause. The pattern is timing-dependent (depends on `leadAhead % 1 > or < 0.5`), which explains why "at least one LEADER phase is correct."

Line of bug: `update()` lines 476–479 (speed estimate without checking whether `_prevFocusT` is current) + missing `this._prevFocusT = null` in `_transition()`.

---

## Point 4: Lead-ahead offset size

**Finding:**  
Even with correct speed estimate (frame 2+):
```
leadAhead = 0.001 [T/frame] × 60 [frames/s] × leadInDuration [s]
```
For `leadInDuration = 1.0s`: `leadAhead = 0.06 T`

On an oval with e.g. worldW = 2000px (typical for a medium-sized track):
- `bsX = 1280 / 2000 = 0.64`
- `effectiveZoom = 3.5 × 0.64 = 2.24`
- Visible half-viewport in world px: `1280 / (2 × 2.24) = 286 world px`
- Oval perimeter ≈ 4000 world px → `0.06 T × 4000 = 240 world px` lead-ahead
- Leader is 240 world px **behind** camera center
- In screen px: `240 × 2.24 = 538 screen px` behind center
- Canvas 1280px wide, edge at 640px: leader at `640 + 538 = 1178 screen px` = 92% from left

**→ Leader at the right edge of the frame. Exactly the user screenshot.**

The `resolveCamera` clamping can slightly dampen the effect (when track edge intervenes), but the fundamental issue remains: the lead-ahead offset is too large for the zoom factor in use.

**Relation to observation:** Confirmed as secondary cause for "leader almost out of frame." Occurs even when bug 1 (stale prevFocusT) is fixed.

---

## Point 5: Tracking phase — does lead-ahead remain active?

**Finding:**  
No. At convergence (line 528):
```javascript
this._transitionTargetT = null; // ← T-space lerp stopped
```

T-space lerp block condition (lines 449–455):
```javascript
if (this._lerpPhase === 'entry' && ... && this._transitionTargetT !== null)
```
→ does not run in tracking phase.

`tSpaceLerpActive` (lines 498–503):
```javascript
this._lerpPhase === 'entry' && ... && this._transitionTargetT !== null
```
→ false in tracking phase → normal pixel lerp.

In `_computePhasedPanTarget`:
- 'lead-in': `_camT` stays at convergence position (fT + leadAhead), camera holds position
- 'follow': `this._camT = focusT` (line 1021) → camera pins to racer
- `_prevFocusT = focusT` is set in all `_computePhasedPanTarget` branches → is current

Lead-ahead does **not** accumulate in the tracking phase. User hypothesis 2 refuted.

---

## Point 6: Step-by-step trace OVERVIEW → LEADER

Starting state: racer leader at `t = 3.28` (lap 4, position 0.28), race running for ~30s.  
`_prevFocusT = 2.38` (frozen 15s ago during OVERVIEW tracking).  
`leadInDuration = 1.0s`, `entryTC = 0.5s` → `lf ≈ 0.073/frame`.

**`_transition()` fires (OVERVIEW → LEADER_ZOOM):**
```
_camT = null → _camT = 3.28 (focusT)
_entrySpeedEstimate = 0.001 (NOMINAL_T_PER_FRAME)
_transitionTargetT = 3.28 + 0.001×60×1.0 = 3.34
_prevFocusT: 2.38 (untouched!)
```

**Frame 1 — update() T-space lerp block:**
```
fT = 3.281 (racer moved 0.001 T)
_prevFocusT = 2.38 → speed = max(0, 3.281 − 2.38) = 0.901   ← stale!
_entrySpeedEstimate = 0.901  (overwrites 0.001 from _transition()!)
leadAhead = 0.901 × 60 × 1.0 = 54.06
_transitionTargetT = 3.281 + 54.06 = 57.341
_shortestTDelta(3.28, 57.341) = (57.341 − 3.28) % 1 = 54.061 % 1 = 0.061
_camT += 0.061 × 0.073 = +0.0045 → _camT = 3.2845
_prevFocusT = 3.281 (now current)
```
In this case: almost no movement (0.061 % 1 < 0.5 → forward, small). No backward at 15s tracking. (Lap 0.06×900=54, `% 1 = 0`).

For **8s OVERVIEW tracking** (480 frames, racer moves 0.48 T):
```
_prevFocusT = 2.80, fT = 3.28
speed = 0.48, leadAhead = 28.8, 28.8%1 = 0.8 > 0.5
_shortestTDelta = 0.8 − 1.0 = −0.2  ← BACKWARD!
_camT += −0.2 × 0.073 = −0.0146 → _camT = 3.265  (behind leader!)
```

**Frame 2:**
```
fT = 3.282, _prevFocusT = 3.281
speed = 0.001, leadAhead = 0.06
_transitionTargetT = 3.342
_shortestTDelta(3.265, 3.342) = +0.077
_camT += 0.077 × 0.073 = +0.0056 → _camT = 3.271  ← FORWARD!
```

Camera goes BACKWARD on frame 1 (from 3.28 to 3.265), then FORWARD on frame 2+ (toward 3.34). That is exactly the observed pattern.

After convergence (zoom+T converged):
```
_camT ≈ 3.34 (leader at 3.30)
Shape.getPosition(0.34) = 240 world px ahead of leader
At zoom 3.5: 538 screen px behind camera center = right screen edge
```

---

## Verdict

### User hypothesis 1 (lap counter bug): Refuted

`_camT` and `focusT` are consistently cumulative. No lap context mismatch. The actual cause is related but different: **not the lap counter, but `_prevFocusT` being frozen.**

### User hypothesis 2 (lead-ahead persistence): Refuted

`_transitionTargetT = null` at convergence. T-space lerp does not run in tracking phase. Lead-ahead does not accumulate further.

---

## Most likely root causes

### Bug 1 (primary): Stale `_prevFocusT` → wrong lead-ahead on frame 1

**File:** `CameraDirector.js`  
**Lines:** 476–478 (speed calculation from `_prevFocusT`) + line 703 (`_entrySpeedEstimate` reset without `_prevFocusT` reset)  
**Mechanism:** `_prevFocusT` is frozen during OVERVIEW tracking (T-space lerp inactive). Frame 1 of the next state computes speed as the difference over the entire OVERVIEW period → explosive lead-ahead → `_shortestTDelta` can be negative (depending on `leadAhead % 1`) → brief backward movement → from frame 2 normalized → forward movement toward lead-ahead position.

**Fix direction:** `this._prevFocusT = null` in `_transition()` after line 703 (between `_entrySpeedEstimate` reset and the shape block). Speed on frame 1 then stays at `NOMINAL_T_PER_FRAME`.

### Bug 2 (secondary): Lead-ahead too large for the zoom factor in use

**File:** `CameraDirector.js`  
**Lines:** 484–487 (leadAhead calculation in update) + lines 738–741 (leadAhead in _transition)  
**Mechanism:** Even with correct speed (0.001 T/frame): `leadAhead = 0.001×60×1.0 = 0.06 T`. At typical oval length and zoom 3.5x this corresponds to leader at right screen edge (92% across the viewport).  
**Fix direction:** Reduce `leadInDuration`, or calibrate lead-ahead in pixels instead of T-space, or clamp: `leadAhead = min(leadAhead, 0.5 × viewport_half_width_in_T)`.

---

## Fix order

1. **First bug 1 (stale `_prevFocusT`):** Simple, one line. Eliminates the unpredictable backward flickering and the random direction reversal on frame 1.
2. **Then bug 2 (lead-ahead size):** After the bug-1 fix the extent of the "leader at edge" effect becomes more clearly visible. Then decide whether to set `leadInDuration` smaller (config change) or whether to change the lead-ahead calculation.

---

## Diagnostic logging for visual verification

If the analysis still has gaps after a fix, this logging would be useful in `update()` directly before `this._camT += ...`:

```javascript
if (this._showDiagnostics && this._lerpPhase === 'entry') {
  console.log(
    `[CAM-T] state=${this.state} phase=${this._lerpPhase}` +
    ` camT=${this._camT?.toFixed(4)} target=${this._transitionTargetT?.toFixed(4)}` +
    ` delta=${_shortestTDelta(this._camT, this._transitionTargetT).toFixed(4)}` +
    ` prevFocusT=${this._prevFocusT?.toFixed(4)} speedEst=${this._entrySpeedEstimate?.toFixed(6)}` +
    ` leadAhead=${((this._entrySpeedEstimate ?? 0) * FRAME_RATE * (this._phasedByState?.[this.state]?.leadInDuration ?? 0)).toFixed(4)}`
  );
}
```
