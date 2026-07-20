// ============================================================
// exp-runaway-leader.mjs — BASELINE MEASUREMENT DRIVER: runaway-winner & parade-finish rates.
//
// READ-ONLY. Same orchestrator pattern as exp-pack-release.mjs / exp-b2-attack.mjs: spawns the shared
// sim (scripts/sim-fairness.mjs) once per track — each run pinned to that track + its seeded DEFAULT
// racer (read from the track seed, never hardcoded) — with the read-only --runaway-parade observer, reads
// the per-race raw records the sim writes, classifies each race with the pure module
// scripts/sim/observers/runaway-parade.mjs, and emits CSV + a short markdown summary. It changes NO race
// outcome — it only orchestrates + aggregates. No config overrides: current shipped defaults only.
//
// WHAT IT QUANTIFIES (on current master, defaults unchanged):
//   • RUNAWAY_WINNER rate — leader >= leadLen clear at progress windowStart, wins, never challenged.
//   • PARADE_FINISH  rate — a side-by-side leading group (>= 2) detached >= farLen from the field.
// Plus distributions: leader→P2 gap at windowStart (all races) and parade group sizes; and the parade
// groups' internal speed spread over the final speedWindow (the "same speed" signature).
//
// PARALLELISM: the 4 track runs are INDEPENDENT and deterministic per seed, so they run up to --jobs at
// once (default 4). Results are identical to a serial run; only wall-clock differs.
//
// USAGE:
//   node scripts/exp-runaway-leader.mjs [--races=100] [--seed=1] [--dur=60] [--jobs=4]
//                                       [--only=<trackId>] [--out=<results dir>] [--tmp=<sim out dir>]
//   --only=<trackId> runs a single track (used by the determinism re-run check).
// ============================================================
import { execFile } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname, isAbsolute, relative } from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { classifyRace, RUNAWAY_PARADE_DEFAULTS } from './sim/observers/runaway-parade.mjs';

const pExecFile = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const argVal = (k, d) => { const m = argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };

const RACES = Number(argVal('races', '100'));
const SEED  = Number(argVal('seed', '1'));
const DUR   = Number(argVal('dur', '60'));
const JOBS  = Math.max(1, Number(argVal('jobs', '4')));
const ONLY  = argVal('only', null);
const D     = RUNAWAY_PARADE_DEFAULTS;

const OUT_RAW = argVal('out', 'exp-runaway-leader-results');
const OUT_ABS = isAbsolute(OUT_RAW) ? OUT_RAW : join(ROOT, OUT_RAW);
const TMP_RAW = argVal('tmp', 'client/tmp/exp-runaway-leader');
const TMP_ABS = isAbsolute(TMP_RAW) ? TMP_RAW : join(ROOT, TMP_RAW);
const toSimOut = (absDir) => relative(ROOT, absDir).replace(/\\/g, '/'); // ROOT-relative, forward slashes

// All 4 sweep tracks (2 open + 2 closed). The RACER is read from each track seed's defaultRacerTypeId.
const TRACK_IDS = ['luger-hill', 'mountainstreet', 'searound', 'dirt-oval'];
const trackSeed = (id) => JSON.parse(readFileSync(join(ROOT, 'server/seeds/tracks', `${id}.json`), 'utf8'));
const TRACKS = (ONLY ? [ONLY] : TRACK_IDS).map((id) => {
  const s = trackSeed(id);
  return { id, racer: s.defaultRacerTypeId, closed: !!s.closed };
});

// ── small stats helpers ───────────────────────────────────────────────────────
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const percentile = (a, p) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const i = Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))));
  return s[i];
};
const r4 = (x) => (x == null ? '' : +Number(x).toFixed(4));

