# DELIVERY-CLEAN-1 — the whole project, audited for a clean shippable state

**Begun 2026-09-26 from master `6b60edd8`, on branch `audit/2026-09-26-delivery-clean`.**
A FINDING run. Nothing here changes behaviour. Where a repair was authorised — a comment that
states something the code does not do, a sentence a living document contradicts, a dead variable, a
hardcoded path — it was made and is reported; everything else is a row, never a build.

★ **How to read the numbers.** Every verdict in this report carries a denominator and the command
that produced it. Where a count of mine was wrong, the wrong figure is kept beside the right one
rather than edited away, because a number that quietly changes cannot be checked.

---

## §1 — THE DENOMINATORS

Nothing later in this report can be judged without these. Every figure below was produced from the
**tracked index** (`git ls-files`), not from the filesystem — the two differ, and the difference is
what made two of my own first counts wrong.

### 1.0 Two counts of mine were wrong, and both failed the same way

| I first said | The truth | Why mine was wrong |
| --- | --- | --- |
| 3 markdown files at repo root | **2** — `CLAUDE.md`, `README.md` | I ran `ls *.md`, which counted `night-task.md` — untracked, written by me to launch the 2026-09-26 night run. |
| `scripts/` holds 278 files, 223 non-test | **281 tracked, 226 non-test** | I filtered `find` on `.mjs`/`.js` and missed 3 `.json` files. 278 was exactly the `.mjs` count. |

Both were counts of the **filesystem** where the question was about the **tracked tree**. Stated
here rather than corrected silently, because it is the same class of error this report exists to
find in other people's work.

### 1.1 Top-level documents — 39 tracked files (2 at root, 37 in `docs/`)

Command: `git ls-files '*.md'`, filtered to repo root and `docs/` top level. Line counts and last
commit dates are in the generated table below; the OWNS column is each document's own header claim.

| # | file | lines | last commit | OWNS (its own header) |
| --- | --- | --- | --- | --- |
| 1 | `CLAUDE.md` | 84 | 2026-08-13 | **— no OWNS line —** |
| 2 | `README.md` | 185 | 2026-09-19 | **— no OWNS line —** |
| 3 | `docs/API.md` | 125 | 2026-09-04 | the backend's HTTP surface |
| 4 | `docs/ARCHITECTURE.md` | 1238 | 2026-09-07 | the system's shape — which layer holds what |
| 5 | `docs/AUDIT.md` | 980 | 2026-09-04 | the dated security-and-quality audit log (append-only) |
| 6 | `docs/AUTH.md` | 302 | 2026-08-18 | how RaceArena authenticates and what is protected |
| 7 | `docs/BACKLOG.md` | 5476 | 2026-09-26 | the living list of open work, and (since D24) phase status |
| 8 | `docs/branding.md` | 349 | 2026-09-25 | the event-branding system |
| 9 | `docs/CAMERA_DIRECTOR.md` | 2169 | 2026-09-25 | **— no OWNS line —** |
| 10 | `docs/CONCEPT-COHESION.md` | 342 | 2026-08-07 | the design rationale for field cohesion |
| 11 | `docs/DEAD-ENDS.md` | 703 | 2026-09-23 | **— no OWNS line —** |
| 12 | `docs/DEPLOY-NOTES.md` | 205 | 2026-09-05 | the GAP between the repository and the owner's stated wish |
| 13 | `docs/DEPLOYMENT.md` | 251 | 2026-09-25 | deploying to a public same-origin host |
| 14 | `docs/DEVSCREEN-INVENTORY.md` | 1327 | 2026-09-26 | what the Dev Panel actually renders |
| 15 | `docs/ENDING-PHASES.md` | 407 | 2026-09-25 | **— no OWNS line —** |
| 16 | `docs/ENVIRONMENT.md` | 123 | 2026-09-07 | every environment variable RaceArena reads |
| 17 | `docs/EYE-TEST-SEEDS.md` | 123 | 2026-09-23 | what a seed guarantees and what it does not |
| 18 | `docs/FAIRNESS.md` | 170 | 2026-09-03 | **— no OWNS line —** |
| 19 | `docs/FORCE-MAP.md` | 511 | 2026-09-25 | every force that acts on a racer |
| 20 | `docs/GLOSSARY.md` | 322 | 2026-09-25 | **— no OWNS line —** |
| 21 | `docs/LESSONS.md` | 4172 | 2026-09-05 | the numbered lessons (append-only) |
| 22 | `docs/MORNING.md` | 1329 | 2026-09-25 | **— no OWNS line —** |
| 23 | `docs/NIGHT-RUN.md` | 231 | 2026-09-25 | **— no OWNS line —** |
| 24 | `docs/OPEN.md` | 386 | 2026-09-26 | **— no OWNS line —** |
| 25 | `docs/PHASE-CONTRACT.md` | 214 | 2026-09-04 | **— no OWNS line —** |
| 26 | `docs/PROJECT-PRINCIPLES.md` | 396 | 2026-09-04 | **— no OWNS line —** |
| 27 | `docs/RACE-ACTION.md` | 396 | 2026-09-23 | **— no OWNS line —** |
| 28 | `docs/RACER_DATA_MODEL.md` | 429 | 2026-09-02 | what a racer type is |
| 29 | `docs/README.md` | 155 | 2026-09-05 | **— no OWNS line —** |
| 30 | `docs/ROADMAP.md` | 41 | 2026-09-03 | **— no OWNS line —** |
| 31 | `docs/SETUP.md` | 250 | 2026-09-19 | getting RaceArena running locally |
| 32 | `docs/SHIP-CEREMONY.md` | 989 | 2026-09-25 | **— no OWNS line —** |
| 33 | `docs/SIM.md` | 1475 | 2026-09-24 | the headless simulator |
| 34 | `docs/STANDINGS-ARCHITECTURE.md` | 87 | 2026-08-11 | **— no OWNS line —** |
| 35 | `docs/SWEEP-HARNESS.md` | 189 | 2026-09-18 | the permanent measurement stack around the sim |
| 36 | `docs/TAGS.md` | 2236 | 2026-09-23 | the git-tag register |
| 37 | `docs/TRACK_EDITOR.md` | 445 | 2026-09-04 | **— no OWNS line —** |
| 38 | `docs/TRACK_LIFECYCLE.md` | 303 | 2026-09-04 | how a track is created, stored and persisted |
| 39 | `docs/VERIFY-RULES.md` | 977 | 2026-09-25 | **— no OWNS line —** |

