# OUTCOME-FORCES — Copilot inventory (read-only)

## Scope

Read-only source inventory. No code, no commits, no runs.

Checked at source:
- client/src/modules/raceStep.js
- client/src/screens/RaceScreen/index.jsx
- client/src/modules/racePlanner.js
- client/src/modules/raceGovernor.js
- client/src/modules/heroCurveGenerator.js
- client/src/modules/raceBehavior.js
- client/src/modules/raceBehaviorConfig.js
- client/src/modules/raceBaseSpeed.js
- client/src/modules/rowLayout.js
- client/src/modules/storage/defaults.js
- client/src/screens/DevScreen/sections/DynamicsTuningSection.jsx
- client/src/screens/DevScreen/sections/BehaviorTuningSection.jsx
- client/src/screens/DevScreen/sections/RacerEditModal.jsx
- scripts/sim-fairness.mjs

Not read:
- results/OUTCOME-FORCES-CC.md

## 1. Parity: browser and sim

Browser and fairness sim use the same forward-step chain.

Verified:
- The browser calls `advanceRacerT` from `RaceScreen/index.jsx`.
- The fairness sim imports the same `advanceRacerT` from `scripts/sim-fairness.mjs`.
- Both also import the same `createRacePlan`, `createTrajectoryController`, and `applyPulkLeadRotation` modules.

Conclusion:
- Browser race path and fairness sim share the same t-update formula and the same OUTCOME/PULK control sources.
- There is one deliberate non-parity model in `headlessRaceSimulator.js`; its own file comment states it omits `trajectoryMult`, `areaBonusMult`, `governorMult`, and racer-type `speedMultiplier` by design. That file is not the fairness/live parity path.

## 2. Phase map and what happens at 0.97 / 1.0

Under the live race-plan path:
- `racePlanPulkStart` default: 0.25.
- `choreoOutcomeStart` default: 0.5.
- `createRacePlan` sets `pulkEnd := choreoOutcomeStart` and `corridorStart := choreoOutcomeStart`.
- Therefore the effective shipped boundaries are:
  - CHAOS: 0.00 to 0.25
  - PULK: 0.25 to 0.50
  - OUTCOME: 0.50 to 1.00
  - FINAL: after leader progress reaches 1.00

At about 0.97:
- `choreoReleaseProgress` default is 0.97.
- In `createTrajectoryController.update`, B1 heroes are released there by setting `targetRank := currentRank`.
- That is not a direct speed multiplier; it removes special hero steering for those heroes and lets them run on natural rank error from there.

Distinct final regime:
- There is no separate global speed regime at 0.97.
- There is a distinct per-racer post-finish regime: once `r.finished` is true, the normal `advanceRacerT` chain is bypassed and `runoutDecay` takes over.
- `runoutZone` is not a per-frame force; it moves the open-track finish line earlier so the runout regime starts before track end.

## 3. Shared forward-speed chain

Pre-finish, the shared t-update is:

`r.t += r.baseSpeed * boost * brake * rowEnvMult * r.trajectoryMult * r.areaBonusMult * (r.governorMult ?? 1.0) * dt`

with:
- `r.baseSpeed = race_baseSpeed * speedMultiplier * spreadFactor * speedBonusMult`
- `dt = 1.0` in the browser fixed step and in the fairness sim fixed step

So the complete pre-finish chain is:

`race_baseSpeed * speedMultiplier * spreadFactor * speedBonusMult * draftingBoost * brake * rowEnvMult * trajectoryMult * areaBonusMult * governorMult`

Post-finish, the chain changes to:

`runoutDecay *= 0.97; r.t += r.baseSpeed * runoutDecay`

No drafting, no brake, no row envelope, no trajectory controller, no area bonus, no governor in the runout path.

## 4. Force inventory

