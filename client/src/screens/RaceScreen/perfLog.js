// ============================================================
// File:        perfLog.js
// Path:        client/src/screens/RaceScreen/perfLog.js
// Description: Per-frame timing ring buffer for stutter diagnosis.
//              Tracks physics / prep / camera / render / other per frame.
//              Zero-cost when disabled — every hot path is guarded by the
//              caller's `enablePerfLog` flag before calling these functions.
//
// ── PERF-WHERE-1: AN EXPORT NOW SAYS WHERE IN THE RACE IT WAS TAKEN ─────────────────────────────
//
// THE DEFECT IT EXISTS FOR. The owner has two recordings, 3 ms and 7.7 ms per step, and they could
// not be compared — because neither says which moment of which race it came from. PHYS-BENCH-1 then
// had to spend a whole block establishing from the outside what the export could have said for free:
// that the cost is quadratic in the FIELD SIZE and nearly flat in density, so two numbers 2.57x
// apart are a field 1.6x larger. Every future recording would have been spoiled the same way.
//
// So `exportPerfLog` takes an optional CONTEXT and writes it into the file: elapsed physics time,
// the lap, how spread the field is, the field size, the roster, and whether the names toggle was on.
//
// IT IS GATHERED AT EXPORT TIME, NOT PER FRAME, and that is a deliberate limit rather than laziness.
// A diagnostic that adds a per-frame statistic changes the thing it measures — the same rule
// PHYS-BENCH-1 was held to. The field spread is one pass over the racers when the owner clicks
// export; the rest are values the engine already keeps (`st.physicsTs`, `r.lap`, `r.t`). Nothing new
// is computed on any frame, and when the log is off nothing here runs at all.
//
// ── THE 50 ms CAP ON `total`, AND WHAT WAS DONE ABOUT IT ────────────────────────────────────────
//
// `total` is `rawDt`, and RaceScreen computes it as `Math.min(ts - lastTs, 50)`. That cap is
// LOAD-BEARING and is not touched: `rawDt` feeds the physics accumulator, so removing it would let a
// 400 ms stall fast-forward the race. But it means `total`'s p90, p99 and max all read exactly 50.00
// once anything goes wrong, and a 60 ms hiccup becomes indistinguishable from a tab that was
// descheduled for half a second — which is the ONE distinction those percentiles exist to make.
//
// THE CHOICE, and why it is this one: the uncapped delta is RECORDED BESIDE it as `totalUncapped`,
// AND the cap is stated in the legend. Merely documenting the cap tells a reader the number is wrong
// without telling them by how much, which does not let them size the worst frame. Recording it costs
// one subtraction per frame, only when the log is on. Both, because they answer different halves.
//
// ── FRAME-GAP-1: SPLITTING `other`, WHICH IS WHERE THE TIME ACTUALLY WENT ───────────────────────
//
// THE DEFECT THIS EXISTS FOR. At 100 racers the owner's own log reads physics 2.6 ms, render 3.3,
// camera 0.4 — six to eight milliseconds of a 16.7 ms frame — and 40 % of frames still take 33.3 ms.
// Ten to twenty-eight milliseconds sit in `other`, and `other` is a SUBTRACTION (`rawDt - measured`),
// not a measurement: it is the name of our ignorance, and it can be shortened by nothing we write.
// Shrinking the browser WINDOW moved 90 % of frames back to 16.7 ms while the canvas backing store
// stayed a constant 1280x720 — so the cost scales with window area and lives outside our JavaScript.
//
// TWO FIELDS SPLIT IT, and between them they separate "the browser was late to us" from "we were
// slow once we had the frame":
//
//   `rafLate` — `performance.now()` at callback entry MINUS the timestamp rAF hands in. The rAF
//     timestamp is the frame's nominal start; the gap to when our code actually begins is how long
//     the browser spent on ITSELF first — style, layout, paint, compositing, other tasks. It is the
//     part of the frame no faster draw code of ours can shorten. If `rafLate` accounts for most of
//     `other`, the answer is not in our draw code and looking harder at it is wasted effort.
//
//   `longTasks` — a `PerformanceObserver` on `longtask`, counting the ≥50 ms blocks the browser
//     knows about, with `attribution` where it provides it. See `startLongTaskObserver`.
//
// WHAT `rafLate` IS NOT. It is not "browser overhead per frame" in general: work the browser does
// AFTER our callback returns — the composite of what we just drew — lands in the NEXT frame's
// `rafLate`, not this one's. That is a real property of the measurement rather than a flaw, and it
// is why the two must be read as a window rather than frame by frame.
// ============================================================

