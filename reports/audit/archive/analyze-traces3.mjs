/**
 * Analyze what blocks rAF during long inter-rAF gaps in SLOW trace.
 * Also look at per-frame Paint costs and GPU timeline.
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
  const counts = {};
  for (const e of events) { if (e.ph === 'X') { const k = `${e.pid}:${e.tid}`; counts[k] = (counts[k] || 0) + 1; } }
  const [k] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const [pid, tid] = k.split(':').map(Number);
  return { pid, tid };
}

function rafFrames(events, pid, tid) {
  return events
    .filter(e => e.ph === 'X' && e.pid === pid && e.tid === tid && e.name === 'FireAnimationFrame' && e.dur)
    .sort((a, b) => a.ts - b.ts);
}

// Find all processes/threads
function allThreads(events) {
  const map = {};
  for (const e of events) {
    if (e.ph === 'M' && e.name === 'thread_name' && e.args?.name) {
      map[`${e.pid}:${e.tid}`] = e.args.name;
    }
  }
  return map;
}

// Events during a gap window [startUs, endUs) on ANY thread
function eventsInWindow(events, startUs, endUs) {
  return events.filter(e =>
    e.ph === 'X' && e.ts >= startUs && e.ts < endUs && (e.dur ?? 0) > 0
  );
}

function analyze(label, events) {
  process.stderr.write(`\nAnalyze: ${label}\n`);
  const { pid, tid } = findMainThread(events);
  const threads = allThreads(events);
  process.stderr.write(`  Main: PID=${pid} TID=${tid}\n`);
  process.stderr.write(`  Threads: ${JSON.stringify(threads)}\n`);

  const rafs = rafFrames(events, pid, tid);
  const gaps = [];
  for (let i = 1; i < rafs.length; i++) {
    const gapUs = rafs[i].ts - (rafs[i-1].ts + rafs[i-1].dur);
    gaps.push({ start: rafs[i-1].ts + rafs[i-1].dur, end: rafs[i].ts, gapUs });
  }
  gaps.sort((a, b) => b.gapUs - a.gapUs);

  // Top 10 longest gaps — what fills them?
  const top10 = gaps.slice(0, 10).map(g => {
    const windowEvents = eventsInWindow(events, g.start, g.end);
    // Group by event name on main thread vs others
    const mainThreadEvts = windowEvents.filter(e => e.pid === pid && e.tid === tid);
    const otherEvts = windowEvents.filter(e => !(e.pid === pid && e.tid === tid));

    const mainSummary = {};
    for (const e of mainThreadEvts) {
      mainSummary[e.name] = (mainSummary[e.name] || 0) + (e.dur ?? 0);
    }
    const otherSummary = {};
    for (const e of otherEvts) {
      const key = `${threads[`${e.pid}:${e.tid}`] || e.pid + ':' + e.tid}::${e.name}`;
      otherSummary[key] = (otherSummary[key] || 0) + (e.dur ?? 0);
    }

    return {
      gapMs: ms(g.gapUs),
      mainThread: Object.fromEntries(
        Object.entries(mainSummary).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => [k, ms(v)])
      ),
      otherThreads: Object.fromEntries(
        Object.entries(otherSummary).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => [k, ms(v)])
      ),
    };
  });

  // Paint cost: per-rAF Paint event (2 per frame: dom + canvas?)
  const paintPerFrame = [];
  for (const raf of rafs) {
    const frameEnd = raf.ts + raf.dur;
    // Paint happens AFTER rAF callback, before next rAF
    const nextRafIdx = rafs.indexOf(raf) + 1;
    const windowEnd = nextRafIdx < rafs.length ? rafs[nextRafIdx].ts : frameEnd + 100000;
    const paints = events.filter(e =>
      e.pid === pid && e.tid === tid &&
      (e.name === 'Paint' || e.name === 'PaintChunk' || e.name === 'Commit') &&
      e.ph === 'X' && e.ts >= raf.ts && e.ts < windowEnd && e.dur
    );
    const totalPaintUs = paints.reduce((s, e) => s + e.dur, 0);
    if (totalPaintUs > 0) paintPerFrame.push(totalPaintUs);
  }
  paintPerFrame.sort((a, b) => a - b);
  const pp = (pct) => paintPerFrame[Math.ceil(pct / 100 * paintPerFrame.length) - 1] ?? 0;

  // GPU process events
  const gpuPid = Object.entries(threads).find(([, name]) => name?.includes('Gpu') || name?.includes('GPU'))?.[0]?.split(':')[0];
  let gpuStats = null;
  if (gpuPid) {
    const gpuEvts = events.filter(e => e.pid === +gpuPid && e.ph === 'X' && e.dur > 0);
    const totalGpuUs = gpuEvts.reduce((s, e) => s + e.dur, 0);
    const gpuByName = {};
    for (const e of gpuEvts) { gpuByName[e.name] = (gpuByName[e.name] || 0) + e.dur; }
    gpuStats = {
      totalMs: ms(totalGpuUs),
      topByName: Object.fromEntries(
        Object.entries(gpuByName).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => [k, ms(v)])
      )
    };
  }

  // Raster thread stats
  const rasterThreads = Object.entries(threads).filter(([, name]) => name?.includes('Raster') || name?.includes('raster') || name?.includes('Compositor'));
  const rasterStats = {};
  for (const [key, name] of rasterThreads) {
    const [rPid, rTid] = key.split(':').map(Number);
    const rEvts = events.filter(e => e.pid === rPid && e.tid === rTid && e.ph === 'X' && e.dur > 0);
    const totalUs = rEvts.reduce((s, e) => s + e.dur, 0);
    const byName = {};
    for (const e of rEvts) { byName[e.name] = (byName[e.name] || 0) + e.dur; }
    rasterStats[name] = {
      totalMs: ms(totalUs),
      topByName: Object.fromEntries(
        Object.entries(byName).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => [k, ms(v)])
      )
    };
  }

  // Main thread idle vs busy
  const mainEvts = events.filter(e => e.pid === pid && e.tid === tid && e.ph === 'X' && e.dur > 0);
  const totalMainUs = mainEvts.reduce((s, e) => s + e.dur, 0);

  // Check for DrawFrame counts (display compositor frames)
  const drawFrames = events.filter(e => e.name === 'DrawFrame' && e.ph === 'X');
  const begunFrames = events.filter(e => e.name === 'BeginFrame' || e.name === 'BeginMainThreadFrame');

  return {
    label,
    rafCount: rafs.length,
    top10LongGaps: top10,
    paintPerFrameMs: {
      samples: paintPerFrame.length,
      medianMs: ms(pp(50)),
      p90Ms: ms(pp(90)),
      maxMs: ms(pp(100)),
    },
    gpuStats,
    rasterStats,
    drawFrameCount: drawFrames.length,
    begunFrameCount: begunFrames.length,
    mainThreadTotalMs: ms(totalMainUs),
  };
}

const evSlow = loadTrace(FILES.slow);
const evFast = loadTrace(FILES.fast);
const rSlow = analyze('SLOW-OVERVIEW', evSlow);
const rFast = analyze('FAST-leader', evFast);
console.log(JSON.stringify({ slow: rSlow, fast: rFast }, null, 2));
