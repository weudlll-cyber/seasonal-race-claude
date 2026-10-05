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
`node scripts/audit-bundle-address.mjs` fails a build that carries one.

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
| `RA_BIND_ADDRESS`  | `127.0.0.1`                     | The IP address the API listens on. Unset = every interface, as before. **Recommended `127.0.0.1` behind a reverse proxy.** Not an IP address → the server refuses to start. |
| `RA_BACKUP_DIR`    | `/var/backups/racearena`        | Where `npm run backup` writes and where `npm run status` looks for the newest backup. Read by those two commands only, never by the server. |

## Install, update and roll back — from a release download

**This is the one home for installing, updating and rolling back an install.** [SETUP.md](SETUP.md)
covers a developer's local machine, [DEPLOY-NOTES.md](DEPLOY-NOTES.md) what is still in the way of
"one command", and [README.md](../README.md) points here.

**Written for an operator who has never seen this project, and followed literally.** On 2026-10-01
(RELEASE-BASICS-1) every command below was run as printed, in a throwaway directory: an older
version installed, data created, updated to a newer one, rolled back. The data was checked intact
after each step. The run, and every place where following the text literally failed and what
was changed, are in
[reports/release/MORNING-RELEASE-1.md](../reports/release/MORNING-RELEASE-1.md). The commands are
POSIX shell. On Windows they run unchanged in Git Bash.

### What organizers on one installation share

**One installation is one shared space.** Every signed-in user sees and can change all tracks, brands,
player groups — **including the names of the people in them** — and racer types: the list routes
answer every caller with the whole collection (`server/src/routes/tracks.js:457`,
`server/src/routes/brands.js:160`, `server/src/routes/playerGroups.js:100`,
`server/src/routes/racers.js:125`). **An `admin` manages every user on the installation**, whatever
their team (`server/src/auth/guards.js:22-26`, `server/src/auth/usersRouter.js:21-24`). **Race lists are
per team**: a user sees only the races stored by their own team (`server/src/routes/races.js:121-131`).
Decided on 2026-10-01; there is no per-organizer separation beyond races.

### Test aids — off as an installation ships

**A new installation shows no developer aids.** One switch for the whole installation decides
whether they are there at all; it is stored on the server (`<data folder>/test-aids.json`, so a
backup carries it), and **it ships OFF**: with no file, or with a file that cannot be read, it is
OFF. The owner decided the design on 2026-10-04 (the numbered list is
[DEV-DISPLAYS-1](../reports/release/DEV-DISPLAYS-1.md)).

**Where an admin turns it on:** Dev Screen → chapter **Diagnostics and verification** → **Test aids**,
the first control of that chapter. Only an admin sees the chapter, and the server refuses anyone
else's change (`PUT /api/settings/test-aids`, [API.md](API.md)).

**While it is OFF, for everyone, whatever a browser has stored:**

- the race screen's build badge, settings badge and "Race Plan" pill, and the hero rings;
- the M-key camera marker;
- **Quick Test** on the setup screen;
- every diagnostic display and log (the Dev Screen's diagnostic and log switches are locked, with a
  line saying why) and the gap re-roll marker;
- the `?constSpeed=1` address flag (it changes the physics), the `/diagnose-verteilung` page, and the
  console probes (`?perfprobe=1`, `?viewerprobe=1`, `racearena:raceInputsProbe`,
  `racearena:holdProbe`).

**ON** brings all of them back exactly as they were. **Not on the switch:** the seed, race-key and
identifier tools on the setup screen are **admin-only whatever the switch says**; the camera-state
pill, click-to-skip during the countdown, the result screen's seed and stage, the gear to the Dev
Screen and the Track Editor's Test race are shown as before.

The browser tests (`client/e2e/`) and the measurement scripts that drive a browser turn the switch
ON for their own throwaway server first; on a real installation it stays as the admin leaves it.

### The layout: four places, and only one of them is replaced by an update

| what | the example path used below | what an update does to it |
| --- | --- | --- |
| the releases, **one directory per version** | `/opt/racearena/racearena-<version>` | adds a new directory beside the old one; the old one stays until you delete it |
| **the data** (`RA_DATA_DIR`) | `/var/lib/racearena/data` | nothing. Only the server and a restore write into it |
| **the backups** (`RA_BACKUP_DIR`) | `/var/backups/racearena` | gains one archive |
| **the settings file** | `/etc/racearena.env` | nothing |

