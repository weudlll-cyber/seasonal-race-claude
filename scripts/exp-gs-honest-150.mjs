// ============================================================
// File:        scripts/exp-gs-honest-150.mjs
// Project:     RaceArena
// Description: G/s OPTIMUM SWEEP on the honest, shipped 150 px/s world. Read-only measurement driver —
//              it varies ONLY the two shipped gap-reroll knobs via CLI flags on sim-fairness.mjs
//              (--gapRerollStrength = s, --gapRerollThresholdLengths = G); nothing in the shipped engine
//              changes. SCREEN tier: N=25 per arm on TWO tracks (one Holm-flagged open + one closed),
//              paired seeds across arms (the per-race seed derivation is independent of G/s, so arm i and
//              arm j race the SAME seeds). Decisive pairing FIRST: the strength axis at the shipped
//              G=0.75 (s = 0.5 shipped / 0.75 / 1.0). The G axis (G = 0.5 / 0.75 / 1.0 at the best s) runs
//              ONLY IF the strength axis leaves the question open or pooled band-reach is still short of
//              70% — an early stop, decided in-script and printed.
//
//              Metrics per arm: band-reach (the target) + the guardrails — dead finales, front@line,
//              saturated-correction rate, escape depth (med/P90), runaway. A candidate that lifts
//              band-reach by DEADENING the finale (dead-finale rate up / front@line down / runaway up) is
//              flagged, not rewarded.
//
// Usage: node scripts/exp-gs-honest-150.mjs [--races=25] [--seed=1] [--jobs=6]
//                                           [--open=luger-hill] [--closed=dirt-oval]
// ============================================================
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, isAbsolute, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyRace, RUNAWAY_PARADE_DEFAULTS } from './sim/observers/runaway-parade.mjs';
import { summarizeEpisodes } from './sim/observers/escape-episodes.mjs';
import { DEFAULT_BASE_SPEED_CONFIG } from '../client/src/modules/storage/defaults.js';

const pExecFile = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const argVal = (k, d) => { const m = argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };

const NORMAL_SPEED = DEFAULT_BASE_SPEED_CONFIG.normalSpeedPxPerSec; // shipped pick (150)
const RACES = Number(argVal('races', '25'));
const SEED = Number(argVal('seed', '1'));
const JOBS = Math.max(1, Number(argVal('jobs', '6')));
const OPEN_ID = argVal('open', 'luger-hill');
const CLOSED_ID = argVal('closed', 'dirt-oval');
const OUT_ABS = (() => { const r = argVal('out', 'reports/parity/gs-screen-data'); return isAbsolute(r) ? r : join(ROOT, r); })();
const TMP_ABS = join(ROOT, 'client/tmp/exp-gs-honest-150');
const toSimOut = (a) => relative(ROOT, a).replace(/\\/g, '/');

const trackSeed = (id) => JSON.parse(readFileSync(join(ROOT, 'server/seeds/tracks', `${id}.json`), 'utf8'));
const mkTrack = (id) => { const s = trackSeed(id); return { id, seed: s, racer: s.defaultRacerTypeId, closed: !!s.closed, pathLengthPx: s.pathLengthPx ?? 0 }; };
const TRACKS = [mkTrack(OPEN_ID), mkTrack(CLOSED_ID)];
const RACERS_CLOSED = 40, RACERS_OPEN = 60;

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const pctl = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))]; };
const r3 = (x) => (x == null ? '' : +Number(x).toFixed(3));
const pct = (x) => (x == null ? 'n/a' : (x * 100).toFixed(1) + '%');
const fg = (line, r = 3) => { if (!line?.gaps?.length) return null; let c = 0, n = 1; for (const g of line.gaps) { c += g; if (c <= r) n++; else break; } return n; };

function servoSaturatedRate(ssJson) {
  let sat = 0, tot = 0;
  for (const race of ssJson.races ?? []) {
    const samples = race.speedSource?.samples ?? {};
    for (const prog of Object.keys(samples)) for (const rec of samples[prog]) { tot++; if (rec.servoSaturated) sat++; }
  }
  return { rate: tot ? sat / tot : null, samples: tot };
}

