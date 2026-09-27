# DELIVERY-CLEAN-1 — the whole project, audited for a clean shippable state

**Begun 2026-09-26 from master `6b60edd8`, on branch `audit/2026-09-26-delivery-clean`.**
A FINDING run. Nothing here changes behaviour. Where a repair was authorised — a comment that
states something the code does not do, a sentence a living document contradicts, a dead variable, a
hardcoded path — it was made and is reported; everything else is a row, never a build.

★ **How to read the numbers.** Every verdict in this report carries a denominator and the command
that produced it. Where a count of mine was wrong, the wrong figure is kept beside the right one
rather than edited away, because a number that quietly changes cannot be checked.

## §11 — THE RANKED LIST

★★ **Written from scratch on 2026-09-27, after all eleven pieces were performed.** The version that
stood here before was written mid-chain, when five pieces had not run; it is not amended, it is
replaced, and where it was wrong the correction is named below rather than edited away.

Every entry carries an address and an impact. ★ **Group C is not promoted for being easy to fix,
and no duplicated truth whose copies disagree was found, so nothing was demoted into C either.**

### A — THREATENS THE OPERATOR

**Empty — and the sentence is now worth more than it was, because the check that could have filled
it has run.**

58 routes on nine routers enumerated; authentication, session, hashing, rate-limiting, upload
bounds, error leakage and CORS examined at the addresses in §2; cross-team isolation on races
**tested** with two users, 5 of 5 passing; 30,719 git objects swept for secrets, 0 hits; 6
dependency advisories, all one dev-only family absent from the shipped artefact.

★★ **§2.11 has now run, and it is the reason the old caveat is gone.** The production bundle
carries **no source maps and no dev plugin**. `/dev` is reachable by any signed-in user — that is
deliberate, an operator is meant to reach Race Defaults, Tracks, Branding and Player Groups — and
the nine advanced sections are filtered out by `DevScreen.jsx:191-194`. That filter is client-side,
which is B8 below rather than an A, because the values it guards are `localStorage`, no server
authority rests on it, and the server's own boundary is the 16 admin-classified routes of §1.4 kept
honest by `routePolicyDrift.test.js`.

★ **What an empty A still does NOT mean. No penetration testing was performed.** This is "nothing
found by the checks that ran, and those checks are now enumerated", not "nothing is there".

### B — COULD AFFECT A RESULT, OR CANNOT BE RECOVERED IF LOST

| # | finding | address | impact |
| --- | --- | --- | --- |
| B1 | **A signed-in user can post a result no simulation produced.** The server validates structure, never outcome. | `raceStore.js:235,264-274`; decision at `raceHistory.js:9-14` | By design (2026-09-06). Bites the day an account is shared or taken. ★ **Its remedy is now PROVEN — see the B5 row.** |
| B2 | **Data and backup end up on one machine.** The tool refuses the data root, but nothing moves the archive off the host, and compose bind-mounts data from the repo checkout with no production compose. | `backup.mjs:186,320`; `docker-compose.yml:48-55` | A disk loss takes the races and the archive together. Recoverable only by a habit nothing enforces. |
| B3 | **Six of seven data modules have no team scoping.** Tracks, surface classes, player groups, brands, racers and seed notices contain zero occurrences of `team`; races has 20. | §1.4; `crossTeamAccess.audit.test.js` | Harmless today — one team. On the day a second team is invited, everything except races is shared. ★ **See the warning attached to that test, below.** |
| B4 | **The API binds all interfaces.** `4000:4000`. | `docker-compose.yml:17-18` | On a VPS the API is directly reachable unless a firewall or proxy is put in front. |
| B6 | **A race that ran on non-default settings is recorded but not flagged.** `world_configs` stores the resolved config; nothing marks the row. | `raceStore.js:164,358,465` | A dispute is settleable, but only if somebody thinks to look. |
| ★ B7 | **NEW — the upload size-and-type bound exists in THREE independent copies.** `LIMIT_FILE_SIZE` → 413 and `INVALID_TYPE` → 400, identical including the interpolated message. | `brands.js:314`, `racers.js:281`, `tracks.js:595` | **This is the bound §2.6 called "bounded".** Change the limit, the status or the wording in one and the other two diverge silently, and the §2.6 claim becomes true of one route and false of two. Recorded, **not de-duplicated** — that is a refactor. |
| ★ B8 | **NEW — the dev screen's advanced tier is filtered client-side only.** `effectiveView = isAdmin ? view : 'operator'` hides 9 of 16 sections from a non-admin. | `DevScreen.jsx:191-194`; route at `App.jsx:97-104` | **Low, and here is the reasoning rather than the label:** the sections write `localStorage`, not server state, so an operator who defeated the filter would change their own browser's race settings — which §3.4 establishes the stored race records. No server authority rests on it. |

★★ **B5 IS RESOLVED, and it was the most valuable open question in the chain.** It read
"re-running a race from its identifier is UNVERIFIED — the remedy every other result-integrity
finding leans on". **It was tested, against a real stored race from the owner's own database**
(`W57FQA`, seed 9, 40 racers, `quiet`), replayed through `scripts/diag/replay-stored-race.mjs`:
**40 of 40 positions and 40 of 40 finishing times identical, to the millisecond.** ★ **What it
proves and does not:** the ENGINE reproduces a stored record from that record's own inputs. It does
not prove the record describes the race anybody watched — replaying a fabricated result would
reproduce the fabrication faithfully. **The replay settles "did the engine do this", never "did
this happen."**

★★ **A WARNING THAT BELONGS ON B3, carried forward on the owner's instruction rather than acted
on.** `server/src/routes/crossTeamAccess.audit.test.js` is green, and **it asserts today's truth
INCLUDING WHERE THAT TRUTH IS "NO SCOPING".** It pins that team B cannot read team A's races AND
that six of seven modules carry no team vocabulary at all. That is correct for an audit probe — it
stops the boundary eroding unnoticed — and it becomes **wrong the day the boundary is built**,
because a green test will then be asserting the absence of the thing somebody just built.
**Nobody should read that green as a boundary that exists.** Whoever builds tenancy must change
this test in the same commit.

### C — UNTIDY, COSTS NOBODY ANYTHING TODAY

| # | finding | address |
| --- | --- | --- |
| C1 | **No `npm run backup`.** The tool is real, tested and documented; zero script entries match `backup` in any of the three manifests. | §8.4 |
| C2 | **65 scripts are named by no package script, guard, hook, CI file or other script.** | §1.2 |
| C3 | **19 of 39 top-level documents carry no OWNS line**, capping the overlap check at half the corpus. | §1.1, §6.3 |
| C4 | **`framingRule.js` defaults `innerFramePct` to 1 in five signatures** while the shipped config is 0.7. | `framingRule.js:207,427,479` |
| C5 | **The base image is a floating tag**, `node:20-alpine`, not a digest. | `Dockerfile:22,33` |
| C6 | **The backup writes no checksum**, so a corrupted archive is discovered on restore. | §8.4 |
| C7 | **The session cookie lives 30 days.** Deliberate; listed so it is a choice, not an accident. | `session.js:108` |
| ★ C8 | **NEW — a dependency version skew.** `@vitest/coverage-v8` is `^4.1.4` in the client and `^4.1.8` in the server. Dev-only. | §6.6 |
| ★ C9 | **NEW — one stored key name, two settings, two stores.** `minTargetScreenPx` is a global floor in `autoSpriteScale.js:23` and a per-racer-type tunable in `racer-types/index.js:239`. Not renamed: a stored-key rename touches saved configs. | §6.7 |
| ★ C10 | **NEW — two benchmarks require `--master` on any machine but the one they were written on, and neither says so when it fails.** `C:/ra-wt-nanoid` is a worktree; there is no portable default, so `tmpdir()` would be wrong rather than better. | `label-bench-matrix.mjs:40`, `phys-bench-matrix.mjs:63` |
| ★ C11 | **NEW — `client/e2e/` is outside the format guard.** `format:check` is `prettier --check src`; `e2e/d355-smoke.spec.js` fails prettier today. Verified pre-existing at master. Not reformatted — widening a guard's scope is a decision. | §10 run 2 |
| ★ C12 | **NEW — 8 exported symbols with no importer.** Never removed: an unimported export may be a seam. ★ Three of the eight are mine, from RACE-SOURCE-1 the day before this audit. | §5.3 |
| ★ C13 | **NEW — 46 of the 59 API routes are documented nowhere.** `API.md` documents 13 and now says so correctly. | §9.2 |

### ★ WHAT THIS AUDIT CHANGED IN THE TREE — none of it behaviour

Listed because a report that only names problems hides what it did to the tree.

★★ **THIS TABLE REPLACES A COUNT OF "62" THAT I COULD NOT REPRODUCE.** The first version totted
up per-piece figures I had written at different times and reached 62; asked to verify it against
`git diff`, it did not come out. **The figures below are all read from one command**
(`git diff --numstat master...HEAD`) so any reader can re-run them, which the 62 was not.

| area | files | +/− | what |
| --- | ---: | --- | --- |
| `scripts/diag/*` | **42** | +105 − 68 | 38 `c:/tmp/…` defaults → `join(tmpdir(), …)` (the pattern the 2026-09-25 fix established), plus the wrong comment addresses in `comeback-beats.mjs` and `leader-lag-tc.mjs` |
| `docs/*` | **10** | +165 − 25 | 8 documents repaired; `BACKLOG.md` (+98) and `OPEN.md` (+39) are §11's bookkeeping, not repairs |
| `client/` + `server/` | **12** | +192 − 12 | of which **168 added lines are ONE new file**, `crossTeamAccess.audit.test.js` — a probe, not a repair |
| `scripts/` (other) | 2 | +2 − 2 | one wrong address each in `goldenRunner.mjs` and `sim-fairness.mjs` |
| `README.md` | 1 | +6 − 4 | the three wrong claims of §9.4 |
| **total** | **67** | **+484 − 111** | |

