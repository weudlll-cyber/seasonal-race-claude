// ============================================================
// run-pulk-race-action.mjs — PulkRaceDirector ACTION measurement (branch feat/pulk-race-director).
//
// MEASUREMENT-ONLY. No mechanism, no default change, NO sim edit — every metric already exists. Runs
// the SHIPPED baseline (director OFF) vs the PulkRaceDirector ON at three rotation caps, same tracks +
// seeds (paired), and reads the existing pulk-contest observers over the PULK window:
//   Q1  distinctP1Pulk        — how often the leader changes (distinct P1 holders in PULK)
//   Q2  runawayEnd.leadOverP2 — the leader's lead over P2 at pulkEnd (racer lengths)
//   Q3  fullSpreadLen         — whole-field spread (rank-1 → last) over PULK (racer lengths)
//   +   heldTop5Overtakes     — are the lead changes HELD, not flicker
//   +   fairness (band-reach + Holm) — shown, NOT gated, so the fairness cost of faster rotation is visible
//
// M1 (governorDirectorPulkContestEnabled) and M2 (pulkSpringEnabled) are NEVER set → default false
// (defaults.js) → the director is the ONLY governorMult writer. Orchestration only.
//
// Usage: node scripts/night-sweep/run-pulk-race-action.mjs [--races=100] [--conc=6]
// ============================================================

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { cpus } from 'os';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..', '..');
const SIM = join('scripts', 'sim-fairness.mjs');
const arg = (k, d) => { const m = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };
const N = Number(arg('races', '100'));
const CONC = Number(arg('conc', String(Math.max(1, Math.min(6, cpus().length - 2)))));
const DUR = Number(arg('dur', '60'));
const SEED = Number(arg('seed', '1'));

const OUT = join(ROOT, 'results', 'pulk-race-action');
mkdirSync(OUT, { recursive: true });
const TMP = join(ROOT, 'client', 'tmp', 'pulk-race-action');
mkdirSync(TMP, { recursive: true });
const CKPT = join(OUT, 'action.jsonl');

const TRACKS = ['mountainstreet', 'luger-hill', 'searound', 'dirt-oval'];
const OPEN = new Set(['mountainstreet', 'luger-hill']);
function defaultRacerFor(t) {
  const j = JSON.parse(readFileSync(join(ROOT, 'server', 'seeds', 'tracks', `${t}.json`), 'utf8'));
  return j.defaultRacerTypeId || j.defaultRacerType || null;
}
// v4 ON, reopened PULK 0.25/0.5, shipped density. --action-metrics (Q1/Q3/held) + --runaway-leader
// (Q2 pulkEnd snapshot, rides in the am dump) + --hero-map (fairness). NO --action-from-start → the
// action-metrics window is [pulkStart, pulkEnd), exactly the PULK window Q1/Q3 want.
const BASE = [
  '--race-plan=true', '--directorV4Enabled=true', '--governorDirectorEnabled=false',
  '--pulkStart=0.25', '--directorV4OutcomeStart=0.5', '--bonusMult=2.0',
  '--baseSpeedMin=0.00096', '--baseSpeedMax=0.00113', '--action-metrics', '--runaway-leader', '--hero-map',
];
// ARM TABLE — the ONLY home of the three rotation caps (maxLeadHoldMs). A0 = director OFF (reference).
const ARMS = [
  { arm: 'A0', flags: [] },
  { arm: 'D1', hold: 2000, flags: ['--pulkRaceDirectorEnabled=true', '--pulkRaceMaxLeadHoldMs=2000'] },
  { arm: 'D2', hold: 1200, flags: ['--pulkRaceDirectorEnabled=true', '--pulkRaceMaxLeadHoldMs=1200'] },
  { arm: 'D3', hold: 800,  flags: ['--pulkRaceDirectorEnabled=true', '--pulkRaceMaxLeadHoldMs=800'] },
];

const median = (a) => { const v = a.filter(Number.isFinite).sort((x, y) => x - y); const n = v.length; return n ? (n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2) : null; };
const p90 = (a) => { const v = a.filter(Number.isFinite).sort((x, y) => x - y); const n = v.length; return n ? v[Math.min(n - 1, Math.ceil(0.9 * n) - 1)] : null; };
const mx = (a) => { const v = a.filter(Number.isFinite); return v.length ? Math.max(...v) : null; };
const r2 = (v) => (v == null ? null : +v.toFixed(2));

