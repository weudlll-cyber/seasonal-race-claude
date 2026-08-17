# CI-DOCS-ONLY-1 — CI stops paying for what it cannot affect

**Branch:** `ci/docs-only-skip`, off master `0877d523`. **No production file changed.** One workflow,
one new script, one new test file.

---

## WHAT "GREEN FOR EXACTLY THE MERGE SHA" MEANS NOW — ANSWERED FIRST, BECAUSE IT DECIDED THE DESIGN

**It means exactly what it meant before.** All three jobs still run on every push and every one still
reports a conclusion for the SHA. What is conditional is the **work inside** a job, not the job.

**That distinction is the whole piece, and the obvious approach fails on it.** A workflow-level
`paths:` / `paths-ignore:` filter does not skip a job — **it produces no run at all for that SHA**.
The ceremony's own command is:

```bash
gh run list --branch master --limit 1 --json headSha,databaseId,status,conclusion
```

With no run for the new commit, that returns **the PREVIOUS commit's run** — green, completed, and
about a different tree. The rule would not merely be weakened, it would be **silently unverifiable**,
and it would look verified. The brief said do not do it if that happens; this is the shape it would
have taken, so it was not done.

**Step-level skipping keeps every property the rule depends on:** a run exists, three jobs exist,
each has a conclusion, `gh run watch --exit-status` still means something, and the log names what was
skipped and why.

### What green means, in one sentence a tired reader can hold

> **Green still means "every job examined this commit."** On a documentation-only commit it
> additionally means "and the parts that could not have been affected were not re-run — listed by
> name in the log."

### The one thing that genuinely got smaller, stated rather than glossed

On a docs-only push, `npm run lint`, `npm run format:check`, `npm run test:coverage` and
`npm test` (server) do not run. **If one of them would have failed for a reason unrelated to the
diff — a flaky test, a dependency resolving differently — that push will not discover it.** The next
push that touches code will. That is the trade, and it is the only one.

**What did NOT get smaller, deliberately:**

- **Both security audit gates still run on every push, in both trees.** Their result is *not*
  determined by the diff — a HIGH advisory can appear upstream on a day nobody pushed anything —
  so skipping them would break the brief's own rule ("skipped only when no changed path could
  possibly affect it"). They cost **1 second each**. The server's `npm ci` is kept for the same
  reason: `audit-schedule.yml` states that its verdict must match this gate's, and this gate audits
  an *installed* tree.
- **The whole `docs` job**, which is never skipped in either direction — see below.

---

## THE DOCS JOB IS NEVER SKIPPED, AND THAT IS THE LOAD-BEARING PART

It looks like the job a docs-only push obviously needs. It is also **the job that can never be
skipped for a CODE push**, because its guards read the *whole tree* rather than `docs/`:

| guard | what it actually scans |
| --- | --- |
| `check-language-closed` | `client/`, `server/`, `scripts/`, `docs/`, `.claude/` |
| `check-fingerprints` | every tracked file, for a copied current fingerprint |
| `check-config-claims` | `docs/` + `reports/` **against `defaults.js`** |
| `script-suite` | every `scripts/**/*.test.mjs` |

So it is unconditional in both directions, and that is what guarantees **every push has at least one
job that really examined it**. A run always exists and always means something.

---

## THE RULE, AND WHY IT IS DELIBERATELY BLUNT

A push is documentation-only when **every** changed path is under `docs/`, under `reports/`, or is a
markdown file **at the repository root**. Nothing else qualifies.

**No per-tree cleverness.** "Nothing under `client/` changed, so skip the client" sounds narrower and
is far more dangerous: it has to be right about every indirect dependency — whether a client test
reads a root file, whether `shared/` reaches both trees, whether a script the suite imports moved —
and being wrong produces **a green run that examined nothing**, which is the exact defect class the
last two nights were about. A docs-only predicate cannot make that mistake: if anything outside those
three places moved, everything runs.

`client/README.md` is deliberately **not** a doc path. Being over-inclusive costs a test run; being
under-inclusive costs a silent green.

### It fails open, on every uncertainty

`false` (= run everything) is returned, with the reason printed, for: no base SHA, an all-zero base
(first push / new branch), a base that no longer exists after a force push, any git failure, an empty
file list, and `workflow_dispatch` — which has no range at all. **The only way to get `true` is a
diff that was computed successfully, is non-empty, and is entirely documentation.**

---

## THE MEASURED SAVING — REAL RUNS, NOT ESTIMATES

Per-step timings from run `32005715842` (the QUIET-FAILURES-1 merge), read from the API:

| step | cost |
| --- | --- |
| client: checkout + setup + `npm ci` | **13 s** (cache warm) |
| client: ESLint | 17 s |
| client: Prettier | 7 s |
| **client: `npm run test:coverage`** | **2 m 51 s** ← the entire reason for this piece |
| client: audit gate | **1 s** |
| server: checkout + setup | 10 s |
| **server: `npm ci`** | **1 m 26 s** |
| server: `npm test` | 39 s |
| server: audit gate | **1 s** |

**The three jobs run in PARALLEL, so a run costs the SLOWEST job, not the sum.** That is what bounds
the saving, and it is why the honest number is smaller than "three minutes of tests".

### The two real examples the brief asked for

| merge | what it touched | wall clock BEFORE | AFTER | saving |
| --- | --- | --- | --- | --- |
| **`7c2a27eb`** — the census merge | `reports/` only | **3 m 25 s** | **≈ 1 m 40 s** | **≈ 1 m 45 s** |
| **`0877d523`** — QUIET-FAILURES-1 | `client/` + `reports/` | **3 m 36 s** | **3 m 36 s** | **0** |

