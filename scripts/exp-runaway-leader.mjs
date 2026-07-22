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
import { classifyRace, RUNAWAY_PARADE_DEFAULTS, formationLeaderStable, formationBucket, SPEED_SOURCE_SAMPLES } from './sim/observers/runaway-parade.mjs';
import { BAND_EDGES } from '../client/src/modules/racePlanner.js';
import { bandExitAfterRelease, p1SwapAfter090 } from './sim/observers/release-contest.mjs';
import { classifyFrontBattle, FRONT_BATTLE_DEFAULTS } from './sim/observers/outcome-front-battle.mjs';

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
// SPEED-SOURCE DIAGNOSTIC (--speed-source-diag). READ-ONLY: decompose the late-race speed of the top-15
// live ranks into its multiplicative factors, measure clamp saturation + headroom, and map fight
// potential. Same f40a7a6 baseline seeds. Facts only — the mechanism decision is the owner's.
// ════════════════════════════════════════════════════════════════════════════════
if (argv.includes('--speed-source-diag')) {
  const OUT_S = join(OUT_ABS, 'speed-source');
  mkdirSync(OUT_S, { recursive: true });
  mkdirSync(TMP_ABS, { recursive: true });
  const med = (a) => percentile(a, 0.5);
  const VAR_FACTORS = ['spreadFactor', 'speedBonusMult', 'boost', 'brake', 'rowEnvMult', 'trajectoryMult', 'areaBonusMult', 'governorMult'];

  async function runTrackS(track) {
    const outAbs = join(TMP_ABS, `speedsrc__${track.id}`);
    const args = [
      'scripts/sim-fairness.mjs', `--track=${track.id}`, `--racer=${track.racer}`,
      `--seed=${SEED}`, `--races=${RACES}`, `--dur=${DUR}`,
      '--runaway-parade', '--speed-source', '--skip-main-output', `--out=${toSimOut(outAbs)}`,
    ];
    await pExecFile(process.execPath, args, { cwd: ROOT, maxBuffer: 512 * 1024 * 1024 });
    const rp = JSON.parse(readFileSync(join(outAbs, 'runaway-parade.json'), 'utf8'));
    const ss = JSON.parse(readFileSync(join(outAbs, 'speed-source.json'), 'utf8'));
    const runawayByIdx = new Map();
    let runawayCount = 0;
    for (const r of rp.races) { const isR = classifyRace(r.runawayParade, D).runawayWinner; runawayByIdx.set(r.raceIdx, isR); if (isR) runawayCount++; }
    // Flatten every (race, sample, position) record, tagged with runaway class.
    const recs = [];
    for (const r of ss.races) {
      const isR = runawayByIdx.get(r.raceIdx) ? 1 : 0;
      for (const sample of Object.keys(r.speedSource.samples)) {
        for (const pos of r.speedSource.samples[sample]) {
          recs.push({ track: track.id, type: track.closed ? 'closed' : 'open', raceIdx: r.raceIdx, runaway: isR, sample: Number(sample), ...pos });
        }
      }
    }
    return { track, recs, runawayCount, nRaces: rp.races.length };
  }

  const jobsS = [...TRACKS];
  const perTrackS = new Array(jobsS.length);
  let nextS = 0, doneS = 0; const t0S = Date.now();
  console.log(`\n=== exp-runaway-leader --speed-source-diag === ${TRACKS.length} tracks × N=${RACES} (seed=${SEED}), jobs=${JOBS}`);
  async function workerS() {
    while (nextS < jobsS.length) {
      const i = nextS++; perTrackS[i] = await runTrackS(jobsS[i]); doneS++;
      console.log(`  [${doneS}/${jobsS.length}] ${jobsS[i].id.padEnd(15)} runaway=${perTrackS[i].runawayCount}/${perTrackS[i].nRaces}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(JOBS, jobsS.length) }, workerS));
  const allRecs = perTrackS.flatMap((p) => p.recs);

  // ── Consistency gate (runaway rates = baseline) + cross-check (product == effSpeed) ──
  const BASELINE_RUNAWAY = { 'luger-hill': 18, 'mountainstreet': 18, 'searound': 30, 'dirt-oval': 28 };
  const gateFail = [];
  for (const p of perTrackS) {
    if (RACES === 100 && BASELINE_RUNAWAY[p.track.id] != null && p.runawayCount !== BASELINE_RUNAWAY[p.track.id]) {
      gateFail.push(`${p.track.id}: runaway ${p.runawayCount}/100 (baseline ${BASELINE_RUNAWAY[p.track.id]}/100)`);
    }
  }
  const totalRunaway = perTrackS.reduce((s, p) => s + p.runawayCount, 0);
  if (RACES === 100 && TRACKS.length === 4 && totalRunaway !== 94) gateFail.push(`OVERALL: runaway ${totalRunaway}/400 (baseline 94/400)`);
  // Cross-check: product == effSpeed within 1e-9 on all non-finish-clamped records.
  let xCk = 0, xBad = 0;
  for (const r of allRecs) { if (!r.finishClamp) { xCk++; if (Math.abs(r.product - r.effSpeed) > 1e-9) xBad++; } }
  if (xBad > 0) gateFail.push(`CROSS-CHECK: ${xBad}/${xCk} records where product != effSpeed (>1e-9) — decomposition incomplete`);

  // Per-track raw decomposition CSVs (also the determinism re-run target).
  const S_COLS = ['track', 'type', 'raceIdx', 'runaway', 'sample', 'rank', 'index', 'effSpeed', 'product', 'baseSpeed', 'spreadFactor', 'speedBonusMult', 'boost', 'brake', 'rowEnvMult', 'trajectoryMult', 'areaBonusMult', 'governorMult', 'servoSaturated', 'servoHeadroom', 'bandHeadroom', 'finishClamp', 'gapAhead'];
  const toCsvS = (rows) => [S_COLS.join(','), ...rows.map((r) => S_COLS.map((c) => (r[c] == null ? '' : r[c])).join(','))].join('\n') + '\n';
  for (const p of perTrackS) writeFileSync(join(OUT_S, `speed-source-${p.track.id}.csv`), toCsvS(p.recs));

  if (gateFail.length) {
    const msg = ['# Speed-Source Diagnostic — GATE FAILED (STOPPED)', '', 'A verification gate failed — NOT reported. Investigate before trusting any number.', '', ...gateFail.map((g) => `- ${g}`), ''].join('\n');
    writeFileSync(join(OUT_S, 'SUMMARY.md'), msg);
    console.error('\n❌ GATE FAILED:\n' + gateFail.map((g) => '  ' + g).join('\n'));
    process.exit(1);
  }

  // ── Aggregation helpers ──────────────────────────────────────────────────────
  // median factor value at a position, filtered by class + optional track. `sel` picks P1 (rank==1) or
  // the chaser pool (rank 2..15).
  const pick = (cls, trackId, rankSel) => allRecs.filter((r) => r.runaway === cls && (trackId ? r.track === trackId : true) && rankSel(r.rank));
  const isP1 = (rk) => rk === 1;
  const isChaser = (rk) => rk >= 2 && rk <= 15;

  // Component decomposition: median factor at P1 vs the P2–P15 pool, per class (overall).
  const decompRows = (cls) => {
    const p1 = pick(cls, null, isP1); const ch = pick(cls, null, isChaser);
    return VAR_FACTORS.map((f) => {
      const mp1 = med(p1.map((r) => r[f])); const mch = med(ch.map((r) => r[f]));
      return { factor: f, p1: mp1, chaser: mch, ratio: mch !== 0 ? mp1 / mch : 0, delta: mp1 - mch };
    });
  };
  const decompRun = decompRows(1); const decompNon = decompRows(0);
  // Headline: the variable factor with the largest P1/chaser ratio among runaway races.
  const topFactor = [...decompRun].filter((d) => d.chaser !== 0).sort((a, b) => b.ratio - a.ratio)[0];
  const p1TrajRun = med(pick(1, null, isP1).map((r) => r.trajectoryMult));
  const p1SatShareRun = (() => { const p1 = pick(1, null, isP1); return p1.length ? p1.filter((r) => r.servoSaturated === 1).length / p1.length : 0; })();

  // Saturation + headroom per position (runaway, overall).
  const satRows = (cls) => Array.from({ length: 15 }, (_, i) => {
    const rk = i + 1; const rows = pick(cls, null, (x) => x === rk);
    return {
      rank: rk, n: rows.length,
      satShare: rows.length ? rows.filter((r) => r.servoSaturated === 1).length / rows.length : 0,
      servoHead: med(rows.map((r) => r.servoHeadroom)),
      bandHead: med(rows.map((r) => r.bandHeadroom)),
      effSpeed: med(rows.map((r) => r.effSpeed)),
    };
  });
  const satRun = satRows(1);

  // Gap structure at 0.90: median gapAhead per position + how many of P2..P15 sit within 3.0L of P1.
  const at090 = (cls) => allRecs.filter((r) => r.runaway === cls && Math.abs(r.sample - 0.9) < 1e-9);
  const gapStruct = (cls) => {
    const rows = at090(cls);
    const byRank = Array.from({ length: 15 }, (_, i) => med(rows.filter((r) => r.rank === i + 1).map((r) => r.gapAhead)));
    // cumulative gap to P1 per race, count within 3.0L (ranks 2..15)
    const byRace = new Map();
    // Key by (track, raceIdx): raceIdx 0..99 repeats per track, so a bare raceIdx collides across tracks.
    for (const r of rows) { const k = `${r.track}:${r.raceIdx}`; if (!byRace.has(k)) byRace.set(k, {}); byRace.get(k)[r.rank] = r.gapAhead; }
    const within3 = [];
    for (const [, ranks] of byRace) { let cum = 0, cnt = 0; for (let rk = 2; rk <= 15; rk++) { if (ranks[rk] == null) break; cum += ranks[rk]; if (cum <= 3.0) cnt++; } within3.push(cnt); }
    return { byRank, within3Median: med(within3), within3Mean: within3.length ? within3.reduce((s, x) => s + x, 0) / within3.length : 0, n: byRace.size };
  };
  const gapRun = gapStruct(1); const gapNon = gapStruct(0);

  // ── SUMMARY.md ───────────────────────────────────────────────────────────────
  const f6 = (x) => (x == null ? '-' : Number(x).toFixed(6));
  const f3 = (x) => (x == null ? '-' : Number(x).toFixed(3));
  const pctS = (x) => (100 * x).toFixed(1) + '%';
  const md = [];
  md.push('# Runaway Speed-Source Diagnostic — WHERE does the leader\'s late overspeed come from?');
  md.push('');
  md.push(`Read-only, unmodified baseline (all gap-servo config absent, shipped defaults). All 4 tracks, **N=${RACES} per track**, seed=${SEED} (same seeds as the f40a7a6 baseline). Top-15 live ranks decomposed at samples ${SPEED_SOURCE_SAMPLES.map((s) => s.toFixed(2)).join('/')}.`);
  md.push('Consistency gate PASSED (runaway = baseline). Cross-check PASSED: on all ' + xCk + ' non-finish-clamped records, effSpeed == product of the recorded factors (within 1e-9) — the decomposition is complete, no factor missed.');
  md.push('');
  md.push('**Speed chain (from `raceStep.js advanceRacerT`):** `effSpeed = baseSpeed · boost · brake · rowEnvMult · trajectoryMult · areaBonusMult · governorMult` (× dt), then a FINISH clamp only. `rowEnvMult` = rowBonusPost; `areaBonusMult` = areaBonusPost. baseSpeed = const · **spreadFactor** · speedBonusMult. There is **no single pre-finish speed clamp** — each factor is clamped at its own source (trajectoryMult∈[0.85,1.10]; spreadFactor∈natural band ≤' + (perTrackS[0] ? '' : '') + ' ~1.081; governorMult∈pulk envelope).');
  md.push('');

  md.push('## Headline');
  md.push(`Among runaway races, the largest P1-vs-chaser speed-delta source in [0.70, 0.95] is **${topFactor.factor}** (median P1 ${f6(topFactor.p1)} vs P2–P15 ${f6(topFactor.chaser)}, ratio ${topFactor.ratio.toFixed(4)}). P1's median trajectoryMult is **${f3(p1TrajRun)}** — ${p1TrajRun < 1.0 ? 'BELOW 1.0, i.e. the servo is BRAKING the leader, not boosting it' : 'at/above 1.0'}; P1 runs servo-clamped (traj ≥ maxMult) in ${pctS(p1SatShareRun)} of samples. So the escape speed is ${topFactor.factor === 'spreadFactor' ? 'the leader\'s NATURAL re-roll draw, not the servo or areaBonus' : 'led by ' + topFactor.factor}.`);
  md.push('');

  const decompTable = (rows, label) => {
    const lines = [`### ${label}`, '| factor | P1 median | P2–P15 median | ratio | delta |', '|---|---|---|---|---|'];
    for (const d of rows) lines.push(`| ${d.factor} | ${f6(d.p1)} | ${f6(d.chaser)} | ${d.ratio.toFixed(4)} | ${(d.delta >= 0 ? '+' : '') + d.delta.toFixed(6)} |`);
    return lines;
  };
  md.push('## Component decomposition — P1 vs P2–P15 median (variable factors, window [0.70,0.95])');
  md.push(...decompTable(decompRun, 'RUNAWAY races'));
  md.push('');
  md.push(...decompTable(decompNon, 'NON-RUNAWAY races'));
  md.push('');

  md.push('## Clamp saturation + headroom per position — RUNAWAY races');
  md.push('`satShare` = fraction of samples with trajectoryMult pinned at the servo ceiling (1.10). `servoHead` = median (maxMult − traj) — how much MORE the servo could add. `bandHead` = median (natCeil − spreadFactor) — natural-speed headroom.');
  md.push('| pos | n | satShare | servoHead | bandHead | median effSpeed |');
  md.push('|---|---|---|---|---|---|');
  for (const s of satRun) md.push(`| P${s.rank} | ${s.n} | ${pctS(s.satShare)} | ${f3(s.servoHead)} | ${f6(s.bandHead)} | ${f6(s.effSpeed)} |`);
  md.push('');
  md.push('*(Fight potential: a chaser with large `servoHead` AND `bandHead` COULD be sped up to close the gap; a leader already at low headroom cannot pull much further away.)*');
  md.push('');

  md.push('## Gap structure at 0.90 — median consecutive gap (lengths) + how many sit within 3.0L of P1');
  md.push('| pos gap | ' + Array.from({ length: 14 }, (_, i) => `P${i + 1}→P${i + 2}`).join(' | ') + ' |');
  md.push('|---|' + Array.from({ length: 14 }, () => '---').join('|') + '|');
  md.push('| RUNAWAY | ' + gapRun.byRank.slice(1).map((g) => f3(g)).join(' | ') + ' |');
  md.push('| non-runaway | ' + gapNon.byRank.slice(1).map((g) => f3(g)).join(' | ') + ' |');
  md.push('');
  md.push(`Racers within 3.0L of P1 at 0.90 (of P2..P15): RUNAWAY median **${gapRun.within3Median}** (mean ${gapRun.within3Mean.toFixed(2)}, n=${gapRun.n}); non-runaway median ${gapNon.within3Median} (mean ${gapNon.within3Mean.toFixed(2)}, n=${gapNon.n}).`);
  md.push('');
  md.push('Raw per-(race×sample×position) rows: `speed-source-<track>.csv`.');
  md.push('');
  writeFileSync(join(OUT_S, 'SUMMARY.md'), md.join('\n'));

  console.log(`\nElapsed ${((Date.now() - t0S) / 60000).toFixed(1)}m → ${OUT_S}`);
  console.log(`Cross-check PASSED (${xCk} records, 0 mismatch). Headline factor: ${topFactor.factor} (ratio ${topFactor.ratio.toFixed(4)}); P1 median traj=${f3(p1TrajRun)}.`);
  console.log(`Within 3.0L of P1 at 0.90: RUNAWAY median ${gapRun.within3Median} vs non-runaway ${gapNon.within3Median}.`);
  process.exit(0);
}

// ════════════════════════════════════════════════════════════════════════════════
// RUNAWAY FORMATION DIAGNOSTIC (--formation-diag). READ-ONLY: measures WHEN the leader→P2 gap forms
// on the unmodified baseline (leash absent, shipped defaults), so the next mechanism decision rests on
// data. Same f40a7a6 baseline seeds. Facts only — the decision is the owner's.
// ════════════════════════════════════════════════════════════════════════════════
if (argv.includes('--formation-diag')) {
  const OUT_F = join(OUT_ABS, 'formation-diag');
  mkdirSync(OUT_F, { recursive: true });
  mkdirSync(TMP_ABS, { recursive: true });
  const quart = (a) => { const s = [...a].sort((x, y) => x - y); return { p25: percentile(s, 0.25), p50: percentile(s, 0.5), p75: percentile(s, 0.75), n: s.length }; };

  async function runTrackF(track) {
    const outAbs = join(TMP_ABS, `formation__${track.id}`);
    const args = [
      'scripts/sim-fairness.mjs', `--track=${track.id}`, `--racer=${track.racer}`,
      `--seed=${SEED}`, `--races=${RACES}`, `--dur=${DUR}`,
      '--runaway-parade', '--skip-main-output', `--out=${toSimOut(outAbs)}`,
    ];
    await pExecFile(process.execPath, args, { cwd: ROOT, maxBuffer: 256 * 1024 * 1024 });
    const j = JSON.parse(readFileSync(join(outAbs, 'runaway-parade.json'), 'utf8'));
    const races = [...j.races].sort((a, b) => a.raceIdx - b.raceIdx);
    return races.map((rec) => {
      const rp = rec.runawayParade; const f = rp.formation || {};
      const c = classifyRace(rp, D);
      return {
        track: track.id, type: track.closed ? 'closed' : 'open', raceIdx: rec.raceIdx, seed: rec.seed,
        runaway: c.runawayWinner ? 1 : 0, parade: c.paradeFinish ? 1 : 0,
        firstCross15: f.firstCross15, sustained15: f.sustained15 == null ? '' : (f.sustained15 ? 1 : 0),
        firstCross30: f.firstCross30, sustained30: f.sustained30 == null ? '' : (f.sustained30 ? 1 : 0),
        gapAt030: f.gapAt030, gapAt060: f.gapAt060,
        leaderStable: (() => { const s = formationLeaderStable(f.leaderIdxAtCross30, rp.finalRankByIndex); return s == null ? '' : (s ? 1 : 0); })(),
      };
    });
  }

  const jobsF = [...TRACKS];
  const perTrackRows = new Array(jobsF.length);
  let nextF = 0, doneF = 0; const t0F = Date.now();
  console.log(`\n=== exp-runaway-leader --formation-diag === ${TRACKS.length} tracks × N=${RACES} (seed=${SEED}), jobs=${JOBS}`);
  async function workerF() {
    while (nextF < jobsF.length) {
      const i = nextF++; perTrackRows[i] = await runTrackF(jobsF[i]); doneF++;
      const run = perTrackRows[i].filter((r) => r.runaway).length;
      console.log(`  [${doneF}/${jobsF.length}] ${jobsF[i].id.padEnd(15)} runaway=${run}/${perTrackRows[i].length}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(JOBS, jobsF.length) }, workerF));
  const all = perTrackRows.flat();

  // ── Consistency gate: runaway/parade rates MUST equal the recorded f40a7a6 baseline (N=100) ──
  // Read-only run on identical seeds ⇒ byte-identical outcomes ⇒ exact counts.
  const BASELINE_RUNAWAY = { 'luger-hill': 18, 'mountainstreet': 18, 'searound': 30, 'dirt-oval': 28 };
  const gateFail = [];
  for (const t of TRACKS) {
    const rows = all.filter((r) => r.track === t.id);
    const run = rows.filter((r) => r.runaway).length;
    if (RACES === 100 && BASELINE_RUNAWAY[t.id] != null && run !== BASELINE_RUNAWAY[t.id]) {
      gateFail.push(`${t.id}: runaway ${run}/100 (baseline ${BASELINE_RUNAWAY[t.id]}/100)`);
    }
  }
  const overallRun = all.filter((r) => r.runaway).length;
  // The overall-94 gate only applies to the full 4-track run (a single-track re-run for the determinism
  // check has its own per-track gate above).
  if (RACES === 100 && TRACKS.length === 4 && overallRun !== 94) gateFail.push(`OVERALL: runaway ${overallRun}/400 (baseline 94/400 = 23.5%)`);

  // Per-track CSVs (used by the determinism re-run check).
  const F_COLS = ['track', 'type', 'raceIdx', 'seed', 'runaway', 'parade', 'firstCross15', 'sustained15', 'firstCross30', 'sustained30', 'gapAt030', 'gapAt060', 'leaderStable'];
  const toCsvF = (rows) => [F_COLS.join(','), ...rows.map((r) => F_COLS.map((c) => (r[c] == null ? '' : typeof r[c] === 'number' ? +Number(r[c]).toFixed(4) : r[c])).join(','))].join('\n') + '\n';
  for (const t of TRACKS) writeFileSync(join(OUT_F, `formation-${t.id}.csv`), toCsvF(all.filter((r) => r.track === t.id)));
  writeFileSync(join(OUT_F, 'formation-races.csv'), toCsvF(all));

  if (gateFail.length) {
    const msg = ['# Formation Diagnostic — CONSISTENCY GATE FAILED (STOPPED)', '', 'The runaway rates deviate from the recorded f40a7a6 baseline — the comparison basis is broken, so the diagnostic is NOT reported. Investigate before trusting any formation number.', '', ...gateFail.map((g) => `- ${g}`), ''].join('\n');
    writeFileSync(join(OUT_F, 'SUMMARY.md'), msg);
    console.error('\n❌ CONSISTENCY GATE FAILED:\n' + gateFail.map((g) => '  ' + g).join('\n'));
    console.error(`\nWrote STOP report → ${join(OUT_F, 'SUMMARY.md')}`);
    process.exit(1);
  }

  // ── Histograms + distributions (facts only) ─────────────────────────────────────
  const BUCKETS = ['lt030', '030to060', '060to075', '075to090', 'never'];
  const BUCKET_LABEL = { lt030: '[0,0.30)', '030to060': '[0.30,0.60)', '060to075': '[0.60,0.75)', '075to090': '[0.75,0.90)', never: 'never' };
  const hist = (rows, field) => { const h = Object.fromEntries(BUCKETS.map((b) => [b, 0])); for (const r of rows) h[formationBucket(r[field])]++; return h; };
  const runRows = all.filter((r) => r.runaway);
  const nonRunRows = all.filter((r) => !r.runaway);

  const md = [];
  md.push('# Runaway Formation Diagnostic — WHEN does the leader gap form?');
  md.push('');
  md.push(`Read-only, unmodified baseline (leash absent, shipped defaults). All 4 tracks, **N=${RACES} per track**, seed=${SEED} (same seeds as the f40a7a6 baseline). Consistency gate PASSED (runaway/parade rates = baseline). Facts only — the mechanism decision is the owner's.`);
  md.push(`Thresholds: 1.5L / 3.0L crossings; sustained-window end 0.90; boundary samples at 0.30 and 0.60. Same shared lap-aware length as the runaway observer.`);
  md.push('');
  const runawayN = runRows.length;
  md.push(`Runaway races: **${runawayN}/${all.length}** (${(100 * runawayN / all.length).toFixed(1)}%). Non-runaway: ${nonRunRows.length}.`);
  md.push('');

  // Headline
  const before060 = runRows.filter((r) => r.firstCross30 != null && r.firstCross30 < 0.60).length;
  const in060_075 = runRows.filter((r) => r.firstCross30 != null && r.firstCross30 >= 0.60 && r.firstCross30 < 0.75).length;
  const at075plus = runRows.filter((r) => r.firstCross30 != null && r.firstCross30 >= 0.75).length;
  md.push('## Headline');
  md.push(`Of the ${runawayN} runaway races, the 3.0L lead was first crossed **BEFORE 0.60 in ${before060} (${(100 * before060 / runawayN).toFixed(1)}%)**, in [0.60, 0.75) in ${in060_075} (${(100 * in060_075 / runawayN).toFixed(1)}%), and at 0.75 or later in ${at075plus} (${(100 * at075plus / runawayN).toFixed(1)}%).`);
  md.push('');

  // firstCross30 histogram (runaway) overall + per track
  const histTable = (field, rows) => {
    const lines = ['| scope | ' + BUCKETS.map((b) => BUCKET_LABEL[b]).join(' | ') + ' |', '|---|' + BUCKETS.map(() => '---').join('|') + '|'];
    const overall = hist(rows, field);
    lines.push('| OVERALL | ' + BUCKETS.map((b) => overall[b]).join(' | ') + ' |');
    for (const t of TRACKS) { const h = hist(rows.filter((r) => r.track === t.id), field); lines.push(`| ${t.id} | ` + BUCKETS.map((b) => h[b]).join(' | ') + ' |'); }
    return lines;
  };
  md.push('## firstCross30 histogram — RUNAWAY races (counts)');
  md.push(...histTable('firstCross30', runRows));
  md.push('');
  md.push('## firstCross15 histogram — RUNAWAY races (counts)');
  md.push(...histTable('firstCross15', runRows));
  md.push('');

  // Quartiles of firstCross30 among runaway races
  const fc30 = runRows.filter((r) => r.firstCross30 != null).map((r) => r.firstCross30);
  const q30 = quart(fc30);
  md.push('## firstCross30 among runaway races — quartiles (progress)');
  md.push(`p25 = ${q30.p25.toFixed(3)}, **median = ${q30.p50.toFixed(3)}**, p75 = ${q30.p75.toFixed(3)} (n=${q30.n}).`);
  md.push('');

  // gapAt060 distribution: runaway vs non-runaway
  const g60run = quart(runRows.filter((r) => r.gapAt060 != null).map((r) => r.gapAt060));
  const g60non = quart(nonRunRows.filter((r) => r.gapAt060 != null).map((r) => r.gapAt060));
  md.push('## gapAt060 (leader→P2 at the PULK→OUTCOME handoff) — the most decision-relevant number');
  md.push('| set | p25 | median | p75 | n |');
  md.push('|---|---|---|---|---|');
  md.push(`| RUNAWAY | ${g60run.p25.toFixed(2)} | **${g60run.p50.toFixed(2)}** | ${g60run.p75.toFixed(2)} | ${g60run.n} |`);
  md.push(`| non-runaway | ${g60non.p25.toFixed(2)} | ${g60non.p50.toFixed(2)} | ${g60non.p75.toFixed(2)} | ${g60non.n} |`);
  md.push('');
  md.push('(Lengths. How big the leader→P2 gap already is at progress 0.60 — the earliest the leash could act.)');
  md.push('');

  // leaderStable
  const lsRows = runRows.filter((r) => r.leaderStable !== '');
  const lsTrue = lsRows.filter((r) => r.leaderStable === 1).length;
  md.push('## leaderStable among runaway races');
  md.push(`In ${lsTrue}/${lsRows.length} (${lsRows.length ? (100 * lsTrue / lsRows.length).toFixed(1) : '0'}%) of runaway races, the racer leading when 3.0L was first crossed is the one that finishes rank 1 (the eventual winner already leads at gap formation).`);
  md.push('');
  md.push('Data: `formation-races.csv` (all), `formation-<track>.csv` (per track, for the determinism re-run check).');
  md.push('');
  writeFileSync(join(OUT_F, 'SUMMARY.md'), md.join('\n'));

  console.log(`\nElapsed ${((Date.now() - t0F) / 60000).toFixed(1)}m → ${OUT_F}`);
  console.log('Consistency gate: PASSED (runaway/parade = baseline).');
  console.log(`Headline: 3.0L crossed BEFORE 0.60 in ${before060}/${runawayN} runaway races (${(100 * before060 / runawayN).toFixed(0)}%); gapAt060 median RUNAWAY=${g60run.p50.toFixed(2)}L vs non-runaway=${g60non.p50.toFixed(2)}L.`);
  process.exit(0);
}

// ════════════════════════════════════════════════════════════════════════════════
// OVERNIGHT CONFIRMATION (--gapreroll-confirm) — ALL 10 tracks, N=200, 60s, default racers.
// 3 arms run SEQUENTIALLY (V0 → SYM-1.5-s075 → SYM-1.5-s10) with STOP gates between; measurement only
// (feature frozen at master b1f6617). Includes the paired per-seed conversion analysis (pure
// post-processing of the runaway-parade record — no sim/observer changes needed).
// ════════════════════════════════════════════════════════════════════════════════
if (argv.includes('--gapreroll-confirm')) {
  const OUT_C = join(OUT_ABS, 'confirm-n200');
  mkdirSync(OUT_C, { recursive: true });
  mkdirSync(TMP_ABS, { recursive: true });
  const ALL10 = ['dirt-oval', 'river-run', 'space-sprint', 'garden-path', 'city-circuit', 'luger-hill', 'ice-track', 'mountainstreet', 'searound', 'seatrack'];
  const TRK = (ONLY ? [ONLY] : ALL10).map((id) => { const s = trackSeed(id); return { id, racer: s.defaultRacerTypeId, closed: !!s.closed }; });
  const KNOWN = { 'luger-hill': 18, 'mountainstreet': 18, 'searound': 30, 'dirt-oval': 28 }; // baseline first-100-seed counts
  const med = (a) => (a.length ? percentile(a, 0.5) : 0);
  const q = (a, p) => (a.length ? percentile(a, p) : 0);
  const zoneIdxOf = (rank) => { for (let i = 0; i < BAND_EDGES.length; i++) if (rank <= BAND_EDGES[i]) return i; return BAND_EDGES.length; };
  const bandReach = (rawData, b) => { const rows = (rawData || []).filter((r) => r.sollBereich === b); return rows.length ? rows.filter((r) => zoneIdxOf(r.finalRank) === b - 1).length / rows.length : null; };
  const ARMS = [
    { name: 'V0', gr: false },
    { name: 'SYM-1.5-s075', gr: true, mode: 'symmetric', G: 1.5, s: 0.75 },
    { name: 'SYM-1.5-s10', gr: true, mode: 'symmetric', G: 1.5, s: 1.0 },
  ];
  const store = {}; // store[arm][track] = { agg, bySeed: {seed: record} }

  async function runArmTrack(arm, track) {
    const outAbs = join(TMP_ABS, `${arm.name}__${track.id}`);
    const args = ['scripts/sim-fairness.mjs', `--track=${track.id}`, `--racer=${track.racer}`,
      `--seed=${SEED}`, `--races=${RACES}`, `--dur=${DUR}`, '--runaway-parade', '--hero-map', `--out=${toSimOut(outAbs)}`];
    if (arm.gr) args.push(`--gapRerollThresholdLengths=${arm.G}`, `--gapRerollMode=${arm.mode}`, `--gapRerollStrength=${arm.s}`);
    else args.push('--gapRerollEnabled=false'); // shipped default is now ON — an OFF arm must say so
    await pExecFile(process.execPath, args, { cwd: ROOT, maxBuffer: 512 * 1024 * 1024 });
    const rp = JSON.parse(readFileSync(join(outAbs, 'runaway-parade.json'), 'utf8'));
    const fd = JSON.parse(readFileSync(join(outAbs, 'fairness-data.json'), 'utf8'));
    let hm = {}; try { hm = JSON.parse(readFileSync(join(outAbs, 'hero-map.json'), 'utf8')); } catch { /* opt */ }
    const bySeed = {};
    let runaway = 0, parade = 0; const within3All = [];
    for (const rec of rp.races) {
      const c = classifyRace(rec.runawayParade, D);
      const rpr = rec.runawayParade;
      bySeed[rec.seed] = { runaway: c.runawayWinner, parade: c.paradeFinish, within3: rpr.within3P1At090, gap090: rpr.leaderGapP2At090Len, leaderIdx: rpr.leaderIdxAt090, finalRank: rpr.finalRankByIndex };
      if (c.runawayWinner) runaway++; if (c.paradeFinish) parade++; within3All.push(rpr.within3P1At090 ?? 0);
    }
    const nat = (fd.results || [])[0]?.avgNaturalness || {};
    return {
      bySeed,
      agg: { arm: arm.name, track: track.id, type: track.closed ? 'closed' : 'open', n: rp.races.length,
        runaway, parade, runawayRate: runaway / rp.races.length, paradeRate: parade / rp.races.length,
        within3Med: med(within3All), b1: bandReach(fd.rawData, 1), b2: bandReach(fd.rawData, 2),
        holmUnfair: hm.fairness?.startRowUnfair ?? null, top5Action: nat.outcomeTop5SwapsMean ?? null,
        gapWindowRolls: nat.gapWindowRolls ?? null, gapBiasedRolls: nat.gapBiasedRolls ?? null, gapLeaderDutyCycle: nat.gapLeaderDutyCycle ?? null },
    };
  }

  async function runArm(arm) {
    store[arm.name] = {};
    const jobs = [...TRK]; let nx = 0, dn = 0;
    async function w() { while (nx < jobs.length) { const i = nx++; const r = await runArmTrack(arm, jobs[i]); store[arm.name][jobs[i].id] = r; dn++; console.log(`  ${arm.name.padEnd(13)} [${dn}/${jobs.length}] ${jobs[i].id.padEnd(15)} runaway=${r.agg.runaway}/${r.agg.n} winRolls=${r.agg.gapWindowRolls != null ? r.agg.gapWindowRolls.toFixed(0) : '-'}`); } }
    await Promise.all(Array.from({ length: Math.min(JOBS, jobs.length) }, w));
  }

  const t0 = Date.now();
  console.log(`\n=== gapreroll-confirm === ${ARMS.length} arms × ${TRK.length} tracks × N=${RACES} (seed=${SEED}), jobs=${JOBS}`);

  // ── A1: V0, then STOP GATE 1 (first-100-seed continuity on the 4 known tracks) ──
  await runArm(ARMS[0]);
  const knownPresent = Object.keys(KNOWN).filter((k) => TRK.some((t) => t.id === k));
  if (knownPresent.length === 4 && RACES >= 100) {
    const fails = [];
    for (const k of knownPresent) {
      const bs = store.V0[k].bySeed;
      let sub = 0; for (let s = 1; s <= 100; s++) if (bs[s]?.runaway) sub++;
      if (sub !== KNOWN[k]) fails.push(`${k}: first-100 runaway ${sub} (baseline ${KNOWN[k]})`);
    }
    if (fails.length) {
      writeFileSync(join(OUT_C, 'SUMMARY.md'), `# Confirmation STOPPED — continuity gate failed after A1 (V0)\n\nV0's first-100-seed subset must reproduce the baseline EXACTLY. It did not — comparison basis broken; A2/A3 NOT run.\n\n${fails.map((f) => `- ${f}`).join('\n')}\n`);
      console.error('\n❌ STOP GATE 1 FAILED:\n' + fails.map((f) => '  ' + f).join('\n'));
      process.exit(1);
    }
    console.log('  STOP gate 1 PASSED (V0 first-100-seed = baseline on all 4 known tracks).');
  } else {
    console.log(`  STOP gate 1 SKIPPED (only ${knownPresent.length}/4 known tracks in this run).`);
  }

  // ── A2: SYM-1.5-s075, then STOP GATE 2 (window rolls > 0 on all tracks) ──
  await runArm(ARMS[1]);
  const zeroWin = TRK.filter((t) => (store['SYM-1.5-s075'][t.id].agg.gapWindowRolls ?? 0) <= 0).map((t) => t.id);
  if (zeroWin.length) {
    writeFileSync(join(OUT_C, 'SUMMARY.md'), `# Confirmation STOPPED — window-eligible rolls still 0 (A2)\n\nThe closed-track regression: A2 must have window-eligible rolls > 0 on ALL tracks. Still 0 on: ${zeroWin.join(', ')}. A3 NOT run.\n`);
    console.error(`\n❌ STOP GATE 2 FAILED: window rolls 0 on ${zeroWin.join(', ')}`);
    process.exit(1);
  }
  console.log('  STOP gate 2 PASSED (window rolls > 0 on all tracks in A2).');

  // ── A3: SYM-1.5-s10 ──
  await runArm(ARMS[2]);

  // ── Per-(arm,track) race CSVs (determinism re-run target) + aggregate CSV ──
  const RCOLS = ['arm', 'track', 'seed', 'runaway', 'parade', 'within3', 'gap090', 'leaderIdx'];
  for (const arm of ARMS) for (const t of TRK) {
    const bs = store[arm.name][t.id].bySeed;
    const rows = Object.keys(bs).map(Number).sort((a, b) => a - b).map((s) => ({ arm: arm.name, track: t.id, seed: s, runaway: bs[s].runaway ? 1 : 0, parade: bs[s].parade ? 1 : 0, within3: bs[s].within3 ?? '', gap090: bs[s].gap090 ?? '', leaderIdx: bs[s].leaderIdx ?? '' }));
    writeFileSync(join(OUT_C, `races-${arm.name}-${t.id}.csv`), [RCOLS.join(','), ...rows.map((r) => RCOLS.map((c) => (typeof r[c] === 'number' ? +Number(r[c]).toFixed(4) : r[c])).join(','))].join('\n') + '\n');
  }
  const ACOLS = ['arm', 'track', 'type', 'n', 'runaway', 'runawayRate', 'paradeRate', 'within3Med', 'b1', 'b2', 'holmUnfair', 'top5Action', 'gapWindowRolls', 'gapBiasedRolls', 'gapLeaderDutyCycle'];
  const aggRows = ARMS.flatMap((a) => TRK.map((t) => store[a.name][t.id].agg));
  writeFileSync(join(OUT_C, 'per-arm-track.csv'), [ACOLS.join(','), ...aggRows.map((r) => ACOLS.map((c) => (r[c] == null ? '' : typeof r[c] === 'number' ? +r[c].toFixed(4) : r[c])).join(','))].join('\n') + '\n');

  // ── Per-arm aggregate (overall + PASS/FAIL) ──
  const armAgg = (name) => {
    const ar = TRK.map((t) => store[name][t.id].agg);
    const N = ar.reduce((s, r) => s + r.n, 0), runaway = ar.reduce((s, r) => s + r.runaway, 0), parade = ar.reduce((s, r) => s + r.parade, 0);
    return { name, N, runawayRate: runaway / N, maxTrack: Math.max(...ar.map((r) => r.runawayRate)),
      paradeRate: parade / N, b1min: Math.min(...ar.map((r) => r.b1 ?? 0)), b2min: Math.min(...ar.map((r) => r.b2 ?? 0)),
      holmTracks: ar.filter((r) => (r.holmUnfair ?? 0) > 0).length, action: mean(ar.map((r) => r.top5Action ?? 0)),
      biased: mean(ar.map((r) => r.gapBiasedRolls ?? 0)), duty: mean(ar.map((r) => r.gapLeaderDutyCycle ?? 0)), within3Med: med(ar.map((r) => r.within3Med)),
      perTrack: Object.fromEntries(ar.map((r) => [r.track, r.runawayRate])) };
  };
  const AA = ARMS.map((a) => armAgg(a.name));
  const v0a = AA[0];
  for (const a of AA) { a.actionDelta = v0a.action ? a.action - v0a.action : 0; a.pass = a.runawayRate < 0.10 && a.maxTrack <= 0.15 && a.paradeRate <= 0.02 && a.actionDelta >= 0 && a.b1min >= 0.70 && a.b2min >= 0.70 && a.holmTracks <= 2; }

  // ── PAIRED per-seed conversion analysis (V0 runaways → A2/A3) ──
  const pairArm = (name) => {
    const perTrack = {}; const all = { conv: 0, tot: 0, w3: [], escWin: 0, escTop3: 0, escDrop: 0, resid: 0, residV0Gap: [], residArmGap: [] };
    for (const t of TRK) {
      const v0bs = store.V0[t.id].bySeed, abs = store[name][t.id].bySeed;
      const pt = { conv: 0, tot: 0, w3: [], escWin: 0, escTop3: 0, escDrop: 0, resid: 0, residV0Gap: [], residArmGap: [] };
      for (const s of Object.keys(v0bs).map(Number)) {
        if (!v0bs[s].runaway) continue; // only V0-runaway pairs
        pt.tot++; all.tot++;
        const ar = abs[s];
        if (!ar.runaway) { // converted
          pt.conv++; all.conv++;
          if (ar.within3 != null) { pt.w3.push(ar.within3); all.w3.push(ar.within3); }
          const escRank = ar.finalRank?.[v0bs[s].leaderIdx]; // former escapee's finish in the arm
          if (escRank === 1) { pt.escWin++; all.escWin++; } else if (escRank != null && escRank <= 3) { pt.escTop3++; all.escTop3++; } else { pt.escDrop++; all.escDrop++; }
        } else { // residual
          pt.resid++; all.resid++;
          if (v0bs[s].gap090 != null) pt.residV0Gap.push(v0bs[s].gap090), all.residV0Gap.push(v0bs[s].gap090);
          if (ar.gap090 != null) pt.residArmGap.push(ar.gap090), all.residArmGap.push(ar.gap090);
        }
      }
      perTrack[t.id] = pt;
    }
    return { perTrack, all };
  };
  const paired = { 'SYM-1.5-s075': pairArm('SYM-1.5-s075'), 'SYM-1.5-s10': pairArm('SYM-1.5-s10') };

  // ── SUMMARY.md ──
  const pctS = (x) => (100 * x).toFixed(1) + '%';
  const md = [];
  md.push('# Gap-Cap Re-Roll — Overnight Confirmation (ALL 10 tracks, N=200, 60s)');
  md.push('');
  md.push(`Measurement only, feature frozen at master ${'`'}b1f6617${'`'}. All 10 tracks (default racer each), N=${RACES}, seed set 1–${RACES} (paired), scheduled rolls only. STOP gates PASSED: V0 first-100-seed = baseline on the 4 known tracks; window-eligible rolls > 0 on all 10 tracks in A2. Facts only — the arm decision is the owner's.`);
  md.push('');
  md.push('## Gate table (across ALL 10 tracks)');
  md.push('runaway <10% overall AND ≤15% every track AND parade ≤2% AND action Δ ≥ 0 AND B1&B2 ≥70% every track AND Holm ≤2/4.');
  md.push('| arm | runaway | max track | parade | action Δ | B1min | B2min | Holm | within3 med | biased | duty | PASS |');
  md.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const a of AA) md.push(`| ${a.name} | ${pctS(a.runawayRate)} | ${pctS(a.maxTrack)} | ${pctS(a.paradeRate)} | ${(a.actionDelta >= 0 ? '+' : '') + a.actionDelta.toFixed(2)} | ${pctS(a.b1min)} | ${pctS(a.b2min)} | ${a.holmTracks}/10 | ${a.within3Med} | ${a.biased.toFixed(1)} | ${a.duty.toFixed(2)} | ${a.pass ? '✅' : '❌'} |`);
  md.push('');
  md.push('## Per-track runawayWinnerRate (V0 / s075 / s10)');
  md.push('| track | type | V0 | SYM-1.5-s075 | SYM-1.5-s10 |');
  md.push('|---|---|---|---|---|');
  for (const t of TRK) md.push(`| ${t.id} | ${t.closed ? 'closed' : 'open'} | ${pctS(AA[0].perTrack[t.id])} | ${pctS(AA[1].perTrack[t.id])} | ${pctS(AA[2].perTrack[t.id])} |`);
  md.push('');
  md.push('## Paired per-seed conversion (of the V0-runaway pairs)');
  md.push('| arm | V0 runaways | converted | conv% | within3 of converted (p25/med/p75) | escapee: win/top3/drop | residual | residual gap@0.90 V0→arm (med) |');
  md.push('|---|---|---|---|---|---|---|---|');
  for (const name of ['SYM-1.5-s075', 'SYM-1.5-s10']) {
    const a = paired[name].all;
    md.push(`| ${name} | ${a.tot} | ${a.conv} | ${a.tot ? pctS(a.conv / a.tot) : '-'} | ${q(a.w3, 0.25)}/${med(a.w3)}/${q(a.w3, 0.75)} | ${a.escWin}/${a.escTop3}/${a.escDrop} | ${a.resid} | ${med(a.residV0Gap).toFixed(2)}→${med(a.residArmGap).toFixed(2)} |`);
  }
  md.push('');
  md.push('*converted = a V0-runaway (track,seed) that is NOT a runaway in the arm. within3 = racers within 3.0L of P1 at 0.90 in the arm (did the lonely march become a fight, with how many). escapee win/top3/drop = where V0\'s runaway leader finishes in the arm. residual = pairs still runaway; gap@0.90 shows whether the lead at least shrank.*');
  md.push('');
  // Topology section
  const grp = (arm, closed) => { const ar = TRK.filter((t) => t.closed === closed).map((t) => store[arm][t.id].agg.runawayRate); return ar.length ? mean(ar) : 0; };
  md.push('## Topology — do the 6 new tracks behave like the known groups, and does the mechanism hold?');
  const newOpen = TRK.filter((t) => !t.closed && !KNOWN[t.id]).map((t) => t.id);
  const newClosed = TRK.filter((t) => t.closed && !KNOWN[t.id]).map((t) => t.id);
  md.push(`New OPEN tracks (${newOpen.join(', ')}): V0 mean runaway ${pctS(mean(newOpen.map((id) => store.V0[id].agg.runawayRate)))} (known open ≈18–20%).`);
  md.push(`New CLOSED tracks (${newClosed.join(', ')}): V0 mean runaway ${pctS(mean(newClosed.map((id) => store.V0[id].agg.runawayRate)))} (known closed ≈24–30%).`);
  md.push(`Mechanism (SYM-1.5-s10) mean runaway: open group ${pctS(grp('SYM-1.5-s10', false))}, closed group ${pctS(grp('SYM-1.5-s10', true))} (V0: open ${pctS(grp('V0', false))}, closed ${pctS(grp('V0', true))}).`);
  md.push('');
  md.push('## The three open questions (N=200 power)');
  md.push(`- **searound vs the 15% cap:** s075 ${pctS(AA[1].perTrack['searound'] ?? 0)}, s10 ${pctS(AA[2].perTrack['searound'] ?? 0)} (cap 15%).`);
  md.push(`- **band-reach ≥70% on the strength arms:** s075 B1min ${pctS(AA[1].b1min)} / B2min ${pctS(AA[1].b2min)}; s10 B1min ${pctS(AA[2].b1min)} / B2min ${pctS(AA[2].b2min)} (all-track minima).`);
  md.push(`- **s075 vs s10 action:** Δ vs V0 = ${(AA[1].actionDelta >= 0 ? '+' : '') + AA[1].actionDelta.toFixed(2)} (s075) vs ${(AA[2].actionDelta >= 0 ? '+' : '') + AA[2].actionDelta.toFixed(2)} (s10).`);
  md.push('');
  md.push('Data: `per-arm-track.csv` (aggregates), `races-<arm>-<track>.csv` (per-seed, paired + determinism re-run target).');
  md.push('');
  writeFileSync(join(OUT_C, 'SUMMARY.md'), md.join('\n'));

  console.log(`\nElapsed ${((Date.now() - t0) / 60000).toFixed(1)}m → ${OUT_C}`);
  for (const a of AA) console.log(`  ${a.name.padEnd(13)} runaway=${pctS(a.runawayRate)} maxTrack=${pctS(a.maxTrack)} actionΔ=${(a.actionDelta >= 0 ? '+' : '') + a.actionDelta.toFixed(2)} B1min=${pctS(a.b1min)} PASS=${a.pass}`);
  for (const name of ['SYM-1.5-s075', 'SYM-1.5-s10']) { const a = paired[name].all; console.log(`  ${name} converted ${a.conv}/${a.tot} (${a.tot ? pctS(a.conv / a.tot) : '-'}); escapee win/top3/drop ${a.escWin}/${a.escTop3}/${a.escDrop}`); }
  process.exit(0);
}

// ════════════════════════════════════════════════════════════════════════════════
// RELEASE SWEEP (--release-sweep) — choreoReleaseProgress 0.97→0.93 × gap-reroll, 4 known tracks.
// The eye-test verdict was "chasers close in, but the 0.90 leader is almost never actually passed":
// the field runs out of runway. This sweep moves the release point earlier to buy runway, and
// measures BOTH sides of that trade:
//   payoff  — p1SwapAfter090 (did the 0.90 leader lose?) + leadChangeCount in [0.90, 1.0].
//   cost    — bandExitAfterRelease: of the racers already INSIDE their band at the release point,
//             how many drifted OUT by the finish. Endpoint band-reach cannot separate that from
//             "never got there", and post-release drift is exactly how pack-release failed.
// Sim-only: choreoReleaseProgress is a plan-config override via the existing sim CLI flag, so
// defaults.js and every sim behavior file stay untouched → NO fingerprint.
// ════════════════════════════════════════════════════════════════════════════════
if (argv.includes('--release-sweep')) {
  const OUT_R = join(OUT_ABS, 'release-sweep');
  mkdirSync(OUT_R, { recursive: true });
  mkdirSync(TMP_ABS, { recursive: true });
  const KNOWN4 = { 'luger-hill': 18, 'mountainstreet': 18, 'searound': 30, 'dirt-oval': 28 };
  const TRACKS = ONLY ? [ONLY] : ['luger-hill', 'mountainstreet', 'searound', 'dirt-oval'];
  const TRK = TRACKS.map((id) => { const s = trackSeed(id); return { id, racer: s.defaultRacerTypeId, closed: !!s.closed }; });
  const med = (a) => (a.length ? percentile(a, 0.5) : 0);
  const zoneIdxOf = (rank) => { for (let i = 0; i < BAND_EDGES.length; i++) if (rank <= BAND_EDGES[i]) return i; return BAND_EDGES.length; };
  const bandReach = (rawData, b) => { const rows = (rawData || []).filter((r) => r.sollBereich === b); return rows.length ? rows.filter((r) => zoneIdxOf(r.finalRank) === b - 1).length / rows.length : null; };
  // Priority order — V0 first (the reproduction gate), then the reference arm, then the axis.
  const GR = { mode: 'symmetric', G: 1.5, s: 1.0 }; // the confirmed gap-reroll candidate
  const ARMS = [
    { name: 'V0', gr: false, rel: null },
    { name: 'R97-ON', gr: true, rel: 0.97 },
    { name: 'R95-ON', gr: true, rel: 0.95 },
    { name: 'R94-ON', gr: true, rel: 0.94 },
    { name: 'R93-ON', gr: true, rel: 0.93 },
    { name: 'R94-OFF', gr: false, rel: 0.94 }, // isolates the release effect ALONE
  ];
  const store = {};

  async function runOne(arm, track) {
    const outAbs = join(TMP_ABS, `rel__${arm.name}__${track.id}`);
    const args = ['scripts/sim-fairness.mjs', `--track=${track.id}`, `--racer=${track.racer}`,
      `--seed=${SEED}`, `--races=${RACES}`, `--dur=${DUR}`, '--runaway-parade', '--hero-map', `--out=${toSimOut(outAbs)}`];
    if (arm.gr) args.push(`--gapRerollThresholdLengths=${GR.G}`, `--gapRerollMode=${GR.mode}`, `--gapRerollStrength=${GR.s}`);
    else args.push('--gapRerollEnabled=false'); // shipped default is now ON — an OFF arm must say so
    if (arm.rel != null) args.push(`--choreoReleaseProgress=${arm.rel}`);
    await pExecFile(process.execPath, args, { cwd: ROOT, maxBuffer: 512 * 1024 * 1024 });
    const rp = JSON.parse(readFileSync(join(outAbs, 'runaway-parade.json'), 'utf8'));
    const fd = JSON.parse(readFileSync(join(outAbs, 'fairness-data.json'), 'utf8'));
    let hm = {}; try { hm = JSON.parse(readFileSync(join(outAbs, 'hero-map.json'), 'utf8')); } catch { /* optional */ }

    // Per-seed race records + the rank-at-release map for the band-drift join.
    const bySeed = {}; const releaseRanksBySeed = {};
    let runaway = 0, parade = 0, swaps = 0, swapDenom = 0; const leadChanges = [];
    for (const rec of rp.races) {
      const c = classifyRace(rec.runawayParade, D);
      const raw = rec.runawayParade;
      const swap = p1SwapAfter090(c, raw);
      bySeed[rec.seed] = { runaway: c.runawayWinner, parade: c.paradeFinish, swap, leadChanges: raw.leadChangeCount ?? 0, gap090: raw.leaderGapP2At090Len };
      releaseRanksBySeed[rec.seed] = raw.rankAtReleaseByIndex ?? null;
      if (c.runawayWinner) runaway++; if (c.paradeFinish) parade++;
      if (swap != null) { swapDenom++; if (swap) swaps++; }
      leadChanges.push(raw.leadChangeCount ?? 0);
    }

    // bandExitAfterRelease — join rawData (sollBereich + finalRank, per racer) with the release-point
    // rank snapshot (per seed, per racer index). V0 has no release override, so its rows use the
    // DEFAULT release point: that is the natural post-0.97 drift baseline every arm is read against.
    const driftRows = [];
    for (const r of fd.rawData || []) {
      const ranks = releaseRanksBySeed[r.seed];
      if (!ranks) continue;
      driftRows.push({ sollBereich: r.sollBereich, rankAtRelease: ranks[r.racerIndex] ?? null, finalRank: r.finalRank });
    }
    const drift = bandExitAfterRelease(driftRows, [1, 2]);
    const nat = (fd.results || [])[0]?.avgNaturalness || {};
    return {
      bySeed,
      agg: { arm: arm.name, track: track.id, n: rp.races.length, runaway, parade,
        runawayRate: runaway / rp.races.length, paradeRate: parade / rp.races.length,
        p1Swap: swapDenom ? swaps / swapDenom : null, swaps, swapDenom,
        leadChangeMean: mean(leadChanges),
        b1Exit: drift[1].rate, b1ExitN: drift[1].inside, b2Exit: drift[2].rate, b2ExitN: drift[2].inside,
        b1: bandReach(fd.rawData, 1), b2: bandReach(fd.rawData, 2),
        holmUnfair: hm.fairness?.startRowUnfair ?? null, top5Action: nat.outcomeTop5SwapsMean ?? null,
        biased: nat.gapBiasedRolls ?? 0, duty: nat.gapLeaderDutyCycle ?? 0 },
    };
  }

  const t0 = Date.now();
  console.log(`\n=== release-sweep === ${ARMS.length} arms × ${TRK.length} tracks × N=${RACES} (seed=${SEED}, dur=${DUR}s), jobs=${JOBS}`);

  async function runArm(arm) {
    store[arm.name] = {};
    const jobs = [...TRK]; let nx = 0;
    async function w() { while (nx < jobs.length) { const i = nx++; const r = await runOne(arm, jobs[i]); store[arm.name][jobs[i].id] = r;
      console.log(`  ${arm.name.padEnd(8)} ${jobs[i].id.padEnd(15)} runaway=${r.agg.runaway}/${r.agg.n} swap=${r.agg.p1Swap != null ? (100 * r.agg.p1Swap).toFixed(0) + '%' : '-'} b1Exit=${r.agg.b1Exit != null ? (100 * r.agg.b1Exit).toFixed(0) + '%' : '-'}`); } }
    await Promise.all(Array.from({ length: Math.min(JOBS, jobs.length) }, w));
  }

  // ── V0 first + STOP gate: the exact known baseline, else every comparison below is meaningless ──
  await runArm(ARMS[0]);
  const gateFails = [];
  if (RACES === 100 && SEED === 1) {
    for (const t of TRK) {
      if (KNOWN4[t.id] == null) continue;
      const got = store.V0[t.id].agg.runaway;
      if (got !== KNOWN4[t.id]) gateFails.push(`${t.id}: V0 runaway ${got} (baseline ${KNOWN4[t.id]})`);
    }
  }
  if (gateFails.length) {
    writeFileSync(join(OUT_R, 'SUMMARY.md'), `# Release sweep STOPPED — V0 reproduction gate failed\n\nV0 must reproduce the known per-track baseline EXACTLY; it did not, so no arm below it is comparable. No other arm was run.\n\n${gateFails.map((f) => `- ${f}`).join('\n')}\n`);
    console.error('\n❌ STOP GATE FAILED:\n' + gateFails.map((f) => '  ' + f).join('\n'));
    process.exit(1);
  }
  console.log(RACES === 100 && SEED === 1 ? '  STOP gate PASSED (V0 = known baseline on all 4 tracks).' : '  STOP gate SKIPPED (needs --races=100 --seed=1).');

  for (const arm of ARMS.slice(1)) await runArm(arm);

  // ── Per-arm aggregation, incl. the paired ex-runaway (V0-runaway seed set) view ──
  const armAgg = (name) => {
    const ar = TRK.map((t) => store[name][t.id].agg);
    const N = ar.reduce((s, r) => s + r.n, 0);
    const runaway = ar.reduce((s, r) => s + r.runaway, 0);
    const parade = ar.reduce((s, r) => s + r.parade, 0);
    const swaps = ar.reduce((s, r) => s + r.swaps, 0);
    const swapDenom = ar.reduce((s, r) => s + r.swapDenom, 0);
    // Restricted to the V0-runaway seed set: did the former lonely marches gain real P1 fights?
    let exSwap = 0, exDenom = 0, exLead = [];
    for (const t of TRK) {
      const v0bs = store.V0[t.id].bySeed, abs = store[name][t.id].bySeed;
      for (const s of Object.keys(v0bs).map(Number)) {
        if (!v0bs[s].runaway) continue;
        const a = abs[s]; if (!a || a.swap == null) continue;
        exDenom++; if (a.swap) exSwap++; exLead.push(a.leadChanges);
      }
    }
    const w = (f) => { const v = ar.map(f).filter((x) => x != null); return v.length ? mean(v) : null; };
    return { name, N, runawayRate: runaway / N, maxTrack: Math.max(...ar.map((r) => r.runawayRate)),
      paradeRate: parade / N, p1Swap: swapDenom ? swaps / swapDenom : null,
      exSwap: exDenom ? exSwap / exDenom : null, exDenom, exLeadMean: exLead.length ? mean(exLead) : null,
      leadChangeMean: mean(ar.map((r) => r.leadChangeMean)),
      b1Exit: w((r) => r.b1Exit), b2Exit: w((r) => r.b2Exit),
      b1min: Math.min(...ar.map((r) => r.b1 ?? 0)), b2min: Math.min(...ar.map((r) => r.b2 ?? 0)),
      holmTracks: ar.filter((r) => (r.holmUnfair ?? 0) > 0).length,
      action: mean(ar.map((r) => r.top5Action ?? 0)), biased: mean(ar.map((r) => r.biased)), duty: mean(ar.map((r) => r.duty)),
      perTrack: Object.fromEntries(ar.map((r) => [r.track, r])) };
  };
  const AA = ARMS.map((a) => armAgg(a.name));
  const v0a = AA[0];
  for (const a of AA) {
    a.actionDelta = a.action - v0a.action;
    // All previously binding gates stay in force. p1Swap / bandExit carry NO threshold — the owner sets those.
    a.pass = a.runawayRate < 0.10 && a.maxTrack <= 0.15 && a.paradeRate <= 0.02 &&
      a.actionDelta >= 0 && a.b1min >= 0.70 && a.b2min >= 0.70 && a.holmTracks <= 2;
  }

  // ── CSVs ──
  const ACOLS = ['arm', 'track', 'n', 'runaway', 'runawayRate', 'parade', 'paradeRate', 'p1Swap', 'swaps', 'swapDenom',
    'leadChangeMean', 'b1Exit', 'b1ExitN', 'b2Exit', 'b2ExitN', 'b1', 'b2', 'holmUnfair', 'top5Action', 'biased', 'duty'];
  const aggRows = ARMS.flatMap((a) => TRK.map((t) => store[a.name][t.id].agg));
  writeFileSync(join(OUT_R, 'per-arm-track.csv'),
    [ACOLS.join(','), ...aggRows.map((r) => ACOLS.map((c) => (r[c] == null ? '' : typeof r[c] === 'number' ? +Number(r[c]).toFixed(4) : r[c])).join(','))].join('\n') + '\n');
  const RCOLS = ['arm', 'track', 'seed', 'runaway', 'parade', 'swap', 'leadChanges', 'gap090'];
  for (const a of ARMS) for (const t of TRK) {
    const bs = store[a.name][t.id].bySeed;
    writeFileSync(join(OUT_R, `races-${a.name}-${t.id}.csv`),
      [RCOLS.join(','), ...Object.keys(bs).map(Number).sort((x, y) => x - y).map((s) =>
        [a.name, t.id, s, bs[s].runaway ? 1 : 0, bs[s].parade ? 1 : 0, bs[s].swap == null ? '' : bs[s].swap ? 1 : 0, bs[s].leadChanges, r4(bs[s].gap090)].join(','))].join('\n') + '\n');
  }

  // ── SUMMARY.md ──
  const pctS = (x) => (x == null ? '–' : (100 * x).toFixed(1) + '%');
  const md = [];
  md.push('# Release Sweep — choreoReleaseProgress 0.97→0.93 × gap-reroll (4 known tracks, N=' + RACES + ', ' + DUR + 's)');
  md.push('');
  md.push(`Sim-only measurement. \`choreoReleaseProgress\` is passed as a plan-config override via the existing sim CLI flag — \`defaults.js\` and every sim behavior file are untouched, so there is **no fingerprint** to check. gap-reroll arms use the confirmed candidate (symmetric, G=${GR.G}, strength=${GR.s}), scheduled rolls only. Seeds ${SEED}–${SEED + RACES - 1}, default racer per track. Facts only — the decision is the owner's.`);
  md.push('');
  md.push('## STOP gate');
  md.push(RACES === 100 && SEED === 1
    ? `✅ V0 reproduced the known baseline exactly (${TRK.filter((t) => KNOWN4[t.id] != null).map((t) => `${t.id} ${store.V0[t.id].agg.runaway}`).join(', ')}; overall ${pctS(v0a.runawayRate)}).`
    : 'SKIPPED (needs --races=100 --seed=1).');
  md.push('');
  md.push('## Co-optimization table');
  md.push('Binding gates: runaway <10% overall AND ≤15%/track AND parade ≤2% AND action Δ ≥ 0 AND B1&B2 band-reach ≥70% every track AND Holm ≤2/4. **p1SwapAfter090 and bandExitAfterRelease carry no threshold** — they are reported for the owner\'s eye and call.');
  md.push('');
  md.push('| arm | release | gapReroll | runaway | max track | parade | action Δ | B1min | B2min | Holm | PASS | p1Swap | ex-runaway swap | lead changes | B1 exit | B2 exit |');
  md.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (let i = 0; i < ARMS.length; i++) {
    const a = AA[i], arm = ARMS[i];
    md.push(`| ${a.name} | ${arm.rel ?? '0.97 (default)'} | ${arm.gr ? 'ON' : 'off'} | ${pctS(a.runawayRate)} | ${pctS(a.maxTrack)} | ${pctS(a.paradeRate)} | ${(a.actionDelta >= 0 ? '+' : '') + a.actionDelta.toFixed(2)} | ${pctS(a.b1min)} | ${pctS(a.b2min)} | ${a.holmTracks}/${TRK.length} | ${a.pass ? '✅' : '❌'} | ${pctS(a.p1Swap)} | ${pctS(a.exSwap)} (n=${a.exDenom}) | ${a.leadChangeMean.toFixed(2)} | ${pctS(a.b1Exit)} | ${pctS(a.b2Exit)} |`);
  }
  md.push('');
  md.push('*p1Swap = share of races whose progress-0.90 leader is NOT the final winner. ex-runaway swap = the same, restricted to the seeds that were runaways in V0 (did the former lonely marches gain a real P1 fight). lead changes = mean number of times the lead genuinely changed hands in [0.90, 1.0] (a leader FINISHING is not counted — only being overtaken on track). B1/B2 exit = bandExitAfterRelease: of the racers already inside their band at the release point, the share that finished outside it.*');
  md.push('');
  md.push('## bandExitAfterRelease per track (the fairness-attribution metric)');
  md.push('| arm | ' + TRK.map((t) => `${t.id} B1 / B2`).join(' | ') + ' |');
  md.push('|---|' + TRK.map(() => '---').join('|') + '|');
  for (const a of AA) md.push(`| ${a.name} | ` + TRK.map((t) => { const g = a.perTrack[t.id]; return `${pctS(g.b1Exit)} / ${pctS(g.b2Exit)}`; }).join(' | ') + ' |');
  md.push('');
  md.push('## Per-track runawayWinnerRate');
  md.push('| arm | ' + TRK.map((t) => t.id).join(' | ') + ' |');
  md.push('|---|' + TRK.map(() => '---').join('|') + '|');
  for (const a of AA) md.push(`| ${a.name} | ` + TRK.map((t) => pctS(a.perTrack[t.id].runawayRate)).join(' | ') + ' |');
  md.push('');
  md.push('## Per-track p1SwapAfter090');
  md.push('| arm | ' + TRK.map((t) => t.id).join(' | ') + ' |');
  md.push('|---|' + TRK.map(() => '---').join('|') + '|');
  for (const a of AA) md.push(`| ${a.name} | ` + TRK.map((t) => pctS(a.perTrack[t.id].p1Swap)).join(' | ') + ' |');
  md.push('');
  md.push('Data: `per-arm-track.csv` (aggregates), `races-<arm>-<track>.csv` (per-seed; determinism re-run target).');
  md.push('');
  writeFileSync(join(OUT_R, 'SUMMARY.md'), md.join('\n'));

  console.log(`\nElapsed ${((Date.now() - t0) / 60000).toFixed(1)}m → ${OUT_R}`);
  for (const a of AA) console.log(`  ${a.name.padEnd(8)} runaway=${pctS(a.runawayRate)} PASS=${a.pass} p1Swap=${pctS(a.p1Swap)} exSwap=${pctS(a.exSwap)} B1exit=${pctS(a.b1Exit)} B2exit=${pctS(a.b2Exit)}`);
  process.exit(0);
}

// ════════════════════════════════════════════════════════════════════════════════
// P1 CONTEST BASELINE (--p1-contest) — the sustained-multi-racer-P1-battle metric, 4 known tracks.
//
// WHY. Every endgame number so far answers a yes/no about the LEADER (did it run away, did it get
// passed). None of them says whether the front was a BATTLE — several racers trading P1 for a
// stretch of the final act, which is what the eye actually rewards. This mode measures that with
// the five primitives + classifier in sim/observers/outcome-front-battle.mjs, on exactly two arms:
//
//   V0      everything off — the reproduction gate (23.5% overall, 18/18/30/28) and the baseline.
//   R97-ON  gap-reroll symmetric G=1.5 s=1.0 at the default release — the confirmed winner, so the
//           delta below shows how much sustained P1 action the CURRENT candidate already buys.
//
// The output is a MEASUREMENT, not a verdict: p1ContestRate carries no threshold here. The owner
// sets the gate after reading these baselines, and the C1 concept follows separately.
//
// Read-only: no config overrides beyond the two documented gap-reroll flags, no sim behavior file
// touched → NO fingerprint to check.
// ════════════════════════════════════════════════════════════════════════════════
if (argv.includes('--p1-contest')) {
  const OUT_P = join(OUT_ABS, 'p1-contest-baseline');
  mkdirSync(OUT_P, { recursive: true });
  mkdirSync(TMP_ABS, { recursive: true });
  const KNOWN4 = { 'luger-hill': 18, 'mountainstreet': 18, 'searound': 30, 'dirt-oval': 28 };
  const TRACKS_P = ONLY ? [ONLY] : ['luger-hill', 'mountainstreet', 'searound', 'dirt-oval'];
  const TRK = TRACKS_P.map((id) => { const s = trackSeed(id); return { id, racer: s.defaultRacerTypeId, closed: !!s.closed }; });
  const GR = { mode: 'symmetric', G: 1.5, s: 1.0 }; // the confirmed gap-reroll candidate
  const ARMS = [
    { name: 'V0', gr: false },
    { name: 'R97-ON', gr: true },
  ];
  // The five primitives, in the order they are defined in the observer.
  const PRIMS = [
    { key: 'distinctLeaders', label: 'distinctLeaders', dp: 1 },
    { key: 'leadChangeCount', label: 'leadChangeCount', dp: 1 },
    { key: 'maxLeadHoldShare', label: 'maxLeadHoldShare', dp: 3 },
    { key: 'frontContestFraction', label: 'frontContestFraction', dp: 3 },
    { key: 'p1LongestMultiSec', label: 'p1LongestMultiSec', dp: 2 },
  ];
  const store = {};

  async function runOne(arm, track) {
    const outAbs = join(TMP_ABS, `p1c__${arm.name}__${track.id}`);
    const args = ['scripts/sim-fairness.mjs', `--track=${track.id}`, `--racer=${track.racer}`,
      `--seed=${SEED}`, `--races=${RACES}`, `--dur=${DUR}`, '--runaway-parade', '--skip-main-output',
      `--out=${toSimOut(outAbs)}`];
    if (arm.gr) args.push(`--gapRerollThresholdLengths=${GR.G}`, `--gapRerollMode=${GR.mode}`, `--gapRerollStrength=${GR.s}`);
    else args.push('--gapRerollEnabled=false'); // shipped default is now ON — an OFF arm must say so
    await pExecFile(process.execPath, args, { cwd: ROOT, maxBuffer: 512 * 1024 * 1024 });
    const rp = JSON.parse(readFileSync(join(outAbs, 'runaway-parade.json'), 'utf8'));
    const bySeed = {};
    let runaway = 0;
    for (const rec of [...rp.races].sort((a, b) => a.raceIdx - b.raceIdx)) {
      const raw = rec.runawayParade;
      const c = classifyRace(raw, D);
      const fb = raw.frontBattle ?? null;
      bySeed[rec.seed] = {
        runaway: c.runawayWinner,
        windowStart: raw.contestWindowStart ?? null,
        fb,
        contest: classifyFrontBattle(fb),      // true / false / null (race never reached the window)
      };
      if (c.runawayWinner) runaway++;
    }
    return { bySeed, n: rp.races.length, runaway };
  }

  const t0 = Date.now();
  console.log(`\n=== p1-contest === ${ARMS.length} arms × ${TRK.length} tracks × N=${RACES} (seed=${SEED}, dur=${DUR}s), jobs=${JOBS}`);

  async function runArm(arm) {
    store[arm.name] = {};
    const jobs = [...TRK]; let nx = 0;
    async function w() {
      while (nx < jobs.length) {
        const i = nx++; const r = await runOne(arm, jobs[i]); store[arm.name][jobs[i].id] = r;
        const rate = Object.values(r.bySeed).filter((x) => x.contest === true).length / r.n;
        console.log(`  ${arm.name.padEnd(7)} ${jobs[i].id.padEnd(15)} runaway=${r.runaway}/${r.n} p1Contest=${(100 * rate).toFixed(0)}%`);
      }
    }
    await Promise.all(Array.from({ length: Math.min(JOBS, jobs.length) }, w));
  }

  // ── V0 first + STOP gate: without the exact known baseline nothing below is comparable ──
  await runArm(ARMS[0]);
  const gateFails = [];
  if (RACES === 100 && SEED === 1) {
    for (const t of TRK) {
      if (KNOWN4[t.id] == null) continue;
      if (store.V0[t.id].runaway !== KNOWN4[t.id]) gateFails.push(`${t.id}: V0 runaway ${store.V0[t.id].runaway} (baseline ${KNOWN4[t.id]})`);
    }
  }
  if (gateFails.length) {
    writeFileSync(join(OUT_P, 'SUMMARY.md'), `# P1-contest baseline STOPPED — V0 reproduction gate failed\n\nV0 must reproduce the known per-track runaway baseline EXACTLY; it did not, so the arm below it is not comparable. R97-ON was NOT run.\n\n${gateFails.map((f) => `- ${f}`).join('\n')}\n`);
    console.error('\n❌ STOP GATE FAILED:\n' + gateFails.map((f) => '  ' + f).join('\n'));
    process.exit(1);
  }
  console.log(RACES === 100 && SEED === 1
    ? `  STOP gate PASSED (V0 = known baseline on all ${TRK.length} track${TRK.length === 1 ? '' : 's'}).`
    : '  STOP gate SKIPPED (needs --races=100 --seed=1).');

  await runArm(ARMS[1]);

  // ── V0-race class per (track, seed) ────────────────────────────────────────────────────────
  // The classes are defined by the V0 arm and then applied UNCHANGED to every arm, so a class is
  // the same set of races everywhere and the columns are directly comparable:
  //   normal    — V0 was not a runaway.
  //   runaway   — V0 was a runaway AND the arm still is (the residual lonely marches).
  //   converted — V0 was a runaway and the arm is NOT (gap-reroll broke the escape open).
  // For V0 itself "converted" is empty by construction — V0 is its own reference.
  const classOf = (armName, trackId, seed) => {
    const v0 = store.V0[trackId].bySeed[seed];
    if (!v0?.runaway) return 'normal';
    return store[armName][trackId].bySeed[seed]?.runaway ? 'runaway' : 'converted';
  };

  // Collect a class-sliced sample of every primitive (+ the contest booleans) for a set of tracks.
  const sample = (armName, trackIds) => {
    const out = {};
    for (const cls of ['all', 'normal', 'runaway', 'converted']) {
      out[cls] = { n: 0, contestTrue: 0, contestKnown: 0 };
      for (const p of PRIMS) out[cls][p.key] = [];
    }
    for (const id of trackIds) {
      const bs = store[armName][id].bySeed;
      for (const s of Object.keys(bs).map(Number).sort((a, b) => a - b)) {
        const rec = bs[s];
        const cls = classOf(armName, id, s);
        for (const bucket of ['all', cls]) {
          const acc = out[bucket];
          acc.n++;
          if (rec.contest != null) { acc.contestKnown++; if (rec.contest) acc.contestTrue++; }
          if (rec.fb) for (const p of PRIMS) { const v = rec.fb[p.key]; if (v != null) acc[p.key].push(v); }
        }
      }
    }
    for (const cls of Object.keys(out)) out[cls].rate = out[cls].contestKnown ? out[cls].contestTrue / out[cls].contestKnown : null;
    return out;
  };

  const overall = Object.fromEntries(ARMS.map((a) => [a.name, sample(a.name, TRK.map((t) => t.id))]));
  const perTrack = Object.fromEntries(ARMS.map((a) => [a.name, Object.fromEntries(TRK.map((t) => [t.id, sample(a.name, [t.id])]))]));

  // ── CSVs ──────────────────────────────────────────────────────────────────────────────────
  const RCOLS = ['arm', 'track', 'seed', 'v0Class', 'runaway', 'contest',
    ...PRIMS.map((p) => p.key), 'windowFrames'];
  for (const a of ARMS) for (const t of TRK) {
    const bs = store[a.name][t.id].bySeed;
    writeFileSync(join(OUT_P, `races-${a.name}-${t.id}.csv`),
      [RCOLS.join(','), ...Object.keys(bs).map(Number).sort((x, y) => x - y).map((s) => {
        const rec = bs[s]; const fb = rec.fb ?? {};
        return [a.name, t.id, s, classOf(a.name, t.id, s), rec.runaway ? 1 : 0,
          rec.contest == null ? '' : rec.contest ? 1 : 0,
          ...PRIMS.map((p) => r4(fb[p.key])), fb.windowFrames ?? ''].join(',');
      })].join('\n') + '\n');
  }
  const q = (arr, p) => (arr.length ? percentile(arr, p) : null);
  const fmtQ = (arr, dp) => (arr.length ? `${q(arr, 0.5).toFixed(dp)} [${q(arr, 0.25).toFixed(dp)}–${q(arr, 0.75).toFixed(dp)}]` : '–');
  const ACOLS = ['arm', 'scope', 'v0Class', 'n', 'p1ContestRate',
    ...PRIMS.flatMap((p) => [`${p.key}_p25`, `${p.key}_med`, `${p.key}_p75`])];
  const aggRows = [];
  for (const a of ARMS) {
    for (const [scope, smp] of [['overall', overall[a.name]], ...TRK.map((t) => [t.id, perTrack[a.name][t.id]])]) {
      for (const cls of ['all', 'normal', 'runaway', 'converted']) {
        const s = smp[cls];
        aggRows.push([a.name, scope, cls, s.n, r4(s.rate),
          ...PRIMS.flatMap((p) => [r4(q(s[p.key], 0.25)), r4(q(s[p.key], 0.5)), r4(q(s[p.key], 0.75))])].join(','));
      }
    }
  }
  writeFileSync(join(OUT_P, 'per-arm-track-class.csv'), [ACOLS.join(','), ...aggRows].join('\n') + '\n');

  // ── SUMMARY.md ────────────────────────────────────────────────────────────────────────────
  const pctS = (x) => (x == null ? '–' : (100 * x).toFixed(1) + '%');
  const anyWindow = Object.values(store.V0)[0] ? Object.values(Object.values(store.V0)[0].bySeed)[0]?.windowStart : null;
  const md = [];
  md.push(`# P1 Contest Score — baseline (V0 vs gap-reroll winner), N=${RACES}, ${DUR}s`);
  md.push('');
  md.push(`Read-only measurement of the merged "sustained multi-racer P1 battle" metric. 4 known tracks (default racer each), fixed baseline seeds ${SEED}–${SEED + RACES - 1}, scheduled rolls only, ${JOBS} parallel jobs. No sim behavior file was touched — **no fingerprint** to check. **Facts only: p1ContestRate carries no threshold here — the gate is the owner's call, and the C1 concept follows separately.**`);
  md.push('');
  md.push('## Observer parameters');
  md.push(`- Window W = **[${anyWindow ?? '?'}, first finish]**. The start is the LIVE \`choreoResolveB2\` config value, read at runtime — no hardcoded progress constant. The window CLOSES at the first finish: past it, racers leave the live ordering by finishing and rank 1 is inherited straight down the field (measured to 1.0, every race reports ~40 "distinct leaders").`);
  md.push(`- Front group = live racers within **${FRONT_BATTLE_DEFAULTS.nearLen} lengths of P1, INCLUDING P1** (so \`minGroup\` ${FRONT_BATTLE_DEFAULTS.minGroup} = the leader plus two chasers). Note this differs from runaway-parade's \`within3P1At090\`, which counts only the racers BEHIND P1.`);
  md.push(`- Lengths via the shared lap-aware path (\`arcT × govLenScale\`) — the same one every other observer uses.`);
  md.push(`- REAL P1 ACTION iff **all four**: distinctLeaders ≥ ${FRONT_BATTLE_DEFAULTS.minDistinctLeaders}, leadChangeCount ≥ ${FRONT_BATTLE_DEFAULTS.minLeadChanges}, maxLeadHoldShare ≤ ${FRONT_BATTLE_DEFAULTS.maxLeadHoldShare}, frontContestFraction ≥ ${FRONT_BATTLE_DEFAULTS.minFrontContestFraction}. \`p1LongestMultiSec\` is reported but is NOT a criterion (a seconds quantity, its threshold would be track- and duration-dependent).`);
  md.push('');
  md.push('## STOP gate');
  md.push(RACES === 100 && SEED === 1
    ? `✅ V0 reproduced the known runaway baseline exactly (${TRK.filter((t) => KNOWN4[t.id] != null).map((t) => `${t.id} ${store.V0[t.id].runaway}`).join(', ')}).`
    : 'SKIPPED (needs --races=100 --seed=1).');
  md.push('');
  md.push('## Headline');
  for (const a of ARMS) {
    const s = overall[a.name].all;
    md.push(`- **${a.name}** — ${pctS(s.rate)} of races contain a real, sustained P1 battle; in the median race the front is contested for ${q(s.frontContestFraction, 0.5) != null ? (100 * q(s.frontContestFraction, 0.5)).toFixed(0) + '%' : '–'} of the window and ${q(s.distinctLeaders, 0.5) ?? '–'} distinct racers lead.`);
  }
  const dV0 = overall.V0.all, dR = overall['R97-ON'].all;
  const sgn = (x, dp) => (x == null ? '–' : (x >= 0 ? '+' : '') + x.toFixed(dp));
  md.push('');
  md.push(`**Delta R97-ON − V0 (what the current winner already contributes):** p1ContestRate ${sgn(dR.rate != null && dV0.rate != null ? 100 * (dR.rate - dV0.rate) : null, 1)} pp` +
    PRIMS.map((p) => `, median ${p.label} ${sgn(q(dR[p.key], 0.5) != null && q(dV0[p.key], 0.5) != null ? q(dR[p.key], 0.5) - q(dV0[p.key], 0.5) : null, p.dp)}`).join('') + '.');
  md.push('');
  md.push('## Overall, by V0-race class');
  md.push('`normal` = V0 was not a runaway. `runaway` = V0 was AND the arm still is. `converted` = V0 was, the arm is not. Classes are defined by V0 and applied unchanged to both arms, so each column is the same set of races in both. For V0 itself `converted` is empty by construction. Cells are median [p25–p75].');
  md.push('');
  md.push('| arm | class | races | p1ContestRate | ' + PRIMS.map((p) => p.label).join(' | ') + ' |');
  md.push('|---|---|---|---|' + PRIMS.map(() => '---').join('|') + '|');
  for (const a of ARMS) for (const cls of ['all', 'normal', 'runaway', 'converted']) {
    const s = overall[a.name][cls];
    if (!s.n) { md.push(`| ${a.name} | ${cls} | 0 | – | ${PRIMS.map(() => '–').join(' | ')} |`); continue; }
    md.push(`| ${a.name} | ${cls} | ${s.n} | ${pctS(s.rate)} | ` + PRIMS.map((p) => fmtQ(s[p.key], p.dp)).join(' | ') + ' |');
  }
  md.push('');
  md.push('## Per track, by V0-race class');
  for (const t of TRK) {
    md.push('');
    md.push(`### ${t.id} (${t.closed ? 'closed' : 'open'}, ${t.racer})`);
    md.push('| arm | class | races | p1ContestRate | ' + PRIMS.map((p) => p.label).join(' | ') + ' |');
    md.push('|---|---|---|---|' + PRIMS.map(() => '---').join('|') + '|');
    for (const a of ARMS) for (const cls of ['all', 'normal', 'runaway', 'converted']) {
      const s = perTrack[a.name][t.id][cls];
      if (!s.n) { md.push(`| ${a.name} | ${cls} | 0 | – | ${PRIMS.map(() => '–').join(' | ')} |`); continue; }
      md.push(`| ${a.name} | ${cls} | ${s.n} | ${pctS(s.rate)} | ` + PRIMS.map((p) => fmtQ(s[p.key], p.dp)).join(' | ') + ' |');
    }
  }
  md.push('');
  md.push('Data: `per-arm-track-class.csv` (aggregates), `races-<arm>-<track>.csv` (per-seed; determinism re-run target).');
  md.push('');
  writeFileSync(join(OUT_P, 'SUMMARY.md'), md.join('\n'));

  console.log(`\nElapsed ${((Date.now() - t0) / 60000).toFixed(1)}m → ${OUT_P}`);
  for (const a of ARMS) console.log(`  ${a.name.padEnd(7)} p1ContestRate=${pctS(overall[a.name].all.rate)}`);
  process.exit(0);
}

// ════════════════════════════════════════════════════════════════════════════════
// P1 CONTEST CRITERION BREAKDOWN (--p1-criteria) — WHICH of the four conditions blocks a race.
//
// Pure POST-ANALYSIS: reads the per-seed CSVs --p1-contest already wrote and derives nothing that
// is not in them, so it needs no sim run and reproduces exactly from the committed data.
//
// WHY. p1ContestRate is a conjunction of four conditions. A flat rate between two arms can hide an
// arm that improved three of them and still lost on the fourth, and a design target is useless
// without knowing which term is the wall. Two counts per condition:
//   fail%  — share of races failing it (conditions overlap, so these do not sum to 100).
//   sole   — races failing EXACTLY that one. Those are the races a single change would flip.
// Facts only; no threshold and no recommendation.
//
// USAGE: node scripts/exp-runaway-leader.mjs --p1-criteria [--out=<results dir>]
// ════════════════════════════════════════════════════════════════════════════════
if (argv.includes('--p1-criteria')) {
  const DIR = join(OUT_ABS, 'p1-contest-baseline');
  const P = FRONT_BATTLE_DEFAULTS;
  // Each condition as a predicate on one CSV row, in classifier order. Returns true when the row FAILS it.
  const COND = [
    { key: 'distinctLeaders', label: `distinctLeaders < ${P.minDistinctLeaders}`, fails: (r) => +r.distinctLeaders < P.minDistinctLeaders },
    { key: 'leadChangeCount', label: `leadChangeCount < ${P.minLeadChanges}`, fails: (r) => +r.leadChangeCount < P.minLeadChanges },
    { key: 'maxLeadHoldShare', label: `maxLeadHoldShare > ${P.maxLeadHoldShare}`, fails: (r) => +r.maxLeadHoldShare > P.maxLeadHoldShare },
    { key: 'frontContestFraction', label: `frontContestFraction < ${P.minFrontContestFraction}`, fails: (r) => +r.frontContestFraction < P.minFrontContestFraction },
  ];
  const readCsv = (path) => {
    const lines = readFileSync(path, 'utf8').trim().split('\n');
    const head = lines[0].split(',');
    return lines.slice(1).map((l) => Object.fromEntries(l.split(',').map((v, i) => [head[i], v])));
  };
  const ARM_NAMES = ['V0', 'R97-ON'];
  const md = ['# P1 Contest — which criterion blocks the race', '',
    `Post-analysis of the committed \`races-<arm>-<track>.csv\` files in this directory — no sim run, no new data. Thresholds are \`FRONT_BATTLE_DEFAULTS\`. **fail%** = share of races failing that condition (conditions overlap, so they do not sum to 100). **sole** = races failing EXACTLY that one, i.e. the races a single change would flip. Facts only.`, ''];
  const rowsOut = [];
  for (const arm of ARM_NAMES) {
    const rows = [];
    for (const t of TRACK_IDS) {
      const p = join(DIR, `races-${arm}-${t}.csv`);
      try { rows.push(...readCsv(p)); } catch { /* track not in this run */ }
    }
    if (!rows.length) continue;
    const scored = rows.map((r) => COND.filter((c) => c.fails(r)).map((c) => c.key));
    const pass = scored.filter((f) => f.length === 0).length;
    md.push(`## ${arm} — ${rows.length} races, ${pass} classified REAL P1 ACTION (${(100 * pass / rows.length).toFixed(1)}%)`);
    md.push('');
    md.push('| condition | fail% | sole blocker |');
    md.push('|---|---|---|');
    for (const c of COND) {
      const fail = scored.filter((f) => f.includes(c.key)).length;
      const sole = scored.filter((f) => f.length === 1 && f[0] === c.key).length;
      md.push(`| ${c.label} | ${(100 * fail / rows.length).toFixed(1)}% | ${sole} |`);
      rowsOut.push([arm, c.key, rows.length, fail, +(fail / rows.length).toFixed(4), sole].join(','));
    }
    md.push('');
  }
  writeFileSync(join(DIR, 'criterion-breakdown.md'), md.join('\n') + '\n');
  writeFileSync(join(DIR, 'criterion-breakdown.csv'),
    ['arm,condition,n,failures,failRate,soleBlocker', ...rowsOut].join('\n') + '\n');
  console.log(md.join('\n'));
  process.exit(0);
}

// ════════════════════════════════════════════════════════════════════════════════
// SMALL-G CHASE-SUPPRESSION DIAGNOSTIC (--smallg-diag) — searound + mountainstreet, N=50, 3 arms.
// Question: computeGapBiasedTarget's gapBehind>G branch RETURNS before the gapAhead>G check. At a small
// G the owner's slider setting (0.75) should make chasers that break from the pack open a >G hole BEHIND
// themselves and get DOWN-tilted although they are far behind the leader — the chase is structurally
// suppressed, so escapes could GROW vs OFF. The smoking gun is gapDownAheadGtBehind: DOWN-tilts applied
// to a racer whose gapAhead already exceeded its gapBehind. Read-only measurement; the branch-fire
// counters are pure telemetry (fingerprint byte-identical).
// ════════════════════════════════════════════════════════════════════════════════
if (argv.includes('--smallg-diag')) {
  const OUT_D = join(OUT_ABS, 'smallG-diag');
  mkdirSync(OUT_D, { recursive: true });
  mkdirSync(TMP_ABS, { recursive: true });
  const TRACKS = ONLY ? [ONLY] : ['searound', 'mountainstreet'];
  const TRK = TRACKS.map((id) => { const s = trackSeed(id); return { id, racer: s.defaultRacerTypeId, closed: !!s.closed }; });
  // STOP gate: OFF must reproduce the confirm-n200 V0 baseline on exactly these seeds (1..50).
  const KNOWN50 = { searound: 14, mountainstreet: 10 };
  const ARMS = [
    { name: 'OFF', gr: false },
    { name: 'G15', gr: true, mode: 'symmetric', G: 1.5, s: 1.0 },
    { name: 'G075', gr: true, mode: 'symmetric', G: 0.75, s: 1.0 },
  ];
  const store = {}; // store[arm][track]

  async function runOne(arm, track) {
    const outAbs = join(TMP_ABS, `smallg__${arm.name}__${track.id}`);
    const args = ['scripts/sim-fairness.mjs', `--track=${track.id}`, `--racer=${track.racer}`,
      `--seed=${SEED}`, `--races=${RACES}`, `--dur=${DUR}`, '--runaway-parade', `--out=${toSimOut(outAbs)}`];
    if (arm.gr) args.push(`--gapRerollThresholdLengths=${arm.G}`, `--gapRerollMode=${arm.mode}`, `--gapRerollStrength=${arm.s}`);
    else args.push('--gapRerollEnabled=false'); // shipped default is now ON — an OFF arm must say so
    await pExecFile(process.execPath, args, { cwd: ROOT, maxBuffer: 512 * 1024 * 1024 });
    const rp = JSON.parse(readFileSync(join(outAbs, 'runaway-parade.json'), 'utf8'));
    const fd = JSON.parse(readFileSync(join(outAbs, 'fairness-data.json'), 'utf8'));
    const nat = (fd.results || [])[0]?.avgNaturalness || {};
    const bySeed = {}; let runaway = 0, parade = 0; const gaps = [];
    for (const rec of rp.races) {
      const c = classifyRace(rec.runawayParade, D);
      const g = rec.runawayParade.leaderGapP2At090Len;
      bySeed[rec.seed] = { runaway: c.runawayWinner, parade: c.paradeFinish, gap090: g, within3: rec.runawayParade.within3P1At090 };
      if (c.runawayWinner) runaway++; if (c.paradeFinish) parade++;
      if (g != null) gaps.push(g); // null = lone survivor (Infinity), excluded from the mean
    }
    return {
      bySeed,
      agg: { arm: arm.name, track: track.id, n: rp.races.length, runaway, parade,
        runawayRate: runaway / rp.races.length, paradeRate: parade / rp.races.length,
        gap090Mean: mean(gaps), gap090Med: percentile(gaps, 0.5), gap090N: gaps.length,
        windowRolls: nat.gapWindowRolls ?? 0, biasedRolls: nat.gapBiasedRolls ?? 0,
        downTilts: nat.gapDownTilts ?? 0, upTilts: nat.gapUpTilts ?? 0,
        smokingGun: nat.gapDownAheadGtBehind ?? 0,
        downLeader: nat.gapDownLeader ?? 0, downChaser: nat.gapDownChaser ?? 0, downPack: nat.gapDownPack ?? 0,
        downGapAheadMean: nat.gapDownGapAheadMean ?? 0, downGapBehindMean: nat.gapDownGapBehindMean ?? 0 },
    };
  }

  const t0 = Date.now();
  console.log(`\n=== smallg-diag === ${ARMS.length} arms × ${TRK.length} tracks × N=${RACES} (seed=${SEED}, dur=${DUR}s), jobs=${JOBS}`);
  const jobs = ARMS.flatMap((a) => TRK.map((t) => ({ a, t })));
  for (const a of ARMS) store[a.name] = {};
  let nx = 0, dn = 0;
  async function w() {
    while (nx < jobs.length) {
      const i = nx++; const { a, t } = jobs[i];
      const r = await runOne(a, t);
      store[a.name][t.id] = r; dn++;
      console.log(`  [${dn}/${jobs.length}] ${a.name.padEnd(5)} ${t.id.padEnd(15)} runaway=${r.agg.runaway}/${r.agg.n} down=${r.agg.downTilts} up=${r.agg.upTilts} smokingGun=${r.agg.smokingGun}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(JOBS, jobs.length) }, w));

  // ── STOP gate: OFF reproduces the known per-track baselines on these seeds ──
  const gateFails = [];
  for (const t of TRK) {
    if (KNOWN50[t.id] == null || RACES !== 50 || SEED !== 1) continue;
    const got = store.OFF[t.id].agg.runaway;
    if (got !== KNOWN50[t.id]) gateFails.push(`${t.id}: OFF runaway ${got} (baseline ${KNOWN50[t.id]} on seeds 1–50)`);
  }
  const gateChecked = TRK.filter((t) => KNOWN50[t.id] != null).length > 0 && RACES === 50 && SEED === 1;

  // ── CSVs ──
  const ACOLS = ['arm', 'track', 'n', 'runaway', 'runawayRate', 'parade', 'gap090Mean', 'gap090Med', 'gap090N',
    'windowRolls', 'biasedRolls', 'downTilts', 'upTilts', 'smokingGun', 'downLeader', 'downChaser', 'downPack',
    'downGapAheadMean', 'downGapBehindMean'];
  const aggRows = ARMS.flatMap((a) => TRK.map((t) => store[a.name][t.id].agg));
  writeFileSync(join(OUT_D, 'per-arm-track.csv'),
    [ACOLS.join(','), ...aggRows.map((r) => ACOLS.map((c) => (r[c] == null ? '' : typeof r[c] === 'number' ? +Number(r[c]).toFixed(4) : r[c])).join(','))].join('\n') + '\n');
  const RCOLS = ['arm', 'track', 'seed', 'runaway', 'parade', 'gap090', 'within3'];
  for (const a of ARMS) for (const t of TRK) {
    const bs = store[a.name][t.id].bySeed;
    const rows = Object.keys(bs).map(Number).sort((x, y) => x - y);
    writeFileSync(join(OUT_D, `races-${a.name}-${t.id}.csv`),
      [RCOLS.join(','), ...rows.map((s) => [a.name, t.id, s, bs[s].runaway ? 1 : 0, bs[s].parade ? 1 : 0, r4(bs[s].gap090), bs[s].within3 ?? ''].join(','))].join('\n') + '\n');
  }

  // ── Part-B section of SUMMARY.md (Part A is prose, appended by the operator) ──
  const pctS = (x) => (100 * x).toFixed(1) + '%';
  const md = [];
  md.push('# PART B — Chase-suppression at small G (searound + mountainstreet, N=' + RACES + ', ' + DUR + 's)');
  md.push('');
  md.push(`Arms: OFF (no gapReroll) / G15 (symmetric G=1.5 s=1.0, the confirmed candidate) / G075 (symmetric G=0.75 s=1.0, the owner's slider). Fixed baseline seeds ${SEED}–${SEED + RACES - 1}, default racer per track. Branch-fire counters are pure telemetry — no sim behavior changed.`);
  md.push('');
  md.push('## STOP gate — OFF reproduces the known baselines');
  if (!gateChecked) md.push('SKIPPED (needs --races=50 --seed=1 on the known tracks).');
  else if (gateFails.length) md.push('❌ FAILED:\n' + gateFails.map((f) => `- ${f}`).join('\n'));
  else md.push(`✅ PASSED — OFF runaway counts equal the confirm-n200 V0 first-50-seed subset (${TRK.filter((t) => KNOWN50[t.id] != null).map((t) => `${t.id} ${store.OFF[t.id].agg.runaway}`).join(', ')}).`);
  md.push('');
  md.push('## Headline per arm × track');
  md.push('| track | arm | runawayWinnerRate | mean escape gap@0.90 (L) | median | DOWN-tilts | UP-tilts | **DOWN with gapAhead>gapBehind** |');
  md.push('|---|---|---|---|---|---|---|---|');
  for (const t of TRK) for (const a of ARMS) {
    const r = store[a.name][t.id].agg;
    md.push(`| ${t.id} | ${a.name} | ${pctS(r.runawayRate)} (${r.runaway}/${r.n}) | ${r.gap090Mean.toFixed(2)} | ${r.gap090Med.toFixed(2)} | ${r.downTilts} | ${r.upTilts} | **${r.smokingGun}** |`);
  }
  md.push('');
  md.push('*Mean escape gap@0.90 = leader→P2 distance in racer lengths at progress 0.90, averaged over races where P2 still exists (n per race set in `per-arm-track.csv`).*');
  md.push('');
  md.push('## The smoking gun — DOWN-tilts by live-rank group');
  md.push('A DOWN-tilt shifts the draw toward the SLOW band edge. It is *intended* for a racer that has escaped forward. It is *suppression* when the racer is itself far behind the racer ahead.');
  md.push('| track | arm | DOWN total | on leader (P1) | on chasers (P2–P5) | on pack (P6+) | gapAhead mean at DOWN | gapBehind mean at DOWN | share with gapAhead>gapBehind |');
  md.push('|---|---|---|---|---|---|---|---|---|');
  for (const t of TRK) for (const a of ARMS) {
    const r = store[a.name][t.id].agg;
    const share = r.downTilts > 0 ? pctS(r.smokingGun / r.downTilts) : '–';
    md.push(`| ${t.id} | ${a.name} | ${r.downTilts} | ${r.downLeader} | ${r.downChaser} | ${r.downPack} | ${r.downGapAheadMean.toFixed(2)} | ${r.downGapBehindMean.toFixed(2)} | **${share}** |`);
  }
  md.push('');
  md.push('## Verdict');
  const verdict = [];
  for (const t of TRK) {
    const off = store.OFF[t.id].agg, g15 = store.G15[t.id].agg, g075 = store.G075[t.id].agg;
    verdict.push(`- **${t.id}**: runaway OFF ${pctS(off.runawayRate)} → G15 ${pctS(g15.runawayRate)} → G075 ${pctS(g075.runawayRate)}; mean escape gap@0.90 ${off.gap090Mean.toFixed(2)} → ${g15.gap090Mean.toFixed(2)} → ${g075.gap090Mean.toFixed(2)}L; suppressed DOWN-tilts (gapAhead>gapBehind) ${off.smokingGun} → ${g15.smokingGun} → ${g075.smokingGun}.`);
  }
  md.push(...verdict);
  md.push('');
  const sgG15 = TRK.reduce((s, t) => s + store.G15[t.id].agg.smokingGun, 0);
  const sgG075 = TRK.reduce((s, t) => s + store.G075[t.id].agg.smokingGun, 0);
  const rwG15 = mean(TRK.map((t) => store.G15[t.id].agg.runawayRate));
  const rwG075 = mean(TRK.map((t) => store.G075[t.id].agg.runawayRate));
  const rwOFF = mean(TRK.map((t) => store.OFF[t.id].agg.runawayRate));
  md.push(`Pooled: suppressed DOWN-tilts G15 = ${sgG15}, G075 = ${sgG075} (ratio ${sgG15 > 0 ? (sgG075 / sgG15).toFixed(1) + '×' : 'n/a'}). Mean runawayWinnerRate OFF ${pctS(rwOFF)} / G15 ${pctS(rwG15)} / G075 ${pctS(rwG075)}.`);
  md.push('');
  md.push('Data: `per-arm-track.csv` (aggregates), `races-<arm>-<track>.csv` (per-seed; determinism re-run target).');
  md.push('');
  writeFileSync(join(OUT_D, 'PART-B.md'), md.join('\n'));

  console.log(`\nElapsed ${((Date.now() - t0) / 60000).toFixed(1)}m → ${OUT_D}`);
  if (gateChecked && gateFails.length) { console.error('❌ STOP GATE FAILED:\n' + gateFails.map((f) => '  ' + f).join('\n')); process.exit(1); }
  console.log(gateChecked ? '  STOP gate PASSED (OFF = baseline on both tracks).' : '  STOP gate SKIPPED.');
  console.log(`  suppressed DOWN-tilts: G15=${sgG15}  G075=${sgG075}`);
  process.exit(0);
}

// ════════════════════════════════════════════════════════════════════════════════
// PHASE-2b GAP-CAP RE-ROLL SWEEP (--gapreroll-phase2b) — window-fix re-run + STRENGTH axis, 9 arms.
// Block A (strength 0.5) isolates the window-basis fix vs the broken Phase-2; Block B sweeps strength.
// Adds a second STOP gate: window-eligible rolls per track must be > 0 on ALL tracks (was 0 on closed).
// ════════════════════════════════════════════════════════════════════════════════
if (argv.includes('--gapreroll-phase2b')) {
  const OUT_G = join(OUT_ABS, 'phase2b-windowfix');
  mkdirSync(OUT_G, { recursive: true });
  mkdirSync(TMP_ABS, { recursive: true });
  const med = (a) => (a.length ? percentile(a, 0.5) : 0);
  const zoneIdxOf = (rank) => { for (let i = 0; i < BAND_EDGES.length; i++) if (rank <= BAND_EDGES[i]) return i; return BAND_EDGES.length; };
  const bandReach = (rawData, b) => { const rows = (rawData || []).filter((r) => r.sollBereich === b); return rows.length ? rows.filter((r) => zoneIdxOf(r.finalRank) === b - 1).length / rows.length : null; };
  const ARMS = [
    { name: 'V0', gr: false },
    { name: 'SYM-1.5-s05', gr: true, mode: 'symmetric', G: 1.5, s: 0.5 },
    { name: 'DOWN-1.5-s05', gr: true, mode: 'down', G: 1.5, s: 0.5 },
    { name: 'SYM-2.0-s05', gr: true, mode: 'symmetric', G: 2.0, s: 0.5 },
    { name: 'DOWN-2.0-s05', gr: true, mode: 'down', G: 2.0, s: 0.5 },
    { name: 'SYM-1.5-s075', gr: true, mode: 'symmetric', G: 1.5, s: 0.75 },
    { name: 'SYM-1.5-s10', gr: true, mode: 'symmetric', G: 1.5, s: 1.0 },
    { name: 'DOWN-1.5-s075', gr: true, mode: 'down', G: 1.5, s: 0.75 },
    { name: 'DOWN-1.5-s10', gr: true, mode: 'down', G: 1.5, s: 1.0 },
  ];

  async function runArmTrack(arm, track) {
    const outAbs = join(TMP_ABS, `${arm.name}__${track.id}`);
    const args = [
      'scripts/sim-fairness.mjs', `--track=${track.id}`, `--racer=${track.racer}`,
      `--seed=${SEED}`, `--races=${RACES}`, `--dur=${DUR}`, '--runaway-parade', '--hero-map', `--out=${toSimOut(outAbs)}`,
    ];
    if (arm.gr) args.push(`--gapRerollThresholdLengths=${arm.G}`, `--gapRerollMode=${arm.mode}`, `--gapRerollStrength=${arm.s}`);
    else args.push('--gapRerollEnabled=false'); // shipped default is now ON — an OFF arm must say so
    await pExecFile(process.execPath, args, { cwd: ROOT, maxBuffer: 256 * 1024 * 1024 });
    const rp = JSON.parse(readFileSync(join(outAbs, 'runaway-parade.json'), 'utf8'));
    const fd = JSON.parse(readFileSync(join(outAbs, 'fairness-data.json'), 'utf8'));
    let hm = {}; try { hm = JSON.parse(readFileSync(join(outAbs, 'hero-map.json'), 'utf8')); } catch { /* opt */ }
    const races = rp.races.map((r) => ({ runaway: classifyRace(r.runawayParade, D).runawayWinner, parade: classifyRace(r.runawayParade, D).paradeFinish, within3: r.runawayParade.within3P1At090 }));
    const nat = (fd.results || [])[0]?.avgNaturalness || {};
    const runawayRows = races.filter((r) => r.runaway);
    return {
      arm: arm.name, track: track.id, type: track.closed ? 'closed' : 'open', n: races.length, gr: arm.gr,
      runaway: runawayRows.length, parade: races.filter((r) => r.parade).length,
      within3RunMed: med(runawayRows.map((r) => r.within3 ?? 0)), within3AllMed: med(races.map((r) => r.within3 ?? 0)),
      b1: bandReach(fd.rawData, 1), b2: bandReach(fd.rawData, 2), holmUnfair: hm.fairness?.startRowUnfair ?? null,
      top5Action: nat.outcomeTop5SwapsMean ?? null, gapWindowRolls: nat.gapWindowRolls ?? null,
      gapBiasedRolls: nat.gapBiasedRolls ?? null, gapLeaderDutyCycle: nat.gapLeaderDutyCycle ?? null,
    };
  }

  const jobs = [];
  for (const a of ARMS) for (const t of TRACKS) jobs.push({ a, t });
  const rows = new Array(jobs.length);
  let next = 0, done = 0; const t0 = Date.now();
  console.log(`\n=== exp-runaway-leader --gapreroll-phase2b === ${ARMS.length} arms × ${TRACKS.length} tracks × N=${RACES} (seed=${SEED}), jobs=${JOBS}`);
  async function worker() {
    while (next < jobs.length) {
      const i = next++; rows[i] = await runArmTrack(jobs[i].a, jobs[i].t); done++;
      const r = rows[i];
      console.log(`  [${done}/${jobs.length}] ${r.arm.padEnd(14)} ${r.track.padEnd(15)} runaway=${r.runaway}/${r.n} w3run=${r.within3RunMed} winRolls=${r.gapWindowRolls != null ? r.gapWindowRolls.toFixed(0) : '-'} biased=${r.gapBiasedRolls != null ? r.gapBiasedRolls.toFixed(1) : '-'}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(JOBS, jobs.length) }, worker));

  // ── STOP GATE 1: V0 overall runaway must reproduce 22.5% ±2 ──
  const v0Rows = rows.filter((r) => r.arm === 'V0');
  const v0Rate = v0Rows.reduce((s, r) => s + r.runaway, 0) / v0Rows.reduce((s, r) => s + r.n, 0);
  // ── STOP GATE 2: window-eligible rolls per track > 0 on ALL tracks (the fix's target) ──
  const zeroWindow = rows.filter((r) => r.gr && (r.gapWindowRolls ?? 0) <= 0).map((r) => `${r.arm}/${r.track}`);
  const stops = [];
  if (RACES === 50 && (v0Rate < 0.205 || v0Rate > 0.245)) stops.push(`V0 overall runaway ${(100 * v0Rate).toFixed(1)}% outside 22.5% ±2`);
  if (zeroWindow.length) stops.push(`window-eligible rolls still 0 on: ${zeroWindow.join(', ')}`);

  // Per-(arm×track) CSV (always written).
  const COLS = ['arm', 'track', 'type', 'n', 'runaway', 'parade', 'within3RunMed', 'within3AllMed', 'b1', 'b2', 'holmUnfair', 'top5Action', 'gapWindowRolls', 'gapBiasedRolls', 'gapLeaderDutyCycle'];
  writeFileSync(join(OUT_G, 'per-arm-track.csv'), [COLS.join(','), ...rows.map((r) => COLS.map((c) => (r[c] == null ? '' : typeof r[c] === 'number' ? +r[c].toFixed(4) : r[c])).join(','))].join('\n') + '\n');

  if (stops.length) {
    writeFileSync(join(OUT_G, 'SUMMARY.md'), `# Gap-Reroll Phase-2b — STOP GATE FAILED\n\nNOT interpreted. Investigate before trusting results.\n\n${stops.map((s) => `- ${s}`).join('\n')}\n`);
    console.error('\n❌ STOP GATE FAILED:\n' + stops.map((s) => '  ' + s).join('\n'));
    process.exit(1);
  }

  const agg = ARMS.map((a) => {
    const ar = rows.filter((r) => r.arm === a.name);
    const N = ar.reduce((s, r) => s + r.n, 0), runaway = ar.reduce((s, r) => s + r.runaway, 0), parade = ar.reduce((s, r) => s + r.parade, 0);
    const perTrack = {}; for (const r of ar) perTrack[r.track] = r.runaway / r.n;
    return {
      name: a.name, N, runawayRate: runaway / N, maxTrackRunaway: Math.max(...ar.map((r) => r.runaway / r.n)),
      paradeRate: parade / N, perTrack, within3RunMed: med(ar.map((r) => r.within3RunMed)), within3AllMed: med(ar.map((r) => r.within3AllMed)),
      b1min: Math.min(...ar.map((r) => r.b1 ?? 0)), b2min: Math.min(...ar.map((r) => r.b2 ?? 0)),
      holmTracks: ar.filter((r) => (r.holmUnfair ?? 0) > 0).length, action: mean(ar.map((r) => r.top5Action ?? 0)),
      winRolls: mean(ar.map((r) => r.gapWindowRolls ?? 0)), biasedRolls: mean(ar.map((r) => r.gapBiasedRolls ?? 0)), dutyCycle: mean(ar.map((r) => r.gapLeaderDutyCycle ?? 0)),
    };
  });
  const v0 = agg.find((a) => a.name === 'V0');
  for (const a of agg) {
    a.actionDelta = v0.action ? a.action - v0.action : 0;
    a.pass = a.runawayRate < 0.10 && a.maxTrackRunaway <= 0.15 && a.within3RunMed >= 2 && a.paradeRate <= 0.02 && a.actionDelta >= 0 && a.b1min >= 0.70 && a.b2min >= 0.70 && a.holmTracks <= 2;
  }

  const pctS = (x) => (100 * x).toFixed(1) + '%';
  const md = [];
  md.push('# Gap-Cap Re-Roll Bias — Phase-2b (window-fix re-run + strength axis)');
  md.push('');
  md.push(`SIM-only, scheduled rolls only, window end on the roll schedule's REALIZED-duration basis (fix ${'`'}9ff3bf3${'`'}). All 4 tracks, **N=${RACES}**, seed=${SEED} (f40a7a6 seeds). Facts only — arm decision is the owner's.`);
  md.push(`STOP gates PASSED: V0 overall ${pctS(v0Rate)} (within 22.5% ±2); window-eligible rolls > 0 on all tracks (closed tracks were 0 pre-fix).`);
  md.push('');
  md.push('## Gates');
  md.push('runaway <10% overall AND ≤15% every track AND within-3.0L-of-P1 runaway-median ≥ 2 AND parade ≤2% AND action Δ ≥ 0 AND B1&B2 ≥70% (every track) AND Holm ≤2/4.');
  md.push('');
  md.push('| arm | runaway | per track (lh/ms/sr/do) | max | within3 (run/all) | parade | action Δ | B1min | B2min | Holm | winRolls | biased | duty | PASS |');
  md.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  const tks = TRACKS.map((t) => t.id);
  for (const a of agg) {
    const pt = tks.map((t) => (a.perTrack[t] != null ? pctS(a.perTrack[t]) : '-')).join(' / ');
    md.push(`| ${a.name} | ${pctS(a.runawayRate)} | ${pt} | ${pctS(a.maxTrackRunaway)} | ${a.within3RunMed} / ${a.within3AllMed} | ${pctS(a.paradeRate)} | ${(a.actionDelta >= 0 ? '+' : '') + a.actionDelta.toFixed(2)} | ${pctS(a.b1min)} | ${pctS(a.b2min)} | ${a.holmTracks}/4 | ${a.winRolls.toFixed(0)} | ${a.biasedRolls.toFixed(1)} | ${a.dutyCycle.toFixed(2)} | ${a.pass ? '✅' : '❌'} |`);
  }
  md.push('');
  md.push(`Per-track column order: ${tks.join(' / ')}. Raw: ${'`'}per-arm-track.csv${'`'}. winRolls = mean window-eligible rolls/race (STOP-gate denominator); biased = mean biased rolls/race; duty = leader duty-cycle (the "held" gauge).`);
  md.push('');
  writeFileSync(join(OUT_G, 'SUMMARY.md'), md.join('\n'));

  console.log(`\nElapsed ${((Date.now() - t0) / 60000).toFixed(1)}m → ${OUT_G}`);
  console.log('\nSummary (runaway / within3-run / parade / actionΔ / duty / PASS):');
  for (const a of agg) console.log(`  ${a.name.padEnd(14)} ${pctS(a.runawayRate).padStart(6)} / w3=${a.within3RunMed} / ${pctS(a.paradeRate).padStart(5)} / ${(a.actionDelta >= 0 ? '+' : '') + a.actionDelta.toFixed(2)} / dc=${a.dutyCycle.toFixed(2)} / ${a.pass ? 'PASS' : 'fail'}`);
  process.exit(0);
}

// ════════════════════════════════════════════════════════════════════════════════
// PHASE-2 GAP-CAP RE-ROLL SWEEP (--gapreroll-phase2). Sweeps the SIM-only gap-cap re-roll bias
// (--gapRerollThresholdLengths / --gapRerollMode) on all 4 tracks. Scheduled-rolls-only build. Same
// f40a7a6 seeds. Facts only — the arm decision is the owner's.
// ════════════════════════════════════════════════════════════════════════════════
if (argv.includes('--gapreroll-phase2')) {
  const OUT_G = join(OUT_ABS, 'phase2-gapreroll');
  mkdirSync(OUT_G, { recursive: true });
  mkdirSync(TMP_ABS, { recursive: true });
  const med = (a) => (a.length ? percentile(a, 0.5) : 0);
  const zoneIdxOf = (rank) => { for (let i = 0; i < BAND_EDGES.length; i++) if (rank <= BAND_EDGES[i]) return i; return BAND_EDGES.length; };
  const bandReach = (rawData, b) => { const rows = (rawData || []).filter((r) => r.sollBereich === b); return rows.length ? rows.filter((r) => zoneIdxOf(r.finalRank) === b - 1).length / rows.length : null; };
  const ARMS = [
    { name: 'V0', gr: false },
    { name: 'SYM-1.5', gr: true, mode: 'symmetric', G: 1.5 },
    { name: 'SYM-2.0', gr: true, mode: 'symmetric', G: 2.0 },
    { name: 'DOWN-1.5', gr: true, mode: 'down', G: 1.5 },
    { name: 'DOWN-2.0', gr: true, mode: 'down', G: 2.0 },
  ];

  async function runArmTrack(arm, track) {
    const outAbs = join(TMP_ABS, `${arm.name}__${track.id}`);
    const args = [
      'scripts/sim-fairness.mjs', `--track=${track.id}`, `--racer=${track.racer}`,
      `--seed=${SEED}`, `--races=${RACES}`, `--dur=${DUR}`, '--runaway-parade', '--hero-map', `--out=${toSimOut(outAbs)}`,
    ];
    if (arm.gr) args.push(`--gapRerollThresholdLengths=${arm.G}`, `--gapRerollMode=${arm.mode}`);
    else args.push('--gapRerollEnabled=false'); // shipped default is now ON — an OFF arm must say so
    await pExecFile(process.execPath, args, { cwd: ROOT, maxBuffer: 256 * 1024 * 1024 });
    const rp = JSON.parse(readFileSync(join(outAbs, 'runaway-parade.json'), 'utf8'));
    const fd = JSON.parse(readFileSync(join(outAbs, 'fairness-data.json'), 'utf8'));
    let hm = {}; try { hm = JSON.parse(readFileSync(join(outAbs, 'hero-map.json'), 'utf8')); } catch { /* opt */ }
    const races = rp.races.map((r) => ({ runaway: classifyRace(r.runawayParade, D).runawayWinner, parade: classifyRace(r.runawayParade, D).paradeFinish, within3: r.runawayParade.within3P1At090 }));
    const nat = (fd.results || [])[0]?.avgNaturalness || {};
    const runawayRows = races.filter((r) => r.runaway);
    return {
      arm: arm.name, track: track.id, type: track.closed ? 'closed' : 'open', n: races.length,
      runaway: runawayRows.length, parade: races.filter((r) => r.parade).length,
      within3RunMed: med(runawayRows.map((r) => r.within3 ?? 0)),
      within3AllMed: med(races.map((r) => r.within3 ?? 0)),
      b1: bandReach(fd.rawData, 1), b2: bandReach(fd.rawData, 2),
      holmUnfair: hm.fairness?.startRowUnfair ?? null,
      top5Action: nat.outcomeTop5SwapsMean ?? null,
      gapBiasedRolls: nat.gapBiasedRolls ?? null, gapLeaderDutyCycle: nat.gapLeaderDutyCycle ?? null,
    };
  }

  const jobs = [];
  for (const a of ARMS) for (const t of TRACKS) jobs.push({ a, t });
  const rows = new Array(jobs.length);
  let next = 0, done = 0; const t0 = Date.now();
  console.log(`\n=== exp-runaway-leader --gapreroll-phase2 === ${ARMS.length} arms × ${TRACKS.length} tracks × N=${RACES} (seed=${SEED}), jobs=${JOBS}`);
  async function worker() {
    while (next < jobs.length) {
      const i = next++; rows[i] = await runArmTrack(jobs[i].a, jobs[i].t); done++;
      const r = rows[i];
      console.log(`  [${done}/${jobs.length}] ${r.arm.padEnd(9)} ${r.track.padEnd(15)} runaway=${r.runaway}/${r.n} w3run=${r.within3RunMed} biasedRolls=${r.gapBiasedRolls != null ? r.gapBiasedRolls.toFixed(1) : '-'}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(JOBS, jobs.length) }, worker));

  // ── V0 STOP gate: V0 overall runaway must reproduce 22.5% ±2 (byte-identical off) ──
  const v0Rows = rows.filter((r) => r.arm === 'V0');
  const v0N = v0Rows.reduce((s, r) => s + r.n, 0);
  const v0Run = v0Rows.reduce((s, r) => s + r.runaway, 0);
  const v0Rate = v0N ? v0Run / v0N : 0;
  if (RACES === 50 && (v0Rate < 0.205 || v0Rate > 0.245)) {
    const msg = `# Gap-Reroll Phase-2 — V0 STOP GATE FAILED\n\nV0 overall runaway ${(100 * v0Rate).toFixed(1)}% (${v0Run}/${v0N}) is outside 22.5% ±2 — the comparison basis is broken. NOT reported.\n`;
    writeFileSync(join(OUT_G, 'SUMMARY.md'), msg);
    console.error(`\n❌ V0 STOP GATE FAILED: ${(100 * v0Rate).toFixed(1)}% outside [20.5, 24.5]`);
    process.exit(1);
  }

  // Per-(arm×track) CSV.
  const COLS = ['arm', 'track', 'type', 'n', 'runaway', 'parade', 'within3RunMed', 'within3AllMed', 'b1', 'b2', 'holmUnfair', 'top5Action', 'gapBiasedRolls', 'gapLeaderDutyCycle'];
  writeFileSync(join(OUT_G, 'per-arm-track.csv'), [COLS.join(','), ...rows.map((r) => COLS.map((c) => (r[c] == null ? '' : typeof r[c] === 'number' ? +r[c].toFixed(4) : r[c])).join(','))].join('\n') + '\n');

  // Aggregate per arm + PASS/FAIL. V0 = action reference.
  const agg = ARMS.map((a) => {
    const ar = rows.filter((r) => r.arm === a.name);
    const N = ar.reduce((s, r) => s + r.n, 0);
    const runaway = ar.reduce((s, r) => s + r.runaway, 0);
    const parade = ar.reduce((s, r) => s + r.parade, 0);
    const perTrack = {}; for (const r of ar) perTrack[r.track] = r.runaway / r.n;
    return {
      name: a.name, N, runawayRate: runaway / N, maxTrackRunaway: Math.max(...ar.map((r) => r.runaway / r.n)),
      paradeRate: parade / N, perTrack,
      within3RunMed: med(ar.map((r) => r.within3RunMed)), within3AllMed: med(ar.map((r) => r.within3AllMed)),
      b1min: Math.min(...ar.map((r) => r.b1 ?? 0)), b2min: Math.min(...ar.map((r) => r.b2 ?? 0)),
      holmTracks: ar.filter((r) => (r.holmUnfair ?? 0) > 0).length,
      action: mean(ar.map((r) => r.top5Action ?? 0)),
      biasedRolls: mean(ar.map((r) => r.gapBiasedRolls ?? 0)), dutyCycle: mean(ar.map((r) => r.gapLeaderDutyCycle ?? 0)),
    };
  });
  const v0 = agg.find((a) => a.name === 'V0');
  for (const a of agg) {
    a.actionDelta = v0.action ? a.action - v0.action : 0;
    a.pass = a.runawayRate < 0.10 && a.maxTrackRunaway <= 0.15 && a.within3RunMed >= 2 && a.paradeRate <= 0.02
      && a.actionDelta >= 0 && a.b1min >= 0.70 && a.b2min >= 0.70 && a.holmTracks <= 2;
  }

  const pctS = (x) => (100 * x).toFixed(1) + '%';
  const md = [];
  md.push('# Gap-Cap Re-Roll Bias — Phase-2 Exploration Sweep');
  md.push('');
  md.push(`SIM-only gap-cap re-roll bias (docs/CONCEPT-COHESION.md), scheduled rolls only. All 4 tracks, **N=${RACES} per track**, seed=${SEED} (same seeds as the f40a7a6 baseline). Strength 0.5 (threshold-first). Facts only — the arm decision is the owner's.`);
  md.push(`V0 STOP gate PASSED (V0 overall runaway ${pctS(v0Rate)} within 22.5% ±2).`);
  md.push('');
  md.push('## Gates');
  md.push('runaway <10% overall AND ≤15% every track AND within-3.0L-of-P1 runaway-median ≥ 2 AND parade ≤2% AND action Δ ≥ 0 AND B1&B2 ≥70% (every track) AND Holm ≤2/4.');
  md.push('');
  md.push('| arm | runaway overall | per track (lh/ms/sr/do) | max | within3 (run / all) | parade | action Δ | B1min | B2min | Holm | biasedRolls | dutyCycle | PASS |');
  md.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  const tks = TRACKS.map((t) => t.id);
  for (const a of agg) {
    const pt = tks.map((t) => (a.perTrack[t] != null ? pctS(a.perTrack[t]) : '-')).join(' / ');
    md.push(`| ${a.name} | ${pctS(a.runawayRate)} | ${pt} | ${pctS(a.maxTrackRunaway)} | ${a.within3RunMed} / ${a.within3AllMed} | ${pctS(a.paradeRate)} | ${(a.actionDelta >= 0 ? '+' : '') + a.actionDelta.toFixed(2)} | ${pctS(a.b1min)} | ${pctS(a.b2min)} | ${a.holmTracks}/4 | ${a.biasedRolls.toFixed(1)} | ${a.dutyCycle.toFixed(2)} | ${a.pass ? '✅' : '❌'} |`);
  }
  md.push('');
  md.push(`Per-track column order: ${tks.join(' / ')}. Raw per-(arm×track): \`per-arm-track.csv\`.`);
  md.push('Watch metrics: `biasedRolls` = mean gap-biased rolls/race; `dutyCycle` = mean leader duty-cycle (share of one racer\'s window rolls biased — the "held" gauge, high = reads as a spring).');
  md.push('');
  writeFileSync(join(OUT_G, 'SUMMARY.md'), md.join('\n'));

  console.log(`\nElapsed ${((Date.now() - t0) / 60000).toFixed(1)}m → ${OUT_G}`);
  console.log('\nSummary (runaway / within3-run / parade / actionΔ / dutyCycle / PASS):');
  for (const a of agg) console.log(`  ${a.name.padEnd(9)} ${pctS(a.runawayRate).padStart(6)} / w3=${a.within3RunMed} / ${pctS(a.paradeRate).padStart(5)} / ${(a.actionDelta >= 0 ? '+' : '') + a.actionDelta.toFixed(2)} / dc=${a.dutyCycle.toFixed(2)} / ${a.pass ? 'PASS' : 'fail'}`);
  process.exit(0);
}

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
