# PROJECT-AUDIT-2026-08-18

Date: 2026-08-18
Status: Source-first audit with explicit evidence labels
Supersedes: PROJECT-AUDIT-2026-08-17 is superseded by this report.

## Coverage statement

This audit is based on direct source reads of check invokers, hook wiring, verify routing, CI workflows, and auth/setup client-server contract points, plus one fresh runtime timing command for guard-cost reconciliation.

Evidence classes used in this report:
- Source: file plus line link
- Command: executed command plus observed output values
- Not verified: explicitly marked where no direct proof was collected in this run

## Verdict on the three prior recommendations

1. Two-lane model existence in hook, verify, CI
Verdict: Withdraw as a net-new recommendation. Keep only as a naming/documentation cleanup.

Why:
- Source: the repository already has three distinct lanes with distinct intents.
  - Pre-commit fast lane exists and blocks on a bounded guard set in [\.githooks/pre-commit](.githooks/pre-commit#L61) and [\.githooks/pre-commit](.githooks/pre-commit#L109).
  - Diff-routed local verify lane exists with fail-closed behavior in [scripts/verify.mjs](scripts/verify.mjs#L66), [scripts/verify.mjs](scripts/verify.mjs#L109), and [scripts/verify.mjs](scripts/verify.mjs#L498).
  - Full CI lane exists on push and PR in [\.github/workflows/ci.yml](.github/workflows/ci.yml#L12) and [\.github/workflows/ci.yml](.github/workflows/ci.yml#L15), including client, server, and docs jobs.

2. Path-filter split recommendation for CI
Verdict: Reject in current form.

Why:
- Source: current CI intentionally runs a full commit verdict on every push/PR to main/master, which is the exact behavior needed for merge-SHA truth in [\.github/workflows/ci.yml](.github/workflows/ci.yml#L12), [\.github/workflows/ci.yml](.github/workflows/ci.yml#L15), and [\.github/workflows/ci.yml](.github/workflows/ci.yml#L27).
- Source: the project already has a separate scheduled dependency workflow for non-merge-time concerns in [\.github/workflows/audit-schedule.yml](.github/workflows/audit-schedule.yml#L1).
- Not verified: no alternative CI design was prototyped in this run that preserved single-status semantics and reduced cost without new blind spots.

3. Ownership/lifecycle recommendation vs existing guard headers and R13
Verdict: Mostly already implemented; reduce to gap-closing only.

Why:
- Source: R13 already sets the lifecycle rule that new truth should usually live inside existing guards in [docs/VERIFY-RULES.md](docs/VERIFY-RULES.md#L401).
- Source: verify routing now discovers declarations and reports undeclared/invalid path contracts in [scripts/lib/routing.mjs](scripts/lib/routing.mjs#L291) and [scripts/lib/routing.mjs](scripts/lib/routing.mjs#L312).
- Not verified: no full inventory matrix was produced in this run mapping each guard to explicit owner and retirement trigger fields.

## Findings table

| ID | Finding | Reachability | Visibility | Severity | Minimum fix | If left alone |
|---|---|---|---|---|---|---|
| F1 | Setup bootstrap token channel mismatch: client sends token in request body while server accepts only header | High on first-time deployment paths | Owner-visible immediately during first-admin setup | Critical | Send x-bootstrap-token header from client setup call and align tests | New environments can fail setup despite valid token; deployment confidence drops |
| F2 | Contract-test gap allowed F1 to ship: client and server tests both pass while setup contract is inconsistent | High (all future auth/setup refactors) | Developer-visible only after integration/manual run | High | Add one end-to-end contract test for setup header/body semantics | Same class of split-brain regressions can recur across API boundaries |
| F3 | Cost concentration is dominated by a few expensive guards, not by check count itself | High (affects every local confidence run that includes these guards) | Developer-visible as slow feedback | Medium | Treat expensive guards as heavy lane and keep fast lane strict but short | Continued perception that "many checks" are the root cause, causing wrong optimization decisions |
| F4 | Prior path-filter recommendation risks weakening merge-SHA certainty if applied naively | Medium (process/design level) | Low immediate visibility; manifests as trust erosion later | Medium | Keep full push/PR CI verdict; optimize elsewhere first | Green CI can stop meaning "this merge commit passed full policy" |

## Ordered findings (by visibility, then severity)

### F1 (Owner-visible, Critical)

Claim:
The first-admin setup path has a hard client-server contract mismatch.

Evidence:
- Source: client setup sends token in body at [client/src/services/authApi.js](client/src/services/authApi.js#L48).
- Source: server reads setup token only from header at [server/src/auth/authRouter.js](server/src/auth/authRouter.js#L54).
- Source: server test explicitly enforces body-only token as 403 at [server/src/auth/authRouter.test.js](server/src/auth/authRouter.test.js#L80).
- Source: setup screen instructs operator to enter bootstrap token at [client/src/screens/Auth/SetupAdminScreen.jsx](client/src/screens/Auth/SetupAdminScreen.jsx#L62).

Assessment:
This is a real correctness break on a high-stakes operational path.

### F2 (Developer-visible, High)

Claim:
Current automated tests did not guard the end-to-end setup contract, enabling F1.

Evidence:
- Source: client auth API unit test asserts setup success but does not verify token transport semantics across real server behavior in [client/src/services/authApi.test.js](client/src/services/authApi.test.js#L66).
- Source: server unit tests correctly enforce header-only setup token in [server/src/auth/authRouter.test.js](server/src/auth/authRouter.test.js#L80).
- Not verified: no full browser-to-server setup flow test execution was run in this audit pass.

Assessment:
This is a test-surface gap, not a single-file bug only.

### F3 (Developer-visible, Medium)

Claim:
Latency pain is primarily from a small number of expensive guards.

Evidence:
- Command: measured sequential run of 20 guards produced total 118.37 s.
- Command: biggest contributors in that run were check-runin-frame 50.105 s, check-standings-invariant 24.910 s, check-fingerprints 15.641 s, check-writable 10.332 s.
- Source: fast pre-commit guard list is explicitly bounded and separate in [\.githooks/pre-commit](.githooks/pre-commit#L61).

Assessment:
Optimization should target heavy outliers first; removing cheap guard count alone will not materially change feedback time.

### F4 (Low-visibility now, Medium)

Claim:
Naive path-based skipping in push/PR CI can degrade status semantics.

Evidence:
- Source: CI is currently full-scope on every push/PR to main/master in [\.github/workflows/ci.yml](.github/workflows/ci.yml#L12) and [\.github/workflows/ci.yml](.github/workflows/ci.yml#L15).
- Source: separate scheduled audit workflow already carries feed-driven, non-merge-time checks in [\.github/workflows/audit-schedule.yml](.github/workflows/audit-schedule.yml#L1).
- Not verified: no branch-protection simulation was run in this audit to test a reduced-check variant.

Assessment:
Do not spend immediate change budget here before fixing correctness and contract gaps.

## What is solved well (evidence-backed)

1. CI now gates client, server, and docs explicitly.
- Source: client coverage step in [\.github/workflows/ci.yml](.github/workflows/ci.yml#L55).
- Source: server test and server audit gate in [\.github/workflows/ci.yml](.github/workflows/ci.yml#L96) and [\.github/workflows/ci.yml](.github/workflows/ci.yml#L113).

2. Hook lane is tracked and fail-loud for fast guards.
- Source: tracked pre-commit guard execution and explicit block message in [\.githooks/pre-commit](.githooks/pre-commit#L81) and [\.githooks/pre-commit](.githooks/pre-commit#L109).

3. Verify lane is fail-closed on unknown flags and empty-check outcomes.
- Source: unknown-flag refusal and refused exit code in [scripts/verify.mjs](scripts/verify.mjs#L68) and [scripts/verify.mjs](scripts/verify.mjs#L109).

4. Guard routing moved from hand table to declarations with structural validation.
- Source: declaration collection and invalid-path reporting in [scripts/lib/routing.mjs](scripts/lib/routing.mjs#L291) and [scripts/lib/routing.mjs](scripts/lib/routing.mjs#L312).

## First-hour action and anti-action

First-hour action:
1. Fix F1 immediately by sending x-bootstrap-token header from client setup request, then add one integration contract test that proves body-only token is rejected and header token succeeds.

Anti-action (do not do now):
1. Do not split push/PR CI into path-skipped partial verdicts before F1/F2 are closed and before a branch-protection-safe design is proven with evidence.
