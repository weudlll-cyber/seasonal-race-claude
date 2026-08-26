# GATE-RED-1 — nothing in the tests got slower; the suite stopped running them one at a time

**Date:** 2026-08-26 · **Branch:** `diag/gate-red-1` (off `master`) · **Piece 1 of NIGHT-2026-08-25** ·
**Verdict:** DIAGNOSE ONLY. No timeout raised, no test marked slow, no test skipped, no cost factor
touched. Nothing is proposed as built.

**The owner's question was the right one.** *Nothing was changed in those tests, so how did they get
slower?* **They did not get slower. They got crowded** — and the change that crowded them is a commit
that touched no test's body, was correct in its own terms, and left two other files still documenting
the guarantee it had removed.

---

## THE ANSWER IN ONE PARAGRAPH

On **2026-08-18**, commit **`20868394` (`fix(TEST-ACCOUNTS-1)`)** removed `--no-file-parallelism` from
`server/package.json`'s test script. It was right to: that flag had been serialisation standing in for
isolation, and the commit made isolation real by giving every test file its own users store. **What it
also did, silently, was put sixteen bcrypt-heavy test files on the machine at once.** bcrypt at cost 12
costs **247 ms per call** and a single test performs four to eight of them. Run alone, the worst
unprotected test takes **1,006 ms**; run against fifteen sibling files competing for the same cores it
takes up to **4,979 ms** — against vitest's 5,000 ms default. **A margin of 21 milliseconds.** Two
places still assert the flag is present — `.github/workflows/ci.yml:184` and `scripts/verify.mjs:246` —
and **`verify.mjs` schedules on that belief**, running the server suite *non-exclusively alongside the
fingerprint jobs* because it thinks the suite is single-worker. That overlap is the load that spends
the last 21 ms.

---

## (b) WHAT ONE BCRYPT CALL COSTS, AND WHETHER IT WAS EVER RAISED

`BCRYPT_COST = 12` at `server/src/auth/usersStore.js:18`, used by `hashPassword` (`:35`) and
`bcrypt.compare` (`:40`).

**It was set once and NEVER raised.** `git log -L` on that line returns exactly one commit:
`c674b78d` (2026-06-13), the commit that created the file. **The cost factor is not the change.**

Measured on this machine, idle, single call:

| operation | cost 12 | what performs it |
| --- | --- | --- |
| `bcrypt.hash` | **247 ms** | creating a user; changing a password |
| `bcrypt.compare` | **246 ms** | every login; `verifyPassword` |

A login-and-change test performs four to eight of these. **~1–2 s of unavoidable CPU per test, by
design** — the comment at `changePassword.test.js:30` already says so.

---

## (a) WAS IT ALWAYS LIKE THIS? — no, and the commit is nameable

`server/package.json`'s test script has been changed exactly twice in a way that matters:

| commit | date | change |
| --- | --- | --- |
| `ef70ab54` | 2026-05-01 | `vitest run` → **`vitest run --no-file-parallelism`** |
| **`20868394`** | **2026-08-18** | **`vitest run --no-file-parallelism` → `vitest run`** |

`20868394` is `fix(TEST-ACCOUNTS-1): every server test file creates the users it needs`, and its own
body states the removal and the reasoning:

> *"NOTHING WEAKENED, NOTHING SERIALISED, NOTHING RETRIED. … And `--no-file-parallelism` is DROPPED
> from the test script — that flag was serialisation standing in for isolation, and the isolation is
> now real."*

> *"PROVEN: five consecutive full server-suite runs, unchanged between them, 23 files and 650 tests
> every time; plus three runs in RANDOM FILE ORDER, same result."*

**That reasoning is correct and the evidence was real.** The flag *was* serialisation standing in for
isolation. Five consecutive green runs *did* happen. **What the five runs did not measure is wall
clock**, and wall clock is the only thing that changed: the suite went from one file at a time to as
many files at once as the machine has cores.

### THE PROOF, ON TODAY'S MASTER — one flag, nothing else

The same suite, same commit, same cost factor, same 5,000 ms default timeout, varying only concurrency:

| how it was run | the worst unprotected test¹ | tests over 2.5 s | over 5 s | failed |
| --- | --- | --- | --- | --- |
| that file **alone** | **1,006 ms** | — | — | 0 |
| **`--no-file-parallelism`** (as before 2026-08-18) | **1,754 ms** | **0** | **0** | **0** |
| `--maxWorkers=2` (a CI-sized runner) | **1,213 ms** | 4 | 0 | 0 |
| **default** (14 workers, this machine) | **2,897 – 4,979 ms** | **14** | 3² | 0³ |

