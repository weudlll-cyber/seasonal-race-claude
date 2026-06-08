# Report 37 — Longitudinal Threshold + Overlay Pair Selection

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-07
**Status:** Diagnosis complete. Two fixes applied to instrumentation + tHalfSpan formula. Overlay rebuild pending.

---

## Source data (live overlay, Space Sprint 7 dragons seed:1, PULK t=29.4s)

```
Pair: Blaze / Thunder
physY: 0.2158 / 0.2305
|dY|: 0.0146   dT: 0.0164
dist: 0.0359   avoidDist: 0.1650
lhs: 0.5429    ths: 0.0041
overlaps: false
flRaw: 0/0
home: -0.0078 / -0.0083
```

---

## Finding A — tHalfSpan uses frame size, not body length (user's point is correct)

**File:** [raceBehavior.js:552](../../client/src/modules/raceBehavior.js#L552) (before fix):
```javascript
const tHalfSpan = spriteWorldSize / pathLength;
```

- `spriteWorldSize = getFrameSizePx(r) = frameSizePx` = **81.4 px** (full sprite frame for dragon N=7)
- `pathLength = getPathLengthPx(r)` = **19 772 px** (full Space Sprint track arc length in world pixels)
- `tHalfSpan = 81.4 / 19 772 = **0.00412**`

**What it means:** fires when `dT < 0.00412`, i.e., centers within `0.00412 × 19 772 = **81.4 px**` along the track.

**What it should be:** two racers touch longitudinally when their center distance < one body length. Dragon `drawnBodyLengthPx ≈ 30.6 px`.
```
ths_correct = drawnBodyLengthPx / pathLength = 30.6 / 19 772 = 0.001547
```
In px: fires when centers within **30.6 px** along the track.

**Direction of error:** the frame (81.4 px) > body (30.6 px), so the current threshold is **2.7× too wide** — it fires too early (detects pairs 81px apart that aren't yet body-touching). This is the opposite of the lateral L515 bug (which was too narrow). The tHalfSpan bug doesn't create a false-negative for longitudinally-touching racers; it creates false-positives (fires for pairs not yet touching).

However, the user is correct that the semantics are wrong: longitudinal contact depends on body length, not frame size. Fixed.

**Unit logic:** `pathLength` IS the right conversion denominator. The t-axis is `px / pathLength`, so `bodyLength / pathLength` converts px → t correctly. No additional factor. A `pxToT(px) = px / pathLength` helper would centralize this but is not strictly necessary — there's no hidden factor-of-2 in the longitudinal direction (unlike physicalY which has the /2 from EditorShape.getPosition).

**After fix:**
```javascript
const bodyLength = Math.max(rA.drawnBodyLengthPx ?? spriteWorldSize, rB.drawnBodyLengthPx ?? spriteWorldSize);
const tHalfSpan = bodyLength / pathLength;  // = 30.6 / 19772 = 0.001547 for dragon N=7
```

---

## Finding B — the overlay was tracking the WRONG pair

**The pair Blaze/Thunder is NOT visually overlapping:**

```
dT = 0.0164  →  0.0164 × 19 772 px = 324 px longitudinal separation
Dragon body ≈ 30.6 px  →  324 / 30.6 ≈ 10.6 body-lengths apart
```

Blaze and Thunder are over **ten body-lengths apart** along the track. They are NOT the stacked pair visible in the image (Flash/Nitro at the top are).

**Why the wrong pair was selected:** the overlay tracked the pair with minimum `|dY|`. This picks the pair that is most laterally aligned — but with no constraint on longitudinal distance, it can select pairs that are close in physicalY but far apart along the track. Blaze/Thunder are accidentally near each other in physicalY (0.2158 vs 0.2305) while being 324px apart along the track.

**The fix:** track minimum `dist` instead of minimum `|dY|`:
```javascript
// was:  if (_dc === null || Math.abs(dY) < Math.abs(_dc.dY))
if (_dc === null || dist < _dc.dist)
```

`dist = sqrt((dT × tWeight)² + (dY × yWeight)²)` is the same anisotropic metric the physics uses for the avoidance gate. The pair with minimum `dist` is the one the physics considers "most together" — combining both axes. This will correctly identify the pair that is both laterally and longitudinally close.

---

## Finding C — avoidDist = 0.1650, not 0.35

The overlay shows `avoidDist: 0.1650`. The default in `defaults.js` is:
```javascript
avoidanceDistance: 0.18,
```
The 0.1650 is within the tunable range — slightly below the 0.18 default. This is a live configuration value from the running game's DevScreen tuning, not a bug or a mismatch. No action needed.

---

## Before/after tHalfSpan at N=7 dragon, Space Sprint

| Formula | Numerator | Value | Longitudinal firing distance |
|---|---|---|---|
| Current (frame) | `frameSizePx = 81.4 px` | 0.00412 | 81.4 px — ~2.7 body-lengths |
| Correct (body) | `drawnBodyLengthPx = 30.6 px` | 0.001547 | 30.6 px — 1 body-length |

For the measured pair (dT=0.0164 = 324px): neither threshold would flag them as overlapping (324px >> 81.4px or 30.6px). Confirms they are not the visually stacked pair.

For a genuinely touching pair (dT ≈ 0.0010 = 20px):
- Old threshold: 0.0010 < 0.00412 → detected ✓
- New threshold: 0.0010 < 0.001547 → detected ✓
Both would catch it — the fix makes the zone semantically correct without creating blind spots for actually-touching pairs.

---

## Summary of changes applied

| Change | What | Why |
|---|---|---|
| Overlay pair selection | min `|dY|` → min `dist` | Was tracking laterally-close but longitudinally-far pair; `dist` finds the truly closest pair |
| tHalfSpan numerator | `spriteWorldSize` → `drawnBodyLengthPx ?? spriteWorldSize` | Longitudinal contact is about body length, not frame size; pathLength stays as the px→t conversion |

---

## Next step

Re-run with the updated overlay to measure the **actual closest pair** (minimum dist). If that pair shows `overlaps: false`, check which gate rejects it and what the actual dT/dY values are. The lateral sensor (lhs) is correct after the L515 fix — the question is whether the longitudinal or avoidance-distance gate is the remaining blocker.
