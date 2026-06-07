/**
 * sweep-phase5.mjs
 * Phase A: Combination test ld + sbt (6 combos × 10 races/track × 2 tracks = 120 races).
 * Phase B: Top 3 from Phase A × 10 tracks × 50 races = 1500 races
 *           + baseline on all 10 Phase B tracks × 50 races = 500 races (for cutoff reference).
 * Total: ~1740 races.
 * Outputs to sweep-phase5-results.txt incrementally.
 */

import { readFileSync, appendFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { EditorShape }               from '../client/src/modules/track-editor/EditorShape.js';
import { DEFAULT_BASE_SPEED_CONFIG } from '../client/src/modules/storage/defaults.js';
import { RACER_CONFIGS, runSingleRace, computeFinishT } from './sim-fairness.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');
const OUT   = join(ROOT, 'sweep-phase5-results.txt');

writeFileSync(OUT, '');

function log(...args) {
  const line = args.map(String).join(' ');
  process.stdout.write(line + '\n');
  appendFileSync(OUT, line + '\n');
}

const pct     = (v, d = 2) => (v * 100).toFixed(d) + '%';
const f4      = (v) => v.toFixed(4);
const f2      = (v) => v.toFixed(2);
const T_START = Date.now();
const elapsed = () => {
  const ms = Date.now() - T_START;
  const m  = Math.floor(ms / 60000);
  const s  = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
};

// ── Hard-coded originals ───────────────────────────────────────────────────────
const ORIG_DEFAULTS = {
  lateralForce:                0.01200,
  lateralDamping:              0.25000,
  homeForceStrength:           0.04000,
  homeForceReductionOnOverlap: 0.30000,
  avoidanceDistance:           0.15000,
  speedBrakeFactor:            0.95000,
  speedBrakeTThreshold:        0.01500,
  speedBrakeYThreshold:        0.20000,
};

// Phase 4 recommended set — base for all Phase 5 combos except where overridden
const PH4_BASE = {
  lateralForce:                0.011400,
  lateralDamping:              0.175000,
  homeForceStrength:           0.030000,
  homeForceReductionOnOverlap: 0.300000,
  avoidanceDistance:           0.180000,
  speedBrakeFactor:            0.945000,
  speedBrakeTThreshold:        0.013838,
  speedBrakeYThreshold:        0.180000,
};

const PARAM_KEYS = [
  'lateralForce', 'lateralDamping', 'homeForceStrength',
  'homeForceReductionOnOverlap', 'avoidanceDistance',
  'speedBrakeFactor', 'speedBrakeTThreshold', 'speedBrakeYThreshold',
];
const SHORT = {
  lateralForce: 'lf', lateralDamping: 'ld', homeForceStrength: 'hfs',
  homeForceReductionOnOverlap: 'hfr', avoidanceDistance: 'ad',
  speedBrakeFactor: 'sbf', speedBrakeTThreshold: 'sbt', speedBrakeYThreshold: 'sby',
};

// ── Phase A combo list ─────────────────────────────────────────────────────────
const PHASE_A_COMBOS = [
  { params: { ...ORIG_DEFAULTS },                                                            label: 'baseline'                   },
  { params: { ...PH4_BASE },                                                                 label: 'ph4-base'                   },
  { params: { ...PH4_BASE, lateralDamping: 0.166250 },                                      label: 'ld=0.16625+sbt=0.013838'    },
  { params: { ...PH4_BASE, lateralDamping: 0.166250, speedBrakeTThreshold: 0.013500 },      label: 'ld=0.16625 only'            },
  { params: { ...PH4_BASE, lateralDamping: 0.160000 },                                      label: 'ld=0.16000+sbt=0.013838'    },
  { params: { ...PH4_BASE, lateralDamping: 0.166250, speedBrakeTThreshold: 0.014175 },      label: 'ld=0.16625+sbt=0.014175'    },
];

