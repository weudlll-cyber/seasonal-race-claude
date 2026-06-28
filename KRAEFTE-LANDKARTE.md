# KRAEFTE-LANDKARTE — Complete Force Map of Racer Motion

> Analysis only. Every force is backed by a source line so it can be verified against the
> source. Content is in English per the project language rule (`CLAUDE.md` → no German
> anywhere in code or documents); only the requested filename is kept.

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

## Scope and reading order

A racer's motion has **two independent axes**, computed in **two different files**:

| Axis | Quantity | Where it is integrated | Driver file |
|------|----------|------------------------|-------------|
| Longitudinal | `r.t` (race progress) | `RaceScreen/index.jsx` step loop | `index.jsx` + `racePlanner.js` + `raceBaseSpeed.js` + `raceZones.js` |
| Lateral | `r.physicalY` ∈ [−1, +1] | `applyRacerBehavior()` | `raceBehavior.js` |

Per physics step the order is:
1. **Re-roll / rubber-band / controller** update the longitudinal multipliers (`index.jsx` ~862–922).
2. **Longitudinal integration**: `r.t += baseSpeed × boost × brake × trajectoryMult × areaBonusMult × rubberBandMult × zoneMult` (`index.jsx:982`).
3. `computePositions()` projects `(t, physicalY)` → world `(x, y, angle)`.
4. **`applyRacerBehavior()`** computes the *next* frame's lateral move and the brake/draft **flags** used by step 2 next frame (one-frame lag is intentional).

The lateral flags (`avoidanceActive`, `brakeMatchFactor`, `draftingBoostActive`) are written in step 4 and **read one frame later** in step 2 — same cross-file lag pattern throughout.

`FIXED_DT = 16 ms`, `REFERENCE_FPS = 60`, so every per-frame magnitude below is "per 1/60 s".

---

## A. LONGITUDINAL FORCES (speed / `r.t`)

