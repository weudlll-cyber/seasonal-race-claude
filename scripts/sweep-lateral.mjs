// ============================================================
// File:    sweep-lateral.mjs
// Targeted 2D sweep: lateralDamping × lateralForce
// All other parameters held at master baseline.
// Phase 1: 10 races per combo | Phase 2: top 5 × 100 races
// Seed: 42 (reproducible)
// ============================================================
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');

import {
  runSingleRace, computeFairnessStats, computeFinishT, RACER_CONFIGS,
} from './sim-fairness.mjs';
import { EditorShape }                                from '../client/src/modules/track-editor/EditorShape.js';
import { computeRacerLayout, computeEvenRowLayout }   from '../client/src/modules/rowLayout.js';
import { computeSpeedScaleFactor }                    from '../client/src/modules/camera/lapUtils.js';
import { DEFAULT_BASE_SPEED_CONFIG, DEFAULT_RACE_BEHAVIOR_CONFIG } from '../client/src/modules/storage/defaults.js';
import { DEFAULT_AUTO_SCALE_CONFIG }                  from '../client/src/modules/autoSpriteScale.js';
import { createRacePlan, createTrajectoryController } from '../client/src/modules/racePlanner.js';

// ── Config ───────────────────────────────────────────────────────────────────
const GLOBAL_SEED = 42;
const DURATION_S  = 60;
const BONUS       = 2.0;
const P1_RACES    = 10;
const P2_RACES    = 100;
const P2_TOP_N    = 5;

const FIXED = {
  homeForceStrength:           0.040,
  homeForceReductionOnOverlap: 0.300,
  avoidanceDistance:           0.150,
  speedBrakeFactor:            0.950,
  speedBrakeTThreshold:        0.015,
  speedBrakeYThreshold:        0.200,
};

const DAMPING_VALS = [0.25, 0.30, 0.35, 0.40, 0.45];
const FORCE_VALS   = [0.006, 0.008, 0.010, 0.012, 0.014];

const TRACK_SPECS = [
  { trackId: 'space-sprint', racerType: 'rocket', nRacers: 50, label: 'Space Sprint' },
  { trackId: '90d3020197da', racerType: 'luge',   nRacers: 50, label: 'Luger Hill'  },
  { trackId: 'dirt-oval',    racerType: 'horse',  nRacers: 40, label: 'Dirt Oval'   },
];

// ── Track loading ─────────────────────────────────────────────────────────────
function loadTracks() {
  const dir = join(ROOT, 'server/data/tracks');
  return TRACK_SPECS.map(spec => {
    const track  = JSON.parse(readFileSync(join(dir, `${spec.trackId}.json`), 'utf8'));
    const shape  = new EditorShape(track);
    const isOpen = !!shape.isOpen;
    const pathLengthPx        = track.pathLengthPx ?? shape.getTotalLength();
    const geometricTrackWidth = track.width ?? shape.getActualTrackWidth();
    const BS     = DEFAULT_BASE_SPEED_CONFIG;
    const BSMean = (BS.min + BS.max) / 2;
    const sfMin  = BS.min / BSMean, sfMax = BS.max / BSMean;
    const expMinSF    = sfMin + (sfMax - sfMin) / (spec.nRacers + 1);
    const raceBaseSpeed = BSMean / expMinSF;
    const trackSsf  = isOpen ? computeSpeedScaleFactor(pathLengthPx) : 1;
    const naturalBase = isOpen ? BSMean / trackSsf : raceBaseSpeed;
    const { speedMultiplier, displaySize } = RACER_CONFIGS[spec.racerType];
    const finishT = computeFinishT(naturalBase, speedMultiplier, DURATION_S, isOpen);
    const bCfg   = DEFAULT_RACE_BEHAVIOR_CONFIG;
    const effWidth = geometricTrackWidth * bCfg.startSpreadRange;
    const layout   = computeRacerLayout(effWidth, spec.nRacers, displaySize, DEFAULT_AUTO_SCALE_CONFIG);
    return { ...spec, shape, isOpen, pathLengthPx, geometricTrackWidth, speedMultiplier, displaySize,
             finishT, totalRows: layout.rowCount, rowSizes: layout.layout,
             comboRowLayout: computeEvenRowLayout(spec.nRacers, layout.rowCount) };
  });
}

