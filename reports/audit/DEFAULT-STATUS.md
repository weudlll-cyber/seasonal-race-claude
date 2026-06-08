# Default-Status Inventory

**Date:** 2026-06-08
**HEAD:** ddc7c6d30167e6482ba93aead3ebffcff564b70c

---

## Section 1: Racer Table

All 20 shipped racer types are `SpriteRacerType` instances. The `SpriteRacerType`
class and all individual `*RacerType.js` files contain **no `isDefault` field and
no `type` field**. There is no "default" vs "custom" distinction at the racer-type
level. The distinction only exists for tracks and surface classes.

The registry separates **built-in** (`RACER_TYPES` constant, 20 entries) from
**user-created** (`_loadedRacerTypes`, loaded at boot from localStorage). There is
no `isDefault` property anywhere in the racer type system.

| Racer | Definition File | Has isDefault? | Has type field? | Current Marking | bodyFillX | bodyFillY | displaySize | speedMultiplier |
|---|---|---|---|---|---|---|---|---|
| horse | HorseRacerType.js | No | No | Built-in (RACER_TYPES) | 0.353 | 0.800 | 47 | 1.00 |
| duck | DuckRacerType.js | No | No | Built-in (RACER_TYPES) | 0.875 | 0.875 | 36 | 0.85 |
| snail | SnailRacerType.js | No | No | Built-in (RACER_TYPES) | 0.727 | 0.938 | 35 | 0.30 |
| elephant | ElephantRacerType.js | No | No | Built-in (RACER_TYPES) | 0.539 | 0.938 | 44 | 0.60 |
| giraffe | GiraffeRacerType.js | No | No | Built-in (RACER_TYPES) | 0.271 | 0.767 | 48 | 0.90 |
| snake | SnakeRacerType.js | No | No | Built-in (RACER_TYPES) | 0.374 | 0.806 | 44 | 0.75 |
| dragon | DragonRacerType.js | No | No | Built-in (RACER_TYPES) | 0.836 | 0.898 | 50 | 1.10 |
| f1 | F1RacerType.js | No | No | Built-in (RACER_TYPES) | 0.555 | 0.953 | 38 | 1.20 |
| rocket | RocketRacerType.js | No | No | Built-in (RACER_TYPES) | 0.278 | 0.801 | 47 | 1.25 |
| buggy | BuggyRacerType.js | No | No | Built-in (RACER_TYPES) | 0.844 | 0.875 | 38 | 0.95 |
| motorbike | MotorbikeRacerType.js | No | No | Built-in (RACER_TYPES) | 0.400 | 0.800 | 42 | 1.05 |
| plane | PlaneRacerType.js | No | No | Built-in (RACER_TYPES) | 0.836 | 0.930 | 42 | 1.15 |
| luge | LugeRacerType.js | No | No | Built-in (RACER_TYPES) | 0.313 | 0.641 | 80 | 1.10 |
| beetle | BeetleRacerType.js | No | No | Built-in (RACER_TYPES) | 0.398 | 0.672 | 38 | 0.90 |
| boarder | BoarderRacerType.js | No | No | Built-in (RACER_TYPES) | 0.398 | 0.719 | 40 | 1.00 |
| koi | KoiRacerType.js | No | No | Built-in (RACER_TYPES) | 0.578 | 0.914 | 52 | 0.95 |
| turtle | TurtleRacerType.js | No | No | Built-in (RACER_TYPES) | 0.578 | 0.734 | 48 | 0.85 |
| manta | MantaRacerType.js | No | No | Built-in (RACER_TYPES) | 0.633 | 0.805 | 56 | 1.10 |
| dolphin | DolphinRacerType.js | No | No | Built-in (RACER_TYPES) | 0.402 | 0.887 | 52 | 1.15 |
| snowmobile | SnowmobileRacerType.js | No | No | Built-in (RACER_TYPES) | 0.459 | 0.797 | 52 | 1.10 |

**Mismatch column:** None — no `isDefault` concept exists for racer types.

### Note: drawnBodyWidthPx / drawnBodyLengthPx

These are derived at runtime, not stored as named fields. The formula is:
- `drawnBodyWidthPx = displaySize * bodyFillX`
- `drawnBodyLengthPx = displaySize * bodyFillY`

The scale cleanup (memory entry) renamed constants but the racer type files
themselves only store `bodyFillX`, `bodyFillY`, and `displaySize`.

---

## Beetle/Boarder Contradiction — Resolution

Prior audit notes mentioned "custom backend class, not in defaults.js, no data."
This is now fully resolved. Current state (verified by reading source files):

