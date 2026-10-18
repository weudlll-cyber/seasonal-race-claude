# RaceArena — API Reference

**Owns:** the backend's HTTP surface — the shape of the endpoints it documents, and what they persist. The client's use of them is [ARCHITECTURE.md](ARCHITECTURE.md).

**Complete as of 2026-10-09: all 66 routes the server registers** (63 at TIDY-C-3; TEST-AIDS-1 added
the two settings routes, AUDIT-1 D2 the admin status route). Counted from source, not from earlier
counts: the `router.<verb>(` calls in the eleven routers `server/src/app.js` mounts under `/api` (56), the three promote/export sub-routes
`attachPromoteExport`
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

**Middleware order** (`server/src/app.js:37-87`): helmet → `cors(corsOptions)` (`:40`) →
`express.json({ limit: '1mb' })` (`:41`) → session (`:42`) → `csrfOriginGuard` (`:43`) → static
client + SPA fallback (`:51-52`, both refuse `/api/*`) → `requireAuth` (`:54`) → `requireAdmin`
(`:55`) → `GET /api/health` (`:63`) → the three rate limiters (`:65-69`) → the routers (`:70-79`)
→ the API 404 (`:83`) → the error handler (`:87`).

**Public paths** — exact path match, after the path is lower-cased and a trailing slash is stripped,
and exact method with `HEAD` judged as `GET` (`server/src/auth/guards.js:15-20`, matched at
`:137-141`, normalisation at `:110-113`, HEAD at `:115-121`):
`GET /api/health`, `GET /api/auth/setup-needed`, `POST /api/auth/setup`, `POST /api/auth/login` — so
`HEAD /api/health` and `HEAD /api/auth/setup-needed` are public too (since 2026-10-18).

**Any signed-in user** — every other `/api/*` path (deny by default). `requireAuth` answers
`401 {"error":"not authenticated"}` when there is no session user (`server/src/auth/guards.js:165-167`),
when the session's user no longer exists (`:169-173`), or when the session's `sessionEpoch` differs
from the user record's, i.e. the password was changed since sign-in (`:178-180`). On success it sets
`req.authUser = {id, username, role, team, teamNormalized}` (`:206-212`); a user with no team still
authenticates, with `team: null` (`:199-204`). The two roles are `operator` and `admin`
(`server/src/auth/usersStore.js:240`); "signed-in" below means operator or admin.

**Admin only** — `requireAdmin` answers `403 {"error":"forbidden"}` when the path matches a
`ROUTE_POLICY` entry with `role: 'admin'` and `req.authUser.role !== 'admin'`
(`server/src/auth/guards.js:217-225`). HEAD is checked as GET (`:115-121`). The admin entries:

| Entry | Methods | Path pattern | Line |
|---|---|---|---|
| users | GET POST PUT DELETE PATCH | `/api/users` and everything under it | `server/src/auth/guards.js:26-31` |
| surface-classes mutations | POST PUT DELETE PATCH | `/api/surface-classes` and under | `server/src/auth/guards.js:33-38` |
| player-groups promote/export | GET POST | `/api/player-groups/:id/(set-default\|clear-default\|export-seed)` | `server/src/auth/guards.js:41-47` |
| brands promote/export | GET POST | `/api/brands/:id/(set-default\|clear-default\|export-seed)` | `server/src/auth/guards.js:50-55` |
| tracks promote/export | GET POST | `/api/tracks/:id/(set-default\|clear-default\|export-seed)` | `server/src/auth/guards.js:58-63` |
| race verify | POST | `/api/races/:shortKey/verify` | `server/src/auth/guards.js:68-73` |
| points rule write | PUT | `/api/races/evaluation/points-rule` | `server/src/auth/guards.js:76-81` |

The policy matches on the path pattern alone, before any route runs, so an operator gets 403 on an
admin path whether or not the record exists.

**CSRF rule.** For every `POST`/`PUT`/`DELETE`/`PATCH` under `/api/`
(`server/src/auth/csrf.js:84-87`), the `Origin` header, or failing that the origin of `Referer`
(`:90-100`), must equal the server's own origin (`RA_PUBLIC_ORIGIN`, else derived from the `Host`
header) or one of the allowed client origins (`RA_CLIENT_ORIGIN` plus `RA_PUBLIC_ORIGIN`)
(`:123-128`). Otherwise the answer is `403 {"error":"cross-origin request rejected"}` (`:113`, `:118`,
`:127`). A request with neither header is let through, except in strict mode (`RA_CSRF_STRICT`,
default on in production), where it gets `403 {"error":"origin required"}` (`:105-107`, `:68-73`).
This guard runs **before** `requireAuth`, so it applies to the public `POST` paths too, and a
rejected cross-origin request gets 403 rather than 401. Where the routes below say "CSRF 403",
these are the citations.

**Rate limits** (`server/src/auth/rateLimit.js`). All three answer
`429 {"error":"too many attempts, please try again later"}`, send standard `RateLimit-*` headers,
and are switched off when `NODE_ENV=test` or `VITEST` is set (`:12`).

| Path (mounted with `app.use`, so every method) | Window | Max | Counts | Key | Lines |
|---|---|---|---|---|---|
| `/api/auth/login` (`server/src/app.js:65`) | `RA_LOGIN_RL_WINDOW_MS`, default 15 min | `RA_LOGIN_RL_MAX`, default 10 | failed requests only | IP | `server/src/auth/rateLimit.js:18-26` |
| `/api/auth/setup` (`server/src/app.js:66`) | `RA_SETUP_RL_WINDOW_MS`, default 60 min | `RA_SETUP_RL_MAX`, default 10 | every request | IP | `server/src/auth/rateLimit.js:34-42` |
| `/api/auth/change-password` (`server/src/app.js:69`) | `RA_LOGIN_RL_WINDOW_MS`, default 15 min | 5 (fixed) | failed requests only | `req.authUser.id`, else IP | `server/src/auth/rateLimit.js:74-83` |

The limiters are mounted after `requireAuth` (`server/src/app.js:65-69`). So a signed-out caller of
`change-password` gets 401 and is never counted. "IP" is Express's `req.ip`, so how many proxy hops
are trusted decides whose address it is: `RA_TRUST_PROXY` (`server/src/trustProxy.js`; unset = one
hop when `NODE_ENV=production`, none otherwise — see [ENVIRONMENT.md](ENVIRONMENT.md)).

**Errors common to every route, not repeated below:**

- An unknown path under `/api/` answers `404 {"error":"no such API route: <METHOD> <url>"}`
  (`server/src/staticClient.js:183-187`), but only after the guards: a signed-out caller gets 401.
- **Every other error is answered as JSON with no stack trace** (AUDIT-1 A5M-08): a malformed JSON
  body (400), a body over 1 MB (413), or an exception thrown synchronously inside a handler (for
  example a failed disk write in `atomicWriteJson`) reaches `apiErrorHandler`
  (`server/src/apiErrorHandler.js`), mounted last in `createApp`. It keeps the status and answers
  `{ "error": "HTTP <status>" }` — the same text the client showed when this was Express's HTML page.
  A 5xx is logged with its stack; a 4xx is logged without its message, which can quote the body.
