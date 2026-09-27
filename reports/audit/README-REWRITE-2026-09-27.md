# README-REWRITE-1 — every claim checked before it was written, 2026-09-27

**Part 2 of the six-decisions block, on `docs/2026-09-27-owner-decisions` from master `2db87bb7`.**
Documents only. `README.md`: **186 → 208 lines.**

★ **The rule this page exists to evidence:** a README that describes an intention is worse than
none. Every claim below was checked against the tree or by running the command **before** it was
written, and the two that could not be checked were **dropped and are named here** — that list is
the most useful part of this report.

---

## ★★ TWO CLAIMS DROPPED, AND ONE OF THEM CONTRADICTS THE BRIEF

**1 · "There is no mobile layout by design" — DROPPED, because it is not true.** The brief lists it
under *WHAT THIS IS NOT*. At the tree, **nine CSS files carry `max-width` media queries**, among
them `RaceScreen.css`, `SetupScreen.module.css`, `ResultScreen.css` and `Auth.module.css`, and
`client/index.html` declares `width=device-width, initial-scale=1.0`. Whatever the intent was,
responsive CSS is present across the main screens, so the sentence would have been a false claim on
the page a stranger reads first. ★ **Not written, and not "fixed" anywhere else either** — I have
shown the claim is unsupported, not established what the design intent actually is.

**2 · "Up to 3 layered animated effects per track" — DROPPED, unverifiable.** It was in the old
README and `docs/ARCHITECTURE.md:173` asserts it too. **No cap of 3 exists anywhere I could find in
the code** — not in `client/src/modules/track-effects/`, not in `TrackEditor.jsx`, not in
`defaults.js`. Replaced with what *is* countable: **7 effects ship** — `bubbles`, `dust`,
`fireflies`, `mud`, `rain`, `stars`, `wave`, counted in
`client/src/modules/track-effects/effects/`. ★ `ARCHITECTURE.md` was **left alone**: unconfirmed is
not disproved, and correcting a document on a failure to find something would be the same error in
the other direction.

---

## Command by command — what was executed

| command | executed? | result |
| --- | --- | --- |
| `cd client && npm install && npm run build` | ✔ **run** | built in 651 ms, `dist/assets/index-Dr8Ay6r5.js` 940.60 kB |
| `cd client && npm test` | ✔ **run** | **270 files, 4778 tests, all pass**, 195.4 s |
| `cd server && npm test` | ✔ **run** | **37 files, 856 tests, all pass**, 39.0 s (run alone — bcrypt) |
| `npm run verify` | ✔ **run** | PASS 30 FAIL 0 earlier this session; `--dry` on this tree: **9 will run, 27 skipped** |
| `npm run verify -- --premerge` | ✔ **run** | PASS 15 FAIL 0; `--dry` on this tree: **15 will run, 21 skipped** |
| `node scripts/backup.mjs --out <dir>` | ✔ **run** | wrote `racearena-backup-20260927T005841Z.tar` from a scratch data root |
| `node scripts/backup.mjs --restore <archive> --into <dir>` | ✔ **run** | restored 2 items; `diff -r` against the original: **identical** |
| `docker compose config` | ✔ **run** | compose file **valid** |
| `docker compose build` | ✔ **run** | `Image seasonalraceclaude-server Built`, exit 0 |
| `docker compose up -d` | ✘ **NOT run** | see below |
| `npm run configure -- --origin=…` | ✘ **NOT run** | see below |
| `curl -X POST /api/auth/setup` | ✘ **NOT run** | see below |

★★ **THE THREE I DID NOT RUN, AND WHY — because "every command was run" would have been the
report's own false claim.**

- **`docker compose up -d`.** Port 4000 is held by a **running dev backend that is the owner's**
  (`Get-NetTCPConnection` shows 4000 and 5173 both listening). Displacing a backend he may be using
  in order to test a command I could otherwise evidence is a bad trade. What I did instead:
  validated the compose file and **built the image from current source**, both executed above.
  Running the built image on a spare port was attempted and declined by the permission layer.
  **The line stays in the README** — it is the documented install path, the compose file is valid,
  the image builds, and an exited container from this very compose project is in the local Docker
  state from a previous run. **Disclosed here rather than implied.**
- **`npm run configure`.** It **writes this install's secrets** into `docker-compose.override.yml`.
  Running it to test it could overwrite the owner's real `RA_BOOTSTRAP_TOKEN` and
  `RA_SESSION_SECRET`. Deliberately not run; the script's existence and its `node scripts/configure.mjs`
  target were verified from `package.json`.
- **`curl … /api/auth/setup`.** It creates an admin account. Not run for the same reason.

