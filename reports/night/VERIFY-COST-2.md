# VERIFY-COST-2 — cut the overhead, not the coverage

**Branch** `feat/verify-cost-2` off `feat/start-board-1` · 2026-08-08 · **measured, built, measured
again — NOT merged**

> The name is **-2** because `VERIFY-COST-1` already exists (`0c98a32c`, 2026-08-05 — it made the
> world fingerprint run its ten tracks in parallel). Reusing the name would have put two different
> blocks under one label in the git log.

---

## 1. The before/after table — one tree, two runs, `--no-format` both times

| guard | BEFORE | AFTER | change |
| --- | ---: | ---: | --- |
| client-suite *(ran alone)* | 275.6 s | **239.8 s** | −35.8 s |
| world-fingerprint | 229.3 s | 177.9 s | −51.4 s · **noise, see below** |
| camera-fingerprint | 168.8 s | 146.5 s | noise |
| render-fingerprint | 160.2 s | 141.8 s | noise |
| script-suite | 37.0 s | 63.6 s | +26.6 s · noise + 15 new tests |
| fingerprint-containment | 29.7 s | 38.8 s | noise |
| doc-guards | 15.2 s | 32.8 s | noise |
| **`npm run verify` wall clock** | **504.9 s** | **417.8 s** | **−87.1 s (−17%)** |

**Only two of those rows are attributable.** The guards run concurrently, so every per-guard time
moves with whatever else is running; the world fingerprint's 51 s "saving" is contention, not this
work. The honest attributable numbers are measured in isolation:

| measured alone | BEFORE | AFTER |
| --- | ---: | ---: |
| client suite, standalone | 260.9 s (186 files, 3738 tests) | **196.3 s** (189 files, 3739 tests) |
| the golden parity group | 67.6 s (1 file) | **39.5 s** (4 files) |
| world fingerprint `--cheap` | — (did not exist) | **17.8 s** vs 229.3 s |
| camera fingerprint `--cheap` | — | **2.5 s** vs 168.8 s |
| render fingerprint `--cheap` | — | **2.9 s** vs 160.2 s |

**Fingerprints: none moved.** render `ffe568e27991c297`, camera `220d84db279db268`, world
`dc4647be0f55ebdb` — identical in both runs. `engine-reach --check` on the actual 14-path diff:
`none of 14 path(s) can reach the race engine`.

### 1b. The ten slowest test files in the client suite (measured, not remembered)

| BEFORE | | AFTER | |
| ---: | --- | ---: | --- |
| 244.9 s | `parity/goldenEquality.test.js` | 179.6 s | `parity/goldenRealArm.test.js` |
| 66.2 s | `parity/replay.test.js` | 61.0 s | `parity/goldenNegative.test.js` |
| 27.0 s | `sim-fairness.test.js` | 56.0 s | `parity/goldenEquality.test.js` |
| 26.3 s | `SetupScreen.test.jsx` | 45.3 s | `parity/replay.test.js` |
| 19.7 s | `RaceTuningSection.test.jsx` | 21.2 s | `sim-fairness.test.js` |
| 16.3 s | `SurfaceClassManager.test.jsx` | 19.3 s | `buildIdentityReason.test.js` |
| 14.9 s | `TrackManager.test.jsx` | | |
| 12.9 s | `buildIdentityReason.test.js` | | |
| 11.0 s | `RacerEditModal.test.jsx` | | |
| 9.6 s | `TrackEditor.loadmode.test.jsx` | | |

---

## 2. The finding that reframed the block

**`goldenEquality.test.js` takes 67.6 s alone and 244.9 s inside the suite.** It is not slow — it is
**starved**. Vitest parallelises across FILES; one file is one worker; so sixty-five seconds of
CPU-bound race simulation queued behind itself on one core while thirteen other workers had the
machine. The floor is measurable too: the suite **without** that file is 158.2 s, so the file was
adding 102.7 s of wall clock to do 67.6 s of work.

That is the answer to (d), and it is not the answer the question expected: the ~25 golden races were
already running in one process, sequentially, and **`it.concurrent` would have bought nothing** —
they are synchronous CPU-bound functions, and vitest's concurrency is promise interleaving, which
does not parallelise synchronous work. The lever is the FILE, because the file is the unit of
parallelism.

