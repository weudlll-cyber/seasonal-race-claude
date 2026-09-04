# CLOSE-AUDIT-CHAIN-1 — the client suite is not slower, and the tree the audit could not see

**Date:** 2026-09-04 · **Branch:** `diag/suite-timing` off master `e2138a86`
**Pieces 5 and 6 of the CLOSE-WHAT-THE-AUDIT-FOUND chain. READ-ONLY: nothing in the product was
touched by either piece.** Pieces 1–4 changed code and their records are their commit messages and
[docs/MORNING.md](../../docs/MORNING.md); this report exists for the two pieces whose whole output is
a measurement, because a table does not belong in a commit message.

---

## HEADLINE

| question | answer |
| --- | --- |
| Is the client-suite regression real? | **NO.** Six interleaved runs; the arms overlap completely. |
| Do the two published figures reproduce? | **NEITHER DOES.** 286 s is above every run of today's tree; 170 s is below every run of the census's own tree. |
| Dead exports outside `client/` — the audit's third limit | **42** unconsumed named exports: 37 in `scripts/`, 5 in `server/`, 0 in `shared/`. |
| Can prose claims be given a denominator? | **Not by counting.** Only by converting claims to a checkable form — the denominator then measures adoption. |
| What would a fuller mutation sample cost? | ~4 h of machine time for 1%, ~18 h for 5%, with no new dependency. |

---

## 1. ★ PIECE 5 — THE REGRESSION IS NOT REAL

### What was actually being compared

The verdict reads *"286 s against the census's 170 s"*. The two numbers are from
**2026-09-04** (the audit) and **2026-09-01/02** (`CENSUS-TESTS-1`, measured on `feat/aim-levers-1`,
branch point **`ed627ae7`**). **That is two days apart, not three weeks** — the "three weeks" in the
old morning sheet belonged to the *previous* audit and had drifted onto this comparison.

The two trees share a **byte-identical `client/package-lock.json`, `client/package.json` and
`client/vitest.config.js`**. So `node_modules` is valid for both, and `maxWorkers: 4` is the same
number in both arms. A configuration change was never a candidate.

### Method

**A/B INTERLEAVED, three rounds, alternating.** The machine could not be made quiet — the owner's
browser was open and closing it is not mine to do — and interleaving is what handles that: drift in
background load lands on both arms in the same proportion, which three A runs followed by three B
runs would not survive. This is the shape `GATE-SERIAL-BCRYPT-1` used for the merge-gate margins.

- **A** = `master` (239 client test files, 4,467 tests)
- **B** = `ed627ae7`, the census tree (229 files, 4,319 tests)

### The runs

| run | tree | wall clock | test files | tests |
| --- | --- | ---: | ---: | ---: |
| A1 | master | **228.3 s** | 239 | 4,467 |
| B1 | census | **214.8 s** | 229 | 4,319 |
| A2 | master | **227.7 s** | 239 | 4,467 |
| B2 | census | **272.8 s** | 229 | 4,319 |
| A3 | master | **258.8 s** | 239 | 4,467 |
| B3 | census | **222.9 s** | 229 | 4,319 |

All six passed; no failures in either arm.

|  | min | median | mean | max | spread within the arm |
| --- | ---: | ---: | ---: | ---: | ---: |
| **A** master | 227.7 s | 228.3 s | 238.3 s | 258.8 s | **13.6%** |
| **B** census | 214.8 s | 222.9 s | 236.8 s | 272.8 s | **27.0%** |

**A − B: +12.9 s on minima (+6.0%), +5.3 s on medians (+2.4%), +1.4 s on means (+0.6%).**

★ **The single fact that settles it: B's slowest run (272.8 s) is slower than every A run.** The
arms are not separable. The noise within one arm reaches **58 s**; the difference between the arms is
at most **12.9 s**.

### Neither published figure reproduces

- The audit's **286 s** is **above every one of my three master runs** (max 258.8 s).
- The census's **170 s** is **far below every one of my three census-tree runs** (min 214.8 s).

Each was a single run under uncontrolled load. **The +68% was the difference between two noise
samples, not between two trees.** This closes the one axis the verdict left open.

### And the small real difference is exactly the tests that were added

The wall clock is waiting on **jsdom, per FILE** — the census established this and it still holds:

| | jsdom worker-seconds | per file | test-body worker-seconds | per test |
| --- | ---: | ---: | ---: | ---: |
| A master, fastest run | 467.6 s | **1.96 s/file** | 219.0 s | 49.0 ms |
| B census, fastest run | 440.2 s | **1.92 s/file** | 200.5 s | 46.4 ms |

