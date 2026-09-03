# PUBLISH-DOCS-1 — the path from a clean clone is sound; what it omitted was three prerequisites and one file a fresh clone does not have

> **A verification pass, not a rewrite.** Every claim in the publish path was checked at the tree —
> the remote URL, the engine floors, the port, the auth strings, the CI jobs, the directory list.
> **Nothing already true was restructured, and neither of the two manual steps was closed.**

---

## THE RESULT IN ONE TABLE

| what was checked | verdict |
| --- | --- |
| 21 factual claims across `README.md`, `SETUP.md`, `DEPLOYMENT.md` | **17 confirmed true at the tree** |
| **false or incomplete** | **4** — all corrected |
| the two manual steps | **stated as steps in every document that needs them, and NOT closed** |
| documents restructured | **0** |

---

## 1. WHAT WAS CONFIRMED, SO THE FOUR CORRECTIONS ARE READ IN PROPORTION

Checked at the tree, not recalled:

| claim | how |
| --- | --- |
| the clone URL | `git remote -v` — matches, both fetch and push |
| Node 20+ | `engines: { node: ">=20" }` in all three `package.json` |
| the app and API on `http://localhost:4000` | `docker-compose.yml` `ports: "4000:4000"`, `PORT=4000` |
| `RA_BOOTSTRAP_TOKEN` preset for local use | `docker-compose.yml` `environment:` |
| the header `x-bootstrap-token` | `authRouter.js` — `req.get('x-bootstrap-token')` |
| `409 setup already complete`, `403 setup not available` | both string-exact in `authRouter.js`, both branches |
| the dev port 5173 "pinned in `client/vite.config.js`" | `server: { port: 5173 }` |
| **10 built-in tracks**, named | `server/seeds/tracks/*.json` — 10 files, ids match the README's list one for one |
| **20 built-in racer types** | the registry yields 20 |
| React 18, React Router **v7** | `^18.3.0`, `^7.18.2` |
| `FIXED_DT = 16 ms` | `raceCore.js` and `RaceScreen/index.jsx`, both |
| `raceActionStage` ships `quiet` at `defaults.js:40` | line 40 exactly — **a line citation that is still true**, which is worth noting on the night 54 others were found stale |
| the image is standalone; the context is the repository root | `docker-compose.yml` `context: .` + `additional_contexts` |
| the server serves `client/dist` and starts without it | `staticClient.js` — both log lines exist |
| track JSON is loaded into an in-memory Map at boot | matches the documented restart rule |
| the AGPL-3.0 licence and its `LICENSE` file | present, and the README's §Licence quotes it correctly |
| `npm test` in `client/` and `server/` | both declare `test` |

---

## 2. THE FOUR CORRECTIONS

### (a) `npm run verify` needs a ROOT `npm install`, and `SETUP.md` §6 did not say so

The root declares three dev dependencies — `acorn`, `pngjs`, `sharp` — and
`check-fingerprint-payload.mjs` **parses** the hashed payload literal rather than matching text over
it. Without `acorn` that guard **fails rather than skipping**, by its own design.

**CI already knew.** `.github/workflows/ci.yml`'s docs job carries a step named *"Install the parser
the payload guard needs"*, with a comment explaining precisely this. **The instruction existed in the
workflow and not in the document a person reads.**

### (b) `README.md`'s project structure omitted `shared/` — the directory the Docker build exists for

The tree listed `client/ server/ scripts/ docs/ .github/`. It omitted **`shared/`**, which holds
`nameLimits.mjs` — the one module both halves import, and **the reason the Docker build context is the
repository root at all** (IMAGE-STANDALONE-1: the Dockerfile must be able to reach it, and the image
does not run without it). `reports/` was missing too and is added: it is a top-level directory a
stranger meets.

### (c) `README.md` said CI is "lint → test → audit on every PR". It is three jobs

