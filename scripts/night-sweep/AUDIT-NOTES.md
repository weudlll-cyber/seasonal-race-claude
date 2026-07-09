# NIGHT SWEEP — Clean-Baseline Audit & Working Notes

Autonomous run started 2026-07-09 (owner asleep). This file is the incremental checkpoint.
NO shipped behavior changes: everything added is flag-gated read-only sim observers.

## Confirmed defaults at source (defaults.js, DEFAULT_RACE_DYNAMICS_CONFIG)

- `racePlanBonusStrengthMultiplier: 2.0` (defaults.js:271)
- `pulkBiasGain: 2.0` (defaults.js:287)
- `governorMaxEffect: 0.12`, `governorMaxStepPerFrame: 0.01` (defaults.js:295-296)
- `governorDirectorEnabled: true` (defaults.js:303)  ← REACTIVE DIRECTOR ON BY DEFAULT
- `governorDirectorLeaderBrake: 0.1` (defaults.js:307)
- `governorDirectorCeilingCap: true` (defaults.js:310)
- `directorV4Enabled: false` (defaults.js:318)
- `directorV4Intensity: 0.6` (defaults.js:322), `directorV4PackBandStrictness: 0.5` (defaults.js:323)
- `directorV4ReleaseProgress: 0.97` (defaults.js:328)  ← heroes held to 0.97 TODAY (very late)
- `directorV4ResolveB2..B5: 0.8/0.7/0.65/0.6` (defaults.js:329-332)
- `directorV4OutcomeStart: 0.25` (defaults.js:337)  ← Step 5 collapse; OUTCOME from 0.25
- `governorDirectorFallbackEnabled: true` (defaults.js:349), fallbackUntilPosition 12, fromPool 5, maxCount 2
- `phaseSplitBonusEnabled: true` (defaults.js:357)
- `areaBonusEarly: 1.0, areaBonusPulk: 0, areaBonusPost: 1.0` (defaults.js:358-360)
- `rowBonusEarly: 1, rowBonusPulk: 0, rowBonusPost: 1` (defaults.js:361-363)

### KEY OBSERVATION on brief concern #3
Shipped phase-split already has PULK area bonus OFF (areaBonusPulk:0) and EARLY/POST full.
BUT: the sim's AREA_SPLIT_ACTIVE (sim-fairness.mjs:214) is only true if --areaBonusPulk/Post/Early
CLI flags are passed; default null → sim does NOT run the CLI phase-split path.
OPEN QUESTION (for racePlanner audit): does racePlanner.js read phaseSplitBonusEnabled +
areaBonusEarly/Pulk/Post from dynamicsConfig(defaults) INDEPENDENTLY of the sim's CLI flags?
If yes, the sim inherits phaseSplitBonusEnabled=true w/ PULK off. Must resolve before trusting cells.

## Design concept-check — CRITICAL DESIGN CHALLENGE (preliminary)

The brief's MALUS axis {none, gentle, strong} = "braking applied to racers AHEAD of the climbing
hero". Brief itself states: "Today only HEROES are steered; the racers a comebacker must pass are
never touched." => The malus-on-others mechanism DOES NOT EXIST in current code (pending confirm by
racePlanner + raceGovernor audits). Implication: measuring "what the malus buys" requires BUILDING
the malus behind a flag (default off = byte-identical). That is a mechanism prototype, not a pure
observer. Must decide autonomously how to handle — see DECISIONS log.

Also: shipped release is 0.97; brief's release axis {0.25..0.70} is far earlier. The generator
guessing "conservatively" = late release + shallow curves. The sweep is exploring MUCH earlier
releases + deeper start depths than shipped.

## raceGovernor.js audit — CONFIRMED (source-cited)

- `applyGovernor(racers, finishT, phase, phaseCtx, cfg)` mutates only `r.governorMult`; caller
  multiplies into t-advance. Master gate `cfg.directorEnabled` (raceGovernor.js:198).
- CONFIRMED brief concern #1: v4-ON does NOT disable the reactive director for the pack. Heroes are
  excluded/pinned to 1.0 at raceGovernor.js:220; `live` filters out ONLY heroes at :223-225; every
  non-hero pack racer is still boost/brake/fallback'd via governorMult. => MUST pass
  `--governorDirectorEnabled=false` in v4-ON cells to isolate the v4 mechanism.
