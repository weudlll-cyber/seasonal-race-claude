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
// CEREMONY-OPENING-2: 1400 -> 3000, in step with defaults.js. The guard that made this edit
// necessary is the reason the arrangement is safe at all — `startCeremony.test.js` failed the moment
// the shipped default moved and this mirror did not, which is exactly what it is for.
const CEREMONY_VENUE_MS = 3000;
// CEREMONY-OPENING-1's brand card. Joins the same guarded duplication as the beats below it: zero
// would have been the wrong fallback here for the same reason it was wrong for the digits — it does
// not mean "no brand", it means "a brand card of no length", and only the CALLER knows which.
const CEREMONY_BRAND_MS = 2500;
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
const DEFAULT_MAX_ENTRY_DURATION_MS = {
  OVERVIEW: 10000,
  LEADER_ZOOM: 5000,
  BATTLE_ZOOM: 5000,
  COMEBACK_ZOOM: 5000,
  LEAD_CHANGE: 5000,
  PHOTO_FINISH: 5000,
};

// All camera state names — mirrors CAM_STATE in CameraDirector.js.
//
// PHOTO-FINISH-STATE-1: THIS LIST WAS SHORT BY ONE FOR AS LONG AS PHOTO_FINISH HAS EXISTED, and
// every per-state map built from it was short by the same one. A missing key does not fail: each
// read is written `map[state] ?? fallback`, so the state quietly took another state's number, or a
// module constant, for its whole life. The `defaults.js` profile that was supposed to supply those
// numbers was never consulted, and the Dev Screen row that edits it moved nothing.
//
// IT CANNOT IMPORT `CAM_STATE`. CameraDirector.js imports this module, so the arrow only runs one
// way — see the header. What binds the two is a TEST: `cameraTimingComputation.test.js` asserts
// that every per-state map this function returns carries exactly the keys of `CAM_STATE`, which
// fails the moment a seventh state is added to the director and not to this line.
const ALL_STATES = [
  'OVERVIEW',
  'LEADER_ZOOM',
  'BATTLE_ZOOM',
  'COMEBACK_ZOOM',
  'LEAD_CHANGE',
  'PHOTO_FINISH',
];

// The per-state fallback for `trackingTC` when no profile carries one. LEAD_CHANGE takes LEADER's,
// which is the borrowing it has always done — written down here now instead of being spelled out at
// each of the four sites that did it.
const DEFAULT_TC = {
  OVERVIEW: TC_OVERVIEW,
  LEADER_ZOOM: TC_LEADER,
  BATTLE_ZOOM: TC_BATTLE,
  COMEBACK_ZOOM: TC_COMEBACK,
  LEAD_CHANGE: TC_LEADER,
  PHOTO_FINISH: TC_BATTLE,
};

// PHOTO_FINISH has borrowed BATTLE's time constant since it was added, and what it borrowed was
// BATTLE's RESOLVED value — not the module constant sitting beside it. That distinction is the
// difference between a config that retimes the battle shot retiming the photo finish with it, and
// one that silently drops it to a default, so it is kept as a BORROW rather than flattened into
// `DEFAULT_TC` above, which would have changed it. LEAD_CHANGE is deliberately NOT here: its
// fallback has always been the constant, and making the two agree would be a behaviour change
// wearing a tidy-up's clothes.
const TC_BORROWS_FROM = { PHOTO_FINISH: 'BATTLE_ZOOM' };