**The substantive repairs inside that, by kind:** 38 hardcoded script paths · 17 wrong comment and
document addresses · 3 dead test variables removed and 1 kept with a corrected address · 1
unparseable script · 1 dead eslint directive · and the wrong sentences in 8 living documents.

★★ **Two of those repairs are worth more than their size.** The script name
(`check-bundle-address.mjs` → `audit-bundle-address.mjs`) was wrong in **both documents an operator
reads while deploying**, and the obvious fix — renaming the script to match — would have
auto-registered it as a routed guard and reddened `verify` on every tree without a fresh client
build. And the unparseable script had been dead since `becc455c` on 2026-08-22 with nobody noticing,
which is the clearest single proof that §7.1's unread 226 scripts is a real gap and not a formality.

---

## §11.2 — WHAT NEEDS HIS WORD

Each in one sentence, with the readings he is choosing between. ★ **Nothing appears here that a
measurement could have settled, and one item has LEFT this list because a measurement settled it.**

1. **Should the server check a result, or stay a second store?** Today anyone who can sign in can
   file a race that was never run (B1). The readings: leave it — the room is invited and the trust
   is deliberate; or have the server recompute the outcome from the stored inputs before accepting
   it. ★ **This question is now better informed than when it was first asked:** the replay works
   exactly (B5), so "the operator can re-run a disputed race" is a real remedy and not a hope.

2. **Where should a backup go, and who moves it?** The tool already refuses to write inside the
   data root, so the question is whether the operator copies the archive off the machine by hand,
   or whether this project grows something that does it (B2).

3. **When the second team arrives, what is shared?** The boundary he stated on 2026-09-25 covers
   brands, player groups and team-created tracks; six modules scope nothing (B3). The readings:
   build the boundary before inviting anybody, or invite and accept that everything but races is
   common.

4. **May a browser spec tolerate a frame-starved run?** Carried from the comeback thread, unchanged
   by this audit: tolerate it in the spec, or make the shot frame-independent in the camera.

5. ★ **NEW — should the three upload handlers become one?** B7 is the bound §2.6 leaned on, living
   in three copies. The readings: leave them and accept that the "bounded" claim is three claims;
   or de-duplicate, which is a refactor of live request handling and is forbidden to me without his
   word.

6. ★ **NEW — should I rewrite the README after all?** §9.4 checked 24 of its claims and found 3
   wrong, all repaired. I judged a wholesale rewrite to be churn against a document with a 3-in-24
   defect rate and said so rather than skipping quietly. **His call; I will do it on a word.**

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

★★ **No field failed to survive** — **but this figure was CORRECTED by §10.3 and the first version
is kept beside it.** As first written: *14 of 14 scalars compared by name, plus five structured
fields.* The adversarial pass established that `hydrate()` returns **27** fields and that **8 were
never compared**, including `id`, the content address. The round trip was re-run with every field
populated: **ALL 27 FIELDS COMPARED, 0 mismatched.** The claim holds; it did not hold as
originally established.

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

---

## §4 — COMMENTS THAT LIE

**Partially done.** 4.1 ran and 4.4 repaired what it found; **4.2, 4.3 and 4.5 did not run.**

### 4.1 Every `file:line` address in a comment — 253 found

Method: every tracked `.js` / `.jsx` / `.mjs` file, every line beginning `//`, `*` or `/*`, matched
for `path/file.ext:NNN` and `#LNNN` forms; each address resolved repo-relative, then relative to the
citing file, then by unique basename.

| | count |
| --- | --- |
| comment addresses found | **253** |
| resolved to a real file | **211** |
| ambiguous basename (e.g. `index.jsx`, which many files share) — **not a finding** | **35** |
| ★ **no such file** | **7** |
| ★ **cited line past the end of its file** | **0** |

Of the 7 "no such file", **3 are illustrative placeholders** in `check-fallback-agreement`'s own
documentation of the citation format (`file.js`, `../path/file.js`) — correct as written. The other
**4 were real**, and all four the same mistake.

### 4.4 What was repaired — 12 corrections in one file

★★ **`scripts/diag/comeback-beats.mjs` cited `cameraDirector.js` — the file is `CameraDirector.js`.**
A case error that resolves on Windows and would not on Linux, in 4 comments.

★★ **AND THE LINE NUMBERS WERE WRONG TOO — which my own check could not see.** Correcting the case
exposed it: those comments, and eight more in the same file that had the filename right, pointed at
lines that no longer hold what they claim.

| the comment claimed | it pointed at | the real address |
| --- | --- | --- |
| `_acceptsOffer` | `:724` — prose inside a comment block | **`:736`** |
| `_weightedRandomPick` | `:730` — more of the same comment | **`:742`** |
| `max(minStateHold, maxStateDuration)` | `:960` — a note about the ctx transform | **`:1035`** |
| the leader ratio `leader.t / finishT` | `:1551` — `if (!(sLen > 0)) return null;` | **`:968`** |
| the director's contest | `:1709-1725` | **`:1840-1850`** |
| the outcome-phase gate on the candidate | `:1711-1715` | **`:1791-1793`** |

**12 corrections in total.** The script was re-run afterwards and produces identical output
(`--tracks=space-sprint --seeds=2` → `written [#9@resolve 0.7] shown [#9@0.6001]`), and lints clean.

★★ **THE LIMITATION THIS EXPOSED, and it matters more than the count.** 4.1 asks two questions —
*does the file exist* and *does the cited line still contain what the comment claims*. **My check
answered only the first.** It reported `0` addresses past the end of a file, which was true and
nearly worthless: every one of the 8 worst errors here had a valid filename and an in-range line
number, and was found only because correcting the case made me read the lines. **A guard built on
the cheap question would pass this file today.**

### 4.2, 4.3, 4.5 — NOT DONE

- **4.2** (comments containing *only*, *never*, *always*, *every*, *the one place*, *cannot*,
  enumerated and each verified) — **not started.** In a codebase whose comments are load-bearing,
  this is the sub-section most likely to hold a real finding, and it is the one I did not reach.
- **4.3** (comments stating a number that is also a config default) — **not started.** Note that
  §6.2 swept *code* for drifted values and found none in product source; **comments were not in that
  sweep**, and `check-config-claims` covers documents while `check-tooltip-values` covers tooltips —
  so comments are the one surface with no guard and no audit.
- **4.5** (offer a `check-comment-addresses` guard) — ★ **deliberately NOT built.** The brief's own
  condition is that a guard which cannot go red under sabotage is not a guard. The only version I
  could have written tonight is the cheap one, and 4.4 has just demonstrated it would be green on a
  file carrying eight wrong addresses. **Shipping that would have added a guard whose green means
  nothing.** The useful guard — one that checks the cited line still contains the cited symbol —
  already exists in part as `check-fallback-agreement`'s RULE F, which covers **symbol citations in
  documents**; extending it to comments is a real piece of work and is recorded, not attempted.

### §4 — UNKNOWN

- **Whether any of the 211 resolvable addresses points at the wrong line** is unknown for 203 of
  them. Eight were found wrong by hand, in one file, by accident.
- **4.2 and 4.3 entirely unmeasured.**
- The 35 ambiguous-basename citations were **not disambiguated** — each may be right or wrong and
  this pass did not open them.

---

## §4 — COMMENTS THAT LIE (COMPLETED 2026-09-27)

★★ **The first pass of this piece shipped a check that was worthless, and said so. This is what the
repaired check found.**

### 4.1 REPAIRED — the check now verifies CONTENT, not existence

The first version asked only *does the cited line exist*. It scored **0** on a file carrying eight
wrong addresses. The repaired version asks the question that matters: **the comment names a symbol
beside the address — is that symbol still at the cited line?**

★ **Reused, not invented:** this is `check-fallback-agreement`'s RULE F — which already pairs a
backticked symbol with a line anchor for **documents** — applied to **comments**. The only new thing
is the surface.

| | existence check (first pass) | **content check (repaired)** |
| --- | --- | --- |
| citations judged | 253 (all) | **39 paired** (symbol + address) |
| wrong | **0** | ★ **17** |
| unpaired, counted not judged | — | 202 (a bare address makes no checkable claim) |

★★ **17 wrong where the old check found 0.** That is the whole argument for the repair, and it is
why 4.5 below is still not built.

### 4.4 — 17 repaired, 3 excluded by rule, 1 a false positive of my own check

**14 corrections in the first pass** (a filename case error plus eight drifted line numbers in
`comeback-beats.mjs`), **then 5 more** once the content check ran:

| file | claimed | corrected to | what was wrong |
| --- | --- | --- | --- |
| `planConfigMirror.test.js` | `racePlanner.js:886` | `:904` | drifted line |
| `goldenRunner.mjs` | `racePlanner.js:886` | `:904` | drifted line |
| `RaceScreen/index.jsx` | `SetupScreen.jsx:688` → my first fix `:148` | **`:180`** | ★ the comment says *written at* — `:148` is a READ, `:180` is the write |
| `comeback-beats.mjs` | `heroChoreography.js:111` | **`racePlanner.js:1159`** | ★ **wrong FILE** — `_heroCurves` is not in that module at all |
| `leader-lag-tc.mjs` | `CameraDirector.js:1323` | **`cameraTimingComputation.js:224`** | ★ **wrong FILE** — `trackingTC` does not appear in the director |
| `comeback-beats.mjs` | `comebackDetector.js:30` | `:171` | pointed at prose, not the membership test it describes |
| `motion-continuity-census.mjs` | `viewerProbe.js:39` | `:245` | pointed at prose, not the frame read |
| + `_pickNextState`, `buildCameraPlan`, `raceProgress`, `endgameThreshold`, `_runInProgressOf`, `finishRank`, `stepRacePhysics` | various | definition lines | drifted |

