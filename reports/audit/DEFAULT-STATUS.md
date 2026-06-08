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

---

## Step 1b — Part A: Per-Racer Visual Effects Inventory

### How the trail / particle system works

Every racer gets a visual trail via two independent, priority-ordered systems:

**System 1 — Surface-class emitter (higher priority)**
At race init (`RaceScreen/index.jsx:620`), `resolveTrailEmitter(racerType, trackSurfaceClasses)` is called per racer. If the racer's `surfaceClasses` array (e.g. `['asphalt', 'water']`) overlaps with the track's active surface classes, a per-racer generator emitter is created. This runs every frame, emitting surface-class-specific particles (skid marks, splashes, snow, etc.).

**System 2 — Heimat-Trail / trailFactory (fallback)**
If `surfaceEmitter` is `null` (no surface-class match), the racer's `trailFactory` function is called each frame. For built-in racers, `trailFactory` is hardcoded in the racer's `*RacerType.js` file. For user-created racers, `trailFactory: getTrailFactory(cfg.trailStyle)` resolves a named style (dust / sparkle / bubbles / exhaust / none) from `trailStyles.js`, with an explicit `'dust'` fallback for any unknown name (including undefined).

**`trailFactory` is a REQUIRED field** in `SpriteRacerType` (`SpriteRacerType.js:45`). Every built-in racer and every user-created racer always has one.

### Per-racer trail table (built-in types)

| Racer | Trail file:line | Trail type | surfaceClasses | Surface emitter possible? |
|---|---|---|---|---|
| horse | HorseRacerType.js:70 | Custom horseTrailFactory (gallop dust) | sand, earth, grass, asphalt, snow, mud | Yes |
| duck | DuckRacerType.js:69 | Custom duckTrailFactory (blue water drops) | water, grass | Yes |
| snail | SnailRacerType.js:72 | Custom snailTrailFactory | grass | Yes |
| elephant | ElephantRacerType.js:56 | makeGenericDustTrail #a09070 | sand, earth, grass | Yes |
| giraffe | GiraffeRacerType.js:56 | makeGenericDustTrail #c4a060 | sand, earth, grass | Yes |
| snake | SnakeRacerType.js:56 | makeGenericDustTrail #88aa66 | (none listed — empty) | No |
| dragon | DragonRacerType.js:58 | makeGenericDustTrail #cc6633 | air, asphalt, earth, water | Yes |
| f1 | F1RacerType.js:43 | makeGenericDustTrail #888888 | asphalt | Yes |
| rocket | RocketRacerType.js:44 | makeGenericDustTrail (white exhaust) | air, water | Yes |
| buggy | BuggyRacerType.js:49 | makeGenericDustTrail #998866 | sand, earth, mud | Yes |
| motorbike | MotorbikeRacerType.js:47 | makeGenericDustTrail #888888 | asphalt, earth | Yes |
| plane | PlaneRacerType.js:47 | makeGenericDustTrail #ffffff low-alpha | air | Yes |
| luge | LugeRacerType.js:47 | makeGenericDustTrail (ice chips) | ice, snow | Yes |
| beetle | BeetleRacerType.js:48 | makeGenericDustTrail (earth dust) | asphalt, cobble, earth | Yes |
| boarder | BoarderRacerType.js:48 | makeGenericDustTrail (earth dust) | asphalt, cobble, earth | Yes |
| koi | KoiRacerType.js:53 | makeGenericDustTrail (water ripple) | water | Yes |
| turtle | TurtleRacerType.js:43 | makeGenericDustTrail (slow wake) | water, earth | Yes (likely) |
| manta | MantaRacerType.js:44 | makeGenericDustTrail (ocean mist) | water | Yes |
| dolphin | DolphinRacerType.js:44 | makeGenericDustTrail (splash) | water | Yes |
| snowmobile | SnowmobileRacerType.js:44 | makeGenericDustTrail (snow spray) | ice, snow | Yes |

**User-created racers:** `trailFactory: getTrailFactory(cfg.trailStyle)` — resolves to one of `{none, dust, sparkle, bubbles, exhaust}`, fallback to `dust` if unknown. `surfaceClasses` are stored in the racer config if set via the editor. No missing-trail scenario is possible.

### Is there any default/custom distinction for trail effects?

**No.** The trail system has no "default vs custom" concept. Built-in racers have hardcoded factories; user-created racers have a named style resolved at registration time. Both paths are robust.

### Fallback chain — what happens with no match

```
resolveTrailEmitter → null  (no surface class overlap)
  → rt.getTrailParticles()  (calls trailFactory)
  → always returns an array  (dust fallback, or [] for 'none')
```

No crash, no missing effect. The "none" style is explicitly registered and intentionally emits nothing.

### Verdict on "problems the owner recalls"

**No current problem found in code.** All 20 built-in racers have explicit, non-nullable `trailFactory` values. User-created racers always resolve a factory (dust fallback). The surface-emitter system gracefully falls back to the Heimat-Trail when no surface class matches. No missing-data scenario exists in the current codebase.

If the owner recalls past issues, they likely predated the current architecture (migration from class-based to config-based racers in D3.5) or were related to a specific surface-class match failing on a track. The current code has no structural gap here.

**No action required for racer trail effects.**

---

## Step 1b — Part B: Luger Hill ID Rename Plan

### Re-confirmed reference map at HEAD (7e85e2a)

All 14 canonical references confirmed unchanged:

**Data files (must be modified + renamed):**

