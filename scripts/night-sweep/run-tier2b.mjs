// ============================================================
// scripts/night-sweep/run-tier2b.mjs — EXPANDED TIER-2 CONFIRMATION (GAP-1/2/3 + 10-track).
// Runs the malus/boost prototype UNDER the real fairness machinery (v4 ON, race-plan ON, clean
// baseline) and emits a first-class fairness column per cell (band-reach + NATIVE per-row-win χ² +
// Holm ordinal + per-row win distribution). Read-only; the four shipped modules stay untouched.
// Phases:
//   --phase=A  RUN A + B feed: comeback under v4, malus {0,gentle,strong} × density {tight,shipped}
//              on 1 open + 1 closed track (fairness column closes GAP-1 + GAP-2).
//   --phase=C  10-track confirmation: comeback (malus 0 vs strong) + front-fight with B1 heroes.
// Parallel (conc=6), checkpointed, fail-soft, resumable.
// Usage: node scripts/night-sweep/run-tier2b.mjs --phase=A --races=100 [--conc=6]
// ============================================================
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..', '..');
const SIM = join('scripts', 'sim-fairness.mjs');
const arg = (k, d) => { const m = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };
const PHASE = arg('phase', 'A');
const N = Number(arg('races', '100'));
const CONC = Number(arg('conc', '6'));
const DUR = 60, SEED = 1;

const OUT = join(__dir, 'results', 'tier2b');
mkdirSync(OUT, { recursive: true });
const TMP = join(ROOT, 'client', 'tmp', 'ns-tier2b');
mkdirSync(TMP, { recursive: true });

const DENSITY = {
  tight:   { baseSpeedMin: 0.001003, baseSpeedMax: 0.001087 },
  shipped: { baseSpeedMin: 0.00096,  baseSpeedMax: 0.00113 },
};
const ALL_TRACKS = ['dirt-oval', 'river-run', 'space-sprint', 'garden-path', 'city-circuit',
  'luger-hill', 'ice-track', 'mountainstreet', 'searound', 'seatrack'];
function defRacer(t) { const j = JSON.parse(readFileSync(join(ROOT, 'server', 'seeds', 'tracks', `${t}.json`), 'utf8')); return j.defaultRacerTypeId; }

// Clean baseline shared by every v4-ON cell (audited): governor off, pulk off, areaBonus kept (2.0).
const CLEAN = ['--race-plan=true', '--directorV4Enabled=true', '--governorDirectorEnabled=false',
  '--pulkBiasGain=0', '--bonusMult=2.0'];

const cells = [];
if (PHASE === 'A') {
  const tracks = [{ t: 'mountainstreet', open: true }, { t: 'dirt-oval', open: false }];
  for (const trk of tracks)
    for (const [dk, d] of Object.entries(DENSITY))
      for (const malus of [0, 0.06, 0.15])
        cells.push({
          id: `A__${trk.t}__${dk}__m${malus}`, track: trk.t, racer: defRacer(trk.t), kind: 'comeback',
          density: dk, malus, boost: 0,
          args: [...CLEAN, `--baseSpeedMin=${d.baseSpeedMin}`, `--baseSpeedMax=${d.baseSpeedMax}`,
            '--tier2=comeback', '--tier2ClimberB1=true', '--tier2Boost=0', `--tier2Malus=${malus}`,
            '--tier2K=4', '--tier2Release=0.4'],
        });
} else { // PHASE C — 10 tracks
  // C-comeback: malus 0 (shipped v4) vs strong, at TIGHT density (the fairness-holding density from T1).
  for (const t of ALL_TRACKS)
    for (const malus of [0, 0.15]) {
      const d = DENSITY.tight;
      cells.push({
        id: `C-cb__${t}__m${malus}`, track: t, racer: defRacer(t), kind: 'comeback', density: 'tight', malus, boost: 0,
        args: [...CLEAN, `--baseSpeedMin=${d.baseSpeedMin}`, `--baseSpeedMax=${d.baseSpeedMax}`,
          '--tier2=comeback', '--tier2ClimberB1=true', '--tier2Boost=0', `--tier2Malus=${malus}`,
          '--tier2K=4', '--tier2Release=0.4'],
      });
    }
  // C5 front-fight with REAL B1 heroes (GAP-3): arms none / boost-gentle / malus-gentle / malus-strong.
  const ffArms = [{ n: 'none', m: 0, b: 0 }, { n: 'boost08', m: 0, b: 0.08 }, { n: 'malus06', m: 0.06, b: 0 }, { n: 'malus15', m: 0.15, b: 0 }];
  for (const t of ALL_TRACKS)
    for (const a of ffArms)
      cells.push({
        id: `C-ff__${t}__${a.n}`, track: t, racer: defRacer(t), kind: 'frontfight', malus: a.m, boost: a.b,
        args: [...CLEAN, '--tier2=frontfight', '--tier2HeroesB1=true', `--tier2Malus=${a.m}`, `--tier2Boost=${a.b}`, '--tier2Start=0.35'],
      });
}

