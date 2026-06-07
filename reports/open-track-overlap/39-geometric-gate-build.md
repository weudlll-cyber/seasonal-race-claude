# Report 39 — Geometric Gate Build

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-07
**Status:** Build complete. Tests green. Awaiting USER browser check + live calibration before sweep.

---

## What was built

Replaced the broken avoidance gate (4 lines, `raceBehavior.js` ~L465–483) with a coherent geometric, two-axis, body-size-based nearness check. Three design corrections were required during the build; each is documented.

---

## Design corrections found during build

### Correction 1 — Frame vs body mismatch (invariant violation)

**Proposed design:** gate uses `drawnBodyWidthPx` (body), free-lane uses `frameSizePx` (frame).

**Problem:** `frameSizePx ≈ 81px` (frame) > `drawnBodyWidthPx ≈ 28px × 1.2 = 34px` (gate). Free-lane fires up to `|dY| < 0.54`, gate rejects at `|dY| ≥ 0.23`. Pairs that the free-lane wants to separate are rejected by the gate first — same structural bug as the original.

**Fix:** Both gate and free-lane use the **same body-based contact distance**. Gate = contact × (1+buffer), free-lane = contact. Invariant holds by construction for any body-size combination.

### Correction 2 — `max()` vs sum-of-half-sizes (geometry error)

**Proposed design:** gate uses `max(drawnBodyWidthA, drawnBodyWidthB)` as contact distance.

**Problem:** The contact distance between two bodies is `widthA/2 + widthB/2`, not `max(widthA, widthB)`. Example: dragon 28px vs rocket 14px touch at 21px center separation, not 28px.

**Fix:** `contactWidth = (rA.drawnBodyWidthPx ?? frameA) / 2 + (rB.drawnBodyWidthPx ?? frameB) / 2`. Sum of half-sizes. Both gate and free-lane use this same sum. Gate invariant: contact × (1+buffer) > contact, for equal and unequal bodies. ✓

### Correction 3 — Speed brake zone wider than gate (structural ordering error)

**Problem:** Speed brake fires up to `frameSizePx × speedBrakeTMultiplier = 40 × 1.5 = 60px` longitudinally. Body-contact gate admits only up to `contactLength × 1.2 = 31 × 1.2 = 37.2px`. Speed brake was inside the gate and would be cut off for pairs at 37–60px separation.

