import { catmullRomSpline, offsetCurve } from '../../modules/track-editor/catmullRom.js';
import { getEffect } from '../../modules/track-effects/index.js';

function computeSplineLengthPx(points) {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

export function validateEditorState({
  mode,
  centerPoints,
  innerPoints,
  outerPoints,
  closed,
  name,
}) {
  if (!name.trim()) return { message: 'Track name is required' };
  const minPts = closed ? 3 : 2;
  if (mode === 'center') {
    if (centerPoints.length < minPts) {
      return { message: `At least ${minPts} centerline points needed to save` };
    }
  } else {
    if (innerPoints.length < minPts || outerPoints.length < minPts) {
      return { message: `Each boundary needs at least ${minPts} points` };
    }
  }
  return null;
}

const SAMPLES = 200;

/**
 * Converts current editor state into a saveable track object.
 *
 * In Center Mode, derives innerPoints and outerPoints from the centerline + width by
 * sampling the spline at 200 points and applying a perpendicular offset. The derived
 * arrays are stored as the authoritative boundary data so the race engine can use them
 * directly without knowing about the source mode.
 *
 * Throws with a descriptive message if there are not enough points to build a valid track.
 */
export function buildTrackFromEditorState({
  mode,
  centerPoints,
  centerWidth,
  innerPoints,
  outerPoints,
  closed,
  name,
  backgroundImage,
  effects,
  worldWidth = 1280,
  worldHeight = 720,
}) {
  const minPts = closed ? 3 : 2;
  const effectsArray = Array.isArray(effects) ? effects.slice(0, 3) : [];

  if (mode === 'center') {
    if (centerPoints.length < minPts) {
      throw new Error(
        `Center Mode requires at least ${minPts} center points to save, got ${centerPoints.length}`
      );
    }
    const centerCurve = catmullRomSpline(centerPoints, { closed, tension: 0.5, samples: SAMPLES });
    const derivedInner = offsetCurve(centerCurve, centerWidth / 2);
    const derivedOuter = offsetCurve(centerCurve, -(centerWidth / 2));
    return {
      name,
      backgroundImage,
      closed,
      sourceMode: 'center',
      centerPoints,
      width: centerWidth,
      innerPoints: derivedInner,
      outerPoints: derivedOuter,
      effects: effectsArray,
      worldWidth,
      worldHeight,
      pathLengthPx: computeSplineLengthPx(centerCurve),
    };
  }

  // Boundary Mode
  if (innerPoints.length < minPts) {
    throw new Error(
      `Boundary Mode requires at least ${minPts} inner points to save, got ${innerPoints.length}`
    );
  }
  if (outerPoints.length < minPts) {
    throw new Error(
      `Boundary Mode requires at least ${minPts} outer points to save, got ${outerPoints.length}`
    );
  }
  const innerCurve = catmullRomSpline(innerPoints, { closed, tension: 0.5, samples: SAMPLES });
  const outerCurve = catmullRomSpline(outerPoints, { closed, tension: 0.5, samples: SAMPLES });
  const midCurve = innerCurve.map((p, i) => ({
    x: (p.x + outerCurve[i].x) / 2,
    y: (p.y + outerCurve[i].y) / 2,
  }));
  return {
    name,
    backgroundImage,
    closed,
    sourceMode: 'boundary',
    innerPoints,
    outerPoints,
    effects: effectsArray,
    worldWidth,
    worldHeight,
    pathLengthPx: computeSplineLengthPx(midCurve),
  };
}

export function extractEffects(geometry) {
  const raw = Array.isArray(geometry.effects) ? geometry.effects : [];
  return raw.filter(({ id }) => {
    if (!getEffect(id)) {
      console.warn(`[track-effects] Unknown effect "${id}" on load — skipping.`);
      return false;
    }
    return true;
  });
}
