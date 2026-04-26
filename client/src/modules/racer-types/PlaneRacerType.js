// ============================================================
// File:        PlaneRacerType.js
// Path:        client/src/modules/racer-types/PlaneRacerType.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Plane racer — SpriteRacerType configuration with mask-tinting.
//              Sprite: 8-frame flight cycle, 1024×128 sheet.
//              Mask: fuselage-area mask for targeted color variation.
//              Speed: 1.15 — soaring speed (effective after D9).
// ============================================================

import { SpriteRacerType } from './SpriteRacerType.js';
import { makeGenericDustTrail } from './genericDustTrail.js';
import { STANDARD_COAT_PALETTE } from './standardCoats.js';

const SPRITE_URL = '/assets/racers/plane-fly.png';
const MASK_URL = '/assets/racers/plane-fly-mask.png';

export const PlaneRacerType = new SpriteRacerType({
  id: 'plane',
  emoji: '✈️',

  spriteUrl: SPRITE_URL,
  maskUrl: MASK_URL,
  tintMode: 'mask',
  frameWidth: 128,
  frameHeight: 128,
  frameCount: 8,
  basePeriodMs: 600,
  baseRotationOffset: Math.PI / 2,
  displaySize: 42,

  coats: [...STANDARD_COAT_PALETTE],
  defaultCoatId: 'base',

  primaryColor: '#e0e8ef',
  accentColor: '#445566',

  leaderRingColor: '#66ccff',
  leaderEllipseRx: 18,
  leaderEllipseRy: 11,

  speedMultiplier: 1.15,

  trailFactory: makeGenericDustTrail({ color: '#ffffff', ttl: 30, alphaCoeff: 0.3 }),
});

export default PlaneRacerType;
