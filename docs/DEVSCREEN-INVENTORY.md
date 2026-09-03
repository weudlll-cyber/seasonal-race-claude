# DEVSCREEN INVENTORY — the race-dynamics controls, verified at source

**Owns:** what the Dev Panel actually renders, verified against source.

**Read-only inventory of what the DevScreen actually renders.** Rebuilt completely against
`client/src/screens/DevScreen/sections/DynamicsTuningSection.jsx` as rendered (dead-mechanisms cleanup,
2026-07-23; re-checked after the DevScreen reorg the same day) — every control in the file appears below,
and nothing below is absent from the file.
Ground truth for the shells: `SubCard.jsx` (`SubCard` / `SubHeading`). Config keys + shipped defaults from
`client/src/modules/storage/defaults.js` (`DEFAULT_RACE_DYNAMICS_CONFIG`, `DEFAULT_BASE_SPEED_CONFIG`,
`DEFAULT_ROW_LAYOUT_CONFIG`, `DEFAULT_FRAME_TIMING_CONFIG`). The label + key + testId are the durable
identifiers; line numbers are deliberately not recorded.

> Choreography is **unconditional** — there is no enable toggle. The old "Director" section (the
> `governorDirector*` / `governorMax*` controls) and the separate "Hero choreography (v4)" section
> (`directorV4*`) are **gone**, along with the `RENAMED_KEY_MIGRATION` shim that once carried their
> persisted values into the `pulk*` / `choreo*` namespace (removed in `b4e1aba` — stale configs now fall
> back to defaults). See [RACE-ACTION.md](RACE-ACTION.md#8-configuration-knobs) for the live knobs.

---

## SECTION ORDER (as rendered — race timeline: global/technical first, then phases in temporal order)

The section renders five `SubCard`s. Cards 2, 3, and 5 hold multiple control groups separated by
`SubHeading`s, each with its own per-group Reset.

### 0. "Reset All Defaults" — the Race Tuning card-level button

The **Race Tuning** card (`RaceTuningSection.jsx`) wraps DynamicsTuningSection + BehaviorTuningSection and
carries one card-level **"Reset All Defaults"** button. Its semantics are aligned with the HUD badge's
race / cosmetic split (`configFingerprint.js`): it restores **exactly the five RACE-RELEVANT config
blocks** — `raceDynamicsConfig`, `raceBehaviorConfig`, `rowLayoutConfig`, `baseSpeedConfig`,
`autoScaleConfig` — to their shipped defaults, and **deliberately leaves the two COSMETIC blocks
(`cameraConfig`, `frameTimingConfig`) untouched** so an operator's dev camera overlays / frame-timing
tweaks survive a race-tuning reset. The reset targets are read from the single source of truth
`raceRelevantReset.js` (`RACE_RELEVANT_DEFAULTS`); `autoScaleConfig` lives in its own Auto-Scale tab and is
persisted directly by the master reset. Invariant pinned in `raceRelevantReset.test.js`: after this reset
`splitConfigDiffs(...).race.count === 0` — so the badge reads quiet grey "0 race" by construction, and the
button and the badge can never disagree. (Before 2026-07-24 the button reset `frameTimingConfig` — a
cosmetic block — and missed `autoScaleConfig` — a race block; both were corrected in the speed-150
re-baseline arc.)

### 1. Frame Timing — global / technical (not the race itself)

Card Reset: `reset-frame-timing`. Backing config: `frameTimingConfig`. COSMETIC — the card-level "Reset All
Defaults" does **not** touch it; only this per-card `reset-frame-timing` link resets it.

| Control                         | Config key            | Shipped default |
| ------------------------------- | --------------------- | --------------- |
| dt-Smoothing (EMA-Alpha)        | `dtSmoothingAlpha`    | 0.7             |
| Render Interpolation (checkbox) | `renderInterpolation` | true            |

Camera/render only — physics always runs fixed 16 ms steps, unaffected by this card.

### 2. Speed — four sub-headings

Card has no card-level Reset. Backing config: `baseSpeedConfig` (normal speed + range) +
`raceDynamicsConfig` (re-roll).

**Sub-heading "Normal Track Speed"** — Reset `reset-normal-speed` — ADDED by the speed/duration ship:

| Control             | Config key                              | Shipped default | Test id              |
| ------------------- | --------------------------------------- | --------------- | -------------------- |
| Normal Speed (px/s) | `normalSpeedPxPerSec` (baseSpeedConfig) | 150             | `normal-speed-input` |

THE pace of the game: world pixels a normal racer covers per second, identical for every track and
every racer class. Every race duration is derived from it — closed races last
`laps × pathLengthPx / normalSpeed`, and an open track's finish line is where a normal racer is
after the chosen time (see `client/src/modules/durationModel.js` and
[SIM.md](SIM.md) → _THE canonical speed/duration model_). Changing it rescales every derived
duration in the game at once and nothing else. 150 px/s is the owner's shipped pick (a calmer,
more readable pace; the earlier provisional 225 reproduced the pre-ship browser pace to within 1%).
See [reports/parity/REBASELINE.md](../reports/parity/REBASELINE.md) for the speed-150 baseline.

