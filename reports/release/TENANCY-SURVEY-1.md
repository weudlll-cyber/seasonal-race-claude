# TENANCY-SURVEY-1 — several organizers on one server: what is true today, and a build plan

**Night chain of 2026-10-01, piece 2.** Branch `tenancy/survey`, off master `c775aa80`. **Read-only:
no product change.** Pushed, not merged.

**Why now.** The owner's facts of 2026-10-01: the software is to be downloadable for many server
operators, and every operator must be able to host several organizers on one server. So the tenancy
boundary is part of the first release. It was decided on 2026-09-25, and on 2026-09-27 it was decided
to build it before a second organizer is invited.

**The boundary as decided** (`docs/BACKLOG.md`, TENANCY row):

- **per organizer**: brands, player groups, and tracks the organizer itself created
- **shared**: the shipped tracks and the racer types

**Surface classes are in neither list.** That gap is question 1 below.

**Words.** In the code an organizer is a **team**, and that word is used below wherever the code is
quoted. The code's roles are **`operator`** and **`admin`**. An "operator" in the release sense, the
person who runs the server, has no role of its own today (§3).

**How the facts were collected.** Read at source on master, every claim with `file:line`. The
owner's data files were opened for field names and counts only. Anything inferred rather than seen
is marked **INFERRED**. The claims the plan leans on hardest were re-read by hand, not taken from a
summary: `teams.js:9-12`, `races.js:80-88`, `raceStore.js:488-491`, the audit test's photograph
assertion, the admin route policy, and the tracks PUT handler.

---

## The short version

1. **A team is a label on a user, nothing more.** There is no teams table and no teams route. A team
   exists while some user carries it, and only a server-wide `admin` can found one.
2. **Only races are scoped**, on the server, on read and on write. **Tracks, brands, player groups,
   racer types, surface classes, uploads and the seed-redelivery notice are one shared set for
   everybody.** The route files contain the word "team" zero times.
3. **`admin` is server-wide.** An organizer made `admin` would control every organizer on the server.
4. **One browser shares everything between the people who sign in on it**, including the local race
   history with racer names and unsaved track drafts. **INFERRED, not tested:** races one organizer
   recorded while offline would be uploaded into the next organizer's team.
5. **"Shipped" is not a field.** `isDefault` is the only marker, and an admin can set it on any record.
   What is actually shipped is the list in `server/seeds/versions.json`.
6. **The audit test is green because it photographs the absence of scoping.** It goes red the moment
   the boundary is built, and must be rewritten in the same commit.

---

## 1 · How a team comes into being, and who can create one

- **There is no teams store, table or route.** The set of teams is derived from the users:
  `server/src/auth/teams.js:53-59` ("WHY NO NEW STORE") and `usersStore.js:96-121` (`listTeams`, the
  distinct `teamNormalized` values).
- **A team is data, not a permission.** `teams.js:9-12`: *"A TEAM IS DATA ABOUT A USER, NOT A
  PERMISSION. Nothing in this file is consulted by requireAuth or requireAdmin…"*.
- The founding team is a constant: `teams.js:71`, `FOUNDING_TEAM = 'Seasonal Entertainment'`.
  Comparison uses `normalizeTeam` (`teams.js:86`: trim, NFC, collapse spaces, lower case).
- **The ways a team is created:**

  | how | where | who |
  | --- | --- | --- |
  | first-run setup | `POST /api/auth/setup` → `authRouter.js:123-130`, `team: FOUNDING_TEAM, allowNewTeam: true` | whoever holds `RA_BOOTSTRAP_TOKEN`, once (`:56-75`, marker `:86`) |
  | an admin creates a user with a new team name | `POST /api/users` with `allowNewTeam` → `usersRouter.js:31-40`, `usersStore.resolveTeam` `:137-166`. Without the flag, an unknown team is refused as `UNKNOWN_TEAM` and the error lists the existing teams (`:152-160`) | **admin** |
  | an admin moves a user to a new team | `PUT /api/users/:id` with `team` + `allowNewTeam` (`usersRouter.js:76-84`) | **admin** |
  | the teams backfill | `scripts/migrate-teams.mjs` → `migrateTeams.js:46-60`: every teamless user goes into the founding team | host shell |
  | admin recovery | `scripts/recover-admin.mjs` → `recoverAdmin.js:67-71`, founding team | host shell |