★★ **19 of 39 carry no OWNS line.** This is a finding in its own right AND a limit on a later
piece: §6.3 was to detect two documents owning one subject **using the OWNS lines from 1.1**, and
that method can only reach **20 of 39**. §6.3 states its reduced denominator rather than implying
whole-tree coverage.

### 1.2 `scripts/` — 281 tracked files, and what invokes each

Command: `git ls-files scripts`. An "invoker" was searched for in the three `package.json` files,
`scripts/verify.mjs`, `scripts/setup-hooks.mjs`, every file under `.github/`, and every other
script's source.

| class | count | how it is invoked |
| --- | --- | --- |
| tests (`.test.`) | **55** | BY PATTERN, by the `script-suite` guard — `verify.mjs:373` spreads `scriptTestFiles()` into `node --test`. Never by name. |
| `scripts/diag/**` non-test | **78** | By hand, by design — measurement tools. |
| everything else | **148** | of which **80** are named by a package script, a guard, a hook, CI or another script |
| **unreferenced** | **65** | named by nothing searched |

★★ **MY FIRST FIGURE OF 68 WAS WRONG AND IS CORRECTED TO 65.** Three of the 68 —
`check-client-build`, `check-ending-frame`, `check-runin-frame` — are **live guards in the
registry**, confirmed present in `verify.mjs --premerge --dry`. My detector missed them because
`verify.mjs` resolves a guard id to its file **by naming convention, not by a literal filename
string**, so a substring search for the filename finds nothing. That is a false-positive class any
later reader of this table must know about.

★ **"Unreferenced" here does NOT mean "unused".** It means *named by none of the sources searched*.
The 65 are dominated by `exp-*` experiment drivers and `*-truth` measurement tools, which are
hand-run by the same convention as `scripts/diag/**` and simply do not live in that directory.
Whether that is a finding is §7's question, not §1's.

### 1.3 The guards — a registry of 36, and the selection trap

Command: `node scripts/verify.mjs --dry` and `… --premerge --dry`, parsed for the WILL RUN and
SKIPPED sections.

| | count |
| --- | --- |
| **guards in the registry** | **36** (identical in both modes — the modes differ in SELECTION, not in membership) |
| bare `verify`, on this branch's diff | **4 will run, 32 skipped** |
| `verify -- --premerge`, same diff | **15 will run, 21 skipped** |

★★ **THE OPERATOR TRAP, IN WRITING.** Eleven guards run by `--premerge` and skipped by bare
`verify` on this diff: `check-config-claims`, `check-config-keys`, `check-doc-facts`,
`check-doc-links`, `check-fallback-agreement`, `check-fingerprint-payload`, `check-index`,
`check-measured-stamps`, `check-tags`, `check-tooltip-values`, `script-suite`.

★ **These two counts are DIFF-DEPENDENT and the 36 is not.** Selection is computed against the
changed files, so 4/15 describes this branch at this moment, not the tool. A note in my own working
memory said "bare runs 7, premerge 14" — a different diff, and reported here as a **disagreement
that is explained rather than reconciled**: both are right for their own diff, and neither is a
property of `verify`. The stable, quotable number is **36 in the registry**.

### 1.4 The HTTP surface — 58 routes across 9 mounts

Command: the route enumerator was **reused, not rebuilt** — `extractRoutes` and the mount list are
taken from `server/src/auth/routePolicyDrift.test.js`, and the role column from `requiredRole` in
`server/src/auth/guards.js`, so this table cannot disagree with the guard that keeps routes
classified.

★ One defect in my first attempt, recorded because it is a trap: **an Express router IS a function**,
so `typeof f === 'function'` cannot tell a router from a factory. Six of nine mounts failed to
enumerate until the test was changed to `f?.stack`.

