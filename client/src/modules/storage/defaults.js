// ============================================================
// File:        defaults.js
// Path:        client/src/modules/storage/defaults.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Default data for all storage keys — seeded on first launch
// ============================================================

export const DEFAULT_RACE_DEFAULTS = {
  duration: 60,
  winners: 3,
  maxPlayers: 20,
  maxPlayersClosed: 40,
  maxPlayersOpen: 100,
  countdownDuration: 3,
  autoAdvance: false,
  autoAdvanceDelay: 5,
  soundEffects: true,
  language: 'en',
};

export const DEFAULT_BRANDING = [];
export const DEFAULT_ACTIVE_SESSION = { activeBrandingProfileId: null };
export const DEFAULT_RACE_HISTORY = [];

// Mean stays at 0.001045 while total min→max spread is reduced to ~17.7%
// to reduce persistent pack clustering at high racer density.
export const DEFAULT_BASE_SPEED_CONFIG = {
  min: 0.00096,
  max: 0.00113,
};

export const DEFAULT_ROW_LAYOUT_CONFIG = {
  rowGapMultiplier: 1.5,
  speedBonusFactor: 1.0,
  maxCapacityFactor: 0.3,
};

export const DEFAULT_CAMERA_CONFIG = {
  schemaVersion: 16,
  // Per-state camera profiles — each key matches a CAM_STATE enum value.
  // CameraDirector reads from here; legacy spritePctOfCanvas / cameraTransitionSeconds
  // are kept below for localStorage backwards-compat (v3→v4 migration reads them).
  // spriteScale: relative zoom factor — 1.0 = sprite at natural density-scaled size.
  // Derived from v7 spritePx defaults (÷36): OVERVIEW=36/36=1.0, LEADER=65/36≈1.81,
  // BATTLE=101/36≈2.81, COMEBACK=50/36≈1.39. Racer-count-independent (L82, L83).
  cameraStateProfiles: {
    OVERVIEW: {
      spriteScale: 1.0,
      trackingTC: 1.5,
      entryTC: 1.5,
      leadInDuration: 0, // seconds camera holds lead-in position before following racer
      leadOutDuration: 0, // seconds camera decelerates before state exit
      innerFramePct: 0.7,
      maxStateDuration: 4000,
      minStateHold: 5000,
      maxEntryDurationMs: 10000, // timeout fallback: force tracking after this many ms in entry
      overviewOffsetPx: 150, // world px: camera shifts toward field so leader appears at outer edge
    },
    LEADER_ZOOM: {
      spriteScale: 1.81,
      trackingTC: 0.25,
      entryTC: 0.8,
      leadInDuration: 0.3,
      leadOutDuration: 1.5,
      innerFramePct: 0.7,
      maxStateDuration: 8000,
      minStateHold: 5000,
      maxEntryDurationMs: 5000,
      leadAheadEnabled: false, // OFF by default so user sees centered behavior first
      leadOutEnabled: false, // OFF by default — lead-out causes "camera stops, racer runs away" effect
    },
    BATTLE_ZOOM: {
      spriteScale: 2.81,
      trackingTC: 0.25,
      entryTC: 0.8,
      leadInDuration: 0.2,
      leadOutDuration: 1.0,
      innerFramePct: 0.7,
      maxStateDuration: 8000,
      minStateHold: 5000,
      maxEntryDurationMs: 5000,
      leadAheadEnabled: false,
      leadOutEnabled: false,
    },
    COMEBACK_ZOOM: {
      spriteScale: 1.39,
      trackingTC: 0.25,
      entryTC: 0.8,
      leadInDuration: 0.3,
      leadOutDuration: 1.5,
      innerFramePct: 0.7,
      maxStateDuration: 8000,
      minStateHold: 5000,
      maxEntryDurationMs: 5000,
      leadAheadEnabled: false,
      leadOutEnabled: false,
    },
    LEAD_CHANGE: {
      spriteScale: 1.81,
      trackingTC: 0.25,
      entryTC: 0.8,
      leadInDuration: 0.3,
      leadOutDuration: 1.5,
      innerFramePct: 0.7,
      maxStateDuration: 8000,
      minStateHold: 1500,
      maxEntryDurationMs: 5000,
      leadAheadEnabled: false,
      leadOutEnabled: false,
    },
  },
  // Entry-convergence thresholds: when camera is within these values of its target after
  // a state transition, the lerpPhase switches from 'entry' (entryTC) to 'tracking' (trackingTC).
  entryConvergenceZoom: 0.05,
  entryConvergencePx: 10,
  // T-space convergence threshold (in track-parameter units). The steady-state gap between
  // camT and ttt is ese/lf ≈ 0.026 at typical racer speeds; threshold must exceed this to
  // allow convergence while the leader is moving. Raised from 0.005 (never-converge) to 0.03.
  transitionTConvergence: 0.03,
  maxTargetScreenPx: 160,
  tagVisibleMaxCount: 10,
  showCameraStateHud: true,
  showCameraDiagnostics: false,
  showRpDiag: false,
  showRpWinnerList: false,
  showRpMinimapBadges: false,
  showRpStartRow: false,
  showTop10SpeedMonitor: false,
  enableFrameLog: false, // frame-by-frame ring buffer for jitter post-analysis (default OFF)
  enablePerfLog: false, // per-frame phase timing (physics/camera/render) for stutter diagnosis (default OFF)
  showBattleDiag: false,
  showComebackDiag: false, // COMEBACK diagnostics overlay: B1 racers, rank history, active comeback // BATTLE diagnostics overlay: detection status, group racers, locked racer
  showLeadChangeDiag: false, // LEAD_CHANGE diagnostics overlay: current/previous leader, pending state
  endgameThreshold: 0.9,
  // Pulk condition: BATTLE triggers when ≥3 of the top-10 racers are within this world-pixel distance.
  battlePulkThresholdPx: 200,
  // Temporal threshold: maximum |t_i − t_j| between any pair of group members (track-parameter units).
  battlePulkThresholdT: 0.12,
  // Isolation threshold: no non-group racer may be closer than this to any group member.
  // 0 = disabled (default). Suggested value: 1.5 × battlePulkThresholdPx = 300.
  battleIsolationThresholdPx: 300,
  // Maximum number of racers that can form the battle group (3–6). Greedy expansion adds
  // adjacent-rank racers until the group reaches this cap or no more qualify.
  battleMaxGroupSize: 6,
  // Minimum time BATTLE stays active after entry even if the pulk dissolves sooner.
  battleMinDurationMs: 3000,
  // BATTLE slowmo: physics (not camera) slows down during BATTLE_ZOOM.
  // battleSlowmoFactor: 1.0 = normal speed, 0.5 = half speed.
  // battleSlowmoMinDuration: minimum seconds slowmo holds after BATTLE ends.
  // battleSlowmoFadeDuration: seconds for fade-in / fade-out of the effect.
  battleSlowmoFactor: 0.5,
  battleSlowmoMinDuration: 2.0,
  battleSlowmoFadeDuration: 0.3,
  // BATTLE focus: non-group racers are desaturated and darkened during BATTLE_ZOOM.
  // Fade-in/out uses the same duration as battleSlowmoFadeDuration.
  battleFocusDarkening: 0.4, // 0 = no change, 1 = fully black
  // BATTLE group quality filters
  // Max rank-span for greedy expansion: highest minus lowest sorted index in the group.
  // Seed-triple span is already capped at 3 (k-i<=3); this cap applies to expansion only.
  // Default 5 → group can span P3–P8 when seed starts at P3.
  battleMaxGroupRankSpan: 5,
  // Top-N requirement: frontmost group member must be at rank ≤ battleMinTopN (absolute).
  // Prevents battles among the back half of the field when the whole top is spread out.
  // Default 10 → at least one member in top-10.
  battleMinTopN: 10,
  // COMEBACK camera tuning
  comebackMinPositionsGained: 2, // minimum rank-places gained within the window to trigger
  comebackWindowSec: 4, // seconds of rank history to evaluate (1–10)
  comebackMinDuration: 3, // seconds camera stays on the comeback racer (1–5)
  // Outcome-phase threshold: leader progress at which COMEBACK becomes eligible internally,
  // independently of the external isOutcomePhase flag from RaceScreen.
  outcomePhaseThreshold: 0.65,
  // COMEBACK start-rank filter: racer must have been at least this far back (as fraction of
  // field) at the start of the observation window. Prevents triggering for racers already
  // near the front. E.g. 0.40 = must have been in the bottom 60% of the field.
  comebackMinStartGap: 0.25,
  // COMEBACK current-rank filter: racer must not currently be better than this fraction of
  // the field. Prevents triggering for racers already in the lead group.
  // E.g. 0.10 = must currently be outside the top 10% (i.e. not P1–P4 in a 40-racer field).
  comebackMaxCurrentRankPct: 0.2,
  // LEAD_CHANGE camera tuning
  leadChangeMinGap: 0.002, // minimum T-space gap between P1 and P2 for a stable lead read
  leadChangeDebounceMs: 800, // ms the new leader must hold before change is confirmed
  leadChangeMinDuration: 1.5, // seconds camera stays in LEAD_CHANGE state (1–5)
  // Timing tunables (global — not per-state)
  postStartHoldMs: 7000, // ms of forced LEADER after the 3s start phase (no BATTLE before 10s total)
  battleCooldownMs: 8000, // ms after leaving BATTLE before it can re-trigger
  comebackCooldownMs: 10000, // ms after leaving COMEBACK before it can re-trigger
  leadChangeCooldownMs: 5000, // ms after leaving LEAD_CHANGE before it can re-trigger
  overviewCooldownMs: 15000, // ms after leaving OVERVIEW before it can recur
  overviewClosedTrackZoom: 1.3, // @deprecated 2026-06-04 — retired; kept in schema v15 for migration compatibility only; not read at runtime
  overviewTargetScreenPx: 28, // minimum visible narrow-body screen size (px) for OVERVIEW (and floor for all phases)
  overviewMinEffZoom: 0, // OVERVIEW zoom floor (effective zoom). 0 = off (current behavior). E.g. 0.6 = effZoom never goes below 0.6 on open tracks.
  // Director (weighted random) — candidate pool weights (0.0–1.0)
  battleWeight: 0.8,
  leadChangeWeight: 0.7,
  comebackWeight: 0.6,
  overviewWeight: 0.3,
  // OVERVIEW scheduler: race-length-aware fire timing
  overviewTargetCount: 2, // target number of OVERVIEW cuts per race
  overviewStartDelay: 15, // seconds into the race before first OVERVIEW is eligible
  // Finish sequence: drama pulse duration (was hardcoded), smooth zoom-out, and pause before leaderboard.
  finishDramaDurationMs: 1500, // ms of LEADER_ZOOM on the winner before FINISH_OVERVIEW begins
  finishOverviewZoomOutDurationMs: 3000, // ms for smooth zoom-out during FINISH_OVERVIEW
  finishPauseMs: 2500, // ms pause after last racer finishes before leaderboard
  finishOverviewLookbackPx: 300, // world-pixel distance before finish line where camera centers during FINISH_OVERVIEW
  // Countdown camera phase: zooms from start-zoom to OVERVIEW zoom during the pre-race countdown.
  countdownStartZoomSpritePx: 1, // tiny value → clamped to min zoom (whole track visible)
  countdownDurationMs: 4000, // matches the default race countdown duration
  // State overlay: narrative text shown during first seconds of OVERVIEW / BATTLE / COMEBACK.
  stateOverlayEnabled: true,
  stateOverlayDurationMs: 3500,
  // Legacy fields kept for v3→v4 migration reads. CameraDirector no longer reads these.
  spritePctOfCanvas: {
    overview: 0.05,
    leader: 0.08,
    battle: 0.12,
    comeback: 0.065,
  },
  maxStateDuration: 4000,
  battleMaxDurationMs: 6000,
  minStateHoldMs: 5000,
  cameraTransitionSeconds: { overview: 1.5, leader: 0.3, battle: 0.3, comeback: 0.3 },
  targetInnerFramePct: 0.7,
  // Dynamic zoom-out: if fewer than minRacersVisible non-finished racers are visible, the camera
  // gradually reduces targetZoom each frame until enough racers appear or leaderMinZoom is reached.
  // 0 = disabled. Range: 0–15.
  minRacersVisible: 8,
  // Hard zoom-out floor for LEADER_ZOOM and LEAD_CHANGE. Camera will not zoom out past this.
  leaderMinZoom: 0.4,
  // Zoom reduction per frame when too few racers are visible. 0.005 = ~0.5%/frame at 60 fps.
  zoomOutStepPerFrame: 0.005,
  // World-size-independent zoom-out floor for LEADER_ZOOM / LEAD_CHANGE, as a fraction of the
  // configured leader zoom. floor = max(blackScreenFloor, leaderMinZoomFraction × leaderZoom).
  // 1.0 = camera stays pinned at leader zoom (no zoom-out); 0.6 = may zoom out to 60% of leader
  // zoom; low values approach whole-world zoom on large tracks. Range: 0.1–1.0.
  leaderMinZoomFraction: 0.6,
  // Focal-position smoothing: EMA time-constant (seconds) applied to the camera's world-space
  // pan target during follow phase. Reduces velocity-oscillation artefacts (COMEBACK speedBrake
  // cycling) and per-physics-step quantisation jitter (LEADER_ZOOM). 0 = disabled.
  // dt-normalised — frame-rate independent. ~50 ms suits most cases; higher = smoother but laggier.
  focalSmoothTc: 0.05,
};

