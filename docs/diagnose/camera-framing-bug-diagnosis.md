# Camera Framing Bug — Diagnosis Report

**Status:** 2026-05-14 | Branch: master (`5088639`) | Read-only

---

## Files examined

| File                   | Relevant lines                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CameraDirector.js`    | 389–514 (`update`), 517–684 (`_transition`), 629–683 (observer init), 429–450 (entry align), 460–476 (convergence gate), 738–762 (`_setClosedTrackTargets`), 864–978 (`_computePhasedPanTarget`) |
| `RaceScreen/index.jsx` | 1120–1177 (open-track pan + canvas transform)                                                                                                                                                    |
| `panTarget.js`         | Complete (75 lines)                                                                                                                                                                              |
| `resolveCamera.js`     | Complete (118 lines)                                                                                                                                                                             |

---

## Hypotheses

---

### Hypothesis 1: Lead-in start position is destroyed in the same frame

**Claim:**
`_transition()` sets `_camT = focusT + leadInDt` (a lead-in distance _ahead of_ the racer). Still within the _same_ `update()` call, this value is immediately overwritten by the entry-alignment logic (lines 429–450). The pan target during the lead-in phase therefore points _behind_ the racer, not ahead.

**Code path in detail (one `update()` iteration after transition):**

```
_transition() → lines 659–660:
  speedPerFrame = focusT - _prevFocusT   (measured racer speed)
  _camT = focusT + speedPerFrame * 60 * leadInDuration  ← AHEAD

SAME update() call, lines 429–450:
  if (_lerpPhase === 'entry' && _camT !== null && !isOpenTrack && shape) {
    fT = fr[0]?.t   ← leader.t (current position)
    _camT = fT      ← IMMEDIATELY OVERWRITTEN
    _prevFocusT = fT
  }

_setTargets() → lines 802–803:
  panTarget = shape.getPosition(_camT, 0)  ← uses fT, NOT focusT+leadInDt
