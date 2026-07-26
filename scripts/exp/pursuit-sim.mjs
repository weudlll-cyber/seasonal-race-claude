// ============================================================
// pursuit-sim.mjs — HANDICAP PURSUIT standalone prototype (exp/handicap-pursuit branch).
//
// Blank-page concept (reports/evolution/SYSTEM-RESCUE-2-CC.md): the grid is staggered by ability —
// the fastest racers start furthest back — by ONE global rule so every racer's EXPECTED arrival is
// equal; after the gun NOTHING steers anyone; the field compresses by construction into a bunch finish
// decided by honest per-race pace variation. This prototype answers ONE question: can a single
// track-agnostic handicap slope deliver provably-fair-per-race wins AND a bunch finish on BOTH
// topologies (open luger-hill + closed searound)?
//
// SIM-ONLY, longitudinal-only (lateral/overlap realism is round 2 if this passes). No import from
// racePlanner/raceCore — this touches no shipped path. Deterministic from seed.
//
// Usage:
//   node scripts/exp/pursuit-sim.mjs --mode=calibrate            # sweep the global slope on calib seeds
//   node scripts/exp/pursuit-sim.mjs --mode=measure --slope=1.0  # measurement pass at the chosen slope
// ============================================================

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const argVal = (k, d) => { const m = argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };

// ── Fixed physics constants (NOT knobs — the honest-motion model; only `slope` is calibrated) ──────
const DT = 0.016; // s per step (mirrors the shipped FIXED_DT = 16 ms)
const V0 = 150; // px/s base pace (the shipped normalSpeedPxPerSec)
const BAND = 0.08; // ±8% honest pace band (mirrors the shipped spread band); pace ∈ a·[0.92,1.08]
const OU_TAU = 5.0; // s — correlation time of the honest pace drift (slow, continuous, not jitter)
const OU_STD = 0.04; // stationary std of the drift (fills ~half the band)
const CONTENTION_LEN = 3.0; // racer lengths — "in the front group" = within this of the leader

// ── The field: 5 ability classes spanning the shipped racer-speed range (snail 0.30 … rocket 1.25),
// 4 identical-ability replicas each = 20 racers. Equal class sizes ⇒ "uniform across classes" is
// unambiguous. displaySize/bodyFill are the real shipped values (for the length scale). ──────────────
const CLASSES = [
  { cls: 'snail', mult: 0.3, bodyLen: 35 * 0.938 },
  { cls: 'elephant', mult: 0.6, bodyLen: 44 * 0.938 },
  { cls: 'snake', mult: 0.75, bodyLen: 44 * 0.806 },
  { cls: 'horse', mult: 1.0, bodyLen: 47 * 0.8 },
  { cls: 'rocket', mult: 1.25, bodyLen: 47 * 0.801 },
];
const REPLICAS = 4;
const FIELD = [];
for (const c of CLASSES) for (let r = 0; r < REPLICAS; r++) FIELD.push({ cls: c.cls, mult: c.mult, bodyLen: c.bodyLen });
const N = FIELD.length;
const A_MAX = Math.max(...FIELD.map((f) => f.mult));
const MEAN_BODY_LEN = FIELD.reduce((s, f) => s + f.bodyLen, 0) / N; // px per racer length (for spreads)

export { FIELD, N, A_MAX, CLASSES, V0, DT };
// The handicap: start offset and the resulting NOISELESS expected arrival time (seconds). slope=1 makes
// this equal for every racer (the fairness proof) — exported so a test can assert the invariant directly.
export const handicapOffset = (mult, distancePx, slope) => slope * distancePx * (1 - mult / A_MAX);
export const expectedArrivalSec = (mult, distancePx, slope) =>
  (distancePx - handicapOffset(mult, distancePx, slope)) / (V0 * mult);

