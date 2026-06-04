// ============================================================
// File:        RocketRacerType.js
// Path:        client/src/modules/racer-types/RocketRacerType.js
// Project:     RaceArena
// Created:     2026-04-20
// Updated:     2026-04-26 — D3.5.3: migrated from class to SpriteRacerType instance.
// Description: Rocket racer — SpriteRacerType configuration.
//              Sprite: 8-frame flight cycle, 1208×151 sheet (151×151 per frame, tight-cropped).
//              Speed: 1.25 — fastest racer type (effective after D9).
// ============================================================

import { SpriteRacerType } from './SpriteRacerType.js';
import { makeGenericDustTrail } from './genericDustTrail.js';
import { STANDARD_COAT_PALETTE } from './standardCoats.js';

const SPRITE_URL = '/assets/racers/rocket-fly.png';

export const RocketRacerType = new SpriteRacerType({
  id: 'rocket',
  emoji: '🚀',

  spriteUrl: SPRITE_URL,
  frameWidth: 151,
  frameHeight: 151,
  frameCount: 8,
  basePeriodMs: 500,
  baseRotationOffset: Math.PI / 2,
  displaySize: 47,
  bodyFillX: 0.278,
  bodyFillY: 0.801,

  coats: [...STANDARD_COAT_PALETTE],
  defaultCoatId: 'base',

  primaryColor: '#cccccc',
  accentColor: '#444444',

  leaderRingColor: '#ffaa44',
  leaderEllipseRx: 19,
  leaderEllipseRy: 12,

  speedMultiplier: 1.25,

  trailFactory: makeGenericDustTrail({
    color: '#ffaa44',
    ttl: 25,
    spawnProbability: 0.6,
    minRadius: 3,
    maxRadius: 6,
  }),
  surfaceClasses: ['air', 'water'],
});

export default RocketRacerType;
