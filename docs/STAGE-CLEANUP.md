# Race-Dynamics Stage Cleanup

Goal: reduce the race-dynamics source to the WINNING mechanism only, in verified reversible
stages. The winning mechanism = re-roll (speed engine) + two-sided contest smart-boost
(leaderBrake / challengerBoost / frontPool / boostOncePerRace / lingerBrake / ceilingCap) +
phase-split bonuses (areaBonus/rowBonus Early/Pulk/Post) + the PULK cohesion bias +
the OUTCOME P-controller. Everything else (rubber-band, surge, governor tail-lift,
show-target) is dead weight and is being removed.

## Byte-identical baseline (Stage 0)

The winning config is the `pulkActionPreview` set (RaceScreen/index.jsx). Every later stage
must reproduce this exact race output, because every removed mechanism is OFF in the winning
config — so removal must not change behaviour.

- Verifier: `scratchpad/verify-winning.sh` runs the winning config (searound/manta/40 closed +
  mountainstreet/boarder/60 open, dur 60, 6 races, seed 1) and SHA-256s the deterministic
  `combos` array of the two strip-metrics dumps (NOT `meta`, which echoes config keys that
  legitimately disappear as mechanisms are removed).
- **Reference fingerprint:** `72cfbdb431a1760862fa4423819834cb6d57c7861e484e6f59e8d4e2f52db258`
- **Test baseline:** 152 files / 3067 tests green (`cd client && npx vitest run`).
- Git anchor tag: `pre/cleanup` (pushed to origin).

## Stage 0 dependency map

For each mechanism to remove, classify: (a) used by the winning config, (b) shared dependency
of something used (must survive / be extracted), (c) truly dead.

### RUBBER-BAND (`raceRubberBand.js`)
- `applyRubberBand`, `rubberBandTargetMult` — (c) truly dead. Off in the winning config
  (`rubberBandConfig.enabled=false`). Remove the mechanism, `DEFAULT_RUBBER_BAND_CONFIG`,
  all `rubberBand*` keys, `r.rubberBandMult*` state, the t-update factor, DevScreen controls,
  `RubberBandDiagHUD`, `showRubberBandDiag`.
- **`computeMedianT`** — (b) SHARED DEPENDENCY. Imported by `raceGovernor.js` (the surviving
  director) and the browser/sim loops to compute the field median once per step. MUST survive.
  Relocate it out of `raceRubberBand.js` (e.g. into `raceGovernor.js` or a small shared util)
  before deleting the file. Stage 1.

### SURGE (`pulkSurge*`)
- Surge pass in `racePlanner.update` + `surgeRacerIds` selection + `pulkSurge*` config +
  `pulkBrakeExemptStrength` + `r.pulkSurgeMult*` state + `pulkSurgeEnabled` gating — (c) dead.
- **`computePulkBiasedTarget` + `pulkBiasGain`** (the "surge-off fallback" cohesion bias) —
  (a) KEEP and PROMOTE to the primary, always-on field-cohesion mechanism. Currently gated
  behind `!pulkSurgeEnabled` in the loop (index.jsx:1156); with surge gone it becomes
  unconditional. Stage 2.

### SHOW-TARGET (`showTargetMode`, Rank-Proto)
- `computeShowRanks`, `showStreamKey`, `actionToShowLevers`, `SHOW_SEED_XOR`,
  `DEFAULT_SHOW_*`, the show branch in `racePlanner.update` (~L462 areaBonus decouple + the
  pre-OUTCOME show controller), `_show*` plan fields, `showTargetMode/showEngagement/
  showFrontBand/showWanderDwell/showFrontConcentration` config, sim `SHOW_TARGET_MODE`,
  DevScreen controls — (c) truly dead (a proven dead end). Stage 3.

