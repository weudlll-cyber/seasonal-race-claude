# VPS-INSTALL-1 — one command installs RaceArena on a VPS (2026-10-07/08)

**Built on `feat/vps-install`; NOT merged.** The first run on the real VPS, with the owner, comes
first. Decided on 2026-10-07: the game goes online on the owner's own VPS (Contabo); he installs it
himself, with one command from GitHub; Docker is used inside it. The operator's guide is
[docs/VPS-INSTALL.md](../../docs/VPS-INSTALL.md).

## The files

| file | what it does |
| --- | --- |
| `deploy/install.sh` | **the one command.** In order: checks (root; Ubuntu 22.04/24.04 or Debian 12) → questions (domain, e-mail, first admin, optional SMTP; the passwords never touch disk) → DNS check (stops and explains if the domain does not point here) → Docker from Docker's apt repository, ufw (22 first, then 80, 443), unattended-upgrades → `/opt/racearena`, `/var/lib/racearena`, `/var/backups/racearena`, `/etc/racearena` (settings 600, generated secret, one-time token) → start, first admin, token removed, sign-in checked over https → systemd timers. Every step is recorded, so a re-run continues and never re-asks. `--ref`, `--dry-run`, `--help`. It never touches SSH. |
| `deploy/racearena` | **the helper**, installed to `/usr/local/bin`. `status`, `logs`, `backup` (14 days kept), `restore`, `update` (backup → fetch → build → migrate → start → health; rolls back by itself within 120 s), `rollback`, `version`, each with `--help`; and the three steps install.sh runs through it (`start`, `first-admin`, `verify-signin`) and the alert the timer calls. |
| `deploy/docker-compose.prod.yml` | the stack: **app** (built from the checkout with `server/Dockerfile`, no source mounts, not published, healthcheck on `/api/health`, data in `/var/lib/racearena`) and **caddy** (official image pinned by digest, Caddy v2.11.7; publishes 80 and 443 only; certificates in a volume). Both log through json-file, 10 MB × 5. |
| `deploy/Caddyfile.template` | the tested configuration of DEPLOYMENT.md "Behind a reverse proxy" (PROXY-PROBE-1), reaching the app as `app:4000` |
| `deploy/ra-admin.mjs` | the install's HTTP steps (setup, sign-in check, health), run in a one-off container of the app image, so the host needs neither Node nor curl. Passwords arrive on standard input only. |
| `deploy/systemd/*` | the daily backup (03:30, catches up after downtime) and the status check every 10 minutes, whose failure starts the alert: an e-mail with SMTP, the system journal without |
| `deploy/test/e2e-local.sh`, `e2e-check.mjs` | the end-to-end test below |
| `server/Dockerfile` (+13 lines), `.dockerignore` (+4) | **the image now carries `scripts/backup.mjs`, `migrate.mjs` and `status.mjs`, unchanged**, plus one link `/server` → `/app`. Each tool imports `<repo root>/server/src/…` and `<repo root>/server/node_modules/better-sqlite3`; with the tools at `/scripts`, the root is `/`, and the link gives them that layout without a second copy. The image stays standalone. |

**Reused, not rewritten:** `scripts/backup.mjs` (backup and restore), `scripts/migrate.mjs`
(migrations), `scripts/status.mjs` (the status check), `server/Dockerfile` (the image), the setup
route `POST /api/auth/setup` (the first admin), and DEPLOYMENT.md's rollback procedure (data moved
aside, the pre-update backup restored into an empty directory).

**One reading of the brief, stated.** "The newest tag matching v\*" is taken as the newest
**release** tag, `v<major>.<minor>` or `v<major>.<minor>.<patch>`. The repository carries 83 tags
starting with `v`, and all of them are ship markers (`v-…-complete`). Matching them literally would
install an old commit. No release tag exists today, so the command stops and names `--ref`. That was
tested against the real repository.

## The dry run

