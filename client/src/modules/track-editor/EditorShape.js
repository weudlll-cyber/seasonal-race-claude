import { catmullRomSpline, derivativeAt } from './catmullRom.js';

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
   * @param {number} t      Arc-length fraction 0..1
   * @param {number} offset Lateral offset: -0.5 = inner edge, 0 = centre, +0.5 = outer edge
   * @returns {{ x: number, y: number, angle: number }}
   */
  getPosition(t, offset) {
    const idx = this._idx(t);
    const inner = this._inner[idx];
    const outer = this._outer[idx];

    // Clamp so environments passing ±1.0 (SvgPathShape convention) land on the edges.
    const clamped = Math.max(-0.5, Math.min(0.5, offset));
    const frac = clamped + 0.5; // 0 = inner edge, 1 = outer edge
    const x = inner.x + (outer.x - inner.x) * frac;
    const y = inner.y + (outer.y - inner.y) * frac;

    // Angle from the centre line tangent
    const angle = this._tangentAngle(t);

    return { x, y, angle };
  }

  _tangentAngle(t) {
    const closed = !this.isOpen;
    const innerD = derivativeAt(this._innerPts, t, { closed });
    const outerD = derivativeAt(this._outerPts, t, { closed });
    // Average tangent of both boundaries
    const dx = (innerD.dx + outerD.dx) / 2;
    const dy = (innerD.dy + outerD.dy) / 2;
    return Math.atan2(dy, dx);
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
   * Compatible with the SvgPathShape.getEdgePoints() API used by environment modules.
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

  getCenterPoint() {
    // Bounding-box centre of all sampled points
    const all = [...this._inner, ...this._outer];
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
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  }
}
