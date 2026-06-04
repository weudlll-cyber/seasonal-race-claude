# Body-Based Sprite Sizing — Rebuild Plan (Stage 0)

**Branch:** `feat/closed-track-overview-normalization`  
**Date:** 2026-06-05  
**Mode:** STAGE 0 — map before cutting. No code changed yet.  
**Backup tag:** `backup/pre-body-sizing`

---

## Go / No-Go Assessment

The change is **large but manageable and contained**. Not a STOP.

**Critical risk mitigated:** `rowGapPx = displaySize × displaySizeScale × rowGapMultiplier` (RaceScreen:470) flows into `computeSpeedBonus` (physics). Changing `displaySizeScale` to body-based would change `rowGapPx` and therefore the speed bonus for rear start-rows → determinism fingerprint would shift. **Mitigation:** introduce `displaySizeScale_physical` (from `computeRacerLayout(W_real)`, unchanged) for physics, and `displaySizeScale_body` (body-based, W_ref) for render/camera. Both derived and used separately. Physics is byte-identical.

**Other risks:** slim racers (giraffe, rocket) get larger frames at body-based sizing (same body width, larger transparent margin). Wide racers (duck, dragon) get smaller frames. At equal N, all have equal narrow body. This is the intended visual change.

---

## Complete Map of Sizing Sites

### A. Draw path — what gets sized

**`SpriteRacerType._drawBody` (`SpriteRacerType.js:207–213`)**  
- **Today:** `scale = (displaySize × displaySizeScale / frameHeight) × silhouetteScale`. Sizes the FRAME to `displaySize × displaySizeScale`. Body content is `bodyFillX × dh` cross-track, `bodyFillY × dh` along-track — varies by racer type at same `displaySizeScale`.  
- **Fate:** **REWRITE** — divide scale by `min(bodyFillX, bodyFillY)` so `displaySize × displaySizeScale` = narrow body world-px, and the frame auto-sizes to contain it. One-line change: `scale = (displaySize × displaySizeScale / frameHeight / Math.min(cfg.bodyFillX, cfg.bodyFillY)) * cfg.silhouetteScale`.

---

### B. Packing / reference computation — what feeds `displaySizeScale`

**`computeRacerLayout` (`rowLayout.js:137–169`)**  
- **Today:** `computeRacerLayout(W_real, N, displaySize, config)` returns `spriteSize` in FRAME units. Called from RaceScreen:420 for BOTH the physical layout (row gap, start positions) AND the render reference.  
- **Fate:** **KEEP AS-IS for physical layout**. A NEW function `computeBodyNarrowRef` is added (same file) for the camera/render reference.

**NEW: `computeBodyNarrowRef(W_ref, N, displaySize, bodyFillNarrow, config)` (`rowLayout.js` — new export)**  
- Uses `bodyFillNarrow × displaySize` as the effective slot size instead of `displaySize`.  
- Packs by NARROW BODY (not frame) → giraffe and rocket get the same `bodyNarrow` as duck at same N, W_ref.  
- Returns `{ bodyNarrow }` = the body narrow world-px that feeds `displaySizeScale_body = bodyNarrow / displaySize`.

**`RaceScreen/index.jsx:406–429` — `displaySizeScale` computation**  
- **Today:** One `racerLayout = computeRacerLayout(effectiveWidth, N, ds, autoScaleConfig)`. `displaySizeScale = racerLayout.spriteSize / ds`. One value serves both physics and render.  
- **Fate:** **SPLIT into two variables:**
  - `displaySizeScale_physical = racerLayout.spriteSize / displaySize` — physical packing (row gap, row count). Unchanged from today.
  - `bodyRef = computeBodyNarrowRef(W_REF, N, displaySize, bodyFillNarrow, autoScaleConfig)`, then `displaySizeScale_body = bodyRef.bodyNarrow / displaySize` — render + camera.
  - `referenceSpriteSize = displaySize × displaySizeScale_body = bodyNarrow_world` (body narrow in world-px). Passed to CameraDirector unchanged.

**Fixed reference width constant:** `W_REF = 285` (world-px effective width — matches open tracks at trackW=300 × startSpreadRange=0.95). Defined as a constant in RaceScreen.

---

### C. Row gap / row count — physics critical

**`RaceScreen/index.jsx:469–476` — `rowGapPx` and `rowCount`**  
```js
const spriteSize = displaySize * displaySizeScale;        // line 469
const rowGapPx = spriteSize * rowConfig.rowGapMultiplier; // line 470 — PHYSICS
const rowCount = ... floor(2 * effectiveWidth / spriteSize); // line 474-476 — PHYSICS
```  
- **Today:** Uses single `displaySizeScale`.  
- **Fate:** **KEEP USING `displaySizeScale_physical`** (frame-based, real width). Physics unchanged. Rename `spriteSize` → `physicalSpriteSize` for clarity.

