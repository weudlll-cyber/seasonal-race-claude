// ============================================================
// run-runaway-leader.mjs — POST-CHAOS RUNAWAY-LEADER MEASUREMENT (branch feat/pulk-race-director).
//
// MEASUREMENT-ONLY. No mechanism, no default change, no contest force. The owner saw races where, by
// the START of PULK, the leader's lead was already too big to catch. Measures the SHIPPED baseline
// (v4 ON, PulkRaceDirector OFF, M1 OFF, M2 OFF — all default false) at two boundary snapshots:
//   Q1  how big is the leader's lead over P2 at pulkStart? (distribution + share over thresholds)
//   Q2  in the LARGE-lead races, is that leader a HERO or a non-hero?
//   Q3  does the LARGE pulkStart lead SURVIVE to pulkEnd (still large / same racer)?
//
// Reads the sim's --runaway-leader snapshots (which ride in the --action-metrics per-race dump,
// results/action-metrics/am-<label>.json). Orchestration only. Deterministic (seed=1), checkpointed.
//
// Usage: node scripts/night-sweep/run-runaway-leader.mjs [--races=100] [--conc=6]
// ============================================================

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { cpus } from 'os';
import { RUNAWAY_LARGE_LENGTHS, RUNAWAY_LEAD_THRESHOLDS_LEN } from '../sim/observers/pulk-contest.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..', '..');
const SIM = join('scripts', 'sim-fairness.mjs');
const arg = (k, d) => { const m = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };
const N = Number(arg('races', '100'));
const CONC = Number(arg('conc', String(Math.max(1, Math.min(6, cpus().length - 2)))));
const DUR = Number(arg('dur', '60'));
const SEED = Number(arg('seed', '1'));

const OUT = join(ROOT, 'results', 'runaway-leader');
mkdirSync(OUT, { recursive: true });
const TMP = join(ROOT, 'client', 'tmp', 'runaway-leader');
mkdirSync(TMP, { recursive: true });
const CKPT = join(OUT, 'runaway.jsonl');

const TRACKS = ['mountainstreet', 'luger-hill', 'searound', 'dirt-oval'];
const OPEN = new Set(['mountainstreet', 'luger-hill']);
function defaultRacerFor(t) {
  const j = JSON.parse(readFileSync(join(ROOT, 'server', 'seeds', 'tracks', `${t}.json`), 'utf8'));
  return j.defaultRacerTypeId || j.defaultRacerType || null;
}
// v4 ON, reopened PULK 0.25/0.5, shipped density. Contest flags ABSENT → PulkRaceDirector / M1 / M2
// all default false (verified in defaults.js) → pure baseline, no contest force.
const BASE = [
  '--race-plan=true', '--directorV4Enabled=true', '--governorDirectorEnabled=false',
  '--pulkStart=0.25', '--directorV4OutcomeStart=0.5', '--bonusMult=2.0',
  '--baseSpeedMin=0.00096', '--baseSpeedMax=0.00113', '--action-metrics', '--runaway-leader',
];

const median = (a) => { const v = a.filter(Number.isFinite).sort((x, y) => x - y); const n = v.length; return n ? (n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2) : null; };
const p90 = (a) => { const v = a.filter(Number.isFinite).sort((x, y) => x - y); const n = v.length; return n ? v[Math.min(n - 1, Math.ceil(0.9 * n) - 1)] : null; };
const mx = (a) => { const v = a.filter(Number.isFinite); return v.length ? Math.max(...v) : null; };
const share = (a, pred) => (a.length ? +(a.filter(pred).length / a.length).toFixed(4) : null);
const r2 = (v) => (v == null ? null : +v.toFixed(2));

