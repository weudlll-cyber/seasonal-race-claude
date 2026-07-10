// ============================================================
// run-gapspace.mjs — NIGHT SWEEP (gap space). The first honest measurement in TIME behind
// the leader. READ-ONLY: no shipped race module is modified; the sim's gap-space observer is
// flag-gated (--gap-metrics) and byte-neutral when off. RAW distributions only — NO tuning,
// NO gates. X/Y/Z await the owner's calibration.
//
// Grid: 4 tracks (searound+dirt-oval closed · mountainstreet+luger-hill open) × 3 arms
//   A) v4-OFF   — reactive director, the SHIPPED default (directorV4Enabled=false, governor ON)
//   B) v4-ON    — shipped v4 defaults (intensity 0.6, packBandStrictness 0.5)
//   C) v4-ON    — owner's own settings (intensity 0.9, packBandStrictness 0.8)
// 12 cells, 100 races/cell, 60 s, seed=1, SHIPPED speed range (0.00096–0.00113). Stamp:
// ASSUMED-DEFAULTS (flag-driven; no --config world.json). Concurrency 6. Fail-soft per cell.
//
// Per cell we run sim-fairness.mjs with --gap-metrics (raw gap distributions →
// results/gap-metrics/gm-<label>.json) + --hero-map (band-reach + start-row Holm context →
// <out>/hero-map.json), so "fair AND dead" sits in one table. Checkpointed + resumable.
// ============================================================
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, copyFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..', '..');
const SIM = join('scripts', 'sim-fairness.mjs');
const arg = (k, d) => { const m = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };
const N = Number(arg('races', '100'));
const CONC = Number(arg('conc', '6'));
const DUR = Number(arg('dur', '60'));

const OUT = join(__dir, 'results', 'gap-space');
mkdirSync(OUT, { recursive: true });
const TMP = join(ROOT, 'client', 'tmp', 'ns2');
mkdirSync(TMP, { recursive: true });
const CKPT = join(OUT, 'status.jsonl');

// SHIPPED speed range (density) — do NOT sweep. FORCE-PARITY.md row 4 / defaults.js:29-30.
const DENS = ['0.00096', '0.00113'];
const TRACKS = [
  { t: 'searound', r: 'manta', open: false },
  { t: 'dirt-oval', r: 'horse', open: false },
  { t: 'mountainstreet', r: 'boarder', open: true },
  { t: 'luger-hill', r: 'luge', open: true },
];
// Arm flag sets. governorDirectorEnabled is structurally gated off when v4 is on
// (FORCE-PARITY.md row 17); we set it explicitly so no dormant flag rides along.
const ARMS = {
  A: ['--directorV4Enabled=false', '--governorDirectorEnabled=true'],
  B: ['--directorV4Enabled=true', '--governorDirectorEnabled=false', '--directorV4Intensity=0.6', '--directorV4PackBandStrictness=0.5'],
  C: ['--directorV4Enabled=true', '--governorDirectorEnabled=false', '--directorV4Intensity=0.9', '--directorV4PackBandStrictness=0.8'],
};

const cells = [];
for (const arm of ['A', 'B', 'C'])
  for (const tk of TRACKS)
    cells.push({ id: `ns2-${arm}-${tk.t}`, arm, ...tk, label: `ns2-${arm}-${tk.t}` });

const done = new Set();
if (existsSync(CKPT)) for (const l of readFileSync(CKPT, 'utf8').split('\n')) { if (l.trim()) try { const j = JSON.parse(l); if (j.ok) done.add(j.id); } catch {} }

function argsFor(c) {
  return [
    SIM,
    `--track=${c.t}`, `--racer=${c.r}`, `--dur=${DUR}`, `--races=${N}`, '--seed=1',
    '--race-plan=true', '--pulkBiasGain=2.0', '--bonusMult=2.0',
    ...ARMS[c.arm],
    `--baseSpeedMin=${DENS[0]}`, `--baseSpeedMax=${DENS[1]}`,
    '--gap-metrics', '--hero-map', '--skip-main-output',
    `--diagLabel=${c.label}`, `--out=client/tmp/ns2/${c.label}`,
  ];
}

