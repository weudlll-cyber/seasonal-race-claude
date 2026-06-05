// ============================================================
// File:        defaults.js
// Path:        client/src/modules/storage/defaults.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Default data for all storage keys — seeded on first launch
// ============================================================

export const DEFAULT_TRACKS = [
  {
    id: 'dirt-oval',
    name: 'Dirt Oval',
    icon: '🐴',
    description: 'Classic oval on packed earth — tight turns, lots of dust.',
    defaultRacerTypeId: 'horse',
    geometryId: null,
    color: '#a0522d',
    defaultDuration: 60,
    defaultWinners: 3,
    difficulty: 'medium',
    surfaceClasses: ['earth'],

    worldWidth: 1280,
    worldHeight: 720,
    isDefault: true,
  },
  {
    id: 'river-run',
    name: 'River Run',
    icon: '🦆',
    description: 'Downstream sprint through meandering rapids and lily pads.',
    defaultRacerTypeId: 'duck',
    geometryId: null,
    color: '#2196f3',
    defaultDuration: 60,
    defaultWinners: 3,
    difficulty: 'easy',
    surfaceClasses: ['water'],

    worldWidth: 1280,
    worldHeight: 720,
    isDefault: false,
  },
  {
    id: 'space-sprint',
    name: 'Space Sprint',
    icon: '🚀',
    description: 'Zero-gravity dash past asteroids and nebula clouds.',
    defaultRacerTypeId: 'rocket',
    geometryId: null,
    color: '#7c3aed',
    defaultDuration: 90,
    defaultWinners: 3,
    difficulty: 'hard',
    surfaceClasses: ['air'],

    worldWidth: 1280,
    worldHeight: 720,
    isDefault: false,
  },
  {
    id: 'garden-path',
    name: 'Garden Path',
    icon: '🐌',
    description: 'A leisurely (yet surprisingly competitive) crawl through the roses.',
    defaultRacerTypeId: 'snail',
    geometryId: null,
    color: '#16a34a',
    defaultDuration: 120,
    defaultWinners: 3,
    difficulty: 'easy',
    surfaceClasses: ['grass', 'earth'],

    worldWidth: 1280,
    worldHeight: 720,
    isDefault: false,
  },
  {
    id: 'city-circuit',
    name: 'City Circuit',
    icon: '🚙',
    description: 'High-speed urban track with hairpin corners and tunnel sections.',
    defaultRacerTypeId: 'buggy',
    geometryId: null,
    color: '#64748b',
    defaultDuration: 60,
    defaultWinners: 3,
    difficulty: 'hard',
    surfaceClasses: ['asphalt'],

    worldWidth: 1280,
    worldHeight: 720,
    isDefault: false,
  },
  {
    id: 'mountainstreet',
    name: 'Mountainstreet',
    icon: '🏞',
    description: 'A winding mountain road with sweeping corners and elevation changes.',
    defaultRacerTypeId: 'boarder',
    geometryId: null,
    color: '#e63946',
    defaultDuration: 60,
    defaultWinners: 3,
    difficulty: 'medium',
    surfaceClasses: ['asphalt'],

    worldWidth: 6144,
    worldHeight: 4096,
    isDefault: false,
  },
  {
    id: 'ice-track',
    name: 'Ice Track',
    icon: '🎿',
    description: 'A slippery closed circuit on packed ice and snow.',
    defaultRacerTypeId: 'horse',
    geometryId: null,
    color: '#e63946',
    defaultDuration: 60,
    defaultWinners: 3,
    difficulty: 'medium',
    surfaceClasses: ['ice', 'snow'],

    worldWidth: 1536,
    worldHeight: 1024,
    isDefault: false,
  },
  {
    id: 'seatrack',
    name: 'Seatrack',
    icon: '🐬',
    description: 'Open sea dash through waves and sunken ruins.',
    defaultRacerTypeId: 'dolphin',
    geometryId: null,
    color: '#0077b6',
    defaultDuration: 60,
    defaultWinners: 3,
    difficulty: 'medium',
    surfaceClasses: ['water'],

    worldWidth: 6144,
    worldHeight: 4096,
    isDefault: false,
  },
  {
    id: 'searound',
    name: 'Searound',
    icon: '🌊',
    description: 'Circular sea circuit — racers loop around a sunken atoll.',
    defaultRacerTypeId: 'manta',
    geometryId: null,
    color: '#023e8a',
    defaultDuration: 60,
    defaultWinners: 3,
    difficulty: 'medium',
    surfaceClasses: ['water'],

    worldWidth: 3072,
    worldHeight: 2048,
    isDefault: false,
  },
];

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

export const DEFAULT_PLAYER_GROUPS = [];
export const DEFAULT_BRANDING = [];
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
  schemaVersion: 15,
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
};

export const DEFAULT_RUBBER_BAND_CONFIG = {
  // Master on/off.
  enabled: true,
  // Flat speed boost applied to every non-leader when the leader's gap exceeds the threshold.
  // 0.10 = all non-leaders run 10% faster while boost is active.
  flatBoost: 0.1,
  // Time in ms to ease from 1.0 to the boost target and back.
  boostRampMs: 2000,
  // Gap between leader and 2nd place (as fraction of finishT) that activates the boost.
  gapThreshold: 0.003,
};

