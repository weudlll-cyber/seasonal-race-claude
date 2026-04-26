// ============================================================
// File:        DuckRacerType.js
// Path:        client/src/modules/racer-types/DuckRacerType.js
// Project:     RaceArena
// Description: Duck racer — SpriteRacerType configuration.
//              Migrated from class to config object in D3.5 part 2.
//              Trail factory is a 1:1 port of the old getTrailParticles.
// ============================================================

import { SpriteRacerType } from './SpriteRacerType.js';

const SPRITE_URL = '/assets/racers/duck-walk.png';

export const DUCK_COATS = [
  { id: 'yellow', name: 'Yellow', tint: null },
  { id: 'white', name: 'White', tint: '#E8E0D0' },
  { id: 'mallard', name: 'Mallard', tint: '#6B4423' },
  { id: 'gray', name: 'Gray', tint: '#7A7A80' },
  { id: 'black', name: 'Black', tint: '#1C1C1C' },
  { id: 'blue', name: 'Blue Swedish', tint: '#3A5A78' },
  { id: 'brown', name: 'Brown', tint: '#8B5A2A' },
  { id: 'teal', name: 'Teal', tint: '#2A6B50' },
  { id: 'orange', name: 'Orange', tint: '#D06010' },
  { id: 'rouen', name: 'Rouen', tint: '#4A3020' },
  { id: 'pink', name: 'Pink', tint: '#D04070' },
];

function duckTrailFactory(x, y, _speed, angle, _frame, _racer) {
  if (Math.random() > 0.4) return [];
  const perp = angle + Math.PI / 2;
  return [-1, 1].map((side) => ({
    x: x + Math.cos(perp) * side * 5,
    y: y + Math.sin(perp) * side * 5,
    vx: Math.cos(angle + Math.PI) * 1.5 + Math.cos(perp) * side * 0.8,
    vy: Math.sin(angle + Math.PI) * 1.5 + Math.sin(perp) * side * 0.8 - 1,
    alpha: 0.5,
    r: 2 + Math.random() * 2,
    color: '#7be0f8',
  }));
}

export const DuckRacerType = new SpriteRacerType({
  id: 'duck',
  emoji: '🦆',

  spriteUrl: SPRITE_URL,
  frameWidth: 128,
  frameHeight: 128,
  frameCount: 8,
  basePeriodMs: 700,
  baseRotationOffset: Math.PI / 2,
  displaySize: 36,

  coats: DUCK_COATS,
  defaultCoatId: 'yellow',

  primaryColor: '#F5D020',
  accentColor: '#E06800',
  // fallbackColor not set — defaults to primaryColor ('#F5D020')

  leaderRingColor: '#00ccff',
  leaderEllipseRx: 14,
  leaderEllipseRy: 9,

  speedMultiplier: 0.85,

  trailFactory: duckTrailFactory,
});

export default DuckRacerType;
