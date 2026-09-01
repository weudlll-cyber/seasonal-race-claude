# CROWDING-INFERENCES-1 — one inference confirmed, one refuted as stated, and the cliff did not reproduce

**THE BOUND IS NOT RETUNED. `maxWorkers: 4` is untouched.** This piece explains it; it does not
change it, and nothing below should be read as an argument to.

GATE-CLIENT-BOUNDED-1 was honest about two things it had not measured. Both are now measured.

| the inference | verdict |
| --- | --- |
| **"that CPU is the resource"** — no counter was ever read | **CONFIRMED, and now measured.** CPU saturates; memory and disk do not. |
| **"that the 15 extended-timeout tests are specifically the load"** — never isolated | **REFUTED AS STATED.** They are *a* load worth ~17%; the worker count is worth ~77%. The count and the file list are also wrong. |

**And a third thing, unasked and larger than either: the failures that justified the bound did not
reproduce.** Nine runs across three arms, **zero failures in all of them.**

---

## METHOD

`scripts/diag/suite-timing.mjs --suite=client` — GATE-SERIAL-BCRYPT-1's instrument, reused rather
than reimplemented, three runs per arm. The load counters it does not sample were added alongside it
rather than by writing a second timing tool.

Three arms, all on an otherwise idle machine (14 logical cores, 33.8 GB):

- **ARM U** — `--maxWorkers=13`, whole suite. Vitest's own default is roughly one worker per core, so
  this is the unbounded shape the config comment describes.
- **ARM X** — `--maxWorkers=13`, with the seven heavy/extended-timeout files **excluded**. This is
  GATE-CLIENT-BOUNDED-1's own proposal, run for the first time.
- **ARM B** — the shipped `maxWorkers: 4`, whole suite. The same-session control.

**Two methodological points, because without them the numbers mislead:**

**1. Comparisons are only valid WITHIN this session.** The instrument runs vitest with
`--reporter=json` and no coverage; the earlier reports used `npm test`. My 151.5 s and their 313.8 s
are not the same measurement. **Every conclusion below rests on arm-to-arm comparison inside one
session**, never on a number carried across.

**2. Arms are compared on the SHARED POPULATION only.** Comparing "worst test" between an arm that
has the heavy files and one that does not is circular — of course the worst drops when the worst is
deleted. So every table below counts **only the 12,753 ordinary tests present in all three arms**.

**The `--maxWorkers` flag was verified to actually apply**, rather than assumed, because a flag that
is accepted and ignored would have produced exactly the "no failures" result reported here. On the
`parity/` subset alone: **1 worker → 49.2 s wall with 40.4 s of test time; 13 workers → 31.5 s wall
with 77.8 s of test time.** Wall clock down, summed per-test duration nearly doubled. That is
crowding in miniature and it proves the flag bites.

---

## THE ORDINARY TESTS — the population that actually fails when this goes wrong

12,753 tests per arm (4,251 × 3 runs), heavy files excluded from the statistics everywhere:

| arm | median | p95 | p99 | worst | margin vs 5,000 ms | >2.5 s | failures |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **U** — 13 workers, whole suite | 1 ms | 171 | 675 | **3,490** | **+1,510** | 3 | 0 |
| **X** — 13 workers, heavy files removed | 1 ms | 157 | 616 | **2,898** | **+2,102** | 3 | 0 |
| **B** — 4 workers, whole suite | 1 ms | **70** | **237** | **789** | **+4,211** | 0 | 0 |

## INFERENCE A — "the extended-timeout tests are specifically the load"

**Refuted as stated, and the sentence is wrong in three separate ways.**

**1. Removing them helps, but far less than bounding does.** Against arm U:

- removing all seven heavy files: p99 **675 → 616** (−9%), worst **3,490 → 2,898** (−17%)
- bounding to 4 workers, heavy files still present: p99 **675 → 237** (−65%), worst **3,490 → 789** (−77%)

**The bound does roughly four times as much for the ordinary tests as deleting the heavy files
does.** They are a contributor, not "specifically the load". If they were the load, arm X would look
like arm B, and it does not — it barely moves.

**2. The count is wrong.** One unbounded run has **12** tests over 5,000 ms, not 15. Across three runs
it is 38, which is the same 12–13 tests three times over; the "15" appears to be a pooled figure read
as a per-run one.

**3. The file list is wrong, and not findable the way anyone would look.** The twelve live in four
files — `goldenRealArm`, `goldenEquality`, `goldenNegative`, `replay` — and their timeout does not
come from an inline number at all. It is **`RACE_TIMEOUT_MS = 180_000`**, a named constant exported
from `client/src/modules/parity/goldenCases.js`. A grep for extended timeouts finds three *different*
files (`sim-fairness.test.js` at 30 s, and `buildIdentityReason` / `buildIdentityWorktree` via
`vi.setConfig`), **none of which is among the twelve** — `sim-fairness.test.js` is named in the config
comment and is not one of the slow tests.

So "the extended-timeout tests" and "the tests that run long" are two different sets, and the config
comment conflates them.

## INFERENCE B — "that CPU is the resource"

**Confirmed, and now measured rather than reasoned.** Three counters, sampled every two seconds
through every arm:

| arm | CPU % med/p90/max | free MB (minimum) | disk queue (max) |
| --- | --- | --- | --- |
| idle | 9 / 16 / 16 | 12,449 | 0 |
| **U** — 13 workers | **85 / 86 / 87** | 9,257 | 6 |
| **X** — 13 workers, heavy removed | **85 / 86 / 87** | 10,431 | 2 |
| **B** — 4 workers | **47 / 61 / 83** | 12,009 | 3 |

