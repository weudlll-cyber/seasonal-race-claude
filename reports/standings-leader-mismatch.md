# Standings/Crown Leader Mismatch — Root-Cause Diagnosis

**Date:** 2026-06-06
**Branch:** `feat/open-track-overlap`
**Symptom:** On Space Sprint, the on-track crown (Echo) disagrees with the standings #1 (Meridian). Camera follows Echo; the HUD list shows Meridian as leader.

---

## Source 1 — On-Track Crown

**File:** [racerRendering.js:81](client/src/screens/RaceScreen/drawing/racerRendering.js#L81)

```js
const leader = st.racers.reduce((a, b) => (b.t > a.t ? b : a));
```

**Metric: raw `r.t`** — the physics spline parameter. The racer with the highest `r.t` gets the crown drawn above its name tag (line 38–42) and is the argument to `r === leader` in `drawNameTag` / `racerType.drawRacer`.

---

## Source 2 — Camera Leader

**File:** [CameraDirector.js:491](client/src/modules/camera/CameraDirector.js#L491), [:519](client/src/modules/camera/CameraDirector.js#L519), [:563](client/src/modules/camera/CameraDirector.js#L563), [:892](client/src/modules/camera/CameraDirector.js#L892)

All camera-state methods sort by:
```js
const sorted = [...racers].sort((a, b) => b.t - a.t);
const leader = sorted[0];
```

**Metric: raw `r.t`** — identical to the crown. The camera follows whoever has the highest `r.t` (with hysteresis debounce). The minimap also uses `r.t` ([index.jsx:1421](client/src/screens/RaceScreen/index.jsx#L1421): `st.racers.reduce((best, r, i) => (r.t > st.racers[best].t ? i : best), 0)`).

Crown, camera, minimap — all three agree on the same `r.t`-based leader.

---

## Source 3 — Standings List (#1 crown in HUD)

**File:** [index.jsx:1003–1018](client/src/screens/RaceScreen/index.jsx#L1003)

```js
// Scoreboard: update when physicsTs crosses a 100ms bucket boundary
if (Math.round(physicsTs / 100) !== Math.round((physicsTs - FIXED_DT) / 100)) {
  setScoreboard(
    // Fix 1: On open tracks sort by projected world position (r.x/r.y already
    // updated by computePositions above) so the HUD leader matches the visual.
    [...st.racers]
      .sort(
        isOpenTrack
          ? (a, b) =>
              b.x * openTrackFwdCos +
              b.y * openTrackFwdSin -
              (a.x * openTrackFwdCos + a.y * openTrackFwdSin)
          : (a, b) => b.t - a.t
      )
      .map((r, i) => ({ ...r, rank: i + 1 }))
  );
}
```

**Metric (open tracks): world XY dot product** — projects each racer's world position onto a fixed forward direction vector.

The fixed forward direction is:
```js
// index.jsx:696–699
const openTrackAngle = isOpenTrack ? shapeRef.current.getPosition(0.5, 0).angle : 0;
const openTrackFwdCos = Math.cos(openTrackAngle);
const openTrackFwdSin = Math.sin(openTrackAngle);
```

This samples the track tangent at **t = 0.5 (track midpoint) once at race start.** The same fixed (cos, sin) pair is used for every scoreboard sort for the entire race.

**Metric (closed tracks): `b.t - a.t`** — same as the crown. No divergence on closed tracks.

---

## Task 3 — Exact Cause of Divergence

**The XY projection and `r.t` are different metrics, and they disagree on any curved open track.**

For a straight horizontal open track:
- Every increase in `r.t` maps to a proportional increase in `r.x`
- The XY projection `r.x * cos(0°) + r.y * sin(0°)` = `r.x` increases monotonically with `r.t`
- Both metrics agree → no visible mismatch

For a curved open track (Space Sprint, Luger Hill, etc.):
- The track tangent angle varies with `r.t`
- After the midpoint, the track may curve upward, downward, or laterally
- A racer at `r.t = 0.8` past a curve can have a **smaller** XY projection than a racer at `r.t = 0.65` still on the straight portion
- The scoreboard ranks the `t=0.65` racer as #1; the crown and camera rank the `t=0.8` racer as leader

**Concrete example:** Space Sprint. The comment says the fix was added to "match the visual" — presumably for some configuration where `r.t` and XY agreed. On the Space Sprint track with its actual geometry, they do not agree.

The forward direction at t=0.5 is not representative of the track's overall direction. A single sampled angle cannot accurately rank racers on a path that curves by more than ~15–20°.

### Why the original "Fix 1" introduced the divergence

The commit message / comment implies this was a deliberate change: sort by XY so "HUD leader matches the visual." But:
- The "visual" (crown, camera) uses `r.t` — NOT XY
- Changing the standings sort to XY while leaving the crown on `r.t` made the standings and crown DIVERGE, which is the opposite of the stated goal

The fix produced correct results on whichever track was tested at the time (likely a straighter one) but was not correct in general.

---

## Task 4 — Which Is the TRUE Race Position?

**`r.t` is canonical.** Every race-critical system uses it:

| System | Metric | Location |
|---|---|---|
| On-track crown | `max(r.t)` | racerRendering.js:81 |
| Camera leader | `max(r.t)` | CameraDirector.js:491, 563, 892 |
| Minimap leader dot | `max(r.t)` | index.jsx:1421 |
| Finish detection | `r.t >= st.finishT` | index.jsx:994 |
| Rubber-band leader | `max(r.t)` | index.jsx:848–850 |
| Re-roll leader check | `max(r.t)` (via t-sorted racers) | CameraDirector.js:519 |
| Closed-track standings | `b.t - a.t` | index.jsx:1015 |

`r.t` is the spline parameter that directly encodes distance along the race path. When `r.t >= finishT`, the race is over for that racer — `r.t` IS the finish criterion. XY projection is a derived, lossy approximation that loses accuracy on curves.

**The standings list SHOULD reflect `r.t` order.** Currently it does not, for open tracks.

---

## Task 5 — Finish-Time Order Consequence

After a racer finishes (`r.t >= st.finishT`), `r.finished = true` and `r.finishTimeMs = physicsTs`. Their `r.t` is now at or beyond `st.finishT`. Their world position is clamped to `Math.min(r.t, 1)` in `computePositions()` (index.jsx:706), so all finished racers are placed at `t = 1.0` (the same point on the track).

When the scoreboard sorts by XY projection, all finished racers produce **the same XY projection value** (they're all at the same world position). Their relative order is determined by the JavaScript sort's stability on ties — in practice this is insertion order (array order), which is racer-array order by index, NOT finish order.

**Result:** Finish times shown in the standings DO NOT appear in finishing order. A racer who finished 5th (by t crossing finishT) could appear above the racer who finished 1st if their array index is lower.

If the standings switched to `b.t - a.t` sort:
- Finished racers still share the same clamped `t = 1.0`... actually no — their raw `r.t` continues to grow beyond `finishT` after finishing (since the physics loop continues and updates `r.t` but skips them in the finish check via `if (r.finished) continue`).

Wait, actually: `if (r.finished) continue` at line 993 skips finished racers from FURTHER finish-detection, but does the physics still advance their `r.t`? Let me check — `applyRacerBehavior` and the t-update loop likely still run for them. If so, finished racers still have increasing `r.t` values, and the first to finish has the highest `r.t` among finished racers → `b.t - a.t` sort would correctly rank finished racers by finish order.

**Confirmed: switching standings sort to `b.t - a.t` on open tracks would correctly order finished racers by finish time, since the earliest finisher has had the most physics steps to accumulate additional `r.t` past `finishT`.**

---

## Root Cause Summary

| | On-track crown | Camera | Standings (open) |
|---|---|---|---|
| **Metric** | `max(r.t)` | `max(r.t)` | `max(r.x·cos + r.y·sin)` |
| **File** | racerRendering.js:81 | CameraDirector.js:892 | index.jsx:1010–1014 |
| **Correct?** | YES | YES | NO on curved tracks |

The standings list was changed (comment: "Fix 1") to use XY projection "so the HUD leader matches the visual." But the "visual" crown and camera both use `r.t`, not XY. The change made standings DIVERGE from both the crown and the camera, rather than matching them.

---

## Recommendation (do not implement yet)

**One-line fix in `index.jsx:1009–1015`:** Remove the `isOpenTrack` branch from the scoreboard sort. Use `b.t - a.t` for ALL tracks:

```js
[...st.racers]
  .sort((a, b) => b.t - a.t)
  .map((r, i) => ({ ...r, rank: i + 1 }))
```

**Why this is safe:**
- Display-only change — affects only what `setScoreboard(...)` sends to React state
- Does NOT affect physics, avoidance, braking, fairness sweep, race plan, rubber band, or any sim logic
- Removes the `openTrackFwdCos/Sin` usage from the scoreboard path (those constants are still used by the avoidance/position system elsewhere — they remain in the code)
- Brings standings in line with the crown, camera, minimap, and finish detection — all of which already use `r.t`
- Correctly orders finished racers by finish time (first finisher has highest raw `r.t` past the finish line)

The `openTrackFwdCos` / `openTrackFwdSin` values and the "Fix 1" comment can be cleaned up in the same change. The constants are also used elsewhere in the standings for the `FINISHED` phase sort (line 1030–1034) — that should also be changed to `a.finishRank - b.finishRank` (by finish rank among finished) + `b.t - a.t` (for still-racing) when the race ends.
