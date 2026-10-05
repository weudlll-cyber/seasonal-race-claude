# RaceArena — API Reference

**Owns:** the backend's HTTP surface — the shape of the endpoints it documents, and what they persist. The client's use of them is [ARCHITECTURE.md](ARCHITECTURE.md).

**Complete as of 2026-10-06 (TIDY-C-3): all 63 routes the server registers.** Counted from source,
not from earlier counts: the `router.<verb>(` calls in the nine routers `server/src/app.js` mounts
under `/api` (53), the three promote/export sub-routes `attachPromoteExport`
(`server/src/routes/_defaultPromote.js`) adds to each of tracks, player groups and brands (9), and
`GET /api/health` (1). Every entry says who may call it, what it takes, what it answers and every
error it can give, each with the `file:line` it was read from; the numbered table at the end is the
count to re-check. **Line numbers drift with the code** — a citation names where the rule was on
this date, and the rule is found from there.

*History, kept short: until 2026-09-02 this file claimed every endpoint while describing 13; from
then until 2026-10-06 it said so (13 of 59 at the 2026-09-27 count, before the evaluation and
points-rule routes added four). `/api/auth` is also described, with the session model behind it, in
[AUTH.md](AUTH.md).*

The backend runs on port 4000 (`docker-compose up`). All endpoints are prefixed with `/api/`.

---

## Access rules

**Middleware order** (`server/src/app.js:34-75`): helmet → `cors(corsOptions)` (`:37`) →
`express.json({ limit: '1mb' })` (`:38`) → session (`:39`) → `csrfOriginGuard` (`:40`) → static
client + SPA fallback (`:48-49`, both refuse `/api/*`) → `requireAuth` (`:51`) → `requireAdmin`
(`:52`) → `GET /api/health` (`:58`) → the three rate limiters (`:62-66`) → the routers (`:67-75`)
→ the API 404 (`:79`).

**Public paths** — exact method + path match, after a trailing slash is stripped
(`server/src/auth/guards.js:13-18`, matched at `:129-135`, normalisation at `:88-90`):
`GET /api/health`, `GET /api/auth/setup-needed`, `POST /api/auth/setup`, `POST /api/auth/login`.

**Any signed-in user** — every other `/api/*` path (deny by default). `requireAuth` answers
`401 {"error":"not authenticated"}` when there is no session user (`server/src/auth/guards.js:137-139`),
when the session's user no longer exists (`:141-145`), or when the session's `sessionEpoch` differs
from the user record's, i.e. the password was changed since sign-in (`:150-152`). On success it sets
`req.authUser = {id, username, role, team, teamNormalized}` (`:178-184`); a user with no team still
authenticates, with `team: null` (`:171-176`). The two roles are `operator` and `admin`
(`server/src/auth/usersStore.js:223`); "signed-in" below means operator or admin.

**Admin only** — `requireAdmin` answers `403 {"error":"forbidden"}` when the path matches a
`ROUTE_POLICY` entry with `role: 'admin'` and `req.authUser.role !== 'admin'`
(`server/src/auth/guards.js:189-197`). HEAD is checked as GET (`:94-97`). The admin entries:

| Entry | Methods | Path pattern | Line |
|---|---|---|---|
| users | GET POST PUT DELETE PATCH | `/api/users` and everything under it | `server/src/auth/guards.js:24-29` |
| surface-classes mutations | POST PUT DELETE PATCH | `/api/surface-classes` and under | `server/src/auth/guards.js:31-36` |
| player-groups promote/export | GET POST | `/api/player-groups/:id/(set-default\|clear-default\|export-seed)` | `server/src/auth/guards.js:39-45` |
| brands promote/export | GET POST | `/api/brands/:id/(set-default\|clear-default\|export-seed)` | `server/src/auth/guards.js:48-53` |
| tracks promote/export | GET POST | `/api/tracks/:id/(set-default\|clear-default\|export-seed)` | `server/src/auth/guards.js:56-61` |
| race verify | POST | `/api/races/:shortKey/verify` | `server/src/auth/guards.js:66-71` |
| points rule write | PUT | `/api/races/evaluation/points-rule` | `server/src/auth/guards.js:74-79` |

The policy matches on the path pattern alone, before any route runs, so an operator gets 403 on an
admin path whether or not the record exists.

**CSRF rule.** For every `POST`/`PUT`/`DELETE`/`PATCH` under `/api/`
(`server/src/auth/csrf.js:78-81`), the `Origin` header, or failing that the origin of `Referer`
(`:84-94`), must equal the server's own origin (`RA_PUBLIC_ORIGIN`, else derived from the `Host`
header) or one of the allowed client origins (`RA_CLIENT_ORIGIN` plus `RA_PUBLIC_ORIGIN`)
(`:117-122`). Otherwise the answer is `403 {"error":"cross-origin request rejected"}` (`:107`, `:112`,
`:121`). A request with neither header is let through, except in strict mode (`RA_CSRF_STRICT`,
default on in production), where it gets `403 {"error":"origin required"}` (`:99-101`, `:62-67`).
This guard runs **before** `requireAuth`, so it applies to the public `POST` paths too, and a
rejected cross-origin request gets 403 rather than 401. Where the routes below say "CSRF 403",
these are the citations.

**Rate limits** (`server/src/auth/rateLimit.js`). All three answer
`429 {"error":"too many attempts, please try again later"}`, send standard `RateLimit-*` headers,
and are switched off when `NODE_ENV=test` or `VITEST` is set (`:12`).

| Path (mounted with `app.use`, so every method) | Window | Max | Counts | Key | Lines |
|---|---|---|---|---|---|
| `/api/auth/login` (`server/src/app.js:62`) | `RA_LOGIN_RL_WINDOW_MS`, default 15 min | `RA_LOGIN_RL_MAX`, default 10 | failed requests only | IP | `server/src/auth/rateLimit.js:18-26` |
| `/api/auth/setup` (`server/src/app.js:63`) | `RA_SETUP_RL_WINDOW_MS`, default 60 min | `RA_SETUP_RL_MAX`, default 10 | every request | IP | `server/src/auth/rateLimit.js:34-42` |
| `/api/auth/change-password` (`server/src/app.js:66`) | `RA_LOGIN_RL_WINDOW_MS`, default 15 min | 5 (fixed) | failed requests only | `req.authUser.id`, else IP | `server/src/auth/rateLimit.js:74-83` |

The limiters are mounted after `requireAuth` (`server/src/app.js:62-66`). So a signed-out caller of
`change-password` gets 401 and is never counted.

**Errors common to every route, not repeated below:**

- An unknown path under `/api/` answers `404 {"error":"no such API route: <METHOD> <url>"}`
  (`server/src/staticClient.js:169-173`), but only after the guards: a signed-out caller gets 401.
- There is **no application error handler** in `server/src/app.js`. A malformed JSON body (400), a
  body over 1 MB (413, `server/src/app.js:38`), or an exception thrown synchronously inside a handler
  (for example a failed disk write in `atomicWriteJson`) falls through to Express's default handler,
  which answers with an HTML page, not JSON.
- Uploads (the three image routes) go through `uploadSingleImage` (`server/utils/imageUpload.js:105-122`)
  using multer with in-memory storage, a 10 MB limit (`:21`, `:64-76`) and a MIME pre-filter for
  `image/jpeg|png|webp` (`:19`, `:68-74`). It answers **413** for a file over 10 MB (`:109-112`),
  **400** "File type not allowed…" for a disallowed MIME type (`:114-117`), and **400** "File upload
  failed." for any other multer error, such as a wrong field name (`:119`). The upload runs **before**
  the handler looks up the record, so these errors come before the record's 404. The handler then
  checks the magic bytes (`server/utils/imageUpload.js:27-56`); the client's `Content-Type` is
  ignored.

