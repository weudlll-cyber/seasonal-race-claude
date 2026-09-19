# RaceArena — Setup Guide

**Owns:** getting RaceArena running locally — client, backend, ports, first sign-in, and the rules for restarting them. Deploying it to a public host is [DEPLOYMENT.md](DEPLOYMENT.md)'s. What every environment variable does, and what happens without it, is [ENVIRONMENT.md](ENVIRONMENT.md)'s.

## The one thing to know first

**The backend is not optional.** Every screen in RaceArena is behind a sign-in, and the account you
sign in with is created through the backend. Running the client on its own gets you a login screen
and no way past it — there is no offline or guest mode for a first-time visitor.

*(There is an offline hint, but it only appears for a browser that has signed in successfully before
and has since lost contact with the server. It cannot help a fresh install, which is why the older
version of this page — "without the backend you still get all 10 built-in tracks" — was wrong.)*

## Prerequisites

- Node.js 20+
- npm 10+
- Docker (for the backend; running it with plain `node` works too — see §5)

## 1. Clone

```bash
git clone https://github.com/weudlll-cyber/seasonal-race-claude.git
cd seasonal-race-claude
```

## 2. Build the client

```bash
cd client && npm install && npm run build && cd ..
```

## 3. Start the backend — which also serves the app

```bash
docker compose up -d
```

The app and the API are both at **`http://localhost:4000`**. One thing to start, one port.

If you skip step 2, the server still starts and serves the API; it logs one line saying it found no
client build, and `http://localhost:4000/` is a 404 until you build.

**REQUIRED ON A FIRST INSTALL: `docker-compose.override.yml`.** It is gitignored, so a fresh clone
does not have it — step 4 below creates it with `npm run configure`. **It is the only home of
`RA_BOOTSTRAP_TOKEN`**, and without that token `POST /api/auth/setup` answers `403` and the install
can never be signed into. It also holds `RA_SESSION_SECRET`; without one the server starts on a
random secret and prints `[auth] Using ephemeral dev session secret — sessions will not survive
restart`, and they will not: you sign in again after every `docker compose restart`.

★ **`docker-compose.override.yml.example` is NOT enough.** It carries only `RA_SESSION_SECRET` and
`RA_CLIENT_ORIGIN` — copying it leaves you with no bootstrap token. *(Corrected 2026-09-19,
INSTALL-DOCS-1: this paragraph read "Optional, and the server will tell you" and described only the
session-secret consequence. That was true until INSTALL-SECRETS-1 removed the shared token from
`docker-compose.yml` on 2026-09-08 and made this file the only source.)* **What each variable does, and what breaks without it, is
[ENVIRONMENT.md](ENVIRONMENT.md)'s and is not restated here.** *(Named as a step 2026-09-03,
PUBLISH-DOCS-1: this page walked a stranger through setup without mentioning the one file a fresh
clone does not have, and the consequence of skipping it was discoverable only from a startup log
line.)*

## 4. Create the first admin — once

There is no default login. `POST /api/auth/setup` creates the first account and it requires
`RA_BOOTSTRAP_TOKEN`. **Generate this install's own:**

```bash
npm run configure -- --origin=http://localhost:4000
docker compose up -d       # restart so the server reads them
```

It writes `RA_SESSION_SECRET` and `RA_BOOTSTRAP_TOKEN` into `docker-compose.override.yml`, unique per
install, and `RA_PUBLIC_ORIGIN` with the address you give it.

★ **`http://localhost:4000` is a valid answer and the prompt does not say so** — its examples are a
domain and a public IP, because that is what a deployment needs. Run bare it asks interactively;
**with no terminal and no `--origin` it refuses rather than guessing** (`configure.mjs:145`), which is
deliberate: "an unanswered question at install time is exactly how somebody ends up serving a package
that points at their own machine." Checked against `judgePublicOrigin`, which accepts
`http://localhost:4000` and `http://127.0.0.1:4000` and refuses a bare `localhost:4000` for having no
scheme.

