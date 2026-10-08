# AUDIT-1 — the complete audit before the hardening set

**Owns:** the audit of 2026-10-09 — every check run, every finding with its evidence and verdict,
the checks added to the brief, and the false positives that were rejected.

**Scope:** `origin/master` at `e164bb68` (the audited snapshot), `deploy/` on `feat/vps-install`,
the CI workflows, and the GitHub repository settings (read only, `gh api`). Ordered by the owner on
2026-10-08: a complete audit first, then the hardening set.

**How to read it.** Every finding has an id, a category, a severity, a `file:line`, the evidence,
the tool that found it, and one verdict:

- **SECURITY-FIX** — changes nothing anyone sees; applied in piece C, one commit and one sabotaged
  test per finding.
- **SAFE-CLEANUP** — changes nothing anyone sees; applied in piece B, one commit per category.
- **NEEDS-OWNER** — a decision, or a visible change; a PART ONE row in `docs/BACKLOG.md`.
- **LEAVE** — checked and deliberately not changed, with the reason.

Every tool finding was re-checked by hand; rejected false positives are named in each section. The
full per-finding tables are the appendices in [AUDIT-1/](AUDIT-1/); this page carries the summary,
every security finding, and every finding that needs a decision.

**Where the fixes went.** The critical finding (A5M-01) was live on the owner's own API, so piece C
was fast-tracked and **merged as `980b13d4` before this report**, with CI and the Browser gate green
on master. Its commits are cited against each finding.

---

## Summary

| section | findings | SECURITY-FIX | SAFE-CLEANUP | NEEDS-OWNER | LEAVE |
|---|---|---|---|---|---|
| A1 source | 5 | 0 | 2 | 0 | 3 |
| A2 comments and headers | 82 | 0 | 73 | 3 | 6 |
| A3 documents | 50 | 0 | 39 | 3 | 8 |
| A4 tests | 5 | 0 | 0 | 1 | 4 |
| A5 security (manual + tools) | 30 | 14 | 0 | 11 | 5 |
| A6 repository hygiene | 6 | 0 | 2 | 2 | 2 |
| A7 dependencies and runtime | 4 | 1 | 0 | 2 | 1 |
| A8 accessibility | 4 | 0 | 0 | 3 | 1 |
| A9 browsers, bundle | 3 | 0 | 0 | 1 | 2 |
| A10 resilience | 9 | 1 | 0 | 3 | 5 |
| A11 logging | 1 | 0 | 0 | 0 | 1 |
| A12 privacy | 1 | 0 | 0 | 1 | 0 |
| A13 client memory | 1 | 0 | 0 | 0 | 1 |
| **total** | **201** | **16** | **116** | **30** | **39** |

Counted per finding row. A2 has 84 rows, two of which record a clean result (no TODO markers, no
commented-out code) and are not findings. Two pairs describe one fact from two sides and are counted
in both sections: A2-29 / A3-19 (the German alerts) and A2-27 / A1-06 (the German component name).
The 30 NEEDS-OWNER rows are 29 decisions. Of the 16 SECURITY-FIX findings, 15 were fixed in piece C
and A5M-06 (an install-branch file mode) is fixed in piece E.

**Severity of what was found:** 1 critical (A5M-01), 0 high in the app's own code, 4 high in the
shipped image's base layer (npm and OpenSSL in `node:20-alpine`), the rest medium, low and info.
**After piece C:** the critical one is closed, the image scan is down from 89 findings (1 critical)
to 1 medium, and `npm audit` is 0 for the server and the client.

### Checks added to the brief, and why

| added check | why |
|---|---|
| a live probe of every guard with mixed-case paths | the manual review found the case mismatch in the code; only a probe could show whether Express really routes `/API/users` (it does) |
| `docker stop` exit code, and boot with each data file damaged | "SIGTERM" in the brief, extended to what a damaged file does at boot, since that is when an install is left unattended |
| a data folder that fills up (90 MB tmpfs in a container) | "disk full" could not be produced on the Windows host; a size-limited tmpfs produces it exactly |
| the race store under a held lock, with its journal mode and busy timeout read back | "locked DB" measured as a time, not described |
| depcheck instead of knip | knip is unusable in this workspace layout (11 of its 37 findings were live code, 2026-09) |
| trivy on the image built from the fixes, and again with npm removed | to measure each fix's effect on the image, not just the starting point |
| `gh api` reads of Dependabot alerts, private vulnerability reporting, rulesets and the Actions SHA-pinning setting | the brief named "repository settings"; these are the ones that bear on security |
| a heuristic for tests without an assertion | "no-assert tests" needs a tool; the heuristic and its false-positive rate are both reported |

