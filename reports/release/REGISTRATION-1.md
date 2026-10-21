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
| P1 | server data, director routes, capacity and deadline, backup and restore | `3c7aa4f2` | below |
| P2 | public routes, device cookie, rate limiter, integration seam, security tests | `81ba1a2b` | below |
| P3 | the public join page | `864bf6a5` | below |
| P4 | the director UI, QR, stage view, "Use these players" | `85ce467b` | below |
| P5 | privacy and documents | `aa436dfe` | below |
| P6 | end-to-end playthrough on the production preview | the branch log | below |

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

## P3 — the public join page

**Built.**

- `client/src/screens/Join/JoinPage.jsx` + `.module.css` (new) — `/join/<code>`, public (App.jsx
  mounts it outside `ProtectedRoute`), mobile first. It shows:
  - the event name (or "Race registration") and the track;
  - places left as "N of M" and the time left as a live countdown, ticking every second from the
    device's clock;
  - a name field (stops at the shared 32-character limit) and Join;
  - "You're in! You are number N of M." with "Registered as <name>", also on every revisit from
    the same device;
  - "This race is full.", "Registration is closed." and "This registration link is not valid.";
  - the server's refusal sentence for a doubled name or a second attempt from the device.

  The server decides every state; the page asks again every 10 s, after every refusal and when the
  countdown reaches zero. When the server does not answer it says "The server could not be
  reached…" rather than the app banner's sentence, since there is no banner on this page. The
  footer bar (Source code / Legal notice / Privacy policy) is the existing `LegalFooter`.
- `client/src/services/registrationApi.js` (new) — the public calls (`_skipAuthRedirect`) and the
  director's calls, through the existing `apiCall`.
- `client/src/modules/registration/timeLeft.js` (new) — the countdown text, shared with the
  director's view (P4).

**Reused, and named.** `LegalFooter` (header updated: it is now on three screens), `apiCall` /
`API_BASE_URL` (`services/apiClient.js`, `services/api.js`, unchanged — they are inside the race
hull, so they were deliberately not touched), `PLAYER_NAME_MAX_LENGTH` (`shared/nameLimits.mjs`),
the app's colour tokens.

**Tests.**

- `JoinPage.test.jsx` (9): the open, registered, full, closed and unknown states; joining; a
  doubled name; already registered, followed by the page asking again; the server not answering.
- `timeLeft.test.js` (3).
- Browser gate, production arm, `e2e/join-page.spec.js` (3, at **390 × 844**, signed out):
  - a phone joins, is told "number 1 of 3", and sees the same after a reload;
  - the page is no wider than the phone and raises no CSP violation;
  - the same name in another case from a second phone is refused, the second phone joins with
    another name, and a third phone sees "This race is full." with "0 of 2";
  - closed, and an unknown code.
- `e2e/csp-no-violations.spec.js`: the join page added to the main screens, still zero violations.
- `docs/SHIP-CEREMONY.md` counts regenerated: 85/29 → 86/30, because of the new modules file. The
  race hull is unchanged at 231 files, so no fingerprint guard is selected.

## P4 — the director UI, QR, stage view, "Use these players"

**Built.**

- **The Players tab gets a two-button switch**, "Enter names" (the default, so the tab opens exactly
  as before) and "Player registration" (`SetupScreen.jsx`).
- `client/src/screens/SetupScreen/RegistrationPanel.jsx` + `.module.css` (new). It covers:
  - **opening**: the track (the selected one first), "Open for" 5 min / 15 min / 1 hour / 1 day /
    3 days / 7 days / "Until…" (a date and time), and an optional event name;
  - **the place count**, shown before opening — "N places — this track's player limit". A track
    whose geometry has not loaded cannot be opened, the way Start Race refuses it;
  - **one registration**: the join link with **Copy link**, a **QR code**, places taken and left,
    the time left, the names in arrival order each with ✕, **Close now**, **Extend** (+5 min,
    +15 min, +1 hour, +1 day, or "Extend until" a date and time), and **Delete registration**
    after a confirmation;
  - when closed, **Use these players**;
  - **the team's open and recently closed registrations** (the newest ten), each opening its view;
  - while a registration is shown and open, it is asked for again every 5 s.
- **Show QR full screen** — a white stage over the whole window, in the browser's full-screen mode
  where allowed. It shows the event name, the track, a QR code about two thirds of the window's
  height, and the link. Escape or Close leaves it, and leaving the browser's full screen closes it
  too.
