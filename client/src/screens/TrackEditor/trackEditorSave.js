import { catmullRomSpline, offsetCurve } from '../../modules/track-editor/catmullRom.js';

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
}) {
  const minPts = closed ? 3 : 2;

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
  return {
    name,
    backgroundImage,
    closed,
    sourceMode: 'boundary',
    innerPoints,
    outerPoints,
  };
}
