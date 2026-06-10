// ============================================================
// File:        TurtleRacerType.js
// Path:        client/src/modules/racer-types/TurtleRacerType.js
// Project:     RaceArena
// Description: Turtle racer — SpriteRacerType with dual-mask shell rendering.
//              Sprite: 16-frame swim cycle, 2048×128 sheet (128×128 per frame).
//              tintMode: 'mask' with coat.patternMask (shell plates) and
//              coat.borderMask (seams between plates) for a two-color shell.
//              Speed: 0.85 — slow and steady.
// ============================================================

import { SpriteRacerType } from './SpriteRacerType.js';
import { makeGenericDustTrail } from './genericDustTrail.js';
import { TURTLE_COATS } from './turtleCoats.js';

export const TurtleRacerType = new SpriteRacerType({
  id: 'turtle',
  emoji: '🐢',

  spriteUrl: '/assets/racers/turtle-swim.png',
  frameWidth: 128,
  frameHeight: 128,
  frameCount: 16,
  basePeriodMs: 2000,
  baseRotationOffset: Math.PI / 2,
  displaySize: 48,
  bodyFillX: 0.578,
  bodyFillY: 0.734,
  tintMode: 'mask',

  coats: TURTLE_COATS,
  defaultCoatId: 'olive-green',

  primaryColor: '#6b7c3a',
  accentColor: '#4a5a2a',

  leaderRingColor: '#8b9f50',
  leaderEllipseRx: 18,
  leaderEllipseRy: 10,

  speedMultiplier: 0.85,

  trailFactory: makeGenericDustTrail({
    color: '#6a8a5a',
    ttl: 18,
    spawnProbability: 0.3,
    minRadius: 1,
    maxRadius: 2,
    alphaCoeff: 0.2,
  }),
  surfaceClasses: ['water'],
});
