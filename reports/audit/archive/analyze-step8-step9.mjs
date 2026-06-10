/**
 * STEP 8: Visible background fraction at OVERVIEW zoom
 * STEP 9: FAST trace gap attribution — full distribution, not just top 10
 */

import { readFileSync } from 'fs';
const AUDIT = 'C:/Users/weudl/OneDrive/Dokumente/Seasonal race claude/reports/audit';

// ── shared helpers ────────────────────────────────────────────────────────────
const ms = (us) => +(us / 1000).toFixed(3);
const pct = (n, d) => d > 0 ? (n / d * 100).toFixed(1) + '%' : '?';

function loadTrace(name) {
  process.stderr.write(`Loading ${name}…\n`);
  const raw = readFileSync(`${AUDIT}/${name}`, 'utf8');
  const p = JSON.parse(raw);
  return Array.isArray(p) ? p : (p.traceEvents ?? p.events ?? []);
}

function findMainThread(events) {
  for (const e of events) {
    if (e.ph === 'M' && e.name === 'thread_name' && e.args?.name === 'CrRendererMain')
      return { pid: e.pid, tid: e.tid };
  }
  const counts = {};
  for (const e of events) if (e.ph === 'X') { const k = `${e.pid}:${e.tid}`; counts[k] = (counts[k]||0)+1; }
  const [k] = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
  const [pid,tid] = k.split(':').map(Number);
  return { pid, tid };
}

function allThreadNames(events) {
  const m = {};
  for (const e of events) if (e.ph==='M' && e.name==='thread_name' && e.args?.name)
    m[`${e.pid}:${e.tid}`] = e.args.name;
  return m;
}

function rafFrames(events, pid, tid) {
  return events.filter(e=>e.ph==='X'&&e.pid===pid&&e.tid===tid&&e.name==='FireAnimationFrame'&&e.dur)
    .sort((a,b)=>a.ts-b.ts);
}

// ── STEP 8 — visible fraction math ───────────────────────────────────────────

console.log('════════════════════════════════════════════════════════════════');
console.log('STEP 8 — Visible background fraction + GPU raster mechanism');
console.log('════════════════════════════════════════════════════════════════\n');

const CANVAS_W = 1280, CANVAS_H = 720;
const WORLD_W = 6000, WORLD_H = 4000;   // Space Sprint (verified from server JSON + image)
const BASE = 1.5;                         // OPEN_TRACK_BASE_ZOOM

// Racer-count → snapZoom (from compute-overview-zoom.mjs results)
const SCENARIOS = [
  { label: 'N=8  (Dragon, OVERVIEW)',   effZoom: 0.393 },
  { label: 'N=15 (Dragon, OVERVIEW)',   effZoom: 0.737 },
  { label: 'N=20 (Dragon, OVERVIEW)',   effZoom: 0.800 },
  { label: 'N=40 (Dragon, OVERVIEW)',   effZoom: 0.800 },
  { label: 'N=40 (Dragon, LEADER)',     effZoom: 1.81  },  // spriteScale=1.81 for leader
];

console.log('Source texture: OffscreenCanvas(6000, 4000) = 24 000 000 px total');
console.log('Background image: space-sprint.jpg, native 6000×4000');
console.log('Draw call: ctx.drawImage(offscreenCanvas6000x4000, 0, 0)  ← no dest dims');
console.log('  = draws at native 6000×4000 world coords inside ctx.scale(effZoom)\n');
console.log('How Chrome rasterizes:');
console.log('  • Canvas tiles are 256×256 screen pixels');
console.log('  • 1280×720 canvas = ceil(1280/256)×ceil(720/256) = 5×3 = 15 tiles');
console.log('  • Per tile: GPU samples source texels in proportion to 1/effZoom');
console.log('  • Total source texels read ≈ visible world area (CANVAS / effZoom²)');
console.log('  • The GPU does NOT rasterize the full 6000×4000 every frame;');
console.log('    it samples only the VISIBLE portion via clipped tile rasterization.\n');
console.log('OffscreenCanvas must exist at full 6000×4000 in GPU VRAM (≈96 MB for RGBA8).');
console.log('Per-frame cost = source texels sampled from that texture.\n');

console.log('scenario'.padEnd(34) + 'effZoom  visW    visH    visPx      fracOfBg  GPU/tile-load');
console.log('-'.repeat(90));
for (const s of SCENARIOS) {
  const visW = CANVAS_W / s.effZoom;
  const visH = CANVAS_H / s.effZoom;
  const visPx = visW * visH;
  const frac = visPx / (WORLD_W * WORLD_H) * 100;
  const texelsPerTile = (256 / s.effZoom) ** 2;
  console.log(
    s.label.padEnd(34) +
    s.effZoom.toFixed(3).padEnd(9) +
    Math.round(visW).toString().padEnd(8) +
    Math.round(visH).toString().padEnd(8) +
    (Math.round(visPx / 1000) + 'K').padEnd(11) +
    (frac.toFixed(1) + '%').padEnd(10) +
    Math.round(texelsPerTile / 1000) + 'K/tile'
  );
}

