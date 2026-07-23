// ============================================================
// exp-gate-retune.mjs — GATE for the gap-reroll retune ship (G 1.5->0.75, strength 1.0->0.5).
//
// Measure first, flip defaults second. This runs the CANDIDATE and the CURRENT defaults as flag arms
// on the unchanged engine, so the gate describes exactly the behaviour master has today.
//
// BEHAVIOURAL IDENTITY NOTE. This driver lives on the analysis branch, which carries read-only
// instrumentation (--escape-latency, the episode observer, lateDistinctLeaders) that master does not.
// That instrumentation is fingerprint-verified NOT to alter behaviour (efd0f4ad8eca08fa, unchanged),
// so the race outcomes measured here are master's race outcomes; only the observability differs.
//
// GATE (per the standing measurement protocol):
//   PRIMARY   pooled band-reach >= 70%   (overall computeZoneSuccessRate, the shipped definition)
//   SECONDARY start-row Holm flags       (count of tracks flagged unfair)
// Everything else is reported CONTEXT, not a gate: corrP1 and action metrics are explicitly not
// fairness gates in this project.
//
// STOP RULE (enforced by the caller, printed here): band-reach < 70% pooled, or the gate contradicts
// the SCREEN direction on dead finales / front-group-at-line.
//
// Usage: node scripts/exp-gate-retune.mjs [--races=100] [--jobs=4] [--durations=]
// ============================================================

import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, isAbsolute, relative } from 'path';
import { classifyRace, RUNAWAY_PARADE_DEFAULTS } from './sim/observers/runaway-parade.mjs';
import { summarizeEpisodes } from './sim/observers/escape-episodes.mjs';

const pExecFile = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const argVal = (k, d) => { const m = argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };

const RACES = Number(argVal('races', '100'));
const SEED = Number(argVal('seed', '1'));
const DUR = Number(argVal('dur', '60'));
const JOBS = Math.max(1, Number(argVal('jobs', '4')));
const DURATIONS = argVal('durations', '').split(',').map((s) => s.trim()).filter(Boolean).map(Number);
const DUR_RACES = Number(argVal('durRaces', '25'));
const OUT_ABS = (() => { const r = argVal('out', 'reports/greenfield/gate-retune'); return isAbsolute(r) ? r : join(ROOT, r); })();
const TMP_ABS = join(ROOT, 'client/tmp/exp-gate-retune');
const toSimOut = (a) => relative(ROOT, a).replace(/\\/g, '/');

// The standard sweep track set (2 open + 2 closed), each pinned to its seeded default racer.
const TRACK_IDS = ['luger-hill', 'mountainstreet', 'searound', 'dirt-oval'];
const trackSeed = (id) => JSON.parse(readFileSync(join(ROOT, 'server/seeds/tracks', `${id}.json`), 'utf8'));
const TRACKS = TRACK_IDS.map((id) => { const s = trackSeed(id); return { id, racer: s.defaultRacerTypeId, closed: !!s.closed }; });
const RACERS_CLOSED = 40, RACERS_OPEN = 60;   // owner-standard field sizes

const ARMS = [
  { label: 'CANDIDATE-G075-s050', G: '0.75', S: '0.5' },
  { label: 'CURRENT-G150-s100', G: '1.5', S: '1.0' },
];

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const pctl = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))]; };
const r3 = (x) => (x == null ? '' : +Number(x).toFixed(3));
const pct = (x) => (x == null ? 'n/a' : (x * 100).toFixed(1) + '%');
const fg = (line, r = 3) => { if (!line?.gaps?.length) return null; let c = 0, n = 1; for (const g of line.gaps) { c += g; if (c <= r) n++; else break; } return n; };

