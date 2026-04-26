// ============================================================
// File:        DragonRacerType.js
// Path:        client/src/modules/racer-types/DragonRacerType.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Dragon racer — SpriteRacerType configuration.
//              Sprite: 16-frame ping-pong wing-beat, 2048×128 sheet, 700ms period.
//              Coats: pearl (base) + 10 tinted variants.
//              Trail: generic dust (ember-orange). Specialized in D3.5.4.
//              Speed: 1.1 — majestic and powerful (effective after D9).
// ============================================================

import { SpriteRacerType } from './SpriteRacerType.js';
import { makeGenericDustTrail } from './genericDustTrail.js';

const SPRITE_URL = '/assets/racers/dragon-fly.png';

const DRAGON_COATS = [
  { id: 'pearl', name: 'Pearl', tint: null },
  { id: 'crimson', name: 'Crimson', tint: '#cc3333' },
  { id: 'sapphire', name: 'Sapphire', tint: '#3366cc' },
  { id: 'emerald', name: 'Emerald', tint: '#33aa44' },
  { id: 'gold', name: 'Gold', tint: '#dda833' },
  { id: 'ember', name: 'Ember', tint: '#dd7733' },
  { id: 'shadow', name: 'Shadow', tint: '#553355' },
  { id: 'rose', name: 'Rose', tint: '#ee88aa' },
  { id: 'frost', name: 'Frost', tint: '#33cccc' },
  { id: 'bronze', name: 'Bronze', tint: '#8b4513' },
  { id: 'storm', name: 'Storm', tint: '#666688' },
];

export const DragonRacerType = new SpriteRacerType({
  id: 'dragon',
  emoji: '🐉',

  spriteUrl: SPRITE_URL,
  frameWidth: 128,
  frameHeight: 128,
  frameCount: 16,
  basePeriodMs: 700,
  baseRotationOffset: Math.PI / 2,
  displaySize: 50,

  coats: DRAGON_COATS,
  defaultCoatId: 'pearl',

  primaryColor: '#e0d8c8',
  accentColor: '#332218',

  leaderRingColor: '#cc6633',
  leaderEllipseRx: 22,
  leaderEllipseRy: 14,

  speedMultiplier: 1.1,

  trailFactory: makeGenericDustTrail({ color: '#cc6633', ttl: 30 }),
});

export default DragonRacerType;
