# DELIVERY-BROWSER-GATE-1 — a browser in the automatic judgement, proven stable before it was allowed to block

> **In one sentence: a real browser now runs automatically on every push to master and once a day —
> it builds the production client and drives 82 tests through it — so this project's automatic
> statements about itself are no longer made with the browser missing; it covers 7 of the 19 e2e
> specs, and the other 12 are still night work on purpose.**

**Branch `feat/delivery-browser-gate-1`, off master `616f6ea8`. 2026-09-23.** The third of the four
delivery blockers NIGHT-2026-09-24 named is closed — narrowed, precisely, rather than struck. The
fourth, no public address, is untouched.

---

## 1 · GROUND TRUTH, AND ONE WORDING CORRECTION

| claim | verdict |
|---|---|
| `playwright.prod.config.js` serves a PRODUCTION build (PROD-ARM-1) | **TRUE** — one process, server serving the built client and the API on one origin; it needs no build-time API address since RUNTIME-API-URL-1 |
| `client/package.json` defines `test:e2e:prod` and `test:e2e:prod:fast`, the fast one naming a curated set | **TRUE** — 7 named specs. **Reused, not re-chosen** |
| `ci.yml` triggers on push and pull_request against main/master only | **TRUE** — plus a `workflow_dispatch` hand crank |

★ **A wording correction to the brief, which does not change anything it asked for.** The brief says
`playwright` appears in `.github/` "only inside two comments". **`playwright` appears there
nowhere** — `grep -rni` returns no hits. What appears in two comments is **`e2e`**:
`audit-schedule.yml:18` and `ci.yml:145`. NIGHT-2026-09-24's stronger claim was the accurate one.

★ **One more fact worth having, found while reading the config:** `playwright.prod.config.js:78`
already sets `retries: 0`. The brief's "no retries are configured in the gate" is therefore satisfied
by **not overriding** the existing config, not by adding anything.

---

## 2 · WHY IT IS ITS OWN WORKFLOW — the precedent, followed rather than worked around

`audit-schedule.yml:18` states the decision this block had to respect: a scheduled or slow job must
not be able to turn master red for something nobody triaged, *"the same reasoning that … keeps the
ten-minute e2e suite out of the per-push path."*

**That sentence is still true and this workflow does not contradict it.** The two separations are
lifted from it:

1. **Its own workflow.** A browser job inside `ci.yml` would file every browser result under the CI
   workflow, so "CI failing" would mean two different things depending on what failed. `CI` still
   means exactly "the checks for a commit somebody pushed", and the per-push path is as fast as it
   was yesterday.
2. **The scheduled path cannot go red.** On the clock, a failure files an issue and the run stays
   green. **Only a push — which somebody caused — may fail the run.** The split lives in the `if:`
   on the last two steps.

**Not `pull_request`, and not every branch**, because these specs exercise the SERVED artefact, and a
branch that has not been merged has not produced one.

---

## 3 · ★★★ THE FIVE STABILITY RUNS, INDIVIDUALLY

A gate that flaps is worse than no gate: it teaches everyone that red means nothing, which is the
exact failure the precedent warns about. So it was run five times on a Linux runner against an
**unchanged tree** before being allowed to block anything.

Run `35903843784`, attempts 1–5, commit `b84b5289`, **no retries**:

| # | attempt | started (UTC) | finished (UTC) | wall clock | result |
|---|---|---|---|---|---|
| 1 | 1 | 18:38:16 | 18:42:02 | **3m46s** | ✅ success |
| 2 | 2 | 18:43:01 | 18:46:58 | **3m57s** | ✅ success |
| 3 | 3 | 18:47:44 | 18:51:52 | **4m08s** | ✅ success |
| 4 | 4 | 18:52:23 | 18:55:23 | **3m00s** | ✅ success |
| 5 | 5 | 18:56:00 | 19:00:06 | **4m06s** | ✅ success |

**5 of 5 green. 82 tests each run.** By the decision rule the gate therefore **BLOCKS**: a push to
master that breaks the browser fails the run.

★ **What would have happened otherwise, stated because it did not happen.** Any failure would have
shipped the gate **report-only** with the failing spec named and its output quoted. Narrowing the set
until nothing could fail was never available, and nothing was dropped: the gate runs the curated set
exactly as `client/package.json` already defined it.

★ **The five runs needed a temporary push-trigger entry for the branch**, because
`workflow_dispatch` cannot reach a workflow that is not yet on the default branch — verified, HTTP
404. It was removed before the merge and the workflow header records that it existed.

---

## 4 · WHAT IT COSTS

Phase timings from attempt 5, printed by the job itself into the run summary so nobody has to guess
later:

