# Body-Based Sprite Sizing — Implementation Report

**Branch:** `feat/closed-track-overview-normalization`  
**Date:** 2026-06-05  
**Status:** Complete — all 6 stages + Stage 0 plan delivered  

---

## Staged Fallback Tags

| Tag | Commit | Content |
|-----|--------|---------|
| `backup/pre-body-sizing` | `916291c` | Branch HEAD before any change |
| `backup/body-sizing-stage1` | `e964175` | Body-based core + floor cleanup |
| `backup/body-sizing-stage2` | `e964175` | Track decoupling (same commit — included in Stage 1) |
| `backup/body-sizing-stage3` | `4b0d896` | Honest minimum control tooltip |
| `backup/body-sizing-stage4` | `4b0d896` | OVERVIEW slider removed from Dev Screen |
| `backup/body-sizing-stage5` | `6c51c08` | Sleeping long-axis guard |
| `backup/body-sizing-stage6` | `c54c4e0` | Body-basis proofs and guard tests |

---

## What Changed Per File

### `client/src/modules/rowLayout.js` — new export

**Added:** `computeBodyNarrowRef(W_ref, nRacers, displaySize, bodyFillNarrow, config)`

```js
// Same staircase logic as computeRacerLayout but in BODY NARROW units.
// Returns { bodyNarrow } — the narrow body world-px for camera/render reference.
// All racers at the same N and W_ref that share the same row-count regime
// receive equal bodyNarrow.
```

`computeRacerLayout` is **unchanged** — still used for physical packing (rowGapPx, rowCount).

---

### `client/src/modules/racer-types/SpriteRacerType.js` — draw path + guard

**Added constant (exported):**
```js
export const BODY_LONG_AXIS_MAX_RATIO = 5.0;
```

**Changed `_drawBody` scale formula (L207, formerly 1 line → 9 lines):**
```js
// Before:
const scale = ((cfg.displaySize * displaySizeScale) / cfg.frameHeight) * cfg.silhouetteScale;

// After:
const bodyFillNarrow = Math.min(cfg.bodyFillX, cfg.bodyFillY);
const bodyFillLong   = Math.max(cfg.bodyFillX, cfg.bodyFillY);
const aspectRatio    = bodyFillLong / bodyFillNarrow;
// Sleeping long-axis guard (Stage 5): inert for all 20 current racers (max ratio 2.88:1)
const guardedFillNarrow = aspectRatio > BODY_LONG_AXIS_MAX_RATIO
  ? bodyFillNarrow * (aspectRatio / BODY_LONG_AXIS_MAX_RATIO)
  : bodyFillNarrow;
const scale = ((cfg.displaySize * displaySizeScale) / cfg.frameHeight / guardedFillNarrow) * cfg.silhouetteScale;
```

**Effect:** `displaySize × displaySizeScale` now = narrow body world-px. Frame is sized to `bodyNarrow / bodyFillNarrow` so the visible narrow body equals the input value. Previously it sized the FRAME to `displaySize × displaySizeScale`, leaving body size racer-type-dependent.

---

### `client/src/screens/RaceScreen/index.jsx` — split displaySizeScale

**Imports:**
- Removed `FALLBACK_REFERENCE_SPRITE_SIZE` from CameraDirector import
- Added `computeBodyNarrowRef` to rowLayout import

**Computation block (formerly L406–429, now larger):**
```js
const bodyFillNarrow = Math.min(racerType.config.bodyFillX, racerType.config.bodyFillY);
// ...
// Physical (frame-based, real width) — drives rowGapPx and rowCount — PHYSICS
const racerLayout = computeRacerLayout(effectiveWidth, nRacers, displaySize, autoScaleConfig);
let displaySizeScale_physical = racerLayout.spriteSize / displaySize;
// Render/camera (body-narrow-based, fixed W_REF=285) — drives camera and draw
const W_REF = 285;
const bodyRef = computeBodyNarrowRef(W_REF, nRacers, displaySize, bodyFillNarrow, autoScaleConfig);
let displaySizeScale = bodyRef.bodyNarrow / displaySize;
// referenceSpriteSize is now body-narrow world-px
const referenceSpriteSize = displaySize * displaySizeScale;
```