export const DEFAULT_RACE_ZONE_CONFIG = {
  enabled: false,
  position: 0.5,
  width: 0.05,
  brakeStrength: 0.85,
};

export const DEFAULT_RUBBER_BAND_CONFIG = {
  // Master on/off. DEFAULT-OFF: this "cap the lead" redesign stays off until the
  // fairness sweep (band-reach Δ ≤ 1pp, 0 Holm-unfair) licenses it default-on.
  enabled: true,
  // "Cap the lead" — brake front-breakaway racers toward a max gap from the field
  // median (raw cumulative-t). A racer is braked proportionally once its own gap to
  // the median exceeds brakeThreshold; eligibility is gap-based, not "is leader".
  //   brakeFactor = 1 - maxBrake * clamp((myGap - brakeThreshold) / gapScale, 0, 1)
  // brakeThreshold: gap (fraction of finishT) at which the cap engages. 0.03 sits
  //   above typical lead-group spread → a contested lead is NOT braked, only a lone
  //   runaway (10× the legacy over-sensitive 0.003). Sweep-calibratable.
  brakeThreshold: 0.03,
  // gapScale: proportional ramp width; full brake reached at gap ≈ brakeThreshold +
  //   gapScale (≈ 0.055). Soft onset (no discontinuity at the threshold).
  gapScale: 0.025,
  // maxBrake: max slowdown (floor 1 - maxBrake). 0.10 nets only −1% against the
  //   controller's +10% recovery authority (clamp 1.10), so it cannot eject a
  //   deep-B1 racer across a band boundary. NOTE: 0.15 is the post-sweep ceiling —
  //   do NOT expose 0.15 in the DevScreen slider yet (locked at 0.10 until the sweep).
  maxBrake: 0.1,
  // Time in ms to ease rubberBandMult toward a new target (temporal smoother only,
  // NOT a phase term) — prevents the brake snapping on/off.
  boostRampMs: 2000,
  // Hard-off: rubber-band fully off above this leader-progress fraction, giving the
  // P-controller a clean final window. Dedicated field (was cross-borrowed from
  // DEFAULT_CAMERA_CONFIG.endgameThreshold — backlog #2, now split).
  rubberBandEndgameThreshold: 0.9,
};