| phase | seconds |
|---|---|
| install server dependencies (**compiles the native modules**) | **94** |
| install client dependencies | 3 *(npm cache warm)* |
| install chromium + system dependencies | 23 |
| build the client | 2 |
| **run the curated fast set (82 tests)** | **105** |
| **total job** | **≈ 4 minutes** |

★ **The per-push CI path is untouched at roughly two minutes.** This runs beside it, on master only.

---

## 5 · ★★ THE NATIVE MODULES BUILD AND LOAD ON LINUX

NIGHT-2026-09-24 proved a clean checkout builds on **one** machine — one Windows, one toolchain — and
named Linux and ARM as untested, which is exactly where `bcrypt` and `better-sqlite3` would bite.

The gate runs `npm ci --prefix server` on `ubuntu-latest` every time, and then **proves the modules
load** rather than merely install — a prebuilt binary that does not match the runtime still installs.
From run `35903843784`:

```
OK   bcrypt loaded on linux/x64
OK   better-sqlite3 loaded on linux/x64
```

★★ **This closes the Linux half of the clean-machine question, and closes it permanently rather than
once**: it is re-established on every push to master and every night, not asserted in a report.
**ARM remains untested** and nothing here changes that.

---

## 6 · HOW A FAILURE REACHES SOMEBODY

**Reused from `audit-schedule.yml` rather than written a second time**, including two things that
were learned the hard way there:

- **list-and-filter, not `--search`** — GitHub's issue search index lags writes by up to a minute, so
  a search can miss an issue the workflow itself just opened, and missing it means opening a second.
- **CRLF-stripping before the dedup diff** — GitHub stores issue bodies with carriage returns, so
  without it every day looks like a change.

| what failed | what happens |
|---|---|
| a **scheduled** run | an issue with the fixed title *"Browser gate: the production arm is failing"* is opened; if it is already open and says the same thing, nothing; if it says something different, one comment; when the gate goes green, a closing comment and the issue closes. **The run stays green.** |
| a **push to master** | the run FAILS. Somebody caused it and the red build is the signal they will see. No issue. |
| the **job itself** (checkout, install, build) | the run fails on either trigger — that is the one failure mode a report-only path cannot report on its own |

---

## 7 · THE DOCUMENTS THAT NOW SAY SOMETHING FALSE

- **`docs/VERIFY-RULES.md` R12a — QUALIFIED, NOT DELETED.** Everything it says about the per-push
  path and about `verify` is still exactly true, and **its guard is untouched**:
  `scripts/verify.test.mjs` still requires that `client/e2e/*` selects no suite, and it still passes
  **53/53**. The rule now also records that a curated subset runs automatically elsewhere, that the
  fast set is about two minutes against the full suite's ten, and that the gate was proven before it
  was allowed to block.
- **R15c gains one line**, because "the browser gate" now names two things: the night-work gate a
  person decides to run, and the automatic one. A documentation change still pays nothing by hand,
  **and** the automatic gate still runs on it — both intended, and now both written down.
- **`docs/OPEN.md` — narrowed, not struck.** The blocker row now says what is closed and what is
  not, with the run id as evidence. **Stating the closure as wider than it is would be the same
  error the night run was commissioned to correct.**
- **`docs/OPEN.md`'s clean-machine caveat** gains the Linux closure, with the observed output, and
  keeps ARM open.
- **`audit-schedule.yml:18` is left exactly as it is.** Its sentence is true about the per-push path,
  which is the path it is talking about.

---

## 8 · WHAT THIS DOES **NOT** COVER

- ★★ **12 of the 19 e2e specs are outside the gate.** It runs the 7 in `test:e2e:prod:fast`:
  `quicktest-vs-harness`, `b1617-smoke`, `fix-list-tracks-world-dimensions`, `d355-smoke`,
  `d11-ux-verification`, `vre-2-ux-verification`, `camera-polish-ux-verification`. **The other 12
  remain night work by R12a** and a regression only they would catch still reaches master green.
- **It does not run on `pull_request` or on feature branches.** A browser regression is caught **at**
  master, not before it arrives. That is deliberate — the per-push path stays fast — and it is a real
  limitation, not a detail.
- **ARM is untested.** The gate is `ubuntu-latest`, x64.
- **It runs the PRODUCTION arm only.** The dev arm tests a different artefact and is not run here.
- **Five runs is five runs.** It is enough to refuse an obviously flaky gate and not enough to
  measure a one-in-fifty flake. The first months of real runs are the actual evidence, and the
  workflow keeps every transcript for 14 days so that evidence is readable.
- **Nothing here judges the specs themselves.** Whether those 82 tests assert the right things is a
  different question from whether they run.