async function runArmTrack(arm, track, races, durationSec, tag) {
  const nRacers = track.closed ? RACERS_CLOSED : RACERS_OPEN;
  const outAbs = join(TMP_ABS, `${tag}-${arm.label}-${track.id}-${durationSec}`);
  const args = ['scripts/sim-fairness.mjs',
    `--track=${track.id}`, `--racer=${track.racer}`,
    `--seed=${SEED}`, `--races=${races}`, `--dur=${durationSec}`, `--racers=${nRacers}`,
    '--gapRerollEnabled=true', `--gapRerollThresholdLengths=${arm.G}`,
    `--gapRerollStrength=${arm.S}`, '--gapRerollMode=symmetric', '--carouselEnabled=false',
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
      arm: arm.label, track: track.id, dur: durationSec, seed: rec.seed,
      finaleLead: raw.leadChangeCount ?? 0,
      finaleDistinct: raw.lateDistinctLeaders ?? 0,
      dead: (raw.leadChangeCount ?? 0) === 0 ? 1 : 0,
      frontGroupAtLine: fg(raw.line),
      gapP1P2: raw.line?.gaps?.[0] ?? null,
      gapP2P3: raw.line?.gaps?.[1] ?? null,
      runaway: c.runawayWinner ? 1 : 0,
      parade: c.paradeFinish ? 1 : 0,
      escapeDepthLen: e.escapeDepthLen ?? null,
      tiltFracs: (e.events ?? []).map((x) => x.frac),
    };
  });
  return {
    arm: arm.label, track, dur: durationSec, rows,
    episodes: el.races.map((r) => r.escapeLatency),
    // Fairness block, same definitions the main report's OVERALL row uses.
    bandReach: hm.fairness?.bandReach ?? null,
    startRowUnfair: hm.fairness?.startRowUnfair ?? null,
    startRowMinPHolm: hm.fairness?.startRowMinPHolm ?? null,
    nRacerRows: races * nRacers,
    _secs: (Date.now() - t0) / 1000,
  };
}

function aggregate(runs, allRowsForThresholds) {
  const rows = runs.flatMap((r) => r.rows);
  const fracs = rows.flatMap((r) => r.tiltFracs);
  const depths = rows.map((r) => r.escapeDepthLen).filter((x) => x != null);
  // Pooled band-reach weighted by racer-rows, so a track with a bigger field counts proportionally.
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
    tiltSaturatedRate: fracs.length ? fracs.filter((f) => f >= 0.999).length / fracs.length : null,
    tiltFracMed: pctl(fracs, 50),
    nTiltEvents: fracs.length,
    escapeDepthMed: pctl(depths, 50), escapeDepthP90: pctl(depths, 90), escapeDepthMax: depths.length ? Math.max(...depths) : null,
    ep: summarizeEpisodes(runs.flatMap((r) => r.episodes)),
    _rawCounts: { dead: rows.filter((r) => r.dead).length, runaway: rows.filter((r) => r.runaway).length, parade: rows.filter((r) => r.parade).length, duo },
  };
}

mkdirSync(OUT_ABS, { recursive: true });
console.log(`\n=== GATE — gap-reroll retune (G 1.5->0.75, strength 1.0->0.5) ===`);
console.log(`arms: ${ARMS.map((a) => `${a.label}(G=${a.G},s=${a.S})`).join('  vs  ')}`);
console.log(`tracks ${TRACK_IDS.join(', ')} | N=${RACES}/arm/track => ${RACES * TRACKS.length} races/arm | racers ${RACERS_CLOSED} closed / ${RACERS_OPEN} open | dur ${DUR}s | paired seeds`);

const jobs = [];
for (const arm of ARMS) for (const t of TRACKS) jobs.push({ arm, t });
const out = new Array(jobs.length);
let next = 0;
async function worker() {
  while (true) {
    const i = next++;
    if (i >= jobs.length) break;
    out[i] = await runArmTrack(jobs[i].arm, jobs[i].t, RACES, DUR, 'gate');
    console.log(`  ${out[i].arm.padEnd(20)} ${out[i].track.id.padEnd(15)} band=${pct(out[i].bandReach)} holmUnfair=${out[i].startRowUnfair} (${out[i]._secs.toFixed(0)}s)`);
  }
}
const t0 = Date.now();
await Promise.all(Array.from({ length: JOBS }, worker));
const wall = (Date.now() - t0) / 1000;

const allRows = out.flatMap((o) => o.rows);
const byArm = new Map();
for (const o of out) { if (!byArm.has(o.arm)) byArm.set(o.arm, []); byArm.get(o.arm).push(o); }
const armAgg = ARMS.map((a) => ({ arm: a.label, G: a.G, S: a.S, ...aggregate(byArm.get(a.label) ?? [], allRows) }));

