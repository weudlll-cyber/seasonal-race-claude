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
// ============================================================

const RING = 600; // ~10 s at 60 fps

const _buf = new Float32Array(RING);
let _head = 0; // index of next write slot
let _n = 0; // frames recorded so far (capped at RING)
let _last = 0; // rAF timestamp of the previous frame
let _active = false;

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
    if (typeof window !== 'undefined') window.__perfProbe = getStats;
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
  _head = (_head + 1) % RING;
  if (_n < RING) _n++;
  _last = now;
}

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
