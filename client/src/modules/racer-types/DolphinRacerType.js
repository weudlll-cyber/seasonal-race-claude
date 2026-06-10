// ============================================================
// File:        DolphinRacerType.js
// Path:        client/src/modules/racer-types/DolphinRacerType.js
// Project:     RaceArena
// Description: Dolphin racer — SpriteRacerType with body+mask rendering.
//              Sprite: 16-frame swim cycle, 4096×256 sheet (256×256 per frame).
//              tintMode: 'mask' — coat.tint is multiplied over the whole body
//              for a dark back, then coat.patchTint is screen-blended via
//              dolphin-mask-belly.png for a lighter ventral/sides gradient.
//              Speed: 1.15 — fast energetic swimmer.
// ============================================================

import { SpriteRacerType } from './SpriteRacerType.js';
import { makeGenericDustTrail } from './genericDustTrail.js';
import { DOLPHIN_COATS } from './dolphinCoats.js';

export const DolphinRacerType = new SpriteRacerType({
  id: 'dolphin',
  emoji: '🐬',

  spriteUrl: '/assets/racers/dolphin-swim.png',
  frameWidth: 256,
  frameHeight: 256,
  frameCount: 16,
  basePeriodMs: 1400,
  baseRotationOffset: Math.PI / 2,
  displaySize: 52,
  bodyFillX: 0.402,
  bodyFillY: 0.887,
  tintMode: 'mask',

  coats: DOLPHIN_COATS,
  defaultCoatId: 'slate-blue',

  primaryColor: '#4a6a8a',
  accentColor: '#c8d0d8',

  leaderRingColor: '#80a0c0',
  leaderEllipseRx: 22,
  leaderEllipseRy: 11,

  speedMultiplier: 1.15,

  trailFactory: makeGenericDustTrail({
    color: '#a0c8e8',
    ttl: 16,
    spawnProbability: 0.45,
    minRadius: 1,
    maxRadius: 3,
    alphaCoeff: 0.22,
  }),
  surfaceClasses: ['water'],
});
