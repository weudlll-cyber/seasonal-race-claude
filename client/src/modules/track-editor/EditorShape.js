import { catmullRomSpline } from './catmullRom.js';

/**
 * Race-engine shape adapter wrapping a track from the track-editor data structure.
 *
 * Geometry: offset ∈ [-0.5, 0.5] interpolates linearly between the inner
 * boundary (offset = -0.5) and the outer boundary (offset = +0.5).
 */
export class EditorShape {
  /**
   * @param {object} track         Full track object from trackStorage (innerPoints, outerPoints, closed)
   * @param {object} [opts]
   * @param {number} [opts.samples=500]  Number of arc-length samples per boundary curve
   */
  constructor(track, { samples = 500 } = {}) {
    this.isOpen = !track.closed;
    const opts = { closed: track.closed, samples };
    this._inner = catmullRomSpline(track.innerPoints, opts);
    this._outer = catmullRomSpline(track.outerPoints, opts);
    this._samples = samples;
    this._innerPts = track.innerPoints;
    this._outerPts = track.outerPoints;
    this._angles = this._precomputeAngles();
  }

  _precomputeAngles() {
    const n = this._samples;
    const angles = new Array(n);
    for (let i = 0; i < n; i++) {
      let iPrev, iNext;
      if (this.isOpen) {
        iPrev = Math.max(0, i - 1);
        iNext = Math.min(n - 1, i + 1);
      } else {
        iPrev = (i - 1 + n) % n;
        iNext = (i + 1) % n;
      }
      const dx =
        this._inner[iNext].x - this._inner[iPrev].x + (this._outer[iNext].x - this._outer[iPrev].x);
      const dy =
        this._inner[iNext].y - this._inner[iPrev].y + (this._outer[iNext].y - this._outer[iPrev].y);
      angles[i] = Math.atan2(dy, dx);
    }
    return angles;
  }

  // Map arc-length fraction t to a sample index, handling open vs closed curves.
  _idx(t) {
    if (this.isOpen) {
      return Math.round(Math.max(0, Math.min(1, t)) * (this._samples - 1));
    }
    const tc = ((t % 1) + 1) % 1;
    return Math.round(tc * this._samples) % this._samples;
  }

  /**
   * Returns canvas-space position for a given track fraction and lateral offset.
   * Positions are linearly interpolated between adjacent precomputed samples (500 by default),
   * not snapped to the nearest sample — eliminates the ~20 px staircase visible at zoom 4×.
   * @param {number} t      Arc-length fraction 0..1 (open tracks clamped; closed tracks wrap)
   * @param {number} offset Lateral offset: -0.5 = inner edge, 0 = centre, +0.5 = outer edge
   * @returns {{ x: number, y: number, angle: number }}
   */
  getPosition(t, offset) {
    const n = this._samples;
    let idx0, idx1, frac_t;

    if (this.isOpen) {
      const tc = Math.max(0, Math.min(1, t));
      const idxFloat = tc * (n - 1);
      idx0 = Math.floor(idxFloat);
      idx1 = Math.min(idx0 + 1, n - 1);
      frac_t = idxFloat - idx0;
    } else {
      const tc = ((t % 1) + 1) % 1;
      const idxFloat = tc * n;
      const floorIdx = Math.floor(idxFloat);
      idx0 = floorIdx % n;
      idx1 = (idx0 + 1) % n;
      frac_t = idxFloat - floorIdx;
    }

    const i0i = this._inner[idx0];
    const i1i = this._inner[idx1];
    const i0o = this._outer[idx0];
    const i1o = this._outer[idx1];

    const innerX = i0i.x + (i1i.x - i0i.x) * frac_t;
    const innerY = i0i.y + (i1i.y - i0i.y) * frac_t;
    const outerX = i0o.x + (i1o.x - i0o.x) * frac_t;
    const outerY = i0o.y + (i1o.y - i0o.y) * frac_t;

    // Clamp offset so callers passing ±1.0 land on the boundary edges.
    const clamped = Math.max(-0.5, Math.min(0.5, offset));
    const frac = clamped + 0.5; // 0 = inner edge, 1 = outer edge
    const x = innerX + (outerX - innerX) * frac;
    const y = innerY + (outerY - innerY) * frac;

    // Angle interpolation with shortest-path wrap to avoid 359°→1° jumping to 180°.
    const a0 = this._angles[idx0];
    const a1 = this._angles[idx1];
    let aDiff = a1 - a0;
    if (aDiff > Math.PI) aDiff -= 2 * Math.PI;
    if (aDiff < -Math.PI) aDiff += 2 * Math.PI;
    const angle = a0 + aDiff * frac_t;

    return { x, y, angle };
  }

