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
import { diagMixin } from './CameraDirectorDiag.js';
import {
  computeTimingFromConfig,
  BATTLE_PULK_THRESHOLD_PX,
  BATTLE_PULK_THRESHOLD_T,
} from './cameraTimingComputation.js';

export const CAM_STATE = {
  OVERVIEW: 'OVERVIEW',
  LEADER_ZOOM: 'LEADER_ZOOM',
  BATTLE_ZOOM: 'BATTLE_ZOOM',
  COMEBACK_ZOOM: 'COMEBACK_ZOOM',
  LEAD_CHANGE: 'LEAD_CHANGE',
};

// Base zoom multiplier for open tracks — applied in the render path (effectiveZoom),
// not inside CameraDirector. Exported so RaceScreen can use the same constant.
export const OPEN_TRACK_BASE_ZOOM = 1.5;

const _MAX_STATE_DURATION = 8000; // fallback when no config provided
const START_PHASE_DURATION = 3000; // ms of forced OVERVIEW at race start
const _ENDGAME_PROGRESS_THRESHOLD = 0.85; // fallback when no config provided
// Single source in cameraTimingComputation.js; aliased here with underscore convention.
const _BATTLE_PULK_THRESHOLD_PX = BATTLE_PULK_THRESHOLD_PX;
const _BATTLE_PULK_THRESHOLD_T = BATTLE_PULK_THRESHOLD_T;
const _BATTLE_MIN_DURATION_MS = 3000; // fallback: minimum ms BATTLE stays after entry
const _FINISH_DRAMA_DURATION = 1500; // ms of LEADER_ZOOM on winner before OVERVIEW
const _POST_START_HOLD_MS = 7000; // ms of forced LEADER after start phase (no BATTLE during this window)
const _BATTLE_COOLDOWN_MS = 8000; // ms after leaving BATTLE before BATTLE can re-trigger
const _BATTLE_MAX_DURATION = 6000; // ms BATTLE can hold before forced transition
const _MIN_STATE_HOLD_MS = 5000; // minimum ms any state is held before _transition() fires
const FRAME_RATE = 60; // reference display frame rate for lerp formula (dt-scaling applied in update)
// Per-state transition TC fallbacks (used when no config is provided at all)
const _TC_OVERVIEW = 1.5;
const _TC_LEADER = 0.3;
const _TC_BATTLE = 0.3;
const _TC_COMEBACK = 0.3;
const _OVERVIEW_COOLDOWN_MS = 15000; // default ms after leaving OVERVIEW before it can recur
const MAX_INVERSE_ZOOM = 10.0; // ceiling for inverse (targetSize-based) zoom; raised from 5 to support worldW=6144 (Mountainstreet)
const CANVAS_W = 1280; // reference canvas width
const CANVAS_H_REF = 720; // reference canvas height for pct → px conversion
const TOP_N = 3; // camera focuses on the top-N racers by position
// migration divisor for legacy/countdown conversion; px equivalent used in the scale formulae below.
const FALLBACK_REFERENCE_SPRITE_SIZE = 36;
// Scale defaults used when no config (or no cameraStateProfiles) is provided.
// Match DEFAULT_CAMERA_CONFIG values (v14): LEADER=1.81, BATTLE=2.81, COMEBACK=1.39.
const DEFAULT_SPRITE_SCALE = {
  leader: 1.81,
  battle: 2.81,
  comeback: 1.39,
};
// World-pixel radial offset: camera shifts toward field so leader sits at the outer viewport edge.
const _DEFAULT_OVERVIEW_OFFSET_PX = 150;
const DEFAULT_INNER_FRAME_PCT = 0.7;
const LEAD_OUT_DECAY = 0.05; // per-60fps-frame EMA factor for lead-out camera deceleration
const NOMINAL_T_PER_FRAME = 0.001; // fallback racer speed (t/frame) for lead-in distance when _prevFocusT is unknown
// Default T-space convergence threshold. Raised from 0.005 to 0.03 so the camera exits entry
// phase while the leader is moving: steady-state gap = ese/lf ≈ 0.026 at typical speeds, which
// was above the old threshold (camera never converged). Configurable via transitionTConvergence.
const _TRANSITION_T_CONVERGENCE = 0.03;
// Per-state fallback max entry duration (ms) when not set in cameraStateProfiles.
// Formula: ≈ 3.45 × entryTC × 2 (safety factor). OVERVIEW uses TC=1.5s, others TC=0.8s.
const _DEFAULT_MAX_ENTRY_DURATION_MS = {
  OVERVIEW: 10000,
  LEADER_ZOOM: 5000,
  BATTLE_ZOOM: 5000,
  COMEBACK_ZOOM: 5000,
  LEAD_CHANGE: 5000,
};
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
   *   path via cameraStateProfiles.spriteScale (v14+) or legacy spritePctOfCanvas.
   *   Call updateConfig() for live-apply without re-construction.
   * @param {number} [drawnBodyWidthRefPx=0]
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
    drawnBodyWidthRefPx = 0,
    shape = null
  ) {
    this._isOpenTrack = isOpenTrack;
    this._shape = shape;
    this._worldW = worldW;
    this._worldBounds = { minX: 0, minY: 0, maxX: worldW, maxY: worldH };
    this._bsX = CANVAS_W / worldW;
    this._bsY = CANVAS_H_REF / worldH;
    this._drawnBodyWidthRefPx = drawnBodyWidthRefPx;
    // Adaptive overview zoom: shows the entire world at cam.zoom=overviewZoom.
    // For closed tracks, OVERVIEW uses cam.zoom=1 (bsX handles world mapping).
    // For open tracks, OVERVIEW uses cam.zoom=overviewZoom to shrink the field of view.
    this.overviewZoom = CANVAS_W / worldW;
    this._computeZoomLevels(config);
    this._computeTimingConfig(config);
    this.state = CAM_STATE.OVERVIEW;
    this.stateEnteredAt = 0;
    this._inFinishDrama = false;
    this._inFinishMode = false;
    this._finishModeStartTs = null;
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
    this._leadChangeSnapPending = false;
    this._leadInStartTs = null;
    this._leadOutStartCamT = null;
    this._leadOutStartTs = null;
    this._leadOutDistanceT = 0;
    this._prevFocusT = null;
    this._lastFocusT = 0;
    // Track-aware T-space lerp: during entry phase, _camT lerps toward _transitionTargetT
    // along the track (avoiding the euclidean infield shortcut — see camera-pan-path-diagnosis.md).
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
    this._lastDt = 1000 / FRAME_RATE;
    this._lastEntryDeltaZoom = 0;
    this._lastEntryDeltaX = 0;
    this._lastEntryDeltaY = 0;
    // BATTLE camera lock: racer object locked at BATTLE_ZOOM entry (frontmost of battle group).
    // Null when not in BATTLE_ZOOM.
    this._battleLockedRacer = null;
    // Stable index (r.index) of the locked racer — survives renderInterpolation spread-copies.
    this._battleLockedRacerIndex = null;
    // Racer objects forming the detected battle group at BATTLE_ZOOM entry.
    this._battleGroupRacers = [];
    // Stable indices of the battle group — used for index-based lookups across frames.
    this._battleGroupRacerIndices = [];
    // Centroid T of the battle group at BATTLE_ZOOM entry — drives camera pan (Q4).
    this._battleLockT = null;
    // COMEBACK: B1-racer set (Set<racerIndex>) injected by updateRacePlan(). Null = race plan off.
    this._b1Indices = null;
    // Rank history ring buffer per B1 racer: Map<index, Array<{ts, rank}>>
    this._rankHistory = new Map();
    // Camera lock for the current COMEBACK_ZOOM episode.
    this._comebackLockedRacer = null;
    this._comebackLockedRacerIndex = null;
    // Cached per-frame values for getComebackDiagData() — updated every update() call.
    this._diagLeaderProgress = 0;
    this._diagIsExternalOutcomePhase = false;
    this._activeStateMinHoldMs = null; // null = use _minStateHoldByState; 0 = immediately interruptible (same-state repeat)
    this._prevCommittedState = null; // null on first call so constructor-state is never treated as a repeat
    // Dynamic zoom-out floor: tracks the minimum targetZoom for the current LEADER/LEAD_CHANGE phase.
    // Null between phases. Resets on every state transition. Only decrements within a phase.
    this._leaderPhaseZoomFloor = null;
    // Focal-position EMA state: smoothed world-space pan target for LEADER_ZOOM and COMEBACK_ZOOM
    // follow phases. Null = uninitialized (snaps to raw on first follow-phase call).
    // Reset to null on every non-repeat state transition so cuts stay crisp.
    this._smoothedFocalX = null;
    this._smoothedFocalY = null;
    // Normalized OVERVIEW snap zoom — computed from _drawnBodyWidthRefPx at each OVERVIEW entry.
    // Null until first non-repeat OVERVIEW transition on open tracks with drawnBodyWidthRefPx>0.
    // _setTargets reads this; falls back to _overviewStateZoom when null.
    this._overviewSnapZoom = null;
    // _leaderMinZoom, _zoomOutStepPerFrame, _minRacersVisible set in _computeTimingConfig (above).
    // LEAD_CHANGE: leader-tracking state
    this._currentLeaderIndex = null;
    this._currentLeaderName = null;
    this._prevLeaderIndex = null;
    this._prevLeaderName = null;
    this._leadChangePending = false;
    this._leadChangeNewLeaderName = null;
    this._leadChangePrevLeaderName = null;
    this._leadCandidateIndex = null;
    this._leadCandidateSince = null;
    this._lastLeadChangeTs = -Infinity;
    // Director: per-state exit timestamps for individual cooldowns
    this._lastComebackExitTs = -Infinity;
    this._lastLeadChangeExitTs = -Infinity;
    // Director: OVERVIEW scheduler — race-elapsed target for next allowed OVERVIEW fire
    this._overviewScheduleNext = null;
    // Diagnostic: BATTLE-DIAG frozen snapshot panel
    this._battleDiagFrameCount = 0;
    this._battleDiagSnapshots = [];
    this._battleDiagFrozen = false;
    // Frame-log ring buffer — enabled per config.enableFrameLog (set by _computeTimingConfig above).
    // Records ~28 fields per frame; 600 frames ≈ 10 s @ 60 fps.
    this._diagRingBuf = new Array(DIAG_RING_SIZE);
    this._diagRingSize = DIAG_RING_SIZE;
    this._diagRingIdx = 0;
    this._diagFrameIdx = 0;
    this._diagPrevOffsetX = null;
    this._diagPrevOffsetY = null;
    this._diagPrevZoom = null;
    // prevFocusT as it was at the START of the current frame (before overwrite).
    this._diagPrevFocusT = null;
    // Set to 'threshold'|'timeout' on the frame where entry→tracking fires; null all other frames.
    this._diagConvergenceReason = null;
  }

  /**
   * Recompute zoom levels from a new config. Effective on the next _transition() call —
   * no race restart needed (live-apply).
   * @param {object|null} config
   */
  updateConfig(config) {
    this._computeZoomLevels(config);
    this._computeTimingConfig(config);
    // Invalidate stored snap so the new overviewTargetScreenPx takes effect on the next OVERVIEW cut.
    this._overviewSnapZoom = null;
  }

  /**
   * Compute cam.zoom from a spriteScale factor.
   *
   * spriteScale = 1.0 means sprites render at their natural density-scaled size.
   * drawnBodyWidthRefPx cancels out of the formula (L82):
   *   Closed: zoom = spriteScale / bsX   (bsX = CANVAS_W / worldW)
   *   Open:   zoom = spriteScale / OPEN_TRACK_BASE_ZOOM
   *
   * Safety nets: result is clamped to [minZoom, MAX_INVERSE_ZOOM] where minZoom
   * equals 1.0 for closed tracks or overviewZoom for open tracks.
   *
   * @param {number} spriteScale  Relative scale factor (1.0 = natural size)
   * @returns {number}            cam.zoom to assign to this state
   */
  _computeZoomForSpriteScale(spriteScale) {
    let rawZoom;
    if (this._isOpenTrack) {
      rawZoom = spriteScale / OPEN_TRACK_BASE_ZOOM;
    } else {
      const bsX = CANVAS_W / this._worldW;
      rawZoom = spriteScale / bsX;
    }

    const minZoom = this._isOpenTrack ? this.overviewZoom : 1.0;
    return Math.max(minZoom, Math.min(MAX_INVERSE_ZOOM, rawZoom));
  }

  /**
   * Derive _leaderZoom / _leadChangeZoom / _battleZoom / _comebackZoom from config.
   *
   * v14+: each zoom level is computed from spriteScale (relative factor) stored in
   * cameraStateProfiles. zoom = spriteScale / bsX (closed) or spriteScale / OPEN_BASE (open).
   * drawnBodyWidthRefPx cancels out — zoom is racer-count-independent (L82).
   *
   * Legacy spritePctOfCanvas path: pct × CANVAS_H_REF / FALLBACK_REFERENCE_SPRITE_SIZE gives
   * the equivalent spriteScale, preserving cross-track invariance for old configs.
   *
   * @param {object|null} config
   */
  _computeZoomLevels(config) {
    const profiles = config?.cameraStateProfiles;
    if (profiles) {
      // v14 path: spriteScale is the relative zoom factor.
      const scale = {
        leader: profiles.LEADER_ZOOM?.spriteScale ?? DEFAULT_SPRITE_SCALE.leader,
        leadChange: profiles.LEAD_CHANGE?.spriteScale ?? DEFAULT_SPRITE_SCALE.leader,
        battle: profiles.BATTLE_ZOOM?.spriteScale ?? DEFAULT_SPRITE_SCALE.battle,
        comeback: profiles.COMEBACK_ZOOM?.spriteScale ?? DEFAULT_SPRITE_SCALE.comeback,
      };
      this._leaderZoom = this._computeZoomForSpriteScale(scale.leader);
      this._leadChangeZoom = this._computeZoomForSpriteScale(scale.leadChange);
      this._battleZoom = this._computeZoomForSpriteScale(scale.battle);
      this._comebackZoom = this._computeZoomForSpriteScale(scale.comeback);
      this._overviewStateZoom = this._computeZoomForSpriteScale(
        profiles.OVERVIEW?.spriteScale ?? 1.0
      );
    } else if (config?.spritePctOfCanvas) {
      // Legacy path: old configs with spritePctOfCanvas (v2/v3) but no cameraStateProfiles.
      const rawPct = config.spritePctOfCanvas;
      const toScale = (pct) => (pct * CANVAS_H_REF) / FALLBACK_REFERENCE_SPRITE_SIZE;
      this._leaderZoom = this._computeZoomForSpriteScale(toScale(rawPct.leader));
      this._leadChangeZoom = this._computeZoomForSpriteScale(toScale(rawPct.leader));
      this._battleZoom = this._computeZoomForSpriteScale(toScale(rawPct.battle));
      this._comebackZoom = this._computeZoomForSpriteScale(toScale(rawPct.comeback));
      // OVERVIEW zoom: preserve full-world defaults for legacy configs.
      this._overviewStateZoom = this._isOpenTrack ? this.overviewZoom : 1.0;
    } else {
      // No config at all: use scale defaults.
      this._leaderZoom = this._computeZoomForSpriteScale(DEFAULT_SPRITE_SCALE.leader);
      this._leadChangeZoom = this._computeZoomForSpriteScale(DEFAULT_SPRITE_SCALE.leader);
      this._battleZoom = this._computeZoomForSpriteScale(DEFAULT_SPRITE_SCALE.battle);
      this._comebackZoom = this._computeZoomForSpriteScale(DEFAULT_SPRITE_SCALE.comeback);
      // OVERVIEW zoom: preserve full-world defaults (closed=1.0, open=overviewZoom).
      this._overviewStateZoom = this._isOpenTrack ? this.overviewZoom : 1.0;
    }
    this._innerFramePct = config?.targetInnerFramePct ?? DEFAULT_INNER_FRAME_PCT;
    // Countdown start zoom: convert spritePx → spriteScale, typically clamped to overviewZoom.
    this._countdownStartZoom = this._computeZoomForSpriteScale(
      (config?.countdownStartZoomSpritePx ?? 1) / FALLBACK_REFERENCE_SPRITE_SIZE
    );
  }

  /**
   * Derive transition timing parameters from config or hardcoded fallbacks.
   * Called on construction and via updateConfig() for live-apply.
   * @param {object|null} config
   */
  _computeTimingConfig(config) {
    const t = computeTimingFromConfig(config);
    this._battlePulkThresholdPx = t.battlePulkThresholdPx;
    this._battlePulkThresholdT = t.battlePulkThresholdT;
    this._battleMinDurationMs = t.battleMinDurationMs;
    this._battleIsolationThresholdPx = t.battleIsolationThresholdPx;
    this._battleMaxGroupSize = t.battleMaxGroupSize;
    this._battleMaxGroupRankSpan = t.battleMaxGroupRankSpan;
    this._battleMinTopN = t.battleMinTopN;
    this._endgameThreshold = t.endgameThreshold;
    this._postStartHoldMs = t.postStartHoldMs;
    this._battleCooldownMs = t.battleCooldownMs;
    this._showDiagnostics = t.showDiagnostics;
    this._diagEnabled = t.diagEnabled;
    this._transitionTConvergence = t.transitionTConvergence;
    this._overviewOffsetPx = t.overviewOffsetPx;
    this._overviewCooldownMs = t.overviewCooldownMs;
    this._leadAheadEnabledByState = t.leadAheadEnabledByState;
    this._leadOutEnabledByState = t.leadOutEnabledByState;
    this._maxEntryDurationByState = t.maxEntryDurationByState;
    this._tcOverview = t.tcOverview;
    this._tcLeader = t.tcLeader;
    this._tcBattle = t.tcBattle;
    this._tcComeback = t.tcComeback;
    this._tcLeadChange = t.tcLeadChange;
    this._tcEntryOverview = t.tcEntryOverview;
    this._tcEntryLeader = t.tcEntryLeader;
    this._tcEntryBattle = t.tcEntryBattle;
    this._tcEntryComeback = t.tcEntryComeback;
    this._tcEntryLeadChange = t.tcEntryLeadChange;
    this._minStateHoldMs = t.minStateHoldMs;
    this._battleMaxDurationMs = t.battleMaxDurationMs;
    this._maxStateDuration = t.maxStateDuration;
    this._minStateHoldByState = t.minStateHoldByState;
    this._maxStateDurationByState = t.maxStateDurationByState;
    this._phasedByState = t.phasedByState;
    this._tcByState = t.tcByState;
    this._lfOverview = t.lfOverview;
    this._lfLeader = t.lfLeader;
    this._lfBattle = t.lfBattle;
    this._lfComeback = t.lfComeback;
    this._lfLeadChange = t.lfLeadChange;
    this._lfByState = t.lfByState;
    this._lfEntryOverview = t.lfEntryOverview;
    this._lfEntryLeader = t.lfEntryLeader;
    this._lfEntryBattle = t.lfEntryBattle;
    this._lfEntryComeback = t.lfEntryComeback;
    this._lfEntryLeadChange = t.lfEntryLeadChange;
    this._lfEntryByState = t.lfEntryByState;
    this._entryConvergenceZoom = t.entryConvergenceZoom;
    this._entryConvergencePx = t.entryConvergencePx;
    this._comebackMinPositionsGained = t.comebackMinPositionsGained;
    this._comebackWindowSec = t.comebackWindowSec;
    this._comebackMinDuration = t.comebackMinDuration;
    this._outcomePhaseThreshold = t.outcomePhaseThreshold;
    this._comebackMinStartGap = t.comebackMinStartGap;
    this._comebackMaxCurrentRankPct = t.comebackMaxCurrentRankPct;
    this._leadChangeMinGap = t.leadChangeMinGap;
    this._leadChangeDebounceMs = t.leadChangeDebounceMs;
    this._leadChangeMinDuration = t.leadChangeMinDuration;
    this._finishDramaDurationMs = t.finishDramaDurationMs;
    this._finishOverviewZoomOutDurationMs = t.finishOverviewZoomOutDurationMs;
    this._finishPauseMs = t.finishPauseMs;
    this._finishOverviewLookbackPx = t.finishOverviewLookbackPx;
    this._comebackCooldownMs = t.comebackCooldownMs;
    this._leadChangeCooldownMs = t.leadChangeCooldownMs;
    this._battleWeight = t.battleWeight;
    this._leadChangeWeight = t.leadChangeWeight;
    this._comebackWeight = t.comebackWeight;
    this._overviewWeight = t.overviewWeight;
    this._overviewTargetCount = t.overviewTargetCount;
    this._overviewStartDelay = t.overviewStartDelay;
    this._overviewTargetScreenPx = t.overviewTargetScreenPx;
    this._overviewMinEffZoom = t.overviewMinEffZoom ?? 0;
    this._minRacersVisible = config?.minRacersVisible ?? 8;
    this._leaderMinZoom = config?.leaderMinZoom ?? 0.4;
    this._zoomOutStepPerFrame = config?.zoomOutStepPerFrame ?? 0.005;
    this._focalSmoothTc = config?.focalSmoothTc ?? 0.05;
    // Pre-compute per-60fps EMA base factor from TC. 0 when TC=0 (disabled).
    // alpha per frame = 1 − (1−base)^(dt×60/1000) — same dt-normalisation as the zoom lerp.
    this._focalSmoothBase =
      this._focalSmoothTc > 0 ? 1 - Math.pow(0.1, 1 / (this._focalSmoothTc * FRAME_RATE)) : 0;
  }

  // ── Director helpers ──────────────────────────────────────────────────────

  _weightedRandomPick(candidates) {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];
    const total = candidates.reduce((sum, c) => sum + c.weight, 0);
    let r = Math.random() * total;
    for (const c of candidates) {
      r -= c.weight;
      if (r <= 0) return c;
    }
    return candidates[candidates.length - 1];
  }

  _isOverviewEligible(ts, raceState) {
    if (!raceState) return false;
    if (raceState.raceElapsed < this._overviewStartDelay * 1000) return false;
    if (ts - this._lastOverviewExitTs < this._overviewCooldownMs) return false;
    if (this._overviewScheduleNext !== null && raceState.raceElapsed < this._overviewScheduleNext)
      return false;
    return true;
  }

  _scheduleNextOverview(ts, raceState, leader) {
    const leaderT = leader?.t ?? 0;
    const finishT = raceState?.finishT ?? 0;
    const elapsed = raceState?.raceElapsed ?? 0;
    const estimate =
      leaderT > 0.001 && finishT > 0 && elapsed > 0 ? (finishT / leaderT) * elapsed : null;
    const interval =
      estimate != null
        ? estimate / Math.max(1, this._overviewTargetCount)
        : this._overviewCooldownMs;
    const jitter = 0.8 + Math.random() * 0.4;
    this._overviewScheduleNext = elapsed + interval * jitter;
  }

  /**
   * Inject the B1-racer set for COMEBACK detection. Call once after race start when Race Plan is
   * active. Pass null (or omit) to disable COMEBACK detection (race plan off or closed track).
   * @param {Set<number>|null} b1Indices  Set of racer indices with targetRank ≤ 5.
   */
  updateRacePlan(b1Indices) {
    this._b1Indices = b1Indices instanceof Set ? b1Indices : null;
    this._rankHistory = new Map(); // clear stale history on every race start
    this._comebackLockedRacer = null;
    this._comebackLockedRacerIndex = null;
  }

  /**
   * Record the current rank of every B1 racer into the rank-history ring buffer.
   * Called once per rAF frame at the top of update(). Only B1 racers are tracked to
   * keep per-frame allocation trivial. Entries older than (windowSec + 2s) are pruned.
   * @param {Array} racers  Full live racer array (unsorted).
   * @param {number} ts  Current rAF timestamp in ms.
   */
  _updateRankHistory(racers, ts) {
    if (!this._b1Indices || this._b1Indices.size === 0) return;
    const windowMs = (this._comebackWindowSec ?? 5) * 1000;
    const pruneMs = windowMs + 2000; // 2 s extra buffer so window-start comparison always finds an entry
    const sorted = [...racers].sort((a, b) => b.t - a.t);
    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i];
      if (!this._b1Indices.has(r.index)) continue;
      let hist = this._rankHistory.get(r.index);
      if (!hist) {
        hist = [];
        this._rankHistory.set(r.index, hist);
      }
      hist.push({ ts, rank: i + 1 });
      // Prune entries beyond the max retention window (keep at least 1 entry)
      while (hist.length > 1 && hist[0].ts < ts - pruneMs) hist.shift();
    }
  }

  /**
   * Detect the best B1 comeback candidate among live racers.
   * Returns the racer object with the highest rank-gain within the configured window,
   * or null when no B1 racer meets the minimum gain threshold.
   * @param {Array} racers  Full live racer array.
   * @param {number} ts  Current timestamp in ms.
   * @returns {object|null}
   */
  _detectComebackRacer(racers, ts) {
    if (!this._b1Indices || this._b1Indices.size === 0) return null;
    const minGain = this._comebackMinPositionsGained ?? 3;
    const windowMs = (this._comebackWindowSec ?? 5) * 1000;
    const cutoff = ts - windowMs;
    const sorted = [...racers].sort((a, b) => b.t - a.t);
    const currentRankByIndex = new Map(sorted.map((r, i) => [r.index, i + 1]));
    let bestRacer = null;
    let bestGain = -1;
    for (const idx of this._b1Indices) {
      const currentRank = currentRankByIndex.get(idx);
      if (currentRank == null) continue; // finished or absent
      const hist = this._rankHistory.get(idx);
      if (!hist || hist.length < 2) continue;
      // Earliest entry still within the evaluation window
      let earliestInWindow = null;
      for (let i = 0; i < hist.length; i++) {
        if (hist[i].ts >= cutoff) {
          earliestInWindow = hist[i];
          break;
        }
      }
      if (!earliestInWindow) continue;
      // Start-rank filter: racer must have been far enough back at window start
      const N = sorted.length;
      const normDivisor = Math.max(N - 1, 1);
      const startGapNorm = (earliestInWindow.rank - 1) / normDivisor;
      if (startGapNorm < this._comebackMinStartGap) continue;
      // Current-rank filter: racer must not already be in the lead group
      const currentRankNorm = (currentRank - 1) / normDivisor;
      if (currentRankNorm < this._comebackMaxCurrentRankPct) continue;
      const gain = earliestInWindow.rank - currentRank; // positive = moved forward
      if (gain >= minGain && gain > bestGain) {
        bestGain = gain;
        bestRacer = sorted.find((r) => r.index === idx) ?? null;
      }
    }
    return bestRacer;
  }

  /**
   * Track leader changes with double hysteresis: gap threshold + debounce timer.
   * Uses physics racer positions (not render-interpolated) to avoid flicker.
   * Sets _leadChangePending = true when a stable lead change is confirmed.
   * @param {Array} physicsRacers  Physics-state racer array (st.racers, not renderRacers).
   * @param {number} ts  Current rAF timestamp in ms.
   */
  _updateLeaderTracking(physicsRacers, ts) {
    if (!physicsRacers || physicsRacers.length === 0) return;
    const sorted = [...physicsRacers].sort((a, b) => b.t - a.t);
    const leader = sorted[0];
    if (!leader) return;
    // Hysteresis 1: new leader must be clearly ahead of second place
    const second = sorted[1];
    const gap = second ? leader.t - second.t : Infinity;
    if (gap < this._leadChangeMinGap) {
      // Too close — reset candidate so debounce timer doesn't stale-fire on separation
      this._leadCandidateIndex = null;
      this._leadCandidateSince = null;
      return;
    }
    const leadIdx = leader.index ?? null;
    if (leadIdx === this._currentLeaderIndex) {
      // Leader unchanged — clear candidate
      this._leadCandidateIndex = null;
      this._leadCandidateSince = null;
      return;
    }
    // Different leader — apply debounce (Hysteresis 2)
    if (leadIdx !== this._leadCandidateIndex) {
      this._leadCandidateIndex = leadIdx;
      this._leadCandidateSince = ts;
    } else if (ts - this._leadCandidateSince >= this._leadChangeDebounceMs) {
      // Debounce expired — confirmed lead change
      const prevIdx = this._currentLeaderIndex;
      this._prevLeaderIndex = prevIdx;
      this._prevLeaderName = this._currentLeaderName;
      this._currentLeaderIndex = leadIdx;
      this._currentLeaderName = leader.name ?? leader.id ?? null;
      this._leadCandidateIndex = null;
      this._leadCandidateSince = null;
      if (prevIdx !== null) {
        this._leadChangePending = true;
      }
    }
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
    this._updateRankHistory(racers, ts);
    this._updateLeaderTracking(raceState?.physicsRacers ?? racers, ts);
    // Cache leaderProgress and external outcome-phase flag for getComebackDiagData().
    if (racers && racers.length > 0 && raceState?.finishT > 0) {
      let maxT = 0;
      for (const r of racers) if (r.t > maxT) maxT = r.t;
      this._diagLeaderProgress = maxT / raceState.finishT;
    } else {
      this._diagLeaderProgress = 0;
    }
    this._diagIsExternalOutcomePhase = !!raceState?.isOutcomePhase;
    const stateAge = ts - this.stateEnteredAt;
    const stateCap = this._maxStateDurationByState[this.state] ?? this._maxStateDuration;
    const minHold =
      this._activeStateMinHoldMs != null
        ? this._activeStateMinHoldMs
        : (this._minStateHoldByState[this.state] ?? this._minStateHoldMs);
    // Finish-drama is exempt from minStateHoldMs: when the 1500ms pulse expires, transition
    // immediately regardless of how long the state has been held.
    const finishDramaExpired = this._inFinishDrama && ts >= this._finishMomentExpiry;
    // Force immediate transition on first finish detection — bypasses minHold/stateCap so no
    // state (COMEBACK, BATTLE, etc.) can block the drama pulse from starting.
    const forceFinishDrama =
      raceState.finishedCount > 0 && !this._inFinishMode && this._finishMomentExpiry === null;
    const prevState = this.state;
    let _diagTransitioned = false;
    // Early BATTLE exit: leave when the original group disperses after battleMinDurationMs.
    if (
      this.state === CAM_STATE.BATTLE_ZOOM &&
      stateAge >= this._battleMinDurationMs &&
      !this._isOriginalGroupStillValid(racers)
    ) {
      this._exitBattle(ts, racers, raceState, canvasW, canvasH);
      _diagTransitioned = true;
    }
    // P2-drift exit: a locked group member moved into P1/P2 — exit after minHold (no hard-cut).
    if (
      !_diagTransitioned &&
      this.state === CAM_STATE.BATTLE_ZOOM &&
      stateAge >= this._battleMinDurationMs &&
      this._isBattleGroupP2Drifted(racers)
    ) {
      this._exitBattle(ts, racers, raceState, canvasW, canvasH);
      _diagTransitioned = true;
    }
    // Early LEAD_CHANGE interrupt: confirmed leader change while in LEADER_ZOOM.
    if (!_diagTransitioned && this.state === CAM_STATE.LEADER_ZOOM && this._leadChangePending) {
      this._transition(racers, ts, raceState, canvasW, canvasH);
      _diagTransitioned = true;
    }
    // When minHold=0 (same-state repeat), holdGate=0 so _transition() fires every frame
    // until a different state is detected — no stateCap blocker.
    const holdGate = minHold === 0 ? 0 : Math.max(minHold, stateCap);
    if (!_diagTransitioned && (stateAge >= holdGate || finishDramaExpired || forceFinishDrama)) {
      // Pre-set the battle exit timestamp so the cooldown blocks immediate BATTLE re-entry
      // when battleMaxDurationMs expires while hasBattle is still true.
      if (this.state === CAM_STATE.BATTLE_ZOOM) {
        this._lastBattleExitTs = ts;
      }
      this._transition(racers, ts, raceState, canvasW, canvasH);
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
    // the euclidean shortcut through the infield (see camera-pan-path-diagnosis.md).
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
          // Q4: track live centroid of battle group during entry lerp
          const liveGroup = this._findGroupRacers(racers);
          fT =
            liveGroup.length > 0
              ? liveGroup.reduce((sum, r) => sum + r.t, 0) / liveGroup.length
              : (fr[0]?.t ?? 0);
          break;
        }
        case CAM_STATE.COMEBACK_ZOOM: {
          const lockedCBEntry = this._findByIndex(
            racers,
            this._comebackLockedRacerIndex,
            this._comebackLockedRacer
          );
          fT = lockedCBEntry ? lockedCBEntry.t : (fr[Math.min(2, fr.length - 1)]?.t ?? null);
          break;
        }
        case CAM_STATE.LEAD_CHANGE:
          fT = fr[0]?.t ?? null;
          break;
        case CAM_STATE.OVERVIEW:
          // FINISH_OVERVIEW: _camT is anchored to lookbackT (set in _transition).
          // Skip T-space tracking so the leader's runout movement does not overwrite
          // _transitionTargetT and pull the camera past the finish line.
          fT = this._inFinishMode ? null : (fr[0]?.t ?? null);
          break;
      }
      if (fT !== null) {
        this._diagPrevFocusT = this._prevFocusT; // capture before overwrite (frame log)
        if (this._prevFocusT !== null) {
          this._entrySpeedEstimate = Math.max(0, fT - this._prevFocusT);
        }
        this._prevFocusT = fT; // first write this frame; _computePhasedPanTarget reads it at the lead-out transition (~line 1833) then overwrites at every exit
        // Update target every frame: focusT moves with the racer, lead-ahead offset scales
        // with the measured speed so the camera lands at the right lead-ahead position.
        const prof = this._phasedByState?.[this.state];
        const phasedEnabled = prof && (prof.leadInDuration > 0 || prof.leadOutDuration > 0);
        const leadAheadOn = this._leadAheadEnabledByState?.[this.state] ?? true;
        const leadAhead =
          this.state !== CAM_STATE.OVERVIEW && phasedEnabled && leadAheadOn
            ? (this._entrySpeedEstimate ?? NOMINAL_T_PER_FRAME) * FRAME_RATE * prof.leadInDuration
            : 0;
        // Open tracks: clamp target to [0,1] (no circular wrap-around beyond track end).
        const rawTarget = fT + leadAhead;
        this._transitionTargetT = this._isOpenTrack
          ? Math.max(0, Math.min(1, rawTarget))
          : rawTarget;
        // Lerp _camT toward _transitionTargetT. Closed: shortest circular arc. Open: linear.
        this._camT += this._tDelta(this._camT, this._transitionTargetT) * lf;
      } else if (this._inFinishMode && this._camT !== null && this._transitionTargetT !== null) {
        // FINISH_OVERVIEW: _transitionTargetT is fixed at lookbackT (set in _transition, not
        // overwritten because fT=null). Still lerp _camT toward it so the pan glides from the
        // winner's position to the lookback point in parallel with the zoom-out.
        this._camT += this._tDelta(this._camT, this._transitionTargetT) * lf;
      }
    }
    // During entry with T-space lerp active: pan is pinned to _camT's world position (already
    // set in targetOffsetX/Y by _setTargets). No pixel lerp — the camera path follows the track.
    // The zoom lerp is applied BEFORE _setTargets so that targetOffsetX is computed with the
    // post-lerp zoom. Without this, targetOffsetX uses the pre-lerp zoom while the renderer uses
    // the post-lerp zoom, creating a per-frame mismatch (∝ camX × Δzoom) that produces visible
    // camera jumps when dt is variable. Fix applies to both open and closed tracks.
    const tSpaceLerpActive =
      this._lerpPhase === 'entry' &&
      this._camT !== null &&
      this._shape &&
      this._transitionTargetT !== null;
    if (tSpaceLerpActive) {
      this.zoom += (this.targetZoom - this.zoom) * lf;
    }
    this._lastDt = dt;
    this._setTargets(racers, canvasW, canvasH, raceState);

    // LEAD_CHANGE hard-cut: snap offsetX/Y synchronously with the zoom snap so the
    // zoomed-in frame shows the correct racer from frame 0, not the previous position.
    if (this._leadChangeSnapPending) {
      this._leadChangeSnapPending = false;
      this.offsetX = this.targetOffsetX;
      this.offsetY = this.targetOffsetY;
    }

    if (!tSpaceLerpActive) {
      this.zoom += (this.targetZoom - this.zoom) * lf;
    }
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
        Math.abs(this._tDelta(this._camT, this._transitionTargetT)) < this._transitionTConvergence;
      // Time-based fallback: force tracking after maxEntryDurationMs regardless of gap.
      const elapsedEntryMs = ts - this._entryStartTs;
      const maxEntryMs = this._maxEntryDurationByState[this.state] ?? 10000;
      const timedOut = elapsedEntryMs >= maxEntryMs;
      if (zoomConverged && xConverged && yConverged && (tConverged || timedOut)) {
        this._diagConvergenceReason = tConverged ? 'threshold' : 'timeout';
        this._lerpPhase = 'tracking';
        this._entryStartTs = null;
        this._transitionTargetT = null; // T-space lerp complete
        // Start phased observer from current _camT position (already at focusT+leadAhead).
        // For states without phased observer (OVERVIEW), release _camT so pixel-lerp takes over.
        const prof = this._phasedByState?.[this.state];
        const phasedEnabled = prof && (prof.leadInDuration > 0 || prof.leadOutDuration > 0);
        if (phasedEnabled && this._camT !== null && this._shape) {
          const _leadAheadOnForState = this._leadAheadEnabledByState?.[this.state] ?? true;
          if (prof.leadInDuration > 0 && _leadAheadOnForState) {
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
      this._computePhasedPanTarget(focusRacersForPhased, canvasW, canvasH, dt, ts, racers);
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
    if (this._diagEnabled)
      this._recordDiagFrame(ts, dt, lf, tSpaceLerpActive, _diagTransitioned, racers);
    return { zoom: this.zoom, offsetX: this.offsetX, offsetY: this.offsetY };
  }

  /**
   * Priority chain: determines the next camera state given current race context.
   * Returns { nextState, reason, data } or null when the transition should be suppressed
   * (finish-mode lock, or drama still active).
   * Side effects: may mutate finish-mode flags and schedule next OVERVIEW.
   * Does NOT mutate _comebackLockedRacer — that is handled by the caller via data.comebackRacer.
   */
  _pickNextState(racers, ts, raceState) {
    const ordered = [...racers].sort((a, b) => b.t - a.t);
    const leader = ordered[0];
    const leaderProgress = leader && raceState.finishT > 0 ? leader.t / raceState.finishT : 0;
    // Pulk condition: ≥3 of top-10 within battlePulkThresholdPx of each other.
    // Hysteresis is provided by battleMinDurationMs (state stays active once entered).
    const hasBattle = this._isPulk(racers);
    const battleCooledDown = ts - this._lastBattleExitTs >= this._battleCooldownMs;

    // Priority 1: Finish override — drama pulse on first finish, then FINISH_OVERVIEW mode
    if (raceState.finishedCount > 0) {
      if (this._inFinishMode) return null; // finishMode is absolute — no further transitions allowed
      if (this._finishMomentExpiry === null) {
        this._finishMomentExpiry = ts + this._finishDramaDurationMs;
        this._inFinishDrama = true;
        return {
          nextState: CAM_STATE.LEADER_ZOOM,
          reason: 'finish: drama pulse on first finish',
          data: {},
        };
      } else if (ts >= this._finishMomentExpiry) {
        this._inFinishDrama = false;
        this._inFinishMode = true;
        this._finishModeStartTs = ts;
        return {
          nextState: CAM_STATE.OVERVIEW,
          reason: 'finish: drama expired → FINISH_OVERVIEW',
          data: {},
        };
      } else {
        return null; // drama still active, no state change
      }
    }
    // Priority 2: Start phase — hold OVERVIEW on the full field for 3s
    else if (raceState.raceElapsed < START_PHASE_DURATION) {
      return {
        nextState: CAM_STATE.OVERVIEW,
        reason: 'start-phase: raceElapsed < 3000ms',
        data: {},
      };
    }
    // Priority 2.1: Post-start hold — force LEADER for postStartHoldMs after start phase.
    // Prevents BATTLE from firing on natural cluster gaps at race start.
    else if (raceState.raceElapsed < START_PHASE_DURATION + this._postStartHoldMs) {
      return {
        nextState: CAM_STATE.LEADER_ZOOM,
        reason: `post-start-hold: raceElapsed=${(raceState.raceElapsed / 1000).toFixed(1)}s`,
        data: {},
      };
    }
    // Priority 2.5: Endgame — leader past threshold → LEADER, bypasses cooldown.
    // Exception: LEAD_CHANGE is allowed through — a lead swap near the finish line
    // is the most dramatic moment and must not be suppressed.
    else if (leaderProgress > this._endgameThreshold) {
      const lcCooledDown = ts - this._lastLeadChangeExitTs >= this._leadChangeCooldownMs;
      if (this._leadChangePending && lcCooledDown) {
        return {
          nextState: CAM_STATE.LEAD_CHANGE,
          reason: `lead-change: endgame exception (progress=${leaderProgress.toFixed(2)})`,
          data: {},
        };
      } else {
        return {
          nextState: CAM_STATE.LEADER_ZOOM,
          reason: `endgame: leaderProgress=${leaderProgress.toFixed(2)} > ${this._endgameThreshold}`,
          data: {},
        };
      }
    }
    // Candidate pool: weighted random selection from all currently eligible events
    else {
      const candidates = [];

      if (hasBattle && battleCooledDown) {
        candidates.push({
          state: CAM_STATE.BATTLE_ZOOM,
          weight: this._battleWeight,
          reason: `battle: pulk (threshold=${this._battlePulkThresholdPx}px)`,
        });
      }

      const lcCooledDown = ts - this._lastLeadChangeExitTs >= this._leadChangeCooldownMs;
      if (this._leadChangePending && lcCooledDown) {
        candidates.push({
          state: CAM_STATE.LEAD_CHANGE,
          weight: this._leadChangeWeight,
          reason: `lead-change: ${this._prevLeaderName ?? '?'} → ${this._currentLeaderName ?? '?'}`,
        });
      }

      const comebackCooledDown = ts - this._lastComebackExitTs >= this._comebackCooldownMs;
      let _comebackRacer = null;
      const _internalOutcomePhase = leaderProgress > this._outcomePhaseThreshold;
      if ((raceState?.isOutcomePhase || _internalOutcomePhase) && comebackCooledDown) {
        _comebackRacer = this._detectComebackRacer(racers, ts);
        if (_comebackRacer) {
          candidates.push({
            state: CAM_STATE.COMEBACK_ZOOM,
            weight: this._comebackWeight,
            reason: `comeback: ${_comebackRacer.name ?? _comebackRacer.index} gained ≥${this._comebackMinPositionsGained} positions`,
            data: { comebackRacer: _comebackRacer },
          });
        }
      }

      if (this._isOverviewEligible(ts, raceState)) {
        candidates.push({
          state: CAM_STATE.OVERVIEW,
          weight: this._overviewWeight,
          reason: 'overview: scheduled',
        });
      }

      const pick = this._weightedRandomPick(candidates);
      if (pick) {
        if (pick.state === CAM_STATE.OVERVIEW) {
          this._scheduleNextOverview(ts, raceState, leader);
        }
        return { nextState: pick.state, reason: pick.reason, data: pick.data ?? {} };
      } else {
        return {
          nextState: CAM_STATE.LEADER_ZOOM,
          reason: 'leader: default (no active candidates)',
          data: {},
        };
      }
    }
  }

  _transition(racers, ts, raceState, _canvasW = CANVAS_W, _canvasH = CANVAS_H_REF) {
    const prevState = this.state;
    const prevEnteredAt = this.stateEnteredAt;

    // Record exit timestamps for per-state cooldowns
    if (prevState === CAM_STATE.OVERVIEW) {
      this._lastOverviewExitTs = ts;
    }
    if (prevState === CAM_STATE.COMEBACK_ZOOM) {
      this._lastComebackExitTs = ts;
    }
    if (prevState === CAM_STATE.LEAD_CHANGE) {
      this._lastLeadChangeExitTs = ts;
    }

    const ordered = [...racers].sort((a, b) => b.t - a.t);
    const leaderProgress =
      ordered[0] && raceState.finishT > 0 ? ordered[0].t / raceState.finishT : 0;
    const gap01 = ordered.length >= 2 ? Math.abs(ordered[0].t - ordered[1].t) : 0;

    const picked = this._pickNextState(racers, ts, raceState);
    if (picked === null) return;

    const { nextState, reason, data } = picked;

    // Commit COMEBACK camera lock — received via data from _pickNextState
    if (nextState === CAM_STATE.COMEBACK_ZOOM && data.comebackRacer) {
      this._comebackLockedRacer = data.comebackRacer;
      this._comebackLockedRacerIndex = data.comebackRacer.index ?? null;
    }

    // Commit state transition
    // isRepeat: true only when the same state is chosen as last time AND a full entry has
    // already occurred (null on first call so constructor-state never counts as a repeat).
    const isRepeat = nextState === this._prevCommittedState;
    this.state = nextState;
    // Same-state repeat: set holdGate=0 so _transition() fires every frame and any new
    // event can immediately switch away. Non-repeat: store configured minHold for new state.
    this._activeStateMinHoldMs = isRepeat
      ? 0
      : (this._minStateHoldByState[nextState] ?? this._minStateHoldMs);

    if (!isRepeat) {
      this.stateEnteredAt = ts;
      this._lerpPhase = 'entry';
      this._entryStartTs = null; // reset; update() picks up fresh ts on first entry-phase frame
      if (nextState === CAM_STATE.BATTLE_ZOOM) {
        this._battleDiagFrameCount = 0;
        this._battleDiagSnapshots = [];
        this._battleDiagFrozen = false;
        // Lock camera on the frontmost racer of the detected battle group for the entire battle.
        const group = this._detectPulkGroup(racers);
        if (group && group.length > 0) {
          this._battleLockedRacer = group[0]; // group[0] has highest t (frontmost) — DiagHUD only
          this._battleLockedRacerIndex = group[0].index ?? null;
          this._battleGroupRacers = group;
          this._battleGroupRacerIndices = group.map((r) => r.index ?? null);
          // Q4: centroid T for camera pan — set at entry, stays fixed through BATTLE
          this._battleLockT = group.reduce((sum, r) => sum + r.t, 0) / group.length;
        } else {
          this._battleLockedRacer = null;
          this._battleLockedRacerIndex = null;
          this._battleGroupRacers = [];
          this._battleGroupRacerIndices = [];
          this._battleLockT = null;
        }
      }

      // Commit LEAD_CHANGE: save names for overlay text, hard cut (no entry lerp)
      if (nextState === CAM_STATE.LEAD_CHANGE) {
        this._leadChangeNewLeaderName = this._currentLeaderName;
        this._leadChangePrevLeaderName = this._prevLeaderName;
        this._lastLeadChangeTs = ts;
        // Hard cut: skip entry lerp — camera snaps to lead-change zoom immediately
        this._lerpPhase = 'tracking';
        this.zoom = this._leadChangeZoom;
        this.targetZoom = this._leadChangeZoom;
      }

      // OVERVIEW: normally snap zoom immediately to avoid slow lerp down from previous zoom state.
      // Exception: in finishMode the zoom-out is intentionally gradual — skip the hard-cut and
      // temporarily override the entry TC to achieve the configured zoom-out duration.
      if (nextState === CAM_STATE.OVERVIEW) {
        if (!this._inFinishMode) {
          let snapZoom;
          if (this._drawnBodyWidthRefPx > 0) {
            // Normalize for both open and closed tracks: choose cam.zoom so racers appear at
            // _overviewTargetScreenPx screen pixels. The effective-zoom divisor is
            // OPEN_TRACK_BASE_ZOOM (open) or bsX (closed) — same formula, different multiplier.
            const divisor = this._isOpenTrack ? OPEN_TRACK_BASE_ZOOM : this._bsX;
            const raw = this._overviewTargetScreenPx / (this._drawnBodyWidthRefPx * divisor);
            // Open ceiling: 80% of state zoom prevents the leader leaving canvas during pan.
            // Closed ceiling: only MAX_INVERSE_ZOOM — resolveCamera handles world-edge clamping.
            const maxZoom = this._isOpenTrack
              ? Math.min(MAX_INVERSE_ZOOM, this._overviewStateZoom * 0.8)
              : MAX_INVERSE_ZOOM;
            const minZoom = this._isOpenTrack ? this.overviewZoom : 1.0;
            snapZoom = Math.max(minZoom, Math.min(maxZoom, raw));
            // Apply configurable zoom floor (open tracks only): prevents extreme zoom-out at low racer counts.
            if (this._isOpenTrack && this._overviewMinEffZoom > 0) {
              snapZoom = Math.max(snapZoom, this._overviewMinEffZoom / OPEN_TRACK_BASE_ZOOM);
            }
            this._overviewSnapZoom = snapZoom; // stored so _setTargets uses the same zoom
          } else {
            snapZoom = this._overviewStateZoom;
          }
          this.zoom = snapZoom;
          this.targetZoom = snapZoom;
        } else {
          // finishMode smooth zoom-out: derive TC from configured duration (90% convergence ≈ 3.45×TC).
          const tc = Math.max(0.1, this._finishOverviewZoomOutDurationMs / 3450);
          this._lfEntryByState[CAM_STATE.OVERVIEW] = tcToLerpFactor(tc);
        }
      }

      // Reset per-phase zoom-out floor on every state transition.
      this._leaderPhaseZoomFloor = null;
      // Reset focal smoother so the first follow frame snaps to the new target — no lag on cuts.
      this._smoothedFocalX = null;
      this._smoothedFocalY = null;
    }

    // Release camera lock when leaving BATTLE_ZOOM
    if (prevState === CAM_STATE.BATTLE_ZOOM && nextState !== CAM_STATE.BATTLE_ZOOM) {
      this._battleLockedRacer = null;
      this._battleLockedRacerIndex = null;
      this._battleGroupRacers = [];
      this._battleGroupRacerIndices = [];
      this._battleLockT = null;
    }

    // Release COMEBACK camera lock when leaving COMEBACK_ZOOM
    if (prevState === CAM_STATE.COMEBACK_ZOOM && nextState !== CAM_STATE.COMEBACK_ZOOM) {
      this._comebackLockedRacer = null;
      this._comebackLockedRacerIndex = null;
    }

    // always clear; was consumed (or suppressed) in this _transition() call
    this._leadChangePending = false;

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

    if (!isRepeat) {
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
            // Q4: use centroid T of battle group. Falls back to frontmost when no lock captured.
            focusT = this._battleLockT ?? ordered[0]?.t ?? 0;
            break;
          }
          case CAM_STATE.COMEBACK_ZOOM: {
            const lockedCB = this._comebackLockedRacer;
            focusT = lockedCB?.t ?? ordered[Math.min(2, ordered.length - 1)]?.t ?? 0;
            break;
          }
          case CAM_STATE.LEAD_CHANGE:
            focusT = ordered[0]?.t ?? 0; // focus on the new leader
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
          const _leadAheadOnForNext = this._leadAheadEnabledByState?.[nextState] ?? true;
          const leadAhead =
            nextState !== CAM_STATE.OVERVIEW && phasedEnabled && _leadAheadOnForNext
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

      // FINISH_OVERVIEW entry: set _transitionTargetT to the lookback point before the finish
      // line. _camT is intentionally left at the winner's current T so the entry-phase T-lerp
      // smoothly pans from the winner's position to lookbackT in parallel with the zoom-out.
      // (Previously _camT was also snapped to lookbackT here, causing a hard-cut on frame 1.)
      if (
        nextState === CAM_STATE.OVERVIEW &&
        this._inFinishMode &&
        raceState?.finishT > 0 &&
        this._shape
      ) {
        const normT = this._isOpenTrack
          ? Math.min(1, raceState.finishT)
          : ((raceState.finishT % 1) + 1) % 1;
        const pathLen = this._shape.getTotalLength?.() ?? 0;
        const lookbackFrac = pathLen > 0 ? this._finishOverviewLookbackPx / pathLen : 0;
        const lookbackT = this._isOpenTrack
          ? Math.max(0, normT - lookbackFrac)
          : (((normT - lookbackFrac) % 1) + 1) % 1;
        this._transitionTargetT = lookbackT;
      }

      // LEAD_CHANGE hard cut: snap _camT to new leader and flag pan snap in update().
      // Without this, _setTargets runs on frame 0 with stale _camT from the previous state
      // (since _computePhasedPanTarget runs after _setTargets), causing a 1-frame wrong position.
      // Note: focusT is scoped inside the _shape block above, so re-derive from ordered here.
      if (nextState === CAM_STATE.LEAD_CHANGE && this._shape) {
        this._observerPhase = 'follow';
        const newLeaderT = ordered[0]?.t ?? null;
        if (newLeaderT !== null) {
          this._camT = newLeaderT;
        }
        this._leadChangeSnapPending = true;
      }
    }

    this._prevCommittedState = nextState;
  }

  // Returns the top-N racers by position — the set the camera focuses on.
  _focusRacers(racers) {
    return [...racers].sort((a, b) => b.t - a.t).slice(0, Math.min(TOP_N, racers.length));
  }

  /**
   * Finds the first group of ≥3 racers that simultaneously satisfy all BATTLE conditions:
   *   1. Spatial    — all pairwise euclidean distances < battlePulkThresholdPx
   *   2. Temporal   — all pairwise |t_i − t_j| < battlePulkThresholdT (similar projected ETA)
   *   3. Positional — frontmost group racer at rank 3 or worse (P1/P2 are LEADER territory);
   *                   seed-triple rank span ≤ 3; frontmost rank ≤ battleMinTopN
   *   4. Expansion  — greedy expansion capped at battleMaxGroupRankSpan total rank span
   *
   * Returns the group sorted frontmost-first (highest t), or null when no group qualifies.
   * @param {Array<{x:number, y:number, t:number}>} racers  Full racer list, any order.
   * @returns {Array|null}
   */
  _detectPulkGroup(racers) {
    if (!racers || racers.length < 3) return null;
    const sorted = [...racers].sort((a, b) => b.t - a.t);
    const n = sorted.length;
    if (n < 3) return null;
    const thr2 = this._battlePulkThresholdPx * this._battlePulkThresholdPx;
    const tThr = this._battlePulkThresholdT;
    const isoThr2 = this._battleIsolationThresholdPx * this._battleIsolationThresholdPx;
    const maxSize = this._battleMaxGroupSize ?? 6;
    const maxRankSpan = this._battleMaxGroupRankSpan ?? 5;
    // i >= 2: frontmost battle racer must be at rank 3 or worse (P1/P2 are LEADER territory).
    // i < battleMinTopN: frontmost must be in the configured top-N (default top-10).
    const minTopN = this._battleMinTopN ?? 10;
    for (let i = 2; i < n - 2 && i < minTopN; i++) {
      for (let j = i + 1; j < n && j - i <= 3; j++) {
        for (let k = j + 1; k < n && k - i <= 3; k++) {
          const ri = sorted[i],
            rj = sorted[j],
            rk = sorted[k];
          // Temporal condition
          if (
            Math.abs(ri.t - rj.t) > tThr ||
            Math.abs(ri.t - rk.t) > tThr ||
            Math.abs(rj.t - rk.t) > tThr
          )
            continue;
          // Spatial condition
          if ((ri.x - rj.x) ** 2 + (ri.y - rj.y) ** 2 >= thr2) continue;
          if ((ri.x - rk.x) ** 2 + (ri.y - rk.y) ** 2 >= thr2) continue;
          if ((rj.x - rk.x) ** 2 + (rj.y - rk.y) ** 2 >= thr2) continue;
          // Q2: greedy expansion — add adjacent-rank racers (index >= 2, not P1/P2) up to maxSize.
          // Track rank span: reject candidates that would push (maxIdx - minIdx) > maxRankSpan.
          const group = [ri, rj, rk];
          const groupSet = new Set([i, j, k]);
          let minGroupIdx = i; // seed frontmost always has best rank (i <= j <= k)
          let maxGroupIdx = k;
          for (let e = 2; e < n && group.length < maxSize; e++) {
            if (groupSet.has(e)) continue;
            const re = sorted[e];
            // Rank-span guard: check before spatial/temporal (cheaper)
            const candMin = Math.min(minGroupIdx, e);
            const candMax = Math.max(maxGroupIdx, e);
            if (candMax - candMin > maxRankSpan) continue;
            let fits = true;
            for (const gm of group) {
              if (Math.abs(gm.t - re.t) > tThr || (gm.x - re.x) ** 2 + (gm.y - re.y) ** 2 >= thr2) {
                fits = false;
                break;
              }
            }
            if (fits) {
              group.push(re);
              groupSet.add(e);
              minGroupIdx = candMin;
              maxGroupIdx = candMax;
            }
          }
          // Q1: isolation check — skip when threshold is 0 (disabled)
          if (this._battleIsolationThresholdPx > 0) {
            let isolated = true;
            outer: for (let o = 0; o < n; o++) {
              if (groupSet.has(o)) continue;
              const ro = sorted[o];
              for (const gm of group) {
                if ((gm.x - ro.x) ** 2 + (gm.y - ro.y) ** 2 < isoThr2) {
                  isolated = false;
                  break outer;
                }
              }
            }
            if (!isolated) continue;
          }
          return group; // sorted frontmost-first (highest t), size 3–maxSize
        }
      }
    }
    return null;
  }

  /**
   * Returns true when a qualifying BATTLE group exists.
   * All three conditions (spatial + temporal + positional) must hold simultaneously.
   * @param {Array<{x:number, y:number, t:number}>} racers
   * @returns {boolean}
   */
  _isPulk(racers) {
    return this._detectPulkGroup(racers) !== null;
  }

  /** Clears all BATTLE lock state and triggers a transition out of BATTLE_ZOOM. */
  _exitBattle(ts, racers, raceState, canvasW = CANVAS_W, canvasH = CANVAS_H_REF) {
    this._lastBattleExitTs = ts;
    this._battleLockedRacer = null;
    this._battleLockedRacerIndex = null;
    this._battleGroupRacers = [];
    this._battleGroupRacerIndices = [];
    this._battleLockT = null;
    this._transition(racers, ts, raceState, canvasW, canvasH);
  }

  /**
   * Q3 exit condition: returns true while the original locked battle group is still spatially
   * cohesive (all pairwise distances < battlePulkThresholdPx). Returns true for empty groups
   * so tests that set state directly never get spurious early exits.
   * @param {Array} racers
   * @returns {boolean}
   */
  _isOriginalGroupStillValid(racers) {
    if (
      !racers ||
      !this._battleGroupRacerIndices?.length ||
      this._battleGroupRacerIndices.length < 3
    )
      return this._isPulk(racers); // no stored group → fall back to any-pulk check (backward compat)
    const group = this._findGroupRacers(racers);
    if (group.length < this._battleGroupRacerIndices.length) return false;
    const thr2 = this._battlePulkThresholdPx * this._battlePulkThresholdPx;
    for (let a = 0; a < group.length; a++) {
      for (let b = a + 1; b < group.length; b++) {
        const ra = group[a],
          rb = group[b];
        if ((ra.x - rb.x) ** 2 + (ra.y - rb.y) ** 2 >= thr2) return false;
      }
    }
    return true;
  }

  /**
   * Returns true when any member of the locked BATTLE group has drifted into P1 or P2
   * since the group was formed. Used as an additional early-exit trigger in update().
   * @param {Array} racers  Current full racer list.
   * @returns {boolean}
   */
  _isBattleGroupP2Drifted(racers) {
    if (!racers || !this._battleGroupRacerIndices?.length) return false;
    const sorted = [...racers].sort((a, b) => b.t - a.t);
    const p12Set = new Set([sorted[0]?.index, sorted[1]?.index].filter((v) => v != null));
    if (p12Set.size === 0) return false;
    return this._battleGroupRacerIndices.some((idx) => idx != null && p12Set.has(idx));
  }

  /**
   * Returns the camera's focus racer during BATTLE_ZOOM.
   * When a racer was locked at BATTLE_ZOOM entry and is still present in the racers
   * array, that locked racer is returned so the camera stays on them even if another
   * racer in the group takes the lead.
   * Falls back to the current race leader when the locked racer is not found.
   * @param {Array} racers  Current full racer list.
   * @returns {object|null}
   */
  _getBattleFocusRacer(racers) {
    const found = this._findByIndex(racers, this._battleLockedRacerIndex, this._battleLockedRacer);
    if (found) return found;
    // Fallback: frontmost racer
    return racers.reduce((best, r) => (!best || r.t > best.t ? r : best), null);
  }

  /**
   * Stable racer lookup: tries r.index === idx first (survives renderInterpolation spread-copies),
   * then falls back to r === fallbackRef (backward compat for tests without index field).
   * Returns null when neither finds a match.
   */
  _findByIndex(racers, idx, fallbackRef) {
    if (idx != null) {
      const r = racers.find((r) => r.index === idx);
      if (r) return r;
    }
    if (fallbackRef) {
      return racers.find((r) => r === fallbackRef) ?? null;
    }
    return null;
  }

  /**
   * Resolves the stored battle group to live racer objects from the current racers array.
   * Uses _battleGroupRacerIndices for index-based lookup (stable across spread-copies),
   * falls back to _battleGroupRacers reference for each slot.
   */
  _findGroupRacers(racers) {
    if (!racers || !this._battleGroupRacerIndices?.length) return this._battleGroupRacers ?? [];
    return this._battleGroupRacerIndices
      .map((idx, i) => this._findByIndex(racers, idx, this._battleGroupRacers?.[i] ?? null))
      .filter(Boolean);
  }

  /**
   * Count non-finished racers whose screen projection falls within the canvas viewport.
   * Uses the current (live) offsetX/Y so the visibility check matches what the player sees.
   * @param {Array} racers   Full racer list.
   * @param {number} effZoom  Effective zoom (cam.zoom × BASE for open, × bsX for closed).
   * @param {number} canvasW  Canvas width in pixels.
   * @param {number} canvasH  Canvas height in pixels.
   * @returns {number}  Count of visible non-finished racers.
   */
  _countVisibleRacers(racers, effZoom, canvasW, canvasH) {
    if (!racers || effZoom <= 0) return 0;
    let count = 0;
    for (const r of racers) {
      if (r.finished) continue;
      const sx = r.x * effZoom + this.offsetX;
      const sy = r.y * effZoom + this.offsetY;
      if (sx >= 0 && sx < canvasW && sy >= 0 && sy < canvasH) count++;
    }
    return count;
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
  _setOpenTrackTargets(target, stateZoom, frameSize, extraMinEffZoom = 0) {
    const BASE = OPEN_TRACK_BASE_ZOOM;
    const minEffZoom = Math.max(this.overviewZoom * BASE, extraMinEffZoom);
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

  /**
   * Compute the OVERVIEW pan target with radial offset applied.
   * The camera center is shifted from the leader toward the track center by
   * overviewOffsetPx world pixels, so the leader appears at the outer viewport
   * edge with the pack visible behind.
   * @param {{ x: number, y: number }} leaderPos  Leader world-coordinate position.
   * @returns {{ x: number, y: number }}
   */
  _applyOverviewRadialOffset(leaderPos) {
    const center = this._shape
      ? this._shape.getCenterPoint()
      : {
          x: (this._worldBounds.minX + this._worldBounds.maxX) / 2,
          y: (this._worldBounds.minY + this._worldBounds.maxY) / 2,
        };
    const dx = leaderPos.x - center.x;
    const dy = leaderPos.y - center.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return leaderPos; // leader at track center — no meaningful radial direction
    const scale = this._overviewOffsetPx / len;
    return { x: leaderPos.x - dx * scale, y: leaderPos.y - dy * scale };
  }

  /**
   * EMA-smooth the camera's world-space focal position during follow phase.
   *
   * Only active when _observerPhase === 'follow' and _focalSmoothBase > 0. During entry and
   * lead-in the T-space lerp already provides smooth motion — smoothing is bypassed (snaps
   * to raw) so the two mechanisms never fight each other. Also snaps on the first follow frame
   * after a state transition (_smoothedFocalX === null) so deliberate cuts stay crisp.
   *
   * dt-normalised: alpha = 1−(1−base)^(dt×FRAME_RATE/1000) — identical real-time smoothing
   * at any frame rate. Uses this._lastDt which is set to the current frame's dt before
   * _setTargets is called (Fix A move).
   *
   * @param {number} rawX  Raw world x from the racer's physics position.
   * @param {number} rawY  Raw world y.
   * @returns {{ x: number, y: number }}  Smoothed world position to use as pan target.
   */
  _smoothFocal(rawX, rawY) {
    if (
      this._focalSmoothBase <= 0 ||
      this._observerPhase !== 'follow' ||
      this._smoothedFocalX === null
    ) {
      this._smoothedFocalX = rawX;
      this._smoothedFocalY = rawY;
      return { x: rawX, y: rawY };
    }
    const alpha = 1 - Math.pow(1 - this._focalSmoothBase, (this._lastDt * FRAME_RATE) / 1000);
    this._smoothedFocalX += (rawX - this._smoothedFocalX) * alpha;
    this._smoothedFocalY += (rawY - this._smoothedFocalY) * alpha;
    return { x: this._smoothedFocalX, y: this._smoothedFocalY };
  }

  _setTargets(racers, canvasW, canvasH, raceState) {
    const focusRacers = this._focusRacers(racers);
    const frameSize = { width: canvasW, height: canvasH };

    switch (this.state) {
      case CAM_STATE.OVERVIEW: {
        // Normalized snap zoom committed at OVERVIEW entry — same for open and closed tracks.
        // Falls back to _overviewStateZoom before the first OVERVIEW transition fires.
        const _ovSnapZoom = this._overviewSnapZoom ?? this._overviewStateZoom;

        // Entry phase with T-space lerp active: pan follows _camT along the track curve,
        // matching LEADER/BATTLE/COMEBACK — prevents hard snap to leader position on frame 1.
        if (this._lerpPhase === 'entry' && this._camT !== null && this._shape) {
          const entryPanTarget = this._isOpenTrack
            ? this._shape.getPosition(Math.max(0, Math.min(1, this._camT)), 0)
            : this._shape.getPosition(((this._camT % 1) + 1) % 1, 0);
          if (entryPanTarget) {
            if (this._isOpenTrack) {
              this._setOpenTrackTargets(
                entryPanTarget,
                _ovSnapZoom,
                frameSize,
                this._overviewMinEffZoom
              );
            } else {
              this._setClosedTrackTargets(
                entryPanTarget,
                _ovSnapZoom * this._bsX,
                frameSize,
                canvasH
              );
            }
          }
          break;
        }
        // finishMode: center camera on a fixed point finishOverviewLookbackPx before the finish
        // line. Using the winner's live position as anchor caused the camera to drift forward
        // with the runout movement — this approach keeps the target stationary so the
        // approach section to the finish stays visible throughout FINISH_OVERVIEW.
        if (this._inFinishMode && this._shape && raceState?.finishT > 0) {
          const normT = this._isOpenTrack
            ? Math.min(1, raceState.finishT)
            : ((raceState.finishT % 1) + 1) % 1;
          const pathLen = this._shape.getTotalLength?.() ?? 0;
          const lookbackFrac = pathLen > 0 ? this._finishOverviewLookbackPx / pathLen : 0;
          const lookbackT = this._isOpenTrack
            ? Math.max(0, normT - lookbackFrac)
            : (((normT - lookbackFrac) % 1) + 1) % 1;
          const target = this._shape.getPosition(lookbackT, 0);
          if (target) {
            if (this._isOpenTrack) {
              this._setOpenTrackTargets(target, _ovSnapZoom, frameSize, this._overviewMinEffZoom);
            } else {
              this._setClosedTrackTargets(target, _ovSnapZoom * this._bsX, frameSize, canvasH);
            }
            break;
          }
        }
        const isStartPhase = raceState && raceState.raceElapsed < START_PHASE_DURATION;
        // During start phase: centroid of full field so no racer is cropped.
        // After start phase: follow leader with radial offset toward field.
        const basePanTarget = isStartPhase
          ? getPanTarget(CAM_STATE.OVERVIEW, racers.length ? racers : focusRacers, this._shape)
          : focusRacers.length > 0
            ? { x: focusRacers[0].x, y: focusRacers[0].y }
            : { x: 0, y: 0 };
        const target =
          !isStartPhase && this._overviewOffsetPx > 0
            ? this._applyOverviewRadialOffset(basePanTarget)
            : basePanTarget;
        if (this._isOpenTrack) {
          this._setOpenTrackTargets(target, _ovSnapZoom, frameSize, this._overviewMinEffZoom);
        } else {
          this._setClosedTrackTargets(target, _ovSnapZoom * this._bsX, frameSize, canvasH);
        }
        break;
      }

      case CAM_STATE.LEADER_ZOOM: {
        this.targetZoom = this._leaderZoom;
        if (this._isOpenTrack) {
          let panTarget;
          if (this._camT !== null && this._shape && this._observerPhase !== 'follow') {
            panTarget = this._shape.getPosition(Math.max(0, Math.min(1, this._camT)), 0);
          } else {
            const raw = getPanTarget(CAM_STATE.LEADER_ZOOM, focusRacers, this._shape);
            panTarget = this._smoothFocal(raw.x, raw.y);
          }
          if (panTarget) this._setOpenTrackTargets(panTarget, this._leaderZoom, frameSize);
        } else {
          let panTarget;
          if (this._camT !== null && this._shape && this._observerPhase !== 'follow') {
            panTarget = this._shape.getPosition(((this._camT % 1) + 1) % 1, 0);
          } else {
            const raw = getPanTarget(CAM_STATE.LEADER_ZOOM, focusRacers, this._shape);
            panTarget = this._smoothFocal(raw.x, raw.y);
          }
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
        // Tracking-phase pan target: follow centroid of live battle group.
        // When group is empty (direct state assignment in tests) fall back to shape midpoint.
        const liveGroup = this._findGroupRacers(racers);
        const battleFallback =
          liveGroup.length > 0
            ? {
                x: liveGroup.reduce((s, r) => s + r.x, 0) / liveGroup.length,
                y: liveGroup.reduce((s, r) => s + r.y, 0) / liveGroup.length,
              }
            : getPanTarget(CAM_STATE.BATTLE_ZOOM, focusRacers, this._shape);
        if (this._isOpenTrack) {
          const panTarget =
            this._camT !== null && this._shape && this._observerPhase !== 'follow'
              ? this._shape.getPosition(Math.max(0, Math.min(1, this._camT)), 0)
              : battleFallback;
          if (panTarget) this._setOpenTrackTargets(panTarget, this._battleZoom, frameSize);
        } else {
          const panTarget =
            this._camT !== null && this._shape && this._observerPhase !== 'follow'
              ? this._shape.getPosition(((this._camT % 1) + 1) % 1, 0)
              : battleFallback;
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
        // When a comeback racer was locked at state entry, follow them; otherwise fall back to
        // rank-3 racer (existing behavior, keeps tests passing without a locked racer).
        const lockedCBRacer = this._findByIndex(
          racers,
          this._comebackLockedRacerIndex,
          this._comebackLockedRacer
        );
        // Raw focal position: locked racer's physics x,y (or rank-3 fallback).
        // Smoothed via _smoothFocal in follow phase to remove brake-induced velocity oscillation.
        const rawFocal = lockedCBRacer
          ? { x: lockedCBRacer.x, y: lockedCBRacer.y }
          : getPanTarget(CAM_STATE.COMEBACK_ZOOM, focusRacers, this._shape);
        if (this._isOpenTrack) {
          let panTarget;
          if (this._camT !== null && this._shape && this._observerPhase !== 'follow') {
            panTarget = this._shape.getPosition(Math.max(0, Math.min(1, this._camT)), 0);
          } else {
            panTarget = this._smoothFocal(rawFocal.x, rawFocal.y);
          }
          if (panTarget) this._setOpenTrackTargets(panTarget, this._comebackZoom, frameSize);
        } else {
          let panTarget;
          if (this._camT !== null && this._shape && this._observerPhase !== 'follow') {
            panTarget = this._shape.getPosition(((this._camT % 1) + 1) % 1, 0);
          } else {
            panTarget = this._smoothFocal(rawFocal.x, rawFocal.y);
          }
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

      case CAM_STATE.LEAD_CHANGE: {
        this.targetZoom = this._leadChangeZoom;
        if (this._isOpenTrack) {
          const panTarget =
            this._camT !== null && this._shape && this._observerPhase !== 'follow'
              ? this._shape.getPosition(Math.max(0, Math.min(1, this._camT)), 0)
              : getPanTarget(CAM_STATE.LEADER_ZOOM, focusRacers, this._shape);
          if (panTarget) this._setOpenTrackTargets(panTarget, this._leadChangeZoom, frameSize);
        } else {
          const panTarget =
            this._camT !== null && this._shape && this._observerPhase !== 'follow'
              ? this._shape.getPosition(((this._camT % 1) + 1) % 1, 0)
              : getPanTarget(CAM_STATE.LEADER_ZOOM, focusRacers, this._shape);
          if (panTarget) {
            this._setClosedTrackTargets(
              panTarget,
              this._leadChangeZoom * this._bsX,
              frameSize,
              canvasH
            );
          }
        }
        break;
      }
    }

    // Dynamic zoom-out: if fewer than _minRacersVisible non-finished racers are visible,
    // gradually reduce targetZoom each frame until enough appear or the effective floor is reached.
    // Also stops early when all active (non-finished) racers are already visible, even if that
    // count is below minRacersVisible — prevents ratcheting to the hard floor with small fields.
    // One-directional within a phase: floor only decrements, never increments.
    if (
      this._minRacersVisible > 0 &&
      (this.state === CAM_STATE.LEADER_ZOOM || this.state === CAM_STATE.LEAD_CHANGE)
    ) {
      // Evaluate visibility at the LIVE zoom (this.zoom), not the target zoom. The pan offset
      // (this.offsetX) is computed by _setClosedTrackTargets / _setOpenTrackTargets at
      // currEffZoom = this.zoom × bsX (or × BASE for open), so the visibility test must use the
      // same zoom to stay geometrically consistent. Using targetZoom while this.zoom is still
      // lerping makes effZoom and this.offsetX disagree, mapping every racer off-screen
      // (visCount = 0) and ratcheting the floor to its hard minimum (whole field shown).
      // During entry this.zoom is low (wide view from OVERVIEW) → most racers count as visible →
      // floor holds at its initial value; once this.zoom reaches leaderZoom and fewer than
      // visTarget racers are genuinely on-screen, the floor ratchets down until visTarget reappear.
      const effZoom = this._isOpenTrack ? this.zoom * OPEN_TRACK_BASE_ZOOM : this.zoom * this._bsX;
      const visCount = this._countVisibleRacers(racers, effZoom, canvasW, canvasH);
      const activeCount = racers ? racers.reduce((n, r) => n + (r.finished ? 0 : 1), 0) : 0;
      const visTarget = Math.min(this._minRacersVisible, activeCount);
      // Initialize floor to natural targetZoom on first frame of this phase.
      if (this._leaderPhaseZoomFloor === null) {
        this._leaderPhaseZoomFloor = this.targetZoom;
      }
      // On closed tracks cam.zoom must stay >= 1.0: below that, _setClosedTrackTargets
      // computes the pan offset at minEffZoom=bsX but rendering uses the lower effZoom,
      // squeezing the world into the top-left corner of the canvas (black screen bug).
      const effectiveFloor = this._isOpenTrack
        ? this._leaderMinZoom
        : Math.max(this._leaderMinZoom, 1.0);
      // Ratchet floor down when under-visible and above effective hard floor.
      // dt-scaled so zoom-out speed is time-proportional (=1.0 at 16.67ms/60fps).
      if (visCount < visTarget && this._leaderPhaseZoomFloor > effectiveFloor) {
        const dtScale = (this._lastDt * FRAME_RATE) / 1000;
        this._leaderPhaseZoomFloor = Math.max(
          this._leaderPhaseZoomFloor - this._zoomOutStepPerFrame * dtScale,
          effectiveFloor
        );
      }
      // Apply floor: targetZoom cannot exceed floor (prevents zoom-in mid-phase).
      this.targetZoom = Math.min(this.targetZoom, this._leaderPhaseZoomFloor);
    }
  }

  /**
   * Phased observer: time-based lead-in / follow / lead-out for zoom states (both track types).
   * Lead-in: fixed point ahead of racer for leadInDuration seconds after state start.
   * Follow: advances _camT to racer T so _setTargets targets the racer's world position.
   * Lead-out: EMA deceleration to near-stop, triggered leadOutDuration seconds before state end.
   * Only acts when _lerpPhase === 'tracking'. Only called when _camT and _shape are non-null.
   * targetOffsetX/Y are owned exclusively by _setTargets — this function does not write them.
   */
  _computePhasedPanTarget(
    focusRacers,
    canvasW,
    canvasH,
    dt = 1000 / FRAME_RATE,
    ts = 0,
    allRacers = null
  ) {
    if (this._lerpPhase !== 'tracking') return;

    let focusT;
    switch (this.state) {
      case CAM_STATE.LEADER_ZOOM: {
        const r = focusRacers[0];
        focusT = r?.t ?? 0;
        break;
      }
      case CAM_STATE.BATTLE_ZOOM: {
        // Q4: follow live centroid of battle group. Falls back to focusRacers[0] when group
        // is empty (direct state assignment in tests without a _transition() call).
        const searchList = allRacers ?? focusRacers;
        const liveGroup = this._findGroupRacers(searchList);
        focusT =
          liveGroup.length > 0
            ? liveGroup.reduce((sum, r) => sum + r.t, 0) / liveGroup.length
            : (focusRacers[0]?.t ?? 0);
        break;
      }
      case CAM_STATE.COMEBACK_ZOOM: {
        const searchList = allRacers ?? focusRacers;
        const lockedCB = this._findByIndex(
          searchList,
          this._comebackLockedRacerIndex,
          this._comebackLockedRacer
        );
        focusT = lockedCB ? lockedCB.t : (focusRacers[Math.min(2, focusRacers.length - 1)]?.t ?? 0);
        break;
      }
      case CAM_STATE.LEAD_CHANGE: {
        const r = focusRacers[0];
        focusT = r?.t ?? 0;
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
      (this._leadOutEnabledByState?.[this.state] ?? true) &&
      remainingMs >= 0 &&
      remainingMs <= prof.leadOutDuration * 1000
    ) {
      this._observerPhase = 'lead-out';
      this._leadOutStartCamT = this._camT;
      this._leadOutStartTs = ts;
      // Camera moves at ~half racer speed during lead-out, decelerating via EMA.
      // _prevFocusT here is update()'s first write this frame (~line 723); _computePhasedPanTarget
      // has not yet written it on this code path — all its writes come at the exits below.
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
      this._prevFocusT = focusT; // second write this frame (update() wrote first at ~line 723)
      return;
    }

    // Lead-in: time-based — switch to follow after leadInDuration seconds from state start.
    // Also skip immediately if leadAheadEnabled is OFF for this state.
    if (this._observerPhase === 'lead-in') {
      const _leadAheadOn = this._leadAheadEnabledByState?.[this.state] ?? true;
      const elapsed = ts - (this._leadInStartTs ?? ts);
      if (!_leadAheadOn || elapsed >= prof.leadInDuration * 1000) {
        this._observerPhase = 'follow';
        // Don't run follow code on the transition frame: _camT stays at the lead-in
        // anchor so targetOffsetX doesn't jump. Pixel-lerp closes the gap from the
        // next frame onward — analogous to the PR #109 convergence-jump fix.
        this._prevFocusT = focusT;
        return;
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

    // Follow: advance _camT to the racer's T so _setTargets targets the racer's world position
    // next frame. targetOffsetX/Y are owned exclusively by _setTargets; pixel-lerp closes any
    // remaining gap smoothly — no hard-pin here (would cause a visible jump on the follow frame).
    this._camT = focusT;
    this._prevFocusT = focusT; // second write this frame (update() wrote first at ~line 723)
  }

  /**
   * Camera update for the pre-race countdown phase.
   * Zooms from countdownStartZoom toward OVERVIEW zoom (ease-out cubic) and centres
   * on the geometric centroid of all racers (the start pulk).
   * Sets this.zoom/offsetX/offsetY directly so CameraDirector is ready for the first
   * RACING update() call without a visible jump.
   *
   * @param {Array<{x:number,y:number}>} racers  All racers with world positions.
   * @param {number} ts  Current timestamp (used to keep stateEnteredAt in sync).
   * @param {number} countdownElapsed  ms since countdown start (0 … countdownDurationMs).
   * @param {number} countdownDurationMs  Total duration of the countdown in ms.
   * @param {number} canvasW  Canvas width in pixels.
   * @param {number} canvasH  Canvas height in pixels.
   * @returns {{ zoom: number, offsetX: number, offsetY: number }}
   */
  updateCountdown(racers, ts, countdownElapsed, countdownDurationMs, canvasW, canvasH) {
    const duration = Math.max(1, countdownDurationMs);
    const progress = Math.min(1, Math.max(0, countdownElapsed / duration));
    // Ease-out cubic: starts fast, arrives smoothly — no hard stop at transition to OVERVIEW.
    const eased = 1 - Math.pow(1 - progress, 3);

    const targetZoom =
      this._countdownStartZoom + (this._overviewStateZoom - this._countdownStartZoom) * eased;
    this.zoom = targetZoom;
    this.targetZoom = targetZoom;

    // Pan to pulk centroid (mean world position of all racers).
    let cx = (this._worldBounds.minX + this._worldBounds.maxX) / 2;
    let cy = (this._worldBounds.minY + this._worldBounds.maxY) / 2;
    if (racers && racers.length > 0) {
      cx = racers.reduce((s, r) => s + (r.x ?? cx), 0) / racers.length;
      cy = racers.reduce((s, r) => s + (r.y ?? cy), 0) / racers.length;
    }

    if (this._isOpenTrack) {
      const effZoom = targetZoom * OPEN_TRACK_BASE_ZOOM;
      const camXMax = Math.max(this._worldBounds.minX, this._worldBounds.maxX - canvasW / effZoom);
      const camX = Math.max(
        this._worldBounds.minX,
        Math.min(camXMax, cx - canvasW / (2 * effZoom))
      );
      this.offsetX = -camX * effZoom;
      const camYMax = Math.max(this._worldBounds.minY, this._worldBounds.maxY - canvasH / effZoom);
      const camY = Math.max(
        this._worldBounds.minY,
        Math.min(camYMax, cy - canvasH / (2 * effZoom))
      );
      this.offsetY = -camY * effZoom;
    } else {
      const effZoomX = targetZoom * this._bsX;
      const camXMax = Math.max(this._worldBounds.minX, this._worldBounds.maxX - canvasW / effZoomX);
      const camX = Math.max(
        this._worldBounds.minX,
        Math.min(camXMax, cx - canvasW / (2 * effZoomX))
      );
      this.offsetX = -camX * effZoomX;
      const effZoomY = targetZoom * this._bsY;
      const camYMax = Math.max(this._worldBounds.minY, this._worldBounds.maxY - canvasH / effZoomY);
      const camY = Math.max(
        this._worldBounds.minY,
        Math.min(camYMax, cy - canvasH / (2 * effZoomY))
      );
      this.offsetY = -camY * effZoomY;
    }
    this.targetOffsetX = this.offsetX;
    this.targetOffsetY = this.offsetY;
    // Keep stateEnteredAt current so the first RACING update() sees a small stateAge.
    this.stateEnteredAt = ts;

    return { zoom: this.zoom, offsetX: this.offsetX, offsetY: this.offsetY };
  }

  /**
   * Display state for the camera HUD.
   * Returns 'FINISH' during the drama pulse, 'FINISH_OVERVIEW' during finishMode, otherwise this.state.
   */
  get hudState() {
    if (this._inFinishDrama) return 'FINISH';
    if (this._inFinishMode) return 'FINISH_OVERVIEW';
    return this.state;
  }

  /** Pause in ms after all racers finish before the leaderboard is shown. Read by RaceScreen. */
  get finishPauseMs() {
    return this._finishPauseMs;
  }

  /** Stable index of the racer locked during COMEBACK_ZOOM. Null when not in COMEBACK_ZOOM. */
  get comebackLockedRacerIndex() {
    return this._comebackLockedRacerIndex;
  }
}

// Install diagnostics methods and getters via mixin (CameraDirectorDiag.js does not import from
// this file, so there is no circular dependency).
Object.defineProperties(CameraDirector.prototype, Object.getOwnPropertyDescriptors(diagMixin));
