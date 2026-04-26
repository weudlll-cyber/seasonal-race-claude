// ============================================================
// File:        SnailRacerType.js
// Path:        client/src/modules/racer-types/SnailRacerType.js
// Project:     RaceArena
// Description: Snail racer — SpriteRacerType configuration.
//              Migrated from class to config object in D3.5 part 2.
//              Trail factory is a 1:1 port of the old getTrailParticles.
//              Documented drift: alpha-coeff 0.45 (not 0.5), fallbackColor
//              set to accentColor (not primaryColor) — both preserved as-is.
// ============================================================

import { SpriteRacerType } from './SpriteRacerType.js';

const SPRITE_URL = '/assets/racers/snail-crawl.png';

export const SNAIL_COATS = [
  { id: 'garden', name: 'Garden Snail', tint: null },
  { id: 'roman', name: 'Roman Snail', tint: '#A89060' },
  { id: 'banded', name: 'Banded', tint: '#7A6238' },
  { id: 'glass', name: 'Glass Snail', tint: '#B5C3C9' },
  { id: 'stripe', name: 'Striped', tint: '#5D4A2D' },
  { id: 'amber', name: 'Amber', tint: '#C49A5C' },
  { id: 'leopard', name: 'Leopard Slug', tint: '#3A2E1F' },
  { id: 'rosy', name: 'Rosy Wolf', tint: '#B57870' },
  { id: 'mossy', name: 'Moss Snail', tint: '#7A8B5F' },
  { id: 'shell', name: 'Shell White', tint: '#E5DCC9' },
  { id: 'ebony', name: 'Ebony', tint: '#2A2520' },
];

function snailTrailFactory(x, y, _speed, _angle, _frame, _racer) {
  if (Math.random() > 0.35) return [];
  return [
    {
      x: x + (Math.random() - 0.5) * 4,
      y: y + (Math.random() - 0.5) * 4,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: 0.45,
      r: 4 + Math.random() * 5,
      color: '#7ddc60',
    },
  ];
}

export const SnailRacerType = new SpriteRacerType({
  id: 'snail',
  emoji: '🐌',

  spriteUrl: SPRITE_URL,
  frameWidth: 128,
  frameHeight: 128,
  frameCount: 4,
  basePeriodMs: 1500,
  baseRotationOffset: Math.PI / 2,
  displaySize: 35,

  coats: SNAIL_COATS,
  defaultCoatId: 'garden',

  primaryColor: '#E8DCC4',
  accentColor: '#3A2E1F',
  fallbackColor: '#3A2E1F', // accentColor — visually clearer than primaryColor at small size

  leaderRingColor: '#88ff44',
  leaderEllipseRx: 14,
  leaderEllipseRy: 9,

  speedMultiplier: 0.3,

  trailFactory: snailTrailFactory,
});

export default SnailRacerType;
