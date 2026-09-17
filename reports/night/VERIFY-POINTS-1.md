# VERIFY-POINTS-1 — two of the four are already done and on master; one I could not identify and one I could not confirm

Branch `night/2026-09-18`, piece 5. Date: 2026-09-18. **Nothing was built, and nothing needed to be.**

---

## ★★ THE ONE LINE

**Points 1 and 2 are already done and merged. Point 3 I could not locate at all, and point 4 I could
not confirm to a single address.** ★ **The brief's figures for point 2 describe a proposal that was
never built, not the change that shipped** — so quoting them as the remaining cost would have been
wrong in both directions.

**No fingerprint question arises**: I changed nothing here. (The one code change made tonight is
piece 3's, and all four fingerprints were re-measured against the engine after it and matched the
record — see [DOC-DIFF-1](DOC-DIFF-1.md).)

---

## 1 · THE CLIENT BUILD INSIDE THE CHECK RUN — ★ ALREADY DONE, ON MASTER

**On master as `cae917c8`** — *"feat(CLIENT-BUILD-VERIFIED-1): nothing built the client — now verify
does, and the bundle audit is wired"*.

| | |
|---|---|
| **what it cost before** | ★ **nothing, and that was the defect.** `scripts/check-client-build.mjs:5-7` records that neither `npm run verify` nor `.github/workflows/ci.yml` built the client — *"established at source, by searching both for `vite build` and `npm run build`: zero matches in either."* |
| **what it costs now** | one vite build inside `verify`, as an **exclusive** guard (`verify.mjs:477`, `:633`) |
| ★ **what it no longer covers** | **nothing — this point ADDED coverage rather than removing it.** |

**Why it was a hole and not a gap**, in the guard's own words: *"A missing or misspelled named export
is `undefined` under the dev transform and a HARD FAILURE in a bundle."* That class broke a branch on
2026-09-07 and a person found it by hand. ★ **Lint could not stand in for it** — `client/eslint.config.js`
loads no import plugin, so no rule there resolves a module specifier.

★ **A second thing came with it**: `audit-bundle-address.mjs` now runs as **step 2 of the same guard**
rather than as its own route. That is deliberate — `verify` runs guards up to 14 at once, so a
separately-routed audit could read `client/dist` while this guard is still writing it. **Making it a
step of the guard that produces the artefact removes the race instead of papering over it.**

---

## 2 · SEPARATING THE UNIT-SUITE ENVIRONMENT — ★ ALREADY DONE, ON MASTER

**On master as `dd963859`** — *"perf(SUITE-ENV-SPLIT-1): 69 test files stop building a browser they
never use — 232 s -> 172 s"*.

| | |
|---|---|
| **what it cost before** | `environment: 'jsdom'` for everything with `isolate` defaulting to true — **one jsdom per test file**. Measured on 253 files: **environment 503.7 s against tests 211.2 s** — more than twice as long building browsers as running assertions. |
| **what it costs now** | **232 s → 172 s** wall clock. **70 files carry `// @vitest-environment node` at the tree tonight** (counted); 261 test files in total. |
| ★ **what it no longer covers** | **those 70 files no longer get a browser** — and that is the honest cost line. |

★★ **THE BRIEF'S FIGURES FOR THIS POINT ARE NOT THE ONES THAT SHIPPED.** The brief says *"137 files
with no browser, 176 → 86 s, one failed"*. What landed is **69 files and 232 → 172 s**. The larger
number was a candidate set; the smaller one is what survived the membership test. **Reporting the
proposal's numbers as the current state would overstate both the saving and the exposure.**

★ **Why losing the browser on those files is safe, and it is not "they looked fine":** membership was
established **per file, in two passes that both had to agree** —

1. **STATIC and TRANSITIVE** — a file is a candidate only if neither it **nor any module it imports
   from `src/`** names a DOM object, a browser global or a library that reaches for one. *"Transitive
   is what makes it conservative — a test whose import touches localStorage stays."*
