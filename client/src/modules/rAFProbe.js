// ============================================================
// File:        rAFProbe.js
// Path:        client/src/modules/rAFProbe.js
// Project:     RaceArena
// Description: Minimal prod-safe rAF frame-timing probe.
//              Activated by URL flag ?perfprobe=1 (persisted to sessionStorage
//              so it survives SPA navigation). Zero per-frame allocation:
//              deltas are written into a fixed-size Float32Array ring buffer.
//
//              Usage:
//                1. Open any app URL with ?perfprobe=1.
//                2. Start a race — the probe auto-activates on RaceScreen mount.
//                3. In DevTools console: window.__perfProbe()
//                   → { n, p50, p90, p99, max, framesOver20ms, framesOver33ms }
//                   window.__perfProbeZoom()
//                   → zoom-vs-gap correlation table (OVERVIEW vs non-OVERVIEW)
//                   window.__perfProbeRaw()
//                   → Uint8Array-based raw data dump for offline analysis
// ============================================================

const RING = 600; // ~10 s at 60 fps

const _buf = new Float32Array(RING);
// Camera correlation buffers — filled by recordFrameCamera() after cam update.
const _zoomBuf = new Float32Array(RING); // cam.zoom value for this frame
const _stateBuf = new Uint8Array(RING); // encoded camera state (see _STATE_IDX)

let _head = 0; // index of next write slot
let _n = 0; // frames recorded so far (capped at RING)
let _last = 0; // rAF timestamp of the previous frame
let _active = false;

// Numeric encoding for camera states (must match CAM_STATE keys in CameraDirector.js).
//
// PHOTO-FINISH-STATE-1: PHOTO_FINISH was missing here too, and it failed the way an unknown key
// always fails in this file — silently. `recordFrameCamera` writes `_STATE_IDX[state] ?? 255`, so
// every frame of the closest shot in the race was filed under 255 and read back as 'UNKNOWN', and
// the per-state table simply had no row for it. The names are DERIVED from the encoding below so
// the two cannot fall out of step; they were two literals before.
const _STATE_IDX = {
  OVERVIEW: 0,
  LEADER_ZOOM: 1,
  BATTLE_ZOOM: 2,
  COMEBACK_ZOOM: 3,
  LEAD_CHANGE: 4,
  PHOTO_FINISH: 5,
};
const _STATE_NAME = [];
for (const [name, idx] of Object.entries(_STATE_IDX)) _STATE_NAME[idx] = name;

// Persist URL flag to sessionStorage so it survives navigate('/race').
if (typeof window !== 'undefined') {
  try {
    if (new URLSearchParams(window.location.search).get('perfprobe') === '1') {
      sessionStorage.setItem('_ra_perfprobe', '1');
    }
  } catch {
    // Storage blocked (private mode etc.) — silently ignore.
  }
}

/**
 * Call once when the race animation loop starts.
 * Reads sessionStorage; resets the ring buffer; sets window.__perfProbe.
 * Returns true if the probe is now active.
 */
export function initProbe() {
  try {
    _active =
      typeof sessionStorage !== 'undefined' && sessionStorage.getItem('_ra_perfprobe') === '1';
  } catch {
    _active = false;
  }
  if (_active) {
    _head = 0;
    _n = 0;
    _last = 0;
    if (typeof window !== 'undefined') {
      window.__perfProbe = getStats;
      window.__perfProbeZoom = getZoomStats;
      window.__perfProbeRaw = getRawData;
    }
  }
  return _active;
}

/**
 * Call on every rAF tick with the rAF timestamp (ms).
 * Hot path: no allocations — only integer/float arithmetic and a TypedArray write.
 */
export function recordFrame(now) {
  if (!_active) return;
  if (_last === 0) {
    _last = now;
    return;
  }
  _buf[_head] = now - _last;
  // Zoom/state written to same slot by recordFrameCamera; default to 0/UNKNOWN until then.
  _zoomBuf[_head] = 0;
  _stateBuf[_head] = 255; // 255 = not yet recorded
  _head = (_head + 1) % RING;
  if (_n < RING) _n++;
  _last = now;
}

/**
 * Call after the camera update each frame to attach camera state + zoom to the
 * frame slot written by recordFrame(). Zero allocations.
 * @param {string} state  CAM_STATE key, e.g. 'OVERVIEW', 'LEADER_ZOOM'
 * @param {number} zoom   cam.zoom value from CameraDirector
 */
export function recordFrameCamera(state, zoom) {
  if (!_active) return;
  // The slot written by recordFrame is (_head - 1 + RING) % RING.
  const slot = (_head - 1 + RING) % RING;
  _zoomBuf[slot] = zoom;
  _stateBuf[slot] = _STATE_IDX[state] ?? 255;
}

// ── Stats functions ────────────────────────────────────────────────────────────

function getStats() {
  const n = _n;
  if (n === 0) {
    return { n: 0, p50: 0, p90: 0, p99: 0, max: 0, framesOver20ms: 0, framesOver33ms: 0 };
  }
  // Copy ring buffer in chronological order into a scratch array for sorting.
  const tmp = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    tmp[i] = _buf[(_head - n + i + RING) % RING];
  }
  tmp.sort();
  let over20 = 0;
  let over33 = 0;
  for (let i = 0; i < n; i++) {
    if (tmp[i] > 20) over20++;
    if (tmp[i] > 33) over33++;
  }
  return {
    n,
    p50: +tmp[Math.floor(n * 0.5)].toFixed(2),
    p90: +tmp[Math.floor(n * 0.9)].toFixed(2),
    p99: +tmp[Math.floor(n * 0.99)].toFixed(2),
    max: +tmp[n - 1].toFixed(2),
    framesOver20ms: over20,
    framesOver33ms: over33,
  };
}