---

### D. Render floor — where the minimum lives

**`RaceScreen/index.jsx:1268–1282` — `isOverviewOpen` / `minFloorPx` / `computeRenderDisplayScale`**  
```js
const isOverviewOpen = isOpenTrack && camDirRef.current?.state === 'OVERVIEW'; // BUG
const minFloorPx = isOverviewOpen
    ? overviewTargetScreenPx           // 18px — body-adjacent
    : OVERVIEW.spriteScale × FALLBACK_REFERENCE_SPRITE_SIZE;  // 36px — frame floor, hidden coupling
```  
- **Today:** Two-branch logic. `isOverviewOpen=false` for closed tracks → wrong 36px floor. OVERVIEW.spriteScale silently sets the floor for all other states — hidden coupling.  
- **Fate:** **REMOVE ENTIRELY** — replace with:  
  ```js
  const minFloorPx = cameraConfigRef.current.overviewTargetScreenPx ?? 18;
  ```  
  Single honest value, applied to ALL states, measured in body-narrow screen-px (not frame-px). No `isOverviewOpen` branch. No `OVERVIEW.spriteScale × 36` coupling. The `FALLBACK_REFERENCE_SPRITE_SIZE` import is removed from RaceScreen.

**`computeRenderDisplayScale` (`autoSpriteScale.js:67–81`)** — NO CHANGE NEEDED.  
- `proportionalScreenPx = displaySize × displaySizeScale × frameEffZoom`. With new `displaySizeScale_body`, this = `bodyNarrow × frameEffZoom` = body narrow screen px. Arithmetic is invariant to the semantic change. Return value `targetPx / (displaySize × frameEffZoom)` → used as `frameDisplayScale` → in new `_drawBody`, `dh = displaySize × frameDisplayScale / bodyFillNarrow`. Body narrow on screen = target px ✓.

---

### E. Camera normalization

**`CameraDirector._transition()` OVERVIEW snap (`CameraDirector.js:1105–1120`)**  
- **Today:** `snapZoom = overviewTargetScreenPx / (referenceSpriteSize × divisor)`. With `referenceSpriteSize` = frame world-px, this targets frame px = `overviewTargetScreenPx`. Inert in browser because formula floor-clamps at cam.zoom=1.0 (referenceSpriteSize too large for the small target).  
- **Fate:** **NO FORMULA CHANGE** — formula is correct as-is. With new `referenceSpriteSize = bodyNarrow_world` (smaller), `raw = overviewTargetScreenPx / (bodyNarrow × divisor)` is now > 1.0 for closed tracks → formula becomes ACTIVE. The OVERVIEW normalization now actually fires for the first time in the browser.

**`CameraDirector._computeZoomLevels` (`CameraDirector.js:305–345`)**  
- **Today:** Converts per-state `spriteScale` → `cam.zoom`. `cam.zoom × divisor = spriteScale = frameEffZoom`. `propPx = referenceSpriteSize × spriteScale` = frame screen size.  
- **Fate:** **NO CHANGE** — same formula. With new `referenceSpriteSize = bodyNarrow_world`, `propPx = bodyNarrow × spriteScale` = body narrow screen size. The `spriteScale` values (LEADER=1.81, BATTLE=2.81, COMEBACK=1.39) now multiply the body narrow (not frame). Multiplier values KEPT per spec.

**`CameraDirector._computeZoomForSpriteScale` (`CameraDirector.js:280–291`)**  
- **Fate:** **NO CHANGE** — pure math, works the same.

---

### F. Config fields

**`defaults.js:347–348`**  
- `overviewClosedTrackZoom: 1.3` — already deprecated-in-place. **KEEP** (migration compat).  
- `overviewTargetScreenPx: 18` — promoted to the HONEST SINGLE MINIMUM. **KEEP VALUE**, update any tooltip that calls it "open tracks only."

**`defaults.js:207–267` — `cameraStateProfiles`**  
- `OVERVIEW.spriteScale: 1.0` — **REMOVE from Dev Screen** (Stage 4). Keep in schema for migration compat (or remove and migrate in Stage 4, assessed then). The value is vestigial under the new model — OVERVIEW zoom is set by `overviewTargetScreenPx`, not `spriteScale`.  
- `LEADER/BATTLE/COMEBACK/LEAD_CHANGE.spriteScale` — **KEPT**. Now multiply body narrow.

---

### G. Dev Screen controls

