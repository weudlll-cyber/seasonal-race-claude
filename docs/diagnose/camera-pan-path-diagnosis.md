# Diagnosis: Camera Pan Path Bug (Euclidean vs. Track Path)

**Date:** 2026-05-14  
**Branch:** master (`5088639`)  
**Context:** Read-only. No code changed. PR #101 untouched.

---

## Background

User observation: After phase switches (especially after BATTLE_ZOOM) the camera briefly
shows only the green inner area of the oval — no race track visible. Also, after
OVERVIEW → LEADER_ZOOM the camera often starts "behind" the leader.

**User hypothesis:** On pan target changes the camera takes the Euclidean shortest path through
world space instead of following the track course.

---

### Point 1: Internal pan target representation

**Finding:**

On closed tracks the camera target point is stored internally as `_camT` (cumulative track
parameter, accumulating unboundedly across laps). Conversion to world coordinates happens
frame-by-frame in `_setTargets()` via:

```js
// CameraDirector.js:803, 822, 841
this._shape.getPosition(((this._camT % 1) + 1) % 1, 0)
```

`EditorShape.getPosition()` normalizes `t` internally once more (`((t % 1) + 1) % 1`) — T > 1
(multiple laps) and T < 0 are correctly mapped to [0, 1). The conversion is therefore
wrap-safe.

When `_camT === null` (no phased observer active) or for OVERVIEW, `getPanTarget()` from
`panTarget.js` is called directly — also returns world coordinates `{x, y}`.

The result of both paths lands in `targetOffsetX`/`targetOffsetY` (screen-pixel-scaled via
`resolveCamera`).

**Relation to user hypothesis:** Neutral — the target position is correctly computed on the track curve.
The problem is not here, but in the step from current → target.

**Impact at current zoom factor:** None direct; the target is correct.

---

### Point 2: Pan interpolation — lerp on what?

**Finding:**

The camera position (`offsetX`, `offsetY`) is steered toward the target **in screen pixel space**:

```js
// CameraDirector.js:457-459
this.zoom    += (this.targetZoom    - this.zoom)    * lf;
this.offsetX += (this.targetOffsetX - this.offsetX) * lf;
this.offsetY += (this.targetOffsetY - this.offsetY) * lf;
```

This is an exponential lerp in **world-pixel-derived screen coordinates**. The unit
`offsetX` directly corresponds to a horizontal pixel offset of the canvas transform:

```js
// RaceScreen/index.jsx:1159-1160
ctx.translate(cam.offsetX, cam.offsetY);
ctx.scale(cam.zoom * bsX, cam.zoom * bsY);
```

There is no mechanism that forces the lerp path along the track course. The lerp
connects old and new world pixel point through a **straight line in 2D world space** — i.e. Euclidean.

No separate RaceScreen lerp for closed tracks (the `0.05` hardcode in line 1132 is
exclusively for open tracks, `if (isOpenTrack)` line 1120).

**Relation to user hypothesis:** **Confirmed.** The lerp is Euclidean in pixel space.

**Impact at current zoom factor:** Critical. The higher the zoom, the narrower the viewport.
At `leaderZoom = 3.5×`: viewport width = 1280 / 3.5 ≈ **366 world pixels**. The Euclidean
lerp path does not need to hit the track — any point on the path that is >183 world pixels from
the nearest track point shows only infield.

---

### Point 3: Track topology handling during pan switch

**Finding:**

There is **no track-path-following mechanism** in the lerp. What works correctly:

- T values → world coordinates via `getPosition` (wrap-safe, see point 1)
- Arithmetic on `_camT` (e.g. lead-out: `_camT += (leadOutTargetT - _camT) * decay`) follows
  the track automatically because T-space interpolation maps through `getPosition` to every world position

What does **not** work:

The `offsetX` lerp line between two world positions follows no curve. Example:

```
Oval setup (schematic):
  t=0.45 → world: (-800, 0)   ← left oval side
  t=0.55 → world: (+800, 0)   ← right oval side
  Infield center: (0, 0)

Lerp path: (-800, 0) → (0, 0) → (+800, 0)   [straight line through infield]
Track path: (-800, 0) → top (0, -600) → (+800, 0)  [follows oval curve]
```