- **In the UI**: Dev Screen → User Management derives the teams from `GET /api/users` and offers a
  "new team" option (`client/src/screens/DevScreen/sections/UserManagementSection.jsx:19-40`,
  `:184-196`).

## 2 · How users are created and assigned to a team

- **There is no self-registration.** The public paths are health, setup-needed, setup and login, and
  nothing else (`guards.js:13-18`).
- The first admin comes from setup (§1). **Every other user is created by an admin** with
  `POST /api/users` (`usersRouter.js:27-59`). `team` is required, with no fallback
  (`usersRouter.js:28-31`, `usersStore.js:206-211`). The accepted roles are `operator` and `admin`
  (`usersStore.js:223`).
- **A user's team is read from their record on every request**, and put on `req.authUser`
  (`guards.js:136-166`). The session itself stores only `userId` and `sessionEpoch`
  (`authRouter.js:147-148`, `:215-216`). Moving a user to another team takes effect on their next
  request.

## 3 · Roles, and which routes each can reach

- **Exactly two roles, `operator` and `admin`** (`usersStore.js:223`, `:295`). There is **no
  organizer role, no player role, and no admin limited to one team**. The person running the server
  and an organizer's own administrator would both be `admin`.
- Order (`app.js`): helmet, CORS, JSON, session, CSRF (`:34-40`) → the built client, mounted above
  the guards (`:48-49`) → **`requireAuth`** (`:51`, deny by default for `/api/*`) → **`requireAdmin`**
  (`:52`, raises a route to admin only when `ROUTE_POLICY` matches, `guards.js:22-62`; everything else
  is "operator or above") → the routers.
- **A new route cannot arrive unclassified**: `server/src/auth/routePolicyDrift.test.js:133-148` fails
  on any mutating route that is neither admin-classified nor on the operator allowlist.

| route | who | team-scoped? |
| --- | --- | --- |
| `GET /api/health`, `GET /api/auth/setup-needed`, `POST /api/auth/setup` (token), `POST /api/auth/login` | public | — |
| `POST /api/auth/logout`, `POST /api/auth/change-password`, `GET /api/auth/me` | operator+ | `me` returns the team |
| `GET`, `POST`, `PUT`, `DELETE` `/api/users[/:id]` | **admin** | **no: lists and edits users of every team** (`usersRouter.js:21-24`) |
| `GET /api/tracks`, `/:id`, `/:id/background`; `POST`, `PUT /:id`, `DELETE /:id`; `POST`/`DELETE /:id/background` | operator+ (DELETE refused for `isDefault`) | **no** |
| `POST /api/tracks/:id/set-default`, `/clear-default`; `GET /:id/export-seed` | **admin** | no |
| `GET /api/surface-classes[/:id]` | operator+ | no |
| `POST`, `PUT`, `DELETE /api/surface-classes` | **admin** | no |
| `GET`, `POST`, `PUT`, `DELETE /api/player-groups[/:id]` | operator+ (DELETE refused for `isDefault`) | **no** |
| player groups: set-default, clear-default, export-seed | **admin** | no |
| `GET`, `POST`, `PUT`, `DELETE /api/brands[/:id]`, `/:id/logo` | operator+ (DELETE refused for `isDefault`) | **no** |
| brands: set-default, clear-default, export-seed | **admin** | no |
| `GET`, `POST`, `PUT`, `DELETE /api/racers[/:id]`, `/:id/sprite` | operator+ | no |
| `GET /api/seed-notices`, `POST /api/seed-notices/dismiss` | operator+ | **no: one dismissal clears it for the whole install** |
| `POST /api/races`, `GET /api/races`, `GET /api/races/:shortKey` | operator+ | **yes** |

- In the client, the Dev Screen hides the advanced sections from a non-admin
  (`client/src/screens/DevScreen/DevScreen.jsx:35-168`, `:190-191`). That is a display filter, not a
  boundary; the server's route policy is the boundary.

## 4 · Every server collection, and whether it is scoped

