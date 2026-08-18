# ZOOM-PIVOT-START-1 — the correction that existed now runs at the start

**Branch:** `fix/zoom-pivot-start-1`, off master `fe766a26`. **NOT MERGED, NOT MINTED** — this changes
the picture and the owner judges it first.

**Served on 4173. Build pill: `<SHA>`, no `+dirty`.** Look at **dirt-oval** first — the difference is
largest there.

**His requirement, recorded and NOT acted on:** he wants the camera to **stand still at the start and
begin moving when the leader reaches his intended place in frame.** This block does not build that
and does not substitute for it. It removes a drift that has been mistaken for camera movement four
times. **Whether his requirement is still needed afterwards is his judgement on the served build,
and this report does not recommend either way.**

## THE CHANGE — ONE CONDITION REMOVED

```diff
-const _anchor =
-  this._focusAnchorRacer(racers) ??
-  (this._runInActive ? this._framingProbe?.anchorPoint : null) ??
-  null;
+const _anchor = this._focusAnchorRacer(racers) ?? this._framingProbe?.anchorPoint ?? null;
```

`CameraDirector.js:1079`. **No key, no fraction, no second rule.** The pivot is the same expression
the run-in already used — `_framingProbe.anchorPoint`, the pan target this frame's framing was
actually built on, recorded by `_setTargets` a few lines above.

**The pivots I considered and rejected, so the choice is checkable:**

| candidate                     | why not                                                                                     |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| **`_framingProbe.anchorPoint`** | **chosen** — already the run-in's pivot, so one home and no new concept                       |
| the frame centre               | a different promise ("do not move the picture") from this correction's ("do not let the subject slide"), and it fights the pan lerp — which is trying to move the centre. Measured, the two converge once the drift is gone, because the gap between them **is** the drift |
| `_framingProbe.afterLateral`   | carries the forward bias, which is large in the LEADER states where this correction already works. Using it would change behaviour that is not this block's to change |
| a new key or fraction          | forbidden, and unnecessary                                                                     |

**What it reaches beyond the start, named rather than discovered:** every group shot whose zoom is
moving — **OVERVIEW, BATTLE_ZOOM and PHOTO_FINISH** — because `_focusAnchorRacer` returns null for all
three. **Inside the run-in the expression reduces to exactly what it was**, so the run-in is unchanged
**by construction**, and a test asserts that reduction directly rather than trusting a measurement.

## ACCEPTANCE — ALL TEN TRACKS, seed 9, 20 racers, gun to 8000 ms

`maxAhead` and `maxZoomNet` are measured **inside the start window** (while the ceremony's framing is
held); `leaderOut` and `minOn` span the whole 8 s.

| track | kind | maxAhead before → after | maxZoomNet before → after | leaderOut | minOn | travel 1 s |
| ----- | ---- | ----------------------- | ------------------------- | --------- | ----- | ---------- |
| city-circuit | closed | −32.9 → **−5.7** | 14.1 → **0.3** | **46 → 0** | **4 → 17**/20 | 56.0 → 76.6 |
| dirt-oval | closed | **142.1 → −4.1** | 13.7 → **0.3** | **89 → 0** | 18 → 18/20 | 132.8 → 74.7 |
| garden-path | closed | 20.8 → **−2.1** | 13.2 → **0.3** | 0 → 0 | 20 → 20/20 | 16.9 → 22.2 |
| ice-track | closed | 47.3 → **−5.0** | 7.4 → **0.2** | 0 → 0 | 17 → 17/20 | 74.7 → 83.2 |
| searound | closed | 19.0 → **−5.1** | 4.9 → **0.1** | **61 → 20** | 8 → 8/20 | 111.9 → 87.0 |
| luger-hill | open | 40.7 → 40.7 | 0.0 → 0.0 | 0 → 0 | 11 → 11/20 | 56.1 → 56.1 |
| mountainstreet | open | 12.0 → 11.9 | 0.7 → 0.0 | 0 → 0 | 18 → 18/20 | 68.5 → 67.2 |
| river-run | open | 177.1 → 177.1 | 0.0 → 0.0 | 0 → 0 | 17 → 17/20 | 30.4 → 30.4 |
| seatrack | open | −5.4 → −5.4 | 0.0 → 0.0 | 0 → 0 | 8 → 8/20 | 94.5 → 94.5 |
| space-sprint | open | −4.4 → −4.4 | 0.0 → 0.0 | 0 → 0 | 5 → 5/20 | 105.8 → 105.8 |

