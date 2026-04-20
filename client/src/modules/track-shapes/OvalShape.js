// ============================================================
// File:        OvalShape.js
// Path:        client/src/modules/track-shapes/OvalShape.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Elliptical loop shape — uses concentric ellipses per lane
//              so the visible band height equals laneWidth at every point.
// ============================================================

const CY_FRAC = 0.577; // vertical center (leaves room for title above)
const RX_FRAC = 0.355; // x-radius as fraction of canvas width
const RY_FRAC = 0.243; // y-radius as fraction of canvas height

function _bandWidth(totalLanes) {
  return Math.min(Math.max(180, totalLanes * 32), 260);
}

export class OvalShape {
  constructor(cw, ch) {
    this.cw = cw;
    this.ch = ch;
    this.cx = cw / 2;
    this.cy = ch * CY_FRAC;
    this.rx = cw * RX_FRAC;
    this.ry = ch * RY_FRAC;
  }

  // Returns {x, y, angle} — angle is the travel direction in radians.
  getPosition(t, laneIndex, totalLanes) {
    const TW = _bandWidth(totalLanes);
    const laneW = TW / Math.max(totalLanes, 1);
    const delta = -TW / 2 + (laneIndex + 0.5) * laneW;
    const laneRx = this.rx + delta;
    const laneRy = this.ry + delta;
    const a = 2 * Math.PI * t - Math.PI / 2;
    const x = this.cx + laneRx * Math.cos(a);
    const y = this.cy + laneRy * Math.sin(a);
    // Tangent of ellipse at angle a: (-laneRx·sin a, laneRy·cos a)
    const angle = Math.atan2(laneRy * Math.cos(a), -laneRx * Math.sin(a));
    return { x, y, angle };
  }

  getCenterPoint() {
    return { x: this.cx, y: this.cy };
  }

  getBandWidth(totalLanes) {
    return _bandWidth(totalLanes);
  }

  // Ramanujan approximation of ellipse perimeter
  getTotalLength() {
    const a = this.rx,
      b = this.ry;
    const h = ((a - b) / (a + b)) ** 2;
    return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
  }

  // Oval-specific params for environment drawing optimisations
  getBandParams(totalLanes) {
    const TW = _bandWidth(totalLanes);
    return {
      cx: this.cx,
      cy: this.cy,
      rx: this.rx,
      ry: this.ry,
      outerRx: this.rx + TW / 2,
      outerRy: this.ry + TW / 2,
      innerRx: this.rx - TW / 2,
      innerRy: this.ry - TW / 2,
      laneWidth: TW / Math.max(totalLanes, 1),
      TW,
    };
  }

  // Sample inner/outer edge points for generic path drawing
  getEdgePoints(totalLanes, nSamples = 120) {
    const TW = _bandWidth(totalLanes);
    const outerRx = this.rx + TW / 2;
    const outerRy = this.ry + TW / 2;
    const innerRx = this.rx - TW / 2;
    const innerRy = this.ry - TW / 2;
    const outer = [],
      inner = [];
    for (let i = 0; i <= nSamples; i++) {
      const a = 2 * Math.PI * (i / nSamples) - Math.PI / 2;
      outer.push({ x: this.cx + outerRx * Math.cos(a), y: this.cy + outerRy * Math.sin(a) });
      inner.push({ x: this.cx + innerRx * Math.cos(a), y: this.cy + innerRy * Math.sin(a) });
    }
    return { outer, inner };
  }
}
