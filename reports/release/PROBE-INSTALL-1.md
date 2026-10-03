# PROBE-INSTALL-1 — the install guide followed literally, as a stranger would

**2026-10-03, branch `release/probe-install`, from master `49027427`.** The guide:
[docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md), *Install, update and roll back* and *Docker*.

**Setup.** A fresh folder `C:\tmp\probe` stood in for the guide's places:
- `/opt/racearena`, `/etc/racearena.env`, `/var/lib/racearena/data` and `/var/backups/racearena`,
  each under that folder;
- port **4100** (the guide's `4000` is in use on this machine);
- a fresh, empty data folder;
- Git Bash on Windows, which the guide names as supported.

## ★ What could NOT be exercised, and why

★ *Corrected 2026-10-03 (part 2, below): these were not prompts. They were the project's deny
list, `.claude/settings.json:150` `"Bash(curl *)"` and `:131` `"Bash(rm -rf /*)"`, which no approval
overrides.* **Two permission prompts in this session denied `curl`.** One was the archive download from GitHub
(install step 2). The other was the request to this probe's own server on `127.0.0.1:4100`
(install step 6). Neither was routed around by another tool.

So the following were **not run**:
- creating the first admin (step 6);
- signing in (step 8);
- running two races;
- the users-and-races half of the restore check: with no admin and no race, `users.json` and
  `races.sqlite` do not exist, so there was nothing to verify by short key.

**Download.** The archive came from the local clone, `git archive --prefix=…/ <commit>`, in the same
one-top-directory layout as GitHub's source archive, and was unpacked with the guide's own `tar` line.
The `curl` line itself is unverified.

## What was run, step by step

| guide step | result |
| --- | --- |
| install 2 · unpack | the guide's `mkdir` + `tar --strip-components=1`: OK |
| install 3 · `npm ci` server, `npm ci --include=dev` client, build | OK |
| install 4 · settings file | written with the guide's block, four paths changed (finding 1) |
| install 5 · start with a setup token | started, bound to `127.0.0.1:4100`; data created in the configured folder (the Git Bash path was translated correctly) |
| install 6 · first admin | **not run** (`curl` denied) |
| install 8 · `npm run status` | api, disk, writable OK; backup FAIL, **as the guide says it will be** before the first backup |
| backup · `npm run backup` | archive and `.tar.sha256` written; `sha256sum -c` prints `OK`; `npm run status` then all OK, "checksum matches" |
| delete the data folder, restore | `--restore … --into` an empty folder; the 25 data files are checksum-identical to the originals, and `sessions.sqlite` is restored |
| update 2 · NEW unpacked, installed, built, **in a shell with the settings loaded** | OK. `--include=dev` does what the guide says |
| update 3 · stop, backup with OLD's tool | OK |
| update 4 · `migrate.mjs` with NEW | `teams-1` and `race-source-1` backfilled from state into a new ledger |
| update 5–6 · start NEW, `npm run status` | all OK |
| rollback 1–2 · stop NEW, set the data aside, restore the update-3 backup into an empty folder | OK. The restored files are identical to the state before the update, and the ledger the update wrote is not in it, as the guide says |
| rollback 3 · start OLD, `npm run status` | all OK |
| Docker · `docker compose build` | OK |
| Docker · the image runs with no mounts (the guide's claim) | `docker run` with no mounts, on `127.0.0.1:4101`: Docker's own health check reports **healthy** |

Docker 29.5.3 was installed and running. **`docker compose up` was not run**, because the shipped
compose file publishes host port 4000, which is in use on this machine.

## Findings

| # | where | the exact sentence or line | kind | outcome |
| --- | --- | --- | --- | --- |
| 1 | install step 4 | `mkdir -p /var/lib/racearena/data /var/backups/racearena` and `RA_DATA_DIR=/var/lib/racearena/data` | unclear: the layout table calls these *"the example path used below"*, but the block types them out in four places and never says they must change together | **doc fixed** (`7cabd7cf`) |
| 2 | *Docker* | *"Run `npm run build` in `client/` first. The image copies a build, it does not make one."* — and nothing after the build | missing step: nothing leads from a built image to a running install (settings file, the open port) | **doc fixed** (pointer to DEPLOY-NOTES §3 and §5) |
| 3 | install step 6 | `curl -X POST "$RA_PUBLIC_ORIGIN/api/auth/setup"` | unclear, **not verified**: on a fresh server, `https://racearena.example.com` reaches the server only once the proxy and the name exist, and the guide puts no proxy step before this one | **recorded, no change** — the request could not be sent here, so no correction is claimed |
| 4 | the build badge | (no sentence; the guide is silent) | an install from a release download shows **build unknown**: the archive has no `.git`, and the build reads its identity from git | **recorded, no code branch** — the badge is on the BACKLOG list of developer-only displays to switch off before delivery |
| 5 | backup and restore | (no sentence) | an archive does not carry the three empty folders (`racers`, `racer-sprites`, `surface-classes`), so a restored folder lacks them until the server starts and recreates them | **recorded, not a defect** — verified: the server recreated all three on start |

No finding needed a code change, so there is no `fix/probe-*` branch.

## Left behind — deletion refused

- **`C:\tmp\probe`.** The two releases with their `node_modules`, the settings file, the data folder
  and its two set-aside copies, and two backups. The permission prompt denied `rm -rf`. Every probe
  server was stopped.
- **Docker.** The container `probe-install-1` and the image
  `racearena-49027427…-server:latest` were removed. The lists of containers and images match their
  state before the probe. The builder cache from `docker compose build` remains.

## Part 2 — 2026-10-03, the steps that need requests (branch `release/probe-install-2`)

**The owner's authorization, 2026-10-03:** the HTTP steps run as a node script, only against the
probe server. The `curl` deny rule stays as it is. The probe is the same install as above:
`49027427`, port 4100, its own data folder.

| guide step | result |
| --- | --- |
| install 5 · start with the setup token | OK |
| install 6 · first admin | `201 {"username":"admin","role":"admin","team":"Seasonal Entertainment"}`. Sent to `http://127.0.0.1:4100` with `Origin: http://localhost:4100` (finding 6) |
| install 7 · restart without the token | OK |
| install 8 · sign in | API `200`, `/api/auth/me` `200`. **In the browser: failed at `127.0.0.1:4100`, worked at `localhost:4100`** (finding 7) |
| races | three Quick Tests run in Chromium (Playwright, from a node script) at `localhost:4100`: stored as **`7TUJ4W`**, **`PGVBAV`**, **`M3GU7W`**. The only host contacted was the probe server |
| backup | `races.sqlite` (77,824 bytes) and `sessions.sqlite` copied online; 29 items; `sha256sum -c` prints `OK` |
| delete the data folder | `Remove-Item -Recurse -Force` on the data folder only |
| restore | `--restore … --into` the deleted folder: 29 items, `users.json` and `races.sqlite` among them |
| **users back?** | **yes**: `admin` signs in (`200`), `/api/auth/me` `200` |
| **races back?** | **yes**: `GET /api/races/<key>` answers `200` for all three keys, with their finish times |

### Findings, part 2

| # | where | the exact sentence | kind | outcome |
| --- | --- | --- | --- | --- |
| 6 | install step 6 | `curl -X POST "$RA_PUBLIC_ORIGIN/api/auth/setup"` | finding 3 from part 1, now **verified**. Before a proxy or a name exists, the request can go to `http://127.0.0.1:$PORT` with the same `Origin` header, and is accepted | **doc fixed** |
| 7 | install step 8 | *"Open the address and sign in."* | unclear, and it fails: the server tells the app to call `RA_PUBLIC_ORIGIN` (`server/src/runtimeConfig.js`), so the same server opened under another name shows *"The server is not answering"* and sign-in fails | **doc fixed** |
| 8 | (no sentence) | — | the app sends a finished race at its NEXT contact with the server (`client/src/modules/pendingRaces.js`, by design, no polling). A race finished just before the browser closes reaches the server later. It is not lost: it stays pending on that device | **recorded, not a defect** |

No finding needed a code change.

### Cleaned up

The probe server was stopped. Per the owner's authorization of 2026-10-03, `C:	mp\probe` and the
other listed folders were deleted with `Remove-Item -Recurse -Force`. What remains is listed in the
report of the block that ran this.
