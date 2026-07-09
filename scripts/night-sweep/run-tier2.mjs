// ============================================================
// scripts/night-sweep/run-tier2.mjs — NIGHT-SWEEP TIER-2 (feasibility PROTOTYPE, NOT shipped)
// Spawns sim-fairness.mjs --tier2 per cell, reads tier2.json, checkpoints one row per cell.
// Two cells: COMEBACK (what the malus-on-those-ahead buys vs boost-only) and FRONT-FIGHT (how much
// leader-brake / challenger-boost buys a clean held lead change). Small grids, parallel (conc=6),
// fail-soft, checkpointed. Results → results/tier2/. Kept strictly separate from TIER-1 (frozen).
// Usage: node scripts/night-sweep/run-tier2.mjs [--races=60] [--conc=6]
// ============================================================
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..', '..');
const SIM = join('scripts', 'sim-fairness.mjs');
const arg = (k, d) => { const m = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };
const N = Number(arg('races', '60'));
const CONC = Number(arg('conc', '6'));
const DUR = 60, SEED = 1;

const OUT = join(__dir, 'results', 'tier2');
mkdirSync(OUT, { recursive: true });
const TMP = join(ROOT, 'client', 'tmp', 'ns-tier2');
mkdirSync(TMP, { recursive: true });

// 1 open + 1 closed track, each with its default racer.
const TRACKS = [{ t: 'mountainstreet', r: 'boarder', open: true }, { t: 'dirt-oval', r: 'horse', open: false }];

const cells = [];
// COMEBACK: depth × malus (boost fixed at the fair ceiling, release late-ish). Quantifies what the
// malus buys on top of boost-only (malus=0). race-plan OFF (clean physics isolation).
for (const trk of TRACKS)
  for (const depth of [0.4, 0.6])            // mid (~40% back), deep (~60% back)
    for (const malus of [0, 0.06, 0.15]) {   // none / gentle / strong
      cells.push({
        id: `comeback__${trk.t}__d${depth}__m${malus}`, kind: 'comeback', track: trk.t, racer: trk.r,
        args: ['--race-plan=false', '--tier2=comeback', `--tier2Boost=0.10`, `--tier2Malus=${malus}`,
          `--tier2Depth=${depth}`, `--tier2Release=0.55`, `--tier2K=4`],
        meta: { depth, malus, boost: 0.10 },
      });
    }
// FRONT-FIGHT: malus-on-leader × boost-on-challenger. race-plan ON + v4 OFF (band-steering holds the
// pair front while the prototype perturbs the contest); clean baseline (governor off, pulk off).
for (const trk of TRACKS)
  for (const malus of [0, 0.06, 0.15])
    for (const boost of [0, 0.08]) {
      cells.push({
        id: `frontfight__${trk.t}__m${malus}__b${boost}`, kind: 'frontfight', track: trk.t, racer: trk.r,
        args: ['--race-plan=true', '--directorV4Enabled=false', '--governorDirectorEnabled=false',
          '--pulkBiasGain=0', '--tier2=frontfight', `--tier2Malus=${malus}`, `--tier2Boost=${boost}`,
          '--tier2Start=0.35'],
        meta: { malus, boost },
      });
    }

const CKPT = join(OUT, 'tier2.jsonl');
const ERR = join(OUT, 'tier2-errors.log');
const done = new Set();
if (existsSync(CKPT)) for (const l of readFileSync(CKPT, 'utf8').split('\n')) { if (l.trim()) try { done.add(JSON.parse(l).id); } catch { /* */ } }

function cellArgs(c) {
  return [SIM, `--track=${c.track}`, `--racer=${c.racer}`, `--dur=${DUR}`, `--races=${N}`, `--seed=${SEED}`,
    ...c.args, '--skip-main-output', `--out=client/tmp/ns-tier2/${c.id}`];
}
function run(c) {
  return new Promise((resolve) => {
    const ch = spawn(process.execPath, cellArgs(c), { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'] });
    let se = '';
    ch.stderr.on('data', (d) => (se += d));
    ch.on('error', (e) => resolve({ ok: false, err: e.message }));
    ch.on('close', (code) => {
      const p = join(TMP, c.id, 'tier2.json');
      if (code !== 0 || !existsSync(p)) return resolve({ ok: false, err: `exit ${code} ${se.slice(-200)}` });
      try { const j = JSON.parse(readFileSync(p, 'utf8')); resolve({ ok: true, j }); }
      catch (e) { resolve({ ok: false, err: e.message }); }
      try { rmSync(join(TMP, c.id), { recursive: true, force: true }); } catch { /* */ }
    });
  });
}

async function main() {
  const todo = cells.filter((c) => !done.has(c.id));
  console.log(`[tier2] ${todo.length} cells (skip ${done.size}) races=${N} conc=${CONC}`);
  let i = 0, fin = 0;
  const t0 = Date.now();
  async function worker() {
    while (i < todo.length) {
      const c = todo[i++];
      const r = await run(c);
      fin++;
      const el = ((Date.now() - t0) / 1000).toFixed(0);
      if (!r.ok) { appendFileSync(ERR, `${c.id} :: ${r.err}\n`); appendFileSync(CKPT, JSON.stringify({ id: c.id, error: r.err.slice(0, 150), kind: c.kind, ...c.meta }) + '\n'); console.log(`  [${fin}/${todo.length} ${el}s] ERR ${c.id}`); continue; }
      const row = { id: c.id, kind: c.kind, track: c.track, ...c.meta, ...r.j.agg };
      appendFileSync(CKPT, JSON.stringify(row) + '\n');
      const a = r.j.agg;
      const s = c.kind === 'comeback'
        ? `net=${a.placesGainedMean} reachFront=${a.reachedFrontRate} traf=${a.trafficFracMean}`
        : `leadΔ=${a.leadChangesMean} anyLC=${a.anyLeadChangeRate} bothB1=${a.bothB1Rate}`;
      console.log(`  [${fin}/${todo.length} ${el}s] OK ${c.id} | ${s}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONC, todo.length) }, () => worker()));
  console.log(`[tier2] done in ${((Date.now() - t0) / 1000).toFixed(0)}s → ${CKPT}`);
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