*(BEFORE figures are measured. AFTER for `7c2a27eb` is computed from the measured step timings that
remain: the server job becomes the long pole at ≈ 1 m 40 s — checkout + setup + the 1 m 26 s install
it keeps for the audit gate — with docs at 1 m 25 s just behind it.)*

**A second docs-only run agrees**: `15b6f465` measured 3 m 31 s (client 3 m 28 s, server 2 m 32 s,
docs 1 m 26 s), and lands in the same place.

### The honest cost on every OTHER push

Two jobs now check out at `fetch-depth: 0` instead of depth 1, and each runs one extra node process.
**Measured proxy: the docs job has used `fetch-depth: 0` since ONE-TRUTH-2 and its checkout step
costs 3 s.** So the added cost is a few seconds on the runs that save nothing — paid on every code
push to save ~1 m 45 s on every documentation push.

**Whether that trade is worth it is the owner's call, and it is a close one.** The saving is real but
it is *one minute forty-five*, not the three-and-a-half minutes the raw test duration suggests, and
the piece buys it by adding a conditional to a file where a mistake is expensive. The full argument
for reverting is one `git revert`; nothing else depends on this.

---

## THE TEST, AND WHAT BREAKS IF IT IS DELETED

`scripts/ci-docs-only.test.mjs` — 9 assertions over the pure predicate.

**If it is deleted, the thing that decides whether CI runs the suites stops being checked in the one
direction that matters.** A bug making it return `false` too often costs three minutes. A bug making
it return `true` too often produces **a green run that tested nothing, on a SHA the ship ceremony
then treats as verified**. Both directions are asserted, and each fail-open case is asserted
individually because each is a separate way for the answer to be unknown.

The last test is written as a **property**, not an instance: *no input shape other than a computed,
non-empty, entirely-documentation diff may return `true`.*

It is picked up automatically — `git ls-files scripts | grep '\.test\.mjs$'` went 34 → 35, and CI
asserts that list is non-empty before running it.

---

## VERIFICATION

**No fingerprint is owed**, by closure walk: none of `.github/workflows/ci.yml`,
`scripts/ci-docs-only.mjs` or `scripts/ci-docs-only.test.mjs` lies inside `fingerprint-default`'s 36,
`camera`'s 36 or `render`'s 55. No production file changed at all.

**CI WAS GREEN ON THE BRANCH BEFORE THE MERGE.** Not optional here: VERIFY-RULES R8 exception 1 — a
change to CI cannot be cleared by a local run, which would be marking its own homework. The branch
was pushed, a PR opened purely to trigger CI, and the merge is the local `--no-ff` commit
MERGE-AND-GUARD-1 requires.

**And the branch itself is the first proof the predicate works in the real trigger**, since a branch
touching `.github/` and `scripts/` is *not* documentation-only and must run everything.

---

## SOURCE HYGIENE

| file | change |
| --- | --- |
| `.github/workflows/ci.yml` | +76 −9 — two scope steps, five `if:` conditions, two "what was skipped" steps, and the header sentence defining green |
| `scripts/ci-docs-only.mjs` | **new**, ~110 lines, mostly the reasoning |
| `scripts/ci-docs-only.test.mjs` | **new**, 9 tests |
| `reports/evolution/CI-DOCS-ONLY-1.md` | this |

Tests added: 9. Tests deleted: 0. No guard was added — this is not a guard, it is a scheduling
predicate, and R13's question ("which existing guard already looks at that ground?") has no candidate
because no guard decides what CI runs.

### Noticed but left

- **`deploy.yml.disabled`** sits beside the two live workflows. Not touched, not investigated.
- **The `docs` job installs acorn on every run** (`npm ci --omit=optional --ignore-scripts`) for one
  guard. It is unconditional like the rest of that job and was not measured separately here.
- **`workflow_dispatch` always runs everything**, because it carries no diff range. That is the
  fail-open path and it is correct, but it does mean the hand crank is always the expensive form.

---

## PROPOSALS

### Proposal A — decide whether this piece is worth keeping, with the number in front of you

**≈ 1 m 45 s per documentation-only push, 0 on every other push, and a few seconds added to all of
them.** That is the whole trade, now measured rather than assumed. If the answer is "not worth a
conditional in CI", `git revert` of this one merge restores the previous behaviour exactly and costs
nothing else — nothing depends on this. **The reason to state it this bluntly is that the piece was
built to a brief that assumed the saving was larger than it is.**

### Proposal B — make the server's `npm ci` the next target, not the tests

The server job's install is **1 m 26 s** and its tests are **39 s**. After this piece the install *is*
the server job, and on a docs-only push it is the long pole that keeps the run at 1 m 40 s instead of
1 m 25 s. `actions/setup-node`'s npm cache is already configured with
`cache-dependency-path: server/package-lock.json`, so the 1 m 26 s is worth one look at whether the
cache is actually hitting — the client's equivalent step takes **4 s**. A cold cache on one tree and
a warm one on the other is the likeliest explanation and the cheapest possible fix.

### Proposal C — put the e2e suite behind the same predicate rather than outside CI entirely

R12a keeps the ten-minute browser suite out of the per-push path for a good reason, and this piece
does not change that. But the machinery now exists to run a job **only when it could be affected**,
and the e2e suite is the one place where ten minutes is occasionally worth paying automatically —
for example on a push that touches `client/src/screens/`. Not proposed for the per-push path; offered
as the shape a future decision could take, now that skipping is a thing this repository can do
honestly.
