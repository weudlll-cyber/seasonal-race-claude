# PROJECT-AUDIT-2026-08-17

Date: 2026-08-17
Scope: full project-level audit with emphasis on safety, maintainability, redundancy, and check latency.
Method: source-driven read of check invokers, CI pipeline, hook behavior, existing measured reports, and current check-audit evidence.

## Executive summary

The project is strong in guard engineering and evidence discipline, but currently weak in check ergonomics.
The quality system is robust enough to catch subtle regressions, yet it has grown into a high-friction flow where small edits frequently pay for large, repeated validation surfaces.

Main diagnosis:
1. Safety quality is high.
2. Runtime/maintenance cost of the safety system is now high enough to reduce delivery speed and developer confidence.
3. There are still unresolved coverage asymmetries and overlap across stages.

## What is solved well

1. Guard architecture is explicit and auditable.
   - Routing is declaration-driven from guard metadata, reducing silent drift in check selection.
   - Fail-closed philosophy appears repeatedly (unknown flags fail, empty runs refused, missing inputs fail loudly).

2. Hook reliability is handled better than in most repos.
   - Tracked hook path and explicit hook-health guard reduce the "hooks silently not running" failure class.

3. Fingerprint strategy is sophisticated.
   - Distinct roles for world/camera/render and canonical storage in one place support reproducible behavior checks.
   - OFF-arm lineage (world-off) supports ablation reasoning when behavior causality is in question.

4. Documentation integrity controls are unusually mature.
   - Index/link/tag/config-claim/fact guards reduce drift between implementation and written policy.

5. CI has meaningful defense layers.
   - Client lint/format/tests, server tests, docs guards, and security gate are all present and enforceable.

## What is poorly solved

1. Check latency and stage repetition are now a productivity bottleneck.
   - Heavy checks are expensive, and the same defect classes are validated multiple times across hook, verify, and CI.
   - Team pain is real: "small change feels expensive" becomes a reliability risk by encouraging bypass behavior.

2. Validation intent is not split cleanly between fast local confidence and release-grade certainty.
   - Local pre-commit + local verify + CI often re-check similar concerns with limited incremental value.

3. Some checks have weak historical catch evidence relative to their maintenance burden.
   - A subset of guards is mostly justified by plausible risk, not observed catches.
   - This is acceptable only if they remain very cheap and clearly scoped.

4. Check semantics are occasionally harder to reason about than the code they protect.
   - This increases onboarding cost and can create "ritual checking" instead of targeted assurance.

## Must change (high priority)

### P0 - Must do now

1. Define and enforce a two-lane validation policy.
   - Lane A (fast local): must complete in a small, predictable window; optimized for edit-feedback loop.
   - Lane B (full release-grade): slower, complete, mandatory before merge/release.
   - Without this, developers will continue to experience safety as friction rather than confidence.

2. Add path-based CI gating for heavy jobs where correctness allows it.
   - If only docs/report paths changed, skip heavy client/server suites and heavy fingerprints.
   - Keep docs and integrity guards mandatory for docs-only changes.
   - This is the largest immediate reduction in unnecessary CI spend.

3. Formalize check ownership and retirement criteria.
   - Every check must have: defect class, stage intent, max target duration, and retirement trigger.
   - Checks without ownership become permanent cost centers.

### P1 - Must schedule next

4. Rationalize repeated checks across hook/verify/CI.
   - Keep early-blocking for cheap, high-signal checks.
   - Avoid triple-running medium-cost checks unless tree-state differences can create new signal later.

5. Introduce a measured "value per second" rubric for all checks.
   - Track catch count, false-positive burden, and median runtime over time.
   - Re-rank quarterly; archive low-value checks or move them to slower cadence.

6. Close remaining coverage asymmetries.
   - Ensure all intended test surfaces are either in the mandatory pipeline or explicitly classified as optional/manual with rationale.

## Check-cost pressure map (current state)

From available measured evidence:
1. Highest-cost local validations are the three behavior fingerprints and large suites.
2. Mid-cost guards (seconds range) are generally acceptable individually, but multiplicative overlap is the issue.
3. Cheap checks are mostly fine; their problem is cumulative repetition more than per-check time.

Interpretation:
- Your 30-minute pain is less about one bad check and more about compounded stage design.
- The system is safe, but not currently optimized for flow.

## Redundancy and overlap analysis

Redundancy is not automatically bad; it is bad when the later run cannot observe materially different tree state.

Where repetition is usually justified:
1. Hook vs CI when local hooks may be bypassed or missing.
2. Verify vs mint when commit state can change after local validation.
3. Local vs CI when environment differs (OS, dependency freshness, remote tags/history).

Where repetition is often wasteful:
1. Running the same static policy checks in three stages when their inputs are identical.
2. Re-running formatting/lint checks in CI if pre-merge policy already guarantees identical tree and no environment-sensitive behavior.

## Security posture assessment

Strength:
1. Security audit gating exists and is integrated.
2. Allowlist approach appears documented rather than silent.

Risk to monitor:
1. Security checks are only effective if they remain trusted and fast enough to avoid bypass pressure.
2. Audit policy should preserve strictness for high/critical while limiting noise from lower-severity churn.

## Maintainability posture assessment

Strength:
1. Strong naming and reporting discipline around guard intent and blind spots.
2. Rich project documentation map and rule references.

Weakness:
1. Operational complexity of checks is now itself a maintainability issue.
2. New contributors face a steep "process tax" before they can safely ship small changes.

## Concrete improvement proposals (actionable)

1. Create explicit commands and policy:
   - verify:fast (default local)
   - verify:full (pre-merge)
   - verify:release (mint-critical)

2. CI path filters:
   - docs-only branch changes run docs/guard jobs.
   - client-code changes run client+relevant guards.
   - server-code changes run server+relevant guards.
   - engine-hull changes trigger full fingerprint lane.

3. Stage contract document (single source of truth):
   - For each check: stage(s), expected max runtime, reason for repetition, and what later-stage-only signal exists.

4. Quarterly check pruning review:
   - Remove or demote checks with no catches and poor risk justification.
   - Keep explicit record of accepted residual risk when pruning.

5. Pipeline UX improvements:
   - Surface per-stage timing and top 5 slowest checks in every run summary.
   - This makes cost visible and prevents silent regression in check time.

## Priority roadmap

Week 1:
1. Define two-lane policy and adopt fast-default local command.
2. Add CI path filters for obvious docs-only and non-engine changes.

Week 2:
3. Map each check to stage intent and justify repetition in one table.
4. Remove/demote first batch of low-value duplicates.

Week 3:
5. Add runtime telemetry summary and threshold alerts.
6. Re-baseline expected local feedback time target.

## Final verdict

Overall implementation quality is high, and your safety culture is real.
The immediate problem is not lack of checks but check-system design debt.
The project should now shift from "add more checks" to "optimize check architecture": preserve safety guarantees while reducing repeated, low-yield execution.

If this optimization is done well, you keep your quality bar and recover iteration speed.
