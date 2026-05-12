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
│       │   ├── ResultScreen/       # Post-race podium and history
│       │   ├── DevScreen/          # Developer / admin panel (10 sections, 2-tier Operator/Advanced)
│       │   └── TrackEditor/        # Visual track drawing tool
│       ├── components/             # Reusable UI building blocks
│       │   ├── Button/
│       │   ├── Modal/
│       │   ├── InputField/
│       │   ├── ColorPicker/
│       │   ├── EffectConfig/       # Add/remove/configure track effects (F13)
│       │   ├── LogoUploader/
│       │   └── PresetThumbnail/    # Rendered track preview card
│       ├── modules/                # Domain logic, independent of React
│       │   ├── camera/             # CameraDirector (state machine: OVERVIEW/LEADER/BATTLE/COMEBACK), Minimap, lapUtils, panTarget, openTrackCamera
│       │   ├── racer-types/        # Racer manifests (sprite render, animation, trail, coats)
│       │   │   ├── SpriteRacerType.js  # Config-driven base class for all sprite-based racer types (D3.5)
│       │   │   ├── HorseRacerType.js   # Sprite-based horse with 11 coats (migrates to SpriteRacerType in D3.5.2)
│       │   │   ├── spriteLoader.js     # Async image loader with module cache
│       │   │   ├── spriteTinter.js     # Offscreen-canvas tinting; tintSpriteWithMask for mask-restricted mode
│       │   │   ├── coatAssignment.js   # Hash-based coat selection
│       │   │   └── (DuckRacerType.js, SnailRacerType.js — migrate to SpriteRacerType in D3.5.2; RocketRacerType.js, CarRacerType.js — emoji-only)
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
- **EditorShape linear interpolation (Etappe 26)** — `EditorShape.getPosition()` uses `Math.floor()` + fractional blend between adjacent precomputed samples instead of the former `Math.round()` nearest-neighbour lookup. At 500 samples on a ~2000 px oval at zoom 4×, `Math.round()` caused ~20 px visible racer jumps per frame; linear interpolation eliminates this. Angles are precomputed once in `_precomputeAngles()` and interpolated with shortest-path wrap.
- **CameraDirector — pulk battle trigger + time-based phases (feat/per-state-camera-phase-1)** — `BATTLE_ZOOM` fires when ≥3 of the top-10 racers are within `battlePulkThresholdPx` (default 200 px) of each other, replacing the former fraction-based `battleGapThreshold`. `battleMinDurationMs` (default 3000 ms) prevents flickering when the cluster briefly dissolves. Per-state `leadInDuration` / `leadOutDuration` (seconds) replaced the old pixel-based `leadInDistance` / `followDuration` / `leadOutDistance` fields (schema v5 migration in `cameraConfig.js`).
- **Track Effects replace Environments** — Animated overlays (rain, stars, bubbles, etc.) are opt-in per-track effect layers under `modules/track-effects/`. Up to 3 simultaneous effects per geometry. The old `environments/` module was deleted.
- **Inline draw helpers in RaceScreen** — `drawEditorBackground` and `drawEditorTrackSurface` are inlined in `RaceScreen/index.jsx`. `drawEditorTrackSurface` now only renders the finish line — solid boundary lines and lane fill were removed in the Race Track Lights PR. Candidate for extraction into a `modules/track-renderer/` module in a future polish sprint (PP-2 in the Phase 2.5 hygiene report).
- **Track Lights** — Small glowing dots along both boundaries replace the solid cyan boundary lines. Light positions are cached once at race init via `sampleBoundaryAtInterval` (30 px spacing, ~400 points total for typical tracks). Per-frame, only brightness is recomputed per style (`steady`, `sequence`, `sync_pulse`, `random_flash`). Implementation: `client/src/modules/trackLights.js`. Configuration stored as `trackLights` on track geometry; editable in Track Editor; server-migration sets themed defaults on first startup.
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
7. `computeSpeedBonus(rowIndex, rowGapPx, pathLengthPx, speedBonusFactor)` — fractional bonus
   applied to `baseSpeed` for rear rows. Factor 1.0 = exact distance compensation = pole neutral.
   Applies on both closed and open tracks.
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
`computeSpeedBonus(rowIndex, rowGapPx, pathLengthPx, speedBonusFactor)` returns a fractional
bonus applied as `speedBonusMult = 1 + speedBonus`. Row 0 (Front-Row) gets `speedBonus = 0`.
Rear rows (rowIndex 1, 2, …) get a bonus proportional to `rowIndex × rowGapPx / pathLengthPx`
to compensate the spatial start disadvantage of being `rowIndex × rowGapPx` pixels behind the
finish line. Mechanism is positions-based and temporally invariant — **not changed by the
Re-Roll mechanism**.