const RING_SIZE = 600; // 10 s at 60 fps
const SPIKE_COUNT = 50; // worst frames retained in spike buffer
export const SPIKE_MIN_MS = 20; // only frames ≥ this are spike candidates

/**
 * Create a fresh perfLog object. Call once at race start when enablePerfLog is on.
 * Pre-allocates the ring buffer to avoid per-frame allocations.
 */
export function createPerfLog() {
  return {
    ring: Array.from({ length: RING_SIZE }, () => ({
      fi: 0,
      ts: 0,
      total: 0, // rawDt — wall time from rAF (ms), CAPPED at 50 by the caller
      totalUncapped: 0, // the same delta with no cap — see the header on the 50 ms cap
      physics: 0, // clearRect + EMA + physics while-loop (ms)
      prep: 0, // particles + diagData inside RACING branch (ms)
      camera: 0, // renderBuf + cam.update + hudState sync (ms)
      render: 0, // all canvas drawing (ms)
      measured: 0, // physics+prep+camera+render (ms)
      other: 0, // total - measured (GC, scheduler, GPU flush)
      nRacers: 0,
      // Framerate-dependence diagnostics (read-only mirrors of the physics accumulator state):
      physSteps: 0, // FIXED_DT catch-up steps executed this frame (index.jsx ~857, capped at 2)
      physAdvancedMs: 0, // physics-time advanced this frame = physSteps × FIXED_DT (ms)
      physAccum: 0, // st.physicsAccum after the catch-up loop (backlog, ms)
      capHit: 0, // 1 if the step cap was reached AND accum ≥ FIXED_DT remained (fell further behind)
      // FRAME-GAP-1: how long the BROWSER was busy before it handed us this frame — see the header.
      rafLate: 0,
    })),
    ringHead: 0,
    ringCount: 0,
    frameIdx: 0,
    spikes: [], // up to SPIKE_COUNT worst frames (sorted desc by total on demand)
    // FRAME-GAP-1: long-task tally for the CURRENT ring window. `supported` is three-valued on
    // purpose — an environment without the API must not look like an environment with no long tasks.
    longTasks: { supported: null, count: 0, totalMs: 0, maxMs: 0, attribution: {} },
    _longTaskObserver: null,
  };
}

/**
 * FRAME-GAP-1 — start the long-task observer for this log, if the browser has one.
 *
 * WHY AN OBSERVER AND NOT A BRACKET. A long task is by definition work that ran when our rAF
 * callback was NOT running, so no `performance.now()` pair of ours can measure it. The browser is
 * the only thing that can see it, and `PerformanceObserver` is how it says so.
 *
 * `supported` is null / true / false, never a bare 0 count. "No long tasks" and "this browser cannot
 * tell you about long tasks" are opposite conclusions, and reporting the second as the first is how
 * a diagnosis talks itself out of the right answer (the brief asks for exactly this distinction).
 *
 * ZERO COST WHEN THE LOG IS OFF: nothing here runs unless `createPerfLog` was called, which the
 * caller already guards on `enablePerfLog`.
 *
 * @param {object} log  from createPerfLog()
 * @returns {object} the same log, for chaining
 */
export function startLongTaskObserver(log) {
  if (!log) return log;
  const PO = typeof PerformanceObserver !== 'undefined' ? PerformanceObserver : null;
  const types = PO?.supportedEntryTypes;
  if (!PO || !Array.isArray(types) || !types.includes('longtask')) {
    log.longTasks.supported = false;
    return log;
  }
  try {
    const obs = new PO((list) => {
      for (const e of list.getEntries()) {
        log.longTasks.count++;
        log.longTasks.totalMs += e.duration;
        if (e.duration > log.longTasks.maxMs) log.longTasks.maxMs = e.duration;
        // `attribution` is where the browser names WHAT was slow. Chrome fills it with a
        // TaskAttributionTiming whose containerType/containerName say "this iframe" or "this script";
        // most browsers leave it empty, which is why the key is a tally and not a promise.
        for (const a of e.attribution ?? []) {
          const key = `${a.containerType ?? 'unknown'}:${a.containerName || a.containerId || a.name || '—'}`;
          log.longTasks.attribution[key] = (log.longTasks.attribution[key] ?? 0) + 1;
        }
      }
    });
    obs.observe({ entryTypes: ['longtask'] });
    log._longTaskObserver = obs;
    log.longTasks.supported = true;
  } catch {
    // Present in `supportedEntryTypes` and still refused: record the refusal, not a zero.
    log.longTasks.supported = false;
  }
  return log;
}

