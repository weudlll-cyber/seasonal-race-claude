// ============================================================
// File:        CameraDirector.js
// Path:        client/src/modules/camera/CameraDirector.js
// Project:     RaceArena
// Created:     2026-04-22
//
// WHAT THIS IS FOR: two things, and only these two.
//   1. WHICH SHOT are we on — the state machine: eligibility, the holds and cooldowns, the offer
//      (drawn through offerArbitration.js), the finish sequence's scripted lifecycle.
//   2. WHERE IS THE CAMERA this frame — its own motion: `zoom`, `offsetX`, `offsetY`, `camT`, the
//      lerp phases and the three branches (glide / cut / follow) that may write the offset.
//
// THE DIRECTOR IS MORE THAN THIS FILE (P1-CAMERADIRECTOR-SPLIT-1). Cohesive blocks of its methods
// live in their own modules and are installed onto CameraDirector.prototype at the bottom of this
// file, the way CameraDirectorDiag.js always was. They are the director — they read and write
// `this` — and the camera fingerprint covers them exactly as it covers this file. None of them
// imports from here, which keeps every dependency one-way:
//   the camera before the gun ............. CameraDirectorCeremony.js  (updateCountdown & co.)
//   the guarantees as zoom ceilings ....... CameraDirectorCeilings.js  (bounds only; composed here)
//   who is level / still in contention .... CameraDirectorLevelSet.js  (the unit stays a static here)
//   the run-in / endgame schedule ......... CameraDirectorRunIn.js     (asked once per frame)
//   what the Dev Screen sees .............. CameraDirectorDiag.js      (read-only on the camera)
// and two that hold no state at all:
//   the state names ....................... camState.js          (CAM_STATE, re-exported here)
//   which offered shot is taken ........... offerArbitration.js  (the draw, the offer, OVERVIEW's clock)
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
// decision this file (and the modules above) makes on every frame of a seeded race across ten
// tracks. A refactor that tidies code must not move the picture, and unlike a tuning change that
// is PROVABLE rather than arguable. The value it must match lives in docs/fingerprints.json and nowhere else — this
// comment deliberately carries no copy. If your change is meant to move the picture, it is not
// hygiene — say so, and re-baseline deliberately.
//
// READ FIRST, if you are changing behaviour: docs/CAMERA_DIRECTOR.md. The ordering inside update()
// is load-bearing, and in one place above all: the frame's zoom is settled for EVERY path before
// `_resolvePanTarget` states the aim, because an aim is `world x scale` and means nothing beside the
// wrong scale. `_setTargets` answers how WIDE and stops; `_resolvePanTarget` answers where to AIM.
// Reversing those two is the defect RUNIN-ORDER-FIX-1 removed, and it had cost four separate
// corrections before anyone named it. See §2a there for the two pivots that are NOT part of it.
// ============================================================

import { getPanTarget } from './panTarget.js';
import { resolveCamera } from './resolveCamera.js';
import { diagMixin } from './CameraDirectorDiag.js';
import { ceilingsMixin } from './CameraDirectorCeilings.js';
import { levelSetMixin } from './CameraDirectorLevelSet.js';
import { runInMixin } from './CameraDirectorRunIn.js';
import { ceremonyMixin } from './CameraDirectorCeremony.js';
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
  lateralShiftToFit,
  lateralAdmissibleForBody,
  forwardFracForRoomFloor,
} from './framingRule.js';
// MIRRORS-BY-REFERENCE (LESSONS L207): fallbacks in this file READ the default instead of copying it.
import { DEFAULT_CAMERA_CONFIG } from '../storage/defaults.js';
import { CAM_STATE } from './camState.js';
import {
  acceptsOffer,
  weightedRandomPick,
  overviewEligible,
  nextOverviewAt,
  offerPool,
  arbitrateOffers,
} from './offerArbitration.js';

// The state names live in camState.js (P1-CAMERADIRECTOR-SPLIT-1), so that modules this file
// imports can name a state without a circular import. Re-exported here so every existing
// `import { CAM_STATE } from './CameraDirector.js'` keeps working and resolves to the same object.
export { CAM_STATE };

// Base zoom multiplier for open tracks. CAMERA-PROJECTION-1: the single definition now lives in
// projection.js (it is a property of the world→screen mapping, not of the director); re-exported
// here so RaceScreen and the diagnostics HUD keep their existing import path.
export const OPEN_TRACK_BASE_ZOOM = _PROJ_OPEN_BASE;

