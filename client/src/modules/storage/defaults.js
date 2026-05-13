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
];

export const DEFAULT_RACE_DEFAULTS = {
  duration: 60,
  winners: 3,
  maxPlayers: 20,
  countdownDuration: 3,
  autoAdvance: false,
  autoAdvanceDelay: 5,
  soundEffects: true,
  language: 'en',
};

export const DEFAULT_PLAYER_GROUPS = [];
export const DEFAULT_BRANDING = [];
export const DEFAULT_RACE_HISTORY = [];

// ±12.9% from mean (0.001045) — tight enough to prevent lap-wrap visual gaps
// on 60s races while keeping visible drama. Old values were 0.00085/0.0012 (±17%).
export const DEFAULT_BASE_SPEED_CONFIG = {
  min: 0.00091,
  max: 0.00118,
};

export const DEFAULT_ROW_LAYOUT_CONFIG = {
  rowGapMultiplier: 1.5,
  speedBonusFactor: 1.0,
  maxCapacityFactor: 0.3,
};

export const DEFAULT_CAMERA_CONFIG = {
  schemaVersion: 4,
  // Per-state camera profiles — each key matches a CAM_STATE enum value.
  // CameraDirector reads from here; legacy spritePctOfCanvas / cameraTransitionSeconds
  // are kept below for localStorage backwards-compat (v3→v4 migration reads them).
  cameraStateProfiles: {
    OVERVIEW: {
      spritePct: 0.05,
      trackingTC: 1.5,
      entryTC: 1.5,
      leadInDuration: 0, // seconds camera holds lead-in position before following racer
      leadOutDuration: 0, // seconds camera decelerates before state exit
      innerFramePct: 0.7,
      maxStateDuration: 4000,
      minStateHold: 5000,
    },
    LEADER_ZOOM: {
      spritePct: 0.09,
      trackingTC: 0.25,
      entryTC: 0.8,
      leadInDuration: 1.0,
      leadOutDuration: 1.5,
      innerFramePct: 0.7,
      maxStateDuration: 8000,
      minStateHold: 5000,
    },
    BATTLE_ZOOM: {
      spritePct: 0.14,
      trackingTC: 0.25,
      entryTC: 0.8,
      leadInDuration: 0.5,
      leadOutDuration: 1.0,
      innerFramePct: 0.7,
      maxStateDuration: 8000,
      minStateHold: 5000,
    },
    COMEBACK_ZOOM: {
      spritePct: 0.07,
      trackingTC: 0.25,
      entryTC: 0.8,
      leadInDuration: 1.0,
      leadOutDuration: 1.5,
      innerFramePct: 0.7,
      maxStateDuration: 8000,
      minStateHold: 5000,
    },
  },
  // Entry-convergence thresholds: when camera is within these values of its target after
  // a state transition, the lerpPhase switches from 'entry' (entryTC) to 'tracking' (trackingTC).
  // Used in Phase 3; Phase 1 initialises them so the schema is stable.
  entryConvergenceZoom: 0.05,
  entryConvergencePx: 10,
  maxTargetScreenPx: 160,
  tagVisibleMaxCount: 10,
  showCameraStateHud: true,
  showCameraDiagnostics: false,
  battleGapThreshold: 0.05,
  endgameThreshold: 0.85,
  // Pulk condition: BATTLE triggers when ≥3 of the top-10 racers are within this world-pixel distance.
  // Replaces the old battleGapThreshold (arc-length fraction) — pixel distance is tunable in Dev Panel.
  battlePulkThresholdPx: 200,
  // Minimum time BATTLE stays active after entry even if the pulk dissolves sooner.
  battleMinDurationMs: 3000,
  // Timing tunables (global — not per-state)
  postStartHoldMs: 7000, // ms of forced LEADER after the 3s start phase (no BATTLE before 10s total)
  battleCooldownMs: 8000, // ms after leaving BATTLE before it can re-trigger
  overviewCooldownMin: 15000, // min ms after leaving OVERVIEW before it can recur
  overviewCooldownMax: 25000, // max ms — jittered each exit for TV-style variety
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
};

export const DEFAULT_RACE_DYNAMICS_CONFIG = {
  reRollVariationPercent: 85,
  reRollTransitionDuration: 5.0,
  reRollIntervalDivisor: 15,
  reRollLastPositionPercent: 80,
};

export const DEFAULT_RACE_BEHAVIOR_CONFIG = {
  enabled: true,
  // Start layout — initial lateral spread at race start
  startSpreadRange: 0.95,
  // Open-track run-out zone: fraction of path after which the finish line sits (0 = no runout)
  runoutZone: 0.05,
  // PBD anti-collision — constraint iterations per frame (5 resolves dense 20-racer packs)
  pbdIterationsPerFrame: 5,
  // Asymmetric resolution weight for the leading racer (higher t = further along track).
  // Leader moves frontWeight fraction of correction; follower moves (1 - frontWeight).
  // 0.2 = leader yields 20%, follower yields 80% — realistic race right-of-way.
  frontWeight: 0.2,
  // Centerline attraction strength per frame (fraction of current offset pulled toward Y=0).
  // 0.02 = racer at boundary (physicalY=1) moves ~2% per frame toward center.
  centerlineForce: 0.02,
  // Minimum lateral + longitudinal clearance between hitboxes (px)
  safetyMarginPx: 4,
  // Hard limit on lateral physicalY change per frame (px). Guarantees no visible jumps.
  // 4px/frame @60fps = 240px/s — realistic horse lateral speed on dirt track.
  maxLateralStepPerFrame: 4,
  // Speed brake — kept for fallback signalling (avoidanceActive flag)
  speedBrakeFactor: 0.95,
  // Frames to ramp drafting boost factor from 0→1 (smooth, not binary)
  draftingActivationFrames: 20,
  // Drafting / slipstream
  draftingMaxDistance: 110,
  draftingConeAngle: 30,
  draftingBoost: 1.1,
};