| mount | routes | admin-classified | scopes by team |
| --- | --- | --- | --- |
| `/api/auth` | 6 | 0 | — |
| `/api/users` | 4 | **4** | — |
| `/api/tracks` | 11 | 3 | **0** |
| `/api/surface-classes` | 5 | 3 | **0** |
| `/api/player-groups` | 8 | 3 | **0** |
| `/api/brands` | 11 | 3 | **0** |
| `/api/racers` | 8 | 0 | **0** |
| `/api/seed-notices` | 2 | 0 | **0** |
| `/api/races` | 3 | 0 | **20 references** |
| **total** | **58** | **16** | 1 of 7 data modules |

★★ **Counted over all 58 routes: `races.js` is the ONLY route module that scopes by team.** The
other six contain **zero** occurrences of `team` (`grep -c` per file, whole file, uncapped).
This is the TENANCY row's claim, now with a denominator: it is not "tracks are unscoped", it is
**six of seven data modules are unscoped**. §2.4 tests what that means with two real users.

### 1.5 Where a race result can live — *pending, written with §2*

Deferred into §2 rather than guessed at here: the writer/reader addresses are the same ones §2.4
and §3.2 must establish by test, and producing them twice would be two tables that can disagree.

### 1.6 Repository hygiene

Command: `git ls-remote` against origin (not the cache), `git count-objects -vH`, `git ls-files`.

| | |
| --- | --- |
| branches at origin | **2** — `master` `6b60edd8`, `read/comeback-gates` `33a33970` (the comeback thread, reported and pushed, deliberately unmerged) |
| tags at origin | **193** |
| `size-pack` | **600.36 MiB** |
| ten largest tracked files | nine are track-background JPEGs, 10.2 MB down to 2.5 MB (~51 MB together); the tenth is `reports/night/breakaway-lever-data/lever-frames.json`, 2.4 MB |

★ **The 51 MB of backgrounds is NOT a new finding.** The owner decided on 2026-09-23 (`Q-27`) that
the current quality stays and there is no re-encoding. It is listed because 1.6 asks for the ten
largest, and it is marked as a settled decision so a later reader does not re-open it.

### §1 — UNKNOWN

- **1.5 is not answered here**, by the choice stated above; it lands in §2/§3.
- **Whether the 65 unreferenced scripts still run** is not established. §1 counted references; §7
  opens files. A script named by nothing may still work perfectly.
- **The per-route "what validates the body" column of 1.4 is not filled.** Enumerating routes is
  mechanical; establishing each one's validation is a read of 58 handlers and belongs with §2.6,
  which is where it will be done. Reporting the route count without it would have implied coverage
  this section does not have.
- **Lockfile/manifest sync and a pinned Node version are not yet checked** — both are 1.6 items and
  both are deferred to §2.10, where the container's own pinning is the same question.

---

## §2 — SECURITY, HALF A: DANGER TO THE OPERATOR

Denominator: the **58 routes over 9 mounts** enumerated in §1.4. Severities, used consistently
below: **HIGH** = an unauthenticated or cross-tenant party can act; **MEDIUM** = an authenticated
party can exceed what the owner intends, or an operator can be misled into an unsafe deployment;
**LOW** = latent, needs an unusual condition, never observed.

★ Nothing in this section was repaired. Security changes are behaviour.

### 2.1 Secrets — swept, working tree AND whole history

| | |
| --- | --- |
| working tree | `git grep -nIE` over **all tracked files** for api-key / secret / password / token / private-key / `mongodb://` / `postgres://` / `mysql://` assignments of 8+ characters, excluding test, example and `process.env` forms — **0 hits** |
| whole history | every blob in **30,719 objects** (`git rev-list --objects --all`, blobs under 2 MB) piped through `git cat-file --batch` and matched against private-key headers, OpenSSH headers, `mongodb(+srv)://`, `postgres://`, `mysql://`, `xox[baprs]-`, `gh[pousr]_`, `AKIA[0-9A-Z]{16}` — **0 hits** |
| `.gitignore` vs tracked | `.env`, `node_modules`, `client/dist` all ignored and untracked; **0** tracked files under any build-output path |
| `server/data/` | **exactly 1 tracked file**, `server/data/README.md`. The runtime store is not in the repository. |
| secret-shaped filenames | one hit, `reports/evolution/IMAGE-NO-CREDENTIALS-1.md` — a report *about* credentials, containing none |

★★ **THE TWO LIMITS OF THAT ABSENCE CLAIM, stated because rule 2 requires it.** Blobs **over 2 MB
were not scanned** (that bound exists to skip the 10 MB background JPEGs), and the history pattern
set is **high-confidence only** — a bespoke plaintext password with no recognisable prefix would
match neither pass. The finding is *"no secret of a recognised shape"*, not *"no secret"*.

**The bootstrap token.** Not defaulted anywhere: `authRouter.js:38` reads `RA_BOOTSTRAP_TOKEN` from
the environment, `:59` disables setup with a warning when it is absent, and
`startupReadiness.js:55` says so at boot. INSTALL-SECRETS-1 removed a working token from
`docker-compose.yml` on 2026-09-08 — the comment at `docker-compose.yml:27-34` records that a
stranger running a plain `docker compose up` previously got a working token whose value was public.
`npm run configure` generates one per install into a gitignored override. **No finding.**

