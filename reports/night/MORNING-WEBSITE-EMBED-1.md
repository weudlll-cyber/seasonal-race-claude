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
| 3a — website sign-in | **done** — see below |
| 3b — account-changes feed | open |
| 4 — members join through the join page | open |
| end — verify, installer test, the owner's two addresses | open |

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

## Where the code disagreed with the summary

- (none yet)

## Needs the owner's word

- Whether the Dev Screen should hide *Change password* and *User management* in website mode (both
  answer "not found" there now).
- The look at the end: "/" unchanged, and the "Website members only / Anyone with the link" choice.
