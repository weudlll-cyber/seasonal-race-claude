# Changelog

**Owns:** what a person running or using RaceArena gets in each version, and what is built but not
yet merged. How each piece was built and measured is in [docs/BACKLOG.md](docs/BACKLOG.md) PART TWO
and in the merge commits on `master`; this page points there and does not repeat it.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), newest first. Entries
describe what an operator or a race director notices, not how it was done.

## [Unreleased]

Nothing below is in 1.0.0. An entry marked *on `master`* is merged and ships with the next version.
An entry that names a branch is **built there and NOT merged**, and should not be relied on until it
is.

### Added

- A "Source code" link in a slim bar along the bottom of the sign-in screen and the setup screen,
  visible without scrolling, pointing at the source of the
  running version; an operator who runs a modified copy points it at their own source with the
  server setting `RA_SOURCE_URL`. Beside it, "Legal notice" and "Privacy policy" — two pages anyone
  can open without signing in — once an admin has filled them in on the Dev Screen (*Accounts and
  system*, *Legal pages*), where an "Insert template" button offers a country-neutral legal-notice
  template to edit. The texts are stored on the server and travel with its backups.
  *(on `master`, 2026-10-18)*
- A more compact setup screen on desktop windows: less vertical spacing, so the Players, Track and
  Settings tabs each fit a window about 900 px high without scrolling, the bottom card with
  "Start Race" fully visible. Nothing removed; phones and tablets unchanged. *(on `master`, 2026-10-18)*
- Pause and resume a running race: a Pause/Resume button under Cancel Race on the race screen, and
  the Space key, in the countdown and during the race. While paused everything stands still — the
  racers, the camera, the effects and the race clock — under a large "PAUSED"; resuming continues the
  same race, with the same result as if it had never paused, and the paused time is not counted in
  the race's time. Not available once the last racer is home. *(on `master`, 2026-10-13)*
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
- `HEAD /api/health` answers like `GET` (`200` with no body) instead of `401`, so an uptime checker
  that sends `HEAD` sees a healthy server as healthy. *(on `master`, 2026-10-18)*
- `/api/health` answers `503`, status `error`, when the account store (`users.json`) cannot be read, so
  a server nobody can sign in to no longer reports itself healthy; the healthy answer is unchanged
  (audit finding A10-05). *(on `master`, 2026-10-12)*
- A damaged session file no longer stops the server: it is renamed `sessions.sqlite.damaged-<time>`, a
  fresh one is started, one log line says so, and everyone signs in again (audit finding A10-07).
  *(on `master`, 2026-10-12)*
- `RA_RACES_WAL=1`: the race history database in write-ahead-log mode, so saving a race is no longer
  held up (about 7 s, then a failure) while a backup reads it. Off by default; backups and restores
  work in both modes (audit finding A10-02). *(on `master`, 2026-10-12)*
- A new track no longer carries the unused `defaultWinners` field; the built-in tracks and tracks
  already stored keep theirs (audit finding A2-14). *(on `master`, 2026-10-12)*
- An admin-only status box at the top of the Dev Screen's "Accounts and system" chapter: the build,
  the newest backup, the overall status, and whether a newer release exists on GitHub (checked by
  the server at most once a day; "unknown" when the check fails). *(on `master`, 2026-10-12)*

### Changed

- The result screen fits a phone held sideways: when the window is too short for the results card,
  the card is held to the window with its title at the top, and what does not fit scrolls inside the
  card. Where the card already fits, the result screen is unchanged. *(branch
  `fix/result-landscape`)*
- The race screen's own fullscreen (its fullscreen button) now uses the whole screen: the race
  picture is as large as the screen allows, centred, with black around it, and the standings column
  is hidden off the right edge — move the mouse to the right edge to slide it in over the picture
  (on a touch screen, tap the right edge; tap elsewhere to close it). Outside that fullscreen, and in
  the browser's own fullscreen (F11), the race screen is unchanged. *(on `master`, 2026-10-18)*
- A source install (the plain-Node path) needs Node 22 or newer; it said 20, which no longer
  receives security fixes. The Docker image already runs Node 24. *(on `master`, 2026-10-12)*
- The Dev Screen is easier to read and to use with a screen reader: the active view toggle and the
  reset buttons have enough contrast, and every number field in the first chapter and both Track
  Editor dropdowns carry their label. The setup screen fits a 390 px phone; the three "cannot delete
  a default" messages are in English; five Dev Screen help texts now match what ships.
  *(on `master`, 2026-10-12)*
- The Dev Screen works on a phone and a tablet. Below 900 px the sidebar becomes a top bar with a
  Menu button holding the view switch, the chapters, Back to Setup and Log out; the chapter shows
  in one column, wide tables scroll inside their own box, and buttons and fields are big enough for
  a finger. Below 1280 px nothing in a chapter is cut off at the right any more — the Player groups
  cards included. At 1280 px and wider the screen looks as before. *(on `master`, 2026-10-13)*
- The Dev Screen's *Backup and reset* texts say what they really cover: the export, import and
  reset act only on the settings stored in that browser; tracks, racers, player groups and brands
  live on the server and are backed up with `npm run backup` (or `racearena backup` on the VPS
  install), as the operator guide's *Backups* section describes. They used to claim the browser
  file held tracks, racers, groups and branding, and that a reset restored built-in tracks and
  racers. Text only. *(on `master`, 2026-10-13)*
- The brand logo in the corner of the race picture is sized to the picture: on a phone it is
  proportionally smaller instead of covering about a third of the race, and on a desktop window it
  is exactly as large as before. The brand's logo size setting is still the logo's size on a
  desktop and now also its upper limit, and its info text in the Dev Screen says so. The logo on
  the result screen (hidden on a phone) and the large logo on the opening brand card (already
  sized to the picture) were checked and are unchanged. *(on `master`, 2026-10-13)*

### Security

- `RA_TRUST_PROXY`: the number of reverse proxies the server trusts for the visitor's address
  (audit finding A5M-07). Left unset, nothing changes and the server says once at start that it
  should be set. *(on `master`, 2026-10-12)*
- Every new password needs at least 10 characters — at first-admin setup, on an account an admin
  creates or resets, on your own, and in the recovery tool (audit finding A5M-15). Passwords set
  before keep signing in until they are changed. *(on `master`, 2026-10-12)*
- Tracks, racers, brands and player groups accept only the fields the app itself sends, and numbers
  within bounds at least as wide as the editors; anything else is refused with a message naming it.
  Re-saving a record you already have is never refused (audit finding A5M-13).
  *(on `master`, 2026-10-12)*
- A Content-Security-Policy on every page the server serves: scripts only from the server itself,
  no inline or `eval` scripts, no framing by other sites. A plain-HTTP install on a local network
  keeps working. *(on `master`, 2026-10-12)*
- The data and backup folders on a single-server install are private to the app's own account
  (audit finding A5M-06), also after a restore. *(branch `feat/vps-install`)*
- `SECURITY.md`: how to report a security problem privately (GitHub's "Report a vulnerability"),
  what is in scope, and that only the newest release receives fixes. *(on `master`, 2026-10-12)*

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
