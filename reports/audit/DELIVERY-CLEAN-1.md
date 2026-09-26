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
