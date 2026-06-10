/**
 * DevTools Performance trace analyzer — RaceArena stutter investigation
 * Parses two Chrome Tracing JSON files and produces a structured report.
 * Usage: node analyze-traces.mjs
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const AUDIT_DIR = 'C:\\Users\\weudl\\OneDrive\\Dokumente\\Seasonal race claude\\reports\\audit';

const FILES = {
  slow: join(AUDIT_DIR, 'Trace-20260609T210751.json'),
  fast: join(AUDIT_DIR, 'Trace-20260609T210927_scatter.json'),
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil(p / 100 * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function ms(us) { return (us / 1000).toFixed(2); }

// ─── loader ──────────────────────────────────────────────────────────────────

function loadTrace(path) {
  console.error(`Loading ${path} …`);
  const raw = readFileSync(path, 'utf8');
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error('JSON parse failed'); }

  // Trace can be {traceEvents:[…]} or plain array
  const events = Array.isArray(parsed) ? parsed
    : (parsed.traceEvents ?? parsed.events ?? []);
  console.error(`  ${events.length} events`);
  return events;
}

// ─── frame-timing extraction ──────────────────────────────────────────────────
//
// Chrome DevTools uses "frame" to mean the compositor frame.
// We want "renderer main-thread frame" cost, approximated by
// the duration between consecutive DrawFrame / RenderFrameImpl events, OR
// the "TaskQueueManager::ProcessTaskFromWorkQueue" long-task duration.
// We use the timeline's "BeginFrame" → "ActivateLayerTree" compound, but the
// simplest proxy is: every "RunTask" / "TaskQueueManager" top-level task on
// the main thread renderer process that is >2 ms.

function extractMainThreadTasks(events) {
  // Find the renderer main-thread PID/TID
  // "CrRendererMain" thread, or fallback to the one with the most events
  const threadNames = {};
  for (const e of events) {
    if (e.ph === 'M' && e.name === 'thread_name' && e.args?.name) {
      const key = `${e.pid}:${e.tid}`;
      threadNames[key] = e.args.name;
    }
  }

  let mainPid = null, mainTid = null;
  for (const [key, name] of Object.entries(threadNames)) {
    if (name === 'CrRendererMain' || name === 'Chrome_ChildIOThread'
        || name.toLowerCase().includes('renderer')) {
      if (name === 'CrRendererMain') {
        const [p, t] = key.split(':').map(Number);
        mainPid = p; mainTid = t;
        break;
      }
    }
  }
  // fallback: pick thread with most X events
  if (mainPid === null) {
    const counts = {};
    for (const e of events) {
      if (e.ph === 'X') {
        const k = `${e.pid}:${e.tid}`;
        counts[k] = (counts[k] || 0) + 1;
      }
    }
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (best) { [mainPid, mainTid] = best[0].split(':').map(Number); }
  }

  console.error(`  Main thread PID=${mainPid} TID=${mainTid} (${threadNames[`${mainPid}:${mainTid}`] || 'unknown'})`);

  // Extract all top-level complete events (ph='X') on main thread
  const tasks = events
    .filter(e => e.ph === 'X' && e.pid === mainPid && e.tid === mainTid && e.dur > 0)
    .map(e => ({ name: e.name, cat: e.cat, ts: e.ts, dur: e.dur, args: e.args }))
    .sort((a, b) => a.ts - b.ts);

  return { tasks, mainPid, mainTid };
}

// ─── frame-interval extraction ────────────────────────────────────────────────
// Use "DrawFrame" or "BeginMainThreadFrame" events to compute inter-frame gaps

function extractFrameIntervals(events, mainPid) {
  const frameEvents = events.filter(e =>
    e.pid === mainPid &&
    (e.name === 'DrawFrame' || e.name === 'BeginFrame' || e.name === 'BeginMainThreadFrame')
    && (e.ph === 'I' || e.ph === 'i' || e.ph === 'X' || e.ph === 's')
  ).sort((a, b) => a.ts - b.ts);

  if (frameEvents.length < 2) return [];
  const intervals = [];
  for (let i = 1; i < frameEvents.length; i++) {
    intervals.push(frameEvents[i].ts - frameEvents[i - 1].ts);
  }
  return intervals;
}

// ─── category breakdown ───────────────────────────────────────────────────────

const CAT_MAP = {
  'blink': 'Scripting',
  'blink,loading': 'Scripting',
  'devtools.timeline': 'Timeline',
  'disabled-by-default-devtools.timeline': 'Timeline',
  'v8': 'Scripting',
  'v8.execute': 'Scripting',
  'v8,devtools.timeline': 'Scripting',
  'disabled-by-default-v8.compile': 'Scripting',
  'blink.user_timing': 'UserTiming',
  'cc': 'Compositing',
  'cc,benchmark': 'Compositing',
  'disabled-by-default-cc.debug': 'Compositing',
  'gpu': 'GPU',
  'gpu.angle': 'GPU',
  'viz': 'GPU',
};

const PAINT_NAMES = new Set(['Paint', 'PaintImage', 'Raster', 'RasterTask', 'CompositeLayers',
  'DisplayItemList::Raster', 'DrawLazyPixelRef', 'DecodeLazyPixelRef',
  'GPUTask', 'PrepareTextureMailbox', 'BeginPaint', 'EndPaint', 'ImageDecodeTask']);
const GC_NAMES = new Set(['MinorGC', 'MajorGC', 'GCScavenger', 'V8.GCScavenger',
  'V8.GCIncrementalMarkingStep', 'V8.GCFinalizeMC', 'V8.GCIncrementalMarking',
  'BlinkGC.AtomicPhase', 'BlinkGC.IncrementalMarkingStep']);
const LAYOUT_NAMES = new Set(['Layout', 'UpdateLayoutTree', 'RecalcStyle', 'StyleAndLayoutSample',
  'ScheduledAction::execute', 'ParseHTML', 'ParseAuthorStyleSheet']);
const SCRIPT_NAMES = new Set(['FunctionCall', 'EvaluateScript', 'v8.run', 'MicrotaskCheckpoint',
  'RunMicrotasks', 'TimerFire', 'FireAnimationFrame', 'EventDispatch',
  'XHRReadyStateChange', 'WebSocketMessageEvent', 'V8.Execute', 'CppGC.AtomicPhase']);
const COMPOSITE_NAMES = new Set(['CompositeLayers', 'Commit', 'ActivateLayerTree', 'DrawFrame',
  'BeginCompositorFrame', 'SubmitCompositorFrame', 'ProxyMain::BeginMainFrame',
  'ThreadProxy::ScheduledActionSendBeginMainFrame', 'LayerTreeHost::UpdateLayers']);

function categorizeEvent(e) {
  if (GC_NAMES.has(e.name)) return 'GC';
  if (PAINT_NAMES.has(e.name)) return 'Paint/Raster';
  if (LAYOUT_NAMES.has(e.name)) return 'Layout/Style';
  if (COMPOSITE_NAMES.has(e.name)) return 'Compositing';
  if (SCRIPT_NAMES.has(e.name)) return 'Scripting';
  if (e.cat) {
    const cats = e.cat.split(',');
    for (const c of cats) {
      if (c.startsWith('v8')) return 'Scripting';
      if (c === 'cc') return 'Compositing';
      if (c === 'gpu') return 'GPU';
      if (c === 'blink') return 'Scripting/Blink';
    }
  }
  return 'Other';
}

// ─── top self-time functions ──────────────────────────────────────────────────
// For Scripting: collect FunctionCall + EvaluateScript, accumulate by callFrame

function extractTopFunctions(events, mainPid, mainTid, topN = 20) {
  const selfTime = {};
  const callCount = {};

  for (const e of events) {
    if (e.pid !== mainPid || e.tid !== mainTid) continue;
    if (!['FunctionCall', 'EvaluateScript', 'v8.run'].includes(e.name)) continue;
    if (!e.dur) continue;

    const frame = e.args?.data?.functionName || e.args?.data?.url || e.name;
    const url = e.args?.data?.url || e.args?.data?.scriptId || '';
    const line = e.args?.data?.lineNumber || '';
    const key = `${frame}|${url}|${line}`;
    selfTime[key] = (selfTime[key] || 0) + e.dur;
    callCount[key] = (callCount[key] || 0) + 1;
  }

  return Object.entries(selfTime)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([key, dur]) => {
      const [fn, url, line] = key.split('|');
      return { fn, url: url.replace(/^.*\/([^/]+)$/, '$1'), line, selfMs: dur / 1000, calls: callCount[key] };
    });
}

// ─── long-frame breakdown ─────────────────────────────────────────────────────

function analyzeTrace(label, events) {
  console.error(`\nAnalyzing ${label} …`);
  const { tasks, mainPid, mainTid } = extractMainThreadTasks(events);

  // Total trace wall time
  if (!tasks.length) { console.error('  No tasks found!'); return {}; }
  const traceStart = tasks[0].ts;
  const traceEnd = tasks[tasks.length - 1].ts + tasks[tasks.length - 1].dur;
  const traceMs = (traceEnd - traceStart) / 1000;

  // Frame intervals
  const intervals = extractFrameIntervals(events, mainPid);
  const sortedIntervals = [...intervals].sort((a, b) => a - b);

  // Task durations (use all tasks ≥ 1ms as proxy for "frame cost")
  const taskDurs = tasks.map(t => t.dur).sort((a, b) => a - b);

  // Category totals over the WHOLE trace
  const catTotals = {};
  for (const e of events) {
    if (e.pid !== mainPid || e.tid !== mainTid) continue;
    if (!e.dur || e.ph !== 'X') continue;
    const cat = categorizeEvent(e);
    catTotals[cat] = (catTotals[cat] || 0) + e.dur;
  }

  // Long frames — tasks over 16ms
  const longTasks = tasks.filter(t => t.dur > 16000).sort((a, b) => b.dur - a.dur);

  // Per-event breakdown of long frames
  const longFrameCatTotals = {};
  for (const t of longTasks) {
    const cat = categorizeEvent(t);
    longFrameCatTotals[cat] = (longFrameCatTotals[cat] || 0) + t.dur;
  }

  // Top scripting functions
  const topFns = extractTopFunctions(events, mainPid, mainTid);

  // Paint events specifically
  const paintEvents = events.filter(e =>
    e.pid === mainPid && e.tid === mainTid &&
    PAINT_NAMES.has(e.name) && e.ph === 'X' && e.dur
  );
  const totalPaintUs = paintEvents.reduce((s, e) => s + e.dur, 0);

  // GC events
  const gcEvents = events.filter(e =>
    e.pid === mainPid &&
    GC_NAMES.has(e.name) && e.ph === 'X' && e.dur
  );
  const totalGcUs = gcEvents.reduce((s, e) => s + e.dur, 0);
  const gcBreakdown = {};
  for (const e of gcEvents) {
    gcBreakdown[e.name] = (gcBreakdown[e.name] || 0) + e.dur;
  }

  // Compositing
  const compEvents = events.filter(e =>
    e.pid === mainPid &&
    COMPOSITE_NAMES.has(e.name) && e.ph === 'X' && e.dur
  );
  const totalCompUs = compEvents.reduce((s, e) => s + e.dur, 0);

  // Layout
  const layoutEvents = events.filter(e =>
    e.pid === mainPid && e.tid === mainTid &&
    LAYOUT_NAMES.has(e.name) && e.ph === 'X' && e.dur
  );
  const totalLayoutUs = layoutEvents.reduce((s, e) => s + e.dur, 0);

  // GPU process events (different pid)
  const gpuEvents = events.filter(e =>
    e.name?.toLowerCase().includes('gpu') && e.ph === 'X' && e.dur
  );
  const totalGpuUs = gpuEvents.reduce((s, e) => s + e.dur, 0);

  // Image decode
  const imgDecodeEvents = events.filter(e =>
    (e.name === 'Decode Image' || e.name === 'DecodeLazyPixelRef' ||
     e.name === 'ImageDecodeTask' || e.name === 'PaintImage') &&
    e.ph === 'X' && e.dur
  );
  const totalImgDecodeUs = imgDecodeEvents.reduce((s, e) => s + e.dur, 0);

  const result = {
    label,
    traceMs: traceMs.toFixed(0),
    mainPid,
    mainTid,
    taskCount: tasks.length,
    frameIntervals: {
      count: sortedIntervals.length,
      medianMs: ms(percentile(sortedIntervals, 50)),
      p99Ms: ms(percentile(sortedIntervals, 99)),
      maxMs: ms(sortedIntervals[sortedIntervals.length - 1] ?? 0),
    },
    taskDurations: {
      medianMs: ms(percentile(taskDurs, 50)),
      p99Ms: ms(percentile(taskDurs, 99)),
      maxMs: ms(taskDurs[taskDurs.length - 1]),
    },
    longTasksCount: longTasks.length,
    longTasksMaxMs: ms(longTasks[0]?.dur ?? 0),
    longTasksTopNames: longTasks.slice(0, 10).map(t => ({ name: t.name, ms: ms(t.dur) })),
    categoryTotalsMs: Object.fromEntries(
      Object.entries(catTotals).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, ms(v)])
    ),
    longFrameCategoryMs: Object.fromEntries(
      Object.entries(longFrameCatTotals).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, ms(v)])
    ),
    topScriptingFunctions: topFns,
    paintMs: ms(totalPaintUs),
    gcMs: ms(totalGcUs),
    gcBreakdownMs: Object.fromEntries(
      Object.entries(gcBreakdown).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, ms(v)])
    ),
    compositingMs: ms(totalCompUs),
    layoutMs: ms(totalLayoutUs),
    gpuMs: ms(totalGpuUs),
    imgDecodeMs: ms(totalImgDecodeUs),
  };

  return result;
}

// ─── main ─────────────────────────────────────────────────────────────────────

const evSlow = loadTrace(FILES.slow);
const evFast = loadTrace(FILES.fast);

// Determine which is slow from task durations
function maxDur(events) {
  let max = 0;
  for (const e of events) { if (e.dur > max) max = e.dur; }
  return max;
}

const slowMax = maxDur(evSlow);
const fastMax = maxDur(evFast);
console.error(`Max event duration: slow-file=${ms(slowMax)}ms  fast-file=${ms(fastMax)}ms`);

// Analyze both
const rSlow = analyzeTrace('SLOW (OVERVIEW / 210751)', evSlow);
const rFast = analyzeTrace('FAST (scatter/leader / 210927)', evFast);

// Output JSON for the report writer
console.log(JSON.stringify({ slow: rSlow, fast: rFast }, null, 2));
