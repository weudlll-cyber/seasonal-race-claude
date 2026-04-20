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

// 16 control points on 1000×600 design grid.
// Rectangle: TL(100,120) → TR(900,120) → BR(900,500) → BL(100,500)
// Three points per corner (enter, arc-mid at 45°, exit); one mid per straight.
// Arc-mid formula: corner_center + r*(cos θ, sin θ) at 45° through the corner, r=55.
const CONTROL_POINTS = [
  { x: 155, y: 120 }, // TL exit → going right
  { x: 500, y: 120 }, // top straight mid
  { x: 845, y: 120 }, // TR enter
  { x: 884, y: 136 }, // TR arc-mid  (center 845,175  angle 315°)
  { x: 900, y: 175 }, // TR exit → going down
  { x: 900, y: 310 }, // right straight mid
  { x: 900, y: 445 }, // BR enter
  { x: 884, y: 484 }, // BR arc-mid  (center 845,445  angle  45°)
  { x: 845, y: 500 }, // BR exit → going left
  { x: 500, y: 500 }, // bottom straight mid
  { x: 155, y: 500 }, // BL enter
  { x: 116, y: 484 }, // BL arc-mid  (center 155,445  angle 135°)
  { x: 100, y: 445 }, // BL exit → going up
  { x: 100, y: 310 }, // left straight mid
  { x: 100, y: 175 }, // TL enter
  { x: 116, y: 136 }, // TL arc-mid  (center 155,175  angle 225°)
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
