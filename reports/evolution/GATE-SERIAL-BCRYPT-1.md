# GATE-SERIAL-BCRYPT-1 — the gate has teeth again, the suite is not slower, and the disease was oversubscription

**Date:** 2026-08-26 · **Branch:** `fix/gate-serial-bcrypt-1` (off `master`) · **Verdict:** BUILT AND
MERGED. No timeout raised, no test marked slow, no test skipped, `BCRYPT_COST` untouched.

---

## 1. THE THREE WALL CLOCKS, FIRST

Whole server suite, 673 tests, this machine, vitest's unchanged 5,000 ms default timeout. Margin is
what is left of that under the **worst per-test duration seen across every run of that arm**.

| arm | wall clock | worst test | **margin** | result |
| --- | --- | --- | --- | --- |
| **today, as master runs it** | **39.1 s** | 8,289 ms | **−3,289 ms** | **RED on 2 of 3 runs** |
| **fully serial** — what he refused | **93.4 s** | 3,649 ms | 1,351 ms | 1 of 2 green ¹ |
| **shipped: bcrypt group bounded at 3** | **37.7 s** | **3,768 ms** | **+1,232 ms** | **green 6 of 6** |

**The suite is not slower. It is fractionally faster than it is today** — 37.7 s against 39.1 s, inside
run-to-run variance — **and the margin goes from 21 ms to 1,232 ms.** The owner's speed-up is kept
whole; the cost of the repair is zero seconds, not a few.

Across those six runs at the shipped setting: **zero tests over 4 s, zero over 5 s**, 16 over 2.5 s.

¹ the fully-serial arm's second run failed 38 tests in `racers.test.js` with nothing above 3,649 ms —
**not timeouts**, on master's own config. Cause not established; out of this piece's scope and
recorded rather than dropped.

### Two arms measured and not shipped

| | wall clock | worst test | margin | |
| --- | --- | --- | --- | --- |
| bcrypt group at **1** (serialised) | 96.2 s | 3,779 ms | 1,221 ms | green — **and no cheaper than serialising the whole suite** |
| bcrypt group at **6** | 29.1 s | 4,155 ms | 845 ms | green, 8.6 s faster, **under half the margin** |

**Three is chosen because it costs nothing and buys the most.** Six is tempting and is left as a
proposal; for a file whose entire purpose is that the gate can be trusted, the conservative bound is
right.

---

## 2. (a) WHAT RUNS TOGETHER — established from the tests, not from the report

**The brief said not to carry a list over from GATE-RED-1, so none was.** Every server test file was
run **alone** with `bcrypt.hash` and `bcrypt.compare` instrumented, and the bcrypt time counted:

| file | bcrypt ms | calls |
| --- | --- | --- |
| `auth/changePassword.test.js` | 28,164 | 21h / 36c |
| `auth/usersStore.test.js` | 22,147 | 42h / 5c |
| `auth/changePasswordContract.test.js` | 15,876 | 10h / 17c |
| `auth/sessionInvalidation.test.js` | 13,764 | 18h / 12c |
| `auth/authRouter.test.js` | 13,326 | 13h / 8c |
| `auth/recoverAdmin.test.js` | 8,654 | — |
| … eight more auth files … | 703 – 5,615 | — |
| **`routes/playerGroups.test.js`** | **2,739** | 2h / 2c |
| **`routes/racers.test.js`** | **2,317** | 2h / 2c |
| **`routes/tracks.test.js`** | **2,106** | 2h / 2c |
| **`routes/brands.test.js`** | **2,090** | 2h / 2c |
| **`routes/surfaceClasses.test.js`** | **1,267** | 1h / 1c |
| `auth/csrf`, `auth/guards`, `auth/rateLimit`, `auth/session`, `auth/routePolicyDrift`, and four more | **0** | none |

**MY FIRST HYPOTHESIS WAS WRONG IN BOTH DIRECTIONS, AND MEASURING CAUGHT IT.** "The bcrypt files are
the ones under `src/auth/`" would have **missed five route tests** that reach bcrypt through the test
agent, and **needlessly bounded two auth tests** that never touch it. A directory glob is not the
group.

### THE RULE, AND WHY IT IS NOT A LIST

> **A server test file spends bcrypt time iff it imports `test/authAgent.js` or `auth/usersStore.js`.**

Those are the only two doors: `usersStore.js` owns `BCRYPT_COST` and is the only module that calls
bcrypt at all; `authAgent.js` is the only helper that drives it on every call — it mints a user (one
hash) and logs in (one compare).

