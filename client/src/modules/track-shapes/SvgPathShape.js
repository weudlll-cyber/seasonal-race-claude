// Design grid the SVG paths are authored on
const GRID_W = 1000;
const GRID_H = 600;

// Canvas margin — tracks are scaled to fit within this inset on all sides
const MARGIN = 40;

// Arc-length samples pre-cached at construction time
const CACHE_N = 600;

/**
 * Returns the track band width in pixels for a given player count.
 * Used by RaceScreen to compute dynamic width; also exported for tests.
 */
export function getTrackWidth(playerCount) {
  if (playerCount <= 8) return 140;
  if (playerCount <= 20) return 200;
  if (playerCount <= 50) return 280;
  return 360; // 51-100 players
}

export class SvgPathShape {
  /**
   * @param {string} pathStr  SVG path d-attribute authored on a 1000×600 grid
   * @param {object} opts
   * @param {boolean}  opts.isOpen      true for open one-way courses (t=0→1)
   * @param {boolean}  opts.closed      if set, isOpen = !closed (alternative to isOpen)
   * @param {number}   opts.cw          canvas width  (default 1280)
   * @param {number}   opts.ch          canvas height (default 720)
   * @param {{x,y}}   opts.centerFrac  optional fixed centre as canvas fractions
   */
  constructor(pathStr, opts = {}) {
    this._pathStr = pathStr;
    // Support both isOpen and closed flags
    if (opts.isOpen !== undefined) {
      this.isOpen = opts.isOpen;
    } else if (opts.closed !== undefined) {
      this.isOpen = !opts.closed;
    } else {
      this.isOpen = false;
    }
    this.cw = opts.cw ?? 1280;
    this.ch = opts.ch ?? 720;
    // Scale grid into the inset area [MARGIN, cw-MARGIN] × [MARGIN, ch-MARGIN]
    this._sx = (this.cw - 2 * MARGIN) / GRID_W;
    this._sy = (this.ch - 2 * MARGIN) / GRID_H;
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
      x: MARGIN + (a.x + (b.x - a.x) * frac) * this._sx,
      y: MARGIN + (a.y + (b.y - a.y) * frac) * this._sy,
    };
  }

  getTangentAngle(t) {
    // ±0.01 window smooths inflection-point artifacts (was ±1/CACHE_N ≈ ±0.0017)
    const H = 0.01;
    const ta = this.isOpen ? Math.min(1, t + H) : (((t + H) % 1) + 1) % 1;
    const tb = this.isOpen ? Math.max(0, t - H) : (((t - H) % 1) + 1) % 1;
    const pa = this._sample(ta);
    const pb = this._sample(tb);
    return Math.atan2(pa.y - pb.y, pa.x - pb.x);
  }

  /**
   * Returns canvas-space position for a racer with the given perpendicular offset.
   * @param {number} t           Arc-length fraction 0..1
   * @param {number} trackOffset Perpendicular offset as fraction of half-width (-1 to +1).
   *                             Use racer.trackOffset (range -0.35..0.35) for racers,
   *                             ±1.0 for track edge positions.
   * @param {number} trackWidth  Total track width in canvas pixels
   */
  getPosition(t, trackOffset, trackWidth) {
    const c = this._sample(t);
    const angle = this.getTangentAngle(t);
    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);
    const halfWidth = trackWidth / 2;
    return {
      x: c.x + perpX * trackOffset * halfWidth,
      y: c.y + perpY * trackOffset * halfWidth,
      angle,
    };
  }

  getTotalLength() {
    return this._totalLen;
  }

  /** Returns a Path2D for the center path scaled to canvas coordinates. */
  getPath2D() {
    const raw = new Path2D(this._pathStr);
    const scaled = new Path2D();
    scaled.addPath(raw, new DOMMatrix([this._sx, 0, 0, this._sy, MARGIN, MARGIN]));
    return scaled;
  }

  getCenterPoint() {
    if (this._centerFrac) {
      return { x: this.cw * this._centerFrac.x, y: this.ch * this._centerFrac.y };
    }
    return this._sample(0.5);
  }
}