const CAND = armAgg.find((a) => a.arm === 'CANDIDATE-G075-s050');
const CUR = armAgg.find((a) => a.arm === 'CURRENT-G150-s100');

console.log(`\n── PRIMARY GATE ──`);
for (const a of armAgg) {
  console.log(`  ${a.arm.padEnd(20)} pooled band-reach = ${pct(a.bandReachPooled)}  ${a.bandReachPooled >= 0.70 ? 'PASS (>=70%)' : 'FAIL (<70%)'}   Holm-flagged tracks: ${a.holmFlaggedTracks}/${a.holmTracksTotal}`);
}
console.log(`\n── FINALE WINDOW + CONTEXT (candidate vs current) ──`);
console.log('arm                  dead    front@line  lead  distinct  runaway  parade   duo    tiltSat%  fracMed  depthMed  depthP90  unresolved');
for (const a of armAgg) {
  console.log(`${a.arm.padEnd(20)} ${pct(a.deadRate).padStart(6)} ${a.frontGroupAtLine.toFixed(2).padStart(11)} ${a.finaleLead.toFixed(2).padStart(5)} ${a.finaleDistinct.toFixed(2).padStart(9)} ${pct(a.runawayRate).padStart(8)} ${pct(a.paradeRate).padStart(7)} ${pct(a.duoRate).padStart(6)} ${pct(a.tiltSaturatedRate).padStart(9)} ${String(r3(a.tiltFracMed)).padStart(8)} ${String(r3(a.escapeDepthMed)).padStart(9)} ${String(r3(a.escapeDepthP90)).padStart(9)} ${pct(a.ep.unresolvedRate).padStart(11)}`);
}
console.log(`\nraw counts (of ${CAND.nRaces} races/arm): candidate dead=${CAND._rawCounts.dead} runaway=${CAND._rawCounts.runaway} parade=${CAND._rawCounts.parade} duo=${CAND._rawCounts.duo} | current dead=${CUR._rawCounts.dead} runaway=${CUR._rawCounts.runaway} parade=${CUR._rawCounts.parade} duo=${CUR._rawCounts.duo}`);

console.log(`\n── PER TRACK band-reach ──`);
for (const o of out) console.log(`  ${o.arm.padEnd(20)} ${o.track.id.padEnd(15)} band=${pct(o.bandReach)} holmUnfair=${o.startRowUnfair} minPHolm=${o.startRowMinPHolm}`);

// ── STOP RULE evaluation ─────────────────────────────────────────────────────────────────────
const bandOK = CAND.bandReachPooled >= 0.70;
// SCREEN direction (s=1.0 -> s=0.5 at G=0.75): dead IMPROVED (22->18%), front@line WORSENED (4.96->3.96).
const deadDelta = CAND.deadRate - CUR.deadRate;         // negative = candidate better
const frontDelta = CAND.frontGroupAtLine - CUR.frontGroupAtLine;
console.log(`\n── STOP RULE ──`);
console.log(`  band-reach >= 70%: ${bandOK ? 'PASS' : 'FAIL'} (${pct(CAND.bandReachPooled)})`);
console.log(`  dead finales  candidate ${pct(CAND.deadRate)} vs current ${pct(CUR.deadRate)}  delta ${(deadDelta * 100).toFixed(1)}pp  (screen expected candidate BETTER/lower)`);
console.log(`  front@line    candidate ${CAND.frontGroupAtLine.toFixed(2)} vs current ${CUR.frontGroupAtLine.toFixed(2)}  delta ${frontDelta.toFixed(2)}`);
console.log(`  => ${bandOK ? 'GATE PRIMARY PASSES' : 'GATE PRIMARY FAILS — DO NOT FLIP DEFAULTS'}`);

