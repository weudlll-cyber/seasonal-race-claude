// ============================================================
// File:        BuggyRacerType.js
// Path:        client/src/modules/racer-types/BuggyRacerType.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Buggy racer — SpriteRacerType configuration with mask-tinting.
//              Replaces legacy CarRacerType (D3.5.3). Storage migration
//              in storage.js updates 'car' → 'buggy' for stored tracks.
//              Sprite: 8-frame bounce cycle, 1024×128 sheet.
//              Mask: chassis-area mask for targeted color variation.
//              Speed: 0.95 — nimble off-roader (effective after D9).
// ============================================================

import { SpriteRacerType } from './SpriteRacerType.js';
import { makeGenericDustTrail } from './genericDustTrail.js';
import { STANDARD_COAT_PALETTE } from './standardCoats.js';

const SPRITE_URL = '/assets/racers/buggy-bounce.png';
const MASK_URL = '/assets/racers/buggy-bounce-mask.png';

export const BuggyRacerType = new SpriteRacerType({
  id: 'buggy',
  emoji: '🚙',

  spriteUrl: SPRITE_URL,
  maskUrl: MASK_URL,
  tintMode: 'mask',
  frameWidth: 128,
  frameHeight: 128,
  frameCount: 8,
  basePeriodMs: 500,
  baseRotationOffset: Math.PI / 2,
  displaySize: 38,

  coats: [...STANDARD_COAT_PALETTE],
  defaultCoatId: 'base',

  primaryColor: '#cc9944',
  accentColor: '#664422',

  leaderRingColor: '#ddaa44',
  leaderEllipseRx: 16,
  leaderEllipseRy: 9,

  speedMultiplier: 0.95,

  trailFactory: makeGenericDustTrail({ color: '#998866', ttl: 22 }),
});

export default BuggyRacerType;
