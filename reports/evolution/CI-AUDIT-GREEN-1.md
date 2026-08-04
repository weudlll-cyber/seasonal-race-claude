# CI-AUDIT-GREEN-1 — the pin that blocked its own repair

**Date:** 2026-08-04 · **Branch:** `master` (no branch — two-line dependency fix, red CI to clear)
**Commits:** `5b23bf93` (undici, lockfile only) → `028f1eb6` (the overrides)
**Scope:** dependency versions only. No file under `client/src/` touched, no `defaults.js`, no engine.
**Ceremony:** none owed and none run — no mint, no fingerprints, no golden/replay, no tag.
The shipped world stays `dc4647be0f55ebdb`; this block cannot have moved it, because it changed no
input the engine reads.

---

## 1. What was red, and what was not

Reproduced the owner's finding at `3b857d05` before touching anything. It is exact.

**RED — `node scripts/audit-gate.mjs`, exit 1, two un-allowlisted HIGH advisories:**

| GHSA | Package | What | Vulnerable range |
|---|---|---|---|
| GHSA-rgw5-rvv9-x895 | brace-expansion | DoS via unbounded intermediate arrays, *"bypassing the CVE-2026-14257 mitigation"* | 4.0.0 – 5.0.8 |
| GHSA-4cwx-7wf7-3272 | undici | cross-user info disclosure + parse-time crash via degenerate private cache directives | 7.0.0 – 7.28.0 |

**GREEN — everything else, confirmed independently, numbers identical to the owner's:**
`check-doc-links` 319 links / 52 files / 0 dangling · `check-index` 94 reports / 0 unindexed ·
`check-tags` 63 origin tags / 0 unregistered · script tests 121/121 · ESLint clean · Prettier clean.

**No commit caused this.** The two advisories were published upstream; the gate did its job and
reacted to the world changing, not to the repo changing. That distinction matters and §7.3 takes it up.

One deviation from the spec's numbers, in our favour: the spec expected a **~21-line** lockfile diff
from `npm audit fix`. Here it was **3 changed lines** (one `undici` block: version, resolved,
integrity). The spec's larger number was presumably measured before some other install settled the
tree. Nothing is missing — the gate result is what confirms the fix, not the diff size.

---

## 2. Root cause, in one paragraph

`client/package.json` carried `"brace-expansion": "5.0.8"` as an **exact** override. That pin was
itself the mitigation for the *previous* brace-expansion advisory (GHSA-mh99-v99m-4gvg), applied in
`4a4bcf31` on 2026-07-25. The new advisory is titled *"bypassing the CVE-2026-14257 mitigation"* —
so the fix from last time is the thing the fix this time had to get past. An exact override is a
ceiling as well as a floor: `npm audit fix` will not move it, cannot move it, and does not say so
loudly; it simply reports the advisory as unfixable-without-`--force` and leaves. The repair was
blocked by the repair. undici is unrelated and entirely ordinary — a transitive dev dependency
(`jsdom` → `undici`) on a caret range, which `npm audit fix` moved on the first try precisely
*because* nothing pinned it.

---

## 3. The two commits

### COMMIT 1 — `5b23bf93` — undici, lockfile only

```
cd client && npm audit fix
```

`undici 7.28.0 → 7.29.0`. **package-lock.json only**, 3 changed lines, `package.json` untouched, no
major bump, `--force` not used — so the spec's STOP condition never triggered. Dev-only
(`jsdom` → `undici`); undici is never bundled into the client build.

Bonus, unasked for and worth recording: the bump also cleared the **four moderate** undici advisories
that the gate had been printing as advisory-only (`GHSA-8xcm-r25x-g524`, `GHSA-m8rv-5g2x-5cg5`,
`GHSA-jr45-8vmc-qm54`, `GHSA-v3r7-h72x-cjcm`). The gate's advisory section is now empty.

### COMMIT 2 — `028f1eb6` — the overrides

```diff
   "overrides": {
-    "brace-expansion": "5.0.8",
-    "minimatch": "10.2.5",
+    "brace-expansion": "^5.0.9",
+    "minimatch": "^10.2.5",
     "postcss": "^8.5.18"
   },
```

`brace-expansion 5.0.8 → 5.0.9` in the lock. Dev/build chain only
(`eslint` → `minimatch` → `brace-expansion`), never shipped to a browser.

---

## 4. The two pin decisions

### 4.1 `brace-expansion` — WHY was it exact? → **it was never meant to be**

