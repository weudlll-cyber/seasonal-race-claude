// ============================================================
// exp-pack-release.mjs — SIM SWEEP DRIVER for the Pack-Only Strictness Release experiment.
//
// WHAT IT DOES: spawns the shared sim (scripts/sim-fairness.mjs) once per (variant × track), each run
// pinned to one track + its seeded default racer, reads the JSON each run writes, and emits a per-variant
// CSV + a console comparison table. It is a READ-ONLY post-processor around the sim CLI (same pattern as
// fingerprint-default.mjs): it changes no race outcome, it only orchestrates + aggregates.
//
// PARALLELISM: the 16 (variant × track) combos are INDEPENDENT and deterministic per seed, so wall-clock
// is cut by running up to --jobs of them concurrently (default 4). Results are identical to a serial run;
// only the wall-clock differs. The spec's "serial sweeps" describes the logical matrix, not a hard
// requirement to leave cores idle.
//
// METRICS (per variant × track):
//   • B1 / B2 band-reach   — from fairness-data.json rawData (zoneIdxOf(finalRank) == sollBereich-1).
//   • Holm-unfair start rows — from hero-map.json (sim's own computeExtendedFairnessStats output).
//   • OUTCOME rank-change  — outcomeTop5Swaps / outcomeTotalSwaps (mean+std) from results[].avgNaturalness.
//   • Servo diagnostics    — packReleaseEvents / packReSteerEvents / packReleasedFrameFraction, and
//                            outOfBandFraction = 1 - racersInCorridorFraction (the F1-trap gauge).
//
// USAGE:
//   node scripts/exp-pack-release.mjs [--races=100] [--seed=1] [--dur=60] [--jobs=4] [--smoke] [--out=<dir>]
//     --smoke  → races=8, only 2 tracks (luger-hill + searound), for wiring validation.
//   Deterministic: --seed=1 → every variant runs the SAME per-race seeds (1..races), so variant deltas
//   are paired (same fields, only the servo release differs).
// ============================================================
import { execFile } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname, isAbsolute, relative } from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { BAND_EDGES } from '../client/src/modules/racePlanner.js';

const pExecFile = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const argVal = (k, d) => { const m = argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };
const SMOKE = argv.includes('--smoke');
const RACES = Number(argVal('races', SMOKE ? '8' : '100'));
const SEED = Number(argVal('seed', '1'));
const DUR = Number(argVal('dur', '60'));
const JOBS = Math.max(1, Number(argVal('jobs', '4'))); // concurrent sim processes
// Output dir may be ABSOLUTE (e.g. a non-OneDrive-synced scratchpad, to avoid sync overhead on every
// JSON write) or relative-to-ROOT. sim-fairness resolves its --out as join(ROOT, out) and cannot take an
// absolute path, so we hand it a ROOT-relative path (…/../AppData/…) while we read/write the absolute one.
const OUT_RAW = argVal('out', SMOKE ? 'client/tmp/exp-pack-release-smoke' : 'client/tmp/exp-pack-release');
const OUT_ABS = isAbsolute(OUT_RAW) ? OUT_RAW : join(ROOT, OUT_RAW);
const toSimOut = (absDir) => relative(ROOT, absDir).replace(/\\/g, '/'); // ROOT-relative, forward slashes

// The 4 tracks (CC selection): 2 open, 2 closed. NOTE per the seed JSON, Searound is CLOSED and Luger
// Hill is OPEN (the spec's parenthetical labels are swapped); the mandatory NAMES are honoured and the
// split still resolves 2+2.
//   Open   : luger-hill (luge, mandatory), mountainstreet (boarder)
//   Closed : searound   (manta, mandatory), dirt-oval      (horse) — the canonical closed oval
const ALL_TRACKS = [
  ['luger-hill', 'luge', 'open'],
  ['mountainstreet', 'boarder', 'open'],
  ['searound', 'manta', 'closed'],
  ['dirt-oval', 'horse', 'closed'],
];
const TRACKS = SMOKE ? [ALL_TRACKS[0], ALL_TRACKS[2]] : ALL_TRACKS; // one open + one closed for smoke

