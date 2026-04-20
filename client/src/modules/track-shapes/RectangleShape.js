// ============================================================
// File:        RectangleShape.js
// Path:        client/src/modules/track-shapes/RectangleShape.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Superellipse (Lamé curve) circuit — looks like a rounded
//              rectangle.  Exponent exp < 1 makes the corners sharper,
//              producing a city-circuit feel.
//              x = cx + rx · sgn(cos θ) · |cos θ|^exp
//              y = cy + ry · sgn(sin θ) · |sin θ|^exp
// ============================================================

import { perpendicularLane, buildEdgePoints } from './shapeHelpers.js';

const CY_FRAC = 0.57;
const RX_FRAC = 0.38;
const RY_FRAC = 0.24;
const RECT_EXP = 0.22; // lower = sharper corners; 0.22 gives a very rectangular outline

function _bandWidth(totalLanes) {
  return Math.min(Math.max(120, totalLanes * 24), 200);
}

function _sgn(v) {
  return v >= 0 ? 1 : -1;
}

export class RectangleShape {
  constructor(cw, ch) {
    this.cw = cw;
    this.ch = ch;
    this.cx = cw / 2;
    this.cy = ch * CY_FRAC;
    this.rx = cw * RX_FRAC;
    this.ry = ch * RY_FRAC;
  }

  _center(t) {
    const theta = 2 * Math.PI * t - Math.PI / 2;
    const ct = Math.cos(theta),
      st = Math.sin(theta);
    return {
      x: this.cx + this.rx * _sgn(ct) * Math.pow(Math.abs(ct), RECT_EXP),
      y: this.cy + this.ry * _sgn(st) * Math.pow(Math.abs(st), RECT_EXP),
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
    return buildEdgePoints(this._center.bind(this), TW / 2, nSamples);
  }
}
