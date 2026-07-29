# OVERVIEW-ZOOM-1 — the OVERVIEW view ignores the selected sprite scale (root cause first)

**Base: `origin/master`. Author: CC.** Symptom: the owner set the OVERVIEW **"Sprite scale (×)"** to 2.5
(UI shows the German-locale "2,5") but the OVERVIEW view stays far more zoomed-out than 2.5 warrants. Race
config untouched (badge 0 race) — presentation layer only.

## VERDICT (read first): ROOT-CAUSE FIXED. Regression from L116; selected scale now drives OVERVIEW, default unchanged.
The OVERVIEW zoom was driven entirely by `overviewTargetScreenPx` (a fixed on-screen racer-size target) and
ignored the selected `cameraStateProfiles.OVERVIEW.spriteScale`. The fix makes the selected scale a
**multiplier** on that normalized target, so 1.0 = the current (unchanged) look and 2.5 = 2.5× on both
topologies. Behavior-neutral for the shipped game — fingerprint `ded0a126048e4cdb` identical; 3325 tests green.

## STEP 0 — ROOT CAUSE (three sentences)
1. On entry to OVERVIEW the camera computes its snap zoom from `overviewTargetScreenPx / (drawnBodyWidthRefPx
   × divisor)` — the L116 "constant on-screen racer size regardless of racer count" normalization — and the
   selected `OVERVIEW.spriteScale` is only a soft ×0.8 *ceiling* on open tracks and **entirely unused on
   closed tracks**, so the slider does essentially nothing.
2. The config, control, migration and locale are all fine: reproduced with a real drawnBodyWidthRefPx, the
   selected 2.5 is stored correctly (`_overviewStateZoom` = 2.5) yet the closed-track OVERVIEW zoom is
   **identical (1.0000) for spriteScale 1.0 and 2.5**, and only 1.23× (not 2.5×) on open — clearing suspects
   (b) profile/migration, (c) autoSpriteScale, and (d) locale (the "2,5" is innocent `type="number"` display
   formatting; the value reaches the code as 2.5).
