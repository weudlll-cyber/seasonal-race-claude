// ============================================================
// File:        F1RacerType.js
// Path:        client/src/modules/racer-types/F1RacerType.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: F1 racer — SpriteRacerType configuration.
//              Sprite: 8-frame race cycle, 1024×128 sheet.
//              Speed: 1.2 — fast precision machine (effective after D9).
// ============================================================

import { SpriteRacerType } from './SpriteRacerType.js';
import { makeGenericDustTrail } from './genericDustTrail.js';
import { STANDARD_COAT_PALETTE } from './standardCoats.js';

const SPRITE_URL = '/assets/racers/f1-race.png';

export const F1RacerType = new SpriteRacerType({
  id: 'f1',
  emoji: '🏎️',

  spriteUrl: SPRITE_URL,
  frameWidth: 128,
  frameHeight: 128,
  frameCount: 8,
  basePeriodMs: 400,
  baseRotationOffset: Math.PI / 2,
  displaySize: 38,

  coats: [...STANDARD_COAT_PALETTE],
  defaultCoatId: 'base',

  primaryColor: '#cc2222',
  accentColor: '#111111',

  leaderRingColor: '#ff4444',
  leaderEllipseRx: 16,
  leaderEllipseRy: 9,

  speedMultiplier: 1.2,

  trailFactory: makeGenericDustTrail({ color: '#888888', ttl: 20 }),
});

export default F1RacerType;