- **An `async` handler's unexpected error is answered, not lost** (SERVER-DEFECTS-1): `POST
  /api/races/:shortKey/verify`, `POST /api/auth/login` and `POST /api/auth/change-password` run
  through `asyncRoute` (`server/utils/asyncRoute.js`), which logs the error with its route and
  answers `500 { error: 'internal error' }`; the server keeps running. The other `async` handlers
  (`POST /api/auth/setup`, `POST`/`PUT`/`DELETE /api/users`) already answer every error inside their
  own `try`.
- Uploads (the three image routes) go through `uploadSingleImage` (`server/utils/imageUpload.js:111-128`)
  using multer with in-memory storage, a 10 MB limit (`:21`, `:64-82`) and a MIME pre-filter for
  `image/jpeg|png|webp` (`:19`, `:74-80`). It answers **413** for a file over 10 MB (`:115-118`),
  **400** "File type not allowed…" for a disallowed MIME type (`:120-123`), and **400** "File upload
  failed." for any other multer error, such as a wrong field name (`:125`), a second file or any text
  field beside the image (one file part and nothing else is accepted, AUDIT-1 A5M-04). The upload runs **before**
  the handler looks up the record, so these errors come before the record's 404. The handler then
  checks the magic bytes (`server/utils/imageUpload.js:27-56`); the client's `Content-Type` is
  ignored.

---

## Health (`/api/health`)

The build-identity probe and, since AUDIT-1 A10-05 (2026-10-12), the account-store check. Mounted in the
app factory (`server/src/app.js:63`); the handler is `server/src/health.js`.

### `GET /api/health`

- **Who:** public (`server/src/auth/guards.js:16`); `HEAD /api/health` too, with the same status and
  no body (HEAD is judged as GET, `:137-141`).
- **Request:** none.
- **Response:** 200 `{status: "ok", timestamp: <ISO string>, build: {commit, branch, dirty?, reason?}}`
  (`server/src/health.js:54-56`). The keys and their order are unchanged by A10-05. The `build` shape is in `server/src/buildIdentity.js:45`. When nothing
  supplied the commit or branch, those read `'unknown'` and `reason` says why (`server/src/buildIdentity.js:52-54`, `:66-67`).
- **Errors:** 503 `{status: "error", timestamp, build, problems: [{store: "users", code, message}]}` when
  the account store (`users.json`) cannot be read — nobody could sign in. `code` is the error's code (for
  example `USERS_STORE_CORRUPT`); `message` is a fixed sentence, so no file path reaches this public route
  (`server/src/health.js:35-48`, `:58-63`). A missing `users.json` is a fresh install and healthy. A damaged race
  store is not a health failure (only the race routes fail).

---

## Auth (`/api/auth`)

Setup, login, logout, the current user and changing your own password, with an atomic bootstrap for
the first admin (`server/src/auth/authRouter.js:6`).

### `GET /api/auth/setup-needed`

- **Who:** public (`server/src/auth/guards.js:17`).
- **Request:** none.
- **Response:** 200 `{setupNeeded: boolean}`. It is true only when the setup marker file is absent
  **and** the user store is empty (`server/src/auth/authRouter.js:44-47`).
- **Errors:** none of its own.

### `POST /api/auth/setup`

- **Who:** public (`server/src/auth/guards.js:18`), gated by a bootstrap token. Rate-limited per IP,
  counting every request (`server/src/app.js:66`, `server/src/auth/rateLimit.js:34-42`).
- **Request:** header `x-bootstrap-token`, compared in constant time with `RA_BOOTSTRAP_TOKEN`. A
  token in the body is not read (header read at `server/src/auth/authRouter.js:57`, constant-time compare at `:63`,
  helper at `:28-32`). Body `{username: string, password: string}`, both required and
  non-blank (`server/src/auth/authRouter.js:79-82`), and the password must meet the new-password rule — at least `PASSWORD_MIN_LENGTH` (10) characters — checked before the marker is taken (`server/src/auth/authRouter.js:83-90`, the rule at `server/src/auth/usersStore.js:39-53`). The role is always `admin` and the team is the
  founding constant `FOUNDING_TEAM`; neither is read from the body (`server/src/auth/authRouter.js:132-139`).
- **Response:** 201 `{username, role, team}`, and the session is regenerated, which signs the caller
  in (`server/src/auth/authRouter.js:152-166`). It is still 201 if that auto-login fails after the
  commit (`:167-179`).
- **Errors:**
  - 409 `setup already complete`: the marker exists (`server/src/auth/authRouter.js:52-54`), it was
    created by a concurrent request (`:97`), or users exist without the marker (`:106-116`).
  - 403 `setup not available`: `RA_BOOTSTRAP_TOKEN` is unset (`server/src/auth/authRouter.js:59-62`)
    or the token is wrong (`:63-76`). The two answers are deliberately identical.
  - 400 `Password must be at least 10 characters long`: the password is shorter than the rule
    (`server/src/auth/authRouter.js:86-90`).
  - 400 `invalid username or password`: the body is missing or blank (`server/src/auth/authRouter.js:79-82`),
    or the store rejects the username, password or role (`:198-200`).
  - 500 `setup failed`: the marker could not be opened (`server/src/auth/authRouter.js:98-99`), or
    any other failure before the commit (`:201`).
  - 429 from the setup limiter (`server/src/auth/rateLimit.js:41-42`). CSRF 403.

### `POST /api/auth/login`

- **Who:** public (`server/src/auth/guards.js:19`). Rate-limited per IP, counting failures only
  (`server/src/app.js:65`, `server/src/auth/rateLimit.js:18-26`).
- **Request:** body `{username, password}`. There is no explicit validation; a missing field simply
  fails to match. The username is looked up normalised (NFC, trimmed, lower-cased,
  `server/src/auth/usersStore.js:23-25`) (`server/src/auth/authRouter.js:212-213`).
- **Response:** 200 `{username, role, team}` (`team` may be `null`), after the session is
  regenerated (`server/src/auth/authRouter.js:226-232`).
- **Errors:**
  - 401 `invalid credentials`: unknown user (`server/src/auth/authRouter.js:215-218`, which
    deliberately spends the same time on a dummy hash) or wrong password (`:220-223`).
  - 500 `login failed`: session regenerate or save failed (`server/src/auth/authRouter.js:227`, `:231`).
  - 429 from the login limiter (`server/src/auth/rateLimit.js:25-26`). CSRF 403.

### `POST /api/auth/logout`

- **Who:** any signed-in user (not public, so `server/src/auth/guards.js:165`). The handler repeats
  the check inline (`server/src/auth/authRouter.js:240-242`), but the guard always answers first.
- **Request:** none.
- **Response:** 200 `{ok: true}`. The session is destroyed and the cookie cleared, as is the legacy
  `ra.sid` cookie (`server/src/auth/authRouter.js:243-253`).
- **Errors:** 401 from the guard (`server/src/auth/guards.js:166`, `:172`, `:179`). 500
  `logout failed` when destroying the session fails (`server/src/auth/authRouter.js:244-247`). CSRF 403.

### `POST /api/auth/change-password`

- **Who:** any signed-in user, and only for **their own** password. The target is
  `req.authUser.id` and never the body (`server/src/auth/authRouter.js:257-277`). It is not in
  `ROUTE_POLICY`. Rate-limited to 5 failures per user (`server/src/app.js:69`,
  `server/src/auth/rateLimit.js:74-83`).
- **Request:** body `{currentPassword, newPassword}` (`server/src/auth/authRouter.js:273`).
  `newPassword` must be non-blank and at least `PASSWORD_MIN_LENGTH` (10) characters, by the store's rule
  (`server/src/auth/usersStore.js:287-298`, `:39-53`). Never checked at sign-in, so an older shorter password
  keeps working until it is changed.
- **Response:** 200 `{ok: true}`. The epoch bump ends the user's **other** sessions; this session is
  re-stamped so it survives (`server/src/auth/authRouter.js:294-311`).
- **Errors:**
  - 401 from the guard (`server/src/auth/guards.js:166`, `:172`, `:179`). The inline 401s at
    `server/src/auth/authRouter.js:278` and `:280-283` are defensive.
  - 401 `invalid credentials`: wrong current password (`server/src/auth/authRouter.js:286-292`).
  - 400 `Password must not be empty` or `Password must be at least 10 characters long`: `newPassword` is
    missing, blank or too short. The store raises `INVALID_PASSWORD` with that message, or `EMPTY_UPDATE` for a
    missing one (`server/src/auth/authRouter.js:299-303`).
  - 500 `internal error` (`server/src/auth/authRouter.js:304-305`).
  - 429 from the change-password limiter (`server/src/auth/rateLimit.js:82-83`). CSRF 403.

### `GET /api/auth/me`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`). The handler repeats the check
  inline (`server/src/auth/authRouter.js:317-325`).