const CKPT = join(OUT, `phase${PHASE}.jsonl`);
const ERR = join(OUT, `phase${PHASE}-errors.log`);
const done = new Set();
if (existsSync(CKPT)) for (const l of readFileSync(CKPT, 'utf8').split('\n')) { if (l.trim()) try { done.add(JSON.parse(l).id); } catch { /* */ } }

function cellArgs(c) {
  return [SIM, `--track=${c.track}`, `--racer=${c.racer}`, `--dur=${DUR}`, `--races=${N}`, `--seed=${SEED}`,
    ...c.args, '--skip-main-output', `--out=client/tmp/ns-tier2b/${c.id}`];
}
function run(c) {
  return new Promise((resolve) => {
    const ch = spawn(process.execPath, cellArgs(c), { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'] });
    let se = ''; ch.stderr.on('data', (d) => (se += d));
    ch.on('error', (e) => resolve({ ok: false, err: e.message }));
    ch.on('close', (code) => {
      const p = join(TMP, c.id, 'tier2.json');
      if (code !== 0 || !existsSync(p)) return resolve({ ok: false, err: `exit ${code} ${se.slice(-200)}` });
      try { const j = JSON.parse(readFileSync(p, 'utf8')); resolve({ ok: true, j }); } catch (e) { resolve({ ok: false, err: e.message }); }
      try { rmSync(join(TMP, c.id), { recursive: true, force: true }); } catch { /* */ }
    });
  });
}
async function main() {
  const todo = cells.filter((c) => !done.has(c.id));
  console.log(`[tier2b ${PHASE}] ${todo.length} cells (skip ${done.size}) races=${N} conc=${CONC}`);
  let i = 0, fin = 0; const t0 = Date.now();
  async function worker() {
    while (i < todo.length) {
      const c = todo[i++]; const r = await run(c); fin++;
      const el = ((Date.now() - t0) / 1000).toFixed(0);
      if (!r.ok) { appendFileSync(ERR, `${c.id} :: ${r.err}\n`); appendFileSync(CKPT, JSON.stringify({ id: c.id, error: r.err.slice(0, 150), kind: c.kind }) + '\n'); console.log(`  [${fin}/${todo.length} ${el}s] ERR ${c.id}`); continue; }
      const a = r.j.agg, f = r.j.fairness || {};
      const row = { id: c.id, kind: c.kind, track: c.track, density: c.density, malus: c.malus, boost: c.boost, ...a, fairness: f };
      appendFileSync(CKPT, JSON.stringify(row) + '\n');
      const s = c.kind === 'comeback'
        ? `anchor=${a.anchorRankMean} final=${a.finalRankMean} net=${a.placesGainedMean} front=${a.reachedFrontRate} traf=${a.trafficFracMean} band=${f.bandReach} winP=${f.nativeWinChiSqP}${f.nativeWinUnfair ? '!UNFAIR' : ''} holm=${f.holmOrdinalUnfair}`
        : `leadΔ=${a.leadChangesMean} anyLC=${a.anyLeadChangeRate} bothB1=${a.bothB1Rate} band=${f.bandReach} winP=${f.nativeWinChiSqP}${f.nativeWinUnfair ? '!UNFAIR' : ''}`;
      console.log(`  [${fin}/${todo.length} ${el}s] OK ${c.id} | ${s}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONC, todo.length) }, () => worker()));
  console.log(`[tier2b ${PHASE}] done in ${((Date.now() - t0) / 1000).toFixed(0)}s → ${CKPT}`);
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
