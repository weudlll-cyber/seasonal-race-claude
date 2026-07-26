// ============================================================
// pursuit-sim-2.mjs — HANDICAP PURSUIT proto-2: LATERAL realism (branch exp/handicap-pursuit).
//
// Proto-1 (PASS) was longitudinal-only. Proto-2 adds a lane/lateral dimension and an honest traffic
// model so the concept's signature moment — fast back-markers carving UP THROUGH the field — happens
// under the hard rule "no racer ever passes through another." Everything else is inherited from
// proto-1 unchanged: the ONE global handicap slope (1.0), the OU honest pace drift, ZERO rank-reading
// steering after the gun. Passing is EARNED by open space, never by clipping.
//
// Overlap is impossible BY CONSTRUCTION: (a) a racer's forward move is capped to the min-gap behind the
// nearest in-lane leader; (b) a lane change is allowed only into a slot verified clear; (c) if neither a
// forward move nor a lane exists, the racer is HELD at its blocker's pace (a real physical delay).
// Racers are processed leaders-first so followers see updated positions; a post-step audit counts any
// residual co-location (must be 0).
//
// Usage: node scripts/exp/pursuit-sim-2.mjs [--slope=1.0]
// ============================================================

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const argVal = (k, d) => { const m = argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };

// Inherited physics constants (unchanged from proto-1).
const DT = 0.016, V0 = 150, BAND = 0.08, OU_TAU = 5.0, OU_STD = 0.04, CONTENTION_LEN = 3.0;
// New lateral constants (kept minimal — not fairness knobs).
const V_LAT = 90; // px/s max lateral (lane-change) speed — bounded, continuous, no teleport
const LANE_MARGIN = 2; // px slack when sizing lanes so bodies never touch laterally

// Field: 5 ability classes × 4 replicas = 20. bodyLong = displaySize·bodyFillY (longitudinal extent),
// bodyWide = displaySize·bodyFillX (lateral extent) — real shipped sprite fractions.
const CLASSES = [
  { cls: 'snail', mult: 0.3, long: 35 * 0.938, wide: 35 * 0.727 },
  { cls: 'elephant', mult: 0.6, long: 44 * 0.938, wide: 44 * 0.539 },
  { cls: 'snake', mult: 0.75, long: 44 * 0.806, wide: 44 * 0.374 },
  { cls: 'horse', mult: 1.0, long: 47 * 0.8, wide: 47 * 0.353 },
  { cls: 'rocket', mult: 1.25, long: 47 * 0.801, wide: 47 * 0.278 },
];
const REPLICAS = 4;
const FIELD = [];
for (const c of CLASSES) for (let r = 0; r < REPLICAS; r++) FIELD.push({ ...c });
const N = FIELD.length;
const A_MAX = Math.max(...FIELD.map((f) => f.mult));
const MAX_WIDE = Math.max(...FIELD.map((f) => f.wide));
const MEAN_LONG = FIELD.reduce((s, f) => s + f.long, 0) / N; // px per racer length (spreads)

