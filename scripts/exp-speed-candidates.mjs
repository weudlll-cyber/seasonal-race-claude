// ============================================================
// exp-speed-candidates.mjs — the SPEED-CANDIDATE measurement pack (autonomous arc, PART 1).
//
// Three arms: normalSpeedPxPerSec = 180 / 225 / 270. Nothing else varies — canonical per-track defaults
// (--track-defaults), gap-reroll at the shipped default (flagless ON), paired seeds across arms. The 4
// standard tracks at their default types + owner-standard field sizes (40 closed / 60 open), N per arm.
//
// These are the FIRST post-step-order-alignment numbers: provisional until the single re-baseline, but
// directionally honest. This pack does NOT recommend a speed — the owner's eye picks; it reports which
// candidates are SAFE to pick (band-reach holds; no metric breaks).
//
// Usage: node scripts/exp-speed-candidates.mjs [--races=50] [--jobs=4]
// ============================================================

import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, isAbsolute, relative } from 'path';
import { classifyRace, RUNAWAY_PARADE_DEFAULTS } from './sim/observers/runaway-parade.mjs';
import { summarizeEpisodes } from './sim/observers/escape-episodes.mjs';
import {
  deriveRaceDuration,
  trackDefaultLaps,
  trackDefaultSeconds,
  paceSpeedPxPerSec,
} from '../client/src/modules/durationModel.js';
import { DEFAULT_RACE_BEHAVIOR_CONFIG } from '../client/src/modules/storage/defaults.js';

const pExecFile = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const argVal = (k, d) => { const m = argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };

const RACES = Number(argVal('races', '50'));
const SEED = Number(argVal('seed', '1'));
const JOBS = Math.max(1, Number(argVal('jobs', '4')));
const OUT_ABS = (() => { const r = argVal('out', 'reports/speed-candidates'); return isAbsolute(r) ? r : join(ROOT, r); })();
const TMP_ABS = join(ROOT, 'client/tmp/exp-speed-candidates');
const toSimOut = (a) => relative(ROOT, a).replace(/\\/g, '/');

// The 4 standard sweep tracks (2 open + 2 closed), each pinned to its seeded default racer + multiplier.
const TRACK_IDS = ['luger-hill', 'mountainstreet', 'searound', 'dirt-oval'];
const TYPE_MULT = { luge: 1.1, boarder: 1.0, manta: 1.1, horse: 1.0 }; // per-track default-type M
const trackSeed = (id) => JSON.parse(readFileSync(join(ROOT, 'server/seeds/tracks', `${id}.json`), 'utf8'));
const TRACKS = TRACK_IDS.map((id) => {
  const s = trackSeed(id);
  return { id, seed: s, racer: s.defaultRacerTypeId, closed: !!s.closed, pathLengthPx: s.pathLengthPx ?? 0 };
});
const RACERS_CLOSED = 40, RACERS_OPEN = 60; // owner-standard field sizes

const ARMS = [
  { label: 'v180', normalSpeed: 180 },
  { label: 'v225', normalSpeed: 225 },
  { label: 'v270', normalSpeed: 270 },
];

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const pctl = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))]; };
const r3 = (x) => (x == null ? '' : +Number(x).toFixed(3));
const pct = (x) => (x == null ? 'n/a' : (x * 100).toFixed(1) + '%');
const fg = (line, r = 3) => { if (!line?.gaps?.length) return null; let c = 0, n = 1; for (const g of line.gaps) { c += g; if (c <= r) n++; else break; } return n; };

/** Derived realized race duration for a track at a given normal speed (canonical per-track default). */
function derivedDuration(track, normalSpeed) {
  const M = TYPE_MULT[track.racer] ?? 1.0;
  const pace = paceSpeedPxPerSec(normalSpeed, M);
  const runout = DEFAULT_RACE_BEHAVIOR_CONFIG.runoutZone;
  const laps = track.closed ? trackDefaultLaps(track.seed) : 1;
  const requestedSeconds = track.closed
    ? 0
    : trackDefaultSeconds(track.seed, track.pathLengthPx, pace, runout);
  const m = deriveRaceDuration({
    isOpen: !track.closed,
    pathLengthPx: track.pathLengthPx,
    laps,
    requestedSeconds,
    normalSpeedPxPerSec: normalSpeed,
    speedMultiplier: M,
    runoutZone: runout,
  });
  return { durSec: m.realizedDurationSec, finishT: m.finishT, paceScale: m.paceScale, slowdown: !!m.slowdownActive };
}

