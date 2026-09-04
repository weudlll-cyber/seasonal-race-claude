# RaceArena — Track Editor Specification

**Status:** Implemented — TLH-2 complete (2026-05-02)
**Lead document:** This file is the single source of truth for the Track Editor feature.

---

## Motivation

The original track system used hardcoded SVG paths in `track-path-configs.js` that did not relate to the background images. Racers appeared to drive over image content rather than along it. Hand-aligning paths to images for five tracks was feasible; for fifty it is not.

The Track Editor gives administrators a visual tool to draw the course directly on top of a background image, eliminating the alignment problem and making new track creation a self-service task.

---

## Architectural Decisions

The following five decisions were agreed before implementation began. They are binding — changing any of them triggers a re-plan.

### 1. Track Geometry Representation

Tracks are represented as **two boundary curves**: `innerPoints` and `outerPoints`. Each is a list of `{x, y}` coordinates interpolated with a Catmull-Rom spline. The lane is the area between the two curves. The center line (used for racer progress) is derived by averaging inner and outer curves.

The editor offers two input modes to the admin:

- **Center Mode:** Admin clicks a single center line and sets a global width via slider. The editor automatically computes inner and outer boundaries by offsetting the center line perpendicularly. Best for simple ovals, rectangles, straight sprints.
- **Boundary Mode:** Admin clicks inner and outer boundaries separately. Required for tracks with variable width, asymmetric shapes, or when the boundaries do not stay parallel.

Both modes produce the same stored data structure (`innerPoints` + `outerPoints`). Additionally, a track records its `sourceMode: 'center' | 'boundary'` and — if center mode — the `centerPoints` and `width` it was created from, so the admin can re-edit in the original mode without loss.

**Rationale:** Two-boundary storage covers all real cases (variable-width rivers, asymmetric garden paths). Center mode is pure convenience; the data layer does not diverge.

### 2. Curve Interpolation

Catmull-Rom spline with a fixed tension of 0.5. Curves pass exactly through the clicked points. Tension is a hardcoded constant — not exposed in the editor UI for v1.

**Rationale:** Industry-standard choice for "user clicks points, line should be smooth". Bezier with explicit control points was considered and rejected as more complex UX than this feature warrants.

### 3. Closed vs Open Tracks

The admin selects "Closed Loop" or "Open Course" with an explicit toggle before drawing. Closed loops are multi-lap (lap count derived from race duration as today). Open courses are single traversal, with the first point as start and the last point as finish. A "Reverse Direction" button flips start/finish if the admin drew in the wrong direction.

**Rationale:** Matches the existing race engine's closed/open distinction. No implicit detection ("did the last point land near the first?") — always explicit.

### 4. Persistence

Tracks are stored in `localStorage` under the existing `racearena:*` key convention, consistent with how Dev Panel currently persists custom racers, branding profiles, etc.

~~Background images are served from `client/public/assets/tracks/backgrounds/` and are selected in the editor via a dropdown of files in that folder. Images must be placed in the folder manually (commit + push) before they appear in the dropdown. No file upload in v1.~~