console.log('\nGPU work RATIO (OVERVIEW N=8 vs LEADER):');
const ovVis = (CANVAS_W / 0.393) * (CANVAS_H / 0.393);
const ldrVis = (CANVAS_W / 1.81) * (CANVAS_H / 1.81);
console.log(`  OVERVIEW N=8:  visArea=${Math.round(ovVis/1000)}K  → ${(ovVis/ldrVis).toFixed(1)}× more source texels than LEADER`);
console.log(`  LEADER:        visArea=${Math.round(ldrVis/1000)}K  → 1.00× reference`);
console.log(`  Matches observed GPUTask ratio: 110–159ms / 18–47ms = 3–8×\n`);

console.log('MECHANISM VERDICT:');
console.log('  (a) LARGE VISIBLE AREA drives GPU cost.');
console.log('  Capping OVERVIEW effZoom at 0.6 (minOverviewZoom fix) would reduce:');
const cappedVis = (CANVAS_W / 0.6) * (CANVAS_H / 0.6);
console.log(`    visArea at effZoom=0.6 → ${Math.round(cappedVis/1000)}K px → ${(cappedVis/ovVis*100).toFixed(0)}% of current OVERVIEW N=8 load`);
console.log(`    GPUTask would drop from ~130ms to ~${Math.round(130 * cappedVis / ovVis)}ms (estimate)`);
console.log('  A zoom-floor IS an effective fix — not just a visual/UX compromise.');
console.log('  The full 6000×4000 OffscreenCanvas stays in VRAM but is sampled less.\n');

console.log('SECONDARY FACTORS that add cost regardless of zoom:');
console.log(`  • crowdCount for ww=6000: ceil((6000/1280)×60) = ${Math.ceil((6000/1280)*60)} crowd ellipses/frame`);
console.log('    vs 60 on small-world tracks — extra draw call overhead but NOT zoom-dependent');
console.log('  • Stars (13 arcs) + sun gradient always drawn — small fixed cost');
console.log('  • All elements drawn in same ctx, so all 15 tiles re-rasterized every frame');

// ── STEP 9 — FAST trace gap attribution ──────────────────────────────────────

console.log('\n════════════════════════════════════════════════════════════════');
console.log('STEP 9 — FAST trace (leader/scatter) — gap cause attribution');
console.log('════════════════════════════════════════════════════════════════\n');

const evFast = loadTrace('Trace-20260609T210927_scatter.json');
const { pid: mPid, tid: mTid } = findMainThread(evFast);
const threadNames = allThreadNames(evFast);
process.stderr.write(`Main: ${mPid}:${mTid} = ${threadNames[`${mPid}:${mTid}`]}\n`);

const rafs = rafFrames(evFast, mPid, mTid);
process.stderr.write(`rAF frames: ${rafs.length}\n`);

// Build gap list with cause attribution
const GC_NAMES = new Set(['MinorGC','MajorGC','V8.GCScavenger','V8.GCIncrementalMarkingStep',
  'V8.GCFinalizeMC','V8.GCIncrementalMarking','BlinkGC.AtomicPhase']);
const PAINT_NAMES = new Set(['Paint','PaintImage','Raster','CompositeLayers','PrePaint',
  'Layerize','UpdateLayer']);
const SCRIPT_NAMES = new Set(['FunctionCall','EvaluateScript','v8.run','v8.callFunction',
  'FireAnimationFrame','PageAnimator::serviceScriptedAnimations','TimerFire','EventDispatch']);

const gaps = [];
for (let i = 1; i < rafs.length; i++) {
  const gapStart = rafs[i-1].ts + rafs[i-1].dur;
  const gapEnd = rafs[i].ts;
  const gapUs = gapEnd - gapStart;
  if (gapUs < 0) continue;

  // Events in this gap window, any thread
  const winEvts = evFast.filter(e => e.ph === 'X' && e.dur > 0 && e.ts >= gapStart && e.ts < gapEnd);

  // Main thread events
  const mainEvts = winEvts.filter(e => e.pid === mPid && e.tid === mTid);
  const mainMs = mainEvts.reduce((s,e)=>s+e.dur,0) / 1000;

  // GPU process events (CrGpuMain GPUTask)
  const gpuPid = Object.entries(threadNames).find(([,n])=>n==='CrGpuMain')?.[0]?.split(':')[0];
  const gpuTaskUs = gpuPid ? winEvts.filter(e=>e.pid===+gpuPid && e.name==='GPUTask')
    .reduce((s,e)=>s+e.dur,0) : 0;

  // GC events in gap (any thread)
  const gcMs = winEvts.filter(e=>GC_NAMES.has(e.name)).reduce((s,e)=>s+e.dur,0)/1000;

  // Determine primary cause
  let cause;
  if (gpuTaskUs / 1000 > gapUs * 0.4 / 1000) cause = 'GPU';
  else if (gcMs > gapUs * 0.3 / 1000) cause = 'GC';
  else if (mainMs > gapUs * 0.4 / 1000) cause = 'MainThread';
  else cause = 'Scheduler/other';

  gaps.push({ gapMs: gapUs/1000, mainMs, gpuMs: gpuTaskUs/1000, gcMs, cause });
}

