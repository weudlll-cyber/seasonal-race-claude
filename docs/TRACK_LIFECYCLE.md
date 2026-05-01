# RaceArena — Track Lifecycle and Hybrid Persistence

**Status:** Concept — documented before implementation (2026-05-01)
**Phase:** Track Lifecycle Hybrid (TLH) — three Sub-PRs: TLH-1, TLH-2, TLH-3
**Related:** `docs/ARCHITECTURE.md — Track Lifecycle and Hybrid Persistence`, `docs/TRACK_EDITOR.md`

---

## Why This Document Exists

A user-browser-test on 2026-05-01 discovered a data-loss bug when attempting to draw geometry for a Default-Track. The drawn Dirt-Oval geometry was irreversibly lost. A diagnostic report identified four root causes:

1. "Draw Geometry" button opens a blank Track Editor without preset context — the editor treats it as "new track" mode, POSTs a new record, and the original preset stays unlinked.
2. Backend `PUT /api/tracks/:id` silently discards any `geometryId` sent by the client, always keeping `existing.geometryId`.
3. Track-Delete calls `removeCachedTrackData` which also wipes the geometry cache — without checking whether that geometry is referenced elsewhere.
4. Default-Tracks exist only as code constants (`DEFAULT_TRACKS`) with `geometryId: null`. They are not real server records. The UI flows designed for server tracks do not work for them.

This document captures the agreed solution before implementation begins.

---

## Terminology

| Term | Meaning |
|---|---|
| **Track-Preset** | Metadata for a race: name, icon, color, default racer type, surface classes, track lights, `geometryId` link. |
| **Track-Geometry** | Spatial path data: background image, inner/outer/center boundary points, closed flag, effects, surface classes, track lights config. |
| **Server-Track** | A Track-Preset with a backing `server/data/tracks/<id>.json` file. Authoritative source of truth. |
| **Default-Track** | One of the 5 built-in tracks (dirt-oval, river-run, space-sprint, garden-path, city-circuit). After TLH-1, these are Server-Tracks seeded at boot. |
| **Code-Bundle** | `client/src/modules/storage/defaultTracks.js` — in-code fallback snapshot, used when server is unreachable and cache is empty. |
| **Orphaned Geometry** | A geometry cache entry whose linked Track-Preset no longer exists. Harmless — preserved indefinitely. |

---

## Track Lifecycle

### Creating a Track

```
TrackManager "Add Track" → POST /api/tracks (metadata only, no geometry)
  → server assigns id, stores server/data/tracks/<id>.json
  → preset appears in TrackManager list with "No geometry" state
  → "Draw Geometry" button available
```

### Drawing / Editing Geometry

```
TrackManager "Draw Geometry" button → /track-editor?load=<serverId>
  → Track Editor loads existing server-track data
  → user draws boundaries
  → Save → PUT /api/tracks/<serverId> (geometry fields + geometryId)
  → server updates server/data/tracks/<id>.json
  → client caches geometry: racearena:trackGeometries:<geometryId>
  → Track is now playable
```

### Editing Preset Metadata

```
TrackManager Edit-Modal → user changes name/icon/color/surfaceClasses/trackLights
  → Save → PUT /api/tracks/<id> (metadata fields only, no geometry in body)
  → server merges: existing.innerPoints/outerPoints etc. preserved
  → geometryId preserved (body does not include it → server keeps existing value)
```

### Playing a Track

```
SetupScreen loads track list → useServerTracks() fetches from server
  → fetchServerTracks() → cacheTrackGeometry() per track
  → geometry cached in racearena:trackGeometries:<geometryId>
  → RaceScreen reads geometry from cache (works offline after first load)
```

### Deleting a Track

```
TrackManager "Delete" → DELETE /api/tracks/<id>
  → server removes server/data/tracks/<id>.json
  → server removes server/data/backgrounds/<id>.jpg (if exists)
  → server does NOT touch geometry data
  → client: removeCachedTrackData({ trackOnly: true })
    → removes track from useServerTracks list
    → removes background from racearena:cache:backgrounds
    → does NOT remove racearena:trackGeometries:<geometryId>
  → geometry remains as orphaned entry (harmless, preserved)
```

---

