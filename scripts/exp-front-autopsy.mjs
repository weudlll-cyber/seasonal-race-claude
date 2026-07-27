// ============================================================
// scripts/exp-front-autopsy.mjs — FRONT-AUTOPSY-1 runner. Observation only: runs the ONE shipped world
// (chainChoreoEnabled OFF) N=100 × 4 tracks with the read-only --front-autopsy + --runaway-parade observers,
// then classifies each finale alive/dead (standing def: leadChangeCount==0) and, per DEAD finale, assigns the
// BINDING constraint by a documented precedence. Emits: cause ranking (per track + pooled by topology),
// dead-vs-alive instrument comparison, and lock-in + coincidence analysis. No behavior change.
// Usage: node scripts/exp-front-autopsy.mjs [--races=100] [--seed=1] [--jobs=4]
// ============================================================
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_BASE_SPEED_CONFIG } from '../client/src/modules/storage/defaults.js';

const pExecFile = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const argVal = (k, d) => { const m = argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };

const NORMAL_SPEED = DEFAULT_BASE_SPEED_CONFIG.normalSpeedPxPerSec;
const RACES = Number(argVal('races', '100'));
const SEED = Number(argVal('seed', '1'));
const JOBS = Math.max(1, Number(argVal('jobs', '4')));
const TMP = join(ROOT, 'client/tmp/exp-front-autopsy');
const OUT = join(ROOT, 'reports/evolution/front-autopsy-data');
const toSimOut = (a) => relative(ROOT, a).replace(/\\/g, '/');

const TRACK_IDS = ['luger-hill', 'mountainstreet', 'searound', 'dirt-oval'];
const trackSeed = (id) => JSON.parse(readFileSync(join(ROOT, 'server/seeds/tracks', `${id}.json`), 'utf8'));
const TRACKS = TRACK_IDS.map((id) => { const s = trackSeed(id); return { id, racer: s.defaultRacerTypeId, closed: !!s.closed }; });
const RACERS_CLOSED = 40, RACERS_OPEN = 60;

// ── Binding-constraint precedence (documented) ────────────────────────────────────────────────────────
// Asked in order: was there passing FUEL? if not → DRIVE. If yes but nobody adjacent-closing → TIMING/other.
// If a closing pass existed, why did it fail — no lane (SPACE) or servo brake (OVER-STEER)? dominant wins.
const FA_CONV = 0.02;   // meanFuelSpread below this ⇒ front speeds converged (no fuel) — matches the observer
const DOM = 0.33;       // a cause must bind ≥1/3 of closing ticks to be called dominant
function classifyCause(fa) {
  if (fa.meanFuelSpread == null || fa.ticks === 0) return 'other';
  if (fa.meanFuelSpread < FA_CONV) return 'DRIVE';                    // (a) no passing fuel
  if (fa.closingTicks === 0) return 'TIMING';                          // (c) fuel exists, no front closing
  const b = fa.blockedFrac, s = fa.servoOppFrac;
  if (b >= s && b >= DOM) return 'SPACE';                              // (b) traffic denied the lane
  if (s > b && s >= DOM) return 'OVER-STEER';                          // (d) servo braked the closer
  return 'multiple/other';
}

async function runTrack(track) {
  const nRacers = track.closed ? RACERS_CLOSED : RACERS_OPEN;
  const outAbs = join(TMP, track.id);
  const args = ['scripts/sim-fairness.mjs',
    `--track=${track.id}`, `--racer=${track.racer}`,
    `--seed=${SEED}`, `--races=${RACES}`, `--racers=${nRacers}`, `--normalSpeed=${NORMAL_SPEED}`,
    '--track-defaults', '--front-autopsy', '--runaway-parade', `--out=${toSimOut(outAbs)}`];
  await pExecFile(process.execPath, args, { cwd: ROOT, maxBuffer: 512 * 1024 * 1024 });
  const fa = JSON.parse(readFileSync(join(outAbs, 'front-autopsy.json'), 'utf8')).races;
  const rp = JSON.parse(readFileSync(join(outAbs, 'runaway-parade.json'), 'utf8')).races;
  const rpByIdx = new Map(rp.map((r) => [r.raceIdx, r.runawayParade]));
  return fa.map((rec) => {
    const raw = rpByIdx.get(rec.raceIdx);
    const dead = (raw?.leadChangeCount ?? 0) === 0;
    return { track: track.id, closed: track.closed, raceIdx: rec.raceIdx, dead, ...rec.frontAutopsy };
  });
}

async function pool(tasks) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: Math.min(JOBS, tasks.length) }, async () => { while (i < tasks.length) { const k = i++; out[k] = await tasks[k](); } }));
  return out;
}

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const pctl = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))]; };
const pc = (x) => (x == null ? 'n/a' : (x * 100).toFixed(0) + '%');
const f2 = (x) => (x == null ? 'n/a' : x.toFixed(3));