/** Run one track under one (G,s) arm. gap-reroll ON with explicit strength + threshold flags. */
async function runTrack(track, { G, s }) {
  const nRacers = track.closed ? RACERS_CLOSED : RACERS_OPEN;
  const outAbs = join(TMP_ABS, `${track.id}__G${G}_s${s}`);
  const args = ['scripts/sim-fairness.mjs',
    `--track=${track.id}`, `--racer=${track.racer}`,
    `--seed=${SEED}`, `--races=${RACES}`, `--racers=${nRacers}`,
    `--normalSpeed=${NORMAL_SPEED}`, '--track-defaults',
    // The ONLY varied knobs — the shipped gap-reroll strength + threshold, set via CLI flags.
    '--gapRerollEnabled=true', `--gapRerollStrength=${s}`, `--gapRerollThresholdLengths=${G}`, '--gapRerollMode=symmetric',
    '--runaway-parade', '--hero-map', '--escape-latency', '--speed-source', '--skip-main-output',
    `--out=${toSimOut(outAbs)}`];
  const t0 = Date.now();
  await pExecFile(process.execPath, args, { cwd: ROOT, maxBuffer: 512 * 1024 * 1024 });
  const rp = JSON.parse(readFileSync(join(outAbs, 'runaway-parade.json'), 'utf8'));
  const el = JSON.parse(readFileSync(join(outAbs, 'escape-latency.json'), 'utf8'));
  const hm = JSON.parse(readFileSync(join(outAbs, 'hero-map.json'), 'utf8'));
  let ssRate = { rate: null, samples: 0 };
  try { ssRate = servoSaturatedRate(JSON.parse(readFileSync(join(outAbs, 'speed-source.json'), 'utf8'))); } catch { /* optional */ }
  const rows = rp.races.map((rec) => {
    const raw = rec.runawayParade;
    const c = classifyRace(raw, RUNAWAY_PARADE_DEFAULTS);
    return {
      track: track.id,
      dead: (raw.leadChangeCount ?? 0) === 0 ? 1 : 0,
      frontGroupAtLine: fg(raw.line),
      runaway: c.runawayWinner ? 1 : 0,
      escapeDepthLen: null, // filled from escape-latency below
    };
  });
  const elByIdx = new Map(el.races.map((r) => [r.raceIdx, r.escapeLatency]));
  rp.races.forEach((rec, i) => { rows[i].escapeDepthLen = (elByIdx.get(rec.raceIdx) ?? {}).escapeDepthLen ?? null; });
  return {
    track, G, s, rows,
    episodes: el.races.map((r) => r.escapeLatency),
    bandReach: hm.fairness?.bandReach ?? null,
    startRowUnfair: hm.fairness?.startRowUnfair ?? null,
    startRowMinPHolm: hm.fairness?.startRowMinPHolm ?? null,
    servoSatRate: ssRate.rate, servoSatSamples: ssRate.samples,
    nRacerRows: RACES * nRacers,
    _secs: (Date.now() - t0) / 1000,
  };
}

function aggregateArm(runs) {
  const rows = runs.flatMap((r) => r.rows);
  const depths = rows.map((r) => r.escapeDepthLen).filter((x) => x != null);
  const wSum = runs.reduce((s, r) => s + (r.bandReach != null ? r.nRacerRows : 0), 0);
  const bandReachPooled = wSum ? runs.reduce((s, r) => s + (r.bandReach != null ? r.bandReach * r.nRacerRows : 0), 0) / wSum : null;
  const satSum = runs.reduce((s, r) => s + (r.servoSatRate != null ? r.servoSatSamples : 0), 0);
  const servoSatPooled = satSum ? runs.reduce((s, r) => s + (r.servoSatRate != null ? r.servoSatRate * r.servoSatSamples : 0), 0) / satSum : null;
  return {
    bandReachPooled,
    holmFlaggedTracks: runs.filter((r) => r.startRowUnfair === true).length,
    holmTracksTotal: runs.length,
    deadRate: mean(rows.map((r) => r.dead)),
    frontGroupAtLine: mean(rows.map((r) => r.frontGroupAtLine ?? 0)),
    runawayRate: mean(rows.map((r) => r.runaway)),
    escapeDepthMed: pctl(depths, 50), escapeDepthP90: pctl(depths, 90),
    servoSatPooled,
    ep: summarizeEpisodes(runs.flatMap((r) => r.episodes)),
    perTrack: runs.map((r) => ({ id: r.track.id, closed: r.track.closed, bandReach: r.bandReach, holm: r.startRowUnfair, holmP: r.startRowMinPHolm, secs: r._secs })),
  };
}

async function pool(tasks) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: Math.min(JOBS, tasks.length) }, async () => {
    while (i < tasks.length) { const k = i++; out[k] = await tasks[k](); }
  }));
  return out;
}

