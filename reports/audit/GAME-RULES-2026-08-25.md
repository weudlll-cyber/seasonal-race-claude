NOT ANSWERED
- I did not execute a fresh fairness run in this audit, so I cannot provide a command output that re-confirms the currently shipped 85–90% per-track arrival claim on the current tree state.
- I did not complete a full CI/pipeline trace for every ship path, so I cannot prove that every documented fairness gate is mechanically enforced before release rather than process-enforced.
- I did not verify whether any file used as evidence changed during this audit window.

## 1 · FAIRNESS

Method compared: each explicit promise line in docs/FAIRNESS.md against runtime race code (racePlanner/raceCore/RaceScreen) and fairness metric code (sim observer).

1) Promise: row-blind draw before the start.
- Promise quote: "Row-blind draw, before the start... Every racer is assigned a target finishing PLACE by a draw that is blind to its start row" (docs/FAIRNESS.md:18-20).
- Keeping code quote: "assign random targetRank 1..n... Fisher-Yates shuffle" and assignment by racer index (client/src/modules/racePlanner.js:199-208).
- Decision: KEPT. The draw uses shuffled rankPool and does not read startRowIndex for assignment.

2) Promise: equal-win-chance-from-every-row measured by gate lines.
- Promise quote: "band-reach ≥ 70% ... AND zero Holm-unfair start rows" (docs/FAIRNESS.md:21, 58).
- Keeping code quote: computeZoneSuccessRate and computeFairnessStats exist (scripts/sim/observers/fairness-stats.mjs:18, 78), Holm correction is implemented (scripts/sim/observers/fairness-stats.mjs:139, 428).
- Decision: KEPT AS METRIC IMPLEMENTATION. This is measurement code, not a runtime per-frame invariant.

3) Promise: in-race delivery to drawn band.
- Promise quote: "Every racer actually REACHES the band of its drawn place" (docs/FAIRNESS.md:25-26).
- Keeping code quote: per-step target steering in update() (client/src/modules/racePlanner.js:553, 649, 654-657), plus draw bias toward band in computePulkBiasedTarget (client/src/modules/racePlanner.js:962, 974-985).
- Decision: PARTIALLY KEPT. The engine actively steers toward the drawn band but does not hard-lock final rank to target rank.

4) Promise text for COMBO15 mechanism.
- Promise quote: "by biasing the re-roll DRAW... not by any positional force" (docs/FAIRNESS.md:43-44).
- Contradicting code quote: trajectory controller sets multipliers from rank/band error each step (client/src/modules/racePlanner.js:553-557, 654-657).
- Decision: NOT KEPT AS WRITTEN. Current source uses both draw bias and positional steering.

5) Promise: headline target and gate lines are permanent.
- Promise quote: "headline target is 85–90% / track" and "permanent gate line" (docs/FAIRNESS.md:60, 76).
- Compared code quote: runtime race code has no ship gate check; race loop only advances physics/controller (client/src/modules/raceCore.js:465-615). Gate functions live in observer/report code (scripts/sim/observers/fairness-stats.mjs:18-306).
- Decision: NOT PROVEN AS ENFORCEMENT. The measurements exist; automatic blocking in runtime engine is not present in compared code.

Guarantees code makes that FAIRNESS.md does not claim explicitly
- Stable deterministic tie-break when ranking active racers: "stable tiebreak: lower index = higher rank" (client/src/modules/racePlanner.js:654-657).
- Plan activation duration gate: plan is disabled below minimum duration (client/src/modules/raceCore.js:213-215). FAIRNESS.md does not state this runtime switch.

## 2 · THE RACE PLAN

What is decided in advance
- Target ranks for all racers: random permutation in createRacePlan (client/src/modules/racePlanner.js:199-208).
- Designated winner ID for reporting: "Winner = racer with targetRank=1" (client/src/modules/racePlanner.js:210-212).
- Pulk participants selected at plan creation (client/src/modules/racePlanner.js:214-228).
- Phase boundaries resolved and clamped (client/src/modules/racePlanner.js:168-193, 251-256).

When it is decided and applied
- Plan is created at race init if enabled and duration gate passes (client/src/modules/raceCore.js:213-215, 224-230).
- Plan controller runs every fixed physics step before re-roll/move (client/src/modules/raceCore.js:528).
- Re-roll bias is applied only at scheduled re-roll events (client/src/modules/raceCore.js:571-608).

