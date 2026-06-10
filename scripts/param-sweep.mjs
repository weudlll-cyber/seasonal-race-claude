#!/usr/bin/env node
// ============================================================
// File:        param-sweep.mjs
// Path:        scripts/param-sweep.mjs
// Project:     RaceArena
// Created:     2026-05-31
// Description: Phase 1 lateral physics sweep — 243 combos (lf×ld×hfs×hfr×ad,
//              3 levels each) × 10 races; use --quick for a sanity check.
// ============================================================

// scripts/param-sweep.mjs
// Phase 1 parameter sweep — lateral physics optimization.
//
// Usage:
//   node scripts/param-sweep.mjs                 -- Phase 1 (243 combos, 10 races)
//   node scripts/param-sweep.mjs --quick         -- sanity check (9 combos, 3 races)
//   node scripts/param-sweep.mjs --races=20      -- override races per combo
//   node scripts/param-sweep.mjs --out=client/tmp/sweep
//   node scripts/param-sweep.mjs --seed=42       -- fixed seed for reproducibility
//
// Sweep grid: lateralForce × lateralDamping × homeForceStrength
//           × homeForceReductionOnOverlap × avoidanceDistance
//           3 × 3 × 3 × 3 × 3 = 243 combos
//
// Hard cutoffs (any failure → combo eliminated):
//   zigzagScore > 0.005      (oscillation)
//   natOvt < 100%            (unnatural overtakes)
//   outcomeReached < 90%     (races not finishing)

import { spawnSync }  from 'child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT     = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIM_PATH = join(ROOT, 'scripts', 'sim-fairness.mjs');

// ── CLI args ──────────────────────────────────────────────────────────────────
function argVal(name, def) {
  const flag = process.argv.find((a) => a.startsWith(`--${name}=`));
  return flag ? flag.slice(name.length + 3) : def;
}
const IS_QUICK    = process.argv.includes('--quick');
const N_RACES     = Number(argVal('races', IS_QUICK ? '3' : '10'));
const OUT_REL     = argVal('out', 'client/tmp/sweep');
const OUT_BASE    = join(ROOT, OUT_REL);
const TRACK_FILTER = argVal('track', null);
const RACER_FILTER = argVal('racer', null);
const DUR_FILTER  = argVal('dur', '60');
const SEED        = argVal('seed', '42');  // fixed seed for reproducibility

// ── Sweep grid ────────────────────────────────────────────────────────────────
// Quick mode: 2 axes only, 9 combos for sanity checking.
// Pilot mode: full 5-axis grid, 243 combos.
const AXES = IS_QUICK
  ? [
      ['lateralForce',   [0.006, 0.010, 0.014]],
      ['lateralDamping', [0.35,  0.40,  0.45]],
    ]
  : [
      ['lateralForce',                [0.006, 0.010, 0.014]],
      ['lateralDamping',              [0.25,  0.35,  0.45]],   // must keep < 0.5
      ['homeForceStrength',           [0.025, 0.040, 0.055]],
      ['homeForceReductionOnOverlap', [0.15,  0.30,  0.45]],
      ['avoidanceDistance',           [0.10,  0.15,  0.20]],
    ];

// Baseline = master defaults (after revert)
const BASELINE = {
  lateralForce:                0.010,
  lateralDamping:              0.45,
  homeForceStrength:           0.040,
  homeForceReductionOnOverlap: 0.30,
  avoidanceDistance:           0.15,
};

// Tracks per methodology:
//   open  → Space Sprint (rocket, 50 racers), Luger Hill (luge, 50 racers)
//   closed → Dirt Oval   (horse,  40 racers)
const TRACK_RACER_PAIRS = TRACK_FILTER && RACER_FILTER
  ? [{ track: TRACK_FILTER, racer: RACER_FILTER, racers: Number(argVal('racers', '50')) }]
  : [
      { track: 'space-sprint', racer: 'rocket', racers: 50 },
      { track: 'luger-hill', racer: 'luge',   racers: 50 },  // Luger Hill
      { track: 'dirt-oval',    racer: 'horse',  racers: 40 },  // closed
    ];