★★ **Set `RA_DATA_DIR`. This is the step that makes an update safe.** Without it, the data lives
in `server/data` *inside the release directory*. The next version is unpacked into a new
directory, so it would start with no accounts and none of your tracks, and deleting the old release
directory would delete the data. Everything this install owns lives under that one directory:
accounts, sessions, stored races, uploaded sprites and logos, tracks, brands and player groups.
**Nothing outside it is yours.**

### What a release download is

A release is a tagged version of the repository. Its download is GitHub's source archive:
`https://github.com/weudlll-cyber/seasonal-race-claude/archive/<tag>.tar.gz`. A commit hash works
in place of `<tag>`. The archive contains the source and **no built client**, so step 3 builds one.
It needs **Node 20 or newer** (`engines` says `>=20`), `npm`, `curl` and `openssl`.

### Install

**1 · Choose the version and the places.** Every later step reads these variables, so run all
steps in one shell. If you change shells, set them again.

```sh
VERSION=<tag or commit>
RA_HOME=/opt/racearena
RA_ENV_FILE=/etc/racearena.env
```

**2 · Download and unpack.**

```sh
mkdir -p "$RA_HOME" && cd "$RA_HOME"
curl -fL -o "racearena-$VERSION.tar.gz" "https://github.com/weudlll-cyber/seasonal-race-claude/archive/$VERSION.tar.gz"
mkdir "racearena-$VERSION"
tar -xzf "racearena-$VERSION.tar.gz" -C "racearena-$VERSION" --strip-components=1
```

**3 · Install the dependencies in BOTH trees, and build the client.** They are two separate
installs. The server serves a built client; it does not build one.

```sh
cd "$RA_HOME/racearena-$VERSION"
npm ci --prefix server
npm ci --prefix client --include=dev
npm run build --prefix client
```

★ **`--include=dev` is not optional.** The client's build tool (`vite`) is a development
dependency. A shell that has loaded the settings file has `NODE_ENV=production`, and under that
`npm ci` silently skips development dependencies. The build then fails with `vite` not found, and
the server starts **without the app**. The literal run hit exactly this on the update, where the
settings file was already loaded.

**4 · Write the settings file, once.** It holds the session secret, so it is readable by its owner
only. The secret is generated once here, when the file is written; generating a new one on every
start would sign everybody out at every restart.

```sh
mkdir -p /var/lib/racearena/data /var/backups/racearena
cat > "$RA_ENV_FILE" <<EOF
NODE_ENV=production
PORT=4000
RA_BIND_ADDRESS=127.0.0.1
RA_PUBLIC_ORIGIN=https://racearena.example.com
RA_SESSION_SECRET=$(openssl rand -hex 32)
RA_COOKIE_SECURE=auto
RA_CSRF_STRICT=auto
RA_DATA_DIR=/var/lib/racearena/data
RA_BACKUP_DIR=/var/backups/racearena
EOF
chmod 600 "$RA_ENV_FILE"
```

- ★ **The paths in this block are the example places from the layout table, written out, not
  variables.** If you chose other places, change all four: the two directories in the `mkdir` line
  and the `RA_DATA_DIR` and `RA_BACKUP_DIR` lines. Every later step reads them from the settings file,
  so this is the only place they are typed. *(Found by PROBE-INSTALL-1, 2026-10-03.)*
- `RA_PUBLIC_ORIGIN` is the address your visitors type. `npm run configure` asks for it instead,
  but it writes a Docker override file, so on this path you write the line yourself.
- ★ **`RA_BIND_ADDRESS=127.0.0.1` is the recommended setting behind a reverse proxy** (nginx,
  Caddy). The API then answers only on this machine, so the proxy is the only way in. **Leave the
  line out if browsers reach the server directly on its port.** Unset, it listens on every
  interface, as it always has. It accepts an IP address only; anything else stops the server at
  start with a message naming the variable.
  ★ **Not inside a Docker container.** There the server must listen on the container's own
  interface for the published port to reach it, so `127.0.0.1` would make it unreachable. Leave
  the variable unset and publish `127.0.0.1:4000:4000` in your own `docker-compose.override.yml`
  instead ([DEPLOY-NOTES.md](DEPLOY-NOTES.md) §1).