| collection | where | scoped by team? |
| --- | --- | --- |
| users | `users.json` (`usersStore.js:17`) | carries `team`; the admin list is unfiltered |
| sessions | `sessions.sqlite` (`session.js:64`, `:88-107`) | no, and needs none: a session is one user |
| **races** | `races.sqlite`, table `races`, columns `team`, `team_normalized` NOT NULL (`raceStore.js:113-114`) | **yes, on read and write.** The team comes from the session and a body `team` is ignored (`races.js:69`, `:91`). The list is `WHERE team_normalized = ?` (`raceStore.js:519-525`). A short-key read is scoped too, and answers **404 rather than 403** for another team's race (`:502-508`), so it does not confirm the race exists |
| ↳ **the one gap** | `getRaceByClientId` (`raceStore.js:488-491`), used by `races.js:80-88` | **not scoped.** A POST whose `clientRaceId` matches **another team's** race answers `200 {id, shortKey, alreadyStored: true}` with that race's short key. The key cannot be read across teams, because the GET is scoped. The facts are seen at source; **how much this matters is INFERRED** |
| rosters, racer-type blobs | `races.sqlite` (`raceStore.js:87-95`) | no column; reachable only through a race (**INFERRED**: no route reads them directly) |
| **tracks** | `tracks/<id>.json`, in memory from boot (`tracks.js:35`, `:45-61`) | **no** |
| track backups | `tracks-backups/` (`tracks.js:37`, `:253`) | no |
| **backgrounds** (uploads) | `backgrounds/<trackId>.<ext>`, one flat directory (`tracks.js:611-622`) | no |
| **brands** | `brands/<id>.json` (`brands.js:44`, `:77`) | **no** |
| **brand logos** (uploads) | `brand-logos/` (`brands.js:45`) | no |
| **player groups** | `player-groups/<id>.json` (`playerGroups.js:31`, `:54`) | **no** |
| **racer types** made by users | `racers/<id>.json` (`racers.js:42`, `:60`); the built-in types are client code (`racers.js:5-6`) | no |
| racer sprites (uploads) | `racer-sprites/` (`racers.js:43`) | no |
| **surface classes** | `surface-classes/<id>.json`: custom classes plus overrides of the defaults; the defaults live in the client's `defaults.js` (`surfaceClasses.js:8-14`, `:25`, `:51`) | no; writing is admin-only |
| seed-redelivery notices | `.seed-notices.json` (`seedNotices.js:26`) | no |
| seed versions, migration ledger | `.seed-versions.json`, `migrations.json` | install-wide by nature |
| **settings: tuning, camera, race defaults** | **not on the server at all**: browser storage (§5) | — |

**Two facts the build has to meet:**

- **Ids are global.** Brands, player groups, racer types and surface classes accept an id chosen by
  the client and answer `409 "'<id>' already exists"` on a clash (`brands.js:176`, `:190`;
  `playerGroups.js:116`, `:130`; `racers.js:144`, `:147`; `surfaceClasses.js:106`). **INFERRED:** once
  the boundary exists, that 409 would confirm that another organizer has a record with that id.
- **The track POST and PUT spread the request body into the record** and re-pin only `id`,
  `geometryId`, `isDefault`, `backgroundImageFile` and the timestamps (`tracks.js:499-520`, `:539-549`).
  So a `team` field sent by the client would be stored as sent today. Brands and groups build their
  records field by field and drop unknown fields (`brands.js:193-209`, `playerGroups.js:134-141`).

## 5 · What the browser keeps, and whether two organizers on one browser see each other's data

- **IndexedDB: none. Cookies: only the server's HttpOnly session cookie.**
- **No key is namespaced by user or team.** Every key is a fixed `racearena:*` string, or
  `racearena:*:<trackId>`. The registry is `client/src/modules/storage/storage.js:9-53`.

