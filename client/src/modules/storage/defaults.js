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
  schemaVersion: 2,
  // Target sprite size per camera state — camera zoom is computed inversely so sprites
  // render at this percentage of canvas height regardless of track world width.
  spritePctOfCanvas: {
    overview: 0.05, // floor for OVERVIEW + autoSpriteScale floor (5% of canvas height)
    leader: 0.08, // target size during LEADER_ZOOM (8%)
    battle: 0.12, // target size during BATTLE_ZOOM (12%)
    comeback: 0.065, // target size during COMEBACK_ZOOM (6.5%)
  },
  maxTargetScreenPx: 160,
  tagVisibleMaxCount: 10,
  showCameraStateHud: true,
  showCameraDiagnostics: false,
  battleGapThreshold: 0.05,
  maxStateDuration: 4000,
  endgameThreshold: 0.85,
  // Timing tunables
  postStartHoldMs: 7000, // ms of forced LEADER after the 3s start phase (no BATTLE before 10s total)
  battleMaxDurationMs: 6000, // ms before BATTLE is force-exited regardless of gap
  battleCooldownMs: 8000, // ms after leaving BATTLE before it can re-trigger
  minStateHoldMs: 5000, // minimum ms any state is held before re-evaluation
  // Per-state lerp time constants (seconds). 90% convergence ≈ 3.45× TC at 60 fps.
  cameraTransitionSeconds: { overview: 1.5, leader: 0.3, battle: 0.3, comeback: 0.3 },
  overviewCooldownMin: 15000, // min ms after leaving OVERVIEW before it can recur
  overviewCooldownMax: 25000, // max ms — jittered each exit for TV-style variety
  // Pan target frame: target racer must land within this fraction of the canvas (each axis).
  // resolveCamera reduces zoom in 10% steps until satisfied or OVERVIEW effZoom is reached.
  targetInnerFramePct: 0.7, // 70% = target must be within central 70% of canvas
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
  // Home force — spring toward centerline (physicalY = 0)
  homeForceStrength: 0.04,
  // Comfort zone & soft boundary repulsion
  comfortThreshold: 0.7,
  softRepulsionStrength: 0.1,
  // Anisotropic avoidance distance metric (dimensionless, t×tWeight and physicalY×yWeight)
  avoidanceDistance: 0.35,
  tWeight: 2.0,
  yWeight: 1.0,
  lateralForce: 0.01,
  maxLateral: 0.95,
  // Speed brake for side-by-side (adjacent) racers
  speedBrakeYThreshold: 0.2,
  speedBrakeTThreshold: 0.015,
  speedBrakeFactor: 0.95,
  // Drafting / slipstream
  draftingMaxDistance: 110,
  draftingConeAngle: 30,
  draftingBoost: 1.1,
};
