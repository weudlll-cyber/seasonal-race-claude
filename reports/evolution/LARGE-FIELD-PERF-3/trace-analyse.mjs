// ============================================================
// File:        trace-analyse.mjs
// Path:        reports/evolution/LARGE-FIELD-PERF-3/trace-analyse.mjs
// Project:     RaceArena — LARGE-FIELD-PERF-3 (2026-10-05)
// Description: Reads the Chrome performance traces and canvas censuses that
//              `../LARGE-FIELD-PERF-2/run.mjs` records ("trace": true / "census": true) and answers,
//              for the slow frames (over 33 ms): how long the GPU process, the display compositor and
//              the page's own threads were busy, how much of it was rasterizing the 2D canvas and how
//              much compositing, and which canvas 2D calls the page issued per frame and from where.
//
// HOW A TRACE EVENT LANDS ON A FRAME
//   The harness records each frame's rAF start on the page clock, and at a recorded page time it calls
//   `console.timeStamp('ra-calib')`, which the trace stores as a TimeStamp event on the trace clock.
//   The difference moves every trace event onto the page clock. An event then contributes the part of
//   its duration that overlaps a frame's [start, start + gap) window. Only TOP-LEVEL tasks
//   (`ThreadControllerImpl::RunTask`) are summed per thread, so nested events are never counted twice;
//   the named sub-events (raster, flush, draw-and-swap) are summed separately, as parts of those tasks.
//
// HOW A CENSUS CALL SITE BECOMES A SOURCE LINE
//   The census samples `new Error().stack` for every 97th expensive call. Each stack line carries the
//   bundle position of the CALL (not of a function's start), which the build's source maps turn into
//   the original file and line (`source-map-js`, already a dependency).
//
// Usage:
//   node --max-old-space-size=4096 trace-analyse.mjs <raw-dir> <dist-dir-with-maps>
// ============================================================

import { createReadStream, readFileSync, readdirSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { createRequire } from "node:module";

const [, , rawDir, distDir] = process.argv;
const require = createRequire(join(process.cwd(), "client", "package.json"));
const { SourceMapConsumer } = require("source-map-js");

// ── what is summed, per thread ──────────────────────────────────────────────────────────────────
// [label, process name, thread name prefix]
const THREADS = [
  ["GPU process main thread", "GPU Process", "CrGpuMain"],
  ["display compositor (viz)", "GPU Process", "VizCompositorThread"],
  ["page main thread", "Renderer", "CrRendererMain"],
  ["page compositor thread", "Renderer", "Compositor"],
];
// Named sub-events, summed as parts of the GPU process's and the compositor's work.
const PARTS = {
  "RasterDecoderImpl::DoRasterCHROMIUM":
    "canvas raster (2D draw calls executed)",
  "RasterDecoderImpl::DoEndRasterCHROMIUM": "canvas raster flush",
  "SkiaOutputSurfaceImplOnGpu::FinishPaintRenderPass":
    "compositing: drawing the layers",
  "SkiaOutputSurfaceImplOnGpu::SwapBuffers": "compositing: present",
  "Display::DrawAndSwap": "viz: draw and swap",
  FireAnimationFrame: "page: rAF callbacks (our JavaScript)",
  Paint: "page: paint",
  "LayerTreeHost::DoUpdateLayers": "page: update layers",
};
const TOP = "ThreadControllerImpl::RunTask";

function moment(frames) {
  const total = frames.reduce((a, [g]) => a + g, 0);
  let acc = 0;
  return frames.map(([g, state]) => {
    acc += g;
    if (acc < 2000) return "startup";
    if (acc > total * 0.9)
      return state === "OVERVIEW" ? "ending, wide shot" : "ending, other shot";
    return "running";
  });
}

/** Overlap-sum sorted intervals onto sorted frame windows; returns ms per frame. */
function onFrames(intervals, frames) {
  intervals.sort((a, b) => a[0] - b[0]);
  const out = new Float64Array(frames.length);
  let j0 = 0;
  for (let k = 0; k < frames.length; k++) {
    const s = frames[k][2];
    const e = s + frames[k][0];
    while (j0 < intervals.length && intervals[j0][1] <= s) j0++;
    for (let j = j0; j < intervals.length && intervals[j][0] < e; j++) {
      const o = Math.min(e, intervals[j][1]) - Math.max(s, intervals[j][0]);
      if (o > 0) out[k] += o;
    }
  }
  return out;
}

async function readTrace(file) {
  const threadName = new Map();
  const procName = new Map();
  const raw = []; // [pidTid, name, ts, dur] for the events we keep
  let calibTs = null;
  const rl = createInterface({
    input: createReadStream(file),
    crlfDelay: Infinity,
  });
  for await (let line of rl) {
    line = line.trim();
    if (!line.startsWith('{"')) continue;
    if (line.endsWith(",")) line = line.slice(0, -1);
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }
    if (e.ph === "M") {
      if (e.name === "thread_name")
        threadName.set(`${e.pid}:${e.tid}`, e.args.name);
      if (e.name === "process_name") procName.set(e.pid, e.args.name);
      continue;
    }
    if (e.name === "TimeStamp" && e.args?.data?.message === "ra-calib")
      calibTs = e.ts;
    if (e.ph !== "X" || !e.dur) continue;
    if (e.name !== TOP && !(e.name in PARTS)) continue;
    raw.push([`${e.pid}:${e.tid}`, e.name, e.ts, e.dur]);
  }
  return { threadName, procName, raw, calibTs };
}