// CAMERA-HYGIENE-2: the sixteen `_UPPER_CASE` timing fallbacks that stood here are gone. Every one
// of them was a second copy of a constant in cameraTimingComputation.js, and not one was read — the
// director gets its fallbacks by calling computeTimingFromConfig(null). They were the shape a
// silent divergence takes: two numbers that must agree, and nothing making them.
// START-ONE-WINDOW-1 retired `START_PHASE_DURATION`. It was 3000 ms of forced OVERVIEW, added to
// `postStartHoldMs` at the one place both were read, so the start window's real length lived in an
// addition and neither half could be set. It is now ONE key, `startWindowMs`, whose shipped value
// is that sum. See defaults.js.
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
    // RUNIN-LEVEL-SET-BUILD-1: the level guarantee's held ceiling and its eased release.
    // All three are null outside the run-in, which is what makes the rest of the race untouched.
    this._levelHeld = null;
    // RUNIN-EASED-ADMIT-1: the level ceiling's ease, which now runs in BOTH directions and re-anchors
    // whenever its target moves. `_levelEaseTarget` is what makes the re-anchor possible — without a
    // record of what the ease was aimed at, a moved target cannot be noticed and its step is passed
    // through scaled by however far the ease had travelled. See `_levelEaseTo`.
    this._levelEaseFrom = null;
    this._levelEaseAt = 0;
    this._levelEaseTarget = null;
    this._levelSet = 0;
    // RUNIN-HOLD-1: the run-in HOLDS its opening shot and then closes in ONE sweep. Both fields are
    // one-way latches, for the same reason `_runInProgress` is clamped monotone — a close that could
    // restart is not a sweep.
    // ENDGAME-SCHEDULE-1. `_progTrail` is a short ring of {ts, progress} used ONLY to predict how
    // far away requirement 1's deadline is; it looks back exactly `runInOpenMs`, so the estimator's
    // window is the same span the move it schedules occupies and no new number is introduced.
    this._progTrail = [];
    this._runInAfterDeadline = false;
    // ── RUNIN-NAMES-1: THE CLOSING ZOOM HAS ARRIVED AT ITS TARGET ────────────────────────────────
    //
    // A ONE-WAY LATCH, for the same reason every other run-in flag beside it is one: an arrival that
    // could un-happen is not an arrival, and this strand's whole history is per-frame questions that
    // should have been asked once.
    //
    // WHAT IT MEANS: the schedule's CLOSE segment has run and the leader has reached the line —
    // which is, by §3b's own construction, exactly where the close arrives at its endpoint. That
    // endpoint is `_photoFinishZoom` when the race is a photo finish and `_leaderZoom` when it is
    // not, so the WIDTH arrived at differs by race while the arrival EVENT is the same one.
    //
    // IT DECIDES NO PICTURE. Nothing in the camera reads it; it is published for the renderer, which
    // uses it to decide what a LABEL SAYS. Read RUNIN-NAMES-1 before giving it any other job.
    this._runInArrived = false;
    this._runInWidenU = 0; // the widen's carried parameter — advances only on frames it can run
    this._runInWidenPrevP = null;
    this._runInWidenInert = false; // the widen could not run last frame; re-anchor when it can
    this._runInHeldZoom = null; // the width the schedule last placed — held while the widen is inert
    this._runInWidenState = null; // the camera state the widen's target was last measured under
    this._runInWidenDone = false; // the shot has reached the width the line needs; the close begins
    this._runInEndZoom = null; // the factor the close is easing to; a change re-anchors the ramp
    this._runInCloseFromU = 0; // where the close's ramp was re-anchored, in run-in progress
    this._runInRatchet = null; // tightest cam.zoom the scheduled close has reached
    this._runInWidenFrom = null; // cam.zoom the widen began at
    this._runInWidenStartP = null; // race progress it began at
    this._runInDeadlineZoom = null; // the width reached AT the deadline — the close starts here
    this._inFinishDrama = false; // the drama window after the crossing (hudState reports 'FINISH')
    this._inPhotoFinish = false; // 15a: true while the PHOTO_FINISH shot holds (kept distinct from _inFinishDrama so hudState reports 'PHOTO_FINISH')
    this._photoFinishGateDone = false; // 15a-predictive: once-only latch — the pre-line close-check fires exactly once
    this._photoFinishEnterPending = false; // 15a-predictive: set by update() when the gate decides to enter; consumed by _pickNextState
    // FINISH-WINDOW-1: the stable indices of the TWO racers the photo-finish shot is following,
    // captured at entry. The shot ends when THESE are home — measured to differ from
    // `finishedCount >= 2` by 6–57 frames on every finishing track, because the second racer across
    // the line is frequently not one of the pair.
    this._photoFinishContenders = null;
    // CONTENTION-WATCH-1. `_contentionOut` is the release set and it only ever GROWS — see
    // `_updateContentionWatch` for why that is what makes the verdict unable to oscillate.
    this._contentionOut = new Set();
    this._contentionReleasedAt = new Map(); // index -> ts the release began, for the gradual shift
    this._contentionLast = new Map(); // index -> {ts, t} at the previous check, for the rate
    this._contentionPending = new Set(); // judged out ONCE; a release needs two checks running
    this._contentionNextTs = null;
    this._contentionChecks = 0; // diagnostic: how many checks ran this race
    this._inFinishMode = false; // FINISH_OVERVIEW has begun — absolute for state, and read by four framing sites
    this.zoom = this.overviewZoom;
    this.targetZoom = this.overviewZoom;
    this.offsetX = 0;
    this._lastLeaderLateralExtra = 0;
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
    // ZOOM-PACE-5: the corridor cap's arrival — this frame's clock, and when the shot began.
    this._frameTs = 0;
    this._photoFinishEnteredTs = null;
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
    // ── COMEBACK-PRECEDENCE-1: the two limits, held as state because they ARE the behaviour ──────
    //
    // `_comebackPrecedenceRacer` is this frame's answer to "does the cast comebacker take the screen
    // now" — the live racer object, or null. Written once per frame in `update()`, read by
    // `_pickNextState`. It is not a second detector: it is the SAME `_comeback.best()` the pool
    // already asks, with the precedence's own limits applied.
    //
    // `_comebackPrecedenceShown` is "at most once per comebacker". Indices go in when the shot
    // actually COMMITS, never when it is merely offered, so a fire that the finish sequence or the
    // endgame overrules does not burn the racer's one turn.
    this._comebackPrecedenceRacer = null;
    this._comebackPrecedenceShown = new Set();
    // COMEBACK-CUT-DELAY-1: a comeback shot that is DUE but waiting — { index, since, route } or
    // null. ONE record for both routes into the shot (`route` 'precedence' = the offer in `update`,
    // 'pick' = the weighted offer in `_pickNextState`), so a racer is never delayed twice. A waiting
    // cut is RESOLVED when it matures — taken, or dropped — so a stale one can never block the next.
    this._comebackDue = null;
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
    // START-ONE-WINDOW-1: the world point the ceremony left at the centre of the picture, and the
    // anchor for the whole start window until the hand-over. `null` means no ceremony ran — a test,
    // a resumed race — and then the start window simply frames the leader like any other shot.
    this._startFreezePoint = null;
    // The hand-over happens ONCE per race: the mark is crossed once, and re-arming on a later lap
    // would put the camera back into a hand-over it has already made.
    this._startHandoverDone = false;
    /** ms since the gun at which the mark was reached, for the diagnostics. null = never. */
    this._startHandoverAtMs = null;
    /** ZOOM-PIVOT-START-1 diagnostic: the pivot's world x this frame, or null if it did not fire. */
    this._lastPivotAnchorX = null;
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
    this._leaderLateralMaxPx = f.leaderLateralMaxPx;
    this._leaderLateralMarginPx = f.leaderLateralMarginPx;
    this._leaderAimRoomFloorPx = f.leaderAimRoomFloorPx;
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
    this._startWindowMs = t.startWindowMs;
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
    // ── `_lfEntryByState` IS CONSUMED ON ZERO FRAMES OF A SHIPPED RACE, AND IT STAYS ────────────
    //
    // Measured 2026-08-23 (LF-ENTRY-EXPLAINED-1): driven through a whole race on two contrasting
    // tracks, `_lerpPhase` is `'entry'` on NONE of 5588 frames (dirt-oval) and NONE of 3862
    // (river-run). `_transition` sets `'entry'`, and the grammar branch further down overwrites it
    // to `'glide'` or `'tracking'` before a frame is drawn.
    //
    // THE OWNER DECIDED ON 2026-08-23 TO DOCUMENT IT HERE RATHER THAN DELETE IT, and the reason is
    // not sentiment:
    //   * THE READER IS LIVE — `_lerpFactorForState` selects this map whenever the phase is
    //     `'entry'`. This is not unreachable code.
    //   * THE OLDER GRAMMAR IS A SHIPPED CONFIG SWITCH, NOT REMOVED CODE. `cameraTransitionGrammar`
    //     in storage/defaults.js ships `'glide'`, and framingConfig.js resolves anything that is
    //     neither `'cut'` nor `'glide'` to `'legacy'` — which is the one value that leaves this map
    //     reachable. Forced to `'legacy'`, entry appears on 16.3% and 9.4% of frames.
    //   * SO DELETING THE MAP WOULD CHANGE BEHAVIOUR THE MOMENT THAT SWITCH IS FLIPPED, silently
    //     and in the direction of a harsher arrival — which is what a config switch exists to let
    //     somebody try.
    //
    // The zero is a fact about the shipped VALUE of that switch, not about this code being dead.
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
      // COMEBACK-CONNECT-1. It travels with the four gates because the detector applies it in the
      // same loop, and a fifth value arriving by a different route would be the second channel this
      // piece exists to avoid. Default false = today's behaviour.
      useBeats: !!t.comebackUseBeats,
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
    this._contentionWatch = t.contentionWatch;
    this._bandFloor = t.bandFloor;
    this._contentionCheckMs = t.contentionCheckMs;
    this._runInOpenMs = t.runInOpenMs;
    this._contenderZoom = t.contenderZoom;
    this._corridorCapArriveMs = t.corridorCapArriveMs;
    this._comebackCooldownMs = t.comebackCooldownMs;
    this._comebackTargetRank = t.comebackTargetRank; // COMEBACK-HOLD-2
    this._comebackCutDelayMs = t.comebackCutDelayMs; // COMEBACK-CUT-DELAY-1
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
   * Is an OFFERED shot taken? The weight's meaning (CAMERA-WEIGHTS-1) and how it composes with the
   * holds are documented on `acceptsOffer` in offerArbitration.js, its one home. This method stays
   * on the director because the director's own seeded stream is the draw, and because tests and
   * diagnostics call it here.
   */
  _acceptsOffer(weight) {
    return acceptsOffer(weight, () => this._random());
  }

  /** Draw one offered candidate by weight — see `weightedRandomPick` in offerArbitration.js. */
  _weightedRandomPick(candidates) {
    return weightedRandomPick(candidates, () => this._random());
  }

  /** May OVERVIEW be offered this frame? The rule is `overviewEligible` in offerArbitration.js. */
  _isOverviewEligible(ts, raceState) {
    return overviewEligible(ts, raceState, {
      startDelaySec: this._overviewStartDelay,
      lastExitTs: this._lastOverviewExitTs,
      cooldownMs: this._overviewCooldownMs,
      scheduleNext: this._overviewScheduleNext,
    });
  }

  /** A taken OVERVIEW sets when the next may be offered — `nextOverviewAt` in offerArbitration.js. */
  _scheduleNextOverview(ts, raceState, leader) {
    this._overviewScheduleNext = nextOverviewAt(
      raceState,
      leader,
      this._overviewTargetCount,
      this._overviewCooldownMs,
      () => this._random()
    );
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
    // "Once per comebacker" is once per comebacker PER RACE. The roster call is where the detector
    // throws away the previous race's rank history, so it is where this belongs too.
    this._comebackPrecedenceRacer = null;
    this._comebackPrecedenceShown = new Set();
    this._comebackDue = null; // COMEBACK-CUT-DELAY-1: a waiting cut belongs to its race
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
    // THE LEADING TWO ONLY, EVEN WHEN THE FRAMED SET IS LARGER (CONTENDER-ZOOM-1).
    //
    // DETECTION AND DURATION KEEP STARTING WITH TWO; only the FRAMING set widened. Letting the
    // framed set decide when the shot ENDS made the photo finish wait for three to five racers
    // instead of two and stretched it by 85% (7441 -> 13756 frames across ten tracks, measured),
    // which is a different feature nobody asked for. The two are separated here deliberately.
    return pair.slice(0, 2).every((c) => !!findByIndex(racers, c.index, c.ref)?.finished);
  }

  /** The best current comeback, or null. See comebackDetector.js for what "best" means. */
  _detectComebackRacer(racers, ts, progress = null) {
    return this._comeback.best(racers, ts, progress);
  }

  /**
   * ── COMEBACK-PRECEDENCE-1 — THE WHOLE PRECEDENCE, IN ONE PLACE ─────────────────────────────────
   *
   * WHAT IT DECIDES: whether the racer the PLAN cast as a comebacker takes the screen right now,
   * instead of waiting out a hold that runs up to eight seconds and then winning a weighted draw
   * about a quarter of the time. Returns the live racer to cut to, or null.
   *
   * WHAT IT IS NOT: a second detector. Who is climbing is `_comeback.best()` and nothing else — the
   * same call, the same gates, the same answer the candidate pool gets one line further down. This
   * method adds only the two limits and the population test.
   *
   * ★ THE TWO LIMITS ARE BEHAVIOUR, NOT SETTINGS. There is no key, no default and no number to
   * tune here; every threshold read below already exists and is read, never restated:
   *   · AT MOST ONCE PER COMEBACKER — `_comebackPrecedenceShown`, burned on commit;
   *   · NEVER INTO A LEAD_CHANGE ALREADY ON SCREEN — the state test, first line of the body.
   *
   * ★ THE CAST ONLY — AND SINCE 2026-09-19 THAT IS THE WHOLE POPULATION, NOT A NARROWING OF ONE.
   * This paragraph used to say that `comebackDetector.js` falls back to the wider `_b1` pool when
   * the plan casts no comebacker, so that in those races nothing was FORCED but a shot could still
   * be taken. The fallback is gone (`comebackDetector.js:215`): with no cast comebacker there is no
   * comeback shot at all. The `isCast` test below is therefore no longer what separates a forced
   * shot from an ordinary one — it is a population test that cannot fail today, kept because it is
   * what would go red if the refusal in `best()` were ever removed again.
   *
   * ★ WHY THE GATES BELOW ARE A SUBSET OF `_pickNextState`'s. This answer becomes an interrupt that
   * cuts a hold short. A hold cut for a shot that then does not happen is the restless camera the
   * mild rule exists to avoid, so the finish sequence, the start window and the endgame — each of
   * which owns the screen ABOVE the candidate pool — are excluded here as well. They are reads of
   * latches and thresholds that already exist; none is new, and `_pickNextState` remains the
   * authority that actually produces the shot.
   */
  _comebackPrecedenceOffer(racers, ts, raceState) {
    // LIMIT 2: a lead change already on screen is never cut into.
    if (this.state === CAM_STATE.LEAD_CHANGE) return null;
    // Already looking at him — there is nothing to switch to.
    if (this.state === CAM_STATE.COMEBACK_ZOOM) return null;
    // The finish sequence, the start window and the endgame own the picture outright.
    if (this._inPhotoFinish || this._inFinishDrama || this._inFinishMode) return null;
    if (!raceState || raceState.raceElapsed < this._startWindowMs) return null;
    const progress = this._diagLeaderProgress;
    if (progress > this._endgameThreshold) return null;
    // The pool's own three gates for a comeback candidate, read in the same order it reads them.
    if (!(raceState.isOutcomePhase || progress > this._outcomePhaseThreshold)) return null;
    if (!(this._comebackWeight > 0)) return null;
    if (ts - this._lastComebackExitTs < this._comebackCooldownMs) return null;
    const racer = this._detectComebackRacer(racers, ts, progress);
    if (!racer) return null;
    // The population: the plan's cast, and only it.
    if (!this._comeback.isCast(racer.index)) return null;
    // LIMIT 1: at most once per comebacker.
    if (this._comebackPrecedenceShown.has(racer.index)) return null;
    return racer;
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
    // RUNIN-NAMES-1: latch the closing zoom's ARRIVAL. Both terms already exist and neither is a
    // number chosen here: `_runInAfterDeadline` is the schedule's own "the close is running" (it is
    // set in `_scheduleTargetZoom` and, being a latch, survives the frames the schedule does not
    // run), and the leader reaching the line is where §3b says the close arrives — "both the close's
    // parameter and the leader's walk back reach 1 exactly at the line".
    //
    // WHY NOT `_runInProgress >= 1`, which is the same sentence in the schedule's own units:
    // MEASURED, it reaches 1 on 6 of 18 finishing races and ALL SIX ARE PHOTO FINISHES — the
    // photo-finish shot keeps the schedule composing past the line, while every other race stops
    // composing ON the crossing frame and freezes the parameter at 0.9969-0.9994. A trigger that
    // fires only on photo finishes is the one thing this must not be.
    if (this._runInAfterDeadline && this._diagLeaderProgress >= 1) this._runInArrived = true;
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
    // COMEBACK-PRECEDENCE-1: evaluated ONCE per frame, here in update() where the other
    // hold-gate bypasses are evaluated and where `_diagLeaderProgress` has just been written. The
    // answer is stored rather than recomputed, so `_pickNextState` and `decideTransition` are
    // looking at the same frame's answer and cannot disagree about it.
    // COMEBACK-CUT-DELAY-1 — THE TRIGGER POINT of the delay on the precedence route. The offer no
    // longer fires the cut on the frame it appears: it starts `_comebackDue`, and the precedence is
    // pending only once the delay has passed AND the offer still names the same racer this frame.
    // A delay of 0 is the behaviour before, unchanged.
    const precedenceOffer = this._comebackPrecedenceOffer(racers, ts, raceState);
    if (this._comebackCutDelayMs > 0) {
      const due = this._comebackDue;
      // a new offer starts the wait; an offer for a DIFFERENT racer restarts it for him
      if (
        precedenceOffer &&
        (!due || (due.route === 'precedence' && due.index !== precedenceOffer.index))
      )
        this._comebackDue = { index: precedenceOffer.index, since: ts, route: 'precedence' };
      const d = this._comebackDue;
      const matured =
        d != null && d.route === 'precedence' && ts - d.since >= this._comebackCutDelayMs;
      const stillHim = matured && precedenceOffer?.index === d.index;
      // matured but no longer offered: that cut is dropped, not left waiting
      if (matured && !stillHim) this._comebackDue = null;
      this._comebackPrecedenceRacer = stillHim ? precedenceOffer : null;
    } else {
      this._comebackPrecedenceRacer = precedenceOffer;
    }
    const prevState = this.state;
    const inBattleZoom = this.state === CAM_STATE.BATTLE_ZOOM;
    // When minHold=0 (same-state repeat), holdGate=0 so _transition() fires every frame
    // until a different state is detected — no stateCap blocker.
    const holdGate = minHold === 0 ? 0 : Math.max(minHold, stateCap);
    // COMEBACK-HOLD-2 (the owner's decision, 2026-10-02): at least the comeback minimum, then until
    // the locked racer holds `comebackTargetRank` or better; `stateCap` (the profile maximum) bounds
    // it. The minimum is the COMEBACK state's own, read from the per-state table, not `minHold` — a
    // repeat entry would set that to 0, and repeats of a running comeback are refused below.
    const inComeback = this.state === CAM_STATE.COMEBACK_ZOOM;
    const comebackMinHoldMs =
      this._minStateHoldByState[CAM_STATE.COMEBACK_ZOOM] ?? this._minStateHoldMs;
    const lockedRank = inComeback
      ? this._comeback.latestRank(this._comebackLockedRacerIndex)
      : null;
    const comebackTargetReached =
      inComeback &&
      stateAge >= comebackMinHoldMs &&
      lockedRank != null &&
      lockedRank <= this._comebackTargetRank;
    // ...and NEVER INTO THE FINAL SCENE, whose earliest entry ends it at once, minimum or not:
    //   · the endgame — leader past `endgameThreshold`, which `_pickNextState` answers with the
    //     endgame shot (its Priority 2.5) — the one entry that would otherwise WAIT for this shot's
    //     hold to run out, so it is the one this flag exists for;
    //   · the photo-finish gate (`photoFinishGateReady`) and the first racer home
    //     (`forceFinishDrama`), which already transition out of ANY state in `decideTransition`;
    //     they are named here so the rule reads whole.
    // The transition then runs the ordinary `_transition` → `_pickNextState`, so the final scene's
    // own shot starts on this very frame, exactly as it would have from any other state.
    const finalSceneDue =
      this._diagLeaderProgress > this._endgameThreshold || photoFinishGateReady || forceFinishDrama;
    const comebackFinalSceneDue = inComeback && finalSceneDue;
    // COMEBACK-CUT-DELAY-1: a comeback cut still WAITING when the final scene becomes due is dropped
    // — that shot does not start. (The precedence offer refuses in the final scene too, so the
    // pending flag below is false on this frame already.)
    if (finalSceneDue && this._comebackDue) {
      this._comebackDue = null;
      this._comebackPrecedenceRacer = null;
    }
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
      comebackPrecedencePending: this._comebackPrecedenceRacer != null,
      comebackTargetReached,
      comebackFinalSceneDue,
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
    // ── ENDGAME-SCHEDULE-2: THE SCHEDULE AUTHORS THE ZOOM, AND IT DOES SO *HERE* ──────────────
    //
    // Placed BEFORE the branch chain for one reason, and it is not tidiness: the follow branch's
    // zoom-about-the-anchor pivot corrects the pan by `_dz = this.zoom - _zoomAtStart`. Applying the
    // schedule AFTER that block left the pivot correcting only the lerp's own small delta while the
    // schedule moved the zoom by much more — an UNPIVOTED zoom change, which is precisely the defect
    // CAMERA-SIDEJUMP-1 exists to prevent and which `_focusAnchorRacer` returning null makes worst
    // in PHOTO_FINISH.
    //
    // MEASURED with the snap in the wrong place: `tracking-lag`'s PHOTO_FINISH p95 went 16.61 ->
    // 90.72 pp — the subject sliding most of a frame away from where the framing rule puts him — and
    // the leader's own frame position overshot its intended 0.66 to 1.63, i.e. off the front edge.
    // Moved here, the pivot sees the full change and the correction applies to all of it.
    //
    // IT ALSO SUPPRESSES THE GLIDE'S ZOOM (see the glide branch): a transition glide re-interpolating
    // the zoom is a second author, and two authors on one quantity is what hopping looks like.
    // ...AND the schedule is what actually set the delivered width, not a guarantee over it.
    const _schedZoom = this._scheduleComposing() && this._runInBinding;
    // ── RUNIN-ORDER-FIX-1: THIS FRAME'S ZOOM IS SETTLED HERE, ONCE, FOR EVERY PATH ────────────
    //
    // WHAT USED TO BE HERE. Two corrections that re-stated the aim after the fact — one scoped to
    // the composing schedule (VIEWER-INVARIANTS-2), one to the endgame close (RUNIN-PAN-STALE-ZOOM-1)
    // — each right about its own subset of frames and neither removing the cause. They are gone.
    // The order below is what replaces them: every path that can move this frame's zoom moves it
    // HERE, and only then is the aim resolved, at a zoom that is now final.
    //
    // WHAT IS DELIBERATELY *NOT* GONE. The two zoom-about-the-anchor pivots stay exactly where they
    // were, in the glide branch and the follow branch. RUNIN-ORDER-FIX-1 measured what removing them
    // costs — the worst sideways jump went from 59 px to 360 px and the jump count from 30 to 209 —
    // because they do a different job from this ordering: the ordering fixes where the aim is
    // RESOLVED, the pivots carry the smoother's screen-space lag through a zoom change. Different
    // quantities, different treatments, and only the aim's was ever wrong.
    //
    // ENDGAME-SCHEDULE-2's rule is unchanged and is the first branch: while the schedule composes it
    // is the sole author of the width, so it writes the zoom outright and the glide's easing stands
    // down. That was true before this repair; it is now said once instead of in two places.
    const _glideDur = this._glideDurationActiveMs ?? this._glideDurationMs;
    const _glideS =
      this._lerpPhase === 'glide'
        ? _glideDur > 0
          ? Math.min(1, Math.max(0, (ts - this._glideStartTs) / _glideDur))
          : 1
        : 0;
    const _glideE = _glideS * _glideS * (3 - 2 * _glideS); // smoothstep ease
    if (_schedZoom) {
      this.zoom = this.targetZoom;
    } else if (this._lerpPhase === 'glide') {
      this.zoom = this._glideStartZoom + (this.targetZoom - this._glideStartZoom) * _glideE;
    } else if (this._cutSnapPending) {
      this.zoom = this.targetZoom;
    } else if (!tSpaceLerpActive) {
      // ── ENDGAME-SCHEDULE-1: A SCHEDULE IS A POSITION, NOT A TARGET TO CHASE ──────────────────
      //
      // The reasoning that put this here is unchanged. The lerp exists to smooth a target that
      // JUMPS; the endgame schedule is already C1 — it starts at `this.zoom` with zero rate by
      // construction — so chasing it adds nothing but LAG, and the lag is not cosmetic: it is what
      // made the shot miss requirement 1's deadline. Measured before that fix, mountainstreet
      // reached the deadline about 10% narrower than the schedule placed it, which put the finish
      // line just outside the frame at exactly the instant the specification says it must be
      // inside. The schedule therefore takes the first branch and never reaches this line.
      //
      // It also flattened the ends of the ramp — a first-order filter attenuates precisely where
      // the smoothstep is slowest — which showed up as standstill the schedule never asked for.
      this.zoom += (this.targetZoom - this.zoom) * lf;
    }

    // The aim, resolved at the zoom settled above — the whole point of the split.
    this._resolvePanTarget();
    this._detour?.beginFrame();
    if (this._lerpPhase === 'glide') {
      this._detour?.noteBranch('glide', _glideS, _glideE);
      // ── THE GLIDE MUST PIVOT TOO, ONCE IT NO LONGER OWNS THE ZOOM (VIEWER-INVARIANTS-1) ───────
      //
      // This branch interpolates the pan ABSOLUTELY, from a start captured when the glide began to
      // the current target. That is correct while the glide owns BOTH quantities, because the two
      // eases travel together — which is what `_beginRunInGlide`'s own header means by "pan and
      // zoom on one ease, or the frame empties between them".
      //
      // ENDGAME-SCHEDULE-2 took the ZOOM away from it and gave it to the schedule, for good reasons
      // (two authors on one quantity is what hopping looks like) — and left the pan easing from a
      // start that was captured at a zoom that no longer applies. Nothing here compensated: the
      // follow branch below carries CAMERA-SIDEJUMP-1's zoom-about-the-anchor pivot, and the glide
      // has never had one because it never needed one.
      //
      // MEASURED IN THE BROWSER (`scripts/viewer-invariants.mjs`, space-sprint seed 9, shipped
      // defaults, his roster, Race Plan on) — the frames the owner photographed: over 27 frames from
      // 92.9% of the race the schedule widened the shot from 1.33 to 2.23 corridors while the pan
      // eased on its own curve, and the leader's screen position ran from (677, 559) to
      // (-2454, -915). For 20 of those frames NO POINT OF THE COURSE WAS ON THE CANVAS AT ALL. The
      // headless director does not produce it: the same seed measures ZERO frames off the course
      // there, which is why a year of harnesses never saw it.
      //
      // THE CORRECTION IS THE ONE THE FOLLOW BRANCH ALREADY USES, in the form this branch needs.
      // The follow branch applies THIS FRAME's zoom delta incrementally; an absolute interpolation
      // needs the delta since its OWN start, applied to its own start point. Then the anchor's
      // screen position is preserved at e = 0 and the glide still lands exactly on its target at
      // e = 1, so nothing about where it arrives changes. Same anchor expression, same axes, no new
      // number, and it is inert whenever the zoom has not moved since the glide began.
      // ── AND ONLY WHERE THE ZOOM IS SOMEONE ELSE'S ────────────────────────────────────────
      //
      // When the glide owns BOTH quantities its two eases ARE one move — that is the whole of
      // `_beginRunInGlide`'s design and there is nothing to compensate for. Pivoting there would be
      // a second correction on a move that is already correct, and it is measurable: the director's
      // own SIDEJUMP regression, which drives a min-vis zoom change through an ordinary glide, put
      // the leader at 13.6% of the frame against its floor of 15%.
      //
      // So the correction is scoped to exactly the case that created the defect — the schedule
      // authoring the zoom while this branch eases the pan. Outside it, this branch is byte-identical
      // to what it was, which is what the fingerprints and that regression both say.
      const _gAnchor = _schedZoom
        ? (this._focusAnchorRacer(racers) ?? this._framingProbe?.anchorPoint ?? null)
        : null;
      const _gdz = this.zoom - this._glideStartZoom;
      const _gsx =
        _gAnchor && _gdz !== 0
          ? this._glideStartOffsetX - _gAnchor.x * this._proj.axisX * _gdz
          : this._glideStartOffsetX;
      const _gsy =
        _gAnchor && _gdz !== 0
          ? this._glideStartOffsetY - _gAnchor.y * this._proj.axisY * _gdz
          : this._glideStartOffsetY;
      this.offsetX = _gsx + (this.targetOffsetX - _gsx) * _glideE;
      this.offsetY = _gsy + (this.targetOffsetY - _gsy) * _glideE;
      this._leadChangeSnapPending = false;
      // CAMERA-FRAMING-1: the containment clamp used to run here, claiming to be a no-op mid-glide.
      // It was measured ACTIVE on 23 of 23 glide frames with corrections to −390 px — it had become
      // a rail that steered the pan away from the glide it was interpolating. Gone; the glide now
      // lands exactly where it aimed, which is what `glide lands on its target framing` asserts.
      // (CAMERA-HYGIENE-2: this note used to claim a `clampActiveCount` diagnostic still watched
      // the clamp. Nothing had incremented that counter since the clamp was deleted, so the test
      // that asserted it stayed 0 could not fail. Counter, getters and test are gone.)
      if (_glideS >= 1) this._lerpPhase = 'tracking'; // glide complete → steady follow
    } else if (this._cutSnapPending) {
      this._detour?.noteBranch('cut');
      this._cutSnapPending = false;
      this._leadChangeSnapPending = false;
      // The zoom snap has moved to the one place that settles this frame's zoom, above.
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
        // ── ZOOM-PIVOT-START-1: THE SCOPE IS GONE, AND THE NOTE THAT SCOPED IT SAID WHY ──────
        //
        // What stood here was `this._runInActive ? this._framingProbe?.anchorPoint : null`, under a
        // comment that called the null "a latent defect everywhere" and scoped the repair to the
        // run-in for ONE reason: repairing it in general moves both fingerprints with `runInShot`
        // OFF, and that block had promised nothing outside the endgame window would move. **That
        // promise belonged to that block.** The defect it named came due at the START, where the
        // field guarantee widens the shot continuously while OVERVIEW has no focus racer — measured
        // at 15% of zoom across 1496 world px from the origin, about 225 world px of drift that has
        // been read as camera movement four times (START-OVERSHOOT-1).
        //
        // THE PIVOT IS NOT INVENTED AND IS NOT NEW. It is the same expression the run-in already
        // used — `_framingProbe.anchorPoint`, the pan target this frame's framing was actually
        // built on, recorded by `_setTargets` a few lines above. Removing the condition is the whole
        // change; there is no key, no fraction and no second rule.
        //
        // WHY NOT THE FRAME CENTRE, which is the other point the director has to hand: preserving
        // the centre is a different promise ("do not move the picture") from this correction's own
        // ("do not let the subject slide"), and it would fight the pan lerp — the pan is trying to
        // move the centre toward the target, so pivoting on the centre neutralises the zoom while
        // still letting the subject slide whenever the camera trails. Measured, the two converge
        // once the drift is gone, because the gap between them IS the drift.
        //
        // WHY NOT `afterLateral`, the FINAL pan target: it carries the forward bias, which is large
        // in the LEADER states where this correction already runs today. Using it would change
        // behaviour that is not this block's to change.
        //
        // WHAT THIS REACHES that the run-in did not: every group shot whose zoom is moving —
        // OVERVIEW, BATTLE_ZOOM and PHOTO_FINISH — because `_focusAnchorRacer` returns null for all
        // three. Inside the run-in the expression reduces to exactly what it was, so the run-in is
        // unchanged by construction rather than by measurement.
        const _anchor = this._focusAnchorRacer(racers) ?? this._framingProbe?.anchorPoint ?? null;
        const _dz = this.zoom - _zoomAtStart;
        // Diagnostic only — read by nothing in the camera. It records the world x the pivot
        // ACTUALLY used this frame (null when the correction did not fire), so a trace can
        // separate the correction's contribution from the follower's instead of inferring it.
        this._lastPivotAnchorX = _anchor && _dz !== 0 ? _anchor.x : null;
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
        this._beginTrackingPhase(ts);
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
    // START-ONE-WINDOW-1: LAST, because it reads the picture this frame DELIVERED. Every other term
    // above decides what to aim at; this one asks where the leader ended up, which is only knowable
    // after the lerp has run. It changes nothing this frame — the hand-over it makes is read by the
    // next frame's targets, which is what "once, without a jump" looks like in a loop.
    this._maybeHandOverAtLeaderMark(racers, ts, raceState);
    return { zoom: this.zoom, offsetX: this.offsetX, offsetY: this.offsetY };
  }

  /**
   * ENTER THE TRACKING PHASE — the ordinary follow, at the ordinary time constant.
   *
   * Extracted from the entry-phase convergence test so the hand-over below reaches tracking by the
   * SAME route rather than by a second copy of it. A second copy is exactly how the two readings of
   * `postStartHoldMs` came to differ by 3000 ms, and that one was only a number.
   *
   * It moves nothing: `_lerpPhase` selects which lerp FACTOR the next frame uses, so the camera
   * carries on from where it is at a different rate. There is no position in here to jump.
   */
  _beginTrackingPhase(ts) {
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

  /**
   * WHERE THE LEADER ACTUALLY IS IN THE DELIVERED FRAME, as a fraction along his own heading.
   *
   * This is `anchorScreenPoint` read backwards. That function PLACES a subject at `frac` by
   * displacing it `(frac - 0.5)` of the frame's chord along its screen heading; dividing a delivered
   * displacement by the same chord gives the fraction back. 0.5 is dead centre, and
   * `leaderForwardFrac` is where the racing framing asks him to sit.
   *
   * It uses the director's OWN projection, heading and chord — not a second geometry — so "where he
   * is" and "where he is asked to be" cannot come to disagree about what a frame is.
   *
   * @returns {number|null} the fraction, or null when the geometry is degenerate or missing
   */
  _leaderFrameFrac(leader, canvasW = CANVAS_W, canvasH = CANVAS_H_REF) {
    if (!leader || !this._shape || leader.t == null) return null;
    const heading = this._headingAt(leader.t);
    if (!heading) return null;
    const hLen = Math.hypot(heading.x, heading.y);
    if (!(hLen > 0)) return null;
    // The screen tangent is PER-AXIS, exactly as `_applyLeaderForwardBias` computes it.
    const sx = (heading.x / hLen) * this._proj.effX(this.zoom);
    const sy = (heading.y / hLen) * this._proj.effY(this.zoom);
    const sLen = Math.hypot(sx, sy);
    if (!(sLen > 0)) return null;
    const ux = sx / sLen;
    const uy = sy / sLen;
    const span = frameExtentAlong(ux, uy, canvasW, canvasH);
    if (!(span > 0)) return null;
    const p = this._proj.toScreen(leader, this.zoom, this.offsetX, this.offsetY);
    const along = (p.x - canvasW / 2) * ux + (p.y - canvasH / 2) * uy;
    return 0.5 + along / span;
  }

  /**
   * THE HAND-OVER: the camera begins to follow when the leader has reached his place in the frame.
   *
   * THE OWNER'S DESIGN, 2026-08-21. Until this fires the shot opens where it stands and does not
   * pan; from it onward the camera follows the leader exactly as it does for the rest of the race.
   *
   * IT INVENTS NO FRACTION. The mark is `leaderForwardFrac`, read from the framing the race itself
   * uses. If the placement is ever re-tuned the hand-over follows it without a second edit, and
   * there is no way for the two to drift apart.
   *
   * IT IS NOT AN OPTION. `feat/start-handover-mark-1` computed the same condition behind a Dev
   * Screen switch while the gate it was measured against was undecided. The owner has decided; the
   * switch is deliberately NOT carried over, because a settled behaviour with a toggle beside it is
   * a second live mechanism and this repository has paid for those.
   *
   * IT DOES NOT GLIDE OR CREEP. One frame the shot is frozen, the next it is followed, and the
   * transition grammar does the moving — this project's own no-jump mechanism. Nothing here writes
   * a position, so there is nothing that could jump.
   *
   * WHY IT CANCELS THE STATE'S MINIMUM DISPLAY, and why that is not a deletion: `minStateHold` is a
   * GENERAL mechanism — six per-state values, read by the transition gate and by the phased
   * observer's lead-out for every state in the race — so it stays exactly as it is. What happens
   * here is that the start window OWNS the state for its duration, and the one transition it needs
   * is released by the existing per-entry override (`_activeStateMinHoldMs`), the same idiom a
   * same-state repeat uses. It self-heals: the transition it unblocks is not a repeat, so
   * `_transition` restores the new state's own hold on the very next frame.
   */
  _maybeHandOverAtLeaderMark(racers, ts, raceState) {
    if (this._startHandoverDone) return;
    // Only inside the start window. Outside it there is nothing to hand over.
    if (!raceState || !(raceState.raceElapsed < this._startWindowMs)) return;
    const mark = this._leaderForwardFrac;
    if (!Number.isFinite(mark)) return;
    let leader = null;
    let leaderT = -Infinity;
    for (const r of racers ?? []) {
      if (r?.t != null && r.t > leaderT) {
        leaderT = r.t;
        leader = r;
      }
    }
    const frac = this._leaderFrameFrac(leader);
    if (frac === null || frac < mark) return;
    this._startHandoverDone = true;
    this._startHandoverAtMs = raceState.raceElapsed;
    /** Diagnostic only: the fraction he had actually reached on the frame it fired. */
    this._lastHandoverFrac = frac;
    // The ceremony's framing is over: the state's own zoom takes the shot from here.
    this._ceremonyHoldZoom = null;
    // Let the ordinary chain decide on the NEXT frame rather than at OVERVIEW's minimum display.
    this._activeStateMinHoldMs = 0;
    // The ordinary time constant, in case no transition follows. When one does, the state entry
    // overwrites this with the grammar's own phase, which is the ordinary route and not a second one.
    if (this._lerpPhase === 'entry') this._beginTrackingPhase(ts);
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
        // ── WHO THE SHOT IS ABOUT (CONTENDER-ZOOM-1) ────────────────────────────────────────
        //
        // EVERY RACER STILL IN THE FIGHT FOR THE WIN, which is a GEOMETRIC question and needs no
        // number: a racer on the SAME LANE as somebody ahead of him cannot win any more — he would
        // have to move aside AND then still overtake, and the photo finish is far too short for
        // both. Everyone else is still contesting it.
        //
        // "SAME LANE" IS THE ENGINE'S OWN DEFINITION, not a new one. The race is LANE-FREE
        // (raceBehavior.js's header says so) and `physicalY` is a continuous lateral offset, so
        // there are no discrete lanes to read. `pairContact` there already fixes when two bodies
        // overlap ACROSS the track — `halfWidthA + halfWidthB` — and rowLayout.js fixes the unit,
        // one physicalY being trackWidth/2 world px. Both quantities are already here.
        //
        // DETECTION IS UNCHANGED: the gate above still enters on the top two, which is all it takes
        // to establish that a photo finish is happening. This is the FRAMING set.
        //
        // CAPTURED ONCE, NEVER RE-SORTED — that is what FINISH-PAIR-1 bought, and it is why the
        // set is stored by index and looked up live rather than recomputed each frame.
        this._photoFinishContenders = (
          this._contenderZoom ? this._abreastContenders(ordered) : ordered.slice(0, 2)
        ).map((r) => ({ index: r.index ?? null, ref: r }));
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

    // ── Priority 2: THE START WINDOW. ONE clock, ONE rule (START-ONE-WINDOW-1) ─────────────────
    //
    // What stood here was TWO branches and three clocks: 3000 ms of forced OVERVIEW, then
    // `postStartHoldMs` of forced LEADER counted on top of it, while OVERVIEW's own minimum display
    // blocked every transition inside both. The window is the same ten seconds; what changed is
    // that it is one number, and that what happens inside it is one rule instead of three.
    //
    // IT STILL OWNS THE PICTURE, which is the half of the old post-start hold that was load-bearing:
    // no BATTLE, no COMEBACK, no LEAD_CHANGE for the whole window. That is why this returns a state
    // on every frame rather than falling through.
    //
    // WHICH state is the whole of the rule. Before the hand-over the shot is the ceremony's, opening
    // where it stands (`_setTargets` freezes the anchor, so the zoom widens and the camera does not
    // pan). From the hand-over on it is LEADER_ZOOM — the ordinary racing shot, with the ordinary
    // anchor, the ordinary time constant and `leaderForwardFrac` placing him, which is what "follows
    // the leader exactly as everywhere else" has to mean.
    if (raceState.raceElapsed < this._startWindowMs) {
      return {
        nextState: this._startHandoverDone ? CAM_STATE.LEADER_ZOOM : CAM_STATE.OVERVIEW,
        reason: `start-window: raceElapsed=${(raceState.raceElapsed / 1000).toFixed(1)}s of ${(this._startWindowMs / 1000).toFixed(1)}s${this._startHandoverDone ? ' (handed over)' : ''}`,
        data: {},
      };
    }
    // Priority 2.5: Endgame — leader past threshold → LEADER, bypasses cooldown.
    // Exception: LEAD_CHANGE is allowed through — a lead swap near the finish line
    // is the most dramatic moment and must not be suppressed.
    if (leaderProgress > this._endgameThreshold) {
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
    // ── THE OFFERS. Each shot's eligibility is decided here; the pool, the draw and the offer are
    // offerArbitration.js. The comeback precedence returns ABOVE the pool — that is the seam
    // DC2-ARC4-SOURCE.md §4.5 P1 named, and it is now visible as an ordering rather than as a
    // return in the middle of the pool's construction.
    else {
      // COMEBACK-CUT-DELAY-1 — WHILE A COMEBACK CUT IS WAITING, THE CAMERA KEEPS ITS SHOT. `null` is
      // `_transition`'s existing "no change" answer, so whatever is on screen stays, and nothing in
      // the pool below — a lead change, an overview, a second comebacker — can take the slot and
      // drop the waiting comeback. The finish sequence, the start window and the endgame all return
      // ABOVE this line, so the final scene is never held back by it.
      if (this._comebackDue && ts - this._comebackDue.since < this._comebackCutDelayMs) return null;
      // Every offer test carries weight > 0 (BATTLE-WEIGHT-ZERO-1): a 0.00 slider means "never",
      // consistently for every event. (The selector also filters weight <= 0 as defense in depth.)
      const battleOffered = hasBattle && battleCooledDown && this._battleWeight > 0;

      const lcCooledDown = ts - this._lastLeadChangeExitTs >= this._leadChangeCooldownMs;
      const leadChangeOffered =
        this._leadChangePending && lcCooledDown && this._leadChangeWeight > 0;

      const comebackCooledDown = ts - this._lastComebackExitTs >= this._comebackCooldownMs;
      let _comebackRacer = null;
      const _internalOutcomePhase = leaderProgress > this._outcomePhaseThreshold;
      // COMEBACK-HOLD-1: a RUNNING comeback shot is never offered again. Re-picking it would be a
      // same-state repeat (hold 0, `_transition`), which could carry the shot past its maximum; its
      // length is the gain rule's and the cap's to decide, nothing else's. With a cooldown above 0
      // the cooldown already refuses it (`_transition` stamps the exit before picking); this guard
      // is what holds when the Dev Screen sets the cooldown to 0.
      if (
        (raceState?.isOutcomePhase || _internalOutcomePhase) &&
        comebackCooledDown &&
        this._comebackWeight > 0 &&
        this.state !== CAM_STATE.COMEBACK_ZOOM
      ) {
        // `leaderProgress` is the same value the outcome-phase test one line above already uses,
        // read here rather than recomputed. COMEBACK-CONNECT-1 needs it because the plan's beats
        // are written in race progress, not in wall-clock ms.
        _comebackRacer = this._detectComebackRacer(racers, ts, leaderProgress);
        // ── ★ COMEBACK-PRECEDENCE-1 — THE FORCE ────────────────────────────────────────────────
        //
        // COMEBACK-SAME-RACER-1 §4 established that an interrupt ALONE is not a precedence:
        // `_transition` calls this method and commits whatever comes back, so interrupting the
        // hold merely re-opens the weighted draw, which the comebacker wins about a quarter of
        // the time. This return IS the precedence — it lands above `_weightedRandomPick` and
        // above `_acceptsOffer`, so the draw is not re-opened and the offer cannot be declined.
        //
        // ★ WHY HERE AND NOT AT THE `_transition` CALL SITE. Forcing there would override the
        // finish sequence, the start window and the endgame, each of which returns above this
        // branch and owns the screen outright. Placed here, the force inherits every one of
        // those gates instead of restating them, and the identity test keeps it the SAME racer
        // `_comebackPrecedenceOffer` cleared this frame — one notion of who is climbing, one
        // decision about him.
        if (_comebackRacer && this._comebackPrecedenceRacer?.index === _comebackRacer.index) {
          this._comebackDue = null; // COMEBACK-CUT-DELAY-1: the waited cut is taken
          return {
            nextState: CAM_STATE.COMEBACK_ZOOM,
            reason: `comeback-precedence: ${_comebackRacer.name ?? _comebackRacer.index} (cast comebacker, first shot)`,
            data: { comebackRacer: _comebackRacer, comebackPrecedence: true },
          };
        }
        // COMEBACK-CUT-DELAY-1: the weighted route's waited cut, matured and still HIM — taken
        // without a second draw, which would make the delay a re-roll of a decision already made.
        if (
          _comebackRacer &&
          this._comebackDue?.route === 'pick' &&
          this._comebackDue.index === _comebackRacer.index
        ) {
          this._comebackDue = null;
          return {
            nextState: CAM_STATE.COMEBACK_ZOOM,
            reason: `comeback: ${_comebackRacer.name ?? _comebackRacer.index} (after the cut delay)`,
            data: { comebackRacer: _comebackRacer },
          };
        }
      }

      // COMEBACK-CUT-DELAY-1: a weighted-route cut that matured and was NOT taken above (he is no
      // longer the detected comebacker, or the window closed) is dropped here, never left waiting.
      if (this._comebackDue?.route === 'pick') this._comebackDue = null;

      const overviewOffered = this._isOverviewEligible(ts, raceState) && this._overviewWeight > 0;

      const candidates = offerPool({
        battle: battleOffered
          ? { weight: this._battleWeight, closenessT: this._battleGates.closenessT }
          : null,
        leadChange: leadChangeOffered
          ? {
              weight: this._leadChangeWeight,
              from: this._prevLeaderName,
              to: this._currentLeaderName,
            }
          : null,
        comeback: _comebackRacer
          ? {
              weight: this._comebackWeight,
              racer: _comebackRacer,
              minPositionsGained: this._comebackGates.minPositionsGained,
            }
          : null,
        overview: overviewOffered ? { weight: this._overviewWeight } : null,
      });

      const { taken, ...decision } = arbitrateOffers(
        candidates,
        (c) => this._weightedRandomPick(c),
        (w) => this._acceptsOffer(w)
      );
      // COMEBACK-CUT-DELAY-1 — THE TRIGGER POINT on the weighted route: an accepted comeback offer
      // starts the delay instead of cutting; the camera keeps its shot (`null`) until it matures.
      if (taken?.state === CAM_STATE.COMEBACK_ZOOM && this._comebackCutDelayMs > 0) {
        this._comebackDue = { index: taken.data.comebackRacer.index, since: ts, route: 'pick' };
        return null;
      }
      if (taken?.state === CAM_STATE.OVERVIEW) {
        this._scheduleNextOverview(ts, raceState, leader);
      }
      return decision;
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
      // COMEBACK-PRECEDENCE-1, LIMIT 1: the racer's one forced shot is spent HERE, on the commit,
      // and not where it was offered — so an offer the frame did not turn into a shot leaves him
      // his turn.
      if (data.comebackPrecedence && data.comebackRacer.index != null) {
        this._comebackPrecedenceShown.add(data.comebackRacer.index);
      }
    }

    // CEREMONY-HOLD-TARGET-1 — THE BACKSTOP RELEASE. Since START-ONE-WINDOW-1 the hold normally
    // ends at the HAND-OVER, when the leader reaches his place in frame; this line is what ends it
    // in a race that never reaches the mark, so the hold can never outlive the start.
    //
    // The test is "the state actually changed", NOT "a transition was committed" and NOT "a state
    // was entered". The start window forces OVERVIEW, and the director commits an OVERVIEW→OVERVIEW
    // entry inside it: that is not a view change, and releasing on it would end the hold seconds
    // before the picture changes.
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
        // ── EXCEPT INSIDE THE SCHEDULED ENDGAME (ENDGAME-REPAIR-1) ─────────────────────────
        //
        // The hard cut is right for the rest of the race: a lead change IS a cut, and the shot
        // that follows it is a tight one on the two racers involved. Inside the endgame it is a
        // second author on the width the schedule owns — the same defect as the OVERVIEW snap
        // below, in the state the owner himself named as a live candidate.
        //
        // MEASURED on space-sprint, seed 21, his config and his roster, at 94.65% of the race
        // (reports/evolution/ENDGAME-REPAIR-1.md, measured with the BROWSER's camera seed): the delivered
        // width collapsed from 5.40 corridors to 1.33 IN ONE FRAME — a factor of four, 1.399 ln —
        // and the schedule then had to climb the whole way back, reaching 3.88 corridors over the
        // next eight frames. The picture goes wild, shows a shot with no line in it, and recovers.
        // That is his report, frame for frame.
        //
        // The state change itself is untouched: LEAD_CHANGE still runs, still picks its subject,
        // still writes the overlay names. Only the ZOOM cut stands down, and only while the
        // schedule is composing.
        if (!this._scheduleComposing()) {
          this.zoom = this._leadChangeZoom;
          this.targetZoom = this._leadChangeZoom;
        }
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
      // ZOOM-PACE-5: when the photo-finish shot began, which is what the cap's arrival is measured
      // from. Set on entry only, so a repeat transition inside the shot does not restart it.
      if (nextState === CAM_STATE.PHOTO_FINISH && prevState !== CAM_STATE.PHOTO_FINISH) {
        this._photoFinishEnteredTs = ts;
      }
      // ── THE SNAP STANDS DOWN DURING THE SCHEDULED ENDGAME (ENDGAME-REPAIR-1) ─────────────
      //
      // This is a CUT — it moves the zoom in one frame, deliberately, because entering OVERVIEW is
      // a change of shot. During the scheduled endgame it is a SECOND AUTHOR on the one quantity
      // the schedule owns, and the same sentence ENDGAME-SCHEDULE-2 wrote about the transition
      // glide applies to it word for word: two authors on one quantity is what hopping looks like.
      //
      // MEASURED on river-run under his config, at 94.25% of the race: LEAD_CHANGE -> OVERVIEW cut
      // the delivered width from 1.99 to 2.67 corridors in ONE frame, 0.294 ln, the largest step
      // left anywhere in the endgame. It then did worse than jump — the schedule read the cut width
      // as "the widen has reached what the line needs", declared the widen done, latched the close
      // on it, and the close's own parameter is pinned at 0 until the deadline, so the picture stood
      // ABSOLUTELY STILL from 94.25% to 95%. One cut, and both of the things his eye rejected.
      //
      // Nothing about OVERVIEW outside the endgame changes; `_runInComposingNow` is false there.
      if (nextState === CAM_STATE.OVERVIEW && !this._inFinishMode && !this._scheduleComposing()) {
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
  _applyLateralGuarantee(panTarget, headingT, subjects, camZoom, frameSize, anchorRacer = null) {
    if (!panTarget || !this._shape) return panTarget;
    const heading = this._headingAt(headingT);
    if (!heading) return panTarget;
    const len = Math.hypot(heading.x, heading.y);
    if (!(len > 0)) return panTarget;
    const perp = { x: -heading.y / len, y: heading.x / len };

    const anchor = subjects.point ?? panTarget;
    const effX = this._proj.effX(camZoom);
    const effY = this._proj.effY(camZoom);
    const at = this._anchorScreen(frameSize.width, frameSize.height, headingT);
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
    // ── LEADER-LATERAL-BUILD-1: AND NOW THE LEADER, WHO WAS NEVER AN INPUT ────────────────────
    //
    // WHY HE COULD NOT SIMPLY JOIN `offsets`, measured before this was written rather than after.
    // Adding him to the list above changes the answer on 0 of 2,019 frames on space-sprint seed 6,
    // for two independent reasons, either of which alone is fatal:
    //
    //   1. THE CORRIDOR EDGES ARE ALWAYS IN THE LIST, and `lateralShiftToFit` intersects intervals,
    //      so only the EXTREMES decide. The leader lies inside the corridor on every frame measured
    //      (0 of 2,019 outside it, body included), so his interval is a superset of theirs and he
    //      cannot narrow it.
    //   2. THE CORRIDOR DOES NOT FIT THE FRAME — on 100% of LEADER_ZOOM frames, because the shot is
    //      deliberately narrower than the road (it holds 0.78 of the corridor on space-sprint, 0.55
    //      on river-run). So the helper is permanently in its "split the difference" branch, which
    //      averages `lo` and `hi` and is therefore decided by the extremes alone, again.
    //
    // So he gets his OWN interval, from his own drawn body against the real frame, and the corridor's
    // answer is CLAMPED into it. That ordering is the owner's rule exactly: whenever `d` already
    // keeps him whole the clamp is inert and the picture is untouched — which is 95.8% of frames —
    // and when it does not, the camera moves the least that fixes it.
    let dFinal = d;
    if (anchorRacer) {
      const effXa = this._proj.effX(camZoom);
      const effYa = this._proj.effY(camZoom);
      const hs = this._headingScreen(headingT);
      const hl = hs ? Math.hypot(hs.x, hs.y) : 0;
      if (hl > 0) {
        // ── HIS BODY WHERE THE PIPELINE WILL ACTUALLY PUT IT ─────────────────────────────────
        //
        // The first cut of this placed him relative to `anchorScreenPoint` — the point the framing
        // rule WANTS the anchor at — and it was wrong in a way that made the whole rule inert: it
        // reported "he fits" on all 395 frames that still clipped, because the pan is not resolved
        // that way. `resolveCamera` and `_offsetYFor` both CENTRE the pan target and then clamp it
        // to the world bounds; the forward framing comes from the bias having already moved the
        // target world point, not from placing it off-centre. So the base here is the centred,
        // clamped camera, which is the same arithmetic those two do.
        //
        // The linear model behind the interval — shift the target by `d`, every other point moves
        // `-v*d` on screen — holds exactly while that clamp is off. Against a world edge the clamp
        // absorbs part of the shift and the step under-delivers; it never over-delivers, so the
        // failure is a leader still partly clipped rather than a camera that lurches.
        const fw = frameSize.width;
        const fh = frameSize.height;
        const camXMax = Math.max(this._worldBounds.minX, this._worldBounds.maxX - fw / effXa);
        const camYMax = Math.max(this._worldBounds.minY, this._worldBounds.maxY - fh / effYa);
        const camXb = Math.max(
          this._worldBounds.minX,
          Math.min(camXMax, panTarget.x - fw / (2 * effXa))
        );
        const camYb = Math.max(
          this._worldBounds.minY,
          Math.min(camYMax, panTarget.y - fh / (2 * effYa))
        );
        const body = {
          cx: (anchorRacer.x - camXb) * effXa,
          cy: (anchorRacer.y - camYb) * effYa,
          ux: hs.x / hl,
          uy: hs.y / hl,
          halfLen: ((anchorRacer.drawnBodyLengthPx ?? 0) / 2) * effXa,
          halfWid: ((anchorRacer.drawnBodyWidthPx ?? 0) / 2) * effYa,
        };
        // THE MARGIN, which is what makes the promise arrive rather than merely be made. This rule
        // decides the pan TARGET; the picture reaches that target through the pan smoother and is
        // therefore always some way behind it. A guarantee written exactly at the frame edge is
        // broken by that trailing before it is drawn — measured: with no margin the rule reported
        // "he fits" on 383 of the 394 frames that still clipped. `innerFramePct` does this same job
        // for every other subject; this is that idea, sized for this one from the measured trailing.
        const { lo, hi } = lateralAdmissibleForBody(
          body,
          vx,
          vy,
          fw,
          fh,
          this._leaderLateralMarginPx
        );
        if (lo <= hi) {
          const want = Math.min(hi, Math.max(lo, d));
          // THE BOUND, on the EXTRA movement only — today's corridor shift is not this piece's to
          // bound. Past it he stays partly clipped, deliberately: a camera that swings is the worse
          // failure, and the note on `lateralAdmissibleForBody` records what an unbounded rectangle
          // test did to this mechanism the first time.
          const cap = this._leaderLateralMaxPx;
          const extra = Math.max(-cap, Math.min(cap, want - d));
          dFinal = d + extra;
        }
        // No admissible interval means no sideways move fits him: he is lost ALONG the track. Leave
        // the shift alone — that residual belongs to the zoom guarantee, not to the pan.
      }
    }
    // Diagnostic only — read by nothing in the camera. VIEWER-INVARIANTS-2 needed to know whether
    // the lateral guarantee was the term steering the pan at the end of a race; it was not, and a
    // reading of the code could not have settled that either way.
    this._lastLateralShift = Number.isFinite(dFinal) ? dFinal : 0;
    // LEADER-LATERAL-BUILD-1, diagnostic only: how much of that shift is the leader's doing, so a
    // trace can separate this rule's contribution from the corridor's instead of inferring it.
    this._lastLeaderLateralExtra = Number.isFinite(dFinal - d) ? dFinal - d : 0;
    if (!Number.isFinite(dFinal) || dFinal === 0) return panTarget;
    return { x: panTarget.x + perp.x * dFinal, y: panTarget.y + perp.y * dFinal };
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
    if (!captured || captured.length < 2) return live;
    // CONTENDER-ZOOM-1: the whole captured set, not the first two of it. Looked up live by index —
    // WHO is fixed, WHERE they are is not.
    const found = captured.map((c) => this._findByIndex(racers, c.index, c.ref)).filter(Boolean);
    return found.length >= 2 ? found : live;
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
        // CONTENTION-WATCH-1: the racer who was just passed is a subject only while he can still
        // take it back. The pan already sits on the leader in this state, so only the GUARANTEE's
        // subject eases here.
        return {
          point: leader ? { x: leader.x, y: leader.y } : null,
          t: leader?.t ?? null,
          pair: [leader, this._contentionEased(passed, leader, this._frameTs)],
        };
      }
      case CAM_STATE.BATTLE_ZOOM: {
        const group = this._findGroupRacers(racers);
        const rawContenders = group.length >= 2 ? group : focusRacers;
        // CONTENTION-WATCH-1: a battle inside the endgame window is still a fight for the win, so
        // a member the race has decided eases out of it like any other subject. Outside the window
        // `_contentionEased` is the identity, so every earlier battle is untouched.
        const contenders = rawContenders.map((r) =>
          this._contentionEased(r, rawContenders[0] ?? null, this._frameTs)
        );
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
        const rawPair = this._photoFinishFramingPair(racers, focusRacers);
        // CONTENTION-WATCH-1: THE PIN STAYS, THE MEMBERSHIP EASES. FINISH-PAIR-1 pinned this set so
        // the picture could not lurch as the live top two re-sorted, and that is untouched — WHO was
        // captured is still fixed. What this adds is that a captured racer the race has since
        // decided eases out of the framing instead of being carried to the line. Measured on
        // space-sprint seed 9, the second member is FIFTH and about a second down by the crossing.
        const contenders = rawPair.map((r) =>
          this._contentionEased(r, rawPair[0] ?? null, this._frameTs)
        );
        const a = contenders[0];
        const b = contenders[1];
        const point =
          a && b
            ? getPanTarget(CAM_STATE.BATTLE_ZOOM, [a, b], this._shape)
            : a
              ? { x: a.x, y: a.y }
              : null;
        // THE PAN STAYS ON THE LEADING PAIR, THE GUARANTEE TAKES THEM ALL (CONTENDER-ZOOM-1).
        // `point` and `t` are unchanged — FINISH-PAIR-1 pinned them to a stable pair precisely so
        // the picture does not lurch, and widening the pan to a centroid of a set that can change
        // size would hand that back. What widens is the ZOOM: `pair` carries the whole captured set
        // and `contenderGuarantee` fits every one of them. At a set of two the two are identical.
        return { point, t: a && b ? (a.t + b.t) / 2 : (a?.t ?? null), pair: contenders };
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

  // ── THE GUARANTEE CEILINGS live in CameraDirectorCeilings.js (P1-CAMERADIRECTOR-SPLIT-1) ──────
  // `_guaranteeCeiling` here, and below `_corridorCapWeight`, `_corridorWidthCap`,
  // `_finishLineWorldPoint`, `_anchorScreen`, `_forwardFracNow`, `_lineCeiling`, `_companyCeiling`
  // and `_fieldCeiling` — installed onto this prototype at the bottom of this file. `_setTargets`
  // composes them; this file still decides the order they are asked in.

  // ── THE CONTENTION WATCH lives in CameraDirectorLevelSet.js (P1-CAMERADIRECTOR-SPLIT-1) ─────────
  // `_updateContentionWatch`, `_contentionWeight` and `_contentionEased` are installed onto this
  // prototype at the bottom of this file, with the level set and the abreast contenders. The unit
  // they all measure in stays HERE, as the two statics below, because tests and diagnostics reach
  // it as `CameraDirector.contactLengthBetween` / `CameraDirector.withinOneLength`.

  /**
   * ONE RACER LENGTH, between these two — the run-in's unit, defined ONCE (RUNIN-LEVEL-SET-BUILD-1).
   *
   * `pairContact`'s own along-track touch distance, `halfLengthA + halfLengthB`, i.e. exactly one
   * body length between two equal racers. It was written out at two call sites before this block
   * added a third that had to agree with both; a unit stated three times is a unit that can drift,
   * and the owner's rule is expressed IN this unit, so it is now stated once and read.
   */
  static contactLengthBetween(a, b) {
    return ((a?.drawnBodyLengthPx ?? 0) + (b?.drawnBodyLengthPx ?? 0)) / 2;
  }

  /**
   * THE OWNER'S RULE OF 2026-08-24, as a predicate: is `r` at most ONE RACER LENGTH behind `leader`
   * along the track? **Along-track only. His words: the across-track distance decides nothing about
   * membership, because a racer's lane says nothing about his chance.**
   */
  static withinOneLength(leader, r, pathLenPx) {
    const contact = CameraDirector.contactLengthBetween(leader, r);
    if (!(contact > 0) || !(pathLenPx > 0)) return false;
    return shortestArcDeltaT(leader.t, r.t) * pathLenPx <= contact;
  }

  // ── THE LEVEL SET AND THE ABREAST CONTENDERS live in CameraDirectorLevelSet.js ───────────────
  // `_levelContenders`, `_levelCeiling`, `_levelEaseTo`, `_abreastSurvivors` and
  // `_abreastContenders` (P1-CAMERADIRECTOR-SPLIT-1) — installed at the bottom of this file.

  // (The corridor cap, the finish line's demand and the anchor's screen point: CameraDirectorCeilings.js.)

  // ── THE RUN-IN / ENDGAME SCHEDULE lives in CameraDirectorRunIn.js (P1-CAMERADIRECTOR-SPLIT-1) ──
  // `_updateRunIn`, `_scheduleEngaged`, `_scheduleFittedProgress`, `_scheduleWiden`,
  // `_scheduleClose`, `_scheduleComposing`, `_runInSweepU`, `_beginRunInGlide` and
  // `_runInProgressOf` are installed onto this prototype at the bottom of this file. The
  // run-in's ceiling is still asked from here (`_setTargets`), and it still asks this file's
  // `_lineCeiling` for the finish line's demand.

  // (The company and field ceilings: CameraDirectorCeilings.js.)

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
    // AIM-ROOM-1 (LEVER B): the SAME reduction `anchorScreenPoint` applies, from the one helper, so
    // the aim and the pan cannot disagree about where the leader will sit.
    // ★ CORRECTED 2026-09-27 (DELIVERY-CLEAN-1 §4.3). This said "Inert at the shipped default
    // (`leaderAimRoomFloorPx` 0)". The shipped default is NOT 0, so the reduction is NOT inert and
    // a reader who believed this line would have discounted a lever that is live in every race.
    // The value is deliberately not restated here — it lives in `defaults.js`, which is its one
    // home, and a number in a comment has nothing checking it. What is true without the number:
    // the floor is applied whenever it is positive, and `forwardFracForRoomFloor` is the one
    // helper that applies it.
    const effFrac = forwardFracForRoomFloor(frac, span, this._leaderAimRoomFloorPx);
    const worldBias = ((effFrac - 0.5) * span) / sLen;
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
  /**
   * RUNIN-NAMES-1 — has the run-in's closing zoom arrived at its target?
   *
   * PUBLISHED FOR THE RENDERER, and for nothing in the camera. `frameCameraInputs` reads it off the
   * director by name, so it is a getter rather than an underscore field: the renderer's contract is
   * the DECLARED list in `frameCameraInputs.js`, and a private field on that list would be reaching
   * through the class rather than reading its surface.
   *
   * @returns {boolean} true from the arrival onward, for the rest of the race
   */
  get runInArrived() {
    return this._runInArrived;
  }

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
    // ── RUNIN-ORDER-FIX-1: THE PAN IS *NOT* RESOLVED HERE, AND THAT IS THE WHOLE REPAIR ───────
    //
    // This method now answers ONE question — how wide — and stops. The aim is resolved by
    // `_resolvePanTarget()`, which `update()` calls AFTER it has settled this frame's zoom.
    //
    // WHY THE SPLIT IS THE FIX RATHER THAN ANOTHER CORRECTION. An aim is stored as a screen offset,
    // `world x scale`, so it is only meaningful beside the scale it was taken at. Resolving it here
    // meant taking it at the PREVIOUS frame's zoom and drawing it at this one's, and the error is
    // multiplied by the subject's distance from the world origin. RUNIN-VIABLE-1 measured the
    // consequence: the aim's own across-track component is identically 0.00 px — the framing rule
    // never aims sideways — yet the subject moved up to 59 px across the picture, and ALL 221
    // across-track jumps landed on frames drawn at a different scale than their aim was resolved at.
    //
    // THE PROOF THAT THIS ORDER IS AVAILABLE WAS ALREADY IN THIS FILE. The ENTRY path hoists its
    // zoom lerp above `_setTargets` for exactly this reason, and its own note says so in the same
    // words — "so that targetOffsetX is computed with the post-lerp zoom". That path carried none of
    // the corrections this repair deletes. It was right; it was simply never generalised.
    this._panCtx = { target, proj, frameSize, minEffZoom, zoomResolved };
  }

  /**
   * RUNIN-ORDER-FIX-1 — RESOLVE THE AIM AT THE SCALE THE FRAME IS ACTUALLY DRAWN AT.
   *
   * Called from `update()` once this frame's zoom is settled, whichever path settled it. Everything
   * here was previously the second half of `_setTargets`; nothing about WHAT it computes changed,
   * only WHEN. `this.zoom` is now the drawn zoom, so `proj.effX(this.zoom)` below is the scale the
   * renderer will use rather than the one the previous frame used.
   */
  _resolvePanTarget() {
    const ctx = this._panCtx;
    if (!ctx) return;
    const { target, proj, frameSize, minEffZoom, zoomResolved } = ctx;

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
    // Diagnostic only — the WORLD point the pan was aimed at this frame, before the smoother.
    // Read by nothing in the camera; VIEWER-INVARIANTS-2 needed it to settle which subject the pan
    // was actually tracking at the end of a race, which reading the framing rule could not.
    this._lastPanTargetX = target.x;
    this._lastPanTargetY = target.y;
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
    // ZOOM-PACE-5: the arrival needs THIS frame's clock. `_lastTs` is not it — `update()` writes
    // that AFTER `_setTargets` returns, so reading it here gives the previous frame's time.
    this._frameTs = ts;
    // CONTENTION-WATCH-1: ask who can still win BEFORE the framing is built from them. It runs on
    // its own cadence and returns immediately outside the endgame window, so the cost outside it is
    // one comparison per frame.
    this._updateContentionWatch(racers, raceState, ts);
    const focusRacers = this._focusRacers(racers);
    const frameSize = { width: canvasW, height: canvasH };
    const stateZoom = this._stateCamZoom();

    // ── WHO ────────────────────────────────────────────────────────────────────────────────────
    const subjects = this._framingSubjects(racers, focusRacers);
    let panTarget = subjects.point;
    let headingT = subjects.t;
    let pinAcross = true;

    // OVERVIEW's anchor exceptions, in priority order. Each REPLACES the anchor and then rejoins.
    if (this.state === CAM_STATE.OVERVIEW) {
      const beforeHandover =
        raceState && raceState.raceElapsed < this._startWindowMs && !this._startHandoverDone;
      if (this._inFinishMode && this._shape && raceState?.finishT > 0) {
        // Hold a fixed point behind the line so the approach stays visible while the winner runs out.
        const lookbackT = this._finishLookbackT(raceState.finishT);
        const target = lookbackT === null ? null : this._shape.getPosition(lookbackT, 0);
        if (target) {
          panTarget = target;
          headingT = lookbackT;
        }
      } else if (beforeHandover && this._startFreezePoint) {
        // ── THE SHOT OPENS WHERE IT STANDS. IT DOES NOT PAN (START-ONE-WINDOW-1) ────────────────
        //
        // The owner's design: at the gun the camera opens the shot, and it does NOT pan; it begins
        // to move only when the leader has reached the place in frame he holds for the rest of the
        // race. So the anchor is a FIXED WORLD POINT — the one the ceremony left at the centre of
        // the picture — and it stays the anchor until the hand-over.
        //
        // WHAT THIS REPLACED, and it is a swap rather than an addition: the field's CENTROID, held
        // for a hard-coded 3000 ms "before a leader exists, so nobody is cropped at the gun". The
        // centroid moves the instant the race does, so that branch panned — measured at 187 world px
        // in the first 400 ms on dirt-oval, which is the motion four blocks in a row tried to
        // explain (START-OVERSHOOT-1).
        //
        // IT COMPOSES WITH THE PIVOT CORRECTION and needs nothing from it: `_framingProbe.anchorPoint`
        // IS this point, so ZOOM-PIVOT-START-1's correction holds it fixed on screen while the zoom
        // opens around it. Freezing the anchor without that correction would still have drifted.
        //
        // `pinAcross` stays FALSE, as it was for the centroid: this is a point, not a subject on the
        // racing line, and pinning it across the corridor would move the thing that must not move.
        panTarget = this._startFreezePoint;
        headingT = null;
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
    // THE CORRIDOR CAP, computed once beside the ceilings it does NOT belong to. `null` outside the
    // pair states and whenever the key is off, so the composition below is a no-op there.
    const _corridorCap = this._contenderZoom ? this._corridorWidthCap(subjects, frameSize) : null;
    // ── ENDGAME-SCHEDULE-1: THE SCHEDULE OWNS THE WIDTH, IT DOES NOT COMPETE FOR IT ───────────
    //
    // A schedule that is merely one more entry in this `Math.min` is not a schedule: any term that
    // happens to be wider overrides it, and the picture then sits against THAT bound, motionless.
    // Measured before this line, on mountainstreet: the shot held 800 px — OVERVIEW's own width —
    // from 94.9% to 97.0% of the race and only began to close when the STATE changed, at which
    // point it dived at -2.3 ln/s. Standstill and abruptness from the same cause, and neither of
    // them anything the schedule asked for.
    //
    // So during the scheduled endgame the schedule REPLACES `state` — it is the state's own width
    // authority for that phase, which is what requirements 2 and 3 describe — and the separate
    // `line` term retires, because the schedule already contains the line's demand as the value it
    // widens to. THE GEOMETRIC GUARANTEES ARE UNTOUCHED: corridor, company and field still widen
    // the shot if a subject would be cut, and a guarantee widens, it never steers (Lesson 192).
    // ...AND it has a width to place. With none, the state keeps its own authority for the frame.
    const _scheduled = this._scheduleComposing() && Number.isFinite(_runInCeiling);
    const _ceilings = {
      state: _scheduled ? _runInCeiling : stateZoom,
      guarantee: this._guaranteeCeiling(subjects, frameSize),
      company: _companyIsHome ? Infinity : this._companyCeiling(subjects, racers, frameSize),
      // CEREMONY-HANDOVER-1: the ceremony's promise, still standing. Infinity once it has retired,
      // so this line costs nothing for the rest of the race.
      field: this._fieldCeiling(subjects, racers, frameSize),
      // RUNIN-OWNS-1: the run-in. Infinity outside the endgame window, so this line costs nothing
      // for the rest of the race either — and INSIDE the window it is one more ceiling among the
      // others, which is why the shot it hands back at the line is bit-for-bit the state's own.
      // `stateZoom` above IS the run-in's second bound; it needed no code.
      line: _scheduled ? Infinity : _runInCeiling,
    };
    // ── ENDGAME-SCHEDULE-2: DURING THE SCHEDULED ENDGAME THE SCHEDULE IS THE SOLE AUTHOR ──────
    //
    // A schedule that is min'd against other bounds is a CLIPPED schedule, and a clipped smooth
    // curve is not a smooth curve. Measured on the served candidate, 12-31% of the endgame's frames
    // were placed by something other than the schedule, and every one of the worst single-frame
    // zoom steps happened on such a frame — `guarantee-after-cap` at 97.6% on ice-track and
    // space-sprint, worth 0.033 and 0.052 ln in ONE frame (21 and 33 screen px at the frame edge).
    // That is the owner's "the zoom visibly hops"; it is structural, not cosmetic.
    //
    // So while the schedule is composing, the other width authorities STAND DOWN. They are still
    // COMPUTED — `_framingProbe.wouldHave` carries what each would have asked for — so the cost of
    // this is measured every frame rather than assumed. See the report for the count.
    const _wouldHave = _scheduled
      ? {
          guarantee: _ceilings.guarantee,
          company: _ceilings.company,
          field: _ceilings.field,
        }
      : null;
    let guaranteed = _scheduled
      ? _ceilings.state
      : Math.min(
          _ceilings.state,
          _ceilings.guarantee,
          _ceilings.company,
          _ceilings.field,
          _ceilings.line
        );
    // ── THE CORRIDOR IS A CEILING ON WIDTH, NOT A FLOOR (CONTENDER-ZOOM-1) ──────────────────────
    //
    // THE OWNER'S CORRECTED RULE, and it is the opposite way round from how this was first built:
    // the corridor width is a MAXIMUM. Never wider than the track is wide, because showing the whole
    // width certainly shows everyone; and if the full width is NOT needed, the shot closes in
    // further. The contenders decide how tight it gets — the road only says how loose.
    //
    // EVERY OTHER TERM IN THIS FUNCTION IS A CEILING ON ZOOM, i.e. a LOWER bound on width, composed
    // with `min`. A maximum WIDTH is the other direction: a LOWER bound on zoom, composed with
    // `max`. That asymmetry is the whole reason this cannot be another entry in `_ceilings` — it
    // would silently mean the opposite of every line beside it.
    //
    // WHY IT IS SCOPED TO THE PAIR STATES. On the single-anchor shots the road already lost, and for
    // the owner's own reason: THE ROAD IS NOT WHO MATTERS, THE RACERS ARE (CAMERA-COMPANY-ONLY-3,
    // approved 2026-08-05). Re-imposing it there would overturn a decision he has already made. The
    // finish is the one place he has now said the road IS the sufficient bound.
    //
    // THE CONTENDERS WIN IF THEY CONFLICT, and that is deliberate rather than a fallback: his first
    // rule is that ALL participants must be visible, and the corridor is only his shortcut for
    // "certainly enough". If a contender needs more room than a track width, honouring the cap would
    // cut him — so the cap is applied to the OTHER terms and the contender ceiling is re-applied
    // after it. How often that happens is measured rather than assumed; see the report.
    const _preCapGuaranteed = guaranteed;
    // The corridor cap is one of the authorities standing down: it is applied AFTER the min and
    // its two re-clamps were the term that produced the worst hops. `_scheduled` excludes it.
    if (
      !_scheduled &&
      this._contenderZoom &&
      _corridorCap !== null &&
      Number.isFinite(_corridorCap)
    ) {
      // THE BLEND IS IN LOG SPACE, and that is the same reasoning the diagnosis rested on: a scale
      // change is perceived logarithmically, so a linear blend of zooms would still arrive as an
      // uneven move. `w = 0` leaves the shot untouched; `w = 1` is the full cap; in between the
      // demand grows smoothly with the leader's approach.
      const w = this._corridorCapWeight();
      if (w > 0 && _corridorCap > guaranteed) {
        guaranteed = guaranteed * Math.pow(_corridorCap / guaranteed, w);
      }
      if (Number.isFinite(_ceilings.guarantee)) {
        guaranteed = Math.min(guaranteed, _ceilings.guarantee);
      }
    }
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
    // ── ENDGAME-SCHEDULE-1: THE CLOSE IS A RATCHET ────────────────────────────────────────────
    //
    // His requirement 3 is absolute — after the turn the shot closes and never opens again, any
    // reversal is a failed candidate — and the SCHEDULE is monotone by construction. It is not the
    // only authority, though: a geometric guarantee can still widen the delivered shot past it, and
    // measured, the contender guarantee does exactly that as a pair spreads at the line (4 frames,
    // +4% on space-sprint under his config; two tracks under the shipped defaults).
    //
    // So during the scheduled CLOSE the width is ratcheted: never wider than it has already been.
    //
    // THAT OVERRIDES A GEOMETRIC GUARANTEE, which is not a thing to do on an argument — so it is
    // PRICED, in the only currency that matters, RACERS. `endgame-spec` counts every frame on which
    // one of the director's own `_abreastContenders` falls outside the canvas:
    //
    //     his config      TODAY 59 frames   ->  ratcheted 35
    //     shipped         TODAY 109 frames  ->  ratcheted 33
    //
    // The ratchet CUTS FEWER CONTENDERS THAN TODAY DOES, on both arms and by a wide margin, because
    // the schedule's shot is wider than today's through the part of the endgame where the field is
    // still spread. The guarantee it overrides was, on those frames, arguing for width the schedule
    // had already provided.
    //
    // THIS WAS FIRST MEASURED THE OTHER WAY ROUND AND THE READING WAS WRONG. The baseline runs that
    // said "0 cut frames" predated this counter, so the field was absent and read as zero; against
    // that phantom the ratchet looked like it was buying monotonicity with racers. It is not — it is
    // buying monotonicity and returning racers. A metric that is missing must never be read as good.
    // ...AND the close is running: the ratchet is the CLOSE's monotonicity, not the widen's.
    if (this._scheduleComposing() && this._runInAfterDeadline) {
      if (this._runInRatchet !== null) guaranteed = Math.max(guaranteed, this._runInRatchet);
      this._runInRatchet = guaranteed;
    } else {
      this._runInRatchet = null;
    }
    this._runInActive = this._runInComposingNow;
    this._runInBinding = this._runInActive && guaranteed >= _runInCeiling - 1e-12;
    // BELOW `_runInBinding` ON PURPOSE. That flag means "the SCHEDULE is what the width
    // authorities settled on", and `update()` reads it to choose an anchor. Composing above it
    // would flip it to false on every frame this guarantee widens and quietly move the anchor —
    // a side effect nobody asked for. The level term reports itself separately on the probe.
    // ── THE OWNER'S RULE OF 2026-08-24, APPLIED LAST (RUNIN-LEVEL-SET-BUILD-1) ────────────────
    //
    // AFTER THE RATCHET, AND THAT IS THE DELIBERATE PART. The ratchet is requirement 3 — once the
    // close begins the shot never re-opens — and it is computed from, and stored as, the SCHEDULE's
    // own width. Composing here leaves that untouched: `_runInRatchet` still carries the schedule's
    // monotone curve, so when this guarantee releases the shot returns to exactly that curve rather
    // than to a value the guarantee moved. What it does mean is that a racer who would be CUT can
    // re-open the delivered picture, and requirement 3 yields to him.
    //
    // THAT ORDER IS NOT NEW AND IT IS NOT MINE. `_corridorWidthCap` already states the same
    // precedence in the same file: **THE CONTENDERS WIN IF THEY CONFLICT** — *"his first rule is
    // that ALL participants must be visible, and the corridor is only his shortcut for 'certainly
    // enough'."* This is that rule with the owner's own membership in place of the shortcut.
    //
    // THE COST IS REAL AND IT IS MEASURED, not waved past — see the report's re-open section.
    const _levelCeil = this._levelCeiling(racers, subjects, frameSize, guaranteed, ts);
    const _preLevel = guaranteed;
    if (Number.isFinite(_levelCeil) && _levelCeil < guaranteed) guaranteed = _levelCeil;
    // ── WHAT ACTUALLY DECIDED THE DELIVERED ZOOM (ZOOM-PACE-5) ─────────────────────────────────
    //
    // THIS FIELD LIED, AND IT COST THREE REPORTS AND TWO NO-OP BUILDS. It was the argmin over
    // `_ceilings` alone, while the corridor cap is applied to `guaranteed` AFTERWARDS — so on every
    // frame the cap decided the shot, this still named whichever ceiling happened to be smallest.
    // A trace reading it concluded the run-in was in charge when it was not, three times running.
    //
    // IT NOW NAMES THE TERM THAT PRODUCED `guaranteed`, whatever stage it came from. The argmin is
    // still the answer when nothing after it moved the number; when the cap raised it, the cap is
    // named; when the contender guarantee then clamped it back down, that is named instead. The
    // rule is "which term is the delivered zoom equal to", not "which ceiling was smallest".
    let _binding = 'state';
    for (const k of Object.keys(_ceilings)) if (_ceilings[k] < _ceilings[_binding]) _binding = k;
    if (guaranteed > _preCapGuaranteed + 1e-12) {
      // RUNIN-LINE-1 named the third outcome. Two of these existed and the probe therefore reported
      // `guarantee-after-cap` for a frame the LINE had clamped — the same class of lie ZOOM-PACE-5
      // opened this block to remove, one clamp later. A term that can decide the shot and cannot be
      // named is a term the next diagnosis will miss.
      _binding =
        _corridorCap !== null && Math.abs(guaranteed - _corridorCap) <= 1e-9
          ? 'corridor-cap'
          : Number.isFinite(_ceilings.line) && Math.abs(guaranteed - _ceilings.line) <= 1e-9
            ? 'line-after-cap'
            : 'guarantee-after-cap';
    }
    // RUNIN-LEVEL-SET-BUILD-1, diagnostic only and read by nothing in the camera: what the level
    // guarantee asked for, whether it decided the delivered width, and how many racers were level.
    // Named rather than left to an argmin, because RUNIN-CONTENDER-GUARANTEE-1 recorded what an
    // unnamed term costs a later diagnosis.
    if (Number.isFinite(_levelCeil) && guaranteed < _preLevel - 1e-12) _binding = 'level';
    this._framingProbe = {
      levelCeiling: _levelCeil,
      levelBound: Number.isFinite(_levelCeil) && guaranteed < _preLevel - 1e-12,
      levelSetSize: this._levelSet,
      levelPreWidth: _preLevel,
      ceilings: _ceilings,
      wouldHave: _wouldHave,
      scheduled: _scheduled,
      binding: _binding,
      // ── FIELD-RETIRED-1: THE RETIREMENT IS AN EVENT, AND UNTIL NOW ONLY ITS AFTERMATH WAS VISIBLE.
      //
      // `ceilings.field` already appears above, but it is `Infinity` both BEFORE the guarantee is
      // armed and AFTER it retires, so nothing outside this class could tell "retired on this frame"
      // from "was never active". That matters because the retirement is the single largest one-frame
      // picture move of a real race — measured at 14.8x the local median pan AND the largest zoom
      // step of the race, on city-circuit seed 9 — and it is DELIBERATE. An instrument watching for
      // a motion fault sees it and cannot tell it from one; two days went into a single-frame camera
      // step this week before it was identified by hand.
      //
      // PUBLISHED, NOT DETECTED. These are the two values this class already keeps; nothing is
      // computed here and no threshold is chosen. Whether to BUILD a motion-continuity check on them
      // is the owner's to order, and MOTION-CONTINUITY-1 sets out what it would cost.
      //
      // Read by nothing in the camera. Like `corridorCap` above, it is diagnostic only.
      fieldActive: this._fieldGuaranteeActive,
      fieldRetiredAt: this._fieldGuaranteeRetiredAt,
      t: subjects.t,
      runInActive: this._runInActive,
      runInBinding: this._runInBinding,
      runInCeiling: _runInCeiling,
      stateBinding: guaranteed >= stateZoom - 1e-12,
      frameW: frameSize.width,
      frameH: frameSize.height,
      stateZoom,
      guaranteed,
      point: subjects.point, // the anchor world point (§4b: is its BODY inside, or just its centre?)
      pair: subjects.pair, // the guaranteed contenders, when the state guarantees them
      // CONTENDER-ZOOM-1, diagnostic only — read by nothing in the camera. `corridorCap` is the
      // zoom FLOOR the road imposes (null when it does not apply) and `capBound` says whether it
      // actually moved the delivered zoom, so "the corridor is the ceiling" can be measured as a
      // frequency rather than asserted.
      corridorCap: _corridorCap,
      capBound: _corridorCap !== null && guaranteed > _preCapGuaranteed + 1e-12,
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
    // LEADER-LATERAL-BUILD-1 — scoped to LEADER_ZOOM. LEAD_CHANGE and OVERVIEW keep their current
    // behaviour: they are named as out of this piece, and OVERVIEW shares the 'leader' anchor, so
    // keying off the anchor kind rather than the state would have widened the change silently.
    panTarget = this._applyLateralGuarantee(
      panTarget,
      headingT,
      subjects,
      guaranteed,
      frameSize,
      this.state === CAM_STATE.LEADER_ZOOM ? this._focusAnchorRacer(racers) : null
    );
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

  // ── THE START CEREMONY lives in CameraDirectorCeremony.js (P1-CAMERADIRECTOR-SPLIT-1) ──────────
  // `_venueCamZoom`, `_ceremonyTargetCamZoom`, `ceremonySchedule`, `setCeremonyBrandActive`,
  // `_formationCentre` and `updateCountdown` are installed onto this prototype at the bottom of
  // this file. They run only before the gun; what they leave behind for the race is
  // `_ceremonyHoldZoom`, `_fieldGuaranteeActive` and `_startFreezePoint`.

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
// P1-CAMERADIRECTOR-SPLIT-1: the guarantee ceilings — CameraDirectorCeilings.js.
Object.defineProperties(CameraDirector.prototype, Object.getOwnPropertyDescriptors(ceilingsMixin));
// P1-CAMERADIRECTOR-SPLIT-1: contention watch, level set, abreast contenders — CameraDirectorLevelSet.js.
Object.defineProperties(CameraDirector.prototype, Object.getOwnPropertyDescriptors(levelSetMixin));
// P1-CAMERADIRECTOR-SPLIT-1: the run-in / endgame schedule — see CameraDirectorRunIn.js.
Object.defineProperties(CameraDirector.prototype, Object.getOwnPropertyDescriptors(runInMixin));
// P1-CAMERADIRECTOR-SPLIT-1: the start ceremony's camera — see CameraDirectorCeremony.js.
Object.defineProperties(CameraDirector.prototype, Object.getOwnPropertyDescriptors(ceremonyMixin));