function cellArgs(c) {
  return [SIM, `--track=${c.track}`, `--racer=${c.racer}`, `--dur=${DUR}`, `--races=${N}`, `--seed=${SEED}`,
    ...BASE, ...c.flags, `--diagLabel=${c.id}`, '--skip-main-output', `--out=client/tmp/pulk-race-action/${c.id}`];
}
function runCell(c) {
  return new Promise((res) => {
    const ch = spawn(process.execPath, cellArgs(c), { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    ch.stderr.on('data', (d) => { err += d; });
    ch.on('error', (e) => res({ ok: false, err: e.message }));
    ch.on('close', (code) => {
      const am = join(ROOT, 'results', 'action-metrics', `am-${c.id}.json`);
      const hm = join(TMP, c.id, 'hero-map.json');
      if (code !== 0 || !existsSync(am) || !existsSync(hm)) return res({ ok: false, err: `exit ${code}; am=${existsSync(am)} hm=${existsSync(hm)}${err ? ' | ' + err.slice(-200) : ''}` });
      try { res({ ok: true, races: JSON.parse(readFileSync(am, 'utf8')).combos[0].races, fairness: JSON.parse(readFileSync(hm, 'utf8')).fairness }); }
      catch (e) { res({ ok: false, err: `parse: ${e.message}` }); }
      try { rmSync(join(TMP, c.id), { recursive: true, force: true }); } catch { /* ignore */ }
    });
  });
}
function summarize(c, races, f) {
  const pull = (k) => races.map((r) => r[k]);
  const endLeads = races.map((r) => r.runawayEnd?.leadOverP2Len).filter(Number.isFinite);
  return {
    id: c.id, arm: c.arm, track: c.track, racer: c.racer, open: c.open, hold: c.hold ?? null, nRaces: races.length,
    // Q1 — distinct P1 holders in PULK
    q1_distinctP1Med: median(pull('distinctP1Pulk')), q1_distinctP1P90: p90(pull('distinctP1Pulk')),
    // Q2 — leader lead over P2 at pulkEnd (racer lengths)
    q2_endLeadMed: r2(median(endLeads)), q2_endLeadP90: r2(p90(endLeads)), q2_endLeadMax: r2(mx(endLeads)),
    // Q3 — whole-field spread over PULK (racer lengths); fullSpreadLenP90 is a per-race p90
    q3_fullSpreadP90Med: r2(median(pull('fullSpreadLenP90'))), q3_fullSpreadMaxAcross: r2(mx(pull('fullSpreadLenMax'))),
    // held top-5 overtakes (are lead changes HELD)
    heldTop5Med: median(pull('heldTop5Overtakes')), heldTop5P90: p90(pull('heldTop5Overtakes')),
    // fairness (shown, NOT gated)
    bandReach: f?.bandReach ?? null, startRowUnfair: f?.startRowUnfair ?? null, startRowMinPHolm: f?.startRowMinPHolm ?? null,
  };
}

const done = new Set();
if (existsSync(CKPT)) for (const l of readFileSync(CKPT, 'utf8').split('\n')) { if (l.trim()) try { done.add(JSON.parse(l).id); } catch { /* ignore */ } }
const cells = [];
for (const a of ARMS) for (const t of TRACKS)
  cells.push({ id: `pra-${a.arm}-${t}`, arm: a.arm, track: t, racer: defaultRacerFor(t), open: OPEN.has(t), hold: a.hold, flags: a.flags });
const todo = cells.filter((c) => !done.has(c.id));
console.log(`[pulk-race-action] ${todo.length}/${cells.length} cells | races=${N} conc=${CONC} seed=${SEED}`);

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
    const row = summarize(c, r.races, r.fairness);
    appendFileSync(CKPT, JSON.stringify(row) + '\n');
    console.log(`  [${fin}/${todo.length} ${el}s] OK ${c.id.padEnd(22)} distP1=${row.q1_distinctP1Med} endLead=${row.q2_endLeadMed}L held5=${row.heldTop5Med} band=${row.bandReach == null ? 'n/a' : (row.bandReach * 100).toFixed(0) + '%'} unfair=${row.startRowUnfair}`);
  }
}
await Promise.all(Array.from({ length: Math.min(CONC, todo.length) }, () => worker()));
console.log(`[pulk-race-action] done in ${((Date.now() - t0) / 1000).toFixed(0)}s → ${CKPT}`);
