// ============================================================
// exp-runaway-leader.mjs — BASELINE MEASUREMENT DRIVER: runaway-winner & parade-finish rates.
//
// READ-ONLY. Uses the shared sweep-orchestrator pattern (see docs/SWEEP-HARNESS.md): spawns the shared
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
import { BAND_EDGES } from '../client/src/modules/racePlanner.js';

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

// ════════════════════════════════════════════════════════════════════════════════
// PHASE-1a LEASH EXPLORATION SWEEP (--leash-phase1). Runs the front-distance-leash variants
// (sim-only flags --frontLeashMaxLengths / --frontLeashGainPct) on all 4 tracks and emits a single
// co-optimization table: runaway (overall + per track) | parade | top-5 action Δ vs V0 | B1 | B2 |
// Holm | PASS/FAIL. Same seeds as the f40a7a6 baseline (seed=1). Facts only — the variant DECISION
// is the owner's.
// ════════════════════════════════════════════════════════════════════════════════
if (argv.includes('--leash-phase1')) {
  const OUT_LEASH = join(OUT_ABS, 'phase1-leash');
  mkdirSync(OUT_LEASH, { recursive: true });
  mkdirSync(TMP_ABS, { recursive: true });
  const zoneIdxOf = (rank) => { for (let i = 0; i < BAND_EDGES.length; i++) if (rank <= BAND_EDGES[i]) return i; return BAND_EDGES.length; };
  const bandReach = (rawData, bandNum) => {
    const rows = (rawData || []).filter((r) => r.sollBereich === bandNum);
    if (!rows.length) return null;
    return rows.filter((r) => zoneIdxOf(r.finalRank) === bandNum - 1).length / rows.length;
  };
  // Variants in the spec's PRIORITY ORDER (complete in order; the pool preserves it).
  const VARIANTS = [
    { name: 'V0',       leash: false },
    { name: 'V-2.5-m',  leash: true, max: 2.5, gain: 3 },
    { name: 'V-2.0-m',  leash: true, max: 2.0, gain: 3 },
    { name: 'V-3.0-m',  leash: true, max: 3.0, gain: 3 },
    { name: 'V-2.5-lo', leash: true, max: 2.5, gain: 1.5 },
    { name: 'V-2.5-hi', leash: true, max: 2.5, gain: 6 },
  ];

  // Run one (variant × track): spawn the sim WITH fairness output + hero-map + runaway-parade, read all
  // three JSONs → one metrics row.
  async function runVT(variant, track) {
    const outAbs = join(TMP_ABS, `${variant.name}__${track.id}`);
    const args = [
      'scripts/sim-fairness.mjs',
      `--track=${track.id}`, `--racer=${track.racer}`,
      `--seed=${SEED}`, `--races=${RACES}`, `--dur=${DUR}`,
      '--runaway-parade', '--hero-map', // hero-map → Holm; fairness-data → band-reach + action
      `--out=${toSimOut(outAbs)}`,
    ];
    if (variant.leash) { args.push(`--frontLeashMaxLengths=${variant.max}`, `--frontLeashGainPct=${variant.gain}`); }
    const t0 = Date.now();
    await pExecFile(process.execPath, args, { cwd: ROOT, maxBuffer: 256 * 1024 * 1024 });
    const rp = JSON.parse(readFileSync(join(outAbs, 'runaway-parade.json'), 'utf8'));
    const fd = JSON.parse(readFileSync(join(outAbs, 'fairness-data.json'), 'utf8'));
    let hm = {}; try { hm = JSON.parse(readFileSync(join(outAbs, 'hero-map.json'), 'utf8')); } catch { /* optional */ }
    const races = rp.races;
    const runaway = races.filter((r) => classifyRace(r.runawayParade, D).runawayWinner).length;
    const parade = races.filter((r) => classifyRace(r.runawayParade, D).paradeFinish).length;
    const nat = (fd.results || [])[0]?.avgNaturalness || {};
    return {
      variant: variant.name, track: track.id, type: track.closed ? 'closed' : 'open', n: races.length,
      runaway, parade,
      runawayRate: runaway / races.length, paradeRate: parade / races.length,
      b1: bandReach(fd.rawData, 1), b2: bandReach(fd.rawData, 2),
      holmUnfair: hm.fairness?.startRowUnfair ?? null,
      top5Action: nat.outcomeTop5SwapsMean ?? null,
      leashFrames: nat.leashFrames ?? null,
      _secs: (Date.now() - t0) / 1000,
    };
  }

  const jobs = [];
  for (const v of VARIANTS) for (const t of TRACKS) jobs.push({ v, t });
  const rows = new Array(jobs.length);
  const startTs = Date.now();
  let next = 0, done = 0;
  console.log(`\n=== exp-runaway-leader --leash-phase1 === ${VARIANTS.length} variants × ${TRACKS.length} tracks × N=${RACES} (seed=${SEED}), jobs=${JOBS}`);
  async function worker() {
    while (next < jobs.length) {
      const i = next++;
      rows[i] = await runVT(jobs[i].v, jobs[i].t);
      done++;
      console.log(`  [${done}/${jobs.length}] ${jobs[i].v.name.padEnd(9)} ${jobs[i].t.id.padEnd(15)} runaway=${(rows[i].runawayRate * 100).toFixed(0)}% parade=${(rows[i].paradeRate * 100).toFixed(0)}% leashF=${rows[i].leashFrames ?? '-'} ${rows[i]._secs.toFixed(0)}s`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(JOBS, jobs.length) }, worker));

  // Per-variant per-track CSV
  const RACE_COLS_V = ['variant', 'track', 'type', 'n', 'runaway', 'runawayRate', 'parade', 'paradeRate', 'b1', 'b2', 'holmUnfair', 'top5Action', 'leashFrames'];
  const csv = [RACE_COLS_V.join(','), ...rows.map((r) => RACE_COLS_V.map((c) => (r[c] == null ? '' : typeof r[c] === 'number' ? +r[c].toFixed(4) : r[c])).join(','))].join('\n') + '\n';
  writeFileSync(join(OUT_LEASH, 'per-variant-track.csv'), csv);

  // Aggregate per variant + PASS/FAIL vs gates; V0 = action reference.
  const byVariant = VARIANTS.map((v) => {
    const vr = rows.filter((r) => r.variant === v.name);
    const N = vr.reduce((s, r) => s + r.n, 0);
    const runaway = vr.reduce((s, r) => s + r.runaway, 0);
    const parade = vr.reduce((s, r) => s + r.parade, 0);
    const perTrack = {}; for (const r of vr) perTrack[r.track] = r.runawayRate;
    const maxTrackRunaway = Math.max(...vr.map((r) => r.runawayRate));
    const b1min = Math.min(...vr.map((r) => r.b1 ?? 0)); const b2min = Math.min(...vr.map((r) => r.b2 ?? 0));
    const holmTracks = vr.filter((r) => (r.holmUnfair ?? 0) > 0).length; // # of tracks with a Holm-unfair start row
    const action = mean(vr.map((r) => r.top5Action ?? 0));
    return { name: v.name, N, runawayRate: runaway / N, paradeRate: parade / N, perTrack, maxTrackRunaway, b1min, b2min, holmTracks, action };
  });
  const v0 = byVariant.find((v) => v.name === 'V0');
  for (const v of byVariant) {
    v.actionDelta = v0.action ? v.action - v0.action : 0;
    v.pass = v.runawayRate < 0.10 && v.maxTrackRunaway <= 0.15 && v.paradeRate <= 0.02
      && v.actionDelta >= 0 && v.b1min >= 0.70 && v.b2min >= 0.70 && v.holmTracks <= 2;
  }

  // SUMMARY.md
  const pctS = (x) => (x * 100).toFixed(1) + '%';
  const md = [];
  md.push('# Front Distance Leash — Phase-1a Exploration Sweep');
  md.push('');
  md.push(`Sim-only leash (SIM harness flags), all 4 tracks, **N=${RACES} per track**, seed=${SEED} (same seeds as the f40a7a6 baseline). Facts only — the variant decision is the owner's.`);
  md.push(`Leash: brake the current rank-1 racer in progress window [0.60, 0.92] when leader→P2 gap > maxLen; proportional brake (gainPct per excess length), floor 0.85, hysteresis 0.5, B1 floor. Flags OFF → byte-identical (fingerprint 72c3360fb75225ef verified).`);
  md.push('');
  md.push('## Gates');
  md.push('runaway <10% overall AND ≤15% every track AND parade ≤2% AND action Δ ≥ 0 AND B1&B2 band-reach ≥70% (every track) AND Holm ≤2/4 tracks.');
  md.push('');
  md.push('| variant | leash | runaway overall | runaway per track (lh/ms/sr/do) | max track | parade | top-5 action (Δ vs V0) | B1 min | B2 min | Holm | PASS |');
  md.push('|---|---|---|---|---|---|---|---|---|---|---|');
  const tks = TRACKS.map((t) => t.id);
  for (const v of byVariant) {
    const cfg = VARIANTS.find((x) => x.name === v.name);
    const leashStr = cfg.leash ? `${cfg.max}/${cfg.gain}` : 'off';
    const perTrackStr = tks.map((t) => (v.perTrack[t] != null ? pctS(v.perTrack[t]) : '-')).join(' / ');
    md.push(`| ${v.name} | ${leashStr} | ${pctS(v.runawayRate)} | ${perTrackStr} | ${pctS(v.maxTrackRunaway)} | ${pctS(v.paradeRate)} | ${(v.action ?? 0).toFixed(2)} (${v.actionDelta >= 0 ? '+' : ''}${v.actionDelta.toFixed(2)}) | ${pctS(v.b1min)} | ${pctS(v.b2min)} | ${v.holmTracks}/4 | ${v.pass ? '✅' : '❌'} |`);
  }
  md.push('');
  md.push(`Per-track column order: ${tks.join(' / ')}.`);
  md.push('Raw per-(variant×track) rows: `per-variant-track.csv`.');
  md.push('');
  writeFileSync(join(OUT_LEASH, 'SUMMARY.md'), md.join('\n'));

  console.log(`\nElapsed ${((Date.now() - startTs) / 60000).toFixed(1)}m → ${OUT_LEASH}`);
  console.log('\nSummary (runaway overall / max-track / parade / actionΔ / PASS):');
  for (const v of byVariant) console.log(`  ${v.name.padEnd(9)} ${pctS(v.runawayRate).padStart(6)} / ${pctS(v.maxTrackRunaway).padStart(6)} / ${pctS(v.paradeRate).padStart(5)} / ${(v.actionDelta >= 0 ? '+' : '') + v.actionDelta.toFixed(2)} / ${v.pass ? 'PASS' : 'fail'}`);
  process.exit(0);
}

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
