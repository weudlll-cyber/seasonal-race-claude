// ============================================================
// File:        genericDustTrail.js
// Path:        client/src/modules/racer-types/genericDustTrail.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Generic dust-particle trail factory for new racer types.
//              D3.5.4 will replace this with type-specific trails.
// ============================================================

/**
 * makeGenericDustTrail — Factory for a generic dust-particle trail.
 *
 * Returns a stateless trail factory function compatible with SpriteRacerType's
 * trailFactory config slot. All particles share the configured color.
 *
 * @param {object} [options]
 * @param {string} [options.color='#aaaaaa']        - particle color (hex)
 * @param {number} [options.ttl=25]                 - particle lifetime in frames
 * @param {number} [options.spawnProbability=0.3]   - per-frame spawn chance 0-1
 * @param {number} [options.minRadius=2]
 * @param {number} [options.maxRadius=4]
 * @param {number} [options.alphaCoeff=0.5]
 * @returns {Function} trailFactory(x, y, speed, angle, frame, racer) → Particle[]
 */
export function makeGenericDustTrail({
  color = '#aaaaaa',
  ttl = 25,
  spawnProbability = 0.3,
  minRadius = 2,
  maxRadius = 4,
  alphaCoeff = 0.5,
} = {}) {
  return function genericDustTrail(x, y, _speed, _angle, _frame, _racer) {
    if (Math.random() > spawnProbability) return [];
    const r = minRadius + Math.random() * (maxRadius - minRadius);
    return [
      {
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        alpha: alphaCoeff,
        ttl,
        maxTtl: ttl,
        r,
        color,
        alphaCoeff,
      },
    ];
  };
}