| name | where | how | default | range | direction | phase gating | who | DevScreen | source |
|---|---|---|---|---|---|---|---|---|---|
| `race_baseSpeed` | `raceBaseSpeed.js` via `computeRaceBaseSpeed`; assembled in `RaceScreen/index.jsx` | multiplicative base scalar | derived from `finishT / (REFERENCE_FPS * targetDurationSeconds)` | race-wide common scalar, >0 when duration >0 | neither; common to all racers | all phases before finish | all racers | not exposed directly | single source for formula |
| `speedMultiplier` | racer-type definitions, read by `getSpeedMultiplier()` in `RaceScreen/index.jsx` | multiplicative inside `baseSpeed` | per type; shipped built-ins span 0.3 to 1.25 | shipped built-ins: 0.3 (`Snail`) to 1.25 (`Rocket`); user overrides can widen it | boost-only relative to 1.0 if >1, brake-only if <1 | all phases, including OUTCOME | all racers of chosen type | exposed as `Speed Multiplier` in Racer Edit modal / Racer Editor, not in Race Tuning | two sources: built-in type config plus user override path |
| `spreadFactor` | initialized and re-rolled in `RaceScreen/index.jsx`; same logic in `sim-fairness.mjs` | multiplicative inside `baseSpeed` | derived from `DEFAULT_BASE_SPEED_CONFIG` min/max | default band: 0.00096/0.001045 = 0.91866 to 0.00113/0.001045 = 1.08134 | bidirectional around 1.0 | active from race start until `physicsTs < lastRollDeadline`; default deadline is 95% of realized race duration, so still active through most OUTCOME | all racers | exposed indirectly via `Min Speed`, `Max Speed`, `Variation Width (%)`, `Transition Smoothness (s)`, `Re-Roll Frequency`, `Last Roll Position (%)` | one live writer per engine; same shape browser and sim |
| `speedBonusMult` / `rawRowBonus` | `rowLayout.js` `computeSpeedBonus`; baked in `RaceScreen/index.jsx` | multiplicative inside `baseSpeed` | depends on row geometry; `speedBonusFactor` default 1.0 | front row exactly 1.0; rear rows >1.0; source has no global hard cap because it depends on track width, path length, row count, and finishT | boost-only | all phases unless reduced by `rowEnvMult` | rear rows only | exposed as `Speed Bonus Factor` under Start | single formula source, but race-dependent and not globally source-capped |
| `rowEnvMult` | `raceStep.js` `computeRowEnvMult` | multiplicative correction on top of baked `speedBonusMult` | default POST arm = 1.0; PULK arm = 0 | for a racer with `rawRowBonus > 0`, reachable range is `(1 + rawRowBonus * s) / (1 + rawRowBonus)` with `s` in configured phase arm range; default OUTCOME/POST = 1.0 exactly | brake-only when arm < 1, neutral at 1 | OUTCOME uses POST arm; under defaults `rowBonusPost = 1`, so OUTCOME value is identically 1.0 and the full baked row bonus returns | racers with `rawRowBonus > 0` | exposed as `Enable phase-split bonuses`, `Row bonus — POST`; PULK arm exposed separately as `Row bonus — PULK` | single shared source in `raceStep.js` |
| `draftingBoost` / `draftingBoostActive` | set in `raceBehavior.js`; consumed in `RaceScreen/index.jsx` / `advanceRacerT` | multiplicative | 1.04 | 1.0 or 1.04 with current behavior path | boost-only | active in all race phases when cone conditions hold; not phase-gated by OUTCOME/PULK | racers in drafting cone behind another racer | exposed as `Boost Factor` under `Drafting / Slipstream` | single behavior source |
| `speedBrakeFactor` via `computeEffectiveBrakeFactor` | `raceBehaviorConfig.js` and `RaceScreen/index.jsx` | multiplicative brake floor | 0.945 | closed tracks: fixed 0.945 when braking; open tracks: from 1.0 at race start down to 0.945 over `avoidanceWarmupMs`, then 0.945; by OUTCOME in a normal 60s race, warmup is long over | brake-only | active in any phase when `avoidanceActive`; warmup ramp only matters on open tracks and only near race start | racers with `avoidanceActive` | only the warmup is exposed here as `Avoidance Warmup (ms)`; the 0.945 floor itself is pinned in behavior defaults | floor from one source, but exposed only indirectly |
| `brakeMatchFactor` | written by `raceBehavior.js`, read in `RaceScreen/index.jsx` as `min(effectiveBrakeFactor, brakeMatchFactor)` | multiplicative clamp/brake | derived, no fixed scalar | practical range is `(0, 1]`; no explicit lower floor in source other than positivity of speeds; on open tracks it can brake harder than 0.945 | brake-only | open tracks only in the brake-match path; can be active in OUTCOME if pair conditions hold | racers in brake-match hold | not exposed directly as a single label; underlying thresholds live in behavior defaults and LBB controls, but the cap value itself is runtime-derived | one runtime-derived source |
| `trajectoryMult` | target written in `racePlanner.js` controller; eased in `RaceScreen/index.jsx` and `sim-fairness.mjs` | multiplicative | target clamp defaults: `minMult=0.85`, `maxMult=1.1`; transition duration 1.0s | reachable target range 0.85 to 1.1; actual value slews toward target via ease over `trajectoryTransitionDuration` | bidirectional, asymmetric: +10% max boost, -15% max brake | active in OUTCOME; for nonheroes it is pinned to 1.0 outside OUTCOME and again in FINAL; B1 heroes are released at 0.97; non-B1 heroes can still steer on curve until final | all racers in OUTCOME; heroes get curve-driven targets, pack gets rank-error targets | transition time exposed as `Trajectory Transition Duration (s)`; OUTCOME start/end exposed as `P-Controller starts (% race)` / `P-Controller ends (% race)`; `gain/minMult/maxMult` are pinned constants, not exposed | mixed: one controller source, but `gain/minMult/maxMult/bandStrictness` are pinned in `racePlanner.js` |
| `heroCurve` sampled target rank | `heroCurveGenerator.js` generates, `racePlanner.js` samples via `sampleHeroCurve` | indirect gate/input into `trajectoryMultTarget`, not a direct multiplier | generated from seeded cast and defaults like `choreoIntensity`, `choreoReleaseProgress`, `bandResolve` | no direct speed range; it changes the rank target the servo chases | bidirectional through trajectory servo only | active from `pulkStart` onward for heroes; B1 heroes released at 0.97; generator is only used when race plan is enabled | hero subset only | exposed in part as `Choreography intensity (0–1)` and the `choreoReleaseProgress` family is in dynamics defaults but not surfaced in this Race Tuning card except intensity and PULK end; no direct speed label | two-layer source: generator config plus controller sampler |
| `areaBonusMult` | assigned/rescaled in `racePlanner.js` controller update | multiplicative | raw map built from `racePlanBonusStrengthMultiplier` 2.0, but under shipped choreo path it is cut to 1.0 from `pulkStart` onward | under shipped choreo path, OUTCOME reachable value is exactly 1.0; under race-plan-disabled path it is also effectively 1.0 because controller never writes it | boost for upper bands, brake for lower bands when active; neutral in OUTCOME under shipped path | under shipped choreo path it is zeroed to 1.0 from the CHAOS boundary onward, so it is inert in both PULK and OUTCOME; PULK/POST split knobs exist but do not revive it once choreo cut has happened | all racers when active | `Race Plan Bonus Strength`, `Bonus active until`, `Bonus fade duration`, `Area bonus — EARLY/POST/PULK`, but these are inert in OUTCOME under shipped choreo path | split: raw bonus map in planner, phase split in planner, defaults in storage; browser threads fallback literals that are required to mirror defaults |
| `governorMult` | `raceGovernor.js` `applyPulkLeadRotation`; consumed in `raceStep.js` | multiplicative | starts 1.0; realism envelope defaults `maxEffect=0.12`, `maxStepPerFrame=0.01`, naturalness ceiling 1.2 | inside PULK it is clamped within `[1-maxEffect, 1+maxEffect]` before ceiling; outside the live window the function slews it back to 1.0 | bidirectional, asymmetric by configured `leaderBrake` and `challengerBoost` | PULK only; by OUTCOME it is structurally driven back to 1.0 and is not an active OUTCOME force | attacker slots, outsider slot, and brake-set members; never all racers equally | key strengths exposed in `PULK Phase` card (`Leader brake`, `Challenger boost`, `Ex-leader drop depth`, `PULK end / OUTCOME begins`); envelope internals are pinned defaults | one shared writer, but config fallbacks are duplicated in RaceScreen setup |
| `computePulkBiasedTarget` / `pulkBiasGain` | `racePlanner.js` controller, called during re-roll pass in `RaceScreen/index.jsx` and sim | additive bias on re-roll target before clamp; indirect because it changes future `spreadFactorTarget` | 2.0 | no direct multiplicative range; bias shifts the re-roll sample toward pulk centroid, then final target is still clamped to the natural spread band | bidirectional around raw sample | active only in PULK and only for `plan.pulkRacerIds`; the modified `spreadFactor` then persists into OUTCOME and re-rolls still continue until 95% | only the three pulk racers | exposed as `pulkBiasGain` in defaults and PULK bonuses section, not as a separate speed multiplier | single planner source |
| `runoutDecay` | initialized in `RaceScreen/index.jsx`; post-finish path in `RaceScreen/index.jsx` | multiplicative decay, then additive t advance using decayed factor | starts at 1.0; per finished frame multiplied by 0.97 | 1.0, 0.97, 0.9409, ... approaching 0 | brake-only decay after finish | only after `r.finished` becomes true; not part of pre-finish OUTCOME | finished racers only | not exposed | hand-coded in RaceScreen only; not in shared `advanceRacerT` |
| `runoutZone` | `RaceScreen/index.jsx` / track setup | gate on where finish line sits for open tracks, not a direct multiplier | 0.05 | 0 to 0.2 via behavior config | neither by itself; it changes when runout starts | open-track only; affects when post-finish regime begins | all racers on open tracks | exposed as `Runout Zone` under Start Layout | single source |

