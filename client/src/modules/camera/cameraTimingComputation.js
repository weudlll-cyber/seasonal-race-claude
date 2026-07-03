// ============================================================
// File:        cameraTimingComputation.js
// Path:        client/src/modules/camera/cameraTimingComputation.js
// Project:     RaceArena
// Description: Pure function for computing CameraDirector timing
//              parameters from a config object. Extracted from
//              CameraDirector._computeTimingConfig() so the logic
//              can be unit-tested without a full class instance.
//              Does NOT import from CameraDirector.js — no circular dep.
// ============================================================

// Fallback constants — single source of truth; imported by CameraDirector.js.
const MAX_STATE_DURATION = 8000;
export const BATTLE_PULK_THRESHOLD_PX = 200;
export const BATTLE_PULK_THRESHOLD_T = 0.12;
const BATTLE_MIN_DURATION_MS = 3000;
const POST_START_HOLD_MS = 7000;
const BATTLE_COOLDOWN_MS = 8000;
const BATTLE_MAX_DURATION = 6000;
const MIN_STATE_HOLD_MS = 5000;
const FRAME_RATE = 60;
const TC_OVERVIEW = 1.5;
const TC_LEADER = 0.3;
const TC_BATTLE = 0.3;
const TC_COMEBACK = 0.3;
const OVERVIEW_COOLDOWN_MS = 15000;
const TRANSITION_T_CONVERGENCE = 0.03;
const DEFAULT_OVERVIEW_OFFSET_PX = 150;
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
  const battlePulkThresholdPx = config?.battlePulkThresholdPx ?? BATTLE_PULK_THRESHOLD_PX;
  const battlePulkThresholdT = config?.battlePulkThresholdT ?? BATTLE_PULK_THRESHOLD_T;
  const battleMinDurationMs = config?.battleMinDurationMs ?? BATTLE_MIN_DURATION_MS;
  const battleIsolationThresholdPx = config?.battleIsolationThresholdPx ?? 0;
  const battleMaxGroupSize = Math.max(3, Math.min(6, config?.battleMaxGroupSize ?? 6));
  const battleMaxGroupRankSpan = config?.battleMaxGroupRankSpan ?? 5;
  const battleMinTopN = config?.battleMinTopN ?? 10;
  const endgameThreshold = config?.endgameThreshold ?? ENDGAME_PROGRESS_THRESHOLD;
  const postStartHoldMs = config?.postStartHoldMs ?? POST_START_HOLD_MS;
  const battleCooldownMs = config?.battleCooldownMs ?? BATTLE_COOLDOWN_MS;
  const showDiagnostics = config?.showCameraDiagnostics ?? false;
  const diagEnabled = config?.enableFrameLog ?? false;
  const transitionTConvergence = config?.transitionTConvergence ?? TRANSITION_T_CONVERGENCE;
  const overviewOffsetPx =
    config?.cameraStateProfiles?.OVERVIEW?.overviewOffsetPx ?? DEFAULT_OVERVIEW_OFFSET_PX;
  const overviewCooldownMs = config?.overviewCooldownMs ?? OVERVIEW_COOLDOWN_MS;
  // overviewClosedTrackZoom removed 2026-06-04: closed tracks now use referenceSpriteSize
  // normalization (same formula as open tracks). Field is kept in defaults.js / schema v15
  // for migration compatibility but is no longer read at runtime.
  const overviewTargetScreenPx = config?.overviewTargetScreenPx ?? 28;
  const overviewMinEffZoom = config?.overviewMinEffZoom ?? 0;

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
    battleMaxDurationMs = config?.battleMaxDurationMs ?? BATTLE_MAX_DURATION;
    minStateHoldMs = config?.minStateHoldMs ?? MIN_STATE_HOLD_MS;

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
  const lfEntryByState = {
    OVERVIEW: lfEntryOverview,
    LEADER_ZOOM: lfEntryLeader,
    BATTLE_ZOOM: lfEntryBattle,
    COMEBACK_ZOOM: lfEntryComeback,
    LEAD_CHANGE: lfEntryLeadChange,
    PHOTO_FINISH: lfEntryBattle,
  };

  const entryConvergenceZoom = config?.entryConvergenceZoom ?? 0.05;
  const entryConvergencePx = config?.entryConvergencePx ?? 10;

  // ── COMEBACK config ───────────────────────────────────────────────────────
  const comebackMinPositionsGained = config?.comebackMinPositionsGained ?? 2;
  const comebackWindowSec = config?.comebackWindowSec ?? 4;
  const comebackMinDuration = config?.comebackMinDuration ?? 3;
  const outcomePhaseThreshold = config?.outcomePhaseThreshold ?? 0.75;
  const comebackMinStartGap = config?.comebackMinStartGap ?? 0.4;
  const comebackMaxCurrentRankPct = config?.comebackMaxCurrentRankPct ?? 0.1;
  // Override COMEBACK_ZOOM minStateHold when explicitly configured.
  if (config?.comebackMinDuration != null) {
    minStateHoldByState['COMEBACK_ZOOM'] = comebackMinDuration * 1000;
  }

  // ── LEAD_CHANGE config ────────────────────────────────────────────────────
  const leadChangeMinGap = config?.leadChangeMinGap ?? 0.002;
  const leadChangeDebounceMs = config?.leadChangeDebounceMs ?? 800;
  const leadChangeMinDuration = config?.leadChangeMinDuration ?? 1.5;
  // Override LEAD_CHANGE minStateHold when explicitly configured.
  if (config?.leadChangeMinDuration != null) {
    minStateHoldByState['LEAD_CHANGE'] = leadChangeMinDuration * 1000;
  }

  // ── Finish sequence config ────────────────────────────────────────────────
  const finishDramaDurationMs = config?.finishDramaDurationMs ?? 1500;
  const finishOverviewZoomOutDurationMs = config?.finishOverviewZoomOutDurationMs ?? 3000;
  const finishPauseMs = config?.finishPauseMs ?? 2500;
  const finishOverviewLookbackPx = config?.finishOverviewLookbackPx ?? 300;
  // Photo-Finish (15a): top-2 close-finish group shot. Camera-only; slow-motion factor is read
  // in the RaceScreen render loop (not a director tunable).
  const photoFinishEnabled = config?.photoFinishEnabled ?? true;
  const photoFinishCloseThresholdT = config?.photoFinishCloseThresholdT ?? 0.03;
  const photoFinishDurationMs = config?.photoFinishDurationMs ?? 2000;
  const photoFinishLeadProgress = config?.photoFinishLeadProgress ?? 0.97;

  // ── Per-state cooldowns ───────────────────────────────────────────────────
  const comebackCooldownMs = config?.comebackCooldownMs ?? 10000;
  const leadChangeCooldownMs = config?.leadChangeCooldownMs ?? 5000;

  // ── Weighted-random candidate weights ────────────────────────────────────
  const battleWeight = config?.battleWeight ?? 0.8;
  const leadChangeWeight = config?.leadChangeWeight ?? 0.7;
  const comebackWeight = config?.comebackWeight ?? 0.6;
  const overviewWeight = config?.overviewWeight ?? 0.3;

  // ── OVERVIEW scheduler ────────────────────────────────────────────────────
  const overviewTargetCount = config?.overviewTargetCount ?? 2;
  const overviewStartDelay = config?.overviewStartDelay ?? 15;

  return {
    battlePulkThresholdPx,
    battlePulkThresholdT,
    battleMinDurationMs,
    battleIsolationThresholdPx,
    battleMaxGroupSize,
    battleMaxGroupRankSpan,
    battleMinTopN,
    endgameThreshold,
    postStartHoldMs,
    battleCooldownMs,
    showDiagnostics,
    diagEnabled,
    transitionTConvergence,
    overviewOffsetPx,
    overviewCooldownMs,
    overviewTargetScreenPx,
    overviewMinEffZoom,
    leadAheadEnabledByState,
    leadOutEnabledByState,
    maxEntryDurationByState,
    tcOverview,
    tcLeader,
    tcBattle,
    tcComeback,
    tcLeadChange,
    tcEntryOverview,
    tcEntryLeader,
    tcEntryBattle,
    tcEntryComeback,
    tcEntryLeadChange,
    minStateHoldMs,
    battleMaxDurationMs,
    maxStateDuration,
    minStateHoldByState,
    maxStateDurationByState,
    phasedByState,
    tcByState,
    lfOverview,
    lfLeader,
    lfBattle,
    lfComeback,
    lfLeadChange,
    lfByState,
    lfEntryOverview,
    lfEntryLeader,
    lfEntryBattle,
    lfEntryComeback,
    lfEntryLeadChange,
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
    photoFinishDurationMs,
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