```

**What happens next:**

After convergence (Entry→Tracking, line 473–474):

```javascript
this._lerpPhase = "tracking";
this._leadInStartTs = ts; // ← Timer RESET to now
```

`_computePhasedPanTarget()` checks (line 931):

```javascript
const elapsed = ts - (this._leadInStartTs ?? ts); // elapsed ≈ 0 (just reset)
if (elapsed >= prof.leadInDuration * 1000) {
  /* follow */
} else {
  this._prevFocusT = focusT;
  return; // ← does nothing for 1.0s
}
```

During the lead-in phase (tracking phase, 1.0 s):

- `_computePhasedPanTarget()` returns early
- `_camT` is NOT updated (entry alignment only runs when `_lerpPhase === 'entry'`)
- `_setTargets()` uses frozen `_camT` = racer's position at tracking start
- Racer keeps moving; camera looks at the old position

**Evidence:**

- `_transition()` line 659–660: `this._camT = focusT + leadInDt`
- `update()` line 429–448: entry alignment overwrites `_camT = fT` in same call
- `update()` line 474: `this._leadInStartTs = ts` — timer reset after convergence
- `_computePhasedPanTarget()` line 865: `if (this._lerpPhase !== 'tracking') return;` — does not run during entry
- `_computePhasedPanTarget()` line 934–938: lead-in returns early; `_camT` stays frozen

**Impact at current zoom setup:**

Assumptions: `referenceSpriteSize ≈ 30px`, `bsX = 1.0`, `leaderZoom ≈ 2.16` (from `0.09 * 720 / 30 = 2.16`). Visible world extent: `1280 / 2.16 ≈ 593px` wide → half-width ≈ 297px.

Typical racer speed: if `speedPerFrame ≈ 0.003 t/frame` (fast) and track circumference ≈ 4000px effective, that is ≈ 12px/frame world movement = 720px/s.

In 1.0s lead-in on a straight: racer moves ≈ 720px along world X. At zoom 2.16: camera misses the racer by 720px in world coordinates → **far outside the 297px half-width → off-screen.**

Even for slow racers (e.g. 200px/s): 200px in 1.0s. At zoom 2.16 the visible half-width is 297px. Racer remains visible but immediately leaves the inner frame (70% × 297px = 208px).

**Falsifiable by:**
If the problem also occurs with `leadInDuration = 0` (set to 0 in DevPanel), H1 is _not_ the cause (no lead-in freeze exists). If the problem disappears at `leadInDuration = 0`, H1 is confirmed.

**Confidence: High**

---

### Hypothesis 2: Convergence gate bypasses pan check when phased observer is active

**Claim:**
When `phasedActive = true` (closed track with shape + `_camT !== null`), the pan convergence condition in the entry gate is completely skipped. The Entry→Tracking transition fires as soon as only the _zoom_ has converged, regardless of how far the camera still is from the pan target.

**Code (lines 468–472):**

```javascript
const phasedActive = this._camT !== null && !this._isOpenTrack && this._shape;
const zoomConverged = this._lastEntryDeltaZoom < this._entryConvergenceZoom;
const xConverged = phasedActive || this._lastEntryDeltaX < this._entryConvergencePx;
const yConverged = phasedActive || this._lastEntryDeltaY < this._entryConvergencePx;
if (zoomConverged && xConverged && yConverged) {
  this._lerpPhase = 'tracking';
  this._leadInStartTs = ts;
```

When `phasedActive = true`: `xConverged = true` and `yConverged = true` always, regardless of `_lastEntryDeltaX` and `_lastEntryDeltaY`.

**Reason for the bypass (comment lines 465–467):**

```
// When phased observer is active, _camT tracks focusT (above), so targetOffsetX
// moves with the racers every frame — the pixel lag cannot converge to the fixed
// threshold regardless of zoom factor (H-E).
```

The reasoning is correct: during entry `_camT = fT` moves with the racer every frame → `targetOffsetX` always equals the running racer's position → the delta measurement (`_lastEntryDeltaX`) stays high because it measures pan vs. target every frame, not convergence to a resting position.

**Problem:** The bypass flag remains `true` on the same `_camT` variable that is later frozen during the lead-in. This means: the convergence claim "if phasedActive, then pan is considered converged" is correct for the _entry phase_, but it also means that **tracking starts before the camera has spatially caught up with the racer** — and so the lead-in freeze begins with a potentially large spatial offset.

**Evidence:**

- Lines 468–472: `phasedActive` short-circuit for `xConverged`/`yConverged`
- Lines 429–450: entry alignment correctly justifies the bypass (target is moving)
- Line 474: `_leadInStartTs = ts` directly after convergence → lead-in starts with existing lag

**Impact:**
Entry phase with TC=0.8s and zoom from 1.0 → 2.16: zoom converges after ~74 frames (1.23s). During this time `offsetX` follows the running racer but due to entry TC (slow) is permanently ~1–3 frames behind the target. At the switch to tracking `offsetX` is ~40–80 screen pixels behind the racer. The lead-in freeze fixes this gap and the racer runs further out.

**Falsifiable by:**
If the problem disappears at very low racer speeds (slow tracks), H2 is the main driver. On fast tracks: H2 amplifies H1.

**Confidence: High** (sharpens H1, does not act independently)

---

### Hypothesis 3: Pan-target lag during zoom transition (zoom-pan race)

**Claim:**
`_setClosedTrackTargets()` computes `targetOffsetX` with `currEffZoom = this.zoom * this._bsX` — the _current_ zoom before the lerp step. Since zoom and pan lerp with the same factor but the pan target is a function of the currently-lerping zoom, a systematic one-frame lag is introduced.

**Code (lines 750–760):**

```javascript
const currEffZoom = Math.max(this.zoom * this._bsX, minEffZoom);  // ← pre-lerp zoom
const panResolved = resolveCamera({ desiredEffZoom: currEffZoom, ... });
this.targetOffsetX = -panResolved.camX * panResolved.effectiveZoom;
// Then:
this.zoom += (this.targetZoom - this.zoom) * lf;          // zoom lerps
this.offsetX += (this.targetOffsetX - this.offsetX) * lf; // pan lerps to stale base
```

The pan target on frame N is based on `zoom_N` (before lerp). On frame N+1: `zoom_{N+1} = zoom_N + Δzoom`. The "correct" pan for `zoom_{N+1}` would be `f(zoom_{N+1})`, but `targetOffsetX` was computed with `f(zoom_N)`. `offsetX` lerps toward a stale target.

**Quantification:**

For the unclamped case (racer far enough from world edge): `targetOffsetX ≈ -racer.x × effZoom + canvasW/2` (linear in effZoom).

Lag in screen pixels ≈ `(racer.x - worldW/2) × Δzoom_per_frame`

At entry TC=0.8s, Δzoom_max at frame 0 = `(2.16 - 1.0) × lf ≈ 1.16 × 0.047 = 0.055`.
For racer 200px outside image center: lag frame 0 ≈ `200 × 0.055 = 11px`. Minor.

**Critical point: world-edge clamping at small zoom**

At overview zoom (effZoom=bsX=1.0) the camera pan cannot occur because `camXMax = max(0, worldW - canvasW/effZoom) = 0`. Pan is clamped to 0. When zoom crosses the "unclamp threshold" (racer can first be centered), `targetOffsetX` jumps abruptly from 0 to a significant value.

Unclamp threshold for racer at worldX=700 on worldW=1280:
`effZoom_unclamp = canvasW / (2 * (worldW - racer.x)) = 1280 / (2 × 580) ≈ 1.10`

Below 1.10: targetOffset = 0. Directly above: targetOffset jumps to > 100px. The pan has no warning — it must catch up from 0.

**Impact at current zoom setup:**

Calculation: racer worldX=700, OVERVIEW→LEADER (zoom 1.0→2.16, lf=0.047/frame):

| Frame | effZoom | targetOffset (px) | offsetX (px) | Racer screen X |
| ----- | ------- | ----------------- | ------------ | -------------- |
| 0     | 1.000   | 0                 | 0            | 700            |
| 1     | 1.054   | –69               | –3.2         | 1082→          |
| 10    | 1.475   | –405              | –98          | 1079→          |
| 20    | 1.840   | –681              | –267         | 1117→          |
| 30    | 2.077   | –856              | –443         | 873            |
| 48    | 2.155   | –930              | –634         | 605 ✓          |

Racer at worldX=700 stays on screen in this example (screen x < 1280) but comes very close. At worldX=900 (260px right of center) the racer would be right of screen x=1280 at frames 10–20: **off-screen**.

This hypothesis is relevant for racers that are strongly off-center at the time of transition (straights near world edge, tight curves).

**Falsifiable by:**
If the problem only occurs for racers that are far outside the screen center (near world edge), H3 is a factor. If it also occurs at screen center, H3 alone is insufficient.

**Confidence: Medium** (amplifying factor, rarely sole cause)

---

### Hypothesis 4: Follow-phase snap after 1.0s lead-in

**Claim:**
The transition from lead-in to follow sets `this.offsetX` and `this.targetOffsetX` directly (no lerp). If the camera lost the racer during the lead-in phase, the snap corrects the camera abruptly back to the racer. Visually: racer jumps back into frame from off-screen.

**Code (lines 970–975):**

```javascript
// Follow phase in _computePhasedPanTarget():
this.offsetX = this.targetOffsetX = -resolved.camX * resolved.effectiveZoom;
this.offsetY = this.targetOffsetY = this._closedOffsetY(camPos.y, ...);
```

These are direct assignments to the live values `this.offsetX` and `this.targetOffsetX` — no lerp interpolation. In the same render function, after returning to `update()`, the already-snapped `offsetX/Y` are returned.

**Interaction with H1:**

- Lead-in (1.0s): racer runs out of frame
- Follow transition: camera snaps back to racer
- User perception: "racer briefly disappears, then reappears"

**Evidence:**

- `_computePhasedPanTarget()` line 970: `this.offsetX = this.targetOffsetX = ...`
- `update()` returns `{ zoom: this.zoom, offsetX: this.offsetX, offsetY: this.offsetY }` (line 514)
- No interpolation step between lead-in exit and follow entry

**Impact:**
The longer the lead-in phase and the faster the racer, the larger the snap. At 1.0s lead-in and 720px/s racer ≈ 720px world movement → at zoom 2.16 ≈ 1555 screen pixel snap in one frame.

**Falsifiable by:**
If the "reappearance" moment is abrupt (racer jumps instantly to center, not zooms in), H4 is confirmed. If the racer gently slides back in, H4 is not the follow snap.

**Confidence: High** (directly explains "disappears, then snap back")

---

### Hypothesis 5: Open track — pan lag from hardcoded 0.05 lerp

**Claim:**
On open tracks, pan smoothing is not calculated from the CameraDirector TC system but uses a fixed factor of 0.05 per frame in `RaceScreen/index.jsx:1132`. This corresponds to an effective time constant of ~3.3s — about 4× slower than entry TC=0.8s on closed tracks.

**Code (`RaceScreen/index.jsx` line 1132):**

```javascript
st.camX = isFinite(st.camX)
  ? st.camX + (resolved.camX - st.camX) * 0.05
  : resolved.camX;
```

`tcToLerpFactor(tc) = 0.05` → `tc ≈ 1/FRAME_RATE × log(0.1)/log(1-0.05) ≈ 3.3s`

The phased observer (lead-in/follow/lead-out) is DISABLED on open tracks (lines 485–487):

```javascript
if (!this._isOpenTrack && this._camT !== null && this._shape) {
  this._computePhasedPanTarget(...);
}
```

H1–H4 therefore apply exclusively to **closed tracks**. On open tracks there is instead a permanent slow pan lag after every transition.

**Evidence:**

- `RaceScreen/index.jsx:1132`: hardcoded 0.05
- `CameraDirector.js:485`: `if (!this._isOpenTrack && ...)`
- No `dt` scaling on open track (pan TC not framerate-independent)

**Falsifiable by:**
If the bug occurs exclusively on closed tracks, this rules out H5 as the cause of the reported bug (and confirms H1–H4).

**Confidence: Low** (explains a different problem, not the reported one)

---

## Ranking by likelihood

| Rank | Hypothesis                            | Confidence | Independent?            | Explains off-screen?                | Explains snap back?       |
| ---- | ------------------------------------- | ---------- | ----------------------- | ----------------------------------- | ------------------------- |
| 1    | H1: Lead-in freeze looks behind racer | High       | Yes                     | Yes (fast racers)                   | No (but H4 explains that) |
| 2    | H4: Follow-phase snap                 | High       | No (consequence of H1)  | No                                  | Yes                       |
| 3    | H2: Convergence gate bypass           | High       | No (sharpens H1)        | No alone                            | No                        |
| 4    | H3: Pan-target lag / world-edge clamp | Medium     | Yes                     | Only at extreme off-center position | No                        |
| 5    | H5: Open track hardcoded lerp         | Low        | Yes (different problem) | No                                  | No                        |

**Most likely explanation for the reported bug pattern:**

H1 + H2 + H4 together explain the full bug cycle:

1. **H2**: Entry→Tracking switches as soon as zoom converges, without pan being fully converged.
2. **H1**: Lead-in timer is reset at tracking start. `_camT` is frozen. Camera looks at racer's position from 1.2s ago. Racer runs out of frame.
3. **H4**: After 1.0s lead-in, follow snaps the offset directly to the racer → abrupt reappearance.

---

## Recommendation: Verification order

**Step 1 — Quick test without browser:**
Set `leadInDuration` for LEADER_ZOOM in DevPanel to `0.0`. If the problem disappears, H1+H4 is confirmed. No code needed, pure config change.

**Step 2 — Diagnostic log:**
In `_computePhasedPanTarget()` before the lead-in early return (line 935) log: `console.log('[LEAD-IN] camT=', this._camT, 'focusT=', focusT, 'delta=', focusT - this._camT)`. If `focusT - _camT` grows monotonically (racer running away from frozen position), H1 is directly measurable without browser interaction.

**Step 3 — Convergence gate check:**
Log `_lastEntryDeltaX` and `_lastEntryDeltaY` at the moment `_lerpPhase` switches from `'entry'` to `'tracking'`. If the values are > 50px, that confirms H2 (pan was not yet converged when lead-in started).

---

## Open questions

1. **`shape.getPosition(_camT, 0)` vs. `r0.x, r0.y`:** During the entry phase `panTarget = shape.getPosition(leader.t, 0)` is computed. If racers are physically running beside the center line (lane offset), `shape.getPosition()` might return the track center, not the actual racer position. Unclear whether this is a relevant factor — depends on whether `r0.x/r0.y` come from the shape offset or directly from physics.

2. **BATTLE→LEADER zoom direction:** With BATTLE→LEADER the zoom decreases (battle zoom > leader zoom, since `spritePct` battle=0.14 > leader=0.09). H3 (clamp transition) acts differently for zoom decrease vs. zoom increase — only the OVERVIEW→LEADER case was quantified above.

3. **`_prevFocusT` quality:** The lead-in start position `focusT + speedPerFrame × 60 × leadInDuration` is based on `_prevFocusT` from the last frame. If the previous state was OVERVIEW (pan to centroid, not to leader), `_prevFocusT` may not reflect the leader speed. Concrete initialization unclear.