**Fix:** Speed brake runs **before** the body-contact gate. It is pace management (should the trailer match the leader's speed?), not body-overlap detection. The gate now guards only avoidance force and free-lane separation. Each system uses its own correct threshold:
- Speed brake: `frameSizePx × speedBrakeTMultiplier` (frameSizePx-based, intentionally wide)
- Gate: `contactWidth × (1+bufferPct)` (body-based, correct for body overlap)

---

## The production code

### `pairContact` helper (raceBehavior.js, new function after `getPathLengthPx`)

```javascript
function pairContact(rA, rB) {
  const frameA = getFrameSizePx(rA);
  const frameB = getFrameSizePx(rB);
  const hw_A = (rA.drawnBodyWidthPx  ?? frameA) / 2;
  const hw_B = (rB.drawnBodyWidthPx  ?? frameB) / 2;
  const hl_A = (rA.drawnBodyLengthPx ?? frameA) / 2;
  const hl_B = (rB.drawnBodyLengthPx ?? frameB) / 2;
  return {
    contactWidth:  hw_A + hw_B,  // sum of half-sizes — exact body contact distance
    contactLength: hl_A + hl_B,
    pairTW: Math.max(getTrackWidthAtTpx(rA), getTrackWidthAtTpx(rB)),
    pairPL: Math.max(getPathLengthPx(rA),    getPathLengthPx(rB)),
  };
}
```

### New pair loop structure

```
for each pair (rA, rB):
  [step-2 clearance accumulators]      // unchanged, pre-gate
  [diag block]                          // unchanged, pre-gate

  [sprite geometry: sizeA/B, spriteWorldSize, trackWidth, pathLength]  // moved before gate
  [aIsTrailer / leader]                                                  // moved before gate

  // ── SPEED BRAKE (before gate — its zone is wider than body-contact zone) ──
  dynamicBrakeT = (frameSizePx / pathLength) × speedBrakeTMultiplier  // 60px at N=40
  if |dY| < speedBrakeYThreshold AND dT < dynamicBrakeT:
    speedBrakeSet.add(trailer)
    [brakeMatch cap computation]                                         // unchanged

  // ── BODY-CONTACT GATE ──
  { contactWidth, contactLength, pairTW, pairPL } = pairContact(rA, rB)
  if contactWidth == 0 OR contactLength == 0: continue   // no body info
  latPx  = |dY| × (pairTW / 2)
  longPx = dT × pairPL
  bufferPct = config.avoidanceBufferPct ?? 0.20
  latTrigger  = contactWidth  × (1 + bufferPct)
  longTrigger = contactLength × (1 + bufferPct)
  if latPx >= latTrigger OR longPx >= longTrigger: continue

  // ── AVOIDANCE FORCE (inside gate) ──
  lateralScale = clamp(REFERENCE_TRACK_WIDTH / pairTW, 0.1, 3.0)
  latFraction  = 1 - latPx  / latTrigger
  longFraction = 1 - longPx / longTrigger
  forceMag = lateralForce × min(latFraction, longFraction)

  // ── FREE-LANE SEPARATION (inside gate, same contact base) ──
  lateralHalfSpan = pxToPhysicalY(contactWidth,  trackWidth)  // same as gate contact ✓
  tHalfSpan       = contactLength / pathLength                  // same as gate contact ✓
  overlaps = dT <= tHalfSpan AND |dY| <= lateralHalfSpan
  ...
```

### Invariant proof

```
Gate:       latPx < contactWidth × (1+buffer)
Free-lane:  latPx ≤ contactWidth

For any bufferPct > 0: contactWidth × (1+buffer) > contactWidth ✓
This holds for any (widthA, widthB) — equal or unequal — because both use the same
sum-of-halves contact. No max(), no frame size, no track-dependent factors.
```

### forceMag formula

```
latFraction  = 1 - latPx  / latTrigger   // 0 at boundary, 1 at centers touching
longFraction = 1 - longPx / longTrigger
forceMag = config.lateralForce × min(latFraction, longFraction)
```

Force decays linearly from full (`lateralForce`) at exact center contact to zero at the trigger boundary on either axis. No sqrt. The `min` means force is zero when EITHER axis reaches the boundary — the pair is considered "close enough on the more limiting axis."

---

## Turbo/Nitro walk-through (confirming root cause resolved)

```
drawnBodyWidthPx = 28.5px,  drawnBodyLengthPx = 30.6px  (dragon N=7)
trackWidthPx = 300  (Space Sprint),  pathLengthPx = 19 772
latPx = 25.0px,  longPx = 17.2px,  bufferPct = 0.20

pairContact:
  contactWidth  = 28.5/2 + 28.5/2 = 28.5px
  contactLength = 30.6/2 + 30.6/2 = 30.6px

GATE (body-contact):
  latTrigger  = 28.5 × 1.2 = 34.2px  →  25.0 < 34.2  ✓ PASSES
  longTrigger = 30.6 × 1.2 = 36.7px  →  17.2 < 36.7  ✓ PASSES
  (OLD gate at L465: 0.1664 × 1.0 ≥ 0.165 → REJECTED — now fixed)

forceMag:
  latFraction  = 1 - 25.0/34.2 = 0.269
  longFraction = 1 - 17.2/36.7 = 0.531
  forceMag = 0.0114 × min(0.269, 0.531) = 0.0114 × 0.269 = 0.00307

FREE-LANE:
  lateralHalfSpan = pxToPhysicalY(28.5, 300) = 28.5/150 = 0.190
  |dY| = 0.1664 ≤ 0.190  ✓
  tHalfSpan = 30.6/19772 = 0.001548
  dT = 0.0009 ≤ 0.001548  ✓
  overlaps = true → free-lane separation fires  ✓
```

Both gate and free-lane now agree: Turbo/Nitro are overlapping and receive non-zero separation force.

---

## Config changes

| Field | Status | Notes |
|---|---|---|
| `avoidanceBufferPct` | **NEW**, default `0.20` | Replaces avoidanceDistance/tWeight/yWeight in the gate |
| `avoidanceDistance` | Kept, retired from gate | Sim scripts still read it; marked in comment |
| `tWeight` | Kept, retired from gate | Same |
| `yWeight` | Kept, retired from gate | Same |

Dev Screen — **Soft Avoidance** block: T Weight and Y Weight inputs replaced by a single "Avoidance Buffer (% of body size)" input (`avoidanceBufferPct`, range 0–2.0, step 0.05).

---

## Tests: setup and each shifted test

### `makeLaneRacer` body sizes added

```
drawnBodyWidthPx: 28,  drawnBodyLengthPx: 31
```
Dragon-approximate (real N≈40 dragon: 28.5px wide, 30.6px long; rounded for exact arithmetic).

Derived geometry for `makeLaneRacer` (trackWidthPx=140, pathLengthPx=1200):
```
contactWidth = 28,  contactLength = 31
latTrigger  = 28 × 1.2 = 33.6px   gate fires when |dY| < 33.6/70 = 0.480
longTrigger = 31 × 1.2 = 37.2px   gate fires when dT < 37.2/1200 = 0.031
lateralHalfSpan = 28/70 = 0.400   free-lane fires when |dY| ≤ 0.400
tHalfSpan = 31/1200 = 0.0258       free-lane fires when dT ≤ 0.0258
```

Every separation-outcome test uses real geometry (no zero-geometry racers). Tests that only check force direction are commented as "direction test only."

### Tests with changed assertions — derivations

**"gate rejects pairs outside body contact zone (lateral)"**:
`|dY| = 1.0 → latPx = 70 ≥ 33.6 → gate rejects → physicalY unchanged` ✓

**"gate rejects pairs outside body contact zone (longitudinal)"**:
`dT = 0.10 → longPx = 120 ≥ 37.2 → gate rejects → physicalY unchanged` ✓

**"force magnitude scales with proximity"**:
- Close pair `dT=0.01`: `longPx=12 < 37.2` → gate fires → force
- Far pair `dT=0.08`: `longPx=96 ≥ 37.2` → gate rejects → no movement
- Assertion: `|close1.physicalY - (-0.05)| > 0` and `far1.physicalY unchanged` ✓

**"gate geometry: rejects on each axis independently"**:
Longitudinal rejection: `dT=0.10 → longPx=120 ≥ 37.2` ✓
Lateral rejection: `|dY|=0.8 → latPx=56 ≥ 33.6` ✓
Both inside: `|dY|=0.1 → latPx=7 < 33.6`, `dT=0.01 → longPx=12 < 37.2` → fires ✓

**"asymmetric: trailer yields, leader unchanged"** and **"trailer pushed away"**:
Changed `dT` to `0.029` (longPx=34.8): inside gate (< 37.2) but outside free-lane (> contactLength=31, so tHalfSpan=0.0258 < dT → no overlap). Only avoidance fires; avoidance is trailer-only → leader unchanged. ✓

**"avoidance skips when same physicalY"**:
Added `isOpen: false` to disable Stage B. Stage B's `naturalDir` tiebreak fires when `relPos=0` (assigns direction `(index&1)===0 ? 1 : -1`) and would push racers via Stage D. Since the test is about the avoidance yDiff skip, not Stage B, `isOpen:false` correctly isolates avoidance behavior. ✓

**"anti-stacking: force with 4 neighbors = 2×solo"**:
Switched to `makeLaneRacer` with `physicalY=±0.2` (`dT=0.01`): `latPx=28 < 33.6` AND `longPx=12 < 37.2` → gate fires. Free-lane also fires (latPx=28 ≤ contactWidth=28, longPx=12 ≤ 31). Both avoidance and free-lane are sqrt(N)-normalized independently; all 4 pairs from r0 produce identical force vectors → delta5 = 2×deltaSolo. ✓

**"track-relative scaling"**:
Old tests used zero-geometry racers (`makeRacer` with no body sizes) → gate would skip → delta=0. Rewritten with `avoidDeltaFixedPx(trackW, latPxTarget)` using `makeLaneRacer`:
- Fixed `latPxTarget` across both track widths → same `latFraction`
- `dT=0.029` → gate fires, free-lane skipped (34.8 > 31), `isOpen:false` → Stage B skipped
- Only `lateralScale = clamp(98/trackW, 0.1, 3.0)` varies
- `delta196 ≈ delta98 × 0.5` (derivation: same forceMag, lateralScale 0.5 vs 1.0) ✓
- `delta1000 ≈ delta2000` (both clamped to 0.1) ✓
- `delta10 ≈ delta20` (both clamped to 3.0) ✓

---

## Sim parity note

`scripts/sim-fairness.mjs` and related sweep scripts still use `avoidanceDistance` + `tWeight` + `yWeight`. The sim has its own copy of the avoidance logic. Per the Sim-Browser Parity Rule, the sim must be updated to mirror this change before the next sweep. **Do not run a sweep until the sim is updated.** The sim update is deferred until the browser confirms correct behavior (see verification order below).

---

## Spatial grid note (BACKLOG)

Checking every racer against every other is O(N²): ~10 000 pair tests at N=100. The planned speedup is a **spatial grid** that buckets racers into cells (cell size ≈ a multiple of body size) so each racer only tests nearby cells.

**Important:** merely checking body-contact geometry within the gate does NOT reduce O(N²) work — the grid is what avoids scanning all N pairs. This must NOT be implemented until the geometric gate is confirmed working in the browser (optimize a correct system, not a broken one), and must not change behavior, only speed.

Recorded in BACKLOG as the next performance step after browser confirmation.

---

## Verification order (do NOT skip)

1. **Tests: ✓** 2630/2630 passing (all 122 test files).

2. **USER BROWSER CHECK FIRST** (the real gate):
   - N=7 dragons, Space Sprint: do Turbo/Nitro and other stacked pairs NOW separate?
   - N=4 (largest sprites): do they spread instead of piling at center?
   - Full field N=40: clean, natural separation?
   - Slim racers (rocket/giraffe): clean, no new pass-through?
   - Open the Dev Screen → Soft Avoidance → set **Avoidance Buffer** slider while watching. Default 0.20 (20%). Lower = forces engage later; higher = forces engage earlier.

3. **Calibrate `avoidanceBufferPct` by eye** in the Dev Screen over a few runs until separation feels natural and forces are not over-eager.

4. **Only after the browser looks right**: update `sim-fairness.mjs` to mirror the geometric gate, then run the 66-combo N=50 sweep as the new fairness baseline. Re-check any seed-1 fail at seeds 2 & 42.

**No sweep until the browser confirms and the sim is updated.**

---

## Files changed

- [raceBehavior.js](../../client/src/modules/raceBehavior.js) — `pairContact` helper, speed brake moved before gate, geometric gate replacing L465–483, free-lane `lateralHalfSpan` switched to body-based
- [storage/defaults.js](../../client/src/modules/storage/defaults.js) — `avoidanceBufferPct: 0.20` added; retired fields annotated
- [BehaviorTuningSection.jsx](../../client/src/screens/DevScreen/sections/BehaviorTuningSection.jsx) — Soft Avoidance block: T Weight + Y Weight replaced by Avoidance Buffer slider
- [RaceScreen/index.jsx](../../client/src/screens/RaceScreen/index.jsx) — diag overlay shows `buffer` and `latTrigger` instead of `avoidDist`
- [raceBehavior.test.js](../../client/src/modules/raceBehavior.test.js) — `makeLaneRacer` gets body sizes, all gate tests rewritten with real geometry and derived expected values
- [raceBehaviorConfig.test.js](../../client/src/modules/raceBehaviorConfig.test.js) — added `avoidanceBufferPct` test
- [RaceTuningSection.test.jsx](../../client/src/screens/DevScreen/sections/RaceTuningSection.test.jsx) — mock config + aria label updated for Avoidance Buffer
