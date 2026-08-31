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

## 4. Create the first admin — once

There is no default login. `POST /api/auth/setup` creates the first account and it requires
`RA_BOOTSTRAP_TOKEN`; for local use `docker-compose.yml` already sets it, so copy the value from
there:

```bash
curl -X POST http://localhost:4000/api/auth/setup \
  -H 'Content-Type: application/json' \
  -H 'x-bootstrap-token: <the RA_BOOTSTRAP_TOKEN from docker-compose.yml>' \
  -d '{"username":"me","password":"choose-a-real-password"}'
```

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

Running the backend without Docker works too, and needs the variables named in
[ENVIRONMENT.md](ENVIRONMENT.md):

```bash
RA_SESSION_SECRET=... RA_BOOTSTRAP_TOKEN=... node server/src/index.js
```

## 6. Running the tests

```bash
cd client && npm test        # the client suite
cd server && npm test        # the server suite
npm run verify               # the guards, routed by what you changed
```

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

---

_Phase 5 will add race-integrity, leaderboard, and Socket.IO multiplayer (separate server implementation)._