### GOVERNOR TAIL-LIFT (Stage-C field governor)
- Tail-lift + shuffle: `governorEnabled/Drama/K0/Length*/RampWidth/A*/Frequency` config,
  `governorRestoringForce`, `governorShufflePhase`, `governorActionToParams`, the
  `cohesion + shuffle` block in `applyGovernor` — (c) dead (tail-lift off in winning config).
- **Shared realism envelope — (b) MUST survive / be extracted** (the surviving director uses
  all of it):
  - `governorMaxEffect` (±12% clamp) + `governorMaxStepPerFrame` (slew) — the director's
    `target` clamp + per-frame rate-limit (raceGovernor.js ~L508/L518).
  - `governorPhaseWeight` / `governorFadeStart` + `getPhaseFractions` (racePlanner) — the
    phase-weight fade `w` and `directorCutoff` the director rides.
  - `arcT`, `lenScale` (pathLengthPx / meanBodyLen), `directorStreamKey`, `computeMedianT`.
- **DIRECTOR / smart-boost — (a) KEEP (the winning mechanism):** `smartFeaturedPick`,
  two-sided contest (`directorLeaderBrake`, `directorChallengerBoost`), `directorFrontPool`,
  `directorBoostOncePerRace`, `directorLingerBrake`, `directorCeilingCap`,
  `directorPullStrength` (challenger-boost gain — NOT dead), `directorDwell`,
  `directorSettling` (gates the smart pick's cutoff).
- Old-director knobs to review in Stage 4:
  - `directorAnchorOffset` — used ONLY by the legacy one-sided anchor pull (dead in winning
    config, which is two-sided). Candidate for removal.
  - `directorCastSize` + `directorFeaturedSet` — the legacy whole-field featured set (dead;
    winning config is smart front-pool). `directorDwell` survives (smart pick uses it);
    `castSize`/`directorFeaturedSet` are removal candidates — keep only if still wired.
  - `directorPullStrength`, `directorDwell`, `directorSettling` — SURVIVE (smart path).

## Per-stage log

| Stage | HEAD | Removed | Fingerprint match | Tests | Kept-because-shared |
|-------|------|---------|-------------------|-------|---------------------|
| 0 | — | — (map + baseline only) | ref `72cfbdb4…` | 3067 ✓ | — |
| 1 | ec06b92 | `raceRubberBand.js`, `rubberBandConfig.js`, `RubberBandSection`, `RubberBandDiagHUD`, `DEFAULT_RUBBER_BAND_CONFIG`, `RUBBER_BAND_CONFIG` key, `showRubberBandDiag`, all `r.rubberBandMult*` state + t-update factor, sim rubber-band + telemetry, DevScreen/HUD controls, 2 test files | `72cfbdb4…` ✓ | 3040 ✓ | `computeMedianT` relocated into `raceGovernor.js` (director's field-median source) |
| 2 | e1b376e | `pulkSurge*` selection + update pass + config keys + `pulkBrakeExemptStrength`, `surgeRacerIds`, `r.pulkSurgeMult*` state + t-update factor, surge telemetry, sim surge path, config validation + DevScreen "PULK Surge" SubCard, surge test cases | `72cfbdb4…` ✓ | 3031 ✓ | `computePulkBiasedTarget` + `pulkBiasGain` PROMOTED from surge-off fallback to the always-on PULK cohesion mechanism (gate `!pulkSurgeEnabled` removed → unconditional) |
| 3 | (this commit) | show-target: `computeShowRanks`, `showStreamKey`, `actionToShowLevers`, `SHOW_SEED_XOR`, `DEFAULT_SHOW_*`, `_show*` plan fields, the show branch in `racePlanner.update` (areaBonus decouple + pre-OUTCOME show controller), `showTargetMode/showEngagement/showFrontBand/showWanderDwell/showFrontConcentration` config, sim `SHOW_*`, DevScreen "Rank-Action" SubCard, show test blocks | `72cfbdb4…` ✓ | 3019 ✓ | — (dead end; nothing shared) |