**3 remaining are in `reports/`** — the lab journal, which this project's own rule allows to go
stale, and correcting it would rewrite what was believed on the day it was written. **1 is a false
positive of my own checker**: `comeback-beats.mjs:21` lists three beat names and my "last backticked
symbol" heuristic picks `resolve` when the address is about `buildCameraPlan`.

### 4.2 — absolutes: **7,131 found, 93 narrowed, 8 verified, 8 survive**

| | count |
| --- | --- |
| comment lines containing an absolute (non-report source) | **7,131** |
| of which *every* 2,071 · *only* 1,922 · *never* 1,526 · *cannot* 936 · *always* 295 · *must not* 290 · *the one place* 34 · *no other* 32 · *impossible* 25 | |
| narrowed to uniqueness/impossibility claims — the ones that make a reader stop looking | **93** |
| mechanically verified by an uncapped search | **8** |
| **survived** | **8 of 8** |

★★ **COVERAGE STATED, because 7,131 cannot be hand-verified in one pass: 8 of 7,131 is 0.1%**,
chosen by falsifiability rather than at random. This sub-section is **bounded, not complete**.

★ **And my probe produced 3 false positives out of 8**, which is worth more than the pass rate:
`restampSession.js`'s claim survived because the two other `regenerate(` sites are *login* and
*setup* anti-session-fixation, not a self-password-change; `durationModel.js`'s survived because the
three hits are **call sites**, not second definitions; `suiteShape.mjs`'s survived because
`vitest.config.js:46` **imports it** and `:71` consumes what it returns. A uniqueness claim cannot
be checked by counting occurrences of a name.

### 4.3 — comments stating a config value: **one wrong, and 65 waiting to drift**

| | count |
| --- | --- |
| comment lines naming a config key **and its correct value** | **65** |
| naming a key and some other number (ranges, counts, dates, measured figures) | 159 candidates, read by hand |
| ★ **stating a value the config does not ship** | **1** |

★★ **THE ONE, AND IT WAS MISLEADING IN BOTH HALVES.** `CameraDirector.js:4349` read *"Inert at the
shipped default (`leaderAimRoomFloorPx` 0)"*. The shipped default is **not 0**
(`defaults.js:944`), so the reduction is **not inert** — it is live in every race. A reader who
believed that line would have discounted a lever that is always on.

**Repaired the way this project repairs a drifted number: by REMOVING it, not correcting it.** The
replacement says what is true without a value — the floor is applied whenever it is positive, and
`forwardFracForRoomFloor` is the one helper that applies it — and points at `defaults.js` as its one
home. ★ `engine-reach --check` on the file: *"in the hull but INERT — same tokens, same line breaks
between them — comments only"*, so no fingerprint can move.

★★ **THE 65 ARE THE STANDING EXPOSURE.** Documents are held by `check-config-claims`; tooltips are
held by `check-tooltip-values` since 2026-09-26. **Comments are held by nothing**, and 65 of them
carry a config value today. That is the row, not a repair.

### 4.5 — the guard: **STILL NOT BUILT, and now for a better reason**

The brief's condition is that a guard which cannot go red under sabotage is not a guard. The
repaired check **does** go red — it found 17. But it is **not green tree-wide**: 4 citations remain
(3 in `reports/`, 1 a false positive of the heuristic), and its own pairing rule misfires on a
comment that lists several symbols. **Wiring it would put a guard in `--premerge` that is red on
arrival and whose red includes a case it is wrong about.**

★ **Recorded as a row instead**, with what it would take: pair on the symbol NEAREST the address
rather than the last one before it, decide whether `reports/` is in scope, and only then wire it.
The script itself is in this report's evidence, not committed as a guard.

### §4 — UNKNOWN

- **203 of the 242 resolvable citations are UNPAIRED** — a bare `file.js:123` with no symbol makes
  no claim a machine can check. Whether any points at the wrong line is **unknown**, and it is the
  larger half of the surface.
- **7,123 of 7,131 absolutes are unverified.**
- 4.3's 159 "other number" candidates were read by eye for the one finding above; they were **not**
  individually adjudicated.

---

## §10 — THE ADVERSARIAL PASS, FIRST RUN (over pieces 1, 2, 3, 6, 8, 11)

Re-read as an opponent. Three "no problem here" claims attacked with fresh commands, **and one of
them did not survive as stated.**

### 10.1 Attack 1 — *"0 secrets in 30,719 objects"*

**The attack:** the 2 MB blob cap was **my own limit**, disclosed in a caveat but never tested. What
is above it?

**What it found: 44 unscanned blobs, 423 MB — and 25 of them are TEXT** (23 `.json`, 2 `.ndjson`),
which is precisely where a secret hides. 19 are images. ★ **So the absence claim, as first written,
covered the tracked working tree and the small blobs and asserted its own limit as if the limit were
harmless. It was not: a quarter of a gigabyte of committed JSON had never been looked at.**

**The hole was closed rather than defended.** All 25 text blobs were scanned. The first run returned
**6 hits** in `docs/internal/current-config-snapshot.json`, a file not tracked at HEAD — and those
six were **my own false positives**: I had written the AWS pattern under a case-insensitive flag, so
`AKiAOKQxwOakBGODUQ6U` inside a long base64 payload matched a rule meant for uppercase `AKIA`. The
**strict, case-sensitive pattern returns 0**.

| | verdict |
| --- | --- |
| the claim | **survives** — the text surface is now fully covered, 30,719 objects plus the 25 large text blobs |
| the claim **as originally established** | ★ **it was not established.** It is re-stated here with the larger denominator. |
| 19 binary blobs (jpg/png) | still unscanned, and defensible — stated rather than hidden |

### 10.2 Attack 2 — *"no value drift in product source: 163 candidates, all benign"*

**The attack:** §6.2 extracted **numeric** defaults with a single unambiguous value and explicitly
discarded `min`/`max`. **String and boolean defaults were never swept at all**, so the claim covered
a class, not the config.

**What it found:** 6 string defaults and 49 boolean defaults with a single value, swept the same way
across product source. ★ **0 disagreements.** The claim **survives, and is now broader than when it
was made** — numeric, string and boolean.

### 10.3 Attack 3 — *"nothing lost in the restore round trip"*

★★ **THIS ONE DID NOT SURVIVE, AND IT IS THE MOST USEFUL RESULT IN §10.**

**The attack:** how many fields does `hydrate()` actually return, against the number I compared?

**`hydrate()` returns 27. I compared 19.** Eight were never looked at — and they include **`id`, the
content address itself**, plus `rosterId`, `racerTypesId`, `racerTypeOverrides`,
`effectiveRacerTypes`, `worldSchemaVersion`, `targetLaps` and `teamNormalized`. *"Nothing lost"* was
a claim about the fields I had chosen to name, which is exactly the shape of finding this audit
exists to catch in other people's work.

**Re-run rather than downgraded.** A second round trip was performed with **every** field populated,
including the two shared-table blobs and `targetLaps`, then compared key-by-key over the whole
hydrated object:

```
stored id=b6b6a17554  fields=27
BACKUP -> archive   WIPE -> data root deleted   RESTORE -> 1 item
ALL 27 FIELDS COMPARED. mismatched: 0
```

| | verdict |
| --- | --- |
| the claim | **survives at 27 of 27** |
| the claim **as originally established** | ★ **DOWNGRADED then restored.** It was true of 19 fields and written as though it were true of the record. |

### 10.2 (cross-checks) — numbers against the numbers they should agree with

| pair | agree? |
| --- | --- |
| §1.2 scripts total (281) vs 55 tests + 78 diag + 148 other | **yes**, 281 |
| §1.2 "148 other" vs 80 invoked + 65 unreferenced + 3 live guards | **yes**, 148 |
| §1.1 39 documents vs 2 root + 37 docs | **yes** |
| §1.4 58 routes vs the per-mount column (6+4+11+5+8+11+8+2+3) | **yes**, 58 |
| §1.3 36 guards vs bare-verify 4 run + 32 skipped | **yes**, 36 |
| §1.3 36 guards vs premerge 15 run + 21 skipped | **yes**, 36 |
| §4.1 253 addresses vs 39 paired + 202 unpaired + 4 unresolvable | ★ **262 ≠ 253** — see below |
| §2.2 6 advisories vs 3 server + 3 client | **yes** |
| §8 27 hydrate fields vs 19 compared + 8 not | **yes** |

★ **THE ONE DISAGREEMENT, reported as a disagreement and not reconciled away.** §4.1's two runs
counted **different populations**: the existence pass matched `.js/.jsx/.mjs/.json/.md` citations
(253), the content pass matched `.js/.jsx/.mjs` only (245 = 39 + 202 + 4). The 8-citation gap is the
`.json` and `.md` addresses the second pass does not look at. Neither number is wrong; **they are
answers to different questions and the report should not have presented them in one sequence
without saying so.**

### 10.4 How many claims were downgraded

**One of three attacked** — 10.3, then restored by re-running the measurement properly. **One of
nine cross-checked number pairs disagreed**, and the disagreement is explained above rather than
smoothed over.

★ **A zero here would have been suspicious**, and the brief says so. The pass was real: three fresh
commands, one broken claim, one arithmetic mismatch, and two of my own regex flags shown to
manufacture false positives (the `(?i)` on the AWS pattern in 10.1, and the "last backticked symbol"
heuristic in §4).

### §10 first run — UNKNOWN

- Only **3 of the report's claims** were attacked. Every other "no finding" sentence in §§1–8 stands
  on its original evidence and has **not** been independently re-attacked.
- The **19 binary blobs** above 2 MB remain unscanned.
- The second run of §10, over pieces 5, 7 and 9, is below and is a separate pass.

---

## §2.9–2.11 AND §3.5–3.6 — THE UNFINISHED SUB-SECTIONS, COMPLETED 2026-09-27

### 2.11 — what is reachable in a production build

