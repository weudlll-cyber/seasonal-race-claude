// ============================================================
// exp-screen-g.mjs — SCREEN tier: gap-reroll G refinement for ESCAPE LATENCY.
//
// OWNER EYE FINDING (post-reset): the racing is good, but a racer often escapes to a sizeable lead
// and is then VISIBLY braked so the field can catch up. Diagnosis: gap-reroll correction LATENCY —
// between scheduled rolls the lead grows, so the correction arrives late and large. Hypothesis:
// a smaller G caps escape depth early, making each correction small and invisible.
//
// SCREEN tier: small N, two tracks, decisive pairing first, early stop when the ordering is
// unambiguous. These are SCREENING numbers — no gate claims are made at this N.
//
// Harness-side only: spawns the committed sim with arm flags. The read-only --escape-latency
// instrumentation it consumes is fingerprint-verified (efd0f4ad8eca08fa unchanged).
//
// Usage: node scripts/exp-screen-g.mjs --arms=0.50,0.75 [--races=25] [--jobs=4]
// ============================================================

import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, isAbsolute, relative } from 'path';
import { classifyRace, RUNAWAY_PARADE_DEFAULTS } from './sim/observers/runaway-parade.mjs';

const pExecFile = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const argVal = (k, d) => { const m = argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };

const G_LIST = argVal('arms', '0.50,0.75').split(',').map((s) => s.trim());
const RACES = Number(argVal('races', '25'));
const SEED = Number(argVal('seed', '1'));
const DUR = Number(argVal('dur', '60'));
const JOBS = Math.max(1, Number(argVal('jobs', '4')));
const OUT_ABS = (() => { const r = argVal('out', 'reports/greenfield/screen-g'); return isAbsolute(r) ? r : join(ROOT, r); })();
const TMP_ABS = join(ROOT, 'client/tmp/exp-screen-g');
const toSimOut = (a) => relative(ROOT, a).replace(/\\/g, '/');

// SCREEN scope: the owner's two tracks. Field sizes are the owner standard (40 closed / 60 open).
const TRACK_IDS = ['searound', 'city-circuit'];
const trackSeed = (id) => JSON.parse(readFileSync(join(ROOT, 'server/seeds/tracks', `${id}.json`), 'utf8'));
const TRACKS = TRACK_IDS.map((id) => { const s = trackSeed(id); return { id, racer: s.defaultRacerTypeId, closed: !!s.closed }; });
const RACERS_CLOSED = 40, RACERS_OPEN = 60;

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const pctl = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))]; };
const r3 = (x) => (x == null ? '' : +Number(x).toFixed(3));
const pct = (x) => (x == null ? 'n/a' : (x * 100).toFixed(1) + '%');
const fg = (line, r = 3) => { if (!line?.gaps?.length) return null; let c = 0, n = 1; for (const g of line.gaps) { c += g; if (c <= r) n++; else break; } return n; };

async function runArmTrack(G, track) {
  const outAbs = join(TMP_ABS, `G${G}-${track.id}`);
  const args = ['scripts/sim-fairness.mjs',
    `--track=${track.id}`, `--racer=${track.racer}`,
    `--seed=${SEED}`, `--races=${RACES}`, `--dur=${DUR}`,
    `--racers=${track.closed ? RACERS_CLOSED : RACERS_OPEN}`,
    '--gapRerollEnabled=true', `--gapRerollThresholdLengths=${G}`,
    '--gapRerollStrength=1.0', '--gapRerollMode=symmetric', '--carouselEnabled=false',
    '--escape-latency', '--runaway-parade', '--hero-map', '--skip-main-output',
    `--out=${toSimOut(outAbs)}`];
  const t0 = Date.now();
  await pExecFile(process.execPath, args, { cwd: ROOT, maxBuffer: 256 * 1024 * 1024 });
  const rp = JSON.parse(readFileSync(join(outAbs, 'runaway-parade.json'), 'utf8'));
  const el = JSON.parse(readFileSync(join(outAbs, 'escape-latency.json'), 'utf8'));
  let bandReach = null;
  try { bandReach = JSON.parse(readFileSync(join(outAbs, 'hero-map.json'), 'utf8')).fairness?.bandReach ?? null; } catch { /* n/a */ }
  const elByIdx = new Map(el.races.map((r) => [r.raceIdx, r.escapeLatency]));
  const rows = rp.races.map((rec) => {
    const raw = rec.runawayParade;
    const c = classifyRace(raw, RUNAWAY_PARADE_DEFAULTS);
    const e = elByIdx.get(rec.raceIdx) ?? {};
    return {
      G, track: track.id, seed: rec.seed,
      escapeDepthLen: e.escapeDepthLen ?? null,
      escapeDepthCapped: e.escapeDepthCapped ? 1 : 0,
      maxLeaderGapLen: e.maxLeaderGapLen ?? null,
      leaderDownCount: e.leaderDownCount ?? 0,
      tiltFracs: (e.events ?? []).map((x) => x.frac),
      tiltDeltas: (e.events ?? []).map((x) => x.delta),
      finaleLead: raw.leadChangeCount ?? 0,
      finaleDistinct: raw.lateDistinctLeaders ?? 0,
      dead: (raw.leadChangeCount ?? 0) === 0 ? 1 : 0,
      frontGroupAtLine: fg(raw.line),
      gapP1P2: raw.line?.gaps?.[0] ?? null,
      gapP2P3: raw.line?.gaps?.[1] ?? null,
      runaway: c.runawayWinner ? 1 : 0,
      parade: c.paradeFinish ? 1 : 0,
      bandReach,
    };
  });
  return { G, track, rows, _secs: (Date.now() - t0) / 1000 };
}