// ── CSV output ───────────────────────────────────────────────────────────────────────────────
const AC = ['arm', 'G', 'S', 'nRaces', 'bandReachPooled', 'holmFlaggedTracks', 'deadRate', 'frontGroupAtLine', 'finaleLead', 'finaleDistinct', 'runawayRate', 'paradeRate', 'duoRate', 'tiltSaturatedRate', 'tiltFracMed', 'nTiltEvents', 'escapeDepthMed', 'escapeDepthP90', 'escapeDepthMax'];
writeFileSync(join(OUT_ABS, 'gate-arms.csv'), [AC.join(','), ...armAgg.map((a) => AC.map((c) => (typeof a[c] === 'number' ? r3(a[c]) : (a[c] ?? ''))).join(','))].join('\n') + '\n');
writeFileSync(join(OUT_ABS, 'gate-arm-track.csv'), ['arm,track,dur,bandReach,startRowUnfair,startRowMinPHolm,nRacerRows', ...out.map((o) => [o.arm, o.track.id, o.dur, r3(o.bandReach), o.startRowUnfair, r3(o.startRowMinPHolm), o.nRacerRows].join(','))].join('\n') + '\n');
const RC = ['arm', 'track', 'dur', 'seed', 'finaleLead', 'finaleDistinct', 'dead', 'frontGroupAtLine', 'gapP1P2', 'gapP2P3', 'runaway', 'parade', 'escapeDepthLen'];
writeFileSync(join(OUT_ABS, 'gate-per-seed.csv'), [RC.join(','), ...allRows.map((r) => RC.map((c) => (typeof r[c] === 'number' ? r3(r[c]) : (r[c] ?? ''))).join(','))].join('\n') + '\n');

// ── Duration-scaling sanity (reduced N, not a gate) ──────────────────────────────────────────
const durRows = [];
if (DURATIONS.length) {
  console.log(`\n── DURATION-SCALING SANITY (N=${DUR_RACES}/arm/track, NOT a gate) ──`);
  const djobs = [];
  for (const d of DURATIONS) for (const arm of ARMS) for (const t of TRACKS) djobs.push({ d, arm, t });
  const dout = new Array(djobs.length);
  let dn = 0;
  async function dworker() {
    while (true) {
      const i = dn++;
      if (i >= djobs.length) break;
      dout[i] = await runArmTrack(djobs[i].arm, djobs[i].t, DUR_RACES, djobs[i].d, 'dur');
    }
  }
  await Promise.all(Array.from({ length: JOBS }, dworker));
  for (const d of DURATIONS) {
    for (const arm of ARMS) {
      const runs = dout.filter((o) => o.dur === d && o.arm === arm.label);
      const a = aggregate(runs, runs.flatMap((r) => r.rows));
      durRows.push({ dur: d, arm: arm.label, bandReachPooled: a.bandReachPooled, deadRate: a.deadRate, frontGroupAtLine: a.frontGroupAtLine, runawayRate: a.runawayRate, tiltSaturatedRate: a.tiltSaturatedRate });
      console.log(`  ${String(d).padStart(4)}s ${arm.label.padEnd(20)} band=${pct(a.bandReachPooled)} dead=${pct(a.deadRate)} front@line=${a.frontGroupAtLine.toFixed(2)} runaway=${pct(a.runawayRate)} tiltSat=${pct(a.tiltSaturatedRate)}`);
    }
  }
  writeFileSync(join(OUT_ABS, 'gate-duration-scaling.csv'), ['dur,arm,bandReachPooled,deadRate,frontGroupAtLine,runawayRate,tiltSaturatedRate', ...durRows.map((r) => [r.dur, r.arm, r3(r.bandReachPooled), r3(r.deadRate), r3(r.frontGroupAtLine), r3(r.runawayRate), r3(r.tiltSaturatedRate)].join(','))].join('\n') + '\n');
}

writeFileSync(join(OUT_ABS, 'meta.json'), JSON.stringify({ arms: ARMS, tracks: TRACK_IDS, races: RACES, dur: DUR, seed: SEED, racersClosed: RACERS_CLOSED, racersOpen: RACERS_OPEN, durations: DURATIONS, durRaces: DUR_RACES, wallClockSec: wall }, null, 2));
console.log(`\nwall-clock ${(wall / 60).toFixed(1)} min (gate) | Wrote ${OUT_ABS}`);
