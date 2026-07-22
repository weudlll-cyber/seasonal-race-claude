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
//     --front-action     record the pre-OUTCOME FRONT-ACTION metric: P1 lead changes, distinct P1
//                        holders, top-3 podium shuffle, and a per-racer targetRank-vs-front
//                        unpredictability correlation. Raw → results/front-action/.
//     --diagLabel=<name> names the raw diagnostic output file (both diags share this).
//
//   Action axis (Action-sweep; read-only sweep hypothesis — NOT a shipped default):
//     --action=<0..1>    single "action" scalar (0=calm → 1=wild). STAGE-4: its classic couplings
//                        were removed with the reactive director; the axis is an empty stub until
//                        Stage-5b re-targets it to the rotation strengths. Unset → no-op.
//
//   Contest strengths (read-only sweep knobs; the PulkLeadRotation mechanism reads these):
//     --pulkLeaderBrake=<0..0.15>      brake on the instantaneous leader (P1).
//     --pulkChallengerBoost=<0..0.12>  forward boost cap on featured challengers toward
//                                                  the leader.
//     --bonusMult=<x>   areaBonus (Race-Plan band bonus) strength multiplier — the fairness knob.
//                       2.0 = shipped (+6% B1), 1.0 = half, 0 = off. Swept to trade corrP1 vs band-reach.
//
// Output:
//   <out>/fairness-data.json   — machine-readable raw data
//   <out>/fairness-report.md   — human-readable Markdown report
// ============================================================

import { readFileSync, mkdirSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname, isAbsolute } from 'path';
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
  DEFAULT_BASE_SPEED_CONFIG as _DEFAULT_BASE_SPEED_CONFIG,
  DEFAULT_RACE_BEHAVIOR_CONFIG as _DEFAULT_RACE_BEHAVIOR_CONFIG,
  DEFAULT_RACE_DYNAMICS_CONFIG as _DEFAULT_RACE_DYNAMICS_CONFIG,
  DEFAULT_ROW_LAYOUT_CONFIG as _DEFAULT_ROW_LAYOUT_CONFIG,
} from '../client/src/modules/storage/defaults.js';
// Stage 0: the ONE shared source for the exported-world schema + hash + simulatability. Imported here
// AND by the browser DevScreen export, so a hash produced in the browser matches one recomputed here.
import { WORLD_SCHEMA_VERSION, hashWorld, unsimulatableReasons, worldStamp } from '../client/src/modules/raceConfigWorld.js';
import { perTrackReport, renderMarkdown as renderComebackMarkdown } from './sim/observers/comeback-reality.mjs';
import { computeEffectiveBrakeFactor } from '../client/src/modules/raceBehaviorConfig.js';
import { advanceRacerT, computeRowEnvMult, computeRowEnvSmoothed } from '../client/src/modules/raceStep.js';
import { createRacePlan, createTrajectoryController, BAND_EDGES } from '../client/src/modules/racePlanner.js';
import { computeFairnessStats, computeZoneSuccessRate, bandIntegrityOK, computeExtendedFairnessStats, spearman, chiSqPValue } from './sim/observers/fairness-stats.mjs';
import { buildReport, printDiagnosticReport, printComebackReport, fmtPct } from './sim/observers/report.mjs';
// GAP-SPACE observers (INFRA 5C): read-only, flag-gated. See gap-metrics.mjs header.
import {
  secondsBehindLeader,
  lengthsBehindLeader,
  fieldSpreadP10P90,
  gapsAtLine,
  visibleComeback,
  deadRaceFlag,
  percentile,
  PROPOSED_THRESHOLDS as GM_THRESHOLDS,
} from './sim/observers/gap-metrics.mjs';
import { maxLinkGapLengths, makeHeldOvertakeTracker, fullSpreadLengths, framesOverThresholdShare, GAP_THRESHOLD_LENGTHS, leaderSnapshot, RUNAWAY_LARGE_LENGTHS } from './sim/observers/pulk-contest.mjs';
import { RUNAWAY_PARADE_DEFAULTS, leaderGapLengths, makeFormationTracker, SPEED_SOURCE_SAMPLES, speedProduct, speedSaturation } from './sim/observers/runaway-parade.mjs';
import { makeLateContestTracker, makeReleaseRankTracker } from './sim/observers/release-contest.mjs';
import { makeFrontBattleTracker } from './sim/observers/outcome-front-battle.mjs';
import { makeCarouselTracker } from './sim/observers/carousel-telemetry.mjs';
import { applyPulkLeadRotation, arcT, computeDirectorCeiling } from '../client/src/modules/raceGovernor.js';
import { lenScaleFrom, arcLengths, meanDrawnBodyLen } from '../client/src/modules/raceLengths.js';

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
import { DEFAULT_AUTO_SCALE_CONFIG as _DEFAULT_AUTO_SCALE_CONFIG } from '../client/src/modules/autoSpriteScale.js';

// ── CLI args ──────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
function argVal(key, def) {
  const m = argv.find((a) => a.startsWith(`--${key}=`));
  return m ? m.slice(key.length + 3) : def;
}