**★ CORRECTED 2026-09-04 (BG-CAPITAL-DUPE-1). NEITHER HALF OF THAT SENTENCE IS TRUE ANY MORE, and
this file calls itself the single source of truth for the feature, so it was a live false claim
rather than history.** The follow-up the rationale below anticipated has SHIPPED: the editor takes a
background by **file upload** (`TrackEditorSaveBar.jsx`'s hidden `<input type="file">`), and a saved
track's background is served by the API from the runtime backgrounds directory —
`GET /api/tracks/:id/background`, out of `<RA_DATA_DIR>/backgrounds`, which `server/seeds/backgrounds/`
seeds. **There is no dropdown, and `client/public/assets/tracks/backgrounds/` is read by nothing** —
the only references left in the tree are test fixtures and one doc-comment example.

*(Found by sweeping for second sites while removing a duplicate file from that folder, not by reading
this document. The neighbouring claim in this same section — that tracks are stored in
`localStorage` — reads stale too after TLH-1 made them Server-Tracks; it is NAMED here rather than
edited, because it is a different fact and checking it properly is its own piece of work.)*

**Rationale (v1, superseded):** Keeps v1 purely client-side, no server dependency, fastest path to a working feature. File upload is a known follow-up (see Future Extensions).

### 5. Migration of Existing Tracks

The five hardcoded SVG-path tracks were removed. Custom tracks drawn in the Track Editor replace them. The admin (user) redraws tracks using the editor.

**Rationale:** Avoids maintaining two track systems in parallel.

---

## Coordinate System

The race canvas is 1280×720. Background images are stretched with `ctx.drawImage(img, 0, 0, 1280, 720)`. Track point coordinates are in the 1280×720 space.

**Project convention:** Background images should be authored at 1280×720 (16:9). Other aspect ratios will be stretched on display. This convention must be documented in the admin UI near the image dropdown. Enforcement is advisory, not technical.

---

## Two Track Concepts — Preset vs Geometry

Tracks have two orthogonal aspects that are managed separately:

- **Track-Preset** — configuration of a race: name, icon, color, default racer type, surface classes, track lights, and a reference to a geometry via `geometryId`. Managed in the DevScreen `Tracks` section (`TrackManager.jsx`). After Phase L / TLH-1, presets are stored as server records in `server/data/tracks/<id>.json`.

- **Track-Geometry** — the actual spatial path of the race: background image, inner and outer boundary points, closed/open flag, effects array, trackLights, surfaceClasses. Managed by the Track Editor. Cached locally in `localStorage` under `racearena:trackGeometries:<id>` for offline race access.

A preset references a geometry by `geometryId`. Multiple presets may reference the same geometry (e.g. "Sunset Derby" and "Midnight Derby" both run on the same oval, with different durations and effects).

The two are edited in different places: presets in the DevScreen Track Manager, geometries in the standalone Track Editor route.

### Server-Track Relationship (Phase L / TLH)

After Phase L, tracks are Server-Tracks: the preset and geometry data live together in a single `server/data/tracks/<id>.json` file. The `geometryId` field on a server-track is the geometry identifier used for the localStorage cache key. The Track Editor's save path sends a `PUT /api/tracks/<id>` to update the geometry fields in place — it does not create a new record.

**Critical invariant:** The server `PUT` handler must respect the `geometryId` value sent by the client. If the client sends a new UUID (e.g. after drawing geometry for the first time), the server stores it. If `geometryId` is absent from the request body, the server keeps the existing value. This ensures the preset stays linked to the correct geometry after every save.

### "Draw Geometry" Flow (after TLH-2)

The "Draw Geometry" button in the Track-Manager Edit-Modal opens the Track Editor with the preset's server ID as a URL parameter:

```
/track-editor?load=<serverId>
```

The editor loads the existing preset data from the server, including any previously saved geometry. On save, it sends `PUT /api/tracks/<serverId>` — updating geometry fields in the existing record. No new track record is created.

**Before TLH-2** this button navigated without context, causing the editor to open in "new track" mode — creating an orphaned record unlinked from the original preset.

### Track Editor — Two Modes (TLH-2)

The Track Editor behaves differently depending on whether a `?load=<serverId>` URL parameter is present.

**Load mode** (`/track-editor?load=<serverId>`):

- Header shows `"Editing: <track name>"` (`data-testid="editor-title"`)
- Name input field is hidden (the preset name is managed in the Track Manager)
- Canvas is pre-populated with existing geometry if available, or starts empty if the track has `geometryId: null`
- Save sends `PUT /api/tracks/<serverId>` — updates the existing server record
- On first save (track had `geometryId: null`), a new UUID is generated (`custom-${crypto.randomUUID()}`) and included in the PUT body so the server stores it permanently

**New track mode** (`/track-editor` — no param):

- Header shows `"New Track"` (`data-testid="editor-title"`)
- Name input field is visible (`data-testid="track-name-input"`)
- Canvas starts empty
- Save sends `POST /api/tracks` — creates a new server record

**Two-path load (load mode):**

1. _Geometry cache path_ — if the server track has a `geometryId` and that geometry is cached in localStorage, load from cache (fast, works offline).
2. _Direct server-track path_ — if the server track has `geometryId: null` or the cache entry is missing, load directly from the server tracks state. The editor starts empty; the `loadedServerId` is set so Save routes to PUT.

### Track-Delete and Geometry Preservation

`DELETE /api/tracks/:id` removes the preset record only. It **never** automatically deletes geometry data. Orphaned geometries (geometry cache entries whose preset no longer exists) are preserved. See `docs/TRACK_LIFECYCLE.md — Track-Delete Behavior`.

### Code-Bundle Fallback

**NOT BUILT.** `client/src/modules/storage/defaultTracks.js` does not exist, and neither does this
fallback; it is deferred as TLH-3 in [TRACK_LIFECYCLE.md](TRACK_LIFECYCLE.md), which owns it.
*(Corrected 2026-09-03, SECOND-SITES-LIVE-1: the two blocks below were written in the present tense
and were the last place in the documents asserting the file exists.)* **As PLANNED**, when the server
is unreachable and the geometry cache is empty, the frontend would fall back to the Code-Bundle
(`defaultTracks.js`), and in that mode:

- A status banner is shown: "Server unavailable — showing default tracks (limited functionality)"
- Default tracks appear with empty geometries (not selectable for races until drawn)
- Write operations are disabled

The Code-Bundle would be updated manually: after the 5 default tracks have been drawn, a Dev-Screen "Export" button (TLH-3) would write a JSON snapshot for the user to commit into `defaultTracks.js`. **Neither the button nor the file exists** — see `TRACK_LIFECYCLE.md`.

---

## Track Data Structure

Stored as JSON in `localStorage` under key `racearena:trackGeometries:<trackId>`.

```json
{
  "id": "custom-<uuid>",
  "name": "City Circuit Night",
  "backgroundImage": "/assets/tracks/backgrounds/city-circuit.png",
  "closed": true,
  "sourceMode": "center",
  "centerPoints": [{ "x": 640, "y": 360 }],
  "width": 120,
  "innerPoints": [{ "x": 500, "y": 360 }],
  "outerPoints": [{ "x": 780, "y": 360 }],
  "effects": [
    { "id": "rain", "config": { "count": 80, "speed": 6 } },
    { "id": "stars", "config": { "count": 120, "twinkleSpeed": 1.5 } }
  ],
  "surfaceClasses": ["asphalt"],
  "trackLights": {
    "color": "#ffffff",
    "style": "sequence",
    "speed": 1.0
  },
  "createdAt": "2026-04-23T21:00:00Z",
  "updatedAt": "2026-04-23T21:30:00Z"
}
```

- `sourceMode` and the optional `centerPoints` + `width` are only present for center-mode tracks. For boundary-mode tracks, they are omitted.
- `innerPoints` and `outerPoints` are always present and authoritative for the race engine.
- `effects` is an array of up to 3 `{id, config}` entries. Empty array = no effects. See [Track Effects](#track-effects) below.
- `surfaceClasses` is an array of Surface-Class IDs (Visual Racer Effects — Phase VRE). Controls which racer types are compatible with this track and which surface-class trail effect is rendered. Missing or empty array = all racer types compatible, all use their Heimat-Trail (backwards-compatible default). See [Surface Classes](#surface-classes-visual-racer-effects) below.
- `trackLights` configures the boundary light dots rendered in the Race Screen instead of solid boundary lines. Fields: `color` (#RRGGBB hex), `style` (`'steady' | 'sequence' | 'sync_pulse' | 'random_flash'`), `speed` (0.1–3.0, relative animation speed; ignored for `steady`). Defaults are applied per default-track ID on server startup (migration) and fall back to `{ color: '#ffffff', style: 'sequence', speed: 1.0 }` for custom tracks. See [Track Lights](#track-lights) below.
- Minimum 3 points per boundary for a closed track, minimum 2 for an open course.

### Migration

`getTrack()` normalises legacy geometries on load (no stored data is mutated):

- If `effects` array is missing and `effectId` is present → migrated to `[{id, config}]`
- If `effects` array is missing and no `effectId` → migrated to `[]`

---

## Track Lights

Each track stores a `trackLights` object controlling how boundary lights appear in the Race Screen.

```json
{ "color": "#3aa0ff", "style": "sequence", "speed": 1.0 }
```

| Field   | Type             | Description                                                           |
| ------- | ---------------- | --------------------------------------------------------------------- |
| `color` | `#RRGGBB` string | Light color (hex).                                                    |
| `style` | string           | Animation style: `steady`, `sequence`, `sync_pulse`, `random_flash`.  |
| `speed` | number           | Animation speed multiplier 0.1–3.0. Ignored when `style` is `steady`. |

**Styles:**

- `steady` — lights glow at constant base brightness (0.4 alpha), no animation.
- `sequence` — a wave of bright light travels along the track in race direction. Wave is ~10 lights wide with smooth falloff. Lights not under the wave dim to base (never off).
- `sync_pulse` — all lights pulse together between base (0.4) and full brightness (1.0) using a sine wave.
- `random_flash` — individual lights flash briefly to full brightness at random intervals (~8% chance per time window); others stay at base.

**Track Editor UI:** The "Track Lights" section in the Track Editor toolbar (below Effects) provides:

- Color picker (`<input type="color">`) + hex display
- Style dropdown (Steady / Sequence / Sync Pulse / Random Flash)
- Speed slider 0.1–3.0 (disabled when style is Steady)

**Server migration:** On server startup, any stored track lacking `trackLights` is patched with a thematically appropriate default (e.g. dirt-oval → orange sequence, river-run → blue sync_pulse).

**Rendering:** `client/src/modules/trackLights.js` — `sampleBoundaryAtInterval` pre-computes ~400 light positions at race init; `drawTrackLights` renders them per frame with glow effect. Solid boundary lines and lane fill are removed from the Race Screen.

---

## Track Effects

Each geometry stores an `effects` array (0–3 entries). Each entry:

```json
{ "id": "rain", "config": { "count": 80, "speed": 6 } }
```

Available effect IDs: `rain`, `stars`, `bubbles`, `fireflies`, `dust`, `mud`, `wave`.

Each effect module under `client/src/modules/track-effects/effects/` exports:

```js
{
  id: string,
  label: string,
  configSchema: Array<{ key, label, type, min, max, step, default }>,
  defaultConfig: object,
  create(canvas, config): { update(dt), render(ctx) }
}
```

The `EffectConfig` component (`client/src/components/EffectConfig/`) provides the editor UI: add/remove effects, select IDs from a dropdown (duplicates prevented), configure parameters per schema. The editor canvas shows a live preview of the selected effects.

---

## Surface Classes (Visual Racer Effects)

**Status:** Planned — Phase VRE-3 adds the Track Manager UI; VRE-1 defines the data model.

Each track stores a `surfaceClasses` array of Surface-Class IDs. These IDs determine:

1. **Trail rendering:** During a race, the active surface class is the intersection of the racer type's `surfaceClasses` and the track's `surfaceClasses`. The matching class's generator module renders the trail. If no class matches, the racer falls back to its Heimat-Trail (`trailFactory`).
2. **Setup filtering:** The Setup Screen only shows racer types that have ≥ 1 overlapping surface class with the track. Types with no overlap are suppressed or marked incompatible.

### Initial Surface-Class Assignments — 9 Default Tracks

| Track          | surfaceClasses       |
| -------------- | -------------------- |
| Dirt Oval      | `['earth']`          |
| River Run      | `['water']`          |
| Space Sprint   | `['air']`            |
| Garden Path    | `['grass', 'earth']` |
| City Circuit   | `['asphalt']`        |
| Mountainstreet | `['asphalt']`        |
| Ice Track      | `['ice', 'snow']`    |
| Seatrack       | `['water']`          |
| Searound       | `['water']`          |

### Track Manager UI (VRE-3)

The Track Manager preset editor gains a **Surface Classes** multi-select field listing all available surface classes (fetched from `/api/surface-classes`). Administrators can assign any combination of classes to a track preset. The geometry editor itself is not changed.

---

## Editor UI Scope — Version 1

**Included (all implemented):**

- Canvas overlay on selected background image
- Mode toggle: Center / Boundary
- Click to add points; drag to move; click to select + Delete to remove; click segment to insert
- Width slider (Center Mode only)
- Closed / Open toggle; Reverse Direction button (Open tracks only)
- Track name input; image dropdown (lists files in backgrounds folder)
- Save, Load, Delete track from localStorage
- Visual overlay: inner curve green, outer curve red, center line blue dashed, lane fill 20% gray
- Undo / Redo (↶/↷ buttons + Ctrl+Z / Ctrl+Shift+Z), 50-entry cap, resets on load/save/delete
- Effect configuration panel (EffectConfig component, up to 3 simultaneous effects)
- Live effect preview on editor canvas (rAF loop, cancelable on unmount or effect change)
- Picture-in-picture minimap with leader indicator
- Camera director (OVERVIEW / LEADER_ZOOM / BATTLE_ZOOM / COMEBACK_ZOOM / LEAD_CHANGE)
- Preset thumbnail cards in SetupScreen

**Deliberately not in v1** (tracked in Future Extensions):

- Track duplication as template
- JSON import/export
- Variable width along a boundary track
- Visible lane-marker rendering at race time
- Grid snap / raster
- Extended keyboard shortcuts (arrow nudge, +/- width)

---

## Race Engine Integration

`EditorShape` replaces `SvgPathShape` as the default shape implementation. It implements the existing shape API:

- `getPosition(t, offset)` — returns `{x, y, angle}` at parameter `t ∈ [0, 1]` along the lane; `offset ∈ [-0.5, +0.5]` = inner to outer boundary
- `getActualTrackWidth(samples?)` — returns median inner-to-outer distance in world pixels (cached); used instead of metadata for all width-dependent calculations
- `isOpen` — boolean, matches the track's `closed` field inverted
- ~~`getCenterFrac` — computed from track extents~~ **— THIS HAS NEVER EXISTED.** *(Corrected 2026-09-02, DOC-TRUTH-2: searched all of `client/`, `server/` and `scripts/` and the whole history — the only commit that ever contained the name is the one that wrote this line. It was false the day it was written, 132 days ago, which is why no later change could have caught it.)*

Internally, `EditorShape` caches the sampled center line and perpendicular-offset calculation so per-frame calls remain cheap.

---

## Environments → Track Effects Refactor

**Before:** `environmentId` selected a class that drew (a) a fallback background, (b) the track surface, and (c) animated effects.

**After (implemented):**

- The background is always the track's `backgroundImage` (no procedural fallback; missing image = black).
- The track surface is implicit in the background image.
- Animated effects are a separate opt-in layer: `effects: Array<{id, config}>`, up to 3 per geometry. Each effect is an independent module under `client/src/modules/track-effects/effects/`.

The old `client/src/modules/environments/` folder was deleted. `getEnvironment` is replaced by `getEffect(id)` + `listEffects()`.

---

## Implementation Plan

All sub-steps are complete. Branch `feat/track-editor` is open as a PR (CI green).

**Original spec (A–F) — all done:**

- A — Track CRUD, Catmull-Rom math, tests
- B — EditorShape adapter, race-engine integration
- C — Editor canvas base (background, points, render)
- D — Center Mode, Boundary Mode, edit operations
- E — Closed/Open toggle, Reverse, name input, image dropdown, track list
- F — Race engine integration, environment refactor, track-effects module

**Post-spec features built on branch:**

- F1–F5: Camera director, minimap, world-space transforms, camera clamping
- F6: Picture-in-picture minimap
- F7: Six new track-effects (bubbles, dust, fireflies, mud, rain, wave) with universal parameter pool
- F8: Preset thumbnail cards
- F9–F10: Legacy identifier cleanup
- F11: Documentation alignment (this update)
- F12: Live effect preview on editor canvas
- F13: Multi-effect array (up to 3 per geometry), EffectConfig component rewrite
- F14: Top-down perspective redesign for rain, bubbles, wave, mud
- F15: Audit fixes (auth scaffold disabled, CORS scoped, dead code removed)
- F16: Server scaffold deleted

---

## localStorage Keys

| Key                                | Type                  | Description                                                        |
| ---------------------------------- | --------------------- | ------------------------------------------------------------------ |
| `racearena:trackGeometries:<uuid>` | JSON object           | Full geometry record (points, effects, timestamps)                 |
| `racearena:trackGeometries:index`  | JSON array of strings | Index of all geometry UUIDs, sorted by updatedAt desc              |
| `racearena:tracks`                 | JSON array            | Preset definitions (name, icon, geometryId, color, duration, etc.) |
| `racearena:racers`                 | JSON array            | Custom racer definitions                                           |
| `racearena:dataVersion`            | string                | Storage schema version marker                                      |

All keys follow the `racearena:*` convention. The `trackGeometries:index` is updated atomically with every save/delete via `trackStorage.js`.

---

## Future Extensions

**Editor UX:**

- Track duplication as a starting template for a variant
- JSON export / import for sharing tracks between installations
- Variable width along a boundary-mode track (per-segment width markers)
- Grid / raster snap
- Multi-select + bulk operations on points
- Catmull-Rom tension slider

**Race-Time Rendering:**

- Visible lane markers (dashed center line, lane dividers) drawn over the image
- Per-track choice of racer-trail style
- `drawEditorBackground` / `drawEditorTrackSurface` inline functions in `RaceScreen` are candidates for extraction into `modules/track-renderer/` (deferred refactor)

**Asset Pipeline:**

- Image upload via editor (file chooser), with server-side storage (Phase 5)
- Automatic image resizing to 1280×720 on upload
- Image library management (list, rename, delete uploaded images)

**Track Effects:**

- Effect trigger conditions (e.g. fireworks on final lap)
- Performance optimisation for high particle counts with multiple stacked effects
- Additional effect types (snow, confetti, heat shimmer)

**Surface Zones (Folge-Phase nach Visual Racer Effects):**

- Local surface-class overrides within a track — e.g. a mud patch on an asphalt circuit, a puddle on a garden path.
- Zone definition: `{ id, type: surfaceClassId, tStart, tEnd, lateralRange }` stored in the track geometry.
- Track Editor gains a Zones tab: click on the canvas to set zone start/end, select class from dropdown.
- Visual overlay: semi-transparent colored bands along the zone extent on the editor canvas.
- `EditorShape.getZonesAtPosition(t, offset) → Zone[]` — used by RaceScreen to query the active zone for each racer per frame.

**Integration:**

- Track metadata: difficulty rating, recommended racer types, recommended race length
- Track ratings / usage statistics

---

## Open Questions

- Background images at non-1280×720 aspect ratios are stretched. Is automatic letterbox preferred? Currently stretched is the project convention.
- Should the editor support sub-paths (e.g. a pit lane branching off the main track)? Not in v1; revisit if racing rules ever require it.