// Run one track → classify each of its races into a per-race row.
async function runTrack(track) {
  const outAbs = join(TMP_ABS, track.id);
  const args = [
    'scripts/sim-fairness.mjs',
    `--track=${track.id}`, `--racer=${track.racer}`,
    `--seed=${SEED}`, `--races=${RACES}`, `--dur=${DUR}`,
    '--runaway-parade', '--skip-main-output',
    `--out=${toSimOut(outAbs)}`,
  ];
  const t0 = Date.now();
  await pExecFile(process.execPath, args, { cwd: ROOT, maxBuffer: 128 * 1024 * 1024 });
  const j = JSON.parse(readFileSync(join(outAbs, 'runaway-parade.json'), 'utf8'));
  // Sort by raceIdx so the CSV is deterministic regardless of stash order.
  const races = [...j.races].sort((a, b) => a.raceIdx - b.raceIdx);
  const rows = races.map((rec) => {
    const c = classifyRace(rec.runawayParade, D);
    return {
      track: track.id, racer: track.racer, type: track.closed ? 'closed' : 'open',
      raceIdx: rec.raceIdx, seed: rec.seed,
      runawayWinner: c.runawayWinner ? 1 : 0,
      paradeFinish: c.paradeFinish ? 1 : 0,
      leaderGapAt090Len: r4(c.leaderGapAt090Len),
      minLeadFrom090Len: r4(c.minLeadFrom090Len),
      winnerIdx: c.winnerIdx,
      winnerIsLeaderAt090: c.winnerIsLeaderAt090 ? 1 : 0,
      paradeGroupSize: c.paradeGroupSize,
      paradeNextGapLen: r4(c.paradeNextGapLen),
      paradeSpeedSpread: r4(c.paradeSpeedSpread),
    };
  });
  return { track, rows, _secs: (Date.now() - t0) / 1000 };
}

const RACE_COLS = [
  'track', 'racer', 'type', 'raceIdx', 'seed',
  'runawayWinner', 'paradeFinish', 'leaderGapAt090Len', 'minLeadFrom090Len',
  'winnerIdx', 'winnerIsLeaderAt090', 'paradeGroupSize', 'paradeNextGapLen', 'paradeSpeedSpread',
];
const toCsv = (cols, rows) => [cols.join(','), ...rows.map((r) => cols.map((c) => r[c] ?? '').join(','))].join('\n') + '\n';

// Aggregate a set of per-race rows (one track or overall) into a summary row + distributions.
function summarize(label, type, rows) {
  const n = rows.length;
  const runaway = rows.filter((r) => r.runawayWinner === 1).length;
  const parade = rows.filter((r) => r.paradeFinish === 1).length;
  const gaps = rows.map((r) => Number(r.leaderGapAt090Len)).filter((x) => isFinite(x));
  const grpSizes = rows.filter((r) => r.paradeFinish === 1).map((r) => r.paradeGroupSize);
  const spreads = rows.filter((r) => r.paradeFinish === 1 && r.paradeSpeedSpread !== '')
    .map((r) => Number(r.paradeSpeedSpread)).filter((x) => isFinite(x));
  // Group-size histogram (2,3,4,5+) for the parade groups.
  const grpHist = { 2: 0, 3: 0, 4: 0, '5+': 0 };
  for (const g of grpSizes) grpHist[g >= 5 ? '5+' : g] = (grpHist[g >= 5 ? '5+' : g] || 0) + 1;
  return {
    track: label, type, N: n,
    runawayWinnerRate: r4(runaway / n), runawayWinners: runaway,
    paradeFinishRate: r4(parade / n), paradeFinishes: parade,
    gap090_mean: r4(mean(gaps)), gap090_p50: r4(percentile(gaps, 0.5)),
    gap090_p90: r4(percentile(gaps, 0.9)), gap090_max: r4(gaps.length ? Math.max(...gaps) : 0),
    gap090_geLead: gaps.filter((x) => x >= D.leadLen).length, // races clear >= leadLen at windowStart (clause a)
    paradeGrp_mean: r4(mean(grpSizes)),
    paradeGrp_2: grpHist[2], paradeGrp_3: grpHist[3], paradeGrp_4: grpHist[4], paradeGrp_5plus: grpHist['5+'],
    paradeSpeedSpread_mean: r4(mean(spreads)), paradeSpeedSpread_max: r4(spreads.length ? Math.max(...spreads) : 0),
  };
}