export const DEFAULT_RACE_DYNAMICS_CONFIG = {
  reRollVariationPercent: 75,
  reRollTransitionDuration: 3.0,
  reRollIntervalDivisor: 10,
  reRollLastPositionPercent: 95,
  trajectoryTransitionDuration: 1.0,
  // Race Plan area bonus strength: validated at 2.0 (B1=+6%, B5=-2%). Range 0.5–3.0.
  racePlanBonusStrengthMultiplier: 2.0,
  // Race Plan timing — fraction of race duration (0–1), applied in racePlanner.js.
  // bonusTransitionEnd: bonus active until this point, then fades over bonusFadeDuration ms.
  // corridorStart / corridorEnd: P-controller (OUTCOME phase) active window.
  // Constraint enforced: corridorStart <= corridorEnd.
  racePlanBonusTransitionEnd: 0.75,
  racePlanBonusFadeDuration: 1500,
  racePlanCorridorStart: 0.55,
  racePlanCorridorEnd: 1.0,
  // Minimum race duration (s) at/above which the Race Plan controller runs.
  // Below this the race falls back to raw physics (no target-rank sorting).
  // Sim-validated fair down to 30s; DevScreen-adjustable.
  racePlanMinDurationSec: 30,
  // PULK-surge mechanic (default ON — full-matrix fairness re-gate passed). It is the default PULK
  // mechanic; the cohesion PULK bias is the fallback used only when this is toggled OFF in the DevScreen.
  pulkSurgeEnabled: true, // when true (default), REPLACES the cohesion PULK bias with the surge mechanic
  pulkSurgeFraction: 0.2, // fraction of the field selected to surge (uniform, incl. the winner)
  pulkSurgeBonus: 0.1, // +speed bonus applied to surgers during PULK (0..0.12 safe envelope)
  pulkSurgeRampInMs: 1200, // ease-in duration when a surger enters PULK
  pulkSurgeRampOutMs: 1200, // ease-out duration as PULK ends
  pulkBrakeExemptStrength: 0.5, // 0=surgers fully braked, 1=fully exempt from rubber-band during PULK
};

