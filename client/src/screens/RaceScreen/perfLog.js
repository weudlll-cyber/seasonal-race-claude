// ============================================================
// File:        perfLog.js
// Path:        client/src/screens/RaceScreen/perfLog.js
// Description: Per-frame timing ring buffer for stutter diagnosis.
//              Tracks physics / prep / camera / render / other per frame.
//              Zero-cost when disabled — every hot path is guarded by the
//              caller's `enablePerfLog` flag before calling these functions.
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
      total: 0, // rawDt — wall time from rAF (ms)
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
    })),
    ringHead: 0,
    ringCount: 0,
    frameIdx: 0,
    spikes: [], // up to SPIKE_COUNT worst frames (sorted desc by total on demand)
  };
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
  capHit = 0
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

  log.ringHead = (log.ringHead + 1) % RING_SIZE;
  if (log.ringCount < RING_SIZE) log.ringCount++;

  // Spike capture: push then lazily sort+trim when buffer doubles.
  if (rawDt >= SPIKE_MIN_MS) {
    log.spikes.push({
      fi,
      ts,
      total: rawDt,
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
  const physics = new Array(n);
  const prep = new Array(n);
  const camera = new Array(n);
  const render = new Array(n);
  const start = log.ringCount < RING_SIZE ? 0 : log.ringHead;

  for (let k = 0; k < n; k++) {
    const f = log.ring[(start + k) % RING_SIZE];
    totals[k] = f.total;
    physics[k] = f.physics;
    prep[k] = f.prep;
    camera[k] = f.camera;
    render[k] = f.render;
  }
  totals.sort((a, b) => a - b);
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
 * Serialize the log to JSON for clipboard/download.
 * Includes stats, top-50 spikes, and last 120 frames for context.
 */
export function exportPerfLog(log) {
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
      physics: +f.physics.toFixed(2),
      prep: +f.prep.toFixed(2),
      camera: +f.camera.toFixed(2),
      render: +f.render.toFixed(2),
      other: +f.other.toFixed(2),
      nRacers: f.nRacers,
      physSteps: f.physSteps,
      physAccum: +f.physAccum.toFixed(2),
      capHit: f.capHit,
    });
  }

  const spikes = [...log.spikes]
    .sort((a, b) => b.total - a.total)
    .slice(0, SPIKE_COUNT)
    .map((f) => ({
      fi: f.fi,
      ts: +f.ts.toFixed(1),
      total: +f.total.toFixed(2),
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
        total: 'rAF delta — wall time between rAF callbacks (ms)',
        physics:
          'canvas clear + EMA + physics while-loop (applyRacerBehavior, all pair-loop work) (ms)',
        prep: 'renderAlpha + diagData + particle spawn/advance inside RACING branch; burst advance for FINISHED (ms)',
        camera:
          'renderBuf lerp setup + raceState build + CameraDirector.update + hudState sync (ms)',
        render: 'all canvas drawing — world transform, track, racers, overlays, minimap (ms)',
        other: 'total - measured — GC pauses, scheduler jitter, GPU flush (ms)',
        sumCheck:
          'physics + prep + camera + render ≈ measured ≈ total (other should be small on smooth frames)',
        physMsPerRealSec:
          'physics-time advanced per real second (~1000 = framerate-independent; <1000 = physics behind, >1000 = catching up; slowmo also lowers it)',
        physSteps: 'FIXED_DT catch-up steps this frame (capped at 2)',
        physAccum: 'physics backlog after the catch-up loop (ms)',
        capHit: 'cap reached and backlog ≥ FIXED_DT remained (physics fell further behind)',
      },
      stats,
      paceStats,
      spikes,
      recentFrames: frames,
    },
    null,
    2
  );
}