**The per-file cost is unchanged.** The ten added files cost **27.3 s of worker time**, which over
`maxWorkers: 4` predicts **~6.8 s of wall clock**. Measured difference on minima: 12.9 s, inside the
noise. Files went **+4.4%**, tests **+3.4%**, wall clock **+0.6% to +6.0%** depending on the
estimator.

**The ten files, and there is nothing wrong with any of them** — they are the blocks that shipped on
2026-09-02 to 09-04:

`camera/aimRoomWiring` · `camera/companyHeadcount` · `configPerKeyReject` ·
`storage/configValidate` · `RaceScreen/drawing/boardPortraitFit` · `RacerEditor/canvasUtils.bodyRule`
· `SetupScreen/PlayerGroupPicker` · `SetupScreen/chipContrast` · `SetupScreen/playerGroups` ·
`SetupScreen/quickTestCap`

**`maxWorkers` was not touched.** That bound was measured and accepted; this piece explains the
number and does not change it. If the suite ever does need to get faster, the lever this measurement
points at is **files, not workers**: ~1.96 s of jsdom per file, before a single assertion runs.

---

## 2. PIECE 6 — WHAT THE AUDIT COULD NOT SEE

### 2a. The third limit is CLOSED — dead exports across the rest of the tree

The audit measured dead exports in `client/` only, leaving ~240 of 479 source files unmeasured.

**Not with knip.** `KNIP-CONFIG-1` measured why: knip is scoped to a workspace and cannot see
consumers outside it, so **11 of its 37 `client/` findings were alive**, imported by `scripts/`. A
tool that cannot see half the tree cannot answer a question about the tree. The method here is one
acorn pass for the exports and a mention scan for the consumers, applied to **every** tree so the
figures are comparable rather than merely adjacent.

**THE CONTROL RAN FIRST, and its first version was wrong** — worth recording, because it is the same
failure shape twice in one day. The first pass counted a mention in **any** tracked file, and two of
its three controls passed because the symbol appeared in `docs/`. **A doc mention is not a consumer**,
and a control that passes for the wrong reason is not a control. Corrected: consumers must be code
(`.js/.jsx/.mjs/.ts/.tsx/.html`, `reports/` excluded), doc mentions reported alongside. Five controls,
five found, each in the file that actually imports it.

| tree | source files | named exports | **consumed nowhere in code** | |
| --- | ---: | ---: | ---: | --- |
| `scripts/` | 197 (196 parsed, 1 JSX) | 221 | **37** | 16.7% |
| `server/` | 37 | 85 | **5** | 5.9% |
| `shared/` | 1 | 4 | **0** | — |
| `client/` non-JSX | 202 (197 parsed, 5 JSX) | 647 | **1** | 0.2% |

**42 in the previously unmeasured trees, against 1 left in `client/`** — and `client/`'s 1 is only
that low because `DEAD-LINES-1` narrowed 18 of them hours earlier. The survivor is
`autoSpriteScale.js :: pruneStoredAutoScaleConfig`, a sibling of that exact family that **knip never
reported**, which is one more mark against the tool.

**Where `scripts/`'s 37 sit** — they are not scattered, they are two families:

| directory | count | shape |
| --- | ---: | --- |
| `scripts/sim/observers/` | **15** | helper functions and threshold constants exported for symmetry across a family of observers, each consumed only by its own file |
| `scripts/lib/` | **11** | internals of `dataReach`, `routing`, `inertChange`, `racerFacts` — `declaredPathProblems`, `SUITE_GUARDS`, `declarationOf` and the like, all used at home |
| `scripts/` top level | 6 | |
| `scripts/diag/` | 3 | one-off diagnostics |
| `scripts/parity/` | 2 | |

