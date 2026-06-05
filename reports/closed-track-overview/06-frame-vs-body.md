# Frame vs. Body — Sprite Sizing Reconciliation

**Branch:** `feat/closed-track-overview-normalization`
**Date:** 2026-06-05
**Mode:** ANALYSIS ONLY — no code changed

---

## 1. What gets sized: FRAME or visible BODY?

**The FRAME gets sized. The visible body is a passenger inside the frame.**

`SpriteRacerType._drawBody`, lines 207–213:

```js
const scale = ((cfg.displaySize * displaySizeScale) / cfg.frameHeight) * cfg.silhouetteScale;
const dw = cfg.frameWidth  * scale;
const dh = cfg.frameHeight * scale;

ctx.save();
ctx.rotate(cfg.baseRotationOffset);
ctx.drawImage(drawable, sx, 0, cfg.frameWidth, cfg.frameHeight, -dw/2, -dh/2, dw, dh);
ctx.restore();
```

Substituting line by line:

```
dh = cfg.frameHeight × scale
   = cfg.frameHeight × (displaySize × displaySizeScale / cfg.frameHeight) × silhouetteScale
   = displaySize × displaySizeScale × silhouetteScale
```

`dh` equals `displaySize × displaySizeScale` (silhouetteScale = 1.0 for all current racers).

The `drawImage` source rectangle is `(sx, 0, frameWidth, frameHeight)` — the **entire frame**, transparent margins included. The destination rectangle is `(-dw/2, -dh/2, dw, dh)` — sized to `displaySize × displaySizeScale` in each axis (for square frames). The body pixels are drawn at whatever fraction of that frame they happen to occupy. `bodyFillX` and `bodyFillY` are **not referenced anywhere in the draw path**. They do not enter the scale computation.

`referenceSpriteSize = displaySize × displaySizeScale` (`RaceScreen/index.jsx:429`) is therefore the **frame size** in world pixels, not the body size. The render floor in `computeRenderDisplayScale` (`autoSpriteScale.js:67`) applies a minimum to `displaySize × displaySizeScale × frameEffZoom` — again the frame, not the body.

---

## 2. Are all 20 frames truly square?

**Yes. Every current racer type has `frameWidth = frameHeight`.**

| frameSize | Racers |
|-----------|--------|
| 128 × 128 | beetle, boarder, buggy, dragon, duck, elephant, f1, luge, manta, plane, snail, turtle |
| 129 × 129 | giraffe |
| 148 × 148 | snowmobile |
| 150 × 150 | horse, motorbike |
| 151 × 151 | rocket |
| 155 × 155 | snake |
| 256 × 256 | dolphin, koi |

All 20 `frameWidth` values equal their `frameHeight`. Consequently `dw = dh = displaySize × displaySizeScale` for every racer, and the drawn bounding box is always a square.

---

## 3. What Report 05's "2.88:1" measured — and where it conflated

Report 05 made two correct observations:
- Sizing is a single scalar → the drawn bounding box is always a square (frame-level, correct).
- The body within the square has aspect ratio `bodyFillX : bodyFillY` (body-level, also correct).

Then it computed a "minimum narrow axis" of 12px and a corresponding "long axis" of 34.6px for the rocket. The arithmetic is right, but Report 05 conflated the two levels by writing as if those body-level numbers had implications for the sizing system.

**What 2.88:1 actually is:** the ratio `bodyFillY / bodyFillX = 0.801 / 0.278` for the rocket. This is a property of how the visible body pixels are distributed *within* the (always-square) frame. The sizing system is completely unaware of it.

**What the report's "long axis at minimum narrow = 12px" actually computes:** it answers "if you want the narrow body dimension to be 12px, what frame size `dh` do you need, and then what is the long body dimension inside that frame?" The arithmetic is:

```
dh_needed = 12 / bodyFillX                 (frame size that gives 12px narrow body)
long body  = bodyFillY × dh_needed         (long body at that frame size)
           = 12 × bodyFillY / bodyFillX
           = 12 × 2.88 = 34.6px            (rocket)
```

This is a body-based calculation wrapped around a frame-based sizing system. Report 05 did not clearly label the distinction: the 2.88:1 ratio and the 34.6px long axis are properties of the **visible body within the frame**, not of the sizing mechanism. The sizing mechanism only ever sees the frame size (`displaySize × displaySizeScale`). The statement "the concern is not real" is correct for body proportions, but Report 05 gave no explicit sentence stating that the existing minimums (render floor, OVERVIEW target) are frame minimums and the planned narrow-axis minimum would be a body minimum — a qualitatively different level.

---

## 4. Giraffe vs. duck visible-body comparison at the same frame size

Fixed frame size on screen: `referenceSpriteSize = 48 px` (equivalently: `displaySize × displaySizeScale = 48`, `frameEffZoom = 1`).

For **giraffe** (displaySize = 48, bodyFillX = 0.271, bodyFillY = 0.767):
- `displaySizeScale = 48 / 48 = 1.0`
- Frame on screen: `dh = dw = 48 px`
- The π/2 rotation maps source-X to the screen's vertical direction (cross-track) and source-Y to horizontal (along-track).
- **Visible cross-track body** = bodyFillX × dh = 0.271 × 48 = **13.0 px**
- **Visible along-track body** = bodyFillY × dh = 0.767 × 48 = **36.8 px**

For **duck** (displaySize = 36, bodyFillX = 0.875, bodyFillY = 0.875):
- `displaySizeScale = 48 / 36 = 1.333`
- Frame on screen: `dh = dw = 36 × 1.333 = 48 px` (same frame size)
- **Visible cross-track body** = bodyFillX × dh = 0.875 × 48 = **42.0 px**
- **Visible along-track body** = bodyFillY × dh = 0.875 × 48 = **42.0 px**

At identical `referenceSpriteSize = 48 px`, the duck's visible cross-track body (**42.0 px**) is **3.23× wider** than the giraffe's (**13.0 px**). The frames are the same 48 × 48 px square. Only the body content inside the square differs.

---

## 5. Verdict

**Sizing is frame-based.** The value that flows from `referenceSpriteSize` through the camera, through `computeRenderDisplayScale`, and into the `drawImage` call is the **frame size** (`displaySize × displaySizeScale`). The render floors (36 px non-OVERVIEW floor, 18 px OVERVIEW target) are floors on the **frame**, not on the visible body. At the same frame size, racers with large `bodyFillX` (duck: 0.875) appear as wide as the entire frame cross-track, while racers with small `bodyFillX` (giraffe: 0.271) appear as a thin sliver — a 3.23× visible-width difference despite identical frame sizes.

### Corollary: what this means for a planned narrow-body minimum

The existing render floor raises the frame size when it would otherwise be too small. A minimum defined on the **narrow body axis** is a different kind of floor: it would need to be divided by `min(bodyFillX, bodyFillY)` to obtain the equivalent required frame size, then applied as a per-type `minTargetScreenPx` override:

```
minFramePx = minBodyNarrowPx / min(bodyFillX, bodyFillY)
```

For a giraffe with `bodyFillX = 0.271`, a 12 px narrow-body minimum requires a frame size of `12 / 0.271 = 44.3 px`. For a duck with `bodyFillX = 0.875`, it requires only `12 / 0.875 = 13.7 px`. The two racers would get **different per-type frame-size floors** even though the visible-body minimum is the same. This is the correct implementation of a body-based minimum in a frame-based sizing system.

No code changed. Branch pushed.
