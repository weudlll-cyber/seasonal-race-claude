# WIRE-SUITES-1 — the two suites that ran nowhere, and the growth rule

**Branch `feat/wire-suites`, off master `cdaa4f85`.** CHECK-AUDIT-1 found 19 server test files and 7
Playwright e2e files that no invoker ran — not the hook, not `npm run verify`, not CI. **They looked
like coverage and were none.**

**Both were run before anything was wired. One is green and is wired; one is 83% red and is not.**

---

## Run first — the results as they stand on master

### Server suite — GREEN

```
$ npm --prefix server test          (vitest run --no-file-parallelism)

 Test Files  19 passed (19)
      Tests  615 passed (615)
   Duration  41.81s
```

**615 of 615, first run, no edits.** Re-run through the exact command verify builds: 39.26 s.
Wall clock including npm overhead: **43 s**, which matches the audit's 44 s.

### E2E suite — 85 of 102 FAILED

```
$ npx playwright test --timeout=30000

  17 passed, 85 failed (10.7m)
```

An unbounded first attempt was killed at 10 minutes; the number above is from a run with a 30 s
per-test cap, so **10.7 minutes is a floor, not the natural cost**.

| spec file | passed | failed |
| --------- | -----: | -----: |
| `camera-polish-ux-verification.spec.js` | 16 | 15 |
| `d9-smoke.spec.js` | 1 | 21 |
| `vre-2-ux-verification.spec.js` | 0 | 16 |
| `d355-smoke.spec.js` | 0 | 14 |
| `d11-ux-verification.spec.js` | 0 | 12 |
| `b1617-smoke.spec.js` | 0 | 4 |
| `fix-list-tracks-world-dimensions.spec.js` | 0 | 3 |

**Every one of the seven spec files has failures.** 144 timeout lines; every failure is a 30 s
timeout waiting for a control that never appears.

### Why the e2e suite fails — a finding, not a fix

**The 16 tests that pass in `camera-polish` are pure `page.evaluate` arithmetic** — clamp maths, zoom
factors, top-N selection. They never touch the UI. **Every test that navigates and clicks fails**,
and they fail identically:

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /Race Defaults/ })

  > 19 |     await page.goto('/dev');
       |     await page.getByRole('button', { name: /Race Defaults/ }).click();
