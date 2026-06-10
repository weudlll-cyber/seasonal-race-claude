// ============================================================
// File:        MantaRacerType.js
// Path:        client/src/modules/racer-types/MantaRacerType.js
// Project:     RaceArena
// Description: Manta ray racer — SpriteRacerType with body+mask rendering.
//              Sprite: 16-frame glide cycle, 2048×128 sheet (128×128 per frame).
//              tintMode: 'mask' — coat.tint is multiplied over the whole body
//              for a dark base, then coat.patchTint is screen-blended via
//              manta-mask-shoulders.png to create bright shoulder patches.
//              Speed: 1.1 — fast graceful glider.
// ============================================================

import { SpriteRacerType } from './SpriteRacerType.js';
import { makeGenericDustTrail } from './genericDustTrail.js';
import { MANTA_COATS } from './mantaCoats.js';

export const MantaRacerType = new SpriteRacerType({
  id: 'manta',
  emoji: '🦈',

  spriteUrl: '/assets/racers/manta-swim.png',
  frameWidth: 128,
  frameHeight: 128,
  frameCount: 16,
  basePeriodMs: 2400,
  baseRotationOffset: Math.PI / 2,
  displaySize: 56,
  bodyFillX: 0.633,
  bodyFillY: 0.805,
  tintMode: 'mask',

  coats: MANTA_COATS,
  defaultCoatId: 'midnight-blue',

  primaryColor: '#1a2a4a',
  accentColor: '#f0f0f0',

  leaderRingColor: '#6080c0',
  leaderEllipseRx: 22,
  leaderEllipseRy: 12,

  speedMultiplier: 1.1,

  trailFactory: makeGenericDustTrail({
    color: '#8ab0d8',
    ttl: 20,
    spawnProbability: 0.35,
    minRadius: 1,
    maxRadius: 3,
    alphaCoeff: 0.18,
  }),
  surfaceClasses: ['water'],
});