| key (localStorage) | what it holds | shared between two people on one browser? |
| --- | --- | --- |
| `racearena:raceHistory` | **the local race history: names, results, and whether each race has reached the server** (`raceHistory.js:170`, `:192`); shown in Dev Screen → Race History (`RaceHistory.jsx:104`) | **yes, and visible** |
| `racearena:trackEditor:draft:<id>` | **unsaved Track Editor drawings** (`trackEditorDraft.js:42-48`) | **yes: offered to the next person** |
| `racearena:branding` | a mirror of all server brands, logos included as data URLs (`brandingSync.js:56-80`) | yes |
| `racearena:cache:serverTracks`, `racearena:trackGeometries:*` | cached tracks, used for the first render before the fetch (`trackLoader.js:20-21`, `useServerTracks.js:24`) | yes |
| `racearena:raceDefaults`, `racearena:activeSession`, the seven tuning and camera keys (`storage.js:15-24`) | settings | yes |
| `racearena:raceSeed`, `racearena:lastRaceSeed`, `racearena:lastRaceIdentifier` | the last race's seed and identifier | yes |
| `racearena:lastUser` | `{name, role}`, a sign-in hint (`AuthContext.jsx:46`) | yes; **the only key cleared at sign-out** (`AuthContext.jsx:107-116`, `:129`) |
| sessionStorage: `activeRace`, `raceResults`, `racearena:repeatRace`, … | the race in progress | for the life of the tab |

**Answer: yes.** Two organizers signing in one after the other on one browser share all of it. The
second sees the first's local race history (with racer names) and is offered the first's unsaved
track drafts.

**And one consequence that is worse than seeing.** INFERRED from the code, not tested: a local race
history entry carries no user and no team (`raceHistory.js:145`, "NO TEAM IS SENT"). The pending
races are uploaded when the server becomes reachable (`pendingRaces.js:80-117`), and the server
stamps the team of **whoever is signed in at that moment** (`races.js:69`, `:91`). So races the first
organizer recorded while the server was unreachable would be filed into the second organizer's team.

**After a server-side boundary, the caches are what would still leak** (INFERRED):

- `racearena:branding` is re-synced at sign-in (`BrandingSyncOnAuth.jsx:19`) but keeps the old copy
  when the fetch fails (`brandingSync.js:17-18`).
- The track caches draw the first frame before the fetch answers.

## 6 · How shipped tracks are told apart from team-created ones

- **The only marker is `isDefault`.**
  - New records are forced to `false` (`tracks.js:516`, `brands.js:202`, `playerGroups.js:138`).
  - PUT keeps whatever it was.
  - DELETE is refused while it is `true` (`tracks.js:563`, `brands.js:259`, `playerGroups.js:176`).
- **`isDefault` does not mean "shipped".** An admin can set it on any record (`_defaultPromote.js:34-40`).
  On the owner's install, one brand that is not in the seeds carries `isDefault: true`.
- **What is shipped is the manifest**, `server/seeds/versions.json`:
  - 10 tracks with their backgrounds;
  - the `seasonal-entertainment` brand with its logo;
  - the `default-example-group` player group.

  Delivery copies them at boot (`seedDelivery.js:136-180`). A raised version overwrites the operator's
  copy and leaves a notice.
- **No record carries `team`, `teamId`, `origin`, `shipped` or `owner`.** Every JSON file under
  `server/seeds/` and under `server/data/{tracks,brands,player-groups,racers,surface-classes}` was
  checked.
- **Racer types and surface classes have no `isDefault` and no seeds.** The built-in ones are client
  code.
- **Two consequences for the shared half of the boundary** (seen at source; the effect is INFERRED):
  - **Any operator can edit a shipped track** (`tracks.js:532-557` has no `isDefault` check) and
    replace its background (`:595`). Under the boundary that edit would change the track for every
    organizer, and a later redelivery would overwrite it for all of them.
  - **The shipped brand is the founding team's own brand**, but the boundary makes brands per
    organizer. The shipped player group has the same problem. Question 4.

## 7 · `server/src/routes/crossTeamAccess.audit.test.js` — why it changes in the same commit

- **What it is.** A dated audit probe of 2026-09-26, 198 lines. Its header says it **"ASSERTS WHAT IS
  TRUE TODAY, INCLUDING WHERE THAT IS 'NO SCOPING'"** (`:18-21`). A warning block added on 2026-09-27
  (`:23-51`) already says the absence assertions will fail when the boundary is built, that **failing
  is the correct outcome**, and that they must be rewritten in the same commit, not appeased.
- **How it is built.** It mounts **only** the races router behind a fake `req.authUser` (`:84-93`),
  with two operators: `ada` in Alpha Racing and `bob` in Beta Racing (`:95-96`). It does not go
  through `app.js` or the real guards.