What remains free with plan on
- Pre-outcome pin can keep racers at neutral 1.0 target when conditions match (client/src/modules/racePlanner.js:649-652).
- In-band randomness remains: band bias returns rawSample when in-band (client/src/modules/racePlanner.js:982-985).
- Gap bias is deterministic transform of already drawn sample and can no-op outside window (client/src/modules/racePlanner.js:1015-1017, 1058-1065).

Can the plan be violated at runtime
- Yes, in the sense of final outcome diverging from intended target rank map, because the plan is steering, not hard assignment.
- Evidence: controller sets multipliers, not rank locks (client/src/modules/racePlanner.js:553-557, 654-657); movement still flows through race physics/avoidance and re-roll stochasticity (client/src/modules/raceCore.js:571-615).
- Required conditions for divergence: enough traffic/avoidance/phase timing and finite race duration so correction does not fully converge before finish.

Paths that bypass planned behavior
- Plan disabled by flag (client/src/modules/raceCore.js:213).
- Plan disabled by duration threshold (client/src/modules/raceCore.js:214-215; defaults at client/src/modules/storage/defaults.js:914).
- Unseeded path keeps native randomness (client/src/modules/racePlanner.js:48, 143, 437).

## 3 · DETERMINISM

Method compared: docs/SIM.md determinism claims against race RNG wiring, step loop timing, sort order, and config loading.

Determinism claims in docs
- "Random but replayable" for Quick-Test, and explicit unseeded Start Race path (docs/SIM.md:75, 81, 85).

Non-seed inputs and whether they can change outcome

1) Track geometry/topology inputs: YES.
- Evidence: pathLengthPx/trackWidth/isOpen affect start layout, row offsets, finish model, and motion terms (client/src/modules/raceCore.js:104-168).

2) Duration model inputs (laps/requestedSeconds/speedMultiplier/runoutZone): YES.
- Evidence: deriveRaceDuration outputs finishT/race_baseSpeed/realizedDurationSec consumed by the race (client/src/modules/raceCore.js:104-111).

3) Storage-loaded configs (baseSpeed, behavior, row, dynamics, frame timing): YES.
- Evidence: loaded at race init (client/src/screens/RaceScreen/index.jsx:460-466), then consumed in race creation/step (client/src/modules/raceCore.js:114-215, 520-615).

4) Racer type speed multiplier: YES.
- Evidence: speedMultiplier from selected racer type (client/src/screens/RaceScreen/index.jsx:457-459) feeds baseSpeed in race core (client/src/modules/raceCore.js:164).

5) Plan enabled flag and min-duration gate: YES.
- Evidence: racePlanEnabled condition (client/src/modules/raceCore.js:213-215).

6) Frame timing/wall-clock segmentation: POSSIBLE.
- Evidence: accumulator uses rawDt and has catch-up cap of 2 steps (client/src/screens/RaceScreen/index.jsx:967-978); smoothDt is excluded from physics (client/src/screens/RaceScreen/index.jsx:869).
- Reason: physics integration is fixed-step, but wall-clock chunking drives accumulator fill and cap behavior.

7) Collection ordering and tie handling in rank sort: CONTROLLED.
- Evidence: explicit stable tie-break in planner active sort (client/src/modules/racePlanner.js:654-657).

8) Floating-point accumulation/order effects: POSSIBLE.
- Evidence: repeated incremental updates in per-step loop and easing/multiplies (client/src/modules/raceCore.js:520-615).

9) Seed mode itself (seed <= 0): YES, outcome variability by design.
- Evidence: makeRaceRng returns Math.random when seed <= 0 (client/src/modules/racePlanner.js:48).

Separate-seed shape check (camera-style issue)
- Race physics stream is explicit from racePlanSeed (client/src/modules/raceCore.js:114).
- No second race-physics RNG seed source was found in compared race modules.

## 4 · THE NUMBERS THAT SHAPE THE RACE

Method compared: ten defaults in client/src/modules/storage/defaults.js against direct consuming code in raceCore/racePlanner.

1) normalSpeedPxPerSec (client/src/modules/storage/defaults.js:60)
- Comment says one normal pace for all tracks/classes (client/src/modules/storage/defaults.js:47-53).
- Consumed by duration model -> finishT/race_baseSpeed (client/src/modules/raceCore.js:104-111).
- Match status: MATCHES compared behavior.