**Client** (ESLint, Prettier check, tests with coverage, security-audit gate), **Server** (tests,
audit gate) and **Living-doc guards + script tests** — the third of which is the one that runs every
guard this repository has, and it had no mention.

### (d) Neither entry point named `docker-compose.override.yml`, and only one document did

It is gitignored, so **a fresh clone has only the `.example`**. `ENVIRONMENT.md` says so; `README.md`
and `SETUP.md` — the two documents that walk a stranger through an install — did not mention it.

**Not closed, and correctly not closed.** PUBLISH-STEPS-1 closed the FAILURE mechanically: the server
starts, serves the app, needs no CORS same-origin, and prints
`[auth] Using ephemeral dev session secret — sessions will not survive restart`. So the file is
genuinely optional. **But "optional with a consequence" is a step, not an omission**, and the
consequence — signing in again after every restart — was discoverable only from a startup log line.
Both documents now name it in one sentence and point at `ENVIRONMENT.md` for the detail rather than
restating it.

**Also named: the prerequisites.** The README handed a stranger `npm` and `docker compose` without
saying Node 20+ and Docker had to be installed. `SETUP.md` had them; the README did not, and the
README is the front door.

---

## 3. THE TWO MANUAL STEPS — STATED, AND STILL OPEN

The brief forbade closing them. Both are stated as steps everywhere they apply:

| step | where it is stated | closed? |
| --- | --- | --- |
| **build the client before building the image** | `README.md` (in the quick-start block), `SETUP.md` §2, `DEPLOYMENT.md` (*"Run `npm run build` in `client/` first. The image copies a build, it does not make one."*) | **no** |
| **set `VITE_API_URL` for a real deployment** | `DEPLOYMENT.md`, twice — the reason and the command | **no** |

**`VITE_API_URL` is deliberately absent from `README.md` and `SETUP.md`**, and that is correct rather
than an omission: both describe a LOCAL install reached at `http://localhost:4000`, which is exactly
the client's built-in default. Naming it there would tell a local reader to set a variable they must
not set.

---

## 4. WHAT WAS DELIBERATELY LEFT ALONE

- **`DEPLOYMENT.md`.** Corrected on 2026-09-03 by CORRECTIONS-1 — the build context, the manual
  `docker build` command, and the standalone claim. **Re-checked, all three still true**; nothing
  touched.
- **The `Storage` row of the tech-stack table** — *"Browser `localStorage` + local Express backend
  for tracks/images"*. The backend also holds accounts, sessions, racer types, sprites, branding and
  player groups, and the **How it works** paragraph twelve lines below says so in full. A one-line
  table row that is narrower than the paragraph beside it is a summary, not a false claim, and
  rewriting it would be the restructuring the brief forbade.
- **`docs/ENVIRONMENT.md` and `docs/AUTH.md`.** Read; nothing false found in the publish path they
  own.
- **"npm 10+"** in `SETUP.md`'s prerequisites. Only `node: ">=20"` is declared anywhere, so the npm
  floor is an inference — a true one (Node 20 ships npm 10) but not a declared one. **Left**, because
  the alternative is to state a version nothing enforces, and R14 is against inventing a second home
  for a fact that has none.

---

## Limits

**Nothing was run.** No clone, no `docker compose up`, no `curl` against a fresh install. Every claim
was checked against the **source that implements it** — the router's string literals, the compose
file's ports, the vite config's port — which is stronger than a memory and weaker than a run. **A
stranger following this path was not simulated tonight.**

**PUBLISH-STEPS-1 did run it**, on a spare port, in September, and that is where the
"works without the override" claim comes from. It is a citation here, not a re-measurement.

**21 claims is what I chose to check**, not the total. The publish path also carries prose about what
RaceArena *is*, which is not checkable, and `DEPLOYMENT.md`'s environment table has fourteen rows
whose behaviour I read from `ENVIRONMENT.md` rather than from the server. **A false row there would
have survived this pass.**
