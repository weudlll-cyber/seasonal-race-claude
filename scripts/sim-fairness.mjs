// ============================================================
// File:        sim-fairness.mjs
// Path:        scripts/sim-fairness.mjs
// Project:     RaceArena
// Created:     2026-05-17
// Description: Headless fairness simulation — tests whether start-row
//              position affects win probability across all tracks and
//              racer types, with speedBonusMult (catch-up) fully active.
//
//              Key design choices:
//              - baseSpeed uses the N-calibrated natural formula identical
//                to the browser race engine (BASE_SPEED_MEAN / expectedMinSF)
//              - finishT is SHIFTED (not speed) to create 30s / 120s races:
//                  finishT = naturalSpeed × REFERENCE_FPS × targetSeconds
//                This keeps speedBonusMult meaningful and comparable across
//                racer types and durations.
//              - speedBonusMult is always applied (that's what we're testing).
//              - No PNG output, no camera, no rendering — pure physics.
//
// Usage:
//   node scripts/sim-fairness.mjs [--races=50] [--racers=40]
//                                  [--out=client/tmp]
//                                  [--track=<id>] [--racer=<id>] [--dur=<sec>] [--seed=<n>]
//
//   Read-only diagnostics (flag-gated; a run without them is byte-identical):
//     --breakaway-diag   record the pre-OUTCOME lone-breakaway signal (leader-gap over
//                        progress, peak gap + who led). Raw → results/breakaway-diag/.
//     --front-action     record the pre-OUTCOME FRONT-ACTION metric: P1 lead changes,
//                        distinct P1 holders, top-3 podium shuffle, leader→2nd / leader→median
//                        racer-length gaps (front reach), and a per-racer targetRank-vs-front
//                        unpredictability correlation. Raw → results/front-action/. Front reach
//                        reuses the director gaps, so pair with --governorDirectorEnabled.
//     --diagLabel=<name> names the raw diagnostic output file (both diags share this).
//
//   Action axis (Action-sweep R1; read-only sweep hypothesis — NOT a shipped default):
//     --action=<0..1>    single "action" scalar (0=calm → 1=wild) coupled to the contest-injector
//                        (director) knobs: action↑ → PullStrength 0.03→0.12, Dwell 0.16→0.04
//                        (faster turnover), CastSize 4→2 (integer). AnchorOffset + Settling stay at
//                        config defaults (fixed, not on the axis). Overrides those three director
//                        knobs; unset → no-op (byte-identical). Realized knobs → JSON meta.action /
//                        meta.directorKnobs. Pair with --governorDirectorEnabled=true.
//
//   Action-1 two-sided contest director (read-only sweep knobs; default 0 → legacy one-sided pull):
//     --governorDirectorLeaderBrake=<0..0.15>      brake on the instantaneous leader (P1).
//     --governorDirectorChallengerBoost=<0..0.12>  forward boost cap on featured challengers toward
//                                                  the leader. Either > 0 → two-sided contest mode.
//     --bonusMult=<x>   areaBonus (Race-Plan band bonus) strength multiplier — the fairness knob.
//                       2.0 = shipped (+6% B1), 1.0 = half, 0 = off. Swept to trade corrP1 vs band-reach.
//
//   Governor field-shape telemetry (govGapLen*/govGap2ndLen*/govFieldLen*/govRankSwapRate,
//   in racer-lengths) is surfaced to rawData + results[].stats.governorShape only when the
//   director actually ran (--governorDirectorEnabled=true).
//
// Output:
//   <out>/fairness-data.json   — machine-readable raw data
//   <out>/fairness-report.md   — human-readable Markdown report
// ============================================================

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);
const ROOT = join(__dir, '..');

// ── Game modules (same code the browser uses) ─────────────────────────────────
// Imported above the CLI-arg block so the arg defaults below can read from the
// shared DevScreen config objects directly (no hand-mirrored literals).
import { EditorShape } from '../client/src/modules/track-editor/EditorShape.js';
import { applyRacerBehavior, initRacerBehavior } from '../client/src/modules/raceBehavior.js';
import {
  computeBodyNarrowRef,
  computeEvenRowLayout,
  computeRacerLayout,
  computeRowPhysicalY,
  computeSpeedBonus,
} from '../client/src/modules/rowLayout.js';
import { REFERENCE_FPS, computeSpeedScaleFactor, computeClosedTrackSsf, lapsFromDuration } from '../client/src/modules/camera/lapUtils.js';
import { computeRaceBaseSpeed } from '../client/src/modules/raceBaseSpeed.js';
import {
  DEFAULT_BASE_SPEED_CONFIG,
  DEFAULT_RACE_BEHAVIOR_CONFIG,
  DEFAULT_RACE_DYNAMICS_CONFIG,
  DEFAULT_ROW_LAYOUT_CONFIG,
} from '../client/src/modules/storage/defaults.js';
import { computeEffectiveBrakeFactor } from '../client/src/modules/raceBehaviorConfig.js';
import { createRacePlan, createTrajectoryController, BAND_EDGES } from '../client/src/modules/racePlanner.js';
import { applyGovernor, arcT, computeDirectorCeiling } from '../client/src/modules/raceGovernor.js';

// Local field-median for the sim's READ-ONLY diagnostics only (governor field-shape telemetry +
// breakaway-diag). The director mechanism no longer uses the field median, so computeMedianT was
// retired from raceGovernor.js; this local copy keeps those diagnostics working.
function simMedianT(racers) {
  const ts = [];
  for (const r of racers) if (!r.finished) ts.push(r.t);
  if (ts.length === 0) return null;
  ts.sort((a, b) => a - b);
  const n = ts.length;
  return n % 2 ? ts[(n - 1) / 2] : (ts[n / 2 - 1] + ts[n / 2]) / 2;
}
import { DEFAULT_AUTO_SCALE_CONFIG } from '../client/src/modules/autoSpriteScale.js';

// ── CLI args ──────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
function argVal(key, def) {
  const m = argv.find((a) => a.startsWith(`--${key}=`));
  return m ? m.slice(key.length + 3) : def;
}
const N_RACES        = Number(argVal('races', '50'));
const N_RACERS       = Number(argVal('racers', '40'));
// --openRacers / --closedRacers: per-topology racer count (Phase-1 matrix).
// Fall back to N_RACERS when not specified so existing --racers= still works.
const N_RACERS_OPEN   = Number(argVal('openRacers',   String(N_RACERS)));
const N_RACERS_CLOSED = Number(argVal('closedRacers', String(N_RACERS)));
const OUT_DIR        = join(ROOT, argVal('out', 'client/tmp'));
const TRACK_FILTER   = argVal('track', null);   // e.g. --track=river-run
const RACER_FILTER   = argVal('racer', null);   // e.g. --racer=horse
const DUR_FILTER     = argVal('dur', null);     // e.g. --dur=30

// ── Phase-3A: global seed + Race Plan activation ──────────────────────────────
// --seed=<n>  n>0: deterministic batch (race i uses seed (n-1)*N_RACES+i+1)
//             n=0 (default): non-deterministic (Math.random()), exploration only
// --race-plan=true|false  (default true): activate Race Plan controller. Default true is
//   browser-faithful — the browser's controller is always active (no off-switch);
//   --race-plan=false stays available as an explicit opt-out for sweep experiments.
// --bonusMult=<x>  Bereichs-Bonus strength multiplier.
// Race Plan timing/strength defaults are READ DIRECTLY from the shared DevScreen config
// (DEFAULT_RACE_DYNAMICS_CONFIG), not hand-mirrored here — so a change to the shared default
// propagates automatically and these defaults can never silently drift from the browser.
// The argVal(name, default) override is preserved, so --bonusMult / --corridorEnd etc. still work.
const GLOBAL_SEED             = Number(argVal('seed', '0'));
const RACE_PLAN_ACTIVE        = argVal('race-plan', 'true') !== 'false';
const BONUS_MULT              = Number(argVal('bonusMult',          String(DEFAULT_RACE_DYNAMICS_CONFIG.racePlanBonusStrengthMultiplier)));
const RP_BONUS_TRANSITION_END = Number(argVal('bonusTransitionEnd', String(DEFAULT_RACE_DYNAMICS_CONFIG.racePlanBonusTransitionEnd)));
const RP_BONUS_FADE_MS        = Number(argVal('bonusFadeDuration',  String(DEFAULT_RACE_DYNAMICS_CONFIG.racePlanBonusFadeDuration)));
const RP_CORRIDOR_START       = Number(argVal('corridorStart',      String(DEFAULT_RACE_DYNAMICS_CONFIG.racePlanCorridorStart)));
const RP_CORRIDOR_END         = Number(argVal('corridorEnd',        String(DEFAULT_RACE_DYNAMICS_CONFIG.racePlanCorridorEnd)));
const RP_PULK_BIAS_GAIN       = Number(argVal('pulkBiasGain',       String(DEFAULT_RACE_DYNAMICS_CONFIG.pulkBiasGain)));
// v4 hero choreography — master flag + drama intensity + loose-pack bandStrictness. Passed into
// createRacePlan (flag OFF → byte-identical; the intensity/strictness only apply when ON).
const DIRECTOR_V4_ENABLED     = argVal('directorV4Enabled', String(DEFAULT_RACE_DYNAMICS_CONFIG.directorV4Enabled)) === 'true';
const DIRECTOR_V4_INTENSITY   = Number(argVal('directorV4Intensity', String(DEFAULT_RACE_DYNAMICS_CONFIG.directorV4Intensity)));
const DIRECTOR_V4_PACK_BAND_STRICTNESS = Number(argVal('directorV4PackBandStrictness', String(DEFAULT_RACE_DYNAMICS_CONFIG.directorV4PackBandStrictness)));
const DIRECTOR_V4_RELEASE_PROGRESS = Number(argVal('directorV4ReleaseProgress', String(DEFAULT_RACE_DYNAMICS_CONFIG.directorV4ReleaseProgress)));
const DIRECTOR_V4_RESOLVE_B2 = Number(argVal('directorV4ResolveB2', String(DEFAULT_RACE_DYNAMICS_CONFIG.directorV4ResolveB2)));
const DIRECTOR_V4_RESOLVE_B3 = Number(argVal('directorV4ResolveB3', String(DEFAULT_RACE_DYNAMICS_CONFIG.directorV4ResolveB3)));
const DIRECTOR_V4_RESOLVE_B4 = Number(argVal('directorV4ResolveB4', String(DEFAULT_RACE_DYNAMICS_CONFIG.directorV4ResolveB4)));
const DIRECTOR_V4_RESOLVE_B5 = Number(argVal('directorV4ResolveB5', String(DEFAULT_RACE_DYNAMICS_CONFIG.directorV4ResolveB5)));
const DIRECTOR_V4_OUTCOME_START = Number(argVal('directorV4OutcomeStart', String(DEFAULT_RACE_DYNAMICS_CONFIG.directorV4OutcomeStart)));
// reRoll / trajectory dynamics overrides — same shared-default + argVal pattern. Lets a sweep
// test DevScreen-tuned (localStorage-only) values WITHOUT changing the shared defaults.js.
// Defaults read from DEFAULT_RACE_DYNAMICS_CONFIG → no drift; spread into dynamicsConfig below.
const DYNAMICS_OVERRIDES = {
  reRollVariationPercent:        Number(argVal('reRollVariationPercent',     String(DEFAULT_RACE_DYNAMICS_CONFIG.reRollVariationPercent))),
  reRollTransitionDuration:      Number(argVal('reRollTransitionDuration',   String(DEFAULT_RACE_DYNAMICS_CONFIG.reRollTransitionDuration))),
  reRollIntervalDivisor:         Number(argVal('reRollIntervalDivisor',      String(DEFAULT_RACE_DYNAMICS_CONFIG.reRollIntervalDivisor))),
  reRollLastPositionPercent:     Number(argVal('reRollLastPositionPercent',  String(DEFAULT_RACE_DYNAMICS_CONFIG.reRollLastPositionPercent))),
  trajectoryTransitionDuration:  Number(argVal('trajectoryTransitionDuration', String(DEFAULT_RACE_DYNAMICS_CONFIG.trajectoryTransitionDuration))),
  // Director realism envelope (shared ±maxEffect clamp + slew) — same shared-default + argVal
  // pattern (no drift).
  governorMaxEffect:  Number(argVal('governorMaxEffect',    String(DEFAULT_RACE_DYNAMICS_CONFIG.governorMaxEffect))),
  governorMaxStepPerFrame: Number(argVal('governorMaxStepPerFrame', String(DEFAULT_RACE_DYNAMICS_CONFIG.governorMaxStepPerFrame))),
  // Contest-injector "director" — own master + knobs; same shared-default + argVal pattern.
  governorDirectorEnabled:      argVal('governorDirectorEnabled',      String(DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorEnabled)) === 'true',
  governorDirectorPullStrength: Number(argVal('governorDirectorPullStrength', String(DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorPullStrength))),
  governorDirectorSettling:     Number(argVal('governorDirectorSettling',     String(DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorSettling))),
  governorDirectorLeaderBrake:     Number(argVal('governorDirectorLeaderBrake',     String(DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorLeaderBrake))),
  governorDirectorChallengerBoost: Number(argVal('governorDirectorChallengerBoost', String(DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorChallengerBoost))),
  governorDirectorFrontPool:        Number(argVal('governorDirectorFrontPool',        String(DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorFrontPool))),
  governorDirectorBoostOncePerRace: argVal('governorDirectorBoostOncePerRace', String(DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorBoostOncePerRace)) === 'true',
  governorDirectorLingerBrake:      Number(argVal('governorDirectorLingerBrake',      String(DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorLingerBrake))),
  governorDirectorCeilingCap:       argVal('governorDirectorCeilingCap', String(DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorCeilingCap)) === 'true',
  // Additive boost-headroom above the natural band max for the director ceiling (0 = shipped baseline).
  governorDirectorBoostHeadroom:    Number(argVal('governorDirectorBoostHeadroom', String(DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorBoostHeadroom))),
  // Event-driven catch-up + active fall-back (rebuild). Same shared-default + argVal pattern.
  governorDirectorMaxParallelBoosts:  Number(argVal('governorDirectorMaxParallelBoosts',  String(DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorMaxParallelBoosts))),
  governorDirectorBoostDurationMin:   Number(argVal('governorDirectorBoostDurationMin',   String(DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorBoostDurationMin))),
  governorDirectorBoostDurationMax:   Number(argVal('governorDirectorBoostDurationMax',   String(DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorBoostDurationMax))),
  governorDirectorCatchThreshold:     Number(argVal('governorDirectorCatchThreshold',     String(DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorCatchThreshold))),
  governorDirectorFallbackEnabled:    argVal('governorDirectorFallbackEnabled',    String(DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorFallbackEnabled)) === 'true',
  governorDirectorFallbackFromPool:   Number(argVal('governorDirectorFallbackFromPool',   String(DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorFallbackFromPool))),
  governorDirectorFallbackMaxCount:   Number(argVal('governorDirectorFallbackMaxCount',   String(DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorFallbackMaxCount))),
  governorDirectorFallbackUntilPosition: Number(argVal('governorDirectorFallbackUntilPosition', String(DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorFallbackUntilPosition))),
  governorDirectorFallbackProtectMs:  Number(argVal('governorDirectorFallbackProtectMs',  String(DEFAULT_RACE_DYNAMICS_CONFIG.governorDirectorFallbackProtectMs))),
};

// ── STRIP-DOWN harness (read-only, sim-only; every flag defaults → byte-identical) ───────────
// Measures how much accumulated pre-OUTCOME steering (areaBonus + start-row SPEED bonus) can be
// deleted while the unchanged OUTCOME P-controller keeps the finish fair. Nothing here touches the
// browser or any shipped default; a no-flag run is bit-identical to a normal fairness run.
//
//   --rerollVariant=1|2   re-roll TARGET draw only (transition machinery unchanged for both):
//                         1 = current + (rand−0.5)·2·halfWidth      → byte-identical "sticks".
//                         2 = current + v·(freshDrawAroundMean − current), v = variationPercent/100,
//                             freshDrawAroundMean = fresh uniform draw over the natural band → "wanders"
//                             (mean-reverting; a +8% racer whose fresh draw is −8% lands ~−4%). Both
//                             are clamped to the natural band by the SAME existing clamp below.
//   --areaBonusPulk=<x> / --areaBonusPost=<x>   areaBonus STRENGTH (bonusStrengthMultiplier units,
//                         2.0 = shipped) BEFORE / from PULK-end (0.5). Unset → no phase split.
//   --rowBonusEarly / --rowBonusPulk / --rowBonusPost   start-row SPEED-bonus STRENGTH (1.0 = full,
//                         0 = off) in chaos (0→0.25) / PULK (0.25→0.5) / after (0.5→). Implemented as a
//                         per-frame envelope on the baked-in speedBonusMult (baseSpeed math), SIM ONLY.
//                         Unset → full everywhere (byte-identical). tStart grid handicap is untouched.
//   --strip-metrics       attach dual-window action (PULK 0.25→0.55, OUTCOME 0.55→1.0) + worst-case
//                         assigned-winner + bonus↔leader sample. Raw per-combo → results/strip-down/.
const REROLL_VARIANT      = Number(argVal('rerollVariant', '1'));
const AREA_BONUS_PULK_RAW  = argVal('areaBonusPulk', null);
const AREA_BONUS_POST_RAW  = argVal('areaBonusPost', null);
// PULK-action-4: 3-phase areaBonus split (chaos / PULK / post). --areaBonusEarly = areaBonus strength in
// the CHAOS phase (0→0.25); absent → inherits areaBonusPulk, so a run without it is byte-identical to the
// prior 2-phase split. Lets the assigned winner keep his early advantage so PULK action doesn't bury him.
const AREA_BONUS_EARLY_RAW = argVal('areaBonusEarly', null);
const AREA_SPLIT_ACTIVE    = AREA_BONUS_PULK_RAW !== null || AREA_BONUS_POST_RAW !== null || AREA_BONUS_EARLY_RAW !== null;
const AREA_BONUS_PULK      = Number(AREA_BONUS_PULK_RAW ?? String(BONUS_MULT));
const AREA_BONUS_POST      = Number(AREA_BONUS_POST_RAW ?? String(BONUS_MULT));
const AREA_BONUS_EARLY     = Number(AREA_BONUS_EARLY_RAW ?? String(AREA_BONUS_PULK)); // inherits PULK when absent
// PULK-action-7: POSITION-GATED PULK areaBonus. During PULK, gate each racer's areaBonus strength by his
// CURRENT on-track rank (by r.t): rank ≤ high → 0 (front, no push → unpredictable); high<rank≤low → half;
// rank > low → FULL (deep → washed forward so OUTCOME can reach the stranded winner). Both thresholds must
// be set to activate; absent → the flat AREA_BONUS_PULK is used (byte-identical). Gate = current position,
// NOT targetRank (the bonus it scales is the existing targetRank-coupled areaBonus).
const AREA_PULK_GATE_HIGH_RAW = argVal('areaBonusPulkGateHigh', null);
const AREA_PULK_GATE_LOW_RAW  = argVal('areaBonusPulkGateLow', null);
const AREA_PULK_GATE_ACTIVE   = AREA_PULK_GATE_HIGH_RAW !== null && AREA_PULK_GATE_LOW_RAW !== null;
const AREA_PULK_GATE_HIGH     = Number(AREA_PULK_GATE_HIGH_RAW ?? '0');
const AREA_PULK_GATE_LOW      = Number(AREA_PULK_GATE_LOW_RAW ?? '0');
const AREA_PULK_FULL          = Number(argVal('areaBonusPulkFull', String(AREA_BONUS_PULK)));
const AREA_REF_STRENGTH   = BONUS_MULT; // the strength the areaBonusMap was built with (post-scale base)
const ROW_EARLY_RAW       = argVal('rowBonusEarly', null);
const ROW_PULK_RAW        = argVal('rowBonusPulk', null);
const ROW_POST_RAW        = argVal('rowBonusPost', null);
const ROW_SPLIT_ACTIVE    = ROW_EARLY_RAW !== null || ROW_PULK_RAW !== null || ROW_POST_RAW !== null;
const ROW_BONUS_EARLY     = Number(ROW_EARLY_RAW ?? '1');
const ROW_BONUS_PULK      = Number(ROW_PULK_RAW  ?? '1');
const ROW_BONUS_POST      = Number(ROW_POST_RAW  ?? '1');
const STRIP_METRICS       = argv.includes('--strip-metrics');
// ACTION-METRICS (read-only, --action-metrics): whole-field PULK-window movement metrics
// (rank churn, rank travel, risers/fallers, top-5 turnover, p10–p90 spread) + PULK naturalness
// + per-racer rows for pooled band-reach / corrP1 in the analyze step. Fully flag-gated → a
// no-flag run does zero extra work and is byte-identical. Measurement tooling only.
const ACTION_METRICS      = argv.includes('--action-metrics');
// PULK-action-2: ceiling-capped challenger boost (naturalness). '0' = off (byte-identical additive boost);
// Director knobs (frontPool / boostOncePerRace / lingerBrake / ceilingCap + the rebuild's catch-up
// and fall-back knobs) are read from DYNAMICS_OVERRIDES via the shared-default + argVal pattern
// (--governorDirector* overrides), so a no-flag sim run mirrors the shipped director default.
// Pinned strip-down phase/window boundaries (progress fractions). 0.25 chaos-end + 0.5 PULK-end are
// the anchor values the task fixes; 0.55 OUTCOME-start reuses corridorStart so it can never drift.
const SD_PULK_START   = 0.25;                 // chaos → PULK boundary — strip-metrics OBSERVATION only
const SD_PULK_END     = 0.5;                  // PULK → post boundary — strip-metrics OBSERVATION only
// NOTE: the phase-split MECHANIC (areaBonus/rowBonus) reads the LIVE plan pulkStart/pulkEnd fractions
// per race (see pulkStartLive/pulkEndLive) so bonuses follow the phases; SD_* above are the pinned
// strip-down observation checkpoints. Both equal 0.25/0.5 by default → byte-identical.
const SD_CORR_START   = RP_CORRIDOR_START;    // 0.55 — PULK action-window upper bound = OUTCOME start
const SM_HOLD_MS      = 750;                   // a P1 change counts as a CLEAN overtake only if the new
                                               // leader holds P1 ≥ this long (filters flicker vs raw leadΔ)

// ── Action axis (--action=<0..1>) — SINGLE source of the coupling ──────────
// One owner-facing scalar `action` ∈ [0,1] (0 = calm → 1 = wild), the prototype of the future
// SetupScreen "Action" slider. It couples to the rebuilt director knobs via the table below:
// action↑ → stronger boost + more simultaneous catch-ups. This is a SWEEP HYPOTHESIS in the sweep
// layer, never in shipped defaults; when --action is unset the block is a no-op. Realized knob
// values are surfaced (meta + config log) so a flat knob can later be pinned.
const ACTION_COUPLING = {
  pullStrength:  { at0: 0.03, at1: 0.12 }, // action↑ → stronger catch-up boost (per racer-length of gap)
  maxParallel:   { at0: 1,    at1: 4 },    // action↑ → more simultaneous catch-ups, integer
};
const ACTION_RAW = argVal('action', null);
const ACTION = ACTION_RAW !== null ? Math.max(0, Math.min(1, Number(ACTION_RAW))) : null;
function actionToDirectorKnobs(a) {
  const lerp = (e) => e.at0 + (e.at1 - e.at0) * a;
  return {
    governorDirectorPullStrength:      lerp(ACTION_COUPLING.pullStrength),
    governorDirectorMaxParallelBoosts: Math.round(lerp(ACTION_COUPLING.maxParallel)),
  };
}
// Realized director knobs at this action-point (null when --action unset). Overrides the three
// axis knobs in DYNAMICS_OVERRIDES; AnchorOffset/Settling are left untouched (fixed defaults).
const ACTION_KNOBS = ACTION !== null ? actionToDirectorKnobs(ACTION) : null;
if (ACTION_KNOBS) Object.assign(DYNAMICS_OVERRIDES, ACTION_KNOBS);

// ── Phase-3B: COMEBACK analysis mode ─────────────────────────────────────────
const COMEBACK_ANALYSIS = argVal('comeback-analysis', 'false') === 'true';
const CB_MIN_POSITIONS  = Number(argVal('cbMinPositions', '3'));
const CB_WINDOW_SEC     = Number(argVal('cbWindowSec', '5'));
const CB_ENDGAME_THRESH = Number(argVal('cbEndgameThresh', '0.85'));

// ── Phase-2K: TEF (tStart-Equalization-Feedback) overrides ───────────────────
const TEF_ACTIVE             = argVal('tefActive', null) === 'true';
const TEF_ALPHA              = Number(argVal('tefAlpha', '0.03'));
const TEF_MAX_GAP            = Number(argVal('tefMaxGap', '0.015'));
const TEF_OPEN_ONLY          = argVal('tefIsOpenOnly', 'true') !== 'false';
// v3: aggressive base bonus override for rear rows; TEF modulates it toward 1.0 as gap closes
const TEF_BASE_BONUS_OVERRIDE = argVal('tefBaseBonusOverride', null);
const TEF_BASE_BONUS          = TEF_BASE_BONUS_OVERRIDE !== null ? Number(TEF_BASE_BONUS_OVERRIDE) : null;

// ── Phase-2K v4: threshold-based bonus with smooth re-roll-style transitions ──
const V4_ACTIVE        = argVal('v4ThresholdActive', null) === 'true';
const V4_INITIAL_BOOST = Number(argVal('v4InitialBoost', '1.20'));
// Overtake-fraction thresholds (percent) at which bonus steps down
const V4_THRESHOLDS    = argVal('v4Thresholds', '20,40,60,80').split(',').map(Number);
// speedBonusMult value active in each band (length = V4_THRESHOLDS.length + 1)
const V4_BOOST_SCHEDULE = argVal('v4BoostSchedule', '1.20,1.15,1.10,1.05,1.0').split(',').map(Number);
// 'physical_overtake': require lateral proximity before t-crossing counts as overtake
// 'legacy': original t_value_compare (lax — for reference only)
const V4_METRIC_TYPE       = argVal('v4MetricType', 'physical_overtake');
const V4_LATERAL_PROXIMITY = Number(argVal('v4LateralProximity', '0.3'));
// Row-differentiated thresholds (per_racer mode); fall back to V4_THRESHOLDS if not specified
// v4RowRestThresholds applies to Row 2 and all deeper rows; v4Row2Thresholds is a legacy alias.
const V4_ROW1_THRESHOLDS_RAW    = argVal('v4Row1Thresholds', null);
const V4_ROW_REST_THRESHOLDS_RAW = argVal('v4RowRestThresholds', null) ?? argVal('v4Row2Thresholds', null);
const V4_ROW1_THRESHOLDS  = V4_ROW1_THRESHOLDS_RAW    ? V4_ROW1_THRESHOLDS_RAW.split(',').map(Number)    : V4_THRESHOLDS;
const V4_ROW2_THRESHOLDS  = V4_ROW_REST_THRESHOLDS_RAW ? V4_ROW_REST_THRESHOLDS_RAW.split(',').map(Number) : V4_THRESHOLDS;

// ── Phase-2L: behaviorConfig overrides via CLI ────────────────────────────────
const WARMUP_MS_RAW      = argVal('avoidanceWarmupMs', null);
const WARMUP_MS_OVERRIDE = WARMUP_MS_RAW !== null ? Number(WARMUP_MS_RAW) : null;
// --behavior='{"lateralForce":0.016,"lateralDamping":0.30}' — JSON object merged into behaviorConfig
const BEHAVIOR_OVERRIDE_RAW = argVal('behavior', null);
const BEHAVIOR_OVERRIDE = BEHAVIOR_OVERRIDE_RAW ? (() => {
  try { return JSON.parse(BEHAVIOR_OVERRIDE_RAW); }
  catch { console.error('⚠️  --behavior: invalid JSON, ignoring'); return {}; }
})() : {};
// Dedicated per-run overrides for the two look-before-brake knobs swept during tuning.
// Fold into BEHAVIOR_OVERRIDE so they flow through the same behaviorConfig merge path as
// --behavior. Absent → no key added → default (0.005 / 1.2) preserved byte-identically.
const LBB_MINDIFF_RAW  = argVal('lbbMinDiff', null);
const LBB_REENGAGE_RAW = argVal('lbbReengage', null);
if (LBB_MINDIFF_RAW  !== null) BEHAVIOR_OVERRIDE.lookBeforeBrakeMinDifferential     = Number(LBB_MINDIFF_RAW);
if (LBB_REENGAGE_RAW !== null) BEHAVIOR_OVERRIDE.lookBeforeBrakeReengageTMultiplier = Number(LBB_REENGAGE_RAW);
// --selfcheck: run synthetic validation of BS-1 fairness metrics and exit (no sim run).
const SELFCHECK = argv.includes('--selfcheck');

// ── Base-speed band override (flag/test config; read-only measurement) ────────
// --baseSpeedMin / --baseSpeedMax let a fairness sweep test a widened Speed Range WITHOUT
// editing the shipped defaults.js. ABSENT → shipped DEFAULT_BASE_SPEED_CONFIG, so a no-flag
// run is byte-identical. Every base-speed-derived quantity in the sim (spread band, expectedMinSF,
// open-track natural base, re-roll clamps, AND the director ceiling-cap = BASE_SPEED_MAX/MEAN)
// flows from the two module-level constants below, so overriding them here propagates the tested
// band consistently. When a tested band is promoted to the default, this flag simply matches it.
const BASE_SPEED_MIN_OVR = Number(argVal('baseSpeedMin', String(DEFAULT_BASE_SPEED_CONFIG.min)));
const BASE_SPEED_MAX_OVR = Number(argVal('baseSpeedMax', String(DEFAULT_BASE_SPEED_CONFIG.max)));

// ── Phase-2K v4: diagnostic snapshot mode ────────────────────────────────────
const DIAG_MODE         = argVal('diagnosticMode', null) === 'true';
const DIAG_SNAP_TIMES_S = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0, 2.0, 5.0];

// ── Breakaway causal diagnostic (--breakaway-diag) ───────────────────────────
// Read-only observation gated entirely behind this boolean flag, so a normal
// fairness run is byte-identical to before (no extra columns, no extra output).
// Records the pre-OUTCOME lone-breakaway signal: leader-gap over progress, the
// peak pre-OUTCOME gap, and WHO leads at that peak (target rank +
// multiplier decomposition). Raw output → results/breakaway-diag/. --diagLabel
// names the output file so ablation arms don't overwrite each other.
const BREAKAWAY_DIAG = argv.includes('--breakaway-diag');
const DIAG_LABEL     = argVal('diagLabel', 'run');
// Progress boundary below which a gap counts as "pre-OUTCOME" — read from config
// (racePlanCorridorStart) so it tracks the same OUTCOME onset the controller uses.
const BREAKAWAY_CORRIDOR_START = RP_CORRIDOR_START;

// ── Front-action metric (--front-action) ─────────────────────────────────────
// Read-only observer (breakaway-diag pattern). Over the pre-OUTCOME / governor-active
// window (progress < corridorStart = BREAKAWAY_CORRIDOR_START) it counts P1 lead changes,
// distinct P1 holders and top-3 podium shuffle, and per-racer front-running fractions for
// an unpredictability (front-vs-targetRank) correlation. Fully flag-gated → a no-flag run
// is byte-identical (no extra per-step work, no extra columns, no extra output). Front-reach
// reuses the governor's leader→2nd / leader→median racer-length gaps (governor must be on for
// those to be non-zero). Raw aggregates → results/front-action/ (named by --diagLabel).
const FRONT_ACTION = argv.includes('--front-action');

// Governor field-shape telemetry (govGapLen*/govGap2ndLen*/govFieldLen*/govRankSwapRate) is
// surfaced to rawData + the combo stats ONLY when the governor actually ran, so a governor-off
// fairness run stays byte-identical (no new columns). Gated on the governor "active" flag.
const GOVERNOR_ON = RACE_PLAN_ACTIVE && DYNAMICS_OVERRIDES.governorDirectorEnabled;

// ── Seeded PRNG (mulberry32) ──────────────────────────────────────────────────
export function makePRNG(seed) {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic combo seed for the main-loop start-row shuffle (comboRowLayout). Derived
// from track+racer+global seed via FNV-1a so a given --seed reproduces the exact start-row
// assignment for every combo — the missing piece that made --seed control the FULL batch
// (the shuffle was previously drawn from unseeded Math.random in the main loop).
export function comboLayoutSeed(trackId, racerType, globalSeed) {
  let h = 0x811c9dc5;
  const str = `${trackId}|${racerType}|${globalSeed}`;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) || 1; // never 0 (makePRNG on 0 still works, but keep it non-zero)
}

