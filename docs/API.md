# RaceArena — API Reference

**Owns:** the backend's HTTP surface — the shape of the endpoints it documents, and what they persist. The client's use of them is [ARCHITECTURE.md](ARCHITECTURE.md).

> **⚠ THIS FILE IS NOT COMPLETE, AND UNTIL 2026-09-02 IT SAID IT WAS.** The line above read *"every
> endpoint"*. Measured against the tree: the server mounts **nine** API routers registering **59**
> routes, and this document describes **13** — 7 of the 11 track routes, all 5 surface-class routes,
> and `/api/health`. Missing entirely: `/api/auth`, `/api/users`, `/api/player-groups`,
> `/api/brands`, `/api/racers`, `/api/seed-notices` and `/api/races`.
> **`/api/auth` is documented in [AUTH.md](AUTH.md)**, which covers its seven endpoints correctly;
> the others are documented nowhere.
> **The ownership claim is corrected rather than the gap filled** — writing 36 endpoint descriptions
> would be completeness work, and a document that admits its boundary is more useful than one that
> overstates it (DOC-TRUTH-2, 2026-09-02).
>
> *(★ Corrected again 2026-09-04, AUDIT-DOCS-1: the missing list ALSO named `/api/surface-classes`,
> while §Surface-Class API two screens below documents all five of its routes — and the "13" it
> stands beside already counted them. **A claim wrong in a list and right in a heading of the same
> file**, which is the exact search shape these passes keep missing.)*
>
> *(★★ Re-measured 2026-09-27, DELIVERY-CLEAN-1 §9. The 2026-09-04 figures — 8 routers, 49
> routes, 36 undocumented — were **correct when written and went stale two days later**:
> `server/src/routes/races.js` and its `app.use('/api/races', racesRouter)` mount both landed on
> 2026-09-06 in `5c08dc87` (RACE-SAVE-3). So a ninth router appeared, its three routes with it, and
> **`/api/races` was missing from the "missing entirely" list above** — the document's own honest
> gap list had itself become incomplete, which is the same failure one level up.*
>
> *The method behind the new numbers, stated because it is not the 2026-09-04 method and the two are
> not comparable: every `router.<verb>(` in the nine modules `app.js` mounts under `/api` (49), plus
> the three admin sub-routes `attachPromoteExport` (`routes/_defaultPromote.js`) attaches to each of
> `brands`, `playerGroups` and `tracks` (9), plus `/api/health` (1) — **59**. Undocumented is
> therefore **46**. The 2026-09-04 count of 49 did not include the `attachPromoteExport` sub-routes;
> its exact rule was not recoverable from the text, so these figures replace it rather than
> continuing it.)*

The backend runs on port 4000 (`docker-compose up`). All endpoints are prefixed with `/api/`.

---

## Track API (`/api/tracks`)

Introduced in Phase L (PR #43–#44).

| Method   | Path                         | Description                                                        |
| -------- | ---------------------------- | ------------------------------------------------------------------ |
| `GET`    | `/api/tracks`                | List all server tracks (summary, no geometry arrays)               |
| `GET`    | `/api/tracks/:id`            | Full track including geometry (`innerPoints`, `outerPoints`, etc.) |
| `GET`    | `/api/tracks/:id/background` | Binary background image (JPEG/PNG)                                 |
| `POST`   | `/api/tracks`                | Create a new track                                                 |
| `PUT`    | `/api/tracks/:id`            | Update an existing track                                           |
| `DELETE` | `/api/tracks/:id`            | Delete a track (also removes background file)                      |
| `POST`   | `/api/tracks/:id/background` | Upload background image (multipart/form-data, max 10 MB)           |

**Validation (POST/PUT):** `name` (non-empty string, max 100 characters), `closed` (boolean), `worldWidth`/`worldHeight` (numbers), geometry (`centerPoints ≥ 2` OR both `innerPoints ≥ 2` and `outerPoints ≥ 2`). Additionally: `effects[*].config.count` must be a finite integer 0–1000; geometry coordinates must be finite numbers with `|coord| ≤ 10000`.

**Upload validation (POST /:id/background):** Accepted types are PNG, JPEG, and WebP only. Validation is against magic bytes (file content), not the client-supplied `Content-Type` header — non-image types are rejected before buffering. Response includes `X-Content-Type-Options: nosniff`.

**Atomic writes:** all JSON files are written to a `.tmp` file and renamed — no partial-write corruption.

**Storage:** `server/data/tracks/<id>.json` + `server/data/backgrounds/<id>.(jpg|png|webp)`

---

## Surface-Class API (`/api/surface-classes`)

Introduced in Phase VRE-1 (feat/visual-racer-effects-foundation).

The backend stores only **custom classes** and **default-class parameter overrides**. The 9 built-in default surface classes (Asphalt, Sand, Earth, Mud, Grass, Snow, Ice, Water, Air) live as code constants in `client/src/modules/surface-effects/defaults.js` and are never seeded to the backend.

| Method   | Path                       | Description                                              |
| -------- | -------------------------- | -------------------------------------------------------- |
| `GET`    | `/api/surface-classes`     | List all backend-stored classes (custom + overrides)     |
| `GET`    | `/api/surface-classes/:id` | Single class by id                                       |
| `POST`   | `/api/surface-classes`     | Create a new custom class or default-class override      |
| `PUT`    | `/api/surface-classes/:id` | Update (or upsert) a class                               |
| `DELETE` | `/api/surface-classes/:id` | Delete a custom class or remove a default-class override |

### Request body — POST / PUT

```json
{
  "id": "lava",
  "label": "Lava",
  "generatorId": "particle",
  "config": {
    "color": "#ff4400",
    "sizeMin": 2,
    "sizeMax": 5,
    "lifetimeFrames": 20,
    "spawnProbability": 0.5,
    "drift": 1,
    "gravity": 0
  },
  "isOverride": false
}
```

**Validation:**

- `id` — required; lowercase alphanumeric + hyphens/underscores only (`[a-z0-9_-]+`)
- `label` — required, non-empty string, max 100 characters
- `generatorId` — required; one of `"particle"`, `"cloud"`, `"splash"`, `"line"`
- `config` — required, non-array object

**Status codes:**

- `201 Created` — successful POST
- `200 OK` — successful PUT (update or upsert)
- `204 No Content` — successful DELETE
- `400 Bad Request` — validation failure
- `404 Not Found` — GET/DELETE on unknown id
- `409 Conflict` — POST with an id that already exists

### Default overrides

To override a built-in default class, POST with the same `id` as the default and `isOverride: true`. The frontend registry merges the backend override over the code default. Deleting an override reverts to the code default.

### Storage

`server/data/surface-classes/<id>.json` — one file per stored class. Atomic write (`.tmp` + rename).

---

## Health

| Method | Path          | Description                            |
| ------ | ------------- | -------------------------------------- |
| `GET`  | `/api/health` | `{ status: "ok", timestamp: "<ISO>", build: <build identity> }` |

*(The `build` field was added by BUILD-FROM-OUTSIDE-1 (`a24f47e2`, 2026-08-23) and this row did not follow it; it reports `unknown` AND the reason rather than failing quietly. Corrected 2026-09-03.)*

---

## Planned (Phase 5)

A full race-integrity backend with Socket.IO, leaderboard, and JWT auth is planned for Phase 5.
See [ARCHITECTURE.md — Future: Phase 5 Server](ARCHITECTURE.md#future-phase-5-server).
