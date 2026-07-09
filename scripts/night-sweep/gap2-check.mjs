// GAP-2 uncontaminated start-row check: PLAIN v4 (no tier2 injection), native win-χ² + per-row wins +
// Holm, across the flagged tracks × {tight, shipped} density. Read-only. conc=3 (runs beside RUN-C).
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..', '..');
const SIM = join('scripts', 'sim-fairness.mjs');
const arg = (k, d) => { const m = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };
const N = Number(arg('races', '150')), CONC = Number(arg('conc', '3'));
const OUT = join(__dir, 'results', 'tier2b'); mkdirSync(OUT, { recursive: true });
const TMP = join(ROOT, 'client', 'tmp', 'ns-gap2'); mkdirSync(TMP, { recursive: true });
const DENS = { shipped: [0.00096, 0.00113], wide: [0.00092, 0.00117] };
const TRACKS = ['dirt-oval', 'searound', 'luger-hill', 'seatrack'];
const defRacer = (t) => JSON.parse(readFileSync(join(ROOT, 'server/seeds/tracks', `${t}.json`), 'utf8')).defaultRacerTypeId;
const cells = [];
for (const t of TRACKS) for (const [dk, d] of Object.entries(DENS))
  cells.push({ id: `g2__${t}__${dk}`, t, r: defRacer(t), dk, d });
const CKPT = join(OUT, 'gap2.jsonl');
const done = new Set();
if (existsSync(CKPT)) for (const l of readFileSync(CKPT, 'utf8').split('\n')) { if (l.trim()) try { done.add(JSON.parse(l).id); } catch {} }
function args(c) {
  return [SIM, `--track=${c.t}`, `--racer=${c.r}`, '--dur=60', `--races=${N}`, '--seed=1',
    '--race-plan=true', '--directorV4Enabled=true', '--governorDirectorEnabled=false', '--pulkBiasGain=0',
    '--bonusMult=2.0', `--baseSpeedMin=${c.d[0]}`, `--baseSpeedMax=${c.d[1]}`,
    '--hero-map', '--skip-main-output', `--out=client/tmp/ns-gap2/${c.id}`];
}
function run(c) {
  return new Promise((res) => {
    const ch = spawn(process.execPath, args(c), { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'] });
    let se = ''; ch.stderr.on('data', (d) => se += d);
    ch.on('close', (code) => {
      const p = join(TMP, c.id, 'hero-map.json');
      if (code !== 0 || !existsSync(p)) return res({ ok: false, err: `exit ${code} ${se.slice(-150)}` });
      try { res({ ok: true, j: JSON.parse(readFileSync(p, 'utf8')) }); } catch (e) { res({ ok: false, err: e.message }); }
      try { rmSync(join(TMP, c.id), { recursive: true, force: true }); } catch {}
    });
  });
}
const todo = cells.filter((c) => !done.has(c.id));
console.log(`[gap2] ${todo.length} cells races=${N} conc=${CONC}`);
let i = 0, fin = 0;
async function worker() {
  while (i < todo.length) {
    const c = todo[i++]; const r = await run(c); fin++;
    if (!r.ok) { console.log(`  ERR ${c.id} ${r.err}`); appendFileSync(CKPT, JSON.stringify({ id: c.id, error: r.err }) + '\n'); continue; }
    const f = r.j.fairness;
    const row = { id: c.id, track: c.t, density: c.dk, bandReach: f.bandReach, nativeWinP: f.nativeWinChiSqP, nativeWinUnfair: f.nativeWinUnfair, holmUnfair: f.startRowUnfair, holmP: f.startRowMinPHolm, perRowWins: f.perRowWins };
    appendFileSync(CKPT, JSON.stringify(row) + '\n');
    console.log(`  [${fin}/${todo.length}] ${c.id} | band=${f.bandReach} nativeWinP=${f.nativeWinChiSqP}${f.nativeWinUnfair ? ' UNFAIR' : ''} holm=${f.startRowUnfair}`);
  }
}
await Promise.all(Array.from({ length: Math.min(CONC, todo.length) }, () => worker()));
console.log('[gap2] done → ' + CKPT);
