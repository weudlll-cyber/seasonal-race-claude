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
  constructor() {
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
    // Debug: log current state every 5 s so camera activity is visible in console
    if (!this._logTs || ts - this._logTs >= 5000) {
      this._logTs = ts;
      console.log(
        `[CameraDirector] state=${this.state} zoom=${this.zoom.toFixed(2)}` +
          ` offsetX=${this.offsetX.toFixed(0)} offsetY=${this.offsetY.toFixed(0)}`
      );
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
  }
}