**Split into four, the same fifteen tests take 39.5 s together.** Byte-identical results: the hashes
the tests assert are the same hashes, because each `it` builds its own identity and calls pure arms —
there is no module-level mutable state to share, and the four files run in separate workers, so they
could not share it even if there were.

---

## 3. What I cut, and why each cost nothing in safety

**3.1 — The golden file became four files.** `goldenEquality` (the derivation arms) ·
`goldenRealArm` (raceCore vs sim) · `goldenNegative` (both negative controls) · `goldenCoverage`
(the millisecond structural assertions). **Nothing was removed**: same cases, same assertions, same
negative controls, and one test ADDED. The case list moved to `goldenCases.js` — one home — so four
files cannot drift into running different races, and `goldenCoverage.test.js` asserts the union and
the census (4 derivation, 3 real-arm, 3 spread) rather than trusting it. A case commented out during
a debugging session and not restored now turns a test red.

**3.2 — `--cheap` on the three fingerprint scripts.** One track. It is the answer to the specific
waste in the log: five render runs at ~115 s, most of them to look at a printed summary line that
read `undefined+16 frames`. That check now costs 2.9 s.

It runs **one track with every sample point**, not fewer sample points on all ten — the opposite
trade would stop exercising the thing being checked, which is the only reason to run it.

**A cheap hash must be unable to impersonate a fingerprint**, and three things enforce that: it is
prefixed `CHEAP-` so it can never match the 16-hex shape the record and the containment guard
expect; the banner prints before AND after the work, because the line you are looking at may scroll
the first one away; and **`--cheap --quiet` refuses to run** — quiet prints a bare hash and nothing
else, which is exactly what a script would capture.

**3.3 — The world fingerprint no longer runs for a comment.** `engine-reach --check` and verify's
routing now ask whether a hull file's edit is comments and whitespace ONLY. See §5 for the mechanism
and its proof. Measured on tonight's actual case: `defaults.js` against the previous commit is
reported `INERT — same tokens, same line breaks between them — comments only`, and the world
fingerprint is not selected.

**The honest caveat, because it changes the size of the claim:** against `master` the same file is
NOT inert on this chain — an earlier block (LABEL-OFFSET-1) added `nameTagMarginPx: 6` to it, and
`verify` diffs against master by default. So this rule would **not** have saved the START-BOARD-1 run
it was inspired by. It saves the `--base=HEAD` case, and it saves any branch whose only hull touch is
prose. I would rather state that than quote a saving I cannot demonstrate.

---

## 4. What I deliberately kept, and I agree with every item on the list

- **The golden equality coverage.** It is the only guard on browser-versus-sim identity and its time
  is real races. Every case survives; §3.1.
- **Every fingerprint when the diff carries a real behaviour change.** Cheap mode is opt-in and
  cannot produce a value anything will accept; the inert rule refuses in every uncertain case.
- **The sabotage and consequence discipline.** The new predicate is tested from the unsafe side
  (§5), and the routing rule is tested in both directions.
- **Anything whose absence could hide a defect.** Nothing in this block removes a check. The two
  savings are (a) the same work spread over more workers and (b) work that was provably about
  nothing.
- **`client-suite` runs ALONE, and it should.** §6.

---

## 5. The inert rule — mechanical, and it caught itself

**The test.** Two versions are the same code iff they produce the identical TOKEN SEQUENCE — each
token's kind and its **raw source text** — and the same pattern of **line breaks between adjacent
tokens**. Comments and whitespace are not tokens, so that is exactly "differs only in comments and
whitespace". The line-break half closes automatic semicolon insertion, the one way whitespace changes
meaning: `return\n x` is not `return x`, and the rule reports it as a code change.

It uses **acorn** — already in `client/node_modules` via eslint — rather than a regex that strips
comment-looking text, because a hand-written stripper has to decide whether `/` starts a regex or is
a division, and getting that wrong in the unsafe direction silently skips a guard.

**Every uncertainty resolves to "run the guard":** no tokenizer (CI's guard job does not install the
client tree), a parse error, a non-JavaScript file, an added or deleted file, or a changed DIRECTIVE
comment. The worst case is exactly today's behaviour.

**The exceptions, named as asked.** Comments that a tool READS: `/*#__PURE__*/` and
`@__NO_SIDE_EFFECTS__` (bundler tree-shaking), `@vite-ignore` and `webpackChunkName` (bundler
dynamic-import analysis), `@vitest-environment` (which environment a TEST file runs in),
`eslint-disable*`, `@ts-*`, `c8/istanbul ignore`, `sourceMappingURL`. All are refused.

