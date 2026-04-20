// ============================================================
// File:        RectangleShape.js
// Path:        client/src/modules/track-shapes/RectangleShape.js
// Project:     RaceArena
// Description: City Circuit — closed rectangular loop with rounded corners.
//              12 control points (2 per corner + 1 midpoint per straight)
//              keep the Catmull-Rom curve close to a true rectangle while
//              giving naturally smooth ~60px corner radii.
//              t=0 = t=1 at the start/finish straight.
// ============================================================

import { PathInterpolator } from './PathInterpolator.js';

// 12 control points on 1000×600 design grid.
// Outer rectangle: TL(100,120) → TR(900,120) → BR(900,500) → BL(100,500)
// Two points bracket each corner; one point sits mid-straight.
const CONTROL_POINTS = [
  { x: 155, y: 120 }, // post-TL → going right (top straight start)
  { x: 500, y: 120 }, // top straight mid
  { x: 845, y: 120 }, // pre-TR
  { x: 900, y: 175 }, // post-TR → going down (right straight start)
  { x: 900, y: 310 }, // right straight mid
  { x: 900, y: 445 }, // pre-BR
  { x: 845, y: 500 }, // post-BR → going left (bottom straight start)
  { x: 500, y: 500 }, // bottom straight mid
  { x: 155, y: 500 }, // pre-BL
  { x: 100, y: 445 }, // post-BL → going up (left straight start)
  { x: 100, y: 310 }, // left straight mid
  { x: 100, y: 175 }, // pre-TL
];

function _bw(n) {
  return Math.min(Math.max(120, n * 24), 200);
}

export class RectangleShape {
  constructor(cw, ch) {
    this.cw = cw;
    this.ch = ch;
    this._p = new PathInterpolator(CONTROL_POINTS, { closed: true, cw, ch });
  }

  getPosition(t, laneIndex, totalLanes) {
    const TW = _bw(totalLanes);
    const delta = -TW / 2 + (laneIndex + 0.5) * (TW / Math.max(totalLanes, 1));
    const angle = this._p.getTangentAngle(t);
    const c = this._p.getPoint(t);
    const perp = angle + Math.PI / 2;
    return { x: c.x + Math.cos(perp) * delta, y: c.y + Math.sin(perp) * delta, angle };
  }

  // Return the visual centre of the rectangle, not the arc midpoint
  getCenterPoint() {
    return { x: this.cw * 0.5, y: this.ch * 0.517 };
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