- Every variable is described in [ENVIRONMENT.md](ENVIRONMENT.md).

**5 · Start it, the first time with a one-time setup token.**

```sh
cd "$RA_HOME/racearena-$VERSION"
set -a; . "$RA_ENV_FILE"; set +a
export RA_BOOTSTRAP_TOKEN="$(openssl rand -hex 16)"
node server/src/index.js &
```

**6 · Create the first admin.**

```sh
curl -X POST "$RA_PUBLIC_ORIGIN/api/auth/setup" \
  -H 'Content-Type: application/json' \
  -H "Origin: $RA_PUBLIC_ORIGIN" \
  -H "x-bootstrap-token: $RA_BOOTSTRAP_TOKEN" \
  -d '{"username":"admin","password":"<choose a strong one>"}'
```

★ **The `Origin` header is required.** With `NODE_ENV=production` the CSRF guard refuses a
request that names no origin, and answers `403 {"error":"origin required"}`. The earlier version
of this command omitted the header and failed exactly that way.

★ **If that address does not reach the server yet** — no proxy, or no name pointing at the machine —
send the same request to the server directly, `http://127.0.0.1:$PORT/api/auth/setup`, and keep the
`Origin` header exactly as it is (`$RA_PUBLIC_ORIGIN`). The guard checks the header, not the address
the request was sent to. *(Verified by PROBE-INSTALL-1, 2026-10-03: answered `201`.)*

**7 · Restart without the token, and from now on start it the same way every time.** Stop the
process from step 5, then:

```sh
unset RA_BOOTSTRAP_TOKEN
cd "$RA_HOME/racearena-$VERSION"
set -a; . "$RA_ENV_FILE"; set +a
node server/src/index.js
```

Run it under your process manager (a systemd unit, pm2, a Windows service) with **the release
directory as its working directory** and **the settings file as its environment**. A systemd
unit reads the file as `EnvironmentFile=/etc/racearena.env`. *(The process-manager setup was not
part of the literal run. Only the start command above was.)*

**8 · Check it.** Open the address and sign in. That one action uses the accounts file, the
session database and the built client. ★ **Open exactly the address in `RA_PUBLIC_ORIGIN`.** The
server tells the app to send every request there. The same server opened under another name —
its IP address, or `127.0.0.1` when the setting says `localhost` — loads the page and then reports
*"The server is not answering"*, and sign-in fails. *(Found by PROBE-INSTALL-1, 2026-10-03.)* Then:

```sh
cd "$RA_HOME/racearena-$VERSION"
set -a; . "$RA_ENV_FILE"; set +a
npm run status
```

Until the first backup exists, `npm run status` reports the backup check as FAIL. That is
expected. The backup section below fixes it.

### Backups, and the status check — schedule both

**Take a backup:**

```sh
cd "$RA_HOME/racearena-$VERSION"
set -a; . "$RA_ENV_FILE"; set +a
npm run backup
```

It writes one `racearena-backup-<UTC timestamp>.tar` into `RA_BACKUP_DIR`, and beside it a
`.tar.sha256` checksum file in the standard `sha256sum` format. `--out <dir>` names a
different directory for one run. **It works while the server is running.** It prints every item and
its size, and it **refuses rather than writing a half-archive** if anything is wrong. **It refuses
to write into the data directory**, because a copy beside the original is not a second copy.
Where the backups go is your choice. Point `RA_BACKUP_DIR` at a disk, mount or synced folder that
survives losing this one. Versions older than this command have the same tool as
`node scripts/backup.mjs --out "$RA_BACKUP_DIR"`, which still works.

★ **Check the archive afterwards.** It should be roughly the size of your data directory. If the
data directory is tens of megabytes and the backup is a few kilobytes, something went wrong. The
tool prints the totals so you can compare them.

★ **Check a copy before you rely on it.** Copy the `.sha256` file together with its archive. On
Linux, `sha256sum -c racearena-backup-<UTC timestamp>.tar.sha256`, run in the directory that holds
both, prints `OK` when the archive is unchanged. `npm run status` checks the newest one for you.

