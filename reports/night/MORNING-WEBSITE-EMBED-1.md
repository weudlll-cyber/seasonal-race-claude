# MORNING — WEBSITE-EMBED-1 (2026-11-11/12)

**Branch:** `feat/website-embedding`, from master `691f7429`. **Nothing here is merged**: the branch is
merged once, after the rehearsal, with the owner's approval. Every new behaviour is off unless
`RA_MODE=website`; standalone at "/" is unchanged. The backlog row is *WEBSITE-EMBED-1* at the start
of [docs/BACKLOG.md](../../docs/BACKLOG.md) PART ONE.

The design source was the race planning's summary of RACE-EMBEDDING-BRIEF.md (2026-11-11, §4, §9,
§10). The brief file itself is not in this repository; where the code disagreed with the summary, the
code was followed and the line is in **Where the code disagreed** below.

## State

| piece | state |
| --- | --- |
| 2 — base path | **done** — `357192cc`, pushed |
| 3a — website sign-in | **done** — `11a4d17f` (+ `46ae5ce9`, the stamp), pushed |
| 3b — account-changes feed | **server part done** — `26c32049`, pushed; masking past races: piece 6 |
| 4 — members join through the join page | **done** — `644c7447`, pushed |
| end — verify, installer test, the owner's two addresses | **done** — see below |
| 5 — the Dev Screen in website mode (2026-11-11, second chain) | **done** — `52628908`, pushed |
| 5a — the route file inside the website's proxy (third chain) | **done** — `3d658d7f`, pushed |
| 5b — the installer's website mode (third chain) | **done** — see below |
| 6 — "Deleted player" in past races (2026-11-11, second chain) | **done** — see below; the race screen of a repeat keeps the stored names — decided 2026-11-11 (fork 1) |

## Start

- origin showed only `master` at `691f7429`.
- 14 cores; parallel work is sized to leave several free.
- No server was listening on 4000, 5173 or 4173, so none of the owner's processes was in the way:
  `npm ci` ran in `server/` (body-parser 2.4.0, multer 2.5.0) and `client/` (zod 4.6.7).

## Piece 2 — the base path

**What it does.** `RA_BASE_PATH` (unset = "/"; e.g. `/games/race`) mounts the WHOLE app under the
path — API, built client, SPA fallback, sign-in — and everything outside it answers 404. One build
serves both: Vite `base: './'` writes every URL relative, and the server rewrites the shell's
`<base href="/">` to `<base href="/games/race/">`. The router's basename, the API address, the
sprites and the join link follow the base path; the session cookie's Path is the base path.

**Reused, not written again:**
- The runtime marker (`server/src/runtimeConfig.js`, injected by `staticClient.js`) carries the base
  path; `apiBaseUrl` becomes `<origin or ''><base>`, so **`client/src/services/api.js` needed no
  change**.
- The CSP's existing script hash (`csp.js` → `runtimeConfigScriptHash`) follows the marker.
- No asset-URL helper existed in the client (searched `BASE_URL`, `assetUrl`, `publicUrl`): ONE was
  added, `appUrl` in `client/src/modules/runtimeMarker.js`, which is now also the one client home of
  the marker's name (api.js imports it from there instead of defining it).
- ★ **Caught by the server suite, fixed:** the helper was first written in `client/src/services/`.
  The Docker image carries the race engine (`client/src/modules/` and `racer-types/` only) to replay
  stored races, and the sprite loader's new import was not in it — `racesVerify.test.js` ("a race
  replays from ONLY what server/Dockerfile copies") went red. Moved into `modules/`; green, 15/15.
- ★ **Found while reading the join route, fixed:** the join page's device cookie had
  `Path=/api/join/<code>`; under a base path the browser never sends it back, so a player would not
  be recognised after a reload. It now follows the base path (`cookieBasePath`, moved to
  `auth/cookiePolicy.js`, the one lenient reader shared with `session.js`).

**Tests.**
- Server suite: 71 files, 1274 of 1275 passed before the move above, the one red being the image
  check; after it the image check is green. Client suite: 322 files, 5247 passed (the 323rd "file"
  was the Playwright spec, now excluded from vitest).
- Server: `basePath.integration.test.js` (8: the real app at "/" and at "/games/race" — API, shell,
  deep link, assets, 404 outside, CSP hash, cookie Path at sign-in and sign-out);
  `runtimeConfig.test.js` +6; `session.test.js` +4. Sabotage: the mount removed → 4 of 8 red; the
  cookie Path forced to "/" → 1 red; both restored green.
- Client: `modules/runtimeMarker.test.js` (5). Sabotage: the "already under the base" guard removed → red;
  the sprite loader's `appUrl` removed → red; both restored green (17 with spriteLoader.test.js).
- Browser, production build under `/games/race/` (`playwright.basepath.config.js`,
  `e2e-basepath/basepath.spec.js`): sign in, the setup screen, the join link carries
  `/games/race/join/…`, a phone joins through it and is still recognised after a reload, a Quick Test
  race starts, the racers' sprites and the
  fonts load from below the base path, no 404 or 5xx anywhere — **1 passed**. Sabotage: the
  `<base href>` rewrite removed → red (the app does not load); the join cookie back at
  `/api/join/<code>` → red at the reload; both restored.
- "/" stays as it was: production arm `csp-no-violations`, `join-page`, `legal-pages`,
  `registration-director` with the chain before them — **11 passed**. The 4173-style preview
  (`scripts/serve-production.mjs`, scratch port 4799, scratch copy folder) and the Vite dev server
  (scratch port 5799): `/setup` loads, sprite, font and favicon 200, 0 failures, `baseURI` "/".
- Fingerprints: `engine-reach --check` named `spriteLoader.js` and the new `basePath.js` as able to
  reach the race, so `check-fingerprints.mjs --mint` (which only verifies) ran: **4 roles agree with
  the engine, 0 stray copies.** Nothing minted.

**Forks decided.**
1. *The 31 `/assets/…` sprite strings in `client/src/racer-types/` were left as written* and resolved
   at the ONE place a sprite reaches the browser, `loadSprite` (via `appUrl`). It also covers stored
   records that carry the same form, and leaves the engine-adjacent racer configs and their tests
   untouched. The cache stays keyed by the URL as given.
