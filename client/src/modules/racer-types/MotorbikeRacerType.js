// ============================================================
// File:        MotorbikeRacerType.js
// Path:        client/src/modules/racer-types/MotorbikeRacerType.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Motorbike racer — SpriteRacerType configuration with mask-tinting.
//              Sprite: 8-frame ride cycle, 1024×128 sheet.
//              Mask: body-area mask for targeted color variation.
//              Speed: 1.05 — agile and quick (effective after D9).
// ============================================================

import { SpriteRacerType } from './SpriteRacerType.js';
import { makeGenericDustTrail } from './genericDustTrail.js';
import { STANDARD_COAT_PALETTE } from './standardCoats.js';

const SPRITE_URL = '/assets/racers/motorbike-walk.png';
const MASK_URL = '/assets/racers/motorbike-walk-mask.png';

export const MotorbikeRacerType = new SpriteRacerType({
  id: 'motorbike',
  emoji: '🏍️',

  spriteUrl: SPRITE_URL,
  maskUrl: MASK_URL,
  tintMode: 'mask',
  frameWidth: 128,
  frameHeight: 128,
  frameCount: 8,
  basePeriodMs: 500,
  baseRotationOffset: Math.PI / 2,
  displaySize: 36,

  coats: [...STANDARD_COAT_PALETTE],
  defaultCoatId: 'base',

  primaryColor: '#888888',
  accentColor: '#222222',

  leaderRingColor: '#bb88ff',
  leaderEllipseRx: 14,
  leaderEllipseRy: 9,

  speedMultiplier: 1.05,

  trailFactory: makeGenericDustTrail({ color: '#888888', ttl: 20 }),
});

export default MotorbikeRacerType;
