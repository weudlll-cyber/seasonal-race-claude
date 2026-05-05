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

const MAX_STATE_DURATION = 8000; // fallback when no config provided
const OVERVIEW_COOLDOWN_MS = 8000; // ms after leaving OVERVIEW before it can recur
const START_PHASE_DURATION = 3000; // ms of forced OVERVIEW at race start
const ENDGAME_PROGRESS_THRESHOLD = 0.85; // fallback when no config provided
const BATTLE_GAP_THRESHOLD = 0.05; // fallback when no config provided
const FINISH_DRAMA_DURATION = 1500; // ms of LEADER_ZOOM on winner before OVERVIEW
const LERP = 0.04; // per-frame lerp factor (~1.5s to 90% convergence at 60fps)
const MIN_ZOOM = 0.15; // floor for very large tracks (≥ ~12 000 px wide)
const MAX_ZOOM = 2.5; // ceiling for very small tracks
const CANVAS_W = 1280; // reference canvas width
const TOP_N = 3; // camera focuses on the top-N racers by position

// Relative zoom ratios applied on top of the overview zoom (CANVAS_W / worldW).
// On the 1280px reference world: overviewZoom=1, giving 1.4 / 1.6 / 1.3 —
// identical to the old absolute-VIEW_W formula to within ~0.5%.
// On large worlds (e.g. 6000px): zoom states remain visually distinct (e.g.
// 0.213 / 0.298 / 0.341) instead of collapsing to near-identical values.
const LEADER_ZOOM_RATIO = 1.4;
const BATTLE_ZOOM_RATIO = 1.6;
const COMEBACK_ZOOM_RATIO = 1.3;

export class CameraDirector {
  /**
   * @param {{ minX: number, minY: number, maxX: number, maxY: number }} [bbox]
   *   Track bounding box in canvas pixels. Defaults to the full 1280×720 canvas.
   * @param {number} [worldW=1280]  World width in pixels — used to compute adaptive zoom.
   * @param {number} [_worldH=720]  World height in pixels (reserved for future vertical scaling).
   * @param {boolean} [isOpenTrack=false]
   *   Open tracks render without bsX (effectiveZoom = BASE × cam.zoom), so overviewZoom
   *   must shrink cam.zoom to fit the world. Closed tracks apply bsX on top of cam.zoom
   *   (effScale = cam.zoom × bsX), so OVERVIEW must keep cam.zoom = 1; bsX alone handles
   *   world-to-canvas mapping. Passing the wrong value causes either black bars (false on open)
   *   or double-scaling artifacts (true on closed).
   * @param {object|null} [config=null]
   *   Optional camera tuning config (from cameraConfig.js). When provided, overrides the
   *   hardcoded zoom ratios. Call updateConfig() for live-apply without re-construction.
   *   Fields: leaderZoomMultiplier, battleZoomMultiplier, comebackZoomMultiplier.
   *   openTrackBaseZoom is consumed by the render path (effectiveZoom), not here.
   */
  constructor(
    bbox = { minX: 0, minY: 0, maxX: 1280, maxY: 720 },
    worldW = 1280,
    _worldH = 720,
    isOpenTrack = false,
    config = null
  ) {
    this._bbox = bbox;
    this._isOpenTrack = isOpenTrack;
    this._worldW = worldW;
    // Adaptive zoom: overviewZoom shows the entire world, state zooms scale up
    // from there by a fixed ratio. States remain visually distinct at any worldW:
    // leader is always 1.4× closer than overview, battle 1.6×, comeback 1.3×.
    // On the 1280px reference world overviewZoom=1, giving 1.4 / 1.6 / 1.3 —
    // backward-compatible with the previous absolute-VIEW_W formula (< 0.5% diff).
    // When config is provided, multipliers override these defaults.
    this.overviewZoom = CANVAS_W / worldW;
    this._computeZoomLevels(config);
    this._computeTimingConfig(config);
    this.state = CAM_STATE.OVERVIEW;
    this.stateEnteredAt = 0;
    this.zoom = this.overviewZoom;
    this.targetZoom = this.overviewZoom;
    this.offsetX = 0;
    this.targetOffsetX = 0;
    this.offsetY = 0;
    this.targetOffsetY = 0;
    this._lastOverviewExitTs = -Infinity; // cooldown: when did we last leave OVERVIEW
    this._finishMomentExpiry = null; // null until first finish detected
  }

