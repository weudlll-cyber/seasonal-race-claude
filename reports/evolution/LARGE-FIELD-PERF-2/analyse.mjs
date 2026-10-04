// ============================================================
// File:        analyse.mjs
// Path:        reports/evolution/LARGE-FIELD-PERF-2/analyse.mjs
// Project:     RaceArena — LARGE-FIELD-PERF-2 (2026-10-04)
// Description: Reads what `run.mjs` recorded and answers: for every frame over 33 ms, which part of
//              the work took the time, and at which moment of the race it fell.
//
// HOW A PROFILER SAMPLE BECOMES "PHYSICS" OR "DRAWING RACERS"
//   1. Every sample (1 ms apart) carries a stack. Each stack frame's position in the minified bundle
//      is mapped to its ORIGINAL source file, line and name through the build's own source maps
//      (`source-map-js`, the reader Vite already depends on).
//   2. The sample is put on the frame it fell in: the profiler's clock is moved onto the page clock
//      with the calibration marker `run.mjs` ran at a known time, and frame k spans
//      [start_k, start_k + gap_k).
//   3. The sample gets ONE category, from the most specific frame on its stack that has one — read
//      from the leaf up — using CATEGORIES below. A sample whose leaf is the browser's own work is
//      `browser (layout, paint, compositing)`; garbage collection and idle are their own categories.
//   A category's share of the slow frames is its samples inside slow frames over all samples inside
//   slow frames. Idle samples are counted and reported, but left out of the shares: a frame that is
//   late while the main thread is idle is waiting on the GPU or the display, not on our code.
//
// Usage:
//   node analyse.mjs <dist-dir-with-maps> <raw-dir> [--top=12]
// ============================================================

import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createRequire } from 'node:module';

const [, , distDir, rawDir] = process.argv;
const TOP = Number((process.argv.find((a) => a.startsWith('--top=')) ?? '--top=12').slice(6));
const require = createRequire(join(process.cwd(), 'client', 'package.json'));
const { SourceMapConsumer } = require('source-map-js');

