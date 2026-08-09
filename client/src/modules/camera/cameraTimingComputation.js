// ============================================================
// File:        cameraTimingComputation.js
// Path:        client/src/modules/camera/cameraTimingComputation.js
// Project:     RaceArena
//
// WHAT THIS IS FOR: resolving a raw camera config into every TIMING number the director trusts —
// holds, caps, cooldowns, lerp time-constants, the phased-observer durations, the weights. Every
// timing default and every fallback lives here and nowhere else, so a director built with no config
// at all gets its behaviour by calling this with `null`.
//
// WHAT IT IS NOT FOR: anything spatial. It has no idea how wide a shot is. Its sibling
// framingConfig.js resolves HOW WIDE and HOW; this one resolves WHEN. Both are pure, both are
// called on construction and again on every live-apply, and neither imports from CameraDirector.js.
//
// A NOTE ON WHAT IT RETURNS. It returns the per-state MAPS (`tcByState`, `lfByState`,
// `lfEntryByState`) and not the per-state scalars. It used to return both — forty numbers that had
// to agree with twenty — and the scalars were read by nothing but their own assertions, which is
// the arrangement where a wrongly-built map stays green (CAMERA-HYGIENE-2).
// ============================================================

// THE fallback constants for every timing tunable. A director built with no config at all gets
// these by calling computeTimingFromConfig(null) — there is deliberately no second copy anywhere
// (CAMERA-HYGIENE-2 deleted the sixteen that had accumulated in CameraDirector.js).
// MIRRORS-BY-REFERENCE: the fallbacks below read the canonical home instead of copying it. See LESSONS L207.
import { DEFAULT_CAMERA_CONFIG } from '../storage/defaults.js';

const MAX_STATE_DURATION = 8000;
// START-CEREMONY-CAMERA-1 — the ceremony's RHYTHM, and only the rhythm. Both ends of the move are
// GEOMETRY (the track's extent, the field's extent) and are not settings at all.
//
// These three are duplicated in `storage/defaults.js`, which is this module's established
// arrangement rather than an oversight — see the header: it holds the fallback for a director built
// with NO config, and defaults.js holds the shipped value. The duplication is GUARDED by a test that
// asserts the two agree, the same answer `autoSpriteScale.js` gives for CANVAS_H_REF. That is one
// better than `POST_START_HOLD_MS` beside it, which is duplicated and unguarded.
const CEREMONY_VENUE_MS = 1400;
const CEREMONY_PUSH_MS = 2000;
const CEREMONY_SETTLED_MS = 4000;
// START-BOARD-2. Duplicated from defaults.js like the three beats above it, and guarded the same
// way: cameraTimingComputation.test.js asserts the two agree.
const START_BOARD_FLOOR_MS = 6000;
const COUNTDOWN_DIGITS_MS = 3000;
const BATTLE_MAX_DURATION = 6000;
const MIN_STATE_HOLD_MS = 5000;
const FRAME_RATE = 60;
const TC_OVERVIEW = 1.5;
const TC_LEADER = 0.3;
const TC_BATTLE = 0.3;
const TC_COMEBACK = 0.3;
const ENDGAME_PROGRESS_THRESHOLD = 0.85;
const DEFAULT_MAX_ENTRY_DURATION_MS = {
  OVERVIEW: 10000,
  LEADER_ZOOM: 5000,
  BATTLE_ZOOM: 5000,
  COMEBACK_ZOOM: 5000,
  LEAD_CHANGE: 5000,
};

// All camera state names — mirrors CAM_STATE in CameraDirector.js.
const ALL_STATES = ['OVERVIEW', 'LEADER_ZOOM', 'BATTLE_ZOOM', 'COMEBACK_ZOOM', 'LEAD_CHANGE'];

// Per-frame lerp factor at FRAME_RATE fps. 90% convergence ≈ 3.45 × TC.
// Formula: 1 − 0.1^(1 / (tc × FRAME_RATE)).
function tcToLerpFactor(tc) {
  return 1 - Math.pow(0.1, 1 / (tc * FRAME_RATE));
}