- **Request:** none.
- **Response:** 200 `{username, role, team}`, where `team` may be `null` (`server/src/auth/authRouter.js:326-328`).
- **Errors:** 401 from the guard (`server/src/auth/guards.js:166`, `:172`, `:179`). The handler's own
  401s (`server/src/auth/authRouter.js:318`, `:323`) are defensive.

---

## Users (`/api/users`)

Lists, creates, updates and deletes race directors (user accounts). The router itself has no auth
checks; it relies on the guard stack (`server/src/auth/usersRouter.js:6-8`).

A user object returned below is the stored record minus `passwordHash` and `sessionEpoch`
(`server/src/auth/usersStore.js:70-73`): `{id, username, usernameNormalized, role, team,
teamNormalized, createdAt, createdBy}` (the record is built at `server/src/auth/usersStore.js:259-279`).

### `GET /api/users`

- **Who:** admin only (`server/src/auth/guards.js:26-31`).
- **Request:** none.
- **Response:** 200 `[user, …]` (`server/src/auth/usersRouter.js:21-24`).
- **Errors:** 401 (`server/src/auth/guards.js:166`, `:172`, `:179`). 403 for an operator
  (`server/src/auth/guards.js:220-221`). A corrupt `users.json` throws `USERS_STORE_CORRUPT`
  (`server/src/auth/usersStore.js:77-94`), which is not caught and so becomes Express's default 500
  HTML page. The same throw would already fail `requireAuth`'s lookup.

### `POST /api/users`

- **Who:** admin only (`server/src/auth/guards.js:26-31`).
- **Request:** body `{username, password, role, team, allowNewTeam?}` (`server/src/auth/usersRouter.js:31`).
  - `username`: non-blank, and unique after normalisation (`server/src/auth/usersStore.js:234-238`, `:246-253`).
  - `password`: non-blank and at least `PASSWORD_MIN_LENGTH` (10) characters (`server/src/auth/usersStore.js:239`, the
    rule at `:39-53`); a refusal names the rule.
  - `role`: `"operator"` or `"admin"` (`server/src/auth/usersStore.js:240-244`).
  - `team`: a non-blank string with no default (`server/src/auth/teams.js:98-100`,
    `server/src/auth/usersStore.js:159-163`). It must match an existing team, compared normalised,
    and the existing spelling is adopted. A new team is accepted only when `allowNewTeam === true`
    (`server/src/auth/usersStore.js:165-182`, `server/src/auth/usersRouter.js:38`).
- **Response:** 201 user object (`server/src/auth/usersRouter.js:41`).
- **Errors:**
  - 409 `username already taken` (`server/src/auth/usersRouter.js:43-45`).
  - 400 `{error, knownTeams: [...]}` for an unknown team (`server/src/auth/usersRouter.js:48-50`).
  - 400 `{error}` for `INVALID_USERNAME`, `INVALID_PASSWORD`, `INVALID_ROLE` or `INVALID_TEAM`
    (`server/src/auth/usersRouter.js:51-55`).
  - 500 `internal error` (`server/src/auth/usersRouter.js:56-57`).
  - 401 and 403 from the guards. CSRF 403.

### `PUT /api/users/:id`

