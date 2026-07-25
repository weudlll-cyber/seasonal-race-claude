// ============================================================
// File:        scripts/exp-gs-confirm-gate.mjs
// Project:     RaceArena
// Description: G/s CANDIDATE CONFIRM GATE over ALL TEN standard tracks on the honest, shipped 150 world.
//              Read-only measurement driver — varies ONLY the two shipped gap-reroll knobs via CLI flags on
//              sim-fairness.mjs; no shipped engine change. Two arms, paired seeds race-for-race:
//                CONTROL   = shipped defaults (flagless: gap-reroll ON, G=0.75, s=0.5)
//                CANDIDATE = --gapRerollThresholdLengths=0.5 --gapRerollStrength=1.0 (G=0.5, s=1.0)
//              N=100 per arm per track (~2000 races), each track at its canonical per-track default
//              (default racer type, default laps/seconds, standard field 40 closed / 60 open). Metrics per
//              arm, pooled (racer-row weighted) AND per track: band-reach (primary) + Holm flagged-track
//              count, and the finale guardrails — dead finales, front@line, lead changes, runaway/parade/duo,
//              escape depth med/p90, saturated-correction rate. Plus a duration-scaling pass for the
//              CANDIDATE arm (N=25 x the 4 standard tracks x {30,120,300}s) to compare against the shipped
//              arm's scaling already recorded in REBASELINE.md.
//
// Usage: node scripts/exp-gs-confirm-gate.mjs [--races=100] [--seed=1] [--jobs=8] [--scale-races=25]
// ============================================================
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, isAbsolute, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyRace, RUNAWAY_PARADE_DEFAULTS } from './sim/observers/runaway-parade.mjs';
import { summarizeEpisodes } from './sim/observers/escape-episodes.mjs';
import { DEFAULT_BASE_SPEED_CONFIG } from '../client/src/modules/storage/defaults.js';

const pExecFile = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const argVal = (k, d) => { const m = argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };

const NORMAL_SPEED = DEFAULT_BASE_SPEED_CONFIG.normalSpeedPxPerSec; // shipped pick (150)
const RACES = Number(argVal('races', '100'));
const SCALE_RACES = Number(argVal('scale-races', '25'));
const SEED = Number(argVal('seed', '1'));
const JOBS = Math.max(1, Number(argVal('jobs', '8')));
const OUT_ABS = (() => { const r = argVal('out', 'reports/parity/gs-confirm-data'); return isAbsolute(r) ? r : join(ROOT, r); })();
const TMP_ABS = join(ROOT, 'client/tmp/exp-gs-confirm-gate');
const toSimOut = (a) => relative(ROOT, a).replace(/\\/g, '/');

const TRACK_IDS = ['city-circuit', 'dirt-oval', 'garden-path', 'ice-track', 'luger-hill', 'mountainstreet', 'river-run', 'searound', 'seatrack', 'space-sprint'];
const SCALE_TRACK_IDS = ['luger-hill', 'mountainstreet', 'searound', 'dirt-oval']; // the 4 standard scaling tracks
const trackSeed = (id) => JSON.parse(readFileSync(join(ROOT, 'server/seeds/tracks', `${id}.json`), 'utf8'));
const TRACKS = TRACK_IDS.map((id) => { const s = trackSeed(id); return { id, seed: s, racer: s.defaultRacerTypeId, closed: !!s.closed, pathLengthPx: s.pathLengthPx ?? 0 }; });
const RACERS_CLOSED = 40, RACERS_OPEN = 60;

// The two arms. CONTROL is flagless (byte-identical to the shipped game); CANDIDATE sets the two knobs.
const ARMS = [
  { key: 'control', label: 'CONTROL (G0.75 s0.5, shipped)', flags: [] },
  { key: 'candidate', label: 'CANDIDATE (G0.5 s1.0)', flags: ['--gapRerollEnabled=true', '--gapRerollThresholdLengths=0.5', '--gapRerollStrength=1.0', '--gapRerollMode=symmetric'] },
];

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const pctl = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))]; };
const r3 = (x) => (x == null ? '' : +Number(x).toFixed(3));
const pct = (x) => (x == null ? 'n/a' : (x * 100).toFixed(1) + '%');
const fg = (line, r = 3) => { if (!line?.gaps?.length) return null; let c = 0, n = 1; for (const g of line.gaps) { c += g; if (c <= r) n++; else break; } return n; };