/** Stop the observer. Safe to call when none was started. */
export function stopLongTaskObserver(log) {
  try {
    log?._longTaskObserver?.disconnect();
  } catch {
    /* a disconnect that throws must not take the race down */
  }
  if (log) log._longTaskObserver = null;
}

/**
 * Record one frame into the log.
 * Called at the END of each rAF tick when enablePerfLog is on.
 *
 * @param {object} log         from createPerfLog()
 * @param {number} ts          rAF DOMHighResTimeStamp
 * @param {number} rawDt       wall time since last rAF (ms, already capped)
 * @param {number} t0          performance.now() at loop entry (0 if disabled)
 * @param {number} tPhys       performance.now() after physics while-loop
 * @param {number} tPreCam     performance.now() after particles + render-interp
 * @param {number} tCam        performance.now() after camDir.update
 * @param {number} tRend       performance.now() after all drawing
 * @param {number} nRacers     racer count this frame
 * @param {number} physSteps   FIXED_DT catch-up steps executed this frame (0 on non-physics frames)
 * @param {number} physAdvancedMs physics-time advanced this frame (physSteps × FIXED_DT, ms)
 * @param {number} physAccum    st.physicsAccum after the catch-up loop (backlog, ms)
 * @param {number} capHit       1 if the step cap was reached and backlog remained, else 0
 * @param {number} rawDtUncapped the SAME wall delta with no 50 ms cap applied (PERF-WHERE-1).
 *   Defaults to `rawDt` so a caller that does not supply it records the capped value twice rather
 *   than a zero that would read as an impossibly fast frame.
 */
export function recordPerfFrame(
  log,
  ts,
  rawDt,
  t0,
  tPhys,
  tPreCam,
  tCam,
  tRend,
  nRacers,
  physSteps = 0,
  physAdvancedMs = 0,
  physAccum = 0,
  capHit = 0,
  rawDtUncapped = rawDt,
  rafLate = 0
) {
  const physMs = tPhys - t0;
  const prepMs = tPreCam - tPhys;
  const camMs = tCam - tPreCam;
  const rendMs = tRend - tCam;
  const measured = tRend - t0;
  const other = rawDt - measured;

  const fi = log.frameIdx++;
  const slot = log.ring[log.ringHead];
  slot.fi = fi;
  slot.ts = ts;
  slot.total = rawDt;
  slot.totalUncapped = rawDtUncapped;
  slot.physics = physMs;
  slot.prep = prepMs;
  slot.camera = camMs;
  slot.render = rendMs;
  slot.measured = measured;
  slot.other = other;
  slot.nRacers = nRacers;
  slot.physSteps = physSteps;
  slot.physAdvancedMs = physAdvancedMs;
  slot.physAccum = physAccum;
  slot.capHit = capHit;
  slot.rafLate = rafLate;

  log.ringHead = (log.ringHead + 1) % RING_SIZE;
  if (log.ringCount < RING_SIZE) log.ringCount++;

  // Spike capture: push then lazily sort+trim when buffer doubles.
  if (rawDt >= SPIKE_MIN_MS) {
    log.spikes.push({
      fi,
      ts,
      total: rawDt,
      totalUncapped: rawDtUncapped,
      physics: physMs,
      prep: prepMs,
      camera: camMs,
      render: rendMs,
      other,
      nRacers,
    });
    if (log.spikes.length > SPIKE_COUNT * 2) {
      log.spikes.sort((a, b) => b.total - a.total);
      log.spikes.length = SPIKE_COUNT;
    }
  }
}

/**
 * Compute percentile stats over the ring buffer.
 * Called from the HUD poll (every 200 ms) — not per-frame.
 */
