// ============================================================
// File:        CameraDirector.js
// Path:        client/src/modules/camera/CameraDirector.js
// Project:     RaceArena
// Created:     2026-04-22
// Description: TV-style camera state machine for closed-track races.
//              Switches between OVERVIEW / LEADER_ZOOM / BATTLE_ZOOM /
//              COMEBACK_ZOOM states, lerp-smoothed zoom and pan.
// ============================================================

import { getPanTarget } from './panTarget.js';
import { resolveCamera } from './resolveCamera.js';

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
const START_PHASE_DURATION = 3000; // ms of forced OVERVIEW at race start
const ENDGAME_PROGRESS_THRESHOLD = 0.85; // fallback when no config provided
const BATTLE_GAP_THRESHOLD = 0.05; // fallback when no config provided
const BATTLE_EXIT_BUFFER = 0.02; // hysteresis: BATTLE stays until gap >= threshold + buffer
const FINISH_DRAMA_DURATION = 1500; // ms of LEADER_ZOOM on winner before OVERVIEW
const POST_START_HOLD_MS = 7000; // ms of forced LEADER after start phase (no BATTLE during this window)
const BATTLE_COOLDOWN_MS = 8000; // ms after leaving BATTLE before BATTLE can re-trigger
const BATTLE_MAX_DURATION = 6000; // ms BATTLE can hold before forced transition
const MIN_STATE_HOLD_MS = 5000; // minimum ms any state is held before _transition() fires
const FRAME_RATE = 60; // assumed display frame rate for lerp formula
const CAMERA_TRANSITION_SECONDS = 1.5; // fallback transition time constant (90% convergence ≈ 3.45× TC)
const OVERVIEW_COOLDOWN_MIN = 15000; // min ms after leaving OVERVIEW before it can recur
const OVERVIEW_COOLDOWN_MAX = 25000; // max ms — jittered each exit for variety
const MAX_INVERSE_ZOOM = 5.0; // ceiling for inverse (targetSize-based) zoom
const CANVAS_W = 1280; // reference canvas width
const CANVAS_H_REF = 720; // reference canvas height for pct → px conversion
const TOP_N = 3; // camera focuses on the top-N racers by position
const FALLBACK_REFERENCE_SPRITE_SIZE = 36; // used when referenceSpriteSize is not provided
const DEFAULT_SPRITE_PCT = { overview: 0.05, leader: 0.08, battle: 0.12, comeback: 0.065 };
const DEFAULT_INNER_FRAME_PCT = 0.7;