2) rowGapMultiplier (client/src/modules/storage/defaults.js:64)
- Consumed into rowGapPx and per-row start spacing (client/src/modules/raceCore.js:116-118, 139-151).
- Match status: MATCHES compared behavior.

3) speedBonusFactor (client/src/modules/storage/defaults.js:65)
- Consumed by computeSpeedBonus in start speed compensation (client/src/modules/raceCore.js:139-146).
- Match status: MATCHES compared behavior.

4) reRollVariationPercent (client/src/modules/storage/defaults.js:892)
- Consumed as halfWidth for re-roll spread movement (client/src/modules/raceCore.js:407, 572).
- Match status: MATCHES compared behavior.

5) reRollIntervalDivisor (client/src/modules/storage/defaults.js:894)
- Consumed in rollCount/rollInterval schedule (client/src/modules/raceCore.js:126-129, 608).
- Match status: MATCHES compared behavior.

6) racePlanBonusStrengthMultiplier (client/src/modules/storage/defaults.js:898)
- Forwarded into plan bonusStrengthMultiplier (client/src/modules/raceCore.js:228-230).
- Match status: MATCHES compared behavior.

7) racePlanPulkStart (client/src/modules/storage/defaults.js:906)
- Forwarded into phase fractions and used as pulk boundary (client/src/modules/raceCore.js:239; client/src/modules/racePlanner.js:168-170, 184-188).
- Match status: MATCHES compared behavior.

8) racePlanMinDurationSec (client/src/modules/storage/defaults.js:914)
- Comment says below threshold falls back to raw physics (client/src/modules/storage/defaults.js:911-914).
- Consumed in plan enable gate (client/src/modules/raceCore.js:213-215).
- Match status: MATCHES compared behavior.

9) chaosSteer and chaosSteerGain (client/src/modules/storage/defaults.js:921-922)
- Comment ties these to arrival lift (client/src/modules/storage/defaults.js:916-920).
- Consumed in controller pre-pulk steering branch (client/src/modules/raceCore.js:300-301; client/src/modules/racePlanner.js:649-652).
- Match status: MATCHES compared behavior.

10) bandBias, bandBiasR, bandBiasGain (client/src/modules/storage/defaults.js:923-925)
- Comment says OFF reproduces pre-combo behavior (client/src/modules/storage/defaults.js:919).
- Consumed in computePulkBiasedTarget branch and R-threshold gate (client/src/modules/racePlanner.js:974-985).
- Match status: MATCHES compared behavior.

Comments that describe behavior no longer present
- Found one in this comparison scope: postStartHoldMs behavior is described as retired in defaults (client/src/modules/storage/defaults.js:348-351), and racePlanner confirms the old postStartHold path was removed (client/src/modules/racePlanner.js:232-240).

## 5 · THE ONE QUESTION ONLY AN OUTSIDER CAN ANSWER

Worst newcomer-misleading cases after reading docs/SIM.md and docs/FAIRNESS.md, then code

1) FAIRNESS mechanism description over-attributes improvement to draw bias.
- Document lead: "biasing the re-roll DRAW... not by any positional force" (docs/FAIRNESS.md:43-44).
- Code reality: runtime outcome steering includes per-step positional correction via trajectoryMult targeting (client/src/modules/racePlanner.js:553-557, 654-657).
- Why this misleads: a newcomer will inspect only draw bias functions and miss the stronger positional controller.

2) "Same speed" wording vs actual per-racer speed construction.
- Document lead: "all racers... same type, same speed" (docs/FAIRNESS.md:14).
- Code reality: each racer gets spreadFactor draws, row bonus, and dynamic multipliers (client/src/modules/raceCore.js:153-165, 571-608).
- Why this misleads: newcomer expectation of equal instantaneous speed conflicts with implemented stochastic/dynamic speed model.

3) "Same seed gives same race" can be over-generalized from SIM docs if reader misses the mode boundary.
- Document lead: deterministic Quick-Test framing (docs/SIM.md:75).
- Document qualifier: Start Race remains unseeded (docs/SIM.md:81, 85).
- Code reality: RNG is deterministic only when seed > 0, otherwise Math.random (client/src/modules/racePlanner.js:48, 143, 437).
- Why this misleads: newcomer may assume global determinism instead of mode-scoped determinism.
