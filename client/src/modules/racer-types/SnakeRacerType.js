// ============================================================
// File:        SnakeRacerType.js
// Path:        client/src/modules/racer-types/SnakeRacerType.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Snake racer — SpriteRacerType configuration.
//              Sprite: 8-frame slither cycle, 1024×128 sheet.
//              Speed: 0.75 — sleek but low-friction (effective after D9).
// ============================================================

import { SpriteRacerType } from './SpriteRacerType.js';
import { makeGenericDustTrail } from './genericDustTrail.js';

const SPRITE_URL = '/assets/racers/snake-crawl.png';

const SNAKE_COATS = [
  { id: 'emerald', name: 'Emerald', tint: null },
  { id: 'scarlet', name: 'Scarlet', tint: '#cc3333' },
  { id: 'cobalt', name: 'Cobalt', tint: '#3355aa' },
  { id: 'golden', name: 'Golden', tint: '#dda833' },
  { id: 'venom', name: 'Venom', tint: '#557700' },
  { id: 'sand', name: 'Sand', tint: '#c8a870' },
  { id: 'midnight', name: 'Midnight', tint: '#1a2a2a' },
  { id: 'coral', name: 'Coral', tint: '#dd7755' },
  { id: 'mist', name: 'Mist', tint: '#8aaa99' },
  { id: 'bronze', name: 'Bronze', tint: '#8b5a20' },
  { id: 'rust', name: 'Rust', tint: '#994422' },
];

export const SnakeRacerType = new SpriteRacerType({
  id: 'snake',
  emoji: '🐍',

  spriteUrl: SPRITE_URL,
  frameWidth: 128,
  frameHeight: 128,
  frameCount: 8,
  basePeriodMs: 600,
  baseRotationOffset: Math.PI / 2,
  displaySize: 36,

  coats: SNAKE_COATS,
  defaultCoatId: 'emerald',

  primaryColor: '#667755',
  accentColor: '#334422',

  leaderRingColor: '#66dd66',
  leaderEllipseRx: 14,
  leaderEllipseRy: 9,

  speedMultiplier: 0.75,

  trailFactory: makeGenericDustTrail({ color: '#88aa66', ttl: 22 }),
});

export default SnakeRacerType;
