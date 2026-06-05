# OVERVIEW Closed-Track Sprite Size — Diagnosis Report

**Branch:** `feat/closed-track-overview-normalization`
**Date:** 2026-06-04
**Mode:** ANALYSIS ONLY — no code changed

---

## Verdict

**B — Sizes ARE equal across closed tracks after the fix (accidentally, via floor), but NOT equal to open tracks.**

The normalization formula itself is mathematically correct. The implementation is correct. However, two independent constraints interact to make the formula a no-op for typical game sessions, producing sprites at 36px on closed tracks vs. 18px on open tracks.

---

## Full Rendering Chain

### Symbols

| Symbol | Definition |
|--------|-----------|
| `displaySize` | Racer-type base sprite size (world px) |
| `displaySizeScale` (`dss`) | From `computeRacerLayout(effectiveWidth, N, displaySize)` — `spriteSize / displaySize` |
| `refSprite` | `displaySize × dss` = `spriteSize` from `computeRacerLayout` |
| `bsX` | `CANVAS_W / worldW` |
| `snapZoom` | cam.zoom snapped at OVERVIEW entry; `max(minZoom, overviewTargetScreenPx / (refSprite × divisor))` |
| `effZoom` | `snapZoom × divisor` (divisor = `bsX` closed, `OPEN_BASE=1.5` open) |
| `propPx` | Proportional screen size: `refSprite × effZoom` — what the formula intends |
| `renderFloor` | Min sprite screen size from `computeRenderDisplayScale`; depends on `isOverviewOpen` |
| `ACTUAL px` | `max(propPx, renderFloor)` — what is actually drawn |

Track widths from geometry (`geometricTrackWidthPx × startSpreadRange=0.95`):
- Dirt Oval: 93px, Garden Path: 100px, City Circuit: 95px, Ice Track: 110px, Searound: 131px
- River Run: ~300px, Space Sprint: ~300px

Default racer types: horse=47px, snail=35px, buggy=38px, manta=56px, duck=35px, rocket=32px

`overviewTargetScreenPx = 18` (from `defaults.js` stored config — active runtime value)
`renderFloor` for closed tracks in OVERVIEW = `OVERVIEW.spriteScale × 36 = 36px` (see §3)
`renderFloor` for open tracks in OVERVIEW = `overviewTargetScreenPx = 18px` (see §3)

---

### Per-Track Table — N=20 racers (most common, typical game)

| Track | Type | refSprite | snapZoom | Floored? | effZoom | propPx | renderFloor | **ACTUAL px** |
|-------|------|-----------|----------|----------|---------|--------|-------------|--------------|
| Dirt Oval | closed | 35.3 | 1.000 | **YES** (cam floor) | 0.833 | 29.4 | 36 | **36.0** |
| Garden Path | closed | 27.1 | 1.000 | **YES** | 0.833 | 22.6 | 36 | **36.0** |
| City Circuit | closed | 25.8 | 1.000 | **YES** | 0.833 | 21.5 | 36 | **36.0** |
| Ice Track | closed | 41.8 | 1.000 | **YES** | 0.833 | 34.8 | 36 | **36.0** |
| Searound | closed | 49.8 | 1.000 | **YES** | 0.417 | 20.7 | 36 | **36.0** |
| River Run | open | 28.5 | 0.421 | no | 0.632 | 18.0 | 18 | **18.0** |
| Space Sprint | open | 28.5 | 0.421 | no | 0.632 | 18.0 | 18 | **18.0** |

`snapZoom` formula (before floor): `18 / (refSprite × bsX)` for closed, `18 / (refSprite × 1.5)` for open.

### Per-Track Table — N=8 racers (fewer racers → larger sprites)

| Track | Type | refSprite | snapZoom | Floored? | effZoom | propPx | renderFloor | **ACTUAL px** |
|-------|------|-----------|----------|----------|---------|--------|-------------|--------------|
| Dirt Oval | closed | 44.2 | 1.000 | **YES** | 0.833 | 36.8 | 36 | **36.8** |
| Garden Path | closed | 23.8 | 1.000 | **YES** | 0.833 | 19.8 | 36 | **36.0** |
| City Circuit | closed | 45.1 | 1.000 | **YES** | 0.833 | 37.6 | 36 | **37.6** |
| Ice Track | closed | 52.3 | 1.000 | **YES** | 0.833 | 43.5 | 36 | **43.5** |
| Searound | closed | 62.2 | 1.000 | **YES** | 0.417 | 25.9 | 36 | **36.0** |
| River Run | open | 71.3 | 0.208 | **YES** (ov.floor) | 0.313 | 22.3 | 18 | **22.3** |
| Space Sprint | open | 71.3 | 0.213 | **YES** | 0.320 | 22.8 | 18 | **22.8** |

