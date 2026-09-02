# TESTS-WIRED-1 — none of the ten is out by accident, so nothing was wired; and running them anyway found one assertion that has rotted and two that only flaked

> **NOTHING WAS WIRED IN AND NOTHING WAS FIXED.** The ten files are out of every automatic suite by a
> decision that is written down in its own one home. The one real failure is left exactly as it is,
> per the brief's decision rule, and is on the morning sheet.

---

## 1. THE TEN ARE THE PLAYWRIGHT SUITE, AND THEY ARE OUT FOR TWO REASONS AT ONCE

| file | tests | why it is outside a suite |
| --- | --- | --- |
| `client/e2e/d9-smoke.spec.js` | 15 | wrong runner **and** deliberate |
| `client/e2e/d355-smoke.spec.js` | 14 | " |
| `client/e2e/camera-polish-ux-verification.spec.js` | 15 | " |
| `client/e2e/vre-2-ux-verification.spec.js` | 33 | " |
| `client/e2e/d11-ux-verification.spec.js` | 12 | " |
| `client/e2e/b1617-smoke.spec.js` | 6 | " |
| `client/e2e/fix-list-tracks-world-dimensions.spec.js` | 4 | " |
| `client/e2e/garden-path-finishes.spec.js` | 2 | " |
| `client/e2e/quicktest-vs-harness.spec.js` | 1 | " |
| `client/e2e/auth.setup.js` | 3 | " — a fixture project, not a spec |

**Reason one — wrong runner.** They import `@playwright/test`, and `client/vitest.config.js:26`
excludes `e2e/**` by name with the reason in a comment. Nothing accidental: a Playwright spec run by
Vitest would not run, it would error.

**Reason two — deliberately expensive, and it is the owner's decision.** It costs about ten minutes,
roughly five times a whole CI run, and a ten-minute suite gating every merge trains people to re-run
red builds.

**Whose purpose, and where it is written: the owner's, 2026-08-16, and the one home is
`docs/NIGHT-RUN.md`.** Two other places point at it rather than restating it —
`client/playwright.config.js`'s header (*"NIGHT WORK ONLY … The command and the reason live in
docs/NIGHT-RUN.md, which is their one home"*) and `docs/VERIFY-RULES.md` R12a. **So this is a
properly-housed deliberate exclusion, not rot**, and the "if nowhere, that is the finding" branch of
the brief does not fire.

---

## 2. ★ NOTHING IS OUT BY ACCIDENT, AND THAT IS PROVEN RATHER THAN ASSUMED

The interesting question was not the ten — it was whether a *different* file is out by accident: one
that no runner picks up, which would look exactly like a passing test.

**Method: diff every tracked test-shaped file against the union of what each runner itself reports.**
Not against a glob written here — against each runner's own answer, which is the only thing that
cannot be wrong about its own discovery.

| set | how it was obtained | count |
| --- | --- | --- |
| tracked test-shaped files | `git ls-files` filtered to `*.{test,spec}.{js,jsx,mjs,cjs,ts,tsx}` | **311** |
| client vitest | `npx vitest list --filesOnly` in `client/` | 232 |
| server vitest | `npx vitest list --filesOnly` in `server/` | 30 |
| scripts suite | `git ls-files scripts` filtered to `*.test.mjs` — the set `verify` uses | 40 |
| Playwright | `npx playwright test --list` | 10 files, **106 tests** |
| **union** | | **312** |

**Discovered by no runner: ZERO.**

The union exceeds the file count by exactly one, and that one is `client/e2e/auth.setup.js` —
correctly reported by Playwright as its `setup` project and correctly absent from a `.test`/`.spec`
glob because it is neither. **Every tracked test file is discovered by exactly one runner.**

Spot-checks for the shapes that would hide an accident, all empty: a `*.test.js` under `scripts/`
(whose runner wants `.test.mjs`), a `*.test.mjs` under `client/src` or `server/`, and a `*.spec.js`
anywhere outside `client/e2e/`.

**So nothing was wired in. There was nothing to wire.** The brief's decision rule — *if wiring one in
turns a suite red, do not fix it and do not silence it* — never bit, because no wiring happened.

---

## 3. THE SUITE WAS RUN ANYWAY, BECAUSE THIS IS THE NIGHT

`npm run test:e2e`, one run, **4.6 minutes**: **103 passed, 3 failed** of 106.

### Two of the three are flakes, and that was established rather than assumed

`d11-ux-verification.spec.js:108` and `d355-smoke.spec.js:69` both failed in the full run and **both
passed on an immediate re-run of just those two files — 27 of 27 green in 1.3 minutes.**