// ── Race plan helpers ─────────────────────────────────────────────────────────
const BEREICH_BOUNDS = [[1,5],[6,15],[16,25],[26,40],[41,Infinity]];
function sollBereichOf(rank) {
  if (rank <= 5)  return 1; if (rank <= 15) return 2;
  if (rank <= 25) return 3; if (rank <= 40) return 4; return 5;
}

// ── Run one combo on all tracks ───────────────────────────────────────────────
function runCombo(params, tracks, nRaces, seedBase) {
  const behavior = { ...DEFAULT_RACE_BEHAVIOR_CONFIG, ...FIXED, ...params };
  const trackResults = [];

  for (const track of tracks) {
    const raceResults = [];
    let rpsHits = 0, rpsSlots = 0;

    for (let r = 0; r < nRaces; r++) {
      const seed = (seedBase - 1) * nRaces + r + 1;
      const planRacers = track.comboRowLayout.assignments.map(a => ({
        index: a.racerIndex, startRowIndex: a.rowIndex,
      }));
      const plan = createRacePlan(planRacers, track.finishT, DURATION_S * 1000,
        { bonusStrengthMultiplier: BONUS }, seed);
      const result = runSingleRace({
        shape: track.shape, pathLengthPx: track.pathLengthPx,
        geometricTrackWidth: track.geometricTrackWidth, isOpen: track.isOpen,
        speedMultiplier: track.speedMultiplier, displaySize: track.displaySize,
        finishT: track.finishT, targetSeconds: DURATION_S, seed,
        nRacers: track.nRacers, behaviorConfigOverrides: behavior,
        racePlanController: createTrajectoryController(plan),
      });
      raceResults.push(result);

      if (plan._racerTargetRank?.size > 0) {
        for (const racer of result) {
          const tr = plan._racerTargetRank.get(racer.racerIndex);
          if (tr == null) continue;
          const [lo, hi] = BEREICH_BOUNDS[sollBereichOf(tr) - 1];
          rpsSlots++;
          if (racer.finalRank >= lo && racer.finalRank <= hi) rpsHits++;
        }
      }
    }

    const avg = fn => raceResults.reduce((s, r) => s + (fn(r) ?? 0), 0) / nRaces;
    const fairness = computeFairnessStats(raceResults, track.totalRows, track.rowSizes);
    const natOvt = avg(r => r.naturalness?.naturalOvertakeFraction ?? 1);
    const outcome = avg(r => r.outcomeReached ? 1 : 0);

    trackResults.push({
      label:      track.label,
      rps:        rpsSlots > 0 ? rpsHits / rpsSlots : 0,
      zigzag:     avg(r => r.liteZigzagScore),
      latSpd:     avg(r => r.liteLatSpeedScore),
      brake:      avg(r => r.liteBrakeRate),
      stable:     avg(r => r.liteStableOvertakes),
      overlap:    avg(r => r.liteOverlapRate),
      pValue:     fairness.pValue ?? 1,
      natOvt,
      outcome,
    });
  }
  return trackResults;
}

function avgM(trackResults, key) {
  return trackResults.reduce((s, t) => s + t[key], 0) / trackResults.length;
}
function minM(trackResults, key) {
  return Math.min(...trackResults.map(t => t[key]));
}

// ── Score (lower = better): primary = lateralSpeedScore ──────────────────────
function score(tr) {
  const latSpd = avgM(tr, 'latSpd');
  const overlap = avgM(tr, 'overlap');
  const rps    = avgM(tr, 'rps');
  const zigzag = avgM(tr, 'zigzag');
  const stable = avgM(tr, 'stable');
  return  10 * (latSpd / 0.002)          // P1: minimize lateral speed
        +  4 * (overlap / 0.15)          // P2: minimize overlap
        -  3 * (rps / 0.5)               // P3: maximize rps
        +  2 * (zigzag / 0.001)          // P5: minimize zigzag
        -  1 * (stable / 8.0);           // P6: maximize stable overtakes
}

// ─────────────────────────────────────────────────────────────────────────────
const tracks = loadTracks();