- **Describe 1, races: real boundary tests, which stay.**
  - B cannot list A's races (`:122-130`).
  - B reading A's race by short key gets **404, not 403** (`:132-144`).
  - B cannot file a race into A's team with a body `team` (`:146-153`).
  - A user with no team gets an empty page (`:155-163`).
- **Describe 2, the "photograph"** (`:166-197`). It reads the seven route files, counts the word
  `team`, and asserts:
  - exactly `brands, playerGroups, racers, seedNotices, surfaceClasses, tracks` have zero
    (`:193-195`);
  - `races` has more than zero (`:196`).
- **Why it must change in the same commit, concretely:**
  - The first time `tracks.js`, `brands.js` or `playerGroups.js` contains the word, the expected list
    no longer matches, and the test goes red.
  - Racers may correctly stay at zero (they are shared), so the list must be **rewritten**, not just
    shortened. Surface classes and seed notices depend on questions 1 and 6.
  - Nothing in the file tests tracks, brands or groups by behaviour; those tests have to be written.
- **Its blind spots** (INFERRED from the regex):
  - It counts a word, so a comment containing "team" would turn it red with no scoping.
  - It would stay green for scoping placed in a shared helper outside the seven files.
  - `\bteam\b` does not match `teamId` or `teamNormalized`.
- **Plan:** each build piece below rewrites its collection's part of this file in its own commit.
  The last piece replaces the photograph with behaviour tests through the real app.

---

## BUILD PLAN

Sized by the usual rules: **one subsystem per piece, at most one new mechanism per piece**, each piece
self-contained with its own checks. Every piece is server or client storage only. **None can reach
the race engine**, so no fingerprint is expected to move; `engine-reach --check` confirms it per
piece.

**The order is a dependency order.** Pieces 2 to 4 are the boundary as decided. Nothing should be
built on a guess, so each piece names the questions it waits for. **Until pieces 2 to 4 are merged, a
second organizer should not be invited**; that was decided on 2026-09-27.

| # | piece | subsystem | new mechanism | waits for | what the owner would see |
| --- | --- | --- | --- | --- | --- |
| T1 | **Close the one gap in races**: the duplicate check `getRaceByClientId` looks only inside the caller's team | races | none: it reuses the team argument the short-key lookup already takes | nothing | nothing. A retried upload still answers "already stored"; another organizer's race is never named |
| T2 | **Brands per organizer**: the server stamps the organizer on create (and ignores the body); list, read, edit, delete and logo calls see only the caller's own brands, plus the shipped brand as question 4 decides; existing brands go to the founding team through the existing migration runner (`scripts/migrate.mjs`, a new id) | brands | **one: the shared "scope this collection to the caller's organizer" helper**, written once here | questions 4, 5 | as organizer B: Branding shows only B's brands. As himself: all of his, unchanged |
| T3 | **Player groups per organizer**: the same as T2 | player groups | none: T2's helper | questions 4, 5 | as organizer B: only B's groups, and the racer names in them stay B's |
| T4 | **Tracks: shipped vs created**. A track is shipped when it is in the seed manifest, not when `isDefault` says so. Created tracks get T2's scoping and their backgrounds follow them; shipped tracks are visible to all and editable as question 3 decides | tracks | **one: "shipped" read from `server/seeds/versions.json`** | questions 3, 5 | every organizer sees the ten shipped tracks; each sees only its own drawn tracks |
| T5 | **The browser keeps each signed-in user's data apart**: storage keys namespaced by user; a race recorded offline carries its author and is uploaded only under that author; the brand and track caches are dropped when the user changes | client storage | **one: the per-user storage namespace** | question 7 | on a shared laptop, organizer B no longer sees A's race history or A's unsaved drawings, and A's offline races cannot land in B's history |
| T6 | **Who administers whom**: the person running the server versus an organizer's own administrator | users, roles | **at most one: a role limited to one organizer**, only if question 2 asks for it | question 2 | depends on the answer. With the simplest answer, only the people the server operator makes `admin` can manage users, and organizers are never made `admin` |
| T7 | **Surface classes and the redelivery notice**, as questions 1 and 6 decide | surface classes, seed notices | none: T2's helper, if per organizer | questions 1, 6 | if per organizer: each organizer's own custom surface classes; if shared: nothing changes |
| T8 | **The proof**: the audit test's photograph replaced by behaviour tests through the real app and guards (two organizers, every collection, each answer checked); ids made unguessable or the 409 made team-blind; one browser spec with two organizers on one server | tests, ids | none | T2–T7 | nothing. It is what makes "the boundary exists" a tested fact instead of a reading |