---

## Health (`/api/health`)

The build-identity probe, defined inline in the app factory (`server/src/app.js:54-60`).

### `GET /api/health`

- **Who:** public (`server/src/auth/guards.js:14`).
- **Request:** none.
- **Response:** 200 `{status: "ok", timestamp: <ISO string>, build: {commit, branch, dirty?, reason?}}`
  (`server/src/app.js:58-60`). The `build` shape is in `server/src/buildIdentity.js:45`. When nothing
  supplied the commit or branch, those read `'unknown'` and `reason` says why (`server/src/buildIdentity.js:52-54`, `:66-67`).
- **Errors:** none of its own.

---

## Auth (`/api/auth`)

Setup, login, logout, the current user and changing your own password, with an atomic bootstrap for
the first admin (`server/src/auth/authRouter.js:6`).

### `GET /api/auth/setup-needed`

- **Who:** public (`server/src/auth/guards.js:15`).
- **Request:** none.
- **Response:** 200 `{setupNeeded: boolean}`. It is true only when the setup marker file is absent
  **and** the user store is empty (`server/src/auth/authRouter.js:43-46`).
- **Errors:** none of its own.

### `POST /api/auth/setup`

- **Who:** public (`server/src/auth/guards.js:16`), gated by a bootstrap token. Rate-limited per IP,
  counting every request (`server/src/app.js:63`, `server/src/auth/rateLimit.js:34-42`).
- **Request:** header `x-bootstrap-token`, compared in constant time with `RA_BOOTSTRAP_TOKEN`. A
  token in the body is not read (header read at `server/src/auth/authRouter.js:56`, constant-time compare at `:62`,
  helper at `:27-31`). Body `{username: string, password: string}`, both required and
  non-blank (`server/src/auth/authRouter.js:78-81`). The role is always `admin` and the team is the
  founding constant `FOUNDING_TEAM`; neither is read from the body (`server/src/auth/authRouter.js:123-130`).
- **Response:** 201 `{username, role, team}`, and the session is regenerated, which signs the caller
  in (`server/src/auth/authRouter.js:143-157`). It is still 201 if that auto-login fails after the
  commit (`:158-170`).
- **Errors:**
  - 409 `setup already complete`: the marker exists (`server/src/auth/authRouter.js:51-53`), it was
    created by a concurrent request (`:88`), or users exist without the marker (`:97-107`).
  - 403 `setup not available`: `RA_BOOTSTRAP_TOKEN` is unset (`server/src/auth/authRouter.js:58-61`)
    or the token is wrong (`:62-75`). The two answers are deliberately identical.
  - 400 `invalid username or password`: the body is missing or blank (`server/src/auth/authRouter.js:78-81`),
    or the store rejects the username, password or role (`:189-191`).
  - 500 `setup failed`: the marker could not be opened (`server/src/auth/authRouter.js:89-90`), or
    any other failure before the commit (`:192`).
  - 429 from the setup limiter (`server/src/auth/rateLimit.js:41-42`). CSRF 403.

### `POST /api/auth/login`

- **Who:** public (`server/src/auth/guards.js:17`). Rate-limited per IP, counting failures only
  (`server/src/app.js:62`, `server/src/auth/rateLimit.js:18-26`).
- **Request:** body `{username, password}`. There is no explicit validation; a missing field simply
  fails to match. The username is looked up normalised (NFC, trimmed, lower-cased,
  `server/src/auth/usersStore.js:23-25`) (`server/src/auth/authRouter.js:199-200`).
- **Response:** 200 `{username, role, team}` (`team` may be `null`), after the session is
  regenerated (`server/src/auth/authRouter.js:213-219`).
- **Errors:**
  - 401 `invalid credentials`: unknown user (`server/src/auth/authRouter.js:202-205`, which
    deliberately spends the same time on a dummy hash) or wrong password (`:207-210`).
  - 500 `login failed`: session regenerate or save failed (`server/src/auth/authRouter.js:214`, `:218`).
  - 429 from the login limiter (`server/src/auth/rateLimit.js:25-26`). CSRF 403.

### `POST /api/auth/logout`

- **Who:** any signed-in user (not public, so `server/src/auth/guards.js:137`). The handler repeats
  the check inline (`server/src/auth/authRouter.js:226-228`), but the guard always answers first.
- **Request:** none.
- **Response:** 200 `{ok: true}`. The session is destroyed and the cookie cleared, as is the legacy
  `ra.sid` cookie (`server/src/auth/authRouter.js:229-239`).
- **Errors:** 401 from the guard (`server/src/auth/guards.js:138`, `:144`, `:151`). 500
  `logout failed` when destroying the session fails (`server/src/auth/authRouter.js:230-233`). CSRF 403.

### `POST /api/auth/change-password`

- **Who:** any signed-in user, and only for **their own** password. The target is
  `req.authUser.id` and never the body (`server/src/auth/authRouter.js:243-260`). It is not in
  `ROUTE_POLICY`. Rate-limited to 5 failures per user (`server/src/app.js:66`,
  `server/src/auth/rateLimit.js:74-83`).
- **Request:** body `{currentPassword, newPassword}` (`server/src/auth/authRouter.js:256`).
  `newPassword` must be non-blank, by the store's rule (`server/src/auth/usersStore.js:270-281`,
  `:30-34`).
- **Response:** 200 `{ok: true}`. The epoch bump ends the user's **other** sessions; this session is
  re-stamped so it survives (`server/src/auth/authRouter.js:277-292`).
- **Errors:**
  - 401 from the guard (`server/src/auth/guards.js:138`, `:144`, `:151`). The inline 401s at
    `server/src/auth/authRouter.js:261` and `:263-266` are defensive.
  - 401 `invalid credentials`: wrong current password (`server/src/auth/authRouter.js:269-275`).
  - 400 `Password must not be empty`: `newPassword` is missing, empty or blank. The store raises
    `EMPTY_UPDATE`/`INVALID_PASSWORD`, and the handler maps both to this message
    (`server/src/auth/authRouter.js:282-284`).
  - 500 `internal error` (`server/src/auth/authRouter.js:285-286`).
  - 429 from the change-password limiter (`server/src/auth/rateLimit.js:82-83`). CSRF 403.

### `GET /api/auth/me`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`). The handler repeats the check
  inline (`server/src/auth/authRouter.js:297-305`).
- **Request:** none.
- **Response:** 200 `{username, role, team}`, where `team` may be `null` (`server/src/auth/authRouter.js:306-308`).
- **Errors:** 401 from the guard (`server/src/auth/guards.js:138`, `:144`, `:151`). The handler's own
  401s (`server/src/auth/authRouter.js:298`, `:303`) are defensive.

---

## Users (`/api/users`)

Lists, creates, updates and deletes race directors (user accounts). The router itself has no auth
checks; it relies on the guard stack (`server/src/auth/usersRouter.js:6-8`).

A user object returned below is the stored record minus `passwordHash` and `sessionEpoch`
(`server/src/auth/usersStore.js:49-52`): `{id, username, usernameNormalized, role, team,
teamNormalized, createdAt, createdBy}` (the record is built at `server/src/auth/usersStore.js:242-262`).

### `GET /api/users`

- **Who:** admin only (`server/src/auth/guards.js:24-29`).
- **Request:** none.
- **Response:** 200 `[user, …]` (`server/src/auth/usersRouter.js:21-24`).
- **Errors:** 401 (`server/src/auth/guards.js:138`, `:144`, `:151`). 403 for an operator
  (`server/src/auth/guards.js:192-193`). A corrupt `users.json` throws `USERS_STORE_CORRUPT`
  (`server/src/auth/usersStore.js:56-73`), which is not caught and so becomes Express's default 500
  HTML page. The same throw would already fail `requireAuth`'s lookup.

