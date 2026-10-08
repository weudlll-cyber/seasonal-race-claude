# Changelog

**Owns:** what a person running or using RaceArena gets in each version, and what is built but not
yet merged. How each piece was built and measured is in [docs/BACKLOG.md](docs/BACKLOG.md) PART TWO
and in the merge commits on `master`; this page points there and does not repeat it.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), newest first. Entries
describe what an operator or a race director notices, not how it was done.

## [Unreleased]

Everything below is **built on a branch and NOT merged into `master`**. None of it is in 1.0.0, and
none of it should be relied on until it is merged. Each entry names its branch.

### Added

- One-command install on a single rented server: one `install.sh` asks for the domain, an e-mail
  address and the first admin, then installs Docker, a firewall that lets in only SSH, HTTP and
  HTTPS, and automatic security updates. *(branch `feat/vps-install`)*
- HTTPS by default on that install: Caddy runs in front of the app and obtains and renews the
  certificate by itself; only Caddy is reachable from outside. *(branch `feat/vps-install`)*
- The `racearena` helper command on that install: `status`, `logs`, `backup`, `restore`, `update`,
  `rollback` and `version`; an update takes a backup first and goes back by itself if the new
  version is not healthy within two minutes. *(branch `feat/vps-install`)*
- A daily backup with the last 14 days kept, and a status check every 10 minutes that alerts by
  e-mail or in the system journal. *(branch `feat/vps-install`)*
- fail2ban on that install: five failed SSH sign-ins within ten minutes ban the address for an hour.
  *(branch `feat/vps-install`)*
- `racearena harden-ssh`: switches off SSH passwords and root sign-in, but only after it has seen
  the named user sign in with a key from a second session; it refuses otherwise.
  *(branch `feat/vps-install`)*
- `racearena uninstall`: a final backup first, the domain typed to confirm; the data and backups are
  kept unless `--purge-data`, which asks a second time. *(branch `feat/vps-install`)*
- An admin-only status box at the top of the Dev Screen's "Accounts and system" chapter: the build,
  the newest backup, the overall status, and whether a newer release exists on GitHub (checked by
  the server at most once a day; "unknown" when the check fails). *(branch `feat/admin-status-box`)*

### Security

- A Content-Security-Policy on every page the server serves: scripts only from the server itself,
  no inline or `eval` scripts, no framing by other sites. A plain-HTTP install on a local network
  keeps working. *(branch `feat/csp`)*
- The data and backup folders on a single-server install are private to the app's own account
  (audit finding A5M-06), also after a restore. *(branch `feat/vps-install`)*

## [1.0.0] — not yet tagged

This version is the state of `master` as of 2026-10-09 (commit `290e6db3`); no `v1.0.0` tag exists
yet.

### Added

- A browser-based race presentation: pick the racers, choose a track, start, and watch the race
  unfold on a canvas with a TV-style camera that follows battles, lead changes and comebacks.
- Ten built-in tracks, open and closed, with laps on closed tracks and up to three layered animated
  track effects (rain, stars, bubbles, fireflies, dust, mud, wave).
- Built-in sprite racer types, and a racer editor for making new ones.
- A track editor: draw a track over a background image, edit its centre line and boundaries, undo
  and redo, and test-race it.
- Fair races by design: every racer is identical, and the race plan, the chase from behind and the
  leader brake keep the finish open without favouring anyone ([docs/FAIRNESS.md](docs/FAIRNESS.md)).
- A "Race Action" choice of quiet, medium or wild for each race; the chosen stage is stored with the
  race.
- A race opening on the event brand and then the track, a countdown, live standings, a minimap with
  the leader, and name labels that stay readable.
- A camera ending: the run-in to the line, a photo-finish frame on the leading pair, a podium
  build-up and a winner card; a click ends a beat early, and an auto-advance switch decides whether
  the results follow by themselves.
- Event branding profiles with logos, shown in the race opening.
- Player groups: save groups of player names and race several groups together; a group that does
  not fit the field is refused whole, and a race starts with exactly the number of racers chosen.
- Accounts: sign-in is required for everything; two roles, `operator` and `admin`; an admin manages
  the race directors in the Dev Screen; everyone can change their own password.
- Teams: every account belongs to a team, and each team sees only its own stored races.
- Race history on the server: every finished race is stored with its roster, finishing order and
  the settings it ran under, kept on the device first and sent when the server can be reached.
- A short key for every stored race; typing or pasting it repeats exactly the same race.
- "Verify race" for admins in Race History: the server re-runs a stored race from its own record and
  compares the result.
- A period evaluation: a points table by player name over a chosen period, with Quick Tests left
  out and the points rule stored on the server.
- The Dev Screen, arranged in chapters with an info text for every control: race defaults, camera,
  look and labels, tracks, racers, brands and groups, history and evaluation, diagnostics, and
  accounts.