### Tools and versions

ESLint 9.39.4 (the project's config plus a strict audit overlay), jscpd 4.0.5, depcheck 1.4.7,
semgrep 1.95.0 (`p/javascript`, `p/nodejs`, `p/secrets`, `p/dockerfile`; `p/express` does not exist),
gitleaks 8.24.3 (full history, 2,895 commits), trivy 0.57.1 (image tar mounted read-only, and
`trivy config`), hadolint 2.12.0, shellcheck 0.10.0, `npm audit` / `npm outdated` (npm 11.9.0),
vitest 4.1.8 with `@vitest/coverage-v8`, Playwright 1.59.1 (Chromium 147, Firefox 148, WebKit 26.4,
installed into the audit clone only), axe-core 4.10.2, `gh` CLI. Every container image was pinned to
a version tag; no container was privileged and none mounted the Docker socket.

---

## A5 — security (first, because it was fixed first)

### The critical finding

**A5M-01 · authorization bypass by letter case · CRITICAL · `server/src/auth/guards.js:135`,
`server/src/auth/csrf.js:78` · manual review, confirmed by a live probe.** Express 4 matches mount
paths ignoring case — `app.use('/api/users', …)` also serves `/API/users` — while the sign-in guard,
the admin policy and the CSRF guard compared the path case-sensitively. The probe, on throwaway data
([AUDIT-1/tools/case-bypass-probe.mjs](AUDIT-1/tools/case-bypass-probe.mjs)):

| request, no session | answer |
|---|---|
| `GET /api/users` | 401 |
| `GET /API/users` | **200** `[]` |
| `POST /api/users` | 401 |
| `POST /API/users` | **201 — an admin was created** |

An operator could likewise reach every admin-only route by changing one letter
(`PUT /api/Settings/test-aids`). The owner's API on 4000 listens on every interface, so this was
open to his network. **Fixed in `9d275c79`:** one helper, `server/utils/apiPath.js`, answers "is
this the API" for all three guards and the SPA fallback in the form Express routes it; 13 tests,
10 of them red under sabotage. App-wide case-sensitive routing was deliberately NOT switched on — it
would turn every mixed-case URL into a 404, a behaviour change this fix was not allowed to make.

### Every security finding

| id | finding | severity | file:line | tool | verdict | fixed in |
|---|---|---|---|---|---|---|
| A5M-01 | case bypass of sign-in, admin and CSRF | critical | guards.js:135, csrf.js:78 | manual + probe | SECURITY-FIX | `9d275c79` |
| A5M-02 | ReDoS on the `Origin` header (16 KB of slashes = 371 ms, before sign-in) | medium | csrf.js:47 | manual + timing | SECURITY-FIX | `010b26cd` |
| A5M-03 | ReDoS in the SPA fallback (16 000 dots = 555 ms, anonymous) | medium | staticClient.js:155 | manual + timing | SECURITY-FIX | `fabb79ae` |
| A5M-04 | multipart fields and parts unbounded in memory | low | imageUpload.js:65 | manual | SECURITY-FIX | `acad71da` |
| A5M-05 | backup archive and restored files world-readable (0644) | low | backup.mjs:307, :353 | manual | SECURITY-FIX | `56fc26bf` |
| A5M-06 | install folders 0755 on the VPS | low | `feat/vps-install` deploy/install.sh:273 | manual | SECURITY-FIX | piece E |
| A5M-07 | rate limiter keyed on a spoofable `X-Forwarded-For` when the port is direct | low | app.js:34 | manual | NEEDS-OWNER (see below) | — |
| A5M-08 | stack traces in HTML error pages when `NODE_ENV` is unset | low | app.js (no handler) | manual | SECURITY-FIX | `3502b2ba` |
| A5M-09 | six deletes of stored asset names without `isSafeAssetFilename` | low | brands.js:264,317,336; racers.js:231,284; tracks.js:623 | manual + semgrep | SECURITY-FIX | `585c3196` |
| A5M-10 | verify worker unbounded in time and memory | low | verifyOffMainThread.js:43 | manual | SECURITY-FIX | `193a5ab2` |
| A5M-11 | race-save fields not type-checked (a retryable 500 forever; an array id or an infinite time was silently stored) | low | raceStore.js:241 | manual | SECURITY-FIX | `c4a26bd1` |
| A5M-12 | no disk quota or write rate limit for signed-in users | low | races.js, tracks.js | manual | NEEDS-OWNER | — |
| A5M-13 | track and racer records accept any extra field and unbounded numbers | low | tracks.js:504, racers.js:93 | manual | NEEDS-OWNER | — |
| A5M-14 | tracks, brands, racers, player groups are not team-scoped | info | docs/API.md:294 | manual | NEEDS-OWNER | — |
| A5M-15 | the only password rule is "not blank" | low | usersStore.js:30 | manual | NEEDS-OWNER | — |
| A5M-16 | login limiter per IP only, no per-account counter | info | rateLimit.js:16 | manual | NEEDS-OWNER | — |
| A5M-17 | 30-day sessions, session id kept on own password change | info | session.js:102 | manual | LEAVE (product choice) | — |
| A5M-18 | no Content-Security-Policy, no proxy headers | info | app.js:36 | manual | NEEDS-OWNER → piece D1 | review branch |
| A5M-19 | the image ignored its lockfile (`npm install`) | low | server/Dockerfile:64 | manual | SECURITY-FIX | `a76c7f8c` |
| A5M-20 | secrets in the container environment | info | deploy compose | manual | LEAVE (standard for compose) | — |
| A5M-21 | a warning line per request for a user without a team | info | guards.js:180 | manual | LEAVE (noise, not risk) | — |
| A5T-01 | `npm audit`: multer 2.3, ip-address (server, production); vitest set (both, dev) | moderate | lockfiles | npm audit | SECURITY-FIX | `a377b803` |
| A5T-02 | `npm audit`: root `sharp` high, fixable only by a 0.x major; used by two sprite scripts, never shipped | high (dev only) | package.json:23 | npm audit | NEEDS-OWNER | — |
| A5T-03 | CI actions on moving tags (`@v4`) | low | 3 workflows, 12 lines | manual | SECURITY-FIX | `c369ea81` |
| A5T-04 | image: 89 findings on `node:20-alpine` (OpenSSL high ×2, npm's bundled tar critical, …) | critical (base layer) | server/Dockerfile:27,39 | trivy | SECURITY-FIX | `c2530f29` + `81c71be0` |
| A5T-05 | hadolint DL3018: `apk add` without versions | info | server/Dockerfile:56 | hadolint | LEAVE — the toolchain is added and removed in one layer on a digest-pinned base |
| A5T-06 | master unprotected, no rulesets | low | GitHub settings | gh api | NEEDS-OWNER | — |
| A5T-07 | Dependabot alerts and updates off, private vulnerability reporting off, no SECURITY.md | low | GitHub settings | gh api | NEEDS-OWNER | — |
| A5T-08 | "require SHA pinning" Actions setting off (the workflows now pin anyway) | info | GitHub settings | gh api | NEEDS-OWNER | — |
| A5T-09 | gitleaks: 2 hits over 2,895 commits | — | raceShortKey.js:40, users.integration.test.js:233 | gitleaks | LEAVE — both false positives (an alphabet constant and a test password) |

**A5M-07, why it is not a fix.** The proposed start-up warning ("trust proxy on and the bind address
not loopback") would fire on every correct VPS install: inside the container the app must listen on
all interfaces for Caddy to reach it, and the container cannot see that its port is unpublished. A
warning on every correct install is the noise `startupReadiness.js` exists to avoid. The real fix is
an explicit `RA_TRUST_PROXY` setting, which changes behaviour — the owner's call.

**Rejected false positives.** semgrep `express-path-join-resolve-traversal` 17 hits: 6 are A5M-09
(fixed); the other 11 join a server-derived `<id>.<ext>` name, an id validated by `isValidId`, or are
read paths that already call `isSafeAssetFilename`. semgrep `detected-bcrypt-hash`: the dummy hash
that equalises login timing (`authRouter.js:22`), on purpose. semgrep
`express-session-hardcoded-secret`: a test file. semgrep also reported 11 parse errors and timeouts
on large scripts — a tool limit, recorded, not a finding. trivy config: 27 of 27 Dockerfile checks
pass; it has no scanner for compose files, so the compose files were reviewed by hand (A5M-20).

---

## A1 — source

| id | finding | file:line | tool | verdict |
|---|---|---|---|---|
| A1-01 | `server/utils` is outside the server's lint script (`eslint src`), and one error waits there: an empty `catch {}` | server/package.json:18; server/utils/atomicWriteJson.js:16 | ESLint | SAFE-CLEANUP |
| A1-02 | two `eslint-disable` directives for rules enabled in neither config | scripts/sim-race-visual.mjs:186, scripts/viewer-invariants.mjs:462 | ESLint | SAFE-CLEANUP |
| A1-03 | two Fast-Refresh warnings (a component file exports constants) | client/src/screens/DevScreen/sections/PeriodEvaluation.jsx:45, :52 | ESLint | LEAVE — dev-only HMR, no effect on the build |
| A1-04 | 93 functions over cyclomatic complexity 25 (45 production, 48 scripts) | report: AUDIT-1/eslint-all-options.json | ESLint `complexity` | LEAVE — information; the largest are the race engine and camera, where a split is a fingerprint risk, not a cleanup |
| A1-05 | 37 duplicate blocks ≥ 30 lines (0.83 % of lines): 2 production, 11 scripts, 24 tests | AUDIT-1/jscpd/ | jscpd | LEAVE — the two production pairs are one Dev Screen layout skeleton with different text, ids and limits; the tests are one-file-per-racer-type by convention |
| A1-06 | German component, folder and file name `DiagnoseVerteilung` | client/src/screens/DiagnoseVerteilung/ | manual (A2-27) | SAFE-CLEANUP for the names; the route `/diagnose-verteilung` is a visible URL → NEEDS-OWNER, counted in A2 |
| A1-07 | "Ms" names holding seconds | scripts/parity/replay.mjs:113-114; scripts/diag/micro-divergence.mjs:262 | manual (A2-25, -26) | SAFE-CLEANUP (counted in A2) |
| A1-08 | no TODO/FIXME/XXX/HACK marker and no commented-out code block in production source | — | grep + manual | — (clean) |
| A1-09 | `console.*` in production: all deliberate or behind a flag except the two unguarded camera "LIVE TRUTH" lines | client/src/screens/RaceScreen/index.jsx:579, :1201 | grep + manual (A2-21) | LEAVE (counted in A2) |

A1-06, A1-07 and A1-09 are counted where their full row lives (A2); A1-08 records a clean result.

**Unused code.** The strict overlay (`no-unused-vars` with every option, `no-unreachable`,
`no-unreachable-loop`, `no-constant-condition`) reported 378 unused variables. **All are rejected as
false positives under the project's own convention:** the project lint (`npm run lint`) reports none,
because they are `_`-prefixed discards or positional parameters before a used one. No unreachable
code and no constant condition was found. depcheck: no unused dependency in any of the three trees
(`acorn` and `virtual:ra-build` are false positives — a resolver it cannot follow and a Vite virtual
module).

---

## A2 — comments and headers

Full table: [AUDIT-1/A2-comments.md](AUDIT-1/A2-comments.md) (63 rows) and
[AUDIT-1/A2-groupE-contradictions.md](AUDIT-1/A2-groupE-contradictions.md) (21 rows).

- **Headers.** 552 production files: 378 carry the standard header; 126 put the full path in `File:`
  with no `Path:` (124 of them in `scripts/`, a convention of their own — LEAVE, A2-04); 96 have none
  (87 in `scripts/`, 76 of those in `scripts/diag/`). Nine production files outside `scripts/` lack a
  header (A2-02) and one names the wrong extension (A2-01) — SAFE-CLEANUP.
- **Comments that name what is gone.** 7 stale identifiers in comments (A2-07 … A2-13), including
  `CameraDirector.js:948` naming a method that does not exist — SAFE-CLEANUP.
- **Comments that contradict the code.** 21 in scripts and the server (group E), several "shipped
  OFF" claims for settings that are now ON, and `raceStore.js:6-7` ("nothing writes to it") —
  SAFE-CLEANUP for comments. Where the contradiction is a Dev Screen info text a person reads, the
  correction is visible — NEEDS-OWNER.
- **Line citations in comments.** 11 of 44 drifted (A2-16 … A2-20) — SAFE-CLEANUP, replaced by the
  symbol they mean.
- **Two need the owner:** A2-14, `defaultWinners: 3` still written into every new track and carried by
  the 10 seed records though nothing reads it (removing it changes the seed records); A2-50,
  `viewerProbe.js:414` passes world pixels where a normalised value is expected — a probable bug in a
  diagnostic instrument.

---

## A3 — documents

Full table: [AUDIT-1/A3-docs.md](AUDIT-1/A3-docs.md) (50 rows).

- **Links:** 896 relative links and 139 anchors in 38 documents — none broken.
- **Citations:** 917 distinct `file:line` citations checked — 643 correct, **182 wrong**, 90
  historical, 2 pointing at files that do not exist. **Every one** of the 551 in `docs/API.md` was
  checked (55 wrong — mostly `tracks.js`, shifted by the backup-retention commit), every one in
  `DEPLOYMENT.md` (5 of 9 wrong); `AUTH.md` and `VPS-INSTALL.md` carry none. 366 more were sampled
  across the other documents. Some are not merely mis-addressed but describe what is gone
  (`SHIP-CEREMONY.md:91`, `DEPLOY-NOTES.md:80, :159, :241`). SAFE-CLEANUP.
- **Removed features still described:** the "Podium Spots" control in `DEVSCREEN-INVENTORY.md`
  (gone 2026-10-06), `defaultWinners` as an active field in `RACER_DATA_MODEL.md:131` — SAFE-CLEANUP.
- **English only:** `check-language-closed` passes. German it cannot see: a few test titles and one
  `LESSONS.md` word (SAFE-CLEANUP), and **three German alerts users see** (BrandingProfiles,
  PlayerGroupsManager, TrackManager), frozen by the allowlist — NEEDS-OWNER (a visible change).
- **OPEN vs BACKLOG:** the counts and the one open row agree. OPEN.md §2-§5 still show items
  un-struck that are not backed by a row ("Pause and resume", "HTTPS is not arranged") — NEEDS-OWNER.
- **Tags:** 136 at origin, every one registered, none missing. Two register lines carry the wrong
  SHA (`v-ship-the-night`, `pre/no-schema`), which `check-tags` cannot see because it compares names
  only — SAFE-CLEANUP; three archive tags registered without a SHA — SAFE-CLEANUP.
- **CLAUDE.md** says `docs/fingerprints.json` carries two FINISH-PAIR-1 quotations; it carries none.
  CLAUDE.md forbids editing that inventory — NEEDS-OWNER.
- **README for a new operator:** the base-image line is wrong (it is pinned by digest), a client
  build step is unnecessary, the first-admin step is missing, and the API.md description is stale —
  SAFE-CLEANUP.

---

## A4 — tests

| id | finding | evidence | verdict |
|---|---|---|---|
| A4-01 | coverage | client **82.8 %** lines (branches 69.2 %, functions 75.9 %), 31 of 298 production files under 50 % — almost all diagnostic HUDs, probes and Dev Screen tuning sections; server **93.2 %** lines (branches 84.0 %), 3 of 53 under 50 % | LEAVE (information); lists in AUDIT-1/coverage-* |
| A4-02 | a load-sensitive hook: `devScreenChapters.guard.test.jsx` and `.savedSettings.test.jsx` take ~9.5 s each against a 10 s `beforeAll` limit | timed out twice — beside trivy and semgrep, and under coverage instrumentation; passed in every unloaded run (5 of 7 client runs green) | LEAVE + row: give the hooks headroom or split them |
| A4-03 | seven tests read source files relative to the process working directory, so they fail unless run from `client/` | buildIdentityReason, buildIdentitySource, buildIdentityWorktree, chaseWiring, nameLimits, api, labelBoxGeometry tests | LEAVE + row (low): resolve from `import.meta.url` |
| A4-04 | the race-source migration has no test | server/src/races/migrateRaceSource.js (0 % covered; an idempotent `ADD COLUMN` that already ran on the owner's database) | NEEDS-OWNER row (low) |
| A4-05 | no `.only`, no unconditional `.skip`; one conditional e2e skip (an opt-in measurement probe) | grep | LEAVE |

**No-assert tests.** A heuristic flagged 228 of 6,219 cases with no assertion in their own body.
Five were checked by hand and all five are false positives (brace-less arrow functions, `{` inside a
title, assertions in helpers, `findByText` throwing). No test without an assertion was confirmed;
the heuristic is reported as unreliable rather than its count as a finding.

**Flakiness, three runs or more each:** server suite 5 runs, all green; client suite 7 runs, 5 green,
the two red ones both A4-02 under load; script suite green after the routing test was updated.

---

## A6 — repository hygiene

| id | finding | verdict |
|---|---|---|
| A6-01 | `.gitignore:24` `AUDIT.md` is unanchored and matches the tracked `docs/AUDIT.md` | SAFE-CLEANUP (`/AUDIT.md`) |
| A6-02 | the pre-commit hook's `# shellcheck disable=SC2046 - …` directive does not parse, so shellcheck stops checking the file (`.githooks/pre-commit:124`) | SAFE-CLEANUP |
| A6-03 | about 200 MB of old measurement blobs in history (`results/regate-*` 30 MB each, `docs/diagnose/*.ndjson`); 4 of the 20 largest are still at HEAD (seed backgrounds) | NEEDS-OWNER — shrinking history rewrites every SHA |
| A6-04 | 22 tracked files over 1 MB at HEAD: the seed backgrounds (needed) and report data | LEAVE |
| A6-05 | package scripts: no `node <file>` target missing | LEAVE (clean) |

| A6-06 | licences (AUDIT-1/licences.txt): the repository is **AGPL-3.0-or-later** (`LICENSE`, `package.json`); of 35 direct dependencies 32 are MIT and 2 Apache-2.0, and **one production dependency is GPL-3.0-only** — `better-sqlite3-session-store`. GPLv3 §13 and AGPLv3 §13 permit the combination, but the "-only" pins the shipped image's combined work to version 3 | NEEDS-OWNER (information — a licensing judgement, not a defect) |

Shell scripts: `deploy/install.sh`, `deploy/racearena`, `deploy/test/e2e-local.sh` are shellcheck-
clean; the three under `reports/` are archived measurement runs (SC2086/SC2155 notes) — LEAVE.

---

## A7 — dependencies and runtime

| id | finding | verdict |
|---|---|---|
| A7-01 | **Node 20 reached end of life on 2026-04-30**; the image and CI still ran it | SECURITY-FIX → Node 24 (`c2530f29`), guarded by `scripts/runtime-node.test.mjs` |
| A7-02 | the source-install floor still says `engines: >=20` / "Node 20 or newer" | NEEDS-OWNER |
| A7-03 | majors available: React 19, Express 5, ESLint 10, Vite (in range), vitest 5, better-sqlite3 13, jest-dom 7, lint-staged 17 | NEEDS-OWNER — each a migration, none a security fix today |
| A7-04 | `npm ci` reproducibility: the client stage already used it; the server stage did not | fixed with A5M-19 |

Full lists: AUDIT-1/npm-outdated-*.json.

---

## A8 — accessibility (axe-core 4.10.2, WCAG 2.1 A/AA, Chromium)

| screen | 390 px | desktop |
|---|---|---|
| `/login` | 0 | 0 |
| `/setup` | 0 | 0 |
| `/dev` (Dev Screen) | 2 rules: contrast (14 nodes), labels (10) | 2 rules: contrast (19), labels (10) |
| `/track-editor` | 1 rule: select name (2) | 1 rule: select name (2) |

| id | finding | verdict |
|---|---|---|
| A8-01 | Dev Screen: active tier toggle and the reset buttons fail colour contrast; 10 numeric inputs have no label (e.g. `normal-speed-input`) | NEEDS-OWNER (visible) |
| A8-02 | Track Editor: two `<select>` without an accessible name (`track-lights-style`, the load select) | NEEDS-OWNER (a label is visible text) |
| A8-03 | setup screen at 390 px is 393 px wide — the header overflows by 3 px | NEEDS-OWNER (visible, low) |
| A8-04 | keyboard: sign-in works with keys alone; the setup screen's controls are reached in reading order (branding, settings link, the three tabs, groups, the name field); Start Race is skipped only while it is disabled (no players) | LEAVE |

Screenshots at 390, 768 and desktop for every screen: AUDIT-1/browser/. **Rejected false positives
of my own probe:** "the Sign in button is not in the Tab order" — it is `disabled` until both fields
have text, and the probe tabbed through empty fields; "no focus indicator" — the inputs show focus by
`border-color`, not by outline.

---

## A9 — other browsers, bundle

| browser | sign in | setup and Dev Screen | a Quick Test race |
|---|---|---|---|
| Chromium 147 (control) | yes | yes | starts, canvas drawn |
| Firefox 148 | yes | yes | starts, canvas drawn (screenshot AUDIT-1/browser/a9-firefox-race.png) |
| WebKit 26.4 | yes | yes | starts, canvas drawn |

- A9-01 · the client bundle is one 1,007 KB JavaScript chunk (295 KB gzipped) plus 60 KB CSS; Vite
  warns over 500 KB — NEEDS-OWNER (code splitting changes load behaviour).
- A9-02 · Firefox logs one "Server not reachable" line for racer types fetched before sign-in
  completes; the app recovers — LEAVE.
- A9-03 · Lighthouse was not run: it needs Chrome's own binary and the audit installs browsers into
  the clone only; the bundle size and the axe results above cover what it would have said about
  weight and accessibility — LEAVE, stated.

---

## A10 — resilience

Full table: [AUDIT-1/A10-resilience.md](AUDIT-1/A10-resilience.md). Measured on throwaway data,
ports 4611 / 4711+ / 4720, never the owner's.

| id | scenario | result | verdict |
|---|---|---|---|
| A10-01 | `docker stop` | node is PID 1 with no SIGTERM handler: **SIGKILL, exit 137** | SECURITY-FIX (`bf5e4a65`): exit **0 in 0.6 s** |
| A10-02 | a held lock on `races.sqlite` | rollback journal, 5 s busy timeout: a save **blocks the whole server 6.9 s**, then fails | NEEDS-OWNER (WAL changes the files; his data folder is in OneDrive) |
| A10-03 | integrity after 501 races | `ok`, no foreign-key violations | LEAVE |
| A10-04 | query plans | every read indexed | LEAVE |
| A10-05 | `users.json` damaged | starts, **health says ok**, sign-in 500 | NEEDS-OWNER (what health reports) |
| A10-06 | `races.sqlite` damaged | starts, only races fail | LEAVE (contained) |
| A10-07 | `sessions.sqlite` damaged | **the server will not start** | NEEDS-OWNER (auto-discard is a policy) |
| A10-08 | a track file damaged | skipped with a warning | LEAVE |
| A10-09 | data folder full | reads work; writes (and sign-in) 500; nothing damaged; recovers when space is freed | LEAVE |

**Client side (Chromium, port 4611):** with the server stopped a page load fails, as it must when the
same server serves the app; after a restart the session survives; offline-and-back recovers on the
next navigation; signing out in one tab sends the other to the sign-in screen on its next request.
All as intended.

---

## A11 — logging

No password, token, secret or request body is logged anywhere in `server/src` or `server/utils`; the
bootstrap-token mismatch line names no token (pinned by `setupTokenLog.test.js`). Usernames and user
ids appear in warning lines. A JSON parse error's message quotes the body on Node 20+, so the error
handler added for A5M-08 logs no 4xx message at all. — A11-01 LEAVE.

## A12 — privacy

Full inventory: [AUDIT-1/A12-privacy.md](AUDIT-1/A12-privacy.md). Two observations for the owner:
**player names are stored forever** in `races.sqlite` (immutable rows, no delete route), and **backup
archives have no retention**. No third party receives anything: fonts are self-hosted, there is no
analytics, and the server makes no outbound call. Caddy on the VPS writes no access log, so no IP
address is logged anywhere. Both observations are NEEDS-OWNER; the facts go into
`docs/PRIVACY-FACTS.md` (piece F).

## A13 — client memory over 20 races in one tab

Chromium, one tab, never reloaded; 20 Quick Test races of 2 racers back to back through the app's own
navigation; the heap read after a forced garbage collection (CDP `HeapProfiler.collectGarbage`, then
`Performance.getMetrics`). Raw samples: AUDIT-1/browser/a13.json.

| after | JS heap (MiB) | DOM nodes | listeners | documents |
|---|---|---|---|---|
| (setup, before race 1) | 3.67 | 479 | 242 | 1 |
| race 1 | 5.85 | 514 | 249 | 1 |
| race 5 | 6.32 | 527 | 242 | 1 |
| race 10 | 6.46 | 514 | 244 | 1 |
| race 15 | 6.57 | 514 | 245 | 1 |
| race 20 | 6.64 | 525 | 242 | 1 |

The first race loads the engine (+2.2 MiB, once). After that the heap grows 0.79 MiB over 19 races and
**flattens** — about 18 KB a race over the last ten, consistent with the race-history entry each
finished race keeps. DOM nodes, listeners and documents stay flat. **No leak.** — A13-01 LEAVE.

---

## NEEDS-OWNER — every decision this audit leaves for the owner

Each becomes a PART ONE row in `docs/BACKLOG.md`.

1. A5M-07 — an explicit `RA_TRUST_PROXY` setting instead of trusting one proxy hop by `NODE_ENV`.
2. A5M-12 — per-user write limits or a disk alarm.
3. A5M-13 — an allow-list of track fields and numeric bounds matching the editors.
4. A5M-14 — whether tracks, brands, racers and player groups should be team-scoped.
5. A5M-15 — a server-side minimum password length (the installer asks for 10).
6. A5M-16 — a per-account sign-in failure counter.
7. A5T-02 — root `sharp` 0.34 → 0.35 (a major; dev scripts only).
8. A5T-06 — protect master (no force-push, no deletion).
9. A5T-07 — Dependabot alerts, private vulnerability reporting, a SECURITY.md contact.
10. A5T-08 — turn on "require SHA pinning" for Actions now that every workflow pins.
11. A2-14 — stop writing `defaultWinners` and drop it from the seed records.
12. A2-50 — `viewerProbe.js:414` invariant 3 (probable bug in a diagnostic).
13. A2 — Dev Screen info texts that still say "shipped OFF" for settings that are ON.
14. A3-19 — translate the three German alerts users see.
15. A3-22 — CLAUDE.md's inventory names quotations `fingerprints.json` no longer carries.
16. A3-25 — which un-struck items on OPEN.md §2-§5 are still open.
17. A4-04 — a test for the race-source migration.
18. A6-03 — whether to shrink the repository history.
19. A7-02 — raise the source-install floor to Node 22.
20. A7-03 — the major upgrades (React 19, Express 5, ESLint 10, vitest 5, better-sqlite3 13).
21. A8-01 — Dev Screen contrast and labels.
22. A8-02 — Track Editor select labels.
23. A8-03 — the 3 px overflow at 390 px.
24. A9-01 — code-split the client bundle.
25. A10-02 — WAL mode for the race store.
26. A10-05 — let health (or the status check) see a damaged store.
27. A10-07 — start with a fresh sessions file when the old one is damaged.
28. A12 — retention for player names in stored races, and for backup archives.
29. A6-06 — the GPL-3.0-only session store inside an AGPL-3.0-or-later project (a licensing note).

## LEAVE — what was checked and deliberately not changed

Listed with each section above; the reasons are stated beside each. The largest groups: the 378
`no-unused-vars` hits (project convention), the 93 complexity notes, the 37 duplicate blocks, the
script header convention (A2-04), the dated sheets whose citations are historical (A3), and the
container-environment secrets (A5M-20).
