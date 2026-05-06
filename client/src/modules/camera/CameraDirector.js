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

// Base zoom multiplier for open tracks — applied in the render path (effectiveZoom),
// not inside CameraDirector. Exported so RaceScreen can use the same constant.
export const OPEN_TRACK_BASE_ZOOM = 1.5;

const MAX_STATE_DURATION = 8000; // fallback when no config provided
const OVERVIEW_COOLDOWN_MS = 8000; // ms after leaving OVERVIEW before it can recur
const START_PHASE_DURATION = 3000; // ms of forced OVERVIEW at race start
const ENDGAME_PROGRESS_THRESHOLD = 0.85; // fallback when no config provided
const BATTLE_GAP_THRESHOLD = 0.05; // fallback when no config provided
const FINISH_DRAMA_DURATION = 1500; // ms of LEADER_ZOOM on winner before OVERVIEW
const POST_START_HOLD_MS = 7000; // ms of forced LEADER after start phase (no BATTLE during this window)
const BATTLE_COOLDOWN_MS = 8000; // ms after leaving BATTLE before BATTLE can re-trigger
const BATTLE_MAX_DURATION = 6000; // ms BATTLE can hold before forced transition
const MIN_STATE_HOLD_MS = 5000; // minimum ms any state is held before _transition() fires
const LERP = 0.04; // per-frame lerp factor (~1.5s to 90% convergence at 60fps)
const MAX_INVERSE_ZOOM = 5.0; // ceiling for inverse (targetSize-based) zoom
const CANVAS_W = 1280; // reference canvas width
const CANVAS_H_REF = 720; // reference canvas height for pct → px conversion
const TOP_N = 3; // camera focuses on the top-N racers by position
const FALLBACK_REFERENCE_SPRITE_SIZE = 36; // used when referenceSpriteSize is not provided
const DEFAULT_SPRITE_PCT = { overview: 0.05, leader: 0.08, battle: 0.12, comeback: 0.065 };

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
   *   Optional camera tuning config (from cameraConfig.js). Drives the inverse-zoom
   *   path via spritePctOfCanvas. When spritePctOfCanvas is missing, DEFAULT_SPRITE_PCT
   *   is used. Call updateConfig() for live-apply without re-construction.
   * @param {number} [referenceSpriteSize=0]
   *   displaySize × displaySizeScale for the race's racer type. When 0, a console
   *   warning is emitted and FALLBACK_REFERENCE_SPRITE_SIZE (36px) is used instead.
   */
  constructor(
    bbox = { minX: 0, minY: 0, maxX: 1280, maxY: 720 },
    worldW = 1280,
    _worldH = 720,
    isOpenTrack = false,
    config = null,
    referenceSpriteSize = 0
  ) {
    this._bbox = bbox;
    this._isOpenTrack = isOpenTrack;
    this._worldW = worldW;
    this._referenceSpriteSize = referenceSpriteSize;
    // Adaptive overview zoom: shows the entire world at cam.zoom=overviewZoom.
    // For closed tracks, OVERVIEW uses cam.zoom=1 (bsX handles world mapping).
    // For open tracks, OVERVIEW uses cam.zoom=overviewZoom to shrink the field of view.
    this.overviewZoom = CANVAS_W / worldW;
    this._computeZoomLevels(config);
    this._computeTimingConfig(config);
    this.state = CAM_STATE.OVERVIEW;
    this.stateEnteredAt = 0;
    this._inFinishDrama = false;
    this.zoom = this.overviewZoom;
    this.targetZoom = this.overviewZoom;
    this.offsetX = 0;
    this.targetOffsetX = 0;
    this.offsetY = 0;
    this.targetOffsetY = 0;
    this._lastOverviewExitTs = -Infinity; // cooldown: when did we last leave OVERVIEW
    this._lastBattleExitTs = -Infinity; // cooldown: when did we last leave BATTLE
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
   * Compute cam.zoom so that a sprite of _referenceSpriteSize renders at targetSizePx
   * screen pixels in the current camera state.
   *
   * Inverse logic:
   *   Closed: screenPx = baseSize × cam.zoom × bsX  →  cam.zoom = targetPx / (baseSize × bsX)
   *   Open:   screenPx = baseSize × cam.zoom × BASE  →  cam.zoom = targetPx / (baseSize × BASE)
   *
   * This guarantees cross-track invariance: the same targetSizePx produces the same
   * on-screen sprite size regardless of worldW (L62 proof).
   *
   * Safety nets (L60): result is clamped to [minZoom, MAX_INVERSE_ZOOM] where minZoom
   * equals 1.0 for closed tracks or overviewZoom for open tracks — so zoom states
   * never show less world context than OVERVIEW.
   *
   * @param {number} targetSizePx  Desired sprite size in screen pixels
   * @returns {number}             cam.zoom to assign to this state
   */
  _computeZoomForTargetSize(targetSizePx) {
    const baseSize =
      this._referenceSpriteSize > 0 ? this._referenceSpriteSize : FALLBACK_REFERENCE_SPRITE_SIZE;

    let rawZoom;
    if (this._isOpenTrack) {
      rawZoom = targetSizePx / (baseSize * OPEN_TRACK_BASE_ZOOM);
    } else {
      const bsX = CANVAS_W / this._worldW;
      rawZoom = targetSizePx / (baseSize * bsX);
    }

    const minZoom = this._isOpenTrack ? this.overviewZoom : 1.0;
    return Math.max(minZoom, Math.min(MAX_INVERSE_ZOOM, rawZoom));
  }

  /**
   * Derive _leaderZoom / _battleZoom / _comebackZoom from config.
   *
   * Each zoom level is computed so sprites render at the configured fraction of canvas
   * height (spritePctOfCanvas). When config lacks spritePctOfCanvas, DEFAULT_SPRITE_PCT
   * is used. When referenceSpriteSize is 0, a 36px fallback is used with a console warning.
   * Cross-track invariant: same pct → same screen pixels on any track width.
   *
   * Edge case: if effectiveOverviewPx already exceeds a state's target (e.g. large sprites
   * on a narrow open track), the safety net in _computeZoomForTargetSize clamps zoom to
   * overviewZoom — that state appears visually identical to OVERVIEW. Fix: raise pct values
   * or reduce sprite displaySize.
   *
   * @param {object|null} config
   */
  _computeZoomLevels(config) {
    const pct = config?.spritePctOfCanvas ?? DEFAULT_SPRITE_PCT;

    if (!this._referenceSpriteSize || this._referenceSpriteSize <= 0) {
      console.warn(
        `[CameraDirector] referenceSpriteSize not set — using internal default ${FALLBACK_REFERENCE_SPRITE_SIZE}px. ` +
          'Pass displaySize × displaySizeScale to the constructor.'
      );
    }

    this._leaderZoom = this._computeZoomForTargetSize(pct.leader * CANVAS_H_REF);
    this._battleZoom = this._computeZoomForTargetSize(pct.battle * CANVAS_H_REF);
    this._comebackZoom = this._computeZoomForTargetSize(pct.comeback * CANVAS_H_REF);
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
    this._postStartHoldMs = config?.postStartHoldMs ?? POST_START_HOLD_MS;
    this._battleCooldownMs = config?.battleCooldownMs ?? BATTLE_COOLDOWN_MS;
    this._battleMaxDuration = config?.battleMaxDuration ?? BATTLE_MAX_DURATION;
    this._minStateHoldMs = config?.minStateHoldMs ?? MIN_STATE_HOLD_MS;
    this._showDiagnostics = config?.showCameraDiagnostics ?? false;
  }

  // Main update — call once per frame during RACING.
  // raceState: { raceElapsed, finishedCount, winner, finishT }
  // Returns { zoom, offsetX, offsetY } to apply as ctx transform.
  update(racers, ts, raceState, canvasW, canvasH) {
    const stateAge = ts - this.stateEnteredAt;
    const stateCap =
      this.state === CAM_STATE.BATTLE_ZOOM ? this._battleMaxDuration : this._maxStateDuration;
    if (stateAge >= Math.max(this._minStateHoldMs, stateCap)) {
      // Pre-set the battle exit timestamp so the cooldown blocks immediate BATTLE re-entry
      // when battleMaxDuration expires while hasBattle is still true.
      if (this.state === CAM_STATE.BATTLE_ZOOM) {
        this._lastBattleExitTs = ts;
      }
      this._transition(racers, ts, raceState);
    }
    this._setTargets(racers, canvasW, canvasH, raceState);
    this.zoom += (this.targetZoom - this.zoom) * LERP;
    this.offsetX += (this.targetOffsetX - this.offsetX) * LERP;
    this.offsetY += (this.targetOffsetY - this.offsetY) * LERP;
    return { zoom: this.zoom, offsetX: this.offsetX, offsetY: this.offsetY };
  }

  _transition(racers, ts, raceState) {
    const prevState = this.state;
    const prevEnteredAt = this.stateEnteredAt;

    // Record cooldown timestamp when leaving OVERVIEW
    if (prevState === CAM_STATE.OVERVIEW) {
      this._lastOverviewExitTs = ts;
    }

    const ordered = [...racers].sort((a, b) => b.t - a.t);
    const leader = ordered[0];
    const leaderProgress = leader && raceState.finishT > 0 ? leader.t / raceState.finishT : 0;
    const gap01 = ordered.length >= 2 ? Math.abs(ordered[0].t - ordered[1].t) : 0;
    const gapLeadLast = ordered.length >= 2 ? ordered[0].t - ordered[ordered.length - 1].t : 0;
    const hasBattle = gap01 < this._battleGapThreshold;
    const battleCooledDown = ts - this._lastBattleExitTs >= this._battleCooldownMs;

    // Determine next state via priority chain
    let nextState;
    let reason;

    // Priority 1: Finish override — drama pulse on first finish, then OVERVIEW
    if (raceState.finishedCount > 0) {
      if (this._finishMomentExpiry === null) {
        this._finishMomentExpiry = ts + FINISH_DRAMA_DURATION;
        this._inFinishDrama = true;
        nextState = CAM_STATE.LEADER_ZOOM;
        reason = 'finish: drama pulse on first finish';
      } else if (ts >= this._finishMomentExpiry) {
        this._inFinishDrama = false;
        nextState = CAM_STATE.OVERVIEW;
        reason = 'finish: drama expired → OVERVIEW';
      } else {
        return; // drama still active, no state change
      }
    }
    // Priority 2: Start phase — hold OVERVIEW on the full field for 3s
    else if (raceState.raceElapsed < START_PHASE_DURATION) {
      nextState = CAM_STATE.OVERVIEW;
      reason = 'start-phase: raceElapsed < 3000ms';
    }
    // Priority 2.1: Post-start hold — force LEADER for postStartHoldMs after start phase.
    // Prevents BATTLE from firing on natural cluster gaps at race start.
    else if (raceState.raceElapsed < START_PHASE_DURATION + this._postStartHoldMs) {
      nextState = CAM_STATE.LEADER_ZOOM;
      reason = `post-start-hold: raceElapsed=${(raceState.raceElapsed / 1000).toFixed(1)}s`;
    }
    // Priority 2.5: Endgame — leader past threshold → LEADER, bypasses cooldown
    else if (leaderProgress > this._endgameThreshold) {
      nextState = CAM_STATE.LEADER_ZOOM;
      reason = `endgame: leaderProgress=${leaderProgress.toFixed(2)} > ${this._endgameThreshold}`;
    }
    // Priority 3: Cooldown expired + no active battle → return to OVERVIEW
    else if (!hasBattle && ts - this._lastOverviewExitTs >= OVERVIEW_COOLDOWN_MS) {
      nextState = CAM_STATE.OVERVIEW;
      reason = 'cooldown: expired + no battle';
    }
    // Priority 4: Battle — top-2 within battleGapThreshold, off cooldown
    else if (hasBattle && battleCooledDown) {
      nextState = CAM_STATE.BATTLE_ZOOM;
      reason = `battle: gap01=${gap01.toFixed(3)} < threshold=${this._battleGapThreshold}`;
    }
    // Priority 5: Default — LEADER with COMEBACK chance when last is far behind
    else if (gapLeadLast > 0.3 && gap01 >= 0.1) {
      nextState = CAM_STATE.COMEBACK_ZOOM;
      reason = `comeback: gapLeadLast=${gapLeadLast.toFixed(3)} > 0.3, gap01=${gap01.toFixed(3)} ≥ 0.1`;
    } else {
      nextState = CAM_STATE.LEADER_ZOOM;
      reason = 'leader: default (no battle, no cooldown-OVERVIEW, no comeback)';
    }

    // Commit state transition
    this.state = nextState;
    this.stateEnteredAt = ts;

    // Track battle exit for cooldown (natural exits — forced exits handled in update())
    if (prevState === CAM_STATE.BATTLE_ZOOM && nextState !== CAM_STATE.BATTLE_ZOOM) {
      this._lastBattleExitTs = ts;
    }

    // Diagnostic log
    if (this._showDiagnostics && nextState !== prevState) {
      console.warn(
        `[CAMERA] ${prevState} → ${nextState} | reason: ${reason} | ` +
          `gap01=${gap01.toFixed(3)}, leaderProgress=${leaderProgress.toFixed(2)}, ` +
          `raceElapsed=${(raceState.raceElapsed / 1000).toFixed(1)}s, ` +
          `stateAge=${((ts - prevEnteredAt) / 1000).toFixed(1)}s`
      );
    }
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

  /**
   * Display state for the camera HUD.
   * Returns 'FINISH' during the finish drama window, otherwise this.state.
   */
  get hudState() {
    return this._inFinishDrama ? 'FINISH' : this.state;
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