★ **Why you cannot simply copy the folder.** `sessions.sqlite` and `races.sqlite` are live
databases. A file copy taken while the server is writing can capture a half-finished transaction,
and the damaged file **looks perfectly normal** until the day you restore it. The tool copies
those two through SQLite's own online backup instead.

**Check the install:**

```sh
npm run status
```

Run it from the release directory with the settings loaded, as above. It prints one line per check
and **exits non-zero when any check fails**, so a scheduler can alert on the exit code:

| check | passes when | change it with |
| --- | --- | --- |
| `api` | `GET /api/health` answers `200` with `status: ok` | `--url <address>`. Default: `127.0.0.1` (or `RA_BIND_ADDRESS`) on `PORT` |
| `disk` | at least 1024 MB free where the data directory is | `--min-free-mb <n>` |
| `writable` | a probe file can be written into the data directory and removed | — |
| `backup` | the newest archive in `RA_BACKUP_DIR` is at most 26 hours old (daily, plus slack), and its `.sha256` checksum file is there and matches | `--backups <dir>`, `--max-backup-age-hours <n>` |

Exit code `0` = all passed, `1` = at least one failed, `2` = the command was misused. A backup's
age is read from its file name, not from the file date, so a copied archive still shows its real
age. Example schedule (cron). Replace `<version>` with the running release, and change it again
after every update:

```sh
15 3 * * *   cd /opt/racearena/racearena-<version> && set -a && . /etc/racearena.env && npm run --silent backup
*/10 * * * * cd /opt/racearena/racearena-<version> && set -a && . /etc/racearena.env && npm run --silent status || <your alert command>
```

### Update to a newer version

**Do these in order. Step 3's backup is what makes rolling back possible.**

**1 · Name both versions.** `OLD` is the directory that is running now.

```sh
OLD=<running version>
NEW=<new tag or commit>
RA_HOME=/opt/racearena
RA_ENV_FILE=/etc/racearena.env
```

**2 · Download, unpack, install and build `NEW` beside `OLD`.** Do install steps 2 and 3 with
`VERSION=$NEW`. The running install is not touched, so this can happen while it serves races.

```sh
VERSION=$NEW
```

**3 · Stop the service, then take the backup.** Taking it after the stop means nothing is written
between the backup and the switch.

```sh
cd "$RA_HOME/racearena-$OLD"
set -a; . "$RA_ENV_FILE"; set +a
node scripts/backup.mjs --out "$RA_BACKUP_DIR"
```

Note the archive name it prints. **Check it exists and is a sensible size.** Do not skip this
because the update looks small.

**4 · Run any pending migrations, with the NEW version's runner.**

```sh
cd "$RA_HOME/racearena-$NEW"
set -a; . "$RA_ENV_FILE"; set +a
node scripts/migrate.mjs
```

It applies every migration not yet recorded in `<data>/migrations.json` and refuses to run one
twice. `--dry-run` lists what it would do. See *The migration ledger* below.

**5 · Start `NEW`**, the same way as install step 7 but in the new directory. Point your process
manager and your cron lines at it.

**6 · Check it worked.** Sign in, and run `npm run status`. If sign-in works and every check passes,
the update landed. Keep the `OLD` directory until you are satisfied. It is the way back.

### Roll back a bad update

**1 · Stop `NEW`.**

**2 · Set the current data aside, and restore the backup from update step 3 into an EMPTY
directory.**

```sh
cd "$RA_HOME/racearena-$OLD"
set -a; . "$RA_ENV_FILE"; set +a
mv "$RA_DATA_DIR" "$RA_DATA_DIR.after-failed-update-$(date +%Y%m%d%H%M%S)"
node scripts/backup.mjs --restore "$RA_BACKUP_DIR/<the archive from update step 3>" --into "$RA_DATA_DIR"
```

★ **Why not restore over the current data with `--force`.** A restore writes the archive's files,
and it does not delete files the newer version created since, such as new migration-ledger entries
or newly delivered seed files. `--force` would leave `OLD` starting on a mix of both versions. An
empty directory holds exactly the backup. **The set-aside directory is not deleted.** Anything
created between the update and the rollback is in it, and is not in the restored data.