**`CameraZoomTuningSection.jsx` — `PROFILE_FIELDS[0]` (spriteScale slider)**  
- **Today:** Tooltip: "1.0 = natural size, 2.0 = twice as large. Racer-count-independent." — **WRONG for OVERVIEW** (slider has no effect). **PARTIALLY WRONG for LEADER/BATTLE/COMEBACK** (now body-narrow multiplier, not frame multiplier).  
- **Fate Stage 4:** Fix tooltip for LEADER/BATTLE/COMEBACK to: "Body multiplier for {state}. 1.0 = same visible narrow body as OVERVIEW. 2.0 = twice as wide cross-track." Remove OVERVIEW slider entirely (or relabel as read-only if removal is costly).

**`CameraZoomTuningSection.jsx:652–668` — `overviewTargetScreenPx` range slider**  
- **Today:** Tooltip: "Target sprite screen size during OVERVIEW on open tracks. The camera zoom is chosen so sprites appear at this size regardless of racer count."  
- **Fate Stage 3:** Update tooltip to: "Minimum visible-body narrow-axis size (screen px) in OVERVIEW — and the floor for all other phases. Size is racer-type-normalized: giraffe and duck appear equally wide at the same value. Range: 12–48 px."

---

## Size Computation Before / After (giraffe vs. duck, N=20, Space Sprint)

**Before (frame-based, W_real=285):**
| Racer | ds | bFX | spriteSize (frame) | dss | dh (frame) | body cross-track |
|-------|-----|-----|-------------------|-----|------------|----------------|
| giraffe | 48 | 0.271 | 57 | 1.188 | 57 px | 15.4 px |
| duck | 36 | 0.875 | 28.5 | 0.792 | 28.5 px | 24.9 px |
| rocket | 47 | 0.278 | 57 | 1.213 | 57 px | 15.8 px |

Note: duck and giraffe get DIFFERENT frame sizes; duck gets 2 rows, giraffe gets 2 rows for different reasons.

**After (body-based, W_ref=285, Stage 1+2 combined):**  
All racers at N=20, W_ref=285: `bodyNarrow_world = 28.5 px` for every racer type.
| Racer | ds | bFX | bodyNarrow | dss_body | dh (frame) | body cross-track |
|-------|-----|-----|-----------|----------|------------|----------------|
| giraffe | 48 | 0.271 | 28.5 | 0.594 | 105 px | **28.5 px** |
| duck | 36 | 0.875 | 28.5 | 0.792 | 32.6 px | **28.5 px** |
| rocket | 47 | 0.278 | 28.5 | 0.606 | 102.5 px | **28.5 px** |

