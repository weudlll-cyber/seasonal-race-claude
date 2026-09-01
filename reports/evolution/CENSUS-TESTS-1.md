# CENSUS-TESTS-1 — what the test estate actually is, with the denominator each time

**Measured 2026-09-01/02 on `feat/aim-levers-1` (branch point `ed627ae7`), on the owner's machine.
Nothing in the repository was edited.** Piece 3 of the NIGHT-CENSUS-1 chain, which counts and does
not repair. Every count below is from a run or an AST pass, not an estimate, unless it is explicitly
labelled ESTIMATE.

---

## Headline

| | |
|---|---|
| Test files tracked in git (excl. `node_modules/`) | **310** |
| Tests that actually execute | **5,583** |
| Assertion call-sites in the source of those tests | **~10,137** |
| Files that run under an automatic invoker | **300 of 310** |
| Files that run only when invoked by hand | **10** (the whole Playwright suite) |
| Files that are selected but inert (wrong-runner import) | **0** |
| Wall clock, all four suites, measured tonight | **~7.6 min** (170 s + 33 s + 40 s + 254 s) |
| Wall clock a *ship* pays (the three wired suites) | **~4.1 min**, of which the client suite is **170 s** |

**"4,327" is the client Vitest suite's test count, exactly — not the repository's.** It was
`Tests 4327 passed (4327)` on both of tonight's client runs. The repository total is **5,583**. So
the number that has been quoted is 77% of the estate, and it belongs to one of the four runners.

**The single biggest cost is not a test.** The client suite's own summary reads:

```
Duration  168.71s (transform 12.05s, setup 33.68s, import 42.41s, tests 144.04s, environment 376.41s)
```

`environment` is jsdom instantiation, summed across workers: **376 s of worker-time against 144 s
actually spent running test bodies.** At four workers over a 170 s wall clock that is ~55% of all
worker time spent building a DOM 230 times. The heaviest single file, `goldenRealArm.test.js`, is
63 s — real, but it finishes at t+63 s of a 170 s run and is not what the wall clock is waiting for.

---

## Part A — the counts

### A1/A2. Files, tests, assertions, per runner

| runner | invoker | files on disk | selected by its globs | actually ran | tests (runtime) | static `it(`/`test(` blocks | assertion call-sites | test LOC |
|---|---|---|---|---|---|---|---|---|
| Vitest — `client/` | CI per push + `verify` | 230 | 230 | **230** | **4,327** | 3,935 | 7,518 | 60,398 |
| Vitest — `server/` | CI per push + `verify` | 30 | 30 | **30** | **715** | 710 | 1,327 | 8,467 |
| `node --test` — `scripts/` | CI per push + `verify` | 40 | 40 | **40** | **435** | 435 | 1,106 | 8,967 |
| Playwright — `client/e2e/` | **nothing** — by hand only | 10 | 10 | **10** | **106** (103 + 3 setup steps) | 105 | 186 | 2,516 |
| **total** | | **310** | **310** | **310** | **5,583** | **5,185** | **~10,137** | **80,348** |

Method and its boundaries:

- Files enumerated with `git ls-files`, matched on `*.{test,spec}.{js,jsx,mjs,cjs}` plus
  `client/e2e/auth.setup.js`. Untracked and gitignored test files: **none**.
- Tests counted two ways. *Static* is an Acorn (+ acorn-jsx) walk counting `it(`/`test(` call sites,
  with `test.describe`/`test.beforeEach`/`test.step` excluded. *Runtime* is what the runner reported.
  The 398-test gap is `.each`/`.for` expansion — 27 static parameterised blocks in the tree.
- Assertions are **call-sites, not test cases**. One test averages **1.8 assertions**. The counter
  walks to the root identifier of a matcher chain, so a negated matcher is one, not two. A second
  independent pass returned 10,139; the two differ on 2 edge cases (a bare `assert(x)` vs
  `assert.equal(x)`).
- **Boundary worth naming**: assertions hidden behind a local helper are not counted.
  `scripts/sim/observers/physics-tax.test.mjs` defines a local `near()` helper and calls it 30+
  times; those are real assertions this census scores as zero. The true assertion count is therefore
  a *lower* bound.
