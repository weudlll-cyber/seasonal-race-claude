// ============================================================
// File:        SCurveShape.js
// Path:        client/src/modules/track-shapes/SCurveShape.js
// Project:     RaceArena
// Description: River Run — open S-curve course flowing LEFT → RIGHT.
//              t=0 is the start (left), t=1 is the finish (right).
//              x increases linearly; y oscillates with N_BENDS sine periods
//              so the path makes smooth S-bends across the canvas.
// ============================================================

import { perpendicularLane, buildEdgePoints } from './shapeHelpers.js';

const MARGIN_X_FRAC = 0.05; // left/right margin as fraction of canvas width
const CY_FRAC = 0.55; // vertical centre as fraction of canvas height
const AMP_FRAC = 0.24; // y-amplitude as fraction of canvas height
const N_BENDS = 3; // number of S-bends (half-periods of sine)

function _bandWidth(totalLanes) {
  return Math.min(Math.max(120, totalLanes * 24), 200);
}

export class SCurveShape {
  /** True — this is a one-way open course (start ≠ finish). */
  isOpen = true;

  constructor(cw, ch) {
    this.cw = cw;
    this.ch = ch;
    this.cx = cw / 2;
    this.cy = ch * CY_FRAC;
    this.startX = cw * MARGIN_X_FRAC;
    this.spanX = cw * (1 - 2 * MARGIN_X_FRAC);
    this.amp = ch * AMP_FRAC;
  }

  // Centre path: x linear, y sinusoidal — N_BENDS half-periods left→right
  _center(t) {
    return {
      x: this.startX + this.spanX * t,
      y: this.cy + this.amp * Math.sin(N_BENDS * Math.PI * t),
    };
  }

  getPosition(t, laneIndex, totalLanes) {
    const TW = _bandWidth(totalLanes);
    return perpendicularLane(this._center.bind(this), t, laneIndex, totalLanes, TW, true);
  }

  getCenterPoint() {
    return { x: this.cx, y: this.cy };
  }

  getBandWidth(totalLanes) {
    return _bandWidth(totalLanes);
  }

  getTotalLength() {
    let len = 0;
    const N = 200;
    let prev = this._center(0);
    for (let i = 1; i <= N; i++) {
      const cur = this._center(i / N);
      const dx = cur.x - prev.x,
        dy = cur.y - prev.y;
      len += Math.sqrt(dx * dx + dy * dy);
      prev = cur;
    }
    return len;
  }

  getEdgePoints(totalLanes, nSamples = 120) {
    const TW = _bandWidth(totalLanes);
    return buildEdgePoints(this._center.bind(this), TW / 2, nSamples, true);
  }
}