// ── Phase B track list ────────────────────────────────────────────────────────
const PHASE_B_TRACKS = [
  { id: 'dirt-oval',      name: 'Dirt Oval',       racerType: 'horse',   nRacers: 40, durSec: 60 },
  { id: 'garden-path',    name: 'Garden Path',      racerType: 'horse',   nRacers: 40, durSec: 60 },
  { id: 'city-circuit',   name: 'City Circuit',     racerType: 'f1',      nRacers: 40, durSec: 60 },
  { id: 'ice-track',      name: 'Ice Track',        racerType: 'luge',    nRacers: 40, durSec: 60 },
  { id: 'searound',       name: 'Searound',         racerType: 'manta',   nRacers: 40, durSec: 60 },
  { id: '90d3020197da',   name: 'Luger Hill',       racerType: 'luge',    nRacers: 50, durSec: 60 },
  { id: 'space-sprint',   name: 'Space Sprint',     racerType: 'rocket',  nRacers: 60, durSec: 60 },
  { id: 'river-run',      name: 'River Run',        racerType: 'dolphin', nRacers: 50, durSec: 60 },
  { id: 'mountainstreet', name: 'Mountainstreet',   racerType: 'horse',   nRacers: 50, durSec: 60 },
  { id: 'seatrack',       name: 'Seatrack',         racerType: 'dolphin', nRacers: 50, durSec: 60 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const BASE_SPEED_MEAN = (DEFAULT_BASE_SPEED_CONFIG.min + DEFAULT_BASE_SPEED_CONFIG.max) / 2;

function chiSquareP(observed) {
  const total = observed.reduce((s, c) => s + c, 0);
  if (total === 0) return 1;
  const n = observed.length, exp = total / n;
  let chi2 = 0;
  for (const c of observed) chi2 += (c - exp) ** 2 / exp;
  const df = n - 1;
  const h  = chi2 / df - 1 + 2 / (9 * df);
  const z  = h / Math.sqrt(2 / (9 * df));
  return Math.max(0, Math.min(1, 1 - 0.5 * (1 + Math.sign(z) * Math.sqrt(1 - Math.exp(-2 * z * z / Math.PI)))));
}

function loadTrack(trackId, racerType, nRacers, durSec) {
  const raw   = JSON.parse(readFileSync(join(ROOT, 'server/data/tracks', `${trackId}.json`), 'utf8'));
  const shape = new EditorShape(raw);
  const isOpen              = !!shape.isOpen;
  const pathLengthPx        = raw.pathLengthPx ?? shape.getTotalLength();
  const geometricTrackWidth = raw.width ?? shape.getActualTrackWidth();
  const { displaySize, bodyFillX, bodyFillY, speedMultiplier } = RACER_CONFIGS[racerType];
  const finishT = computeFinishT(BASE_SPEED_MEAN, speedMultiplier, durSec, isOpen);
  return { id: trackId, shape, isOpen, pathLengthPx, geometricTrackWidth,
           displaySize, bodyFillX, bodyFillY, speedMultiplier, finishT, nRacers, durSec };
}

function runOnTrack(td, params, nRaces, seed0) {
  const hard = [], soft = [], zig = [], lat = [], so = [], fin = [];
  const tally = new Array(td.nRacers).fill(0);
  for (let r = 0; r < nRaces; r++) {
    const res = runSingleRace({
      shape: td.shape ?? td, pathLengthPx: td.pathLengthPx,
      geometricTrackWidth: td.geometricTrackWidth, isOpen: td.isOpen,
      speedMultiplier: td.speedMultiplier, displaySize: td.displaySize,
      bodyFillX: td.bodyFillX, bodyFillY: td.bodyFillY,
      finishT: td.finishT, targetSeconds: td.durSec,
      seed: seed0 + r, nRacers: td.nRacers,
      behaviorConfigOverrides: params,
    });
    hard.push(res.liteHardOverlapRate ?? 0);
    soft.push(res.liteSoftOverlapRate ?? 0);
    zig .push(res.liteZigzagScore     ?? 0);
    lat .push(res.liteLatSpeedScore   ?? 0);
    so  .push(res.liteStableOvertakes ?? 0);
    const fin2 = res.filter((r2) => r2.finishTime != null);
    fin.push(fin2.length > 0 ? fin2.reduce((s, r2) => s + r2.finishTime, 0) / fin2.length : td.durSec);
    for (const r2 of res)
      if (r2.finalRank != null && r2.finalRank >= 1 && r2.finalRank <= td.nRacers)
        tally[r2.finalRank - 1]++;
  }
  const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  return { hardOverlapRate: avg(hard), softOverlapRate: avg(soft), zigzagScore: avg(zig),
           lateralSpeedScore: avg(lat), stableOvertakes: avg(so),
           meanFinishTime: avg(fin), pValue: chiSquareP(tally) };
}

function passes(m, base) {
  return (
    m.pValue            >= 0.05 &&
    m.zigzagScore       <= 0.003 &&
    m.hardOverlapRate   <= 0.03 &&
    m.lateralSpeedScore <= base.lateralSpeedScore * 2 &&
    m.meanFinishTime    >= base.meanFinishTime * 0.85 &&
    m.meanFinishTime    <= base.meanFinishTime * 1.15
  );
}

function failReasons(m, base) {
  const r = [];
  if (m.pValue            <  0.05)                        r.push('FAIRNESS');
  if (m.zigzagScore       >  0.003)                       r.push('ZIGZAG');
  if (m.hardOverlapRate   >  0.03)                        r.push('HARD_OVERLAP');
  if (m.lateralSpeedScore >  base.lateralSpeedScore * 2)  r.push('LAT_SPEED');
  if (m.meanFinishTime    <  base.meanFinishTime * 0.85)  r.push('FINISH_LOW');
  if (m.meanFinishTime    >  base.meanFinishTime * 1.15)  r.push('FINISH_HIGH');
  return r.join(', ') || 'OK';
}

const WEIGHTS = [
  { k: 'hardOverlapRate',   w: 0.30, inv: false },
  { k: 'zigzagScore',       w: 0.25, inv: false },
  { k: 'lateralSpeedScore', w: 0.20, inv: false },
  { k: 'softOverlapRate',   w: 0.10, inv: false },
  { k: 'stableOvertakes',   w: 0.10, inv: true  },
];

function computeScores(rows, mKey) {
  const mm = {};
  for (const { k } of WEIGHTS) {
    const vals = rows.map((r) => r[mKey][k]);
    mm[k] = { min: Math.min(...vals), max: Math.max(...vals) };
  }
  for (const row of rows) {
    let s = 0;
    for (const { k, w, inv } of WEIGHTS) {
      const { min, max } = mm[k];
      if (max === min) continue;
      const n = (row[mKey][k] - min) / (max - min);
      s += w * (inv ? 1 - n : n);
    }
    row[`score_${mKey}`] = s;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  HEADER
// ══════════════════════════════════════════════════════════════════════════════

log('');
log('══════════════════════════════════════════════════════════════════════');
log(' SWEEP Phase 5 — Combination test + cross-track validation');
log(`  Started: ${new Date().toISOString()}`);
log('  Phase A: 6 combos × 10 races × 2 tracks = 120 races');
log('  Phase B: 4 combos × 10 tracks × 50 races = 2000 races (incl. baseline ref)');
log('  Total: ~2120 races  |  Estimated runtime: ~35 min');
log('══════════════════════════════════════════════════════════════════════');
log('');
log('  Phase 4 base (center for all Phase 5 combos):');
for (const key of PARAM_KEYS) {
  const b = PH4_BASE[key], d = ORIG_DEFAULTS[key];
  const p = ((b - d) / d * 100).toFixed(1);
  log(`    ${SHORT[key].padEnd(4)} = ${b.toFixed(6)}  (default ${d.toFixed(5)}, ${p.padStart(5)}%)`);
}
log('');
log('  Phase A combos:');
PHASE_A_COMBOS.forEach((c, i) => {
  const changes = PARAM_KEYS
    .filter((k) => Math.abs(c.params[k] - PH4_BASE[k]) > 1e-9 && Math.abs(c.params[k] - ORIG_DEFAULTS[k]) > 1e-9)
    .map((k) => `${SHORT[k]}=${c.params[k].toFixed(6)}`).join(' ');
  log(`    #${i}: ${c.label}${changes ? '  [' + changes + ']' : ''}`);
});
log('');

// ══════════════════════════════════════════════════════════════════════════════
//  PHASE A
// ══════════════════════════════════════════════════════════════════════════════

log('══ PHASE A ═══════════════════════════════════════════════════════════');
log('');

const tDO = loadTrack('dirt-oval',    'horse',  40, 60);
const tSS = loadTrack('space-sprint', 'rocket', 60, 60);

log(`  Dirt Oval:    isOpen=${tDO.isOpen}  pathLen=${Math.round(tDO.pathLengthPx)}px  finishT=${tDO.finishT.toFixed(5)}`);
log(`  Space Sprint: isOpen=${tSS.isOpen}  pathLen=${Math.round(tSS.pathLengthPx)}px  finishT=${tSS.finishT.toFixed(5)}`);
log('');
log('── Running Phase A…');
log('');

const phAResults = [];
for (let i = 0; i < PHASE_A_COMBOS.length; i++) {
  const { params, label } = PHASE_A_COMBOS[i];
  const mDO = runOnTrack(tDO, params, 10, 5000 + i * 10);
  const mSS = runOnTrack(tSS, params, 10, 9000 + i * 10);
  phAResults.push({ i, label, params, mDO, mSS });

  if ((i + 1) % 2 === 0 || i === PHASE_A_COMBOS.length - 1) {
    // Quick progress
    const tmp = phAResults.map((r) => ({ ...r }));
    computeScores(tmp, 'mDO');
    computeScores(tmp, 'mSS');
    for (const r of tmp) r.score = (r.score_mDO + r.score_mSS) / 2;
    tmp.sort((a, b) => a.score - b.score);
    appendFileSync(OUT, `\n--- Phase A progress after combo ${i + 1}/${PHASE_A_COMBOS.length} (${elapsed()}) ---\n`);
    appendFileSync(OUT, `  Best: #${tmp[0].i} "${tmp[0].label}"  score=${tmp[0].score.toFixed(4)}\n`);
    process.stderr.write(`  PhA ${i + 1}/${PHASE_A_COMBOS.length}  ${elapsed()}\n`);
  }
}

// Final Phase A scoring
computeScores(phAResults, 'mDO');
computeScores(phAResults, 'mSS');
for (const r of phAResults) r.score = (r.score_mDO + r.score_mSS) / 2;

const phABase   = phAResults[0];
const phABaseDO = phABase.mDO, phABaseSS = phABase.mSS;
for (const r of phAResults) {
  r.passDO  = passes(r.mDO, phABaseDO);
  r.passSS  = passes(r.mSS, phABaseSS);
  r.passAll = r.passDO && r.passSS;
}
const phASorted = [...phAResults].sort((a, b) => a.score - b.score);

log('═══ PHASE A COMPLETE ═══');
log(`  Runtime so far: ${elapsed()}`);
log('');
log('  All 6 combos sorted by composite score:');
log('');
log('  # | label                          | score  | DO-hard | DO-zig  | DO-lat  | SS-hard | SS-zig  | SS-lat  | DO | SS');
log('  ' + '─'.repeat(113));
for (const r of phASorted) {
  const d = r.mDO, s = r.mSS;
  log(`  ${String(r.i).padStart(1)} | ${r.label.padEnd(30)} | ${r.score.toFixed(4)} | ${pct(d.hardOverlapRate).padStart(7)} | ${f4(d.zigzagScore).padStart(7)} | ${f4(d.lateralSpeedScore).padStart(7)} | ${pct(s.hardOverlapRate).padStart(7)} | ${f4(s.zigzagScore).padStart(7)} | ${f4(s.lateralSpeedScore).padStart(7)} | ${r.passDO ? 'OK' : 'FA'} | ${r.passSS ? 'OK' : 'FA'}`);
}
log('');

// Combination analysis
const c1 = phAResults[1]; // ph4-base: sbt win alone (ld=0.175)
const c2 = phAResults[2]; // ld=0.16625 + sbt combined
const c3 = phAResults[3]; // ld=0.16625 alone (old sbt)
const c4 = phAResults[4]; // ld=0.160 + sbt
const c5 = phAResults[5]; // ld=0.16625 + higher sbt
log('  Combination analysis (does ld + sbt together beat each alone?):');
log(`    ld alone  (combo #3): score=${c3.score.toFixed(4)}  ld=0.16625 sbt=0.013500`);
log(`    sbt alone (combo #1): score=${c1.score.toFixed(4)}  ld=0.17500 sbt=0.013838`);
log(`    combined  (combo #2): score=${c2.score.toFixed(4)}  ld=0.16625 sbt=0.013838`);
log(`    deeper ld (combo #4): score=${c4.score.toFixed(4)}  ld=0.16000 sbt=0.013838`);
log(`    higher sbt(combo #5): score=${c5.score.toFixed(4)}  ld=0.16625 sbt=0.014175`);
const combined_beats_both = c2.score < c1.score && c2.score < c3.score;
log(`    → Combined beats both alone? ${combined_beats_both ? 'YES' : 'NO'}`);
if (combined_beats_both) {
  const impVsSbt = ((c1.score - c2.score) / c1.score * 100).toFixed(1);
  const impVsLd  = ((c3.score - c2.score) / c3.score * 100).toFixed(1);
  log(`      vs sbt-alone: +${impVsSbt}% improvement`);
  log(`      vs ld-alone:  +${impVsLd}% improvement`);
}
log('');

// Top 3 (excluding baseline)
const phATop3 = phASorted.filter((r) => r.i !== 0).slice(0, 3);

log('  Top 3 combos — full parameter values:');
log('');
for (let rank = 0; rank < phATop3.length; rank++) {
  const r = phATop3[rank];
  log(`  #${rank + 1}  Phase A combo ${r.i} "${r.label}"  score=${r.score.toFixed(5)}`);
  for (const key of PARAM_KEYS) {
    const val  = r.params[key];
    const def  = ORIG_DEFAULTS[key];
    const base = PH4_BASE[key];
    const pch  = ((val - def) / def * 100).toFixed(1);
    const bch  = Math.abs(val - base) < 1e-9 ? '  (=ph4-base)' : `  (ph4-base ${base.toFixed(6)})`;
    log(`    ${SHORT[key].padEnd(4)} = ${val.toFixed(6)}  (default ${def.toFixed(5)}, ${pch.padStart(5)}%)${bch}`);
  }
  const d = r.mDO, s = r.mSS;
  log(`    DO: hard=${pct(d.hardOverlapRate)} zig=${f4(d.zigzagScore)} lat=${f4(d.lateralSpeedScore)} stOvt=${f2(d.stableOvertakes)} p=${d.pValue.toFixed(3)} finT=${f2(d.meanFinishTime)}s  ${r.passDO ? 'OK' : 'FAIL'}`);
  log(`    SS: hard=${pct(s.hardOverlapRate)} zig=${f4(s.zigzagScore)} lat=${f4(s.lateralSpeedScore)} stOvt=${f2(s.stableOvertakes)} p=${s.pValue.toFixed(3)} finT=${f2(s.meanFinishTime)}s  ${r.passSS ? 'OK' : 'FAIL'}`);
  log('');
}
log('  Starting Phase B automatically...');
log('');

// ══════════════════════════════════════════════════════════════════════════════
//  PHASE B
// ══════════════════════════════════════════════════════════════════════════════

log('══ PHASE B ═══════════════════════════════════════════════════════════');
log(`  Top 3 from Phase A: ${phATop3.map((r) => `#${r.i} "${r.label}"`).join(', ')}`);
log(`  + baseline (for cutoff reference)`);
log(`  10 tracks × 50 races × 4 combos = 2000 races total`);
log('');

// Load all Phase B tracks
const phBTracks = PHASE_B_TRACKS.map((t) => ({
  ...loadTrack(t.id, t.racerType, t.nRacers, t.durSec),
  name: t.name, racerType: t.racerType, nRacers: t.nRacers,
}));

log('  Phase B tracks:');
for (const t of phBTracks) {
  log(`    ${t.name.padEnd(16)}: isOpen=${String(t.isOpen).padEnd(5)}  pathLen=${String(Math.round(t.pathLengthPx)).padStart(6)}px  racerType=${t.racerType.padEnd(8)}  nRacers=${t.nRacers}  finishT=${t.finishT.toFixed(5)}`);
}
log('');
log('── Running Phase B…');
log('');

// phBData[comboIdx][trackIdx] = metrics
// comboIdx 0 = baseline, 1-3 = top 3
const phBCombos  = [{ params: { ...ORIG_DEFAULTS }, label: 'baseline', phACombo: 0 }, ...phATop3.map((r) => ({ params: r.params, label: r.label, phACombo: r.i }))];
const phBData    = Array.from({ length: phBCombos.length }, () => new Array(phBTracks.length).fill(null));

for (let ti = 0; ti < phBTracks.length; ti++) {
  const track = phBTracks[ti];
  for (let ci = 0; ci < phBCombos.length; ci++) {
    const { params } = phBCombos[ci];
    // Seeds: 20000 + ci*10000 + ti*100 + raceOffset
    const seed0 = 20000 + ci * 10000 + ti * 100;
    phBData[ci][ti] = runOnTrack(track, params, 50, seed0);
  }

  // Progress after each track
  const doneCount = ti + 1;
  const lines = [
    ``,
    `--- Phase B progress: track ${doneCount}/${phBTracks.length} complete — "${track.name}" (${elapsed()}) ---`,
  ];
  // Quick per-combo summary for this track
  for (let ci = 0; ci < phBCombos.length; ci++) {
    const m = phBData[ci][ti];
    lines.push(`  ${phBCombos[ci].label.padEnd(32)}: hard=${pct(m.hardOverlapRate)} zig=${f4(m.zigzagScore)} lat=${f4(m.lateralSpeedScore)} p=${m.pValue.toFixed(3)} finT=${f2(m.meanFinishTime)}s`);
  }
  lines.push('');
  appendFileSync(OUT, lines.join('\n') + '\n');
  process.stderr.write(`  PhB track ${doneCount}/10 "${track.name}"  ${elapsed()}\n`);
}

log('');
log(`  All Phase B races complete.  ${elapsed()}`);
log('');

// ── Phase B scoring per track ──────────────────────────────────────────────────
// For each track, normalize across all 4 combos (baseline + top 3)
const phBScores = Array.from({ length: phBCombos.length }, () => new Array(phBTracks.length).fill(0));
const phBPass   = Array.from({ length: phBCombos.length }, () => new Array(phBTracks.length).fill(false));

for (let ti = 0; ti < phBTracks.length; ti++) {
  const rows = phBCombos.map((_, ci) => ({ mB: phBData[ci][ti] }));
  computeScores(rows, 'mB');
  for (let ci = 0; ci < phBCombos.length; ci++) {
    phBScores[ci][ti] = rows[ci].score_mB;
    phBPass[ci][ti]   = passes(phBData[ci][ti], phBData[0][ti]);
  }
}

// Mean score across all 10 tracks for each combo
const phBMeanScore = phBCombos.map((_, ci) =>
  phBScores[ci].reduce((s, v) => s + v, 0) / phBTracks.length
);
// Pass-all-tracks flag (excluding baseline from winner determination)
const phBPassAll = phBCombos.map((_, ci) =>
  phBPass[ci].every(Boolean)
);

// ── Phase B report ─────────────────────────────────────────────────────────────
log('═══ PHASE B COMPLETE ═══');
log(`  Runtime: ${elapsed()}`);
log('');

// Per-combo per-track tables
const trackNameW = Math.max(...phBTracks.map((t) => t.name.length));

for (let ci = 1; ci < phBCombos.length; ci++) {
  const { label, phACombo } = phBCombos[ci];
  log(`  ── Combo: Phase A #${phACombo} "${label}"  mean-score=${phBMeanScore[ci].toFixed(5)}  passes-all=${phBPassAll[ci] ? 'YES' : 'NO'} ──`);
  log('');
  log(`  ${'Track'.padEnd(trackNameW)} | hard%  |  zig    |  lat    | stOvt | p-val | finT    | pass`);
  log('  ' + '─'.repeat(trackNameW + 64));
  for (let ti = 0; ti < phBTracks.length; ti++) {
    const m    = phBData[ci][ti];
    const base = phBData[0][ti];
    const ok   = passes(m, base);
    const why  = ok ? 'OK' : failReasons(m, base);
    log(`  ${phBTracks[ti].name.padEnd(trackNameW)} | ${pct(m.hardOverlapRate,3).padStart(6)} | ${f4(m.zigzagScore).padStart(7)} | ${f4(m.lateralSpeedScore).padStart(7)} | ${f2(m.stableOvertakes).padStart(5)} | ${m.pValue.toFixed(3)} | ${f2(m.meanFinishTime)}s | ${why}`);
  }
  log(`  ${'MEAN (all 10 tracks)'.padEnd(trackNameW)} |        |         |         |       |       |         | score=${phBMeanScore[ci].toFixed(5)}`);
  log('');
}

// Summary comparison table
log('  Summary — mean scores across all 10 tracks:');
log('');
log(`  ${'Combo'.padEnd(34)} | mean-score | passes-all | improvement-vs-baseline`);
log('  ' + '─'.repeat(82));
for (let ci = 1; ci < phBCombos.length; ci++) {
  const imp = ((phBMeanScore[0] - phBMeanScore[ci]) / phBMeanScore[0] * 100).toFixed(1);
  log(`  ${phBCombos[ci].label.padEnd(34)} | ${phBMeanScore[ci].toFixed(5).padStart(10)} | ${phBPassAll[ci] ? '        YES' : '         NO'} | ${imp}%`);
}
log('');

// Overall winner
const top3Indices = [1, 2, 3]; // Phase B combos 1-3 (excluding baseline at ci=0)
const passingCandidates = top3Indices.filter((ci) => phBPassAll[ci]);
let winnerCi;
if (passingCandidates.length > 0) {
  winnerCi = passingCandidates.reduce((best, ci) => phBMeanScore[ci] < phBMeanScore[best] ? ci : best);
} else {
  winnerCi = top3Indices.reduce((best, ci) => phBMeanScore[ci] < phBMeanScore[best] ? ci : best);
  log('  WARNING: No combo passed all hard cutoffs on every track. Showing least-bad.');
}
const winner = phBCombos[winnerCi];

log(`  OVERALL WINNER — Phase A #${winner.phACombo} "${winner.label}"`);
log(`    Mean composite score across 10 tracks: ${phBMeanScore[winnerCi].toFixed(5)}`);
log(`    Passes all cutoffs on all 10 tracks:   ${phBPassAll[winnerCi] ? 'YES' : 'NO'}`);
log('');

// Per-track detail for winner
log('  Winner — per-track breakdown:');
log(`  ${'Track'.padEnd(trackNameW)} | hard%  |  zig    |  lat    | stOvt | p-val | finT    | pass`);
log('  ' + '─'.repeat(trackNameW + 64));
for (let ti = 0; ti < phBTracks.length; ti++) {
  const m    = phBData[winnerCi][ti];
  const base = phBData[0][ti];
  const ok   = passes(m, base);
  const why  = ok ? 'OK' : failReasons(m, base);
  log(`  ${phBTracks[ti].name.padEnd(trackNameW)} | ${pct(m.hardOverlapRate,3).padStart(6)} | ${f4(m.zigzagScore).padStart(7)} | ${f4(m.lateralSpeedScore).padStart(7)} | ${f2(m.stableOvertakes).padStart(5)} | ${m.pValue.toFixed(3)} | ${f2(m.meanFinishTime)}s | ${why}`);
}
log('');

// Absolute final recommended set
log('  ABSOLUTE FINAL RECOMMENDED SET:');
log('');
for (const key of PARAM_KEYS) {
  const val = winner.params[key];
  const def = ORIG_DEFAULTS[key];
  const pch = ((val - def) / def * 100).toFixed(1);
  log(`    ${SHORT[key].padEnd(4)} = ${val.toFixed(6)}  (${pch}% from original default ${def.toFixed(5)})`);
}
log('');

// Comparison table winner vs baseline
log('  Comparison — winner vs original baseline:');
log('');
log(`  ${'param'.padEnd(30)} | original default | winner value | change`);
log('  ' + '─'.repeat(70));
for (const key of PARAM_KEYS) {
  const val = winner.params[key];
  const def = ORIG_DEFAULTS[key];
  const pch = ((val - def) / def * 100).toFixed(1);
  const arrow = Math.abs(val - def) < 1e-9 ? '  (unchanged)' : `  ${pch}%`;
  log(`  ${key.padEnd(30)} | ${def.toFixed(6).padStart(16)} | ${val.toFixed(6).padStart(12)} |${arrow}`);
}
log('');

// Per-metric improvement vs baseline (mean across all 10 tracks)
const METRICS = [
  { key: 'hardOverlapRate',   label: 'hardOverlapRate   ' },
  { key: 'zigzagScore',       label: 'zigzagScore       ' },
  { key: 'lateralSpeedScore', label: 'lateralSpeedScore ' },
  { key: 'softOverlapRate',   label: 'softOverlapRate   ' },
  { key: 'stableOvertakes',   label: 'stableOvertakes   ' },
  { key: 'pValue',            label: 'fairness pValue   ' },
  { key: 'meanFinishTime',    label: 'meanFinishTime    ' },
];
log('  Per-metric improvement (winner vs baseline — mean across all 10 tracks):');
log('');
log(`  ${'metric'.padEnd(20)} | baseline mean | winner mean  | improvement`);
log('  ' + '─'.repeat(68));
for (const { key, label } of METRICS) {
  const baseVals   = phBTracks.map((_, ti) => phBData[0][ti][key]);
  const winnerVals = phBTracks.map((_, ti) => phBData[winnerCi][ti][key]);
  const baseMean   = baseVals.reduce((s, v) => s + v, 0) / baseVals.length;
  const winMean    = winnerVals.reduce((s, v) => s + v, 0) / winnerVals.length;
  let impStr;
  if (baseMean === 0) {
    impStr = winMean === 0 ? '(both zero)' : `winner higher`;
  } else {
    const imp = ((baseMean - winMean) / baseMean * 100).toFixed(1);
    impStr = `${imp}% ${Number(imp) > 0 ? 'better' : 'worse'}`;
  }
  log(`  ${label} | ${baseMean.toFixed(6).padStart(13)} | ${winMean.toFixed(6).padStart(12)} | ${impStr}`);
}
log('');
log('AWAITING USER INPUT.');
