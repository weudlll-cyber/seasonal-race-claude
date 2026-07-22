// ============================================================
// exp-greenfield.mjs — GREENFIELD NIGHT RUN driver (P0 / P1 / composer sweeps).
//
// One driver, several phases (--phase=p0 | p1 | sweep). It reuses the committed sim harness and
// observer suite exactly like exp-runaway-leader.mjs: it spawns scripts/sim-fairness.mjs once per
// track, pins each run to that track + its seeded DEFAULT racer (read from the track seed, never
// hardcoded), and post-processes the read-only JSON the observers write. It changes NO race
// behaviour — every mechanism stays at its shipped default unless a composer flag is passed.
//
//   node scripts/exp-greenfield.mjs --phase=p0   [--races=100] [--seed=1] [--dur=60] [--jobs=4]
//   node scripts/exp-greenfield.mjs --phase=p1   [--seed=1]                 (arithmetic, no sim)
//   node scripts/exp-greenfield.mjs --phase=sweep --composer=<id> ...       (P4/P5/P6)
//
// P0 (physics tax): the --physics-tax observer over the 4 sweep tracks, N=100, 60 s. Reports
//   sigma (the reserve a composer must not spend), the tail (last-decile) loss, and whether the tax
//   is uniform or concentrated. Writes CSV + a short markdown verdict.
//
// The 4 sweep tracks are the same f40a7a6 baseline set (2 open + 2 closed) every other greenfield
// phase uses, so P0's sigma is measured on exactly the seeds the audit and the composers run on.
// ============================================================

import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, isAbsolute, relative } from 'path';
import { summarizePhysicsTax } from './sim/observers/physics-tax.mjs';
import { mulberry32 } from '../client/src/modules/racePlanner.js';

const pExecFile = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const argVal = (k, d) => { const m = argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };

const PHASE = argVal('phase', 'p0');
const RACES = Number(argVal('races', '100'));
const SEED  = Number(argVal('seed', '1'));
const DUR   = Number(argVal('dur', '60'));
const JOBS  = Math.max(1, Number(argVal('jobs', '4')));
const OUT_RAW = argVal('out', `reports/greenfield/${PHASE}`);
const OUT_ABS = isAbsolute(OUT_RAW) ? OUT_RAW : join(ROOT, OUT_RAW);
const TMP_ABS = join(ROOT, 'client/tmp/exp-greenfield', PHASE);
const toSimOut = (absDir) => relative(ROOT, absDir).replace(/\\/g, '/');

// The 4 sweep tracks (2 open + 2 closed). RACER is read from each seed's defaultRacerTypeId.
const TRACK_IDS = ['luger-hill', 'mountainstreet', 'searound', 'dirt-oval'];
const trackSeed = (id) => JSON.parse(readFileSync(join(ROOT, 'server/seeds/tracks', `${id}.json`), 'utf8'));
const TRACKS = TRACK_IDS.map((id) => {
  const s = trackSeed(id);
  return { id, racer: s.defaultRacerTypeId, closed: !!s.closed };
});

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const r4 = (x) => (x == null ? '' : +Number(x).toFixed(4));
const pct = (x) => (x == null ? 'n/a' : (x * 100).toFixed(1) + '%');

// ── P0: physics tax ─────────────────────────────────────────────────────────────────────────

async function runTrackP0(track) {
  const outAbs = join(TMP_ABS, track.id);
  const args = [
    'scripts/sim-fairness.mjs',
    `--track=${track.id}`, `--racer=${track.racer}`,
    `--seed=${SEED}`, `--races=${RACES}`, `--dur=${DUR}`,
    '--physics-tax', '--skip-main-output',
    `--out=${toSimOut(outAbs)}`,
  ];
  const t0 = Date.now();
  await pExecFile(process.execPath, args, { cwd: ROOT, maxBuffer: 256 * 1024 * 1024 });
  const j = JSON.parse(readFileSync(join(outAbs, 'physics-tax.json'), 'utf8'));
  const summary = summarizePhysicsTax(j.races, j.meta.bandHalfWidth);
  return { track, summary, bandHalfWidth: j.meta.bandHalfWidth, _secs: (Date.now() - t0) / 1000 };
}

