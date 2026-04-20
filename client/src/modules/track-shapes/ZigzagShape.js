// ============================================================
// File:        ZigzagShape.js
// Path:        client/src/modules/track-shapes/ZigzagShape.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Stadium-style closed loop whose straight sections have a
//              sine-wave zigzag.  Four segments (top, left curve,
//              bottom, right curve) proportionally share t = 0..1.
// ============================================================

import { perpendicularLane, buildEdgePoints } from './shapeHelpers.js';

const CY_FRAC = 0.57;
const HW_FRAC = 0.4; // half-width of straights as fraction of cw
const HH_FRAC = 0.2; // half-height
const CORNER_R = 80; // corner arc radius (px)
const ZIG_AMP = 28; // zigzag amplitude (px)
const N_ZIGS = 3; // sine periods per straight

function _bandWidth(totalLanes) {
  return Math.min(Math.max(120, totalLanes * 24), 200);
}

export class ZigzagShape {
  constructor(cw, ch) {
    this.cw = cw;
    this.ch = ch;
    this.cx = cw / 2;
    this.cy = ch * CY_FRAC;
    this.hw = cw * HW_FRAC; // half-width to centre of corner arc
    this.hh = ch * HH_FRAC;
    this.R = Math.min(CORNER_R, this.hh * 0.8);

    // Pre-compute segment lengths for proportional t
    const straightLen = 2 * (this.hw - this.R);
    const arcLen = (Math.PI / 2) * this.R;
    const total = 2 * straightLen + 2 * straightLen + 4 * arcLen; // top+bottom+left+right + 4 arcs

    // Actually layout: top-straight (right→left), top-left arc, left-straight (top→bottom),
    // bottom-left arc, bottom-straight (left→right), bottom-right arc, right-straight (bottom→top), top-right arc
    // For simplicity we treat top/bottom as horizontal and left/right as vertical.
    const hStraight = 2 * (this.hw - this.R); // horizontal straight length
    const vStraight = 2 * (this.hh - this.R); // vertical straight length
    const totalLen = 2 * hStraight + 2 * vStraight + 2 * Math.PI * this.R;

    this._tH = hStraight / totalLen; // t fraction for horizontal straights
    this._tV = vStraight / totalLen; // t fraction for vertical straights
    this._tA = (Math.PI * this.R) / 2 / totalLen; // t fraction for each quarter-arc
  }

  _center(t) {
    const { cx, cy, hw, hh, R, _tH, _tV, _tA } = this;
    // Clockwise from top-right corner:
    // Segment 0: top straight, right→left   [0, _tH)
    // Segment 1: top-left arc               [_tH, _tH+_tA)
    // Segment 2: left straight, top→bottom  [_tH+_tA, _tH+_tA+_tV)
    // Segment 3: bottom-left arc            [_tH+_tA+_tV, _tH+_tA+_tV+_tA)
    // Segment 4: bottom straight, left→right[_tH+_tA+_tV+_tA, 2*_tH+2*_tA+_tV)
    // Segment 5: bottom-right arc           [...]
    // Segment 6: right straight, bottom→top [...]
    // Segment 7: top-right arc              [...]

    const s0 = 0;
    const s1 = _tH;
    const s2 = s1 + _tA;
    const s3 = s2 + _tV;
    const s4 = s3 + _tA;
    const s5 = s4 + _tH;
    const s6 = s5 + _tA;
    const s7 = s6 + _tV;
    // s7 + _tA = 1.0

    if (t < s1) {
      // Top straight: right→left, with zigzag in y
      const s = (t - s0) / _tH;
      const x = cx + (hw - R) - 2 * (hw - R) * s;
      const zig = ZIG_AMP * Math.sin(s * N_ZIGS * Math.PI);
      return { x, y: cy - hh + zig };
    } else if (t < s2) {
      // Top-left arc (going from top to left)
      const s = (t - s1) / _tA;
      const a = -Math.PI / 2 - (Math.PI / 2) * s;
      return { x: cx - (hw - R) + R * Math.cos(a), y: cy - (hh - R) + R * Math.sin(a) };
    } else if (t < s3) {
      // Left straight: top→bottom, with zigzag in x
      const s = (t - s2) / _tV;
      const y = cy - (hh - R) + 2 * (hh - R) * s;
      const zig = ZIG_AMP * Math.sin(s * N_ZIGS * Math.PI);
      return { x: cx - hw + zig, y };
    } else if (t < s4) {
      // Bottom-left arc
      const s = (t - s3) / _tA;
      const a = Math.PI - (Math.PI / 2) * s;
      return { x: cx - (hw - R) + R * Math.cos(a), y: cy + (hh - R) + R * Math.sin(a) };
    } else if (t < s5) {
      // Bottom straight: left→right, with zigzag in y
      const s = (t - s4) / _tH;
      const x = cx - (hw - R) + 2 * (hw - R) * s;
      const zig = ZIG_AMP * Math.sin(s * N_ZIGS * Math.PI);
      return { x, y: cy + hh + zig };
    } else if (t < s6) {
      // Bottom-right arc
      const s = (t - s5) / _tA;
      const a = Math.PI / 2 - (Math.PI / 2) * s;
      return { x: cx + (hw - R) + R * Math.cos(a), y: cy + (hh - R) + R * Math.sin(a) };
    } else if (t < s7) {
      // Right straight: bottom→top, with zigzag in x
      const s = (t - s6) / _tV;
      const y = cy + (hh - R) - 2 * (hh - R) * s;
      const zig = ZIG_AMP * Math.sin(s * N_ZIGS * Math.PI);
      return { x: cx + hw + zig, y };
    } else {
      // Top-right arc
      const s = (t - s7) / _tA;
      const a = 0 - (Math.PI / 2) * s;
      return { x: cx + (hw - R) + R * Math.cos(a), y: cy - (hh - R) + R * Math.sin(a) };
    }
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