At N=8, Dirt Oval/City Circuit/Ice Track break past the 36px render floor → sizes vary (36.8, 37.6, 43.5px). Garden Path and Searound stay floor-clamped at 36px. **Not equal even among closed tracks at N=8.**

---

## What the Browser User Sees

### Closed tracks vs. open tracks

| State | OVERVIEW sprite size |
|-------|---------------------|
| All closed tracks (N=20) | **36 px** |
| Open tracks (N=20) | **18 px** |

Closed tracks appear **2× larger** than open tracks in OVERVIEW. This explains "too large."

### Garden Path vs. Searound at N=20

Both render at 36px sprites. The pixel sizes are equal. However, the camera zoom levels differ:
- Garden Path + all 1536-wide tracks: `effZoom = 0.833` — viewport shows 1536px of world
- Searound (3072-wide): `effZoom = 0.417` — viewport shows 3072px of world (twice as wide)

At the SAME 36px sprite size, the **background and track shape scale differently**. On Searound's wider viewport, the track curves appear smaller relative to the sprites — the loop looks distant/small while sprites look large. On 1536-wide tracks, the corridor fills more of the frame. This produces the "different in proportion" appearance even though sprite pixels are equal.

**Before the fix** (with `effZoom = 1.3` for all closed tracks): sprite sizes were entirely different:
- Garden Path N=20: 36px (floor-clamped: `27.1 × 1.3 = 35.2 < 36`)
- Searound N=20: 64.7px (above floor: `49.8 × 1.3 = 64.7 > 36`)
The old 1.3 multiplier made Searound show nearly double the sprite size of Garden Path. That was the old "different in proportion."

After the fix, they're equal (36px) but both oversized vs. open tracks.

---

## Two-Layer Root Cause

### Layer 1 (render floor bug) — `RaceScreen/index.jsx:1268`

```js
// Current — WRONG for this use case:
const isOverviewOpen = isOpenTrack && camDirRef.current?.state === 'OVERVIEW';
const minFloorPx = isOverviewOpen
    ? (cameraConfigRef.current.overviewTargetScreenPx ?? 28)  // 18px from config
    : (cameraConfigRef.current.cameraStateProfiles?.OVERVIEW?.spriteScale ?? 1.0) *
      FALLBACK_REFERENCE_SPRITE_SIZE;                          // 1.0 × 36 = 36px
```

`isOverviewOpen = false` for closed tracks (because `isOpenTrack = false`). Closed-track OVERVIEW therefore uses the "other states" floor of `36px` instead of `overviewTargetScreenPx = 18px`.

**Effect:** The camera targets 18px. The render pipeline overrides to 36px. For all closed tracks at N=20 where `propPx < 36`, sprites are floored to 36px — the camera normalization is fully overridden.

**Fix (one line):** Remove `isOpenTrack &&`:
```js
const isOverviewOpen = camDirRef.current?.state === 'OVERVIEW';
```

### Layer 2 (camera floor dominates) — `CameraDirector._transition()`

Even after fixing Layer 1, the sprite sizes on closed tracks are NOT equal. The normalization formula:

```
snapZoom = overviewTargetScreenPx / (refSprite × bsX)
         = 18 / (refSprite × bsX)
```

For the formula to be active (not floor-clamped), `snapZoom > 1.0`. This requires:
```
overviewTargetScreenPx > refSprite × bsX
```

At N=20, `refSprite × bsX` (= the proportional sprite size at full-world zoom) is:
- Dirt Oval: 29.4px
- Garden Path: 22.6px
- City Circuit: 21.5px
- Ice Track: 34.8px
- Searound: 20.7px

**`overviewTargetScreenPx = 18` is below ALL of these.** The formula is always floor-clamped at `snapZoom = 1.0` (cam floor = 1.0 to prevent black bars). With `cam.zoom = 1.0`, `effZoom = bsX` and `propPx = refSprite × bsX` — which varies per track (20.7–34.8px at N=20). After fixing Layer 1, sprites would render at these varying sizes, still unequal.

**Why the camera floor is 1.0 and can't change:** For closed tracks, `effZoom = cam.zoom × bsX`. When `cam.zoom < 1.0`, `effZoom < bsX = CANVAS_W/worldW` — the world is smaller than the canvas, producing black borders. `_setClosedTrackTargets` enforces `minEffZoom = bsX`, which maps to `cam.zoom ≥ 1.0`. This constraint is load-bearing and must not be removed.

---

## Unit Test vs. Render Gap

The test in `describe('CameraDirector — normalized OVERVIEW zoom on closed tracks', ...)`:

