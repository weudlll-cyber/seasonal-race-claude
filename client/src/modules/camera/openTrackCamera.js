// Pure math helpers for open-track camera.
// All functions are side-effect-free and accept explicit dimensions so they
// can be unit-tested without a DOM or React context.

export const OPEN_TRACK_BASE_ZOOM = 1.5;

/**
 * Combine the base zoom for open tracks with the CameraDirector action zoom.
 * @param {number} directorZoom  Value returned by CameraDirector (1.0–1.6)
 * @param {number} [baseZoom]    Base zoom constant (default OPEN_TRACK_BASE_ZOOM)
 * @returns {number}
 */
export function effectiveZoom(directorZoom, baseZoom = OPEN_TRACK_BASE_ZOOM) {
  return baseZoom * (directorZoom || 1);
}

/**
 * Maximum camera pan offsets that keep the background (worldWidth × worldHeight)
 * fully covering the viewport (viewportW × viewportH) at the given effective zoom.
 *
 * Derivation: world point camX maps to screen x=0; world point camX + viewportW/effZoom
 * maps to screen x=viewportW. To keep background right edge ≥ screen right:
 *   worldWidth − camX ≥ viewportW / effZoom  →  camX ≤ worldWidth − viewportW / effZoom
 *
 * @param {number} worldWidth
 * @param {number} worldHeight
 * @param {number} viewportW
 * @param {number} viewportH
 * @param {number} effZoom
 * @returns {{ camXMax: number, camYMax: number }}
 */
export function openTrackPanBounds(worldWidth, worldHeight, viewportW, viewportH, effZoom) {
  return {
    camXMax: Math.max(0, worldWidth - viewportW / effZoom),
    camYMax: Math.max(0, worldHeight - viewportH / effZoom),
  };
}

/**
 * Pan target that centers the camera on the midpoint of racer positions,
 * clamped to [0, camXMax] × [0, camYMax].
 *
 * @param {Array<{x: number, y: number}>} racers
 * @param {number} viewportW
 * @param {number} viewportH
 * @param {number} effZoom
 * @param {number} camXMax
 * @param {number} camYMax
 * @returns {{ targetX: number, targetY: number }}
 */
export function openTrackPanTarget(racers, viewportW, viewportH, effZoom, camXMax, camYMax) {
  const midX = racers.reduce((s, r) => s + r.x, 0) / racers.length;
  const midY = racers.reduce((s, r) => s + r.y, 0) / racers.length;
  const visibleW = viewportW / effZoom;
  const visibleH = viewportH / effZoom;
  return {
    targetX: Math.max(0, Math.min(camXMax, midX - visibleW / 2)),
    targetY: Math.max(0, Math.min(camYMax, midY - visibleH / 2)),
  };
}
