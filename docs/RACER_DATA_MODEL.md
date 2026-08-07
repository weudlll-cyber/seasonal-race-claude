# RaceArena — Racer Data Model

**Owns:** what a racer type is — its fields, where the definition lives, and which parts are live-tunable.

**Status:** Updated 2026-06-04 (clean-state audit). Original: 2026-04-26 post D3.5.5 merge (PR #21).
All 20 built-in racer types are `SpriteRacerType` instances. Code registry is Single Source of Truth.
`speedMultiplier` has effectively affected race speed since D9.
6 fields have been live-tunable via Dev-Screen edit modal since D3.5.5.
User-created types (Racer Editor Phase 1+2, 2026-05-28) are also `SpriteRacerType` instances stored in `localStorage`.

---

## Concepts

**Racer Type** — a sprite type with its own look, animation, coats, and stats. Config-defined
`SpriteRacerType` instance (e.g. `HorseRacerType`, `DuckRacerType`). 20 built-in types.
Dynamically extensible via sprite upload at `/racer-editor` (Racer Editor Phase 1+2, shipped 2026-05-28).

### Canonical list of the 20 built-in racer types (source of truth)

| ID           | Label         | Speed | Surface classes                        |
| ------------ | ------------- | ----- | -------------------------------------- |
| `horse`      | Horse 🐴      | 1.00  | sand, earth, grass, asphalt, snow, mud |
| `duck`       | Duck 🦆       | 0.85  | water, grass                           |
| `snail`      | Snail 🐌      | 0.30  | grass                                  |
| `elephant`   | Elephant 🐘   | 0.60  | sand, earth, grass                     |
| `giraffe`    | Giraffe 🦒    | 0.90  | sand, earth, grass                     |
| `snake`      | Snake 🐍      | 0.75  | sand, earth, grass                     |
| `dragon`     | Dragon 🐉     | 1.10  | air, asphalt, earth, water             |
| `f1`         | F1 🏎️         | 1.20  | asphalt                                |
| `rocket`     | Rocket 🚀     | 1.25  | air, water                             |
| `buggy`      | Buggy 🚙      | 0.95  | sand, earth, mud                       |
| `motorbike`  | Motorbike 🏍️  | 1.05  | asphalt, earth                         |
| `plane`      | Plane ✈️      | 1.15  | air                                    |
| `luge`       | Luge 🛷       | 1.10  | ice, snow                              |
| `beetle`     | Beetle 🪲     | 0.90  | asphalt, cobble, earth                 |
| `boarder`    | Boarder 🛹    | 1.00  | asphalt, cobble, earth                 |
| `koi`        | Koi 🐟        | 0.95  | water                                  |
| `turtle`     | Turtle 🐢     | 0.85  | water                                  |
| `manta`      | Manta 🦈      | 1.10  | water                                  |
| `dolphin`    | Dolphin 🐬    | 1.15  | water                                  |
| `snowmobile` | Snowmobile 🏂 | 1.10  | snow, ice, earth                       |

> **Note:** The racer types `penguin` and `ufo` never existed in the codebase. They appeared in
> a stale HANDOFF document (now obsolete) as a naming artifact. The correct types at those
> positions in that document were `snail` and `elephant`, which are and always have been the
> actual built-in types. The canonical list above supersedes any older reference.

**Track** — a race course with geometry, background image, effects, default duration, etc.
Has a **suggested Racer Type** as "Default" — adopted during setup if the game master does not
override it.

**Race** — a concrete running race with a track and exactly one racer type.
All players in the race use the same racer type — no mixing. Players differ
by coat (color variant) and name.

> **A Race always uses a single Racer Type for all players.** The W3
> Race-Type-Override in the Setup Screen is a **Race-Setting** (which type is raced),
> NOT different per player. All racers in a race have the same
> `speedMultiplier` and all other type values. Speed variance comes exclusively from
> the random `baseSpeed` per racer (within the same type).
>
> Doc entries that mention "fastest racer in the race" or similar (e.g. the open-track
> finish-line logic from D9) refer to the theoretical mean of the chosen
> type, not a comparison between different types within one race.

**Player** — a person who participates. Has a name. Gets a coat assigned in the race.
Has **no** own racer type — that comes from the race.

---

## Relationships

```
Track  --(suggests-default)-->  Racer Type
Race   --(uses-exactly-one)-->  Racer Type
Race   --(runs-on)----------->  Track
Race   --(has-many)---------->  Player (each gets a coat)
```

### What does NOT exist

- **No hard Track ↔ Racer Type binding.** It is only a suggestion. River Run "suggests
  Duck", but the game master can choose Horse.
- **No "Associated Track" on Racer Type.** Racer Types are track-independent.
- **No Racer Type on Player.** Player belongs to a Race, the Race has the type.

---

## Setup flow (game master view)

1. Game master selects a track (e.g. River Run)
2. Setup shows: "Default Racer: 🦆 Duck" — with option to change (W3 Override-Selector)
3. Game master keeps the default or selects a different type (e.g. 🐎 Horse)
4. Game master adds player names
5. Race starts: all players get the same racer type, each assigned one coat via hash

---

## 12 Racer Types — Config overview

| id          | Emoji | frameCount | basePeriodMs | displaySize | speedMultiplier | tintMode |
| ----------- | ----- | ---------- | ------------ | ----------- | --------------- | -------- |
| `horse`     | 🐴    | 8          | 700          | 40          | 1.00            | multiply |
| `duck`      | 🦆    | 8          | 700          | 36          | 0.85            | multiply |
| `snail`     | 🐌    | 4          | 1500         | 35          | 0.30            | multiply |
| `elephant`  | 🐘    | 8          | 800          | 44          | 0.60            | multiply |
| `giraffe`   | 🦒    | 8          | 750          | 48          | 0.90            | multiply |
| `snake`     | 🐍    | 8          | 600          | 36          | 0.75            | multiply |
| `dragon`    | 🐉    | 16         | 700          | 50          | 1.10            | multiply |
| `f1`        | 🏎️    | 8          | 400          | 38          | 1.20            | multiply |
| `rocket`    | 🚀    | 8          | 500          | 40          | 1.25            | multiply |
| `buggy`     | 🚙    | 8          | 500          | 38          | 0.95            | **mask** |
| `motorbike` | 🏍️    | 8          | 500          | 36          | 1.05            | **mask** |
| `plane`     | ✈️    | 8          | 600          | 42          | 1.15            | **mask** |

> **speedMultiplier:** Acts since D9 (PR #19) as a linear multiplier on `baseSpeed`.
> Formula: `baseSpeed = (BASE_SPEED_MIN + random * (BASE_SPEED_MAX - BASE_SPEED_MIN)) * speedMultiplier`.
> Constants from `DEFAULT_BASE_SPEED_CONFIG` in `storage/defaults.js`: `min = 0.00096`, `max = 0.00113`.
>
> **tintMode `mask`:** Buggy, Motorbike, Plane use mask-tinting via `<sprite>-mask.png`.
> Only the mask is tinted; the rest of the sprite remains unchanged. All other types
> use multiply-mode (entire sprite is multiplied by the tint color).

---

## Persistence — Storage Keys

| Storage Key                                   | Content                                                                                                                                                                                                                                                                         | Status               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `racearena:tracks`                            | Array of tracks. Fields: `id, name, description, geometryId, defaultRacerTypeId, defaultDuration, defaultWinners, color, worldWidth, worldHeight, maxRacers (null=no limit), ...` — `trackWidth` removed in D7c-fix-v2; old entries may still contain the field, it is ignored. | Active               |
| `racearena:rowLayoutConfig`                   | Row-start tuning config. Fields: `rowGapMultiplier, speedBonusFactor, maxCapacityFactor`. Defaults in `DEFAULT_ROW_LAYOUT_CONFIG`. (`pixelsPerRacer` was present in D7c, removed since D7c-fix — racersPerRow is now auto-computed from geometry.)                              | Active (post D7c)    |
| `racearena:racerTypeOverrides`                | Override map `{[typeId]: { isActive: false, speedMultiplier?: number, ... }}` for deactivated types and tuning overrides (post D3.5.5). Legacy format `{[typeId]: false}` is migrated on-read via `normalizeOverrideMap()`.                                                     | Active (post D3.5.5) |
| `racearena:racerTypes`                        | Legacy — empty/removed after migration to `racerTypeOverrides`                                                                                                                                                                                                                  | Legacy/null          |
| `racearena:trackGeometries:<id>`              | Track geometry records (Catmull-Rom spline points)                                                                                                                                                                                                                              | Active               |
| `racearena:trackGeometries:index`             | Geometry index                                                                                                                                                                                                                                                                  | Active               |
| `sessionStorage['activeRace']`                | Race setup data for Setup → Race Screen transition. Fields: `trackId, racerTypeId, racers[], duration, winners, geometryId, worldWidth, timestamp, raceMode, targetLaps, targetDuration, trackSurfaceClasses`                                                                   | Active               |
| `sessionStorage['activeRace'].racerTypeId`    | **W3 Race-Override:** session-only, reset on track change. No persistence.                                                                                                                                                                                                      | Active (post W3)     |
| `sessionStorage['activeRace'].raceMode`       | `'laps'` (Closed-Track) or `'time'` (Open-Track). Controls race end logic in RaceScreen.                                                                                                                                                                                        | Active (post D9)     |
| `sessionStorage['activeRace'].targetLaps`     | Selected lap count (integer, 1–4). Only set when `raceMode='laps'`. Fallback: `lapsFromDuration(duration)`.                                                                                                                                                                     | Active (post D9)     |
| `sessionStorage['activeRace'].targetDuration` | Selected race duration in seconds. Only set when `raceMode='time'`. Fallback: `duration`.                                                                                                                                                                                       | Active (post D9)     |

---

## Race end logic (since D9, PR #19)

### Closed-Track (closed oval/circuit)

- **Mode:** `raceMode = 'laps'`
- **Finish line:** `finishT = targetLaps` (integer in t-space, e.g. `2` = 2 full laps)
- **Game master choice:** explicit lap selection (1–4) in SetupScreen with live estimate in
  seconds per racer type. Default: `lapsFromDuration(duration)` (auto from duration).
- **Race ends when:** all players have reached `r.t >= finishT` + runout complete
- **Lap counter:** displayed during the race (LAP X / N)

### Open-Track (sprint course)

- **Mode:** `raceMode = 'time'`
- **Finish line:** dynamic position `finishT = openTrackFinishT(targetDuration, speedMultiplier)`
  — based on theoretically fastest racer: `min(1.0, BASE_SPEED_MAX × sm × REFERENCE_FPS × seconds)`
- **Constraint:** maximum finishT = 1.0 (end of course). D10 lifts the 1280px restriction.
- **Race ends when:** all players have passed the dynamic finish line + runout complete

### Runout behavior (both track types)

After crossing the finish line all players continue moving with decaying speed:

- `r.runoutDecay *= 0.97` per frame (approx. 62.5 FPS)
- Effective speed: `baseSpeed × runoutDecay` — decays over several seconds
- Prevents abrupt freezing at the finish line

### Result-Delay

2 seconds after the last finish line crossing → fade to `/results`.
Gives the audience time to see the final positions.

---

## Code architecture

### Code registry as Single Source of Truth (post B-7)

`RACER_TYPES` in `client/src/modules/racer-types/index.js` is the single source of truth for all
20 built-in types. localStorage stores **only deviations** from the code default:

```
Code-Registry (RACER_TYPES)          →  20 Types, always complete
racearena:racerTypeOverrides          →  { snail: false, ... }  (only what deviates)
listAllRacerTypes()                   →  Code-Registry + Overrides merged
```

### API

| Function                                                                       | Description                                                                                                                                                                        |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `listAllRacerTypes()`                                                          | Array of all 20 built-in types (+ user-created types) with `isActive` resolved from override map                                                                                   |
| `getRacerType(id)`                                                             | Single type instance, falls back to Horse for unknown IDs                                                                                                                          |
| `getRacerTypeById(id)`                                                         | Alias for `getRacerType` — preferred where ID semantics matter                                                                                                                     |
| `setRacerTypeOverride(id, fieldName, value)`                                   | Set override: `fieldName='isActive', value=false` deactivates; tunable fields (TUNABLE_FIELDS) also mutate live config                                                             |
| `resetRacerTypeOverride(id, fieldName?)`                                       | Without fieldName: remove all overrides for id. With fieldName: only that one field. Restores live config from CONFIG_SNAPSHOT.                                                    |
| `normalizeOverrideMap(raw)`                                                    | Migrates legacy format `{id: false}` → `{id: {isActive: false}}`; returns `{}` for null/undefined                                                                                  |
| `applyTunableOverride(id, fieldName, value)`                                   | Directly mutates `RACER_TYPES[id].config[fieldName]` without a storage write                                                                                                       |
| `restoreTunableDefault(id, fieldName)`                                         | Restores `RACER_TYPES[id].config[fieldName]` from CONFIG_SNAPSHOT                                                                                                                  |
| `TUNABLE_FIELDS`                                                               | `['speedMultiplier', 'displaySize', 'basePeriodMs', 'leaderRingColor', 'leaderEllipseRx', 'leaderEllipseRy', 'minTargetScreenPx', 'surfaceClasses']` — 8 fields since VRE-3        |
| `CONFIG_SNAPSHOT`                                                              | Frozen copy of code defaults for all 8 TUNABLE_FIELDS (since VRE-3), captured before boot-override application. Arrays are deep-copied (no reference sharing)                      |
| `filterRacerTypesForTrack(racerTypes, trackSurfaceClasses, getRacerClassesFn)` | Filters racer types to those with ≥1 class overlap with the track. Empty `trackSurfaceClasses` → return all (Legacy). Empty racer classes → always included (Heimat-Trail). VRE-3. |
| `RACER_TYPE_IDS`                                                               | Sorted array of all 20 built-in type IDs                                                                                                                                           |
| `RACER_TYPE_LABELS`                                                            | Map `{id → "Name Emoji"}` for UI display                                                                                                                                           |
| `COATS_BY_TYPE`                                                                | Map `{id → coats[]}` for RaceScreen coat assignment; auto-derived from type configs                                                                                                |
| `getSurfaceClasses()` on SpriteRacerType                                       | Returns `surfaceClasses` array (surface class IDs of this type, default: `[]`). Read by RaceScreen + SetupScreen in VRE-3.                                                         |

### SpriteRacerType — config fields

`SpriteRacerType` is a config-driven class. All 20 built-in types are singleton instances; user-created types are also `SpriteRacerType` instances created at runtime.
No subclasses. Required config fields:

| Field            | Type                 | Description                                                                                                        |
| ---------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `id`             | string               | Unique racer type identifier                                                                                       |
| `spriteUrl`      | string               | Path to sprite sheet PNG                                                                                           |
| `frameCount`     | number               | Animation frame count                                                                                              |
| `basePeriodMs`   | number               | Base animation period at speed 1.0                                                                                 |
| `displaySize`    | number               | Bounding box size in px                                                                                            |
| `coats`          | `{id, name, tint}[]` | Color variant definitions                                                                                          |
| `trailFactory`   | function             | `(x, y, speed, angle, frame) => particle[]` — Heimat-Trail (fallback when no surface class match)                  |
| `surfaceClasses` | `string[]`           | Surface class IDs of this type (Visual Racer Effects). Default: `[]` = all tracks compatible, always Heimat-Trail. |

Optional: `frameWidth/Height` (default 128), `silhouetteScale`, `speedMultiplier` (default 1.0),
`baseRotationOffset`, `tintMode` (`'multiply'` or `'mask'`), `maskUrl` (required when
`tintMode='mask'`), `fallbackColor`.

### Mask-Tinting (Buggy, Motorbike, Plane)

Mask types have two sprite files:

- `<type>-<anim>.png` — full sprite
- `<type>-<anim>-mask.png` — PNG mask, defines which pixels are tinted

Tinting algorithm (`tintSpriteWithMask`):

1. Load sprite + mask via `loadSprite()`
2. Draw sprite onto offscreen canvas
3. Draw mask onto second offscreen canvas
4. Tint color is applied only to mask pixels (multiply-mode over mask)
5. Result: chassis/body color changeable, rest of sprite unchanged

### Track-Default-Lookup

`SetupScreen` and `TrackManager` read from `localStorage['racearena:tracks']`. Each track has
**exactly one** field for the default racer: `defaultRacerTypeId`. Fallback chain in SetupScreen
for older localStorage entries: `defaultRacerTypeId ?? racerTypeId ?? racerId ?? d.defaultRacerTypeId`.

### Race Init

RaceScreen reads from `sessionStorage['activeRace']`:

- `racerTypeId` → determines which racer instance is used for all players
- `racers[]` → all get the same type, each assigned a coat via djb2 hash of their name

Per-racer runtime fields (D7b/D7c, set by `initRacerBehavior` + RaceScreen init):

- `physicalY` — normalized lateral position, ∈ [-1.0, +1.0]: -1=inner boundary, 0=centerline, +1=outer boundary. D7b: all racers in a row distributed evenly via `computeRowPhysicalY`. D7c: applies per row, including incomplete last rows (full-spread). Subsequently mutated each frame by home force + avoidance + soft repulsion.
- `t` — race progress ∈ [0, finishT]. D7c: Closed tracks: rear rows at negative t (e.g. -0.008 for row 1) — `tPos` wraps correctly behind the start line. D7c-Phase4: Open tracks: staging area — all rows start at positive t: row k at `(totalRows − k) × rowGapPx / pathLengthPx`. No negative t, no clamp. Speed bonus applies on open tracks the same as on closed tracks.
- `baseSpeed` — since D7c multiplied by `(1 + speedBonus)` for rear rows. Speed bonus compensates for the physical start distance. At the neutral `speedBonusFactor`, pole position is mathematically neutral.
- `avoidanceActive` — boolean: true when racer triggers the adjacent speed-brake condition
- `draftingBoostActive` — boolean: true when racer is in the slipstream cone of a leader

> **Anti-Stacking (D7b-fix B3):** Avoidance forces are normalized by `sqrt(neighborCount)` before application, where `neighborCount` = number of racers exerting a non-zero avoidance force on this racer in the current frame. Prevents boundary-clinging with 20+ racers: without normalization a racer with N neighbors accumulates N× the individual force, overwhelming the restoring forces (home force + soft repulsion).

> **Row Start (D7c + D7c-fix + D7c-Phase4):** `effectiveWidth = trackWidthPx × startSpreadRange` — `trackWidthPx` comes from `track.width` (stored by Track Editor) with `EditorShape.getActualTrackWidth()` as spline fallback. `computeRacersPerRow(effectiveWidth, spriteSize)` = `floor(2 × effectiveWidth / spriteSize)`. `computeRowLayout(racerCount, racersPerRow)` shuffles racer indices (Fisher-Yates). `rowGapPx = spriteSize × rowGapMultiplier`. `deltaT_per_row = rowGapPx / pathLengthPx`. Closed: row k → t=-(k × deltaT_per_row). Open: row k → t=(totalRows−k) × deltaT_per_row (all positive, no clamp). Speed bonus: `computeSpeedBonus(rowIndex, rowGapPx, pathLengthPx, speedBonusFactor)` — applies to both track types. Open-track finish: `finishT = 1.0 − runoutZone`.

No `currentLaneY` / `targetLaneY` / `trackOffset` anymore (removed in D7b).

---

## Visual Racer Effects — Surface Classes (Phase VRE)

> **UI:** Surface classes are created and edited in the Dev Screen → **Surface Classes** section (VRE-2). The master-detail editor provides a class list with Default / Modified / Custom badges, a live animated canvas preview, and full generator config controls. No code changes needed to add or tune a surface class.
>
> **IDs:** The surface class ID is an internal technical key (e.g. `"mud"`, `"black-sea"`) — not shown in the editor. When creating a new class the ID is auto-generated by slugifying the label (`"Black Sea"` → `"black-sea"`); if the slug already exists a numeric suffix is appended (`"black-sea-2"`).

Surface Classes replace the static trail system. Instead of a fixed `trailFactory` per type, the active trail is determined by the intersection of racer type classes and track classes.

### surfaceClasses field on SpriteRacerType

```javascript
// Example: Horse — can race on sand, earth, grass, asphalt, snow, mud
const HorseRacerType = new SpriteRacerType({
  id: "horse",
  // ... other fields ...
  surfaceClasses: ["sand", "earth", "grass", "asphalt", "snow", "mud"],
  trailFactory: horseTrailFactory, // Heimat-Trail (fallback)
});
```

### Surface class assignment — all 20 racer types

| Racer type   | surfaceClasses                                         |
| ------------ | ------------------------------------------------------ |
| `snail`      | `['grass']`                                            |
| `horse`      | `['sand', 'earth', 'grass', 'asphalt', 'snow', 'mud']` |
| `duck`       | `['water', 'grass']`                                   |
| `elephant`   | `['sand', 'earth', 'grass']`                           |
| `giraffe`    | `['sand', 'earth', 'grass']`                           |
| `snake`      | `['sand', 'earth', 'grass']`                           |
| `dragon`     | `['air', 'asphalt', 'earth', 'water']`                 |
| `buggy`      | `['sand', 'earth', 'mud']`                             |
| `motorbike`  | `['asphalt', 'earth']`                                 |
| `f1`         | `['asphalt']`                                          |
| `plane`      | `['air']`                                              |
| `rocket`     | `['air', 'water']`                                     |
| `luge`       | `['ice', 'snow']`                                      |
| `beetle`     | `['asphalt', 'cobble', 'earth']`                       |
| `boarder`    | `['asphalt', 'cobble', 'earth']`                       |
| `koi`        | `['water']`                                            |
| `turtle`     | `['water']`                                            |
| `manta`      | `['water']`                                            |
| `dolphin`    | `['water']`                                            |
| `snowmobile` | `['snow', 'ice', 'earth']`                             |

### Heimat-Trail (Fallback)

The existing `trailFactory` function remains and is the **Heimat-Trail** of the type. It is used in two cases:

1. `surfaceClasses: []` (empty) — type has no class assignment yet → always Heimat-Trail.
2. No match — the chosen track has no class that matches the racer type → Heimat-Trail instead of no trail.

The Heimat-Trail guarantees backward compatibility: tracks without a `surfaceClasses` field behave as before.

### trailFactory after VRE-4

`trailFactory` remains in every racer type config as the **Heimat-Trail** — the static default effect of the type.

After VRE-4, RaceScreen dispatches via `resolveTrailEmitter()`:

```javascript
// trailResolver.js
const emitter = resolveTrailEmitter(racerType, raceData.trackSurfaceClasses);
// emitter = { spawn, update, render } when class matches, otherwise null

// In RaceScreen rAF loop (per racer):
if (r.surfaceEmitter) {
  r.surfaceParticles = r.surfaceEmitter.update(
    [
      ...r.surfaceParticles,
      ...r.surfaceEmitter.spawn(r.x, r.y, r.baseSpeed, r.angle, ts),
    ],
    dt / 16,
  );
} else {
  // Heimat-Trail: trailFactory particles in global dustParticles pool
  st.dustParticles.push(
    ...rt.getTrailParticles(r.x, r.y, r.baseSpeed, r.angle, ts),
  );
}
```

`trailFactory` is in practice no longer active for all 5 default tracks (all have matching surfaceClasses). It remains active for custom tracks without surfaceClasses and for legacy combinations.

### API extension (VRE-1)

`SpriteRacerType` gets the new accessor:

```javascript
getSurfaceClasses(); // → string[] (IDs of the surface classes of this type)
```

The former `rteDefinitions` placeholder (`getRteDefinitions()`) is removed in VRE-1.

---

## Phase 7 preview

When sprite upload arrives:

1. Dev Panel UI gets a "+ New Racer Type" button
2. User uploads sprite sheet + fills in metadata (name, frame count, coats)
3. Server saves sprite at `client/public/assets/racers/<custom-id>.png`
4. `racearena:racerTypes` gets a new entry with dynamic config
5. Registry reads dynamically — no code classes needed for custom types anymore