- **Who:** admin only (`server/src/auth/guards.js:26-31`).
- **Request:** path `id` (the user's UUID). Body `{role?, password?, team?, allowNewTeam?}`
  (`server/src/auth/usersRouter.js:76`), with at least one of role, password or team present. An
  empty-string `password` counts as absent (`server/src/auth/usersStore.js:289-299`). The role, team
  and `allowNewTeam` rules are the same as for create (`server/src/auth/usersStore.js:311-337`).
  A password must meet the same rule as on create (at least 10 characters,
  `server/src/auth/usersStore.js:39-53`). Setting a password bumps `sessionEpoch`, which signs that user out everywhere
  (`server/src/auth/usersStore.js:338-342`). An admin who changes their own password keeps the
  current session (`server/src/auth/usersRouter.js:77`, `:86-88`).
- **Response:** 200 user object (`server/src/auth/usersRouter.js:90`).
- **Errors:**
  - 404 `user not found` (`server/src/auth/usersRouter.js:92`).
  - 409: demoting the last admin (`server/src/auth/usersRouter.js:93`, `server/src/auth/usersStore.js:317-326`).
  - 400 `{error, knownTeams}` for an unknown team (`server/src/auth/usersRouter.js:94-96`).
  - 400 for `INVALID_ROLE`, `INVALID_PASSWORD`, `INVALID_TEAM` or `EMPTY_UPDATE` (`server/src/auth/usersRouter.js:97-99`).
  - 500 (`server/src/auth/usersRouter.js:100-101`).
  - 401 and 403 from the guards. CSRF 403.

### `DELETE /api/users/:id`

- **Who:** admin only (`server/src/auth/guards.js:26-31`).
- **Request:** path `id`.
- **Response:** 200 with the deleted user object (`server/src/auth/usersRouter.js:106-109`). Note:
  200 with a body, not 204.
- **Errors:**
  - 404 `user not found` (`server/src/auth/usersRouter.js:111`).
  - 409: deleting the last admin (`server/src/auth/usersRouter.js:112`, `server/src/auth/usersStore.js:362-370`).
  - 500 (`server/src/auth/usersRouter.js:113-114`).
  - 401 and 403 from the guards. CSRF 403.

---

## Tracks (`/api/tracks`)

Track records with CRUD and a background-image upload (`server/src/routes/tracks.js:6`), held in an
in-memory map that is loaded at boot from `DATA_ROOT/tracks/*.json` (`:44`, `:54-71`). Images live in
`DATA_ROOT/backgrounds` (`:45`). **Not team-scoped:** every signed-in user sees and edits the same
tracks. Every create, update, upload or background removal also writes a timestamped backup
(`:374-387`).

### `GET /api/tracks`

- **Who:** any signed-in user (not in `ROUTE_POLICY`; `server/src/auth/guards.js:165`).
- **Request:** none.
- **Response:** 200 `[summary, …]`. Each summary is the track record without `innerPoints`,
  `outerPoints`, `centerPoints` and `backgroundImageFile`, plus `pointCount: {inner, outer}`
  (`server/src/routes/tracks.js:346-360`, `:571-573`).
- **Errors:** 401 (`server/src/auth/guards.js:166`, `:172`, `:179`).

### `GET /api/tracks/:id`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`).
- **Request:** path `id`.
- **Response:** 200 with the full track record minus `backgroundImageFile` (`server/src/routes/tracks.js:575-580`).
- **Errors:** 404 `Track not found` (`server/src/routes/tracks.js:577`). 401.

### `GET /api/tracks/:id/background`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`). The admin regex for tracks covers
  only the three promote/export suffixes (`:59`).
- **Request:** path `id`.
- **Response:** 200 binary image stream. `Content-Type` comes from the stored file's extension
  (`image/jpeg|png|webp`, else `application/octet-stream`), with `X-Content-Type-Options: nosniff`
  (`server/src/routes/tracks.js:592-599`, `server/utils/imageUpload.js:12-17`).
- **Errors:**
  - 404 `Track not found` (`server/src/routes/tracks.js:584`).
  - 404 `No background` (`:585`).
  - 404 `Background file missing`: the stored name is unsafe (`:586-587`,
    `server/utils/isSafeAssetFilename.js:4-15`) or the file is absent (`server/src/routes/tracks.js:590`).
  - 500 `Failed to read background`, if headers have not yet been sent (`:596-598`).
  - 401.

### `POST /api/tracks`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`).
- **Request:** JSON body, validated by `validateTrackBodyForCreate` (`server/src/routes/tracks.js:433-488`):
  - `name`: non-blank string, at most 100 characters (`:435-439`, `:145`).
  - `closed`: boolean (`:440-442`).
  - `worldWidth`, `worldHeight`: numbers (`:443-445`).
  - Geometry: `centerPoints` with at least 2 points, or `innerPoints` **and** `outerPoints` with at
    least 2 points each (`:446-453`). Each point is `{x,y}` or `[x,y]` with finite coordinates,
    \|coord\| ≤ 10000 (`:257-280`, `:455-464`, `:141`).
  - `surfaceClasses?`: array of strings (`:466-473`).
  - `maxRacers?`: a positive number or `null` (`:474-478`).
  - `trackLights?`: an object with `color?` (`#RRGGBB`), `style?`
    (`steady|sequence|sync_pulse|random_flash`) and `speed?` (number, 0.1–3.0) (`:479-482`, `:107-130`).
  - `effects?`: an array of objects; `config.count`, when present, must be an integer from 0 to
    480000 (`:483-486`, `:283-309`, `:138`).
  - `geometryId?` and `createdAt?` are taken from the body if given (`:610`, `:634`).
  - **Only the fields of the allow-list** `TRACK_FIELDS` (`:161-196`, AUDIT-1 A5M-13, 2026-10-12): what the Track
    Editor and the Track Manager send, every seed key, the server's own fields, `pointCount` and the legacy
    names `defaultDuration`, `racerTypeId`, `racerId`, `trackWidth`. Any other field → 400 `A track has no field
    "<name>" — remove it and save again`. Numbers are bounded (`TRACK_NUMBER_BOUNDS`, `:205-216`):
    `worldWidth`/`worldHeight` 1–10000, `width` 0–10000, `pathLengthPx` 0–10,000,000, `defaultLaps` 0–1000,
    `defaultDurationSec` 0–86400, `maxRacers` 0–100000 or `null`, `defaultWinners` 0–1000; text fields have
    generous lengths; every number inside `effects` is finite and within ±480000 → otherwise 400
    `<field> must be a number from <min> to <max>` (`:234-256`, `server/utils/recordFields.js`). The allowed
    fields are spread over the defaults (`:613-636`), except that `backgroundImage` is dropped and `id`,
    `isDefault: false` and `backgroundImageFile: null` are forced. Stored records are never checked on read.
- **Response:** 201 with the new record minus `backgroundImageFile`. The `id` is 12 hex characters
  (`server/src/routes/tracks.js:362-364`). Defaults for unsent fields: `icon`, `description`,
  `defaultRacerTypeId: 'horse'`, `color`, `defaultLaps: 2`, `defaultDurationSec: 60`,
  `surfaceClasses: []`, `trackLights` (`:614-636`, `:643-644`). No `defaultWinners` since 2026-10-12 (AUDIT-1
  A2-14); a stored track that has it keeps it, and it is still accepted in a body.
- **Errors:** 400 `{error: "<messages joined by '; '>"}` (`server/src/routes/tracks.js:606-607`). 401.
  CSRF 403.

### `PUT /api/tracks/:id`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`). This includes default tracks: there
  is no `isDefault` check on update.
- **Request:** path `id`. A partial JSON body, validated by `validateTrackBodyForUpdate`, which checks
  only the fields present (`server/src/routes/tracks.js:497-565`). The rules are the same as for
  create. If any geometry key is present, the geometry must be complete (`:515-537`). `geometryId`
  must be a string or `null` (`:538-542`). The allow-list and bounds are those of create, with the rule
  for doubt: a key the stored record already has, and a number equal to the stored one, always pass
  (`server/utils/recordFields.js`). Other fields are merged over the existing record. `id`,
  `isDefault`, `backgroundImageFile` and `createdAt` are preserved; `geometryId` is taken from the
  body if the key is present (`:658-668`).
- **Response:** 200 with the updated record minus `backgroundImageFile` (`server/src/routes/tracks.js:674-675`).
- **Errors:** 404 `Track not found` (`server/src/routes/tracks.js:650`). 400 joined messages
  (`:652-656`). 401. CSRF 403.

### `DELETE /api/tracks/:id`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`).
- **Request:** path `id`.
- **Response:** 204, empty. The JSON file and the background image are removed; the image is removed
  only if its stored name is safe (`server/src/routes/tracks.js:689-695`, `:408-411`).
- **Errors:** 404 `Track not found` (`server/src/routes/tracks.js:681`). 403 `Cannot delete default
  track…` when `isDefault` is set (`:682-687`). 401. CSRF 403.

### `DELETE /api/tracks/:id/background`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`).
- **Request:** path `id`.
- **Response:** 204. The file is removed only if its name is safe, and `backgroundImageFile` is set
  to `null` (`server/src/routes/tracks.js:699-711`). It is still 204 when the track had no background.
- **Errors:** 404 `Track not found` (`server/src/routes/tracks.js:701`). 401. CSRF 403.

### `POST /api/tracks/:id/background`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`).
- **Request:** path `id`. `multipart/form-data` with the file in field **`background`**
  (`server/src/routes/tracks.js:714`), at most 10 MB, PNG/JPEG/WebP. It is stored as `<id>.<ext>`;
  an older file under another extension is deleted, only if its stored name is safe (`:735-736`).
- **Response:** 200 `{backgroundImageFile: "<id>.<png|jpg|webp>"}` (`server/src/routes/tracks.js:749`).
- **Errors:**
  - Upload-helper 413 or 400 (`server/utils/imageUpload.js:115-125`), before the record lookup.
  - 404 `Track not found` (`server/src/routes/tracks.js:716`).
  - 400 `No file uploaded (field name: background)` (`:717-718`).
  - 400 `File type not allowed…`: the magic bytes are not PNG, JPEG or WebP (`:722-727`).
  - 401. CSRF 403.

### `POST /api/tracks/:id/set-default`

- **Who:** admin only (`server/src/auth/guards.js:58-63`).
- **Request:** path `id`; no body.
- **Response:** 200 with the full stored record, now `isDefault: true` with a new `updatedAt`. This
  is the raw record, so `backgroundImageFile` is included (`server/src/routes/_defaultPromote.js:34-40`,
  attached at `server/src/routes/tracks.js:755-760`).
- **Errors:** 404 `Not found` (`server/src/routes/_defaultPromote.js:36`). 401. 403
  (`server/src/auth/guards.js:220-221`). CSRF 403.

### `POST /api/tracks/:id/clear-default`

- **Who:** admin only (`server/src/auth/guards.js:58-63`).
- **Request:** path `id`; no body.
- **Response:** 200 with the full record, now `isDefault: false` (`server/src/routes/_defaultPromote.js:42-48`).
- **Errors:** 404 `Not found` (`server/src/routes/_defaultPromote.js:44`). 401. 403. CSRF 403.

### `GET /api/tracks/:id/export-seed`

- **Who:** admin only (`server/src/auth/guards.js:58-63`).
- **Request:** path `id`.
- **Response:** 200 with the full record. When there is a background, it also carries
  `_backgroundAssetRelPath: "server/data/backgrounds/<file>"`
  (`server/src/routes/_defaultPromote.js:50-58`, `server/src/routes/tracks.js:761-767`).
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

- **Who:** any signed-in user. The admin entry covers only mutating methods (`server/src/auth/guards.js:33-38`, `:165`).
- **Request:** none.
- **Response:** 200 `[class, …]` (`server/src/routes/surfaceClasses.js:88-90`).
- **Errors:** 401.

### `GET /api/surface-classes/:id`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`).
- **Request:** path `id`.
- **Response:** 200 with the class (`server/src/routes/surfaceClasses.js:93-97`).
- **Errors:** 404 `Surface class not found` (`server/src/routes/surfaceClasses.js:95`). 401.

### `POST /api/surface-classes`

- **Who:** admin only (`server/src/auth/guards.js:33-38`).
- **Request:** body validated by `validateBody` (`server/src/routes/surfaceClasses.js:62-81`):
  - `id`: matches `^[a-z0-9_-]+$` (`server/utils/isValidId.js:16-18`).
  - `label`: non-blank, at most 100 characters after trimming (`:69-73`, `:29`).
  - `generatorId`: one of `particle|cloud|splash|line` (`:74-76`, `:26`).
  - `config`: a non-array object (`:77-79`).
  - `isOverride?`: kept only when it is literally `true` (`:117`).
- **Response:** 201 with the class (`server/src/routes/surfaceClasses.js:124`).
- **Errors:** 400 joined messages (`server/src/routes/surfaceClasses.js:101-102`). 409 `Surface class
  '<id>' already exists` (`:105-107`). 401. 403 (`server/src/auth/guards.js:220-221`). CSRF 403.

### `PUT /api/surface-classes/:id`

- **Who:** admin only (`server/src/auth/guards.js:33-38`).
- **Request:** path `id`, which must pass `isValidId`. The body follows the same rules as POST; a
  body `id`, if present, must equal the path id (`server/src/routes/surfaceClasses.js:136-142`).
  This is an **upsert**: it creates the class if it is missing (`:127-131`). `isOverride` stays true
  once it has been set (`:152`).
- **Response:** 200 with the class (`server/src/routes/surfaceClasses.js:159`). It is 200 even when
  the class was created.
- **Errors:** 400 `id in body must match URL parameter` (`server/src/routes/surfaceClasses.js:136-138`).
  400 joined messages (`:141-142`). 401. 403. CSRF 403.

### `DELETE /api/surface-classes/:id`

- **Who:** admin only (`server/src/auth/guards.js:33-38`).
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
(`server/src/routes/playerGroups.js:157-164`).

### `GET /api/player-groups`

- **Who:** any signed-in user. The admin regex covers only the three suffixes (`server/src/auth/guards.js:41-47`, `:165`).
- **Request:** none.
- **Response:** 200 `[group, …]` (`server/src/routes/playerGroups.js:123-125`).
- **Errors:** 401.

### `GET /api/player-groups/:id`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`).
- **Request:** path `id`.
- **Response:** 200 with the group (`server/src/routes/playerGroups.js:128-132`).
- **Errors:** 404 `Player group not found` (`server/src/routes/playerGroups.js:130`). 401.

### `POST /api/player-groups`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`).
- **Request:** body validated by `validateBody` (`server/src/routes/playerGroups.js:68-100`):
  - `name`: non-blank, at most 100 characters after trimming (`:71-75`, `:35`).
  - `players`: a non-empty array of at most 200 entries (`:77-82`, `:40`). Every entry is a
    non-blank string (`:83-85`) of at most 32 characters after trimming (`:86-91`,
    `shared/nameLimits.mjs:42`, `:68-72`). No two entries may be the same name, ignoring case,
    surrounding spaces and repeated spaces (`server/src/routes/playerGroups.js:95-96`, `shared/playerNames.mjs:44-55`).
  - `id?`: must satisfy `isValidId` if given, otherwise a random UUID is used (`server/src/routes/playerGroups.js:139-148`).
  - `isDefault` in the body is ignored (`:161`).
  - **No other field** (AUDIT-1 A5M-13, 2026-10-12): the allow-list `GROUP_FIELDS` is `id`, `name`,
    `players`, `isDefault`, `createdAt`, `updatedAt` (`server/src/routes/playerGroups.js:110-116`); any other → 400
    `A player group has no field "<name>" — remove it and save again`. On a PUT a key the stored record
    already has always passes. Extra fields used to be ignored.
- **Response:** 201 with the group, its name and players trimmed (`server/src/routes/playerGroups.js:156-168`).
- **Errors:** 400 `{error: "<joined>", errors: [...]}` (`server/src/routes/playerGroups.js:150`).
  409 `Player group '<id>' already exists` (`:152-154`). 401. CSRF 403.

### `PUT /api/player-groups/:id`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`).
- **Request:** path `id`. The body follows the same `name` and `players` rules as POST, and both are
  required (`server/src/routes/playerGroups.js:177-178`). `isDefault` is preserved (`:185`).
- **Response:** 200 with the group (`server/src/routes/playerGroups.js:191`).
- **Errors:** 404 `Player group not found` (`server/src/routes/playerGroups.js:175`). 400
  `{error, errors}` (`:178`). 401. CSRF 403.

### `DELETE /api/player-groups/:id`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`).
- **Request:** path `id`.
- **Response:** 204 (`server/src/routes/playerGroups.js:196-206`).
- **Errors:** 404 (`server/src/routes/playerGroups.js:198`). 403 `Cannot delete a default player
  group` (`:199-201`). 401. CSRF 403.

### `POST /api/player-groups/:id/set-default`

- **Who:** admin only (`server/src/auth/guards.js:41-47`).
- **Request:** path `id`; no body.
- **Response:** 200 with the group, now `isDefault: true` and with a new `updatedAt`
  (`server/src/routes/_defaultPromote.js:34-40`, attached at `server/src/routes/playerGroups.js:211-217`).
- **Errors:** 404 `Not found` (`server/src/routes/_defaultPromote.js:36`). 401. 403. CSRF 403.

### `POST /api/player-groups/:id/clear-default`

- **Who:** admin only (`server/src/auth/guards.js:41-47`).
- **Request:** path `id`; no body.
- **Response:** 200 with the group, now `isDefault: false` (`server/src/routes/_defaultPromote.js:42-48`).
- **Errors:** 404 (`server/src/routes/_defaultPromote.js:44`). 401. 403. CSRF 403.

### `GET /api/player-groups/:id/export-seed`

- **Who:** admin only (`server/src/auth/guards.js:41-47`).
- **Request:** path `id`.
- **Response:** 200 with the record as stored. No `exportSeed` callback is passed, so the default
  JSON handler is used (`server/src/routes/_defaultPromote.js:55-57`, `server/src/routes/playerGroups.js:211-217`).
- **Errors:** 404 (`server/src/routes/_defaultPromote.js:52`). 401. 403.

---

## Brands (`/api/brands`)

Event branding records: names, colours, sponsor text and a logo image. Signed-in users have CRUD and
the logo routes; admins promote, demote and export (`server/src/routes/brands.js:5-22`). Records are
in `DATA_ROOT/brands` and logos in `DATA_ROOT/brand-logos` (`:47-48`). Not team-scoped.

A brand object: `{id, name, eventName, subtitle, primaryColor, secondaryColor, sponsorText,
logoFile, isDefault, logoMaxHeight, logoOpacity, logoCorner, createdAt, updatedAt}`
(`server/src/routes/brands.js:229-244`).

Body rules shared by POST and PUT (`validateBody`, `server/src/routes/brands.js:91-155`):

- `name`: required, non-blank, at most 100 characters after trimming (`:94-98`).
- `eventName`: required, non-blank, at most 100 characters (`:100-104`).
- `subtitle?`: a string of at most 200 characters, or `null` (`:106-112`).
- `sponsorText?`: a string of at most 200 characters, or `null` (`:114-120`).
- `primaryColor?`, `secondaryColor?`: `#rrggbb` (`:122-132`).
- `logoOpacity?`: a number from 0 to 1, after `Number()` coercion (`:134-139`).
- `logoMaxHeight?`: a number greater than 0 and at most 500 (`:141-146`, `:57`).
- `logoCorner?`: `bottom-right` or `top-right` (`:148-152`, `:61`).
- **No other field** (AUDIT-1 A5M-13, 2026-10-12): the allow-list `BRAND_FIELDS` (`:166-182`) is what the
  branding profiles send, the seed's keys, the server's own fields and the form-only `logo`; any other
  → 400 `A brand has no field "<name>" — remove it and save again` (`:185-188`). On a PUT a key the stored
  record already has always passes. Extra fields used to be ignored.

### `GET /api/brands`

- **Who:** any signed-in user. The admin regex covers only the three suffixes (`server/src/auth/guards.js:50-55`, `:165`).
- **Request:** none.
- **Response:** 200 `[brand, …]` (`server/src/routes/brands.js:195-197`).
- **Errors:** 401.

### `GET /api/brands/:id`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`).
- **Request:** path `id`.
- **Response:** 200 with the brand (`server/src/routes/brands.js:200-204`).
- **Errors:** 404 `Brand not found` (`server/src/routes/brands.js:202`). 401.

### `POST /api/brands`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`).
- **Request:** the body rules above, plus `id?`, which must satisfy `isValidId` and otherwise becomes
  a random UUID (`server/src/routes/brands.js:211-220`). `isDefault` in the body is ignored (`:238`).
- **Response:** 201 with the brand. Defaults: `primaryColor` `#000000`, `secondaryColor` `#ffffff`,
  `logoMaxHeight` 90, `logoOpacity` 0.9, `logoCorner` `bottom-right`, `logoFile` `null`
  (`server/src/routes/brands.js:228-248`).
- **Errors:** 400 `{error, errors}` (`server/src/routes/brands.js:222`). 409 `Brand '<id>' already
  exists` (`:224-226`). 401. CSRF 403.

### `PUT /api/brands/:id`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`).
- **Request:** path `id`. The body rules above apply, so `name` and `eventName` are required on every
  PUT. Omitted optional fields keep their stored values; `isDefault` and `logoFile` are preserved
  (`server/src/routes/brands.js:261-282`). Ambiguity: a `subtitle` or `sponsorText` of `null` passes
  validation but is stored as the string `"null"` (`String(null)`, `:265-272`). POST instead turns
  `null` into `''` (`:233`, `:236`).
- **Response:** 200 with the brand (`server/src/routes/brands.js:286`).
- **Errors:** 404 `Brand not found` (`server/src/routes/brands.js:255`). 400 `{error, errors}`
  (`:257-258`). 401. CSRF 403.

### `DELETE /api/brands/:id`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`).
- **Request:** path `id`.
- **Response:** 204. The logo file and the record are removed (`server/src/routes/brands.js:298-303`).
  The stored `logoFile` is unlinked only if its name is safe (`:298`,
  `server/utils/removeStoredAsset.js`).
- **Errors:** 404 (`server/src/routes/brands.js:293`). 403 `Cannot delete a default brand`
  (`:294-296`). 401. CSRF 403.

### `GET /api/brands/:id/logo`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`).
- **Request:** path `id`.
- **Response:** 200 binary image stream, with `Content-Type` from the file extension and `nosniff`
  (`server/src/routes/brands.js:319-326`).
- **Errors:**
  - 404 `Brand not found` (`server/src/routes/brands.js:311`).
  - 404 `No logo` (`:312`).
  - 404 `Logo file missing`: the stored name is unsafe or the file is absent (`:313-317`).
  - 500 `Failed to read logo` (`:323-325`).
  - 401.

### `POST /api/brands/:id/logo`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`).
- **Request:** path `id`. `multipart/form-data` with the file in field **`logo`**
  (`server/src/routes/brands.js:330`), at most 10 MB, PNG/JPEG/WebP. It is stored as `<id>.<ext>`;
  an older file under another extension is deleted, only if its stored name is safe (`:347-350`).
- **Response:** 200 `{logoFile: "<id>.<ext>"}` (`server/src/routes/brands.js:358`).
- **Errors:**
  - Upload-helper 413 or 400 (`server/utils/imageUpload.js:115-125`).
  - 404 `Brand not found` (`server/src/routes/brands.js:332`).
  - 400 `No file uploaded (field name: logo)` (`:333`).
  - 400 `File type not allowed…`: magic-byte check (`:336-341`).
  - 401. CSRF 403.

### `DELETE /api/brands/:id/logo`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`).
- **Request:** path `id`.
- **Response:** 204, with `logoFile` set to `null` (`server/src/routes/brands.js:362-373`). The stored
  name is unlinked only if it is safe (`:366`).
- **Errors:** 404 `Brand not found` (`server/src/routes/brands.js:364`). 401. CSRF 403.

### `POST /api/brands/:id/set-default`

- **Who:** admin only (`server/src/auth/guards.js:50-55`).
- **Request:** path `id`; no body.
- **Response:** 200 with the brand, now `isDefault: true` (`server/src/routes/_defaultPromote.js:34-40`,
  attached at `server/src/routes/brands.js:378-383`).
- **Errors:** 404 `Not found` (`server/src/routes/_defaultPromote.js:36`). 401. 403. CSRF 403.

### `POST /api/brands/:id/clear-default`

- **Who:** admin only (`server/src/auth/guards.js:50-55`).
- **Request:** path `id`; no body.
- **Response:** 200 with the brand, now `isDefault: false` (`server/src/routes/_defaultPromote.js:42-48`).
- **Errors:** 404 (`server/src/routes/_defaultPromote.js:44`). 401. 403. CSRF 403.

### `GET /api/brands/:id/export-seed`

- **Who:** admin only (`server/src/auth/guards.js:50-55`).
- **Request:** path `id`.
- **Response:** 200 with the record. When there is a logo, it also carries
  `_logoAssetRelPath: "server/data/brand-logos/<file>"` (`server/src/routes/brands.js:384-390`).
- **Errors:** 404 (`server/src/routes/_defaultPromote.js:52`). 401. 403.

---

## Racers (`/api/racers`)

User-created racer type configurations, with sprite upload, serving and deletion. The built-in types
stay in the client (`server/src/routes/racers.js:5-20`). Records are in `DATA_ROOT/racers` and sprites
in `DATA_ROOT/racer-sprites` (`:43-44`). Not team-scoped. **There are no promote or export routes**,
and none of these paths is in `ROUTE_POLICY`.

Body rules shared by POST and PUT (`validateBody`, `server/src/routes/racers.js:76-120`). Required:

- `name`: non-blank (`:87-89`).
- `emoji`: non-blank (`:91-93`).
- `frameCount`, `basePeriodMs`, `displaySize`: not null or undefined (`:95-105`); bounded below.
- `trailStyle`: a string (`:107-109`).
- `coats`: a non-empty array (`:111-113`).
- `primaryColor`: a string (`:115-117`).

**Allow-list and bounds** (AUDIT-1 A5M-13, 2026-10-12; `validateRacerFields`, `server/src/routes/racers.js:174-183`):
only the fields of `RACER_FIELDS` (`:130-155` — what the Racer Editor sends and the server's own fields;
any other → 400 `A racer has no field "<name>" — remove it and save again`, where it used to be
ignored), and numbers within `RACER_NUMBER_BOUNDS` (`:161-171`): `frameCount` a whole number 1–256,
`basePeriodMs` 1–60000, `displaySize` 1–1000, `speedMultiplier` 0–10, `baseRotationOffset` −7–7,
`bodyFillX`/`bodyFillY` 0–1, `frameWidth`/`frameHeight` 1–10000 → otherwise 400 `<field> must be a number
from <min> to <max>`. On a PUT a key the stored record already has, and a number equal to the stored one,
always pass (`server/utils/recordFields.js`).

Optional fields are copied through only when they are present: `bodyFillX`,
`bodyFillY`, `frameWidth`, `frameHeight`, `tintMode`, `defaultCoatId`, `speedMultiplier`,
`baseRotationOffset`, `surfaceClasses` (`:227-235`, `:273-281`).

### `GET /api/racers`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`).
- **Request:** none.
- **Response:** 200 `[racer, …]` (`server/src/routes/racers.js:190-192`).
- **Errors:** 401.

### `GET /api/racers/:id`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`).
- **Request:** path `id`.
- **Response:** 200 with the racer (`server/src/routes/racers.js:195-199`).
- **Errors:** 404 `Racer not found` (`server/src/routes/racers.js:197`). 401.

### `POST /api/racers`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`).
- **Request:** the body rules above. `id?` must satisfy `isValidId` and must not be a built-in racer
  id from `server/src/constants/builtinRacerIds.js` (`server/src/routes/racers.js:79-85`); if it is
  omitted, a random UUID is used (`:209`).
- **Response:** 201 with the racer: the fields above plus `spriteFile: null`, `createdAt` and
  `updatedAt` (`server/src/routes/racers.js:215-243`).
- **Errors:** 400 `{error, errors}`, including the built-in id collision (`server/src/routes/racers.js:206-207`).
  409 `Racer '<id>' already exists` (`:211-213`). 401. CSRF 403.

### `PUT /api/racers/:id`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`).
- **Request:** path `id`. The full body rules apply, with no id check (`server/src/routes/racers.js:258`).
- **Response:** 200 with the racer (`server/src/routes/racers.js:263-287`).
- **Errors:**
  - 409 `id "<id>" is a built-in racer type…`, checked **before** the 404 (`server/src/routes/racers.js:248-253`).
  - 404 `Racer not found` (`:256`).
  - 400 `{error, errors}` (`:258-259`).
  - 401. CSRF 403.

### `DELETE /api/racers/:id`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`).
- **Request:** path `id`.
- **Response:** 204 (`server/src/routes/racers.js:291-301`). There is no `isDefault` protection. The
  stored `spriteFile` is unlinked only if its name is safe (`:295`,
  `server/utils/removeStoredAsset.js`).
- **Errors:** 404 `Racer not found` (`server/src/routes/racers.js:293`). 401. CSRF 403.

### `GET /api/racers/:id/sprite`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`).
- **Request:** path `id`.
- **Response:** 200 binary image stream, with `Content-Type` from the file extension and `nosniff`
  (`server/src/routes/racers.js:316-323`).
- **Errors:**
  - 404 `Racer not found` (`server/src/routes/racers.js:308`).
  - 404 `No sprite` (`:309`).
  - 404 `Sprite file missing`: the stored name is unsafe or the file is absent (`:310-314`).
  - 500 `Failed to read sprite` (`:320-322`).
  - 401.

### `POST /api/racers/:id/sprite`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`).
- **Request:** path `id`. `multipart/form-data` with the file in field **`sprite`**
  (`server/src/routes/racers.js:327`), at most 10 MB, PNG/JPEG/WebP, stored as `<id>.<ext>` (`:340-349`).
- **Response:** 200 `{spriteFile: "<id>.<ext>"}` (`server/src/routes/racers.js:355`).
- **Errors:**
  - Upload-helper 413 or 400 (`server/utils/imageUpload.js:115-125`).
  - 404 `Racer not found` (`server/src/routes/racers.js:329`).
  - 400 `No file uploaded (field name: sprite)` (`:330`).
  - 400 `File type not allowed…`: magic-byte check (`:333-338`).
  - 401. CSRF 403.

### `DELETE /api/racers/:id/sprite`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`).
- **Request:** path `id`.
- **Response:** 204, with `spriteFile` set to `null`. The file is removed only if its name is safe
  (`server/src/routes/racers.js:359-370`).
- **Errors:** 404 `Racer not found` (`server/src/routes/racers.js:361`). 401. CSRF 403.

---

## Seed notices (`/api/seed-notices`)

The warning shown after a seed redelivery overwrote records, and its dismissal. Both routes are
deliberately open to every signed-in user, operators included (`server/src/routes/seedNotices.js:5-22`).

### `GET /api/seed-notices`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`; `server/src/routes/seedNotices.js:10-12`).
- **Request:** none.
- **Response:** 200 `{notices: [{unit, kind, name, from, to, at}, …]}`. An unreadable file reads as
  `[]` (`server/src/routes/seedNotices.js:31-33`, `server/src/seedNotices.js:45-52`). The entries are
  written by `server/src/seedDelivery.js:169` and stamped with `at` at `server/src/seedNotices.js:61-63`.
- **Errors:** 401.

### `POST /api/seed-notices/dismiss`

- **Who:** any signed-in user (`server/src/auth/guards.js:165`).
- **Request:** none.
- **Response:** 200 `{cleared: <number cleared>, notices: []}` (`server/src/routes/seedNotices.js:36-39`,
  `server/src/seedNotices.js:70-74`).
- **Errors:** 401. CSRF 403.

---

## Races (`/api/races`)

Finished races written to the server and read back by their own team, plus the period evaluation and
its points rule (`server/src/routes/races.js:6`). The router is built by `createRacesRouter`
(`:90-294`). **This is the only team-scoped router.** The team always comes from `req.authUser.team`
and never from the request (`:31-36`).

A stored race (`hydrate`, `server/src/races/raceStore.js:536-578`) has these fields: `id, clientRaceId,
shortKey, team, teamNormalized, finishedAt, identifierVersion, buildId, geometryId, racerTypeId,
racePlanSeed, raceActionStage, racePlanEnabled, targetLaps?, targetDurationSec?, worldSchemaVersion,
worldConfigs, elapsedSec?, results, winners, raceSource, rosterId, racerTypesId, names, fieldSize,
racerTypeOverrides, effectiveRacerTypes`.

### `POST /api/races`

- **Who:** any signed-in user (operator+). The prefix is deliberately left out of `ROUTE_POLICY`
  (`server/src/routes/races.js:38-42`). The race is filed under the caller's team, and a `team` in
  the body is overwritten (`:132`).
- **Request:** a JSON race record. The store requires (`server/src/races/raceStore.js:322-373`, `:299-307`, `:441-450`):
  - `names`: a non-empty array with no name twice.
  - `results` and `winners`: arrays.
  - Non-empty `clientRaceId`, `finishedAt`, `identifierVersion`, `buildId`, `geometryId`,
    `racerTypeId`, `racePlanSeed`, `raceActionStage`.
  - Every scalar field that is present is a string or a finite number, and `finishedAt` a date
    (`:358-373`); anything else is 400 `INVALID_RACE`.
  - Optional: `racePlanEnabled`, `targetLaps`, `targetDurationSec`, `worldSchemaVersion`,
    `worldConfigs`, `elapsedSec`, `racerTypeOverrides`, `effectiveRacerTypes`, `raceSource`. An
    unrecognised `raceSource` is stored with no marker, which counts as a test race (`:414-423`).
- **Response:**
  - 201 `{id, shortKey, alreadyStored}`: newly stored, or identical content was already there
    (`server/src/routes/races.js:131-138`).
  - 200 `{id, shortKey, alreadyStored: true}`: the same `clientRaceId` was already stored, i.e. a
    retry (`:120-129`). **The check is within the caller's team** (`server/src/races/raceStore.js:593-604`,
    and the store's own check at `:392`): another team's `clientRaceId` is not recognised, and the
    race is stored as usual (201). The id is unique per team in the table
    (`UNIQUE (team_normalized, client_race_id)`, `:195`); a database from before this was rebuilt
    by the migration `client-id-per-team-1` (`server/src/races/migrateClientIdPerTeam.js`).
    *(Until SERVER-DEFECTS-1, 2026-10-06, the check looked across every team and answered another
    team's id with that team's `id` and `shortKey`.)*
- **Errors:**
  - 503: the caller's account has no team (`server/src/routes/races.js:107-117`).
  - 400 `{error, code}` with `code` one of `INVALID_RACE`, `INVALID_ROSTER`, `INVALID_RESULTS` or
    `INVALID_TEAM` (`:143-150`). A 400 means do not retry.
  - 500 `internal error` for anything else, which is retryable (`:152-155`).
  - 401. CSRF 403.
  - With `clientRaceId` missing, `getRaceByClientId(undefined)` runs first (`:121`); the store
    binds it as an empty string (`server/src/races/raceStore.js:602`), which matches no row, so the
    request falls through to the intended
    400 `INVALID_RACE` (`server/src/races/raceStore.js:441`). Settled 2026-10-06 against
    better-sqlite3 in an in-memory database.

### `GET /api/races`

- **Who:** any signed-in user; it returns **the caller's team only** (`server/src/routes/races.js:163-181`).
- **Request:** query `limit?`, clamped to 1–100 with a default of 20, and `offset?`, at least 0 with
  a default of 0. Non-numeric values fall back to the defaults (`server/src/races/raceStore.js:683-688`).
- **Response:** 200 `{races: [race…], hasMore, offset, limit, team}`, newest first
  (`server/src/routes/races.js:176-180`, `server/src/races/raceStore.js:631-639`). A user with no
  team gets `{races: [], hasMore: false, offset: 0, limit: 0, team: null}` (`server/src/routes/races.js:167-174`).
- **Errors:** 401.

### `GET /api/races/evaluation`

- **Who:** any signed-in user; it covers the caller's team only (`server/src/routes/races.js:204-205`).
- **Request:** query `from` and `to`, both required, each parsable by `Date.parse`, with
  `from < to` and a span of at most 366 days. The window is half-open: `from <= finishedAt < to`
  (`server/src/routes/races.js:187-199`, `:80`, `server/src/races/raceStore.js:662-672`). The races are read one at a time, two fields each (BOUNDED-EVAL-1, 2026-10-07).
- **Response:** 200 `{from: <ISO>, to: <ISO>, counted, quickTestsExcluded, rows: [{name, races, wins,
  podiums, places: {<place>: count}}]}` (`server/src/routes/races.js:203-207`,
  `server/src/races/periodEvaluation.js:55-91`). A user with no team gets an evaluation of zero races.
- **Errors:** 400 for a missing, invalid or reversed period (`server/src/routes/races.js:190-194`).
  400 for a period longer than 366 days (`:195-199`). 401.

### `GET /api/races/evaluation/points-rule`

- **Who:** any signed-in user. The policy entry gates only `PUT` (`server/src/auth/guards.js:74-81`, `:165`).
- **Request:** none.
- **Response:** 200 `{pointsEnabled: boolean, pointsPerPlace: number[]}`. With no file, or an invalid
  one, the answer is the default `{pointsEnabled: false, pointsPerPlace: []}`
  (`server/src/routes/races.js:212`, `server/src/races/pointsRule.js:26`, `:64-72`,
  `server/utils/jsonSettingStore.js:32-40`).
- **Errors:** 401.

### `PUT /api/races/evaluation/points-rule`

- **Who:** admin only (`server/src/auth/guards.js:76-81`). The rule applies server-wide, not per team
  (`server/src/races/pointsRule.js:13-14`).
- **Request:** body `{pointsEnabled: boolean, pointsPerPlace: number[]}`. The list holds at most 100
  values, each a finite number from 0 to 1,000,000 (`server/src/races/pointsRule.js:38-55`, `:29-30`).
  Extra fields are dropped (`:54`).
- **Response:** 200 with the stored rule (`server/src/routes/races.js:215-219`, `server/utils/jsonSettingStore.js:42-46`).
- **Errors:** 400 `{error}` with the validator's sentence (`server/src/routes/races.js:217-218`). 401. 403
  (`server/src/auth/guards.js:220-221`). CSRF 403.

### `GET /api/races/:shortKey`

- **Who:** any signed-in user. It finds only races of the caller's team; another team's key gets the
  same 404 as a key that was never issued (`server/src/routes/races.js:221-234`,
  `server/src/races/raceStore.js:614-622`).
- **Request:** path `shortKey`. It is normalised by trimming, upper-casing and removing spaces and
  hyphens, and must then be 6 characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ`
  (`shared/raceShortKey.mjs:54`, `:60`, `:68-76`).
- **Response:** 200 with the race object (`server/src/routes/races.js:234`).
- **Errors:** 404 `No race with that key.`: no team, a malformed key, another team's race, or no
  such race (`server/src/routes/races.js:229-232`). 401.

### `POST /api/races/:shortKey/verify`

- **Who:** admin only (`server/src/auth/guards.js:68-73`). The lookup is team-scoped like the GET, so
  an admin can verify only **their own team's** races (`server/src/routes/races.js:256-260`).
- **Request:** path `shortKey`; no body. It runs a full race replay on a **worker thread**, one at a
  time per server (`server/src/races/verifyOffMainThread.js`, `verifyReplay.worker.js`), so other
  requests are answered while it runs. *(Until VERIFY-OFF-MAIN-1, 2026-10-07, it ran on the server's
  own thread, and every other request waited for it: 1.5–5.4 s, reports/release/SOAK-1.md.)*
- **Response:** 200 `{shortKey, identical: boolean, positions: {match, of}, finishTimes: {match, of},
  firstDiff: string|null, track: <track id>, racers: <number>, ms}` (`server/src/routes/races.js:279-289`,
  `scripts/lib/storedRaceReplay.mjs:193-204`).
- **Errors:**
  - 404 `No race with that key.` (`server/src/routes/races.js:258-260`).
  - 429 `{error}`: another verify is running on this server (`:266-270`).
  - 501: the race engine module is not present in this install (`:272-276`; the worker reports it,
    `server/src/races/verifyReplay.worker.js`).
  - 422 `{error}`: `StoredRaceRefusal`, meaning the record cannot be replayed honestly — no matching
    `geometryId`, a lap mismatch, or a missing world block (`:277`,
    `scripts/lib/storedRaceReplay.mjs:42`, `:55-63`, `:84-111`).
  - 401. 403 (`server/src/auth/guards.js:220-221`). CSRF 403.
  - 500 `{ error: 'internal error' }`: any other error, including one thrown by `readInstallTracks`
    on a malformed track file (`server/src/routes/races.js:68-73`), read on the server's thread
    before the worker starts (`:263`). An error inside the worker is rethrown (`:278`) and `asyncRoute`
    answers it (`:255`, `server/utils/asyncRoute.js:32-33`): logged server-side
    with the route, and the server keeps running. *(Until SERVER-DEFECTS-1, 2026-10-06, the rethrow
    escaped the async handler: the request got no answer and the process exited.)*

---

## Settings (`/api/settings`)

Installation-wide settings, one JSON file each in the data folder — today one, the test-aids switch
(`server/src/routes/settings.js:1-12`, `server/src/settings/testAids.js`). Mounted at
`server/src/app.js:79`. Read by every signed-in user, written by admins only, the same shape as the
points rule above. TEST-AIDS-1, the owner's decision of 2026-10-04.

### `GET /api/settings/test-aids`

- **Who:** any signed-in user (operator+); not in `ROUTE_POLICY` for GET (`server/src/auth/guards.js:82-89`).
  Every gate in the client reads it (`client/src/modules/testAids.js`).
- **Request:** none.
- **Response:** 200 `{ enabled: boolean }` (`server/src/routes/settings.js:23`). **No file — a fresh
  installation — answers `{ enabled: false }`** (`server/utils/jsonSettingStore.js:32`); so does an
  unreadable or invalid file, logged on every read while the file is invalid (`:33-40`).
- **Errors:** 401.

### `PUT /api/settings/test-aids`

- **Who:** admin only (`server/src/auth/guards.js:82-89`).
- **Request:** JSON `{ enabled: boolean }` — nothing else is accepted (`server/src/settings/testAids.js:32-37`).
- **Response:** 200 `{ enabled }`, the value as stored (`server/src/routes/settings.js:25-29`), written
  atomically (`server/utils/jsonSettingStore.js:42-46`) to `<data folder>/test-aids.json`
  (`server/src/settings/testAids.js:40`).
- **Errors:** 400 `{ error }` when the body is not `{ enabled: <boolean> }`
  (`server/src/routes/settings.js:27`, `server/src/settings/testAids.js:34`). 401. 403 (operator,
  `server/src/auth/guards.js:220-221`). CSRF 403.

---

## Admin (`/api/admin`)

Read-only facts about the installation for the status box at the top of the Dev Screen's
"Accounts and system" chapter (`server/src/routes/adminStatus.js`). AUDIT-1 D2, 2026-10-09.

### `GET /api/admin/status`

- **Who:** admin only — the whole `/api/admin` namespace, every method, is in `ROUTE_POLICY`
  (`server/src/auth/guards.js`).
- **Request:** none.
- **Response:** 200 `{ build, backup: { newest, visible }, status: { ok, checks }, release: { newest,
  current, newer, checkedAt, state } }`. `build` is what `GET /api/health` reports. `backup.visible`
  is false when `RA_BACKUP_DIR` is unset or unreadable from the server. `status.checks` are the
  checks of `npm run status` (`shared/statusChecks.mjs`) without the API check: disk and writable
  always, backup only when visible. `release` comes from GitHub, asked at most once a day per
  process (`server/src/releaseCheck.js`); any failure is `state: 'unknown'`, never an error.
  `newer` is null when this build's version cannot be determined (it is a version only when
  `RA_BUILD_BRANCH` is a release tag).
- **Errors:** 401. 403 (operator).

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
| 64 | GET | `/api/settings/test-aids` | signed-in |
| 65 | PUT | `/api/settings/test-aids` | admin |
| 66 | GET | `/api/admin/status` | admin |
---

## Planned (Phase 5)

A full race-integrity backend with Socket.IO, leaderboard, and JWT auth is planned for Phase 5.
See [ARCHITECTURE.md — Future: Phase 5 Server](ARCHITECTURE.md#future-phase-5-server).