- Test code is **80,348 lines against 118,936 lines of source** (0.68:1 overall; 1.10:1 in
  `client/src`, 1.93:1 in `server/`).
- **Zero** `.skip`, `.only`, `.todo`, `.skipIf`, `.runIf` or `.failing` anywhere in the 310 files.
  Nothing is parked.

### A3. What runs in a suite, and what only runs by hand

**The true never-runs figure is zero, and it is not the interesting number. The interesting number is
ten.**

The brief expected two files that had never run because they used Vitest imports under a `node --test`
runner. **That is not the tree's state tonight, and it could not be found in history either**:
`git log --all -S"from 'vitest'" -- scripts/` returns nothing, ever. What the repository *does* record
is two adjacent events — WIRE-SUITES-1 (`3719808c`, 2026-08-15) wiring 19 server files that no invoker
ran, and the `scripts/*.test.mjs` glob that missed `scripts/lib/write-verified.test.mjs` when a
subdirectory appeared (one file, since fixed by reading `git ls-files scripts` and filtering).

Verified by construction rather than assumed:

| check | result |
|---|---|
| All 40 `scripts/**/*.test.mjs` import `node:test` | **40 / 40** |
| Any `client/` or `server/` test importing `node:test` or `@playwright/test` | **0** |
| Any `client/e2e/` spec importing `vitest` | **0** |
| `find scripts -name '*.test.mjs'` (CI) vs `git ls-files scripts` filter (`verify`) | **identical, 40 files each** |
| Files selected by a glob but reported by no runner | **0** — 230/230, 30/30, 40/40, 10/10 |

**The ten files that no automatic invoker runs** — the entire Playwright suite. This is a *declared*
decision (`client/playwright.config.js`, `docs/NIGHT-RUN.md`, owner 2026-08-16), not rot, but the
consequence is real and is documented under "Broken" below.

| file | added | tests | note |
|---|---|---|---|
| `client/e2e/d9-smoke.spec.js` | 2026-04-26 | 15 | **timed out tonight** |
| `client/e2e/d355-smoke.spec.js` | 2026-04-26 | 14 | |
| `client/e2e/b1617-smoke.spec.js` | 2026-04-27 | 6 | |
| `client/e2e/camera-polish-ux-verification.spec.js` | 2026-04-27 | 15 | |
| `client/e2e/d11-ux-verification.spec.js` | 2026-04-27 | 12 | |
| `client/e2e/fix-list-tracks-world-dimensions.spec.js` | 2026-04-27 | 4 | |
| `client/e2e/vre-2-ux-verification.spec.js` | 2026-04-30 | 33 | |
| `client/e2e/auth.setup.js` | 2026-08-15 | 3 | fixture project |
| `client/e2e/garden-path-finishes.spec.js` | 2026-08-25 | 3 | **fails tonight; premise invalidated 2026-08-25** |
| `client/e2e/quicktest-vs-harness.spec.js` | 2026-08-25 | 1 | **asserts nothing** |

**Six of the ten are from April.** This is not recent rot; it is a four-month-old wing of the house
with the power switched off at the board. The two August files are the recent additions, and both are
already defective — which is exactly what an un-invoked suite predicts.

**A second nuance the headline hides.** The three wired suites are *routed*, not unconditional.
`scripts/lib/routing.mjs` selects `client-suite` only when something under `client/` changes,
`server-suite` only for `server/`, `script-suite` only for `scripts/`; CI additionally short-circuits
on a docs-only push. Verified with `npm run verify --dry`: 21 tasks run, `server-suite` skipped
("nothing changed"). **A change confined to `client/e2e/` selects no suite at all** — `client-suite`
declares `except=client/e2e/`, and CI never invokes Playwright. That path has no gate of any kind.

### A4. Wall clock, and what dominates

All measured tonight, one suite at a time, nothing else running.

