#!/usr/bin/env node
// scripts/param-sweep-phase2.mjs
// Phase 2 confirmation sweep — top 5 Phase 1 survivors, 100 races each.
//
// Usage:
//   node scripts/param-sweep-phase2.mjs
//   node scripts/param-sweep-phase2.mjs --out=client/tmp/sweep-phase2
//   node scripts/param-sweep-phase2.mjs --races=100

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
const N_RACES = Number(argVal('races', '100'));
const OUT_REL = argVal('out', 'client/tmp/sweep-phase2');
const OUT_BASE = join(ROOT, OUT_REL);
const SEED    = argVal('seed', '42');
const DUR     = argVal('dur', '60');

// ── Top 5 from Phase 1 ────────────────────────────────────────────────────────
const CANDIDATES = [
  { rank: 1, combo: { lateralForce: 0.014, lateralDamping: 0.35, homeForceStrength: 0.055, homeForceReductionOnOverlap: 0.15, avoidanceDistance: 0.20 } },
  { rank: 2, combo: { lateralForce: 0.014, lateralDamping: 0.45, homeForceStrength: 0.055, homeForceReductionOnOverlap: 0.30, avoidanceDistance: 0.15 } },
  { rank: 3, combo: { lateralForce: 0.014, lateralDamping: 0.45, homeForceStrength: 0.040, homeForceReductionOnOverlap: 0.15, avoidanceDistance: 0.15 } },
  { rank: 4, combo: { lateralForce: 0.014, lateralDamping: 0.45, homeForceStrength: 0.025, homeForceReductionOnOverlap: 0.30, avoidanceDistance: 0.20 } },
  { rank: 5, combo: { lateralForce: 0.010, lateralDamping: 0.45, homeForceStrength: 0.025, homeForceReductionOnOverlap: 0.15, avoidanceDistance: 0.15 } },
];

// Also run the current baseline for direct comparison
const BASELINE = {
  rank: 'baseline',
  combo: { lateralForce: 0.010, lateralDamping: 0.45, homeForceStrength: 0.040, homeForceReductionOnOverlap: 0.30, avoidanceDistance: 0.15 },
};

const ALL = [...CANDIDATES, BASELINE];

const TRACK_RACER_PAIRS = [
  { track: 'space-sprint', racer: 'rocket', racers: 50 },
  { track: '90d3020197da', racer: 'luge',   racers: 50 },
  { track: 'dirt-oval',    racer: 'horse',  racers: 40 },
];