## 5. What is live in shipped OUTCOME

Under shipped plan-enabled choreography, the OUTCOME-speed chain simplifies more than it first appears.

At default settings in OUTCOME, before a racer finishes:
- `governorMult` is returning to 1.0 and is not an active PULK force anymore.
- `areaBonusMult` is already pinned to 1.0 from the CHAOS boundary onward.
- `rowEnvMult` is exactly 1.0 in POST because `rowBonusPost = 1` by default.

So the shipped pre-finish OUTCOME chain is effectively:

`race_baseSpeed * speedMultiplier * spreadFactor * speedBonusMult * draftingBoost * brake * trajectoryMult`

That is the important practical result: in shipped OUTCOME the active live terms are mostly `spreadFactor`, `speedBonusMult` (already baked into `baseSpeed`), drafting, braking, and `trajectoryMult`.

## 6. Compounded envelope

### 6.1 Per-race constants versus per-frame authority

Per-race or slowly changing constants:
- `race_baseSpeed`
- `speedMultiplier`
- `spreadFactor` (piecewise constant between re-roll transitions, but still re-rolled until 95%)
- `speedBonusMult`

Per-frame authority in shipped OUTCOME:
- `draftingBoost`
- `brake` (`speedBrakeFactor` / `brakeMatchFactor`)
- `trajectoryMult`

