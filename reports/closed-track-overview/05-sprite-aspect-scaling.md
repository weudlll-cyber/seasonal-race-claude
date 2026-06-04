# Sprite Aspect-Ratio Scaling — Diagnosis

**Branch:** `feat/closed-track-overview-normalization`
**Date:** 2026-06-05
**Mode:** ANALYSIS ONLY — no code changed

---

## 1. Single scalar vs. per-axis scaling

**Scaling is a single scalar. Both axes use the same scale factor.**

`SpriteRacerType._drawBody` (`SpriteRacerType.js:207–213`):

```js
const scale = ((cfg.displaySize * displaySizeScale) / cfg.frameHeight) * cfg.silhouetteScale;
const dw = cfg.frameWidth  * scale;   // on-screen width
const dh = cfg.frameHeight * scale;   // on-screen height

ctx.save();
ctx.rotate(cfg.baseRotationOffset);
ctx.drawImage(drawable, sx, 0, cfg.frameWidth, cfg.frameHeight, -dw/2, -dh/2, dw, dh);
ctx.restore();
```

`scale` is computed once. Both `dw` and `dh` are derived from it identically. Width and height can never diverge — any change to `displaySizeScale` (or the camera zoom that drives it) moves both axes by the same factor.

`silhouetteScale` also applies to both axes identically. All 20 current racer types have `silhouetteScale = 1.0` (default from `SpriteRacerType.js:73`). The grep for non-1.0 values returns nothing.

---

## 2. Aspect ratio preservation

**Aspect ratio is fully preserved at all scales.**

The drawn aspect ratio is always `dw / dh = frameWidth / frameHeight`.

All 20 current racer types use **square frames** (`frameWidth = frameHeight`):

| frameSize | Types |
|-----------|-------|
| 128 × 128 | beetle, boarder, buggy, dragon, duck, elephant, f1, luge, manta, plane, snail, turtle |
| 129 × 129 | giraffe |
| 148 × 148 | snowmobile |
| 150 × 150 | horse, motorbike |
| 151 × 151 | rocket |
| 155 × 155 | snake |
| 256 × 256 | dolphin, koi |

Because `frameWidth = frameHeight` for every racer, `dw = dh` always. The on-screen bounding box is a square of side `displaySize × displaySizeScale` at `silhouetteScale = 1`. The body content within the square has aspect ratio `bodyFillX : bodyFillY`, and this ratio is preserved at all values of `displaySizeScale` because both axes scale by the same `scale` factor.

---

## 3. Body dimensions and the minimum-size concern

### What bodyFillX and bodyFillY measure

`bodyFillX × displaySize` = narrow body dimension on screen (at `displaySizeScale = 1`).
`bodyFillY × displaySize` = long body dimension on screen (at `displaySizeScale = 1`).

`bodyFillY` is the primary (larger) body dimension for every racer except buggy and duck, which are nearly square. Confirmed by the integration test (`racer-types.integration.test.js:201`):
```js
const computed = type.config.displaySize * type.config.bodyFillY;
// matched against sprite-crop audit values (within ±5%)
```

The π/2 baseRotationOffset rotates the frame 90° before drawing. For racers facing right (angle=0), the frame's Y axis becomes the along-track direction on screen, so `bodyFillY × dh` is the body's along-track extent and `bodyFillX × dh` is the cross-track extent. This is confirmed by sprite geometry: a rocket (bodyFillX=0.278, bodyFillY=0.801) is rendered as a long thin shape along its direction of travel.

### Candidate minimum: 12px on the narrow axis

If a minimum is defined as `min(bodyFillX, bodyFillY) × dh ≥ minNarrow`:
- `dh_min = minNarrow / min(bodyFillX, bodyFillY)`
- Long axis at `dh_min` = `max(bodyFillX, bodyFillY) × dh_min = minNarrow × (max/min)`

The critical quantity is the body aspect ratio `max/min`. Full table for all 20 racer types:

