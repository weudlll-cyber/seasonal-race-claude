// ============================================================
// File:        SnowmobileRacerType.js
// Path:        client/src/modules/racer-types/SnowmobileRacerType.js
// Project:     RaceArena
// Description: Snowmobile racer — SpriteRacerType with multiply tinting.
//              Sprite: 16-frame ride cycle, 3072×192 sheet (192×192 per frame,
//              source: snowboard-ride.png downscaled via gen-snowmobile-sprite.mjs).
//              tintMode: 'multiply' — white areas (rider suit, chassis highlights)
//              absorb the coat color fully; outlines and shadows stay dark.
//              Speed: 1.1 — fast motorized snow vehicle.
// ============================================================

import { SpriteRacerType } from './SpriteRacerType.js';
import { makeGenericDustTrail } from './genericDustTrail.js';
import { SNOWMOBILE_COATS } from './snowmobileCoats.js';

export const SnowmobileRacerType = new SpriteRacerType({
  id: 'snowmobile',
  emoji: '🏂',

  spriteUrl: '/assets/racers/snowmobile.png',
  frameWidth: 192,
  frameHeight: 192,
  frameCount: 16,
  basePeriodMs: 1600,
  baseRotationOffset: Math.PI / 2,
  displaySize: 52,
  tintMode: 'multiply',

  coats: SNOWMOBILE_COATS,
  defaultCoatId: 'dark-red',

  primaryColor: '#cc0000',
  accentColor: '#ff6666',

  leaderRingColor: '#cc0000',
  leaderEllipseRx: 20,
  leaderEllipseRy: 12,

  speedMultiplier: 1.1,

  trailFactory: makeGenericDustTrail({
    color: '#e0e8ff',
    ttl: 20,
    spawnProbability: 0.5,
    minRadius: 1,
    maxRadius: 3,
    alphaCoeff: 0.25,
  }),
  surfaceClasses: ['snow', 'ice', 'earth'],
});

export default SnowmobileRacerType;