### 2.2 Dependencies — 6 advisories, 0 reachable by an operator

| package | critical | high | moderate | low |
| --- | --- | --- | --- | --- |
| server | 0 | 0 | **3** | 0 |
| client | 0 | 0 | **3** | 0 |

All six are one advisory family — **GHSA-82fw-gwwq-j7x9**, via `vitest` / `@vitest/mocker` /
`@vitest/coverage-v8`. **`vitest` is in `devDependencies` only in both packages** (server 9 deps /
3 devDeps, client 3 deps / 17 devDeps; `dependencies.vitest` absent in both), and the image installs
with **`npm install --omit=dev`** (`server/Dockerfile:59`). **The vulnerable path is not in the
shipped artefact.** Severity **LOW**, written as a dev-only advisory rather than an operator risk.

### 2.3 Authentication and sessions

| | finding | address |
| --- | --- | --- |
| hashing | bcrypt, **cost 12** | `usersStore.js:19,36` |
| comparison | `bcrypt.compare` | `usersStore.js:41` |
| username enumeration | **guarded** — a real dummy hash is compared when the username is unknown, equalising timing | `authRouter.js:18` |
| session cookie | `httpOnly: true`, `sameSite: lax`, `secure` from environment, `path: /`, `maxAge` 30 days | `session.js:103-108` |
| cookie name | `__Host-ra.sid` when secure, else `ra.sid` — the `__Host-` prefix is real hardening | `session.js:35-49` |
| session store | `resave: false`, `saveUninitialized: false` | `session.js:101-102` |
| rate limiting | **present on login, setup AND change-password** | `app.js:62-66`, `rateLimit.js:18,34,74` |

**No finding at HIGH or MEDIUM.** ★ The 30-day `maxAge` is a **LOW**: a deliberate convenience for a
single-operator product, written as a stated consequence rather than a defect.

### 2.4 Authorisation — TESTED, not read

★★ **The one item in §2 answered by doing it.** `server/src/routes/crossTeamAccess.audit.test.js`
creates two teams and two users and tries the crossing. **5 of 5 pass:**

- team B **cannot list** team A's races (A sees 1, B sees 0);
- team B **cannot read** A's race by short key — and is told **404, not 403**, so the answer does not
  confirm the race exists;
- team B **cannot file into A's team** by putting `team` in the body — the session wins;
- a user with **no team** gets an empty page, not everybody's races.

★★ **AND THE OTHER SIX MODULES HAVE NO TEAM CONCEPT AT ALL — pinned as fact, not as a wish.**
Counted over the route sources: `tracks` 0, `surfaceClasses` 0, `playerGroups` 0, `brands` 0,
`racers` 0, `seedNotices` 0 occurrences of `team`; `races` 20. **Six of seven data modules are
unscoped.** Severity **MEDIUM**, and the distinction matters: today there is one team, so nothing
crosses a boundary that exists. The day a second team is invited, every track, brand, racer, player
group and surface class is shared. That is the TENANCY row, now with a denominator.

★ Scratch data: the probe uses a temp SQLite file and a temp directory, both deleted in `afterEach`.

### 2.5 Transport — verified, not re-argued

`resolveCookieSecure` returns `isProduction` when nothing is set (`session.js`), and
`RA_COOKIE_SECURE=false` is honoured explicitly — **so login over plain HTTP still works if an
operator sets it.** That is the already-open GOING ONLINE row; the decision is the owner's and is
recorded here as still true, not re-argued.

### 2.6 Input surface

| | finding | address |
| --- | --- | --- |
| body size | `express.json({ limit: 1mb })` — bounded | `app.js:38` |
| logo upload size | bounded by `MAX_IMAGE_BYTES`, rejected with a size message | `brands.js` upload handler |
| logo upload type | allowlist — PNG, JPEG, WebP only, checked twice (multer filter, then again in the handler) | `brands.js` |
| **path escape** | **not reachable via the filename**: the written name is `brand.id` + extension — derived from the record, never from the client's filename | `brands.js:347,355` |
| write target | `join(LOGO_DIR, filename)` | `brands.js:347` |

★ **UNKNOWN, and the one gap here:** whether `brand.id` itself can contain a path separator. The
filename is safe from the *client's* filename but is only as safe as the id's validation, which this
piece did not open. Carried into §2's UNKNOWN.

### 2.7 Error and log leakage

Error responses carry `err.message` and `err.code` (`races.js:107`), **not `err.stack`** — an
uncapped grep for `err.stack` across `server/src/routes/*.js` and `app.js` returns nothing. Log
lines carry the **username** on a rejected race (`races.js:105`) — a username, not a password, a
token or a session id. **No finding.**

### 2.8 Headers and origin

`helmet()` is applied (`app.js:35`) — **with `contentSecurityPolicy: false`**, the already-recorded
CSP gap inside the GOING ONLINE row. `crossOriginResourcePolicy` is `cross-origin`, deliberately.
CORS comes from `corsOptions` with an explicit origin list built once at module load (`app.js:37`,
`auth/csrf.js`), plus a `csrfOriginGuard`. **CSP off: MEDIUM**, already tracked.