**3 · Start `OLD`**, as in install step 7, in the old directory. Sign in, and run `npm run status`.
A version older than the one that introduced them has no `npm run status` and ignores
`RA_BIND_ADDRESS`, so it listens on every interface again until you update. The literal run rolled
back to such a version.

**Moving to a different machine** is a backup on the old one and a restore into the empty
`RA_DATA_DIR` of a fresh install on the new one.

### The migration ledger — added 2026-09-24 (MIGRATION-LEDGER-1)

Every registered migration has a stable id (the teams backfill is `teams-1`). The runner
(`scripts/migrate.mjs`) reads `<dataRoot>/migrations.json` to see which ids are already recorded,
runs only the pending ones, appends each one to the ledger with a timestamp, and refuses to run
any id twice — the rule is stated in full in the file header.

The one existing migration, `scripts/migrate-teams.mjs`, still runs standalone; the runner calls
into the same `migrateTeams` function so there is one home for the work. **Running the standalone
script does NOT touch the ledger** — the next `node scripts/migrate.mjs` will see the state and
backfill the ledger without re-running.

---

## Behind a reverse proxy — a tested example (Caddy)

The server speaks plain HTTP. On a public address, put a proxy in front of it that speaks HTTPS and
passes requests on. This is one complete, tested configuration. `racearena.example.com` is a
placeholder: use your own name, and point it at the machine first.

**The proxy** — a `Caddyfile`:

```caddyfile
racearena.example.com {
	reverse_proxy 127.0.0.1:4000
}
```

Caddy obtains and renews the certificate for that name by itself. The port must be the server's
`PORT` (4000 unless you changed it).

**The server's settings** — in your settings file (install step 4), beside the others:

```sh
NODE_ENV=production
RA_BIND_ADDRESS=127.0.0.1
RA_PUBLIC_ORIGIN=https://racearena.example.com
```

- `RA_BIND_ADDRESS=127.0.0.1`: the server answers only on this machine, so the proxy is the only
  way in.
- `RA_PUBLIC_ORIGIN` is the **https** address, exactly as visitors type it.
- **Leave `RA_COOKIE_SECURE` unset.** In production it is on, and the server trusts the proxy's
  report that the visitor used https. The session cookie is then sent only over https, with the
  `__Host-` name prefix. The session lasts 30 days, as without a proxy.

**What was tested** (PROXY-PROBE-1, 2026-10-04, `reports/release/PROXY-PROBE-1.md`):
- the configuration above, with two changes: the site address was `127.0.0.1:8443` with `tls
  internal`, because a test has no public name;
- Caddy 2.11 ran in Docker, sharing the network of the app's container, so `RA_BIND_ADDRESS=127.0.0.1`
  meant exactly what it means on a host install. The app refused connections on its container's own
  address and answered on 127.0.0.1.
- Through the proxy: the first admin was created; sign-in set the cookie `Secure`, `HttpOnly`,
  `__Host-ra.sid`, valid for 30 days; one race was stored and read back by its short key; logout
  ended the session (the old cookie got 401).

★ **One thing that does not work:** reaching the proxy by a bare IP address from a program that sends
no server name (SNI), as Node does. Caddy then has no certificate to choose and ends the TLS
handshake. A browser on a real name never meets this; a test against an IP needs
`default_sni <that IP>` in Caddy's global options. *(Found by PROXY-PROBE-1.)*

## Docker

**The image builds the client itself.** The image's build context is **the repository root**
(`context: .` in `docker-compose.yml`), and `server/Dockerfile` has a first stage, `client-build`,
that installs and builds `client/` from it; the server stage copies the result
(`COPY --from=client-build`). *(Corrected 2026-10-04, PROBE-INSTALL-1 part 3: this said the build
came in through a named build context, `additional_contexts: { client: ./client }`. Neither exists
today — `docker compose build` from a fresh archive with no `client/dist` built the image.)*