Equal cross-track body ✓. Frames differ (giraffe frame is larger because it's slim; duck frame is smaller). Transparent frame margin has no visual effect.

---

## OVERVIEW normalization: before / after (Dirt Oval, N=20)

**Before:**
- `referenceSpriteSize = 35.3 px` (giraffe-like, frame)
- `raw = 18 / (35.3 × 0.833) = 0.613 < 1.0` → floor-clamped at cam.zoom=1.0
- Body narrow on screen = `0.271 × 35.3 × 0.833 = 7.97 px` (tiny)

**After:**
- `referenceSpriteSize = bodyNarrow = 28.5 × 0.271 = 7.72 px` (body narrow for giraffe)
  Wait — actually with W_ref=285: bodyNarrow=28.5px for ALL racers.
  For Dirt Oval (a closed track, bsX=0.833):
- `raw = 18 / (28.5 × 0.833) = 18/23.75 = 0.758 < 1.0` → still floor-clamped
  
Hmm. Even with body-based, the OVERVIEW formula may still floor-clamp for typical values. This is because `overviewTargetScreenPx=18` is less than `bodyNarrow × bsX = 28.5 × 0.833 = 23.75`. To fix this:
- Either raise `overviewTargetScreenPx` (e.g., to 28–32px)
- Or lower the cam.zoom floor (not safe — black bars on closed tracks)

The correct target: `overviewTargetScreenPx = min(bodyNarrow × bsX_min, desiredPx)`. For a 1536-wide track (bsX=0.833), a 28.5px body narrow at full-world zoom = 28.5×0.833 = 23.75px. If overviewTargetScreenPx=18 < 23.75, the formula always floor-clamps.

**Resolution:** Raise `overviewTargetScreenPx` default to 28px (matching the test value that proved the formula works). With `overviewTargetScreenPx=28`:
- For Dirt Oval: `raw = 28/23.75 = 1.178 > 1.0` → FORMULA FIRES ✓
- For Searound (bsX=0.417): `raw = 28/(28.5×0.417) = 28/11.9 = 2.35` → capped at MAX_INVERSE_ZOOM ✓
- For open track (Space Sprint, OPEN_BASE=1.5): `raw = 28/(28.5×1.5) = 28/42.75 = 0.655` → floored at overviewZoom=0.213 (full world)

This means updating `overviewTargetScreenPx` default from 18 to 28 in `defaults.js`. The `overviewTargetScreenPx` control range in the Dev Screen also needs updating (current min=16, max=48 — OK as-is).

---

## Stage Sequence and Contracts

### Stage 1 — Body-based size core
Files: `SpriteRacerType.js` (1 line), `rowLayout.js` (+1 function), `RaceScreen:406–429` (~10 lines), `RaceScreen:1268–1282` (~5 lines), `defaults.js:348` (update default value).
**Contract:** giraffe and duck at same N have equal body narrow cross-track px. `computeRenderDisplayScale` still works unchanged. `rowGapPx`/`rowCount` use `displaySizeScale_physical` — physics bit-identical.

### Stage 2 — Decouple track size
Files: `RaceScreen:406–429` (~3 lines — add `W_REF` constant, pass it to `computeBodyNarrowRef`).  
**Contract:** at fixed N, computed body narrow is equal across all 10 tracks. Count curve shape preserved (verify with N=4,10,19,37 on Space Sprint).

### Stage 3 — Honest minimum control
Files: `RaceScreen:1268–1272` (remove `isOverviewOpen` branch, remove 36px coupling), `CameraZoomTuningSection.jsx:652-668` (update tooltip).  
**Contract:** single `overviewTargetScreenPx` floor, applies to all states, body-narrow units. OVERVIEW.spriteScale no longer affects any floor. `FALLBACK_REFERENCE_SPRITE_SIZE` import removed from RaceScreen.

### Stage 4 — Per-phase multipliers, OVERVIEW slider
Files: `CameraZoomTuningSection.jsx:29-38` (remove/relabel OVERVIEW spriteScale slider, fix tooltips), `defaults.js:207` (decide migration fate of OVERVIEW.spriteScale).  
**Decision on OVERVIEW slider:** Remove from Dev Screen. OVERVIEW is now controlled by `overviewTargetScreenPx`. The `spriteScale` field for OVERVIEW stays in the schema for migration compat but is no longer surfaced in the UI. Tooltip for LEADER/BATTLE/COMEBACK: "Body width multiplier. 1.0 = OVERVIEW body width. 1.81 = 81% wider than OVERVIEW."

### Stage 5 — Long-axis guard
Files: `rowLayout.js` (add check inside `computeBodyNarrowRef`), `defaults.js` (new `bodyLongAxisMaxMultiplier: 5.0` field).  
**Contract:** max body long axis = `bodyNarrow × (max(bodyFillX, bodyFillY) / min(bodyFillX, bodyFillY)) × bodyLongAxisMaxMultiplier`. At bodyLongAxisMaxMultiplier=5.0, all 20 current racers are well below the threshold (max ratio=2.88). Guard is inert for all current racers.

### Stage 6 — Tests against real defaults
Files: `CameraDirector.test.js`, `rowLayout.test.js`, new test assertions in integration tests.  
**Added tests:**
- Giraffe vs. duck at same N → equal body narrow cross-track px.
- Space Sprint vs. Dirt Oval at same N → equal body narrow (track decoupling proof).
- Count curve N=4,10,20,40 on Space Sprint — spriteSize values match formula.
- OVERVIEW fires at default `overviewTargetScreenPx=28` (not inert like it was at 18).
- Minimum floor applies to all states uniformly.

---

## Removed Items (confirmed dead before removal)

| Item | Location | Current role | Removal condition |
|------|----------|-------------|-------------------|
| `isOverviewOpen` branch | RaceScreen:1268 | Selects floor: 18px (open OVERVIEW) vs 36px (else) | Remove: single body-narrow floor replaces both branches |
| `OVERVIEW.spriteScale × FALLBACK_REFERENCE_SPRITE_SIZE` floor | RaceScreen:1271 | Hidden floor coupling OVERVIEW slider → all states | Remove: coupling is a bug |
| `FALLBACK_REFERENCE_SPRITE_SIZE` import in RaceScreen | RaceScreen:39 | Used only for the hidden coupling | Remove after removing the coupling |
| OVERVIEW spriteScale Dev Screen slider | CameraZoomTuningSection:20 | Vestigial — no effect on OVERVIEW | Remove from `CAM_STATES` list |
| Old OVERVIEW snap (inert under current config) | CameraDirector:1105–1120 | Present but floor-clamped → never fires | Not removed — formula is NOW ACTIVE with body-based refSprite |

---

## Fingerprint Baseline

Before cutting: run fingerprint (dirt-oval + space-sprint, seed=42, dur=30) and save as baseline. Every stage must match this baseline exactly.

```
Command: cd client && node scripts/sim-fairness.mjs --seed=42 --dur=30 --races=1 <tracks>
```

The stage gate: vitest green AND fingerprint identical → tag `backup/body-sizing-stageN` → proceed.

No code changed in this document. Backup tag `backup/pre-body-sizing` already pushed.