**Proof that no build step reads comments on the path this gates.**
`scripts/fingerprint-default.mjs` spawns `node scripts/sim-fairness.mjs`, which imports
`client/src/modules/raceCore.js` through plain ESM. There is no bundler, no transform, no lint pass
and no coverage instrumentation anywhere on that path — the number is produced by Node executing the
source. A comment cannot reach it even in principle. The directive list is belt to that braces, kept
so the predicate stays true if it is ever pointed at a build-facing guard.

**It caught a false positive in its own first run, and that is the part worth reading.** The
signature originally used acorn's token VALUES. Acorn represents a regex token's value as an
**object**, so `String(value)` was `"[object Object]"` for every regex — and `/a\/\/b/` compared
**equal** to `/a\/\/c/`. A genuine code change inside any regex literal would have been called inert:
the one direction this predicate must never fail in. The fix is to use each token's raw source slice,
which cannot have that class of bug. The trap test was written before the implementation was trusted,
which is why it was found in a unit test and not in a wrong hash six weeks from now.

---

## 6. (c) Why `client-suite` runs alone — deliberate, and I am leaving it

**Deliberate, documented, and measured before I got here.** `verify.mjs` marks it `exclusive` with
the reason in the code: *"run beside the fingerprints the suite FAILS — sim-fairness.test.js carries
a 5 s timeout and four CPU-saturating siblings push it past it."*

It interacts with a second decision that makes overlapping strictly worse: **`retry: 0`**, taken by
the owner in ONE-TRUTH-2 after measuring 113 attempt-failures across 20 full runs, **every one of
them a timeout and not one an assertion**. With no retries, a timeout under contention is a red
suite, not a slow one. Overlapping the client suite with three CPU-bound fingerprint runs would
reintroduce exactly the flake class that policy exists to expose.

So: leaving it, and I agree with it. What this block does instead is make the exclusive block
**shorter** — 275.6 s → 239.8 s — which is the same saving with none of the risk.

---

## 7. (f) What the second verify run selected, and why it is not a routing defect

It selected **everything**, and the routing was right to. `verify` computes its diff as
*committed-on-this-branch* ∪ *uncommitted*, against `master`. A report-only commit adds a file to
that set; it removes nothing. The branch still carried every source change it had before, so every
guard those changes route to was still selected. The rule is documented in the file and is the one
you want — a block measures before it commits, and the branch's earlier commits are part of what it
is shipping.

**The waste is not the routing. It is that `verify` has no memory.** Nothing relevant had changed
since the previous green run, and it redid 466 s of work to reach the same three hashes. That is a
cache-shaped hole, not a matcher-shaped one, and it is proposal 9.1.

---

## 8. Hygiene

**Lines.** `goldenEquality.test.js` 241 → 70 (its content moved, not deleted). New:
`goldenCases.js` 76, `goldenRealArm.test.js` 75, `goldenNegative.test.js` 56,
`goldenCoverage.test.js` 77, `inertChange.mjs` 189, `inertChange.test.mjs` 116, `cheapMode.mjs` 76.
`engine-reach.mjs` +48, `verify.mjs` +26, `verify.test.mjs` +30, the three fingerprint scripts +8 to
+14 each.

**Removed, because this change orphaned it:** nothing was orphaned. The golden file's contents moved
rather than went; `RACE_TIMEOUT_MS`, the `order()` helper and the `WINNERS` map all moved into
`goldenCases.js` (as `finishOrder` and `REAL_ARM_WINNERS`) and have one home instead of being
re-declared per file.

**Moved out:** the golden case list, from a test file into `goldenCases.js`, because four files
share it.

**Noticed and deliberately left:**

- **`goldenRealArm.test.js` is now the tail at 179.6 s** for ~36 s of work. Splitting its three
  seeds again would take the client suite toward its 158 s floor. I stopped: each measurement costs
  ~200 s, the remaining prize is ~35 s, and I would rather propose it (§9.2) than keep grinding.
- **`environment 1536 s` cumulative jsdom setup across 189 files** — roughly 8 s per file, and the
  largest single cost in the suite. Most parity and module tests need no DOM. Untouched because it
  is a change to ~150 files and belongs in its own block.