- IMPORTANT NUANCE: director active ONLY in PRE_PULK/PULK/TRANSITION; phase-weight fades to exactly 0
  at corrStartFrac (raceGovernor.js:127-132, 396); during OUTCOME/FINAL all mults pinned 1.0
  (:201-204). Under v4 OUTCOME starts at directorV4OutcomeStart=0.25 → NEED to confirm (racePlanner
  audit) whether the director's window is 0→0.25 only. Either way, disabling it is the clean move
  (also removes chaos-phase 0→0.25 director action that perturbs pack start-of-window positions).
- Hero curve is applied by the trajectory controller, NOT the director; disjoint governorMult sets,
  no double-write within this file (raceGovernor.js:216-218).
- Forces, ALL gated by directorEnabled: leader brake -leaderBrake on P1 (:378), linger brake (:385),
  fall-back brake (:388), catch-up boost min(challengerBoost, pullStrength*arcLen) (:391), phase-w
  fade, ±maxEffect clamp, ceiling cap, per-frame slew. computeDirectorCeiling clamps to
  NATURALNESS_CEILING=1.2 (:59-63).

## DECISIONS LOG (autonomous)
- D1: v4-ON cells will pass `--governorDirectorEnabled=false` (isolate v4 mechanism). CONFIRMED needed.
- D2: v4-ON cells will pass `--pulkBiasGain=0` (neutralize PULK cohesion relic). CONFIRMED inert
  under v4: computePulkBiasedTarget only acts in PULK phase (racePlanner.js:558), and v4 collapses
  PULK to zero width (pulkStart==pulkEnd==0.25) → branch never taken.

## racePlanner.js audit — CONFIRMED
- Heroes cast by generateHeroCurves (heroCurveGenerator.js), 2-4 heroes, marked isHeroChoreographed
  (racePlanner.js:448-449). Servo gain 2.0, maxMult 1.1 (+10%), minMult 0.85 (-15%) applied at :514,
  bidirectional, acts on EVERY active racer toward ITS OWN targetRank (pre-OUTCOME pack pinned 1.0).
- CONFIRMED brief's central mechanical premise: NO malus-on-others. Every brake/boost = a racer's own
  rankError (racePlanner.js:501, :514). No term references another racer / hero proximity. The malus
  the owner wants (brake those AHEAD of a climbing hero) DOES NOT EXIST.
- PULK collapse: pulkEnd & corridorStart → directorV4OutcomeStart=0.25 (racePlanner.js:141-145).
  areaBonus fade anchored to transEnd=0.75 (NOT pulkEnd) → under v4 the pack's targetRank-coupled
  areaBonus overlaps OUTCOME across 0.25-0.75. NOTE: brief said "phase-split tracks pulkEnd" — for
  racePlanner's NATIVE areaBonus that's inaccurate (it tracks transEnd); the pulkEnd-tracking split is
  the SIM's AREA_BONUS_EARLY/PULK/POST envelope, only active with --areaBonus* CLI flags.

## heroCurveGenerator.js audit — CONFIRMED (both eye-test causes)
- nextCluster (heroCurveGenerator.js:375): `b1Cluster=2`, `nextCluster=()=>min(b1Cluster,BAND_EDGES[0])`.
  Winner (final rank 1) assigned to cluster rank 2 (role sovereign-lead if already front, else
  comebacker) — NEVER steered to rank 1; run-out decides 1st (:377-383). Confirms cause (b): a B1 hero
  at rank 3 → cluster 2 = ONE-place "comeback".
- Heroes are the B1 pool (finalRank ≤ BAND_EDGES[0]) + optional faller (:388-417). Confirms cause (a):
  B1 pool already pulled front by chaos areaBonus.
- Feasibility is DENSITY-based: speedBudgetFrac=0.1 (line 39) == servo +10% authority; racerFeasibility
  (:97-113) computes bestRank=rank-ahead where ahead=#racers within +shift t-window. peakDepthFrac
  0.15→0.55 of field (line 68). clampIntensityToBudget REDUCES intensity until winner's peak is
  feasible from THIS field's density (:140-159) → on spread fields the peak collapses shallow →
  invisible dip. THIS is the number the map calibrates.
- To sweep start-depth × release-phase as CLEAN axes we must CONTROL the hero curve (inject), because
  the generator auto-casts from postChaos and auto-clamps feasibility — it will not accept
  "one hero at 60% depth released at 0.40" as free inputs.