**The rule agrees with the instrumented measurement on 24 of 24 files.** `server/test/suiteShape.mjs`
evaluates it at config load, so **a new test classifies itself** — import the agent and you are in the
bounded group; do not and you are not. Nothing needs editing when a file is added, moved or renamed,
which is the brief's requirement that no future test can fall off a list.

**It is already more complete than my own census.** The scan found two `server/utils/` test files my
`find src test` had missed. Both are bcrypt-free and correctly parallel.

**And it refuses rather than guesses.** If the doors are ever renamed the derivation finds nothing, and
`suiteShape` throws instead of silently declaring the suite unbounded — Lesson 187's rule applied to
the thing that would otherwise re-open this defect.

### THE DISEASE IS OVERSUBSCRIPTION, NOT FILE COUNT

bcrypt is async and runs on **libuv's threadpool — four threads per worker process**. At fourteen
workers that is up to **56 bcrypt threads on 14 cores**, and that 4× oversubscription is what inflates
each call's wall clock. **So the group is BOUNDED, not serialised** — and that is why the fix is free:
removing the oversubscription saves more than the arrangement costs.

### A STRUCTURAL FINDING: VITEST CANNOT DO WHAT (a) LITERALLY ASKED

The brief asked for the bcrypt files to run one at a time **while everything else keeps its
parallelism**. That is not expressible. Vitest refuses it outright:

```
Error: Projects "bcrypt-serial" and "parallel" have different 'maxWorkers' but same
'sequence.groupOrder'. Provide unique 'sequence.groupOrder' for them.
```

…and a unique `groupOrder` means the groups run **one after the other**. **Differently-configured
groups are sequential by construction.** That is also why the one-file-at-a-time arm cost 96.2 s: it
was the bounded group to completion, *then* the rest — a sum, never an overlap. The shipped
arrangement is the bounded group, then the parallel group, and it is still faster than today.

---

## 3. (b) THE TWO FILES THAT DOCUMENTED A FLAG THAT NO LONGER EXISTS

Both asserted `--no-file-parallelism` was in the server package's `npm test`. `20868394` removed it on
2026-08-18. **`verify.mjs` did not merely describe — it SCHEDULED on the dead sentence**, running the
suite non-exclusively beside the fingerprint jobs because it believed the suite was single-worker.

**Corrected, and the scheduling is now the OPPOSITE of what stood there — because I measured it.**

| the suite, under the shipped config | wall | worst test | margin | |
| --- | --- | --- | --- | --- |
| **alone** | 37.7 s | 3,768 ms | **+1,232 ms** | green 6/6 |
| **overlapped with the script suite** | 46.3 s | **7,724 ms** | **−2,724 ms** | **red 1 of 3** |

**My first answer was wrong and this reversed it.** I had derived that the suite could share the
machine because its bcrypt files were bounded, and four `npm run verify` runs passed with it
overlapped. **Those greens were luck against a cliff, not headroom** — the same overlap fails when the
timing lands differently. Three workers is not one worker, and the parallel group uses as many as the
machine has, so **the suite runs alone**.

`ci.yml` now states that it describes nothing and names the one home, because CI schedules nothing —
it runs `npm test` and the config decides.

**The cost of exclusivity, measured:** verify's own wall clock goes from ~65 s to ~86 s (79.6, 80.4,
96.8 s across three runs). **That is the price of the margin being real rather than lucky**, and it is
paid by the gate, not by the suite.

---

## 4. (c) THE CLAIM CANNOT GO STALE BECAUSE IT NO LONGER EXISTS

The brief asked for a guard if one is cheap. **A guard was not the right answer: the second owner was
removed instead.**

`server/test/suiteShape.mjs` derives how the suite runs from the test files themselves.
`server/vitest.config.js` builds its projects from it. `scripts/verify.mjs` reads the **same module**
to decide exclusivity. **There is no sentence left anywhere that can disagree with the code, because
there is no sentence.**

It is also self-correcting in the direction that matters: `singleWorker` is computed, so **if the
suite ever genuinely becomes single-worker, verify resumes overlapping it by itself** — and if anyone
removes the bound, it keeps running alone. Nobody has to remember.

The module imports **node builtins only**, deliberately: `verify.mjs` runs from the repository root
where `vitest/config` does not resolve, so a shared module needing it could not be read by the very
caller whose stale belief caused the defect.

**What this does NOT cover, stated plainly:** it does not verify that the *membership rule itself*
still matches reality. That would mean re-running the instrumented census — a full suite run — on
every gate. Proposal C names it.

