# INSTALL-GAPS-1 — a fresh install cannot create its first admin by following the documents

Branch `night/2026-09-19`, piece 6. Date: 2026-09-19.
**★ READ-ONLY. This piece builds nothing, configures nothing, registers nothing, and runs no
installer.** No source changed, no document changed, nothing minted. Every entry below was checked
against the tree rather than remembered — the brief says an entry that is WRONG costs more than one
that is missing, so anything not verified is marked as such.

---

## ★★★ THE ONE LINE

> **Follow `README.md` on a clean machine and you get a working server you can never sign into.**
>
> Both front doors tell you to copy `RA_BOOTSTRAP_TOKEN` out of `docker-compose.yml`. **It was
> deleted from that file on 2026-09-08 by INSTALL-SECRETS-1**, deliberately and correctly. Nothing in
> either install document names `npm run configure`, which is the only supported way to get one.

---

## 1 · WHAT THE INSTALL PATH IS TODAY

| step | where it is written |
|---|---|
| 1. clone | `README.md:25`, `docs/SETUP.md:24` |
| 2. `cd client && npm install && npm run build` | `README.md:28`, `docs/SETUP.md:31` |
| 3. `docker compose up -d` — serves the app AND the API on **4000** | `README.md:29`, `docs/SETUP.md:37` |
| 4. `POST /api/auth/setup` with `x-bootstrap-token` to create the first admin | `README.md:36-41`, `docs/SETUP.md:62-67` |
| 5. sign in at `http://localhost:4000` | `README.md:43`, `docs/SETUP.md:79` |

A public deployment is `docs/DEPLOYMENT.md`'s; every variable is `docs/ENVIRONMENT.md`'s. **Those two
are in good order** and are not the subject of this report.

---

## 2 · ★★★ BLOCKS AN INSTALL

### ★★ 2.1 The bootstrap token is fetched from a file it was removed from

| | |
|---|---|
| `README.md:32-34` | *"For local use `docker-compose.yml` already sets it; copy the value from there into the command below"* |
| `README.md:39` | `-H 'x-bootstrap-token: <the RA_BOOTSTRAP_TOKEN from docker-compose.yml>'` |
| `docs/SETUP.md:58-60` | *"for local use `docker-compose.yml` already sets it, so copy the value from there"* |
| `docs/SETUP.md:65` | the same header line |
| ★ **the truth** | `docker-compose.yml:27` — *"`RA_BOOTSTRAP_TOKEN=…` STOOD HERE AND IS GONE (INSTALL-SECRETS-1, 2026-09-08)"* |

**What actually happens to a stranger:** the `environment:` block has no token, the server starts and
prints a READINESS line saying so (`server/src/startupReadiness.js:57`), `POST /api/auth/setup`
answers **403 setup not available**, and — by deliberate design (`docs/ENVIRONMENT.md`) — *"the two
cases are indistinguishable to the caller"*. So the reader cannot tell a missing token from a wrong
one, and the document has just told them the token exists.