/** Run one axis (a list of {G,s,label} arms). Returns [{arm, agg}]. */
async function runAxis(arms) {
  const tasks = [];
  for (const arm of arms) for (const t of TRACKS) tasks.push(() => runTrack(t, arm));
  const flat = await pool(tasks);
  return arms.map((arm) => {
    const runs = flat.filter((r) => r.G === arm.G && r.s === arm.s);
    return { arm, agg: aggregateArm(runs) };
  });
}

function printArmTable(title, results) {
  console.log(`\n${title}`);
  console.log(`arm                 bandReach  Holm  dead   front@line  runaway  escDepMed  escDepP90  servoSat`);
  for (const { arm, agg } of results) {
    console.log(`${arm.label.padEnd(18)} ${pct(agg.bandReachPooled).padStart(9)}  ${String(agg.holmFlaggedTracks + '/' + agg.holmTracksTotal).padStart(4)}  ${pct(agg.deadRate).padStart(5)} ${agg.frontGroupAtLine.toFixed(2).padStart(11)} ${pct(agg.runawayRate).padStart(8)} ${String(r3(agg.escapeDepthMed)).padStart(10)} ${String(r3(agg.escapeDepthP90)).padStart(10)} ${pct(agg.servoSatPooled).padStart(9)}`);
  }
}

// ── run ───────────────────────────────────────────────────────────────────────────────────────
mkdirSync(OUT_ABS, { recursive: true });
console.log(`\n=== G/s OPTIMUM SWEEP — honest shipped 150 px/s world ===`);
console.log(`tracks: ${OPEN_ID} (open, Holm-flagged) + ${CLOSED_ID} (closed) | N=${RACES}/arm/track | paired seeds | racers ${RACERS_CLOSED}/${RACERS_OPEN}`);
console.log(`shipped knobs: G=0.75 (gapRerollThresholdLengths), s=0.5 (gapRerollStrength)`);

// Axis A — strength at shipped G=0.75.
const STRENGTH_ARMS = [
  { G: 0.75, s: 0.5, label: 'G0.75 s0.5 (SHIP)' },
  { G: 0.75, s: 0.75, label: 'G0.75 s0.75' },
  { G: 0.75, s: 1.0, label: 'G0.75 s1.0' },
];
const strengthResults = await runAxis(STRENGTH_ARMS);
printArmTable('── AXIS A: strength at G=0.75 (paired seeds) ──', strengthResults);

const ship = strengthResults[0].agg;
const shipReach = ship.bandReachPooled ?? 0;

// A candidate "buys fairness by deadening the finale" if band-reach rose but a finale guardrail worsened
// materially vs ship (dead-finale rate up > 3pp, or front@line down > 0.15, or runaway up > 3pp).
function guardrailDamage(a) {
  const dDead = (a.deadRate - ship.deadRate);
  const dFront = (a.frontGroupAtLine - ship.frontGroupAtLine);
  const dRun = (a.runawayRate - ship.runawayRate);
  const flags = [];
  if (dDead > 0.03) flags.push(`dead +${(dDead * 100).toFixed(1)}pp`);
  if (dFront < -0.15) flags.push(`front@line ${dFront.toFixed(2)}`);
  if (dRun > 0.03) flags.push(`runaway +${(dRun * 100).toFixed(1)}pp`);
  return flags;
}

// Best strength arm = highest band-reach among arms with NO guardrail damage (ship always qualifies).
const cleanStrength = strengthResults.filter(({ arm, agg }) => arm.s === 0.5 || guardrailDamage(agg).length === 0);
const bestStrength = cleanStrength.reduce((b, x) => (x.agg.bandReachPooled > b.agg.bandReachPooled ? x : b), strengthResults[0]);
console.log(`\nshipped band-reach ${pct(shipReach)} | best clean strength arm: ${bestStrength.arm.label} @ ${pct(bestStrength.agg.bandReachPooled)}`);

// Decide whether to open the G axis. Condition (spec): the strength axis leaves the question OPEN
// (no clean arm clearly beats ship — margin < 1.5pp) OR band-reach is still short of 70%.
const beatsShip = (bestStrength.agg.bandReachPooled - shipReach) > 0.015 && bestStrength.arm.s !== 0.5;
const stillShort = (bestStrength.agg.bandReachPooled ?? 0) < 0.70;
const openGaxis = stillShort || !beatsShip;
console.log(`decision: strength axis ${beatsShip ? 'FOUND a clean winner' : 'inconclusive'}; band-reach ${stillShort ? 'STILL SHORT of 70%' : 'clears 70%'} → ${openGaxis ? 'OPEN the G axis' : 'STOP (strength axis decisive)'}`);