// ── Stage 0: --config world import + FAIL-LOUD (never silently assume) ──────────────────────────
// `--config=world.json` makes the sim run the OWNER'S actual exported world instead of assumed defaults.
// Hard rules: (a) a world from an OLD schema (WORLD_SCHEMA_MISMATCH) or one the sim cannot faithfully
// simulate ABORTS — never runs-and-ignores; (b) no --config → a prominent ASSUMED-DEFAULTS banner
// + every result stamped provisional; (c) the sim refuses to STAMP a world it does not fully HONOUR —
// any config field it hasn't wired that differs from default ABORTS, so a stamp never over-claims.
function abortStage0(msg) {
  console.error('\n══════════════════════════════════════════════════════════════════════════════');
  console.error('  STAGE-0 ABORT — the sim will NOT run and quietly produce a misleading number.');
  console.error('══════════════════════════════════════════════════════════════════════════════');
  console.error(msg);
  console.error('══════════════════════════════════════════════════════════════════════════════\n');
  process.exit(2);
}
function loadWorldOrNull() {
  const p = argVal('config', null);
  if (p === null) return null;
  let raw;
  try { raw = JSON.parse(readFileSync(isAbsolute(p) ? p : join(ROOT, p), 'utf8')); }
  catch (e) { abortStage0(`--config could not be read/parsed: ${p}\n  ${e.message}`); }
  if (raw.schemaVersion !== WORLD_SCHEMA_VERSION) {
    abortStage0(`[WORLD_SCHEMA_MISMATCH] --config schemaVersion ${raw.schemaVersion} != this sim's ${WORLD_SCHEMA_VERSION}. ` +
      `The world SHAPE changed (e.g. race-zones removed at v2); an old export cannot be trusted. Re-export from the browser.`);
  }
  const reasons = unsimulatableReasons(raw);
  if (reasons.length) abortStage0('this world CANNOT be simulated:\n' + reasons.map((r) => `  [${r.code}] ${r.message}`).join('\n'));
  // HONOURED configs (merged into the sim's config bases below): raceDynamicsConfig, raceBehaviorConfig,
  // rowLayoutConfig, baseSpeedConfig, autoScaleConfig. NOT yet honoured → abort if present/non-default:
  const unhonoured = [];
  if (raw.racerTypeOverrides && Object.keys(raw.racerTypeOverrides).length) {
    unhonoured.push(`racerTypeOverrides (${Object.keys(raw.racerTypeOverrides).join(',')}): the sim uses the shipped RACER_CONFIGS and does not yet apply per-type overrides.`);
  }
  if (unhonoured.length) {
    abortStage0('this world contains config the sim does NOT yet honour (refusing to stamp a hash it does not honour):\n' +
      unhonoured.map((u) => '  ' + u).join('\n') + '\n  Fix: wire these into the sim, or export a world without them.');
  }
  return raw;
}
const WORLD = loadWorldOrNull();
const mergeCfg = (key, def) => (WORLD?.configs?.[key] ? { ...def, ...WORLD.configs[key] } : def);
// Config bases: the OWNER'S world when --config honoured it, else the shipped defaults. All existing
// reads of these names transparently pick up the world (zero call-site changes).
const DEFAULT_RACE_DYNAMICS_CONFIG = mergeCfg('raceDynamicsConfig', _DEFAULT_RACE_DYNAMICS_CONFIG);
const DEFAULT_RACE_BEHAVIOR_CONFIG = mergeCfg('raceBehaviorConfig', _DEFAULT_RACE_BEHAVIOR_CONFIG);
const DEFAULT_ROW_LAYOUT_CONFIG    = mergeCfg('rowLayoutConfig',    _DEFAULT_ROW_LAYOUT_CONFIG);
const DEFAULT_BASE_SPEED_CONFIG    = mergeCfg('baseSpeedConfig',    _DEFAULT_BASE_SPEED_CONFIG);
const DEFAULT_AUTO_SCALE_CONFIG    = mergeCfg('autoScaleConfig',    _DEFAULT_AUTO_SCALE_CONFIG);
const WORLD_STAMP = worldStamp(WORLD); // { schemaVersion, worldHash: <short>|'ASSUMED-DEFAULTS', provisional }

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
const RP_PULK_START           = Number(argVal('pulkStart',          String(DEFAULT_RACE_DYNAMICS_CONFIG.racePlanPulkStart)));
const RP_CORRIDOR_START       = Number(argVal('corridorStart',      String(DEFAULT_RACE_DYNAMICS_CONFIG.racePlanCorridorStart)));
const RP_CORRIDOR_END         = Number(argVal('corridorEnd',        String(DEFAULT_RACE_DYNAMICS_CONFIG.racePlanCorridorEnd)));
const RP_PULK_BIAS_GAIN       = Number(argVal('pulkBiasGain',       String(DEFAULT_RACE_DYNAMICS_CONFIG.pulkBiasGain)));
// Hero choreography — master flag + drama intensity + loose-pack bandStrictness. Passed into
// createRacePlan (flag OFF → byte-identical; the intensity/strictness only apply when ON).
const CHOREO_ENABLED     = true; // choreography is UNCONDITIONAL (de-flagged S3); classic gates below are now statically false (Stage-4 removal)
// Stage 1 spoiler switch (parity with racePlanner/index.jsx). Default off → the shipped default.
const CHOREO_SUPPRESS_CHAOS_BONUS_B1 = argVal('choreoSuppressChaosBonusB1', String(DEFAULT_RACE_DYNAMICS_CONFIG.choreoSuppressChaosBonusB1)) === 'true';
const CHOREO_INTENSITY   = Number(argVal('choreoIntensity', String(DEFAULT_RACE_DYNAMICS_CONFIG.choreoIntensity)));
const CHOREO_PACK_BAND_STRICTNESS = Number(argVal('choreoPackBandStrictness', String(DEFAULT_RACE_DYNAMICS_CONFIG.choreoPackBandStrictness)));
const CHOREO_RELEASE_PROGRESS = Number(argVal('choreoReleaseProgress', String(DEFAULT_RACE_DYNAMICS_CONFIG.choreoReleaseProgress)));
const CHOREO_RESOLVE_B2 = Number(argVal('choreoResolveB2', String(DEFAULT_RACE_DYNAMICS_CONFIG.choreoResolveB2)));
const CHOREO_RESOLVE_B3 = Number(argVal('choreoResolveB3', String(DEFAULT_RACE_DYNAMICS_CONFIG.choreoResolveB3)));
const CHOREO_RESOLVE_B4 = Number(argVal('choreoResolveB4', String(DEFAULT_RACE_DYNAMICS_CONFIG.choreoResolveB4)));
const CHOREO_RESOLVE_B5 = Number(argVal('choreoResolveB5', String(DEFAULT_RACE_DYNAMICS_CONFIG.choreoResolveB5)));
const CHOREO_OUTCOME_START = Number(argVal('choreoOutcomeStart', String(DEFAULT_RACE_DYNAMICS_CONFIG.choreoOutcomeStart)));
// ── FRONT ACT window + B1 LEAD CAROUSEL (C1; SIM-FIRST — the browser is untouched this step) ──────
// contestWindowStart is the front act's OWN key: the outcome-front-battle observer AND the carousel
// schedule both read it, so the measurement window no longer rides on B2's resolve checkpoint. It
// defaults to the shipped value (= today's choreoResolveB2), so every committed baseline stays
// comparable. Carousel + role-bias default OFF → byte-identical (fingerprint-gated).
const CONTEST_WINDOW_START = Number(argVal('contestWindowStart', String(DEFAULT_RACE_DYNAMICS_CONFIG.contestWindowStart)));
const CAROUSEL_ENABLED     = argVal('carouselEnabled', String(DEFAULT_RACE_DYNAMICS_CONFIG.carouselEnabled)) === 'true';
const CAROUSEL_MIN_PARTICIPANTS = Number(argVal('carouselMinParticipants', String(DEFAULT_RACE_DYNAMICS_CONFIG.carouselMinParticipants)));
const CAROUSEL_AMPLITUDE_RANKS  = Number(argVal('carouselAmplitudeRanks', String(DEFAULT_RACE_DYNAMICS_CONFIG.carouselAmplitudeRanks)));
const CAROUSEL_JITTER_PCT       = Number(argVal('carouselJitterPct', String(DEFAULT_RACE_DYNAMICS_CONFIG.carouselJitterPct)));
const CAROUSEL_ROLE_BIAS_STRENGTH = Number(argVal('carouselRoleBiasStrength', String(DEFAULT_RACE_DYNAMICS_CONFIG.carouselRoleBiasStrength)));
// Pack-only strictness release with spatial hysteresis (parity with racePlanner/defaults). OFF →
// byte-identical to the shipped servo (proven via fingerprint-default). Threaded into createRacePlan.
const PACK_RELEASE_ENABLED = argVal('pack-release', String(DEFAULT_RACE_DYNAMICS_CONFIG.packReleaseEnabled)) === 'true';
const PACK_RESTEER_THRESHOLD = Number(argVal('pack-resteer-threshold', String(DEFAULT_RACE_DYNAMICS_CONFIG.packReSteerThreshold)));
// B2-attacker "Attack & Fall" (parity with racePlanner/heroCurveGenerator/defaults). OFF (heroes 0) →
// byte-identical (proven via fingerprint-default). Threaded into createRacePlan → the hero generator.
const B2_ATTACK_HEROES = Number(argVal('b2-attack-heroes', String(DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackHeroes)));
const B2_ATTACK_PEAK_RANK = Number(argVal('b2-attack-peak-rank', String(DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackPeakRank)));
const B2_ATTACK_FINAL_RANK = Number(argVal('b2-attack-final-rank', String(DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackFinalRank)));
const B2_ATTACK_PROGRESS_START = Number(argVal('b2-attack-progress-start', String(DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackProgress.start)));
const B2_ATTACK_PROGRESS_END = Number(argVal('b2-attack-progress-end', String(DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackProgress.end)));
const B2_ATTACK_RESOLVE_PROGRESS = Number(argVal('b2-attack-resolve-progress', String(DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackResolveProgress)));
const B2_ATTACK_BAND_ARRIVAL = argVal('b2-attack-band-arrival', String(DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackBandArrival)) === 'true';
const UNIVERSAL_BAND_ARRIVAL = argVal('universal-band-arrival', String(DEFAULT_RACE_DYNAMICS_CONFIG.universalBandArrival)) === 'true';
// ── Front distance leash (SIM-ONLY; no DevScreen/defaults entry — activated only here) ──────────────
// --frontLeashMaxLengths engages the leash (gap-space brake on the runaway leader); --frontLeashGainPct
// sets the brake per excess length (default 3). Absent --frontLeashMaxLengths → FRONT_LEASH off → the
// controller is never passed the leader→P2 length and never sets leash config → byte-identical.
const FRONT_LEASH_MAX = argVal('frontLeashMaxLengths', null);
const FRONT_LEASH = FRONT_LEASH_MAX !== null;
const FRONT_LEASH_MAX_LEN = FRONT_LEASH ? Number(FRONT_LEASH_MAX) : null;
const FRONT_LEASH_GAIN_PCT = FRONT_LEASH ? Number(argVal('frontLeashGainPct', '3')) : null;
// ── Gap-cap re-roll bias (SIM-ONLY; docs/CONCEPT-COHESION.md) ────────────────────────────────────
// --gapRerollThresholdLengths engages the bias; --gapRerollMode symmetric|down; --gapRerollStrength.
// Absent --gapRerollThresholdLengths → GAP_REROLL off → the roll loop never calls the transform →
// byte-identical (fingerprint-gated). Scheduled rolls ONLY (owner fairness decision) — no early rolls.
const GAP_REROLL_THRESH = argVal('gapRerollThresholdLengths', null);
const GAP_REROLL = GAP_REROLL_THRESH !== null;
const GAP_REROLL_THRESH_LEN = GAP_REROLL ? Number(GAP_REROLL_THRESH) : null;
const GAP_REROLL_MODE = GAP_REROLL ? argVal('gapRerollMode', 'symmetric') : null;
const GAP_REROLL_STRENGTH = GAP_REROLL ? Number(argVal('gapRerollStrength', '0.5')) : null;
// B2-leak trace (read-only diagnostic): adds b2LastInside to rawData rows. No-flag → byte-identical.
const B2_TRACE = argv.includes('--b2-trace');
// reRoll / trajectory dynamics overrides — same shared-default + argVal pattern. Lets a sweep
// test DevScreen-tuned (localStorage-only) values WITHOUT changing the shared defaults.js.
// Defaults read from DEFAULT_RACE_DYNAMICS_CONFIG → no drift; spread into dynamicsConfig below.
const DYNAMICS_OVERRIDES = {
  reRollVariationPercent:        Number(argVal('reRollVariationPercent',     String(DEFAULT_RACE_DYNAMICS_CONFIG.reRollVariationPercent))),
  reRollTransitionDuration:      Number(argVal('reRollTransitionDuration',   String(DEFAULT_RACE_DYNAMICS_CONFIG.reRollTransitionDuration))),
  reRollIntervalDivisor:         Number(argVal('reRollIntervalDivisor',      String(DEFAULT_RACE_DYNAMICS_CONFIG.reRollIntervalDivisor))),
  reRollLastPositionPercent:     Number(argVal('reRollLastPositionPercent',  String(DEFAULT_RACE_DYNAMICS_CONFIG.reRollLastPositionPercent))),
  trajectoryTransitionDuration:  Number(argVal('trajectoryTransitionDuration', String(DEFAULT_RACE_DYNAMICS_CONFIG.trajectoryTransitionDuration))),
  // Pulk realism envelope (±maxEffect clamp + slew) — same shared-default + argVal pattern (no drift).
  pulkEnvelopeMaxEffect:  Number(argVal('pulkEnvelopeMaxEffect',    String(DEFAULT_RACE_DYNAMICS_CONFIG.pulkEnvelopeMaxEffect))),
  pulkEnvelopeMaxStepPerFrame: Number(argVal('pulkEnvelopeMaxStepPerFrame', String(DEFAULT_RACE_DYNAMICS_CONFIG.pulkEnvelopeMaxStepPerFrame))),
  // Pulk contest strengths the lead rotation reads (pulk* namespace).
  pulkLeaderBrake:     Number(argVal('pulkLeaderBrake',     String(DEFAULT_RACE_DYNAMICS_CONFIG.pulkLeaderBrake))),
  pulkChallengerBoost: Number(argVal('pulkChallengerBoost', String(DEFAULT_RACE_DYNAMICS_CONFIG.pulkChallengerBoost))),
  pulkFrontPool:        Number(argVal('pulkFrontPool',        String(DEFAULT_RACE_DYNAMICS_CONFIG.pulkFrontPool))),
  pulkCeilingCap:       argVal('pulkCeilingCap', String(DEFAULT_RACE_DYNAMICS_CONFIG.pulkCeilingCap)) === 'true',
  // Additive boost-headroom above the natural band max for the pulk ceiling (0 = shipped baseline).
  pulkBoostHeadroom:    Number(argVal('pulkBoostHeadroom', String(DEFAULT_RACE_DYNAMICS_CONFIG.pulkBoostHeadroom))),
  // Ease the rowEnvMult step at the PULK->OUTCOME boundary (1s easeInOutCubic). Default TRUE = eased
  // (shipped 2026-07-19). --enableRowEnvSmooth=false forces the old instant step (byte-identical to pre-flip).
  enableRowEnvSmooth:  argVal('enableRowEnvSmooth', String(DEFAULT_RACE_DYNAMICS_CONFIG.enableRowEnvSmooth ?? true)) === 'true',
  // PulkLeadRotation (the PULK-phase lead-rotation core loop). Default OFF.
  pulkLeadRotationAttackerSlots: Number(argVal('pulkLeadRotationAttackerSlots', String(DEFAULT_RACE_DYNAMICS_CONFIG.pulkLeadRotationAttackerSlots))),
  pulkLeadRotationDropDepthLengths: Number(argVal('pulkLeadRotationDropDepthLengths', String(DEFAULT_RACE_DYNAMICS_CONFIG.pulkLeadRotationDropDepthLengths))),
  pulkLeadRotationOutsiderMaxReachLengths: Number(argVal('pulkLeadRotationOutsiderMaxReachLengths', String(DEFAULT_RACE_DYNAMICS_CONFIG.pulkLeadRotationOutsiderMaxReachLengths))),
  pulkLeadRotationDeadlockTimeoutMs: Number(argVal('pulkLeadRotationDeadlockTimeoutMs', String(DEFAULT_RACE_DYNAMICS_CONFIG.pulkLeadRotationDeadlockTimeoutMs))),
  pulkLeadRotationMinHoldMs: Number(argVal('pulkLeadRotationMinHoldMs', String(DEFAULT_RACE_DYNAMICS_CONFIG.pulkLeadRotationMinHoldMs))),
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
//   --strip-metrics       attach dual-window action (PULK 0.25→0.55, OUTCOME 0.55→1.0) + worst-case
//                         assigned-winner + bonus↔leader sample. Raw per-combo → results/strip-down/.
const REROLL_VARIANT      = Number(argVal('rerollVariant', '1'));
// ── areaBonus phase-split (INFRA 5A) ────────────────────────────────────────────────────────────
// The phase-split rescale is now applied NATIVELY by the shared controller (racePlanner.js) for the
// browser AND the sim, from the shipped dynamics config — threaded into createRacePlan below. This
// REPLACES the old sim-only, flag-gated rescale (the --areaBonusPulk/Post/Early flags, the
// AREA_SPLIT_ACTIVE path, and the --areaBonusPulkGate* position-gate experiment), which were the
// SOURCE of the divergence: a flagless sim applied the full band bonus (+6% B1) where the browser
// applied the split-down bonus (+3%). Strengths are read from the (world-merged)
// DEFAULT_RACE_DYNAMICS_CONFIG — the SAME source the browser reads — so no drift. Fallbacks mirror
// DEFAULT_RACE_DYNAMICS_CONFIG (phaseSplitBonusEnabled true, early 1.0 / pulk 0 / post 1.0).
const PHASE_SPLIT_BONUS_ENABLED = DEFAULT_RACE_DYNAMICS_CONFIG.phaseSplitBonusEnabled ?? false;
const AREA_BONUS_EARLY    = DEFAULT_RACE_DYNAMICS_CONFIG.areaBonusEarly ?? 1.0;
const AREA_BONUS_PULK     = DEFAULT_RACE_DYNAMICS_CONFIG.areaBonusPulk  ?? 0;
const AREA_BONUS_POST     = DEFAULT_RACE_DYNAMICS_CONFIG.areaBonusPost  ?? 1.0;
// PRE-STAGE-1 Q2 (--heroChaosAreaBonus=on|off, default on = byte-neutral): suppress the HERO POOL's
// areaBonus during CHAOS ONLY (raceProgress < pulkStartLive = choreo boundary 0.25). §4b: the CHAOS
// areaBonus is band-graded (B1 = +6% at bonusMult 2.0), so it washes the future B1 heroes forward
// BEFORE the race opens up — they never start deep. Setting this OFF zeros the B1-target racers' bonus
// only in chaos (the rest of the field keeps its wash-forward → assigned-winner reachability intact),
// so the deep-charger casting pool stays buried at the release. Read-only measurement flag; sim only.
const HERO_CHAOS_AREABONUS_OFF = argVal('heroChaosAreaBonus', 'on') === 'off';
const STRIP_METRICS       = argv.includes('--strip-metrics');
// ACTION-METRICS (read-only, --action-metrics): whole-field PULK-window movement metrics
// (rank churn, rank travel, risers/fallers, top-5 turnover, p10–p90 spread) + PULK naturalness
// + per-racer rows for pooled band-reach / corrP1 in the analyze step. Fully flag-gated → a
// no-flag run does zero extra work and is byte-identical. Measurement tooling only.
const ACTION_METRICS      = argv.includes('--action-metrics');
// --action-from-start: widen the ACTION-METRICS window from [pulkStartLive, pulkEndLive) to
// [0, pulkEndLive) (race start through the END of PULK) for the PULK-window BASELINE measurement.
// Lower bound only; upper bound (live pulkEnd) unchanged. Default OFF → window unchanged (the prior
// sweep's [pulkStart, pulkEnd) semantics are preserved). Read-only; window-threading, no new math.
const ACTION_FROM_START   = argv.includes('--action-from-start');
// --runaway-leader: RUNAWAY-LEADER measurement (read-only). Two one-shot boundary snapshots per race
// (leader identity + isHero + lead-over-P2 in racer lengths) at the first frame past pulkStart and past
// pulkEnd, to measure how often the post-chaos leader is already uncatchable and whether it is a hero.
// Rides in the action-metrics per-race dump (pass --action-metrics too). Read-only; no new physics.
const RUNAWAY_LEADER      = argv.includes('--runaway-leader');
// HERO-MAP (read-only, --hero-map): NIGHT-SWEEP TIER-1 observer. For every racer the choreo controller
// tags isHeroChoreographed, records the climb-feasibility signals over the race: anchor rank (at the
// choreo boundary), target rank, final rank, REAL whole-field overtakes (near-behind then cross —
// the corrected places-gained headline, NOT the Row1×Row0 physical_overtake), servo-ceiling frac
// (speed-limited, trajectoryMult≥1.09) and avoidance-brake frac (traffic-limited, avoidanceActive),
// and progress at which the front group / target rank is reached. Fully flag-gated → a no-flag run
// does zero extra work and is byte-identical. Measurement tooling only; nothing here mutates state.
const HERO_MAP            = argv.includes('--hero-map');
const heroMapRaces        = [];   // per-race hero observations (filled only when HERO_MAP)
// GAP-METRICS (read-only, --gap-metrics): INFRA 5C. Samples the race in TIME behind the leader
// (secondsBehindLeader, leader→P2 gap, top-5 spread, field p10–p90) at progress 0.50/0.75/0.90 and
// at the line, plus visibleComeback / deadRaceFlag. Every RANK-space metric the project owns is
// blind to a dead race (a racer can be "reachedFront" fifteen lengths behind a lone winner); these
// GAP-space metrics are not. Fully flag-gated → a no-flag run does zero extra work and is
// byte-identical. RAW distributions only — X/Y/Z await the owner's calibration (see gap-metrics.mjs).
const GAP_METRICS         = argv.includes('--gap-metrics');
const gmRaces             = [];   // per-race gap-space observations (filled only when GAP_METRICS)
// RUNAWAY-PARADE (read-only, --runaway-parade): baseline measurement of two dead-endgame phenomena —
// RUNAWAY_WINNER (leader >= 3L clear at progress 0.90, wins, never challenged in [0.90,1.0]) and
// PARADE_FINISH (a side-by-side leading group >= 2 detached >= 3L from the field). Collects the RAW
// per-race record (leader identity + lead at 0.90, min lead across the window, the finish-snapshot
// front gaps, per-racer final-window speed); the classifiers live in sim/observers/runaway-parade.mjs.
// Fully flag-gated → a no-flag run does zero extra work and is byte-identical.
const RUNAWAY_PARADE      = argv.includes('--runaway-parade');
const rpRaces             = [];   // per-race runaway/parade raw records (filled only when RUNAWAY_PARADE)
// SPEED-SOURCE (read-only, --speed-source): decompose the late-race speed of the top-15 live ranks into
// its multiplicative factors at fixed samples (0.70..0.95), with clamp saturation + headroom. Pure
// read-only capture at the advanceRacerT call site (harness Pass-2). No sim file changes; no fingerprint.
const SPEED_SOURCE        = argv.includes('--speed-source');
const ssRaces             = [];   // per-race top-15 speed decomposition (filled only when SPEED_SOURCE)
// --skip-main-output: skip writing the large fairness-data.json + fairness-report.md. For a batch
// runner that reads only hero-map.json, to avoid heavy concurrent writes into the OneDrive-synced
// tree. Read-only measurement runs only; a normal run (flag absent) is unchanged.
const SKIP_MAIN_OUTPUT    = argv.includes('--skip-main-output');
// COMEBACK-REALITY (read-only, --comeback-reality): reuses the --hero-map per-race observations to
// measure whether hero-cast COMEBACKERS actually climb near their authored finalRank, and how reliably
// the designation points at real climbing. Requires --hero-map. Writes a separate, uncommitted report
// dir (results/comeback-reality-sweep-<date>/). Adds zero per-frame work; pure post-race aggregation.
const COMEBACK_REALITY    = argv.includes('--comeback-reality');

// PULK-action-2: ceiling-capped challenger boost (naturalness). '0' = off (byte-identical additive boost);
// the shared director strengths (leaderBrake / challengerBoost / frontPool / ceilingCap + the
// maxEffect/maxStep realism envelope) are read from DYNAMICS_OVERRIDES via the shared-default + argVal
// pattern (--governorDirector* overrides), so a no-flag sim run mirrors the shipped director default.
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
// SetupScreen "Action" slider backing (SWEEP HYPOTHESIS; never in shipped defaults; --action unset =
// no-op). STAGE-4: the classic couplings (pullStrength / maxParallelBoosts) were removed with the
// reactive director. The axis is an empty stub until Stage-5b re-targets it to the re-homed rotation
// strengths (leaderBrake / challengerBoost / frontPool).
const ACTION_RAW = argVal('action', null);
const ACTION = ACTION_RAW !== null ? Math.max(0, Math.min(1, Number(ACTION_RAW))) : null;
function actionToDirectorKnobs() {
  return {}; // no couplings yet — Stage-5b re-targets the Action axis to the rotation strengths
}
// Realized knobs at this action-point (null when --action unset). Empty until Stage-5b re-targets.
const ACTION_KNOBS = ACTION !== null ? actionToDirectorKnobs(ACTION) : null;
if (ACTION_KNOBS) Object.assign(DYNAMICS_OVERRIDES, ACTION_KNOBS);

// ── Phase-3B: COMEBACK analysis mode ─────────────────────────────────────────
const COMEBACK_ANALYSIS = argVal('comeback-analysis', 'false') === 'true';
const CB_MIN_POSITIONS  = Number(argVal('cbMinPositions', '3'));
const CB_WINDOW_SEC     = Number(argVal('cbWindowSec', '5'));
const CB_ENDGAME_THRESH = Number(argVal('cbEndgameThresh', '0.85'));

// Lateral-proximity threshold for a REAL overtake (course-fraction units). Read by the hero-map
// observer (--hero-map). Formerly also the V4 start-row experiment's constant; kept here after that
// experiment was deleted because it is SHARED, not V4-private. Flag name is historical.
const V4_LATERAL_PROXIMITY = Number(argVal('v4LateralProximity', '0.3'));

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
  heroMap = false,             // --hero-map: record per-hero climb-feasibility signals (read-only)
  gapMetrics = false,          // --gap-metrics: record gap-space (time-behind-leader) signals (read-only)
  runawayParade = false,       // --runaway-parade: record runaway-winner / parade-finish raw signals (read-only)
  speedSource = false,         // --speed-source: record top-15 late-race speed decomposition (read-only)
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
      const speedBonusMult = 1 + speedBonus;
      const rollJitter    = (Math.random() - 0.5) * 2 * rollInterval * 0.2;

      const r = {
        index:                 i,
        name:                  `R${i + 1}`,
        t:                     tStart,
        tStart,
        rawRowBonus:           speedBonus, // STRIP-DOWN: raw start-row speed bonus (speedBonusMult−1) for the phase envelope
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

    // choreo: heroes are cast + tagged (isHeroChoreographed) at the post-chaos boundary inside the
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


    computePositions();

    // ── Diagnostic snapshot state ─────────────────────────────────────────────
    const diagSnapshots = [];
    let diagSnapIdx = 0;
    const DIAG_SNAP_MS   = diagnosticMode ? DIAG_SNAP_TIMES_S.map((s) => s * 1000) : [];
    let diagIntLateralPushes = 0;
    let diagIntBrakeActs     = 0;

    function diagTakeSnapshot(nominalTimeS, actualTimeMs) {
      const snap = {
        timeS: nominalTimeS, actualTimeMs,
        interval: { lateralPushes: diagIntLateralPushes, brakeActivations: diagIntBrakeActs },
        racers: racers.map((r) => ({
          idx: r.index, row: r.startRowIndex,
          t: +r.t.toFixed(6), physY: +r.physicalY.toFixed(4),
          speed: +r.baseSpeed.toFixed(6), avoidance: r.avoidanceActive,
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

    // ── PULK-phase contest director — parity with the browser ─────────────────────
    // Phase fractions + seed come from the controller (live boundaries, single source).
    // pulkEnvelopeMaxEffect + pulkEnvelopeMaxStepPerFrame are the pulk realism envelope (±clamp + slew).
    const govFractions = racePlanController?.getPhaseFractions?.() ?? null;
    // ── PulkLeadRotation (the sole PULK director; runs whenever a plan controller exists). Reads its own
    // pulk* strength knobs (pulkLeaderBrake/pulkChallengerBoost/pulkFrontPool + the pulkEnvelope*/
    // pulkCeilingCap envelope); the four rotation keys + minHold are its own. ONE governorMult writer.
    const pulkLeadRotationOn = !!racePlanController;
    const pulkLeadRotCfg = {
      enabled: pulkLeadRotationOn,
      attackerSlots: dynamicsConfig.pulkLeadRotationAttackerSlots ?? 2,
      dropDepthLengths: dynamicsConfig.pulkLeadRotationDropDepthLengths ?? 2,
      outsiderMaxReachLengths: dynamicsConfig.pulkLeadRotationOutsiderMaxReachLengths ?? 15,
      deadlockTimeoutMs: dynamicsConfig.pulkLeadRotationDeadlockTimeoutMs ?? 12000,
      minHoldMs: dynamicsConfig.pulkLeadRotationMinHoldMs ?? 750,
      frontPool: dynamicsConfig.pulkFrontPool ?? 8,
      leaderBrake: dynamicsConfig.pulkLeaderBrake ?? 0,
      challengerBoost: dynamicsConfig.pulkChallengerBoost ?? 0,
      maxEffect: dynamicsConfig.pulkEnvelopeMaxEffect ?? 0.12,
      maxStepPerFrame: dynamicsConfig.pulkEnvelopeMaxStepPerFrame ?? 0.01,
      ceilingCap: (dynamicsConfig.pulkCeilingCap ?? false)
        ? computeDirectorCeiling(BASE_SPEED_MAX, BASE_SPEED_MEAN, dynamicsConfig.pulkBoostHeadroom ?? 0)
        : 0,
    };
    // Phase-split MECHANIC boundaries follow the LIVE plan phase fractions (single source: the
    // controller), mirroring the browser — so the bonuses move with the PULK phase if it is edited.
    // Defaults (pulkStart 0.25 / pulkEnd 0.5) are unchanged → byte-identical to the pinned SD_* values.
    // (The strip-metrics OBSERVATION windows below intentionally stay on the pinned SD_* constants.)
    const pulkStartLive = govFractions?.pulkStartFrac ?? SD_PULK_START;
    const pulkEndLive   = govFractions?.pulkEndFrac ?? SD_PULK_END;
    // Row-bonus phase envelope config for the shared t-update (raceStep.js). Reads the
    // SHIPPED dynamics config — the SAME source the browser reads (phaseSplitBonusEnabled +
    // rowBonus{Early,Pulk,Post}) — so the sim applies rowEnvMult natively, exactly as the game
    // does. Boundaries are the LIVE plan fractions above, never a literal. Built once per race.
    const rowPhaseCfg = {
      enabled: dynamicsConfig.phaseSplitBonusEnabled ?? false,
      chaosEndFrac: pulkStartLive,
      pulkEndFrac: pulkEndLive,
      early: dynamicsConfig.rowBonusEarly ?? 1,
      pulk:  dynamicsConfig.rowBonusPulk  ?? 1,
      post:  dynamicsConfig.rowBonusPost  ?? 1,
      smooth: dynamicsConfig.enableRowEnvSmooth ?? false, // ease the step over 1s (default false = instant)
    };
    // Per-race director state. applyPulkLeadRotation lazily attaches its own leadRot sub-state on
    // first call; nothing else is needed here (parity with the browser dirState shape).
    const dirState = {};
    // Mean drawn body length (px) over the field — the racer-length unit for the arc-distance
    // bound (parity with the browser). Computed once per race (bodies are fixed per racer).
    const govMeanBodyLen = meanDrawnBodyLen(racers); // shared racer-length source (parity w/ browser)

    const govLenScale = lenScaleFrom(pathLengthPx, govMeanBodyLen);

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
    // ── HERO-MAP observer state (read-only; --hero-map) ──────────────────────────
    // Per hero (index → accumulator). Populated lazily the first frame a racer is tagged
    // isHeroChoreographed (i.e. at the choreo boundary). Never mutates race state.
    const hmHeroes = heroMap ? new Map() : null;
    // ── GAP-METRICS per-race state (read-only; only allocated when --gap-metrics) ──
    // PRIMARY unit = RACER LENGTHS (arc distance to the leader × govLenScale, the shared HUD scale).
    // Seconds kept as a SECONDARY column (needs the leader trace); never a headline / threshold basis.
    const gmTrace = gapMetrics ? [] : null;         // ascending {ts, t} leader-position-vs-time trace (SEC)
    const gmCheckpoints = gapMetrics ? [] : null;   // snapshots at progress 0.25 / 0.50 / 0.75 / 0.90
    const gmPerRacer = gapMetrics ? new Map() : null; // index → {maxBehindLen, inContentionSteps, totalSteps, maxBehindSec}
    const gmDeadSeries = gapMetrics ? [] : null;    // final-third leader→P2 gap, LENGTHS (primary deadRace)
    const gmDeadSeriesSec = gapMetrics ? [] : null; // same, SECONDS (secondary)
    const gmFrontSeries = gapMetrics ? [] : null;   // final-third FRONTMOST consecutive gap, LENGTHS (lead-group detach)
    let gmLineSnap = null;                           // field lengths-behind snapshot at the leader-finish instant
    // FRONTMOST-GAP window: the largest consecutive-racer gap among the front FRONT_K racers, and how
    // many sit ahead of it — the detached-lead-GROUP signal (leaderGapToP2 sees only a lone leader).
    // K=10 caps a 40-field's plausible lead group; racers beyond rank 10 are not part of the "front"
    // scalar (documented, not a silent truncation). The full front-gap array is emitted too, so any
    // threshold/definition is recoverable. RAW — never a pass/fail.
    const GM_FRONT_K = 10;
    // NIGHT-SWEEP (gap-space): 0.25 added to match the spec sample points (0.25/0.50/0.75/0.90 + line);
    // 0.25 = the choreo/chaos boundary — the earliest "is the field already strung out?" snapshot.
    const GM_CPS = [0.25, 0.5, 0.75, 0.9];          // sample checkpoints (leader progress)
    let gmNextCp = 0;
    // ── RUNAWAY-PARADE per-race state (read-only; only allocated when --runaway-parade) ──
    // Collects the RAW signals the two classifiers (sim/observers/runaway-parade.mjs) consume. All
    // gaps in RACER LENGTHS (arcT × govLenScale). One-shot captures at progress 0.90 (leader identity
    // + lead), at 0.95 (final-window speed baseline) and at the leader-crossing instant (finish
    // snapshot front gaps); a running MIN of the 0.90-leader's lead over the field across [0.90, its
    // own finish] (the "never challenged" signal). Never mutates race state.
    const RP_WINDOW_START = RUNAWAY_PARADE_DEFAULTS.windowStart;             // 0.90
    const RP_SPEED_START  = 1 - RUNAWAY_PARADE_DEFAULTS.speedWindow;         // 0.95
    const rp = runawayParade ? {
      leaderIdxAt090:      null,       // frontmost LIVE racer at the first frame >= windowStart
      leaderGapP2At090Len: null,       // its lead over P2 at that frame (lengths)
      within3P1At090:      null,       // # live racers within leadLen (3.0) lengths behind P1 at windowStart

      minLeadFrom090Len:   Infinity,   // MIN lead over the field across [windowStart, its own finish]
      t095ByIndex:         null,       // per-racer t at the first frame >= (1 - speedWindow)
      ts095:               null,       // raceTs at that frame
      line:                null,       // finish snapshot { order:[idx], gaps:[len] } at leader-crossing
      speed095ByIndex:     null,       // per-racer avg speed over [~0.95, line] (relative-spread source)
      formation:           makeFormationTracker(), // WHEN the leader→P2 gap forms (read-only per-frame)
      // ── Release-sweep metrics (read-only; definitions in sim/observers/release-contest.mjs) ──
      // lateContest: how many times the lead actually changed hands in [windowStart, 1.0] — the
      //   companion to p1SwapAfter090, which alone cannot tell one pass from a five-way scrap.
      // releaseRanks: one-shot rank snapshot at the LIVE choreoReleaseProgress, so post-release band
      //   drift can be separated from "never reached the band" (see bandExitAfterRelease).
      lateContest:         makeLateContestTracker(RP_WINDOW_START),
      releaseRanks:        makeReleaseRankTracker(CHOREO_RELEASE_PROGRESS),
      // ── Sustained P1 battle (read-only; definitions in sim/observers/outcome-front-battle.mjs) ──
      // Window starts at the LIVE contestWindowStart — the front act's own key (C1), no longer
      // B2's resolve checkpoint. No hardcoded progress constant; the carousel reads the same value.
      frontBattle:         makeFrontBattleTracker({ windowStart: CONTEST_WINDOW_START }),
      // C1 carousel telemetry. Allocated LAZILY: the schedule only exists after the generator has
      // run at the choreo boundary, so it cannot be built here. Stays null when the carousel is off
      // or was not cast — which is itself the cast-rate measurement.
      carousel:            null,
    } : null;
    // ── SPEED-SOURCE per-race state (read-only; only allocated when --speed-source) ──
    // samples[prog] = [{ rank, index, effSpeed, product, factors…, saturation…, gapAhead, finishClamp }]
    // for the top-15 live ranks at the first frame >= each sample progress. SS_TRAJ_MAX = the servo
    // ceiling (controllerParams.maxMult 1.10 at defaults); NAT_CEIL (below) = the natural spreadFactor max.
    const SS_TRAJ_MAX = 1.1;
    const ss = speedSource ? { samples: {}, nextSample: 0, cap: null } : null;
    const HM_CEIL  = 1.09;                 // servo ceiling (maxMult 1.10) — parity with smWinnerCeilSteps
    const HM_LAT   = V4_LATERAL_PROXIMITY; // lateral proximity for a REAL overtake (0.3) — parity with physical_overtake
    const hmBandOf = (rank) => {
      if (rank == null) return null;
      for (let i = 0; i < BAND_EDGES.length; i++) if (rank <= BAND_EDGES[i]) return i;
      return BAND_EDGES.length;
    };
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
    // NEW (pulk-contest observer): held top-5 overtakes + per-frame max consecutive-link gap (lengths).
    const amHeld      = ACTION_METRICS ? makeHeldOvertakeTracker() : null; // held top-5 overtake tracker
    const amLinkGaps  = ACTION_METRICS ? [] : null; // per-frame max adjacent-rank gap (racer-lengths)
    const amFullSpread = ACTION_METRICS ? [] : null; // per-frame leader→last full spread (racer-lengths, Q3b)
    let   amEndFullSpread   = 0; // leader→last spread at the LAST PULK frame (end-of-PULK snapshot, lengths)
    let   amEndSpreadP10P90 = 0; // p10→p90 spread at the LAST PULK frame (end-of-PULK snapshot, lengths)
    let   amPrevP1     = -1;  // previous window frame's P1 index (for the raw lead-change counter)
    let   amLeadChanges = 0;  // raw count of P1 hand-overs across the window (unguarded action density)
    // RUNAWAY-LEADER one-shot boundary snapshots (--runaway-leader). Captured at the first frame past
    // pulkStart / pulkEnd; each stays null until its crossing. Per-race (reset by this per-race scope).
    let rlStartSnap = null, rlEndSnap = null;

    // ── OUTCOME rank-change observer (UNCONDITIONAL; read-only) ─────────────────
    // The primary signal for the pack-release experiment: how much reordering happens in the OUTCOME
    // phase. Per OUTCOME frame we count adjacent rank-order swaps vs the previous OUTCOME frame (same
    // reshuffle-volume definition as amSwaps, but OUTCOME-gated). ocTotalSwaps = all adjacent swaps;
    // ocTop5Swaps = swaps where BOTH racers of the pair are currently in the top 5 (front action).
    // Read-only: it only reads live ranks, never touches physics → cannot change the fingerprint hash
    // (that hashes finish order, not naturalness). Cost: one sort per OUTCOME frame, negligible.
    let ocPrevRank = null; // Map(index → rank) from the previous OUTCOME frame
    let ocTotalSwaps = 0, ocTop5Swaps = 0, ocFrames = 0;
    // B2-leak trace (--b2-trace): per B2-TARGET racer, the LAST OUTCOME progress it sat inside B2
    // (ranks 6-15). For racers that MISS B2 at the finish, a high lastInside ⇒ late exit (timing/runway);
    // a low lastInside ⇒ early exit the re-steer never re-caught (authority). Read-only.
    const b2LastInside = new Map(); // index → last raceProgress inside B2

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
          // Gap-cap re-roll bias (SIM-ONLY; scheduled rolls only). Called ONLY when the flag is on, so
          // an off run never invokes the transform → byte-identical. Passes the length-scale context
          // (govLenScale/isOpen); the shared method computes the arc gaps + window internally.
          // ── ROLE-BIASED DICE (C1 Mechanism B) — evaluated FIRST, and it WINS. ──────────────────
          // PRECEDENCE (explicit, per spec — no silent double-tilting): when a racer is a carousel
          // participant with an authored role at this instant, the role tilt applies and the
          // gap-reroll is SKIPPED for that racer at that roll. The two are directly opposed — an
          // attacker that has just closed on the leader opens a hole BEHIND itself, which is the
          // gap-reroll's down-tilt trigger, so the generic corrective would brake exactly the racer
          // the carousel is authoring forward. Explicit intent beats generic correction; every
          // non-participant, and every participant during a dwell, still gets the ordinary gap-reroll.
          const roleBiased = racePlanController
            ? racePlanController.computeRoleBiasedTarget(
                r.index, biasedTarget,
                BASE_SPEED_MIN / BASE_SPEED_MEAN,
                BASE_SPEED_MAX / BASE_SPEED_MEAN,
                raceProgress
              )
            : { value: biasedTarget, biased: false };
          const gapBiased = roleBiased.biased
            ? roleBiased.value
            : (GAP_REROLL && racePlanController)
              ? racePlanController.computeGapBiasedTarget(
                  r.index, biasedTarget,
                  BASE_SPEED_MIN / BASE_SPEED_MEAN,
                  BASE_SPEED_MAX / BASE_SPEED_MEAN,
                  racers, raceTs, raceProgress, govLenScale, isOpen,
                  lastRollDeadline // schedule's own realized-duration deadline (same basis as raceTs)
                )
              : biasedTarget;
          const newTarget   = Math.max(
            BASE_SPEED_MIN / BASE_SPEED_MEAN,
            Math.min(BASE_SPEED_MAX / BASE_SPEED_MEAN, gapBiased)
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
      }

      // ── Controller-Pass: write trajectoryMultTarget (Race Plan only) ────────
      if (racePlanController) {
        // Front distance leash (SIM-ONLY): pass the leader→P2 arc length (racer lengths) so the
        // controller can brake a runaway leader. Computed with the SHARED leaderGapLengths (the SAME
        // quantity the runaway-parade observer measures). When the leash is OFF we call update() with
        // NO 4th arg — exactly as before → byte-identical (fingerprint-gated).
        if (FRONT_LEASH) {
          racePlanController.update(racers, raceTs, raceProgress, leaderGapLengths(racers, isOpen, govLenScale));
        } else {
          racePlanController.update(racers, raceTs, raceProgress);
        }
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

      // ── areaBonus phase-split (INFRA 5A) ─────────────────────────────────────
      // The rescale that used to live HERE (behind the --areaBonus* flags) now runs INSIDE the
      // shared controller (racePlanController.update() → racePlanner.js), from the shipped dynamics
      // config threaded into createRacePlan — the SAME code the browser runs. So r.areaBonusMult is
      // already phase-split by the controller-pass above; nothing to do here. This is the repair for
      // the areaBonus divergence: a no-flag sim run now applies the shipped split (+3% B1 in EARLY,
      // 0 in PULK), exactly like the browser, instead of the old flagless +6%.

      // ── PRE-STAGE-1 Q2: suppress the HERO POOL's CHAOS areaBonus (--heroChaosAreaBonus=off) ──
      // Runs AFTER the areaBonus phase-split so it composes with any scope arm. Zeros only B1-target
      // racers' areaBonus, and only in chaos (raceProgress < pulkStartLive); the rest of the field
      // keeps its chaos wash. Absent flag → no-op → byte-neutral. Read-only measurement.
      if (HERO_CHAOS_AREABONUS_OFF && racerTargetRankMap && raceProgress < pulkStartLive) {
        for (const r of racers) {
          if ((racerTargetRankMap.get(r.index) ?? 999) <= BAND_EDGES[0]) r.areaBonusMult = 1.0;
        }
      }


      // ── PulkLeadRotation — until-P1 attackers + outsider + distance ex-leader brake (default OFF → skipped) ──
      if (pulkLeadRotationOn && govFractions) {
        applyPulkLeadRotation(
          racers,
          finishT,
          { progress: raceProgress, pulkStartFrac: govFractions.pulkStartFrac, pulkEndFrac: govFractions.pulkEndFrac, corrStartFrac: govFractions.corrStartFrac, pathLengthPx, meanBodyLen: govMeanBodyLen, isOpen, currentMs: raceTs, dirState },
          pulkLeadRotCfg
        );
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

      // ── RUNAWAY-LEADER boundary snapshots (--runaway-leader; read-only, ONE-SHOT each) ──
      // Fire once at the first frame past pulkStart / pulkEnd (live plan fractions), capturing the
      // leader's identity + isHero + lead-over-P2 (racer lengths). Not a per-frame loop.
      if (RUNAWAY_LEADER) {
        if (!rlStartSnap && raceProgress >= pulkStartLive) rlStartSnap = leaderSnapshot(racers, isOpen, govLenScale);
        if (!rlEndSnap && raceProgress >= pulkEndLive) rlEndSnap = leaderSnapshot(racers, isOpen, govLenScale);
      }

      // ── ACTION-METRICS observer (--action-metrics; read-only) ──────
      // Whole-field, both-directions movement over the window. Default window [pulkStartLive,
      // pulkEndLive); with --action-from-start the LOWER bound is 0 → [0, pulkEndLive) (race start
      // through PULK end, the baseline-measurement window). Upper bound is the LIVE plan pulkEnd (never
      // a literal). No P1-only, no hold requirement. Pure observation on the pre-Pass-2 live order.
      const amWindowFrom = ACTION_FROM_START ? 0 : pulkStartLive;
      if (ACTION_METRICS && raceProgress >= amWindowFrom && raceProgress < pulkEndLive) {
        const order = racers
          .filter((r) => !r.finished)
          .sort((a, b) => (b.t !== a.t ? b.t - a.t : a.index - b.index)); // rank 1 = leader
        const n = order.length;
        if (n > 0) {
          amFrames++;
          // Raw lead-change counter (unguarded): P1 = order[0] this frame; count each hand-over. This
          // is the "how many times P1 changed hands" density (a); distinctP1Pulk below is the "how many
          // DIFFERENT racers led" variety (b). heldTop5Overtakes is the HOLD-GUARDED (≥750 ms) companion.
          const p1Now = order[0].index;
          if (amPrevP1 >= 0 && p1Now !== amPrevP1) amLeadChanges++;
          amPrevP1 = p1Now;
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
          // NEW density + held-overtake (pulk-contest observer; math in the observer, not here).
          amLinkGaps.push(maxLinkGapLengths(order, isOpen, govLenScale)); // max adjacent-rank gap (lengths)
          amFullSpread.push(fullSpreadLengths(order, govLenScale)); // leader→last full spread (lengths, Q3b)
          amHeld.observe(order.slice(0, 5).map((r) => r.index), raceProgress); // held top-5 overtakes
          // p10→p90 on-track spread in racer-lengths (front-percentile minus back-percentile racer).
          const p10 = order[Math.floor(0.1 * (n - 1))];
          const p90 = order[Math.floor(0.9 * (n - 1))];
          amSpreadSum += (p10.t - p90.t) * govLenScale;
          // End-of-PULK snapshot (read-only): overwrite each window frame so these hold the LAST PULK
          // frame's value (last frame with raceProgress < pulkEndLive) when the race loop exits.
          amEndFullSpread   = amFullSpread[amFullSpread.length - 1];
          amEndSpreadP10P90 = (p10.t - p90.t) * govLenScale;
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

      // ── OUTCOME rank-change accumulation (read-only; the experiment's primary action signal) ──
      if (racePlanController && racePlanController.getPhase(raceTs, raceProgress) === 'OUTCOME') {
        const order = racers
          .filter((r) => !r.finished)
          .sort((a, b) => (b.t !== a.t ? b.t - a.t : a.index - b.index)); // rank 1 = leader
        const n = order.length;
        if (n > 1) {
          ocFrames++;
          if (ocPrevRank) {
            for (let i = 0; i < n - 1; i++) {
              const a = ocPrevRank.get(order[i].index);
              const b = ocPrevRank.get(order[i + 1].index);
              if (a !== undefined && b !== undefined && a > b) {
                ocTotalSwaps++;
                if (i <= 3) ocTop5Swaps++; // pair (rank i+1, rank i+2): both ≤ 5 ⇔ i ≤ 3
              }
            }
          }
          ocPrevRank = new Map(order.map((r, i) => [r.index, i + 1]));
          // B2-leak trace: record last progress each B2-TARGET racer sat inside B2 (ranks 6-15).
          if (racerTargetRankMap) {
            for (let i = 0; i < n; i++) {
              const idx = order[i].index;
              const tr = racerTargetRankMap.get(idx);
              if (tr >= 6 && tr <= 15 && i + 1 >= 6 && i + 1 <= 15) b2LastInside.set(idx, raceProgress);
            }
          }
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
      // SPEED-SOURCE (read-only): is THIS frame a decomposition sample? If so, capture every factor at
      // the advanceRacerT call site into ss.cap (index → factors + tBefore) for the top-15 build below.
      const ssSample = ss && ss.nextSample < SPEED_SOURCE_SAMPLES.length && raceProgress >= SPEED_SOURCE_SAMPLES[ss.nextSample];
      if (ssSample) ss.cap = new Map();
      // TEF v3: per-frame meanT of Row-0 (computed once, used per-racer below)
      for (const r of racers) {
        if (!r.finished) {
          const boost = r.draftingBoostActive ? behaviorConfig.draftingBoost : 1.0;
          // Sim-Browser Parity: mirror the Step-1 min() from index.jsx so the sim
          // accurately reflects brake-to-match behavior (report 07 parity fix).
          const brake = r.avoidanceActive
            ? Math.min(effectiveBrakeFactor, r.brakeMatchFactor ?? effectiveBrakeFactor)
            : 1.0;
          // Shared per-frame advance (client/src/modules/raceStep.js) — the SAME function the
          // browser calls. It computes the start-row phase envelope (rowEnvMult) from the live
          // plan fractions and applies the finish clamp. dt = DT/16 = 16/16 = 1.0 (fixed timestep).
          // Opt-in rowEnvMult smoothing (shared raceStep.js): default off → target, byte-identical.
          const rowEnvTarget = computeRowEnvMult(r.rawRowBonus, raceProgress, rowPhaseCfg);
          const rowEnvMult = rowPhaseCfg.smooth
            ? computeRowEnvSmoothed(r, rowEnvTarget, raceTs)
            : rowEnvTarget;
          // SPEED-SOURCE capture (read-only): the EXACT factors advanceRacerT is about to use, plus the
          // pre-advance t. Same values → the recorded product equals the applied Δt bit-for-bit (unless
          // the finish clamp fires). Never mutates race state.
          if (ssSample) {
            ss.cap.set(r.index, {
              tBefore: r.t, boost, brake, rowEnvMult,
              baseSpeed: r.baseSpeed, spreadFactor: r.spreadFactor, speedBonusMult: r.speedBonusMult ?? 1.0,
              trajectoryMult: r.trajectoryMult, areaBonusMult: r.areaBonusMult, governorMult: r.governorMult ?? 1.0,
            });
          }
          r.t = advanceRacerT(r, {
            boost,
            brake,
            raceProgress,
            finishT,
            dt: DT / 16,
            phase: rowPhaseCfg,
            rowEnvMult,
          });
        }
      }

      // ── SPEED-SOURCE sample build (read-only): top-15 live ranks decomposed at this sample ──────
      // Runs right after Pass-2 so r.t is the applied (post-clamp) value → effSpeed is the REAL Δt/dt.
      // product = speedProduct(factors) equals effSpeed unless the finish clamp fired (finishClamp).
      if (ssSample && ss.cap) {
        const ssDt = DT / 16;
        const order = racers.filter((r) => !r.finished).sort((a, b) => (b.t - a.t) || (a.index - b.index));
        const top = order.slice(0, 15);
        const recs = [];
        for (let i = 0; i < top.length; i++) {
          const r = top[i];
          const c = ss.cap.get(r.index);
          if (!c) continue;
          const product = speedProduct(c);
          const advanced = c.tBefore + product * ssDt;
          const effSpeed = (r.t - c.tBefore) / ssDt; // applied (post finish clamp)
          const sat = speedSaturation(c, SS_TRAJ_MAX, NAT_CEIL);
          const gapAhead = i > 0 ? +(arcT(top[i - 1].t, r.t, isOpen) * govLenScale).toFixed(4) : 0;
          recs.push({
            rank: i + 1, index: r.index,
            effSpeed: +effSpeed.toFixed(9), product: +product.toFixed(9),
            baseSpeed: +c.baseSpeed.toFixed(9), spreadFactor: +c.spreadFactor.toFixed(6),
            speedBonusMult: +c.speedBonusMult.toFixed(6), boost: +c.boost.toFixed(6), brake: +c.brake.toFixed(6),
            rowEnvMult: +c.rowEnvMult.toFixed(6), trajectoryMult: +c.trajectoryMult.toFixed(6),
            areaBonusMult: +c.areaBonusMult.toFixed(6), governorMult: +c.governorMult.toFixed(6),
            servoSaturated: sat.servoSaturated ? 1 : 0, servoHeadroom: +sat.servoHeadroom.toFixed(6),
            bandHeadroom: +sat.bandHeadroom.toFixed(6),
            finishClamp: advanced > finishT + 0.001 ? 1 : 0, gapAhead,
          });
        }
        ss.samples[SPEED_SOURCE_SAMPLES[ss.nextSample]] = recs;
        ss.nextSample++;
        ss.cap = null;
      }

      // ── HERO-MAP per-frame observer (--hero-map; read-only) ──────────────────
      // Runs after Pass-2 so trajectoryMult / avoidanceActive / t / physicalY are this frame's
      // final values. Only touches the hmHeroes accumulator — never race state.
      if (heroMap) {
        // Live on-track rank by t (rank 1 = furthest along). Includes finished racers (high t).
        const hmOrder = [...racers].sort((a, b) => (b.t - a.t) || (a.index - b.index));
        const hmRankOf = new Map();
        for (let i = 0; i < hmOrder.length; i++) hmRankOf.set(hmOrder[i].index, i + 1);
        for (const r of racers) {
          if (!r.isHeroChoreographed || r.finished) continue;
          const cur = hmRankOf.get(r.index);
          let h = hmHeroes.get(r.index);
          if (!h) {
            h = {
              index: r.index, anchorRank: cur, anchorProgress: +raceProgress.toFixed(4),
              targetRank: racerTargetRankMap?.get(r.index) ?? null,
              frames: 0, climbFrames: 0, ceilFrames: 0, trafficFrames: 0, bothFrames: 0,
              bestRank: cur, maxTraj: 1.0, passed: new Set(), nb: new Set(),
              reachedFrontProg: null, reachedTargetProg: null,
            };
            hmHeroes.set(r.index, h);
          }
          h.frames++;
          const traj = r.trajectoryMult ?? 1.0;
          const climbing = h.targetRank != null && cur > h.targetRank; // still behind its target
          if (climbing) h.climbFrames++;
          const atCeil  = traj >= HM_CEIL;   // servo pinned at +10% ceiling → SPEED-limited
          const braking = !!r.avoidanceActive; // braking behind a leader, no free lane → TRAFFIC-limited
          if (atCeil)  h.ceilFrames++;
          if (braking) h.trafficFrames++;
          if (atCeil && braking) h.bothFrames++;
          if (traj > h.maxTraj) h.maxTraj = traj;
          if (cur < h.bestRank) h.bestRank = cur;
          if (h.reachedFrontProg == null && cur <= BAND_EDGES[0]) h.reachedFrontProg = +raceProgress.toFixed(4);
          if (h.reachedTargetProg == null && h.targetRank != null && cur <= h.targetRank) h.reachedTargetProg = +raceProgress.toFixed(4);
          // REAL whole-field overtakes: hero was laterally near+behind another racer, THEN crossed
          // ahead. Once per pair (physical_overtake convention). This is the corrected places-gained.
          for (const o of racers) {
            if (o.index === r.index || o.finished) continue;
            if (h.passed.has(o.index)) continue;
            if (!h.nb.has(o.index)) {
              if (Math.abs((r.physicalY ?? 0) - (o.physicalY ?? 0)) < HM_LAT && r.t < o.t) h.nb.add(o.index);
            } else if (r.t > o.t) {
              h.passed.add(o.index);
            }
          }
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
        while (diagSnapIdx < DIAG_SNAP_MS.length && raceTs >= DIAG_SNAP_MS[diagSnapIdx]) {
          diagTakeSnapshot(DIAG_SNAP_TIMES_S[diagSnapIdx], raceTs);
          diagSnapIdx++;
        }
      }

      // ── GAP-METRICS per-frame observer (--gap-metrics; read-only) ────────────
      // Runs after Pass-2 (advanceRacerT) so every r.t is this frame's final value, and BEFORE the
      // finish check so a racer crossing this frame is still sampled at its pre-finish position.
      // PRIMARY = racer LENGTHS behind the leader (arcT(leaderT, r.t) × govLenScale — the shared HUD
      // scale); seconds kept as a secondary column. Records the field's lengths/seconds behind at the
      // checkpoints, the final-third leader→P2 gap (lengths + seconds), and the at-the-line snapshot.
      // Never mutates race state.
      if (gapMetrics) {
        let leaderMaxT = -Infinity;
        for (const r of racers) if (r.t > leaderMaxT) leaderMaxT = r.t;
        gmTrace.push({ ts: raceTs, t: leaderMaxT });
        // Live order by t desc (finished racers included — their clamped t stays at the front).
        const gmOrder = [...racers].sort((a, b) => (b.t - a.t) || (a.index - b.index));
        // Lengths behind the leader for a given position (0 for the leader; ≥0). Shared HUD scale.
        const lenBehind = (t) => lengthsBehindLeader(t, leaderMaxT, isOpen, govLenScale);
        // Frontmost-gap info: the widest consecutive gap (lengths) among the front GM_FRONT_K racers,
        // and how many racers sit AHEAD of it (= the detached lead-group size). Also the raw front-gap
        // array (P1→P2, P2→P3, …) so any threshold/definition is recoverable. RAW, no pass/fail.
        const frontGapInfo = () => {
          const lim = Math.min(GM_FRONT_K, gmOrder.length - 1);
          const gaps = [];
          for (let i = 0; i < lim; i++) gaps.push(arcT(gmOrder[i].t, gmOrder[i + 1].t, isOpen) * govLenScale);
          let maxG = 0, at = 0;
          for (let i = 0; i < gaps.length; i++) if (gaps[i] > maxG) { maxG = gaps[i]; at = i; }
          return { frontmostGapLen: +maxG.toFixed(4), nAhead: gaps.length ? at + 1 : 0, gaps: gaps.map((g) => +g.toFixed(4)) };
        };
        // Final-third signals: leader→P2 gap (deadRace) + frontmost front gap (lead-group detach).
        if (raceProgress >= 2 / 3 && gmOrder.length >= 2) {
          gmDeadSeries.push(lenBehind(gmOrder[1].t));
          gmDeadSeriesSec.push(secondsBehindLeader(gmOrder[1].t, gmTrace, raceTs));
          gmFrontSeries.push(frontGapInfo().frontmostGapLen);
        }
        // At-the-line snapshot: the field's lengths-behind at the instant the leader reaches finishT
        // (a spatial "how many lengths back is the field as the winner crosses" — captured once). The
        // leader is the first to reach finishT, so every other racer is still on track here — its
        // lengths-behind is the spatial FINAL gap (a finisher's own gap at its OWN crossing is ~0).
        if (!gmLineSnap && finishT > 0 && leaderMaxT >= finishT) {
          const perRacerLen = {};
          for (const r of racers) perRacerLen[r.index] = +lenBehind(r.t).toFixed(4);
          const fg = frontGapInfo();
          gmLineSnap = {
            leaderGapToP2Len: gmOrder.length >= 2 ? +lenBehind(gmOrder[1].t).toFixed(4) : 0,
            top5SpreadLen: gmOrder.length >= 5 ? +lenBehind(gmOrder[4].t).toFixed(4) : 0,
            fieldMedianBehindLen: +percentile(gmOrder.map((r) => lenBehind(r.t)), 0.5).toFixed(4),
            fieldSpreadP10P90Len: +fieldSpreadP10P90(gmOrder.map((r) => lenBehind(r.t))).toFixed(4),
            frontmostGapLen: fg.frontmostGapLen, frontmostGapNAhead: fg.nAhead, frontGaps: fg.gaps,
            perRacerLen,
          };
        }
        // Per-racer in-contention + max-behind (lengths primary, seconds secondary), AFTER chaos only.
        if (raceProgress > pulkStartLive) {
          for (const r of racers) {
            const behindLen = lenBehind(r.t);
            const behindSec = secondsBehindLeader(r.t, gmTrace, raceTs);
            let g = gmPerRacer.get(r.index);
            if (!g) { g = { maxBehindLen: 0, maxBehindSec: 0, inContentionSteps: 0, totalSteps: 0 }; gmPerRacer.set(r.index, g); }
            if (behindLen > g.maxBehindLen) g.maxBehindLen = behindLen;
            if (behindSec > g.maxBehindSec) g.maxBehindSec = behindSec;
            if (behindLen <= GM_THRESHOLDS.inContentionLen) g.inContentionSteps++;
            g.totalSteps++;
          }
        }
        // Checkpoint snapshots at 0.25 / 0.50 / 0.75 / 0.90 — leader→P2, leader→P5, field median &
        // p10–p90, PRIMARY lengths + secondary seconds (so lengths-per-second is derivable per sample).
        while (gmNextCp < GM_CPS.length && raceProgress >= GM_CPS[gmNextCp]) {
          const lenArr = gmOrder.map((r) => lenBehind(r.t));
          const secArr = gmOrder.map((r) => secondsBehindLeader(r.t, gmTrace, raceTs));
          const fg = frontGapInfo();
          gmCheckpoints.push({
            progress: GM_CPS[gmNextCp],
            // PRIMARY (lengths):
            leaderGapToP2Len: gmOrder.length >= 2 ? +lenBehind(gmOrder[1].t).toFixed(4) : 0,
            top5SpreadLen: gmOrder.length >= 5 ? +lenBehind(gmOrder[4].t).toFixed(4) : 0,
            fieldMedianBehindLen: +percentile(lenArr, 0.5).toFixed(4),
            fieldSpreadP10P90Len: +fieldSpreadP10P90(lenArr).toFixed(4),
            // FRONTMOST GAP (lead-group detach — the limiter's raw material):
            frontmostGapLen: fg.frontmostGapLen, frontmostGapNAhead: fg.nAhead, frontGaps: fg.gaps,
            // SECONDARY (seconds) — reporting only:
            leaderGapToP2Sec: gmOrder.length >= 2 ? +secondsBehindLeader(gmOrder[1].t, gmTrace, raceTs).toFixed(4) : 0,
            top5SpreadSec: gmOrder.length >= 5 ? +secondsBehindLeader(gmOrder[4].t, gmTrace, raceTs).toFixed(4) : 0,
            fieldMedianBehindSec: +percentile(secArr, 0.5).toFixed(4),
            fieldSpreadP10P90Sec: +fieldSpreadP10P90(secArr).toFixed(4),
          });
          gmNextCp++;
        }
      }

      // ── RUNAWAY-PARADE per-frame observer (--runaway-parade; read-only) ──────
      // Runs after Pass-2 (r.t final for the frame) and BEFORE the finish check, so the leader-crossing
      // frame is sampled at pre-finish positions (matching the gap-metrics at-the-line convention).
      // Never mutates race state.
      if (rp && govLenScale > 0) {
        // (0) FORMATION diagnostic (read-only): feed the per-frame leader→P2 gap + live leader identity
        // to the pure tracker (WHEN the gap forms). Same shared length as every other measurement.
        {
          const fLive = racers.filter((r) => !r.finished).sort((a, b) => (b.t - a.t) || (a.index - b.index));
          const fGap = fLive.length >= 2 ? arcT(fLive[0].t, fLive[1].t, isOpen) * govLenScale : 0;
          rp.formation.observe(fGap, raceProgress, fLive.length ? fLive[0].index : -1);
          // Release-sweep: same live ordering, two more read-only trackers. Both self-gate on
          // progress, so feeding them every frame is correct and costs one comparison outside
          // their windows.
          rp.lateContest.observe(racers, raceProgress);
          rp.releaseRanks.observe(racers, raceProgress);
          // Sustained-P1-battle primitives. The gap callback is the SAME lap-aware length path every
          // other observer here uses (arcT x govLenScale) — one shared definition, no duplicate arc
          // maths inside the observer.
          rp.frontBattle.observe(racers, raceProgress, raceTs, (aT, bT) => arcT(aT, bT, isOpen) * govLenScale);
          // C1: authored-vs-completed handovers. The dwell threshold is the SAME derived value the
          // schedule was built from (the servo slew), converted back to seconds here.
          if (rp.carousel === null && racePlanController) {
            const cp = racePlanController.getCarouselPlan();
            if (cp) {
              rp.carousel = makeCarouselTracker({
                segments: cp.segments, order: cp.order,
                dwellSec: DYNAMICS_OVERRIDES.trajectoryTransitionDuration,
              });
            }
          }
          if (rp.carousel) rp.carousel.observe(racers, raceProgress, raceTs);
        }
        // (1) One-shot at windowStart: the frontmost LIVE racer's identity + its lead over P2 (lengths).
        if (rp.leaderIdxAt090 === null && raceProgress >= RP_WINDOW_START) {
          const live = racers.filter((r) => !r.finished).sort((a, b) => (b.t - a.t) || (a.index - b.index));
          if (live.length >= 2) {
            rp.leaderIdxAt090 = live[0].index;
            // Single source with the front-leash input: leaderGapLengths (arcT × lenScale, lap-aware).
            rp.leaderGapP2At090Len = +leaderGapLengths(racers, isOpen, govLenScale).toFixed(4);
            // "In the fight": how many live racers sit within runawayParade.leadLen (3.0) lengths behind
            // P1 at the window (the product metric — median 0 in runaways today, target ≥2).
            let w3 = 0;
            for (let i = 1; i < live.length; i++) {
              if (arcT(live[0].t, live[i].t, isOpen) * govLenScale <= RUNAWAY_PARADE_DEFAULTS.leadLen) w3++;
            }
            rp.within3P1At090 = w3;
          } else if (live.length === 1) {
            rp.leaderIdxAt090 = live[0].index;
            rp.leaderGapP2At090Len = Infinity; // lone survivor — trivially uncontested
          }
        }
        // (2) Challenge window [windowStart, 1.0]: running MIN lead of the 0.90-leader over the WHOLE
        // field, only while that racer is still on track (its finish seals the win). SIGNED in lengths:
        // the arc gap when it leads, 0 when the field has drawn level or passed it (= challenged).
        if (rp.leaderIdxAt090 !== null && rp.leaderIdxAt090 >= 0 && raceProgress >= RP_WINDOW_START) {
          const leaderR = racers.find((r) => r.index === rp.leaderIdxAt090);
          if (leaderR && !leaderR.finished) {
            let bestOtherT = -Infinity;
            for (const r of racers) if (r.index !== leaderR.index && r.t > bestOtherT) bestOtherT = r.t;
            const lead = bestOtherT >= leaderR.t ? 0 : arcT(leaderR.t, bestOtherT, isOpen) * govLenScale;
            if (lead < rp.minLeadFrom090Len) rp.minLeadFrom090Len = lead;
          }
        }
        // (3) One-shot at (1 - speedWindow): per-racer position baseline for the final-window speed.
        if (!rp.t095ByIndex && raceProgress >= RP_SPEED_START) {
          rp.t095ByIndex = {};
          for (const r of racers) rp.t095ByIndex[r.index] = r.t;
          rp.ts095 = raceTs;
        }
        // (4) One-shot finish snapshot at the leader-crossing instant: front consecutive gaps (lengths)
        // over the full field order + each racer's average speed over the final window (relative-spread
        // source). Includes racers crossing THIS frame (still !finished here) at their pre-finish t.
        if (!rp.line && finishT > 0) {
          let leaderMaxT = -Infinity;
          for (const r of racers) if (r.t > leaderMaxT) leaderMaxT = r.t;
          if (leaderMaxT >= finishT) {
            const order = [...racers].sort((a, b) => (b.t - a.t) || (a.index - b.index));
            const gaps = [];
            for (let i = 0; i < order.length - 1; i++) {
              gaps.push(+(arcT(order[i].t, order[i + 1].t, isOpen) * govLenScale).toFixed(4));
            }
            rp.line = { order: order.map((r) => r.index), gaps };
            const speed095ByIndex = {};
            if (rp.t095ByIndex && rp.ts095 != null && raceTs > rp.ts095) {
              const dtSec = (raceTs - rp.ts095) / 1000;
              for (const r of racers) {
                const t0 = rp.t095ByIndex[r.index];
                if (t0 != null) speed095ByIndex[r.index] = +(((r.t - t0) / dtSec)).toFixed(6);
              }
            }
            rp.speed095ByIndex = speed095ByIndex;
          }
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
    // Attach mixing-quota and choreo diagnostics as non-iterable properties.
    results.mixingQuota     = mixingQuota;
    results.diagSnapshots   = diagnosticMode ? diagSnapshots : null;
    results.liteRow1BrakeFrames = liteRow1BrakeFrames;
    results.liteRow0BrakeFrames = liteRow0BrakeFrames;
    results.liteRow2BrakeFrames = liteRow2BrakeFrames;
    results.liteLateralMoves    = liteLateralMoves;
    results.liteRow1EverAheadCount       = liteRow1EverAhead.size;
    results.liteOverlapRate              = liteOverlapPairTotal > 0 ? liteOverlapPairFrames / liteOverlapPairTotal : 0;
    results.honestOverlapRate            = honestOverlapPairTotal > 0 ? honestOverlapPairFrames / honestOverlapPairTotal : 0;
    results.passThroughCount             = passThroughCount;        // sim-only: lateral pass-through events (post-warmup)
    results.maxRealSpread                = maxRealSpread;           // laps; 0 on open tracks
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
      // OUTCOME rank-change (pack-release experiment primary signal); per-race totals over OUTCOME.
      outcomeTop5Swaps: ocTop5Swaps,
      outcomeTotalSwaps: ocTotalSwaps,
      outcomeFrames: ocFrames,
    };
    results.physicalDurationS   = Math.max(...racers.map((r) => r.finishTime ?? 0));
    results.avgRerollsPerRacer  = racers.reduce((s, r) => s + r.rerollCount, 0) / racers.length;
    // outcomeReached: true if at least one racer crossed the finish line (race didn't time out)
    results.outcomeReached = finishedCount > 0;
    results.b2LastInside = b2LastInside; // B2-leak trace: index → last OUTCOME progress inside B2

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
    // every downstream column) is unchanged for a normal fairness run. Reads the per-step
    // lead-change / podium-shuffle counters accumulated above.
    if (frontAction) {
      const targetRankOf = (idx) =>
        racerTargetRankMap && idx >= 0 ? (racerTargetRankMap.get(idx) ?? null) : null;
      results.frontAction = {
        steps:             faSteps,
        leadChanges:       faLeadChanges,
        distinctP1:        faP1Set.size,
        leadChangeRate:    faSteps > 0 ? faLeadChanges / faSteps : 0,        // P1 changes / step
        podiumShuffleRate: faTop3CompareSteps > 0 ? faTop3ShuffleCount / faTop3CompareSteps : 0,
        // Per-racer front-running time vs assigned targetRank → unpredictability correlation.
        perRacer: racers.map((r) => ({
          index:      r.index,
          targetRank: targetRankOf(r.index),
          p1Frac:     faSteps > 0 ? (faP1StepsByIdx.get(r.index) ?? 0) / faSteps : 0,
          top3Frac:   faSteps > 0 ? (faTop3StepsByIdx.get(r.index) ?? 0) / faSteps : 0,
        })),
      };
    }

    // ── HERO-MAP results — attached ONLY when --hero-map (else results unchanged) ──
    if (heroMap && hmHeroes) {
      results.heroObs = [...hmHeroes.values()].map((h) => {
        const finalRank = racers.find((r) => r.index === h.index)?.finishRank ?? null;
        return {
          index:            h.index,
          anchorRank:       h.anchorRank,
          anchorProgress:   h.anchorProgress,
          targetRank:       h.targetRank,
          finalRank,
          placesGainedNet:  finalRank != null ? h.anchorRank - finalRank : null, // + = climbed
          realOvertakes:    h.passed.size,     // corrected headline: real whole-field overtakes
          bestRank:         h.bestRank,
          reachedFrontProg: h.reachedFrontProg,
          reachedTargetProg: h.reachedTargetProg,
          reachedTargetBand: (h.targetRank != null && finalRank != null)
            ? (hmBandOf(finalRank) === hmBandOf(h.targetRank)) : null,
          frames:           h.frames,
          climbFrames:      h.climbFrames,
          ceilFrac:         h.frames ? +(h.ceilFrames / h.frames).toFixed(4) : 0,   // speed-limited
          trafficFrac:      h.frames ? +(h.trafficFrames / h.frames).toFixed(4) : 0, // traffic-limited
          bothFrac:         h.frames ? +(h.bothFrames / h.frames).toFixed(4) : 0,
          maxTraj:          +h.maxTraj.toFixed(4),
        };
      });
    }

    // ── GAP-METRICS results — attached ONLY when --gap-metrics (else results unchanged) ──
    // RAW distributions only. deadRaceFlag / visibleComeback use the PROPOSED thresholds, which
    // AWAIT the owner's calibration — treat every boolean here as provisional, never a gate.
    if (gapMetrics) {
      const finishSecs = racers.map((r) => r.finishTime).filter((x) => x != null).sort((a, b) => a - b);
      const line = gapsAtLine(finishSecs);                 // SECONDS at the line (secondary)
      const leaderFinish = finishSecs.length ? finishSecs[0] : null;
      const lineLen = gmLineSnap ?? {};                    // LENGTHS at the leader-finish instant (primary)
      const perRacerLen = lineLen.perRacerLen ?? {};
      const perRacer = racers.map((r) => {
        const g = gmPerRacer.get(r.index) ?? { maxBehindLen: 0, maxBehindSec: 0, inContentionSteps: 0, totalSteps: 0 };
        const finalBehindSec = (r.finishTime != null && leaderFinish != null) ? r.finishTime - leaderFinish : null;
        // FINAL gap in lengths = this racer's lengths-behind at the LEADER-finish instant (a finisher's
        // own gap at its OWN crossing is ~0; the spatial "final gap" is measured when the winner crosses).
        const finalBehindLen = perRacerLen[r.index] ?? null;
        return {
          index: r.index,
          finalRank: r.finishRank,
          // PRIMARY (lengths):
          finalBehindLen,
          maxBehindAfterChaosLen: +g.maxBehindLen.toFixed(4),
          inContentionFraction: g.totalSteps > 0 ? +(g.inContentionSteps / g.totalSteps).toFixed(4) : 0, // X in lengths
          visibleComeback: finalBehindLen != null
            ? visibleComeback(g.maxBehindLen, finalBehindLen, GM_THRESHOLDS.comebackDepthLen, GM_THRESHOLDS.comebackFinishLen)
            : false,
          // SECONDARY (seconds) — reporting only:
          finalBehindSec: finalBehindSec != null ? +finalBehindSec.toFixed(4) : null,
          maxBehindAfterChaosSec: +g.maxBehindSec.toFixed(4),
        };
      });
      const overFrac = gmDeadSeries.length
        ? gmDeadSeries.filter((x) => x > GM_THRESHOLDS.deadRaceGapLen).length / gmDeadSeries.length
        : 0;
      const frontOverFrac = gmFrontSeries.length
        ? gmFrontSeries.filter((x) => x > GM_THRESHOLDS.deadRaceGapLen).length / gmFrontSeries.length
        : 0;
      // Final-third distributions (lengths) — RAW material for the owner's calibration, per race. The
      // frontmost-gap fraction is emitted at BOTH 3 lengths (the owner's stated target) and the proposed
      // deadGap, so no single threshold is baked in. NOT a pass/fail.
      const fracOver = (arr, t) => (arr.length ? arr.filter((x) => x > t).length / arr.length : 0);
      const pctSummary = (arr) => ({
        p50: +percentile(arr, 0.5).toFixed(4), p75: +percentile(arr, 0.75).toFixed(4),
        p90: +percentile(arr, 0.9).toFixed(4), max: arr.length ? +Math.max(...arr).toFixed(4) : 0,
      });
      results.gapMetrics = {
        lenScale: +govLenScale.toFixed(4), meanBodyLenPx: +govMeanBodyLen.toFixed(3), pathLengthPx: +pathLengthPx.toFixed(1),
        // PRIMARY at-the-line (lengths, at the leader-finish instant):
        leaderGapToP2LineLen: lineLen.leaderGapToP2Len ?? null,
        top5SpreadLineLen: lineLen.top5SpreadLen ?? null,
        fieldMedianBehindLineLen: lineLen.fieldMedianBehindLen ?? null,
        fieldSpreadP10P90LineLen: lineLen.fieldSpreadP10P90Len ?? null,
        frontmostGapLineLen: lineLen.frontmostGapLen ?? null,
        frontmostGapLineNAhead: lineLen.frontmostGapNAhead ?? null,
        // deadRace (leader→P2) + frontmost-gap (lead-group) over the final third — lengths primary:
        deadRaceFlag: deadRaceFlag(gmDeadSeries, GM_THRESHOLDS.deadRaceGapLen, GM_THRESHOLDS.deadRaceMajorityFrac),
        deadRaceFinalThirdOverFrac: +overFrac.toFixed(4),
        frontGapFinalThirdOverFrac: +frontOverFrac.toFixed(4),
        // Final-third leader→P2 (deadRace) + frontmost-gap (lead-group) distributions, lengths:
        deadRaceFinalThird: pctSummary(gmDeadSeries),
        frontGapFinalThird: { ...pctSummary(gmFrontSeries), fracOver3: +fracOver(gmFrontSeries, 3).toFixed(4), fracOver5: +fracOver(gmFrontSeries, 5).toFixed(4) },
        // SECONDARY at-the-line (seconds):
        leaderGapToP2LineSec: +line.leaderGapToP2.toFixed(4),
        top5SpreadLineSec: +line.top5Spread.toFixed(4),
        checkpoints: gmCheckpoints,
        perRacer,
      };
    }

    // ── RUNAWAY-PARADE raw record — attached ONLY when --runaway-parade (else results unchanged) ──
    // The classifiers (sim/observers/runaway-parade.mjs) turn this into the two booleans downstream.
    if (runawayParade && rp) {
      const finalRankByIndex = {};
      for (const r of racers) finalRankByIndex[r.index] = r.finishRank;
      results.runawayParade = {
        lenScale:            +govLenScale.toFixed(4),
        leaderIdxAt090:      rp.leaderIdxAt090,
        // Infinity (lone survivor) is not JSON-representable → emit null (classifier treats it as "not clear").
        leaderGapP2At090Len: isFinite(rp.leaderGapP2At090Len) ? rp.leaderGapP2At090Len : null,
        within3P1At090:      rp.within3P1At090,
        minLeadFrom090Len:   isFinite(rp.minLeadFrom090Len) ? +rp.minLeadFrom090Len.toFixed(4) : null,
        line:                rp.line,            // { order, gaps } or null (race timed out before any finish)
        speed095ByIndex:     rp.speed095ByIndex, // { idx: speed } or null
        finalRankByIndex,
        // FORMATION diagnostic: firstCross15/30 + sustained flags, gapAt030/060, leaderIdxAtCross30.
        formation:           rp.formation.result(),
        // Release-sweep metrics: lead changes in [0.90, 1.0], and the rank snapshot at the LIVE
        // release point (null when the race never got there). releaseProgress is echoed so a
        // record is self-describing — the arm it came from is recoverable from the file alone.
        leadChangeCount:     rp.lateContest.result().leadChangeCount,
        releaseProgress:     CHOREO_RELEASE_PROGRESS,
        rankAtReleaseByIndex: rp.releaseRanks.result(),
        // Sustained-P1-battle primitives over [choreoResolveB2, first finish]. contestWindowStart is echoed
        // so a record is self-describing — the window it was measured in is recoverable from the
        // file alone. classifyFrontBattle() turns these into the REAL P1 ACTION boolean downstream.
        contestWindowStart:  CONTEST_WINDOW_START,
        frontBattle:         rp.frontBattle.result(),
        // ── C1 carousel telemetry (null-safe when the feature is off) ──────────────────────────
        // cast/reason/rejected answer "was it cast, and if not why"; handovers answer "did the servo
        // deliver what was authored"; saturation is the naturalness number the sweep kills on (>50%).
        carousel: racePlanController ? {
          diag:       racePlanController.getCarouselDiag(),
          handovers:  rp.carousel ? rp.carousel.result() : null,
          telemetry:  racePlanController.getCarouselTelemetry(),
        } : null,
      };
    }

    // ── SPEED-SOURCE record — attached ONLY when --speed-source (else results unchanged) ──
    if (speedSource && ss) {
      results.speedSource = { trajMax: SS_TRAJ_MAX, natCeil: +NAT_CEIL.toFixed(6), samples: ss.samples };
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
        // NEW (pulk-contest observer): PULK-window front action + density.
        distinctP1Pulk:    amP1Steps ? amP1Steps.size : 0,          // distinct P1 holders over the window (b)
        leadChangesPulk:   amLeadChanges,                           // raw P1 hand-over count over the window (a)
        heldTop5Overtakes: amHeld ? amHeld.count : 0,               // REAL top-5 overtakes (hold-filtered ≥750ms)
        maxLinkGapLenP90:  amLinkGaps.length ? +percentile(amLinkGaps, 0.9).toFixed(3) : 0, // density p90 (lengths)
        maxLinkGapLenMax:  amLinkGaps.length ? +Math.max(...amLinkGaps).toFixed(3) : 0,      // density max (lengths)
        // NEW (PULK-window baseline): the window bound + the owner's three direct answers.
        windowFromStart:   ACTION_FROM_START,                       // true ⇒ window = [0, pulkEnd)
        gapThresholdLen:   GAP_THRESHOLD_LENGTHS,                    // the "3 racer lengths" threshold (single source)
        framesOver3LShare: amLinkGaps.length ? +framesOverThresholdShare(amLinkGaps).toFixed(4) : 0, // Q1: how OFTEN a gap > 3L
        p1MaxHoldShare:    amFrames > 0 && amP1Steps.size ? +(Math.max(...amP1Steps.values()) / amFrames).toFixed(4) : 0, // Q2: most-dominant leader's hold
        fullSpreadLenP90:  amFullSpread.length ? +percentile(amFullSpread, 0.9).toFixed(3) : 0, // Q3b: leader→last p90 (lengths)
        fullSpreadLenMax:  amFullSpread.length ? +Math.max(...amFullSpread).toFixed(3) : 0,     // Q3b: leader→last max (lengths)
        endFullSpreadLen:   +amEndFullSpread.toFixed(3),    // leader→last spread at the LAST PULK frame (end-of-PULK snapshot)
        endSpreadP10P90Len: +amEndSpreadP10P90.toFixed(3),  // p10→p90 spread at the LAST PULK frame (end-of-PULK snapshot)
        // RUNAWAY-LEADER (--runaway-leader): pulkStart + pulkEnd leader snapshots (identity/isHero/
        // lead-over-P2 in lengths) + did the SAME racer still lead at pulkEnd. Null when the flag is off.
        runawayLargeLen:   RUNAWAY_LEADER ? RUNAWAY_LARGE_LENGTHS : null, // the LARGE threshold (single source)
        runawayStart:      rlStartSnap,
        runawayEnd:        rlEndSnap,
        runawaySameLeader: rlStartSnap && rlEndSnap ? rlStartSnap.leaderIndex === rlEndSnap.leaderIndex : null,
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

// ── Statistics + fairness stats: MOVED (INFRA STEP 1, PURE MOVE) to
//    scripts/sim/observers/fairness-stats.mjs. Imported at the top of this file and
//    re-exported below to preserve the public API. runFairnessSelfCheck stays here.
export { computeFairnessStats, computeZoneSuccessRate, bandIntegrityOK, computeExtendedFairnessStats };

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
// chiSqPValue + normalCDF: MOVED to scripts/sim/observers/fairness-stats.mjs (PURE MOVE).

// ── Report generation: MOVED (INFRA STEP 1, PURE MOVE) to
//    scripts/sim/observers/report.mjs. buildReport/printDiagnosticReport/printComebackReport
//    are imported at the top of this file. buildReport receives nRaces/nRacers/worldStamp/
//    rowLayoutConfig as arguments (formerly module globals).


// ── Main ──────────────────────────────────────────────────────────────────────
const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('sim-fairness.mjs') ||
   process.argv[1].replace(/\\/g, '/').endsWith('scripts/sim-fairness.mjs'));

if (isMain) {
  if (SELFCHECK) { runFairnessSelfCheck(); process.exit(0); }
  // ── Stage 0: world banner — every run says, up front, whether it describes the owner's world ──
  if (WORLD) {
    console.log('══════════════════════════════════════════════════════════════════════════════');
    console.log(`  WORLD CONFIG HONOURED — world: ${WORLD_STAMP.worldHash}  (schema v${WORLD_STAMP.schemaVersion})`);
    console.log('  Honoured from --config: raceDynamicsConfig, raceBehaviorConfig, rowLayoutConfig,');
    console.log('    baseSpeedConfig, autoScaleConfig. Not simulated (rendering): frameTiming, camera.');
    console.log('══════════════════════════════════════════════════════════════════════════════');
  } else {
    console.log('══════════════════════════════════════════════════════════════════════════════');
    console.log('  ⚠️  ASSUMED-DEFAULTS — no --config given. This run uses the SHIPPED defaults, NOT');
    console.log('     the owner\'s browser world. Every result is stamped PROVISIONAL. It describes the');
    console.log('     owner\'s race ONLY if his browser is at defaults (which has repeatedly not held).');
    console.log('     Export the browser world and pass --config=world.json to remove this warning.');
    console.log('══════════════════════════════════════════════════════════════════════════════');
  }
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
  // The sim's t-update chain is:
  //   t += baseSpeed·boost·brake·rowEnvMult·trajectoryMult·areaBonusMult·governorMult·(DT/16)
  // factor-for-factor identical to the browser's (index.jsx) modulo (DT/16)=1.0. See docs/FORCE-PARITY.md.
  if (ACTION !== null) {
    console.log(`Action axis            : action=${ACTION.toFixed(3)} → empty stub (no couplings; Stage-5b re-targets to the rotation strengths)`);
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
              // areaBonus phase-split (INFRA 5A): threaded into the plan so the shared controller
              // applies the rescale from ONE source (browser + sim), from the shipped dynamics config.
              phaseSplitBonusEnabled:  PHASE_SPLIT_BONUS_ENABLED,
              areaBonusEarly:          AREA_BONUS_EARLY,
              areaBonusPulk:           AREA_BONUS_PULK,
              areaBonusPost:           AREA_BONUS_POST,
              pulkStart:               RP_PULK_START,
              bonusTransitionEnd:      RP_BONUS_TRANSITION_END,
              bonusFadeDuration:       RP_BONUS_FADE_MS,
              corridorStart:           RP_CORRIDOR_START,
              corridorEnd:             RP_CORRIDOR_END,
              pulkBiasGain:            RP_PULK_BIAS_GAIN,
              choreoSuppressChaosBonusB1: CHOREO_SUPPRESS_CHAOS_BONUS_B1,
              choreoIntensity:     CHOREO_INTENSITY,
              choreoPackBandStrictness: CHOREO_PACK_BAND_STRICTNESS,
              choreoReleaseProgress: CHOREO_RELEASE_PROGRESS,
              choreoResolveB2:     CHOREO_RESOLVE_B2,
              choreoResolveB3:     CHOREO_RESOLVE_B3,
              choreoResolveB4:     CHOREO_RESOLVE_B4,
              choreoResolveB5:     CHOREO_RESOLVE_B5,
              choreoOutcomeStart:  CHOREO_OUTCOME_START,
              packReleaseEnabled:  PACK_RELEASE_ENABLED,
              packReSteerThreshold: PACK_RESTEER_THRESHOLD,
              b2AttackHeroes:      B2_ATTACK_HEROES,
              b2AttackPeakRank:    B2_ATTACK_PEAK_RANK,
              b2AttackFinalRank:   B2_ATTACK_FINAL_RANK,
              b2AttackProgress:    { start: B2_ATTACK_PROGRESS_START, end: B2_ATTACK_PROGRESS_END },
              b2AttackResolveProgress: B2_ATTACK_RESOLVE_PROGRESS,
              b2AttackBandArrival: B2_ATTACK_BAND_ARRIVAL,
              universalBandArrival: UNIVERSAL_BAND_ARRIVAL,
              // Front distance leash (SIM-ONLY): null when the flag is absent → controller leash off.
              frontLeashMaxLengths: FRONT_LEASH_MAX_LEN,
              frontLeashGainPct:    FRONT_LEASH_GAIN_PCT,
              // Gap-cap re-roll bias (SIM-ONLY): null threshold → transform passthrough. The window
              // derivation reads reRollLastPositionPercent + reRollTransitionDuration (shipped dynamics).
              gapRerollThresholdLengths: GAP_REROLL_THRESH_LEN,
              gapRerollMode:             GAP_REROLL_MODE ?? undefined,
              gapRerollStrength:         GAP_REROLL_STRENGTH ?? undefined,
              // Window END is derived from the harness's own lastRollDeadline (passed per-frame to the
              // transform); only the transition duration is needed in the plan.
              reRollTransitionDuration:  DYNAMICS_OVERRIDES.reRollTransitionDuration,
              // Front act window + carousel (C1). trajectoryTransitionDuration is threaded so the
              // plan can DERIVE the minimum authored dwell from the servo's own slew.
              contestWindowStart:        CONTEST_WINDOW_START,
              carouselEnabled:           CAROUSEL_ENABLED,
              carouselMinParticipants:   CAROUSEL_MIN_PARTICIPANTS,
              carouselAmplitudeRanks:    CAROUSEL_AMPLITUDE_RANKS,
              carouselJitterPct:         CAROUSEL_JITTER_PCT,
              carouselRoleBiasStrength:  CAROUSEL_ROLE_BIAS_STRENGTH,
              trajectoryTransitionDuration: DYNAMICS_OVERRIDES.trajectoryTransitionDuration,
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
            heroMap:            HERO_MAP,
            gapMetrics:         GAP_METRICS,
            runawayParade:      RUNAWAY_PARADE,
            speedSource:        SPEED_SOURCE,
          });
          // HERO-MAP (--hero-map): stash this race's per-hero observations, tagged with combo meta.
          if (HERO_MAP && result.heroObs) {
            heroMapRaces.push({ trackId, racerType, durationSec, seed, raceIdx, isOpen, heroObs: result.heroObs });
          }
          // GAP-METRICS (--gap-metrics): stash this race's gap-space observations, tagged with combo meta.
          if (GAP_METRICS && result.gapMetrics) {
            gmRaces.push({ trackId, racerType, durationSec, seed, raceIdx, isOpen, gapMetrics: result.gapMetrics });
          }
          // RUNAWAY-PARADE (--runaway-parade): stash this race's raw record, tagged with combo meta.
          if (RUNAWAY_PARADE && result.runawayParade) {
            rpRaces.push({ trackId, racerType, durationSec, seed, raceIdx, isOpen, runawayParade: result.runawayParade });
          }
          // SPEED-SOURCE (--speed-source): stash this race's top-15 decomposition, tagged with combo meta.
          if (SPEED_SOURCE && result.speedSource) {
            ssRaces.push({ trackId, racerType, durationSec, seed, raceIdx, isOpen, speedSource: result.speedSource });
          }
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
              // B2-leak trace field: only added under --b2-trace, so no-flag rawData stays byte-identical.
              ...(B2_TRACE ? { b2LastInside: result.b2LastInside?.get(r.racerIndex) ?? -1 } : {}),
              ...r,
            });
          }
        }

        const stats = computeFairnessStats(raceResults, totalRows, rowSizes);
        const avgMixingQuota = mixingQuotas.length > 0
          ? mixingQuotas.reduce((s, v) => s + v, 0) / mixingQuotas.length
          : null;
        // Aggregate naturalness metrics over all races in this combo
        // Pack-release OUTCOME rank-change: keep mean AND std across races (the spec asks for both).
        const _ocTop5  = raceResults.map((r) => r.naturalness?.outcomeTop5Swaps ?? 0);
        const _ocTotal = raceResults.map((r) => r.naturalness?.outcomeTotalSwaps ?? 0);
        const _amean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
        const _astd  = (a) => { if (a.length < 2) return 0; const m = _amean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); };
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
          // Pack-release experiment: OUTCOME rank-change (mean+std) + servo release diagnostics.
          outcomeTop5SwapsMean:   _amean(_ocTop5),
          outcomeTop5SwapsStd:    _astd(_ocTop5),
          outcomeTotalSwapsMean:  _amean(_ocTotal),
          outcomeTotalSwapsStd:   _astd(_ocTotal),
          packReleaseEvents:      raceResults.reduce((s, r) => s + (r.naturalness?.packReleaseEvents ?? 0), 0) / raceResults.length,
          packReSteerEvents:      raceResults.reduce((s, r) => s + (r.naturalness?.packReSteerEvents ?? 0), 0) / raceResults.length,
          packReleasedFrameFraction: raceResults.reduce((s, r) => s + (r.naturalness?.packReleasedFrameFraction ?? 0), 0) / raceResults.length,
          // B2-attacker: per-race means of cast count / peak-reached count / freed (completed) count.
          attackerCast:           raceResults.reduce((s, r) => s + (r.naturalness?.attackerCast ?? 0), 0) / raceResults.length,
          attackerPeakReached:    raceResults.reduce((s, r) => s + (r.naturalness?.attackerPeakReached ?? 0), 0) / raceResults.length,
          attackerFreed:          raceResults.reduce((s, r) => s + (r.naturalness?.attackerFreed ?? 0), 0) / raceResults.length,
          // Front-leash diagnostic: per-race mean of frames the leader brake was applied (0 when OFF).
          leashFrames:            raceResults.reduce((s, r) => s + (r.naturalness?.leashFrames ?? 0), 0) / raceResults.length,
          // Gap-cap re-roll diagnostics (0 when OFF): mean biased rolls/race + mean leader duty-cycle.
          gapBiasedRolls:         raceResults.reduce((s, r) => s + (r.naturalness?.gapBiasedRolls ?? 0), 0) / raceResults.length,
          gapWindowRolls:         raceResults.reduce((s, r) => s + (r.naturalness?.gapWindowRolls ?? 0), 0) / raceResults.length,
          gapLeaderDutyCycle:     raceResults.reduce((s, r) => s + (r.naturalness?.gapLeaderDutyCycle ?? 0), 0) / raceResults.length,
          // Branch-fire split (small-G chase-suppression diagnostic). SUMS across the run, not means —
          // gapDownAheadGtBehind is a raw event count and must stay countable.
          gapDownTilts:           raceResults.reduce((s, r) => s + (r.naturalness?.gapDownTilts ?? 0), 0),
          gapUpTilts:             raceResults.reduce((s, r) => s + (r.naturalness?.gapUpTilts ?? 0), 0),
          gapDownAheadGtBehind:   raceResults.reduce((s, r) => s + (r.naturalness?.gapDownAheadGtBehind ?? 0), 0),
          gapDownLeader:          raceResults.reduce((s, r) => s + (r.naturalness?.gapDownLeader ?? 0), 0),
          gapDownChaser:          raceResults.reduce((s, r) => s + (r.naturalness?.gapDownChaser ?? 0), 0),
          gapDownPack:            raceResults.reduce((s, r) => s + (r.naturalness?.gapDownPack ?? 0), 0),
          gapDownGapAheadMean:    _amean(raceResults.map((r) => r.naturalness?.gapDownGapAheadMean ?? 0).filter((v) => v > 0)),
          gapDownGapBehindMean:   _amean(raceResults.map((r) => r.naturalness?.gapDownGapBehindMean ?? 0).filter((v) => v > 0)),
          overlapRate:             raceResults.reduce((s, r) => s + (r.liteOverlapRate ?? 0), 0) / raceResults.length,
          honestOverlapRate:       raceResults.reduce((s, r) => s + (r.honestOverlapRate ?? 0), 0) / raceResults.length,
          passThroughCount:        raceResults.reduce((s, r) => s + (r.passThroughCount ?? 0), 0) / raceResults.length,
          // Lapping instrumentation (closed tracks):
          maxRealSpreadMean:       raceResults.reduce((s, r) => s + (r.maxRealSpread ?? 0), 0) / raceResults.length,
          maxRealSpreadMax:        Math.max(...raceResults.map((r) => r.maxRealSpread ?? 0)),
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
            pulkBiasGain: RP_PULK_BIAS_GAIN,
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

  // Write JSON + Markdown report — skipped under --skip-main-output (a batch runner reads only hero-map.json).
  if (!SKIP_MAIN_OUTPUT) {
    const jsonPath = join(OUT_DIR, 'fairness-data.json');
    writeFileSync(jsonPath, JSON.stringify({ meta: { world: WORLD_STAMP, nRaces: N_RACES, nRacers: N_RACERS, durationVariants: DURATION_VARIANTS, ...(ACTION !== null ? { action: ACTION, directorKnobs: { ...ACTION_KNOBS } } : {}) }, results: allResults, rawData }, null, 2));
    console.log(`JSON → ${jsonPath}`);
    const runDate = new Date().toISOString().slice(0, 10);
    const report  = buildReport(allResults, rawData, runDate, N_RACES, N_RACERS, WORLD_STAMP, DEFAULT_ROW_LAYOUT_CONFIG);
    const mdPath  = join(OUT_DIR, 'fairness-report.md');
    writeFileSync(mdPath, report);
    console.log(`Bericht → ${mdPath}`);
  }

  // ── HERO-MAP output (--hero-map; NIGHT-SWEEP TIER-1) ────────────────────────
  // Writes <out>/hero-map.json: the fairness control column (band-reach + start-row Holm flag,
  // computed with the same definitions the report uses / the in-file validated functions) plus the
  // aggregated per-hero climb-feasibility signals. Self-contained; only runs when the flag is on.
  if (HERO_MAP) {
    // Band-reach OVERALL — identical definition to the report's OVERALL row (rawData, sollBereich).
    const zoneIdxOf = (rank) => {
      for (let i = 0; i < BAND_EDGES.length; i++) if (rank <= BAND_EDGES[i]) return i;
      return BAND_EDGES.length;
    };
    const zr = rawData.filter((r) => r.sollBereich != null);
    const bandReach = zr.length ? zr.filter((r) => zoneIdxOf(r.finalRank) === (r.sollBereich - 1)).length / zr.length : null;
    // Start-row fairness (Holm) via the validated in-file function over this run's rawData.
    const byRace = new Map();
    for (const r of rawData) { if (!byRace.has(r.raceIdx)) byRace.set(r.raceIdx, []); byRace.get(r.raceIdx).push(r); }
    const race0 = [...byRace.values()][0] ?? [];
    const rowSizeMap = new Map();
    for (const r of race0) rowSizeMap.set(r.startRowIndex, (rowSizeMap.get(r.startRowIndex) ?? 0) + 1);
    const totalRows = rowSizeMap.size ? Math.max(...rowSizeMap.keys()) + 1 : 0;
    const rowSizes = Array.from({ length: totalRows }, (_, i) => rowSizeMap.get(i) ?? 0);
    let startRowUnfair = null, startRowMinPHolm = null;
    try {
      const entries = rawData.map((r) => ({ ...r, raceKey: r.raceIdx, targetBandIdx: r.sollBereich != null ? r.sollBereich - 1 : null }));
      const ext = computeExtendedFairnessStats(entries, rowSizes, { nPerm: 299, prng: makePRNG(((GLOBAL_SEED || 1) * 131 + 7) >>> 0) });
      startRowUnfair = ext.anyConfirmatoryFlagged ?? null;
      if (Array.isArray(ext.confirmatory) && ext.confirmatory.length) {
        startRowMinPHolm = +Math.min(...ext.confirmatory.map((c) => c.pHolm ?? 1)).toFixed(4);
      }
    } catch (e) { console.log(`[hero-map] start-row fairness failed: ${e.message}`); }
    // NATIVE per-row WINS chi-square + per-row win distribution (uncontaminated: hero-map runs plain
    // choreo, nothing injected). This is the BINDING win-bias gate for GAP-2.
    const totalRacersHM = rowSizes.reduce((s, v) => s + v, 0);
    const nRacesHM = byRace.size;
    const winsByRowHM = new Array(totalRows).fill(0);
    for (const rows of byRace.values()) { const w = rows.reduce((b, r) => (r.finalRank < b.finalRank ? r : b)); if (w.startRowIndex < totalRows) winsByRowHM[w.startRowIndex]++; }
    const expWinsHM = rowSizes.map((s) => nRacesHM * s / totalRacersHM);
    let chiSqHM = 0; for (let i = 0; i < totalRows; i++) if (expWinsHM[i] > 0) chiSqHM += (winsByRowHM[i] - expWinsHM[i]) ** 2 / expWinsHM[i];
    const nativeWinP = chiSqPValue(chiSqHM, Math.max(1, totalRows - 1));
    const perRowWins = winsByRowHM.map((w, i) => ({ row: i, wins: w, winRate: +(w / nRacesHM).toFixed(4), expRate: +(rowSizes[i] / totalRacersHM).toFixed(4), n: rowSizes[i] }));
    // Aggregate hero observations across all races.
    const allH  = heroMapRaces.flatMap((rr) => rr.heroObs);
    const num   = (v) => typeof v === 'number' && isFinite(v);
    const mean  = (arr) => (arr.length ? +(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(4) : null);
    const rate  = (arr) => (arr.length ? +(arr.filter(Boolean).length / arr.length).toFixed(4) : null);
    const short = allH.filter((h) => h.reachedTargetBand === false); // heroes that fell short of band
    const heroAgg = {
      nHeroRows: allH.length,
      nRaces: heroMapRaces.length,
      heroesPerRace: heroMapRaces.length ? +(allH.length / heroMapRaces.length).toFixed(3) : null,
      anchorRankMean:        mean(allH.map((h) => h.anchorRank).filter(num)),
      finalRankMean:         mean(allH.map((h) => h.finalRank).filter(num)),
      placesGainedNetMean:   mean(allH.map((h) => h.placesGainedNet).filter(num)),
      realOvertakesMean:     mean(allH.map((h) => h.realOvertakes).filter(num)),
      bestRankMean:          mean(allH.map((h) => h.bestRank).filter(num)),
      reachedTargetBandRate: rate(allH.map((h) => h.reachedTargetBand).filter((v) => v !== null)),
      reachedFrontRate:      rate(allH.map((h) => h.reachedFrontProg != null)),
      reachedFrontProgMean:  mean(allH.map((h) => h.reachedFrontProg).filter(num)),
      reachedTargetProgMean: mean(allH.map((h) => h.reachedTargetProg).filter(num)),
      ceilFracMean:          mean(allH.map((h) => h.ceilFrac).filter(num)),
      trafficFracMean:       mean(allH.map((h) => h.trafficFrac).filter(num)),
      bothFracMean:          mean(allH.map((h) => h.bothFrac).filter(num)),
      maxTrajMean:           mean(allH.map((h) => h.maxTraj).filter(num)),
      shortfallRate:         rate(allH.map((h) => h.reachedTargetBand === false)),
      // Of the heroes that fell short: which wall dominated (ceil frac ≥ traffic frac → SPEED wall).
      speedWallShare:        short.length ? +(short.filter((h) => h.ceilFrac >= h.trafficFrac).length / short.length).toFixed(4) : null,
      trafficWallShare:      short.length ? +(short.filter((h) => h.trafficFrac > h.ceilFrac).length / short.length).toFixed(4) : null,
    };
    const heroMapPath = join(OUT_DIR, 'hero-map.json');
    writeFileSync(heroMapPath, JSON.stringify({
      meta: {
        world: WORLD_STAMP,
        track: TRACK_FILTER, racer: RACER_FILTER, dur: DUR_FILTER, races: N_RACES, seed: GLOBAL_SEED,
        choreoIntensity: CHOREO_INTENSITY,
        choreoOutcomeStart: CHOREO_OUTCOME_START, choreoReleaseProgress: CHOREO_RELEASE_PROGRESS,
        choreoPackBandStrictness: CHOREO_PACK_BAND_STRICTNESS, bonusMult: BONUS_MULT,
        pulkBiasGain: RP_PULK_BIAS_GAIN,
        baseSpeedMin: BASE_SPEED_MIN_OVR, baseSpeedMax: BASE_SPEED_MAX_OVR,
      },
      fairness: { bandReach, startRowUnfair, startRowMinPHolm,
        nativeWinChiSqP: +nativeWinP.toFixed(4), nativeWinUnfair: nativeWinP < 0.05, perRowWins },
      heroAgg,
      perHero: allH,
    }, null, 2));
    console.log(`[hero-map] → ${heroMapPath} | bandReach=${bandReach != null ? (bandReach * 100).toFixed(1) + '%' : 'n/a'} startRowUnfair=${startRowUnfair} realOvertakes=${heroAgg.realOvertakesMean ?? 'n/a'} netGain=${heroAgg.placesGainedNetMean ?? 'n/a'} heroes/race=${heroAgg.heroesPerRace ?? 'n/a'} shortfall=${heroAgg.shortfallRate ?? 'n/a'}`);
  }


  // ── Comeback-reality output (--comeback-reality; requires --hero-map) ───────
  // Reuses this run's heroMapRaces (per-race hero observations). Groups by track, writes one
  // comeback-<trackId>.json per track into results/comeback-reality-sweep-<date>/ (accumulates across
  // per-track invocations), then re-aggregates ALL comeback-*.json there into report.md + detail.json.
  if (COMEBACK_REALITY) {
    if (!HERO_MAP) {
      console.warn('[comeback-reality] requires --hero-map (no hero observations collected) — skipping.');
    } else {
      const byTrack = new Map();
      for (const rr of heroMapRaces) {
        if (!byTrack.has(rr.trackId)) byTrack.set(rr.trackId, []);
        byTrack.get(rr.trackId).push(rr);
      }
      const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (stable across a same-day sweep)
      const cbDir = join(ROOT, 'results', `comeback-reality-sweep-${date}`);
      mkdirSync(cbDir, { recursive: true });
      for (const [trackId, races] of byTrack) {
        const isOpen = races[0]?.isOpen ?? null;
        const rep = perTrackReport(trackId, isOpen, races);
        writeFileSync(join(cbDir, `comeback-${trackId}.json`), JSON.stringify({ ...rep, _races: races }, null, 2));
      }
      // Re-aggregate every per-track file in the dir (open first, then track id).
      const perTrack = readdirSync(cbDir)
        .filter((f) => f.startsWith('comeback-') && f.endsWith('.json'))
        .map((f) => JSON.parse(readFileSync(join(cbDir, f), 'utf8')))
        .sort((a, b) => (a.isOpen === b.isOpen ? a.trackId.localeCompare(b.trackId) : a.isOpen ? -1 : 1));
      const meta = { date, seed: GLOBAL_SEED, racesPerTrack: N_RACES, racer: RACER_FILTER, dur: DUR_FILTER, world: WORLD_STAMP?.worldHash ?? 'unknown' };
      writeFileSync(join(cbDir, 'report.md'), renderComebackMarkdown(perTrack, meta));
      writeFileSync(join(cbDir, 'detail.json'), JSON.stringify({ meta, perTrack: perTrack.map(({ _races, ...t }) => t) }, null, 2));
      console.log(`[comeback-reality] → ${cbDir} | tracks=${perTrack.length}`);
    }
  }

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
        areaSplit: { enabled: PHASE_SPLIT_BONUS_ENABLED, early: AREA_BONUS_EARLY, pulk: AREA_BONUS_PULK, post: AREA_BONUS_POST, refStrength: BONUS_MULT },
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
        reRollVariationPercent: DYNAMICS_OVERRIDES.reRollVariationPercent,
        areaSplit: { enabled: PHASE_SPLIT_BONUS_ENABLED, early: AREA_BONUS_EARLY, pulk: AREA_BONUS_PULK, post: AREA_BONUS_POST },
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

  // ── GAP-METRICS raw output (--gap-metrics) → results/gap-metrics/ (gitignored) ──
  // INFRA 5C. RAW gap-space distributions ONLY — the proposed X/Y/Z thresholds AWAIT the owner's
  // calibration against a race he watches, so the deadRaceFlag / visibleComeback booleans here are
  // provisional, never a pass/fail gate. A no-flag run writes nothing and is byte-identical.
  if (GAP_METRICS) {
    const gmDir = join(ROOT, 'results', 'gap-metrics');
    mkdirSync(gmDir, { recursive: true });
    const gmPath = join(gmDir, `gm-${DIAG_LABEL}.json`);
    writeFileSync(gmPath, JSON.stringify({
      meta: {
        label: DIAG_LABEL, nRaces: N_RACES, seed: GLOBAL_SEED,
        note: 'GAP-SPACE observers (INFRA 5C). RAW distributions only. X/Y/Z are PROPOSALS awaiting owner calibration.',
        proposedThresholds: GM_THRESHOLDS,
      },
      races: gmRaces,
    }, null, 2));
    console.log(`\n=== Gap-Metrics (${DIAG_LABEL}) ===  → ${gmPath}  (${gmRaces.length} races)`);
    console.log(`  ⚠ RAW distributions in RACER LENGTHS (primary) — proposed X=${GM_THRESHOLDS.inContentionLen}L Y=${GM_THRESHOLDS.comebackDepthLen}L Z=${GM_THRESHOLDS.comebackFinishLen}L deadGap=${GM_THRESHOLDS.deadRaceGapLen}L AWAIT owner calibration; booleans provisional.`);
    // Terse per-race headline (lengths): leader→P2, frontmost front gap (n ahead), deadRace over-fraction.
    for (const gr of gmRaces.slice(0, 12)) {
      const g = gr.gapMetrics;
      const comebacks = g.perRacer.filter((p) => p.visibleComeback).length;
      console.log(
        `  ${String(gr.trackId).padEnd(16)} (${gr.isOpen ? 'open  ' : 'closed'}) r${gr.raceIdx}  ` +
        `line[P1→P2=${(g.leaderGapToP2LineLen ?? 0).toFixed(2)}L front=${(g.frontmostGapLineLen ?? 0).toFixed(2)}L/${g.frontmostGapLineNAhead ?? 0}ahead]  ` +
        `dead=${g.deadRaceFlag ? 'YES' : 'no '}(${(g.deadRaceFinalThirdOverFrac * 100).toFixed(0)}%) frontOver=${(g.frontGapFinalThirdOverFrac * 100).toFixed(0)}%  comebacks=${comebacks}`
      );
    }
  }

  // ── RUNAWAY-PARADE raw output (--runaway-parade) → OUT_DIR/runaway-parade.json ──
  // RAW per-race records only (the two booleans are derived downstream by the classifier module, so the
  // definitions stay in ONE place). A no-flag run writes nothing and is byte-identical.
  if (RUNAWAY_PARADE) {
    const rpPath = join(OUT_DIR, 'runaway-parade.json');
    writeFileSync(rpPath, JSON.stringify({
      meta: {
        label: DIAG_LABEL, nRaces: N_RACES, seed: GLOBAL_SEED,
        note: 'RUNAWAY-WINNER & PARADE-FINISH raw per-race records (read-only baseline measurement). '
            + 'Booleans derived by scripts/sim/observers/runaway-parade.mjs classifyRace().',
        thresholds: RUNAWAY_PARADE_DEFAULTS,
      },
      races: rpRaces,
    }, null, 2));
    console.log(`\n=== Runaway/Parade (${DIAG_LABEL}) ===  → ${rpPath}  (${rpRaces.length} races)`);
  }

  // ── SPEED-SOURCE raw output (--speed-source) → OUT_DIR/speed-source.json ──
  // RAW per-race top-15 decompositions at samples 0.70..0.95. A no-flag run writes nothing.
  if (SPEED_SOURCE) {
    const ssPath = join(OUT_DIR, 'speed-source.json');
    writeFileSync(ssPath, JSON.stringify({
      meta: {
        label: DIAG_LABEL, nRaces: N_RACES, seed: GLOBAL_SEED, samples: SPEED_SOURCE_SAMPLES,
        note: 'Top-15 late-race speed decomposition (read-only). Factor chain: baseSpeed·boost·brake·'
            + 'rowEnvMult(=rowBonusPost)·trajectoryMult·areaBonusMult(=areaBonusPost)·governorMult. '
            + 'product == effSpeed unless finishClamp. Only per-factor ceilings (no single speed clamp).',
      },
      races: ssRaces,
    }, null, 2));
    console.log(`\n=== Speed-Source (${DIAG_LABEL}) ===  → ${ssPath}  (${ssRaces.length} races)`);
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
