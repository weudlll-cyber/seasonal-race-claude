#!/usr/bin/env node
// ============================================================
// File:        param-sweep-braking-phase2.mjs
// Path:        scripts/param-sweep-braking-phase2.mjs
// Project:     RaceArena
// Created:     2026-05-31
// Description: Phase 2 braking sweep — top-5 Phase 1 survivors + baseline
//              × 3 tracks × 100 races; use --quick for a fast dev run.
// ============================================================

// scripts/param-sweep-braking-phase2.mjs
// Phase 2 braking parameter sweep — top 5 from Phase 1 + baseline × 3 tracks × 100 races.
//
// Usage:
//   node scripts/param-sweep-braking-phase2.mjs
//   node scripts/param-sweep-braking-phase2.mjs --out=client/tmp/sweep-braking-phase2
//   node scripts/param-sweep-braking-phase2.mjs --quick  (3 combos × 1 track × 5 races for dev)

import { spawnSync }  from 'child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT     = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIM_PATH = join(ROOT, 'scripts', 'sim-fairness.mjs');

function argVal(name, def) {
  const flag = process.argv.find((a) => a.startsWith(`--${name}=`));
  return flag ? flag.slice(name.length + 3) : def;
}
const IS_QUICK = process.argv.includes('--quick');
const N_RACES  = Number(argVal('races', IS_QUICK ? '5' : '100'));
const OUT_REL  = argVal('out', 'client/tmp/sweep-braking-phase2');
const OUT_BASE = join(ROOT, OUT_REL);
const SEED     = argVal('seed', '42');
const DUR      = argVal('dur', '60');

// ── Fixed lateral params (Phase 2 lateral winner) ────────────────────────────
const FIXED_BEHAVIOR = {
  lateralForce:                0.014,
  lateralDamping:              0.45,
  homeForceStrength:           0.040,
  homeForceReductionOnOverlap: 0.15,
  avoidanceDistance:           0.15,
};

// ── Baseline (current defaults) ───────────────────────────────────────────────
const BASELINE_BRAKING = {
  speedBrakeFactor:     0.95,
  speedBrakeTThreshold: 0.015,
  speedBrakeYThreshold: 0.20,
};

// ── Top 5 from Phase 1 + baseline ────────────────────────────────────────────
// Phase 1 scores (10 races each): 34.227 / 33.497 / 32.681 / 31.841 / 31.457
const COMBOS = IS_QUICK
  ? [
      { speedBrakeFactor: 0.98, speedBrakeTThreshold: 0.008, speedBrakeYThreshold: 0.12 }, // rank 1
      { speedBrakeFactor: 0.98, speedBrakeTThreshold: 0.008, speedBrakeYThreshold: 0.20 }, // rank 2
      { speedBrakeFactor: 0.95, speedBrakeTThreshold: 0.015, speedBrakeYThreshold: 0.20 }, // baseline
    ]
  : [
      { speedBrakeFactor: 0.98, speedBrakeTThreshold: 0.008, speedBrakeYThreshold: 0.12 }, // rank 1
      { speedBrakeFactor: 0.98, speedBrakeTThreshold: 0.008, speedBrakeYThreshold: 0.20 }, // rank 2
      { speedBrakeFactor: 0.98, speedBrakeTThreshold: 0.008, speedBrakeYThreshold: 0.16 }, // rank 3
      { speedBrakeFactor: 0.98, speedBrakeTThreshold: 0.012, speedBrakeYThreshold: 0.12 }, // rank 4
      { speedBrakeFactor: 0.98, speedBrakeTThreshold: 0.012, speedBrakeYThreshold: 0.16 }, // rank 5
      { speedBrakeFactor: 0.95, speedBrakeTThreshold: 0.015, speedBrakeYThreshold: 0.20 }, // baseline
    ];

