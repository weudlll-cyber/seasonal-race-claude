# CAMERA-JITTER-1 — the min-visible floor jitters zoom+pan; smooth it (regression from LEADER-MINVIS-1)

**Base: `origin/master` @fc09fcd. Author: CC.** Since LEADER-MINVIS-1 the per-frame min-visible floor
(`_zoomFloorForMinVisible` → `targetZoom` clamp) is recomputed raw every frame from the visTarget-th nearest
racer; in the dense COMBO15 field that racer flips frame-to-frame, so `targetZoom` — and the coupled pan — swim.
Presentation-only; fingerprint `ded0a126048e4cdb` stays IDENTICAL.

## VERDICT (read first): FIXED with an asymmetric rate-limit. Floor swing 0.42 → 0.04; guarantee kept.
The floor now **loosens instantly** (zoom out — never crops a racer) but **tightens only slowly** (zoom in ≤
`zoomOutStepPerFrame`/frame), so it pins to the loosest recent value and gives the zoom lerp a STABLE target.

## STEP 0 — CONFIRM (trace)
On a dense dynamic synthetic (40-racer ring, the ~8th-nearest wobbling across the leader-zoom viewport edge so
the binding racer flips), the raw floor **oscillated over `[1.391, 1.810]`** — amplitude **0.42**, max per-frame
|Δ| **0.25**, mean |Δ| **0.12**, with **22 direction-flips in 79 steady frames**. Because `_setClosedTrackTargets`
computes the pan offset at the (now-jumping) zoom, the pan wobble tracks the zoom wobble one-for-one — the camera
swims and loses its subject.

## STEP 1 — SMOOTH THE FLOOR (option a: asymmetric rate-limit — chosen)
Chosen over hysteresis (b) and rolling-max input (c) because it is the simplest that both **kills the jitter and
provably never crops**, and it re-uses the now-orphaned `zoomOutStepPerFrame` knob as the tighten rate. Each frame
compute the raw floor `rawFloor = max(effectiveFloor, min(targetZoom, minVisZoom))`, then:
- **first frame of the phase** (`_leaderPhaseZoomFloor === null` after a transition) → snap to `rawFloor`
  (correct framing on entry);
- **`rawFloor ≤ floor`** (loosen / zoom out) → set immediately (never crop a newly-strung racer);
- **`rawFloor > floor`** (tighten / zoom in) → `floor = min(rawFloor, floor + zoomOutStepPerFrame × dtScale)`.
Then `targetZoom = min(targetZoom, floor)`. The existing zoom lerp is unchanged; the point was to make its TARGET
stable. Same trace after the fix: floor range **[1.391, 1.433]** (amplitude **0.04**, 10×), max per-frame |Δ|
**0.03**, mean **0.008** — a stable target hovering at the loose end with a gentle creep.

## STEP 2 — GUARANTEE KEPT
The smoothed floor is always `≤ rawFloor` (tightening is capped at `rawFloor`, loosening jumps below it), and
`rawFloor ≤ minVisZoom` in the binding case, so `targetZoom ≤ minVisZoom` — the **target never crops**
`min(8, active)` racers. The live count can dip by one or two for a few frames while `this.zoom` lerps out to a
sudden string-out (the spec's accepted "loosen lag"), but it never collapses to the pre-LEADER-MINVIS handful
(steady-state mean ≈ 8 on the churning synthetic). **BATTLE is untouched** — the floor gates only LEADER_ZOOM /
LEAD_CHANGE.

## STEP 3 — TESTS (3 new; `CameraDirector.test.js`, 349 camera tests green)
Flipping-binding-racer dynamic field → floor's upward steps are bounded by `zoomOutStepPerFrame` and its
steady-state range < 0.15 (vs the raw ~0.42 swing) · no-collapse: the field stays in frame every steady frame
(≥5, mean ≥7 of the min-8 target) on the churning field · small-field guard: a 6-racer dynamic field never
over-zooms (all 6 shown). The existing LEADER-MINVIS static-field guarantees and the BATTLE-untouched test are
unchanged.

## VERIFY
Fingerprint `ded0a126048e4cdb` IDENTICAL (camera is presentation-only) · full suite 162 files / **3335 tests
green** · eslint + build clean. Owner eye: with the dev server restarted, LEADER should hold steady on a dense
field — no swimming — while still opening wide enough to show the pack.

## THE FIVE SENTENCES
1. LEADER-MINVIS-1's min-visible floor was recomputed raw each frame from the visTarget-th nearest racer, which
   flips constantly in the dense COMBO15 field, so `targetZoom` (and the pan computed at that zoom) oscillated
   ~0.42 and the camera swam.
2. The fix smooths the floor asymmetrically — loosen (zoom out) immediately so a racer is never cropped, tighten
   (zoom in) only ≤ `zoomOutStepPerFrame`/frame so a transient flip can never snap the camera inward — pinning it
   to the loosest recent value.
3. That gives the unchanged zoom lerp a stable target: the traced floor swing dropped from 0.42 to 0.04 and the
   max per-frame step from 0.25 to 0.03.
4. The guarantee holds because the smoothed floor is always ≤ the instantaneous min-visible requirement, so the
   target never crops `min(8, active)` racers; only a brief loosen-lag dip (accepted by the spec) can occur while
   the lerp catches a sudden string-out.
5. Behavior-neutral for the shipped game — fingerprint identical, 3335 tests green (3 new jitter tests), BATTLE
   untouched, eslint + build clean.

## PROPOSALS (≥2)
1. **Expose the tighten rate + a "floor lagging" flag in the camera HUD.** The owner runs `showCameraStateHud`;
   showing the smoothed floor, the raw floor, and whether it is currently loosening/tightening would make this
   rate-limit (and any future re-tune of `zoomOutStepPerFrame`) legible during a race rather than a hidden EMA.
2. **Consider damping the pan focus the same way if any residual wobble remains.** The pan is now stable because
   the zoom target is stable, but the focus itself (`getPanTarget`) can still hop if the "leader" identity flips
   in a photo-tight front; a short focal EMA (the code already has `_focalSmoothTc`) scoped to LEADER would be
   the analogous smoothing if the owner still sees lateral wobble.
3. **Promote the dense-dynamic synthetic into a reusable camera-stability fixture.** The flipping-binding-racer
   field caught this regression; keeping it as a shared test helper (with a per-frame-delta budget) would guard
   every future change to the LEADER framing against re-introducing swim.

---
**Presentation-layer only** (`CameraDirector.js` floor smoothing + 3 tests). Shipped fingerprint
`ded0a126048e4cdb` unchanged.
