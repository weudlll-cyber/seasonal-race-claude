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
const FRAME_RATE = 60; // reference display frame rate for lerp formula (dt-scaling applied in update)
// Per-state transition TC fallbacks (used when no config is provided at all)
const TC_OVERVIEW = 1.5;
const TC_LEADER = 0.3;
const TC_BATTLE = 0.3;
const TC_COMEBACK = 0.3;
const OVERVIEW_COOLDOWN_MIN = 15000; // min ms after leaving OVERVIEW before it can recur
const OVERVIEW_COOLDOWN_MAX = 25000; // max ms — jittered each exit for variety
const MAX_INVERSE_ZOOM = 5.0; // ceiling for inverse (targetSize-based) zoom
const CANVAS_W = 1280; // reference canvas width
const CANVAS_H_REF = 720; // reference canvas height for pct → px conversion
const TOP_N = 3; // camera focuses on the top-N racers by position
const FALLBACK_REFERENCE_SPRITE_SIZE = 36; // used when referenceSpriteSize is not provided
const DEFAULT_SPRITE_PCT = { overview: 0.05, leader: 0.08, battle: 0.12, comeback: 0.065 };
const DEFAULT_INNER_FRAME_PCT = 0.7;

/**
 * Convert a lerp time-constant (seconds) to a per-frame lerp factor at FRAME_RATE fps.
 * 90% convergence ≈ 3.45 × TC. Formula: 1 − 0.1^(1 / (tc × FRAME_RATE)).
 * Exported for unit tests.
 * @param {number} tc  Time constant in seconds (must be > 0)
 * @returns {number}   Per-frame lerp factor in (0, 1)
 */