async function runArmTrack(arm, track, races) {
  const nRacers = track.closed ? RACERS_CLOSED : RACERS_OPEN;
  const outAbs = join(TMP_ABS, `${arm.label}-${track.id}`);
  const args = ['scripts/sim-fairness.mjs',
    `--track=${track.id}`, `--racer=${track.racer}`,
    `--seed=${SEED}`, `--races=${races}`, `--racers=${nRacers}`,
    '--track-defaults', `--normalSpeed=${arm.normalSpeed}`,
    // gap-reroll left at the shipped default (flagless ON): "nothing else varies".
    '--runaway-parade', '--hero-map', '--escape-latency', '--skip-main-output',
    `--out=${toSimOut(outAbs)}`];
  const t0 = Date.now();
  await pExecFile(process.execPath, args, { cwd: ROOT, maxBuffer: 512 * 1024 * 1024 });
  const rp = JSON.parse(readFileSync(join(outAbs, 'runaway-parade.json'), 'utf8'));
  const el = JSON.parse(readFileSync(join(outAbs, 'escape-latency.json'), 'utf8'));
  const hm = JSON.parse(readFileSync(join(outAbs, 'hero-map.json'), 'utf8'));
  const elByIdx = new Map(el.races.map((r) => [r.raceIdx, r.escapeLatency]));
  const rows = rp.races.map((rec) => {
    const raw = rec.runawayParade;
    const c = classifyRace(raw, RUNAWAY_PARADE_DEFAULTS);
    const e = elByIdx.get(rec.raceIdx) ?? {};
    return {
      arm: arm.label, track: track.id, seed: rec.seed,
      finaleLead: raw.leadChangeCount ?? 0,
      finaleDistinct: raw.lateDistinctLeaders ?? 0,
      dead: (raw.leadChangeCount ?? 0) === 0 ? 1 : 0,
      frontGroupAtLine: fg(raw.line),
      gapP1P2: raw.line?.gaps?.[0] ?? null,
      gapP2P3: raw.line?.gaps?.[1] ?? null,
      runaway: c.runawayWinner ? 1 : 0,
      parade: c.paradeFinish ? 1 : 0,
      escapeDepthLen: e.escapeDepthLen ?? null,
    };
  });
  const dd = derivedDuration(track, arm.normalSpeed);
  return {
    arm: arm.label, track, rows,
    episodes: el.races.map((r) => r.escapeLatency),
    bandReach: hm.fairness?.bandReach ?? null,
    startRowUnfair: hm.fairness?.startRowUnfair ?? null,
    startRowMinPHolm: hm.fairness?.startRowMinPHolm ?? null,
    nRacerRows: races * nRacers,
    durSec: dd.durSec, paceScale: dd.paceScale, slowdown: dd.slowdown,
    _secs: (Date.now() - t0) / 1000,
  };
}