```

**The app grew an auth gate and the specs never learned about it.** `client/src/App.jsx` wraps every
route in `<ProtectedRoute>`; `client/src/components/ProtectedRoute.jsx` landed in **`2538f6c7`,
2026-06-14** ("ProtectedRoute + per-route role matrix gating"). Not one spec logs in, so `/dev` and
`/setup` redirect to `/login` and the tests wait 30 s for a control on a page they were never shown.

**The newest e2e spec is `3e756a31`, 2026-08-06 — nearly two months after the gate.** The suite has
been dead that whole time and nothing said so, because nothing ran it.

**Nothing was edited to make any of this pass**, per the brief. Whether the fix is a login step in a
Playwright `storageState` fixture or something else is the owner's call; it is a real piece of work,
not a line.

---

## What was wired, and what was not

### Server suite → CI and `npm run verify`. NOT the hook.

**CI: its own job**, `Server tests`, beside `client` and `docs` rather than a step inside one of
them. The two suites share nothing — different package, different vitest config, different install —
and a job that installed the client to test the server would be lying about what broke.

**Verify: routed by declaration**, as a third entry in `SUITE_GUARDS` next to `client-suite` and
`script-suite`. No hand-maintained list of names: one of those was found by this audit and removed
the night before for exactly this reason.

```
server/index.js      -> check-language-closed, server-suite
server/package.json  -> check-language-closed, server-suite
client/src/App.jsx   -> …, client-suite            (unchanged)
```

`dirs: ["server/"]`, **not `server/src/`** — the package manifest and vitest config decide how the
suite RUNS, and naming the source subdirectory is the miss `client-suite` already paid for twice.
Learned from its comment rather than repeated.

**`exclusive: false`, unlike `client-suite`.** That flag exists because the client suite saturates
the machine for ~200 s. This one is 42 s and its `--no-file-parallelism` already pins it to a single
worker, so it is the cheapest thing in the run to overlap with a fingerprint.

**It is invoked as `npm test` in `server/`, not by spelling out vitest**, so the suite keeps one
definition of how it runs. `--no-file-parallelism` is the server package's own flag — the suite
writes a real sqlite session store and files sharing it cannot run concurrently.

### Not the hook, and the hook's own header is the argument

The pre-commit hook says it in writing: *"Only guards costing well under a second are here — the
suites and the fingerprints belong to `npm run verify`, not to every commit."*

Three reasons, in order of weight:

1. **42 s against a ~5 s hook.** The seven fast guards run in parallel and the whole hook is a few
   seconds. Adding 42 s makes every commit **an order of magnitude** more expensive.
2. **The hook has NO routing.** It runs a fixed list regardless of the diff — that is why it is
   fast and simple. So the server suite there would run on every commit, including the many that
   touch nothing under `server/`. Verify routes; the hook does not.
3. **The precedent is already set and is the right one.** The 200 s client suite is excluded for
   exactly this reason. A hook people start bypassing with `--no-verify` protects nothing, and that
   is the failure mode this repository has been careful to avoid.

### E2E — not wired, and the trigger question answered anyway

**It is red, so the condition in the brief ("CI only if it is green") is not met and nothing was
built for it.** But the judgement was asked for, so it is on the record:

**Even if it were green, I would not run it on every push.** 10.7 minutes is 5× the entire current
CI wall clock, against a `client` job of ~2 minutes. That is a nightly or a
`workflow_dispatch`/label-triggered job, not a per-push gate.

**The alternative I dropped:** an every-push e2e job with a shard matrix — Playwright shards well and
four shards would bring it to ~3 minutes. Dropped because the cost is not really wall clock, it is
**flake budget**: a browser suite that gates every merge trains people to re-run red builds, and this
repository already has a rule about checks nobody believes. A narrower trigger keeps the signal
honest.

**The decision is recorded in executable form.** `verify.test.mjs` now asserts that
`client/e2e/smoke.spec.js` routes to the language guard **and nothing else** — so wiring the e2e
suite fails a test, and whoever does it has to justify it rather than slip it in.

---

## The growth rule — R13, documentation only

Added to `docs/VERIFY-RULES.md` in the numbered form the file uses: **a new truth that needs
protecting gets a rule inside an existing guard, not a new guard script**, and taking the new-script
route means saying in the commit message which existing guard was considered and why it could not
host the rule.

**The counter-example is the interesting half and is recorded as such.** `check-config-claims`,
`check-doc-facts` and `check-fingerprints` all scan the same living documents for a forbidden kind of
string and were deliberately NOT merged: three narrow guards each fail loudly about one thing, a
merged guard fails about "documents"; a merged guard can be **half-disabled without anyone noticing**
when one mode's anchor breaks — and **this repository has shipped that shape twice**; and their blind
lists differ, so one declaration would have to state the union, which is where a hole hides.

**No guard was built for R13, and the rule says so in itself** — a checker enforcing "no new
checkers" would be the 30th check, whose entire subject is that there are 29. It is enforced at
review time, in the commit message.

---

## The two true-again fixes

**`scripts/check-doc-links.mjs`** declared `covers: "a relative link in a living doc OR REPORT"`
while `isLivingDoc` excludes `reports/` by design. **The `covers` sentence claimed ground the code
never looked at, which is the one thing a declaration must not do.** Corrected, and a `blind` entry
now names the exclusion.

**`dirs: ["docs/", "reports/"]` STAYS, and that is not an inconsistency.** `dirs` is a **routing**
statement — which changed paths select the guard — and it is a different question from which files
get **scanned**. Reports are never scanned, but they are link TARGETS: **88 links in the living docs
point into `reports/`**, and deleting or renaming a report makes those dangle. A guard that did not
run when reports changed would miss its most likely real failure. The comment now says so.

**Can a cheap test hold declaration and runtime scope together?** **Not as equality — that assertion
would be wrong**, as the 88 links show. The true property is one-directional: *every directory the
guard SCANS should be inside its declared `dirs`*, so a guard cannot read ground it never routes on.
That is cheap and correct, and it needs a mechanism that does not exist: the guard would have to
EXPORT its scan predicate for a test to compare against the declaration. **Proposed below, not
built.**

**`package.json`'s description** said the root "manages git hooks via Husky". Husky was removed last
night. Now: *"owns the tracked git hooks (`.githooks/`, see docs/VERIFY-RULES.md R12), the guard
scripts and npm run verify"*.

---

## Fingerprints

```
$ node scripts/engine-reach.mjs --check .github/workflows/ci.yml scripts/lib/routing.mjs \
      scripts/verify.mjs scripts/verify.test.mjs scripts/check-doc-links.mjs \
      docs/VERIFY-RULES.md package.json