// ── Speed transition easing (mirrors index.jsx) ───────────────────────────────
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ── Racer type configs ────────────────────────────────────────────────────────
// speedMultiplier, displaySize, bodyFillX, bodyFillY sourced from *RacerType.js files.
// displaySize affects racersPerRow (track capacity) and avoidance pixel distances.
// bodyFillX/Y: fraction of frame occupied by body pixels (measured from spritesheet).
// surfaceClasses mirrors each *RacerType.js — used to filter racers by track surface.
export const RACER_CONFIGS = {
  horse:      { speedMultiplier: 1.00, displaySize: 47, bodyFillX: 0.353, bodyFillY: 0.800, surfaceClasses: ['sand', 'earth', 'grass', 'asphalt', 'snow', 'mud'] },
  duck:       { speedMultiplier: 0.85, displaySize: 36, bodyFillX: 0.875, bodyFillY: 0.875, surfaceClasses: ['water', 'grass'] },
  snail:      { speedMultiplier: 0.30, displaySize: 35, bodyFillX: 0.727, bodyFillY: 0.938, surfaceClasses: ['grass'] },
  elephant:   { speedMultiplier: 0.60, displaySize: 44, bodyFillX: 0.539, bodyFillY: 0.938, surfaceClasses: ['sand', 'earth', 'grass'] },
  giraffe:    { speedMultiplier: 0.90, displaySize: 48, bodyFillX: 0.271, bodyFillY: 0.767, surfaceClasses: ['sand', 'earth', 'grass'] },
  snake:      { speedMultiplier: 0.75, displaySize: 44, bodyFillX: 0.374, bodyFillY: 0.806, surfaceClasses: ['sand', 'earth', 'grass'] },
  dragon:     { speedMultiplier: 1.10, displaySize: 50, bodyFillX: 0.836, bodyFillY: 0.898, surfaceClasses: ['air', 'asphalt', 'earth', 'water'] },
  f1:         { speedMultiplier: 1.20, displaySize: 38, bodyFillX: 0.555, bodyFillY: 0.953, surfaceClasses: ['asphalt'] },
  rocket:     { speedMultiplier: 1.25, displaySize: 47, bodyFillX: 0.278, bodyFillY: 0.801, surfaceClasses: ['air', 'water'] },
  buggy:      { speedMultiplier: 0.95, displaySize: 38, bodyFillX: 0.844, bodyFillY: 0.875, surfaceClasses: ['sand', 'earth', 'mud'] },
  motorbike:  { speedMultiplier: 1.05, displaySize: 42, bodyFillX: 0.400, bodyFillY: 0.800, surfaceClasses: ['asphalt', 'earth'] },
  plane:      { speedMultiplier: 1.15, displaySize: 42, bodyFillX: 0.836, bodyFillY: 0.930, surfaceClasses: ['air'] },
  luge:       { speedMultiplier: 1.10, displaySize: 80, bodyFillX: 0.313, bodyFillY: 0.641, surfaceClasses: ['ice', 'snow'] },
  beetle:     { speedMultiplier: 0.90, displaySize: 38, bodyFillX: 0.398, bodyFillY: 0.672, surfaceClasses: ['asphalt', 'cobble', 'earth'] },
  boarder:    { speedMultiplier: 1.00, displaySize: 40, bodyFillX: 0.398, bodyFillY: 0.719, surfaceClasses: ['asphalt', 'cobble', 'earth'] },
  koi:        { speedMultiplier: 0.95, displaySize: 52, bodyFillX: 0.578, bodyFillY: 0.914, surfaceClasses: ['water'] },
  turtle:     { speedMultiplier: 0.85, displaySize: 48, bodyFillX: 0.578, bodyFillY: 0.734, surfaceClasses: ['water'] },
  manta:      { speedMultiplier: 1.10, displaySize: 56, bodyFillX: 0.633, bodyFillY: 0.805, surfaceClasses: ['water'] },
  dolphin:    { speedMultiplier: 1.15, displaySize: 52, bodyFillX: 0.402, bodyFillY: 0.887, surfaceClasses: ['water'] },
  snowmobile: { speedMultiplier: 1.10, displaySize: 52, bodyFillX: 0.459, bodyFillY: 0.797, surfaceClasses: ['snow', 'ice', 'earth'] },
};

// ── Duration variants (seconds) ───────────────────────────────────────────────
// --dur overrides to a single arbitrary duration (enables e.g. --dur=60 / --dur=90)
export const DURATION_VARIANTS = DUR_FILTER ? [Number(DUR_FILTER)] : [30, 60, 120];

// ── Compute adjusted finishT (OPEN TRACKS ONLY) ───────────────────────────────
/**
 * Returns the finishT (t-space target) for an OPEN-track race of targetSeconds.
 * baseSpeed stays at the natural N-calibrated value; only the finish line moves.
 *
 * IMPORTANT: This is OPEN-TRACK ONLY. Closed tracks must NOT use this function —
 * they use lapsFromDuration(durationSec) for the finish line (the lap-count bucket,
 * matching RaceScreen/index.jsx, headlessRaceSimulator.js, and sim-race-visual.mjs).
 * Reusing computeFinishT for closed tracks reintroduces the ~4.2-lap-vs-2-lap
 * divergence this fix removed — do not do it.
 *
 * For open tracks finishT is capped at (1 - runoutZone) since the track
 * has a physical end. The effective race will then be shorter than targetSeconds
 * for fast types on short open tracks — still valid, just recorded as-is.
 *
 * @param {number} naturalBaseSpeed  race_baseSpeed (N-calibrated, before speedMultiplier)
 * @param {number} speedMultiplier   racer-type factor
 * @param {number} targetSeconds
 * @param {boolean} isOpen
 * @param {number} [runoutZone=0.05]
 * @returns {number}
 */
export function computeFinishT(naturalBaseSpeed, speedMultiplier, targetSeconds, isOpen, runoutZone = 0.05) {
  const ft = naturalBaseSpeed * speedMultiplier * REFERENCE_FPS * targetSeconds;
  return isOpen ? Math.min(ft, 1.0 - runoutZone) : ft;
}

// ── Single race simulation ────────────────────────────────────────────────────
/**
 * Run one deterministic race and return per-racer results.
 *
 * @param {object} p
 * @param {object}  p.shape                EditorShape instance (or compatible mock)
 * @param {number}  p.pathLengthPx
 * @param {number}  p.geometricTrackWidth  inner→outer width in world pixels
 * @param {boolean} p.isOpen
 * @param {number}  p.speedMultiplier      racer-type factor
 * @param {number}  p.displaySize          sprite size in world pixels
 * @param {number}  [p.bodyFillX=0.75]     body width / frameWidth (from spritesheet measurement)
 * @param {number}  [p.bodyFillY=0.75]     body height / frameHeight (from spritesheet measurement)
 * @param {number}  p.finishT              adjusted finish line in t-space
 * @param {number}  p.targetSeconds        used for re-roll scheduling
 * @param {number}  p.seed                 PRNG seed
 * @param {number}  p.nRacers
 * @returns {Array<{racerIndex,startRowIndex,indexInRow,finalT,finalRank,finishTime}>}
 */