- `client/src/components/QrCode/QrCode.jsx` (new) — the matrix from **`lean-qr` 2.7.4**, drawn as
  one SVG path with the standard quiet zone. No service is asked, no markup is injected and no
  inline style is used.
- **"Use these players"** passes the names through the Setup screen's own `setPlayers` (the
  existing roster path) and the registration's track through `setSelectedTrackId`, then switches
  back to "Enter names"; Start Race is the normal flow.
- `fieldCap.js` gains **`isTrackOpen(track, getTrack)`**: the open/closed test the Setup screen wrote
  out twice (the selected track and the Quick Test track), now one helper used by both and by the
  panel. Behaviour is unchanged, including `false` for an unknown geometry.

**The new dependency.** `lean-qr` 2.7.4, pinned exactly: MIT, no dependencies, pure JavaScript,
released 2026-09-07 (over two weeks ago). `npm audit` in client is unchanged — the same one high
advisory (vite 8.0.0–8.1.5, launch-editor) as before this chain, none from `lean-qr`. The bundle
check (`scripts/audit-bundle-address.mjs`) passes: "no deployment address".

**Tests.**

- `RegistrationPanel.test.jsx` (8):
  - the place count is the Players-tab limit for a closed and an open track;
  - an unloaded track cannot be opened;
  - opening sends the track, the operator's own limit, the trimmed event name and a deadline one
    hour away;
  - the view shows the link, a QR path, the counts, the countdown and the names in order;
  - remove, +1 hour (exactly one hour later) and Close now;
  - "Use these players" hands over exactly the names and the track;
  - Delete asks, and deletes only on yes;
  - the QR stage opens and closes with Escape.
- SetupScreen's 15 test files: 182 / 182, the tab unchanged when "Enter names" is the default.
- Browser gate, production arm, `e2e/registration-director.spec.js` (1), on the built app:
  - opening from the Players tab; the link and the QR code;
  - the stage view's code taller than half the window, closed by Escape;
  - two phones (390 × 844, signed out) join through the shown link, and the director's list shows
    both within a poll;
  - a removed name leaves the list; Close now;
  - "Use these players" leaves exactly "E2E Ada" in the roster with Start Race enabled;
  - the registration is deleted through the panel.

**Decided by rule.**

- **"Use these players" replaces the roster rather than adding to it.** A registration is a way to
  fill the race; mixing in names typed earlier would give a roster nobody registered. The button
  says so in its tooltip.
- **The recent list shows the newest ten** of what the server returns (at most 50).
- **QR library: `lean-qr`.** Of the three maintained, dependency-free candidates (`uqr` 0.1.3,
  `qrcode-generator` 2.0.4, `lean-qr` 2.7.4), it is the most recently maintained, and its plain
  matrix API lets the code be drawn as SVG elements with no markup injection.

## P5 — privacy and documents