2. *`client/src/styles/fonts.css` was left as written:* with `base: './'` Vite already writes the
   twelve `url('/fonts/…')` as `url(../fonts/…)`, relative to the CSS file, so they resolve under any
   base path (checked in the built CSS). The dev server only runs at "/".
3. *The favicons* (`client/index.html`) became relative (`favicon-32.png`), resolved against
   `<base href>`.
4. *`RA_BASE_PATH="/"` is refused* like any trailing slash; empty means the root. A lone "/" would
   have made the image's health check ask for `//api/health`.
5. *Under a base path `RA_COOKIE_NAME_MODE=host` refuses to start*: a `__Host-` cookie must have
   `Path=/`. `legacy` stays `ra.sid`; `auto` gives `__Secure-ra.sid` when Secure is guaranteed.
6. *The image's HEALTHCHECK follows `RA_BASE_PATH`* (`server/Dockerfile`); unset, it asks the same URL
   as before. `deploy/docker-compose.prod.yml` (standalone only) was not touched.
7. *Outside the base path the answer is a plain-text 404*, not the API's JSON 404, because nothing
   outside it is the API.

**Hygiene.**
- Files changed: `server/src/app.js` (+26: `createApp` mounts `createRaceApp`), `runtimeConfig.js`,
  `csp.js`, `staticClient.js`, `index.js`, `auth/session.js`, `auth/authRouter.js` (sign-out clears
  the cookie at its own Path), `server/Dockerfile`; `client/vite.config.js`, `client/index.html`,
  `App.jsx`, `racer-types/spriteLoader.js`, `SetupScreen/RegistrationPanel.jsx`. New:
  `client/src/modules/runtimeMarker.js`, the base-path browser arm (excluded from vitest, like `e2e/`).
  `client/src/services/api.js` changed by one import only (the marker's name), its behaviour not at all. Docs: ENVIRONMENT.md (`RA_BASE_PATH`,
  `RA_COOKIE_NAME_MODE`), AUTH.md (the cookie), API.md (the prefix, the join cookie's path),
  PRIVACY-FACTS.md (the cookie row).
- `client/src/modules/track-effects/bgImageCache.js:38` was checked: its `/assets/` sentence is
  history and stays true, so it was left.
- Noticed, left: `client/public/index.html` is a shell from the initial commit
  (`96064362`). The build's own `index.html` wins over it, so it is never served. It is not in the
  area this piece touched.
- Noticed, left: Git for Windows on this OneDrive tree fails `git diff docs/` and any checkout that
  removes a file under `docs/` with "cannot stat 'docs'"; `git diff` without the pathspec works.

## Piece 3a — website sign-in

**What it does.** `RA_MODE=website` (default `standalone`) turns on: `GET <base>/auth/website`, the
ONE route that reads the website's identity headers, believed only from a peer in
`RA_WEBSITE_TRUSTED_PROXIES` (the TCP peer, `req.socket.remoteAddress`) AND with the secret from
`RA_WEBSITE_PROXY_SECRET_FILE` (timing-safe; only its digest is kept; never logged); otherwise 403
with no detail. Missing secret or empty network list → the server refuses to start. The mapping is
recomputed at every sign-in: website admin → race admin, Can-Host → operator, other member → player
identity only (no user record), guest → nothing. Directors and admins get a user record
`website:<id>` with no password and team `RA_WEBSITE_TEAM` (default "Seasonal Entertainment").
Locked and deleted members are refused; `returnTo` cannot leave the base path. Local sign-in,
first-admin setup, change-password and `/api/users` answer 404; the sign-in screen shows only
"Sign in through Seasonal Entertainment"; `/setup-admin` goes to it. recover-admin is untouched.

**Reused, not written again:** the user record and every guard (`usersStore.js` gained one
check-then-create method, `upsertWebsiteUser`, inside the store's existing lock); the session epoch
idea (`sessionEpoch`, guards.js) — the website identity has its own epoch, compared the same way;
the registrations database file and its check-then-create schema pattern for the identities;
Node's `net.BlockList` for the CIDR check (no dependency); `routingPath` (utils/apiPath.js) for the
closed doors, so they close in any letter case as Express routes them.

**New files:** `server/src/website/` — `websiteConfig.js` (settings), `identityStore.js`
(identities + the feed cursor for 3b), `websiteSession.js` (is a website session still good — one
answer for the guard and the join page), `websiteSignIn.js` (the route), `closedInWebsiteMode.js`;
`scripts/website-standin.mjs` (the local stand-in for the website proxy, 127.0.0.1 only, not in the
image).

**Tests.**
- `websiteSignIn.test.js` (15): settings and each refusal (the secret never in a message), the
  four kinds' mapping, organiser-without-host → player, nothing above admin, UTF-8 names, returnTo.
- `websiteMode.integration.test.js` (12, the real app under /games/race): wrong secret, untrusted
  peer, headers on another route → all ignored; admin / host / member / guest; a revoked host loses
  the director role on the next request; locked refused; the closed doors; standalone untouched.
- `standin.integration.test.js` (5): the stand-in in front of a real website-mode app — pick host →
  operator with the display name; member → no director API; forged headers get nowhere.
- `runtimeConfig.test.js` +1 (the marker's `mode` key, only in website mode),
  `LoginScreen.website.test.jsx` (2).
- Sabotage: the peer check removed → the untrusted-peer test red; the closed doors unmounted → red;
  the guard's website check removed → the revoked-host test red; all restored green.
  ★ Two sabotages that stay green, said so rather than hidden: (1) removing only the epoch bump on a
  role change — the guard ALSO checks the member's last mapped role, so either alone ends a revoked
  host's session (belt and braces, both kept); (2) removing the stand-in's header stripping — the
  race's own secret check already refuses a forged request.
- Server: 555 tests in the touched areas green. Fingerprints: re-verified after piece 2's move
  (4 roles agree); again for 3a (`runtimeMarker.js` gained `SITE_MODE`) — see the 3a commit.

**Forks decided.**
1. *X-Acting-User-Email-Verified and X-Acting-User-Steps are accepted and not used.* The brief's
   mapping needs neither; storing them would keep personal data nothing reads.
2. *An organiser who may not host is a player.* The brief: "any other member → player identity only".
3. *A display name is decoded from UTF-8* when Node's latin1 reading of the header bytes is valid
   UTF-8 ("Zoë"), cut to 60 characters; an id must be 1–128 of `A-Za-z0-9_.:@-`. Malformed → 400.
4. *A deleted member who signs in again is refused*, like a locked one: a deletion is final here.
5. *A guest sign-in ends whatever the browser was signed in as* — the website says this browser is a
   guest now.
6. *The website team is founded on the first director sign-in if no such team exists*
   (`allowNewTeam`), and an existing spelling is adopted.
7. *Website records skip the last-admin guard:* the role is the website's decision at every sign-in;
   recover-admin.mjs still makes a local admin if one is ever needed.
8. *The identities live in `registrations.sqlite`* (the server's existing mutable SQLite file, already
   in the backup), not in `users.json` — most members are players, who get no user record.
9. *`/api/auth/me` adds `displayName` only for a website director;* a local user's answer is unchanged.
10. *The marker's `mode` key is written only in website mode*, so the standalone page and CSP hash
    do not move.

**Hygiene.**
- Changed: `server/src/app.js` (+18: the website mount), `index.js` (+3: the start gate),
  `auth/guards.js` (+10: the website director check), `auth/usersStore.js` (+55:
  `upsertWebsiteUser`), `auth/authRouter.js` (/me), `registrations/registrationStore.js` (the file
  path exported; a redundant alias removed), `runtimeConfig.js`, `csp.js`, `staticClient.js` (the
  mode); client `LoginScreen.jsx` (split: `WebsiteSignIn` / `PasswordSignIn`), `App.jsx`,
  `Auth.module.css` (`a.button`), `modules/runtimeMarker.js` (`SITE_MODE`).
- Docs: AUTH.md §10 (new), ENVIRONMENT.md *Website mode* (new), API.md (the route, the 404s, /me;
  the route count recounted to 80), OPERATOR-GUIDE.md (a pointer).
- ★ Noticed and FIXED in API.md (a file this piece edits): its "complete" route list was missing
  `POST /api/registrations/:id/raced` (REGISTRATION-1 follow-up 2, 2026-10-22), so its count was one
  short. Added the row; the count is now from the routers again.
- Noticed, left: in website mode the Dev Screen still shows *Change password* and *User
  management*; both now answer "not found". Hiding them is a UI change the brief did not ask for —
  on **Needs the owner's word**.
- An incident, recorded: one doc edit was first attempted as an inline `node -e "…"` whose text held
  backticks; bash ran them as commands. Nothing was changed by them — one of them started
  `scripts/recover-admin.mjs` with no arguments, which printed its usage and stopped ("unknown
  action") — and the garbled AUTH.md was restored from git and rewritten from a file.

## Piece 3b — the account-changes feed (OWNER-3)

**What it does.** In website mode a poller asks `<RA_WEBSITE_FEED_URL>/api/games/race/account-changes`
(header `X-Games-Sync-Token`, the token from `RA_WEBSITE_SYNC_TOKEN_FILE`), every
`RA_WEBSITE_FEED_INTERVAL_MS` (default 60 s, 15–120 s): **locked** → the member's sessions end and
sign-in is refused; **unlocked** → allowed again; **rights** → sessions end, the role is recomputed at
the next sign-in; **deleted** → their website entries leave every OPEN registration at once (closed
ones keep their list), and the identity is marked deleted. A full page (500) is followed at once but
never sooner than a second after the last request (under 60 a minute); errors back off — doubling per
failure, up to ten minutes — and a success resets it. The cursor is in SQLite; a page's identity
changes and its cursor are one transaction, the open-registration removals just before it, so a crash
replays the page and every event is safe twice. The poller starts after the server listens
(`index.js`), only in website mode; its timer never holds the exit.

**Reused:** the identity store's epoch (3a) for "sessions end"; the registration store for the
removal (`removeOpenWebsiteEntries`, one statement beside `removeEntry`); the stand-in (3a) is now
also the feed, with links on its page to lock, unlock, revoke or delete each fake member.

**Tests.** `accountFeed.test.js` (13, a fake feed and real stores in one temporary
`registrations.sqlite`): the settings and refusals; the tolerant reader; **paging past 500** (the
second page asked within a second, `?since=<cursor>`, the cursor advancing); **a repeated batch**
changing nothing; **an error, then backoff** (0, 2×, 4×, 8×, 10 min, 10 min, then the interval
again); each event's effect; website mode without the feed refuses to start.
`standin.integration.test.js` +1: a lock fired on the stand-in's page reaches the race through the
real poller — Hugo's director session ends on the next request, his sign-in is refused, a wrong token
gets nothing. Sabotage: the open-registration removal dropped, "a full page means more" dropped, the
doubling dropped — each red, all restored. Website tests 46/46.

**Forks decided.**
1. *The feed is REQUIRED in website mode* (URL and token file; the server refuses to start without
   them). The brief does not say; a website-mode race without it would keep a deleted member's name
   in open registrations and a locked member's sessions alive, so "off" was not a safe default.
2. *The answer's field names are not in the summary,* so the reader accepts `events`/`changes`,
   `type`/`event`, `userId`/`user_id`/`id`, `nextCursor`/`cursor`, and `hasMore` (or a full page of
   500 for "ask again now"). An answer without a cursor is an error (it could not be remembered); an
   event of an unknown kind, or naming nobody, is skipped. **To confirm against the website's feed.**
3. *A lock for a member the race has never met is remembered*, so their first sign-in is refused.
4. *A deleted member's entries stay in CLOSED registrations* — a race may already have been run from
   that list; past races are masked at display time instead.
5. *Backoff:* doubling per failure in a row, capped at ten minutes, reset by the first success.

**Masking a deleted member in past races — NOT BUILT, and why.** It needs the member's website id
on each racer of a race taken from a registration, carried into the STORED race record, and the
names masked wherever a past race is shown. Looked at after piece 4: the stored record is an
immutable, content-addressed store (raceStore.js, contentAddress.js) with its own trust-boundary
checks, the client uploads it and keeps a local copy (the race history), and a name appears in the
roster, the results and the finish order across several screens. That is a change to the race
record's contract, not a small addition, and it was the last item of a long chain. The brief's own
fallback was taken — leave the masking out, keep the server part — **but for this reason, not the
brief's** (no fingerprint or golden race was measured to move; carrying an optional field would
most likely move neither). **The server part is built:** a deleted member's identity is marked
deleted, their entries leave open registrations at once, and `identityStore.deletedIds()` is the
list a display-time mask would read. The test "a past race of a deleted member still verifies and
replays identically" is therefore not written: with nothing carried, a stored race is untouched by
a deletion by construction. **Open, for a later piece:** carry `websiteUserIds` (aligned with the
roster) into the stored record, and mask by it at display.

## Piece 4 — members join through the race's own join page (OWNER-1, OWNER-6)

**What it does.** In website mode a member signed in through the website opens the join link and
sees **"Join as <display name>"**; one press joins them as themselves — source `website`, their
website id as the external id (OWNER-6), so the existing UNIQUE (registration, external id) makes it
**one entry per account** (a second join, from any browser, is "You are already registered as …").
Opening a registration in website mode asks **who may join**: *Website members only* (the default)
or *Anyone with the link*. On a members-only registration a guest sees it read-only with *Sign in
through Seasonal Entertainment*, which comes back to the same join page (`returnTo`); a guest's
typed name is refused there (403 `MEMBERS_ONLY`). On *Anyone with the link* a guest gets today's name
form. Capacity, the deadline and the duplicate-name rule are the store's, unchanged. The director's
list marks a member's entry "(from the website)". Standalone: the field is unknown to the create route
(refused as before), the join routes take the old code path, the form shows no choice.

**Reused:** the registration store's `addEntry` (one transaction for every rule), its external-id
uniqueness (made for the integration seam), its check-then-alter pattern for the new column
(`addWebsiteAccessColumn`, beside `addRacedColumn`), the director view's existing `source` and
`externalId` per entry; `currentWebsiteMember` (3a) for who is looking; the join API helper as is
(no name → `{}`).

**Tests.** `websiteJoin.integration.test.js` (7, the real app in website mode): join once and a
second refused; one entry per account from a second browser; members-only refuses a guest's name;
*anyone* accepts it; the director sees source `website` with the id; capacity unchanged; create takes
`websiteAccess`, `members` by default, a wrong value 400. `JoinPage.website.test.jsx` (3),
`RegistrationPanel.website.test.jsx` (2: the choice and its default, the "(from the website)" mark,
the base path in the link). The standalone join and panel tests run unchanged (JoinPage 9, panel 18).
Sabotage: the members-only check removed → red; the website external id dropped → 4 red; both
restored.

**Forks decided.**
1. *A registration with no stored choice* — opened before website mode, or in standalone — *works as
   it always did* (anyone with the link). The column is nullable; only website mode writes it.
2. *The choice is on the create form only*: there is no edit form for a registration (only "Extend"),
   so "create/edit" became create.
3. *A member whose display name is already on the list* (a guest typed it) is refused by the
   unchanged duplicate-name rule (409, its own sentence).
4. *A member's own entry is found by their account*, not by a device cookie; no `ra_join` cookie is set
   for a website entry.

## End of the chain

**Verify, the whole branch against master `691f7429` (ONE run, 60 changed files):** 32 passed,
2 failed, 4 skipped, 1202 s. Both failures were generated documents behind the code, not faults:
`ceremony-counts` (SHIP-CEREMONY.md's engine-reach counts — the new `modules/runtimeMarker.js` is
one more hull file and one more module, 231 → 232, 88 → 89) and, in `script-suite`,
`gen-engine-reach-doc.test.mjs` (SIM.md's generated hull list). Both regenerated with their own
generators (`gen-ceremony-costs.mjs --counts`, `gen-engine-reach-doc.mjs`), `--check` green for
both, the test file alone 10/10 — commit `08f78d80`. Every fingerprint (world, camera, render),
the golden races, the image start and the browser-free frame checks passed in the run.

**The standalone installer test (deploy/test/e2e-local.sh): 79 of 79.** Refs made as before, in a
scratch clone from the URL (push disabled): A = `68ad6eac` (the branch; later commits are docs only),
B = A + `e2e-test-1`, C = A with a server that exits at start, D = B with a server that listens only
after 70 s — throwaway local branches, never pushed. ★ The FIRST attempt reported 29/50 and tested
nothing: I passed Git Bash paths (`/c/tmp/…`) where the script wants Windows paths (it turns path
conversion off), so its first clone failed. Re-run with `C:/tmp/…`: 79/79. No container of the stack
is left.

**The owner's dev server, at "/", on this branch:** API `http://localhost:4000` and the app
**http://localhost:5173/** (hidden, started as the dev-start skill does but without its "stop every
node" step — nothing was running on 4000, 5173 or 4173). Build badge: **`08f78d80 ·
feat/website-embedding · clean`** (`/api/health`). 4173 was not started.

**The website-mode look:** open **http://127.0.0.1:4790/** — the local stand-in for the website
(127.0.0.1 only). Pick **"Hugo Host — host"** to be a director: the race opens at
`http://127.0.0.1:4790/games/race/`, signed in as Hugo; *Players* → *Player registration* shows
**"Who may join: Website members only / Anyone with the link"**. Copy the join link, go back to
http://127.0.0.1:4790/, pick **"Mia Member — member"**, open the link: **"Join as Mia Member"**. Pick
**"A guest"** and open it again: a members-only registration is read-only with *Sign in through
Seasonal Entertainment*; an "anyone" one shows the name form. The stand-in page's *Account changes*
links lock / unlock / revoke / delete a fake member; the instance reads the feed every 15 s.
Behind it: a website-mode instance on 127.0.0.1:4791 (`RA_MODE=website`, `RA_BASE_PATH=/games/race`),
its own data, secret and token under `%LOCALAPPDATA%\racearena-website-look` (generated, never
printed), the branch's built client. Checked: picking "host" lands on `/games/race/` as
`role: operator`, team "Seasonal Entertainment", display name "Hugo Host".

**Left on this machine, all mine:** `C:\tmp\ra-installer-1111` (the scratch clone with the throwaway
refs), `C:\tmp\ra-e2e-1111b` (the passing run's folder), `C:\tmp\ra-e2e-1111` (the failed run's
folder — its deletion was refused by the permission system, so it stays), and
`%LOCALAPPDATA%\racearena-website-look`. The four started processes: API 4000, Vite 5173,
website instance 4791, stand-in 4790.

## Piece 5 — the Dev Screen in website mode (the owner's decision of 2026-11-11)

**What it does.** In website mode the Dev Screen leaves out *Your password* (ChangePasswordSection)
and *Race directors* (UserManagementSection); a sub-group left empty is not shown, as the operator
view already did. Standalone shows both, unchanged. The server routes keep answering 404 in website
mode (`closedInWebsiteMode.js`, unchanged).

**Reused, no second source:** the mode is `SITE_MODE` from `client/src/modules/runtimeMarker.js`, the
same constant the sign-in page reads (`LoginScreen.jsx`); the filter is the screen's existing
`chaptersFor` (DevScreen.jsx), which already drops operator-hidden parts and empty sub-groups — the two
parts carry `standaloneOnly: true` in `devScreenChapters.js`.

**Tests.** `DevScreen.website.test.jsx` (2): website mode hides both and keeps the rest of the chapter;
standalone shows both. The Dev Screen's 30 other files unchanged, 384/384. Sabotage: `shownInMode`
made always true → the website test red; restored.

**Hygiene.** DevScreen.jsx 204 → 213 lines (`shownInMode` and the website arm of `chaptersFor`);
devScreenChapters.js 253 → 263 (the flag, its header line, the two parts written out). Nothing removed
or moved. engine-reach: all three paths outside the hull.

## Piece 6 — "Deleted player" in past races (OWNER-3, the owner's decision of 2026-11-11)

### Step 6.0 — the check before building

**(a) Where the three screens get racer names.**
- *Result screen* — this device only: `sessionStorage 'raceResults'` (client/src/screens/ResultScreen/index.jsx:289),
  written by the race screen (client/src/screens/RaceScreen/index.jsx:1160) from `buildRaceResults`
  (client/src/screens/RaceScreen/raceResults.js:51, `name: r.name`, with `index`).
- *Race history* — both: the team's server page (`fetchRacesPage`, RaceHistory.jsx:195 → `rowFromServerRace`
  :85, `race.winners`) and this device's history (`useStorage(KEYS.RACE_HISTORY)` :166 → `rowFromLocalEntry` :106,
  `entry.winners`). It shows the winners only.
- *Replay* — "Run it again" re-encodes the stored inputs (client/src/modules/repeatRace.js:99-100, the identifier
  carries `names`, client/src/modules/raceIdentifier.js:158) and the setup screen starts a new race with
  `racers: decoded.names.map(…)` (client/src/screens/SetupScreen/SetupScreen.jsx:933). The race screen draws `r.name`
  itself: name tags (RaceScreen/drawing/racerRendering.js:85, the label function renderRaceFrame.js:271, the tag
  layout nameTagLayout.js:267), the start board (drawing/startBoardRendering.js:652), the standings
  (ScoreboardCard.jsx:92), the winner card (WinnerCard.jsx:113), the overlay text (stateOverlaySelection.js:42).
  The name is also physics (client/src/modules/raceBehavior.js:225 `stablePairBit`) and the coat
  (RaceScreen/racerDisplayFields.js:55). The server's *Verify* replays from the store (scripts/lib/storedRaceReplay.mjs:148).

**(b) What is hashed, and the upload path.**
- *Server content id:* `contentId(row)` (server/src/races/raceStore.js:510) over `row`, which is built from NAMED fields
  only (:468); the roster is its own content id over `{ names }` only (:431), the racer values over two named fields
  (:437). A field the store does not name cannot enter any of the three.
- *Client:* the race identifier encodes the entry's `inputs` (client/src/modules/raceHistory.js:126), not the entry.
- *Upload:* the result screen records the race locally first (ResultScreen/index.jsx:318) and sends it at once
  (:321 → client/src/modules/pendingRaces.js:49 `postRace(toServerPayload(entry))` → client/src/services/racesApi.js:27 →
  `POST /api/races`, server/src/routes/races.js:134 → `storeRace`).
- *Offline:* the entry stays `sync: pending` in the local history (raceHistory.js:147); `flushPendingRaces`
  (pendingRaces.js:86) sends every pending entry when the server is reachable again (`startPendingRaceSync` :110,
  mounted by client/src/components/PendingRaceSync.jsx:23). The queue IS the history entry.

**(c) Can the mapping travel outside the hashed record? YES.** On the device it sits at the top of the history entry,
beside `raceSource` and outside `inputs` (raceHistory.js:116), so it waits in the pending queue with the race and
goes up in the same POST (`toServerPayload` :161). On the server the route takes it OFF the body before the store
sees it (routes/races.js:168) — and even unstripped the store would ignore it, by (b). ★ The store's header asks for
the opposite for facts ABOUT a race ("a later field about the race belongs in here, not beside it", raceStore.js,
storeRace, Option A — a technical rule of 2026-09-25, not the owner's); the owner's decision of 2026-11-11 is that this
mapping goes beside, so the two do not conflict: it is a fact about a website account, not about the race.

**(d) Fingerprints and golden races.** `engine-reach --check` on every path this piece changes: all outside the hull,
so no fingerprint or golden-race check is selected. The only part that would reach the hull — the replay's own labels
(a) — is not built (fork 1). **Decision: 6.0 passes; piece 6 built.**

### What it does

In website mode, a race whose players were taken from a registration carries `websiteRacers` —
`[{ index, websiteUserId }]` for each racer whose name is a website member's entry (`websiteIdsByName`,
`websiteRacersFor`, client/src/modules/registration/raceFromRegistration.js) — beside the race to the result
screen, the local entry, the upload and a repeat. The server checks it (index in the roster, a member it has met;
anything else dropped, never a refusal — server/src/website/websiteRacers.js) and writes it to one new table,
`race_website_racers` (race id, racer index, website id; check-then-create, immutable rows, `INSERT OR IGNORE`)
in the race store, team-scoped through the race it points at. `GET /api/races/deleted-racers?clientRaceIds=…`
(website mode only, 404 in standalone) answers which racer indexes belong to members the feed marked deleted
(`identityStore.deletedIds()`, piece 3b). The result screen and the race history ask for what they show, at once and
every 15 s while open (client/src/modules/deletedRacers.js), and show **"Deleted player"** for those racers. Without an
answer the stored name stays. Standalone sends nothing and stores nothing.

**Reused:** the registration's own `source`/`externalId` per entry (piece 4) and the existing registration→race rules
file; `raceSource`'s pattern for a non-engine fact on the race payload (all writers of `activeRace`, the entry's top
level, `toServerPayload`); the existing upload and pending queue (no new call, no new queue); the store's
check-then-create schema and immutability-trigger pattern; the identity store's `deletedIds` and the feed's
`applyFeedPage` (tests); `apiCall` and `SITE_MODE`. New: two small modules (deletedRacers.js 85 lines,
websiteRacers.js 64 lines) — no existing helper masked a name or validated an index list.

**Tests.** `server/src/website/deletedPlayer.integration.test.js` (6, the real app in website mode, then standalone):
the stored row, roster and id identical with and without the mapping; masking only after a `deleted` feed event
(and a resend writes nothing twice); two members named "Sam Same" in two races (one name twice in ONE race is refused,
shared/playerNames.mjs), only the deleted one masked; unknown member, out-of-roster index and another team not masked;
a race of a deleted member verifies identically (an engine-made race, a real replay); standalone stores no row and has
no route. Client: ResultScreen.website (4), raceHistory +2, raceFromRegistration +3, RegistrationPanel.website +1.
**Sabotage, each restored:** S1 the mapping folded into the stored record → 2 red (bytes, verify); S2 masking the
members NOT deleted → 4 red; S3 masking everyone once anyone is deleted → 1 red (same name); S4 the website-mode check
removed from the write → 1 red (standalone); S5 masking by rewriting the stored name → 3 red (incl. verify); S6 the
team filter removed → 1 red; C1 the hook asking in standalone → 1 red; C2 no mask applied → 1 red; C3 the entry always
carrying the field → 1 red; C4 every entry taken as a member → 2 red; C5 the panel not handing the entries over → 1 red.
The standalone panel test caught that the entries were handed over in every mode; they now go only in website mode.

**Forks decided.**
1. **The replay's race screen still draws the stored names.** The brief asks for "replay labels" masked AND for the
   replay to "look identical". The race screen draws the name at the sites listed in (a), every one in the engine
   hull, and the name tags' layout is measured from the text, so a longer "Deleted player" would move the picture.
   Kept as today, so the stored race and the hull are untouched. **What IS masked for a repeat:** the repeat carries the
   race's `websiteRacers` (same roster, same indexes), so its result screen, its history row and its stored mapping
   show "Deleted player" like the race it repeats. **Decided by the owner, 2026-11-11: a re-run race ("Run again")
   keeps drawing the stored names on the race screen — name tags, start board, standings, winner card; the result
   and the race history mask them. Not to be built.**
2. **The client asks every 15 s while a result or the history is open** (website mode, only for races on screen;
   the result screen only when its race had website members). The owner's look needs the result to change while it is
   open; the feed's fastest interval is 15 s.
3. **A repeat from a server row of ANOTHER device carries no mapping**: the server does not hand website ids out; this
   device carries them only for races it recorded. Its result is masked only if the original race's mapping is local.
4. **Export CSV keeps the stored names** (it exports this device's local history as it always did).
5. **Two members with one display name in one race cannot happen** — the race refuses one name twice — so the test
   puts them in two races.
6. **A name edited after taking the registration carries no id** (the mapping is by name at Start Race).

**Hygiene.** Lines before → after: raceHistory.js 266 → 277, raceFromRegistration.js 60 → 101, repeatRace.js 117 → 127,
RaceHistory.jsx 592 → 613, ResultScreen/index.jsx 491 → 502, RegistrationPanel.jsx 639 → 642, SetupScreen.jsx
1979 → 1999, racesApi.js 161 → 177, raceStore.js 728 → 790, routes/races.js 297 → 358; new deletedRacers.js 85,
websiteRacers.js 64. Nothing removed or moved out. Header comments on every touched file; API.md's races line
references re-read and updated in this commit. **Noticed, left:** client/src/services/racesApi.js's header still
describes only the POST of a race (it holds eight calls now); several BACKLOG entries cite line
numbers in races.js and raceStore.js that have drifted (dated records, left as written).

## End of the second chain (pieces 5 and 6)

**Verify, the diff of pieces 5 and 6 against `9b09c36e` (ONE run):** 22 passed, 2 failed, 14 skipped,
895 s. Neither failure was a fault of the code: `ceremony-counts` (SHIP-CEREMONY.md's generated counts —
the new `client/src/modules/deletedRacers.js` is one more module outside the hull, 89 → 90 and 32 → 33;
the hull stays 232) and, in `client-suite`, `DevScreen.website.test.jsx` timing out at vitest's 5 s
(the test imports the whole Dev Screen afresh; 2.8 s alone). Fixed in the commit after piece 6: the
counts regenerated (`gen-ceremony-costs.mjs --counts`; `--check-counts` green), and the test given
the 60 s the Dev Screen's other heavy tests got on 2026-10-18 (2/2 alone). Nothing else re-run.

## Piece 5a — the race's route file inside the website's proxy (third chain, 2026-11-11)

**No copy of Bingo was on this machine** (searched the usual folders for `websiteRoute.sh`; the two Seasonal
folders found are the bots, not the website or Bingo). Built from the website facts of the brief alone; nothing of
Bingo or the website was read, edited or cloned.

**What it does.** `deploy/website-route.sh` — ONE generator for both variants — renders the race's file for
/games/race and installs it in the website's routes folder: written 0600 (it carries the proxy secret, which the
proxy cannot read at run time; read from its own 0600 file, never printed), checked with the proxy's own check where
the proxy runs (`nginx -t` on the host / `caddy validate` in the website's Caddy container, via `--exec`), then
reloaded. A refused check removes the file, reloads again and exits non-zero with the reason (without the secret).
`remove` takes the file out and reloads. It never writes anything but its own file.
- *nginx:* `location = /games/race/auth/website` with `auth_request` to an internal location that proxies
  `/api/games/race/authorize` with the visitor's headers as they came (the website cookie kept), `auth_request_set`
  for the seven identity headers, the secret added; `location /games/race/` for everything else; `proxy_pass`
  with no URI part (the full path). The website cookie is stripped with `if`+`set` on a copy of the Cookie header
  (`map` is not allowed in an included server-level file). Every location sets its own forwarding headers, because a
  location with any `proxy_set_header` inherits none from the server block.
- *Caddy:* `handle /games/race/*` (not `handle_path`) with a `route` block, so the order is as written:
  client identity and secret removed, `forward_auth` on the sign-in path only (`copy_headers` of the seven), the
  secret on the sign-in path only, `reverse_proxy` with the website cookie cut out of `Cookie` by `header_up`.
  Without `route`, Caddy's default order runs `request_header` AFTER `forward_auth` and would delete the identity.

**Tests — real proxies** (`deploy/test/route-test.sh`, `route-check.mjs`, `route-fakes.mjs`; nginx 1.27.5-alpine and
Caddy 2.11.7, both pinned by digest; one variant per run, never both; every container `--cpus 1 --memory 256m`; 14
cores on this machine). A fake website (authorize: member / host / guest / 401) and a fake race that records what it
receives, behind the real proxy with a website-like main configuration that includes the routes folder.
**nginx 16/16, Caddy 16/16:** the race never receives the website cookie (plain path and sign-in; the race's own
`ra.sid` and `ra_join` kept); the full path is forwarded; the authorize call receives the website cookie; client-sent
X-Acting-* and secret cleared on a plain path, and on the sign-in as member and as guest (the website's identity only);
can-host from the website; no website session → the website's 401 and the race not asked; the secret only on the
sign-in (absent on four other paths, including `/games/race/auth/website/x` and `…/auth/websitex`); nothing outside
/games/race/ reaches the race (`/`, `/games/race`, `/games/racer/x`, `/games/`, `/api/games/race/authorize`,
`/gamesrace/`, `/x/games/race/`); a broken file refused, removed, the website still served, the secret not printed;
remove works.
**Sabotage, one per proof, per variant (changed copies of the generator; the repository file untouched) — 12 of 12 red:**
P1 no cookie strip → 1 red; P2 the authorize call without the cookie → 6 red; P3 client identity not cleared → 1 red;
P4 the secret on every path → 2 red; P5 the route widened to /games/ → 1 red; P6 no rollback → 1 red. Every ra-rt-*
container and the network removed after each run.

**Forks decided.** (1) File names `racearena.conf` / `racearena.caddy` — the website's include pattern is not in the
facts; the installer (5b) takes the extension of the files already in the routes folder when there are any.
(2) The secret sits in the route file (0600): neither proxy can read a separate file per request.
(3) A website cookie sent twice is stripped up to twice per name (a browser sends a name once).

## Piece 5b — the installer's second mode, "inside Seasonal Entertainment" (third chain, 2026-11-11)

**What it does.** `deploy/install.sh`, the same one command:
- **Which install:** with the website's markers on the server (`/etc/seasonal/site-local-port`,
  `games-sync-token`, `routes/`) it asks first "Install RaceArena inside it, under /games/race? [Y/n]";
  `--mode standalone|website` decides without asking. **Without the markers there is no question**, and the
  standalone run asks and does exactly what it did before (its functions are unchanged; Docker's install and the
  checkout step were MOVED out of `install_os` and `lay_out` unchanged so website mode can call them).
- **Website mode asks only the team** (Enter = "Seasonal Entertainment", OWNER-2) — no domain, no certificate e-mail,
  no first admin — then: detects the website (below), checks the race's subnet, installs Docker only if it is
  missing (no ufw, no fail2ban: the server is the website's), generates the proxy secret (0400, the app's uid,
  never printed), writes the settings (`RA_MODE=website`, `RA_BASE_PATH=/games/race`, `RA_PUBLIC_ORIGIN`,
  `RA_WEBSITE_TEAM`, the two secret-file paths, `RA_WEBSITE_TRUSTED_PROXIES` = the race's subnet,
  `RA_WEBSITE_FEED_URL`), stores the mode (`/etc/racearena/mode`) and `website.conf` (no secret), starts the
  app WITHOUT the race's Caddy and without 80/443, runs `racearena route install` (piece 5a), and installs the
  same backup and status timers. Backups stay the race's own.
- **`racearena`**: in website mode every compose call adds a generated overlay (`/etc/racearena/compose.website.yml`,
  rewritten from website.conf each time): the base path's health check, the secret and the sync-token copy mounted
  read-only, the network alias `racearena`, the race's own subnet, the website's network for the feed, and — nginx —
  `127.0.0.1:<port>:4000`. `start`/`update` refresh the sync-token copy (0400, the app's uid) from the website's
  root-only token; `up` starts the app only; health is the app's own check (no https through a Caddy of its own);
  Caddy mode connects the website's Caddy to the race's network. `status` names the mode and the route file's
  state (present, mode, equal to what this version writes). `route install|remove|status`. `uninstall` takes out
  only the race's route file (reloading the website's proxy), disconnects the website's Caddy, then the race's
  containers and network, timers and settings; data and backups kept, as today.

**How the proxy, the origin and the site's port are detected — fork, because no copy of Bingo's `website.sh` was on
this machine** (`install.sh` → `website_detect`; never guessed; what cannot be told stops with the flag to give):
- *proxy variant:* the extension of the OTHER games' files in `/etc/seasonal/routes/` (`.conf` → nginx,
  `.caddy` → Caddy); else nginx active on the host and no Caddy container mounting the routes folder, or the
  reverse; anything else → refuse, `--proxy nginx|caddy`. Caddy mode needs exactly one running Caddy container
  mounting `/etc/seasonal/routes` (its `--exec` for the check and reload).
- *the website's public origin:* **not detectable** from the facts (no marker carries it) → `--site-origin <url>`
  is REQUIRED in website mode; the install refuses without it.
- *the website's port:* `/etc/seasonal/site-local-port` (nginx: the authorize subrequest goes to
  `127.0.0.1:<that port>`; Caddy: `site:3800` from the facts).