function aggregate(runs, allRowsForThresholds) {
  const rows = runs.flatMap((r) => r.rows);
  const depths = rows.map((r) => r.escapeDepthLen).filter((x) => x != null);
  const wSum = runs.reduce((s, r) => s + (r.bandReach != null ? r.nRacerRows : 0), 0);
  const bandReachPooled = wSum ? runs.reduce((s, r) => s + (r.bandReach != null ? r.bandReach * r.nRacerRows : 0), 0) / wSum : null;
  const TIGHT = pctl(allRowsForThresholds.map((r) => r.gapP1P2).filter((x) => x != null), 25);
  const FAR = pctl(allRowsForThresholds.map((r) => r.gapP2P3).filter((x) => x != null), 75);
  const duo = rows.filter((r) => r.gapP1P2 != null && r.gapP2P3 != null && r.gapP1P2 <= TIGHT && r.gapP2P3 >= FAR).length;
  return {
    nRaces: rows.length,
    bandReachPooled,
    holmFlaggedTracks: runs.filter((r) => r.startRowUnfair === true).length,
    holmTracksTotal: runs.length,
    deadRate: mean(rows.map((r) => r.dead)),
    frontGroupAtLine: mean(rows.map((r) => r.frontGroupAtLine ?? 0)),
    finaleLead: mean(rows.map((r) => r.finaleLead)),
    finaleDistinct: mean(rows.map((r) => r.finaleDistinct)),
    runawayRate: mean(rows.map((r) => r.runaway)),
    paradeRate: mean(rows.map((r) => r.parade)),
    duoRate: rows.length ? duo / rows.length : null,
    escapeDepthMed: pctl(depths, 50), escapeDepthP90: pctl(depths, 90), escapeDepthMax: depths.length ? Math.max(...depths) : null,
    ep: summarizeEpisodes(runs.flatMap((r) => r.episodes)),
    durMean: mean(runs.map((r) => r.durSec)),
    slowdownTracks: runs.filter((r) => r.slowdown).length,
    _rawCounts: { dead: rows.filter((r) => r.dead).length, runaway: rows.filter((r) => r.runaway).length, parade: rows.filter((r) => r.parade).length, duo },
  };
}

/** Safety verdict per arm (NOT taste). Names the concern if any. Baseline = the v225 arm. */
function verdict(a, base) {
  const notes = [];
  if (a.bandReachPooled == null || a.bandReachPooled < 0.70) notes.push(`band-reach ${pct(a.bandReachPooled)} < 70%`);
  if (a.holmFlaggedTracks > 2) notes.push(`${a.holmFlaggedTracks}/4 Holm-unfair tracks`);
  if (base && a.deadRate > base.deadRate + 0.08) notes.push(`dead finales ${pct(a.deadRate)} (+${((a.deadRate - base.deadRate) * 100).toFixed(1)}pp vs v225)`);
  if (base && a.runawayRate > base.runawayRate + 0.06) notes.push(`runaway ${pct(a.runawayRate)} (+${((a.runawayRate - base.runawayRate) * 100).toFixed(1)}pp vs v225)`);
  if (a.slowdownTracks > 0) notes.push(`${a.slowdownTracks} open track(s) forced into uniform slowdown`);
  return notes.length ? { safe: false, notes } : { safe: true, notes: [] };
}

// ── run ───────────────────────────────────────────────────────────────────────────────────────
mkdirSync(OUT_ABS, { recursive: true });
console.log(`\n=== SPEED-CANDIDATE PACK — normalSpeed 180 / 225 / 270 ===`);
console.log(`tracks ${TRACK_IDS.join(', ')} | N=${RACES}/arm/track => ${RACES * TRACKS.length} races/arm | racers ${RACERS_CLOSED} closed / ${RACERS_OPEN} open | canonical per-track defaults | paired seeds`);

const jobs = [];
for (const arm of ARMS) for (const t of TRACKS) jobs.push({ arm, t });
const out = new Array(jobs.length);
let next = 0;
async function worker() {
  while (true) {
    const i = next++;
    if (i >= jobs.length) break;
    out[i] = await runArmTrack(jobs[i].arm, jobs[i].t, RACES);
    console.log(`  ${out[i].arm.padEnd(6)} ${out[i].track.id.padEnd(15)} band=${pct(out[i].bandReach)} dur=${out[i].durSec.toFixed(1)}s${out[i].slowdown ? ' (slow)' : ''} (${out[i]._secs.toFixed(0)}s)`);
  }
}
const t0 = Date.now();
await Promise.all(Array.from({ length: JOBS }, worker));
const wall = (Date.now() - t0) / 1000;

