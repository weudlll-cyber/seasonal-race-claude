// ============================================================
// File:        index.js
// Path:        client/src/modules/track-types/index.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Track type definitions — geometry, difficulty, and season rotation
// ============================================================

export const TRACK_TYPES = {
  OVAL: {
    id:         'OVAL',
    label:      'Oval Circuit',
    laps:       3,
    difficulty: 'easy',
  },
  STREET: {
    id:         'STREET',
    label:      'Street Circuit',
    laps:       2,
    difficulty: 'medium',
  },
  MOUNTAIN: {
    id:         'MOUNTAIN',
    label:      'Mountain Pass',
    laps:       1,
    difficulty: 'hard',
  },
};

export function getTrackType(id) {
  return TRACK_TYPES[id] ?? TRACK_TYPES.OVAL;
}