- *how the race reaches the feed from inside its container:* the container answering as `site` on one of its
  networks → the race's app joins that network and uses `http://site:3800`; when there is none (a website not
  run as a container) → refuse, `--feed-url <url>`. A website on the host's loopback cannot be reached from a
  container by any address the installer could pick without guessing.
- *the race's subnet:* `172.30.250.0/24`, refused when any other Docker network uses it; `--subnet`.
- *nginx mode's local port:* the first free one in 3900–3999 (`ss`), kept across re-runs. Caddy mode publishes
  none (the website's Caddy reaches the container by name).
- *route file name:* `racearena.conf` / `racearena.caddy`, or the other games' extension.

**The stand-in as the site** (`scripts/website-standin.mjs --site`): the website ITSELF behind a real proxy —
authorize by its own `se.sid` cookie (member / host / admin / guest; none → 401), identity headers without the
secret, the feed, picking a member sets `se.sid`, and nothing forwarded to the race. +2 tests in
`standin.integration.test.js` (8/8).

**Tests.**
- *Website mode*, `deploy/test/e2e-website.sh` + `e2e-website-inner.sh`: a throwaway Ubuntu 24.04 machine
  (privileged container, systemd as init, its own Docker; `--cpus 6 --memory 6g`), fake markers, the stand-in as
  the website container `site`, the website's proxy over https (the race's session cookie is Secure and is set only
  on a request the proxy says came over https), the REAL `install.sh` cloning a bare copy of the repository
  (`RA_INSTALL_REPO_URL`, test-only), ref B = A + one docs line (throwaway, never pushed). One variant per run.
  **Caddy 30/30, nginx 29/29**, each start to finish: install and its layout (mode, route file 0600, secret and
  token copy 0400 uid 1000, no Caddy of the race, nothing on 80/443, nginx: 127.0.0.1 only / Caddy: no port and
  the website's Caddy on the race's network, trusted proxy = the subnet, no secret in the output); **a host signs in
  through the proxy (operator of the team) and a member signs in (the join page says "Join as Mia Member")**;
  backup; status (mode, route file current); update to B keeps the mode, the route file and the sign-in, and starts
  no Caddy of the race; uninstall: **every file of the fake website byte-identical** (sha256 of /etc/seasonal,
  the website's own config folder and /etc/nginx, before the install and after the uninstall), no container of the
  race left, the website still served, the race's path gone, data and backups kept.
- *How the website-mode test went, honestly:* it took seven nginx starts. Two lost to my own harness (a Git Bash path,
  then containerd's store on the container's overlay), one to plain http in the fake website, one to the member
  check asking `/me` (a member has no director account — piece 3a; the check now uses the join page), one to a
  literal `\n` my edit wrote into the certificate line, one to the image's nginx coming up despite being disabled
  (it held 443 in the Caddy variant), and one to the driver reusing a kept machine. **Not one was a defect in
  install.sh or racearena.** After the owner's question the harness became fail-fast (the first FAIL stops it and
  the machine can be kept for a look; `RA_E2E_ALL=1` runs everything) and the runs were watched line by line.