```js
// Test uses refSprite=30.6 and overviewTargetScreenPx=28
const cd1536 = new CameraDirector(1536, 1024, false, cfg, 30.6);  // refSprite=30.6
// ...
const effZoom1536 = cd1536._overviewSnapZoom * (1280 / 1536);
expect(effZoom1536).toBeCloseTo(28 / refSprite, 2); // 28/30.6 = 0.915
```

For `snapZoom = 28/(30.6 × 0.833) = 1.099 > 1.0` → **NOT floored**. Formula is active. Test passes and is correct at the camera level.

**Two divergences from the actual browser:**

| | Unit test | Browser (N=20) |
|--|-----------|----------------|
| `overviewTargetScreenPx` | 28 (set explicitly in `cfg`) | **18** (from `defaults.js` stored config) |
| `refSprite` on 1536-wide | **30.6 px** (hypothetical) | **35–42 px** (from `computeRacerLayout`) |

With `targetPx=28` and `refSprite=30.6`: `snapZoom = 28/(30.6 × 0.833) = 1.099 > 1.0` → formula active ✓

With `targetPx=18` and `refSprite=35.3` (Dirt Oval N=20): `snapZoom = 18/(35.3 × 0.833) = 0.613 < 1.0` → floored ✗

The test validates a configuration that doesn't occur in the browser: `overviewTargetScreenPx=28` is never the active value (stored config says 18), and `refSprite=30.6` is only achievable with specific racer type + track combinations at low-to-mid racer counts. The test proves the formula is correct when the input is in the right range; it doesn't expose the floor-clamping that occurs with default settings.

---

## Summary: Why the Report Claim Was Wrong

`01-implementation.md` claimed: "All 5 closed tracks now converge to the same effZoom ≈ 28/referenceSpriteSize ≈ 0.916 at 40 racers." This was mathematically correct for the unit test's `refSprite=30.6` at `overviewTargetScreenPx=28`. But in the browser:
- `overviewTargetScreenPx = 18` (not 28)
- `refSprite` at 20 racers: 25-50px (not 30.6)
- All `snapZoom < 1.0` → all floor-clamped → formula never fires

The normalization is implemented correctly but is inert under default settings.

---

## Proposed Fix (two edits, not one)

Fixing only Layer 1 (render floor) leaves sizes unequal (propPx varies 20–35px). Fixing only Layer 2 (camera target) without fixing Layer 1 leaves the 36px render override in place. Both must change together.

**Edit A — `RaceScreen/index.jsx:1268`:**
```js
// Before:
const isOverviewOpen = isOpenTrack && camDirRef.current?.state === 'OVERVIEW';
// After:
const isOverviewOpen = camDirRef.current?.state === 'OVERVIEW';
```

This applies the `overviewTargetScreenPx` render floor to closed-track OVERVIEW (instead of 36px).

**Edit B — `client/src/modules/storage/defaults.js:348`:**
```js
// Before:
overviewTargetScreenPx: 18,
// After:
overviewTargetScreenPx: 36,
```

With `overviewTargetScreenPx = 36`:
- `snapZoom = 36 / (refSprite × bsX)`. At N=20, max `refSprite × bsX` = 34.8px (Ice Track). `36 / 34.8 = 1.034 > 1.0` ✓
- Formula is active for all 5 closed tracks at N≤20 (and for most N≤40 configurations)
- Sprites render at exactly 36px on all closed tracks ✓
- Render floor (after Edit A) = 36px = formula target → match ✓

**Effect on open tracks:** `overviewTargetScreenPx` also governs open-track OVERVIEW floor (via `isOverviewOpen = true`). Changing from 18→36 makes open-track OVERVIEW sprites go from 18px → 36px. This is a visual change for open tracks and must be reviewed.

**Alternatives if open-track OVERVIEW size must stay at 18px:**
- Introduce a separate `overviewClosedTargetScreenPx: 36` (new schema field) — a conceptually different parameter (a floor target, not a static zoom multiplier), which the spec intended to retire
- Accept that equal sizing between open and closed is not achievable at the current `overviewTargetScreenPx=18` — use a "good enough" approach where closed tracks use the full-world view (cam.zoom=1.0) at their natural sprite size

---

## Decision Needed

Before implementing, user should decide:

1. **Should open-track OVERVIEW also move to 36px sprites?** (Edit A + Edit B together)
   → Uniform size across all tracks; visual change to open-track OVERVIEW
2. **Keep open at 18px, accept variable closed-track sizes around 20–35px?** (Edit A only)
   → Render floor bug fixed; sizes not equal but no longer 36px; close to open-track range
3. **Keep open at 18px, introduce a separate closed-track floor target?** (Edit A + new field)
   → Full control; adds back a per-track-type parameter (against spec's spirit, but different semantics)

No code changes in this run. Branch pushed.