- A test-aids switch for the whole installation, stored on the server and OFF on a new install,
  which hides every developer display and Quick Test until an admin turns it on.
- One server serves both the app and the API on one port, and the same build can be installed at
  any address: the address is given when the install starts, not when it is built.
- `npm run configure`, which generates an install's secrets and address into its own override file.
- `npm run backup` and `node scripts/backup.mjs --restore`: one archive of all the data, taken while
  the server runs, with a SHA-256 checksum file beside it; a restore has been performed end to end.
- `npm run status`: checks that the API answers, that there is free disk and a writable data folder,
  and that the newest backup is recent and matches its checksum; it exits non-zero for a scheduler.
- A migration runner that applies each data migration once and records it.
- A local `recover-admin` command for an install whose admins are all locked out.
- A Docker image that builds the app itself, runs on its own with no mounts and reports its health;
  the shipped compose file restarts it when it stops unexpectedly.
- A tested example for running behind an HTTPS reverse proxy (Caddy), and a written install,
  update and rollback procedure, followed literally on a throwaway install
  ([docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).
- `RA_DATA_DIR`, `RA_BACKUP_DIR` and `RA_BIND_ADDRESS` settings, so the data lives outside the
  program folder and the server can listen on this machine only.
- `/api/health` names the build that is running.

### Changed

- The finish, the ending and the camera were reworked many times before this version; what ships is
  the camera accepted by the owner on 2026-10-02 and the race accepted with the chase on
  2026-09-23.
- A normal race gets a real seed, so every stored race can be repeated.
- Large fields draw more cheaply, with fewer dropped frames at 80 racers.
- Verifying a stored race no longer holds up the rest of the server, and only one runs at a time.
- The period evaluation reads only what it needs, so it stays fast and small with many stored races.
- Track backups inside the data folder keep the newest 20 copies of each track and remove older
  ones.
- The shipped compose file rotates its log at 10 MB, five files.
- The font is shipped with the app instead of loaded from Google Fonts.
- The container runs as an unprivileged user, on Node 24, with a base image pinned by digest.

### Fixed

- First-admin setup failed on every fresh install because the setup token was sent in the wrong
  place; it now succeeds.
- An unexpected error in a server route is answered instead of stopping the server.
- The identifier the browser gives a race is scoped to its team.
- Connection errors that happened while a race was being verified are gone.
- `docker stop` now ends the server cleanly: requests in flight finish and it exits normally,
  instead of being killed.
- A backup taken while races were being saved no longer fails.
- Every built-in track finishes with the whole field.
- A race starts with exactly the number of racers chosen.
- The race history list no longer hides a race this device holds without saying so, and a filter
  that hides races says so.

### Security

These are the fixes of the release audit (AUDIT-1), merged as `980b13d4`; the full list with
evidence is in [reports/release/AUDIT-1.md](reports/release/AUDIT-1.md), section A5.

- **Critical, closed:** before the fix, writing part of an address in capitals (`/API/users` instead
  of `/api/users`) slipped past sign-in, the admin check and the cross-site check, so anyone who
  could reach the server could create an administrator account without signing in. All three checks
  now judge the address the way the server routes it.
- Two crafted inputs that could tie the server up before sign-in (a long `Origin` header, a long
  page address) are now handled in constant time.
- Image uploads accept one file part and no extra fields, so an upload cannot grow memory without
  bound.
- Backup archives, their checksum files and restored files are readable by their owner only.
- Errors are answered as short JSON without stack traces, even when `NODE_ENV` is not set.
- Deleting a brand, racer or track removes stored files only when their names are safe, so a
  crafted record cannot delete an unrelated file.
- Verifying a stored race is bounded to one minute and a fixed amount of memory.
- A stored race whose fields have the wrong types is refused instead of being stored or failing
  forever.
- The image installs exactly the dependency versions in its lockfile.
- Dependencies with known advisories were updated within their ranges; `npm audit` is clean for the
  server and the client.
- The CI workflows use actions pinned to exact commits.
- The image moved off Node 20, which reached end of life, to Node 24, and npm is removed from the
  running image; the image scan went from 89 findings to 1.

Earlier security work in this version:

- No default setup token ships with the compose file; a fresh install cannot be opened until its own
  token is generated.
- Sign-in, setup and password changes are rate-limited; passwords are stored as bcrypt hashes; a
  password change ends the other sessions of that account.
- Every change request must come from the install's own address (an origin check).
- The server warns at start when sign-in would travel unencrypted.
- The image carries no data and no credentials from the machine it was built on.

### Removed

- The number-of-winners setting: the podium is three places everywhere. Old races keep the winners
  they were stored with.
- The separate auto-advance delay: the camera ending's length decides how long the finish stands.
- The racer number badge and the shuffle button on the setup screen.
- The build-time API address (`VITE_API_URL`); a build that carries one is refused by the bundle
  check.