★ **Why T1 comes first and waits for nothing.** It is inside the one collection that is already
scoped, it needs no decision, and it leaves the races boundary with no known gap before the rest is
built on the same pattern.

## QUESTIONS for the owner

**One decision per line.** Each has its options and what each means for you. The plan above names
which piece waits for which answer.

1. **Surface classes (mud, ice and the like, and their settings): one set for the whole server, or
   each organizer their own?**
   - **One shared set (today).** Only the server's administrator edits them, and every organizer
     races on the same ground rules. Nothing to build.
   - **Each organizer their own.** An organizer can tune mud for their own events without changing
     anyone else's; the built-in ones stay shared. Piece T7.

2. **Who manages an organizer's users?**
   - **Only the person running the server (simplest).** They create each organizer's accounts.
     Organizers can never see or change another organizer's people. Nothing new to build: organizers
     are simply never made `admin`.
   - **Each organizer has its own administrator.** An organizer can add and remove its own people
     without asking the server operator. This needs a new role limited to one organizer (piece T6).

3. **May an organizer change a shipped track?**
   - **No: shipped tracks are read-only for organizers**, and "save as my own track" makes their own
     copy. Your shipped tracks look the same for everyone.
   - **Only the server's administrator may change them**, and the change applies to every organizer.
   - **Anyone may change them (today).** One organizer's change then changes the track for all
     organizers, until the next delivery overwrites it.

4. **The shipped default brand ("Seasonal Entertainment", with its logo) and the shipped "Example
   Group": what does a NEW organizer get?**
   - **A starting copy of each, which becomes theirs** to change or delete. Each organizer starts with
     something that works.
   - **They see the shipped ones as shared, read-only templates**, and make their own beside them.
   - **Nothing: they start empty.** The shipped brand and group stay yours only.

5. **Your existing brands, player groups and the tracks you drew: whose are they after the boundary?**
   - **Your organizer's (Seasonal Entertainment)** (recommended reading of the boundary). Nobody else
     sees them.
   - **Shared with everybody**, like the shipped tracks.

6. **The notice "updated records replaced your settings": who sees it, and who may dismiss it?**
   - **Only the server's administrator.** It is about the installation, not about an organizer.
   - **Every organizer, each dismissing it for themselves.**
   - **As today**: every user sees it, and the first one to dismiss it dismisses it for everyone.

7. **On one shared browser (a laptop at an event), what should the second organizer find?**
   - **Their own things only** (recommended): history, drafts and settings are kept per person on that
     browser, and come back when that person signs in again.
   - **Nothing at all**: signing out clears everything stored on that browser, including unsaved
     drawings and races not yet uploaded.

8. **Racer types made by an organizer (with their own uploaded pictures): shared, like the built-in
   ones, or kept per organizer?** The boundary says "the racer types" are shared. This asks whether
   that includes the ones an organizer creates.
   - **Shared**: everyone can race with every type anyone made.
   - **Built-in ones shared, created ones per organizer.** Piece T7 would take them too.

---

## Checks

- **Read-only.** No file under `server/`, `client/` or `scripts/` was changed on this branch.
- The documents changed are the reports index, the reports README, the index guard's registration
  of `reports/release/` and its two test fixtures, `docs/BACKLOG.md` (the TENANCY row) and
  `docs/OPEN.md`.
- The owner's servers on 4000, 4173 and 5173 were not touched.

## Noticed and left

- `docs/BACKLOG.md`, Phases 5–7 intro: it says "the TENANCY row **above**", but the row is below it,
  inside the same section. Not changed.
- The PERIOD EVALUATION row cites the races index at `server/src/races/raceStore.js:162`; it is at
  `:176` today. Not changed: that row is not this piece's.
- `docs/AUTH.md` does not mention teams at all, although teams reach every request through
  `requireAuth`. Not changed; it belongs to piece T6, when roles and teams meet.
