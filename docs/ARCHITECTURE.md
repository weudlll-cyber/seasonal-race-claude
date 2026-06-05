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
│       │   │   ├── index.jsx       # Main component (~1528 lines, hygiene sprint + body-dimensions)
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
│       │   │       ├── BehaviorTuningSection.jsx   # behaviorConfig: avoidance, drafting, home force
│       │   │       ├── DynamicsTuningSection.jsx   # speedConfig, rowConfig, dynamicsConfig, frameTiming
│       │   │       ├── SubCard.jsx                 # Shared SubCard wrapper (extracted from RaceTuning)
│       │   │       └── PrioritySystemSection.jsx   # Priority system (standalone, pre-existing)
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

│       │   ├── surface-effects/    # Visual Racer Effects system (planned — VRE-1+)
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
│   ├── API.md                      # Phase 5 placeholder
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
1. `EditorShape.getActualTrackWidth()` — samples 20 evenly-spaced positions and returns the
   median inner-to-outer distance in world pixels. This is the ground-truth geometric width —
   it scales correctly with any world size. The `trackWidth` metadata field has been removed
   from the track data model (D7c-fix-v2); all width-dependent calculations use this method.
2. `effectiveWidth = geometricTrackWidthPx × startSpreadRange` — the region actually used by
   racers at start. This ensures the packing formula matches the actual lateral distribution.
3. `computeRacersPerRow(effectiveWidth, spriteWorldSizePx)` — computes how many
   sprites fit shoulder-to-shoulder: `floor(2 × effectiveWidth / spriteWorldSizePx)`.
   Stays in world-pixel space — correct at any world size.
   `spriteWorldSizePx = displaySize × displaySizeScale` (same values as the render pipeline).
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

## Speed Pipeline (PR-A2 + fix + PR-A2.6)

Race speed is duration-driven. The operator chooses a target duration in the SetupScreen; race
init translates that directly into per-racer `baseSpeed`.