**Physics preservation (L478–487):**
```js
const physicalSpriteSize = displaySize * displaySizeScale_physical; // UNCHANGED from before
const rowGapPx = physicalSpriteSize * rowConfig.rowGapMultiplier;
const rowCount = Math.ceil(nRacers / Math.max(1, Math.floor((2 * effectiveWidth) / Math.max(1, physicalSpriteSize))));
```

**Render floor (formerly L1268–1283, now 2 lines):**
```js
// Removed: isOverviewOpen branch, OVERVIEW.spriteScale×36 coupling, FALLBACK_REFERENCE_SPRITE_SIZE
// Single honest body-narrow floor for all states:
const minFloorPx = cameraConfigRef.current.overviewTargetScreenPx ?? 28;
```

---

### `client/src/modules/storage/defaults.js`

```js
// Before:
overviewTargetScreenPx: 18, // target sprite screen size (px) for normalized OVERVIEW zoom ...

// After:
overviewTargetScreenPx: 28, // minimum visible narrow-body screen size (px) for OVERVIEW (and floor for all phases)
```

18 → 28: with body-narrow `referenceSpriteSize`, the formula fires for closed tracks (Dirt Oval bsX=0.833): `28 / (28.5 × 0.833) = 1.178 > 1.0`. At 18 it would be `18 / 23.75 = 0.758 < 1.0` (floor-clamped, formula inert).

---

### `client/src/screens/DevScreen/sections/CameraZoomTuningSection.jsx`

**Stage 3:** Renamed slider label to "Minimum visible body size (px)" with honest tooltip describing body-narrow units, applies to all states.

**Stage 4:**
- Removed `'OVERVIEW'` from `CAM_STATES`. OVERVIEW zoom is set by the renamed slider above; the `spriteScale` field for OVERVIEW was vestigial and had no effect on OVERVIEW sprite size.
- Updated `spriteScale` tooltip for LEADER/BATTLE/COMEBACK to "Body size multiplier (×)" — makes clear it multiplies body width, not frame size.

---

## What Was REMOVED (confirmed inert before removal)

| Item | Location | Why removed | Confirmed inert how |
|------|----------|-------------|-------------------|
| `isOverviewOpen` branch | RaceScreen:1268–1272 | The branch applied a 36px FRAME floor for non-open-OVERVIEW states and a different floor for open OVERVIEW. Replaced by single honest body-narrow floor. | Tests pass; isOverviewOpen was a bug (excluded closed-track OVERVIEW from normalization) |
| `OVERVIEW.spriteScale × FALLBACK_REFERENCE_SPRITE_SIZE` floor | RaceScreen:1271–1272 | Hidden coupling where OVERVIEW slider set render floor for LEADER/BATTLE/COMEBACK | All 2579 tests pass |
| `FALLBACK_REFERENCE_SPRITE_SIZE` import in RaceScreen | RaceScreen:39 | Unused after floor removal | ESLint clean |
| OVERVIEW `spriteScale` block in Dev Screen | CameraZoomTuningSection:CAM_STATES | OVERVIEW zoom is set by `overviewTargetScreenPx`; the spriteScale slider had no effect on OVERVIEW sprite size in the old or new system | 5 tests updated to assert OVERVIEW block is absent |

---

## Giraffe vs. Duck: Before / After

At N=20, W_REF=285, both in 1-row uncapped regime:

| Racer | System | bodyNarrow world-px | Frame world-px | Visible narrow (screen at effZoom=1) |
|-------|--------|---------------------|----------------|--------------------------------------|
| Giraffe (bFN=0.271, ds=48) | **Before** | 0.271 × 57 = 15.4 | 57 | 15.4 × effZoom |
| Giraffe (bFN=0.271, ds=48) | **After** | 28.5 | 28.5/0.271=105 | 28.5 × effZoom |
| Duck (bFN=0.875, ds=36) | **Before** | 0.875 × 28.5 = 24.9 | 28.5 | 24.9 × effZoom |
| Duck (bFN=0.875, ds=36) | **After** | 28.5 | 28.5/0.875=32.6 | 28.5 × effZoom |

After: both show **28.5 px** visible narrow body at effZoom=1. Frames differ (giraffe=105px, duck=32.6px) — transparent margin has no visual effect.

---