mkdirSync(OUT, { recursive: true });
const t0 = Date.now();
console.log(`\n=== FRONT-AUTOPSY-1 — shipped world (chain OFF), N=${RACES}/track, ${TRACK_IDS.join(', ')} ===`);
const all = (await pool(TRACKS.map((t) => () => runTrack(t)))).flat();
for (const r of all) r.cause = r.dead ? classifyCause(r) : null;

const CAUSES = ['DRIVE', 'SPACE', 'OVER-STEER', 'TIMING', 'multiple/other'];
function ranking(rows) {
  const dead = rows.filter((r) => r.dead);
  const counts = Object.fromEntries(CAUSES.map((c) => [c, dead.filter((r) => r.cause === c).length]));
  return { nDead: dead.length, nTotal: rows.length, deadRate: rows.length ? dead.length / rows.length : 0, counts };
}
function printRanking(label, rows) {
  const r = ranking(rows);
  const parts = CAUSES.filter((c) => r.counts[c]).map((c) => `${c} ${r.counts[c]} (${pc(r.counts[c] / (r.nDead || 1))})`);
  console.log(`  ${label.padEnd(16)} dead ${r.nDead}/${r.nTotal} (${pc(r.deadRate)}) | ${parts.join(' · ') || '—'}`);
}

console.log(`\n── CAUSE RANKING (binding constraint per DEAD finale) ──`);
for (const t of TRACKS) printRanking(t.id, all.filter((r) => r.track === t.id));
console.log('  ---');
printRanking('OPEN (pooled)', all.filter((r) => !r.closed));
printRanking('CLOSED (pooled)', all.filter((r) => r.closed));
printRanking('ALL (pooled)', all);

console.log(`\n── DEAD vs ALIVE — mean of each instrument (the causal signal) ──`);
console.log(`  group  n    fuelSpread trajSpread trajAtClamp blockedFrac servoOppFrac lockIn3 lockIn5 convProg`);
for (const [label, rows] of [['DEAD', all.filter((r) => r.dead)], ['ALIVE', all.filter((r) => !r.dead)]]) {
  const m = (k) => mean(rows.map((r) => r[k]).filter((x) => x != null));
  console.log(`  ${label.padEnd(6)} ${String(rows.length).padStart(3)}  ${f2(m('meanFuelSpread')).padStart(9)} ${f2(m('meanTrajSpread')).padStart(10)} ${pc(m('fracTrajAtClamp')).padStart(11)} ${pc(m('blockedFrac')).padStart(11)} ${pc(m('servoOppFrac')).padStart(12)} ${f2(m('lockIn3')).padStart(7)} ${f2(m('lockIn5')).padStart(7)} ${f2(m('convProgress')).padStart(8)}`);
}

console.log(`\n── LOCK-IN + COINCIDENCE (dead finales) — which marker best predicts the top-3 lock ──`);
const dead = all.filter((r) => r.dead);
const lock3 = dead.map((r) => r.lockIn3).filter((x) => x != null);
console.log(`  top-3 lockIn: median ${f2(pctl(lock3, 0.5))} p25 ${f2(pctl(lock3, 0.25))} p75 ${f2(pctl(lock3, 0.75))}`);
const markerErr = (marker) => mean(dead.map((r) => (r.lockIn3 != null && r[marker] != null) ? Math.abs(r.lockIn3 - (typeof r[marker] === 'object' ? null : r[marker])) : null).filter((x) => x != null));
const convErr = mean(dead.map((r) => (r.lockIn3 != null && r.convProgress != null) ? Math.abs(r.lockIn3 - r.convProgress) : null).filter((x) => x != null));
const rollErr = mean(dead.map((r) => (r.lockIn3 != null) ? Math.abs(r.lockIn3 - r.markers.lastRoll) : null).filter((x) => x != null));
const relErr = mean(dead.map((r) => (r.lockIn3 != null) ? Math.abs(r.lockIn3 - r.markers.choreoRelease) : null).filter((x) => x != null));
console.log(`  |lockIn3 − marker| mean:  convergence ${f2(convErr)}  ·  lastRoll(0.95) ${f2(rollErr)}  ·  choreoRelease(0.97) ${f2(relErr)}  (smaller = better predictor)`);

console.log(`\nruntime ${((Date.now() - t0) / 60000).toFixed(1)} min`);
writeFileSync(join(OUT, 'autopsy.json'), JSON.stringify({ races: RACES, seed: SEED, rows: all }, null, 2) + '\n');
console.log(`wrote ${join(OUT, 'autopsy.json')}`);
