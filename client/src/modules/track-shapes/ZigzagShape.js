// ============================================================
// File:        ZigzagShape.js
// Path:        client/src/modules/track-shapes/ZigzagShape.js
// Project:     RaceArena
// Description: Garden Path — open zigzag course flowing TOP → BOTTOM.
//              t=0 is the start (top), t=1 is the finish (bottom).
//              y increases linearly; x zigzags left-right with N_ZIGS
//              half-periods of sine, creating a garden-path weave.
// ============================================================

import { perpendicularLane, buildEdgePoints } from './shapeHelpers.js';

const CX_FRAC = 0.5; // horizontal centre
const MARGIN_Y_TOP_FRAC = 0.14; // top margin (below title strip)
const MARGIN_Y_BOT_FRAC = 0.05; // bottom margin
const AMP_FRAC = 0.25; // x-amplitude as fraction of canvas width
const N_ZIGS = 4; // number of zigzag bends (half-periods of sine)

function _bandWidth(totalLanes) {
  return Math.min(Math.max(120, totalLanes * 24), 200);
}

export class ZigzagShape {
  /** True — this is a one-way open course (start ≠ finish). */
  isOpen = true;

  constructor(cw, ch) {
    this.cw = cw;
    this.ch = ch;
    this.cx = cw * CX_FRAC;
    this.cy = ch / 2;
    this.startY = ch * MARGIN_Y_TOP_FRAC;
    this.spanY = ch * (1 - MARGIN_Y_TOP_FRAC - MARGIN_Y_BOT_FRAC);
    this.amp = cw * AMP_FRAC;
  }

  // Centre path: y linear top→bottom, x sinusoidal zigzag
  _center(t) {
    return {
      x: this.cx + this.amp * Math.sin(N_ZIGS * Math.PI * t),
      y: this.startY + this.spanY * t,
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

  getEdgePoints(totalLanes, nSamples = 200) {
    const TW = _bandWidth(totalLanes);
    return buildEdgePoints(this._center.bind(this), TW / 2, nSamples, true);
  }
}