export function getPerfStats(log) {
  const n = log.ringCount;
  if (n === 0) return null;

  const totals = new Array(n);
  const uncapped = new Array(n);
  const physics = new Array(n);
  const prep = new Array(n);
  const camera = new Array(n);
  const render = new Array(n);
  // FRAME-GAP-1: the browser's own head start on each frame, summarised like every other bracket.
  const rafLate = new Array(n);
  const start = log.ringCount < RING_SIZE ? 0 : log.ringHead;

  for (let k = 0; k < n; k++) {
    const f = log.ring[(start + k) % RING_SIZE];
    totals[k] = f.total;
    uncapped[k] = f.totalUncapped;
    physics[k] = f.physics;
    prep[k] = f.prep;
    camera[k] = f.camera;
    render[k] = f.render;
    rafLate[k] = f.rafLate;
  }
  rafLate.sort((a, b) => a - b);
  totals.sort((a, b) => a - b);
  uncapped.sort((a, b) => a - b);
  physics.sort((a, b) => a - b);
  prep.sort((a, b) => a - b);
  camera.sort((a, b) => a - b);
  render.sort((a, b) => a - b);

  const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(((arr.length - 1) * p) / 100))];

  return {
    n,
    total: {
      p50: pct(totals, 50),
      p90: pct(totals, 90),
      p99: pct(totals, 99),
      max: totals[totals.length - 1],
    },
    // The same frames with no 50 ms cap. `total.max` saturates at exactly 50 the moment anything
    // goes wrong; this one says how bad the worst frame really was.
    totalUncapped: {
      p50: pct(uncapped, 50),
      p90: pct(uncapped, 90),
      p99: pct(uncapped, 99),
      max: uncapped[uncapped.length - 1],
    },
    physics: {
      p50: pct(physics, 50),
      p90: pct(physics, 90),
      p99: pct(physics, 99),
      max: physics[physics.length - 1],
    },
    prep: {
      p50: pct(prep, 50),
      p90: pct(prep, 90),
      p99: pct(prep, 99),
      max: prep[prep.length - 1],
    },
    camera: {
      p50: pct(camera, 50),
      p90: pct(camera, 90),
      p99: pct(camera, 99),
      max: camera[camera.length - 1],
    },
    render: {
      p50: pct(render, 50),
      p90: pct(render, 90),
      p99: pct(render, 99),
      max: render[render.length - 1],
    },
    // FRAME-GAP-1. Read this against `other`: if they track each other, the frame is long because
    // the browser was busy before it reached us, and our brackets are not where the time is.
    rafLate: {
      p50: pct(rafLate, 50),
      p90: pct(rafLate, 90),
      p99: pct(rafLate, 99),
      max: rafLate[rafLate.length - 1],
    },
    // Not percentiles: a tally over the window, and `supported` is three-valued (null = the observer
    // was never started, false = this browser has no long-task API, true = the counts below are real).
    longTasks: {
      supported: log.longTasks?.supported ?? null,
      count: log.longTasks?.count ?? 0,
      totalMs: log.longTasks?.totalMs ?? 0,
      maxMs: log.longTasks?.maxMs ?? 0,
      attribution: { ...(log.longTasks?.attribution ?? {}) },
    },
  };
}

/**
 * Framerate-dependence stats over the ring window. Answers: does physics keep pace with
 * wall-clock time? Called from the HUD poll (not per-frame).
 *
 * physMsPerRealSec — the KEY metric. Sum of physics-time advanced ÷ sum of wall-clock time × 1000.
 *   ~1000 ⇒ framerate-independent. <1000 under load ⇒ physics falling behind (catch-up cap starving
 *   it); >1000 ⇒ catching up after load drops. NOTE: intentional BATTLE slowmo also lowers this
 *   (physics advances slower by design), so read it together with capHits to separate the two.
 */
export function getPhysicsPaceStats(log) {
  const n = log.ringCount;
  if (n === 0) return null;
  const start = log.ringCount < RING_SIZE ? 0 : log.ringHead;

  let sumSteps = 0;
  let maxSteps = 0;
  let capHits = 0;
  let sumAdvanced = 0;
  let sumTotal = 0;
  for (let k = 0; k < n; k++) {
    const f = log.ring[(start + k) % RING_SIZE];
    sumSteps += f.physSteps;
    if (f.physSteps > maxSteps) maxSteps = f.physSteps;
    capHits += f.capHit;
    sumAdvanced += f.physAdvancedMs;
    sumTotal += f.total;
  }
  const last = log.ring[(start + n - 1) % RING_SIZE];
  // Backlog trend: current accum vs the accum ~1 s (≈60 frames) earlier, clamped to the window.
  const back = log.ring[(start + Math.max(0, n - 1 - 60)) % RING_SIZE];

  return {
    n,
    meanSteps: sumSteps / n,
    maxSteps,
    capHits,
    capHitRate: capHits / n,
    physMsPerRealSec: sumTotal > 0 ? (sumAdvanced * 1000) / sumTotal : 0,
    currentAccumMs: last.physAccum,
    accumTrendMs: last.physAccum - back.physAccum,
    nRacers: last.nRacers,
  };
}