| suite | command | wall clock | worker-time breakdown | files | tests |
|---|---|---|---|---|---|
| client Vitest | `npm test` | **170 s** | tests 144 s · **environment 376 s** · import 42 s · setup 34 s · transform 12 s | 230 | 4,327 |
| client Vitest | `vitest run --reporter=json` | 217 s | (reporter overhead, ~47 s) | 230 | 4,327 |
| server Vitest | `npm test` | **33 s** | tests 79 s · import 12 s · environment 4 ms | 30 | 715 |
| script suite | `node --test <40 files>` | **40 s** parallel (**74 s** if serialised one file per process) | — | 40 | 435 |
| Playwright e2e | `npx playwright test` | **254 s** | 1,122 s of test-time across ~4.5 workers | 10 | 106 |

**Top 15 client files by duration** (from the JSON run; shares are of the 216.4 s summed file-time):

| s | tests | file | share |
|---|---|---|---|
| 63.0 | 4 | `client/src/modules/parity/goldenRealArm.test.js` | 29.1% |
| 25.3 | 4 | `client/src/modules/parity/goldenEquality.test.js` | 11.7% |
| 21.2 | 2 | `client/src/modules/parity/goldenNegative.test.js` | 9.8% |
| 20.1 | 4 | `client/src/modules/parity/replay.test.js` | 9.3% |
| 9.2 | 41 | `client/src/screens/SetupScreen/SetupScreen.test.jsx` | 4.2% |
| 8.2 | 38 | `client/src/modules/sim-fairness.test.js` | 3.8% |
| 6.0 | 9 | `client/src/modules/buildIdentityReason.test.js` | 2.8% |
| 5.6 | 32 | `client/src/screens/DevScreen/sections/RaceTuningSection.test.jsx` | 2.6% |
| 5.4 | 11 | `client/src/screens/SetupScreen/raceActionStage.test.jsx` | 2.5% |
| 5.2 | 13 | `client/src/screens/SetupScreen/raceSeed.test.jsx` | 2.4% |
| 4.2 | 32 | `client/src/screens/DevScreen/sections/SurfaceClassManager.test.jsx` | 1.9% |
| 3.7 | 36 | `client/src/screens/DevScreen/sections/TrackManager.test.jsx` | 1.7% |
| 3.1 | 7 | `client/src/modules/buildIdentityWorktree.test.js` | 1.4% |
| 2.6 | 39 | `client/src/screens/DevScreen/sections/RacerEditModal.test.jsx` | 1.2% |
| 2.1 | 9 | `client/src/screens/DevScreen/sections/CameraAdvancedSection.test.jsx` | 0.9% |
| | | **top 15 combined** | **85.5%** |

Median file: **23.5 ms**. **209 of 230 files finish in under a second.**

**The "goldenRealArm is 99% of client wall clock" belief is out of date. It is 29.1%**, and the four
`parity/` files together are 59.9%. The correction has a mechanism behind it: the four-worker bound
(GATE-CLIENT-CROWDING-2) means the four heavy files now run *concurrently*, all starting at t=0 and
all finished by t+63 s, while the remaining 226 files take the following ~107 s. Interval analysis of
the JSON timestamps shows **176 gaps totalling 127 s in which no test file was in flight on any
worker** — that is per-file jsdom teardown/creation and module transform, and it agrees with the
`environment 376.41s` line. **Cutting test bodies will not move this suite; cutting file count or
sharing environments would.**

**Server top 6 by duration** (79.7% of the suite): `changePassword` 17.2 s, `usersStore` 13.9 s,
`sessionInvalidation` 8.6 s, `changePasswordContract` 7.5 s, `authRouter` 6.4 s, `recoverAdmin` 5.3 s.
**All six are bcrypt-bound**, which is exactly what `server/test/suiteShape.mjs` derives and bounds.

**Script suite top 6** (of the 74 s serialised total): `verify.test.mjs` 16.8 s (22.7%),
`fingerprint-default.test.mjs` 8.3 s, `check-measured-stamps.test.mjs` 6.5 s,
`check-fingerprints.test.mjs` 5.3 s, `check-writable.test.mjs` 4.0 s, `engine-reach.test.mjs` 3.7 s.