function servoSaturatedRate(ssJson) {
  let sat = 0, tot = 0;
  for (const race of ssJson.races ?? []) {
    const samples = race.speedSource?.samples ?? {};
    for (const prog of Object.keys(samples)) for (const rec of samples[prog]) { tot++; if (rec.servoSaturated) sat++; }
  }
  return { rate: tot ? sat / tot : null, samples: tot };
}

async function runTrack(track, arm, races, { durSec = null } = {}) {
  const nRacers = track.closed ? RACERS_CLOSED : RACERS_OPEN;
  const tag = `${arm.key}__${track.id}${durSec == null ? '' : `-dur${durSec}`}`;
  const outAbs = join(TMP_ABS, tag);
  const args = ['scripts/sim-fairness.mjs',
    `--track=${track.id}`, `--racer=${track.racer}`,
    `--seed=${SEED}`, `--races=${races}`, `--racers=${nRacers}`,
    `--normalSpeed=${NORMAL_SPEED}`,
    ...(durSec == null ? ['--track-defaults'] : [`--dur=${durSec}`]),
    ...arm.flags,
    '--runaway-parade', '--hero-map', '--escape-latency', '--speed-source', '--skip-main-output',
    `--out=${toSimOut(outAbs)}`];
  const t0 = Date.now();
  await pExecFile(process.execPath, args, { cwd: ROOT, maxBuffer: 512 * 1024 * 1024 });
  const rp = JSON.parse(readFileSync(join(outAbs, 'runaway-parade.json'), 'utf8'));
  const el = JSON.parse(readFileSync(join(outAbs, 'escape-latency.json'), 'utf8'));
  const hm = JSON.parse(readFileSync(join(outAbs, 'hero-map.json'), 'utf8'));
  let ssRate = { rate: null, samples: 0 };
  try { ssRate = servoSaturatedRate(JSON.parse(readFileSync(join(outAbs, 'speed-source.json'), 'utf8'))); } catch { /* optional */ }
  const elByIdx = new Map(el.races.map((r) => [r.raceIdx, r.escapeLatency]));
  const rows = rp.races.map((rec) => {
    const raw = rec.runawayParade;
    const c = classifyRace(raw, RUNAWAY_PARADE_DEFAULTS);
    const e = elByIdx.get(rec.raceIdx) ?? {};
    return {
      track: track.id, arm: arm.key, seed: rec.seed,
      finaleLead: raw.leadChangeCount ?? 0,
      finaleDistinct: raw.lateDistinctLeaders ?? 0,
      dead: (raw.leadChangeCount ?? 0) === 0 ? 1 : 0,
      frontGroupAtLine: fg(raw.line),
      gapP1P2: raw.line?.gaps?.[0] ?? null,
      gapP2P3: raw.line?.gaps?.[1] ?? null,
      runaway: c.runawayWinner ? 1 : 0,
      parade: c.paradeFinish ? 1 : 0,
      escapeDepthLen: e.escapeDepthLen ?? null,
    };
  });
  return {
    track, arm: arm.key, durSec, rows,
    episodes: el.races.map((r) => r.escapeLatency),
    bandReach: hm.fairness?.bandReach ?? null,
    startRowUnfair: hm.fairness?.startRowUnfair ?? null,
    startRowMinPHolm: hm.fairness?.startRowMinPHolm ?? null,
    servoSatRate: ssRate.rate, servoSatSamples: ssRate.samples,
    nRacerRows: races * nRacers,
    _secs: (Date.now() - t0) / 1000,
  };
}