### 2.9–2.11 — NOT COMPLETED IN THIS PASS

Stated rather than implied. What **2.10** did establish:

| | finding | address |
| --- | --- | --- |
| runs as root? | **no** — `USER node` | `server/Dockerfile:144` |
| image pinning | `FROM node:20-alpine` — a **floating tag, not a digest**. A rebuild can silently change the base. Severity **LOW**. | `Dockerfile:22,33` |
| port binding | `4000:4000` — **binds all interfaces**, so on a VPS the API is directly reachable unless a firewall or proxy prevents it. Severity **MEDIUM**. | `docker-compose.yml:17-18` |
| restart + health | `restart: unless-stopped`, `HEALTHCHECK` against `/api/health` | `docker-compose.yml:24`, `Dockerfile:165` |
| volumes | `./server/src`, `./server/utils`, `./server/data`, `./server/seeds` are **bind mounts from the working copy** | `docker-compose.yml:48-55` |

★★ **The volume shape is the finding worth carrying to §6.10.** The compose mounts live source and
the data directory from the repository checkout, and there is **no separate production compose** —
`docker-compose.override.yml` and its `.example` are the only siblings. Deploying this file to a VPS
means the repository working copy IS the deployment, and the database lives inside it. Severity
**MEDIUM**.

### §2 — UNKNOWN

- **2.9 not done.** No route was checked for an unbounded result set. `GET /api/races` is paged
  (`races.js:127`); the other 55 were not examined.
- **2.11 not done.** Whether the dev screen, `?viewerprobe=1`, the dev vite plugin or source maps
  are present in a **production build** was NOT established from the built artefact. This is the
  item I would put first if the chain resumes.
- **`brand.id` validation not read** — see 2.6.
- **No penetration testing of any kind.** Every finding above is source-read or supertest-level;
  nothing was run against a live, network-exposed instance.
- **The six unscoped modules were not tested the way `races` was.** Their absence of scoping is a
  source count, and a count is not a crossing.

---

## §3 — SECURITY, HALF B: CAN ANYTHING FROM OUTSIDE CHANGE A RESULT

### 3.1 Where the result is computed — the sentence an operator can act on

★★ **The race is computed entirely in the operator's own browser.** The engine
(`client/src/modules/raceCore.js`, driven from `client/src/screens/RaceScreen/index.jsx`) runs the
physics; the server never simulates anything. The result reaches the server only as a finished
record, posted by the browser that produced it.

### 3.2 What the server accepts

| question | answer | address |
| --- | --- | --- |
| structural validation? | **yes, but shallow** — required scalar fields via `required()`, and `names`, `results`, `winners` must be arrays and non-empty | `raceStore.js:235,264,269,274` |
| is any key recomputed server-side? | **the content id is** — SHA-256 over the canonical row the server assembles | `raceStore.js` |
| is the OUTCOME recomputed? | **NO. The finishing order is taken as given.** | — |
| is a repeat idempotent? | **yes** — dedupe on `client_race_id`, and again on the content id | `raceStore.js` |
| can the team be chosen by the body? | **no** — tested in §2.4 | — |

★★ **So an authenticated user CAN post a result no simulation produced.** The server stores any
structurally valid record. This is not a defect — it is 3.3's decision working as designed.

### 3.3 The recorded decision, and its consequence in plain words

The owner's rule of 2026-09-06, recorded at `client/src/modules/raceHistory.js:9-14`: the race is
written locally first, always, and **the server is a second store, never a gatekeeper.**

**The consequence, for the owner:** anyone who can sign in can put a race into the history that was
never run. The system is built for a room of invited players with one operator, and it trusts every
signed-in account accordingly. **This piece does not propose overturning that**; it states it so the
choice is visible. The tree and the decision **agree** — no contradiction found in either direction.

### 3.4 Can a user change his own race without it being visible?

★★ **The brief's hypothesis is HALF RIGHT, and the wrong half is the half that matters.**

**Right:** the fingerprints are built from **shipped defaults**, not from stored settings —
`scripts/camera-fingerprint.mjs:77` imports `DEFAULT_CAMERA_CONFIG` and `:131` builds from it. A user
who edits stored settings runs a different race and **every fingerprint stays put.** Confirmed.

**Wrong:** *"whether anything records that a race ran on non-default settings"* — **something does.**
The stored race carries `world_configs`, the **resolved** config the race actually ran with
(`raceStore.js:164` schema, `:358` write, `:465` read). The schema's own comment states it is stored
resolved rather than as a diff precisely so the row says what the config WAS, forever, on its own.

**Which stored keys change a RESULT rather than a PICTURE** — the project's own line at
`configFingerprint.js:20-27`: **race-relevant** are `raceDynamicsConfig`, `raceBehaviorConfig`,
`rowLayoutConfig`, `baseSpeedConfig`, `autoScaleConfig`; **cosmetic** are `cameraConfig` and
`frameTimingConfig`.