export function runSingleRace({
  shape,
  pathLengthPx,
  geometricTrackWidth,
  isOpen,
  speedMultiplier,
  displaySize,
  bodyFillX = 0.75,
  bodyFillY = 0.75,
  finishT,
  targetSeconds,
  seed,
  nRacers,
  diagnosticMode = false,
  behaviorConfigOverrides = {},
  racePlanController = null,   // Phase-3A: TrajectoryController instance or null
  comebackAnalysisConfig = null,  // Phase-3B: { b1Indices, minPositions, windowSec, endgameThresh }
  frameHook = null,            // diag: called after applyRacerBehavior each frame — (raceTs, diagOut, racers)
  breakawayDiag = false,       // --breakaway-diag: record the pre-OUTCOME breakaway signal (read-only)
  frontAction = false,         // --front-action: record pre-OUTCOME front-action metric (read-only)
  racerTargetRankMap = null,   // plan._racerTargetRank; lets the diag name the peak-gap leader's target rank
}) {
  const savedRandom = Math.random;
  if (seed > 0) Math.random = makePRNG(seed);

  try {
    const BASE_SPEED_MIN  = BASE_SPEED_MIN_OVR;
    const BASE_SPEED_MAX  = BASE_SPEED_MAX_OVR;
    const BASE_SPEED_MEAN = (BASE_SPEED_MIN + BASE_SPEED_MAX) / 2;
    const behaviorConfig  = { ...DEFAULT_RACE_BEHAVIOR_CONFIG, ...behaviorConfigOverrides };
    const rowConfig       = { ...DEFAULT_ROW_LAYOUT_CONFIG };
    const dynamicsConfig  = { ...DEFAULT_RACE_DYNAMICS_CONFIG, ...DYNAMICS_OVERRIDES };

    // N-calibrated base speed — mirrors RaceScreen/index.jsx computeRaceBaseSpeed call
    // term-for-term, for BOTH finishT and speed (open and closed). Speed is back-solved
    // from finishT so the median racer reaches the finish line in targetSeconds.
    // Open tracks: finishT is the capped distance (computeFinishT); closedSsf = 1.
    // Closed tracks: finishT is the lapsFromDuration bucket; closedSsf normalizes the
    // back-solved speed by path length so all closed tracks share comparable on-screen
    // pace — same single formula as index.jsx (closedSsf = 1 collapses it to the open case).
    // speedMultiplier sits in the denominator here and is re-multiplied at lines 335/629,
    // cancelling to net M⁰ for closed tracks — matching the browser's M-free closed pace.
    const spreadMinFactor = BASE_SPEED_MIN / BASE_SPEED_MEAN;
    const spreadMaxFactor = BASE_SPEED_MAX / BASE_SPEED_MEAN;
    const expectedMinSF   = spreadMinFactor + (spreadMaxFactor - spreadMinFactor) / (nRacers + 1);
    const closedSsf       = isOpen ? 1 : computeClosedTrackSsf(pathLengthPx);
    const race_baseSpeed  = computeRaceBaseSpeed(
      finishT,
      targetSeconds * expectedMinSF * speedMultiplier * closedSsf
    );

    // Row layout — mirrors browser's bottom-up computeRacerLayout path (Sim adjusted to match)
    const effectiveWidth      = geometricTrackWidth * behaviorConfig.startSpreadRange;
    const { spriteSize: effectiveDisplaySize, rowCount } = computeRacerLayout(effectiveWidth, nRacers, displaySize, DEFAULT_AUTO_SCALE_CONFIG);
    // Body narrow/long references — mirror index.jsx W_REF + computeBodyNarrowRef call.
    // bodyFillNarrow = min(X,Y); bodyFillLong = max(X,Y) — narrow axis identified by fill fraction.
    // W_REF cap at 285 matches the game's cap for the camera reference width.
    const bodyFillNarrow = Math.min(bodyFillX, bodyFillY);
    const bodyFillLong   = Math.max(bodyFillX, bodyFillY);
    const W_REF = Math.min(285, effectiveWidth);
    const bodyRef = computeBodyNarrowRef(W_REF, nRacers, displaySize, bodyFillNarrow, DEFAULT_AUTO_SCALE_CONFIG);
    const rowGapPx            = effectiveDisplaySize * rowConfig.rowGapMultiplier;
    const deltaT              = pathLengthPx > 0 ? rowGapPx / pathLengthPx : 0.01;
    const rowLayout           = computeEvenRowLayout(nRacers, rowCount);

    const rowSizeByRow = new Map();
    for (const a of rowLayout.assignments) {
      rowSizeByRow.set(a.rowIndex, (rowSizeByRow.get(a.rowIndex) ?? 0) + 1);
    }
    const assignmentByRacer = new Map(rowLayout.assignments.map((a) => [a.racerIndex, a]));

    // Re-roll schedule keyed to the REALIZED race duration (parity with browser). Closed tracks:
    // the engine stretches targetSeconds by expectedMinSF × closedSsf, so keying on targetSeconds
    // front-loaded re-rolls into the first ~half; realizedDurationSec spreads them across the whole
    // race. Reuses the SAME expectedMinSF/closedSsf already computed for base speed (no second calc).
    // Open tracks: realizedDurationSec == targetSeconds (closedSsf=1 collapses the factor), unchanged.
    const realizedDurationSec = isOpen ? targetSeconds : targetSeconds * expectedMinSF * closedSsf;
    const rollCount        = Math.max(2, Math.floor(realizedDurationSec / dynamicsConfig.reRollIntervalDivisor));
    const rollInterval     = ((dynamicsConfig.reRollLastPositionPercent / 100) * realizedDurationSec * 1000) / rollCount;
    const lastRollDeadline = realizedDurationSec * 1000 * (dynamicsConfig.reRollLastPositionPercent / 100);

    // Init racers
    const racers = Array.from({ length: nRacers }, (_, i) => {
      const assignment    = assignmentByRacer.get(i) ?? { rowIndex: 0, indexInRow: 0 };
      const rowSize       = rowSizeByRow.get(assignment.rowIndex) ?? 1;
      const speedBonus    = computeSpeedBonus(
        assignment.rowIndex, rowGapPx, pathLengthPx, rowConfig.speedBonusFactor,
        finishT, isOpen, rowLayout.totalRows
      );
      // Open track: front row has the largest positive tStart (assembly area).
      // Closed track: row 0 starts at 0, rear rows at negative t (behind start).
      const tStart = isOpen
        ? (rowLayout.totalRows - assignment.rowIndex) * deltaT
        : -(assignment.rowIndex * deltaT);
      const spreadFactor  = (BASE_SPEED_MIN + Math.random() * (BASE_SPEED_MAX - BASE_SPEED_MIN)) / BASE_SPEED_MEAN;
      const isRearRowOpen = isOpen && assignment.rowIndex > 0;
      const speedBonusMult =
        (TEF_ACTIVE && TEF_BASE_BONUS !== null && (!TEF_OPEN_ONLY || isOpen) && isRearRowOpen)
          ? TEF_BASE_BONUS
          : (V4_ACTIVE && isRearRowOpen)
            ? V4_INITIAL_BOOST
            : (1 + speedBonus);
      const rollJitter    = (Math.random() - 0.5) * 2 * rollInterval * 0.2;

      const r = {
        index:                 i,
        name:                  `R${i + 1}`,
        t:                     tStart,
        tStart,
        initialSpeedBonusMult: speedBonusMult,
        rawRowBonus:           speedBonus, // STRIP-DOWN: raw start-row speed bonus (speedBonusMult−1) for the phase envelope
        initialGap:            0,
        spreadFactor,
        speedBonusMult,
        baseSpeed:           race_baseSpeed * speedMultiplier * spreadFactor * speedBonusMult,
        spreadFactorPrev:    spreadFactor,
        spreadFactorTarget:  spreadFactor,
        transitionStartTime: 0,
        transitionDuration:  dynamicsConfig.reRollTransitionDuration * 1000,
        nextRollTime:        rollInterval + rollJitter,
        finished:            false,
        finishRank:          null,
        finishTime:          null,
        startRowIndex:       assignment.rowIndex,
        indexInRow:          assignment.indexInRow,
        runoutDecay:         1,
        x: 0, y: 0, angle:   0,
        frameSizePx:         effectiveDisplaySize,
        drawnBodyWidthPx:    bodyRef.bodyNarrow,
        // Same formula as RaceScreen/index.jsx line 610-612 (report 39 parity fix):
        // drawnBodyLengthPx = drawnBodyWidthRefPx × bodyFillLong / bodyFillNarrow.
        drawnBodyLengthPx:   bodyFillNarrow > 0
          ? bodyRef.bodyNarrow * bodyFillLong / bodyFillNarrow
          : bodyRef.bodyNarrow,
        trackWidthPx:  geometricTrackWidth,
        pathLengthPx,
        // v4: per-racer bonus-level transition state (mirrors re-roll transition)
        v4BonusMult:              1.0,
        v4BonusMultPrev:          1.0,
        v4BonusMultTarget:        1.0,
        v4BonusTransitionStart:   -Infinity,
        v4BonusTransitionDuration: dynamicsConfig.reRollTransitionDuration * 1000,
        v4RacerThreshIdx:         0, // per_racer metric: next threshold index for this racer (ratchet)
        v4RacerThreshTimes:       [], // per_racer: raceTs (ms) when each threshold was crossed
        rerollCount:              0, // total speed re-rolls fired for this racer
        trajectoryMult:           1.0, // Phase-3A: smoothed by easeInOutCubic transition; 1.0 when Race Plan inactive
        trajectoryMultTarget:     1.0,
        trajectoryMultPrev:       1.0,
        trajectoryMultTransStart: 0,
        areaBonusMult:            1.0, // Phase-3A: set by controller.update(); 1.0 when Race Plan inactive
        governorMult:             1.0, // Stage B governor; slew-limited in-place (1.0 when disabled)
      };
      initRacerBehavior(r);
      r.physicalY = computeRowPhysicalY(
        assignment.indexInRow, rowSize, behaviorConfig.startSpreadRange
      );
      return r;
    });

    // v4: heroes are cast + tagged (isHeroChoreographed) at the post-chaos boundary inside the
    // controller's update() (the generator needs the actual field state), not at racer init.

    // World position helper
    const tPos = (t) => ((t % 1) + 1) % 1;
    function computePositions() {
      for (const r of racers) {
        const tNorm = isOpen ? Math.min(r.t, 1) : tPos(r.t);
        const p = shape.getPosition(tNorm, r.physicalY / 2);
        r.x = p.x; r.y = p.y; r.angle = p.angle;
      }
    }

    const DT          = 16; // ms per frame — matches game FIXED_DT (index.jsx:138)
    const maxTime     = Math.max(targetSeconds * 3, 600) * 1000; // safety cap: 3× or 10 min
    let raceTs        = 0;
    let raceProgress = 0; // monotonic leader track-progress [0,1]; drives WHEN phases switch
                          // (route-based, mirrors index.jsx). Distinct from raceTs (stopwatch ms).
    let finishedCount = 0;

    // Mixing-quota: fraction of Row-1 racers that have overtaken at least one Row-0
    // racer in t-space by the time avoidanceWarmupMs elapses.
    let mixingQuota    = null;
    let warmupMeasured = false;

    // TEF: compute per-racer initialGap = how far behind Row-0's start each racer begins
    if (TEF_ACTIVE && (!TEF_OPEN_ONLY || isOpen)) {
      const tStartRow0 = Math.max(...racers.map((r) => r.tStart));
      for (const r of racers) {
        r.initialGap = Math.max(0, tStartRow0 - r.tStart);
      }
    }

    // v4: per-race overtaking state
    const v4Row1Total    = V4_ACTIVE && isOpen ? racers.filter((r) => r.startRowIndex === 1).length : 0;
    const v4Row1Racers   = V4_ACTIVE && isOpen ? racers.filter((r) => r.startRowIndex === 1) : [];
    const v4Row0Racers   = V4_ACTIVE && isOpen ? racers.filter((r) => r.startRowIndex === 0) : [];
    // per_racer: each row compares against ALL rows that started ahead of it (correct for Row 3+)
    const v4FrontPoolByRow = (V4_ACTIVE && isOpen && V4_METRIC_TYPE === 'per_racer') ? (() => {
      const map = new Map();
      const maxRow = Math.max(0, ...racers.map((r) => r.startRowIndex));
      for (let ri = 1; ri <= maxRow; ri++) {
        map.set(ri, racers.filter((r) => r.startRowIndex < ri));
      }
      return map;
    })() : null;
    // legacy alias kept for physical_overtake metric
    const v4FrontRacers  = V4_ACTIVE && isOpen && V4_METRIC_TYPE !== 'per_racer'
      ? racers.filter((r) => r.startRowIndex === 0 || r.startRowIndex === 1) : [];
    const v4HasOvertaken = new Set(); // racerIndex of Row-1 racers that have completed ≥1 overtake
    // physical_overtake metric: track pairs that were "near and behind" (prerequisite for an overtake)
    const v4WasNearBehind = new Set(); // keys "r1idx:r0idx" — pair was once laterally close while r1 behind
    const v4OvertakePairs = new Set(); // keys "r1idx:r0idx" — completed overtakes
    let   v4NextThreshIdx = 0;
    const v4ThreshLog     = []; // { threshold, timeS, fromBonus, toBonus }

    computePositions();

    // ── Diagnostic snapshot state ─────────────────────────────────────────────
    const diagSnapshots = [];
    let diagSnapIdx = 0;
    const DIAG_SNAP_MS   = diagnosticMode ? DIAG_SNAP_TIMES_S.map((s) => s * 1000) : [];
    let diagIntLateralPushes = 0;
    let diagIntBrakeActs     = 0;
    let diagIntOvertakes     = 0;
    let diagLastOvertakeCount = 0;

    function diagTakeSnapshot(nominalTimeS, actualTimeMs) {
      const snap = {
        timeS: nominalTimeS, actualTimeMs,
        interval: { lateralPushes: diagIntLateralPushes, brakeActivations: diagIntBrakeActs, newOvertakes: diagIntOvertakes },
        racers: racers.map((r) => ({
          idx: r.index, row: r.startRowIndex,
          t: +r.t.toFixed(6), physY: +r.physicalY.toFixed(4),
          speed: +r.baseSpeed.toFixed(6), avoidance: r.avoidanceActive,
          v4Mult: +(r.v4BonusMult ?? 1).toFixed(4),
        })),
        brakeZonePairs: [],
        closePairs: [],
      };
      for (let a = 0; a < racers.length; a++) {
        for (let b = a + 1; b < racers.length; b++) {
          const ra = racers[a], rb = racers[b];
          const dT = rb.t - ra.t;
          const dY = Math.abs(ra.physicalY - rb.physicalY);
          if (dT > 0 && dT < 0.015 && dY < 0.2)  snap.brakeZonePairs.push({ follower: ra.index, followerRow: ra.startRowIndex, leader: rb.index, leaderRow: rb.startRowIndex, dT: +dT.toFixed(5), dY: +dY.toFixed(4) });
          if (dT < 0 && -dT < 0.015 && dY < 0.2) snap.brakeZonePairs.push({ follower: rb.index, followerRow: rb.startRowIndex, leader: ra.index, leaderRow: ra.startRowIndex, dT: +(-dT).toFixed(5), dY: +dY.toFixed(4) });
          if (Math.abs(dT) < 0.005 && dY < 0.3)  snap.closePairs.push({ a: ra.index, aRow: ra.startRowIndex, b: rb.index, bRow: rb.startRowIndex, dT: +dT.toFixed(5), dY: +dY.toFixed(4) });
        }
      }
      diagSnapshots.push(snap);
      diagIntLateralPushes = 0;
      diagIntBrakeActs     = 0;
      diagIntOvertakes     = 0;
    }

    if (diagnosticMode) {
      diagTakeSnapshot(0.0, 0);
      diagSnapIdx = 1; // t=0 already captured
    }

    // ── Phase-3B: COMEBACK rank tracking state ────────────────────────────────
    const cbCfg            = comebackAnalysisConfig;
    const cbRankHistory    = cbCfg ? new Map() : null; // b1Idx → [{ts, rank}]
    const cbLastTriggerTs  = cbCfg ? new Map() : null; // b1Idx → last trigger raceTs (ms)
    let   cbOutcomeStartMs = null;
    let   cbOutcomeEndMs   = null;
    let   cbEndgameStartMs = null;
    const cbTriggers       = cbCfg ? [] : null;
    const cbMaxGainByRacer = cbCfg ? new Map() : null;

    // ── Lightweight per-race stats (always collected, low overhead) ───────────
    let liteRow1BrakeFrames = 0;  // racer-frames where startRowIndex=1 AND avoidanceActive
    let liteRow0BrakeFrames = 0;  // racer-frames where startRowIndex=0 AND avoidanceActive
    let liteRow2BrakeFrames = 0;  // racer-frames where startRowIndex=2 AND avoidanceActive
    let liteLateralMoves    = 0;  // racer-frames where |physicalY delta| > 1e-4
    const liteRow1EverAhead = new Set(); // row-1 racer indices that at any point had t > some row-0 t
    let litePrevPhysY       = null;
    // Overlap thresholds: 10% of body diameter in normalised track-space.
    // bodyDiameterX/Y are in world pixels; divide by track dimensions to get normalised units.
    const bodyDiameterX       = displaySize * bodyFillX;
    const bodyDiameterY       = displaySize * bodyFillY;
    const overlapThreshold_t  = 0.10 * bodyDiameterY / pathLengthPx;
    const overlapThreshold_y  = 0.10 * bodyDiameterX / geometricTrackWidth;

    // Lateral quality metrics
    let liteOverlapPairFrames    = 0;   // pair-frames with |dT|<overlapThreshold_t AND |dY|<overlapThreshold_y
    let liteOverlapPairTotal     = 0;   // total pair-frames checked
    // Honest overlap metric: actual body-extent collision.
    // Both dimensions sourced from render primitives independently (not one from the other).
    // Isotropic renderer: scale = bodyRef.bodyNarrow / (displaySize × bodyFillNarrow).
    // All sprite frames are square (verified: all 20 types use equal frameWidth/frameHeight),
    // so the general ×(frameWidth/frameHeight) factor equals 1 and is omitted.
    // Overlap fires when both axes touch simultaneously.
    // For closed tracks: t is wrapped mod finishT so lapping pairs are correctly detected.
    const drawnBodyWidthPx  = bodyRef.bodyNarrow;                                              // px drawn width
    const drawnBodyLengthPx = bodyFillNarrow > 0
      ? bodyRef.bodyNarrow * bodyFillLong / bodyFillNarrow                                  // px drawn length
      : bodyRef.bodyNarrow;
    let honestOverlapPairFrames = 0;
    let honestOverlapPairTotal  = 0;
    // ── passThroughCount (sim-only telemetry) ────────────────────────────────────
    // Counts lateral pass-through events: the sign of a pair's lateral gap (dY) FLIPS
    // while their bodies are longitudinally overlapping (dT_px < drawnBodyLengthPx) —
    // i.e. one body crossed THROUGH the other instead of going around it (illegal),
    // as opposed to a legal overtake (which happens with longitudinal clearance).
    // Window: [behaviorConfig.avoidanceWarmupMs, race end] — the first warmup window is
    // intentionally uncontrolled (start pack), so it is excluded.
    let passThroughCount        = 0;
    const passThroughPrevSign   = new Map(); // pairKey → last non-zero sign of (ra.physicalY - rb.physicalY)
    // Lapping instrumentation (closed tracks only, Part 1 verification):
    // maxRealSpread: max(t_leading - t_trailing) seen during the race, in laps (1.0 = one full lap).
    // honestSameLapFrames: honest overlap where |ra.t - rb.t| < 1.0 (same or seam-adjacent lap).
    // honestCrossLapFrames: honest overlap where |ra.t - rb.t| >= 1.0 (genuine lapping: 1+ lap ahead).
    let maxRealSpread        = 0;
    let honestSameLapFrames  = 0;
    let honestCrossLapFrames = 0;
    let liteZigzagSum            = 0;   // sum of |physicalYVelocity change| per racer-frame (after 4s)
    let liteZigzagFrames         = 0;   // racer-frames counted for zigzag (after 4s warmup)
    let litePrevPhysYVel         = null;// previous physicalYVelocity per racer index
    const liteOverlapPairState   = new Map(); // pairKey → consecutive overlapping frame count
    let liteOverlapResolutionSum = 0;   // sum of resolved overlap-run lengths (frames)
    let liteOverlapResolutionN   = 0;   // count of resolved overlap runs
    // New metrics: lateralSpeedScore, brakeRate, stableOvertakes
    let liteLatSpeedSum          = 0;   // sum of |physicalYVelocity| per active racer-frame (after 4s)
    let liteLatSpeedFrames       = 0;
    let liteBrakeSum             = 0;   // racer-frames where avoidanceActive=true (after 4s)
    let liteBrakeFrames          = 0;
    // brakeMatchFailureCount: events where brake-to-match is engaged (brakeMatchFactor<1)
    // but the trailer still out-advances its locked leader for 5 consecutive frames while
    // both remain in the longitudinal brake zone (report 06 §7 metric).
    let brakeMatchFailureCount   = 0;
    let brakeMatchLeaderBraked   = 0; // bypass events where the leader was itself braked (bmFactor<1)
    const brakeMatchFailState    = new Map(); // pairKey → consecutive qualifying frames
    // stableOvertakes: confirmed lead-swaps (3s+ duration) in 20%–80% of race, per racer
    const SO_CONFIRM_FRAMES      = Math.round(3000 / DT); // 3 s at 60 fps ≈ 180 frames
    const soPairLeader           = new Map(); // pairKey → currentLeaderIdx
    const soPairSince            = new Map(); // pairKey → consecutive frames at current lead
    const soPairConfirmed        = new Map(); // pairKey → confirmed (≥3s) leader idx
    let soCount                  = 0;

    // ── Phase-3A: Naturalness metrics state ──────────────────────────────────
    const JERK_BASESPEED_EPSILON = 1e-5;
    const JERK_HIGH_THRESHOLD    = 0.05; // calibrated post-baseline; ≈ 95th-pct jerk
    // Diagnostic-only windows (telemetry counters, NOT control) — based on the realized race
    // duration so post-fix re-gate telemetry lines up with the actual race timeline on closed
    // tracks. Reuses realizedDurationSec (same source as the re-roll schedule). Does not affect
    // race behavior or fairness stats (band-reach/Holm use finish ranks).
    const stablePhaseStartMs     = Math.max(0, 0.25 * realizedDurationSec * 1000);
    const stablePhaseEndMs       = 0.95 * realizedDurationSec * 1000;
    const PULK_T_THRESHOLD       = pathLengthPx > 0 ? 200 / pathLengthPx : 0.01;
    const pulkWindowStartMs      = 0.25 * realizedDurationSec * 1000;
    const pulkWindowEndMs        = 0.50 * realizedDurationSec * 1000;
    const natPrevEffSpeed        = new Map(); // racerIndex → prev effective speed
    const natPrevT               = new Map(); // racerIndex → t before Pass-2
    let natJerkSum = 0, natJerkMax = 0, natJerkSteps = 0, natJerkHighCount = 0;
    // Δ5s ring buffers: track trajectoryMult during OUTCOME; detect controller oscillation
    const TM_RING_SIZE = 313; // ≈5s at 16ms/step
    const tmRings = new Map(); // racerIndex → { buf: Float32Array, idx: number }
    let natOvertakeCount = 0, natNaturalOvertakeCount = 0;
    let natPulkFrames = 0, natStableFrames = 0;
    let natPulkWasActive = false;
    let natPulkTriggersInWindow = 0, natPulkTriggersOutOfWindow = 0;

    // frameHook support: reusable Map cleared before each applyRacerBehavior call
    const _frameDiagOut = frameHook ? new Map() : null;

    // ── Breakaway causal diagnostic state (--breakaway-diag; read-only) ───────
    // bkGapBins: one snapshot per 5% progress bin (leader gap to median + to 2nd).
    // bkPeak*: the max gap-to-median seen while progress < corridorStart, plus WHO
    // led there and their multiplier decomposition at that frame.
    const bkGapBins   = breakawayDiag ? [] : null;
    let   bkNextBin   = 0;                 // next 5% bin index (0..20) still to record
    let   bkPeakGap   = -Infinity;         // max pre-OUTCOME (leaderT - medianT)/finishT
    let   bkPeakProgress   = 0;
    let   bkPeakLeaderIdx  = -1;
    let   bkPeakGap2nd     = 0;
    let   bkPeakDecomp     = null;

    // ── Pre-OUTCOME contest-injector "director" — parity with the browser ─────────
    // Built once per race from the shared dynamics config. Phase fractions + seed from the
    // controller (live boundaries, single source). Default OFF → governorMult stays 1.0.
    // maxEffect + maxStepPerFrame are the shared realism envelope (±clamp + slew).
    const governorEnabled = !!racePlanController && (dynamicsConfig.governorDirectorEnabled ?? false);
    const govCfg = {
      maxEffect: dynamicsConfig.governorMaxEffect ?? 0.12,
      maxStepPerFrame: dynamicsConfig.governorMaxStepPerFrame ?? 0.01,
      directorEnabled: governorEnabled,
      directorPullStrength: dynamicsConfig.governorDirectorPullStrength ?? 0.06,
      directorSettling: dynamicsConfig.governorDirectorSettling ?? 0.05,
      directorLeaderBrake: dynamicsConfig.governorDirectorLeaderBrake ?? 0,
      directorChallengerBoost: dynamicsConfig.governorDirectorChallengerBoost ?? 0,
      directorFrontPool: dynamicsConfig.governorDirectorFrontPool ?? 8,
      directorBoostOncePerRace: dynamicsConfig.governorDirectorBoostOncePerRace ?? false,
      directorLingerBrake: dynamicsConfig.governorDirectorLingerBrake ?? 0,
      directorCeilingCap:
        (dynamicsConfig.governorDirectorCeilingCap ?? false)
          ? computeDirectorCeiling(BASE_SPEED_MAX, BASE_SPEED_MEAN, dynamicsConfig.governorDirectorBoostHeadroom ?? 0)
          : 0,
      // Event-driven catch-up.
      directorMaxParallelBoosts: dynamicsConfig.governorDirectorMaxParallelBoosts ?? 3,
      directorBoostDurationMin: dynamicsConfig.governorDirectorBoostDurationMin ?? 1500,
      directorBoostDurationMax: dynamicsConfig.governorDirectorBoostDurationMax ?? 4000,
      directorCatchThreshold: dynamicsConfig.governorDirectorCatchThreshold ?? 2.0,
      // Active fall-back.
      directorFallbackEnabled: dynamicsConfig.governorDirectorFallbackEnabled ?? false,
      directorFallbackFromPool: dynamicsConfig.governorDirectorFallbackFromPool ?? 5,
      directorFallbackMaxCount: dynamicsConfig.governorDirectorFallbackMaxCount ?? 2,
      directorFallbackUntilPosition: dynamicsConfig.governorDirectorFallbackUntilPosition ?? 12,
      directorFallbackProtectMs: dynamicsConfig.governorDirectorFallbackProtectMs ?? 2500,
    };
    const govFractions = racePlanController?.getPhaseFractions?.() ?? null;
    const govSeed = racePlanController?.seed ?? 0;
    // Phase-split MECHANIC boundaries follow the LIVE plan phase fractions (single source: the
    // controller), mirroring the browser — so the bonuses move with the PULK phase if it is edited.
    // Defaults (pulkStart 0.25 / pulkEnd 0.5) are unchanged → byte-identical to the pinned SD_* values.
    // (The strip-metrics OBSERVATION windows below intentionally stay on the pinned SD_* constants.)
    const pulkStartLive = govFractions?.pulkStartFrac ?? SD_PULK_START;
    const pulkEndLive   = govFractions?.pulkEndFrac ?? SD_PULK_END;
    // Per-race director state (catch-up + fall-back slots, boost-once pool, protection windows,
    // linger-brake, seeded event counter). applyGovernor lazily fills the slot arrays; parity with
    // the browser dirState shape.
    const dirState = { boostSlots: [], fallSlots: [], boosted: new Set(), protectedUntil: new Map(),
      poolFallback: 0, ev: 0, prevLeader: -1, leaderSinceMs: 0, lingerTarget: -1, lingerUntilMs: 0 };
    // Mean drawn body length (px) over the field — the racer-length unit for the arc-distance
    // bound (parity with the browser). Computed once per race (bodies are fixed per racer).
    const govMeanBodyLen = (() => {
      let sum = 0,
        n = 0;
      for (const r of racers) {
        if (r.drawnBodyLengthPx > 0) {
          sum += r.drawnBodyLengthPx;
          n++;
        }
      }
      return n > 0 ? sum / n : 0;
    })();

    // ── Governor tail-lift / field-shape metrics (Stage C; reporting only, feeds the sweep) ─
    // In TRUE RACER-LENGTHS (arc-distance / body length — lap-count- + track-independent):
    // leader→median and leader→2nd (both now DIAGNOSTIC field-shape measures — the governor's
    // active signal is the BEHIND-median gap after the leader-brake was retired; these are kept
    // for the later tip-leash + the sweep), plus field-length p90−p10 and a position-change rate
    // (adjacent rank swaps/step) so the "liveliness returned" gate is measurable.
    const govLenScale = govMeanBodyLen > 0 ? pathLengthPx / govMeanBodyLen : 0;
    let govGapLenSum = 0; // leader→median, racer-lengths
    let govGapLenSteps = 0;
    let govGapLenMax = 0;
    let govGap2ndLenSum = 0; // leader→2nd, racer-lengths (diagnostic)
    let govFieldLenSum = 0; // field p90−p10, racer-lengths
    let govRankSwaps = 0; // adjacent t-order swaps between steps (position-change rate)
    let govRankSwapSteps = 0;
    let govPrevOrder = null; // previous step's live-racer index order (by t)

    // ── Front-action observer state (--front-action; read-only) ───────────────
    // Pre-OUTCOME P1/top-3 churn + per-racer front-running fractions. All gated on the
    // flag: when off the Sets/Maps stay null and the per-step block below is skipped,
    // so a no-flag run does zero extra work and is byte-identical.
    let   faSteps            = 0;   // pre-OUTCOME steps observed
    let   faLeadChanges      = 0;   // P1 identity changes step-to-step
    let   faPrevP1           = -1;  // previous step's P1 racer index
    const faP1Set            = frontAction ? new Set() : null; // distinct P1 holders
    const faP1StepsByIdx     = frontAction ? new Map() : null; // index → steps spent in P1
    const faTop3StepsByIdx   = frontAction ? new Map() : null; // index → steps spent in top-3
    let   faPrevTop3         = null; // previous step's ordered top-3 indices
    let   faTop3ShuffleCount = 0;   // steps where the ordered top-3 changed
    let   faTop3CompareSteps = 0;   // steps compared against a previous top-3

    // ── STRIP-DOWN dual-window observer state (--strip-metrics; read-only) ─────
    // Two separate action windows: PULK [0.25,0.55) and OUTCOME [0.55,1.0). Plus worst-case
    // assigned-winner tracking (rank entering OUTCOME + late-surge proxy) and a per-racer
    // areaBonus sample for the bonus↔leader correlation. Gated on the flag → no-flag = byte-identical.
    const mkWin = () => ({ steps: 0, leadChanges: 0, prevP1: -1, p1Set: new Set(),
      p1Steps: new Map(), top3Steps: new Map(), prevTop3: null, shuffle: 0, compareSteps: 0,
      curP1: -1, curSince: 0, confirmed: -1, cleanOv: 0, chargerDepths: [] });
    const smRankAt025 = STRIP_METRICS ? new Map() : null; // index → live rank at PULK entry (~0.25); charger start-depth
    const smPulk = STRIP_METRICS ? mkWin() : null; // action window 0.25→0.55
    const smOut  = STRIP_METRICS ? mkWin() : null; // action window 0.55→1.0
    const smAreaSample = STRIP_METRICS ? new Map() : null; // index → areaBonusMult sampled once in PULK
    // Assigned winner = the racer with targetRank 1 (null when no plan / not passed).
    let   smWinnerIdx = -1;
    if (STRIP_METRICS && racerTargetRankMap) {
      for (const [idx, rank] of racerTargetRankMap.entries()) if (rank === 1) { smWinnerIdx = idx; break; }
    }
    let   smWinnerRankAt025    = null; // winner's live rank at PULK start (0.25) — is he already deep before the scramble?
    let   smWinnerRankAt050    = null; // winner's live rank at PULK end (0.50) — did the PULK contest push him deep?
    let   smWinnerRankAt055    = null; // winner's live rank at the first OUTCOME step (far back = drew badly)
    let   smWinnerMaxTraj      = 1.0;  // winner's peak trajectoryMult during OUTCOME (late-surge proxy)
    let   smWinnerOutcomeSteps = 0;    // winner OUTCOME steps observed
    let   smWinnerCeilSteps    = 0;    // winner OUTCOME steps at controller ceiling (≥1.09 = straining)
    // Naturalness: does an action tool push a racer's speed past the +8% natural re-roll ceiling?
    // natFactor = spreadFactor × tool mults (governor boost/brake + areaBonus), excluding
    // the row bonus (0 in PULK anyway) and drafting/brake physics. >1.08 = faster than the fastest
    // natural (re-roll-only) racer → the eye may read "too fast". Sampled over PULK racer-steps.
    const NAT_CEIL    = BASE_SPEED_MAX / BASE_SPEED_MEAN; // natural re-roll ceiling (max spreadFactor ≈ 1.081)
    let   smNatMax    = 1.0;
    let   smNatSteps  = 0;
    let   smNatExceed = 0; // racer-steps whose speed factor beats the natural ceiling (tool over-speed)

    // ── ACTION-METRICS observer state (--action-metrics; read-only) ────────────
    // Whole-field movement inside the PULK window [pulkStartLive, pulkEndLive). All gated on the
    // flag → no-flag = zero extra work = byte-identical. NAT_CEIL (above) is reused for maxSpeedFactor.
    const amStartRank = ACTION_METRICS ? new Map() : null; // index → live rank at first window frame
    const amEndRank   = ACTION_METRICS ? new Map() : null; // index → live rank at last window frame
    const amMinRank   = ACTION_METRICS ? new Map() : null; // index → best (lowest) rank in window
    const amMaxRank   = ACTION_METRICS ? new Map() : null; // index → worst (highest) rank in window
    const amTop5      = ACTION_METRICS ? new Set() : null; // distinct racers who held a top-5 position
    const amP1Steps   = ACTION_METRICS ? new Map() : null; // index → window steps spent at rank 1 (corrP1)
    let   amPrevRank  = null;  // Map(index → rank) from the previous window frame (for swap counting)
    let   amFrames    = 0;     // window frames observed
    let   amSwaps     = 0;     // adjacent rank-order swaps summed over the window (raw reshuffle volume)
    let   amSpreadSum = 0;     // sum over frames of the p10→p90 on-track distance (racer-lengths)
    let   amNatMax    = 1.0;   // peak spreadFactor × tool mults in the PULK window (naturalness)

    while (finishedCount < nRacers && raceTs < maxTime) {
      raceTs += DT;

      // ── Monotonic leader track-progress [0,1] — drives WHEN phases switch (mirrors index.jsx) ──
      // Computed once per step before Pass 1 so the pulk-bias hook and the controller-pass
      // share the same value (Pass 1 never mutates r.t).
      {
        let _leaderT = -Infinity;
        for (const r of racers) { if (!r.finished && r.t > _leaderT) _leaderT = r.t; }
        const _rawProgress = _leaderT > -Infinity ? _leaderT / finishT : 0;
        if (_leaderT > -Infinity) raceProgress = Math.min(1, Math.max(raceProgress, _rawProgress));
      }

      // ── Pass 1: re-rolls + spreadFactor transitions + baseSpeed update ─────────
      const spreadRange = (BASE_SPEED_MAX - BASE_SPEED_MIN) / BASE_SPEED_MEAN;
      const halfWidth   = spreadRange * (dynamicsConfig.reRollVariationPercent / 100);
      for (const r of racers) {
        if (r.finished) continue;
        if (raceTs >= r.nextRollTime && raceTs < lastRollDeadline) {
          // Re-roll TARGET draw. Variant 1 (default) = byte-identical step from the current value.
          // Variant 2 = mean-reverting wander: pull the current advantage a fraction v toward a fresh
          // uniform draw over the natural band. Only the target math differs; the easeInOutCubic
          // transition + band clamp below are shared by both variants.
          const rawTarget = REROLL_VARIANT === 2
            ? r.spreadFactor +
                (dynamicsConfig.reRollVariationPercent / 100) *
                  (((BASE_SPEED_MIN + Math.random() * (BASE_SPEED_MAX - BASE_SPEED_MIN)) / BASE_SPEED_MEAN) - r.spreadFactor)
            : r.spreadFactor + (Math.random() - 0.5) * 2 * halfWidth;
          // PULK cohesion bias (the always-on field-cohesion mechanism; no-op outside PULK / for
          // non-pulk racers). Active whenever the Race Plan controller is running.
          const biasedTarget = racePlanController
            ? racePlanController.computePulkBiasedTarget(
                r.index, rawTarget,
                BASE_SPEED_MIN / BASE_SPEED_MEAN,
                BASE_SPEED_MAX / BASE_SPEED_MEAN,
                racers, raceTs, raceProgress
              )
            : rawTarget;
          const newTarget   = Math.max(
            BASE_SPEED_MIN / BASE_SPEED_MEAN,
            Math.min(BASE_SPEED_MAX / BASE_SPEED_MEAN, biasedTarget)
          );
          r.spreadFactorPrev    = r.spreadFactor;
          r.spreadFactorTarget  = newTarget;
          r.transitionStartTime = raceTs;
          const jOff = (Math.random() - 0.5) * 2 * rollInterval * 0.2;
          r.nextRollTime = raceTs + rollInterval + jOff;
          r.rerollCount++;
        }
        const elapsed = raceTs - r.transitionStartTime;
        if (elapsed < r.transitionDuration) {
          const prog = elapsed / r.transitionDuration;
          r.spreadFactor = r.spreadFactorPrev + (r.spreadFactorTarget - r.spreadFactorPrev) * easeInOutCubic(prog);
          r.baseSpeed    = race_baseSpeed * speedMultiplier * r.spreadFactor * r.speedBonusMult;
        }

        // v4: smooth bonus-level transition triggered by threshold crossing
        if (V4_ACTIVE && isOpen && r.startRowIndex > 0) {
          const v4El = raceTs - r.v4BonusTransitionStart;
          if (v4El >= 0 && v4El < r.v4BonusTransitionDuration) {
            r.v4BonusMult = r.v4BonusMultPrev + (r.v4BonusMultTarget - r.v4BonusMultPrev) * easeInOutCubic(v4El / r.v4BonusTransitionDuration);
          } else if (v4El >= r.v4BonusTransitionDuration) {
            r.v4BonusMult = r.v4BonusMultTarget;
          }
        }
      }

      // ── Controller-Pass: write trajectoryMultTarget (Race Plan only) ────────
      if (racePlanController) {
        racePlanController.update(racers, raceTs, raceProgress);
        // easeInOutCubic transition — mirrors index.jsx pattern, same parameters
        const TT_DUR_MS = dynamicsConfig.trajectoryTransitionDuration * 1000;
        for (const r of racers) {
          const elapsed = raceTs - r.trajectoryMultTransStart;
          r.trajectoryMult =
            elapsed < TT_DUR_MS
              ? r.trajectoryMultPrev +
                (r.trajectoryMultTarget - r.trajectoryMultPrev) *
                  easeInOutCubic(elapsed / TT_DUR_MS)
              : r.trajectoryMultTarget;
        }
      } else {
        for (const r of racers) r.trajectoryMult = 1.0;
      }

      // ── STRIP-DOWN: areaBonus phase-split (read-only; sim-only; --areaBonusPulk/Post) ──
      // Re-scale the controller's areaBonusMult to a phase-dependent STRENGTH: areaBonusPulk before
      // PULK-end (0.5), areaBonusPost from 0.5 on. Because the plan was built at AREA_REF_STRENGTH
      // (=BONUS_MULT) and the band delta scales linearly with strength, scale = phaseStrength/ref.
      // The scale commutes with the transEnd fade (both linear in areaBonusMult−1), so the fade shape
      // is preserved. Inactive (no flag) → untouched → byte-identical.
      if (AREA_SPLIT_ACTIVE) {
        const inPulkPhase = raceProgress >= pulkStartLive && raceProgress < pulkEndLive;
        if (AREA_PULK_GATE_ACTIVE && inPulkPhase) {
          // POSITION-GATED PULK areaBonus: strength depends on each racer's CURRENT on-track rank —
          // off up front (unpredictable), full when deep (rescue the stranded winner). Naturalness cap
          // stays on: the washed racer's spreadFactor × areaBonusMult is bounded at the natural ceiling.
          const NAT_CEIL_LOCAL = BASE_SPEED_MAX / BASE_SPEED_MEAN;
          const order = racers.filter((r) => !r.finished).sort((a, b) => b.t - a.t); // desc by t
          const rankOf = new Map(order.map((r, i) => [r.index, i + 1]));
          for (const r of racers) {
            const rank = rankOf.get(r.index) ?? racers.length;
            const strength = rank <= AREA_PULK_GATE_HIGH ? 0
                           : rank <= AREA_PULK_GATE_LOW  ? AREA_PULK_FULL * 0.5
                           :                               AREA_PULK_FULL;
            const scale = AREA_REF_STRENGTH > 0 ? strength / AREA_REF_STRENGTH : 0;
            r.areaBonusMult = 1 + (r.areaBonusMult - 1) * scale;
            // Naturalness safety cap: bound the FULL PULK speed product (spreadFactor × governor ×
            // areaBonus) at the natural ceiling. The governor updates AFTER this block, so
            // use this frame's governorMult (last frame's value) plus its max per-frame slew, so the wash
            // shrinks to ~0 for a racer already governor-boosted (they can't be washed AND boosted over
            // the ceiling). Deep, un-featured racers (governorMult ≈ 1) still get the full wash.
            if (r.spreadFactor > 0) {
              const govSlew = (r.governorMult ?? 1) + (dynamicsConfig.governorMaxStepPerFrame ?? 0.01);
              const otherMults = r.spreadFactor * Math.max(govSlew, 1e-6);
              r.areaBonusMult = Math.min(r.areaBonusMult, NAT_CEIL_LOCAL / otherMults);
            }
          }
        } else {
          // 3-phase: chaos (<pulkStart) → EARLY, PULK (pulkStart..pulkEnd) → PULK, post (≥pulkEnd) →
          // POST. EARLY defaults to PULK when --areaBonusEarly is absent, collapsing to the prior
          // 2-phase behaviour (byte-identical). Boundaries follow the live plan phase fractions.
          const phaseStrength = raceProgress < pulkStartLive ? AREA_BONUS_EARLY
                              : raceProgress < pulkEndLive   ? AREA_BONUS_PULK
                              :                                AREA_BONUS_POST;
          const scale = AREA_REF_STRENGTH > 0 ? phaseStrength / AREA_REF_STRENGTH : 0;
          for (const r of racers) r.areaBonusMult = 1 + (r.areaBonusMult - 1) * scale;
        }
      }

      const govPhase =
        governorEnabled ? racePlanController.getPhase(raceTs, raceProgress) : null;
      // Field median for the READ-ONLY field-shape telemetry below (the director mechanism uses
      // the live rank sort + gap-to-leader, not the median).
      const govMedianT = governorEnabled ? simMedianT(racers) : null;

      // ── Pre-OUTCOME contest-injector "director" (default OFF) ──
      if (governorEnabled && govFractions) {
        applyGovernor(
          racers,
          finishT,
          govPhase,
          { progress: raceProgress, pulkEndFrac: govFractions.pulkEndFrac, corrStartFrac: govFractions.corrStartFrac, seed: govSeed, pathLengthPx, meanBodyLen: govMeanBodyLen, isOpen, currentMs: raceTs, dirState },
          govCfg
        );
        // Field-shape metrics (reporting only), in TRUE RACER-LENGTHS: leader→median + leader→2nd
        // + field p90−p10 + rank-swap rate. Diagnostics only — not part of the director mechanism.
        if (govPhase && govLenScale > 0 && govMedianT !== null) {
          const live = racers.filter((r) => !r.finished).sort((a, b) => b.t - a.t); // desc by t
          if (live.length > 1) {
            const nLive = live.length;
            const leaderT = live[0].t;
            const secondT = live[1].t;
            const gapLen = arcT(leaderT, govMedianT, isOpen) * govLenScale; // leader→median
            govGapLenSum += gapLen;
            govGap2ndLenSum += arcT(leaderT, secondT, isOpen) * govLenScale;
            govGapLenSteps += 1;
            if (gapLen > govGapLenMax) govGapLenMax = gapLen;
            const p = (frac) => live[Math.min(nLive - 1, Math.floor(frac * (nLive - 1)))].t;
            govFieldLenSum += arcT(p(0.1), p(0.9), isOpen) * govLenScale; // p0.1(top) − p0.9(back)
            // Position-change rate: adjacent-rank swaps vs the previous step's order.
            const order = live.map((r) => r.index);
            if (govPrevOrder) {
              const posPrev = new Map(govPrevOrder.map((idx, i) => [idx, i]));
              let swaps = 0;
              for (let i = 0; i < order.length; i++) {
                const pp = posPrev.get(order[i]);
                if (pp !== undefined && pp !== i) swaps++;
              }
              govRankSwaps += swaps;
              govRankSwapSteps += 1;
            }
            govPrevOrder = order;
          }
        }
      }

      // ── Front-action observer (--front-action; read-only, pre-OUTCOME window) ──
      // Same window the breakaway diag / governor use: progress < corridorStart. Counts
      // P1 lead changes + distinct P1 holders + top-3 podium shuffle, and per-racer time
      // at the front — the owner's priority-1 "contested, lead-changing front" signal. No
      // force, no state written back to racers; pure observation (mirrors the governor's own
      // live-order read at :894). Front-reach gaps are reused from the governor block above.
      if (frontAction && raceProgress < BREAKAWAY_CORRIDOR_START) {
        const live = racers.filter((r) => !r.finished).sort((a, b) => b.t - a.t); // desc by t
        if (live.length > 0) {
          faSteps++;
          const p1 = live[0].index;
          if (faPrevP1 >= 0 && p1 !== faPrevP1) faLeadChanges++;
          faPrevP1 = p1;
          faP1Set.add(p1);
          faP1StepsByIdx.set(p1, (faP1StepsByIdx.get(p1) ?? 0) + 1);
          const nTop = Math.min(3, live.length);
          const top3 = [];
          for (let i = 0; i < nTop; i++) {
            const idx = live[i].index;
            top3.push(idx);
            faTop3StepsByIdx.set(idx, (faTop3StepsByIdx.get(idx) ?? 0) + 1);
          }
          if (faPrevTop3) {
            const changed = top3.length !== faPrevTop3.length ||
              top3.some((idx, i) => idx !== faPrevTop3[i]);
            if (changed) faTop3ShuffleCount++;
            faTop3CompareSteps++;
          }
          faPrevTop3 = top3;
        }
      }

      // ── STRIP-DOWN dual-window observer (--strip-metrics; read-only) ───────────
      // Same pre-Pass-2 live-order read as front-action, but split into two pinned windows and
      // extended with worst-case-winner tracking. Pure observation; nothing written back to racers.
      if (STRIP_METRICS) {
        const inPulk = raceProgress >= SD_PULK_START && raceProgress < SD_CORR_START;
        const inOut  = raceProgress >= SD_CORR_START && raceProgress < 1.0;
        if (inPulk || inOut) {
          const live = racers.filter((r) => !r.finished).sort((a, b) => b.t - a.t); // desc by t
          if (live.length > 0) {
            const W = inPulk ? smPulk : smOut;
            // Snapshot each racer's rank at PULK entry (first PULK step) → charger start-depth reference.
            if (inPulk && smRankAt025.size === 0) live.forEach((r, i) => smRankAt025.set(r.index, i + 1));
            W.steps++;
            const p1 = live[0].index;
            if (W.prevP1 >= 0 && p1 !== W.prevP1) W.leadChanges++;
            W.prevP1 = p1;
            // Hold-based clean overtake: confirm a leader once it holds P1 ≥ SM_HOLD_MS, and count a
            // clean pass each time the CONFIRMED leader changes. A flicker P1 (held < SM_HOLD_MS) never
            // confirms, so it is not counted — this separates real passes from the boiling-front flicker.
            if (p1 !== W.curP1) { W.curP1 = p1; W.curSince = raceTs; }
            if (raceTs - W.curSince >= SM_HOLD_MS && W.confirmed !== p1) {
              // A new racer has held P1 ≥ SM_HOLD_MS = a clean overtake. Record how deep this charger
              // started (its rank at PULK entry) — a deep start reaching P1 = a visible charge.
              if (W.confirmed >= 0) { W.cleanOv++; if (inPulk) W.chargerDepths.push(smRankAt025.get(p1) ?? null); }
              W.confirmed = p1;
            }
            W.p1Set.add(p1);
            W.p1Steps.set(p1, (W.p1Steps.get(p1) ?? 0) + 1);
            const nTop = Math.min(3, live.length);
            const top3 = [];
            for (let i = 0; i < nTop; i++) {
              const idx = live[i].index;
              top3.push(idx);
              W.top3Steps.set(idx, (W.top3Steps.get(idx) ?? 0) + 1);
            }
            if (W.prevTop3) {
              const changed = top3.length !== W.prevTop3.length || top3.some((idx, i) => idx !== W.prevTop3[i]);
              if (changed) W.shuffle++;
              W.compareSteps++;
            }
            W.prevTop3 = top3;
            // areaBonus sample: capture each racer's applied areaBonusMult once, during PULK.
            if (inPulk) for (const r of racers) if (!smAreaSample.has(r.index)) smAreaSample.set(r.index, r.areaBonusMult);
            // Naturalness (PULK-proper [0.25,0.5) only — before the areaBonus restore at 0.5, so this
            // isolates the ACTION TOOLS' contribution cleanly): re-roll advantage × tool mults. In this
            // window bonuses are 0, so natFactor = spreadFactor × governor × areaBonus. >1.08 = a tool
            // pushed the racer past the natural re-roll ceiling (max spreadFactor ≈ 1.081).
            if (inPulk && raceProgress < SD_PULK_END) for (const r of racers) if (!r.finished) {
              const nf = r.spreadFactor * (r.governorMult ?? 1.0) * (r.areaBonusMult ?? 1.0);
              smNatSteps++;
              if (nf > smNatMax) smNatMax = nf;
              if (nf > NAT_CEIL * 1.001) smNatExceed++; // > natural ceiling (+0.1% float margin) = tool over-speed
            }
            // Assigned-winner journey: capture his live rank at PULK start (0.25) and PULK end (0.50)
            // so we can see whether he starts deep or the PULK contest buries him.
            if (smWinnerIdx >= 0) {
              const wrank = live.findIndex((r) => r.index === smWinnerIdx) + 1; // 0 if finished/not live
              if (smWinnerRankAt025 === null && raceProgress >= SD_PULK_START) smWinnerRankAt025 = wrank;
              if (smWinnerRankAt050 === null && raceProgress >= SD_PULK_END) smWinnerRankAt050 = wrank;
            }
            // Worst-case assigned winner: rank entering OUTCOME + peak controller boost (late surge).
            if (smWinnerIdx >= 0 && inOut) {
              const w = racers.find((r) => r.index === smWinnerIdx);
              if (w && !w.finished) {
                if (smWinnerRankAt055 === null) smWinnerRankAt055 = live.findIndex((r) => r.index === smWinnerIdx) + 1;
                smWinnerOutcomeSteps++;
                if (w.trajectoryMult > smWinnerMaxTraj) smWinnerMaxTraj = w.trajectoryMult;
                if (w.trajectoryMult >= 1.09) smWinnerCeilSteps++;
              }
            }
          }
        }
      }

      // ── ACTION-METRICS observer (--action-metrics; read-only, PULK window) ──────
      // Whole-field, both-directions movement in [pulkStartLive, pulkEndLive). No P1-only,
      // no hold requirement. Pure observation on the pre-Pass-2 live order.
      if (ACTION_METRICS && raceProgress >= pulkStartLive && raceProgress < pulkEndLive) {
        const order = racers
          .filter((r) => !r.finished)
          .sort((a, b) => (b.t !== a.t ? b.t - a.t : a.index - b.index)); // rank 1 = leader
        const n = order.length;
        if (n > 0) {
          amFrames++;
          const curRank = new Map();
          for (let i = 0; i < n; i++) {
            const idx = order[i].index;
            const rank = i + 1;
            curRank.set(idx, rank);
            if (!amStartRank.has(idx)) amStartRank.set(idx, rank);
            amEndRank.set(idx, rank);
            const mn = amMinRank.get(idx); if (mn === undefined || rank < mn) amMinRank.set(idx, rank);
            const mx = amMaxRank.get(idx); if (mx === undefined || rank > mx) amMaxRank.set(idx, rank);
            if (rank <= 5) amTop5.add(idx);
            if (rank === 1) amP1Steps.set(idx, (amP1Steps.get(idx) ?? 0) + 1);
          }
          // Adjacent rank-order swaps vs the previous window frame (O(n) reshuffle volume): an
          // adjacent pair in the CURRENT order that stood in the OPPOSITE order last frame = 1 swap.
          if (amPrevRank) {
            for (let i = 0; i < n - 1; i++) {
              const a = amPrevRank.get(order[i].index);
              const b = amPrevRank.get(order[i + 1].index);
              if (a !== undefined && b !== undefined && a > b) amSwaps++;
            }
          }
          amPrevRank = curRank;
          // p10→p90 on-track spread in racer-lengths (front-percentile minus back-percentile racer).
          const p10 = order[Math.floor(0.1 * (n - 1))];
          const p90 = order[Math.floor(0.9 * (n - 1))];
          amSpreadSum += (p10.t - p90.t) * govLenScale;
          // PULK naturalness (same natFactor as strip-metrics; director is off in this sweep anyway).
          for (const r of racers) if (!r.finished) {
            const nf = r.spreadFactor * (r.governorMult ?? 1.0) * (r.areaBonusMult ?? 1.0);
            if (nf > amNatMax) amNatMax = nf;
          }
        }
      }

      // ── Δ5s ring buffers: sample trajectoryMult during OUTCOME for oscillation detection ──
      if (racePlanController && racePlanController.getPhase(raceTs, raceProgress) === 'OUTCOME') {
        for (const r of racers) {
          if (r.finished) continue;
          let ring = tmRings.get(r.index);
          if (!ring) {
            ring = { buf: new Float32Array(TM_RING_SIZE).fill(1.0), idx: 0 };
            tmRings.set(r.index, ring);
          }
          ring.buf[ring.idx % TM_RING_SIZE] = r.trajectoryMult;
          ring.idx++;
        }
      }

      // ── Jerk metric: computed in stable phase, after baseSpeed/trajectoryMult set ──
      if (raceTs >= stablePhaseStartMs && raceTs <= stablePhaseEndMs) {
        natStableFrames++;
        for (const r of racers) {
          if (r.finished) continue;
          const effSpeed = r.baseSpeed * r.trajectoryMult;
          const prev     = natPrevEffSpeed.get(r.index);
          if (prev !== undefined) {
            const jerkStep = Math.abs(effSpeed - prev) / DT / Math.max(r.baseSpeed, JERK_BASESPEED_EPSILON);
            natJerkSum += jerkStep;
            natJerkMax  = Math.max(natJerkMax, jerkStep);
            natJerkSteps++;
            if (jerkStep > JERK_HIGH_THRESHOLD) natJerkHighCount++;
          }
          natPrevEffSpeed.set(r.index, effSpeed);
        }
      }
      // Save pre-Pass-2 t values for overtake detection
      for (const r of racers) natPrevT.set(r.index, r.t);

      // ── Pass 2: t-update (mirrors index.jsx RACING loop) ─────────────────────
      const effectiveBrakeFactor = computeEffectiveBrakeFactor(behaviorConfig, isOpen, raceTs);
      // TEF v3: per-frame meanT of Row-0 (computed once, used per-racer below)
      let tefMeanT0 = 0;
      if (TEF_ACTIVE && TEF_BASE_BONUS !== null && (!TEF_OPEN_ONLY || isOpen)) {
        const row0Live = racers.filter((q) => q.startRowIndex === 0 && !q.finished);
        tefMeanT0 = row0Live.length > 0
          ? row0Live.reduce((s, q) => s + q.t, 0) / row0Live.length
          : 0;
      }
      for (const r of racers) {
        if (!r.finished) {
          const boost = r.draftingBoostActive ? behaviorConfig.draftingBoost : 1.0;
          // Sim-Browser Parity: mirror the Step-1 min() from index.jsx so the sim
          // accurately reflects brake-to-match behavior (report 07 parity fix).
          const brake = r.avoidanceActive
            ? Math.min(effectiveBrakeFactor, r.brakeMatchFactor ?? effectiveBrakeFactor)
            : 1.0;
          // TEF v3: scale down the aggressive bonus proportionally as racer closes the tStart gap.
          let tefMult = 1.0;
          if (TEF_ACTIVE && TEF_BASE_BONUS !== null && (!TEF_OPEN_ONLY || isOpen) && r.initialGap > 0) {
            const curGap   = tefMeanT0 - r.t;
            const gapRatio = Math.max(0, Math.min(1, curGap / r.initialGap));
            const targetBonusMult = 1.0 + (r.initialSpeedBonusMult - 1.0) * gapRatio;
            tefMult = targetBonusMult / r.initialSpeedBonusMult;
          }
          // STRIP-DOWN: start-row speed-bonus phase envelope (read-only; sim-only). baseSpeed bakes in
          // the FULL speedBonusMult (=1+rawRowBonus); rowEnvMult corrects it to the phase strength s:
          // effective speedBonusMult = 1 + rawRowBonus·s → envMult = (1+rawRowBonus·s)/(1+rawRowBonus).
          // s = early (chaos <pulkStart) / pulk (pulkStart..pulkEnd) / post (≥pulkEnd), following the
          // live plan phase fractions. Inactive → 1.0 → byte-identical.
          let rowEnvMult = 1.0;
          if (ROW_SPLIT_ACTIVE && r.rawRowBonus > 0) {
            const s = raceProgress < pulkStartLive ? ROW_BONUS_EARLY
                    : raceProgress < pulkEndLive   ? ROW_BONUS_PULK
                    :                                ROW_BONUS_POST;
            rowEnvMult = (1 + r.rawRowBonus * s) / (1 + r.rawRowBonus);
          }
          // trajectoryMult + areaBonusMult + governorMult: all 1.0 when inactive
          r.t +=
            r.baseSpeed * boost * brake * tefMult * rowEnvMult * r.v4BonusMult * r.trajectoryMult * r.areaBonusMult * (r.governorMult ?? 1.0) * (DT / 16);
        }
      }

      // ── Breakaway causal diagnostic (--breakaway-diag; read-only) ────────────
      // Pure observation on the post-Pass-2 t values with this frame's multipliers
      // still in place. Records the leader's gap to the field median (single source:
      // computeMedianT) and to 2nd place, binned by progress, and captures the
      // pre-OUTCOME peak-gap frame (who + why). No mutation of race state.
      if (breakawayDiag) {
        let leader = null, second = null;
        for (const r of racers) {
          if (r.finished) continue;
          if (!leader || r.t > leader.t) { second = leader; leader = r; }
          else if (!second || r.t > second.t) { second = r; }
        }
        if (leader) {
          const medT   = simMedianT(racers);
          const gapMed = medT !== null && finishT > 0 ? (leader.t - medT) / finishT : 0;
          const gap2nd = second && finishT > 0 ? (leader.t - second.t) / finishT : 0;
          // 5% progress bins — record each bin at its first crossing (raceProgress is
          // the monotonic start-of-frame leader progress computed at the top of the loop).
          while (bkNextBin <= 20 && raceProgress >= bkNextBin * 0.05) {
            bkGapBins.push({
              bin:       +(bkNextBin * 0.05).toFixed(2),
              progress:  +raceProgress.toFixed(4),
              gapMedian: +gapMed.toFixed(5),
              gap2nd:    +gap2nd.toFixed(5),
              leaderIdx: leader.index,
            });
            bkNextBin++;
          }
          // Peak pre-OUTCOME gap-to-median + decomposition of the leader's multipliers.
          if (raceProgress < BREAKAWAY_CORRIDOR_START && gapMed > bkPeakGap) {
            bkPeakGap        = gapMed;
            bkPeakProgress   = raceProgress;
            bkPeakLeaderIdx  = leader.index;
            bkPeakGap2nd     = gap2nd;
            bkPeakDecomp = {
              spreadFactor:   +leader.spreadFactor.toFixed(4),   // base-speed spread/re-roll component
              speedBonusMult: +(leader.speedBonusMult ?? 1.0).toFixed(4),
              areaBonusMult:  +(leader.areaBonusMult ?? 1.0).toFixed(4),
            };
          }
        }
      }

      // ── Post-Pass-2: overtake detection + pulk state ─────────────────────────
      if (raceTs >= stablePhaseStartMs && raceTs <= stablePhaseEndMs) {
        // Overtake detection (O(n²), stable phase only)
        const refGap = finishT > 0 ? finishT / nRacers : 0.001;
        for (let a = 0; a < racers.length - 1; a++) {
          const ra = racers[a];
          if (ra.finished) continue;
          const raPrev = natPrevT.get(ra.index) ?? ra.t;
          for (let b = a + 1; b < racers.length; b++) {
            const rb = racers[b];
            if (rb.finished) continue;
            const rbPrev = natPrevT.get(rb.index) ?? rb.t;
            // ra overtook rb
            if (raPrev <= rbPrev && ra.t > rb.t) {
              natOvertakeCount++;
              if (rbPrev - raPrev <= refGap * 0.3) natNaturalOvertakeCount++;
            }
            // rb overtook ra
            else if (rbPrev <= raPrev && rb.t > ra.t) {
              natOvertakeCount++;
              if (raPrev - rbPrev <= refGap * 0.3) natNaturalOvertakeCount++;
            }
          }
        }
      }
      // Pulk state (any time — window check uses absolute ms)
      {
        const active = racers.filter((r) => !r.finished).sort((a, b) => b.t - a.t);
        let isPulk = false;
        for (let i = 0; i + 2 < active.length; i++) {
          if (active[i].t - active[i + 2].t <= PULK_T_THRESHOLD) { isPulk = true; break; }
        }
        if (raceTs >= stablePhaseStartMs && raceTs <= stablePhaseEndMs && isPulk) natPulkFrames++;
        if (!natPulkWasActive && isPulk) {
          if (raceTs >= pulkWindowStartMs && raceTs <= pulkWindowEndMs) natPulkTriggersInWindow++;
          else natPulkTriggersOutOfWindow++;
        }
        natPulkWasActive = isPulk;
      }

      // Phase-3B: COMEBACK rank tracking (during OUTCOME phase)
      if (cbCfg && racePlanController) {
        const phase     = racePlanController.getPhase(raceTs, raceProgress);
        const isOutcome = phase === 'OUTCOME';

        if (isOutcome && cbOutcomeStartMs === null)                              cbOutcomeStartMs = raceTs;
        if (!isOutcome && cbOutcomeStartMs !== null && cbOutcomeEndMs === null)  cbOutcomeEndMs   = raceTs;

        if (cbEndgameStartMs === null) {
          let leaderT = -Infinity;
          for (const r of racers) { if (!r.finished && r.t > leaderT) leaderT = r.t; }
          if (finishT > 0 && leaderT / finishT >= cbCfg.endgameThresh) cbEndgameStartMs = raceTs;
        }

        if (isOutcome) {
          const active  = racers.filter((r) => !r.finished).sort((a, b) => b.t - a.t);
          const rankMap = new Map(active.map((r, i) => [r.index, i + 1]));
          const windowMs = cbCfg.windowSec * 1000;
          const cutoff   = raceTs - windowMs;

          for (const b1Idx of cbCfg.b1Indices) {
            const racer = racers[b1Idx];
            if (!racer || racer.finished) continue;
            const currentRank = rankMap.get(b1Idx) ?? 999;
            if (!cbRankHistory.has(b1Idx)) cbRankHistory.set(b1Idx, []);
            const hist = cbRankHistory.get(b1Idx);
            hist.push({ ts: raceTs, rank: currentRank });
            while (hist.length > 1 && hist[0].ts < cutoff) hist.shift();

            if (hist.length >= 2) {
              const gain = hist[0].rank - currentRank; // positive = positions gained
              if (gain > (cbMaxGainByRacer.get(b1Idx) ?? 0)) cbMaxGainByRacer.set(b1Idx, gain);
              if (gain >= cbCfg.minPositions) {
                const lastTs = cbLastTriggerTs.get(b1Idx) ?? -Infinity;
                if (raceTs - lastTs > windowMs) {
                  cbTriggers.push({ ts: raceTs / 1000, racerIdx: b1Idx, name: racer.name, gain });
                  cbLastTriggerTs.set(b1Idx, raceTs);
                }
              }
            }
          }
        }
      }

      // Mixing-quota snapshot: taken at the first frame at or after avoidanceWarmupMs
      if (!warmupMeasured && isOpen && raceTs >= behaviorConfig.avoidanceWarmupMs) {
        const row0Ts   = racers.filter((r) => r.startRowIndex === 0 && !r.finished).map((r) => r.t);
        const row1     = racers.filter((r) => r.startRowIndex === 1);
        const minRow0T = row0Ts.length > 0 ? Math.min(...row0Ts) : Infinity;
        const mixed    = row1.filter((r) => r.t > minRow0T).length;
        mixingQuota    = row1.length > 0 ? mixed / row1.length : null;
        warmupMeasured = true;
      }

      // v4: overtake detection + threshold check
      if (V4_ACTIVE && isOpen && v4Row1Total > 0) {
        if (V4_METRIC_TYPE === 'physical_overtake') {
          // Physical overtake: r1 must have been laterally close and behind r0 before crossing ahead.
          for (const r1 of v4Row1Racers) {
            if (r1.finished) continue;
            for (const r0 of v4Row0Racers) {
              if (r0.finished) continue;
              const key = `${r1.index}:${r0.index}`;
              if (v4OvertakePairs.has(key)) continue; // already counted
              const dY = Math.abs(r1.physicalY - r0.physicalY);
              if (!v4WasNearBehind.has(key)) {
                // Check whether this pair is now "near and behind" (prerequisite phase)
                if (dY < V4_LATERAL_PROXIMITY && r1.t < r0.t) {
                  v4WasNearBehind.add(key);
                }
              } else {
                // Prerequisite met — did r1 now cross ahead in t?
                if (r1.t > r0.t) {
                  v4OvertakePairs.add(key);
                  v4HasOvertaken.add(r1.index);
                }
              }
            }
          }
        } else if (V4_METRIC_TYPE === 'per_racer') {
          // Per-racer metric: each non-Row-0 racer independently tracks its own overtake fraction
          // and triggers its own bonus reduction (ratchet — never reverts).
          for (const r of racers) {
            if (r.finished || r.startRowIndex === 0) continue;
            const racerThresholds = r.startRowIndex === 1 ? V4_ROW1_THRESHOLDS : V4_ROW2_THRESHOLDS;
            if (r.v4RacerThreshIdx >= racerThresholds.length) continue;
            const frontPool  = v4FrontPoolByRow?.get(r.startRowIndex) ?? v4Row0Racers;
            const totalFront = frontPool.length;
            if (totalFront === 0) continue;
            const aheadCount = frontPool.reduce((n, f) => n + (f.t < r.t ? 1 : 0), 0);
            const fraction   = aheadCount / totalFront;
            while (r.v4RacerThreshIdx < racerThresholds.length && fraction >= racerThresholds[r.v4RacerThreshIdx] / 100) {
              const toBonus = V4_BOOST_SCHEDULE[Math.min(r.v4RacerThreshIdx + 1, V4_BOOST_SCHEDULE.length - 1)];
              r.v4BonusMultPrev        = r.v4BonusMult;
              r.v4BonusMultTarget      = toBonus / V4_INITIAL_BOOST;
              r.v4BonusTransitionStart = raceTs;
              r.v4RacerThreshTimes.push(raceTs);
              r.v4RacerThreshIdx++;
            }
          }
        } else {
          // Legacy metric: r1.t > min(Row-0 t) — lax, t-value only
          const row0Live = v4Row0Racers.filter((r) => !r.finished);
          if (row0Live.length > 0) {
            const minRow0T = Math.min(...row0Live.map((r) => r.t));
            for (const r1 of v4Row1Racers) {
              if (!r1.finished && r1.t > minRow0T) v4HasOvertaken.add(r1.index);
            }
          }
        }

        // Trigger global threshold step-downs (skipped for per_racer which handles this per-racer)
        if (V4_METRIC_TYPE !== 'per_racer' && v4NextThreshIdx < V4_THRESHOLDS.length) {
          const fraction = v4Row1Total > 0 ? v4HasOvertaken.size / v4Row1Total : 0;
          while (v4NextThreshIdx < V4_THRESHOLDS.length && fraction >= V4_THRESHOLDS[v4NextThreshIdx] / 100) {
            const fromBonus = V4_BOOST_SCHEDULE[v4NextThreshIdx];
            const toBonus   = V4_BOOST_SCHEDULE[Math.min(v4NextThreshIdx + 1, V4_BOOST_SCHEDULE.length - 1)];
            v4ThreshLog.push({ threshold: V4_THRESHOLDS[v4NextThreshIdx], timeS: raceTs / 1000, fromBonus, toBonus });
            const newTarget = toBonus / V4_INITIAL_BOOST;
            for (const r of racers) {
              if (r.startRowIndex > 0 && !r.finished) {
                r.v4BonusMultPrev        = r.v4BonusMult;
                r.v4BonusMultTarget      = newTarget;
                r.v4BonusTransitionStart = raceTs;
              }
            }
            v4NextThreshIdx++;
          }
        }
      }

      // Diagnostic: save pre-frame state for lateral-push and brake-activation counting
      let diagPrevPhysY, diagPrevAvoidance;
      if (diagnosticMode) {
        diagPrevPhysY     = racers.map((r) => r.physicalY);
        diagPrevAvoidance = racers.map((r) => r.avoidanceActive);
      }
      computePositions();
      if (frameHook) _frameDiagOut.clear();
      applyRacerBehavior(racers, behaviorConfig, { currentTs: raceTs }, _frameDiagOut);
      if (frameHook) frameHook(raceTs, _frameDiagOut, racers);
      // Lite stats: always-on, low-overhead per-frame counters
      {
        for (let ri = 0; ri < racers.length; ri++) {
          const r = racers[ri];
          if (r.avoidanceActive && r.startRowIndex === 1) liteRow1BrakeFrames++;
          if (r.avoidanceActive && r.startRowIndex === 0) liteRow0BrakeFrames++;
          if (r.avoidanceActive && r.startRowIndex === 2) liteRow2BrakeFrames++;
          if (litePrevPhysY && Math.abs(r.physicalY - litePrevPhysY[ri]) > 1e-4) liteLateralMoves++;
        }
        if (!litePrevPhysY) litePrevPhysY = new Array(racers.length);
        for (let ri = 0; ri < racers.length; ri++) litePrevPhysY[ri] = racers[ri].physicalY;
        // Lateral quality: zigzag score (avg |Δv| per racer-frame, after 4s warmup)
        // Measures jerk-like lateral oscillation: large when params cause oscillation,
        // near-zero when motion is smooth. Sign reversals alone are misleading in a
        // dense pack since avoidance interactions cause frequent small-amplitude
        // direction changes even with well-tuned parameters.
        if (litePrevPhysYVel && raceTs > 4000) {
          for (let ri = 0; ri < racers.length; ri++) {
            if (!racers[ri].finished) {
              liteZigzagSum += Math.abs((racers[ri].physicalYVelocity ?? 0) - litePrevPhysYVel[ri]);
              liteZigzagFrames++;
            }
          }
        }
        if (!litePrevPhysYVel) litePrevPhysYVel = new Array(racers.length).fill(0);
        for (let ri = 0; ri < racers.length; ri++) litePrevPhysYVel[ri] = racers[ri].physicalYVelocity ?? 0;
        // Lateral quality: overlap rate + resolution
        // Skip the first 4 s — start-phase packing always produces overlaps before
        // avoidance kicks in; counting them would inflate overlapRate artificially.
        if (raceTs > 4000) for (let a = 0; a < racers.length; a++) {
          if (racers[a].finished) continue;
          for (let b = a + 1; b < racers.length; b++) {
            if (racers[b].finished) continue;
            const ra = racers[a], rb = racers[b];
            const dY = Math.abs(ra.physicalY - rb.physicalY);
            const dT = Math.abs(ra.t - rb.t);
            const pairKey = ra.index * 100 + rb.index;
            liteOverlapPairTotal++;
            if (dT < overlapThreshold_t && dY < overlapThreshold_y) {
              liteOverlapPairFrames++;
              liteOverlapPairState.set(pairKey, (liteOverlapPairState.get(pairKey) ?? 0) + 1);
            } else if (liteOverlapPairState.has(pairKey)) {
              liteOverlapResolutionSum += liteOverlapPairState.get(pairKey);
              liteOverlapResolutionN++;
              liteOverlapPairState.delete(pairKey);
            }
          }
        }
        // Honest overlap: body-extent check (all pairs, open + closed, after 4s warmup).
        // dT_px: path-pixel gap along track (wraps for closed tracks so lapping is detected).
        // dY_px: lateral pixel gap (physicalY × trackWidth/2).
        // Fires when both rendered bodies physically overlap or touch.
        if (raceTs > 4000) for (let a = 0; a < racers.length; a++) {
          if (racers[a].finished) continue;
          for (let b = a + 1; b < racers.length; b++) {
            if (racers[b].finished) continue;
            const ra = racers[a], rb = racers[b];
            // Closed tracks: wrap by 1.0 (one lap), not finishT (which is several laps).
            // tPos = ((t % 1) + 1) % 1 gives the racer's position within the current lap.
            // Two racers at the same tPos are visually co-located even if on different laps.
            let dT_px;
            if (isOpen) {
              dT_px = Math.abs(ra.t - rb.t) * pathLengthPx;
            } else {
              const tPosA = ((ra.t % 1) + 1) % 1;
              const tPosB = ((rb.t % 1) + 1) % 1;
              const dtNorm = Math.abs(tPosA - tPosB);
              dT_px = Math.min(dtNorm, 1 - dtNorm) * pathLengthPx;
            }
            const dY_px  = Math.abs(ra.physicalY - rb.physicalY) * geometricTrackWidth / 2;
            honestOverlapPairTotal++;
            if (dT_px < drawnBodyLengthPx && dY_px < drawnBodyWidthPx) {
              honestOverlapPairFrames++;
              if (!isOpen) {
                // Decompose: same-lap (|Δt| < 1.0) vs genuine lapping (|Δt| ≥ 1.0).
                if (Math.abs(ra.t - rb.t) >= 1.0) honestCrossLapFrames++;
                else honestSameLapFrames++;
              }
            }
          }
        }
        // ── passThroughCount detector (sim-only) ─────────────────────────────────
        // Window starts after the configured warmup (avoidanceWarmupMs), not a fixed 5s.
        if (raceTs >= behaviorConfig.avoidanceWarmupMs) {
          for (let a = 0; a < racers.length; a++) {
            if (racers[a].finished) continue;
            for (let b = a + 1; b < racers.length; b++) {
              if (racers[b].finished) continue;
              const ra = racers[a], rb = racers[b];
              const diff = ra.physicalY - rb.physicalY;
              const sign = diff > 0 ? 1 : diff < 0 ? -1 : 0;
              const key = ra.index * 1000 + rb.index;
              const prev = passThroughPrevSign.get(key);
              if (sign !== 0 && prev !== undefined && prev !== 0 && sign !== prev) {
                let dT_px;
                if (isOpen) {
                  dT_px = Math.abs(ra.t - rb.t) * pathLengthPx;
                } else {
                  const ta = ((ra.t % 1) + 1) % 1, tb = ((rb.t % 1) + 1) % 1;
                  const dn = Math.abs(ta - tb);
                  dT_px = Math.min(dn, 1 - dn) * pathLengthPx;
                }
                if (dT_px < drawnBodyLengthPx) passThroughCount++; // crossed through, not around
              }
              if (sign !== 0) passThroughPrevSign.set(key, sign);
            }
          }
        }
        // brakeMatchFailureCount: open-track pass-through telemetry (after 4s warmup).
        // Fires when brake-to-match is engaged on a trailer AND the trailer still advances
        // faster than its locked leader for 5 consecutive frames while in the brake zone.
        // natPrevT (saved at line 676 before the t-update) gives the previous t for delta.
        if (raceTs > 4000 && isOpen) {
          for (let ri = 0; ri < racers.length; ri++) {
            const trailer = racers[ri];
            if (trailer.finished) continue;
            if (!(trailer.brakeMatchFactor < 1.0)) { brakeMatchFailState.delete(trailer.index * 10000); continue; }
            const leaderIdx = trailer.brakeMatchLeaderIndex;
            if (leaderIdx === -1) continue;
            let leader = null;
            for (let lj = 0; lj < racers.length; lj++) {
              if (racers[lj].index === leaderIdx && !racers[lj].finished) { leader = racers[lj]; break; }
            }
            if (!leader) continue;
            // Longitudinal zone check: same dynamicBrakeT gate as raceBehavior.js.
            const sizeT = (trailer.frameSizePx ?? 0) > 0 && pathLengthPx > 0
              ? (trailer.frameSizePx / pathLengthPx) * behaviorConfig.speedBrakeTMultiplier
              : 0.014;
            const dT = Math.abs(trailer.t - leader.t);
            if (dT > sizeT) { brakeMatchFailState.delete(trailer.index * 10000 + leaderIdx); continue; }
            // 1-frame advance delta: natPrevT holds t before the t-update this frame.
            const trailerDelta = trailer.t - (natPrevT.get(trailer.index) ?? trailer.t);
            const leaderDelta  = leader.t  - (natPrevT.get(leader.index)  ?? leader.t);
            const pairKey = trailer.index * 10000 + leaderIdx;
            if (trailerDelta > leaderDelta) {
              const consec = (brakeMatchFailState.get(pairKey) ?? 0) + 1;
              if (consec >= 5) {
                brakeMatchFailureCount++;
                // Diagnostic: is the leader avoidanceActive (receiving the floor brake)?
                // The primary bypass: cap = leaderRawSpeed but leader advances at
                // 0.945 × leaderRawSpeed → trailer systematically out-advances leader.
                if (leader.avoidanceActive) brakeMatchLeaderBraked++;
                brakeMatchFailState.set(pairKey, 0); // reset after counting event
              } else {
                brakeMatchFailState.set(pairKey, consec);
              }
            } else {
              brakeMatchFailState.delete(pairKey);
            }
          }
        }

        // Track max real progress spread (closed tracks, for lapping verification)
        if (!isOpen && raceTs > 4000) {
          let tMin = Infinity, tMax = -Infinity;
          for (const r of racers) {
            if (r.finished) continue;
            if (r.t < tMin) tMin = r.t;
            if (r.t > tMax) tMax = r.t;
          }
          if (tMax > tMin) {
            const spread = tMax - tMin;
            if (spread > maxRealSpread) maxRealSpread = spread;
          }
        }
        // lateralSpeedScore + brakeRate (after 4 s warmup)
        if (raceTs > 4000) {
          for (let ri = 0; ri < racers.length; ri++) {
            if (!racers[ri].finished) {
              liteLatSpeedSum += Math.abs(racers[ri].physicalYVelocity ?? 0);
              liteLatSpeedFrames++;
              if (racers[ri].avoidanceActive) liteBrakeSum++;
              liteBrakeFrames++;
            }
          }
        }
        // stableOvertakes: confirmed lead-swaps between 20%–80% of race
        {
          const durMs = targetSeconds * 1000;
          if (raceTs >= durMs * 0.2 && raceTs <= durMs * 0.8) {
            for (let a = 0; a < racers.length; a++) {
              if (racers[a].finished) continue;
              for (let b = a + 1; b < racers.length; b++) {
                if (racers[b].finished) continue;
                const pairKey  = racers[a].index * 100 + racers[b].index;
                const curLeader = racers[a].t >= racers[b].t ? racers[a].index : racers[b].index;
                const prevLeader = soPairLeader.get(pairKey);
                if (prevLeader === undefined) {
                  soPairLeader.set(pairKey, curLeader);
                  soPairSince.set(pairKey, 1);
                } else if (prevLeader === curLeader) {
                  const newSince = (soPairSince.get(pairKey) ?? 0) + 1;
                  soPairSince.set(pairKey, newSince);
                  if (newSince >= SO_CONFIRM_FRAMES && soPairConfirmed.get(pairKey) !== curLeader) {
                    if (soPairConfirmed.has(pairKey)) soCount++;
                    soPairConfirmed.set(pairKey, curLeader);
                  }
                } else {
                  soPairLeader.set(pairKey, curLeader);
                  soPairSince.set(pairKey, 1);
                }
              }
            }
          }
        }
        if (isOpen) {
          const row0Live = racers.filter((r) => r.startRowIndex === 0 && !r.finished);
          if (row0Live.length > 0) {
            const minRow0T = Math.min(...row0Live.map((r) => r.t));
            for (const r of racers) {
              if (r.startRowIndex === 1 && !r.finished && r.t > minRow0T) liteRow1EverAhead.add(r.index);
            }
          }
        }
      }
      // Diagnostic: post-frame counting + snapshot check
      if (diagnosticMode) {
        for (let ri = 0; ri < racers.length; ri++) {
          if (Math.abs(racers[ri].physicalY - diagPrevPhysY[ri]) > 1e-4) diagIntLateralPushes++;
          if (!diagPrevAvoidance[ri] && racers[ri].avoidanceActive)       diagIntBrakeActs++;
        }
        diagIntOvertakes     += v4OvertakePairs.size - diagLastOvertakeCount;
        diagLastOvertakeCount = v4OvertakePairs.size;
        while (diagSnapIdx < DIAG_SNAP_MS.length && raceTs >= DIAG_SNAP_MS[diagSnapIdx]) {
          diagTakeSnapshot(DIAG_SNAP_TIMES_S[diagSnapIdx], raceTs);
          diagSnapIdx++;
        }
      }

      // Finish check
      for (const r of racers) {
        if (!r.finished && r.t >= finishT) {
          r.finished   = true;
          finishedCount++;
          r.finishRank = finishedCount;
          r.finishTime = raceTs / 1000;
        }
      }
    }

    // Flush any overlap runs still open at race end
    for (const [, count] of liteOverlapPairState) {
      liteOverlapResolutionSum += count;
      liteOverlapResolutionN++;
    }
    liteOverlapPairState.clear();

    // DNF: rank unfinished by current t-position (higher = better)
    const dnf = racers.filter((r) => !r.finished).sort((a, b) => b.t - a.t);
    for (let k = 0; k < dnf.length; k++) {
      dnf[k].finishRank = finishedCount + 1 + k;
    }

    const results = racers.map((r) => ({
      racerIndex:    r.index,
      startRowIndex: r.startRowIndex,
      indexInRow:    r.indexInRow,
      finalT:        r.t,
      finalRank:     r.finishRank,
      finishTime:    r.finishTime,
    }));
    // Attach mixing-quota and v4 diagnostics as non-iterable properties.
    results.mixingQuota     = mixingQuota;
    results.v4ThreshLog     = v4ThreshLog;
    results.v4OvertakeCount = v4HasOvertaken.size;     // Row-1 racers with ≥1 physical overtake
    results.v4NearBehindCount = v4WasNearBehind.size;  // pairs that entered near-behind state
    results.v4PairOvertakes = v4OvertakePairs.size;    // total completed pair-overtakes
    results.diagSnapshots   = diagnosticMode ? diagSnapshots : null;
    results.liteRow1BrakeFrames = liteRow1BrakeFrames;
    results.liteRow0BrakeFrames = liteRow0BrakeFrames;
    results.liteRow2BrakeFrames = liteRow2BrakeFrames;
    results.liteLateralMoves    = liteLateralMoves;
    results.v4PerRacerEndStats  = (V4_ACTIVE && V4_METRIC_TYPE === 'per_racer')
      ? racers.filter((r) => r.startRowIndex > 0).map((r) => ({ row: r.startRowIndex, threshIdx: r.v4RacerThreshIdx, threshTimes: r.v4RacerThreshTimes }))
      : null;
    results.liteRow1EverAheadCount       = liteRow1EverAhead.size;
    results.liteOverlapRate              = liteOverlapPairTotal > 0 ? liteOverlapPairFrames / liteOverlapPairTotal : 0;
    results.honestOverlapRate            = honestOverlapPairTotal > 0 ? honestOverlapPairFrames / honestOverlapPairTotal : 0;
    results.passThroughCount             = passThroughCount;        // sim-only: lateral pass-through events (post-warmup)
    results.maxRealSpread                = maxRealSpread;           // laps; 0 on open tracks
    // Governor edge-limiter metrics (Stage 1; reporting only, in racer-lengths). 0 when off.
    results.govGapLenMean = govGapLenSteps > 0 ? govGapLenSum / govGapLenSteps : 0; // leader→median, racer-lengths
    results.govGapLenMax = govGapLenMax;                                            // leader→median peak, racer-lengths
    results.govGap2ndLenMean = govGapLenSteps > 0 ? govGap2ndLenSum / govGapLenSteps : 0; // leader→2nd, racer-lengths
    results.govFieldLenMean = govGapLenSteps > 0 ? govFieldLenSum / govGapLenSteps : 0; // field p90−p10, racer-lengths
    results.govRankSwapRate = govRankSwapSteps > 0 ? govRankSwaps / govRankSwapSteps : 0; // swaps/step
    results.honestSameLapFrames          = honestSameLapFrames;     // closed tracks only
    results.honestCrossLapFrames         = honestCrossLapFrames;    // closed tracks only
    results.liteOverlapResolutionFrames  = liteOverlapResolutionN > 0 ? liteOverlapResolutionSum / liteOverlapResolutionN : 0;
    results.liteZigzagScore              = liteZigzagFrames > 0 ? liteZigzagSum / liteZigzagFrames : 0;
    results.liteLatSpeedScore            = liteLatSpeedFrames > 0 ? liteLatSpeedSum / liteLatSpeedFrames : 0;
    results.liteBrakeRate                = liteBrakeFrames > 0 ? liteBrakeSum / liteBrakeFrames : 0;
    results.liteStableOvertakes          = soCount / racers.length;
    results.brakeMatchFailureCount       = brakeMatchFailureCount;
    results.brakeMatchLeaderBraked       = brakeMatchLeaderBraked;
    // Phase-3A: Δ5s per-racer oscillation metric
    let tmDelta5sMax = 0;
    let tmOscillatingCount = 0;
    if (racePlanController && tmRings.size > 0) {
      for (const [, ring] of tmRings) {
        const filled = Math.min(ring.idx, TM_RING_SIZE);
        if (filled < 2) continue;
        let mn = Infinity, mx = -Infinity;
        for (let j = 0; j < filled; j++) {
          if (ring.buf[j] < mn) mn = ring.buf[j];
          if (ring.buf[j] > mx) mx = ring.buf[j];
        }
        const delta = mx - mn;
        if (delta > tmDelta5sMax) tmDelta5sMax = delta;
        if (delta > 0.15) tmOscillatingCount++;
      }
    }

    // Phase-3A: Naturalness metrics
    results.naturalness = {
      meanJerk:               natJerkSteps > 0 ? natJerkSum  / natJerkSteps : 0,
      maxJerkSpike:           natJerkMax,
      jerkFraction_high:      natJerkSteps > 0 ? natJerkHighCount / natJerkSteps : 0,
      naturalOvertakeFraction: natOvertakeCount > 0 ? natNaturalOvertakeCount / natOvertakeCount : 1,
      pulkTimeFraction:        natStableFrames > 0 ? natPulkFrames / natStableFrames : 0,
      pulkTriggersInWindow:   natPulkTriggersInWindow,
      pulkTriggersOutOfWindow: natPulkTriggersOutOfWindow,
      // From controller telemetry (0 when Race Plan inactive)
      ...(racePlanController ? racePlanController.collectTelemetry() : {
        winnerBlockedFractionInOutcome: 0,
        planBiasDeltaMean: 0,
        pulkBiasEventCount: 0,
      }),
      // Δ5s oscillation: max trajectoryMult swing over any 5s window during OUTCOME
      tmDelta5sMax,
      tmOscillatingCount,
    };
    results.physicalDurationS   = Math.max(...racers.map((r) => r.finishTime ?? 0));
    results.avgRerollsPerRacer  = racers.reduce((s, r) => s + r.rerollCount, 0) / racers.length;
    // outcomeReached: true if at least one racer crossed the finish line (race didn't time out)
    results.outcomeReached = finishedCount > 0;

    // Phase-3B: COMEBACK analysis result
    if (cbCfg) {
      const finalTs = raceTs;
      const effectiveOutcomeEndMs = cbEndgameStartMs !== null
        ? Math.min(cbEndgameStartMs, cbOutcomeEndMs ?? finalTs)
        : (cbOutcomeEndMs ?? finalTs);
      const outcomeDurS   = cbOutcomeStartMs != null ? ((cbOutcomeEndMs   ?? finalTs) - cbOutcomeStartMs) / 1000 : 0;
      const effectiveDurS = cbOutcomeStartMs != null ? (effectiveOutcomeEndMs - cbOutcomeStartMs) / 1000          : 0;
      results.comebackDiag = {
        outcomeStartS:  cbOutcomeStartMs != null ? cbOutcomeStartMs / 1000 : null,
        outcomeEndS:    cbOutcomeEndMs   != null ? cbOutcomeEndMs   / 1000 : null,
        outcomeDurS:    Math.max(0, outcomeDurS),
        endgameStartS:  cbEndgameStartMs != null ? cbEndgameStartMs / 1000 : null,
        effectiveDurS:  Math.max(0, effectiveDurS),
        triggerCount:   cbTriggers.length,
        triggers:       cbTriggers,
        allMaxGains:    [...cbMaxGainByRacer.values()],
      };
    } else {
      results.comebackDiag = null;
    }

    // Breakaway diagnostic — attached ONLY when the flag is on, so the results object
    // (and every downstream column) is unchanged for a normal fairness run.
    if (breakawayDiag) {
      const targetRankOf = (idx) =>
        racerTargetRankMap && idx >= 0 ? (racerTargetRankMap.get(idx) ?? null) : null;
      results.breakawayDiag = {
        gapBins:              bkGapBins,
        peakPreOutcomeGap:    bkPeakGap > -Infinity ? +bkPeakGap.toFixed(5) : 0,
        peakProgress:         +bkPeakProgress.toFixed(4),
        peakGap2nd:           +bkPeakGap2nd.toFixed(5),
        peakLeaderIdx:        bkPeakLeaderIdx,
        peakLeaderTargetRank: targetRankOf(bkPeakLeaderIdx),
        peakDecomposition:    bkPeakDecomp,
        corridorStart:        BREAKAWAY_CORRIDOR_START,
        // breakaway flag: peak gap exceeds the ~0.03·finishT lead-group spread tolerance.
        isBreakaway:          bkPeakGap > 0.03,
      };
    }

    // Front-action metric — attached ONLY when the flag is on, so the results object (and
    // every downstream column) is unchanged for a normal fairness run. Front-reach reuses the
    // governor's already-computed racer-length gaps (results.govGap2ndLenMean / govGapLenMean).
    if (frontAction) {
      const targetRankOf = (idx) =>
        racerTargetRankMap && idx >= 0 ? (racerTargetRankMap.get(idx) ?? null) : null;
      results.frontAction = {
        steps:             faSteps,
        leadChanges:       faLeadChanges,
        distinctP1:        faP1Set.size,
        leadChangeRate:    faSteps > 0 ? faLeadChanges / faSteps : 0,        // P1 changes / step
        podiumShuffleRate: faTop3CompareSteps > 0 ? faTop3ShuffleCount / faTop3CompareSteps : 0,
        // Front-reach (racer-lengths) — reuse the governor gaps; 0 when the governor is off.
        gap2ndLenMean:     results.govGap2ndLenMean, // leader→2nd   (small = close, contested front)
        gapMedLenMean:     results.govGapLenMean,     // leader→median (large = lone breakaway)
        // Per-racer front-running time vs assigned targetRank → unpredictability correlation.
        perRacer: racers.map((r) => ({
          index:      r.index,
          targetRank: targetRankOf(r.index),
          p1Frac:     faSteps > 0 ? (faP1StepsByIdx.get(r.index) ?? 0) / faSteps : 0,
          top3Frac:   faSteps > 0 ? (faTop3StepsByIdx.get(r.index) ?? 0) / faSteps : 0,
        })),
      };
    }

    // ── STRIP-DOWN metrics — attached ONLY when --strip-metrics is on (else results unchanged) ──
    if (STRIP_METRICS) {
      const targetRankOf = (idx) =>
        racerTargetRankMap && idx >= 0 ? (racerTargetRankMap.get(idx) ?? null) : null;
      const bandOf = (rank) => {
        if (rank == null) return null;
        for (let i = 0; i < BAND_EDGES.length; i++) if (rank <= BAND_EDGES[i]) return i; // 0-based, 0 = B1
        return BAND_EDGES.length;
      };
      const winStats = (W) => ({
        steps:         W.steps,
        leadChanges:   W.leadChanges,
        distinctP1:    W.p1Set.size,
        // dominant-leader time-share: fraction of window steps held by the single most-frequent P1.
        leaderShare:   W.steps > 0 ? Math.max(0, ...[...W.p1Steps.values()]) / W.steps : 0,
        top3ShuffleRate: W.compareSteps > 0 ? W.shuffle / W.compareSteps : 0,
        cleanOvertakes: W.cleanOv, // hold-based lead changes (new leader held P1 ≥ 750 ms) — clean-pass signal
        chargerDepthMax: W.chargerDepths.filter((x) => x != null).length ? Math.max(...W.chargerDepths.filter((x) => x != null)) : null, // deepest start-rank of a clean overtaker
        nChargers: W.chargerDepths.length, // number of clean overtakes with a recorded start-depth

      });
      results.stripMetrics = {
        pulk:    winStats(smPulk),
        outcome: winStats(smOut),
        winner: {
          idx:            smWinnerIdx,
          targetRank:     targetRankOf(smWinnerIdx),
          rankAt025:      smWinnerRankAt025,
          rankAt050:      smWinnerRankAt050,
          rankAt055:      smWinnerRankAt055,
          finalRank:      smWinnerIdx >= 0 ? (racers.find((r) => r.index === smWinnerIdx)?.finishRank ?? null) : null,
          maxTrajMult:    +smWinnerMaxTraj.toFixed(4),
          outcomeCeilFrac: smWinnerOutcomeSteps > 0 ? +(smWinnerCeilSteps / smWinnerOutcomeSteps).toFixed(4) : 0,
        },
        // FINISH CONTEST (Step-4 observer, read-only — no race behavior). The leader→2nd finish-time
        // gap: a cruising winner opens a large gap; a fought finish keeps it small. top5SpreadSec is
        // the P1→P5 finish-time spread — how tight the whole front cluster crosses the line.
        // fieldSpreadP10P90Sec (Step 5): the p10→p90 finish-time spread across the WHOLE field — the
        // "did the field tighten?" signal (a denser, band-held field finishes closer in time).
        finish: (() => {
          const at = (rk) => racers.find((r) => r.finishRank === rk)?.finishTime;
          const t1 = at(1), t2 = at(2), t5 = at(5);
          const times = racers.map((r) => r.finishTime).filter((x) => x != null).sort((a, b) => a - b);
          const pct = (p) => (times.length ? times[Math.min(times.length - 1, Math.floor(p * (times.length - 1)))] : null);
          const p10 = pct(0.1), p90 = pct(0.9);
          return {
            gapP1P2Sec:   t1 != null && t2 != null ? +(t2 - t1).toFixed(3) : null,
            top5SpreadSec: t1 != null && t5 != null ? +(t5 - t1).toFixed(3) : null,
            fieldSpreadP10P90Sec: p10 != null && p90 != null ? +(p90 - p10).toFixed(3) : null,
          };
        })(),
        naturalness: {
          maxSpeedFactor: +smNatMax.toFixed(4),                                  // peak spreadFactor×tool-mults in PULK
          exceedFrac:     smNatSteps > 0 ? +(smNatExceed / smNatSteps).toFixed(4) : 0, // racer-steps > 1.08 (over ceiling)
        },
        directorPoolFallback: dirState.poolFallback ?? 0, // times the once-per-race pool was exhausted (graceful fallback)
        // Per-racer rows for band-reach, start-row fairness, and bonus↔leader correlation (computed
        // downstream). pulk/outcome shares are per-window; areaSample is the applied areaBonusMult in
        // PULK; rowBonus is the raw start-row speed bonus. All read-only observations.
        perRacer: racers.map((r) => ({
          index:        r.index,
          startRowIndex: r.startRowIndex,
          targetRank:   targetRankOf(r.index),
          targetBand:   bandOf(targetRankOf(r.index)), // 0-based band index
          finalRank:    r.finishRank,
          pulkP1Frac:   smPulk.steps > 0 ? (smPulk.p1Steps.get(r.index) ?? 0) / smPulk.steps : 0,
          pulkTop3Frac: smPulk.steps > 0 ? (smPulk.top3Steps.get(r.index) ?? 0) / smPulk.steps : 0,
          outP1Frac:    smOut.steps  > 0 ? (smOut.p1Steps.get(r.index) ?? 0)  / smOut.steps  : 0,
          areaSample:   +((smAreaSample.get(r.index) ?? 1.0)).toFixed(4),
          rowBonus:     +(r.rawRowBonus ?? 0).toFixed(5),
        })),
      };
    }

    // ── ACTION-METRICS — attached ONLY when --action-metrics is on (else results unchanged) ──
    if (ACTION_METRICS) {
      const targetRankOf = (idx) =>
        racerTargetRankMap && idx >= 0 ? (racerTargetRankMap.get(idx) ?? null) : null;
      const bandOf = (rank) => {
        if (rank == null) return null;
        for (let i = 0; i < BAND_EDGES.length; i++) if (rank <= BAND_EDGES[i]) return i; // 0-based, 0 = B1
        return BAND_EDGES.length;
      };
      const travels = [...amMinRank.keys()].map((idx) => amMaxRank.get(idx) - amMinRank.get(idx));
      const meanTravel = travels.length ? travels.reduce((s, v) => s + v, 0) / travels.length : 0;
      const sortedTravels = [...travels].sort((a, b) => a - b);
      const p90Travel = sortedTravels.length
        ? sortedTravels[Math.min(sortedTravels.length - 1, Math.ceil(0.9 * sortedTravels.length) - 1)]
        : 0;
      let risers = 0, fallers = 0;
      for (const idx of amStartRank.keys()) {
        const start = amStartRank.get(idx);
        const end = amEndRank.get(idx);
        if (end === undefined) continue;
        if (start - end >= 3) risers++;   // ended ≥3 ranks BETTER (lower rank number)
        if (end - start >= 3) fallers++;  // ended ≥3 ranks WORSE
      }
      results.actionMetrics = {
        frames:            amFrames,
        rankChurn:         amSwaps,
        meanRankTravel:    +meanTravel.toFixed(3),
        p90RankTravel:     p90Travel,
        risers,
        fallers,
        frontTop5Turnover: amTop5.size,
        spreadLenP10P90:   amFrames > 0 ? +(amSpreadSum / amFrames).toFixed(3) : 0,
        maxSpeedFactor:    +amNatMax.toFixed(4),
        // Per-racer rows for pooled band-reach (finalBand vs targetBand) + corrP1
        // (Spearman targetRank vs PULK-window P1-time), computed downstream in the analyze step.
        perRacer: racers.map((r) => ({
          index:         r.index,
          startRowIndex: r.startRowIndex,
          targetRank:    targetRankOf(r.index),
          targetBand:    bandOf(targetRankOf(r.index)),
          finalRank:     r.finishRank,
          finalBand:     bandOf(r.finishRank),
          p1FracWindow:  amFrames > 0 ? (amP1Steps.get(r.index) ?? 0) / amFrames : 0,
        })),
      };
    }

    return results;
  } finally {
    Math.random = savedRandom;
  }
}