// ── categories, by ORIGINAL source path and function name; first match wins, read leaf → root ──
// Order matters: the minimap lives under camera/ and the labels under drawing/, so the specific
// rules come before the general ones.
const CATEGORIES = [
  ['minimap', (f) => /\/camera\/Minimap\.js$/.test(f.src)],
  ['scoreboard', (f) => /scoreboard/i.test(f.src)],
  // Name tags: the label modules, and `drawNameTag` — lines 58-119 of racerRendering.js. The source
  // map gives minified names only, so the function is identified by its line range (checked on master
  // c104c5b6; re-check the range if that file changes).
  [
    'name tags / labels',
    (f) =>
      /labelFormHold|nameTagLayout|label/i.test(f.src) ||
      (/\/drawing\/racerRendering\.js$/.test(f.src) && f.line >= 58 && f.line <= 119),
  ],
  [
    'track effects / particles',
    (f) => /surface-effects|particle|trail|trackLights|effects?\//i.test(f.src) || /particle|trail/i.test(f.name),
  ],
  ['camera director', (f) => /\/modules\/camera\//.test(f.src)],
  ['drawing racers', (f) => /\/racer-types\/|\/drawing\/racerRendering\.js$/.test(f.src)],
  [
    'physics',
    (f) =>
      /\/modules\/(raceStep|raceCore|racePlanner|raceBehavior|raceGovernor|heroChoreography|heroCurveGenerator|raceDynamics|raceParams|raceBaseSpeed|rowLayout|raceLengths)/.test(
        f.src
      ),
  ],
  ['other race drawing', (f) => /\/screens\/RaceScreen\/(drawing\/|renderRaceFrame)/.test(f.src)],
  ['React / DOM updates', (f) => /node_modules\/(react|react-dom|scheduler)\//.test(f.src)],
  ['other app code', (f) => /\/client\/src\/|^src\//.test(f.src) || /\.\.\/src\//.test(f.src)],
];
const NATIVE = {
  '(program)': 'browser (layout, paint, compositing)',
  '(garbage collector)': 'garbage collection',
  '(idle)': 'idle',
  '(root)': 'browser (layout, paint, compositing)',
};

// ── the source maps ──────────────────────────────────────────────────────────────────────────────
const consumers = new Map();
function consumerFor(url) {
  const file = basename(new URL(url).pathname);
  if (consumers.has(file)) return consumers.get(file);
  let c = null;
  try {
    c = new SourceMapConsumer(JSON.parse(readFileSync(join(distDir, 'assets', `${file}.map`), 'utf8')));
  } catch {
    c = null;
  }
  consumers.set(file, c);
  return c;
}

function original(callFrame) {
  if (!callFrame.url || !/^https?:/.test(callFrame.url)) return { src: callFrame.url || '', line: 0, name: callFrame.functionName };
  const c = consumerFor(callFrame.url);
  if (!c) return { src: callFrame.url, line: callFrame.lineNumber + 1, name: callFrame.functionName };
  const p = c.originalPositionFor({ line: callFrame.lineNumber + 1, column: callFrame.columnNumber });
  return { src: (p.source ?? callFrame.url).replace(/^(\.\.\/)+/, ''), line: p.line ?? 0, name: p.name ?? callFrame.functionName };
}

function categoryOf(nodeId, nodes, parentOf, memo) {
  if (memo.has(nodeId)) return memo.get(nodeId);
  const n = nodes.get(nodeId);
  let cat = NATIVE[n.callFrame.functionName] ?? null;
  if (!cat) {
    const f = n.orig;
    for (const [name, test] of CATEGORIES) {
      if (f.src && test(f)) {
        cat = name;
        break;
      }
    }
  }
  // A generic helper (an easing function, a vector routine) or an unplaced frame takes its CALLER's
  // category when the caller has a specific one: `mathUtils.js` called by the camera is camera time.
  if (!cat || cat === 'other app code') {
    const p = parentOf.get(nodeId);
    const up = p !== undefined ? categoryOf(p, nodes, parentOf, memo) : null;
    const specific = up && !['idle', 'browser (layout, paint, compositing)', 'other app code'].includes(up);
    cat = specific ? up : (cat ?? 'other app code');
  }
  memo.set(nodeId, cat);
  return cat;
}

// ── per race ─────────────────────────────────────────────────────────────────────────────────────
const files = readdirSync(rawDir).filter((f) => f.endsWith('.frames.json')).sort();
const groups = new Map(); // key -> aggregate
function agg(key) {
  if (!groups.has(key))
    groups.set(key, {
      races: 0,
      frames: 0,
      slow: 0,
      slow50: 0,
      gaps: [],
      bySeg: {},
      byState: {},
      samples: {},
      samplesBySeg: {},
      idle: 0,
      hot: new Map(),
      seeds: [],
      mismatch: 0,
      lost: 0,
      calibFound: 0,
    });
  return groups.get(key);
}

for (const f of files) {
  const run = JSON.parse(readFileSync(join(rawDir, f), 'utf8'));
  const key = `${run.track} ${run.n}${run.profile === false ? ' (profiler off)' : ''}`;
  const g = agg(key);
  g.races++;
  g.seeds.push(run.seed);
  g.mismatch += run.mismatch;
  g.lost += Math.max(0, run.lost);
  const prof = run.profile === false ? null : JSON.parse(readFileSync(join(rawDir, f.replace('.frames.json', '.cpuprofile')), 'utf8'));

  const frames = run.frames; // [gap, state, start]
  const total = frames.reduce((a, [gap]) => a + gap, 0);
  const seg = [];
  let acc = 0;
  for (const [gap, state] of frames) {
    acc += gap;
    seg.push(acc < 2000 ? 'startup' : acc > total * 0.9 ? (state === 'OVERVIEW' ? 'ending, wide shot' : 'ending, other shot') : 'running');
    g.frames++;
    g.gaps.push(gap);
    if (gap > 33) {
      g.slow++;
      const sgName = seg[seg.length - 1];
      g.bySeg[sgName] = (g.bySeg[sgName] ?? 0) + 1;
      g.byState[state] = (g.byState[state] ?? 0) + 1;
    }
    if (gap > 50) g.slow50++;
  }
  if (!prof) continue;

  const nodes = new Map();
  const parentOf = new Map();
  for (const n of prof.nodes) {
    n.orig = original(n.callFrame);
    nodes.set(n.id, n);
    for (const c of n.children ?? []) parentOf.set(c, n.id);
  }
  // sample times (µs) on the profiler clock
  const times = [];
  let t = prof.startTime;
  for (const d of prof.timeDeltas) times.push((t += d));
  // calibration: the first sample inside __raCalibrationMarker
  let offset = null;
  for (let k = 0; k < prof.samples.length; k++) {
    if (nodes.get(prof.samples[k]).callFrame.functionName === '__raCalibrationMarker') {
      offset = times[k] / 1000 - run.calibAt;
      break;
    }
  }
  if (offset === null) {
    console.error(`${f}: calibration marker not found — samples not placed`);
    continue;
  }
  g.calibFound++;

  const starts = frames.map((fr) => fr[2]);

  const memo = new Map();
  for (let k = 0; k < prof.samples.length; k++) {
    const pageT = times[k] / 1000 - offset;
    // binary search: the frame whose [start, start+gap) holds pageT
    let lo = 0;
    let hi = starts.length - 1;
    if (pageT < starts[0] || pageT >= starts[hi] + frames[hi][0]) continue;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= pageT) lo = mid;
      else hi = mid - 1;
    }
    if (frames[lo][0] <= 33) continue;
    const id = prof.samples[k];
    const cat = categoryOf(id, nodes, parentOf, memo);
    if (cat === 'idle') {
      g.idle++;
      continue;
    }
    g.samples[cat] = (g.samples[cat] ?? 0) + 1;
    const sg = (g.samplesBySeg[seg[lo]] ??= {});
    sg[cat] = (sg[cat] ?? 0) + 1;
    // the hot code: the leaf's original location when it is our source, else the nearest such caller
    let nid = id;
    let where = null;
    while (nid !== undefined) {
      const o = nodes.get(nid).orig;
      if (o.src && /client\/src\/|^src\//.test(o.src)) {
        where = `${o.src.replace(/^.*?client\//, 'client/')}:${o.line} (${o.name || 'anonymous'})`;
        break;
      }
      nid = parentOf.get(nid);
    }
    const hk = `${cat} | ${where ?? nodes.get(id).callFrame.functionName}`;
    g.hot.set(hk, (g.hot.get(hk) ?? 0) + 1);
  }
}

// ── print ────────────────────────────────────────────────────────────────────────────────────────
const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)} %` : '-');
const q = (arr, p) => {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};
for (const [key, g] of [...groups].sort()) {
  const work = Object.values(g.samples).reduce((a, b) => a + b, 0);
  console.log(`\n## ${key} — N = ${g.races} races, ${g.frames} frames, ${g.slow} over 33 ms (${pct(g.slow, g.frames)}), ${g.slow50} over 50 ms`);
  console.log(`seeds: ${g.seeds.join(', ')} | calibrated ${g.calibFound}/${g.races} | stitch mismatches ${g.mismatch} | lost ${g.lost}`);
  console.log(`frame ms: p50 ${q(g.gaps, 0.5)?.toFixed(1)} · p95 ${q(g.gaps, 0.95)?.toFixed(1)} · p99 ${q(g.gaps, 0.99)?.toFixed(1)}`);
  console.log(`slow frames by moment: ${Object.entries(g.bySeg).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  console.log(`slow frames by camera state: ${Object.entries(g.byState).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  if (!g.calibFound) continue;
  console.log(`CPU samples inside slow frames: ${work} working, ${g.idle} idle — the main thread was idle for ${pct(g.idle, work + g.idle)} of the slow frames' sampled time`);
  for (const [cat, n] of Object.entries(g.samples).sort((a, b) => b[1] - a[1])) console.log(`  ${cat.padEnd(38)} ${String(n).padStart(6)}  ${pct(n, work)}`);
  for (const [sgName, cats] of Object.entries(g.samplesBySeg)) {
    const w = Object.values(cats).reduce((a, b) => a + b, 0);
    const top3 = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, n]) => `${c} ${pct(n, w)}`).join(' · ');
    console.log(`  in "${sgName}" (${w} samples): ${top3}`);
  }
  console.log(`hot code inside slow frames (top ${TOP}):`);
  for (const [k, n] of [...g.hot].sort((a, b) => b[1] - a[1]).slice(0, TOP)) console.log(`  ${String(n).padStart(6)}  ${pct(n, work).padStart(7)}  ${k}`);
}
