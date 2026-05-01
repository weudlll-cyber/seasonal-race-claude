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
│       │   └── utils/              # Shared helpers (time, math)
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

## Key Design Decisions

- **Phase 1–4 pure client; Phase L adds local backend** — A local Express server (Phase L, PR #43–#44) handles custom track storage and background images. Race state, settings, and results still persist in `localStorage`. The backend runs on port 4000 via `docker compose up`. See [TRACK_EDITOR.md — localStorage Keys](TRACK_EDITOR.md#localstorage-keys) for the key schema.
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

### Data Flow

```
RacerType.surfaceClasses ∩ Track.surfaceClasses
          ↓  (matching class — first intersection wins)
  SurfaceClass → Generator(config) → Particle[]
          ↓
  dustParticles pool (existing RaceScreen infrastructure)
```

**Heimat-Trail Fallback:** If no class from the racer type's `surfaceClasses` list intersects the current track's `surfaceClasses`, the racer falls back to its static `trailFactory` (current behavior, unchanged).

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
| VRE-4 — Race Integration | Trail rendering in RaceScreen switched to surface-class system. Heimat-Trail fallback. Browser test. |

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
3. `cacheTrackGeometry()` stores the full geometry in `racearena:trackGeometries:<geometryId>` — existing `getTrack(geometryId)` calls in RaceScreen/PresetThumbnail work unchanged
4. `backgroundImage` in the cached geometry = the live server URL

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
