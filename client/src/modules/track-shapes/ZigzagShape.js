// ============================================================
// File:        ZigzagShape.js
// Path:        client/src/modules/track-shapes/ZigzagShape.js
// Project:     RaceArena
// Description: Garden Path — open zigzag course, TOP → BOTTOM.
//              Four lateral control points create a left-right weave
//              as the path descends.  t=0 = start (top), t=1 = finish.
// ============================================================

import { PathInterpolator } from './PathInterpolator.js';

// Control points on 1000×600 design grid
const CONTROL_POINTS = [
  { x: 500, y: 115 }, // start — top centre
  { x: 195, y: 215 }, // bend left
  { x: 805, y: 345 }, // bend right
  { x: 195, y: 460 }, // bend left
  { x: 500, y: 540 }, // finish — bottom centre
];

function _bw(n) {
  return Math.min(Math.max(120, n * 24), 200);
}

export class ZigzagShape {
  /** Open one-way course — racers travel from t=0 to t=1. */
  isOpen = true;

  constructor(cw, ch) {
    this.cw = cw;
    this.ch = ch;
    this._p = new PathInterpolator(CONTROL_POINTS, { closed: false, cw, ch });
  }

  getPosition(t, laneIndex, totalLanes) {
    const TW = _bw(totalLanes);
    const delta = -TW / 2 + (laneIndex + 0.5) * (TW / Math.max(totalLanes, 1));
    const angle = this._p.getTangentAngle(t);
    const c = this._p.getPoint(t);
    const perp = angle + Math.PI / 2;
    return { x: c.x + Math.cos(perp) * delta, y: c.y + Math.sin(perp) * delta, angle };
  }

  // Return geometric centre of the bounding box, not arc midpoint
  getCenterPoint() {
    return { x: this.cw * 0.5, y: this.ch * 0.5 };
  }
  getBandWidth(n) {
    return _bw(n);
  }
  getTotalLength() {
    return this._p.getTotalLength();
  }

  getEdgePoints(totalLanes, nSamples = 200) {
    const hw = _bw(totalLanes) / 2;
    const outer = [],
      inner = [];
    for (let i = 0; i <= nSamples; i++) {
      const t = i / nSamples;
      const angle = this._p.getTangentAngle(t);
      const c = this._p.getPoint(t);
      const perp = angle + Math.PI / 2;
      outer.push({ x: c.x + Math.cos(perp) * hw, y: c.y + Math.sin(perp) * hw });
      inner.push({ x: c.x - Math.cos(perp) * hw, y: c.y - Math.sin(perp) * hw });
    }
    return { outer, inner };
  }
}