let gResults = null;
if (openGaxis) {
  const bestS = bestStrength.arm.s;
  const G_ARMS = [
    { G: 0.5, s: bestS, label: `G0.5 s${bestS}` },
    { G: 0.75, s: bestS, label: `G0.75 s${bestS}${bestS === 0.5 ? ' (SHIP)' : ''}` },
    { G: 1.0, s: bestS, label: `G1.0 s${bestS}` },
  ];
  gResults = await runAxis(G_ARMS);
  printArmTable(`── AXIS B: G axis at best s=${bestS} (paired seeds) ──`, gResults);
}

// ── ranked candidate table + recommendation ─────────────────────────────────────────────────────
const allArms = [
  ...strengthResults.map((r) => ({ ...r, axis: 'strength' })),
  ...(gResults ? gResults.map((r) => ({ ...r, axis: 'G' })) : []),
];
// Dedup identical (G,s) arms (the ship arm can appear on both axes); keep the first (more seeds not pooled — same seeds).
const seen = new Set();
const uniq = allArms.filter(({ arm }) => { const k = `${arm.G}_${arm.s}`; if (seen.has(k)) return false; seen.add(k); return true; });

console.log(`\n=== RANKED CANDIDATES (by pooled band-reach; guardrail damage flagged) ===`);
console.log(`arm                 bandReach  Δreach   dead   front@line  runaway  servoSat   guardrail`);
const ranked = [...uniq].sort((a, b) => (b.agg.bandReachPooled ?? 0) - (a.agg.bandReachPooled ?? 0));
for (const { arm, agg } of ranked) {
  const dmg = (arm.s === 0.5 && arm.G === 0.75) ? ['—(ship)'] : guardrailDamage(agg);
  const dR = ((agg.bandReachPooled - shipReach) * 100);
  console.log(`${arm.label.padEnd(18)} ${pct(agg.bandReachPooled).padStart(9)}  ${(dR >= 0 ? '+' : '') + dR.toFixed(1) + 'pp'}`.padEnd(42) + ` ${pct(agg.deadRate).padStart(5)} ${agg.frontGroupAtLine.toFixed(2).padStart(11)} ${pct(agg.runawayRate).padStart(8)} ${pct(agg.servoSatPooled).padStart(9)}   ${dmg.length ? dmg.join(', ') : 'clean'}`);
}

// Recommendation: the highest-band-reach arm that (a) beats ship by > 1.5pp AND (b) has no guardrail damage.
const shipArm = uniq.find(({ arm }) => arm.G === 0.75 && arm.s === 0.5);
const challengers = uniq.filter(({ arm }) => !(arm.G === 0.75 && arm.s === 0.5))
  .filter(({ agg }) => (agg.bandReachPooled - shipReach) > 0.015 && guardrailDamage(agg).length === 0)
  .sort((a, b) => b.agg.bandReachPooled - a.agg.bandReachPooled);
const winner = challengers[0] ?? null;
console.log(`\n=== RECOMMENDATION ===`);
if (winner) {
  console.log(`CHANGE → G=${winner.arm.G}, s=${winner.arm.s}: band-reach ${pct(winner.agg.bandReachPooled)} (+${((winner.agg.bandReachPooled - shipReach) * 100).toFixed(1)}pp vs ship ${pct(shipReach)}), no guardrail damage.`);
} else {
  console.log(`SHIPPED (G=0.75, s=0.5) IS OPTIMAL: no arm beats it on band-reach by >1.5pp without deadening the finale. Ship band-reach ${pct(shipReach)}.`);
}

writeFileSync(join(OUT_ABS, 'gs-screen-150.json'), JSON.stringify({
  normalSpeed: NORMAL_SPEED, races: RACES, seed: SEED, open: OPEN_ID, closed: CLOSED_ID,
  shipReach, strength: strengthResults, gAxis: gResults, ranked: ranked.map(({ arm, agg }) => ({ arm, agg })),
  recommendation: winner ? { change: true, G: winner.arm.G, s: winner.arm.s, bandReach: winner.agg.bandReachPooled } : { change: false },
}, null, 2) + '\n');
console.log(`\nwrote ${join(OUT_ABS, 'gs-screen-150.json')}`);
