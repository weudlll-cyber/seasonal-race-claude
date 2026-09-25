# RaceArena — Deployment Environment Guide

**Owns:** deploying RaceArena to a public same-origin host, and the environment variables that requires. Local development is [SETUP.md](SETUP.md)'s.

**How authentication BEHAVES — the first-admin channel, sessions, what is protected, and what the auth code does when a variable is absent — is [AUTH.md](AUTH.md)'s.**

**The complete variable list, including the ones this page does not need, is [ENVIRONMENT.md](ENVIRONMENT.md)'s.** What follows is the subset a public deployment requires.

## Public same-origin hosting

The Node.js server serves **both** the built SPA and the `/api/*` endpoints on a single address
(e.g. `https://racearena.example.com`). Browsers see one origin, so no CORS credentials dance is
needed. **One thing to start, one port.**

**This became true on 2026-09-01 (SERVE-SPA-1).** Before that date this document described the model
above while the server served no client at all and `GET /` was a 404 — so if you are reading an older
checkout, verify with `curl` before trusting the page.

### How the client is served, and what that means for the build

- The server serves `client/dist` if it is there, and mounts **above** the auth guards, so a visitor
  who is not signed in can still load the app that draws the sign-in form.
- A deep link (`/setup`, `/race/...`) returns the app shell so the client's router can take over.
- **No path under `/api/` is ever answered with the app's HTML.** An unknown API route answers as the
  API: `401` unauthenticated, `404 {"error":"no such API route: …"}` once signed in.
- A **missing asset** (anything whose last path segment has a file extension) returns 404 rather than
  the shell, so a stale `/assets/index-OLD.js` after a redeploy fails as a plain 404 instead of a
  MIME-type error.
- **With no build present the server starts anyway** and logs one line saying where it looked. The API
  is unaffected. A developer running the API alone is never blocked by a missing client build.

**You must build the client yourself before deploying:**

```sh
cd client && npm install && npm run build     # produces client/dist
```

**Do NOT set `VITE_API_URL`.** Since RUNTIME-API-URL-1 the built client carries **no address at
all** — the same build can be installed on any server, and the address is asked for at install time
instead. Setting `VITE_API_URL` bakes one back into the artefact and ties it to one host;
`node scripts/check-bundle-address.mjs` fails a build that carries one.

**Tell the install where it will be reached:**

```sh
npm run configure          # asks for the address; refuses to finish without one
```