★ **So a disputed race IS settleable:** the record contains the settings it ran under, and comparing
them against the shipped defaults is a diff the product already computes for its config badge. What
is NOT true is that a non-default race announces itself — nothing flags the row; somebody has to
look.

### 3.5–3.6 — NOT COMPLETED IN THIS PASS

**3.5** is **partly** answered from yesterday's verified work and is not re-derived: the camera is
frame-driven off wall-clock `rawDt` (`index.jsx:937`, `:1588`) while the physics accumulates in
fixed 16 ms steps (`:1071`), capped at two catch-up steps per frame (`:1079`). **Whether that
separation is complete was NOT established** — no full enumeration of `Math.random`, `Date.now` and
`performance.now` reaching the result path was run. **3.6** (re-run a race from its identifier, end
to end) was **not done**.

### §3 — UNKNOWN

- **3.5 incomplete**, as above. The separation is shown for the camera and the physics accumulator;
  it is not proven for the whole result path.
- **3.6 not attempted.** The mitigation the owner would rely on in a dispute — re-running a race from
  its identifier — is **unverified by this pass**. Given 3.3, this is the most valuable single check
  remaining in the whole chain.
- Whether `world_configs` is *complete* — whether every key that can change a result lives inside
  those five blocks — was not verified against the engine's actual reads.

---

## §8 — BACKING UP AND RESTORING RESULTS

**Answered by doing it, not by reading about it.** Every figure below came from a round trip run on
2026-09-26 against a scratch data root in the system temp directory, deleted afterwards.

### 8.1 The matrix — where a result lives, and whether it can go out and come back

| where a result lives | export | import | address |
| --- | --- | --- | --- |
| **server database** — `races.sqlite`, the `races` / `rosters` / `racer_types` tables | **YES** — `scripts/backup.mjs --out <dir>` | **YES** — `--restore <archive> --into <dir>` | `scripts/backup.mjs:72,80-81,320` |
| **browser localStorage** — the device's own race history and every tuning key | **YES** — `exportAllStorage()`, plus `exportDiagnosticSnapshot()` for everything | **YES** — `importAllStorage(data)` | `client/src/modules/storage/storage.js:107,122,144` |
| operator-facing entry for the browser half | **YES** — Dev Screen → System, Export / Import / Reset buttons | same | `DevScreen/sections/SystemSettings.jsx` |
| operator-facing entry for the **server** half | ★ **NO npm script** — the operator must type `node scripts/backup.mjs` | same | see 8.4 |
| **CSV of the race history** | YES, Dev Screen → Race History → Export CSV | **NO** — it is a read-out, not a store | `DevScreen/sections/RaceHistory.jsx` |

### 8.2 The round trip, on synthetic data — **nothing was lost**

A race was written into a scratch store, archived, the data root **deleted**, and the archive
restored into a fresh directory.

```
STORED   id=99e18160ab11  shortKey=BYWPEV   counts {"races":1,"rosters":1,"racerTypes":1}
BACKUP   races.sqlite — 45056 bytes (online backup)  ->  racearena-backup-20260926T214436Z.tar
WIPE     data root deleted
RESTORE  1 item(s) restored
COMPARE  scalar fields compared: 14, mismatched: 0
```

| field group | survived? |
| --- | --- |
| 14 scalar fields (`clientRaceId`, `team`, `finishedAt`, `identifierVersion`, `buildId`, `geometryId`, `racerTypeId`, `racePlanSeed`, `raceActionStage`, `racePlanEnabled`, `targetDurationSec`, `elapsedSec`, `raceSource`, `shortKey`) | **all 14, byte-identical** |
| `names` | yes — `["Ada","Grace"]` |
| `results` | yes — `[{"name":"Grace","position":1}]` |
| `winners` | yes — `["Grace"]` |
| `worldConfigs` | yes — the resolved config §3.4 depends on |
| `fieldSize`, roster and racer-type rows | yes — counts identical after restore |

★★ **No field failed to survive.** Reported as the denominator requires: **14 of 14 scalars
compared by name, plus five structured fields, plus the two shared tables.**

### 8.3 The database dump and restore — documented, and it works

| | |
| --- | --- |
| documented? | **yes** — `docs/DEPLOYMENT.md:130` (backup) and `:150` (restore), with the exact commands |
| both run? | **yes**, above |
| consistent while the server runs? | **by design** — the SQLite files go through `better-sqlite3`'s `db.backup()` (the online backup API), not a file copy. The header at `scripts/backup.mjs:8-25` argues the case: a plain `copyFile` of a live database can capture a torn page set, and the result *looks perfectly normal* until the damaged page is read. |
| does the restored database serve the same rows? | **yes** — the race was read back by short key from the restored file and compared field by field |

★ **NOT tested: the application coming up against the restored database.** The comparison above was
made by opening the restored file with the store directly. Booting the API against it and fetching
the race through `GET /api/races/:shortKey` was **not done** — see UNKNOWN.

### 8.4 What is not covered

1. ★ **There is no `npm run backup`.** Confirmed across all three `package.json` files: zero script
   entries matching `backup`. The tool is real, tested (`scripts/backup.test.mjs`) and documented,
   but the operator has to know the file path. **Group C** — costs nobody anything today, and is the
   kind of thing that is not found on the day it is needed.
