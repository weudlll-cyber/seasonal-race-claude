# Assignment-Follows-Field (Evolution Act 1) — Copilot design consultation

Scope: code-reading only on master ce73592 anchors and adjacent consumers. No runtime experiments.

## 1. Assignment cadence

Observations from current architecture:

- Controller cadence is already per physics step: RaceCore calls `racePlanController.update(st.racers, physicsTs, st.raceProgress)` every fixed-dt step. Evidence: client/src/modules/raceCore.js:464.
- The controller rank signal is recomputed every step from live order (`active = racers.filter(...).sort(...)`), and steering is derived from `rankError = currentRank - targetRank`. Evidence: client/src/modules/racePlanner.js:588, client/src/modules/racePlanner.js:699.
- Scheduled re-roll boundaries are in RaceCore spreadFactor logic, not in planner target-assignment logic. They are duration-scaled (`rollCount`, `rollInterval`) and jittered per racer. Evidence: client/src/modules/raceCore.js:122, client/src/modules/raceCore.js:128, client/src/modules/raceCore.js:507, client/src/modules/raceCore.js:544.
- Release logic for heroes currently depends on constant target pool membership (`_racerTargetRank <= BAND_EDGES[0]`). Evidence: client/src/modules/racePlanner.js:688, client/src/modules/racePlanner.js:691.
- Hero generation is one-shot and seeded; it uses `finalRanks: plan._racerTargetRank` as endpoint constraints. Evidence: client/src/modules/racePlanner.js:615.

Cadence options assessment:

- (a) Every planner tick:
  - Feasible cost-wise for 40/60 racers. Existing loop already sorts O(n log n) and iterates O(n) every tick; intra-band remap over current order is another O(n) pass plus small per-band bookkeeping, so asymptotically dominated by existing sort.
  - Determinism can remain intact if assignment is pure function of current ordered state + fixed config and stable tie-breaks (index is already used for equal `t`). Evidence: client/src/modules/racePlanner.js:588.
  - Natural fit with existing control law because `rankError` is consumed each tick anyway.
- (b) Only at scheduled dice boundaries:
  - Not a natural hook in planner; it couples target assignment to spreadFactor roll cadence, which is a separate subsystem and includes jitter.
  - Risks creating cadence artifacts tied to roll schedule rather than live rank dynamics.
- (c) Fixed timer:
  - Adds a second cadence clock that must scale correctly for 30-300 s races; raw ms timers can violate owner rule unless explicitly duration-normalized.

Interaction implications:

- If AFF is introduced, release check should likely move from static `_racerTargetRank` membership to a stable per-band designation or explicit role flag, otherwise dynamic intra-band target changes can make release gating semantically drift.
- Hero curves currently depend on constant final-rank endpoints; AFF should not rewrite those hero endpoint constraints unless Act 1 explicitly intends to alter choreography contract.

Recommendation: Use per-tick reassignment in the planner update path (pure, deterministic, stable-tie function of live state), and do not bind AFF cadence to scheduled dice or a new ms timer in Act 1.

## 2. Hysteresis

Observed reusable patterns:

- Existing controller avoids tiny target churn with a deadband before target transition reset (`abs(newTarget - trajectoryMultTarget) > 0.001`). Evidence: client/src/modules/racePlanner.js:482.
- Existing anti-jitter domain uses gap/length thresholds for physical behavior (`gapRerollThresholdLengths`) and rank-band thresholds for pack re-steer (`_packReSteerThreshold`). Evidence: client/src/modules/racePlanner.js:334, client/src/modules/racePlanner.js:752.
- Smoothing is already handled via trajectory easing in time; this smooths multiplier transitions, not assignment identity flaps. Evidence: client/src/modules/raceCore.js:470.

Candidate hysteresis assessment:

- Distance-threshold (lengths) swap rule:
  - Best fit to existing semantics for proximity-based decisions and scale invariance across race durations.
  - Can be computed from existing lap-aware gap machinery conventions (used widely in controller/sim).
  - Avoids introducing duration-dependent clocks.
- Minimum hold-time (ms):
  - Viable but introduces explicit time-base sensitivity; without duration scaling it behaves differently at 30 s vs 300 s.
  - If used, should be progress-scaled or tied to normalized race phase, not fixed absolute ms.