2. **EMPIRICAL** — every candidate was run in **both** environments and kept only if it produced the
   **identical number of passing AND skipped tests**. ★ *"That second count is the one that matters: a
   file going green because a global quietly vanished, or because its tests were skipped, is worse
   than a slow one."*

★ **And the default did not move.** `environment: 'jsdom'` is still the default in
`client/vitest.config.js`; a file gets a browser unless it has opted out **by a deliberate line**, so
a new test file is safe by construction.

---

## 3 · REPLACING THE NINE WARM-UP RACES — ★ I COULD NOT IDENTIFY THIS

**Stated rather than guessed at, because an unbacked absence claim counts as not checked.**

**What I searched:** `warmup` / `warm-up` across `scripts/` (hits: `phys-bench.mjs`,
`phys-bench-matrix.mjs`, `camera-replay.mjs`, `label-bench*.mjs`, `raceDriver.mjs`,
`golden/fixtures/races.json`); `9 races` / `nine races` / `WARMUP` / `warmupRaces` across
`scripts/*.mjs`; and `\bnine\b` across `scripts/check-*.mjs` and `scripts/verify.mjs`.

**What the searches return:** the only warm-up construct in the tree is
[`phys-bench.mjs:70`](../../scripts/phys-bench.mjs#L70) — `WARMUP = 300`, and
[`:121`](../../scripts/phys-bench.mjs#L121) steps `stepRacePhysics` that many times. ★ **That is 300
physics STEPS, not nine races**, and it is inside a bench the record already calls unusable at this
resolution. Every `nine` hit in the guards is unrelated prose.

★ **So I cannot say what "the nine warm-up races" names, and I am not going to attach the label to
`phys-bench`'s warm-up in order to have an answer.** One sentence naming the script settles it.

---

## 4 · THE PRODUCTION ARM FOR THE CHECK SETUP — ★ NOT CONFIRMED TO AN ADDRESS

**The closest thing in the tree** is the production-build path now inside `check-client-build.mjs`:
it writes `client/dist` (gitignored, so `verify` still writes no tracked file) and then audits that
artefact. Separately, `verify.mjs:240-241` describes a guard that *"builds the client, boots an
isolated API and preview server, opens Chromium and drives two races"* — **minutes, not seconds** —
which the owner's decision of **2026-09-05** moved to **once per branch, before the merge** rather
than per commit.

★ **Both are plausible readings of "the production arm for the check setup" and they are different
pieces of work.** I did not pick one: acting on a guess here means changing what a gate covers, and
the decision rule for this piece is to leave it and say what it would take.

**What it would take:** one sentence naming which of the two is meant. If it is the second, the work
is already the owner's decision of 2026-09-05 and is done; if it is the first, the remaining question
is whether the bundle audit should also run against a *production-mode* build rather than the default
one, which is a coverage change and therefore his call, not mine.

---

## ★ WHAT I DID NOT DO, AND WHY

**I ran no `verify` "after each", because I completed no point** — two were already done before
tonight and two I could not act on. ★ **A single `verify` run was made on this branch as it stands**,
covering the one change tonight did make (piece 3's cherry-picks); its result is recorded in the
morning sheet.

★ **I did not re-measure points 1 or 2.** Their costs above are quoted from the commits and the
config that carry them, and the file counts were re-counted at the tree tonight (**70** opted-out
files of **261**). **The timings are the record's, not a fresh measurement**, and are labelled as
such.

---

## WHAT THIS DOES NOT SETTLE

- **Points 3 and 4 are handed back unanswered**, with the searches that failed written down.
- **Whether the 70 opted-out files are still correctly classified** — the two-pass membership was
  established once, in 2026-09-08, and one file has been added to the set since (69 → 70). **I did
  not re-run the empirical pass.**
- **Nothing here measures the current `verify` wall clock.** The run made tonight was for the branch's
  correctness, not for timing, and it shared the machine with the fairness gate.
