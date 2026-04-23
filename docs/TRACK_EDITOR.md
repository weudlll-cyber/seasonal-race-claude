# RaceArena — Track Editor Specification

**Status:** Planned (as of 2026-04-23)
**Target phase:** Phase 2.5 (between Race Engine and Result Screen polish)
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

The five existing tracks (oval, s-curve, spiral, zigzag, rectangle with hardcoded SVG paths) will be **removed**. The admin (user) will redraw them in the new editor once it is functional. The application will be unplayable during the transition between old-code-removed and new-tracks-drawn; this is accepted.

**Rationale:** Avoids maintaining two track systems in parallel. The user's original complaint was that old tracks did not align with images; redrawing them in the editor solves that directly.

---

## Coordinate System

The race canvas is 1280×720. Background images are stretched with `ctx.drawImage(img, 0, 0, 1280, 720)`. Track point coordinates are in the 1280×720 space.

**Project convention:** Background images should be authored at 1280×720 (16:9). Other aspect ratios will be stretched on display. This convention must be documented in the admin UI near the image dropdown. Enforcement is advisory, not technical.

---

## Two Track Concepts — Preset vs Geometry

Tracks have two orthogonal aspects that are managed separately:

- **Preset** — configuration of a race: name, icon, duration, winners, which geometry to use, which effects layer. Managed in the existing Dev Panel `Tracks` section (`TrackManager.jsx`). Persisted via `modules/storage/useStorage` under `KEYS.tracks`.

- **Geometry** — the actual spatial path of the race: background image, inner and outer boundary points, closed/open flag. Managed by the Track Editor (this spec). Persisted under `localStorage` keys `racearena:trackGeometries:<id>`.

A preset references a geometry by geometry id. Multiple presets may reference the same geometry (e.g. "Sunset Derby" and "Midnight Derby" both run on the same oval, with different durations and effects).

The two are edited in different places: presets in the DevScreen Track Manager, geometries in the standalone Track Editor route.

---

## Track Data Structure

Stored as JSON in `localStorage` under key `racearena:trackGeometries:<trackId>`.

```json
{
  "id": "custom-<uuid>",  // stored under racearena:trackGeometries:<id>
  "name": "City Circuit Night",
  "backgroundImage": "/assets/tracks/backgrounds/city-circuit.png",
  "closed": true,
  "sourceMode": "center",
  "centerPoints": [{ "x": 640, "y": 360 }, ...],
  "width": 120,
  "innerPoints": [{ "x": 500, "y": 360 }, ...],
  "outerPoints": [{ "x": 780, "y": 360 }, ...],
  "createdAt": "2026-04-23T21:00:00Z",
  "updatedAt": "2026-04-23T21:30:00Z"
}
```

- `sourceMode` and the optional `centerPoints` + `width` are only present for center-mode tracks. For boundary-mode tracks, they are omitted.
- `innerPoints` and `outerPoints` are always present and authoritative for the race engine.
- Minimum 3 points per boundary for a closed track, minimum 2 for an open course.

---

## Editor UI Scope — Version 1

**Included:**

- Canvas overlay on selected background image
- Mode toggle: Center / Boundary
- Click to add points (to the appropriate list based on mode and, in boundary mode, an active-boundary toggle)
- Drag existing points to move them
- Click a point to select it; Delete key to remove
- Click a line segment to insert a new point on it
- Width slider (Center Mode only)
- Closed / Open toggle (set before drawing, changeable)
- Reverse Direction button (Open tracks only)
- Track name input
- Image dropdown (lists files in backgrounds folder)
- Save, Load, Delete track from localStorage
- Visual overlay: inner curve in green, outer curve in red, center line as blue dashed, lane fill as 20% gray, clicked points as filled circles colored by role

**Deliberately not in v1** (tracked in Future Extensions):

- Undo/Redo
- Track duplication as template
- JSON import/export
- Variable width along a boundary track
- Visible lane-marker rendering at race time
- Grid snap / raster
- Keyboard shortcuts beyond Delete

---

## Race Engine Integration

A new shape implementation `EditorShape` replaces `SvgPathShape` as the default. It implements the existing shape API:

