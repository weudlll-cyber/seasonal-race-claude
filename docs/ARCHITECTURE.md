# RaceArena — Architecture

## Overview

RaceArena has a React client and a local backend (Phase L). Race logic runs in the browser. Custom tracks and background images persist server-side; `localStorage` remains in use for settings, race config, and offline geometry cache. A Phase 5 server for race-integrity, leaderboard, and Socket.IO multiplayer is planned.

## Folder Structure

```
seasonal-race-claude/
├── client/
│   ├── public/
│   │   ├── index.html
│   │   ├── assets/tracks/backgrounds/   # Track background images (1280×720)
│   │   └── assets/racers/               # Racer sprite sheets + CREDITS.md
│   └── src/
│       ├── screens/                # Route-level full-page views
│       │   ├── SetupScreen/        # Pre-race config (players, track, settings)
│       │   ├── RaceScreen/         # Live race canvas + camera director
│       │   │   ├── index.jsx       # Main component (~1673 lines)
│       │   │   └── drawing/        # Extracted canvas draw modules (hygiene sprint)
│       │   │       ├── overlayRendering.js     # Title, lap info, countdown, finish overlays
│       │   │       ├── particleRendering.js    # Dust/burst particles, surface trails
│       │   │       ├── racerRendering.js       # Racer sprites, name tags
│       │   │       ├── priorityModeOverlay.js  # Priority mode debug rings + info box
│       │   │       ├── battleDiagRendering.js  # Battle diagnostics world-space markers
│       │   │       └── trackRendering.js       # Track surface (pre-existing)
│       │   ├── ResultScreen/       # Post-race podium and history
│       │   ├── RacerEditor/        # Full-screen custom racer type editor (Racer Editor Phase 1+2)
│       │   │   ├── RacerEditor.jsx         # Top-level screen: two-column layout, save/cancel, edit-mode (?id=)
│       │   │   ├── SpriteGeneratorPanel.jsx # Left column: PNG upload, background removal, checkerboard preview, animation preview canvas, tint swatches
│       │   │   ├── RacerMetadataPanel.jsx  # Right column: name, emoji, speed, display size, trail style, surface classes, primary color
│       │   │   ├── AnimationControls.jsx   # Primary animation type pills + per-type amplitude sliders + add-ons (tail wiggle, shadow pulse)
│       │   │   └── RacerEditor.module.css
│       │   ├── DevScreen/          # Developer / admin panel (10 sections, 2-tier Operator/Advanced)
│       │   │   └── sections/
│       │   │       ├── RaceTuningSection.jsx       # Thin coordinator (44 lines) — renders below two
│       │   │       ├── BehaviorTuningSection.jsx   # behaviorConfig: avoidance, drafting, soft steering, speed brake
│       │   │       ├── DynamicsTuningSection.jsx   # speedConfig, rowConfig, dynamicsConfig, frameTiming
│       │   │       └── SubCard.jsx                 # Shared SubCard wrapper (extracted from RaceTuning)
│       │   └── TrackEditor/        # Visual track drawing tool
│       │       ├── TrackEditor.jsx         # Main component (1040 lines, hygiene sprint)
│       │       ├── TrackEditorToolbar.jsx  # Extracted toolbar component
│       │       ├── TrackEditorSaveBar.jsx  # Extracted save bar component
│       │       ├── useViewport.js          # Zoom/pan viewport hook
│       │       └── useTrackIO.js           # Server save/delete/background I/O hook
│       ├── components/             # Reusable UI building blocks
│       │   ├── Button/
│       │   ├── Modal/
│       │   ├── InputField/
│       │   ├── ColorPicker/
│       │   ├── EffectConfig/       # Add/remove/configure track effects (F13)
│       │   ├── LogoUploader/
│       │   └── PresetThumbnail/    # Rendered track preview card
│       ├── modules/                # Domain logic, independent of React
│       │   ├── camera/             # CameraDirector + diagnostics + timing
│       │   │   ├── CameraDirector.js            # State machine: OVERVIEW/LEADER/BATTLE/COMEBACK/LEAD_CHANGE
│       │   │   ├── CameraDirectorDiag.js        # Extracted diagnostics (frame log, jump detection)
│       │   │   ├── cameraTimingComputation.js   # Extracted timing/zoom computation helpers
│       │   │   └── (lapUtils, panTarget, openTrackCamera, …)
│       │   ├── racer-types/        # Racer manifests (sprite render, animation, trail, coats)
│       │   │   ├── SpriteRacerType.js      # Config-driven base class for all sprite-based racer types (D3.5)
│       │   │   ├── HorseRacerType.js       # Sprite-based horse with 11 coats (SpriteRacerType, migrated D3.5.2)
│       │   │   ├── spriteLoader.js         # Async image loader with module cache
│       │   │   ├── spriteTinter.js         # Offscreen-canvas tinting; detectTintMode (luminance-based auto); tintSpriteWithMask for mask-restricted mode; pattern overlay infrastructure (stripes/dots disabled — solid only active)
│       │   │   ├── coatAssignment.js       # Hash-based coat + pattern selection (assignCoat, assignPattern — pattern always returns 'solid')
│       │   │   ├── racerTypeStorage.js     # localStorage CRUD for user-created racer types (key: racearena:racerTypes)
│       │   │   ├── trailStyles.js          # Named trail-factory presets (dust, spark, bubble, leaf, snow, fire)
│       │   │   ├── standardCoats.js        # STANDARD_COAT_PALETTE — 20-color coat array for vehicle racer types (animal types use own 11-color palettes)
│       │   │   ├── spriteAnimations.js     # Pure animation math: computeFrameTransforms(frameIndex, N, config) → {rotate, scaleX, scaleY, translateX, translateY, shearX, shadowScale}
│       │   │   ├── spritesheetBuilder.js   # Renders animation frames onto an offscreen canvas and exports a data URL
│       │   │   ├── backgroundRemoval.js    # Flood-fill + tolerance background removal; computeSpriteBoundingBox with edge-strip filter
│       │   │   ├── canvasUtils.js          # Shared canvas helpers (checkerboard pattern, image-to-canvas)
│       │   │   ├── LugeRacerType.js        # Built-in type 13 of 20 — 2000×238 spritesheet, 16 frames 125×238, screen tinting (dark helmet near-black), 20 coats, ice/snow surface classes
│       │   │   └── (All 20 built-in types are SpriteRacerType instances — D3.5.x migration complete; CarRacerType replaced by BuggyRacerType)
│       │   ├── storage/            # localStorage helpers (useStorage, KEYS)

│       │   ├── surface-effects/    # Visual Racer Effects system (shipped — VRE-1..4, surface classes live)
│       │   │   ├── index.js              # listSurfaceClasses / getSurfaceClass / getSurfaceClassApi
│       │   │   ├── defaultClasses.js     # 9 default Surface Class definitions (code constants)
│       │   │   ├── surfaceClassApi.js    # GET/POST/PUT/DELETE /api/surface-classes
│       │   │   └── generators/           # Generator modules
│       │   │       ├── particle.js       # Individual point/circle particles
│       │   │       ├── cloud.js          # Soft, growing, fading blobs
│       │   │       ├── splash.js         # Fast particles with gravity
│       │   │       └── line.js           # Persistent ground-level streaks
│       │   ├── track-editor/       # Geometry CRUD, Catmull-Rom, EditorShape
│       │   ├── track-effects/      # Animated effect layers
│       │   │   ├── bgImageCache.js # Async image loader with module-level cache
│       │   │   ├── index.js        # listEffects / getEffect / getDefaultConfig
│       │   │   └── effects/        # rain, stars, bubbles, fireflies, dust, mud, wave
│       │   └── utils/              # RandomHelper (shuffle, assignRacers)
│       ├── utils/                  # Shared pure utilities (no React, no DOM)
│       │   ├── slugify.js          # String → URL-safe slug
│       │   └── withTimeout.js      # Promise.race wrapper: rejects after ms (created N-1)
│       ├── contexts/               # React contexts (TransitionContext)
│       ├── styles/
│       │   └── main.css
│       ├── App.jsx
│       └── main.jsx
│
├── server/          # Express backend, port 4000 (Phase L)
│   ├── src/         # app.js, routes/tracks.js
│   └── data/        # tracks/*.json, backgrounds/*.jpg
├── docker-compose.yml  # starts server with `docker compose up`
│
├── docs/
│   ├── ARCHITECTURE.md             # This file
│   ├── API.md                      # REST API reference (Tracks + Surface Classes)
│   ├── SETUP.md
│   ├── ROADMAP.md
│   └── TRACK_EDITOR.md             # Track Editor full spec
│
└── .github/
    └── workflows/
        ├── ci.yml                  # Lint + test on PR
        └── deploy.yml              # Deploy on merge to main
```

## Data Flow (current)

```
Browser → React (screens/)
            ↓ Canvas (RaceScreen / TrackEditor)  ← rAF loop (inline in RaceScreen)
            ↓ localStorage (modules/storage/)    ← all settings, tracks, results
```

## Error Boundary (Top-Level)

`client/src/components/ErrorBoundary/ErrorBoundary.jsx` wraps the entire app in `main.jsx`:

```
React.StrictMode
  └── ErrorBoundary          ← catches all render-time throws
        └── App (Router, screens, contexts)
```

On any render crash, instead of a blank screen the user sees: headline, reload button, "Reset local data" button (clears all `racearena:*` localStorage + sessionStorage keys, then reloads), and a toggleable technical-details panel showing the error message + component stack. The crash is logged via `console.error` with prefix `[RaceArena] Render crash:`.

Per-screen boundaries are not used — the top-level catch-all is sufficient for the current single-page structure. Backend logging will be added in Phase 5.

## Key Design Decisions