function cellArgs(c) {
  return [SIM, `--track=${c.track}`, `--racer=${c.racer}`, `--dur=${DUR}`, `--races=${N}`, `--seed=${SEED}`,
    ...BASE, `--diagLabel=${c.id}`, '--skip-main-output', `--out=client/tmp/runaway-leader/${c.id}`];
}
function runCell(c) {
  return new Promise((res) => {
    const ch = spawn(process.execPath, cellArgs(c), { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    ch.stderr.on('data', (d) => { err += d; });
    ch.on('error', (e) => res({ ok: false, err: e.message }));
    ch.on('close', (code) => {
      const am = join(ROOT, 'results', 'action-metrics', `am-${c.id}.json`);
      if (code !== 0 || !existsSync(am)) return res({ ok: false, err: `exit ${code}; am=${existsSync(am)}${err ? ' | ' + err.slice(-200) : ''}` });
      try { res({ ok: true, races: JSON.parse(readFileSync(am, 'utf8')).combos[0].races }); }
      catch (e) { res({ ok: false, err: `parse: ${e.message}` }); }
      try { rmSync(join(TMP, c.id), { recursive: true, force: true }); } catch { /* ignore */ }
    });
  });
}
function summarize(c, races) {
  // Keep only races with both boundary snapshots (field ≥ 2 at both crossings).
  const rr = races.filter((r) => r.runawayStart && r.runawayEnd);
  const startLeads = rr.map((r) => r.runawayStart.leadOverP2Len);
  const large = rr.filter((r) => r.runawayStart.leadOverP2Len > RUNAWAY_LARGE_LENGTHS); // Q2/Q3 subset
  const thresholdShares = {};
  for (const t of RUNAWAY_LEAD_THRESHOLDS_LEN) thresholdShares[`gt${t}L`] = share(startLeads, (v) => v > t);
  return {
    id: c.id, track: c.track, racer: c.racer, open: c.open, nRaces: rr.length,
    largeLen: RUNAWAY_LARGE_LENGTHS,
    // Q1 — pulkStart lead-over-P2 distribution (racer lengths) + threshold shares
    q1_leadMed: r2(median(startLeads)), q1_leadP90: r2(p90(startLeads)), q1_leadMax: r2(mx(startLeads)),
    q1_thresholdShares: thresholdShares,
    // Q2 — of LARGE-lead races, share where the leader is a HERO
    q2_nLarge: large.length,
    q2_heroShare: share(large, (r) => r.runawayStart.leaderIsHero),
    // Q3 — of LARGE-lead races: still LARGE at pulkEnd? same racer still leading?
    q3_stillLargeShare: share(large, (r) => r.runawayEnd.leadOverP2Len > RUNAWAY_LARGE_LENGTHS),
    q3_sameLeaderShare: share(large, (r) => r.runawaySameLeader === true),
    // raw large-lead rows kept for the pooled headline (hero-share across tracks)
    _largeHeroFlags: large.map((r) => (r.runawayStart.leaderIsHero ? 1 : 0)),
  };
}

const done = new Set();
if (existsSync(CKPT)) for (const l of readFileSync(CKPT, 'utf8').split('\n')) { if (l.trim()) try { done.add(JSON.parse(l).id); } catch { /* ignore */ } }
const cells = TRACKS.map((t) => ({ id: `rl-${t}`, track: t, racer: defaultRacerFor(t), open: OPEN.has(t) }));
const todo = cells.filter((c) => !done.has(c.id));
console.log(`[runaway-leader] ${todo.length}/${cells.length} cells | races=${N} conc=${CONC} seed=${SEED} | LARGE=${RUNAWAY_LARGE_LENGTHS}L`);

const live = new Set();
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { for (const p of live) try { process.kill(p, 'SIGKILL'); } catch { /* ignore */ } process.exit(1); });
let idx = 0, fin = 0; const t0 = Date.now();
async function worker() {
  while (idx < todo.length) {
    const c = todo[idx++];
    const r = await runCell(c);
    fin++;
    const el = ((Date.now() - t0) / 1000).toFixed(0);
    if (!r.ok) { appendFileSync(CKPT, JSON.stringify({ id: c.id, error: String(r.err).slice(0, 200) }) + '\n'); console.log(`  [${fin}/${todo.length} ${el}s] ERR ${c.id} — ${String(r.err).slice(0, 80)}`); continue; }
    const row = summarize(c, r.races);
    appendFileSync(CKPT, JSON.stringify(row) + '\n');
    console.log(`  [${fin}/${todo.length} ${el}s] OK ${c.id.padEnd(20)} leadMed=${row.q1_leadMed}L >${RUNAWAY_LARGE_LENGTHS}L=${((row.q1_thresholdShares[`gt${RUNAWAY_LARGE_LENGTHS}L`] ?? 0) * 100).toFixed(0)}% hero%=${row.q2_heroShare == null ? 'n/a' : (row.q2_heroShare * 100).toFixed(0)} survive%=${row.q3_stillLargeShare == null ? 'n/a' : (row.q3_stillLargeShare * 100).toFixed(0)}`);
  }
}
await Promise.all(Array.from({ length: Math.min(CONC, todo.length) }, () => worker()));
console.log(`[runaway-leader] done in ${((Date.now() - t0) / 1000).toFixed(0)}s → ${CKPT}`);