function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Box–Muller gaussian from a uniform PRNG.
function makeGauss(rng) {
  return () => {
    const u1 = Math.max(1e-12, rng());
    const u2 = rng();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function loadTrack(id) {
  const s = JSON.parse(readFileSync(join(ROOT, 'server/seeds/tracks', `${id}.json`), 'utf8'));
  const laps = s.closed ? (s.defaultLaps ?? 1) : 1;
  return { id, closed: !!s.closed, pathLengthPx: s.pathLengthPx, laps, distancePx: s.pathLengthPx * laps };
}

// ── One race. Honest longitudinal motion: each racer starts at its handicap offset and runs its own
// ability-derived speed with a bounded continuous OU pace drift. NOTHING is steered after the start;
// nothing reads rank. Returns the observers. ────────────────────────────────────────────────────────
function runRace(track, seed, slope) {
  const D = track.distancePx;
  const decay = Math.exp(-DT / OU_TAU);
  const noiseStd = OU_STD * Math.sqrt(1 - decay * decay);
  const rIn = new Array(N).fill(0); // OU drift state
  const gauss = new Array(N);
  const pos = new Array(N);
  const done = new Array(N).fill(false);
  const finishStep = new Array(N).fill(-1);
  for (let i = 0; i < N; i++) {
    const rng = mulberry32((seed >>> 0) * 100003 + i * 131 + 17);
    gauss[i] = makeGauss(rng);
    const a = V0 * FIELD[i].mult;
    // Handicap offset: o_i = slope · D · (1 − a_i/a_max). slope=1 ⇒ EQUAL expected arrival (proof below).
    pos[i] = slope * D * (1 - FIELD[i].mult / A_MAX);
  }
  const startPos = pos.slice();
  // Fastest-class racer physically LAST at the start (offset ~0) — the one whose pursuit we time.
  const backMarker = FIELD.findIndex((f) => f.mult === A_MAX);

  let firstFinishStep = -1;
  let firstFinishPos = null; // snapshot of all positions at the instant the winner crosses
  let prevLeader = -1;
  let leadChangesLate = 0;
  let contentionProgress = null; // leader-progress when the back-marker first reaches the front group

  const maxStep = Math.ceil((3 * D) / (V0 * A_MAX) / DT) + 10;
  let finishedCount = 0;
  for (let step = 0; step < maxStep && finishedCount < N; step++) {
    let leaderPos = -Infinity;
    for (let i = 0; i < N; i++) {
      if (done[i]) { if (pos[i] > leaderPos) leaderPos = pos[i]; continue; }
      rIn[i] = clamp(rIn[i] * decay + gauss[i]() * noiseStd, -BAND, BAND);
      pos[i] += V0 * FIELD[i].mult * (1 + rIn[i]) * DT;
      if (pos[i] >= D) { pos[i] = D; done[i] = true; finishStep[i] = step; finishedCount++; }
      if (pos[i] > leaderPos) leaderPos = pos[i];
    }
    const leaderProgress = leaderPos / D;
    // Leader identity (frontmost position, finished or not).
    let leader = -1, best = -Infinity;
    for (let i = 0; i < N; i++) if (pos[i] > best) { best = pos[i]; leader = i; }
    if (leaderProgress >= 0.8 && leaderProgress < 1.0 && prevLeader !== -1 && leader !== prevLeader) leadChangesLate++;
    prevLeader = leader;
    // Back-marker reaches the front group (within CONTENTION_LEN of the leader), first time.
    if (contentionProgress === null && leader !== backMarker) {
      const gapLen = (pos[leader] - pos[backMarker]) / MEAN_BODY_LEN;
      if (gapLen <= CONTENTION_LEN) contentionProgress = leaderProgress;
    } else if (contentionProgress === null && leader === backMarker) {
      contentionProgress = leaderProgress; // the back-marker IS the leader ⇒ fully in contention
    }
    if (firstFinishStep === -1 && finishedCount >= 1) { firstFinishStep = step; firstFinishPos = pos.slice(); }
  }

  // Rank by finish step (earlier = better); unfinished (shouldn't happen) sink to the back by position.
  const order = [...Array(N).keys()].sort((a, b) => {
    const fa = finishStep[a] === -1 ? Infinity : finishStep[a];
    const fb = finishStep[b] === -1 ? Infinity : finishStep[b];
    return fa - fb || pos[b] - pos[a];
  });
  const winner = order[0];
  // Finish spread at the line: gap (lengths) from the winner to the K-th racer at the instant of the win.
  const spreadAt = (k) => {
    const p = firstFinishPos ?? pos;
    const sorted = [...p].sort((x, y) => y - x);
    return (sorted[0] - sorted[Math.min(k - 1, N - 1)]) / MEAN_BODY_LEN;
  };
  return {
    winnerClass: FIELD[winner].cls,
    winnerIdx: winner,
    top3Spread: spreadAt(3),
    top5Spread: spreadAt(5),
    leadChangesLate,
    contentionProgress: contentionProgress ?? 1.0,
    startPos,
  };
}

// ── Aggregation over a set of seeds ────────────────────────────────────────────────────────────────
function runPass(track, seeds, slope) {
  const winByClass = Object.fromEntries(CLASSES.map((c) => [c.cls, 0]));
  const winByRacer = new Array(N).fill(0);
  let top3 = 0, top5 = 0, lc = 0, dead = 0, cont = 0;
  for (const seed of seeds) {
    const r = runRace(track, seed, slope);
    winByClass[r.winnerClass]++;
    winByRacer[r.winnerIdx]++;
    top3 += r.top3Spread; top5 += r.top5Spread; lc += r.leadChangesLate;
    if (r.leadChangesLate === 0) dead++;
    cont += r.contentionProgress;
  }
  const n = seeds.length;
  return {
    n, winByClass, winByRacer,
    top3Mean: top3 / n, top5Mean: top5 / n,
    leadChangesMean: lc / n, deadRate: dead / n, contentionMean: cont / n,
  };
}

// Uniformity of win distribution across the 5 equal-size ability classes: chi-square vs uniform, and
// the max/min class share (a blunt, readable fairness number).
function uniformity(winByClass, n) {
  const exp = n / CLASSES.length;
  const shares = CLASSES.map((c) => winByClass[c.cls] / n);
  const chi2 = CLASSES.reduce((s, c) => s + (winByClass[c.cls] - exp) ** 2 / exp, 0);
  return { chi2, maxShare: Math.max(...shares), minShare: Math.min(...shares), shares };
}

export { runRace, runPass, loadTrack };

// ── CLI (guarded so importing the helpers for tests does not run a pass) ─────────────────────────────
const RUN_CLI = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/exp/pursuit-sim.mjs');
const TRACKS = RUN_CLI ? [loadTrack('luger-hill'), loadTrack('searound')] : [];
const MODE = argVal('mode', 'measure');
const seedRange = (a, b) => Array.from({ length: b - a }, (_, i) => a + i);

if (RUN_CLI && MODE === 'calibrate') {
  // Calibrate the ONE global slope on calibration seeds (SEPARATE from the measurement seeds), pooled
  // across both tracks. Pick the slope whose pooled win distribution is most uniform (lowest chi²).
  const CALIB = seedRange(1, 101); // 100 calibration seeds per track
  const SLOPES = [0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15];
  console.log('=== CALIBRATION (seeds 1–100/track, pooled) — pick the most uniform slope ===');
  console.log('slope | pooled chi2 | class shares (snail/eleph/snake/horse/rocket) | pooled top3 spread (L)');
  let best = null;
  for (const slope of SLOPES) {
    const pooled = Object.fromEntries(CLASSES.map((c) => [c.cls, 0]));
    let t3 = 0, cnt = 0;
    for (const track of TRACKS) {
      const p = runPass(track, CALIB, slope);
      for (const c of CLASSES) pooled[c.cls] += p.winByClass[c.cls];
      t3 += p.top3Mean * p.n; cnt += p.n;
    }
    const u = uniformity(pooled, cnt);
    console.log(
      `${slope.toFixed(2)}  |  ${u.chi2.toFixed(1).padStart(6)}  |  ` +
      u.shares.map((s) => (s * 100).toFixed(0).padStart(3) + '%').join(' ') +
      `  |  ${(t3 / cnt).toFixed(2)}`
    );
    if (!best || u.chi2 < best.chi2) best = { slope, chi2: u.chi2 };
  }
  console.log(`\nCALIBRATED SLOPE = ${best.slope} (lowest pooled chi²=${best.chi2.toFixed(1)})`);
} else if (RUN_CLI) {
  const slope = Number(argVal('slope', '1.0'));
  const MEAS = seedRange(1000, 1200); // 200 measurement seeds per track (disjoint from calibration)
  console.log(`=== MEASUREMENT (seeds 1000–1199/track, slope=${slope}) ===\n`);
  const perTrack = {};
  for (const track of TRACKS) {
    const p = runPass(track, MEAS, slope);
    perTrack[track.id] = { track, p, u: uniformity(p.winByClass, p.n) };
  }
  // Pooled win-by-class.
  const pooledClass = Object.fromEntries(CLASSES.map((c) => [c.cls, 0]));
  let poolN = 0;
  for (const id in perTrack) { for (const c of CLASSES) pooledClass[c.cls] += perTrack[id].p.winByClass[c.cls]; poolN += perTrack[id].p.n; }
  const pooledU = uniformity(pooledClass, poolN);

  const row = (label, vals) => `| ${label} | ${vals.join(' | ')} |`;
  const fmtShares = (winByClass, n) => CLASSES.map((c) => `${(winByClass[c.cls] / n * 100).toFixed(1)}%`);

  console.log('WIN SHARE BY ABILITY CLASS (uniform target = 20.0% each):');
  console.log(row('class', CLASSES.map((c) => c.cls)));
  for (const id in perTrack) console.log(row(id, fmtShares(perTrack[id].p.winByClass, perTrack[id].p.n)));
  console.log(row('POOLED', fmtShares(pooledClass, poolN)));
  console.log(`pooled chi²=${pooledU.chi2.toFixed(1)}  max class share=${(pooledU.maxShare * 100).toFixed(1)}%  min=${(pooledU.minShare * 100).toFixed(1)}%\n`);

  console.log('WIN SHARE BY RACER (uniform target = 5.0% each; 20 racers, 4 per class):');
  for (const id in perTrack) {
    const wr = perTrack[id].p.winByRacer.map((w) => (w / perTrack[id].p.n * 100).toFixed(1));
    console.log(`  ${id}: min ${Math.min(...wr)}%  max ${Math.max(...wr)}%`);
  }
  console.log('');

  console.log('FINISH / ACTION OBSERVERS:');
  console.log(row('metric', TRACKS.map((t) => t.id).concat(['(shipped ref)'])));
  console.log(row('top-3 finish spread (L)', TRACKS.map((t) => perTrack[t.id].p.top3Mean.toFixed(2)).concat(['—'])));
  console.log(row('top-5 finish spread (L)', TRACKS.map((t) => perTrack[t.id].p.top5Mean.toFixed(2)).concat(['—'])));
  console.log(row('lead changes [0.8,1.0]', TRACKS.map((t) => perTrack[t.id].p.leadChangesMean.toFixed(2)).concat(['~2.2'])));
  console.log(row('dead finales (0 LC late)', TRACKS.map((t) => (perTrack[t.id].p.deadRate * 100).toFixed(1) + '%').concat(['10.0%'])));
  console.log(row('time-to-contention (prog)', TRACKS.map((t) => perTrack[t.id].p.contentionMean.toFixed(2)).concat(['—'])));

  // Machine-readable summary for the report author.
  console.log('\nJSON ' + JSON.stringify({
    slope,
    pooledChi2: pooledU.chi2, pooledShares: pooledU.shares,
    perTrack: Object.fromEntries(TRACKS.map((t) => [t.id, {
      shares: fmtShares(perTrack[t.id].p.winByClass, perTrack[t.id].p.n),
      chi2: perTrack[t.id].u.chi2,
      top3: perTrack[t.id].p.top3Mean, top5: perTrack[t.id].p.top5Mean,
      leadChanges: perTrack[t.id].p.leadChangesMean, deadRate: perTrack[t.id].p.deadRate,
      contention: perTrack[t.id].p.contentionMean,
    }])),
  }));
}