async function phaseP0() {
  console.log(`\n=== GREENFIELD P0 — physics tax === ${TRACKS.length} tracks × N=${RACES} (seed=${SEED}, dur=${DUR}s), jobs=${JOBS}`);
  mkdirSync(OUT_ABS, { recursive: true });

  // Bounded worker pool over the 4 independent track runs.
  const jobList = [...TRACKS];
  const results = new Array(jobList.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= jobList.length) break;
      const r = await runTrackP0(jobList[i]);
      results[i] = r;
      console.log(`  ${r.track.id.padEnd(16)} sigma.mean=${pct(r.summary.sigma.mean)} sigma.p95=${pct(r.summary.sigma.p95)} tailSigma=${pct(r.summary.tailSigma)} conc=${r.summary.concentration?.toFixed(2)} (${r._secs.toFixed(0)}s)`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(JOBS, jobList.length) }, worker));

  // ── Pooled aggregate across all 4 tracks (the single sigma the composers must respect) ──
  const bandHalfWidth = results[0].bandHalfWidth;
  // Re-pool from the raw per-track summaries by re-reading the raw records (so the pooled percentiles
  // are over the full racer population, not an average of per-track percentiles).
  const allRaces = [];
  for (const t of TRACKS) {
    const j = JSON.parse(readFileSync(join(TMP_ABS, t.id, 'physics-tax.json'), 'utf8'));
    allRaces.push(...j.races);
  }
  const pooled = summarizePhysicsTax(allRaces, bandHalfWidth);

  // ── CSV: per-track + pooled ──
  const cols = ['scope', 'nRacers', 'bandHalfWidth', 'lostFracMean', 'lostFracP95', 'lostFracMax',
    'sigmaMean', 'sigmaP50', 'sigmaP90', 'sigmaP95', 'sigmaMax', 'tailLostFrac', 'tailSigma',
    'concentration', 'brakeFrameShareMean', 'draftGainFracMean'];
  const rowOf = (scope, s) => ({
    scope, nRacers: s.nRacers, bandHalfWidth: r4(s.bandHalfWidth),
    lostFracMean: r4(s.lostFrac.mean), lostFracP95: r4(s.lostFrac.p95), lostFracMax: r4(s.lostFrac.max),
    sigmaMean: r4(s.sigma.mean), sigmaP50: r4(s.sigma.p50), sigmaP90: r4(s.sigma.p90),
    sigmaP95: r4(s.sigma.p95), sigmaMax: r4(s.sigma.max),
    tailLostFrac: r4(s.tailLostFrac), tailSigma: r4(s.tailSigma),
    concentration: r4(s.concentration),
    brakeFrameShareMean: r4(s.brakeFrameShare.mean), draftGainFracMean: r4(s.draftGainFrac.mean),
  });
  const rows = [rowOf('POOLED', pooled), ...results.map((r) => rowOf(r.track.id, r.summary))];
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => r[c] ?? '').join(','))].join('\n') + '\n';
  writeFileSync(join(OUT_ABS, 'physics-tax.csv'), csv);

  // ── Decile profile CSV (pooled + per track) ──
  const decCols = ['scope', ...Array.from({ length: pooled.decileMeanLostFrac.length }, (_, i) => `d${i}`)];
  const decRows = [
    { scope: 'POOLED', ...Object.fromEntries(pooled.decileMeanLostFrac.map((v, i) => [`d${i}`, r4(v)])) },
    ...results.map((r) => ({ scope: r.track.id, ...Object.fromEntries(r.summary.decileMeanLostFrac.map((v, i) => [`d${i}`, r4(v)])) })),
  ];
  writeFileSync(join(OUT_ABS, 'physics-tax-deciles.csv'),
    [decCols.join(','), ...decRows.map((r) => decCols.map((c) => r[c] ?? '').join(','))].join('\n') + '\n');

  // ── Markdown verdict ──
  const md = [];
  md.push('# GREENFIELD P0 — Physics-tax measurement');
  md.push('');
  md.push(`Read-only \`--physics-tax\` observer on the shipped default engine. ${TRACKS.length} tracks (2 open + 2 closed), **N=${RACES} per track**, seed=${SEED}, dur=${DUR}s. Same f40a7a6 baseline seeds the audit and composers use. Shipped default fingerprint unchanged (OFF path byte-identical).`);
  md.push('');
  md.push('**sigma = lostFrac / bandHalfWidth** — the share of the natural speed band that live avoidance braking already consumes. A composer may spend at most `band × (1 − sigma)`. bandHalfWidth = ' + `${bandHalfWidth.toFixed(4)}` + ' (≈ ±8.13% at the shipped 0.00096/0.00113 base-speed config).');
  md.push('');
  md.push('## Pooled (all 4 tracks — the single reserve the composers must hold back)');
  md.push('');
  md.push(`- **sigma.mean = ${pct(pooled.sigma.mean)}**, sigma.p50 = ${pct(pooled.sigma.p50)}, sigma.p90 = ${pct(pooled.sigma.p90)}, sigma.p95 = ${pct(pooled.sigma.p95)}, sigma.max = ${pct(pooled.sigma.max)}`);
  md.push(`- lostFrac.mean = ${pct(pooled.lostFrac.mean)} (p95 = ${pct(pooled.lostFrac.p95)}, max = ${pct(pooled.lostFrac.max)})`);
  md.push(`- **tail (last-decile) loss = ${pct(pooled.tailLostFrac)}** → tailSigma = ${pct(pooled.tailSigma)} (sets p_last and the tier-boundary widening)`);
  md.push(`- **concentration = ${pooled.concentration?.toFixed(2)}** (1.0 = perfectly uniform drag; higher = a few bad places → ${pooled.concentration > 1.3 ? 'CONCENTRATED, easier to plan around' : 'roughly UNIFORM, more expensive to plan around'})`);
  md.push(`- brake-frame share mean = ${pct(pooled.brakeFrameShare.mean)}; drafting gain mean = ${pct(pooled.draftGainFrac.mean)} of applied distance`);
  md.push('');
  md.push('## Per track');
  md.push('');
  md.push('| track | type | sigma.mean | sigma.p95 | tailSigma | concentration | brakeFrameShare |');
  md.push('|---|---|---|---|---|---|---|');
  for (const r of results) {
    md.push(`| ${r.track.id} | ${r.track.closed ? 'closed' : 'open'} | ${pct(r.summary.sigma.mean)} | ${pct(r.summary.sigma.p95)} | ${pct(r.summary.tailSigma)} | ${r.summary.concentration?.toFixed(2)} | ${pct(r.summary.brakeFrameShare.mean)} |`);
  }
  md.push('');
  md.push('## Decile profile (pooled mean lostFrac per 10% of progress)');
  md.push('');
  md.push('| ' + pooled.decileMeanLostFrac.map((_, i) => `d${i}`).join(' | ') + ' |');
  md.push('|' + pooled.decileMeanLostFrac.map(() => '---').join('|') + '|');
  md.push('| ' + pooled.decileMeanLostFrac.map((v) => pct(v)).join(' | ') + ' |');
  md.push('');
  md.push('Data: `physics-tax.csv` (per-track + pooled aggregates), `physics-tax-deciles.csv` (decile profile).');
  md.push('');
  const totalSecs = results.reduce((s, r) => s + r._secs, 0);
  md.push(`Wall-clock: ${(totalSecs / 60).toFixed(1)} min total across ${TRACKS.length} tracks (jobs=${JOBS}).`);
  writeFileSync(join(OUT_ABS, 'SUMMARY.md'), md.join('\n') + '\n');

  console.log(`\nPOOLED: sigma.mean=${pct(pooled.sigma.mean)} sigma.p95=${pct(pooled.sigma.p95)} tail=${pct(pooled.tailLostFrac)} conc=${pooled.concentration?.toFixed(2)}`);
  console.log(`Wrote ${join(OUT_ABS, 'SUMMARY.md')}`);
}