console.log(`\n=== SCREEN — gap-reroll G refinement (escape latency) ===`);
console.log(`arms G=${G_LIST.join(' / ')} | tracks ${TRACK_IDS.join(', ')} | N=${RACES} | racers 40 closed / 60 open | seeds paired`);
mkdirSync(OUT_ABS, { recursive: true });

const jobs = [];
for (const G of G_LIST) for (const t of TRACKS) jobs.push({ G, t });
const out = new Array(jobs.length);
let next = 0;
async function worker() {
  while (true) {
    const i = next++;
    if (i >= jobs.length) break;
    out[i] = await runArmTrack(jobs[i].G, jobs[i].t);
    console.log(`  G=${out[i].G} ${out[i].track.id.padEnd(14)} done (${out[i]._secs.toFixed(0)}s)`);
  }
}
const tStart = Date.now();
await Promise.all(Array.from({ length: JOBS }, worker));
const wall = (Date.now() - tStart) / 1000;

const all = out.flatMap((o) => o.rows);
// duo thresholds derived from THIS data set (same rule as the earlier finale audits)
const TIGHT = pctl(all.map((r) => r.gapP1P2).filter((x) => x != null), 25);
const FAR = pctl(all.map((r) => r.gapP2P3).filter((x) => x != null), 75);
for (const r of all) r.duoEscape = (r.gapP1P2 != null && r.gapP2P3 != null && r.gapP1P2 <= TIGHT && r.gapP2P3 >= FAR) ? 1 : 0;

function agg(rows) {
  const depths = rows.map((r) => r.escapeDepthLen).filter((x) => x != null);
  const fracs = rows.flatMap((r) => r.tiltFracs);
  const deltas = rows.flatMap((r) => r.tiltDeltas);
  return {
    n: rows.length,
    escapeDepthMed: pctl(depths, 50), escapeDepthP90: pctl(depths, 90), escapeDepthMax: depths.length ? Math.max(...depths) : null,
    cappedRate: mean(rows.map((r) => r.escapeDepthCapped)),
    leaderDownPerRace: mean(rows.map((r) => r.leaderDownCount)),
    tiltFracMed: pctl(fracs, 50), tiltFracMean: mean(fracs), tiltSaturatedRate: fracs.length ? fracs.filter((f) => f >= 0.999).length / fracs.length : null,
    tiltDeltaMed: pctl(deltas, 50), nTiltEvents: fracs.length,
    finaleLead: mean(rows.map((r) => r.finaleLead)), finaleDistinct: mean(rows.map((r) => r.finaleDistinct)),
    deadRate: mean(rows.map((r) => r.dead)), duoEscapeRate: mean(rows.map((r) => r.duoEscape)),
    frontGroupAtLine: mean(rows.map((r) => r.frontGroupAtLine ?? 0)),
    runawayRate: mean(rows.map((r) => r.runaway)), paradeRate: mean(rows.map((r) => r.parade)),
    bandReach: mean(rows.map((r) => r.bandReach).filter((x) => x != null)),
  };
}
const byG = new Map();
for (const r of all) { if (!byG.has(r.G)) byG.set(r.G, []); byG.get(r.G).push(r); }
const armAgg = G_LIST.filter((g) => byG.has(g)).map((g) => ({ G: g, ...agg(byG.get(g)) }));

