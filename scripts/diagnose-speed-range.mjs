#!/usr/bin/env node
// ============================================================
// Script:  diagnose-speed-range.mjs
// Path:    scripts/diagnose-speed-range.mjs
// Purpose: Measure actual speed spread between 20 racers over a
//          simulated 1200-frame race (20 s at 62.5 fps).
//          No browser dependencies — pure Node simulation using
//          the same formulas as RaceScreen/index.jsx.
//
// Usage:   node scripts/diagnose-speed-range.mjs
// Output:  docs/diagnose/speed-range-trace.ndjson  (per-frame data)
//          stdout: summary statistics
// ============================================================

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Constants — mirrored from production code
// ---------------------------------------------------------------------------

const REFERENCE_FPS = 62.5;  // inverse of 16 ms frame time
const N_RACERS = 20;
const SIM_FRAMES = 1200;     // 20 seconds at 62.5 fps
const DT_MS = 16;            // ms per frame

// Default base-speed config (client/src/modules/storage/defaults.js)
const BASE_SPEED_MIN  = 0.00091;
const BASE_SPEED_MAX  = 0.00118;
const BASE_SPEED_MEAN = (BASE_SPEED_MIN + BASE_SPEED_MAX) / 2;  // 0.001045

// Default race-dynamics config
const RE_ROLL_VARIATION_PERCENT  = 85;
const RE_ROLL_TRANSITION_DURATION_MS = 5000;  // 5 s
const RE_ROLL_INTERVAL_DIVISOR   = 15;
const RE_ROLL_LAST_POSITION_PCT  = 80;

// Typical race parameters (Horse racer, 60 s, 2 laps closed track)
const SPEED_MULTIPLIER  = 1.0;  // Horse
const TARGET_DURATION_S = 60;   // seconds
const FINISH_T          = 2;    // laps
const PATH_LENGTH_PX    = 1200; // typical oval

// Row layout (4 rows × 5 racers, matching 20 racers at ~500px track width)
const ROW_COUNT         = 4;
const ROW_GAP_PX        = 42;    // 1.5 × 28px sprite height (approx)
const SPEED_BONUS_FACTOR = 1.0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function computeRaceBaseSpeed(finishT, targetDurationSeconds) {
  if (!targetDurationSeconds || targetDurationSeconds <= 0) return 0;
  return finishT / (REFERENCE_FPS * targetDurationSeconds);
}

function computeSpeedBonus(rowIndex, rowGapPx, pathLengthPx, speedBonusFactor) {
  if (rowIndex === 0 || pathLengthPx <= 0) return 0;
  return ((rowIndex * rowGapPx) / pathLengthPx) * speedBonusFactor;
}

function percentSpread(min, max, mean) {
  return ((max - min) / mean) * 100;
}

