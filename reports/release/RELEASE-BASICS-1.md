# RELEASE-BASICS-1 — delivery basics for the first release

**Night chain of 2026-10-01, piece 1.** Branch `release/basics`, off master `c775aa80`. **Pushed, not
merged.** The owner looks first.

**The owner's facts of 2026-10-01**, recorded as dated facts: the software is to be downloadable for
many server operators, and every operator must be able to host several organizers on one server.
Therefore the tenancy boundary (decided 2026-09-25; order decided 2026-09-27: build it before a second
organizer is invited) is part of the first release. The tenancy work is piece 2
([TENANCY-SURVEY-1](TENANCY-SURVEY-1.md), on its own branch). This piece is everything else an
operator needs to install and keep an install.

**Nothing in the race moves.** `node scripts/engine-reach.mjs --check` with all 18 changed paths:
*"none of 18 path(s) carry a change that can reach the race engine"*. No fingerprint was expected to
move, and none was minted.

---

## The short version

| part | what now exists | proven how |
| --- | --- | --- |
| (a) install, update, roll back | **one** procedure, in [DEPLOYMENT.md](../../docs/DEPLOYMENT.md); SETUP, DEPLOY-NOTES, ENVIRONMENT and README point at it | **followed literally twice** in a throwaway directory: an older commit installed from GitHub's archive, data created, updated, rolled back, the data checked after every step. The first run failed in three places; all three are fixed, and the second run passed end to end |
| (b) backup | `npm run backup`: the existing tool, target from `RA_BACKUP_DIR` | 4 new tests through `npm run` itself, one sabotage |
| (b) status | `npm run status`: health route, free disk, writable data directory, newest backup's age; exit 0 / 1 / 2 | 9 tests, one sabotage; ran for real in the literal run |
| (c) bind address | `RA_BIND_ADDRESS`, an IP address; **unset is today's exact `listen` call** | 11 tests, both values tested by listening on a real socket, one sabotage |
| (d) inventories | personal data; the 2026-08-31 delivery plan | read-only, below; two new BACKLOG rows |

---

## (a) Install, update and roll back — followed literally

### Which document owns it

There were three candidates. `docs/DEPLOYMENT.md` already declared itself the owner of deployment
and held a *Backing up, and upgrading* section. `docs/SETUP.md` owns the local developer machine.
`docs/DEPLOY-NOTES.md` owns the *gap* to "one command" and says it does not tell you how to deploy.
**DEPLOYMENT.md is the home.** Its *Minimal production start* and *Upgrading* blocks were folded into one
section, *Install, update and roll back — from a release download*. The others now point at it:
SETUP §8 and §9, DEPLOY-NOTES §1 and §2, the README's results section, and ENVIRONMENT's two new
variables.

### What the text prescribes, in one paragraph

A release is GitHub's source archive of a tag or commit. **Four places**: one directory per release,
which an update adds beside the old one; the data (`RA_DATA_DIR`, **outside** the release directory,
which is the step that makes an update safe); the backups (`RA_BACKUP_DIR`); and one settings file
loaded with `set -a; . file`. **Update** = install the new release beside the old one while the old one
serves, stop, back up, migrate with the new runner, start the new one. **Roll back** = stop, move the
current data aside, restore the pre-update backup into an **empty** directory, start the old release.
*Not `--force` over the current data:* a restore writes the archive's files and deletes nothing, so
files the newer version created would survive and the old version would start on a mix.

### The run

`proof.sh` executed every command in the section as printed. The only substitutions were the example
paths, moved into a throwaway directory under the session scratchpad (not OneDrive, not the owner's
tree); port **4391**, away from his 4000, 4173 and 5173; and `RA_PUBLIC_ORIGIN=http://127.0.0.1:4391`.
The tarballs were downloaded from GitHub with the doc's own `curl` line (the repository is public).

- **old** = `c9408a48` (master merge of 2026-09-26)
- **new** = `1b4b54ab` (run 1), then `3999d0c3` (run 2, the corrected text). Both are commits of this
  branch, which is master plus this piece.

**The data checked at every step:** a fresh sign-in; a session cookie saved at install time, which
lives in `sessions.sqlite`, so the SQLite backup path is exercised; a player group created on the old
version; and the number of accounts in `users.json`.

