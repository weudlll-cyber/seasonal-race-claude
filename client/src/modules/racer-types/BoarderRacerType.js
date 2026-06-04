// ============================================================
// File:        BoarderRacerType.js
// Path:        client/src/modules/racer-types/BoarderRacerType.js
// Project:     RaceArena
// Created:     2026-06-01
// Description: Skateboarder racer — SpriteRacerType configuration.
//              Sprite: 12-frame push+carve cycle, 1536×128 sheet
//              (128×128 per frame, source: boarder.png, transparent bg).
//              Animation: ±4% torso vertical scale (push rhythm) combined
//              with ±3px horizontal carve shift, 90° phase offset.
//              tintMode:'multiply' — preserves depth shading on the figure.
//              Speed: 1.0 — human-powered skating pace.
// ============================================================

import { SpriteRacerType } from './SpriteRacerType.js';
import { makeGenericDustTrail } from './genericDustTrail.js';
import { BOARDER_COAT_PALETTE } from './boarderCoats.js';

const SPRITE_URL = '/assets/racers/boarder-sprite.png';

export const BoarderRacerType = new SpriteRacerType({
  id: 'boarder',
  emoji: '🛹',

  spriteUrl: SPRITE_URL,
  frameWidth: 128,
  frameHeight: 128,
  frameCount: 12,
  basePeriodMs: 1800,
  baseRotationOffset: Math.PI / 2,
  displaySize: 40,
  bodyFillX: 0.398,
  bodyFillY: 0.719,
  tintMode: 'multiply',

  coats: [...BOARDER_COAT_PALETTE],
  defaultCoatId: 'base',

  primaryColor: '#2a2a2a',
  accentColor: '#e8e020',

  leaderRingColor: '#e8e020',
  leaderEllipseRx: 16,
  leaderEllipseRy: 10,

  speedMultiplier: 1.0,

  trailFactory: makeGenericDustTrail({
    color: '#c0c0b0',
    ttl: 18,
    spawnProbability: 0.35,
    minRadius: 1,
    maxRadius: 2,
    alphaCoeff: 0.28,
  }),
  surfaceClasses: ['asphalt', 'cobble', 'earth'],
});

export default BoarderRacerType;