function stdDev(values) {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// ---------------------------------------------------------------------------
// Race init
// ---------------------------------------------------------------------------

const spreadMinFactor = BASE_SPEED_MIN / BASE_SPEED_MEAN;  // 0.8708...
const spreadMaxFactor = BASE_SPEED_MAX / BASE_SPEED_MEAN;  // 1.1292...

// N-calibrated expected-minimum spread factor (same formula as RaceScreen)
const expectedMinSpreadFactor =
  spreadMinFactor + (spreadMaxFactor - spreadMinFactor) / (N_RACERS + 1);

const race_baseSpeed = computeRaceBaseSpeed(
  FINISH_T,
  TARGET_DURATION_S * expectedMinSpreadFactor * SPEED_MULTIPLIER
);

// Re-roll schedule
const rollCount   = Math.max(2, Math.floor(TARGET_DURATION_S / RE_ROLL_INTERVAL_DIVISOR));
const rollInterval_ms = ((RE_ROLL_LAST_POSITION_PCT / 100) * TARGET_DURATION_S * 1000) / rollCount;
const spreadRange = (BASE_SPEED_MAX - BASE_SPEED_MIN) / BASE_SPEED_MEAN;
const halfWidth   = spreadRange * (RE_ROLL_VARIATION_PERCENT / 100);
const lastRollDeadline_ms = TARGET_DURATION_S * 1000 * (RE_ROLL_LAST_POSITION_PCT / 100);

// Build 20 racers
const racers = Array.from({ length: N_RACERS }, (_, i) => {
  const rowIndex  = Math.floor(i / (N_RACERS / ROW_COUNT));
  const speedBonus = computeSpeedBonus(rowIndex, ROW_GAP_PX, PATH_LENGTH_PX, SPEED_BONUS_FACTOR);
  const speedBonusMult = 1 + speedBonus;
  const spreadFactor = (BASE_SPEED_MIN + Math.random() * (BASE_SPEED_MAX - BASE_SPEED_MIN)) / BASE_SPEED_MEAN;

  const rollJitter = (Math.random() - 0.5) * 2 * rollInterval_ms * 0.2;
  return {
    id: i,
    rowIndex,
    spreadFactor,
    spreadFactorPrev: spreadFactor,
    spreadFactorTarget: spreadFactor,
    speedBonusMult,
    transitionStartTime: 0,
    transitionDuration: RE_ROLL_TRANSITION_DURATION_MS,
    nextRollTime: rollInterval_ms + rollJitter,
    baseSpeed: race_baseSpeed * SPEED_MULTIPLIER * spreadFactor * speedBonusMult,
  };
});

// ---------------------------------------------------------------------------
// Simulation loop
// ---------------------------------------------------------------------------

const frameData = [];  // per-frame stats
let ts = 0;            // current sim time in ms

for (let frame = 0; frame < SIM_FRAMES; frame++) {
  ts += DT_MS;

  // Apply re-rolls and smooth transitions
  for (const r of racers) {
    if (ts >= r.nextRollTime && ts < lastRollDeadline_ms) {
      const newTarget = clamp(
        r.spreadFactor + (Math.random() - 0.5) * 2 * halfWidth,
        spreadMinFactor,
        spreadMaxFactor,
      );
      r.spreadFactorPrev  = r.spreadFactor;
      r.spreadFactorTarget = newTarget;
      r.transitionStartTime = ts;
      const jOff = (Math.random() - 0.5) * 2 * rollInterval_ms * 0.2;
      r.nextRollTime = ts + rollInterval_ms + jOff;
    }

    const elapsed = ts - r.transitionStartTime;
    if (elapsed < r.transitionDuration) {
      const tProg = elapsed / r.transitionDuration;
      r.spreadFactor = r.spreadFactorPrev + (r.spreadFactorTarget - r.spreadFactorPrev) * easeInOutCubic(tProg);
      r.baseSpeed = race_baseSpeed * SPEED_MULTIPLIER * r.spreadFactor * r.speedBonusMult;
    }
  }

  // Collect per-frame speed stats
  const speeds = racers.map(r => r.baseSpeed);
  const min    = Math.min(...speeds);
  const max    = Math.max(...speeds);
  const mean   = speeds.reduce((s, v) => s + v, 0) / speeds.length;
  const std    = stdDev(speeds);
  const spreadPct = percentSpread(min, max, mean);

  // Speed spread in px/s (Frenet space): baseSpeed × pathLengthPx × REFERENCE_FPS
  const toPxPerSec = s => s * PATH_LENGTH_PX * REFERENCE_FPS;
  const minPx = toPxPerSec(min);
  const maxPx = toPxPerSec(max);
  const meanPx = toPxPerSec(mean);

  frameData.push({
    frame,
    ts_ms: ts,
    min_baseSpeed: min,
    max_baseSpeed: max,
    mean_baseSpeed: mean,
    std_baseSpeed: std,
    spreadPct: spreadPct,
    min_pxPerSec: minPx,
    max_pxPerSec: maxPx,
    mean_pxPerSec: meanPx,
    spreadPxPerSec: maxPx - minPx,
  });
}

// ---------------------------------------------------------------------------
// Aggregate statistics
// ---------------------------------------------------------------------------

const spreadPcts     = frameData.map(f => f.spreadPct);
const spreadPxPerSec = frameData.map(f => f.spreadPxPerSec);

const stats = {
  config: {
    nRacers: N_RACERS,
    simFrames: SIM_FRAMES,
    simDurationSec: (SIM_FRAMES * DT_MS) / 1000,
    BASE_SPEED_MIN,
    BASE_SPEED_MAX,
    BASE_SPEED_MEAN,
    spreadMinFactor: spreadMinFactor.toFixed(4),
    spreadMaxFactor: spreadMaxFactor.toFixed(4),
    race_baseSpeed: race_baseSpeed.toExponential(4),
    rollCount,
    rollInterval_ms,
    halfWidth: halfWidth.toFixed(4),
  },
  spreadPct: {
    mean: (spreadPcts.reduce((s,v) => s+v, 0) / spreadPcts.length).toFixed(2),
    min:  Math.min(...spreadPcts).toFixed(2),
    max:  Math.max(...spreadPcts).toFixed(2),
    p10:  [...spreadPcts].sort((a,b)=>a-b)[Math.floor(spreadPcts.length*0.10)].toFixed(2),
    p50:  [...spreadPcts].sort((a,b)=>a-b)[Math.floor(spreadPcts.length*0.50)].toFixed(2),
    p90:  [...spreadPcts].sort((a,b)=>a-b)[Math.floor(spreadPcts.length*0.90)].toFixed(2),
  },
  spreadPxPerSec: {
    mean: (spreadPxPerSec.reduce((s,v) => s+v, 0) / spreadPxPerSec.length).toFixed(1),
    min:  Math.min(...spreadPxPerSec).toFixed(1),
    max:  Math.max(...spreadPxPerSec).toFixed(1),
  },
  initialBaseSpeedRange: {
    min: Math.min(...racers.map(r => r.baseSpeed)).toExponential(4),
    max: Math.max(...racers.map(r => r.baseSpeed)).toExponential(4),
  },
  initialSpeedBonusMultRange: {
    frontRow: (1 + computeSpeedBonus(0, ROW_GAP_PX, PATH_LENGTH_PX, SPEED_BONUS_FACTOR)).toFixed(4),
    row1:     (1 + computeSpeedBonus(1, ROW_GAP_PX, PATH_LENGTH_PX, SPEED_BONUS_FACTOR)).toFixed(4),
    row2:     (1 + computeSpeedBonus(2, ROW_GAP_PX, PATH_LENGTH_PX, SPEED_BONUS_FACTOR)).toFixed(4),
    row3:     (1 + computeSpeedBonus(3, ROW_GAP_PX, PATH_LENGTH_PX, SPEED_BONUS_FACTOR)).toFixed(4),
  },
};

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const outDir = join(ROOT, 'docs', 'diagnose');
mkdirSync(outDir, { recursive: true });

// NDJSON trace
const tracePath = join(outDir, 'speed-range-trace.ndjson');
writeFileSync(tracePath, frameData.map(f => JSON.stringify(f)).join('\n') + '\n');

// Stats JSON
const statsPath = join(outDir, 'speed-range-stats.json');
writeFileSync(statsPath, JSON.stringify(stats, null, 2) + '\n');

// Stdout summary
console.log('\n=== Speed-Range Diagnose ===');
console.log(`Config: ${N_RACERS} Racer, ${SIM_FRAMES} Frames (${(SIM_FRAMES * DT_MS / 1000).toFixed(0)} s)`);
console.log(`BASE_SPEED_MIN/MAX: ${BASE_SPEED_MIN} / ${BASE_SPEED_MAX}  (±${((spreadMaxFactor-1)*100).toFixed(1)}%)`);
console.log(`race_baseSpeed: ${race_baseSpeed.toExponential(4)}`);
console.log(`Re-Rolls: ${rollCount} über ${RE_ROLL_LAST_POSITION_PCT}% der Rennzeit, alle ${rollInterval_ms.toFixed(0)}ms`);
console.log(`halfWidth pro Re-Roll: ±${halfWidth.toFixed(3)} (${(halfWidth*100).toFixed(1)}% des Mittelwerts)`);
console.log('');
console.log('--- Speed Spread (% von Mittelwert) ---');
console.log(`  Mean: ${stats.spreadPct.mean}%`);
console.log(`  Min:  ${stats.spreadPct.min}%`);
console.log(`  Max:  ${stats.spreadPct.max}%`);
console.log(`  p10:  ${stats.spreadPct.p10}%`);
console.log(`  p50:  ${stats.spreadPct.p50}%`);
console.log(`  p90:  ${stats.spreadPct.p90}%`);
console.log('');
console.log('--- Speed Spread in px/s (Frenet) ---');
console.log(`  Mean: ${stats.spreadPxPerSec.mean} px/s`);
console.log(`  Min:  ${stats.spreadPxPerSec.min} px/s`);
console.log(`  Max:  ${stats.spreadPxPerSec.max} px/s`);
console.log('');
console.log('--- speedBonusMult pro Reihe ---');
console.log(`  Reihe 0 (Front): ${stats.initialSpeedBonusMultRange.frontRow}`);
console.log(`  Reihe 1:         ${stats.initialSpeedBonusMultRange.row1}`);
console.log(`  Reihe 2:         ${stats.initialSpeedBonusMultRange.row2}`);
console.log(`  Reihe 3:         ${stats.initialSpeedBonusMultRange.row3}`);
console.log('');
console.log('--- Hypothesen-Auswertung ---');
const meanSpread = parseFloat(stats.spreadPct.mean);
if (meanSpread > 5) {
  console.log(`  S1 BESTÄTIGT: mittlerer Spread ${meanSpread.toFixed(1)}% >> 5%-Grenze`);
} else {
  console.log(`  S1 WIDERLEGT: mittlerer Spread ${meanSpread.toFixed(1)}% ≤ 5%`);
}
console.log('');
console.log(`Trace: ${tracePath}`);
console.log(`Stats: ${statsPath}`);