// ── Scoring (same as Phase 1) ─────────────────────────────────────────────────
function hardFail(m) {
  if ((m.zigzagScore    ?? 0) >= 0.005) return 'zigzag';
  if ((m.natOvt         ?? 1) <  1.0)   return 'natOvt';
  if ((m.outcomeReached ?? 1) <  0.90)  return 'outcomeReached';
  return null;
}
function score(m) {
  if (hardFail(m)) return -Infinity;
  return (m.pValue ?? 0) - (m.overlapRate ?? 0) * 2 - (m.overlapResolutionFrames ?? 0) / 200;
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('\n=== param-sweep Phase 2 — Confirmation (100 races) ===');
console.log(`Candidates : ${ALL.length} (top 5 + baseline)`);
console.log(`Races      : ${N_RACES}`);
console.log(`Seed       : ${SEED}`);
console.log(`Tracks     : ${TRACK_RACER_PAIRS.map((p) => `${p.track}/${p.racer}(${p.racers}R)`).join(', ')}`);
console.log(`Duration   : ${DUR}s`);
console.log(`Total runs : ${ALL.length * TRACK_RACER_PAIRS.length}`);
console.log('');

mkdirSync(OUT_BASE, { recursive: true });

const allResults = [];
const startTime  = Date.now();
let   runIndex   = 0;
const totalRuns  = ALL.length * TRACK_RACER_PAIRS.length;

for (const { rank, combo } of ALL) {
  for (const { track, racer, racers: nRacers } of TRACK_RACER_PAIRS) {
    runIndex++;
    const outDir  = join(OUT_BASE, `run_${runIndex}`);
    const outRel  = `${OUT_REL}/run_${runIndex}`;
    const jsonPath = join(outDir, 'fairness-data.json');

    process.stdout.write(`[${runIndex}/${totalRuns}] Rank-${rank} ${racer}@${track.slice(-10)}  `);
    mkdirSync(outDir, { recursive: true });

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
      `--behavior=${JSON.stringify(combo)}`,
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
        pValue:                  res.stats?.pValue ?? 0,
        chiSq:                   res.stats?.chiSq ?? 0,
        natOvt:                  n?.naturalOvertakeFraction ?? 1,
        overlapRate:             n?.overlapRate ?? 0,
        overlapResolutionFrames: n?.overlapResolutionFrames ?? 0,
        zigzagScore:             n?.zigzagScore ?? 0,
        outcomeReached:          n?.outcomeReached ?? 1,
      };
      const fail = hardFail(m);
      const sc   = score(m);
      allResults.push({ rank, combo, track: res.trackName, racer: res.racerType, metrics: m, score: sc, fail });
      const tag = fail ? ` ❌${fail}` : '';
      console.log(
        `p=${m.pValue.toFixed(3)}` +
        `  zig=${m.zigzagScore.toFixed(5)}` +
        `  ovlp=${(m.overlapRate * 100).toFixed(1)}%` +
        `  res=${m.overlapResolutionFrames.toFixed(0)}fr` +
        `  natOvt=${(m.natOvt * 100).toFixed(1)}%` +
        `  outc=${(m.outcomeReached * 100).toFixed(0)}%` +
        `  score=${isFinite(sc) ? sc.toFixed(3) : 'FAIL'}${tag}`
      );
    }
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\nPhase 2 completed in ${elapsed}s`);

// ── Per-candidate summary ─────────────────────────────────────────────────────
const tracks = [...new Set(allResults.map((r) => r.track))];

function totalScore(rank) {
  return tracks.reduce((s, tn) => {
    const r = allResults.find((x) => x.rank === rank && x.track === tn);
    return s + (r && isFinite(r.score) ? r.score : -Infinity);
  }, 0);
}

const ranked = ALL.map(({ rank }) => ({ rank, total: totalScore(rank) }))
  .sort((a, b) => b.total - a.total);

console.log('\n=== Phase 2 Final Ranking ===');
for (const { rank, total } of ranked) {
  const perTrack = tracks.map((tn) => {
    const r = allResults.find((x) => x.rank === rank && x.track === tn);
    if (!r) return `${tn.slice(0,8)}:—`;
    const tag = r.fail ? '❌' : '✅';
    return `${tn.slice(0,8)}:p=${r.metrics.pValue.toFixed(3)}${tag}`;
  }).join('  ');
  console.log(`  Rank-${rank}  total=${isFinite(total) ? total.toFixed(3) : 'FAIL'}  ${perTrack}`);
}

const winner = ranked.find((r) => isFinite(r.total) && r.rank !== 'baseline');
if (winner) {
  const wc = ALL.find((c) => c.rank === winner.rank)?.combo;
  console.log(`\n→ WINNER: Rank-${winner.rank}  score=${winner.total.toFixed(3)}`);
  console.log(JSON.stringify(wc, null, 2));
}

// ── Report ────────────────────────────────────────────────────────────────────
const lines = [];
lines.push('# RaceArena — Phase 2 Confirmation Report');
lines.push('');
lines.push(`**Races/combo:** ${N_RACES}  `);
lines.push(`**Duration:** ${DUR}s  `);
lines.push(`**Seed:** ${SEED}  `);
lines.push('');

lines.push('## Results per Candidate');
lines.push('');
lines.push('| Rank | lF | lD | hFS | hFR | aD | SpaceSprint p | LugerHill p | DirtOval p | Total score |');
lines.push('|------|---|---|---|---|---|---|---|---|---|');
for (const { rank, total } of ranked) {
  const c = ALL.find((x) => x.rank === rank)?.combo ?? {};
  const cols = tracks.map((tn) => {
    const r = allResults.find((x) => x.rank === rank && x.track === tn);
    if (!r) return '—';
    const tag = r.fail ? '❌' : (r.metrics.pValue >= 0.05 ? '✅' : '⚠️');
    return `${r.metrics.pValue.toFixed(3)} ${tag}`;
  });
  lines.push(
    `| ${rank} | ${c.lateralForce} | ${c.lateralDamping} | ${c.homeForceStrength}` +
    ` | ${c.homeForceReductionOnOverlap} | ${c.avoidanceDistance}` +
    ` | ${cols[0]} | ${cols[1]} | ${cols[2]}` +
    ` | **${isFinite(total) ? total.toFixed(3) : 'FAIL'}** |`
  );
}
lines.push('');

lines.push('## Detailed Metrics per Candidate');
lines.push('');
for (const { rank } of ranked) {
  const c = ALL.find((x) => x.rank === rank)?.combo ?? {};
  lines.push(`### Rank-${rank}`);
  lines.push('```json');
  lines.push(JSON.stringify(c, null, 2));
  lines.push('```');
  lines.push('');
  lines.push('| Track | p | overlap% | resolution(fr) | zigzag | natOvt | outc% | score |');
  lines.push('|-------|---|---|---|---|---|---|---|');
  for (const tn of tracks) {
    const r = allResults.find((x) => x.rank === rank && x.track === tn);
    if (!r) { lines.push(`| ${tn} | — | — | — | — | — | — | — |`); continue; }
    const m = r.metrics;
    lines.push(
      `| ${tn} | ${m.pValue.toFixed(3)}` +
      ` | ${(m.overlapRate * 100).toFixed(1)}%` +
      ` | ${m.overlapResolutionFrames.toFixed(1)}` +
      ` | ${m.zigzagScore.toFixed(5)}` +
      ` | ${(m.natOvt * 100).toFixed(1)}%` +
      ` | ${(m.outcomeReached * 100).toFixed(0)}%` +
      ` | ${isFinite(r.score) ? r.score.toFixed(3) : 'FAIL'} |`
    );
  }
  lines.push('');
}

lines.push('---');
lines.push('## Recommendation');
lines.push('');
if (winner) {
  const wc = ALL.find((c) => c.rank === winner.rank)?.combo;
  lines.push(`**Winner: Rank-${winner.rank}** (combined score: ${winner.total.toFixed(3)})`);
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(wc, null, 2));
  lines.push('```');
} else {
  lines.push('> No candidate passed all hard cutoffs on all tracks. Review per-track results above.');
}

const reportPath  = join(OUT_BASE, 'phase2-report.md');
const jsonOutPath = join(OUT_BASE, 'phase2-data.json');
writeFileSync(reportPath, lines.join('\n'));
writeFileSync(jsonOutPath, JSON.stringify({ candidates: ALL, results: allResults, ranked }, null, 2));
console.log(`\nReport → ${reportPath}`);
console.log(`JSON   → ${jsonOutPath}`);
