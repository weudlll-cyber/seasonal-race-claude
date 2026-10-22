# RaceArena — the operator guide

**Owns:** the day-to-day running of a RaceArena server, task by task, for the person who runs it
(not a developer). It names the command for each task on each install path and points at
[DEPLOYMENT.md](DEPLOYMENT.md) for the detail instead of repeating it.

**Written 2026-10-09 against `master` at `290e6db3`; extended 2026-10-18 against `master` at
`7b64d920`** (*Watching it from outside*, *Learning about new versions*, *Several organisers on one
install*, each with the file and line it was checked against). Where this page and the code disagree,
the code is right and this page is a bug.

## The three install paths, and how this page marks them

| path | what it is | where it is documented | state |
| --- | --- | --- | --- |
| **Node** | the server run directly with `node`, from a release download, under your own process manager | [DEPLOYMENT.md](DEPLOYMENT.md), *Install, update and roll back* | on `master` |
| **Docker** | the shipped `docker-compose.yml` in a checkout of the repository | [DEPLOYMENT.md](DEPLOYMENT.md), *Docker* | on `master`; the compose file is a development setup, and DEPLOYMENT.md says so |
| **VPS install** | one command on a rented Ubuntu or Debian server, then the `racearena` helper | `docs/VPS-INSTALL.md` **on branch `feat/vps-install` only** | ★ **NOT MERGED.** Every `racearena` command below is marked *VPS install (branch feat/vps-install, not yet merged)* and does not exist on a `master` install |

Commands for the Node path assume the layout and the variable names DEPLOYMENT.md uses: the release
directory `$RA_HOME/racearena-<version>`, the settings file `$RA_ENV_FILE`, and the settings loaded
into the shell with `set -a; . "$RA_ENV_FILE"; set +a`. Commands for the Docker path run in the
folder that holds `docker-compose.yml`, whose service is called `server`.

---

## 1. What the server is, and where its data lives

**One Node.js process serves both the app and its API on one port.** The race itself is computed in
the visitor's browser; the server signs people in and stores what has to outlive a browser:
accounts and sessions, tracks and their pictures, racer types and sprites, brands and logos, player
groups, settings, and every finished race. There is no central service; nothing leaves the machine
unless you move it ([PRIVACY-FACTS.md](PRIVACY-FACTS.md)).

**All of it lives in one folder, the data folder.** Back up that folder and you have backed up the
install. What is in it:

| file or folder | what it holds |
| --- | --- |
| `users.json` | accounts: user name, team, role and a password hash |
| `sessions.sqlite` | who is signed in |
| `races.sqlite` | every stored race |
| `registrations.sqlite` | player registrations and the names players registered with, until a director deletes the registration |
| `tracks/`, `backgrounds/`, `tracks-backups/` | tracks, their pictures, and the newest copies of each track |
| `racers/`, `racer-sprites/`, `brands/`, `brand-logos/`, `player-groups/` | racer types, brands and player groups |
| `surface-classes/`, `period-points-rule.json` | custom surface classes, and the period evaluation's points rule |
| `test-aids.json`, `legal-pages.json`, `migrations.json`, `recover-admin-audit.log` | the test-aids switch, your legal notice and privacy policy, which data migrations ran, and every admin recovery |