export class CameraDirector {
  /**
   * @param {number} [worldW=1280]  World width in pixels — used to compute adaptive zoom and pan bounds.
   * @param {number} [worldH=720]   World height in pixels — used for pan bounds.
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
    worldW = 1280,
    worldH = 720,
    isOpenTrack = false,
    config = null,
    referenceSpriteSize = 0
  ) {
    this._isOpenTrack = isOpenTrack;
    this._worldW = worldW;
    this._worldBounds = { minX: 0, minY: 0, maxX: worldW, maxY: worldH };
    this._bsX = CANVAS_W / worldW;
    this._bsY = CANVAS_H_REF / worldH;
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
    // Diagnostic state (only active when window.__CAMERA_DIAG__ === true)
    this._diagFrameCount = 0;
    this._diagPrevLogState = null;
    this._diagSnapshot = null;
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
    this._innerFramePct = config?.targetInnerFramePct ?? DEFAULT_INNER_FRAME_PCT;
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
    this._battleMaxDurationMs = config?.battleMaxDurationMs ?? BATTLE_MAX_DURATION;
    this._minStateHoldMs = config?.minStateHoldMs ?? MIN_STATE_HOLD_MS;
    this._showDiagnostics = config?.showCameraDiagnostics ?? false;
    this._cameraTransitionSeconds = config?.cameraTransitionSeconds ?? CAMERA_TRANSITION_SECONDS;
    this._lerpFactor = 1 - Math.pow(0.1, 1 / (this._cameraTransitionSeconds * FRAME_RATE));
    this._overviewCooldownMin = config?.overviewCooldownMin ?? OVERVIEW_COOLDOWN_MIN;
    this._overviewCooldownMax = config?.overviewCooldownMax ?? OVERVIEW_COOLDOWN_MAX;
    // Deterministic initial value (mean) so tests see consistent behavior before first re-roll
    this._overviewCooldownDuration = (this._overviewCooldownMin + this._overviewCooldownMax) / 2;
  }

  _randOverviewCooldown() {
    return (
      this._overviewCooldownMin +
      Math.random() * (this._overviewCooldownMax - this._overviewCooldownMin)
    );
  }

  // Main update — call once per frame during RACING.
  // raceState: { raceElapsed, finishedCount, winner, finishT }
  // Returns { zoom, offsetX, offsetY } to apply as ctx transform.
  update(racers, ts, raceState, canvasW, canvasH) {
    const stateAge = ts - this.stateEnteredAt;
    const stateCap =
      this.state === CAM_STATE.BATTLE_ZOOM ? this._battleMaxDurationMs : this._maxStateDuration;
    // Finish-drama is exempt from minStateHoldMs: when the 1500ms pulse expires, transition
    // immediately regardless of how long the state has been held.
    const finishDramaExpired = this._inFinishDrama && ts >= this._finishMomentExpiry;
    if (stateAge >= Math.max(this._minStateHoldMs, stateCap) || finishDramaExpired) {
      // Pre-set the battle exit timestamp so the cooldown blocks immediate BATTLE re-entry
      // when battleMaxDurationMs expires while hasBattle is still true.
      if (this.state === CAM_STATE.BATTLE_ZOOM) {
        this._lastBattleExitTs = ts;
      }
      this._transition(racers, ts, raceState);
    }
    this._setTargets(racers, canvasW, canvasH, raceState);
    this.zoom += (this.targetZoom - this.zoom) * this._lerpFactor;
    this.offsetX += (this.targetOffsetX - this.offsetX) * this._lerpFactor;
    this.offsetY += (this.targetOffsetY - this.offsetY) * this._lerpFactor;

    // Diagnostic logging — only active when window.__CAMERA_DIAG__ === true
    if (typeof window !== 'undefined' && !!window.__CAMERA_DIAG__ && this._diagSnapshot) {
      this._diagFrameCount++;
      const stateChanged = this.state !== this._diagPrevLogState;
      if (stateChanged || this._diagFrameCount % 60 === 0) {
        this._emitDiagLog(ts, raceState);
      }
      this._diagPrevLogState = this.state;
    }

    return { zoom: this.zoom, offsetX: this.offsetX, offsetY: this.offsetY };
  }

  _emitDiagLog(ts, raceState) {
    const entry = { timestamp: raceState?.raceElapsed ?? 0, ...this._diagSnapshot };
    if (!window.__CAMERA_DIAG_LOG__) window.__CAMERA_DIAG_LOG__ = [];
    window.__CAMERA_DIAG_LOG__.push(entry);
    try {
      localStorage.setItem('__cameraDiagLog__', JSON.stringify(window.__CAMERA_DIAG_LOG__));
    } catch {
      /* ignore localStorage quota errors */
    }
  }

  _transition(racers, ts, raceState) {
    const prevState = this.state;
    const prevEnteredAt = this.stateEnteredAt;

    // Record cooldown timestamp when leaving OVERVIEW and re-roll the jitter window
    if (prevState === CAM_STATE.OVERVIEW) {
      this._lastOverviewExitTs = ts;
      this._overviewCooldownDuration = this._randOverviewCooldown();
    }

    const ordered = [...racers].sort((a, b) => b.t - a.t);
    const leader = ordered[0];
    const leaderProgress = leader && raceState.finishT > 0 ? leader.t / raceState.finishT : 0;
    const gap01 = ordered.length >= 2 ? Math.abs(ordered[0].t - ordered[1].t) : 0;
    const gapLeadLast = ordered.length >= 2 ? ordered[0].t - ordered[ordered.length - 1].t : 0;
    // Hysteresis: BATTLE enters at threshold, exits only when gap >= threshold + BATTLE_EXIT_BUFFER.
    // Prevents state flickering when gap01 hovers just above the entry threshold.
    const hasBattle =
      prevState === CAM_STATE.BATTLE_ZOOM
        ? gap01 < this._battleGapThreshold + BATTLE_EXIT_BUFFER
        : gap01 < this._battleGapThreshold;
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
    else if (!hasBattle && ts - this._lastOverviewExitTs >= this._overviewCooldownDuration) {
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

    // Re-roll overview cooldown when it expired but was blocked by a higher-priority state
    // (endgame, battle, post-start-hold). Without this, the cooldown stays "expired" forever
    // and the periodic OVERVIEW can never fire again in that race — no re-roll occurs until
    // the next OVERVIEW exit, which may never come. Restarting the timer from ts means the
    // next opportunity fires one fresh cooldown window later.
    const cooldownExpired = ts - this._lastOverviewExitTs >= this._overviewCooldownDuration;
    if (cooldownExpired && nextState !== CAM_STATE.OVERVIEW) {
      this._lastOverviewExitTs = ts;
      this._overviewCooldownDuration = this._randOverviewCooldown();
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

  // Compute the Y offset for closed tracks using bsY (may differ from bsX on non-square worlds).
  // effZoomX = resolved.effectiveZoom = cam.zoom * bsX; effZoomY = cam.zoom * bsY.
  _closedOffsetY(targetY, effZoomX, canvasH) {
    const camZoom = effZoomX / this._bsX;
    const effZoomY = camZoom * this._bsY;
    const camYMax = Math.max(this._worldBounds.minY, this._worldBounds.maxY - canvasH / effZoomY);
    const idealCamY = targetY - canvasH / (2 * effZoomY);
    const camY = Math.max(this._worldBounds.minY, Math.min(camYMax, idealCamY));
    return -camY * effZoomY;
  }

  _setTargets(racers, canvasW, canvasH, raceState) {
    const focusRacers = this._focusRacers(racers);
    const frameSize = { width: canvasW, height: canvasH };
    // minEffZoom = overview effZoom for closed tracks: cam.zoom=1 → effZoom = 1 * bsX = bsX
    const minEffZoom = this._bsX;
    const _diag = typeof window !== 'undefined' && !!window.__CAMERA_DIAG__;
    let _diagTarget = null;
    let _diagResolved = null;
    let _diagRacerId = null;

    switch (this.state) {
      case CAM_STATE.OVERVIEW: {
        // During start phase, pan to the full-field centroid so no racer is cropped.
        // After start phase, follow only the top-N.
        const panSrc =
          raceState && raceState.raceElapsed < START_PHASE_DURATION
            ? racers.length
              ? racers
              : focusRacers
            : focusRacers;
        this.targetZoom = this._isOpenTrack ? this.overviewZoom : 1;
        if (!this._isOpenTrack) {
          const target = getPanTarget(CAM_STATE.OVERVIEW, panSrc);
          const resolved = resolveCamera({
            targetWorld: target,
            desiredEffZoom: minEffZoom, // effZoom at OVERVIEW = 1 * bsX
            worldBounds: this._worldBounds,
            frameSize,
            innerFramePct: this._innerFramePct,
            minEffZoom,
          });
          this.targetOffsetX = -resolved.camX * resolved.effectiveZoom;
          this.targetOffsetY = this._closedOffsetY(target.y, resolved.effectiveZoom, canvasH);
          this.targetZoom = resolved.effectiveZoom / this._bsX;
          if (_diag) {
            _diagTarget = target;
            _diagResolved = resolved;
            _diagRacerId = null;
          }
        }
        break;
      }

      case CAM_STATE.LEADER_ZOOM: {
        this.targetZoom = this._leaderZoom;
        if (!this._isOpenTrack) {
          const target = getPanTarget(CAM_STATE.LEADER_ZOOM, focusRacers);
          const resolved = resolveCamera({
            targetWorld: target,
            desiredEffZoom: this._leaderZoom * this._bsX,
            worldBounds: this._worldBounds,
            frameSize,
            innerFramePct: this._innerFramePct,
            minEffZoom,
          });
          this.targetOffsetX = -resolved.camX * resolved.effectiveZoom;
          this.targetOffsetY = this._closedOffsetY(target.y, resolved.effectiveZoom, canvasH);
          this.targetZoom = resolved.effectiveZoom / this._bsX;
          if (_diag) {
            _diagTarget = target;
            _diagResolved = resolved;
            _diagRacerId = focusRacers[0]?.id ?? null;
          }
        }
        break;
      }

      case CAM_STATE.BATTLE_ZOOM: {
        this.targetZoom = this._battleZoom;
        if (!this._isOpenTrack) {
          const target = getPanTarget(CAM_STATE.BATTLE_ZOOM, focusRacers);
          const resolved = resolveCamera({
            targetWorld: target,
            desiredEffZoom: this._battleZoom * this._bsX,
            worldBounds: this._worldBounds,
            frameSize,
            innerFramePct: this._innerFramePct,
            minEffZoom,
          });
          this.targetOffsetX = -resolved.camX * resolved.effectiveZoom;
          this.targetOffsetY = this._closedOffsetY(target.y, resolved.effectiveZoom, canvasH);
          this.targetZoom = resolved.effectiveZoom / this._bsX;
          if (_diag) {
            _diagTarget = target;
            _diagResolved = resolved;
            _diagRacerId = focusRacers[0]?.id ?? null;
          }
        }
        break;
      }

      case CAM_STATE.COMEBACK_ZOOM: {
        this.targetZoom = this._comebackZoom;
        if (!this._isOpenTrack) {
          const target = getPanTarget(CAM_STATE.COMEBACK_ZOOM, focusRacers);
          const resolved = resolveCamera({
            targetWorld: target,
            desiredEffZoom: this._comebackZoom * this._bsX,
            worldBounds: this._worldBounds,
            frameSize,
            innerFramePct: this._innerFramePct,
            minEffZoom,
          });
          this.targetOffsetX = -resolved.camX * resolved.effectiveZoom;
          this.targetOffsetY = this._closedOffsetY(target.y, resolved.effectiveZoom, canvasH);
          this.targetZoom = resolved.effectiveZoom / this._bsX;
          if (_diag) {
            _diagTarget = target;
            _diagResolved = resolved;
            _diagRacerId = focusRacers[Math.min(2, focusRacers.length - 1)]?.id ?? null;
          }
        }
        break;
      }
    }

    if (_diag) {
      this._diagSnapshot = this._buildDiagSnapshot(
        _diagTarget,
        _diagResolved,
        _diagRacerId,
        canvasW,
        canvasH
      );
    }
  }

  _buildDiagSnapshot(diagTarget, diagResolved, diagRacerId, canvasW, canvasH) {
    const stateTypeMap = {
      OVERVIEW: 'overview',
      LEADER_ZOOM: 'leader',
      BATTLE_ZOOM: 'battle',
      COMEBACK_ZOOM: 'comeback',
    };
    const type = stateTypeMap[this.state] ?? this.state;

    let computedPan = null;
    let finalPan = { x: this.targetOffsetX, y: this.targetOffsetY };
    let wasClamped = null;
    let clampedAxis = null;
    let targetVisibleAfterClamp = null;
    let targetInInnerFrame = null;
    let wasZoomAdapted = null;
    let backgroundBounds = null;

    if (diagTarget && diagResolved) {
      const eff = diagResolved.effectiveZoom;
      const hw = canvasW / 2;
      const hh = canvasH / 2;
      const camZoom = eff / this._bsX;
      const effZoomY = camZoom * this._bsY;

      // Ideal canvas-space offset without bounds clamping
      computedPan = {
        x: hw - diagTarget.x * eff,
        y: hh - diagTarget.y * effZoomY,
      };

      // Actual canvas-space offset after clamping (X from resolveCamera, Y from _closedOffsetY)
      finalPan = {
        x: -diagResolved.camX * eff,
        y: this.targetOffsetY,
      };

      const clampedX = Math.abs(finalPan.x - computedPan.x) > 0.01;
      const clampedY = Math.abs(finalPan.y - computedPan.y) > 0.01;
      wasClamped = clampedX || clampedY;
      clampedAxis = clampedX && clampedY ? 'both' : clampedX ? 'x' : clampedY ? 'y' : 'none';

      const screenX = diagTarget.x * eff + finalPan.x;
      const screenY = diagTarget.y * effZoomY + finalPan.y;
      targetVisibleAfterClamp =
        screenX >= 0 && screenX <= canvasW && screenY >= 0 && screenY <= canvasH;

      targetInInnerFrame = diagResolved.targetInInnerFrame;
      wasZoomAdapted = diagResolved.wasZoomAdapted;

      // Canvas-space bounds of the world extent at this effectiveZoom
      const bbXa = -this._worldBounds.minX * eff;
      const bbXb = canvasW - this._worldBounds.maxX * eff;
      const bbYa = -this._worldBounds.minY * effZoomY;
      const bbYb = canvasH - this._worldBounds.maxY * effZoomY;
      backgroundBounds = {
        minX: Math.min(bbXa, bbXb),
        maxX: Math.max(bbXa, bbXb),
        minY: Math.min(bbYa, bbYb),
        maxY: Math.max(bbYa, bbYb),
      };
    }

    return {
      trackType: this._isOpenTrack ? 'open' : 'closed',
      backgroundSize: { w: this._worldW, h: this._worldBounds.maxY },
      frameSize: { w: canvasW, h: canvasH },
      currentState: this.state,
      panTarget: {
        type,
        racerId: diagRacerId,
        position: diagTarget ? { x: diagTarget.x, y: diagTarget.y } : null,
      },
      computedPan,
      backgroundBounds,
      finalPan,
      wasClamped,
      clampedAxis,
      targetVisibleAfterClamp,
      zoom: this.targetZoom,
      targetInInnerFrame,
      wasZoomAdapted,
    };
  }

  /**
   * Display state for the camera HUD.
   * Returns 'FINISH' during the finish drama window, otherwise this.state.
   */
  get hudState() {
    return this._inFinishDrama ? 'FINISH' : this.state;
  }
}