**Formula:**
```
spreadMinFactor  = BASE_SPEED_MIN / BASE_SPEED_MEAN
spreadMaxFactor  = BASE_SPEED_MAX / BASE_SPEED_MEAN

// N-calibrated: E[min of n U(spreadMin, spreadMax)] = spreadMin + range / (n+1)
expectedMinSpreadFactor = spreadMinFactor + (spreadMaxFactor - spreadMinFactor) / (nRacers + 1)

race_baseSpeed = computeRaceBaseSpeed(finishT, targetDuration × expectedMinSpreadFactor × speedMultiplier)
               = finishT / (REFERENCE_FPS × targetDuration × expectedMinSpreadFactor × speedMultiplier)

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

The Race Plan gives each racer a target finishing area and nudges their speed toward it throughout the race. It is a **soft guidance layer** — trajectory control influences speed but cannot override physics (avoidance, home force). Final positions emerge from the interaction of Race Plan guidance and physics.

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

### bereichsBonusMult (Physics-Loop)

`bereichsBonusMult` is computed per racer each physics step: `1.0 + BASE_DELTA × bonusStrengthMultiplier`. It scales `effectiveSpeed` multiplicatively. After a racer crosses the finish line (`OUTCOME` phase), `bereichsBonusMult` fades from its current value to 1.0 over 1500 ms using `easeInOutCubic` — preventing abrupt speed changes at the finish.

`racePlanBonusStrengthMultiplier` (default 2.0) is tunable in Dev Screen → Race Tuning → "Race Plan Bonus" and is persisted in `raceDynamicsConfig`.

### Trajectory Controller (`createTrajectoryController`)

A P-controller updates `trajectoryMult ∈ [0.85, 1.10]` each physics step:

```
error = (sollRank − currentRank) / totalRacers   // positive if racer is behind target
trajectoryMult += gain × error × FIXED_DT / 1000
trajectoryMult = clamp(trajectoryMult, 0.85, 1.10)
```

`effectiveSpeed = baseSpeed × spreadFactor × bereichsBonusMult × trajectoryMult`

The window [0.85, 1.10] was chosen empirically: wider windows cause "Cobra-Sprint" overshoot (racers race past target area); narrower windows lose corrective power.

**Important: the controller does NOT disable per-racer once a racer first reaches its target band.** It runs continuously for every active racer throughout the entire OUTCOME phase (55%–95% of race duration). After a racer enters its band, the controller continues applying corrections — braking if it overshot its exact rank, boosting if it falls back. This ensures racers stay near their assigned rank for the duration of the OUTCOME window, not just until they first reach it.

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
- `screens/RaceScreen/index.jsx` — Race Plan activation, `bereichsBonusMult` in physics loop, fade logic
- `modules/raceDynamicsConfig.js` — `racePlanBonusStrengthMultiplier` storage CRUD
- `screens/RaceScreen/CameraDiagnosticsHUD.jsx` — RP DIAG overlay (5 toggleable panels)
- `scripts/param-sweep-full.mjs` — 8-parameter Latin Hypercube Sampling sweep
- `scripts/sweep-lateral.mjs` — targeted 2D sweep `lateralDamping × lateralForce`
- `scripts/compare-zones.mjs` — zone success rate comparison between two parameter sets

## Race Behavior System (D7b — lane-free)

Racer lateral movement is governed by `modules/raceBehavior.js`. All racers share a continuous `physicalY ∈ [-1.0, +1.0]` in normalized track-width space (0 = centerline, ±1 = boundary). `initRacerBehavior` sets every racer to `physicalY = 0` at race start.

**Force pipeline (applied once per frame after world positions are computed):**

1. **Home force** — `Δy = -physicalY × homeForceStrength × factor`, where `factor = homeForceReductionOnOverlap` (default 0.3) when the racer is in geometric overlap, or 1.0 otherwise. Reduction lets free-lane separation dominate during collisions instead of being overridden by the restoring spring.
2. **Avoidance** — anisotropic distance metric `sqrt((ΔT×tWeight)² + (ΔY×yWeight)²)` over all unfinished pairs. Trailer (lower t, tie-break by index) yields; leader holds. Force magnitude scales with proximity. Forces are accumulated separately per racer and divided by `sqrt(neighborCount)` before applying (anti-stacking normalization — prevents boundary-clinging at 20+ racers where linear accumulation would overwhelm restoring forces).
3. **Free-lane separation** — additive impulse applied when two racers are in geometric overlap (`|ΔT| ≤ spriteSize/pathLength` AND `|ΔY| ≤ spriteSize/trackWidth`). For each overlapping pair, left/right free-space is probed via `isSideFree()`. Each racer moves toward its first free side; if both sides free, a stable hash (`stablePairBit`) provides a deterministic split direction. Accumulates into `yFreeLaneDeltas` alongside avoidance deltas. Delta accumulation also normalized by `sqrt(overlapNeighborCount)` to prevent force stacking.
4. **Soft repulsion** — quadratic push back from boundary when `|physicalY| ≥ comfortThreshold`
5. **Hard clamp** — `physicalY` clamped to `[-maxLateral, +maxLateral]` then `[-1, +1]`
6. **Speed brake** — trailer flagged `avoidanceActive = true` when adjacent (`|ΔY| < speedBrakeYThreshold` AND `|ΔT| < speedBrakeTThreshold`); applied next frame via `speedBrakeFactor`
7. **Cone drafting** — follower flagged `draftingBoostActive = true` if within `draftingMaxDistance` world-px of leader AND inside a `draftingConeAngle`-wide cone behind the leader; boost applied next frame via `draftingBoost`

**physicalYVelocity system (feat/lateral-velocity, 2026-05-31):** All force pipeline outputs are now accumulated into `physicalYVelocity` rather than applied directly to `physicalY`. Each frame: `physicalYVelocity = physicalYVelocity * lateralDamping + netForce`; then `physicalY += physicalYVelocity`. The damping factor (default `lateralDamping=0.25`) controls how quickly lateral velocity decays — lower values mean more inertia and smoother motion. `physicalYVelocity` is clamped by `maxLateral`. This eliminates frame-to-frame zigzag artifacts where racers would oscillate between adjacent positions due to force sign reversals on consecutive frames. Sim sweep result: `lateralDamping=0.25, lateralForce=0.012` reduces `lateralSpeedScore` by 37% and `zigzagScore` by 44% vs. the prior baseline at equivalent overlap rates.

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
- A 50 ms frame fires 3 physics steps; a 5 ms catch-up frame fires 0. Total physics time is never lost.
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

`renderRacers` is passed to both `drawRacers()` and `CameraDirector.update()`. This keeps sprites and camera in sync — on 0-step frames both stay still; on 3-step frames both jump identically. Before PR #119, the camera tracked raw physics positions (jump on every step) while sprites were interpolated (1 step behind) → visible sprite-camera desync at 38 fps.

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

Config stored in `racearena:cameraZoomConfig` (key `spriteScale` per state). Editable via Dev Screen → **Camera Advanced** section (Phase 3D: `CameraZoomTuningSection` + `CameraStateHudSection` merged into `CameraAdvancedSection`). Schema version: 14.

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
│       │   └── trackApi.js          # Write-path client: create/update/deleteTrack, uploadTrackBackground
│       └── modules/storage/
│           ├── trackLoader.js       # fetchServerTracks, cacheTrackGeometry, removeCachedTrackData
│           ├── trackCache.js        # Background image cache (data-URLs, 3 MB LRU)
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
- After geometry caching, `_cacheBackgroundAsync()` fetches the background and stores it as a data-URL in `racearena:cache:backgrounds`
- `getTrackBackgroundUrl(trackId)` returns the cached data-URL when available, server URL otherwise
- Cache is capped at 3 MB; oldest entries are evicted first (LRU)
- Quota errors from `storageSet` are caught silently

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
- TrackManager: Save (server track) → `updateTrackOnServer` + `refresh`; Save (local track) → `setTracks` (localStorage); Delete (server) → `deleteTrackFromServer` + `removeCachedTrackData`; Geometry edit → `/track-editor?load=<serverId>`
- **Rule:** Every mutation flow that touches a server track (identified via `serverTrackIds.has(id)`) must call the corresponding API function (`updateTrackOnServer` / `deleteTrackFromServer`) and call `refresh()` afterwards. Writing only to `localStorage` via `setTracks()` is insufficient — the `useServerTracks` fetch overwrites local state on next render.
- **PUT validation is partial:** `validateTrackBodyForUpdate` only validates fields actually present in the request body. Geometry fields (`closed`, `centerPoints`, `innerPoints`, `outerPoints`) are optional in PUT — if omitted they are merged from the existing track. POST uses `validateTrackBodyForCreate` which is strict (all geometry fields required). This allows TrackManager to send metadata-only PUTs without re-sending the full geometry.

**Migration strategy (L.5):**
- On first server connection, `migrateLocalTracksToServer()` runs once per browser
- Reads all custom (non-default) tracks from `KEYS.TRACKS`; POSTs each to server; converts data-URL backgrounds to Blob via `fetch(dataUrl).then(r => r.blob())` and uploads
- Removes each track from localStorage on success; marker key `racearena:migration:tracks-to-server-v1` set only after all tracks migrated successfully

**Stale-cache cleanup (L.5):**
- `fetchServerTracks()` calls `purgeStaleServerGeometries()` before writing the fresh list to cache
- For each track in the old cache absent from the new list, `removeCachedTrackData(geometryId, trackId)` is called
- Removes geometry from `racearena:trackGeometries:<id>` and background from `racearena:cache:backgrounds`

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
| **Default-Track** | One of the 9 built-in tracks (Dirt Oval, River Run, Space Sprint, Garden Path, City Circuit, Mountainstreet, Ice Track, Seatrack, Searound). After TLH-1 these are Server-Tracks with empty geometry fields at boot. |
| **Code-Bundle** | `client/src/modules/storage/defaultTracks.js` — the in-code fallback snapshot. Used as last resort when server is unreachable and cache is empty. |

### Persistence Layer (after TLH)

```
Frontend loading order for track list:
  1. Server  (GET /api/tracks — live, authoritative)
  2. Cache   (localStorage racearena:trackGeometries:* — populated after last server fetch)
  3. Code-Bundle (defaultTracks.js — hardcoded snapshot, bootstrap + last-resort fallback)