- **Phase 1–4 pure client; Phase L adds local backend** — A local Express server (Phase L, PR #43–#44) handles custom track storage and background images. Race state, settings, and results still persist in `localStorage`. The backend runs on port 4000 via `docker compose up`. See [TRACK_EDITOR.md — localStorage Keys](TRACK_EDITOR.md#localstorage-keys) for the key schema.
- **modules/ are framework-agnostic** — no React imports in `modules/`; screens own the component tree, modules own the logic.
- **Track Editor (Phase 2.5)** — Tracks are authored visually on top of background images. Geometry is stored as inner/outer boundary curves (Catmull-Rom interpolated). See `docs/TRACK_EDITOR.md`.
- **Spline Sampling — arc-length uniform (PR-A2.5)** — `catmullRomSpline` defaults to `parameterization: 'arclength'`. A dense T-table (5× requested samples, min 1000) is built per call; binary search maps target arc-lengths to T-values. Racers advance at constant pixel velocity regardless of editor-point distribution. Pass `parameterization: 'parameter'` for legacy T-uniform behaviour.
- **EditorShape linear interpolation (Stage 26)** — `EditorShape.getPosition()` uses `Math.floor()` + fractional blend between adjacent precomputed samples instead of the former `Math.round()` nearest-neighbour lookup. At 500 samples on a ~2000 px oval at zoom 4×, `Math.round()` caused ~20 px visible racer jumps per frame; linear interpolation eliminates this. Angles are precomputed once in `_precomputeAngles()` and interpolated with shortest-path wrap.
- **EditorShape center-path geometry (fix/centerline-perpendicular, 2026-05-29)** — For tracks with `centerPoints`, `getPosition(t, offset)` uses a dedicated center-curve path: `centerPoints` are Catmull-Rom arc-length resampled with the same `opts` as `_inner`/`_outer`. At `offset = 0`, the center curve position is returned directly. At `offset ≠ 0`, the perpendicular displacement uses `angle − π/2` (CW in canvas y-down = toward outer side, matching the fallback convention) scaled by `track.width` from the JSON (not `getActualTrackWidth()`, which measures inner-to-outer distance and is correct for row layout but not for center-perpendicular displacement). `_precomputeAngles` uses `_center[i]` central differences when `_center` is available, eliminating up to 25.6° tangent error at tight U-turns caused by inner/outer arc-length phase misalignment (inner arc ≈ 600 px vs outer ≈ 1400 px through Luger Hill's tightest bend — at the same arc-length fraction, inner is past the apex and outer has not yet reached it). Fallback (no `centerPoints`): inner/outer interpolation unchanged — zero regression. See Lessons 97–100.
- **CameraDirector — pulk battle trigger + time-based phases (feat/per-state-camera-phase-1)** — `BATTLE_ZOOM` fires when ≥3 of the top-10 racers are within `battlePulkThresholdPx` (default 200 px) of each other, replacing the former fraction-based `battleGapThreshold`. `battleMinDurationMs` (default 3000 ms) prevents flickering when the cluster briefly dissolves. Per-state `leadInDuration` / `leadOutDuration` (seconds) replaced the old pixel-based `leadInDistance` / `followDuration` / `leadOutDistance` fields (schema v5 migration in `cameraConfig.js`).
- **Track Effects replace Environments** — Animated overlays (rain, stars, bubbles, etc.) are opt-in per-track effect layers under `modules/track-effects/`. Up to 3 simultaneous effects per geometry. The old `environments/` module was deleted.
- **RaceScreen draw-function extraction (hygiene sprint, 2026-05-25)** — All non-trivial canvas draw functions have been extracted from `RaceScreen/index.jsx` into `RaceScreen/drawing/` modules: `overlayRendering.js` (title/lap/countdown/finish overlays), `particleRendering.js` (dust, bursts, surface trails), `racerRendering.js` (sprites, name tags), `priorityModeOverlay.js` (priority debug), `battleDiagRendering.js` (battle diagnostics). `index.jsx` dropped from 1853 → 1460 lines. `drawEditorTrackSurface` remains in the pre-existing `drawing/trackRendering.js` (finish-line only since the Race Track Lights PR).
- **Track Lights** — Small glowing dots along both boundaries replace the solid cyan boundary lines. Light positions are cached once at race init via `sampleBoundaryAtInterval` (30 px spacing, ~400 points total for typical tracks). Per-frame, only brightness is recomputed per style (`steady`, `sequence`, `sync_pulse`, `random_flash`). Implementation: `client/src/modules/trackLights.js`. Configuration stored as `trackLights` on track geometry; editable in Track Editor; server-migration sets themed defaults on first startup.
- **Racer Editor — user-created racer types via PNG upload (Racer Editor Phase 1+2, 2026-05-28)** — Users can create custom racer types at `/racer-editor` without code changes. Workflow: upload a PNG sprite sheet → background removal (flood-fill, tolerance) → animation preview (7 primary types × configurable amplitude + 2 add-ons) → metadata → save. Saved types are stored in localStorage under `racearena:racerTypes` as JSON with a `spriteDataUrl` (data URL). On load, user types are merged into the registry alongside built-in types. `SpriteRacerType` accepts user configs identically to built-in configs. `spriteTinter.detectTintMode` auto-selects multiply vs screen compositing based on average luminance of the base sprite.

- **Sprite-based racers, not procedural primitives** — Issue D started with procedural Canvas drawing for racer bodies. Three iterations confirmed that anatomical detail (horse vs duck vs snail) at 22-26 px scale cannot be made readable with primitives. Racer types now use PNG sprite sheets with frame-based animation and offscreen-canvas tinting for color variants. Per-racer assets live under `client/public/assets/racers/` with credits in `CREDITS.md`.

## Visual Sprite-Scaling Pipeline (after D7a)

Sprites scale proportionally with camera zoom (natural "closer = bigger"), with a minimum-size
floor that guarantees visibility on very large tracks.

```
spriteWorldScale = computeRenderDisplayScale(displaySize, displaySizeScale, effZoom, minTargetScreenPx)
screenPx         = displaySize × spriteWorldScale × effZoom
               = max(displaySize × displaySizeScale × effZoom, minTargetScreenPx)

Where:
  effZoom (Closed) = cam.zoom × bsX       where bsX = CANVAS_W / worldW
  effZoom (Open)   = OPEN_TRACK_BASE_ZOOM × cam.zoom   (OPEN_TRACK_BASE_ZOOM = 1.5)

  cam.zoom     = overviewZoom × stateRatio    (lerp-smoothed each frame)
  overviewZoom = CANVAS_W / worldW            (adaptive: full world fits at zoom=1 on 1280px ref)
  stateRatio   = LEADER:1.4, BATTLE:1.6, COMEBACK:1.3, OVERVIEW:1.0

  displaySizeScale = computeAutoScaleFactor(trackWidth, racerCount, config)
                   = clamp(trackWidth / racerCount / referenceValue, minScale, maxScale)
```

What was eliminated in D7a:
- `cameraZoomFactor` — per-frame compensating multiplier that kept sprites constant-size
- `REFERENCE_CAMERA_ZOOM = 1.4` — magic constant the above aimed to match
- Pixel floor inside `computeAutoScaleFactor` — floor is now in the render pipeline only
- `computeCameraZoomFactor` + `computeOpenTrackCameraZoomFactor` — helper functions for the above

Entry point: `computeRenderDisplayScale` in `modules/autoSpriteScale.js`. Called once per frame
in the `RaceScreen` render loop.

## Row-Start Layout (D7c + D7c-fix + D7c-Phase4)

Implemented in `modules/rowLayout.js`. Called once at race start in `RaceScreen` before the
racer init map.

**Algorithm:**
1. Track width source: `trackWidthPx = track.width ?? shape.getActualTrackWidth()`. The stored
   `track.width` field (set by the Track Editor from `_centerWidth`, the true physical lane width)
   is read first. `getActualTrackWidth()` is the spline-based fallback for tracks that predate
   the stored-width field; it measures the median inner-to-outer distance and may overestimate.
   See § "Scale & Size — Single Sources of Truth" for why this matters.
2. `effectiveWidth = trackWidthPx × startSpreadRange` — the region actually used by
   racers at start. This ensures the packing formula matches the actual lateral distribution.
3. `computeRacersPerRow(effectiveWidth, frameSizePx)` — computes how many sprites fit
   shoulder-to-shoulder: `floor(2 × effectiveWidth / frameSizePx)`.
   Stays in world-pixel space — correct at any world size.
   `frameSizePx = displaySize × displaySizeScale_physical` (frame-based, real width — physics layout).
4. `computeRowLayout(racerCount, racersPerRow)` — shuffles racer indices (Fisher-Yates) and
   assigns them to rows based on the pre-computed `racersPerRow`.
5. `computeRowPhysicalY(indexInRow, rowSize, spreadRange)` — distributes racers evenly across
   `[-spreadRange, +spreadRange]`, including partial last rows (full spread, not clustered).
6. **t-start (track-type dependent):**
   - *Closed tracks*: Row k at `t = -(k × rowGapPx / pathLengthPx)`. `tPos` wraps negative t
     correctly (e.g. -0.008 → 0.992 = just before start line).
   - *Open tracks*: Row k at `t = (totalRows − k) × rowGapPx / pathLengthPx`. All rows start
     at t > 0 within the path (assembly area). Front row at `totalRows × deltaT`, last row at
     `1 × deltaT`. No clamping needed.
7. `computeSpeedBonus(rowIndex, rowGapPx, pathLengthPx, speedBonusFactor, finishT, isOpen, totalRows)` —
   finishT-calibrated fractional bonus applied to `baseSpeed` for rear rows. Factor 1.0 = exact
   distance compensation = pole neutral. Formula differs by track type (see speedBonus section).
8. `computeMaxRacersDefault(pathLengthPx, racersPerRow, rowGapPx, maxCapacityFactor)` — auto-capacity
   for a track based on path length, pre-computed racersPerRow, and row gap.

**Open-track finish line:** On open tracks `finishT = 1.0 − runoutZone` (default 0.05). The last
5% of the path is the run-out zone — racers cross the finish line and coast to the track end with
`runoutDecay`. Configurable via `raceBehaviorConfig.runoutZone` (Dev Screen).

Config: row-layout params in `racearena:rowLayoutConfig` (`rowGapMultiplier`, `speedBonusFactor`,
`maxCapacityFactor`). Start-layout params in `racearena:raceBehaviorConfig` (`startSpreadRange`,
`runoutZone`). All tunable in Dev Screen. Track-level `maxRacers` shown in TrackManager with
"modified" badge.

## Scale & Size — Single Sources of Truth

*(Added 2026-06-07, feat/open-track-overlap scale-cleanup. This section is load-bearing — read before touching any lateral distance or body-size calculation.)*

### The bug this fixed

Before the scale cleanup, physics was computing in a 449 px world while the screen drew a 300 px track (Space Sprint). The body width used for overlap thresholds was 34 px instead of the 28.5 px actually drawn. The per-side clearance trigger was 5.7 px vs the correct 14.25 px. Racers overlapped visually before avoidance engaged, and the overlap metric stayed flat through many behavior improvements because the foundation was wrong.

### Three single sources of truth

```
trackWidthPx        = track.width  ← stored by Track Editor from _centerWidth (physical lane width)
                      ?? shape.getActualTrackWidth()  ← spline fallback only for tracks without stored width

drawnBodyWidthPx    = bodyRef.bodyNarrow   (from computeBodyNarrowRef — body-narrow visible width)
                    = drawnBodyWidthRefPx  (the camera reference; same value, same source)
                    ← NOT physicalSpriteSize × bodyFillX (that's the frame × fill fraction, not the body)

drawnBodyLengthPx   = drawnBodyWidthRefPx × bodyFillLong / bodyFillNarrow  (square frames, general: × frameWidth/frameHeight)
                    ← derived directly from render primitives; NOT computed from drawnBodyWidthPx variable
```

### physicalY ↔ world-pixel mapping

```
EditorShape.getPosition(t, physicalY / 2)   ← the /2 is inside EditorShape (physicalY = ±1 is edge)

So:  1 physicalY unit = trackWidth / 2  world pixels

Conversion helpers (raceBehavior.js, top of file):
  pxToPhysicalY(px, trackWidth)  = px  / (trackWidth / 2)
  physicalYToPx(phy, trackWidth) = phy * (trackWidth / 2)
```

**ALL lateral physicalY ↔ pixel conversions must go through these helpers.** Using raw `× trackWidth` or `/ trackWidth` misses the factor of 2 and is a real production bug (the BLOCKED-mode off-by-2 caused the blocked state to fire at half the intended pixel distance).

### Naming map (old → new, feat/open-track-overlap)

| Old name | New name | Notes |
|---|---|---|
| `geometricTrackWidthPx` | `trackWidthPx` | racer field; now from track.width not getActualTrackWidth |
| `getTrackWidthPx(racer)` | `getTrackWidthAtTpx(racer)` | single branch; non-uniform track hook in comment |
| `honestBodyWidthPx` | `drawnBodyWidthPx` | true per-type visible body width, not frame × fill |
| `honestBodyLat` (sim) | `drawnBodyWidthPx` | aligned with game field name |
| `honestBodyLong` (sim) | `drawnBodyLengthPx` | aligned with game convention |
| `referenceSpriteSize` | `drawnBodyWidthRefPx` | clarifies it is the camera reference (same value as drawnBodyWidthPx) |
| `spriteWorldSizePx` | `frameSizePx` | it is the full frame envelope, not a "sprite world size" |
| `visibleWidthPx` | `frameSizePx` | merged with spriteWorldSizePx; one field, one name |
| `getSpriteWorldSizePx` | `getFrameSizePx` | getter for frameSizePx |
| `displaySizeScale_physical` | *(inlined)* | was only used to compute physicalSpriteSize; deleted |

### Do NOT touch — invariants

1. **Do NOT use `getActualTrackWidth()` for physics / overlap / clearance.** It is the spline estimate (overestimates on open tracks like Space Sprint: 449 vs 300 px). It stays only as a fallback in the `??` expression for tracks without a stored `width` field.

2. **Do NOT reintroduce raw `physicalY × trackWidth` conversions.** Use `physicalYToPx` / `pxToPhysicalY`. The factor-of-2 lives only in those helpers.

3. **Do NOT change `REFERENCE_TRACK_WIDTH = 98` to compensate for anything.** It is the Dirt Oval calibration anchor for `lateralScale`. Changing it would break all closed-track tuning.

4. **Do NOT use `frameSizePx` (the sprite frame) for body overlap.** Use `drawnBodyWidthPx` / `drawnBodyLengthPx` (the visible body). The frame is larger than the body.

5. **Do NOT derive `drawnBodyLengthPx` from `drawnBodyWidthPx` as a variable.** Both must reference `drawnBodyWidthRefPx` independently so length is not chained through width.

6. **There are NO raw physicalY↔px conversions anywhere.** The previous "L515 exemption" (`frameSizePx / trackWidth` in the free-lane sensor) was fixed in the step after the scale cleanup: `/ trackWidth` gave HALF a frame in physicalY (off by 2×), creating a blind zone where bodies overlapped visually but the sensor missed them (report 35). All lateral thresholds now go through `pxToPhysicalY` / `physicalYToPx`. If you see `/ trackWidth` or `* trackWidth` next to a physicalY quantity, it is a bug.

7. **Camera anisotropy on closed tracks (`bsX ≠ bsY`) is screen-only.** Never pull it into world-space body/clearance math.

### Deferred follow-ups (not blocking)

- **Non-uniform track width (`getWidthAtT(t)`):** The function `getTrackWidthAtTpx` has an extension comment for when tracks with variable width are added. Implement by querying `EditorShape._centerWidth` (or equivalent) at `racer.t` per frame. Do NOT build prematurely.
- **Sim brake-match parity:** `sim-fairness.mjs:~1007` reads `trailer.frameSizePx` (was `visibleWidthPx`) for the dynamic brake-match threshold. Sim racer objects never set `frameSizePx`, so this always falls back to `0.014`. Fix: set `frameSizePx: effectiveDisplaySize` (already set; now correctly named) and verify the threshold matches the game's `dynamicBrakeMatchT`.

## Speed Pipeline (PR-A2 + fix + PR-A2.6)

Race speed is duration-driven. The operator chooses a target duration in the SetupScreen; race
init translates that directly into per-racer `baseSpeed`.

**Formula:**
```
spreadMinFactor  = BASE_SPEED_MIN / BASE_SPEED_MEAN
spreadMaxFactor  = BASE_SPEED_MAX / BASE_SPEED_MEAN

// N-calibrated: E[min of n U(spreadMin, spreadMax)] = spreadMin + range / (n+1)
expectedMinSpreadFactor = spreadMinFactor + (spreadMaxFactor - spreadMinFactor) / (nRacers + 1)

race_baseSpeed = computeRaceBaseSpeed(finishT, targetDuration × expectedMinSpreadFactor × speedMultiplier × closedSsf)
               = finishT / (REFERENCE_FPS × targetDuration × expectedMinSpreadFactor × speedMultiplier × closedSsf)

r.baseSpeed = race_baseSpeed × speedMultiplier × spreadFactor × speedBonusMult
```

- `finishT` — target position: `1.0 − runoutZone` (open track) or lap count 1–4 (closed track).
- `targetDuration` — operator-chosen race duration (open-track slider or closed-track duration
  slider). Fallback: natural duration derived from mean base speed.
- `spreadFactor = random[BASE_SPEED_MIN, BASE_SPEED_MAX] / BASE_SPEED_MEAN` — ±12.9% variation
  around the median; tunable in Dev Screen → **Race Tuning** section (Speed Range block, PR-A3). **Re-rolled periodically during
  the race** (see Re-Roll Mechanism below); only this field changes between rolls.
- `speedBonusMult = 1 + speedBonus` — positional back-row compensation from D7c row layout.
  **Constant over the whole race** — re-rolls never touch it (see speedBonus below).
- `expectedMinSpreadFactor` — N-calibrated expected value of the minimum spreadFactor across all
  racers. With n players drawing from U[spreadMin, spreadMax], the expected minimum is
  `spreadMin + (spreadMax − spreadMin) / (n + 1)`. At n=3: ≈ 0.9355. At n=∞: → spreadMinFactor ≈ 0.871.
  Pre-multiplied into the T argument of `computeRaceBaseSpeed` so the expected last finisher
  cancels out and arrives exactly at `targetDuration`.
- `speedMultiplier` — per-racer-type constant (horse=1.0, rocket=1.25, snail=0.6, …). Pre-multiplied
  into the T argument so it cancels out in each racer's actual finish time.
- `closedSsf` — closed-track path-length normalization: `closedSsf = pathLengthPx / REFERENCE_CLOSED_PATH_PX`
  (3200), computed via `computeClosedTrackSsf` (lapUtils.js). **`closedSsf = 1` for open tracks**, so the
  formula above is the *single* correct one for both track types — there is no separate open/closed
  `race_baseSpeed` formula. For closed tracks it is pre-multiplied into the T argument so the field's
  on-screen pace stays comparable across closed tracks of differing path length. This matches
  `RaceScreen/index.jsx` (~line 487) and the now-unified `sim-fairness.mjs` formula (post `8f57cba`).

**speedBonus (rowLayout.js) — Back-Row Positional Compensation:**
`computeSpeedBonus(rowIndex, rowGapPx, pathLengthPx, speedBonusFactor, finishT, isOpen, totalRows)`
returns a fractional bonus applied as `speedBonusMult = 1 + speedBonus`. Row 0 (Front-Row) gets
`speedBonus = 0`. Rear rows (rowIndex N, N ≥ 1) get a finishT-calibrated bonus so every row
reaches the finish line in the same expected time. Formula:

```
tOffset      = rowGapPx / pathLengthPx
row0Distance = finishT                       (closed track)
             = finishT − totalRows × tOffset (open track: front row already advanced)

bonus_N = N × tOffset / row0Distance × speedBonusFactor
```

**Open-track geometry assumption:** For open tracks the entire field is placed ahead of t = 0
(in the "assembly area"). Row 0 (front) starts at `totalRows × tOffset`, Row N at
`(totalRows − N) × tOffset`. Row 0 must therefore travel `finishT − totalRows × tOffset` to reach
the finish. This `row0Distance` is the divisor in the bonus formula.

**Why not just `N × tOffset`?** The legacy formula `N × tOffset × speedBonusFactor` (pre-Phase-1B)
equals the correct formula only when `row0Distance = 1.0` (i.e. `finishT = 1.0`, closed track,
single lap). For multi-lap races (finishT = 2–10+) the bonus was proportionally too large → Rear-Bias.
For open tracks (finishT ≈ 0.95, `row0Distance` slightly < 1) it was 5% too small → Front-Bias.
For slow racers on short durations (`finishT < 1`) it was proportionally too small → Front-Bias.

**Guard:** If `row0Distance < 1e-9` (epsilon guard) the function returns 0 to prevent division
explosion when the assembly area nearly reaches the finish line. All non-finite inputs also return 0.

Mechanism is positional and deterministic — **not changed by the Re-Roll mechanism**.

**Race-Duration Guarantee (Clarification):** The `targetDuration` formula calibrates the
**median racer** (spreadFactor = 1.0) to finish at `targetDuration × expectedMinSpreadFactor`
(≈ 87% of targetDuration). The actual **race end** — when the last finisher crosses — can
deviate by ±6–8% (1σ) from `targetDuration` due to the intrinsic stochastic spread of N draws
from U[spreadMin, spreadMax]. This deviation is physically invariant to any calibration change;
it is a consequence of `E[min_n] ≠ min_n`. The guarantee is on the *expected* last finisher, not
on any individual run.

`openTrackDurationRange` (lapUtils.js) derives the slider [min=30s, max] from track physics
(path length) so the operator only sees meaningful duration values.

**Re-Roll Mechanism (PR-A2.6):**
During a race each racer's `spreadFactor` is periodically re-drawn to create natural lead
changes and prevent the field from freezing in initial order.

```
rollCount    = max(2, floor(targetDuration / 15))
rollInterval = (0.80 × targetDuration × 1000ms) / rollCount   // ms; always ~12s
```

| Race Duration | rollCount | rollInterval | Last Roll at |
|---|---|---|---|
| 30s | 2 | 12s | 24s (80%) |
| 60s | 4 | 12s | 48s (80%) |
| 90s | 6 | 12s | 72s (80%) |
| 120s | 8 | 12s | 96s (80%) |

Each roll draws a new `spreadFactorTarget` from a distribution centered on the current value
with ±40% of SPREAD_RANGE width, clamped to [SPREAD_MIN, SPREAD_MAX] (Variant B). Per-racer
jitter of ±20% of rollInterval prevents simultaneous rolls. No rolls after 80% of
`targetDuration` so the finishing order stabilizes in the last stretch.

Transition: `spreadFactor` interpolates from old to new value over 2000ms using
`easeInOutCubic` so tempo changes feel gradual. `baseSpeed` is updated live each frame during
the transition. `speedBonusMult` is **never touched** by re-rolls.

**Removed (PR-A2):** `speedScaleFactor` / `SpeedScaleSection` / `DEFAULT_SPEED_SCALE_CONFIG` —
superseded by the duration-driven approach above.

## Race Plan System (Phase 3A)

The Race Plan gives each racer a target finishing area and nudges their speed toward it throughout the race. It is a **soft guidance layer** — trajectory control influences speed but cannot override physics (avoidance, soft steering, speed braking). Final positions emerge from the interaction of Race Plan guidance and physics.

### Area Assignment (`createRacePlan`)

At race start, `createRacePlan(racers, finishT, durationMs, config, seed)` in `modules/racePlanner.js` assigns each racer a **unique target rank** (1..N) via Fisher-Yates shuffle. The shuffle is **completely row-blind** — a racer from the last row is equally likely to draw targetRank=1 as one from row 0. Every racer receives exactly one target; there is no "selected subset." Target ranks are then mapped to five areas:

| Area | Target rank range | Base bonus delta |
|---|---|---|
| B1 | 1–5 (top 7%) | +0.03 |
| B2 | 6–15 (next 14%) | +0.02 |
| B3 | 16–25 (mid 14%) | +0.01 |
| B4 | 26–40 (mid 21%) | 0.00 |
| B5 | 41–N (bottom 44%) | −0.01 |

Two special subsets are identified from the shuffle:
- **Winner** (`winnerRacerId`): the racer who drew targetRank=1.
- **Pulk racers**: 3 racers shuffled from rows 1–3 (middle field, never the winner) — the only selection that uses row position explicitly.

A seeded PRNG provides deterministic results for the same race setup.

### areaBonusMult (Physics-Loop)

`areaBonusMult` is computed per racer each physics step: `1.0 + BASE_DELTA × bonusStrengthMultiplier`. It scales `effectiveSpeed` multiplicatively. After a racer crosses the finish line (`OUTCOME` phase), `areaBonusMult` fades from its current value to 1.0 over 1500 ms using `easeInOutCubic` — preventing abrupt speed changes at the finish.

`racePlanBonusStrengthMultiplier` (default 2.0) is tunable in Dev Screen → Race Tuning → "Race Plan Bonus" and is persisted in `raceDynamicsConfig`.

### Trajectory Controller (`createTrajectoryController`)

A P-controller updates `trajectoryMult ∈ [0.85, 1.10]` each physics step:

```
error = (sollRank − currentRank) / totalRacers   // positive if racer is behind target
trajectoryMult += gain × error × FIXED_DT / 1000
trajectoryMult = clamp(trajectoryMult, 0.85, 1.10)
```

`effectiveSpeed = baseSpeed × spreadFactor × areaBonusMult × trajectoryMult`

The window [0.85, 1.10] was chosen empirically: wider windows cause "Cobra-Sprint" overshoot (racers race past target area); narrower windows lose corrective power.

**Important: the controller does NOT disable per-racer once a racer first reaches its target band.** It runs continuously for every active racer throughout the entire OUTCOME phase (from `choreoOutcomeStart`, default 0.5, to the finish — `corridorStart := pulkEnd`; see PHASE-CONTRACT.md for the authoritative boundaries). After a racer enters its band, the controller continues applying corrections — braking if it overshot its exact rank, boosting if it falls back. This ensures racers stay near their assigned rank for the duration of the OUTCOME window, not just until they first reach it.

### Dynamic Finish Line (Open Tracks)

For open tracks, `finishT` is computed from race physics rather than being a fixed fraction:

```
ssf = clamp(pathLengthPx / 2000, 0.5, 10)        // speed scale factor
finishT = BASE_SPEED_MEAN × ssf × FPS × durationSec / ssf
        = min(BASE_SPEED_MEAN × FPS × durationSec, 1 − runoutZone)
```

This ensures the fastest racer reaches the finish line at approximately `targetDuration` seconds regardless of track length.

### Symmetric Start Rows

Racers are distributed bottom-up, center-out: Row 0 occupies the middle positions, subsequent rows alternate outward. With `N=70` racers and `totalRows=3`: Row 0 occupies positions 24–46 (the middle band), Row 1 and Row 2 fill positions 0–23 and 47–69 respectively. This replaces a top-down layout that gave Row 0 a structural head-start.

### Fairness Simulation Parity

`scripts/sim-fairness.mjs` mirrors the Race Plan logic using `--race-plan=true` and `--bonusMult=<x>`. Every mechanics change must be reflected in both the browser and the sim (Sim-Browser Parity Rule, commit `b9c96d0`). See `reference_sim_fairness_flags.md` in project memory for exact CLI flags.

**Exported metrics from `sim-fairness.mjs`:**
- `computeFairnessStats(raceResults, totalRows, rowSizes)` — chi-square goodness-of-fit across start rows
- `computeZoneSuccessRate(raceEntries)` — per-zone (B1–B5) hit rate: how often does a racer finish in the zone their race plan assigned them? Zone boundaries mirror `racePlanner.js getAreaBounds()` at `bonusStrengthMultiplier=2.0` (B1: ranks 1–5 +6%, B2: 6–15 +4%, B3: 16–25 +2%, B4: 26–40 ±0%, B5: 41+ −2%)

**Per-race lite metrics** (on each `runSingleRace` result):
- `liteZigzagScore` — mean |Δ(physicalYVelocity)| per racer-frame after 4 s warmup. Target: < 0.003. High values indicate excessive lateral oscillation.
- `liteLatSpeedScore` — mean |physicalYVelocity| per racer-frame. Measures overall lateral agitation.
- `liteBrakeRate` — fraction of racer-frames with speed brake active. Expected ~50–85% on dense tracks.
- `liteStableOvertakes` — t-order changes (A passes B) that persist ≥ 5 frames. High values indicate clean passing. Low values indicate "flicker" overtakes from frame-rate noise.
- `liteOverlapRate` — fraction of active racer-pair-frames where racer *centers* are within 10% of each body-fill diameter of each other. **Blind to rendered-body overlap during overtaking** — physics never allows centers that close (L126). Target ≈ 0%; a non-zero value would indicate avoidance has completely broken down.
- `honestOverlapRate` — fraction of active racer-pair-frames (after 4 s warmup) where the rendered body boxes actually overlap (both longitudinal and lateral axes simultaneously). Covers open and closed tracks. Typical open-track values: 0.5–4%; closed short-oval values: 5–8% (pack crowding — not lapping, see Lesson 127).
- `outcomeReached` — fraction of races where the OUTCOME phase was reached (leader past `racePlanCorridorStart`). Expected ~100%; low values indicate racers DNF before the corridor activates.
- `fairChanceExactRate` — fraction of B1-designated racers (targetRank 1–5) finishing at their exact assigned rank. Typical ~18–20%.
- `fairChanceTop5Rate` — fraction of B1-designated racers finishing anywhere in top 5. Typical ~60–65%.
- `fairChanceByRow` — same rates broken down by starting row. Should be flat across rows (row-blind lottery confirmed by N=50 measurement: no back-row penalty found).
- `maxRealSpread` (closed tracks) — max `(t_leading − t_trailing)` in laps. < 1.0 means no lapping occurred.
- `honestSameLapFraction` / `honestCrossLapFraction` (closed tracks) — fraction of honest-overlap events that are same-lap adjacency vs. genuine lapping (|Δt| ≥ 1.0). Measured values: 100% / 0% in all 60-second homogeneous-field tests.
- **Race-plan adherence (zone success rate)** — of all races where a racer was assigned zone B1 (target ranks 1–5), what fraction did it actually finish in positions 1–5? Computed per-zone (B1–B5) by `computeZoneSuccessRate`. B1 adherence is the headline choreography metric. A track+racer combo with B1 adherence < ~50% indicates the Race Plan bonus is insufficient to overcome dense-field blocking or speed mismatch on that pairing.
- **Trapped/trembling** — operationally identified as a combo of high zigzagScore (> 0.003), low stableOvt, and near-zero net progress over a time window. **No dedicated counter in the sim; always inferred from lateral quality metrics above — not directly measured.** A result of "no trapped/trembling events" means none of the indirect indicators triggered, not that trapping was directly ruled out. The stuckModeSuppress system (bilateral avoidance suppression) was added specifically to prevent this pattern (L108).

**Key files:**
- `modules/racePlanner.js` — `createRacePlan`, `createTrajectoryController`, `computeBereichsBonusMap`
- `screens/RaceScreen/index.jsx` — Race Plan activation, `areaBonusMult` in physics loop, fade logic
- `modules/raceDynamicsConfig.js` — `racePlanBonusStrengthMultiplier` storage CRUD
- `screens/RaceScreen/CameraDiagnosticsHUD.jsx` — RP DIAG overlay (5 toggleable panels)
- `scripts/sim-fairness.mjs` — flag-driven fairness/metrics harness (single source shared with the browser)
- `scripts/overnight-pulklr-sweep.sh` (+ `scripts/pp-pulklr-sweep.mjs`) — PulkLeadRotation parameter sweep + post-processing

## Pre-OUTCOME Shaping — one steering path (choreo + PulkLeadRotation)

> **Naming.** This section covers the pre-OUTCOME *physics* shaping. It is **DISTINCT from the CameraDirector** (the camera state machine under "Camera System → Director System" below, which only chooses shots and never touches physics).

The pre-OUTCOME race is shaped by **exactly one steering path** with two unconditional halves — there are **no enable flags**; both run every race. The classic reactive layer (a field-cohesion director plus its separate seeded front-action injector) was **removed entirely**; its only surviving trace is a storage-migration alias in `raceDynamicsConfig.js` that re-homes legacy config keys into the `pulk*` namespace. The two live halves are:

### (a) Trajectory controller — authored choreography + band servo

`modules/racePlanner.js` `createTrajectoryController(racePlan)` returns a `.update()` that runs once per frame and writes **`r.trajectoryMult`** on every racer. It combines authored hero-choreography curves ("choreo") with a servo that steers each racer toward its assigned `targetRank` band. **Heroes are cast at the CHAOS→PULK boundary** (`pulkStart`, default `0.25`); the rest of the field runs at `choreoPackBandStrictness` (the PACK band-loosening). Pre-OUTCOME, non-hero targets are pinned to 1.0; OUTCOME band-steering begins where PULK ends (`corridorStart := pulkEnd`, derived from `choreoOutcomeStart`). At the finish, heroes are held to `choreoReleaseProgress` then released, and each lower band resolves at `choreoResolveB2..B5`. `r.trajectoryMult` is threaded into the t-update multiplier chain in `screens/RaceScreen/index.jsx` alongside `r.areaBonusMult` and `rowEnvMult`.

Config (`storage/defaults.js`): `choreoIntensity` (0.6), `choreoOutcomeStart` (0.5), `choreoReleaseProgress` (0.97), `choreoResolveB2` (0.8) / `B3` (0.7) / `B4` (0.65) / `B5` (0.6), `choreoPackBandStrictness` (0.5), `choreoSuppressChaosBonusB1` (false).

### (a.1) B2-attacker heroes — authored front-action (shipped 2026-07-20)

The front-action feature (`v-b2-heroes-complete`, master `8bf54ca`). Beyond the base `nHeroes` cast, `heroCurveGenerator.js castHeroes` casts `b2AttackHeroes` (default **3**) EXTRA heroes from FRONT-post-chaos B2-finishers, role `attacker-b2`. Each is authored to **climb to ~`b2AttackPeakRank` (5)** in a jittered `b2AttackProgress` window, then its curve steers it back **down** toward `b2AttackFinalRank` — bypassing the standard 0.80 B2 resolve checkpoint (hero-privilege, so the full climb-and-fall fits). Feasibility is enforced at cast time (`attackerTiming` + `racerFeasibility` + `checkFeasible`): an infeasible attacker is skipped, never cast unfair.

**Servo model — band-arrival** (`racePlanner.js`, the `atkParams` branch): while climbing and falling the attacker tracks its curve at **strictness 1.0** (mandatory choreography); the moment it re-enters B2 on the way down (`b2AttackBandArrival=true`, default) the servo **releases** it to free reorder (strictness 0 inside band, re-steer 1.0 if it leaves) for the rest of the race. The scripted duel at the front-of-B2 boundary + that free-reorder phase is what registers as top-5 action. The endpoint stays in B2 (band-reach ≥70%): unlike a free-roaming pack racer, the attacker arrives at its release point with **downward momentum**, so it settles in rather than leaking out.

**Validation:** sim-swept (3 phases) to the winner `count=3, peak=5, band-arrival` — **+21% top-5 OUTCOME action** vs the no-attacker floor, B1/B2 band-reach ≥70% on all four tracks, Holm at the pre-existing 2/4 baseline. `count=0` restores the pre-feature game byte-identical (`4ec8e64…`; the count=3 default fingerprint is `72c3360fb75225ef`). Config (`storage/defaults.js`): `b2AttackHeroes` (3), `b2AttackPeakRank` (5), `b2AttackFinalRank` (7), `b2AttackProgress` ({0.4, 0.7}), `b2AttackResolveProgress` (0.85), `b2AttackBandArrival` (true). DevScreen: B2-count slider (PULK card) + hero-highlight rings (Camera Advanced).

**Shelved release mechanisms** (default-OFF flags, byte-identical off): `packReleaseEnabled` (free the whole pack inside band) breaks B2 band-reach via an **endgame edge-leak** (92% of leaks after progress 0.90); `universalBandArrival` (free B1-heroes + normal pack) holds fairness but costs −6% action. Both confirm the shipping principle: **action comes from steering racers along authored curves, not from releasing the servo** — freeing settles the field. B2-attackers win because they are authored, not free.

### (b) PulkLeadRotation — the PULK-phase front contest

`modules/raceGovernor.js` `applyPulkLeadRotation(racers, finishT, phaseCtx, cfg)` stages the front fight during the PULK phase by writing **`r.governorMult`** — this function is the **only writer** of `governorMult`. It is **rank-blind**: a live leader-brake, a challenger-boost on the racer catching P1, an ex-leader drop-depth release, and a permanent outsider slot. It is **faded to EXACTLY 1.0 by OUTCOME** via `governorPhaseWeight(progress, pulkEndFrac, corrStartFrac)` (`raceGovernor.js:92`) and lives inside the **PULK realism envelope**: an outer `±pulkEnvelopeMaxEffect` clamp (±0.12) and a `pulkEnvelopeMaxStepPerFrame` slew limit (0.01), with an optional `pulkCeilingCap` that caps a boosted racer's resulting speed at the natural band max. Outside the PULK phase every `governorMult` is pinned to exactly 1.0 (`raceGovernor.js:360`).

Config (`storage/defaults.js`): `pulkLeaderBrake` (0.1), `pulkChallengerBoost` (0.06), `pulkFrontPool` (8), `pulkBoostHeadroom` (0.1), `pulkCeilingCap` (true), `pulkEnvelopeMaxEffect` (0.12), `pulkEnvelopeMaxStepPerFrame` (0.01), and the `pulkLeadRotation*` sub-knobs: `AttackerSlots` (2), `DropDepthLengths` (8), `OutsiderMaxReachLengths` (15), `DeadlockTimeoutMs` (12000), `MinHoldMs` (750).

For the conceptual, history-free narrative of this mechanism see [RACE-ACTION.md](RACE-ACTION.md#5-pulkleadrotation--non-hero-front-action).

### Sim parity + measurement

`scripts/sim-fairness.mjs` runs the identical `createTrajectoryController` + `applyPulkLeadRotation` code path (single shared source, the same pattern the t-update `advanceRacerT` uses) so sim and browser stay byte-identical; `scripts/fingerprint-default.mjs` is the byte-identity gate. See [SIM.md](SIM.md) for the metric fields and the pinned calibration case.

## Race Behavior System (D7b — lane-free)

Racer lateral movement is governed by `modules/raceBehavior.js`. All racers share a continuous `physicalY ∈ [-1.0, +1.0]` in normalized track-width space (0 = centerline, ±1 = boundary). `initRacerBehavior` sets every racer to `physicalY = 0` at race start.

**Lateral pipeline (current — two layers, applied once per frame after world positions are computed).** The old additive multi-force stack (home force → sqrt(N)-normalized avoidance → free-lane separation → commit/gap/escape injections → stuck-suppression) was **removed** (Commits A and B of the lateral-physics cleanup). The live model is:

1. **Layer 1 — Soft Steering (the sole lateral force)** — a single target spring: `delta += (target − physicalY) × softSteeringStrength`. The target is the centerline (0) when clear, one body-clearance beside the most-constraining obstacle otherwise (only the trailer is steered; the leader holds its line — the §4a asymmetry is unconditional as of `aef203a`), or the current position (hold) when both sides are blocked. Config: `softSteeringStrength`, `softSteeringSymmetric` (governs only the body-overlap §4b override), `softSteeringClearancePct`, `softSteeringHysteresisY`.
2. **Soft repulsion** — quadratic push back from boundary when `|physicalY| ≥ comfortThreshold`.
3. **Hard clamp** — `physicalY` clamped to `[-maxLateral, +maxLateral]` then `[-1, +1]`; velocity reset to 0 on a boundary hit.
4. **Layer 2 — Hard Separation (positional anti-penetration backstop)** — runs last, gated by `hardSeparationEnabled`; resolves a fraction (`hardSeparationRelaxation`) of any residual body overlap per frame (lateral push first, longitudinal emergency separation when the boundary blocks the lateral move). Strength eases 0→full over `avoidanceWarmupMs` on all tracks.

The **longitudinal** flags are still produced here for the next-frame t-update:

- **Speed brake — body-based both axes (reports 43+45)** — trailer flagged `avoidanceActive = true` when (a) `dT < (contactLength / pathLength) × speedBrakeTMultiplier` (longitudinal: body half-lengths × lead-time multiplier) AND (b) `|dY| < pxToPhysicalY(contactWidth, trackWidth)` (lateral: **same-lane filter only**). Applied next frame via `speedBrakeFactor`. Lead-time expansion (`speedBrakeTMultiplier = 1.5`) applies to the longitudinal axis only.
- **Cone drafting** — follower flagged `draftingBoostActive = true` if within `draftingMaxDistance` world-px of leader AND inside a `draftingConeAngle`-wide cone behind the leader; boost applied next frame via `draftingBoost`.

**physicalYVelocity system (feat/lateral-velocity, 2026-05-31):** the Layer-1 spring output is accumulated into `physicalYVelocity` rather than applied directly to `physicalY`. Each frame: `physicalYVelocity = (physicalYVelocity + delta) × lateralDamping`; then `physicalY += physicalYVelocity`. The damping factor (default `lateralDamping = 0.16`) controls how quickly lateral velocity decays — lower values mean heavier damping. `physicalYVelocity` is clamped by `maxLateral`. This eliminates frame-to-frame zigzag artifacts where racers would oscillate between adjacent positions due to force sign reversals on consecutive frames.

`getPosition(t, physicalY / 2)` on `EditorShape` converts physicalY to world (x, y) — EditorShape's offset parameter is `[-0.5, +0.5]` = inner to outer boundary.

**EditorShape center-path geometry (fixed 2026-05-29, Lessons 97–100):** On tracks with `centerPoints`, `getPosition(t, offset)` now routes through the center-curve path. The prior inner/outer midpoint formula zigzagged by up to 73.7 px at Luger Hill's tightest U-turn because inner and outer, each arc-length-parameterized by their own curve length, are at physically different positions at the same index. The center curve eliminates the mismatch; perpendicular direction uses `angle − π/2` scaled by `track.width`.

All parameters are tunable in the Dev Screen → **Race Tuning** section (PR-A3: formerly the standalone "Race Behavior" section, now consolidated with Base Speed, Row Start, and Re-Roll into one 9-block section). Old `currentLaneY`, `targetLaneY`, and `trackOffset` lane machinery removed in D7b.

## Frame-Timing Architecture (PR #118 + PR #119)

Three interlocking mechanisms stabilise the race at variable browser FPS (typically 30–60 Hz on throttled hardware).

### Fixed-Timestep Physics Accumulator (Variant A — PR #118)

Physics advances in discrete `FIXED_DT = 16 ms` steps regardless of browser frame rate, eliminating the 2:1 speed oscillation that occurred when `requestAnimationFrame` alternated between 16 ms and 33 ms frames.

```
rawDt    = min(ts - lastTs, 50)          // capped at 50 ms to prevent spiral-of-death
physicsAccum += rawDt
while (physicsAccum >= FIXED_DT):
    physicsTs += FIXED_DT
    [snapshot _prevT/_prevX/_prevY/_prevAngle per racer]
    [apply physics: spreadFactor, applyRacerBehavior, computePositions]
    physicsAccum -= FIXED_DT
renderAlpha = physicsAccum / FIXED_DT    // fraction of next step already elapsed
```

Key properties:
- A 50 ms frame fires at most 2 physics steps (catch-up cap); a 5 ms frame fires 0. Total physics time is never lost.
- `physicsTs` is the authoritative race clock — independent of display FPS.
- Re-roll timestamps use `physicsTs`-relative offsets, not wall-time, so race duration is deterministic.

### EMA dt-Smoothing (Variant C — PR #118)

A separate smoothed delta-time (`smoothDt`) is used for cosmetic-only updates (camera lerp factor, track effects, minimap). The physics accumulator always uses raw `rawDt`.

```
smoothDt = alpha × smoothDt + (1 - alpha) × rawDt   // alpha = 0.7 default
```

`dtSmoothingAlpha` is tunable in Dev Screen → Race Tuning → Frame Timing. Range `[0, 0.95]`.

### Render-State Interpolation / Pattern A (PR #119)

Sprites and camera both interpolate between the previous and current physics step using `renderAlpha`:

```
renderRacers = racers.map(r => ({
    ...r,
    t:     lerp(r._prevT,     r.t,     renderAlpha),
    x:     lerp(r._prevX,     r.x,     renderAlpha),
    y:     lerp(r._prevY,     r.y,     renderAlpha),
    angle: lerpAngle(r._prevAngle, r.angle, renderAlpha),   // shortest-arc
}))
```

`renderRacers` is passed to both `drawRacers()` and `CameraDirector.update()`. This keeps sprites and camera in sync — on 0-step frames both stay still; on multi-step frames (up to the 2-step catch-up cap) both jump identically. Before PR #119, the camera tracked raw physics positions (jump on every step) while sprites were interpolated (1 step behind) → visible sprite-camera desync at 38 fps.

The snapshot (`_prevT/_prevX/_prevY/_prevAngle`) is taken at the **start of each physics step** (inside the while loop), so `_prev` is always exactly one step behind `curr` regardless of how many steps fire per frame.

`lerpAngle` uses shortest-arc normalisation to prevent the track-seam wrap bug: at `t = 0/1` on closed tracks, plain `lerp(-π, π, 0.5) = 0` (sprite pointing backward); `lerpAngle` returns `±π` (correct shorter arc).

`renderInterpolation` toggle (Dev Screen → Race Tuning → Frame Timing) enables/disables Pattern A for A/B comparison. Defaults to `true`.

**Implementation:** `client/src/screens/RaceScreen/index.jsx` (physics accumulator, renderRacers map, drawRacers).
**Config:** `client/src/modules/frameTimingConfig.js` + `DEFAULT_FRAME_TIMING_CONFIG` in `storage/defaults.js`.
**Tests:** `frameTimingStabilization.test.js` (20 Variant-A/C tests + 5 Pattern-A tests = 25 total).

**React StrictMode rAF guard (2026-05-28):** React StrictMode double-mounts effects in development (mount → cleanup → mount). Without a cleanup guard, two concurrent rAF loops can run until the ref is overwritten on the second mount. Fix: `cancelled` flag set to `true` in the `useEffect` cleanup; the rAF callback checks `cancelled` before calling `requestAnimationFrame` again. See also Lesson 58.

## Camera System

The race camera lives in `modules/camera/` and supports five director modes:

- **OVERVIEW** — wide shot showing the full track; zoom equals `overviewZoom` (full track fits). On open tracks `_overviewStateZoom = overviewZoom` (direct, not computed from spriteScale — see Lesson 83). After the first finisher crosses the line, OVERVIEW enters **FINISH_OVERVIEW mode**: smooth zoom-out + T-space pan to `finishOverviewLookbackPx` (300 world-px, L88) before the finish line. `_camT` stays at winner.t on entry; `_transitionTargetT = lookbackT`; a dedicated `else if` branch lerps `_camT` toward it in parallel with the zoom-out (L89). The mode waits until all racers have finished.
- **LEADER_ZOOM** — follows the leading racer at elevated zoom
- **BATTLE_ZOOM** — centres on the Greedy-Expansion cluster of racers in close proximity. Isolation phase (brief fixed window) → Expansion phase (grow cluster by proximity). Camera position uses a frozen group snapshot (`_frozenBattleGroup`) so the view stays stable as racers reorder; visual highlights use the live group (Lesson 85). Guards: top-10 racers only, rank span ≤ 5, isolation zone `battleIsolationPx: 300`. P2-drift exit: if the second-place racer drifts > `battleGapThreshold` from 3rd, the cluster dissolves and BATTLE exits.
- **COMEBACK_ZOOM** — tracks the furthest-behind unfinished racer; green highlight ring rendered via `globalAlpha` (not `ctx.filter` — see Lesson 86). Tuned thresholds (Phase 3D): `outcomePhaseThreshold: 0.65`, `comebackMinStartGap: 0.25`, `comebackMaxCurrentRankPct: 0.20`. DIAG shows gainOk / startGapOk / currentRankOk per B1 racer, plus phase gate + leaderProgress.
- **LEAD_CHANGE_ZOOM** — activates when the race leader changes; frames the new and former leader briefly before handing off to LEADER_ZOOM. Pan-snap fix on entry: `_camT` set to leader.t at transition point to avoid jump artifact.

### Director System (Phase 3B)

The director chooses the next camera state from a **weighted candidate pool**. Each state contributes a candidate with a weight derived from recency, race tension, and cooldown timers. The highest-weight candidate wins.

**OVERVIEW-Scheduler:** OVERVIEW is injected periodically as a forced candidate with a configurable cooldown window `[overviewCooldownMin, overviewCooldownMax]`. This guarantees occasional wide shots without requiring OVERVIEW to outcompete other candidates on weight alone.

**Same-state repeat rule (Phase 3D):** If the highest-weight candidate is the same state that is currently active, the transition is immediately interruptible — no minimum dwell time enforced for same-to-same transitions.

**Endgame threshold (Phase 3D):** Leader progress must exceed 90% (was 85%) before the FINISH_OVERVIEW drama fires.

**Entry-phase T-space lerp:** During `_lerpPhase === 'entry'` all states (including OVERVIEW) use `shape.getPosition(_camT)` as the pan target to avoid a hard snap on frame 1 (Lesson 84). `tSpaceLerpActive = true` in this phase means `offsetX = targetOffsetX` (no pixel lerp), so a wrong pan target causes an instant camera jump.

**Pan target ownership (`_setTargets` sole owner — camera refactor 2026-05-26):** `_setTargets` is the single authoritative writer of `targetOffsetX/Y` every frame. During follow phase (`_observerPhase === 'follow'`), it targets the racer's actual world position (leader `x/y`, battle group centroid `x/y`, or comeback racer `x/y`) rather than the track centerline `shape.getPosition(_camT, 0)`. In lead-in and lead-out phases it continues to use `shape.getPosition(_camT, 0)` as a stable anchor. `_computePhasedPanTarget` is a state-controller only — it advances `_camT` and manages phase transitions but writes nothing to `targetOffsetX/Y`. See `docs/camera-target-architecture.md` for the full ownership analysis and execution-order diagram. (Lesson 37)

All modes apply a single world-space affine transform (translate + scale) before the rAF draw. The main camera position is clamped to world bounds so the canvas edge is never exposed. The picture-in-picture minimap (Phase 2.5 F6b) renders a separate scaled view of the full world in the top-right corner with a leader indicator dot.

`CameraDirector.update()` receives `renderRacers` (interpolated racer positions, see Frame-Timing Architecture above) for the RACING phase. COUNTDOWN uses raw `st.racers` (no physics accumulator active during countdown). The steady-state pixel-space lerp in `CameraDirector` (tracking phase, `offsetX += (targetOffsetX - offsetX) × lf`) naturally tracks interpolated targets once `renderRacers` is passed as input.

### Zoom Calibration per State (Schema v14 — Phase 3C)

Camera zoom per state is configured via `spriteScale` — a dimensionless relative factor replacing the former absolute `spritePx` value (Schema v14, migration `chore/sprite-scale-relative`).

```
zoom = spriteScale × FALLBACK_REFERENCE_SPRITE_SIZE / (bsX × displaySize)

Where:
  spriteScale                  — tunable per state (default: OVERVIEW 1.00, LEADER 1.81,
                                   BATTLE 2.81, COMEBACK 1.39, LEAD_CHANGE 1.81)
  FALLBACK_REFERENCE_SPRITE_SIZE — 36 px anchor point (calibrated for a reference track density)
  bsX                          — canvas-to-world scale (CANVAS_W / worldW)
  displaySize                  — effective sprite display size in world pixels
```

`spriteScale = 1.0` produces the same screen size as the natural auto-scaled density result for the current racer count. Values > 1.0 zoom in; values < 1.0 zoom out relative to that baseline.

This replaces the old absolute `spritePx` field which was racer-count-dependent: the same pixel value produced different zooms at 10 vs. 70 racers because `displaySize × displaySizeScale` (the denominator) shifts with racer count (see Lesson 82, Lesson 87).

Config stored in `racearena:cameraZoomConfig` (key `spriteScale` per state). Editable via Dev Screen → **Camera Advanced** section (Phase 3D: two camera sections merged into `CameraAdvancedSection`). Schema version: 14.

## Visual Racer Effects System (Phase VRE)

Trail rendering will be data-driven by a **Surface Class system**. Instead of a static `trailFactory` per racer type, the active trail is determined by the combination of racer type + track + the matching surface class.

### Generator Modules

Four generator modules under `client/src/modules/surface-effects/generators/`:

| Generator | Description |
|---|---|
| `particle` | Individual point/circle particles (e.g. asphalt dust, ice chips) |
| `cloud` | Soft, growing, fading blobs (e.g. sand, snow, earth) |
| `splash` | Fast particles with gravity (e.g. mud splatter, water drops) |
| `line` | Persistent ground-level streaks (e.g. ice scratches) |

Each generator exports a factory:

```javascript
createGenerator(config) → (x, y, speed, angle, surfaceClass) → Particle[]
```

### Surface Class Data Model

A Surface Class references one generator and configures its parameters (color, size, lifetime, spawn rate, etc.). New classes can be added in the UI without code changes, as long as a matching generator exists.

**9 Default Surface Classes (code constants in `defaultClasses.js`):**

| id | Display Label | Generator |
|---|---|---|
| `asphalt` | Asphalt | `particle` |
| `sand` | Sand | `cloud` |
| `earth` | Earth | `cloud` |
| `mud` | Mud | `splash` |
| `grass` | Grass | `particle` |
| `snow` | Snow | `cloud` |
| `ice` | Ice | `line` |
| `water` | Water | `splash` |
| `air` | Air | `particle` |

Default classes are code constants (single source of truth, analogous to racer types). Custom classes and default overrides are stored in the backend.

### Trail Resolution Pipeline (VRE-4)

```
SetupScreen: track.surfaceClasses → raceData.trackSurfaceClasses (sessionStorage)
                                     ↓
RaceScreen init: resolveTrailEmitter(racerType, trackSurfaceClasses)
                                     ↓
  resolveActiveSurfaceClass(racerClasses, trackClasses)  →  first matching class
                                     ↓
  getGeneratorForClass(classId).create(classConfig)      →  emitter { spawn, update, render }
                                     ↓
  r.surfaceEmitter = emitter  (one instance per racer, created once at race start)
  r.surfaceParticles = []
```

**rAF loop (per unfinished racer):**
- `r.surfaceEmitter` present → `spawn(x, y, speed, angle)` + `update(particles, dt/16)` on per-racer particle list
- `r.surfaceEmitter` is null (no match) → `rt.getTrailParticles(...)` → global `dustParticles` pool (native trail, unchanged)

**Render (inside camera transform, world space):**
- `drawSurfaceTrails()` calls `r.surfaceEmitter.render(ctx, r.surfaceParticles)` per racer
- `drawParticles()` renders global `dustParticles` (native trail path)

**native trail Fallback:** If no class from the racer type's `surfaceClasses` list intersects the current track's `surfaceClasses`, the racer falls back to its static `trailFactory` (current behavior, unchanged).

**Key files:**
- `modules/surface-effects/trailResolver.js` — `resolveTrailEmitter(racerType, trackSurfaceClasses)`
- `screens/SetupScreen/SetupScreen.jsx` — writes `trackSurfaceClasses` into `activeRace`
- `screens/RaceScreen/index.jsx` — consumes emitter per racer; falls back to native trail

### Setup Filter

The Setup Screen filters the racer type selector: only racer types with at least one `surfaceClasses` entry overlapping with the chosen track's `surfaceClasses` are shown. Types with no overlap are suppressed or marked incompatible.

### Backend Extension (`/api/surface-classes`)

A new API resource manages surface classes alongside tracks:

- `GET /api/surface-classes` — merged list: default constants + custom entries from server
- `POST /api/surface-classes` — creates a new custom class
- `PUT /api/surface-classes/:id` — updates a class (including default-class parameter overrides)
- `DELETE /api/surface-classes/:id` — removes a custom class (built-in defaults cannot be deleted)

The backend seeds the defaults on first boot if storage is empty. The frontend caches the class list locally (analog to track geometry caching in `trackLoader.js`).

### Sub-PR Structure

| Sub-PR | Scope |
|---|---|
| ✅ VRE-1 — Foundation | Generator modules, Surface-Class data model, `/api/surface-classes` backend, storage. No UI, no race integration. |
| ✅ VRE-2 — Class Editor | "Surface Classes" section in Dev Screen (sidebar, after Tracks). Master-detail layout: class list with Default / Modified / Custom badges on the left; animated live-preview canvas + config editor on the right. `SurfaceClassManager.jsx`, `SurfaceClassPreview.jsx`, `useSurfaceClasses.js`. |
| ✅ VRE-3 — Racer/Track Linking | `surfaceClasses: string[]` on SpriteRacerType + `getSurfaceClasses()`. All 20 racer types assigned. Added to TUNABLE_FIELDS (8 total). `filterRacerTypesForTrack()` in registry.js. Pill multi-selects in RacerEditModal + TrackManager. SetupScreen filter + surface hint. Server startup migration patches existing tracks. |
| ✅ VRE-4 — Race Integration | `trailResolver.js` resolves per-racer emitter at race start. RaceScreen rAF loop drives spawn/update/render via emitter; native trail fallback (trailFactory) when no class matches. `trackSurfaceClasses` added to raceData in SetupScreen. |

### Future: Surface Zones

A follow-on phase will support local surface-class overrides within a track (e.g. a puddle on asphalt, a mud patch on earth). The Track Editor gains a zone-drawing tool; `EditorShape` gains `getZonesAtPosition(t, offset) → Zone[]`. See `docs/TRACK_EDITOR.md — Future Extensions`.

## Backend Architecture (Phase L)

Phase L introduces a local backend running in Docker alongside the existing React client. The frontend remains unchanged — the backend is an independent process.

```
seasonal-race-claude/
├── client/          # React frontend, port 3000
│   └── src/
│       ├── services/
│       │   ├── api.js               # API_BASE_URL — single config point
│       │   ├── apiClient.js         # Shared fetch boilerplate: withTimeout + apiCall (used by trackApi + surfaceClassApi)
│       │   └── trackApi.js          # Write-path client: create/update/deleteTrack, uploadTrackBackground
│       └── modules/storage/
│           ├── trackLoader.js       # fetchServerTracks, cacheTrackGeometry, removeCachedTrackData
│           ├── trackMigration.js    # One-time localStorage→server migration (marker prevents re-runs)
│           └── useServerTracks.js   # React hooks: useServerTracks() + useServerTracksControl()
├── server/          # Node.js / Express backend, port 4000
│   ├── src/
│   │   ├── app.js            # Express app factory (separated for testability)
│   │   ├── index.js          # Server entry point
│   │   └── routes/tracks.js  # GET /api/tracks, /:id, /:id/background
│   ├── data/
│   │   ├── tracks/<id>.json        # Combined preset + geometry (no background bytes)
│   │   └── backgrounds/<id>.jpg    # Binary background image
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml  # Starts server with `docker-compose up`
```

**Track Read API (L.2):**
- `GET /api/tracks` → array of custom track summaries (no geometry arrays)
- `GET /api/tracks/:id` → full track including `innerPoints`/`outerPoints`/`centerPoints`
- `GET /api/tracks/:id/background` → binary JPEG/PNG

**Frontend loading strategy (L.3):**
1. `useServerTracks()` hook fires on component mount (SetupScreen, TrackManager, RaceHistory)
2. `fetchServerTracks()` fetches the list, caches it, then eagerly calls `cacheTrackGeometry()` for each track
3. `cacheTrackGeometry()` stores the full geometry in `racearena:trackGeometries:<geometryId>`. Uses spread+exclusion (`{ ...full }` minus server `id`, `geometryId`, `backgroundImageFile`) so new data-model fields (e.g. `trackLights`, `surfaceClasses`) flow through automatically without code changes here — see Lesson 37. Existing `getTrack(geometryId)` calls in RaceScreen/PresetThumbnail work unchanged.
4. `backgroundImage` in the cached geometry = the live server URL (computed from server track `id`)

**Offline fallback strategy (L.4):**
- Background images are served live from the server URL stored in `geometry.backgroundImage`; no local cache (images 4–10 MB exceed localStorage limits). Offline races run without background.

**Atomic writes:** All JSON writes use `server/utils/atomicWriteJson.js` (write to `.tmp`, then rename; falls back to direct write on OneDrive where `renameSync` can transiently fail).

**Input validation (Sec-1 — C1/C2/H4):** POST and PUT requests to `/api/tracks` are validated before writing:
- `name` — non-empty string, max 100 characters
- `effects[*].config.count` — must be a finite integer, 0–1000
- Geometry coordinates (`centerPoints`, `innerPoints`, `outerPoints`) — must be finite numbers with `|coord| ≤ 10000`
- `importAllStorage` (client-side) validates track entries before writing to localStorage: name length and effects count are checked; invalid entries are skipped with a console warning.

**Upload validation (Sec-2 — C4):** `POST /api/tracks/:id/background` validates the upload against magic bytes (PNG: `89 50 4E 47`, JPEG: `FF D8 FF`, WebP: `RIFF????WEBP`). Non-image MIME types are rejected by multer before buffering; magic-byte check is the authoritative guard. Response includes `X-Content-Type-Options: nosniff`.

**Track Write API (L.5):**
- `POST /api/tracks` — creates track (validates name, closed, worldWidth/worldHeight, geometry arrays); atomic write (temp + rename); returns new track object
- `PUT /api/tracks/:id` — updates track; preserves `geometryId`, `createdAt`, `backgroundImageFile`; atomic write; 404 if not found
- `DELETE /api/tracks/:id` — removes JSON file + background image; 404 if not found
- `POST /api/tracks/:id/background` — multer multipart (10 MB limit); saves to `data/backgrounds/`; returns `{ backgroundImageFile }`; 413 if oversized
- `DELETE /api/tracks/:id/background` — removes background image file and clears `backgroundImageFile` on the track record; returns updated track; 404 if track not found
- `DELETE /api/tracks/:id` returns **403** if `isDefault: true` — default tracks cannot be deleted via API

**Frontend write strategy (L.5):**
- `trackApi.js` — all write ops throw on server error; 8 s timeout wraps every fetch; error message includes `docker-compose up` hint for local dev
- TrackEditor: Save → `createTrackOnServer` / `updateTrackOnServer` → `uploadTrackBackground` if new background file → `cacheTrackGeometry` + `refresh`; `serverError` state shows "Retry" button
- TrackManager: Save (server track) → `updateTrackOnServer` + `refresh`; Save (local track) → `setTracks` (localStorage); Delete (server) → `deleteTrackFromServer` + `refresh` (no client-side geometry cache purge); Geometry edit → `/track-editor?load=<serverId>`
- **Rule:** Every mutation flow that touches a server track (identified via `serverTrackIds.has(id)`) must call the corresponding API function (`updateTrackOnServer` / `deleteTrackFromServer`) and call `refresh()` afterwards. Writing only to `localStorage` via `setTracks()` is insufficient — the `useServerTracks` fetch overwrites local state on next render.
- **PUT validation is partial:** `validateTrackBodyForUpdate` only validates fields actually present in the request body. Geometry fields (`closed`, `centerPoints`, `innerPoints`, `outerPoints`) are optional in PUT — if omitted they are merged from the existing track. POST uses `validateTrackBodyForCreate` which is strict (all geometry fields required). This allows TrackManager to send metadata-only PUTs without re-sending the full geometry.

**Migration strategy (L.5):**
- On first server connection, `migrateLocalTracksToServer()` runs once per browser
- Reads all custom (non-default) tracks from `KEYS.TRACKS`; POSTs each to server; converts data-URL backgrounds to Blob via `fetch(dataUrl).then(r => r.blob())` and uploads
- Removes each track from localStorage on success; marker key `racearena:migration:tracks-to-server-v1` set only after all tracks migrated successfully

**Phase L scope:**
- **L.1–L.5** — ✅ all complete (see BACKLOG.md)

⚠️ **Before VPS deployment: add auth.** Currently any browser visitor has full write access. See Phase 5.

**Frontend config hook** — `client/src/services/api.js` exports `API_BASE_URL` (defaults to
`http://localhost:4000`). Set `VITE_API_URL` in a `.env` file to point at staging or VPS.

## Track Lifecycle and Hybrid Persistence

See `docs/TRACK_LIFECYCLE.md` for the full lifecycle spec. This section summarises the key architectural decisions agreed in the Track Lifecycle Hybrid (TLH) concept phase (2026-05-01).

### Terminology

| Term | Meaning |
|---|---|
| **Track-Preset** | Metadata record: name, icon, color, default racer, surface classes, track lights. Stored in `server/data/tracks/<id>.json`. |
| **Track-Geometry** | Spatial data: background image, inner/outer boundary points, effects, closed flag. Stored in the same JSON file, referenced by `geometryId`. |
| **Server-Track** | A Track-Preset that exists as a real server record (has a `server/data/tracks/<id>.json` file). |
| **Default-Track** | One of the 10 built-in tracks (Dirt Oval, River Run, Space Sprint, Garden Path, City Circuit, Mountainstreet, Ice Track, Seatrack, Searound, Luger Hill). After TLH-1 these are Server-Tracks with empty geometry fields at boot. |
| **Code-Bundle** | `client/src/modules/storage/defaultTracks.js` — the in-code fallback snapshot. Used as last resort when server is unreachable and cache is empty. |

### Persistence Layer (after TLH)

```
Frontend loading order for track list:
  1. Server  (GET /api/tracks — live, authoritative)
  2. Cache   (localStorage racearena:trackGeometries:* — populated after last server fetch)
  3. Code-Bundle (defaultTracks.js — hardcoded snapshot, bootstrap + last-resort fallback)
```

The Code-Bundle initially ships with empty geometry fields (bootstrap). After the user draws the 10 default-track geometries, an **Export button** in the Dev-Screen writes the current server-track state as a JSON snapshot. The user commits this snapshot manually. The snapshot is a deliberate act, not automatic.

### Default-Tracks as Server-Records (TLH-1)

On every server boot, `migrateDefaultTracks()` checks which of the 10 default tracks are missing from `server/data/tracks/` and creates records for any that are absent. The function is fully idempotent — it only creates missing records, never overwrites existing ones. This ensures default tracks are always present even after accidental deletion or data loss. (Before PR #58 this used a one-shot marker file `.default-tracks-seeded`; that approach was replaced because the marker prevented recovery after accidental deletion.)

**Server-wins deduplication:** `getInitialTracks()` (in `trackLoader.js`, used by SetupScreen and TrackManager) merges cached server tracks with code defaults from `defaults.js`, filtering out any code default whose `id` matches a server track (`localTracks.filter(t => !serverIds.has(t.id))`). In practice, once `migrateDefaultTracks()` has seeded the 10 default records, the code-bundle entries in `defaults.js` are never shown to the user — the server versions (which carry real geometry, background URLs, and user edits) take precedence entirely.

`DEFAULT_TRACKS` in the frontend code remains as bootstrap data and Code-Bundle source, not as the authoritative track list.

### Server-PUT Respects Client geometryId (TLH-1)

```
PUT /api/tracks/:id body includes geometryId → server uses client value
PUT /api/tracks/:id body omits geometryId  → server preserves existing.geometryId
```

Before TLH, the PUT handler silently discarded any `geometryId` sent by the client and always kept `existing.geometryId`. This caused the Track Editor to create a new geometry UUID on save while the server-record stayed linked to the old UUID — effectively severing the geometry link invisibly.

### Track-Delete Never Removes Geometry (TLH-1)

`DELETE /api/tracks/:id` removes the track JSON file only. It does **not** call `removeCachedTrackData` for the associated geometry. Orphaned geometries (geometry files whose linked track no longer exists) are preserved indefinitely.

- **Rationale:** Geometry data is expensive to recreate. Automatic deletion on track-delete destroyed user-drawn paths in the bug that triggered TLH. An orphaned geometry harms nothing; a lost geometry cannot be recovered.
- **Future cleanup:** A "Clean up orphaned geometries" action (optional, explicit, UI-triggered) may be added later. It is not part of TLH.

`removeCachedTrackData(geometryId)` removes the geometry cache entry (`racearena:trackGeometries:<geometryId>`) and unregisters it from the index. It is called only from the TrackEditor Delete flow (useTrackIO). TrackManager Delete calls only `refresh()` — geometry entries are preserved indefinitely (see rationale above).

### Draw Geometry Flow with Preset Context (TLH-2)

The "Draw Geometry" button in the Track-Manager Edit-Modal navigates to the Track Editor with the preset ID as a URL parameter:

```
/track-editor?load=<serverId>
```

The Track Editor reads this parameter on mount, loads the existing server-track data (including any previously saved geometry), and — on save — sends a `PUT /api/tracks/<serverId>` with the new geometry fields. No new track record is created.

Before TLH, the button navigated to the Track Editor without any context parameter. The editor defaulted to "new track" mode, created a fresh geometry UUID, and saved it as a new POST — leaving the original preset unlinked.

### Auto-Backup Pipeline (TLH-1)

Every `POST /api/tracks` and `PUT /api/tracks/:id` writes a timestamped backup copy before modifying the authoritative file:

```
server/data/tracks-backups/YYYY-MM-DD/HH-MM-SS-<id>.json
```

No auto-cleanup. Backups accumulate indefinitely (storage is cheap; data loss is expensive). Manual cleanup by deleting backup directories is always safe.

### Status-Banner in Code-Bundle Fallback Mode (TLH-3)

When the frontend is operating in Code-Bundle fallback mode (server unreachable, cache empty):

- A persistent top-of-page banner is shown: **"Server unavailable — showing default tracks (limited functionality)"**
- Write operations (save, delete) are disabled or show a "Server required" error
- The banner disappears automatically once the server becomes reachable again and tracks are refreshed from the server

## Future: Phase 5 Server

A backend will be built in Phase 5 with the following responsibilities:

- **Race-outcome authority** — server finalises and signs race results; client is display-only
- **Leaderboard & seasons** — race outcomes written to a persistent DB; season standings computed server-side
- **Socket.IO event streaming** — server broadcasts authoritative race-tick state; replaces the current client-only physics loop for multiplayer
- **Tech stack (planned):** Node.js / Express, Socket.IO, SQLite (single-server) or Postgres (scaled), JWT session tokens with bcrypt

The Phase 5 server will be a fresh implementation designed around race integrity. The original server scaffold (user-auth REST) was deleted in F16 as architecturally incompatible with this model.

## Physics Parameters

A small set of core physics parameters control racer avoidance, lateral motion, and speed braking. They are **intentionally not exposed in the Dev Screen** — they are strongly interdependent and were optimized via a multi-phase simulation sweep. Accidental changes to any one parameter without re-sweeping the others degrades race quality in non-obvious ways. (The former `homeForceStrength` / `homeForceReductionOnOverlap` home-lane spring was **removed** in the lateral-physics cleanup and no longer exists in `defaults.js`; the live lateral model is Soft Steering + Hard Separation — see the Race Behavior System section above.)

### Current Values (Phase 5 winner, established 2026-06-03; speed-brake body-based 2026-06-08)

| Parameter | Value | Description |
|---|---|---|
| `lateralForce` | 0.011400 | Sideways steering force applied per frame during avoidance |
| `lateralDamping` | 0.160000 | Fraction of lateral velocity retained each frame |
| `avoidanceBufferPct` | 0.200000 | Buffer beyond body contact before avoidance gate fires (20% lead time) |
| `speedBrakeFactor` | 0.945000 | Speed multiplier applied to the trailing racer when side-by-side |
| `speedBrakeTMultiplier` | 1.500000 | Longitudinal lead-time multiplier: brake fires at `bodyContactLength × 1.5` before contact |
| `avoidanceDistance` | 0.180000 | *Retired from browser gate (report 39). Kept for sim-script backward compat.* |
| `speedBrakeYThreshold` | 0.180000 | *Retired from browser brake gate (report 45 — body-based same-lane filter). Kept for sim compat.* |

### Where They Live

Defined in `DEFAULT_RACE_BEHAVIOR_CONFIG` in `client/src/modules/storage/defaults.js`, grouped at the end of the object with a full documentation comment explaining the sweep methodology and how to re-run. They are present in the config schema, localStorage serialization, and all sim scripts — only absent from the UI.

### Why They Are Fixed

These parameters were optimized across 10 default tracks and all 20 default racer types using a 4-phase simulation sweep:

- **Phase 1 (LHS):** 200 Latin Hypercube samples on Dirt Oval + Space Sprint simultaneously
- **Phase 2 (Refine):** Top 5 survivors refined at ±5% and ±2.5% around each winner
- **Phase 3 (Validate):** Top 3 finalists validated on all 10 tracks × 50+ races each
- **Hard cutoffs:** fairness p > 0.05, zigzag score < 0.003, hard overlap rate < 3%

The `speedBrakeTMultiplier` replaces an earlier fixed absolute threshold (`speedBrakeTThreshold`) that was not calibrated to sprite size or path length. As of feat/open-track-overlap (reports 43+45), both speed-brake axes are body-based: the longitudinal zone uses `(bodyContactLength / pathLength) × speedBrakeTMultiplier` (lead-time, fires at 1.5× contact distance); the lateral zone uses the body contact width as a same-lane filter (no multiplier — either in the same lane or not). `avoidanceDistance` is retired from the browser gate (body-based geometric gate replaces it entirely); it remains in `defaults.js` and sim scripts for backward compat. `speedBrakeYThreshold` (0.18) is still read by the browser as a same-lane fallback when track width is unavailable (`raceBehavior.js`); it remains in `defaults.js` for both browser and sim use.

### Changing Them

The values CAN be changed but only in `defaults.js` directly, and only after running a full sim sweep. Steps:

1. Run `scripts/sim-fairness.mjs` with LHS sampling (200 combos) on Dirt Oval + Space Sprint simultaneously
2. Take top 5 survivors; refine with ±5% / ±2.5% sweep
3. Validate top 3 on all 10 tracks with 50+ races each
4. Apply only values that pass all hard cutoffs on all tracks

**Sim scripts:** `scripts/sim-fairness.mjs` (flag-driven harness), `scripts/overnight-pulklr-sweep.sh` (+ `scripts/pp-pulklr-sweep.mjs`), `scripts/fingerprint-default.mjs` (byte-identity gate)

## Background Layer — GPU Compositor Promotion

*(Added 2026-06-09, after bg-layer/promotion investigation.)*

The race canvas is split into two sibling `<canvas>` elements, stacked with CSS `position: absolute`:

1. **Background canvas** — draws the static or animated track background image. Promoted to its
   own GPU compositor layer via `transform: translate3d(0,0,0)` in CSS. Repainted only when the
   background changes (not every rAF).

2. **World canvas** — draws racers, track, particles, and overlays. Occupies the same pixel
   area. Painted every rAF frame.

**Why the split:** Before the split, every rAF frame repainted the background image (full
1280×720 px texture copy) plus all race content in a single canvas. On integrated GPUs this
caused ~33 ms frames at ~10% drop rate during OVERVIEW. Separating the background onto a
promoted layer keeps it in GPU memory; the compositor composites it with the world canvas
without involving the CPU rasterizer. After the fix: OVERVIEW p90 = 16.7 ms, drop rate ≈ 1%.

**The promotion mechanism:** `translate3d(0,0,0)` on the background canvas creates a new GPU
compositor layer (same as `will-change: transform`). The background canvas sits underneath
the world canvas in z-order (lower `z-index`). No JavaScript per-frame work for the
background layer.

**The `overviewMinEffZoom` field** (camera config, default 0/off) was added during this
investigation as a candidate workaround (cap the OVERVIEW zoom to reduce repaint area). It was
not needed after the compositor promotion fix — the zoom-cap approach is redundant. The field
remains at default 0/off and is a candidate for future removal.

---

## Camera — LEADER_ZOOM Entry Zoom Consistency (Fix A)

*(Added 2026-06-10.)*

### The invariant

When the camera transitions to `LEADER_ZOOM` (or `LEAD_CHANGE`) and enters the tracking phase,
`this.zoom` must be at or below `this.targetZoom`. If zoom enters tracking above targetZoom
(overshoot), the coupled pan-target computation (`_setOpenTrackTargets`, call 2) shifts the
pan target every frame as zoom corrects downward, producing a visible camera wobble ("unrund").

### The root cause (before Fix A)

`_leaderPhaseZoomFloor` uses `this.zoom` (the in-flight zoom, low during entry from OVERVIEW
≈ 0.533) to count visible racers. At low zoom the whole field is visible → `visCount ≥ visTarget`
→ the floor never decrements during entry → `targetZoom` stays at the full resolved leaderZoom
(≈ 1.0–1.2). The entry phase chases this high target. When T-space convergence fires (camera
reaches the leadAhead position), `targetZoom` may drop due to world-edge clamping in
`resolveCamera`, while `this.zoom` has already risen past the new lower target. The delta
falls within the `entryConvergenceZoom = 0.05` threshold → entry ends with `zoom > targetZoom`.

### The fix

Change the visibility check in the `_leaderPhaseZoomFloor` block to use `this.targetZoom`:

```js
// CameraDirector.js — _setTargets, inside the _leaderPhaseZoomFloor block
const effZoom = this._isOpenTrack
  ? this.targetZoom * OPEN_TRACK_BASE_ZOOM   // was: this.zoom * ...
  : this.targetZoom * this._bsX;
```

Effect: the floor evaluates visibility at the *intended* zoom (leaderZoom) from frame 1 of
LEADER_ZOOM. During entry, the target zoom is high → fewer racers visible → floor decrements
immediately. By the time entry converges, `targetZoom` has already stepped down toward the
correct tracking value. Entry ends with `zoom ≤ targetZoom` — no overshoot, no correction tail.

**During tracking:** `this.zoom ≈ this.targetZoom` (lerped close), so the change is minimal.

**Verification (camTrace, 2026-06-10):** First tracking frame `z = 0.9876 < tz = 1.0318` (was
`z = 0.985 > tz = 0.957`). Pan error converges in 217 ms vs 1 066 ms in the bad trace.

---

## Development Workflow

RaceArena uses a three-party model for significant features:

1. **Strategic Claude (chat)** — drafts design specs and architecture documents.
2. **User (orchestrator)** — reviews specs, triggers Claude Code execution, resolves conflicts.
3. **Claude Code CLI (executor)** — executes self-contained specs: writes code, tests, docs, commits, opens PRs.

Specs delivered to Claude Code must be self-contained (no follow-up clarification during execution). PR bodies contain the authoritative spec reference. See `docs/PROJECT-PRINCIPLES.md` for the full list of project principles.

---

## 2026-07-10 — INFRA update (sim-trust): shared modules, removals, world hash

Corrects/extends this document after the sim-untangle + gap-space + lengths work. Each claim is
verified at the cited source.

- **Shared per-frame t-update — `client/src/modules/raceStep.js`.** One function `advanceRacerT`
  applies `t += baseSpeed · boost · brake · rowEnvMult · trajectoryMult · areaBonusMult · governorMult`
  with the finish clamp. **Imported by BOTH** the browser engine (`RaceScreen/index.jsx`) and the
  fairness sim (`scripts/sim-fairness.mjs`) — factors 4–8, the multiplication order and the clamp are
  identical by construction. See `docs/FORCE-PARITY.md` for the force-by-force audit.
- **Shared racer-length conversion — `client/src/modules/raceLengths.js`.** `arcT`, `lenScaleFrom`,
  `arcLengths`, `meanDrawnBodyLen` — the one source for "racer lengths" (arc distance ÷ mean body px).
  Imported by the HUD (`GovernorDiagHUD.jsx`), the engine (`index.jsx`), `raceGovernor.js` (which
  re-exports `arcT` for compatibility), the observer (`scripts/sim/observers/gap-metrics.mjs`) and the
  sim. Replaced four inline copies of the same formula. `raceLengths.test.js` proves the extraction is
  bit-identical to the old inline formula (open/closed/lap seam).
- **World hash / simulatability — `client/src/modules/raceConfigWorld.js`.** `WORLD_SCHEMA_VERSION` +
  `hashWorld`; the DevScreen export button lives in `DevScreen/sections/ConfigExportSection.jsx`. The
  sim consumes an exported `world.json` via `--config`; with none, it stamps `ASSUMED-DEFAULTS` and says
  so up front (fail-loud on an old-schema world).
- **Race zones: REMOVED entirely.** No `raceZoneConfig` / `zoneMult` remains in `defaults.js` or
  `raceStep.js` (verified: grep is empty); the DevScreen section and the stored key were purged
  (an old-schema `world.json` that still carries `raceZoneConfig` makes the sim ABORT — golden G3).
- **areaBonus phase-split lives in `racePlanner.js`** and is applied by both engines (browser + sim);
  it is zero for every racer from the chaos boundary onward (`racePlanner.js:523`).
- **`headlessRaceSimulator.js` is a SIMPLIFIED STATISTICAL MODEL, not the game.** It self-declares this
  (its header): it deliberately OMITS `trajectoryMult`, `areaBonusMult`, `governorMult` and the racer
  type's `speedMultiplier`, and uses a circular world approximation. It exists only to measure the
  "racers side-by-side" distribution for DiagnoseVerteilung. **Its numbers do not describe the game** and
  its t-update must NOT be unified with the shared formula — it is a different model on purpose.