¹ `recoverAdmin.test.js :: sets role to admin and verifies new password after promote` — the test
nearest the cliff that has no raised timeout of its own.
² All three are inside the two files that set their own 30 s budget, so they cannot fail.
³ Across four consecutive default runs on an **idle** machine. See "why it is intermittent" below.

**Restoring the flag removes the cliff completely: not one test in 673 exceeds 2.5 s.** The slowest
thing in the entire serial suite is 2,277 ms, less than half the limit.

### A MEASUREMENT ERROR OF MINE, RECORDED BECAUSE IT ALMOST NAMED THE WRONG COMMIT

My first archaeology ran the suite at `75685b5b` (2026-08-17, the parent of the six-new-files day) and
found the cliff test at **5,096 ms with one failure** — which appeared to prove the margin had already
gone *before* the file additions, and pointed at a different culprit entirely.

**It proved nothing of the kind.** I invoked `npx vitest run` directly, which does **not** carry
`--no-file-parallelism` — the flag that commit still had in its `npm test`. So the run measured old
code under *new* parallelism. It is a clean confirmation of the mechanism and worthless as archaeology.
**Recorded because a harness that bypasses the thing under test will happily produce a confident wrong
answer**, and because the corrected reading points at a different commit than the one I first blamed.

---

## (d) THE CLIFF, PER TEST, ACROSS RUNS

Four consecutive default-concurrency runs, idle machine, 673 tests each. Every test that reached 2.5 s
in any run:

| max ms | min ms | test | own timeout? |
| --- | --- | --- | --- |
| 6,272 | 4,774 | `changePasswordContract` :: END TO END: the real client call… | **30 s** |
| 5,592 | 3,696 | `changePassword` :: an OPERATOR can change their own password | **30 s** |
| 5,023 | 3,758 | `changePassword` :: an ADMIN can change their own password too | **30 s** |
| **4,979** | **2,897** | **`recoverAdmin` :: sets role to admin and verifies new password** | **none — 21 ms of margin** |
| 3,966 | 2,969 | `changePasswordContract` :: the client sends ONLY the two passwords | 30 s |
| **3,928** | **1,724** | **`sessionInvalidation` :: leaves an unrelated user untouched** | **none** |
| 3,873 | 2,945 | `changePasswordContract` :: a WRONG current password is refused | 30 s |
| 3,845 | 2,863 | `changePassword` :: a WRONG current password is rejected | 30 s |
| **3,730** | **2,373** | **`sessionInvalidation` :: stays rejected on every following request** | **none** |
| 3,395 | 2,874 | `changePasswordContract` :: CONTROL: a hand-built body… | 30 s |
| 3,256 | 2,467 | `changePassword` :: a body naming ANOTHER user | 30 s |
| **2,858** | **2,339** | **`sessionInvalidation` :: ends that user's session on the VERY NEXT request** | **none** |
| **2,851** | **2,019** | **`recoverAdmin` :: works when the existing user is already admin** | **none** |
| 2,816 | 1,612 | `changePasswordContract` :: the requesting session still works | 30 s |

**Fourteen tests over 2.5 s; the top three are all in files that raised their own budget.** The
exposed population is the **six bolded rows** — `recoverAdmin.test.js` and `sessionInvalidation.test.js`
— and the leader is 21 ms under the line.

**Only two of sixteen server test files carry a raised timeout**, both added by `2aafe1af`
(2026-08-17) in the same commit that created them, with a written justification:

> *"bcrypt at cost 12 is deliberately slow… Alone that is ~2 s per test; under the full suite's
> contention it crosses vitest's 5 s default and times out. This file therefore states its own
> WALL-CLOCK budget."*

**The wall was already known, named, and correctly diagnosed on 2026-08-17 — one day before the flag
was dropped.** The fix was applied to the two files that were hurting and to no others. It reads now
as a local workaround for what was about to become a suite-wide condition.

### WHY IT IS INTERMITTENT, AND WHY "A DIFFERENT TEST EACH RUN"

All four of tonight's default runs **passed**, on an idle machine, with 21 ms to spare. **Concurrency
consumes the margin; anything else at all spends it.** Whichever unprotected test happens to be
scheduled opposite the heaviest siblings that run is the one that crosses — so the failure moves.