**`server/`'s 5 in full:** `seedDelivery.js :: _resetDeliveryForTests`, `staticClient.js ::
API_PREFIX` and `:: CLIENT_DIST`, `test/suiteShape.mjs :: SERVER_ROOT` and `:: BCRYPT_DOORS`.

★ **NOT ACTED ON, and the reason is the lesson from `DEAD-LINES-1` four hours earlier**: two of
`client/`'s candidates — `readBuildInfo` and `gitIdentityPaths` — are reached through a **string**
that a test generates and runs in a child process, which no import parser and no mention scan of the
*declaring* file can see. **Every one of these 42 needs that check individually before it is
touched.** The number is a measurement, not a work list; `_resetDeliveryForTests` in particular
announces in its own name that something is meant to call it, and *why nothing does* is the
interesting question, not the export keyword.

For scale against the last tree-wide count: `DEAD-CODE-VERIFIED-1` (2026-08-23) found **54
unreferenced** exports across the whole tree by a different method. 42 today, after two cleanups, is
the same order and not a contradiction.

### 2b. What it would COST to close the other two — PROPOSAL ONLY

#### Prose claims have no denominator

**They cannot be given one by counting, and that is a property of prose rather than a gap in the
tooling.** A denominator needs an enumerable population, and there is no mechanical test for "this
sentence asserts something about the system". Two routes exist and only one is honest:

- **An LLM pass over the 61 living documents.** Cheap in machine time — an hour or two — and it
  produces a confident number with **no error bar and no reproducibility**: run it twice and the
  population changes. That is the shape this repository deletes on sight, and it is exactly what
  `KNIP-CONFIG-1` refused this morning.
- ★ **Convert claims into a checkable form, and let the denominator measure ADOPTION.** This project
  has already done it once: `check-doc-facts` RULE F can only see the **arrow** citation form, so its
  count is explicitly a count of *citations that opted in*, and the blind spot shrinks as citations
  convert. **Cost: zero machine time, and no project — each block converts the claims it touches.**
  It never reaches 100% and is not supposed to.

**Recommendation: the second, and stop describing the first as available.** The honest headline stays
"2,789 mechanical claims checked, 2 false", with prose named as out of reach rather than estimated.

#### The mutation sample is 17, about 0.3%

Cost is dominated by the suite a mutation selects. Measured today, on this machine:

| suite | wall clock |
| --- | ---: |
| client (`vitest`) | **~228 s** (min of six runs) |
| script (`node --test`) | ~126 s |
| server (`vitest`) | ~40 s |
| whole `verify`, parallel | ~410 s (sequential ~966 s) |

**Option A — a scripted sample, no new dependency.** Apply, run the one selecting suite, revert.
Targeting `client/src` at ~228 s each:

| sample | mutations | machine time, serial |
| --- | ---: | ---: |
| 1% | 57 | **~3.6 h** |
| 5% | 285 | **~18 h** |
| 10% | 570 | **~36 h** |

One overnight run buys 1–2%. Cheaper per mutation if aimed at `scripts/` (126 s) or `server/` (40 s),
but those are not where the picture lives.

**Option B — Stryker.** Runs only the tests covering the mutated line, which is one to two orders of
magnitude cheaper per mutant: a full `client/` run plausibly 2–4 h rather than 36. **Cost: a day of
setup, a new dependency, and a config file that must be kept honest** — and this repository spent
today deleting a config file for a tool nobody ran. It should not acquire another one without
somebody committed to reading its output.

★ **The cost that is not machine time, and it is the one that matters.** The audit's own record is
that **three of its first five "holes" were harness errors** — two badly chosen scopes and one
mutation with no semantic content. A larger sample multiplies that risk linearly unless every miss is
put through the rule the audit itself derived: *a miss is a finding only once the mutation is shown
to have changed behaviour AND the scope is shown to contain the test that should care.* That check is
human time and it does not parallelise. **A 570-mutation run nobody audits is a worse number than 17
that were.**

**Recommendation: Option A at 1%, once, overnight, if you want a second reading of the 12% escape
rate — and not otherwise.** The existing sample already found the two things worth finding, and one
of them (`closureOf`) turned out to be [held after all](../../scripts/verify.test.mjs).

---

## 3. WHAT THESE TWO PIECES DO NOT COVER

- **The suite measurement is one machine, one day, six runs.** It is enough to show the arms overlap;
  it is not a performance baseline, and a 6% difference could not be resolved by it. `phys-bench`
  cannot resolve under 15% here either, and this is the same wall.
- **The export census counts NAMED exports only.** `export default` is a different question and is
  not in these numbers.
- **Six files could not be parsed** (5 JSX in `client/`, 1 in `scripts/`) and are excluded from the
  counts rather than assumed clean. The audit's AST pass failed on all 134 JSX files; this one fails
  on six, because JSX is not the shape of `scripts/` or `server/`.
- **"Does any test assert something no other test asserts?"** is still unmeasured. It was not in this
  chain's scope and it is the largest remaining unknown about the estate.
