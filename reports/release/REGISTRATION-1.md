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

## Refusals

None so far.