- Combined approach:
  - Most robust: primary gate on spatial separation (lengths), optional very short hold as secondary debounce only if needed after initial implementation.

Recommendation: Start with spatial hysteresis in racer lengths as the primary anti-flap mechanism; add hold-time only as a secondary debounce and only in normalized race-progress terms (not fixed ms) if flapping remains.

## 3. Blast radius (constant targetRank consumers)

Minimum requested items:

- Winner reporting from `targetRank===1`:
  - Consumer: winner is selected from `_racerTargetRank` rank 1 at plan creation. Evidence: client/src/modules/racePlanner.js:206.
  - Impact: AFF intra-band dynamic reassignment should not mutate designated winner identity unless owner explicitly wants winner designation to become dynamic (likely out of Act 1 scope).

- `racerAreaBonus` precomputation and area bounds:
  - Consumer: `_racerAreaBonus` precomputed once from constant target rank. Evidence: client/src/modules/racePlanner.js:241, client/src/modules/racePlanner.js:243.
  - Consumer: area bounds for steering are computed from `targetRank` each update. Evidence: client/src/modules/racePlanner.js:702.
  - Impact: if AFF is strictly intra-band (band membership fixed), area bonus and `getAreaBounds` are functionally unaffected, because band index remains constant even if order inside band changes.

- Released-check map read:
  - Consumer: release eligibility reads static `_racerTargetRank <= BAND_EDGES[0]`. Evidence: client/src/modules/racePlanner.js:688, client/src/modules/racePlanner.js:691.
  - Impact: needs an explicit policy decision under AFF (keep static designated B1 set vs dynamic current top-band set). Do not leave implicit.

- Tests pinned to constant targets:
  - Consumer: permutation/winner invariants and many rankError/areaBonus expectations assume static `_racerTargetRank`. Evidence: client/src/modules/racePlanner.test.js:57, client/src/modules/racePlanner.test.js:65, client/src/modules/racePlanner.test.js:397.
  - Impact: substantial test refactor or split between static endpoint map and dynamic runtime assignment map.

Additional material consumers found by grep:

- Hero curve generation endpoint contract:
  - Consumer: `generateHeroCurves` receives `finalRanks: plan._racerTargetRank`. Evidence: client/src/modules/racePlanner.js:615.
  - Impact: AFF should preserve this as static endpoint contract in Act 1, or choreography behavior changes.

- RaceCore plan info + UI labels:
  - Consumer: RaceCore exports `targetRanks` and B1 index list from static map. Evidence: client/src/modules/raceCore.js:265, client/src/modules/raceCore.js:267.
  - Consumer: HUD/dev UI display targetRank-based diagnostics. Evidence: client/src/screens/RaceScreen/RacePlanHUD.jsx:95, client/src/screens/RaceScreen/index.jsx:873.
  - Impact: decide whether UI shows static assigned endpoint rank, dynamic AFF rank, or both to avoid operator confusion.

- Camera and B1 logic:
  - Consumer: camera/b1Indices semantics rely on targetRank<=5 pool. Evidence: client/src/modules/camera/CameraDirector.js:501.
  - Impact: keep static B1 pool semantics unless camera design is intentionally changed.

- Analytics and fairness observers:
  - Consumers in sim diagnostics/fairness calculations use targetRank as baseline variable. Evidence: scripts/sim-fairness.mjs:1591, scripts/sim-fairness.mjs:2320, scripts/sim/observers/fairness-stats.mjs:95, scripts/sim/observers/gap-metrics.mjs:160.
  - Impact: if AFF introduces a second dynamic assignment signal, analytics must clearly label which rank concept is used (static endpoint vs live assigned).

- Hero generator clustering anchor:
  - Consumer: B1 cluster starts at rank 2 and caps at BAND_EDGES[0]. Evidence: client/src/modules/heroCurveGenerator.js:417, client/src/modules/heroCurveGenerator.js:418.
  - Impact: compatible with AFF if AFF remains intra-band and does not redefine B1 band membership.

Recommendation: Keep a static endpoint map as a first-class contract (winner identity, hero endpoints, analytics baseline) and add AFF as a separate runtime assignment layer; explicitly re-spec released-check and UI/telemetry naming to avoid static-vs-dynamic rank ambiguity.