function isBaseline(combo) {
  return (
    combo.speedBrakeFactor     === BASELINE_BRAKING.speedBrakeFactor &&
    combo.speedBrakeTThreshold === BASELINE_BRAKING.speedBrakeTThreshold &&
    combo.speedBrakeYThreshold === BASELINE_BRAKING.speedBrakeYThreshold
  );
}

const TRACK_RACER_PAIRS = IS_QUICK
  ? [{ track: 'space-sprint', racer: 'rocket', racers: 50 }]
  : [
      { track: 'space-sprint', racer: 'rocket', racers: 50 },
      { track: 'luger-hill', racer: 'luge',   racers: 50 },
      { track: 'dirt-oval',    racer: 'horse',  racers: 40 },
    ];

// ── Scoring (same formula as Phase 1) ─────────────────────────────────────────
function hardFail(m, baselineRate) {
  if ((m.zigzagScore    ?? 0) >  0.003) return 'zigzag';
  if ((m.natOvt         ?? 1) <  1.0)  return 'natOvt';
  if ((m.outcomeReached ?? 1) <  0.90) return 'outcomeReached';
  if (baselineRate !== undefined && (m.brakeRate ?? 0) > baselineRate + 1e-6) return 'brakeRate↑';
  return null;
}

function score(m, baselineRate) {
  if (hardFail(m, baselineRate)) return -Infinity;
  return (
    - (m.zigzagScore       ?? 0) * 500
    - (m.brakeRate         ?? 0) * 5
    + (m.stableOvertakes   ?? 0) * 2
    - (m.lateralSpeedScore ?? 0) * 200
    - (m.overlapRate       ?? 0) * 1
    + (m.pValue            ?? 0) * 0.5
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('\n=== param-sweep-braking Phase 2 ===');
console.log(`Combos     : ${COMBOS.length} (top 5 + baseline)`);
console.log(`Races/combo: ${N_RACES}`);
console.log(`Seed       : ${SEED}`);
console.log(`Tracks     : ${TRACK_RACER_PAIRS.map((p) => `${p.track}/${p.racer}(${p.racers}R)`).join(', ')}`);
console.log(`Duration   : ${DUR}s`);
console.log(`Total runs : ${COMBOS.length * TRACK_RACER_PAIRS.length}`);
if (IS_QUICK) console.log('*** QUICK MODE ***');
console.log('');

mkdirSync(OUT_BASE, { recursive: true });

const allResults = [];
const startTime  = Date.now();
let   runIndex   = 0;
const totalRuns  = COMBOS.length * TRACK_RACER_PAIRS.length;

for (const combo of COMBOS) {
  const tag = isBaseline(combo) ? ' [BASELINE]' : '';
  for (const { track, racer, racers: nRacers } of TRACK_RACER_PAIRS) {
    runIndex++;
    const outDir   = join(OUT_BASE, `run_${runIndex}`);
    const outRel   = `${OUT_REL}/run_${runIndex}`;
    const jsonPath = join(outDir, 'fairness-data.json');

    const bF = combo.speedBrakeFactor.toFixed(2);
    const bT = combo.speedBrakeTThreshold.toFixed(3);
    const bY = combo.speedBrakeYThreshold.toFixed(2);
    process.stdout.write(`[${runIndex}/${totalRuns}] bF=${bF} bT=${bT} bY=${bY}${tag} ${racer}@${track.slice(-10)}  `);

    mkdirSync(outDir, { recursive: true });

    const behaviorJson = JSON.stringify({ ...FIXED_BEHAVIOR, ...combo });
    const args = [
      SIM_PATH,
      `--races=${N_RACES}`,
      `--track=${track}`,
      `--racer=${racer}`,
      `--racers=${nRacers}`,
      `--dur=${DUR}`,
      `--race-plan=true`,
      `--seed=${SEED}`,
      `--out=${outRel}`,
      `--behavior=${behaviorJson}`,
    ];

    const result = spawnSync('node', args, { encoding: 'utf8', timeout: 600_000 });

    if (result.status !== 0 || !existsSync(jsonPath)) {
      console.log(`ERROR (exit ${result.status})`);
      if (result.stderr) console.error(result.stderr.slice(0, 300));
      continue;
    }

    let data;
    try { data = JSON.parse(readFileSync(jsonPath, 'utf8')); }
    catch { console.log('ERROR (parse)'); continue; }

    for (const res of data.results) {
      const n = res.avgNaturalness;
      const m = {
        pValue:            res.stats?.pValue ?? 0,
        chiSq:             res.stats?.chiSq ?? 0,
        natOvt:            n?.naturalOvertakeFraction ?? 1,
        zigzagScore:       n?.zigzagScore ?? 0,
        lateralSpeedScore: n?.lateralSpeedScore ?? 0,
        brakeRate:         n?.brakeRate ?? 0,
        stableOvertakes:   n?.stableOvertakes ?? 0,
        overlapRate:       n?.overlapRate ?? 0,
        overlapResolutionFrames: n?.overlapResolutionFrames ?? 0,
        outcomeReached:    n?.outcomeReached ?? 1,
      };
      allResults.push({
        combo,
        isBaseline: isBaseline(combo),
        track: res.trackName,
        racer: res.racerType,
        metrics: m,
      });
      console.log(
        `p=${m.pValue.toFixed(3)}` +
        `  zig=${m.zigzagScore.toFixed(6)}` +
        `  brake=${(m.brakeRate * 100).toFixed(1)}%` +
        `  ovt=${m.stableOvertakes.toFixed(3)}` +
        `  latSpd=${m.lateralSpeedScore.toFixed(6)}` +
        `  ovlp=${(m.overlapRate * 100).toFixed(1)}%`
      );
    }
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\nPhase 2 completed in ${elapsed}s`);

// ── Post-process: baseline brakeRate per track ────────────────────────────────
const tracks = [...new Set(allResults.map((r) => r.track))];
const baselineByTrack = {};
for (const tn of tracks) {
  const br = allResults.find((r) => r.isBaseline && r.track === tn);
  if (br) baselineByTrack[tn] = br.metrics.brakeRate;
}
console.log('\nBaseline brakeRate per track:');
for (const [tn, rate] of Object.entries(baselineByTrack)) {
  console.log(`  ${tn}: ${(rate * 100).toFixed(1)}%`);
}

// ── Attach scores ─────────────────────────────────────────────────────────────
for (const r of allResults) {
  const baseBrakeRate = baselineByTrack[r.track];
  r.fail  = hardFail(r.metrics, baseBrakeRate);
  r.score = score(r.metrics, baseBrakeRate);
}

// ── Per-combo total score ──────────────────────────────────────────────────────
function comboKey(combo) {
  return `${combo.speedBrakeFactor}|${combo.speedBrakeTThreshold}|${combo.speedBrakeYThreshold}`;
}

const comboTotals = new Map();
for (const r of allResults) {
  const key  = comboKey(r.combo);
  const prev = comboTotals.get(key) ?? { combo: r.combo, total: 0, fails: new Set(), results: [] };
  prev.results.push(r);
  if (r.fail) prev.fails.add(`${r.track}:${r.fail}`);
  prev.total += isFinite(r.score) ? r.score : -Infinity;
  comboTotals.set(key, prev);
}

const ranked = [...comboTotals.values()]
  .sort((a, b) => {
    const af = a.fails.size > 0;
    const bf = b.fails.size > 0;
    if (af && !bf) return 1;
    if (!af && bf) return -1;
    return b.total - a.total;
  });

// ── Console ranking ───────────────────────────────────────────────────────────
console.log('\n=== Phase 2 Ranking ===');
for (const { combo, total, fails, results } of ranked) {
  const bMark   = isBaseline(combo) ? ' [BASELINE]' : '';
  const failStr = fails.size > 0 ? ` FAIL(${[...fails].join(',')})` : '';
  const bF = combo.speedBrakeFactor.toFixed(2);
  const bT = combo.speedBrakeTThreshold.toFixed(3);
  const bY = combo.speedBrakeYThreshold.toFixed(2);
  const perTrack = tracks.map((tn) => {
    const r = results.find((x) => x.track === tn);
    if (!r) return `${tn.slice(0, 8)}:—`;
    const tag = r.fail ? '❌' : '✅';
    return `${tn.slice(0, 8)}:p=${r.metrics.pValue.toFixed(3)}${tag}`;
  }).join('  ');
  console.log(
    `  bF=${bF} bT=${bT} bY=${bY}${bMark}  total=${isFinite(total) ? total.toFixed(3) : 'FAIL'}${failStr}  ${perTrack}`
  );
}

const winner = ranked.find((r) => r.fails.size === 0);
if (winner) {
  const bF = winner.combo.speedBrakeFactor.toFixed(2);
  const bT = winner.combo.speedBrakeTThreshold.toFixed(3);
  const bY = winner.combo.speedBrakeYThreshold.toFixed(2);
  console.log(`\n=== WINNER ===`);
  console.log(`  bF=${bF} bT=${bT} bY=${bY}  total=${winner.total.toFixed(3)}`);
  console.log(`  ${JSON.stringify({ ...FIXED_BEHAVIOR, ...winner.combo }, null, 0)}`);
} else {
  console.log('\n=== NO WINNER — all combos failed hard cutoffs ===');
}

// ── Per-combo averages (for report table) ─────────────────────────────────────
function avgMetrics(results) {
  const n = results.length;
  if (n === 0) return {};
  const sum = (key) => results.reduce((s, r) => s + (r.metrics[key] ?? 0), 0);
  return {
    pValue:            sum('pValue')            / n,
    zigzagScore:       sum('zigzagScore')       / n,
    brakeRate:         sum('brakeRate')         / n,
    stableOvertakes:   sum('stableOvertakes')   / n,
    lateralSpeedScore: sum('lateralSpeedScore') / n,
    overlapRate:       sum('overlapRate')       / n,
    outcomeReached:    sum('outcomeReached')    / n,
  };
}

// ── Report ────────────────────────────────────────────────────────────────────
const lines = [];
lines.push('# RaceArena — Braking Sweep Phase 2 Report');
lines.push('');
lines.push(`**Combos:** Top 5 from Phase 1 + current baseline = 6 combos  `);
lines.push(`**Races/combo:** ${N_RACES}  `);
lines.push(`**Duration:** ${DUR}s  `);
lines.push(`**Seed:** ${SEED}  `);
lines.push('');
lines.push('## Fixed parameters');
lines.push('```json');
lines.push(JSON.stringify(FIXED_BEHAVIOR, null, 2));
lines.push('```');
lines.push('');
lines.push('## Baseline');
lines.push('```json');
lines.push(JSON.stringify(BASELINE_BRAKING, null, 2));
lines.push('```');
lines.push('');
lines.push('## Baseline brakeRate per track');
for (const [tn, rate] of Object.entries(baselineByTrack)) {
  lines.push(`- ${tn}: ${(rate * 100).toFixed(1)}%`);
}
lines.push('');
lines.push('## Hard cutoffs');
lines.push('- zigzagScore > 0.003 → FAIL');
lines.push('- natOvt < 100% → FAIL');
lines.push('- outcomeReached < 90% → FAIL');
lines.push('- brakeRate > baseline brakeRate (per track) → FAIL');
lines.push('');

lines.push('## Per-Track Results');
lines.push('');
lines.push('| bF | bT | bY | BL | Track | p | zigzag | brake% | stableOvt | latSpd | overlap% | Pass | Score |');
lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const { combo, results } of ranked) {
  for (const r of results) {
    const m    = r.metrics;
    const bl   = r.isBaseline ? '✅' : '';
    const pass = r.fail ? `❌${r.fail}` : '✅';
    lines.push(
      `| ${combo.speedBrakeFactor.toFixed(2)} | ${combo.speedBrakeTThreshold.toFixed(3)} | ${combo.speedBrakeYThreshold.toFixed(2)}` +
      ` | ${bl} | ${r.track}` +
      ` | ${m.pValue.toFixed(3)}` +
      ` | ${m.zigzagScore.toFixed(6)}` +
      ` | ${(m.brakeRate * 100).toFixed(1)}%` +
      ` | ${m.stableOvertakes.toFixed(3)}` +
      ` | ${m.lateralSpeedScore.toFixed(6)}` +
      ` | ${(m.overlapRate * 100).toFixed(1)}%` +
      ` | ${pass}` +
      ` | ${isFinite(r.score) ? r.score.toFixed(3) : 'FAIL'} |`
    );
  }
}
lines.push('');

lines.push('## Averaged Across Tracks');
lines.push('');
lines.push('| Rank | bF | bT | bY | BL | avg-p | avg-zig | avg-brake% | avg-ovt | avg-latSpd | avg-ovlp% | Total |');
lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
ranked.forEach(({ combo, total, fails, results }, rank) => {
  const bl  = isBaseline(combo) ? '✅' : '';
  const avg = avgMetrics(results);
  const ok  = fails.size === 0 ? '✅' : `❌`;
  lines.push(
    `| ${rank + 1}${ok} | ${combo.speedBrakeFactor.toFixed(2)} | ${combo.speedBrakeTThreshold.toFixed(3)} | ${combo.speedBrakeYThreshold.toFixed(2)}` +
    ` | ${bl}` +
    ` | ${avg.pValue?.toFixed(3)}` +
    ` | ${avg.zigzagScore?.toFixed(6)}` +
    ` | ${((avg.brakeRate ?? 0) * 100).toFixed(1)}%` +
    ` | ${avg.stableOvertakes?.toFixed(3)}` +
    ` | ${avg.lateralSpeedScore?.toFixed(6)}` +
    ` | ${((avg.overlapRate ?? 0) * 100).toFixed(1)}%` +
    ` | **${isFinite(total) ? total.toFixed(3) : 'FAIL'}** |`
  );
});
lines.push('');

if (winner) {
  lines.push('## Winner');
  lines.push('');
  const bF = winner.combo.speedBrakeFactor.toFixed(2);
  const bT = winner.combo.speedBrakeTThreshold.toFixed(3);
  const bY = winner.combo.speedBrakeYThreshold.toFixed(2);
  lines.push(`**bF=${bF}  bT=${bT}  bY=${bY}**  (total score: ${winner.total.toFixed(3)})`);
  lines.push('');
  lines.push('Full parameter set for defaults.js:');
  lines.push('```json');
  lines.push(JSON.stringify({ ...FIXED_BEHAVIOR, ...winner.combo }, null, 2));
  lines.push('```');
} else {
  lines.push('## Winner');
  lines.push('');
  lines.push('> No combo survived all hard cutoffs. Review per-track results and consider widening search range.');
}

const reportPath  = join(OUT_BASE, 'braking-phase2-report.md');
const jsonOutPath = join(OUT_BASE, 'braking-phase2-data.json');
writeFileSync(reportPath, lines.join('\n'));
writeFileSync(
  jsonOutPath,
  JSON.stringify({
    combos: COMBOS,
    results: allResults,
    ranked: ranked.map((r) => ({
      combo:  r.combo,
      total:  r.total,
      fails:  [...r.fails],
      avgMetrics: avgMetrics(r.results),
    })),
    winner: winner ? { combo: winner.combo, total: winner.total } : null,
  }, null, 2)
);
console.log(`\nReport → ${reportPath}`);
console.log(`JSON   → ${jsonOutPath}`);