Terms that are structurally neutral in shipped OUTCOME:
- `rowEnvMult = 1.0`
- `areaBonusMult = 1.0`
- `governorMult -> 1.0`

### 6.2 Fastest and slowest relative to field mean

Known source-bounded factors:
- `speedMultiplier` shipped built-ins: 0.3 to 1.25
- `spreadFactor` default band: 0.91866 to 1.08134
- `draftingBoost`: 1.0 or 1.04
- `trajectoryMult`: 0.85 to 1.10
- `speedBrakeFactor`: 1.0 or 0.945 after warmup; `brakeMatchFactor` can be below that and has no explicit lower source floor

Race-dependent factor with no single global source cap:
- `speedBonusMult = 1 + rawRowBonus`
- This depends on track width, path length, row count, finishT, and row index.
- Source does not provide one universal hard maximum across all race setups.

Therefore the auditable fastest product from source-bounded terms is:

`1.25 * 1.08134 * 1.04 * 1.10 = 1.5463`

and the true fastest shipped OUTCOME speed is:

`1.5463 * speedBonusMult`

for whatever rear-row compensation the race setup produced.

The slowest product from source-bounded terms, ignoring `brakeMatchFactor`, is:

`0.30 * 0.91866 * 0.85 * 0.945 = 0.2214`