  _tangentAngle(t) {
    return this._angles[this._idx(t)];
  }

  getTotalLength() {
    if (this._cachedLength !== undefined) return this._cachedLength;
    let len = 0;
    const n = this._inner.length;
    for (let i = 1; i < n; i++) {
      const cx0 = (this._inner[i - 1].x + this._outer[i - 1].x) / 2;
      const cy0 = (this._inner[i - 1].y + this._outer[i - 1].y) / 2;
      const cx1 = (this._inner[i].x + this._outer[i].x) / 2;
      const cy1 = (this._inner[i].y + this._outer[i].y) / 2;
      const dx = cx1 - cx0;
      const dy = cy1 - cy0;
      len += Math.sqrt(dx * dx + dy * dy);
    }
    this._cachedLength = len;
    return len;
  }

  /**
   * Returns sampled outer and inner boundary points for track surface rendering.
   * Returns sampled boundary points for track surface rendering.
   * @param {number} nSamples  Number of segments (returns nSamples+1 point pairs)
   * @returns {{ outer: {x,y}[], inner: {x,y}[] }}
   */
  getEdgePoints(nSamples = 120) {
    const outer = [];
    const inner = [];
    for (let i = 0; i <= nSamples; i++) {
      const t = i / nSamples;
      const idx = this._idx(t);
      outer.push({ x: this._outer[idx].x, y: this._outer[idx].y });
      inner.push({ x: this._inner[idx].x, y: this._inner[idx].y });
    }
    return { outer, inner };
  }

  getBoundingBox() {
    if (this._bboxCache !== undefined) return this._bboxCache;
    // Include raw control points alongside samples: Catmull-Rom passes through
    // all control points, so they belong in the bounding box. Arc-length uniform
    // sampling may not place any sample exactly at a control-point T-value.
    const all = [...this._inner, ...this._outer, ...this._innerPts, ...this._outerPts];
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const p of all) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    this._bboxCache = { minX, maxX, minY, maxY };
    return this._bboxCache;
  }

  getCenterPoint() {
    const { minX, maxX, minY, maxY } = this.getBoundingBox();
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  }

  /**
   * Measures the median cross-section width of the track in world pixels.
   * Samples `samples` evenly-spaced t positions and computes the inner-to-outer
   * distance at each. Returns the median (robust against narrow corners).
   * Result is cached — call once per shape instance.
   *
   * @param {number} [samples=20]
   * @returns {number} median track width in world pixels
   */
  getActualTrackWidth(samples = 20) {
    if (this._cachedActualTrackWidth !== undefined) return this._cachedActualTrackWidth;
    const widths = [];
    for (let i = 0; i < samples; i++) {
      const t = i / samples;
      const idx = this._idx(t);
      const inner = this._inner[idx];
      const outer = this._outer[idx];
      const dx = outer.x - inner.x;
      const dy = outer.y - inner.y;
      widths.push(Math.sqrt(dx * dx + dy * dy));
    }
    widths.sort((a, b) => a - b);
    // Math.round: track widths are set in whole world-pixels; catmullRom spline
    // interpolation introduces ~10⁻¹³ fp error that would corrupt floor-based
    // downstream calculations (e.g. computeRacersPerRow).
    this._cachedActualTrackWidth = Math.round(widths[Math.floor(widths.length / 2)]);
    return this._cachedActualTrackWidth;
  }
}