// The per-state fallback for `maxStateDuration`. BATTLE has always had its own, shorter cap;
// PHOTO_FINISH takes it for the same reason it takes BATTLE's time constant.
const DEFAULT_MAX_STATE_DURATION = {
  OVERVIEW: MAX_STATE_DURATION,
  LEADER_ZOOM: MAX_STATE_DURATION,
  BATTLE_ZOOM: BATTLE_MAX_DURATION,
  COMEBACK_ZOOM: MAX_STATE_DURATION,
  LEAD_CHANGE: MAX_STATE_DURATION,
  PHOTO_FINISH: BATTLE_MAX_DURATION,
};

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
  // ENDGAME-FALLBACK-1: READ the default, do not COPY it (Lesson 207). This line carried a literal
  // 0.85 that was two ships stale — 0.9 then 0.95 went past it — and survived only because every
  // shipped caller resolves its config against the defaults first, so the fallback never fired. A
  // number nobody reaches is still the number a reader finds when they open the file to learn it.
  // Every other top-level key in this function already reads the default; this was the last literal.
  const endgameThreshold = config?.endgameThreshold ?? DEFAULT_CAMERA_CONFIG.endgameThreshold;
  // START-ONE-WINDOW-1: one window, one number. Replaces `postStartHoldMs` AND the hard-coded
  // 3 s start phase that used to be added to it.
  const startWindowMs = config?.startWindowMs ?? DEFAULT_CAMERA_CONFIG.startWindowMs;
  // Clamped to a sane band so a corrupt stored config cannot produce a ceremony that never ends or
  // one with a negative beat. The easing NAME is not validated here: `ceremonyEasing` resolves an
  // unknown name to the shipped curve, so validating it twice would be a second authority on it.
  const ceremonyBrandMs = ceremonyMs(config?.ceremonyBrandMs, CEREMONY_BRAND_MS);
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
  // EVERY MAP BELOW IS BUILT FROM `ALL_STATES`, and that is the point of PHOTO-FINISH-STATE-1
  // rather than a tidying: the twenty hand-written keys that stood here were the mechanism by which
  // one state went missing from four maps at once and nobody could see it. A list can be short in
  // one place; twenty literals can be short in any of twenty.
  let minStateHoldMs, battleMaxDurationMs, maxStateDuration;
  let minStateHoldByState, maxStateDurationByState, phasedByState;
  let tcByState, tcEntryByState;

  if (profiles) {
    const profTc = (key) =>
      profiles[key]?.trackingTC ??
      (TC_BORROWS_FROM[key] ? profTc(TC_BORROWS_FROM[key]) : DEFAULT_TC[key]);
    const profMin = (key) => profiles[key]?.minStateHold ?? MIN_STATE_HOLD_MS;
    const profMax = (key) => profiles[key]?.maxStateDuration ?? DEFAULT_MAX_STATE_DURATION[key];
    const profEntryTc = (key) =>
      profiles[key]?.entryTC ??
      (TC_BORROWS_FROM[key] ? profEntryTc(TC_BORROWS_FROM[key]) : profTc(key));

    tcByState = {};
    tcEntryByState = {};
    minStateHoldByState = {};
    maxStateDurationByState = {};
    phasedByState = {};
    for (const s of ALL_STATES) {
      tcByState[s] = profTc(s);
      tcEntryByState[s] = profEntryTc(s);
      minStateHoldByState[s] = profMin(s);
      maxStateDurationByState[s] = profMax(s);
      phasedByState[s] = {
        leadInDuration: profiles[s]?.leadInDuration ?? 0,
        leadOutDuration: profiles[s]?.leadOutDuration ?? 0,
      };
    }

    // The three flat scalars the director still reads as its own last-resort fallback. They are
    // READ OUT of the maps rather than computed a second time, so they cannot disagree with them.
    minStateHoldMs = minStateHoldByState.OVERVIEW;
    battleMaxDurationMs = maxStateDurationByState.BATTLE_ZOOM;
    maxStateDuration = maxStateDurationByState.OVERVIEW;
  } else {
    // Legacy flat-field path.
    // FALLBACK-MIRRORS-1: this is the ONE site where `MAX_STATE_DURATION` was a mirror of the
    // top-level key, and it read 8000 against a shipped 4000. It reads the default now. The other
    // uses of that constant, in the profiles branch above, are NOT mirrors of this key — they are
    // the fallback for a per-state PROFILE that lacks `maxStateDuration`, which is a different
    // quantity that happens to share a name. Pointing them here would have been the wrong fix.
    maxStateDuration = config?.maxStateDuration ?? DEFAULT_CAMERA_CONFIG.maxStateDuration;
    battleMaxDurationMs = config?.battleMaxDurationMs ?? DEFAULT_CAMERA_CONFIG.battleMaxDurationMs;
    minStateHoldMs = config?.minStateHoldMs ?? DEFAULT_CAMERA_CONFIG.minStateHoldMs;

    // The legacy flat shape names FOUR states. The two that it never named take the borrowing
    // `DEFAULT_TC` already writes down — LEAD_CHANGE follows LEADER, PHOTO_FINISH follows BATTLE —
    // applied AFTER the flat values land, so a legacy config that retimes BATTLE retimes the
    // photo finish with it, exactly as it did when this was five assignments.
    const rawTc = config?.cameraTransitionSeconds;
    tcByState = { ...DEFAULT_TC };
    if (rawTc && typeof rawTc === 'object') {
      tcByState.OVERVIEW = rawTc.overview ?? TC_OVERVIEW;
      tcByState.LEADER_ZOOM = rawTc.leader ?? TC_LEADER;
      tcByState.BATTLE_ZOOM = rawTc.battle ?? TC_BATTLE;
      tcByState.COMEBACK_ZOOM = rawTc.comeback ?? TC_COMEBACK;
    } else if (typeof rawTc === 'number') {
      tcByState.OVERVIEW = rawTc;
    }
    tcByState.LEAD_CHANGE = tcByState.LEADER_ZOOM;
    tcByState.PHOTO_FINISH = tcByState.BATTLE_ZOOM;
    // The legacy path has no entry time constant of its own: entry and tracking are the same.
    tcEntryByState = { ...tcByState };

    minStateHoldByState = {};
    maxStateDurationByState = {};
    phasedByState = {};
    for (const s of ALL_STATES) {
      minStateHoldByState[s] = minStateHoldMs;
      maxStateDurationByState[s] = maxStateDuration;
      phasedByState[s] = { leadInDuration: 0, leadOutDuration: 0 };
    }
    // The two tight group shots share the shorter cap here as well.
    maxStateDurationByState.BATTLE_ZOOM = battleMaxDurationMs;
    maxStateDurationByState.PHOTO_FINISH = battleMaxDurationMs;
  }

  // ── Common: lerp factors and per-state lookup maps ────────────────────────
  // CAMERA-HYGIENE-2: the per-state scalars (tcLeader, lfBattle, lfEntryOverview, ...) became
  // locals, because they used to be returned AND stored on the director alongside these maps —
  // forty data points that had to agree with twenty. PHOTO-FINISH-STATE-1 removes the locals too:
  // they were the last place a per-state number was written one state at a time, and PHOTO_FINISH
  // took BATTLE's here by a hard-coded line rather than by reading its own profile.
  const lfByState = {};
  const lfEntryByState = {};
  for (const s of ALL_STATES) {
    lfByState[s] = tcToLerpFactor(tcByState[s]);
    lfEntryByState[s] = tcToLerpFactor(tcEntryByState[s]);
  }

  const entryConvergenceZoom =
    config?.entryConvergenceZoom ?? DEFAULT_CAMERA_CONFIG.entryConvergenceZoom;
  const entryConvergencePx = config?.entryConvergencePx ?? DEFAULT_CAMERA_CONFIG.entryConvergencePx;

  // ── COMEBACK config ───────────────────────────────────────────────────────
  const comebackMinPositionsGained =
    config?.comebackMinPositionsGained ?? DEFAULT_CAMERA_CONFIG.comebackMinPositionsGained;
  const comebackWindowSec = config?.comebackWindowSec ?? DEFAULT_CAMERA_CONFIG.comebackWindowSec;
  const comebackMinDuration =
    config?.comebackMinDuration ?? DEFAULT_CAMERA_CONFIG.comebackMinDuration;
  const outcomePhaseThreshold =
    config?.outcomePhaseThreshold ?? DEFAULT_CAMERA_CONFIG.outcomePhaseThreshold;
  // FALLBACK-MIRRORS-1: READ the default, do not COPY it (Lesson 207). These two carried literals
  // 0.4 and 0.1 against shipped values of 0.25 and 0.2 — and the SAME two wrong numbers sat in
  // `CameraAdvancedSection.jsx`, so a reader cross-checking the pair found agreement and concluded
  // they were right. Two copies of one wrong number is worse than one, because it manufactures
  // corroboration.
  const comebackMinStartGap =
    config?.comebackMinStartGap ?? DEFAULT_CAMERA_CONFIG.comebackMinStartGap;
  const comebackMaxCurrentRankPct =
    config?.comebackMaxCurrentRankPct ?? DEFAULT_CAMERA_CONFIG.comebackMaxCurrentRankPct;
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
  const photoFinishContenderFraming =
    config?.photoFinishContenderFraming ?? DEFAULT_CAMERA_CONFIG.photoFinishContenderFraming;
  const runInShot = config?.runInShot ?? DEFAULT_CAMERA_CONFIG.runInShot;
  const runInSchedule = config?.runInSchedule ?? DEFAULT_CAMERA_CONFIG.runInSchedule;
  // CONTENTION-WATCH-1. Both are read HERE because this function is the whitelist: a key that is
  // not picked out by name never reaches the director, whatever defaults.js says or a stored config
  // carries. The fallback on each is the shipped default, which is what check-fallback-agreement
  // requires and what makes a stored config missing the key behave like today.
  const contentionWatch = config?.contentionWatch ?? DEFAULT_CAMERA_CONFIG.contentionWatch;
  const contentionCheckMs = config?.contentionCheckMs ?? DEFAULT_CAMERA_CONFIG.contentionCheckMs;
  const contenderZoom = config?.contenderZoom ?? DEFAULT_CAMERA_CONFIG.contenderZoom;
  // ZOOM-PACE-5: clamped to a band for the same reason every other duration here is — a corrupt
  // stored config must not be able to make the cap arrive instantly or never.
  const corridorCapArriveMs = Math.max(
    0,
    Math.min(5000, config?.corridorCapArriveMs ?? DEFAULT_CAMERA_CONFIG.corridorCapArriveMs)
  );
  // RUNIN-PACE-1: clamped to a band for the same reason every other duration here is — a corrupt
  // stored config must not be able to produce an opening that never ends or one with no length.
  const runInOpenMs = Math.max(
    0,
    Math.min(6000, config?.runInOpenMs ?? DEFAULT_CAMERA_CONFIG.runInOpenMs)
  );

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
    startWindowMs,
    ceremonyBrandMs,
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
    photoFinishContenderFraming,
    runInShot,
    runInSchedule,
    contentionWatch,
    contentionCheckMs,
    runInOpenMs,
    contenderZoom,
    corridorCapArriveMs,
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
