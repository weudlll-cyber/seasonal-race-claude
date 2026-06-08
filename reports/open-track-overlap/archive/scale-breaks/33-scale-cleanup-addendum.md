# Report 33 — Scale Cleanup: Finalization Addendum

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-07
**Status:** Plan closed. Copilot round-2 findings resolved. BUILD-READY after confirmation.
**Amends:** Report 31 (consolidated plan). Report 32 (body-size confirmation).

---

## Finding 1 — Body length expressed directly from render primitives (RESOLVED)

**Issue:** Report 31 expressed `drawnBodyLengthPx = bodyNarrow × bodyFillLong / bodyFillNarrow`, routing through the width variable. Copilot requested an independent expression or an explicit isotropy guarantee.

**Resolution: use the direct render-path expression.**

From [SpriteRacerType.js:227–235](../../client/src/modules/racer-types/SpriteRacerType.js#L227):
```javascript
const scale = ((cfg.displaySize * displaySizeScale) / cfg.frameHeight / bodyFillNarrow) * silhouetteScale;
const dw    = cfg.frameWidth  * scale;   // full frame width in world px
```

Tracing `bodyFillLong × dw` for square frames (confirmed all 20 current types) and silhouetteScale=1.0 (default):
```
drawnBodyLengthPx = bodyFillLong × frameWidth × scale
                  = bodyFillLong × displaySize × displaySizeScale / bodyFillNarrow
```

**Implementation:**
```javascript
// After: displaySizeScale = bodyRef.bodyNarrow / displaySize
const drawnBodyWidthPx  = displaySize * displaySizeScale;         // = bodyRef.bodyNarrow
const drawnBodyLengthPx = displaySize * displaySizeScale * bodyFillLong / bodyFillNarrow;
```

The two lines share `displaySize * displaySizeScale` but the width assignment does NOT appear in the length formula — `bodyFillNarrow` and `bodyFillLong` are read from the racer type config independently. This is the "two independent quantities" structure.

**Isotropy guarantee (for the code comment):**
> `drawnBodyLengthPx = displaySize × displaySizeScale × bodyFillLong / bodyFillNarrow`
> Algebraically equals `drawnBodyWidthPx × bodyFillLong / bodyFillNarrow` because the renderer
> uses a single isotropic scale factor (SpriteRacerType:229). Both bodyFillNarrow and
> bodyFillLong are read from config independently — not one derived from the other.
> Valid only for square frames (frameWidth = frameHeight). All 20 current types are square;
> non-square types must use `bodyFillLong × frameWidth / (bodyFillNarrow × frameHeight)`.

**Sim:** same formula, using `bodyNarrow / displaySize` for displaySizeScale after the computeBodyNarrowRef call.

**Numeric checkpoints unchanged:**
- dragon (ds=50, bfN=0.836, bfL=0.898): `50 × (28.5/50) × 0.898/0.836` = **30.6px**
- plane  (ds=42, bfN=0.836, bfL=0.930): `42 × (28.5/42) × 0.930/0.836` = **31.7px**
- rocket (ds=47, bfN=0.278, bfL=0.801): `47 × (14.25/47) × 0.801/0.278` = **41.1px**

---

## Finding 2 — diag-comeback-overlap.mjs + final re-grep (RESOLVED)

### diag-comeback-overlap.mjs — what it uses, what needs fixing

**Track width source** — [diag-comeback-overlap.mjs:70](../../scripts/diag-comeback-overlap.mjs#L70):
```javascript
const geometricTrackWidth = trackRaw.width ?? 300;   // ← already correct: reads track.width first
```
**No fix needed for Step 1.** This script already adopted the right source.

**Body source** — [diag-comeback-overlap.mjs:99–101](../../scripts/diag-comeback-overlap.mjs#L99) and [:160–161](../../scripts/diag-comeback-overlap.mjs#L160):
```javascript
// Line 99-101 (effectiveDisplaySize from physical layout path — wrong for body):
const { spriteSize: effectiveDisplaySize } = computeRacerLayout(effectiveWidth, N_RACERS, RACER.displaySize, DEFAULT_AUTO_SCALE_CONFIG);

// Lines 110, 160-161 (body dimensions use wrong base):
console.log(`honestBodyLong=${(effectiveDisplaySize * RACER.bodyFillY).toFixed(1)}px  honestBodyLat=${(effectiveDisplaySize * RACER.bodyFillX).toFixed(1)}px`);
const honestBodyLong = effectiveDisplaySize * RACER.bodyFillY;
const honestBodyLat  = effectiveDisplaySize * RACER.bodyFillX;
```
**Fix in Step 2:** add `computeBodyNarrowRef` call (same inputs as sim-fairness.mjs), use resulting `bodyNarrow` for `drawnBodyWidthPx` and `drawnBodyLengthPx`. Update line 273's overlap check to use the renamed variables.

**Old field names on racer objects** — [diag-comeback-overlap.mjs:146–147](../../scripts/diag-comeback-overlap.mjs#L146):
```javascript
spriteWorldSizePx: effectiveDisplaySize,   // → frameSizePx
geometricTrackWidthPx: geometricTrackWidth, // → trackWidthPx
```
**Fix in Step 6** (naming pass). Note: `geometricTrackWidth` local variable becomes `trackWidthPx` throughout the file.

### Re-grep — no sixth consumer found

**Body source re-grep** (`honestBodyWidthPx`, `honestBodyLat`, `physicalSpriteSize × bodyFill`, `effectiveDisplaySize × bodyFill`):

| File | Lines | Status |
|---|---|---|
| scripts/diag-comeback-overlap.mjs | 110, 160, 161 | **New — add to Step 2** |
| scripts/sim-fairness.mjs | 339, 498, 499 | Already in plan |
| client/src/screens/RaceScreen/index.jsx | 604 | Already in plan |
| client/src/modules/raceBehavior.js | 387, 388, 593, 594, 820 | Already in plan |
| client/src/modules/storage/defaults.js:543 | — | Comment only; no fix |

**Raw physicalY → px re-grep** (`physicalY * trackWidth` without /2):

| File | Lines | Status |
|---|---|---|
| client/src/modules/raceBehavior.js | 221, 238, 246 | Already in plan (BLOCKED-mode, Gap 1) |
| scripts/diag-free-lane-force-attribution.mjs:139 | `r.physicalY * (trackWidthPx / 2)` | **CORRECT — already uses /2** ✓ |
| scripts/sim-fairness.mjs:948 | comment line | Not code |

**Verdict: no sixth consumer.** The re-grep is clean. All sites are accounted for.

---

## Finding 3 — Helper exemptions: L515 and L820 (RESOLVED)

### L515 — free-lane lateralHalfSpan: EXEMPT WITH RATIONALE

[raceBehavior.js:515](../../client/src/modules/raceBehavior.js#L515):
```javascript
const lateralHalfSpan = spriteWorldSize / trackWidth;   // ← does NOT use /2
const tHalfSpan       = spriteWorldSize / pathLength;
const overlaps        = dT <= tHalfSpan && Math.abs(dY) <= lateralHalfSpan;
```

**This is NOT a clearance conversion.** It is a proximity scan that detects when sprites are in direct overlap to trigger free-lane separation forces. The formula computes the sprite frame's fraction of the full track width.

In world px: `|dY| <= lateralHalfSpan` fires when `|dY| × (trackWidth/2) <= spriteWorldSize/2` — i.e., when the centers are within **half a frame** of each other laterally. The t-direction fires when centers are within **one full frame** longitudinally (`dT × pathLength <= spriteWorldSize`). The lateral threshold is deliberately more conservative (half-frame, not full-frame) to restrict the free-lane force to tight overlaps, reducing jitter at grazing contacts.

`spriteWorldSize` here is `frameSizePx` (the full sprite frame envelope), NOT `drawnBodyWidthPx`. This is the right input for a frame-proximity check: the force fires when the FRAMES are nearly coincident, regardless of the body's exact fill fraction.

**Exemption statement (to appear as a code comment at L515):**
> `lateralHalfSpan = frameSizePx / trackWidth` — frame-fraction proximity check, not a
> clearance conversion. In px: fires when centers are within frameSizePx/2 laterally.
> The conservative threshold (half-frame, not full) prevents free-lane jitter at grazing
> contacts. Do NOT route through pxToPhysicalY — that helper converts body measurements
> to clearance thresholds; this is a proportional frame-proximity sensor.

**Post-fix behavior note:** The trackWidth fix (449→300) alone widens this zone slightly (lateralHalfSpan grows because the same frame is a larger fraction of the narrower track). This is an expected, acceptable side-effect.

---

### L820 — Stage D honestHalfSpan: ROUTE THROUGH HELPER

[raceBehavior.js:819–823](../../client/src/modules/raceBehavior.js#L819) (current):
```javascript
const honestHalfSpan  = (r.honestBodyWidthPx ?? r.spriteWorldSizePx ?? 0) / tw;
if (honestHalfSpan > 0) {
  const absYDiff    = Math.abs(r.physicalY - lpy);
  const clearanceSpan = 2 * honestHalfSpan;  // ← 2× compensates for missing /2 in the denominator
  const gapRatio = Math.max(0, (clearanceSpan - absYDiff) / clearanceSpan);
```

Current: `clearanceSpan = 2 × (drawnBodyWidthPx / tw)` = `2 × drawnBodyWidthPx / tw`. In px: `clearanceSpan × (tw/2) = drawnBodyWidthPx` ✓ by coincidence.

The `2×` in `clearanceSpan` and the missing `/2` in the denominator cancel. This is confusing — it looks like a raw `/ tw` conversion with a compensating `2×`.

**Fix — route through helper, eliminate honestHalfSpan:**
```javascript
// clearanceSpan: body clears when |physicalY delta| >= this threshold (one drawn body width)
const clearanceSpan = pxToPhysicalY(r.drawnBodyWidthPx, tw);  // drawnBodyWidthPx / (tw/2)
if (clearanceSpan > 0) {
  const absYDiff = Math.abs(r.physicalY - lpy);
  const gapRatio = Math.max(0, (clearanceSpan - absYDiff) / clearanceSpan);
```

Numerically identical: `clearanceSpan = drawnBodyWidthPx / (tw/2) = 28.5/150 = 0.190` = same as current `2 × (28.5/300) = 0.190`.

The `honestHalfSpan` variable is eliminated. The code now reads: "the gap force ramps to zero when `|physicalY delta| = clearanceSpan = pxToPhysicalY(drawnBodyWidthPx, tw)`" — exactly the correct interpretation, no compensating factors to mentally track.

---

## Updated complete consumer list

### Step 1 — Track width source (all 5 sites, unchanged from report 31)
| Site | Fix |
|---|---|
| index.jsx:371 | `geometry.width ?? shape.getActualTrackWidth()` |
| index.jsx:694 | `trackWidthPx / 2` |
| sim-fairness.mjs:2145 | `track.width ?? shape.getActualTrackWidth()` |
| SetupScreen.jsx:233 | `geom.width ?? shape.getActualTrackWidth()` |
| TrackManager.jsx:58 | `track.width ?? shape.getActualTrackWidth()` |

Note: diag-comeback-overlap.mjs:70 already correct (`trackRaw.width ?? 300`). ✓

### Step 2 — Body width source (now 4 sites)
| Site | Fix |
|---|---|
| index.jsx:604 | `drawnBodyWidthPx: referenceSpriteSize` |
| sim-fairness.mjs:338 | `drawnBodyWidthPx: bodyNarrow` (add computeBodyNarrowRef call) |
| sim-fairness.mjs:499 | `drawnBodyWidthPx = bodyNarrow` |
| **diag-comeback-overlap.mjs:161** | `drawnBodyWidthPx = bodyNarrow` (add computeBodyNarrowRef call) |

### Step 3 — Body length source (now 3 sites)
| Site | Fix |
|---|---|
| sim-fairness.mjs:498 | `drawnBodyLengthPx = displaySize * displaySizeScale * bodyFillLong / bodyFillNarrow` |
| **diag-comeback-overlap.mjs:160** | `drawnBodyLengthPx = displaySize * displaySizeScale * bodyFillLong / bodyFillNarrow` |
| **diag-comeback-overlap.mjs:110** | Update log line: `drawnBodyWidthPx=…  drawnBodyLengthPx=…` |

### Step 4 — Denominators + BLOCKED-mode + helpers (unchanged + L820 addition)
| Site | Fix |
|---|---|
| raceBehavior.js (top-level) | Add `pxToPhysicalY(px, tw)` and `physicalYToPx(phy, tw)` helpers |
| raceBehavior.js:595 | `/ (trackWidth / 2)` |
| raceBehavior.js:387–390 | `/ (pairTW / 2)` |
| raceBehavior.js:221 | `× (trackWidth / 2)` |
| raceBehavior.js:238 | `× (trackWidth / 2)` |
| raceBehavior.js:246 | `× (trackWidth / 2)` |
| **raceBehavior.js:819–823** | Route Stage D through helper: `clearanceSpan = pxToPhysicalY(r.drawnBodyWidthPx, tw)` |
| **raceBehavior.js:515** | Add exemption comment (no code change) |

### Step 5 — Sweep scripts (18 files, unchanged from report 31)
One-liner each: `shape.getActualTrackWidth()` → `track.width ?? shape.getActualTrackWidth()`

### Step 6 — Naming (now includes diag-comeback-overlap.mjs)
All field and helper renames per report 31 naming table, plus:
| diag-comeback-overlap.mjs site | Change |
|---|---|
| Line 146: `spriteWorldSizePx: effectiveDisplaySize` | → `frameSizePx: frameSizePx` |
| Line 147: `geometricTrackWidthPx: geometricTrackWidth` | → `trackWidthPx: trackWidthPx` |
| Line 70: local `geometricTrackWidth` | → rename to `trackWidthPx` throughout file |
| Lines 160-161: `honestBodyLat`, `honestBodyLong` | → `drawnBodyWidthPx`, `drawnBodyLengthPx` |
| Line 273: `dY_px >= honestBodyLat`, `dT_px >= honestBodyLong` | → `drawnBodyWidthPx`, `drawnBodyLengthPx` |

---

## Final sequenced build steps

1. **Step 1** — Track width source (5 sites in game/sim/UI)
2. **Step 2** — Body width source (4 sites: game, sim, diag-comeback)
3. **Step 3** — Body length source (3 sites: sim, diag-comeback ×2)
4. **Step 4** — Helpers + denominators + BLOCKED-mode + Stage D (6 formula sites + 2 helpers + 1 comment)
5. **Step 5** — Sweep scripts (18 files, one-liner pattern)
6. **Step 6** — Naming pass (all files)
7. **Step 7** — Full N=50 sweep (66 combos)

---

## Numeric checkpoints (locked, unchanged)

| Checkpoint | Value | Step |
|---|---|---|
| A — Space Sprint `width` in sim output | 300px (was 449px) | After Step 1 |
| B — `drawnBodyWidthPx` dragon N=40 | 28.5px (was ≈34px) | After Step 2 |
| B2 — `drawnBodyWidthPx` rocket N=40 | 14.25px | After Step 2 |
| B3 — `drawnBodyWidthPx` plane N=40 | 28.5px | After Step 2 |
| C — `drawnBodyLengthPx` dragon N=40 | ≈30.6px | After Step 3 |
| D — `sameLaneHH` dragon N=40, Space Sprint | 0.190 (was ≈0.076) | After Step 4 |
| E — BLOCKED-mode `dY` at physicalY=1, tw=300 | 150px (was 300px) | After Step 4 |
| F — Stage D `clearanceSpan` dragon N=40 | 0.190 (unchanged, via helper) | After Step 4 |
| G — sim output: width=300 AND drawnBodyWidthPx=28.5 simultaneously | ✓ | After Step 5 |
| H — tests green | 2629/2629 | After Step 6 |

---

## What is NOT a helper site (locked exemptions)

| Site | Formula | Status |
|---|---|---|
| raceBehavior.js:515 | `lateralHalfSpan = frameSizePx / trackWidth` | EXEMPT — frame-proximity scan, not clearance; comment added |
| sim-fairness.mjs:967 | `dY_px = Math.abs(Δy) × geometricTrackWidth / 2` | ALREADY CORRECT — comment only |
| Stage D after fix | `clearanceSpan = pxToPhysicalY(drawnBodyWidthPx, tw)` | ROUTED through helper |
| BLOCKED-mode after fix | `× (trackWidth / 2)` via physicalYToPx | ROUTED through helper |

No other raw `physicalY × trackWidth` sites remain in the codebase. Re-grep confirmed.
