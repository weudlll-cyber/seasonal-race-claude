// ============================================================
// scripts/exp-chain-int-gate.mjs — CHAIN-INT paired gate (chain vs TRUE shipped control) on the real
// engine. Read-only driver: varies ONLY the chainChoreoEnabled flag via CLI on sim-fairness.mjs; no
// engine change here. Two arms, paired seeds race-for-race (same --seed → identical fair draw):
//   CONTROL = flagless (byte-identical shipped world) | CHAIN = --chainChoreoEnabled=true
// Metrics per arm: overall band-reach (THE gate, hero-map = computeZoneSuccessRate) + per-start-row
// band-reach (descriptive), dead-finale + late lead-changes (runaway-parade), Holm start-row + win-by-row
// (descriptive). Modes: --mode=smoke (N=25, luger+searound) | --mode=gate (N=100, 4 standard tracks).
// Usage: node scripts/exp-chain-int-gate.mjs --mode=smoke|gate [--races=..] [--seed=1] [--jobs=4]
// ============================================================
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyRace, RUNAWAY_PARADE_DEFAULTS } from './sim/observers/runaway-parade.mjs';
import { DEFAULT_BASE_SPEED_CONFIG } from '../client/src/modules/storage/defaults.js';

const pExecFile = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const argVal = (k, d) => { const m = argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };

const MODE = argVal('mode', 'smoke');
const NORMAL_SPEED = DEFAULT_BASE_SPEED_CONFIG.normalSpeedPxPerSec;
const SEED = Number(argVal('seed', '1'));
const JOBS = Math.max(1, Number(argVal('jobs', '4')));
const RACES = Number(argVal('races', MODE === 'gate' ? '100' : '25'));
const TMP = join(ROOT, 'client/tmp/exp-chain-int');
const OUT = join(ROOT, 'reports/evolution/chain-int-data');
const toSimOut = (a) => relative(ROOT, a).replace(/\\/g, '/');

const TRACK_IDS = MODE === 'gate'
  ? ['luger-hill', 'mountainstreet', 'searound', 'dirt-oval']
  : ['luger-hill', 'searound'];
const trackSeed = (id) => JSON.parse(readFileSync(join(ROOT, 'server/seeds/tracks', `${id}.json`), 'utf8'));
const TRACKS = TRACK_IDS.map((id) => { const s = trackSeed(id); return { id, racer: s.defaultRacerTypeId, closed: !!s.closed }; });
const RACERS_CLOSED = 40, RACERS_OPEN = 60;

const ARMS = [
  { key: 'control', flags: [] },
  { key: 'chain', flags: ['--chainChoreoEnabled=true'] },
];

const BAND_EDGES = [5, 15, 25, 40];
const zoneIdx = (rank) => { for (let i = 0; i < BAND_EDGES.length; i++) if (rank <= BAND_EDGES[i]) return i; return BAND_EDGES.length; };
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const pct = (x) => (x == null ? 'n/a' : (x * 100).toFixed(0) + '%');

async function runTrack(track, arm) {
  const nRacers = track.closed ? RACERS_CLOSED : RACERS_OPEN;
  const outAbs = join(TMP, `${arm.key}__${track.id}`);
  const args = ['scripts/sim-fairness.mjs',
    `--track=${track.id}`, `--racer=${track.racer}`,
    `--seed=${SEED}`, `--races=${RACES}`, `--racers=${nRacers}`, `--normalSpeed=${NORMAL_SPEED}`,
    '--track-defaults', ...arm.flags, '--runaway-parade', '--hero-map',
    `--out=${toSimOut(outAbs)}`];
  await pExecFile(process.execPath, args, { cwd: ROOT, maxBuffer: 512 * 1024 * 1024 });
  const hm = JSON.parse(readFileSync(join(outAbs, 'hero-map.json'), 'utf8'));
  const rp = JSON.parse(readFileSync(join(outAbs, 'runaway-parade.json'), 'utf8'));
  const fd = JSON.parse(readFileSync(join(outAbs, 'fairness-data.json'), 'utf8'));
  // per-START-row band-reach (descriptive): reached = final band == drawn band.
  const rowReached = [], rowTotal = [];
  for (const r of fd.rawData) {
    const row = r.startRowIndex;
    rowReached[row] = rowReached[row] ?? 0; rowTotal[row] = rowTotal[row] ?? 0;
    rowTotal[row]++;
    if (zoneIdx(r.finalRank) === zoneIdx(r.sollRank)) rowReached[row]++;
  }
  const rowReach = rowReached.map((v, i) => (rowTotal[i] ? v / rowTotal[i] : null)).filter((v) => v != null);
  const rows = rp.races.map((rec) => {
    const raw = rec.runawayParade;
    const c = classifyRace(raw, RUNAWAY_PARADE_DEFAULTS);
    return {
      leadChanges: raw.leadChangeCount ?? 0,
      dead: (raw.leadChangeCount ?? 0) === 0 ? 1 : 0,
      runaway: c.runawayWinner ? 1 : 0,
      parade: c.paradeFinish ? 1 : 0,
    };
  });
  return {
    track: track.id, arm: arm.key, closed: track.closed,
    bandReach: hm.fairness?.bandReach ?? null,
    startRowUnfair: hm.fairness?.startRowUnfair ?? null,
    startRowMinPHolm: hm.fairness?.startRowMinPHolm ?? null,
    perRowWins: (hm.fairness?.perRowWins ?? []).map((w) => w.winRate),
    rowReach,
    deadRate: mean(rows.map((r) => r.dead)),
    leadChanges: mean(rows.map((r) => r.leadChanges)),
    runawayRate: mean(rows.map((r) => r.runaway)),
    paradeRate: mean(rows.map((r) => r.parade)),
    nRaces: rows.length,
  };
}

