// ============================================================
// File:        defaults.js
// Path:        client/src/modules/storage/defaults.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Default data for all storage keys — seeded on first launch
// ============================================================

export const DEFAULT_RACERS = [
  { id: 'horse', name: 'Horse', emoji: '🐴', color: '#a0522d', isActive: true },
  { id: 'duck', name: 'Duck', emoji: '🦆', color: '#2196f3', isActive: true },
  { id: 'rocket', name: 'Rocket', emoji: '🚀', color: '#7c3aed', isActive: true },
  { id: 'snail', name: 'Snail', emoji: '🐌', color: '#16a34a', isActive: true },
  { id: 'buggy', name: 'Buggy', emoji: '🚙', color: '#64748b', isActive: true },
];

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
    trackWidth: 140,
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
    trackWidth: 140,
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
    trackWidth: 140,
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
    trackWidth: 140,
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
    trackWidth: 140,
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

export const DEFAULT_SPEED_SCALE_CONFIG = {
  enabled: true,
  referencePathLength: 2000,
  minScale: 0.5,
  maxScale: 4.0,
};

// ±12.9% from mean (0.001045) — tight enough to prevent lap-wrap visual gaps
// on 60s races while keeping visible drama. Old values were 0.00085/0.0012 (±17%).
export const DEFAULT_BASE_SPEED_CONFIG = {
  min: 0.00091,
  max: 0.00118,
};

export const DEFAULT_RACE_BEHAVIOR_CONFIG = {
  enabled: true,
  avoidanceDistance: 80,
  avoidanceLateralForce: 0.004,
  avoidanceMaxLateral: 0.18,
  avoidanceSpeedBrake: 0.95,
  avoidanceReturnSpeed: 0.05,
  draftingDistanceT: 0.02,
  draftingLaneThreshold: 0.15,
  draftingBoostFactor: 1.1,
};
