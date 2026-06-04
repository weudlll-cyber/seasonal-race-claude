# Racer-Count → Sprite-Size Scaling — Diagnosis

**Branch:** `feat/closed-track-overview-normalization`
**Date:** 2026-06-05
**Mode:** ANALYSIS ONLY — no code changed

---

## 1. The formula — literal, with file:line

### Entry point

`RaceScreen/index.jsx:406–429` (inside the race-start `useEffect`):

```js
const displaySize = racerType.config.displaySize;                         // racer-type constant (px)
const effectiveWidth = geometricTrackWidthPx * behaviorConfig.startSpreadRange;  // track width × 0.95

const racerLayout = computeRacerLayout(effectiveWidth, nRacers, displaySize, autoScaleConfig);
displaySizeScale = racerLayout.spriteSize / displaySize;

const referenceSpriteSize = displaySize * displaySizeScale;  // = racerLayout.spriteSize
```

`geometricTrackWidthPx` = `shape.getActualTrackWidth()` — the median inner-to-outer corridor width in world pixels, stored on the track JSON as `track.width` (set by the Track Editor). Called `W` below.

`autoScaleConfig` = `{ minScale: 0.65, maxScale: 2.5, referenceValue: 23 }` (from `DEFAULT_AUTO_SCALE_CONFIG`; `referenceValue` is not used by `computeRacerLayout`).

### Core algorithm: `computeRacerLayout` (`rowLayout.js:137–169`)

```js
// Inputs: W = effectiveWidth, N = nRacers, ds = displaySize
// Config: minScale = 0.65, maxScale = 2.5

minSpriteSize = ds × minScale                      // smallest sprite that may appear (world px)
maxSpriteSize = ds × maxScale                      // largest sprite that may appear (world px)

// Step 1: How many racers fit side-by-side at minimum sprite size?
maxRPRatMin = floor(2W / minSpriteSize)            // max racers per row at floor size

// Step 2: Minimum rows needed to hold all N racers
rowCount = ceil(N / maxRPRatMin)

// Step 3: Even distribution → widest row
racersPerRow = ceil(N / rowCount)

// Step 4: Back-compute sprite size from widest row, cap at maxScale
spriteSize = min(2W / racersPerRow, maxSpriteSize)
```

**Output:** `spriteSize` (world pixels) = `referenceSpriteSize` passed to `CameraDirector`.

### Derived quantity: `displaySizeScale`

`displaySizeScale = spriteSize / ds`. Not an input to the formula; a derived output.

### Inputs summary

| Input | Source | Track-specific? | Racer-specific? |
|-------|--------|----------------|----------------|
| `W` = `geometricTrackWidthPx × 0.95` | Track JSON `width` field | **YES** | No |
| `N` = `nRacers` | Race setup | No | No |
| `ds` = `displaySize` | Racer-type config | No | **YES** |
| `minScale = 0.65` | `DEFAULT_AUTO_SCALE_CONFIG` | No | No |
| `maxScale = 2.5` | `DEFAULT_AUTO_SCALE_CONFIG` | No | No |

---

## 2. Table 1 — Size vs. racer count at fixed track (Space Sprint)

Space Sprint: `worldW=6000`, `racer=rocket`, `ds=47`, `trackW=300`, `startSpreadRange=0.95`
`effectiveWidth W = 285`. `minSpriteSize = 30.55`. `maxRPRatMin = floor(570/30.55) = 18`.

| N | rows | racers/row | spriteSize | dss | Notes |
|---|------|------------|-----------|-----|-------|
| 1–4 | 1 | 1–4 | **117.5 px** | 2.50 | maxScale cap (`ds×2.5`); formula would give 142–570px |
| 5 | 1 | 5 | 114.0 px | 2.43 | |
| 6 | 1 | 6 | 95.0 px | 2.02 | |
| 8 | 1 | 8 | 71.3 px | 1.52 | |
| 10 | 1 | 10 | 57.0 px | 1.21 | |
| 12 | 1 | 12 | 47.5 px | 1.01 | |
| 15 | 1 | 15 | 38.0 px | 0.81 | |
| 18 | 1 | 18 | 31.7 px | 0.67 | nearing minScale floor |
| **19** | **2** | **10** | **57.0 px** | 1.21 | **STAIRCASE JUMP ↑** — new row triggers, racers spread out |
| 20 | 2 | 10 | 57.0 px | 1.21 | |
| 25 | 2 | 13 | 43.8 px | 0.93 | |
| 30 | 2 | 15 | 38.0 px | 0.81 | |
| 36 | 2 | 18 | 31.7 px | 0.67 | |
| **37** | **3** | **13** | **43.8 px** | 0.93 | **STAIRCASE JUMP ↑** |
| 40 | 3 | 14 | 40.7 px | 0.87 | |
| 54 | 3 | 18 | 31.7 px | 0.67 | |
| **55** | **4** | **14** | **40.7 px** | 0.87 | **STAIRCASE JUMP ↑** |
| 60 | 4 | 15 | 38.0 px | 0.81 | |
| 80 | 5 | 16 | 35.6 px | 0.76 | |

