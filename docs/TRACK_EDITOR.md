# RaceArena — Track Editor Specification

**Status:** Implemented — Phase 2.5 complete (2026-04-24)
**Branch:** `feat/track-editor` (open PR, CI green)
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

Background images are served from `client/public/assets/tracks/backgrounds/` and are selected in the editor via a dropdown of files in that folder. Images must be placed in the folder manually (commit + push) before they appear in the dropdown. No file upload in v1.

**Rationale:** Keeps v1 purely client-side, no server dependency, fastest path to a working feature. File upload is a known follow-up (see Future Extensions).

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

- **Preset** — configuration of a race: name, icon, duration, winners, which geometry to use, which effects to apply. Managed in the existing Dev Panel `Tracks` section (`TrackManager.jsx`). Persisted via `modules/storage/useStorage` under `KEYS.tracks`.

- **Geometry** — the actual spatial path of the race: background image, inner and outer boundary points, closed/open flag, effects array. Managed by the Track Editor. Persisted under `localStorage` keys `racearena:trackGeometries:<id>`.

A preset references a geometry by geometry id. Multiple presets may reference the same geometry (e.g. "Sunset Derby" and "Midnight Derby" both run on the same oval, with different durations and effects).

The two are edited in different places: presets in the DevScreen Track Manager, geometries in the standalone Track Editor route.

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
  "createdAt": "2026-04-23T21:00:00Z",
  "updatedAt": "2026-04-23T21:30:00Z"
}
```

- `sourceMode` and the optional `centerPoints` + `width` are only present for center-mode tracks. For boundary-mode tracks, they are omitted.
- `innerPoints` and `outerPoints` are always present and authoritative for the race engine.
- `effects` is an array of up to 3 `{id, config}` entries. Empty array = no effects. See [Track Effects](#track-effects) below.
- Minimum 3 points per boundary for a closed track, minimum 2 for an open course.

### Migration

`getTrack()` normalises legacy geometries on load (no stored data is mutated):
- If `effects` array is missing and `effectId` is present → migrated to `[{id, config}]`
- If `effects` array is missing and no `effectId` → migrated to `[]`

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
- Camera director (OVERVIEW / LEADER_ZOOM / BATTLE_ZOOM / COMEBACK_ZOOM)
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

- `getPosition(t, offset, trackWidth)` — returns `{x, y, angle}` at parameter `t ∈ [0, 1]` along the lane
- `isOpen` — boolean, matches the track's `closed` field inverted
- `getCenterFrac` — computed from track extents

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

| Key | Type | Description |
|-----|------|-------------|
| `racearena:trackGeometries:<uuid>` | JSON object | Full geometry record (points, effects, timestamps) |
| `racearena:trackGeometries:index` | JSON array of strings | Index of all geometry UUIDs, sorted by updatedAt desc |
| `racearena:tracks` | JSON array | Preset definitions (name, icon, geometryId, color, duration, etc.) |
| `racearena:racers` | JSON array | Custom racer definitions |
| `racearena:dataVersion` | string | Storage schema version marker |

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

**Integration:**
- Track metadata: difficulty rating, recommended racer types, recommended race length
- Track ratings / usage statistics

---

## Open Questions

- Background images at non-1280×720 aspect ratios are stretched. Is automatic letterbox preferred? Currently stretched is the project convention.
- Should the editor support sub-paths (e.g. a pit lane branching off the main track)? Not in v1; revisit if racing rules ever require it.