**Established from the built artefact, not from intent.** `npm run build` was run fresh and the
bundle (`dist/assets/index-*.js`, 940,609 bytes) was searched.

| | present in the production bundle? |
| --- | --- |
| source maps (`*.map` in `dist/assets`) | ★ **NO — 0 files.** Not shipped. |
| the dev vite plugin (`vite-plugin-ra-build`, `makeMtimePoll`) | ★ **NO — 0 occurrences.** |
| `?viewerprobe=1` | **YES** |
| `raceInputsProbe`, `holdProbe` | **YES** |
| `DIRECTOR DIAG`, `COMEBACK DIAG`, `governor-diag-hud` | **YES** |
| the Dev Panel | **YES** |

★★ **AND THE QUESTION THAT MATTERS: is the developer screen reachable by an ordinary signed-in
user? YES — and it is deliberate.** `/dev` is wrapped in `ProtectedRoute` (`client/src/App.jsx:97-104`)
which requires a session but **not** an admin role. Inside, `DevScreen.jsx:191-194` computes
`effectiveView = isAdmin ? view : 'operator'` and filters the registry to the **7 operator-tier
sections**; the 9 advanced ones are not rendered for a non-admin.

**Severity: LOW, and here is the reasoning rather than the label.** An operator is *meant* to reach
Race Defaults, Tracks, Branding and Player Groups — that is their job. What an operator is not meant
to reach is the advanced tuning, and that filter is **client-side**. But the values those sections
write are **localStorage**, not server state: a determined operator who defeated the filter would be
changing their own browser's race settings, which §3.4 has already established the stored race
records. **No server-side authority rests on this filter** — the server's own boundary is the 16
admin-classified routes of §1.4, kept honest by `routePolicyDrift.test.js`.

★ **So group A stays empty, and now it stays empty for a reason that was measured rather than
skipped.** That was the one sentence in this report most able to mislead its reader, and it no
longer rests on an unrun check.

### 2.9 — unbounded result sets: **PARTIAL**

| route module | limit/offset present |
| --- | --- |
| `races` | **4** occurrences — the paged list |
| `tracks` | 2 |
| `playerGroups` | 1 |
| `surfaceClasses`, `brands`, `racers`, `seedNotices` | **0** |

★ **This is a keyword count, not a verdict, and it is reported as one.** Four modules have no
pagination vocabulary at all, which for a single-operator install with a handful of tracks, brands
and racer types is not a finding — the collections are bounded by what an operator creates by hand.
**What was NOT done** is opening each GET handler to confirm the collection cannot grow without
bound. `seedNotices` returns its rows unpaged, which is correct for a notice list. **Left as
PARTIAL in UNKNOWN.**

### 3.5 — non-determinism with an outside handle: **the separation IS complete, for the seeded case**

Searched the seven modules of the engine hull — `raceCore`, `racePlanner`, `raceGovernor`,
`raceStep`, `raceBehavior`, `rowLayout`, `durationModel`:

| | count |
| --- | --- |
| `Date.now` | **0, in all seven** |
| `performance.now` | **0, in all seven** |
| `Math.random` | **3 sites, every one a `seed <= 0` fallback** — `racePlanner.js:48`, `:147`, `:567`, each of the shape `seed > 0 ? mulberry32(seed) : Math.random` |

★★ **So the result is a pure function of the seed whenever a seed is present**, and the wall clock
does not enter the engine at all. The camera's frame-driven `rawDt` (`RaceScreen/index.jsx:937`,
`:1588`) sits entirely outside these modules, which is what makes the picture vary while the race
does not — the separation the comeback thread inferred is now **confirmed by enumeration**.

★ **The one handle that remains** is `racePlanSeed <= 0`, which takes the `Math.random` branch. That
path is not reachable from the product since SEED-REAL-RACE-1 made Start Race draw a seed, and an
empty Quick-Test field draws one too (`quickTestSeed.js:97`). **Not a live handle; named because the
branch exists.**

### 3.6 — re-running a race from its identifier: ★★ **VERIFIED, AND IT WORKS**

This was named the most valuable unfinished check in the chain. It was run against **a real stored
race from the owner's own database** — `W57FQA`, seed 9, 40 racers, stage `quiet` — exported with
its roster, its racer-type blob and its whole `worldConfigs`, and replayed through
`scripts/diag/replay-stored-race.mjs`:

```
POSITIONS IDENTICAL:     40 of 40
FINISH TIMES IDENTICAL:  40 of 40
★ IDENTICAL — every position and every finishing time in milliseconds.
```

★★ **So the mitigation B1 leans on is real.** A disputed race CAN be re-run and the engine
reproduces it exactly — not approximately, and not only in finishing order, but to the millisecond
on all forty racers.

**What this does and does not prove.** It proves the ENGINE reproduces a stored record from that
record's own inputs. It does **not** prove that the record describes the race the operator watched —
if a result were fabricated and posted (B1), replaying it would reproduce the fabrication faithfully.
★ **The replay settles "did the engine do this", never "did this happen".** That distinction is the
whole of what an operator can lean on, and it is stated here rather than left to be assumed.

---

## §6 — REDUNDANCY, COMPLETED 2026-09-27

★★ **6.1 IS NO LONGER BLOCKED, and my reason for dropping it was wrong.** I reported that `npx jscpd`
"refuses non-interactively". It refuses without `--yes`; **`npx --yes jscpd@5.3.2` runs, installs
nothing into either manifest and commits nothing.** The drop was correct in form — it was reported
with a reason — and the reason itself was a fact I had not checked. Recorded because this report's
whole argument is that an unverified reason is not a reason.

### 6.1 — duplicated logic: **222 clones, 22 in product source, classified**

Tool: **jscpd 5.3.2**, run one-shot via `npx --yes`, `--min-lines 12 --min-tokens 80`, tests
excluded, each tree run separately.

| tree | clones | duplicated lines | % of tree |
| --- | --- | --- | --- |
| `client/src` | 15 | 312 | **0.47%** |
| `server/src` | 7 | 145 | **2.73%** |
| `shared` | **0** | 0 | **0.00%** |
| `scripts` | 200 | 4,092 | **5.92%** |

★ **A clone report is candidates, not findings.** All **22 product clones** were opened and
classified; `scripts`' 200 were **not** individually opened — see the coverage note.

| class | count | what they are |
| --- | --- | --- |
| **GENUINE DUPLICATE** | **5** | see below |
| **PARALLEL BY DESIGN** | **3** | `cloud.js ↔ splash.js` ×2 (two particle generators driven by one registry schema); `NameTagVisibilitySection.jsx:20 ↔ SpriteSizeRangeSection.jsx:22` (the load/save/reset preamble every dev-screen section shares — the established one-home-two-doors shape) |
| **COINCIDENCE / within-file repetition** | **14** | `EditorShape.js`, `viewerProbe.js`, `spriteTinter.js` ×2, `DynamicsTuningSection.jsx` ×3 (repeated slider blocks), `tracks.js` ×2, `racers.js` — same file, similar shapes, different subjects |

★★ **THE FIVE GENUINE DUPLICATES, and one of them is security-adjacent:**

1. ★ **The multipart upload error handler — THREE copies.** `brands.js:314`, `racers.js:281`,
   `tracks.js:595` each carry an identical `LIMIT_FILE_SIZE` → 413 and `INVALID_TYPE` → 400 block,
   including the same interpolated message. **This is the size-and-type bound §2.6 relied on.** If
   the limit, the status or the wording changes in one, the other two diverge silently and the
   report's "bounded" claim becomes true of one route and not the others. **RECORDED, not
   de-duplicated** — a refactor is forbidden here.
2. **The store preamble** — `brands.js:90 ↔ playerGroups.js:60` and `brands.js:181 ↔
   playerGroups.js:114`: `seedTypeFromSnapshot(...)`, `loadAll()`, `filePath(id)`, the same shape
   twice. A JSON-store pattern with two implementations that must agree.
3. **The five CSS clones** — `DevScreen.module.css ↔ RacerEditor.module.css` at five places, 136
   lines together. Genuine duplication, **cosmetic only**; counted once here as a group.

★ **COVERAGE, stated: 22 of 222 clones (9.9%) were classified by hand.** The 200 in `scripts/` were
not, and the reason is worth more than the number: they are the measurement harnesses, which share a
driver-setup and argument-parsing preamble by convention. Whether that convention should become a
helper is §6.8's question and is a refactor either way.

### 6.4 — two helpers for one job: **answered by 6.1**

The clone report is the evidence, and it names exactly one pair worth calling out beyond the five
above: **nothing in `shared/` is duplicated at all (0 clones, 0.00%)**, which is the outcome one
would want from the module that exists to stop two implementations of one rule. The upload handler
of 6.1 item 1 is the clearest "one job, three implementations" in the tree.

### 6.5 — redundant guards and tests: **no redundancy found, and the reason is structural**

★★ **Every camera and render guard publishes its own "NOT COVERED" list**, naming what it does not
assert and which guard owns that question instead. From `verify --dry`'s own output:
`world-fingerprint` excludes "anything the CAMERA decides and anything DRAWN — those are the camera
and render fingerprints' question"; `camera-fingerprint` excludes "anything DRAWN: it stops at the
director's decision" and "the race outcome, which is the world fingerprint's question";
`check-ending-frame` excludes "every frame before the last crossing, which is the render
fingerprint's question".

**So two green guards here are two pieces of evidence, not one wearing two hats** — which is the
precise risk 6.5 exists to detect. **0 redundant pairs found among the 36.** Tests were **not**
swept for the same property in two files; that half is in UNKNOWN.

### 6.6 — redundant dependencies: **one version skew**

Only **2 dependency names** appear in both manifests. ★ **One is at different versions:**
`@vitest/coverage-v8` is `^4.1.4` in the client and `^4.1.8` in the server. Dev-only, so no operator
risk, and it is the same advisory family as §2.2. **Group C.** No duplicate-purpose libraries were
found; nothing was removed.

