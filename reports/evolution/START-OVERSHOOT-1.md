# START-OVERSHOOT-1 — the term is the zoom's PIVOT, and the line that cancels it is skipped

**Branch:** `docs/start-overshoot-1`, off master `e752aa52`. **INVESTIGATION ONLY.** No fix, no camera
change. The only non-report edit is two flags on the committed diag
`scripts/diag/start-frame-capture.mjs` (`--decompose`, and a countdown hook so the frame before the
gun is visible).

**For the record, not rewritten:** what he wants is that the camera **stands still at the start and
only begins to move when the leader reaches his intended place in frame.** Nothing here substitutes a
different goal, and nothing here is a repair.

## THE TERM

**The camera zooms about the WORLD ORIGIN.** The world point at frame centre is
`camX = (frameW/2 − offsetX) / effZoom`, so **any** change in `effZoom` moves it by
`camX × (Δzoom / zoom)` **even when the offset does not change at all**. The offset lerp is a
first-order follower **on the offset**; in world space it is not a follower at all while the zoom is
moving. That is how the camera passes a target it is only ever approaching.

**The line that exists to cancel exactly this, and does not fire:**

```js
// client/src/modules/camera/CameraDirector.js:1079-1087
const _anchor =
  this._focusAnchorRacer(racers) ??
  (this._runInActive ? this._framingProbe?.anchorPoint : null) ??
  null;
const _dz = this.zoom - _zoomAtStart;
if (_anchor && _dz !== 0) {
  this.offsetX -= _anchor.x * this._proj.axisX * _dz;   // ← CAMERA-SIDEJUMP-1's root fix
  this.offsetY -= _anchor.y * this._proj.axisY * _dz;
}
this.offsetX += (this.targetOffsetX - this.offsetX) * lf;   // :1088 — the follower
```

**`_focusAnchorRacer` returns `null` for OVERVIEW** (`CameraDirector.js:1755`) and `_runInActive` is
false at the start, so `_anchor` is null and **the correction is skipped on every frame of the start
window** — the `corr?` column reads `SKIP` throughout.

**The source predicted this in as many words** (`CameraDirector.js:1062-1080`): the null is _"harmless
while their zoom is steady, and fatal while it is moving … the pan target then travels at `worldPos ×
axisScale × dZoom` per frame while the pan lerp closes only a fraction of it"_ — quantified there at
535 → 1115 px on luger-hill seed 9, every racer off screen for 51 frames — and it says the general
repair was **scoped to the run-in deliberately**, because fixing it generally moves both fingerprints
with `runInShot` off. **The start window is the case that note left open.**

**Why this is not "the zoom", already ruled out.** The displacement is not proportional to the zoom
change alone. It is the zoom change **times the frame centre's distance from the world origin**. The
frame centre sits ~1496 world px from the origin here, so a **15%** widening is **~225 world px** of
forward motion. Small ratio, large picture.

## THE FRAME TABLE — dirt-oval, seed 9, 20 racers, race plan ON

`zoomTerm` is where the centre moves from the zoom change alone with the offset held; `panTerm` is
the follower's contribution. Their sum is the observed step **by construction** — the table
establishes which is LARGE, not that the sum is right.

```
   ms    camX    tgtX  cam-tgt     dCamX  zoomTerm  panTerm     zoom       dz  anchor  corr? binding
  cer    1496       —        —         —         —        —   8.4602        —       —      — (last ceremony frame)
    0    1509    1498       11      13.8      13.8      0.1   8.3830  -0.0772    null   SKIP field
  100    1584    1512       71      74.2      79.7     -5.4   7.9627  -0.4203    null   SKIP field
  200    1641    1527      114      57.6      71.2    -13.7   7.6200  -0.3428    null   SKIP field
  300    1680    1541      138      38.6      57.7    -19.1   7.3613  -0.2586    null   SKIP field
  400    1696    1558      138      16.0      37.2    -21.2   7.2017  -0.1596    null   SKIP field
  500    1689    1572      117      -6.8      12.7    -19.5   7.1480  -0.0536    null   SKIP field
  600    1672    1586       86     -17.1      -1.7    -15.4   7.1552   0.0071    null   SKIP field
  800    1642    1616       27     -12.6      -6.5     -6.1   7.2101   0.0284    null   SKIP field
 1000    1641    1642       -1       2.1       2.5     -0.4   7.2024  -0.0109    null   SKIP field
 1200    1647    1671      -25       2.1      -0.7      2.8   7.1957   0.0031    null   SKIP field
 1400    1652    1698      -46       3.2      -3.2      6.4   7.2224   0.0142    null   SKIP field
```

