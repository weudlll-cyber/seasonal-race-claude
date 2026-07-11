// ============================================================
// run-pulk-baseline.mjs — PULK-WINDOW BASELINE MEASUREMENT (branch feat/pulk-reopen).
//
// MEASUREMENT-ONLY. No mechanism, no default change, no new force. Measures the field in the exact
// config the owner described — reopened PULK [0.25,0.5), areaBonus OFF in PULK, start-row bonus OFF in
// PULK (both shipped defaults = 0, confirmed at defaults.js:374/377), heroes running their curves, and
// the M1 front-contest FLAG OFF — and reads three questions over race start → PULK end:
//   Q1  are there gaps > 3 racer lengths? (how big, how often)  → max-link-gap + framesOver3LShare
//   Q2  how many DIFFERENT racers hold P1?                       → distinctP1 + most-dominant hold share
//   Q3  how wide is the whole field spread?                      → p10→p90 (trimmed) + leader→last (full)
//
// PRIMARY window [0, pulkEndLive) via --action-from-start; SECONDARY sub-window [pulkStartLive,
// pulkEndLive) via a second pass with the flag OFF. Both read the SAME extended action-metrics observer
// (same frame loop) — no duplicate loop, no new force. pulkEndLive is the LIVE plan fraction, not a
// literal. Orchestration only. Deterministic (seed=1), checkpointed, resumable.
//
// Usage: node scripts/night-sweep/run-pulk-baseline.mjs [--races=100] [--conc=6]
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
const CONC = Number(arg('conc', String(Math.max(1, Math.min(6, cpus().length - 2))))); // capped low (OneDrive I/O)
const DUR = Number(arg('dur', '60'));
const SEED = Number(arg('seed', '1'));

const OUT = join(ROOT, 'results', 'pulk-baseline');
mkdirSync(OUT, { recursive: true });
const TMP = join(ROOT, 'client', 'tmp', 'pulk-baseline');
mkdirSync(TMP, { recursive: true });
const CKPT = join(OUT, 'baseline.jsonl');

// 2 open + 2 closed (owner-confirmed set); default racer read from the track JSON (never hardcoded).
const TRACKS = ['mountainstreet', 'luger-hill', 'searound', 'dirt-oval'];
const OPEN = new Set(['mountainstreet', 'luger-hill']);
function defaultRacerFor(t) {
  const j = JSON.parse(readFileSync(join(ROOT, 'server', 'seeds', 'tracks', `${t}.json`), 'utf8'));
  return j.defaultRacerTypeId || j.defaultRacerType || null;
}
// Fixed config: v4 ON, reopened PULK 0.25/0.5, contest OFF (flag ABSENT), shipped density. areaBonusPulk
// + rowBonusPulk are the shipped defaults (0) — NOT overridden here, so they stay 0 (stated in REPORT).
const BASE = [
  '--race-plan=true', '--directorV4Enabled=true', '--governorDirectorEnabled=false',
  '--pulkStart=0.25', '--directorV4OutcomeStart=0.5', '--bonusMult=2.0',
  '--baseSpeedMin=0.00096', '--baseSpeedMax=0.00113', '--action-metrics',
];
// One cell per (track × window). window 'fromStart' = [0,pulkEnd); 'pulkOnly' = [pulkStart,pulkEnd).
const WINDOWS = [{ w: 'fromStart', flag: ['--action-from-start'] }, { w: 'pulkOnly', flag: [] }];

const median = (a) => { const v = a.filter(Number.isFinite).sort((x, y) => x - y); const n = v.length; return n ? (n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2) : null; };
const p90 = (a) => { const v = a.filter(Number.isFinite).sort((x, y) => x - y); const n = v.length; return n ? v[Math.min(n - 1, Math.ceil(0.9 * n) - 1)] : null; };
const mx = (a) => { const v = a.filter(Number.isFinite); return v.length ? Math.max(...v) : null; };
const r2 = (v) => (v == null ? null : +v.toFixed(2));
const r4 = (v) => (v == null ? null : +v.toFixed(4));

function cellArgs(c) {
  return [SIM, `--track=${c.track}`, `--racer=${c.racer}`, `--dur=${DUR}`, `--races=${N}`, `--seed=${SEED}`,
    ...BASE, ...c.flag, `--diagLabel=${c.id}`, '--skip-main-output', `--out=client/tmp/pulk-baseline/${c.id}`];
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
  const pull = (k) => races.map((r) => r[k]);
  return {
    id: c.id, track: c.track, racer: c.racer, open: c.open, window: c.w, nRaces: races.length,
    windowFromStart: races[0]?.windowFromStart ?? null, gapThresholdLen: races[0]?.gapThresholdLen ?? null,
    // Q1 gaps > 3L
    linkGapP90Med: r2(median(pull('maxLinkGapLenP90'))), linkGapMaxAcross: r2(mx(pull('maxLinkGapLenMax'))),
    framesOver3LShareMed: r4(median(pull('framesOver3LShare'))), framesOver3LShareP90: r4(p90(pull('framesOver3LShare'))),
    // Q2 distinct P1
    distinctP1Med: median(pull('distinctP1Pulk')), distinctP1P90: p90(pull('distinctP1Pulk')),
    p1MaxHoldShareMed: r4(median(pull('p1MaxHoldShare'))),
    // Q3 spread
    spreadP10P90Med: r2(median(pull('spreadLenP10P90'))),
    fullSpreadP90Med: r2(median(pull('fullSpreadLenP90'))), fullSpreadMaxAcross: r2(mx(pull('fullSpreadLenMax'))),
  };
}

const done = new Set();
if (existsSync(CKPT)) for (const l of readFileSync(CKPT, 'utf8').split('\n')) { if (l.trim()) try { done.add(JSON.parse(l).id); } catch { /* ignore */ } }

const cells = [];
for (const t of TRACKS) for (const win of WINDOWS)
  cells.push({ id: `pb-${t}-${win.w}`, track: t, racer: defaultRacerFor(t), open: OPEN.has(t), w: win.w, flag: win.flag });
const todo = cells.filter((c) => !done.has(c.id));
console.log(`[pulk-baseline] ${todo.length}/${cells.length} cells | races=${N} conc=${CONC} seed=${SEED}`);

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
    console.log(`  [${fin}/${todo.length} ${el}s] OK ${c.id.padEnd(26)} over3L=${(row.framesOver3LShareMed * 100).toFixed(0)}% distP1=${row.distinctP1Med} fullSpread=${row.fullSpreadP90Med}L`);
  }
}
await Promise.all(Array.from({ length: Math.min(CONC, todo.length) }, () => worker()));
console.log(`[pulk-baseline] done in ${((Date.now() - t0) / 1000).toFixed(0)}s → ${CKPT}`);