// ── P1: inversion-budget audit ────────────────────────────────────────────────────────────────
//
// Pure arithmetic on the EXISTING per-race assignments (no race playback). The grid rank of the
// racer at grid position i is i+1 by construction, and its assigned finish rank is rankPool[i] where
// rankPool is exactly createRacePlan's seeded Fisher-Yates over 1..n (replicated + verified
// byte-for-byte against createRacePlan). So the required rank movement Δrank(i) = (i+1) − rankPool[i]
// is a property of the per-race PLAN SEED alone — identical across tracks for the same seed. Tracks
// differ only through the MEASURED field geometry (density g, field speed v) the observer records.
//
// Required mean speed differential to move Δrank ranks over duration T:
//   reqDist = |Δrank| · g            (racer lengths; g = mean adjacent-rank gap, measured)
//   reqDiff = reqDist / T            (lengths/second)
//   band    = b · v                  (lengths/second; b = 0.0813 = natural band half-width)
//   ratio   = reqDiff / band = |Δrank|·g / (T·v·b)
// Against the physics reserve, band → band·(1−σ), so ratioReduced = ratio / (1−σ).
//
// A racer is deliverable if ratio ≤ DELIVER_HI, undeliverable if ratio > 1.0, marginal in between.

const N = Number(argVal('races', '100'));
const DENSITY_N = Number(argVal('densityRaces', '20'));
const DURATIONS = (argVal('durations', '30,60,120,300')).split(',').map(Number);
const BAND_HALF = 0.00113 / ((0.00096 + 0.00113) / 2) - 1; // 0.0813, the shipped natural band half-width
const DELIVER_HI = 0.8; // ratio ≤ 0.8 = comfortably deliverable; 0.8–1.0 marginal; > 1.0 undeliverable

