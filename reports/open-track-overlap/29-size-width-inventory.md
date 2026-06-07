# Report 29 — Size & Width Inventory

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-07
**Status:** Analysis only. No code changes. All three breaks get fixed as a consequence of converging to one source of truth — not as three separate patches.

---

## 0. The physicalY ↔ world-pixel mapping (pin this once)

`getPosition(t, offset)` in [EditorShape.js:122–124](../../client/src/modules/track-editor/EditorShape.js#L122) (centerPoint path):
```js
x: cx + offset * this._centerWidth * perpCos,
y: cy + offset * this._centerWidth * perpSin,
```

The caller always passes `offset = physicalY / 2` ([index.jsx:711](../../client/src/screens/RaceScreen/index.jsx#L711)):
```js
shape.getPosition(t, r.physicalY / 2)
```

Therefore:
```
lateral displacement (world px) = (physicalY / 2) × _centerWidth
1 physicalY unit = _centerWidth / 2  world pixels
```

For two racers with `Δy = |physicalY_A − physicalY_B|`, their centre gap in world px is:
```
gap_px = Δy × (_centerWidth / 2)
```

For no visual overlap (edge-to-edge ≥ 0) with drawn body width `W`:
```
Δy × (_centerWidth / 2) ≥ W
→  Δy ≥ W / (_centerWidth / 2) = 2W / _centerWidth
```

**This formula — dividing by `_centerWidth/2`, NOT by `_centerWidth` — is the single correct conversion. It must appear in exactly ONE place in physics and sim, not be re-derived ad hoc per feature.**

### Position-dependent width (non-uniform tracks)

`getPosition` has a second path for tracks WITHOUT centerPoints ([EditorShape.js:129–172](../../client/src/modules/track-editor/EditorShape.js#L129)). It interpolates directly between `inner(t)` and `outer(t)`:
```js
const frac = clamped + 0.5;   // 0 = inner, 1 = outer
x = innerX + (outerX − innerX) × frac;
```

In this path, 1 physicalY unit = `|outer(t) − inner(t)| / 2` world pixels — **position-dependent and not constant**. No `_centerWidth` is set or used. The physics must therefore query the width at the racer's current `t`, not use a global constant.

All current shipped tracks use centerPoints, so path 1 applies. The design must not assume uniformity.

**Zoom note:** zoom scales both _centerWidth and sprites by the same factor. Ratios (body/track) are zoom-independent. The physicalY mapping above holds at any zoom.

---

## 1. Full variable inventory

### A. Track width variables

| Variable | File:line | Current meaning | Readers | Status |
|---|---|---|---|---|
| `track.width` | EditorShape.js:25–26 | Designer-set uniform half-width of track (world px). Stored in JSON. Set as `_centerWidth`. | EditorShape constructor | **CORRECT SOURCE** — the one true width for centerPoint tracks |
| `_centerWidth` | EditorShape.js:26, 123 | = `track.width`. Private. Used by `getPosition` to compute lateral displacement. | `getPosition` only | **NEEDED** — private; correct; do not expose further |
| `getActualTrackWidth()` | EditorShape.js:247; index.jsx:371, 694 | Samples 20 spline points, returns median inner-to-outer distance. For curved open tracks this is inflated (449 vs 300). | index.jsx (sets geometricTrackWidthPx); also used by openTrackHW | **WRONG for physics** — inflated measurement, not what `getPosition` uses. Correct use: per-position `|outer(t)−inner(t)|` for non-uniform tracks only |
| `geometricTrackWidthPx` | index.jsx:371 (set), :605 (on racer), :420 (effectiveWidth) | = `getActualTrackWidth()` — set once at race start, put on all racer objects. Passed to physics. | physics (`getTrackWidthPx`), computeRacerLayout, effectiveWidth, open-track sim | **WRONG** — reads inflated measurement. Must be replaced by `track.width` for uniform tracks and by per-position width for non-uniform tracks |
| `getTrackWidthPx(racer)` | raceBehavior.js:160–165 | Getter: returns `racer.trackWidthPx ?? racer.geometricTrackWidthPx`. | All physics width reads (pairTrackWidth, sameLaneHH, etc.) | **NEEDED** as getter pattern, but currently returns the wrong value |
| `racer.trackWidthPx` | raceBehavior.js:161 JSDoc | Optional override field on racer. NEVER SET by index.jsx (only geometricTrackWidthPx is set). | Gets through to geometricTrackWidthPx always | **DEAD** — never assigned. Remove the fallback and use a single field |
| `pairTrackWidth` | raceBehavior.js:415 | `max(getTrackWidthPx(rA), getTrackWidthPx(rB))` — per-pair max of both racers' widths. | `lateralScale`, `lateralHalfSpan` computation | **NEEDED** — but correct only when source is fixed |
| `openTrackHW` | index.jsx:694 | = `getActualTrackWidth() / 2`. Used only to draw the finish line. | `drawOpenTrackFinishLine` | **WRONG SOURCE** (should be `track.width / 2`). **NOT physics** — render-only |
| `effectiveWidth` | index.jsx:420 | = `geometricTrackWidthPx × startSpreadRange`. Input to computeRacerLayout for row slot sizing. | computeRacerLayout, W_REF | **NEEDED** but inherits wrong source |
| `W_REF` | index.jsx:444 | = `min(285, effectiveWidth)`. Caps reference width at 285 so sprites look comparable across all open tracks. | computeBodyNarrowRef | **NEEDED** as render-sizing concept, but name is local; its intent is "reference open-track width" |
| `REFERENCE_TRACK_WIDTH = 98` | raceBehavior.js:22 | Dirt Oval width. Baseline for `lateralScale = 98 / pairTrackWidth`. Calibrated when physics was tuned. | `lateralScale` computation | **NEEDED** — force calibration constant; do not change |
| `sim geometricTrackWidth` | sim-fairness.mjs:2145 | = `shape.getActualTrackWidth()`. All sim track width math derives from this. | sim physics, overlap metric, effectiveWidth | **WRONG** — same inflated measurement as game |

### B. Racer size variables

| Variable | File:line | Current meaning | Readers | Status |
|---|---|---|---|---|
| `displaySize` | racerType config | Base sprite frame size in world px before any scaling. Per racer type. | computeRacerLayout, computeBodyNarrowRef, physicalSpriteSize | **NEEDED** — immutable input |
| `bodyFillX`, `bodyFillY` | racerType config | Fraction of sprite frame occupied by body pixels (narrow and long axes). | bodyFillNarrow, honestBodyWidthPx, honestBodyLong/Lat | **NEEDED** — immutable input |
| `bodyFillNarrow` | index.jsx:419; SpriteRacerType.js:211 | = `min(bodyFillX, bodyFillY)` — the narrow-axis body fraction. Computed locally wherever needed (no single definition). | computeBodyNarrowRef, _drawBody scale | **NEEDED** — but computed in two places; could be defined once on racer type config |
| `displaySizeScale_physical` | index.jsx:423, 440 | = `computeRacerLayout(effectiveWidth, N, ...).spriteSize / displaySize`. Scale factor for row layout (spacing, gap). | `physicalSpriteSize` only | **KEEP but rename/scope** — needed only for rowGapPx and row position math; NEVER for overlap |
| `physicalSpriteSize` | index.jsx:498–499, 603–604 | = `displaySize × displaySizeScale_physical`. Placed on racer as `spriteWorldSizePx` AND used for `honestBodyWidthPx`. | spriteWorldSizePx (T-thresholds), honestBodyWidthPx (wrong), rowGapPx | **SPLIT**: keep for row layout only; MUST NOT feed honestBodyWidthPx |
| `displaySizeScale` | index.jsx:426, 452 | = `computeBodyNarrowRef(W_REF, N, ...).bodyNarrow / displaySize`. Render-path body scale. | `referenceSpriteSize`, `frameDisplayScale` (camera/draw) | **NEEDED** — but should become the SOLE source of body size for physics too |
| `referenceSpriteSize` | index.jsx:459, 492 | = `displaySize × displaySizeScale` = `bodyNarrow`. Used by CameraDirector to set overview zoom so sprites fill the target screen percentage. | CameraDirector only | **CORRECT** — already equals bodyNarrow; the camera is right |
| `bodyNarrow` | rowLayout.js:242 | Return value of `computeBodyNarrowRef`. = `(2 × W_REF) / racersPerRow` capped at `displaySize × bodyFillNarrow × maxScale`. The DRAWN body width (narrow axis) in world px. | `displaySizeScale`, `referenceSpriteSize` | **THE ONE TRUE BODY SIZE** — drawn body narrow axis; zoom-independent; N-dependent |
| `spriteWorldSizePx` | index.jsx:603; raceBehavior.js:152–158 | = `physicalSpriteSize` (set at line 603). Used for T-direction physics: `tHalfSpan`, `dynamicBrakeT`, `dynamicBrakeMatchT`. | `getSpriteWorldSizePx()` → speedBrake, brakeMatch T-thresholds, free-lane T-span | **KEEP** — needed for longitudinal physics, but can simplify to bodyNarrow/bodyFillNarrow × bodyFillY once body size is unified |
| `visibleWidthPx` | raceBehavior.js:153 | Priority in `getSpriteWorldSizePx()`. NEVER set on racer objects in index.jsx. Dead field. | `getSpriteWorldSizePx()` only (reads but always falls through) | **DEAD — DELETE** |
| `honestBodyWidthPx` | index.jsx:604; raceBehavior.js:387, 593, 820 | = `physicalSpriteSize × bodyFillX`. Placed on racer objects. Used for `sameLaneHH`, Stage D gap force, approach scan. | sameLaneHH, pairHH (approach scan), honestHalfSpan (Stage D) | **WRONG SOURCE** — must become `bodyNarrow` (= `referenceSpriteSize`) |
| `effectiveDisplaySize` | sim-fairness.mjs:277 | = `computeRacerLayout(effectiveWidth, N, ...).spriteSize`. Sim's physicalSpriteSize equivalent. | `spriteWorldSizePx` and `honestBodyWidthPx` on sim racers, `honestBodyLat/Long` | **WRONG** for honestBodyLat/Long; replace with bodyNarrow equivalent for those |
| `honestBodyLat` | sim-fairness.mjs:499 | = `effectiveDisplaySize × bodyFillX`. Used by overlap metric `dY_px < honestBodyLat`. | overlap metric | **WRONG** — must be `bodyNarrow` (the drawn body size) |
| `honestBodyLong` | sim-fairness.mjs:498 | = `effectiveDisplaySize × bodyFillY`. Used by overlap metric `dT_px < honestBodyLong`. | overlap metric | **WRONG** — must be `bodyNarrow / bodyFillNarrow × bodyFillY` (drawn long axis) |

### C. Span/threshold variables (physics)

| Variable | File:line | Current meaning | Status |
|---|---|---|---|
| `sameLaneHH` | raceBehavior.js:591–595 | = `honestBodyWidthPx / trackWidth`. Stage B trigger: fires when `|yDiff| < sameLaneHH`. | **WRONG** on two counts: wrong body size (honestBodyWidthPx) and wrong denominator (trackWidth instead of trackWidth/2). Becomes correct when both sources are fixed. |
| `rAHH, rBHH, pairHH` | raceBehavior.js:387–390 | Same formula as sameLaneHH, used in approach-scan (Stage C gate). | **WRONG** — same two errors as sameLaneHH. Same fix. |
| `honestHalfSpan` | raceBehavior.js:820 | = `honestBodyWidthPx / trackWidth`. Stage D gap force: `clearanceSpan = 2 × honestHalfSpan`. | **WRONG** source but compensated: 2× in clearanceSpan makes the net clearance correct IF denominator is also fixed. After fixes it becomes correct. |
| `lateralHalfSpan` | raceBehavior.js:515 | = `spriteWorldSizePx / trackWidth`. Free-lane overlap check (Y-axis). | **APPROXIMATE** — uses full sprite size, not body. Separate from clearance math; not part of this fix. |
| `tHalfSpan` | raceBehavior.js:516, 226 | = `spriteWorldSizePx / pathLength`. Longitudinal overlap check and T-thresholds. | **KEEP** — longitudinal physics; not part of lateral clearance fix. |
| `lateralScale` | raceBehavior.js:416–419 | = `clamp(REFERENCE_TRACK_WIDTH / pairTrackWidth, 0.1, 3.0)`. Scales avoidance force inversely with track width so it's consistent across widths. | **NEEDED** — remains correct once pairTrackWidth source is fixed. |

---

## 2. The two deliberately separate computation paths

The rowLayout module exposes two functions with a **documented intentional split**:

```
computeRacerLayout(effectiveWidth, N, ds, config)
  → spriteSize = 2×effectiveWidth/rpr    (uses REAL track width)
  → Used for: row gaps, start positions, row counts (PHYSICAL layout)

computeBodyNarrowRef(W_REF, N, ds, bfNarrow, config)
  → bodyNarrow = 2×W_REF/rpr            (uses FIXED reference width = min(285, effectiveWidth))
  → Used for: camera zoom, render scale  (VISUAL consistency across tracks)
```

[rowLayout.js:220–221](../../client/src/modules/rowLayout.js#L220):
> "Used only for referenceSpriteSize (camera) and displaySizeScale (render). Physical layout uses computeRacerLayout with real track width — untouched."

The split was designed so that sprites look the same relative size on screen regardless of whether you race on a narrow 93px track or a wide 300px track. This is intentional and correct for the camera.

**The break:** both functions also feed `honestBodyWidthPx`, but only `bodyNarrow` is correct for clearance physics. The physicalSpriteSize from `computeRacerLayout` was erroneously also used for overlap math. `bodyNarrow` is the single truth for body size.

**The fix collapses to:** make `honestBodyWidthPx = bodyNarrow` (already computed as `referenceSpriteSize`), and fix the formula denominator. The intentional split between the two layout functions is preserved — `computeRacerLayout` continues to serve physical layout, `computeBodyNarrowRef` becomes the sole source of the body size used in physics.

---

## 3. Proposed minimal source-of-truth set

| Concept | Single source of truth | Derived from | Current variables to collapse into it |
|---|---|---|---|
| **Track width at position t** | `track.width` for uniform (centerPoint) tracks; `|outer(t)−inner(t)|` per-position for non-uniform | EditorShape `_centerWidth` or per-t query | `geometricTrackWidthPx` (fix source), `getActualTrackWidth()` (wrong, retire from physics), `openTrackHW` (fix source for rendering), `racer.trackWidthPx` (dead, delete) |
| **Drawn body width (lateral)** | `bodyNarrow` = `computeBodyNarrowRef(W_REF, N, ds, bfNarrow, AUTO).bodyNarrow` | = `referenceSpriteSize` = `displaySize × displaySizeScale` | `honestBodyWidthPx` (fix source), `honestBodyLat` in sim (fix source), `physicalSpriteSize × bodyFillX` (retire from clearance math) |
| **Drawn body length (longitudinal)** | `bodyNarrow / bodyFillNarrow × bodyFillY` | derived from bodyNarrow | `honestBodyLong` in sim (fix), `spriteWorldSizePx` (can keep for now as approximate) |
| **physicalY ↔ world-px conversion** | `Δy × trackWidth/2` = `Δy × _centerWidth/2` (uniform tracks) | EditorShape `_centerWidth` = `track.width` | Embedded in sameLaneHH formula as the `/2` in the denominator |
| **Row layout size** | `physicalSpriteSize` = `computeRacerLayout(effectiveWidth, N, ds, AUTO).spriteSize` | real track effectiveWidth | Keep for rowGapPx and row positions ONLY — must not feed honestBodyWidthPx |

---

## 4. Variables to DELETE

| Variable | Where | Why |
|---|---|---|
| `racer.trackWidthPx` | raceBehavior.js:161 JSDoc, never set by index.jsx | Dead field. Falls through to geometricTrackWidthPx always. Getter has two branches; remove the dead one. |
| `visibleWidthPx` | raceBehavior.js:153–154 | Dead field. Priority in `getSpriteWorldSizePx()` but never set on racer objects. Remove getter branch. |
| `displaySizeScale_physical` | index.jsx:423, 440 | Exists only to produce `physicalSpriteSize`. After fix, `physicalSpriteSize` is only needed locally for rowGapPx (one-liner). Can be inlined, eliminating the named variable. |
| `physicalSpriteSize × bodyFillX` as source of `honestBodyWidthPx` | index.jsx:604 | Wrong derivation. `honestBodyWidthPx` stays on racer objects but is sourced from `referenceSpriteSize` (= `bodyNarrow`). |

---

## 5. Position-dependent width architecture note

For tracks WITHOUT centerPoints, `_centerWidth` is never set. `getPosition` interpolates directly between inner/outer — the effective track width at position t is `|outer(t) − inner(t)|` and is NOT constant.

For physics to be correct on such tracks, `getTrackWidthPx(racer)` must return the width at the racer's current `t`, not a global constant. This requires:
- A new `EditorShape` method: `getWidthAtT(t)` that returns `|outer(t) − inner(t)|`
- `geometricTrackWidthPx` on the racer object becomes a per-frame updated value, NOT a constant set at race start

For all current shipped tracks (all use centerPoints), `track.width` is constant and this is not an issue. The fix for uniform tracks (read `track.width`) is self-contained. The per-position extension can be added when a non-uniform track is created.

---

## 6. Sequenced cleanup plan (game + sim)

All three breaks are fixed as consequences of adopting the single sources of truth. **No code until this plan is reviewed.**

### Step 1 — Fix track width source (Break 1)

**Game:** [index.jsx:371](../../client/src/screens/RaceScreen/index.jsx#L371)
- Change `const geometricTrackWidthPx = shapeRef.current.getActualTrackWidth()`
- To: `const geometricTrackWidthPx = geometry.width ?? shapeRef.current.getActualTrackWidth()`
  - `geometry.width` = `track.width` = `_centerWidth` (the designer's value)
  - Fallback to `getActualTrackWidth()` only for tracks that genuinely have no `width` stored (forward-compat)

**Game:** [index.jsx:694](../../client/src/screens/RaceScreen/index.jsx#L694) (openTrackHW)
- Change `shapeRef.current.getActualTrackWidth() / 2`
- To: `geometricTrackWidthPx / 2` (reuse the now-correct value)

**Sim:** [sim-fairness.mjs:2145](../../scripts/sim-fairness.mjs#L2145)
- Change `shape.getActualTrackWidth()`
- To: `track.width ?? shape.getActualTrackWidth()`

Verifiable: sim output line `width=449px` for Space Sprint becomes `width=300px`.

### Step 2 — Fix body size source (Break 2)

**Game:** [index.jsx:604](../../client/src/screens/RaceScreen/index.jsx#L604)
- Change `honestBodyWidthPx: physicalSpriteSize * racerType.config.bodyFillX`
- To: `honestBodyWidthPx: referenceSpriteSize`
  - `referenceSpriteSize` = `bodyNarrow` is already computed on [index.jsx:459](../../client/src/screens/RaceScreen/index.jsx#L459). Zero new computation needed.

**Sim:** [sim-fairness.mjs:339](../../scripts/sim-fairness.mjs#L339)
- Change `honestBodyWidthPx: effectiveDisplaySize * bodyFillX`
- To: `honestBodyWidthPx: bodyNarrow` (add `computeBodyNarrowRef` call using same inputs as game)

**Sim:** [sim-fairness.mjs:499](../../scripts/sim-fairness.mjs#L499)
- Change `honestBodyLat = effectiveDisplaySize * bodyFillX`
- To: `honestBodyLat = bodyNarrow` (same bodyNarrow from step above)

**Sim:** [sim-fairness.mjs:498](../../scripts/sim-fairness.mjs#L498)
- Change `honestBodyLong = effectiveDisplaySize * bodyFillY`
- To: `honestBodyLong = bodyNarrow / bodyFillNarrow * bodyFillY` (drawn long axis from bodyNarrow)

Verifiable: `honestBodyWidthPx` for dragon at N=40 on Space Sprint: 34.0 px → 28.5 px.

### Step 3 — Fix formula denominator (Break 3)

**Game:** [raceBehavior.js:595](../../client/src/modules/raceBehavior.js#L595)
- Change `/ trackWidth`
- To: `/ (trackWidth / 2)`

**Game:** [raceBehavior.js:387–390](../../client/src/modules/raceBehavior.js#L387) (approach scan pairHH)
- Same denominator fix: `/ pairTW` → `/ (pairTW / 2)`

Verifiable: `sameLaneHH` for dragon N=40 Space Sprint: 0.0794 → 0.1900.
Verifiable: the `sim dY_px < honestBodyLat` check at [sim-fairness.mjs:969](../../scripts/sim-fairness.mjs#L969) automatically becomes correct — dY_px uses `geometricTrackWidth / 2` (line 967) which is now 300/2=150, and honestBodyLat is now 28.5. Overlap condition: `|Δy| × 150 < 28.5` → `|Δy| < 0.190` = exactly the correct drawn-body overlap threshold. No change needed to that line.

### Step 4 — Delete dead fields

**Game:** [raceBehavior.js:152–156](../../client/src/modules/raceBehavior.js#L152)
- Remove `visibleWidthPx` branch from `getSpriteWorldSizePx()`

**Game:** [raceBehavior.js:161](../../client/src/modules/raceBehavior.js#L161)
- Remove `trackWidthPx` branch from `getTrackWidthPx()`; keep only `geometricTrackWidthPx`

**Game:** [index.jsx:423–440](../../client/src/screens/RaceScreen/index.jsx#L423)
- `displaySizeScale_physical` can be inlined: `const physicalSpriteSize = computeRacerLayout(effectiveWidth, nRacers, displaySize, autoScaleConfig).spriteSize` and used only for `rowGapPx` on line 499. Named variable eliminated.

### Step 5 — Verify

- Tests: 2629/2629 green (behaviour change, no API change)
- Sim: Space Sprint shows `width=300px`, `honestBodyLat=28.5px` for dragon N=40
- `sameLaneHH` for dragon N=40: 0.190
- Full 66-combo N=50 sweep

---

## 7. What Stage D (gap force) needs after the fix

`honestHalfSpan` in Stage D ([raceBehavior.js:820](../../client/src/modules/raceBehavior.js#L820)) is `honestBodyWidthPx / trackWidth`. After fixes:
- `honestBodyWidthPx = bodyNarrow = 28.5px` (Step 2)
- `trackWidth = 300px` (Step 1)
- `honestHalfSpan = 28.5/300 = 0.095`
- `clearanceSpan = 2 × 0.095 = 0.190`

At `absYDiff = 0.190`: `gapRatio = 0` — gap force shuts off exactly when bodies clear. ✓
At `absYDiff = 0`: `gapRatio = 1.0`, full gap force. ✓

The Stage D formula works correctly after breaks 1 and 2 are fixed. The `2×` in `clearanceSpan` already accounts for the factor-of-2 that Break 3 introduces into the main sameLaneHH formula. **No change to Stage D code needed** — it benefits automatically from upstream fixes.