// Serial variant sweep: baseline OFF, then release ON at three re-steer thresholds.
// NOTE (CC correction to the spec): bandError is INTEGER-valued (a rank difference), and the racePlanner
// gate re-steers on `Math.abs(bandError) > threshold`. So the spec's 1.0 and 1.5 are BEHAVIOURALLY
// IDENTICAL (both ⇔ ≥2 ranks past the edge) and would waste a variant. The meaningful knob is
// ranks-out-before-re-steer ∈ {1,2,3}; this sweep uses 0.5 / 1.5 / 2.5 to hit exactly those three
// distinct levels (⇔ re-steer at ≥1 / ≥2 / ≥3 ranks out), preserving the spec's 0.5 and 1.5 values and
// its "three increasing freedom levels" intent. The spec's 1.0 == this sweep's 1.5 (the middle level).
const VARIANTS = [
  { name: 'V1-baseline', release: false, thr: 0.0 }, // servo unchanged (gate OFF)
  { name: 'V2-out1', release: true, thr: 0.5 },       // re-steer at ≥1 rank out (spec 0.5; re-engage early)
  { name: 'V3-out2', release: true, thr: 1.5 },       // re-steer at ≥2 ranks out (spec 1.0 ≡ 1.5; hypothesis)
  { name: 'V4-out3', release: true, thr: 2.5 },       // re-steer at ≥3 ranks out (loosest; drift risk)
];

// 0-based band index of a rank (mirrors racePlanner.rankToBandIndex; single-sourced BAND_EDGES).
const zoneIdxOf = (rank) => { for (let i = 0; i < BAND_EDGES.length; i++) if (rank <= BAND_EDGES[i]) return i; return BAND_EDGES.length; };

const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
const pct = (v) => (v == null ? 'n/a' : (v * 100).toFixed(1) + '%');
const fx = (v, d = 2) => (v == null ? 'n/a' : Number(v).toFixed(d));

// Band-reach for one target band (bandNum: 1=B1, 2=B2) from a run's rawData.
function bandReach(rawData, bandNum) {
  const rows = rawData.filter((r) => r.sollBereich === bandNum);
  if (!rows.length) return { reach: null, n: 0 };
  const hits = rows.filter((r) => zoneIdxOf(r.finalRank) === bandNum - 1).length;
  return { reach: hits / rows.length, n: rows.length };
}