That writes `RA_PUBLIC_ORIGIN` into `docker-compose.override.yml` (gitignored — this install's own).
Not using Docker? Set the same variable on the command line; the minimal start below does.

The server reads it when it **starts** and injects it into the `index.html` it serves, so changing
the address is a restart and never a rebuild. The same value is folded into the CORS allow-list, so
the client and the server cannot disagree about where this install is. **Set but malformed → the
server refuses to start**, naming what is wrong; unset → the client talks to `http://localhost:4000`
exactly as it always has.

### Required environment variables

| Variable            | Example value                   | Why                                                                                                                                                                                                                                                                                            |
| ------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`          | `production`                    | Enables Express production mode (trust-proxy, error sanitisation).                                                                                                                                                                                                                             |
| `RA_SESSION_SECRET` | `<64-char random string>`       | **Required in production** — the server refuses to start without it. Signs session cookies; rotating this invalidates all active sessions.                                                                                                                                                     |
| `RA_BOOTSTRAP_TOKEN`| `<random string>`               | **Required to create the first admin.** Without it `POST /api/auth/setup` answers `403 setup not available` and the install can never be signed into. See [AUTH.md](AUTH.md).                                                                                                                  |
| `RA_COOKIE_SECURE`  | `true` or `auto`                | Marks the session cookie `Secure` so it is only sent over HTTPS. Use `auto` to let Express infer from the trust-proxy setting; use `true` when you are certain HTTPS is always in use.                                                                                                        |
| `RA_CSRF_STRICT`    | `auto` or `true`                | Rejects mutating API requests that lack an `Origin` header (strict browser enforcement). `auto` enables strict when `NODE_ENV=production`; `true` forces it regardless of `NODE_ENV`.                                                                                                          |
| `RA_PUBLIC_ORIGIN`  | `https://racearena.example.com` | **The address this install is reached at — the one place it is written down.** Three consumers read this single value: the client is handed it at runtime (injected into the served `index.html`, so the build carries no address); it is folded into the CORS allow-list, so you need not repeat it in `RA_CLIENT_ORIGIN`; and the CSRF guard uses it as the canonical self-origin instead of deriving one from the `Host` header. **Set but malformed → the server refuses to start.** Set it with `npm run configure`. |

### Optional variables

| Variable           | Example value                   | Why                                                                                                                                            |
| ------------------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `RA_CLIENT_DIST`   | `/app/client-dist`              | Where the built client lives. Defaults to `client/dist` resolved relative to the server's own module, never to the working directory. The Docker image sets this because the build lands elsewhere inside the image. |
| `RA_CLIENT_ORIGIN` | `https://other.example.com`     | Only needed if the SPA is ever served from a **different** origin than the API (split hosting). **In the same-origin model above it is not required** — and unset means CORS is off, which is the correct and safest state for same-origin. |
| `RA_DATA_DIR`      | `/var/lib/racearena`            | Redirects the whole runtime store. **See the warning below.**                                                                                  |
| `PORT`             | `4000`                          | Listen port. Defaults to 4000.                                                                                                                 |

### Minimal production start

★ **BEFORE ANY OF THIS: install the dependencies.** This file assumed it and never said it —
corrected 2026-09-24. You need **Node 20 or newer** (`engines` says `>=20`; verified on 24.14.0) and
`openssl`, which a default Windows box does not have.

```sh
npm ci --prefix server
npm ci --prefix client
cd client && npm run build && cd ..
```

★ **EXPORT the token — do not prefix it.** Corrected 2026-09-24: this block used to set
`RA_BOOTSTRAP_TOKEN` as a per-command prefix to `node`, and the `curl` below then referenced
`$RA_BOOTSTRAP_TOKEN` in a **fresh shell where it is empty**, so the setup call as printed sent an
empty token and returned 403. Export it first, so both commands see the same value:

```sh
export RA_BOOTSTRAP_TOKEN="$(openssl rand -hex 16)"

NODE_ENV=production \
RA_SESSION_SECRET="$(openssl rand -hex 32)" \
RA_COOKIE_SECURE=auto \
RA_CSRF_STRICT=auto \
RA_PUBLIC_ORIGIN=https://racearena.example.com \
node server/src/index.js
```

Then create the first admin once, and unset `RA_BOOTSTRAP_TOKEN` afterwards:

```sh
curl -X POST https://racearena.example.com/api/auth/setup \
  -H 'Content-Type: application/json' \
  -H "x-bootstrap-token: $RA_BOOTSTRAP_TOKEN" \
  -d '{"username":"...","password":"..."}'
```

## Backing up, and upgrading

**Written for someone who has never seen this project, in the order they will actually do it.**

### Where the data is

**Everything this install owns lives under ONE directory**: `RA_DATA_DIR`, which defaults to
`server/data`. Accounts, sessions, stored races, uploaded sprites and logos, tracks, brands and
player groups are all under it. **Nothing outside it is yours** — the rest of the checkout is code
and shipped defaults. **Deleting that directory to "get clean defaults" destroys every account on
the install.**

### Taking a backup

```sh
node scripts/backup.mjs --out /somewhere/outside/the/data/dir
```

**It works while the server is running** — you do not have to stop the service. It writes one
`.tar` named `racearena-backup-<UTC timestamp>.tar`, prints every item and its size, and **refuses
rather than writing a half-archive** if anything is wrong.

★ **Check the archive afterwards.** It should be roughly the size of your data directory. A backup
of a few kilobytes when the data directory is tens of megabytes means something went wrong, and the
tool prints the totals so you can compare them.

★ **Why you cannot simply copy the folder.** `sessions.sqlite` and `races.sqlite` are live
databases. A file copy taken while the server is writing can capture a half-finished transaction,
and the damaged file **looks perfectly normal** until the day you restore it. The tool copies those
two through SQLite's own online backup instead. Copy the folder by hand and you may be keeping
something that cannot be restored.

### Restoring

```sh
node scripts/backup.mjs --restore /path/to/racearena-backup-<stamp>.tar --into /path/to/data
```

Stop the server first. The target must be empty, or pass `--force` to write into it anyway.

### Upgrading to a new version

**Do these in order. Step 1 is what makes step 8 possible.**

1. **Take a backup**, as above, and **check the archive exists and is a sensible size**. Do not skip
   this because the upgrade looks small.
2. **Stop the service.** `docker compose down`, or stop the `node` process.
3. **Fetch the new version** — `git pull`, or pull the new image.
4. **Install dependencies in BOTH trees.** They are separate installs and skipping either leaves a
   half-upgraded install:
   ```sh
   npm ci --prefix server
   npm ci --prefix client
   ```
5. **Rebuild the client.** The server serves a built client; it does not build one.
   ```sh
   npm run build --prefix client
   ```
6. ★ **Carry the data across, and let the command tell you how much there is.**
   `npm run data:export` is what moves `server/data/` to the new host. **Do not plan from a
   remembered figure** — an earlier snapshot of this owner's machine read 247 files / 14.4 MB
   differing from `server/seeds/`, with a further 12 files / 51.7 MB byte-identical to the seeds and
   therefore not needing to travel at all. Those numbers move whenever he edits a track or uploads a
   background; the command re-measures them on the day, which is why they are not written down as a
   target. *(Moved here 2026-09-25 from an open backlog row — a procedure belongs in the procedure.)*

7. **Run any pending migrations** — one command:
   ```sh
   node scripts/migrate.mjs
   ```
   The runner reads `<dataRoot>/migrations.json`, applies every id that is not already recorded,
   and refuses to run any migration twice. `--dry-run` lists what it would do; `--status` prints
   the state of every registered migration. On an instance that ran `migrate-teams.mjs` before
   this runner existed, the observable-state probe backfills the ledger without re-running the
   migration — see the file header for the exact rule.
7. **Start, and check it worked.** Start the server, then **sign in**. That is the one check worth
   making: it exercises the accounts file, the session database and the built client in one action.
   If sign-in works, the upgrade landed.
8. **★ IF IT DID NOT WORK, GO BACK.** Stop the service, restore the backup from step 1 into the data
   directory, check out the previous version, reinstall and rebuild as in steps 4–5, and start it.
   **An upgrade procedure without a way back is a one-way door**, which is why step 1 is not
   optional.

### THE MIGRATION LEDGER — added 2026-09-24 (MIGRATION-LEDGER-1)

Every registered migration has a stable id (the teams backfill is `teams-1`). The runner
(`scripts/migrate.mjs`) reads `<dataRoot>/migrations.json` to see which ids are already recorded,
runs only the pending ones, appends each one to the ledger with a timestamp, and refuses to run
any id twice — the rule is stated in full in the file header.

The one existing migration, `scripts/migrate-teams.mjs`, still runs standalone; the runner calls
into the same `migrateTeams` function so there is one home for the work. **Running the standalone
script does NOT touch the ledger** — the next `node scripts/migrate.mjs` will see the state and
backfill the ledger without re-running.

---

## Docker

`docker compose build` supplies the client build to the image through a **named build context**. The
image's build context is **the repository root** (`context: .` in `docker-compose.yml`), and
`client/dist` is a BUILD ARTEFACT rather than source — the root `.dockerignore` is an allow-list of
source — so `additional_contexts: { client: ./client }` keeps it an explicit input rather than
something that must happen to be lying in the tree.

*(Corrected 2026-09-03. This said the context is `./server` and that the named context avoids "moving
the build context to the repository root". IMAGE-STANDALONE-1 moved it to the root on 2026-09-01, so
the Dockerfile could reach `shared/nameLimits.mjs`; `server/Dockerfile`'s own header states it.)*

**Consequences worth knowing before you build:**

- **Run `npm run build` in `client/` first.** The image copies a build, it does not make one. Without
  it the build fails on the missing `dist/`.
- A manual build outside compose needs the context by hand, **from the repository root**:
  `docker build --build-context client=./client -f server/Dockerfile .`
  *(Corrected 2026-09-03: the old command ended `./server`, which builds the wrong context since
  IMAGE-STANDALONE-1 moved it to the root.)*
- The image **IS standalone**: `server/utils/` and `shared/nameLimits.mjs` are COPYed in
  (`server/Dockerfile:32` and `:42`), so it runs with no mounts and no repository beside it.
  *(Corrected 2026-09-03. This said the opposite — that both came from bind mounts and that closing
  it was "separate work" — and IMAGE-STANDALONE-1 and COPY-UTILS-1 closed it on 2026-09-01.
  `docker-compose.yml` already stated the property this denied: "run the image with no mounts at all
  and it works." Verified by running it: `docker run` with no mounts and no environment serves the app
  and answers the API — PUBLISH-STEPS-1.)*

## Notes

- **Reverse proxy**: if sitting behind nginx/Caddy, ensure `trust proxy` is honoured
  (`NODE_ENV=production` enables it). Set `RA_COOKIE_SECURE=auto` so Express reads the
  forwarded protocol rather than guessing.
- **Session secret rotation**: changing `RA_SESSION_SECRET` invalidates all existing sessions
  (users are logged out). Plan rotations during maintenance windows.
- **The runtime store holds your accounts.** `users.json`, `sessions.sqlite` and the seeded tracks,
  backgrounds, brands and player groups all live in the same directory (`RA_DATA_DIR`, default
  `server/data`). **Deleting that directory to "get clean defaults" destroys every account on the
  install.** Back it up, and mount it as a volume so a container rebuild does not take it with it.