**This is not the same claim as "machine load", which was ruled out and is not re-argued here.** Load
is the *trigger*; the cause is that default concurrency leaves no margin for a trigger to find. On an
idle machine at default concurrency the suite is 21 ms from red. **A gate with 21 ms of margin is not
a gate.**

---

## (c) WHY CI IS GREEN — and the green is NOT hollow

**Same tests, same cost factor, same timeout, same command.** I checked each:

| | local | CI (`.github/workflows/ci.yml`) |
| --- | --- | --- |
| command | `npm test` → `vitest run` | `npm test` → `vitest run` — identical |
| `testTimeout` | vitest default 5,000 ms | **the same** — `server/vitest.config.js` sets none |
| `BCRYPT_COST` | 12 | **the same** — one constant, no env override |
| Node | **24.14.0** | **20** |
| runner cores | **14** | ubuntu-latest, **2–4** |

**The difference that matters is the core count, and it works the opposite way round from intuition.**
Vitest sizes its worker pool from the CPU count, so a *bigger* machine runs *more* bcrypt-heavy files
simultaneously and every individual test's wall clock gets *worse*. Measured above: the cliff test is
**1,213 ms at two workers** and **up to 4,979 ms at fourteen**.

**So the CI green is honest.** It runs the same assertions with the same cost factor against the same
limit, and passes with roughly a 4× margin because a small runner cannot crowd the suite. **The local
red is caused by the developer machine being larger than the CI runner.** Nothing has been weakened,
and no hollow pass is being reported.

---

## (e) THE OTHER CANDIDATES — checked, not speculated

| candidate | finding |
| --- | --- |
| **Node version** | Local **24.14.0**, CI **20**. A real difference, but it does not explain a change over time on one machine, and the concurrency experiment reproduces and removes the cliff without touching Node. Not the cause. |
| **bcrypt updated** | `"bcrypt": "^6.0.0"` declared once, at `c674b78d` (2026-06-13). Installed **6.0.0**. `git log -S '"bcrypt"'` returns that one commit. **Never bumped.** |
| **vitest updated** | Declared once at `fecf9de2` (2026-04-29); `^4.1.4` resolving to **4.1.8** installed. A patch drift, and it cannot explain the cliff: the same installed vitest is green serial and red parallel. |
| **A worktree without its own `node_modules`** | `.git/worktrees` is **empty**; `server/node_modules` is present. Not applicable. |
| **A scanner on the project directory** | The project does sit under OneDrive — but `server/test/env-setup.js` points `RA_DATA_DIR` and `RA_USERS_DB` at `os.tmpdir()`, so **every file the suite writes is outside OneDrive already**. Source reads are cached by the vitest transform pipeline and are identical between the serial and parallel runs, which differ 3×. Not the cause. |

---

## THE SECOND FINDING — two documents assert a flag that no longer exists, and one of them SCHEDULES on it

This is the part that turns a slow suite into a broken gate.

**`scripts/verify.mjs:246`:**

> *"`--no-file-parallelism` is the server package's OWN `npm test`, not a flag added here: the suite
> writes a real sqlite session store, so files sharing it cannot run concurrently."*

**`.github/workflows/ci.yml:184`:** the same sentence, nearly verbatim.

**Both have been false since 2026-08-18.** And `verify.mjs` does not merely describe — it *decides*
with it, in the very next lines:

> *"NOT exclusive, unlike client-suite. That flag exists because the client suite saturates the machine
> for ~200 s; this one is 42 s and its `--no-file-parallelism` already keeps it to a single worker, so
> it is the cheapest thing in the run to overlap with a fingerprint."*

**So `verify` deliberately overlaps the server suite with the fingerprint jobs, on the ground that the
suite is single-worker. It is now fourteen-worker.** The gate therefore runs the suite under precisely
the extra contention that spends its 21 ms — which is why a bare `vitest run` passes on an idle machine
and `npm run verify` does not.

**The stale comment is also a correctness claim, not only a scheduling one.** It says files "cannot run
concurrently" because they share a sqlite session store. `20868394` made the *users store* per-file; it
says nothing about the session store. Whether that sharing is still real is **not established here** —
it is named in the proposals as the one thing that must be settled before anyone reaches for the flag.

---

## WHAT SHOULD HAPPEN WHEN A SUITE FAILS FOR A REASON UNRELATED TO THE CHANGE UNDER TEST

The owner's operating rule tonight — *run the gate, read the finding, say so explicitly in the merge
body, merge as a separate deliberate step* — is the correct human behaviour and it is the only thing
standing between this defect and a silently hollow gate. **It should not have to be a human habit.**

