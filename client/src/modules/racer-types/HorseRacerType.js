// ============================================================
// File:        HorseRacerType.js
// Path:        client/src/modules/racer-types/HorseRacerType.js
// Project:     RaceArena
// Description: Horse racer — SpriteRacerType configuration.
//              Migrated from class to config object in D3.5 part 2.
//              Trail factory is a 1:1 port of the old getTrailParticles.
// ============================================================

import { SpriteRacerType } from './SpriteRacerType.js';

const SPRITE_URL = '/assets/racers/horse-trot.png';

export const HORSE_COATS = [
  { id: 'cream', name: 'Cream', tint: null },
  { id: 'bay', name: 'Bay', tint: '#8B4513' },
  { id: 'chestnut', name: 'Chestnut', tint: '#A0522D' },
  { id: 'palomino', name: 'Palomino', tint: '#D4A86A' },
  { id: 'gray', name: 'Gray', tint: '#9A9A92' },
  { id: 'black', name: 'Black', tint: '#1A1A1A' },
  { id: 'dark-bay', name: 'Dark Bay', tint: '#4A2C18' },
  { id: 'buckskin', name: 'Buckskin', tint: '#C19A6B' },
  { id: 'sorrel', name: 'Sorrel', tint: '#C04020' },
  { id: 'roan', name: 'Blue Roan', tint: '#7C8893' },
  { id: 'dun', name: 'Dun', tint: '#B89968' },
];

function horseTrailFactory(x, y, _speed, angle, _frame, _racer) {
  if (Math.random() > 0.45) return [];
  return [
    {
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: Math.cos(angle + Math.PI) * 1.2 + (Math.random() - 0.5) * 1.5,
      vy: Math.sin(angle + Math.PI) * 1.2 + (Math.random() - 0.5) * 1.5,
      alpha: 0.55,
      r: 3 + Math.random() * 3,
      color: '#c4a060',
    },
  ];
}

export const HorseRacerType = new SpriteRacerType({
  id: 'horse',
  emoji: '🐴',

  spriteUrl: SPRITE_URL,
  frameWidth: 128,
  frameHeight: 128,
  frameCount: 8,
  basePeriodMs: 700,
  baseRotationOffset: Math.PI / 2,
  displaySize: 40,

  coats: HORSE_COATS,
  defaultCoatId: 'cream',

  primaryColor: '#E8DCC4',
  accentColor: '#2A1F18',
  // fallbackColor not set — defaults to primaryColor ('#E8DCC4')

  leaderRingColor: '#ffd700',
  leaderEllipseRx: 16,
  leaderEllipseRy: 10,

  speedMultiplier: 1.0,

  trailFactory: horseTrailFactory,
});

export default HorseRacerType;
