# CAMTRACE-ANALYSIS — Camera motion smoothness investigation

**Date:** 2026-06-10  
**Traces:** (1) OVERVIEW-only capture (Z pressed too early). (2) LEADER_ZOOM tracking capture — the actual unrund event. Analysis complete from Trace 2.  
**Status:** ROOT CAUSE IDENTIFIED. See §7.

---

## 1. Trace data received — what it contains

The trace pasted is 600 frames (full ring buffer). Due to the 50 000-character paste limit,
only the **first ~162 frames are visible**, spanning `ts 288228→290927` (~2.7 s). All visible
frames are `state: "OVERVIEW", phase: "tracking"`.

**The owner confirmed Z was pressed too early (during OVERVIEW).** The actual "unrund" event
happens in LEADER_ZOOM after the OVERVIEW→LEADER_ZOOM transition — this is entirely in the
**truncated/unread portion** of the trace.

**The OVERVIEW portion is analysed below as context. A new capture targeting the LEADER_ZOOM
moment is required (see §5).**

---

## 2. OVERVIEW phase — observed behaviour

### 2a. Frame rate during OVERVIEW

| Metric | Value |
|---|---|
| Total visible duration | 2 699 ms |
| Total frames (estimated) | ~162 |
| Frames with 33 ms gap (dropped) | 16 |
| Drop rate | 9.9 % |
| p90 (estimated) | 16.7 ms ← just at boundary |

The probe reported `overview p90 = 16.7 ms` after the translate3d fix — consistent with this
trace. However, ~10% of frames are double-length (33 ms), producing a visible occasional double-
step during OVERVIEW. This is not the "unrund" the owner reports (it's not specific to the
LEADER_ZOOM re-entry), but it is a mild background stutter in OVERVIEW.

**The 33 ms gaps produce exactly 2× the normal camera delta**: normal dox ≈ −1.63 px/frame,
dropped-frame dox ≈ −3.30 px/frame. These are proportional to dt — the camera simply moves
twice as far in one frame. Smooth in direction, but visually pulsy.

### 2b. X target lag (growing, not converging)

During OVERVIEW tracking phase, the camera never catches up to its X target:

| Timestamp | Camera X error (`ex`) | Notes |
|---|---|---|
| ts = 288 229 | −56.7 canvas px | start of visible data |
| ts = 290 928 | −69.3 canvas px | end of visible data |
| Growth rate | −4.7 px/s | target moving faster than camera can follow |

**The OVERVIEW lerp factor is too low to converge** against a leader moving at racing speed.
At the moment of the OVERVIEW→LEADER_ZOOM transition, the camera position will be ~69 canvas px
(~86 world px) **behind where OVERVIEW thinks the camera should be**.

In world coordinates: `actual camX ≈ 1 346 px`, `target camX ≈ 1 431 px`. The camera is watching
the leader's approximate position from 86 world px behind the ideal pan target.

This lag matters for the transition: when LEADER_ZOOM starts, it sets its entry lerp start position
from **the actual camera position** (ox ≈ −1 077), not the OVERVIEW ideal position. This means
the LEADER_ZOOM entry starts from a somewhat "wrong" starting point.

### 2c. Y-axis world-edge clamp engages

At `ts ≈ 289 261`, `ty` hits 0 and `clamp = 1` activates (camera has reached the world top edge,
`oy ≈ −23` canvas px from world top). From this point, the Y target is clamped to `ty = 0`.

The camera slowly approaches Y = 0 (oy goes from −23 toward −1.8 at end of visible data).
The Y error (`ey`) decays from +23 to +1.8 — the camera is smoothly crawling to the world boundary.

**One clamp-toggle event at `ts = 290 610`:**