// Build 25 combos
const combos = [];
for (const d of DAMPING_VALS) {
  for (const f of FORCE_VALS) {
    combos.push({ lateralDamping: d, lateralForce: f,
                  label: `d=${d} f=${f}`, isBaseline: d === 0.45 && f === 0.010 });
  }
}

console.log('══════════════════════════════════════════════════════════════');
console.log('  Targeted sweep: lateralDamping × lateralForce');
console.log(`  25 combos × ${P1_RACES} races × 3 tracks  |  seed=${GLOBAL_SEED}`);
console.log('══════════════════════════════════════════════════════════════\n');

// ── Phase 1 ───────────────────────────────────────────────────────────────────
console.log(`PHASE 1 — ${combos.length} combos × ${P1_RACES} races\n`);

// Run baseline first so we have its overlapRate thresholds
const baselineCombo = combos.find(c => c.isBaseline);
process.stdout.write(`  [baseline] d=0.45 f=0.010 ...`);
const baselineTR = runCombo(
  { lateralDamping: 0.45, lateralForce: 0.010 }, tracks, P1_RACES, GLOBAL_SEED);
console.log(` latSpd=${avgM(baselineTR,'latSpd').toFixed(5)}  overlap=${(avgM(baselineTR,'overlap')*100).toFixed(1)}%  rps=${(avgM(baselineTR,'rps')*100).toFixed(1)}%`);

// Per-track overlap limits from baseline
const baselineOverlapByTrack = baselineTR.map(t => t.overlap);

const p1Results = [];
for (let i = 0; i < combos.length; i++) {
  const c = combos[i];
  process.stdout.write(`  [${String(i+1).padStart(2)}/${combos.length}] ${c.label.padEnd(18)}`);
  const tr = runCombo({ lateralDamping: c.lateralDamping, lateralForce: c.lateralForce },
                       tracks, P1_RACES, GLOBAL_SEED);

  // Hard cutoffs
  let eliminated = null;
  const avgZigzag = avgM(tr, 'zigzag');
  const minNatOvt = minM(tr, 'natOvt');
  const minOutcome = minM(tr, 'outcome');
  const overlapWorseCount = tr.filter((t, i) => t.overlap > baselineOverlapByTrack[i] + 1e-9).length;

  if (avgZigzag > 0.003) eliminated = `zigzag=${avgZigzag.toFixed(4)}>0.003`;
  else if (minNatOvt < 1.0) eliminated = `natOvt=${minNatOvt.toFixed(3)}<1.0`;
  else if (minOutcome < 0.9) eliminated = `outcome=${minOutcome.toFixed(2)}<0.9`;
  else if (overlapWorseCount > 0) {
    const worst = tr.map((t,i) => ({label:t.label, d: t.overlap - baselineOverlapByTrack[i]}))
                    .filter(x => x.d > 1e-9).map(x => `${x.label}:+${(x.d*100).toFixed(1)}%`).join(', ');
    eliminated = `overlap>${worst}`;
  }

  const sc = eliminated ? null : score(tr);
  const tag = eliminated ? `❌ ${eliminated}` : `✅ latSpd=${avgM(tr,'latSpd').toFixed(5)}  overlap=${(avgM(tr,'overlap')*100).toFixed(1)}%  rps=${(avgM(tr,'rps')*100).toFixed(1)}%  score=${sc.toFixed(3)}`;
  console.log(` ${tag}`);

  p1Results.push({ ...c, tr, score: sc, eliminated });
}

const p1Survivors = p1Results.filter(c => !c.eliminated).sort((a, b) => a.score - b.score);
const p1Eliminated = p1Results.filter(c => c.eliminated);

console.log(`\nPhase 1: ${p1Survivors.length}/${combos.length} survived\n`);

if (p1Survivors.length === 0) {
  console.log('No survivors — all combos eliminated. Exiting.');
  process.exit(0);
}

// ── Phase 2 ───────────────────────────────────────────────────────────────────
const top5 = p1Survivors.slice(0, P2_TOP_N);
console.log(`PHASE 2 — Top ${top5.length} × ${P2_RACES} races\n`);