With `brakeMatchFactor` active, the practical minimum can go lower because the runtime cap has no explicit lower floor in source.

Typical racer baseline:
- boarder/horse-type `speedMultiplier = 1.0`
- `spreadFactor = 1.0`
- front row `speedBonusMult = 1.0`
- no draft, no brake, no controller push
- `trajectoryMult = 1.0`, `areaBonusMult = 1.0`, `governorMult = 1.0`

So the typical neutral racer in shipped OUTCOME is exactly `1.0 * race_baseSpeed`.

### 6.3 Boost/brake asymmetry in shipped OUTCOME

Ignoring the per-race constants and looking only at active per-frame OUTCOME authority:
- maximum boost side: `trajectoryMult 1.10 * draftingBoost 1.04 = 1.144`
- brake side from controller + speed-brake floor: `trajectoryMult 0.85 * speedBrakeFactor 0.945 = 0.80325`
- brake side can go lower when `brakeMatchFactor` is active

So the active OUTCOME authority is asymmetric:
- boost side: up to +14.4%
- brake side: at least -19.7%, potentially lower with brake-match

### 6.4 Phase-boundary step from PULK to OUTCOME

At the PULK->OUTCOME handoff under defaults:
- PULK row bonus arm is 0, POST row bonus arm is 1
- `rowEnvMult` therefore jumps from `(1)/(1+rawRowBonus)` in PULK to `1.0` in OUTCOME for rear-row racers
- `trajectoryMult` also becomes an active OUTCOME authority term

So there is a real speed step at the OUTCOME boundary for rear-row racers even without changing `spreadFactor`.

## 7. Against the project's own naturalness rule

Stated rule at source:
- `pulkEnvelopeMaxEffect = 0.12` in defaults is documented as the PULK realism guarantee `|governorMult - 1| <= 12%`
- `pulkEnvelopeMaxStepPerFrame = 0.01` is the slew cap
- `computeDirectorCeiling` hard-clamps the effective director ceiling to `NATURALNESS_CEILING = 1.2`
- `raceGovernor.js` comment: `the effective director ceiling may NEVER exceed +20% of the field mean`

Does that rule apply to OUTCOME?
- No, not directly.
- The source applies that naturalness ceiling to `governorMult`, which is the PULK contest director.
- It does not apply the same rule to `trajectoryMult`, `draftingBoost`, `speedMultiplier`, `spreadFactor`, or `speedBonusMult`.

Arithmetic against the OUTCOME envelope:
- Whole shipped OUTCOME envelope from source-bounded terms already reaches `1.5463 * speedBonusMult`, so yes, the total observed OUTCOME speed can exceed +20% over mean by a large margin.
- That is not a violation of the governor rule, because most of that product is not governor authority.
- The active OUTCOME control authority alone is smaller:
  - `trajectoryMult` max is 1.10, below the governor's 1.20 ceiling
  - `trajectoryMult * draftingBoost` reaches 1.144, still below 1.20

So the truthful split is:
- Whole OUTCOME speed envelope: can exceed the project’s +20% governor naturalness ceiling number
- OUTCOME controller authority by itself: does not exceed that number at default clamps
- Those are different statements, and source treats them differently

## 8. Existing field-cohesion path

The shipped distance-based PULK cohesion path is `computePulkBiasedTarget` in `racePlanner.js`.

What it does:
- It only touches `plan.pulkRacerIds`, the three pulk racers selected by the planner.
- During PULK only, it biases the re-roll draw toward `pulkCenterT - thisRacer.t`, scaled by `pulkBiasGain`.
- It operates on the re-roll target before clamp.
- Therefore it modifies `spreadFactorTarget`, not `trajectoryMult` and not `governorMult`.

Does the quantity it modifies still exist in OUTCOME?
- Yes.
- `spreadFactor` is still part of `baseSpeed` in OUTCOME, and re-rolls continue until 95% by default.
- But the bias itself is PULK-only; OUTCOME re-rolls are unbiased.

