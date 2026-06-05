// ============================================================
// File:        diag-comeback-overlap.mjs
// Path:        scripts/diag-comeback-overlap.mjs
// Project:     RaceArena
// Purpose:     Diagnostic — why does a comeback racer pass through others
//              during an honest-overlap overtaking event?
//
//              Runs Space Sprint × dragon, 60 racers, 60 s, 1 race.
//              For every honest-overlap pair-frame (after 4 s warmup):
//                - logs avoidanceActive status of both racers
//                - logs rubberBandMult (brake-vs-boost comparison)
//                - logs net speed factor (brake × rubberBand)
//              Also segments by "comeback" status (far-below-average t).
// ============================================================

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');

import { EditorShape } from '../client/src/modules/track-editor/EditorShape.js';
import { applyRacerBehavior, initRacerBehavior } from '../client/src/modules/raceBehavior.js';
import {
  computeEvenRowLayout, computeRacerLayout, computeRowPhysicalY, computeSpeedBonus,
} from '../client/src/modules/rowLayout.js';
import {
  REFERENCE_FPS, computeSpeedScaleFactor,
} from '../client/src/modules/camera/lapUtils.js';
import {
  DEFAULT_BASE_SPEED_CONFIG, DEFAULT_RACE_BEHAVIOR_CONFIG,
  DEFAULT_RACE_DYNAMICS_CONFIG, DEFAULT_ROW_LAYOUT_CONFIG,
} from '../client/src/modules/storage/defaults.js';
import { computeEffectiveBrakeFactor } from '../client/src/modules/raceBehaviorConfig.js';
import { DEFAULT_AUTO_SCALE_CONFIG } from '../client/src/modules/autoSpriteScale.js';

// ── Config ────────────────────────────────────────────────────────────────────
const N_RACERS     = 60;
const DUR_SEC      = 60;
const SEED         = 1;
const DT           = 16;              // fixed physics step ms
const WARMUP_MS    = 4000;            // skip first 4 s for warmup
const RB_FLAT_BOOST     = 0.10;
const RB_GAP_THRESHOLD  = 0.003;
const RB_RAMP_MS        = 2000;
// "comeback" = racer whose t is more than COMEBACK_T_THRESHOLD below mean t
const COMEBACK_T_THRESHOLD = 0.04;   // ~4% behind mean; tunable

// ── PRNG ─────────────────────────────────────────────────────────────────────
function makePRNG(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
}

// ── Load track ────────────────────────────────────────────────────────────────
const trackRaw = JSON.parse(readFileSync(join(ROOT, 'server/data/tracks/space-sprint.json'), 'utf8'));
const shape    = new EditorShape(trackRaw);
const pathLengthPx       = shape.pathLength ?? trackRaw.pathLengthPx;
const geometricTrackWidth = trackRaw.width ?? 300;
const isOpen  = !trackRaw.closed;
console.log(`Track: ${trackRaw.name}  open=${isOpen}  path=${Math.round(pathLengthPx)}px  width=${geometricTrackWidth}px`);

// ── Racer type (dragon) ───────────────────────────────────────────────────────
const RACER = { speedMultiplier: 1.10, displaySize: 50, bodyFillX: 0.836, bodyFillY: 0.898 };

// ── Behavior config (probe default: lateralForce=0.0228) ─────────────────────
const behaviorConfig = {
  ...DEFAULT_RACE_BEHAVIOR_CONFIG,
  // Use the current probe value from defaults.js (no override needed — it's already set)
};
const rowConfig      = { ...DEFAULT_ROW_LAYOUT_CONFIG };
const dynamicsConfig = { ...DEFAULT_RACE_DYNAMICS_CONFIG };