`--dry-run --ref feat/vps-install` in a clean `debian:12` container (the detection is real, nothing
is changed), 2026-10-08:

```text
DRY RUN — nothing is changed; every action is printed in order.

── 1 · checks
system: debian 12 — supported

── 2 · questions
[dry-run] the questions are not asked; using racearena.example.com, you@example.com, admin admin, no SMTP

── 3 · DNS: does racearena.example.com point at this server?
[dry-run] would compare the A record of racearena.example.com with this server's IPv4 addresses, and stop if they differ

── 4 · Docker, firewall, security updates
[dry-run] apt-get update -q
[dry-run] apt-get install -y -q ca-certificates curl gnupg git ufw unattended-upgrades
[dry-run] install -m 0755 -d /etc/apt/keyrings
[dry-run] curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
[dry-run] chmod a+r /etc/apt/keyrings/docker.asc
[dry-run] write /etc/apt/sources.list.d/docker.list (mode 644)
[dry-run] apt-get update -q
[dry-run] apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
[dry-run] systemctl enable --now docker
[dry-run] ufw allow 22/tcp
[dry-run] ufw allow 80/tcp
[dry-run] ufw allow 443/tcp
[dry-run] ufw default deny incoming
[dry-run] ufw default allow outgoing
[dry-run] ufw --force enable
[dry-run] write /etc/apt/apt.conf.d/20auto-upgrades (mode 644)

── 5 · directories, the checkout, the settings
[dry-run] mkdir -p /opt/racearena /var/lib/racearena /var/backups/racearena /etc/racearena/state
[dry-run] chown 1000:1000 /var/lib/racearena /var/backups/racearena
[dry-run] chmod 700 /etc/racearena
installing version feat/vps-install
[dry-run] git clone --quiet https://github.com/weudlll-cyber/seasonal-race-claude.git /opt/racearena
[dry-run] git -C /opt/racearena checkout --quiet --detach <the commit feat/vps-install names>
[dry-run] write /etc/racearena/racearena.env (mode 600)
[dry-run] write /etc/racearena/Caddyfile (mode 644)
[dry-run] write /etc/racearena/compose.env (mode 644)
[dry-run] write /etc/racearena/state/alert-email (mode 600)
[dry-run] install -m 0755 /opt/racearena/deploy/racearena /usr/local/bin/racearena

── 6 · start, first admin, sign-in over https
[dry-run] racearena start
[dry-run] racearena first-admin --user admin   (password on standard input)
[dry-run] racearena verify-signin --user admin   (password on standard input)

── 7 · daily backup, status check every 10 minutes
[dry-run] write /etc/systemd/system/racearena-backup.service (mode 644)
[dry-run] write /etc/systemd/system/racearena-backup.timer (mode 644)
[dry-run] write /etc/systemd/system/racearena-status.service (mode 644)
[dry-run] write /etc/systemd/system/racearena-status.timer (mode 644)
[dry-run] write /etc/systemd/system/racearena-alert.service (mode 644)
[dry-run] systemctl daemon-reload
[dry-run] systemctl enable --now racearena-backup.timer racearena-status.timer

══ (dry run) what the end of a real run prints ══
(the closing text: the address, the data and backups, "copy them OFF this server", which alert path is
active, the racearena commands, the SSH next steps)
```

## The end-to-end test on a local Docker — 28 of 28 checks pass

[deploy/test/e2e-local.sh](../../deploy/test/e2e-local.sh) starts the stack exactly as install.sh
does: the same three settings files, written the same way, then the same `racearena` commands. There
are two differences: Caddy signs for itself (`tls internal`, as PROXY-PROBE-1 did), and the name is
`racearena.test`. Three refs were used:
- A = this branch (`3bdc03f7`);
- B = A plus one test migration, `e2e-test-1`;
- C = B with a server that exits at start.

B and C are local commits only, never pushed. Run on 2026-10-08.

