// ============================================================
// scripts/night-sweep/run-prestage1.mjs — PRE-STAGE-1 MEASUREMENT (read-only, flag-only).
// Answers the three unmeasured causes of invisible-comeback CHURN, staged to stay short:
//   PHASE A (Q3 areaBonusScope): 3 arms × 4 tracks = 12 cells. Pick the winning arm.
//   PHASE B (Q1 packBandStrictness × Q2 heroChaosAreaBonus): on the winning arm only.
// Every cell runs the SHIPPED servo (v4 ON, race-plan ON, governor OFF, pulk OFF) with a PURE
// OBSERVER climber injection (--tier2=comeback --tier2ClimberB1, malus=0 boost=0 → NO new force):
// the question is whether the comeback appears WITHOUT any malus, from the areaBonus scope alone.
// The four shipped modules stay untouched; every flag used here is a sim-tool flag, byte-neutral off.
// Parallel (conc=6), checkpointed (resumable), fail-soft. Reads only tier2.json per cell.
//
// Usage:
//   node scripts/night-sweep/run-prestage1.mjs --phase=A [--races=100] [--conc=6]
//   node scripts/night-sweep/run-prestage1.mjs --phase=B --arm=A2 [--strict=0.5,0.25,0] [--q2=on,off]
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

const OUT = join(__dir, 'results', 'prestage1');
mkdirSync(OUT, { recursive: true });
const TMP = join(ROOT, 'client', 'tmp', 'ns-prestage1');
mkdirSync(TMP, { recursive: true });

// Shipped density (±8%) — the fairest per F6, held constant across every cell.
const DENSITY_SHIPPED = { baseSpeedMin: 0.00096, baseSpeedMax: 0.00113 };
// 4-track grid: 2 OPEN + 2 CLOSED, default racers (read from seeds, never hardcoded ids).
const TRACKS = [
  { t: 'mountainstreet', open: true },
  { t: 'luger-hill',     open: true },
  { t: 'searound',       open: false },
  { t: 'dirt-oval',      open: false },
];
function defRacer(t) { return JSON.parse(readFileSync(join(ROOT, 'server', 'seeds', 'tracks', `${t}.json`), 'utf8')).defaultRacerTypeId; }

// Clean baseline shared by every cell: v4 ON, race-plan ON, governor OFF, pulk OFF, areaBonus base 2.0,
// shipped density, release 0.97 (default). The ONLY steering forces are the shipped servo + areaBonus.
const CLEAN = ['--race-plan=true', '--directorV4Enabled=true', '--governorDirectorEnabled=false',
  '--pulkBiasGain=0', '--bonusMult=2.0',
  `--baseSpeedMin=${DENSITY_SHIPPED.baseSpeedMin}`, `--baseSpeedMax=${DENSITY_SHIPPED.baseSpeedMax}`];
// Pure OBSERVER climber (no malus, no boost): the deepest B1-target racer, released to the observer at
// 0.4, climbed by the shipped servo. K=4 (observer's "cars directly ahead" window for closing-speed).
const OBSERVER = ['--tier2=comeback', '--tier2ClimberB1=true', '--tier2Boost=0', '--tier2Malus=0',
  '--tier2K=4', '--tier2Release=0.4'];

// Q3 areaBonusScope arms — expressed purely with the existing --areaBonusEarly/Pulk/Post phase-split.
// The chaos→post boundary is pulkStartLive = 0.25 = the v4 choreo boundary (directorV4OutcomeStart).
//   A1 shipped      : NO flags → full to transEnd 0.75 then fade (byte-identical scope).
//   A2 ownerVariant : full during CHAOS (<0.25), then OFF (early=2.0=ref → scale 1; pulk/post=0).
//   A3 offEntirely  : no areaBonus at all (early/pulk/post all 0).
const ARMS = {
  A1: [],
  A2: ['--areaBonusEarly=2.0', '--areaBonusPulk=0', '--areaBonusPost=0'],
  A3: ['--areaBonusEarly=0', '--areaBonusPulk=0', '--areaBonusPost=0'],
};

