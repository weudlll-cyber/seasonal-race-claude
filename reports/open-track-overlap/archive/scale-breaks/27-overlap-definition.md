# Report 27 — What "Overlap" Means, and Why the Fix Wasn't Visible

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-07

---

## Short answer first

CC and the user were measuring overlap in the same general way (do the two drawn bodies touch?), **but the physics engine was using the wrong track width to decide when bodies are "clear."** Because of that wrong number, the physics declared "safe clearance" when the bodies were still visually overlapping by more than half a body width. Every force calculation in Stages A–D was working correctly — but it was targeting a position that still looked overlapping on screen.

---

## 1. What does the overlap metric count?

Both the sim metric and the physics checks treat two racers as overlapping when **both of the following are true at the same time**:

- Their bodies touch **along the track direction** (one is not yet fully past the other)
- Their bodies touch **sideways** (they haven't moved far enough apart)

It is a true 2D test — both axes must show overlap simultaneously. A racer that has already passed (fully ahead) does not count as overlapping even if it's still beside the other one.

The body size used for the test is **not** the full sprite frame (which includes transparent padding). It is the honest body: `spriteSize × bodyFillX` wide and `spriteSize × bodyFillY` tall — the opaque pixel region you actually see.

---

## 2. The real problem: two different track widths

Here is where everything went wrong.

**The game uses two different numbers for the track width, in two different places:**

| Where | Value | Source |
|-------|-------|--------|
| Physics / avoidance engine | **449 px** | `getActualTrackWidth()` — samples 20 points along the splined curves and takes the median distance between inner and outer boundary points |
| Renderer / racer placement | **300 px** | `track.width` stored in the JSON — the width you set in the editor |

These two numbers are supposed to be the same thing, but they are not.

For Space Sprint the stored width is **300 px** (what you designed), but the spline sampling gives **449 px** because the catmullRom curves wander away from each other at many sample points, producing inflated inter-boundary distances. The median of those inflated samples lands at 449 px.

---

## 3. What that mismatch does to "clearance"

The physics says: "a dragon body is `35.66 px` wide, and the track is `449 px` across, so bodies are clear when the centres are `35.66 px` apart." That centre gap of `35.66 px` corresponds to a `physicalY` difference of `35.66 / 449 = 0.079`.

But the renderer places racers using `300 px` as the track width. A `physicalY` difference of `0.079` moves a racer's centre by only `0.079 × (300 / 2) = **11.9 px**` on screen.

Each drawn dragon body is **28.5 px wide** on screen (computed from the separate render-scale path).

So at the moment the physics declares "clear":
- Centre gap on screen: **11.9 px**
- Body width on screen: **28.5 px**
- **Bodies still overlap by 16.6 px — more than half a body width**

The physics was trying to reach a gap that simply does not exist in the rendering coordinate system.

---

## 4. Why every Stage A–D fix appeared correct but changed nothing visible

All of the force calculations, frame-by-frame simulations, and "reaches clearance in 12 frames" analyses were arithmetically correct **using the physics track width of 449 px**. The forces did move the racers to `physicalY diff = 0.079` in the required number of frames. But on screen, `physicalY diff = 0.079` with `centerWidth = 300 px` still looks like two bodies sitting on top of each other.

The metric `honestOverlapRate` was also using 449 px for its calculations, so it agreed with the physics — both said "getting better," while the screen showed no change.

---

## 5. The fix (one line)

Make the physics use `track.width` (300 px, the same value `getPosition()` uses to place racers) instead of `getActualTrackWidth()` (449 px).

In `index.jsx` the racer object is created with:
```
geometricTrackWidthPx,   // currently = getActualTrackWidth() = 449 px
```

If this is changed to `track.width = 300 px`, then:
- `sameLaneHH = honestBodyWidthPx / 300` → larger → Stage B fires sooner
- The "clear" threshold is now a real pixel gap the user can see
- All the force work from Stage B/C/D carries over — it just needs the correct target

No force changes, no new stages. **One number, in one place.**

---

## 6. Is there a case the user sees as overlap that the metric misses?

Yes — exactly this one, and it was the persistent source of the problem: when `physicalY diff = sameLaneHH` (the physics threshold for "clear"), the **actual on-screen pixel gap is much smaller than one body width** because `getActualTrackWidth()` > `track.width`. The physics declares success; the user sees overlap.

---

## 7. Next step

Before touching forces or thresholds again: fix `geometricTrackWidthPx` to use `track.width` where it is set on racer objects, so the physics and the renderer agree on what "one body width apart" means on screen.