**Race-Duration-Garantie (Klarstellung):** The `targetDuration` formula calibrates the
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

## Race Behavior System (D7b — lane-free)

Racer lateral movement is governed by `modules/raceBehavior.js`. All racers share a continuous `physicalY ∈ [-1.0, +1.0]` in normalized track-width space (0 = centerline, ±1 = boundary). `initRacerBehavior` sets every racer to `physicalY = 0` at race start.

**Force pipeline (applied once per frame after world positions are computed):**

1. **Home force** — `Δy = -physicalY × homeForceStrength` (spring toward centerline)
2. **Avoidance** — anisotropic distance metric `sqrt((ΔT×tWeight)² + (ΔY×yWeight)²)` over all unfinished pairs. Trailer (lower t, tie-break by index) yields; leader holds. Force magnitude scales with proximity. Forces are accumulated separately per racer and divided by `sqrt(neighborCount)` before applying (anti-stacking normalization — prevents boundary-clinging at 20+ racers where linear accumulation would overwhelm restoring forces).
3. **Soft repulsion** — quadratic push back from boundary when `|physicalY| ≥ comfortThreshold`
4. **Hard clamp** — `physicalY` clamped to `[-maxLateral, +maxLateral]` then `[-1, +1]`
5. **Speed brake** — trailer flagged `avoidanceActive = true` when adjacent (`|ΔY| < speedBrakeYThreshold` AND `|ΔT| < speedBrakeTThreshold`); applied next frame via `speedBrakeFactor`
6. **Cone drafting** — follower flagged `draftingBoostActive = true` if within `draftingMaxDistance` world-px of leader AND inside a `draftingConeAngle`-wide cone behind the leader; boost applied next frame via `draftingBoost`

`getPosition(t, physicalY / 2)` on `EditorShape` converts physicalY to world (x, y) — EditorShape's offset parameter is `[-0.5, +0.5]` = inner to outer boundary.

All parameters are tunable in the Dev Screen → **Race Tuning** section (PR-A3: formerly the standalone "Race Behavior" section, now consolidated with Base Speed, Row Start, and Re-Roll into one 9-block section). Old `currentLaneY`, `targetLaneY`, and `trackOffset` lane machinery removed in D7b.

## Camera System

The race camera lives in `modules/camera/` and supports four director modes:

- **OVERVIEW** — wide shot showing the full track
- **LEADER_ZOOM** — follows the leading racer at 2× zoom
- **BATTLE_ZOOM** — centres on the closest racing pair
- **COMEBACK_ZOOM** — tracks the furthest-behind racer

All modes apply a single world-space affine transform (translate + scale) before the rAF draw. The main camera position is clamped to world bounds so the canvas edge is never exposed. The picture-in-picture minimap (Phase 2.5 F6b) renders a separate scaled view of the full world in the top-right corner with a leader indicator dot.

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
| `earth` | Erde | `cloud` |
| `mud` | Schlamm | `splash` |
| `grass` | Gras | `particle` |
| `snow` | Schnee | `cloud` |
| `ice` | Eis | `line` |
| `water` | Wasser | `splash` |
| `air` | Luft | `particle` |

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
- `r.surfaceEmitter` is null (no match) → `rt.getTrailParticles(...)` → global `dustParticles` pool (Heimat-Trail, unchanged)

**Render (inside camera transform, world space):**
- `drawSurfaceTrails()` calls `r.surfaceEmitter.render(ctx, r.surfaceParticles)` per racer
- `drawParticles()` renders global `dustParticles` (Heimat-Trail path)