// Run one (variant, track) combo → parse its two JSON outputs into one metrics row.
async function runCombo(variant, track) {
  const [trackId, racer] = track;
  const comboAbs = join(OUT_ABS, `${variant.name}__${trackId}`);
  const args = [
    'scripts/sim-fairness.mjs',
    `--track=${trackId}`, `--racer=${racer}`,
    `--seed=${SEED}`, `--races=${RACES}`, `--dur=${DUR}`,
    '--hero-map', // makes the sim compute Holm start-row fairness + write hero-map.json
    `--pack-release=${variant.release}`,
    `--pack-resteer-threshold=${variant.thr}`,
    `--out=${toSimOut(comboAbs)}`,
  ];
  const t0 = Date.now();
  await pExecFile(process.execPath, args, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
  const fd = JSON.parse(readFileSync(join(comboAbs, 'fairness-data.json'), 'utf8'));
  let hm = {};
  try { hm = JSON.parse(readFileSync(join(comboAbs, 'hero-map.json'), 'utf8')); } catch { /* hero-map optional */ }
  const combo = (fd.results || [])[0] || {};
  const nat = combo.avgNaturalness || {};
  const b1 = bandReach(fd.rawData || [], 1);
  const b2 = bandReach(fd.rawData || [], 2);
  return {
    _secs: (Date.now() - t0) / 1000,
    variant: variant.name, track: trackId, racer, type: track[2], nRaces: RACES,
    b1Reach: b1.reach, b1N: b1.n, b2Reach: b2.reach, b2N: b2.n,
    holmUnfair: hm.fairness?.startRowUnfair ?? null, holmMinP: hm.fairness?.startRowMinPHolm ?? null,
    top5Mean: nat.outcomeTop5SwapsMean ?? null, top5Std: nat.outcomeTop5SwapsStd ?? null,
    totalMean: nat.outcomeTotalSwapsMean ?? null, totalStd: nat.outcomeTotalSwapsStd ?? null,
    releaseEvents: nat.packReleaseEvents ?? null, reSteerEvents: nat.packReSteerEvents ?? null,
    releasedFrac: nat.packReleasedFrameFraction ?? null,
    outOfBandFrac: nat.racersInCorridorFraction != null ? 1 - nat.racersInCorridorFraction : null,
  };
}

const CSV_COLS = [
  'variant', 'track', 'racer', 'type', 'nRaces',
  'b1Reach', 'b1N', 'b2Reach', 'b2N', 'holmUnfair', 'holmMinP',
  'top5Mean', 'top5Std', 'totalMean', 'totalStd',
  'releaseEvents', 'reSteerEvents', 'releasedFrac', 'outOfBandFrac',
];
const toCsv = (rows) => [CSV_COLS.join(','), ...rows.map((r) => CSV_COLS.map((c) => r[c] ?? '').join(','))].join('\n');

// ── Run the sweep (bounded-concurrency pool over all combos) ─────────────────────
mkdirSync(OUT_ABS, { recursive: true });
console.log(`\n=== exp-pack-release — Pack-Only Strictness Release sweep ===`);
console.log(`Variants ${VARIANTS.length} × Tracks ${TRACKS.length} × Races ${RACES} (seed=${SEED}, dur=${DUR}s) = ${VARIANTS.length * TRACKS.length * RACES} races, jobs=${JOBS}`);
console.log(`Out: ${OUT_ABS}\n`);

const jobList = [];
for (const variant of VARIANTS) for (const track of TRACKS) jobList.push({ variant, track });
const results = new Array(jobList.length);
const startTs = Date.now();
let nextIdx = 0, doneCount = 0;
async function worker() {
  while (nextIdx < jobList.length) {
    const i = nextIdx++;
    const { variant, track } = jobList[i];
    results[i] = await runCombo(variant, track);
    doneCount++;
    const el = ((Date.now() - startTs) / 60000).toFixed(1);
    console.log(`  [${String(doneCount).padStart(2)}/${jobList.length}] ${variant.name.padEnd(12)} ${track[0].padEnd(15)} ${results[i]._secs.toFixed(0)}s  (elapsed ${el}m)`);
  }
}
await Promise.all(Array.from({ length: Math.min(JOBS, jobList.length) }, worker));
const allRows = results;

for (const variant of VARIANTS) {
  writeFileSync(join(OUT_ABS, `${variant.name}.csv`), toCsv(allRows.filter((r) => r.variant === variant.name)));
}
writeFileSync(join(OUT_ABS, 'ALL.csv'), toCsv(allRows));

// ── Console comparison table (per variant, aggregated across tracks) ─────────────
console.log('\n=== SUMMARY (mean across tracks; B1 reach is the PRIMARY gate ≥70%) ===');
const hdr = ['variant', 'B1reach', 'B2reach', 'HolmUnfair', 'top5/race', 'total/race', 'release/race', 'reSteer/race', 'outOfBand'];
console.log('| ' + hdr.join(' | ') + ' |');
console.log('|' + hdr.map(() => '---').join('|') + '|');
const baseline = {};
for (const variant of VARIANTS) {
  const rows = allRows.filter((r) => r.variant === variant.name);
  const agg = {
    b1: mean(rows.map((r) => r.b1Reach).filter((v) => v != null)),
    b2: mean(rows.map((r) => r.b2Reach).filter((v) => v != null)),
    holm: rows.reduce((s, r) => s + (r.holmUnfair ? 1 : 0), 0),
    top5: mean(rows.map((r) => r.top5Mean).filter((v) => v != null)),
    total: mean(rows.map((r) => r.totalMean).filter((v) => v != null)),
    rel: mean(rows.map((r) => r.releaseEvents).filter((v) => v != null)),
    res: mean(rows.map((r) => r.reSteerEvents).filter((v) => v != null)),
    oob: mean(rows.map((r) => r.outOfBandFrac).filter((v) => v != null)),
  };
  if (variant.name === 'V1-baseline') Object.assign(baseline, agg);
  const dTop5 = baseline.top5 ? ` (${((agg.top5 - baseline.top5) / baseline.top5 * 100).toFixed(0)}%)` : '';
  const dTotal = baseline.total ? ` (${((agg.total - baseline.total) / baseline.total * 100).toFixed(0)}%)` : '';
  console.log(`| ${variant.name} | ${pct(agg.b1)} | ${pct(agg.b2)} | ${agg.holm}/${rows.length} | ${fx(agg.top5)}${dTop5} | ${fx(agg.total)}${dTotal} | ${fx(agg.rel, 1)} | ${fx(agg.res, 1)} | ${pct(agg.oob)} |`);
}
console.log(`\nWrote per-variant CSVs + ALL.csv to ${OUT_ABS}`);
console.log('B1 band-reach ≥ 70% (PRIMARY) + HolmUnfair = 0 (SECONDARY) are the binding gates; top5/total per race are the action signal.');
console.log('SWEEP-COMPLETE');