**Curve shape:** Inverse-like within each row-band (`size ∝ 1/racersPerRow = 1/ceil(N/rows)`), punctuated by upward jumps each time a new row is added. The size decreases monotonically within a row-band, then jumps up at the row boundary because each remaining racer gets more horizontal space.

**Asymptote:** As N→∞, `rowCount→∞` but `racersPerRow` stabilizes near `maxRPRatMin = 18`, so `spriteSize→2W/18 = 570/18 = 31.7px = minSpriteSize`. Size never drops below `minSpriteSize`.

---

## 3. Table 2 — Size vs. track at fixed count (N=20)

`N = 20`, each track uses its own default racer type and corridor width.

| Track | Type | ds | trackW | effW | maxRPRatMin | rows | RPR | spriteSize | refSprite |
|-------|------|-----|--------|------|------------|------|-----|-----------|----------|
| Dirt Oval | horse | 47 | 93 | 88 | 6 | 4 | 5 | 35.3 px | 35.3 |
| Garden Path | snail | 35 | 100 | 95 | 8 | 3 | 7 | 27.1 px | 27.1 |
| City Circuit | buggy | 38 | 95 | 90 | 7 | 3 | 7 | 25.8 px | 25.8 |
| Ice Track | motorbike | 42 | 110 | 105 | 8 | 3 | 7 | 29.9 px | 29.9 |
| Searound | manta | 56 | 131 | 124 | 5 | 4 | 5 | 49.8 px | 49.8 |
| River Run | duck | 36 | 300 | 285 | 24 | 1 | 20 | 28.5 px | 28.5 |
| Space Sprint | rocket | 47 | 300 | 285 | 18 | 2 | 10 | 57.0 px | 57.0 |
| Mountainstreet | boarder | 40 | 300 | 285 | 21 | 1 | 20 | 28.5 px | 28.5 |
| Seatrack | dolphin | 52 | 300 | 285 | 16 | 2 | 10 | 57.0 px | 57.0 |

Size range at N=20: **25.8 px (City Circuit) to 57.0 px (Space Sprint / Seatrack)** — a **2.2× spread** purely from track width and racer-type differences with the same racer count.

### Decomposing the variation

The same exercise with **all tracks set to trackW=300** (neutralizing the track-width dependency):

| Track | ds | spriteSize (real W) | spriteSize (W=300) | change |
|-------|----|--------------------|--------------------|--------|
| Dirt Oval | 47 | 35.3 | 57.0 | +62% |
| Garden Path | 35 | 27.1 | 28.5 | +5% |
| City Circuit | 38 | 25.8 | 28.5 | +10% |
| Ice Track | 42 | 29.9 | 28.5 | −5% |
| Searound | 56 | 49.8 | 57.0 | +14% |
| River Run | 36 | 28.5 | 28.5 | 0% |
| Space Sprint | 47 | 57.0 | 57.0 | 0% |
| Mountainstreet | 40 | 28.5 | 28.5 | 0% |
| Seatrack | 52 | 57.0 | 57.0 | 0% |

After neutralizing W, the **remaining spread** (28.5–57.0px, 2×) comes from `ds` variation. The open tracks all have `trackW=300` already, so they're unchanged. The closed tracks change significantly when track width is equalized.

Conclusion: **both W and ds contribute to the per-track size variation at fixed N**.

---

## 4. Separability — are the two effects entangled?

**They are entangled: one formula, three inputs (W, N, ds), no clean factoring.**

### How the entanglement works

The formula has one key intermediate: `maxRPRatMin = floor(2W / (ds × minScale))`.

This is NOT a "track term" or a "racer term" in isolation — it is `2W/(ds×0.65)`, where **both** W and ds appear together. `maxRPRatMin` sets the staircase breakpoints (which N values trigger a new row). Its value determines `rowCount` and therefore `racersPerRow`, which in turn determines `spriteSize`.

The output `spriteSize = 2W / racersPerRow` depends on W (numerator) and `racersPerRow` (denominator, which depends on N and on the staircase breakpoints set by both W and ds). There is no factoring of the form `f(N) × g(W) × h(ds)`.

### What the user wants to keep vs. remove

| Effect | Term driving it | Formula location | Keep or remove |
|--------|----------------|-----------------|----------------|
| Racer count → sprite size | `N` in `racersPerRow = ceil(N/rowCount)` | `rowLayout.js:156` | **KEEP** |
| Track width → sprite size | `W` in `spriteSize = 2W/racersPerRow` and in `maxRPRatMin` | `rowLayout.js:152,159` | **REMOVE from camera input** |
| Racer type → base size | `ds` in `minSpriteSize = ds×0.65` and `maxSpriteSize = ds×2.5` | `rowLayout.js:148-149` | **KEEP or SEPARATE QUESTION** |