// ── Statistics ────────────────────────────────────────────────────────────────
/**
 * Aggregate fairness statistics over a series of races.
 *
 * @param {Array<Array<{startRowIndex,finalRank}>>} raceResults  one entry per race
 * @param {number} totalRows
 * @param {number[]|null} rowSizes  racer count per row; if null, uniform distribution assumed
 * @returns {{ nRaces, totalRows, rowStats, chiSq, df, pValue }}
 */
export function computeFairnessStats(raceResults, totalRows, rowSizes = null) {
  const nRaces     = raceResults.length;
  const winsByRow  = new Array(totalRows).fill(0);
  const ranksByRow = Array.from({ length: totalRows }, () => []);

  for (const race of raceResults) {
    const winner = race.reduce((best, r) => (r.finalRank < best.finalRank ? r : best));
    if (winner.startRowIndex < totalRows) winsByRow[winner.startRowIndex]++;
    for (const r of race) {
      if (r.startRowIndex < totalRows) ranksByRow[r.startRowIndex].push(r.finalRank);
    }
  }

  // Weighted expected wins: proportional to row size; fall back to uniform if no sizes given
  const totalRacers = rowSizes ? rowSizes.reduce((s, v) => s + v, 0) : totalRows;
  const expectedWinsByRow = Array.from({ length: totalRows }, (_, i) =>
    rowSizes ? nRaces * rowSizes[i] / totalRacers : nRaces / totalRows
  );

  const rowStats = Array.from({ length: totalRows }, (_, rowIdx) => {
    const ranks   = ranksByRow[rowIdx];
    const n       = ranks.length;
    const wins    = winsByRow[rowIdx];
    const avgRank = n > 0 ? ranks.reduce((s, v) => s + v, 0) / n : null;
    const variance =
      n > 1 ? ranks.reduce((s, v) => s + (v - avgRank) ** 2, 0) / (n - 1) : 0;
    return {
      rowIndex: rowIdx,
      wins,
      winRate:         wins / nRaces,
      expectedWinRate: expectedWinsByRow[rowIdx] / nRaces,
      n,
      avgRank,
      stdRank:  Math.sqrt(variance),
    };
  });

  // Chi-square goodness-of-fit with weighted expectations
  const chiSq = winsByRow.reduce((s, obs, i) => {
    const exp = expectedWinsByRow[i];
    return exp > 0 ? s + (obs - exp) ** 2 / exp : s;
  }, 0);
  const df       = totalRows - 1;
  const pValue   = chiSqPValue(chiSq, df);

  return { nRaces, totalRows, rowStats, chiSq, df, pValue };
}