| Location | Type | What changes |
|----------|------|-------------|
| `server/data/tracks/90d3020197da.json:1731` | JSON `"id"` field | `"id": "90d3020197da"` → `"id": "luger-hill"` |
| `server/data/tracks/90d3020197da.json:1734` | JSON `"backgroundImageFile"` field | `"backgroundImageFile": "90d3020197da.png"` → `"backgroundImageFile": "luger-hill.png"` |
| `server/data/tracks/90d3020197da.json` | Filename | Rename file to `luger-hill.json` |
| `server/data/backgrounds/90d3020197da.png` | Background image | Rename file to `luger-hill.png` (file confirmed present) |

**Sweep scripts (12 single-line string changes, all in `scripts/`):**

| File | Line | Change |
|------|------|--------|
| `scripts/sim-fairness.mjs` | 2081 | `'90d3020197da'` → `'luger-hill'` |
| `scripts/sim-sweep.mjs` | 43 | `id: '90d3020197da'` → `id: 'luger-hill'` |
| `scripts/param-sweep.mjs` | 75 | `track: '90d3020197da'` → `track: 'luger-hill'` |
| `scripts/param-sweep-braking.mjs` | 77 | `track: '90d3020197da'` → `track: 'luger-hill'` |
| `scripts/param-sweep-braking-phase2.mjs` | 74 | `track: '90d3020197da'` → `track: 'luger-hill'` |
| `scripts/param-sweep-full.mjs` | 73 | `trackId: '90d3020197da'` → `trackId: 'luger-hill'` |
| `scripts/param-sweep-phase2.mjs` | 47 | `track: '90d3020197da'` → `track: 'luger-hill'` |
| `scripts/compare-sets.mjs` | 26 | `trackId: '90d3020197da'` → `trackId: 'luger-hill'` |
| `scripts/compare-zones.mjs` | 28 | `trackId: '90d3020197da'` → `trackId: 'luger-hill'` |
| `scripts/sweep-lateral.mjs` | 47 | `trackId: '90d3020197da'` → `trackId: 'luger-hill'` |
| `scripts/sweep-phase4-only.mjs` | 72 | `id: '90d3020197da'` → `id: 'luger-hill'` |
| `scripts/sweep-phase5.mjs` | 93 | `id: '90d3020197da'` → `id: 'luger-hill'` |

**No client/src changes needed** — zero references to `90d3020197da` in client source (confirmed). The client fetches tracks from the server API by dynamic lookup; it has no hardcoded track IDs.

**Docs (not blocking, update separately):**
`docs/BACKLOG.md:226`, `docs/BACKLOG.md:674`, `docs/LESSONS.md:1874`, `docs/ROADMAP.md:404` — narrative/historical references; no functionality depends on them.

**`client/src/modules/storage/defaults.js:480,508`** — two comments that call Luger Hill "user-created." These are factually accurate (it IS user-created, not a shipped default). No change needed.

### Server load-order and in-memory cache

`loadAllTracks()` runs at module load (`tracks.js:55`). It reads every `.json` file in `DATA_DIR` and keys the in-memory map by `track.id`. After the rename:

- The file `90d3020197da.json` no longer exists → `loadAllTracks()` will not find it
- The new file `luger-hill.json` has `"id": "luger-hill"` → keyed as `luger-hill` in `tracksMap`
- **Server restart is required** — the old entry `90d3020197da` stays in memory until the process restarts. After restart, it resolves to `luger-hill`.

### DELETE guard / migrateDefaultTracks interaction

- Luger Hill has `"isDefault": false` — the DELETE guard at `tracks.js:558` only blocks `isDefault: true` tracks. No interaction.
- Luger Hill is NOT in `DEFAULT_TRACK_SEEDS` (that list covers only the 9 shipped defaults). `migrateDefaultTracks()` will not re-seed it. No interaction.

### Client-side cache impact

`trackCache.js` (localStorage background cache) stores images keyed by `trackId`. After rename, any existing `90d3020197da` background cache entry becomes orphaned (stale but inert — the LRU eviction will eventually remove it). The client will re-fetch and cache the background under the new key `luger-hill`. **Harmless.**

`sessionStorage('activeRace')` stores track geometry for the active race session. If a race is in progress when the rename is applied, the session would use the old track data from sessionStorage until the race ends. The next race setup fetches the renamed track from the server. **No mid-race breakage.**

### Risk summary

| Risk | Severity | Notes |
|------|----------|-------|
| Sweep scripts use wrong ID | High (before fix) | All 12 currently use the hex ID; the rename fixes exactly this |
| Server needs restart | Medium | Data files are loaded at startup; a restart is required after the rename |
| Orphaned background cache in client | Low | LRU evicts it automatically |
| Docs still reference hex ID | Cosmetic | Historical narrative; no runtime impact |
| isDefault / DELETE guard | None | Luger Hill is isDefault:false; not in DEFAULT_TRACK_SEEDS |
| Client source | None | Zero references in client/src — dynamic API lookup only |

### Proposed Step-2 execution (for owner decision)

**Single atomic commit:**
1. Edit `server/data/tracks/90d3020197da.json` — change `"id"` and `"backgroundImageFile"`
2. `git mv server/data/tracks/90d3020197da.json server/data/tracks/luger-hill.json`
3. `git mv server/data/backgrounds/90d3020197da.png server/data/backgrounds/luger-hill.png`
4. Edit all 12 sweep scripts — single-line string replacement in each
5. Run tests (no test covers the hex ID directly — 2591/2591 expected)
6. Restart backend server after merge to pick up the renamed file

No client/src changes, no defaults.js changes, no doc changes (those can follow separately).