**Sub-heading "Speed Range"** — Reset `reset-speed-range`:

| Control   | Config key              | Shipped default |
| --------- | ----------------------- | --------------- |
| Min Speed | `min` (baseSpeedConfig) | 0.00096         |
| Max Speed | `max` (baseSpeedConfig) | 0.00113         |

These are the **spread only** — how far individual racers deviate from the normal speed. They no
longer set the absolute pace (that is Normal Track Speed above), and they no longer enter the pace
via an N-calibrated expected-minimum factor: the pace is defined by the mean racer, and the spread
widens the finishing field around it.

**Sub-heading "Speed Re-Roll"** — Reset `reset-speed-reroll`:

| Control                            | Config key                     | Shipped default |
| ---------------------------------- | ------------------------------ | --------------- |
| Variation Width (%)                | `reRollVariationPercent`       | 75              |
| Transition Smoothness (s)          | `reRollTransitionDuration`     | 3.0             |
| Trajectory Transition Duration (s) | `trajectoryTransitionDuration` | 1.0             |
| Re-Roll Frequency (÷ interval)     | `reRollIntervalDivisor`        | 10              |
| Last Roll Position (%)             | `reRollLastPositionPercent`    | 95              |

Also renders a read-only preview (`data-testid="reroll-preview"`).

**Sub-heading "Gap-Cap Re-Roll"** — Reset `reset-gap-reroll`. Moved here from the PULK card in the
DevScreen reorg (2026-07-23): it loads the very dice the Speed Re-Roll block above schedules, so this is
where it is findable. The shipped cohesion mechanism (default ON since 2026-07-22, retuned 2026-07-23 to
G = 0.75 / strength = 0.5, then **flipped 2026-07-26 to the confirmed candidate G = 0.5 / strength = 1.0**
after the ten-track confirm gate — see [reports/parity/GS-CONFIRM-GATE.md](../reports/parity/GS-CONFIRM-GATE.md));
turning the toggle OFF restores the pre-feature game byte-identically, which is the world every committed
baseline was measured in. Changes take effect on the next race. See [SIM.md](SIM.md).

| Control                                          | Config key                  | Shipped default | testid                        |
| ------------------------------------------------ | --------------------------- | --------------- | ----------------------------- |
| Gap-Reroll enabled (checkbox)                    | `gapRerollEnabled`          | true            | `gap-reroll-toggle`           |
| Gap-Reroll G (lengths) 0.5–4.0                   | `gapRerollThresholdLengths` | 0.5             | —                             |
| Gap-Reroll strength 0–1.5                        | `gapRerollStrength`         | 1.0             | —                             |
| Gap-Reroll mode symmetric/down-only              | `gapRerollMode`             | 'symmetric'     | `gap-reroll-mode`             |
| Gap-Reroll dev marker (rendering-only cyan ring) | `gapRerollDevMarker`        | false           | `gap-reroll-devmarker-toggle` |

