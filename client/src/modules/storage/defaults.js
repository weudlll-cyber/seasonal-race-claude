// ============================================================
// File:        defaults.js
// Path:        client/src/modules/storage/defaults.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Default data for all storage keys — seeded on first launch
// ============================================================

export const DEFAULT_RACERS = [
  { id: 'horse', name: 'Horse', icon: '🐴', color: '#a0522d', trackId: 'dirt-oval', enabled: true },
  { id: 'duck', name: 'Duck', icon: '🦆', color: '#2196f3', trackId: 'river-run', enabled: true },
  {
    id: 'rocket',
    name: 'Rocket',
    icon: '🚀',
    color: '#7c3aed',
    trackId: 'space-sprint',
    enabled: true,
  },
  {
    id: 'snail',
    name: 'Snail',
    icon: '🐌',
    color: '#16a34a',
    trackId: 'garden-path',
    enabled: true,
  },
  { id: 'car', name: 'Car', icon: '🚗', color: '#64748b', trackId: 'city-circuit', enabled: true },
];

export const DEFAULT_TRACKS = [
  {
    id: 'dirt-oval',
    name: 'Dirt Oval',
    icon: '🐴',
    description: 'Classic oval on packed earth — tight turns, lots of dust.',
    racerId: 'horse',
    racerTypeId: 'horse',
    shapeId: 'oval',
    environmentId: 'dirt',
    color: '#a0522d',
    defaultDuration: 60,
    defaultWinners: 3,
    difficulty: 'medium',
    curveStyle: 'oval',
    isDefault: true,
  },
  {
    id: 'river-run',
    name: 'River Run',
    icon: '🦆',
    description: 'Downstream sprint through meandering rapids and lily pads.',
    racerId: 'duck',
    racerTypeId: 'duck',
    shapeId: 's-curve',
    environmentId: 'river',
    color: '#2196f3',
    defaultDuration: 60,
    defaultWinners: 3,
    difficulty: 'easy',
    curveStyle: 's-curve',
    isDefault: false,
  },
  {
    id: 'space-sprint',
    name: 'Space Sprint',
    icon: '🚀',
    description: 'Zero-gravity dash past asteroids and nebula clouds.',
    racerId: 'rocket',
    racerTypeId: 'rocket',
    shapeId: 'spiral',
    environmentId: 'space',
    color: '#7c3aed',
    defaultDuration: 90,
    defaultWinners: 3,
    difficulty: 'hard',
    curveStyle: 'spiral',
    isDefault: false,
  },
  {
    id: 'garden-path',
    name: 'Garden Path',
    icon: '🐌',
    description: 'A leisurely (yet surprisingly competitive) crawl through the roses.',
    racerId: 'snail',
    racerTypeId: 'snail',
    shapeId: 'zigzag',
    environmentId: 'garden',
    color: '#16a34a',
    defaultDuration: 120,
    defaultWinners: 3,
    difficulty: 'easy',
    curveStyle: 'zigzag',
    isDefault: false,
  },
  {
    id: 'city-circuit',
    name: 'City Circuit',
    icon: '🚗',
    description: 'High-speed urban track with hairpin corners and tunnel sections.',
    racerId: 'car',
    racerTypeId: 'car',
    shapeId: 'rectangle',
    environmentId: 'city',
    color: '#64748b',
    defaultDuration: 60,
    defaultWinners: 3,
    difficulty: 'hard',
    curveStyle: 'rectangle',
    isDefault: false,
  },
];

export const DEFAULT_RACE_DEFAULTS = {
  duration: 60,
  winners: 3,
  countdownDuration: 3,
  autoAdvance: false,
  autoAdvanceDelay: 5,
  soundEffects: true,
  language: 'en',
};

export const DEFAULT_PLAYER_GROUPS = [];
export const DEFAULT_BRANDING = [];
export const DEFAULT_RACE_HISTORY = [];
