// ============================================================
// File:        LugeRacerType.js
// Path:        client/src/modules/racer-types/LugeRacerType.js
// Project:     RaceArena
// Created:     2026-05-28
// Description: Luge racer — SpriteRacerType configuration.
//              Sprite: 12-frame squash/stretch cycle, 1536×232 sheet
//              (128×232 per frame, cropped + background flood-filled to alpha=0).
//              tintMode:'multiply' — dark figure pixels (outlines/shadows) stay
//              dark under tinting; auto-detection would wrongly pick 'screen'.
//              Speed: 1.1 — fast on ice.
// ============================================================

import { SpriteRacerType } from './SpriteRacerType.js';
import { makeGenericDustTrail } from './genericDustTrail.js';
import { STANDARD_COAT_PALETTE } from './standardCoats.js';

const SPRITE_URL = '/assets/racers/luge-slide.png';

export const LugeRacerType = new SpriteRacerType({
  id: 'luge',
  emoji: '🛷',

  spriteUrl: SPRITE_URL,
  frameWidth: 128,
  frameHeight: 232,
  frameCount: 12,
  basePeriodMs: 600,
  baseRotationOffset: Math.PI / 2,
  displaySize: 40,
  tintMode: 'multiply',

  coats: [...STANDARD_COAT_PALETTE],
  defaultCoatId: 'base',

  primaryColor: '#cc3333',
  accentColor: '#111111',

  leaderRingColor: '#88ccff',
  leaderEllipseRx: 16,
  leaderEllipseRy: 10,

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