### `POST /api/users`

- **Who:** admin only (`server/src/auth/guards.js:24-29`).
- **Request:** body `{username, password, role, team, allowNewTeam?}` (`server/src/auth/usersRouter.js:31`).
  - `username`: non-blank, and unique after normalisation (`server/src/auth/usersStore.js:213-217`, `:229-236`).
  - `password`: non-blank (`server/src/auth/usersStore.js:218-222`).
  - `role`: `"operator"` or `"admin"` (`server/src/auth/usersStore.js:223-227`).
  - `team`: a non-blank string with no default (`server/src/auth/teams.js:98-100`,
    `server/src/auth/usersStore.js:138-142`). It must match an existing team, compared normalised,
    and the existing spelling is adopted. A new team is accepted only when `allowNewTeam === true`
    (`server/src/auth/usersStore.js:144-161`, `server/src/auth/usersRouter.js:38`).
- **Response:** 201 user object (`server/src/auth/usersRouter.js:41`).
- **Errors:**
  - 409 `username already taken` (`server/src/auth/usersRouter.js:43-45`).
  - 400 `{error, knownTeams: [...]}` for an unknown team (`server/src/auth/usersRouter.js:48-50`).
  - 400 `{error}` for `INVALID_USERNAME`, `INVALID_PASSWORD`, `INVALID_ROLE` or `INVALID_TEAM`
    (`server/src/auth/usersRouter.js:51-55`).
  - 500 `internal error` (`server/src/auth/usersRouter.js:56-57`).
  - 401 and 403 from the guards. CSRF 403.

### `PUT /api/users/:id`