**Heimat-Trail Fallback:** If no class from the racer type's `surfaceClasses` list intersects the current track's `surfaceClasses`, the racer falls back to its static `trailFactory` (current behavior, unchanged).

**Key files:**
- `modules/surface-effects/trailResolver.js` — `resolveTrailEmitter(racerType, trackSurfaceClasses)`
- `screens/SetupScreen/SetupScreen.jsx` — writes `trackSurfaceClasses` into `activeRace`
- `screens/RaceScreen/index.jsx` — consumes emitter per racer; falls back to Heimat-Trail

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
| ✅ VRE-3 — Racer/Track Linking | `surfaceClasses: string[]` on SpriteRacerType + `getSurfaceClasses()`. All 12 racer types assigned. Added to TUNABLE_FIELDS (8 total). `filterRacerTypesForTrack()` in registry.js. Pill multi-selects in RacerEditModal + TrackManager. SetupScreen filter + surface hint. Server startup migration patches existing tracks. |
| ✅ VRE-4 — Race Integration | `trailResolver.js` resolves per-racer emitter at race start. RaceScreen rAF loop drives spawn/update/render via emitter; Heimat-Trail fallback (trailFactory) when no class matches. `trackSurfaceClasses` added to raceData in SetupScreen. |

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
- TrackEditor: Save → `createTrackOnServer` / `updateTrackOnServer` → `uploadTrackBackground` if new background file → `cacheTrackGeometry` + `refresh`; `serverError` state shows "Erneut versuchen" button
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
| **Default-Track** | One of the 5 built-in tracks (dirt-oval, river-run, space-sprint, garden-path, city-circuit). After TLH-1 these are Server-Tracks with empty geometry fields at boot. |
| **Code-Bundle** | `client/src/modules/storage/defaultTracks.js` — the in-code fallback snapshot. Used as last resort when server is unreachable and cache is empty. |

### Persistence Layer (after TLH)

```
Frontend loading order for track list:
  1. Server  (GET /api/tracks — live, authoritative)
  2. Cache   (localStorage racearena:trackGeometries:* — populated after last server fetch)
  3. Code-Bundle (defaultTracks.js — hardcoded snapshot, bootstrap + last-resort fallback)
```

The Code-Bundle initially ships with empty geometry fields (bootstrap). After the user draws the 5 default-track geometries, an **Export button** in the Dev-Screen writes the current server-track state as a JSON snapshot. The user commits this snapshot manually. The snapshot is a deliberate act, not automatic.

### Default-Tracks as Server-Records (TLH-1)

On every server boot, `migrateDefaultTracks()` checks which of the 5 default tracks are missing from `server/data/tracks/` and creates records for any that are absent. The function is fully idempotent — it only creates missing records, never overwrites existing ones. This ensures default tracks are always present even after accidental deletion or data loss. (Before PR #58 this used a one-shot marker file `.default-tracks-seeded`; that approach was replaced because the marker prevented recovery after accidental deletion.)

**Server-wins deduplication:** `loadAllTracks()` (used by SetupScreen, TrackManager) merges code defaults from `defaults.js` with server tracks and filters out any code default whose `id` matches a server track (`localTracks.filter(t => !serverIds.has(t.id))`). In practice, once `migrateDefaultTracks()` has seeded the 5 default records, the code-bundle entries in `defaults.js` are never shown to the user — the server versions (which carry real geometry, background URLs, and user edits) take precedence entirely.

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

## Development Workflow

RaceArena uses a three-party model for significant features:

1. **Strategic Claude (chat)** — drafts design specs and architecture documents.
2. **User (orchestrator)** — reviews specs, triggers Claude Code execution, resolves conflicts.
3. **Claude Code CLI (executor)** — executes self-contained specs: writes code, tests, docs, commits, opens PRs.

Specs delivered to Claude Code must be self-contained (no follow-up clarification during execution). PR bodies contain the authoritative spec reference. See `docs/PROJECT-PRINCIPLES.md` for the full list of project principles.
