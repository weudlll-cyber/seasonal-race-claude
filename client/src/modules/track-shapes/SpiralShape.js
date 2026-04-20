// ============================================================
// File:        SpiralShape.js
// Path:        client/src/modules/track-shapes/SpiralShape.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Asymmetric spiral-loop shape — the radius expands on one half
//              of the lap and contracts on the other, producing a teardrop
//              orbit that looks like a space gravity slingshot.
//              r_mod = 1 + AMP·sin(2πt)  →  one bulge per lap.
// ============================================================

import { perpendicularLane, buildEdgePoints } from './shapeHelpers.js';

const CY_FRAC = 0.57;
const RX_FRAC = 0.3;
const RY_FRAC = 0.2;
const SPIRAL_AMP = 0.38; // radius modulation amplitude

function _bandWidth(totalLanes) {
  return Math.min(Math.max(120, totalLanes * 24), 200);
}

export class SpiralShape {
  constructor(cw, ch) {
    this.cw = cw;
    this.ch = ch;
    this.cx = cw / 2;
    this.cy = ch * CY_FRAC;
    this.rx = cw * RX_FRAC;
    this.ry = ch * RY_FRAC;
  }

  _center(t) {
    const a = 2 * Math.PI * t - Math.PI / 2;
    const mod = 1 + SPIRAL_AMP * Math.sin(2 * Math.PI * t);
    return {
      x: this.cx + this.rx * mod * Math.cos(a),
      y: this.cy + this.ry * mod * Math.sin(a),
    };
  }

  getPosition(t, laneIndex, totalLanes) {
    const TW = _bandWidth(totalLanes);
    return perpendicularLane(this._center.bind(this), t, laneIndex, totalLanes, TW);
  }

  getCenterPoint() {
    return { x: this.cx, y: this.cy };
  }

  getBandWidth(totalLanes) {
    return _bandWidth(totalLanes);
  }

  getTotalLength() {
    let len = 0;
    const N = 100;
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
    return buildEdgePoints(this._center.bind(this), TW / 2, nSamples);
  }
}