const SUM_COLS = [
  'track', 'type', 'N',
  'runawayWinnerRate', 'runawayWinners', 'paradeFinishRate', 'paradeFinishes',
  'gap090_mean', 'gap090_p50', 'gap090_p90', 'gap090_max', 'gap090_geLead',
  'paradeGrp_mean', 'paradeGrp_2', 'paradeGrp_3', 'paradeGrp_4', 'paradeGrp_5plus',
  'paradeSpeedSpread_mean', 'paradeSpeedSpread_max',
];

// ── Run the sweep (bounded-concurrency pool over the tracks) ─────────────────────
mkdirSync(OUT_ABS, { recursive: true });
mkdirSync(TMP_ABS, { recursive: true });
console.log('\n=== exp-runaway-leader — runaway-winner & parade-finish BASELINE (read-only) ===');
console.log(`Tracks ${TRACKS.length} × Races ${RACES} (seed=${SEED}, dur=${DUR}s), jobs=${JOBS}`);
console.log(`Thresholds: leadLen=${D.leadLen}L challengeLen=${D.challengeLen}L sideBySideLen=${D.sideBySideLen}L `
          + `farLen=${D.farLen}L windowStart=${D.windowStart} speedWindow=${D.speedWindow}`);
console.log(`Out: ${OUT_ABS}\n`);

const jobList = [...TRACKS];
const trackResults = new Array(jobList.length);
const startTs = Date.now();
let nextIdx = 0, doneCount = 0;
async function worker() {
  while (nextIdx < jobList.length) {
    const i = nextIdx++;
    trackResults[i] = await runTrack(jobList[i]);
    doneCount++;
    const r = trackResults[i];
    const s = summarize(r.track.id, r.track.closed ? 'closed' : 'open', r.rows);
    console.log(`  [${doneCount}/${jobList.length}] ${r.track.id.padEnd(15)} ${r.track.racer.padEnd(8)} `
      + `runaway=${(s.runawayWinnerRate * 100).toFixed(0)}% parade=${(s.paradeFinishRate * 100).toFixed(0)}%  ${r._secs.toFixed(0)}s`);
  }
}
await Promise.all(Array.from({ length: Math.min(JOBS, jobList.length) }, worker));

// ── Emit CSVs ────────────────────────────────────────────────────────────────
const allRows = trackResults.flatMap((r) => r.rows);
writeFileSync(join(OUT_ABS, 'runaway-parade-races.csv'), toCsv(RACE_COLS, allRows));
// Per-track race CSVs (used by the determinism re-run check).
for (const r of trackResults) writeFileSync(join(OUT_ABS, `races-${r.track.id}.csv`), toCsv(RACE_COLS, r.rows));

const summaryRows = trackResults.map((r) => summarize(r.track.id, r.track.closed ? 'closed' : 'open', r.rows));
if (!ONLY) summaryRows.push(summarize('OVERALL', 'all', allRows));
writeFileSync(join(OUT_ABS, 'runaway-parade-summary.csv'), toCsv(SUM_COLS, summaryRows));

