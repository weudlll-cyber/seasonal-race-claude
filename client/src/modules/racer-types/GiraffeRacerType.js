// ============================================================
// File:        GiraffeRacerType.js
// Path:        client/src/modules/racer-types/GiraffeRacerType.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Giraffe racer — SpriteRacerType configuration.
//              Sprite: 8-frame walk cycle, 1024×128 sheet.
//              Speed: 0.9 — long-legged but ungainly (effective after D9).
// ============================================================

import { SpriteRacerType } from './SpriteRacerType.js';
import { makeGenericDustTrail } from './genericDustTrail.js';

const SPRITE_URL = '/assets/racers/giraffe-walk.png';

const GIRAFFE_COATS = [
  { id: 'golden', name: 'Golden', tint: null },
  { id: 'tawny', name: 'Tawny', tint: '#c47840' },
  { id: 'cream', name: 'Cream', tint: '#e8d8a0' },
  { id: 'copper', name: 'Copper', tint: '#9a6030' },
  { id: 'jade', name: 'Jade', tint: '#4a8858' },
  { id: 'dusk', name: 'Dusk', tint: '#7a6870' },
  { id: 'storm', name: 'Storm', tint: '#708090' },
  { id: 'rose', name: 'Rose', tint: '#bb7070' },
  { id: 'frost', name: 'Frost', tint: '#a0b8c8' },
  { id: 'bronze', name: 'Bronze', tint: '#8a6030' },
  { id: 'shadow', name: 'Shadow', tint: '#383028' },
];

export const GiraffeRacerType = new SpriteRacerType({
  id: 'giraffe',
  emoji: '🦒',

  spriteUrl: SPRITE_URL,
  frameWidth: 128,
  frameHeight: 128,
  frameCount: 8,
  basePeriodMs: 750,
  baseRotationOffset: Math.PI / 2,
  displaySize: 48,

  coats: GIRAFFE_COATS,
  defaultCoatId: 'golden',

  primaryColor: '#d4a855',
  accentColor: '#8b4513',

  leaderRingColor: '#e6c84a',
  leaderEllipseRx: 20,
  leaderEllipseRy: 12,

  speedMultiplier: 0.9,

  trailFactory: makeGenericDustTrail({ color: '#c4a060', ttl: 25 }),
});

export default GiraffeRacerType;