At t=0.45 → t=0.55 the track path is ~2× longer than the Euclidean path — but it stays
on the track curve. The lerp takes the shortcut through the infield.

The cyclic nature of T (**t=0.99 → t=0.01** is track distance 0.02, not 0.98) is considered **only**
in T→world lookups, **not** in the `offsetX` lerp.

**Relation to user hypothesis:** **Confirmed.** The lerp has no knowledge of the track topology.

**Impact at current zoom factor:** If the pan jump between two oval sides is ≥ oval
radius, the lerp passes through the center of the infield. At oval radius R ≈ 1000px and
viewport width 366px both oval sides are ~5 viewport widths apart. The lerp path through
the center would be ~2.7 viewport widths from the nearest track point → track completely
off-screen for many frames.

---

### Point 4: Quantifying pan target jumps on state switch

**Finding:**

**BATTLE_ZOOM → LEADER_ZOOM** (most critical case):

- BATTLE midpoint: `tMid = (r0.t + r1.t) / 2` → world position via `shape.getPosition(tMid)`
  (`panTarget.js:47-49`, `_computePhasedPanTarget:877`)
- LEADER target: `focusT = r0.t` → world position via `shape.getPosition(r0.t)`

If the battle group is fighting e.g. at `tMid ≈ 0.3` (left side) and the leader has broken away to
`t ≈ 0.7` (right side), the jump in world pixel space is:

```
Assumptions (typical dirt oval at 4000px world width):
  Oval radius ≈ 800px (conservative)
  t=0.3 → world: (-600, -200)
  t=0.7 → world: (+600, +200)
  Euclidean distance: ~1265 world pixels

At leaderZoom = 3.5×, viewport width = 366px:
  → jump corresponds to ~3.5 viewport widths
```

This jump in `targetOffsetX` is immediate (in one frame). The lerp step moves `offsetX`
at lf ≈ 0.027/frame (entryTC=0.8s) slowly in that direction — right through the infield.

**OVERVIEW → LEADER_ZOOM:**

- OVERVIEW on closed track: `offsetX = 0` (world center, because zoom=1 and `resolveCamera` centers)
- LEADER_ZOOM: target = leader world position (can be anywhere on the oval)
- Jump = pixel distance from world origin to leader world position

Since the leader typically runs along the oval and not in the infield, the OVERVIEW→LEADER path is
less problematic than BATTLE→LEADER. But at high zoom the lerp starts "from far away"
and the leader keeps running → camera appears "behind" the leader.

**Relation to user hypothesis:** **Confirmed.** BATTLE_ZOOM exit regularly produces large
target jumps to opposite oval sides.

**Impact at current zoom factor:** At zoom 3.5×: 1–3 seconds infield visible depending
on angle difference between battle midpoint and leader position.

---

### Point 5: Special case — pan across start/finish line

**Finding:**

`EditorShape.getPosition()` normalizes `t` internally via `((t % 1) + 1) % 1` (line 75 in
`EditorShape.js`). This means T values > 1 (lap 2+) and transitions t=0.99 → t=1.01 are handled correctly.

Concretely at start/finish crossing:
- t=0.99 → world: e.g. (1000, 300) — just before the line
- t=1.01 → `tNorm=0.01` → world: e.g. (1000, 270) — just after

These two world positions are **adjacent** (small Euclidean distance). The lerp path
between them stays close to the track — no infield problem.

**Exception lead-in:** If `_camT = focusT + leadInDt` and `focusT` jumps from 0.95 to 1.05
(lap crossing during lead-in), `_camT` could suddenly rise significantly. But since leadInDt
is calculated proportional to racer speed and racers travel at ~constant speed, this jump is small.

**Relation to user hypothesis:** **Refuted for this special case.** Start/finish crossing is not
an infield problem — the world positions on both sides of the line are adjacent.

**Impact at current zoom factor:** None. This special case is handled correctly.

---

### Point 6: Open track vs. closed track

**Finding:**

Closed track (this diagnosis):
- Lerp in `CameraDirector.js:458`: `offsetX += (targetOffsetX - offsetX) * lf`
- Euclidean in world pixel space
- Bug occurs when old and new pan position are on different oval sides