**The five OPEN tracks are byte-identical on every column**, because their zoom does not move inside
the start window — `maxZoomNet` is 0.0 on both arms — so the correction has nothing to cancel there.
**Everything this block changes is on the five CLOSED tracks.**

### 1 · the zoom no longer moves the frame centre on its own — **MET**

`maxZoomNet` (the zoom's pivot plus the correction that cancels it) goes **14.1 → 0.3**, **13.7 →
0.3**, **13.2 → 0.3**, **7.4 → 0.2**, **4.9 → 0.1** on the five closed tracks. Per frame on dirt-oval,
the raw pivot still reaches **79.0 world px** and the correction cancels it to **−0.9**:

```
   ms   dCamX  zoomPivot  corrTerm  zoomNet  panTerm     zoom  corr?
    0     0.4       13.8     -13.8     -0.0      0.4   8.3830     on
  100     2.9       79.0     -79.8     -0.9      3.8   7.9627     on
  300     5.0       52.8     -54.2     -1.4      6.3   7.3613     on
  500     7.4       11.4     -11.8     -0.4      7.9   7.1480     on
 1000    11.0        2.4      -2.5     -0.1     11.1   7.2024     on
```

**And the pan term is not merely unchanged — it is now the whole of the motion**, a clean monotone
0.4 → 11.1 world px per frame where before it was a large negative correction fighting the drift.

### 2 · the camera no longer passes its own target — **MET where the drift was the cause, MISSED on three open tracks where it is not**

**On all five closed tracks `maxAhead` is now negative** — the camera is behind its target on every
frame of the start window and never ahead. **The owner's case, dirt-oval 142.1 px ahead, is
−4.1: never ahead at all.**

**Three open tracks still read positive and are UNCHANGED by this block:** river-run **177.1**,
luger-hill **40.7**, mountainstreet **11.9**. Their `maxZoomNet` is **0.0 on both arms**, so the zoom
pivot is not what puts them ahead. The cause is visible in `gun-window-truth`: river-run's world-edge
**`clamp` spends 184.8 world px** at the gun, decaying to 62.0 at 1 s and 0.0 by 2.75 s — the clamp
holds the camera off the target it was given. **That is a different term, it is not this block's to
repair, and it is identical before and after.**

### 3 · the August defect stays repaired — **MET, byte-identical**

`gun-window-truth`, river-run, n=40, seed 5601, **both arms give the same digits**: ALONG travel in
the first second **6.4 world px** (against the 37.4 `c3f294d1` repaired), field centre y **0.486**,
zoom flat at **1.1650**. Identical because river-run's zoom does not move in that window.

### 4 · no track is worse — **MET, and three are much better**

**leaderOut: city-circuit 46 → 0, dirt-oval 89 → 0, searound 61 → 20.** No track gains a single
out-frame. **minOn: city-circuit 4/20 → 17/20**; every other track unchanged. `travel 1 s` falls on
dirt-oval (132.8 → 74.7) and searound (111.9 → 87.0) and rises on city-circuit, garden-path and
ice-track — the camera is now following its target rather than being thrown past it, so it travels
what the target travels.

## THE RUN-IN IS UNCHANGED — PROVEN, NOT ASSUMED

- **By construction:** with `_runInActive` true, `_focusAnchorRacer(racers) ?? probe.anchorPoint` and
  `_focusAnchorRacer(racers) ?? (_runInActive ? probe.anchorPoint : null)` are the same expression. A
  test asserts the recorded pivot equals the old expression's value in that state.
- **By the committed guard:** `check-runin-frame` runs inside `npm run verify` and is **green**.
- **`runInShot` OFF:** the run-in does not compose at all, so it has no behaviour to preserve. What
  changes there is every OTHER group-shot frame whose zoom moves — **which is the defect being
  repaired**, and it is exactly what the original note said would happen and why it scoped itself.

**The tracking lag, re-measured in full:** every frame count identical (this is framing, not state
selection), **BATTLE_ZOOM p95 9.97 → 9.56** and **PHOTO_FINISH p95 35.66 → 25.03**, with LEADER_ZOOM,
LEAD_CHANGE and COMEBACK_ZOOM identical to the digit — the check that the correction did not re-point
itself where it already worked.

## TESTS

**Five director tests** (`client/src/modules/camera/zoomPivot.test.js`) on a real `CameraDirector`
with a real shape on a **diagonal** heading, driving the real `update()`. The field is held **still**
on purpose: with a static field the anchor is a static world point, so any movement of its screen
position is the pivot and nothing else. Each carries what breaks if it is deleted.

**Sabotage-proven.** Restoring the `_runInActive` scope turns **three** red, the load-bearing one by
**5.6×**: the anchor's screen drift goes **12.2 px → 68.7 px**. The threshold is set at **30** —
between two measured values rather than chosen, so it discriminates by 2.5× on one side and 2.3× on
the other.

**Two fixture bugs are left written down in the file**, because both cost time and both look like the
mechanism failing: `targetOffsetX` is derived FROM the zoom, so snapping both in one pass lands the
offset on the previous zoom's target; and `ts` must stay under OVERVIEW's 5000 ms hold gate or a
transition fires, `_camT` becomes non-null, and the offset takes a branch that never reaches the
correction at all.

## FINGERPRINTS — MEASURED FRESH, NOTHING MINTED

Closures established by walking each instrument's declared `reach` through `closureOf`:

| instrument | closure | changed files inside | value | verdict |
| ---------- | ------- | -------------------- | ----- | ------- |
| WORLD | 36 | **NONE** | `dc4647be0f55ebdb` | **unmoved** |
| WORLD-OFF | 36 | **NONE** | `854018ee5d3d83e1` | **unmoved** |
| CAMERA | 36 | `CameraDirector.js` | **`ce3475ecaf0926fe`** | **moved** from `d9f45a4aea0e5778` |
| RENDER | 53 | `CameraDirector.js` | **`64e413d28c0072f0`** | **moved** from `1274c7e8444238e3` |

**WORLD and WORLD-OFF were measured anyway**, even though the closure walk says no changed file is
inside them — a closure statement is an argument and a hash is a measurement.

`npm run verify`: **PASS 13, FAIL 0.** Client suite: **4129 tests green.**

## WHAT HE SHOULD EXPECT TO SEE IN THE FIRST TWO SECONDS

**dirt-oval, where the difference is largest.** Today the picture slides forward out of the grid the
instant the gun fires and the leader runs off the right edge between about 2.4 s and 3.9 s. **With
this branch the picture does not slide.** The shot opens — the field guarantee still widens it as the
grid strings out — but it opens **around the field** instead of pulling away from it, and the leader
stays in frame the whole time.

**city-circuit second**, where 4 of 20 racers were on screen at the worst frame and it is now 17.
**river-run for the control**: it should look exactly as it does today, and that is measured, not
hoped.

**What he will still see, and it is not a defect this block claims to fix:** the camera does move
during the start, because its target — the field's centroid — moves. **His requirement is about
that, and it is untouched here.**

## PROPOSALS

1. **The three open tracks that are still ahead of their target are the world-edge clamp**, and
   nothing has ever measured what that clamp costs the picture at a start near the world's edge.
   river-run spends 184.8 world px on it at the gun. That is a separate question with its own answer.
