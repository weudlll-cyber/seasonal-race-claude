# RaceArena — the operator guide

**Owns:** the day-to-day running of a RaceArena server, task by task, for the person who runs it
(not a developer). It names the command for each task on each install path and points at
[DEPLOYMENT.md](DEPLOYMENT.md) for the detail instead of repeating it.

**Written 2026-10-09 against `master` at `290e6db3`.** Where this page and the code disagree, the code
is right and this page is a bug.

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
| `tracks/`, `backgrounds/`, `tracks-backups/` | tracks, their pictures, and the newest copies of each track |
| `racers/`, `racer-sprites/`, `brands/`, `brand-logos/`, `player-groups/` | racer types, brands and player groups |
| `test-aids.json`, `migrations.json`, `recover-admin-audit.log` | the test-aids switch, which data migrations ran, and every admin recovery |

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

---

## 3. Updates and rollback

| path | update | roll back |
| --- | --- | --- |
| Node | DEPLOYMENT.md, *Update to a newer version*: unpack and build the new version beside the old one, stop, back up, run `node scripts/migrate.mjs` from the NEW version, start the new one, check | DEPLOYMENT.md, *Roll back a bad update*: stop, set the data aside, restore the backup taken before the update into an empty folder, start the OLD version |
| Docker | **not written down in DEPLOYMENT.md.** Assembled from its documented commands, and not run as a whole: back up (§2); update the checkout; with the container stopped, `RA_DATA_DIR=server/data node scripts/migrate.mjs`; `docker compose build`; `docker compose up -d`; sign in | go back to the previous checkout, restore the backup taken before the update into an empty `server/data` (§2), `docker compose build`, `docker compose up -d` — **likewise not run as a whole** |
| VPS install (branch feat/vps-install, not yet merged) | `racearena update [tag]` — a backup first, then build, migrations, start and a health check; if the app is not healthy within two minutes it goes back by itself | `racearena rollback` — back to the version before the last update and the backup taken just before it; the newer data is moved aside, not deleted |

★ **Keep the backup taken just before an update until you are sure.** It is the way back.

★ **Without a tag, `racearena update` installs the newest release tag, and none exists yet** (no
`v1.0.0`). Until one does, name a tag, branch or commit.

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
An admin resetting someone else's password signs out all of that user's sessions.

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

---

## 5. Security basics

### HTTPS

The server speaks plain HTTP. **On a public address, HTTPS comes from a proxy in front of it.**

| path | how |
| --- | --- |
| Node | a reverse proxy such as Caddy, with `RA_BIND_ADDRESS=127.0.0.1` so the proxy is the only way in — DEPLOYMENT.md, *Behind a reverse proxy*, a tested example |
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
| VPS install (branch feat/vps-install, not yet merged) | the installer **does not change** the SSH configuration. It prints these steps at the end: sign in with a key (put your public key in `~/.ssh/authorized_keys`), then set `PasswordAuthentication no` and `PermitRootLogin prohibit-password` in `/etc/ssh/sshd_config`, then `sudo systemctl reload ssh`. **Do it while still signed in, and test a second sign-in before closing the first.** A guided SSH hardening step is planned for the branch and is not on it as of 2026-10-09 |

### fail2ban

**Not part of any path as of 2026-10-09.** It is planned for the VPS install branch and is not on it
yet. The app itself limits failed sign-ins per IP address and failed password changes per user
(AUTH.md §6).

### What the app keeps about people

What is stored, where, for how long and who can read it is [PRIVACY-FACTS.md](PRIVACY-FACTS.md)'s.

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
| `RA_COOKIE_NAME_MODE=host` without a guaranteed secure cookie | refuses to start | leave the variable unset |
| `sessions.sqlite` damaged | refuses to start: `SqliteError: file is not a database` | see *A damaged data file* below |
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
| `users.json` | starts, health says `ok`, **sign-in and every signed-in page fail** | restore from a backup (§2) |
| `races.sqlite` | starts; only the race history fails; tracks and everything else work | restore from a backup |
| `sessions.sqlite` | **the server will not start** | sessions are disposable: stop the server, move the file aside (do not delete it), start again — everybody has to sign in again. *The server opens the session database in a way that creates a missing file (`server/src/auth/session.js`), but this recovery was not part of the audit's measurement; automating it is an open decision.* Or restore from a backup |
| one track file | starts; that track is skipped with a warning, the others are served | restore from a backup, or re-save the track |

★ **Before any restore, move the damaged data folder aside rather than deleting it.** A restore goes
into an empty folder, and what you set aside may still hold something the backup does not.

★ **A save can hold the server for several seconds** when something else holds the race database open
(measured: about 7 seconds, then the save fails). This is an open decision in the audit, not a fault
you can fix by configuration.

---

## 7. Uninstalling

★ **Take a last backup and copy it off the server first.** Everything below is permanent.

| path | what to remove |
| --- | --- |
| Node | stop the process and remove it from your process manager and cron; delete the release directories (`/opt/racearena/racearena-*` in DEPLOYMENT.md's example), the data folder (`RA_DATA_DIR`), the backups (`RA_BACKUP_DIR`) and the settings file. Those four places are everything the install wrote (DEPLOYMENT.md, *The layout*) |
| Docker | `docker compose down --rmi local` in the repository folder, then delete the folder — it holds the data (`server/data`) and `docker-compose.override.yml` with the secrets — and your backup folder |
| VPS install (branch feat/vps-install, not yet merged) | **there is no `racearena uninstall` yet**; it is planned for the branch. What the installer created, from `docs/VPS-INSTALL.md` and `deploy/install.sh` on the branch: the two containers and their images, `/opt/racearena`, `/var/lib/racearena`, `/var/backups/racearena`, `/etc/racearena`, `/usr/local/bin/racearena`, and five systemd units (`racearena-backup.service` and `.timer`, `racearena-status.service` and `.timer`, `racearena-alert.service`). It also installed Docker, ufw and unattended-upgrades, which other software may now rely on. No removal sequence has been tested |