/**
 * Zoom-vs-gap correlation report.
 * Groups frames by camera state; within OVERVIEW, buckets by zoom factor.
 * Returns a summary useful for confirming the zoom↔stutter hypothesis.
 */
function getZoomStats() {
  const n = _n;
  if (n === 0) return { n: 0, overview: null, nonOverview: null };

  // Collect frames in chronological order.
  const frames = [];
  for (let i = 0; i < n; i++) {
    const idx = (_head - n + i + RING) % RING;
    frames.push({ gap: _buf[idx], zoom: _zoomBuf[idx], stateIdx: _stateBuf[idx] });
  }

  const overview = frames.filter((f) => f.stateIdx === 0);
  const nonOverview = frames.filter((f) => f.stateIdx !== 0 && f.stateIdx !== 255);

  function pctile(arr, p) {
    if (!arr.length) return 0;
    const idx = Math.ceil(p * arr.length) - 1;
    return +arr[Math.max(0, idx)].toFixed(2);
  }

  // Non-OVERVIEW gap stats
  const nonOvGaps = nonOverview.map((f) => f.gap).sort((a, b) => a - b);
  const nonOvStats = nonOvGaps.length
    ? {
        n: nonOvGaps.length,
        p50: pctile(nonOvGaps, 0.5),
        p90: pctile(nonOvGaps, 0.9),
        p99: pctile(nonOvGaps, 0.99),
        max: pctile(nonOvGaps, 1.0),
      }
    : null;

  // OVERVIEW gap stats overall
  const ovGaps = overview.map((f) => f.gap).sort((a, b) => a - b);
  const ovStats = ovGaps.length
    ? {
        n: ovGaps.length,
        p50: pctile(ovGaps, 0.5),
        p90: pctile(ovGaps, 0.9),
        p99: pctile(ovGaps, 0.99),
        max: pctile(ovGaps, 1.0),
        zoomMin: +Math.min(...overview.map((f) => f.zoom)).toFixed(4),
        zoomMax: +Math.max(...overview.map((f) => f.zoom)).toFixed(4),
        zoomMedian: (() => {
          const z = overview.map((f) => f.zoom).sort((a, b) => a - b);
          return +z[Math.floor(z.length / 2)].toFixed(4);
        })(),
      }
    : null;

  // OVERVIEW bucketed by zoom (10 equal-width buckets across observed range)
  let zoomBuckets = [];
  if (overview.length >= 5) {
    const zMin = Math.min(...overview.map((f) => f.zoom));
    const zMax = Math.max(...overview.map((f) => f.zoom));
    const NBUCKETS = 8;
    const step = (zMax - zMin) / NBUCKETS || 0.001;
    const buckets = Array.from({ length: NBUCKETS }, (_, i) => ({
      zoomLo: +(zMin + i * step).toFixed(4),
      zoomHi: +(zMin + (i + 1) * step).toFixed(4),
      frames: [],
    }));
    for (const f of overview) {
      const bi = Math.min(NBUCKETS - 1, Math.floor((f.zoom - zMin) / step));
      buckets[bi].frames.push(f.gap);
    }
    zoomBuckets = buckets
      .filter((b) => b.frames.length > 0)
      .map((b) => {
        const sorted = b.frames.sort((a, c) => a - c);
        return {
          zoomRange: `${b.zoomLo}–${b.zoomHi}`,
          n: sorted.length,
          p50: pctile(sorted, 0.5),
          p90: pctile(sorted, 0.9),
          p99: pctile(sorted, 0.99),
          max: pctile(sorted, 1.0),
        };
      });
  }

  // Per-state breakdown
  const byState = {};
  for (let si = 0; si < _STATE_NAME.length; si++) {
    const stateFrames = frames.filter((f) => f.stateIdx === si);
    if (!stateFrames.length) continue;
    const gaps = stateFrames.map((f) => f.gap).sort((a, b) => a - b);
    byState[_STATE_NAME[si]] = {
      n: gaps.length,
      p50: pctile(gaps, 0.5),
      p90: pctile(gaps, 0.9),
      p99: pctile(gaps, 0.99),
      max: pctile(gaps, 1.0),
    };
  }

  return {
    n,
    overview: ovStats,
    overviewZoomBuckets: zoomBuckets,
    nonOverview: nonOvStats,
    byState,
  };
}

/**
 * Raw frame data for offline analysis.
 * Returns array of { gap, zoom, state } objects (last _n frames, chronological).
 */
function getRawData() {
  const n = _n;
  if (n === 0) return [];
  return Array.from({ length: n }, (_, i) => {
    const idx = (_head - n + i + RING) % RING;
    return {
      gap: +_buf[idx].toFixed(2),
      zoom: +_zoomBuf[idx].toFixed(4),
      state: _STATE_NAME[_stateBuf[idx]] ?? 'UNKNOWN',
    };
  });
}