/** Aggregate a set of runs; allRows (both arms) fixes the duo gap thresholds so they are identical per arm. */
function aggregate(runs, allRows) {
  const rows = runs.flatMap((r) => r.rows);
  const depths = rows.map((r) => r.escapeDepthLen).filter((x) => x != null);
  const wSum = runs.reduce((s, r) => s + (r.bandReach != null ? r.nRacerRows : 0), 0);
  const bandReachPooled = wSum ? runs.reduce((s, r) => s + (r.bandReach != null ? r.bandReach * r.nRacerRows : 0), 0) / wSum : null;
  const satSum = runs.reduce((s, r) => s + (r.servoSatRate != null ? r.servoSatSamples : 0), 0);
  const servoSatPooled = satSum ? runs.reduce((s, r) => s + (r.servoSatRate != null ? r.servoSatRate * r.servoSatSamples : 0), 0) / satSum : null;
  const TIGHT = pctl(allRows.map((r) => r.gapP1P2).filter((x) => x != null), 25);
  const FAR = pctl(allRows.map((r) => r.gapP2P3).filter((x) => x != null), 75);
  const duo = rows.filter((r) => r.gapP1P2 != null && r.gapP2P3 != null && r.gapP1P2 <= TIGHT && r.gapP2P3 >= FAR).length;
  return {
    nRaces: rows.length,
    bandReachPooled,
    holmFlaggedTracks: runs.filter((r) => r.startRowUnfair === true).length,
    holmTracksTotal: runs.length,
    deadRate: mean(rows.map((r) => r.dead)),
    frontGroupAtLine: mean(rows.map((r) => r.frontGroupAtLine ?? 0)),
    finaleLead: mean(rows.map((r) => r.finaleLead)),
    finaleDistinct: mean(rows.map((r) => r.finaleDistinct)),
    runawayRate: mean(rows.map((r) => r.runaway)),
    paradeRate: mean(rows.map((r) => r.parade)),
    duoRate: rows.length ? duo / rows.length : null,
    escapeDepthMed: pctl(depths, 50), escapeDepthP90: pctl(depths, 90), escapeDepthMax: depths.length ? Math.max(...depths) : null,
    servoSatPooled,
    ep: summarizeEpisodes(runs.flatMap((r) => r.episodes)),
  };
}

async function pool(tasks) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: Math.min(JOBS, tasks.length) }, async () => {
    while (i < tasks.length) { const k = i++; out[k] = await tasks[k](); }
  }));
  return out;
}

// ── main gate ───────────────────────────────────────────────────────────────────────────────────
mkdirSync(OUT_ABS, { recursive: true });
const wallT0 = Date.now();
console.log(`\n=== G/s CANDIDATE CONFIRM GATE — honest 150 px/s world, all 10 tracks ===`);
console.log(`CONTROL G=0.75/s=0.5 (shipped)  vs  CANDIDATE G=0.5/s=1.0 | N=${RACES}/arm/track | ${TRACKS.length} tracks × 2 arms = ${TRACKS.length * 2 * RACES} races | paired seeds | jobs=${JOBS}`);

const tasks = [];
for (const arm of ARMS) for (const t of TRACKS) tasks.push(() => runTrack(t, arm, RACES));
const flat = await pool(tasks);
const allRows = flat.flatMap((r) => r.rows);
const byArm = (key) => flat.filter((r) => r.arm === key);
const aggControl = aggregate(byArm('control'), allRows);
const aggCand = aggregate(byArm('candidate'), allRows);

// Per-track table, both arms side by side
console.log(`\ntrack           topo    CONTROL band  CAND band   Δband   CTRL dead  CAND dead   CTRL front CAND front  CTRL run  CAND run  CTRL holm CAND holm`);
const perTrack = [];
for (const t of TRACKS) {
  const rc = byArm('control').find((r) => r.track.id === t.id);
  const rd = byArm('candidate').find((r) => r.track.id === t.id);
  const ac = aggregate([rc], allRows), ad = aggregate([rd], allRows);
  const dBand = (rd.bandReach != null && rc.bandReach != null) ? (rd.bandReach - rc.bandReach) * 100 : null;
  console.log(`${t.id.padEnd(15)} ${(t.closed ? 'closed' : 'open').padEnd(6)} ${pct(rc.bandReach).padStart(11)} ${pct(rd.bandReach).padStart(11)}  ${(dBand == null ? 'n/a' : (dBand >= 0 ? '+' : '') + dBand.toFixed(1) + 'pp').padStart(7)}  ${pct(ac.deadRate).padStart(8)} ${pct(ad.deadRate).padStart(9)}  ${ac.frontGroupAtLine.toFixed(2).padStart(9)} ${ad.frontGroupAtLine.toFixed(2).padStart(9)}  ${pct(ac.runawayRate).padStart(8)} ${pct(ad.runawayRate).padStart(8)}  ${(rc.startRowUnfair ? 'UNF' : 'ok').padStart(8)} ${(rd.startRowUnfair ? 'UNF' : 'ok').padStart(8)}`);
  perTrack.push({ track: t.id, closed: t.closed,
    control: { bandReach: rc.bandReach, holm: rc.startRowUnfair, holmP: rc.startRowMinPHolm, servoSat: rc.servoSatRate, ...ac },
    candidate: { bandReach: rd.bandReach, holm: rd.startRowUnfair, holmP: rd.startRowMinPHolm, servoSat: rd.servoSatRate, ...ad },
    dBandPp: dBand });
}