- **Who:** admin only (`server/src/auth/guards.js:24-29`).
- **Request:** path `id` (the user's UUID). Body `{role?, password?, team?, allowNewTeam?}`
  (`server/src/auth/usersRouter.js:76`), with at least one of role, password or team present. An
  empty-string `password` counts as absent (`server/src/auth/usersStore.js:272-282`). The role, team
  and `allowNewTeam` rules are the same as for create (`server/src/auth/usersStore.js:294-320`).
  Setting a password bumps `sessionEpoch`, which signs that user out everywhere
  (`server/src/auth/usersStore.js:321-325`). An admin who changes their own password keeps the
  current session (`server/src/auth/usersRouter.js:77`, `:86-88`).
- **Response:** 200 user object (`server/src/auth/usersRouter.js:90`).
- **Errors:**
  - 404 `user not found` (`server/src/auth/usersRouter.js:92`).
  - 409: demoting the last admin (`server/src/auth/usersRouter.js:93`, `server/src/auth/usersStore.js:300-309`).
  - 400 `{error, knownTeams}` for an unknown team (`server/src/auth/usersRouter.js:94-96`).
  - 400 for `INVALID_ROLE`, `INVALID_PASSWORD`, `INVALID_TEAM` or `EMPTY_UPDATE` (`server/src/auth/usersRouter.js:97-99`).
  - 500 (`server/src/auth/usersRouter.js:100-101`).
  - 401 and 403 from the guards. CSRF 403.

### `DELETE /api/users/:id`

- **Who:** admin only (`server/src/auth/guards.js:24-29`).
- **Request:** path `id`.
- **Response:** 200 with the deleted user object (`server/src/auth/usersRouter.js:106-109`). Note:
  200 with a body, not 204.
- **Errors:**
  - 404 `user not found` (`server/src/auth/usersRouter.js:111`).
  - 409: deleting the last admin (`server/src/auth/usersRouter.js:112`, `server/src/auth/usersStore.js:345-353`).
  - 500 (`server/src/auth/usersRouter.js:113-114`).
  - 401 and 403 from the guards. CSRF 403.

---

## Tracks (`/api/tracks`)

Track records with CRUD and a background-image upload (`server/src/routes/tracks.js:6`), held in an
in-memory map that is loaded at boot from `DATA_ROOT/tracks/*.json` (`:35`, `:45-62`). Images live in
`DATA_ROOT/backgrounds` (`:36`). **Not team-scoped:** every signed-in user sees and edits the same
tracks. Every create, update or upload also writes a timestamped backup (`:253-264`).

### `GET /api/tracks`

- **Who:** any signed-in user (not in `ROUTE_POLICY`; `server/src/auth/guards.js:137`).
- **Request:** none.
- **Response:** 200 `[summary, …]`. Each summary is the track record without `innerPoints`,
  `outerPoints`, `centerPoints` and `backgroundImageFile`, plus `pointCount: {inner, outer}`
  (`server/src/routes/tracks.js:227-241`, `:457-459`).
- **Errors:** 401 (`server/src/auth/guards.js:138`, `:144`, `:151`).

### `GET /api/tracks/:id`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`).
- **Request:** path `id`.
- **Response:** 200 with the full track record minus `backgroundImageFile` (`server/src/routes/tracks.js:461-466`).
- **Errors:** 404 `Track not found` (`server/src/routes/tracks.js:463`). 401.

### `GET /api/tracks/:id/background`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`). The admin regex for tracks covers
  only the three promote/export suffixes (`:58`).
- **Request:** path `id`.
- **Response:** 200 binary image stream. `Content-Type` comes from the stored file's extension
  (`image/jpeg|png|webp`, else `application/octet-stream`), with `X-Content-Type-Options: nosniff`
  (`server/src/routes/tracks.js:478-485`, `server/utils/imageUpload.js:12-17`).
- **Errors:**
  - 404 `Track not found` (`server/src/routes/tracks.js:470`).
  - 404 `No background` (`:471`).
  - 404 `Background file missing`: the stored name is unsafe (`:472-473`,
    `server/utils/isSafeAssetFilename.js:4-15`) or the file is absent (`server/src/routes/tracks.js:476`).
  - 500 `Failed to read background`, if headers have not yet been sent (`:482-484`).
  - 401.

### `POST /api/tracks`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`).
- **Request:** JSON body, validated by `validateTrackBodyForCreate` (`server/src/routes/tracks.js:319-374`):
  - `name`: non-blank string, at most 100 characters (`:321-325`, `:136`).
  - `closed`: boolean (`:326-328`).
  - `worldWidth`, `worldHeight`: numbers (`:329-331`).
  - Geometry: `centerPoints` with at least 2 points, or `innerPoints` **and** `outerPoints` with at
    least 2 points each (`:332-339`). Each point is `{x,y}` or `[x,y]` with finite coordinates,
    \|coord\| ≤ 10000 (`:138-161`, `:341-350`, `:132`).
  - `surfaceClasses?`: array of strings (`:352-359`).
  - `maxRacers?`: a positive number or `null` (`:360-364`).
  - `trackLights?`: an object with `color?` (`#RRGGBB`), `style?`
    (`steady|sequence|sync_pulse|random_flash`) and `speed?` (number, 0.1–3.0) (`:365-368`, `:98-121`).
  - `effects?`: an array of objects; `config.count`, when present, must be an integer from 0 to
    480000 (`:369-372`, `:164-190`, `:129`).
  - `geometryId?` and `createdAt?` are taken from the body if given (`:496`, `:518`).
  - **Every other body field is stored as sent**, spread over the defaults (`:499-520`), except that
    `backgroundImage` is dropped and `id`, `isDefault: false` and `backgroundImageFile: null` are forced.
- **Response:** 201 with the new record minus `backgroundImageFile`. The `id` is 12 hex characters
  (`server/src/routes/tracks.js:243-245`). Defaults for unsent fields: `icon`, `description`,
  `defaultRacerTypeId: 'horse'`, `color`, `defaultLaps: 2`, `defaultDurationSec: 60`,
  `defaultWinners: 3`, `surfaceClasses: []`, `trackLights` (`:500-520`, `:527-528`).
- **Errors:** 400 `{error: "<messages joined by '; '>"}` (`server/src/routes/tracks.js:492-493`). 401.
  CSRF 403.

### `PUT /api/tracks/:id`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`). This includes default tracks: there
  is no `isDefault` check on update.
- **Request:** path `id`. A partial JSON body, validated by `validateTrackBodyForUpdate`, which checks
  only the fields present (`server/src/routes/tracks.js:383-451`). The rules are the same as for
  create. If any geometry key is present, the geometry must be complete (`:401-423`). `geometryId`
  must be a string or `null` (`:424-428`). Other fields are merged over the existing record. `id`,
  `isDefault`, `backgroundImageFile` and `createdAt` are preserved; `geometryId` is taken from the
  body if the key is present (`:539-549`).
- **Response:** 200 with the updated record minus `backgroundImageFile` (`server/src/routes/tracks.js:555-556`).
- **Errors:** 404 `Track not found` (`server/src/routes/tracks.js:534`). 400 joined messages
  (`:536-537`). 401. CSRF 403.

### `DELETE /api/tracks/:id`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`).
- **Request:** path `id`.
- **Response:** 204, empty. The JSON file and the background image are removed; the image is removed
  only if its stored name is safe (`server/src/routes/tracks.js:570-576`, `:285-297`).
- **Errors:** 404 `Track not found` (`server/src/routes/tracks.js:562`). 403 `Cannot delete default
  track…` when `isDefault` is set (`:563-568`). 401. CSRF 403.

### `DELETE /api/tracks/:id/background`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`).
- **Request:** path `id`.
- **Response:** 204. The file is removed only if its name is safe, and `backgroundImageFile` is set
  to `null` (`server/src/routes/tracks.js:580-592`). It is still 204 when the track had no background.
- **Errors:** 404 `Track not found` (`server/src/routes/tracks.js:582`). 401. CSRF 403.

### `POST /api/tracks/:id/background`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`).
- **Request:** path `id`. `multipart/form-data` with the file in field **`background`**
  (`server/src/routes/tracks.js:595`), at most 10 MB, PNG/JPEG/WebP. It is stored as `<id>.<ext>`;
  an older file under another extension is deleted (`:610-622`).
- **Response:** 200 `{backgroundImageFile: "<id>.<png|jpg|webp>"}` (`server/src/routes/tracks.js:633`).
- **Errors:**
  - Upload-helper 413 or 400 (`server/utils/imageUpload.js:109-119`), before the record lookup.
  - 404 `Track not found` (`server/src/routes/tracks.js:597`).
  - 400 `No file uploaded (field name: background)` (`:598-599`).
  - 400 `File type not allowed…`: the magic bytes are not PNG, JPEG or WebP (`:603-608`).
  - 401. CSRF 403.

### `POST /api/tracks/:id/set-default`

- **Who:** admin only (`server/src/auth/guards.js:56-61`).
- **Request:** path `id`; no body.
- **Response:** 200 with the full stored record, now `isDefault: true` with a new `updatedAt`. This
  is the raw record, so `backgroundImageFile` is included (`server/src/routes/_defaultPromote.js:34-40`,
  attached at `server/src/routes/tracks.js:639-644`).
- **Errors:** 404 `Not found` (`server/src/routes/_defaultPromote.js:36`). 401. 403
  (`server/src/auth/guards.js:192-193`). CSRF 403.

### `POST /api/tracks/:id/clear-default`

- **Who:** admin only (`server/src/auth/guards.js:56-61`).
- **Request:** path `id`; no body.
- **Response:** 200 with the full record, now `isDefault: false` (`server/src/routes/_defaultPromote.js:42-48`).
- **Errors:** 404 `Not found` (`server/src/routes/_defaultPromote.js:44`). 401. 403. CSRF 403.

### `GET /api/tracks/:id/export-seed`

- **Who:** admin only (`server/src/auth/guards.js:56-61`).
- **Request:** path `id`.
- **Response:** 200 with the full record. When there is a background, it also carries
  `_backgroundAssetRelPath: "server/data/backgrounds/<file>"`
  (`server/src/routes/_defaultPromote.js:50-58`, `server/src/routes/tracks.js:645-651`).
- **Errors:** 404 `Not found` (`server/src/routes/_defaultPromote.js:52`). 401. 403.

---

### Track notes kept from the earlier reference

**Validation (POST/PUT):** `name` (non-empty string, max 100 characters), `closed` (boolean), `worldWidth`/`worldHeight` (numbers), geometry (`centerPoints ≥ 2` OR both `innerPoints ≥ 2` and `outerPoints ≥ 2`). Additionally: `effects[*].config.count` must be a finite integer 0–1000; geometry coordinates must be finite numbers with `|coord| ≤ 10000`.

**Upload validation (POST /:id/background):** Accepted types are PNG, JPEG, and WebP only. Validation is against magic bytes (file content), not the client-supplied `Content-Type` header — non-image types are rejected before buffering. Response includes `X-Content-Type-Options: nosniff`.

**Atomic writes:** all JSON files are written to a `.tmp` file and renamed — no partial-write corruption.

**Storage:** `server/data/tracks/<id>.json` + `server/data/backgrounds/<id>.(jpg|png|webp)`

---

## Surface classes (`/api/surface-classes`)

Custom surface classes and overrides of the default classes, one file each under
`DATA_ROOT/surface-classes`. The code defaults live in the client (`server/src/routes/surfaceClasses.js:5-14`).
Not team-scoped.

A class object: `{id, label, generatorId, config, isDefault: false, isOverride, createdAt, updatedAt}`
(`server/src/routes/surfaceClasses.js:110-120`).

### `GET /api/surface-classes`

- **Who:** any signed-in user. The admin entry covers only mutating methods (`server/src/auth/guards.js:31-36`, `:137`).
- **Request:** none.
- **Response:** 200 `[class, …]` (`server/src/routes/surfaceClasses.js:88-90`).
- **Errors:** 401.

### `GET /api/surface-classes/:id`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`).
- **Request:** path `id`.
- **Response:** 200 with the class (`server/src/routes/surfaceClasses.js:93-97`).
- **Errors:** 404 `Surface class not found` (`server/src/routes/surfaceClasses.js:95`). 401.

### `POST /api/surface-classes`

- **Who:** admin only (`server/src/auth/guards.js:31-36`).
- **Request:** body validated by `validateBody` (`server/src/routes/surfaceClasses.js:62-81`):
  - `id`: matches `^[a-z0-9_-]+$` (`server/utils/isValidId.js:16-18`).
  - `label`: non-blank, at most 100 characters after trimming (`:69-73`, `:29`).
  - `generatorId`: one of `particle|cloud|splash|line` (`:74-76`, `:26`).
  - `config`: a non-array object (`:77-79`).
  - `isOverride?`: kept only when it is literally `true` (`:117`).
- **Response:** 201 with the class (`server/src/routes/surfaceClasses.js:124`).
- **Errors:** 400 joined messages (`server/src/routes/surfaceClasses.js:101-102`). 409 `Surface class
  '<id>' already exists` (`:105-107`). 401. 403 (`server/src/auth/guards.js:192-193`). CSRF 403.

### `PUT /api/surface-classes/:id`

- **Who:** admin only (`server/src/auth/guards.js:31-36`).
- **Request:** path `id`, which must pass `isValidId`. The body follows the same rules as POST; a
  body `id`, if present, must equal the path id (`server/src/routes/surfaceClasses.js:136-142`).
  This is an **upsert**: it creates the class if it is missing (`:127-131`). `isOverride` stays true
  once it has been set (`:152`).
- **Response:** 200 with the class (`server/src/routes/surfaceClasses.js:159`). It is 200 even when
  the class was created.
- **Errors:** 400 `id in body must match URL parameter` (`server/src/routes/surfaceClasses.js:136-138`).
  400 joined messages (`:141-142`). 401. 403. CSRF 403.

### `DELETE /api/surface-classes/:id`

- **Who:** admin only (`server/src/auth/guards.js:31-36`).
- **Request:** path `id`.
- **Response:** 204 (`server/src/routes/surfaceClasses.js:163-172`).
- **Errors:** 404 `Surface class not found` (`server/src/routes/surfaceClasses.js:165`). 401. 403. CSRF 403.

---

### Surface-class notes kept from the earlier reference

#### Request body — POST / PUT

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

#### Default overrides

To override a built-in default class, POST with the same `id` as the default and `isOverride: true`. The frontend registry merges the backend override over the code default. Deleting an override reverts to the code default.

#### Storage

`server/data/surface-classes/<id>.json` — one file per stored class. Atomic write (`.tmp` + rename).

---

## Player groups (`/api/player-groups`)

Saved lists of player names. Signed-in users have CRUD; admins promote, demote and export. One file
per group under `DATA_ROOT/player-groups` (`server/src/routes/playerGroups.js:5-15`). Not team-scoped.

A group object: `{id, name, players: string[], isDefault, createdAt, updatedAt}`
(`server/src/routes/playerGroups.js:140-147`).

### `GET /api/player-groups`

- **Who:** any signed-in user. The admin regex covers only the three suffixes (`server/src/auth/guards.js:39-45`, `:137`).
- **Request:** none.
- **Response:** 200 `[group, …]` (`server/src/routes/playerGroups.js:106-108`).
- **Errors:** 401.

### `GET /api/player-groups/:id`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`).
- **Request:** path `id`.
- **Response:** 200 with the group (`server/src/routes/playerGroups.js:111-115`).
- **Errors:** 404 `Player group not found` (`server/src/routes/playerGroups.js:113`). 401.

### `POST /api/player-groups`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`).
- **Request:** body validated by `validateBody` (`server/src/routes/playerGroups.js:67-99`):
  - `name`: non-blank, at most 100 characters after trimming (`:70-74`, `:34`).
  - `players`: a non-empty array of at most 200 entries (`:76-81`, `:39`). Every entry is a
    non-blank string (`:82-84`) of at most 32 characters after trimming (`:85-90`,
    `shared/nameLimits.mjs:42`, `:68-72`). No two entries may be the same name, ignoring case and
    spaces (`server/src/routes/playerGroups.js:94-95`, `shared/playerNames.mjs:44-55`).
  - `id?`: must satisfy `isValidId` if given, otherwise a random UUID is used (`server/src/routes/playerGroups.js:122-131`).
  - `isDefault` in the body is ignored (`:144`).
- **Response:** 201 with the group, its name and players trimmed (`server/src/routes/playerGroups.js:139-151`).
- **Errors:** 400 `{error: "<joined>", errors: [...]}` (`server/src/routes/playerGroups.js:133`).
  409 `Player group '<id>' already exists` (`:135-137`). 401. CSRF 403.

### `PUT /api/player-groups/:id`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`).
- **Request:** path `id`. The body follows the same `name` and `players` rules as POST, and both are
  required (`server/src/routes/playerGroups.js:160-161`). `isDefault` is preserved (`:168`).
- **Response:** 200 with the group (`server/src/routes/playerGroups.js:174`).
- **Errors:** 404 `Player group not found` (`server/src/routes/playerGroups.js:158`). 400
  `{error, errors}` (`:161`). 401. CSRF 403.

### `DELETE /api/player-groups/:id`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`).
- **Request:** path `id`.
- **Response:** 204 (`server/src/routes/playerGroups.js:179-189`).
- **Errors:** 404 (`server/src/routes/playerGroups.js:181`). 403 `Cannot delete a default player
  group` (`:182-184`). 401. CSRF 403.

### `POST /api/player-groups/:id/set-default`

- **Who:** admin only (`server/src/auth/guards.js:39-45`).
- **Request:** path `id`; no body.
- **Response:** 200 with the group, now `isDefault: true` and with a new `updatedAt`
  (`server/src/routes/_defaultPromote.js:34-40`, attached at `server/src/routes/playerGroups.js:194-200`).
- **Errors:** 404 `Not found` (`server/src/routes/_defaultPromote.js:36`). 401. 403. CSRF 403.

### `POST /api/player-groups/:id/clear-default`

- **Who:** admin only (`server/src/auth/guards.js:39-45`).
- **Request:** path `id`; no body.
- **Response:** 200 with the group, now `isDefault: false` (`server/src/routes/_defaultPromote.js:42-48`).
- **Errors:** 404 (`server/src/routes/_defaultPromote.js:44`). 401. 403. CSRF 403.

### `GET /api/player-groups/:id/export-seed`

- **Who:** admin only (`server/src/auth/guards.js:39-45`).
- **Request:** path `id`.
- **Response:** 200 with the record as stored. No `exportSeed` callback is passed, so the default
  JSON handler is used (`server/src/routes/_defaultPromote.js:55-57`, `server/src/routes/playerGroups.js:194-200`).
- **Errors:** 404 (`server/src/routes/_defaultPromote.js:52`). 401. 403.

---

## Brands (`/api/brands`)

Event branding records: names, colours, sponsor text and a logo image. Signed-in users have CRUD and
the logo routes; admins promote, demote and export (`server/src/routes/brands.js:5-22`). Records are
in `DATA_ROOT/brands` and logos in `DATA_ROOT/brand-logos` (`:45-46`). Not team-scoped.

A brand object: `{id, name, eventName, subtitle, primaryColor, secondaryColor, sponsorText,
logoFile, isDefault, logoMaxHeight, logoOpacity, logoCorner, createdAt, updatedAt}`
(`server/src/routes/brands.js:194-209`).

Body rules shared by POST and PUT (`validateBody`, `server/src/routes/brands.js:89-153`):

- `name`: required, non-blank, at most 100 characters after trimming (`:92-96`).
- `eventName`: required, non-blank, at most 100 characters (`:98-102`).
- `subtitle?`: a string of at most 200 characters, or `null` (`:104-110`).
- `sponsorText?`: a string of at most 200 characters, or `null` (`:112-118`).
- `primaryColor?`, `secondaryColor?`: `#rrggbb` (`:120-130`).
- `logoOpacity?`: a number from 0 to 1, after `Number()` coercion (`:132-137`).
- `logoMaxHeight?`: a number greater than 0 and at most 500 (`:139-144`, `:55`).
- `logoCorner?`: `bottom-right` or `top-right` (`:146-150`, `:59`).

### `GET /api/brands`

- **Who:** any signed-in user. The admin regex covers only the three suffixes (`server/src/auth/guards.js:48-53`, `:137`).
- **Request:** none.
- **Response:** 200 `[brand, …]` (`server/src/routes/brands.js:160-162`).
- **Errors:** 401.

### `GET /api/brands/:id`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`).
- **Request:** path `id`.
- **Response:** 200 with the brand (`server/src/routes/brands.js:165-169`).
- **Errors:** 404 `Brand not found` (`server/src/routes/brands.js:167`). 401.

### `POST /api/brands`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`).
- **Request:** the body rules above, plus `id?`, which must satisfy `isValidId` and otherwise becomes
  a random UUID (`server/src/routes/brands.js:176-185`). `isDefault` in the body is ignored (`:203`).
- **Response:** 201 with the brand. Defaults: `primaryColor` `#000000`, `secondaryColor` `#ffffff`,
  `logoMaxHeight` 90, `logoOpacity` 0.9, `logoCorner` `bottom-right`, `logoFile` `null`
  (`server/src/routes/brands.js:193-213`).
- **Errors:** 400 `{error, errors}` (`server/src/routes/brands.js:187`). 409 `Brand '<id>' already
  exists` (`:189-191`). 401. CSRF 403.

### `PUT /api/brands/:id`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`).
- **Request:** path `id`. The body rules above apply, so `name` and `eventName` are required on every
  PUT. Omitted optional fields keep their stored values; `isDefault` and `logoFile` are preserved
  (`server/src/routes/brands.js:226-247`). Ambiguity: a `subtitle` or `sponsorText` of `null` passes
  validation but is stored as the string `"null"` (`String(null)`, `:230-237`). POST instead turns
  `null` into `''` (`:198`, `:201`).
- **Response:** 200 with the brand (`server/src/routes/brands.js:251`).
- **Errors:** 404 `Brand not found` (`server/src/routes/brands.js:220`). 400 `{error, errors}`
  (`:222-223`). 401. CSRF 403.

### `DELETE /api/brands/:id`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`).
- **Request:** path `id`.
- **Response:** 204. The logo file and the record are removed (`server/src/routes/brands.js:263-271`).
  The stored `logoFile` is unlinked **without** an `isSafeAssetFilename` check (`:263-266`).
- **Errors:** 404 (`server/src/routes/brands.js:258`). 403 `Cannot delete a default brand`
  (`:259-261`). 401. CSRF 403.

### `GET /api/brands/:id/logo`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`).
- **Request:** path `id`.
- **Response:** 200 binary image stream, with `Content-Type` from the file extension and `nosniff`
  (`server/src/routes/brands.js:287-294`).
- **Errors:**
  - 404 `Brand not found` (`server/src/routes/brands.js:279`).
  - 404 `No logo` (`:280`).
  - 404 `Logo file missing`: the stored name is unsafe or the file is absent (`:281-285`).
  - 500 `Failed to read logo` (`:291-293`).
  - 401.

### `POST /api/brands/:id/logo`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`).
- **Request:** path `id`. `multipart/form-data` with the file in field **`logo`**
  (`server/src/routes/brands.js:298`), at most 10 MB, PNG/JPEG/WebP. It is stored as `<id>.<ext>`;
  an older file under another extension is deleted (`:311-321`).
- **Response:** 200 `{logoFile: "<id>.<ext>"}` (`server/src/routes/brands.js:327`).
- **Errors:**
  - Upload-helper 413 or 400 (`server/utils/imageUpload.js:109-119`).
  - 404 `Brand not found` (`server/src/routes/brands.js:300`).
  - 400 `No file uploaded (field name: logo)` (`:301`).
  - 400 `File type not allowed…`: magic-byte check (`:304-309`).
  - 401. CSRF 403.

### `DELETE /api/brands/:id/logo`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`).
- **Request:** path `id`.
- **Response:** 204, with `logoFile` set to `null` (`server/src/routes/brands.js:331-345`). The stored
  name is unlinked without a safety check (`:335-338`).
- **Errors:** 404 `Brand not found` (`server/src/routes/brands.js:333`). 401. CSRF 403.

### `POST /api/brands/:id/set-default`

- **Who:** admin only (`server/src/auth/guards.js:48-53`).
- **Request:** path `id`; no body.
- **Response:** 200 with the brand, now `isDefault: true` (`server/src/routes/_defaultPromote.js:34-40`,
  attached at `server/src/routes/brands.js:350-355`).
- **Errors:** 404 `Not found` (`server/src/routes/_defaultPromote.js:36`). 401. 403. CSRF 403.

### `POST /api/brands/:id/clear-default`

- **Who:** admin only (`server/src/auth/guards.js:48-53`).
- **Request:** path `id`; no body.
- **Response:** 200 with the brand, now `isDefault: false` (`server/src/routes/_defaultPromote.js:42-48`).
- **Errors:** 404 (`server/src/routes/_defaultPromote.js:44`). 401. 403. CSRF 403.

### `GET /api/brands/:id/export-seed`

- **Who:** admin only (`server/src/auth/guards.js:48-53`).
- **Request:** path `id`.
- **Response:** 200 with the record. When there is a logo, it also carries
  `_logoAssetRelPath: "server/data/brand-logos/<file>"` (`server/src/routes/brands.js:356-362`).
- **Errors:** 404 (`server/src/routes/_defaultPromote.js:52`). 401. 403.

---

## Racers (`/api/racers`)

User-created racer type configurations, with sprite upload, serving and deletion. The built-in types
stay in the client (`server/src/routes/racers.js:5-20`). Records are in `DATA_ROOT/racers` and sprites
in `DATA_ROOT/racer-sprites` (`:41-42`). Not team-scoped. **There are no promote or export routes**,
and none of these paths is in `ROUTE_POLICY`.

Body rules shared by POST and PUT (`validateBody`, `server/src/routes/racers.js:74-118`). Required:

- `name`: non-blank (`:85-87`).
- `emoji`: non-blank (`:89-91`).
- `frameCount`, `basePeriodMs`, `displaySize`: not null or undefined; **no type or range check**
  (`:93-103`).
- `trailStyle`: a string (`:105-107`).
- `coats`: a non-empty array (`:109-111`).
- `primaryColor`: a string (`:113-115`).

Optional fields are copied through only when they are present, **with no validation**: `bodyFillX`,
`bodyFillY`, `frameWidth`, `frameHeight`, `tintMode`, `defaultCoatId`, `speedMultiplier`,
`baseRotationOffset`, `surfaceClasses` (`:162-170`, `:208-216`).

### `GET /api/racers`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`).
- **Request:** none.
- **Response:** 200 `[racer, …]` (`server/src/routes/racers.js:125-127`).
- **Errors:** 401.

### `GET /api/racers/:id`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`).
- **Request:** path `id`.
- **Response:** 200 with the racer (`server/src/routes/racers.js:130-134`).
- **Errors:** 404 `Racer not found` (`server/src/routes/racers.js:132`). 401.

### `POST /api/racers`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`).
- **Request:** the body rules above. `id?` must satisfy `isValidId` and must not be a built-in racer
  id from `server/src/constants/builtinRacerIds.js` (`server/src/routes/racers.js:77-83`); if it is
  omitted, a random UUID is used (`:144`).
- **Response:** 201 with the racer: the fields above plus `spriteFile: null`, `createdAt` and
  `updatedAt` (`server/src/routes/racers.js:150-178`).
- **Errors:** 400 `{error, errors}`, including the built-in id collision (`server/src/routes/racers.js:141-142`).
  409 `Racer '<id>' already exists` (`:146-148`). 401. CSRF 403.

### `PUT /api/racers/:id`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`).
- **Request:** path `id`. The full body rules apply, with no id check (`server/src/routes/racers.js:193`).
- **Response:** 200 with the racer (`server/src/routes/racers.js:198-222`).
- **Errors:**
  - 409 `id "<id>" is a built-in racer type…`, checked **before** the 404 (`server/src/routes/racers.js:183-188`).
  - 404 `Racer not found` (`:191`).
  - 400 `{error, errors}` (`:193-194`).
  - 401. CSRF 403.

### `DELETE /api/racers/:id`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`).
- **Request:** path `id`.
- **Response:** 204 (`server/src/routes/racers.js:226-239`). There is no `isDefault` protection. The
  stored `spriteFile` is unlinked **without** a safety check (`:230-233`).
- **Errors:** 404 `Racer not found` (`server/src/routes/racers.js:228`). 401. CSRF 403.

### `GET /api/racers/:id/sprite`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`).
- **Request:** path `id`.
- **Response:** 200 binary image stream, with `Content-Type` from the file extension and `nosniff`
  (`server/src/routes/racers.js:254-261`).
- **Errors:**
  - 404 `Racer not found` (`server/src/routes/racers.js:246`).
  - 404 `No sprite` (`:247`).
  - 404 `Sprite file missing`: the stored name is unsafe or the file is absent (`:248-252`).
  - 500 `Failed to read sprite` (`:258-260`).
  - 401.

### `POST /api/racers/:id/sprite`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`).
- **Request:** path `id`. `multipart/form-data` with the file in field **`sprite`**
  (`server/src/routes/racers.js:265`), at most 10 MB, PNG/JPEG/WebP, stored as `<id>.<ext>` (`:278-288`).
- **Response:** 200 `{spriteFile: "<id>.<ext>"}` (`server/src/routes/racers.js:294`).
- **Errors:**
  - Upload-helper 413 or 400 (`server/utils/imageUpload.js:109-119`).
  - 404 `Racer not found` (`server/src/routes/racers.js:267`).
  - 400 `No file uploaded (field name: sprite)` (`:268`).
  - 400 `File type not allowed…`: magic-byte check (`:271-276`).
  - 401. CSRF 403.

### `DELETE /api/racers/:id/sprite`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`).
- **Request:** path `id`.
- **Response:** 204, with `spriteFile` set to `null`. The file is removed only if its name is safe
  (`server/src/routes/racers.js:298-312`).
- **Errors:** 404 `Racer not found` (`server/src/routes/racers.js:300`). 401. CSRF 403.

---

## Seed notices (`/api/seed-notices`)

The warning shown after a seed redelivery overwrote records, and its dismissal. Both routes are
deliberately open to every signed-in user, operators included (`server/src/routes/seedNotices.js:5-22`).

### `GET /api/seed-notices`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`; `server/src/routes/seedNotices.js:10-12`).
- **Request:** none.
- **Response:** 200 `{notices: [{unit, kind, name, from, to, at}, …]}`. An unreadable file reads as
  `[]` (`server/src/routes/seedNotices.js:31-33`, `server/src/seedNotices.js:45-52`). The entries are
  written by `server/src/seedDelivery.js:169` and stamped with `at` at `server/src/seedNotices.js:61-63`.
- **Errors:** 401.

### `POST /api/seed-notices/dismiss`

- **Who:** any signed-in user (`server/src/auth/guards.js:137`).
- **Request:** none.
- **Response:** 200 `{cleared: <number cleared>, notices: []}` (`server/src/routes/seedNotices.js:36-39`,
  `server/src/seedNotices.js:70-74`).
- **Errors:** 401. CSRF 403.

---

## Races (`/api/races`)

Finished races written to the server and read back by their own team, plus the period evaluation and
its points rule (`server/src/routes/races.js:6`). The router is built by `createRacesRouter`
(`:88-280`). **This is the only team-scoped router.** The team always comes from `req.authUser.team`
and never from the request (`:31-36`).

A stored race (`hydrate`, `server/src/races/raceStore.js:450-492`) has these fields: `id, clientRaceId,
shortKey, team, teamNormalized, finishedAt, identifierVersion, buildId, geometryId, racerTypeId,
racePlanSeed, raceActionStage, racePlanEnabled, targetLaps?, targetDurationSec?, worldSchemaVersion,
worldConfigs, elapsedSec?, results, winners, raceSource, rosterId, racerTypesId, names, fieldSize,
racerTypeOverrides, effectiveRacerTypes`.

### `POST /api/races`

- **Who:** any signed-in user (operator+). The prefix is deliberately left out of `ROUTE_POLICY`
  (`server/src/routes/races.js:38-42`). The race is filed under the caller's team, and a `team` in
  the body is overwritten (`:130`).
- **Request:** a JSON race record. The store requires (`server/src/races/raceStore.js:259-290`, `:236-244`, `:355-364`):
  - `names`: a non-empty array with no name twice.
  - `results` and `winners`: arrays.
  - Non-empty `clientRaceId`, `finishedAt`, `identifierVersion`, `buildId`, `geometryId`,
    `racerTypeId`, `racePlanSeed`, `raceActionStage`.
  - Optional: `racePlanEnabled`, `targetLaps`, `targetDurationSec`, `worldSchemaVersion`,
    `worldConfigs`, `elapsedSec`, `racerTypeOverrides`, `effectiveRacerTypes`, `raceSource`. An
    unrecognised `raceSource` is stored with no marker, which counts as a test race (`:328-337`).
- **Response:**
  - 201 `{id, shortKey, alreadyStored}`: newly stored, or identical content was already there
    (`server/src/routes/races.js:130-137`).
  - 200 `{id, shortKey, alreadyStored: true}`: the same `clientRaceId` was already stored, i.e. a
    retry (`:119-128`). The duplicate check is **not** team-scoped: it looks up `clientRaceId` across
    all teams (`server/src/races/raceStore.js:500-502`), so a caller sending another team's
    `clientRaceId` gets that race's `id` and `shortKey`. A known defect, recorded in BACKLOG PART ONE
    (*SERVER — two defects found documenting the API*); not changed here.
- **Errors:**
  - 503: the caller's account has no team (`server/src/routes/races.js:106-116`).
  - 400 `{error, code}` with `code` one of `INVALID_RACE`, `INVALID_ROSTER`, `INVALID_RESULTS` or
    `INVALID_TEAM` (`:142-149`). A 400 means do not retry.
  - 500 `internal error` for anything else, which is retryable (`:150-153`).
  - 401. CSRF 403.
  - With `clientRaceId` missing, `getRaceByClientId(undefined)` runs first (`:119`); better-sqlite3
    binds `undefined` as NULL, which matches no row, so the request falls through to the intended
    400 `INVALID_RACE` (`server/src/races/raceStore.js:355`). Settled 2026-10-06 against
    better-sqlite3 in an in-memory database.

### `GET /api/races`

- **Who:** any signed-in user; it returns **the caller's team only** (`server/src/routes/races.js:162-180`).
- **Request:** query `limit?`, clamped to 1–100 with a default of 20, and `offset?`, at least 0 with
  a default of 0. Non-numeric values fall back to the defaults (`server/src/races/raceStore.js:571-576`).
- **Response:** 200 `{races: [race…], hasMore, offset, limit, team}`, newest first
  (`server/src/routes/races.js:175-179`, `server/src/races/raceStore.js:530-538`). A user with no
  team gets `{races: [], hasMore: false, offset: 0, limit: 0, team: null}` (`server/src/routes/races.js:166-173`).
- **Errors:** 401.

### `GET /api/races/evaluation`

- **Who:** any signed-in user; it covers the caller's team only (`server/src/routes/races.js:203-204`).
- **Request:** query `from` and `to`, both required, each parsable by `Date.parse`, with
  `from < to` and a span of at most 366 days. The window is half-open: `from <= finishedAt < to`
  (`server/src/routes/races.js:186-198`, `:78`, `server/src/races/raceStore.js:552-560`).
- **Response:** 200 `{from: <ISO>, to: <ISO>, counted, quickTestsExcluded, rows: [{name, races, wins,
  podiums, places: {<place>: count}}]}` (`server/src/routes/races.js:201-205`,
  `server/src/races/periodEvaluation.js:55-91`). A user with no team gets an evaluation of zero races.
- **Errors:** 400 for a missing, invalid or reversed period (`server/src/routes/races.js:189-193`).
  400 for a period longer than 366 days (`:194-198`). 401.

### `GET /api/races/evaluation/points-rule`

- **Who:** any signed-in user. The policy entry gates only `PUT` (`server/src/auth/guards.js:72-79`, `:137`).
- **Request:** none.
- **Response:** 200 `{pointsEnabled: boolean, pointsPerPlace: number[]}`. With no file, or an invalid
  one, the answer is the default `{pointsEnabled: false, pointsPerPlace: []}`
  (`server/src/routes/races.js:210`, `server/src/races/pointsRule.js:27`, `:67-77`).
- **Errors:** 401.

### `PUT /api/races/evaluation/points-rule`

- **Who:** admin only (`server/src/auth/guards.js:74-79`). The rule applies server-wide, not per team
  (`server/src/races/pointsRule.js:13-14`).
- **Request:** body `{pointsEnabled: boolean, pointsPerPlace: number[]}`. The list holds at most 100
  values, each a finite number from 0 to 1,000,000 (`server/src/races/pointsRule.js:39-56`, `:30-31`).
  Extra fields are dropped (`:55`).
- **Response:** 200 with the stored rule (`server/src/routes/races.js:214-218`, `server/src/races/pointsRule.js:78-82`).
- **Errors:** 400 `{error}` with the validator's sentence (`server/src/routes/races.js:216`). 401. 403
  (`server/src/auth/guards.js:192-193`). CSRF 403.

### `GET /api/races/:shortKey`

- **Who:** any signed-in user. It finds only races of the caller's team; another team's key gets the
  same 404 as a key that was never issued (`server/src/routes/races.js:220-233`,
  `server/src/races/raceStore.js:513-521`).
- **Request:** path `shortKey`. It is normalised by trimming, upper-casing and removing spaces and
  hyphens, and must then be 6 characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ`
  (`shared/raceShortKey.mjs:54`, `:60`, `:68-76`).
- **Response:** 200 with the race object (`server/src/routes/races.js:232`).
- **Errors:** 404 `No race with that key.`: no team, a malformed key, another team's race, or no
  such race (`server/src/routes/races.js:228-231`). 401.

### `POST /api/races/:shortKey/verify`

- **Who:** admin only (`server/src/auth/guards.js:66-71`). The lookup is team-scoped like the GET, so
  an admin can verify only **their own team's** races (`server/src/routes/races.js:247-251`).
- **Request:** path `shortKey`; no body. It runs a full race replay synchronously on the server
  thread (`server/src/routes/races.js:244-245`).
- **Response:** 200 `{shortKey, identical: boolean, positions: {match, of}, finishTimes: {match, of},
  firstDiff: string|null, track: <track id>, racers: <number>, ms}` (`server/src/routes/races.js:260-272`,
  `scripts/lib/storedRaceReplay.mjs:193-204`).
- **Errors:**
  - 404 `No race with that key.` (`server/src/routes/races.js:249-251`).
  - 501: the race engine module is not present in this install (`:253-259`).
  - 422 `{error}`: `StoredRaceRefusal`, meaning the record cannot be replayed honestly — no matching
    `geometryId`, a lap mismatch, or a missing world block (`:274`,
    `scripts/lib/storedRaceReplay.mjs:42`, `:54-62`, `:83-108`).
  - 401. 403 (`server/src/auth/guards.js:192-193`). CSRF 403.
  - Unhandled: any other error, including one thrown by `readInstallTracks` on a malformed track
    file (`server/src/routes/races.js:66-71`), is rethrown from an `async` handler (`:275`). Express 4
    does not catch a rejected promise, and the app has no error middleware and no
    `unhandledRejection` handler (no `process.on` in `server/src/index.js`). The request then gets
    no response, and under Node's default `--unhandled-rejections=throw` (Node 15 and later; the
    image runs Node 20) **the server process exits**. A known defect, recorded in BACKLOG PART ONE
    (*SERVER — two defects found documenting the API*); not changed here.

---

## All routes

| # | Method | Path | Who |
|---|---|---|---|
| 1 | GET | `/api/health` | public |
| 2 | GET | `/api/auth/setup-needed` | public |
| 3 | POST | `/api/auth/setup` | public (bootstrap token) |
| 4 | POST | `/api/auth/login` | public |
| 5 | POST | `/api/auth/logout` | signed-in |
| 6 | POST | `/api/auth/change-password` | signed-in (own account) |
| 7 | GET | `/api/auth/me` | signed-in |
| 8 | GET | `/api/users` | admin |
| 9 | POST | `/api/users` | admin |
| 10 | PUT | `/api/users/:id` | admin |
| 11 | DELETE | `/api/users/:id` | admin |
| 12 | GET | `/api/tracks` | signed-in |
| 13 | GET | `/api/tracks/:id` | signed-in |
| 14 | GET | `/api/tracks/:id/background` | signed-in |
| 15 | POST | `/api/tracks` | signed-in |
| 16 | PUT | `/api/tracks/:id` | signed-in |
| 17 | DELETE | `/api/tracks/:id` | signed-in (not default tracks) |
| 18 | DELETE | `/api/tracks/:id/background` | signed-in |
| 19 | POST | `/api/tracks/:id/background` | signed-in |
| 20 | POST | `/api/tracks/:id/set-default` | admin |
| 21 | POST | `/api/tracks/:id/clear-default` | admin |
| 22 | GET | `/api/tracks/:id/export-seed` | admin |
| 23 | GET | `/api/surface-classes` | signed-in |
| 24 | GET | `/api/surface-classes/:id` | signed-in |
| 25 | POST | `/api/surface-classes` | admin |
| 26 | PUT | `/api/surface-classes/:id` | admin |
| 27 | DELETE | `/api/surface-classes/:id` | admin |
| 28 | GET | `/api/player-groups` | signed-in |
| 29 | GET | `/api/player-groups/:id` | signed-in |
| 30 | POST | `/api/player-groups` | signed-in |
| 31 | PUT | `/api/player-groups/:id` | signed-in |
| 32 | DELETE | `/api/player-groups/:id` | signed-in (not default groups) |
| 33 | POST | `/api/player-groups/:id/set-default` | admin |
| 34 | POST | `/api/player-groups/:id/clear-default` | admin |
| 35 | GET | `/api/player-groups/:id/export-seed` | admin |
| 36 | GET | `/api/brands` | signed-in |
| 37 | GET | `/api/brands/:id` | signed-in |
| 38 | POST | `/api/brands` | signed-in |
| 39 | PUT | `/api/brands/:id` | signed-in |
| 40 | DELETE | `/api/brands/:id` | signed-in (not default brands) |
| 41 | GET | `/api/brands/:id/logo` | signed-in |
| 42 | POST | `/api/brands/:id/logo` | signed-in |
| 43 | DELETE | `/api/brands/:id/logo` | signed-in |
| 44 | POST | `/api/brands/:id/set-default` | admin |
| 45 | POST | `/api/brands/:id/clear-default` | admin |
| 46 | GET | `/api/brands/:id/export-seed` | admin |
| 47 | GET | `/api/racers` | signed-in |
| 48 | GET | `/api/racers/:id` | signed-in |
| 49 | POST | `/api/racers` | signed-in |
| 50 | PUT | `/api/racers/:id` | signed-in |
| 51 | DELETE | `/api/racers/:id` | signed-in |
| 52 | GET | `/api/racers/:id/sprite` | signed-in |
| 53 | POST | `/api/racers/:id/sprite` | signed-in |
| 54 | DELETE | `/api/racers/:id/sprite` | signed-in |
| 55 | GET | `/api/seed-notices` | signed-in |
| 56 | POST | `/api/seed-notices/dismiss` | signed-in |
| 57 | POST | `/api/races` | signed-in (filed under own team) |
| 58 | GET | `/api/races` | signed-in (own team) |
| 59 | GET | `/api/races/evaluation` | signed-in (own team) |
| 60 | GET | `/api/races/evaluation/points-rule` | signed-in |
| 61 | PUT | `/api/races/evaluation/points-rule` | admin |
| 62 | GET | `/api/races/:shortKey` | signed-in (own team) |
| 63 | POST | `/api/races/:shortKey/verify` | admin (own team) |
---

## Planned (Phase 5)

A full race-integrity backend with Socket.IO, leaderboard, and JWT auth is planned for Phase 5.
See [ARCHITECTURE.md — Future: Phase 5 Server](ARCHITECTURE.md#future-phase-5-server).
