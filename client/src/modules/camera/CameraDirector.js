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
const MIN_ZOOM = 0.15; // floor for very large tracks (≥ ~12 000 px wide)
const MAX_ZOOM = 2.5; // ceiling for very small tracks
const CANVAS_W = 1280; // reference canvas width used in the adaptive-zoom formula
const TOP_N = 3; // camera focuses on the top-N racers by position

// How many world-pixels each camera state keeps in view horizontally.
// On the 1280px reference world these give zoom ≈ 1.4 / 1.6 / 1.3.
const LEADER_VIEW_W = 910;
const BATTLE_VIEW_W = 800;
const COMEBACK_VIEW_W = 985;

export class CameraDirector {
  /**
   * @param {{ minX: number, minY: number, maxX: number, maxY: number }} [bbox]
   *   Track bounding box in canvas pixels. Defaults to the full 1280×720 canvas.
   * @param {number} [worldW=1280]  World width in pixels — used to compute adaptive zoom.
   * @param {number} [_worldH=720]  World height in pixels (reserved for future vertical scaling).
   */
  constructor(bbox = { minX: 0, minY: 0, maxX: 1280, maxY: 720 }, worldW = 1280, _worldH = 720) {
    this._bbox = bbox;
    // Adaptive zoom: keeps a constant ~71 % of the world visible regardless of
    // track size.  Formula: (CANVAS_W / VIEW_W) * (CANVAS_W / worldW).
    // At worldW = CANVAS_W this reduces to CANVAS_W / VIEW_W (≈ 1.41 / 1.60 / 1.30).
    // For larger worlds the second factor < 1, producing zoom-out.
    this._leaderZoom = Math.max(
      MIN_ZOOM,
      Math.min(MAX_ZOOM, (CANVAS_W * CANVAS_W) / (LEADER_VIEW_W * worldW))
    );
    this._battleZoom = Math.max(
      MIN_ZOOM,
      Math.min(MAX_ZOOM, (CANVAS_W * CANVAS_W) / (BATTLE_VIEW_W * worldW))
    );
    this._comebackZoom = Math.max(
      MIN_ZOOM,
      Math.min(MAX_ZOOM, (CANVAS_W * CANVAS_W) / (COMEBACK_VIEW_W * worldW))
    );
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

  // Returns the top-N racers by position — the set the camera focuses on.
  _focusRacers(racers) {
    return [...racers].sort((a, b) => b.t - a.t).slice(0, Math.min(TOP_N, racers.length));
  }

  _setTargets(racers, canvasW, canvasH) {
    const focusRacers = this._focusRacers(racers);
    const hw = canvasW / 2;
    const hh = canvasH / 2;

    switch (this.state) {
      case CAM_STATE.OVERVIEW: {
        // Pan to the center of the top-N racers so the camera follows the action
        // on large tracks. On 1280-reference tracks clampOffset forces offset back to 0.
        const cx = focusRacers.length
          ? focusRacers.reduce((s, r) => s + r.x, 0) / focusRacers.length
          : hw;
        const cy = focusRacers.length
          ? focusRacers.reduce((s, r) => s + r.y, 0) / focusRacers.length
          : hh;
        this.targetZoom = 1;
        this.targetOffsetX = hw - cx;
        this.targetOffsetY = hh - cy;
        break;
      }

      case CAM_STATE.LEADER_ZOOM: {
        const r = focusRacers[0];
        if (r) {
          this.targetZoom = this._leaderZoom;
          this.targetOffsetX = hw - r.x * this._leaderZoom;
          this.targetOffsetY = hh - r.y * this._leaderZoom;
        }
        break;
      }

      case CAM_STATE.BATTLE_ZOOM: {
        const top2 = focusRacers.slice(0, 2);
        const cx = top2.reduce((s, r) => s + r.x, 0) / top2.length;
        const cy = top2.reduce((s, r) => s + r.y, 0) / top2.length;
        this.targetZoom = this._battleZoom;
        this.targetOffsetX = hw - cx * this._battleZoom;
        this.targetOffsetY = hh - cy * this._battleZoom;
        break;
      }

      case CAM_STATE.COMEBACK_ZOOM: {
        // Target 3rd-place (bottom of top-N) rather than last-place, keeping the
        // camera near the main field even when last-place lags far behind.
        const target = focusRacers[focusRacers.length - 1];
        if (target) {
          this.targetZoom = this._comebackZoom;
          this.targetOffsetX = hw - target.x * this._comebackZoom;
          this.targetOffsetY = hh - target.y * this._comebackZoom;
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

    // World-edge clamp: prevent positive offsets that expose the black canvas
    // background when the world fits entirely within the viewport.
    // If zoom < 1 and world fits, center instead of leaving a black strip.
    const edgeLoX = canvasW * (1 - this.targetZoom);
    const edgeLoY = canvasH * (1 - this.targetZoom);
    this.targetOffsetX =
      edgeLoX > 0 ? edgeLoX / 2 : Math.max(edgeLoX, Math.min(0, this.targetOffsetX));
    this.targetOffsetY =
      edgeLoY > 0 ? edgeLoY / 2 : Math.max(edgeLoY, Math.min(0, this.targetOffsetY));
  }

  // Clamps a camera offset so no black strips appear and, when the track bbox fits
  // in the viewport, the entire track stays visible.
  //
  //   a = -bboxMin * zoom          → offset where world-left aligns to canvas-left
  //   b = canvasSize - bboxMax*zoom → offset where world-right aligns to canvas-right
  //
  // When b ≤ a (world wider than viewport): pan freely within [b, a] — no black strips.
  // When b > a (track fits in viewport):    keep track fully visible within [a, b].
  // Both cases reduce to clamp(val, min(a,b), max(a,b)).
  _clampOffset(val, bboxMin, bboxMax, canvasSize, zoom) {
    const a = 0 - bboxMin * zoom; // 0 - avoids -0 when bboxMin is 0
    const b = canvasSize - bboxMax * zoom;
    return Math.max(Math.min(a, b), Math.min(Math.max(a, b), val));
  }
}