// ── Short markdown summary ─────────────────────────────────────────────────────
const pct = (x) => (x * 100).toFixed(1) + '%';
const md = [];
md.push('# Runaway-Winner & Parade-Finish — Baseline Measurement');
md.push('');
md.push(`Read-only sweep on current master (b2AttackHeroes ON, shipped defaults, no overrides).`);
md.push(`**N=${RACES} deterministic seeded races per track** (seed=${SEED}, dur=${DUR}s), all 4 tracks, each pinned to its seeded default racer.`);
md.push('');
md.push('## Metric thresholds (parameters, spec defaults)');
md.push('');
md.push('| param | value | role |');
md.push('|---|---|---|');
md.push(`| windowStart | ${D.windowStart} | progress at which the runaway lead is measured; opens the [.,1.0] challenge window |`);
md.push(`| leadLen | ${D.leadLen} lengths | RUNAWAY (a): rank-1 must lead rank-2 by >= this at windowStart |`);
md.push(`| challengeLen | ${D.challengeLen} length | RUNAWAY (c): leader→P2 gap must never drop below this in [windowStart, 1.0] |`);
md.push(`| sideBySideLen | ${D.sideBySideLen} length | PARADE (a): max consecutive gap inside the leading group |`);
md.push(`| farLen | ${D.farLen} lengths | PARADE (b): min gap from the group's last member to the next racer |`);
md.push(`| speedWindow | ${D.speedWindow} | final race fraction over which the group's internal speed spread is reported |`);
md.push('');
md.push('## Rates per track + overall');
md.push('');
md.push('| track | type | N | runawayWinnerRate | paradeFinishRate | gap@0.90 mean / p50 / p90 / max | ≥leadLen@0.90 | parade grp mean (2/3/4/5+) | grp speed-spread mean / max |');
md.push('|---|---|---|---|---|---|---|---|---|');
for (const s of summaryRows) {
  md.push(`| ${s.track} | ${s.type} | ${s.N} | ${pct(s.runawayWinnerRate)} (${s.runawayWinners}) | ${pct(s.paradeFinishRate)} (${s.paradeFinishes}) | `
    + `${s.gap090_mean} / ${s.gap090_p50} / ${s.gap090_p90} / ${s.gap090_max} | ${s.gap090_geLead} | `
    + `${s.paradeGrp_mean} (${s.paradeGrp_2}/${s.paradeGrp_3}/${s.paradeGrp_4}/${s.paradeGrp_5plus}) | ${s.paradeSpeedSpread_mean} / ${s.paradeSpeedSpread_max} |`);
}
md.push('');
md.push('## Reading the numbers');
md.push('');
md.push('- **runawayWinnerRate** — share of races where the leader is already >= leadLen clear at progress '
  + `${D.windowStart}, goes on to win, and is never challenged (leader→P2 stays >= challengeLen) through the finish.`);
md.push('- **paradeFinishRate** — share of races that end with a side-by-side leading group (>= 2, internal gaps '
  + `<= sideBySideLen) detached >= farLen from the rest of the field.`);
md.push('- **gap@0.90** distribution — the raw leader→P2 lead at windowStart across ALL races (context for how often '
  + 'the runaway clause (a) is even in reach). `≥leadLen@0.90` counts races meeting clause (a) alone.');
md.push('- **grp speed-spread** — the parade groups\' internal max relative speed delta over the final '
  + `${D.speedWindow * 100}% of the race; near 0 confirms the "same speed" (paced) signature.`);
md.push('');
md.push('Data: `runaway-parade-summary.csv` (this table), `runaway-parade-races.csv` (per-race, all tracks), '
  + '`races-<track>.csv` (per-track, for the determinism re-run check).');
md.push('');
writeFileSync(join(OUT_ABS, 'SUMMARY.md'), md.join('\n'));

console.log(`\nElapsed ${((Date.now() - startTs) / 60000).toFixed(1)}m`);
console.log(`Wrote: ${join(OUT_ABS, 'runaway-parade-summary.csv')}`);
console.log(`       ${join(OUT_ABS, 'runaway-parade-races.csv')}`);
console.log(`       ${join(OUT_ABS, 'SUMMARY.md')}`);
console.log('\nSummary:');
for (const s of summaryRows) {
  console.log(`  ${s.track.padEnd(15)} ${String(s.type).padEnd(6)} N=${s.N}  runaway=${pct(s.runawayWinnerRate)}  parade=${pct(s.paradeFinishRate)}  gap@0.90 p50=${s.gap090_p50} max=${s.gap090_max}`);
}