- **CPU is the resource.** Thirteen workers pin it at 85–87% and hold it there; four workers sit at
  47% median. And the ordinary tests track it precisely — p99 675 ms at 85% CPU, 237 ms at 47%.
  Bounding workers lowers CPU and per-test duration together.
- **Memory is not**, and this is the first time that has been a measurement rather than an argument.
  Free memory never falls below **9.3 GB of 33.8 GB** in any arm. GATE-CLIENT-CROWDING-1 called free
  memory "the cheapest candidate to rule in or out"; it is now ruled out on a number.
- **Disk is not**, and it had never been considered at all. The queue is 0 for almost every sample,
  peaking at 6.

**One honest qualification: 85–87% is pinned, not 100%.** The remaining headroom is not explained
here, and calling the machine "saturated" is a fair reading of a counter held flat at a ceiling for
133 consecutive samples — but it is not the same as measuring every core busy.

**A note on the counters themselves.** The first sampler returned `ERR` on every line: Windows
performance-counter *names are localized*, and `'\Processor(_Total)\% Processor Time'` does not exist
on this German-locale machine. It uses the language-neutral `Win32_PerfFormattedData_*` CIM classes
instead. This repository has paid for the localized-output trap before, with `netstat` printing
`ABHÖREN` where a grep expected `LISTENING`.

---

## THE THING NOBODY ASKED: THE CLIFF DID NOT REPRODUCE

**Zero failures in nine runs, across all three arms** — including three unbounded runs at 13 workers,
which is the configuration GATE-CLIENT-CROWDING-2 measured at **14 failures in one three-run arm and
6 in another**.

**The crowding itself is real and does reproduce — as duration, not as failure.** The heaviest test
runs **32.4 s unbounded and 15.1 s bounded**, a 2.1× inflation from worker count alone with nothing
about the test changed. GATE-CLIENT-CROWDING-2 measured the same shape at 2.3× (113,789 → 49,482 ms).
**That half replicates cleanly.** What does not replicate is any test crossing the 5,000 ms line: the
worst ordinary test unbounded is 3,490 ms, still 1,510 ms inside the limit.

**Why the difference is not established here.** The machine tonight was idle and freshly rebooted.
GATE-RED-1 already recorded that one of the original arms was measured "while three other jobs
competed for the machine", and this piece adds that the margin at 13 workers is thin rather than
absent — 1,510 ms — so a moderate amount of competing work would plausibly close it. That is a
hypothesis, stated as one; it was not tested, because testing it means deliberately loading the
machine and that is a different piece.

**And within this session the bound costs wall clock**, which is the opposite of what
GATE-CLIENT-BOUNDED-1 found: mean **172.0 s bounded against 151.5 s unbounded — 13.5% slower**. Their
finding was that the accepted 29% cost "did not appear". Under this session's invocation a cost does
appear, smaller than 29%. **Both can be true**: the invocations differ, and neither number transfers.
It is recorded because the earlier claim is quoted as settled and now has a same-session counterpart
that disagrees.

---

## WHAT THIS DOES AND DOES NOT SAY ABOUT THE BOUND

**It does not say the bound is wrong, and it is not retuned.** What it says:

- The bound's *mechanism* is confirmed. CPU is the contended resource, bounding workers relieves it,
  and the ordinary tests' margin moves from +1,510 ms to +4,211 ms — measured tonight, on this
  machine, in one session.
- The bound's *justification as written* rests partly on a claim that does not hold: the heavy files
  are not "specifically the load".
- The failures that made it urgent could not be reproduced, so **how much margin the bound is buying
  against a real risk is not known from tonight's data** — only that it buys margin.

## CONFORMITY

- GATE-SERIAL-BCRYPT-1's instrument reused; no second timing instrument written.
- `maxWorkers: 4` untouched. No timeout raised, no test skipped or marked slow.
- Both inferences addressed with measurement; where a measurement could not settle something
  (why the cliff did not reproduce), that is said rather than filled in.
- Arms compared only within one session and only on the shared population; the flag was verified to
  apply rather than assumed.
- Discarded and restarted after the machine rebooted mid-chain, as instructed — a fresh output
  directory, nothing carried over. (No partial output existed: this piece had not started when the
  machine died. The files in `c:/tmp/suite-timing` are dated 2026-08-26 and belong to
  GATE-SERIAL-BCRYPT-1; they were left alone.)

## PROPOSALS

**P1 — the config comment should be corrected, and it is a one-paragraph edit, not work.** It states
"fifteen tests that pass beyond 5,000 ms and therefore carry their own extended timeouts — the golden
real-arm comparisons, sim-fairness, replay". The count is 12, `sim-fairness.test.js` is not among
them, and the timeout is `RACE_TIMEOUT_MS` in `goldenCases.js` rather than anything inline. **Not done
here** because editing that file is editing the bound's own home, and this piece was told to explain
the bound rather than touch it.

**P2 (mine) — the interesting experiment is now the one nobody has run: reproduce the cliff on
purpose.** The margin at 13 workers is 1,510 ms and the original failures reached 10,457 ms. If a
known, controlled competing load closes that gap, the bound's value is demonstrated rather than
inferred, and the "how much competing work" answer would tell an operator whether the bound is
protecting them or protecting a machine that no longer exists.
