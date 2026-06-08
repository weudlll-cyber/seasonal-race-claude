# Report 35 — Side-Separation Diagnosis: L515 Exemption is Wrong

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-07
**Status:** Diagnosis only — no build. Verdict at bottom.

---

## 1. The mechanism that is supposed to separate overlapping racers

**File:** [client/src/modules/raceBehavior.js:520–592](../../client/src/modules/raceBehavior.js#L520)

This is the **free-lane separation** block. Per pair (rA, rB), after passing the avoidance distance gate:

```javascript
// L523-530
if (spriteWorldSize > 0 && trackWidth > 0 && pathLength > 0) {
    const lateralHalfSpan = spriteWorldSize / trackWidth;          // ← the suspect
    const tHalfSpan       = spriteWorldSize / pathLength;
    const overlaps = dT <= tHalfSpan && Math.abs(dY) <= lateralHalfSpan;

    if (overlaps) {
        // check isSideFree(left/right) for both racers
        // assign dirA / dirB via stablePairBit tie-break
        // add dirA * forceMag to yFreeLaneDeltas[rA]
        // add dirB * forceMag to yFreeLaneDeltas[rB]
    }
}
```

**Trigger:** lateral distance `|dY| <= lateralHalfSpan = frameSizePx / trackWidth`.  
**Force direction:** `±1 * forceMag`, where `forceMag = lateralForce * (1 - dist/avoidanceDistance)`.  
**Force magnitude:** `lateralForce = 0.01` (default). At full overlap (dist=0): `forceMag = 0.01`.  
**Note:** this block is INSIDE the avoidance gate (L418–420), so it only runs when `dist < avoidanceDistance = 0.35`.

---

## 2. The size mismatch — measured for dragon, Space Sprint (trackWidthPx = 300)

**Parameters:** dragon: `displaySize=50`, `bodyFillNarrow=0.836`, `bodyFillLong=0.898`, frame 128×128.  
`effectiveWidth = 300 × 0.95 = 285`. `W_REF = min(285, 285) = 285`.  
`DEFAULT_AUTO_SCALE_CONFIG: minScale=0.65, maxScale=2.5`.

### computeRacerLayout — gives `frameSizePx` (= physicalSpriteSize)

`minSpriteSize = 50 × 0.65 = 32.5`. `maxSpriteSize = 50 × 2.5 = 125`.  
`maxRPRatMin = floor(570 / 32.5) = 17`.

| N | rowCount | rpr | frameSizePx (= physicalSpriteSize) |
|---|---|---|---|
| 4 | 1 | 4 | min(142.5, 125) = **125.0** |
| 7 | 1 | 7 | min(81.4, 125) = **81.4** |
| 20 | 2 | 10 | min(57.0, 125) = **57.0** |
| 40 | 3 | 14 | min(40.7, 125) = **40.7** |

### computeBodyNarrowRef — gives `drawnBodyWidthPx` (= bodyNarrow)

`minBodyNarrow = 41.8 × 0.65 = 27.2`. `maxBodyNarrow = 41.8 × 2.5 = 104.5`.  
`maxRPRatMin = floor(570 / 27.2) = 20`.

| N | rowCount | rpr | drawnBodyWidthPx (= bodyNarrow) |
|---|---|---|---|
| 4 | 1 | 4 | min(142.5, 104.5) = **104.5** |
| 7 | 1 | 7 | min(81.4, 104.5) = **81.4** |
| 20 | 1 | 20 | min(28.5, 104.5) = **28.5** |
| 40 | 2 | 20 | min(28.5, 104.5) = **28.5** |

**Key observation:** `computeRacerLayout` and `computeBodyNarrowRef` use different minimum slot sizes (frame vs body-narrow), producing different row counts at intermediate N. For N=20: physics uses 2 rows of 10 (`frameSizePx=57`) while camera uses 1 row of 20 (`drawnBodyWidthPx=28.5`). This divergence doesn't directly cause the overlap — the physics overlap detection uses `frameSizePx`, not `drawnBodyWidthPx`.

---

## 3. The critical column: body contact distance vs detection threshold

Convert body sizes and the detection threshold to the same unit: **physicalY space**  
using the correct mapping `pxToPhysicalY(px, tw) = px / (tw/2) = px / 150`.

### Initial row spread (1 row) — spacing between adjacent racers

`computeRowPhysicalY` with `spreadRange=0.95`:  
spacing = `2 × 0.95 / (rpr - 1)` = `1.9 / (rpr - 1)`.

| N | rpr (physics) | Adjacent spacing (physicalY) | frameSizePx | body contact distance (physicalY) | L515 detection threshold (physicalY) |
|---|---|---|---|---|---|
| **4** | 4 | 1.9/3 = **0.633** | 125.0 | 125.0/150 = **0.833** | 125.0/300 = **0.417** |
| **7** | 7 | 1.9/6 = **0.317** | 81.4 | 81.4/150 = **0.543** | 81.4/300 = **0.271** |
| **20** | 10 | 1.9/9 = **0.211** | 57.0 | 57.0/150 = **0.380** | 57.0/300 = **0.190** |
| **40** | 14 | 1.9/13 = **0.146** | 40.7 | 40.7/150 = **0.271** | 40.7/300 = **0.136** |

**"Body contact distance"** = the physicalY separation at which frame edges touch = `frameSizePx / (trackWidth/2)`. Two racers overlap visually when their `|dY|` is less than this.

**"L515 detection threshold"** = `frameSizePx / trackWidth` = what the code actually checks.

### What happens per N:

| N | Adjacent spacing | Body contact at | L515 fires when | Overlap undetected range | Pixel overlap at init |
|---|---|---|---|---|---|
| **4** | 0.633 | < **0.833** | < **0.417** | 0.417–0.833 | spacing(0.633) in this range → **undetected** / `\|dY\|=0.633 > 0.417`; avoidance also dead (dist=0.633 > 0.35) |
| **7** | 0.317 | < **0.543** | < **0.271** | 0.271–0.543 | spacing(0.317) is in this range → **undetected**; `\|dY\|=0.317 > 0.271` |
| **20** | 0.211 | < **0.380** | < **0.190** | 0.190–0.380 | spacing(0.211) is in this range → **undetected**; `\|dY\|=0.211 > 0.190` |
| **40** | 0.146 | < **0.271** | < **0.136** | 0.136–0.271 | spacing(0.146) is in this range → **undetected**; `\|dY\|=0.146 > 0.136` |

**At every N, the initial row spacing falls in the "blind zone" between the L515 detection threshold and the actual contact distance.** Racers start visually overlapping and the sensor doesn't fire.

### Pixel-space body overlap at race init:

Body half-width = `drawnBodyWidthPx / 2`. Center distance = `spacing × (trackWidth/2)`.  
Pixel overlap = `drawnBodyWidthPx - spacing × (trackWidth/2)`.

| N | drawnBodyWidthPx | Center-to-center (px) | Pixel body overlap | Overlap % of body |
|---|---|---|---|---|
| **4** | 104.5 | 0.633 × 150 = 94.9 px | 104.5 − 94.9 = **9.6 px** | 9.2% |
| **7** | 81.4 | 0.317 × 150 = 47.6 px | 81.4 − 47.6 = **33.8 px** | 41.5% |
| **20** | 28.5 | 0.211 × 150 = 31.7 px | 28.5 − 31.7 = **−3.2 px** (gap) | — |
| **40** | 28.5 | 0.146 × 150 = 21.9 px | 28.5 − 21.9 = **6.6 px** | 23.2% |

**N=7 is the worst case: racers overlap by 33.8 px (41.5% of body width) at race start, and the sensor is blind to it.**  
N=4 is less severe because spacing is wider (fewer racers per row). N=20 starts without overlap.  
N=40 has 6.6 px overlap — small, explains why it's less visible.

---

## 4. Why the L515 exemption was wrong

The comment added during the scale cleanup says:

> "INTENTIONAL: lateralHalfSpan uses spriteWorldSize (full frame) / trackWidth (not /2). This is the free-lane frame-proximity sensor — it uses the full frame envelope as its clearance radius."

The **intent** was: use the full frame (conservative — fires earlier than body-only detection).  
The **math** is wrong. `frameSizePx / trackWidth` does NOT give one frame-width in physicalY. It gives **half** a frame:

```
physicalY units for one frame = pxToPhysicalY(frameSizePx, trackWidth)
                                = frameSizePx / (trackWidth / 2)
                                = frameSizePx / 150   [for Space Sprint]

What L515 uses:  frameSizePx / trackWidth = frameSizePx / 300  ← one HALF-frame
```

The `/ trackWidth` formula accidentally applies the correct formula's denominator (`trackWidth/2`) and then doubles it. The result is 2× too small.

**The exemption was arguing for the right design ("use full frame") but implementing the wrong formula.** The correct implementation of "full-frame proximity sensor" is `pxToPhysicalY(frameSizePx, trackWidth)` — which is what every other size comparison in the file now uses.

---

## 5. Why this wasn't visibly catastrophic before the scale fix

Before the fix:
- `trackWidth = 449 px` (wrong — spline overestimate)
- `frameSizePx` was computed with `effectiveWidth = 449 × 0.95 = 426.55` → for N=7: `frameSizePx = 81.4`
- `lateralHalfSpan = 81.4 / 449 = 0.181`

The RATIO `frameSizePx/trackWidth` is invariant with track width because `effectiveWidth = trackWidth × startSpreadRange`, so `frameSizePx ≈ 2 × effectiveWidth / rpr = 2 × trackWidth × startSpreadRange / rpr`. The ratio `frameSizePx / trackWidth = 2 × startSpreadRange / rpr` — independent of trackWidth.

| N=7 | Before fix | After fix |
|---|---|---|
| `frameSizePx` | 121.9 | 81.4 |
| L515 threshold | 121.9/449 = 0.271 | 81.4/300 = **0.271** |
| Correct threshold | 121.9/(449/2) = **0.543** | 81.4/(300/2) = **0.543** |
| `drawnBodyWidthPx` | 121.9 × 0.836 = 101.9 | 81.4 (bodyNarrow) |
| Body in physicalY (old wrong formula `/tw`) | 101.9/449 = **0.227** | not used |
| Body in physicalY (correct formula `/(tw/2)`) | 101.9/(449/2) = 0.454 | 81.4/150 = **0.543** |
| Initial spacing | 0.317 | 0.317 |

**The L515 threshold (0.271) was the same before and after the fix.** The reason overlap looks worse NOW is:

1. Before fix, `drawnBodyWidthPx` was computed as `physicalSpriteSize × bodyFillX` (wrong formula) and converted with `/trackWidth` (wrong conversion). Both errors happened to cancel: `101.9/449 = 0.227`. Adjacent spacing 0.317 > 0.227 → **the old code thought there was NO overlap at the initial positions.** (It was wrong about this, but the wrongness was invisible because the numbers said "fine.")

2. After fix, body is correctly `pxToPhysicalY(81.4, 300) = 0.543`. Adjacent spacing 0.317 < 0.543 → **now we know the correct answer: there IS overlap.** The overlap was there all along — it was just unmeasured.

The scale fix made the problem visible by computing the correct body size. The L515 exemption was always wrong but the old wrong body-size calculation also gave the wrong answer in the opposite direction, so the two errors masked each other.

---

## 6. Cross-check at high N

At N=40 the pixel overlap is 6.6 px (23% of body) — still present but small. The L515 blind zone is 0.136–0.271 physicalY. The initial spacing (0.146) is only 0.010 above the detection threshold. So:
- At slightly below initial spacing, L515 fires
- The overlap is small and avoidance forces (forceMag at near-avoidanceDistance) are also small

Combined: at N=40, bodies barely overlap, separation forces are barely triggered, and home force is weak (racers displaced from center by only 0.146/row). The system works "well enough" at N=40.

At N=7, the situation is severely asymmetric: massive overlap (33.8 px), sensor blind to it, avoidance also weak (dY=0.317 → dist=0.317 → forceMag ≈ 0.001).

---

## 7. Avoidance force check (second mechanism)

For adjacent pair at dY=0.317, dT≈0 (pack scenario):
- `dist = sqrt(0 + 0.317²) = 0.317`
- `forceMag = 0.01 × (1 - 0.317/0.35) = 0.01 × 0.094 = 0.00094`
- `lateralScale = 98/300 = 0.327`
- Avoidance delta per frame: `0.317 × 0.00094 × 0.327 ≈ 0.000097` physicalY/frame

With damping ≈ 0.35: velocity increment ≈ 0.000097. After 60 frames (1 second): 0.006 physicalY displacement. This is nearly negligible and will be overwhelmed by home force pulling racers back toward center.

At N=4, dY=0.633 > avoidanceDistance(0.35): **avoidance doesn't fire at all.** The four racers have NO separation force (free-lane blind, avoidance dead) and home force pulling all toward center → they converge and permanently stack.

---

## 8. Verdict — (a), (b), or (c)?

**The answer is (a): the separation force is not firing for the critical cases.**

**Root cause:** `lateralHalfSpan = frameSizePx / trackWidth` (L528) is off by factor 2.  
The formula gives HALF-frame in physicalY, not one frame. The correct formula is:
```
lateralHalfSpan = pxToPhysicalY(frameSizePx, trackWidth) = frameSizePx / (trackWidth / 2)
```

**The L515 exemption was wrong.** Not because using frameSizePx (the frame envelope) was wrong — using the frame is the right conservative choice. But `frameSizePx / trackWidth` doesn't compute "one frame in physicalY space." It computes half a frame. The fix-comment argued for the right intent (full frame) but used the wrong formula. Every other lateral threshold in the file correctly uses `pxToPhysicalY` — this one should too.

**Consequences:**
- Detection threshold = 0.271 (current, wrong half-frame)
- Actual body contact at = 0.543 (correct, frame boundary)
- Blind zone: 0.271 to 0.543 physicalY
- Initial row spacing: 0.317 — squarely in the blind zone at N=7
- Result: **racers start visually overlapping and the sensor never fires**

**Why worst at low N:**  
At low N, bodies are large (81.4 px at N=7 vs 28.5 px at N=40). The blind zone (0.271–0.543) is the same width at all N (it scales with `frameSizePx/trackWidth`), but the pixel-space body overlap in the blind zone grows: N=7 → 33.8 px overlap; N=40 → 6.6 px overlap. Large sprites make the fault visible; small sprites keep it below the visual threshold.

**The fix:** change L528 from `spriteWorldSize / trackWidth` to `pxToPhysicalY(spriteWorldSize, trackWidth)`. Pass the corrected `lateralHalfSpan` to `isSideFree` as well (it uses the same value for the target-position check at L193 and L200).

This one line change doubles the detection threshold from 0.271 to 0.543 at N=7 — covering the initial spacing (0.317) and all body-overlap situations — and should produce the separation the user expects to see.

---

## 9. Note on the image (browser screenshot)

The RP DIAG confirms: `rows:1 rpr:7 n:7` — all 7 dragons in one row. At this N, the initial physicalY spacing is 0.317. The calculated pixel body overlap is **33.8 px** (41.5% of the 81.4 px body). This is clearly visible as stacked/touching bodies. The free-lane sensor at 0.271 threshold is below 0.317 → the overlap is never detected → no separation.