// ── Build combo list ──────────────────────────────────────────────────────────
function cartesian(axes) {
  return axes.reduce(
    (combos, [name, vals]) =>
      combos.flatMap((combo) => vals.map((v) => ({ ...combo, [name]: v }))),
    [{}]
  );
}
const COMBOS = cartesian(AXES);

// ── Hard cutoffs + scoring ────────────────────────────────────────────────────
// A combo is eliminated if any hard cutoff triggers on ANY track.
// Scoring only applies to survivors.
function hardFail(metrics) {
  if ((metrics.zigzagScore   ?? 0)   >= 0.005) return 'zigzag';
  if ((metrics.natOvt        ?? 1)   <  1.0)   return 'natOvt';
  if ((metrics.outcomeReached ?? 1)  <  0.90)  return 'outcomeReached';
  return null;
}

function scoreCombo(metrics) {
  if (hardFail(metrics)) return -Infinity;
  const pScore         = metrics.pValue ?? 0;
  const overlapPenalty = (metrics.overlapRate ?? 0) * 2;
  const resPenalty     = (metrics.overlapResolutionFrames ?? 0) / 200;
  return pScore - overlapPenalty - resPenalty;
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('\n=== param-sweep Phase 1 — RaceArena Lateral Physics Optimizer ===');
console.log(`Mode        : ${IS_QUICK ? 'quick' : 'pilot'}`);
console.log(`Combos      : ${COMBOS.length}`);
console.log(`Races/combo : ${N_RACES}`);
console.log(`Seed        : ${SEED}`);
console.log(`Tracks      : ${TRACK_RACER_PAIRS.map((p) => `${p.track}/${p.racer}(${p.racers}R)`).join(', ')}`);
console.log(`Duration    : ${DUR_FILTER}s`);
console.log(`Total runs  : ${COMBOS.length * TRACK_RACER_PAIRS.length}`);
console.log(`Axes        : ${AXES.map(([n, vs]) => `${n}=[${vs.join(',')}]`).join('  ')}`);
console.log('');

mkdirSync(OUT_BASE, { recursive: true });

const allResults = [];
const startTime  = Date.now();
let   runIndex   = 0;
const totalRuns  = COMBOS.length * TRACK_RACER_PAIRS.length;

for (const combo of COMBOS) {
  for (const { track, racer, racers: nRacers } of TRACK_RACER_PAIRS) {
    runIndex++;
    const comboKey = Object.entries(combo).map(([k, v]) => `${k}=${v}`).join('_');
    const runKey   = `${comboKey}__${track}__${racer}`;
    const outDir   = join(OUT_BASE, `run_${runIndex}`);
    const outRel   = `${OUT_REL}/run_${runIndex}`;
    const jsonPath = join(outDir, 'fairness-data.json');

    process.stdout.write(`[${runIndex}/${totalRuns}] ${racer}@${track.slice(-10)}  `);

    mkdirSync(outDir, { recursive: true });

    const args = [
      SIM_PATH,
      `--races=${N_RACES}`,
      `--track=${track}`,
      `--racer=${racer}`,
      `--racers=${nRacers}`,
      `--dur=${DUR_FILTER}`,
      `--race-plan=true`,
      `--seed=${SEED}`,
      `--out=${outRel}`,
      `--behavior=${JSON.stringify(combo)}`,
    ];

    const result = spawnSync('node', args, {
      encoding: 'utf8',
      timeout: 300_000,
    });

    if (result.status !== 0) {
      console.log(`ERROR (exit ${result.status})`);
      if (result.stderr) console.error(result.stderr.slice(0, 300));
      continue;
    }

    if (!existsSync(jsonPath)) {
      console.log('ERROR (no output JSON)');
      continue;
    }

    let data;
    try {
      data = JSON.parse(readFileSync(jsonPath, 'utf8'));
    } catch {
      console.log('ERROR (parse)');
      continue;
    }

    for (const res of data.results) {
      const n = res.avgNaturalness;
      const metrics = {
        pValue:                  res.stats?.pValue ?? 0,
        chiSq:                   res.stats?.chiSq ?? 0,
        row0WinRate:             res.stats?.rowStats?.[0]?.winRate ?? 0,
        natOvt:                  n?.naturalOvertakeFraction ?? 1,
        overlapRate:             n?.overlapRate ?? 0,
        overlapResolutionFrames: n?.overlapResolutionFrames ?? 0,
        zigzagScore:             n?.zigzagScore ?? 0,
        outcomeReached:          n?.outcomeReached ?? 1,
      };
      const fail  = hardFail(metrics);
      const score = scoreCombo(metrics);
      allResults.push({ combo, track: res.trackName, racer: res.racerType, durationSec: res.durationSec, metrics, score, fail, runKey });
      const failStr = fail ? ` ❌ ${fail}` : '';
      console.log(
        `p=${metrics.pValue.toFixed(3)}` +
        `  zig=${metrics.zigzagScore.toFixed(5)}` +
        `  ovlp=${(metrics.overlapRate * 100).toFixed(1)}%` +
        `  res=${metrics.overlapResolutionFrames.toFixed(0)}fr` +
        `  natOvt=${(metrics.natOvt * 100).toFixed(1)}%` +
        `  outc=${(metrics.outcomeReached * 100).toFixed(0)}%` +
        `  score=${isFinite(score) ? score.toFixed(3) : 'FAIL'}${failStr}`
      );
    }
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\nSweep completed in ${elapsed}s`);

// ── Survivor analysis ─────────────────────────────────────────────────────────
// A combo survives if it passes ALL hard cutoffs on ALL tracks it was tested on.
const tracksInSweep = [...new Set(allResults.map((r) => r.track))];

function comboPassesAllTracks(combo) {
  return tracksInSweep.every((trackName) => {
    const r = allResults.find((res) => {
      const c = res.combo;
      return res.track === trackName &&
             Object.keys(combo).every((k) => c[k] === combo[k]);
    });
    return r && !r.fail;
  });
}

const survivors = COMBOS.filter(comboPassesAllTracks);

// Rank survivors by sum of scores across all tracks
const rankedSurvivors = survivors
  .map((combo) => {
    const totalScore = tracksInSweep.reduce((s, trackName) => {
      const r = allResults.find((res) => {
        const c = res.combo;
        return res.track === trackName && Object.keys(combo).every((k) => c[k] === combo[k]);
      });
      return s + (r && isFinite(r.score) ? r.score : 0);
    }, 0);
    return { combo, totalScore };
  })
  .sort((a, b) => b.totalScore - a.totalScore);

const top5 = rankedSurvivors.slice(0, 5);

// ── Console summary ───────────────────────────────────────────────────────────
console.log(`\n=== Phase 1 Summary ===`);
console.log(`Total combos run   : ${COMBOS.length}`);
console.log(`Survivors (pass all): ${survivors.length}/${COMBOS.length}`);
console.log(`Top 5 for Phase 2  :`);
top5.forEach((s, i) => {
  const c = s.combo;
  console.log(`  #${i + 1} score=${s.totalScore.toFixed(3)}  ${JSON.stringify(c)}`);
});

// ── Report ────────────────────────────────────────────────────────────────────
const reportLines = [];
reportLines.push('# RaceArena — Phase 1 Parameter Sweep Report');
reportLines.push('');
reportLines.push(`**Mode:** ${IS_QUICK ? 'quick' : 'pilot'}  `);
reportLines.push(`**Races/combo:** ${N_RACES}  `);
reportLines.push(`**Duration:** ${DUR_FILTER}s  `);
reportLines.push(`**Seed:** ${SEED}  `);
reportLines.push(`**Baseline:** \`${JSON.stringify(BASELINE)}\`  `);
reportLines.push(`**Axes:** ${AXES.map(([n, vs]) => `${n}=[${vs.join(',')}]`).join('  ')}  `);
reportLines.push(`**Total combos:** ${COMBOS.length}  `);
reportLines.push(`**Tracks:** ${TRACK_RACER_PAIRS.map((p) => `${p.track}/${p.racer}(${p.racers}R)`).join(', ')}  `);
reportLines.push('');
reportLines.push('**Hard cutoffs (any failure → eliminated):**  ');
reportLines.push('- `zigzagScore >= 0.005` → oscillation  ');
reportLines.push('- `natOvt < 100%` → unnatural overtakes  ');
reportLines.push('- `outcomeReached < 90%` → races not finishing  ');
reportLines.push('');

// Per-track full tables
for (const trackName of tracksInSweep) {
  const trackResults = allResults.filter((r) => r.track === trackName);
  const passing = trackResults.filter((r) => !r.fail).sort((a, b) => b.score - a.score);
  const failing = trackResults.filter((r) => r.fail);

  reportLines.push(`---`);
  reportLines.push(`## ${trackName}`);
  reportLines.push('');
  reportLines.push(`Pass: **${passing.length}/${trackResults.length}**  |  Fail: ${failing.length}`);
  reportLines.push('');

  // Column headers
  reportLines.push(
    '| lF | lD | hFS | hFR | aD | p | ovlp% | res(fr) | zig | natOvt | outc% | score |'
  );
  reportLines.push(
    '|---|---|---|---|---|---|---|---|---|---|---|---|'
  );

  // Sort all by score descending (failing last)
  const allSorted = [...passing, ...failing.sort((a, b) => {
    const failOrder = { zigzag: 0, natOvt: 1, outcomeReached: 2 };
    return (failOrder[a.fail] ?? 9) - (failOrder[b.fail] ?? 9);
  })];

  for (const r of allSorted) {
    const c = r.combo;
    const m = r.metrics;
    const failMark = r.fail ? ` ❌${r.fail.slice(0,5)}` : '';
    reportLines.push(
      `| ${c.lateralForce ?? BASELINE.lateralForce}` +
      ` | ${c.lateralDamping ?? BASELINE.lateralDamping}` +
      ` | ${c.homeForceStrength ?? BASELINE.homeForceStrength}` +
      ` | ${c.homeForceReductionOnOverlap ?? BASELINE.homeForceReductionOnOverlap}` +
      ` | ${c.avoidanceDistance ?? BASELINE.avoidanceDistance}` +
      ` | ${m.pValue.toFixed(3)}` +
      ` | ${(m.overlapRate * 100).toFixed(1)}%` +
      ` | ${m.overlapResolutionFrames.toFixed(0)}` +
      ` | ${m.zigzagScore.toFixed(5)}` +
      ` | ${(m.natOvt * 100).toFixed(1)}%` +
      ` | ${(m.outcomeReached * 100).toFixed(0)}%` +
      ` | ${isFinite(r.score) ? r.score.toFixed(3) : `FAIL${failMark}`} |`
    );
  }
  reportLines.push('');
}

// ── Survivors section ─────────────────────────────────────────────────────────
reportLines.push('---');
reportLines.push('## Survivors — Pass All Hard Cutoffs on All Tracks');
reportLines.push('');
reportLines.push(`**${survivors.length} of ${COMBOS.length} combos** pass all cutoffs on all ${tracksInSweep.length} tracks.`);
reportLines.push('');

if (survivors.length === 0) {
  reportLines.push('> No combo passes all hard cutoffs on all tracks. Review per-track results above.');
} else {
  reportLines.push('| Rank | lF | lD | hFS | hFR | aD | Total Score | Details |');
  reportLines.push('|------|---|---|---|---|---|-------------|---------|');
  for (let i = 0; i < rankedSurvivors.length; i++) {
    const { combo: c, totalScore } = rankedSurvivors[i];
    const perTrack = tracksInSweep.map((tn) => {
      const r = allResults.find((res) => res.track === tn && Object.keys(c).every((k) => res.combo[k] === c[k]));
      return r ? `${tn.slice(0,8)}:p=${r.metrics.pValue.toFixed(2)}` : '—';
    }).join(' ');
    reportLines.push(
      `| ${i + 1} | ${c.lateralForce ?? BASELINE.lateralForce}` +
      ` | ${c.lateralDamping ?? BASELINE.lateralDamping}` +
      ` | ${c.homeForceStrength ?? BASELINE.homeForceStrength}` +
      ` | ${c.homeForceReductionOnOverlap ?? BASELINE.homeForceReductionOnOverlap}` +
      ` | ${c.avoidanceDistance ?? BASELINE.avoidanceDistance}` +
      ` | **${totalScore.toFixed(3)}** | ${perTrack} |`
    );
  }
}
reportLines.push('');

// ── Top 5 for Phase 2 ─────────────────────────────────────────────────────────
reportLines.push('---');
reportLines.push('## Top 5 — Phase 2 Candidates');
reportLines.push('');
if (top5.length === 0) {
  reportLines.push('> No survivors — Phase 2 cannot proceed without adjusting parameter ranges.');
} else {
  for (let i = 0; i < top5.length; i++) {
    const { combo: c, totalScore } = top5[i];
    reportLines.push(`### #${i + 1} — Score ${totalScore.toFixed(3)}`);
    reportLines.push('');
    reportLines.push('```json');
    reportLines.push(JSON.stringify(c, null, 2));
    reportLines.push('```');
    reportLines.push('');
    // Per-track breakdown
    for (const tn of tracksInSweep) {
      const r = allResults.find((res) => res.track === tn && Object.keys(c).every((k) => res.combo[k] === c[k]));
      if (r) {
        const m = r.metrics;
        reportLines.push(
          `- **${tn}:** p=${m.pValue.toFixed(3)}` +
          `  ovlp=${(m.overlapRate * 100).toFixed(1)}%` +
          `  res=${m.overlapResolutionFrames.toFixed(0)}fr` +
          `  zig=${m.zigzagScore.toFixed(5)}` +
          `  natOvt=${(m.natOvt * 100).toFixed(1)}%` +
          `  outc=${(m.outcomeReached * 100).toFixed(0)}%`
        );
      }
    }
    reportLines.push('');
  }
}

// ── Baseline comparison ───────────────────────────────────────────────────────
reportLines.push('---');
reportLines.push('## Baseline Comparison');
reportLines.push('');
const baselineResult = allResults.filter((r) =>
  Object.entries(BASELINE).every(([k, v]) => (r.combo[k] ?? BASELINE[k]) === v)
);
if (baselineResult.length > 0) {
  for (const r of baselineResult) {
    const m = r.metrics;
    const passStr = r.fail ? `❌ FAIL (${r.fail})` : '✅ PASS';
    reportLines.push(`- **${r.track}:** ${passStr}  p=${m.pValue.toFixed(3)}  ovlp=${(m.overlapRate*100).toFixed(1)}%  zig=${m.zigzagScore.toFixed(5)}  score=${isFinite(r.score) ? r.score.toFixed(3) : 'FAIL'}`);
  }
} else {
  reportLines.push('> Baseline combo not in sweep grid.');
}
reportLines.push('');

// Write output
const reportPath  = join(OUT_BASE, 'sweep-phase1-report.md');
const jsonOutPath = join(OUT_BASE, 'sweep-phase1-data.json');
writeFileSync(reportPath, reportLines.join('\n'));
writeFileSync(jsonOutPath, JSON.stringify({
  axes: AXES,
  baseline: BASELINE,
  combos: COMBOS,
  results: allResults,
  survivors: survivors,
  top5: top5.map((s) => ({ combo: s.combo, totalScore: s.totalScore })),
}, null, 2));

console.log(`\nReport → ${reportPath}`);
console.log(`JSON   → ${jsonOutPath}`);