3. This is a **regression from commit `c7fa30a`** ("normalize closed-track OVERVIEW racer size to match open
   tracks — L116 extension", 2026-06-04), which removed the `_isOpenTrack &&` guard so the
   `overviewTargetScreenPx` normalization now overrides the closed-track OVERVIEW zoom too — before it,
   closed-track OVERVIEW used the sprite-scale-derived zoom, which is exactly why the owner remembers it
   working. (Suspect (a) confirmed: the OVERVIEW state was decoupled from its spriteScale.)

**Why L116 exists (owner asked):** Lesson 116 + `c7fa30a` deliberately pin the apparent OVERVIEW racer size to
a constant (~28 px) independent of racer count and track — a *good* feature (with 80 racers the density-scaled
sprites are tiny; normalization keeps them legible). The bug is the unintended *decoupling* of the per-state
sprite-scale slider from that zoom, not L116 itself — so the fix keeps L116 and re-couples the slider.

## STEP 1 — THE FIX (keep L116, honor the selection)
The selected `OVERVIEW.spriteScale` now **multiplies** the L116-normalized target:
`raw = overviewTargetScreenPx × spriteScale / (drawnBodyWidthRefPx × divisor)`
(`client/src/modules/camera/CameraDirector.js`, the OVERVIEW entry-snap). `_overviewSpriteScale` is stored in
`_computeZoomLevels` for all three config paths (v14 profiles → the selected value; legacy `spritePctOfCanvas`
and no-config → 1.0). Reproduction, before → after:

| topology | scale 1.0 (default) | scale 2.5 (selected) |
|---|---|---|
| CLOSED (before) | 1.0000 | **1.0000 — ignored** |
| CLOSED (after) | 1.0000 (unchanged) | **2.456 (≈2.5×)** |
| OPEN (before) | 0.5333 | 0.6550 (only 1.23×) |
| OPEN (after) | 0.5333 (unchanged) | **1.3333 (exactly 2.5×)** |

Because the default `OVERVIEW.spriteScale` is **1.0**, the multiplier is 1.0 by default → the shipped OVERVIEW
framing is byte-for-byte unchanged; only non-default selections now take effect. **No new migration needed:**
the existing v13→v14 migration already populates `cameraStateProfiles.OVERVIEW.spriteScale` from legacy
`spritePx`, and any config missing the field heals to 1.0 (unchanged) on load.

## STEP 2 — HARDENING
`_computeZoomForSpriteScale` now coerces a non-finite `spriteScale` to 1.0 (no NaN into `cam.zoom`);
`_overviewSpriteScale` is finite-guarded at both the store site and the snap use site (falls back to 1.0).
**Locale parser: NOT APPLICABLE** — the DevScreen sprite-scale control is `<input type="number">` with
`onChange = Number(e.target.value)`, which yields a dot-decimal 2.5; the "2,5" is browser locale *display*
formatting, and the reproduction confirms the value reaches the code as 2.5 (no comma-hostile path).

## STEP 3 — TESTS (6 new; `CameraDirector.test.js`, 344 camera tests green)
CLOSED: zoom matches `28 × 2.5 / (ref × bsX)` · CLOSED scale 2.5 = 2.5× the scale-1.0 zoom · CLOSED scale 1.0
unchanged (default guard) · OPEN scale 2.5 = 2.5× the scale-1.0 zoom · non-finite → finite, equals scale-1.0 ·
legacy `spritePctOfCanvas` config → `_overviewSpriteScale` 1.0, finite default zoom.

## VERIFY
- **Fingerprint `ded0a126048e4cdb` IDENTICAL** (the camera is presentation-only; it is not on the sim/physics
  path). **Full suite 161 files / 3325 tests green** (3319 + 6 new). **eslint + build clean.**
- **Owner check:** with the dev server restarted, select OVERVIEW **Sprite scale (×) = 2.5** → the OVERVIEW
  visibly zooms so racers are ~2.5× larger than at 1.0, on both open and closed tracks.

## THE FIVE SENTENCES
1. The OVERVIEW zoom was driven by the L116 `overviewTargetScreenPx` normalization and ignored the selected
   `OVERVIEW.spriteScale` — fully on closed tracks, mostly on open — a regression from `c7fa30a` that removed
   the open-only guard.
2. Reproduced concretely: closed-track OVERVIEW zoom was identical (1.0000) for spriteScale 1.0 and 2.5, so the
   config/control/migration/locale were all cleared as suspects.
3. The fix keeps the deliberate L116 count-normalization and makes the selected sprite scale a multiplier on
   it, so 1.0 leaves the default look unchanged and 2.5 gives 2.5× on both topologies.
4. Non-finite scales are guarded to 1.0, and the locale path is not applicable (`type="number"` yields 2.5;
   "2,5" is display formatting).
5. Behavior-neutral for the shipped game — fingerprint identical, 3325 tests green (6 new), eslint + build
   clean — awaiting the owner's OVERVIEW eye-test.

## PROPOSALS (≥2)
1. **Clarify the two OVERVIEW size knobs in the DevScreen.** OVERVIEW size is now `overviewTargetScreenPx`
   (the normalized base, ~28 px) × the OVERVIEW `spriteScale` (the multiplier). A one-line tooltip on the
   OVERVIEW sprite-scale control ("multiplies the normalized overview size; 1.0 = default") would make the
   relationship obvious and prevent the "why doesn't it move?" confusion recurring.
2. **Add a `?world`-free camera-config sanity check to the DevScreen.** A tiny read-out showing the resolved
   OVERVIEW cam.zoom for the current track/scale (like the fingerprint badge) would let the owner confirm a
   camera setting takes effect without a full race — turning eye-tests like this one into a glance.
3. **Audit the other per-state `spriteScale` sliders for the same decoupling.** LEADER/BATTLE/COMEBACK use
   `_computeZoomForSpriteScale` directly (verified coupled), but a quick regression test per state asserting
   "scale 2× ⇒ ~2× the zoom after a transition-in" would lock all of them against a future L116-style change.

---
**Presentation-layer only** (`CameraDirector.js` + its test). Shipped fingerprint `ded0a126048e4cdb` unchanged.
