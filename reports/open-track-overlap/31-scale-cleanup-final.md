# Report 31 — Scale Cleanup: Consolidated Plan

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-07
**Status:** Analysis complete. All four Copilot gaps verified. Body-length question resolved.
**Prerequisite:** Review and confirm this plan before any code changes.

---

## 0. physicalY mapping — pin this once

From [EditorShape.js:123–124](../../client/src/modules/track-editor/EditorShape.js#L123) and the caller at [index.jsx:711](../../client/src/screens/RaceScreen/index.jsx#L711):

```
lateral displacement (world px) = (physicalY / 2) × _centerWidth
1 physicalY unit = _centerWidth / 2 = trackWidth / 2  world pixels
```

`physicalY = ±1` is the outer edge. For two racers with Δy physicalY difference:
```
gap_px = Δy × (trackWidth / 2)
```

Inverse (px → physicalY): `pxToPhysicalY(px) = px / (trackWidth / 2)`
Forward (physicalY → px): `physicalYToPx(phy) = phy × (trackWidth / 2)`

**These two helpers, defined in exactly one place in raceBehavior.js, route ALL lateral conversions. The factor-of-2 lives in them, nowhere else.**

---

## 1. Gap 1 — BLOCKED-mode factor-of-2 (CRITICAL — CONFIRMED)

**Copilot claim:** `_computeBlockedMode` converts physicalY using `trackWidth`, not `trackWidth/2`.

**Verified.** [raceBehavior.js:206–254](../../client/src/modules/raceBehavior.js#L206):

```javascript
// Line 207
const trackWidth = getTrackWidthPx(r);
// Line 214
const spriteSize = getSpriteWorldSizePx(r);

// BUG — line 221: multiplies by trackWidth, should be trackWidth/2
if (Math.abs(r.physicalY) * trackWidth < spriteSize)  // 2× too large

// Comment says "pixel space" but formula is wrong — line 236–239
const dx = dT * pathLength;               // ← correct: pathLength converts t to px
const dy = other.physicalY * trackWidth;  // ← WRONG: should be other.physicalY * (trackWidth/2)
const dist = Math.sqrt(dx * dx + dy * dy);

// Diagnostic field — line 246: same bug
dY: Math.round((other.physicalY - r.physicalY) * trackWidth),  // should be *(trackWidth/2)
```

**Impact:** The pixel-space distance `dist` is computed with `dy` 2× too large. At physicalY=1 and trackWidth=300, `dy` = 300px (actual value: 150px). This inflates `dist` and prevents BLOCKED-mode from triggering in cases where it should, since `dist < spriteSize` is harder to satisfy. The center guard (line 221) also under-triggers.

**Fix:** Route all three sites through `physicalYToPx`:
- Line 221: `Math.abs(r.physicalY) * (trackWidth / 2) < spriteSize`
- Line 238: `const dy = other.physicalY * (trackWidth / 2)`
- Line 246: `dY: Math.round((other.physicalY - r.physicalY) * (trackWidth / 2))`

**Checkpoint:** At physicalY=1, trackWidth=300 (Space Sprint after Step 1): dy should be 150px, not 300px.

**Note:** The sim-fairness.mjs overlap metric ([line 967](../../scripts/sim-fairness.mjs#L967)) already uses `/2` correctly:
```javascript
const dY_px = Math.abs(ra.physicalY - rb.physicalY) * geometricTrackWidth / 2;  // CORRECT
```
No sim fix needed for this calculation (only the track-width source fix at line 2145 applies there).

---

## 2. Gap 2 — trackWidthPx and visibleWidthPx are NOT globally dead (HIGH — CONFIRMED)

### 2A. diag-free-lane-force-attribution.mjs

[scripts/diag-free-lane-force-attribution.mjs:57–58](../../scripts/diag-free-lane-force-attribution.mjs#L57) and [:122–126](../../scripts/diag-free-lane-force-attribution.mjs#L122):

```javascript
// Line 57–58: diag computes its own local track width
const trackWidthPx = Math.max(120, Math.min(260, worldWidth * 0.12));
const spriteWorldSizePx = 54;

// Line 122–126: sets both fields explicitly on racer objects
visibleWidthPx: spriteWorldSizePx,  // priority in getSpriteWorldSizePx()
spriteWorldSizePx,
trackWidthPx,                        // priority in getTrackWidthPx()
pathLengthPx,
```

The diag script sets `trackWidthPx` (the override branch) rather than `geometricTrackWidthPx` (the primary branch). If we remove the `trackWidthPx` override branch from `getTrackWidthPx()`, this script would silently fail to inject its diagnostic width. Similarly for `visibleWidthPx`.

### 2B. sim-fairness.mjs:996

[sim-fairness.mjs:996–998](../../scripts/sim-fairness.mjs#L996):

```javascript
const sizeT = (trailer.visibleWidthPx ?? 0) > 0 && pathLengthPx > 0
  ? (trailer.visibleWidthPx / pathLengthPx) * behaviorConfig.speedBrakeTMultiplier
  : 0.014;
```

`trailer.visibleWidthPx` is read here. However, sim-fairness.mjs never *sets* `visibleWidthPx` on its racer objects (only `honestBodyWidthPx` and `spriteWorldSizePx` equivalents). So this condition is always false in sim runs → brake-match always uses the hardcoded `0.014` fallback. This is a latent sim parity bug (brake-match zone is always fixed at 0.014 instead of dynamic) but is SEPARATE from the current scope — flagged as a follow-up.

**Decision: update rather than blind-delete.**
- After renaming `geometricTrackWidthPx` → `trackWidthPx` (the primary field), the diag script's `trackWidthPx` setting accidentally aligns with the new primary name — no change needed to diag script for the track-width field.
- For `visibleWidthPx` → when renaming `spriteWorldSizePx` → `frameSizePx`, update the diag script's `visibleWidthPx:` → `frameSizePx:` **in the same rename commit** and remove the `visibleWidthPx` priority branch from `getSpriteWorldSizePx()`.
- The sim-fairness.mjs:996 `visibleWidthPx` read: update to `trailer.frameSizePx ?? 0` in the same commit, so the brake-match zone will still always use `0.014` (it's never set on sim racers). Mark the sim brake-match parity fix as a follow-up task.

---

## 3. Gap 3 — User-facing width source + sweep scripts (HIGH — CONFIRMED)

### User-facing paths (fix NOW — mismatch is user-visible)

**[SetupScreen.jsx:233](../../client/src/screens/SetupScreen/SetupScreen.jsx#L233):**
```javascript
const effectiveWidth = shape.getActualTrackWidth() * behaviorConfig.startSpreadRange;
// → const effectiveWidth = (geom.width ?? shape.getActualTrackWidth()) * behaviorConfig.startSpreadRange;
```
This drives `computeRacersPerRow` → displayed "fits N racers" hint. After game fix, Space Sprint's capacity hint will show the correct N (based on 300px not 449px). Fix in Step 1.

**[TrackManager.jsx:58](../../client/src/screens/DevScreen/sections/TrackManager.jsx#L58):**
```javascript
const effectiveWidth = shape.getActualTrackWidth() * behaviorCfg.startSpreadRange;
// → const effectiveWidth = (track.width ?? shape.getActualTrackWidth()) * behaviorCfg.startSpreadRange;
```
Same fix, same step.

### Sweep scripts (19 files) — split now vs later

All 19 scripts call `shape.getActualTrackWidth()` and build a `geometricTrackWidth` that feeds into avoidance physics. After the game fix, sweep results for Space Sprint will be computed on incorrect 449px geometry until the scripts are updated.

**Fix NOW (physics parity):** `sim-fairness.mjs` — already in Step 1.

**Fix SOON (avoid stale sweep results — recommend doing in the same PR, not blocking):**
`compare-sets.mjs`, `compare-zones.mjs`, `diag-avoidance-track.mjs`, `diag-stuck-mode.mjs`, `param-sweep-full.mjs`, `sim-race-visual.mjs`, `sim-sweep.mjs`, `sweep-balanced-lhs.mjs`, `sweep-body-collision.mjs`, `sweep-dyn-sbt.mjs`, `sweep-full-4phase.mjs`, `sweep-lateral.mjs`, `sweep-phase2.mjs`, `sweep-phase3.mjs`, `sweep-phase4-only.mjs`, `sweep-phase4.mjs`, `sweep-phase5.mjs`, `sweep-stuck-escape.mjs`

Pattern for each: `shape.getActualTrackWidth()` → `track.width ?? shape.getActualTrackWidth()` where `track` is the geometry object passed to the script. Identical one-liner fix across all 18.

---

## 4. Gap 4 — Naming cleanup (in-series — adopted)

The naming cleanup must ship in the same PR as the fix; otherwise field names outlive their meaning and the "semantic debt remains" (Copilot, confirmed).

| Old name | New name | Where | Reason |
|---|---|---|---|
| `geometricTrackWidthPx` | `trackWidthPx` | index.jsx, racer objects, raceBehavior.js | "geometric" describes the source method, not the concept |
| `getTrackWidthPx(racer)` | `getTrackWidthAtTpx(racer)` | raceBehavior.js | future-safe when per-position width lands |
| `honestBodyWidthPx` | `drawnBodyWidthPx` | index.jsx, raceBehavior.js, racer objects | "honest" is jargon; "drawn" is the real meaning |
| `honestBodyLat` (sim) | `drawnBodyWidthPx` | sim-fairness.mjs | align with game field name |
| `honestBodyLong` (sim) | `drawnBodyLengthPx` | sim-fairness.mjs | align with game convention |
| `referenceSpriteSize` | `drawnBodyWidthRefPx` | index.jsx, CameraDirector | clarifies it's the camera reference, not a sprite frame |
| `spriteWorldSizePx` | `frameSizePx` | index.jsx, racer objects, raceBehavior.js | it's the full frame envelope, not a "sprite world size" |
| `visibleWidthPx` | `frameSizePx` | diag script, raceBehavior.js getter | unify with spriteWorldSizePx; one field, one name |
| `racer.trackWidthPx` (old override) | *(removed — primary field is now trackWidthPx)* | raceBehavior.js getter, diag script | rename makes it the primary; no override branch needed |

**getTrackWidthPx → getTrackWidthAtTpx**: the rename encodes the future extension point (non-uniform tracks need width queried at racer.t). Do NOT implement `getWidthAtT(t)` now — note it in code as: `// For non-uniform tracks (no _centerWidth): extend here with racer.t per-frame lookup`.

---

## 5. Body length — independent vs derived (finding, not a gap)

**Render path analysis:** [SpriteRacerType.js:209–231](../../client/src/modules/racer-types/SpriteRacerType.js#L209)

```javascript
const bodyFillNarrow = Math.min(cfg.bodyFillX, cfg.bodyFillY);
const bodyFillLong   = Math.max(cfg.bodyFillX, cfg.bodyFillY);
const scale = ((cfg.displaySize * displaySizeScale) / cfg.frameHeight / guardedFillNarrow) * cfg.silhouetteScale;
const dw = cfg.frameWidth  * scale;   // full frame width  in world px
const dh = cfg.frameHeight * scale;   // full frame height in world px
ctx.drawImage(..., -dw/2, -dh/2, dw, dh);  // single scale factor — isotropic
```

**Finding: the render is isotropic (single scale factor).** There is no independently stored drawn body length. Both dimensions are driven by `scale`, which is calibrated to produce `bodyNarrow` (drawnBodyWidthPx) along the narrow frame axis. The drawn body length follows mathematically.

**Drawn body length formula:**
```
drawnBodyLengthPx = bodyFillLong × dw
                  = bodyFillLong × frameWidth × scale
                  = bodyFillLong × frameWidth × bodyNarrow / (bodyFillNarrow × frameHeight)
```

For **square frames** (frameWidth = frameHeight — confirmed for dragon: 128×128):
```
drawnBodyLengthPx = bodyNarrow × bodyFillLong / bodyFillNarrow
```

**This IS a derivation, but it correctly uses bodyFillLong and bodyFillNarrow as independent quantities** — it does NOT collapse them to a single ratio or derive one from the other. Different racer types produce different results because their bodyFillX/bodyFillY differ. The user's concern (don't use one fill fraction to reconstruct the other) is respected: both are read independently from the config and used in the formula.

**Verification needed at build time:** Confirm all current sprite types use square frames (frameWidth = frameHeight). Dragon confirmed: 128×128. If any non-square frame is found, the full formula `bodyFillLong × frameWidth / (bodyFillNarrow × frameHeight)` must be used instead of `bodyFillLong / bodyFillNarrow`.

**Dragon checkpoint:** bodyFillNarrow=0.836, bodyFillLong=0.898, frames 128×128.
```
drawnBodyLengthPx = 28.5 × (0.898 / 0.836) = 28.5 × 1.074 ≈ 30.6px
```

**Current sim formula (wrong):** [sim-fairness.mjs:497–499](../../scripts/sim-fairness.mjs#L497):
```javascript
const honestBodyLong = effectiveDisplaySize * bodyFillY;  // WRONG: effectiveDisplaySize = full frame size, not bodyNarrow
const honestBodyLat  = effectiveDisplaySize * bodyFillX;  // WRONG: same base
```
Both must use `bodyNarrow` from `computeBodyNarrowRef`, not `effectiveDisplaySize` from `computeRacerLayout`.

---

## 6. Proposed source-of-truth structure

```
trackWidthPx        = track.width (uniform/centerPoint tracks)
                      ?? shape.getActualTrackWidth()  (fallback for tracks without width)
                      ← per-position extension deferred: note getTrackWidthAtTpx as hook

drawnBodyWidthPx    = bodyNarrow  (from computeBodyNarrowRef with W_REF, N, ds, bfNarrow)
                    = referenceSpriteSize (already computed; rename to drawnBodyWidthRefPx)
                    ← the camera ref IS the drawn body — same value, same source

drawnBodyLengthPx   = drawnBodyWidthPx × bodyFillLong / bodyFillNarrow  (square frames)
                    = drawnBodyWidthPx × bodyFillLong × (frameWidth/frameHeight) / bodyFillNarrow  (general)
                    ← fully derived from drawnBodyWidthPx + per-type constants (not a separate source)

pxToPhysicalY(px, tw)  = px / (tw / 2)   — ALL lateral px→physicalY conversions
physicalYToPx(phy, tw) = phy × (tw / 2)  — ALL lateral physicalY→px conversions
                         Both defined as top-level helpers in raceBehavior.js; each used once per site
```

---

## 7. lateralScale force-shift — explicit decision required

[raceBehavior.js:415–419](../../client/src/modules/raceBehavior.js#L415):

```javascript
const pairTrackWidth = Math.max(getTrackWidthPx(rA), getTrackWidthPx(rB));
const lateralScale = Math.max(0.1, Math.min(3.0, REFERENCE_TRACK_WIDTH / pairTrackWidth));
// REFERENCE_TRACK_WIDTH = 98 (Dirt Oval width, physics calibration baseline)
```

After Step 1 (track-width source fix) for Space Sprint:
```
pairTrackWidth:  449px → 300px
lateralScale:    98/449 ≈ 0.218 → 98/300 ≈ 0.327  (+50%)
```

This is a **large real behavior change**: avoidance forces on Space Sprint increase by ~50%. On Dirt Oval (track.width = 98), there is zero change (lateralScale = 1.0 before and after).

**Decision: ACCEPT the force increase.**

Rationale: The physics was calibrated with an inflated pairTrackWidth (449px instead of 300px). The actual track is narrower than the physics believed — racers were being given weaker avoidance forces than the true geometry warrants. Accepting the fix restores physically correct force scaling and is consistent with the overlap-reduction goal of this branch.

**Consequence:** A full N=50 sweep across all 66 combos is required after all steps are complete, with Space Sprint results expected to improve (lower overlap). REFERENCE_TRACK_WIDTH remains 98 — do NOT change it; it is the calibration anchor for closed tracks and must not be adjusted to retroactively compensate for a source bug.

---

## 8. Sim parity verification

The game's `computeBodyNarrowRef` call uses [index.jsx:444–451](../../client/src/screens/RaceScreen/index.jsx#L444):
```javascript
const W_REF = Math.min(285, effectiveWidth);  // effectiveWidth = trackWidthPx × startSpreadRange
computeBodyNarrowRef(W_REF, nRacers, displaySize, bodyFillNarrow, autoScaleConfig)
```

The sim must call `computeBodyNarrowRef` with **identical** arguments. Verify in Step 2:
- W_REF: same `Math.min(285, ...)` cap, same `startSpreadRange`
- bodyFillNarrow: same `Math.min(bodyFillX, bodyFillY)` derivation
- autoScaleConfig: same config object loaded from same source

The sim must import `computeBodyNarrowRef` from `rowLayout.js` (already available to scripts). Adding the call at [sim-fairness.mjs:277](../../scripts/sim-fairness.mjs#L277) (racer init block) is the insertion point.

---

## 9. Full consumer list

### Must fix in this PR

| Site | File:line | Change |
|---|---|---|
| Track width source (game) | index.jsx:371 | `geometry.width ?? shape.getActualTrackWidth()` |
| openTrackHW (game) | index.jsx:694 | `trackWidthPx / 2` (reuse) |
| Track width source (sim) | sim-fairness.mjs:2145 | `track.width ?? shape.getActualTrackWidth()` |
| Track width source (SetupScreen) | SetupScreen.jsx:233 | `geom.width ?? shape.getActualTrackWidth()` |
| Track width source (TrackManager) | TrackManager.jsx:58 | `track.width ?? shape.getActualTrackWidth()` |
| Body width source (game) | index.jsx:604 | `drawnBodyWidthPx: drawnBodyWidthRefPx` |
| Body width source (sim) | sim-fairness.mjs:338 | `drawnBodyWidthPx: bodyNarrow` (add computeBodyNarrowRef call) |
| Body lat source (sim) | sim-fairness.mjs:499 | `drawnBodyWidthPx = bodyNarrow` |
| Body long source (sim) | sim-fairness.mjs:498 | `drawnBodyLengthPx = bodyNarrow × bodyFillLong / bodyFillNarrow` |
| Denominator Break 3 — sameLaneHH | raceBehavior.js:595 | `/ (trackWidth / 2)` |
| Denominator Break 3 — pairHH | raceBehavior.js:387–390 | `/ (pairTW / 2)` |
| BLOCKED-mode (Gap 1) — center guard | raceBehavior.js:221 | `× (trackWidth / 2)` |
| BLOCKED-mode (Gap 1) — dy | raceBehavior.js:238 | `× (trackWidth / 2)` |
| BLOCKED-mode (Gap 1) — dY diagnostic | raceBehavior.js:246 | `× (trackWidth / 2)` |
| Add helpers | raceBehavior.js (top-level) | `pxToPhysicalY`, `physicalYToPx` |
| Naming: all field renames | index.jsx, raceBehavior.js, sim-fairness.mjs, diag script | per naming table above |

### Fix SOON (same PR strongly recommended — sweep parity)

18 sweep/diag scripts: `compare-sets.mjs`, `compare-zones.mjs`, `diag-avoidance-track.mjs`, `diag-stuck-mode.mjs`, `param-sweep-full.mjs`, `sim-race-visual.mjs`, `sim-sweep.mjs`, `sweep-balanced-lhs.mjs`, `sweep-body-collision.mjs`, `sweep-dyn-sbt.mjs`, `sweep-full-4phase.mjs`, `sweep-lateral.mjs`, `sweep-phase2.mjs`, `sweep-phase3.mjs`, `sweep-phase4-only.mjs`, `sweep-phase4.mjs`, `sweep-phase5.mjs`, `sweep-stuck-escape.mjs`

Pattern: `shape.getActualTrackWidth()` → `track.width ?? shape.getActualTrackWidth()`. One-liner each.

### Defer (separate issue — not blocking)

- Sim brake-match parity: sim-fairness.mjs:996 `trailer.visibleWidthPx` never set on sim racers → brake-match always uses `0.014`. Fix: set `frameSizePx` on sim racer objects in the init block. (Unblocked by current scope but should be done.)
- Non-uniform track width: `getWidthAtT(t)` on EditorShape when a non-centerPoint track is added.

---

## 10. Sequenced build plan

### Step 1 — Track width source

Fix game + user-facing + sim to read `track.width` first. This is the foundational change; all subsequent steps depend on the corrected width.

**Files:** index.jsx:371, :694 · sim-fairness.mjs:2145 · SetupScreen.jsx:233 · TrackManager.jsx:58

**Checkpoint A:** `node scripts/sim-fairness.mjs --race-plan=true` output for Space Sprint: `width=300px` (was 449px).

**Immediate consequence:** `lateralScale` rises from 0.218 → 0.327 on Space Sprint (+50%). Expected.

### Step 2 — Body width source

Replace `physicalSpriteSize × bodyFillX` with `referenceSpriteSize` (game) and `bodyNarrow` (sim). Zero new computation — `referenceSpriteSize` is already computed on index.jsx:459.

**Files:** index.jsx:604 · sim-fairness.mjs:338, :499 (add computeBodyNarrowRef import + call)

**Checkpoint B:** `drawnBodyWidthPx` (dragon, N=40, Space Sprint) = 28.5px (was ≈34px).

### Step 3 — Body length source (sim only)

Fix sim's `honestBodyLong` to use correct formula.

**Files:** sim-fairness.mjs:498

**Checkpoint C:** `drawnBodyLengthPx` (dragon, N=40, Space Sprint) ≈ 30.6px (was `effectiveDisplaySize × bodyFillY` with wrong base).

### Step 4 — Denominator + BLOCKED-mode (Breaks 3 + Gap 1)

Add `pxToPhysicalY` and `physicalYToPx` helpers at top of raceBehavior.js. Route all six conversion sites through them.

**Files:** raceBehavior.js (add helpers, fix :221, :238, :246, :387–390, :595)

**Checkpoint D — sameLaneHH:** dragon N=40, Space Sprint = `28.5 / (300/2)` = **0.190** (was ≈ 0.076).
**Checkpoint E — BLOCKED-mode dY:** at physicalY=1, trackWidth=300: `dY` in blockerInfo = **150px** (was 300px).
**Checkpoint F — Stage D:** `honestHalfSpan` = 28.5/300 = 0.095; `clearanceSpan` = 0.190. Shuts off exactly at one drawn body width. No code change needed — upstream fixes cascade correctly.

### Step 5 — Sweep scripts (18 files)

One-liner pattern applied uniformly. Do not change anything else in sweep scripts.

**Checkpoint G:** `node scripts/sim-fairness.mjs --race-plan=true` for Space Sprint shows correct `width=300px` AND correct `drawnBodyWidthPx=28.5px` simultaneously.

### Step 6 — Naming cleanup

Rename all fields and helpers per the naming table. Update diag script. Remove dead getter branches. Run tests.

**Checkpoint H:** 2629/2629 tests green. No behavior change from renaming alone.

### Step 7 — Full sweep

N=50 sweep across all 66 combos. Space Sprint results expected to show lower overlap than Stage C baseline.

---

## 11. What does NOT change

- **Stage D gap force code:** [raceBehavior.js:817–826](../../client/src/modules/raceBehavior.js#L817) — `honestHalfSpan = drawnBodyWidthPx / tw` stays as written. The 2× in `clearanceSpan` already accounts for the /2 factor; after upstream fixes it evaluates to exactly the correct physicalY threshold (0.190) with no code change.
- **`REFERENCE_TRACK_WIDTH = 98`:** stays at 98. Not a source of error.
- **`computeRacerLayout`:** stays as physical row layout. Only `computeBodyNarrowRef` drives body sizes.
- **`getActualTrackWidth()`:** method stays, used as fallback for future tracks without `width`. Not retired.
- **Non-uniform track architecture:** deferred. The `track.width ?? getActualTrackWidth()` fallback is the correct bridge; `getWidthAtT(t)` is noted but not built.