★ **The secrets are never printed, deliberately** (`scripts/configure.mjs:103` — "a secret echoed to
a terminal is a secret in a scrollback buffer and in a screen recording"). They are written into
`docker-compose.override.yml`, and **that file is where you read them**:

```bash
grep RA_BOOTSTRAP_TOKEN docker-compose.override.yml

curl -X POST http://localhost:4000/api/auth/setup \
  -H 'Content-Type: application/json' \
  -H 'x-bootstrap-token: <the RA_BOOTSTRAP_TOKEN from docker-compose.override.yml>' \
  -d '{"username":"me","password":"choose-a-real-password"}'
```

★ **`npm run configure` never overwrites a value that is already there** (`configure.mjs:112`), so
re-running it on a live install cannot roll your session secret or your token.

*(Corrected 2026-09-19, INSTALL-DOCS-1: this step said `docker-compose.yml` "already sets it, so copy
the value from there". INSTALL-SECRETS-1 removed that shared token on 2026-09-08 — `docker-compose.yml:27`
records the removal — so following this page gave you a working server you could never sign into.)*

What you will see:

| response | meaning |
| --- | --- |
| `201` + your username | done — you are also signed in already |
| `409 setup already complete` | an admin already exists on this install. **This is checked first**, so once an install has an admin you get 409 whatever token you send — a wrong token does not report itself here. |
| `403 setup not available` | no admin exists yet, and either `RA_BOOTSTRAP_TOKEN` is unset **or** your token is wrong. **The two are deliberately indistinguishable** to the caller so the endpoint cannot be used to probe which; the server log distinguishes them for you. |

Then open `http://localhost:4000` and sign in.

## 5. The development loop

For hot reload, run the two halves separately:

```bash
docker compose up -d              # API on 4000
cd client && npm run dev          # app on 5173, pinned in client/vite.config.js
```

`http://localhost:5173` talks to the API on 4000. The account from §4 is the same one — sign in with
it there.

Running the backend without Docker works too. ★ **It needs the server's own dependencies installed**
— the Docker image installs them for you and nothing outside it does:

```bash
cd server && npm install && cd ..          # ONCE — nine runtime dependencies, incl. native
                                           # bcrypt and better-sqlite3
RA_SESSION_SECRET=... RA_BOOTSTRAP_TOKEN=... node server/src/index.js
```

and the variables are named in [ENVIRONMENT.md](ENVIRONMENT.md). *(Added 2026-09-19, INSTALL-DOCS-1:
no document said this, and both of this page's non-Docker paths need it — this one and `cd server &&
npm test` below.)*

## 6. Running the tests

```bash
npm install                  # ONCE, at the repository root — see below
cd client && npm install     # ONCE — the client's own dependencies
cd server && npm install     # ONCE — the server's own, nine of them

cd client && npm test        # the client suite
cd server && npm test        # the server suite
npm run verify               # the guards, routed by what you changed
```

★ **The browser suite needs a Chromium of its own**, downloaded once and not carried by any
`npm install`:

```bash
cd client && npx playwright install chromium
npm run test:e2e             # NIGHT WORK — about ten minutes; see docs/NIGHT-RUN.md for why it is
                             # deliberately outside CI and outside `npm run verify`
```

**The root `npm install` is not optional and this page did not say so until 2026-09-03
(PUBLISH-DOCS-1).** The repository root declares three dev dependencies — `acorn`, `pngjs` and
`sharp` — and `npm run verify` needs the first of them: `check-fingerprint-payload.mjs` PARSES the
hashed payload literal rather than matching text over it, and a guard that cannot parse says so and
fails rather than skipping. CI installs them for exactly this reason
(`.github/workflows/ci.yml`, *"Install the parser the payload guard needs"*). It also installs the
git hooks through the root `prepare` script — see [VERIFY-RULES.md](VERIFY-RULES.md) R12.

## 7. Working with the server

**Single-server rule:** only one server instance on port 4000 at a time. If you see `EADDRINUSE`,
kill the stale process and restart:

```bash
# Windows
taskkill /F /IM node.exe
docker compose up -d
```

**Restarting after changes:**

```bash
docker compose restart server   # server/src change — restart is enough
docker compose build            # package.json, Dockerfile, or a new client build — rebuild first
```

A **new client build** needs `docker compose build`, not just a restart: the build is copied into the
image at build time through a named build context (see [DEPLOYMENT.md](DEPLOYMENT.md)).

**Track JSON changes:** the server loads track JSON into an in-memory Map at startup. If you edit a
`.json` file under `server/data/tracks/` directly (e.g. restoring a backup), restart the server to
pick it up. The Track Editor saves through the API and needs no restart.

**Your accounts live in the data directory.** `server/data/` holds `users.json` and
`sessions.sqlite` beside the seeded tracks and images. **Deleting that directory to get clean
defaults deletes every account with it** — you would have to run §4 again.

## 8. Upgrading an install

*(Added 2026-09-19, INSTALL-DOCS-1: every piece of this existed and nothing put them in an order.)*

```bash
git pull
cd client && npm install && npm run build && cd ..   # the image COPIES a build, it never makes one
docker compose build                                 # package.json, Dockerfile or a new client build
docker compose up -d
```

**Your data is not touched.** `server/data/` is a volume mount, so a rebuild does not take it with
it, and shipped records come forward by VERSION rather than by wiping the store —
`server/src/seedDelivery.js` compares each unit against what this install already has and delivers
only what moved. **You do not need to delete anything to get new default tracks.**

**A `server/src` change alone needs only `docker compose restart server`**; §7 has the full rule.

## 9. Backing up

**`server/data/` is the only copy of your accounts and your races, and nothing backs it up.**
`server/data/README.md` says so in its own heading: it is gitignored, so it is not at origin, and on
a machine where it sits inside OneDrive, **OneDrive syncs rather than backs up — a deletion
propagates to the cloud exactly as faithfully as a new file does.**

```bash
npm run data:export          # writes a portable copy of the runtime store
```

**What is in there:** `users.json`, `sessions.sqlite`, `races.sqlite`, `setup-complete.json`, and the
tracks, backgrounds, brands and player groups — the seeded ones and the ones you made. Stopping the
server first is the safe way to take a copy of the SQLite files.

*(Added 2026-09-19, INSTALL-DOCS-1: `npm run data:export` existed and was named in no install-facing
document.)*

## 10. One-time migrations

**`node scripts/migrate-teams.mjs`** — the teams backfill (TEAMS-1). It puts every teamless user in
the founding team, acts on `users.json` through the shared store, and is idempotent: a user who
already has a team is skipped.

```bash
node scripts/migrate-teams.mjs --dry-run    # report what WOULD change, write nothing
node scripts/migrate-teams.mjs
```

★ **Run it with the server stopped**, or at minimum with no concurrent user writes — the store's lock
only covers a single process. *(Added 2026-09-19, INSTALL-DOCS-1: this script was documented in no
document at all; its own header is complete and was the only place it was written down.)*

---

_Phase 5 will add race-integrity, leaderboard, and Socket.IO multiplayer (separate server implementation)._