| Frame | tx | ty | clamp | Δtx |
|---|---|---|---|---|
| ts = 290 594 | −1 103.7 | 0 | 1 | −1.56 px (normal) |
| **ts = 290 611** | **−1 111.5** | **−0.3** | **0** | **−7.83 px (5× spike!)** |
| ts = 290 627 | −1 113.4 | −0.14 | 0 | −1.88 px (normalising) |
| ts = 290 661 | −1 117.2 | 0 | 1 | −3.79 px (33 ms gap) |

The clamp releases for 2 frames, and the X target jumps 7.83 px (vs normal 1.56 px) in a single
frame. This is a small transient — the camera's actual movement (`dox = −1.76`) does not spike.
Only the target snaps. This is expected physics: when the Y clamp releases, the resolveCamera
recomputes the pan target from scratch without the Y-edge constraint, briefly landing at a
slightly different X.

**This clamp-toggle target-snap is NOT the "unrund" event** (it is small, brief, and in OVERVIEW).
But it is a known source of micro-discontinuities; worth logging.

### 2d. X pan acceleration

Over the 2.7 s visible window, the per-frame X movement accelerates:

- `dox` at start: **−1.47 px/frame**
- `dox` at end: **−1.79 px/frame**
- Rate: −0.12 px/frame/s

This is continuous smooth acceleration — the leader is moving faster, pulling the OVERVIEW target
ahead faster. No discontinuity. Normal.

---

## 3. The missing data — OVERVIEW→LEADER_ZOOM transition

The key frames are NOT in the provided trace. What we need to see:

1. **The transition frame**: `state` changes from `OVERVIEW` → `LEADER_ZOOM`, `phase` changes to `entry`.
2. **Entry lerp frames** (~20–60 frames): `phase = 'entry'`, zoom grows from ≈0.53 toward ≈1.5–2.0, cam pans toward leader.
3. **Phase switch**: frame where `phase` changes from `'entry'` → `'tracking'`.
4. **Steady tracking frames**: `phase = 'tracking'` in LEADER_ZOOM, straight-section motion.

The "unrund" event is expected to be in frames 2 or 3 above.

---

## 4. Hypotheses (ranked by evidence + code analysis)

### H1 — Entry-phase T-space→pixel-lerp transition velocity discontinuity ★★★ (most likely)

**Mechanism:** During `_lerpPhase = 'entry'`, the camera pan is **pinned to the track curve**
(`this.offsetX = this.targetOffsetX` — no pixel lerp, direct pin to `_camT` world position).
When entry converges and `_lerpPhase` switches to `'tracking'`, the pan switches from
**direct track-pin** to **pixel-space lerp** (`this.offsetX += (...) * lf`).

At the phase boundary, if the leader is on a curved section of track:
- Entry: pan tracks the track curve (smooth curve)
- Tracking: pan switches to pixel lerp toward the leader's current position

