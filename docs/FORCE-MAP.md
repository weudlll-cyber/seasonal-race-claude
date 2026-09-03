# FORCE-MAP — the complete force map of racer motion

**Owns:** every force that acts on a racer — which exist, when each fires, what it acts on, and a source line for each. It states STRUCTURE, never values.

> **★ THE FILE ATTRIBUTIONS BELOW ARE STALE, IN 27 PLACES — corrected here once rather than 27 times
> (2026-09-02, DOC-TRUTH-2).** This document cites `RaceScreen/index.jsx` as the home of the browser
> physics loop throughout. **The loop moved to `client/src/modules/raceCore.js` on 2026-07-24
> (`0bd146f3`)**, when the browser and the sim were put on one shared step. `advanceRacerT` — the
> equation this whole document is built around — **does not occur in `index.jsx` at all**; it is in
> `raceCore.js`. **Read every `index.jsx` citation below as `raceCore.js`**, and expect the line
> numbers not to resolve.
>
> **The FORCES, their order, their triggers and their structure are NOT affected** — that is what this
> document owns and it was not what moved. Only the addresses are wrong. They are corrected in one
> place because 27 individually rewritten citations, none of them re-verified line by line, would be a
> worse document than one honest paragraph: this file's own promise is that a source line can be
> checked, and a bulk edit would quietly break that promise while looking like a repair.

> Analysis only. Every force is backed by a source line so it can be verified against the source.
>
> **Renamed 2026-08-07** (DOC-ORDER-1). This file was `KRAEFTE-LANDKARTE.md` at the repo root, and
> its header recorded an earlier decision of the owner's to keep that German name as an exception to
> the language rule. He superseded that decision — no German anywhere in the new structure — so the
> exception is gone and the name is English like everything else. Searching the history for the old
> name still finds it.

> **WHAT THIS DOCUMENT GUARANTEES, AND WHAT IT DOES NOT** (CONFIG-TRUTH-1). It guarantees the
> STRUCTURE: which forces exist, when each fires, what it acts on, and a source line for every one.
> It does **not** state their VALUES, and that is now a rule rather than an omission — this file
> once carried five re-roll and corridor numbers that disagreed with the shipped defaults, and a
> reader had no way to tell. Values live in `../client/src/modules/storage/defaults.js` and nowhere
> else; `node scripts/check-config-claims.mjs` fails if one reappears here. The old header line
> above promised a source line per FORCE, which was true and kept — the trouble was that it read
> like a promise about the numbers too, and nothing was checking those.

> **STATUS (post Commit A + Commit B).** The lateral physics has been cleaned up to two
> layers. The legacy force stack (L1 home, L2 avoidance, L3 free-lane, L4 commit-injection,
> L5 gap-force, L9 stuck-suppression, the `sqrt(N)` dilution, and L10 avoidance-scale) was
> removed in **Commit A**; the L6 OVL-C escape and the entire 4-mode **priority system**
> (`PRIORITY_MODE`, `_computeBlockedMode`, `overlapSet`, `homeForceReductionOnOverlap`,
> `currentMode`/`blockerInfo`/`escapeCommit*`) were removed in **Commit B**. The lateral
> entries below are kept as a historical record and each removed force is marked **REMOVED**.
>
> **Live lateral model today:** **Layer 1 — Soft Steering** (a single target spring, the
> sole lateral force) + **Layer 2 — Hard Separation** (positional anti-penetration backstop),
> followed by the still-active helpers **L7** (soft repulsion), **L8** (boundary clamp), and
> **L11** (damping). `applyRacerBehavior(racers, config, priorityExtras)` still takes a third
> argument, now reduced to `{ currentTs }` — read **only** by the Hard-Separation warmup ramp.
> All longitudinal forces (Section A) are unchanged.
>
> **STATUS (post `aef203a` + geometry expansion).** §4a (non-overlap soft target) is now
> **unconditionally asymmetric** — only the trailer receives a target from the leader; the leader
> holds its line — **regardless of `softSteeringSymmetric`** (fix `aef203a`, 2026-06-30). §4b
> (overlap override) remains governed by `softSteeringSymmetric` as before. The four closed tracks
> were rebuilt on the 3072px world: garden-path `8f73dc7`, dirt-oval `72da109`, city-circuit
> `1b3260e`, ice-track `b06d946`. See **L0a** below for the §4a/§4b detail.

## Scope and reading order

A racer's motion has **two independent axes**, computed in **two different files**:

| Axis         | Quantity                 | Where it is integrated           | Driver file                                                                             |
| ------------ | ------------------------ | -------------------------------- | --------------------------------------------------------------------------------------- |
| Longitudinal | `r.t` (race progress)    | `RaceScreen/index.jsx` step loop | `index.jsx` + `raceStep.js` + `racePlanner.js` + `raceBaseSpeed.js` + `raceGovernor.js` |
| Lateral      | `r.physicalY` ∈ [−1, +1] | `applyRacerBehavior()`           | `raceBehavior.js`                                                                       |

Per physics step the order is:

