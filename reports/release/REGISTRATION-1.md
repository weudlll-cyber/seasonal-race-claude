# REGISTRATION-1 — player registration (morning sheet)

**Owns:** the record of the night chain of 2026-10-20/21 that built player registration on the
branch `feat/registration` (from `origin/master` `e371938b`). The decisions it builds are the
owner's of 2026-10-20; the row is REGISTRATION-1 in [docs/BACKLOG.md](../../docs/BACKLOG.md). **Not
merged** — the owner looks at it when the chain is done.

**What it is, in one paragraph.** A second way to fill a race. The director opens a registration
for a track — no names — and chooses how long it stays open (1 minute to 30 days). Players open a
public link on their phones and add their own names until the deadline. The director sees the list
live, removes names, closes early or extends. When it is closed the director loads the names into
the Players tab and starts the race through the normal Start Race flow; nothing starts automatically. No more players can
register than the track has places. Path A (the public link) is built; path B (a site with
signed-in players) is an integration seam only.

## Status

| piece | what | SHA | checks |
| --- | --- | --- | --- |
| P1 | server data, director routes, capacity and deadline, backup and restore | see the branch log | below |
| P2 | public routes, device cookie, rate limiter, integration seam, security tests | — | — |
| P3 | the public join page | — | — |
| P4 | the director UI, QR, stage view, "Use these players" | — | — |
| P5 | privacy and documents | — | — |
| P6 | end-to-end playthrough on the production preview | — | — |

## P1 — server data, director routes, capacity and deadline, backup

**Built.**

- `server/src/registrations/registrationStore.js` (new) — its own SQLite file,
  `DATA_ROOT/registrations.sqlite`. A registration: id, public code, team (both spellings), created
  by, track id and the track's name at creation, capacity, optional event name, opens-at (= creation),
  closes-at, closed-early-at. Entries: id, name, comparison key, source `public` | `integration`,
  external id (integration only), created-at. Deleting a registration deletes its entries
  (`ON DELETE CASCADE`).
  - **The deadline is decided by the server's clock on every read and every attempt to register** —
    nothing runs at the deadline, so a registration that expires while the server is down or the
    director's page is closed is closed the moment anyone asks.
  - **The capacity is held in one IMMEDIATE transaction** (count, then insert) plus UNIQUE
    constraints on (registration, name key) and (registration, external id).
  - The public code: 16 random bytes, base64url, 22 characters (128 bits).
- `server/src/routes/registrations.js` (new) — `/api/registrations`: open, list (own team), one with
  its names, close now, extend, remove a name, delete. Signed in, operator+, the team from
  `req.authUser.team`; another team's id is NOT FOUND, like an unknown one.
- `server/src/app.js` mounts it; `server/src/auth/routePolicyDrift.test.js` carries the operator+
  entries.
- `scripts/backup.mjs` — `registrations.sqlite` is the third database taken through SQLite's online
  backup (`SQLITE_FILES`); restore needs no change (it writes every archived file back).

**Reused, and named.** The player-name rules: `isNameLengthValid` / `nameTooLongMessage`
(`shared/nameLimits.mjs`) and `playerNameKey` (`shared/playerNames.mjs`) — the same rules the Players
tab and the player-groups route use. The team helpers `normalizeTeam` / `isWellFormedTeam`
(`server/src/auth/teams.js`). The record allow-list and string bound `unknownFields` /
`unknownFieldsMessage` / `checkString` (`server/utils/recordFields.js`). The track records
`readInstallTracks` (`server/src/routes/races.js`, now exported, unchanged). The store's connection
pattern from `raceStore.js` (own file, `foreign_keys = ON`, lazily opened per process). The test
shapes of `races.test.js` / `crossTeamAccess.audit.test.js` (a stamped `req.authUser`, an injected
store) and `test/authAgent.js` (`operatorAgent`).

**Tests.**

- `registrationStore.test.js` (18): the deadline by the clock, the capacity and window bounds, close
  and extend, numbering, the name rules, full / closed / unknown, the integration external id, the
  public view never carrying a name, team scoping, delete, **restart survival** (file closed and
  reopened after the deadline passed: still there, closed), and **the capacity against four worker
  threads on their own connections** (exactly 50 of 120 attempts land).
- `registrations.test.js` (8): every director route, and **another team gets 404 from every route and
  changes nothing**.
- `registrationsSecurity.integration.test.js` (2): behind the real guard stack, every director route
  without a session is 401, also in other letter cases and for HEAD; a signed-in operator opens one
  on an installed track.
- `scripts/backup.test.mjs` (+1): `registrations.sqlite` is taken by the online backup while held
  open, and restored with its rows.

