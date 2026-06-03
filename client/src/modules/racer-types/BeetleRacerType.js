// ============================================================
// File:        BeetleRacerType.js
// Path:        client/src/modules/racer-types/BeetleRacerType.js
// Project:     RaceArena
// Created:     2026-06-01
// Description: VW Beetle racer — SpriteRacerType configuration.
//              Sprite: 8-frame steering-wobble cycle, 1024×128 sheet
//              (128×128 per frame, source: "vw beetle.png" downsampled
//              and background-removed via gen-beetle-sprite.mjs).
//              tintMode:'multiply' — preserves body shading and shadow
//              depth while applying coat color.
//              Speed: 0.9 — slower than the modern buggy.
// ============================================================

import { SpriteRacerType } from './SpriteRacerType.js';
import { makeGenericDustTrail } from './genericDustTrail.js';
import { BEETLE_COAT_PALETTE } from './beetleCoats.js';

const SPRITE_URL = '/assets/racers/beetle.png';

export const BeetleRacerType = new SpriteRacerType({
  id: 'beetle',
  emoji: '🪲',

  spriteUrl: SPRITE_URL,
  frameWidth: 128,
  frameHeight: 128,
  frameCount: 8,
  basePeriodMs: 1600,
  baseRotationOffset: Math.PI / 2,
  displaySize: 38,
  tintMode: 'multiply',

  coats: [...BEETLE_COAT_PALETTE],
  defaultCoatId: 'base',

  primaryColor: '#c8a030',
  accentColor: '#333333',

  leaderRingColor: '#f0c030',
  leaderEllipseRx: 16,
  leaderEllipseRy: 9,

  speedMultiplier: 0.9,

  trailFactory: makeGenericDustTrail({
    color: '#c8b090',
    ttl: 20,
    spawnProbability: 0.4,
    minRadius: 1,
    maxRadius: 3,
    alphaCoeff: 0.3,
  }),
  surfaceClasses: ['asphalt', 'cobble', 'earth'],
});

export default BeetleRacerType;