// Re-run baseline with 100 races
process.stdout.write(`  [baseline] d=0.45 f=0.010 (${P2_RACES}R) ...`);
const baselineTR100 = runCombo(
  { lateralDamping: 0.45, lateralForce: 0.010 }, tracks, P2_RACES, GLOBAL_SEED);
console.log(` done  latSpd=${avgM(baselineTR100,'latSpd').toFixed(5)}  overlap=${(avgM(baselineTR100,'overlap')*100).toFixed(1)}%`);

const p2Results = [];
for (let i = 0; i < top5.length; i++) {
  const c = top5[i];
  process.stdout.write(`  [${i+1}/${top5.length}] ${c.label.padEnd(18)} (${P2_RACES}R) ...`);
  const tr = runCombo({ lateralDamping: c.lateralDamping, lateralForce: c.lateralForce },
                       tracks, P2_RACES, GLOBAL_SEED);
  const sc = score(tr);
  console.log(` done  latSpd=${avgM(tr,'latSpd').toFixed(5)}  overlap=${(avgM(tr,'overlap')*100).toFixed(1)}%  rps=${(avgM(tr,'rps')*100).toFixed(1)}%  score=${sc.toFixed(3)}`);
  p2Results.push({ ...c, tr100: tr, score100: sc });
}

p2Results.sort((a, b) => a.score100 - b.score100);
const winner = p2Results[0];

// ── Phase 1 full table ────────────────────────────────────────────────────────
console.log('\n\n══════════════════════════════════════════════════════════════');
console.log('  PHASE 1 — Full results table (25 combos, avg across 3 tracks)');
console.log('══════════════════════════════════════════════════════════════');
const hdr = ['Combo','latSpd','overlap%','rps%','zigzag','stable','minP','score','status'];
console.log(
  hdr[0].padEnd(18) + hdr[1].padStart(9) + hdr[2].padStart(10) +
  hdr[3].padStart(7) + hdr[4].padStart(9) + hdr[5].padStart(8) +
  hdr[6].padStart(7) + hdr[7].padStart(8) + '  ' + hdr[8]
);
console.log('─'.repeat(95));

// Print baseline row
const bRow = baselineTR;
console.log(
  'BASELINE (→)'.padEnd(18) +
  avgM(bRow,'latSpd').toFixed(5).padStart(9) +
  (avgM(bRow,'overlap')*100).toFixed(1).padStart(10) +
  (avgM(bRow,'rps')*100).toFixed(1).padStart(7) +
  avgM(bRow,'zigzag').toFixed(5).padStart(9) +
  avgM(bRow,'stable').toFixed(2).padStart(8) +
  minM(bRow,'pValue').toFixed(3).padStart(7) +
  '      — '.padStart(8) + '  baseline'
);

for (const c of p1Results.sort((a,b) => (a.score??99) - (b.score??99))) {
  const tr = c.tr;
  if (c.eliminated) {
    console.log(
      c.label.padEnd(18) +
      avgM(tr,'latSpd').toFixed(5).padStart(9) +
      (avgM(tr,'overlap')*100).toFixed(1).padStart(10) +
      (avgM(tr,'rps')*100).toFixed(1).padStart(7) +
      avgM(tr,'zigzag').toFixed(5).padStart(9) +
      avgM(tr,'stable').toFixed(2).padStart(8) +
      minM(tr,'pValue').toFixed(3).padStart(7) +
      '      — '.padStart(8) + `  ❌ ${c.eliminated}`
    );
  } else {
    console.log(
      c.label.padEnd(18) +
      avgM(tr,'latSpd').toFixed(5).padStart(9) +
      (avgM(tr,'overlap')*100).toFixed(1).padStart(10) +
      (avgM(tr,'rps')*100).toFixed(1).padStart(7) +
      avgM(tr,'zigzag').toFixed(5).padStart(9) +
      avgM(tr,'stable').toFixed(2).padStart(8) +
      minM(tr,'pValue').toFixed(3).padStart(7) +
      c.score.toFixed(3).padStart(8) + '  ✅'
    );
  }
}

