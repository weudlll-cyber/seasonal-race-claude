/**
 * Deep-dive: per-rAF frame timing, canvas call counts, layout costs.
 * Supplements analyze-traces.mjs.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const AUDIT_DIR = 'C:\\Users\\weudl\\OneDrive\\Dokumente\\Seasonal race claude\\reports\\audit';
const FILES = {
  slow: join(AUDIT_DIR, 'Trace-20260609T210751.json'),
  fast: join(AUDIT_DIR, 'Trace-20260609T210927_scatter.json'),
};

function ms(us) { return +(us / 1000).toFixed(3); }

function loadTrace(path) {
  process.stderr.write(`Loading ${path} …\n`);
  const raw = readFileSync(path, 'utf8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : (parsed.traceEvents ?? parsed.events ?? []);
}

function findMainThread(events) {
  for (const e of events) {
    if (e.ph === 'M' && e.name === 'thread_name' && e.args?.name === 'CrRendererMain') {
      return { pid: e.pid, tid: e.tid };
    }
  }
  // fallback
  const counts = {};
  for (const e of events) {
    if (e.ph === 'X') {
      const k = `${e.pid}:${e.tid}`;
      counts[k] = (counts[k] || 0) + 1;
    }
  }
  const [k] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const [pid, tid] = k.split(':').map(Number);
  return { pid, tid };
}

// ─── 1. Identify all FireAnimationFrame (rAF) durations ──────────────────────

function rafFrames(events, pid, tid) {
  return events
    .filter(e => e.ph === 'X' && e.pid === pid && e.tid === tid
      && e.name === 'FireAnimationFrame' && e.dur)
    .sort((a, b) => a.ts - b.ts);
}

// ─── 2. For each rAF frame, collect ALL child events and bucket them ──────────

const PAINT_NAMES = new Set(['Paint','PaintImage','Raster','RasterTask',
  'CompositeLayers','DrawLazyPixelRef','GPUTask','DisplayItemList::Raster']);
const GC_NAMES = new Set(['MinorGC','MajorGC','GCScavenger','V8.GCScavenger',
  'V8.GCIncrementalMarkingStep','V8.GCFinalizeMC','V8.GCIncrementalMarking']);
const LAYOUT_NAMES = new Set(['Layout','UpdateLayoutTree','RecalcStyle']);

function bucketFrame(frame, allEvents, pid, tid) {
  const start = frame.ts, end = frame.ts + frame.dur;
  const children = allEvents.filter(e =>
    e.pid === pid && e.tid === tid &&
    e.ph === 'X' && e.ts >= start && e.ts + (e.dur ?? 0) <= end
  );
  let scriptUs = 0, paintUs = 0, layoutUs = 0, gcUs = 0, otherUs = 0;
  for (const e of children) {
    const d = e.dur ?? 0;
    if (e.name === 'FireAnimationFrame') continue; // self
    if (GC_NAMES.has(e.name)) gcUs += d;
    else if (PAINT_NAMES.has(e.name)) paintUs += d;
    else if (LAYOUT_NAMES.has(e.name)) layoutUs += d;
    else if (e.cat?.includes('v8') || e.name?.includes('FunctionCall')
          || e.name?.includes('EvaluateScript')) scriptUs += d;
    else otherUs += d;
  }
  return {
    totalMs: ms(frame.dur),
    scriptMs: ms(scriptUs),
    paintMs: ms(paintUs),
    layoutMs: ms(layoutUs),
    gcMs: ms(gcUs),
    otherMs: ms(otherUs),
  };
}

// ─── 3. Collect specific named events (canvas / webgl calls) ─────────────────

function namedEventStats(events, pid, tid, nameFragments) {
  const out = {};
  for (const e of events) {
    if (e.pid !== pid || e.tid !== tid) continue;
    if (!e.dur || e.ph !== 'X') continue;
    const match = nameFragments.find(f => e.name?.includes(f));
    if (!match) continue;
    if (!out[e.name]) out[e.name] = { count: 0, totalMs: 0, maxMs: 0 };
    out[e.name].count++;
    out[e.name].totalMs += e.dur / 1000;
    if (e.dur / 1000 > out[e.name].maxMs) out[e.name].maxMs = e.dur / 1000;
  }
  return Object.fromEntries(
    Object.entries(out).sort((a, b) => b[1].totalMs - a[1].totalMs)
      .map(([k, v]) => [k, { ...v, totalMs: +v.totalMs.toFixed(2), maxMs: +v.maxMs.toFixed(3) }])
  );
}

// ─── 4. Task histogram ────────────────────────────────────────────────────────

function taskHistogram(events, pid, tid) {
  const durs = events
    .filter(e => e.pid === pid && e.tid === tid && e.ph === 'X' && e.dur > 0)
    .map(e => e.dur / 1000);

  const buckets = [0, 1, 2, 4, 8, 16, 33, 50, 100, 200];
  const hist = new Array(buckets.length).fill(0);
  for (const d of durs) {
    let i = buckets.length - 1;
    while (i > 0 && d < buckets[i]) i--;
    hist[i]++;
  }
  return buckets.map((lo, i) => ({
    range: `${lo}-${buckets[i + 1] ?? '+'}ms`,
    count: hist[i],
  }));
}

// ─── 5. Scan for setInterval / setTimeout sources driving the loop ────────────

function timerStats(events, pid, tid) {
  return events
    .filter(e => e.pid === pid && e.tid === tid && e.ph === 'X'
      && (e.name === 'TimerFire' || e.name === 'TimerInstall') && e.dur)
    .map(e => ({
      name: e.name,
      id: e.args?.data?.timerId,
      interval: e.args?.data?.timeout,
      ms: ms(e.dur),
      url: e.args?.data?.stackTrace?.[0]?.url?.replace(/.*\//, ''),
    }))
    .slice(0, 20);
}

// ─── main ─────────────────────────────────────────────────────────────────────

function deepAnalyze(label, events) {
  process.stderr.write(`\nDeep analysis: ${label}\n`);
  const { pid, tid } = findMainThread(events);
  process.stderr.write(`  Main: PID=${pid} TID=${tid}\n`);

  const rafEvts = rafFrames(events, pid, tid);
  process.stderr.write(`  FireAnimationFrame count: ${rafEvts.length}\n`);

  // rAF per-frame durations
  const rafDurs = rafEvts.map(e => ms(e.dur)).sort((a, b) => a - b);
  const rafCount = rafDurs.length;
  const p = (pct) => rafDurs[Math.ceil(pct / 100 * rafCount) - 1] ?? 0;

  // Inter-rAF gaps (wall time between rAF starts)
  const gaps = [];
  for (let i = 1; i < rafEvts.length; i++) gaps.push((rafEvts[i].ts - rafEvts[i - 1].ts) / 1000);
  const sortedGaps = [...gaps].sort((a, b) => a - b);
  const gp = (pct) => sortedGaps[Math.ceil(pct / 100 * sortedGaps.length) - 1] ?? 0;

  // Sample worst 5 rAF frames for breakdown
  const worstRAF = [...rafEvts].sort((a, b) => b.dur - a.dur).slice(0, 5);
  const worstBreakdowns = worstRAF.map(f => ({
    totalMs: ms(f.dur),
    ...bucketFrame(f, events, pid, tid),
  }));

  // Canvas/WebGL/drawImage calls
  const canvasCalls = namedEventStats(events, pid, tid,
    ['Canvas', 'WebGL', 'drawImage', 'fillRect', 'strokeRect', 'clearRect',
     'HTMLCanvasElement', 'CanvasRenderingContext2D', 'drawArrays', 'drawElements']);

  // Layout/paint triggers
  const layoutCalls = namedEventStats(events, pid, tid,
    ['Layout', 'RecalcStyle', 'UpdateLayerTree', 'Paint', 'CompositeLayers']);

  // Histogram
  const hist = taskHistogram(events, pid, tid);

  // Timer stats
  const timers = timerStats(events, pid, tid);

  return {
    label,
    rafCount,
    rafDurationMs: {
      median: p(50),
      p90: p(90),
      p99: p(99),
      max: p(100),
    },
    interRafGapMs: {
      median: +gp(50).toFixed(2),
      p90: +gp(90).toFixed(2),
      p99: +gp(99).toFixed(2),
      max: +sortedGaps[sortedGaps.length - 1]?.toFixed(2),
      fps_from_median: rafCount > 1 ? +(1000 / gp(50)).toFixed(1) : 0,
    },
    worst5RafFrameBreakdown: worstBreakdowns,
    canvasWebGLCalls: canvasCalls,
    layoutPaintCalls: layoutCalls,
    taskHistogram: hist,
    timerSample: timers.slice(0, 10),
  };
}

const evSlow = loadTrace(FILES.slow);
const evFast = loadTrace(FILES.fast);
const rSlow = deepAnalyze('SLOW-OVERVIEW', evSlow);
const rFast = deepAnalyze('FAST-leader-scatter', evFast);
console.log(JSON.stringify({ slow: rSlow, fast: rFast }, null, 2));