Three properties any answer needs, stated before the mechanisms so they can be judged separately:

1. **A real red must still be caught.** Any scheme that lets a timeout pass must not let an assertion
   failure pass. These are already distinguishable: vitest reports a timeout with a distinct message
   and a `duration` at the limit, and an assertion failure with neither.
2. **The exemption must be finite and visible.** A blanket "ignore timeouts" is a disabled gate. It has
   to name the tests it forgives, and it has to shrink — a list that only grows is the flag removal
   again in a different costume.
3. **The gate must fail on the exemption becoming wrong.** If a forgiven test starts failing on an
   assertion, or a new test joins the near-limit population, that is a red.

**Concretely, and none of this is built here:**

- **The honest answer is to remove the cause, not to forgive the symptom.** The suite is 42 s serial.
  Nothing in this diagnosis suggests the tests deserve a bigger budget; they deserve to not be run
  fourteen-at-a-time against a limit calibrated for one-at-a-time.
- **If a suppression is wanted anyway, it belongs where the routing already lives** — `verify.mjs`
  classifies a job's failure today only as pass/fail. It could classify *timeout-only* failures
  separately and report them as a distinct, loud, non-zero-exit outcome: **`GATE INCONCLUSIVE`** rather
  than `PASS` or `FAIL`. Inconclusive is not green. It refuses to gate a merge and says why, which is
  exactly the state the gate is actually in and cannot currently express.
- **The near-limit population should be measured, not discovered.** Every run already knows each test's
  duration. A job that fails when any test exceeds, say, half its timeout would have gone red on
  2026-08-18 — the day the flag was dropped — instead of on an unrelated branch a week later. That is
  the same shape as Lesson 187's guard rule and it is PIECE 2's subject, one layer down.

---

## PROPOSALS — none ordered, each with its cost

### A — MINE: correct the two stale comments before anything else, because one of them is a scheduling decision

`verify.mjs:246` and `ci.yml:184` both assert a flag that has not existed since 2026-08-18, and
`verify.mjs` schedules the suite non-exclusively *because* of it.

**Cost: none to behaviour** — a comment fix plus, at most, moving the server suite to `exclusive`.
**What it buys:** the gate stops running the suite under the contention that breaks it. **What it does
NOT buy:** it does not fix the suite; at default concurrency the margin is still 21 ms on an idle
machine, so this alone converts an intermittent red into a rarer intermittent red. **Listed first
because it is the only item here with no downside**, not because it is sufficient.

### B — MINE: put the serialisation back as a PERFORMANCE decision, stated as one

Restore `--no-file-parallelism`, on the explicit ground that bcrypt at cost 12 makes these files
CPU-bound and parallelism costs more in per-test wall clock than it saves in suite wall clock.

**What it buys, measured:** zero tests over 2.5 s, against fourteen today. The whole cliff.
**Cost, and it is the reason this is not simply "revert `20868394`":** that commit dropped the flag as
part of making isolation real, and it proved the isolation with eight runs. **Restoring the flag must
not restore the old reasoning** — it would be serialisation for *speed*, with isolation still carried
by the per-file stores. If anyone later reads it as isolation again, the next TEST-ACCOUNTS-1 removes
it for the same correct reason and this recurs. **It also needs the sqlite-session-store question in
§"The second finding" answered first**, because if that sharing IS real then parallelism is a
correctness bug too and the flag is load-bearing in a second way nobody has checked.

### C — MINE: `GATE INCONCLUSIVE` as a third outcome

`verify.mjs` can distinguish a timeout-only failure from an assertion failure and report a third state
that is neither pass nor fail, exits non-zero, and names the tests involved.

**What it buys:** the state the gate is genuinely in becomes sayable, so the owner's manual rule
("read the finding, say so in the merge body") becomes a machine-checked one. **Cost:** a third
outcome is a new concept in the gate and every caller has to know what to do with it; done carelessly
it becomes a synonym for green. It must not gate a merge on its own.

### D — bound the cost factor by environment, which is the ordinary answer everywhere else

Lower `BCRYPT_COST` under test only. **NOT RECOMMENDED, and named so it is refused with a reason
rather than re-proposed:** the cost factor is a security property, the tests are the only place it is
exercised end to end, and a test-only cost means the thing shipped is never the thing tested. The
suite's problem is scheduling, not cryptography.

### E — measure the margin, don't wait to trip over it

A check that fails when any test exceeds half its timeout. **Cost:** a new failure mode that is not a
broken behaviour, which needs care not to become noise. **What it buys:** the flag removal on
2026-08-18 would have been red on 2026-08-18. Overlaps PIECE 2 and should be decided with it.