---

## 5. VERIFICATION — the gate itself, run directly, never behind a pipe

**Nine `npm run verify` runs on this branch.**

| runs | arrangement | result |
| --- | --- | --- |
| 1–3 | suite overlapped, **before** the stale test was fixed | **exit 1** — `script-suite` failed; see §6 |
| 4–6 | suite overlapped | **exit 0**, PASS 6 / FAIL 0 / SKIP 18 |
| **7–9** | **suite exclusive (shipped)** | **exit 0**, PASS 6 / FAIL 0 / SKIP 18 |

Runs 7–9: `server-suite` **42.3 s, 38.6 s, 36.6 s — "(ran alone)"**, matching its standalone timing,
which is what makes §1's margin the one that actually applies under the gate.

**Worst per-test duration across the six standalone runs at the shipped setting: 3,768 ms. Margin
remaining: 1,232 ms of 5,000 ms (24.6%). Zero tests over 4 s.**

**A limit of this evidence, named rather than glossed:** `verify` invokes the suite through
`npm test --silent`, which emits no per-test durations, so the worst-test figure **cannot be read out
of the green gate runs directly**. It comes from running the same suite, at the same setting, with the
JSON reporter — and §3's overlap experiment is what establishes that running it alone is what makes
those numbers representative.

**FINGERPRINTS: none ran, and none should have.** Routing selected 6 guards and skipped 18. Nothing in
this branch touches the race, the camera or the draw calls — the changed files are a vitest config, a
test-shape module, a verify scheduler, a CI comment, one test's expectation and one diagnostic script.
**Routing's own reason for each fingerprint was "nothing changed", which is correct here**: none of
these paths is in any fingerprint's import closure, and none is engine data. No fingerprint moved and
none was minted.

---

## 6. THE GATE CAUGHT A REAL FAILURE, AND IT WAS NOT THIS PIECE

Runs 1–3 went red on `script-suite`: `actual: '🪲', expected: '🐌'`.

**That is GARDEN-PATH-BEETLE-SKIN-1's icon, and it was red on `master` before this branch existed** —
confirmed by checking out master and running the test there.

**That merge reported green because `verify` routes `script-suite` on changes under `scripts/`, and
the change was under `server/seeds/`.** The one guard that asserts that field was never selected. It
surfaced only because this branch happens to touch `scripts/`.

**This is ENGINE-REACH-DATA-1's finding arriving in practice one day after it was filed as a
diagnosis:** a data file is invisible to routing built on code paths. **It is a second, independent way
the gate had stopped gating — GATE-RED-1 found a timing hole; this is a routing hole.**

**The assertion was updated, not removed.** Its stated purpose was that *"a later block cannot quietly
'tidy' them without saying so"*. It did its job, and the answer is that the change was **not** quiet —
the owner instructed both fields and the piece reported them. The test still guards those fields
against the next change.

---

## 7. SOURCE HYGIENE

**The census shim is gone.** `server/test/bcrypt-census-setup.js` and `server/vitest.census.config.js`
existed only to instrument bcrypt per file; both were deleted before the first commit. The
`server/vitest.main.config.js` copy of master's config, used to measure the baseline arm, was deleted
too. **Nothing measurement-only ships.**

**One shim bug is worth recording.** The first census wrote nothing: it hooked `process.on('exit')`,
and vitest tears its workers down without running exit handlers. **It measured everything and reported
nothing** — a silent zero of exactly the kind HARNESS-LOUD-ZERO-1 describes, produced by me, one day
after writing that report. Fixed by moving the write into `afterAll`.

**A second silent zero, same night:** the timing harness first spawned `npx.cmd` through `spawnSync`
and got exit `null` with no report on every run, printing `0.0s` wall clocks. It now spawns vitest's
own CLI under `process.execPath` and prints `SPAWN FAILED` explicitly when there is no exit code.

**The instrument that stays:** `scripts/diag/suite-timing.mjs`, which runs the suite N times and
reports wall clock plus the worst per-test duration and its margin. It changes nothing and it is how
every figure in §1 was produced.

**Nothing forbidden was done.** The 5,000 ms timeout is unchanged; no test is marked slow, skipped or
retried; `BCRYPT_COST` is still 12 at `usersStore.js:18`; and the gate does not treat a timeout as
anything other than a failure.

---

## 8. CONFORMITY — build vs spec

