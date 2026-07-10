# DEVSCREEN INVENTORY — every control, every hidden value, four buckets

**Read-only inventory. Nothing here is proposed for removal — the owner decides.** Date: 2026-07-10,
`chore/sim-trust`@59d82ee. Built pattern-free: both control-wiring patterns were searched — the call form
`setDynamics('key')`/`setBehavior('key')` AND the table-driven form `key: 'x'` (the one a prior audit
missed, e.g. `key: 'areaBonusPulk'` at DynamicsTuningSection.jsx:1243). Every classification is verified at
source; where a sub-agent's claim was wrong I corrected it and say so.

> **A warning is care, not clutter. A slider that does nothing is a lie with a knob. A value that decides
> the race and hides is worse than either. This document names all three.**

---

## THE FOUR BUCKETS (the deliverable)

### Bucket A — controls a DELETED / REPLACED mechanism (deletion candidate — do NOT delete)

No DevScreen *control* is in this bucket — every live control maps to a live-or-v4-gated mechanism. But
three **config keys** (in `DEFAULT_RACE_BEHAVIOR_CONFIG`, exposed by NO control) drive a mechanism that
was replaced:

| Key | default (defaults.js) | Status — verified |
|---|---|---|
| `tWeight` | 2.0 (:384) | **DEAD in shipped code.** The mixed-unit metric `dT×tWeight + dY×yWeight` was *replaced*; raceBehavior.js:607 is only a comment about the replacement. Read only by diagnostic scripts (`scripts/diag-*.mjs`), never by a shipped force. |
| `yWeight` | 1.0 (:385) | **DEAD in shipped code** — same as `tWeight`. |
| `avoidanceDistance` | 0.18 (:437) | **DEAD in shipped code.** Read only in `scripts/compare-*.mjs` / `diag-*.mjs`; no `client/src` force reads it. |

*(The reverse sub-agent lumped these with live physics params as "deprecated"; I verified they are truly
unread by any shipped force — hence Bucket A, not D.)*

### Bucket B — inert under v4-ON, meaningful under v4-OFF (keep while v4-OFF lives; shown to do nothing)

All verified inert under v4-ON at source (see docs/PHASE-CONTRACT.md for the boundary math):

| Control(s) | key | Shown to do nothing under v4-ON |
|---|---|---|
| **The entire Director section** (~22 controls, DynamicsTuningSection.jsx:782–996) | `governorDirectorEnabled` + all `governor*` | governor pinned off: `GOVERNOR_ON = … && !directorV4Enabled` (sim-fairness.mjs:431,876; browser parity, racePlanner reads governorMult only when governor active) |
| P-Controller starts (:652) | `racePlanCorridorStart` | overwritten by `directorV4OutcomeStart` (racePlanner.js:144) |
| Bonus active until (:605) | `racePlanBonusTransitionEnd` | areaBonus instant-zero at pulkStart under v4 (racePlanner.js:390) |
| Bonus fade duration (:627) | `racePlanBonusFadeDuration` | that fade does not exist under v4 ("functionless", racePlanner.js:389) |
| Cohesion bias gain (:1334) | `pulkBiasGain` | PULK zero-width → `computePulkBiasedTarget` returns rawSample |
| Area bonus — PULK (:1243) | `areaBonusPulk` | PULK branch unreachable (racePlanner.js:459-460) |
| Row bonus — PULK (:1267) | `rowBonusPulk` | PULK branch unreachable (raceStep.js:51) |

The mirror (inert under **v4-OFF**, live under v4-ON): `directorV4Intensity`, `directorV4PackBandStrictness`,
`directorV4OutcomeStart`, `directorV4ReleaseProgress`, `directorV4ResolveB2/B3/B4/B5` — all guarded by
`if (config.directorV4Enabled)` (racePlanner.js:141) / no heroes without v4.

### Bucket C — dangerous, carries a warning (keep the control, KEEP THE WARNING)

Verbatim warnings found (preserve them):

- **Race-Plan timing block** (DynamicsTuningSection.jsx:712-715): *"⚠️ These timing values interact closely
  with the 8 physics parameters (lateralForce, lateralDamping, etc.) and with the Race Plan bonus/malus
  strength. Changing them may require re-tuning the physics parameters. Use the simulation sweep to validate
  any changes."*
