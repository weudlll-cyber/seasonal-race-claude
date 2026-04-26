// ============================================================
// File:        ElephantRacerType.js
// Path:        client/src/modules/racer-types/ElephantRacerType.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Elephant racer — SpriteRacerType configuration.
//              Sprite: 8-frame walk cycle, 1024×128 sheet.
//              Speed: 0.6 — heavy but powerful (effective after D9).
// ============================================================

import { SpriteRacerType } from './SpriteRacerType.js';
import { makeGenericDustTrail } from './genericDustTrail.js';

const SPRITE_URL = '/assets/racers/elephant-walk.png';

const ELEPHANT_COATS = [
  { id: 'savanna', name: 'Savanna', tint: null },
  { id: 'charcoal', name: 'Charcoal', tint: '#556655' },
  { id: 'mud', name: 'Mud', tint: '#8b7355' },
  { id: 'ivory', name: 'Ivory', tint: '#e8e0cc' },
  { id: 'sand', name: 'Sand', tint: '#c8a87a' },
  { id: 'forest', name: 'Forest', tint: '#4a6040' },
  { id: 'dusk', name: 'Dusk', tint: '#6a5a78' },
  { id: 'clay', name: 'Clay', tint: '#9a5040' },
  { id: 'steel', name: 'Steel', tint: '#708090' },
  { id: 'rust', name: 'Rust', tint: '#8b4530' },
  { id: 'midnight', name: 'Midnight', tint: '#2a2a3a' },
];

export const ElephantRacerType = new SpriteRacerType({
  id: 'elephant',
  emoji: '🐘',

  spriteUrl: SPRITE_URL,
  frameWidth: 128,
  frameHeight: 128,
  frameCount: 8,
  basePeriodMs: 800,
  baseRotationOffset: Math.PI / 2,
  displaySize: 44,

  coats: ELEPHANT_COATS,
  defaultCoatId: 'savanna',

  primaryColor: '#a0a080',
  accentColor: '#5a5040',

  leaderRingColor: '#d4b896',
  leaderEllipseRx: 18,
  leaderEllipseRy: 12,

  speedMultiplier: 0.6,

  trailFactory: makeGenericDustTrail({ color: '#a09070', ttl: 28 }),
});

export default ElephantRacerType;