**Playwright top 3 tests**: `garden-path :: and it actually crosses the line` **146.9 s** (13% of the
whole e2e suite's test-time, one test), `d9 :: clicking lap 1 updates start bar` 58.6 s (timed out),
`vre-2 :: saving a code-default class` 26.6 s.

---

## Part B — how many tests assert something no other test asserts

### The caveat, stated first

**This question cannot be answered without mutation testing, and mutation testing was not run
tonight.** The only honest measurement of "does this test assert something nothing else does" is:
mutate the source, run the suite, and see whether *exactly one* test goes red. Nothing below does
that. Everything below is a *shape* argument — it finds assertions that look alike and modules that
are approached from many angles — and shape similarity is not redundancy. Two identical status-code
assertions against two different routes are not the same assertion. **Do not read any percentage in
this section as a mutation score.**

### MEASURED

**Duplicated assertion shapes.** 10,139 assertion call-sites were normalised (whitespace collapsed,
every string literal to `'S'`, every number to `#`).

| | count | share |
|---|---|---|
| Assertion call-sites | 10,139 | — |
| Distinct **normalised shapes** | 6,560 | — |
| Call-sites repeating a shape already present | **3,579** | **35.3%** |
| Distinct **exact texts** (character-for-character) | 8,021 | — |
| Call-sites that are a literal duplicate of another line somewhere in the tree | **2,118** | **20.9%** |

Top repeated shapes, with multiplicity and how many *files* they span:

| x | files | shape |
|---|---|---|
| 350 | 17 | an HTTP status-code assertion on `res.status` |
| 80 | 16 | `expect(screen.getByText('App content')).toBeTruthy()` |
| 55 | 13 | `expect(screen.queryByText('Something went wrong')).toBeNull()` |
| 40 | 6 | `assert.equal(r.code, 0)` |
| 35 | 3 | an auth-state text assertion on a test id |
| 32 | 11 | `expect(screen.getByTestId('error-details')).toBeTruthy()` |
| 31 | 8 | a settings-replaced banner assertion |
| 29 | 5 | `expect(res.body).toHaveProperty('error')` |
| 21 | 3 | `expect(store.countUsers()).toBe(1)` |
| 18 | 6 | `expect(result).toHaveLength(2)` |

Exact-text repeats are dominated by HTTP status codes — **336 character-identical lines**, spread
across 6–14 files each. A second, distinct cluster is the React error-boundary shell:
`App content` / `Something went wrong` / `error-details` = **167 lines across 16 files**.

**Several tests over one module.** Two independent mappings.

*By import* (233 distinct local modules imported by at least one test file):

| test files importing it | modules |
|---|---|
| 1 | 137 |
| 2 | 42 |
| 3 | 21 |
| 4 | 12 |
| 5–9 | 13 |
| 10+ | 8 |

Most-approached modules: `client/src/modules/storage/defaults.js` **33**, `racer-types/index.js`
**31**, `storage/storage.js` **25**, `racer-types/spriteLoader.js` **23**,
`camera/CameraDirector.js` **14**, `cameraConfig.js` **13**, `server/src/app.js` **13**. (Caveat: an
import is not proof of "under test" — `defaults.js` and `sampleTracks.js` are as often fixtures as
subjects.)

*By co-located naming* — the tighter signal. **205 source modules have a same-named test file. 200 of
them have exactly one.** Four have two (`SpriteRacerType.js`, `catmullRom.js`, `DevScreen.jsx`,
`nameTagLayout.js`), and one has four (`TrackEditor.jsx`). Every multi-file case is a deliberate
split by concern, not a duplicate. **98 test files have no same-named sibling** — they are named for
a behaviour, not a module, which is where genuine overlap would hide.

**Doubly-pinned values.** Cross-referencing every `key: <literal>,` pair in
`client/src/modules/storage/defaults.js` (230 such pairs) against every assertion line in the 310
test files:

- **Strict** (key unique in `defaults.js`, name at least 8 chars, key and its exact value on the same
  assertion line): **43 keys, 61 assertion lines, 16 test files.**
- **Loose** (any key name, including short generics): 54 keys across 21 files.

The keys involved are camera and race-plan timing and geometry keys — each a shipped value stated in
`defaults.js` and restated as a literal in a test. The values themselves are deliberately not
reproduced here; `defaults.js` is their one home, and `check-config-claims` scans `reports/`.

**This is the census's sharpest finding about the project's own rules.** `check-config-claims.mjs`
exists precisely because a number in a sentence has no owner, and it fails the build when a *document*
states a config value. **It says nothing about a test doing the same thing.** There are 61 such
restatements. Some are legitimate contract tests ("the shipped default IS this"); the guard cannot
tell those from the others, because it never looks.

**Fingerprints: a clean zero.** All 7 hash values in `docs/fingerprints.json` were grepped across
every `.js/.jsx/.mjs` in `client/`, `server/` and `scripts/`. **Not one appears anywhere outside the
record.** No test pins a fingerprint. The one-home rule holds completely there, and that is worth
knowing as a contrast with the 61 config restatements.

**Tests with no assertion at all.** The AST pass flagged 6. Reading all six: **five are false
positives** — four in `scripts/sim/observers/physics-tax.test.mjs` (the local `near()` helper that
wraps `assert`) and one in `client/src/contexts/AuthContext.test.jsx`
(`await screen.findByText('no-user')`, which throws on absence and is a real assertion in
Testing-Library idiom).

**One is genuine:** `client/e2e/quicktest-vs-harness.spec.js` — a test that navigates, reads
`sessionStorage.activeRace`, builds a dump object and stops. It can only fail by throwing. It costs
16 s and is in the suite nothing runs.

### ESTIMATED — labelled as such

- **ESTIMATE: 35.3% is a hard upper bound on "assertion call-sites that add nothing", and the true
  figure is far below it.** A parameterised route test repeating a status-code assertion against a
  different route asserts something new every time. The bound is real as a bound; it is not a finding.
- **ESTIMATE: a defensible lower bound for genuinely redundant assertion lines is 150–350**, drawn
  from the two clusters where the *same shape* is applied to the *same subject*: the 167 React
  error-boundary shell lines across 16 files (each file re-proving the shell renders before proving
  its own thing), and the subset of the 336 bare status-code lines that sit in the same describe block
  as a body assertion that already implies the status. **All 503 lines were not read**, so the split
  between "same subject" and "different subject" inside them is inferred from the file/shape
  distribution, not counted. Reading them by hand would narrow this to a count in perhaps two hours.
- **ESTIMATE: the number of tests that assert something *no other test* asserts is somewhere between
  45% and 85% of the 5,583, and this census cannot narrow it.** The bottom of the range assumes every
  same-shape assertion on a highly-imported module (`defaults.js` 33 files, `racer-types/index.js`
  31) is covered elsewhere; the top assumes near-perfect 1:1 module ownership, which the
  200-of-205 single-sibling figure genuinely supports. **A 40-point range is not an answer.** What
  would collapse it: Stryker (or equivalent) over `client/src/modules/` alone, with the four `parity/`
  files excluded for cost — one overnight run would replace this whole paragraph with a number.
- **ESTIMATE, and the most actionable one: on the order of 60% of the client suite's 170 s wall clock
  is per-file jsdom environment creation, not test execution.** Derived from the `environment 376.41s`
  line against a 170 s wall at four workers, corroborated by 127 s of measured no-file-in-flight gaps.
  The uncertainty is in how the environment figure attributes concurrent work. **What would settle it:
  one run with `environment: 'node'` forced on the ~120 non-React test files.** If the estate is to
  get cheaper, that is where the money is — not in deleting tests.

---

## Broken, and deliberately NOT fixed

1. **`client/e2e/garden-path-finishes.spec.js:31` FAILS.** It asserts the measured duration exceeds a
   harness ceiling and received a value far below it. The spec was added 2026-08-25 (`bb58055b`,
   GARDEN-PATH-NO-FINISH-1) to document that garden-path over-ran that ceiling. On the *same day*,
   `d73ec6a9` (GARDEN-PATH-DEFAULTS-1) changed garden-path's default racer and lap count, which is why
   the race is now far shorter. The test's premise was deleted by a fix and the test was never
   retired. **It fails on master too** — `d73ec6a9` is an ancestor of `master`, the spec is untouched
   since `bb58055b`, and the census branch's only shipped-behaviour delta is two camera keys
   defaulting OFF. Not verified by running master, because a branch switch was forbidden; verified by
   history instead. **Nothing noticed for a week because no invoker runs this suite.**
2. **`client/e2e/d9-smoke.spec.js:145` TIMED OUT** at 30 s. Consistent with the known 2-in-5 e2e flake
   rate. Not investigated.
3. **`client/e2e/quicktest-vs-harness.spec.js` contains a test that asserts nothing** — a 16-second
   diagnostic dump that can only fail by throwing. Left in place.
4. **`server/test/suiteShape.mjs` only discovers `*.test.js`.** Because `server/vitest.config.js`
   builds *explicit* `include` arrays from it, a `.test.mjs` or `.test.jsx` added anywhere under
   `server/` would be invisible to both the shape module and Vitest, and **nothing would say so** —
   the module's own `throw` only fires when the list is *empty*. Zero such files exist today. This is
   the WIRE-SUITES-1 defect shape, one extension away.
5. **`client/vitest.config.js`'s `exclude` list replaces Vitest's default.** `client/dist/**` is
   therefore no longer excluded (the directory exists), and the un-globbed `node_modules/**` matches
   only the top level, not a nested one. No test files sit in either today. Latent.
6. **`client/vitest.config.js` states the worker bound's cost as a before/after pair. Measured
   tonight the suite is far faster than the "after" figure.** The comment was not touched, the arms
   were not re-measured, and nothing was re-minted — the number may have been taken with coverage on,
   or on a different tree. Flagged only.
7. **`docs/NIGHT-RUN.md` states the e2e suite costs about ten minutes and roughly five times the
   per-push CI run. Measured tonight: 254 s (4.2 min).** Not corrected.
8. **`docs/SHIP-CEREMONY.md`'s generated guard-cost table was measured 2026-08-11 on commit
   `b1a3bb1b`**, and the document itself says nothing runs its staleness check. Not regenerated.
9. **Four guards have no liveness test**: `scripts/check-doc-links.mjs`,
   `scripts/check-ending-frame.mjs`, `scripts/check-runin-frame.mjs`, `scripts/camera-fingerprint.mjs`.
   Every other `check-*.mjs` has a sibling `*.test.mjs`.
10. **61 test assertions restate a `defaults.js` value as a literal** (item above). No guard covers
    this direction. Not changed.

---

## Limits

This census counts **what exists and what runs**. It does not and cannot say whether the tests are
*good*. Four things bound it.

**First, and largest: no mutation testing.** Part B's redundancy figures are shape analysis. A 350x
repeated status-code assertion may be 350 genuinely distinct facts about 350 distinct routes; this
method cannot tell, and has not pretended otherwise. Every overlap number in Part B is labelled
MEASURED (a count of text) or ESTIMATE (an inference from that count), never a coverage or mutation
figure.

**Second, one measurement, one machine, one night.** Every wall clock is a single run on a 14-core
Windows box with the suites run strictly one at a time. There is no variance figure. The client suite
alone gave 170 s and 217 s in two runs differing only by reporter — a 28% spread — which is itself
the reason to distrust any single number here to better than ±25%. Three other agents were working in
this same tree concurrently; they did no suite runs, but incidental I/O contention cannot be ruled
out. A brief single-core AST pass overlapped the Playwright run.

**Third, static counting under-reports assertions and over-reports duplication.** Helper-wrapped
assertions count as zero, so ~10,137 is a floor. Conversely, normalising every literal makes two
assertions about genuinely different values look identical, so the 35.3% shape-repeat figure is a
ceiling. The truth about assertion redundancy is inside those two bounds and this method cannot
narrow it further.

**Fourth, the never-runs analysis proves absence for *today's* tree only.** Every file's runner import
was checked and every glob diffed against disk and against what each runner reported. That establishes
that nothing is currently selected-but-inert. It does not establish that nothing ever was — the search
for the two Vitest-under-`node --test` files the brief expected could not reproduce them, which is a
failure to confirm, not a disproof. And it says nothing about the *routed* dimension: a file can run
in CI and still never run on the branch where it mattered, because `verify` selects suites by changed
directory. The one hole that analysis did find is not subtle and needs no more measurement: **ten
files, 106 tests, six of them four months old, behind a switch nobody flips.**
