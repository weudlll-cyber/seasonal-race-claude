# Assignment-follows-field (Act 1) — what should happen after the negative SCREEN

Scope: report-only consultation from existing code and reports, no new runs.

## Diagnosis from the SCREEN (why it likely regressed)

- The pooled primary failed the fairness floor: band-reach dropped from 71.1% to 66.8% (below 70%), while dead finales and runaway rose and lead changes fell. Source: reports/evolution/AFF-SCREEN.md.
- Track split matters:
  - searound carries most damage (band-reach 75.1% -> 69.3%, dead 8% -> 24%, runaway 16% -> 24%, lead changes down).
  - luger-hill is mixed (dead improved, runaway flat), but still loses band-reach and front@line.
  - Therefore this is not only a single-track outlier.
- Flap/churn is high (8.79 swaps/racer/race pooled; 9.85 luger, 7.74 searound), but the worse guardrail collapse is on searound where swap count is lower. So flap is likely a contributor, not the only root cause.
- Mechanistic hypothesis from code:
  - AFF reassigns pack slots every OUTCOME tick via one adjacent-swap pass per band (`applyAssignmentFollowsField`), then the servo immediately consumes that new target map in the same update step.
  - This makes target ranks chase live order, which reduces persistent rankError pressure after overtakes and can damp sustained contest (fewer lead changes/front@line) while allowing more natural-speed lock-ins (dead/runaway up on closed tracks).
  - Evidence sites: client/src/modules/racePlanner.js:499-568 and client/src/modules/racePlanner.js:760-795.

## Ranked next-step options

### 1. Stop Act 1 here (recommended baseline decision)

- What it changes: no code change; keep AFF flag present but not pursued for ship path.
- Code site: none required (flag already default OFF in client/src/modules/storage/defaults.js:405).
- Evaluation cost: zero new races/tooling.
- Evidence supporting it:
  - Hard floor broken (66.8% < 70%).
  - Direction is adverse on owner-relevant finale guardrails.
  - Regression appears structural across both tracks, not a single noisy metric.
- Evidence undermining it:
  - AFF did reduce escape median slightly pooled (2.25 -> 2.11), so not every signal is negative.
- Main risk: abandoning now may leave unrealized upside if a simple cadence/hysteresis variant could recover fairness.

### 2. One constrained salvage attempt: roll-boundary cadence AFF (instead of per-tick)

- What it changes: yes, code change.
  - Move AFF reassignment trigger from every OUTCOME tick to scheduled roll events (or equivalent per-racer roll-boundary hook), keeping current intra-band invariant and deterministic mapping.
  - Primary implementation touchpoints:
    - client/src/modules/racePlanner.js:760-764 (where reassignment is triggered each tick)
    - client/src/modules/raceCore.js:507-544 (existing scheduled roll event timing)
    - likely interface plumbing to pass a cadence trigger into controller update.
- Evaluation cost:
  - Reuse existing screen harness scripts/exp-aff-screen.mjs with a cadence mode switch; same first-pass budget as current screen (2 tracks x 2 arms x 25 = 100 races total), then only if positive, a larger confirm gate.
  - New tooling: small extension to existing AFF screen driver (no new measurement framework needed).
- Evidence supporting it:
  - Report itself flags per-tick cadence as twitchy and suggests roll-boundary fallback.
  - Current algorithm’s immediate target chasing can suppress sustained rankError-driven contest.
- Evidence undermining it:
  - searound regressed most despite lower swap count than luger, so cadence reduction alone may not fix the main fairness failure.
- Main risk: may reduce churn but still preserve the same directional effect (targets follow field too closely), yielding little/no fairness recovery.

### 3. Parameter-only salvage pass: increase AFF hysteresis length threshold (H) while keeping per-tick cadence

- What it changes: no mechanism redesign, only threshold tuning (`affSwapThresholdLengths`), already exposed in defaults and screen script.
  - Sites: client/src/modules/storage/defaults.js:406, client/src/modules/racePlanner.js:511, scripts/exp-aff-screen.mjs:34 and scripts/exp-aff-screen.mjs:66.
- Evaluation cost:
  - Very low tooling cost (already parameterized).
  - Race cost similar to one extra screen pass per candidate H value (e.g., 100 races per value with current screen setup).
- Evidence supporting it:
  - High swap churn indicates hysteresis may be too permissive at H=0.5.
- Evidence undermining it:
  - Closed-track fairness collapse (searound) is stronger than swap-count pattern alone suggests; reducing swap count may not reverse dead/runaway deterioration.
- Main risk: tuning H can become local overfitting and still fail the hard 70% floor on broader confirmation.

### 4. Structural redesign: keep static endpoint rank for servo, use AFF only as secondary bias signal

- What it changes: yes, larger code change.
  - Decouple AFF from direct `targetRank` replacement in the servo loop; retain static `_racerTargetRank` as primary target, and feed AFF as a bounded modifier (for example blend/priority term) so endpoint pressure remains stable.
  - Sites likely touched:
    - client/src/modules/racePlanner.js:790-795 (pack target source)
    - client/src/modules/racePlanner.js:699-704 and 763-764 (error construction and assignment use)
    - possibly diagnostics naming in sim observers.
- Evaluation cost:
  - Higher design and test cost than options 2/3.
  - Would need fresh screen spec and likely additional diagnostics; not a quick iteration.
- Evidence supporting it:
  - Current direct replacement likely weakens sustained correction pressure (consistent with lower lead changes/front@line).
- Evidence undermining it:
  - This is no longer “Act 1 minimal deletion of slot pinning”; it is effectively a new mechanism class.
- Main risk: scope expansion and longer uncertainty loop without guarantee of clearing fairness floor.

## Recommendation

Recommendation: run exactly one constrained salvage attempt with roll-boundary cadence (option 2) using the existing SCREEN budget and guardrails; abandon assignment-follows-field entirely if pooled band-reach is still below 70% or if dead/runaway/lead-change direction remains adverse versus control in that rerun.