  /**
   * Recompute zoom levels from a new config. Effective on the next _transition() call —
   * no race restart needed (live-apply).
   * @param {object|null} config
   */
  updateConfig(config) {
    this._computeZoomLevels(config);
    this._computeTimingConfig(config);
  }

  /**
   * Derive _leaderZoom / _battleZoom / _comebackZoom from config or hardcoded defaults.
   *
   * Open-tracks: states scale relative to overviewZoom so cam.zoom adapts to worldW.
   *   openTrackBaseZoom is NOT applied here — it lives in the render path (effectiveZoom).
   *
   * Closed-tracks: OVERVIEW uses cam.zoom=1; bsX (= CANVAS_W/worldW) handles world-to-canvas
   *   scaling at render time. States are pure ratios so effective canvas scale = ratio × bsX,
   *   keeping the hierarchy OVERVIEW < LEADER < BATTLE invariant at any worldW.
   *
   * @param {object|null} config
   */
  _computeZoomLevels(config) {
    const lr = config?.leaderZoomMultiplier ?? LEADER_ZOOM_RATIO;
    const br = config?.battleZoomMultiplier ?? BATTLE_ZOOM_RATIO;
    const cr = config?.comebackZoomMultiplier ?? COMEBACK_ZOOM_RATIO;
    if (this._isOpenTrack) {
      this._leaderZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.overviewZoom * lr));
      this._battleZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.overviewZoom * br));
      this._comebackZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.overviewZoom * cr));
    } else {
      this._leaderZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, lr));
      this._battleZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, br));
      this._comebackZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, cr));
    }
  }

  /**
   * Derive transition timing parameters from config or hardcoded fallbacks.
   * Called on construction and via updateConfig() for live-apply.
   * @param {object|null} config
   */
  _computeTimingConfig(config) {
    this._maxStateDuration = config?.maxStateDuration ?? MAX_STATE_DURATION;
    this._battleGapThreshold = config?.battleGapThreshold ?? BATTLE_GAP_THRESHOLD;
    this._endgameThreshold = config?.endgameThreshold ?? ENDGAME_PROGRESS_THRESHOLD;
  }

  // Main update — call once per frame during RACING.
  // raceState: { raceElapsed, finishedCount, winner, finishT }
  // Returns { zoom, offsetX, offsetY } to apply as ctx transform.
  update(racers, ts, raceState, canvasW, canvasH) {
    if (ts - this.stateEnteredAt >= this._maxStateDuration) {
      this._transition(racers, ts, raceState);
    }
    this._setTargets(racers, canvasW, canvasH, raceState);
    this.zoom += (this.targetZoom - this.zoom) * LERP;
    this.offsetX += (this.targetOffsetX - this.offsetX) * LERP;
    this.offsetY += (this.targetOffsetY - this.offsetY) * LERP;
    return { zoom: this.zoom, offsetX: this.offsetX, offsetY: this.offsetY };
  }

  _transition(racers, ts, raceState) {
    // Record cooldown timestamp when leaving OVERVIEW
    if (this.state === CAM_STATE.OVERVIEW) {
      this._lastOverviewExitTs = ts;
    }

    const ordered = [...racers].sort((a, b) => b.t - a.t);

    // Priority 1: Finish override — drama pulse on first finish, then OVERVIEW
    if (raceState.finishedCount > 0) {
      if (this._finishMomentExpiry === null) {
        // First detection: start 1.5s drama pulse on winner
        this._finishMomentExpiry = ts + FINISH_DRAMA_DURATION;
        this.state = CAM_STATE.LEADER_ZOOM;
        this.stateEnteredAt = ts;
      } else if (ts >= this._finishMomentExpiry) {
        // Drama pulse expired → OVERVIEW for remaining racers
        this.state = CAM_STATE.OVERVIEW;
        this.stateEnteredAt = ts;
      }
      // else: drama pulse still active, no state change
      return;
    }

    // Priority 2: Start phase — hold OVERVIEW on the full field for 3s
    if (raceState.raceElapsed < START_PHASE_DURATION) {
      this.state = CAM_STATE.OVERVIEW;
      this.stateEnteredAt = ts;
      return;
    }

    // Priority 2.5: Endgame — leader past threshold → LEADER, bypasses cooldown
    const leader = ordered[0];
    if (leader && raceState.finishT > 0) {
      const leaderProgress = leader.t / raceState.finishT;
      if (leaderProgress > this._endgameThreshold) {
        this.state = CAM_STATE.LEADER_ZOOM;
        this.stateEnteredAt = ts;
        return;
      }
    }

    const gap01 = ordered.length >= 2 ? Math.abs(ordered[0].t - ordered[1].t) : 0;
    const hasBattle = gap01 < this._battleGapThreshold;

    // Priority 3: Cooldown expired + no active battle → return to OVERVIEW
    if (!hasBattle && ts - this._lastOverviewExitTs >= OVERVIEW_COOLDOWN_MS) {
      this.state = CAM_STATE.OVERVIEW;
      this.stateEnteredAt = ts;
      return;
    }

    // Priority 4: Battle — top-2 within battleGapThreshold of track progress
    if (hasBattle) {
      this.state = CAM_STATE.BATTLE_ZOOM;
      this.stateEnteredAt = ts;
      return;
    }

    // Priority 5: Default — LEADER with COMEBACK chance when last is far behind
    const gapLeadLast = ordered.length >= 2 ? ordered[0].t - ordered[ordered.length - 1].t : 0;
    if (gapLeadLast > 0.3 && gap01 >= 0.1) {
      this.state = CAM_STATE.COMEBACK_ZOOM;
    } else {
      this.state = CAM_STATE.LEADER_ZOOM;
    }
    this.stateEnteredAt = ts;
  }

  // Returns the top-N racers by position — the set the camera focuses on.
  _focusRacers(racers) {
    return [...racers].sort((a, b) => b.t - a.t).slice(0, Math.min(TOP_N, racers.length));
  }

  _setTargets(racers, canvasW, canvasH, raceState) {
    const focusRacers = this._focusRacers(racers);
    const hw = canvasW / 2;
    const hh = canvasH / 2;

    switch (this.state) {
      case CAM_STATE.OVERVIEW: {
        // During start phase, pan to the full-field centroid so no racer is cropped
        // off-screen in the starting grid. After start phase, follow only the top-N.
        // When overviewZoom < 1 (worldW > canvasW), edgeLoX > 0 so the world-edge clamp
        // below centers the view rather than clamping — correct for full-world OVERVIEW.
        const panRacers =
          raceState && raceState.raceElapsed < START_PHASE_DURATION ? racers : focusRacers;
        const panSrc = panRacers.length ? panRacers : focusRacers;
        const cx = panSrc.length ? panSrc.reduce((s, r) => s + r.x, 0) / panSrc.length : hw;
        const cy = panSrc.length ? panSrc.reduce((s, r) => s + r.y, 0) / panSrc.length : hh;
        // Open tracks: shrink cam.zoom so effZoom (= BASE × cam.zoom) shows the full world.
        // Closed tracks: cam.zoom stays 1; bsX (= CANVAS_W/worldW) handles world-to-canvas
        // scaling independently, so applying overviewZoom here would double-scale and produce
        // black bars (effScale = overviewZoom × bsX = 0.694 on a 1536px world).
        this.targetZoom = this._isOpenTrack ? this.overviewZoom : 1;
        this.targetOffsetX = hw - cx * this.overviewZoom;
        this.targetOffsetY = hh - cy * this.overviewZoom;
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