| step | run 2 result |
| --- | --- |
| install old, create the admin, restart without the token | admin created; the control (the previous text's command, no `Origin`) → `403 {"error":"origin required"}` |
| create data on old | group "Proof Group (created on the OLD version)" stored |
| check after install | session 200 · sign-in OK · group present · 1 account |
| update: install new beside old | old version **still serving** during the new install: yes |
| stop, back up | 29 items, 54,493,909 bytes; archive 54,516,736 bytes; `sessions.sqlite` via online backup; `races.sqlite` absent (the throwaway install had no races) |
| migrate with the new runner | `teams-1`, `race-source-1`: backfilled-from-state; exit 0 |
| start new | serves the built client; `running on port 4391 (bound to 127.0.0.1)` |
| check after update | session 200 · sign-in OK · group present · 1 account · **`npm run status`: all four OK, exit 0** |
| create a second group on new, then roll back | data set aside as `data.after-failed-update-<stamp>`; 29 items restored into an empty directory; exit 0 |
| check after rollback, on old | session 200 · sign-in OK · **only the old group**, as the text says · 1 account · the set-aside directory still holds the post-update group |

### Where following it literally FAILED, and what was changed

| # | what failed | why | fixed by |
| --- | --- | --- | --- |
| 1 | the first-admin `curl` answered **`403 origin required`** | `NODE_ENV=production` makes `RA_CSRF_STRICT=auto` strict, and a request with no `Origin` is refused (`server/src/auth/csrf.js:96-101`). The previous text's command sent none. **This was a fault in the text as it stood on master.** | the command now sends `-H "Origin: $RA_PUBLIC_ORIGIN"`, with a sentence saying why |
| 2 | run 1: the new release's client build failed with **`vite` not found**, so the new server started **without the app** | by the update, the shell had loaded the settings file, so `NODE_ENV=production`, and `npm ci` skips development dependencies. `vite` is one. **This was a fault in my first draft.** | `npm ci --prefix client --include=dev`, with a sentence naming the symptom |
| 3 | run 1: `npm run status` printed *all checks passed* and then exited **127**, with `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76` | `process.exit()` was called while the health check's `fetch` socket was still closing. A scheduler would have read a healthy install as failed. **A fault in my code, found only by the literal run.** | `process.exitCode` instead; the process ends when the socket closes. 15 of 15 runs then exited 0 in about 3 s. ★ **Honest limit:** the previous version did NOT reproduce it in 30 direct runs against a bare HTTP server, so the crash is intermittent; what was removed is its known trigger |

**Not run:** the Docker path (unchanged text, still DEPLOYMENT.md's *Docker* section), and a process
manager or systemd unit. The text says so where it mentions them. The run was on Windows, in Git Bash;
the commands are POSIX shell and nothing in them is Windows-specific.

---

## (b) `npm run backup` and `npm run status`

### Reused, not rebuilt

- **`scripts/backup.mjs`**: the whole tool. It keeps its consistent SQLite online backup, its
  refusals, and its **refusal to write the archive inside the data directory**. Added: the CLI takes
  its target from `RA_BACKUP_DIR` when `--out` is absent, and **`archiveTakenAt(name)`**, the reverse
  of `archiveName`, so the archive-name format stays one fact in one file.
- **`server/src/dataPaths.js` `resolveDataRoot()`**: status checks the directory the server writes.
- **`GET /api/health`**: the existing public route (`server/src/auth/guards.js:14`). Nothing was added
  to the server for status.

### What status reports

| check | passes when | default |
| --- | --- | --- |
| `api` | `GET <url>/api/health` → 200 with `status: "ok"` | `http://127.0.0.1:$PORT`, or `RA_BIND_ADDRESS` when it names one address |
| `disk` | free space where the data directory is ≥ `--min-free-mb` | 1024 MB |
| `writable` | a uniquely named probe file is written into the data directory and removed | — |
| `backup` | the newest `racearena-backup-*.tar` in `RA_BACKUP_DIR` is ≤ `--max-backup-age-hours` old | 26 h (daily plus slack) |

**Two choices worth knowing.**

- A backup's age is read from its **name**, not its file date, because copying an archive to another
  disk resets the date and would make a stale backup look fresh. A test pins this.
- **No backup directory configured is a FAIL**, not a skip. A green line there would be the silent
  pass this command exists to prevent.

Exit codes: `0` all passed, `1` at least one failed, `2` misuse.

### Tests, and the sabotage each survived

| file | new tests | sabotage | caught by |
| --- | --- | --- | --- |
| `scripts/backup.test.mjs` | 4 (archive-name round trip; `npm run backup` writes into `RA_BACKUP_DIR`; refuses inside the data directory; names both ways to give a target) | the CLI ignores `RA_BACKUP_DIR` | **2 tests went red**: the write test and the refusal test |
| `scripts/status.test.mjs` | 9 (each check passes and fails on its own fault; age by name; default URL; exit 0 / 1 / 2 through `npm run status`) | the backup-age check always passes | **3 tests went red** |
| `server/src/bindAddress.test.js` | 11 | `listenOn` drops the address | **1 test went red**, the loopback one |

Each sabotage was applied with `sed`, shown to have matched (a count of 1), run, and restored by
copying the original back.

---

## (c) `RA_BIND_ADDRESS`

`server/src/bindAddress.js`, new, 62 lines.

- **Unset or blank → `listen(PORT, cb)` with no host argument**, which is byte for byte the call
  `index.js` made before. The test listens and asserts `::` or `0.0.0.0`.
- **An IP literal → `listen(PORT, address, cb)`.** The test listens with `127.0.0.1` and asserts that
  address.
- **Anything else → the server refuses to start**, through the same gate and in the same `try` as
  `RA_PUBLIC_ORIGIN`, before anything is bound. A hostname is refused on purpose: it may resolve to
  several addresses, and "which interface is this listening on" would stop having a fixed answer.
- The startup line gains `(bound to <address>)` **only when set**. Unset, it reads exactly as before,
  which the dev-start skill relies on.
- **Not for a Docker container**: there the server must listen on the container's interface. The
  install text and ENVIRONMENT.md say to bind the published port instead.

---

## (d)1 · Personal data the server stores

**Facts only, no legal assessment.** Read at source on master; the owner's data files were opened
for structure only, and no name, username or e-mail was copied out. The data root is `RA_DATA_DIR`,
default `server/data` (`server/src/dataPaths.js:16-21`).

| # | data | where | written at | can it be deleted today, and how |
| --- | --- | --- | --- | --- |
| 1 | **User account**: `id`, `username`, `usernameNormalized`, `role`, `team`, `teamNormalized`, `sessionEpoch`, `createdAt`, `createdBy`. **No e-mail, no separate display name** | `users.json`, mode 0600 | `usersStore.js:242-264` (create), `:292-328` (update); via `POST /api/users`, setup, and `recover-admin` | **Yes**: `DELETE /api/users/:id`, admin only (`usersRouter.js:106-116`). The last admin cannot be deleted (`usersStore.js:347-353`), so that record goes only by hand |
| 2 | **Password hash** (bcrypt) | `users.json` → `passwordHash` | `usersStore.js:246`, `:322` | with the account; never returned by the API |
| 3 | **`createdBy`**: the creating admin's **username** | `users.json`, on each record | `usersStore.js:258` | **no route**: `updateUser` never touches it, so a deleted admin's name stays on the users they created |
| 4 | **Team membership** | `users.json` → `team`, `teamNormalized` | `usersStore.js:248-249`, `:317-318` | changed by `PUT /api/users/:id`; removed with the user |
| 5 | **A manual copy of an older users file**, with password hashes | `server/data/users.json.bak-20260801-234105` **on the owner's install** | **no code writes it**; a hand-made copy | by hand only |
| 6 | **Sessions**: `sid`, `userId`, `sessionEpoch`, cookie data, expiry. **No IP, no user agent** | `sessions.sqlite` | `authRouter.js:145-148`, `:213-216` | logout destroys your own. A password change makes old ones stale. **A deleted user's sessions are destroyed only at their next request** (`guards.js:123-127`). Expired rows are swept every 15 min (`session.js:90`). No admin route lists or ends sessions |
| 7 | **Session cookie**: HttpOnly, SameSite=lax, signed id | the browser | `session.js:96-109` | cleared at logout, otherwise expires after 30 days |
| 8 | **Setup marker**: `completedAt`, `adminId` | `setup-complete.json` | `authRouter.js:132-135` | by hand |
| 9 | **Admin-recovery audit log**: `{ts, action, username, outcome}` per line | `recover-admin-audit.log` | `recoverAdmin.js:23-27` | **by hand only**; append-only, never rotated |
| 10 | **IP addresses** | **memory only**, as rate-limiter keys (`rateLimit.js:16-40`, `:72-80`) | — | not persisted. **No request logger, no `x-forwarded-for` handling, no IP in any file** |
| 11 | console lines naming a user id or username (`authRouter.js:273`; `races.js:71-73`, `:104-106`) | stdout/stderr; under Docker, the container log | — | not stored by the app |
| 12 | **Player groups**: `name`, **`players[]`** (free text, possibly real people's names). Not team-scoped | `player-groups/<id>.json` | `playerGroups.js:143`, `:166`, `:191` | `DELETE /api/player-groups/:id`, operator or admin; a default group answers 403 until an admin clears the default. **A shipped group's file comes back at the next boot** (`seedDelivery.js:173-177`) |
| 13 | **Race history**: `rosters.content.names`, `races.results[].name`, `races.winners`, `team`. **No column for which user stored it** | `races.sqlite` (`raceStore.js:86-176`) | `raceStore.js:306`, `:403-404`, via `POST /api/races` | **no route and no script.** `races.js` has POST and GET only; UPDATE is blocked by triggers; DELETE is not blocked but nothing issues it. **By hand in the database file only** |
| 14 | **Brands**: free text that could name people | `brands/<id>.json` | `brands.js:211`, `:249`, `:324`, `:341`, `:353` | `DELETE /api/brands/:id`, operator or admin; a default brand answers 403 until cleared; a shipped brand returns at boot |
| 15 | **Brand logos** (images) | `brand-logos/` | `brands.js:321` | `DELETE /api/brands/:id/logo`; a shipped logo returns at boot if missing |
| 16 | **Track backgrounds** (images) | `backgrounds/` | `tracks.js:622` | `DELETE /api/tracks/:id/background`, or with the track. Unreferenced hash-named files only by hand |
| 17 | **Racer sprites** (images) | `racer-sprites/` | `racers.js:288`, `:291` | `DELETE /api/racers/:id/sprite`, `DELETE /api/racers/:id` |
| 18 | track backups (whole track records; not personal in themselves) | `tracks-backups/<date>/` | `tracks.js:253-264`, on every track write | never pruned; by hand |
| 19 | seed-redelivery notices (record names, not people) | `.seed-notices.json` | `seedNotices.js:59-67` | `POST /api/seed-notices/dismiss` clears all |
| 20 | **backups**: a tar of the **whole** data root, so everything above | `RA_BACKUP_DIR` or `--out` | `scripts/backup.mjs` | **no retention in code**; by hand |
| 21 | **exports** (`npm run data:export`): every data file that differs from the seeds | `--out`, default beside the repository | `scripts/data-export.mjs:106-121`, `:187-208` | no retention; by hand. Reads a fixed `server/data`, not `RA_DATA_DIR` (`:45`) |

**Not found anywhere:** an e-mail address, any mail or notification code, a request log, a stored IP
or user agent, an audit trail other than row 9. **Opened as a BACKLOG PART ONE row:** *PERSONAL DATA*.

## (d)2 · The delivery plan of 2026-08-31 / 2026-09-01

**Where the plan is written.** No verbatim owner wording of it is in the repository; it survives as
the paraphrase of three reports of 2026-08-31:

- `reports/evolution/SEED-SNAPSHOT-INVENTORY-1.md:1-7`
- `reports/evolution/SEED-SNAPSHOT-1.md:3-11`: the owner's runtime records become the shipped seeds,
  RUNTIME → SEEDS, one way
- `reports/evolution/SEED-REDELIVERY-1.md:33-34`: tracks *with* backgrounds, brands *with* logos;
  `:87-89`, `:255-262`: delivered whole, no restore and no keep-mine, "the small form"

The mechanism's own statement of the rule is `server/src/seedDelivery.js:10-30`.

| element | exists (file:line) | does not exist |
| --- | --- | --- |
| **tracks with backgrounds as shipped defaults** | 10 tracks in `server/seeds/tracks/`, 10 backgrounds in `server/seeds/backgrounds/`; each pair is one versioned unit (`server/seeds/versions.json:40-109`). A shipped track cannot be deleted (403, `tracks.js:563-567`) | **sameness with his installation.** Compared 2026-10-01: `searound` and `seatrack` differ from their seeds in `effects` (and `updatedAt`). The other 8 tracks and all 10 backgrounds are byte-identical |
| **default brand with logo** | `server/seeds/brands/seasonal-entertainment.json` + its logo, one unit (`versions.json:110-116`), byte-identical to his copies | his **second** brand, left out on purpose as test material (`SEED-SNAPSHOT-1.md:72-81`) |
| **default player group** | `server/seeds/player-groups/default-example-group.json` ("Example Group", 5 names), one unit (`versions.json:117-122`) | his other two groups, left out on purpose (same place) |
| **turning his installation into the shipped defaults** | `GET /:id/export-seed`, admin only, for tracks, brands and groups (`_defaultPromote.js:50-58`). It returns one record as JSON and **writes nothing**. `scripts/check-seed-versions.mjs` refuses a seed change without a raised version (pre-commit and `verify`, not CI) | **a committed command.** The 2026-08-31 copy was a one-off (`SEED-SNAPSHOT-1.md:53-66`); no script writes into `server/seeds`; raising a version is by hand |
| **re-delivery overwrites an operator's change, with a warning** | **Yes.** At boot, for each unit: no recorded version → adopt, copy only missing files, no warning; **shipped version higher → overwrite every file of the unit and record a notice** (`seedDelivery.js:162-170`); equal → restore missing files. Notices: `.seed-notices.json`, `GET /api/seed-notices`, shown as a banner on the setup screen: "Updated records replaced your settings … replaced in full" (`client/src/components/SeedRedeliveryNotice.jsx:78-83`, mounted at `SetupScreen.jsx:1053`) | a copy of the replaced record, or any way back. The banner names what was replaced, not what was lost. **Nothing has been redelivered yet**: every unit is at version 1 |

**Opened as a BACKLOG PART ONE row:** *THE DELIVERY PLAN OF 2026-08-31*.

---

## Files, lines before → after

| file | before | after |
| --- | --- | --- |
| `server/src/bindAddress.js` | 0 | 62 |
| `server/src/bindAddress.test.js` | 0 | 55 |
| `server/src/index.js` | 70 | 76 |
| `scripts/status.mjs` | 0 | 171 |
| `scripts/status.test.mjs` | 0 | 161 |
| `scripts/backup.mjs` | 327 | 341 |
| `scripts/backup.test.mjs` | 213 | 273 |
| `scripts/check-index.mjs` | 319 | 323 |
| `scripts/check-index.test.mjs` | 235 | 239 |
| `package.json` | 23 | 25 |
| `docs/DEPLOYMENT.md` | 250 | 421 |
| `docs/DEPLOY-NOTES.md` | 300 | 308 |
| `docs/ENVIRONMENT.md` | 122 | 124 |
| `docs/SETUP.md` | 249 | 258 |
| `README.md` | 217 | 220 |
| `docs/BACKLOG.md` | 5917 | 5995 |
| `docs/OPEN.md` | 493 | 501 |
| `reports/README.md` | 63 | 64 |
| `reports/release/` (this file, the morning sheet, the index) | — | new |

## Noticed and left

- **`npm run data:export` ignores `RA_DATA_DIR`** (`scripts/data-export.mjs:45`). The documents now say
  not to use it on the release layout; the script is unchanged. Added to the BACKLOG tidy list.
- **`server/data/README.md` is out of date**: it describes only first-boot copying, not redelivery by
  version. Not touched.
- **A backup has no checksum** (already on the tidy list), and no retention. Not touched.
- **The previous text's step list numbered "7" twice.** Gone with the rewrite.
- **Merging this branch and `tenancy/survey` will conflict, trivially**, in `reports/release/INDEX.md`,
  `docs/BACKLOG.md` and `docs/OPEN.md`. Both branch off master and both edit those files, as the brief
  required. Whichever merges second re-derives OPEN.md's count.

## Checks run

- `server`: `npx vitest run src/bindAddress.test.js`: 11 passed.
- `scripts`: `node --test scripts/backup.test.mjs`: 11 passed, 1 skipped (chmod is not honoured on
  Windows; existing). `node --test scripts/status.test.mjs`: 9 passed. `node --test
  scripts/check-index.test.mjs`: 9 passed.
- `npm run verify -- --premerge`: the result is in [MORNING-RELEASE-1](MORNING-RELEASE-1.md).
- `node scripts/engine-reach.mjs --check <all 18 paths>`: none can reach the engine.
- The throwaway install directory was deleted after both runs. Port 4391 was free afterwards. The
  owner's servers on 4000, 4173 and 5173 were not touched. **His working tree was switched to this
  branch for about 20 minutes at the start of the night and switched back to a clean `master`** once
  it was clear his servers run from it. The work then continued in a clone under `C:/tmp`. His
  servers were not restarted: the 4000 server is still the process started at 01:15 that day,
  and `server/scripts/dev-start.js` contains no watch and no spawn, so the branch never reached it.