Master equation — [`index.jsx:982-992`](client/src/screens/RaceScreen/index.jsx#L982-L992):

```
r.t += baseSpeed × boost × brake × trajectoryMult × areaBonusMult × rubberBandMult × zoneMult
```

where `baseSpeed = race_baseSpeed × speedMultiplier × spreadFactor × speedBonusMult` ([`index.jsx:608`](client/src/screens/RaceScreen/index.jsx#L608)).

All seven multipliers are **purely longitudinal**; none is sqrt(N)-diluted. They compound multiplicatively, so a racer's instantaneous speed is the product of every factor below.

### A0. Base speed (duration anchor)
- **Code**: `computeRaceBaseSpeed(finishT, targetDuration)` = `finishT / (REFERENCE_FPS × targetDurationSeconds)` — [`raceBaseSpeed.js:29-32`](client/src/modules/raceBaseSpeed.js#L29-L32); consumed at [`index.jsx:500`](client/src/screens/RaceScreen/index.jsx#L500).
- **What**: the per-frame `t`-rate that makes a neutral racer (all multipliers = 1.0) reach the finish in exactly the operator-chosen duration.
- **When**: always.
- **Magnitude**: the reference. Everything else is a dimensionless multiplier around 1.0.
- **Config**: `duration` default **60 s** (`DEFAULT_RACE_DEFAULTS.duration`); `BASE_SPEED_CONFIG.min/max` 0.00096 / 0.00113 only set the spread mean.

### A1. `speedMultiplier` — racer-type speed
- **Code**: `racerType.getSpeedMultiplier()` — [`index.jsx:416`](client/src/screens/RaceScreen/index.jsx#L416), baked into `baseSpeed`.
- **What**: per-type constant (e.g. rocket vs snail). Constant for the whole race.
- **Config**: per racer-type definition in `racer-types/*`. Default 1.0 for neutral types.

### A2. `spreadFactor` — luck draw + re-roll (the "race feel")
- **Code**: initial draw `(BASE_SPEED_MIN + rand×(MAX−MIN)) / BASE_SPEED_MEAN` — [`index.jsx:595-596`](client/src/screens/RaceScreen/index.jsx#L595-L596); re-rolled mid-race [`index.jsx:924-957`](client/src/screens/RaceScreen/index.jsx#L924-L957).
- **What**: the *only* longitudinal factor that changes randomly during the race. Re-rolls every `rollInterval` with an `easeInOutCubic` transition over `reRollTransitionDuration` (5 s).
- **When**: re-roll fires when `physicsTs ≥ nextRollTime && physicsTs < lastRollDeadline` ([`index.jsx:927`](client/src/screens/RaceScreen/index.jsx#L927)). Stops at `reRollLastPositionPercent` (80%) of race.
- **Magnitude**: spread ≈ ±17.7% of mean (min 0.00096 → max 0.00113). Re-roll step half-width = `spreadRange × reRollVariationPercent/100` ([`index.jsx:799`](client/src/screens/RaceScreen/index.jsx#L799)), default 58%.
- **Config**: `DEFAULT_BASE_SPEED_CONFIG.min/max`; `reRollVariationPercent` **58**, `reRollTransitionDuration` **5.0**, `reRollIntervalDivisor` **15**, `reRollLastPositionPercent` **80**.
- **Note**: Sine jitter was removed (Etappe 19); race feel now comes *only* from these re-rolls.

### A3. `speedBonusMult` — positional back-row compensation
- **Code**: `1 + computeSpeedBonus(rowIndex, …)` — [`index.jsx:578-597`](client/src/screens/RaceScreen/index.jsx#L578-L597).
- **What**: constant per-racer bonus so racers starting further back are not structurally disadvantaged. Constant over the whole race.
- **Config**: `DEFAULT_ROW_LAYOUT_CONFIG.speedBonusFactor` **1.0**.

### A4. `boost` — drafting / slipstream
- **Code**: `r.draftingBoostActive ? draftingBoost : 1.0` — [`index.jsx:961`](client/src/screens/RaceScreen/index.jsx#L961). Flag set in `raceBehavior.js` drafting block [`raceBehavior.js:1112-1140`](client/src/modules/raceBehavior.js#L1112-L1140).
- **What**: forward speed bonus when a follower sits in a leader's wake cone.
- **When**: follower must be **behind** in `t` (`leader.t > follower.t`), within `draftingMaxDistance` world px, and inside the half-cone behind the leader's heading.
- **Magnitude**: `draftingBoost` default **1.04** (+4%).
- **Config**: `draftingMaxDistance` **80** px, `draftingConeAngle` **30°**, `draftingBoost` **1.04**.
- **Known weakness (documented in source)**: on tight curves the cone rotates fast and can miss a follower physically in the slipstream — [`raceBehavior.js:1112-1115`](client/src/modules/raceBehavior.js#L1112-L1115). Drafting is also fed into the brake-to-match leader/trailer speed estimate ([`raceBehavior.js:526-527`](client/src/modules/raceBehavior.js#L526-L527)).

### A5. `brake` — speed brake (avoidance floor) + warmup ramp
- **Code**: `r.avoidanceActive ? min(effectiveBrakeFactor, brakeMatchFactor) : 1.0` — [`index.jsx:972-974`](client/src/screens/RaceScreen/index.jsx#L972-L974). Floor + ramp from `computeEffectiveBrakeFactor()` [`raceBehaviorConfig.js:34-38`](client/src/modules/raceBehaviorConfig.js#L34-L38).
- **What**: slows a trailer that is closing on a leader in the same lane. `avoidanceActive` is set when a pair is inside the body-based brake zone — [`raceBehavior.js:501-502`](client/src/modules/raceBehavior.js#L501-L502).
- **When (gate)**: `|dY| < brakeSameLaneY && dT < dynamicBrakeT`, both **body-based** ([`raceBehavior.js:497-501`](client/src/modules/raceBehavior.js#L497-L501)):
  - longitudinal zone = `(bodyContactLength / pathLength) × speedBrakeTMultiplier`
  - lateral filter = `pxToPhysicalY(bodyContactWidth)` (same-lane y/n only — never drives strength)
- **Magnitude**: floor `speedBrakeFactor` default **0.945** (−5.5%). On **open** tracks it eases in over `avoidanceWarmupMs` (3000 ms) from 1.0 → 0.945 via `easeInOutCubic`; **closed** tracks get full braking from frame 1.
- **Config**: `speedBrakeFactor` **0.945**, `speedBrakeTMultiplier` **1.5**, `speedBrakeYThreshold` **0.18** (retired from browser gate, kept for sim compat), `avoidanceWarmupMs` **3000**.
- **Scope note**: the *brake floor* (avoidanceActive) runs on **all** tracks. Disabling it on closed tracks caused regressions (report 12/13).

### A6. `brake` — brake-to-match cap (speed matching)
- **Code**: `computeBrakeMatchFactor(leaderFwdSpeed, trailerDenom, …)` — [`raceBehavior.js:89-100`](client/src/modules/raceBehavior.js#L89-L100); selected as most-constraining leader [`raceBehavior.js:549-560`](client/src/modules/raceBehavior.js#L549-L560); hold state machine [`raceBehavior.js:1025-1091`](client/src/modules/raceBehavior.js#L1025-L1091). Applied via the `min()` at [`index.jsx:973`](client/src/screens/RaceScreen/index.jsx#L973).
- **What**: caps the trailer's speed to ≈ the leader's *actual* advance speed (×0.999 safety) so a faster trailer settles in behind instead of telescoping into the leader. Distinct from A5: A5 is a fixed floor, A6 is a computed per-pair cap.
- **When**:
  - **Open** tracks: narrow zone `dT < bodyContactLength/pathLength × brakeMatchActivationTMultiplier` AND `|dY| < brakeMatchActivationYThreshold` ([`raceBehavior.js:511-519`](client/src/modules/raceBehavior.js#L511-L519)).
  - **Closed** tracks: every pair already inside the wide brake zone qualifies (`inBrakeMatchZone = true`, [`raceBehavior.js:521`](client/src/modules/raceBehavior.js#L521)).
  - Engages only if trailer is faster than leader by `> speedMatchMinDifferential`.
- **Hold/escape**: locks one leader; anti-trap escape after `brakeHoldTimeoutFrames` (90) → forced release `brakeHoldEscapeReleaseDurationFrames` (15) + cooldown `brakeHoldEscapeCooldownFrames` (60); debounced release over `brakeReleaseDebounceFrames` (3); stale-leader guard resets instantly.
- **Magnitude**: cap ∈ (0, 1]; 1.0 = no extra braking. Combined with A5 via `min()`.
- **Config**: `brakeMatchActivationTMultiplier` **0.5**, `brakeMatchActivationYThreshold` **0.06**, `speedMatchMinDifferential` **0.005**, `speedMatchSafetyMargin` **0.001**, `brakeHoldTimeoutFrames` **90**, `brakeHoldEscapeReleaseDurationFrames` **15**, `brakeHoldEscapeCooldownFrames` **60**, `brakeReleaseDebounceFrames` **3**.
- **Open-only subtlety**: on open tracks the cap targets the leader's *braked* advance (`rawSpeed × min(0.945, leaderBrakeMatch)`); on closed tracks `leaderBrake = 1.0` to preserve the pre-rebuild baseline ([`raceBehavior.js:540-548`](client/src/modules/raceBehavior.js#L540-L548)).

### A7. `trajectoryMult` — Race-Plan P-controller (OUTCOME steering)
- **Code**: written by `createTrajectoryController().update()` — [`racePlanner.js:306-401`](client/src/modules/racePlanner.js#L306-L401); eased into `r.trajectoryMult` [`index.jsx:872-882`](client/src/screens/RaceScreen/index.jsx#L872-L882).
- **What**: bidirectional proportional controller that nudges every racer toward an assigned `targetRank` during the OUTCOME phase — the mechanism that makes the *scripted* finishing order happen.
- **When**: only in `OUTCOME` phase (`corridorStart`..`corridorEnd`, default 0.55–0.95 of duration). Outside OUTCOME the target is 1.0.
- **Magnitude**: clamped to `[minMult, maxMult]` = **[0.85, 1.10]**; gain **2.0**; per-step stochastic noise ±`stochasticNoise` (0.0008).
- **Config**: `racePlanCorridorStart` **0.55**, `racePlanCorridorEnd` **0.95**; controller defaults `gain 2.0 / maxMult 1.1 / minMult 0.85 / bandStrictness 1.0`.

### A8. `areaBonusMult` — Race-Plan band bonus (early/mid steering)
- **Code**: set per racer from target band, then `easeInOutCubic` fade to 1.0 after `transitionEnd` — [`racePlanner.js:84-93, 306-339`](client/src/modules/racePlanner.js#L84-L93); read at [`index.jsx:988`](client/src/screens/RaceScreen/index.jsx#L988).
- **What**: constant-per-band forward bonus that biases racers toward their assigned area before the OUTCOME controller takes over.
- **When**: full strength until `racePlanBonusTransitionEnd` (0.75), then fades over `racePlanBonusFadeDuration` (1500 ms).
- **Magnitude**: base deltas × `bonusStrengthMultiplier` (default **2.0**): B1 +0.03, B2 +0.02, B3 +0.01, B4 0, B5 −0.01 → at ×2.0 that is roughly +6% (B1) to −2% (B5).
- **Config**: `racePlanBonusStrengthMultiplier` **2.0**, `racePlanBonusTransitionEnd` **0.75**, `racePlanBonusFadeDuration` **1500**.
- **History**: an earlier negative-`elapsedFade` bug blew this up to 5–556×; now lower-clamped at 0 ([`racePlanner.js:330-333`](client/src/modules/racePlanner.js#L330-L333)).

### A9. `rubberBandMult` — catch-up boost
- **Code**: [`index.jsx:886-922`](client/src/screens/RaceScreen/index.jsx#L886-L922).
- **What**: flat forward boost for every **non-leader** when the leader's gap to P2 exceeds a threshold — keeps the field together.
- **When**: `enabled` AND leader progress `< endgameThreshold` (0.9) AND `leaderGap > gapThreshold`. Disabled in the endgame so the finish is not rubber-banded.
- **Magnitude**: `1.0 + flatBoost` = **1.10** (+10%), eased over `boostRampMs` (2000 ms).
- **Config**: `enabled` **true**, `flatBoost` **0.10**, `boostRampMs` **2000**, `gapThreshold` **0.003**, `endgameThreshold` **0.9**.

### A10. `zoneMult` — race-zone brake (position-based)
- **Code**: `zoneMultAt(zt, zones)` — [`raceZones.js:32, 44-`](client/src/modules/raceZones.js#L32); applied at [`index.jsx:978-990`](client/src/screens/RaceScreen/index.jsx#L978-L990).
- **What**: an optional fixed-position track segment that multiplies speed (a "slow zone"). Type-neutral, position-only.
- **When**: only inside the configured zone span; 1.0 elsewhere. **Disabled by default**.
- **Magnitude**: `brakeStrength` **0.85** when enabled.
- **Config**: `DEFAULT_RACE_ZONE_CONFIG` `enabled` **false**, `position` **0.5**, `width` **0.05**, `brakeStrength` **0.85**.
- **Status**: effectively **dead by default** (enabled=false).

### A11. `runoutDecay` — post-finish coast
- **Code**: [`index.jsx:993-997`](client/src/screens/RaceScreen/index.jsx#L993-L997).
- **What**: once `finished`, the racer ignores all multipliers above and just coasts: `runoutDecay *= 0.97` each frame.
- **When**: only after crossing the finish line.

### A12. BATTLE slowmo — global time scaling (not per-racer)
- **Code**: [`index.jsx:805-831`](client/src/screens/RaceScreen/index.jsx#L805-L831).
- **What**: during `BATTLE_ZOOM` the **physics clock** (not an individual force) is scaled, slowing *all* racers uniformly for cinematic effect. Affects `rawDt` feeding the step, with fade in/out.
- **Magnitude**: `battleSlowmoFactor` **0.5** (half speed), `battleSlowmoFadeDuration` 0.3 s, min hold 2.0 s.
- **Note**: a global multiplier on the step clock — it does not change relative ordering, so it is fairness-neutral but it does change every racer's instantaneous `t`-rate.

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
- **Code**: legacy `−physicalY × homeForceStrength × overlapFactor` [`raceBehavior.js:807-810`](client/src/modules/raceBehavior.js#L807-L810); priority path [`raceBehavior.js:787-800`](client/src/modules/raceBehavior.js#L787-L800).
- **What**: linear restoring force pulling every racer back to `physicalY = 0`.
- **When**:
  - **Legacy path** (no `priorityExtras`): always on, but scaled by `homeForceReductionOnOverlap` (0.3) while in geometric overlap.
  - **Priority path** (active in browser — `priorityConfigRef` is passed): home force is **fully OFF** in OVERLAP / COOLDOWN / BLOCKED, **full ON** only in NORMAL. Escape hatch: a reduced pull (`× blockedEscapeForce` 0.3) after `blockedTimeoutFrames` (60) consecutive BLOCKED frames.
- **Magnitude**: `homeForceStrength` **0.03** × current `physicalY`. **Not** sqrt-diluted (single force).
- **Config**: `homeForceStrength` **0.03**, `homeForceReductionOnOverlap` **0.3** (legacy only), priority `cooldownMs` **500**, `blockedTimeoutFrames` **60**, `blockedEscapeForce` **0.3**.
- **Conflict role**: pulls toward center → directly **opposes** any avoidance/free-lane/commit push that is steering a racer *away* from center. Identified as the driver of the relPos≈0 sign-flip pendulum (see Conflicts §C2).

### L2. Avoidance push — trailer yields, leader holds — **REMOVED (Commit A)**
- **Code**: `yAvoidDeltas += pushDir × forceMag × lateralScale` [`raceBehavior.js:724-730`](client/src/modules/raceBehavior.js#L724-L730).
- **What**: asymmetric anisotropic repulsion. Only the **trailer** (lower `t`) is pushed away from the leader's `physicalY`; the leader holds its line.
- **When (geometric gate)**: both axes inside buffered body contact — `latPx < contactWidth×(1+buffer)` AND `longPx < contactLength×(1+buffer)` ([`raceBehavior.js:570-580`](client/src/modules/raceBehavior.js#L570-L580)). Skipped when `|yDiff| < 1e-6` (no meaningful direction).
- **Magnitude**: `forceMag = lateralForce × min(latFraction, longFraction)` — proximity-scaled, peaks at `lateralForce` (**0.0114**) when bodies touch, decays to 0 at the gate edge ([`raceBehavior.js:587-591`](client/src/modules/raceBehavior.js#L587-L591)). Times `lateralScale` (L10).
- **Dilution**: **YES** — divided by `sqrt(neighborCount)` ([`raceBehavior.js:816-819`](client/src/modules/raceBehavior.js#L816-L819)).
- **Config**: `lateralForce` **0.0114**, `avoidanceBufferPct` **0.2**.

### L3. Free-lane separation impulse — steer to a genuinely free side — **REMOVED (Commit A)**
- **Code**: `yFreeLaneDeltas += dir × forceMag` [`raceBehavior.js:667-674`](client/src/modules/raceBehavior.js#L667-L674); direction logic [`raceBehavior.js:619-659`](client/src/modules/raceBehavior.js#L619-L659).
- **What**: occupancy-aware push toward whichever side (`isSideFree` checks the corridor) is actually clear. Symmetric (both members of a pair get a direction). Deadlock-safe: if both sides blocked, `dir = 0`.
- **When**: by default on **true overlap** only; if `preOverlapFreeLane` is true, also in the approach zone (gate-passed, pre-overlap). Default `preOverlapFreeLane = false`.
- **Magnitude**: same `forceMag` as avoidance (proximity-scaled `lateralForce`). **Not** scaled by `lateralScale`.
- **Dilution**: **YES** — divided by `sqrt(freeLaneCount)` ([`raceBehavior.js:820-824`](client/src/modules/raceBehavior.js#L820-L824)).
- **Config**: `preOverlapFreeLane` **false**, `maxLateral` **0.95** (caps the side-free target).

### L4. Stage B/C committed lateral force — debounced same-lane side choice — **REMOVED (Commit A)**
- **Code**: commit decision [`raceBehavior.js:856-918`](client/src/modules/raceBehavior.js#L856-L918); injection `delta += approachCommitDir × injected` [`raceBehavior.js:921-951`](client/src/modules/raceBehavior.js#L921-L951).
- **What**: when a trailer is directly behind a leader in the **same lane** (`|yDiff| < sameLaneHH`, [`raceBehavior.js:701-722`](client/src/modules/raceBehavior.js#L701-L722)), it commits to one side and pushes there with debounce (anti-zigzag). Stage C may flip the side if the natural side is forward-blocked and the opposite side is clear both ahead and adjacent.
- **Direction**: `naturalDir = sign(relPos)` outside the dead-zone, else the stable `pairTieDir` ([`raceBehavior.js:868-887`](client/src/modules/raceBehavior.js#L868-L887)).
- **When**: trailer in `_sameLaneApproach`. Debounce: counter must decay before flipping; anti-starvation abandons after `brakeHoldTimeoutFrames` (90) frames; decays over `brakeReleaseDebounceFrames` (3) when leader gone.
- **Magnitude**: `injected = _approachForceMag` (the max `forceMag` seen for this trailer) — i.e. on the order of `lateralForce`. **Injected directly into `delta`, AFTER the sqrt(N) normalization** — so it is **not** diluted.
- **Config**: `commitDirDeadZoneY` **0.04**, `brakeHoldTimeoutFrames` **90**, `brakeReleaseDebounceFrames` **3**.
- **Conflict role**: this is the "Commit-Injection" the task names — it is added on top of (and can overpower) the already-diluted avoidance + free-lane forces (see §C1).

### L5. Stage D gap-clearing force — self-limiting honest-clearance push — **REMOVED (Commit A)**
- **Code**: [`raceBehavior.js:924-949`](client/src/modules/raceBehavior.js#L924-L949).
- **What**: additive proportional push (on top of L4) that drives a same-lane trailer toward one honest body-width of lateral separation behind its leader.
- **When (three gates)**: (1) `inSameLane`, (2) trailer in `speedBrakeSet` (actively braking, close in `t` — excludes "alongside" pairs), (3) fresh leader `physicalY`. Ramps from `lateralForce × gapForceStrength` at `|yDiff|=0` to 0 at `|yDiff| = 2× honestHalfSpan`.
- **Magnitude**: `gapForce = lateralForce × gapForceStrength × gapRatio`; total L4+L5 capped at `lateralForce × gapForceCap`.
- **Dilution**: **NO** (injected into `delta` post-normalization, then cap-limited).
- **Config**: `gapForceStrength` **1.0**, `gapForceCap` **1.5**.

### L6. OVL-C — sustained-overlap escape (the *leader* side) — **REMOVED (Commit B)**
- **Code**: [`raceBehavior.js:954-1004`](client/src/modules/raceBehavior.js#L954-L1004).
- **What**: targets the **non-same-lane** member (the leader, which Stage D never reaches) of a pair locked in OVERLAP, so both racers separate simultaneously instead of one waiting forever. `!inSameLane` ensures a pair never gets both L5 and L6.
- **When**: requires `priorityExtras`, `currentMode === OVERLAP`, and `currentModeFrameCount ≥ overlapEscapeTimeout` (120). Uses the free-side direction recorded during free-lane, with its own debounce latch.
- **Magnitude**: `escForce = lateralForce × overlapEscapeStrength × gapRatio`, capped at `lateralForce × gapForceCap`.
- **Dilution**: **NO** (post-normalization injection).
- **Config**: `overlapEscapeStrength` **0.25**, `overlapEscapeTimeout` **120**, `gapForceCap` **1.5**.

### L7. Soft repulsion — quadratic boundary cushion
- **Code**: [`raceBehavior.js:1011-1016`](client/src/modules/raceBehavior.js#L1011-L1016).
- **What**: as `|newY|` enters `[comfortThreshold, 1.0)`, a quadratic inward push grows toward the boundary — a soft wall before the hard clamp.
- **When**: `comfortThreshold ≤ |newY| < 1.0`. Applied **after** velocity integration, directly on `newY`.
- **Magnitude**: `−sign(newY) × softRepulsionStrength × pen²`, `pen = (|newY|−comfort)/(1−comfort)`.
- **Config**: `comfortThreshold` **0.7**, `softRepulsionStrength` **0.1**.

### L8. maxLateral clamp / hard boundary
- **Code**: [`raceBehavior.js:1018-1022`](client/src/modules/raceBehavior.js#L1018-L1022).
- **What**: hard clamp of `physicalY` to `±min(maxLateral, 1.0)`. On a boundary hit, `physicalYVelocity` is reset to 0 (kills bounce).
- **Magnitude**: cap = **0.95** (`maxLateral`).
- **Config**: `maxLateral` **0.95**.

### L9. Stuck-mode suppression — sandwich freeze — **REMOVED (Commit A; the Layer-1 "hold" target replaces it)**
- **Code**: [`raceBehavior.js:830-851`](client/src/modules/raceBehavior.js#L830-L851).
- **What**: when a racer is bilaterally sandwiched (pressure near-balanced from both sides AND near-zero velocity), **all** lateral delta is zeroed so it holds position instead of jittering. Resumes the instant space opens.
- **When**: `stuckModeSuppress` true AND `totalPressure > STUCK_P_THRESH` AND `imbalance < STUCK_BALANCE_RATIO` AND `|velocity| < STUCK_VEL_THRESH`. Requires the `rawPos/rawNeg` breakdown to be computed.
- **Magnitude**: sets `delta = 0` (a *gate*, not a force).
- **Constants**: `STUCK_P_THRESH` **0.008**, `STUCK_BALANCE_RATIO` **0.25**, `STUCK_VEL_THRESH` **0.0015** ([`raceBehavior.js:27-29`](client/src/modules/raceBehavior.js#L27-L29)).
- **Config**: `stuckModeSuppress` **true**.
- **Note**: suppresses the *summed physics* delta but runs **before** the Stage B/C/D and OVL-C injections (L4–L6), so those committed/escape forces are **not** suppressed — they can still move a "stuck" racer.

### L10. `lateralScale` — track-width normalization (avoidance only) — **REMOVED (Commit A, with avoidance)**
- **Code**: [`raceBehavior.js:582-585`](client/src/modules/raceBehavior.js#L582-L585), applied at [`raceBehavior.js:728`](client/src/modules/raceBehavior.js#L728).
- **What**: scales avoidance (L2 only) so the pixel-space push is consistent across track widths: `clamp(REFERENCE_TRACK_WIDTH / pairTW, 0.1, 3.0)`.
- **Magnitude**: 1.0 at `pairTW = 98 px` (`REFERENCE_TRACK_WIDTH`); >1 on narrow, <1 on wide tracks.
- **Note**: applies to **avoidance only** — free-lane (L3) and the commit/gap/escape injections (L4–L6) are **not** track-width-scaled. (Possible inconsistency, not a documented bug.)

### L11. Damping — lateral velocity decay
- **Code**: [`raceBehavior.js:1008`](client/src/modules/raceBehavior.js#L1008).
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
- **What**: L2 (avoidance) and L3 (free-lane) are divided by `sqrt(N)` ([`raceBehavior.js:816-824`](client/src/modules/raceBehavior.js#L816-L824)) to prevent start-line stacking explosions. The Stage B/C/D commit injection (L4/L5) and OVL-C (L6) are added to `delta` **after** that normalization ([`raceBehavior.js:921-1004`](client/src/modules/raceBehavior.js#L921-L1004)) at full `lateralForce` magnitude (capped only by `gapForceCap` 1.5).
- **Effect**: in dense fields the diluted physics push can be `lateralForce/√10 ≈ 0.31× lateralForce`, while the commit injection is up to `1.5× lateralForce` — roughly a **5× authority gap**. The committed side wins, and the occupancy-aware free-lane steer is effectively overridden. The task's framing — "Commit-Injection overrides Avoidance + Free-lane" — is confirmed by the code path.

### C2. Home force vs. commit direction at relPos≈0 — the lateral pendulum
- **What**: Home force (L1) always pulls toward `physicalY = 0`. When a same-lane trailer sits near the centerline relative to its leader, `sign(relPos)` flips as home force drags it through center, flipping `naturalDir` and the committed push.
- **Effect**: a slow lateral limit-cycle (pendulum). The `commitDirDeadZoneY` (0.04) band and `pairTieDir` were added specifically to hold a stable side inside the band ([`raceBehavior.js:868-877`](client/src/modules/raceBehavior.js#L868-L877)); the dead-zone was *widened* in the most recent commit (`0d21b4d fix(physics): widen commit-dir dead-zone to break lateral pendulum limit-cycle`). This is a **mitigated but structurally live** conflict.

### C3. Avoidance (trailer-only) vs. free-lane (symmetric) push different members
- **What**: L2 pushes **only the trailer** away from the leader's `physicalY` ([`raceBehavior.js:692-730`](client/src/modules/raceBehavior.js#L692-L730)). L3 pushes **both** members toward their free sides ([`raceBehavior.js:667-674`](client/src/modules/raceBehavior.js#L667-L674)). For the same pair the two forces can point the trailer in **opposite** directions in the same frame (avoidance says "away from leader's Y", free-lane says "toward the open corridor", which may be the leader's side). They are summed, so the net can partially cancel.

### C4. Home force vs. soft repulsion vs. boundary clamp near the edge
- **What**: near `|physicalY| → 0.95`, L1 pulls inward, L7 (soft repulsion) also pushes inward, and L8 hard-clamps + zeroes velocity. These all act inward so they do not *oppose* each other, but L8's velocity reset can strand a racer pinned at the boundary while avoidance keeps trying to push it outward (gate still firing) — a force that is silently discarded every frame.

### C5. Stuck-suppression zeroes physics but not injections
- **What**: L9 sets the summed `delta` (home + avoid/√N + free-lane/√N) to 0 when sandwiched, but the Stage B/C/D and OVL-C injections (L4–L6) are added to `delta` *after* the suppression check inside the same loop ([`raceBehavior.js:838-1004`](client/src/modules/raceBehavior.js#L838-L1004)). A racer the suppressor deems "stuck and should wait" can still be moved by a committed push — the two subsystems disagree about whether the racer should hold.

### C6. Brake-to-match cap vs. Race-Plan controller/area-bonus (longitudinal)
- **What**: A6 caps trailer speed to the leader's advance; A7/A8/A9 simultaneously *boost* the same racer toward an assigned rank/band/catch-up. In OUTCOME phase a racer scripted to advance (trajectoryMult up to 1.10) can be simultaneously brake-capped to ≈leader speed when stuck behind a slower body. The `min()` brake wins on the brake term, but the controller keeps demanding a boost — the scripted finish order can fight the physical brake. (`racersBlockedInOutcome` telemetry exists precisely to measure this — [`racePlanner.js:394, 463`](client/src/modules/racePlanner.js#L394).)

### C7. Drafting boost vs. speed/brake-match (longitudinal)
- **What**: A4 (+4%) accelerates a follower *into* the leader's wake; A5/A6 then brake it back when it closes to body contact. The drafting boost is also fed *into* the brake-match speed estimate ([`raceBehavior.js:526-539`](client/src/modules/raceBehavior.js#L526-L539)), so a drafting trailer both speeds up and raises its own brake cap — a coupled loop that can oscillate (speed up → close → brake → fall back → boost lost → repeat).

---

## E. DEAD / NEAR-DEAD / VESTIGIAL FORCES

| Item | Status | Evidence |
|------|--------|----------|
| `zoneMult` (race-zone brake, A10) | **Dead by default** — `enabled:false` | [`defaults.js:246-251`](client/src/modules/storage/defaults.js#L246-L251) |
| `preOverlapFreeLane` approach-zone steering (part of L3) | **Off by default** (`false`) — free-lane only on true overlap | [`defaults.js:316`](client/src/modules/storage/defaults.js#L313-L316) |
| Legacy home-force path (`homeForceReductionOnOverlap`) | **REMOVED (Commit A)** — the entire home force and `overlapSet`→`homeForceReductionOnOverlap` path is gone | — |
| `tWeight` / `yWeight` / `avoidanceDistance` | **Retired** from browser gate (geometric gate replaced them); kept only for sim-script back-compat | [`defaults.js:318-320, 382-384`](client/src/modules/storage/defaults.js#L318-L320) |
| `speedBrakeYThreshold` | **Retired** from browser brake gate (body-based same-lane filter replaced it); kept for sim/validation compat | [`defaults.js:390-392`](client/src/modules/storage/defaults.js#L390-L392) |
| `_approachLeft/Right`, `_forwardLeft/Right` (Stage A corridor sets) | **Partial** — populated unconditionally, consumed only as a *gate* on the Stage C side-switch, never as a primary direction (the t-blind version deadlocked 91.5% of triggers) | [`raceBehavior.js:439-468, 878-886`](client/src/modules/raceBehavior.js#L439-L468) |
| `overlapEscapeStrength` / `overlapEscapeTimeout` / `gapForceCap` (OVL-C, L6) | **REMOVED (Commit B)** — config keys deleted from `defaults.js` | — |
| Drafting on tight curves | **Intermittently misses** — documented cone-geometry limitation, not fixed | [`raceBehavior.js:1112-1115`](client/src/modules/raceBehavior.js#L1112-L1115) |

---

## F. ONE-PAGE FORCE INVENTORY

### Longitudinal (multiplicative, none sqrt-diluted)
| # | Force | Default | When | File:line |
|---|-------|---------|------|-----------|
| A0 | base speed | duration=60 s anchor | always | raceBaseSpeed.js:29 |
| A1 | speedMultiplier (type) | per-type | always | index.jsx:416 |
| A2 | spreadFactor (luck/re-roll) | ±17.7% spread, 58% re-roll | until 80% race | index.jsx:595,924 |
| A3 | speedBonusMult (row) | 1.0 factor | always | index.jsx:578 |
| A4 | drafting boost | 1.04 | in wake cone | index.jsx:961 |
| A5 | speed brake floor + warmup | 0.945, ramp 3 s open | same-lane close | index.jsx:972 |
| A6 | brake-to-match cap | targets leader speed | faster trailer | raceBehavior.js:549 |
| A7 | trajectoryMult (controller) | [0.85,1.10] | OUTCOME 0.55–0.95 | racePlanner.js:362 |
| A8 | areaBonusMult (band) | +6%…−2% (×2.0) | until 0.75 then fade | racePlanner.js:312 |
| A9 | rubberBandMult (catch-up) | 1.10 | gap>0.003, <0.9 race | index.jsx:886 |
| A10 | zoneMult (race zone) | 0.85 (**off**) | inside zone | raceZones.js:32 |
| A11 | runoutDecay | ×0.97/frame | after finish | index.jsx:995 |
| A12 | BATTLE slowmo (global clock) | 0.5 | BATTLE_ZOOM | index.jsx:824 |

### Lateral (current: Soft Steering spring → repulsion/clamp/damping → Hard Separation)
| # | Force | Default | Status | Member |
|---|-------|---------|--------|--------|
| L0a | Layer 1 — Soft Steering spring | softSteeringStrength 0.03 | **ACTIVE / sole lateral force** | self |
| L0b | Layer 2 — Hard Separation | relaxation 0.15, tol 0.1, warmup 3 s | **ACTIVE / backstop** | both |
| L7 | soft repulsion | 0.1, comfort 0.7 | **ACTIVE** | self |
| L8 | maxLateral clamp | ±0.95 | **ACTIVE** | self |
| L11 | damping | 0.16 | **ACTIVE** | self |
| L1 | home force | — | **REMOVED (A; priority path B)** | — |
| L2 | avoidance | — | **REMOVED (A)** | — |
| L3 | free-lane | — | **REMOVED (A)** | — |
| L4 | Stage B/C commit | — | **REMOVED (A)** | — |
| L5 | Stage D gap force | — | **REMOVED (A)** | — |
| L6 | OVL-C escape | — | **REMOVED (B)** | — |
| L9 | stuck suppression | — | **REMOVED (A)** | — |
| L10 | lateralScale | — | **REMOVED (A)** | — |

---

## G. VERIFICATION NOTES FOR PLAN-CLAUDE

- The **two-frame coupling** (lateral flags written in step 4, read in step 2 next frame) means draft/brake-match flags always lag one physics step. Confirm this is intended before any redesign that assumes same-frame coupling.
- **`priorityExtras` is now `{ currentTs }` only.** The browser passes `{ currentTs: physicsTs }` and the sim passes `{ currentTs: raceTs }`. The single consumer is the **Hard-Separation warmup ramp** (`raceElapsedMs = priorityExtras?.currentTs`). No-clock callers (most unit tests) → warmup runs at full strength.
- **The sqrt-dilution asymmetry and the additive multi-force stack are gone** — conflicts C1–C5 no longer apply. The live lateral model is the single Soft-Steering spring (L0a) plus the Hard-Separation backstop (L0b).
- Any mechanics change here must be mirrored in `scripts/sim-fairness.mjs` (Sim-Browser Parity Rule).
