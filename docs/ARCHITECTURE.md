# RaceArena — Architecture

## Overview

RaceArena is currently a self-contained React client. All race logic runs in the browser; all persistence uses `localStorage`. A backend server is planned for Phase 5 (see below).

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
│       │   ├── DevScreen/          # Developer / admin panel (7 sections)
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
│       │   ├── camera/             # CameraDirector, Minimap, lapUtils
│       │   ├── racer-types/        # Racer manifests (sprite render, animation, trail, coats)
│       │   │   ├── SpriteRacerType.js  # Config-driven base class for all sprite-based racer types (D3.5)
│       │   │   ├── HorseRacerType.js   # Sprite-based horse with 11 coats (migrates to SpriteRacerType in D3.5.2)
│       │   │   ├── spriteLoader.js     # Async image loader with module cache
│       │   │   ├── spriteTinter.js     # Offscreen-canvas tinting; tintSpriteWithMask for mask-restricted mode
│       │   │   ├── coatAssignment.js   # Hash-based coat selection
│       │   │   └── (DuckRacerType.js, SnailRacerType.js — migrate to SpriteRacerType in D3.5.2; RocketRacerType.js, CarRacerType.js — emoji-only)
│       │   ├── storage/            # localStorage helpers (useStorage, KEYS)
│       │   ├── track-editor/       # Geometry CRUD, Catmull-Rom, EditorShape
│       │   ├── track-effects/      # Animated effect layers
│       │   │   ├── bgImageCache.js # Async image loader with module-level cache
│       │   │   ├── index.js        # listEffects / getEffect / getDefaultConfig
│       │   │   └── effects/        # rain, stars, bubbles, fireflies, dust, mud, wave
│       │   └── utils/              # Shared helpers (time, math)
│       ├── contexts/               # React contexts (TransitionContext)
│       ├── styles/
│       │   └── main.css
│       ├── App.jsx
│       └── main.jsx
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

## Key Design Decisions

- **Pure client for Phases 1–4** — no server dependency. All race state, track geometry, player settings, and results persist in `localStorage` under `racearena:*` keys. See [TRACK_EDITOR.md — localStorage Keys](TRACK_EDITOR.md#localstorage-keys) for the key schema.
- **modules/ are framework-agnostic** — no React imports in `modules/`; screens own the component tree, modules own the logic.
- **Track Editor (Phase 2.5)** — Tracks are authored visually on top of background images. Geometry is stored as inner/outer boundary curves (Catmull-Rom interpolated). See `docs/TRACK_EDITOR.md`.
- **Track Effects replace Environments** — Animated overlays (rain, stars, bubbles, etc.) are opt-in per-track effect layers under `modules/track-effects/`. Up to 3 simultaneous effects per geometry. The old `environments/` module was deleted.
- **Inline draw helpers in RaceScreen** — `drawEditorBackground` and `drawEditorTrackSurface` are currently inlined in `RaceScreen/index.jsx`. Candidate for extraction into a `modules/track-renderer/` module in a future polish sprint (PP-2 in the Phase 2.5 hygiene report).
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

**Open-track finish line (D7c-Phase4):** On open tracks `finishT = 1.0 − runoutZone` (default
0.05). The last 5% of the path is the run-out zone — racers cross the finish line and coast to
the track end with `runoutDecay`. Configurable via `raceBehaviorConfig.runoutZone` (Dev Screen).
`openTrackFinishT` (duration-based) is no longer used for race-end logic.

Config: row-layout params in `racearena:rowLayoutConfig` (`rowGapMultiplier`, `speedBonusFactor`,
`maxCapacityFactor`). Start-layout params in `racearena:raceBehaviorConfig` (`startSpreadRange`,
`runoutZone`). All tunable in Dev Screen. Track-level `maxRacers` shown in TrackManager with
"modified" badge.

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

All parameters are tunable in the Dev Screen (Race Behavior section). Old `currentLaneY`, `targetLaneY`, and `trackOffset` lane machinery removed in D7b.

## Camera System

The race camera lives in `modules/camera/` and supports four director modes:

- **OVERVIEW** — wide shot showing the full track
- **LEADER_ZOOM** — follows the leading racer at 2× zoom
- **BATTLE_ZOOM** — centres on the closest racing pair
- **COMEBACK_ZOOM** — tracks the furthest-behind racer

All modes apply a single world-space affine transform (translate + scale) before the rAF draw. The main camera position is clamped to world bounds so the canvas edge is never exposed. The picture-in-picture minimap (Phase 2.5 F6b) renders a separate scaled view of the full world in the top-right corner with a leader indicator dot.

## Racer-Track-Effects (D6 — reserved)

`SpriteRacerType` accepts an optional `rteDefinitions` array in its config. This array is stored and exposed via `getRteDefinitions()` but is not processed in the current codebase. Phase D6 will introduce an `RteManager` in `RaceScreen` that consumes these definitions to spawn per-racer particle effects triggered by track state (e.g., mud spray on muddy sectors, splash on water crossings). Schema TBD in the D6 spec.

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
