// ============================================================
// File:        LugeRacerType.js
// Path:        client/src/modules/racer-types/LugeRacerType.js
// Project:     RaceArena
// Created:     2026-05-28
// Description: Luge racer — SpriteRacerType configuration.
//              Sprite: 16-frame combined breathing + wobble cycle, 2048×128 sheet
//              (128×128 per frame, tight-cropped and scaled up from 64×64 source).
//              tintMode:'multiply' — dark figure pixels (outlines/shadows) stay
//              dark under tinting; auto-detection would wrongly pick 'screen'.
//              Speed: 1.1 — fast on ice.
// ============================================================

import { SpriteRacerType } from './SpriteRacerType.js';
import { makeGenericDustTrail } from './genericDustTrail.js';
import { LUGE_COAT_PALETTE } from './lugeCoats.js';

const SPRITE_URL = '/assets/racers/luge-slide.png';

export const LugeRacerType = new SpriteRacerType({
  id: 'luge',
  emoji: '🛷',

  spriteUrl: SPRITE_URL,
  frameWidth: 128,
  frameHeight: 128,
  frameCount: 16,
  basePeriodMs: 3200,
  baseRotationOffset: Math.PI / 2,
  displaySize: 80,
  tintMode: 'multiply',

  coats: [...LUGE_COAT_PALETTE],
  defaultCoatId: 'base',

  primaryColor: '#cc3333',
  accentColor: '#111111',

  leaderRingColor: '#88ccff',
  leaderEllipseRx: 32,
  leaderEllipseRy: 20,

  speedMultiplier: 1.1,

  trailFactory: makeGenericDustTrail({
    color: '#cce8ff',
    ttl: 20,
    spawnProbability: 0.5,
    minRadius: 1,
    maxRadius: 3,
    alphaCoeff: 0.35,
  }),
  surfaceClasses: ['ice', 'snow'],
});

export default LugeRacerType;