| Racer | ds | bodyFillX | bodyFillY | narrow px | long px | ratio (long/narrow) |
|-------|-----|-----------|-----------|-----------|---------|---------------------|
| rocket | 47 | 0.278 | 0.801 | 13.1 | 37.6 | **2.88** |
| giraffe | 48 | 0.271 | 0.767 | 13.0 | 36.8 | **2.83** |
| horse | 47 | 0.353 | 0.800 | 16.6 | 37.6 | 2.27 |
| dolphin | 52 | 0.402 | 0.887 | 20.9 | 46.1 | 2.21 |
| snake | 44 | 0.374 | 0.806 | 16.5 | 35.5 | 2.16 |
| luge | 80 | 0.313 | 0.641 | 25.0 | 51.3 | 2.05 |
| motorbike | 42 | 0.400 | 0.800 | 16.8 | 33.6 | 2.00 |
| boarder | 40 | 0.398 | 0.719 | 15.9 | 28.8 | 1.81 |
| elephant | 44 | 0.539 | 0.938 | 23.7 | 41.3 | 1.74 |
| snowmobile | 52 | 0.459 | 0.797 | 23.9 | 41.4 | 1.74 |
| f1 | 38 | 0.555 | 0.953 | 21.1 | 36.2 | 1.72 |
| beetle | 38 | 0.398 | 0.672 | 15.1 | 25.5 | 1.69 |
| koi | 52 | 0.578 | 0.914 | 30.1 | 47.5 | 1.58 |
| snail | 35 | 0.727 | 0.938 | 25.4 | 32.8 | 1.29 |
| manta | 56 | 0.633 | 0.805 | 35.4 | 45.1 | 1.27 |
| turtle | 48 | 0.578 | 0.734 | 27.7 | 35.2 | 1.27 |
| plane | 42 | 0.836 | 0.930 | 35.1 | 39.1 | 1.11 |
| dragon | 50 | 0.836 | 0.898 | 41.8 | 44.9 | 1.07 |
| buggy | 38 | 0.844 | 0.875 | 32.1 | 33.3 | 1.04 |
| duck | 36 | 0.875 | 0.875 | 31.5 | 31.5 | 1.00 |

"narrow px" and "long px" = on-screen body size in world pixels at `displaySizeScale = 1.0`.

### Long-axis result at minimum narrow = 12px (for the three spec examples and actual worst cases)

| Racer | long axis at narrow=12px | notes |
|-------|--------------------------|-------|
| rocket (worst case) | **34.6 px** | ratio 2.88:1 |
| giraffe (spec example, worst actual) | **33.9 px** | ratio 2.83:1 |
| horse | 27.2 px | |
| dolphin (spec example) | **26.5 px** | ratio 2.21:1 |
| koi (spec example) | 19.0 px | ratio 1.58:1 |

At a 12px narrow minimum, the absolute worst long axis in the current racer set is **34.6px** (rocket). This is not extreme — it is less than the current 36px render floor, smaller than the default `displaySize` of most racer types, and well below the width of any track corridor.

Note: the spec's three examples (koi 148×234, dolphin 103×227, giraffe 35×99) are the body sizes in **spritesheet pixels**, not in world pixels. The world-pixel body dimensions derive from `bodyFillX/Y × displaySize` (not `bodyFillX/Y × frameWidth`), which is what the table above shows.

---

## 4. Verdict

**The concern is NOT a real risk in this codebase.**

Scaling is a single scalar: both axes move identically at all times. The sprite's native aspect ratio is preserved exactly at every scale. The maximum body aspect ratio in the current racer set is 2.88:1 (rocket), giving a long axis of 34.6px when the narrow axis is at 12px — a perfectly reasonable size. No racer approaches the kind of extreme elongation (e.g., 8:1 or 10:1) that would make the long axis alarming.

### The minimal bound if the concern were ever to materialize

For future racer types with extreme aspect ratios, the implementation of a narrow-axis minimum implicitly bounds the long axis as well (since scaling is uniform). The "bound on the long axis" is:

```
long_max = minNarrow × (bodyFillY / bodyFillX)
```

If a future racer with a very extreme ratio (e.g., eel at 8:1) were added, a 12px narrow minimum would force the long axis to 96px. In that case, the minimal additional guard is:
- Define the minimum on the **frame size** (current mechanism) rather than the narrow body axis — the 36px frame floor already limits how far the camera can zoom out, which bounds the long axis indirectly.
- Or, add a `maxLongBodyPx` cap alongside the narrow minimum for extreme-ratio racers (per-type override on `maxTargetScreenPx`).

For the current 20 racer types, neither guard is needed.

---

## 5. Relationship to existing minimum-size mechanism

The current render floor (`computeRenderDisplayScale`, `autoSpriteScale.js:67`) is defined on the **frame's screen pixel size** (`displaySize × displaySizeScale × frameEffZoom`), not on the body's narrow axis. The MinSpriteSizePreview component (`MinSpriteSizePreview.jsx:63`) uses the same single-scalar formula:

```js
const scale = (sizePx / cfg.frameHeight) * (cfg.silhouetteScale ?? 1);
```

A minimum defined on the narrow body axis would require a per-type conversion:

```
minFramePx (for narrow-axis minimum) = minNarrowPx / min(bodyFillX, bodyFillY)
```

This could be implemented as a per-type `minTargetScreenPx` override (the field already exists in `getEffectiveMinTargetScreenPx`, `autoSpriteScale.js:96`) pre-computed from the racer's body fill values. No change to the draw path is needed — only the input to the existing floor mechanism changes.

No code changed. Branch pushed.
