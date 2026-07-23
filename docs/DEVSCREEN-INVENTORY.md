# DEVSCREEN INVENTORY — the race-dynamics controls, verified at source

**Read-only inventory of what the DevScreen actually renders after the DevScreen consolidation.**
Ground truth: `client/src/screens/DevScreen/sections/DynamicsTuningSection.jsx` (+ `SubCard.jsx` for the
`SubCard` / `SubHeading` shells). Config keys + shipped defaults from
`client/src/modules/storage/defaults.js` (`DEFAULT_RACE_DYNAMICS_CONFIG`, `DEFAULT_BASE_SPEED_CONFIG`,
`DEFAULT_ROW_LAYOUT_CONFIG`, `DEFAULT_FRAME_TIMING_CONFIG`). Every control, label, config key, and reset
`testId` below was cross-checked against the file. Line numbers are best-effort and may drift; the label +
key + testId are the durable identifiers.

> Choreography is now **unconditional** — there is no enable toggle. The old "Director" section (the
> `governorDirector*` / `governorMax*` controls) and the separate "Hero choreography (v4)" section
> (`directorV4*`) are **gone**, along with the `RENAMED_KEY_MIGRATION` shim that once carried their
> persisted values into the `pulk*` / `choreo*` namespace (removed in `b4e1aba` — stale configs now fall
> back to defaults). Only the five PULK-phase controls below remain as UI. See
> [RACE-ACTION.md](RACE-ACTION.md#8-configuration-knobs) for the live knobs.

---

## SECTION ORDER (as rendered — race timeline: global/technical first, then phases in temporal order)

The section renders five `SubCard`s. Cards 2, 3, and 5 hold multiple control groups separated by
`SubHeading`s, each with its own per-group Reset.

### 1. Frame Timing — global / technical (not the race itself)

Card Reset: `reset-frame-timing`. Backing config: `frameTimingConfig`.

| Control | Config key | Shipped default |
|---|---|---|
| dt-Smoothing (EMA-Alpha) | `dtSmoothingAlpha` | (DEFAULT_FRAME_TIMING_CONFIG) |
| Render Interpolation (checkbox) | `renderInterpolation` | true |

Camera/render only — physics always runs fixed 16 ms steps, unaffected by this card.

### 2. Speed — two sub-headings

Card has no card-level Reset. Backing config: `baseSpeedConfig` (range) + `raceDynamicsConfig` (re-roll).

**Sub-heading "Speed Range"** — Reset `reset-speed-range`:

| Control | Config key | Shipped default |
|---|---|---|
| Min Speed | `min` (baseSpeedConfig) | DEFAULT_BASE_SPEED_CONFIG.min |
| Max Speed | `max` (baseSpeedConfig) | DEFAULT_BASE_SPEED_CONFIG.max |

**Sub-heading "Speed Re-Roll"** — Reset `reset-speed-reroll`:

| Control | Config key | Shipped default |
|---|---|---|
| Variation Width (%) | `reRollVariationPercent` | (raceDynamicsConfig) |
| Transition Smoothness (s) | `reRollTransitionDuration` | |
| Trajectory Transition Duration (s) | `trajectoryTransitionDuration` | |
| Re-Roll Frequency (÷ interval) | `reRollIntervalDivisor` | |
| Last Roll Position (%) | `reRollLastPositionPercent` | |

### 3. Bonus — two sub-headings

Card has no card-level Reset. Backing config: `raceDynamicsConfig`.

**Sub-heading "Race Plan Bonus"** — Reset `reset-race-plan-bonus`:

| Control | Config key | Shipped default |
|---|---|---|
| Race Plan Bonus Strength | `racePlanBonusStrengthMultiplier` | 2.0 |
| Bonus active until (% race) | `racePlanBonusTransitionEnd` | 0.75 |
| Bonus fade duration (ms) | `racePlanBonusFadeDuration` | 1500 |
| P-Controller starts (% race) | `racePlanCorridorStart` | 0.55 |
| P-Controller ends (% race) | `racePlanCorridorEnd` | 1.0 |
| Race Plan min duration (s) | `racePlanMinDurationSec` | 30 |

Carries the **timing warning** (`data-testid="race-plan-timing-warning"`): *"These timing values interact
closely with the 8 physics parameters (lateralForce, lateralDamping, etc.) and with the Race Plan bonus/malus
strength. Changing them may require re-tuning the physics parameters. Use the simulation sweep to validate any
changes."* Keep the warning. (Also renders read-only preview text: `race-plan-timeline-hint`.)

**Sub-heading "Phase-Split Bonuses"** — Reset `reset-phase-split`:

| Control | Config key | Shipped default |
|---|---|---|
| Enable phase-split bonuses (master checkbox) | `phaseSplitBonusEnabled` | true |
| Area bonus — EARLY | `areaBonusEarly` | 1.0 |
| Area bonus — POST | `areaBonusPost` | 1.0 |
| Row bonus — EARLY | `rowBonusEarly` | 1 |
| Row bonus — POST | `rowBonusPost` | 1 |

The master switch also gates the PULK-phase area/row bonuses, which live in the PULK Phase card (section 5).

### 4. Start — Row Start layout

Card Reset: `reset-row-start`. Backing config: `rowLayoutConfig`. Summary text: `row-start-summary`.

| Control | Config key | Shipped default |
|---|---|---|
| Row Gap Multiplier | `rowGapMultiplier` | (DEFAULT_ROW_LAYOUT_CONFIG) |
| Speed Bonus Factor | `speedBonusFactor` | |
| Max Capacity Factor | `maxCapacityFactor` | |

### 5. PULK Phase — 5 rotation controls + a "PULK bonuses" sub-heading

The mid-race window `[0.25, PULK end]` where the lead rotation stages the front contest (always live).
Backing config: `raceDynamicsConfig`.

**Card-level controls** — Reset `reset-pulk`:

| Control | Config key | Shipped default |
|---|---|---|
| PULK end / OUTCOME begins (0.25–0.55) | `choreoOutcomeStart` | 0.5 |
| Leader brake | `pulkLeaderBrake` | 0.1 |
| Challenger boost (cap) | `pulkChallengerBoost` | 0.06 |
| Ex-leader drop depth (lengths) | `pulkLeadRotationDropDepthLengths` | 8 |
| Choreography intensity (0–1) | `choreoIntensity` | 0.6 |

**Sub-heading "PULK bonuses"** — Reset `reset-pulk-bonuses`. These act only inside the PULK window; the
area/row pair is gated by the Phase-Split master switch above:

| Control | Config key | Shipped default |
|---|---|---|
| Area bonus — PULK | `areaBonusPulk` | 0 |
| Row bonus — PULK | `rowBonusPulk` | 0 |
| Cohesion bias gain | `pulkBiasGain` | 2.0 |

**Gap-cap re-roll (eye-test)** — added 2026-07-21, in the same Dynamics grid as the "Pack release" toggle.
All default OFF → the shipped game is byte-identical (`gapRerollEnabled` false → the transform passes the
draw through). Changes take effect on the next race (same as the B2-attacker count). See docs/SIM.md.

| Control | Config key | Shipped default | testid |
|---|---|---|---|
| Gap-Reroll (eye-test) toggle | `gapRerollEnabled` | true | `gap-reroll-toggle` |
| Gap-Reroll G (lengths) 0.5–4.0 | `gapRerollThresholdLengths` | 0.75 | — |
| Gap-Reroll strength 0–1.5 | `gapRerollStrength` | 0.5 | — |
| Gap-Reroll mode symmetric/down-only | `gapRerollMode` | 'symmetric' | `gap-reroll-mode` |
| Gap-Reroll dev marker (rendering-only cyan ring) | `gapRerollDevMarker` | false | `gap-reroll-devmarker-toggle` |

---

## PINNED — config keys that EXIST but have NO DevScreen control

These live in `DEFAULT_RACE_DYNAMICS_CONFIG` (and are validated on load in `raceDynamicsConfig.js`) but are
surfaced by no control — pinned to their tuned defaults. They are intentional, not oversights.

| Key | Shipped default | What it pins |
|---|---|---|
| `racePlanPulkStart` | 0.25 | CHAOS→PULK boundary (structural, fixed) |
| `pulkEnvelopeMaxEffect` | 0.12 | realism envelope: outer clamp on \|governorMult−1\| (±12%) |
| `pulkEnvelopeMaxStepPerFrame` | 0.01 | realism envelope: per-frame slew limit |
| `pulkCeilingCap` | true | cap a boosted racer's speed at the natural band max |
| `pulkBoostHeadroom` | 0.1 | additive headroom above band max for the pulk ceiling |
| `pulkFrontPool` | 8 | front-N pool the rotation draws challengers from |
| `pulkLeadRotationAttackerSlots` | 2 | parallel attacker slots |
| `pulkLeadRotationOutsiderMaxReachLengths` | 15 | outsider reachability cap (lengths) |
| `pulkLeadRotationDeadlockTimeoutMs` | 12000 | per-boost safety net |
| `pulkLeadRotationMinHoldMs` | 750 | fresh-P1 minimum hold (anti-flicker) |
| `choreoPackBandStrictness` | 0.5 | loose-pack strictness heroes weave through |
| `choreoReleaseProgress` | 0.97 | B1 heroes released to natural speed for the finish |
| `choreoResolveB2` | 0.8 | B2 band-resolve checkpoint |
| `choreoResolveB3` | 0.7 | B3 band-resolve checkpoint |
| `choreoResolveB4` | 0.65 | B4 band-resolve checkpoint |
| `choreoResolveB5` | 0.6 | B5 band-resolve checkpoint |
| `choreoSuppressChaosBonusB1` | false | Stage-1 B1 chaos-bonus spoiler switch (default OFF) |

---

## REMOVED (must NOT appear anywhere)

- The whole old **Director section** and all `governorDirector*` / `governorMax*` controls.
- The separate **"Hero choreography (v4)"** section and all `directorV4*` keys.
- Any choreography **enable toggle** — choreography is unconditional now.

The `RENAMED_KEY_MIGRATION` shim that once carried persisted values under the old keys forward
(`directorV4*` → `choreo*`, `governorDirector*` / `governorMax*` → `pulk*`) was **removed** (commit
`b4e1aba`); a stale config holding any of those old keys now falls back to defaults rather than migrating.