**Broken once on purpose, each went red, each restored.**

| sabotage | went red |
| --- | --- |
| `addEntry` as a deferred transaction instead of IMMEDIATE | the concurrency test: 24 × `SQLITE_BUSY` |
| the capacity check off by 1000 | "refuses when full" and the concurrency test (120 landed, not 50) |
| `registrations.sqlite` taken out of `SQLITE_FILES` | the backup test: `file copy`, not `sqlite .backup()` |

**Decided by rule (no question asked).**

- **Its own database file, no `RA_*` override.** The simpler option: tests isolate it through
  `RA_DATA_DIR`, so no new setting, and the file is always under the data root, which the backup's
  refusal for stray overrides then never has to know about.
- **Extend only while open; closed is final.** "The new deadline must be later than the current one"
  reads as a change to an open window. Reopening a closed one would let names arrive after the
  director may already have loaded the list.
- **The deadline is sent as `closesAt` (an instant), not as a duration.** One field for presets and
  the custom date alike; the server checks it against its own clock (at least 1 minute from now, at
  most 30 days from creation).
- **The track's name is stored with the registration** at creation, so the public page can name the
  track without the server reading track records on a public route.
- **A body naming `team` is refused as an unknown field** (the record allow-list), where the race
  upload ignores it: refusing names nothing about the field, and the allow-list pattern refuses every
  unknown field.

**Documents changed with it (stale otherwise):** `docs/SETUP.md`, `docs/DEPLOYMENT.md` (the live
databases are three) and `docs/OPERATOR-GUIDE.md` (the data-folder table). The rest is P5.

## P2 — public routes, device cookie, limiter, integration seam, security tests

**Built.**

- `server/src/routes/join.js` (new) — `/api/join/:code`, no sign-in.
  - `GET` returns the public view: event name, track name, places, places left, state and closes-at.
    For a device that has registered it adds its own name and number (`you`). Never another
    player's name, the director, the team or the registration's id.
  - `POST { name }` registers, with the player-name rules and the case-insensitive duplicate
    refusal. Full answers "This race is full."; closed answers "Registration is closed.". On success
    it answers "You're in! You are number N of M.".
- **The device cookie** `ra_join`: httpOnly, SameSite=Lax, `Secure` by the session cookie's own rule
  (`resolveCookieSecure`), path `/api/join/<code>` (so one per registration), 31 days. Its value is the
  entry id. A second attempt is answered "You are already registered as <name>." with 409. A name
  the director removed frees the device again.
- **`PUBLIC_PATHS` takes an anchored `pattern`** beside the exact `path` (`server/src/auth/guards.js`
  `matchesPublicPath`).
  - Two entries admit exactly `/api/join/` plus 22 URL-safe characters, for GET (and so HEAD) and
    POST; nothing under, beside or around it, and no PUT, DELETE or PATCH.
  - The pattern is tested on the same lower-cased, slash-trimmed path the exact entries are, so
    letter case is judged as the router judges it.
- **`joinLimiter`** (`server/src/auth/rateLimit.js`, new factory `createJoinLimiter`): 60 a minute
  per address on the public POST only. It caps requests, not entries; there is no per-IP cap on
  entries.
- **A 1 KB body limit** on `/api/join` and `/api/integrations`, mounted before the app's 1 MB parser
  (`server/src/app.js`).
- `server/src/routes/integrations.js` (new) — `POST /api/integrations/registrations/:code/entries`,
  `Authorization: Bearer <RA_INTEGRATION_KEY>`, body `{ name, externalId }`.
  - Off (404, the body of an unknown route) while the key is unset.
  - 401 for a wrong or missing key. The comparison is constant-time: both sides are hashed to 32
    bytes, then compared with `timingSafeEqual`.
  - The same capacity, deadline and name rules apply; a doubled external id is 409.
- Documents: `docs/INTEGRATIONS.md` (new: purpose, the principle, the endpoint, errors, security
  notes), its row in `docs/README.md`, `RA_INTEGRATION_KEY` in `docs/ENVIRONMENT.md` (plus a line on
  the join limiter), and the standing principle as `docs/PROJECT-PRINCIPLES.md` §11.

**Reused, and named.**

- `PUBLIC_PATHS` and `matchesPublicPath` (extended, not duplicated); `policyMethod` (HEAD judged as
  GET).
- `express-rate-limit` through the existing factory shape of `rateLimit.js`.
- `resolveCookieSecure` (`server/src/auth/cookiePolicy.js`).
- `unknownFields` / `unknownFieldsMessage` for both bodies.
- The store's `addEntry` / `publicInfo` / `ownEntry` from P1, and its default instance
  (`getDefaultRegistrationStore`, shared by all three routers).