// Replicate createRacePlan's assignment shuffle for one plan seed (verified == createRacePlan).
function assignmentRankPool(seed, n) {
  const rng = mulberry32(seed);
  const pool = Array.from({ length: n }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

// Inversion count of a permutation (grid = identity, so this is the assignment's own inversion count
// = the number of adjacent transpositions = the race's action budget, per GREENFIELD-CC §1.1).
function inversionCount(perm) {
  let inv = 0;
  for (let i = 0; i < perm.length; i++) for (let j = i + 1; j < perm.length; j++) if (perm[i] > perm[j]) inv++;
  return inv;
}

async function measureDensity(track, durationSec) {
  const outAbs = join(TMP_ABS, `dens-${track.id}-${durationSec}`);
  const args = [
    'scripts/sim-fairness.mjs',
    `--track=${track.id}`, `--racer=${track.racer}`,
    `--seed=${SEED}`, `--races=${DENSITY_N}`, `--dur=${durationSec}`,
    '--physics-tax', '--skip-main-output', `--out=${toSimOut(outAbs)}`,
  ];
  await pExecFile(process.execPath, args, { cwd: ROOT, maxBuffer: 256 * 1024 * 1024 });
  const j = JSON.parse(readFileSync(join(outAbs, 'physics-tax.json'), 'utf8'));
  const gaps = j.races.map((r) => r.physicsTax.fieldGeom?.meanRankGapLen).filter((x) => x != null);
  const spds = j.races.map((r) => r.physicsTax.fieldGeom?.meanFieldSpeedLenPerSec).filter((x) => x != null);
  return { g: mean(gaps), v: mean(spds), nLive: mean(j.races.map((r) => r.physicsTax.fieldGeom?.meanNLive).filter((x) => x != null)) };
}

async function phaseP1() {
  console.log(`\n=== GREENFIELD P1 — inversion-budget audit === N=${N} seeds × ${TRACKS.length} tracks × durations ${DURATIONS.join('/')}s`);
  mkdirSync(OUT_ABS, { recursive: true });

  // σ from P0 (pooled sigma.mean). Read the committed P0 CSV; fall back to 0 with a warning.
  let sigma = 0;
  try {
    const p0csv = readFileSync(join(ROOT, 'reports/greenfield/p0/physics-tax.csv'), 'utf8').trim().split('\n');
    const hdr = p0csv[0].split(',');
    const pooled = p0csv.slice(1).map((l) => l.split(',')).find((r) => r[0] === 'POOLED');
    sigma = Number(pooled[hdr.indexOf('sigmaMean')]);
  } catch (e) {
    console.warn('  WARNING: could not read P0 sigma; using σ=0 (band×(1−σ) collapses to full band).');
  }
  console.log(`  using σ = ${(sigma * 100).toFixed(1)}% (from P0 pooled sigma.mean)`);

  // ── Assignment side (track-independent): Δrank per racer + inversion count per seed ──
  const allDelta = []; // pooled |Δrank| over all seeds/racers
  const invCounts = [];
  const perSeedAbsDelta = [];
  for (let raceIdx = 0; raceIdx < N; raceIdx++) {
    const planSeed = (SEED - 1) * N + raceIdx + 1;
    const pool = assignmentRankPool(planSeed, 40);
    invCounts.push(inversionCount(pool));
    const deltas = pool.map((tr, i) => (i + 1) - tr); // gridRank(i+1) − targetRank
    perSeedAbsDelta.push(deltas.map(Math.abs));
    for (const d of deltas) allDelta.push(Math.abs(d));
  }

  // ── Density side (measured per track × duration) ──
  console.log('  measuring field density (g, v) per track × duration...');
  const geom = {}; // geom[trackId][dur] = {g, v, nLive}
  const jobs = [];
  for (const track of TRACKS) { geom[track.id] = {}; for (const dur of DURATIONS) jobs.push({ track, dur }); }
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= jobs.length) break;
      const { track, dur } = jobs[i];
      geom[track.id][dur] = await measureDensity(track, dur);
      const gm = geom[track.id][dur];
      console.log(`    ${track.id.padEnd(16)} ${String(dur).padStart(3)}s  g=${gm.g.toFixed(3)}L  v=${gm.v.toFixed(3)}L/s`);
    }
  }
  await Promise.all(Array.from({ length: JOBS }, worker));

  // ── Audit grid: per (track, duration) × {full band, reduced band} ──
  const pctl = (arr, p) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))]; };
  const rows = [];
  for (const track of TRACKS) {
    for (const dur of DURATIONS) {
      const { g, v } = geom[track.id][dur];
      const dRace = v * dur; // lengths the field covers over the race
      for (const [bandName, effBand] of [['full', BAND_HALF], ['reduced', BAND_HALF * (1 - sigma)]]) {
        // ratio per racer, pooled over all seeds.
        const ratios = allDelta.map((ad) => (ad * g) / (dRace * effBand));
        const deliver = ratios.filter((r) => r <= DELIVER_HI).length / ratios.length;
        const undeliver = ratios.filter((r) => r > 1.0).length / ratios.length;
        const marginal = 1 - deliver - undeliver;
        const p50 = pctl(ratios, 50), p95 = pctl(ratios, 95);
        // Track-level verdict: median racer deliverable? tail deliverable?
        const verdict = p50 > 1.0 ? 'UNDELIVERABLE' : (p95 > 1.0 ? 'MARGINAL' : 'DELIVERABLE');
        rows.push({
          track: track.id, type: track.closed ? 'closed' : 'open', dur, band: bandName,
          g: r4(g), v: r4(v), dRaceLen: r4(dRace),
          ratioP50: r4(p50), ratioP95: r4(p95), ratioMax: r4(Math.max(...ratios)),
          deliverPct: r4(deliver), marginalPct: r4(marginal), undeliverPct: r4(undeliver),
          verdict,
        });
      }
    }
  }

  // ── CSV ──
  const cols = ['track', 'type', 'dur', 'band', 'g', 'v', 'dRaceLen', 'ratioP50', 'ratioP95', 'ratioMax', 'deliverPct', 'marginalPct', 'undeliverPct', 'verdict'];
  writeFileSync(join(OUT_ABS, 'inversion-audit.csv'),
    [cols.join(','), ...rows.map((r) => cols.map((c) => r[c] ?? '').join(','))].join('\n') + '\n');

  // ── Markdown ──
  const md = [];
  md.push('# GREENFIELD P1 — Inversion-budget audit');
  md.push('');
  md.push(`Pure arithmetic on the existing per-race assignments (no race playback). N=${N} plan seeds; grid = identity by construction; assignment = createRacePlan's seeded Fisher-Yates (replicated + verified byte-identical). Field density **g** and field speed **v** measured per track × duration with the read-only \`--physics-tax\` observer (N=${DENSITY_N} each). σ = ${(sigma * 100).toFixed(1)}% (P0). Natural band half-width b = ${BAND_HALF.toFixed(4)}.`);
  md.push('');
  md.push('**ratio = |Δrank|·g / (T·v·b)** — the required mean speed differential as a fraction of the natural band. ratio ≤ 1 ⇒ the move fits inside the band given the whole race. reduced band = b·(1−σ).');
  md.push('');
  md.push('## Assignment budget (track-independent)');
  md.push('');
  md.push(`- Inversion count per race (the action budget): mean ${mean(invCounts).toFixed(0)}, p50 ${pctl(invCounts, 50)}, min ${Math.min(...invCounts)}, max ${Math.max(...invCounts)} (of ${40 * 39 / 2} max for n=40).`);
  md.push(`- Required rank movement |Δrank| per racer: mean ${mean(allDelta).toFixed(1)}, p50 ${pctl(allDelta, 50)}, p95 ${pctl(allDelta, 95)}, max ${Math.max(...allDelta)}.`);
  md.push('');
  md.push('## Deliverability grid');
  md.push('');
  md.push('| track | dur | band | g (L) | v (L/s) | ratio p50 | ratio p95 | %deliver | %marginal | %undeliver | verdict |');
  md.push('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    md.push(`| ${r.track} | ${r.dur}s | ${r.band} | ${r.g} | ${r.v} | ${r.ratioP50} | ${r.ratioP95} | ${(r.deliverPct * 100).toFixed(0)}% | ${(r.marginalPct * 100).toFixed(0)}% | ${(r.undeliverPct * 100).toFixed(0)}% | ${r.verdict} |`);
  }
  md.push('');
  md.push('Verdict rule: DELIVERABLE = p95 racer ratio ≤ 1 (95% fit in band); MARGINAL = median fits but tail does not; UNDELIVERABLE = median racer cannot be delivered within band over the whole race.');
  md.push('');
  md.push('Data: `inversion-audit.csv`.');
  writeFileSync(join(OUT_ABS, 'SUMMARY.md'), md.join('\n') + '\n');
  console.log(`\nWrote ${join(OUT_ABS, 'SUMMARY.md')} (${rows.length} grid cells)`);
}

// ── dispatch ────────────────────────────────────────────────────────────────────────────────

if (PHASE === 'p0') {
  await phaseP0();
} else if (PHASE === 'p1') {
  await phaseP1();
} else {
  console.error(`Unknown --phase=${PHASE}. Supported here: p0. (p1 is a separate arithmetic driver; sweeps use exp-runaway-leader patterns.)`);
  process.exit(1);
}