- `softSteeringStrength` (BehaviorTuningSection.jsx:641): *"…Not calibrated — sweep first."*
- `avoidanceBufferPct` (:346): *"…Tune live; re-run a sweep after settling on a value."*
- `maxLateralSpeedPerStep` (:513): *"…Sweet-spot is tuned with the governor sweep."*
- `draftingBoost` (:242): *"…Higher = stronger boost makes overtaking easier but can cause whole packs of
  racers to bunch together…"*
- `lookBeforeBrakeReengageTMultiplier` (:487): *"…Must sit between 1.0 and the Speed Brake zone multiplier
  (1.5)."*

### Bucket D — decides the race, INVISIBLE (should be exposed) — the important one

Live in a shipped force, reachable from NO DevScreen control. Verified at source:

| Value | default · file:line | What it decides | Verified |
|---|---|---|---|
| `gain` | 2.0 · racePlanner.js:73 | the servo's proportional gain — `mult = clamp(1 + gain·error/nActive, …)` (racePlanner.js:579). **The value found to be mis-scaled, and the one the owner cannot touch.** | :579 |
| `maxMult` / `minMult` | 1.10 / 0.85 · racePlanner.js:74-75 | the servo clamp — MORE speed authority (−15%/+10%) than the ±8.1% re-roll band | :579 |
| `bandStrictness` | 1.0 · racePlanner.js:76 | rank-vs-band blend of the servo error (racePlanner.js:577) — note: under v4 the pack uses `directorV4PackBandStrictness` (exposed) instead | :559-563,577 |
| `stochasticNoise` | 0.0008 · racePlanner.js:80 (`DEFAULT_STOCHASTIC_NOISE`) | per-step servo noise added into `rawTarget` (racePlanner.js:578) | :578 |
| `BAND_EDGES` | [5,15,25,40] · racePlanner.js:37 | the fairness band structure itself (B1..B5); the gate is defined against it | many |
| `AREA_BONUS_BASE_DELTAS` | B1 +0.03 … B5 −0.01 · racePlanner.js:~85 | the per-band areaBonus deltas (before `bonusStrengthMultiplier`) | :458-461 |
| `pulkStart` / `pulkEnd` | 0.25 / 0.5 · racePlanner.js:59-60 | the CHAOS/PULK phase boundaries (no DevScreen control — see PHASE-CONTRACT.md) | getPhase |
| `speedBrakeYThreshold` | 0.18 · defaults.js:445 | **LIVE** brake contact-width fallback (raceBehavior.js:433) — *the reverse sub-agent wrongly called this deprecated; it is live and invisible* | :433 |
| `laneTargetEaseMs` | 200 · defaults.js:525 | lane-target easing (raceBehavior.js:755,804) | :755 |
| `lateralVelocityResetSoftness` | 0.5 · defaults.js:526 | lateral-velocity reset (raceBehavior.js:758) | :758 |
| `directorV4SuppressChaosBonusB1` | false · defaults.js:320 | v4 B1-pool chaos-bonus spoiler switch (racePlanner.js:273; sim-fairness.mjs:2733) — live under v4, no control | :273 |
| Physics-sweep params | `lateralForce` 0.0114, `lateralDamping` 0.16, `speedBrakeFactor` 0.945, `speedBrakeTMultiplier` 1.5, `brakeMatchActivation*`, `speedMatch*`, `brakeHold*`, `hardSeparation*` | live avoidance/brake forces (raceBehavior.js), invisible by design (sweep-tuned) — listed so "invisible" is a deliberate choice, not an oversight | raceBehavior.js |
| Hardcoded internals | `NATURALNESS_CEILING` 1.2 (raceGovernor.js:38), `MIN_FADE_SPAN` 0.05 (raceGovernor.js:74), `DEFAULT_CORRIDOR_CONFIG` margins (racePlanner.js), PRNG salts | hard leitplanken / geometry / determinism — intentionally not knobs | — |

---

## THE REACHABLE-CONTROL MAP (by section; every control found, both patterns)

Race-affecting sections traced to the force; display/camera sections summarised (they do not touch the
t-update). All file:lines from `client/src/screens/DevScreen/`.