- The not-found body of `mountApiNotFound`.

**Tests.**

- `joinSecurity.integration.test.js` (13), against the real app:
  - the player path end to end: the cookie's attributes, "already registered", revisit, a doubled
    name from another device, a removed name freeing the device;
  - full, closed and unknown code;
  - **30 parallel registrations on 10 places: exactly 10 land, 20 are FULL**;
  - **the public bodies never carry another name, the director, the team or the id** (GET, success,
    refusal);
  - **path variants**: the code path in any case and with a trailing slash is public; 13 shapes
    under, beside or around it are 401, including `..`, `%2e%2e`, a short or long code, PUT, DELETE,
    PATCH and the director routes in other cases;
  - **HEAD** is public on `/api/join/<code>`, and refused on a POST-only public path and on a
    director route;
  - a 2 KB body is 413;
  - the limiter passes 60 and refuses the 61st;
  - **the integration seam**: unset → 404 with the unknown-route body; five wrong forms of the key
    (one character more, one fewer, none, `Basic`, empty) → 401 with nothing added; the right key →
    `source: 'integration'` with the external id; a doubled external id → 409; a doubled name and
    full answered by code.
- `guards.test.js` (+3): the pattern admits GET, HEAD and POST in any case and refuses PUT, DELETE,
  PATCH and seven near-miss paths.
- `routePolicyDrift.test.js`: the two routers are in the mount map and the two POSTs are classified.

**Checks.**

- Server lint clean.
- **The full server suite twice under load from other projects on the machine** (another project's
  Vite dev server and two other node services were running; not this chain's, and not stopped).
  - First run: 1240 of 1245 passed; 5 timeouts, all bcrypt-bound, in `teams.test.js`,
    `usersStore.test.js` and `caseBypass.integration.test.js`. Those three files alone: 91 / 91.
  - Second run: 1238 of 1245 passed; 7 timeouts in `authRouter.test.js`, `recoverAdmin.test.js`,
    `teams.test.js` and `usersStore.test.js`. Those four files alone: 116 / 116.
  - None of the failing files is touched by this branch. Every new test passed in both runs.

**Documents brought current in the same commit** (they became stale with P1 and P2):

- `docs/API.md`: the ten new routes (a new section and table rows 69–78; 68 → 78 routes, eleven →
  fourteen routers), the public-pattern rule, the middleware order, and the join limiter.
- 185 `file:line` citations into `guards.js`, `app.js` and `routes/races.js` remapped across
  `docs/API.md`, `docs/OPERATOR-GUIDE.md` and `docs/DEPLOYMENT.md`, plus 9 into `rateLimit.js`.
  This was done by a line map of the insertions, spot-checked against the code.
- One citation already wrong before this branch was corrected by hand: the settings router's mount,
  now `app.js:110`.
- `docs/AUTH.md` §5: the join link on the allow-list, and why it is narrow enough.
- Historical records (BACKLOG, `docs/archive/`) keep their citations as written.

**Decided by rule.**

- **The integration seam is mounted before the session and the guards, not put on `PUBLIC_PATHS`.**
  Its caller is a server with a key: on `PUBLIC_PATHS` it would also have needed an exemption from
  the CSRF guard, which in strict mode refuses a POST without `Origin`. That would have been two
  exemptions in two security components. Mounted first, it answers every request itself (404 off,
  401 wrong key) and touches neither.
- **The cookie is a courtesy, not a boundary.** Clearing cookies allows a second name; the director
  sees and removes it. Two simultaneous first attempts from one device both land, for the same
  reason.
- **GET is not rate-limited**, like every other read; the page polls it for the countdown and places
  left.

## Refusals

| when | what was refused | what was done instead |
| --- | --- | --- |
| P2, 2026-10-21 | Running the security tests against a guard weakened **on purpose** (the brief's "each broken once on purpose": a director route added to `PUBLIC_PATHS` temporarily). The session's permission check refused the test run as a security weakening. | The edit was reverted at once (`git diff` shows only the intended guard change). Under the refusal rule, the other three security sabotages (the public view leaking names, an unanchored pattern, HEAD not judged as GET) were **not attempted**: they are the same kind of action. The tests were written so each of those breakages contradicts a concrete assertion (a director route answering other than 401; a name in a public body; a path under the code answering other than 401; HEAD on the code path answering other than 200), but **that they go red is argued, not measured**. The P1 sabotages, which weaken no security, were run and went red. |