### The specific term to remove from the camera

`referenceSpriteSize` = `spriteSize` from `computeRacerLayout` = `2W/racersPerRow`. It mixes W into the camera-normalization input.

To decouple track width from the camera: pass a different `referenceSpriteSize` to `CameraDirector` — one that uses a fixed reference width `W_ref` rather than the actual `W`. The actual `spriteSize` for rendering/packing would be unchanged; only the camera's normalization reference would change.

A track-width-independent `referenceSpriteSize` could be computed as:
```
refSpriteForCamera = computeRacerLayout(W_ref, N, ds, config).spriteSize
```
where `W_ref` is a fixed reference (e.g., `300px` — the width of the existing wide open tracks). This preserves the N→size curve shape while making the curve track-independent.

**Note:** Even with W_ref fixed, ds variation would remain (Space Sprint ds=47 gives 57px; River Run ds=36 gives 28.5px at N=20 with W_ref=300). Whether this ds-induced variation is desirable ("racer type should affect size") or not is a separate design decision.

---

## 5. Floors, caps, and additional shapers

### a) maxScale cap (`ds × 2.5`) — `rowLayout.js:160`

`spriteSize = min(2W/racersPerRow, ds × maxScale)`

Activates at low N, capping excessively large sprites. For Space Sprint (ds=47): cap = 117.5px. Kicks in at N ≤ 4 (formula gives 142–570px). The curve is flat at 117.5px from N=1 through N=4.

### b) minScale asymptote (`ds × 0.65`) — `rowLayout.js:148`

`minSpriteSize` is not a hard output floor but a packing input. The algebra guarantees `spriteSize ≥ 2W/maxRPRatMin ≈ minSpriteSize`, so the output approaches but never goes below `ds × 0.65`. For Space Sprint: floor ≈ 30.55px; the curve asymptotes there as N→∞.

### c) 36 px render floor — `RaceScreen/index.jsx:1268–1272`

```js
const isOverviewOpen = isOpenTrack && camDirRef.current?.state === 'OVERVIEW';
const minFloorPx = isOverviewOpen
    ? overviewTargetScreenPx           // 18px
    : OVERVIEW.spriteScale × 36;      // 36px
```

In all camera states except open-track OVERVIEW: `actualScreenPx = max(propPx, 36)`. This is a second floor above the `computeRacerLayout` output. When `spriteSize × effZoom < 36px`, sprites are rendered at 36px regardless. This floor is independent of the N-driven sprite size — it activates only when the camera zooms out enough that small sprites would become invisible.

### d) Camera floor at cam.zoom=1.0 (closed tracks in OVERVIEW)

For closed-track OVERVIEW: `snapZoom ≥ 1.0` is enforced to prevent black bars (`effZoom ≥ bsX = CANVAS_W/worldW`). This pins the camera to the full-world view even when the normalization formula would call for a lower zoom. Consequence: sprite screen sizes on closed tracks in OVERVIEW are determined by `spriteSize × bsX` rather than by `overviewTargetScreenPx` when the formula would give `snapZoom < 1.0`.

### e) minRacersVisible ratchet (L117) — `CameraDirector.js:1815–1847`

Only active in LEADER_ZOOM and LEAD_CHANGE. When fewer than `minRacersVisible` (default 8) racers are on-screen, the camera zooms out (cam.zoom decreases) per `zoomOutStepPerFrame = 0.005/frame`. This changes `frameEffZoom`, which feeds back into `computeRenderDisplayScale` and thus the actual rendered sprite size. Fewer visible racers → camera zooms out → each racer's `propPx = spriteSize × effZoom` decreases → potentially hits the 36px render floor.

This ratchet affects rendered sprite size but does NOT change `referenceSpriteSize` — it acts purely on the camera zoom after the fact.

---

## Summary

**The racer-count curve** is a staircase of `spriteSize = 2W/ceil(N/rowCount)`, where `rowCount = ceil(N/maxRPRatMin)` and `maxRPRatMin = floor(2W/(ds×0.65))`. Within each row-band the size decreases as `~1/N`. At each row-boundary the size jumps upward. The cap at `ds×2.5` flattens the curve at low N. The asymptote at `ds×0.65` is a soft floor at high N.

**Both effects — racer count and track width — are entangled in the same formula** with no clean factoring. The track-size dependency enters through `W` in both `maxRPRatMin` (setting staircase breakpoints) and `spriteSize = 2W/racersPerRow` (the output). The racer-type dependency enters through `ds`.

**The exact term to remove from the camera input** is `W` — by passing `computeRacerLayout(W_ref, N, ds, config).spriteSize` as `referenceSpriteSize` to `CameraDirector`, using a fixed reference width instead of the actual track width. The actual draw-sprite and packing logic would continue to use the real W; only the camera normalization reference would be decoupled.
