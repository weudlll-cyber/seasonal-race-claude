// ============================================================
// File:        CameraDirector.js
// Path:        client/src/modules/camera/CameraDirector.js
// Project:     RaceArena
// Created:     2026-04-22
//
// WHAT THIS IS FOR: two things, and only these two.
//   1. WHICH SHOT are we on — the state machine: eligibility, the holds and cooldowns, the weighted
//      pick, the finish sequence's scripted lifecycle.
//   2. WHERE IS THE CAMERA this frame — its own motion: `zoom`, `offsetX`, `offsetY`, `camT`, the
//      lerp phases and the three branches (glide / cut / follow) that may write the offset.
//
// WHAT THIS IS NOT FOR: anything answerable without a camera. Those questions have their own files
// and this one only asks them —
//   who is fighting whom .................. battleGroup.js       (pure, stateless)
//   who is coming through the field ....... comebackDetector.js  (owns the rank history)
//   how wide is each shot, and how ........ framingConfig.js     (defaults + validation bands)
//   when does anything happen ............. cameraTimingComputation.js
//   who must stay in frame ................ framingRule.js       (guarantees WIDEN; never steer)
//   world <-> screen ...................... projection.js        (the ONLY mapping)
//   how much world is in shot ............. zoomUnit.js          (standard corridors)
//   where did the camera go wrong ......... detourRecorder.js    (never writes a camera value)
//   does the camera cut this frame ........ transitionDecision.js
//   how does a race END ................... finishPhase.js       (the whole finish sequence)
//
// THE ACCEPTANCE TEST, and it is the good kind. `node scripts/camera-fingerprint.mjs` hashes every
// decision this file makes on every frame of a seeded race across ten tracks. A refactor that
// tidies code must not move the picture, and unlike a tuning change that is PROVABLE rather than
// arguable. The value it must match lives in docs/fingerprints.json and nowhere else — this
// comment deliberately carries no copy. If your change is meant to move the picture, it is not
// hygiene — say so, and re-baseline deliberately.
//
// READ FIRST, if you are changing behaviour: docs/CAMERA_DIRECTOR.md. The ordering inside update()
// is load-bearing in two places that look arbitrary (the zoom lerp before _setTargets, and
// _setTargets owning targetOffsetX/Y alone), and both are explained there and at the call sites.
// ============================================================

import { getPanTarget } from './panTarget.js';
import { resolveCamera } from './resolveCamera.js';
import { diagMixin } from './CameraDirectorDiag.js';
import { DetourRecorder } from './detourRecorder.js';
import { ComebackDetector } from './comebackDetector.js';
import {
  resolveFramingConfig,
  DEFAULT_CORRIDORS,
  DEFAULT_INNER_FRAME_PCT,
} from './framingConfig.js';
import {
  detectPulkGroup,
  groupStillCohesive,
  groupHoldsP1OrP2,
  findByIndex,
  resolveGroup,
} from './battleGroup.js';
import { shortestArcDeltaT } from '../../utils/mathUtils.js';
import { mulberry32 } from '../racePlanner.js';
import { computeTimingFromConfig } from './cameraTimingComputation.js';
import { decideTransition, TRANSITION_ACTION, TRANSITION_REASON } from './transitionDecision.js';
import {
  decideFinishPhase,
  evaluatePhotoFinishGate,
  finishTransitionBypasses,
  FINISH_ACTION,
  FINISH_REASON,
} from './finishPhase.js';
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
  fieldGuarantee,
  COMPANY_FRAME_PCT,
  anchorScreenPoint,
  pointGuarantee,
  lateralShiftToFit,
} from './framingRule.js';
import {
  ceremonySchedule,
  ceremonyZoom,
  ceremonyEasing,
  boardDurationMs,
} from './startCeremony.js';
// MIRRORS-BY-REFERENCE (LESSONS L207): fallbacks in this file READ the default instead of copying it.
import { DEFAULT_CAMERA_CONFIG } from '../storage/defaults.js';

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