/**
 * Derive all CameraDirector timing parameters from a config object.
 * Pure function — no side effects, no class dependencies.
 * Called by CameraDirector._computeTimingConfig() which destructures
 * the result into this._* instance fields.
 *
 * @param {object|null} config  Camera config as produced by cameraConfig.js.
 * @returns {object}  All derived timing values as a plain object.
 */
export function computeTimingFromConfig(config) {
  // ── Global tunables ───────────────────────────────────────────────────────
  const battlePulkThresholdT =
    config?.battlePulkThresholdT ?? DEFAULT_CAMERA_CONFIG.battlePulkThresholdT;
  const battleMinDurationMs =
    config?.battleMinDurationMs ?? DEFAULT_CAMERA_CONFIG.battleMinDurationMs;
  const battleIsolationThresholdT =
    config?.battleIsolationThresholdT ?? DEFAULT_CAMERA_CONFIG.battleIsolationThresholdT;
  const battleMaxGroupSize = Math.max(
    3,
    Math.min(6, config?.battleMaxGroupSize ?? DEFAULT_CAMERA_CONFIG.battleMaxGroupSize)
  );
  const battleMaxGroupRankSpan =
    config?.battleMaxGroupRankSpan ?? DEFAULT_CAMERA_CONFIG.battleMaxGroupRankSpan;
  const battleMinTopN = config?.battleMinTopN ?? DEFAULT_CAMERA_CONFIG.battleMinTopN;
  const endgameThreshold = config?.endgameThreshold ?? ENDGAME_PROGRESS_THRESHOLD;
  const postStartHoldMs = config?.postStartHoldMs ?? DEFAULT_CAMERA_CONFIG.postStartHoldMs;
  // Clamped to a sane band so a corrupt stored config cannot produce a ceremony that never ends or
  // one with a negative beat. The easing NAME is not validated here: `ceremonyEasing` resolves an
  // unknown name to the shipped curve, so validating it twice would be a second authority on it.
  const ceremonyVenueMs = ceremonyMs(config?.ceremonyVenueMs, CEREMONY_VENUE_MS);
  const ceremonyPushMs = ceremonyMs(config?.ceremonyPushMs, CEREMONY_PUSH_MS);
  const ceremonySettledMs = ceremonyMs(config?.ceremonySettledMs, CEREMONY_SETTLED_MS);
  // START-BOARD-2: the board's own duration, clamped through the same guard as the beats. The board
  // is drawn by the renderer, not the camera — but the camera needs these two numbers because the
  // countdown's LENGTH is now the sum of the beats and one of the beats is the board's hold.
  const startBoardFloorMs = ceremonyMs(config?.startBoardFloorMs, START_BOARD_FLOOR_MS);
  const startBoardMsPerName = Math.max(
    0,
    Math.min(1000, config?.startBoardMsPerName ?? DEFAULT_CAMERA_CONFIG.startBoardMsPerName)
  );
  // CEREMONY-TRUTH-1: the digits' window, and the camera needs it for exactly the reason above —
  // the countdown's LENGTH is the sum of the beats, and this is one of them. It was missing here,
  // so the director planned a ceremony that ended where the digits were due to START.
  const countdownDigitsMs = ceremonyMs(config?.countdownDigitsMs, COUNTDOWN_DIGITS_MS);
  const ceremonyEasing = config?.ceremonyEasing ?? DEFAULT_CAMERA_CONFIG.ceremonyEasing;
  const battleCooldownMs = config?.battleCooldownMs ?? DEFAULT_CAMERA_CONFIG.battleCooldownMs;
  const showDiagnostics =
    config?.showCameraDiagnostics ?? DEFAULT_CAMERA_CONFIG.showCameraDiagnostics;
  const diagEnabled = config?.enableFrameLog ?? DEFAULT_CAMERA_CONFIG.enableFrameLog;
  const detourEnabled = config?.cameraDetourLog ?? DEFAULT_CAMERA_CONFIG.cameraDetourLog; // CAMERA-DETOUR-1 per-transition frame log
  const transitionTConvergence =
    config?.transitionTConvergence ?? DEFAULT_CAMERA_CONFIG.transitionTConvergence;
  const overviewCooldownMs = config?.overviewCooldownMs ?? DEFAULT_CAMERA_CONFIG.overviewCooldownMs;
  // CAMERA-ZOOM-UNIT-1 removed three OVERVIEW zoom inputs that the track-widths unit replaces:
  //   overviewClosedTrackZoom  — dead since 2026-06-04, its Dev Screen tooltip still described
  //                              behaviour it did not have; key, slider and tooltip all gone now
  //   overviewTargetScreenPx   — was the OVERVIEW zoom's target SPRITE SIZE, then the render-time
  //                              sprite floor; CAMERA-PICTURE-FIXES-1 removed the floor and the key
  //   overviewMinEffZoom       — an open-track-only second zoom bound on the same surface

  // Per-state lead-ahead toggle (default true for backward compat with old configs).
  const leadAheadEnabledByState = {};
  for (const s of ALL_STATES) {
    leadAheadEnabledByState[s] = config?.cameraStateProfiles?.[s]?.leadAheadEnabled ?? true;
  }

  // Per-state lead-out toggle (default true for backward compat with old configs).
  const leadOutEnabledByState = {};
  for (const s of ALL_STATES) {
    leadOutEnabledByState[s] = config?.cameraStateProfiles?.[s]?.leadOutEnabled ?? true;
  }

  // Per-state max entry duration.
  const profiles = config?.cameraStateProfiles;
  const maxEntryDurationByState = {};
  for (const s of ALL_STATES) {
    maxEntryDurationByState[s] =
      profiles?.[s]?.maxEntryDurationMs ?? DEFAULT_MAX_ENTRY_DURATION_MS[s] ?? 10000;
  }

  // ── Per-state TC / minHold / maxDuration (profiles path vs legacy path) ───
  let tcOverview, tcLeader, tcBattle, tcComeback, tcLeadChange;
  let tcEntryOverview, tcEntryLeader, tcEntryBattle, tcEntryComeback, tcEntryLeadChange;
  let minStateHoldMs, battleMaxDurationMs, maxStateDuration;
  let minStateHoldByState, maxStateDurationByState, phasedByState;

  if (profiles) {
    const profTc = (key, fallback) => profiles[key]?.trackingTC ?? fallback;
    const profMin = (key) => profiles[key]?.minStateHold ?? MIN_STATE_HOLD_MS;
    const profMax = (key, fallback) => profiles[key]?.maxStateDuration ?? fallback;
    const profEntryTc = (key, fallback) => profiles[key]?.entryTC ?? fallback;

    tcOverview = profTc('OVERVIEW', TC_OVERVIEW);
    tcLeader = profTc('LEADER_ZOOM', TC_LEADER);
    tcBattle = profTc('BATTLE_ZOOM', TC_BATTLE);
    tcComeback = profTc('COMEBACK_ZOOM', TC_COMEBACK);
    tcLeadChange = profTc('LEAD_CHANGE', TC_LEADER);

    minStateHoldMs = profMin('OVERVIEW');
    battleMaxDurationMs = profMax('BATTLE_ZOOM', BATTLE_MAX_DURATION);
    maxStateDuration = profMax('OVERVIEW', MAX_STATE_DURATION);

    minStateHoldByState = {
      OVERVIEW: profMin('OVERVIEW'),
      LEADER_ZOOM: profMin('LEADER_ZOOM'),
      BATTLE_ZOOM: profMin('BATTLE_ZOOM'),
      COMEBACK_ZOOM: profMin('COMEBACK_ZOOM'),
      LEAD_CHANGE: profMin('LEAD_CHANGE'),
    };
    maxStateDurationByState = {
      OVERVIEW: profMax('OVERVIEW', MAX_STATE_DURATION),
      LEADER_ZOOM: profMax('LEADER_ZOOM', MAX_STATE_DURATION),
      BATTLE_ZOOM: profMax('BATTLE_ZOOM', BATTLE_MAX_DURATION),
      COMEBACK_ZOOM: profMax('COMEBACK_ZOOM', MAX_STATE_DURATION),
      LEAD_CHANGE: profMax('LEAD_CHANGE', MAX_STATE_DURATION),
    };

    tcEntryOverview = profEntryTc('OVERVIEW', tcOverview);
    tcEntryLeader = profEntryTc('LEADER_ZOOM', tcLeader);
    tcEntryBattle = profEntryTc('BATTLE_ZOOM', tcBattle);
    tcEntryComeback = profEntryTc('COMEBACK_ZOOM', tcComeback);
    tcEntryLeadChange = profEntryTc('LEAD_CHANGE', tcLeadChange);

    phasedByState = {};
    for (const s of ALL_STATES) {
      phasedByState[s] = {
        leadInDuration: profiles[s]?.leadInDuration ?? 0,
        leadOutDuration: profiles[s]?.leadOutDuration ?? 0,
      };
    }
  } else {
    // Legacy flat-field path.
    maxStateDuration = config?.maxStateDuration ?? MAX_STATE_DURATION;
    battleMaxDurationMs = config?.battleMaxDurationMs ?? DEFAULT_CAMERA_CONFIG.battleMaxDurationMs;
    minStateHoldMs = config?.minStateHoldMs ?? DEFAULT_CAMERA_CONFIG.minStateHoldMs;

    const rawTc = config?.cameraTransitionSeconds;
    if (rawTc && typeof rawTc === 'object') {
      tcOverview = rawTc.overview ?? TC_OVERVIEW;
      tcLeader = rawTc.leader ?? TC_LEADER;
      tcBattle = rawTc.battle ?? TC_BATTLE;
      tcComeback = rawTc.comeback ?? TC_COMEBACK;
    } else {
      const s = typeof rawTc === 'number' ? rawTc : TC_OVERVIEW;
      tcOverview = s;
      tcLeader = TC_LEADER;
      tcBattle = TC_BATTLE;
      tcComeback = TC_COMEBACK;
    }

    minStateHoldByState = {
      OVERVIEW: minStateHoldMs,
      LEADER_ZOOM: minStateHoldMs,
      BATTLE_ZOOM: minStateHoldMs,
      COMEBACK_ZOOM: minStateHoldMs,
      LEAD_CHANGE: minStateHoldMs,
    };
    maxStateDurationByState = {
      OVERVIEW: maxStateDuration,
      LEADER_ZOOM: maxStateDuration,
      BATTLE_ZOOM: battleMaxDurationMs,
      COMEBACK_ZOOM: maxStateDuration,
      LEAD_CHANGE: maxStateDuration,
    };

    tcLeadChange = tcLeader;
    tcEntryOverview = tcOverview;
    tcEntryLeader = tcLeader;
    tcEntryBattle = tcBattle;
    tcEntryComeback = tcComeback;
    tcEntryLeadChange = tcLeader;

    phasedByState = Object.fromEntries(
      ALL_STATES.map((s) => [s, { leadInDuration: 0, leadOutDuration: 0 }])
    );
  }

  // ── Common: lerp factors and per-state lookup maps ────────────────────────
  const tcByState = {
    OVERVIEW: tcOverview,
    LEADER_ZOOM: tcLeader,
    BATTLE_ZOOM: tcBattle,
    COMEBACK_ZOOM: tcComeback,
    LEAD_CHANGE: tcLeadChange,
    // Photo-Finish reuses BATTLE framing timing (tight group shot).
    PHOTO_FINISH: tcBattle,
  };

  const lfOverview = tcToLerpFactor(tcOverview);
  const lfLeader = tcToLerpFactor(tcLeader);
  const lfBattle = tcToLerpFactor(tcBattle);
  const lfComeback = tcToLerpFactor(tcComeback);
  const lfLeadChange = tcToLerpFactor(tcLeadChange);
  const lfByState = {
    OVERVIEW: lfOverview,
    LEADER_ZOOM: lfLeader,
    BATTLE_ZOOM: lfBattle,
    COMEBACK_ZOOM: lfComeback,
    LEAD_CHANGE: lfLeadChange,
    PHOTO_FINISH: lfBattle,
  };

  const lfEntryOverview = tcToLerpFactor(tcEntryOverview);
  const lfEntryLeader = tcToLerpFactor(tcEntryLeader);
  const lfEntryBattle = tcToLerpFactor(tcEntryBattle);
  const lfEntryComeback = tcToLerpFactor(tcEntryComeback);
  const lfEntryLeadChange = tcToLerpFactor(tcEntryLeadChange);
  // CAMERA-HYGIENE-2: the per-state scalars (tcLeader, lfBattle, lfEntryOverview, ...) are locals
  // now. They used to be returned AND stored on the director alongside these maps — forty data
  // points that had to agree with twenty. The maps are what the director reads; the scalars were
  // read only by tests, which is exactly the arrangement where a wrong map goes unnoticed.
  const lfEntryByState = {
    OVERVIEW: lfEntryOverview,
    LEADER_ZOOM: lfEntryLeader,
    BATTLE_ZOOM: lfEntryBattle,
    COMEBACK_ZOOM: lfEntryComeback,
    LEAD_CHANGE: lfEntryLeadChange,
    PHOTO_FINISH: lfEntryBattle,
  };

  const entryConvergenceZoom =
    config?.entryConvergenceZoom ?? DEFAULT_CAMERA_CONFIG.entryConvergenceZoom;
  const entryConvergencePx = config?.entryConvergencePx ?? DEFAULT_CAMERA_CONFIG.entryConvergencePx;

  // ── COMEBACK config ───────────────────────────────────────────────────────
  const comebackMinPositionsGained =
    config?.comebackMinPositionsGained ?? DEFAULT_CAMERA_CONFIG.comebackMinPositionsGained;
  const comebackWindowSec = config?.comebackWindowSec ?? DEFAULT_CAMERA_CONFIG.comebackWindowSec;
  const comebackMinDuration =
    config?.comebackMinDuration ?? DEFAULT_CAMERA_CONFIG.comebackMinDuration;
  const outcomePhaseThreshold = config?.outcomePhaseThreshold ?? 0.75;
  const comebackMinStartGap = config?.comebackMinStartGap ?? 0.4;
  const comebackMaxCurrentRankPct = config?.comebackMaxCurrentRankPct ?? 0.1;
  // Override COMEBACK_ZOOM minStateHold when explicitly configured.
  if (config?.comebackMinDuration != null) {
    minStateHoldByState['COMEBACK_ZOOM'] = comebackMinDuration * 1000;
  }

  // ── LEAD_CHANGE config ────────────────────────────────────────────────────
  const leadChangeMinGap = config?.leadChangeMinGap ?? DEFAULT_CAMERA_CONFIG.leadChangeMinGap;
  const leadChangeDebounceMs =
    config?.leadChangeDebounceMs ?? DEFAULT_CAMERA_CONFIG.leadChangeDebounceMs;
  const leadChangeMinDuration =
    config?.leadChangeMinDuration ?? DEFAULT_CAMERA_CONFIG.leadChangeMinDuration;
  // Override LEAD_CHANGE minStateHold when explicitly configured.
  if (config?.leadChangeMinDuration != null) {
    minStateHoldByState['LEAD_CHANGE'] = leadChangeMinDuration * 1000;
  }

  // ── Finish sequence config ────────────────────────────────────────────────
  const finishDramaDurationMs =
    config?.finishDramaDurationMs ?? DEFAULT_CAMERA_CONFIG.finishDramaDurationMs;
  const finishOverviewZoomOutDurationMs =
    config?.finishOverviewZoomOutDurationMs ??
    DEFAULT_CAMERA_CONFIG.finishOverviewZoomOutDurationMs;
  const finishPauseMs = config?.finishPauseMs ?? DEFAULT_CAMERA_CONFIG.finishPauseMs;
  const finishOverviewLookbackPx =
    config?.finishOverviewLookbackPx ?? DEFAULT_CAMERA_CONFIG.finishOverviewLookbackPx;
  // Photo-Finish (15a): top-2 close-finish group shot. Camera-only; slow-motion factor is read
  // in the RaceScreen render loop (not a director tunable).
  const photoFinishEnabled = config?.photoFinishEnabled ?? DEFAULT_CAMERA_CONFIG.photoFinishEnabled;
  const photoFinishCloseThresholdT =
    config?.photoFinishCloseThresholdT ?? DEFAULT_CAMERA_CONFIG.photoFinishCloseThresholdT;
  const photoFinishLeadProgress =
    config?.photoFinishLeadProgress ?? DEFAULT_CAMERA_CONFIG.photoFinishLeadProgress;

  // ── Per-state cooldowns ───────────────────────────────────────────────────
  const comebackCooldownMs = config?.comebackCooldownMs ?? DEFAULT_CAMERA_CONFIG.comebackCooldownMs;
  const leadChangeCooldownMs =
    config?.leadChangeCooldownMs ?? DEFAULT_CAMERA_CONFIG.leadChangeCooldownMs;

  // ── Weighted-random candidate weights ────────────────────────────────────
  const battleWeight = config?.battleWeight ?? DEFAULT_CAMERA_CONFIG.battleWeight;
  const leadChangeWeight = config?.leadChangeWeight ?? DEFAULT_CAMERA_CONFIG.leadChangeWeight;
  const comebackWeight = config?.comebackWeight ?? DEFAULT_CAMERA_CONFIG.comebackWeight;
  const overviewWeight = config?.overviewWeight ?? DEFAULT_CAMERA_CONFIG.overviewWeight;

  // ── OVERVIEW scheduler ────────────────────────────────────────────────────
  const overviewTargetCount =
    config?.overviewTargetCount ?? DEFAULT_CAMERA_CONFIG.overviewTargetCount;
  const overviewStartDelay = config?.overviewStartDelay ?? DEFAULT_CAMERA_CONFIG.overviewStartDelay;

  return {
    battlePulkThresholdT,
    battleMinDurationMs,
    battleIsolationThresholdT,
    battleMaxGroupSize,
    battleMaxGroupRankSpan,
    battleMinTopN,
    endgameThreshold,
    postStartHoldMs,
    ceremonyVenueMs,
    ceremonyPushMs,
    ceremonySettledMs,
    startBoardFloorMs,
    startBoardMsPerName,
    countdownDigitsMs,
    ceremonyEasing,
    battleCooldownMs,
    showDiagnostics,
    diagEnabled,
    detourEnabled,
    transitionTConvergence,
    overviewCooldownMs,
    leadAheadEnabledByState,
    leadOutEnabledByState,
    maxEntryDurationByState,
    minStateHoldMs,
    battleMaxDurationMs,
    maxStateDuration,
    minStateHoldByState,
    maxStateDurationByState,
    phasedByState,
    tcByState,
    lfByState,
    lfEntryByState,
    entryConvergenceZoom,
    entryConvergencePx,
    comebackMinPositionsGained,
    comebackWindowSec,
    comebackMinDuration,
    outcomePhaseThreshold,
    comebackMinStartGap,
    comebackMaxCurrentRankPct,
    leadChangeMinGap,
    leadChangeDebounceMs,
    leadChangeMinDuration,
    finishDramaDurationMs,
    finishOverviewZoomOutDurationMs,
    finishPauseMs,
    finishOverviewLookbackPx,
    photoFinishEnabled,
    photoFinishCloseThresholdT,
    photoFinishLeadProgress,
    comebackCooldownMs,
    leadChangeCooldownMs,
    battleWeight,
    leadChangeWeight,
    comebackWeight,
    overviewWeight,
    overviewTargetCount,
    overviewStartDelay,
  };
}

/** A ceremony beat length: finite, non-negative, and never longer than any countdown would be. */
function ceremonyMs(v, fallback) {
  if (!Number.isFinite(v) || v < 0) return fallback;
  return Math.min(v, 30000);
}