const live = new Set(); // live child PIDs — must be empty at exit (zero orphans)
function run(c) {
  return new Promise((res) => {
    const ch = spawn(process.execPath, argsFor(c), { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    live.add(ch.pid);
    let out = '', err = '';
    ch.stdout.on('data', (d) => { out += d; });
    ch.stderr.on('data', (d) => { err += d; });
    ch.on('close', (code) => {
      live.delete(ch.pid);
      // Freeze the per-cell stdout tail (banner + warnings) for the report.
      try { writeFileSync(join(OUT, `log-${c.label}.txt`), out.slice(-4000) + (err ? '\n--STDERR--\n' + err.slice(-2000) : '')); } catch {}
      const hmPath = join(TMP, c.label, 'hero-map.json');
      const gmPath = join(ROOT, 'results', 'gap-metrics', `gm-${c.label}.json`);
      if (code !== 0 || !existsSync(hmPath) || !existsSync(gmPath)) {
        return res({ ok: false, err: `exit ${code}; hm=${existsSync(hmPath)} gm=${existsSync(gmPath)}; ${err.slice(-200)}` });
      }
      try {
        // Freeze both artifacts into the report bundle.
        copyFileSync(hmPath, join(OUT, `hm-${c.label}.json`));
        copyFileSync(gmPath, join(OUT, `gm-${c.label}.json`));
        const hm = JSON.parse(readFileSync(hmPath, 'utf8'));
        res({ ok: true, fairness: hm.fairness, world: hm.meta.world });
      } catch (e) { res({ ok: false, err: `parse: ${e.message}` }); }
    });
    ch.on('error', (e) => { live.delete(ch.pid); res({ ok: false, err: `spawn: ${e.message}` }); });
  });
}

const todo = cells.filter((c) => !done.has(c.id));
console.log(`[ns2-gapspace] ${todo.length}/${cells.length} cells to run | races=${N} dur=${DUR} conc=${CONC} | ${done.size} already done`);

// Zero-orphan guarantee: kill any live children on interrupt.
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => {
  for (const pid of live) { try { process.kill(pid, 'SIGKILL'); } catch {} }
  process.exit(1);
});

let i = 0, fin = 0;
const t0 = Date.now();
async function worker() {
  while (i < todo.length) {
    const c = todo[i++];
    const r = await run(c);
    fin++;
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    if (!r.ok) {
      console.log(`  [${fin}/${todo.length}] ERR ${c.id} — ${r.err}`);
      appendFileSync(CKPT, JSON.stringify({ id: c.id, ok: false, err: r.err }) + '\n');
      continue;
    }
    const f = r.fairness;
    appendFileSync(CKPT, JSON.stringify({ id: c.id, ok: true, arm: c.arm, track: c.t, open: c.open,
      bandReach: f.bandReach, startRowUnfair: f.startRowUnfair, startRowMinPHolm: f.startRowMinPHolm,
      nativeWinP: f.nativeWinChiSqP, nativeWinUnfair: f.nativeWinUnfair, world: r.world.worldHash }) + '\n');
    console.log(`  [${fin}/${todo.length}] ${c.id.padEnd(24)} band=${f.bandReach != null ? (f.bandReach * 100).toFixed(1) + '%' : 'n/a'} startRowUnfair=${f.startRowUnfair} nativeWinP=${f.nativeWinChiSqP} (${secs}s)`);
  }
}
await Promise.all(Array.from({ length: Math.min(CONC, todo.length) }, () => worker()));

// Zero-orphan assertion.
if (live.size > 0) {
  console.log(`  ⚠ ${live.size} live child(ren) still tracked — killing.`);
  for (const pid of live) { try { process.kill(pid, 'SIGKILL'); } catch {} }
}
console.log(`[ns2-gapspace] done in ${((Date.now() - t0) / 1000).toFixed(0)}s → ${OUT} (frozen gm-*/hm-*/log-*), status → ${CKPT}`);
