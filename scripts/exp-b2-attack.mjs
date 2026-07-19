// ============================================================
// exp-b2-attack.mjs — SIM SWEEP DRIVER for the B2-Heroes "Attack & Fall" experiment (+ hybrid arms).
//
// Same read-only orchestrator pattern as exp-pack-release.mjs: spawns scripts/sim-fairness.mjs once per
// (variant × track), pinned to one track + its seeded default racer, reads the JSON, emits per-variant CSV
// + a comparison table. Combos are independent + deterministic per seed → run up to --jobs concurrently.
//
// PHASES (select with --phase):
//   1a (default): 14-variant B2-attacker exploration, N=50 — count/depth/timing/finalRank sweeps.
//   2          : 3-arm hybrid — pack-release V3 alone / B2 winner alone / BOTH (params via --* overrides).
//
// METRICS: B1/B2 band-reach (rawData), Holm (hero-map.json), OUTCOME top-5 swaps (avgNaturalness), plus
// attacker diagnostics (attackerCast / attackerPeakReached / attackerFreed = casting-yield + peak-reached
// + completion) once sim-fairness surfaces them.
//
// USAGE: node scripts/exp-b2-attack.mjs [--phase=1a] [--races=50] [--jobs=6] [--seed=1] [--dur=60] [--out=<dir>]
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
const PHASE = argVal('phase', '1a');
const RACES = Number(argVal('races', PHASE === '1a' ? '50' : '100'));
const SEED = Number(argVal('seed', '1'));
const DUR = Number(argVal('dur', '60'));
const JOBS = Math.max(1, Number(argVal('jobs', '6')));
const OUT_RAW = argVal('out', `client/tmp/exp-b2-${PHASE}`);
const OUT_ABS = isAbsolute(OUT_RAW) ? OUT_RAW : join(ROOT, OUT_RAW);
const toSimOut = (absDir) => relative(ROOT, absDir).replace(/\\/g, '/');

const ALL_TRACKS = [
  ['luger-hill', 'luge', 'open'],
  ['mountainstreet', 'boarder', 'open'],
  ['searound', 'manta', 'closed'],
  ['dirt-oval', 'horse', 'closed'],
];
const TRACKS = ALL_TRACKS;

// A variant = servo/attacker config. b2n=attacker count, peak/final ranks, t=[start,end] attack window.
// pack=pack-release V3 (re-steer ≥2 ranks). Baseline of each sub-sweep is the "center" (b2n1/peak5/final10).
const mk = (name, o = {}) => ({
  name, pack: o.pack ?? false, b2n: o.b2n ?? 0, ba: o.ba ?? false, uba: o.uba ?? false,
  peak: o.peak ?? 5, final: o.final ?? 10, tStart: o.tStart ?? 0.4, tEnd: o.tEnd ?? 0.7,
});
const PHASE_1A = [
  mk('V0-baseline', { b2n: 0 }),
  // Count sweep (peak5/final10/timing0.40-0.70)
  mk('V1-ct1', { b2n: 1 }),
  mk('V2-ct2', { b2n: 2 }),
  // Peak-depth sweep (count1/final10/timing0.40-0.70)
  mk('V3-dp1', { b2n: 1, peak: 1 }),
  mk('V4-dp2', { b2n: 1, peak: 2 }),
  mk('V5-dp3', { b2n: 1, peak: 3 }),
  mk('V6-dp5', { b2n: 1, peak: 5 }),
  mk('V7-dp7', { b2n: 1, peak: 7 }),
  // Attack-timing sweep (count1/peak5/final10)
  mk('V8-tm-early', { b2n: 1, tStart: 0.3, tEnd: 0.5 }),
  mk('V9-tm-mid', { b2n: 1, tStart: 0.4, tEnd: 0.7 }),
  mk('V10-tm-late', { b2n: 1, tStart: 0.6, tEnd: 0.85 }),
  // Final-rank (orchestrated-fall length) sweep (count1/peak5/timing0.40-0.70)
  mk('V11-fr-top', { b2n: 1, final: 7 }),
  mk('V12-fr-mid', { b2n: 1, final: 10 }),
  mk('V13-fr-bot', { b2n: 1, final: 14 }),
];
// Phase 1b — confirm the winner (peak=5, final=7) and sweep attacker COUNT (1/2/3) at that config.
const PHASE_1B = [
  mk('V0-baseline', { b2n: 0 }),
  mk('V11-conf', { b2n: 1, peak: 5, final: 7 }),
  mk('V11x2', { b2n: 2, peak: 5, final: 7 }),
  mk('V11x3', { b2n: 3, peak: 5, final: 7 }),
];
// Holm-confirm: just the count=3 winner (peak=5, final=7), run WITH --hero-map to measure start-row Holm.
const PHASE_HOLM3 = [mk('V11x3-holm', { b2n: 3, peak: 5, final: 7 })];
// Final-rank probe at count=3, peak=5. NOTE: final<7 is invalid at peak=5 (final clamps to ≥6, and
// peak5/final6 degenerates to no-attack), so 7 is the highest-release valid attack; the sweep tests
// whether going DEEPER (9/10/12) beats 7. final=7 releases 1 rank inside the top edge (margin vs leak).
const PHASE_FR = [
  mk('V0-baseline', { b2n: 0 }),
  mk('V-fr7', { b2n: 3, peak: 5, final: 7 }),
  mk('V-fr9', { b2n: 3, peak: 5, final: 9 }),
  mk('V-fr10', { b2n: 3, peak: 5, final: 10 }),
  mk('V-fr12', { b2n: 3, peak: 5, final: 12 }),
];
// Band-arrival vs fixed-final A/B at count=3 (peak=5, final=7). band-arrival frees on band re-entry
// (rank 6, edge, no margin); fixed-final steers to rank 7 (margin) before freeing. WITH --hero-map (Holm).
const PHASE_BA = [
  mk('V0-baseline', { b2n: 0 }),
  mk('fixed-final7', { b2n: 3, peak: 5, final: 7, ba: false }),
  mk('band-arrival', { b2n: 3, peak: 5, final: 7, ba: true }),
];
// Universal band-arrival A/B: V0 = B2-attackers only (current); V1 = + universal band-arrival for
// B1-heroes AND normal pack (free inside assigned band). WITH --hero-map for Holm.
const PHASE_UBA = [
  mk('V0-b2only', { b2n: 3, peak: 5, final: 7 }),
  mk('V1-universal', { b2n: 3, peak: 5, final: 7, uba: true }),
];
// Phase 2 arms — override b2 params on the CLI (--peak / --final / --b2n / --tStart / --tEnd) to match the
// Phase-1b winner. Arm-A pack only; Arm-B attacker only; Arm-C both.
const winner = { b2n: Number(argVal('b2n', '1')), peak: Number(argVal('peak', '5')), final: Number(argVal('final', '10')), tStart: Number(argVal('tStart', '0.4')), tEnd: Number(argVal('tEnd', '0.7')) };
const PHASE_2 = [
  mk('ArmA-packV3', { pack: true, b2n: 0 }),
  mk('ArmB-b2win', { pack: false, ...winner }),
  mk('ArmC-both', { pack: true, ...winner }),
];
const VARIANTS = PHASE === '2' ? PHASE_2 : PHASE === '1b' ? PHASE_1B : PHASE === 'holm3' ? PHASE_HOLM3 : PHASE === 'fr' ? PHASE_FR : PHASE === 'ba' ? PHASE_BA : PHASE === 'uba' ? PHASE_UBA : PHASE_1A;
// --no-holm: skip --hero-map (the biggest per-combo cost). Band-reach still comes from rawData; only the
// (secondary, noisy at N=50) Holm start-row verdict is dropped. Run Holm separately on the final winner.
const NO_HOLM = argv.includes('--no-holm');