## 9. What is inert in OUTCOME

Under shipped plan-enabled choreography:
- `areaBonusMult` is pinned to 1.0 from the CHAOS boundary onward
- `racePlanBonusTransitionEnd` and `racePlanBonusFadeDuration` do not materially act in OUTCOME because choreo cut has already neutralized the area bonus
- `governorMult` contest strengths (`pulkLeaderBrake`, `pulkChallengerBoost`, `pulkEnvelope*`, `pulkBoostHeadroom`, `pulkLeadRotation*`) are not active OUTCOME forces
- `rowEnvMult` is pinned to 1.0 in OUTCOME at shipped `rowBonusPost = 1`
- `bandStrictness` from `DEFAULT_CONTROLLER_PARAMS` is effectively bypassed in the live plan-enabled path because pack steering uses `choreoPackBandStrictness` whenever choreography is enabled, and choreography is enabled unconditionally inside the planner when the race plan runs

When the race plan is disabled (`racePlanEnabled` false, e.g. short races below `racePlanMinDurationSec` or plan off):
- `trajectoryMult` is pinned to 1.0
- `governorMult` stays 1.0
- `areaBonusMult` never gets controller writes and stays effectively neutral
- There is no OUTCOME controller authority at all

## 10. What is unreachable in OUTCOME

- Non-1.0 `areaBonusMult` under the shipped choreo-enabled plan is unreachable from PULK start onward
- Non-1.0 `governorMult` as an active contest force is unreachable in OUTCOME proper; only residual slew back to 1.0 can remain at the handoff
- `pulkEnvelopeMaxEffect`, `pulkEnvelopeMaxStepPerFrame`, `pulkBoostHeadroom`, attacker slots, outsider reach, hold, and deadlock timeout are unreachable as OUTCOME forces
- `rowBonusPulk` and `areaBonusPulk` are unreachable as OUTCOME arms by phase definition

## 11. Hygiene

Two-source / hand-copied findings:
- `RaceScreen/index.jsx` threads many fallback literals into `createRacePlan` and `pulkLeadRotCfg`, with comments explicitly saying they must mirror `DEFAULT_RACE_DYNAMICS_CONFIG`. That is a duplicated default surface.
- `choreoReleaseProgress` and the band-resolve values live both in `GENERATOR_CONFIG` and in dynamics defaults, then are threaded into the generator. The live race path uses the threaded values, but the defaults exist in two places.
- `speedMultiplier` has two configuration surfaces: built-in racer-type files and user overrides via Racer Edit.

DevScreen reachability findings:
- `gain`, `minMult`, `maxMult`, and base `bandStrictness` for the OUTCOME servo are pinned constants in `racePlanner.js`; they are not exposed in Race Tuning.
- The PULK card itself states that advanced envelope and rotation internals are pinned to tuned defaults; that matches the source.

Dead/inert-in-context findings:
- `racePlanBonusTransitionEnd` and `racePlanBonusFadeDuration` are still stored and surfaced, but under the shipped choreo path they do not control OUTCOME because `areaBonusMult` is already cut to 1.0 at `pulkStart`.
- `bandStrictness` constant exists in `DEFAULT_CONTROLLER_PARAMS`, but the live plan-enabled path uses `choreoPackBandStrictness` for the pack instead.

## 12. Final inventory summary

From PULK/OUTCOME boundary onward, the forces that still matter most in shipped OUTCOME are:
- baked constants: `speedMultiplier`, `spreadFactor`, `speedBonusMult`
- live dynamic terms: `draftingBoost`, `speedBrakeFactor` / `brakeMatchFactor`, `trajectoryMult`

The terms that look important in config but are inert in shipped OUTCOME are:
- `areaBonusMult`
- `governorMult` contest strengths
- `rowEnvMult` at default POST settings

The quantity that is distance-based rather than rank-based is:
- `computePulkBiasedTarget` via `pulkBiasGain`, but it only biases PULK re-roll targets; it does not operate as an OUTCOME controller.