| the brief asked | delivered |
| --- | --- |
| serialise only what needs it; everything else keeps its parallelism | §2 — **bounded, not serialised**, and §2's last block records that vitest **cannot** do the literal request |
| establish from the tests themselves WHICH files; no list carried over from a report | §2 — every file instrumented and run alone; the report's list was not used |
| do not hand-maintain a list a future test can fall off | §2 — derived at config load from two import doors; exact on 24 of 24 |
| prefer marking a file or group over enumeration; say why you chose what you chose | §2 — vitest has no per-file marker; the closest is a project include, so membership is **computed** into that include rather than typed |
| measure the new wall clock against today's and the fully-serial figure | §1 — **37.7 s vs 39.1 s vs 93.4 s** |
| the answer should be a few seconds, not the whole gain | §1 — **it is zero seconds**; the suite is fractionally faster |
| fix `verify.mjs:246` and `ci.yml:184` | §3 — both, and the scheduling with them |
| correct the scheduling to match whatever (a) makes true | §3 — **the suite now runs alone**, and the measurement that forced that reversal is given |
| (c) build a guard if cheap, else say so and propose | §4 — **the second owner was removed instead**, which is stronger than a guard; what it does not cover is named |
| do not raise the timeout / mark slow / skip / touch the cost factor | §7 — none of them |
| do not make the gate treat a timeout as INCONCLUSIVE | Not done; the gate still fails on a timeout |
| `npm run verify && git merge` green, directly, never behind a pipe, run several times | §5 — **nine runs**, the last three on the shipped arrangement, all exit 0 |
| report the worst per-test duration and the margin that remains | §5 — **3,768 ms, 1,232 ms remaining**, with the limit on how it was obtained stated |
| fingerprints: let routing decide, state what it selected and why | §5 — 6 selected, 18 skipped, none is a fingerprint, none moved |
| report + INDEX in the same commit; PROPOSALS with ≥2 of your own | this file; §9 has four, three of them mine |

**One departure, named:** the brief's (a) is not satisfiable as written. §2 records the vitest error
verbatim rather than quietly delivering something else and calling it the same thing.

---

## 9. PROPOSALS — none ordered

### A — MINE: consider the bound of 6 if he wants the 8.6 seconds

Six workers gives **29.1 s** — 10 s faster than the suite is today — and keeps **845 ms** of margin
instead of 1,232 ms. **Cost:** under half the headroom, and 2 tests over 4 s where 3 has none.
**Recommended only if the suite's wall clock starts mattering**; today it does not, and the safer bound
is free.

### B — MINE: `UV_THREADPOOL_SIZE` is the lever underneath all of this

The whole defect is that each worker carries a 4-thread libuv pool, so N workers means up to 4N bcrypt
threads. **Setting `UV_THREADPOOL_SIZE=1` for the test workers would remove the oversubscription at
its source** and might allow full parallelism with a healthy margin — the best of both.

**Not done here because it is not portable to set cleanly:** it must be in the environment before the
process starts, `test.env` is applied too late, and `npm test` would need a cross-platform way to set
it. **It deserves its own measurement**, and it is the only idea here that could give both the 29 s
and the 1,900 ms.

### C — MINE: a periodic census, not a per-gate one

§4's honest gap is that nothing re-verifies the membership *rule*. A guard that re-ran the instrumented
census every gate would cost a full suite run. **Proposed instead as an occasional check** — the census
is `scripts/diag/suite-timing.mjs`'s sibling and took four minutes to produce. **Cost of not doing it:**
if a future test reaches bcrypt through a third door, it lands in the parallel group and the margin
erodes silently. **That is the residual risk of this repair and it should be written down rather than
guarded badly.**

### D — the routing hole in §6 is the more urgent item

Not mine — it is ENGINE-REACH-DATA-1's, now with a live instance. **A change merged green while
breaking a test, because the guard that would have caught it routes on a path the change did not
touch.** This piece only revealed it. **It is on the backlog and needs his word on the smallest fix.**

---

## WHAT OUTLIVES THIS REPORT

**The cheap fix and the safe fix were the same fix, and only measuring found that.** Bounding the
bcrypt group removes an oversubscription that was costing wall clock *and* margin at the same time —
so the gate got its teeth back and the suite got slightly faster. The version that obeyed the brief
literally, one file at a time, was three times slower and no better than serialising everything.

**And the sentence was not the problem — having a second owner for it was.** `verify.mjs` did not go
wrong by describing the suite badly; it went wrong by *deciding* on its own copy of a fact that lived
somewhere else. The repair is not a better comment or a guard over the comment. It is that the fact
now has one home and both readers import it.