// ── Speed calibration — mirrors sim-fairness.mjs / index.jsx exactly ─────────
const { min: BS_MIN, max: BS_MAX } = DEFAULT_BASE_SPEED_CONFIG;
const BS_MEAN = (BS_MIN + BS_MAX) / 2;
const spreadMinFactor = BS_MIN / BS_MEAN;
const spreadMaxFactor = BS_MAX / BS_MEAN;
const ssf          = computeSpeedScaleFactor(pathLengthPx);  // ~9.886 for space-sprint
const expectedMinSF = spreadMinFactor + (spreadMaxFactor - spreadMinFactor) / (N_RACERS + 1);
// finishT: sim-fairness computes trackNaturalBase = BASE_SPEED_MEAN / ssf, then
// finishT = min(trackNaturalBase * speedMultiplier * REFERENCE_FPS * DUR_SEC, 0.95)
const trackNaturalBase = BS_MEAN / ssf;
const finishT = Math.min(trackNaturalBase * RACER.speedMultiplier * REFERENCE_FPS * DUR_SEC, 0.95);
const race_baseSpeed = finishT / (REFERENCE_FPS * DUR_SEC * expectedMinSF * RACER.speedMultiplier);

// ── Row layout ────────────────────────────────────────────────────────────────
const effectiveWidth = geometricTrackWidth * behaviorConfig.startSpreadRange;
const { spriteSize: effectiveDisplaySize, rowCount } =
  computeRacerLayout(effectiveWidth, N_RACERS, RACER.displaySize, DEFAULT_AUTO_SCALE_CONFIG);
const rowGapPx   = effectiveDisplaySize * rowConfig.rowGapMultiplier;
const deltaT     = rowGapPx / pathLengthPx;
const rowLayout  = computeEvenRowLayout(N_RACERS, rowCount);
const rowSizeByRow = new Map();
for (const a of rowLayout.assignments) rowSizeByRow.set(a.rowIndex, (rowSizeByRow.get(a.rowIndex) ?? 0) + 1);
const assignmentByRacer = new Map(rowLayout.assignments.map((a) => [a.racerIndex, a]));

console.log(`effectiveDisplaySize=${effectiveDisplaySize}px  rows=${rowCount}  finishT=${finishT.toFixed(4)}`);
console.log(`honestBodyLong=${(effectiveDisplaySize * RACER.bodyFillY).toFixed(1)}px  honestBodyLat=${(effectiveDisplaySize * RACER.bodyFillX).toFixed(1)}px`);

// ── Initialize racers ─────────────────────────────────────────────────────────
const rng = makePRNG(SEED);
const rollInterval = ((dynamicsConfig.reRollLastPositionPercent / 100) * DUR_SEC * 1000) /
  Math.max(2, Math.floor(dynamicsConfig.reRollIntervalDivisor > 0 ? DUR_SEC / dynamicsConfig.reRollIntervalDivisor : 2));
const halfWidth = ((BS_MAX - BS_MIN) / BS_MEAN) * (dynamicsConfig.reRollVariationPercent / 100);
const lastRollDeadline = DUR_SEC * 1000 * (dynamicsConfig.reRollLastPositionPercent / 100);
const TOTAL_FRAMES = Math.ceil(DUR_SEC * 1000 / DT);

const racers = Array.from({ length: N_RACERS }, (_, i) => {
  const a = assignmentByRacer.get(i) ?? { rowIndex: 0, indexInRow: 0 };
  const rowSize = rowSizeByRow.get(a.rowIndex) ?? 1;
  const speedBonus = computeSpeedBonus(a.rowIndex, rowGapPx, pathLengthPx, rowConfig.speedBonusFactor, finishT, isOpen, rowLayout.totalRows ?? rowCount);
  const tStart = isOpen ? -(a.rowIndex * deltaT) : -(a.rowIndex * deltaT);
  const sf = BS_MIN/BS_MEAN + rng() * ((BS_MAX - BS_MIN)/BS_MEAN);
  const rollJitter = (rng() - 0.5) * 2 * rollInterval * 0.2;
  const r = {
    index: i,
    name: `r${i}`,
    t: tStart,
    finished: false,
    spreadFactor: sf,
    spreadFactorPrev: sf,
    spreadFactorTarget: sf,
    speedBonusMult: 1 + speedBonus,
    baseSpeed: race_baseSpeed * sf * (1 + speedBonus),
    transitionStartTime: 0,
    transitionDuration: dynamicsConfig.reRollTransitionDuration * 1000,
    nextRollTime: rollInterval + rollJitter,
    runoutDecay: 1,
    x: 0, y: 0, angle: 0,
    avoidanceActive: false,
    draftingBoostActive: false,
    physicalY: 0,
    physicalYVelocity: 0,
    spriteWorldSizePx: effectiveDisplaySize,
    geometricTrackWidthPx: geometricTrackWidth,
    pathLengthPx,
    rubberBandMult: 1.0,
    rubberBandMultPrev: 1.0,
    rubberBandMultTarget: 1.0,
    rubberBandTransStart: 0,
  };
  initRacerBehavior(r);
  r.physicalY = computeRowPhysicalY(a.indexInRow, rowSize, behaviorConfig.startSpreadRange);
  return r;
});