const zoneIdxOf = (rank) => { for (let i = 0; i < BAND_EDGES.length; i++) if (rank <= BAND_EDGES[i]) return i; return BAND_EDGES.length; };
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
const pct = (v) => (v == null ? 'n/a' : (v * 100).toFixed(1) + '%');
const fx = (v, d = 2) => (v == null ? 'n/a' : Number(v).toFixed(d));
function bandReach(rawData, bandNum) {
  const rows = rawData.filter((r) => r.sollBereich === bandNum);
  if (!rows.length) return { reach: null, n: 0 };
  return { reach: rows.filter((r) => zoneIdxOf(r.finalRank) === bandNum - 1).length / rows.length, n: rows.length };
}

async function runCombo(v, track) {
  const [trackId, racer] = track;
  const comboAbs = join(OUT_ABS, `${v.name}__${trackId}`);
  const args = [
    'scripts/sim-fairness.mjs', `--track=${trackId}`, `--racer=${racer}`,
    `--seed=${SEED}`, `--races=${RACES}`, `--dur=${DUR}`,
    ...(NO_HOLM ? [] : ['--hero-map']),
    `--pack-release=${v.pack}`, `--pack-resteer-threshold=1.5`, // V3 = re-steer at ≥2 ranks
    `--b2-attack-heroes=${v.b2n}`, `--b2-attack-peak-rank=${v.peak}`, `--b2-attack-final-rank=${v.final}`,
    `--b2-attack-progress-start=${v.tStart}`, `--b2-attack-progress-end=${v.tEnd}`,
    `--b2-attack-band-arrival=${v.ba}`,
    `--universal-band-arrival=${v.uba}`,
    `--out=${toSimOut(comboAbs)}`,
  ];
  const t0 = Date.now();
  await pExecFile(process.execPath, args, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
  const fd = JSON.parse(readFileSync(join(comboAbs, 'fairness-data.json'), 'utf8'));
  let hm = {}; try { hm = JSON.parse(readFileSync(join(comboAbs, 'hero-map.json'), 'utf8')); } catch { /* optional */ }
  const nat = ((fd.results || [])[0] || {}).avgNaturalness || {};
  const b1 = bandReach(fd.rawData || [], 1), b2 = bandReach(fd.rawData || [], 2);
  return {
    _secs: (Date.now() - t0) / 1000,
    variant: v.name, track: trackId, racer, type: track[2], nRaces: RACES,
    b2n: v.b2n, peak: v.peak, final: v.final, tWin: `${v.tStart}-${v.tEnd}`, pack: v.pack,
    b1Reach: b1.reach, b2Reach: b2.reach,
    holmUnfair: hm.fairness?.startRowUnfair ?? null,
    top5Mean: nat.outcomeTop5SwapsMean ?? null, totalMean: nat.outcomeTotalSwapsMean ?? null,
    attackerCast: nat.attackerCast ?? null, attackerPeakReached: nat.attackerPeakReached ?? null,
    attackerFreed: nat.attackerFreed ?? null,
    releaseEvents: nat.packReleaseEvents ?? null, outOfBandFrac: nat.racersInCorridorFraction != null ? 1 - nat.racersInCorridorFraction : null,
  };
}

const CSV_COLS = ['variant', 'track', 'racer', 'type', 'nRaces', 'b2n', 'peak', 'final', 'tWin', 'pack',
  'b1Reach', 'b2Reach', 'holmUnfair', 'top5Mean', 'totalMean', 'attackerCast', 'attackerPeakReached', 'attackerFreed', 'releaseEvents', 'outOfBandFrac'];
const toCsv = (rows) => [CSV_COLS.join(','), ...rows.map((r) => CSV_COLS.map((c) => r[c] ?? '').join(','))].join('\n');

mkdirSync(OUT_ABS, { recursive: true });
console.log(`\n=== exp-b2-attack — Phase ${PHASE} (${VARIANTS.length} variants × ${TRACKS.length} tracks × ${RACES} races = ${VARIANTS.length * TRACKS.length * RACES}, jobs=${JOBS}) ===`);
console.log(`Out: ${OUT_ABS}\n`);
const jobs = [];
for (const v of VARIANTS) for (const track of TRACKS) jobs.push({ v, track });
const results = new Array(jobs.length);
const t0 = Date.now();
let next = 0, done = 0;
async function worker() {
  while (next < jobs.length) {
    const i = next++; const { v, track } = jobs[i];
    try { results[i] = await runCombo(v, track); }
    catch (e) { results[i] = { variant: v.name, track: track[0], _err: String(e.message || e) }; }
    done++;
    console.log(`  [${String(done).padStart(2)}/${jobs.length}] ${v.name.padEnd(12)} ${track[0].padEnd(15)} ${results[i]._secs ? results[i]._secs.toFixed(0) + 's' : 'ERR'}  (elapsed ${((Date.now() - t0) / 60000).toFixed(1)}m)`);
  }
}
await Promise.all(Array.from({ length: Math.min(JOBS, jobs.length) }, worker));
const rows = results.filter((r) => !r._err);
for (const v of VARIANTS) writeFileSync(join(OUT_ABS, `${v.name}.csv`), toCsv(rows.filter((r) => r.variant === v.name)));
writeFileSync(join(OUT_ABS, 'ALL.csv'), toCsv(rows));

console.log('\n=== SUMMARY (mean across tracks; B1 & B2 reach ≥70% are PRIMARY gates) ===');
const hdr = ['variant', 'B1', 'B2', 'Holm', 'top5/race', 'cast', 'peakRchd', 'freed', 'outOfBand'];
console.log('| ' + hdr.join(' | ') + ' |');
console.log('|' + hdr.map(() => '---').join('|') + '|');
const base = {};
for (const v of VARIANTS) {
  const rs = rows.filter((r) => r.variant === v.name);
  const g = {
    b1: mean(rs.map((r) => r.b1Reach).filter((x) => x != null)), b2: mean(rs.map((r) => r.b2Reach).filter((x) => x != null)),
    holm: rs.reduce((s, r) => s + (r.holmUnfair ? 1 : 0), 0),
    top5: mean(rs.map((r) => r.top5Mean).filter((x) => x != null)),
    cast: mean(rs.map((r) => r.attackerCast).filter((x) => x != null)),
    peak: mean(rs.map((r) => r.attackerPeakReached).filter((x) => x != null)),
    freed: mean(rs.map((r) => r.attackerFreed).filter((x) => x != null)),
    oob: mean(rs.map((r) => r.outOfBandFrac).filter((x) => x != null)),
  };
  if (v.name.includes('baseline') || v.name === 'ArmA-packV3') Object.assign(base, g);
  const d = base.top5 ? ` (${((g.top5 - base.top5) / base.top5 * 100).toFixed(0)}%)` : '';
  console.log(`| ${v.name} | ${pct(g.b1)} | ${pct(g.b2)} | ${g.holm}/${rs.length} | ${fx(g.top5)}${d} | ${fx(g.cast, 2)} | ${fx(g.peak, 2)} | ${fx(g.freed, 2)} | ${pct(g.oob)} |`);
}
console.log(`\nWrote per-variant CSVs + ALL.csv to ${OUT_ABS}`);
console.log('Gates: B1 ≥70% + B2 ≥70% (attacker must not break B2). Winners: high top5 + cast≥~0.6 + fairness holds.');
console.log('SWEEP-COMPLETE');