ENGINE REACH: none of 7 path(s) can reach the race engine.        (exit 1)
```

**None of the four can move.** CI wiring, test invocation, routing declarations and documentation are
outside every instrument's closure, and nothing was measured beyond that. The server suite in
particular can never speak to a fingerprint — the server neither imports nor drives the race engine,
which is now written into its declared `blind` list.

## Hygiene

| file | before | after |
| ---- | -----: | ----: |
| `.github/workflows/ci.yml` | 183 | 218 |
| `scripts/lib/routing.mjs` | 319 | 340 |
| `scripts/verify.mjs` | 622 | 634 |
| `scripts/verify.test.mjs` | 739 | 750 |
| `scripts/check-doc-links.mjs` | 105 | 114 |
| `docs/VERIFY-RULES.md` | 423 | 460 |
| `package.json` | 17 | 17 |

**Removed:** nothing — this block wires what already existed. **Extracted:** `routesTo(f)` in
`verify.test.mjs`, one helper replacing the filter that was copied into three routing tests.

**Noticed and deliberately left alone:**

1. **The e2e suite is dead and stays dead.** Repairing it means teaching seven spec files to
   authenticate — a real piece of work, and the brief forbids editing tests to make them pass.
2. **`.github/workflows/deploy.yml`** — CHECK-AUDIT-1 flagged it as looking live while documented as
   dormant. Out of scope here; it is neither of the two suites.
3. **`check-index` is red in the working tree**, and it is not this change: an untracked
   `reports/evolution/CHECK-AUDIT-1.md` sits unindexed pending owner action. It is untracked, so it
   is not in this commit and CI — which checks out the committed tree — is unaffected.
4. **The server suite's 615 tests were not read.** They pass; whether they test the right things is a
   different question and a much larger one.
5. **`client/e2e/` still contains three non-spec directories** (`camera-look-comparison`,
   `camera-pan-diagnostic-output`, `render-smoothness-output`) — diagnostic output, not tests.

---

## PROPOSALS

1. **Give a guard a `scans()` export, and test it against its own `dirs`.** This is the mechanism the
   `check-doc-links` question needs. Today a declaration can claim ground the code never reads, and
   the only reason we know about this one is that a human audited it. If each guard exported the
   predicate it actually scans with, one shared test could assert `scanned ⊆ declared` for every
   guard at once — the one-directional property that is true by design — and the class of defect
   CHECK-AUDIT-1 found by hand would be found by the suite. Note that under **R13** this belongs
   inside `verify.test.mjs`'s routing tests, not as a new `check-*.mjs`.

2. **Fix the e2e suite with a `storageState` fixture, and wire it nightly.** One Playwright global
   setup that logs in once and saves the session would very likely turn most of the 85 failures
   green — they all fail at the same gate. That is a bounded piece of work with a clear success
   measure (85 → few), and a nightly `schedule:` trigger would put it in the pipeline at a cost
   nobody has to argue about. **The suite's value is highest exactly where the unit tests are
   blindest: the auth gate itself.**

3. **Delete the three diagnostic output directories under `client/e2e/`, or move them.** They are not
   tests, they sit in the directory Playwright's `testDir` points at, and they make the e2e surface
   look larger than it is. The audit counted 7 spec files; the directory has 10 entries.

4. **Put the server suite's own count in the CI step name.** `Server tests` says nothing; a step that
   printed `19 files / 615 tests` in its name or summary would make a silent shrink visible. The
   client suite has the same hole — 208 files, and nothing notices if it becomes 200.