/**
 * WHERE IN THE RACE THIS LOG WAS TAKEN (PERF-WHERE-1) — built ONCE, at export.
 *
 * Everything here is either a value the engine already keeps or one pass over the racers. No new
 * per-frame statistic is introduced for a diagnostic; that rule is the whole reason this is a
 * function called at export rather than four more columns in the ring buffer.
 *
 * @param {{physicsTs?: number, maxLaps?: number, finishedCount?: number,
 *          racers?: Array<{t?: number, lap?: number, finished?: boolean, name?: string}>}} st
 *   the live race state (`g.current` in RaceScreen)
 * @param {{namesOn?: boolean, roster?: string}} [extra]  what only the caller can know
 * @returns {object|null} null when there is no race to describe
 */
export function buildPerfContext(st, extra = {}) {
  if (!st || !Array.isArray(st.racers) || st.racers.length === 0) return null;
  const racers = st.racers;

  // LEADER-TO-LAST ALONG THE TRACK, over the racers still running. `t` is the along-track parameter
  // the engine already advances, so this is a read, not a new measurement. Finished racers are
  // excluded because a field of one runner and thirty-nine finishers is not a spread-out field.
  let leaderT = -Infinity;
  let lastT = Infinity;
  let leaderLap = 0;
  let running = 0;
  for (const r of racers) {
    if (!r || r.finished) continue;
    running++;
    const t = r.t ?? 0;
    if (t > leaderT) leaderT = t;
    if (t < lastT) lastT = t;
    if ((r.lap ?? 0) > leaderLap) leaderLap = r.lap ?? 0;
  }
  const haveRunners = running > 0;

  return {
    // WHEN. Physics time, not wall time: two logs taken at the same physics moment are comparable
    // even if one machine took twice as long to get there.
    physicsMs: Math.round(st.physicsTs ?? 0),
    physicsSec: +((st.physicsTs ?? 0) / 1000).toFixed(2),
    leaderLap,
    maxLaps: st.maxLaps ?? null,
    raceProgress: st.raceProgress != null ? +st.raceProgress.toFixed(4) : null,
    // HOW SPREAD. In the same `t` units the engine runs in, so it needs no conversion to be compared
    // between two logs — which is the only thing it is for.
    spreadT: haveRunners ? +(leaderT - lastT).toFixed(5) : null,
    leaderT: haveRunners ? +leaderT.toFixed(5) : null,
    lastT: haveRunners ? +lastT.toFixed(5) : null,
    // WHO. Field size was already in every frame; these two were not, and PHYS-BENCH-1 and
    // LABEL-BENCH-1 have just shown that both matter.
    nRacers: racers.length,
    running,
    finishedCount: st.finishedCount ?? 0,
    roster: extra.roster ?? null,
    namesOn: extra.namesOn ?? null,
  };
}

/**
 * Serialize the log to JSON for clipboard/download.
 * Includes stats, top-50 spikes, and last 120 frames for context.
 *
 * @param {object} log      from createPerfLog()
 * @param {object|null} [context]  from buildPerfContext() — omitted, the file simply has no
 *   `context` key, exactly as before. PERF-WHERE-1.
 */
