// ============================================================
// File:        CameraDirector.js
// Path:        client/src/modules/camera/CameraDirector.js
// Project:     RaceArena
// Created:     2026-04-22
// Description: TV-style camera state machine for both open and closed track races.
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
const BATTLE_PULK_THRESHOLD_PX = 200; // fallback: world-pixel radius for pulk detection
const BATTLE_MIN_DURATION_MS = 3000; // fallback: minimum ms BATTLE stays after entry
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
// Pixel defaults used when no config (or no cameraStateProfiles) is provided.
// Values match Math.round(legacyPct × 720): 0.08→58, 0.12→86, 0.065→47.
const DEFAULT_SPRITE_PX = { leader: 58, battle: 86, comeback: 47 };
// Legacy percent fallback used only when config has spritePctOfCanvas but no profiles.
const DEFAULT_SPRITE_PCT = { leader: 0.08, battle: 0.12, comeback: 0.065 };
const DEFAULT_INNER_FRAME_PCT = 0.7;
const LEAD_OUT_DECAY = 0.05; // per-60fps-frame EMA factor for lead-out camera deceleration
const NOMINAL_T_PER_FRAME = 0.001; // fallback racer speed (t/frame) for lead-in distance when _prevFocusT is unknown
const TRANSITION_T_CONVERGENCE = 0.005; // T-units threshold for T-space lerp convergence (~20px on 4000px oval)
const DIAG_RING_SIZE = 600; // frame-log ring buffer size (≈10 s @ 60 fps)

