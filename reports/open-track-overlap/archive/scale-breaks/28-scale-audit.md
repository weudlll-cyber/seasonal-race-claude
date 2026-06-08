# Report 28 — Scale Audit: Physics vs. Drawn Sizes

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-07
**Status:** Investigation only — no build. Three independent breaks found. All three must be fixed together before any sweep.

---

## Zoom and N clarifications (upfront)

**Zoom is irrelevant to this audit.** The canvas zoom scales both track and sprites by the same factor. Physics operates in normalized `physicalY` units (−1 to +1 = inner to outer edge). All ratios — body width to track width — are zoom-independent. No floor/ceiling zoom correction needed for this analysis.

**Sprite size depends on N.** `computeRacerLayout` and `computeBodyNarrowRef` both receive N and produce smaller bodies when N is large (more racers, less space per racer), and larger bodies when N is small. The physics must use the same N-based size the renderer uses, at the same N. The data below confirms the two paths currently return different values.

---

## How physicalY maps to screen position

`getPosition(t, offset)` places a racer at ([EditorShape.js:122–124](../../client/src/modules/track-editor/EditorShape.js#L122)):
```js
x: cx + offset * this._centerWidth * perpCos,
y: cy + offset * this._centerWidth * perpSin,
```
The caller passes `offset = r.physicalY / 2` ([index.jsx:711](../../client/src/screens/RaceScreen/index.jsx#L711)):
```js
const lateral = shape.getPosition(t, r.physicalY / 2);
```

So one unit of physicalY = `_centerWidth / 2` world pixels of lateral displacement.  
`_centerWidth` is set from `track.width` (the editor value, [EditorShape.js:26](../../client/src/modules/track-editor/EditorShape.js#L26)).

**Consequence:** for two racers separated by `Δy` in physicalY, their centre-to-centre pixel gap is:
```
gap_px = Δy × (track.width / 2)
```
For bodies of width `W` each to clear (edge-to-edge ≥ 0):
```
gap_px ≥ W  →  Δy ≥ W / (track.width / 2)  =  2W / track.width
```
This is the **correct sameLaneHH formula.** The factor of 2 comes from the `physicalY / 2` division in `getPosition`.

---

## Break 1 — Track width: physics uses wrong value

| Source | Value | File:line |
|--------|-------|-----------|
| `track.width` (editor, what `getPosition` uses) | **300 px** (Space Sprint) | EditorShape.js:26 |
| `getActualTrackWidth()` (what physics currently uses) | **449 px** | index.jsx:371 |
| Sim uses | **449 px** | sim-fairness.mjs:2145 |

`getActualTrackWidth()` samples 20 spline points and takes the median inner-to-outer distance. For curved open tracks the catmullRom spline can produce inflated distances at sampled points. Space Sprint's median is 449 px even though you set the track to 300 px.

All tracks measured (ratio = actual / stored):

| Track | Stored | Actual | Ratio | Open? |
|-------|--------|--------|-------|-------|
| space-sprint | 300 | 449 | **1.497** | OPEN |
| river-run | 300 | 390 | **1.300** | OPEN |
| mountainstreet | 300 | 368 | **1.227** | OPEN |
| seatrack | 300 | 395 | **1.317** | OPEN |
| searound | 131 | 145 | 1.107 | closed |
| dirt-oval | 93 | 98 | 1.054 | closed |
| city-circuit | 95 | 100 | 1.053 | closed |
| garden-path | 100 | 104 | 1.040 | closed |
| ice-track | 110 | 116 | 1.055 | closed |

Open tracks deviate the most (up to 50%). Closed tracks deviate slightly (4–11%).

**Fix:** use `geometry.width` (= `shape._centerWidth` = `track.width`) everywhere instead of `shape.getActualTrackWidth()`.

---

## Break 2 — Body size: two different computation paths

The game computes **two different body widths** for the same racer and uses each in a different place.

### Physics path — `honestBodyWidthPx`

Set at [index.jsx:498–604](../../client/src/screens/RaceScreen/index.jsx#L498):
```js
const physicalSpriteSize = displaySize * displaySizeScale_physical;   // line 498
// ...
honestBodyWidthPx: physicalSpriteSize * racerType.config.bodyFillX,  // line 604
```
Where `displaySizeScale_physical = racerLayout.spriteSize / displaySize`
and `racerLayout = computeRacerLayout(geometricTrackWidthPx * 0.95, N, displaySize, AUTO)` [line 434–440].

### Render path — `bodyNarrow` (what is actually drawn)

Set at [index.jsx:445–452](../../client/src/screens/RaceScreen/index.jsx#L445):
```js
const bodyRef = computeBodyNarrowRef(W_REF, N, displaySize, bodyFillNarrow, AUTO);
displaySizeScale = bodyRef.bodyNarrow / displaySize;   // line 452
```
Where `W_REF = Math.min(285, effectiveWidth)`.

The drawn body width in world pixels is `referenceSpriteSize = displaySize * displaySizeScale` = `bodyRef.bodyNarrow` [line 459]. This is confirmed by the comment in [SpriteRacerType.js:213–215](../../client/src/modules/racer-types/SpriteRacerType.js#L213):
> "visible narrow body equals displaySize × displaySizeScale in world pixels"

### The two paths use different inputs

- Physics: `computeRacerLayout(geometricTrackWidthPx * 0.95, ...)` — uses `geometricTrackWidthPx` = 449 px (wrong, see Break 1)
- Render: `computeBodyNarrowRef(min(285, geometricTrackWidthPx * 0.95), ...)` — caps at 285, so both use 285 when `geometricTrackWidthPx` ≥ 300, BUT `computeRacerLayout` and `computeBodyNarrowRef` are different functions that can return different row counts and different sizes even at the same input.

Dragon N=40 on Space Sprint (effectiveWidth=285 after break-1 fix):
- `computeRacerLayout(285, 40, 50, AUTO).spriteSize` = **40.71 px** → honestBodyWidthPx = 40.71 × 0.836 = **34.0 px**
- `computeBodyNarrowRef(285, 40, 50, 0.836, AUTO).bodyNarrow` = **28.5 px** (drawnBodyWidth)

These differ by a ratio of **34.0 / 28.5 = 1.19**. The physics thinks the body is 19% wider than it actually is drawn, which partly masks Break 3 (but not enough to fix it).

**Fix:** set `honestBodyWidthPx = referenceSpriteSize` (`= bodyRef.bodyNarrow`), which is already computed on [index.jsx:459](../../client/src/screens/RaceScreen/index.jsx#L459).

---

## Break 3 — sameLaneHH formula: wrong denominator

Current formula ([raceBehavior.js:591–595](../../client/src/modules/raceBehavior.js#L591)):
```js
const sameLaneHH =
  Math.max(
    trailer.honestBodyWidthPx ?? trailer.spriteWorldSizePx ?? 0,
    leader.honestBodyWidthPx  ?? leader.spriteWorldSizePx  ?? 0
  ) / trackWidth;
```

This divides by `trackWidth`. But as shown in the coordinate system section above, one physicalY unit = `trackWidth / 2` world pixels. So at `Δy = sameLaneHH`:
```
gap_px = sameLaneHH × trackWidth / 2 = honestBodyWidthPx / 2   ← ONE RADIUS, not one diameter
```

Two bodies of width W clear at `gap_px ≥ W` (one diameter). The current formula declares clearance at `gap_px = W/2` (one radius). **Bodies are already overlapping by half their width when the trigger fires.**

The correct formula is:
```js
const sameLaneHH = bodyWidth / (trackWidth / 2);   // = 2 × bodyWidth / trackWidth
```

This gives `gap_px = sameLaneHH × trackWidth / 2 = bodyWidth` — exact edge-to-edge clearance.

---

## Combined arithmetic: all three breaks at once

Dragon, N=40, Space Sprint. Using `bodyWidth = 28.5 px`, `centerWidth = 300 px`:

| State | sameLaneHH | gap at sameLaneHH | drawn body | overlap |
|-------|-----------|-------------------|-----------|---------|
| **Current (all broken)** | 0.0794 | 11.9 px | 28.5 px | **+16.6 px** |
| Fix 1 only (trackWidth→300) | 0.1135 | 17.0 px | 28.5 px | **+11.5 px** |
| Fix 1+2 only (trackWidth+bodySize) | 0.0950 | 14.3 px | 28.5 px | **+14.3 px** |
| **All three fixed** | **0.1900** | **28.5 px** | **28.5 px** | **0 px ✓** |

Fix 1 alone cuts overlap 31%. Fix 1+2 alone makes it worse (smaller body → smaller threshold). All three together reach zero overlap. **Each fix without the others is wrong or insufficient.**

---

## Per-N table: dragon on Space Sprint (correct values after all three fixes)

| N | physSprite (physics path) | drawnBody (render path) | sLHH\_current | sLHH\_correct | overlap\_current | overlap\_correct |
|---|---|---|---|---|---|---|
| 2 | 125.0 | 104.5 | 0.2327 | 0.6967 | **+69.6 px** | 0 |
| 6 | 95.0 | 95.0 | 0.2327 | 0.6333 | **+60.1 px** | 0 |
| 10 | 57.0 | 57.0 | 0.1588 | 0.3800 | **+33.2 px** | 0 |
| 20 | 42.7 | 28.5 | 0.0794 | 0.1900 | **+16.6 px** | 0 |
| 40 | 40.7 | 28.5 | 0.0794 | 0.1900 | **+16.6 px** | 0 |
| 70 | 40.7 | 31.7 | 0.0662 | 0.2111 | **+21.7 px** | 0 |

Overlap is always positive (bodies always overlap at the trigger) and N-dependent. The correct threshold (`sLHH_correct = drawnBody / (centerWidth/2)`) is always exactly 2× the formula using bodyNarrow as numerator — confirming the denominator is the dominant structural error once breaks 1 and 2 are fixed.

---

## Slim racers are NOT exempt

All racer types show overlap at N=40 (measured at the sameLaneHH threshold):

| Racer | drawn body | gap (current) | overlap | gap (fix 1 only) | overlap |
|-------|-----------|--------------|---------|-----------------|---------|
| dragon | 28.5 px | 11.9 px | **+16.6** | 17.0 px | **+11.5** |
| giraffe | 14.3 px | 3.9 px | **+10.4** | 5.5 px | **+8.7** |
| rocket | 14.3 px | 4.0 px | **+10.3** | 5.7 px | **+8.6** |
| horse | 14.3 px | 5.0 px | **+9.2** | 7.2 px | **+7.1** |
| luge | 28.5 px | 6.4 px | **+22.1** | 8.9 px | **+19.6** |
| duck | 28.5 px | 12.5 px | **+16.0** | 12.5 px | **+16.0** |

No racer, no track, no N value produces zero overlap with the current formula. The body is always wider than the gap at the trigger point.

---

## Overlap metric (honestOverlapRate) — is it correct?

Sim-fairness.mjs checks ([sim-fairness.mjs:967–969](../../scripts/sim-fairness.mjs#L967)):
```js
const dY_px = Math.abs(ra.physicalY - rb.physicalY) * geometricTrackWidth / 2;
if (dT_px < honestBodyLong && dY_px < honestBodyLat) {
```

Where:
- `geometricTrackWidth = shape.getActualTrackWidth()` = 449 px ← Break 1
- `honestBodyLat = effectiveDisplaySize * bodyFillX` = physSprite × bfX = 35.7 px ← Break 2

Current sim fires overlap when: `|Δy| × 449/2 < 35.7` → `|Δy| < 0.159`
True drawn overlap when: `|Δy| × 300/2 < 28.5` → `|Δy| < 0.190`

The metric misses all overlap in the range `|Δy| ∈ [0.159, 0.190]`. After both fixes, the metric condition becomes `|Δy| × 300/2 < 28.5` → `|Δy| < 0.190` — matching true drawn overlap exactly. ✓

---

## Complete change list (game + sim parity)

### Game (index.jsx)

| Line | Current | Fix |
|------|---------|-----|
| [371](../../client/src/screens/RaceScreen/index.jsx#L371) | `shapeRef.current.getActualTrackWidth()` | `geometry.width ?? shapeRef.current.getActualTrackWidth()` |
| [604](../../client/src/screens/RaceScreen/index.jsx#L604) | `physicalSpriteSize * racerType.config.bodyFillX` | `referenceSpriteSize` (= `bodyRef.bodyNarrow`, already computed at line 459) |

### Physics (raceBehavior.js)

| Line | Current | Fix |
|------|---------|-----|
| [595](../../client/src/modules/raceBehavior.js#L595) | `/ trackWidth` | `/ (trackWidth / 2)` |

Also on [raceBehavior.js:387–388](../../client/src/modules/raceBehavior.js#L387) (approach-scan HH): same formula, same fix needed.

Also on [raceBehavior.js:820](../../client/src/modules/raceBehavior.js#L820) (Stage D gap force `honestHalfSpan`): will be correct once honestBodyWidthPx is fixed to bodyNarrow — because `honestHalfSpan = honestBodyWidthPx / tw` and `honestBodyWidthPx = bodyNarrow`, so `honestHalfSpan = bodyNarrow / trackWidth`. Then `clearanceSpan = 2 × honestHalfSpan = 2 × bodyNarrow / trackWidth`. The Stage D formula computes `gapRatio = (clearanceSpan − absYDiff) / clearanceSpan` — this already uses the correct clearanceSpan in the numerator relative to the two-radius distance. **No change needed in Stage D** once the upstream honestBodyWidthPx is fixed.

### Sim (sim-fairness.mjs)

| Line | Current | Fix |
|------|---------|-----|
| [2145](../../scripts/sim-fairness.mjs#L2145) | `shape.getActualTrackWidth()` | `track.width ?? shape.getActualTrackWidth()` |
| [277](../../scripts/sim-fairness.mjs#L277) | `geometricTrackWidth * behaviorConfig.startSpreadRange` | ← automatically correct once line 2145 fixed |
| [499](../../scripts/sim-fairness.mjs#L499) | `effectiveDisplaySize * bodyFillX` | `computeBodyNarrowRef(Math.min(285, effectiveWidth), nRacers, displaySize, Math.min(bodyFillX, bodyFillY), DEFAULT_AUTO_SCALE_CONFIG).bodyNarrow` |
| [967](../../scripts/sim-fairness.mjs#L967) | `geometricTrackWidth / 2` | ← automatically correct once line 2145 fixed |
| [339](../../scripts/sim-fairness.mjs#L339) | `effectiveDisplaySize * bodyFillX` (honestBodyWidthPx on racer) | same fix as line 499 |

### raceBehavior.js: approach-scan (line 387–390)

```js
// Current:
const rAHH = (rA.honestBodyWidthPx ?? rA.spriteWorldSizePx ?? 0) / pairTW;
// After fix (honestBodyWidthPx now = bodyNarrow, but denominator still wrong):
const rAHH = (rA.honestBodyWidthPx ?? rA.spriteWorldSizePx ?? 0) / (pairTW / 2);
```

---

## Build order

1. Fix `index.jsx:371` (track width source) — one-liner, no logic change
2. Fix `index.jsx:604` (honestBodyWidthPx = referenceSpriteSize) — one-liner
3. Fix `raceBehavior.js:595` (÷ trackWidth → ÷ trackWidth/2)
4. Fix `raceBehavior.js:387–388` (same denominator fix in approach-scan)
5. Fix sim parity (3 lines in sim-fairness.mjs)
6. Run tests (2629) — no test should break since this is a behaviour change, not an API change
7. Run N=50 full 66-combo sweep
8. Browser check: does overlap now look clean at all racer types and N values?