/**
 * Compute per-zone success rate using the real game zone boundaries (B1–B5)
 * from racePlanner.js getAreaBounds() with bonusStrengthMultiplier=2.0.
 *
 * @param {Array<{result: object[], targetRankMap: Map<number,number>}>} raceEntries
 * @returns {{ zones: object[], overall: object }}
 */
export function computeZoneSuccessRate(raceEntries) {
  const ZONES = [
    { zone: 'B1', lo: 1,  hi: 5,        bonus: '+6%' },
    { zone: 'B2', lo: 6,  hi: 15,       bonus: '+4%' },
    { zone: 'B3', lo: 16, hi: 25,       bonus: '+2%' },
    { zone: 'B4', lo: 26, hi: 40,       bonus: '±0%' },
    { zone: 'B5', lo: 41, hi: Infinity, bonus: '−2%' },
  ];

  function getZoneIdx(rank) {
    for (let i = 0; i < BAND_EDGES.length; i++) {
      if (rank <= BAND_EDGES[i]) return i;
    }
    return BAND_EDGES.length;
  }

  const hits  = [0, 0, 0, 0, 0];
  const total = [0, 0, 0, 0, 0];
  let overallHits = 0, overallTotal = 0;

  for (const { result, targetRankMap } of raceEntries) {
    for (const racer of result) {
      const targetRank = targetRankMap?.get(racer.racerIndex);
      if (targetRank == null) continue;
      const tz = getZoneIdx(targetRank);
      const fz = getZoneIdx(racer.finalRank);
      total[tz]++;
      overallTotal++;
      if (fz === tz) { hits[tz]++; overallHits++; }
    }
  }

  return {
    zones: ZONES.map((z, i) => ({
      ...z,
      hits:  hits[i],
      total: total[i],
      rate:  total[i] > 0 ? hits[i] / total[i] : null,
    })),
    overall: {
      hits:  overallHits,
      total: overallTotal,
      rate:  overallTotal > 0 ? overallHits / overallTotal : null,
    },
  };
}

// ── BS-1: Extended fairness statistics ─────────────────────────────────────────
// Adds: top-3-by-row screening, per-band Spearman ordinal trend (permutation p),
// within-band emergence metric, band-integrity gate, Holm/BH correction.

/**
 * Holm-Bonferroni step-down correction (controls FWER).
 * Use for confirmatory family: per-track × (top3-by-row + per-band ordinal).
 * @param {number[]} pValues raw p-values
 * @returns {number[]} adjusted p-values in the same order as input
 */
function holmCorrect(pValues) {
  const n = pValues.length;
  if (n === 0) return [];
  const idx = pValues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  const adj = new Array(n);
  let runMax = 0;
  for (let k = 0; k < n; k++) {
    runMax = Math.max(runMax, Math.min(1, (n - k) * idx[k].p));
    adj[idx[k].i] = runMax;
  }
  return adj;
}

/**
 * Benjamini-Hochberg step-up correction (controls FDR).
 * Use for exploratory drill-down outputs only — never for pass/fail decisions.
 * @param {number[]} pValues raw p-values
 * @returns {number[]} adjusted p-values in the same order as input
 */
function bhCorrect(pValues) {
  const n = pValues.length;
  if (n === 0) return [];
  const idx = pValues.map((p, i) => ({ p, i })).sort((a, b) => b.p - a.p);
  const adj = new Array(n);
  let runMin = 1;
  for (let k = 0; k < n; k++) {
    runMin = Math.min(runMin, Math.min(1, (n / (n - k)) * idx[k].p));
    adj[idx[k].i] = runMin;
  }
  return adj;
}

/** Convert values to average ranks (1-indexed; ties share the average rank). */
function rankArray(arr) {
  const sorted = arr.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const out = new Array(arr.length);
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1][0] === sorted[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[sorted[k][1]] = avg;
    i = j + 1;
  }
  return out;
}

