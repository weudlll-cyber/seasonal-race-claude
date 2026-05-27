// ============================================================
// File:        trailStyles.js
// Path:        client/src/modules/racer-types/trailStyles.js
// Project:     RaceArena
// Description: Named trail style registry for user-created racer types.
//              Maps a string style name to a trailFactory function compatible
//              with SpriteRacerType's trailFactory config slot.
//              Single source of truth for style→factory resolution.
// ============================================================

import { makeGenericDustTrail } from './genericDustTrail.js';

// No-op factory — racer leaves no trail.
function _noneTrail() {
  return [];
}

const _TRAIL_FACTORIES = {
  none: _noneTrail,
  dust: makeGenericDustTrail({
    color: '#c4a060',
    ttl: 25,
    spawnProbability: 0.4,
    minRadius: 2,
    maxRadius: 5,
  }),
  sparkle: makeGenericDustTrail({
    color: '#fffb66',
    ttl: 18,
    spawnProbability: 0.5,
    minRadius: 1,
    maxRadius: 3,
    alphaCoeff: 0.7,
  }),
  bubbles: makeGenericDustTrail({
    color: '#88ccff',
    ttl: 35,
    spawnProbability: 0.3,
    minRadius: 3,
    maxRadius: 6,
    alphaCoeff: 0.4,
  }),
  exhaust: makeGenericDustTrail({
    color: '#999999',
    ttl: 18,
    spawnProbability: 0.6,
    minRadius: 2,
    maxRadius: 4,
    alphaCoeff: 0.45,
  }),
};

export const TRAIL_STYLE_IDS = Object.keys(_TRAIL_FACTORIES);

/**
 * Returns the trailFactory function for the given style name.
 * Falls back to 'dust' for unknown names.
 */
export function getTrailFactory(styleName) {
  return _TRAIL_FACTORIES[styleName] ?? _TRAIL_FACTORIES.dust;
}

/** Returns all registered trail style IDs. */
export function listTrailStyles() {
  return TRAIL_STYLE_IDS;
}