### 3. Bonus — two sub-headings

Card has no card-level Reset. Backing config: `raceDynamicsConfig`.

**Sub-heading "Race Plan Bonus"** — Reset `reset-race-plan-bonus`:

| Control                      | Config key                        | Shipped default |
| ---------------------------- | --------------------------------- | --------------- |
| Race Plan Bonus Strength     | `racePlanBonusStrengthMultiplier` | 2.0             |
| Bonus active until (% race)  | `racePlanBonusTransitionEnd`      | 0.75            |
| Bonus fade duration (ms)     | `racePlanBonusFadeDuration`       | 1500            |
| P-Controller starts (% race) | `racePlanCorridorStart`           | 0.55            |
| P-Controller ends (% race)   | `racePlanCorridorEnd`             | 1.0             |
| Race Plan min duration (s)   | `racePlanMinDurationSec`          | 30              |

Carries the **timing warning** (`data-testid="race-plan-timing-warning"`): _"These timing values interact
closely with the 8 physics parameters (lateralForce, lateralDamping, etc.) and with the Race Plan bonus/malus
strength. Changing them may require re-tuning the physics parameters. Use the simulation sweep to validate any
changes."_ Keep the warning. (Also renders read-only preview text: `race-plan-timeline-hint`.)

**Sub-heading "Phase-Split Bonuses"** — Reset `reset-phase-split`:

| Control                                      | Config key               | Shipped default |
| -------------------------------------------- | ------------------------ | --------------- |
| Enable phase-split bonuses (master checkbox) | `phaseSplitBonusEnabled` | true            |
| Area bonus — EARLY                           | `areaBonusEarly`         | 1.0             |
| Area bonus — POST                            | `areaBonusPost`          | 1.0             |
| Row bonus — EARLY                            | `rowBonusEarly`          | 1               |
| Row bonus — POST                             | `rowBonusPost`           | 1               |

The master switch also gates the PULK-phase area/row bonuses, which live in the PULK Phase card (section 5).

### 4. Start — Row Start layout

Card Reset: `reset-row-start`. Backing config: `rowLayoutConfig`. Summary text: `row-start-summary`.

| Control             | Config key          | Shipped default |
| ------------------- | ------------------- | --------------- |
| Row Gap Multiplier  | `rowGapMultiplier`  | 1.5             |
| Speed Bonus Factor  | `speedBonusFactor`  | 1.0             |
| Max Capacity Factor | `maxCapacityFactor` | 0.3             |

### 5. PULK Phase — card controls, then "PULK bonuses" and "B2 Attackers" sub-headings

The mid-race window `[0.15, PULK end]` where the lead rotation stages the front contest (always live).
Backing config: `raceDynamicsConfig`. Groups run in temporal order: the card controls set the window and
its rotation, the PULK bonuses act inside it, and the B2 attackers resolve last (released into OUTCOME).

**Card-level controls** — Reset `reset-pulk` (resets exactly these six keys):

| Control                               | Config key                         | Shipped default |
| ------------------------------------- | ---------------------------------- | --------------- |
| PULK begin / CHAOS ends (0.10–0.60)   | `racePlanPulkStart`                | 0.15            |
| PULK end / OUTCOME begins (0.25–0.60) | `choreoOutcomeStart`               | 0.6             |
| Leader brake                          | `pulkLeaderBrake`                  | 0.1             |
| Challenger boost (cap)                | `pulkChallengerBoost`              | 0.06            |
| Ex-leader drop depth (lengths)        | `pulkLeadRotationDropDepthLengths` | 8               |
| Choreography intensity (0–1)          | `choreoIntensity`                  | 0.6             |