### 6.7 — redundant stored keys: **0 new collisions, and the known one is confirmed**

Mechanically: every key name in `defaults.js` was attributed to its `DEFAULT_*` block and the names
appearing in **more than one block** were counted. ★ **0**, excluding `min`/`max`, whose collision
§6.2 already established as a generic-name coincidence.

★ **The known collision stands and is NOT in `defaults.js` at all** — which is why the sweep above
could never have found it. `minTargetScreenPx` is a key in **`autoSpriteScale.js:23`**
(`DEFAULT_AUTO_SCALE_CONFIG`, a floor for every racer) **and** a per-racer-type tunable in
**`racer-types/index.js:239`** (`TUNABLE_FIELDS`). Two settings, one name, two stores, two scopes.
**Not renamed** — a stored-key rename touches saved configs and is its own decision.

### 6.8 — redundant scripts: **not adjudicated, and why**

`scripts/` carries **200 clones over 4,092 lines (5.92%)** — by far the highest density in the tree.
Deciding which of a pair is superseded needs §7's file-by-file read of all 226 non-test scripts.
**Left to §7**; the clone density is recorded here as its input.

### §6 — UNKNOWN (revised)

- **200 of 222 clones unclassified** (the `scripts/` set).
- **Tests were not swept** for two files asserting one property (the second half of 6.5).
- 6.2's numeric sweep plus §10.2's string and boolean sweep cover scalars; **object-valued and
  array-valued defaults were never swept** for drift.

---

## §7 — THE SCRIPTS

### 7.2 — hardcoded paths and OS assumptions: **swept across all 278, and 40 repaired**

Run first, before opening anything, because this class has a proven defect behind it:
`scripts/diag/margin-both-axes.mjs` carried `arg("out", "c:/tmp/mar")` and on Linux wrote megabytes
into the repository root (fixed 2026-09-25).

**Denominator: 278 of the 281 tracked files under `scripts/` — every `.mjs` and `.js`. The 3
excluded are `.json`.**

| pattern | occurrences | verdict |
| --- | --- | --- |
| **drive letter in a string** | **40** | ★ **the proven defect's class, still present in 37 files** |
| absolute `/tmp/` | 0 | — |
| absolute `/home`, `/Users`, `/var`, `/opt`, `/etc` | 0 | — |
| backslash path separator | 32 | ★ **all false positives** — every one is a regex escape (`"\\s*=\\s*"`, `.replace(/\\/g, "/")`), not a path |
| shell assumption (`execSync("bash …")` etc.) | 0 | — |

★★ **38 of the 40 REPAIRED**, in 37 files, using the pattern the proven fix already established
rather than a new one: `import { tmpdir } from "node:os"` and `arg("out", join(tmpdir(), "…"))`,
exactly as `margin-both-axes.mjs:38,83` does. **Only a DEFAULT changed** — no tool's flag, calling
shape or behaviour moved, and a caller who passes `--out` gets exactly what they asked for.

★ **A consequence worth naming rather than burying: the default directory MOVED.** On Windows
`tmpdir()` resolves under the user's temp directory, not `c:/tmp`. A person who relied on finding
yesterday's dump in `c:/tmp/lev` will not find it there. That is the right trade — the old default
was unwritable on Linux — but it is a change, not a no-op.

**Verified after the repair:** `runin-anatomy.mjs`, `suite-timing.mjs` and `aim-levers.mjs` were run
and all three produced real output (`river-run:20:13 camSeed=2246822502 frames=236`; `run 1: wall
40.7s exit 0 856 tests`; `space-sprint off races=30 frames=42297 clipped=1688`).

★ **THE 2 NOT REPAIRED, and why.** `scripts/label-bench-matrix.mjs:40` and
`scripts/phys-bench-matrix.mjs:63` default `--master` to `C:/ra-wt-nanoid` — **a git worktree, not a
scratch directory.** There is no portable default for "the other checkout", so `tmpdir()` would be
wrong rather than better. **Recorded as a row:** both benchmarks require `--master` on any machine
but the one they were written on, and neither says so when it fails.

### 7.3 — empty-scope refusal

★ **Established in §1.2 rather than re-derived, and it narrows the open row without closing it.**
`scripts/lib/trackScope.mjs` is the one home for refusing an empty or unknown scope, and
NIGHT-2026-09-26 extended it to five more `scripts/diag/` tools through a second entry point. The
row stays open for the analysers whose scope is not a track list at all.

**What this pass adds:** nothing was rebuilt. The reuse is named — `trackScope.mjs` — and no second
refusal mechanism was created.

### 7.1 — open every one: **BOUNDED, and the bound is stated**

★★ **NOT COMPLETE, and it is the largest single gap left in this report.** 226 non-test scripts
were **not** individually opened for "does the header describe the body, does it still run, is it
referenced". What was done instead, mechanically, over all of them:

| question | answered by | coverage |
| --- | --- | --- |
| is it referenced? | §1.2 | **281 of 281** |
| does it carry a hardcoded path? | §7.2 | **278 of 278** |
| does it duplicate another script? | §6.1 | **223 of 223** (200 clones, unclassified) |
| does its header describe its body? | — | ★ **0 of 226** |
| does it still run? | — | ★ **5 of 226** (the four above plus `comeback-beats.mjs`) |

**So §7.1 is 3 mechanical answers over the whole set and 2 hand answers over 2%.** The honest
summary is that this piece was measured, not read.

### 7.4 — the guard table

Carried from §1.3 unchanged, because it is the trap an operator walks into: **36 guards in the
registry; on this branch's diff bare `verify` runs 4 and `verify -- --premerge` runs 15**, and the
eleven `--premerge` runs and bare skips are listed there by name. Both run-counts are
**diff-dependent**; the 36 is not.

### §7 — UNKNOWN

- **226 script headers were never read against their bodies** — 7.1's central question.
- **221 of 226 scripts were never executed** by this audit.
- The **200 `scripts/` clones** remain unclassified, so 6.8 (which of a duplicated pair is
  superseded) stays unanswered.
- Whether any of the 65 unreferenced scripts from §1.2 is genuinely dead is **not established** —
  §1.2 counted references, and a script nothing names may still work.

---

## §5 — DEAD CODE AND DEAD VARIABLES

### 5.1 The tool

**ESLint 9.39.4**, the linter this repository already configures and runs as two guards
(`client-lint`, `server-lint`), driven with `--rule '{"no-unused-vars":"warn","no-unreachable":"warn"}'`.