## Per-Track Equal-Size Proof

`computeBodyNarrowRef(W_REF=285, N=20, ...)` is called with a FIXED `W_REF` regardless of the actual track. Results:

| Track | Type | ds | bFN | bodyNarrow (after) |
|-------|------|----|-----|-------------------|
| Dirt Oval | horse | 47 | 0.353 | 28.5 |
| Garden Path | snail | 35 | 0.727 | 28.5 |
| Searound | manta | 56 | 0.633 | 28.5 |
| River Run | duck | 36 | 0.875 | 28.5 |
| Space Sprint | rocket | 47 | 0.278 | 28.5 |

All tracks: **28.5 px body narrow** at N=20. Track width has zero effect on the camera/render reference.

_Note: all racers happen to share the same packing regime at N=20 with W_REF=285. At N values near staircase transitions, slim racers (small bodyFillNarrow) may be in a different regime than wide racers, giving different bodyNarrow values — this is correct design (slim racers pack more per row)._

---

## Count Curve Shape Preserved

Rocket (ds=47, bFN=0.278) at Space Sprint W_REF=285:

| N | bodyNarrow (after) | capped? | Note |
|---|-------------------|---------|------|
| 1–4 | 32.7 px | YES (maxBodyNarrow) | maxBodyNarrow = 47×0.278×2.5 = 32.7 |
| 20 | 28.5 px | no | 2×285/20 |
| 40 | 14.25 px | no | 2×285/40 (1 row of 40; slim racer packs more) |
| 80 | 8.45 px | YES (minBodyNarrow) | asymptote at 47×0.278×0.65 = 8.45 |

Shape: staircase with inverse-within-band, upward-jump at transitions. Cap at low N (maxBodyNarrow), asymptote at high N (minBodyNarrow).

---

## Sleeping Guard Threshold and Inert Proof

`BODY_LONG_AXIS_MAX_RATIO = 5.0` — exported from `SpriteRacerType.js`.

Current 20 racers: max aspect ratio = **2.88:1** (rocket: bFY/bFX = 0.801/0.278). All are below 5.0.

The guard in `_drawBody`: if `bodyFillLong / bodyFillNarrow > 5.0`, the effective divisor is scaled by `(aspectRatio / 5.0)`, capping the long axis at `5.0 × bodyNarrow`. For current racers: `2.88 < 5.0` → `guardedFillNarrow = bodyFillNarrow` (unchanged). **Guard is inert for all 20 current racers.**

Test: `BODY_LONG_AXIS_MAX_RATIO — sleeping guard is inert for all 20 current racers` verifies this explicitly.

---

## OVERVIEW Slider Decision

**REMOVED** from the Dev Screen `CAM_STATES` list. Rationale:
- OVERVIEW zoom is set by `overviewTargetScreenPx` (now called "Minimum visible body size"). This is the honest control — it directly expresses the narrow body size on screen.
- The `spriteScale` field for OVERVIEW was vestigial in both old and new systems: in the old system, the OVERVIEW normalization formula overrode it (per report 03); in the new system, OVERVIEW size is entirely determined by `overviewTargetScreenPx`.
- Keeping a slider that has no effect is actively harmful (users waste time tuning it).
- The `OVERVIEW.spriteScale` field remains in the config schema for migration compatibility but is no longer surfaced in the UI.

---

## vitest Results

| Stage | Tests passed | Total |
|-------|-------------|-------|
| Pre-rebuild baseline | 2568 | 2568 |
| After Stage 1+2 | 2568 | 2568 |
| After Stages 3+4 | 2568 | 2568 |
| After Stage 5 | 2568 | 2568 |
| After Stage 6 (+11 new) | **2579** | **2579** |

All 121 test files pass at every stage.

---

## Determinism Fingerprint

Baseline and post-Stage 6 fingerprint for Dirt Oval + Space Sprint (seed=42, dur=30s, 10 races):

| Track | Type | finishT | rows | Status |
|-------|------|---------|------|--------|
| Dirt Oval | horse | 2.094 | 7 | ✅ identical |
| Dirt Oval | giraffe | 1.885 | 8 | ✅ identical |
| Dirt Oval | dragon | 2.304 | 8 | ✅ identical |
| Dirt Oval | duck (closed) | 0.255 | 2 | ✅ identical |
| Dirt Oval | rocket (closed) | 0.375 | 2 | ✅ identical |
| Space Sprint | dragon | 0.218 | 2 | ✅ identical |
| Space Sprint | horse | 2.712 | 7 | ✅ identical |