// CSVs
const RCOLS = ['G', 'track', 'seed', 'escapeDepthLen', 'escapeDepthCapped', 'maxLeaderGapLen', 'leaderDownCount', 'finaleLead', 'finaleDistinct', 'dead', 'frontGroupAtLine', 'duoEscape', 'gapP1P2', 'gapP2P3', 'runaway', 'parade', 'bandReach'];
writeFileSync(join(OUT_ABS, 'screen-per-seed.csv'), [RCOLS.join(','), ...all.map((r) => RCOLS.map((c) => (typeof r[c] === 'number' ? r3(r[c]) : (r[c] ?? ''))).join(','))].join('\n') + '\n');
const ACOLS = ['G', 'n', 'escapeDepthMed', 'escapeDepthP90', 'escapeDepthMax', 'cappedRate', 'leaderDownPerRace', 'tiltFracMed', 'tiltFracMean', 'tiltSaturatedRate', 'tiltDeltaMed', 'nTiltEvents', 'finaleLead', 'finaleDistinct', 'deadRate', 'duoEscapeRate', 'frontGroupAtLine', 'runawayRate', 'paradeRate', 'bandReach'];
writeFileSync(join(OUT_ABS, 'screen-arms.csv'), [ACOLS.join(','), ...armAgg.map((a) => ACOLS.map((c) => (typeof a[c] === 'number' ? r3(a[c]) : (a[c] ?? ''))).join(','))].join('\n') + '\n');
// per arm x track
const TR = [];
for (const o of out) TR.push({ G: o.G, track: o.track.id, ...agg(o.rows) });
writeFileSync(join(OUT_ABS, 'screen-arm-track.csv'), [['G', 'track', ...ACOLS.slice(1)].join(','), ...TR.map((r) => ['G', 'track', ...ACOLS.slice(1)].map((c) => (typeof r[c] === 'number' ? r3(r[c]) : (r[c] ?? ''))).join(','))].join('\n') + '\n');

console.log(`\nESCAPE LATENCY (the owner's finding)`);
console.log('G      depth_med  depth_p90  depth_max  capped%  tilts/race  frac_med  saturated%  delta_med  nEvents');
for (const a of armAgg) console.log(`${a.G.padEnd(6)} ${String(r3(a.escapeDepthMed)).padStart(9)} ${String(r3(a.escapeDepthP90)).padStart(10)} ${String(r3(a.escapeDepthMax)).padStart(10)} ${pct(a.cappedRate).padStart(8)} ${a.leaderDownPerRace.toFixed(2).padStart(11)} ${String(r3(a.tiltFracMed)).padStart(9)} ${pct(a.tiltSaturatedRate).padStart(11)} ${String(r3(a.tiltDeltaMed)).padStart(10)} ${String(a.nTiltEvents).padStart(8)}`);
console.log(`\nSTANDING SET (screening numbers — no gate claims at N=${RACES})`);
console.log('G      lead  distinct   dead   duo    front@line  runaway  parade   band');
for (const a of armAgg) console.log(`${a.G.padEnd(6)} ${a.finaleLead.toFixed(2).padStart(4)} ${a.finaleDistinct.toFixed(2).padStart(9)} ${pct(a.deadRate).padStart(7)} ${pct(a.duoEscapeRate).padStart(6)} ${a.frontGroupAtLine.toFixed(2).padStart(11)} ${pct(a.runawayRate).padStart(8)} ${pct(a.paradeRate).padStart(7)} ${pct(a.bandReach).padStart(6)}`);
console.log(`\nper arm x track:`);
for (const r of TR) console.log(`  G=${r.G} ${r.track.padEnd(14)} depth_med=${String(r3(r.escapeDepthMed)).padStart(6)} p90=${String(r3(r.escapeDepthP90)).padStart(6)} tilts/race=${r.leaderDownPerRace.toFixed(2)} sat=${pct(r.tiltSaturatedRate)} lead=${r.finaleLead.toFixed(2)} dead=${pct(r.deadRate)} runaway=${pct(r.runawayRate)}`);
console.log(`\nwall-clock ${(wall / 60).toFixed(1)} min | duo thresholds tight<=${r3(TIGHT)} far>=${r3(FAR)}`);
writeFileSync(join(OUT_ABS, 'meta.json'), JSON.stringify({ arms: G_LIST, races: RACES, seed: SEED, dur: DUR, tracks: TRACK_IDS, racersClosed: RACERS_CLOSED, racersOpen: RACERS_OPEN, tight: TIGHT, far: FAR, wallClockSec: wall }, null, 2));
console.log(`Wrote ${OUT_ABS}`);