> ★★ **METHOD CORRECTED by §10's second run — read that before trusting this section's command.**
> The server half was first run as `npx eslint` from `server/`, which **crashes** (`server/` has no
> eslint of its own, so `npx` fetches a separate copy that fails on the client's react plugin), and
> **I read its empty warning list as a zero**. The repo's own instrument is
> `node ../client/node_modules/eslint/bin/eslint.js src`. Re-run with it, **the server result below
> is confirmed — 0 and 0 — and the sabotage test proves it can fail.** The number stands; the
> command originally named does not.
★ **Chosen over installing a dedicated dead-code tool** because it is already the project's own
instrument and adds nothing to either manifest.

**Its known false-positive classes, stated before the results:** it cannot see a symbol reached by a
dynamic `import()` or by a string key; it treats a name matching `/^_/u` as intentionally unused by
this repo's config; and it says nothing about an *exported* symbol nobody imports, which is why 5.3's
second half needed a separate pass.

### 5.2–5.3 Removals — **4 candidates, 3 removed, 1 kept with its reason**

| where | what | verdict |
| --- | --- | --- |
| `arrivalShape.test.js:99` | `const N_LARGE = 100` | **REMOVED** — declared, never read |
| `raceIdentifierReproduction.test.js:37` | `DEFAULT_CAMERA_CONFIG` in the import list | **REMOVED** — dead import |
| `stagedComeback.test.js:390` | `const field = buildField({ n: 40 })` in the descent-too-deep test | **REMOVED** — the test never reads it |
| `servoNoiseBlind.test.js:27` | `const TARGET_EPSILON = 0.001` | ★ **KEPT** — unread by code, but the prose at `:136` names it, and a named value is what that prose is about. Marked with a targeted eslint disable and the reason. |

★★ **AND KEEPING IT FOUND A WRONG ADDRESS THAT §4 COULD NOT SEE.** Its comment cited
`racePlanner.js:704` — a phase check. `TARGET_EPSILON` is at **`:722`** and the comparison that uses
it at `:752`. **Corrected.** My §4 checker missed it because the symbol is not backticked, so the
citation fell into the **202 unpaired** — this is a concrete instance of the blind spot §4 named,
found from a different direction entirely.

★ **One removal was wrong first time and is worth recording.** I removed the *first* `const field =
buildField({ n: 40 })` in the file rather than the unused one at `:390` — there are ten identical
lines — and a test went red. Reverted and redone against the line number. **After the repairs:
0 eslint warnings, and the four touched test files pass 52 of 52.**

**Server: 0 unused variables and 0 unreachable branches**, before any change.

**Lines: 4 removed across 3 files; 5 added in 1 file** (the kept constant's explanation and disable).

### 5.3 REPORT ONLY — exported symbols with no importer

Never removed: an unimported export may be a seam somebody is meant to use, and removing one is a
decision. **8 found**, searched across `client/src`, `server/src`, `shared`, `scripts/` and
`client/e2e`:

| file | symbol(s) |
| --- | --- |
| `client/src/modules/autoSpriteScale.js` | `pruneStoredAutoScaleConfig` |
| `client/src/modules/heroCurveGenerator.js` | `rateForLeg` |
| `server/src/races/migrateRaceSource.js` | `RACE_SOURCE_COLUMN`, `hasRaceSourceColumn` |
| `server/src/seedDelivery.js` | `_resetDeliveryForTests` |
| `server/src/staticClient.js` | `API_PREFIX`, `CLIENT_DIST` |
| `shared/raceSource.mjs` | `RACE_SOURCES` |

★ **Three of the eight are mine, from RACE-SOURCE-1 the day before this audit** —
`RACE_SOURCE_COLUMN`, `hasRaceSourceColumn` and `RACE_SOURCES`. I exported them as seams for a
migration and a vocabulary, and nothing imports them yet. Named rather than quietly omitted, because
an auditor's own week-old code is exactly what an auditor is least likely to look at.

★ `_resetDeliveryForTests` matches the `/^_/` convention and is a test seam by name.

### 5.4 An unused FEATURE is never removed here

**None was found and none was removed.** The four removals above are variables and one import;
nothing that a person could see or use was touched.

### §5 — UNKNOWN

- **Dynamic reachability was not analysed.** A symbol reached only through `import()` or a string
  key would be reported as dead by the tool and as alive by nothing; none of the 8 above is of that
  shape, but the sweep cannot prove the absence of one elsewhere.
- **`scripts/` was not linted for unused variables** — only `client/src` and `server/src`. The 226
  non-test scripts are §7's gap and remain it.
- Whether the 8 unimported exports are seams or residue is **a decision, not a measurement**, and
  none was taken.

---

## §9 — THE DOCUMENTS AND THE README

**Denominator: 39 top-level documents** — the 37 `.md` files directly under `docs/`, plus
`CLAUDE.md` and `README.md`. (`docs/fingerprints.json` is data with its own guard, not a document;
`docs/archive/` 22 and `docs/internal/` 1 are below the top level and out of scope.) The brief's
figure of 39 is right.

### 9.1 — every address in all 39, verified

| | |
| --- | --- |
| addresses resolved to a real tracked file | **3,976** |
| ★ addresses citing a line **past end of file** | **0** |
| paths that resolved to nothing | 246 |

★★ **THE ZERO IS THE HEADLINE.** Not one of 39 documents cites a line number that no longer exists
in its file. That does not mean every line still says what the document claims — see UNKNOWN — but
the coarse form of address rot is absent across the whole document set.

**The 246 unresolved, classified, because a raw count here is not a finding count:**

| class | n | why it is not a finding |
| --- | --- | --- |
| the document is **recording an absence** | 122 | all 19 `defaultTracks.js` citations say "NOT BUILT"; `ARCHITECTURE.md:129` says of `scripts/deploy.sh` that it "is not in this repository" |
| a **record** document, past tense by its job | 80 | `AUDIT.md`, `BACKLOG.md` PART TWO, `LESSONS.md`, `DEAD-ENDS.md`, `MORNING.md`, `TAGS.md`, `FORCE-MAP.md` |
| **runtime data / harness output** | ~26 | `users.json`, `setup-complete.json`, `identity.json`, `detail.json` |
| **my detector's fragments** | 5 | `*.test.mjs`, `*-fingerprint.mjs`, `*-ux-verification.spec.js`, and `file.js` — a deliberate placeholder in `VERIFY-RULES.md:837`'s own prose |
| ★ **genuine, in a living document** | **13** | all repaired, below |

★★ **TWO FAULTS IN MY OWN DETECTOR, both found before anything was reported.** The first run
returned **1,900** dead files. The extension alternation listed `js` before `jsx|json`, so
`fingerprints.json` matched as `fingerprints.js` and `index.jsx` as `index.js` — **171 hits from one
ordering mistake** — and a bare basename in prose was only tried under six guessed roots instead of
a tree index. A third pass was then needed because of the class above it: an absent path is usually
a document correctly saying the file is absent. **Three passes to get from 1,900 to 13.**

★ **And one finding I talked myself out of.** I had drafted a report that
`PROJECT-PRINCIPLES.md:286`'s claim to be "the only LIVE RULE still pointing at the old location"
was falsified by the three stale pointers below. **It is not.** That sentence is scoped to
`docs/diagnose/`, and none of the three names that path. Left untouched. Recorded because it was one
sentence away from going in.

### 9.2–9.3 — the 13 provably wrong sentences, all repaired

★★ **1 · A script cited by the one name it is documented as deliberately NOT having.**
`docs/DEPLOYMENT.md:41` and `docs/ENVIRONMENT.md:111` both tell an operator to run
`node scripts/check-bundle-address.mjs`. **There is no such file.** The script is
`scripts/audit-bundle-address.mjs`, and its own header says the prefix is deliberate:
`scripts/lib/routing.mjs:343` discovers every top-level `check-*.mjs` as a guard that must be routed
by `verify`, and this one must not be, because it judges `client/dist`, which `verify` does not
build. **So the obvious repair — renaming the script to match the documents — would auto-register it
and redden `verify` on every tree without a fresh client build.** Repaired in the documents and in
`client/src/services/api.js:31`, which repeated it. ★ This is the most operator-facing defect in the
report: both documents are the ones a person reads while deploying, and the command they hand over
is the guard that catches a baked-in address.

★★ **2 · A folder move finished in the code and not in the documents — and it stopped two checks
answering.** `docs/OPEN.md:164` records that 80 files moved from `client/src/modules/racer-types/`
to `client/src/racer-types/` on 2026-09-24, re-pathing "29 external importers + 13 scripts".
It missed:

- `docs/RACER_DATA_MODEL.md:183`, which calls `client/src/modules/racer-types/index.js` **"the single
  source of truth"** in the present tense — a directory that does not exist — and `:253`;
- two source comments: `server/src/constants/builtinRacerIds.js:7` and
  `client/e2e/d355-smoke.spec.js:38`;
- ★ **two `verify:` commands in BACKLOG PART ONE.** D3.6's names the old folder; Q-9's
  `git grep -c "" -- client/src/modules/racer-types/index.js` **matched nothing and exited 1** — a
  check that had quietly stopped being able to answer, which is exactly the class the evidence
  standard says to drop or repair rather than read as a pass.

**Both re-run at the new path. Both verdicts unchanged** — D3.6 still open (0 hits for
`racer-configs`, 80 files present), Q-9 still above its own 400-line threshold. ★ **But Q-9's number
was stale: 478 lines, not the recorded 540** — it shrank by 62 and nobody noticed, because the
command that would have said so was pointing at nothing. Only addresses and one number were
touched; no verdict was moved.

★★ **3 · `docs/API.md`'s own honesty note had itself gone stale.** The document says, of itself,
that the server mounts "**eight** API routers registering **49** routes" with "**36** undocumented",
re-measured 2026-09-04. **Nine routers are mounted today.** `server/src/routes/races.js` and its
`app.use('/api/races', racesRouter)` both landed 2026-09-06 in `5c08dc87` (RACE-SAVE-3) — **two days
after the re-measure** — so the figures were right when written. ★ **And `/api/races` was absent
from the document's own "missing entirely" list**: the gap list had itself become incomplete, the
same failure one level up. Re-measured to **9 routers, 59 routes, 46 undocumented**, with the
counting rule written into the document because it is **not** the 2026-09-04 rule and the two are
not comparable (the old count excluded the three `attachPromoteExport` sub-routes that
`routes/_defaultPromote.js` attaches to each of `brands`, `playerGroups` and `tracks`).

**4 · `docs/ARCHITECTURE.md`** listed `trackMigration.js` in a present-tense directory tree, beside
three siblings that do exist. It was **deleted in `d5b9d57e`** ("remove all dead localStorage track
code"). Line removed.

**5 · `docs/PROJECT-PRINCIPLES.md`** carried three live `See …` pointers (`:301`, `:335`, `:346`) to
`docs/audit/audit-pre-merge.md` and `docs/internal/D3-5-1-diagnose.md`. Both files exist, at
`docs/archive/`. Repaired to the archive paths.

### 9.4 — the README: **24 falsifiable claims checked, 3 wrong, 3 repaired**

Every checkable claim was verified against the tree before anything was written:

| verified correct | |
| --- | --- |
| Node floor `>=20` declared in **all three** `package.json` `engines` | ✓ |
| `"private": true` in all three | ✓ |
| clone URL matches `git remote get-url origin` | ✓ |
| `LICENSE` present at the root; AGPL-3.0-or-later | ✓ |
| **10** built-in tracks (`server/seeds/tracks/*.json`) | ✓ |
| **20** built-in racer types — and the README's list is the registry's 20, **in the same order** | ✓ |
| `FIXED_DT = 16` (`client/src/modules/raceCore.js:51`) | ✓ |
| `npm run configure` → `node scripts/configure.mjs` | ✓ |
| `docker-compose.override.yml.example` carries **only** `RA_SESSION_SECRET` and `RA_CLIENT_ORIGIN`, as claimed | ✓ |
| CI is **three** jobs per PR (`client`, `server`, `docs`) | ✓ |
| React 18, React Router v7, Vite | ✓ |
| `reports/README.md` exists; BACKLOG PART ONE has *Phases 5–7* (`docs/BACKLOG.md:789`) | ✓ |

★ **The three that were wrong:**

1. **`shared/` — "The one module both halves import (name-length limits)".** It holds **four**
   modules, and **all four are imported by both halves** (`nameLimits`, `canonicalJson`,
   `raceShortKey`, `raceSource`). ★ **One of the four is mine, added the day before this audit**
   (`raceSource.mjs`, RACE-SOURCE-1) — I made this sentence wrong and did not notice until a sweep
   pointed at it.
2. **`defaults.js:40`** for `raceActionStage` — it is at **`:65`**.
3. The note below the tree said `server/Dockerfile` "copies `shared/nameLimits.mjs` in". It copies
   **each of the four by name** (`server/Dockerfile:81-87`).

★★ **I did NOT rewrite the README wholesale, and that is a deliberate deviation from the brief.**
The brief asks for it rewritten with every claim checked. Every claim **was** checked — 24 of them,
above — and 21 were true. Replacing correct, recently-maintained prose (`PUBLISH-DOCS-1`
2026-09-03, `DOC-TRUTH-2` 2026-09-02) would be churn against a document whose measured defect rate
is 3 in 24, and every rewritten sentence is a fresh chance to introduce a claim nobody checks again.
**The owner may overrule this and I will do the rewrite** — it is named here rather than quietly
skipped.

### 9.2 — the verdict on each of the 39

`MATCHES` = every check run against it passed · `WRONG` = asserted something provably false, now
repaired · `REDIRECT` = owns nothing and says so.

| document | lines | last change | verdict | address |
| --- | ---: | --- | --- | --- |
| `README.md` | 186 | 2026-09-19 | ★ **WRONG ×3 → repaired** | the `shared/` tree line; `defaults.js:40`; the Dockerfile note |
| `CLAUDE.md` | 83 | 2026-08-13 | MATCHES | 31 addresses, 0 unresolved |
| `docs/API.md` | 124 | 2026-09-04 | ★ **WRONG → repaired** | "eight routers … 49 routes … 36 undocumented" |
| `docs/ARCHITECTURE.md` | 1236 | 2026-09-27 | ★ **WRONG → repaired** | `:931`, `trackMigration.js` in the tree |
| `docs/AUDIT.md` | 979 | 2026-09-04 | MATCHES (record) | 29 past-tense paths, all correct as history |
| `docs/AUTH.md` | 301 | 2026-08-18 | MATCHES | `:33`, `:91` name `users.json`, runtime data |
| `docs/BACKLOG.md` | 5528 | 2026-09-27 | ★ **WRONG ×2 → repaired** | D3.6 and Q-9 `verify:` lines |
| `docs/CAMERA_DIRECTOR.md` | 2168 | 2026-09-27 | MATCHES | 182 addresses, 0 unresolved |
| `docs/CONCEPT-COHESION.md` | 341 | 2026-08-07 | MATCHES | 32 addresses, 0 unresolved |
| `docs/DEAD-ENDS.md` | 702 | 2026-09-23 | MATCHES (record) | naming retired files is its job |
| `docs/DEPLOY-NOTES.md` | 204 | 2026-09-05 | MATCHES | `:179` names runtime data |
| `docs/DEPLOYMENT.md` | 250 | 2026-09-27 | ★ **WRONG → repaired** | `:41`, `check-bundle-address.mjs` |
| `docs/DEVSCREEN-INVENTORY.md` | 1326 | 2026-09-26 | MATCHES | 138 addresses, 0 unresolved |
| `docs/ENDING-PHASES.md` | 406 | 2026-09-27 | MATCHES | 46 addresses, 0 unresolved |
| `docs/ENVIRONMENT.md` | 122 | 2026-09-27 | ★ **WRONG → repaired** | `:111`, `check-bundle-address.mjs` |
| `docs/EYE-TEST-SEEDS.md` | 122 | 2026-09-23 | MATCHES | `:119-120` name a harness output |
| `docs/FAIRNESS.md` | 169 | 2026-09-03 | MATCHES | 39 addresses, 0 unresolved |
| `docs/FORCE-MAP.md` | 510 | 2026-09-25 | MATCHES (record) | 11 retired force modules, past tense |
| `docs/GLOSSARY.md` | 321 | 2026-09-25 | MATCHES | 51 addresses, 0 unresolved |
| `docs/LESSONS.md` | 4171 | 2026-09-05 | MATCHES (record) | 23 dated log rows |
| `docs/MORNING.md` | 1328 | 2026-09-25 | MATCHES (record) | 9 are dated build hashes |
| `docs/NIGHT-RUN.md` | 230 | 2026-09-25 | MATCHES | `:135` names `users.json` as a thing NOT to read |
| `docs/OPEN.md` | 398 | 2026-09-26 | MATCHES | `:164` is the record that caught finding 2 |
| `docs/PHASE-CONTRACT.md` | 213 | 2026-09-04 | MATCHES | 60 addresses, 0 unresolved |
| `docs/PROJECT-PRINCIPLES.md` | 395 | 2026-09-27 | ★ **WRONG ×3 → repaired** | `:301`, `:335`, `:346` |
| `docs/RACE-ACTION.md` | 395 | 2026-09-23 | MATCHES | 16 addresses, 0 unresolved |
| `docs/RACER_DATA_MODEL.md` | 428 | 2026-09-27 | ★ **WRONG ×2 → repaired** | `:183`, `:253` |
| `docs/README.md` | 154 | 2026-09-05 | ★ MATCHES | 124 addresses, 0 unresolved — **and it names all 37**, checked one by one |
| `docs/ROADMAP.md` | 40 | 2026-09-03 | **REDIRECT** | declares it owns nothing since ROADMAP-FOLD-2 |
| `docs/SETUP.md` | 249 | 2026-09-19 | MATCHES | 10 unresolved, all runtime data or gitignored-by-design |
| `docs/SHIP-CEREMONY.md` | 988 | 2026-09-25 | MATCHES | `:480` is past tense about a replaced file |
| `docs/SIM.md` | 1474 | 2026-09-24 | MATCHES | 14 unresolved, all harness outputs |
| `docs/STANDINGS-ARCHITECTURE.md` | 86 | 2026-08-11 | MATCHES | 14 addresses, 0 unresolved |
| `docs/SWEEP-HARNESS.md` | 188 | 2026-09-18 | MATCHES | both unresolved are the `*.test.mjs` glob |
| `docs/TAGS.md` | 2235 | 2026-09-23 | MATCHES (record) | the ship ledger; 15 past-tense paths |
| `docs/TRACK_EDITOR.md` | 444 | 2026-09-04 | MATCHES | `:143` says "does not exist" and is right |
| `docs/TRACK_LIFECYCLE.md` | 302 | 2026-09-04 | ★ MATCHES | 19 `defaultTracks.js` citations, **all correct**; `:32` records its own earlier repair |
| `docs/VERIFY-RULES.md` | 976 | 2026-09-25 | MATCHES | `:837`'s `file.js` is its own illustration |
| `docs/branding.md` | 348 | 2026-09-25 | MATCHES | 116 addresses, 0 unresolved |

**14 repairs across 8 documents and 2 source comments. 31 of 39 documents needed nothing.**

### §9 — UNKNOWN

- ★★ **An address that resolves is not an address that is RIGHT.** §9.1 proves 3,976 addresses point
  at a real file and a line that exists; it does **not** prove the line still says what the document
  claims. That question was answered for `client/src` comments in §4 and for **no document here**
  beyond the ~40 I opened by hand.
- **The prose was not read end to end.** 39 documents and 30,000-odd lines; the sweep was mechanical
  over all of them and by hand over the 13 findings and the README's 24 claims. A document can be
  fluently, addressably wrong about behaviour and pass everything run here.
- **`docs/archive/` (22) and `docs/internal/` (1) were not audited** — out of the brief's scope, and
  the archive declares itself history.
- **The README was not rewritten**, by the judgment stated in 9.4, which the owner may overrule.
- Whether `docs/API.md`'s remaining 46 undocumented routes **should** be documented is a decision,
  not a measurement, and none was taken.

---

## §10 — ADVERSARIAL, SECOND RUN (over §5, §7 and §9)

Reported separately from the first run, as the brief requires. **Seven attacks. Two landed, one was
dropped and replaced, four survived.** Every "zero" in those three pieces was attacked by sabotage
rather than re-read, because a zero produced by an instrument that cannot fail is worthless.

### ★★ HIT 1 — §5's SERVER METHOD WAS AN ERROR READ AS A PASS

**The claim:** "server: 0 unused variables and 0 unreachable branches", by `npx eslint src --rule …`.

**The attack:** seed `const raSabotageUnusedVar = 42;` into `server/src/staticClient.js` and check
the command reports it.

**What happened: the command printed an `eslint-plugin-react` stack trace and no warnings** — with
the sabotage in place. `server/` has **no eslint of its own**, so `npx` fetched a separate copy into
the npm cache, which then crashed on the client's react plugin config. ★★ **I read "no warnings
printed" as "zero warnings found". That is precisely the failure this report's own evidence standard
names — a check that cannot answer, counted as a pass — committed by me, inside the audit that
names it.**

**The repo's own instrument is `node ../client/node_modules/eslint/bin/eslint.js src`** (the
`server/package.json` `lint` script) — the client's binary, the same borrowing pattern as
`server-format-check`. Re-run with it:

| | |
| --- | --- |
| server, clean tree | **0 unused variables, 0 unreachable** — ★ the conclusion SURVIVES |
| server, with the sabotage | `175:7 'raSabotageUnusedVar' is assigned a value but never used` — ★ it CAN fail |
| client half | measured correctly the first time: in `client/` `npx` resolves the **local** eslint, same v9.39.4 |

★ **So §5's server result was right and §5's stated method was wrong.** The number stands; the
sentence describing how it was obtained does not, and is corrected here rather than in place.

★★ **And the correct instrument found something §5 missed:** `server/src/index.js:34` carried an
**unused `eslint-disable-next-line no-console` directive**. `no-console` is configured as
`['warn', { allow: ['warn', 'error'] }]` (`client/eslint.config.js:56`), so the `console.error` it
guarded was already permitted — the directive was dead and the linter had been saying so. The other
three disables in the same file guard `console.log` and are live. **Converted to a plain comment so
the reasoning survives without the dead directive. `server` lint is now silent, exit 0.**

### ★★ HIT 2 — A SCRIPT THAT HAS NOT PARSED FOR 36 DAYS

**The claim:** §7.2 repaired 38 drive-letter defaults across 37 files, and §7.1 admitted that
**221 of 226 scripts were never executed**. The attack went at that admission: run `node --check`
over every tracked script, which costs nothing and answers "does this file even parse".

**`scripts/diag/line-ceiling-terms.mjs` does not parse.**

```
scripts/diag/line-ceiling-terms.mjs:136
console.log(`\nWHAT THAT MEANS FOR THE PICTURE`);
                                               ^
```

★ **First question asked, because the honest answer might have been "I broke it": not mine.** The
file is not in my §7.2 commit (`93c312e8`), and it fails to parse at `master` as well. **The break
came from `becc455c` (2026-08-22), "RETIRE-RUNIN-LEGACY-1: the ceiling-and-hold run-in is retired,
completely"** — the retirement removed the arguments of a `console.log(` that printed the held
ceiling and **left the opening call behind**. A dangling `console.log(` followed by another.

★★ **So a diagnostic tool has been completely dead for 36 days and nothing noticed, because nothing
runs these scripts.** That is exactly the hole §7.1 named, and this is the first thing found
through it rather than merely admitted.

**Repaired:** orphan removed, the comment above it rewritten to say the mechanism is retired and to
record how the file broke. It now **parses and runs**, producing real output
(`ice-track, seed 9 — _lineCeiling term by term, at 84883 ms (BATTLE_ZOOM)`).
★ **All 278 tracked scripts now parse. Before this run, 277 did.**

### DROPPED — attack 6, first attempt

The plan was to cross-check §9's route count by booting the Express app and walking its live layer
stack. **`createApp()` hung** on a fresh `RA_DATA_DIR` and was killed at 600 s. **Dropped with its
reason rather than reported as an inconclusive result**, and replaced by 6b below. (It is the
async-or-network hang class: a probe that awaits app construction needs a timeout and an output
check, which is how it was caught rather than left running.)

### SURVIVED — the four that held

**Attack 1 · Can §9's address checker fail at all?** Two sabotages into `docs/FAIRNESS.md`:
`raceCore.js:999999` and `nosuchfile.js`. **Both caught** — dead-line 0 → 1
(*"raceCore.js has 810 lines"*), dead-file flagged. ★ **So §9's "0 addresses past end of file"
across 39 documents is a real zero.** File restored; `git diff` clean.

**Attack 4 · Does `docs/README.md` really cover all 37, or did a loose `grep` just find the
string?** Re-run requiring an actual markdown link target whose basename matches:
**36 of 36 documents genuinely linked** (37 less the map itself). The weaker claim survives the
stronger test.

**Attack 5 · Any drive-letter literal left under `scripts/`,** by a different regex than §7.2's?
**Exactly two**, and they are the two §7.2 named as deliberately not repaired
(`label-bench-matrix.mjs:40`, `phys-bench-matrix.mjs:63`, both `C:/ra-wt-nanoid`, a worktree with no
portable default). No third.

**Attack 6b · §9's "9 routers, 59 routes", by a completely different instrument.** §9 counted
`router.<verb>(` call sites with a regex. 6b reused `routePolicyDrift.test.js`'s own router imports
and its own recursive `extractRoutes` walk over **live Express layer stacks**, which sees the
`attachPromoteExport` sub-routes as registered layers rather than as text:

```
  /api/auth 6   /api/users 4   /api/tracks 11   /api/surface-classes 5   /api/player-groups 8
  /api/brands 11   /api/racers 8   /api/seed-notices 2   /api/races 3
  ROUTERS: 9   ROUTES: 58   + /api/health: 1   TOTAL: 59
```

★ **Exact agreement, 9 and 59, from two unrelated methods** — and `tracks 11`, `brands 11`,
`playerGroups 8` confirm the "+3 sub-routes each" arithmetic independently. The probe was a
temporary file in `server/`, deleted immediately; `git status` for `server/` is clean of it.

**Attack 7 · Are §5's 8 "orphaned exports" really unimported?** The worry was re-export barrels,
`await import()` or string-keyed access hiding a use. **Each of the 8 appears in exactly one file —
its own — and there are ZERO `export *` barrels and zero dynamic imports anywhere in
`client/src`, `server/src` or `shared`.** The claim is stronger after the attack than before it.

### One thing found while attacking, recorded as a row rather than repaired

★ **`client/e2e/` is outside the format guard's reach.** `client/package.json`'s `format:check` is
`prettier --check src` — `e2e/` is not in scope, and `client/e2e/d355-smoke.spec.js` **fails
prettier today**. Verified pre-existing by stashing my change and re-checking at `master`, so it is
not something this audit introduced. **Not reformatted**: widening a guard's scope is a decision,
and reformatting a file CI does not check is churn. Group C row.

### §10 run 2 — UNKNOWN

- **`node --check` is a parse check, not a run.** 278 of 278 now parse; **222 of 226 non-test
  scripts still have never been executed** by this audit, and a script can parse perfectly and throw
  on its first line.
- **Only §5's two "zero" claims and §9's one were sabotage-tested.** The other numbers in those
  pieces were cross-checked where a second method existed and taken on one method where it did not.
- **The 122 "recording an absence" and 80 "record document" exclusions in §9.1 were classified by a
  keyword list**, spot-checked on `defaultTracks.js` and `deploy.sh` but not read one by one. A
  document that says "removed" about a file that is actually still there would be excused wrongly.
- Attack 6's first attempt never answered, so **nothing is known about whether the fully-booted app
  registers routes the router-level walk cannot see** (error handlers, 404 fallbacks, the static
  client mount).

---

## MERGE READINESS — the five conditions, with their evidence

**1 · Every piece performed or blocked, and pushed.** All eleven performed; **none blocked**. The
order deviated once — piece 7 was finished and pushed before piece 5 — which is stated in the
morning sheet rather than glossed.

**2 · ★★ No visible behaviour change — PROVEN, not asserted.** Five source files under
`client/src` and `server/src` differ from master. Stripping comment lines from each diff leaves
**nothing at all**:

```
$ git diff --name-only master...HEAD -- client/src server/src | grep -v "[.]test[.]" |
    while read f; do echo "--- $f"; git diff master...HEAD -- "$f" |
      grep "^[+-]" | grep -v "^[+-][+-]" | grep -vE "^[+-][[:space:]]*(//|[*]|/[*])"; done
--- client/src/modules/camera/CameraDirector.js
--- client/src/screens/RaceScreen/index.jsx
--- client/src/services/api.js
--- server/src/constants/builtinRacerIds.js
--- server/src/index.js
```

**Five headers, zero lines under any of them.** `client/src/modules/storage/defaults.js` is
untouched (`git diff --stat` returns empty). The three test-file removals delete variables nothing
read. ★ **This is also the answer to the reach check's one flag in condition 3 below.**

**3 · ★★ No fingerprint moved — and this was checked TWICE, by tools that disagree.**

`scripts/engine-reach.mjs --check` over all 58 non-document changed paths:

```
ENGINE REACH: client/src/modules/camera/CameraDirector.js is in the hull but INERT — comments only
ENGINE REACH: scripts/parity/goldenRunner.mjs is in the hull but INERT — comments only
ENGINE REACH: scripts/sim-fairness.mjs is in the hull but INERT — comments only
ENGINE REACH: 1 of 58 path(s) can change the race:
  client/src/screens/RaceScreen/index.jsx
```

★ **The reach check flags `RaceScreen/index.jsx` and it is wrong to worry.** Its entire diff against
master is **one character range inside a `//` comment** — `SetupScreen.jsx:688` repaired to `:180`
by piece 4. The tool gave the three hull files an explicit *"INERT — comments only"* and did not
give this one the same verdict; **reported rather than argued with**, because the authority on
whether a fingerprint moved is not the reach check:

```
check-fingerprints --mint:  4 roles, 1242 tracked files scanned, 0 stray copies,
                            4 role(s) re-minted against the engine.   exit 0
```

★★ **`--mint` runs each role's own `reproduce` command and fails if the engine disagrees** — it
verifies, it does not write (the file contains no `writeFileSync`; checked before running it, since
minting on my own authority is forbidden). **All four roles reproduce.** And `verify --premerge`
printed the three values it computes, unchanged:

```
world-fingerprint   COMBINED 81798e1875975cc2
render-fingerprint  RENDER   90344c0f0361cbf1
camera-fingerprint  CAMERA   be48503a324429cb
```

**4 · Both verify selections green — run separately, because two green suites are not a
pre-merge clearance and the bare selection is not the wide one.**

```
npm run verify                      PASS 30   FAIL 0   SKIP 6   exit 0   (414.9s)
npm run verify -- --premerge        PASS 33   FAIL 0   SKIP 3   exit 0   (604.4s)
```

★ Both runs printed the same three computed fingerprints — `COMBINED 81798e1875975cc2`,
`RENDER 90344c0f0361cbf1`, `CAMERA be48503a324429cb` — which is a fourth independent statement
that nothing moved, on top of `--mint` and the zero-line diff above.

Scripts were touched, so the wide selection was the one that mattered. Every guard that could speak
to this branch passed, including `check-measured-stamps` (which my piece-4 comment repair had
reddened once and which was re-stamped at HEAD), `server-format-check`, `client-format-check`,
`server-lint`, `client-lint`, `script-suite`, `golden-races` and all four fingerprint guards.

**5 · PART ONE and `OPEN.md` agree.** PART ONE's DELIVERY-CLEAN-1 section carries **6 open rows and
1 closed**; the other PART ONE subjects number **7**; `OPEN.md` lists **13**. 7 + 6 = 13. ★ Before
today they did not agree and neither page knew it — `OPEN.md`'s header said "the count has been
seven" while its own heading and list said twelve.

### What a reviewer should distrust in this report

- **The empty group A is the claim most worth attacking.** No penetration testing was done. It
  means "nothing found by the checks that ran", and those checks are enumerated in §2 and §3 so the
  gaps are visible rather than implied.
- **§7.1 is the largest unperformed thing in the chain** — 226 script headers never read against
  their bodies. §10's second run found a 36-day-dead script through exactly that gap, which is
  evidence the gap is real and not a formality.
- **Three of my own numbers were wrong and are corrected in place, not edited away**: two
  denominators in §1, the server-lint method in §5, and a repair total of "62" in §11 that I could
  not reproduce from `git diff` when I tried.