If the curve ends and a straight begins at this transition point, the camera's effective
direction of movement changes abruptly (from "along the curve" to "straight pixel lerp toward
leader"). This would look like a sudden change in camera direction — exactly "unrund."

**Evidence so far:** The owner reports the unrund specifically "on a straight section RIGHT AFTER
a curve." The T-space entry lerp follows the track curve and ends near the leader. If convergence
happens just as the track transitions from curve to straight, the velocity direction change at the
lerp-phase switch is the prime suspect.

**What the trace would show:** `dox` / `doy` sign or magnitude change AT the `phase: 'entry' → 'tracking'` frame.

### H2 — 33 ms dropped frame coinciding with transition ★★ (significant, but secondary)

**Mechanism:** A 33 ms gap frame at the exact moment of state change produces a double-sized camera
step. Combined with the state transition (new target, new zoom) landing on the same frame, the
combined effect looks like a large jump.

**Evidence:** 10% of frames are 33 ms gaps in OVERVIEW; same rate likely in LEADER_ZOOM entry.
On average, a 33 ms gap every ~10 frames = reasonable chance one hits the transition.

**What the trace would show:** `dox` or `doy` spike of 2× immediately around state change frame.

### H3 — Zoom-mismatch during T-space lerp ★★ (confirmed code-side, small magnitude)

**Mechanism (from CameraDirector.js:793–796):**
```js
if (tSpaceLerpActive) {
  this.zoom += (this.targetZoom - this.zoom) * lf;  // zoom lerps FIRST
}
this._setTargets(...);  // targets computed with lerped zoom
```
The zoom is applied before `_setTargets`, so the pan target uses the post-lerp zoom. This was
already fixed once (comment says "without this, per-frame mismatch ∝ camX × Δzoom produces visible
camera jumps"). The fix is correct. But if `lf` varies (variable dt from 33 ms frames), the zoom
step and pan step could be slightly mismatched frame-to-frame, producing small visible wobble.

**What the trace would show:** `ez2` (targetZoom − zoom) not converging smoothly; or `dox` spikes
correlated with `dz` spikes.

### H4 — Lead-ahead target overshoot ★ (plausible but no evidence yet)

**Mechanism:** During entry, the camera lerps toward `targetT = focusT + leadAhead` (a point ahead
of the leader). If the leader is in a curve with a short straight ahead, `targetT` may overshoot
the straight section end. When the camera reaches the straight and the lead-ahead target shifts,
the camera has to "reverse" slightly — a back-and-forth wobble.

**What the trace would show:** `ex` error sign flip (positive then negative), or `dox` sign flip.

### H5 — OVERVIEW persistent lag "landing kick" ★ (confirmed in data, expected to be small)

**Mechanism:** At transition start, the camera is 86 world px (69 canvas px) behind the OVERVIEW
target. When LEADER_ZOOM begins, the entry lerp starts from the ACTUAL camera position (not the
OVERVIEW ideal). Combined with the new LEADER_ZOOM target being at a completely different scale
(higher effZoom), the first few entry frames will see a large `ex` / `ey` error. This accelerates
the camera quickly, then the lerp settles. Looks like an initial "lurch" at the start of entry.

**What the trace would show:** Large `ex` / `ey` in the first LEADER_ZOOM frames, converging rapidly.

---

## 5. Next capture — what the owner needs to do

**The previous capture pressed Z during OVERVIEW (too early). Redo with the following steps:**

1. Navigate to `http://localhost:4173/?camtrace=1`
2. Setup → Space Sprint · Dragon · N=8 · Quick Test → Start Race
3. **Wait** for OVERVIEW to start, then **wait for OVERVIEW to END** (camera zooms back in to LEADER_ZOOM)
4. Watch the camera follow the leader. On the **straight section after a curve** when it feels unrund:
   **Press `Z`**
5. **Immediately after pressing Z** (within 2–3 seconds), run:

```js
copy(JSON.stringify(window.__camTrace().slice(-150), null, 2))
```

This gives the **last 150 frames** (≈2.5 seconds) — much shorter than the full 600-frame trace,
fits within the paste limit, and will contain:
- Last ~30 frames of OVERVIEW
- The OVERVIEW→LEADER_ZOOM transition frame
- The full LEADER_ZOOM entry phase (~20–60 frames)
- The "unrund" moment (near the Z mark)

**Also run:**
```js
copy(JSON.stringify(window.__camTraceMarks(), null, 2))
```
This gives the marks with their timestamp and ring buffer index — useful for pinpointing the
exact Z-marked frame within the trace.

**What to report alongside the trace:**
- Did the unrund feel like: a **jump** (sudden position change), a **wobble** (brief back-and-forth),
  a **snap** (instantaneous), or a **drift** (gradual wrong-direction movement)?
- Was the leader on a curve just before it happened, or already on the straight?
- Did it happen during the zoom-in (camera still zooming) or after the camera had already reached full zoom?

---

## 6. What to look for in the new trace (retrospective — now answered by §7)

Once the LEADER_ZOOM trace arrives, look at:

| Field | Normal | Discontinuity signal |
|---|---|---|
| `phase` | 'entry' → eventually 'tracking' | Watch for the exact frame of phase change |
| `dox` / `doy` | Gradually changing (smooth curve) | **Spike** (>3× normal) or **sign flip** |
| `dz` | Decreasing toward 0 during entry | Spike or non-monotone = zoom wobble |
| `ex` / `ey` | Decreasing toward 0 during entry | Sign flip = overshoot |
| `clamp` | Likely 0 during LEADER_ZOOM | 0→1 toggle = world-edge interference |
| `phase = 'tracking'` first frame | `dox` should match last entry-phase dox | Big delta change = lerp-mode velocity discontinuity |

---

## 7. LEADER_ZOOM trace analysis — root cause found

**Trace 2** spans `ts 50649 → 53331` (~2.7 s visible), all `state: LEADER_ZOOM, phase: tracking`.  
The unrund event is fully captured. The data tells a clear story.

---

### 7a. Entry phase left the zoom grossly overshooted

The **first tracked frame** (`ts = 50 649`) shows:

| Field | Value | Meaning |
|---|---|---|
| `z` (current zoom) | **0.9853** | Camera zoomed IN far |
| `tz` (target zoom) | 0.9568 | Still needs to zoom out a little |
| `tz` (stable floor, ts=51715) | **0.6420** | Final converged zoom is 35% lower |
| `dox`, `doy` | +8.7, +23.0 px/frame | Camera moving fast (leader is still far) |

The entry phase set the camera to `z = 0.985` (effZoom = 1.478). The correct LEADER_ZOOM tracking
zoom turns out to be `z = 0.642` (effZoom = 0.963). **The entry overshot the correct tracking zoom
by 0.343 zoom units — 3× the total range from OVERVIEW to tracking.**

The zoom target (`tz`) itself starts at 0.957 and decreases continuously toward 0.642 over the
first 1066 ms of tracking. This is a deliberate zoom-out driven by the camera director (likely
`_dynamicZoomFloor` or speed-dependent zoom — the exact mechanism needs one more code trace
through `_setTargets` for LEADER_ZOOM). The entry phase converged to a high-zoom value that was
correct at entry-start but is wrong by steady tracking.

---

### 7b. Zoom-pan coupling keeps the camera unsettled for 1.5 seconds

During tracking, the pan target depends on the current zoom:

```
targetOffsetX = -leaderWorldX × effZoom + canvasWidth/2
```

As `effZoom` decreases each frame, `targetOffsetX` changes even if the leader stands still.
The camera cannot converge cleanly on the pan target while the zoom is still changing — the
target is a moving goalposts.

**Measured pan-error growth during zoom correction:**

| Timestamp | `ex` (pan error X) | `dox` | Phase |
|---|---|---|---|
| ts = 50 649 | +52 px | +8.7 px/frame | zoom still at 0.985, far from target |
| ts = 50 983 | +84 px | +13.9 px/frame | error GROWING — zoom-drift pulling target away |
| ts = 51 715 | **+95 px** | +15.8 px/frame | zoom converges to 0.642 — pan error at peak |
| ts = 51 982 | +24 px | +3.9 px/frame | camera closing fast — zoom stable |
| ts = 52 215 | **+0.5 px** | +0.08 px/frame | near-convergence |

For the first 1 066 ms the pan error GROWS even though the camera is moving toward the target.
The zoom correction shifts the target faster than the camera can follow. Only after the zoom
floor converges does the camera start closing the gap cleanly.

---

### 7c. The overshoot and sign-flip (the visible "unrund")

After zoom converges, the camera decelerates from peak dox = +15.8 to near-zero over ~500 ms.
The deceleration is smooth — this is the lerp doing its job.

**The problem is what happens at near-convergence:**

| ts | `ex` | `dox` | Event |
|---|---|---|---|
| 52 215 | +0.48 | +0.08 | Camera nearly stopped, almost on target |
| 52 232 | **−0.16** | −0.03 | **OVERSHOT** — camera passed the target in X |
| 52 265 | −1.28 | −0.21 | Camera now drifting backward (negative dox) |
| 52 449 | −4.41 | −1.58 | Backward drift accumulating |
| 52 582 | −4.87 | **−1.75** | **33 ms gap hits — tz drops 0.64204 → 0.63205** |
| 52 615 | **+1.75** | **+0.63** | **Target snaps +7.26 px — camera must reverse** |
| 52 715 | +5.83 | +2.08 | Camera accelerating forward again |
| 52 998 | +20.4 | +11.9 | Back to chasing the leader (accelerating) |

**Steps broken down:**

1. `ts 52 232`: Camera overshoots by 0.16 px. Tiny, but now ex is negative — the lerp drives
   `dox` negative.
2. `ts 52 232 → 52 582`: Camera drifts backward at −1.6 px/frame while ex = −4 to −5 px.
   This looks like slow backward drift of the camera.
3. `ts 52 582` (33 ms gap): The zoom target drops discretely from 0.64204 to 0.63205. The zoom
   drops 2× the normal amount (dz = −0.00264 vs normal −0.0001). This shifts `tx` by −1.93 px
   (target moves further in the direction the camera just came from).
4. `ts 52 615` (another 33 ms gap): The leader runs 2 physics steps. `tx` snaps **+7.26 px** in
   one frame — target jumps from −1563 to −1556. The camera (`ox = −1558`) is suddenly BEHIND
   the target again (ex = +1.75). `dox` must flip sign: −1.75 → +0.63.
5. From here: camera re-accelerates in the original direction. The zoom target continues
   stepping down, keeping the camera unsettled for many more seconds.

**The visible "unrund"**: slow backward drift → target snaps forward → camera snaps forward.
The snap at step 4 is the perceptual event. The camera that was barely moving in one direction
suddenly moves in the opposite direction in a single frame.

---

### 7d. Why the zoom target keeps decreasing after ts=52582

After the sign-flip event, `tz` continues stepping down:

```
52 582: tz = 0.63205   (−0.01 from 0.64204)
52 748: tz = 0.62203   (−0.01)
52 815: tz = 0.61705   (−0.005)
52 865: tz = 0.61204   (−0.005)
52 931: tz = 0.60208   (−0.01)
53 031: tz = 0.59707   (−0.005)
53 081: tz = 0.58705   (−0.01)
53 165: tz = 0.57709   (−0.01)
53 265: tz = 0.57208   (−0.005)
53 298: tz = 0.56206   (−0.01) ← still decreasing at end of visible data
```

Note: `zadapt = 0` throughout the trace. The `zadapt` field records `wasZoomAdapted` from the
**pan** `resolveCamera` call, but the zoom reduction comes from the **zoom** `resolveCamera` call —
a separate call whose `wasZoomAdapted` is not recorded by the current instrument.

The continuous discrete zoom steps (~0.005–0.01 per step) resemble the `ZOOM_STEP = 0.9`
reduction loop in `resolveCamera`, applied one step at a time. Most likely: as the leader
approaches the world edge (Space Sprint track curves toward the boundary), `resolveCamera`
keeps needing to reduce the zoom to fit the target in the inner frame. **The camera is in a
perpetual zoom-out for the duration of this leader-zoom episode.**

As a result, the `targetOffsetX` is never stable — it keeps drifting because `effZoom` keeps
changing — and the camera can never truly converge. Every near-convergence encounter repeats
the sign-flip pattern.

---

## 8. Root cause summary

| Cause | Evidence | Severity |
|---|---|---|
| **Entry phase zoom overshoot** — camera enters tracking at z=0.985 when correct zoom is z=0.642 | First tracked frame z=0.985, tz→0.642 over 1 066 ms | **PRIMARY** |
| **Zoom-pan coupling** — `targetOffsetX` shifts as zoom lerps, keeping pan target in constant motion | Pan error grows to 95px during zoom correction phase despite camera moving toward target | **PRIMARY** |
| **Continuous resolveCamera zoom reduction** — zoom target decreases for entire visible trace (ts=50649→53331), never stabilising | tz steps from 0.957 to 0.562 in discrete ~0.01 jumps throughout the entire 2.7s window | **PRIMARY** |
| **Near-convergence sign-flip** — camera overshoots and drifts backward when dox nears 0 | ex = −0.16 at ts=52232, dox goes negative for 350ms | SECONDARY (consequence of above) |
| **33ms frame drops amplifying** — dropped frames at ts=52582 and 52615 cause double zoom-step and double leader-move, snapping target +7.26px while camera was drifting −1.75px/frame | tx jumps +7.26 in one 33ms frame at ts=52615; dox reverses sign | SECONDARY (aggravating factor) |

**Single-sentence root cause:** The LEADER_ZOOM camera enters tracking phase with a zoom far above
the correct tracking value, then spends 1+ seconds zooming out; the coupled zoom-pan computation
means the pan target drifts throughout this correction, making clean convergence impossible, and
when the camera nearly converges, a dropped frame causes a +7px target snap that visibly reverses
the camera direction.

---

## 9. Fix directions (not implementing — owner picks)

### Fix A — Prevent entry zoom overshoot (targeted, likely sufficient alone)

The entry phase should not converge to a zoom higher than the tracking target zoom. Options:

1. **Cap entry zoom at the tracking target**: Before the entry lerp runs, clamp `targetZoom =
   min(targetZoom, trackingTargetZoom)`. The camera would zoom in only as far as the correct
   tracking zoom, not beyond.

2. **Immediate zoom correction at tracking phase start**: When `_lerpPhase` switches from
   `'entry'` to `'tracking'`, detect if `z > targetZoom` by more than a threshold; if so, apply
   a faster zoom convergence rate (e.g., a one-time hard-cut or higher lf for the first ~10
   frames).

3. **Reduce entry zoom lerp factor**: Lower `_lfEntry` for the LEADER_ZOOM state's zoom so the
   camera cannot overshoot as far during entry.

### Fix B — Stable pan target during zoom correction (orthogonal fix)

Compute `targetOffsetX` using `targetZoom` (the converged zoom) instead of `this.zoom` (the
still-correcting zoom). This decouples the pan target from the zoom correction:

```js
// In _setOpenTrackTargets — use targetZoom for pan resolution, not current zoom:
const stableEffZoom = Math.max(this.targetZoom * BASE, minEffZoom);  // ← change
const panResolved = resolveCamera({ desiredEffZoom: stableEffZoom, ... });
```

Effect: the pan target would be at the leader's position at the target zoom, not the current
(overshooted) zoom. The camera would pan to the correct "final view" position immediately,
without the zoom-induced target drift. This is the cleanest fix but requires verifying that it
doesn't break edge cases (world-edge clamping, inner-frame guarantee).

### Fix C — Address the dropped frames (ongoing)

The 33ms frame gaps (10% of frames) amplify the sign-flip by causing double target jumps. The
bg-layer translate3d fix reduced GPU overhead; if OVERVIEW is now smooth, these remaining drops
during LEADER_ZOOM may still come from the world canvas repaint (unresolved, see PROMOTION-
DIAGNOSIS.md). Reducing them would shrink the "snap" magnitude but not eliminate the sign-flip.

### Recommended starting point: Fix A option 2 (detect overshoot at tracking-phase start)

It is the most surgical: a one-time correction when `_lerpPhase` switches to `'tracking'` if
`z > targetZoom` by more than a threshold. No entry-phase changes needed, no coupling changes.
Low blast radius. If it visibly reduces the overshoot-deceleration pattern, combine with Fix B
for a complete solution.