**All finishT and rows values byte-identical to baseline.** Physics is unaffected: `rowGapPx` and `rowCount` continue to use `displaySizeScale_physical` (frame-based, real track width).

---

## Browser-Check Checklist

The browser check covers: multiple tracks (small and large world), multiple field sizes, multiple camera phases. For each item, note whether racer sprites appear consistently sized cross-track across different racer types.

### OVERVIEW — all tracks at N=20

- [ ] **Dirt Oval (closed, bsX=0.833):** OVERVIEW formula fires (`snapZoom = 28/23.75 = 1.178 > 1.0`). Sprites should appear at approximately 28px visible cross-track body.
- [ ] **Garden Path (closed, bsX=0.833, snail):** Same OVERVIEW size as Dirt Oval.
- [ ] **Searound (closed, bsX=0.417, manta):** Same OVERVIEW size as other closed tracks. Full loop does not fit at this zoom — acceptable per spec.
- [ ] **Space Sprint (open, large world):** OVERVIEW formula floor-clamped (raw < overviewZoom). Camera shows full-track view. Sprites are tiny — expected for large open track at N=20.
- [ ] **River Run (open):** Same as Space Sprint.

### Racer-type consistency (same track, same N, different type)

Load Dirt Oval or Space Sprint with N=20. Compare visually:
- [ ] **Giraffe vs. duck** on the same track: both should appear approximately the same cross-track width in OVERVIEW (28.5px body narrow). Giraffe sprite frame is taller (105px) but the cross-track body width is equal to duck (32.6px frame but 28.5px body).
- [ ] **Rocket vs. dragon:** Rocket is much slimmer than dragon (bFN=0.278 vs 0.836). At N=20 both should show 28.5px cross-track body. Rocket frame will be larger (105px) but body width equal.

### Field sizes — OVERVIEW proportions

At Space Sprint (open, large world):
- [ ] **N=4:** Sprites large (maxBodyNarrow capped at ~32.7px). Camera may be close-in.
- [ ] **N=20:** Standard view.
- [ ] **N=80:** Sprites small (near minBodyNarrow=8.45px). Camera wide-angle.
- Check the staircase: going from N=18 to N=19 should produce a noticeable size jump.

### LEADER, BATTLE, COMEBACK phases

- [ ] **LEADER at N=20:** Body narrow ≈ 28.5 × 1.81 = 51.6px cross-track. At LEADER zoom the camera is close, so sprites appear large — noticeably larger than before the rebuild (rocket was 28.7px narrow before, now 51.6px). This is the intended change.
- [ ] **BATTLE at N=20:** Body narrow ≈ 28.5 × 2.81 = 80.1px. Very close camera. Check that battle cluster fits in view.
- [ ] **COMEBACK at N=20:** Body narrow ≈ 28.5 × 1.39 = 39.6px.

### Dev Screen controls

- [ ] **"Minimum visible body size" slider** (renamed): changing value affects OVERVIEW zoom. Smaller = camera more zoomed out, sprites smaller. Larger = camera closer, sprites larger.
- [ ] **OVERVIEW profile block is absent** from the Camera Behavior accordion. Only Leader Zoom, Battle Zoom, Comeback Zoom appear.
- [ ] **Leader/Battle/Comeback "Body size multiplier" sliders:** changing LEADER from 1.81 to 2.5 makes LEADER sprites visibly larger. Label update correctly shows "×" multiplier.

### Regression checks

- [ ] **Name tags and trail particles** remain correctly scaled (they use `1/frameEffZoom` for screen-space fixed size — unaffected by sizing changes).
- [ ] **Minimap** unchanged.
- [ ] **Track lights** unchanged.
- [ ] **Countdown phase** (camera zooms from start to OVERVIEW): still works on both open and closed tracks.
- [ ] **FINISH_OVERVIEW** smooth zoom-out: works on closed tracks.
- [ ] **Lead-change / Comeback diagnostics HUD:** text overlays present when enabled in Dev Screen.