export function tcToLerpFactor(tc) {
  return 1 - Math.pow(0.1, 1 / (tc * FRAME_RATE));
}

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
   * @param {object|null} [shape=null]
   *   EditorShape instance for the current track. When provided, BATTLE_ZOOM pan
   *   targets are resolved at the arc-length midpoint on the racing line rather than
   *   the euclidean midpoint — prevents the camera from drifting into the infield on
   *   curved (oval) tracks. Null is safe: falls back to euclidean midpoint.
   */
  constructor(
    worldW = 1280,
    worldH = 720,
    isOpenTrack = false,
    config = null,
    referenceSpriteSize = 0,
    shape = null
  ) {
    this._isOpenTrack = isOpenTrack;
    this._shape = shape;
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
    this._transitionStartZoom = this.overviewZoom;
    this._transitionStartOffsetX = 0;
    this._transitionStartOffsetY = 0;
    this._lastResolvedPanTarget = null;
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
    if (!this._referenceSpriteSize || this._referenceSpriteSize <= 0) {
      console.warn(
        `[CameraDirector] referenceSpriteSize not set — using internal default ${FALLBACK_REFERENCE_SPRITE_SIZE}px. ` +
          'Pass displaySize × displaySizeScale to the constructor.'
      );
    }

    // Prefer per-state profiles; fall back to legacy spritePctOfCanvas for old configs / tests.
    const profiles = config?.cameraStateProfiles;
    let pct;
    if (profiles) {
      pct = {
        leader: profiles.LEADER_ZOOM?.spritePct ?? DEFAULT_SPRITE_PCT.leader,
        battle: profiles.BATTLE_ZOOM?.spritePct ?? DEFAULT_SPRITE_PCT.battle,
        comeback: profiles.COMEBACK_ZOOM?.spritePct ?? DEFAULT_SPRITE_PCT.comeback,
      };
    } else {
      const rawPct = config?.spritePctOfCanvas ?? DEFAULT_SPRITE_PCT;
      pct = { leader: rawPct.leader, battle: rawPct.battle, comeback: rawPct.comeback };
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
    // Global tunables (not per-state)
    this._battleGapThreshold = config?.battleGapThreshold ?? BATTLE_GAP_THRESHOLD;
    this._endgameThreshold = config?.endgameThreshold ?? ENDGAME_PROGRESS_THRESHOLD;
    this._postStartHoldMs = config?.postStartHoldMs ?? POST_START_HOLD_MS;
    this._battleCooldownMs = config?.battleCooldownMs ?? BATTLE_COOLDOWN_MS;
    this._showDiagnostics = config?.showCameraDiagnostics ?? false;
    this._overviewCooldownMin = config?.overviewCooldownMin ?? OVERVIEW_COOLDOWN_MIN;
    this._overviewCooldownMax = config?.overviewCooldownMax ?? OVERVIEW_COOLDOWN_MAX;
    // Deterministic initial value (mean) so tests see consistent behavior before first re-roll
    this._overviewCooldownDuration = (this._overviewCooldownMin + this._overviewCooldownMax) / 2;

    // Per-state values: prefer cameraStateProfiles, fall back to legacy flat fields.
    const profiles = config?.cameraStateProfiles;

    if (profiles) {
      const profTc = (key, fallback) => profiles[key]?.trackingTC ?? fallback;
      const profMin = (key) => profiles[key]?.minStateHold ?? MIN_STATE_HOLD_MS;
      const profMax = (key, fallback) => profiles[key]?.maxStateDuration ?? fallback;

      this._tcOverview = profTc('OVERVIEW', TC_OVERVIEW);
      this._tcLeader = profTc('LEADER_ZOOM', TC_LEADER);
      this._tcBattle = profTc('BATTLE_ZOOM', TC_BATTLE);
      this._tcComeback = profTc('COMEBACK_ZOOM', TC_COMEBACK);

      // Flat props kept for test and external compat
      this._minStateHoldMs = profMin('OVERVIEW');
      this._battleMaxDurationMs = profMax('BATTLE_ZOOM', BATTLE_MAX_DURATION);
      this._maxStateDuration = profMax('OVERVIEW', MAX_STATE_DURATION);

      this._minStateHoldByState = {
        [CAM_STATE.OVERVIEW]: profMin('OVERVIEW'),
        [CAM_STATE.LEADER_ZOOM]: profMin('LEADER_ZOOM'),
        [CAM_STATE.BATTLE_ZOOM]: profMin('BATTLE_ZOOM'),
        [CAM_STATE.COMEBACK_ZOOM]: profMin('COMEBACK_ZOOM'),
      };
      this._maxStateDurationByState = {
        [CAM_STATE.OVERVIEW]: profMax('OVERVIEW', MAX_STATE_DURATION),
        [CAM_STATE.LEADER_ZOOM]: profMax('LEADER_ZOOM', MAX_STATE_DURATION),
        [CAM_STATE.BATTLE_ZOOM]: profMax('BATTLE_ZOOM', BATTLE_MAX_DURATION),
        [CAM_STATE.COMEBACK_ZOOM]: profMax('COMEBACK_ZOOM', MAX_STATE_DURATION),
      };
    } else {
      // Legacy flat-field path: no profiles — old config format or no config at all.
      this._maxStateDuration = config?.maxStateDuration ?? MAX_STATE_DURATION;
      this._battleMaxDurationMs = config?.battleMaxDurationMs ?? BATTLE_MAX_DURATION;
      this._minStateHoldMs = config?.minStateHoldMs ?? MIN_STATE_HOLD_MS;

      const rawTc = config?.cameraTransitionSeconds;
      if (rawTc && typeof rawTc === 'object') {
        this._tcOverview = rawTc.overview ?? TC_OVERVIEW;
        this._tcLeader = rawTc.leader ?? TC_LEADER;
        this._tcBattle = rawTc.battle ?? TC_BATTLE;
        this._tcComeback = rawTc.comeback ?? TC_COMEBACK;
      } else {
        // Scalar (old format or fallback): apply to OVERVIEW only; zoom states use new defaults.
        const s = typeof rawTc === 'number' ? rawTc : TC_OVERVIEW;
        this._tcOverview = s;
        this._tcLeader = TC_LEADER;
        this._tcBattle = TC_BATTLE;
        this._tcComeback = TC_COMEBACK;
      }

      this._minStateHoldByState = {
        [CAM_STATE.OVERVIEW]: this._minStateHoldMs,
        [CAM_STATE.LEADER_ZOOM]: this._minStateHoldMs,
        [CAM_STATE.BATTLE_ZOOM]: this._minStateHoldMs,
        [CAM_STATE.COMEBACK_ZOOM]: this._minStateHoldMs,
      };
      this._maxStateDurationByState = {
        [CAM_STATE.OVERVIEW]: this._maxStateDuration,
        [CAM_STATE.LEADER_ZOOM]: this._maxStateDuration,
        [CAM_STATE.BATTLE_ZOOM]: this._battleMaxDurationMs,
        [CAM_STATE.COMEBACK_ZOOM]: this._maxStateDuration,
      };
    }

    // Common: compute lf values and tc lookup map from the resolved TCs.
    this._tcByState = {
      [CAM_STATE.OVERVIEW]: this._tcOverview,
      [CAM_STATE.LEADER_ZOOM]: this._tcLeader,
      [CAM_STATE.BATTLE_ZOOM]: this._tcBattle,
      [CAM_STATE.COMEBACK_ZOOM]: this._tcComeback,
    };
    this._lfOverview = tcToLerpFactor(this._tcOverview);
    this._lfLeader = tcToLerpFactor(this._tcLeader);
    this._lfBattle = tcToLerpFactor(this._tcBattle);
    this._lfComeback = tcToLerpFactor(this._tcComeback);
  }

  _randOverviewCooldown() {
    return (
      this._overviewCooldownMin +
      Math.random() * (this._overviewCooldownMax - this._overviewCooldownMin)
    );
  }

  _lerpFactorForState(state) {
    switch (state) {
      case CAM_STATE.LEADER_ZOOM:
        return this._lfLeader;
      case CAM_STATE.BATTLE_ZOOM:
        return this._lfBattle;
      case CAM_STATE.COMEBACK_ZOOM:
        return this._lfComeback;
      default:
        return this._lfOverview;
    }
  }

  // Main update — call once per frame during RACING.
  // raceState: { raceElapsed, finishedCount, winner, finishT }
  // dt: frame duration in ms (optional — defaults to 1000/60 for backward compat with tests).
  // Returns { zoom, offsetX, offsetY } to apply as ctx transform.
  update(racers, ts, raceState, canvasW, canvasH, dt = 1000 / FRAME_RATE) {
    const stateAge = ts - this.stateEnteredAt;
    const stateCap = this._maxStateDurationByState[this.state] ?? this._maxStateDuration;
    const minHold = this._minStateHoldByState[this.state] ?? this._minStateHoldMs;
    // Finish-drama is exempt from minStateHoldMs: when the 1500ms pulse expires, transition
    // immediately regardless of how long the state has been held.
    const finishDramaExpired = this._inFinishDrama && ts >= this._finishMomentExpiry;
    const prevState = this.state;
    if (stateAge >= Math.max(minHold, stateCap) || finishDramaExpired) {
      // Pre-set the battle exit timestamp so the cooldown blocks immediate BATTLE re-entry
      // when battleMaxDurationMs expires while hasBattle is still true.
      if (this.state === CAM_STATE.BATTLE_ZOOM) {
        this._lastBattleExitTs = ts;
      }
      this._transition(racers, ts, raceState);
    }
    if (this.state !== prevState) {
      this._transitionStartZoom = this.zoom;
      this._transitionStartOffsetX = this.offsetX;
      this._transitionStartOffsetY = this.offsetY;
    }
    this._setTargets(racers, canvasW, canvasH, raceState);

    // dt-scaled lerp: at dt=1000/FRAME_RATE the factor equals the pre-computed lf60 value,
    // so existing tests (which omit dt) see identical behavior.
    const lf60 = this._lerpFactorForState(this.state);
    const lf = 1 - Math.pow(1 - lf60, (dt * FRAME_RATE) / 1000);
    this.zoom += (this.targetZoom - this.zoom) * lf;
    this.offsetX += (this.targetOffsetX - this.offsetX) * lf;
    this.offsetY += (this.targetOffsetY - this.offsetY) * lf;
    return { zoom: this.zoom, offsetX: this.offsetX, offsetY: this.offsetY };
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

  /**
   * Coordinated pan+zoom target computation for closed-track zoom states.
   *
   * Two resolveCamera calls are made each frame:
   *   1. stateEffZoom  → final zoom target (may be reduced by world-edge clamping)
   *   2. this.zoom*bsX → pan target for the *current* (lerping) zoom level
   *
   * Because call 2 uses the live zoom value, the pan target smoothly chases the
   * racer as zoom lerps 1→stateZoom, keeping the target within the inner frame
   * throughout the transition rather than snapping on entry.
   */
  _setClosedTrackTargets(target, stateEffZoom, frameSize, canvasH) {
    const minEffZoom = this._bsX;
    const zoomResolved = resolveCamera({
      targetWorld: target,
      desiredEffZoom: stateEffZoom,
      worldBounds: this._worldBounds,
      frameSize,
      innerFramePct: this._innerFramePct,
      minEffZoom,
    });
    this.targetZoom = zoomResolved.effectiveZoom / this._bsX;

    const currEffZoom = Math.max(this.zoom * this._bsX, minEffZoom);
    const panResolved = resolveCamera({
      targetWorld: target,
      desiredEffZoom: currEffZoom,
      worldBounds: this._worldBounds,
      frameSize,
      innerFramePct: this._innerFramePct,
      minEffZoom,
    });
    this.targetOffsetX = -panResolved.camX * panResolved.effectiveZoom;
    this.targetOffsetY = this._closedOffsetY(target.y, panResolved.effectiveZoom, canvasH);
    this._lastResolvedPanTarget = panResolved;
  }

  _setTargets(racers, canvasW, canvasH, raceState) {
    const focusRacers = this._focusRacers(racers);
    const frameSize = { width: canvasW, height: canvasH };
    const minEffZoom = this._bsX;

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
          const target = getPanTarget(CAM_STATE.OVERVIEW, panSrc, this._shape);
          const resolved = resolveCamera({
            targetWorld: target,
            desiredEffZoom: minEffZoom,
            worldBounds: this._worldBounds,
            frameSize,
            innerFramePct: this._innerFramePct,
            minEffZoom,
          });
          this.targetOffsetX = -resolved.camX * resolved.effectiveZoom;
          this.targetOffsetY = this._closedOffsetY(target.y, resolved.effectiveZoom, canvasH);
          this.targetZoom = resolved.effectiveZoom / this._bsX;
          this._lastResolvedPanTarget = resolved;
        }
        break;
      }

      case CAM_STATE.LEADER_ZOOM: {
        this.targetZoom = this._leaderZoom;
        if (!this._isOpenTrack) {
          const target = getPanTarget(CAM_STATE.LEADER_ZOOM, focusRacers, this._shape);
          this._setClosedTrackTargets(target, this._leaderZoom * this._bsX, frameSize, canvasH);
        }
        break;
      }

      case CAM_STATE.BATTLE_ZOOM: {
        this.targetZoom = this._battleZoom;
        if (!this._isOpenTrack) {
          const target = getPanTarget(CAM_STATE.BATTLE_ZOOM, focusRacers, this._shape);
          this._setClosedTrackTargets(target, this._battleZoom * this._bsX, frameSize, canvasH);
        }
        break;
      }

      case CAM_STATE.COMEBACK_ZOOM: {
        this.targetZoom = this._comebackZoom;
        if (!this._isOpenTrack) {
          const target = getPanTarget(CAM_STATE.COMEBACK_ZOOM, focusRacers, this._shape);
          this._setClosedTrackTargets(target, this._comebackZoom * this._bsX, frameSize, canvasH);
        }
        break;
      }
    }
  }

  /**
   * Display state for the camera HUD.
   * Returns 'FINISH' during the finish drama window, otherwise this.state.
   */
  get hudState() {
    return this._inFinishDrama ? 'FINISH' : this.state;
  }

  /** TC (seconds) for the current state — readable by the diagnostics HUD. */
  get currentTc() {
    return this._tcByState?.[this.state] ?? this._tcOverview;
  }

  /** True when zoom has not yet converged to its target (within 0.1%). */
  get transitioning() {
    return Math.abs(this.zoom - this.targetZoom) > this.targetZoom * 0.001;
  }

  /**
   * 0–1 fraction of pan travel completed since the last state transition.
   * Returns 1 when at rest or when start equals target (no movement needed).
   */
  get panProgress() {
    const dx = this.targetOffsetX - this._transitionStartOffsetX;
    const dy = this.targetOffsetY - this._transitionStartOffsetY;
    const total = Math.sqrt(dx * dx + dy * dy);
    if (total < 0.5) return 1;
    const cx = this.offsetX - this._transitionStartOffsetX;
    const cy = this.offsetY - this._transitionStartOffsetY;
    return Math.min(1, Math.sqrt(cx * cx + cy * cy) / total);
  }

  /**
   * 0–1 fraction of zoom travel completed since the last state transition.
   * Returns 1 when at rest or when start equals target.
   */
  get zoomProgress() {
    const total = Math.abs(this.targetZoom - this._transitionStartZoom);
    if (total < 0.0001) return 1;
    return Math.min(1, Math.abs(this.zoom - this._transitionStartZoom) / total);
  }

  /** Whether the last pan-resolved target landed inside the inner frame. */
  get targetInFrame() {
    return this._lastResolvedPanTarget?.targetInInnerFrame ?? true;
  }
}
