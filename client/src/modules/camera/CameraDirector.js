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
import { shortestArcDeltaT } from '../../utils/mathUtils.js';
import { computeTimingFromConfig, BATTLE_PULK_THRESHOLD_T } from './cameraTimingComputation.js';

export const CAM_STATE = {
  OVERVIEW: 'OVERVIEW',
  LEADER_ZOOM: 'LEADER_ZOOM',
  BATTLE_ZOOM: 'BATTLE_ZOOM',
  COMEBACK_ZOOM: 'COMEBACK_ZOOM',
  LEAD_CHANGE: 'LEAD_CHANGE',
  // Photo-Finish (15a): tight top-2 group shot at a close finish. Dedicated state (Option B),
  // not a reuse of BATTLE_ZOOM; reuses BATTLE's arc-midpoint pan + group spriteScale for framing.
  PHOTO_FINISH: 'PHOTO_FINISH',
};

// Base zoom multiplier for open tracks — applied in the render path (effectiveZoom),
// not inside CameraDirector. Exported so RaceScreen can use the same constant.
export const OPEN_TRACK_BASE_ZOOM = 1.5;

const _MAX_STATE_DURATION = 8000; // fallback when no config provided
const START_PHASE_DURATION = 3000; // ms of forced OVERVIEW at race start
const _ENDGAME_PROGRESS_THRESHOLD = 0.85; // fallback when no config provided
// Single source in cameraTimingComputation.js; aliased here with underscore convention.
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
    this._inPhotoFinish = false; // 15a: true while the PHOTO_FINISH shot holds (kept distinct from _inFinishDrama so hudState reports 'PHOTO_FINISH')
    this._photoFinishGateDone = false; // 15a-predictive: once-only latch — the pre-line close-check fires exactly once
    this._photoFinishEnterPending = false; // 15a-predictive: set by update() when the gate decides to enter; consumed by _pickNextState
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
    // CAMERA-FOCUS-3 grammar (A): frame-1 hard-cut pending for the state just entered (pan + zoom snap
    // together to the correct framing). Generalizes the LEAD_CHANGE hard-cut to every anchored entry.
    this._cutSnapPending = false;
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
    // Foresight pipeline: the full authored cameraPlan is STORED here (delivered mid-race by
    // RaceScreen.setCameraPlan). Consumed by _deriveCastComebackers() → _castComebackerIndices, which
    // supplies _detectComebackRacer's primary candidate list (B4b).
    this._cameraPlan = null;
    // Cast comebacker set: the heroes cast with role 'comebacker' (Set<racerIndex>). Derived ONCE from
    // _cameraPlan whenever the plan is (re)stored — never per frame. Null/empty when the plan has no
    // comebacker (assigned winner starts up front ⇒ cast 'sovereign-lead') or no plan is present; in that
    // case _detectComebackRacer falls back to the b1Indices scan.
    this._castComebackerIndices = null;
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
    // Hardening: a non-finite spriteScale (corrupt persisted config) falls back to natural size (1.0)
    // rather than propagating NaN into cam.zoom.
    if (!Number.isFinite(spriteScale)) spriteScale = 1.0;
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
      // The SELECTED OVERVIEW sprite scale (cameraStateProfiles.OVERVIEW.spriteScale). It multiplies the
      // count-normalized OVERVIEW target size (L116) so the owner's slider actually scales the OVERVIEW —
      // 1.0 = the normalized default, 2.5 = 2.5× the normalized size. Finite-guarded (default 1.0).
      const ovScale = profiles.OVERVIEW?.spriteScale;
      this._overviewSpriteScale = Number.isFinite(ovScale) ? ovScale : 1.0;
      this._overviewStateZoom = this._computeZoomForSpriteScale(this._overviewSpriteScale);
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
      this._overviewSpriteScale = 1.0; // legacy configs have no OVERVIEW.spriteScale → unscaled (unchanged)
    } else {
      // No config at all: use scale defaults.
      this._leaderZoom = this._computeZoomForSpriteScale(DEFAULT_SPRITE_SCALE.leader);
      this._leadChangeZoom = this._computeZoomForSpriteScale(DEFAULT_SPRITE_SCALE.leader);
      this._battleZoom = this._computeZoomForSpriteScale(DEFAULT_SPRITE_SCALE.battle);
      this._comebackZoom = this._computeZoomForSpriteScale(DEFAULT_SPRITE_SCALE.comeback);
      // OVERVIEW zoom: preserve full-world defaults (closed=1.0, open=overviewZoom).
      this._overviewStateZoom = this._isOpenTrack ? this.overviewZoom : 1.0;
      this._overviewSpriteScale = 1.0; // no config → natural size (unchanged)
    }
    this._innerFramePct = config?.targetInnerFramePct ?? DEFAULT_INNER_FRAME_PCT;
    // CAMERA-FOCUS-3 transition grammar. 'cut' (grammar A) = every anchored/active state entry snaps
    // pan AND zoom together to the new subject's correct framing on frame 1 (zero acquisition — the
    // half-glide "corner-riding" hybrid is dead). 'legacy' = the pre-FOCUS-3 entry glide. The shipped
    // DEFAULT_CAMERA_CONFIG selects 'cut'; the code fallback stays 'legacy' so bare-config callers and
    // the existing entry-glide tests keep their behaviour. The FOCUS-2 fallback grammar (B) FULL GLIDE
    // is named in the report, not wired here.
    this._transitionGrammar = config?.cameraTransitionGrammar === 'cut' ? 'cut' : 'legacy';
    // CAMERA-FOCUS-3 leader forward-framing fraction (owner's "pack behind, leader forward"). Valid only
    // in (0.5, 0.8]; anything else (incl. absent) → dead-centre, the legacy framing.
    const lff = config?.leaderForwardFrac;
    this._leaderForwardFrac = Number.isFinite(lff) && lff > 0.5 && lff <= 0.8 ? lff : null;
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
    this._battlePulkThresholdT = t.battlePulkThresholdT;
    this._battleMinDurationMs = t.battleMinDurationMs;
    this._battleIsolationThresholdT = t.battleIsolationThresholdT;
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
    this._photoFinishEnabled = t.photoFinishEnabled;
    this._photoFinishCloseThresholdT = t.photoFinishCloseThresholdT;
    this._photoFinishLeadProgress = t.photoFinishLeadProgress;
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
    this._leaderMinZoomFraction = config?.leaderMinZoomFraction ?? 0.6;
    this._zoomOutStepPerFrame = config?.zoomOutStepPerFrame ?? 0.005;
    this._focalSmoothTc = config?.focalSmoothTc ?? 0.05;
    // Pre-compute per-60fps EMA base factor from TC. 0 when TC=0 (disabled).
    // alpha per frame = 1 − (1−base)^(dt×60/1000) — same dt-normalisation as the zoom lerp.
    this._focalSmoothBase =
      this._focalSmoothTc > 0 ? 1 - Math.pow(0.1, 1 / (this._focalSmoothTc * FRAME_RATE)) : 0;
  }

  // ── Director helpers ──────────────────────────────────────────────────────

  _weightedRandomPick(candidates) {
    // Defense in depth (BATTLE-WEIGHT-ZERO-1): a weight of 0 means "never", so the selector must never
    // surface a non-positive-weight candidate even if a caller mis-pushes one. Drop weight <= 0 BEFORE
    // summing; an empty or zero-sum pool returns null (no pick) rather than an arbitrary candidate — the
    // old code returned candidates[0] for a length-1 pool (ignoring its weight) and the first candidate for
    // a zero-sum pool (r = Math.random()*0 = 0 → r -= w → r <= 0 on the first element).
    const pool = candidates.filter((c) => c.weight > 0);
    if (pool.length === 0) return null;
    if (pool.length === 1) return pool[0];
    const total = pool.reduce((sum, c) => sum + c.weight, 0);
    if (!(total > 0)) return null;
    let r = Math.random() * total;
    for (const c of pool) {
      r -= c.weight;
      if (r <= 0) return c;
    }
    return pool[pool.length - 1];
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
  updateRacePlan(b1Indices, cameraPlan = null) {
    this._b1Indices = b1Indices instanceof Set ? b1Indices : null;
    this._rankHistory = new Map(); // clear stale history on every race start
    this._comebackLockedRacer = null;
    this._comebackLockedRacerIndex = null;
    // Store the authored plan (usually null here — heroes are cast mid-race, so the RaceScreen
    // delivers it later via setCameraPlan()).
    this._cameraPlan = cameraPlan ?? null;
    this._deriveCastComebackers();
  }

  /**
   * Deliver the authored cameraPlan mid-race (after heroes are cast), WITHOUT resetting rank history.
   * The RaceScreen calls it once, when the plan first becomes available.
   * @param {object|null} cameraPlan  { b1Indices, heroes:[{index,role,finalRank,beats}] }
   */
  setCameraPlan(cameraPlan) {
    this._cameraPlan = cameraPlan ?? null;
    this._deriveCastComebackers();
  }

  /**
   * Derive the cast comebacker set from the stored cameraPlan — the heroes cast with role 'comebacker'.
   * Called ONCE whenever the plan is (re)stored, never per frame. Sets _castComebackerIndices to null when
   * the plan is absent or names no comebacker, so _detectComebackRacer falls back to the b1Indices scan.
   */
  _deriveCastComebackers() {
    const heroes = this._cameraPlan?.heroes;
    if (!Array.isArray(heroes)) {
      this._castComebackerIndices = null;
      return;
    }
    const set = new Set();
    for (const h of heroes) {
      if (h && h.role === 'comebacker' && Number.isInteger(h.index)) set.add(h.index);
    }
    this._castComebackerIndices = set.size > 0 ? set : null;
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
    // Primary candidates: the cast comebacker set (the race actually names who comes back). Fallback:
    // the full b1Indices scan, used when the plan has no comebacker or no plan was delivered. Every cast
    // comebacker is drawn from the B1 pool (targetRank ≤ 5 = b1Indices), so it is already rank-tracked.
    const candidates =
      this._castComebackerIndices && this._castComebackerIndices.size > 0
        ? this._castComebackerIndices
        : this._b1Indices;
    for (const idx of candidates) {
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
    // 15a-predictive: evaluate the one-shot pre-line gate ONCE, here in update() where the bypass
    // flags live, so the latch is set independent of any transition. Same idiom as
    // forceFinishDrama/finishDramaExpired (all OR-ed into the holdGate check below). The holdGate is
    // bypassed ONLY on entry (top-2 close) — a not-close result sets the latch but leaves
    // minStateHold behaviour untouched. The actual PHOTO_FINISH transition is produced by
    // _pickNextState via the _photoFinishEnterPending flag.
    let photoFinishGateReady = false;
    if (
      !this._photoFinishGateDone &&
      this._photoFinishEnabled &&
      raceState.finishedCount === 0 &&
      this._diagLeaderProgress >= this._photoFinishLeadProgress
    ) {
      this._photoFinishGateDone = true; // single check — never re-evaluated
      const ord = [...racers].sort((a, b) => b.t - a.t);
      if (
        ord.length >= 2 &&
        shortestArcDeltaT(ord[0].t, ord[1].t) <= this._photoFinishCloseThresholdT
      ) {
        this._photoFinishEnterPending = true; // consumed by _pickNextState to enter PHOTO_FINISH
        photoFinishGateReady = true; // bypass holdGate so the entry is frame-exact
      }
    }
    const photoFinishEndReady =
      this._inPhotoFinish &&
      (raceState.finishedCount >= 2 || raceState.finishedCount >= racers.length);
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
    if (
      !_diagTransitioned &&
      (stateAge >= holdGate ||
        finishDramaExpired ||
        forceFinishDrama ||
        photoFinishGateReady ||
        photoFinishEndReady)
    ) {
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
        case CAM_STATE.PHOTO_FINISH:
          // Track the arc-midpoint T of the top-2 finishers (deterministic, no live group).
          fT = fr.length > 1 ? (fr[0].t + fr[1].t) / 2 : (fr[0]?.t ?? null);
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

    // CAMERA-FOCUS-3 grammar (A) TRUE CUT: on the entry frame, pan AND zoom snap TOGETHER to the new
    // subject's correct framing (min-vis + centering already applied by _setTargets). Frame 1 is right;
    // there is no acquisition glide. Supersedes the LEAD_CHANGE offset-only snap.
    if (this._cutSnapPending) {
      this._cutSnapPending = false;
      this._leadChangeSnapPending = false;
      this.zoom = this.targetZoom;
      this.offsetX = this.targetOffsetX;
      this.offsetY = this.targetOffsetY;
      // Emergency rail — a no-op when the cut lands centered (anchored states); returns early otherwise.
      this._containAnchorInFrame(racers, canvasW, canvasH);
    } else {
      // LEAD_CHANGE hard-cut (legacy grammar): snap offsetX/Y synchronously with the zoom snap so the
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
        // CAMERA-FOCUS-1: the smooth pan lerp above TRAILS the anchor; at a tight LEADER zoom the trail can
        // push the current leader past the inner safe region (proven: ~69% of frames on a sprint). Hold the
        // anchor inside the inner frame as the guarantee — the pan stays glued to whoever leads.
        this._containAnchorInFrame(racers, canvasW, canvasH);
      }
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
    // CAMERA-FOCUS-1: expose the current pan anchor (LEADER-family only) for the dev HUD.
    const _anchor = this._focusAnchorRacer(racers);
    this._anchorRacerIndex = _anchor?.index ?? null;
    this._anchorRacerLabel = _anchor ? (_anchor.name ?? _anchor.id ?? `#${_anchor.index}`) : null;
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
    // Pulk condition: ≥3 of top-10 within battlePulkThresholdT (lap fraction) of each other.
    // Hysteresis is provided by battleMinDurationMs (state stays active once entered).
    const hasBattle = this._isPulk(racers);
    const battleCooledDown = ts - this._lastBattleExitTs >= this._battleCooldownMs;

    // Priority 0 — 15a-predictive photo-finish lifecycle guard. Once entered (either by the
    // pre-line gate below OR the first-crossing fallback), the director OWNS the state until the
    // EVENT-DRIVEN end: the 2nd racer crosses (finishedCount >= 2 — covers 1→2 and 0→2 same-frame),
    // or the logical safety net that ALL racers have finished (finishedCount >= racers.length).
    // There is NO wall-clock cap: under the photo-finish slowmo a wall-time timer expired during
    // the approach BEFORE the winner crossed, ending the shot early and eating the winner text.
    // Hoisted ABOVE the finishedCount>0 block so it also governs a pre-line entry while
    // finishedCount is still 0. Hands off to FINISH_OVERVIEW exactly as the drama does.
    if (this._inPhotoFinish) {
      if (raceState.finishedCount >= 2 || raceState.finishedCount >= racers.length) {
        this._inPhotoFinish = false;
        this._inFinishMode = true;
        this._finishModeStartTs = ts;
        return {
          nextState: CAM_STATE.OVERVIEW,
          reason: 'photo-finish: end (2nd crossing / all finished) → FINISH_OVERVIEW',
          data: {},
        };
      }
      return null; // hold the photo-finish shot — no other transition may fire
    }

    // Priority 1: Finish override — drama pulse on first finish, then FINISH_OVERVIEW mode.
    // Reached only when NOT already in a photo-finish (guard above), so the first-crossing
    // photo-finish here is a pure fallback (fires only if the pre-line gate did not enter).
    if (raceState.finishedCount > 0) {
      if (this._inFinishMode) return null; // finishMode is absolute — no further transitions allowed
      if (this._finishMomentExpiry === null) {
        // 15a single decision point: at the first crossing, choose the PHOTO_FINISH group shot
        // when the top-2 finishers cross essentially together, else the classic single-winner
        // drama. Gap measured with the same lap-normalized helper BATTLE uses (shortestArcDeltaT),
        // top-2 only (ordered is already sorted by .t desc). Both paths share the expiry/lock
        // lifecycle below, so neither can re-trigger and both hand off to FINISH_OVERVIEW.
        const closeFinish =
          this._photoFinishEnabled &&
          ordered.length >= 2 &&
          shortestArcDeltaT(ordered[0].t, ordered[1].t) <= this._photoFinishCloseThresholdT;
        if (closeFinish) {
          this._inPhotoFinish = true; // ends on crossings only (hoisted guard) — no wall-clock cap
          return {
            nextState: CAM_STATE.PHOTO_FINISH,
            reason: 'finish: photo-finish (top-2 close)',
            data: {},
          };
        }
        this._finishMomentExpiry = ts + this._finishDramaDurationMs;
        this._inFinishDrama = true;
        return {
          nextState: CAM_STATE.LEADER_ZOOM,
          reason: 'finish: drama pulse on first finish',
          data: {},
        };
      } else if (ts >= this._finishMomentExpiry) {
        this._inFinishDrama = false;
        this._inPhotoFinish = false;
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

    // Priority 1.5 — one-shot pre-line photo-finish ENTRY. The gate decision (latch + top-2
    // closeness) is made once in update() (where the bypass flags live); here we only consume the
    // pending-entry flag so the transition is produced in the normal place. When it does NOT fire,
    // execution falls through to the normal priority chain with no retry and no minStateHold churn.
    if (this._photoFinishEnterPending) {
      this._photoFinishEnterPending = false;
      this._inPhotoFinish = true; // ends on crossings only (hoisted guard) — no wall-clock cap
      return {
        nextState: CAM_STATE.PHOTO_FINISH,
        reason: 'photo-finish: pre-line gate (top-2 close)',
        data: {},
      };
    }

    // Priority 2: Start phase — hold OVERVIEW on the full field for 3s
    if (raceState.raceElapsed < START_PHASE_DURATION) {
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

      // Every pool push is guarded by weight > 0 (BATTLE-WEIGHT-ZERO-1): a 0.00 slider means "never",
      // consistently for every event. (The selector below also filters weight <= 0 as defense in depth.)
      if (hasBattle && battleCooledDown && this._battleWeight > 0) {
        candidates.push({
          state: CAM_STATE.BATTLE_ZOOM,
          weight: this._battleWeight,
          reason: `battle: pulk (arc<=${this._battlePulkThresholdT})`,
        });
      }

      const lcCooledDown = ts - this._lastLeadChangeExitTs >= this._leadChangeCooldownMs;
      if (this._leadChangePending && lcCooledDown && this._leadChangeWeight > 0) {
        candidates.push({
          state: CAM_STATE.LEAD_CHANGE,
          weight: this._leadChangeWeight,
          reason: `lead-change: ${this._prevLeaderName ?? '?'} → ${this._currentLeaderName ?? '?'}`,
        });
      }

      const comebackCooledDown = ts - this._lastComebackExitTs >= this._comebackCooldownMs;
      let _comebackRacer = null;
      const _internalOutcomePhase = leaderProgress > this._outcomePhaseThreshold;
      if (
        (raceState?.isOutcomePhase || _internalOutcomePhase) &&
        comebackCooledDown &&
        this._comebackWeight > 0
      ) {
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

      if (this._isOverviewEligible(ts, raceState) && this._overviewWeight > 0) {
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
            // The SELECTED OVERVIEW sprite scale MULTIPLIES the normalized target size (OVERVIEW-ZOOM-1):
            // spriteScale 1.0 = the L116 count-normalized default (unchanged); 2.5 = racers 2.5× that size.
            // Before this fix the selection was ignored on closed tracks and only a soft ceiling on open
            // (regression from c7fa30a / L116, which decoupled the OVERVIEW zoom from the setting).
            const ovScale = Number.isFinite(this._overviewSpriteScale)
              ? this._overviewSpriteScale
              : 1.0;
            const raw =
              (this._overviewTargetScreenPx * ovScale) / (this._drawnBodyWidthRefPx * divisor);
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
          case CAM_STATE.PHOTO_FINISH:
            // Arc-midpoint T of the top-2 finishers, so the entry pan converges on the pair.
            focusT = ordered.length > 1 ? (ordered[0].t + ordered[1].t) / 2 : (ordered[0]?.t ?? 0);
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

      // CAMERA-FOCUS-3 grammar (A) TRUE CUT: every anchored/active state entry snaps pan AND zoom
      // together to the new subject's correct framing on frame 1 (zero acquisition — kills the
      // half-glide "corner-riding" hybrid). Exempt the finish-mode OVERVIEW zoom-out, a mandatory
      // dramatic glide (STEP 2: respect existing mandatory states). LEAD_CHANGE / normal OVERVIEW
      // already snap; this brings LEADER / BATTLE / COMEBACK / PHOTO_FINISH onto the same grammar.
      if (this._transitionGrammar === 'cut') {
        const finishGlide = nextState === CAM_STATE.OVERVIEW && this._inFinishMode;
        if (!finishGlide) {
          this._lerpPhase = 'tracking'; // skip the entry glide — the cut lands framed on frame 1
          this._cutSnapPending = true;
          // Promote straight to the follow observer so _setTargets tracks the live subject (leader's
          // actual position + forward-framing bias) from frame 1 — not the entry-phase centerline pan.
          // Without this the observer stays 'idle' (entry glide never ran to promote it) and anchored
          // states pan the track centreline forever. Mirrors the LEAD_CHANGE hard-cut path.
          this._observerPhase = 'follow';
        }
      }
    }

    this._prevCommittedState = nextState;
  }

  // Returns the top-N racers by position — the set the camera focuses on.
  _focusRacers(racers) {
    return [...racers].sort((a, b) => b.t - a.t).slice(0, Math.min(TOP_N, racers.length));
  }

  /**
   * CAMERA-FOCUS-1: the single racer the LEADER-family pan is ANCHORED on this frame. Re-evaluated every
   * frame, so a P1 swap moves the anchor to the new leader automatically (the pan then lerps to it smoothly).
   * LEADER_ZOOM / LEAD_CHANGE → the current leader (max t). COMEBACK_ZOOM → the locked comeback racer.
   * BATTLE_ZOOM / OVERVIEW → null (group / whole-field shots have no single anchor — no containment there).
   */
  _focusAnchorRacer(racers) {
    if (!racers || racers.length === 0) return null;
    if (this.state === CAM_STATE.COMEBACK_ZOOM) {
      return (
        this._findByIndex(racers, this._comebackLockedRacerIndex, this._comebackLockedRacer) ??
        this._focusRacers(racers)[Math.min(2, racers.length - 1)] ??
        null
      );
    }
    if (this.state === CAM_STATE.LEADER_ZOOM || this.state === CAM_STATE.LEAD_CHANGE) {
      let leader = racers[0];
      for (const r of racers) if (r.t > leader.t) leader = r;
      return leader;
    }
    return null;
  }

  /**
   * CAMERA-FOCUS-3 leader forward-framing. Shifts a pan target BACKWARD along the leader's motion tangent
   * so the leader lands at screen fraction `_leaderForwardFrac` (> 0.5) along the motion axis — i.e. FORWARD,
   * with the trailing pack filling the rest of the frame (the action is behind the leader). Returns the
   * target unchanged when disabled, when the shape/T is missing, or when the tangent is degenerate.
   *
   * @param {{x:number,y:number}} pos   the un-biased pan target (leader's smoothed world position)
   * @param {number|null} leaderT       the leader's track T
   * @param {number} effZoom            effective world→screen zoom on the X axis for this state
   * @param {number} frameW             canvas width in px
   */
  _applyLeaderForwardBias(pos, leaderT, effZoom, frameW) {
    if (this._leaderForwardFrac == null || leaderT == null || !this._shape || !(effZoom > 0))
      return pos;
    // world distance that maps to (frac − 0.5) of the frame on screen → how far FORWARD the leader sits
    const biasWorld = ((this._leaderForwardFrac - 0.5) * frameW) / effZoom;
    if (!(biasWorld > 0)) return pos;
    const eps = 0.003;
    const tA = this._isOpenTrack ? Math.min(1, leaderT + eps) : (((leaderT + eps) % 1) + 1) % 1;
    const tB = this._isOpenTrack ? Math.max(0, leaderT - eps) : (((leaderT - eps) % 1) + 1) % 1;
    const pA = this._shape.getPosition(tA, 0);
    const pB = this._shape.getPosition(tB, 0);
    if (!pA || !pB) return pos;
    let dx = pA.x - pB.x,
      dy = pA.y - pB.y;
    const len = Math.hypot(dx, dy);
    if (!(len > 0)) return pos;
    dx /= len;
    dy /= len;
    // shift the pan CENTRE backward along motion → the leader appears forward by biasWorld
    return { x: pos.x - dx * biasWorld, y: pos.y - dy * biasWorld };
  }

  /**
   * CAMERA-FOCUS-1 containment clamp — the hard guarantee that the anchor racer never leaves the inner safe
   * region of the frame (mirror of the min-visible ZOOM floor, but for PAN). Applied after the per-frame pan
   * lerp in LEADER-family states: the smooth lerp trails the anchor for feel, and this shifts the offset just
   * enough to hold the anchor inside [margin, canvas − margin] (margin = (1 − innerFramePct)/2 × canvas) when
   * the trailing lag would otherwise push it past that boundary. Only corrects when needed, so a centered
   * anchor is untouched. Mutates this.offsetX/Y in place.
   */
  _containAnchorInFrame(racers, canvasW, canvasH) {
    const anchor = this._focusAnchorRacer(racers);
    if (!anchor) return;
    const effZoom = this._isOpenTrack ? this.zoom * OPEN_TRACK_BASE_ZOOM : this.zoom * this._bsX;
    if (!(effZoom > 0)) return;
    const innerFrac = this._innerFramePct ?? DEFAULT_INNER_FRAME_PCT;
    const mx = ((1 - innerFrac) / 2) * canvasW;
    const my = ((1 - innerFrac) / 2) * canvasH;
    const sx = anchor.x * effZoom + this.offsetX;
    let active = false,
      ax = false,
      ay = false;
    if (sx < mx) {
      this.offsetX += mx - sx;
      active = true;
      ax = true;
    } else if (sx > canvasW - mx) {
      this.offsetX -= sx - (canvasW - mx);
      active = true;
      ax = true;
    }
    const sy = anchor.y * effZoom + this.offsetY;
    if (sy < my) {
      this.offsetY += my - sy;
      active = true;
      ay = true;
    } else if (sy > canvasH - my) {
      this.offsetY -= sy - (canvasH - my);
      active = true;
      ay = true;
    }
    // CAMERA-FOCUS-3 diagnostic: count frames where the emergency rail actually corrected the pan.
    // With grammar (A) cut + centered steady-state tracking this should be ~0 (the rail is a safety net).
    if (active) this._clampActiveCount = (this._clampActiveCount ?? 0) + 1;
    if (ax) this._clampActiveX = (this._clampActiveX ?? 0) + 1;
    if (ay) this._clampActiveY = (this._clampActiveY ?? 0) + 1;
  }

  /** CAMERA-FOCUS-3: frames on which the containment clamp actually moved the pan (emergency-rail use). */
  get clampActiveCount() {
    return this._clampActiveCount ?? 0;
  }

  /** CAMERA-FOCUS-3: per-axis clamp activations (diagnostic). */
  get clampActiveAxes() {
    return { x: this._clampActiveX ?? 0, y: this._clampActiveY ?? 0 };
  }

  /** CAMERA-FOCUS-4 LIVE TRUTH: the RESOLVED transition grammar this director is running ('cut'|'legacy'). */
  get transitionGrammar() {
    return this._transitionGrammar;
  }

  /** CAMERA-FOCUS-4 LIVE TRUTH: the current observer phase ('idle'|'lead-in'|'follow'). */
  get observerPhase() {
    return this._observerPhase;
  }

  /** CAMERA-FOCUS-4 LIVE TRUTH: resolved leader forward-framing fraction (null when centred). */
  get leaderForwardFrac() {
    return this._leaderForwardFrac;
  }

  /**
   * Finds the first group of ≥3 racers that simultaneously satisfy all BATTLE conditions:
   *   1. Closeness  — all pairwise lap-normalized arc distances shortestArcDeltaT ≤ battlePulkThresholdT
   *                   (scale-independent; replaced the world-px test in 15b)
   *   2. Isolation  — no non-member within battleIsolationThresholdT (lap fraction) of any member
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
    // 15b: closeness is the lap-normalized arc distance only (scale-independent — one knob
    // means the same on-track closeness on every track, unlike world-px which varied 1.5–4.9%
    // of a lap across the 3072–6144px worlds and rejected every real cluster).
    const tThr = this._battlePulkThresholdT;
    const isoThrT = this._battleIsolationThresholdT;
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
          // Closeness condition — lap-normalized shortest arc (raw t accumulates across laps;
          // co-located racers across the start/finish seam must read as near). Sole spatial gate.
          if (
            shortestArcDeltaT(ri.t, rj.t) > tThr ||
            shortestArcDeltaT(ri.t, rk.t) > tThr ||
            shortestArcDeltaT(rj.t, rk.t) > tThr
          )
            continue;
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
              if (shortestArcDeltaT(gm.t, re.t) > tThr) {
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
          // Q1: isolation check (arc) — reject when any non-member is within isoThrT (lap
          // fraction) of any member. Skip when threshold is 0 (disabled).
          if (isoThrT > 0) {
            let isolated = true;
            outer: for (let o = 0; o < n; o++) {
              if (groupSet.has(o)) continue;
              const ro = sorted[o];
              for (const gm of group) {
                if (shortestArcDeltaT(gm.t, ro.t) < isoThrT) {
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
   * Q3 exit condition: returns true while the original locked battle group is still cohesive
   * (all pairwise arc distances <= battlePulkThresholdT — 15b: same scale-independent measure
   * as entry, so BATTLE enters AND exits on arc, no world-px). Returns true for empty groups so
   * tests that set state directly never get spurious early exits.
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
    const tThr = this._battlePulkThresholdT;
    for (let a = 0; a < group.length; a++) {
      for (let b = a + 1; b < group.length; b++) {
        const ra = group[a],
          rb = group[b];
        if (shortestArcDeltaT(ra.t, rb.t) > tThr) return false;
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

  /**
   * Largest cam.zoom at which at least `visTarget` non-finished racers stay on canvas when the camera is
   * centered on (fx, fy). Focus-centered geometry: a racer at world offset (dx, dy) from the focus is on
   * canvas iff `zoom·divisor·|dx| < canvasW/2` and `zoom·divisor·|dy| < canvasH/2`, so its per-racer max
   * cam.zoom is `min(halfW/(|dx|·divisor), halfH/(|dy|·divisor))`; the `visTarget`-th largest of those is the
   * zoom below which ≥ visTarget racers are visible. Returns Infinity (no constraint) when fewer active
   * racers than visTarget exist — the small-field guard — or when visTarget ≤ 0. This is a close
   * approximation (ignores world-edge clamp + inner-frame inset) that keeps the leader roughly centered;
   * it is used only as a zoom-OUT floor, never to zoom in past the profile.
   */
  _zoomFloorForMinVisible(racers, fx, fy, visTarget, divisor, canvasW, canvasH) {
    if (!racers || visTarget <= 0 || divisor <= 0) return Infinity;
    const halfW = canvasW / 2;
    const halfH = canvasH / 2;
    const maxZooms = [];
    for (const r of racers) {
      if (r.finished) continue;
      const dx = Math.abs(r.x - fx) * divisor;
      const dy = Math.abs(r.y - fy) * divisor;
      const zx = dx > 1e-6 ? halfW / dx : Infinity;
      const zy = dy > 1e-6 ? halfH / dy : Infinity;
      maxZooms.push(Math.min(zx, zy));
    }
    if (maxZooms.length < visTarget) return Infinity; // fewer active than target → no constraint
    maxZooms.sort((a, b) => b - a);
    return maxZooms[visTarget - 1];
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
        const leaderT = focusRacers[0]?.t ?? null;
        if (this._isOpenTrack) {
          let panTarget;
          if (this._camT !== null && this._shape && this._observerPhase !== 'follow') {
            panTarget = this._shape.getPosition(Math.max(0, Math.min(1, this._camT)), 0);
          } else {
            const raw = getPanTarget(CAM_STATE.LEADER_ZOOM, focusRacers, this._shape);
            panTarget = this._smoothFocal(raw.x, raw.y);
          }
          // CAMERA-FOCUS-3 forward-framing: shift the pan target backward along the leader's motion so
          // the leader sits FORWARD in frame with the pack behind him (only in the steady follow phase).
          if (panTarget && this._observerPhase === 'follow') {
            panTarget = this._applyLeaderForwardBias(
              panTarget,
              leaderT,
              this._leaderZoom * OPEN_TRACK_BASE_ZOOM,
              canvasW
            );
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
          if (panTarget && this._observerPhase === 'follow') {
            panTarget = this._applyLeaderForwardBias(
              panTarget,
              leaderT,
              this._leaderZoom * this._bsX,
              canvasW
            );
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

      case CAM_STATE.PHOTO_FINISH: {
        // 15a: tight top-2 group shot. Reuses BATTLE's fixed group zoom and the arc-midpoint pan
        // primitive, but on the DETERMINISTIC top-2 focus racers (getPanTarget of focusRacers[0..1])
        // — NOT the live battle-group detection. _camT (top-2 midpoint T, set on entry/tracking)
        // pans along the racing line; falls back to the arc-midpoint when _camT is unset.
        this.targetZoom = this._battleZoom;
        const pfFallback = getPanTarget(CAM_STATE.BATTLE_ZOOM, focusRacers, this._shape);
        if (this._isOpenTrack) {
          const panTarget =
            this._camT !== null && this._shape && this._observerPhase !== 'follow'
              ? this._shape.getPosition(Math.max(0, Math.min(1, this._camT)), 0)
              : pfFallback;
          if (panTarget) this._setOpenTrackTargets(panTarget, this._battleZoom, frameSize);
        } else {
          const panTarget =
            this._camT !== null && this._shape && this._observerPhase !== 'follow'
              ? this._shape.getPosition(((this._camT % 1) + 1) % 1, 0)
              : pfFallback;
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

    // Min-visible zoom floor (LEADER-MINVIS-1): in LEADER_ZOOM / LEAD_CHANGE the camera may zoom to the
    // profile value BUT is clamped so it never zooms TIGHTER than the zoom that keeps min(minRacersVisible,
    // active field) racers on canvas around the pan focus. This floor is computed DIRECTLY each frame from
    // the racers' geometry (self-consistent — no dependence on the lagging live zoom/offset), so the rule
    // holds instantly and survives state transitions. It replaces the old slow per-frame ratchet, which
    // first zoomed all the way in to the tight profile (dropping to ~1 visible on a strung field) and only
    // crawled back out over several seconds at zoomOutStepPerFrame, restarting on every transition — so in a
    // live race the LEADER view sat at the tight zoom showing too few racers. minRacersVisible = 0 disables
    // the feature (byte-compatible with the pre-feature world). The visual change is still smoothed by the
    // normal zoom lerp (this.zoom → targetZoom).
    if (
      this._minRacersVisible > 0 &&
      (this.state === CAM_STATE.LEADER_ZOOM || this.state === CAM_STATE.LEAD_CHANGE)
    ) {
      const activeCount = racers ? racers.reduce((n, r) => n + (r.finished ? 0 : 1), 0) : 0;
      const visTarget = Math.min(this._minRacersVisible, activeCount);
      const focus = getPanTarget(CAM_STATE.LEADER_ZOOM, focusRacers, this._shape);
      // World-size-independent hard floor: leaderMinZoomFraction × leaderZoom bounds how far out the camera
      // may go (identical visual scale on every world). On closed tracks cam.zoom must also stay >= 1.0:
      // below that, _setClosedTrackTargets computes the pan offset at minEffZoom = bsX but rendering uses the
      // lower effZoom, squeezing the world into the top-left corner (the black-screen bug).
      const fractionFloor = this._leaderMinZoomFraction * this._leaderZoom;
      const effectiveFloor = this._isOpenTrack
        ? Math.max(this._leaderMinZoom, fractionFloor)
        : Math.max(1.0, fractionFloor);
      if (visTarget > 0 && focus) {
        const divisor = this._isOpenTrack ? OPEN_TRACK_BASE_ZOOM : this._bsX;
        const minVisZoom = this._zoomFloorForMinVisible(
          racers,
          focus.x,
          focus.y,
          visTarget,
          divisor,
          canvasW,
          canvasH
        );
        // Never tighter than min-visible; never looser than the hard floor.
        const rawFloor = Math.max(effectiveFloor, Math.min(this.targetZoom, minVisZoom));
        // CAMERA-JITTER-1: the raw floor is recomputed from the visTarget-th nearest racer, which flips
        // frame-to-frame in the dense COMBO15 field — feeding it to targetZoom raw makes the zoom (and the
        // coupled pan) swim. Smooth it ASYMMETRICALLY: LOOSEN (zoom out, lower floor) immediately so a racer
        // is never cropped, but TIGHTEN (zoom in, raise floor) only slowly (≤ zoomOutStepPerFrame per frame,
        // dt-scaled) so a transient flip can never snap the camera inward. The result pins to the loosest
        // recent value and creeps in gently, giving the zoom lerp a STABLE target. First frame of the phase
        // (floor === null after a state transition) snaps to the raw value — correct framing on entry.
        if (this._leaderPhaseZoomFloor === null || rawFloor <= this._leaderPhaseZoomFloor) {
          this._leaderPhaseZoomFloor = rawFloor;
        } else {
          const dtScale = (this._lastDt * FRAME_RATE) / 1000;
          this._leaderPhaseZoomFloor = Math.min(
            rawFloor,
            this._leaderPhaseZoomFloor + this._zoomOutStepPerFrame * dtScale
          );
        }
        this.targetZoom = Math.min(this.targetZoom, this._leaderPhaseZoomFloor);
      }
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

  /** CAMERA-FOCUS-1: index of the racer the LEADER-family pan is anchored on this frame (null otherwise). */
  get anchorRacerIndex() {
    return this._anchorRacerIndex ?? null;
  }

  /** CAMERA-FOCUS-1: display label of the current pan anchor racer (name/id/#index) for the dev HUD. */
  get anchorRacerLabel() {
    return this._anchorRacerLabel ?? null;
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