// ── Honest-overlap geometry ───────────────────────────────────────────────────
const honestBodyLong = effectiveDisplaySize * RACER.bodyFillY;
const honestBodyLat  = effectiveDisplaySize * RACER.bodyFillX;

// ── Per-overlap-frame accumulators ────────────────────────────────────────────
// For pairs in honest overlap, track whether each racer is braked / has boost
let olp_total           = 0;  // total honest overlap pair-frames (after warmup)
let olp_trailerBraked   = 0;  // overlap frames where trailer avoidanceActive=true
let olp_trailerBoosted  = 0;  // overlap frames where trailer rubberBandMult>1.001
let olp_trailerBothBrakeBoosted = 0; // brake AND boost simultaneously
let olp_trailerNetAbove1 = 0; // brake×boost > 1.0 (boost overpowers brake)
let olp_trailerBrakeFactor_sum = 0;
let olp_trailerBoostFactor_sum = 0;
let olp_trailerNetFactor_sum   = 0;

// Comeback-specific (trailer is a comeback racer)
let cb_olp_total            = 0;
let cb_olp_trailerBraked    = 0;
let cb_olp_trailerBoosted   = 0;
let cb_olp_netAbove1        = 0;

// Global brakeRate (after warmup) — to reconcile with 86%
let global_brakeSum   = 0;
let global_brakeTotal = 0;

// Track position for world coords (simple linear approx for open track)
function computeWorldPos(t) {
  const tNorm = ((t % finishT) / finishT + 1) % 1;
  const px = tNorm * pathLengthPx;
  return { x: px % 6000, y: 2000, angle: 0 };
}