| check | result |
| --- | --- |
| `racearena start`: both services up and healthy (the container's check AND https through Caddy) | PASS |
| first admin created through `racearena first-admin` (install.sh's own path; the password piped) | PASS |
| the one-time token removed from the settings file | PASS |
| setup refused once the admin exists | PASS |
| `racearena verify-signin` works through https | PASS |
| a visitor's sign-in sets a **Secure** cookie | PASS |
| the app publishes **no** host port (`docker port` empty: `4000/tcp` exposed on the compose network only) | PASS |
| Caddy publishes exactly 80 and 443 | PASS |
| a race stored over https, and read back | PASS, PASS |
| `racearena backup` | PASS |
| the data directory deleted (empty) | PASS |
| `racearena restore <archive>` | PASS |
| the race is back, and the admin can sign in, after the restore | PASS, PASS |
| the ledger lacks `e2e-test-1` before the update | PASS |
| `racearena update` A → B | PASS |
| the ledger holds `e2e-test-1` after it, and the migration's own marker file exists | PASS, PASS |
| the race survives the update | PASS |
| `racearena update` B → C (never healthy): exits non-zero | PASS |
| … says it rolled back ("ROLLED BACK to 0aff4bbe8853 and the backup racearena-backup-20261008T055939Z.tar") | PASS |
| … the checkout is back on B, and the app is healthy on B again | PASS, PASS |
| after `docker restart` of both containers: the app is healthy, https answers | PASS, PASS |
| the app rotates its log at 10 MB × 5; Caddy rotates its log at 10 MB × 5 | PASS, PASS |

**Observed, not counted.** After `docker kill -s KILL` of the app it stayed down (restarts 0). Docker
treats a kill as a deliberate stop, which `unless-stopped` honours. A process that dies by itself IS
restarted: the first run left ref C crash-looping, with 9 restarts by the policy.

**The first run (2026-10-08 early) found three real defects, all fixed before this run (`3bdc03f7`):**
1. `racearena` swallowed the piped admin password: the CA lookup's `docker compose exec` read
   standard input first, so no admin was created and every later sign-in failed;
2. `compose up` exits non-zero while the app is unhealthy (Caddy waits on its health), and with
   `set -e` that ended `update` BEFORE its own health check could roll back;
3. two harness faults: Windows paths under Git Bash, and the results folder.

It also exposed a fourth: running `racearena` from inside the checkout it updates is unsafe, because
bash reads a script while running it. install.sh installs a copy to `/usr/local/bin`, and the test now
runs a copy too.

**shellcheck** (koalaman/shellcheck v0.10.0, pinned by digest): `install.sh`, `racearena` and
`e2e-local.sh` clean.

## 2026-10-18 — the test again after master `7d57fd81` was merged in, with the emergency drill

The same harness, with refs made the same way (A = `b3874c6c`, the merged branch; B = A plus
`e2e-test-1`; C = A with a server that exits at start; B and C throwaway, never pushed), now 71
checks. Its last section is new, the **emergency drill**: before `uninstall --purge-data` removes
the second stack, `racearena backup` runs and the archive and its `.sha256` are copied off the
install; after the purge a NEW install is laid out (a new session secret, the one-time token) and
started, its own first admin `e2e-new-admin` is created, the carried archive is copied into its
backups directory and `racearena restore` runs. Checked: the old install's admin signs in, the old
race reads back, the new install's own admin can no longer sign in (the backup's accounts replace
it), and the drill's install is purged with no container left. The layout the three installs share
is now one helper, `lay_out_install`.

| run | result | what failed |
| --- | --- | --- |
| 1 | 58 of 71 | the FIRST start on an empty data directory: the app was not healthy within the compose health window, so compose did not start Caddy and `racearena start` failed after 120 s; every check that needs https or the stored race failed after it (13). The next `compose up` (the restore) started Caddy and the restore, sign-in, update, rollback and drill checks that need no stored race passed |
| 2 | 69 of 71 | the same, once, at the drill's new install (its start and its first-admin wait); the drill's restore, sign-in, race read and replaced-admin checks passed |
| 3 | **71 of 71** | — |

The other four empty-data starts were healthy within seconds (run 2's first start: healthy at the
first check, 5 s after the container started). Not reproduced on demand and not fixed; recorded in
the GOING ONLINE row of `docs/BACKLOG.md`. **shellcheck** v0.10.0 (digest `sha256:2097951f…221fb`):
`e2e-local.sh`, `hardening-check.sh`, `install.sh`, `racearena` clean.

## 2026-10-18, later — the test again after master `fbcbe1e7` was merged in

The same harness and the same way of making the refs (A = `75a49ddb`, the merged branch; B = A
plus `e2e-test-1`; C = A with a server that exits at start; B and C throwaway local branches, never
pushed). **71 of 71 on the first run**; every start on an empty data directory was healthy, and no
container of the stack was left afterwards. Nothing under `deploy/` changed in the merge, so the
shellcheck result above stands.

## 2026-10-19 — the test again after the major upgrades were merged in (master `d80dc945`)

Master now runs ESLint 10, vitest 5, better-sqlite3 13 and Express 5 (A7-03 pieces 1-4,
reports/release/UPGRADES-2026-10-19.md). The image this harness builds is the first install of
the VPS stack on better-sqlite3 13's bundled musl binary and on Express 5. The same harness and the
same way of making the refs (A = `762bd2ec`, the merged branch; B = A plus `e2e-test-1`; C = A with
a server that exits at start; B and C throwaway local branches, never pushed): **71 of 71 on the
first run**; every start on an empty data directory was healthy, and no container of the stack was
left afterwards. Nothing under `deploy/` changed in the merge, so the shellcheck result above
stands.

**Later the same night, after better-sqlite3 13 was reverted on master** (`faf2387f`: under 13,
`npm ci` compiles it and needs C++ build tools — the morning sheet has it): merged in again
(`f60080e7`) and run again the same way — **71 of 71 on the first run**, on better-sqlite3 12.10.0
and Express 5; no container left.

**2026-10-19, after React 19 and the A7-03 close were merged** (master `e371938b`): merged in
(`b118c5e6`) and run again the same way — **71 of 71 on the first run**; no container left.

## 2026-10-22 — the test again after player registration was merged in (master `6470e2e6`)

Master `6470e2e6` (REGISTRATION-1, player registration, accepted by the owner on 2026-10-21) merged
in as `f7ddd528`; the only conflicts were the two count lines of `docs/OPEN.md`, resolved to this
branch's four rows.

**Checked against the merged tree:**
- **The VPS backup and restore cover `registrations.sqlite`**: `racearena backup` / `restore` run the
  project's own `scripts/backup.mjs`, which the image carries, and its database list now names the
  file.
- **The Caddy configuration serves `/join/*` and the public registration routes like the rest**: it
  proxies every path to the app (`reverse_proxy app:4000`, no path filter).

Both were made checks of the test, three new:
- a registration is opened over https and one player joins **anonymously** through
  `/api/join/<code>`;
- the public route and the `/join/<code>` page are served through Caddy;
- after the backup → delete → restore, the registration and its player are back.

Run the same way as before (A = `f7ddd528`; B = A plus `e2e-test-1`; C = A with a server that exits
at start; B and C throwaway local branches, deleted after the run): **74 of 74 on the first run**.
Every backup took `registrations.sqlite` through SQLite's online backup.

## What could NOT be tested here — on the owner's VPS, at the first install

- the system detection on the real machine (the dry run checked the parser on Debian 12);
- the Docker install from Docker's repository; ufw; unattended-upgrades;
- the DNS check against a real A record;
- **the real Let's Encrypt certificate** (here Caddy signed for itself);
- the systemd timers and the alert path (journal or SMTP e-mail);
- a reboot of the whole server (the daemon restarting the stack).