const allRows = out.flatMap((o) => o.rows);
const byArm = new Map();
for (const o of out) { if (!byArm.has(o.arm)) byArm.set(o.arm, []); byArm.get(o.arm).push(o); }
const armAgg = ARMS.map((a) => ({ arm: a.label, normalSpeed: a.normalSpeed, ...aggregate(byArm.get(a.label) ?? [], allRows) }));
const base = armAgg.find((a) => a.arm === 'v225');

console.log(`\n── POOLED (per arm) ──`);
console.log('arm    speed  band-reach  holm   dead    front@line  runaway  parade   duo    escDepthMed  escDepthP90  durMean  VERDICT');
const verdicts = {};
for (const a of armAgg) {
  const v = verdict(a, base);
  verdicts[a.arm] = v;
  console.log(`${a.arm.padEnd(6)} ${String(a.normalSpeed).padStart(5)}  ${pct(a.bandReachPooled).padStart(9)}  ${(a.holmFlaggedTracks + '/' + a.holmTracksTotal).padStart(4)}  ${pct(a.deadRate).padStart(6)} ${a.frontGroupAtLine.toFixed(2).padStart(11)} ${pct(a.runawayRate).padStart(8)} ${pct(a.paradeRate).padStart(7)} ${pct(a.duoRate).padStart(6)} ${String(r3(a.escapeDepthMed)).padStart(12)} ${String(r3(a.escapeDepthP90)).padStart(12)} ${a.durMean.toFixed(1).padStart(8)}  ${v.safe ? 'VIABLE' : 'CONCERNS: ' + v.notes.join('; ')}`);
}

console.log(`\n── PER TRACK (band-reach + derived duration) ──`);
console.log('arm    track            band-reach  holmUnfair  minPHolm  durSec   paceScale');
for (const o of out) console.log(`${o.arm.padEnd(6)} ${o.track.id.padEnd(15)}  ${pct(o.bandReach).padStart(9)}  ${String(o.startRowUnfair).padStart(9)}  ${String(r3(o.startRowMinPHolm)).padStart(7)}  ${o.durSec.toFixed(1).padStart(6)}   ${r3(o.paceScale)}`);

// ── output ──────────────────────────────────────────────────────────────────────────────────
const AC = ['arm', 'normalSpeed', 'nRaces', 'bandReachPooled', 'holmFlaggedTracks', 'deadRate', 'frontGroupAtLine', 'finaleLead', 'finaleDistinct', 'runawayRate', 'paradeRate', 'duoRate', 'escapeDepthMed', 'escapeDepthP90', 'escapeDepthMax', 'durMean', 'slowdownTracks'];
writeFileSync(join(OUT_ABS, 'speed-arms.csv'), [AC.join(','), ...armAgg.map((a) => AC.map((c) => (typeof a[c] === 'number' ? r3(a[c]) : (a[c] ?? ''))).join(','))].join('\n') + '\n');
writeFileSync(join(OUT_ABS, 'speed-arm-track.csv'), ['arm,normalSpeed,track,bandReach,startRowUnfair,startRowMinPHolm,durSec,paceScale,slowdown', ...out.map((o) => [o.arm, ARMS.find((a) => a.label === o.arm).normalSpeed, o.track.id, r3(o.bandReach), o.startRowUnfair, r3(o.startRowMinPHolm), r3(o.durSec), r3(o.paceScale), o.slowdown].join(','))].join('\n') + '\n');
writeFileSync(join(OUT_ABS, 'speed-summary.json'), JSON.stringify({
  arms: ARMS, tracks: TRACK_IDS, races: RACES, seed: SEED, racersClosed: RACERS_CLOSED, racersOpen: RACERS_OPEN,
  wallClockSec: wall, pooled: armAgg, verdicts,
  perTrack: out.map((o) => ({ arm: o.arm, track: o.track.id, bandReach: o.bandReach, startRowUnfair: o.startRowUnfair, durSec: o.durSec, paceScale: o.paceScale, slowdown: o.slowdown })),
}, null, 2));
console.log(`\nwall-clock ${(wall / 60).toFixed(1)} min | wrote ${OUT_ABS}`);