// ── Main simulation loop ──────────────────────────────────────────────────────
for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
  const raceTs = frame * DT;

  // World positions (needed for drafting cone in applyRacerBehavior)
  for (const r of racers) {
    const wp = computeWorldPos(r.t);
    r.x = wp.x; r.y = wp.y; r.angle = wp.angle;
  }

  // Apply avoidance behavior
  applyRacerBehavior(racers, behaviorConfig);

  // Rubber-band update (mirrors browser/sim)
  let leaderT = -Infinity;
  for (const r of racers) { if (!r.finished && r.t > leaderT) leaderT = r.t; }
  if (leaderT > -Infinity) {
    let secondT = -Infinity;
    for (const r of racers) { if (!r.finished && r.t < leaderT && r.t > secondT) secondT = r.t; }
    const leaderGap = secondT > -Infinity ? (leaderT - secondT) / finishT : 0;
    const boostActive = leaderGap > RB_GAP_THRESHOLD;
    for (const r of racers) {
      if (r.finished) { r.rubberBandMult = 1.0; continue; }
      const isLeader = r.t === leaderT;
      const newTarget = !isLeader && boostActive ? 1.0 + RB_FLAT_BOOST : 1.0;
      if (Math.abs(newTarget - r.rubberBandMultTarget) > 0.001) {
        r.rubberBandMultPrev = r.rubberBandMult;
        r.rubberBandMultTarget = newTarget;
        r.rubberBandTransStart = raceTs;
      }
      const el = raceTs - r.rubberBandTransStart;
      r.rubberBandMult = el < RB_RAMP_MS
        ? r.rubberBandMultPrev + (r.rubberBandMultTarget - r.rubberBandMultPrev) * easeInOutCubic(el / RB_RAMP_MS)
        : r.rubberBandMultTarget;
    }
  }

  // Per-racer re-roll + speed update
  const effectiveBrakeFactor = computeEffectiveBrakeFactor(behaviorConfig, isOpen, raceTs);
  for (const r of racers) {
    if (!r.finished) {
      if (raceTs >= r.nextRollTime && raceTs < lastRollDeadline) {
        const newTarget = Math.max(BS_MIN/BS_MEAN, Math.min(BS_MAX/BS_MEAN,
          r.spreadFactor + (rng() - 0.5) * 2 * halfWidth));
        r.spreadFactorPrev = r.spreadFactor;
        r.spreadFactorTarget = newTarget;
        r.transitionStartTime = raceTs;
        r.nextRollTime = raceTs + rollInterval + (rng()-0.5)*2*rollInterval*0.2;
      }
      const elapsed = raceTs - r.transitionStartTime;
      if (elapsed < r.transitionDuration) {
        const tProg = elapsed / r.transitionDuration;
        r.spreadFactor = r.spreadFactorPrev + (r.spreadFactorTarget - r.spreadFactorPrev) * easeInOutCubic(tProg);
        r.baseSpeed = race_baseSpeed * r.spreadFactor * r.speedBonusMult;
      }

      const boost = r.draftingBoostActive ? behaviorConfig.draftingBoost : 1.0;
      const brake = r.avoidanceActive ? effectiveBrakeFactor : 1.0;
      r.t = Math.min(r.t + r.baseSpeed * boost * brake * r.rubberBandMult, finishT + 0.001);
      if (r.t >= finishT) r.finished = true;
    }

    // Global brakeRate count (after warmup)
    if (raceTs >= WARMUP_MS && !r.finished) {
      global_brakeTotal++;
      if (r.avoidanceActive) global_brakeSum++;
    }
  }

  // After warmup: check honest-overlap pairs
  if (raceTs < WARMUP_MS) continue;

  const active = racers.filter((r) => !r.finished);
  const meanT  = active.length > 0 ? active.reduce((s, r) => s + r.t, 0) / active.length : 0;

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const ra = active[i];
      const rb = active[j];

      const dT_px = Math.abs(ra.t - rb.t) * pathLengthPx;
      const dY_px = Math.abs(ra.physicalY - rb.physicalY) * geometricTrackWidth / 2;
      if (dT_px >= honestBodyLong || dY_px >= honestBodyLat) continue;

      // Honest overlap event
      olp_total++;

      // Determine trailer (lower t) and leader (higher t)
      const trailer = ra.t < rb.t ? ra : rb;
      const leader  = ra.t < rb.t ? rb : ra;

      const brakeFactor = trailer.avoidanceActive ? effectiveBrakeFactor : 1.0;
      const boostFactor = trailer.rubberBandMult;
      const netFactor   = brakeFactor * boostFactor;

      if (trailer.avoidanceActive) olp_trailerBraked++;
      if (trailer.rubberBandMult > 1.001) olp_trailerBoosted++;
      if (trailer.avoidanceActive && trailer.rubberBandMult > 1.001) olp_trailerBothBrakeBoosted++;
      if (netFactor > 1.001) olp_trailerNetAbove1++;

      olp_trailerBrakeFactor_sum += brakeFactor;
      olp_trailerBoostFactor_sum += boostFactor;
      olp_trailerNetFactor_sum   += netFactor;

      // Comeback: trailer t is below mean by COMEBACK_T_THRESHOLD × finishT
      const isComebackTrailer = (meanT - trailer.t) / finishT > COMEBACK_T_THRESHOLD;
      if (isComebackTrailer) {
        cb_olp_total++;
        if (trailer.avoidanceActive) cb_olp_trailerBraked++;
        if (trailer.rubberBandMult > 1.001) cb_olp_trailerBoosted++;
        if (netFactor > 1.001) cb_olp_netAbove1++;
      }
    }
  }
}

// ── Report ────────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════');
console.log('DIAGNOSTIC: Comeback-racer brake engagement during honest overlap');
console.log('Setup: Space Sprint × dragon, 60 racers, 60s, seed=1');
console.log(`behaviorConfig.speedBrakeFactor = ${behaviorConfig.speedBrakeFactor}`);
console.log(`rubberBandFlatBoost = ${RB_FLAT_BOOST}  →  rubberBandMult when active = ${1 + RB_FLAT_BOOST}`);
console.log(`Net speed when both active: ${(behaviorConfig.speedBrakeFactor * (1 + RB_FLAT_BOOST)).toFixed(4)} (${((behaviorConfig.speedBrakeFactor * (1 + RB_FLAT_BOOST) - 1) * 100).toFixed(2)}% above baseline)`);
console.log('══════════════════════════════════════════════════════════════════\n');