// ── Phase 2 winner vs baseline ────────────────────────────────────────────────
console.log('\n\n══════════════════════════════════════════════════════════════');
console.log(`  PHASE 2 WINNER vs MASTER BASELINE  (${P2_RACES} races each)`);
console.log('══════════════════════════════════════════════════════════════');
console.log(`  Winner: ${winner.label}`);
console.log(`  lateralDamping=${winner.lateralDamping}  lateralForce=${winner.lateralForce}\n`);

const METRICS = [
  ['racePlanSuccessRate %', (t) => (t.rps   * 100).toFixed(1)],
  ['zigzagScore',           (t) => t.zigzag.toFixed(5)],
  ['lateralSpeedScore',     (t) => t.latSpd.toFixed(5)],
  ['brakeRate %',           (t) => (t.brake  * 100).toFixed(1)],
  ['stableOvertakes',       (t) => t.stable.toFixed(3)],
  ['overlapRate %',         (t) => (t.overlap * 100).toFixed(1)],
  ['fairness p-value',      (t) => t.pValue.toFixed(3)],
];

for (const trackIdx of [0,1,2]) {
  const tLabel = TRACK_SPECS[trackIdx].label;
  const bT = baselineTR100[trackIdx];
  const wT = winner.tr100[trackIdx];
  const W = 58;
  console.log(`\n┌${'─'.repeat(W)}┐`);
  console.log(`│  Track: ${tLabel.padEnd(W-9)}│`);
  console.log(`├${'─'.repeat(26)}┬${'─'.repeat(15)}┬${'─'.repeat(15)}┤`);
  console.log(`│ ${'Metric'.padEnd(25)}│ ${'Master baseline'.padEnd(14)}│ ${'Winner'.padEnd(14)}│`);
  console.log(`├${'─'.repeat(26)}┼${'─'.repeat(15)}┼${'─'.repeat(15)}┤`);
  for (const [name, fmt] of METRICS) {
    const a = fmt(bT), b = fmt(wT);
    console.log(`│ ${name.padEnd(25)}│ ${String(a).padEnd(14)}│ ${String(b).padEnd(14)}│`);
  }
  console.log(`└${'─'.repeat(26)}┴${'─'.repeat(15)}┴${'─'.repeat(15)}┘`);
}

// ── All Phase 2 results ranked ────────────────────────────────────────────────
console.log('\n\n══════════════════════════════════════════════════════════════');
console.log(`  ALL PHASE 2 RESULTS (${P2_RACES} races, avg across 3 tracks)`);
console.log('══════════════════════════════════════════════════════════════');
console.log(
  'Rank  Combo'.padEnd(26) +
  'latSpd'.padStart(9) + 'overlap%'.padStart(10) +
  'rps%'.padStart(7) + 'zigzag'.padStart(9) + 'stable'.padStart(8) +
  'minP'.padStart(7) + 'score'.padStart(8)
);
console.log('─'.repeat(84));
console.log(
  '  —   BASELINE'.padEnd(26) +
  avgM(baselineTR100,'latSpd').toFixed(5).padStart(9) +
  (avgM(baselineTR100,'overlap')*100).toFixed(1).padStart(10) +
  (avgM(baselineTR100,'rps')*100).toFixed(1).padStart(7) +
  avgM(baselineTR100,'zigzag').toFixed(5).padStart(9) +
  avgM(baselineTR100,'stable').toFixed(2).padStart(8) +
  minM(baselineTR100,'pValue').toFixed(3).padStart(7) + '       —'
);
for (let i = 0; i < p2Results.length; i++) {
  const c = p2Results[i];
  const tr = c.tr100;
  console.log(
    `  ${String(i+1).padStart(2)}    ${c.label}`.padEnd(26) +
    avgM(tr,'latSpd').toFixed(5).padStart(9) +
    (avgM(tr,'overlap')*100).toFixed(1).padStart(10) +
    (avgM(tr,'rps')*100).toFixed(1).padStart(7) +
    avgM(tr,'zigzag').toFixed(5).padStart(9) +
    avgM(tr,'stable').toFixed(2).padStart(8) +
    minM(tr,'pValue').toFixed(3).padStart(7) +
    c.score100.toFixed(3).padStart(8)
  );
}

console.log('\n\nNote: Do NOT apply values to defaults.js — report only.');
