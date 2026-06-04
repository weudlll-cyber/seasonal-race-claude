/**
 * sweep-body-collision.mjs
 * Phase 1: avoidance parameter sweep — Space Sprint × Rocket × 60 racers × 10 races.
 *
 * Baseline (combo #0): current defaults.
 * Grid: avoidanceDistance × lateralForce × homeForceReductionOnOverlap × homeForceStrength
 *       3×3×3×3 = 81 combos + baseline = 82 total × 10 races = 820 races.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { EditorShape }                               from '../client/src/modules/track-editor/EditorShape.js';
import { REFERENCE_FPS, computeSpeedScaleFactor }   from '../client/src/modules/camera/lapUtils.js';
import { DEFAULT_BASE_SPEED_CONFIG, DEFAULT_RACE_BEHAVIOR_CONFIG } from '../client/src/modules/storage/defaults.js';
import { computeRacerLayout }                        from '../client/src/modules/rowLayout.js';
import { DEFAULT_AUTO_SCALE_CONFIG }                 from '../client/src/modules/autoSpriteScale.js';
import { RACER_CONFIGS, runSingleRace, computeFinishT, computeFairnessStats } from './sim-fairness.mjs';

const __dir      = dirname(fileURLToPath(import.meta.url));
const TRACK_DIR  = join(__dir, '../server/data/tracks');

// ── Config ───────────────────────────────────────────────────────────────────
const TRACK_ID   = 'space-sprint';
const RACER_TYPE = 'rocket';
const N_RACERS   = 60;
const N_RACES    = 10;
const DUR_SEC    = 60;

const { displaySize, bodyFillX, bodyFillY, speedMultiplier } = RACER_CONFIGS[RACER_TYPE];
const BASE_SPEED_MIN  = DEFAULT_BASE_SPEED_CONFIG.min;
const BASE_SPEED_MAX  = DEFAULT_BASE_SPEED_CONFIG.max;
const BASE_SPEED_MEAN = (BASE_SPEED_MIN + BASE_SPEED_MAX) / 2;

// ── Load track ────────────────────────────────────────────────────────────────
const track            = JSON.parse(readFileSync(join(TRACK_DIR, `${TRACK_ID}.json`), 'utf8'));
const shape            = new EditorShape(track);
const isOpen           = !!shape.isOpen;
const pathLengthPx     = track.pathLengthPx ?? shape.getTotalLength();
const geometricTrackWidth = shape.getActualTrackWidth();

const ssf        = isOpen ? computeSpeedScaleFactor(pathLengthPx) : 1;
const finishT    = computeFinishT(BASE_SPEED_MEAN, speedMultiplier, DUR_SEC, isOpen,
                    DEFAULT_RACE_BEHAVIOR_CONFIG.runoutZone);

const spreadMinF = BASE_SPEED_MIN / BASE_SPEED_MEAN;
const spreadMaxF = BASE_SPEED_MAX / BASE_SPEED_MEAN;

// ── Overlap zone thresholds (for reporting) ───────────────────────────────────
const bodyDiamX = displaySize * bodyFillX;
const bodyDiamY = displaySize * bodyFillY;

// ── Parameter grid ────────────────────────────────────────────────────────────
const BASELINE = {
  avoidanceDistance:           0.150,
  lateralForce:                0.012,
  homeForceReductionOnOverlap: 0.300,
  homeForceStrength:           0.040,
};

const GRID = {
  avoidanceDistance:           [0.150, 0.180, 0.210],
  lateralForce:                [0.012, 0.016, 0.020],
  homeForceReductionOnOverlap: [0.250, 0.300, 0.400],
  homeForceStrength:           [0.035, 0.040, 0.050],
};

// ── Chi-square fairness p-value (normal approximation) ───────────────────────
function chiSquareP(observed) {
  const total = observed.reduce((s, c) => s + c, 0);
  if (total === 0) return 1;
  const n = observed.length;
  const expected = total / n;
  let chi2 = 0;
  for (const c of observed) chi2 += (c - expected) ** 2 / expected;
  const df = n - 1;
  // Wilson–Hilferty approximation
  const h = (chi2 / df - 1 + 2 / (9 * df));
  const z = h / Math.sqrt(2 / (9 * df));
  const p = 1 - 0.5 * (1 + Math.sign(z) * Math.sqrt(1 - Math.exp(-2 * z * z / Math.PI)));
  return Math.max(0, Math.min(1, p));
}

// ── Run N_RACES with given overrides and collect aggregate metrics ─────────────
function runCombo(overrides, seed0 = 42) {
  const softArr = [], hardArr = [], zigArr = [], latArr = [], soArr = [], finArr = [];
  const rankTally = new Array(N_RACERS).fill(0);

  for (let r = 0; r < N_RACES; r++) {
    const results = runSingleRace({
      shape, pathLengthPx, geometricTrackWidth, isOpen,
      speedMultiplier, displaySize, bodyFillX, bodyFillY,
      finishT,
      targetSeconds: DUR_SEC,
      seed: seed0 + r,
      nRacers: N_RACERS,
      behaviorConfigOverrides: overrides,
    });

    softArr.push(results.liteSoftOverlapRate ?? 0);
    hardArr.push(results.liteHardOverlapRate ?? 0);
    zigArr .push(results.liteZigzagScore     ?? 0);
    latArr .push(results.liteLatSpeedScore   ?? 0);
    soArr  .push(results.liteStableOvertakes ?? 0);

    const finishers = results.filter((r2) => r2.finishTime != null);
    finArr.push(finishers.length > 0
      ? finishers.reduce((s, r2) => s + r2.finishTime, 0) / finishers.length
      : DUR_SEC);

    for (const r2 of results) {
      if (r2.finalRank != null && r2.finalRank >= 1 && r2.finalRank <= N_RACERS)
        rankTally[r2.finalRank - 1]++;
    }
  }

  const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
  return {
    softOverlapRate:   avg(softArr),
    hardOverlapRate:   avg(hardArr),
    zigzagScore:       avg(zigArr),
    lateralSpeedScore: avg(latArr),
    stableOvertakes:   avg(soArr),
    meanFinishTime:    avg(finArr),
    pValue:            chiSquareP(rankTally),
  };
}

// ── Build full combo list ─────────────────────────────────────────────────────
function buildGrid() {
  const out = [];
  for (const ad  of GRID.avoidanceDistance)
  for (const lf  of GRID.lateralForce)
  for (const hfr of GRID.homeForceReductionOnOverlap)
  for (const hfs of GRID.homeForceStrength)
    out.push({ avoidanceDistance: ad, lateralForce: lf,
               homeForceReductionOnOverlap: hfr, homeForceStrength: hfs });
  return out;
}

// ── Formatters ────────────────────────────────────────────────────────────────
const pct = (v) => (v * 100).toFixed(2) + '%';
const f4  = (v) => v.toFixed(4);
const f2  = (v) => v.toFixed(2);

function printMetrics(m) {
  console.log(`    hardOverlapRate:    ${pct(m.hardOverlapRate)}`);
  console.log(`    softOverlapRate:    ${pct(m.softOverlapRate)}`);
  console.log(`    zigzagScore:        ${f4(m.zigzagScore)}`);
  console.log(`    lateralSpeedScore:  ${f4(m.lateralSpeedScore)}`);
  console.log(`    stableOvertakes:    ${f2(m.stableOvertakes)}`);
  console.log(`    fairness p:         ${m.pValue.toFixed(4)}`);
  console.log(`    meanFinishTime:     ${f2(m.meanFinishTime)}s`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('');
console.log('=== Phase 1: Body-Collision Avoidance Sweep ===');
console.log('');
console.log(`Track:   ${TRACK_ID}  (${Math.round(pathLengthPx)}px, width=${Math.round(geometricTrackWidth)}px, open=${isOpen})`);
console.log(`Racer:   ${RACER_TYPE}  displaySize=${displaySize}  bodyFillX=${bodyFillX}  bodyFillY=${bodyFillY}`);
console.log(`         bodyDiameterX=${bodyDiamX.toFixed(1)}px  bodyDiameterY=${bodyDiamY.toFixed(1)}px`);
console.log(`Racers:  ${N_RACERS}   Races/combo: ${N_RACES}   Duration: ${DUR_SEC}s   finishT: ${finishT.toFixed(5)}`);
console.log(`Soft zone: dY_world < ${bodyDiamX.toFixed(1)}px AND dT_world < ${bodyDiamY.toFixed(1)}px  (full body diameter)`);
console.log(`Hard zone: dY_world < ${(bodyDiamX*0.9).toFixed(1)}px AND dT_world < ${(bodyDiamY*0.9).toFixed(1)}px  (>10% body overlap)`);
console.log('');

// ── Combo #0: Baseline ────────────────────────────────────────────────────────
console.log('── Combo #0  BASELINE ──────────────────────────────────────────────');
console.log(`  ad=0.150 lf=0.012 hfr=0.300 hfs=0.040`);
const baseline = runCombo(BASELINE);
printMetrics(baseline);
console.log('');

// ── 81-combo grid ─────────────────────────────────────────────────────────────
console.log(`── Grid sweep: ${81} combos × ${N_RACES} races = ${81*N_RACES} races …`);
const combos  = buildGrid();
const results = [];
let done = 0;
for (const params of combos) {
  results.push({ params, ...runCombo(params) });
  done++;
  if (done % 9 === 0) process.stderr.write(`  ${done}/81\n`);
}

// ── Hard cutoffs ──────────────────────────────────────────────────────────────
const C_HARD   = 0.03;
const C_ZIG    = 0.003;
const C_P      = 0.05;
const C_LAT    = baseline.lateralSpeedScore * 2;
const C_FIN    = baseline.meanFinishTime    * 1.10;

const survivors = results
  .filter(r =>
    r.hardOverlapRate   <= C_HARD  &&
    r.zigzagScore       <= C_ZIG   &&
    r.pValue            >= C_P     &&
    r.lateralSpeedScore <= C_LAT   &&
    r.meanFinishTime    <= C_FIN
  )
  .sort((a, b) => a.hardOverlapRate - b.hardOverlapRate);

// ── Report ────────────────────────────────────────────────────────────────────
console.log('');
console.log('══════════════════════════════════════════════════════════════════════');
console.log(' RESULTS');
console.log('══════════════════════════════════════════════════════════════════════');
console.log('');
console.log('Baseline:');
printMetrics(baseline);
console.log('');
console.log('Hard cutoffs applied:');
console.log(`  hardOverlapRate   <= ${pct(C_HARD)}   (primary: < 3%)`);
console.log(`  zigzagScore       <= ${C_ZIG.toFixed(4)}`);
console.log(`  fairness p        >= ${C_P}`);
console.log(`  lateralSpeedScore <= ${f4(C_LAT)}  (2× baseline ${f4(baseline.lateralSpeedScore)})`);
console.log(`  meanFinishTime    <= ${f2(C_FIN)}s   (1.10× baseline ${f2(baseline.meanFinishTime)}s)`);
console.log('');
console.log(`Survivors: ${survivors.length} / ${results.length}`);
console.log('');

if (survivors.length === 0) {
  console.log('No combos passed ALL hard cutoffs.');
  console.log('');
  console.log('Best 5 by hardOverlapRate (ignoring cutoffs):');
  const top5 = [...results].sort((a, b) => a.hardOverlapRate - b.hardOverlapRate).slice(0, 5);
  for (const r of top5) {
    const { params: p, ...m } = r;
    const cut = [
      m.hardOverlapRate > C_HARD   ? 'HARD_OVERLAP' : '',
      m.zigzagScore     > C_ZIG    ? 'ZIGZAG'       : '',
      m.pValue          < C_P      ? 'FAIRNESS'     : '',
      m.lateralSpeedScore > C_LAT  ? 'LAT_SPEED'    : '',
      m.meanFinishTime    > C_FIN  ? 'FINISH_TIME'  : '',
    ].filter(Boolean).join(', ');
    console.log(`  ad=${p.avoidanceDistance} lf=${p.lateralForce} hfr=${p.homeForceReductionOnOverlap} hfs=${p.homeForceStrength}`);
    console.log(`    FAILED: ${cut}`);
    printMetrics(m);
    console.log('');
  }
} else {
  // Full table of all survivors
  console.log('All survivors (sorted by hardOverlapRate ascending):');
  console.log('');
  console.log('  # |  ad  |  lf  |  hfr  |  hfs  | hard%  | soft%  | zigzag | latSpd | stOvt |   p   | finT');
  console.log('  ' + '-'.repeat(102));
  for (let i = 0; i < survivors.length; i++) {
    const { params: p, ...m } = survivors[i];
    console.log(
      `  ${String(i+1).padStart(2)} | ${p.avoidanceDistance.toFixed(3)} | ${p.lateralForce.toFixed(3)} ` +
      `| ${p.homeForceReductionOnOverlap.toFixed(3)} | ${p.homeForceStrength.toFixed(3)} ` +
      `| ${(m.hardOverlapRate*100).toFixed(2).padStart(5)}% | ${(m.softOverlapRate*100).toFixed(2).padStart(5)}% ` +
      `| ${m.zigzagScore.toFixed(4)} | ${m.lateralSpeedScore.toFixed(4)} ` +
      `| ${m.stableOvertakes.toFixed(2).padStart(5)} | ${m.pValue.toFixed(3)} | ${m.meanFinishTime.toFixed(1)}s`
    );
  }
  console.log('');

  // Top 5 detail
  console.log('Top 5 survivors — full metrics:');
  console.log('');
  for (let i = 0; i < Math.min(5, survivors.length); i++) {
    const { params: p, ...m } = survivors[i];
    console.log(`  #${i+1}  ad=${p.avoidanceDistance}  lf=${p.lateralForce}  hfr=${p.homeForceReductionOnOverlap}  hfs=${p.homeForceStrength}`);
    printMetrics(m);
    console.log('');
  }
}

console.log('=== Phase 1 complete. Do NOT start Phase 2 automatically. ===');