function printPooled(label, a) {
  console.log(`\n── POOLED ${label} (${a.nRaces} races) ──`);
  console.log(`  band-reach (racer-row weighted): ${pct(a.bandReachPooled)}   ${a.bandReachPooled >= 0.70 ? 'CLEARS 70%' : 'BELOW 70%'}`);
  console.log(`  Holm-unfair tracks: ${a.holmFlaggedTracks}/${a.holmTracksTotal} | dead ${pct(a.deadRate)} | front@line ${a.frontGroupAtLine.toFixed(2)} | leadChanges ${a.finaleLead.toFixed(2)} | distinct ${a.finaleDistinct.toFixed(2)}`);
  console.log(`  runaway/parade/duo ${pct(a.runawayRate)}/${pct(a.paradeRate)}/${pct(a.duoRate)} | escDep med/p90/max ${r3(a.escapeDepthMed)}/${r3(a.escapeDepthP90)}/${r3(a.escapeDepthMax)} | servoSat ${pct(a.servoSatPooled)}`);
}
printPooled('CONTROL', aggControl);
printPooled('CANDIDATE', aggCand);
const dPooled = (aggCand.bandReachPooled - aggControl.bandReachPooled) * 100;
console.log(`\n=== POOLED PRIMARY: band-reach CONTROL ${pct(aggControl.bandReachPooled)} → CANDIDATE ${pct(aggCand.bandReachPooled)}  (Δ ${(dPooled >= 0 ? '+' : '') + dPooled.toFixed(1)}pp) | 70% line: CONTROL ${aggControl.bandReachPooled >= 0.7 ? 'over' : 'under'}, CANDIDATE ${aggCand.bandReachPooled >= 0.7 ? 'over' : 'under'} ===`);

// ── candidate duration-scaling pass ───────────────────────────────────────────────────────────
const DUR_VARIANTS = (argVal('dur-variants', '30,120,300')).split(',').map(Number).filter((x) => x > 0);
console.log(`\n=== CANDIDATE DURATION-SCALING (N=${SCALE_RACES}/track/dur, ${SCALE_TRACK_IDS.join(', ')}) — compare vs REBASELINE.md shipped: 30s 65.8% / 120s 74.9% / 300s 76.8% ===`);
const scaleTracks = SCALE_TRACK_IDS.map((id) => TRACKS.find((t) => t.id === id));
const candArm = ARMS.find((a) => a.key === 'candidate');
const scaleTasks = [];
for (const d of DUR_VARIANTS) for (const t of scaleTracks) scaleTasks.push(() => runTrack(t, candArm, SCALE_RACES, { durSec: d }));
const scaleRuns = await pool(scaleTasks);
const scaleAllRows = scaleRuns.flatMap((r) => r.rows);
console.log(`\ndur   pooled band  runaway  parade   dead   servoSat`);
const scaleRows = [];
for (const d of DUR_VARIANTS) {
  const dRuns = scaleRuns.filter((x) => x.durSec === d);
  const a = aggregate(dRuns, scaleAllRows);
  console.log(`${String(d).padStart(3)}s  ${pct(a.bandReachPooled).padStart(10)}  ${pct(a.runawayRate).padStart(8)} ${pct(a.paradeRate).padStart(7)} ${pct(a.deadRate).padStart(5)} ${pct(a.servoSatPooled).padStart(9)}`);
  scaleRows.push({ dur: d, bandReachPooled: a.bandReachPooled, runawayRate: a.runawayRate, paradeRate: a.paradeRate, deadRate: a.deadRate, servoSatPooled: a.servoSatPooled,
    perTrack: dRuns.map((r) => ({ track: r.track.id, bandReach: r.bandReach, servoSat: r.servoSatRate })) });
}

const wallMin = (Date.now() - wallT0) / 60000;
console.log(`\nruntime ${wallMin.toFixed(1)} min`);

writeFileSync(join(OUT_ABS, 'gs-confirm-gate.json'), JSON.stringify({
  normalSpeed: NORMAL_SPEED, races: RACES, seed: SEED, scaleRaces: SCALE_RACES, jobs: JOBS, runtimeMin: wallMin,
  pooled: { control: aggControl, candidate: aggCand, dBandPp: dPooled },
  perTrack, candidateScaling: scaleRows,
}, null, 2) + '\n');
console.log(`\nwrote ${join(OUT_ABS, 'gs-confirm-gate.json')}`);