- `BeetleRacerType.js`: A normal `SpriteRacerType` instance, `id: 'beetle'`, registered
  in `RACER_TYPES` at index.js line 99. No `isDefault` field. Built-in like all other types.
- `BoarderRacerType.js`: A normal `SpriteRacerType` instance, `id: 'boarder'`, registered
  in `RACER_TYPES` at index.js line 100. No `isDefault` field. Built-in like all other types.
- Both appear in `index.js` RACER_TYPES map (lines 99-100) and are exported.
- Neither appears in `client/src/modules/storage/defaults.js` DEFAULT_TRACKS — that file
  lists tracks, not racer types; racer types have no "defaults" list.
- The prior "not in defaults.js" note was technically accurate but misleading:
  no racer type appears in `defaults.js`, because that file only defines DEFAULT_TRACKS,
  DEFAULT_RACE_DEFAULTS, DEFAULT_CAMERA_CONFIG, etc. Racer types are self-registering
  via the RACER_TYPES constant in index.js.
- **Conclusion:** Beetle and Boarder are fully equivalent to Horse, Duck, etc. No data,
  no contradiction, no action required.

---

## Section 2: Track Table

### JSON Files vs defaults.js Comparison

The 10 shipped tracks exist in two places:
1. **Server JSON** at `server/data/tracks/` — the live, persistent record
2. **Client defaults** at `client/src/modules/storage/defaults.js` DEFAULT_TRACKS — seed
   data for first-launch localStorage initialization (client-side only)

| Track | ID | JSON File | JSON isDefault | In defaults.js? | defaults.js isDefault | Mismatch? |
|---|---|---|---|---|---|---|
| Dirt Oval | dirt-oval | dirt-oval.json | **true** | Yes | **true** | No |
| River Run | river-run | river-run.json | **true** | Yes | **false** | YES |
| Space Sprint | space-sprint | space-sprint.json | **true** | Yes | **false** | YES |
| Garden Path | garden-path | garden-path.json | **true** | Yes | **false** | YES |
| City Circuit | city-circuit | city-circuit.json | **true** | Yes | **false** | YES |
| Mountainstreet | mountainstreet | mountainstreet.json | **true** | Yes | **false** | YES |
| Ice Track | ice-track | ice-track.json | **true** | Yes | **false** | YES |
| Seatrack | seatrack | seatrack.json | **true** | Yes | **false** | YES |
| Searound | searound | searound.json | **true** | Yes | **false** | YES |
| Luger Hill | 90d3020197da | 90d3020197da.json | **false** | No | N/A | No |

### Key finding: The D2-a audit claim "only dirt-oval has isDefault: true" is WRONG

All 9 server-side JSON files for the default tracks (`dirt-oval`, `river-run`, `space-sprint`,
`garden-path`, `city-circuit`, `mountainstreet`, `ice-track`, `seatrack`, `searound`) have
`"isDefault": true`. Only the user-created Luger Hill track has `"isDefault": false`.

The mismatch is between the **server-side JSON** (`isDefault: true` for all 9) and the
**client-side `defaults.js`** (`isDefault: true` only for `dirt-oval`, false for the other 8).
This is a stale client seed — the client default list was not updated when tracks 2-9 gained
their `isDefault: true` status. However, since `defaults.js` is only used to seed localStorage
on first launch, and the server is the authoritative source for track data at runtime, this
mismatch is **cosmetic for fresh installs only**.

### Server-side DEFAULT_TRACK_SEEDS (server/src/routes/tracks.js)

The server also maintains `DEFAULT_TRACK_SEEDS` (lines 59–203) which lists all 9 default tracks
with `isDefault: true`. These seeds are applied idempotently at every boot via `migrateDefaultTracks()`
— if a track file is missing it gets re-created. This confirms all 9 are intended to be `isDefault: true`.

---

## Section 3: isDefault Flag — What It Controls

### All read sites