**Forks decided.** (1) the detection above; (2) `--site-origin` required (no marker); (3) `--feed-url` when the
website is not a container; (4) the race's app joins the website's network for the feed (a race-side compose
declaration; the website's network is not changed); (5) no ufw and no fail2ban in website mode (the website's
server); (6) the uninstall confirmation is the website's domain (from `RA_PUBLIC_ORIGIN`), as standalone types its
own; (7) `logs caddy` and `harden-ssh` stay standalone's; (8) the website-mode test is its own script beside
`e2e-local.sh`, so the standalone harness and its 79 checks are untouched; (9) `RA_INSTALL_REPO_URL` is a test
seam for the clone; on a server nothing sets it.

**Hygiene.** Lines before → after: install.sh 414 → 718, racearena 611 → 744, website-standin.mjs 207 → 274,
standin.integration.test.js 167 → 200, VPS-INSTALL.md 117 → 173, OPERATOR-GUIDE.md 566 → 572, DEPLOYMENT.md
692 → 695; new: e2e-website.sh 65, e2e-website-inner.sh 177 (and 5a's four files). Moved, not changed:
`install_docker` (out of `install_os`) and `clone_or_keep_checkout` (out of `lay_out`). Reused: `run`,
`write_file`, `secret_hex`, `install_timers`, `resolve_default_ref`/`checkout_ref`, racearena's `compose`,
`tool`, `wait_healthy`, `up_detached`, `cmd_backup`, `cmd_update`, the project's status and backup tools,
piece 5a's generator, the stand-in. Nothing removed. **Noticed, left:** `racearena`'s `caddy_local_ca` and the
https half of `ra-admin.mjs` are standalone-only and unused in website mode (correct, not dead).

## Where the code disagreed with the summary

- The account-changes feed's field names are not in the summary (piece 3b, fork 2): read tolerantly
  and to be confirmed against the website's real answer.

## Needs the owner's word

- ~~Whether the Dev Screen should hide *Change password* and *User management* in website mode~~ —
  decided 2026-11-11 (hide), built as piece 5.
- ~~Masking a deleted member's name in PAST races~~ — decided 2026-11-11 (a side table), built as piece 6.
- ~~Piece 6, fork 1: whether the race screen of a REPEAT should draw "Deleted player" too~~ — decided
  2026-11-11: it keeps the stored names; not to be built.
- The look at the end: "/" unchanged, and the "Website members only / Anyone with the link" choice.