The spec asked me to check the history before deciding, and the history answers it outright. The line
was introduced by exactly one commit, `4a4bcf31`, whose message gives the only recorded reason:

> `brace-expansion -> 5.0.8` (**the advisory's only patched version**)

That is a *point-in-time fact*, not a compatibility constraint. It says "5.0.8 was the fix available
on 2026-07-25". It does not say "5.0.9+ would break something", and there is no evidence anywhere
that it would. I searched the living docs as well — `docs/AUDIT.md` is a project audit report, not a
dependency-policy home, and no doc records a rationale for the exactness.

**The file argues against itself, too.** The same commit set `postcss: "^8.5.18"` — a *caret* — with
the reason "patched, non-breaking within 8.5.x". The identical reasoning applies to brace-expansion;
it just wasn't applied, because the "only patched version" framing made 5.0.8 feel like a
specification when it was only a timestamp.

**Decision: `^5.0.9`.** The floor is the patched version, which is the entire security requirement.
The caret still forces the whole tree onto 5.x — which is what dragged `minimatch` off 3.x in the
first place — so nothing the original override achieved is given up. What is given up is the ceiling,
and the ceiling is the defect: an exact pin freezes the tree below every future patch and guarantees
this same red CI on the next brace-expansion advisory. That is not a prediction. It is a description
of what just happened.

### 4.2 `minimatch` — pinned `10.2.5`, `10.2.6` exists, no advisory names it

Its exactness has a *stated* reason, and it is a better one — from the same commit:

> minimatch 10.2.5 natively depends on brace-expansion ^5.0.5 with its named `expand` export;
> brace-expansion 5.x alone breaks minimatch 3.x with "expand is not a function", so both must move
> together.

Read carefully, that reason justifies a **floor**, not an **exact version**. The requirement is
"minimatch must be ≥ 10.x so it speaks brace-expansion 5.x's API". `^10.2.5` satisfies that
completely. I checked the current head: `minimatch@10.2.6` declares `brace-expansion: ^5.0.8`, so it
accepts 5.0.9 and the pairing constraint holds under the caret.

**Decision: `^10.2.5`.** Same reasoning as above, applied consistently — and consistency is the
point. Having just concluded that exact pins age into failures, leaving the neighbouring exact pin in
place because it hasn't failed *yet* would be incoherent. I kept the floor at **10.2.5** rather than
raising it to 10.2.6, because 10.2.5 is the version the compatibility argument actually requires;
recording the real constraint is worth more than recording today's date again. Resolution
consequently stays at **10.2.5** (the locked entry already satisfies the range), so this half of the
commit is a **pure policy change with zero installed-tree movement** — the safest possible way to
make it.

"Do nothing" was available here and I did not take it. The reason is that doing nothing preserves
exactly the trap that cost the owner a session, in a dependency one hop from the one that just
sprung it.

---

## 5. Verification — this change, nothing more

All run at `028f1eb6`, in the CI's own order.

| Check | Result |
|---|---|
| `node scripts/audit-gate.mjs` | **PASS** — 0 blocking; `react-router` still ALLOWLISTED; advisory section empty |
| `npm run lint` (client) | PASS |
| `npm run format:check` (client) | PASS — "All matched files use Prettier code style!" |
| `npm run test:coverage` (client) | 3492/3494 first run — **2 local 5 s timeouts, not assertion failures**; **3494/3494** with the clock raised. See §5.1, which is the honest version |
| `node scripts/check-doc-links.mjs` | PASS — 319 links / 52 files / 0 dangling |
| `node scripts/check-index.mjs` | PASS — 95 reports / 0 unindexed |
| `node scripts/check-tags.mjs` | PASS — 63 origin tags / 0 unregistered |
| `node --test $(find scripts -name '*.test.mjs')` | PASS — 121/121 |

The gate's post-fix output, in full, is the thing to read:

```
audit-gate: totals — critical 0, high 2, moderate 0, low 0
  ALLOWLISTED (high): GHSA-qwww-vcr4-c8h2 — React Router: RSC Mode CSRF Bypass ...
PASS: no un-allowlisted high/critical advisories (moderate/low are advisory only).
```

The remaining `high 2` is the single allowlisted react-router GHSA counted once for `react-router`
and once for `react-router-dom`. Its allowlist entry is untouched and its remove-when condition still
stands (bump once react-router ships a patched >8.2.0 or a 7.x backport).

### 5.1 The suite — plainly, as the spec asked

**It did not come back clean on the first run, and the honest headline is: 2 failed / 3492 passed
of 3494.** The spec asked me to say so either way, so that goes first, before the explanation.

Both failures are in `src/modules/sim-fairness.test.js`
(`different seeds → (usually) different winners`; `computeFairnessStats over 10 races produces valid
output`), and **neither is an assertion failure**. Both read `Error: Test timed out in 5000ms` —
`vitest.config.js` sets no `testTimeout`, so the default 5 s applies, and these two heavy sim tests
exceed it on this machine under V8 coverage instrumentation on a OneDrive-synced disk. Full-suite
duration here was **353.7 s**.

I did not want to accept that on the strength of a commit message, so it is nailed down from three
independent directions:

1. **Raise only the clock.** `npx vitest run src/modules/sim-fairness.test.js --coverage
   --testTimeout=120000` → **38/38 pass in 26.8 s.** Same code, same coverage, same machine; the only
   variable removed is the deadline. That converts "2 failures" into "2 tests slower than 5 s here".
2. **The whole suite, same treatment.** `npx vitest run --coverage --testTimeout=120000` →
   **3494/3494 passed, 172/172 files, vitest exit code 0**, 319.7 s. Every test in the repository
   passes under coverage at `028f1eb6`; the deadline was the only thing failing.
3. **CI's own record, which is the decisive one.** `gh run view 30941092021` for the red run at
   `3b857d05` — *before this change existed* — lists the `Client checks` job step by step:

   ```
   4. Install dependencies                  = success
   5. ESLint                                = success
   6. Prettier format check                 = success
   7. Run tests with coverage               = success
   8. Security audit gate ...               = failure
   ```

   **The suite passes on GitHub's runner at the default 5 s timeout**, and the audit gate is the sole
   failing step in the entire pipeline. That is the pre-existing baseline, established from the other
   side of the wire rather than inferred.

**Attribution.** These two tests cannot be reached by this change: they are pure simulation tests, and
the two moved packages are `brace-expansion` (used only by ESLint's glob resolution — not loaded by
vitest at all) and `undici` (jsdom's fetch, which sim-fairness never calls). The condition is also
documented as pre-existing in `4a4bcf31` (2026-07-25), which recorded the identical signature — same
file, same count, same cause — three months before this block.

**So: the suite is confirmed green on its merits, and confirmed environment-bound on this machine.**
The two timeouts are a local-hardware artifact, not a regression, and CI is on record passing the
step they failed. What I cannot do from here is promise the *next* CI run is green — but every step
in `ci.yml` has now been reproduced locally, and the only one that was failing now passes.
**§9 closes that last gap by measurement: the next CI run was green.**

---

## 6. Noticed, and left

Five things, none of them fixed here, because none of them is this block.

1. **`server/` is never audited by CI — and it is the production runtime.** Detail in §7.2. This is
   the most consequential item on the page.
2. **`.github/workflows/deploy.yml` cannot fire.** It triggers on `push: branches: [main]`. The only
   branch that exists — locally and at origin, with `origin/HEAD → origin/master` — is `master`.
   It also runs `bash scripts/deploy.sh` on the remote host, and **`scripts/deploy.sh` is not in this
   repository** (`git ls-files | grep deploy` returns only the workflow and `docs/DEPLOYMENT.md`).
   So the deploy workflow is inert on two independent counts. Whether that is deliberate (deploys
   are manual, per `docs/DEPLOYMENT.md`'s "minimal production start") or rot, I can't tell from here
   — but a workflow that *looks* like it deploys and cannot is worth an owner's minute.
3. **The overrides block has no readable rationale at the point of use.** JSON permits no comments,
   so "why caret, why this floor" now lives in a commit message and this report. A reader opening
   `client/package.json` in six months sees three magic ranges. §7.4 proposes the cheap fix.
4. **The 5 s default test timeout makes the local suite report false failures.** `vitest.config.js`
   sets no `testTimeout`; two sim tests sit just the wrong side of 5 s under coverage on this
   hardware, so a local `npm run test:coverage` reports RED on a green tree. That is a trap of the
   same shape as §7.1 — a default that encodes *someone's machine on some day* rather than the
   requirement ("these tests must finish, and they are known-slow"). The fix is one line
   (`testTimeout: 30000`, or a per-test timeout on the two heavy sim cases) and it costs CI nothing,
   since CI already passes. **Not done here** — it changes test configuration, which is outside a
   dependency block, and it deserves its own one-line commit rather than being smuggled in.
5. **`npm audit fix` reported success while leaving a fixable high in place** — it printed
   "fix available via `npm audit fix --force`" for brace-expansion, which is misleading: no breaking
   change was ever required, only the removal of our own ceiling. Nothing to fix in our code; worth
   knowing as a failure mode, because it is the sentence that would push a hurried operator toward
   `--force` and a react-router downgrade.

---

## 7. PROPOSALS

### 7.1 On the owner's lesson candidate — **agree, and it generalises; here is wording**

It is not just dependency housekeeping. The shape is general and this project has the shape
elsewhere: *a value written down to fix a problem becomes a constraint that outlives the problem, and
the tighter it was written, the more it blocks the next fix.* The mechanism is that a fix records
**an answer** (5.0.8) when what it knew was **a requirement** (≥ the patched version). An answer
cannot be re-satisfied by new information; a requirement can.

Proposed wording, in the LESSONS voice:

> **A fix that records an ANSWER instead of its REQUIREMENT becomes the next failure.**
> The brace-expansion pin `5.0.8` was the mitigation for CVE-2026-14257; the advisory that followed
> was titled *"bypassing the CVE-2026-14257 mitigation"*; and the pin was what stopped `npm audit fix`
> from repairing it. The pin encoded *the version that was patched on the day* — an answer — when the
> requirement was *at or above the patched version*. Write the requirement (a floor, a range, a
> predicate) and let it be re-satisfied; write the answer and you must remember to come back, which
> is the thing nobody does. Applies wherever a constant is frozen as a remedy: dependency pins,
> hard-coded thresholds that were once a measured value, allowlists keyed to a specific version,
> golden numbers that captured a state rather than a rule.

The last sentence is the part I'd argue for keeping. This repo has a documented habit of exactly this
— HYGIENE-1's own history has code fallbacks that disagree with shipped defaults, and CAMERA-HYGIENE-2
found "twenty per-state timing scalars mirroring the maps". Same family: a number copied at a moment,
outliving the moment. I'd file it against the next free number in `docs/LESSONS.md` rather than
mint it here, since LESSONS is a canonical home and this block is not chartered to write to it.

### 7.2 On `server/` not being audited — **it is a hole, not a deliberate exclusion, and it has teeth**

I checked rather than assumed. `scripts/audit-gate.mjs` hard-codes `CLIENT = .../client` and runs
`npm audit --json` there only; `ci.yml` has a `client` job and a `docs` job and no `server` job at
all — so **`server/` is neither audited nor tested by CI**, despite having its own
`package-lock.json` and its own `test` script.

That would be defensible if the server weren't deployed. It is. `docs/DEPLOYMENT.md` describes the
production model as the Node server serving **both** the built SPA from `client/dist/` **and** the
API, with `NODE_ENV=production`, trust-proxy, session signing and CSRF strictness. The server is the
production runtime; the client is a folder it serves.

A read-only `npm audit` in `server/` right now (I did not fix it — the spec said report, not fix):

| Package | Severity | Path | Runtime? |
|---|---|---|---|
| `ip-address` ≤10.3.0 — **3 GHSAs**: SSRF / trust-boundary bypass via leading-zero octets, CIDR-suffix suppression, IPv4-mapped/NAT64 misclassification | **high** | `express-rate-limit@8.5.2 → ip-address@10.2.0` | **YES — production dependency** |
| `postcss` ≤8.5.22 — path traversal, arbitrary `.map` disclosure | high | `vitest → vite → postcss` | no (dev) |
| `body-parser` <1.20.6 — DoS, invalid `limit` silently disables size enforcement | low | `express@4.22.2 → body-parser` | **YES — production dependency** |

The `ip-address` one is not academic. `express-rate-limit` uses it to parse and classify client IPs,
and the advisories are precisely about IP strings being classified differently by the parser than by
a resolver — i.e. a trust-boundary decision. The server runs with trust-proxy enabled in production,
which means the IP it classifies comes from a header. That is the exact use the advisory describes.
Both highs report `fix available via npm audit fix` — no `--force`, no breaking change.

**Proposal:** a follow-up block (`CI-AUDIT-SERVER-1`) that (a) runs `npm audit fix` in `server/`,
(b) generalises `audit-gate.mjs` from one hard-coded directory to a list of workspaces, so the policy
and the allowlist stay single-homed while covering both trees, and (c) adds a `server` CI job that
runs the server's existing `vitest` suite, which today runs nowhere. Deliberately **not** done in
this block: it is a different tree, a different risk profile, needs its own verification, and folding
it in here would make a two-line dependency fix unreviewable.

### 7.3 On distinguishing "a new advisory appeared" from "our code got worse" — **opinion, as asked**

The distinction is real and worth having, and the gate is currently blind to it: it re-derives the
whole world on every run, so an upstream publication and a careless `npm install` produce the
identical red. That is why this cost a session — the owner had to do the triage the tool could have
done.

But I'd argue the framing is one step off. The useful axis is not *new vs. our fault*; it is
**actionable vs. not-yet-actionable**. A brand-new advisory with a published patch is the *most*
urgent thing the gate can find, and a "this is new, relax" channel would have de-prioritised the
exact advisory we just fixed in one command. Meanwhile the genuinely unactionable case — react-router,
where no forward fix exists — is *already* handled correctly, by an allowlist entry that carries a
justification and a remove-when condition.

So: **no new severity channel.** The failure here was diagnosis cost, not policy. Two changes would
have paid for themselves, both cheap and neither weakening the gate:

- **Make the gate say what to do.** For each blocking advisory, print whether a fix is reachable
  (`npm audit fix`), reachable only via `--force`, or unreachable, and print the override — if any —
  that pins the package below the fixed range. This block's entire diagnosis was "the override is
  the ceiling", and the gate had that fact in hand and didn't say it. That is a ~20-line change and
  it converts a working session into a paragraph.
- **Give allowlist entries an expiry date**, checked by the gate, failing when passed. This is the
  guard against the real hazard the owner names — the allowlist becoming a way to stay green while
  vulnerable. Today only diligence removes a stale entry. An expiry forces a re-decision on a date
  someone chose deliberately, which is exactly what react-router's "REMOVE this entry once…"
  condition wants and cannot enforce. And note it is the same lesson as §7.1: the allowlist entry
  currently records an answer ("safe"); the expiry makes it record a requirement ("safe until
  re-checked").

### 7.4 (mine) Put the override rationale where the override is

Three ranges sit in `client/package.json` with their reasoning distributed across two commit messages
and two reports. JSON has no comments, so the pattern this repo already uses elsewhere applies:
give the fact one canonical home and point at it. Concretely — extend the `ALLOWLIST` comment block
in `scripts/audit-gate.mjs` (already the documented home of the audit *policy*, per `ci.yml`'s own
comment) with a short **OVERRIDE POLICY** note: overrides record a **floor**, never an exact version,
unless an exact version has a *compatibility* reason stated on the spot. Then a future operator hits
the rule at the moment they are about to write a pin, rather than discovering it from an advisory
title a month later. Not done here because it is a source change to a file this block was scoped
away from, and it belongs with §7.2's rework of the same file.

### 7.5 (mine) The gate proved its worth — say so, and don't let §7.3 erode it

Worth stating plainly amid three proposals to change the gate: **the gate worked.** It was added in
HYGIENE-1 as CI hygiene, and it caught two genuine highs the day they were published, one of which
sat in a trap of our own making that no human review would plausibly have found. Every proposal above
makes it *more* informative or *more* expiring; none makes it quieter. If any future change to
`audit-gate.mjs` has the effect of reducing what it fails on, that change should have to argue for
itself in a report, the way a fingerprint move does. The allowlist is the one mechanism here that can
silently trade safety for green, and it already carries the right discipline — a justification and a
remove-when — which §7.3's expiry would finally make enforceable.

---

## 8. Status

Superseded by §9 — CI is no longer *expected* green, it **is** green, measured. Left as written so
the prediction and the result can be read against each other.

CI is expected green at `028f1eb6`: the audit gate passes, both blocking advisories are gone, the
allowlist is untouched, and every step in `ci.yml` has been reproduced locally — including the full
3494-test suite, once the local clock artefact in §5.1 is taken out of the picture. The one step that
was failing is the one that now passes. Nothing else in this repository changed. **Owner's eye: none
needed** — this block changes no pixel, no number the engine reads, and no behaviour.

---

## 9. CLOSED — pushed, and CI is green (the real acceptance)

`3b857d05..f7635aab  master -> master`. Run **30948211250** at `f7635aab`, **`completed/success`**,
both jobs, every step — this is the block's acceptance, not the local gate:

```
JOB: Client checks = success                    JOB: Living-doc guards + script tests = success
  4. Install dependencies          = success      4. Check living-doc links            = success
  5. ESLint                        = success      5. Check every report is indexed     = success
  6. Prettier format check         = success      6. Check every origin tag registered = success
  7. Run tests with coverage       = success      7. Run script test suite             = success
  8. Security audit gate ...       = SUCCESS
```

Step 8 was the sole red step at `3b857d05` (§5.1) and is now green with the allowlist untouched.
Step 7 passing again on GitHub's runner re-confirms §5.1 from the other side: the two local failures
were this machine's clock, not the tests.

## 10. The deployment question, answered by observation

The push was used as the experiment. **Everything in the table is MEASURED; the two inferences at the
end are labelled.** Nothing was changed — no `main` branch, no trigger edit, no deploy script, no
configuration. Every call was a read.

**Which workflows ran: only `CI`. `Deploy` did not appear.**

| Probe | Result |
|---|---|
| `git ls-remote --heads origin` | **one head, `master`** — no `main` |
| `gh workflow list --all` | CI *active*; **`Deploy` *active*** (id 272257209) — registered and enabled |
| Deploy runs, ever (`actions/workflows/272257209/runs`) | **0** |
| Last 100 runs grouped by workflow | **100 CI, 0 anything else** |
| `repos/…/deployments` | **0, ever** — also 0 after this push |
| `repos/…/environments` | **0** |
| `repos/…/pages` | **404 — Pages not enabled** |
| `repos/…/hooks` | **0 webhooks** |
| `repos/…/keys` | **0 deploy keys** |
| `repos/…/actions/secrets` | **0 — `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_KEY` do not exist** |
| `schedule` / `workflow_dispatch` / `repository_dispatch` | none in either workflow |

**So there are FOUR independent blockers, not the two the spec named.** (1) the trigger is
`branches: [main]` and only `master` exists; (2) `scripts/deploy.sh` is not in the repo; (3) **all
three secrets the workflow consumes are absent**, so even a corrected trigger with a written script
would hand `appleboy/ssh-action` an empty host and key; (4) there is no alternative path at all —
no webhook, environment, Pages site, deployment record, or other trigger.

**On `docs/DEPLOYMENT.md` — the spec's framing needs one correction.** It does **not** claim an
automatic path, so it does **not** disagree with the repo. It documents a **manual** one: a "Minimal
production start" shell command (`NODE_ENV=production … node server/src/index.js`) run by hand on a
host, plus reverse-proxy, cookie and session-rotation notes. It never mentions Actions, `git pull`,
or `deploy.sh`. The repo and DEPLOYMENT.md **agree**. What they contradict is the owner's belief.

**INFERRED — why the belief formed** (a reading, not a measurement): two in-repo artefacts read as
automatic. `deploy.yml` exists, is named "Deploy", and describes an SSH `git pull` + `deploy.sh`; and
`docs/ARCHITECTURE.md:117` labels it `# Deploy on merge to main` in its file tree. Both describe an
**intent that was never wired up**. A grep of all living docs for auto-deploy language returns
nothing else.

**INFERRED, and this is the limit worth stating plainly**: zero deployments, zero secrets and zero
Deploy runs are consistent with "this repository has never deployed anything" — but they **cannot**
rule out the owner deploying **by hand** from the host, which is exactly what DEPLOYMENT.md
describes. The host is not observable from here. So the claim is deliberately narrow:
**automatic deployment from this repository has never happened, once, ever.** Whether the live site
is stale depends on manual habit, which this evidence does not reach.

**How to find out which build is live** (named, not done, per the spec). The first obstacle is that
**the live address is not recorded anywhere** — `RA_PUBLIC_ORIGIN` appears only as the placeholder
`racearena.example.com`, and with 0 secrets there is no host stored at origin. Given a URL from the
owner: the app exposes **no build identifier** (checked: no `__APP_VERSION__`, `BUILD_ID` or
build-time constant, and the world fingerprint is not surfaced in the UI), so the route is
(a) fetch the live `index.html`, read Vite's hashed asset name `index-<hash>.js`, then `npm run build`
at candidate commits and compare — a match pins the deployed commit; failing that (b) `Last-Modified`
/ `ETag` on the served bundle dates the build. Both need the owner's URL first.

**NOT FIXED, deliberately.** Whether the live site has been serving a stale build is the owner's
decision to act on, and a repair here would quietly start publishing to production from a block
chartered to clear an audit gate.