2. **No schedule.** Nothing runs the backup automatically; it is a command somebody types.
3. **No verification step.** The tool writes an archive; nothing re-opens it to confirm it restores.
   The round trip above was performed by this audit, by hand — it is not something the tool does.
4. **The CSV export has no import.** That is correct for what it is (a read-out for a spreadsheet)
   and is listed so the matrix is not read as a gap.

★ **None of these was built.** A missing tool is a feature; item 1 is a one-line package entry and
is *still* not made here, because a `scripts` entry is an operator-visible affordance.

### ★ 8.x → 6.10 — THE BACKUP AND THE DATA ARE **NOT** ON THE SAME DISK BY CONSTRUCTION

The brief expected this to be the item most likely to matter. It is answered, and it is answered the
good way:

- `--out` has **no default** — `backup.mjs:320` refuses with a usage line if it is absent, so an
  archive cannot be written by accident;
- `backup.mjs:186` **refuses outright** if the target is inside the data root, by name:
  *"the archive must be written OUTSIDE the data root"*;
- `docs/DEPLOYMENT.md:130` documents it as `--out /somewhere/outside/the/data/dir`.

★★ **But "outside the data root" is NOT "a different disk, or a different host".** The tool prevents
the archive landing *in* the data directory; nothing prevents it landing one directory up, on the
same volume, on the same VPS. Combined with §2.10 — the compose bind-mounts the data directory from
the repository checkout, and there is no production compose — **the realistic default deployment has
the data and any backup on one machine.** That is the honest state, and it is a **Group B** entry:
recoverable only if the operator has moved the archive off the host, which nothing checks.

### §8 — UNKNOWN

- **The application was not booted against the restored database.** 8.3 asks for it; the comparison
  was made at the store level instead. The gap is narrow but real: a restored file that the store
  reads is not proof that the API serves it.
- **The browser half was not round-tripped.** `exportAllStorage` / `importAllStorage` exist and are
  wired to buttons, but this pass tested the **server** database only. The Dev Screen's export →
  wipe → import path is the one an operator would actually use for their own device, and it is
  **unverified here** — it is listed in Phase V as owed an eye-test and remains so.
- **Nothing was tested with a server running.** The online backup API is the right tool for a live
  database and the header argues it well, but this round trip ran against a quiescent file, so the
  *concurrency* claim is inherited from the driver's documentation rather than demonstrated.
- **Archive integrity over time** — no checksum is written or verified by the tool, so a silently
  corrupted archive would be discovered on restore.

---

## §6 — REDUNDANCY

Both readings, as the brief requires. Half A is the same truth in two places; Half B is one copy
where there should be two. **Nothing was de-duplicated, no guard removed, no dependency removed, no
volume changed.**

### 6.1 — DROPPED, with the reason