function pearsonOfRanks(rx, ry) {
  const n = rx.length;
  if (n < 2) return 0;
  const mx = rx.reduce((s, v) => s + v, 0) / n;
  const my = ry.reduce((s, v) => s + v, 0) / n;
  let num = 0,
    dx2 = 0,
    dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = rx[i] - mx,
      dy = ry[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  return dx2 > 0 && dy2 > 0 ? num / Math.sqrt(dx2 * dy2) : 0;
}

/** Spearman rank-correlation coefficient. */
function spearman(xs, ys) {
  return pearsonOfRanks(rankArray(xs), rankArray(ys));
}

/**
 * Two-tailed permutation p-value for |Spearman r| (xs are shuffled).
 * Returns 1 when n < 4 (too few data points for a meaningful test).
 */
function spearmanPermP(xs, ys, observedR, nPerm, prng) {
  if (xs.length < 4) return 1;
  let count = 0;
  const pxs = [...xs];
  for (let p = 0; p < nPerm; p++) {
    for (let i = pxs.length - 1; i > 0; i--) {
      const j = Math.floor(prng() * (i + 1));
      const tmp = pxs[i];
      pxs[i] = pxs[j];
      pxs[j] = tmp;
    }
    if (Math.abs(spearman(pxs, ys)) >= Math.abs(observedR)) count++;
  }
  return (count + 1) / (nPerm + 1);
}

/**
 * Band-integrity gate: non-inferiority check on zone success rate.
 * Flags OK iff pooledRate >= baselineRate − marginPP AND no per-track rate
 * is worse by more than 2 × marginPP relative to its track baseline.
 *
 * @param {number}   pooledRate       current pooled zone success rate (0–1)
 * @param {number}   baselineRate     rate at bandStrictness 1.0
 * @param {number[]} [trackRates]     per-track current rates (same order as trackBaselines)
 * @param {number[]} [trackBaselines] per-track baseline rates
 * @param {number}   [marginPP=0.02]  allowed drop as a fraction (0.02 = 2 pp)
 * @returns {{ ok: boolean, pooledOK: boolean, tracksFailed: number }}
 */
export function bandIntegrityOK(
  pooledRate,
  baselineRate,
  trackRates = [],
  trackBaselines = [],
  marginPP = 0.02,
) {
  const pooledOK = pooledRate >= baselineRate - marginPP;
  const tracksFailed = trackRates.filter((r, i) => {
    const base = trackBaselines[i] ?? baselineRate;
    return r < base - 2 * marginPP;
  }).length;
  return { ok: pooledOK && tracksFailed === 0, pooledOK, tracksFailed };
}

/**
 * Extended fairness statistics for bandStrictness sweep analysis.
 *
 * Each entry represents one racer in one race. Required fields:
 *   startRowIndex {number}      0-based row index
 *   finalRank     {number}      1-based final position
 *   targetBandIdx {number}      0-based band index (0=B1 … 4=B5)
 *   targetRank    {number|null} exact target rank (required for emergence metric)
 *   raceKey       {string}      unique race identifier (e.g. `${trackId}-${seed}-${raceIdx}`)
 *   trackId       {string}      track identifier (for per-track stratification)
 *
 * Callers mapping from rawData: raceKey = `${e.trackId}-${e.seed}-${e.raceIdx}`,
 * targetBandIdx = e.sollBereich - 1, targetRank = e.sollRank.
 *
 * @param {object[]} entries   per-racer per-race records (see above)
 * @param {number[]} rowSizes  racer count per row
 * @param {object}  [opts]
 * @param {number[]}  [opts.bandEdges]  split points; defaults to BAND_EDGES
 * @param {number}   [opts.nPerm=499]  permutations for Spearman p-value
 * @param {Function} [opts.prng]        PRNG for permutations; defaults to Math.random
 * @returns {{ pooled, perTrack, confirmatory, exploratory, anyConfirmatoryFlagged }}
 */
export function computeExtendedFairnessStats(entries, rowSizes, opts = {}) {
  const bandEdges = opts.bandEdges ?? BAND_EDGES;
  const nBands = bandEdges.length + 1;
  const nPerm = opts.nPerm ?? 499;
  const prng = opts.prng ?? Math.random;

  const totalRacers = rowSizes.reduce((s, v) => s + v, 0);
  const nRows = rowSizes.length;
  const trackIds = [...new Set(entries.map((e) => e.trackId ?? 'unknown'))];

  // ── 1. Top-3-by-row (screening stat) ──────────────────────────────────────
  // NOTE: top-3 within a race are correlated — treat as a signal, not an independence proof.
  // Use per-band ordinal tests for confirmation.
  function computeTop3ByRow(subset) {
    const nR = new Set(subset.map((e) => e.raceKey)).size;
    const obs = new Array(nRows).fill(0);
    for (const e of subset) {
      if (e.finalRank <= 3 && e.startRowIndex < nRows) obs[e.startRowIndex]++;
    }
    const exp = rowSizes.map((sz) => (nR * 3 * sz) / totalRacers);
    let chiSq = 0;
    for (let i = 0; i < nRows; i++) if (exp[i] > 0) chiSq += (obs[i] - exp[i]) ** 2 / exp[i];
    return { obs, exp, chiSq, df: nRows - 1, pRaw: chiSqPValue(chiSq, nRows - 1), nRaces: nR };
  }

  // ── 2. Per-band Spearman ordinal trend ─────────────────────────────────────
  // For each target band: tests whether start-row-index predicts within-band finishing position.
  // Permutation p avoids expected-cell-count assumptions that plague small-n chi-square cells.
  function computePerBandOrdinal(subset) {
    return Array.from({ length: nBands }, (_, bi) => {
      const band = subset.filter((e) => e.targetBandIdx === bi);
      if (band.length < 4) return { bandIdx: bi, n: band.length, r: null, pRaw: 1 };

      const byRace = new Map();
      for (const e of band) {
        if (!byRace.has(e.raceKey)) byRace.set(e.raceKey, []);
        byRace.get(e.raceKey).push(e);
      }
      const startRows = [],
        withinPos = [];
      for (const group of byRace.values()) {
        const sorted = [...group].sort((a, b) => a.finalRank - b.finalRank);
        sorted.forEach((e, pos) => {
          startRows.push(e.startRowIndex);
          withinPos.push(pos + 1);
        });
      }
      const r = spearman(startRows, withinPos);
      return { bandIdx: bi, n: band.length, r, pRaw: spearmanPermP(startRows, withinPos, r, nPerm, prng) };
    });
  }

  // ── 3. Within-band emergence metric ────────────────────────────────────────
  // Mean |Δ within-band position| between target-rank order and actual final-rank order.
  // ~0 at bandStrictness=1.0 (controller enforces exact rank); rises as strictness falls.
  // Matched by targetRank (unique per racer per race since targetRanks form a permutation).
  function computeWithinBandEmergence(subset) {
    return Array.from({ length: nBands }, (_, bi) => {
      const band = subset.filter((e) => e.targetBandIdx === bi && e.targetRank != null);
      if (band.length < 2) return { bandIdx: bi, n: 0, meanAbsDelta: null };

      const byRace = new Map();
      for (const e of band) {
        if (!byRace.has(e.raceKey)) byRace.set(e.raceKey, []);
        byRace.get(e.raceKey).push(e);
      }
      let totalDelta = 0,
        totalN = 0;
      for (const group of byRace.values()) {
        if (group.length < 2) continue;
        const byTarget = [...group].sort((a, b) => a.targetRank - b.targetRank);
        const byActual = [...group].sort((a, b) => a.finalRank - b.finalRank);
        const targetPos = new Map(byTarget.map((e, i) => [e.targetRank, i + 1]));
        const actualPos = new Map(byActual.map((e, i) => [e.targetRank, i + 1]));
        for (const [tr, tp] of targetPos) {
          const ap = actualPos.get(tr);
          if (ap != null) {
            totalDelta += Math.abs(tp - ap);
            totalN++;
          }
        }
      }
      return { bandIdx: bi, n: totalN, meanAbsDelta: totalN > 0 ? totalDelta / totalN : null };
    });
  }

  // ── Pooled + per-track ─────────────────────────────────────────────────────
  const pooled = {
    top3: computeTop3ByRow(entries),
    ordinal: computePerBandOrdinal(entries),
    emergence: computeWithinBandEmergence(entries),
  };

  const perTrack = trackIds.map((tid) => {
    const sub = entries.filter((e) => (e.trackId ?? 'unknown') === tid);
    return {
      trackId: tid,
      top3: computeTop3ByRow(sub),
      ordinal: computePerBandOrdinal(sub),
      emergence: computeWithinBandEmergence(sub),
    };
  });

  // ── 4. Multiple-testing corrections ────────────────────────────────────────
  // Confirmatory family: per-track × (top3 + per-band ordinal) — these tests drive pass/fail.
  // Holm controls FWER at α=0.05; a flagged test survives family-wise correction.
  const confirmatory = [];
  for (const tr of perTrack) {
    confirmatory.push({
      label: `${tr.trackId}|top3`,
      p: tr.top3.pRaw,
      trackId: tr.trackId,
      test: 'top3',
      r: null,
    });
    for (const b of tr.ordinal) {
      confirmatory.push({
        label: `${tr.trackId}|B${b.bandIdx + 1}|ordinal`,
        p: b.pRaw,
        trackId: tr.trackId,
        test: 'ordinal',
        bandIdx: b.bandIdx,
        r: b.r,
      });
    }
  }
  const holmAdj = holmCorrect(confirmatory.map((c) => c.p));
  confirmatory.forEach((c, i) => {
    c.pHolm = holmAdj[i];
  });

  // Exploratory: pooled + all confirmatory, BH-corrected (drill-down only — not for pass/fail).
  const exploratory = [
    { label: 'pooled|top3', p: pooled.top3.pRaw },
    ...pooled.ordinal.map((b) => ({ label: `pooled|B${b.bandIdx + 1}|ordinal`, p: b.pRaw ?? 1 })),
    ...confirmatory.map((c) => ({ label: c.label, p: c.p })),
  ];
  const bhAdj = bhCorrect(exploratory.map((e) => e.p));
  exploratory.forEach((e, i) => {
    e.pBH = bhAdj[i];
  });

  return {
    pooled,
    perTrack,
    confirmatory,
    exploratory,
    anyConfirmatoryFlagged: confirmatory.some((c) => c.pHolm < 0.05),
  };
}

/**
 * Synthetic validation (--selfcheck mode).
 * Builds synthetic race results and confirms the metrics fire on injected unfairness.
 *
 * Conditions:
 *   A) FAIR          — finalRank independent of startRowIndex → all tests clear after Holm.
 *   B) UNFAIR        — row order determines final rank → top-3 and ordinal flag.
 *   C) WITHIN-BAND   — band assignment proportional; within-band positions ordered by row →
 *                       ordinal flags; zoneSuccessRate stays 100%.
 */
function runFairnessSelfCheck() {
  const SC_SEED = 42;
  const SC_RACES = 150;
  const SC_N = 50;
  const ROW_SIZES = [17, 17, 16];
  const N_PERM = 499;
  const TID = 'synth';

  function scShuffle(arr, prng) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(prng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function bandIdxOf(rank) {
    for (let i = 0; i < BAND_EDGES.length; i++) if (rank <= BAND_EDGES[i]) return i;
    return BAND_EDGES.length;
  }

  // Base racer list (index + startRowIndex; finalRank assigned per condition)
  const baseRacers = [];
  let racerIdx = 0;
  for (let row = 0; row < ROW_SIZES.length; row++) {
    for (let j = 0; j < ROW_SIZES[row]; j++) {
      baseRacers.push({ racerIndex: racerIdx++, startRowIndex: row });
    }
  }

  // Assign a random permutation of targetRanks (1..SC_N) each race
  function withTargets(prng) {
    const ranks = scShuffle(
      Array.from({ length: SC_N }, (_, i) => i + 1),
      prng,
    );
    return baseRacers.map((r, i) => ({
      ...r,
      targetRank: ranks[i],
      targetBandIdx: bandIdxOf(ranks[i]),
    }));
  }

  // Condition A: FAIR — shuffle finalRanks independently of startRowIndex
  function genFair(prng) {
    const entries = [];
    for (let race = 0; race < SC_RACES; race++) {
      const racers = withTargets(prng);
      const finalRanks = scShuffle(
        Array.from({ length: SC_N }, (_, i) => i + 1),
        prng,
      );
      racers.forEach((r, i) =>
        entries.push({ ...r, finalRank: finalRanks[i], raceKey: `A-${race}`, trackId: TID }),
      );
    }
    return entries;
  }

  // Condition B: UNFAIR — row order directly determines final rank
  function genUnfair(prng) {
    const entries = [];
    for (let race = 0; race < SC_RACES; race++) {
      const racers = withTargets(prng);
      const sorted = [...racers].sort((a, b) =>
        a.startRowIndex !== b.startRowIndex ? a.startRowIndex - b.startRowIndex : prng() - 0.5,
      );
      sorted.forEach((r, i) =>
        entries.push({ ...r, finalRank: i + 1, raceKey: `B-${race}`, trackId: TID }),
      );
    }
    return entries;
  }

  // Condition C: WITHIN-BAND-ONLY — band assignment proportional to row size;
  // within each band positions are assigned in start-row order → zoneSuccessRate = 100%.
  function genWithinBand(prng) {
    const entries = [];
    for (let race = 0; race < SC_RACES; race++) {
      const racers = withTargets(prng);
      const byBand = new Map();
      for (const r of racers) {
        if (!byBand.has(r.targetBandIdx)) byBand.set(r.targetBandIdx, []);
        byBand.get(r.targetBandIdx).push(r);
      }
      const finalRankOf = new Map();
      for (const [bi, group] of byBand) {
        const lo = bi === 0 ? 1 : BAND_EDGES[bi - 1] + 1;
        const sorted = [...group].sort((a, b) =>
          a.startRowIndex !== b.startRowIndex ? a.startRowIndex - b.startRowIndex : prng() - 0.5,
        );
        sorted.forEach((r, pos) => finalRankOf.set(r.racerIndex, lo + pos));
      }
      for (const r of racers) {
        entries.push({
          ...r,
          finalRank: finalRankOf.get(r.racerIndex) ?? SC_N,
          raceKey: `C-${race}`,
          trackId: TID,
        });
      }
    }
    return entries;
  }

  function zoneSuccess(entries) {
    let hits = 0,
      total = 0;
    for (const e of entries) {
      if (e.targetBandIdx == null) continue;
      total++;
      if (bandIdxOf(e.finalRank) === e.targetBandIdx) hits++;
    }
    return total > 0 ? hits / total : null;
  }

  // ── Run all three conditions ───────────────────────────────────────────────
  process.stdout.write(
    '\nBS-1 self-check: generating conditions A/B/C (' +
      SC_RACES +
      ' races × 3)...',
  );
  const prngMain = makePRNG(SC_SEED);
  const entriesA = genFair(prngMain);
  const entriesB = genUnfair(prngMain);
  const entriesC = genWithinBand(prngMain);
  process.stdout.write(' done.\nRunning extended stats (3 conditions × ' + N_PERM + ' permutations × 5 bands)...\n');

  const resA = computeExtendedFairnessStats(entriesA, ROW_SIZES, {
    nPerm: N_PERM,
    prng: makePRNG(SC_SEED + 10),
  });
  process.stdout.write('  Condition A done\n');
  const resB = computeExtendedFairnessStats(entriesB, ROW_SIZES, {
    nPerm: N_PERM,
    prng: makePRNG(SC_SEED + 20),
  });
  process.stdout.write('  Condition B done\n');
  const resC = computeExtendedFairnessStats(entriesC, ROW_SIZES, {
    nPerm: N_PERM,
    prng: makePRNG(SC_SEED + 30),
  });
  process.stdout.write('  Condition C done\n');

  const zrA = zoneSuccess(entriesA);
  const zrB = zoneSuccess(entriesB);
  const zrC = zoneSuccess(entriesC);

  // ── Report ────────────────────────────────────────────────────────────────
  const SEP = '═'.repeat(72);

  console.log('\n' + SEP);
  console.log('BS-1 SYNTHETIC VALIDATION RESULTS');
  console.log(
    '  Races/condition: ' +
      SC_RACES +
      '  Racers: ' +
      SC_N +
      '  Rows: ' +
      ROW_SIZES.join('/') +
      '  Seed: ' +
      SC_SEED,
  );
  console.log('  Permutations: ' + N_PERM + '  α=0.05  Correction: Holm (confirmatory), BH (exploratory)');
  console.log(SEP);

  function printCond(label, desc, res, zr) {
    console.log('\n── Condition ' + label + ': ' + desc);
    const flagged = res.confirmatory.filter((c) => c.pHolm < 0.05);
    console.log(
      '  Confirmatory (Holm): ' +
        res.confirmatory.length +
        ' tests  →  ' +
        flagged.length +
        ' flagged at α=0.05',
    );
    if (flagged.length > 0) {
      for (const c of flagged) {
        const rStr = c.r != null ? '  r=' + c.r.toFixed(3) : '';
        console.log(
          '    ✗ ' + c.label + rStr + '  pRaw=' + c.p.toFixed(3) + '  pHolm=' + c.pHolm.toFixed(3),
        );
      }
    } else {
      console.log('    ✓ none flagged (all clear)');
    }
    const t3 = res.pooled.top3;
    console.log(
      '  Top-3-by-row (pooled, screening):  obs=[' +
        t3.obs.join(',') +
        ']  exp=[' +
        t3.exp.map((v) => v.toFixed(1)).join(',') +
        ']  χ²=' +
        t3.chiSq.toFixed(2) +
        '  pRaw=' +
        t3.pRaw.toFixed(3),
    );
    const ordSig = res.pooled.ordinal.filter((b) => b.r != null && b.pRaw < 0.05);
    if (ordSig.length > 0) {
      console.log(
        '  Per-band ordinal (pooled pre-Holm signals): ' +
          ordSig.map((b) => 'B' + (b.bandIdx + 1) + ' r=' + b.r.toFixed(3) + ' p=' + b.pRaw.toFixed(3)).join('  '),
      );
    } else {
      console.log('  Per-band ordinal (pooled pre-Holm): no signals (p≥0.05 all bands)');
    }
    const emg = res.pooled.emergence.filter((e) => e.meanAbsDelta != null);
    if (emg.length > 0) {
      console.log(
        '  Within-band emergence (meanAbsDelta): ' +
          emg.map((e) => 'B' + (e.bandIdx + 1) + '=' + e.meanAbsDelta.toFixed(2)).join('  '),
      );
    }
    if (zr != null) {
      console.log('  Zone success rate: ' + (zr * 100).toFixed(1) + '%');
    }
  }

  printCond('A', 'FAIR — no row effect', resA, zrA);
  printCond('B', 'UNFAIR — row order determines final rank', resB, zrB);
  printCond('C', 'WITHIN-BAND-ONLY — band assignment proportional, within-band ordered by row', resC, zrC);

  // Verdict
  const aPass = !resA.anyConfirmatoryFlagged;
  const bPass = resB.anyConfirmatoryFlagged;
  const cPass = resC.anyConfirmatoryFlagged && zrC != null && zrC >= 0.98;

  console.log('\n' + SEP);
  console.log('VERDICT');
  console.log('  A) FAIR → no flag (no false positive):      ' + (aPass ? '✓ PASS' : '✗ FAIL'));
  console.log('  B) UNFAIR → flagged:                        ' + (bPass ? '✓ PASS' : '✗ FAIL (effect not detected)'));
  console.log('  C) WITHIN-BAND → flagged + zone≥98%:        ' + (cPass ? '✓ PASS' : '✗ FAIL'));
  const allPass = aPass && bPass && cPass;
  console.log('\n  Overall: ' + (allPass ? '✓ ALL PASS — metrics have real detection power' : '✗ ONE OR MORE FAILED'));
  console.log(SEP + '\n');

  if (!allPass) process.exit(1);
}

// Wilson-Hilferty chi-square p-value approximation (upper tail)
function chiSqPValue(x, k) {
  if (k <= 0 || x < 0) return 1;
  const mu  = 1 - 2 / (9 * k);
  const sig = Math.sqrt(2 / (9 * k));
  const z   = ((x / k) ** (1 / 3) - mu) / sig;
  return 1 - normalCDF(z);
}

// Abramowitz & Stegun normal CDF approximation (max error 7.5e-8)
function normalCDF(z) {
  const t    = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly =
    t * (0.319381530 +
    t * (-0.356563782 +
    t * (1.781477937 +
    t * (-1.821255978 +
    t * 1.330274429))));
  const phi = 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z) * poly;
  return z >= 0 ? phi : 1 - phi;
}

// ── Report generation ─────────────────────────────────────────────────────────
function fmtPct(v) { return (v * 100).toFixed(1) + '%'; }
function fmtN(v, d = 2) { return v != null ? v.toFixed(d) : '—'; }
function sigLabel(p) {
  if (p < 0.001) return '*** (p<0.001)';
  if (p < 0.01)  return '** (p<0.01)';
  if (p < 0.05)  return '* (p<0.05)';
  return 'n.s.';
}
// ── Diagnostic tables A-E (race-plan mode only) ───────────────────────────────
/**
 * Build Markdown tables A-E from rawData rows for one combo.
 * Only called when sollBereich is present (RACE_PLAN_ACTIVE).
 *
 * @param {object[]} rawRows  rawData filtered for one trackId×racerType×durationSec
 * @param {object[]} rowStats computeFairnessStats rowStats (for row count/expected)
 * @returns {string[]} markdown lines
 */
function buildDiagnosticTables(rawRows, rowStats) {
  if (!rawRows || rawRows.length === 0) return [];

  const lines = [];
  const nRacers = Math.max(...rawRows.map((r) => r.finalRank));
  const nRaces = new Set(rawRows.map((r) => `${r.seed}-${r.raceIdx}`)).size;

  // Row sizes: inferred from any single race's distribution
  const firstKey = rawRows[0].seed + '-' + rawRows[0].raceIdx;
  const firstRace = rawRows.filter((r) => r.seed + '-' + r.raceIdx === firstKey);
  const rowSizeMap = new Map();
  for (const r of firstRace) rowSizeMap.set(r.startRowIndex, (rowSizeMap.get(r.startRowIndex) ?? 0) + 1);
  const totalRows = (Math.max(...rowSizeMap.keys()) + 1);
  const rowSizes = Array.from({ length: totalRows }, (_, i) => rowSizeMap.get(i) ?? 0);

  const bereichBounds = [[1, 5], [6, 15], [16, 25], [26, 40], [41, nRacers]];
  const rankGroups = [
    { label: '1', lo: 1, hi: 1 }, { label: '2', lo: 2, hi: 2 },
    { label: '3', lo: 3, hi: 3 }, { label: '4', lo: 4, hi: 4 },
    { label: '5', lo: 5, hi: 5 }, { label: '6–10', lo: 6, hi: 10 },
    { label: '11–15', lo: 11, hi: 15 }, { label: '16–25', lo: 16, hi: 25 },
    { label: '26–40', lo: 26, hi: 40 }, { label: `41–${nRacers}`, lo: 41, hi: nRacers },
  ];

  const p2 = (n, d) => (d > 0 ? (n / d * 100).toFixed(1) + '%' : '—');
  const cnt = (rows, lo, hi, key, val) =>
    rows.filter((r) => r.finalRank >= lo && r.finalRank <= hi && r[key] === val).length;

  // ── Table A ─────────────────────────────────────────────────────────────────
  lines.push('');
  lines.push('#### A — Bereichstreue');
  lines.push('');
  lines.push('| Soll-Bereich | Zugewiesen | Treffer | Quote |');
  lines.push('|---|---|---|---|');
  for (let b = 1; b <= 5; b++) {
    const [lo, hi] = bereichBounds[b - 1];
    const grp = rawRows.filter((r) => r.sollBereich === b);
    const hits = grp.filter((r) => r.finalRank >= lo && r.finalRank <= hi).length;
    lines.push(`| B${b} (Pl. ${lo}–${hi}) | ${grp.length} | ${hits} | ${p2(hits, grp.length)} |`);
  }

  // ── Table B.1 ───────────────────────────────────────────────────────────────
  const rowHdrs = rowStats.map((rs) => `Row ${rs.rowIndex} (${rowSizes[rs.rowIndex] ?? '?'}R)`);
  lines.push('');
  lines.push('#### B.1 — End-Platz-Gruppen × Start-Reihe');
  lines.push('');
  lines.push(`| End-Platz | ${rowHdrs.join(' | ')} | Gesamt |`);
  lines.push(`|---|${rowHdrs.map(() => '---|').join('')}---|`);
  for (const g of rankGroups) {
    const total = rawRows.filter((r) => r.finalRank >= g.lo && r.finalRank <= g.hi).length;
    const cols = rowStats.map((rs) => {
      const n = cnt(rawRows, g.lo, g.hi, 'startRowIndex', rs.rowIndex);
      return `${n} (${p2(n, total)})`;
    });
    lines.push(`| ${g.label} | ${cols.join(' | ')} | ${total} |`);
  }
  const expRowHdr = rowStats.map((rs) => `${p2(rs.expectedWinRate * nRaces, nRaces)}`).join(' | ');
  lines.push(`| *(erw. je Pl.1)* | ${expRowHdr} | — |`);

  // ── Table B.2 ───────────────────────────────────────────────────────────────
  lines.push('');
  lines.push('#### B.2 — End-Platz-Gruppen × Soll-Bereich');
  lines.push('');
  lines.push('| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const g of rankGroups) {
    const total = rawRows.filter((r) => r.finalRank >= g.lo && r.finalRank <= g.hi).length;
    const cols = [1, 2, 3, 4, 5].map((b) => {
      const n = cnt(rawRows, g.lo, g.hi, 'sollBereich', b);
      return `${n} (${p2(n, total)})`;
    });
    lines.push(`| ${g.label} | ${cols.join(' | ')} | ${total} |`);
  }

  // ── Table C — B1 mismatch ───────────────────────────────────────────────────
  const b1Rows = rawRows.filter((r) => r.sollBereich === 1);
  const b1Total = b1Rows.length;
  lines.push('');
  lines.push('#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)');
  lines.push('');
  lines.push('| Tatsächlich gelandet | Anzahl | Anteil |');
  lines.push('|---|---|---|');
  const cBuckets = [
    { label: 'Pl. 1–5 ✅ Soll erreicht', lo: 1, hi: 5 },
    { label: 'Pl. 6–10', lo: 6, hi: 10 },
    { label: 'Pl. 11–15', lo: 11, hi: 15 },
    { label: 'Pl. 16–25', lo: 16, hi: 25 },
    { label: 'Pl. 26–40', lo: 26, hi: 40 },
    { label: `Pl. 41–${nRacers} ❌ schwerer Miss`, lo: 41, hi: nRacers },
  ];
  for (const b of cBuckets) {
    const n = b1Rows.filter((r) => r.finalRank >= b.lo && r.finalRank <= b.hi).length;
    lines.push(`| ${b.label} | ${n} | ${p2(n, b1Total)} |`);
  }
  // Per-row hit rates for B1
  lines.push('');
  lines.push('Trefferquote B1 nach Start-Reihe:');
  lines.push('');
  const b1RowCols = rowStats.map((rs) => `Row ${rs.rowIndex}`).join(' | ');
  lines.push(`| Metrik | ${b1RowCols} |`);
  lines.push(`|---|${rowStats.map(() => '---|').join('')}`);
  const b1HitRow = rowStats.map((rs) => {
    const grp = b1Rows.filter((r) => r.startRowIndex === rs.rowIndex);
    const hits = grp.filter((r) => r.finalRank >= 1 && r.finalRank <= 5).length;
    return `${hits}/${grp.length} (${p2(hits, grp.length)})`;
  }).join(' | ');
  const b1MissHeavyRow = rowStats.map((rs) => {
    const grp = b1Rows.filter((r) => r.startRowIndex === rs.rowIndex);
    const heavy = grp.filter((r) => r.finalRank >= 41).length;
    return `${heavy} (${p2(heavy, grp.length)})`;
  }).join(' | ');
  lines.push(`| Treffer (Pl. 1–5) | ${b1HitRow} |`);
  lines.push(`| Schwerer Miss (Pl. 41+) | ${b1MissHeavyRow} |`);

  // ── Table D — B5 brake leak ──────────────────────────────────────────────────
  const b5Rows = rawRows.filter((r) => r.sollBereich === 5);
  const b5Total = b5Rows.length;
  lines.push('');
  lines.push('#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)');
  lines.push('');
  lines.push('| Tatsächlich gelandet | Anzahl | Anteil |');
  lines.push('|---|---|---|');
  const dBuckets = [
    { label: `Pl. 41–${nRacers} ✅ Soll erreicht`, lo: 41, hi: nRacers },
    { label: 'Pl. 26–40', lo: 26, hi: 40 },
    { label: 'Pl. 16–25', lo: 16, hi: 25 },
    { label: 'Pl. 6–15', lo: 6, hi: 15 },
    { label: 'Pl. 1–5 ❌ Brems-Leck', lo: 1, hi: 5 },
  ];
  for (const b of dBuckets) {
    const n = b5Rows.filter((r) => r.finalRank >= b.lo && r.finalRank <= b.hi).length;
    lines.push(`| ${b.label} | ${n} | ${p2(n, b5Total)} |`);
  }
  // Per-row escape-to-top-5 rate (the critical Row0 leak metric)
  lines.push('');
  lines.push('Brems-Leck Top-5 nach Start-Reihe:');
  lines.push('');
  lines.push(`| Metrik | ${b1RowCols} |`);
  lines.push(`|---|${rowStats.map(() => '---|').join('')}`);
  const b5LeakRow = rowStats.map((rs) => {
    const grp = b5Rows.filter((r) => r.startRowIndex === rs.rowIndex);
    const leaks = grp.filter((r) => r.finalRank <= 5).length;
    return `${leaks}/${grp.length} (${p2(leaks, grp.length)})`;
  }).join(' | ');
  lines.push(`| Top-5 trotz B5-Ziel | ${b5LeakRow} |`);

  return lines;
}

function fairLabel(p, rowStats) {
  if (p >= 0.05) return '✅ Fair';
  const row0Rate = rowStats[0]?.winRate ?? 0;
  const expected = rowStats[0]?.expectedWinRate ?? (1 / rowStats.length);
  if (row0Rate > expected + 0.05) return '⚠️ Front-Bias';
  if (row0Rate < expected - 0.05) return '⚠️ Rear-Bias';
  return '⚠️ Unequal';
}

function buildReport(allResults, rawData, runDate) {
  const lines = [];

  lines.push('# RaceArena — Fairness Simulation Report');
  lines.push('');
  lines.push(`**Datum:** ${runDate}  `);
  lines.push(`**Rennen pro Kombination:** ${N_RACES}  `);
  lines.push(`**Teilnehmer pro Rennen:** ${N_RACERS}  `);
  lines.push(`**Distanz-Varianten:** 30s / 120s  `);
  lines.push(`**Catch-Up (speedBonusFactor):** ${DEFAULT_ROW_LAYOUT_CONFIG.speedBonusFactor}  `);
  lines.push(`**PRNG:** mulberry32, Seeds 1–${N_RACES}  `);
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Overview table ──
  lines.push('## Übersicht — Win-Rate pro Startreihe');
  lines.push('');
  lines.push('Erwartete Win-Rate bei perfekter Fairness: **1 / Anzahl Reihen**.  ');
  lines.push('Signifikanz: Chi²-Test, H₀ = alle Reihen gleichwahrscheinlich.  ');
  lines.push('`⚠️ Front-Bias` = Row 0 gewinnt zu oft; `⚠️ Rear-Bias` = Row 0 gewinnt zu selten.  ');
  lines.push('');

  lines.push(
    '| Track | Racer | Dist | Reihen | Erwart. | ' +
    'R0 WinRate | R1 WinRate | R2+ WinRate | χ² | p-Wert | Urteil |'
  );
  lines.push(
    '|-------|-------|------|--------|---------|' +
    '-----------|------------|-------------|-----|--------|--------|'
  );

  const FAIR_THRESHOLD = 0.05;
  const unfairCombos = [];
  const fairCombos   = [];

  for (const res of allResults) {
    const { trackId, trackName, racerType, durationSec, stats } = res;
    const { totalRows, rowStats, chiSq, pValue } = stats;
    const r0 = rowStats[0];
    const r1 = rowStats[1];
    const rRest = rowStats.slice(2);
    const restWinRate = rRest.length > 0
      ? rRest.reduce((s, r) => s + r.wins, 0) / (N_RACES * rRest.length || 1)
      : '—';

    // Show R0 weighted expected in overview (uniform expected is the same for all rows when equal)
    const r0Expected = r0?.expectedWinRate ?? (1 / totalRows);
    const verdict = fairLabel(pValue, rowStats);
    lines.push(
      `| ${trackName} | ${racerType} | ${durationSec}s | ${totalRows} | ${fmtPct(r0Expected)} | ` +
      `${r0 ? fmtPct(r0.winRate) : '—'} | ` +
      `${r1 ? fmtPct(r1.winRate) : '—'} | ` +
      `${typeof restWinRate === 'number' ? fmtPct(restWinRate) : restWinRate} | ` +
      `${fmtN(chiSq, 1)} | ${sigLabel(pValue)} | ${verdict} |`
    );

    if (pValue < FAIR_THRESHOLD) unfairCombos.push(res);
    else fairCombos.push(res);
  }
  lines.push('');

  // ── Per-combination detail sections ──
  lines.push('---');
  lines.push('');
  lines.push('## Detail-Auswertung pro Kombination');
  lines.push('');

  for (const res of allResults) {
    const { trackId, trackName, racerType, durationSec, finishT, stats } = res;
    const { nRaces, totalRows, rowStats, chiSq, df, pValue } = stats;

    lines.push(`### ${trackName} × ${racerType} × ${durationSec}s`);
    lines.push('');
    lines.push(`- **finishT:** ${finishT.toFixed(4)} (Ziellinie in t-Raum)`);
    lines.push(`- **Reihen:** ${totalRows} (gewichtete Erwartung nach Reihengröße)`);
    lines.push(`- **Chi²(${df}):** ${fmtN(chiSq, 2)} — ${sigLabel(pValue)}`);
    lines.push('');

    lines.push('| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |');
    lines.push('|-------|-------|----------|-----------------|------------|--------|--------|');
    for (const rs of rowStats) {
      const delta = rs.winRate - rs.expectedWinRate;
      const sign  = delta >= 0 ? '+' : '';
      lines.push(
        `| Row ${rs.rowIndex} | ${rs.wins} | ${fmtPct(rs.winRate)} | ${fmtPct(rs.expectedWinRate)} | ` +
        `${sign}${fmtPct(delta)} | ${fmtN(rs.avgRank, 1)} | ${fmtN(rs.stdRank, 1)} |`
      );
    }
    lines.push('');

    // Diagnostic tables A-E (only when race-plan sollBereich data is available)
    const comboRaw = rawData
      ? rawData.filter(
          (r) =>
            r.trackId === trackId &&
            r.racerType === racerType &&
            r.durationSec === durationSec &&
            r.sollBereich != null
        )
      : [];
    if (comboRaw.length > 0) {
      lines.push('');
      lines.push('#### E — 1.5×-Gate Aggregat (gewichtet)');
      lines.push('');
      const gateRows = rowStats.filter((rs) => rs.expectedWinRate * nRaces >= 3);
      const gatePass = gateRows.every(
        (rs) => rs.winRate >= rs.expectedWinRate / 1.5 && rs.winRate <= rs.expectedWinRate * 1.5
      );
      lines.push(`Gate-Status: **${gatePass ? '✅ PASS' : '❌ FAIL'}** | χ²(${df}) = ${fmtN(chiSq, 2)} | ${sigLabel(pValue)}`);
      lines.push('');
      lines.push(...buildDiagnosticTables(comboRaw, rowStats));
      lines.push('');
    }
  }

  // ── Mixing-Quote (nur Open Tracks) ──
  const openResults = allResults.filter((r) => r.isOpen && r.avgMixingQuota != null);
  if (openResults.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Mixing-Quote — Open Tracks (t-Space-Mixing-Validierung)');
    lines.push('');
    lines.push(
      'Anteil der Row-1-Racer die bei Ablauf von `avoidanceWarmupMs` mindestens einen Row-0-Racer ' +
      'im t-Raum überholt haben. Zielbereich: **60–95 %**.'
    );
    lines.push('');
    lines.push('| Track | Racer | Dist | Mixing-Quote | Bewertung |');
    lines.push('|-------|-------|------|-------------|-----------|');
    for (const res of openResults) {
      const q     = res.avgMixingQuota;
      const pct   = fmtPct(q);
      const label = q < 0.60 ? '⚠️ Zu wenig Mixing' : q > 0.95 ? '⚠️ Zu viel Mixing' : '✅ OK';
      lines.push(`| ${res.trackName} | ${res.racerType} | ${res.durationSec}s | ${pct} | ${label} |`);
    }
    lines.push('');
  }

  // ── Gesamtauswertung ──
  lines.push('---');
  lines.push('');
  lines.push('## Gesamtauswertung');
  lines.push('');
  lines.push(`**Getestete Kombinationen:** ${allResults.length}  `);
  lines.push(`**Davon statistisch fair (p≥0.05):** ${fairCombos.length}  `);
  lines.push(`**Davon statistisch unfair (p<0.05):** ${unfairCombos.length}  `);
  lines.push('');

  if (unfairCombos.length === 0) {
    lines.push('**Befund:** Keine Kombination zeigt statistisch signifikante Unfairness. ✅');
  } else {
    lines.push('**Kombinationen mit signifikantem Ungleichgewicht (p < 0.05):**');
    lines.push('');
    for (const res of unfairCombos) {
      const { trackName, racerType, durationSec, stats } = res;
      const { rowStats, pValue } = stats;
      const r0Rate = rowStats[0]?.winRate ?? 0;
      const expRate = rowStats[0]?.expectedWinRate ?? (1 / rowStats.length);
      const bias = r0Rate > expRate ? `Row 0 zu oft (${fmtPct(r0Rate)} statt erw. ${fmtPct(expRate)})` :
                   r0Rate < expRate ? `Row 0 zu selten (${fmtPct(r0Rate)} statt erw. ${fmtPct(expRate)})` :
                   'mittlere Reihen bevorzugt';
      lines.push(`- **${trackName} × ${racerType} × ${durationSec}s:** ${bias} — ${sigLabel(pValue)}`);
    }
  }
  lines.push('');

  // ── Empfehlung ──
  lines.push('---');
  lines.push('');
  lines.push('## Empfehlung');
  lines.push('');

  // Analyze patterns
  const frontBias = unfairCombos.filter((r) => {
    const rs = r.stats.rowStats;
    const exp = rs[0]?.expectedWinRate ?? (1 / rs.length);
    return (rs[0]?.winRate ?? 0) > exp + 0.05;
  });
  const rearBias = unfairCombos.filter((r) => {
    const rs = r.stats.rowStats;
    const exp = rs[0]?.expectedWinRate ?? (1 / rs.length);
    return (rs[0]?.winRate ?? 0) < exp - 0.05;
  });
  const shortUnfair = unfairCombos.filter((r) => r.durationSec === 30);
  const longUnfair  = unfairCombos.filter((r) => r.durationSec === 120);

  lines.push('### Front-Row-Vorteil (Row 0 gewinnt zu oft)');
  if (frontBias.length === 0) {
    lines.push('Keine Kombination zeigt statistisch signifikanten Front-Row-Vorteil.');
  } else {
    for (const r of frontBias) {
      lines.push(`- **${r.trackName} × ${r.racerType} × ${r.durationSec}s** — ${sigLabel(r.stats.pValue)}`);
    }
  }
  lines.push('');

  lines.push('### Hinter-Row-Nachteil (Row 0 gewinnt zu selten / Catch-Up überkompensiert)');
  if (rearBias.length === 0) {
    lines.push('Keine Kombination zeigt Hinter-Row-Nachteil oder Überkompensation.');
  } else {
    for (const r of rearBias) {
      lines.push(`- **${r.trackName} × ${r.racerType} × ${r.durationSec}s** — ${sigLabel(r.stats.pValue)}`);
    }
  }
  lines.push('');

  lines.push('### Catch-Up-Mechanismus (speedBonusFactor = 1.0)');
  if (unfairCombos.length === 0) {
    lines.push(
      'Der Catch-Up-Mechanismus wirkt auf allen getesteten Tracks und Racer-Typen ausreichend. ' +
      'Kein statistisch signifikanter Reihen-Bias nachweisbar.'
    );
  } else {
    if (shortUnfair.length > longUnfair.length) {
      lines.push(
        `Unfairness tritt häufiger bei **kurzen Rennen (30s)** auf (${shortUnfair.length}/${unfairCombos.length} unfaire Kombos). ` +
        'Der Catch-Up-Mechanismus benötigt Renndauer zum Wirken — bei sehr kurzen Rennen ist die Ausgleichswirkung begrenzt.'
      );
    } else if (longUnfair.length > shortUnfair.length) {
      lines.push(
        `Unfairness tritt häufiger bei **langen Rennen (120s)** auf (${longUnfair.length}/${unfairCombos.length} unfaire Kombos). ` +
        'Das deutet auf akkumulierende Effekte hin, die den Bonus langfristig aus dem Gleichgewicht bringen.'
      );
    } else {
      lines.push(
        `Unfairness verteilt sich gleichmäßig auf kurze und lange Rennen ` +
        `(${shortUnfair.length} × 30s, ${longUnfair.length} × 120s).`
      );
    }
  }
  lines.push('');
  lines.push('*Hinweis: Dieser Abschnitt enthält ausschließlich statistische Beurteilungen, keine Code-Empfehlungen.*');
  lines.push('');

  // ── Phase-3A: Naturalness section (Open Tracks only) ──
  const openWithNat = allResults.filter((r) => r.isOpen && r.avgNaturalness);
  if (openWithNat.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Phase-3A — Naturalness-Metriken (Open Tracks)');
    lines.push('');
    lines.push(
      'Stabile Phase: 25%–95% der targetDuration. ' +
      'Jerk: |Δ(effSpeed)/DT| / max(baseSpeed, ε). ' +
      'naturalOvt: Anteil Überholungen mit tDiff ≤ 30% des Referenzabstands.'
    );
    lines.push('');
    lines.push(
      '| Track | Racer | Dist | meanJerk | maxJerk | jerkHigh% | natOvt% | pulkTime% | pulkTrigIn | pulkTrigOut |'
    );
    lines.push(
      '|-------|-------|------|----------|---------|-----------|---------|-----------|-----------|-------------|'
    );
    for (const res of openWithNat) {
      const n = res.avgNaturalness;
      lines.push(
        `| ${res.trackName} | ${res.racerType} | ${res.durationSec}s` +
        ` | ${n.meanJerk.toFixed(4)} | ${n.maxJerkSpike.toFixed(4)}` +
        ` | ${(n.jerkFraction_high * 100).toFixed(1)}%` +
        ` | ${(n.naturalOvertakeFraction * 100).toFixed(1)}%` +
        ` | ${(n.pulkTimeFraction * 100).toFixed(1)}%` +
        ` | ${n.pulkTriggersInWindow.toFixed(2)}` +
        ` | ${n.pulkTriggersOutOfWindow.toFixed(2)} |`
      );
    }
    lines.push('');
  }

  // ── Lateral Quality Metrics (all tracks) ──
  const withLateralQ = allResults.filter((r) => r.avgNaturalness && r.avgNaturalness.overlapRate != null);
  if (withLateralQ.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Lateral Quality Metrics');
    lines.push('');
    lines.push(
      'overlapRate: % of active pair-frames with |dT|<10%·bodyH/pathLen AND |dY|<10%·bodyW/trackW (old center-proximity metric).  \n' +
      'honestOverlapRate: % of pair-frames where rendered body boxes actually overlap — full body extents, all pairs, open+closed (NEW).  \n' +
      'overlapResolution: avg consecutive frames a pair stays in overlap before separating.  \n' +
      'zigzagScore: avg |physicalYVelocity change| per racer-frame (after 4s) — target < 0.003.  \n' +
      'lateralSpeedScore: avg |physicalYVelocity| per racer-frame (after 4s) — lower = smoother.  \n' +
      'brakeRate: fraction of racer-frames where speed-brake is active (after 4s) — lower = less blockage.  \n' +
      'stableOvertakes: confirmed lead-swaps (≥3s) per racer in 20%–80% of race — higher = more action.'
    );
    lines.push('');
    lines.push('| Track | Racer | Dist | N | overlapRate% | honestOverlap% | gap | overlapResolution (fr) | zigzagScore |');
    lines.push('|-------|-------|------|---|-------------|----------------|-----|------------------------|-------------|');
    for (const res of withLateralQ) {
      const n = res.avgNaturalness;
      const zigzagLabel = (n.zigzagScore ?? 0) < 0.005 ? '✅' : '⚠️';
      const oldOvl  = (n.overlapRate    ?? 0) * 100;
      const newOvl  = (n.honestOverlapRate ?? 0) * 100;
      const gapOvl  = newOvl - oldOvl;
      const honestLabel = newOvl > 0.5 ? ' ⚠️' : '';
      lines.push(
        `| ${res.trackName} | ${res.racerType} | ${res.durationSec}s | ${res.nRacers ?? '—'}` +
        ` | ${oldOvl.toFixed(1)}%` +
        ` | ${newOvl.toFixed(1)}%${honestLabel}` +
        ` | +${gapOvl.toFixed(1)}%` +
        ` | ${(n.overlapResolutionFrames ?? 0).toFixed(1)}` +
        ` | ${(n.zigzagScore ?? 0).toFixed(6)} ${zigzagLabel} |`
      );
    }
    lines.push('');

    // Fair-chance placement table (Step 1, only when race plan data is present)
    // Fair-chance placement — aggregate + per-row (all combos with race-plan data)
    const withFairChance = allResults.filter((r) => (r.avgNaturalness?.fairChanceB1Count ?? 0) > 0);
    if (withFairChance.length > 0) {
      lines.push('---');
      lines.push('');
      lines.push('## Fair-Chance Placement (B1 target ranks 1–5)');
      lines.push('');
      lines.push(
        'B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  \n' +
        'B1top5: fraction finishing anywhere in top 5.  \n' +
        'Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.'
      );
      lines.push('');
      lines.push('### Aggregate (all B1 racers, across all races)');
      lines.push('');
      lines.push('| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |');
      lines.push('|-------|-------|------|---|----------|---------|------|');
      for (const res of withFairChance) {
        const fc = res.avgNaturalness;
        const exact = (fc.fairChanceExactRate ?? 0) * 100;
        const top5  = (fc.fairChanceTop5Rate  ?? 0) * 100;
        const gap   = top5 - exact;
        lines.push(
          `| ${res.trackName} | ${res.racerType} | ${res.durationSec}s | ${res.nRacers ?? '—'}` +
          ` | ${exact.toFixed(1)}% | ${top5.toFixed(1)}% | ${gap.toFixed(1)}% |`
        );
      }
      lines.push('');

      // Per-row breakdown: for each combo that has row data, emit a separate table
      const withRowData = withFairChance.filter((r) => (r.avgNaturalness?.fairChanceByRow?.length ?? 0) > 1);
      if (withRowData.length > 0) {
        lines.push('### Per-Starting-Row Breakdown');
        lines.push('');
        lines.push(
          'Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  \n' +
          'n = total B1-racer appearances from that row across all 10 races.  \n' +
          'exact% and top5% are the hit rates for that starting row only.'
        );
        lines.push('');
        // Collect all row indices seen across all combos for the header
        const allRowIdxs = [...new Set(withRowData.flatMap((r) => r.avgNaturalness.fairChanceByRow.map((rd) => rd.row)))].sort((a, b) => a - b);
        const rowHdrs = allRowIdxs.flatMap((ri) => [`R${ri} exact%`, `R${ri} top5%`, `R${ri} n`]);
        lines.push(`| Track | Racer | Dist | ${rowHdrs.join(' | ')} |`);
        lines.push(`|-------|-------|------|${allRowIdxs.map(() => '---|---|---').join('')}|`);
        for (const res of withRowData) {
          const rowMap = new Map(res.avgNaturalness.fairChanceByRow.map((rd) => [rd.row, rd]));
          const cells  = allRowIdxs.flatMap((ri) => {
            const rd = rowMap.get(ri);
            if (!rd) return ['—', '—', '0'];
            return [
              rd.exactRate != null ? (rd.exactRate * 100).toFixed(0) + '%' : '—',
              rd.top5Rate  != null ? (rd.top5Rate  * 100).toFixed(0) + '%' : '—',
              String(rd.b1Count),
            ];
          });
          lines.push(`| ${res.trackName} | ${res.racerType} | ${res.durationSec}s | ${cells.join(' | ')} |`);
        }
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

// ── Diagnostic printer ───────────────────────────────────────────────────────
function printDiagnosticReport(diagSnapshots, trackName, racerType, durationSec, seed) {
  const lines = [];
  lines.push(`\n${'='.repeat(70)}`);
  lines.push(`Phase-2K v4 — Frame-by-Frame Diagnostic`);
  lines.push(`Track: ${trackName} | Racer: ${racerType} | Duration: ${durationSec}s | Seed: ${seed}`);
  lines.push('='.repeat(70));

  for (const snap of diagSnapshots) {
    lines.push(`\n── Snapshot t=${snap.timeS.toFixed(3)}s (actual: ${snap.actualTimeMs.toFixed(0)}ms) ──`);
    // Interval stats
    lines.push(
      `   Interval: ${snap.interval.lateralPushes} lateral pushes | ` +
      `${snap.interval.brakeActivations} brake activations | ` +
      `${snap.interval.newOvertakes} new v4 overtakes`
    );
    // Per-row summary
    const rows = new Map();
    for (const r of snap.racers) {
      if (!rows.has(r.row)) rows.set(r.row, []);
      rows.get(r.row).push(r);
    }
    for (const [rowIdx, racersInRow] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
      const ts     = racersInRow.map((r) => r.t);
      const avd    = racersInRow.filter((r) => r.avoidance).length;
      const v4Mults = racersInRow.map((r) => r.v4Mult).filter((m) => m !== 1.0);
      const v4Str  = v4Mults.length > 0 ? ` | v4Mult=${v4Mults[0].toFixed(4)}` : '';
      lines.push(
        `   Row ${rowIdx} (${racersInRow.length} racers): ` +
        `t=[${Math.min(...ts).toFixed(4)}, ${Math.max(...ts).toFixed(4)}]` +
        `${v4Str} | avoidance: ${avd}/${racersInRow.length}`
      );
    }
    // Brake-zone pairs grouped by row combination
    const bz = snap.brakeZonePairs;
    if (bz.length === 0) {
      lines.push(`   Brake-zone pairs (dT<0.015 AND |dY|<0.2): 0`);
    } else {
      const rowComboCount = new Map();
      for (const p of bz) {
        const key = `R${p.followerRow}→R${p.leaderRow}`;
        rowComboCount.set(key, (rowComboCount.get(key) ?? 0) + 1);
      }
      const comboStr = [...rowComboCount.entries()].map(([k, v]) => `${k}: ${v}`).join(', ');
      lines.push(`   Brake-zone pairs: ${bz.length} (${comboStr})`);
      // Show top 5 by dT (smallest gap = most likely to brake)
      const top = [...bz].sort((a, b) => a.dT - b.dT).slice(0, 5);
      for (const p of top) {
        lines.push(`     R${p.follower}(Row${p.followerRow}) → R${p.leader}(Row${p.leaderRow})  dT=${p.dT.toFixed(5)}  dY=${p.dY.toFixed(4)}`);
      }
    }
    // Close pairs (|dT|<0.005 AND |dY|<0.3)
    const cp = snap.closePairs;
    if (cp.length === 0) {
      lines.push(`   Close pairs (|dT|<0.005 AND |dY|<0.3): 0`);
    } else {
      lines.push(`   Close pairs: ${cp.length}`);
      for (const p of cp.slice(0, 5)) {
        lines.push(`     R${p.a}(Row${p.aRow}) ↔ R${p.b}(Row${p.bRow})  dT=${p.dT.toFixed(5)}  dY=${p.dY.toFixed(4)}`);
      }
    }
  }
  lines.push('');
  return lines.join('\n');
}

// ── Phase-3B: COMEBACK analysis report ────────────────────────────────────────
function printComebackReport(raceResults, { trackName, racerType, durationSec, minPositions, windowSec, endgameThresh }) {
  const diags = raceResults.map((r) => r.comebackDiag).filter(Boolean);
  if (diags.length === 0) return;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`Phase-3B — COMEBACK Analyse: ${trackName} × ${racerType} × ${durationSec}s`);
  console.log(`  Bedingung: OUTCOME-Phase + ≥${minPositions} Plätze in ${windowSec}s  |  Endgame: >${(endgameThresh * 100).toFixed(0)}% finishT`);
  console.log('═'.repeat(70));

  for (let i = 0; i < raceResults.length; i++) {
    const d    = diags[i];
    const seed = raceResults[i]._seed ?? (i + 1);
    const outStart = d.outcomeStartS != null ? d.outcomeStartS.toFixed(1) + 's' : '—';
    const outEnd   = d.outcomeEndS   != null ? d.outcomeEndS.toFixed(1)   + 's' : `>${durationSec}s`;
    const egStr    = d.endgameStartS != null ? d.endgameStartS.toFixed(1) + 's' : 'nie';
    console.log(`\nSeed ${seed}:`);
    console.log(`  OUTCOME:           ${outStart} – ${outEnd}  (${d.outcomeDurS.toFixed(1)}s)`);
    console.log(`  Endgame (>${(endgameThresh * 100).toFixed(0)}%): ${egStr}  → effektives Fenster: ${d.effectiveDurS.toFixed(1)}s`);
    console.log(`  COMEBACK-Trigger:  ${d.triggerCount}`);
    for (const t of d.triggers) {
      console.log(`    t=${t.ts.toFixed(1)}s  ${t.name.padEnd(6)}  +${t.gain} Plätze`);
    }
    if (d.allMaxGains.length > 0) {
      const mn = Math.min(...d.allMaxGains);
      const mx = Math.max(...d.allMaxGains);
      const av = d.allMaxGains.reduce((s, v) => s + v, 0) / d.allMaxGains.length;
      console.log(`  Max-Platzgewinn B1 (${windowSec}s-Fenster): min=${mn}  max=${mx}  avg=${av.toFixed(1)}`);
    } else {
      console.log(`  Max-Platzgewinn B1: keine Daten`);
    }
  }

  // Aggregate
  if (diags.length > 1) {
    console.log(`\n── Aggregat (${diags.length} Rennen) ──`);
    const avgOutDur   = diags.reduce((s, d) => s + d.outcomeDurS,   0) / diags.length;
    const avgEffDur   = diags.reduce((s, d) => s + d.effectiveDurS, 0) / diags.length;
    const avgTriggers = diags.reduce((s, d) => s + d.triggerCount,  0) / diags.length;
    const zeroTrig    = diags.filter((d) => d.triggerCount === 0).length;
    const allMaxGains = diags.flatMap((d) => d.allMaxGains);
    console.log(`  OUTCOME Dauer:       Ø ${avgOutDur.toFixed(1)}s`);
    console.log(`  Effektives Fenster:  Ø ${avgEffDur.toFixed(1)}s`);
    console.log(`  COMEBACK-Trigger:    Ø ${avgTriggers.toFixed(1)}/Rennen  (${zeroTrig}/${diags.length} ohne Trigger)`);
    if (allMaxGains.length > 0) {
      const mn   = Math.min(...allMaxGains);
      const mx   = Math.max(...allMaxGains);
      const av   = allMaxGains.reduce((s, v) => s + v, 0) / allMaxGains.length;
      const n1   = allMaxGains.filter((g) => g >= 1).length;
      const n2   = allMaxGains.filter((g) => g >= 2).length;
      const n3   = allMaxGains.filter((g) => g >= 3).length;
      const tot  = allMaxGains.length;
      console.log(`  Max-Platzgewinn B1:  min=${mn}  max=${mx}  avg=${av.toFixed(1)}  (${tot} Racer×Rennen)`);
      console.log(`  Davon ≥1 Platz: ${n1}/${tot} (${(n1/tot*100).toFixed(0)}%)`);
      console.log(`  Davon ≥2 Plätze: ${n2}/${tot} (${(n2/tot*100).toFixed(0)}%)`);
      console.log(`  Davon ≥3 Plätze: ${n3}/${tot} (${(n3/tot*100).toFixed(0)}%)`);
      // Slider recommendations
      console.log(`\n── Slider-Empfehlungen ──`);
      const rec = n3/tot >= 0.3 ? 3 : n2/tot >= 0.3 ? 2 : 1;
      console.log(`  comebackMinPositionsGained: empfohlen ${rec} (≥30%-Schwelle)`);
      if (avgEffDur < 8 && windowSec > 3) {
        console.log(`  comebackWindowSec: ggf. auf ≤${Math.max(2, Math.floor(avgEffDur / 2))}s senken (effektives Fenster nur ${avgEffDur.toFixed(1)}s)`);
      } else {
        console.log(`  comebackWindowSec: ${windowSec}s passt (effektives Fenster ${avgEffDur.toFixed(1)}s)`);
      }
      if (avgTriggers < 0.5) {
        console.log(`  ⚠️  Sehr wenige Trigger (Ø ${avgTriggers.toFixed(1)}) — minPositionsGained auf ${rec} oder Fenster vergrößern`);
      } else {
        console.log(`  ✅ Ø ${avgTriggers.toFixed(1)} Trigger/Rennen — COMEBACK-Event wird feuern`);
      }
    }
  }
  console.log('');
}

// ── Main ──────────────────────────────────────────────────────────────────────
const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('sim-fairness.mjs') ||
   process.argv[1].replace(/\\/g, '/').endsWith('scripts/sim-fairness.mjs'));

if (isMain) {
  if (SELFCHECK) { runFairnessSelfCheck(); process.exit(0); }
  const trackDataDir = join(ROOT, 'server/seeds/tracks');
  const trackFiles = [
    'dirt-oval', 'river-run', 'space-sprint', 'garden-path', 'city-circuit',
    'luger-hill',    // Luger hill (open)
    'ice-track',       // Ice Track (closed)
    'mountainstreet',  // Mountainstreet (open)
    'searound',        // Searound (closed)
    'seatrack',        // Seatrack (open)
  ];

  console.log('\n=== sim-fairness — RaceArena Fairness Simulation ===');
  console.log(`Rennen pro Kombination : ${N_RACES}`);
  console.log(`Teilnehmer pro Rennen  : ${N_RACERS}`);
  console.log(`Racer-Typen            : ${Object.keys(RACER_CONFIGS).length}`);
  console.log(`Tracks                 : ${trackFiles.length}`);
  console.log(
    `Gesamt-Rennen          : ${N_RACES} × ${Object.keys(RACER_CONFIGS).length} × ${trackFiles.length} × ${DURATION_VARIANTS.length} = ` +
    `${N_RACES * Object.keys(RACER_CONFIGS).length * trackFiles.length * DURATION_VARIANTS.length}`
  );
  console.log(`Output                 : ${OUT_DIR}`);
  console.log(`Seed                   : ${GLOBAL_SEED > 0 ? GLOBAL_SEED + ' (deterministisch)' : '0 (Math.random, Exploration)'}`);
  console.log(`Race Plan              : ${RACE_PLAN_ACTIVE ? '✅ aktiv' : '❌ inaktiv (Baseline-Modus)'}`);
  if (RACE_PLAN_ACTIVE) {
    console.log(`  bonusUntil=${(RP_BONUS_TRANSITION_END * 100).toFixed(0)}%  fade=${RP_BONUS_FADE_MS}ms  corridor=${(RP_CORRIDOR_START * 100).toFixed(0)}%→${(RP_CORRIDOR_END * 100).toFixed(0)}%`);
  }
  console.log(`Dynamics (reRoll/traj) : variation=${DYNAMICS_OVERRIDES.reRollVariationPercent}% transition=${DYNAMICS_OVERRIDES.reRollTransitionDuration}s divisor=${DYNAMICS_OVERRIDES.reRollIntervalDivisor} lastPos=${DYNAMICS_OVERRIDES.reRollLastPositionPercent}% trajTrans=${DYNAMICS_OVERRIDES.trajectoryTransitionDuration}s`);
  if (ACTION !== null) {
    console.log(`Action axis            : action=${ACTION.toFixed(3)} → director pull=${ACTION_KNOBS.governorDirectorPullStrength.toFixed(3)} maxParallel=${ACTION_KNOBS.governorDirectorMaxParallelBoosts} (settling=${DYNAMICS_OVERRIDES.governorDirectorSettling} FIXED)`);
  }
  if (TEF_ACTIVE) {
    console.log(`⚠️  Phase-2K TEF aktiv: α=${TEF_ALPHA} maxGap=${TEF_MAX_GAP} openOnly=${TEF_OPEN_ONLY}`);
    if (TEF_BASE_BONUS !== null) {
      console.log(`   v3: baseBonusOverride=${TEF_BASE_BONUS} für Rear-Rows, moduliert via tStart-Gap`);
    } else {
      console.log(`   v2: speedBonusMult wird bei Re-Rolls auf Basis tStart-Gap moduliert`);
    }
  }
  if (WARMUP_MS_OVERRIDE !== null) {
    console.log(`⚠️  Phase-2L: avoidanceWarmupMs=${WARMUP_MS_OVERRIDE} (Override; Default=${DEFAULT_RACE_BEHAVIOR_CONFIG.avoidanceWarmupMs})`);
  }
  if (Object.keys(BEHAVIOR_OVERRIDE).length > 0) {
    console.log(`⚠️  --behavior override: ${JSON.stringify(BEHAVIOR_OVERRIDE)}`);
  }
  if (COMEBACK_ANALYSIS) {
    if (!RACE_PLAN_ACTIVE) console.warn('⚠️  --comeback-analysis benötigt --race-plan=true — B1-Daten fehlen');
    console.log(`Phase-3B COMEBACK Analyse aktiv: minPositions=${CB_MIN_POSITIONS}  windowSec=${CB_WINDOW_SEC}  endgameThresh=${(CB_ENDGAME_THRESH * 100).toFixed(0)}%`);
  }
  if (V4_ACTIVE) {
    console.log(`⚠️  Phase-2K v4 aktiv: initBonus=${V4_INITIAL_BOOST} openOnly=true`);
    console.log(`   Metrik: ${V4_METRIC_TYPE}${V4_METRIC_TYPE === 'physical_overtake' ? ` (lateralProximity=${V4_LATERAL_PROXIMITY})` : ''}`);
    if (V4_METRIC_TYPE === 'per_racer' && (V4_ROW1_THRESHOLDS_RAW || V4_ROW_REST_THRESHOLDS_RAW)) {
      console.log(`   Row-1-Schwellen: ${V4_ROW1_THRESHOLDS.map((t) => t + '%').join(' → ')}`);
      console.log(`   Row-2+-Schwellen: ${V4_ROW2_THRESHOLDS.map((t) => t + '%').join(' → ')}`);
    } else {
      console.log(`   Schwellen: ${V4_THRESHOLDS.map((t) => t + '%').join(' → ')} Überholungen`);
    }
    console.log(`   Bonus-Schedule: ${V4_BOOST_SCHEDULE.join(' → ')}`);
    console.log(`   Übergänge: easeInOutCubic über ${DYNAMICS_OVERRIDES.reRollTransitionDuration}s (wie Re-Roll)`);
  }
  console.log('');

  mkdirSync(OUT_DIR, { recursive: true });

  const BASE_SPEED_MIN  = BASE_SPEED_MIN_OVR;
  const BASE_SPEED_MAX  = BASE_SPEED_MAX_OVR;
  const BASE_SPEED_MEAN = (BASE_SPEED_MIN + BASE_SPEED_MAX) / 2;
  if (BASE_SPEED_MIN !== DEFAULT_BASE_SPEED_CONFIG.min || BASE_SPEED_MAX !== DEFAULT_BASE_SPEED_CONFIG.max) {
    const spreadPct = (((BASE_SPEED_MAX - BASE_SPEED_MIN) / BASE_SPEED_MEAN) * 100).toFixed(1);
    console.log(`⚠️  Base-speed band OVERRIDE: min=${BASE_SPEED_MIN} max=${BASE_SPEED_MAX} (±${(spreadPct/2)}% / ${spreadPct}% total; default min=${DEFAULT_BASE_SPEED_CONFIG.min} max=${DEFAULT_BASE_SPEED_CONFIG.max})`);
  }

  const allResults = [];
  const rawData    = [];
  const breakawayAgg = BREAKAWAY_DIAG ? [] : null;  // per-combo breakaway aggregates (--breakaway-diag)
  const frontActionAgg = FRONT_ACTION ? [] : null;  // per-combo front-action aggregates (--front-action)
  const stripAgg = STRIP_METRICS ? [] : null;       // per-combo raw strip-down dumps (--strip-metrics)
  const actionAgg = ACTION_METRICS ? [] : null;     // per-combo raw action-metrics dumps (--action-metrics)
  const startTime  = Date.now();

  for (const trackId of trackFiles) {
    if (TRACK_FILTER && trackId !== TRACK_FILTER) continue;
    const trackPath = join(trackDataDir, `${trackId}.json`);
    if (!existsSync(trackPath)) {
      console.warn(`  [SKIP] Track nicht gefunden: ${trackPath}`);
      continue;
    }
    const track  = JSON.parse(readFileSync(trackPath, 'utf8'));
    const shape  = new EditorShape(track);
    const isOpen = !!shape.isOpen;
    const pathLengthPx       = track.pathLengthPx ?? shape.getTotalLength();
    // Read stored width first; getActualTrackWidth() overestimates for open tracks.
    const geometricTrackWidth = track.width ?? shape.getActualTrackWidth();
    const trackName = track.name ?? trackId;

    console.log(`── ${trackName} (${trackId}) — open=${isOpen} path=${Math.round(pathLengthPx)}px width=${Math.round(geometricTrackWidth)}px`);

    const trackSurfaces = track.surfaceClasses ?? [];
    for (const [racerType, cfg] of Object.entries(RACER_CONFIGS)) {
      if (RACER_FILTER && racerType !== RACER_FILTER) continue;
      // Racers incompatible with this track's surface (empty surfaceClasses = no restriction).
      const surfaceIncompatible = cfg.surfaceClasses.length > 0 && trackSurfaces.length > 0 &&
          !cfg.surfaceClasses.some((s) => trackSurfaces.includes(s));
      if (surfaceIncompatible) {
        // An EXPLICITLY requested racer (--racer=<id>) must ERROR, never silently skip — a silent
        // skip would yield 0 combos and a misleading "all fair" run. The default all-racers loop
        // (no --racer) still skips incompatible pairings as before.
        if (RACER_FILTER) {
          throw new Error(
            `Racer '${racerType}' is surface-incompatible with track '${trackId}': ` +
            `racer surfaces [${cfg.surfaceClasses.join(', ')}] ∩ track [${trackSurfaces.join(', ')}] = ∅. ` +
            `Refusing to silently skip an explicitly-requested racer.`
          );
        }
        continue;
      }
      const { speedMultiplier, displaySize, bodyFillX, bodyFillY } = cfg;

      for (const durationSec of DURATION_VARIANTS) {
        if (DUR_FILTER && durationSec !== Number(DUR_FILTER)) continue;
        // Phase-1: use topology-specific racer count (open vs closed).
        const nRacersForCombo = isOpen ? N_RACERS_OPEN : N_RACERS_CLOSED;
        // Open tracks: finishT = capped natural-distance (computeFinishT) at N-calibrated speed;
        //   trackNaturalBase = BASE_SPEED_MEAN / trackSsf so traversal time is length-invariant.
        // Closed tracks: finishT = lapsFromDuration(durationSec) — the SAME lap-count bucket as
        //   RaceScreen/index.jsx, headlessRaceSimulator.js, and sim-race-visual.mjs. closedSsf does
        //   NOT enter the finish line; it normalizes the back-solved speed only, inside runSingleRace
        //   (mirrors index.jsx). Do NOT route closed tracks through computeFinishT — that reintroduces
        //   the ~4.2-lap-vs-2-lap divergence this fix removed.
        const trackSsf = isOpen ? computeSpeedScaleFactor(pathLengthPx) : 1;
        // trackNaturalBase is only meaningful for OPEN tracks (consumed by computeFinishT below,
        // which is open-track-only). Closed tracks derive finishT from lapsFromDuration directly.
        const trackNaturalBase = isOpen ? BASE_SPEED_MEAN / trackSsf : undefined;
        const finishT = isOpen
          ? computeFinishT(trackNaturalBase, speedMultiplier, durationSec, isOpen)
          : lapsFromDuration(durationSec);

        // Compute row count and sizes for this track/racer combo (deterministic, seed-independent).
        // Mirrors browser's bottom-up computeRacerLayout path (Sim adjusted to match).
        const effectiveWidth       = geometricTrackWidth * DEFAULT_RACE_BEHAVIOR_CONFIG.startSpreadRange;
        const comboLayout          = computeRacerLayout(effectiveWidth, nRacersForCombo, displaySize, DEFAULT_AUTO_SCALE_CONFIG);
        const comboEffDisplaySize  = comboLayout.spriteSize;
        const comboAutoScale       = comboEffDisplaySize / displaySize;
        const rowGapPx             = comboEffDisplaySize * DEFAULT_ROW_LAYOUT_CONFIG.rowGapMultiplier;
        const totalRows            = comboLayout.rowCount;
        const rowSizes             = comboLayout.layout;
        // Seed the start-row shuffle deterministically when running a reproducible batch
        // (GLOBAL_SEED>0). GLOBAL_SEED=0 (exploration) keeps Math.random. This is what makes
        // --seed control the FULL batch — including the race-plan's start-row assignment.
        const comboLayoutRng       = GLOBAL_SEED > 0
          ? makePRNG(comboLayoutSeed(trackId, racerType, GLOBAL_SEED))
          : Math.random;
        const comboRowLayout       = computeEvenRowLayout(nRacersForCombo, totalRows, comboLayoutRng);

        process.stdout.write(
          `   ${racerType.padEnd(10)} ${durationSec}s  finishT=${finishT.toFixed(3)}  rows=${totalRows}  sf=${comboAutoScale.toFixed(2)}  `
        );

        const raceResults   = [];
        const mixingQuotas  = [];
        const v4ThreshLogs  = [];
        for (let raceIdx = 0; raceIdx < N_RACES; raceIdx++) {
          // seed=0 → non-deterministic (exploration); seed>0 → reproducible batch
          const seed = GLOBAL_SEED > 0 ? (GLOBAL_SEED - 1) * N_RACES + raceIdx + 1 : 0;
          // Phase-3A: create Race Plan + TrajectoryController for this race when active
          let racePlanController = null;
          let raceSollRankMap = null;
          let b1Indices = new Set();
          if (RACE_PLAN_ACTIVE) {
            const planRacers = comboRowLayout.assignments.map(
              (a) => ({ index: a.racerIndex, startRowIndex: a.rowIndex })
            );
            const plan = createRacePlan(planRacers, finishT, durationSec * 1000, {
              bonusStrengthMultiplier: BONUS_MULT,
              bonusTransitionEnd:      RP_BONUS_TRANSITION_END,
              bonusFadeDuration:       RP_BONUS_FADE_MS,
              corridorStart:           RP_CORRIDOR_START,
              corridorEnd:             RP_CORRIDOR_END,
              pulkBiasGain:            RP_PULK_BIAS_GAIN,
              directorV4Enabled:       DIRECTOR_V4_ENABLED,
              directorV4Intensity:     DIRECTOR_V4_INTENSITY,
              directorV4PackBandStrictness: DIRECTOR_V4_PACK_BAND_STRICTNESS,
              directorV4ReleaseProgress: DIRECTOR_V4_RELEASE_PROGRESS,
              directorV4ResolveB2:     DIRECTOR_V4_RESOLVE_B2,
              directorV4ResolveB3:     DIRECTOR_V4_RESOLVE_B3,
              directorV4ResolveB4:     DIRECTOR_V4_RESOLVE_B4,
              directorV4ResolveB5:     DIRECTOR_V4_RESOLVE_B5,
              directorV4OutcomeStart:  DIRECTOR_V4_OUTCOME_START,
            }, seed);
            racePlanController = createTrajectoryController(plan);
            raceSollRankMap = plan._racerTargetRank;
            if (COMEBACK_ANALYSIS) {
              for (const [idx, sr] of raceSollRankMap) {
                if (sr <= 5) b1Indices.add(idx);
              }
            }
          }
          const result = runSingleRace({
            shape,
            pathLengthPx,
            geometricTrackWidth,
            isOpen,
            speedMultiplier,
            displaySize,
            bodyFillX,
            bodyFillY,
            finishT,
            targetSeconds: durationSec,
            seed,
            nRacers: nRacersForCombo,
            diagnosticMode: DIAG_MODE,
            behaviorConfigOverrides: {
              isOpen,
              ...(WARMUP_MS_OVERRIDE !== null ? { avoidanceWarmupMs: WARMUP_MS_OVERRIDE } : {}),
              ...BEHAVIOR_OVERRIDE,
            },
            racePlanController,
            comebackAnalysisConfig: COMEBACK_ANALYSIS && RACE_PLAN_ACTIVE
              ? { b1Indices, minPositions: CB_MIN_POSITIONS, windowSec: CB_WINDOW_SEC, endgameThresh: CB_ENDGAME_THRESH }
              : null,
            breakawayDiag:      BREAKAWAY_DIAG,
            frontAction:        FRONT_ACTION,
            racerTargetRankMap: raceSollRankMap,
          });
          // Step 1: fair-chance placement metrics (requires race-plan target ranks)
          if (raceSollRankMap) {
            const b1Entries = [...raceSollRankMap.entries()].filter(([, sr]) => sr <= 5);
            let fcExact = 0, fcTop5 = 0;
            // Gap B: per-starting-row breakdown (rowIndex → {b1Count, exactHits, top5Hits})
            const fcByRow = new Map();
            for (const [racerIdx, sollRank] of b1Entries) {
              const rr = result.find((x) => x.racerIndex === racerIdx);
              if (!rr) continue;
              const row = rr.startRowIndex;
              if (!fcByRow.has(row)) fcByRow.set(row, { b1Count: 0, exactHits: 0, top5Hits: 0 });
              const rd = fcByRow.get(row);
              rd.b1Count++;
              if (rr.finalRank === sollRank) { fcExact++; rd.exactHits++; }
              if (rr.finalRank <= 5) { fcTop5++; rd.top5Hits++; }
            }
            result.fairChanceB1Count   = b1Entries.length;
            result.fairChanceExactHits  = fcExact;
            result.fairChanceTop5Hits   = fcTop5;
            result.fairChanceByRow      = fcByRow;
          } else {
            result.fairChanceB1Count   = 0;
            result.fairChanceExactHits  = 0;
            result.fairChanceTop5Hits   = 0;
            result.fairChanceByRow      = new Map();
          }
          raceResults.push(result);
          if (COMEBACK_ANALYSIS) result._seed = seed;
          if (result.mixingQuota != null) mixingQuotas.push(result.mixingQuota);
          if (result.v4ThreshLog != null) v4ThreshLogs.push(result.v4ThreshLog);
          if (DIAG_MODE && result.diagSnapshots) {
            const diagText = printDiagnosticReport(result.diagSnapshots, trackName, racerType, durationSec, seed);
            console.log(diagText);
            const diagPath = join(OUT_DIR, `diag-${trackId}-${racerType}-${durationSec}s-seed${seed}.json`);
            writeFileSync(diagPath, JSON.stringify({ trackId, trackName, racerType, durationSec, seed, snapshots: result.diagSnapshots }, null, 2));
            console.log(`Diagnostic JSON → ${diagPath}`);
          }

          // Collect raw data
          for (const r of result) {
            const sollRank = raceSollRankMap?.get(r.racerIndex) ?? null;
            const sollBereich = sollRank != null
              ? (BAND_EDGES.findIndex((e) => sollRank <= e) + 1 || BAND_EDGES.length + 1)
              : null;
            rawData.push({
              trackId,
              trackName,
              isOpen,
              racerType,
              durationSec,
              finishT,
              seed,
              raceIdx,
              sollRank,
              sollBereich,
              ...r,
              // PART-1 propagation fix: the governor field-shape telemetry is set on the per-race
              // result ARRAY (result.govGapLenMean …), not on the per-racer element `r` spread
              // above — so `...r` alone dropped it from rawData. Pull it from the array here.
              // Per-race value (identical across racers in a race). Only when the governor ran →
              // a governor-off run adds no columns and stays byte-identical.
              ...(GOVERNOR_ON ? {
                govGapLenMean:    result.govGapLenMean,
                govGapLenMax:     result.govGapLenMax,
                govGap2ndLenMean: result.govGap2ndLenMean,
                govFieldLenMean:  result.govFieldLenMean,
                govRankSwapRate:  result.govRankSwapRate,
              } : {}),
            });
          }
        }

        const stats = computeFairnessStats(raceResults, totalRows, rowSizes);
        // PART-1: surface the governor field-shape telemetry on results[].stats (racer-lengths).
        // These per-race values are set on the result ARRAY, so `r.govGapLenMean` reads correctly
        // here (unlike the per-racer rawData spread). Gated on GOVERNOR_ON → a governor-off run
        // leaves `stats` byte-identical (no governorShape key).
        if (GOVERNOR_ON && raceResults.length > 0) {
          stats.governorShape = {
            govGapLenMean:    raceResults.reduce((s, r) => s + (r.govGapLenMean ?? 0), 0) / raceResults.length,
            govGapLenMax:     Math.max(...raceResults.map((r) => r.govGapLenMax ?? 0)),
            govGap2ndLenMean: raceResults.reduce((s, r) => s + (r.govGap2ndLenMean ?? 0), 0) / raceResults.length,
            govFieldLenMean:  raceResults.reduce((s, r) => s + (r.govFieldLenMean ?? 0), 0) / raceResults.length,
            govRankSwapRate:  raceResults.reduce((s, r) => s + (r.govRankSwapRate ?? 0), 0) / raceResults.length,
          };
        }
        const avgMixingQuota = mixingQuotas.length > 0
          ? mixingQuotas.reduce((s, v) => s + v, 0) / mixingQuotas.length
          : null;
        // Aggregate naturalness metrics over all races in this combo
        const avgNaturalness = raceResults.length > 0 ? {
          meanJerk:               raceResults.reduce((s, r) => s + (r.naturalness?.meanJerk ?? 0), 0) / raceResults.length,
          maxJerkSpike:           Math.max(...raceResults.map((r) => r.naturalness?.maxJerkSpike ?? 0)),
          jerkFraction_high:      raceResults.reduce((s, r) => s + (r.naturalness?.jerkFraction_high ?? 0), 0) / raceResults.length,
          naturalOvertakeFraction: raceResults.reduce((s, r) => s + (r.naturalness?.naturalOvertakeFraction ?? 0), 0) / raceResults.length,
          pulkTimeFraction:       raceResults.reduce((s, r) => s + (r.naturalness?.pulkTimeFraction ?? 0), 0) / raceResults.length,
          pulkTriggersInWindow:   raceResults.reduce((s, r) => s + (r.naturalness?.pulkTriggersInWindow ?? 0), 0) / raceResults.length,
          pulkTriggersOutOfWindow: raceResults.reduce((s, r) => s + (r.naturalness?.pulkTriggersOutOfWindow ?? 0), 0) / raceResults.length,
          winnerBlockedFractionInOutcome: raceResults.reduce((s, r) => s + (r.naturalness?.winnerBlockedFractionInOutcome ?? 0), 0) / raceResults.length,
          planBiasDeltaMean:      raceResults.reduce((s, r) => s + (r.naturalness?.planBiasDeltaMean ?? 0), 0) / raceResults.length,
          pulkBiasEventCount:     raceResults.reduce((s, r) => s + (r.naturalness?.pulkBiasEventCount ?? 0), 0) / raceResults.length,
          racersInCorridorFraction: raceResults.reduce((s, r) => s + (r.naturalness?.racersInCorridorFraction ?? 0), 0) / raceResults.length,
          corridorViolationMean:  raceResults.reduce((s, r) => s + (r.naturalness?.corridorViolationMean ?? 0), 0) / raceResults.length,
          corridorViolationMax:   Math.max(...raceResults.map((r) => r.naturalness?.corridorViolationMax ?? 0)),
          bidirectionalBoostFraction: raceResults.reduce((s, r) => s + (r.naturalness?.bidirectionalBoostFraction ?? 0), 0) / raceResults.length,
          bidirectionalBrakeFraction: raceResults.reduce((s, r) => s + (r.naturalness?.bidirectionalBrakeFraction ?? 0), 0) / raceResults.length,
          racersBlockedInOutcome: raceResults.reduce((s, r) => s + (r.naturalness?.racersBlockedInOutcome ?? 0), 0) / raceResults.length,
          tmDelta5sMax:           Math.max(...raceResults.map((r) => r.naturalness?.tmDelta5sMax ?? 0)),
          tmOscillatingCount:     raceResults.reduce((s, r) => s + (r.naturalness?.tmOscillatingCount ?? 0), 0) / raceResults.length,
          overlapRate:             raceResults.reduce((s, r) => s + (r.liteOverlapRate ?? 0), 0) / raceResults.length,
          honestOverlapRate:       raceResults.reduce((s, r) => s + (r.honestOverlapRate ?? 0), 0) / raceResults.length,
          passThroughCount:        raceResults.reduce((s, r) => s + (r.passThroughCount ?? 0), 0) / raceResults.length,
          // Lapping instrumentation (closed tracks):
          maxRealSpreadMean:       raceResults.reduce((s, r) => s + (r.maxRealSpread ?? 0), 0) / raceResults.length,
          maxRealSpreadMax:        Math.max(...raceResults.map((r) => r.maxRealSpread ?? 0)),
          // NOTE: the governor field-shape metrics (govGapLen*/govGap2ndLen*/govFieldLen*/
          // govRankSwapRate) previously lived here but were dead (no reader) and mis-filed under
          // "naturalness". PART-1 relocates them to the surfaced, governor-gated stats.governorShape
          // block below (see allResults.push) so they actually reach results[].stats.
          honestSameLapFraction:   (() => {
            const tot = raceResults.reduce((s, r) => s + (r.honestSameLapFrames ?? 0) + (r.honestCrossLapFrames ?? 0), 0);
            return tot > 0 ? raceResults.reduce((s, r) => s + (r.honestSameLapFrames ?? 0), 0) / tot : null;
          })(),
          honestCrossLapFraction:  (() => {
            const tot = raceResults.reduce((s, r) => s + (r.honestSameLapFrames ?? 0) + (r.honestCrossLapFrames ?? 0), 0);
            return tot > 0 ? raceResults.reduce((s, r) => s + (r.honestCrossLapFrames ?? 0), 0) / tot : null;
          })(),
          overlapResolutionFrames: raceResults.reduce((s, r) => s + (r.liteOverlapResolutionFrames ?? 0), 0) / raceResults.length,
          zigzagScore:             raceResults.reduce((s, r) => s + (r.liteZigzagScore ?? 0), 0) / raceResults.length,
          lateralSpeedScore:       raceResults.reduce((s, r) => s + (r.liteLatSpeedScore ?? 0), 0) / raceResults.length,
          brakeRate:               raceResults.reduce((s, r) => s + (r.liteBrakeRate ?? 0), 0) / raceResults.length,
          stableOvertakes:         raceResults.reduce((s, r) => s + (r.liteStableOvertakes ?? 0), 0) / raceResults.length,
          outcomeReached:          raceResults.reduce((s, r) => s + (r.outcomeReached ? 1 : 0), 0) / raceResults.length,
          // Sum (not average): total pass-through events over all races in this combo.
          brakeMatchFailureCount:  raceResults.reduce((s, r) => s + (r.brakeMatchFailureCount ?? 0), 0),
          brakeMatchLeaderBraked:  raceResults.reduce((s, r) => s + (r.brakeMatchLeaderBraked ?? 0), 0),
          // Step 1: fair-chance placement (fraction of B1-assigned racers hitting exact rank / top-5)
          fairChanceExactRate:     raceResults.length > 0
            ? raceResults.reduce((s, r) => s + (r.fairChanceB1Count > 0 ? r.fairChanceExactHits / r.fairChanceB1Count : 0), 0) / raceResults.length
            : null,
          fairChanceTop5Rate:      raceResults.length > 0
            ? raceResults.reduce((s, r) => s + (r.fairChanceB1Count > 0 ? r.fairChanceTop5Hits  / r.fairChanceB1Count : 0), 0) / raceResults.length
            : null,
          fairChanceB1Count:       raceResults.reduce((s, r) => s + (r.fairChanceB1Count ?? 0), 0) / raceResults.length,
          // Gap B: per-row fair-chance aggregated across all races (sorted by rowIndex)
          fairChanceByRow: (() => {
            const rowSet = new Set(raceResults.flatMap((r) => r.fairChanceByRow ? [...r.fairChanceByRow.keys()] : []));
            return [...rowSet].sort((a, b) => a - b).map((row) => {
              let b1Count = 0, exactHits = 0, top5Hits = 0;
              for (const r of raceResults) {
                const rd = r.fairChanceByRow?.get(row);
                if (!rd) continue;
                b1Count  += rd.b1Count;
                exactHits += rd.exactHits;
                top5Hits  += rd.top5Hits;
              }
              return {
                row,
                b1Count,
                exactHits,
                top5Hits,
                exactRate: b1Count > 0 ? exactHits / b1Count : null,
                top5Rate:  b1Count > 0 ? top5Hits  / b1Count : null,
              };
            });
          })(),
        } : null;

        // ── Front-action aggregation (per combo; --front-action) ────────────────
        // Aggregates the per-race front-action metric + a pooled unpredictability correlation
        // (|Spearman| between each racer's targetRank and its early front-running time). LOW
        // correlation = the early leader is not secretly the assigned winner. null when off.
        let frontActionCombo = null;
        if (FRONT_ACTION) {
          const fas  = raceResults.map((r) => r.frontAction).filter(Boolean);
          const nF   = fas.length;
          const mean = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
          // Pool (targetRank, front-time) pairs across every racer in every race of the combo.
          const tr = [], p1f = [], t3f = [];
          for (const fa of fas) {
            for (const pr of fa.perRacer) {
              if (pr.targetRank == null) continue;
              tr.push(pr.targetRank); p1f.push(pr.p1Frac); t3f.push(pr.top3Frac);
            }
          }
          // spearman() is tie-safe (returns 0 when a side has no variance) → no NaN. Need ≥4
          // pairs for a meaningful rank correlation, else report 0 (undetermined).
          const corrP1   = tr.length >= 4 ? Math.abs(spearman(tr, p1f)) : 0;
          const corrTop3 = tr.length >= 4 ? Math.abs(spearman(tr, t3f)) : 0;
          frontActionCombo = {
            trackId, trackName, isOpen, racerType, durationSec, nRaces: nF,
            leadChangesMean:   +mean(fas.map((d) => d.leadChanges)).toFixed(3),
            distinctP1Mean:    +mean(fas.map((d) => d.distinctP1)).toFixed(3),
            leadChangeRate:    +mean(fas.map((d) => d.leadChangeRate)).toFixed(5),
            podiumShuffleRate: +mean(fas.map((d) => d.podiumShuffleRate)).toFixed(5),
            gap2ndLenMean:     +mean(fas.map((d) => d.gap2ndLenMean)).toFixed(3),  // leader→2nd
            gapMedLenMean:     +mean(fas.map((d) => d.gapMedLenMean)).toFixed(3),  // leader→median
            unpredictability: {
              rankVsP1Frac:   +corrP1.toFixed(3),
              rankVsTop3Frac: +corrTop3.toFixed(3),
              nPairs:         tr.length,
            },
          };
          frontActionAgg.push(frontActionCombo);
        }

        // ── STRIP-DOWN raw dump (per combo; --strip-metrics) ────────────────────
        // Raw per-race stripMetrics + combo meta. All aggregation (band-reach, start-row fairness,
        // dual-window action means, worst-case winner, bonus↔leader correlation) is done downstream
        // from this dump so the fairness definitions stay explicit and inspectable.
        if (STRIP_METRICS) {
          stripAgg.push({
            trackId, trackName, isOpen, racerType, durationSec, nRacers: nRacersForCombo,
            races: raceResults.map((r) => r.stripMetrics).filter(Boolean),
          });
        }

        if (ACTION_METRICS) {
          actionAgg.push({
            trackId, trackName, isOpen, racerType, durationSec, nRacers: nRacersForCombo,
            pulkBiasGain: RP_PULK_BIAS_GAIN, directorEnabled: DYNAMICS_OVERRIDES.governorDirectorEnabled,
            reRollVariationPercent: DYNAMICS_OVERRIDES.reRollVariationPercent,
            races: raceResults.map((r) => r.actionMetrics).filter(Boolean),
          });
        }

        allResults.push({ trackId, trackName, racerType, durationSec, finishT, isOpen, stats, avgMixingQuota, avgNaturalness, frontAction: frontActionCombo, nRacers: nRacersForCombo });

        // ── Breakaway causal diagnostic aggregation (per combo) ─────────────────
        if (BREAKAWAY_DIAG) {
          const diags = raceResults.map((r) => r.breakawayDiag).filter(Boolean);
          const nD    = diags.length;
          const mean  = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
          const median = (arr) => {
            if (!arr.length) return 0;
            const s = [...arr].sort((a, b) => a - b);
            const m = Math.floor(s.length / 2);
            return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
          };
          const peaks   = diags.map((d) => d.peakPreOutcomeGap);
          const ranks   = diags.map((d) => d.peakLeaderTargetRank).filter((v) => v != null);
          const rankHist = {};                       // targetRank → count of races where that rank led the peak
          for (const rk of ranks) rankHist[rk] = (rankHist[rk] ?? 0) + 1;
          const breakawayN = diags.filter((d) => d.isBreakaway).length;
          const decomps    = diags.map((d) => d.peakDecomposition).filter(Boolean);
          // Mean gap curve over the 5% progress bins (averaged across races that reached each bin).
          const binMap = new Map();                  // bin → { gapMedianSum, gap2ndSum, n }
          for (const d of diags) {
            for (const b of d.gapBins) {
              const e = binMap.get(b.bin) ?? { gapMedianSum: 0, gap2ndSum: 0, n: 0 };
              e.gapMedianSum += b.gapMedian; e.gap2ndSum += b.gap2nd; e.n++;
              binMap.set(b.bin, e);
            }
          }
          const gapCurve = [...binMap.entries()].sort((a, b) => a[0] - b[0]).map(([bin, e]) => ({
            bin,
            gapMedianMean: +(e.gapMedianSum / e.n).toFixed(5),
            gap2ndMean:    +(e.gap2ndSum / e.n).toFixed(5),
            nRaces:        e.n,
          }));
          breakawayAgg.push({
            trackId, trackName, isOpen, racerType, durationSec, nRaces: nD,
            breakawayRate:      nD ? +(breakawayN / nD).toFixed(3) : 0,
            peakGapMean:        +mean(peaks).toFixed(5),
            peakGapMedian:      +median(peaks).toFixed(5),
            peakLeaderRankDist: rankHist,
            rank1Share:         ranks.length ? +(( rankHist[1] ?? 0) / ranks.length).toFixed(3) : 0,
            rankGe4Share:       ranks.length ? +(ranks.filter((r) => r >= 4).length / ranks.length).toFixed(3) : 0,
            meanDecompositionAtPeak: {
              spreadFactor:   +mean(decomps.map((d) => d.spreadFactor)).toFixed(4),
              speedBonusMult: +mean(decomps.map((d) => d.speedBonusMult)).toFixed(4),
              areaBonusMult:  +mean(decomps.map((d) => d.areaBonusMult)).toFixed(4),
            },
            gapCurve,
            // Context only (nothing ships): band-reach exact/top-5 for B1 target racers.
            bandReachContext: {
              fairChanceExactRate: avgNaturalness?.fairChanceExactRate ?? null,
              fairChanceTop5Rate:  avgNaturalness?.fairChanceTop5Rate ?? null,
              chiSqP:              stats?.pValue ?? null,
            },
          });
        }

        // Phase-3B: COMEBACK analysis report (printed per combo when flag active)
        if (COMEBACK_ANALYSIS && raceResults.some((r) => r.comebackDiag)) {
          printComebackReport(raceResults, { trackName, racerType, durationSec, minPositions: CB_MIN_POSITIONS, windowSec: CB_WINDOW_SEC, endgameThresh: CB_ENDGAME_THRESH });
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        console.log(`χ²=${stats.chiSq.toFixed(1)} p=${stats.pValue.toFixed(3)} [${elapsed}s]`);

        // 1.5× gate: each row win-rate within [expectedWinRate/1.5, expectedWinRate×1.5]
        // Rows with expectedWins < 3 are excluded (too small for meaningful gate check at N=50)
        if (isOpen) {
          const gateRows = stats.rowStats.filter((rs) => rs.expectedWinRate * stats.nRaces >= 3);
          const gatePass = gateRows.every(
            (rs) => rs.winRate >= rs.expectedWinRate / 1.5 && rs.winRate <= rs.expectedWinRate * 1.5
          );
          const rateStr = stats.rowStats
            .map((rs) => {
              const expectedWins = rs.expectedWinRate * stats.nRaces;
              const tag = expectedWins < 3 ? '(skip)' : (rs.winRate >= rs.expectedWinRate / 1.5 && rs.winRate <= rs.expectedWinRate * 1.5 ? '✓' : '✗');
              return `R${rs.rowIndex}=${(rs.winRate * 100).toFixed(0)}%(e${(rs.expectedWinRate * 100).toFixed(0)}%)${tag}`;
            })
            .join(' ');
          console.log(`     1.5×-Gate: ${gatePass ? '✅ PASS' : '❌ FAIL'}  (${rateStr})`);
        }

        // Lite stats: avoidance activity and lateral dynamics
        if (isOpen && raceResults.length > 0) {
          const avgRow1Brake    = raceResults.reduce((s, r) => s + (r.liteRow1BrakeFrames ?? 0), 0) / raceResults.length;
          const avgRow0Brake    = raceResults.reduce((s, r) => s + (r.liteRow0BrakeFrames ?? 0), 0) / raceResults.length;
          const avgRow2Brake    = raceResults.reduce((s, r) => s + (r.liteRow2BrakeFrames ?? 0), 0) / raceResults.length;
          const avgLateralMoves = raceResults.reduce((s, r) => s + (r.liteLateralMoves ?? 0), 0) / raceResults.length;
          const avgRow1EverAhead = raceResults.reduce((s, r) => s + (r.liteRow1EverAheadCount ?? 0), 0) / raceResults.length;
          const rowSize0 = Math.ceil(N_RACERS / totalRows);
          const avgRerolls  = raceResults.reduce((s, r) => s + (r.avgRerollsPerRacer ?? 0), 0) / raceResults.length;
          const avgPhysDur  = raceResults.reduce((s, r) => s + (r.physicalDurationS ?? 0), 0) / raceResults.length;
          console.log(
            `     Avoidance: R0=${avgRow0Brake.toFixed(0)}Ø  R1=${avgRow1Brake.toFixed(0)}Ø  R2=${avgRow2Brake.toFixed(0)}Ø` +
            `  Lateral=${avgLateralMoves.toFixed(0)}Ø  R1≥1×vorne=${avgRow1EverAhead.toFixed(1)}/${rowSize0}Ø`
          );
          console.log(
            `     Re-Rolls: Ø ${avgRerolls.toFixed(1)} pro Racer  Physische Renndauer: Ø ${avgPhysDur.toFixed(1)}s` +
            `  (target=${durationSec}s)`
          );
          // Phase-3A: Naturalness metrics summary
          if (avgNaturalness) {
            console.log(
              `     Naturalness: jerk=${avgNaturalness.meanJerk.toFixed(4)}Ø  max=${avgNaturalness.maxJerkSpike.toFixed(4)}` +
              `  highFrac=${(avgNaturalness.jerkFraction_high * 100).toFixed(1)}%` +
              `  natOvt=${(avgNaturalness.naturalOvertakeFraction * 100).toFixed(1)}%` +
              `  pulk=${(avgNaturalness.pulkTimeFraction * 100).toFixed(1)}%` +
              `  pulkTrig=[${avgNaturalness.pulkTriggersInWindow.toFixed(1)}in/${avgNaturalness.pulkTriggersOutOfWindow.toFixed(1)}out]`
            );
            if (RACE_PLAN_ACTIVE) {
              console.log(
                `     M2v2: corridor=${(avgNaturalness.racersInCorridorFraction * 100).toFixed(1)}%` +
                `  viol=Ø${avgNaturalness.corridorViolationMean.toFixed(1)}/max${avgNaturalness.corridorViolationMax.toFixed(0)}` +
                `  boost=${(avgNaturalness.bidirectionalBoostFraction * 100).toFixed(1)}%` +
                `  brake=${(avgNaturalness.bidirectionalBrakeFraction * 100).toFixed(1)}%` +
                `  blocked=${(avgNaturalness.racersBlockedInOutcome * 100).toFixed(1)}%` +
                `  wBlocked=${(avgNaturalness.winnerBlockedFractionInOutcome * 100).toFixed(1)}%` +
                `  Δ5sMax=${(avgNaturalness.tmDelta5sMax ?? 0).toFixed(3)}` +
                `  oscN=${(avgNaturalness.tmOscillatingCount ?? 0).toFixed(1)}Ø`
              );
              const fcExact = avgNaturalness.fairChanceExactRate;
              const fcTop5  = avgNaturalness.fairChanceTop5Rate;
              if (fcExact != null) {
                console.log(
                  `     FairChance: B1exact=${(fcExact * 100).toFixed(1)}%` +
                  `  B1top5=${(fcTop5 * 100).toFixed(1)}%` +
                  `  (gap: top5-exact=${((fcTop5 - fcExact) * 100).toFixed(1)}%)`
                );
              }
            }
            // LateralQ — printed for open tracks in this block (closed tracks: printed in block below)
            console.log(
              `     LateralQ: overlap=${((avgNaturalness.overlapRate ?? 0) * 100).toFixed(1)}%` +
              `  honest=${((avgNaturalness.honestOverlapRate ?? 0) * 100).toFixed(1)}%` +
              `  resolution=Ø${(avgNaturalness.overlapResolutionFrames ?? 0).toFixed(1)}fr` +
              `  zigzag=${(avgNaturalness.zigzagScore ?? 0).toFixed(6)}` +
              `  latSpd=${(avgNaturalness.lateralSpeedScore ?? 0).toFixed(6)}` +
              `  brake=${((avgNaturalness.brakeRate ?? 0) * 100).toFixed(1)}%` +
              `  bmFail=${avgNaturalness.brakeMatchFailureCount ?? 0}(leaderBraked=${avgNaturalness.brakeMatchLeaderBraked ?? 0})` +
              `  stableOvt=${(avgNaturalness.stableOvertakes ?? 0).toFixed(3)}` +
              `  outcomeReached=${((avgNaturalness.outcomeReached ?? 1) * 100).toFixed(0)}%`
            );
          }
          // per_racer: per-row bonus distribution at race end (all rows > 0)
          if (V4_ACTIVE && V4_METRIC_TYPE === 'per_racer') {
            const allRowIndices = [...new Set(
              raceResults.flatMap((r) => (r.v4PerRacerEndStats ?? []).map((s) => s.row))
            )].sort((a, b) => a - b);
            for (const rowIdx of allRowIndices) {
              const rowThresholds = rowIdx === 1 ? V4_ROW1_THRESHOLDS : V4_ROW2_THRESHOLDS;
              const all = raceResults.flatMap((r) => (r.v4PerRacerEndStats ?? []).filter((s) => s.row === rowIdx));
              if (all.length === 0) continue;
              const full    = all.filter((s) => s.threshIdx === 0).length;
              const partial = all.filter((s) => s.threshIdx > 0 && s.threshIdx < rowThresholds.length).length;
              const none    = all.filter((s) => s.threshIdx >= rowThresholds.length).length;
              const tot     = all.length;
              console.log(
                `     Row-${rowIdx} Bonus-End (N=${tot}): ` +
                `voll=${(full/tot*100).toFixed(0)}% (${full})  ` +
                `teilw=${(partial/tot*100).toFixed(0)}% (${partial})  ` +
                `kein=${(none/tot*100).toFixed(0)}% (${none})`
              );
            }
          }
        }

        // Gap A + Gap B + lapping: for CLOSED tracks, emit LateralQ and FairChance here
        // (open tracks already printed these inside the isOpen block above)
        if (!isOpen && avgNaturalness) {
          const sameLapPct  = avgNaturalness.honestSameLapFraction  != null ? (avgNaturalness.honestSameLapFraction  * 100).toFixed(1) + '%' : '—';
          const crossLapPct = avgNaturalness.honestCrossLapFraction != null ? (avgNaturalness.honestCrossLapFraction * 100).toFixed(1) + '%' : '—';
          const maxSpreadLaps = avgNaturalness.maxRealSpreadMax?.toFixed(3) ?? '—';
          console.log(
            `     LateralQ: honest=${((avgNaturalness.honestOverlapRate ?? 0) * 100).toFixed(1)}%` +
            `  overlap=${((avgNaturalness.overlapRate ?? 0) * 100).toFixed(1)}%` +
            `  maxSpread=${maxSpreadLaps}laps  sameLap=${sameLapPct}  crossLap=${crossLapPct}`
          );
          if (RACE_PLAN_ACTIVE) {
            const fcExact = avgNaturalness.fairChanceExactRate;
            const fcTop5  = avgNaturalness.fairChanceTop5Rate;
            if (fcExact != null) {
              console.log(
                `     FairChance: B1exact=${(fcExact * 100).toFixed(1)}%` +
                `  B1top5=${(fcTop5 * 100).toFixed(1)}%` +
                `  (gap: top5-exact=${((fcTop5 - fcExact) * 100).toFixed(1)}%)`
              );
            }
          }
        }
        // FairChance per-row breakdown (all tracks, when race-plan active)
        if (RACE_PLAN_ACTIVE && avgNaturalness?.fairChanceByRow?.length > 0) {
          const rowParts = avgNaturalness.fairChanceByRow.map((rd) =>
            `R${rd.row}:` +
            `exact=${rd.exactRate != null ? (rd.exactRate * 100).toFixed(0) + '%' : '—'}` +
            `/top5=${rd.top5Rate != null ? (rd.top5Rate * 100).toFixed(0) + '%' : '—'}` +
            `(n=${rd.b1Count})`
          );
          console.log(`     FairChance by row: ${rowParts.join('  ')}`);
        }

        // v4 diagnostics: per-threshold average crossing time + physical overtake counts
        if (V4_ACTIVE && isOpen && V4_METRIC_TYPE !== 'per_racer' && v4ThreshLogs.length > 0) {
          // Physical overtake summary
          const avgOvertakes   = raceResults.reduce((s, r) => s + (r.v4OvertakeCount   ?? 0), 0) / N_RACES;
          const avgNearBehind  = raceResults.reduce((s, r) => s + (r.v4NearBehindCount ?? 0), 0) / N_RACES;
          const avgPairOvt     = raceResults.reduce((s, r) => s + (r.v4PairOvertakes   ?? 0), 0) / N_RACES;
          console.log(
            `     v4 Physik (Ø pro Rennen): ${avgOvertakes.toFixed(1)} Row-1 mit Überholung, ` +
            `${avgPairOvt.toFixed(1)} Paar-Überholungen, ${avgNearBehind.toFixed(1)} near-behind-Paare`
          );
          // Threshold timing
          for (const thresh of V4_THRESHOLDS) {
            const times = v4ThreshLogs
              .map((log) => log.find((e) => e.threshold === thresh)?.timeS)
              .filter((t) => t != null);
            if (times.length > 0) {
              const avg = times.reduce((s, v) => s + v, 0) / times.length;
              const entry = v4ThreshLogs.find((log) => log.find((e) => e.threshold === thresh))
                ?.find((e) => e.threshold === thresh);
              console.log(
                `     v4 ${thresh}%-Schwelle: Ø ${avg.toFixed(1)}s ` +
                `(${times.length}/${N_RACES} Rennen) ` +
                `${entry ? entry.fromBonus + ' → ' + entry.toBonus : ''}`
              );
            } else {
              console.log(`     v4 ${thresh}%-Schwelle: nie erreicht`);
            }
          }
        }
        // per_racer: individual threshold timing per row (all rows > 0)
        if (V4_ACTIVE && isOpen && V4_METRIC_TYPE === 'per_racer') {
          const allRowIdxs = [...new Set(
            raceResults.flatMap((r) => (r.v4PerRacerEndStats ?? []).map((s) => s.row))
          )].sort((a, b) => a - b);
          for (const rowIdx of allRowIdxs) {
            const rowThresholds = rowIdx === 1 ? V4_ROW1_THRESHOLDS : V4_ROW2_THRESHOLDS;
            for (let ti = 0; ti < rowThresholds.length; ti++) {
              const thresh   = rowThresholds[ti];
              const allStats = raceResults.flatMap((r) => (r.v4PerRacerEndStats ?? []).filter((s) => s.row === rowIdx));
              const total    = allStats.length;
              const times    = allStats
                .filter((s) => s.threshTimes && s.threshTimes.length > ti)
                .map((s) => s.threshTimes[ti] / 1000);
              if (times.length > 0) {
                const avg = times.reduce((s, v) => s + v, 0) / times.length;
                const min = Math.min(...times);
                const max = Math.max(...times);
                console.log(
                  `     v4 per_racer Row-${rowIdx} ${thresh}%: Ø ${avg.toFixed(1)}s ` +
                  `(${times.length}/${total} Racer) min=${min.toFixed(1)}s max=${max.toFixed(1)}s`
                );
              } else {
                console.log(`     v4 per_racer Row-${rowIdx} ${thresh}%: nie erreicht`);
              }
            }
          }
        }
      }
    }
    console.log('');
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nSimulation abgeschlossen in ${totalElapsed}s`);

  // ── Zone Success Rate summary (Race Plan mode only) ───────────────────────
  const zoneRows = rawData.filter((r) => r.sollBereich != null);
  if (RACE_PLAN_ACTIVE && zoneRows.length > 0) {
    function zoneIdxOf(rank) {
      for (let i = 0; i < BAND_EDGES.length; i++) {
        if (rank <= BAND_EDGES[i]) return i;
      }
      return BAND_EDGES.length;
    }
    const ZNAMES = ['B1 (1–5)', 'B2 (6–15)', 'B3 (16–25)', 'B4 (26–40)', 'B5 (41+)'];

    console.log('\n=== Zone Success Rate (Race Plan) ===');
    console.log('| Zone      | Open Hits | Open Tot | Open %  | Closed Hits | Closed Tot | Closed % | All %   |');
    console.log('|-----------|-----------|----------|---------|-------------|------------|----------|---------|');

    for (let zi = 0; zi < 5; zi++) {
      const b = zi + 1;
      const grp    = zoneRows.filter((r) => r.sollBereich === b);
      const openG  = grp.filter((r) =>  r.isOpen);
      const closG  = grp.filter((r) => !r.isOpen);
      const oHits  = openG.filter((r) => zoneIdxOf(r.finalRank) === zi).length;
      const cHits  = closG.filter((r) => zoneIdxOf(r.finalRank) === zi).length;
      const allHit = oHits + cHits;
      const oPct   = openG.length ? (oHits  / openG.length  * 100).toFixed(1) + '%' : '—';
      const cPct   = closG.length ? (cHits  / closG.length  * 100).toFixed(1) + '%' : '—';
      const allPct = grp.length   ? (allHit / grp.length    * 100).toFixed(1) + '%' : '—';
      console.log(`| ${ZNAMES[zi].padEnd(9)} | ${String(oHits).padStart(9)} | ${String(openG.length).padStart(8)} | ${oPct.padStart(7)} | ${String(cHits).padStart(11)} | ${String(closG.length).padStart(10)} | ${cPct.padStart(8)} | ${allPct.padStart(7)} |`);
    }

    // Overall row
    const allHits2  = zoneRows.filter((r) => zoneIdxOf(r.finalRank) === (r.sollBereich - 1)).length;
    const overallPct = (allHits2 / zoneRows.length * 100).toFixed(1) + '%';
    console.log(`| ${'OVERALL'.padEnd(9)} | ${' '.repeat(9)} | ${' '.repeat(8)} | ${' '.repeat(7)} | ${' '.repeat(11)} | ${' '.repeat(10)} | ${' '.repeat(8)} | ${overallPct.padStart(7)} |`);

    // Per-track breakdown
    const trackIds = [...new Set(zoneRows.map((r) => r.trackId))];
    console.log('\n--- Per-Track Zone Success ---');
    for (const tid of trackIds) {
      const tRows = zoneRows.filter((r) => r.trackId === tid);
      const tName = tRows[0].trackName;
      const tOpen = tRows[0].isOpen;
      const parts = [];
      for (let zi = 0; zi < 5; zi++) {
        const grp  = tRows.filter((r) => r.sollBereich === zi + 1);
        if (grp.length === 0) { parts.push('—'); continue; }
        const hits = grp.filter((r) => zoneIdxOf(r.finalRank) === zi).length;
        parts.push((hits / grp.length * 100).toFixed(0) + '%');
      }
      console.log(`  ${tName.padEnd(16)} (${tOpen ? 'open  ' : 'closed'})  B1=${parts[0]}  B2=${parts[1]}  B3=${parts[2]}  B4=${parts[3]}  B5=${parts[4]}`);
    }
    console.log('');
  }

  // Write JSON
  const jsonPath = join(OUT_DIR, 'fairness-data.json');
  writeFileSync(jsonPath, JSON.stringify({ meta: { nRaces: N_RACES, nRacers: N_RACERS, durationVariants: DURATION_VARIANTS, ...(ACTION !== null ? { action: ACTION, directorKnobs: { ...ACTION_KNOBS, governorDirectorSettling: DYNAMICS_OVERRIDES.governorDirectorSettling } } : {}) }, results: allResults, rawData }, null, 2));
  console.log(`JSON → ${jsonPath}`);

  // Write Markdown report
  const runDate = new Date().toISOString().slice(0, 10);
  const report  = buildReport(allResults, rawData, runDate);
  const mdPath  = join(OUT_DIR, 'fairness-report.md');
  writeFileSync(mdPath, report);
  console.log(`Bericht → ${mdPath}`);

  // ── Breakaway causal diagnostic output (--breakaway-diag) ───────────────────
  // Self-contained: only runs when the flag is on. Raw aggregates → results/breakaway-diag/
  // (a dir outside OUT_DIR, not committed). One file per arm, named by --diagLabel.
  if (BREAKAWAY_DIAG) {
    const bkDir = join(ROOT, 'results', 'breakaway-diag');
    mkdirSync(bkDir, { recursive: true });
    const bkPath = join(bkDir, `breakaway-${DIAG_LABEL}.json`);
    writeFileSync(bkPath, JSON.stringify({
      meta: {
        label: DIAG_LABEL, nRaces: N_RACES, seed: GLOBAL_SEED, corridorStart: BREAKAWAY_CORRIDOR_START,
        arms: {
          bonusMult: BONUS_MULT, reRollVariationPercent: DYNAMICS_OVERRIDES.reRollVariationPercent,
        },
      },
      combos: breakawayAgg,
    }, null, 2));
    console.log(`\n=== Breakaway-Diag (${DIAG_LABEL}) ===  → ${bkPath}`);
    for (const c of breakawayAgg) {
      console.log(
        `  ${c.trackName.padEnd(16)} (${c.isOpen ? 'open  ' : 'closed'})  ` +
        `breakawayRate=${(c.breakawayRate * 100).toFixed(0)}%  peakGapØ=${c.peakGapMean.toFixed(4)}  ` +
        `rank1=${(c.rank1Share * 100).toFixed(0)}%  rank≥4=${(c.rankGe4Share * 100).toFixed(0)}%  ` +
        `decomp[spread=${c.meanDecompositionAtPeak.spreadFactor} area=${c.meanDecompositionAtPeak.areaBonusMult}]`
      );
    }
  }

  // ── Front-action metric output (--front-action) ─────────────────────────────
  // Self-contained: only runs when the flag is on. Raw aggregates → results/front-action/
  // (a dir outside OUT_DIR, not committed). One file per arm, named by --diagLabel.
  if (FRONT_ACTION) {
    const faDir = join(ROOT, 'results', 'front-action');
    mkdirSync(faDir, { recursive: true });
    const faPath = join(faDir, `front-action-${DIAG_LABEL}.json`);
    writeFileSync(faPath, JSON.stringify({
      meta: {
        label: DIAG_LABEL, nRaces: N_RACES, seed: GLOBAL_SEED, corridorStart: BREAKAWAY_CORRIDOR_START,
        governorOn: GOVERNOR_ON,
        arms: {
          governorDirectorEnabled: DYNAMICS_OVERRIDES.governorDirectorEnabled,
        },
      },
      combos: frontActionAgg,
    }, null, 2));
    console.log(`\n=== Front-Action (${DIAG_LABEL}) ===  → ${faPath}`);
    console.log('  (leadΔ = P1 changes/race; distinctP1 = # racers who ever led; shuffle = top-3 churn/step;');
    console.log('   gap2nd/gapMed = leader→2nd / leader→median in racer-lengths; corr = |Spearman(targetRank, front-time)|, LOW=fair)');
    for (const c of frontActionAgg) {
      console.log(
        `  ${c.trackName.padEnd(16)} (${c.isOpen ? 'open  ' : 'closed'})  ` +
        `leadΔ=${c.leadChangesMean.toFixed(1)}  distinctP1=${c.distinctP1Mean.toFixed(1)}  ` +
        `shuffle=${(c.podiumShuffleRate * 100).toFixed(1)}%  ` +
        `gap2nd=${c.gap2ndLenMean.toFixed(1)}  gapMed=${c.gapMedLenMean.toFixed(1)}  ` +
        `corr[P1=${c.unpredictability.rankVsP1Frac.toFixed(2)} top3=${c.unpredictability.rankVsTop3Frac.toFixed(2)}]`
      );
    }
  }

  // ── STRIP-DOWN raw output (--strip-metrics) ─────────────────────────────────
  // Self-contained: only when the flag is on. Raw per-combo dumps → results/strip-down/ (not
  // committed). One file per arm, named by --diagLabel. Analysis is done downstream from these.
  if (STRIP_METRICS) {
    const sdDir = join(ROOT, 'results', 'strip-down');
    mkdirSync(sdDir, { recursive: true });
    const sdPath = join(sdDir, `strip-${DIAG_LABEL}.json`);
    writeFileSync(sdPath, JSON.stringify({
      meta: {
        label: DIAG_LABEL, nRaces: N_RACES, seed: GLOBAL_SEED,
        pulkStart: SD_PULK_START, pulkEnd: SD_PULK_END, corridorStart: SD_CORR_START,
        rerollVariant: REROLL_VARIANT,
        reRoll: {
          variationPercent: DYNAMICS_OVERRIDES.reRollVariationPercent,
          transitionDuration: DYNAMICS_OVERRIDES.reRollTransitionDuration,
          intervalDivisor: DYNAMICS_OVERRIDES.reRollIntervalDivisor,
          lastPositionPercent: DYNAMICS_OVERRIDES.reRollLastPositionPercent,
        },
        areaSplit: { active: AREA_SPLIT_ACTIVE, pulk: AREA_BONUS_PULK, post: AREA_BONUS_POST, refStrength: AREA_REF_STRENGTH },
        rowSplit:  { active: ROW_SPLIT_ACTIVE, early: ROW_BONUS_EARLY, pulk: ROW_BONUS_PULK, post: ROW_BONUS_POST },
        governorDirectorEnabled: DYNAMICS_OVERRIDES.governorDirectorEnabled,
      },
      combos: stripAgg,
    }, null, 2));
    console.log(`\n=== Strip-Down (${DIAG_LABEL}) ===  → ${sdPath}`);
    for (const c of stripAgg) {
      const nR = c.races.length;
      const mean = (f) => (nR ? c.races.reduce((s, r) => s + f(r), 0) / nR : 0);
      console.log(
        `  ${c.trackName.padEnd(16)} (${c.isOpen ? 'open  ' : 'closed'})  ` +
        `PULK[leadΔ=${mean((r) => r.pulk.leadChanges).toFixed(1)} distinctP1=${mean((r) => r.pulk.distinctP1).toFixed(1)} lShare=${(mean((r) => r.pulk.leaderShare) * 100).toFixed(0)}%]  ` +
        `OUT[leadΔ=${mean((r) => r.outcome.leadChanges).toFixed(1)} distinctP1=${mean((r) => r.outcome.distinctP1).toFixed(1)}]  ` +
        `winRankAt055=${mean((r) => r.winner.rankAt055 ?? 0).toFixed(1)}`
      );
    }
  }

  // ── ACTION-METRICS raw output (--action-metrics) → results/action-metrics/ (gitignored) ──
  if (ACTION_METRICS) {
    const amDir = join(ROOT, 'results', 'action-metrics');
    mkdirSync(amDir, { recursive: true });
    const amPath = join(amDir, `am-${DIAG_LABEL}.json`);
    writeFileSync(amPath, JSON.stringify({
      meta: {
        label: DIAG_LABEL, nRaces: N_RACES, seed: GLOBAL_SEED,
        pulkBiasGain: RP_PULK_BIAS_GAIN,
        governorDirectorEnabled: DYNAMICS_OVERRIDES.governorDirectorEnabled,
        reRollVariationPercent: DYNAMICS_OVERRIDES.reRollVariationPercent,
        areaSplit: { active: AREA_SPLIT_ACTIVE, early: AREA_BONUS_EARLY, pulk: AREA_BONUS_PULK, post: AREA_BONUS_POST },
        rowSplit:  { active: ROW_SPLIT_ACTIVE, early: ROW_BONUS_EARLY, pulk: ROW_BONUS_PULK, post: ROW_BONUS_POST },
      },
      combos: actionAgg,
    }, null, 2));
    console.log(`\n=== Action-Metrics (${DIAG_LABEL}, pulkBiasGain=${RP_PULK_BIAS_GAIN}) ===  → ${amPath}`);
    for (const c of actionAgg) {
      const nR = c.races.length;
      const mean = (f) => (nR ? c.races.reduce((s, r) => s + f(r), 0) / nR : 0);
      console.log(
        `  ${c.trackName.padEnd(16)} (${c.isOpen ? 'open  ' : 'closed'})  ` +
        `churn=${mean((r) => r.rankChurn).toFixed(0)} travelØ=${mean((r) => r.meanRankTravel).toFixed(1)} travelP90=${mean((r) => r.p90RankTravel).toFixed(1)}  ` +
        `risers=${mean((r) => r.risers).toFixed(1)} fallers=${mean((r) => r.fallers).toFixed(1)} top5turn=${mean((r) => r.frontTop5Turnover).toFixed(1)}  ` +
        `spread=${mean((r) => r.spreadLenP10P90).toFixed(1)}len maxSF=${mean((r) => r.maxSpeedFactor).toFixed(3)}`
      );
    }
  }

  // Print quick summary
  const unfair = allResults.filter((r) => r.stats.pValue < 0.05);
  console.log(`\n=== Zusammenfassung ===`);
  console.log(`Kombinationen gesamt : ${allResults.length}`);
  console.log(`Fair (p≥0.05)        : ${allResults.length - unfair.length}`);
  console.log(`Unfair (p<0.05)      : ${unfair.length}`);
  if (unfair.length > 0) {
    console.log('\nUnfaire Kombinationen:');
    for (const r of unfair) {
      const r0 = r.stats.rowStats[0];
      const exp = r0?.expectedWinRate ?? (1 / r.stats.totalRows);
      console.log(`  ${r.trackName} × ${r.racerType} × ${r.durationSec}s  Row0=${fmtPct(r0?.winRate ?? 0)} (erw. ${fmtPct(exp)})  p=${r.stats.pValue.toFixed(3)}`);
    }
  }
}