export function exportPerfLog(log, context = null) {
  const stats = getPerfStats(log);
  const paceStats = getPhysicsPaceStats(log);
  const n = Math.min(log.ringCount, 120);
  const start =
    log.ringCount < RING_SIZE
      ? Math.max(0, log.ringCount - n)
      : (log.ringHead + RING_SIZE - n) % RING_SIZE;

  const frames = [];
  for (let k = 0; k < n; k++) {
    const f = log.ring[(start + k) % RING_SIZE];
    frames.push({
      fi: f.fi,
      ts: +f.ts.toFixed(1),
      total: +f.total.toFixed(2),
      totalUncapped: +(f.totalUncapped ?? f.total).toFixed(2),
      physics: +f.physics.toFixed(2),
      prep: +f.prep.toFixed(2),
      camera: +f.camera.toFixed(2),
      render: +f.render.toFixed(2),
      other: +f.other.toFixed(2),
      nRacers: f.nRacers,
      physSteps: f.physSteps,
      physAccum: +f.physAccum.toFixed(2),
      capHit: f.capHit,
      // FRAME-GAP-1: exported per frame, because the whole point is to read it BESIDE `other`.
      rafLate: +(f.rafLate ?? 0).toFixed(2),
    });
  }

  const spikes = [...log.spikes]
    .sort((a, b) => b.total - a.total)
    .slice(0, SPIKE_COUNT)
    .map((f) => ({
      fi: f.fi,
      ts: +f.ts.toFixed(1),
      total: +f.total.toFixed(2),
      totalUncapped: +(f.totalUncapped ?? f.total).toFixed(2),
      physics: +f.physics.toFixed(2),
      prep: +f.prep.toFixed(2),
      camera: +f.camera.toFixed(2),
      render: +f.render.toFixed(2),
      other: +f.other.toFixed(2),
      nRacers: f.nRacers,
    }));

  return JSON.stringify(
    {
      _legend: {
        total:
          'rAF delta — wall time between rAF callbacks (ms). CAPPED AT 50 by RaceScreen, because ' +
          'this value feeds the physics accumulator and an uncapped stall would fast-forward the ' +
          'race. So p90/p99/max saturate at exactly 50.00 — read totalUncapped for the real worst ' +
          'frame.',
        totalUncapped:
          'the same rAF delta with NO cap (ms). The only honest reading of the worst frames; ' +
          'never feeds physics, recorded for diagnosis only.',
        physics:
          'canvas clear + EMA + physics while-loop (applyRacerBehavior, all pair-loop work) (ms)',
        prep: 'renderAlpha + diagData + particle spawn/advance inside RACING branch; burst advance for FINISHED (ms)',
        camera:
          'renderBuf lerp setup + raceState build + CameraDirector.update + hudState sync (ms)',
        render: 'all canvas drawing — world transform, track, racers, overlays, minimap (ms)',
        other: 'total - measured — GC pauses, scheduler jitter, GPU flush (ms)',
        rafLate:
          'FRAME-GAP-1. performance.now() at callback entry MINUS the timestamp rAF handed in ' +
          '(ms) — how long the browser spent on ITSELF (style, layout, paint, composite, other ' +
          'tasks) before it reached our code. THIS IS THE HALF OF `other` THAT NO CHANGE TO OUR ' +
          'DRAW CODE CAN SHORTEN: read it against `other`, and if the two track each other the ' +
          'frame is long because the browser was late, not because we were slow. Note the work the ' +
          'browser does AFTER our callback returns — compositing what we just drew — lands in the ' +
          'NEXT frame’s rafLate, so read these as a window, not frame by frame.',
        longTasks:
          'FRAME-GAP-1. Blocks of ≥50 ms the browser reports via PerformanceObserver, which is the ' +
          'only thing that can see work running while our callback was NOT. `supported` is ' +
          'three-valued ON PURPOSE — null = never started, false = this browser has no long-task ' +
          'API, true = the counts are real. A browser that cannot report long tasks must never look ' +
          'like a browser with none. `attribution` is filled only where the browser provides it.',
        sumCheck:
          'physics + prep + camera + render ≈ measured ≈ total (other should be small on smooth frames)',
        physMsPerRealSec:
          'physics-time advanced per real second (~1000 = framerate-independent; <1000 = physics behind, >1000 = catching up; slowmo also lowers it)',
        physSteps: 'FIXED_DT catch-up steps this frame (capped at 2)',
        physAccum: 'physics backlog after the catch-up loop (ms)',
        capHit: 'cap reached and backlog ≥ FIXED_DT remained (physics fell further behind)',
        context:
          'WHERE in the race this log was taken — physics time, lap, field spread (leader-to-last ' +
          'in the engine’s own `t` units, running racers only), field size, roster and whether ' +
          'the names toggle was on. Two logs without this cannot be compared: cost is quadratic in ' +
          'FIELD SIZE and nearly flat in density (PHYS-BENCH-1), so the field size is the first ' +
          'thing to check before reading anything else here.',
      },
      // PERF-WHERE-1. Absent entirely when no context was supplied, rather than present-and-null:
      // a reader must be able to tell an OLD export from one taken during a race that had nothing
      // to say about itself.
      ...(context ? { context } : {}),
      stats,
      paceStats,
      spikes,
      recentFrames: frames,
    },
    null,
    2
  );
}