// Shortest signed T-delta on a circular track [0,1).
// Returns a value in (-0.5, 0.5] so the lerp always takes the shorter arc.
function _shortestTDelta(from, to) {
  let delta = (to - from) % 1;
  if (delta > 0.5) delta -= 1;
  if (delta < -0.5) delta += 1;
  return delta;
}

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
   *   path via cameraStateProfiles.spritePx (v7+) or legacy spritePctOfCanvas.
   *   Call updateConfig() for live-apply without re-construction.
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
    this._lerpPhase = 'entry';
    this._camT = null;
    this._observerPhase = 'idle';
    this._leadInStartTs = null;
    this._leadOutStartCamT = null;
    this._leadOutStartTs = null;
    this._leadOutDistanceT = 0;
    this._prevFocusT = null;
    this._lastFocusT = 0;
    // Track-aware T-space lerp: during entry phase, _camT lerps toward _transitionTargetT
    // along the track (avoiding the euklidisch infield shortcut — see camera-pan-path-diagnosis.md).
    // _transitionTargetT includes the lead-ahead offset for zoom states.
    this._transitionTargetT = null;
    this._entrySpeedEstimate = NOMINAL_T_PER_FRAME;
    this._followRingBuf = new Uint8Array(60);
    this._followRingIdx = 0;
    // Diagnostic: how often _transition() fires per 60-frame window
    this._transitionRingBuf = new Uint8Array(60);
    this._transitionRingIdx = 0;
    // Diagnostic: entry-phase convergence tracking
    this._entryStartTs = null;
    this._lastTs = 0;
    this._lastEntryDeltaZoom = 0;
    this._lastEntryDeltaX = 0;
    this._lastEntryDeltaY = 0;
    // Diagnostic: BATTLE-DIAG frozen snapshot panel
    this._battleDiagFrameCount = 0;
    this._battleDiagSnapshots = [];
    this._battleDiagFrozen = false;
    // Frame-log ring buffer — enabled per config.enableFrameLog (set by _computeTimingConfig above).
    // Records ~28 fields per frame; 600 frames ≈ 10 s @ 60 fps.
    this._diagRingBuf = new Array(DIAG_RING_SIZE);
    this._diagRingIdx = 0;
    this._diagFrameIdx = 0;
    this._diagPrevOffsetX = null;
    this._diagPrevOffsetY = null;
    this._diagPrevZoom = null;
    // prevFocusT as it was at the START of the current frame (before overwrite).
    this._diagPrevFocusT = null;
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
   * v7+: each zoom level is computed from spritePx (world pixels) stored in
   * cameraStateProfiles. When the legacy spritePctOfCanvas path is used (v2/v3 configs
   * without profiles), the percent value is multiplied by CANVAS_H_REF to get the
   * equivalent screen-pixel target — preserving cross-track invariance.
   *
   * Edge case: if effectiveOverviewPx already exceeds a state's target (e.g. large sprites
   * on a narrow open track), the safety net in _computeZoomForTargetSize clamps zoom to
   * overviewZoom — that state appears visually identical to OVERVIEW. Fix: raise spritePx
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

    const profiles = config?.cameraStateProfiles;
    if (profiles) {
      // v7 path: spritePx is the direct target in world/screen pixels (canvas-resolution-independent).
      const sizePx = {
        leader: profiles.LEADER_ZOOM?.spritePx ?? DEFAULT_SPRITE_PX.leader,
        battle: profiles.BATTLE_ZOOM?.spritePx ?? DEFAULT_SPRITE_PX.battle,
        comeback: profiles.COMEBACK_ZOOM?.spritePx ?? DEFAULT_SPRITE_PX.comeback,
      };
      this._leaderZoom = this._computeZoomForTargetSize(sizePx.leader);
      this._battleZoom = this._computeZoomForTargetSize(sizePx.battle);
      this._comebackZoom = this._computeZoomForTargetSize(sizePx.comeback);
    } else if (config?.spritePctOfCanvas) {
      // Legacy path: old configs with spritePctOfCanvas (v2/v3) but no cameraStateProfiles.
      const rawPct = config.spritePctOfCanvas;
      this._leaderZoom = this._computeZoomForTargetSize(rawPct.leader * CANVAS_H_REF);
      this._battleZoom = this._computeZoomForTargetSize(rawPct.battle * CANVAS_H_REF);
      this._comebackZoom = this._computeZoomForTargetSize(rawPct.comeback * CANVAS_H_REF);
    } else {
      // No config at all: use pixel defaults directly.
      this._leaderZoom = this._computeZoomForTargetSize(DEFAULT_SPRITE_PX.leader);
      this._battleZoom = this._computeZoomForTargetSize(DEFAULT_SPRITE_PX.battle);
      this._comebackZoom = this._computeZoomForTargetSize(DEFAULT_SPRITE_PX.comeback);
    }
    this._innerFramePct = config?.targetInnerFramePct ?? DEFAULT_INNER_FRAME_PCT;
  }

  /**
   * Derive transition timing parameters from config or hardcoded fallbacks.
   * Called on construction and via updateConfig() for live-apply.
   * @param {object|null} config
   */
  _computeTimingConfig(config) {
    // Global tunables (not per-state)
    this._battlePulkThresholdPx = config?.battlePulkThresholdPx ?? BATTLE_PULK_THRESHOLD_PX;
    this._battleMinDurationMs = config?.battleMinDurationMs ?? BATTLE_MIN_DURATION_MS;
    this._endgameThreshold = config?.endgameThreshold ?? ENDGAME_PROGRESS_THRESHOLD;
    this._postStartHoldMs = config?.postStartHoldMs ?? POST_START_HOLD_MS;
    this._battleCooldownMs = config?.battleCooldownMs ?? BATTLE_COOLDOWN_MS;
    this._showDiagnostics = config?.showCameraDiagnostics ?? false;
    this._diagEnabled = config?.enableFrameLog ?? false;
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
      const profEntryTc = (key, fallback) => profiles[key]?.entryTC ?? fallback;
      this._tcEntryOverview = profEntryTc('OVERVIEW', this._tcOverview);
      this._tcEntryLeader = profEntryTc('LEADER_ZOOM', this._tcLeader);
      this._tcEntryBattle = profEntryTc('BATTLE_ZOOM', this._tcBattle);
      this._tcEntryComeback = profEntryTc('COMEBACK_ZOOM', this._tcComeback);
      // Per-state phased observer config
      this._phasedByState = {};
      for (const s of Object.values(CAM_STATE)) {
        this._phasedByState[s] = {
          leadInDuration: profiles[s]?.leadInDuration ?? 0,
          leadOutDuration: profiles[s]?.leadOutDuration ?? 0,
        };
      }
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
      // Legacy: entryTC = trackingTC (no distinction in old format)
      this._tcEntryOverview = this._tcOverview;
      this._tcEntryLeader = this._tcLeader;
      this._tcEntryBattle = this._tcBattle;
      this._tcEntryComeback = this._tcComeback;
      // Legacy: phased observer disabled
      this._phasedByState = Object.fromEntries(
        Object.values(CAM_STATE).map((s) => [s, { leadInDuration: 0, leadOutDuration: 0 }])
      );
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
    this._lfByState = {
      [CAM_STATE.OVERVIEW]: this._lfOverview,
      [CAM_STATE.LEADER_ZOOM]: this._lfLeader,
      [CAM_STATE.BATTLE_ZOOM]: this._lfBattle,
      [CAM_STATE.COMEBACK_ZOOM]: this._lfComeback,
    };
    this._lfEntryOverview = tcToLerpFactor(this._tcEntryOverview);
    this._lfEntryLeader = tcToLerpFactor(this._tcEntryLeader);
    this._lfEntryBattle = tcToLerpFactor(this._tcEntryBattle);
    this._lfEntryComeback = tcToLerpFactor(this._tcEntryComeback);
    this._lfEntryByState = {
      [CAM_STATE.OVERVIEW]: this._lfEntryOverview,
      [CAM_STATE.LEADER_ZOOM]: this._lfEntryLeader,
      [CAM_STATE.BATTLE_ZOOM]: this._lfEntryBattle,
      [CAM_STATE.COMEBACK_ZOOM]: this._lfEntryComeback,
    };
    this._entryConvergenceZoom = config?.entryConvergenceZoom ?? 0.05;
    this._entryConvergencePx = config?.entryConvergencePx ?? 10;
  }

  _randOverviewCooldown() {
    return (
      this._overviewCooldownMin +
      Math.random() * (this._overviewCooldownMax - this._overviewCooldownMin)
    );
  }

  _lerpFactorForState(state) {
    const map = this._lerpPhase === 'entry' ? this._lfEntryByState : this._lfByState;
    return map[state] ?? this._lfOverview;
  }

  // Signed T-delta for track-parameter lerp.
  // Closed tracks: shortest circular arc via _shortestTDelta.
  // Open tracks: linear delta (no wrap-around — the track ends at t=1).
  _tDelta(from, to) {
    return this._isOpenTrack ? to - from : _shortestTDelta(from, to);
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
    let _diagTransitioned = false;
    // Early BATTLE exit: leave when pulk dissolves after battleMinDurationMs.
    // _lastBattleExitTs is set here so the cooldown blocks immediate re-entry.
    if (
      this.state === CAM_STATE.BATTLE_ZOOM &&
      stateAge >= this._battleMinDurationMs &&
      !this._isPulk(racers)
    ) {
      this._lastBattleExitTs = ts;
      this._transition(racers, ts, raceState);
      _diagTransitioned = true;
    }
    if (!_diagTransitioned && (stateAge >= Math.max(minHold, stateCap) || finishDramaExpired)) {
      // Pre-set the battle exit timestamp so the cooldown blocks immediate BATTLE re-entry
      // when battleMaxDurationMs expires while hasBattle is still true.
      if (this.state === CAM_STATE.BATTLE_ZOOM) {
        this._lastBattleExitTs = ts;
      }
      this._transition(racers, ts, raceState);
      _diagTransitioned = true;
    }
    this._transitionRingBuf[this._transitionRingIdx % 60] = _diagTransitioned ? 1 : 0;
    this._transitionRingIdx++;
    if (this.state !== prevState) {
      this._transitionStartZoom = this.zoom;
      this._transitionStartOffsetX = this.offsetX;
      this._transitionStartOffsetY = this.offsetY;
    }
    // dt-scaled lerp factor — hoisted before _setTargets so T-space lerp can use the same lf.
    const lf60 = this._lerpFactorForState(this.state);
    const lf = 1 - Math.pow(1 - lf60, (dt * FRAME_RATE) / 1000);

    // Track-aware T-space lerp: during entry phase _camT follows the track toward the
    // transition target (focusT + lead-ahead offset) instead of snapping to the racer.
    // The pan (offsetX/Y) is then derived directly from _camT each frame — no pixel-space
    // lerp during entry — so the camera travels along the track curve rather than taking
    // the euklidisch shortcut through the infield (see camera-pan-path-diagnosis.md).
    if (
      this._lerpPhase === 'entry' &&
      this._camT !== null &&
      this._shape &&
      this._transitionTargetT !== null
    ) {
      const fr = this._focusRacers(racers);
      let fT = null;
      switch (this.state) {
        case CAM_STATE.LEADER_ZOOM:
          fT = fr[0]?.t ?? null;
          break;
        case CAM_STATE.BATTLE_ZOOM: {
          const r0 = fr[0],
            r1 = fr.length > 1 ? fr[1] : fr[0];
          fT = ((r0?.t ?? 0) + (r1?.t ?? 0)) / 2;
          break;
        }
        case CAM_STATE.COMEBACK_ZOOM:
          fT = fr[Math.min(2, fr.length - 1)]?.t ?? null;
          break;
        case CAM_STATE.OVERVIEW:
          fT = fr[0]?.t ?? null; // leader's T — camera targets leader in OVERVIEW
          break;
      }
      if (fT !== null) {
        this._diagPrevFocusT = this._prevFocusT; // capture before overwrite (frame log)
        if (this._prevFocusT !== null) {
          this._entrySpeedEstimate = Math.max(0, fT - this._prevFocusT);
        }
        this._prevFocusT = fT;
        // Update target every frame: focusT moves with the racer, lead-ahead offset scales
        // with the measured speed so the camera lands at the right lead-ahead position.
        const prof = this._phasedByState?.[this.state];
        const phasedEnabled = prof && (prof.leadInDuration > 0 || prof.leadOutDuration > 0);
        const leadAhead =
          this.state !== CAM_STATE.OVERVIEW && phasedEnabled
            ? (this._entrySpeedEstimate ?? NOMINAL_T_PER_FRAME) * FRAME_RATE * prof.leadInDuration
            : 0;
        // Open tracks: clamp target to [0,1] (no circular wrap-around beyond track end).
        const rawTarget = fT + leadAhead;
        this._transitionTargetT = this._isOpenTrack
          ? Math.max(0, Math.min(1, rawTarget))
          : rawTarget;
        // Lerp _camT toward _transitionTargetT. Closed: shortest circular arc. Open: linear.
        this._camT += this._tDelta(this._camT, this._transitionTargetT) * lf;
      }
    }
    this._setTargets(racers, canvasW, canvasH, raceState);

    this.zoom += (this.targetZoom - this.zoom) * lf;
    // During entry with T-space lerp active: pan is pinned to _camT's world position (already
    // set in targetOffsetX/Y by _setTargets). No pixel lerp — the camera path follows the track.
    const tSpaceLerpActive =
      this._lerpPhase === 'entry' &&
      this._camT !== null &&
      this._shape &&
      this._transitionTargetT !== null;
    if (tSpaceLerpActive) {
      this.offsetX = this.targetOffsetX;
      this.offsetY = this.targetOffsetY;
    } else {
      this.offsetX += (this.targetOffsetX - this.offsetX) * lf;
      this.offsetY += (this.targetOffsetY - this.offsetY) * lf;
    }
    if (this._lerpPhase === 'entry') {
      if (this._entryStartTs === null) this._entryStartTs = ts;
      this._lastEntryDeltaZoom = Math.abs(this.targetZoom - this.zoom);
      this._lastEntryDeltaX = Math.abs(this.targetOffsetX - this.offsetX);
      this._lastEntryDeltaY = Math.abs(this.targetOffsetY - this.offsetY);
      // T-space lerp is active when _camT !== null: pan is pinned to _camT so the pixel
      // deltas are always near zero. Gate convergence on zoom + T-space convergence only.
      const tLerpActive = this._camT !== null && this._shape;
      const zoomConverged = this._lastEntryDeltaZoom < this._entryConvergenceZoom;
      const xConverged = tLerpActive || this._lastEntryDeltaX < this._entryConvergencePx;
      const yConverged = tLerpActive || this._lastEntryDeltaY < this._entryConvergencePx;
      const tConverged =
        this._transitionTargetT === null ||
        Math.abs(this._tDelta(this._camT, this._transitionTargetT)) < TRANSITION_T_CONVERGENCE;
      if (zoomConverged && xConverged && yConverged && tConverged) {
        this._lerpPhase = 'tracking';
        this._entryStartTs = null;
        this._transitionTargetT = null; // T-space lerp complete
        // Start phased observer from current _camT position (already at focusT+leadAhead).
        // For states without phased observer (OVERVIEW), release _camT so pixel-lerp takes over.
        const prof = this._phasedByState?.[this.state];
        const phasedEnabled = prof && (prof.leadInDuration > 0 || prof.leadOutDuration > 0);
        if (phasedEnabled && this._camT !== null && this._shape) {
          if (prof.leadInDuration > 0) {
            this._observerPhase = 'lead-in';
            this._leadInStartTs = ts;
          } else {
            this._observerPhase = 'follow';
            this._leadInStartTs = null;
          }
        } else {
          // No phased observer (e.g., OVERVIEW): release _camT, pixel-lerp takes over.
          this._camT = null;
          this._observerPhase = 'idle';
          this._leadInStartTs = null;
        }
      }
    } else {
      this._entryStartTs = null;
      this._lastEntryDeltaZoom = 0;
      this._lastEntryDeltaX = 0;
      this._lastEntryDeltaY = 0;
    }
    this._lastTs = ts;
    const focusRacersForPhased = this._focusRacers(racers);
    if (this._camT !== null && this._shape) {
      this._computePhasedPanTarget(focusRacersForPhased, canvasW, canvasH, dt, ts);
    }
    this._followRingBuf[this._followRingIdx % 60] = this._observerPhase === 'follow' ? 1 : 0;
    this._followRingIdx++;
    // BATTLE-DIAG: capture snapshots at frames 1, 15, 30, 45, 60 of each BATTLE_ZOOM episode
    if (this.state === CAM_STATE.BATTLE_ZOOM && !this._battleDiagFrozen) {
      this._battleDiagFrameCount++;
      const f = this._battleDiagFrameCount;
      if (f === 1 || f === 15 || f === 30 || f === 45 || f === 60) {
        const r0 = focusRacersForPhased[0];
        const r1 = focusRacersForPhased.length > 1 ? focusRacersForPhased[1] : r0;
        const fT = ((r0?.t ?? 0) + (r1?.t ?? 0)) / 2;
        const cT = this._camT ?? fT;
        this._battleDiagSnapshots.push({
          f,
          phase: this._lerpPhase,
          obs: this._observerPhase,
          camT: cT,
          focusT: fT,
          dT: cT - fT,
          dX: this._lastEntryDeltaX,
          dY: this._lastEntryDeltaY,
          dZ: this._lastEntryDeltaZoom,
          conv: this._lerpPhase === 'tracking',
        });
      }
      if (f >= 60) this._battleDiagFrozen = true;
    }
    if (this._diagEnabled) this._recordDiagFrame(ts, dt, lf, tSpaceLerpActive, _diagTransitioned);
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
    // Pulk condition: ≥3 of top-10 within battlePulkThresholdPx of each other.
    // Hysteresis is provided by battleMinDurationMs (state stays active once entered).
    const hasBattle = this._isPulk(racers);
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
    // Priority 4: Battle — pulk detected (≥3 racers within threshold), off cooldown
    else if (hasBattle && battleCooledDown) {
      nextState = CAM_STATE.BATTLE_ZOOM;
      reason = `battle: pulk (${racers.length} racers, threshold=${this._battlePulkThresholdPx}px)`;
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
    this._lerpPhase = 'entry';
    this._entryStartTs = null; // reset; update() picks up fresh ts on first entry-phase frame
    if (nextState === CAM_STATE.BATTLE_ZOOM) {
      this._battleDiagFrameCount = 0;
      this._battleDiagSnapshots = [];
      this._battleDiagFrozen = false;
    }

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

    // Reset phased observer and set up T-space lerp for the new state.
    this._leadOutStartCamT = null;
    this._leadOutStartTs = null;
    this._leadOutDistanceT = 0;
    this._entrySpeedEstimate = NOMINAL_T_PER_FRAME;
    // Reset so frame 1 of the new state uses NOMINAL_T_PER_FRAME as speed estimate,
    // not a stale delta accumulated across the previous state's tracking phase.
    this._prevFocusT = null;
    if (this._shape) {
      // Compute focusT for all states including OVERVIEW (use leader's T for OVERVIEW so the
      // camera targets the leader's position, centering the action with followers visible).
      let focusT = null;
      switch (nextState) {
        case CAM_STATE.LEADER_ZOOM:
          focusT = ordered[0]?.t ?? 0;
          break;
        case CAM_STATE.BATTLE_ZOOM: {
          const r0b = ordered[0];
          const r1b = ordered.length > 1 ? ordered[1] : r0b;
          focusT = ((r0b?.t ?? 0) + (r1b?.t ?? 0)) / 2;
          break;
        }
        case CAM_STATE.COMEBACK_ZOOM:
          focusT = ordered[Math.min(2, ordered.length - 1)]?.t ?? 0;
          break;
        case CAM_STATE.OVERVIEW:
          focusT = ordered[0]?.t ?? 0; // leader's T; T-space lerp targets leader position
          break;
      }
      if (focusT !== null) {
        // Keep _camT from the old state (T-space lerp starts from current track position).
        // Only initialize to focusT when coming from a state that had no _camT (e.g., OVERVIEW
        // tracking where _camT was released to null after convergence).
        if (this._camT === null) {
          this._camT = focusT;
        }
        // Lead-ahead offset: zoom states target focusT + leadAheadOffset so the camera
        // arrives at the lead-in start position at convergence, no jump required.
        const prof = this._phasedByState?.[nextState];
        const phasedEnabled = prof && (prof.leadInDuration > 0 || prof.leadOutDuration > 0);
        const speedPerFrame = this._entrySpeedEstimate ?? NOMINAL_T_PER_FRAME;
        const leadAhead =
          nextState !== CAM_STATE.OVERVIEW && phasedEnabled
            ? speedPerFrame * FRAME_RATE * (prof.leadInDuration ?? 0)
            : 0;
        // Open tracks: clamp initial target to [0,1] — no circular wrap-around.
        const rawTarget = focusT + leadAhead;
        this._transitionTargetT = this._isOpenTrack
          ? Math.max(0, Math.min(1, rawTarget))
          : rawTarget;
        // Observer phase is always 'idle' at transition; the convergence gate promotes it
        // to 'lead-in' or 'follow' once zoom and T-space have both converged.
        this._observerPhase = 'idle';
        this._leadInStartTs = null;
      } else {
        this._camT = null;
        this._transitionTargetT = null;
        this._observerPhase = 'idle';
        this._leadInStartTs = null;
      }
    } else {
      this._camT = null;
      this._transitionTargetT = null;
      this._observerPhase = 'idle';
      this._leadInStartTs = null;
    }
  }

  // Returns the top-N racers by position — the set the camera focuses on.
  _focusRacers(racers) {
    return [...racers].sort((a, b) => b.t - a.t).slice(0, Math.min(TOP_N, racers.length));
  }

  /**
   * Returns true when ≥3 of the top-10 racers (by t) form a cluster within
   * `battlePulkThresholdPx` world pixels of each other.
   * A cluster is defined as: at least one racer has ≥2 others within the threshold.
   * Only considers the top-10 racers to ignore tail-enders milling at the back.
   * @param {Array<{x:number, y:number, t:number}>} racers  Full racer list, any order.
   * @returns {boolean}
   */
  _isPulk(racers) {
    if (!racers || racers.length < 3) return false;
    const top10 = [...racers].sort((a, b) => b.t - a.t).slice(0, Math.min(10, racers.length));
    const thr2 = this._battlePulkThresholdPx * this._battlePulkThresholdPx;
    for (let i = 0; i < top10.length; i++) {
      let closeCount = 0;
      for (let j = 0; j < top10.length; j++) {
        if (i === j) continue;
        const dx = top10[i].x - top10[j].x;
        const dy = top10[i].y - top10[j].y;
        if (dx * dx + dy * dy < thr2) closeCount++;
      }
      if (closeCount >= 2) return true;
    }
    return false;
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

  /**
   * Coordinated pan+zoom target computation for open-track zoom states.
   * Mirror of _setClosedTrackTargets but uses OPEN_TRACK_BASE_ZOOM instead of bsX.
   * Open tracks apply uniform zoom (cam.zoom × BASE_ZOOM), so Y offset is also uniform.
   * @param {{ x: number, y: number }} target  World-space pan target
   * @param {number} stateZoom  cam.zoom for this state (not effective zoom)
   * @param {{ width: number, height: number }} frameSize
   */
  _setOpenTrackTargets(target, stateZoom, frameSize) {
    const BASE = OPEN_TRACK_BASE_ZOOM;
    const minEffZoom = this.overviewZoom * BASE;
    const stateEffZoom = stateZoom * BASE;

    const zoomResolved = resolveCamera({
      targetWorld: target,
      desiredEffZoom: stateEffZoom,
      worldBounds: this._worldBounds,
      frameSize,
      innerFramePct: this._innerFramePct,
      minEffZoom,
    });
    this.targetZoom = zoomResolved.effectiveZoom / BASE;

    const currEffZoom = Math.max(this.zoom * BASE, minEffZoom);
    const panResolved = resolveCamera({
      targetWorld: target,
      desiredEffZoom: currEffZoom,
      worldBounds: this._worldBounds,
      frameSize,
      innerFramePct: this._innerFramePct,
      minEffZoom,
    });
    this.targetOffsetX = -panResolved.camX * panResolved.effectiveZoom;
    this.targetOffsetY = -panResolved.camY * panResolved.effectiveZoom;
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
        if (this._isOpenTrack) {
          const target = getPanTarget(CAM_STATE.OVERVIEW, panSrc, this._shape);
          this._setOpenTrackTargets(target, this.overviewZoom, frameSize);
        } else {
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
        if (this._isOpenTrack) {
          const panTarget =
            this._camT !== null && this._shape
              ? this._shape.getPosition(Math.max(0, Math.min(1, this._camT)), 0)
              : getPanTarget(CAM_STATE.LEADER_ZOOM, focusRacers, this._shape);
          if (panTarget) this._setOpenTrackTargets(panTarget, this._leaderZoom, frameSize);
        } else {
          const panTarget =
            this._camT !== null && this._shape
              ? this._shape.getPosition(((this._camT % 1) + 1) % 1, 0)
              : getPanTarget(CAM_STATE.LEADER_ZOOM, focusRacers, this._shape);
          if (panTarget) {
            this._setClosedTrackTargets(
              panTarget,
              this._leaderZoom * this._bsX,
              frameSize,
              canvasH
            );
          }
        }
        break;
      }

      case CAM_STATE.BATTLE_ZOOM: {
        this.targetZoom = this._battleZoom;
        if (this._isOpenTrack) {
          const panTarget =
            this._camT !== null && this._shape
              ? this._shape.getPosition(Math.max(0, Math.min(1, this._camT)), 0)
              : getPanTarget(CAM_STATE.BATTLE_ZOOM, focusRacers, this._shape);
          if (panTarget) this._setOpenTrackTargets(panTarget, this._battleZoom, frameSize);
        } else {
          const panTarget =
            this._camT !== null && this._shape
              ? this._shape.getPosition(((this._camT % 1) + 1) % 1, 0)
              : getPanTarget(CAM_STATE.BATTLE_ZOOM, focusRacers, this._shape);
          if (panTarget) {
            this._setClosedTrackTargets(
              panTarget,
              this._battleZoom * this._bsX,
              frameSize,
              canvasH
            );
          }
        }
        break;
      }

      case CAM_STATE.COMEBACK_ZOOM: {
        this.targetZoom = this._comebackZoom;
        if (this._isOpenTrack) {
          const panTarget =
            this._camT !== null && this._shape
              ? this._shape.getPosition(Math.max(0, Math.min(1, this._camT)), 0)
              : getPanTarget(CAM_STATE.COMEBACK_ZOOM, focusRacers, this._shape);
          if (panTarget) this._setOpenTrackTargets(panTarget, this._comebackZoom, frameSize);
        } else {
          const panTarget =
            this._camT !== null && this._shape
              ? this._shape.getPosition(((this._camT % 1) + 1) % 1, 0)
              : getPanTarget(CAM_STATE.COMEBACK_ZOOM, focusRacers, this._shape);
          if (panTarget) {
            this._setClosedTrackTargets(
              panTarget,
              this._comebackZoom * this._bsX,
              frameSize,
              canvasH
            );
          }
        }
        break;
      }
    }
  }

  /**
   * Phased observer: time-based lead-in / follow / lead-out for zoom states (both track types).
   * Lead-in: fixed point ahead of racer for leadInDuration seconds after state start.
   * Follow: pin camera exactly to racer (Δ ≈ 0, no lerp lag).
   * Lead-out: EMA deceleration to near-stop, triggered leadOutDuration seconds before state end.
   * Only acts when _lerpPhase === 'tracking'. Only called when _camT and _shape are non-null.
   */
  _computePhasedPanTarget(focusRacers, canvasW, canvasH, dt = 1000 / FRAME_RATE, ts = 0) {
    if (this._lerpPhase !== 'tracking') return;

    let focusT;
    switch (this.state) {
      case CAM_STATE.LEADER_ZOOM: {
        const r = focusRacers[0];
        focusT = r?.t ?? 0;
        break;
      }
      case CAM_STATE.BATTLE_ZOOM: {
        const r0 = focusRacers[0];
        const r1 = focusRacers.length > 1 ? focusRacers[1] : r0;
        focusT = ((r0?.t ?? 0) + (r1?.t ?? 0)) / 2;
        break;
      }
      case CAM_STATE.COMEBACK_ZOOM: {
        const rc = focusRacers[Math.min(2, focusRacers.length - 1)];
        focusT = rc?.t ?? 0;
        break;
      }
      default:
        return;
    }

    this._lastFocusT = focusT;

    const prof = this._phasedByState?.[this.state];
    if (!prof) {
      this._prevFocusT = focusT;
      return;
    }

    // Remaining time before the hard state cap (same formula as update()'s transition check)
    const stateCap = this._maxStateDurationByState[this.state] ?? this._maxStateDuration;
    const minHold = this._minStateHoldByState[this.state] ?? this._minStateHoldMs;
    const effectiveDuration = Math.max(stateCap, minHold);
    const remainingMs = this.stateEnteredAt + effectiveDuration - ts;

    // Lead-out trigger: start lead-out when remaining time ≤ leadOutDuration
    if (
      this._observerPhase !== 'lead-out' &&
      prof.leadOutDuration > 0 &&
      remainingMs >= 0 &&
      remainingMs <= prof.leadOutDuration * 1000
    ) {
      this._observerPhase = 'lead-out';
      this._leadOutStartCamT = this._camT;
      this._leadOutStartTs = ts;
      // Camera moves at ~half racer speed during lead-out, decelerating via EMA
      const speed =
        this._prevFocusT !== null ? Math.max(0, focusT - this._prevFocusT) : NOMINAL_T_PER_FRAME;
      this._leadOutDistanceT = speed * FRAME_RATE * prof.leadOutDuration * 0.5;
    }

    if (this._observerPhase === 'lead-out') {
      if (this._leadOutStartCamT !== null && this._leadOutDistanceT > 0) {
        const leadOutTargetT = this._leadOutStartCamT + this._leadOutDistanceT;
        const decayDt = 1 - Math.pow(1 - LEAD_OUT_DECAY, (dt * FRAME_RATE) / 1000);
        this._camT += (leadOutTargetT - this._camT) * decayDt;
      }
      this._prevFocusT = focusT;
      return;
    }

    // Lead-in: time-based — switch to follow after leadInDuration seconds from state start
    if (this._observerPhase === 'lead-in') {
      const elapsed = ts - (this._leadInStartTs ?? ts);
      if (elapsed >= prof.leadInDuration * 1000) {
        this._observerPhase = 'follow';
      } else {
        // Camera stays at the lead-in position initialised in _transition()
        this._prevFocusT = focusT;
        return;
      }
    }

    if (this._observerPhase !== 'follow') {
      this._prevFocusT = focusT;
      return;
    }

    // Follow: pin camera to racer (Δ ≈ 0, no lerp lag)
    this._camT = focusT;
    // Open: clamp to [0,1]; closed: wrap circularly.
    const tNorm = this._isOpenTrack
      ? Math.max(0, Math.min(1, this._camT))
      : ((this._camT % 1) + 1) % 1;
    const camPos = this._shape.getPosition(tNorm, 0);
    if (!camPos) {
      this._prevFocusT = focusT;
      return;
    }

    const stateZoom =
      this.state === CAM_STATE.LEADER_ZOOM
        ? this._leaderZoom
        : this.state === CAM_STATE.BATTLE_ZOOM
          ? this._battleZoom
          : this._comebackZoom;
    const frameSize = { width: canvasW, height: canvasH };
    if (this._isOpenTrack) {
      const BASE = OPEN_TRACK_BASE_ZOOM;
      const resolved = resolveCamera({
        targetWorld: camPos,
        desiredEffZoom: stateZoom * BASE,
        worldBounds: this._worldBounds,
        frameSize,
        innerFramePct: this._innerFramePct,
        minEffZoom: this.overviewZoom * BASE,
      });
      this.offsetX = this.targetOffsetX = -resolved.camX * resolved.effectiveZoom;
      this.offsetY = this.targetOffsetY = -resolved.camY * resolved.effectiveZoom;
    } else {
      const resolved = resolveCamera({
        targetWorld: camPos,
        desiredEffZoom: stateZoom * this._bsX,
        worldBounds: this._worldBounds,
        frameSize,
        innerFramePct: this._innerFramePct,
        minEffZoom: this._bsX,
      });
      this.offsetX = this.targetOffsetX = -resolved.camX * resolved.effectiveZoom;
      this.offsetY = this.targetOffsetY = this._closedOffsetY(
        camPos.y,
        resolved.effectiveZoom,
        canvasH
      );
    }

    this._prevFocusT = focusT;
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

  /** Current lerp phase: 'entry' (slow, smooth) or 'tracking' (fast, sticky). */
  get lerpPhase() {
    return this._lerpPhase;
  }

  /** Camera's current track parameter. Null until first state transition with a shape. */
  get camT() {
    return this._camT;
  }

  /** Current observer phase: 'idle' | 'lead-in' | 'follow' | 'lead-out'. */
  get observerPhase() {
    return this._observerPhase;
  }

  /** Last computed focus-racer t value (informational, for HUD). */
  get lastFocusT() {
    return this._lastFocusT;
  }

  /** Fraction of the last 60 frames spent in 'follow' phase (0.0–1.0). */
  get followPct() {
    let count = 0;
    for (let i = 0; i < 60; i++) count += this._followRingBuf[i];
    const total = Math.min(this._followRingIdx, 60);
    return total > 0 ? count / total : 0;
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

  /** How many times _transition() was called in the last 60 frames. */
  get transitionCount60f() {
    let count = 0;
    for (let i = 0; i < 60; i++) count += this._transitionRingBuf[i];
    return count;
  }

  /** Zoom delta at the last entry-phase convergence check (0 while tracking). */
  get lastEntryDeltaZoom() {
    return this._lastEntryDeltaZoom;
  }

  /** X pan delta in px at the last entry-phase convergence check (0 while tracking). */
  get lastEntryDeltaX() {
    return this._lastEntryDeltaX;
  }

  /** Y pan delta in px at the last entry-phase convergence check (0 while tracking). */
  get lastEntryDeltaY() {
    return this._lastEntryDeltaY;
  }

  /** Ms elapsed since the current entry phase started (0 when tracking). */
  get entryElapsedMs() {
    if (this._lerpPhase !== 'entry' || this._entryStartTs === null) return 0;
    return (this._lastTs ?? 0) - this._entryStartTs;
  }

  /** BATTLE-DIAG: snapshots at frames 1, 15, 30, 45, 60 of the current BATTLE_ZOOM episode. */
  get battleDiagSnapshots() {
    return this._battleDiagSnapshots;
  }

  /** True once 60 frames have been collected and the BATTLE-DIAG panel is frozen. */
  get battleDiagFrozen() {
    return this._battleDiagFrozen;
  }

  /** Reset the BATTLE-DIAG snapshot panel (called from HUD 'R' key). */
  resetBattleDiag() {
    this._battleDiagFrameCount = 0;
    this._battleDiagSnapshots = [];
    this._battleDiagFrozen = false;
  }

  // ── Frame-log diagnostics ─────────────────────────────────────────────────

  /** Whether frame logging is currently active. */
  get diagEnabled() {
    return this._diagEnabled;
  }

  /** Total frames recorded since construction (monotonic, never resets). */
  get diagFrameCount() {
    return this._diagFrameIdx;
  }

  /**
   * Record one frame into the ring buffer. Called at the very end of update()
   * when _diagEnabled is true. The final offsetX/Y/zoom values are already set.
   */
  _recordDiagFrame(ts, dt, lf, tSpaceLerpActive, transitionFired) {
    const dox = this._diagPrevOffsetX !== null ? this.offsetX - this._diagPrevOffsetX : 0;
    const doy = this._diagPrevOffsetY !== null ? this.offsetY - this._diagPrevOffsetY : 0;
    const dz = this._diagPrevZoom !== null ? this.zoom - this._diagPrevZoom : 0;
    this._diagRingBuf[this._diagRingIdx] = {
      fi: this._diagFrameIdx,
      ts,
      dt,
      st: this.state,
      lp: this._lerpPhase,
      op: this._observerPhase,
      ox: this.offsetX,
      oy: this.offsetY,
      z: this.zoom,
      tax: this.targetOffsetX,
      tay: this.targetOffsetY,
      tz: this.targetZoom,
      dox,
      doy,
      dz,
      lf,
      ts2: tSpaceLerpActive ? 1 : 0,
      tf: transitionFired ? 1 : 0,
      ct: this._camT,
      fot: this._lastFocusT,
      pft: this._diagPrevFocusT,
      ttt: this._transitionTargetT,
      ese: this._entrySpeedEstimate,
      edx: this._lastEntryDeltaX,
      edy: this._lastEntryDeltaY,
      edz: this._lastEntryDeltaZoom,
    };
    this._diagPrevOffsetX = this.offsetX;
    this._diagPrevOffsetY = this.offsetY;
    this._diagPrevZoom = this.zoom;
    this._diagRingIdx = (this._diagRingIdx + 1) % DIAG_RING_SIZE;
    this._diagFrameIdx++;
  }

  /**
   * Serialise the ring buffer to a self-documented JSON string.
   * Frames are returned in chronological order (oldest first).
   * @returns {string}  JSON ready for file download or clipboard paste.
   */
  exportDiagLog() {
    const buffered = Math.min(this._diagFrameIdx, DIAG_RING_SIZE);
    // When the buffer has wrapped, the oldest entry is at the current write head.
    const startIdx = this._diagFrameIdx >= DIAG_RING_SIZE ? this._diagRingIdx : 0;
    const frames = [];
    for (let i = 0; i < buffered; i++) {
      frames.push(this._diagRingBuf[(startIdx + i) % DIAG_RING_SIZE]);
    }
    return JSON.stringify(
      {
        meta: {
          exportedAt: new Date().toISOString(),
          totalFrames: this._diagFrameIdx,
          bufferedFrames: buffered,
          ringSize: DIAG_RING_SIZE,
          fieldLegend: {
            fi: 'frameIndex (monotonic)',
            ts: 'timestamp ms',
            dt: 'frame duration ms',
            st: 'camState',
            lp: 'lerpPhase: entry|tracking',
            op: 'observerPhase: idle|lead-in|follow|lead-out',
            ox: 'offsetX px',
            oy: 'offsetY px',
            z: 'zoom',
            tax: 'targetOffsetX px',
            tay: 'targetOffsetY px',
            tz: 'targetZoom',
            dox: 'deltaOffsetX from previous frame (px) — key jitter metric',
            doy: 'deltaOffsetY from previous frame (px)',
            dz: 'deltaZoom from previous frame',
            lf: 'lerp factor used this frame (dt-scaled)',
            ts2: 'tSpaceLerpActive: 1=T-space pin, 0=pixel lerp',
            tf: 'transitionFired this frame: 1=yes',
            ct: 'camT (track param 0–1, null if not in T-space)',
            fot: 'lastFocusT — focus racer track param this frame',
            pft: 'prevFocusT before this frame (null after state change)',
            ttt: 'transitionTargetT (T-space convergence goal, null when tracking)',
            ese: 'entrySpeedEstimate in T/frame',
            edx: 'entryConvergence deltaX px (0 when tracking)',
            edy: 'entryConvergence deltaY px (0 when tracking)',
            edz: 'entryConvergence deltaZoom (0 when tracking)',
          },
        },
        frames,
      },
      null,
      0
    );
  }

  /**
   * Returns the last N frames' {dox, doy, tf} from the ring buffer, newest-last.
   * Used by the mini jitter graph overlay.
   * @param {number} [n=30]
   */
  getRecentDeltas(n = 30) {
    const size = Math.min(this._diagFrameIdx, DIAG_RING_SIZE, n);
    const result = [];
    const newestIdx = (this._diagRingIdx - 1 + DIAG_RING_SIZE) % DIAG_RING_SIZE;
    for (let i = size - 1; i >= 0; i--) {
      const entry = this._diagRingBuf[(newestIdx - i + DIAG_RING_SIZE) % DIAG_RING_SIZE];
      if (entry) result.push({ dox: entry.dox, doy: entry.doy, tf: entry.tf });
    }
    return result;
  }
}
