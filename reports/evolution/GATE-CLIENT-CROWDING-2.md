# GATE-CLIENT-CROWDING-2 — the hypothesis is confirmed, the resource is named, and the server's remedy is the right shape

**Measure only. Nothing is fixed here, no timeout is raised, no test is marked slow or skipped** —
the brief's bounds, and they are also the standing rule from the server-suite repair.

**Nine full runs of the client suite** (4,314 tests each), in three arms, using
`scripts/diag/suite-timing.mjs` — GATE-SERIAL-BCRYPT-1's own instrument, **parameterised rather than
copied**: `--suite=client` points it at the client workspace and the default `server` behaviour is
unchanged. A second copy would have been a second thing to keep in step, and the margin question is
identical for both suites.

---

## THE THREE ANSWERS

### 1. WHICH resource runs out — CPU, through the suite's OWN worker oversubscription

Not memory: free RAM sat at 7.4–7.9 GB of 33.8 throughout, and no node processes accumulated between
runs. **It is cores, and the suite is competing with itself.**

The machine has **14 cores**; vitest defaults to roughly one worker per core, and the client suite
contains **15 tests that pass beyond 5,000 ms** and therefore carry their own extended timeouts —
`goldenRealArm`, `sim-fairness`, `replay`. Those are individually heavy. When thirteen workers each
try to run something like that at once, everything else is starved.

**The direct evidence is that the heavy tests get slower too**, which is what distinguishes
oversubscription from a slow test:

| | unbounded | bounded to 4 workers |
|---|---|---|
| worst test overall | **113,789 ms** | **49,482 ms** |
| tests over 5 s | 54 | **36** |
| tests over 4 s | 60 | **39** |

The heaviest test in the suite runs **2.3× faster** when fewer things run beside it. Nothing about
that test changed.

### 2. Does the failure rate depend on load — YES, but on the suite's OWN parallelism

This is the part that made the original finding look incoherent, and it now resolves.

**Measured in GATE-SERIAL-BCRYPT-1's framing** — the worst test *with no timeout of its own*, against
the unchanged 5,000 ms default. The 15 extended-timeout tests are excluded **by that property**, not
by a hand-kept list of names:

| arm | runs | failures | p99 of default-timeout tests | worst | **margin** |
|---|---|---|---|---|---|
| unbounded (arm A) | 3 | **14** | 1,918 ms | 10,457 ms | **−5,457 ms** |
| unbounded (arm B) | 3 | **6** | 1,733 ms | 8,511 ms | **−3,511 ms** |
| **bounded, `--maxWorkers=4`** | 3 | **0** | **744 ms** | **4,402 ms** | **+598 ms** |

**Twenty failures across six unbounded runs; zero across three bounded runs.**

**And the worst tests unbounded are precisely the two that kept failing** — `raceSeed.test.jsx` at
**10,457 ms** and `raceActionStage.test.jsx` at **8,511 ms**, against a 5,000 ms limit. **They are not
hanging. They are being starved to twice their own limit.** That is the whole mechanism, and it was
the hypothesis GATE-CLIENT-CROWDING-1 wrote down without being able to show.

**Why external load did not reproduce it**, which is the thing that made this look like a
contradiction: the earlier attempts loaded the machine from *outside* — thirteen CPU burners, and a
forced verify on master's tree — and both passed. **Outside load makes the scheduler share; the
suite's own thirteen workers make it oversubscribe.** A burner yields; a vitest worker holding a
jsdom environment mid-test does not. The failure rate depends on load **the suite creates for
itself**, which is why every external test of the hypothesis came back negative and looked like a
refutation.

**It also explains the spread.** In arm A the failures grew 1 → 3 → 10 and spread from one file to
six (`sim-fairness`, `UserManagementSection`, `CameraAdvancedSection`, `SetupScreen`). That is not two
flaky tests; it is a starvation threshold that more tests cross as conditions worsen. **Any test with
a 5-second timeout is a candidate** — the SetupScreen pair are simply the closest to the line.

### 3. Is the server remedy the right shape — YES, and it costs about 29% wall clock

GATE-SERIAL-BCRYPT-1's remedy was: bound the heavy group's workers, give the suite exclusivity,
measure the margin before and after. **Bounding workers alone takes the client suite from a negative
margin to a positive one and from 20 failures to 0.**

The cost is real and should be stated plainly:

| | unbounded | bounded to 4 |
|---|---|---|
| mean wall clock | **313 s** | **403 s** |

**About 29% slower.** The server case was better than that — bounding *cost nothing* there, 37.7 s
against 39.1 s — because its heavy group was 16 bcrypt files out of 24 and oversubscription was
costing wall clock as well as margin. **Here the trade is real**, and that is a decision rather than a
free win.

**AND THE MARGIN AT 4 WORKERS IS THIN.** +598 ms against the server suite's +1,894 ms after its
repair. `--maxWorkers=4` was chosen as a first probe, not as a tuned value; a lower bound would buy
more margin and cost more wall clock. **The sweep that would pick the number has not been run** — that
is named in the proposals rather than guessed at here.

---

## WHAT THIS DOES NOT SHOW

- **It does not show that 4 is the right number.** Three arms is enough to establish the mechanism and
  the direction; it is not a tuning sweep.
- **It does not show the suite is now trustworthy.** Zero failures in three bounded runs is three
  runs. The server repair measured four runs per arm and reported the worst across all of them.
- **It does not touch `verify`'s scheduling.** Every run here spawned the suite directly. Whether
  `verify` should also give the client suite exclusivity — the second half of the server remedy — is
  untested.

## CONFORMITY

- **Nothing fixed, no timeout raised, nothing marked slow or skipped**, as the brief required.
- **The existing instrument was reused, not duplicated** — one new parameter, and the server path is
  behaviour-identical.
- The margin is computed the way GATE-SERIAL-BCRYPT-1 computed it, against the same unchanged
  5,000 ms default, with extended-timeout tests excluded by a property rather than a name list.

## PROPOSALS

**P1 — sweep the bound before choosing it, exactly as the server repair did.** That piece measured
1 / 3 / 6 / unbounded and chose 3 because it cost nothing and bought everything. The equivalent here
is 2 / 4 / 6 / 8 over four runs each, reading wall clock and margin together. **4 is the first value
tried, and the margin it buys (+598 ms) is a third of what the server suite considers safe.** The
number should be read off a curve.

**P2 (mine) — the 15 extended-timeout tests are the actual load, and moving them is the alternative
nobody has costed.** `goldenRealArm`, `sim-fairness` and `replay` account for every test over 5 s and
one of them alone runs 114 s under contention. Bounding workers slows the *whole* suite by 29% to
contain three files. **Splitting those into a project that runs serially — the shape
`server/test/suiteShape.mjs` already implements for bcrypt — would leave the other 4,299 tests running
at full width.** That is closer to what the server actually does, and it is why the server's cost was
zero and this one's is 29%.

**P3 (mine) — the gate should be able to say "I could not tell".** The original entry's own worry was
that a timeout-only failure reads as a real failure. Everything measured here is a timeout, and none
of it was a defect in the code under test. **A guard that reported timeout-only failures as
INCONCLUSIVE — the option the merge-gate entry offered him and which was never needed there — would be
exactly right here**, and it is a smaller change than re-architecting the suite. It also fails safe:
inconclusive is not green.

**P4 — until something is decided, the entry stays open and the failure stays visible.** No timeout
raised, no test skipped. A suite that fails 20 times in 6 runs is telling the truth about the machine
it is on; the fix is to stop starving it, not to stop it complaining.