export const DEFAULT_FRAME_TIMING_CONFIG = {
  dtSmoothingAlpha: 0.7,
  renderInterpolation: true,
};

export const DEFAULT_RACE_BEHAVIOR_CONFIG = {
  enabled: true,
  // Start layout — initial lateral spread at race start
  startSpreadRange: 0.95,
  // Open-track run-out zone: fraction of path after which the finish line sits (0 = no runout)
  runoutZone: 0.05,
  // Comfort zone & soft boundary repulsion
  comfortThreshold: 0.7,
  softRepulsionStrength: 0.1,
  // Avoidance buffer: forces engage this fraction BEFORE body-edge contact (lead time).
  // 0.20 = gate fires when centers are within 120% of the sum-of-half-sizes on both axes.
  // Tunable in Dev Screen — Soft Avoidance. Calibrate by eye before running sweeps.
  avoidanceBufferPct: 0.2,
  // tWeight / yWeight: RETIRED from browser avoidance gate (report 39 — geometric gate).
  // Kept here so sim scripts that still read avoidanceDistance/tWeight/yWeight for
  // reference runs continue to work. Do NOT use in raceBehavior.js gate logic.
  tWeight: 2.0,
  yWeight: 1.0,
  maxLateral: 0.95,
  // Drafting / slipstream
  draftingMaxDistance: 80,
  draftingConeAngle: 30,
  draftingBoost: 1.04,
  // Start-phase brake ramp: on open tracks, speedBrakeFactor is eased in over this window (ms).
  // 0 = no ramp (full braking from frame 1). Has no effect on closed tracks.
  avoidanceWarmupMs: 3000,

  /*
   * PHYSICS PARAMETERS — DO NOT CHANGE WITHOUT RUNNING A FULL SIM SWEEP
   *
   * These 8 parameters were optimized via a 4-phase simulation sweep
   * (4020-race LHS + 520-race refinement + 1500-race validation
   * across 10 default tracks and 20 racer types).
   *
   * Current values (Phase 5 winner, established 2026-06-03):
   *   lateralForce:                0.011400
   *   lateralDamping:              0.160000
   *   avoidanceDistance:           0.180000
   *   speedBrakeFactor:            0.945000
   *   speedBrakeTMultiplier:       1.500000  (restored — avoidanceActive zone, all tracks)
   *   speedBrakeYThreshold:        0.180000  (restored — avoidanceActive zone, all tracks)
   *   brakeMatchActivationTMultiplier: 0.500000  (new — brake-to-match zone, open tracks only)
   *   brakeMatchActivationYThreshold:  0.060000  (new — brake-to-match zone, open tracks only)
   *
   * Two-zone architecture (report 13): avoidanceActive (floor brake) uses the original wide
   * zone on ALL tracks; brake-to-match cap uses the narrow zone on OPEN TRACKS ONLY.
   * Report-12 isOpen guard proved that disabling avoidanceActive on closed tracks causes
   * closed-track regressions (Dirt Oval × dragon p=0.285→0.013, motorbike p=0.686→0.008).
   * To revert to pre-experiment baseline: remove brakeMatchActivation* params; set
   *   speedBrakeTMultiplier=1.5, speedBrakeYThreshold=0.18 (already restored).
   *
   * Other parameters are strongly interdependent. Changing one
   * without re-sweeping the others will likely degrade race quality.
   *
   * To find new optimal values:
   *   1. Run scripts/sim-fairness.mjs with LHS sampling (200 combos)
   *      on Dirt Oval + Space Sprint simultaneously
   *   2. Take top 5 survivors, refine with ±5%/±2.5% sweep
   *   3. Validate top 3 on all 10 default tracks with 50+ races each
   *   4. Only apply values that pass all hard cutoffs on all tracks
   *      (fairness p > 0.05, zigzag < 0.003, hardOverlap < 3%)
   *
   * Sweep scripts: scripts/sim-sweep.mjs, scripts/sim-fairness.mjs
   */
  lateralForce: 0.0114,
  // Lateral velocity damping factor (0 < d < 1): fraction of velocity retained each frame.
  lateralDamping: 0.16,
  // avoidanceDistance: RETIRED from browser gate (report 39 — geometric gate replaces it).
  // Kept for sim script backward compat. Browser now uses avoidanceBufferPct (above).
  avoidanceDistance: 0.18,
  speedBrakeFactor: 0.945,
  // speedBrakeTMultiplier — longitudinal lead-time multiplier for the body-based brake zone.
  // Lateral threshold now uses body contact width ×1.0 (same-lane filter, report 45).
  // Restored to Phase-5 calibrated values (report 13).
  speedBrakeTMultiplier: 1.5,
  // speedBrakeYThreshold: RETIRED from browser brake gate (report 45 — body-based same-lane
  // filter replaces it). Kept for sim-script backward compat and raceBehaviorConfig validation.
  speedBrakeYThreshold: 0.18,
  // brakeMatchActivationTMultiplier / brakeMatchActivationYThreshold — brake-to-match zone.
  // Separate narrow activation zone for the brake-to-match cap computation.
  // Applied ONLY on OPEN tracks (config.isOpen !== false).
  // Near-contact values (report 13): activates when within ~0.5 sprite-widths longitudinally
  // and ~6% half-track-width laterally. Breaks the open-track chain lock without affecting
  // the avoidanceActive floor-brake zone used for pack stabilization on all tracks.
  brakeMatchActivationTMultiplier: 0.5,
  brakeMatchActivationYThreshold: 0.06,
  // Brake-to-match tuning (Step 1 — overtaking rebuild).
  // speedMatchMinDifferential: fractional speed excess above which brake-to-match engages.
  //   0.005 = engage only when trailer is >0.5% faster than leader.
  // speedMatchSafetyMargin: fractional undercut below exact leader speed to prevent oscillation.
  //   0.001 = cap set to leaderSpeed × 0.999 instead of exact leader speed.
  // brakeHoldTimeoutFrames: consecutive hold frames before anti-trap escape triggers.
  // brakeHoldEscapeReleaseDurationFrames: frames of forced brake-release after timeout.
  // brakeHoldEscapeCooldownFrames: frames after escape before re-lock is allowed.
  // brakeReleaseDebounceFrames: consecutive clear frames needed to exit hold.
  speedMatchMinDifferential: 0.005,
  speedMatchSafetyMargin: 0.001,
  brakeHoldTimeoutFrames: 90,
  brakeHoldEscapeReleaseDurationFrames: 15,
  brakeHoldEscapeCooldownFrames: 60,
  brakeReleaseDebounceFrames: 3,
  // ── Hard position separation (Layer 2 of the physics redesign) ──────────────
  // A positional, force-independent anti-penetration pass that runs as the ABSOLUTE
  // LAST step of applyRacerBehavior — after every force (L1–L11) and after the
  // velocity/clamp integration. It resolves a fraction of any residual body overlap
  // each frame, acting as a BACKSTOP behind the normal avoidance/free-lane forces.
  // Opt-in for testing.
  //   hardSeparationEnabled:    master switch. Default TRUE = hard separation active as a
  //                             pure backstop (verified fair + effective across the full
  //                             track×racer matrix). Set FALSE to reproduce the pre-feature
  //                             baseline exactly (zero behavior change).
  //   hardSeparationRelaxation: fraction of the (beyond-tolerance) overlap resolved per
  //                             frame (0–1). 0.15 spreads the correction over several
  //                             frames so it reads as a smooth nudge, never a hard snap.
  //                             Strength also eases 0→full over avoidanceWarmupMs at race
  //                             start (same value + easeInOutCubic as the brake warmup,
  //                             applied here to BOTH open and closed tracks).
  //   hardSeparationTolerancePct: dead-zone. Bodies are allowed to overlap by up to this
  //                             fraction of the contact distance before separation engages,
  //                             and separation only pushes back to that tolerance boundary
  //                             (soft stop) — not to full contact. Avoids constant micro-
  //                             corrections on lightly-touching pairs. 0.10 = 10%.
  hardSeparationEnabled: true,
  hardSeparationRelaxation: 0.15,
  hardSeparationTolerancePct: 0.1,
  // ── Layer 1 (Soft Steering) — single target + spring per racer ──────────────
  // The sole lateral-force model: replaces the former L1 (home) + L2 (avoidance) +
  // L3 (free-lane) + L4 (commit-injection) + L5 (Stage-D gap). Each racer is pulled
  // toward one per-step target by a single spring. L6 (OVL-C), L7/L8, L10/L11 and the
  // hard-separation backstop are unchanged.
  //   softSteeringSymmetric:  Applies ONLY to the §4b body-overlap case. TRUE = both
  //                           members of an overlapping pair get a target during body
  //                           overlap; FALSE = only the trailer (lower t) does. The §4a
  //                           non-overlap case is ALWAYS trailer-only regardless of this
  //                           flag (the leader holds its line). (Sweep chose TRUE.)
  //   softSteeringStrength:   spring constant: delta += (target - physicalY) * strength.
  //   softSteeringClearancePct: extra gap beyond one contact width, as a fraction of the
  //                           contact width (0.0 = exactly contact distance).
  //   softSteeringHysteresisY: dead-zone around relPos≈0 within which the side choice is
  //                           held stable (prevents the pendulum limit-cycle near the
  //                           obstacle's centerline). Uses pairTieDir as the tie-break.
  softSteeringSymmetric: true,
  softSteeringStrength: 0.03,
  softSteeringClearancePct: 0.0,
  softSteeringHysteresisY: 0.04,
  // ── Look before you brake ───────────────────────────────────────────────────
  // When a racer closes on a slower racer in the same lane AND a side is genuinely
  // free (same isSideFree geometry as the overlap resolver), it commits to that free
  // side EARLY — inside the brake zone, not only at overlap — and passes at speed
  // instead of braking first and evading later. The speed brake is only dropped when a
  // lane is truly free and being taken; when both sides are blocked, braking is exactly
  // as before, so non-penetration is preserved (the hard-separation pass is still the
  // final positional backstop). Lives entirely in raceBehavior.js; browser/sim parity is
  // automatic (both import that module and provide the same geometry fields).
  //   lookBeforeBrakeEnabled: master switch. TRUE = take a free lane and pass at speed.
  //                           FALSE = pre-feature behavior (always brake in the zone).
  //   lookBeforeBrakePassStrength: spring constant for the decisive lateral commit while
  //                           passing (≫ softSteeringStrength so the racer clears the
  //                           leader sideways before longitudinal contact — the "commit"
  //                           half of the non-penetration coupling).
  //   lookBeforeBrakeReengageTMultiplier: FLOOR longitudinal re-engage margin as a multiple
  //                           of the body-contact length (dT units). The pass is allowed
  //                           only while dT exceeds the effective threshold, which is the
  //                           larger of this floor and the lag-safe dynamic margin below.
  //                           Must be < speedBrakeTMultiplier (1.5) so a pass window exists,
  //                           and ≥ ~1.0 so the brake re-engages before body contact.
  //   lookBeforeBrakeLagFrames: the physics loop applies the speed brake one frame late
  //                           (avoidanceActive/brakeMatchFactor are read the step AFTER they
  //                           are written). The dynamic re-engage margin reserves this many
  //                           frames of worst-case closing (lbTHalf + lagFrames × vClose) so
  //                           that even a one-frame-late brake still prevents contact — the
  //                           non-penetration guarantee is structural, not backstop-delegated.
  //                           2 = one lag frame + one frame of margin. Raise for more safety.
  //   lookBeforeBrakeRequireSlowerLeader: only take the pass path when the trailer is
  //                           genuinely faster than the leader (a real overtake), so racers
  //                           don't weave around same-speed traffic. Uses raw parity-safe
  //                           speeds and the lookBeforeBrakeMinDifferential threshold.
  //   lookBeforeBrakeMinDifferential: fractional speed excess above which the LBB pass path
  //                           is allowed (real-overtake bar). DEDICATED to look-before-brake
  //                           so it is DECOUPLED from brake-to-match's speedMatchMinDifferential.
  //                           Default 0.005 is byte-identical to the value the LBB gate used
  //                           when it read speedMatchMinDifferential (0.005) — zero behaviour
  //                           change. Raise (e.g. 0.02) to restrict LBB to genuinely faster
  //                           trailers without altering brake-to-match engagement.
  lookBeforeBrakeEnabled: true,
  lookBeforeBrakePassStrength: 0.5,
  lookBeforeBrakeReengageTMultiplier: 1.2,
  lookBeforeBrakeLagFrames: 2,
  lookBeforeBrakeRequireSlowerLeader: true,
  lookBeforeBrakeMinDifferential: 0.005,
};