*(Corrected 2026-09-03. This said the context is `./server` and that the named context avoids "moving
the build context to the repository root". IMAGE-STANDALONE-1 moved it to the root on 2026-09-01, so
the Dockerfile could reach `shared/nameLimits.mjs`; `server/Dockerfile`'s own header states it.)*

**Consequences worth knowing before you build:**

- **No client build is needed first.** The image makes its own. *(Corrected 2026-10-04: this said
  "run `npm run build` in `client/` first — the image copies a build, it does not make one".)*
- A manual build outside compose, **from the repository root**: `docker build -f server/Dockerfile .`
  *(Corrected 2026-10-04: the command carried `--build-context client=./client`, for the named
  context that no longer exists.)*
- The image **IS standalone**: `server/utils/` and `shared/nameLimits.mjs` are COPYed in
  (`server/Dockerfile:32` and `:42`), so it runs with no mounts and no repository beside it.
  *(Corrected 2026-09-03. This said the opposite — that both came from bind mounts and that closing
  it was "separate work" — and IMAGE-STANDALONE-1 and COPY-UTILS-1 closed it on 2026-09-01.
  `docker-compose.yml` already stated the property this denied: "run the image with no mounts at all
  and it works." Verified by running it: `docker run` with no mounts and no environment serves the app
  and answers the API — PUBLISH-STEPS-1.)*

**This section covers BUILDING the image, not running an install with it.** Running it needs two
decisions made elsewhere, and a stranger who stops here has neither:

- **The settings come from `docker-compose.override.yml`, which the repository does not ship.**
  Copy `docker-compose.override.yml.example` and set the session secret and the rest in it. What goes
  wrong without each value is in [DEPLOY-NOTES.md §3](DEPLOY-NOTES.md#3--the-config-file-that-must-exist-and-what-happens-without-it).
  A container started without it says so in its first lines.
- **`docker-compose.yml` publishes `4000:4000` on every interface.** Behind a proxy, close it in
  your own override file. [DEPLOY-NOTES.md §5](DEPLOY-NOTES.md#5---how-to-stand-this-up-without-leaving-a-door-open)
  explains why the shipped file leaves it open. ★ **Write it with `!override`** — `ports: !override`
  followed by `- "127.0.0.1:4000:4000"`. A plain `ports:` list in an override file is ADDED to the
  base file's, so the open `4000:4000` would stay. *(Found 2026-10-04, PROBE-INSTALL-1 part 3.)*
- **`docker-compose.yml` is a development setup, and it says so in what it does:** it bind-mounts
  `./server/src` (with `node --watch`), `./server/utils`, `./server/seeds` and `./server/data` from
  the folder it is started in. **Your data is therefore the folder `server/data` beside the compose
  file**, not a Docker volume, and it survives `docker compose down`.
- **Backups with this compose file run from the host**, because the image carries no `scripts/`:
  from the repository folder, `RA_DATA_DIR=server/data RA_BACKUP_DIR=<your backup folder> node
  scripts/backup.mjs`. The databases are copied online, so the container may keep running. To
  restore: `docker compose stop`, move `server/data` aside,
  `node scripts/backup.mjs --restore <archive> --into server/data`, then `docker compose start`.
  *(Run 2026-10-04, PROBE-INSTALL-1 part 3: the user and the stored race were back after the
  restore.)*

*(Added by PROBE-INSTALL-1, 2026-10-03: following this guide literally, `docker compose build`
succeeded and the image ran healthy with no mounts, but nothing here leads to the next step.)*

## Notes

- **Reverse proxy**: the tested configuration is [Behind a reverse proxy](#behind-a-reverse-proxy--a-tested-example-caddy)
  above. `NODE_ENV=production` makes the server trust the proxy's forwarded protocol, and with
  `RA_COOKIE_SECURE` unset the cookie is `Secure` — that is what was tested. `RA_COOKIE_SECURE=auto`
  (Express decides per request from the forwarded protocol) also exists; it was not part of the test.
  Set `RA_BIND_ADDRESS=127.0.0.1` so the proxy is the only way in (install step 4).
- **Session secret rotation**: changing `RA_SESSION_SECRET` invalidates all existing sessions
  (users are logged out). Plan rotations during maintenance windows.
- **The runtime store holds your accounts.** `users.json`, `sessions.sqlite` and the seeded tracks,
  backgrounds, brands and player groups all live in the same directory (`RA_DATA_DIR`, default
  `server/data`). **Deleting that directory to "get clean defaults" destroys every account on the
  install.** Back it up, and mount it as a volume so a container rebuild does not take it with it.
