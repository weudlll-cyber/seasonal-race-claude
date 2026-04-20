// ============================================================
// File:        SCurveShape.js
// Path:        client/src/modules/track-shapes/SCurveShape.js
// Project:     RaceArena
// Description: River Run — open S-curve course, LEFT → RIGHT.
//              Defined as Catmull-Rom control points on a 1000×600 grid.
//              t=0 = start (left), t=1 = finish (right).
// ============================================================

import { PathInterpolator } from './PathInterpolator.js';

// Control points on 1000×600 design grid
const CONTROL_POINTS = [
  { x: 50, y: 300 }, // start — left centre
  { x: 200, y: 130 }, // bend up
  { x: 500, y: 300 }, // mid centre
  { x: 800, y: 470 }, // bend down
  { x: 950, y: 300 }, // finish — right centre
];

function _bw(n) {
  return Math.min(Math.max(120, n * 24), 200);
}

export class SCurveShape {
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

  getCenterPoint() {
    return this._p.getPoint(0.5);
  }
  getBandWidth(n) {
    return _bw(n);
  }
  getTotalLength() {
    return this._p.getTotalLength();
  }

  getEdgePoints(totalLanes, nSamples = 120) {
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