- **Privacy**:
  - `docs/PRIVACY-FACTS.md`: two table rows (the registrations with their names, kept until the
    director deletes the registration; the `ra_join` device cookie), a removal row, the "whose
    data" line, and the template section naming the new sentence.
  - The privacy template (`client/src/modules/legal/legalNoticeTemplate.js`, section "3. Player
    names in races") gets one sentence: players may also register themselves through a link the
    director shares; their names are kept with the registration until the organiser deletes it;
    registering sets one technically necessary cookie per registration that only marks the device.
    Its header names the new fact, so the two stay in step.
- **`docs/OPERATOR-GUIDE.md`**: a new part, *Player registration* (how it works, the public page, at
  the venue, `RA_INTEGRATION_KEY`). Also:
  - a row in *Several organisers* (registrations are per team);
  - a row in *A damaged data file*, **measured 2026-10-21** on a scratch data folder: the server
    starts and health answers 200; only the registration routes answer 500; everything else works;
  - the footer sentence (three screens now).
- **`docs/ARCHITECTURE.md`**: a section *Player registration*, with a diagram of the three doors
  onto the one store.
- `CHANGELOG.md` (Added, on the branch, not merged); `README.md` and `docs/DEPLOYMENT.md` (the data
  root and per-team scope include registrations).
- **`docs/BACKLOG.md` PART ONE**: the row REGISTRATION-1 in *Delivering to someone else*, open until
  the owner accepts it.
- **`docs/OPEN.md` re-derived**: three rows (lines 15–1847); §0 renumbered (REGISTRATION-1 is row 2,
  the SECURITY.md e-mail row 3); the header and §1's reference updated.
- Already done with P2: `docs/API.md`, `docs/AUTH.md`, `docs/ENVIRONMENT.md`, `docs/INTEGRATIONS.md`
  and `docs/PROJECT-PRINCIPLES.md` §11 (the standing principle, dated).
- Check: `LegalPagesSection.test.jsx` 12 / 12 with the changed template.

## P6 — the end-to-end playthrough (production preview, throwaway data)

**Setup.**

- One server on port **4612**, serving the built client (`client/dist`) and a scratch data folder
  (`C:\Users\weudl\ra-measure\REGISTRATION-1-data`), started hidden.
- A director in a 1280 × 800 window; every player in its own **390 × 844** context, signed out.
- The script is `C:\Users\weudl\ra-measure\REGISTRATION-1-playthrough.mjs`; its output is
  `REGISTRATION-1-playthrough-run5.txt` beside it.

**Result: 24 of 24 checks passed (run 5).**

| step | result |
| --- | --- |
| a 2-minute registration (Until… a time 2–3 min ahead) on Dirt Oval, "Playthrough cup" | opened, 40 places |
| Show QR full screen | the code 528 px tall in an 800 px window; Escape closed it |
| 5 players from separate phone contexts | Ada, Bob, Cy, Dee, Eve; the fifth told "number 5" |
| a doubled name ("  ADA ") from a sixth phone | refused: "The name "Ada" is already registered…" |
| a second registration from Ada's phone | 409 "You are already registered as Ada."; after a reload the phone shows "You're in! You are number 1 of 40." |
| the director's live list | Ada, Bob, Cy, Dee, Eve within a poll |
| remove one name; extend +5 min | Eve removed; time left 2 min 21 s → 7 min 19 s |
| **server restart mid-registration** | the registration, its four names and its open state were still there; Ada's phone still recognised |
| a small-capacity track filled to full | a director window with the operator's closed-track limit at 2 opened "Small cup" with 2 places; two phones joined, the third saw "This race is full."; deleted through the panel, its link then 404 |
| **expire by time with the director page closed** | "Expiring cup" (2–3 min) with one name; the director page closed; after the deadline a new phone saw "Registration is closed."; the director page reopened showed it closed with its one name; deleted |
| unknown code | "This registration link is not valid."; page 390 px wide, no sideways scroll |
| **Use these players → Start Race** | A closed now; the roster was exactly Ada, Bob, Cy, Dee; Dirt Oval, 1 lap; **the result screen showed exactly Ada, Bob, Cy, Dee** |
| delete a registration | A deleted through the panel, its link then 404; **0 registrations left** on the server |
| CSP on the join page | 0 violations |

**Screenshots**, all under `C:\Users\weudl\ra-measure\REGISTRATION-1-shots\`:

- the director view: `director-view-empty.png`, `director-view-live.png`,
  `director-after-restart.png`;
- the QR stage view: `qr-stage.png`;
- the join page at 390 × 844: `join-open.png`, `join-success.png`, `join-revisit.png`,
  `join-duplicate.png`, `join-full.png`, `join-closed.png`, `join-unknown.png`;
- the result: `result-screen.png`.

**Failures on the way, all in the playthrough script, none in the product.** Each was fixed, and
the whole playthrough was re-run from the start.

- **Run 1**: a name clash in the script (`join`).
- **Run 2: hung for hours at its first step.** The script started the server through PowerShell and
  waited for PowerShell's output, which the server inherited and held open. It now starts the
  server directly, hidden and detached, with its output going to a log file.
- **Run 3**: 15 checks passed, then the script tried to open the next registration while the panel
  was still showing the last one. The script now presses "← All registrations" first.
- **Run 4**: the reused scratch folder already had its admin (setup 409), and the interrupted run 3
  had left registration A behind. The script now accepts 409 and deletes leftovers at the start.
- **Run 5**: 24 / 24.

**Throwaway data.** Every registration was deleted (0 left). Players' names are therefore gone
from the registration store. The **one race** that was run is stored in the scratch folder's
`races.sqlite`: stored races cannot be deleted in the app, by design. The scratch folder itself is
left in place under the no-recursive-deletes rule and is listed with the scratch folders in the
final report.

## Follow-up 1 — the owner's look at `0c879057` (2026-10-21)

The owner tried the flow on 4173 at `0c879057` on 2026-10-21 and registered from a private window with
a name only. The flow worked. He asked for six things the same day; each is recorded below as it is
built.

### Item 6 — accounts (record), and the seam's answer

- **Decision recorded** (the owner's, 2026-10-21): in the game players register **by name only**;
  joining with an account happens through an external site with signed-in players, via the
  integration seam. It is now in `docs/INTEGRATIONS.md` (with a table of what the site sends, what
  is stored and what comes back) and in the BACKLOG row.
- **Verified**: the seam already took and stored the display name (`name`) and the site's account
  id (`externalId`, beside `source: 'integration'`), and already returned `number` and `capacity`.
  **Places left were missing**, so `placesLeft` is added to the answer (`registrationStore.addEntry`
  returns it; `routes/integrations.js` passes it on). Nothing else about the seam changed.
- Test: `joinSecurity.integration.test.js` asserts `number`, `capacity` and `placesLeft` on the
  first entry (1, 2, 1) and the second (2, 2, 0). Broken once on purpose (`placesLeft` left out of
  the answer): red, then restored and green.
- `docs/API.md` (the answer), `docs/OPEN.md` (PART ONE's line range, now 15–1852, after the BACKLOG
  row grew).

### Item 1 — a 1-minute registration

- "1 min" is the first preset. **The server's bounds were verified, not changed**:
  `MIN_WINDOW_MS` = 1 minute and `MAX_WINDOW_MS` = 30 days (`registrationStore.js`, refused under
  1 minute from the request's arrival).
- **Decided by rule**: every preset is sent with a **5-second allowance** (`PRESET_GRACE_MS`).
  Without it, "1 min" sent as exactly 60 s from the click would always arrive under 60 s and be
  refused. Five seconds is invisible in every preset, and the server's bounds stay as they were.

### Item 2 — "Until…" and "Extend until"

- `DeadlineField.jsx` (new): the browser's own `datetime-local` input, themed with the Setup screen's
  existing `playerInput` class (**reused**, not copied) plus `color-scheme: dark`, so Chrome and Edge
  draw their picker dark too. No date library was added, because the native input could be themed;
  the date + time fallback was not needed.
- Under the field, live: **"Closes Thu 22 Oct, 19:45 (in 1 day 2 h)"** in the browser's locale.
  `formatDeadline` and `closesSentence` are new in `modules/registration/timeLeft.js`; the "in …"
  part is the existing `formatTimeLeft`.
- An invalid choice is said inline before submitting, and the button is disabled:
  - in the past;
  - under 1 minute ahead;
  - beyond 30 days;
  - for an extension, not later than the current deadline, or more than 30 days after opening.

  `deadlineProblem` in `timeLeft.js` restates the server's rules only in order to warn early; the
  server still decides. The picker's `min` / `max` attributes offer the same range.
- `useNow.js` (new): the clock as state that an interval moves forward, because reading
  `Date.now()` during render is impure (lint `react-hooks/purity`).

### Item 3 — Copy QR code, Download QR

- `modules/registration/qrImage.js` (new) and `components/QrCode/QrShareButtons.jsx` (new):
  - **Copy QR code** writes a PNG with `navigator.clipboard.write([new ClipboardItem(…)])`;
  - **Download QR** saves the same PNG as `racearena-join-<event or track>.png`;
  - the PNG is black on white, with the four-module white quiet zone and whole pixels per module,
    **at least 512 px**;
  - where the browser cannot copy an image, Copy says *"This browser cannot copy a picture. Use
    "Download QR" and send the file instead."*;
  - both appear beside *Copy link* on the registration view and in the full-screen QR view;
  - no network call.
- **Reused**: `lean-qr` through one `qrMatrix`, which the on-screen SVG (`QrCode.jsx`, now reading
  it) and the PNG both draw from, so they are the same code.

### Item 4 — coming back after a reload

- `SetupScreen.jsx` asks for the team's registrations on mount: **with any OPEN one the Players tab
  opens on "Player registration"**. The panel then shows exactly one open registration directly,
  and with several it shows the list **above** the form. With none open, the tab opens in the mode
  last chosen in this browser tab's session (`playersMode.js`, sessionStorage, every access in
  try/catch), else on "Enter names" as before.
- **Decided by rule** — the two halves of the request read together: an open registration wins over
  a remembered "Enter names", and the remembered mode applies when none is open.
- The ten Setup-screen test files that render the screen forbid network calls (TEARDOWN-INFLIGHT-1).
  Each now replaces the registration service with "none open", **the pattern they already use**
  for every other service; their tests are unchanged.

### Item 5 — the list, clearly selectable

- *Your registrations* shows **numbered cards** (1, 2, 3 …):
  - open ones first, with an accent border and a coloured **Open** badge;
  - then closed ones, most recent first, at most 10 (`RECENT_CLOSED`, the existing limit);
  - each card shows its number, the event (or track) name, the track, the badge, "N of M places",
    and the time left (open) or "closed Thu 22 Oct, 19:45" (closed);
  - each has an **Open** button (the keyboard's way in, labelled "Open registration N: <name>"), and
    the whole card is clickable too.
- The view of one registration starts with a visible **"← Back to all registrations"** button.
- At 390 px the cards stack full width.

### Tests (items 1–5), each new test broken once on purpose

| test | what it holds | sabotage that turned it red |
| --- | --- | --- |
| `RegistrationPanel.test.jsx` (17, 9 new) | 1 min first and sent ≥ 60 s; "Closes … (in 2 days 0 h)", past and > 30 days refused with the button disabled; extend not later than the deadline refused; cards numbered, open first and highlighted, list above the form; each card opens; one open shown directly; none open → form first; Back at the top; Copy / Download beside Copy link and in the stage | the 1 min preset removed; the past check removed; open cards after closed; the single-open auto-show off |
| `timeLeft.test.js` (+6) | "Thu 22 Oct, 19:45" (en-GB), "Closes … (in 1 day 2 h)", local ↔ instant, every `deadlineProblem` rule | the past check removed |
| `qrImage.test.js` (5, new) | white quiet zone, finder pattern, PNG ≥ 512 px with whole pixels, file name, no image clipboard → false | `pngScale` rounding down |
| `QrShareButtons.test.jsx` (3, new) | copied note; the fallback sentence; download file name | the fallback sentence replaced |
| `playersMode.test.js` (3, new) | remembered for the session; only real modes; blocked storage neither throws nor remembers | the write made a no-op |
| `playersModeOnLoad.test.jsx` (5, new) | none open → names; one open → shown directly; several → list; open beats a remembered "names"; none open → the remembered mode | the mode effect not switching |
| Browser gate `e2e/registration-list.spec.js` (3, new) | two open → after a reload the list is on top, both highlighted, each opens; one open → shown directly after a reload; at 390 × 844 the cards stack, equally wide, inside the window | auto-show off and the list below the form (a separate build): the first two went red |
| `e2e/registration-director.spec.js` | reopening by its card | (updated) |

All of them are green again after the restore. The restored build's bundle is byte-identical to the
build before the sabotage (`index-BeU6ffpS.js`).

**Noticed, left (not this branch's).** At 390 px with **test aids on**, the Setup screen's
start-buttons row (`startButtons`, Start Race + Quick Test) is 654 px wide, so the page scrolls
sideways. This branch changes no CSS of that row (`git diff e371938b` of `SetupScreen.module.css`
is additions only), so it predates the branch. With test aids off, as an installation ships, the
row is narrower; not measured here. The phone check in `registration-list.spec.js` therefore
measures the cards themselves.

### The follow-up playthrough (Edge, production build, throwaway data)

`C:\Users\weudl\ra-measure\REGISTRATION-1-followup-playthrough.mjs`, run in **Microsoft Edge**
(headless) against one throwaway server on 4612. **Run 2: 22 of 22 checks passed**; run 1 stopped
on a locator in the script that also matched the new cards' "Open registration N: …" buttons, which
was fixed in the script, and then everything was re-run from the start. Screenshots and the
downloaded PNG are under `C:\Users\weudl\ra-measure\REGISTRATION-1-shots\followup-1\`.

| request | result |
| --- | --- |
| 1 · a 1-minute registration | "1 min" first; opened with "1 min 05 s" left (the 5 s allowance); **closed by itself** — the open view showed "Registration is closed." after the minute |
| 2 · "Until…" two days ahead | under the field: "Closes Fr., 23. Okt., 20:34 (in 2 days 0 h)" — **in the browser's locale** (this Edge runs in German); the field draws with `color-scheme: dark` |
| 2 · an invalid past date | "This time is in the past." under the field, the Open button disabled |
| 3 · **Copy QR code in Edge** | the clipboard held **`image/png`**; that picture, decoded with jsQR, is **the join link** (518 × 518 px) |
| 3 · **Download QR** | `racearena-join-two-day-cup.png`, 518 × 518 px, **decoded with jsQR to the join link**; both buttons in the full-screen view too |
| 4 · reload with one open registration | shown directly |
| 4 + 5 · reload with two open | "Player registration", the numbered list **above** the form (208 px vs 433 px): 1 open, 2 open, 3 closed; each open card opened and "Back to all registrations" returned |
| 5 · the list at 390 × 844 | the cards end at 334 px, inside the window |
| 6 · **the seam with a throwaway test key** | the server restarted with the key; `201 {"entry":{…,"name":"Site Player","externalId":"site-account-42"},"number":1,"capacity":100,"placesLeft":99}`; the director's list showed "Site Player"; the server restarted **without** the key: the same call answers 404 |
| throwaway data | all three registrations deleted (0 left); the test key exists only in that one server process's environment, which was stopped |

**Premerge after follow-up 1.**

- **Run 1, under heavy load** from other projects on the machine (another project's vitest,
  Playwright and build runs; CPU 50–100 %): 26 / 1. The server suite failed on two bcrypt-bound
  5 s timeouts in `recoverAdmin.test.js` and `races.test.js` (not changed by this branch); the two
  files alone: 41 / 41.
- The re-run was **held until the machine was quiet**, by the owner's instruction of 2026-10-21. A
  watcher checked every 5 minutes (other projects' test/build processes, CPU over 2 minutes) and
  found it busy 14 times from 20:52 to 21:55. The re-run started after the owner said the other
  project had finished and one check showed no other test process, with CPU mostly idle (10 of 12
  samples ≤ 25 %, the others 36 % and 39 %).
- **Run 2, quiet**: 26 / 1 — a **real flake in this branch's own test**. `RegistrationPanel.test.jsx`
  "extends by the chosen amount" computed the fixture's deadline anew for each mocked answer, so one
  hour came out as 3,600,001 ms. Fixed by one deadline for the whole file (`CLOSES_AT`). Then run 3,
  below.

The decoder, **jsQR 1.4.0**, was installed into the scratch folder
`C:\Users\weudl\ra-measure\REGISTRATION-1-decoder\`, outside the repository and not a dependency
of the project, for this proof only.

**Documents**: `docs/OPERATOR-GUIDE.md` (*Player registration*: the 1-minute preset, the date field
and its sentence, Copy QR code / Download QR, the numbered list and coming back; also the stale
"Open registration" button name corrected), `docs/ARCHITECTURE.md`, `CHANGELOG.md`.

## The checks before handing over

| check | result |
| --- | --- |
| `npm run verify -- --premerge` against `origin/master` `e371938b` | **first run 25 / 2**: `server-format-check` (one test file unformatted — fixed and committed) and `check-image-starts` (`docker build`: "no such job", a Docker Desktop fault; re-run alone it built in 91 s and the image answered health); **second run 27 / 0**; **after the layout fix below, third run 27 / 0** |
| the full Browser gate (production arm) | **first run 126 / 1**: `legal-pages.spec.js` "the setup screen fits a 900 px desktop window" — the Players tab's new switch added a row and the screen scrolled 26 px at 1900 × 900. **A real regression of this branch**, fixed (the switch is placed out of the flow on the title's line; the tab is exactly as tall as before). **Second run 127 / 0** |
| client suite (in the premerge) | green |
| server suite (in the premerge, run alone) | green |
| `npm audit` | server 0; client the one high advisory that was there before this chain (vite 8.0.0–8.1.5, launch-editor) — **not worse** |
| fingerprints | none moved; nothing in the race hull changed (231 files); none minted, `docs/fingerprints.json` untouched |

## Refusals

| when | what was refused | what was done instead |
| --- | --- | --- |
| P2, 2026-10-21 | Running the security tests against a guard weakened **on purpose** (the brief's "each broken once on purpose": a director route added to `PUBLIC_PATHS` temporarily). The session's permission check refused the test run as a security weakening. | The edit was reverted at once (`git diff` shows only the intended guard change). Under the refusal rule, the other three security sabotages (the public view leaking names, an unanchored pattern, HEAD not judged as GET) were **not attempted**: they are the same kind of action. The tests were written so each of those breakages contradicts a concrete assertion (a director route answering other than 401; a name in a public body; a path under the code answering other than 401; HEAD on the code path answering other than 200), but **that they go red is argued, not measured**. The P1 sabotages, which weaken no security, were run and went red. |