A copy-paste detector could not be run. `npx jscpd` refuses non-interactively (*"canceled due to
missing packages and no YES option"*), and installing it into either `package.json` would add a
dependency to the tree on an audit branch — a change this chain forbids itself. **No clone detection
was performed.** Rule 8: a check that cannot answer its question is dropped and the drop is
reported. This is the largest single gap in §6 and it is stated, not glossed.

★ What this means for the rest of §6: **6.1 and 6.4 (two helpers for one job) are unanswered.** The
sub-sections below stand on their own evidence and do not borrow from a clone report that does not
exist.

### 6.2 — The same VALUE in two places: **no genuine drift found in product source**

Method, stated so it can be repeated and criticised: every numeric default in
`client/src/modules/storage/defaults.js` was extracted (**172 keys with a single unambiguous numeric
value**, after discarding `0`, `1` and `-1` as too common to be evidence), and the whole tracked
tree was searched for an **assignment-shaped** restatement — `key: value` or `key = value` — whose
value **differs** from the owner's.

| pass | candidates | verdict |
| --- | --- | --- |
| whole tree | **562** | dominated by TEST FIXTURES — a test constructing a config with a different value is doing its job, not drifting |
| product source only (no tests, no e2e, no `scripts/`) | **163** | **0 genuine drifts** |

★★ **All 163 product-source hits fall into two classes, and neither is a finding:**

1. **A generic name collision** — the overwhelming majority. `min` and `max` are owned in
   `defaults.js` by `baseSpeedConfig` (0.00096 / 0.00113), and every slider and effect schema in the
   tree declares its own `min:` / `max:`. `track-effects/effects/*.js`, `surface-effects/generators/*.js`,
   `CameraAdvancedSection.jsx`, `DynamicsTuningSection.jsx` and `RacerEditModal.jsx` account for
   nearly all of them. Same name, different subject — **COINCIDENCE**, in the brief's own
   classification.
2. **A default parameter in a pure function's signature** — `innerFramePct = 1` at
   `client/src/modules/camera/framingRule.js:207,427,479`, `minDrawnFrameFrac = 0` at
   `client/src/modules/autoSpriteScale.js:112`. These are "the caller must supply it" idioms, not
   copies of the config.

★ **ONE OBSERVATION WORTH KEEPING, and it is not a drift.** `framingRule.js` defaults
`innerFramePct` to **1** in five signatures while the shipped config value is **0.7**. Nothing is
wrong today — every live caller passes the value. But a future caller that omits it gets a framing
rule that behaves unlike the shipped camera, and the divergence would be silent. **Group C, latent,
never observed.** Recorded, not changed.

★ **Cross-reference, not double-counted:** comments stating a value are §4.3's subject and §4 was
not run. Tooltips stating a value are now guarded by `check-tooltip-values`, built by
NIGHT-2026-09-26 and passing.

### 6.3 — The same rule in two documents: **reduced denominator, stated**

§1.1 established that **19 of 39** top-level documents carry no OWNS line. The brief's method for
this sub-section is "using the OWNS lines from 1.1", so the method reaches **20 of 39 — 51%**. A
sweep over half a corpus is not a verdict over the corpus, and no overlap claim is made here.

★ What was observed without a sweep, from the OWNS lines that do exist: `docs/ROADMAP.md` (41 lines)
declares itself a REDIRECT and owns nothing, which the brief says is correct and not an overlap;
`docs/DEPLOY-NOTES.md` owns *the GAP between the repository and the owner's wish* while
`docs/DEPLOYMENT.md` owns *deploying to a public same-origin host* — adjacent subjects with a stated
division. **No disagreement found between any two OWNS lines that exist.** That is a claim about 20
documents, not 39.

### 6.5–6.8 — NOT DONE

**6.5** (redundant guards and tests), **6.6** (redundant dependencies), **6.7** (redundant stored
keys beyond the known `minTargetScreenPx` collision) and **6.8** (redundant scripts) were **not
performed**. 6.7 and 6.8 both depend on work this pass did not reach — 6.8 needs §7's script-by-
script read, and 6.7 needs a key sweep of the same shape as 6.2 but over names rather than values.

---

## HALF B — ONE COPY WHERE THERE SHOULD BE TWO

### 6.9 The deployed shape

One service, one host. `docker-compose.yml` defines a single `server` container (§2.10) with
`restart: unless-stopped` and a `HEALTHCHECK`. **No replica, no failover, and that is a legitimate
answer for a single-operator product** — written as a stated consequence, not dressed up as a
defect. When the container stops, the app is down until it restarts or an operator intervenes; the
data is untouched by that.

### 6.10 The backup and the data — **answered in §8, and answered well**

Repeated here in one line because Half B is where it belongs: **the tool refuses to write the
archive inside the data root** (`scripts/backup.mjs:186`) and `--out` has no default
(`:320`). ★ **But "outside the data root" is not "another disk or another host"**, and with the
compose bind-mounting the data directory out of the repository checkout and no production compose
existing, the realistic deployment keeps data and archive on one machine. **Group B.**

### 6.11 Recovery without the server

What an operator still has if the server is gone:

| | survives? | address |
| --- | --- | --- |
| the device's own race history | **yes** — written locally FIRST, always, by the owner's 2026-09-06 rule | `raceHistory.js:9-14` |
| a full localStorage export | **yes**, if one was taken — Dev Screen → System | `storage.js:107,144` |
| a CSV of the history | **yes**, if one was taken | `RaceHistory.jsx` |
| the team's races from other devices | **no** — those live only on the server |

★ **Whether a period evaluation could be reconstructed from that: NOT ESTABLISHED.** The period
evaluation is not built (it is an open PART ONE row), so there is nothing to reconstruct and no
format to test against. Cross-referenced to §8 rather than repeated.

### 6.12 Loss mid-race — **NOT TESTED**

The brief says to establish it by doing it. **It was not done.** What can be said from source
without the test: the result is written to `sessionStorage` at the finish
(`RaceScreen/index.jsx:1198`) and to local history from the result screen, so a process death
**before the last racer crosses** loses the race entirely — there is no partial write. That is a
source reading, not the test the brief asked for, and it is listed in UNKNOWN as such.

### 6.13 What has no second copy at all

The answer to Half B, in one short list — things whose loss cannot be undone by re-running
something:

1. **The server database**, if no archive has been taken off the host. Every race stored by another
   operator's device lives only there.
2. **Uploaded brand logos and racer sprites** — bytes in the data root, reproducible only by the
   person who uploaded them.
3. **Track geometries drawn in the editor** and not exported.
4. **The operator's own tuning**, if it lives only in one browser's localStorage.

★ Everything else in the repository is re-derivable: the client is built from source, the seeds are
tracked, and a race whose identifier survives can be re-run — **although §3.6 did not verify that
last claim**, which is why it is named here and not relied on.

### §6 — UNKNOWN

- **6.1 not run at all** (no clone detector). 6.4 depends on it and is equally unanswered.
- **6.5, 6.6, 6.7, 6.8 not performed.**
- **6.3 covers 20 of 39 documents**, by the brief's own method.
- **6.12 not tested**, only read.
- **6.2's method cannot see a drifted STRING or a drifted boolean** — it extracts numeric defaults
  only. A duplicated non-numeric truth would pass this sweep invisibly.