- **The three fingerprint scripts each parse their own args.** `--cheap` had to be added three
  times, and `fingerprint-default.mjs` needed a special case because argv[2] is a LABEL there.
- **`FINGERPRINT_RECORD` in `verify.mjs`** is used by one matcher; unrelated to this block.
- **This branch will conflict with `feat/verify-routing-1`**, which replaces the route table with
  per-guard declarations. Both touch `plan()`. The inert rule is written as a small seam
  (`splitInert` + an injectable splitter) precisely so it can be lifted into the declaration model
  as one guard's dependency filter rather than re-derived.

---

## 9. Two proposals of my own

**9.1 — `verify` should remember its last green run.** §7: a report-only commit cost 466 s to
re-derive three hashes that could not have changed. A cache keyed on the **content hash of the union
of every file each guard declares it depends on** would make a repeat run print the previous result
and say how old it is. The safety argument has to be exact, which is why I am proposing rather than
building it: the key must include the guard's own source (its closure), the tool versions, and the
routed files' contents — miss any of those and it caches a lie. The cheap version that is
obviously safe: cache only when the diff is **byte-identical** to the last green run's diff, and
print `CACHED (n minutes ago)` beside the result. That alone would have removed one of tonight's two
fourteen-minute runs.

**9.2 — Split `goldenRealArm` and consider a `node` environment for the parity files.** The tail is
now one file holding three 9-second races; three files would take the suite to roughly its measured
158 s floor. Separately, `environment: 'jsdom'` is global and costs ~8 s per file cumulatively; the
parity and module tests do not touch the DOM. `// @vitest-environment node` on the heavy pure-logic
files is a one-line-per-file change with a measurable win and no coverage implication. Both are
mechanical; neither is a judgement call about what to run.

---

## 10. THE OWNER'S DECISION — the routine subset, argued and NOT built

The spec asks me to propose splitting the golden set into a routine subset and a full set before
minting, with the argument for why a divergence could not hide in the subset. **I can make the
argument for the structure but not for the safety, and the honest answer is that I would not do it.**

**What the numbers say.** The golden group is now 39.5 s of the 196.3 s suite and it is no longer
the binding constraint. A routine subset of, say, the four derivation cases plus one real-arm seed
would save perhaps 20 s per run. That is 5% of a verify.

**Why the argument for safety cannot be made cleanly.** Every divergence this guard has ever caught
was found by a SPECIFIC case: D-GRID by the start grid, D-STREAM by the seed stream, D-DUR by the
duration model, D-ROWCOUNT by *dolphin on searound at n=40* — a case that exists precisely because
the small sprite makes RaceScreen's inline `rowCount` disagree with `computeRacerLayout`. Not one of
those was found by a representative case standing in for others; each was found by the one case that
touched the thing. A subset is only safe if the cases it drops are redundant, and the history says
they are not redundant — they were added one at a time, each for a divergence the existing set had
missed.

**What I would do instead, if the time ever becomes binding again:** keep the full set on every run
and put the SOAK (300+) behind the mint, which is roughly where it already sits. The routine set is
ten races. Ten races is not what is costing him fourteen minutes.

---

## 11. What I did NOT do, and why

- **Did not implement the routine/full split.** §10 — it is his decision, and I would argue against
  it.
- **Did not overlap the client suite.** §6 — deliberate, and `retry: 0` makes overlapping a flake
  generator.
- **Did not build the result cache.** §9.1 — the safe key is the whole design and it deserves its
  own block.
- **Did not touch the jsdom environment.** §8 — ~150 files, its own block.
- **Did not split `goldenRealArm` further.** §8 — diminishing returns against measurement cost.
- **Did not mint, did not merge.** No fingerprint moved; there is nothing to mint.

---

## 12. On my own working habits, since they were named

The spec put shell-scripted text surgery at 10–15% of turns and asked me to use the file-edit tools.
**I did it again in this very block**: a `node -e` rewrite of `inertChange.mjs` mangled the file —
bash ate the backticks and template placeholders inside my replacement string, leaving comments with
holes in them and a corrupted duplicate header — and I had to rewrite the file with `Write`. It cost
two turns and produced a broken intermediate state. The measurable version of the lesson: every edit
in this block that used `Write` or `Edit` landed first time; two of the four that used `node -e`
did not.