const cells = [];
if (PHASE === 'A') {
  for (const [armId, armFlags] of Object.entries(ARMS))
    for (const trk of TRACKS)
      cells.push({
        id: `A__${armId}__${trk.t}`, arm: armId, track: trk.t, racer: defRacer(trk.t), open: trk.open,
        args: [...CLEAN, ...armFlags, ...OBSERVER],
      });
} else { // PHASE B — winning arm only
  const ARM = arg('arm', 'A2');
  const armFlags = ARMS[ARM] ?? [];
  const STRICTS = arg('strict', '0.5,0.25,0').split(',').map((s) => s.trim()).filter(Boolean);
  const Q2S = arg('q2', 'on,off').split(',').map((s) => s.trim()).filter(Boolean);
  for (const st of STRICTS)
    for (const q2 of Q2S)
      for (const trk of TRACKS)
        cells.push({
          id: `B__${ARM}__st${st}__q2${q2}__${trk.t}`, arm: ARM, track: trk.t, racer: defRacer(trk.t), open: trk.open,
          strict: st, q2,
          args: [...CLEAN, ...armFlags, ...OBSERVER,
            `--directorV4PackBandStrictness=${st}`, `--heroChaosAreaBonus=${q2}`],
        });
}

const CKPT = join(OUT, `phase${PHASE}.jsonl`);
const ERR = join(OUT, `phase${PHASE}-errors.log`);
const done = new Set();
if (existsSync(CKPT)) for (const l of readFileSync(CKPT, 'utf8').split('\n')) { if (l.trim()) try { done.add(JSON.parse(l).id); } catch { /* */ } }

function cellArgs(c) {
  return [SIM, `--track=${c.track}`, `--racer=${c.racer}`, `--dur=${DUR}`, `--races=${N}`, `--seed=${SEED}`,
    ...c.args, '--skip-main-output', `--out=client/tmp/ns-prestage1/${c.id}`];
}
function run(c) {
  return new Promise((resolve) => {
    const ch = spawn(process.execPath, cellArgs(c), { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'] });
    let se = ''; ch.stderr.on('data', (d) => (se += d));
    ch.on('error', (e) => resolve({ ok: false, err: e.message }));
    ch.on('close', (code) => {
      const p = join(TMP, c.id, 'tier2.json');
      if (code !== 0 || !existsSync(p)) return resolve({ ok: false, err: `exit ${code} ${se.slice(-200)}` });
      try { const j = JSON.parse(readFileSync(p, 'utf8')); resolve({ ok: true, j }); } catch (e) { return resolve({ ok: false, err: e.message }); }
      try { rmSync(join(TMP, c.id), { recursive: true, force: true }); } catch { /* */ }
    });
  });
}
async function main() {
  const todo = cells.filter((c) => !done.has(c.id));
  console.log(`[prestage1 ${PHASE}] ${todo.length} cells (skip ${done.size}) races=${N} conc=${CONC}`);
  let i = 0, fin = 0; const t0 = Date.now();
  async function worker() {
    while (i < todo.length) {
      const c = todo[i++]; const r = await run(c); fin++;
      const el = ((Date.now() - t0) / 1000).toFixed(0);
      if (!r.ok) { appendFileSync(ERR, `${c.id} :: ${r.err}\n`); appendFileSync(CKPT, JSON.stringify({ id: c.id, error: r.err.slice(0, 150) }) + '\n'); console.log(`  [${fin}/${todo.length} ${el}s] ERR ${c.id} :: ${r.err.slice(0, 120)}`); continue; }
      const a = r.j.agg, f = r.j.fairness || {};
      const row = { id: c.id, arm: c.arm, track: c.track, open: c.open, strict: c.strict ?? null, q2: c.q2 ?? null, agg: a, fairness: f };
      appendFileSync(CKPT, JSON.stringify(row) + '\n');
      const cb = a.closingSpeedByBandMean || {};
      const s = `anchor=${a.anchorRankMean} final=${a.finalRankMean} net=${a.placesGainedMean} real=${a.realOvertakesMean} reP=${a.rePassesMean} `
        + `close=${a.closingSpeedRatioMean} closeFront=${a.closingSpeedFrontMean} byBand[B1=${cb.B1} B2=${cb.B2} B3=${cb.B3} B4=${cb.B4}] `
        + `packOverHero=${a.choPackOverHeroMean} servoComp=${a.servoCompFracMean} `
        + `front=${a.reachedFrontRate} traf=${a.trafficFracMean} band=${f.bandReach} B5=${f.bandReachPerBand?.B5} winP=${f.nativeWinChiSqP}${f.nativeWinUnfair ? '!UNFAIR' : ''}`;
      console.log(`  [${fin}/${todo.length} ${el}s] OK ${c.id} | ${s}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONC, todo.length) }, () => worker()));
  console.log(`[prestage1 ${PHASE}] done in ${((Date.now() - t0) / 1000).toFixed(0)}s → ${CKPT}`);
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