```

The Code-Bundle initially ships with empty geometry fields (bootstrap). After the user draws the 9 default-track geometries, an **Export button** in the Dev-Screen writes the current server-track state as a JSON snapshot. The user commits this snapshot manually. The snapshot is a deliberate act, not automatic.

### Default-Tracks as Server-Records (TLH-1)

On every server boot, `migrateDefaultTracks()` checks which of the 7 default tracks are missing from `server/data/tracks/` and creates records for any that are absent. The function is fully idempotent — it only creates missing records, never overwrites existing ones. This ensures default tracks are always present even after accidental deletion or data loss. (Before PR #58 this used a one-shot marker file `.default-tracks-seeded`; that approach was replaced because the marker prevented recovery after accidental deletion.)

**Server-wins deduplication:** `loadAllTracks()` (used by SetupScreen, TrackManager) merges code defaults from `defaults.js` with server tracks and filters out any code default whose `id` matches a server track (`localTracks.filter(t => !serverIds.has(t.id))`). In practice, once `migrateDefaultTracks()` has seeded the 7 default records, the code-bundle entries in `defaults.js` are never shown to the user — the server versions (which carry real geometry, background URLs, and user edits) take precedence entirely.

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

On the frontend, `removeCachedTrackData` is called with `{ trackOnly: true }` — removes the track-list cache entry and the background image cache, but leaves `racearena:trackGeometries:<id>` intact.

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

Eight core physics parameters control racer avoidance, lateral motion, speed braking, and home force. They are **intentionally not exposed in the Dev Screen** — they are strongly interdependent and were optimized via a multi-phase simulation sweep. Accidental changes to any one parameter without re-sweeping the others degrades race quality in non-obvious ways.

### Current Values (Phase 5 winner, established 2026-06-03)

| Parameter | Value | Description |
|---|---|---|
| `lateralForce` | 0.011400 | Sideways steering force applied per frame during avoidance |
| `lateralDamping` | 0.160000 | Fraction of lateral velocity retained each frame |
| `homeForceStrength` | 0.030000 | Spring strength pulling racers back to the centerline |
| `homeForceReductionOnOverlap` | 0.300000 | Home force multiplier during geometric overlap |
| `avoidanceDistance` | 0.180000 | Anisotropic distance threshold for avoidance to fire |
| `speedBrakeFactor` | 0.945000 | Speed multiplier applied to the trailing racer when side-by-side |
| `speedBrakeTMultiplier` | 1.500000 | Brake fires this many sprite-widths before contact (dynamic threshold) |
| `speedBrakeYThreshold` | 0.180000 | Max lateral separation for speed brake to activate |

### Where They Live

Defined in `DEFAULT_RACE_BEHAVIOR_CONFIG` in `client/src/modules/storage/defaults.js`, grouped at the end of the object with a full documentation comment explaining the sweep methodology and how to re-run. They are present in the config schema, localStorage serialization, and all sim scripts — only absent from the UI.

### Why They Are Fixed

These parameters were optimized across 9 default tracks + 1 user-created track (Luger Hill) and all 20 default racer types using a 4-phase simulation sweep:

- **Phase 1 (LHS):** 200 Latin Hypercube samples on Dirt Oval + Space Sprint simultaneously
- **Phase 2 (Refine):** Top 5 survivors refined at ±5% and ±2.5% around each winner
- **Phase 3 (Validate):** Top 3 finalists validated on all 10 tracks × 50+ races each
- **Hard cutoffs:** fairness p > 0.05, zigzag score < 0.003, hard overlap rate < 3%

The `speedBrakeTMultiplier` replaces an earlier fixed absolute threshold (`speedBrakeTThreshold`) that was not calibrated to sprite size or path length — it fired too late on the Ice Track (large luge sprite) and too early on open tracks with long paths. The new dynamic formula `(spriteWorldSizePx / pathLengthPx) × multiplier` fires at the same relative proximity (in sprite-widths) on every track and racer type.

### Changing Them

The values CAN be changed but only in `defaults.js` directly, and only after running a full sim sweep. Steps:

1. Run `scripts/sim-fairness.mjs` with LHS sampling (200 combos) on Dirt Oval + Space Sprint simultaneously
2. Take top 5 survivors; refine with ±5% / ±2.5% sweep
3. Validate top 3 on all 10 tracks with 50+ races each
4. Apply only values that pass all hard cutoffs on all tracks

**Sim scripts:** `scripts/sim-fairness.mjs`, `scripts/sim-sweep.mjs`

## Development Workflow

RaceArena uses a three-party model for significant features:

1. **Strategic Claude (chat)** — drafts design specs and architecture documents.
2. **User (orchestrator)** — reviews specs, triggers Claude Code execution, resolves conflicts.
3. **Claude Code CLI (executor)** — executes self-contained specs: writes code, tests, docs, commits, opens PRs.

Specs delivered to Claude Code must be self-contained (no follow-up clarification during execution). PR bodies contain the authoritative spec reference. See `docs/PROJECT-PRINCIPLES.md` for the full list of project principles.
