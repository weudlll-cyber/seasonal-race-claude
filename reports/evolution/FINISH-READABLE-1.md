# FINISH-READABLE-1 — the finish line was drawn and painted nothing

**Branch:** `feat/finish-readable`, off master `e1f53781`. **Not merged.**

---

## 1. What is true — and it corrects my earlier Stage-A finding

I previously reported that the closed-track band is "drawn unconditionally". That was true and
useless. **It is drawn and it paints nothing.**

Driven through the real `renderRaceFrame` drawing code with the recording context, the closed-track
finish issues its eight `fill()` calls exactly as expected — and every path encloses **zero area**:

| track          | quads | mean area painted | area the shape implies | verdict            |
| -------------- | ----- | ----------------- | ---------------------- | ------------------ |
| city-circuit   | 8     | **0.001** px²     | 345 px²                | **paints nothing** |
| dirt-oval      | 8     | **0.001** px²     | 312 px²                | **paints nothing** |
| garden-path    | 8     | **0.001** px²     | 347 px²                | **paints nothing** |
| ice-track      | 8     | **0.000** px²     | 369 px²                | **paints nothing** |
| searound       | 8     | **0.001** px²     | 229 px²                | **paints nothing** |
| luger-hill     | 8     | 218.750 px²       | 219 px²                | paints             |
| mountainstreet | 8     | 262.500 px²       | 263 px²                | paints             |
| river-run      | 8     | 262.501 px²       | 263 px²                | paints             |
| seatrack       | 8     | 262.501 px²       | 263 px²                | paints             |
| space-sprint   | 8     | 262.500 px²       | 263 px²                | paints             |

**So the answer to the question is: NOT DRAWN — on all five CLOSED tracks, and on none of the five
open ones.** It is not a colour, a width, a blend or a z-order problem.

**The evidence, from the frame's own draw stream** (ice-track, one quad):

```
fillStyle=#fff
beginPath
moveTo 874.0414 462.9974      ← along the finish line…
lineTo 873.7811 410.2481      ← …52.75 px
lineTo 873.8156 417.248       ← the "depth" step: 7 px, in the SAME direction
lineTo 874.076  469.9973
closePath
fill                           ← encloses 0.0022 px²
```

**THE CAUSE, in one line.** The stripe depth was taken along `angle + PI/2`, which is the direction
the finish line **already runs** — the line is `getPosition(0, +w)` minus `getPosition(0, −w)`, the
across-track perpendicular. Extruding a segment along itself gives a parallelogram with two parallel
edges and no area. `drawOpenTrackFinishLine` extrudes along `localAngle`, the FORWARD direction,
which is why the open tracks were never affected.

**Why the screenshot shows the label and no band:** the gold `FINISH` label is drawn separately, a
few lines below, and was never broken. On a closed track start and finish coincide, so the owner was
looking straight at the one place the defect shows.

**A second error rode along with it.** The line was built from `getPosition(0, ±1.0)`, and that
offset scales by `_centerWidth`, which **is** the track width — so the band spanned **twice** the
corridor, overhanging it by half a width on each side. The corridor edges are `±0.5`.

## 2. What it draws now

**His ruling: structure at the EDGES only, nothing reaching across the racing surface.** So the
finish is a GATE — two checkered posts, one at each corridor edge, running along the FORWARD
direction, with the racing surface clear between them and a gold hairline marking where the line
actually is.

**One function for both topologies.** `drawFinishGate` is now called by the closed and the open path
alike. There were two implementations of one marking and they had already drifted far enough for one
of them to be painting nothing for an unknown length of time; a repair that reached only half the
game is the failure this removes.

**It survives zooming out, which is the other half of his complaint.** Every dimension is a SCREEN
size converted back into world units through the effective zoom, so the gate is the same size on
screen at every shot — the same reason `drawTrackLights` already takes the zoom.

|                | checker at the WIDEST overview | checker at the TIGHTEST shot |
| -------------- | ------------------------------ | ---------------------------- |
| all ten tracks | **9.0 px**                     | **9.0 px**                   |

The label is drawn through the same inverse scale at a constant 13 px, against the **3.9 px** it
measured at the widest overview before — which is what "he says it is not there" was.

**One bound that is not a taste number:** a post is never wider than a quarter of the corridor. On a
narrow track (searound, 131 px) a screen-derived width would otherwise reach across, and reaching
across is the one thing the ruling forbids.

## 3. Measured

|                              |                                                           |
| ---------------------------- | --------------------------------------------------------- |
| quads painted, every track   | **6**, mean area 81 px² at unit zoom — i.e. 9×9 screen px |
| tracks showing a band before | 5 of 10 (the open ones)                                   |
| tracks showing a band now    | **10 of 10**                                              |
| client suite                 | 4018 passed                                               |

## 4. Fingerprints — measured fresh, NOT minted

| role   | stored (master)    | this branch                      |
| ------ | ------------------ | -------------------------------- |
| world  | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` — **unmoved** |
| camera | `64432e18a7e62188` | `64432e18a7e62188` — **unmoved** |
| render | `096f2726c45ed853` | `d24d78450f197495`               |

`engine-reach --check` on the real diff: **none of the paths can reach the race engine**, and the
camera fingerprint is unmoved — this is the drawing layer only, which is what it should be.

## 5. Source hygiene

- **Removed**: the duplicate finish marking. `drawOpenTrackFinishLine` is now a five-line adapter
  that computes its own perpendicular and calls the shared gate.
- **Fixed**: the extrusion direction, and the `±1.0` corridor offset.
- **Added**: `drawFinishGate`, and the effective zoom at the call site.
- **Noticed and left**: `drawEditorTrackSurface` is still named for a surface it has not drawn since
  the boundary lines and lane fill were removed; renaming it touches the render fingerprint's own
  file list for no behavioural gain, so it is written down instead.

## 6. For his eye

**Ice-track, shortly after the start — the finish should now read as a checkered gate at the two
track edges with the racing surface clear between them, and it should stay the same size on screen
when the camera pulls out.**