console.log('── Global brakeRate (after 4s warmup) ──────────────────────────');
const globalBrakeRate = global_brakeTotal > 0 ? global_brakeSum / global_brakeTotal : 0;
console.log(`  brakeRate: ${(globalBrakeRate * 100).toFixed(1)}%  (${global_brakeSum}/${global_brakeTotal} racer-frames)`);

console.log('\n── ALL honest-overlap pair-frames (after 4s warmup) ────────────');
console.log(`  total honest-overlap pair-frames: ${olp_total}`);
if (olp_total > 0) {
  console.log(`  trailer braked (avoidanceActive): ${olp_trailerBraked} / ${olp_total} = ${(olp_trailerBraked/olp_total*100).toFixed(1)}%`);
  console.log(`  trailer has rubber-band boost:    ${olp_trailerBoosted} / ${olp_total} = ${(olp_trailerBoosted/olp_total*100).toFixed(1)}%`);
  console.log(`  trailer has BOTH brake AND boost: ${olp_trailerBothBrakeBoosted} / ${olp_total} = ${(olp_trailerBothBrakeBoosted/olp_total*100).toFixed(1)}%`);
  console.log(`  boost net > 1.0 (brake overpowered): ${olp_trailerNetAbove1} / ${olp_total} = ${(olp_trailerNetAbove1/olp_total*100).toFixed(1)}%`);
  console.log(`  avg brake factor during overlap: ${(olp_trailerBrakeFactor_sum/olp_total).toFixed(4)}`);
  console.log(`  avg boost factor during overlap: ${(olp_trailerBoostFactor_sum/olp_total).toFixed(4)}`);
  console.log(`  avg net speed factor during overlap: ${(olp_trailerNetFactor_sum/olp_total).toFixed(4)}`);
}

console.log(`\n── COMEBACK racer overlap (trailer > ${(COMEBACK_T_THRESHOLD*100).toFixed(0)}% below mean t) ─────────`);
console.log(`  comeback overlap pair-frames: ${cb_olp_total} / ${olp_total} = ${olp_total>0?(cb_olp_total/olp_total*100).toFixed(1):0}% of all overlap`);
if (cb_olp_total > 0) {
  console.log(`  comeback trailer braked:        ${cb_olp_trailerBraked} / ${cb_olp_total} = ${(cb_olp_trailerBraked/cb_olp_total*100).toFixed(1)}%`);
  console.log(`  comeback trailer boosted:       ${cb_olp_trailerBoosted} / ${cb_olp_total} = ${(cb_olp_trailerBoosted/cb_olp_total*100).toFixed(1)}%`);
  console.log(`  comeback boost net > 1.0:       ${cb_olp_netAbove1} / ${cb_olp_total} = ${(cb_olp_netAbove1/cb_olp_total*100).toFixed(1)}%`);
} else {
  console.log('  (no comeback-racer overlap events detected — try lowering COMEBACK_T_THRESHOLD)');
}

console.log('\n── Reconciliation of 86% brakeRate vs visible pass-through ─────');
console.log(`  The 86% brakeRate measures ALL racer-frames where avoidanceActive=true.`);
console.log(`  That includes high-density frames where racers are braked but NOT overlapping.`);
const overlapBrakeRate = olp_total > 0 ? olp_trailerBraked / olp_total : 0;
const boostNetAbove1Rate = olp_total > 0 ? olp_trailerNetAbove1 / olp_total : 0;
console.log(`  During actual overlap events, trailer brakeRate = ${(overlapBrakeRate*100).toFixed(1)}%.`);
console.log(`  But of those braked trailers, boost net > 1.0 in ${(boostNetAbove1Rate*100).toFixed(1)}% of overlap frames.`);
console.log(`  Meaning: the brake fires, but rubber-band (${(RB_FLAT_BOOST*100).toFixed(0)}% boost) overpowers`);
console.log(`  the speed brake (${((1-behaviorConfig.speedBrakeFactor)*100).toFixed(1)}% reduction) when both are active.`);
console.log(`  Net speed with both: ${(behaviorConfig.speedBrakeFactor*(1+RB_FLAT_BOOST)*100).toFixed(2)}% of baseline.`);
console.log('\n══════════════════════════════════════════════════════════════════\n');
