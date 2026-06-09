# CAMTRACE-ANALYSIS — Camera motion smoothness investigation

**Date:** 2026-06-10  
**Trace:** Owner-captured trace, Space Sprint, post-Direction-A (translate3d fix)  
**Status:** PARTIAL — OVERVIEW data available; LEADER_ZOOM transition data not yet captured.

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

## 6. What to look for in the new trace

Once the LEADER_ZOOM trace arrives, look at:

| Field | Normal | Discontinuity signal |
|---|---|---|
| `phase` | 'entry' → eventually 'tracking' | Watch for the exact frame of phase change |
| `dox` / `doy` | Gradually changing (smooth curve) | **Spike** (>3× normal) or **sign flip** |
| `dz` | Decreasing toward 0 during entry | Spike or non-monotone = zoom wobble |
| `ex` / `ey` | Decreasing toward 0 during entry | Sign flip = overshoot |
| `clamp` | Likely 0 during LEADER_ZOOM | 0→1 toggle = world-edge interference |
| `phase = 'tracking'` first frame | `dox` should match last entry-phase dox | Big delta change = lerp-mode velocity discontinuity |