// CAMERA-HYGIENE-2: the sixteen `_UPPER_CASE` timing fallbacks that stood here are gone. Every one
// of them was a second copy of a constant in cameraTimingComputation.js, and not one was read — the
// director gets its fallbacks by calling computeTimingFromConfig(null). They were the shape a
// silent divergence takes: two numbers that must agree, and nothing making them.
const START_PHASE_DURATION = 3000; // ms of forced OVERVIEW at race start
const FRAME_RATE = 60; // reference display frame rate for lerp formula (dt-scaling applied in update)
// CAMERA-HYGIENE-1: the reference canvas has ONE home, projection.js. It was declared independently
// here, in zoomUnit.js and in two drawing modules — four constants that must agree and nothing
// making them.
const CANVAS_W = REFERENCE_CANVAS_W;
const CANVAS_H_REF = REFERENCE_CANVAS_H;
const TOP_N = 3; // camera focuses on the top-N racers by position
// Every framing default and validation band lives in framingConfig.js — see the header there for
// why the bands REJECT out-of-range values rather than clamping them.
/** Fallback corridor width (world px) when no track width and no shape reach the director. */
const FALLBACK_TRACK_WIDTH_PX = 140;
const LEAD_OUT_DECAY = 0.05; // per-60fps-frame EMA factor for lead-out camera deceleration
const NOMINAL_T_PER_FRAME = 0.001; // fallback racer speed (t/frame) for lead-in distance when _prevFocusT is unknown
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
    // THE FINISH LATCHES. What they mean, and the sequence they form, is stated in finishPhase.js;
    // these are the six memories that sequence runs on. Five of them decide only WHICH SHOT (plus
    // the HUD label); `_inFinishMode` is the one that also FRAMES — see its reads below.
    // RUNIN-MINIMAL-1. `_runInEngaged` is the one-way latch: the run-in is a phase, not a per-frame
    // test, so once the line fits inside OVERVIEW's width it stays engaged for the rest of the race.
    // `_runInComposingNow` is this frame's answer, read by `_forwardFracNow` and by the diagnostics.
    this._runInEngaged = false;
    this._runInComposingNow = false;
    this._runInProgress = null;
    // FRONT-GROUP-1: the front group's STABLE INDICES, captured once when the endgame window opens
    // and never re-sorted. `null` means "not captured yet"; an empty array means "captured, and
    // there was nobody to hold" — the two are different and the difference is load-bearing, because
    // a capture that found nothing must not be retried every frame.
    this._frontGroupIdx = null;
    // The widest width the ending has already asked for, as a cam.zoom ceiling — the running minimum
    // of the other ceilings while the front group exists. It is the floor the front-group bound may
    // not open past; `null` until the window opens. `_frontGroupClamped` is this frame's answer to
    // "was the group too spread to hold even at that width", recorded rather than inferred.
    this._frontGroupFloor = null;
    this._frontGroupClamped = false;
    // Was the bound the binding term last frame, and has its release already been glided? The
    // release is once-only: a second glide mid-finish would fight the finish sequence's own moves.
    this._frontGroupWasBinding = false;
    this._frontGroupReleased = false;
    this._inFinishDrama = false; // the drama window after the crossing (hudState reports 'FINISH')
    this._inPhotoFinish = false; // 15a: true while the PHOTO_FINISH shot holds (kept distinct from _inFinishDrama so hudState reports 'PHOTO_FINISH')
    this._photoFinishGateDone = false; // 15a-predictive: once-only latch — the pre-line close-check fires exactly once
    this._photoFinishEnterPending = false; // 15a-predictive: set by update() when the gate decides to enter; consumed by _pickNextState
    // FINISH-WINDOW-1: the stable indices of the TWO racers the photo-finish shot is following,
    // captured at entry. The shot ends when THESE are home — measured to differ from
    // `finishedCount >= 2` by 6–57 frames on every finishing track, because the second racer across
    // the line is frequently not one of the pair.
    this._photoFinishContenders = null;
    this._inFinishMode = false; // FINISH_OVERVIEW has begun — absolute for state, and read by four framing sites
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
    // How long the CURRENT glide runs. Set at every glide start; null means "use the configured
    // glideDurationMs". The finish move is the one transition with its own duration (FINISH-MOTION-1).
    this._glideDurationActiveMs = null;
    this._glideStartZoom = null;
    this._glideStartOffsetX = null;
    this._glideStartOffsetY = null;
    this._leadInStartTs = null;
    this._leadOutStartCamT = null;
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
    // WHY the last transition decision went the way it did — a value, so a test can assert it.
    // Read by nothing in the camera math; see transitionDecision.js.
    this._lastTransitionReason = TRANSITION_REASON.HELD;
    // WHY the finish sequence did what it did on the last _pickNextState. Same idiom, same purpose:
    // read by nothing in the camera math, asserted by tests. See finishPhase.js.
    this._lastFinishReason = FINISH_REASON.NOT_FINISHING;
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
    // Camera lock for the current COMEBACK_ZOOM episode. This stays here and the DETECTION does
    // not: who is coming back is a question about the race (comebackDetector.js), which racer the
    // camera has committed to for this episode is a question about the shot.
    this._comebackLockedRacer = null;
    this._comebackLockedRacerIndex = null;
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
    // START-CEREMONY-CAMERA-1 / CEREMONY-HOLD-TARGET-1: THE HAND-OVER — the framing the ceremony
    // arrived at, carried past the gun and released at the first view change (`_transition`).
    // `null` means "no ceremony ran": a race entered without a countdown (a test, a resumed race)
    // gets OVERVIEW's ordinary setting rather than a stale hold, and so does every OVERVIEW after
    // the release.
    this._ceremonyHoldZoom = null;
    // CEREMONY-HANDOVER-1: the ceremony's promise, carried past the gun. ARMED by the countdown, so
    // a race entered without one (a test, a resumed race) never acquires a guarantee it was never
    // given — and RETIRED, one way, by `_fieldCeiling` when it can no longer be kept.
    this._fieldGuaranteeActive = false;
    this._fieldGuaranteeRetiredAt = null;
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
    // `this._detour` — the per-transition frame recorder — is created by _computeTimingConfig()
    // above, which already ran. It is deliberately NOT re-declared here: this block runs after it
    // and a `= null` would destroy the recorder the config just asked for.
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
    // CEREMONY-OPENING-1: no brand card unless somebody says so. See setCeremonyBrandActive.
    this._ceremonyBrandActive = false;
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
  _computeZoomForCorridors(corridors, fallback = DEFAULT_CORRIDORS.LEADER_ZOOM) {
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
    const f = resolveFramingConfig(config);
    // CAMERA-REFERENCE-WIDTH-1: the standard corridor, and the max() inside referenceWidthFor that
    // keeps a track WIDER than the reference framed by its own width — so a setting can never ask
    // to crop the corridor it is measured in.
    this._referenceCorridorPx = f.referenceCorridorPx;
    this._referenceWidthPx = referenceWidthFor(this._referenceCorridorPx, this._trackWidthPx);

    // Corridors → cam.zoom, one call per state through the single conversion.
    const c = f.corridorsByState;
    this._overviewCorridors = c.OVERVIEW;
    this._leaderZoom = this._computeZoomForCorridors(c.LEADER_ZOOM);
    this._leadChangeZoom = this._computeZoomForCorridors(c.LEAD_CHANGE);
    this._battleZoom = this._computeZoomForCorridors(c.BATTLE_ZOOM);
    this._comebackZoom = this._computeZoomForCorridors(c.COMEBACK_ZOOM);
    this._photoFinishZoom = this._computeZoomForCorridors(c.PHOTO_FINISH);
    // OVERVIEW is the same rule at the widest setting — no sprite size, no racer count.
    this._overviewStateZoom = this._computeZoomForCorridors(c.OVERVIEW, DEFAULT_CORRIDORS.OVERVIEW);
    this._innerFramePct = f.innerFramePct;
    this._minRacersVisible = f.minRacersVisible;
    this._transitionGrammar = f.transitionGrammar;
    this._glideDurationMs = f.glideDurationMs;
    this._leaderForwardFrac = f.leaderForwardFrac;
  }

  /**
   * Derive transition timing parameters from config or hardcoded fallbacks.
   * Called on construction and via updateConfig() for live-apply.
   * @param {object|null} config
   */
  _computeTimingConfig(config) {
    const t = computeTimingFromConfig(config);
    // The five gates that define a BATTLE group, kept together because battleGroup.js applies them
    // together and a gate that drifted away from its siblings would be silently unenforced.
    this._battleGates = {
      closenessT: t.battlePulkThresholdT,
      isolationT: t.battleIsolationThresholdT,
      maxSize: t.battleMaxGroupSize,
      maxRankSpan: t.battleMaxGroupRankSpan,
      minTopN: t.battleMinTopN,
    };
    this._battleMinDurationMs = t.battleMinDurationMs;
    this._endgameThreshold = t.endgameThreshold;
    this._postStartHoldMs = t.postStartHoldMs;
    this._ceremonyBrandMs = t.ceremonyBrandMs;
    this._ceremonyVenueMs = t.ceremonyVenueMs;
    this._ceremonyPushMs = t.ceremonyPushMs;
    this._ceremonySettledMs = t.ceremonySettledMs;
    this._startBoardFloorMs = t.startBoardFloorMs;
    this._startBoardMsPerName = t.startBoardMsPerName;
    this._countdownDigitsMs = t.countdownDigitsMs;
    this._ceremonyEasing = t.ceremonyEasing;
    this._battleCooldownMs = t.battleCooldownMs;
    this._showDiagnostics = t.showDiagnostics;
    this._diagEnabled = t.diagEnabled;
    // CAMERA-DETOUR-1: create the recorder when the log is switched on, drop it when it is switched
    // off. Live-apply keeps an existing recorder so a mid-race config edit does not lose its buffer.
    if (t.detourEnabled) this._detour ??= new DetourRecorder();
    else this._detour = null;
    this._transitionTConvergence = t.transitionTConvergence;
    this._overviewCooldownMs = t.overviewCooldownMs;
    this._leadAheadEnabledByState = t.leadAheadEnabledByState;
    this._leadOutEnabledByState = t.leadOutEnabledByState;
    this._maxEntryDurationByState = t.maxEntryDurationByState;
    this._minStateHoldMs = t.minStateHoldMs;
    this._battleMaxDurationMs = t.battleMaxDurationMs;
    this._maxStateDuration = t.maxStateDuration;
    this._minStateHoldByState = t.minStateHoldByState;
    this._maxStateDurationByState = t.maxStateDurationByState;
    this._phasedByState = t.phasedByState;
    this._tcByState = t.tcByState;
    this._lfByState = t.lfByState;
    this._lfEntryByState = t.lfEntryByState;
    this._entryConvergenceZoom = t.entryConvergenceZoom;
    this._entryConvergencePx = t.entryConvergencePx;
    // The four gates that define a comeback. Same reasoning as _battleGates: comebackDetector.js
    // applies them together, so they travel together. `??=` because _computeTimingConfig runs from
    // the constructor before the detector exists, and again on every live-apply after it does.
    this._comebackGates = {
      windowSec: t.comebackWindowSec,
      minPositionsGained: t.comebackMinPositionsGained,
      minStartGap: t.comebackMinStartGap,
      maxCurrentRankPct: t.comebackMaxCurrentRankPct,
    };
    this._comeback ??= new ComebackDetector(this._comebackGates);
    this._comeback.setGates(this._comebackGates);
    this._outcomePhaseThreshold = t.outcomePhaseThreshold;
    this._leadChangeMinGap = t.leadChangeMinGap;
    this._leadChangeDebounceMs = t.leadChangeDebounceMs;
    // comebackMinDuration / leadChangeMinDuration are deliberately NOT stored: they are consumed
    // inside computeTimingFromConfig, which folds them into minStateHoldByState. Keeping a second
    // copy here made two live controls look inert to the CAMERA-HYGIENE-1 perturbation audit.
    this._finishDramaDurationMs = t.finishDramaDurationMs;
    this._finishOverviewZoomOutDurationMs = t.finishOverviewZoomOutDurationMs;
    this._finishPauseMs = t.finishPauseMs;
    this._finishOverviewLookbackPx = t.finishOverviewLookbackPx;
    this._photoFinishEnabled = t.photoFinishEnabled;
    this._photoFinishCloseThresholdT = t.photoFinishCloseThresholdT;
    this._photoFinishLeadProgress = t.photoFinishLeadProgress;
    this._photoFinishContenderFraming = t.photoFinishContenderFraming;
    this._runInShot = t.runInShot;
    this._runInOpenMs = t.runInOpenMs;
    this._frontGroupFraming = t.frontGroupFraming;
    this._comebackCooldownMs = t.comebackCooldownMs;
    this._leadChangeCooldownMs = t.leadChangeCooldownMs;
    this._battleWeight = t.battleWeight;
    this._leadChangeWeight = t.leadChangeWeight;
    this._comebackWeight = t.comebackWeight;
    this._overviewWeight = t.overviewWeight;
    this._overviewTargetCount = t.overviewTargetCount;
    this._overviewStartDelay = t.overviewStartDelay;
    this._focalSmoothTc = config?.focalSmoothTc ?? DEFAULT_CAMERA_CONFIG.focalSmoothTc;
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
   * Race start: hand the COMEBACK detector its roster (racers with targetRank ≤ 5) and release the
   * camera's own lock. Pass null to switch COMEBACK off (race plan off, or a closed track).
   * The plan is usually null here — heroes are cast mid-race and arrive later via setCameraPlan().
   * @param {Set<number>|null} b1Indices
   * @param {object|null} cameraPlan
   */
  updateRacePlan(b1Indices, cameraPlan = null) {
    this._comeback.setRoster(b1Indices, cameraPlan);
    this._comebackLockedRacer = null;
    this._comebackLockedRacerIndex = null;
  }

  /**
   * Deliver the authored cameraPlan mid-race, once the heroes are cast. Keeps the rank history —
   * the racers were already being watched; the plan only says which of them the story named.
   * @param {object|null} cameraPlan  { b1Indices, heroes:[{index,role,finalRank,beats}] }
   */
  setCameraPlan(cameraPlan) {
    this._comeback.setPlan(cameraPlan);
  }

  /**
   * Are BOTH racers the photo-finish shot is following across the line?
   *
   * A pure read, and the definition the owner asked for in his own words — "the pause only starts
   * running once the TRIGGERS of the photo finish are home". Not `finishedCount >= 2`: measured on
   * every finishing track, the second racer across is usually a third party and the two conditions
   * are 6–57 frames apart.
   *
   * False when no shot is running, so it can never end something that has not started.
   *
   * @param {Array} racers
   * @returns {boolean}
   */
  _photoFinishContendersHome(racers) {
    const pair = this._photoFinishContenders;
    if (!pair?.length || !racers) return false;
    // A contender that cannot be resolved counts as NOT home. The first draft treated an unknown
    // index as "nobody to wait for" and so reported the pair home on the first frame of every shot —
    // caught by a director test, and the safe direction is the other one: the everybody-home net
    // still ends the shot if a contender genuinely never arrives.
    return pair.every((c) => !!findByIndex(racers, c.index, c.ref)?.finished);
  }

  /** The best current comeback, or null. See comebackDetector.js for what "best" means. */
  _detectComebackRacer(racers, ts) {
    return this._comeback.best(racers, ts);
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
    return map[state] ?? map.OVERVIEW;
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
    this._comeback.recordRanks(racers, ts);
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
    // FINISH-SEAM-1: the three ways the finish sequence reaches the transition decision, all of
    // them hold-gate bypasses. The predicates are pure (finishPhase.js); nothing is assigned here.
    const { finishDramaExpired, forceFinishDrama, photoFinishEndReady } = finishTransitionBypasses({
      inFinishDrama: this._inFinishDrama,
      inPhotoFinish: this._inPhotoFinish,
      inFinishMode: this._inFinishMode,
      finishMomentExpiry: this._finishMomentExpiry,
      ts,
      finishedCount: raceState.finishedCount,
      racerCount: racers.length,
    });
    // 15a-predictive: evaluate the one-shot pre-line gate ONCE, here in update() where the bypass
    // flags live, so the latch is set independent of any transition. Same idiom as
    // forceFinishDrama/finishDramaExpired (all OR-ed into the holdGate check below). The holdGate is
    // bypassed ONLY on entry (top-2 close) — a not-close result sets the latch but leaves
    // minStateHold behaviour untouched. The actual PHOTO_FINISH transition is produced by
    // _pickNextState via the _photoFinishEnterPending flag.
    // The PREDICATE is pure (finishPhase.js); the two latch writes stay here, because a pure
    // function must not assign. `close` implies `evaluated`, so the mapping is exact.
    const photoFinishGate = evaluatePhotoFinishGate({
      gateDone: this._photoFinishGateDone,
      enabled: this._photoFinishEnabled,
      finishedCount: raceState.finishedCount,
      leaderProgress: this._diagLeaderProgress,
      leadProgressThreshold: this._photoFinishLeadProgress,
      racers,
      closeThresholdT: this._photoFinishCloseThresholdT,
    });
    if (photoFinishGate.evaluated) {
      this._photoFinishGateDone = true; // single check — never re-evaluated
    }
    if (photoFinishGate.close) {
      this._photoFinishEnterPending = true; // consumed by _pickNextState to enter PHOTO_FINISH
    }
    const photoFinishGateReady = photoFinishGate.close; // bypass holdGate so the entry is frame-exact
    const prevState = this.state;
    const inBattleZoom = this.state === CAM_STATE.BATTLE_ZOOM;
    // When minHold=0 (same-state repeat), holdGate=0 so _transition() fires every frame
    // until a different state is detected — no stateCap blocker.
    const holdGate = minHold === 0 ? 0 : Math.max(minHold, stateCap);
    // The DECISION is pure and carries its reason; the ACTIONS and every assignment stay here.
    // The two battle predicates keep the original's short-circuit: they are consulted ONLY once
    // BATTLE_ZOOM has held for battleMinDurationMs. Both are pure reads (group resolution +
    // cohesion / P1-P2 tests), so the guard is about cost, not correctness — evaluating them
    // unconditionally would run a group search on every frame of every other state.
    const battleExitEligible = inBattleZoom && stateAge >= this._battleMinDurationMs;
    const decision = decideTransition({
      inBattleZoom,
      inLeaderZoom: this.state === CAM_STATE.LEADER_ZOOM,
      stateAge,
      battleMinDurationMs: this._battleMinDurationMs,
      holdGate,
      originalGroupStillValid: battleExitEligible ? this._isOriginalGroupStillValid(racers) : true,
      battleGroupP2Drifted: battleExitEligible ? this._isBattleGroupP2Drifted(racers) : false,
      leadChangePending: this._leadChangePending,
      finishDramaExpired,
      forceFinishDrama,
      photoFinishGateReady,
      photoFinishEndReady,
    });
    this._lastTransitionReason = decision.reason; // observable; nothing in the camera math reads it
    let _diagTransitioned = decision.action !== TRANSITION_ACTION.NONE;
    if (decision.action === TRANSITION_ACTION.EXIT_BATTLE) {
      this._exitBattle(ts, racers, raceState, canvasW, canvasH);
    } else if (decision.action === TRANSITION_ACTION.TRANSITION) {
      // Pre-set the battle exit timestamp so the cooldown blocks immediate BATTLE re-entry
      // when battleMaxDurationMs expires while hasBattle is still true. This guard used to sit
      // only in the hold-gate branch; folding it in is exact, because the one other reason that
      // reaches here — LEAD_CHANGE_INTERRUPT — requires LEADER_ZOOM and so can never be BATTLE_ZOOM.
      if (inBattleZoom) {
        this._lastBattleExitTs = ts;
      }
      this._transition(racers, ts, raceState, canvasW, canvasH);
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
          // FINISH-MOTION-1 removed a `_inFinishMode ? null : ...` here. It existed to stop the
          // winner's runout dragging the T-anchor past the line, and the finish move has no
          // T-anchor at all now (`_camT` is released at the transition), so this branch cannot be
          // reached in finish mode. The runout constraint is kept structurally instead — the
          // destination is a fixed world point — and is asserted directly by a test.
          fT = fr[0]?.t ?? null;
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
      }
      // FINISH-MOTION-1 removed a second branch here, and the comment on it is the reason this
      // block exists. It claimed the finish "pans from the winner's position to the lookback point
      // IN PARALLEL WITH THE ZOOM-OUT" — an assertion no test could make, and one the owner could
      // see was false: the T-anchor did glide, but the pan the screen showed was not derived from
      // it on the frame that mattered, so the picture stepped 2708 px and only then zoomed. The
      // parallel motion the comment described is now real, and it is the glide, not this lerp.
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
    this._detour?.noteSetTargetsZoom(this.zoom);
    this._setTargets(racers, canvasW, canvasH, raceState, ts);

    // CAMERA-GRAMMAR-1 grammar (B) FULL GLIDE: pan AND zoom travel TOGETHER on ONE bounded ease from the
    // captured entry framing to the (moving) target framing over glideDurationMs. Sharing one ease factor
    // means the zoom-about-anchor invariant holds by construction DURING the glide — the anchor is framed
    // consistently every frame (no instant half, no hybrid, no mid-transition lurch). Lands correctly
    // framed at s=1, then hands off to the steady follow path.
    // CAMERA-DETOUR-2: reset the per-frame branch / glide-progress markers before the branches
    // choose one (read-only diagnosis — records WHICH branch wrote offsetX/offsetY this frame).
    this._detour?.beginFrame();
    if (this._lerpPhase === 'glide') {
      const dur = this._glideDurationActiveMs ?? this._glideDurationMs;
      const s = dur > 0 ? Math.min(1, Math.max(0, (ts - this._glideStartTs) / dur)) : 1;
      const e = s * s * (3 - 2 * s); // smoothstep ease
      this._detour?.noteBranch('glide', s, e);
      this.zoom = this._glideStartZoom + (this.targetZoom - this._glideStartZoom) * e;
      this.offsetX = this._glideStartOffsetX + (this.targetOffsetX - this._glideStartOffsetX) * e;
      this.offsetY = this._glideStartOffsetY + (this.targetOffsetY - this._glideStartOffsetY) * e;
      this._leadChangeSnapPending = false;
      // CAMERA-FRAMING-1: the containment clamp used to run here, claiming to be a no-op mid-glide.
      // It was measured ACTIVE on 23 of 23 glide frames with corrections to −390 px — it had become
      // a rail that steered the pan away from the glide it was interpolating. Gone; the glide now
      // lands exactly where it aimed, which is what `glide lands on its target framing` asserts.
      // (CAMERA-HYGIENE-2: this note used to claim a `clampActiveCount` diagnostic still watched
      // the clamp. Nothing had incremented that counter since the clamp was deleted, so the test
      // that asserted it stayed 0 could not fail. Counter, getters and test are gone.)
      if (s >= 1) this._lerpPhase = 'tracking'; // glide complete → steady follow
    } else if (this._cutSnapPending) {
      this._detour?.noteBranch('cut');
      this._cutSnapPending = false;
      this._leadChangeSnapPending = false;
      this.zoom = this.targetZoom;
      this.offsetX = this.targetOffsetX;
      this.offsetY = this.targetOffsetY;
    } else {
      this._detour?.noteBranch('follow');
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
        // RUNIN-OWNS-1 — THE ANCHOR THE RUN-IN NEEDS, and it is the repair the Stage-1 trace bought.
        //
        // `_focusAnchorRacer` returns null for the group shots (BATTLE, OVERVIEW, PHOTO_FINISH), so
        // the zoom-about-the-anchor correction below is SKIPPED there. That is harmless while their
        // zoom is steady, and fatal while it is moving: the pan target then travels at
        // `worldPos x axisScale x dZoom` per frame while the pan lerp closes only a fraction of it,
        // so the shot trails its own target — measured at 535 -> 1115 px on Luger Hill seed 9,
        // which put EVERY racer off screen for 51 consecutive frames. The pan target was correct on
        // every one of them; only the delivery was late.
        //
        // The run-in moves the zoom continuously and by design, and it does so inside whatever
        // state is running — including PHOTO_FINISH. So while it is composing, the correction needs
        // a world point, and `_framingProbe.anchorPoint` is the one the framing was actually built
        // on. Restoring it took those 51 frames to 0 with nothing else changed.
        //
        // SCOPED TO THE RUN-IN DELIBERATELY. The null is a latent defect everywhere — any future
        // mechanism that moves zoom during a group shot will hit it — but repairing it in general
        // moves both fingerprints with `runInShot` OFF, and "nothing outside the endgame window
        // moves" is a promise this block has to keep. The general case is written down instead.
        const _anchor =
          this._focusAnchorRacer(racers) ??
          (this._runInActive ? this._framingProbe?.anchorPoint : null) ??
          null;
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
    this._detour?.record(this, tSpaceLerpActive, _diagTransitioned, racers);
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

    // Priority 0/1/1.5 — THE FINISH SEQUENCE. What happens next and why is decided in one place
    // (finishPhase.js, pure); every assignment stays here. The three priorities that used to be
    // three separate if-chains are one ordered decision now, and the ORDER is stated there rather
    // than implied by where the blocks happened to sit.
    const finish = decideFinishPhase({
      inPhotoFinish: this._inPhotoFinish,
      inFinishMode: this._inFinishMode,
      photoFinishEnterPending: this._photoFinishEnterPending,
      finishMomentExpiry: this._finishMomentExpiry,
      ts,
      finishedCount: raceState.finishedCount,
      racerCount: ordered.length,
      contendersHome: this._photoFinishContendersHome(racers),
      dramaDurationMs: this._finishDramaDurationMs,
      leaderT: ordered[0]?.t,
      secondT: ordered[1]?.t,
      photoFinishEnabled: this._photoFinishEnabled,
      closeThresholdT: this._photoFinishCloseThresholdT,
    });
    this._lastFinishReason = finish.reason; // observable; nothing in the camera math reads it
    switch (finish.action) {
      case FINISH_ACTION.HOLD:
        // The photo-finish shot holds, the drama window is still running, or FINISH_OVERVIEW has
        // begun and is absolute. In all three, no other transition may fire.
        return null;
      case FINISH_ACTION.END_PHOTO_FINISH:
        this._inPhotoFinish = false;
        this._inFinishMode = true;
        return { nextState: CAM_STATE.OVERVIEW, reason: finish.text, data: {} };
      case FINISH_ACTION.PAUSE_AFTER_PHOTO_FINISH:
        // THE PAUSE, on the photo-finish path. The shot is over — its contenders are home — but the
        // camera HOLDS the same framing for the pulse before the zoom-out begins. Returning the
        // state it is already in makes this a repeat, so nothing re-enters and nothing cuts: it is
        // a pause in the picture, not a new shot. `hudState` reports 'FINISH' from here, which also
        // releases RaceScreen's photo-finish slow motion so the pause and the zoom-out run at
        // normal speed; the winner text has already fired on the frame the shot resolved.
        this._inPhotoFinish = false;
        this._finishMomentExpiry = ts + this._finishDramaDurationMs;
        this._inFinishDrama = true;
        return { nextState: CAM_STATE.PHOTO_FINISH, reason: finish.text, data: {} };
      case FINISH_ACTION.ENTER_PHOTO_FINISH:
        // Two doors, one shot. Only the pre-line door has a pending flag to consume; at the
        // crossing there is none (it is provably already false — see finishPhase.js block 3).
        if (finish.reason === FINISH_REASON.PHOTO_FINISH_PRE_LINE) {
          this._photoFinishEnterPending = false;
        }
        this._inPhotoFinish = true;
        // WHO the shot is following, captured once at entry. Index AND reference, the same dual
        // lookup the battle lock uses: the render path hands out spread-copies every frame so a
        // bare reference does not survive, and a harness racer may carry no index at all.
        this._photoFinishContenders = ordered
          .slice(0, 2)
          .map((r) => ({ index: r.index ?? null, ref: r }));
        return { nextState: CAM_STATE.PHOTO_FINISH, reason: finish.text, data: {} };
      case FINISH_ACTION.ENTER_DRAMA:
        this._finishMomentExpiry = ts + this._finishDramaDurationMs;
        this._inFinishDrama = true;
        return { nextState: CAM_STATE.LEADER_ZOOM, reason: finish.text, data: {} };
      case FINISH_ACTION.END_DRAMA:
        this._inFinishDrama = false;
        this._inPhotoFinish = false;
        this._inFinishMode = true;
        return { nextState: CAM_STATE.OVERVIEW, reason: finish.text, data: {} };
      // FINISH_ACTION.NONE — no finish phase is running; fall through to the normal chain.
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
    // THE ONLY READER of that key, and the one whose meaning is authoritative: it is a DURATION
    // added to the 3 s overview, so the hold ends at START_PHASE_DURATION + the value. It was not
    // the only reader until POST-START-HOLD-UNIFY — `racePlanner.js` read the same key as an
    // absolute time from zero, 3000 ms adrift of this, on a floor no caller ever fed.
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
        // RUNIN-OWNS-1: this branch is untouched by the run-in and must stay that way. The run-in
        // owns the endgame's FRAMING, not its state slot — see `_lineCeiling`. Taking the slot here
        // was the previous shape and it cost the photo finish its slow motion, which RaceScreen
        // triggers off `hudState === 'PHOTO_FINISH'`.
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
          reason: `battle: pulk (arc<=${this._battleGates.closenessT})`,
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
            reason: `comeback: ${_comebackRacer.name ?? _comebackRacer.index} gained ≥${this._comebackGates.minPositionsGained} positions`,
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

    // CEREMONY-HOLD-TARGET-1 — THE RELEASE, and the only place the hand-over ends. The hold lasts
    // until the FIRST VIEW CHANGE, so the test is "the state actually changed", NOT "a transition
    // was committed" and NOT "a state was entered". The start phase forces OVERVIEW, and the
    // director commits an OVERVIEW→OVERVIEW entry inside it: that is not a view change, and
    // releasing on it would end the hold seconds before the picture changes — the same shape of
    // defect as putting the hand-over itself where a race never reaches it.
    if (nextState !== prevState) {
      this._ceremonyHoldZoom = null;
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
        // Hard cut: skip entry lerp — camera snaps to lead-change zoom immediately
        this._lerpPhase = 'tracking';
        this.zoom = this._leadChangeZoom;
        this.targetZoom = this._leadChangeZoom;
      }

      // OVERVIEW: snap zoom immediately to avoid a slow lerp down from the previous zoom state.
      // The finish is the exception and always was — its zoom-out is the authored move above, so it
      // must not hard-cut here.
      //
      // FINISH-MOTION-1 REMOVED THE SECOND HALF OF THIS BRANCH, and it is worth saying why rather
      // than just deleting it. It used to write `_lfEntryByState[OVERVIEW] = tcToLerpFactor(...)` —
      // a SECOND representation of "how long the finish zoom-out takes", expressed as an exponential
      // time-constant on the shared lerp map, next to the duration the glide now owns. Two
      // representations of one intent is the defect family this repair exists to end. It was also a
      // permanent mutation of a shared map: nothing ever restored it, so every later OVERVIEW entry
      // in that race inherited the finish's slow entry TC.
      if (nextState === CAM_STATE.OVERVIEW && !this._inFinishMode) {
        // CAMERA-ZOOM-UNIT-1: OVERVIEW snaps to its TRACK-WIDTHS setting, the same rule the other
        // four states run. What stood here before derived the zoom from a target sprite size
        // divided by `2 x W_ref / racersPerRow`, which made the widest shot in the camera depend
        // on how many racers were in the race — non-monotonically. There is no sprite size and no
        // racer count in this path any more.
        //
        // CEREMONY-HOLD-TARGET-1: the hold is read from ONE place — `_stateCamZoom` — and this snap
        // asks it rather than resolving the hand-over itself. An OVERVIEW re-entry inside the start
        // phase therefore snaps to the framing the ceremony arrived at, not out of it; after the
        // release the hand-over is null and this is OVERVIEW's ordinary setting, exactly as before.
        const snapZoom = this._stateCamZoom();
        this.zoom = snapZoom;
        this.targetZoom = snapZoom;
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

      // FINISH-MOTION-1 removed a `_transitionTargetT = lookbackT` assignment here — the THIRD
      // representation of one intent. The lookback point was expressed as a T-space target (this),
      // as a pan anchor (`_setTargets`), and its duration as an exponential TC on the shared lerp
      // map; the finish move now owns all three as one glide toward one anchor over one duration.
      // The assignment was already inert: the finish-move block below releases `_camT`, and a
      // target for an anchor that does not exist steers nothing.

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
      // THE FINISH MOVE (FINISH-MOTION-1) — ONE motion, not two.
      //
      // What the owner saw: at the crossing the picture jumped several frame-widths toward the
      // pursuers, and only then began to zoom out. Measured before the repair: the pan target moved
      // **2820 px in a single frame** on dirt-oval (144x the median of the frames before it), and the
      // pan then settled in 63 frames while the zoom took 109 — so the two halves neither started
      // together nor ended together.
      //
      // The cause was this exemption. FINISH_OVERVIEW was held out of the transition grammar because
      // it "already had" its own slow zoom-out, which left it on the entry path — where `offsetX` is
      // PINNED to `targetOffsetX` every frame (no pixel lerp, by design) while the target itself
      // steps discontinuously from the outgoing shot's framing to the lookback framing. A pinned
      // offset cannot absorb a moving target; it reproduces it exactly.
      //
      // So the finish move now glides like every other transition — and the glide is the right shape
      // for it, because pan and zoom share ONE ease factor by construction, which is precisely the
      // "at the same time" the owner asked for. It gets its own DURATION rather than its own
      // mechanism: `finishOverviewZoomOutDurationMs`, the knob that has always meant "how long the
      // finish zoom-out takes", now times the whole move. One finish move, one shape, one knob.
      //
      // It is deliberately NOT subject to `transitionGrammar`: a 'cut' finish is not a thing anyone
      // wants, and the finish is an authored moment rather than an ordinary state change.
      const isFinishMove = nextState === CAM_STATE.OVERVIEW && this._inFinishMode;
      if (isFinishMove) {
        // THE DESTINATION IS A FIXED WORLD POINT, so the finish move has no T-space anchor: releasing
        // `_camT` is what makes `_setTargets` take its lookback branch instead of following the
        // camera's track parameter, and it is also HOW THE RUNOUT CONSTRAINT IS KEPT. The winner
        // cannot pull the camera past the line because the winner is not the anchor — the lookback
        // point is. That is stronger than the old arrangement, which followed the leader's T and
        // suppressed him with a `fT = null` special case one function away.
        //
        // `_observerPhase` deliberately stays 'idle'. Setting it to 'follow' (as the ordinary glide
        // does) would switch OVERVIEW's FORWARD framing on, and measurement showed that moves the
        // RESTING frame 108 px off the lookback point — a quarter of the widest shot. The owner's
        // complaint is how the camera GETS there; where it comes to rest must not change.
        this._camT = null;
        this._transitionTargetT = null;
        this._lerpPhase = 'glide';
        this._glideStartTs = ts;
        this._glideStartZoom = _preZoom;
        this._glideStartOffsetX = _preOffsetX;
        this._glideStartOffsetY = _preOffsetY;
        this._glideDurationActiveMs = this._finishOverviewZoomOutDurationMs;
      } else if (this._transitionGrammar !== 'legacy') {
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
          // The duration THIS glide runs on, chosen at its start. One field rather than a knob per
          // sub-motion: the finish move is long and authored, every other transition is short.
          this._glideDurationActiveMs = isFinishMove
            ? this._finishOverviewZoomOutDurationMs
            : this._glideDurationMs;
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
   *
   * WHERE THE NULL BITES, because it is not obvious and it has cost this project a repair
   * (RUNIN-OWNS-1): update()'s zoom-about-the-anchor correction is SKIPPED when this returns null.
   * A group shot whose zoom is steady does not care. A group shot whose zoom is MOVING does — the
   * pan target then runs away from the pan lerp and the frame empties. See `_runInAnchorPoint`.
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
      this._forwardFracNow(),
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
  /**
   * FINISH-PAIR-1: WHO the photo-finish shot frames.
   *
   * The two racers the shot captured at entry, resolved against THIS frame's racer array — the same
   * index-and-reference dual lookup `_photoFinishContenders` is stored with, because the render path
   * hands out spread-copies every frame and a bare reference does not survive one.
   *
   * Falls back to the live top two whenever the pinned pair cannot be produced: the key is off, the
   * shot has no contenders (a state assigned directly in a test, never a real race — the entry always
   * captures two), or one of them cannot be found in this frame's array. The fallback is the old
   * behaviour, so nothing is ever left without a pair.
   *
   * @param {object[]} racers        every racer this frame
   * @param {object[]} focusRacers   `_focusRacers(racers)` — the live top-N by t
   * @returns {[object|null, object|null]}
   */
  _photoFinishFramingPair(racers, focusRacers) {
    const live = [focusRacers[0] ?? null, focusRacers[1] ?? null];
    if (!this._photoFinishContenderFraming) return live;
    const captured = this._photoFinishContenders;
    if (!captured || captured.length !== 2) return live;
    const a = this._findByIndex(racers, captured[0].index, captured[0].ref);
    const b = this._findByIndex(racers, captured[1].index, captured[1].ref);
    return a && b ? [a, b] : live;
  }

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
        // FINISH-PAIR-1: THE SHOT'S OWN CONTENDERS, not the live top two.
        //
        // The comment here used to say "the deterministic top two contesting the line", and that is
        // what `focusRacers` gives you only until somebody crosses. `_focusRacers` re-sorts the
        // WHOLE field by `t` every frame and does not exclude finished racers; `raceCore` coasts a
        // finished racer on a run-out decay rather than freezing it, and a later finisher carries a
        // fresher decay than an earlier one, so it overtakes. The second slot therefore walks
        // BACKWARDS through the finishing order while the shot is still running — and every step
        // moved the pair distance discontinuously, which moved the guarantee, which flipped the
        // binding zoom authority, which lurched the picture. See `photoFinishContenderFraming`
        // in defaults.js for the measurement.
        //
        // The pair is looked up LIVE by index every frame: WHO is fixed, WHERE they are is not.
        const contenders = this._photoFinishFramingPair(racers, focusRacers);
        const a = contenders[0];
        const b = contenders[1];
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
    // CAMERA-COMPANY-ONLY-3: THE SINGLE-ANCHOR STATES ARE NOT BOUNDED BY THE ROAD.
    //
    // LEADER, OVERVIEW and COMEBACK are limited by the owner's own setting and by the COMPANY
    // guarantee, and by nothing else. The corridor used to be their ceiling and it silently overruled
    // his number on six of ten tracks — on Mountainstreet his 1.0 became anything from 300 to 688
    // world px as the road turned, which is the "restless" picture he complained about. His words for
    // why the road lost: THE ROAD IS NOT WHO MATTERS, THE RACERS ARE.
    //
    // Owner-approved 2026-08-05 on `exp/company-only` @ d2ecc27c, mountainstreet seed 5601, having
    // seen BOTH regimes — a torn-apart field where the company guarantee opens the shot wide, and a
    // tight pack where the camera stays at his 1.0.
    //
    // The corridor is still reached from the PAIR branch above when a pair state has fewer than two
    // contenders. Measured: that fallback fired on 0 of 11,813 pair frames across ten tracks, so it
    // is DEFENSIVE, not load-bearing — kept deliberately, and said out loud rather than assumed.
    if (kind !== GUARANTEE.PAIR) return Infinity;

    // WHERE THE ANCHOR WILL SIT, from the framing rule — the same zoom-independent position the
    // company guarantee uses, for the same reason: the corridor runs half a track width to each
    // side of the anchor, so the room that matters is the room from THERE, not the chord through
    // the frame's centre. Reusing `anchorScreenPoint` keeps the two guarantees from disagreeing
    // about where the subject is about to be.
    const at = anchorScreenPoint(
      frameSize.width,
      frameSize.height,
      this._forwardFracNow(),
      this._headingScreen(subjects.t)
    );
    return corridorGuarantee(
      this._headingAt(subjects.t),
      this._trackWidthPx,
      axisX,
      axisY,
      frameSize.width,
      frameSize.height,
      inner,
      at
    );
  }

  /**
   * THE WORLD POINT WHERE THE RACE ENDS.
   *
   * Same open/closed topology question `_finishLookbackT` answers, and answered the same way: a lap
   * count wraps on a loop and clamps on a line. Two laps on a closed track finish where one lap
   * started, so `finishT = 2` is the point at `t = 0`. (Taken from `feat/finish-framed`.)
   *
   * @param {number} finishT
   * @returns {{x:number,y:number}|null}
   */
  _finishLineWorldPoint(finishT) {
    if (!this._shape || !(finishT > 0)) return null;
    const t = this._isOpenTrack ? Math.min(1, finishT) : ((finishT % 1) + 1) % 1;
    return this._shape.getPosition(t, 0);
  }

  /**
   * IS THE RUN-IN'S WINDOW OPEN? From the endgame threshold to the crossing — the two ends are read
   * from things that already exist and neither is new.
   *
   * `endgameThreshold` is the value at which the director has always declared the endgame.
   * `finishedCount === 0` is the crossing: once somebody is home the finish sequence owns the
   * picture (the drama pulse, the photo finish's own hold, then FINISH_OVERVIEW's authored
   * zoom-out on a fixed point behind the line), and a bound that kept opening the shot to hold a
   * line the winner has already crossed would be arguing with an authored move.
   *
   * THE WINDOW IS NECESSARY BUT NO LONGER SUFFICIENT — see `_updateRunIn` for the second condition,
   * which is what makes the run-in start a little later than the window opens.
   *
   * @returns {boolean}
   */
  _runInWindowOpen(racers, raceState) {
    if (!this._runInShot) return false;
    if (!(raceState?.finishT > 0) || (raceState.finishedCount ?? 0) > 0) return false;
    if (!racers || racers.length === 0) return false;
    let maxT = 0;
    for (const r of racers) if (r.t > maxT) maxT = r.t;
    return maxT / raceState.finishT > this._endgameThreshold;
  }

  /**
   * WHERE THE SUBJECT SITS ALONG THE FRAME THIS FRAME — the framing rule's POSITION column, with the
   * run-in's TRAVEL folded in. Six call sites read this; they used to read the table directly, and
   * six copies of one question is how the run-in's answer reached five of them and not the sixth.
   *
   * ── THE RUN-IN GLIDES FROM WIDE-AND-BACK TO THE ORDINARY SHOT (RUNIN-GLIDE-1) ──────────────────
   *
   * The owner's design, and both halves happen at once: the leader starts BEHIND the frame centre,
   * so most of the frame lies toward the finish and the line fits at a modest zoom; then, as he
   * closes, he travels back to his ordinary position while the shot tightens; and at the crossing
   * he is at `leaderForwardFrac` under the state's own zoom — the ordinary shot exactly, so there is
   * no seam to hand over.
   *
   * IT IS ONE INTERPOLATION AND IT INVENTS NO NUMBER. The END of the travel is the state's own
   * answer from the table: `leaderForwardFrac` for a FORWARD state, dead centre for a CENTRED one.
   * The START is that answer MIRRORED about the centre — `1 - end` — which is the same displacement
   * the other way. `leaderForwardFrac` already says how far off centre a subject is placed; this
   * uses it twice and interpolates between.
   *
   * A CENTRED STATE THEREFORE DOES NOT MOVE AT ALL: mirroring 0.5 gives 0.5. That is not a special
   * case, it falls out — and it is why the photo finish keeps its own framing throughout.
   *
   * WHY THE EXCESS THIS REPLACES WAS WORTH REMOVING: measured, a FORWARD anchor left only a third of
   * the frame ahead of the leader toward the line, so the shot had to be 3.01x wider than the
   * distance demands (Searound 2.15x). Starting at the mirror turns that third into two thirds.
   *
   * @returns {number|null} the fraction along the heading, or null for dead centre
   */
  _forwardFracNow() {
    const tableFrac =
      framingFor(this.state).position === POSITION.FORWARD ? (this._leaderForwardFrac ?? 0.5) : 0.5;
    if (!this._runInComposingNow || this._runInProgress === null) {
      return framingFor(this.state).position === POSITION.FORWARD ? this._leaderForwardFrac : null;
    }
    const back = 1 - tableFrac; // the mirror: the same displacement, the other way
    return back + (tableFrac - back) * this._runInProgress;
  }

  /**
   * THE RUN-IN (RUNIN-OWNS-1) — the finish line stays in frame from the endgame threshold to the
   * crossing, whatever shot the director is running.
   *
   * ── IT OWNS THE FRAMING, NOT THE STATE SLOT, AND THAT DISTINCTION IS THE WHOLE DESIGN ──────────
   *
   * The run-in does not compete for the state. It READS whichever state is active and bounds that
   * state's zoom. Two consequences follow, and both are requirements rather than side effects:
   *
   *   THE FINAL PICTURE IS THE STATE'S PICTURE, EXACTLY. Anchor, guarantee, position, slow motion,
   *   `hudState` — none of them are touched. As the leader closes, `room / distance` rises past the
   *   state's own setting, this term stops being the smallest in `_setTargets`'s `Math.min`, and
   *   what is left is the shot that was always there, bit for bit. There is nothing to hand over
   *   and nothing to switch off.
   *
   *   THE PHOTO FINISH IS STILL THE PHOTO FINISH. RaceScreen starts the slow motion on
   *   `hudState === 'PHOTO_FINISH'`. The previous shape of this repair made RUN_IN a camera STATE
   *   that took the endgame slot — which would have suppressed the slow motion outright, and owned
   *   only 14.9%/18.5% of the window in any case, because a shot entered just before the threshold
   *   holds its own gate across it. Reading the states instead of replacing them fixes both at once.
   *
   * ── THE TWO BOUNDS, AND NEITHER IS A NEW NUMBER ───────────────────────────────────────────────
   *
   *   1. THE LINE, which is this function: `pointGuarantee` from the anchor's own place in the
   *      frame to the finish. It drives the shot while the leader is far away.
   *   2. THE ACTIVE STATE'S OWN ZOOM, which is `stateZoom` — already the first term of the
   *      `Math.min` this joins, and therefore not a line of code at all. If a leader shot is
   *      running the run-in closes to the leader zoom and no further; if a photo finish is running
   *      it closes to the photo-finish zoom. That is the same sentence as "never tighter than the
   *      underlying state", said by the machinery rather than by a new rule.
   *
   * It carries no bound of its own at the wide end: `_setTrackTargets` resolves every zoom through
   * `resolveCamera` with `minEffZoom = proj.minEffX()`, the widest the world-to-canvas mapping
   * allows, and a ceiling below that is clamped there whatever this returns. Two wide-end bounds
   * were built and both removed — the field's own extent (never binds on an open track) and
   * OVERVIEW's width (bound so hard it cost the design its point). Bounding at the projection's own
   * minimum measured IDENTICAL to no bound, which is the proof the downstream clamp is the real one.
   *
   * @returns {number} cam.zoom ceiling; Infinity when the run-in is not composing this frame
   */
  _lineCeiling(subjects, frameSize, raceState) {
    if (!subjects?.point) return Infinity;
    const line = this._finishLineWorldPoint(raceState?.finishT ?? 0);
    if (!line) return Infinity;
    // The SAME anchor placement the corridor and company guarantees use, and for the same reason:
    // where the subject sits in frame decides how much room there is toward anything else.
    const at = anchorScreenPoint(
      frameSize.width,
      frameSize.height,
      this._forwardFracNow(),
      this._headingScreen(subjects.t)
    );
    return pointGuarantee(
      subjects.point,
      line,
      this._proj.axisX,
      this._proj.axisY,
      frameSize.width,
      frameSize.height,
      // THE SUBJECT'S SAFE REGION, not the company's margin — RUNIN-MINIMAL-1, and framingRule.js
      // states the rule this follows: `innerFramePct` "exists so the SUBJECT does not cling to the
      // edge ... it keeps doing it for the subject and for both geometric guarantees. Only the
      // company guarantee reads [COMPANY_FRAME_PCT] instead." The finish line is a guaranteed
      // SUBJECT of the run-in, so it takes the subject's region; reading the company margin here
      // was borrowed from the quarry and was the wrong one of the two.
      //
      // IT IS ALSO WHAT "WELL IN FRAME" MEANS, measured. At the company margin the shot is minimal
      // to 1.05x and the line therefore sits ON the edge, where the tracking lag alone — the camera
      // trails its subject, so the anchor lands a few percent of the chord further toward the line
      // than the guarantee assumed — pushes it out on a third of the frames.
      this._innerFramePct ?? DEFAULT_INNER_FRAME_PCT,
      at
    );
  }

  /**
   * THE RUN-IN'S DECISION FOR THIS FRAME: is it composing, and at what ceiling?
   *
   * Sets `_runInComposingNow` — which `_forwardFracNow` reads, so it must run BEFORE any guarantee
   * measures room — and returns the ceiling to join `_setTargets`'s `Math.min`.
   *
   * ── WHY IT STARTS LATER THAN THE WINDOW OPENS (RUNIN-MINIMAL-1) ────────────────────────────────
   *
   * The owner's ruling, in two parts: open only far enough that the finish is WELL in frame and no
   * further; and if that would still mean opening far too wide, the end scenario should simply
   * start a little later.
   *
   * "Too wide" is not a taste question here and needs no number: **the run-in engages when the line
   * can be framed WITHOUT opening wider than the widest shot this camera already composes**, which
   * is OVERVIEW's own width. Until then nothing happens at all — the normal states run exactly as
   * they do with the key off. Measured before this rule, the run-in reached 100% of the world on
   * Searound, because at the endgame threshold a closed track's finish is most of a lap away and
   * "the line in frame" meant "the whole lap in frame".
   *
   * THE ENGAGEMENT LATCHES, ONE WAY. `room / distance` is not perfectly monotone — the room depends
   * on the heading, which turns — so a bare comparison would let the run-in flicker on and off, and
   * each flicker is a jump between a wide shot and a tight one. It only ever needs to fire once: the
   * leader is running at the line and does not go back. The latch is not a tuning number, it is the
   * statement that the run-in is a phase rather than a per-frame test.
   *
   * THE TEST USES THE RUN-IN'S OWN FRAMING, not the outgoing shot's. It asks "can the run-in frame
   * this?", so it must ask under the framing the run-in would use — centred, per `_forwardFracNow`.
   * Asking with the forward bias still on would delay the start by the very factor this block
   * removed.
   *
   * @returns {number} the cam.zoom ceiling for this frame, or Infinity when the run-in is not on
   */
  _updateRunIn(subjects, frameSize, racers, raceState, ts) {
    this._runInComposingNow = false;
    if (!this._runInWindowOpen(racers, raceState)) return Infinity;
    if (!subjects?.point) return Infinity;
    if (!this._runInEngaged) {
      this._runInEngaged = true;
      this._beginRunInGlide(ts);
    }
    this._runInProgress = this._runInProgressOf(racers, raceState);
    this._runInComposingNow = true;
    return this._lineCeiling(subjects, frameSize, raceState);
  }

  /**
   * THE FRONT GROUP — captured once, and only ever smaller afterwards (FRONT-GROUP-1).
   *
   * The owner's ask: the tightening should stop while the whole front group is still in frame, and
   * continue only as they converge. That needs a set of racers that does NOT churn, because
   * FINISH-PAIR-1 is the record of what a set that churns does to the picture — the guaranteed pair
   * was re-sorted every frame and every swap moved the shot discontinuously.
   *
   * SO IT IS CAPTURED, once, on the first frame of the endgame window, and stored as INDICES rather
   * than as racer objects (the object-identity trap: `renderInterpolation` hands the director
   * spread-copies, so a stored reference stops matching). After that the membership can only lose
   * members, as they finish — a monotone retirement, never a reordering.
   *
   * WHO IS IN IT, WITH NO NEW NUMBER. The leader plus everyone within `battlePulkThresholdT` of him
   * in lap-normalised arc, capped at `battleMaxGroupSize`. Both keys ship, and both are already this
   * camera's answer to "are these racers together" — the arc unit exists because world px meant 1.5%
   * of a lap on one track and 4.9% on another (see battleGroup.js). `detectPulkGroup` itself cannot
   * be reused: its third condition demands the frontmost member be at rank 3 or worse, because P1/P2
   * are LEADER territory, so it excludes the front by construction.
   *
   * @returns {Array<{x:number,y:number}>} the surviving members, live objects from THIS frame
   */
  _frontGroupNow(racers, raceState) {
    if (!this._frontGroupFraming) return [];
    if (!racers || racers.length === 0) return [];
    if (this._frontGroupIdx === null) {
      // Not captured yet — capture only once the endgame window is open.
      if (!(raceState?.finishT > 0)) return [];
      let maxT = 0;
      for (const r of racers) if (r.t > maxT) maxT = r.t;
      if (!(maxT / raceState.finishT > this._endgameThreshold)) return [];
      const live = racers.filter((r) => r && !r.finished);
      if (live.length === 0) return [];
      const sorted = [...live].sort((a, b) => b.t - a.t);
      const leader = sorted[0];
      // The SAME two gates the battle group runs on, read from the same object so they cannot drift.
      const idx = [leader.index];
      for (let i = 1; i < sorted.length && idx.length < this._battleGates.maxSize; i++) {
        if (shortestArcDeltaT(leader.t, sorted[i].t) <= this._battleGates.closenessT) {
          idx.push(sorted[i].index);
        }
      }
      this._frontGroupIdx = idx;
    }
    const out = [];
    for (const i of this._frontGroupIdx) {
      const r = this._findByIndex(racers, i, null);
      if (r && !r.finished) out.push(r);
    }
    return out;
  }

  /**
   * THE FRONT-GROUP CEILING — the tightest cam.zoom that still holds the whole captured group.
   *
   * IT IS `companyGuarantee`, NOT A NEW COMPUTATION. That function already answers exactly this
   * question — the tightest zoom at which N racers around an anchor are still inside the frame,
   * measured from where the anchor actually sits, per-axis and orientation-aware. What it could not
   * do is answer it HERE: `_companyCeiling` returns Infinity on every PAIR-guaranteed state, which
   * is BATTLE_ZOOM, LEAD_CHANGE and PHOTO_FINISH — precisely the shots the owner is describing. So
   * this is not a revival of a retired guarantee; the guarantee was never running here at all.
   *
   * CAMERA-COMPANY-1 §5 gave the reason for that exclusion as an argument rather than a measurement:
   * "the pair states already guarantee two named contenders, which IS company", and adding a
   * headcount "would fight a guarantee that is already doing the job ... whenever the field is
   * strung out behind a close duel". The case it did not consider is the one the owner watched: the
   * field NOT strung out, six racers nearly level, of whom the pair guarantee protects two and says
   * nothing about the other four.
   *
   * `minVisible` is `group.length + 1` so that ALL of them are held: `companyGuarantee` subtracts
   * one for the anchor itself, and the anchor here (a pair midpoint, or the leader) is not
   * necessarily a member, so every member must be counted as company.
   *
   * @returns {number} cam.zoom ceiling; Infinity when nothing constrains
   */
  _frontGroupCeiling(subjects, racers, frameSize, raceState) {
    if (!this._frontGroupFraming || !subjects?.point) return Infinity;
    const group = this._frontGroupNow(racers, raceState);
    if (group.length === 0) return Infinity;
    const at = anchorScreenPoint(
      frameSize.width,
      frameSize.height,
      this._forwardFracNow(),
      this._headingScreen(subjects.t)
    );
    // COMPANY_FRAME_PCT for the same reason `_companyCeiling` uses it: a guaranteed companion needs
    // to be visible with a margin, not inside the subject's own safe region.
    return companyGuarantee(
      subjects.point,
      group,
      group.length + 1,
      this._proj.axisX,
      this._proj.axisY,
      frameSize.width,
      frameSize.height,
      COMPANY_FRAME_PCT,
      at
    );
  }

  /**
   * THE ENGAGEMENT IS A GLIDE, and it has to be (RUNIN-GLIDE-1).
   *
   * On the frame the run-in engages, the framing it asks for changes discontinuously in BOTH
   * quantities at once: the zoom opens by however much the line requires — measured at up to 6.5x on
   * space-sprint, where the finish is most of the track away at the endgame threshold — and the
   * anchor steps from its forward place to its mirrored one. Left to the ordinary tracking lerp,
   * pan and zoom ease independently and the frame goes EMPTY for a handful of frames while they do:
   * 93 such frames across ten tracks, every one of them at run-in progress 0.006-0.016, i.e. the
   * engagement itself and nothing else.
   *
   * MEASURED WHICH STEP CAUSED IT, rather than assumed. With the anchor travel disabled and only the
   * zoom step left, the count was 95 — no better. **The zoom step is the whole of it**, and the
   * anchor travel is free: it costs nothing in emptiness and it lifts the line's in-frame share from
   * 90.1% to 95.3% and brings the line into shot 0.4 s -> 0.2 s after the window opens.
   *
   * SO THIS USES THE MECHANISM THE PROJECT ALREADY HAS FOR EXACTLY THIS. `docs/DEAD-ENDS.md` §M
   * states the lesson in one line: *the glide is what makes a big zoom change safe — it moves pan
   * and zoom on ONE ease, so the anchor is framed consistently by construction*, and master performs
   * a LARGER zoom change than this at the PHOTO_FINISH seam inside a glide for free. The run-in is
   * not a state, so no transition fires to start one; this starts the same glide by hand, on the
   * same `glideDurationMs` every other transition uses. **No new number** — and it is the only
   * remaining reason the run-in may open as far as the line actually requires rather than being
   * capped.
   *
   * It is deliberately ONE-SHOT, guarded by the same latch that makes the run-in a phase: a glide
   * restarted every frame is not an ease, it is a rail.
   *
   * ── IT HAS ITS OWN DURATION, AND THE BORROWING BEFORE IT WAS A MISTAKE ────────────────────────
   *
   * The owner watched it at `glideDurationMs` and called it HECTIC — measured on ice-track, cam.zoom
   * fell 4.549 -> 1.000 in about half a second, the pace of an ordinary state change and not of an
   * authored move. It then borrowed `finishOverviewZoomOutDurationMs` for one day, which was wrong
   * for a reason worth keeping: that key paces the zoom-out AFTER the crossing, a shot the owner has
   * already accepted at its present length. One value for two motions that happen at different
   * moments for different reasons means tuning either moves the other, and it put a settled value at
   * risk to change an unsettled one.
   *
   * `runInOpenMs` is its own key now, beside that zoom-out in the ending controls.
   */
  _beginRunInGlide(ts) {
    if (!this._shape) return;
    this._lerpPhase = 'glide';
    this._glideStartTs = ts;
    this._glideStartZoom = this.zoom;
    this._glideStartOffsetX = this.offsetX;
    this._glideStartOffsetY = this.offsetY;
    this._glideDurationActiveMs = this._runInOpenMs;
  }

  /**
   * THE ONE PROGRESS MEASURE the run-in runs on: the leader's remaining distance to the line, as a
   * fraction of the distance he had at engagement. 0 at the endgame threshold, 1 at the line.
   *
   * MEASURED ALONG THE TRACK, NOT ACROSS THE GROUND, and that is the honest choice rather than the
   * obvious one. `pointGuarantee` needs the straight-line distance because it is asking what fits in
   * a rectangle; a PROGRESS measure must be monotone, and the straight-line distance is not — on a
   * closed track the leader can be euclidean-near the finish and still m ost of a lap from it, and it
   * wobbles as the track turns. Along the track it is `leaderProgress`, which is the same quantity
   * `endgameThreshold` is written in — so this is 0 exactly where the window opens and 1 exactly at
   * the line, with no captured reference and no new number.
   *
   * IT NEVER RUNS BACKWARDS. `_runInProgress` is clamped monotone, which is the one-way latch doing
   * its real job: the anchor's travel toward its ordinary place must be a journey, not a negotiation,
   * and a measure that dipped would walk the leader back across the frame in view.
   *
   * @returns {number} 0..1
   */
  _runInProgressOf(racers, raceState) {
    let maxT = 0;
    for (const r of racers) if (r.t > maxT) maxT = r.t;
    const p = maxT / raceState.finishT;
    const span = 1 - this._endgameThreshold;
    const raw = span > 0 ? (p - this._endgameThreshold) / span : 1;
    const s = raw < 0 ? 0 : raw > 1 ? 1 : raw;
    return this._runInProgress === null ? s : Math.max(this._runInProgress, s);
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
      this._forwardFracNow(),
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
   * THE FIELD GUARANTEE, CARRIED PAST THE GUN — CEREMONY-HANDOVER-1 (b).
   *
   * THE DEFECT IT ENDS, in the owner's words: the camera "zooms out again and moves the focus so far
   * while zooming out that for a short time we can no longer see all the racers". At the gun the
   * ceremony's promise simply stopped and the COMPANY guarantee took over — five racers instead of
   * forty — so the very next move was free to drop the other thirty-five out of frame, immediately
   * after a shot that had just shown everyone.
   *
   * IT IS THE COMPANY GUARANTEE WITH THE WHOLE FIELD AS ITS COMPANY. Not a new geometry: the same
   * `companyGuarantee`, at the same anchor, through the same `roomFromPointAlong`, with `minVisible`
   * set past the end of the field so the tightest ceiling — the FARTHEST racer — is the one returned.
   * That matters for more than economy. The ceremony's own `fieldGuarantee` measures from the
   * formation's CENTRE, which is exactly right while the camera is centred on the formation and
   * exactly wrong afterwards: during the race the camera sits on the leader, forward-framed, and a
   * promise measured from the centre would under-widen by the whole of that offset and drop the back
   * of the field — the defect, rebuilt inside its own fix.
   *
   * A CEILING, SO IT WIDENS AND NEVER STEERS (Lesson 192). It joins the existing `Math.min` beside
   * the other two. It cannot move a centre, choose an anchor or read a clock.
   *
   * @returns {number} cam.zoom ceiling, or Infinity once the guarantee has retired
   */
  _fieldCeiling(subjects, racers, frameSize) {
    if (!this._fieldGuaranteeActive) return Infinity;
    if (!subjects?.point || !Array.isArray(racers) || racers.length === 0) return Infinity;
    const at = anchorScreenPoint(
      frameSize.width,
      frameSize.height,
      this._forwardFracNow(),
      this._headingScreen(subjects.t)
    );
    // `racers.length + 1` asks for more company than exists, and `companyGuarantee` answers that by
    // taking what exists — the tightest ceiling in the list, which is every racer in frame.
    const ceiling = companyGuarantee(
      subjects.point,
      racers,
      racers.length + 1,
      this._proj.axisX,
      this._proj.axisY,
      frameSize.width,
      frameSize.height,
      COMPANY_FRAME_PCT,
      at
    );

    // ── RETIREMENT ───────────────────────────────────────────────────────────────────────────────
    // IT RETIRES WHEN IT CAN NO LONGER BE KEPT, and the measure of "kept" is the camera's own widest
    // named shot. OVERVIEW is defined in this project as the same shot at the widest setting — the
    // widest framing the design admits and the owner sets. A guarantee demanding more than that is
    // asking for a picture this camera does not have a name for; carrying on would quietly make
    // every state a de-facto OVERVIEW and replace the whole vocabulary with one shot.
    //
    // FROM GEOMETRY, NEVER FROM A CLOCK. Both sides are zooms: one falls out of where the racers
    // actually are, the other is the owner's OVERVIEW setting. No timer, no lap count, no field size
    // appears in it — a tight field keeps its guarantee for longer than a scattered one on the same
    // track, which is the behaviour asked for.
    //
    // LATCHED, one way. A field that re-converges — after a crash-back, or a lap boundary on a
    // closed track — would otherwise re-impose the wide shot mid-race and the picture would breathe
    // in and out. Retirement is a statement about the START being over, and the start does not
    // resume.
    if (!(ceiling >= this._overviewStateZoom)) {
      this._fieldGuaranteeActive = false;
      this._fieldGuaranteeRetiredAt = subjects.t ?? null;
      return Infinity;
    }
    return ceiling;
  }

  /**
   * CAMERA-FOCUS-3 leader forward-framing. Shifts a pan target along the leader's motion tangent so he
   * lands at screen fraction `_forwardFracNow()` along the motion axis. Above 0.5 that is FORWARD, the
   * trailing pack filling the rest of the frame (the action is behind the leader); RUNIN-GLIDE-1 also
   * drives it BELOW 0.5, placing him behind centre so the frame carries the finish ahead of him.
   * Returns the target unchanged when disabled, when the shape/T is missing, or the tangent degenerate.
   *
   * @param {{x:number,y:number}} pos   the un-biased pan target (leader's smoothed world position)
   * @param {number|null} leaderT       the leader's track T
   * @param {number} effZoomX           effective world→screen zoom on the X axis for this state
   * @param {number} effZoomY           effective world→screen zoom on the Y axis for this state
   * @param {number} frameW             canvas width in px
   * @param {number} frameH             canvas height in px
   */
  _applyLeaderForwardBias(pos, leaderT, effZoomX, effZoomY, frameW, frameH) {
    // RUNIN-GLIDE-1: the SAME fraction the guarantees measured their room with. It travels during
    // the run-in, and it can be BELOW 0.5 there — the leader sits behind centre so the frame carries
    // the finish ahead of him.
    const frac = this._forwardFracNow();
    if (frac == null || leaderT == null || !this._shape || !(effZoomX > 0) || !(effZoomY > 0))
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
    const worldBias = ((frac - 0.5) * span) / sLen;
    // A NEGATIVE bias is legal now and is the whole of the run-in's opening placement. The old guard
    // here was `worldBias > 0`, which silently discarded exactly that case; it read as a degenerate
    // check and was in fact a one-way valve.
    if (!Number.isFinite(worldBias) || worldBias === 0) return pos;
    // shift the pan CENTRE backward along motion → the leader appears forward on screen
    return { x: pos.x - dx * worldBias, y: pos.y - dy * worldBias };
  }

  /** CAMERA-DETOUR-1: completed per-transition windows captured while cameraDetourLog was on. */
  exportDetourLog() {
    return this._detour?.export() ?? [];
  }

  /** CAMERA-FOCUS-4 LIVE TRUTH: the RESOLVED transition grammar this director is running. */
  get transitionGrammar() {
    return this._transitionGrammar;
  }

  /** CAMERA-FOCUS-4 LIVE TRUTH: resolved leader forward-framing fraction (null when centred). */
  get leaderForwardFrac() {
    return this._leaderForwardFrac;
  }

  /**
   * Which racers are in a BATTLE right now — this director's gates applied to the group rules in
   * battleGroup.js. PUBLIC because the render path asks the same question for the battle-focus
   * darkening, and a render file reaching into a `_private` method is how the mint tripwire's
   * motivating case started.
   * @param {Array<{t:number}>} racers
   * @returns {Array|null} the group frontmost-first, or null when no group qualifies
   */
  detectBattleGroup(racers) {
    return detectPulkGroup(racers, this._battleGates);
  }

  /** Alias kept for the diagnostics mixin and the existing tests. */
  _detectPulkGroup(racers) {
    return this.detectBattleGroup(racers);
  }

  /** True when a qualifying BATTLE group exists. */
  _isPulk(racers) {
    return this.detectBattleGroup(racers) !== null;
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
   * Q3 exit condition: is the group the camera locked onto still a group? Returns true for a
   * missing or under-size stored group so a test that sets `state` directly never gets a spurious
   * early exit — it falls back to "is there any pulk at all".
   * @param {Array} racers
   * @returns {boolean}
   */
  _isOriginalGroupStillValid(racers) {
    const stored = this._battleGroupRacerIndices;
    if (!racers || !stored?.length || stored.length < 3) return this._isPulk(racers);
    const group = this._findGroupRacers(racers);
    if (group.length < stored.length) return false; // somebody left the field entirely
    return groupStillCohesive(group, this._battleGates.closenessT);
  }

  /** True once a member of the locked BATTLE group has climbed into P1 or P2 — an exit trigger. */
  _isBattleGroupP2Drifted(racers) {
    return groupHoldsP1OrP2(racers, this._battleGroupRacerIndices);
  }

  /** Stable racer lookup that survives renderInterpolation's per-frame spread-copies. */
  _findByIndex(racers, idx, fallbackRef) {
    return findByIndex(racers, idx, fallbackRef);
  }

  /** The stored battle group, resolved to this frame's live racer objects. */
  _findGroupRacers(racers) {
    return resolveGroup(racers, this._battleGroupRacerIndices, this._battleGroupRacers);
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
    // RUNIN-PACE-1 §2, read-only. `resolveCamera` is the LAST authority on width and it only ever
    // LOOSENS — it steps the zoom down 10% at a time until the pan target lands inside
    // `innerFramePct`, or until the projection floor. It is therefore a width REQUEST like any
    // ceiling, and until now the only one that could not be seen. Recorded so a trace can say
    // whether the shot is wide because a guarantee asked or because the fit could not be made.
    this._resolveProbe = {
      requested: stateCamZoom,
      resolved: this.targetZoom,
      wasZoomAdapted: zoomResolved.wasZoomAdapted,
      wasClamped: zoomResolved.wasClamped,
      targetInInnerFrame: zoomResolved.targetInInnerFrame,
    };

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
  _setTargets(racers, canvasW, canvasH, raceState, ts = this._lastTs ?? 0) {
    const focusRacers = this._focusRacers(racers);
    const frameSize = { width: canvasW, height: canvasH };
    const framing = framingFor(this.state);
    const stateZoom = this._stateCamZoom();

    // ── WHO ────────────────────────────────────────────────────────────────────────────────────
    const subjects = this._framingSubjects(racers, focusRacers);
    let panTarget = subjects.point;
    let headingT = subjects.t;
    let pinAcross = true;

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
    // FINISH-COMPANY-1 — the COMPANY guarantee retires once the company is home.
    //
    // The promise is "do not show emptiness": it widens the shot to keep `minRacersVisible` racers
    // in frame so a tight shot never goes empty. At the finish that promise inverts. FINISH_OVERVIEW
    // holds a FIXED point behind the line while `companyGuarantee` counts only racers who have NOT
    // finished — so with 38 of 39 home, a promise about a full screen is being computed against one
    // back-marker, and the camera widens for him alone. Measured on the owner's marked race: the
    // shot came to rest, held for 96 frames, then drifted from 4.5489 to 2.9752 over 54 frames.
    //
    // So it stops applying once the leader plus his `minRacersVisible` are across: at that point the
    // company the promise exists to guarantee is, literally, already home. His proposal, his number.
    //
    // WHY NOT "count finished racers as company", which sounds more principled: MEASURED AND WORSE.
    // The anchor is `finishOverviewLookbackPx` BEHIND the line, so finished racers run out AWAY from
    // it just as stragglers fall back from it — including them widened the shot MORE (2.8760 on
    // city-circuit, 2.8443 on dirt-oval) rather than satisfying the promise. The idea that it
    // "resolves itself" is wrong, and the fixed anchor is why.
    //
    // Scoped to `_inFinishMode` deliberately: during the race nothing is finished, so this branch
    // cannot fire, and the guarantee everywhere else is untouched.
    const _companyIsHome =
      this._inFinishMode && (raceState?.finishedCount ?? 0) >= 1 + this._minRacersVisible;
    // RUNIN-MINIMAL-1: FIRST, because `_forwardFracNow` reads the answer and every guarantee below
    // measures its room from the anchor that answer places.
    const _runInCeiling = this._updateRunIn(subjects, frameSize, racers, raceState, ts);
    // EVERY TERM NAMED, so the probe below can say WHICH ONE decided the width instead of leaving a
    // reader to infer it from the total. `Math.min` over an object's values is the same computation
    // it always was — this only stops the answer being unrecoverable one line after it is produced.
    const _ceilings = {
      state: stateZoom,
      guarantee: this._guaranteeCeiling(subjects, frameSize),
      company: _companyIsHome ? Infinity : this._companyCeiling(subjects, racers, frameSize),
      // CEREMONY-HANDOVER-1: the ceremony's promise, still standing. Infinity once it has retired,
      // so this line costs nothing for the rest of the race.
      field: this._fieldCeiling(subjects, racers, frameSize),
      // RUNIN-OWNS-1: the run-in. Infinity outside the endgame window, so this line costs nothing
      // for the rest of the race either — and INSIDE the window it is one more ceiling among the
      // others, which is why the shot it hands back at the line is bit-for-bit the state's own.
      // `stateZoom` above IS the run-in's second bound; it needed no code.
      line: _runInCeiling,
    };
    // FRONT-GROUP-1: THE FRONT GROUP BOUNDS THE TIGHTENING, AND ONLY THE TIGHTENING.
    //
    // Computed after the others because it is FLOORED by what they have already asked for. A ceiling
    // is a maximum cam.zoom, so a SMALLER ceiling is a WIDER shot, and the front group's ceiling is
    // smaller than the photo finish's by construction — that is the whole mechanism: it stops the
    // close at the width that still holds the group.
    //
    // "IT MUST NEVER WIDEN THE SHOT BEYOND WHAT IS ALREADY ASKED FOR" is therefore not a clamp
    // against THIS frame's other ceilings — against those it would be a no-op, since it only ever
    // does anything when it is the smallest of them. It is a clamp against the WIDEST WIDTH THE
    // ENDING HAS ALREADY REACHED: `_frontGroupFloor`, the running minimum of the other ceilings
    // since the window opened. The front group may hold the shot anywhere between the ordinary shot
    // and the width the camera has already shown, and may not open it one pixel further. No new
    // number: the bound is a width this ending already delivered.
    //
    // Where the group is genuinely too spread to hold even at that width, the floor binds instead,
    // the picture is exactly what it would have been, and the harness COUNTS the frame — rather than
    // the camera opening to the world to keep a promise it cannot keep.
    //
    // It cannot fight the line guarantee, for the reason nothing here fights anything: this is a
    // Math.min over ceilings, so the widest ask wins and the rest are simply not binding. Early in
    // the run-in the line is far wider and this is inert; as the leader closes, the line's ceiling
    // rises past this one and THIS becomes the binding term — which is exactly the moment the owner
    // is describing, the tightening that used to continue all the way to the photo-finish zoom.
    const _othersMin = Math.min(
      _ceilings.state,
      _ceilings.guarantee,
      _ceilings.company,
      _ceilings.field,
      _ceilings.line
    );
    // IT RETIRES AT THE FIRST CROSSING, which is `_runInWindowOpen`'s own rule and its own reason:
    // once somebody is home the finish sequence owns the picture — the drama pulse, the photo
    // finish's hold, then FINISH_OVERVIEW's authored zoom-out on a fixed point behind the line — and
    // a bound still arguing about who is in frame is arguing with an authored move.
    //
    // IT WAS MEASURED FIRST, and the first two retirements tried were both wrong. Retiring where the
    // COMPANY guarantee retires (FINISH-COMPANY-1's `_companyIsHome`) fixed that block's two tests
    // and left the real defect: with four of twenty home the bound is computed against whoever of
    // the captured group is STILL COMING, and it tightens onto them while the finish shot is aimed
    // elsewhere — 84 frames with no racer on screen at all on luger-hill seed 9, climbing zoom 1.4 →
    // 2.5 as it chased. Not retiring at all was worse. The crossing is the honest line, and it is
    // also where the owner's complaint stops: the tightening he watched happens on the APPROACH.
    //
    // AND THE RELEASE IS A GLIDE, for the reason RUNIN-GLIDE-1 already paid for. Retiring it as a
    // STEP is a discontinuous framing change in the middle of a state — the ceiling went 1.33 to
    // Infinity on one frame, the target jumped 1.33 to 4.00, and the pan could not follow the zoom:
    // 29 frames with nothing on screen on luger-hill seed 9. That is the same failure, with the same
    // cause and the same cure, as the run-in's ENGAGEMENT: pan and zoom must travel together on one
    // ease or the frame empties while they argue. The engagement glide is reused rather than copied.
    const _frontRetires = (raceState?.finishedCount ?? 0) > 0;
    if (_frontRetires && this._frontGroupWasBinding && !this._frontGroupReleased) {
      this._frontGroupReleased = true;
      this._beginRunInGlide(ts);
    }
    const _frontRaw = _frontRetires
      ? Infinity
      : this._frontGroupCeiling(subjects, racers, frameSize, raceState);
    if (_frontRaw < Infinity) {
      this._frontGroupFloor =
        this._frontGroupFloor === null ? _othersMin : Math.min(this._frontGroupFloor, _othersMin);
    }
    _ceilings.frontGroup =
      this._frontGroupFloor === null ? _frontRaw : Math.max(_frontRaw, this._frontGroupFloor);
    // Recorded so the harness can say "the group was too spread here" instead of inferring it.
    this._frontGroupClamped = _frontRaw < _ceilings.frontGroup;
    const guaranteed = Math.min(_othersMin, _ceilings.frontGroup);
    // ── RUNIN-PACE-1 §3: A TIGHTEN-RATE LIMIT WAS BUILT HERE AND MEASURED OUT ───────────────────
    //
    // The candidate was sound in principle: every ceiling is a LOWER BOUND ON WIDTH, so approaching
    // one more slowly from the wide side can never violate it and `Math.min` keeps its meaning —
    // unlike the blend that was rejected before it. It was built, and it fails on a requirement that
    // sits beside it: **the shot at the crossing must be the ordinary shot.**
    //
    // A rate limit IS a delay in arriving, and the crossing is exactly where the arrival is due. The
    // two are in direct conflict, and the measurement is not close (worst crossing zoom against the
    // feature being off, ten tracks):
    //
    //     no limit                    3.58%      corner reversal 221 px
    //     limit at the derived rate  23.83%      corner reversal 192 px
    //     limit at half that rate    55.30%      corner reversal  96 px
    //     paced to arrive at the line 7.91%      corner reversal  96 px
    //
    // So the rate that is derivable from `runInOpenMs` barely moves the corner, and every rate that
    // does move it costs the crossing shot by an order of magnitude. Reported rather than forced —
    // see reports/evolution/RUNIN-PACE-1.md §3 for the full study and the rate curves.

    // READ-ONLY PROBE (CAMERA-ANCHOR-TRUTH-1 §4a). The framing inputs this frame actually used, so
    // the corridor measurement reads the REAL path instead of reconstructing it — a harness that
    // measures a COPY is the failure mode this repo has hit six times. Written every frame and read
    // by NOTHING in the camera, so it cannot move a fingerprint.
    // RUNIN-OWNS-1: WHICH BOUND WON, recorded rather than inferred. The anchor decision in update()
    // reads `runInBinding`, and the harness reads all three to report where each bound binds — a
    // bound nobody has seen bind is a comment, and this is how that stays checkable.
    this._runInActive = this._runInComposingNow;
    this._runInBinding = this._runInActive && guaranteed >= _runInCeiling - 1e-12;
    let _binding = 'state';
    for (const k of Object.keys(_ceilings)) if (_ceilings[k] < _ceilings[_binding]) _binding = k;
    this._frontGroupWasBinding = _binding === 'frontGroup';
    this._framingProbe = {
      ceilings: _ceilings,
      binding: _binding,
      t: subjects.t,
      runInActive: this._runInActive,
      runInBinding: this._runInBinding,
      runInCeiling: _runInCeiling,
      frontGroupRaw: _frontRaw,
      frontGroupFloor: this._frontGroupFloor,
      frontGroupClamped: this._frontGroupClamped,
      frontGroupSize: this._frontGroupIdx === null ? 0 : this._frontGroupIdx.length,
      stateBinding: guaranteed >= stateZoom - 1e-12,
      frameW: frameSize.width,
      frameH: frameSize.height,
      stateZoom,
      guaranteed,
      point: subjects.point, // the anchor world point (§4b: is its BODY inside, or just its centre?)
      pair: subjects.pair, // the two guaranteed contenders, when the state guarantees a pair
    };

    // ── WHERE IN FRAME: from the principle, not from a slider ──────────────────────────────────
    // The three world points either side of the two authorities that MOVE the anchor are recorded
    // on the probe (see above). A trace can then say which authority spent which world pixel
    // instead of inferring it from the total — the question CEREMONY-REGRESSION-BISECT-1 could only
    // answer by patching a throwaway copy of this file, which is the failure mode the probe exists
    // to remove. Read by nothing in the camera.
    const anchorPoint = panTarget;
    // RUNIN-MINIMAL-1: THE SAME helper the guarantees above measured their room with. It has to be
    // the same one: if the bias still fired here while the guarantees assumed it did not, every
    // guarantee would size the shot for an anchor that is not where the pan puts it — which is
    // precisely the promise-vs-delivery gap CAMERA-ANCHOR-TRUTH-1 exists to close.
    if (this._forwardFracNow() !== null && this._observerPhase === 'follow') {
      panTarget = this._applyLeaderForwardBias(
        panTarget,
        headingT,
        this._proj.effX(guaranteed),
        this._proj.effY(guaranteed),
        canvasW,
        canvasH
      );
    }
    const afterBias = panTarget;

    // ── AND ACROSS IT: shift off the centreline only when a guaranteed subject needs it ────────
    panTarget = this._applyLateralGuarantee(panTarget, headingT, subjects, guaranteed, frameSize);
    this._framingProbe.anchorPoint = anchorPoint;
    this._framingProbe.afterBias = afterBias;
    this._framingProbe.afterLateral = panTarget;

    this._setTrackTargets(panTarget, guaranteed, frameSize);
  }

  /** The per-state zoom setting, in cam.zoom. One lookup, so no state can silently borrow another's. */
  _stateCamZoom() {
    switch (this.state) {
      case CAM_STATE.OVERVIEW:
        // START-CEREMONY-CAMERA-1 (d) / CEREMONY-HOLD-TARGET-1 — THE HOLD, on the path a race
        // actually takes. `_setTargets` calls this EVERY frame, so for the duration of the hold the
        // framing the ceremony arrived at is the state's TARGET — not merely the value the camera
        // was left sitting at when the gun went. It used to be applied in `_transition` only, which
        // a race never reaches at the gun (the director is already in OVERVIEW, so there is no
        // transition to make): the ceremony set `this.zoom`, the state kept asking for its own
        // setting, and the camera glided away from the ceremony framing from the first frame — in
        // zoom, and ACROSS the track with it, because the pan is resolved against the world edge AT
        // THE ZOOM and a wider frame is clamped harder. One number, two axes of drift.
        //
        // IT IS A DESIRED ZOOM, NOT A FREEZE. This value goes into `_setTargets`, which combines it
        // with the guarantees through `Math.min` — so CORRIDOR, COMPANY and the ceremony's own FIELD
        // guarantee can still WIDEN it as the field spreads, and nothing can narrow it. A guarantee
        // widens, it never steers (Lesson 192), and the hold is on the widening side of that
        // Math.min by construction. That is also what makes the hold the ceremony's RULE rather than
        // its frozen picture: as the grid strings out, the field guarantee is what opens the shot,
        // which is the same computation the ceremony framed the grid with.
        return this._ceremonyHoldZoom ?? this._overviewStateZoom;
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
   * THE VENUE SHOT — the whole track in frame (START-CEREMONY-CAMERA-1 (a)).
   *
   * Derived from the track's own extent, not from a corridor setting. The old countdown opened at
   * `countdownStartCorridors` (OVERVIEW × 2), a number in track WIDTHS, which says nothing about
   * whether the track is in shot: on a large world it fell short and on a small one it asked for
   * more world than exists.
   *
   * The cam.zoom that fits the world box is the smaller of the two axis fits, and the projection's
   * clamp has the last word. On a CLOSED track that clamp is not reached — `axisX` is
   * `canvasW / worldW` by construction, so the fit lands exactly on `minCamZoom` 1.0 and the whole
   * track is genuinely in frame.
   *
   * ON AN OPEN TRACK IT IS REACHED, AND THAT LIMIT IS WORTH NAMING RATHER THAN HIDING. The open
   * projection maps at a uniform OPEN_TRACK_BASE_ZOOM with `minCamZoom = worldFitX`, so the widest
   * shot it allows shows 1/1.5 of the world width — about 67%. The venue shot on an open track is
   * therefore "as wide as this camera can go", not "the whole world". Going wider would mean
   * changing the open-track projection, which would move every other shot with it.
   *
   * @returns {number} cam.zoom for the venue shot
   */
  _venueCamZoom(canvasW = CANVAS_W, canvasH = CANVAS_H_REF) {
    const proj = this._proj;
    const worldW = Math.max(1, this._worldBounds.maxX - this._worldBounds.minX);
    const worldH = Math.max(1, this._worldBounds.maxY - this._worldBounds.minY);
    const fit = Math.min(canvasW / (worldW * proj.axisX), canvasH / (worldH * proj.axisY));
    return proj.clampCamZoom(fit);
  }

  /**
   * THE TARGET — the largest cam.zoom at which EVERY racer is still in frame
   * (START-CEREMONY-CAMERA-1 (c)).
   *
   * It is `fieldGuarantee`: the one guarantee computation applied to the formation's own extent.
   * There is no track name, no field size and no constant in it — a small grid comes out tight and a
   * large one comes out wide because the two formations are different sizes.
   *
   * `innerFramePct` is applied, so "in frame" means the same safe region every other guarantee in
   * this camera means by it, rather than the literal canvas edge — a racer whose CENTRE is one pixel
   * inside the frame is cropped in the picture, and this is the project's existing answer to that.
   *
   * @returns {number} cam.zoom; the projection's clamp has the last word
   */
  _ceremonyTargetCamZoom(racers, centre, canvasW = CANVAS_W, canvasH = CANVAS_H_REF) {
    const ceiling = fieldGuarantee(
      racers,
      centre,
      this._proj.axisX,
      this._proj.axisY,
      canvasW,
      canvasH,
      this._innerFramePct
    );
    return this._proj.clampCamZoom(ceiling);
  }

  /**
   * THE CEREMONY'S SCHEDULE for this field — the one place its four beats and its total length are
   * decided (START-BOARD-2).
   *
   * PUBLIC, because three things outside the camera need the same answer and must not compute their
   * own: RaceScreen's phase advance (when the gun fires), the renderer (when the board is up and
   * what the digits read), and both fingerprint harnesses (how long to drive the countdown). The
   * previous arrangement had each of them reading a flat `countdownDurationMs`, which is how the
   * beats came to be capped by a number that knew nothing about them.
   *
   * @param {Array} racers  the field — its SIZE sets the board's duration
   */
  ceremonySchedule(racers) {
    return ceremonySchedule(
      this._ceremonyVenueMs,
      this._ceremonyPushMs,
      this._ceremonySettledMs,
      boardDurationMs(racers?.length ?? 0, this._startBoardFloorMs, this._startBoardMsPerName),
      // CEREMONY-TRUTH-1: THE FIFTH ARGUMENT, AND ITS ABSENCE WAS THE BUG. This call passed four,
      // so `countdownMs` took its default of 0 — and this schedule is what fires the gun, while the
      // renderer built its own WITH the digits. The renderer therefore opened the digit window at
      // `countdownStartMs`, which without the digits in the total is the same instant the gun fires.
      // Zero frames of countdown, from two schedules that were never compared.
      this._countdownDigitsMs,
      // CEREMONY-OPENING-1: the SIXTH argument, and it is zero unless somebody has said there is a
      // brand to show. The director cannot know that — a brand profile is storage, not camera — so
      // RaceScreen tells it once at race init through `setCeremonyBrandActive`. Left alone it is
      // false, which is what every headless harness wants: no brand, no card, no beat.
      this._ceremonyBrandActive ? this._ceremonyBrandMs : 0
    );
  }

  /**
   * Whether this race opens on a brand card. Set ONCE, at race init, by whoever knows.
   *
   * It is a setter rather than an argument to `ceremonySchedule` because five callers ask for that
   * schedule and only one of them has any idea what branding is; making them all carry the flag
   * would put the answer in five places and guarantee they disagree.
   */
  setCeremonyBrandActive(active) {
    this._ceremonyBrandActive = !!active;
  }

  /** The geometric centre of the formation — the point the ceremony frames on. */
  _formationCentre(racers) {
    let cx = (this._worldBounds.minX + this._worldBounds.maxX) / 2;
    let cy = (this._worldBounds.minY + this._worldBounds.maxY) / 2;
    if (racers && racers.length > 0) {
      cx = racers.reduce((s, r) => s + (r.x ?? cx), 0) / racers.length;
      cy = racers.reduce((s, r) => s + (r.y ?? cy), 0) / racers.length;
    }
    return { x: cx, y: cy };
  }

  /**
   * Camera update for the pre-race countdown phase — THE START CEREMONY.
   *
   * Three beats: the venue shot held still, an eased push in, and the formation held until the gun.
   * Both ends are geometry (`_venueCamZoom`, `_ceremonyTargetCamZoom`); this method owns only the
   * sequencing, and the rhythm lives in `startCeremony.js`.
   *
   * It sets this.zoom/offsetX/offsetY directly so the director is ready for the first RACING
   * update() without a visible jump — and it records the framing it arrives at, so the hold after
   * the gun keeps it (`_ceremonyHoldZoom`).
   *
   * @param {Array<{x:number,y:number}>} racers  All racers with world positions.
   * @param {number} ts  Current timestamp (used to keep stateEnteredAt in sync).
   * @param {number} countdownElapsed  ms since countdown start (0 … countdownDurationMs).
   * @param {number} countdownDurationMs  Total duration of the countdown in ms.
   * @param {number} canvasW  Canvas width in pixels.
   * @param {number} canvasH  Canvas height in pixels.
   * @returns {{ zoom: number, offsetX: number, offsetY: number }}
   */
  updateCountdown(racers, ts, countdownElapsed, canvasW, canvasH) {
    // START-BOARD-2: THE SCHEDULE IS DERIVED HERE, from the config and the size of the field, and
    // the countdown's length is its total. It used to be handed in as `countdownDurationMs` and used
    // as a CAP that rescaled the beats — so the caller and the beats were two authorities on one
    // length.
    //
    // ── THAT COMMENT CLAIMED ONE HOME AND THERE WERE TWO (CEREMONY-TRUTH-1) ──────────────────
    // It said "There is one now: `ceremonySchedule`, asked here and by everything else through
    // `ceremonyTotalMs`." Both halves were true and the conclusion was not: `renderRaceFrame` calls
    // the same PURE function with its own arguments, so the function had one home and the ARGUMENTS
    // had two. When CEREMONY-TIME-1 added a fifth beat it reached one call site and not the other,
    // and the difference between the two totals was exactly the length of the missing countdown.
    // The gun fired from this schedule at the instant the renderer was about to show "3".
    //
    // A shared function is not a single source of truth when its callers each assemble the inputs.
    // What makes it one is the test below the fix: the total the DIRECTOR reports and the total the
    // RENDERER derives are asserted to be the same number.
    const schedule = this.ceremonySchedule(racers);
    const duration = Math.max(1, schedule.totalMs);
    const elapsed = Math.min(duration, Math.max(0, countdownElapsed));

    // The centre comes FIRST, because the target zoom is measured from it: the field's extent is
    // only meaningful relative to the point the camera is centred on.
    const centre = this._formationCentre(racers);
    const cx = centre.x;
    const cy = centre.y;
    const venueZoom = this._venueCamZoom(canvasW, canvasH);
    const formationZoom = this._ceremonyTargetCamZoom(racers, centre, canvasW, canvasH);
    // THE PUSH IS MONOTONE OR IT IS NOTHING. Where the formation fills the world, or where the
    // open-track clamp already binds, the "push in" would otherwise be a push OUT and the ceremony
    // would play backwards.
    const targetZoom = Math.max(venueZoom, formationZoom);

    const zoom = ceremonyZoom(
      venueZoom,
      targetZoom,
      elapsed,
      schedule,
      ceremonyEasing(this._ceremonyEasing)
    );
    this.zoom = zoom;
    this.targetZoom = zoom;

    // THE FRAMING THE HOLD KEEPS (START-CEREMONY-CAMERA-1 (d)). Recorded every frame rather than
    // once at the end, so it is right however the countdown is entered or cut short — and it is the
    // ARRIVED framing rather than the live one, so a race that starts mid-push still holds the shot
    // the ceremony was travelling towards instead of freezing halfway.
    this._ceremonyHoldZoom = targetZoom;
    // ARM THE GUARANTEE. The ceremony has just shown every racer; the promise it made is that they
    // stay shown. It is armed here rather than at the gun so there is no frame between the two in
    // which it is not held — the gap the owner watched racers fall through.
    this._fieldGuaranteeActive = true;

    // CAMERA-PROJECTION-1: one centring computation per axis, from the projection. The former
    // open/closed branches were the same eight lines twice — open used one scale on both axes,
    // closed used bsX on X and bsY on Y. `effY == effX` on open, so this reduces to it exactly.
    // THE LIVE zoom, not the arrival zoom: the pan must be centred for the frame being drawn now,
    // or the formation would sit off-centre for the whole push and slide into place at the end.
    const effZoomX = this._proj.effX(zoom);
    const effZoomY = this._proj.effY(zoom);
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