---

## Claims checked before writing — and how

| claim | how it was checked |
| --- | --- |
| Node 20+ required | `engines.node` is `>=20` in **all three** `package.json` |
| clone URL | `git remote get-url origin` matches |
| 10 built-in tracks | `server/seeds/tracks/*.json` → 10 |
| 20 built-in racer types | imported `RACER_TYPES`, 20 keys |
| 7 track effects, named | directory listing of `track-effects/effects/` |
| the race is computed in the browser | `grep` for every engine module across `server/src`: **0 hits** |
| results are local-first | `raceStore.js:73` → `DATA_ROOT/races.sqlite`, redirectable by `RA_RACES_DB` |
| **36 guards in the registry** | `verify --dry` and `--premerge --dry`: 9+27 and 15+21 both = 36 |
| selection counts are diff-dependent | this tree gives **9 / 15**; `DELIVERY-CLEAN-1` §1.3 measured **4 / 15** on another diff. Both true, neither a property of the tool |
| CI runs three jobs | `ci.yml` defines `client`, `server`, `docs` |
| a separate browser gate exists | `.github/workflows/browser-gate.yml`, runs `playwright.prod.config.js` |
| no production compose | only `docker-compose.yml` + `docker-compose.override.yml.example` are tracked |
| **no HTTPS** | zero TLS/cert/proxy configuration in `docker-compose.yml` or `server/Dockerfile` |
| port binds all interfaces | `docker-compose.yml` publishes `4000:4000` |
| compose runs `node --watch` | `docker compose config` output |
| the backup refuses the data root | **executed**: *"the archive must be written OUTSIDE the data root"* |
| `--out` is required | **executed**: prints `usage: node scripts/backup.mjs --out <dir>` |
| 20 of 39 documents carry an `Owns:` line | counted; matches §1.1's "19 carry no OWNS line" exactly |
| `ROADMAP.md` is a redirect | its own text says it owns nothing |
| LICENSE present, AGPL-3.0-or-later | file exists; text checked |
| `"private": true` in all three manifests | read from each `package.json` |

★ **One correction made to my own draft before it shipped.** I wrote *"Each document below declares
what it owns"* over a 13-row table. **Five of those thirteen declare no `Owns:` line** —
`GLOSSARY.md`, `FAIRNESS.md`, `PROJECT-PRINCIPLES.md`, `VERIFY-RULES.md`, `DEAD-ENDS.md`. The
sentence was corrected, the five are marked **†**, and the column header now reads *"what it owns,
or (†) what it covers"*. Left unmarked it would have been a new false claim in the same page that
exists to stop them.

---

## What was carried over, and what was removed

**Carried over** (verified in §9.4 and re-checked): the Node/Docker floor, the clone-and-build
quickstart, the bootstrap-token explanation and the `docker-compose.override.yml` warning, the
dev-mode split on port 5173, the 10-tracks/20-racers counts, and the whole licence section
including the AGPL section-13 note.

**Removed:**
- the HTML screenshot placeholder comment (an instruction to a future author, not content);
- the *"Features (detail)"* list, which restated `ARCHITECTURE.md` — one canonical home;
- the *"Tech stack"* table: it named library versions the README would have to chase, and none of
  them is a fact a newcomer needs before `docs/ARCHITECTURE.md`;
- the *"Status"* paragraph, folded into **What this is not** with the Phases 5–7 pointer intact;
- the two dropped claims above.

**Added:** the guard table and the *bare `verify` is not CI green* warning; the deployment section
stating no production compose and no HTTPS; the backup section including decision 2; the document
map with `Owns:` lines and the † marks; **What this is not**.

---

## Noticed but left alone

- **`docs/ARCHITECTURE.md:173`** asserts the 3-effect cap I could not find. Not touched — see above.
- **The client bundle is 940.60 kB** and the build prints a chunk-size warning on every run. Real,
  pre-existing, and a product question rather than a documents one.
- **`client/index.html` declares a responsive viewport** while the race canvas is a fixed store.
  Whether the app is *meant* to work on a phone is a design question nobody has written down; this
  block is not the place to decide it.
- **The README still names `docker compose up -d` without my having executed it.** Kept, disclosed
  above; if the owner would rather the page carried only commands this run executed, say so and it
  comes out.

## What this does not establish

- **A README can be true sentence by sentence and still mislead by omission.** Nothing here
  measures that.
- **The install path was not walked end to end by a stranger on a clean machine** — the three
  unrun commands are exactly the ones such a walk would cover.
- **`docs/ARCHITECTURE.md` was not re-audited**; only the one claim the README wanted to reuse was
  checked, and it did not survive.
