// ============================================================
// File:        shapeHelpers.js
// Path:        client/src/modules/track-shapes/shapeHelpers.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Shared geometry helpers for non-oval track shapes.
//              perpendicularLane — offsets a point perpendicular to the
//              centre-path tangent, placing each racer in their own lane.
//              buildEdgePoints  — samples inner/outer track edges.
//              Both accept an `open` flag: when true, t is clamped instead
//              of wrapped (for open-course shapes that run 0→1 one-way).
// ============================================================

const H = 0.001; // finite-difference step for tangent computation

function _wrapT(t) {
  return ((t % 1) + 1) % 1;
}

function _clampT(t) {
  return Math.max(0, Math.min(1, t));
}

/**
 * Returns {x, y, angle} for a lane position offset perpendicularly from
 * the centre path.
 * @param {Function} centerFn  t → {x, y}  (centre-path function)
 * @param {number}   t         position 0..1
 * @param {number}   laneIndex 0 = innermost lane
 * @param {number}   totalLanes
 * @param {number}   totalBandWidth  total width of all lanes combined (px)
 * @param {boolean}  open      if true, clamp t instead of wrapping (open courses)
 */
export function perpendicularLane(
  centerFn,
  t,
  laneIndex,
  totalLanes,
  totalBandWidth,
  open = false
) {
  const wrapFn = open ? _clampT : _wrapT;
  const laneW = totalBandWidth / Math.max(totalLanes, 1);
  const delta = -totalBandWidth / 2 + (laneIndex + 0.5) * laneW;

  const p1 = centerFn(wrapFn(t + H));
  const p0 = centerFn(wrapFn(t - H));
  const travelAngle = Math.atan2(p1.y - p0.y, p1.x - p0.x);

  const perpAngle = travelAngle + Math.PI / 2;
  const c = centerFn(wrapFn(t));
  return {
    x: c.x + Math.cos(perpAngle) * delta,
    y: c.y + Math.sin(perpAngle) * delta,
    angle: travelAngle,
  };
}

/**
 * Returns { outer: [{x,y}…], inner: [{x,y}…] } — points along both edges
 * of the track band, suitable for filling and border drawing.
 * @param {Function} centerFn  t → {x, y}
 * @param {number}   halfBand  half of the total band width (px)
 * @param {number}   nSamples
 * @param {boolean}  open      if true, clamp t instead of wrapping (open courses)
 */
export function buildEdgePoints(centerFn, halfBand, nSamples = 120, open = false) {
  const wrapFn = open ? _clampT : _wrapT;
  const outer = [],
    inner = [];
  for (let i = 0; i <= nSamples; i++) {
    const t = i / nSamples;
    const p1 = centerFn(wrapFn(t + H));
    const p0 = centerFn(wrapFn(t - H));
    const travel = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    const perp = travel + Math.PI / 2;
    const c = centerFn(wrapFn(t));
    outer.push({ x: c.x + Math.cos(perp) * halfBand, y: c.y + Math.sin(perp) * halfBand });
    inner.push({ x: c.x - Math.cos(perp) * halfBand, y: c.y - Math.sin(perp) * halfBand });
  }
  return { outer, inner };
}