`racePlanPulkStart` (**PULK begin**, the CHAOS→PULK boundary) is now a surfaced control (HYGIENE-1): input
widget clamp [0.10, 0.60], validated config range **[0.10, 0.60]** (per the measured chain-world plateau);
shipped default **0.15** (COMBO15). It is part of the `raceDynamics` block, so the master **Reset All
Defaults** restores it and the HUD config badge counts it as race-relevant. The PULK-end control's input
widget clamp is **[0.25, 0.60]**, which is its validated config range. *(CONTROL-BOUNDS-1, 2026-09-03: the
widget clamped at 0.55 while the shipped value is 0.60, so the control could not display or restore what
the game runs. The two numbers were recorded separately here — "the clamp" and "the validated range" — and
that separation is what let them disagree for 47 days: a widget clamp that is not the validated range is a
defect, not a second fact, so they are now stated once. Both surfaced controls in this card follow the same
rule.)*

**Sub-heading "PULK bonuses"** — Reset `reset-pulk-bonuses`. These act only inside the PULK window; the
area/row pair is gated by the Phase-Split master switch above:

| Control            | Config key      | Shipped default |
| ------------------ | --------------- | --------------- |
| Area bonus — PULK  | `areaBonusPulk` | 0               |
| Row bonus — PULK   | `rowBonusPulk`  | 0               |
| Cohesion bias gain | `pulkBiasGain`  | 2.0             |

**Sub-heading "B2 Attackers"** — Reset `reset-b2-attackers`. Grouped in the DevScreen reorg (2026-07-23):
the cast count and the release hysteresis are one mechanism, and they belong together rather than loose in
the card grid. Last group in the card because attackers resolve latest — cast at the choreo boundary,
peak mid-race, released into OUTCOME.

| Control                               | Config key             | Shipped default |
| ------------------------------------- | ---------------------- | --------------- |
| B2-attacker count (0–5)               | `b2AttackHeroes`       | 3               |
| Attacker re-steer threshold (0.5–3.0) | `packReSteerThreshold` | 1.0             |

`b2AttackHeroes` is SHIPPED ON at 3 (0 casts none and restores the pre-feature game).
`packReSteerThreshold` is the release hysteresis for a FREED attacker: how far past its band edge it may
drift before the servo re-engages at full pinning.

---

## PINNED — config keys that EXIST but have NO DevScreen control

These live in `DEFAULT_RACE_DYNAMICS_CONFIG` (and are validated on load in `raceDynamicsConfig.js`) but are
surfaced by no control — pinned to their tuned defaults. They are intentional, not oversights.