1. **Re-roll / trajectory / PulkLeadRotation** update the longitudinal multipliers (`index.jsx` re-roll ~1063–1097; the trajectory controller ~990–1003; `applyPulkLeadRotation` ~1018–1035). **There is no rubber-band step** — the `applyRubberBand` speed force and its `raceRubberBand.js` module were removed (do not confuse with the still-live CameraDirector `endgameThreshold` gate, a camera-only mechanism). The PulkLeadRotation call runs **unconditionally whenever a race plan is active** (`racePlanEnabled`, on by default for races ≥ 30 s); it writes `governorMult` for every racer in the PULK window and slews it back to **exactly 1.0** everywhere else.
2. **Longitudinal integration** — the ONE shared t-update `advanceRacerT()` in [`raceStep.js`](../client/src/modules/raceStep.js) (imported by both browser and sim): `r.t += baseSpeed × boost × brake × rowEnvMult × trajectoryMult × areaBonusMult × governorMult × dt`, finish-clamped ([`raceStep.js` → `computeRowEnvSmoothed`](../client/src/modules/raceStep.js#L72-L86); browser call [`index.jsx` → `holdMs`](../client/src/screens/RaceScreen/index.jsx#L1122-L1128)). `dt` = 1.0 (fixed timestep) both sides. **There is no `pulkSurgeMult` and no `zoneMult` in the shared step** — surge was removed and zoneMult is not part of `advanceRacerT`. `governorMult` is **1.0 outside PULK** but **actively written inside PULK** (not "default OFF").
3. `computePositions()` projects `(t, physicalY)` → world `(x, y, angle)`.
4. **`applyRacerBehavior()`** computes the _next_ frame's lateral move and the brake/draft **flags** used by step 2 next frame (one-frame lag is intentional).

The lateral flags (`avoidanceActive`, `brakeMatchFactor`, `draftingBoostActive`) are written in step 4 and **read one frame later** in step 2 — same cross-file lag pattern throughout.

`FIXED_DT = 16 ms`, `REFERENCE_FPS = 60`, so every per-frame magnitude below is "per 1/60 s".

---

## A. LONGITUDINAL FORCES (speed / `r.t`)

Master equation — the ONE shared per-frame t-update, `advanceRacerT()` in
[`raceStep.js` → `computeRowEnvSmoothed`](../client/src/modules/raceStep.js#L72-L86), imported by both the browser
loop ([`index.jsx` → `holdMs`](../client/src/screens/RaceScreen/index.jsx#L1122-L1128)) and the
fairness sim (Sim-Browser Parity):

```
r.t += baseSpeed × boost × brake × rowEnvMult × trajectoryMult × areaBonusMult
       × governorMult × dt
```

where `baseSpeed = race_baseSpeed × speedMultiplier × spreadFactor × speedBonusMult` ([`index.jsx:1096`](../client/src/screens/RaceScreen/index.jsx#L1096)); `dt` = 1.0 (fixed timestep, kept explicit so neither side can hide it); result finish-clamped to `finishT + 0.001`.

All multipliers are **purely longitudinal**; none is sqrt(N)-diluted. They compound multiplicatively, so a racer's instantaneous speed is the product of every factor. **`pulkSurgeMult` and `zoneMult` are NOT in this product** — `pulkSurgeMult` (surge) was removed, and `zoneMult` is not part of the shared step. `governorMult` is written by `applyPulkLeadRotation` (A13) and is **1.0 outside PULK but actively non-1.0 inside the PULK window** — it is _not_ "default OFF". `rowEnvMult` (the start-row speed-bonus phase envelope, `computeRowEnvMult`, [`raceStep.js` → `computeRowEnvMult`](../client/src/modules/raceStep.js#L46-L55)) enters the product explicitly; it is 1.0 unless `phaseSplitBonusEnabled`. **`rubberBandMult` and `zoneMult` are NOT in this product and no longer exist** — the `raceRubberBand.js` (rubber-band speed force) and `raceZones.js` (race-zone brake) modules were deleted (see the removed-force note under A9/A10 below).

### A0. Base speed (duration anchor)

- **Code**: `computeRaceBaseSpeed(finishT, targetDuration)` = `finishT / (REFERENCE_FPS × targetDurationSeconds)` — [`raceBaseSpeed.js` → `computeRaceBaseSpeed`](../client/src/modules/raceBaseSpeed.js#L29-L32); consumed at [`index.jsx` → `bodyFillNarrow`](../client/src/screens/RaceScreen/index.jsx#L500).
- **What**: the per-frame `t`-rate that makes a neutral racer (all multipliers = 1.0) reach the finish in exactly the operator-chosen duration.
- **When**: always.
- **Magnitude**: the reference. Everything else is a dimensionless multiplier around 1.0.
- **Config**: `DEFAULT_RACE_DEFAULTS.duration`; `BASE_SPEED_CONFIG.min`/`max` only set the spread mean.

### A1. `speedMultiplier` — racer-type speed

- **Code**: `racerType.getSpeedMultiplier()` — [`index.jsx:416`](../client/src/screens/RaceScreen/index.jsx#L416), baked into `baseSpeed`.
- **What**: per-type constant (e.g. rocket vs snail). Constant for the whole race.
- **Config**: per racer-type definition in `racer-types/*`. Default 1.0 for neutral types.

### A2. `spreadFactor` — luck draw + re-roll (the "race feel")

- **Code**: initial draw `(BASE_SPEED_MIN + rand×(MAX−MIN)) / BASE_SPEED_MEAN` — [`index.jsx:595-596`](../client/src/screens/RaceScreen/index.jsx#L595-L596); re-rolled mid-race [`index.jsx` → `hud`](../client/src/screens/RaceScreen/index.jsx#L924-L957).
- **What**: the _only_ longitudinal factor that changes randomly during the race. Re-rolls every `rollInterval` with an `easeInOutCubic` transition over `reRollTransitionDuration`.
- **When**: re-roll fires when `physicsTs ≥ nextRollTime && physicsTs < lastRollDeadline` ([`index.jsx:927`](../client/src/screens/RaceScreen/index.jsx#L927)). Stops at `reRollLastPositionPercent` of the race.
- **Magnitude**: spread ≈ ±17.7% of mean (min 0.00096 → max 0.00113). Re-roll step half-width = `spreadRange × reRollVariationPercent/100` ([`index.jsx:799`](../client/src/screens/RaceScreen/index.jsx#L799)). *(Read "default 58%" until 2026-09-03; the shipped value is 75 and has been since `d904bf54`, 2026-07-01. The number is not restated — this file states STRUCTURE, never values.)*
- **Config**: `DEFAULT_BASE_SPEED_CONFIG.min/max`; `reRollVariationPercent`, `reRollTransitionDuration`, `reRollIntervalDivisor`, `reRollLastPositionPercent` — values in [`defaults.js`](../client/src/modules/storage/defaults.js), which owns them. *(Corrected 2026-09-03: this line carried **58 / 5.0 / 15 / 80** and every one was wrong — the shipped values are 75 / 3.0 / 10 / 95, and have been since `d904bf54`, 2026-07-01, 63 days. `check-config-claims` did not catch it because it covers the CAMERA config object only, which is its declared blind spot.)*
- **Note**: Sine jitter was removed (Stage 19); race feel now comes _only_ from these re-rolls.

### A3. `speedBonusMult` — positional back-row compensation

- **Code**: `1 + computeSpeedBonus(rowIndex, …)` — [`index.jsx` → `rowLayout`](../client/src/screens/RaceScreen/index.jsx#L578-L597).
- **What**: constant per-racer bonus so racers starting further back are not structurally disadvantaged. Constant over the whole race.
- **Config**: `DEFAULT_ROW_LAYOUT_CONFIG.speedBonusFactor` **1.0**.

### A4. `boost` — drafting / slipstream

- **Code**: the `draftingBoost` multiplier applies only while `r.draftingBoostActive` — [`index.jsx:961`](../client/src/screens/RaceScreen/index.jsx#L961). Flag set in `raceBehavior.js` drafting block [`raceBehavior.js` → `passStrength`](../client/src/modules/raceBehavior.js#L1112-L1140).
- **What**: forward speed bonus when a follower sits in a leader's wake cone.
- **When**: follower must be **behind** in `t` (`leader.t > follower.t`), within `draftingMaxDistance` world px, and inside the half-cone behind the leader's heading.
- **Magnitude**: set by `draftingBoost` — a small forward multiplier while the flag is set.
- **Config**: `draftingMaxDistance` **80** px, `draftingConeAngle` **30°**, `draftingBoost` **1.04**.
- **Known weakness (documented in source)**: on tight curves the cone rotates fast and can miss a follower physically in the slipstream — [`raceBehavior.js` → `passStrength`](../client/src/modules/raceBehavior.js#L1112-L1115). Drafting is also fed into the brake-to-match leader/trailer speed estimate ([`raceBehavior.js:526-527`](../client/src/modules/raceBehavior.js#L526-L527)).

### A5. `brake` — speed brake (avoidance floor) + warmup ramp

- **Code**: `r.avoidanceActive ? min(effectiveBrakeFactor, brakeMatchFactor) : 1.0` — [`index.jsx:972-974`](../client/src/screens/RaceScreen/index.jsx#L972-L974). Floor + ramp from `computeEffectiveBrakeFactor()` [`raceBehaviorConfig.js` → `computeEffectiveBrakeFactor`](../client/src/modules/raceBehaviorConfig.js#L34-L38).
- **What**: slows a trailer that is closing on a leader in the same lane. `avoidanceActive` is set when a pair is inside the body-based brake zone — [`raceBehavior.js:501-502`](../client/src/modules/raceBehavior.js#L501-L502).
- **When (gate)**: `|dY| < brakeSameLaneY && dT < dynamicBrakeT`, both **body-based** ([`raceBehavior.js` → `trailerDenom`](../client/src/modules/raceBehavior.js#L497-L501)):
  - longitudinal zone = `(bodyContactLength / pathLength) × speedBrakeTMultiplier`
  - lateral filter = `pxToPhysicalY(bodyContactWidth)` (same-lane y/n only — never drives strength)
- **Magnitude**: floor `speedBrakeFactor`. On **open** tracks it eases in over `avoidanceWarmupMs` from 1.0 to the floor via `easeInOutCubic`; **closed** tracks get full braking from frame 1.
- **Config**: `speedBrakeFactor` **0.945**, `speedBrakeTMultiplier` **1.5**, `speedBrakeYThreshold` **0.18** (retired from browser gate, kept for sim compat), `avoidanceWarmupMs` **3000**.
- **Scope note**: the _brake floor_ (avoidanceActive) runs on **all** tracks. Disabling it on closed tracks caused regressions (report 12/13).

### A6. `brake` — brake-to-match cap (speed matching)

- **Code**: `computeBrakeMatchFactor(leaderFwdSpeed, trailerDenom, …)` — [`raceBehavior.js` → `computeBrakeMatchFactor`](../client/src/modules/raceBehavior.js#L89-L100); selected as most-constraining leader [`raceBehavior.js` → `active`](../client/src/modules/raceBehavior.js#L549-L560); hold state machine [`raceBehavior.js` → `ssOffsetY`](../client/src/modules/raceBehavior.js#L1025-L1091). Applied via the `min()` at [`index.jsx:973`](../client/src/screens/RaceScreen/index.jsx#L973).
- **What**: caps the trailer's speed to ≈ the leader's _actual_ advance speed (×0.999 safety) so a faster trailer settles in behind instead of telescoping into the leader. Distinct from A5: A5 is a fixed floor, A6 is a computed per-pair cap.
- **When**:
  - **Open** tracks: narrow zone `dT < bodyContactLength/pathLength × brakeMatchActivationTMultiplier` AND `|dY| < brakeMatchActivationYThreshold` ([`raceBehavior.js:511-519`](../client/src/modules/raceBehavior.js#L511-L519)).
  - **Closed** tracks: every pair already inside the wide brake zone qualifies (`inBrakeMatchZone = true`, [`raceBehavior.js:521`](../client/src/modules/raceBehavior.js#L521)).
  - Engages only if trailer is faster than leader by `> speedMatchMinDifferential`.
- **Hold/escape**: locks one leader; anti-trap escape after `brakeHoldTimeoutFrames` → forced release `brakeHoldEscapeReleaseDurationFrames` + cooldown `brakeHoldEscapeCooldownFrames`; debounced release over `brakeReleaseDebounceFrames`; stale-leader guard resets instantly.
- **Magnitude**: cap ∈ (0, 1]; 1.0 = no extra braking. Combined with A5 via `min()`.
- **Config**: `brakeMatchActivationTMultiplier` **0.5**, `brakeMatchActivationYThreshold` **0.06**, `speedMatchMinDifferential` **0.005**, `speedMatchSafetyMargin` **0.001**, `brakeHoldTimeoutFrames` **90**, `brakeHoldEscapeReleaseDurationFrames` **15**, `brakeHoldEscapeCooldownFrames` **60**, `brakeReleaseDebounceFrames` **3**.
- **Open-only subtlety**: on open tracks the cap targets the leader's _braked_ advance (`rawSpeed × min(0.945, leaderBrakeMatch)`); on closed tracks `leaderBrake = 1.0` to preserve the pre-rebuild baseline ([`raceBehavior.js` → `applyRacerBehavior`](../client/src/modules/raceBehavior.js#L540-L548)).

### A7. `trajectoryMult` — Race-Plan P-controller (OUTCOME steering)

- **Code**: written by `createTrajectoryController().update()` — [`racePlanner.js` → `_phaseSplitBonusEnabled`](../client/src/modules/racePlanner.js#L306-L401); eased into `r.trajectoryMult` [`index.jsx` → `hudCapHit`](../client/src/screens/RaceScreen/index.jsx#L872-L882).
- **What**: bidirectional proportional controller that nudges every racer toward an assigned `targetRank` during the OUTCOME phase — the mechanism that makes the _scripted_ finishing order happen.
- **When**: only in `OUTCOME` phase (`corridorStart`..`corridorEnd` of duration). Outside OUTCOME the target is 1.0. *(Read "0.55–0.95" until 2026-09-03; `racePlanCorridorEnd` is 1.0, since `07bf2f11` 2026-06-26.)*
- **Magnitude**: clamped to `[minMult, maxMult]` = **[0.85, 1.10]**; gain **2.0**; per-step stochastic noise ±`stochasticNoise` (0.0008).
- **Config**: `racePlanCorridorStart`, `racePlanCorridorEnd`, and the controller `gain` / `maxMult` / `minMult` / `bandStrictness` — values in [`defaults.js`](../client/src/modules/storage/defaults.js). *(Corrected 2026-09-03: `racePlanCorridorEnd` was stated as **0.95** and is **1.0**, since `07bf2f11` 2026-06-26. `docs/PHASE-CONTRACT.md` §4 had it right, so the two documents disagreed for 68 days.)*

### A8. `areaBonusMult` — Race-Plan band bonus (early/mid steering)

- **Code**: set per racer from target band, then `easeInOutCubic` fade to 1.0 after `transitionEnd` — [`racePlanner.js` → `transitionEnd`](../client/src/modules/racePlanner.js#L84-L93); read at [`index.jsx:988`](../client/src/screens/RaceScreen/index.jsx#L988).
- **What**: constant-per-band forward bonus that biases racers toward their assigned area before the OUTCOME controller takes over.
- **When**: full strength until `racePlanBonusTransitionEnd`, then fades over `racePlanBonusFadeDuration`.
- **Magnitude**: base deltas × `bonusStrengthMultiplier` (default **2.0**): B1 +0.03, B2 +0.02, B3 +0.01, B4 0, B5 −0.01 → at ×2.0 that is roughly +6% (B1) to −2% (B5).
- **Config**: `racePlanBonusStrengthMultiplier` **2.0**, `racePlanBonusTransitionEnd` **0.75**, `racePlanBonusFadeDuration` **1500**.
- **History**: an earlier negative-`elapsedFade` bug blew this up to 5–556×; now lower-clamped at 0 ([`racePlanner.js` → `_choreoSuppressChaosBonusB1`](../client/src/modules/racePlanner.js#L330-L333)).

### A9. `rubberBandMult` — median-relative "cap the lead" brake — **REMOVED**

- **Status**: **REMOVED.** The `raceRubberBand.js` module (`applyRubberBand`, `rubberBandMult`, `DEFAULT_RUBBER_BAND_CONFIG`) was deleted from both the browser and the sim; there is no `applyRubberBand` call in `index.jsx`, no `--rubber-band*` flag in `sim-fairness.mjs`, and `rubberBandMult` is not a factor in the shared `advanceRacerT` product.
- **Was**: a proportional brake on any front-breakaway racer whose gap ahead of the field median exceeded `brakeThreshold` — a field-cohesion attractor. Its role (bounding front breakaways) is now unfilled; see `docs/CONCEPT-COHESION.md` for the (not-yet-built) replacement concept.
- **Do NOT confuse with the CameraDirector `endgameThreshold` gate**, which IS live — that is a camera-only endgame trigger (`CameraDirector.js`), a different thing from this removed speed force.

### A10. `zoneMult` — race-zone brake (position-based) — **REMOVED**

- **Status**: **REMOVED.** The `raceZones.js` module (`zoneMultAt`, `zoneMult`, `DEFAULT_RACE_ZONE_CONFIG`) was deleted; `zoneMult` is not part of the shared `advanceRacerT` product and there is no race-zone config in `storage/defaults.js`.
- **Was**: an optional fixed-position "slow zone" that multiplied speed inside a configured track segment. It was already disabled by default before removal.

### A11. `runoutDecay` — post-finish coast

- **Code**: [`index.jsx:993-997`](../client/src/screens/RaceScreen/index.jsx#L993-L997).
- **What**: once `finished`, the racer ignores all multipliers above and just coasts: `runoutDecay *= 0.97` each frame.
- **When**: only after crossing the finish line.

### A12. BATTLE slowmo — global time scaling (not per-racer)

- **Code**: [`index.jsx` → `index`](../client/src/screens/RaceScreen/index.jsx#L805-L831).
- **What**: during `BATTLE_ZOOM` the **physics clock** (not an individual force) is scaled, slowing _all_ racers uniformly for cinematic effect. Affects `rawDt` feeding the step, with fade in/out.
- **Magnitude**: `battleSlowmoFactor` **0.5** (half speed), `battleSlowmoFadeDuration` 0.3 s, min hold 2.0 s.
- **Note**: a global multiplier on the step clock — it does not change relative ordering, so it is fairness-neutral but it does change every racer's instantaneous `t`-rate.

### A13. `governorMult` — PulkLeadRotation, the PULK-phase contest director (**active, unconditional in PULK**)

- **Code**: `applyPulkLeadRotation(racers, finishT, phaseCtx, cfg)` — [`raceGovernor.js` → `applyPulkLeadRotation`](../client/src/modules/raceGovernor.js#L170-L380); called at [`index.jsx` → `govPhase`](../client/src/screens/RaceScreen/index.jsx#L1018-L1035) whenever `pulkLeadRotationOn = racePlanEnabled` ([`index.jsx:742`](../client/src/screens/RaceScreen/index.jsx#L742)); `governorMult` then enters the shared t-update at [`raceStep.js:83`](../client/src/modules/raceStep.js#L83). This is the **one surviving writer of `governorMult`** — the classic reactive `applyGovernor` (tail-lift cohesion + contest-injector director) was removed; there is no `applyGovernor`, `governorEnabled`, `governorDirector*`, `directorStreamKey`, `GOVERNOR_SEED_XOR`, or `DIRECTOR_SEED_XOR` in the source anymore (those names survive only as inert storage-key → `pulk*` migration aliases in `raceDynamicsConfig.js`).
- **What**: a deterministic, rank-based **lead-rotation contest** that _completes_ lead changes instead of herding the field. Selection is by **live rank + signed lap-aware distance + index** (no `Math.random`), and reads **position + seed only, NEVER the target-rank assignment** — so who contests the front never correlates with who is scripted to win (the finish order is still imposed later by the OUTCOME trajectory controller, A7). Three roles, all writing `governorMult`:
  - **Attacker slots (1–2, `pulkLeadRotationAttackerSlots`)** — boost the live P2 (and P3) with a **flat `pulkChallengerBoost`** UNTIL it becomes live P1; on success the slot advances to the new P2. Candidates are drawn from the front group (first `pulkFrontPool − 1` non-hero racers behind the leader) and must be **draw-reachable** (`directorReachable`: their best boosted speed factor can out-pace the braked leader's).
  - **Outsider slot (permanent fresh blood)** — boost the DEEPEST still-reachable racer OUTSIDE the front group, within `pulkLeadRotationOutsiderMaxReachLengths`, until it takes the lead; then draw the next-deepest. Provably disjoint from the attacker window.
  - **Settle-brake set** — a racer that TAKES the lead is added to a brake **membership set**; it runs unbraked for its `pulkLeadRotationMinHoldMs` hold, then a `−pulkLeaderBrake` brake engages and STAYS on (through being overtaken, while it falls) until it is `pulkLeadRotationDropDepthLengths` deep (8) behind the current leader. Many members brake at once; the current P1 is just the newest member. **Heroes** are never boosted but ARE brakeable when they lead.
  - **Deadlock timeout (`pulkLeadRotationDeadlockTimeoutMs`, 12000 ms)** — a boost that can't complete (traffic) is released + cooled and the slot advances; the lateral physics is never weakened.
- **When**: **only inside the live PULK window** `progress ∈ [`raceGovernor.js` → `governorPhaseWeight`](../client/src/modules/raceGovernor.js#L92-L97)) which fades to **exactly 0 at `corrStartFrac`**; outside the window (and for finished racers) every racer is slewed to `governorMult` = **exactly 1.0**. So OUTCOME gets a clean handoff to A7.
- **Realism envelope** ([`raceGovernor.js` → `brakeLoBound`](../client/src/modules/raceGovernor.js#L356-L379)): a **`±pulkEnvelopeMaxEffect`** clamp on `|governorMult − 1|`, a per-frame **`pulkEnvelopeMaxStepPerFrame`** slew limit, and an optional **naturalness ceiling cap** (`pulkCeilingCap` **true** → `computeDirectorCeiling`, hard-capped at `NATURALNESS_CEILING` = **1.2**, `pulkBoostHeadroom` **0.1** additive headroom above the band max).
- **Magnitude**: brake arm floored at `1 − max(maxEffect, leaderBrake)`; boost arm at `1 + challengerBoost`, clamped to `1 + maxEffect` and to `ceilingCap / spreadFactor`.
- **Config** (all in the `pulk*` namespace, `storage/defaults.js`): strengths `pulkLeaderBrake` **0.1**, `pulkChallengerBoost` **0.06**, `pulkFrontPool` **8**, `pulkBoostHeadroom` **0.1**; rotation core `pulkLeadRotationAttackerSlots` **2**, `pulkLeadRotationDropDepthLengths` **8**, `pulkLeadRotationOutsiderMaxReachLengths` **15**, `pulkLeadRotationDeadlockTimeoutMs` **12000**, `pulkLeadRotationMinHoldMs` **750**; envelope `pulkEnvelopeMaxEffect` **0.12**, `pulkEnvelopeMaxStepPerFrame` **0.01**, `pulkCeilingCap` **true**.
- **Choreo trajectory shaping (companion, A7)**: the _front contest_ is A13; the _finish order_ is set by `trajectoryMult`, written by the trajectory controller in [`racePlanner.js`](../client/src/modules/racePlanner.js) (choreographed hero curves + a servo toward each racer's `targetRank` band during OUTCOME). Also unconditional when a plan runs, but a distinct multiplier in a distinct phase — see A7/A8. The two never read each other's assignment.

---

## B. LATERAL FORCES (`physicalY`)

`physicalY ∈ [−1,+1]`: −1 inner boundary, 0 centerline, +1 outer.

**Live pipeline today** (Commit A + B):

1. Pair loop assigns each racer a **soft-steering target** (centerline when clear; beside the
   most-constraining obstacle otherwise; hold-in-place when both sides are blocked).
2. Per-racer apply loop: **Layer 1** spring drives `delta` toward that target, then
   velocity+damping (L11) + soft-repulsion (L7) + clamp (L8).
3. **Layer 2 — Hard Separation** runs last as a positional anti-penetration backstop.

The legacy accumulation pipeline (home seed → sqrt(N)-normalized avoidance/free-lane →
commit/gap/OVL-C injections) was removed across Commits A and B. The L-entries below are
the historical record; removed ones are marked **REMOVED**.

### L0a. Layer 1 — Soft Steering (the sole lateral force) — **ACTIVE / LIVE**

- **Code**: target selection in the pair loop (§4a non-overlap, §4b overlap override); spring
  applied in the apply-deltas loop: `delta += (target − physicalY) × softSteeringStrength`.
- **What**: a single target spring. The target is the centerline (0) with no obstacle, a point
  one body-clearance beside the most-constraining obstacle otherwise, or the current position
  (hold) when both sides are blocked — which also replaces the old L9 stuck-suppression case.
- **Magnitude**: `softSteeringStrength` **0.03** × `(target − physicalY)`. Single force, never diluted.
- **Config**: `softSteeringStrength`, `softSteeringSymmetric`, `softSteeringHysteresisY` **0.04**,
  `softSteeringClearancePct`.
- **§4a vs §4b asymmetry (post `aef203a`)**: §4a (non-overlap) is **always asymmetric** — only the
  trailer is assigned a target beside the leader; the leader's target stays at the centerline (0) —
  **independent of `softSteeringSymmetric`**. §4b (overlap override) is the part still governed by
  `softSteeringSymmetric`: `true` → both members of an overlapping pair separate, `false` → trailer
  only. So `softSteeringSymmetric` affects **only §4b**, never §4a.

### L0b. Layer 2 — Hard Separation (positional backstop) — **ACTIVE / LIVE**

- **Code**: the final block of `applyRacerBehavior`, gated by `hardSeparationEnabled`.
- **What**: a force-independent anti-penetration pass that resolves a fraction
  (`hardSeparationRelaxation`) of any residual body overlap per frame — lateral push first,
  longitudinal emergency separation when the boundary blocks the lateral move.
- **Warmup**: strength eases 0→full over `avoidanceWarmupMs` (`easeInOutCubic`), on open AND
  closed tracks. The race clock for this ramp is `priorityExtras?.currentTs` — the **only**
  surviving consumer of the third argument.
- **Config**: `hardSeparationEnabled`, `hardSeparationRelaxation` **0.15**,
  `hardSeparationTolerancePct` **0.1**, `avoidanceWarmupMs` **3000**.

### L1. Home force — spring toward centerline — **REMOVED (Commit A; priority path Commit B)**

- **Code**: legacy `−physicalY × homeForceStrength × overlapFactor` [`raceBehavior.js:807-810`](../client/src/modules/raceBehavior.js#L807-L810); priority path [`raceBehavior.js` → `vClose`](../client/src/modules/raceBehavior.js#L787-L800).
- **What**: linear restoring force pulling every racer back to `physicalY = 0`.
- **When**:
  - **Legacy path** (no `priorityExtras`): always on, but scaled by `homeForceReductionOnOverlap` (0.3) while in geometric overlap.
  - **Priority path** (active in browser — `priorityConfigRef` is passed): home force is **fully OFF** in OVERLAP / COOLDOWN / BLOCKED, **full ON** only in NORMAL. Escape hatch: a reduced pull (`× blockedEscapeForce` 0.3) after `blockedTimeoutFrames` (60) consecutive BLOCKED frames.
- **Magnitude**: `homeForceStrength` **0.03** × current `physicalY`. **Not** sqrt-diluted (single force).
- **Config**: `homeForceStrength` **0.03**, `homeForceReductionOnOverlap` **0.3** (legacy only), priority `cooldownMs` **500**, `blockedTimeoutFrames` **60**, `blockedEscapeForce` **0.3**.
- **Conflict role**: pulls toward center → directly **opposes** any avoidance/free-lane/commit push that is steering a racer _away_ from center. Identified as the driver of the relPos≈0 sign-flip pendulum (see Conflicts §C2).

### L2. Avoidance push — trailer yields, leader holds — **REMOVED (Commit A)**

- **Code**: `yAvoidDeltas += pushDir × forceMag × lateralScale` [`raceBehavior.js` → `trailer`](../client/src/modules/raceBehavior.js#L724-L730).
- **What**: asymmetric anisotropic repulsion. Only the **trailer** (lower `t`) is pushed away from the leader's `physicalY`; the leader holds its line.
- **When (geometric gate)**: both axes inside buffered body contact — `latPx < contactWidth×(1+buffer)` AND `longPx < contactLength×(1+buffer)` ([`raceBehavior.js` → `speedBrakeSet`](../client/src/modules/raceBehavior.js#L570-L580)). Skipped when `|yDiff| < 1e-6` (no meaningful direction).
- **Magnitude**: `forceMag = lateralForce × min(latFraction, longFraction)` — proximity-scaled, peaks at `lateralForce` when bodies touch, decays to 0 at the gate edge ([`raceBehavior.js` → `brakeMatchCaps`](../client/src/modules/raceBehavior.js#L587-L591)). Times `lateralScale` (L10).
- **Dilution**: **YES** — divided by `sqrt(neighborCount)` ([`raceBehavior.js:816-819`](../client/src/modules/raceBehavior.js#L816-L819)).
- **Config**: `lateralForce` **0.0114**, `avoidanceBufferPct` **0.2**.

### L3. Free-lane separation impulse — steer to a genuinely free side — **REMOVED (Commit A)**

- **Code**: `yFreeLaneDeltas += dir × forceMag` [`raceBehavior.js:667-674`](../client/src/modules/raceBehavior.js#L667-L674); direction logic [`raceBehavior.js` → `maxBodyLen`](../client/src/modules/raceBehavior.js#L619-L659).
- **What**: occupancy-aware push toward whichever side (`isSideFree` checks the corridor) is actually clear. Symmetric (both members of a pair get a direction). Deadlock-safe: if both sides blocked, `dir = 0`.
- **When**: on **true overlap** only. *(Corrected 2026-09-03: this described a `preOverlapFreeLane` option that would extend it to the approach zone. **That key exists nowhere in the tree** — control: the same query on `homeForceReductionOnOverlap`, its neighbour, finds its history. It went with Commit B, `f3116226`, 2026-06-28.)*
- **Magnitude**: same `forceMag` as avoidance (proximity-scaled `lateralForce`). **Not** scaled by `lateralScale`.
- **Dilution**: **YES** — divided by `sqrt(freeLaneCount)` ([`raceBehavior.js` → `heroPass`](../client/src/modules/raceBehavior.js#L820-L824)).
- **Config**: `maxLateral` — value in [`defaults.js`](../client/src/modules/storage/defaults.js) — caps the side-free target. *(Corrected 2026-09-03: `preOverlapFreeLane` was listed here and does not exist; `maxLateral`'s value is not restated, per this file's own rule.)*

### L4. Stage B/C committed lateral force — debounced same-lane side choice — **REMOVED (Commit A)**

- **Code**: commit decision [`raceBehavior.js` → `bmMultiplier`](../client/src/modules/raceBehavior.js#L856-L918); injection `delta += approachCommitDir × injected` [`raceBehavior.js` → `longPx`](../client/src/modules/raceBehavior.js#L921-L951).
- **What**: when a trailer is directly behind a leader in the **same lane** (`|yDiff| < sameLaneHH`, [`raceBehavior.js` → `pairTW`](../client/src/modules/raceBehavior.js#L701-L722)), it commits to one side and pushes there with debounce (anti-zigzag). Stage C may flip the side if the natural side is forward-blocked and the opposite side is clear both ahead and adjacent.
- **Direction**: `naturalDir = sign(relPos)` outside the dead-zone, else the stable `pairTieDir` ([`raceBehavior.js` → `bmMultiplier`](../client/src/modules/raceBehavior.js#L868-L887)).
- **When**: trailer in `_sameLaneApproach`. Debounce: counter must decay before flipping; anti-starvation abandons after `brakeHoldTimeoutFrames`; decays over `brakeReleaseDebounceFrames` when the leader is gone.
- **Magnitude**: `injected = _approachForceMag` (the max `forceMag` seen for this trailer) — i.e. on the order of `lateralForce`. **Injected directly into `delta`, AFTER the sqrt(N) normalization** — so it is **not** diluted.
- **Config**: `commitDirDeadZoneY` **0.04**, `brakeHoldTimeoutFrames` **90**, `brakeReleaseDebounceFrames` **3**.
- **Conflict role**: this is the "Commit-Injection" the task names — it is added on top of (and can overpower) the already-diluted avoidance + free-lane forces (see §C1).

### L5. Stage D gap-clearing force — self-limiting honest-clearance push — **REMOVED (Commit A)**

- **Code**: [`raceBehavior.js` → `latTrigger`](../client/src/modules/raceBehavior.js#L924-L949).
- **What**: additive proportional push (on top of L4) that drives a same-lane trailer toward one honest body-width of lateral separation behind its leader.
- **When (three gates)**: (1) `inSameLane`, (2) trailer in `speedBrakeSet` (actively braking, close in `t` — excludes "alongside" pairs), (3) fresh leader `physicalY`. Ramps from `lateralForce × gapForceStrength` at `|yDiff|=0` to 0 at `|yDiff| = 2× honestHalfSpan`.
- **Magnitude**: `gapForce = lateralForce × gapForceStrength × gapRatio`; total L4+L5 capped at `lateralForce × gapForceCap`.
- **Dilution**: **NO** (injected into `delta` post-normalization, then cap-limited).
- **Config**: `gapForceStrength` **1.0**, `gapForceCap` **1.5**.

### L6. OVL-C — sustained-overlap escape (the _leader_ side) — **REMOVED (Commit B)**

- **Code**: [`raceBehavior.js` → `ssMargin`](../client/src/modules/raceBehavior.js#L954-L1004).
- **What**: targets the **non-same-lane** member (the leader, which Stage D never reaches) of a pair locked in OVERLAP, so both racers separate simultaneously instead of one waiting forever. `!inSameLane` ensures a pair never gets both L5 and L6.
- **When**: requires `priorityExtras`, `currentMode === OVERLAP`, and `currentModeFrameCount ≥ overlapEscapeTimeout` (120). Uses the free-side direction recorded during free-lane, with its own debounce latch.
- **Magnitude**: `escForce = lateralForce × overlapEscapeStrength × gapRatio`, capped at `lateralForce × gapForceCap`.
- **Dilution**: **NO** (post-normalization injection).
- **Config**: `overlapEscapeStrength` **0.25**, `overlapEscapeTimeout` **120**, `gapForceCap` **1.5**.

### L7. Soft repulsion — quadratic boundary cushion

- **Code**: [`raceBehavior.js:1011-1016`](../client/src/modules/raceBehavior.js#L1011-L1016).
- **What**: as `|newY|` enters `[comfortThreshold, 1.0)`, a quadratic inward push grows toward the boundary — a soft wall before the hard clamp.
- **When**: `comfortThreshold ≤ |newY| < 1.0`. Applied **after** velocity integration, directly on `newY`.
- **Magnitude**: `−sign(newY) × softRepulsionStrength × pen²`, `pen = (|newY|−comfort)/(1−comfort)`.
- **Config**: `comfortThreshold` **0.7**, `softRepulsionStrength` **0.1**.

### L8. maxLateral clamp / hard boundary

- **Code**: [`raceBehavior.js` → `bSingle`](../client/src/modules/raceBehavior.js#L1018-L1022).
- **What**: hard clamp of `physicalY` to `±min(maxLateral, 1.0)`. On a boundary hit, `physicalYVelocity` is reset to 0 (kills bounce).
- **Magnitude**: cap = **0.95** (`maxLateral`).
- **Config**: `maxLateral` **0.95**.

### L9. Stuck-mode suppression — sandwich freeze — **REMOVED (Commit A; the Layer-1 "hold" target replaces it)**

- **Code**: [`raceBehavior.js` → `dir`](../client/src/modules/raceBehavior.js#L830-L851).
- **What**: when a racer is bilaterally sandwiched (pressure near-balanced from both sides AND near-zero velocity), **all** lateral delta is zeroed so it holds position instead of jittering. Resumes the instant space opens.
- **When**: `stuckModeSuppress` true AND `totalPressure > STUCK_P_THRESH` AND `imbalance < STUCK_BALANCE_RATIO` AND `|velocity| < STUCK_VEL_THRESH`. Requires the `rawPos/rawNeg` breakdown to be computed.
- **Magnitude**: sets `delta = 0` (a _gate_, not a force).
- **Constants**: `STUCK_P_THRESH` **0.008**, `STUCK_BALANCE_RATIO` **0.25**, `STUCK_VEL_THRESH` **0.0015** ([`raceBehavior.js:27-29`](../client/src/modules/raceBehavior.js#L27-L29)).
- **Config**: `stuckModeSuppress` **true**.
- **Note**: suppresses the _summed physics_ delta but runs **before** the Stage B/C/D and OVL-C injections (L4–L6), so those committed/escape forces are **not** suppressed — they can still move a "stuck" racer.

### L10. `lateralScale` — track-width normalization (avoidance only) — **REMOVED (Commit A, with avoidance)**

- **Code**: [`raceBehavior.js` → `aLatMax`](../client/src/modules/raceBehavior.js#L582-L585), applied at [`raceBehavior.js:728`](../client/src/modules/raceBehavior.js#L728).
- **What**: scales avoidance (L2 only) so the pixel-space push is consistent across track widths: `clamp(REFERENCE_TRACK_WIDTH / pairTW, 0.1, 3.0)`.
- **Magnitude**: 1.0 at `pairTW = 98 px` (`REFERENCE_TRACK_WIDTH`); >1 on narrow, <1 on wide tracks.
- **Note**: applies to **avoidance only** — free-lane (L3) and the commit/gap/escape injections (L4–L6) are **not** track-width-scaled. (Possible inconsistency, not a documented bug.)

### L11. Damping — lateral velocity decay

- **Code**: [`raceBehavior.js:1008`](../client/src/modules/raceBehavior.js#L1008).
- **What**: `physicalYVelocity = (physicalYVelocity + delta) × damping`. Retains only a fraction of velocity each frame → critically over-damped lateral motion.
- **Magnitude**: `lateralDamping` **0.16** (only 16% of velocity carried over — heavy damping).
- **Config**: `lateralDamping` **0.16**.

---

## C. STATE MACHINES

The three lateral latches below were all removed with their forces. Only the **brake-match
hold (C-iv)** — a longitudinal latch gating A6 — survives.

### C-i. Priority mode (drove Home Force) — **REMOVED (Commit B)**

The 4-mode machine (`NORMAL` / `OVERLAP` / `COOLDOWN` / `BLOCKED`), `_computeBlockedMode`,
`overlapSet` membership, and the `currentMode` / `blockerInfo` racer fields are gone. The
home force it gated was already removed in Commit A, so the machine was inert before deletion.

### C-ii. Approach-commit latch (drove L4/L5) — **REMOVED (Commit A)**

`approachCommitDir` / `approachCommitFrames` and the `_sameLaneApproach` trailer set are gone.

### C-iii. Escape-commit latch (drove L6) — **REMOVED (Commit B)**

`escapeCommitDir` / `escapeCommitFrames` and the `_ovlcEscapeDir` / `_ovlcPartnerY` maps are gone.

### C-iv. Brake-match hold (drives A6) — **ACTIVE** — fields `brakeMatchLeaderIndex`, `brakeMatchFactor`, `brakeMatchFrames`, `brakeReleaseFrames`

Negative `brakeMatchFrames` encodes the escape/cooldown countdown. This is a **longitudinal**
latch (it gates A6), listed here because it lives in the same per-racer apply loop. Unchanged
by Commits A/B.

### Lateral-state summary (current)

A racer's lateral motion in one frame is: a single Soft-Steering spring (L0a) toward its
target, then soft-repulsion (L7) + clamp (L8) + damping (L11), then the Hard-Separation
backstop (L0b). The additive multi-force stack — and the conflicts it produced — is gone.

---

## D. KNOWN CONFLICTS (forces working against each other)

> **Post Commit A + B:** the lateral conflicts **C1–C5** are **RESOLVED BY REMOVAL** — they
> were all interactions among the deleted multi-force stack (home / avoidance / free-lane /
> commit / gap / OVL-C / stuck-suppression / sqrt(N)). With a single Soft-Steering spring plus
> the Hard-Separation backstop, none of C1–C5 can occur. They are retained below as history.
> The **longitudinal** conflicts **C6–C7** are untouched and remain live.

### C1. Commit-injection overpowers diluted avoidance + free-lane — **RESOLVED BY REMOVAL (Commit A)**

- **What**: L2 (avoidance) and L3 (free-lane) are divided by `sqrt(N)` ([`raceBehavior.js` → `heroPass`](../client/src/modules/raceBehavior.js#L816-L824)) to prevent start-line stacking explosions. The Stage B/C/D commit injection (L4/L5) and OVL-C (L6) are added to `delta` **after** that normalization ([`raceBehavior.js` → `longPx`](../client/src/modules/raceBehavior.js#L921-L1004)) at full `lateralForce` magnitude (capped only by `gapForceCap` 1.5).
- **Effect**: in dense fields the diluted physics push can be `lateralForce/√10 ≈ 0.31× lateralForce`, while the commit injection is up to `1.5× lateralForce` — roughly a **5× authority gap**. The committed side wins, and the occupancy-aware free-lane steer is effectively overridden. The task's framing — "Commit-Injection overrides Avoidance + Free-lane" — is confirmed by the code path.

### C2. Home force vs. commit direction at relPos≈0 — the lateral pendulum

- **What**: Home force (L1) always pulls toward `physicalY = 0`. When a same-lane trailer sits near the centerline relative to its leader, `sign(relPos)` flips as home force drags it through center, flipping `naturalDir` and the committed push.
- **Effect**: a slow lateral limit-cycle (pendulum). The `commitDirDeadZoneY` (0.04) band and `pairTieDir` were added specifically to hold a stable side inside the band ([`raceBehavior.js` → `bmMultiplier`](../client/src/modules/raceBehavior.js#L868-L877)); the dead-zone was _widened_ in the most recent commit (`0d21b4d fix(physics): widen commit-dir dead-zone to break lateral pendulum limit-cycle`). This is a **mitigated but structurally live** conflict.

### C3. Avoidance (trailer-only) vs. free-lane (symmetric) push different members

- **What**: L2 pushes **only the trailer** away from the leader's `physicalY` ([`raceBehavior.js` → `pairTW`](../client/src/modules/raceBehavior.js#L692-L730)). L3 pushes **both** members toward their free sides ([`raceBehavior.js:667-674`](../client/src/modules/raceBehavior.js#L667-L674)). For the same pair the two forces can point the trailer in **opposite** directions in the same frame (avoidance says "away from leader's Y", free-lane says "toward the open corridor", which may be the leader's side). They are summed, so the net can partially cancel.

### C4. Home force vs. soft repulsion vs. boundary clamp near the edge

- **What**: near `|physicalY| → 0.95`, L1 pulls inward, L7 (soft repulsion) also pushes inward, and L8 hard-clamps + zeroes velocity. These all act inward so they do not _oppose_ each other, but L8's velocity reset can strand a racer pinned at the boundary while avoidance keeps trying to push it outward (gate still firing) — a force that is silently discarded every frame.

### C5. Stuck-suppression zeroes physics but not injections

- **What**: L9 sets the summed `delta` (home + avoid/√N + free-lane/√N) to 0 when sandwiched, but the Stage B/C/D and OVL-C injections (L4–L6) are added to `delta` _after_ the suppression check inside the same loop ([`raceBehavior.js` → `offsetY`](../client/src/modules/raceBehavior.js#L838-L1004)). A racer the suppressor deems "stuck and should wait" can still be moved by a committed push — the two subsystems disagree about whether the racer should hold.

### C6. Brake-to-match cap vs. Race-Plan controller/area-bonus (longitudinal)

- **What**: A6 caps trailer speed to the leader's advance; A7/A8 simultaneously _boost_ the same racer toward an assigned rank/band. In OUTCOME phase a racer scripted to advance (trajectoryMult up to 1.10) can be simultaneously brake-capped to ≈leader speed when stuck behind a slower body. The `min()` brake wins on the brake term, but the controller keeps demanding a boost — the scripted finish order can fight the physical brake. (`racersBlockedInOutcome` telemetry exists precisely to measure this — [`racePlanner.js:394, 463`](../client/src/modules/racePlanner.js#L394).)

### C7. Drafting boost vs. speed/brake-match (longitudinal)

- **What**: A4 (+4%) accelerates a follower _into_ the leader's wake; A5/A6 then brake it back when it closes to body contact. The drafting boost is also fed _into_ the brake-match speed estimate ([`raceBehavior.js:526-539`](../client/src/modules/raceBehavior.js#L526-L539)), so a drafting trailer both speeds up and raises its own brake cap — a coupled loop that can oscillate (speed up → close → brake → fall back → boost lost → repeat).

---

## E. DEAD / NEAR-DEAD / VESTIGIAL FORCES

| Item                                                                         | Status                                                                                                                                                | Evidence                                                                       |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `zoneMult` (race-zone brake, A10)                                            | **REMOVED** — `raceZones.js` + `DEFAULT_RACE_ZONE_CONFIG` deleted                                                                                     | —                                                                              |
| `rubberBandMult` (cap-the-lead brake, A9)                                    | **REMOVED** — `raceRubberBand.js` + `DEFAULT_RUBBER_BAND_CONFIG` deleted (browser + sim)                                                              | —                                                                              |
| `preOverlapFreeLane` approach-zone steering (part of L3)                     | **REMOVED** (Commit B, `f3116226`, 2026-06-28) — the key exists nowhere in the tree; every other row in this table says REMOVED and this one still read as a live default until 2026-09-03                                                                                         | [`defaults.js` → `endgameThreshold`](../client/src/modules/storage/defaults.js#L322-L325)          |
| Legacy home-force path (`homeForceReductionOnOverlap`)                       | **REMOVED (Commit A)** — the entire home force and `overlapSet`→`homeForceReductionOnOverlap` path is gone                                            | —                                                                              |
| `tWeight` / `yWeight` / `avoidanceDistance`                                  | **Retired** from browser gate (geometric gate replaced them); kept only for sim-script back-compat                                                    | [`defaults.js` → `leadChangeDebounceMs`](../client/src/modules/storage/defaults.js#L382-L383) |
| `speedBrakeYThreshold`                                                       | **Retired** from browser brake gate (body-based same-lane filter replaced it); kept for sim/validation compat                                         | [`defaults.js:436`](../client/src/modules/storage/defaults.js#L436)               |
| `_approachLeft/Right`, `_forwardLeft/Right` (Stage A corridor sets)          | **REMOVED (Commit A)** — the Stage A/C corridor-set + side-switch machinery is gone with the free-lane/commit stack (`grep` = 0 in `raceBehavior.js`) | —                                                                              |
| `overlapEscapeStrength` / `overlapEscapeTimeout` / `gapForceCap` (OVL-C, L6) | **REMOVED (Commit B)** — config keys deleted from `defaults.js`                                                                                       | —                                                                              |
| Drafting on tight curves                                                     | **Intermittently misses** — documented cone-geometry limitation, not fixed                                                                            | [`raceBehavior.js:912-915`](../client/src/modules/raceBehavior.js#L912-L915)      |

---

## F. ONE-PAGE FORCE INVENTORY

### Longitudinal (multiplicative, none sqrt-diluted)

| #   | Force                                                                 | Default                                                              | When                                    | File:line           |
| --- | --------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------- | ------------------- |
| A0  | base speed                                                            | the duration anchor                                                  | always                                  | raceBaseSpeed.js:29 |
| A1  | speedMultiplier (type)                                                | per-type                                                             | always                                  | index.jsx:416       |
| A2  | spreadFactor (luck/re-roll)                                           | ±17.7% spread, 58% re-roll                                           | until 80% race                          | index.jsx:595,924   |
| A3  | speedBonusMult (row)                                                  | 1.0 factor                                                           | always                                  | index.jsx:578       |
| A4  | drafting boost                                                        | 1.04                                                                 | in wake cone                            | index.jsx:961       |
| A5  | speed brake floor + warmup                                            | 0.945, ramp 3 s open                                                 | same-lane close                         | index.jsx:972       |
| A6  | brake-to-match cap                                                    | targets leader speed                                                 | faster trailer                          | raceBehavior.js:549 |
| A7  | trajectoryMult (controller)                                           | [0.85,1.10]                                                          | OUTCOME 0.55–0.95                       | racePlanner.js:362  |
| A8  | areaBonusMult (band)                                                  | +6%…−2% (×2.0)                                                       | until 0.75 then fade                    | racePlanner.js:312  |
| A9  | rubberBandMult (cap-the-lead brake)                                   | **REMOVED** (raceRubberBand.js deleted)                              | —                                       | —                   |
| A10 | zoneMult (race zone)                                                  | **REMOVED** (raceZones.js deleted)                                   | —                                       | —                   |
| A11 | runoutDecay                                                           | ×0.97/frame                                                          | after finish                            | index.jsx:995       |
| A12 | BATTLE slowmo (global clock)                                          | 0.5                                                                  | BATTLE_ZOOM                             | index.jsx:824       |
| A13 | governorMult — PulkLeadRotation contest director (**active in PULK**) | attacker boost 0.06 / leader brake 0.10, ±0.12 envelope, ceiling 1.2 | PULK [0.15,0.5), faded→1.0 at corrStart | raceGovernor.js:170 |

### Lateral (current: Soft Steering spring → repulsion/clamp/damping → Hard Separation)

| #   | Force                          | Default                              | Status                           | Member |
| --- | ------------------------------ | ------------------------------------ | -------------------------------- | ------ |
| L0a | Layer 1 — Soft Steering spring | softSteeringStrength 0.03            | **ACTIVE / sole lateral force**  | self   |
| L0b | Layer 2 — Hard Separation      | relaxation 0.15, tol 0.1, warmup 3 s | **ACTIVE / backstop**            | both   |
| L7  | soft repulsion                 | 0.1, comfort 0.7                     | **ACTIVE**                       | self   |
| L8  | maxLateral clamp               | ±0.95                                | **ACTIVE**                       | self   |
| L11 | damping                        | 0.16                                 | **ACTIVE**                       | self   |
| L1  | home force                     | —                                    | **REMOVED (A; priority path B)** | —      |
| L2  | avoidance                      | —                                    | **REMOVED (A)**                  | —      |
| L3  | free-lane                      | —                                    | **REMOVED (A)**                  | —      |
| L4  | Stage B/C commit               | —                                    | **REMOVED (A)**                  | —      |
| L5  | Stage D gap force              | —                                    | **REMOVED (A)**                  | —      |
| L6  | OVL-C escape                   | —                                    | **REMOVED (B)**                  | —      |
| L9  | stuck suppression              | —                                    | **REMOVED (A)**                  | —      |
| L10 | lateralScale                   | —                                    | **REMOVED (A)**                  | —      |

---

## G. VERIFICATION NOTES FOR PLAN-CLAUDE

- The **two-frame coupling** (lateral flags written in step 4, read in step 2 next frame) means draft/brake-match flags always lag one physics step. Confirm this is intended before any redesign that assumes same-frame coupling.
- **`priorityExtras` is now `{ currentTs }` only.** The browser passes `{ currentTs: physicsTs }` and the sim passes `{ currentTs: raceTs }`. The single consumer is the **Hard-Separation warmup ramp** (`raceElapsedMs = priorityExtras?.currentTs`). No-clock callers (most unit tests) → warmup runs at full strength.
- **The sqrt-dilution asymmetry and the additive multi-force stack are gone** — conflicts C1–C5 no longer apply. The live lateral model is the single Soft-Steering spring (L0a) plus the Hard-Separation backstop (L0b).
- Any mechanics change here must be mirrored in `../scripts/sim-fairness.mjs` (Sim-Browser Parity Rule).

---

## 2026-07-10 — role vs docs/FORCE-PARITY.md (INFRA: sim-trust)

Two force documents that can disagree is how `zoneMult` hid for months. Division of labour, decided:

- **This document is the FORCE MAP** — the complete inventory of what forces exist
  and act on a racer, with the **lateral layers** (Layer 1 soft steering, Layer 2 hard separation,
  L7/L8/L11, and the Commit A/B removal history) as its unique, load-bearing content.
- **`archive/FORCE-PARITY.md` is the browser↔sim PARITY AUDIT** — the 22-row table of verdicts
  (IDENTICAL / DIVERGENT / …) and the open seams O1–O6. It is not a force map.
- **Anti-drift rule:** the longitudinal per-frame t-update has ONE source of truth —
  `../client/src/modules/raceStep.js` (`t += baseSpeed · boost · brake · rowEnvMult · trajectoryMult ·
areaBonusMult · governorMult`) — and its parity verdicts live in FORCE-PARITY. This document's
  longitudinal section (Section A) must **point to** those two, never re-list values that can drift out
  of sync. Racer lengths come from the single shared `../client/src/modules/raceLengths.js`.
