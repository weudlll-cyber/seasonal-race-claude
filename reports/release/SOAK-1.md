# SOAK-1 — does the server keep working for months? (2026-10-07)

**Measured, not built.** The question, dated 2026-10-06: the server is to run for months on a Linux
VPS and must keep working, and nothing is concluded without being checked. The state examined is
**`56bdb8d7`** (`review/2026-10-06`): master plus the test-aids switch plus the winners removal.
Three parts:
- **A**, a static audit of the production server;
- **B**, a 9-hour soak of the Docker image under load far above real use;
- **C**, an all-night test of the dev server's build badge on Windows.

The harness is in [SOAK-1/](SOAK-1/). The raw samples are outside the repository, in
`C:\Users\weudl\ra-measure\SOAK-1\`.

## The verdict, one line each

| line | result | verdict |
| --- | --- | --- |
| crashes, restarts, OOM, 5xx | none in 9 h and 566,225 requests; healthy in 541 of 541 samples | **PASS** |
| failed requests | **8 connection errors** on the client side (no HTTP status), every one during a verify | **FAIL** — cause established under *Causes* |
| memory floor after load (RSS) | 92.3 → 95.9 MiB over 9 h while stored races grew 1,492 → 13,424 | **PASS — flat** |
| memory peak under load (RSS high-water) | 183 → 544 MiB, rising with the number of stored races | **PASS for 90 days**; grows with the data, see *Causes* |
| CPU, threads, descriptors, processes | no trend; 11 threads all night; 21–32 descriptors; 1 process | **PASS — flat** |
| disk: race store | 10,125 bytes per stored race; 54 MiB in 90 days | **PASS** (grows without bound, by design) |
| disk: sessions | about 360 bytes per live session; bounded by the 30-day expiry | **PASS** |
| disk: container log | 94 bytes, unchanged all night | **PASS** (no size limit configured) |
| latency outside verifies | medians 5–17 ms; period evaluation 242 ms at 13,424 races, +36 ms per 1,000 | **PASS for 90 days** |
| latency during a verify | every route waits behind it: 1.5–5.4 s | **FAIL** — over one second from day one |
| C: git children per source save | **0** over 16,093 saves | **PASS** |
| C: process-creation errors | none in 9 h | **PASS** |
| C: build badge | commit and branch right 10 of 10 times; **the dirty mark was wrong** | **FAIL** — the row stays open |

## Part A — the static audit (server/src, server/utils, shared/ at 56bdb8d7)

56 production files, 7,096 lines, tests and `server/scripts` excluded. Where the image carries more
than that, it is said.

**A1 · Child processes: none.** An uncapped search of the 56 files for `child_process`,
`node:child_process`, `spawn`, `exec`/`execSync`/`execFile`, `fork`, `worker_threads`, `Worker` and
`cluster` matches only:
- SQLite's `db.exec` (`raceStore.js:210-211`, `migrateRaceSource.js:87`,
  `migrateClientIdPerTeam.js:112-116`).

The same search over the 153 engine files the image also carries, for verify, matches only:
- a regular expression's `.exec`;
- the particle generators' `spawn` methods;
- comments.

The image's `HEALTHCHECK` (`server/Dockerfile:210`) starts a short-lived `node -e` every 30 s. That
is Docker's process, not the server's: the soak saw it as up to 3 processes for a moment, and 1 the
rest of the time.

**A2 · In-memory structures that grow with use**

| structure | file:line | what bounds it | verdict |
| --- | --- | --- | --- |
| login, setup and change-password rate-limit tables (express-rate-limit 8.5.2 `MemoryStore`) | `server/src/auth/rateLimit.js:89-91` | two maps swapped every window (15 min, 60 min, 15 min) by an unref'd interval in the library, so a key lives at most two windows | **time-bounded, no count cap.** The key is the client address, and with `trust proxy` at `app.js:34` it comes from `X-Forwarded-For`. Behind a proxy that is the visitor's address. **A port reachable without the proxy lets the caller choose its key**, and so bypass the limit and grow the table. The soak drove 4,484 never-seen addresses through it with no trace in memory. |
| tracks, brands, racers, player groups, surface classes | `routes/tracks.js:62`, `brands.js:77`, `racers.js:60`, `playerGroups.js:55`, `surfaceClasses.js:50` | mirror the files on disk; DELETE removes the entry | bounded by what people create |
| the users write queue | `server/src/auth/usersStore.js:195-199` | a promise chain whose finished links are released | bounded |
| seed notices | `server/src/seedNotices.js:63` | keyed by unit; boot-time delivery only | bounded |
| engine caches reached by verify | `client/src/modules/raceBehavior.js:25-38` and others | cleared every step (`:569-574`), or browser-only and returning before they store anything under Node (`storage/configReport.js:59`, `storage/storage.js:77`) | bounded |
| **a period evaluation's working set** | `server/src/races/raceStore.js:574-582` via `routes/races.js` (the `/evaluation` route) | **nothing: every race in the period is read and fully hydrated at once**, roster and world included, though the evaluation reads two fields | **transient, but grows with the data**; see *Causes* |

**A3 · Timers.** **The server's own code sets no timer anywhere** (search: `setInterval`, `setTimeout`,
`setImmediate`). Its libraries set four, each one created once at start-up and never again, so none
can pile up:
- the session store's expiry sweep, every 15 min (`server/src/auth/session.js:90`; the library starts
  it unconditionally, as the note at `:84-87` records);
- the three rate-limit window swaps (unref'd).

The soak saw 11 threads, unchanged for 9 hours.

**A4 · On disk, growing over time**

| what | where it is written | retention | 90-day figure (assumption below) |
| --- | --- | --- | --- |
| stored races | `races.sqlite`, `raceStore.js` | **none — rows are immutable by trigger** (`raceStore.js:211`) | 54 MiB |
| sessions | `sessions.sqlite` | expired rows are DELETED every 15 min; each row lives 30 days after its last use | ~0.3 MiB, bounded |
| **track backups** | `tracks-backups/YYYY-MM-DD/`, `routes/tracks.js:253`, called at `:525`, `:553`, `:589`, `:631` | **none.** One full copy on every track create, edit, background change. `docs/TRACK_LIFECYCLE.md:158` says "No auto-cleanup" | one track file (10–60 KB) per save, for ever |
| the admin-recovery audit log | `recover-admin-audit.log`, `auth/recoverAdmin.js:26` | none; written only by the recovery command | negligible |
| uploads (logos, sprites, backgrounds) | `brands.js:321`, `racers.js:288`, `tracks.js:622` | the old file is deleted on replace (`:318`, `:285`, `:619`) and on delete | bounded by entities |
| `.tmp` files | `server/utils/atomicWriteJson.js` | swept at boot (`index.js:50`) | bounded |
| **the container log** | Docker's `json-file` driver | **the shipped `docker-compose.yml` sets no `logging:` options, so no size limit** | the server wrote 94 bytes in 9 h; growth comes only from warnings, and nothing logs per request |

**A5 · Session expiry: expired sessions ARE removed.** `better-sqlite3-session-store` 0.1.0 runs
`DELETE FROM sessions WHERE datetime('now') > datetime(expire)` every 15 minutes (the library's
`src/index.js:49-62`).
- A logout DELETES its row (`authRouter.js:231`, through the store's `destroy`). The soak's 6,738 logouts left
  nothing behind.
- What stays is a session that never signs out. It stays for 30 days after its LAST use: express-
  session's `touch` moves the stored expiry forward on every request (`resave: false`, a store with
  `touch`).
- **The browser's cookie is NOT moved.** It expires 30 days after sign-in (`session.js:107`), because
  the cookie is only re-sent when the session changes.

So **a person who uses the app daily is signed out on day 30**, and their row is deleted 30 days
after their last request.

**A6 · Anything that could break after weeks or months.**
- No counter that can wrap. `sessionEpoch` (`usersStore.js:324`) moves on password changes only.
- No token rotation. One session secret, read at start; changing it signs everybody out, as
  `docs/DEPLOYMENT.md` says.
- Short keys: 31^6 ≈ 887 million (`shared/raceShortKey.mjs:54-60`), 8 attempts per insert
  (`raceStore.js:77`). 90 days of use is ~5,400 keys, a collision chance per insert of under one in
  160,000, and a retry absorbs one.
- Dates are ISO strings compared as strings; the evaluation caps a period at 366 days
  (`routes/races.js:79`).
- The only clocks are the 30-day cookie above and the 15-minute sweep. Neither breaks.

## Part B — the soak

**Setup, as an install would run it.** The image was built from the clone at `56bdb8d7`, from
the repository root, as `docs/DEPLOYMENT.md` says. It was started with
[SOAK-1/compose.soak.yml](SOAK-1/compose.soak.yml):
- own project name, own port on 127.0.0.1, a fresh named volume;
- `NODE_ENV=production` and the settings file's variables (`RA_COOKIE_SECURE=auto`,
  `RA_CSRF_STRICT=auto`, `RA_PUBLIC_ORIGIN`, a generated session secret);
- the image's own command, `restart: unless-stopped`, and no logging options, as shipped.

The first admin was made with the bootstrap token (DEPLOYMENT.md step 6), then two organizers in two
teams (step 9) through `POST /api/users`. Every request carried `X-Forwarded-For` and
`X-Forwarded-Proto: https`, as a reverse proxy would send them.

**Run:** 2026-10-06 22:37 → 2026-10-07 07:37 UTC, **9 hours**.
- One sample every 60 s: **541 samples**, the last 20 after the load stopped.
- Idle minutes 50–59 of every hour; 50 active minutes an hour at about 21.7 requests a second.
- A first start was aborted at minute 3 for a harness fault: the evaluation window exceeded the
  route's 366-day limit by milliseconds. Its data was discarded and the volume replaced.

**Requests sent: 566,225**

| kind | n |
| --- | --- |
| static files (shell, `/setup`, JS, CSS) | 229,749 |
| tracks, brands, player groups, racers | 126,865 |
| race history (pages of 20) | 52,875 |
| single stored race | 52,872 |
| test-aids read · switch (admin) | 26,643 · 45 |
| period evaluation (the whole stored history of the team) | 13,419 |
| points rule read · save (admin) | 13,420 · 450 |
| race saved (three teams in turn) | 13,424 |
| sign-in → `me` → sign-out → `me` (401) | 6,738 cycles |
| sign-in never signed out | 450 |
| failed sign-in, one fixed address · a new address each time | 4,484 · 4,484 |
| verify (admin) | 89 |

**Status codes:** 200 ×537,087 · 201 ×13,424 · 401 ×11,582 · 429 ×4,124 · **5xx ×0** ·
connection error ×8. Every 401 and 429 was expected:
- the fixed address got exactly 10 failures a window before its 429s (36 windows × 10 = 360 401s,
  the other 4,124 were 429s);
- every new address got its 401;
- every `me` after a sign-out got 401.

**All 89 verifies answered identical.** Server time: 20 racers median 1.7 s (1.5–2.3 s, n = 43);
40 racers median 4.3 s (3.5–5.4 s, n = 46).

**What was NOT measured.** The V8 heap: reading it from the container needs a debugger port or a
privileged container, and neither was used. RSS stands in, and step 2 reads the heap in-process
instead. The container log's FILE size: it lives inside the Docker host. The content `docker logs`
returns was measured instead; the `json-file` driver adds a fixed per-line wrapper on top of it.

### Slopes after the 30-minute warm-up (511 samples, 8.5 h)

| measure | first → last | min–max | per hour | per 10,000 requests | flat? |
| --- | --- | --- | --- | --- | --- |
| node RSS, MiB | 127.5 → 96.0 | 91.8–442.1 | +12.6 (r² 0.24) | +2.0 | the line is the peaks; **the floor is flat** (below) |
| container memory (docker stats), MiB | 88.3 → 54.7 | 49.5–553.5 | +27.9 (r² 0.54) | +4.4 | the same peaks, plus page cache |
| CPU, % of a core | — | 0–199.6 | +4.1 (r² 0.05) | +0.65 | **flat** |
| open descriptors | 25 → 21 | 21–32 | +0.15 (r² 0.02) | +0.02 | **flat** |
| threads | 11 → 11 | 11–11 | 0 | 0 | **flat** |
| processes | 1 → 1 | 1–3 | 0 | 0 | **flat** (the healthcheck's `node -e`) |
| `races.sqlite`, MiB | 8.7 → 129.9 | — | +14.4 (r² 1.00) | +2.29 | grows with races: **10,125 bytes per race** (12,558 races in the window) |
| `sessions.sqlite`, KiB | 24 → 184 | — | +19 (r² 0.995) | +3.0 | grows with sessions never signed out (454 of them): ~360 bytes each |
| all other data files, KiB | 53,205.5 → 53,205.5 | — | 0 | 0 | **flat** |
| container log, KiB | 0.09 → 0.09 | — | 0 | 0 | **flat** |

### The memory floor after each idle phase, against the stored data

The RSS a process returns to after ten minutes without a request is what it kept. Each value below is the last sample of that hour's idle phase.

| hour | at (UTC) | races stored | `races.sqlite`, MiB | **RSS floor, MiB** | container, MiB | RSS high-water so far, MiB |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 23:36 | 1,492 | 14.5 | **92.3** | 52.3 | 183 |
| 2 | 00:36 | 2,982 | 28.9 | **94.5** | 52.8 | 198 |
| 3 | 01:36 | 4,475 | 43.3 | **95.1** | 53.2 | 248 |
| 4 | 02:36 | 5,967 | 57.8 | **95.1** | 50.8 | 308 |
| 5 | 03:36 | 7,459 | 72.2 | **95.9** | 51.4 | 353 |
| 6 | 04:36 | 8,951 | 86.7 | **95.6** | 50.9 | 369 |
| 7 | 05:36 | 10,441 | 101.1 | **95.4** | 50.0 | 441 |
| 8 | 06:36 | 11,933 | 115.5 | **95.7** | 172.6 | 486 |
| 9 | 07:36 | 13,424 | 129.9 | **95.9** | 186.1 | 544 |

- **The floor is flat:** +3.6 MiB over 9 hours, almost all of it in the first three (fit from hour
  2: +0.16 MiB an hour).
- **The high-water mark climbs with the stored races:** about 30 MiB more for each 1,000 races.
- The container figure in hours 8–9 is page cache from the growing database. It fell back to 54 MiB
  once the load stopped (07:38).

**The 30-minute run with no load** (fresh volume, same image and settings, 31 samples) settled at
62–64 MiB RSS within five minutes. Over the run: threads 11, descriptors 20, 1 process, data and log
unchanged, healthy throughout. So that is warm-up, not growth, and the first hour of the soak is
warm-up too.

### Latency, active minutes after the warm-up (≈ 425 minutes)

| group | requests | median p50 | median p95 | median p99 | worst minute p99 | minutes p99 > 1 s | of them without a verify in flight |
| --- | --- | --- | --- | --- | --- | --- | --- |
| static | 209,363 | 5.2 ms | 159 ms | 261 ms | 2,040 ms | 6 | 4 |
| content lists | 115,992 | 9.3 ms | 155 ms | 256 ms | 3,636 ms | 8 | 5 |
| single race | 48,435 | 15.1 ms | 172 ms | 254 ms | 3,628 ms | 10 | 6 |
| race history | 48,429 | 16.6 ms | 169 ms | 247 ms | 3,742 ms | 11 | 7 |
| settings (test aids, points rule) | 37,164 | 10.3 ms | 100 ms | 285 ms | 5,545 ms | 92 | 11 |
| race save | 12,300 | 14.6 ms | 32 ms | 57 ms | 4,986 ms | 64 | 6 |
| **period evaluation** | 12,295 | **242 ms** | 332 ms | 486 ms | 5,001 ms | 81 | 18 |
| sign-in and out (bcrypt cost 12) | 33,333 | 8.5 ms | 282 ms | 510 ms | 6,266 ms | 110 | *not separable*¹ |
| verify | 84 | 3,836 ms | — | — | 5,573 ms | 84 | — |

¹ The sign-in lanes did not record whether a verify was in flight. Their slow minutes fall every five
minutes, on the verify ticks.

- **Every group's p99 rises with time, by 64–77 ms an hour** (evaluation 98 ms). That is not a slow
  leak; the floor above is flat.
- **The period evaluation's median rises by 36 ms for every 1,000 stored races** (r² 0.66,
  intercept 1.8 ms). It holds the event loop for that long, synchronously, on every call; the other
  routes queue behind it.
- **A verify stops everything for its whole length**, which is what the minutes over one second are.

### 90 days, at a stated real-world rate

**Assumption:** one installation, two organizers and an admin. 60 races a day in all (30 per
organizer, generously); 10,000 requests a day including static files; 30 sign-ins a day, ten of them
never signed out. A VPS with **1 GiB** of memory and **20 GB** of free disk; the container has no
memory limit of its own (the shipped compose file sets none). Over 90 days that is 5,400 races,
900,000 requests and 2,700 sign-ins.

| line | 90-day figure | limit | verdict |
| --- | --- | --- | --- |
| RSS floor | +0.072 MiB per 10,000 requests → **~102 MiB** | 1 GiB | **PASS** |
| RSS peak during an evaluation | ~30 MiB per 1,000 races stored → **~250 MiB** at 5,400 races | 1 GiB | **PASS** — reached at ~30,000 races (~500 days at this rate, sooner if one team holds most of them) |
| race store | 10,125 B × 5,400 = **54 MiB** | 20 GB | **PASS** |
| sessions | ≤ 900 live rows × ~360 B = **~0.3 MiB** (30-day bound) | 20 GB | **PASS** |
| track backups | one copy per track save, never removed | 20 GB | **PASS at any plausible rate** (1 GB is ~30,000 saves of a 30 KB track) — but unbounded |
| container log | 0 bytes per 10,000 requests measured | 20 GB | **PASS** — but unlimited if warnings start |
| period-evaluation latency | 1.8 ms + 36.1 ms per 1,000 races → **~197 ms** at 5,400 | 1 s | **PASS** — 1 s at ~27,600 races (~460 days) |
| latency during a verify | 1.5–5.4 s for every route, from the first day | 1 s | **FAIL** |
| failed requests | 8 in 566,225, all during a verify | 0 | **FAIL** until explained |

## Part C — the build badge on the Windows dev server (row `0xC0000142`)

A second clone ran the Vite dev server (`client/vite-plugin-ra-build.js`) on port 5610, hidden, for
**9 hours** (2026-10-06 22:36 → 2026-10-07 07:36 UTC), with `GIT_TRACE2_EVENT` pointed at a file
so that every git it started was recorded. [SOAK-1/partc-saver.mjs](SOAK-1/partc-saver.mjs)
rewrote a client source file every 2 s (**16,093 saves**) and committed once an hour (**8 commits**).
It also read the badge (the served `virtual:ra-build` module) at the start, 10 s after every commit,
and at the end, and compared it with git's own answer.

| question | measured |
| --- | --- |
| git invocations in all | **86** (no nested children) |
| — at start-up | 5 (`rev-parse` ×4, `status` ×1) |
| — caused by my badge reads (the module's `load()`) | 27 (9 reads × 3) |
| — after a git file moved (commits) | 54: two to three re-checks per commit, because a commit writes the index more than once |
| — anything else | **0** (one call ran 56 ms before the commit's own log line; it is the commit's index write) |
| **git children per source save** | **0 over 16,093 saves** |
| commit and branch on the badge | **right 10 times out of 10** (start, after each of 8 commits, end) |
| **the dirty mark** | **wrong.** The tree was modified for almost the whole night, and the badge never once said `+dirty`. At the end: badge `7d787624 · soak-c-local`, git `7d787624 · soak-c-local +dirty` |
| process-creation errors (`0xC0000142`, `3221225794`, `UNREADABLE`) in the dev server's output | **none** (12 lines, the 8 changes among them) |

**Why the dirty mark is wrong.** Since 2026-09-25 the plugin re-reads the identity only when
`.git/HEAD` or `.git/index` change (`gitMoved()`, shared by the watcher and the 500 ms poll). A
source save changes neither, so a tree that becomes dirty is not noticed until the next git
operation. That is the price of removing the per-save spawns.

**The row's rule:** close it only if no git child is spawned per save, the badge stays correct all
night, and no process-creation error occurs. Two of the three hold; **the badge does not**. **The
row stays open**, with these numbers written into it.

## Causes

*Established by experiment in step 2 of the follow-on block, 2026-10-07. Raw data in
`C:\Users\weudl\ra-measure\SOAK-1\2a-restart`, `2a-inproc`, `2b`.*

### Memory — verdict: **DATA-PROPORTIONAL**, in the period evaluation. Not a leak.

**1. Restart on the same volume, same load (Docker, 80 minutes, 81 samples).**
- Before the restart, the floor was 96.2 MiB (07:56 UTC).
- Restarted on the SAME volume (13,424 races, 130 MiB), it idled at **57–63 MiB** for 10 minutes.
- Within **five minutes** of the same load, RSS was 234 MiB and the high-water mark 488 MiB. The
  9-hour run reached that level only in its last two hours, when it held that many races. The run
  went on to a high-water mark of 575 MiB.
- After the idle phase the floor was **96.3–97.3 MiB**, the same as before the restart.

So the peaks follow the stored data, not the requests served: a fresh process at the same data size
peaks at once.

**2. The heap, read in-process** ([inproc.mjs](SOAK-1/inproc.mjs): the unchanged app imported into a
node process, on a copy of the soak's data, 15,215 races; 61 minutes, the same load for 50 of them).

| snapshot (after a full GC) | heap used | total in snapshot |
| --- | --- | --- |
| 0 min | 10.0 MiB | 12.9 MiB |
| 30 min | 17.4 MiB | 20.4 MiB |
| 61 min | 16.9 MiB | 19.8 MiB |

The diff ([heapdiff.mjs](SOAK-1/heapdiff.mjs)) from 0 to 30 minutes:
- +3.6 MiB of compiled code and +2.7 MiB of strings, which is JIT and interned-string warm-up;
- nothing of the server's: no Map, array or object type grows.

From 30 to 61 minutes the heap SHRANK by 0.6 MiB. Under load, the heap in use swung between 15 and 173
MiB, and between snapshots it went back down every time.

**3. What one request holds at once**, measured at 15,215 stored races. It is the heap still
referenced after a full GC while the result is held.

| request | held | time |
| --- | --- | --- |
| **period evaluation, full period** — `listRacesInPeriod` (`server/src/races/raceStore.js:574-582`) | **37.8 MiB for 5,071 races**, to answer 40 rows (0.04 MiB) | 750–820 ms |
| race history, one page of 20 | 0.15 MiB | 3 ms |
| a stored race | 0.02 MiB | 1 ms |
| verify (one replay) | 1.8–2.2 MiB | 0.9–3.0 s |

**The structure:** `listRacesInPeriod` `.all()`s the period and `hydrate`s every race (roster, world
configuration, results), though `evaluatePeriod` reads `raceSource` and `results` only. Its size is
the period's race count times about 7.5 KiB, so the peak grows with the data and the floor does not.

### A verify blocks the event loop, and the 8 connection errors come from that — CONFIRMED

**How long one verify blocks the loop.** This was measured with `monitorEventLoopDelay` in the
harness. The loop's longest delay equals the replay's length:
- in the in-process server, **up to 10.0 s** under a concurrent client;
- in [compare-verify.mjs](SOAK-1/compare-verify.mjs), **1.8–5.4 s** (n = 6).

**The connection errors, reproduced** ([keepalive.mjs](SOAK-1/keepalive.mjs)). Each arm ran 8 clients
for 160 s, a verify every 20 s (8 verifies), against the in-process server:

| arm | requests | connection errors | the longest wait |
| --- | --- | --- | --- |
| A — keep-alive connections, verifies | 1,450 | **4**, all `ECONNRESET`, all on a REUSED connection, 4.3–5.5 s into a verify | 5.5 s |
| B — a new connection per request, verifies | 1,474 | **0** | 9.8 s |
| C — keep-alive connections, no verify | 1,427 | **0** | — |

**The mechanism.** Node's HTTP server closes a keep-alive connection that has been idle for 5 s.
During a verify no timer can run. When the replay ends, the overdue timers fire before the waiting
requests are read, so a connection on which a request has just arrived is closed under it. Only
verifies longer than about 4.4 s did it here (the four 40-racer ones), which is why short verifies
never did.

**What a browser user sees: only a wait.** [browser-wait.mjs](SOAK-1/browser-wait.mjs) ran
Chromium, through Playwright, against the same server: 8 fetch loops on the page while 8 verifies of
40-racer races ran (5.4–7.0 s each).
- 829 fetches, **0 errors**, the longest wait **6.9 s**.
- The browser resends a request that fails on a reused connection before any answer, so a person
  waits and never sees the error.
- The soak's Node client does not resend, which is why it counted them.

## The two fixes, and their A/B soaks (2026-10-07)

Each fix is on its own branch from master (`c9ca4584`), pushed and **not merged**. The merges come
later, with the owner present.

| | `fix/bounded-period-evaluation` (`0e8b38c7`) | `fix/verify-off-main-thread` (`e3138785`) |
| --- | --- | --- |
| what changed | the store streams `race_source` and `results`, one row at a time, instead of hydrating the whole period (`server/src/races/raceStore.js`, `raceResultsInPeriod`) | the replay runs on a worker thread (`server/src/races/verifyOffMainThread.js`, `verifyReplay.worker.js`); one verify at a time per server, a second one gets 429; the replay code is unchanged |
| answers against the old path, on the soak's data | **byte-identical** in 9 of 9 (3 teams × a full year, one hour, an empty period; [compare-eval.mjs](SOAK-1/compare-eval.mjs)) | **identical** in 24 of 24 stored races ([compare-verify.mjs](SOAK-1/compare-verify.mjs)) |
| the targeted measure, directly | live memory during a 5,072-race evaluation: **37.79 → 0.02 MiB**; time 643–657 → 125–152 ms | the main thread's longest block during a verify: **1.8–5.4 s → 20–26 ms** (n = 6) |
| new tests, each sabotaged red once | streaming (red when the old body returns), byte-identical on a fixture of his kind of data (red when the order or the source field is wrong) | health answers in < 200 ms during a verify, a second verify gets 429 (both red with the replay back on the main thread / without the one-at-a-time check), answer = the replay's own |
| server suite · premerge · Browser gate | 924/924 · 21 pass, 0 fail, no fingerprint in reach · 125 passed, 1 skipped | 925/925 · 21 pass, 0 fail, no fingerprint in reach · 125 passed, 1 skipped |

**The A/B soaks.** Two hours per arm, one after the other, never two at once: master, then each fix.
- Each arm started from **the same copy** of the soak's data: 15,215 races, made after step 2a.
- The load was the soak's mix; the sampler was the soak's.
- The arms ran from 2026-10-07 18:10 to 2026-10-08 00:11 UTC.
- The test-aids route is not on master or on either branch yet (`feat/test-aids-switch` is
  unmerged), so its reads were 404 in every arm alike. They are left out below.

| per arm, 2 h | master | evaluation fix | verify fix |
| --- | --- | --- | --- |
| requests sent (each lane waits for its answer) | 37,540 | **121,974** | 59,888 |
| 5xx · restarts · OOM | 0 · 0 · no | 0 · 0 · no | 0 · 0 · no |
| verifies, all identical | 19 of 19 | 19 of 19 | 19 of 19 |
| period evaluation, median of the minute medians · p99 | 2,930 ms · 4,731 ms | **183 ms · 424 ms** | 1,657 ms · 3,849 ms |
| RSS maximum · high-water mark | 603 · 637 MiB | **168 · 193 MiB** | 554 · 671 MiB |
| RSS floor after each idle phase | 96.7 / 97.5 MiB | **133.9 / 138.6 MiB** | 90.8 / 91.5 MiB |
| minutes with a p99 over 1 s, five ordinary route groups | 433 | **70** | 406 |
| connection errors · of them inside a verify | 74 · 42 | 32 · — | **256 · 25** |
| a verify, median wall time | 10.0 s | 4.7 s | 12.0 s |

**What the arms show.**
- **At 15,215 races the old period evaluation saturates the server.** Each call holds the event
  loop for 1.6–3 s, and the load asks for one every two seconds. Master therefore sent less than a
  third of the evaluation fix's requests in the same two hours.
- **The evaluation fix removes that.** It cut the evaluation 16× at the median, the memory peak 3.6×,
  the slow minutes 6×, and the connection errors by more than half.
- **Its one worse line is the idle floor:** 134–139 MiB against 97, over 3.2× as many requests
  served. It is not explained here. The step-2 heap evidence (no structure grows) was taken on
  master's code.
- **The verify fix cannot show its effect under this load.** The old evaluation, still on that
  branch, blocks the loop anyway:
  - only 25 of its 256 connection errors fell inside a verify (master: 42 of 74);
  - the other 231 are the same keep-alive resets, caused by the evaluation's blocks;
  - more requests got through than on master (59,888 against 37,540), so more were exposed.

  Its targeted measure is the direct one above (20–26 ms against 1.8–5.4 s). An A/B that isolates
  it would run it on top of the evaluation fix.

**Against the follow-on block's merge conditions** (no 5xx or crash; the targeted measure clearly
better and nothing else worse; outputs identical; no fingerprint moved; no visible change):

| | conditions met | not met |
| --- | --- | --- |
| evaluation fix | no 5xx or crash; targeted measure clearly better; outputs identical; no fingerprint; no visible change | **"nothing else worse"**: the idle floor is 37–41 MiB higher |
| verify fix | no 5xx or crash; outputs identical; no fingerprint; no visible change (the button's answer is unchanged; a second simultaneous verify now gets 429) | **"targeted measure clearly better" is not visible in this A/B**, and **connection errors are higher** (256 against 74), for the cause above |

Neither branch meets every condition as measured. Both stay pushed and unmerged.

## The period-evaluation fix — heap check, and merged (2026-10-08)

The SOAK-1 step-2a method, run as one command each by [heap-run.mjs](SOAK-1/heap-run.mjs) and summed
up by [heap-summary.mjs](SOAK-1/heap-summary.mjs):
- the server imported into a node process ([inproc.mjs](SOAK-1/inproc.mjs)), on a fresh copy of the
  15,215-race starting data;
- the soak's load for 60 minutes;
- `process.memoryUsage()` every 60 s, plus the heap kept after a full GC;
- heap snapshots at 0, 30 and 61 minutes.

Master (`705d01c0`) ran first, then the fix rebased onto it (`6f58bab3`), one after the other.

| | master | the fix |
| --- | --- | --- |
| run (UTC) | 06:55–07:56, 61 samples | 10:53–11:53, 61 samples |
| heap kept after a GC: minute 30 → 60 | 17.58 → 16.95 MiB (−0.63) | 17.67 → 17.07 MiB (**−0.60**) |
| snapshots 0 · 30 · 61 min (heap used after GC) | 10.01 · 17.19 · 16.95 MiB | 10.01 · 17.16 · 17.07 MiB |
| live heap max · RSS max under load | 423 · 783 MiB | **74 · 333 MiB** |
| event loop: worst minute's p99 | 10,888 ms | 350 ms |
| requests served in 60 minutes | 15,998 | **60,480** |
| period evaluation, median of the minute medians | 2,552 ms | **370 ms** |
| 5xx · verifies identical | 0 · 9 of 9 | 0 · 9 of 9 |

**What the snapshot diff found** ([heapdiff.mjs](SOAK-1/heapdiff.mjs), the fix):
- **From 0 to 30 minutes:** +3.4 MiB of compiled code and +2.8 MiB of strings, which is JIT warm-up
  and the same on master.
- **From 30 to 61 minutes:** the total went DOWN (20.10 → 20.02 MiB). The only increase was V8's
  internal `WeakArrayList`, +40 entries (25 KiB). No Map, array, object or generator of the server
  grows.

**One run was thrown away.** The fix's first run (07:57–10:51) was suspended by the machine for 115
minutes, from 08:09 to 10:04. When it resumed, the load had passed its end time and stopped, so
minutes 14–60 ran with no load. That run cannot answer the question asked. Its raw data is kept in
`HEAP-2026-10-08/fix`, and the run above is a full rerun on a fresh copy.

**The merge conditions of 2026-10-08:**
1. Heap kept after GC grows ≤ 2 MiB over minutes 30–60: **−0.60 MiB**, met.
2. The snapshot diff names no structure that grows with requests: **met**.
3. The outputs are byte-identical: **met** (the fixture test; 9 of 9 on the soak's data).
4. No 5xx: **met**.

**Merged.** The BACKLOG row is closed.

## The harness

| file | what it does |
| --- | --- |
| [make-races.mjs](SOAK-1/make-races.mjs) | 12 real recorded races (two tracks, 20 and 40 racers, three seeds), so every stored race can be verified |
| [compose.soak.yml](SOAK-1/compose.soak.yml) | the image run as an install would, own project and volume |
| [load.mjs](SOAK-1/load.mjs) | `setup` (first admin, two organizers) and `run` (the mix above, minute records) |
| [sample.mjs](SOAK-1/sample.mjs) | one sample a minute through the docker CLI only |
| [analyze.mjs](SOAK-1/analyze.mjs) | slopes per hour and per 10,000 requests, the idle floors, latency per group |
| [partc-saver.mjs](SOAK-1/partc-saver.mjs), [partc-analyze.mjs](SOAK-1/partc-analyze.mjs) | part C |
| [inproc.mjs](SOAK-1/inproc.mjs), [heapdiff.mjs](SOAK-1/heapdiff.mjs) | step 2: the server in-process for the heap, and the snapshot diff |
| [keepalive.mjs](SOAK-1/keepalive.mjs), [browser-wait.mjs](SOAK-1/browser-wait.mjs) | step 2: the connection-error experiment, and what a browser sees |
| [compare-eval.mjs](SOAK-1/compare-eval.mjs), [compare-verify.mjs](SOAK-1/compare-verify.mjs) | step 3: old against new on the soak's data — identical answers, memory, and the event-loop block |
| [ab-arm.sh](SOAK-1/ab-arm.sh) | step 4: one arm of an A/B soak from the same starting data |
| [heap-run.mjs](SOAK-1/heap-run.mjs), [heap-summary.mjs](SOAK-1/heap-summary.mjs) | 2026-10-08: one in-process heap check as one command, and its summary |