// ── traces ──────────────────────────────────────────────────────────────────────────────────────
const groups = new Map();
const files = readdirSync(rawDir)
  .filter((f) => f.endsWith(".trace.json"))
  .sort();
for (const f of files) {
  const run = JSON.parse(
    readFileSync(
      join(rawDir, f.replace(".trace.json", ".frames.json")),
      "utf8",
    ),
  );
  const key = `${run.track} ${run.n}`;
  if (!groups.has(key))
    groups.set(key, {
      races: 0,
      seeds: [],
      slow: 0,
      frames: 0,
      rows: new Map(),
    });
  const g = groups.get(key);
  const t = await readTrace(join(rawDir, f));
  if (t.calibTs === null) {
    console.error(`${f}: no calibration mark — skipped`);
    continue;
  }
  g.races++;
  g.seeds.push(run.seed);
  const toPage = (ts) => (ts - t.calibTs) / 1000 + run.calibAt;
  const label = (pt) => {
    const [pid] = pt.split(":");
    const proc = t.procName.get(Number(pid)) ?? "";
    const th = t.threadName.get(pt) ?? "";
    const hit = THREADS.find(
      ([, p, prefix]) => proc === p && th.startsWith(prefix),
    );
    return hit ? hit[0] : null;
  };
  const series = new Map(); // row label -> intervals on the page clock
  for (const [pt, name, ts, dur] of t.raw) {
    const thLabel = label(pt);
    if (!thLabel) continue;
    const row = name === TOP ? `${thLabel}: busy` : PARTS[name];
    if (!series.has(row)) series.set(row, []);
    const s = toPage(ts);
    series.get(row).push([s, s + dur / 1000]);
  }
  const frames = run.frames;
  const when = moment(frames);
  g.frames += frames.length;
  for (const [row, iv] of series) {
    const per = onFrames(iv, frames);
    if (!g.rows.has(row))
      g.rows.set(row, { slow: 0, normal: 0, endingSlow: 0 });
    const r = g.rows.get(row);
    frames.forEach(([gap], k) => {
      if (gap > 33) {
        r.slow += per[k];
        if (when[k] === "ending, wide shot") r.endingSlow += per[k];
      } else r.normal += per[k];
    });
  }
  g.slowCount ??= 0;
  g.normalCount ??= 0;
  g.endingSlowCount ??= 0;
  g.slowMs ??= 0;
  frames.forEach(([gap], k) => {
    if (gap > 33) {
      g.slowCount++;
      g.slowMs += gap;
      if (when[k] === "ending, wide shot") g.endingSlowCount++;
    } else g.normalCount++;
  });
  console.error(`${f}: ${frames.length} frames`);
}

for (const [key, g] of [...groups].sort()) {
  console.log(
    `\n## ${key} — N = ${g.races} traced races, ${g.frames} frames, ${g.slowCount} over 33 ms`,
  );
  console.log(`Quick Test seeds: ${g.seeds.join(", ")}`);
  console.log(
    `mean frame time of a slow frame: ${(g.slowMs / g.slowCount).toFixed(1)} ms`,
  );
  console.log(
    "| per frame, ms | slow frame (N = " +
      g.slowCount +
      ") | normal frame (N = " +
      g.normalCount +
      ") | slow frame in the ending wide shot (N = " +
      g.endingSlowCount +
      ") |",
  );
  console.log("| --- | --- | --- | --- |");
  for (const [row, r] of [...g.rows].sort(
    (a, b) => b[1].slow / g.slowCount - a[1].slow / g.slowCount,
  )) {
    const e = g.endingSlowCount
      ? (r.endingSlow / g.endingSlowCount).toFixed(1)
      : "-";
    console.log(
      `| ${row} | ${(r.slow / g.slowCount).toFixed(1)} | ${(r.normal / g.normalCount).toFixed(1)} | ${e} |`,
    );
  }
}