## Persistence Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend — track loading order (TLH-3)                     │
│                                                             │
│  1. Server (GET /api/tracks)          ← authoritative       │
│       ↓ on success: update cache                            │
│  2. Cache (localStorage geometries)   ← offline fallback    │
│       ↓ if server unreachable AND cache empty               │
│  3. Code-Bundle (defaultTracks.js)    ← last resort         │
│       → Status-Banner shown in this mode                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Server — data layout                                       │
│                                                             │
│  server/data/                                               │
│    tracks/                                                  │
│      dirt-oval.json          ← Default-Track (seeded)       │
│      river-run.json          ← Default-Track (seeded)       │
│      space-sprint.json       ← Default-Track (seeded)       │
│      garden-path.json        ← Default-Track (seeded)       │
│      city-circuit.json       ← Default-Track (seeded)       │
│      <uuid>.json             ← User-created custom tracks   │
│    backgrounds/                                             │
│      <id>.jpg                ← Binary background images     │
│    tracks-backups/           ← Auto-backup (TLH-1)          │
│      YYYY-MM-DD/                                            │
│        HH-MM-SS-<id>.json    ← Timestamped backup copy      │
│    .default-tracks-seeded    ← One-shot migration marker    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Client localStorage keys                                   │
│                                                             │
│  racearena:trackGeometries:<geometryId>  ← geometry cache   │
│  racearena:trackGeometries:index         ← geometry index   │
│  racearena:cache:backgrounds             ← bg image LRU     │
│  racearena:tracks                        ← (legacy local)   │
└─────────────────────────────────────────────────────────────┘
```

---

## Sub-PR Breakdown

### TLH-1 — Backend-Fixes + Migration

**Goal:** Make the system safe. Prevent data loss. Establish Default-Tracks as server records.

**Changes:**
- **Boot migration** — One-shot: if `server/data/.default-tracks-seeded` absent, create server records for all 5 default tracks. Each record includes full metadata (name, icon, color, defaultRacerType, surfaceClasses, trackLights) and empty geometry arrays (`innerPoints: [], outerPoints: [], centerPoints: [], closed: true`). Write marker file on completion. Idempotent — safe to run twice.
- **PUT handler** — When `geometryId` is present in request body: use client value. When absent: keep `existing.geometryId`. Remove the hardcoded `existing.geometryId` override.
- **DELETE handler** — Remove track JSON + background image only. Do not call `removeCachedTrackData` for geometry. On the frontend, update `removeCachedTrackData` calls from Delete flow to pass `{ trackOnly: true }`.
- **Auto-backup** — Before every `PUT /api/tracks/:id` and `POST /api/tracks`: write backup copy to `server/data/tracks-backups/YYYY-MM-DD/HH-MM-SS-<id>.json`. No auto-cleanup.

**Test scope:** Backend unit tests for PUT geometryId behavior, DELETE non-geometry-deletion, backup file creation, migration idempotency.

---

### TLH-2 — UI-Flow + Cleanup

**Goal:** Make the system usable. Fix the "Draw Geometry" navigation. Remove misleading UI fields.

**Changes:**
- **"Draw Geometry" button** — Navigate to `/track-editor?load=<serverId>` instead of bare `/track-editor`. The Track Editor reads `?load` on mount, fetches the server-track, pre-populates all fields (including existing geometry if present).
- **Track Editor save path** — When `?load=<serverId>` is present: on save, send `PUT /api/tracks/<serverId>` with geometry fields + `geometryId`. Do not POST a new record.
- **Edit-Modal cleanup** — Review UI fields that suggest impossible actions:
  - "Geometry = none" option: if a geometry-less state is a valid concept for the server, implement server support; otherwise remove the option from the dropdown.
  - Hint texts: verify all hint texts in Edit-Modal match actual server behavior.

**Test scope:** Playwright e2e — "Draw Geometry" button navigates with correct param, Track Editor in `?load` mode saves via PUT, no new record created.

**Dependency:** TLH-1 must be merged first (PUT handler must accept geometryId from client).

---

### TLH-3 — Code-Fallback + Status-Banner + Export

**Goal:** Make the system resilient. Graceful offline behavior. Manual Code-Bundle snapshot mechanism.

**Changes:**
- **Frontend loading chain** — `useServerTracks()` / `fetchServerTracks()`: if server unreachable → try geometry cache → if cache empty → fall back to Code-Bundle (`defaultTracks.js`). Emit `fallbackMode: 'code-bundle'` flag.
- **Status-Banner** — When `fallbackMode === 'code-bundle'`: render top-of-page banner: "Server unavailable — showing default tracks (limited functionality)". Banner disappears when server becomes reachable again and tracks refresh successfully.
- **Write disable in fallback mode** — Save and Delete operations in TrackManager / Track Editor show "Server required" state when in code-bundle mode.
- **Export button** — New button in Dev-Screen "Tracks" section: "Export track snapshot". Reads current server-track list (all 5 default tracks with geometry), formats as `defaultTracks.js` module content, and presents it as a file download or clipboard copy. User manually pastes/replaces `defaultTracks.js` and commits.
- **Code-Bundle bootstrap** — `defaultTracks.js` ships with the 5 default presets and empty geometry arrays initially. After the user has drawn all 5 geometries and run Export, the Code-Bundle is updated to include the actual geometry.

**Test scope:** Unit tests for fallback-chain logic, Status-Banner render when `fallbackMode` is set, Export button output format.

**Dependency:** TLH-2 must be merged first (geometry draws correctly before Export is meaningful). User draws all 5 tracks between TLH-2 merge and TLH-3 merge.

---

## Default-Tracks Server Record Schema

Each of the 5 default tracks is seeded with the following structure:

```json
{
  "id": "dirt-oval",
  "name": "Dirt Oval",
  "icon": "🏟️",
  "color": "#c8a96e",
  "defaultRacerTypeId": "horse",
  "surfaceClasses": ["earth"],
  "trackLights": { "color": "#d4790a", "style": "sequence", "speed": 1.2 },
  "closed": true,
  "innerPoints": [],
  "outerPoints": [],
  "centerPoints": [],
  "geometryId": null,
  "backgroundImageFile": null,
  "createdAt": "<boot-timestamp>",
  "updatedAt": "<boot-timestamp>"
}
```

`geometryId: null` and empty boundary arrays indicate "no geometry drawn yet". The Track Editor handles this state correctly: when `?load=dirt-oval` and no geometry exists, the editor starts in empty-canvas mode ready for first draw.

---

## Auto-Backup Mechanism

**Purpose:** Protect against data loss from UI bugs, bad saves, or user mistakes.

**Trigger:** Every `POST /api/tracks` and `PUT /api/tracks/:id` — before writing the authoritative file.

**Path pattern:**
```
server/data/tracks-backups/
  2026-05-01/
    14-32-07-dirt-oval.json
    14-35-22-dirt-oval.json
    15-01-44-city-circuit.json