function mulberry32(seed) {
  let s = seed >>> 0;
  return () => { s += 0x6d2b79f5; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const makeGauss = (rng) => () => { const u1 = Math.max(1e-12, rng()); const u2 = rng(); return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const longMin = (i, j) => (FIELD[i].long + FIELD[j].long) / 2; // min longitudinal centre-gap
const latMin = (i, j) => (FIELD[i].wide + FIELD[j].wide) / 2; // min lateral centre-gap

function loadTrack(id) {
  const s = JSON.parse(readFileSync(join(ROOT, 'server/seeds/tracks', `${id}.json`), 'utf8'));
  const laps = s.closed ? (s.defaultLaps ?? 1) : 1;
  return { id, closed: !!s.closed, W: s.width, distancePx: s.pathLengthPx * laps };
}

// One race with lateral traffic. Returns proto-1 observers + overlap count + traffic metrics.
function runRace(track, seed, slope) {
  const D = track.distancePx, W = track.W;
  const numLanes = Math.max(REPLICAS, Math.floor(W / (MAX_WIDE + LANE_MARGIN)));
  const laneW = W / numLanes;
  const decay = Math.exp(-DT / OU_TAU), noiseStd = OU_STD * Math.sqrt(1 - decay * decay);
  const x = new Array(N), y = new Array(N), rIn = new Array(N).fill(0), gauss = new Array(N);
  const done = new Array(N).fill(false), finishStep = new Array(N).fill(-1);
  for (let i = 0; i < N; i++) {
    gauss[i] = makeGauss(mulberry32((seed >>> 0) * 100003 + i * 131 + 17));
    x[i] = slope * D * (1 - FIELD[i].mult / A_MAX); // handicap offset (proto-1, unchanged)
    y[i] = ((i % numLanes) + 0.5) * laneW; // start lane — same-x replicas get distinct lanes ⇒ no initial overlap
  }
  const backMarker = FIELD.findIndex((f) => f.mult === A_MAX);
  let firstFinishStep = -1, firstFinishX = null, prevLeader = -1, leadChangesLate = 0, contentionProgress = null;
  let overlaps = 0, blockedSteps = 0, racerStepsMoving = 0;

  const maxStep = Math.ceil((3 * D) / (V0 * A_MAX) / DT) + 20;
  let finishedCount = 0;
  for (let step = 0; step < maxStep && finishedCount < N; step++) {
    // Process racers leaders-first (largest x) so followers react to updated leader positions.
    const order = [...Array(N).keys()].filter((i) => !done[i]).sort((a, b) => x[b] - x[a]);
    // Overlap of a proposed (px,py) for racer i with any OTHER racer's CURRENT position.
    const overlapsAny = (i, px, py) => {
      for (let j = 0; j < N; j++) {
        if (j === i || done[j]) continue;
        if (Math.abs(px - x[j]) < longMin(i, j) && Math.abs(py - y[j]) < latMin(i, j)) return true;
      }
      return false;
    };
    // Forward-cap x for racer i at lateral position py: never move within longMin of an ahead racer
    // that laterally overlaps py.
    const capForward = (i, py, wantX) => {
      let nx = wantX;
      for (let j = 0; j < N; j++) {
        if (j === i || done[j]) continue;
        if (x[j] > x[i] && Math.abs(py - y[j]) < latMin(i, j)) nx = Math.min(nx, x[j] - longMin(i, j));
      }
      return Math.max(x[i], nx);
    };
    for (const i of order) {
      rIn[i] = clamp(rIn[i] * decay + gauss[i]() * noiseStd, -BAND, BAND);
      const desired = V0 * FIELD[i].mult * (1 + rIn[i]); // honest pace (no steering)
      const wantX = x[i] + desired * DT;
      // In-lane cap at the current lane; impeded if it holds us below desired.
      const capHere = capForward(i, y[i], wantX);
      const impeded = capHere < wantX - 1e-9;
      // Lane change if impeded: steer toward an adjacent lane whose FULL target is clear-ahead.
      let ny = y[i];
      if (impeded) {
        for (const dir of [1, -1]) {
          const cand = clamp(y[i] + dir * laneW, FIELD[i].wide / 2, W - FIELD[i].wide / 2);
          if (Math.abs(cand - y[i]) < 1e-9) continue;
          // is the adjacent lane clear at the span [x_i, wantX]? (no racer within the body box there)
          let clear = true;
          for (let j = 0; j < N; j++) {
            if (j === i || done[j]) continue;
            if (x[j] >= x[i] - longMin(i, j) && Math.abs(cand - y[j]) < latMin(i, j) && x[j] - x[i] < longMin(i, j) + desired * DT) { clear = false; break; }
          }
          if (clear) { ny = y[i] + clamp(cand - y[i], -V_LAT * DT, V_LAT * DT); break; }
        }
      }
      // Tentative forward at the (possibly new) lateral position, then the BULLETPROOF safety check:
      // the committed (nx,ny) must overlap NO current position. Else cancel the lane change; else HOLD.
      let nx = capForward(i, ny, wantX);
      if (overlapsAny(i, nx, ny)) {
        ny = y[i];
        nx = capForward(i, ny, wantX);
        if (overlapsAny(i, nx, ny)) nx = x[i]; // hold — always safe (last step was overlap-free)
      }
      racerStepsMoving++;
      if (nx < wantX - 1e-9) blockedSteps++; // real physical delay (could not run at desired pace)
      x[i] = nx;
      y[i] = ny;
      if (x[i] >= D) { x[i] = D; done[i] = true; finishStep[i] = step; finishedCount++; }
    }
    // post-step overlap audit (must stay 0).
    for (let a = 0; a < N; a++) for (let b = a + 1; b < N; b++) {
      if (done[a] || done[b]) continue;
      if (Math.abs(x[a] - x[b]) < longMin(a, b) && Math.abs(y[a] - y[b]) < latMin(a, b)) overlaps++;
    }
    // leader / late lead-changes / contention (leader = frontmost, finished or not).
    let leader = -1, best = -Infinity;
    for (let i = 0; i < N; i++) if (x[i] > best) { best = x[i]; leader = i; }
    const lp = best / D;
    if (lp >= 0.8 && lp < 1.0 && prevLeader !== -1 && leader !== prevLeader) leadChangesLate++;
    prevLeader = leader;
    if (contentionProgress === null) {
      if (leader === backMarker) contentionProgress = lp;
      else if ((x[leader] - x[backMarker]) / MEAN_LONG <= CONTENTION_LEN) contentionProgress = lp;
    }
    if (firstFinishStep === -1 && finishedCount >= 1) { firstFinishStep = step; firstFinishX = x.slice(); }
  }

  const rank = [...Array(N).keys()].sort((a, b) => {
    const fa = finishStep[a] === -1 ? Infinity : finishStep[a], fb = finishStep[b] === -1 ? Infinity : finishStep[b];
    return fa - fb || x[b] - x[a];
  });
  const spreadAt = (k) => { const p = (firstFinishX ?? x).slice().sort((u, v) => v - u); return (p[0] - p[Math.min(k - 1, N - 1)]) / MEAN_LONG; };
  return {
    winnerClass: FIELD[rank[0]].cls, winnerIdx: rank[0],
    top3Spread: spreadAt(3), top5Spread: spreadAt(5),
    leadChangesLate, contentionProgress: contentionProgress ?? 1.0,
    overlaps, blockedFrac: racerStepsMoving ? blockedSteps / racerStepsMoving : 0,
  };
}

function runPass(track, seeds, slope) {
  const winByClass = Object.fromEntries(CLASSES.map((c) => [c.cls, 0]));
  let top3 = 0, top5 = 0, lc = 0, dead = 0, cont = 0, ov = 0, blk = 0;
  for (const seed of seeds) {
    const r = runRace(track, seed, slope);
    winByClass[r.winnerClass]++; top3 += r.top3Spread; top5 += r.top5Spread; lc += r.leadChangesLate;
    if (r.leadChangesLate === 0) dead++; cont += r.contentionProgress; ov += r.overlaps; blk += r.blockedFrac;
  }
  const n = seeds.length;
  return { n, winByClass, top3Mean: top3 / n, top5Mean: top5 / n, leadChangesMean: lc / n, deadRate: dead / n, contentionMean: cont / n, overlapsTotal: ov, blockedFracMean: blk / n };
}
function uniformity(winByClass, n) {
  const exp = n / CLASSES.length, shares = CLASSES.map((c) => winByClass[c.cls] / n);
  return { chi2: CLASSES.reduce((s, c) => s + (winByClass[c.cls] - exp) ** 2 / exp, 0), maxShare: Math.max(...shares), minShare: Math.min(...shares), shares };
}

export { runRace, runPass, loadTrack, FIELD, CLASSES, A_MAX };

const RUN_CLI = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/exp/pursuit-sim-2.mjs');
if (RUN_CLI) {
  const slope = Number(argVal('slope', '1.0'));
  const MEAS = Array.from({ length: 200 }, (_, i) => 1000 + i);
  const TRACKS = [loadTrack('luger-hill'), loadTrack('searound')];
  console.log(`=== PROTO-2 MEASUREMENT (lateral traffic, seeds 1000–1199/track, slope=${slope} inherited) ===\n`);
  const per = {};
  for (const t of TRACKS) per[t.id] = { p: runPass(t, MEAS, slope) };
  const pooled = Object.fromEntries(CLASSES.map((c) => [c.cls, 0])); let poolN = 0;
  for (const id in per) { for (const c of CLASSES) pooled[c.cls] += per[id].p.winByClass[c.cls]; poolN += per[id].p.n; }
  const pu = uniformity(pooled, poolN);
  const row = (l, v) => `| ${l} | ${v.join(' | ')} |`;
  const shares = (wbc, n) => CLASSES.map((c) => (wbc[c.cls] / n * 100).toFixed(1) + '%');
  console.log('WIN SHARE BY ABILITY CLASS (uniform target 20.0%):');
  console.log(row('class', CLASSES.map((c) => c.cls)));
  for (const id in per) console.log(row(id, shares(per[id].p.winByClass, per[id].p.n)));
  console.log(row('POOLED', shares(pooled, poolN)));
  console.log(`pooled chi²=${pu.chi2.toFixed(1)}  max ${(pu.maxShare * 100).toFixed(1)}%  min ${(pu.minShare * 100).toFixed(1)}%\n`);
  console.log('FINISH / ACTION / INTEGRITY:');
  console.log(row('metric', TRACKS.map((t) => t.id).concat(['proto-1 / shipped'])));
  console.log(row('top-3 finish spread (L)', TRACKS.map((t) => per[t.id].p.top3Mean.toFixed(2)).concat(['1.10 / —'])));
  console.log(row('top-5 finish spread (L)', TRACKS.map((t) => per[t.id].p.top5Mean.toFixed(2)).concat(['1.79 / —'])));
  console.log(row('lead changes [0.8,1.0]', TRACKS.map((t) => per[t.id].p.leadChangesMean.toFixed(2)).concat(['2.94 / ~2.2'])));
  console.log(row('dead finales', TRACKS.map((t) => (per[t.id].p.deadRate * 100).toFixed(1) + '%').concat(['6% / 10%'])));
  console.log(row('time-to-contention', TRACKS.map((t) => per[t.id].p.contentionMean.toFixed(2)).concat(['1.00 / —'])));
  console.log(row('OVERLAP VIOLATIONS', TRACKS.map((t) => String(per[t.id].p.overlapsTotal)).concat(['MUST BE 0'])));
  console.log(row('traffic: blocked frac', TRACKS.map((t) => (per[t.id].p.blockedFracMean * 100).toFixed(1) + '%').concat(['—'])));
  console.log('\nJSON ' + JSON.stringify({ slope, pooledChi2: pu.chi2, per: Object.fromEntries(TRACKS.map((t) => [t.id, { shares: shares(per[t.id].p.winByClass, per[t.id].p.n), chi2: uniformity(per[t.id].p.winByClass, per[t.id].p.n).chi2, top3: per[t.id].p.top3Mean, top5: per[t.id].p.top5Mean, leadChanges: per[t.id].p.leadChangesMean, deadRate: per[t.id].p.deadRate, contention: per[t.id].p.contentionMean, overlaps: per[t.id].p.overlapsTotal, blockedFrac: per[t.id].p.blockedFracMean }])) }));
}
