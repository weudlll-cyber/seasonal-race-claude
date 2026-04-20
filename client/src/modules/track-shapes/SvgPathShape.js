// Design grid the SVG paths are authored on
const GRID_W = 1000;
const GRID_H = 600;

// Arc-length samples pre-cached at construction time
const CACHE_N = 600;

export class SvgPathShape {
  /**
   * @param {string} pathStr  SVG path d-attribute authored on a 1000×600 grid
   * @param {object} opts
   * @param {boolean}  opts.isOpen      true for open one-way courses (t=0→1)
   * @param {number}   opts.cw          canvas width  (default 1280)
   * @param {number}   opts.ch          canvas height (default 720)
   * @param {{min,max,perLane}} opts.bw band-width config
   * @param {{x,y}}   opts.centerFrac  optional fixed centre as canvas fractions
   */
  constructor(pathStr, opts = {}) {
    this.isOpen = opts.isOpen ?? false;
    this.cw = opts.cw ?? 1280;
    this.ch = opts.ch ?? 720;
    this._sx = this.cw / GRID_W;
    this._sy = this.ch / GRID_H;
    this._bw = opts.bw ?? { min: 120, max: 200, perLane: 24 };
    this._centerFrac = opts.centerFrac ?? null;

    // Sample the path using the browser's native SVG geometry engine
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', pathStr);
    svg.appendChild(pathEl);
    document.body.appendChild(svg); // must be in DOM for getPointAtLength

    const rawTotal = pathEl.getTotalLength(); // length in grid (1000×600) units

    // Pre-cache CACHE_N+1 uniformly arc-length-spaced samples in grid space
    this._pts = new Array(CACHE_N + 1);
    for (let i = 0; i <= CACHE_N; i++) {
      const pt = pathEl.getPointAtLength((i / CACHE_N) * rawTotal);
      this._pts[i] = { x: pt.x, y: pt.y };
    }

    svg.remove();

    // Total arc length measured in canvas pixels (accounts for non-uniform scaling)
    let len = 0;
    for (let i = 1; i <= CACHE_N; i++) {
      const dx = (this._pts[i].x - this._pts[i - 1].x) * this._sx;
      const dy = (this._pts[i].y - this._pts[i - 1].y) * this._sy;
      len += Math.sqrt(dx * dx + dy * dy);
    }
    this._totalLen = len;
  }

  // Canvas-space position at arc-length fraction t via interpolation in the cache
  _sample(t) {
    const tc = this.isOpen ? Math.max(0, Math.min(1, t)) : ((t % 1) + 1) % 1;
    const idx = tc * CACHE_N;
    const lo = Math.floor(idx);
    const hi = Math.min(lo + 1, CACHE_N);
    const frac = idx - lo;
    const a = this._pts[lo];
    const b = this._pts[hi];
    return {
      x: (a.x + (b.x - a.x) * frac) * this._sx,
      y: (a.y + (b.y - a.y) * frac) * this._sy,
    };
  }

  getTangentAngle(t) {
    const H = 1 / CACHE_N;
    const ta = this.isOpen ? Math.min(1, t + H) : (((t + H) % 1) + 1) % 1;
    const tb = this.isOpen ? Math.max(0, t - H) : (((t - H) % 1) + 1) % 1;
    const pa = this._sample(ta);
    const pb = this._sample(tb);
    return Math.atan2(pa.y - pb.y, pa.x - pb.x);
  }

  getPosition(t, laneIndex, totalLanes) {
    const TW = this.getBandWidth(totalLanes);
    const laneW = TW / Math.max(totalLanes, 1);
    const delta = -TW / 2 + (laneIndex + 0.5) * laneW;
    const c = this._sample(t);
    const angle = this.getTangentAngle(t);
    const perp = angle + Math.PI / 2;
    return {
      x: c.x + Math.cos(perp) * delta,
      y: c.y + Math.sin(perp) * delta,
      angle,
    };
  }

  getBandWidth(totalLanes) {
    const { min, max, perLane } = this._bw;
    return Math.min(Math.max(min, totalLanes * perLane), max);
  }

  getTotalLength() {
    return this._totalLen;
  }

  getCenterPoint() {
    if (this._centerFrac) {
      return { x: this.cw * this._centerFrac.x, y: this.ch * this._centerFrac.y };
    }
    return this._sample(0.5);
  }

  getEdgePoints(totalLanes, nSamples = 120) {
    const hw = this.getBandWidth(totalLanes) / 2;
    const outer = [];
    const inner = [];
    for (let i = 0; i <= nSamples; i++) {
      const t = i / nSamples;
      const c = this._sample(t);
      const angle = this.getTangentAngle(t);
      const perp = angle + Math.PI / 2;
      outer.push({ x: c.x + Math.cos(perp) * hw, y: c.y + Math.sin(perp) * hw });
      inner.push({ x: c.x - Math.cos(perp) * hw, y: c.y - Math.sin(perp) * hw });
    }
    return { outer, inner };
  }
}