| path | the data folder | the backups | the settings |
| --- | --- | --- | --- |
| Node | `RA_DATA_DIR` (DEPLOYMENT.md's example: `/var/lib/racearena/data`) | `RA_BACKUP_DIR` | the settings file, `chmod 600` |
| Docker | `server/data` beside `docker-compose.yml` (a bind mount, not a Docker volume) | wherever you point the backup command | `docker-compose.override.yml`, written by `npm run configure` |
| VPS install (branch feat/vps-install, not yet merged) | `/var/lib/racearena` | `/var/backups/racearena` | `/etc/racearena/racearena.env` (root only) |

★ **On the Node path, set `RA_DATA_DIR`.** Without it the data lives inside the release directory and
the next version starts empty (DEPLOYMENT.md, *The layout*).

★ **Deleting the data folder deletes every account.** There is no "reset to clean defaults" that keeps
the accounts.

**The Dev Screen's "Backup and reset" chapter is not a server backup.** Its *Export Settings JSON*,
*Import Settings JSON* and *Factory Reset* act on the settings stored in that one browser.

---

## 2. Daily operation

### Is it healthy?

| path | command |
| --- | --- |
| Node | `npm run status`, from the release directory with the settings loaded |
| Docker | `curl -s http://127.0.0.1:4000/api/health` for the API alone; `docker compose ps` shows the container's own health check |
| VPS install (branch feat/vps-install, not yet merged) | `racearena status` |

`npm run status` checks four things and exits non-zero when one fails, so a scheduler can alert on
it: the API answers, there is free disk at the data folder, the data folder is writable, and the
newest backup is recent and matches its checksum. Until the first backup exists the backup check
fails; that is expected. The table of checks and how to change their limits is DEPLOYMENT.md's,
*Backups, and the status check*. `racearena status` runs the same check and adds both containers,
HTTPS through Caddy, and the alerts of the last day.

★ **"Healthy" does not mean "you can sign in".** With a damaged `users.json` the health route still
answers `ok` while sign-in fails (§6). After any repair, sign in once to be sure.

### Watching it from outside

**Point any uptime checker at `https://<your domain>/api/health`.** The route needs no sign-in: it is
on the public allow-list (`server/src/auth/guards.js` → `PUBLIC_PATHS`) and is mounted in
`server/src/app.js` → `GET /api/health`; its handler is `server/src/health.js` → `createHealthHandler`.

| answer | what it means |
| --- | --- |
| `200`, body `{ "status": "ok", "timestamp": …, "build": … }` | the server runs and the account store can be read (`server/src/health.js`); `build` names the version running |
| `503`, body `{ "status": "error", …, "problems": [{ "store": "users", … }] }` | the server runs but **the account store (`users.json`) cannot be read, so nobody can sign in** (`server/src/health.js` → `healthProblems`, `createHealthHandler`); see §6, *A damaged data file* |
| no answer, a timeout, or a proxy error page | the server, the proxy or the machine is down or unreachable |

★ **`GET` or `HEAD`, either works.** A `HEAD` request to the same address gets the same status with
no body — the allow-list judges `HEAD` as `GET` (`server/src/auth/guards.js` → `matchesPublicPath`), so a checker
that sends `HEAD` unless told otherwise sees a healthy server as healthy. `GET` also shows the body,
which names the version running.

★ **The route checks less than `npm run status`.** It does not look at free disk, at whether the data
folder is writable, or at backups — a full disk still answers `200` (§6, *The disk is full*). The
outside check tells you the server answers; the status check on the machine tells you it is well.

**A check every 1 to 5 minutes is a reasonable interval.** That is a suggestion, not a measured
figure; per request the route reads the account store and names the build, and logs nothing
(`server/src/health.js` → its header comment). The Docker image's own health check asks it every 30 seconds
(`server/Dockerfile:230`).

**On the VPS install (branch feat/vps-install, not yet merged)** a timer runs the status check every
10 minutes (`deploy/systemd/racearena-status.timer:7` on that branch) and alerts by e-mail or in the
system journal (`racearena alert`, `deploy/racearena:534-550` on that branch). **It does not replace
an outside check:** it runs on the same machine, so when that machine is down, out of memory or cut
off from the network, nothing is left to send the alert. Use both.

### The logs

| path | command |
| --- | --- |
| Node | wherever your process manager puts the process's output (for example `journalctl -u <your unit>` for a systemd unit) |
| Docker | `docker compose logs server` (add `-f` to follow); the shipped compose file rotates the log at 10 MB, five files |
| VPS install (branch feat/vps-install, not yet merged) | `racearena logs app`, `racearena logs caddy`, `-f` to follow; each rotates at 10 MB, five files |

**What the server writes:** start-up lines that say what this install cannot do yet (no setup token,
sign-in travelling unencrypted, no client build to serve) and how to fix it; warnings that name a user
name or user id (a rejected race, a wrong current password, a user without a team). **It never logs a
password, a token, a secret, a request body or an IP address** (audit section A11, in
[AUDIT-1.md](../reports/release/AUDIT-1.md)). It writes nothing per request.

### Backups

| path | take one now | schedule it |
| --- | --- | --- |
| Node | `npm run backup` (writes into `RA_BACKUP_DIR`) | a cron line, DEPLOYMENT.md, *Backups, and the status check* |
| Docker | once: `npm ci --prefix server`; then `RA_DATA_DIR=server/data RA_BACKUP_DIR=<your backup folder> node scripts/backup.mjs` | your own scheduler; nothing is shipped for it |
| VPS install (branch feat/vps-install, not yet merged) | `racearena backup` | already scheduled: daily, archives older than 14 days are deleted |

Each backup is one `racearena-backup-<UTC time>.tar` with a `.tar.sha256` checksum file beside it.
**It works while the server runs**, copies the two databases safely, refuses rather than write half an
archive, and refuses to write into the data folder. Archives are readable by their owner only.

★ **Check the size.** An archive should be roughly the size of the data folder. A few kilobytes for a
data folder of tens of megabytes means something went wrong; the tool prints the totals.

★ **Never copy the data folder by hand as a backup.** A copy of a live database can be damaged in a
way that looks normal until the day you restore it (DEPLOYMENT.md explains why).

★ **On the Node and Docker paths nothing deletes old archives.** They grow until you delete them.

### Copying backups off the server

**A backup on the same disk is lost with the disk.** Copy each archive **together with its
`.sha256` file** to another machine or to storage you rent. The project prescribes no destination.
Any copy tool works, for example from another machine:

```sh
scp '<user>@<server>:/var/backups/racearena/racearena-backup-*' <local folder>/
```

Then, in the folder that holds both files: `sha256sum -c racearena-backup-<UTC time>.tar.sha256`
prints `OK` when the copy is intact. Neither path ships an automatic off-server copy; on the VPS
install it is an open item on the branch, not a feature.

### Restore

A restore puts a whole archive back into an **empty** data folder. The current data is set aside, not
deleted.

| path | command |
| --- | --- |
| Node | stop the server; `mv "$RA_DATA_DIR" "$RA_DATA_DIR.before-restore-$(date +%Y%m%d%H%M%S)"`; `node scripts/backup.mjs --restore <archive> --into "$RA_DATA_DIR"`; start the server; sign in; `npm run status` |
| Docker | `docker compose stop`; move `server/data` aside; `node scripts/backup.mjs --restore <archive> --into server/data`; `docker compose start`. *Run on 2026-10-04 (DEPLOYMENT.md). Since 2026-10-08 restored files are readable by their owner only; on a Linux host whose account is not the container's user (uid 1000) the container may then be unable to read them — not tested* |
| VPS install (branch feat/vps-install, not yet merged) | `racearena restore <archive name>` — checks the checksum, stops the app, moves the data aside, restores, starts and checks health |

★ **Do not restore over existing data with `--force`** unless you mean to: it leaves files that are
not in the archive in place (DEPLOYMENT.md, *Roll back a bad update*).

**Moving to another machine** is a backup on the old one and a restore into the empty data folder of a
fresh install on the new one.

### Legal pages and the source-code link

The sign-in screen, the setup screen and the public join page of a player registration carry a slim
footer bar fixed to the bottom of the window, so it is visible without scrolling (not on the race
screen). **"Source code" is always there**; **"Legal
notice" and "Privacy policy" appear only once you have filled them in.** Both pages are public — a
visitor reads them at `/legal-notice` and `/privacy` without signing in.

**Filling them in (admins).** Dev Screen → *Accounts and system* → *Legal pages*. Write each text as
plain text; line breaks are kept and nothing is read as markup. Each field has an **Insert
template** button that fills it with a country-neutral template (it asks first when the field
already holds text, and it does not save); replace every bracketed part with your details, delete
what does not apply, then press **Save legal pages**. The privacy-policy template (since 2026-10-18)
is written from what this application actually stores, as listed in
[PRIVACY-FACTS.md](PRIVACY-FACTS.md); what your hosting or proxy logs, and how long you keep
backups, only you can fill in. Leaving a field empty removes its link. The texts are stored on the server in `legal-pages.json` in the data folder, so every
backup carries them.

★ **You, the operator, are responsible for what the pages say.** Which details a legal notice and a
privacy policy must contain depends on the country you operate from — some require a legal notice,
others do not. Check what applies to you; the templates are a starting point, not legal advice.

**Where "Source code" points.** The game is free software under the GNU AGPL-3.0-or-later, so
everyone who uses it is offered its source. By default the link opens the upstream repository at
the commit the app was built from (the repository's front page when the build names no commit, and
the link says so). **If you run a modified copy, set `RA_SOURCE_URL` to the address of your own
source** ([ENVIRONMENT.md](ENVIRONMENT.md)); a value that is not an http(s) address stops the start.

### Player registration

A second way to fill a race (since 2026-10-21, REGISTRATION-1): instead of typing the names, a
director opens a **registration** and the players add their own names from their phones.

**How it works.**

1. Setup screen → *Players* tab → **Player registration** → *Open a registration*. Choose the track,
   how long registration stays open (1 min, 5 min, 15 min, 1 hour, 1 day, 3 days, 7 days, or
   *Until…* a date and time of your own — at least 1 minute, at most 30 days; under the field it
   says when it will close, "Closes Thu 22 Oct, 19:45 (in 1 day 2 h)", or why a time cannot be used)
   and, if you like, an event name. **The number of places is the track's own player limit**, the
   same number the Players tab allows; it is fixed when you open.
2. Share the **join link**: **Copy link**, or the **QR code** — **Copy QR code** puts it on the
   clipboard as a picture (to paste into Telegram or Discord; a browser that cannot copy pictures says
   so), **Download QR** saves it as a PNG file, and **Show QR full screen** fills the screen for a
   projector or TV (with the same two buttons).
3. While it is open you see the names arrive (the list updates every few seconds), can **remove** a
   name (✕), **close it now** or **extend** it (later, at most 30 days after you opened it). Nobody can
   register once every place is taken.
   **Coming back:** your registrations are numbered cards under *Your registrations*, open ones first
   and highlighted. While one is open, the Players tab opens on it after a reload (on the list, if
   several are open); **Back to all registrations** returns to the list.
4. It closes by itself at the deadline — the server decides by its own clock, also when nobody has
   the page open or the server was restarted in between. A closed registration stays closed.
5. **Use these players** puts the registered names into the Players tab and selects the track, then
   you start the race as usual. Nothing starts by itself.
6. **Delete registration** when you are done: the names are kept until you do (see
   [PRIVACY-FACTS.md](PRIVACY-FACTS.md)).

**The public page.** The link opens `/join/<code>` — no sign-in, made for a phone. A player sees the
event, the track, the places left and a countdown, types a name and presses *Join*, and is told
"You're in! You are number N of M." The same name twice is refused (capitals and extra spaces do not
make a name different), and so is a second name from the same phone. The link is the only thing a
player needs; the code in it cannot be guessed. The page never shows the other players' names. Its
footer carries your legal pages like the sign-in screen does.

**At the venue.** All phones on the venue's Wi-Fi may share one internet address; the join page allows
60 attempts a minute per address, enough for a room registering at once. The players' phones must
reach your server's address — a server only on `localhost` cannot be joined from a phone.

**An external site with its own players** (optional): set `RA_INTEGRATION_KEY` and that site can add
its signed-in players to an open registration through a documented interface,
[INTEGRATIONS.md](INTEGRATIONS.md). Without it the route does not exist, and nothing else changes —
the game never needs such a site.

The registrations live in `registrations.sqlite` in the data folder; every backup carries them.

---

## 3. Updates and rollback

| path | update | roll back |
| --- | --- | --- |
| Node | DEPLOYMENT.md, *Update to a newer version*: unpack and build the new version beside the old one, stop, back up, run `node scripts/migrate.mjs` from the NEW version, start the new one, check | DEPLOYMENT.md, *Roll back a bad update*: stop, set the data aside, restore the backup taken before the update into an empty folder, start the OLD version |
| Docker | DEPLOYMENT.md, *Update and roll back with Docker*: back up (§2); `docker compose stop` **before** changing the checkout; `git checkout` the new version; `npm ci --prefix server`; `RA_DATA_DIR=server/data node scripts/migrate.mjs`; `docker compose build`; `docker compose up -d`; check. *Run as a whole on 2026-10-18 with throwaway data* | the same section: stop; `git checkout` the previous version; set `server/data` aside; restore the backup taken before the update into an empty `server/data` (§2); `docker compose build`; `docker compose up -d`; check. *Run as a whole on 2026-10-18 with throwaway data* |
| VPS install (branch feat/vps-install, not yet merged) | `racearena update [tag]` — a backup first, then build, migrations, start and a health check; if the app is not healthy within two minutes it goes back by itself | `racearena rollback` — back to the version before the last update and the backup taken just before it; the newer data is moved aside, not deleted |

★ **Keep the backup taken just before an update until you are sure.** It is the way back.

★ **Without a tag, `racearena update` installs the newest release tag, and none exists yet** (no
`v1.0.0`). Until one does, name a tag, branch or commit.

### Learning about new versions

A **release** is a tag named `v<major>.<minor>` or `v<major>.<minor>.<patch>` — nothing else. The
repository carries many other tags (`v-ship-…`, `archive/…`, `pre/…`); none of them is a release
(`server/src/releaseCheck.js` → `createReleaseChecker`, `ask`). **No release tag exists yet:** checked on 2026-10-18
with `git ls-remote --tags origin`, which lists no tag of that shape.

| where | what it tells you |
| --- | --- |
| GitHub, on the repository: **Watch → Custom → Releases** | an e-mail or GitHub notification when a release is **published on GitHub's Releases page**. A tag pushed without a published release does not notify |
| [CHANGELOG.md](../CHANGELOG.md) | what each version changes for an operator or a race director, newest first; *Unreleased* is what the next version will carry |
| the admin status box: **Dev Screen → Accounts and system**, at the top, admins only | its line *Newer release* (below) |
| `racearena version` — VPS install (branch feat/vps-install, not yet merged) | the version running (`git describe --tags`, with the commit), the one before the last update, the address, and where the data and the backups are (`deploy/racearena:307-316` on that branch). It does not ask whether a newer one exists |

**The admin status box's *Newer release* line** comes from the server, which asks GitHub for the
repository's tags **at most once a day** and keeps that answer — a failure included — for 24 hours
(`server/src/releaseCheck.js` → `ask`, `checkRelease`). It sends no credentials. The box is filled when an
admin opens it; nothing announces a new release by itself. What the line says
(`client/src/screens/DevScreen/sections/AdminStatusSection.jsx` → `releaseLine`):

| the line | when |
| --- | --- |
| `unknown` | the check failed: no network, a timeout, GitHub's rate limit, an unexpected answer (`server/src/releaseCheck.js` → `ask`) |
| `no release published yet` | the check worked and found no release tag — today's answer |
| `yes — <newest> is newer than this build (<current>)` | a newer release exists |
| `no — this build is <current>` | this build is the newest release |
| `newest release is <newest>; this build's version is not known, so it cannot be compared` | this build did not identify itself by a release tag (a branch, a commit, or `unknown`), so the server does not guess (`server/src/releaseCheck.js` → `buildVersion`) |

Every line but `unknown` ends with when the check was made. The box reads **tags**
(`server/src/releaseCheck.js` → `ask`), so it sees a release tag as soon as it is pushed, whether or
not a release is published on GitHub's page. The route behind the box is admin-only
(`server/src/auth/guards.js` → `ROUTE_POLICY`) and reads only (`server/src/routes/adminStatus.js` → `GET /status`).

**`racearena update` without a tag** — VPS install (branch feat/vps-install, not yet merged) — takes
the newest release tag from the repository (`deploy/racearena:98-101` on that branch: tags matching
`^v[0-9]+\.[0-9]+(\.[0-9]+)?$`, the highest by version order) and **refuses when there is none**:
`no release tag (v<major>.<minor>[.<patch>]) exists yet — name one: racearena update <ref>`
(`deploy/racearena:232-236` on that branch). Today that refusal is what it prints.

---

## 4. Accounts

**There are two roles.** An `operator` runs races; an `admin` also manages accounts and the advanced
settings. There is no self-registration and no password reset by e-mail. How authentication works
in full is [AUTH.md](AUTH.md)'s.

### The first admin

A fresh install has no account and no default login. The first admin is created once, with a
one-time setup token.

| path | how |
| --- | --- |
| Node | start the server once with `RA_BOOTSTRAP_TOKEN` exported, send the setup request, restart without the token (DEPLOYMENT.md, install steps 5 to 7) |
| Docker | `npm run configure` writes a token into `docker-compose.override.yml`; open the app's page *Create the first admin* (`/setup-admin`), which asks for it — or send the setup request of DEPLOYMENT.md's *Docker* section; then remove the token from the override file and `docker compose up -d` again |
| VPS install (branch feat/vps-install, not yet merged) | the installer asks for the admin's name and password and removes the token afterwards |

★ **A setup request answered `403 setup not available`** means the token is wrong **or no token is
configured at all**; the answer is the same on purpose, and the server log says which (AUTH.md §1).
In production the request also needs an `Origin` header naming the install's address.

### Adding and changing accounts

Signed in as an admin: **Dev Screen → Accounts and system → Race directors.** Each account gets a role
and a team. The last admin can be neither deleted nor demoted. **Each user changes their own
password** in *Accounts and system → Your password*; doing so signs out that user's other sessions.
An admin resetting someone else's password signs out all of that user's sessions. **Every new
password needs at least 10 characters** — at first-admin setup, on an account created or reset, on
your own, and in the recovery tool; a shorter one is refused with a message saying so. Passwords
set before this rule keep working until they are changed.

### A forgotten admin password

**If another admin can still sign in,** they reset the password in *Race directors*.

**If every admin is locked out,** the recovery tool runs on the server itself, not over the network:

```sh
node scripts/recover-admin.mjs promote <username>
```

It gives `<username>` the admin role and a new password (created if the user does not exist). It
asks for the password without showing it, or reads `RA_RECOVERY_PASSWORD`; **the password is never a
command-line argument.** Old sessions of that user end. Every use is appended, without the password,
to `recover-admin-audit.log` in the data folder. **Stop the server first.** `rearm-setup` re-opens
first-admin setup, and works only when there are no users at all.

| path | how to run it |
| --- | --- |
| Node | stop the server; from the release directory with the settings loaded, run the command above; start the server |
| Docker | `docker compose stop`; once, `npm ci --prefix server` on the host; `RA_DATA_DIR=server/data node scripts/recover-admin.mjs promote <username>`; `docker compose start`. **Not tested on this path:** if the host account cannot write the files the container created, the tool fails with a permission error |
| VPS install (branch feat/vps-install, not yet merged) | **no route is written down.** `recover-admin.mjs` is not among the tools the branch's app image carries, and the host has no Node. Until the branch adds one, keep a second admin account |

### Several organisers on one install

**One install is one shared space; only stored races are kept apart, by team.** That is a decision
of 2026-10-01, and its home is [DEPLOYMENT.md](DEPLOYMENT.md), *What organizers on one installation
share*. Each account has a team (§4, *Adding and changing accounts*); the server reads it from the
account on every request, never from what the browser sends (`server/src/auth/guards.js` → `createRequireAuth`,
`server/src/routes/races.js` → its header comment). What that means record by record, as the code stands:

| record | who sees it | who changes it |
| --- | --- | --- |
| tracks and their pictures | every signed-in user (`server/src/routes/tracks.js` → `GET /`) | every signed-in user creates, edits and deletes — a default track can be edited but not deleted (`server/src/routes/tracks.js` → `DELETE /:id`); making one a default (`set-default`, `clear-default`) and exporting it as seed data is admin-only (`server/src/auth/guards.js` → `ROUTE_POLICY`) |
| racer types and sprites | every signed-in user (`server/src/routes/racers.js` → `GET /`) | every signed-in user creates, edits and deletes |
| brands and logos | every signed-in user (`server/src/routes/brands.js` → `GET /`) | every signed-in user creates, edits and deletes — not a default one (`server/src/routes/brands.js` → `DELETE /:id`); default and export admin-only (`server/src/auth/guards.js` → `ROUTE_POLICY`) |
| player groups — **with the names of the people in them** | every signed-in user (`server/src/routes/playerGroups.js` → `GET /`) | every signed-in user creates, edits and deletes — not a default one (`server/src/routes/playerGroups.js` → `DELETE /:id`); default and export admin-only (`server/src/auth/guards.js` → `ROUTE_POLICY`) |
| surface classes | every signed-in user (`server/src/routes/surfaceClasses.js` → `GET /`) | admins only (`server/src/auth/guards.js` → `ROUTE_POLICY`) |
| the period evaluation's points rule | every signed-in user (`server/src/routes/races.js` → `GET /evaluation/points-rule`) | admins only (`server/src/auth/guards.js` → `ROUTE_POLICY`) |
| the test-aids switch | every signed-in user (`server/src/routes/settings.js` → `GET /test-aids`) | admins only (`server/src/auth/guards.js` → `ROUTE_POLICY`) |
| the warning about re-delivered built-in records | every signed-in user (`server/src/routes/seedNotices.js` → `GET /`) | any signed-in user dismisses it, for everyone (`server/src/routes/seedNotices.js` → `POST /dismiss`) |
| **stored races** | **only users of the team that ran them** — the list, a race by its short key and the period evaluation (`server/src/routes/races.js` → `GET /`, `:189-207`, `:229-231`) | every signed-in user stores the races they run, filed under their own team (`server/src/routes/races.js` → `POST /`); nobody changes or deletes a stored race ([PRIVACY-FACTS.md](PRIVACY-FACTS.md)); re-checking one on demand is admin-only and also limited to the admin's own team (`server/src/auth/guards.js` → `ROUTE_POLICY`, `server/src/routes/races.js` → `POST /:shortKey/verify`) |
| **player registrations** and the names in them | **only users of the team that opened them** (`server/src/routes/registrations.js`); a player sees only the public view and their own name (`server/src/routes/join.js`) | every signed-in user of that team opens, closes, extends, removes names from and deletes them; players add their own name through the public link |
| accounts | admins only, **every account on the install, whatever its team** (`server/src/auth/guards.js` → `ROUTE_POLICY`) | admins only; each user changes their own password |
| the admin status box | admins only (`server/src/auth/guards.js` → `ROUTE_POLICY`) | nobody; it reads only |
| the Dev Screen's race settings (behaviour, camera and the rest) | **not shared**: kept in each browser's local storage (`client/src/modules/storage/storage.js` → `KEYS.RACE_DEFAULTS`, `KEYS.AUTO_SCALE_CONFIG`; §1, the Dev Screen's "Backup and reset") | whoever uses that browser |

★ **An admin sees only their own team's races too.** The race routes filter by the signed-in user's
team whatever the role; there is no "all teams" view.

★ **A user without a team** (an account from before teams existed) signs in normally, sees no stored
races, and cannot store one: the server keeps the race in the browser and logs a line naming
`scripts/migrate-teams.mjs` (`server/src/routes/races.js` → `POST /`, `GET /`).

**In the Dev Screen an operator sees only the parts marked for operators**
(`client/src/screens/DevScreen/DevScreen.jsx` → `isOperatorTier`, `DevScreen`); the server's role checks above apply
whatever the screen shows.

---

## 5. Security basics

### HTTPS

The server speaks plain HTTP. **On a public address, HTTPS comes from a proxy in front of it.**

| path | how |
| --- | --- |
| Node | a reverse proxy such as Caddy, with `RA_BIND_ADDRESS=127.0.0.1` so the proxy is the only way in and `RA_TRUST_PROXY=1` so the server believes the one proxy's forwarded address — DEPLOYMENT.md, *Behind a reverse proxy*, a tested example |
| Docker | the same proxy; the shipped compose file publishes port 4000 on **every** interface, so close it in your own override file with `ports: !override` and `- "127.0.0.1:4000:4000"` (DEPLOYMENT.md, *Docker*) |
| VPS install (branch feat/vps-install, not yet merged) | automatic: Caddy obtains and renews the certificate; only ports 22, 80 and 443 are open |

`RA_PUBLIC_ORIGIN` must be the `https://` address exactly as visitors type it. The server warns at
start when sign-in would travel unencrypted.

### The session secret

`RA_SESSION_SECRET` signs the session cookies. **In production the server refuses to start without
it.** It is generated once (by DEPLOYMENT.md's install step 4, by `npm run configure`, or by the VPS
installer) and must not be regenerated at every start. **Changing it signs everybody out**; do it in
a quiet moment. Keep the file that holds it readable by its owner only.

### SSH

| path | state |
| --- | --- |
| Node, Docker | outside this project; nothing in the repository configures SSH |
| VPS install (branch feat/vps-install, not yet merged) | the installer **does not change** the SSH configuration; it prints the guided step at the end. Put your public key in `~/.ssh/authorized_keys` of a non-root user who can use sudo, then: `sudo racearena harden-ssh --user <that user>` — it checks the user and prints the plan and a one-time code. In a **second** terminal, signed in as that user **with your key**, run `sudo racearena harden-ssh --confirm <code>`: it switches off password and root sign-in only if that session really used a key, and refuses otherwise. Keep both sessions open until a third sign-in with the key works. `--dry-run` shows the plan without a code |

### fail2ban

| path | state |
| --- | --- |
| Node, Docker | outside this project |
| VPS install (branch feat/vps-install, not yet merged) | installed and on: five failed SSH sign-ins within ten minutes ban the address for one hour. `racearena status` shows how many addresses are banned |

The app itself also limits failed sign-ins per IP address and failed password changes per user
(AUTH.md §6).

### What the app keeps about people

What is stored, where, for how long and who can read it is [PRIVACY-FACTS.md](PRIVACY-FACTS.md)'s.

### Reporting a security problem

If you find a weakness in RaceArena itself, report it privately as [SECURITY.md](../SECURITY.md)
describes — through GitHub's "Report a vulnerability" on the repository's Security tab, not in a
public issue. Only the newest release receives security fixes, so keep your install updated
(section 3).

---

## 6. When something goes wrong

What actually happens was **measured** in the release audit on throwaway data
([A10-resilience.md](../reports/release/AUDIT-1/A10-resilience.md), at `e164bb68`, before the security
fixes; since then errors are answered as short JSON instead of an HTML page).

### The server will not start

Read the first lines it prints; each start-up refusal names its cause.

| cause | what it says or does | fix |
| --- | --- | --- |
| no `RA_SESSION_SECRET` with `NODE_ENV=production` | refuses to start (`SESSION_SECRET_MISSING`) | set it in the settings (§5) |
| `RA_PUBLIC_ORIGIN` set but malformed | refuses to start, naming what is wrong | correct the address |
| `RA_BIND_ADDRESS` not an IP address | refuses to start, naming the variable | an IP address, or leave it out |
| `RA_TRUST_PROXY` not a whole number | refuses to start, naming the variable | the number of proxies in front (`1` behind Caddy, `0` for none), or leave it out |
| `RA_COOKIE_NAME_MODE=host` without a guaranteed secure cookie | refuses to start | leave the variable unset |
| the port is already taken (another server, an old one still running) | refuses to start: `RaceArena cannot start: listen EADDRINUSE …`, exit 1 | stop the other process, or choose another `PORT` |
| no client build present | **starts**, logs where it looked, and serves only the API | build the client (Node path, install step 3) |

On the Docker path: `docker compose logs server`. On the VPS install (branch feat/vps-install, not yet
merged): `racearena logs app`.

### The disk is full

**Measured:** reading keeps working; **every write fails, including sign-in** (it writes a session);
nothing already stored is damaged; once space is freed the same write succeeds. The health route keeps
answering `ok`, so watch the `disk` line of `npm run status` (or `racearena status` on the VPS install,
branch feat/vps-install, not yet merged).

Free space first: old backup archives are the usual candidates on the Node and Docker paths, because
nothing deletes them. Copy them off the server before deleting them.

### A damaged data file

| file | what happens (measured) | what to do |
| --- | --- | --- |
| `users.json` | starts; **health answers `503`, status `error`**, naming the account store (so `npm run status` and the container's health check fail); **sign-in and every signed-in page fail** | restore from a backup (§2) |
| `races.sqlite` | starts; only the race history fails; tracks and everything else work | restore from a backup |
| `registrations.sqlite` | starts; health answers `200`; **only player registration fails** — the director's panel and the join page answer `500`; races, tracks and everything else work (measured 2026-10-21) | restore from a backup; or, if no registration in it is still needed, move the file aside and a fresh one is started at the next registration |
| `sessions.sqlite` | **starts anyway** (since AUDIT-1 A10-07): the damaged file is renamed `sessions.sqlite.damaged-<time>` beside it, a fresh one is started and one log line says so — **everybody has to sign in again**, nothing else is lost | nothing; delete the renamed file once you no longer want it |
| one track file | starts; that track is skipped with a warning, the others are served | restore from a backup, or re-save the track |

★ **Before any restore, move the damaged data folder aside rather than deleting it.** A restore goes
into an empty folder, and what you set aside may still hold something the backup does not.

★ **A save can hold the server for several seconds** when something else holds the race database open
(measured: about 7 seconds, then the save fails) — a running backup is enough. **`RA_RACES_WAL=1` ends
that**: the race database then uses write-ahead logging, and a save goes through while a backup
reads (measured: about 20 ms). It is off by default because it keeps two more files beside
`races.sqlite` while the server runs (`-wal`, `-shm`); do not put the data folder in a synced folder
(OneDrive, Dropbox) with it on. Backups and restores work in both modes ([ENVIRONMENT.md](ENVIRONMENT.md)).
The single-server (VPS) install turns it on, together with `RA_TRUST_PROXY=1` for its one proxy,
Caddy (`deploy/docker-compose.prod.yml`).

### If the venue's internet drops

**Measured on 2026-10-18** on the production build with throwaway data, the connection blocked and,
separately, the server stopped — on the setup screen, in the countdown, mid-race and as the last
racer crossed, and again after the fixes of the same day, once per moment with the connection
blocked ([OFFLINE-1.md](../reports/release/OFFLINE-1.md), *After the fix*):

- **The race goes on and nothing is lost.** Every race ran to the result screen, the result was kept
  in that browser's race history as waiting to be sent, and once the server could be reached again it
  was stored on the server exactly once. No reload is needed.
- **Keep the page open; do not reload it while the connection is down.** A reload is the one step
  that was not measured, and when the server itself is gone the app is not served at all.
- **While the app knows the server is gone, it checks about every 10 seconds whether it is back**,
  and once it answers the red banner (*"The server is not answering"*) clears and the waiting race
  is sent, without anything being clicked.
- **During a race, the standings column says "Server not reachable — results are kept and sent
  later"** when the app knows the server is gone — from the start if the race began during the
  outage. An outage that begins in the middle of a race is noticed when the race ends — by design
  (decided 2026-10-18): a running race does not ask the server while it seems to be answering, and
  the result is kept either way.
- **A race started while the connection is down is drawn without its track picture** (racers,
  track markers and standings are all there). The picture comes back by itself once the connection
  does — during that race or at the latest the next one — without a reload. A race whose picture
  had loaded before the drop keeps it.

---

## 7. Uninstalling

★ **Take a last backup and copy it off the server first.** Everything below is permanent.

| path | what to remove |
| --- | --- |
| Node | stop the process and remove it from your process manager and cron; delete the release directories (`/opt/racearena/racearena-*` in DEPLOYMENT.md's example), the data folder (`RA_DATA_DIR`), the backups (`RA_BACKUP_DIR`) and the settings file. Those four places are everything the install wrote (DEPLOYMENT.md, *The layout*) |
| Docker | `docker compose down --rmi local` in the repository folder, then delete the folder — it holds the data (`server/data`) and `docker-compose.override.yml` with the secrets — and your backup folder |
| VPS install (branch feat/vps-install, not yet merged) | `sudo racearena uninstall`: it takes a final backup (and removes nothing if that fails), asks you to type the domain, then removes the containers, the app images, Caddy's certificates, the timers, the fail2ban jail, `/opt/racearena`, `/etc/racearena` and the command itself. **The data (`/var/lib/racearena`) and the backups (`/var/backups/racearena`) are kept.** `--purge-data` deletes those too, after asking a second time. Docker, ufw and unattended-upgrades stay installed, since other software may rely on them. Tested end to end on a local Docker, with and without `--purge-data` |
