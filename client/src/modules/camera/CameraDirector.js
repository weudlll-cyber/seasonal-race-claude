// ============================================================
// File:        CameraDirector.js
// Path:        client/src/modules/camera/CameraDirector.js
// Project:     RaceArena
// Created:     2026-04-22
// Description: TV-style camera state machine for closed-track races.
//              Switches between OVERVIEW / LEADER_ZOOM / BATTLE_ZOOM /
//              COMEBACK_ZOOM states, lerp-smoothed zoom and pan.
// ============================================================

export const CAM_STATE = {
  OVERVIEW: 'OVERVIEW',
  LEADER_ZOOM: 'LEADER_ZOOM',
  BATTLE_ZOOM: 'BATTLE_ZOOM',
  COMEBACK_ZOOM: 'COMEBACK_ZOOM',
};

const MAX_STATE_DURATION = 8000; // ms before trying a new camera angle
const LERP = 0.04; // per-frame lerp factor (~1.5s to 90% convergence at 60fps)

export class CameraDirector {
  /**
   * @param {{ minX: number, minY: number, maxX: number, maxY: number }} [bbox]
   *   Track bounding box in canvas pixels. Defaults to the full 1280×720 canvas,
   *   which preserves existing behaviour for legacy SvgPathShape tracks.
   */
  constructor(bbox = { minX: 0, minY: 0, maxX: 1280, maxY: 720 }) {
    this._bbox = bbox;
    this.state = CAM_STATE.OVERVIEW;
    this.stateEnteredAt = 0;
    this.zoom = 1;
    this.targetZoom = 1;
    this.offsetX = 0;
    this.targetOffsetX = 0;
    this.offsetY = 0;
    this.targetOffsetY = 0;
  }

  // Main update — call once per frame during RACING.
  // Returns { zoom, offsetX, offsetY } to apply as ctx transform.
  update(racers, ts, canvasW, canvasH) {
    if (ts - this.stateEnteredAt >= MAX_STATE_DURATION) {
      this._transition(racers, ts);
    }
    this._setTargets(racers, canvasW, canvasH);
    this.zoom += (this.targetZoom - this.zoom) * LERP;
    this.offsetX += (this.targetOffsetX - this.offsetX) * LERP;
    this.offsetY += (this.targetOffsetY - this.offsetY) * LERP;
    return { zoom: this.zoom, offsetX: this.offsetX, offsetY: this.offsetY };
  }

  _transition(racers, ts) {
    const ordered = [...racers].sort((a, b) => b.t - a.t);
    const gap01 = ordered.length >= 2 ? Math.abs(ordered[0].t - ordered[1].t) : 0;
    const gapLeadLast = ordered.length >= 2 ? ordered[0].t - ordered[ordered.length - 1].t : 0;

    const hasBattle = gap01 < 0.05; // top-2 within 5% of track
    const hasLeaderGap = gap01 >= 0.15; // leader ≥ 15% ahead of 2nd (was 20%)
    const hasComeback = gapLeadLast > 0.15; // last > 15% behind leader (was 20%)

    const roll = Math.random();
    if (hasBattle && roll < 0.7) {
      this.state = CAM_STATE.BATTLE_ZOOM;
    } else if (hasLeaderGap && roll < 0.7) {
      this.state = CAM_STATE.LEADER_ZOOM;
    } else if (hasComeback && roll < 0.5) {
      this.state = CAM_STATE.COMEBACK_ZOOM;
    } else if (roll < 0.6) {
      this.state = CAM_STATE.LEADER_ZOOM;
    } else {
      this.state = CAM_STATE.OVERVIEW;
    }
    this.stateEnteredAt = ts;
  }

  _setTargets(racers, canvasW, canvasH) {
    const ordered = [...racers].sort((a, b) => b.t - a.t);
    const hw = canvasW / 2;
    const hh = canvasH / 2;

    switch (this.state) {
      case CAM_STATE.OVERVIEW:
        this.targetZoom = 1;
        this.targetOffsetX = 0;
        this.targetOffsetY = 0;
        break;

      case CAM_STATE.LEADER_ZOOM: {
        const r = ordered[0];
        if (r) {
          this.targetZoom = 1.4;
          this.targetOffsetX = hw - r.x * 1.4;
          this.targetOffsetY = hh - r.y * 1.4;
        }
        break;
      }

      case CAM_STATE.BATTLE_ZOOM: {
        const top2 = ordered.slice(0, 2);
        const cx = top2.reduce((s, r) => s + r.x, 0) / top2.length;
        const cy = top2.reduce((s, r) => s + r.y, 0) / top2.length;
        this.targetZoom = 1.6;
        this.targetOffsetX = hw - cx * 1.6;
        this.targetOffsetY = hh - cy * 1.6;
        break;
      }

      case CAM_STATE.COMEBACK_ZOOM: {
        const last = ordered[ordered.length - 1];
        if (last) {
          this.targetZoom = 1.3;
          this.targetOffsetX = hw - last.x * 1.3;
          this.targetOffsetY = hh - last.y * 1.3;
        }
        break;
      }
    }

    // Clamp so the track bounding box never drifts entirely off-screen
    const b = this._bbox;
    this.targetOffsetX = this._clampOffset(
      this.targetOffsetX,
      b.minX,
      b.maxX,
      canvasW,
      this.targetZoom
    );
    this.targetOffsetY = this._clampOffset(
      this.targetOffsetY,
      b.minY,
      b.maxY,
      canvasH,
      this.targetZoom
    );
  }

  // Clamps a camera offset so the viewport never exposes the canvas edge (black strips),
  // and, when the track bbox fits on-screen at the current zoom, further restricts so the
  // track stays visible.
  //
  // Canvas-edge (hard outer limit):
  //   offsetX >= canvasSize * (1 - zoom)  →  world right edge covers screen right
  //   offsetX <= 0                        →  world left edge covers screen left
  //
  // Bbox (inner tightening, only when track fits at this zoom):
  //   lo = -bboxMin * zoom  (left edge ≥ 0)
  //   hi = canvasSize - bboxMax * zoom  (right edge ≤ canvasSize)
  _clampOffset(val, bboxMin, bboxMax, canvasSize, zoom) {
    // Hard canvas-edge constraint
    let lo = canvasSize * (1 - zoom);
    let hi = 0;

    // Optional bbox tightening (only when track fits in the viewport)
    const bboxLo = -bboxMin * zoom;
    const bboxHi = canvasSize - bboxMax * zoom;
    if (bboxLo <= bboxHi) {
      lo = Math.max(lo, bboxLo);
      hi = Math.min(hi, bboxHi);
    }

    if (lo > hi) return 0; // should not happen for zoom ≥ 1; safe fallback
    return Math.max(lo, Math.min(hi, val));
  }
}