### DynamicsTuningSection.jsx — race dynamics (all → `raceDynamicsConfig` unless noted)
- **Speed range** (→`baseSpeedConfig`): `min` (:236), `max` (:257) — the ±8.1% spread band ends.
- **Row start** (→`rowLayoutConfig`): `rowGapMultiplier` (:333), `speedBonusFactor` (:355), `maxCapacityFactor` (:377) — start layout + row catch-up bonus.
- **Speed re-roll**: `reRollVariationPercent` (:425), `reRollTransitionDuration` (:447), `trajectoryTransitionDuration` (:469), `reRollIntervalDivisor` (:491), `reRollLastPositionPercent` (:513) — feed `spreadFactor`→`baseSpeed` (raceStep.js) + the servo transition. LIVE both arms.
- **Race Plan bonus/timing**: `racePlanBonusStrengthMultiplier` (:583), `racePlanBonusTransitionEnd` (:605, **Bucket B**), `racePlanBonusFadeDuration` (:627, **Bucket B**), `racePlanCorridorStart` (:652, **Bucket B**), `racePlanCorridorEnd` (:677), `racePlanMinDurationSec` (:707). **Warning at :712 (Bucket C).**
- **Director** (:782–996): `governorDirectorEnabled` (:782) + ~21 table-driven `governor*` keys (:792–996). **All Bucket B (inert under v4-ON).**
- **Hero choreography (v4)**: `directorV4Enabled` (:1065), `directorV4Intensity` (:1091), `directorV4PackBandStrictness` (:1113), `directorV4OutcomeStart` (:1135), `directorV4ReleaseProgress` (:1157), `directorV4ResolveB2/B3/B4/B5` (:1163–1178). LIVE under v4-ON only.
- **Phase-split**: `phaseSplitBonusEnabled` (:1225), `areaBonusEarly` (:1235), `areaBonusPulk` (:1243, **Bucket B**), `areaBonusPost` (:1251), `rowBonusEarly` (:1259), `rowBonusPulk` (:1267, **Bucket B**), `rowBonusPost` (:1275) — feed the areaBonus split (racePlanner.js:458) + row envelope (raceStep.js).
- **PULK cohesion**: `pulkBiasGain` (:1334, **Bucket B**).
- **Frame timing** (→`frameTimingConfig`): `dtSmoothingAlpha` (:1365), `renderInterpolation` (:1402) — camera/render only, physics runs fixed 16 ms.

### BehaviorTuningSection.jsx — avoidance/drafting (all → `raceBehaviorConfig`)
`enabled` (:710), `startSpreadRange` (:139), `runoutZone` (:161, **note O1** — sim hardcodes 0.05, see FORCE-PARITY.md), drafting `draftingMaxDistance/ConeAngle/Boost` (:196/219/242, Boost has the pack-bunching warning), comfort `comfortThreshold/softRepulsionStrength` (:288/311), avoidance `avoidanceBufferPct` (:346, sweep warning) `maxLateral` (:369), `avoidanceWarmupMs` (:404), look-before-brake `lookBeforeBrake*` (:436–584), `maxLateralSpeedPerStep` (:513, sweep warning), soft-steering `softSteeringSymmetric/Strength/ClearancePct/HysteresisY` (:616/641/667/693, Strength "not calibrated"). All LIVE both arms (the lateral layer is v4-independent). Traced to `raceBehavior.js` / `computeEffectiveBrakeFactor`.

### Display/camera sections (do NOT affect the race t-update — camera + UI only)
- **CameraAdvancedSection.jsx** — ~70 `cameraConfig` controls (BATTLE/LEAD_CHANGE/COMEBACK triggers, weights, zoom profiles, photo-finish, diagnostics toggles). Camera director only.
- **AutoScaleSection.jsx** — 5 `autoScaleConfig` (sprite auto-scale).
- **RaceDefaults.jsx** — 8 `raceDefaults` (duration, winners, max players, countdown, auto-advance, sound).
- **NameTagVisibilitySection.jsx** — `tagVisibleMaxCount` (:85).
- **SpriteSizeRangeSection.jsx** — `maxTargetScreenPx` (:86).

*(Full per-control labels + tooltips are preserved in source; the DevScreen forward inventory captured every
one — this map cites the wiring line for each.)*

---

## Note on method

Two sub-agents produced the raw inventory; I verified every classification myself. Corrections made to their
output: (1) `speedBrakeYThreshold` is LIVE (raceBehavior.js:433), not deprecated → Bucket D; (2) `tWeight`/
`yWeight`/`avoidanceDistance` are truly dead in shipped code (only comments + diag scripts) → Bucket A;
(3) a self-contradiction on `softSteeringStrength`/`softSteeringClearancePct` resolved — both live +
reachable. **Propose nothing for removal — the owner decides. This is the map.**