---

## SOURCE HYGIENE, AND WHAT WAS NOT RUN (R15)

**Measurements.** Four default-concurrency runs, one `--no-file-parallelism` run, one `--maxWorkers=2`
run, one single-file run, all on master's server suite, machine idle, JSON reporter, per-test
durations from vitest's own `assertionResults[].duration`. One bcrypt micro-benchmark (5 iterations,
mean) run from inside `server/` so it resolves the same installed `bcrypt@6.0.0` the suite uses.

**Archaeology** is from `git log -S` and `git log -L` on `server/package.json` and
`server/src/auth/usersStore.js`, and from the commit bodies of `20868394` and `2aafe1af` — quoted
rather than summarised, because their own reasoning is the evidence.

**One run is discarded and reported rather than deleted:** the `75685b5b` timing, which bypassed the
flag under test. See §(a).

**Nothing was changed.** No timeout raised, no test marked slow or skipped, no cost factor touched, no
flag restored. `server/package.json`, `verify.mjs` and `ci.yml` are untouched on this branch; the two
stale comments are reported, not fixed, because fixing `verify.mjs`'s scheduling changes how the gate
runs and that is a decision, not a typo.

**What was NOT run, and why.**

- **No fingerprints.** No file any fingerprint reads was modified. This branch adds one report.
- **No browser gate, no client suite.** Nothing in the client tree was touched, and this diagnosis is
  about the server suite's scheduling.
- **The server suite itself WAS run, seven times** — it is the subject.

**Machine:** 14 cores, Node 24.14.0, machine otherwise idle (the RUNIN-CHANCE-SET-1 sweep had
completed and was confirmed finished before any timing here was taken).

---

## CONFORMITY — what was asked against what was delivered

| the brief asked | delivered |
| --- | --- |
| DIAGNOSE ONLY; no timeout raised, no test marked slow or skipped, no cost factor touched | Yes — nothing changed; §Source hygiene |
| (a) was it always like this; time older commits; **name the commit where the margin vanished** | §(a) — **`20868394`, 2026-08-18** — plus the flag's introduction at `ef70ab54`, and my own bad measurement reported |
| (b) what one bcrypt call costs, measured; where the factor is set; was it ever raised | §(b) — 247 ms hash / 246 ms compare; `usersStore.js:18`; **never raised**, one commit in its whole history |
| (c) why is CI green — same tests, factor, timeout | §(c) — same on all three; the difference is **core count**, and the green is **not hollow** |
| (d) per-test durations across several runs; which sit near 5 s and how near; show the cliff | §(d) — four runs, 14 tests over 2.5 s, the exposed leader at **21 ms of margin** |
| (e) node version, dependency update, worktree without node_modules, scanner — check, don't speculate | §(e) — all four checked at source; none is the cause |
| do not redo: machine load, any branch's own changes | Neither re-argued. The load/cause distinction is stated explicitly in §(d) |
| say what SHOULD happen when a suite fails for a reason unrelated to the change | §"What should happen" — three required properties, then mechanisms |
| be concrete about how a real red would still be caught | Same section, property 1, resting on vitest's own distinction between a timeout and an assertion failure |
| propose, do not build | §Proposals — five, three of them mine, none built and none ordered |
| PROPOSALS with at least two of your own | Three are mine (A, B, C); D is named to be refused; E overlaps PIECE 2 |

**One thing the brief did not ask for and this report adds:** the stale comments in `verify.mjs` and
`ci.yml`, and the fact that **`verify.mjs` schedules the suite non-exclusively because of one of
them**. That is not a documentation defect — it is the reason the gate specifically, rather than the
suite generally, is where the red shows up.

---

## WHAT OUTLIVES THIS REPORT

**A correct change removed a guarantee two other files were still relying on, and nothing connected
them.** `20868394` dropped a flag it had earned the right to drop. `verify.mjs` and `ci.yml` had both
written that flag into their own reasoning — one of them into a scheduling decision — and neither was
touched. **The defect is not in any of the three; it is that a guarantee had three owners and no
home.** That is the same one-canonical-home rule this project applies to config values and
fingerprints, applied to a property of how a suite runs.

**And the wall was correctly diagnosed a day before it was hit.** `2aafe1af`'s comment describes the
bcrypt contention exactly, on 2026-08-17, and fixes the two files in front of it. **A finding that
accurate, one day early, should have been able to stop the change that generalised it.**