Two flakes in one run sits exactly on the recorded rate: NIGHT-RUN.md prices the residual at *"about
two tests per five runs"*. **One run cannot separate a broken assertion from an unlucky one** — the
re-run is what separates them here, and even so this is two observations, not five.

### The third is not a flake. It is a deterministic arithmetic comparison, and it has rotted.

```
garden-path-finishes.spec.js:31 — the product's own estimate for this track exceeds the harness ceiling
    Expected: > 200
    Received:   71
```

**What the spec asserts.** It was written on 2026-08-25 to settle GARDEN-PATH-NO-FINISH-1: read
garden-path's own estimated duration off the setup screen and show it exceeds the harness's 200 s
ceiling, proving *"the harness is cutting a race the product considers ordinary"*.

**What the product now says**, logged by the spec itself in a real browser tonight:

| laps | the product's own estimate |
| --- | --- |
| 1 | 35 s |
| 2 | **71 s** — the harness's own lap count |
| 3 | 106 s |
| 4 | 141 s — the track's default |

**Every one is under 200 s.** In the spec's own words, embedded in the failing assertion: *"if the
product estimated UNDER the ceiling, the ceiling could not be the cause."*

**Why it rotted, and this is the night's own pattern again.** `GARDEN-PATH-DEFAULTS-1` (`d73ec6a9`,
2026-08-25) changed garden-path's `defaultRacerTypeId` from `snail` to `beetle`. A faster racer
covers the same laps in far less time, and the estimate fell under the ceiling. **A statement true
when written, left standing while the thing it described moved underneath it** — piece 4's shape, in
a test rather than a comment, and the seventh instance of it in four days.

**AND THE SPEC'S SECOND TEST PASSED.** Garden-path finishes in the browser, measured tonight:

```
[garden-path] field=20 FIRST CROSSING after 121.3 s of wall clock; 11 finish time(s) on the scoreboard
```

So the file now contains one test asserting a premise that is false and one test confirming the
behaviour it was written to defend. **Left exactly as it is**, per the decision rule. It is piece 11's
evidence, and it has been handed to that piece rather than repaired here.

---

## 4. WHAT THE SPECS ASSERT — and one that deliberately asserts nothing

`quicktest-vs-harness.spec.js` passes and asserts nothing, on purpose: *"an assertion here would be a
conclusion smuggled into the evidence."* It dumps what the browser actually puts in
`sessionStorage.activeRace`, which is the browser half of the harness-versus-product comparison. Its
output tonight, for river-run seed 13, is in the run log and has been handed to piece 11. **A spec
that reports rather than asserts is not a defective test**; it is evidence with a runner, and the
census counting it as "asserts nothing" is accurate but reads as a criticism it does not deserve.

---

## 5. A DOCUMENT CLAIM THAT IS NOW FALSE — flagged, not fixed here

`docs/NIGHT-RUN.md` states the suite is **"103/103 green"** (2026-08-17).

Tonight it is **106 tests**, of which 103 passed. **The numerator is still 103 and it now means
something completely different** — the figure reads as a pass because the count on the left stopped
moving while the count on the right did. Two specs were added on 2026-08-25/26 and the sentence did
not notice.

The honest current statement, from tonight's two runs: **105 of 106 can pass; one fails
deterministically.** Correcting the sentence belongs to piece 10 of this chain, which owns document
claims about the tree, and it is left for it rather than fixed twice.

---

## Limits

**Two runs, not five.** NIGHT-RUN.md's own Lesson 211 says it took five runs to characterise the
flake mechanism. This piece ran the full suite once and the two suspect files once more. That is
enough to call `garden-path-finishes.spec.js:31` deterministic — it is arithmetic on a number read
from the page — and it is **not** enough to claim the other two are the *known* flake mechanism
rather than a new one. They flaked; their mechanism was not established.

**The suite ran while the owner's dev API (4000) and production build (4173) were up.** That is by
design — the e2e instance brings its own API and Vite on 4399/5399 with its own temp data directory —
and nothing on those ports was touched. It does mean the machine was loaded, which is the condition
the flake rate was measured under anyway.

**"What each spec asserts" is not enumerated file by file.** 106 tests were run and their names are
in the run log; summarising all of them here would restate the suite rather than report on it.

**No claim is made about whether these ten SHOULD be wired in.** The brief asked which are out by
accident. None is. Whether ten minutes should gate a merge is the owner's 2026-08-16 decision and is
untouched.