| Key                                       | Shipped default        | What it pins                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chaosSteer`                              | true                   | COMBO15: continuous gentle chaos-phase pull toward each racer's drawn band                                                                                                                                                                                                                                                                                                                                                                                             |
| `chaosSteerGain`                          | 0.06                   | COMBO15: chaos-steer gain                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `bandBias`                                | true                   | COMBO15: band-aware re-roll DRAW bias (the fair-arrival win)                                                                                                                                                                                                                                                                                                                                                                                                           |
| `bandBiasR`                               | 0.6                    | COMBO15: progress from which the draw bias acts                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `bandBiasGain`                            | 0.1                    | COMBO15: draw-bias gain                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `pulkEnvelopeMaxEffect`                   | 0.12                   | realism envelope: outer clamp on \|governorMult−1\| (±12%)                                                                                                                                                                                                                                                                                                                                                                                                             |
| `pulkEnvelopeMaxStepPerFrame`             | 0.01                   | realism envelope: per-frame slew limit                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `pulkCeilingCap`                          | true                   | cap a boosted racer's speed at the natural band max                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `pulkBoostHeadroom`                       | 0.1                    | additive headroom above band max for the pulk ceiling                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `pulkFrontPool`                           | 8                      | front-N pool the rotation draws challengers from                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `pulkLeadRotationAttackerSlots`           | 2                      | parallel attacker slots                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `pulkLeadRotationOutsiderMaxReachLengths` | 15                     | outsider reachability cap (lengths)                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `pulkLeadRotationDeadlockTimeoutMs`       | 12000                  | per-boost safety net                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `pulkLeadRotationMinHoldMs`               | 750                    | fresh-P1 minimum hold (anti-flicker)                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `choreoPackBandStrictness`                | 0.5                    | loose-pack strictness heroes weave through                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `choreoReleaseProgress`                   | 0.97                   | B1 heroes released to natural speed for the finish                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `choreoResolveB2`                         | 0.8                    | B2 band-resolve checkpoint                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `choreoResolveB3`                         | 0.7                    | B3 band-resolve checkpoint                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `choreoResolveB4`                         | 0.65                   | B4 band-resolve checkpoint                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `choreoResolveB5`                         | 0.6                    | B5 band-resolve checkpoint                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `choreoSuppressChaosBonusB1`              | false                  | Stage-1 B1 chaos-bonus spoiler switch (default OFF)                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `contestWindowStart`                      | 0.8                    | front-act measurement window start (read by the sim's front-battle observer)                                                                                                                                                                                                                                                                                                                                                                                           |
| `enableRowEnvSmooth`                      | true                   | eases the start-row speed step at the PULK→OUTCOME boundary over 1 s instead of stepping. Had an A/B checkbox while the easing was being compared against the instant step; **retired to pinned in the DevScreen reorg (2026-07-23)** — the comparison was settled by the rowenv ship (measured fairness-neutral, flipped to default ON), so the toggle was only an invitation to re-open a closed question. Key and behaviour unchanged; `RaceScreen` still reads it. |
| `b2AttackPeakRank`                        | 5                      | attacker climb target                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `b2AttackFinalRank`                       | 7                      | attacker fall target (shapes the fall slope under band-arrival)                                                                                                                                                                                                                                                                                                                                                                                                        |
| `b2AttackProgress`                        | {start: 0.4, end: 0.7} | attacker peak-timing jitter window                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `b2AttackResolveProgress`                 | 0.85                   | attacker resolve checkpoint (hero-privilege, later than B2's 0.80)                                                                                                                                                                                                                                                                                                                                                                                                     |
| `b2AttackBandArrival`                     | true                   | release model: free on B2 re-entry (vs fixed-final)                                                                                                                                                                                                                                                                                                                                                                                                                    |

---

## REMOVED (must NOT appear anywhere)

- The whole old **Director section** and all `governorDirector*` / `governorMax*` controls.
- The separate **"Hero choreography (v4)"** section and all `directorV4*` keys.
- Any choreography **enable toggle** — choreography is unconditional now.
- The **"Pack release (eye-test)"** checkbox and its config key — removed in the dead-mechanisms cleanup
  (2026-07-23). The mechanism it gated was measured, shelved, and then deleted. `packReSteerThreshold`
  survives because the live B2-attacker release reads it, and its label/tooltip now say so.
- The **B1 lead rotation** config family and the **universal band-arrival** key — sim-only, never had a
  DevScreen control, removed entirely in the same cleanup.

Deliberately not named here: the retired key names. Git history is the archive — `git show
pre/dead-mechanisms-cleanup` has them, and repeating them in live docs is how a deleted mechanism gets
half-resurrected.

The `RENAMED_KEY_MIGRATION` shim that once carried persisted values under the old keys forward
(`directorV4*` → `choreo*`, `governorDirector*` / `governorMax*` → `pulk*`) was **removed** (commit
`b4e1aba`); a stale config holding any of those old keys now falls back to defaults rather than migrating.
Removed keys are NOT rejected on load: `loadRaceDynamicsConfig()` merges stored over defaults and validates
only known keys, so a persisted config still carrying a retired key stays VALID — the owner's other
settings survive (no silent reset to defaults) and the retired key rides along inertly, because nothing
reads it any more. Pinned by a test in `raceDynamicsConfig.test.js`.