async function pool(tasks) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: Math.min(JOBS, tasks.length) }, async () => {
    while (i < tasks.length) { const k = i++; out[k] = await tasks[k](); }
  }));
  return out;
}

mkdirSync(OUT, { recursive: true });
const t0 = Date.now();
console.log(`\n=== CHAIN-INT ${MODE.toUpperCase()} — chain vs TRUE shipped control (real engine) ===`);
console.log(`N=${RACES}/arm/track | ${TRACKS.length} tracks × 2 arms | paired seeds (seed=${SEED}) | jobs=${JOBS}`);
const tasks = [];
for (const arm of ARMS) for (const t of TRACKS) tasks.push(() => runTrack(t, arm));
const flat = await pool(tasks);
const get = (track, arm) => flat.find((r) => r.track === track && r.arm === arm);

console.log(`\ntrack           topo   | CT band  CH band | CT dead  CH dead | CT lc  CH lc | CT holm CH holm | CH gate`);
let allPass = true;
for (const t of TRACKS) {
  const ct = get(t.id, 'control'), ch = get(t.id, 'chain');
  const reachOK = ch.bandReach >= 0.70;
  const actionOK = ch.deadRate <= ct.deadRate && ch.leadChanges >= ct.leadChanges;
  const pass = reachOK && actionOK; if (!pass) allPass = false;
  console.log(`${t.id.padEnd(15)} ${(t.closed ? 'closed' : 'open').padEnd(6)} | ${pct(ct.bandReach).padStart(6)} ${pct(ch.bandReach).padStart(6)} | ${pct(ct.deadRate).padStart(6)} ${pct(ch.deadRate).padStart(6)} | ${ct.leadChanges.toFixed(2).padStart(5)} ${ch.leadChanges.toFixed(2).padStart(5)} | ${(ct.startRowUnfair ? 'UNF' : 'ok').padStart(6)} ${(ch.startRowUnfair ? 'UNF' : 'ok').padStart(6)} | ${pass ? 'PASS' : 'FAIL'}${reachOK ? '' : ' reach<70'}${actionOK ? '' : ' action'}`);
}
console.log(`\n--- per-START-row band-reach, CHAIN (row0=front) [descriptive] ---`);
for (const t of TRACKS) console.log(`  ${t.id.padEnd(14)} ${get(t.id, 'chain').rowReach.map((v) => (v * 100).toFixed(0) + '%').join(' ')}`);
console.log(`--- win-by-start-row, CHAIN (row0=front) [descriptive] ---`);
for (const t of TRACKS) console.log(`  ${t.id.padEnd(14)} ${get(t.id, 'chain').perRowWins.map((v) => (v * 100).toFixed(0) + '%').join(' ')}`);
console.log(`\nruntime ${((Date.now() - t0) / 60000).toFixed(1)} min | CLOSING: ${allPass ? 'PASS' : 'FAIL — see gate column'}`);
writeFileSync(join(OUT, `${MODE}.json`), JSON.stringify({ mode: MODE, races: RACES, seed: SEED, results: flat }, null, 2) + '\n');
console.log(`wrote ${join(OUT, `${MODE}.json`)}`);
