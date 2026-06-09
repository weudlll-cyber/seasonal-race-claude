// ============================================================
// File:        camTrace.js
// Path:        client/src/modules/camTrace.js
// Project:     RaceArena
// Description: Dev-only camera-value ring buffer for diagnosing motion
//              smoothness issues. Activated by ?camtrace=1 URL parameter
//              (persisted to sessionStorage like the perf probe).
//
//              Usage (console):
//                window.__camTrace()      → last N frames as array of objects
//                window.__camTraceJSON()  → same as JSON string (copy-paste friendly)
//                window.__camTraceMarks() → [{frameIdx, ts}] owner-placed marks
//                window.__camTraceClear() → reset buffer
//                Press Z during race     → drop a mark at current frame
// ============================================================

const RING = 600; // ~10 s at 60 fps

const _buf = new Array(RING).fill(null);
let _head = 0;
let _n = 0;
let _active = false;
let _prevOffsetX = null;
let _prevOffsetY = null;
let _prevZoom = null;
const _marks = [];

// Persist URL flag to sessionStorage so it survives SPA navigation.
if (typeof window !== 'undefined') {
  try {
    if (new URLSearchParams(window.location.search).get('camtrace') === '1') {
      sessionStorage.setItem('_ra_camtrace', '1');
    }
  } catch {
    // Storage blocked — ignore.
  }
}

function _onKey(e) {
  if (e.code === 'KeyZ' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
    const frameIdx = (_head - 1 + RING) % RING;
    _marks.push({ frameIdx, n: _n, ts: performance.now() });
    console.log('[camTrace] Mark placed at frame', _n, '/ ring index', frameIdx);
  }
}

/**
 * Call once at race init. Reads sessionStorage; resets buffer; installs window API.
 * Returns true if the trace is now active.
 */
export function initCamTrace() {
  try {
    _active =
      typeof sessionStorage !== 'undefined' && sessionStorage.getItem('_ra_camtrace') === '1';
  } catch {
    _active = false;
  }
  if (_active) {
    _head = 0;
    _n = 0;
    _prevOffsetX = null;
    _prevOffsetY = null;
    _prevZoom = null;
    _marks.length = 0;

    if (typeof window !== 'undefined') {
      window.__camTrace = _getTrace;
      window.__camTraceJSON = _getTraceJSON;
      window.__camTraceMarks = _getMarks;
      window.__camTraceClear = _clear;
      window.__camTraceStart = () => {
        _active = true;
        console.log('[camTrace] started');
      };
      window.__camTraceStop = () => {
        _active = false;
        console.log('[camTrace] stopped');
      };
    }
    document.addEventListener('keydown', _onKey);
    console.log('[camTrace] active — press Z to mark, __camTrace() to read');
  }
  return _active;
}

/**
 * Call every rAF after the camera director update.
 * Hot path: no heap allocation (all fields are numbers or short strings).
 */
export function recordCamFrame({
  ts,
  state,
  lerpPhase,
  offsetX,
  offsetY,
  zoom,
  effZoom,
  targetOffsetX,
  targetOffsetY,
  targetZoom,
  wasClamped,
  wasZoomAdapted,
}) {
  if (!_active) return;

  const dOffsetX = _prevOffsetX !== null ? offsetX - _prevOffsetX : 0;
  const dOffsetY = _prevOffsetY !== null ? offsetY - _prevOffsetY : 0;
  const dZoom = _prevZoom !== null ? zoom - _prevZoom : 0;

  _buf[_head] = {
    f: _n, // sequential frame counter
    ts: +ts.toFixed(1),
    state,
    phase: lerpPhase,
    // Current camera values
    ox: +offsetX.toFixed(2),
    oy: +offsetY.toFixed(2),
    z: +zoom.toFixed(5),
    ez: +effZoom.toFixed(5),
    // Lerp targets (where the camera is heading)
    tx: +targetOffsetX.toFixed(2),
    ty: +targetOffsetY.toFixed(2),
    tz: +targetZoom.toFixed(5),
    // Residual error (target − current): positive = still approaching target
    ex: +(targetOffsetX - offsetX).toFixed(2),
    ey: +(targetOffsetY - offsetY).toFixed(2),
    ez2: +(targetZoom - zoom).toFixed(5),
    // Per-frame delta (current − previous): smoothness signal — spikes = discontinuity
    dox: +dOffsetX.toFixed(2),
    doy: +dOffsetY.toFixed(2),
    dz: +dZoom.toFixed(5),
    // Flags
    clamp: wasClamped ? 1 : 0,
    zadapt: wasZoomAdapted ? 1 : 0,
  };

  _head = (_head + 1) % RING;
  if (_n < RING) _n++;

  _prevOffsetX = offsetX;
  _prevOffsetY = offsetY;
  _prevZoom = zoom;
}

function _getTrace() {
  if (_n === 0) return [];
  const out = [];
  for (let i = 0; i < _n; i++) {
    out.push(_buf[(_head - _n + i + RING) % RING]);
  }
  return out;
}

function _getTraceJSON() {
  return JSON.stringify(_getTrace(), null, 2);
}

function _getMarks() {
  return _marks.map((m) => ({
    ...m,
    frame: _buf[m.frameIdx],
  }));
}

function _clear() {
  _head = 0;
  _n = 0;
  _prevOffsetX = null;
  _prevOffsetY = null;
  _prevZoom = null;
  _marks.length = 0;
  console.log('[camTrace] cleared');
}
