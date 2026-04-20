// ============================================================
// File:        SCurveShape.js
// Path:        client/src/modules/track-shapes/SCurveShape.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Oval loop with horizontal S-curve bends on the straights.
//              x = cx + rx·cos θ + wx·sin 2θ  (sin 2θ adds S-bends)
//              y = cy + ry·sin θ
//              Lanes offset perpendicularly from the centre path.
// ============================================================

import { perpendicularLane, buildEdgePoints } from './shapeHelpers.js';

const CY_FRAC = 0.57;
const RX_FRAC = 0.34;
const RY_FRAC = 0.23;
const WAVE_FRAC = 0.45; // horizontal S-wave amplitude — larger = more dramatic S-curve

function _bandWidth(totalLanes) {
  return Math.min(Math.max(120, totalLanes * 24), 200);
}

export class SCurveShape {
  constructor(cw, ch) {
    this.cw = cw;
    this.ch = ch;
    this.cx = cw / 2;
    this.cy = ch * CY_FRAC;
    this.rx = cw * RX_FRAC;
    this.ry = ch * RY_FRAC;
    this.wx = this.rx * WAVE_FRAC; // S-wave amplitude
  }

  // Centre path: oval + horizontal sine harmonic creating S-bends
  _center(t) {
    const a = 2 * Math.PI * t - Math.PI / 2;
    return {
      x: this.cx + this.rx * Math.cos(a) + this.wx * Math.sin(2 * a),
      y: this.cy + this.ry * Math.sin(a),
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
    // Numerical arc-length approximation (100 segments)
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