export const DEFAULT_RACE_DYNAMICS_CONFIG = {
  reRollVariationPercent: 58,
  reRollTransitionDuration: 5.0,
  reRollIntervalDivisor: 15,
  reRollLastPositionPercent: 80,
  trajectoryTransitionDuration: 1.5,
  // Race Plan area bonus strength: validated at 2.0 (B1=+6%, B5=-2%). Range 0.5–3.0.
  // 2.0 compensates for tighter avoidanceDistance (0.15) so B1 racers reliably reach their area.
  racePlanBonusStrengthMultiplier: 2.0,
  // Race Plan timing — fraction of race duration (0–1), applied in racePlanner.js.
  // bonusTransitionEnd: bonus active until this point, then fades over bonusFadeDuration ms.
  // corridorStart / corridorEnd: P-controller (OUTCOME phase) active window.
  // Constraint enforced: corridorStart <= corridorEnd.
  racePlanBonusTransitionEnd: 0.75,
  racePlanBonusFadeDuration: 1500,
  racePlanCorridorStart: 0.55,
  racePlanCorridorEnd: 0.95,
};

export const DEFAULT_FRAME_TIMING_CONFIG = {
  dtSmoothingAlpha: 0.7,
  renderInterpolation: true,
};

export const DEFAULT_PRIORITY_SYSTEM_CONFIG = {
  // Lookahead: number of frames the path-clear corridor is projected into the future
  lookaheadFrames: 30,
  // Cooldown in ms after overlap ends before home force re-activates
  cooldownMs: 500,
  // After this many consecutive BLOCKED frames, apply a reduced home force as an escape hatch.
  // 0 = disabled (home force stays off for the entire BLOCKED duration).
  blockedTimeoutFrames: 60,
  // Fraction of homeForceStrength applied during the escape hatch (0 = none, 1 = full).
  blockedEscapeForce: 0.3,
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
  // Anisotropic avoidance distance metric weights (t×tWeight and physicalY×yWeight)
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
  // Stuck-mode suppression: when a racer is bilaterally sandwiched (equal pressure from both
  // sides, near-zero velocity), suppress all lateral delta so the racer holds position and
  // waits for a gap rather than jittering. Resumes normal behavior the moment space opens.
  // Independent of the 8-parameter group below.
  stuckModeSuppress: true,

  /*
   * PHYSICS PARAMETERS — DO NOT CHANGE WITHOUT RUNNING A FULL SIM SWEEP
   *
   * These 8 parameters were optimized via a 4-phase simulation sweep
   * (4020-race LHS + 520-race refinement + 1500-race validation
   * across 9 default tracks + 1 user-created (Luger Hill) and 20 racer types).
   *
   * Current values (Phase 5 winner, established 2026-06-03):
   *   lateralForce:                0.011400
   *   lateralDamping:              0.160000
   *   homeForceStrength:           0.030000
   *   homeForceReductionOnOverlap: 0.300000
   *   avoidanceDistance:           0.180000
   *   speedBrakeFactor:            0.945000
   *   speedBrakeTMultiplier:       0.500000  (reduced from 1.5 — activation-zone experiment 2026-06-05)
   *   speedBrakeYThreshold:        0.060000  (reduced from 0.18 — activation-zone experiment 2026-06-05)
   *
   * speedBrakeTMultiplier and speedBrakeYThreshold control when brake-to-match activates.
   * Reduced in the Step-1 activation-zone experiment to target the "near-contact only" band
   * (~0.5 sprite-widths longitudinally, ~6% half-track-width laterally) to break the
   * chain-lock that caused front-row freeze at N=50 (report 09, 2026-06-05).
   * If the experiment confirms fairness recovery at N=50, these values become permanent.
   * To revert to pre-experiment baseline: speedBrakeTMultiplier=1.5, speedBrakeYThreshold=0.18.
   *
   * Other parameters are strongly interdependent. Changing one
   * without re-sweeping the others will likely degrade race quality.
   *
   * To find new optimal values:
   *   1. Run scripts/sim-fairness.mjs with LHS sampling (200 combos)
   *      on Dirt Oval + Space Sprint simultaneously
   *   2. Take top 5 survivors, refine with ±5%/±2.5% sweep
   *   3. Validate top 3 on all 10 tracks (9 default + Luger Hill) with 50+ races each
   *   4. Only apply values that pass all hard cutoffs on all tracks
   *      (fairness p > 0.05, zigzag < 0.003, hardOverlap < 3%)
   *
   * Sweep scripts: scripts/sim-sweep.mjs, scripts/sim-fairness.mjs
   */
  lateralForce: 0.0114,
  // Lateral velocity damping factor (0 < d < 1): fraction of velocity retained each frame.
  lateralDamping: 0.16,
  homeForceStrength: 0.03,
  // While a racer is in geometric overlap, reduce home force so free-lane can separate.
  // 1.0 = no reduction, 0.0 = home force off during overlap.
  homeForceReductionOnOverlap: 0.3,
  avoidanceDistance: 0.18,
  speedBrakeFactor: 0.945,
  speedBrakeTMultiplier: 0.5,
  speedBrakeYThreshold: 0.06,
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
};
