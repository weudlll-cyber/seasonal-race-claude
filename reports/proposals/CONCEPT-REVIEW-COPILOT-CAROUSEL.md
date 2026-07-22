# Concept Review (Copilot) — C1 B1 Lead Carousel

Status: review only. No code changes.

## Verdict

Recommendation: build modified.

Rationale:

- The root-cause diagnosis is correct at source: B1 is currently authored toward a static front
  cluster beginning at rank 2, so rank 1 is not a persistent target and swaps are naturally rare
  before release.
- C1 is architecture-compatible with existing hero curve sampling and servo control.
- To reach owner-level duty (about 60% `p1ContestRate`) without looking mechanical, C1 needs explicit
  cadence and participation guardrails, not just "turn on oscillation".

## Source-verified feasibility baseline

1. Front static-cluster behavior is explicit:
   [client/src/modules/heroCurveGenerator.js](../../client/src/modules/heroCurveGenerator.js#L411).
2. B1 resolve uses release progress; deeper bands resolve earlier:
   [client/src/modules/heroCurveGenerator.js](../../client/src/modules/heroCurveGenerator.js#L107).
3. Hero target is sampled from time-varying curves; after release B1 hero target becomes current rank
   (steering neutralized): [client/src/modules/racePlanner.js](../../client/src/modules/racePlanner.js#L673).
4. Hero strictness is pinned to 1.0 while choreographed:
   [client/src/modules/racePlanner.js](../../client/src/modules/racePlanner.js#L697).
5. Controller authority clamps are bounded (`gain 2.0`, `minMult 0.85`, `maxMult 1.10`):
   [client/src/modules/racePlanner.js](../../client/src/modules/racePlanner.js#L67).
6. B1 definition comes from `BAND_EDGES[0] = 5`:
   [client/src/modules/racePlanner.js](../../client/src/modules/racePlanner.js#L38).
7. Winner assignment `targetRank === 1` is explicitly reporting-only:
   [client/src/modules/racePlanner.js](../../client/src/modules/racePlanner.js#L190).
8. Curves already support arbitrary waypoint shapes and smooth min-jerk interpolation:
   [client/src/modules/heroChoreography.js](../../client/src/modules/heroChoreography.js#L139).
9. Feasibility envelope exists and should gate C1 amplitude/cadence:
   [client/src/modules/heroCurveGenerator.js](../../client/src/modules/heroCurveGenerator.js#L102).
10. Sustained-P1 metric window is already implemented as `[choreoResolveB2, first finish]`:
   [scripts/sim/observers/outcome-front-battle.mjs](../../scripts/sim/observers/outcome-front-battle.mjs#L22).

## Answers to open questions

### 1) Handover count and cadence realism in W

Assessment: `>=3` completed lead exchanges in `W` is realistic for most seeds, but only with bounded
cadence and feasibility-filtered participants.

- Measured context says proximity is mostly present while lead changes are missing, so the geometric
  precondition is already satisfied by many races.
- The current suppression comes from static target slots plus strict servo tracking, not from lack of
  nearby challengers.
- In C1, the practical ceiling is not "number of wave peaks", but "number of completed and readable
  passes before release without clamp saturation".

Design implication:

- Start with `3` intended handovers inside `[choreoResolveB2, choreoReleaseProgress]`, plus deterministic
  jitter so seeds do not look periodic.
- Treat a handover as complete only if the incoming leader holds rank 1 for a minimum dwell duration.

### 2) Curve shape: continuous oscillation vs baton segments

Recommendation: baton segments over continuous oscillation.

- `sampleHeroCurve` already gives smooth min-jerk interpolation between waypoints, so baton segments
  can stay visually smooth while still giving explicit "take-turn" intervals.
- Continuous oscillation increases risk of near-threshold oscillatory behavior where nobody owns the
  lead long enough to read as a handover.
- Baton segments also make servo load easier to bound because slopes are intentionally staged.

### 3) Participation policy and winner assignment relation

Recommendation: use a feasibility-filtered `3–4` B1 participants, not all five by default.

- All-five participation maximizes conflict density but raises parade/synchrony risk.
- A filtered subset provides cleaner visual handoffs and lower clamp pressure.
- If fewer than 3 are feasible, C1 should gracefully degrade to reduced cadence instead of forcing
  impossible amplitude.
- No direct tie to assigned winner is needed: winner assignment is reporting-only in current design,
  and final winner remains emergent after release.

### 4) Interaction with gap-reroll (opposing effects)

Assessment: no explicit carve-out initially; joint sweeps are mandatory.

- Gap-reroll acts on scheduled spread-factor draws inside an OUTCOME-derived window, while C1 acts
  continuously through `trajectoryMult`; both are deterministic and multiplicative in motion updates.
- Because trajectory clamps are strong and applied every frame, C1 should dominate moment-to-moment
  handover execution, while gap-reroll will shape persistence and runaway risk over longer windows.
- Carve-outs increase complexity and may hide interactions; first test C1 alone and C1×gap-reroll,
  then add carve-outs only if runaway or naturalness regressions appear.

### 5) Naturalness at high duty (~60%)

Primary risk: visible "choreographed shuffle".

Mitigations:

- Seeded jitter on start phase, segment duration, and amplitude within feasibility bounds.
- Per-racer cadence variance to avoid synchronous phase-locking.
- Limit maximum consecutive authored P1 holdings per racer.

Kill conditions:

- `paradeFinishRate > 2%`.
- Material increase in controller clamp residency in B1 during `W`.
- Owner eye-veto for visibly patterned shuffle despite metric gain.

### 6) Window alignment under config/speed changes

Requirement-compliant derivation:

- Derive C1 schedule directly from live `choreoResolveB2`, `choreoReleaseProgress`, and
  `choreoOutcomeStart` values already threaded into plan creation in browser and sim.
- Express phase as normalized local time in the live interval, never fixed progress literals.
- Keep metric window and authored handover schedule driven by the same config fields so they co-move.

### 7) Runaway guard

Risk exists: a carousel-led racer can convert to escape if handover cadence leaves long uninterrupted
P1 dwell plus favorable natural spread.

Why baseline guard is reasonable:

- Waypoints stay in B1, so C1 is not authoring deep breakouts by rank intent.
- Gap-reroll down-tilt already penalizes opened holes behind a leader inside its active window.

Still required:

- Treat `runawayWinnerRate > 8.3%` as hard fail.
- Inspect per-track runaway deltas; no aggregate-only pass.

### 8) C2 amplifier hook now or later

Recommendation: define interface hook now, defer behavior activation.

- Add a clean extension point in concept/spec terms (for future B2 raider overlays) so C1 does not
  need structural rework.
- Do not activate C2 logic before C1 measurement, or attribution gets ambiguous.

## What this concept still misses

- It does not, by itself, guarantee visual readability of each handover; dwell and spacing constraints
  are required.
- It does not solve all topological variance automatically; track-specific cadence tuning may still be
  needed after first sweep.
- It assumes current speed authority is sufficient; if clamp saturation is needed to exceed about two
  leaders repeatedly, the speed model may be the limiting subsystem.

## Proposed build modifications (before first sweep)

1. Prefer baton-segment curve generator for B1 carousel.
2. Default participants to feasibility-filtered top 3 or 4 in B1.
3. Add deterministic jitter envelope on cadence and amplitude.
4. Add explicit handover-completion definition (minimum hold).
5. Keep flags default OFF and fingerprint-gated for byte-identical OFF behavior.

## Final recommendation

Build modified.

Proceed sim-first with two mandatory arms:

1. C1 only.
2. C1×gap-reroll jointly.

Accept only if the full gate set holds and the owner eye confirms the outcome is a sustained,
multi-racer P1 battle rather than a periodic shuffle.