| File:Line | Code snippet | Classification |
|---|---|---|
| `server/src/routes/tracks.js:558` | `if (track.isDefault) { return res.status(403).json({error: 'Cannot delete default track...'}) }` | **GATE: DELETE protection** — hard enforcement, 403 for default tracks |
| `server/src/routes/tracks.js:540` | `isDefault: existing.isDefault,` | **GATE: PUT immutability** — client cannot change isDefault via PUT; always preserves existing value |
| `server/src/routes/tracks.js:510` | `isDefault: false,` | **CREATE default** — new tracks created via POST always get isDefault: false |
| `server/src/routes/tracks.js:74,90,106,122,138,154,170,186,202` | `isDefault: true,` in DEFAULT_TRACK_SEEDS | **SEED** — sets isDefault on the 9 built-in tracks at boot if they don't exist |
| `client/src/modules/storage/defaults.js:25,42,59,76,93,110,127,144,161` | `isDefault: true/false` in DEFAULT_TRACKS array | **SEED** — used to populate localStorage on first client launch; only dirt-oval has true |
| `client/src/screens/DevScreen/sections/TrackManager.jsx:173` | `setTracks((prev) => prev.map((t) => ({ ...t, isDefault: t.id === id })))` | **DISPLAY only** — toggles isDefault in local state; only applies to non-server (localStorage) tracks; server tracks are excluded from the "Set Default" button (line 274: `!isServerTrack &&`) |
| `client/src/screens/DevScreen/sections/TrackManager.jsx:94` | `isDefault: false,` in handleSave | **WRITE** — new tracks always saved with isDefault: false; this is sent to server but server PUT handler ignores it (see immutability above) |
| `client/src/screens/DevScreen/sections/TrackManager.jsx:275` | `track.isDefault ? <span>Default</span> : <button>Set Default</button>` | **DISPLAY** — shows "Default" badge or "Set Default" button, but only for non-server tracks |
| `client/src/modules/storage/trackMigration.js:82` | `isDefault: false,` | **WRITE** — tracks migrated from localStorage to server are assigned isDefault: false |
| `server/src/routes/surfaceClasses.js:127,163` | `isDefault: false,` | Unrelated — same field name used for surface classes |
| `client/src/modules/surface-effects/registry.js:40` | `const custom = serverClasses.filter((c) => !c.isOverride && !c.isDefault)` | Unrelated — surface effects context |
| `client/src/modules/surface-effects/defaults.js:29,43,57,73,88,102,113,129,143` | `isDefault: true,` | Unrelated — surface effects context |

### Behavior risk verdict

**What `isDefault: true` currently gates at runtime:**
1. **DELETE protection (server):** `DELETE /api/tracks/:id` returns 403 if `isDefault: true`.
   Removing this flag from a shipped track would make it deletable and non-restorable
   until the next boot triggers `migrateDefaultTracks()`.
2. **PUT immutability (server):** The PUT handler always writes `isDefault: existing.isDefault`,
   so no client can elevate or demote a track's default status via the API.
3. **"Set Default" / "Default" badge visibility (client):** The UI button/badge is suppressed
   entirely for server-backed tracks (`!isServerTrack &&` guard at TrackManager.jsx:274).
   So `isDefault` on server tracks has **no effect on UI display** — the button is never shown.

**If we set `isDefault: true` on currently-unmarked tracks (e.g., client defaults.js):**
- No runtime behavior change beyond cosmetic seeding at first install.
- The server JSON files already have `isDefault: true` for all 9 default tracks.
- The client `defaults.js` stale values do not affect the runtime — at runtime the client
  reads track data from the server API, not from `defaults.js`.

**If we set `isDefault: false` on a server JSON file for a shipped track:**
- That track becomes deletable via the API.
- `migrateDefaultTracks()` would not re-protect it (it only seeds missing tracks, does not
  restore isDefault on existing records).
- This is the only dangerous mutation.

### Clean signal to distinguish shipped from user-created

The authoritative shipped-vs-custom signal is `isDefault` on the server JSON. No other
field distinguishes them. The track ID naming convention (UUID-like for custom, slug for
built-in) is a secondary heuristic but not enforced.

---

## Section 4: Step-2 Proposed Split

Based on this inventory, the following observations are relevant before any data edits:

### Racer types: nothing to do
No racer type has or needs an `isDefault` field. Built-in vs user-created is determined
by whether the type is in `RACER_TYPES` (hard-coded) vs `_loadedRacerTypes` (localStorage).

### Tracks: client defaults.js needs alignment
The client `defaults.js` DEFAULT_TRACKS list has `isDefault: false` for 8 of the 9
shipped tracks, contradicting the server JSON which has `isDefault: true` for all 9.
This is a stale seed — the client file was not updated when tracks 2-9 were added.

To align: set `isDefault: true` for `river-run`, `space-sprint`, `garden-path`,
`city-circuit`, `mountainstreet`, `ice-track`, `seatrack`, `searound` in `defaults.js`.
Risk: Low — `defaults.js` is only read to seed localStorage on first install. Existing
installs are unaffected.

### Surface classes: separate system
The `isDefault` usage in `surface-effects/` and `surfaceClasses.js` is an entirely
independent subsystem with its own semantics (distinguishes built-in effect presets
from custom operator overrides). No action needed here.

### Key constraint (from server/src/routes/tracks.js:558)
Never set `isDefault: false` on any of the 9 server JSON files. Doing so removes the
only DELETE guard for those tracks and `migrateDefaultTracks()` will not restore it.