★ **The remedy exists and is not reachable from either document.** `docker-compose.yml:36` names it —
*"`npm run configure` GENERATES this and RA_SESSION_SECRET into docker-compose.override.yml, unique
per install and never printed"* — and `scripts/configure.mjs:97-107` confirms it. **`npm run
configure` appears in `docs/DEPLOYMENT.md` and in no local-install document at all.**

★ **And the secrets are never printed**, deliberately (`scripts/configure.mjs:103`): they are written
into `docker-compose.override.yml` and *"that file is where the operator reads them"*. **Nothing
tells a first-time installer to look there.**

**→ blocks an install.** A working server nobody can open.

### ★ 2.2 `docker-compose.override.yml` is called optional and is not

`docs/SETUP.md:45` heads the paragraph **"Optional, and the server will tell you"**, and says
*"Without it everything works"* — describing only the ephemeral-session consequence.

Since INSTALL-SECRETS-1 that file is **the only home of the bootstrap token**, so on a FIRST install
it is required. Measured at source: `docker-compose.override.yml.example` contains exactly
`RA_SESSION_SECRET` and `RA_CLIENT_ORIGIN` — **so copying the example, which both documents tell you
to do, still leaves you with no token.**

★ `docs/ENVIRONMENT.md:19` gets closer than the other two — *"the one that catches people"* — but
names only the session secret and CORS.

**→ blocks an install.**

### 2.3 The server's own dependencies are never installed by any documented step

`docs/SETUP.md:93-95` gives the non-Docker start:

```
RA_SESSION_SECRET=... RA_BOOTSTRAP_TOKEN=... node server/src/index.js
```

and `docs/SETUP.md:103` gives `cd server && npm test`. **Both need `server/node_modules`, and no
document ever says `cd server && npm install`.** `server/package.json` declares nine runtime
dependencies — `bcrypt`, `better-sqlite3`, `better-sqlite3-session-store`, `cors`, `express`,
`express-rate-limit`, `express-session`, `helmet`, `multer`.

★ **The Docker path is unaffected** (the image installs them), which is why this has gone unnoticed:
the documented happy path hides it and both documented escapes from it hit it.

**→ blocks an install**, for §5 and §6 of SETUP.

★ **A related one, worth knowing before it surprises somebody:** `server/package.json`'s `lint` and
`format` scripts run `node ../client/node_modules/eslint/...`. **The server's linting needs the
CLIENT's install.** Not install-blocking; named because nothing says it.

---

## 3 · WORKS BUT UNDOCUMENTED

### 3.1 There is no upgrade procedure, anywhere

Searched: `README.md`, `docs/SETUP.md`, `docs/DEPLOYMENT.md`, `docs/DEPLOY-NOTES.md`. **No occurrence
of "upgrade".** `docs/SETUP.md:118-131` covers restarting after a local change (`docker compose
restart server`, `docker compose build` when the client build or `package.json` moves), which is the
development loop rather than *"a new version is out; what do I run, in what order, and what happens
to my data"*.

The pieces all exist — `git pull`, `cd client && npm run build`, `docker compose build`,
`docker compose up -d`, and the seed-redelivery machinery (`server/src/seedDelivery.js`) that brings
shipped records forward by version. **Nothing assembles them into a procedure.**

### 3.2 Nothing tells you how to back up, and one document says loudly that you must

`server/data/README.md:15` carries its own heading — **"THIS DIRECTORY IS NOT BACKED UP ANYWHERE"** —
and says OneDrive *"SYNCS rather than backs up: a deletion propagates to the cloud exactly as
faithfully as a new file does"*. It then names no procedure.

`npm run data:export` exists (`package.json` → `scripts/data-export.mjs`). ★ **It is named in
`docs/ENVIRONMENT.md` once, as the owner of an env var, and in `docs/BACKLOG.md` as an open item. It
appears in no install-facing document.** `docs/DEPLOYMENT.md` says *"Back it up, and mount it as a
volume"* without saying with what.

### 3.3 `npx playwright install chromium` is named only inside the ship ceremony

`docs/SETUP.md:99-104` is the "Running the tests" section and lists the three suites. The browser
suite needs a Chromium download that no document in that section mentions; the only occurrence in
the tree is `docs/SHIP-CEREMONY.md:790`.

### 3.4 `scripts/migrate-teams.mjs` is documented in no document at all

A one-time backfill that writes `users.json`. Its own header is complete and good — including
*"run with the server stopped"* — but `grep` over `docs/` and `README.md` returns **nothing**. A
migration nobody can find is a migration that does not get run.

---

## 4 · ★★ WHAT BREAKS WITHOUT THE OWNER'S OWN DATA DIRECTORY — MEASURED, AND THE ANSWER IS "NOTHING"

`server/data/**` is gitignored (`.gitignore`, keeping only its README), and shipped records are
copied from `server/seeds/` on first boot. **What is seeded, and what only he has:**

| type | in `server/seeds/` | in HIS `server/data/` | seeded on boot? |
|---|---|---|---|
| `tracks` | **10** | 10 | ✅ `routes/tracks.js:303` |
| `backgrounds` | **10** | ★ **13** | ✅ `routes/tracks.js:304` |
| `brands` | 1 | 2 | ✅ `routes/brands.js:88` |
| `brand-logos` | — | — | ✅ `routes/brands.js:89` |
| `player-groups` | 1 | 3 | ✅ `routes/playerGroups.js:59` |
| `racers` | — | ★ **0 — empty in his install too** | ❌ created on demand, `routes/racers.js:50` |
| `racer-sprites` | — | ★ **0 — empty too** | ❌ created on demand, `routes/racers.js:51` |
| `surface-classes` | — | ★ **0 — empty too** | ❌ created on demand, `routes/surfaceClasses.js:32` |

★★ **The three unseeded directories are empty in the owner's own install**, so a fresh machine is
missing nothing by not having them. **This is the entry it would have been easiest to get wrong** —
three directories with no seed source look exactly like a gap until you look inside them.

★ **His three extra backgrounds are unreferenced.** `2c02ee38d898.jpg`, `d4ee12be7c33.jpg`,
`e26cbbcb1cc5.jpg` — hash-named uploads. Searched across `server/seeds/` and `server/data/tracks/`:
**no track record names any of them.** And going the other way, **no seeded track references a
background that is not in `server/seeds/backgrounds/`** — checked by reading every seeded track
record, not by eye.

★ **What a fresh install genuinely does not get** is his accounts and his sessions — `users.json`,
`sessions.sqlite`, `setup-complete.json`, `races.sqlite` — which is correct: a new install creates
its own through §4 of SETUP, and `setup-complete.json` being absent is precisely what allows it.

**→ cosmetic.** A fresh install gets all ten tracks, all ten backgrounds, the brand and the group.

---

## 5 · GITIGNORED AND REQUIRED

| path | required by | verdict |
|---|---|---|
| ★ `docker-compose.override.yml` | the **bootstrap token**, since INSTALL-SECRETS-1 | ★ **blocks an install** — §2.1, §2.2 |
| `client/dist` | the server serves it; the image copies it | **works, documented** — README, SETUP §2, DEPLOYMENT |
| `server/data/**` | the runtime store | **works** — auto-seeded on first boot; §4 |
| `node_modules` | everything | **works, partly documented** — §2.3 is the hole |
| `.env` | ★ **nothing** | ★ **cosmetic.** Checked: no `dotenv` import anywhere in `server/src/`, and `scripts/configure.mjs:27` says deliberately that it writes none, because *"a file that LOOKS configured"* without `--env-file` is worse than none |

---

## 6 · WHAT A FRESH MACHINE WOULD NEED

Stated as a list because no document states it in one place:

1. **Node.js 20+** and **npm 10+** — `README.md:18`; `engines: {"node": ">=20"}` in all three
   `package.json` files.
2. **Docker** — for the documented path.
3. `npm install` at the **repository root** — documented (`docs/SETUP.md:101`) and load-bearing:
   `acorn`, `pngjs`, `sharp`, plus the git hooks through `prepare`.
4. `npm install` in **`client/`** — documented.
5. ★ `npm install` in **`server/`** — **not documented anywhere** (§2.3).
6. ★ `npm run configure`, then read the generated token out of `docker-compose.override.yml` —
   **not documented in any install-facing document** (§2.1).
7. ★ `npx playwright install chromium`, for the browser suite only — **documented only inside the
   ship ceremony** (§3.3).
8. **Native modules build or download**: `bcrypt` and `better-sqlite3` in `server/`, `sharp` at the
   root. ★ **NOT VERIFIED HERE** — this piece installs nothing, so whether a clean Windows machine
   gets prebuilds or needs build tools is unmeasured and is not claimed either way.

---

## THE STOP CONDITION, AND WHAT THIS PIECE DID NOT DO

**Nothing was changed.** No document, no script, no configuration. `npm run configure` was **read,
not run** — running it would write `docker-compose.override.yml` into the owner's tree, which is the
"registers nothing" line of the brief. No fingerprint could move and none was re-run for this piece.

★ **One thing deliberately left to him:** the four documents in §2 are wrong today and the fix is
three sentences. **Fixing them is a decision about what the front door says**, and this piece was
scoped read-only, so it is a list to plan from rather than a patch.