**`panTerm` is negative on every frame from 17 ms to 1100 ms.** The follower never overshoots — it
pulls back the whole time, exactly as a first-order follower must. **`zoomTerm` is 10–39× larger and
points forward.**

## THE SWITCH-ON FRAME: THE FIRST RACING FRAME, ms 0

| | camX | zoom | dCamX | zoomTerm | panTerm |
| --- | --- | --- | --- | --- | --- |
| last ceremony frame | **1496** | 8.4602 | — | — | — |
| **ms 0** | **1509** | 8.3830 | **+13.8** | **+13.8** | **+0.1** |

At the last ceremony frame the camera is **on** its target. One frame later it is 11 px past it, and
**the whole step is the zoom term.**

**What changed between those two frames: which method owns the offset.**

- `updateCountdown` **writes the offset absolutely** from the zoom, every frame —
  `this.offsetX = -camX * effZoomX` (`CameraDirector.js:3729`). A zoom change there cannot displace
  the centre, because the centre is recomputed from it.
- `update()` **lerps** the offset (`:1088`) and cancels the zoom's pivot only when
  `_focusAnchorRacer` is non-null (`:1079-1087`) — which, in OVERVIEW, it is not.

**The term switches on the instant `update()` takes over from `updateCountdown()`.** There is no
other transition at that frame: `binding` is `field` before and after, the anchor is the field
centroid throughout, and no state changes.

## WHAT BRINGS IT BACK BY 1200 ms

**The zoom stops widening.** `dz` runs −0.42 per frame at 100 ms → −0.05 at 500 ms → **positive** from
600 ms as the shot re-tightens. `zoomTerm` follows it: +79.7 → +12.7 → −1.7 → −6.5. Meanwhile
`panTerm` has been pulling back the whole time and is now working on a large gap. They cross at
**1000 ms** (`cam-tgt = −1`), and from 1100 ms the camera is behind its target — an ordinary
follower again.

## WHAT WAS RULED OUT, EACH WITH ITS NUMBER

| candidate                                   | verdict                                                                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| momentum carried from the ceremony's push-in | `updateCountdown` writes the offset absolutely (`:3729`) and stores no velocity; the camera is ON its target at the last ceremony frame, and **`panTerm` at ms 0 is +0.1** |
| a rate limiter's accumulated speed           | there is none. **Every write to `offsetX/Y` in the file is one of eight lines** (`:253,255,1017,1033,1041,1049,1085,1088,3729,3732`); not one accumulates a velocity |
| **`Δv: r0-r1` from the overlay**             | it is `r0._diagSpeed − r1._diagSpeed` (`RaceScreen/index.jsx:1272`) — the speed difference between the two leading **RACERS**, EMA-smoothed for the HUD. **The camera never reads it.** |
| a predictive / look-ahead term               | `leadAhead` is 0 for OVERVIEW by construction (`:1625`), and `_computePhasedPanTarget` returns early unless `_observerPhase === 'follow'` (`:3426`) — the observer is `idle` for the whole window |
| the world-edge clamp                         | `gun-window-truth`'s `clamp` column is **0.0 on every frame** of the dirt-oval window                                 |
| a second-order smoothing filter              | `_smoothFocal` is applied only for LEADER_ZOOM / COMEBACK_ZOOM (`:3134`), never OVERVIEW                              |
| the time constant, the hold, the anchor change | unchanged and not it: `binding` is `field` on every frame, and the anchor is the field centroid at residual 0.0 (START-CONTRADICTION-1) |

## FINGERPRINTS

**Nothing that can move a fingerprint changed.** The only non-report edit is
`scripts/diag/start-frame-capture.mjs`, and the closure walk puts it inside **none** of the four
instruments (WORLD/WORLD-OFF 36, CAMERA 36, RENDER 53). **Nothing minted.** The build on 4173 was not
touched.

## PROPOSALS

**None.** The brief asked for the name of the term and the line it lives on, and forbade a mechanism
for the picture. Both are above. **What a repair would have to reckon with is already written in the
source at `:1074-1080`** — the general case was left open because closing it moves both fingerprints
with `runInShot` off — and that is the owner's decision, not this block's.