// ── censuses ────────────────────────────────────────────────────────────────────────────────────
const consumers = new Map();
function mapSite(stackLine) {
  const m = /(https?:\/\/[^\s)]+\/assets\/([^:\s)]+)):(\d+):(\d+)/.exec(
    stackLine,
  );
  if (!m) return stackLine.trim();
  const file = m[2];
  if (!consumers.has(file)) {
    try {
      consumers.set(
        file,
        new SourceMapConsumer(
          JSON.parse(
            readFileSync(join(distDir, "assets", `${file}.map`), "utf8"),
          ),
        ),
      );
    } catch {
      consumers.set(file, null);
    }
  }
  const c = consumers.get(file);
  if (!c) return `${file}:${m[3]}`;
  const p = c.originalPositionFor({
    line: Number(m[3]),
    column: Number(m[4]) - 1,
  });
  return `${(p.source ?? file).replace(/^(\.\.\/)+/, "")}:${p.line}`;
}

const census = new Map();
for (const f of readdirSync(rawDir)
  .filter((x) => x.endsWith(".census.json"))
  .sort()) {
  const c = JSON.parse(readFileSync(join(rawDir, f), "utf8"));
  const key = `${c.track} ${c.n}`;
  if (!census.has(key))
    census.set(key, {
      races: 0,
      seeds: [],
      frames: 0,
      endFrames: 0,
      sum: {},
      endSum: {},
      sites: new Map(),
      shapes: [],
    });
  const g = census.get(key);
  g.races++;
  g.seeds.push(c.seed);
  g.shapes.push(...c.shapes);
  const total = c.frames.length;
  c.frames.forEach((fr, k) => {
    g.frames++;
    const inEnding = k > total * 0.9;
    if (inEnding) g.endFrames++;
    for (const [kind, n] of Object.entries(fr)) {
      g.sum[kind] = (g.sum[kind] ?? 0) + n;
      if (inEnding) g.endSum[kind] = (g.endSum[kind] ?? 0) + n;
    }
  });
  for (const [k, n] of c.sites) {
    const [kind, stack] = k.split(" | ");
    const where = (stack ?? "")
      .split(" <- ")
      .slice(0, 2)
      .map(mapSite)
      .join(" ← ");
    const sk = `${kind} @ ${where}`;
    g.sites.set(sk, (g.sites.get(sk) ?? 0) + n);
  }
}
for (const [key, g] of [...census].sort()) {
  console.log(
    `\n## census ${key} — N = ${g.races} races (Quick Test seeds ${g.seeds.join(", ")}), ${g.frames} frames`,
  );
  const shape = g.shapes[0];
  if (shape)
    console.log(
      `canvases: ${shape.canvases.map((c) => `${c.which ?? "?"} backing ${c.backing} on screen ${c.onScreen}`).join("; ")} · devicePixelRatio ${shape.devicePixelRatio} · layers ${g.shapes.map((s) => s.layers).join(", ")}`,
    );
  console.log(
    "2D calls per frame (mean over all frames · last tenth of the race):",
  );
  for (const [kind, n] of Object.entries(g.sum).sort((a, b) => b[1] - a[1])) {
    console.log(
      `  ${kind.padEnd(26)} ${(n / g.frames).toFixed(1).padStart(8)}  ·  ${((g.endSum[kind] ?? 0) / Math.max(1, g.endFrames)).toFixed(1)}`,
    );
  }
  const totalSampled = [...g.sites.values()].reduce((a, b) => a + b, 0);
  console.log(
    `call sites of the expensive kinds (sampled every 97th call; N = ${totalSampled} samples):`,
  );
  for (const [k, n] of [...g.sites].sort((a, b) => b[1] - a[1]).slice(0, 14)) {
    console.log(
      `  ${String(n).padStart(6)}  ${((100 * n) / totalSampled).toFixed(1).padStart(5)} %  ${k}`,
    );
  }
}
