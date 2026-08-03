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
import { mulberry32 } from '../racePlanner.js';
import { shortestArcDeltaT } from '../../utils/mathUtils.js';
import { computeTimingFromConfig, BATTLE_PULK_THRESHOLD_T } from './cameraTimingComputation.js';
import {
  projectionForTrack,
  OPEN_TRACK_BASE_ZOOM as _PROJ_OPEN_BASE,
  REFERENCE_CANVAS_W,
  REFERENCE_CANVAS_H,
} from './projection.js';
import {
  resolveZoomForCorridors,
  referenceWidthFor,
  corridorsForCamZoom,
  visibleWorldPx,
} from './zoomUnit.js';
import { frameExtentAlong, roomFromPointAlong } from './frameGeometry.js';
import {
  framingFor,
  GUARANTEE,
  POSITION,
  corridorGuarantee,
  pairGuarantee,
  companyGuarantee,
  COMPANY_FRAME_PCT,
  anchorScreenPoint,
  lateralShiftToFit,
} from './framingRule.js';

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

// Base zoom multiplier for open tracks. CAMERA-PROJECTION-1: the single definition now lives in
// projection.js (it is a property of the world→screen mapping, not of the director); re-exported
// here so RaceScreen and the diagnostics HUD keep their existing import path.
export const OPEN_TRACK_BASE_ZOOM = _PROJ_OPEN_BASE;

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
// CAMERA-HYGIENE-1: the reference canvas has ONE home, projection.js. It was declared independently
// here, in zoomUnit.js and in two drawing modules — four constants that must agree and nothing
// making them.
const CANVAS_W = REFERENCE_CANVAS_W;
const CANVAS_H_REF = REFERENCE_CANVAS_H;
const TOP_N = 3; // camera focuses on the top-N racers by position
// CAMERA-REFERENCE-WIDTH-1 fallbacks, in STANDARD CORRIDORS across the frame, used when no config
// (or no cameraStateProfiles) is provided. They match DEFAULT_CAMERA_CONFIG so a bare-config
// director and a configured one frame the same shot. OVERVIEW is the widest; BATTLE/COMEBACK are
// tighter than LEADER; PHOTO_FINISH is the tightest. At the shipped 300 px reference LEADER is
// 225 world px — the picture the owner judged good on Searound.
const DEFAULT_CORRIDORS = {
  overview: 1.5,
  leader: 0.75,
  leadChange: 0.75,
  battle: 0.55,
  comeback: 0.55,
  photoFinish: 0.4,
};
/** CAMERA-REFERENCE-WIDTH-1: world px per standard corridor when no config reaches the director. */
const DEFAULT_REFERENCE_CORRIDOR_PX = 300;
/** CAMERA-COMPANY-1 default: the anchor plus this many−1 others must stay in frame. */
const DEFAULT_MIN_RACERS_VISIBLE = 3;
/** Fallback corridor width (world px) when no track width and no shape reach the director. */
const FALLBACK_TRACK_WIDTH_PX = 140;
// World-pixel radial offset: camera shifts toward field so leader sits at the outer viewport edge.
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
   *   warning is emitted and a fallback body size is used instead.
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
    shape = null,
    trackWidthPx = 0
  ) {
    // CAMERA-PROJECTION-1: the ONE world↔screen mapping. Every zoom formula, guardrail and
    // diagnostic in this file goes through it — nothing re-derives `x * zoom * scale + offset`.
    // This is also the single surviving open/closed decision in the SCALE path: the ~28 branches
    // it replaced are listed in reports/evolution/CAMERA-PROJECTION-1.md. `_isOpenTrack` survives
    // only for the 13 genuine TOPOLOGY questions (does the track parameter wrap?).
    this._proj = projectionForTrack(worldW, worldH, isOpenTrack);
    this._isOpenTrack = isOpenTrack;
    this._shape = shape;
    this._worldW = worldW;
    this._worldBounds = { minX: 0, minY: 0, maxX: worldW, maxY: worldH };
    // The WORLD-FIT scales (canvas ÷ world). These keep their historical meaning and are NOT the
    // same thing as the projection's axis scales: on a closed track they coincide, on an open track
    // the projection maps at a uniform OPEN_TRACK_BASE_ZOOM instead. Read by the dev HUD and tests.
    this._bsX = CANVAS_W / worldW;
    this._bsY = CANVAS_H_REF / worldH;
    this._drawnBodyWidthRefPx = drawnBodyWidthRefPx;
    // CAMERA-ZOOM-UNIT-1: the corridor width every zoom setting is expressed in. Passed by
    // RaceScreen (geometry.width, the same number the physics uses); derived from the shape when a
    // caller does not supply it; a constant only when there is neither, so a bare `new
    // CameraDirector()` still produces a sane picture instead of NaN.
    this._trackWidthPx =
      trackWidthPx > 0
        ? trackWidthPx
        : (shape?.getActualTrackWidth?.() ?? 0) > 0
          ? shape.getActualTrackWidth()
          : FALLBACK_TRACK_WIDTH_PX;
    // The loosest cam.zoom this projection allows. Historically written as
    // `isOpen ? CANVAS_W/worldW : 1.0` at five separate sites; now one value.
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
    // CAMERA-GRAMMAR-1 grammar (B) glide: start-of-transition framing captured on entry; pan+zoom ease
    // from here to the moving target over glideDurationMs.
    this._glideStartTs = null;
    this._glideStartZoom = null;
    this._glideStartOffsetX = null;
    this._glideStartOffsetY = null;
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
    // Focal-position EMA state: smoothed world-space pan target for LEADER_ZOOM and COMEBACK_ZOOM
    // follow phases. Null = uninitialized (snaps to raw on first follow-phase call).
    // Reset to null on every non-repeat state transition so cuts stay crisp.
    this._smoothedFocalX = null;
    this._smoothedFocalY = null;
    // Normalized OVERVIEW snap zoom — computed from _drawnBodyWidthRefPx at each OVERVIEW entry.
    // Null until first non-repeat OVERVIEW transition on open tracks with drawnBodyWidthRefPx>0.
    // _setTargets reads this; falls back to _overviewStateZoom when null.
    this._overviewSnapZoom = null;
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
    // CAMERA-DETOUR-1: per-transition frame log (read-only; gated by config.cameraDetourLog).
    // Captures 3 frames BEFORE each view change and the first ~30 after, to locate where the
    // camera's wrong-direction move begins. Writes ONLY to these _detour* fields — never a camera value.
    this._detourPreBuf = []; // rolling last-3 pre-transition frame snapshots
    this._detourWindow = null; // active capture window { from, to, preoX/Y, prez, frames[], remaining }
    this._detourLog = []; // completed windows (for export/inspection)
    this._detourPrevState = null; // previous frame's state → the transition's from-state
    this._detourContainActive = false; // did _containAnchorInFrame move offset this frame (candidate C)
    this._detourContainDeltaX = 0;
    this._detourContainDeltaY = 0;
    this._detourSetTargetsZoom = null; // the zoom _setTargets used this frame (candidate D)
    // CAMERA-DETOUR-2 follow-up: separate the anchor's world motion from the camera's.
    this._detourBranch = null; // which branch wrote offsetX/offsetY this frame: 'glide' | 'cut' | 'follow'
    this._detourGlideS = null; // glide progress s (linear) this frame, if the glide branch ran
    this._detourGlideE = null; // eased glide factor e this frame, if the glide branch ran
    // prevFocusT as it was at the START of the current frame (before overwrite).
    this._diagPrevFocusT = null;
    // Set to 'threshold'|'timeout' on the frame where entry→tracking fires; null all other frames.
    this._diagConvergenceReason = null;
    // CAMERA-REPRO-1: the director's OWN randomness (state pick + OVERVIEW schedule jitter). null
    // means "call Math.random at the draw site", which is literally what the two sites did before —
    // including following a later global swap, which storing the function reference here would not.
    // setRandomSeed() puts a seeded stream in its place so a marked moment can be replayed; without
    // one, a perfect physics replay still diverges the moment the director rolls a die.
    this._rng = null;
    this._randomSeed = 0;
  }

  /** The director's next random draw: its own seeded stream, or the global generator. */
  _random() {
    return this._rng ? this._rng() : Math.random();
  }

  /**
   * CAMERA-REPRO-1: make the director's own random draws reproducible.
   *
   * Call ONCE, right after construction and before the first update(). RaceScreen draws a fresh
   * seed per race from Math.random, so every race is still as random as it ever was — but the
   * drawn seed travels in the marker, which is what makes a marked moment reproducible at all.
   *
   * @param {number} seed  Positive integer. 0 (or a non-finite value) restores Math.random.
   */
  setRandomSeed(seed) {
    const s = Number.isFinite(seed) ? seed >>> 0 : 0;
    this._randomSeed = s;
    this._rng = s > 0 ? mulberry32(s) : null;
  }

  /** The seed passed to setRandomSeed(), or 0 when the director runs on Math.random. */
  get randomSeed() {
    return this._randomSeed;
  }

  /**
   * Recompute zoom levels from a new config. Effective on the next _transition() call —
   * no race restart needed (live-apply).
   * @param {object|null} config
   */
  updateConfig(config) {
    this._computeZoomLevels(config);
    this._computeTimingConfig(config);
    // Invalidate the stored snap so a changed OVERVIEW setting takes effect on the next cut.
    this._overviewSnapZoom = null;
  }

  /**
   * CAMERA-REFERENCE-WIDTH-1: THE zoom rule. One function, every state.
   *
   * `corridors` is how much world is visible across the frame, in STANDARD corridors — a fixed
   * reference width, not this track's own. The unit and the projection's physical range live in
   * zoomUnit.js; this is the director's single call into it, so there is exactly one place where a
   * setting becomes a cam.zoom. No guarantee is applied here: the corridor, pair and company
   * guarantees are combined once, in `_setTargets`, with Math.min.
   *
   * @param {number} corridors
   * @param {number} [fallback]  used when the setting is missing or corrupt
   * @returns {number} cam.zoom
   */
  _computeZoomForCorridors(corridors, fallback = DEFAULT_CORRIDORS.leader) {
    return resolveZoomForCorridors(corridors, {
      referenceWidthPx: this._referenceWidthPx,
      axisY: this._proj.axisY,
      clampCamZoom: (z) => this._proj.clampCamZoom(z),
      fallbackCorridors: fallback,
    });
  }

  /** Diagnostics/tests: how many standard corridors the camera is actually showing right now. */
  get visibleCorridors() {
    return corridorsForCamZoom(this.zoom, this._referenceWidthPx, this._proj.axisY);
  }

  /**
   * Diagnostics/tests: how much WORLD is in shot right now, in world px across the short axis.
   * The falsifiable form of the same reading — a marker records world px, not corridors.
   */
  get visibleWorldPx() {
    return visibleWorldPx(this.zoom, this._proj.axisY);
  }

  /**
   * Derive every state's cam.zoom from its TRACK-WIDTHS setting (CAMERA-ZOOM-UNIT-1).
   *
   * All five states run the SAME rule now — OVERVIEW is not a different kind of shot, it is this
   * shot at the widest setting. The three things that used to make them incommensurable are gone:
   * the absolute `spriteScale` screen-scale, OVERVIEW's target-SPRITE-SIZE derivation, and the
   * `2 x W_ref / racersPerRow` racer-count division that came with it.
   *
   * Legacy configs (v2/v3 `spritePctOfCanvas`, or a v17 config that reached a director without
   * migration) have no track-width numbers to read. They get the shipped defaults rather than a
   * converted value: the owner chose clean round numbers over reproducing the old picture, so a
   * conversion would be work in service of a result nobody wants.
   *
   * @param {object|null} config
   */
  _computeZoomLevels(config) {
    const profiles = config?.cameraStateProfiles;
    // CAMERA-REFERENCE-WIDTH-1: the standard corridor, and the max() that keeps a track WIDER than
    // the reference framed by its own width, so the setting can never ask to crop its corridor.
    const refCfg = config?.referenceCorridorPx;
    this._referenceCorridorPx =
      Number.isFinite(refCfg) && refCfg > 0 ? refCfg : DEFAULT_REFERENCE_CORRIDOR_PX;
    this._referenceWidthPx = referenceWidthFor(this._referenceCorridorPx, this._trackWidthPx);
    const widthOf = (state, fallback) => {
      const v = profiles?.[state]?.visibleCorridors;
      return Number.isFinite(v) && v > 0 ? v : fallback;
    };
    this._overviewCorridors = widthOf('OVERVIEW', DEFAULT_CORRIDORS.overview);
    this._leaderZoom = this._computeZoomForCorridors(
      widthOf('LEADER_ZOOM', DEFAULT_CORRIDORS.leader)
    );
    this._leadChangeZoom = this._computeZoomForCorridors(
      widthOf('LEAD_CHANGE', DEFAULT_CORRIDORS.leadChange)
    );
    this._battleZoom = this._computeZoomForCorridors(
      widthOf('BATTLE_ZOOM', DEFAULT_CORRIDORS.battle)
    );
    this._comebackZoom = this._computeZoomForCorridors(
      widthOf('COMEBACK_ZOOM', DEFAULT_CORRIDORS.comeback)
    );
    // CAMERA-FRAMING-1: PHOTO_FINISH gets its OWN setting. It borrowed BATTLE's number, so the most
    // dramatic shot in the race was never any closer than an ordinary battle. The fallback is
    // BATTLE's value, so a config written before this key existed frames exactly as it used to.
    this._photoFinishZoom = this._computeZoomForCorridors(
      widthOf('PHOTO_FINISH', DEFAULT_CORRIDORS.photoFinish)
    );
    // OVERVIEW is the same rule at the widest setting — no sprite size, no racer count.
    this._overviewStateZoom = this._computeZoomForCorridors(
      this._overviewCorridors,
      DEFAULT_CORRIDORS.overview
    );
    this._innerFramePct = config?.targetInnerFramePct ?? DEFAULT_INNER_FRAME_PCT;
    // CAMERA-COMPANY-1: how many racers must be in frame, INCLUDING the anchor. <= 1 disables the
    // dramaturgical guarantee entirely (the geometric ones are unaffected).
    this._minRacersVisible = config?.minRacersVisible ?? DEFAULT_MIN_RACERS_VISIBLE;
    // CAMERA-FOCUS-3 transition grammar. 'cut' (grammar A) = every anchored/active state entry snaps
    // pan AND zoom together to the new subject's correct framing on frame 1 (zero acquisition — the
    // half-glide "corner-riding" hybrid is dead). 'legacy' = the pre-FOCUS-3 entry glide. The shipped
    // DEFAULT_CAMERA_CONFIG selects 'cut'; the code fallback stays 'legacy' so bare-config callers and
    // the existing entry-glide tests keep their behaviour. The FOCUS-2 fallback grammar (B) FULL GLIDE
    // is named in the report, not wired here.
    // CAMERA-GRAMMAR-1 transition grammar (entry STYLE only): 'glide' (shipped) eases pan+zoom together;
    // 'cut' snaps them; 'legacy' is the bare-caller follow-lerp fallback. Unknown/absent → 'legacy'.
    const _g = config?.cameraTransitionGrammar;
    this._transitionGrammar = _g === 'cut' ? 'cut' : _g === 'glide' ? 'glide' : 'legacy';
    // Glide entry duration (ms) — one bounded ease for pan AND zoom. Validated to [300, 900]; default 500.
    const _gd = config?.glideDurationMs;
    this._glideDurationMs = Number.isFinite(_gd) && _gd >= 300 && _gd <= 900 ? _gd : 500;
    // CAMERA-FOCUS-3 leader forward-framing fraction (owner's "pack behind, leader forward"). Valid only
    // in (0.5, 0.8]; anything else (incl. absent) → dead-centre, the legacy framing.
    const lff = config?.leaderForwardFrac;
    this._leaderForwardFrac = Number.isFinite(lff) && lff > 0.5 && lff <= 0.8 ? lff : null;
    // Countdown start zoom: convert spritePx → spriteScale, typically clamped to overviewZoom.
    // CAMERA-REFERENCE-WIDTH-1: the countdown opens on the same unit. `countdownStartCorridors` is a
    // wide establishing shot that eases into OVERVIEW; it is clamped by the projection like every
    // other setting, so on a small world it simply means "the whole world".
    this._countdownStartZoom = this._computeZoomForCorridors(
      config?.countdownStartCorridors,
      DEFAULT_CORRIDORS.overview * 2
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
    this._detourEnabled = t.detourEnabled; // CAMERA-DETOUR-1 per-transition frame log (read-only)
    this._transitionTConvergence = t.transitionTConvergence;
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
    this._focalSmoothTc = config?.focalSmoothTc ?? 0.05;
    // Pre-compute per-60fps EMA base factor from TC. 0 when TC=0 (disabled).
    // alpha per frame = 1 − (1−base)^(dt×60/1000) — same dt-normalisation as the zoom lerp.
    this._focalSmoothBase =
      this._focalSmoothTc > 0 ? 1 - Math.pow(0.1, 1 / (this._focalSmoothTc * FRAME_RATE)) : 0;
  }

  // ── Director helpers ──────────────────────────────────────────────────────

  /**
   * CAMERA-WEIGHTS-1: THE WEIGHT'S MEANING, stated so the owner can predict what a value buys.
   *
   *   A weight is HOW OFTEN YOU TAKE THIS SHOT WHEN IT IS OFFERED.
   *     0    — never. The state does not appear.
   *     0.7  — when this shot is available, take it about 7 times in 10; otherwise stay on the leader.
   *     1+   — always take it when available, and outrank a lower weight when two shots compete.
   *
   * WHY AN ABSOLUTE PROPENSITY AND NOT A RELATIVE SHARE. A relative share ("battle 70% of the
   * cuts") promises something the camera cannot deliver: eligibility is not under its control, so if
   * a battle never becomes eligible no weight can give it 70% of anything. A propensity only ever
   * promises what the gates already allow, which is why it is predictable.
   *
   * WHY THIS WAS NEEDED. Measured before the change: 73.2% of selections had NO eligible candidate
   * and 16.7% had exactly ONE — and a single candidate was returned outright, without its weight
   * ever being read. So the weights decided 10.0% of selections and ELIGIBILITY decided the other
   * 90%. That is why the dial appeared dead: `overviewWeight` 0.3 -> 10, a 33x increase, moved
   * OVERVIEW's share of the race by 1.8 percentage points.
   *
   * HOW IT COMPOSES WITH THE HOLDS, because both are real and neither may silently win. The holds
   * and cooldowns still decide WHETHER a shot is offered — they are what stops the picture flicking
   * between states, and the weight cannot override them. The weight decides whether an OFFERED shot
   * is taken. A declined offer falls through to LEADER, and the next frame may offer again; the
   * state's own minStateHold then governs how long the accepted shot lasts. Holds gate, weights
   * choose — in that order, deliberately.
   */
  _acceptsOffer(weight) {
    if (!(weight > 0)) return false; // 0 means never, and it is checked here as well as at the gate
    if (weight >= 1) return true;
    return this._random() < weight;
  }

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
    let r = this._random() * total;
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
    const jitter = 0.8 + this._random() * 0.4;
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
    // CAMERA-SIDEJUMP-1: the camera zooms about the WORLD ORIGIN. Capture the zoom before this frame's
    // lerp so the follow path can re-apply the change AROUND the anchor instead (keeping the anchor's
    // screen position fixed across any zoom change — see the root-fix note below).
    const _zoomAtStart = this.zoom;
    if (tSpaceLerpActive) {
      this.zoom += (this.targetZoom - this.zoom) * lf;
    }
    this._lastDt = dt;
    // CAMERA-DETOUR-1 candidate D: capture the zoom _setTargets is about to use (it reads this.zoom for
    // its currEffZoom pan computation) so it can be compared to the zoom the renderer finally draws with.
    if (this._detourEnabled) this._detourSetTargetsZoom = this.zoom;
    this._setTargets(racers, canvasW, canvasH, raceState);

    // CAMERA-GRAMMAR-1 grammar (B) FULL GLIDE: pan AND zoom travel TOGETHER on ONE bounded ease from the
    // captured entry framing to the (moving) target framing over glideDurationMs. Sharing one ease factor
    // means the zoom-about-anchor invariant holds by construction DURING the glide — the anchor is framed
    // consistently every frame (no instant half, no hybrid, no mid-transition lurch). Lands correctly
    // framed at s=1, then hands off to the steady follow path.
    // CAMERA-DETOUR-2: reset the per-frame branch / glide-progress markers before the branches
    // choose one (read-only diagnosis — records WHICH branch wrote offsetX/offsetY this frame).
    if (this._detourEnabled) {
      this._detourBranch = null;
      this._detourGlideS = null;
      this._detourGlideE = null;
    }
    if (this._lerpPhase === 'glide') {
      const dur = this._glideDurationMs;
      const s = dur > 0 ? Math.min(1, Math.max(0, (ts - this._glideStartTs) / dur)) : 1;
      const e = s * s * (3 - 2 * s); // smoothstep ease
      if (this._detourEnabled) {
        this._detourBranch = 'glide';
        this._detourGlideS = s;
        this._detourGlideE = e;
      }
      this.zoom = this._glideStartZoom + (this.targetZoom - this._glideStartZoom) * e;
      this.offsetX = this._glideStartOffsetX + (this.targetOffsetX - this._glideStartOffsetX) * e;
      this.offsetY = this._glideStartOffsetY + (this.targetOffsetY - this._glideStartOffsetY) * e;
      this._leadChangeSnapPending = false;
      // CAMERA-FRAMING-1: the containment clamp used to run here, claiming to be a no-op mid-glide.
      // It was measured ACTIVE on 23 of 23 glide frames with corrections to −390 px — it had become
      // a rail that steered the pan away from the glide it was interpolating. Gone; the glide now
      // lands exactly where it aimed. `clampActiveCount` stays as a diagnostic and is asserted to
      // remain 0 through a glide.
      if (s >= 1) this._lerpPhase = 'tracking'; // glide complete → steady follow
    } else if (this._cutSnapPending) {
      if (this._detourEnabled) this._detourBranch = 'cut';
      this._cutSnapPending = false;
      this._leadChangeSnapPending = false;
      this.zoom = this.targetZoom;
      this.offsetX = this.targetOffsetX;
      this.offsetY = this.targetOffsetY;
    } else {
      if (this._detourEnabled) this._detourBranch = 'follow';
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
        // CAMERA-SIDEJUMP-1 ROOT FIX — zoom about the ANCHOR, not the world origin. Screen position is
        // worldPos·effZoom + offset; when effZoom changes and the offset lerp only creeps toward its new
        // target, the anchor SLIDES across the frame faster than the pan can follow — it lurches to the
        // edge, then the pan slowly recovers (the owner's "wide move, leader not where he should be"). The
        // trigger was a min-vis floor loosen, but the cause is generic to EVERY zoom change. Fixing it here
        // — re-apply this frame's zoom delta around the anchor's world position so its screen position is
        // preserved, THEN let the pan lerp ease it toward the forward-framed target — makes every zoom
        // source (min-vis, future mechanisms) lurch-free without touching any of them.
        const _anchor = this._focusAnchorRacer(racers);
        const _dz = this.zoom - _zoomAtStart;
        if (_anchor && _dz !== 0) {
          this.offsetX -= _anchor.x * this._proj.axisX * _dz;
          this.offsetY -= _anchor.y * this._proj.axisY * _dz;
        }
        this.offsetX += (this.targetOffsetX - this.offsetX) * lf;
        this.offsetY += (this.targetOffsetY - this.offsetY) * lf;
        // CAMERA-FRAMING-1: the containment clamp is gone from here too. It corrected the pan every
        // frame the lerp trailed the anchor, which is a STEER — it moved the centre. Keeping the
        // guaranteed subjects in frame is now the ZOOM guarantee's job (it widens), and the residual
        // trail is the tracking lag, which is measured and reported rather than papered over.
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
    if (this._detourEnabled) this._recordDetourFrame(tSpaceLerpActive, _diagTransitioned, racers);
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
      // CAMERA-WEIGHTS-1: the endgame exception used to bypass the weight completely, so a
      // leadChangeWeight of 0 still produced LEAD_CHANGE near the line — measured at 1.8% of all
      // frames with the dial at zero. A weight of 0 means the state does not appear, everywhere.
      if (this._leadChangePending && lcCooledDown && this._acceptsOffer(this._leadChangeWeight)) {
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
      // THE OFFER. Eligibility and the cooldowns have decided that this shot MAY be taken; the weight
      // decides whether it IS. Declining falls through to the leader default below, which is the
      // honest neutral — not a second pick, which would make a low weight boost whatever came next.
      if (pick && !this._acceptsOffer(pick.weight)) {
        return {
          nextState: CAM_STATE.LEADER_ZOOM,
          reason: `leader: ${pick.state} offered and declined (weight ${pick.weight})`,
          data: {},
        };
      }
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
    // CAMERA-GRAMMAR-1: the PRE-transition framing, captured before the commit block's OVERVIEW/LEAD_CHANGE
    // hard zoom-snaps. Grammar 'glide' eases from THIS (not the snapped value) to the target so the glide
    // smooths pan AND zoom together — never a snapped-zoom-plus-gliding-pan hybrid.
    const _preZoom = this.zoom;
    const _preOffsetX = this.offsetX;
    const _preOffsetY = this.offsetY;

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
          // CAMERA-ZOOM-UNIT-1: OVERVIEW snaps to its TRACK-WIDTHS setting, the same rule the other
          // four states run. What stood here before derived the zoom from a target sprite size
          // divided by `2 x W_ref / racersPerRow`, which made the widest shot in the camera depend
          // on how many racers were in the race — non-monotonically. There is no sprite size and no
          // racer count in this path any more.
          const snapZoom = this._overviewStateZoom;
          this._overviewSnapZoom = snapZoom; // stored so _setTargets uses the same zoom
          this.zoom = snapZoom;
          this.targetZoom = snapZoom;
        } else {
          // finishMode smooth zoom-out: derive TC from configured duration (90% convergence ≈ 3.45×TC).
          const tc = Math.max(0.1, this._finishOverviewZoomOutDurationMs / 3450);
          this._lfEntryByState[CAM_STATE.OVERVIEW] = tcToLerpFactor(tc);
        }
      }

      // Reset per-phase zoom-out floor on every state transition.
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
        const lookbackT = this._finishLookbackT(raceState.finishT);
        if (lookbackT !== null) this._transitionTargetT = lookbackT;
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

      // CAMERA-GRAMMAR-1: the grammar picks the ENTRY STYLE only — correctness (follow tracking, per-axis
      // screen mapping, zoom-about-anchor) is decoupled from it. Both SHIPPED grammars promote the observer
      // to 'follow' on entry so _setTargets frames the live subject (forward-framed anchor), never the
      // entry-phase centreline pan:
      //   'glide' (default) — pan AND zoom travel TOGETHER on one bounded ease (glideDurationMs) to the
      //                       subject's correct framing. Smooth; no instant half, no hybrid.
      //   'cut'             — pan AND zoom snap to that framing on frame 1 (crisp, zero acquisition).
      // 'legacy' is the bare-caller fallback and is left on the pre-existing entry-glide path (still used by
      // finish-mode OVERVIEW). The finish-mode OVERVIEW zoom-out stays a mandatory dramatic glide, exempt.
      const finishGlide = nextState === CAM_STATE.OVERVIEW && this._inFinishMode;
      if (!finishGlide && this._transitionGrammar !== 'legacy') {
        this._observerPhase = 'follow';
        if (this._transitionGrammar === 'cut') {
          this._lerpPhase = 'tracking';
          this._cutSnapPending = true;
        } else {
          // 'glide' — ease from the PRE-transition framing (before any OVERVIEW/LEAD_CHANGE zoom snap).
          this._lerpPhase = 'glide';
          this._glideStartTs = ts;
          this._glideStartZoom = _preZoom;
          this._glideStartOffsetX = _preOffsetX;
          this._glideStartOffsetY = _preOffsetY;
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
   * CAMERA-FRAMING-1: the track tangent at a track parameter, in world space. One definition, used
   * by the forward bias (which direction is "ahead") and by the corridor guarantee (which direction
   * is "across"). Returns null when there is no shape or the tangent is degenerate.
   * @param {number|null} t
   */
  _headingAt(t) {
    if (t == null || !this._shape) return null;
    const eps = 0.003;
    const tA = this._isOpenTrack ? Math.min(1, t + eps) : (((t + eps) % 1) + 1) % 1;
    const tB = this._isOpenTrack ? Math.max(0, t - eps) : (((t - eps) % 1) + 1) % 1;
    const pA = this._shape.getPosition(tA, 0);
    const pB = this._shape.getPosition(tB, 0);
    if (!pA || !pB) return null;
    const dx = pA.x - pB.x;
    const dy = pA.y - pB.y;
    return Math.hypot(dx, dy) > 0 ? { x: dx, y: dy } : null;
  }

  /**
   * CAMERA-LATERAL-1: THE ACROSS-TRACK PIN. The corridor centreline at a track parameter.
   *
   * ==========================================================================================
   * READ THIS BEFORE "FIXING" IT. This looks like the camera saga's original defect —
   * CAMERA-FOCUS-3, where the camera tracked the track centreline for months because the follow
   * observer was never switched on. It is NOT the same thing, and the difference is the design:
   *
   *   THAT bug pinned BOTH axes, and it was an ACCIDENT.
   *   THIS pins ONLY the cross-track axis, and it is DELIBERATE.
   *
   * Along the track the camera follows the subject exactly as before, forward offset and all —
   * `_smoothFocal`, `_applyLeaderForwardBias` and the whole follow path are untouched. Only the
   * component ACROSS the corridor is replaced by the centreline, because carrying the subject's LANE
   * is what threw the picture sideways at every lead change: measured before this block, an anchor
   * change moved the camera 62-84 world px sideways, 28-37% of the 225 px shot.
   *
   * If you are here because the camera "does not follow the racer", check the ALONG axis first. It
   * does. Delete this and the sideways jumping comes straight back.
   * ==========================================================================================
   *
   * @param {number|null} t
   * @returns {{x:number,y:number}|null}
   */
  _centrelineAt(t) {
    if (t == null || !this._shape) return null;
    const tt = this._isOpenTrack ? Math.max(0, Math.min(1, t)) : ((t % 1) + 1) % 1;
    return this._shape.getPosition(tt, 0) ?? null;
  }

  /**
   * CAMERA-LATERAL-1: the lateral guarantee. Shift off the centreline only to keep the state's
   * guaranteed subjects in frame, by the least that works, and return to zero as soon as it can.
   *
   * WHICH SUBJECTS, and why only these. The zoom guarantees measure FROM the anchor, so with the
   * anchor pinned to the centreline the corridor and the company are exact by construction — the
   * corridor is symmetric about the anchor and each companion's vector starts there. The PAIR
   * guarantee is the one that is not: it measures the separation |a-b| against the whole chord and
   * assumes the pair is centred about the anchor, which a pinned anchor no longer provides. The
   * corridor edges are included anyway, at no cost, so a future change to the zoom rule cannot
   * quietly start cropping the corridor without a test noticing.
   *
   * @returns {{x:number,y:number}} the pan target, shifted along the perpendicular when it must be
   */
  _applyLateralGuarantee(panTarget, headingT, subjects, camZoom, frameSize) {
    if (!panTarget || !this._shape) return panTarget;
    const heading = this._headingAt(headingT);
    if (!heading) return panTarget;
    const len = Math.hypot(heading.x, heading.y);
    if (!(len > 0)) return panTarget;
    const perp = { x: -heading.y / len, y: heading.x / len };

    const anchor = subjects.point ?? panTarget;
    const effX = this._proj.effX(camZoom);
    const effY = this._proj.effY(camZoom);
    const at = anchorScreenPoint(
      frameSize.width,
      frameSize.height,
      framingFor(this.state).position === POSITION.FORWARD ? this._leaderForwardFrac : null,
      this._headingScreen(headingT)
    );
    // The perpendicular in SCREEN space, and how many screen px one world px along it is worth.
    const vx = perp.x * effX;
    const vy = perp.y * effY;
    const scale = Math.hypot(vx, vy);
    if (!(scale > 0)) return panTarget;
    const pct = this._innerFramePct ?? DEFAULT_INNER_FRAME_PCT;
    const roomPlus = roomFromPointAlong(at.x, at.y, vx, vy, frameSize.width, frameSize.height, pct);
    const roomMinus = roomFromPointAlong(
      at.x,
      at.y,
      -vx,
      -vy,
      frameSize.width,
      frameSize.height,
      pct
    );

    // Each guaranteed subject's offset from the CENTRELINE, in world px. The anchor is on the
    // centreline, so a subject's lateral offset is just its displacement projected on the perpendicular.
    const lateralOf = (r) => (r.x - anchor.x) * perp.x + (r.y - anchor.y) * perp.y;
    const offsets = [];
    const half = this._trackWidthPx / 2;
    if (half > 0) offsets.push(half, -half); // the corridor edges, always
    if (framingFor(this.state).guarantee === GUARANTEE.PAIR) {
      for (const r of subjects.pair) if (r) offsets.push(lateralOf(r));
    }
    if (offsets.length === 0) return panTarget;

    const d = lateralShiftToFit(offsets, roomPlus, roomMinus, scale);
    if (!Number.isFinite(d) || d === 0) return panTarget;
    this._lateralShiftPx = d;
    return { x: panTarget.x + perp.x * d, y: panTarget.y + perp.y * d };
  }

  /**
   * CAMERA-COMPANY-2: the same tangent in SCREEN space. Zoom cancels — only the axis RATIO survives
   * the normalisation — so this is a fixed direction for a given track parameter, which is why the
   * company guarantee can ask where the anchor will sit before the zoom is known.
   * @param {number|null} t
   */
  _headingScreen(t) {
    const h = this._headingAt(t);
    if (!h) return null;
    return { x: h.x * this._proj.axisX, y: h.y * this._proj.axisY };
  }

  /**
   * CAMERA-FRAMING-1: WHO the camera is on, per state. This is the only genuinely per-state part of
   * the framing rule — the guarantee and the frame position are uniform (see framingRule.js).
   *
   * @returns {{point: {x,y}|null, t: number|null, pair: [object|null, object|null]}}
   *   `point` the world point to centre on, `t` its track parameter (for the heading), and `pair`
   *   the two racers a PAIR guarantee must keep in frame.
   */
  _framingSubjects(racers, focusRacers) {
    const leader = focusRacers[0] ?? null;
    switch (this.state) {
      case CAM_STATE.LEAD_CHANGE: {
        // The racer NOW leading, with the racer he just passed as the pair partner. Before this
        // block LEAD_CHANGE had no case at all: panTarget fell through to its default centroid
        // branch, so the camera sat on the average of the top three and never received the forward
        // bias — in the state that holds 37.6% of all frames.
        const passed = this._findByIndex(racers, this._prevLeaderIndex, null);
        return {
          point: leader ? { x: leader.x, y: leader.y } : null,
          t: leader?.t ?? null,
          pair: [leader, passed],
        };
      }
      case CAM_STATE.BATTLE_ZOOM: {
        const group = this._findGroupRacers(racers);
        const contenders = group.length >= 2 ? group : focusRacers;
        const a = contenders[0] ?? null;
        const b = contenders[1] ?? null;
        const point =
          a && b
            ? getPanTarget(CAM_STATE.BATTLE_ZOOM, [a, b], this._shape)
            : a
              ? { x: a.x, y: a.y }
              : null;
        return { point, t: a && b ? (a.t + b.t) / 2 : (a?.t ?? null), pair: [a, b] };
      }
      case CAM_STATE.PHOTO_FINISH: {
        // The deterministic top two contesting the line — never the live battle-group detection.
        const a = focusRacers[0] ?? null;
        const b = focusRacers[1] ?? null;
        const point =
          a && b
            ? getPanTarget(CAM_STATE.BATTLE_ZOOM, [a, b], this._shape)
            : a
              ? { x: a.x, y: a.y }
              : null;
        return { point, t: a && b ? (a.t + b.t) / 2 : (a?.t ?? null), pair: [a, b] };
      }
      case CAM_STATE.COMEBACK_ZOOM: {
        const locked =
          this._findByIndex(racers, this._comebackLockedRacerIndex, this._comebackLockedRacer) ??
          focusRacers[Math.min(2, focusRacers.length - 1)] ??
          null;
        return {
          point: locked ? { x: locked.x, y: locked.y } : null,
          t: locked?.t ?? null,
          pair: [null, null],
        };
      }
      case CAM_STATE.OVERVIEW:
      case CAM_STATE.LEADER_ZOOM:
      default:
        return {
          point: leader ? { x: leader.x, y: leader.y } : null,
          t: leader?.t ?? null,
          pair: [null, null],
        };
    }
  }

  /**
   * CAMERA-FRAMING-1: the GUARANTEE, as a cam.zoom CEILING. "Everyone who matters right now stays in
   * frame." It WIDENS the shot when the state setting would crop the guaranteed subjects, and does
   * nothing otherwise — it never moves a centre and never picks a subject (Lesson 192).
   *
   * Orientation-aware: the corridor is measured perpendicular to the heading and the pair along the
   * line between them, so the bound binds exactly when it must instead of assuming the worst
   * orientation for the whole lap.
   *
   * @returns {number} cam.zoom ceiling, Infinity when nothing constrains
   */
  _guaranteeCeiling(subjects, frameSize) {
    const kind = framingFor(this.state).guarantee;
    const { axisX, axisY } = this._proj;
    const inner = this._innerFramePct ?? DEFAULT_INNER_FRAME_PCT;
    if (kind === GUARANTEE.PAIR) {
      const [a, b] = subjects.pair;
      const ceiling = pairGuarantee(
        a,
        b,
        axisX,
        axisY,
        frameSize.width,
        frameSize.height,
        inner,
        this._drawnBodyWidthRefPx
      );
      // A pair state with only one contender present has no pair to keep together; fall back to the
      // corridor so the shot is still bounded by something real.
      if (Number.isFinite(ceiling)) return ceiling;
    }
    return corridorGuarantee(
      this._headingAt(subjects.t),
      this._trackWidthPx,
      axisX,
      axisY,
      frameSize.width,
      frameSize.height,
      inner
    );
  }

  /**
   * CAMERA-COMPANY-1: the DRAMATURGICAL guarantee — "do not show emptiness".
   *
   * Deliberately NOT part of `_guaranteeCeiling`. The geometric guarantees protect named subjects;
   * this one protects the SHOT, and folding them together would hide that they answer different
   * questions. Both are applied with Math.min at the same place, before the camera moves.
   *
   * Applies to the SINGLE-ANCHOR states only. BATTLE, PHOTO_FINISH and LEAD_CHANGE already guarantee
   * a pair, which IS company — adding a headcount there would fight a guarantee that is already
   * doing the job. See the report for the measurement behind that choice.
   */
  _companyCeiling(subjects, racers, frameSize) {
    if (!(this._minRacersVisible > 1)) return Infinity;
    if (framingFor(this.state).guarantee === GUARANTEE.PAIR) return Infinity;
    // The company sits BEHIND a forward-framed subject, and forward framing gives it more room: a
    // leader at 0.66 along the frame has 0.66 of it behind him. A centred subject has half.
    // WHERE the anchor will sit, from the framing rule — so the room toward each companion is
    // measured rather than assumed. A single scalar in every direction was over-generous everywhere
    // (0.66 assumed against a true 0.399 dead ahead), which is why it delivered one companion fewer
    // than it promised. This is the INTENDED position and is deliberately zoom-INDEPENDENT: reading
    // the anchor back off the live camera instead was tried and measured worse (promise kept 82.3%
    // of frames against 97.1%), because during a widening the live zoom is tighter than the target,
    // so the read-back over-states the room the finished shot will actually have and the guarantee
    // talks itself into staying tight. See the report.
    const at = anchorScreenPoint(
      frameSize.width,
      frameSize.height,
      framingFor(this.state).position === POSITION.FORWARD ? this._leaderForwardFrac : null,
      this._headingScreen(subjects.t)
    );
    // COMPANY_FRAME_PCT, not `_innerFramePct`: a guaranteed companion needs to be visible with a
    // margin, not inside the subject's safe region. See the constant for the owner's reasoning.
    return companyGuarantee(
      subjects.point,
      racers,
      this._minRacersVisible,
      this._proj.axisX,
      this._proj.axisY,
      frameSize.width,
      frameSize.height,
      COMPANY_FRAME_PCT,
      at
    );
  }

  /**
   * CAMERA-FOCUS-3 leader forward-framing. Shifts a pan target BACKWARD along the leader's motion tangent
   * so the leader lands at screen fraction `_leaderForwardFrac` (> 0.5) along the motion axis — i.e. FORWARD,
   * with the trailing pack filling the rest of the frame (the action is behind the leader). Returns the
   * target unchanged when disabled, when the shape/T is missing, or when the tangent is degenerate.
   *
   * @param {{x:number,y:number}} pos   the un-biased pan target (leader's smoothed world position)
   * @param {number|null} leaderT       the leader's track T
   * @param {number} effZoomX           effective world→screen zoom on the X axis for this state
   * @param {number} effZoomY           effective world→screen zoom on the Y axis for this state
   * @param {number} frameW             canvas width in px
   * @param {number} frameH             canvas height in px
   */
  _applyLeaderForwardBias(pos, leaderT, effZoomX, effZoomY, frameW, frameH) {
    if (
      this._leaderForwardFrac == null ||
      leaderT == null ||
      !this._shape ||
      !(effZoomX > 0) ||
      !(effZoomY > 0)
    )
      return pos;
    // CAMERA-FRAMING-1: one definition of "which way is ahead", shared with the corridor guarantee.
    const heading = this._headingAt(leaderT);
    if (!heading) return pos;
    const len = Math.hypot(heading.x, heading.y);
    const dx = heading.x / len;
    const dy = heading.y / len;
    // CAMERA-FOCUS-5: the screen mapping is PER-AXIS (ctx.scale(zoom·bsX, zoom·bsY) closed). Work the
    // shift in SCREEN space so the leader lands (frac−0.5) of the frame FORWARD along the motion direction
    // on EVERY heading — not just horizontal. The world tangent (dx,dy) projects to the screen tangent
    // (dx·effZoomX, dy·effZoomY); `span` is how far the frame reaches along that heading.
    //
    // CAMERA-PICTURE-FIXES-1: `span` was `|cos|·frameW + |sin|·frameH` — a BLEND of the side lengths,
    // right on both axes and wrong between them (the weights sum to up to √2). At the owner's 74°
    // heading it read 1091.4 px where the frame reaches 759.9 px, so frac 0.66 displaced 23.0pp
    // instead of 16.0pp. It is now the rectangle's actual chord through the centre; the axis cases
    // are unchanged, which is why no test caught this.
    const sxDir = dx * effZoomX;
    const syDir = dy * effZoomY;
    const sLen = Math.hypot(sxDir, syDir);
    if (!(sLen > 0)) return pos;
    const span = frameExtentAlong(sxDir, syDir, frameW, frameH);
    const worldBias = ((this._leaderForwardFrac - 0.5) * span) / sLen;
    if (!(worldBias > 0)) return pos;
    // shift the pan CENTRE backward along motion → the leader appears forward on screen
    return { x: pos.x - dx * worldBias, y: pos.y - dy * worldBias };
  }

  // CAMERA-DETOUR-1: read-only per-transition frame recorder. Writes ONLY to _detour* fields and the
  // console — never a camera value (so the fingerprint is identical off and on). Captures 3 frames
  // before each transition and ~30 after, with the candidate-A/B/C/D signals, so the frame where the
  // NEW anchor's screen movement flips sign is locatable off the owner's LIVE trace (seed 5601). The
  // anchor screen position below is projected with the SAME offset/zoom the renderer committed THIS
  // frame — never a recomputation from other inputs (a log line that recomputes its own expectation is
  // a tautology and proves nothing; that exact mistake hid the camera defect for two days).
  _recordDetourFrame(tSpaceLerpActive, transitioned, racers) {
    const r3 = (v) => (v == null ? null : Math.round(v * 1000) / 1000);
    const r6 = (v) => (v == null ? null : Math.round(v * 1e6) / 1e6);

    // On the transition frame: open a window and flush the rolling pre-buffer as rel -N..-1.
    if (transitioned) {
      if (this._detourWindow) {
        // A prior window is still open (transitions <30 frames apart) — keep it (truncated) so
        // nothing is lost; only completed windows are console-emitted below.
        this._detourLog.push(this._detourWindow);
        if (this._detourLog.length > 20) this._detourLog.shift();
      }
      const pre = this._detourPreBuf.slice(-3);
      const preFrames = pre.map((p, i) => ({
        rel: i - pre.length,
        // CAMERA-REPRO-1: the camera clock this frame was drawn at. The ONE coordinate a marker and
        // this log share — without it the marker can say WHERE only in prose, and matching a marked
        // moment to a logged window is eyeball work.
        ts: r3(p.ts),
        from: p.st,
        to: this.state,
        anchorSX: null, // the NEW-state anchor is undefined before the transition
        anchorSY: null,
        oX: r3(p.ox),
        oY: r3(p.oy),
        z: r6(p.z),
        camT: r6(p.ct),
      }));
      const lastPre = pre.length ? pre[pre.length - 1] : null;
      this._detourWindow = {
        from: this._detourPrevState,
        to: this.state,
        preoX: lastPre ? lastPre.ox : null, // candidate A: the offset the eye last saw (rel -1)
        preoY: lastPre ? lastPre.oy : null,
        prez: lastPre ? lastPre.z : null,
        frames: preFrames,
        remaining: 31, // rel 0..30
      };
    }

    // Capture this frame into the active window (rel 0..30).
    if (this._detourWindow && this._detourWindow.remaining > 0) {
      const w = this._detourWindow;
      const rel = 31 - w.remaining;
      // The NEW state's centre world point — getPanTarget covers every state (incl. BATTLE, where
      // _focusAnchorRacer is null) — projected with THIS frame's rendered offset/zoom.
      const focus = this._focusRacers(racers);
      const anchorW = getPanTarget(this.state, focus, this._shape);
      const anchorS = this._proj.toScreen(anchorW, this.zoom, this.offsetX, this.offsetY);
      w.frames.push({
        rel,
        ts: r3(this._lastTs), // CAMERA-REPRO-1: shared coordinate with the marker's moment.cms
        from: w.from,
        to: this.state,
        anchorSX: r3(anchorS.x),
        anchorSY: r3(anchorS.y),
        // CAMERA-DETOUR-2: the anchor's WORLD position — so its own motion is separable from the
        // camera's (the OVERVIEW centroid moves on its own as the field spreads).
        awX: r3(anchorW.x),
        awY: r3(anchorW.y),
        rc: focus.length, // how many racers the anchor centroid was computed from (a changing set moves it)
        oX: r3(this.offsetX),
        oY: r3(this.offsetY),
        z: r6(this.zoom),
        // the glide's ENDPOINT as recomputed this frame — a moving endpoint shows up as a moving endpoint
        toX: r3(this.targetOffsetX),
        toY: r3(this.targetOffsetY),
        s: this._detourGlideS == null ? null : r6(this._detourGlideS), // glide progress (linear) …
        e: this._detourGlideE == null ? null : r6(this._detourGlideE), // … and eased
        br: this._detourBranch, // which branch WROTE offsetX/offsetY this frame: glide | cut | follow
        gsoX: r3(this._glideStartOffsetX), // candidate A: where the glide started from …
        gsoY: r3(this._glideStartOffsetY),
        gsz: r6(this._glideStartZoom),
        preoX: r3(w.preoX), // … versus the offset the eye last saw
        preoY: r3(w.preoY),
        prez: r6(w.prez),
        camT: this._camT == null ? null : r6(this._camT), // candidate B: the second (track-space) mover
        camTRead: !!tSpaceLerpActive, // did the follow path read _camT this frame
        containMod: !!this._detourContainActive, // candidate C: did the clamp move the pan …
        containDX: r3(this._detourContainDeltaX), // … and by how much (measured, not assumed)
        containDY: r3(this._detourContainDeltaY),
        stZoom: this._detourSetTargetsZoom == null ? null : r6(this._detourSetTargetsZoom), // candidate D:
        rz: r6(this.zoom), // the zoom _setTargets used vs the zoom the renderer drew with
      });
      w.remaining -= 1;
      if (w.remaining === 0) {
        this._detourLog.push(w);
        if (this._detourLog.length > 20) this._detourLog.shift();
        try {
          // eslint-disable-next-line no-console
          console.info(`[RA CAMERA DETOUR] ${w.from}->${w.to}`, JSON.stringify(w.frames));
        } catch {
          // console unavailable (headless) — the window is still in _detourLog for export
        }
        this._detourWindow = null;
      }
    }

    // Advance the rolling pre-buffer (keep last 3) and remember this frame's state.
    this._detourPreBuf.push({
      st: this.state,
      ts: this._lastTs,
      ox: this.offsetX,
      oy: this.offsetY,
      z: this.zoom,
      ct: this._camT,
    });
    if (this._detourPreBuf.length > 3) this._detourPreBuf.shift();
    this._detourPrevState = this.state;
  }
  /** CAMERA-DETOUR-1: completed per-transition windows captured while cameraDetourLog was on. */
  exportDetourLog() {
    return this._detourLog;
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
   * The Y pan offset for a resolved cam.zoom. Split out because the Y axis has its OWN world→screen
   * scale on every non-square closed world (bsY != bsX) — the projection supplies it, so this can
   * no longer be written with the X scale (the CAMERA-FOCUS-5 defect). On open tracks the mapping
   * is uniform, so effY == effX and this reduces exactly to the former open-track formula.
   */
  _offsetYFor(targetY, camZoom, canvasH) {
    const effY = this._proj.effY(camZoom);
    const camYMax = Math.max(this._worldBounds.minY, this._worldBounds.maxY - canvasH / effY);
    const idealCamY = targetY - canvasH / (2 * effY);
    const camY = Math.max(this._worldBounds.minY, Math.min(camYMax, idealCamY));
    return -camY * effY;
  }

  /**
   * Coordinated pan+zoom target computation for every anchored state, on every track.
   *
   * CAMERA-PROJECTION-1: this replaces _setClosedTrackTargets + _setOpenTrackTargets +
   * _closedOffsetY. Those three were ONE algorithm written twice — the only differences were
   * which world→screen scale they used and whether the Y axis got its own. The projection now
   * supplies both, so there is one implementation and one place for a framing bug to live.
   *
   * Two resolveCamera calls are made each frame:
   *   1. the state's own zoom → the final zoom target (may be reduced by world-edge clamping)
   *   2. the LIVE zoom        → the pan target for the zoom the renderer is drawing with right now,
   *                             so the pan chases the subject smoothly while the zoom eases.
   *
   * @param {{x:number,y:number}} target        world-space pan target
   * @param {number} stateCamZoom               cam.zoom this state asks for (NOT effective zoom)
   * @param {{width:number,height:number}} frameSize
   * @param {number} [extraMinEffZoom=0]        optional additional zoom-out floor (OVERVIEW only)
   */
  _setTrackTargets(target, stateCamZoom, frameSize, extraMinEffZoom = 0) {
    const proj = this._proj;
    const minEffZoom = Math.max(proj.minEffX(), extraMinEffZoom);
    const zoomResolved = resolveCamera({
      targetWorld: target,
      desiredEffZoom: proj.effX(stateCamZoom),
      worldBounds: this._worldBounds,
      frameSize,
      innerFramePct: this._innerFramePct,
      minEffZoom,
    });
    this.targetZoom = proj.camZoomForEffX(zoomResolved.effectiveZoom);

    // CAMERA-GLIDE-TARGET-1 (fixes CAMERA-DETOUR cause D): the GRAMMAR-1 glide interpolates the offset from the
    // captured start to THIS endpoint across the whole glide, so the endpoint must be the DESTINATION framing —
    // resolved at the zoom the transition LANDS on (zoomResolved above, i.e. this.targetZoom) — NOT the live,
    // still-easing zoom. Computing it at the live zoom made the endpoint travel ~1150 px during the glide while
    // the camera steered honestly toward a point that was wrong for the whole journey. The non-glide paths
    // (entry/tracking) PIN offset to targetOffset every frame while the zoom eases, so they must keep the endpoint
    // at the CURRENT render zoom (the deliberate ordering in update()); leave those unchanged. The glide's
    // endpoint is therefore constant for the glide's duration (moving only as the anchor world point moves).
    let panResolved;
    if (this._lerpPhase === 'glide') {
      panResolved = zoomResolved; // destination framing (the same resolve that set this.targetZoom)
    } else {
      panResolved = resolveCamera({
        targetWorld: target,
        desiredEffZoom: Math.max(proj.effX(this.zoom), minEffZoom),
        worldBounds: this._worldBounds,
        frameSize,
        innerFramePct: this._innerFramePct,
        minEffZoom,
      });
    }
    this.targetOffsetX = -panResolved.camX * panResolved.effectiveZoom;
    this.targetOffsetY = this._offsetYFor(
      target.y,
      proj.camZoomForEffX(panResolved.effectiveZoom),
      frameSize.height
    );
    this._lastResolvedPanTarget = panResolved;
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

  /**
   * The track parameter `finishOverviewLookbackPx` of path length BEFORE the finish line — the
   * stationary point FINISH_OVERVIEW frames so later finishers cross in shot.
   * The open/closed test is a genuine TOPOLOGY question (wrap on a loop, clamp on a line) and is
   * one of the 13. It used to be written out twice, verbatim (CAMERA-REFACTOR-0 C3 #6).
   * @param {number} finishT
   * @returns {number|null} lookback T, or null when there is no shape to measure against
   */
  _finishLookbackT(finishT) {
    if (!this._shape) return null;
    const normT = this._isOpenTrack ? Math.min(1, finishT) : ((finishT % 1) + 1) % 1;
    const pathLen = this._shape.getTotalLength?.() ?? 0;
    const lookbackFrac = pathLen > 0 ? this._finishOverviewLookbackPx / pathLen : 0;
    return this._isOpenTrack
      ? Math.max(0, normT - lookbackFrac)
      : (((normT - lookbackFrac) % 1) + 1) % 1;
  }

  /**
   * The world point on the racing line at the camera's current track parameter, or null.
   * The open/closed test here is a genuine TOPOLOGY question — does the track parameter WRAP
   * (a loop) or CLAMP (a line)? It was written out at six separate call sites; it lives here now.
   */
  _shapePosAtCamT() {
    if (this._camT === null || !this._shape) return null;
    const t = this._isOpenTrack ? Math.max(0, Math.min(1, this._camT)) : ((this._camT % 1) + 1) % 1;
    return this._shape.getPosition(t, 0);
  }

  /** True while the entry/lead-in pan should follow _camT along the racing line. */
  _panFollowsCamT() {
    return this._camT !== null && this._shape && this._observerPhase !== 'follow';
  }

  /**
   * CAMERA-FRAMING-1: THE framing rule, once, for every state.
   *
   * The owner's design: a state is described by three things and only three — ANCHOR (who the camera
   * is on), GUARANTEE (who must stay in frame; the zoom widens to honour it) and the per-state ZOOM
   * in track widths. Frame POSITION is not a fourth setting: it follows from "is there anything
   * worth seeing ahead of the subject?", answered once per state in framingRule.js.
   *
   * What stood here before was a six-case switch in which each state resolved its own pan target, only
   * LEADER received the forward bias, LEAD_CHANGE had no case at all (it fell through `panTarget`'s
   * default centroid branch), and PHOTO_FINISH borrowed BATTLE's numbers. The per-state part is now
   * only `_framingSubjects` — WHO — and everything after it is common.
   *
   * OVERVIEW keeps three anchor exceptions (start-of-race, finish lookback, entry-phase T-space pan):
   * they choose a DIFFERENT ANCHOR for good reasons, not a different rule, and they run through the
   * same guarantee and the same position step as everything else.
   */
  _setTargets(racers, canvasW, canvasH, raceState) {
    const focusRacers = this._focusRacers(racers);
    const frameSize = { width: canvasW, height: canvasH };
    const framing = framingFor(this.state);
    const stateZoom = this._stateCamZoom();

    // ── WHO ────────────────────────────────────────────────────────────────────────────────────
    const subjects = this._framingSubjects(racers, focusRacers);
    let panTarget = subjects.point;
    let headingT = subjects.t;
    let pinAcross = true;
    this._lateralShiftPx = 0;

    // OVERVIEW's anchor exceptions, in priority order. Each REPLACES the anchor and then rejoins.
    if (this.state === CAM_STATE.OVERVIEW) {
      const startPhase = raceState && raceState.raceElapsed < START_PHASE_DURATION;
      if (this._inFinishMode && this._shape && raceState?.finishT > 0) {
        // Hold a fixed point behind the line so the approach stays visible while the winner runs out.
        const lookbackT = this._finishLookbackT(raceState.finishT);
        const target = lookbackT === null ? null : this._shape.getPosition(lookbackT, 0);
        if (target) {
          panTarget = target;
          headingT = lookbackT;
        }
      } else if (startPhase) {
        // Before a leader exists, hold the whole field so nobody is cropped at the gun. The field
        // spans the whole corridor here and there is no single subject, so the across-track pin does
        // not apply — this branch keeps the centroid it always had.
        panTarget = getPanTarget(
          CAM_STATE.OVERVIEW,
          racers.length ? racers : focusRacers,
          this._shape
        );
        pinAcross = false;
      }
    }

    // Entry-phase T-space pan: the camera travels along the racing line to its new subject rather
    // than cutting across the infield. Same anchor, different route to it.
    const followsCamT = this._panFollowsCamT();
    if (followsCamT) {
      const camTPos = this._shapePosAtCamT();
      if (camTPos) {
        panTarget = camTPos;
        headingT = this._camT;
        pinAcross = false; // the T-space pan is already ON the centreline by construction
      }
    }

    // ── ACROSS THE TRACK: the corridor centreline. ALONG the track: unchanged. ─────────────────
    // CAMERA-LATERAL-1. Done BEFORE the focal smoothing, so the smoothing keeps doing its job on the
    // along-track motion, and before the guarantees, so each of them measures from the anchor the
    // camera will actually use. See _centrelineAt for why this is NOT the CAMERA-FOCUS-3 defect.
    if (pinAcross) {
      const onCentre = this._centrelineAt(headingT);
      if (onCentre) {
        panTarget = onCentre;
        subjects.point = onCentre;
      }
    }

    if (
      panTarget &&
      !followsCamT &&
      (this.state === CAM_STATE.LEADER_ZOOM || this.state === CAM_STATE.COMEBACK_ZOOM)
    ) {
      // Focal smoothing removes the brake-induced velocity oscillation on single-racer anchors.
      panTarget = this._smoothFocal(panTarget.x, panTarget.y);
    }

    if (!panTarget) return;

    // ── HOW FAR IN: the state setting, WIDENED by the guarantees (never tightened) ─────────────
    // A LIMIT, not a correction: the target is min(setting, geometric, dramaturgical) computed
    // BEFORE the camera moves, so it never zooms in and then backs out. In-then-out is pumping.
    const guaranteed = Math.min(
      stateZoom,
      this._guaranteeCeiling(subjects, frameSize),
      this._companyCeiling(subjects, racers, frameSize)
    );

    // ── WHERE IN FRAME: from the principle, not from a slider ──────────────────────────────────
    if (framing.position === POSITION.FORWARD && this._observerPhase === 'follow') {
      panTarget = this._applyLeaderForwardBias(
        panTarget,
        headingT,
        this._proj.effX(guaranteed),
        this._proj.effY(guaranteed),
        canvasW,
        canvasH
      );
    }

    // ── AND ACROSS IT: shift off the centreline only when a guaranteed subject needs it ────────
    panTarget = this._applyLateralGuarantee(panTarget, headingT, subjects, guaranteed, frameSize);

    this._setTrackTargets(panTarget, guaranteed, frameSize);
  }

  /** The per-state zoom setting, in cam.zoom. One lookup, so no state can silently borrow another's. */
  _stateCamZoom() {
    switch (this.state) {
      case CAM_STATE.OVERVIEW:
        return this._overviewSnapZoom ?? this._overviewStateZoom;
      case CAM_STATE.BATTLE_ZOOM:
        return this._battleZoom;
      case CAM_STATE.COMEBACK_ZOOM:
        return this._comebackZoom;
      case CAM_STATE.LEAD_CHANGE:
        return this._leadChangeZoom;
      case CAM_STATE.PHOTO_FINISH:
        return this._photoFinishZoom;
      case CAM_STATE.LEADER_ZOOM:
      default:
        return this._leaderZoom;
    }
  }

  // CAMERA-FRAMING-1: the min-visible zoom FLOOR that stood here is GONE, and with it the
  // per-axis defect it carried (it fed `_countVisibleRacers` / `_zoomFloorForMinVisible` a single
  // effZoom for BOTH axes, over-stating screen Y by 18.5% on every closed track — the bsX/bsY
  // family, third occurrence). It was a second zoom authority that STEERED: it read where the
  // racers happened to be and pulled the zoom out around them, fighting the state's own setting and
  // ratcheting frame to frame. Its job — "do not crop what matters" — is now the GUARANTEE, which
  // widens for named subjects and never for a headcount. See framingRule.js and the report.

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

    // CAMERA-PROJECTION-1: one centring computation per axis, from the projection. The former
    // open/closed branches were the same eight lines twice — open used one scale on both axes,
    // closed used bsX on X and bsY on Y. `effY == effX` on open, so this reduces to it exactly.
    const effZoomX = this._proj.effX(targetZoom);
    const effZoomY = this._proj.effY(targetZoom);
    const camXMax = Math.max(this._worldBounds.minX, this._worldBounds.maxX - canvasW / effZoomX);
    const camX = Math.max(this._worldBounds.minX, Math.min(camXMax, cx - canvasW / (2 * effZoomX)));
    this.offsetX = -camX * effZoomX;
    const camYMax = Math.max(this._worldBounds.minY, this._worldBounds.maxY - canvasH / effZoomY);
    const camY = Math.max(this._worldBounds.minY, Math.min(camYMax, cy - canvasH / (2 * effZoomY)));
    this.offsetY = -camY * effZoomY;
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