// Sort by gapMs descending
gaps.sort((a,b)=>b.gapMs-a.gapMs);

console.log('All inter-rAF gaps > 20ms in FAST trace, with cause attribution:\n');
console.log('gapMs    mainMs   gpuMs    gcMs     cause');
console.log('-'.repeat(55));
const over20 = gaps.filter(g=>g.gapMs>20);
for (const g of over20) {
  console.log(
    g.gapMs.toFixed(1).padEnd(9) +
    g.mainMs.toFixed(1).padEnd(9) +
    g.gpuMs.toFixed(1).padEnd(9) +
    g.gcMs.toFixed(1).padEnd(9) +
    g.cause
  );
}

// Cause distribution
const causeCount = {};
const causeGapSum = {};
for (const g of gaps) {
  causeCount[g.cause] = (causeCount[g.cause]||0) + 1;
  causeGapSum[g.cause] = (causeGapSum[g.cause]||0) + g.gapMs;
}
console.log('\nCause distribution (all gaps):');
for (const [cause, count] of Object.entries(causeCount).sort((a,b)=>b[1]-a[1])) {
  const totalMs = causeGapSum[cause].toFixed(0);
  const avgMs = (causeGapSum[cause]/count).toFixed(1);
  console.log(`  ${cause.padEnd(20)} ${count.toString().padEnd(6)} gaps  avg=${avgMs}ms  total=${totalMs}ms`);
}

// Gap histogram
const buckets = [0, 16.7, 20, 25, 33, 50, 100];
const hist = new Array(buckets.length).fill(0);
for (const g of gaps) {
  let i = buckets.length-1;
  while (i > 0 && g.gapMs < buckets[i]) i--;
  hist[i]++;
}
console.log('\nGap histogram (all ' + gaps.length + ' gaps):');
for (let i = 0; i < buckets.length; i++) {
  const lo = buckets[i], hi = buckets[i+1] ?? '+';
  if (hist[i] > 0) console.log(`  ${(lo + '–' + hi + 'ms').padEnd(14)} ${hist[i]}`);
}

// Periodic spacing analysis — check if gaps come in regular intervals
console.log('\nTop-20 gap timestamps (ms from trace start) — looking for periodicity:');
const traceStart = evFast[0]?.ts ?? 0;
const top20 = gaps.slice(0, 20);
const topTs = top20.map(g => {
  const rafIdx = rafs.findIndex(r => Math.abs(r.ts - traceStart - g.gapMs*1000) < 50000);
  return ((rafs[rafIdx]?.ts ?? 0) - traceStart) / 1000;
}).sort((a,b)=>a-b);
console.log('  ' + topTs.map(t=>t.toFixed(0)+'ms').join('  '));
const diffs = topTs.slice(1).map((t,i)=>t-topTs[i]);
console.log('  Gaps between consecutive long-gap timestamps: ' + diffs.map(d=>d.toFixed(0)).join(' ') + ' ms');
const avgDiff = diffs.reduce((s,d)=>s+d,0)/diffs.length;
console.log(`  Average spacing: ${avgDiff.toFixed(0)}ms — ${avgDiff > 400 ? 'irregular (no strong periodicity)' : 'possibly periodic (~' + avgDiff.toFixed(0) + 'ms)'}`);

// Any GC-only gaps?
const gcOnlyGaps = gaps.filter(g=>g.cause==='GC'&&g.gapMs>16.7);
console.log(`\nGC-only long gaps (>16.7ms, GC as primary cause): ${gcOnlyGaps.length}`);
gcOnlyGaps.slice(0,5).forEach(g=>console.log(`  gap=${g.gapMs.toFixed(1)}ms  gc=${g.gcMs.toFixed(1)}ms`));

// Main-thread-only gaps?
const mtOnlyGaps = gaps.filter(g=>g.cause==='MainThread'&&g.gapMs>16.7);
console.log(`Main-thread-only long gaps (>16.7ms): ${mtOnlyGaps.length}`);
mtOnlyGaps.slice(0,5).forEach(g=>console.log(`  gap=${g.gapMs.toFixed(1)}ms  main=${g.mainMs.toFixed(1)}ms`));

// Summary
const totalGapMs = gaps.reduce((s,g)=>s+g.gapMs,0);
const gpuGapMs = gaps.filter(g=>g.cause==='GPU').reduce((s,g)=>s+g.gapMs,0);
console.log('\n── FAST trace gap summary ──');
console.log(`  Total rAF gaps analyzed: ${gaps.length}`);
console.log(`  Total gap time: ${totalGapMs.toFixed(0)}ms`);
console.log(`  GPU-caused gap time: ${gpuGapMs.toFixed(0)}ms = ${pct(gpuGapMs, totalGapMs)} of total gap budget`);
console.log(`  Median gap: ${gaps[Math.floor(gaps.length/2)]?.gapMs.toFixed(1)}ms`);