Open track:
- Separate code path in `RaceScreen/index.jsx:1120-1134`
- `st.camX = st.camX + (resolved.camX - st.camX) * 0.05` (hardcoded 0.05 lerp)
- Open tracks have no cyclic topology → no infield equivalent
- No circular track course → Euclidean lerp never goes "through" a track center

**Relation to user hypothesis:** Bug occurs **only on closed tracks**. Open tracks are not
affected.

**Impact:** The user observation (infield visible) is exclusively a closed-track
phenomenon. Confirms that it is a topological problem.

---

## Verdict on user hypothesis

**Partially confirmed** — with a clarification.

The user hypothesis is correct in substance: on pan switches the camera does take the
Euclidean shortest path through 2D world space, without following the track course. This
path can lead through the infield.

**Clarification:** It is not a deliberate design decision for the "direct route", but a
consequence of the lerp operating on `offsetX`/`offsetY` (screen pixel space) with no
track topology knowledge. The target (`targetOffsetX`) is always a correct point on the
track curve — but the **path** from old to new target is always a straight line in
world pixel space.

---

## Root code

| File | Line | Description |
|---|---|---|
| `CameraDirector.js` | 457-459 | Exponential lerp in pixel space — Euclidean, no track knowledge |
| `CameraDirector.js` | 604-605 | `_transition()` does NOT reset `offsetX`/`offsetY` — old value remains, lerp starts from there |
| `CameraDirector.js` | 759-760 | `targetOffsetX` is correctly derived from world coordinates — but the path to it is Euclidean |

**Secondary cause:** `_transition()` sets `_lerpPhase = 'entry'` (line 605) but not
`offsetX = targetOffsetX`. This is by design (no hard cut at transition), but it means
the lerp starts from the old state position — arbitrarily far from the new target.

---

## Why is it worse with an increased zoom factor?

Linear: `viewport_width_world = CANVAS_W / (leaderZoom × bsX)`

| leaderZoom | World pixels in viewport |
|---|---|
| 2.5× | ~512 px |
| 3.5× | ~366 px |
| 5.0× | ~256 px |

The smaller the viewport, the sooner (= smaller distance from track center) the camera shows
only infield. At 3.5× only ~183 world pixels from the track are enough to lose the track
completely from frame.

---

## What explains the observation "camera starts behind the leader" (OVERVIEW → LEADER_ZOOM)?

This is a **different cause**, not an infield problem:

- OVERVIEW: `offsetX ≈ 0` (closed track, zoom=1, centroid near world origin)
- LEADER_ZOOM: `targetOffsetX` = leader world position; leader **keeps moving**
- `entryTC = 0.8s` → camera converges to 95% on the leader in ~3 TC ≈ 2.4s
- Since `_camT = focusT` in the entry block is updated every frame, `targetOffsetX`
  **moves** with the leader
- The camera therefore always lags behind the leader by a TC-conditioned delay — not in the infield,
  but the leader runs out of the front portion of the frame

This is **not a Euclidean path bug**, but pure TC lag in the entry-phase design.

---

## Unimplemented fix suggestions (for reference only, not an assignment)

1. **T-space lerp for `_camT`:** Instead of lerping `offsetX` directly, `_camT` could be
   steered exponentially toward target T (`_camT += (targetT - _camT) * lf`),
   and `targetOffsetX` would be computed from the current `_camT`. Camera pan would then
   follow the track course. Problem: wrap-around at t≈0 (t=0.99 → t=0.01 would be Δt=-0.98
   instead of +0.02) requires a shortest-path algorithm in T-space. Also during zoom
   (entry phase) T-space lerp would produce different convergence behavior.

2. **Direct jump on state transition:** Set `offsetX = targetOffsetX` in `_transition()`
   (hard cut instead of lerp). Eliminates infield traversal but is visually abrupt.

3. **Short blend-out + hard cut + blend-in:** 3-frame black fade at transition, then
   camera directly at new position. No infield visibility, but an obvious cut.

---

*Report based exclusively on static code analysis. No tests, no browser, no code changes.*