```

**Retention:** No auto-cleanup. Backup directories accumulate indefinitely. Manual deletion of old date-directories is safe. Rationale: storage is cheap, data loss is expensive.

**Recovery:** To restore a backup, copy the desired `.json` file to `server/data/tracks/<id>.json` and restart the server (or send `GET /api/tracks/:id` to reload from disk).

---

## Orphaned Geometries

After Track-Delete, the geometry cache entry (`racearena:trackGeometries:<geometryId>`) remains in localStorage. This is intentional.

**Why preserve:** Geometry is the product of manual drawing work. A user who deletes a track by mistake can re-create the preset and re-link the geometry by entering the `geometryId`. Auto-deletion would make recovery impossible.

**Impact:** Near-zero. Each geometry entry is a few KB of coordinate JSON. A localStorage quota issue is vanishingly unlikely before the user has hundreds of orphaned geometries.

**Future cleanup:** A "Clean up orphaned geometries" action may be added as an optional maintenance feature in a later sprint. It would list all geometry cache entries, compare against the current track list, and offer to remove those with no matching preset.

---

## Code-Bundle Update Workflow

The Code-Bundle (`defaultTracks.js`) is updated manually, not automatically. The workflow:

1. User completes TLH-2 and draws all 5 default-track geometries via the Track Editor.
2. User opens Dev-Screen → Tracks section → clicks "Export track snapshot".
3. The Export button fetches all 5 default tracks from the server (including geometry) and formats them as a `defaultTracks.js` module.
4. User downloads / copies the output and replaces `client/src/modules/storage/defaultTracks.js`.
5. User commits the updated file: `chore: update default track snapshot with drawn geometries`.

This is a deliberate, one-time act. The Code-Bundle is not updated on every track save — it is a snapshot that provides a fallback for new installations or when the server is unavailable.

---

## Cross-References

- `docs/ARCHITECTURE.md — Track Lifecycle and Hybrid Persistence` — architectural summary
- `docs/TRACK_EDITOR.md — Two Track Concepts` — Preset vs Geometry distinction, Draw Geometry flow
- `docs/BACKLOG.md — Hot section` — TLH-1/2/3 task breakdown
- `docs/ROADMAP.md — Geplante Phasen-Reihenfolge` — TLH at position 1
- `docs/LESSONS.md — Lesson 38` — UI fields that diverge from server behavior cause data loss
- `docs/AUDIT.md — Bewusst akzeptierte Befunde` — Orphaned geometries accepted finding