- `getPosition(t, offset, trackWidth)` — returns `{x, y, angle}` at parameter `t ∈ [0, 1]` along the lane, offset perpendicularly by `offset ∈ [-0.5, 0.5]`
- `isOpen` — boolean, matches the track's `closed` field inverted
- `getCenterFrac` — computed from track extents

Internally, `EditorShape` caches the sampled center line and the perpendicular-offset calculation so that per-frame calls remain cheap.

---

## Environments → Track Effects Refactor

As part of the Track Editor rollout, the current environment concept is replaced:

**Before:** `environmentId` selects a class that draws (a) a fallback background, (b) the track surface, and (c) animated effects (shooting stars, bubbles, etc.).

**After:**

- The background is always the track's `backgroundImage` (no procedural fallback; missing image = black).
- The track surface is no longer drawn as a separate layer — it is implicit in the background image itself.
- Animated effects become a separate, opt-in layer. A track stores an `effectsLayer: 'none' | 'stars' | 'bubbles' | 'fireflies' | ...` field. Each effect is a small, independent module under `client/src/modules/track-effects/`.

The old `client/src/modules/environments/` folder is deleted. The `getEnvironment` function is replaced with `getTrackEffects(effectsLayer)`.

**Rationale:** The old Environment class coupled three unrelated responsibilities. Decoupling them makes each simpler and lets the admin compose a track freely.

---

## Implementation Plan

Implementation proceeds on a single feature branch `feat/track-editor`, one commit per sub-step, merged as a single PR when functionally complete.

- **A — Data structure & storage:** Track CRUD in localStorage, Catmull-Rom math module, tests. No UI.
- **B — Shape adapter:** `EditorShape` implementing the race-engine shape API, fully tested against existing engine behavior.
- **C — Editor canvas base:** Background image display, point click, point render. No save, no modes.
- **D — Editor modes & editing:** Center Mode, Boundary Mode, point move/delete/insert, mode-preserving re-edit.
- **E — Editor polish:** Closed/Open toggle, Reverse button, name input, track list, image dropdown.
- **F — Race engine integration & environment refactor:** Custom tracks appear in Setup Screen; old environment module removed; track-effects module introduced.

After F, user redraws the five existing tracks in the editor. Then old SVG-path code is removed in a follow-up PR.

---

## Future Extensions (Not in V1)

These are explicitly out of scope for v1 but on the known-follow-up list. Priorities to be decided when revisited.

**Editor UX:**

- Undo / Redo stack
- Track duplication as a starting template for a variant
- JSON export / import for sharing tracks between installations or for external editing
- Variable width along a boundary-mode track (via per-segment width markers)
- Grid / raster snap
- Keyboard shortcuts (arrow keys for nudge, `+`/`-` for width, etc.)
- Multi-select + bulk operations on points
- Catmull-Rom tension slider for tighter or looser curves

**Race-Time Rendering:**

- Visible lane markers (dashed center line, lane dividers) drawn over the image
- Per-track choice of racer-trail style
- Weather-effect overlay on top of the track (rain, snow, fog)

**Asset Pipeline:**

- Image upload via editor (file chooser), with server-side storage
- Automatic image resizing to 1280×720 on upload
- Image library management (list, rename, delete uploaded images)
- Team sharing of track sets via server-side track storage

**Track Effects:**

- More effect layers (fireflies, raindrops, snow, confetti on finish, etc.)
- Per-effect configuration (density, speed, color)
- Effect trigger conditions (e.g. fireworks on final lap)

**Integration:**

- Track metadata: difficulty rating, recommended racer types, recommended race length
- Track thumbnails in Setup Screen (rendered preview)
- Track ratings / usage statistics

---

## Open Questions (To Be Revisited)

- Will image upload (see Future Extensions) require backend work, or can it stay client-side via localStorage blob URLs with a size cap? To be decided when the feature is scoped.
- Should the editor support sub-paths (e.g. a pit lane branching off the main track)? Not in v1; revisit if racing rules ever require it.
- Background images at non-1280×720 aspect ratios are stretched. Is automatic letterbox preferred? Currently stretched is the project convention.
