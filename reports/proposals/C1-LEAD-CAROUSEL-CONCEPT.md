# CONCEPT — C1 "B1 Lead Carousel": Authored Lead Handovers For Sustained P1 Battle

Status: ideation only. No code changes. This document defines the mechanism, constraints, and
evaluation criteria for a later sim sweep.

## 1) Measured Mandate (Committed)

- Baseline: REAL P1 ACTION is low (`p1ContestRate` about 5.3% in V0), and the shipped gap-reroll
  winner does not increase it (about 5.0%).
- Binding blocker: `leadChangeCount` is the hard limiter (`<3` in about 93% of races), while
  front-group proximity is already present in many races under gap-reroll.
- Root cause at source: B1 front choreography steers into static distinct front slots that begin at
  rank 2, with hero strictness 1.0 and release near the end, so lead exchanges are suppressed until
  a short natural run-out.
- Owner target: `p1ContestRate` around 60% overall (provisional gate target, owner eye remains
  final acceptance).
- Metric window: `W = [live choreoResolveB2, first finish]`. Authored handovers only count if they
  occur inside `W`.

## 2) Mechanism

Phase-offset, mutually crossing target-rank curves for B1 racers during OUTCOME:

- Rank 1 becomes a time-shared authored target across B1.
- Handovers are servo-driven through the existing rank-tracking controller.
- Release behavior at live `choreoReleaseProgress` remains unchanged.
- Final order remains emergent from the natural run-out after release.

Hard safety constraints:

- Every carousel waypoint is clamped to `[1, BAND_EDGES[0]]`.
- Amplitudes are filtered by `racerFeasibility` before curve emission.
- OFF-state must remain byte-identical and fingerprint-gated.

## 3) Fairness Claim

When waypoints are clamped to B1 and the mechanism only permutes B1 occupants within ranks 1..5,
band-reach remains invariant by construction (no cross-band targeting).

## 4) Flags And Parameters (default OFF)

- `carouselEnabled` (boolean, default `false`)
- `carouselHandoverCount` (integer, target authored exchanges inside `W`)
- `carouselCadenceMode` (`segment` | `continuous`)
- `carouselAmplitudePolicy` (`uniform` | `feasibilityWeighted`)
- `carouselPhaseOffsetMode` (`even`, `seededJittered`)
- `carouselJitterPct` (0..x, deterministic from race seed)
- `carouselParticipants` (`allB1` | `feasibleTopK`)
- `carouselMinParticipants` (minimum active participants)

All timing inputs are derived from live config values only:

- `choreoOutcomeStart`
- `choreoResolveB2`
- `choreoReleaseProgress`

No hardcoded progress constants are allowed.

## 5) Integration Points (later implementation)

- Curve generation: `client/src/modules/heroCurveGenerator.js`
- Runtime tracking/sampling: `client/src/modules/racePlanner.js`,
  `client/src/modules/heroChoreography.js`
- Defaults + persistence validation: `client/src/modules/storage/defaults.js`,
  `client/src/modules/raceDynamicsConfig.js`
- Browser config threading: `client/src/screens/RaceScreen/index.jsx`
- Sim-first activation + sweeps: `scripts/sim-fairness.mjs`

## 6) Open Questions For Independent Review

1. Handover count and cadence feasibility in `W` under current servo authority and strictness.
2. Curve shape choice: continuous oscillation vs baton-like segments.
3. Participation policy: all B1 vs feasibility-filtered subset; behavior under low feasibility.
4. Interaction with gap-reroll and whether explicit carve-outs are needed.
5. Naturalness risk at ~60% duty and concrete kill conditions.
6. Window alignment: guarantee handovers land inside `W` under any speed/config changes.
7. Runaway guard: ensure no regression beyond confirmed runaway limits.
8. C2 amplifier hook: pre-wire now or defer until C1 is measured.

## 7) Sweep Success Criteria (later)

- `p1ContestRate >= 60%` overall (provisional owner target), plus per-track/per-class reports.
- Report all: `distinctLeaders`, `leadChangeCount`, `maxLeadHoldShare`,
  `frontContestFraction`, `p1LongestMultiSec`.
- Non-regression gates remain binding:
  - `runawayWinnerRate <= 8.3%` overall.
  - `paradeFinishRate <= 2%`.
  - Top-5 action delta `>= 0`.
  - Band reach `>= 70%` (pooled sample for decisions).
  - No material rise in `bandExitAfterRelease`.
  - OFF-state byte-identical fingerprint.
- Sweep must include both: C1 alone and C1×gap-reroll jointly.

Kill-the-line rule:

- If feasible amplitudes cannot push beyond about two distinct leaders without persistent servo
  clamp saturation, the speed-authority model is likely the true limit and requires owner-level
  model decision, not another front mechanism iteration.

## Appendix: Source Anchors For The Root Cause

- B1 cluster starts at rank 2 and is held as a tight front cluster:
  `client/src/modules/heroCurveGenerator.js`.
- Hero target sampling over progress and post-last-point hold:
  `client/src/modules/racePlanner.js`, `client/src/modules/heroChoreography.js`.
- Release behavior and B1 scope:
  `client/src/modules/racePlanner.js`.
- Servo authority and hero strictness:
  `client/src/modules/racePlanner.js`.
- B1 edge definition (`BAND_EDGES[0] = 5`):
  `client/src/modules/racePlanner.js`.
- Feasibility envelope (`racerFeasibility`):
  `client/src/modules/heroCurveGenerator.js`.
