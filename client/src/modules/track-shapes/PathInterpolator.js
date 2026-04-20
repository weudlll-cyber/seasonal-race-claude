// ============================================================
// File:        PathInterpolator.js
// Path:        client/src/modules/track-shapes/PathInterpolator.js
// Project:     RaceArena
// Description: Catmull-Rom spline interpolation over a list of control
//              points defined on a normalised 1000×600 design grid.
//              Arc-length re-parameterisation ensures uniform speed —
//              getPoint(t) and getTangentAngle(t) both take t ∈ [0,1].
//              Supports open courses (t=0 → start, t=1 → finish) and
//              closed loops (t=0 = t=1 = same point on the circuit).
// ============================================================

const ARC_SAMPLES = 500; // arc-length table resolution

export class PathInterpolator {
  /**
   * @param {Array<{x,y}>} controlPoints  Points on the 1000×600 design grid
   * @param {object} opts
   * @param {boolean} opts.closed   true → closed loop, false → open course
   * @param {number}  opts.cw       canvas width  (default 1280)
   * @param {number}  opts.ch       canvas height (default 720)
   * @param {number}  opts.gridW    design grid width  (default 1000)
   * @param {number}  opts.gridH    design grid height (default 600)
   */
  constructor(
    controlPoints,
    { closed = false, cw = 1280, ch = 720, gridW = 1000, gridH = 600 } = {}
  ) {
    this.closed = closed;
    const sx = cw / gridW,
      sy = ch / gridH;
    this._pts = controlPoints.map(({ x, y }) => ({ x: x * sx, y: y * sy }));
    this._buildArcTable();
  }

  // Catmull-Rom formula: interpolates between p1 and p2 using p0 and p3 for tangents
  _cr(p0, p1, p2, p3, t) {
    const t2 = t * t,
      t3 = t2 * t;
    return {
      x:
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      y:
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    };
  }

  // Raw position at parameter u ∈ [0,1] — NOT arc-length parameterised
  _rawPoint(u) {
    const pts = this._pts,
      n = pts.length;
    if (this.closed) {
      const uw = ((u % 1) + 1) % 1;
      const frac = uw * n;
      const seg = Math.floor(frac) % n;
      const t = frac - Math.floor(frac);
      return this._cr(pts[(seg - 1 + n) % n], pts[seg], pts[(seg + 1) % n], pts[(seg + 2) % n], t);
    } else {
      const uc = Math.max(0, Math.min(1, u));
      const maxSeg = n - 1;
      const frac = uc * maxSeg;
      const seg = Math.min(Math.floor(frac), maxSeg - 1);
      const t = frac - seg;
      // Ghost points at endpoints keep the curve from kinking
      const p0 =
        seg > 0 ? pts[seg - 1] : { x: 2 * pts[0].x - pts[1].x, y: 2 * pts[0].y - pts[1].y };
      const p3 =
        seg < maxSeg - 1
          ? pts[seg + 2]
          : { x: 2 * pts[n - 1].x - pts[n - 2].x, y: 2 * pts[n - 1].y - pts[n - 2].y };
      return this._cr(p0, pts[seg], pts[seg + 1], p3, t);
    }
  }

  // Build cumulative arc-length table (ARC_SAMPLES+1 entries, normalised to [0,1])
  _buildArcTable() {
    const N = ARC_SAMPLES;
    const tbl = [0];
    let prev = this._rawPoint(0);
    for (let i = 1; i <= N; i++) {
      const cur = this._rawPoint(i / N);
      const dx = cur.x - prev.x,
        dy = cur.y - prev.y;
      tbl.push(tbl[i - 1] + Math.sqrt(dx * dx + dy * dy));
      prev = cur;
    }
    this._totalLen = tbl[N];
    this._N = N;
    this._normTbl = tbl.map((v) => v / this._totalLen);
  }

  // Binary search: convert arc-length fraction t → raw u
  _arcToU(t) {
    const norm = this._normTbl,
      N = this._N;
    let lo = 0,
      hi = N;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (norm[mid] < t) lo = mid + 1;
      else hi = mid;
    }
    if (lo === 0) return 0;
    if (lo >= N) return 1;
    const t0 = norm[lo - 1],
      t1 = norm[lo];
    const dt = t1 - t0;
    if (dt < 1e-10) return lo / N;
    return (lo - 1 + (t - t0) / dt) / N;
  }

  /** Returns {x, y} on the canvas for the given arc-length fraction t ∈ [0,1]. */
  getPoint(t) {
    const tc = this.closed ? ((t % 1) + 1) % 1 : Math.max(0, Math.min(1, t));
    return this._rawPoint(this._arcToU(tc));
  }

  /** Returns the travel-direction angle (radians) at arc-length fraction t. */
  getTangentAngle(t) {
    const H = 0.001;
    const a = this.closed ? (((t + H) % 1) + 1) % 1 : Math.min(1, t + H);
    const b = this.closed ? (((t - H) % 1) + 1) % 1 : Math.max(0, t - H);
    const pa = this.getPoint(a),
      pb = this.getPoint(b);
    return Math.atan2(pa.y - pb.y, pa.x - pb.x);
  }

  /** Approximate total arc length in canvas pixels. */
  getTotalLength() {
    return this._totalLen;
  }
}
