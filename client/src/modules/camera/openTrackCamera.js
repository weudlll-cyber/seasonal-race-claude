// ============================================================
// File:        openTrackCamera.js
// Path:        client/src/modules/camera/openTrackCamera.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Pure math helpers for the open-track camera mode (D7c-Phase4).
//              All functions are side-effect-free and accept explicit dimensions
//              so they can be unit-tested without a DOM or React context.
// ============================================================

// ── Diagnostic state (module-level, only active when window.__CAMERA_DIAG__ === true) ──
// openTrackCamera.js is purely functional so the diagnostic emitter lives here
// but must be called by RaceScreen, which holds all the contextual values.
let _diagFrameCount = 0;
let _diagPrevState = null;

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

/**
 * Diagnostic emitter for the open-track pan pipeline.
 * Called by RaceScreen once per frame (when flag is active) with all computed
 * values that are only available in the render loop context.
 *
 * Schema mirrors CameraDirector's _diagSnapshot so closed/open logs are comparable:
 *   computedPan  = raw unclamped target (midpoint − half-viewport) in world coords
 *   finalPan     = clamped target from openTrackPanTarget, i.e. targetX/Y
 *   lerpedPan    = st.camX/Y after the lerp step — what is ACTUALLY applied to ctx
 *   backgroundBounds = { minX:0, maxX:camXMax, minY:0, maxY:camYMax }
 *
 * Note: computedPan/finalPan/lerpedPan are in WORLD coordinates (camera origin),
 * unlike CameraDirector's offsetX/Y which are canvas pixel offsets.
 *
 * @param {{
 *   raceElapsed: number, currentState: string, isRacing: boolean,
 *   worldWidth: number, worldHeight: number, canvasW: number, canvasH: number,
 *   effZoom: number, camXMax: number, camYMax: number,
 *   panRacers: Array<{id?: string, x: number, y: number}>,
 *   targetX: number, targetY: number, lerpedCamX: number, lerpedCamY: number
 * }} params
 */
export function emitOpenTrackDiagIfNeeded({
  raceElapsed,
  currentState,
  isRacing,
  worldWidth,
  worldHeight,
  canvasW,
  canvasH,
  effZoom,
  camXMax,
  camYMax,
  panRacers,
  targetX,
  targetY,
  lerpedCamX,
  lerpedCamY,
}) {
  if (!isRacing || typeof window === 'undefined' || !window.__CAMERA_DIAG__) return;

  _diagFrameCount++;
  const stateChanged = currentState !== _diagPrevState;
  _diagPrevState = currentState;
  if (!stateChanged && _diagFrameCount % 60 !== 0) return;

  const midX = panRacers.reduce((s, r) => s + r.x, 0) / panRacers.length;
  const midY = panRacers.reduce((s, r) => s + r.y, 0) / panRacers.length;
  const visibleW = canvasW / effZoom;
  const visibleH = canvasH / effZoom;
  // raw = unclamped target (what we'd pan to with no bounds constraint)
  const rawX = midX - visibleW / 2;
  const rawY = midY - visibleH / 2;
  const clampedX = Math.abs(targetX - rawX) > 0.01;
  const clampedY = Math.abs(targetY - rawY) > 0.01;

  const panType =
    currentState === 'LEADER_ZOOM'
      ? 'leader'
      : currentState === 'BATTLE_ZOOM'
        ? 'battle'
        : currentState === 'COMEBACK_ZOOM'
          ? 'comeback'
          : 'overview';

  // targetVisibleAfterClamp: is the pan centroid on-screen when cam is at finalPan?
  // render: screen_x = (world_x - camX) * effZoom
  const screenX = (midX - targetX) * effZoom;
  const screenY = (midY - targetY) * effZoom;

  const entry = {
    timestamp: raceElapsed,
    source: 'openTrackCamera',
    trackType: 'open',
    backgroundSize: { w: worldWidth, h: worldHeight },
    frameSize: { w: canvasW, h: canvasH },
    currentState,
    panTarget: {
      type: panType,
      racerId: panRacers[0]?.id ?? null,
      position: { x: midX, y: midY },
    },
    computedPan: { x: rawX, y: rawY },
    backgroundBounds: { minX: 0, maxX: camXMax, minY: 0, maxY: camYMax },
    finalPan: { x: targetX, y: targetY },
    lerpedPan: { x: lerpedCamX, y: lerpedCamY },
    wasClamped: clampedX || clampedY,
    clampedAxis: clampedX && clampedY ? 'both' : clampedX ? 'x' : clampedY ? 'y' : 'none',
    targetVisibleAfterClamp:
      screenX >= 0 && screenX <= canvasW && screenY >= 0 && screenY <= canvasH,
    zoom: effZoom,
  };

  if (!window.__CAMERA_DIAG_LOG__) window.__CAMERA_DIAG_LOG__ = [];
  window.__CAMERA_DIAG_LOG__.push(entry);
  try {
    localStorage.setItem('__cameraDiagLog__', JSON.stringify(window.__CAMERA_DIAG_LOG__));
  } catch {
    /* ignore localStorage quota errors */
  }
}
