// Pure Catmull-Rom spline math — no DOM, no React.
// Convention: positive offset amount = left of travel direction.

function getControlPoints(points, segIndex, closed) {
  const n = points.length;
  if (closed) {
    return [
      points[(segIndex - 1 + n) % n],
      points[segIndex % n],
      points[(segIndex + 1) % n],
      points[(segIndex + 2) % n],
    ];
  }
  const P1 = points[segIndex];
  const P2 = points[segIndex + 1];
  // Phantom endpoints by reflection for natural open-curve behaviour
  const P0 = segIndex === 0 ? { x: 2 * P1.x - P2.x, y: 2 * P1.y - P2.y } : points[segIndex - 1];
  const P3 = segIndex + 2 >= n ? { x: 2 * P2.x - P1.x, y: 2 * P2.y - P1.y } : points[segIndex + 2];
  return [P0, P1, P2, P3];
}

function hermitePoint(P0, P1, P2, P3, t, tension) {
  const m1x = tension * (P2.x - P0.x);
  const m1y = tension * (P2.y - P0.y);
  const m2x = tension * (P3.x - P1.x);
  const m2y = tension * (P3.y - P1.y);
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return {
    x: h00 * P1.x + h10 * m1x + h01 * P2.x + h11 * m2x,
    y: h00 * P1.y + h10 * m1y + h01 * P2.y + h11 * m2y,
  };
}

function hermiteDerivative(P0, P1, P2, P3, t, tension) {
  const m1x = tension * (P2.x - P0.x);
  const m1y = tension * (P2.y - P0.y);
  const m2x = tension * (P3.x - P1.x);
  const m2y = tension * (P3.y - P1.y);
  const t2 = t * t;
  const dh00 = 6 * t2 - 6 * t;
  const dh10 = 3 * t2 - 4 * t + 1;
  const dh01 = -6 * t2 + 6 * t;
  const dh11 = 3 * t2 - 2 * t;
  return {
    dx: dh00 * P1.x + dh10 * m1x + dh01 * P2.x + dh11 * m2x,
    dy: dh00 * P1.y + dh10 * m1y + dh01 * P2.y + dh11 * m2y,
  };
}

// Maps global T ∈ [0,1] to { segIndex, t } where t is the local segment parameter.
function resolveSegment(T, numSegments) {
  const segFloat = T * numSegments;
  let segIndex = Math.floor(segFloat);
  if (segIndex >= numSegments) segIndex = numSegments - 1;
  const t = Math.min(1, segFloat - segIndex);
  return { segIndex, t };
}

/**
 * Sample a Catmull-Rom spline through the given control points.
 * @param {{ x: number, y: number }[]} points
 * @param {{ closed?: boolean, tension?: number, samples?: number }} opts
 * @returns {{ x: number, y: number }[]}
 */
export function catmullRomSpline(points, { closed = false, tension = 0.5, samples = 200 } = {}) {
  const n = points.length;
  const minPts = closed ? 3 : 2;
  if (n < minPts) {
    throw new Error(
      `catmullRomSpline: need ≥${minPts} points for a ${closed ? 'closed' : 'open'} curve, got ${n}`
    );
  }

  const numSegments = closed ? n : n - 1;
  const result = [];

  for (let i = 0; i < samples; i++) {
    // Closed: T ∈ [0, 1) — avoids duplicating the start point.
    // Open: T ∈ [0, 1] inclusive.
    const T = closed ? i / samples : samples <= 1 ? 0 : i / (samples - 1);
    const { segIndex, t } = resolveSegment(T, numSegments);
    const [P0, P1, P2, P3] = getControlPoints(points, segIndex, closed);
    result.push(hermitePoint(P0, P1, P2, P3, t, tension));
  }

  return result;
}

/**
 * Tangent vector at global position T ∈ [0, 1] along the spline.
 * Returns an unnormalized {dx, dy} — caller normalises for angle if needed.
 * @param {{ x: number, y: number }[]} points
 * @param {number} T
 * @param {{ closed?: boolean, tension?: number }} opts
 * @returns {{ dx: number, dy: number }}
 */
export function derivativeAt(points, T, { closed = false, tension = 0.5 } = {}) {
  const n = points.length;
  const minPts = closed ? 3 : 2;
  if (n < minPts) {
    throw new Error(
      `derivativeAt: need ≥${minPts} points for a ${closed ? 'closed' : 'open'} curve, got ${n}`
    );
  }

  const numSegments = closed ? n : n - 1;
  const clampedT = Math.max(0, Math.min(1, T));
  const { segIndex, t } = resolveSegment(clampedT, numSegments);
  const [P0, P1, P2, P3] = getControlPoints(points, segIndex, closed);
  const local = hermiteDerivative(P0, P1, P2, P3, t, tension);
  // Scale by numSegments so the derivative is with respect to global T, not local segment t.
  return { dx: local.dx * numSegments, dy: local.dy * numSegments };
}

/**
 * Offset a sampled curve perpendicularly by `amount` pixels.
 * Positive = left of travel direction, negative = right.
 * Input is a sampled point array (e.g. output of catmullRomSpline).
 * @param {{ x: number, y: number }[]} points
 * @param {number} amount
 * @returns {{ x: number, y: number }[]}
 */
export function offsetCurve(points, amount) {
  if (amount === 0) return points.map(({ x, y }) => ({ x, y }));

  const n = points.length;
  if (n < 2) return points.map(({ x, y }) => ({ x, y }));

  return points.map((pt, i) => {
    let dx, dy;
    if (i === 0) {
      dx = points[1].x - points[0].x;
      dy = points[1].y - points[0].y;
    } else if (i === n - 1) {
      dx = points[n - 1].x - points[n - 2].x;
      dy = points[n - 1].y - points[n - 2].y;
    } else {
      // Central difference gives the most accurate tangent estimate.
      dx = points[i + 1].x - points[i - 1].x;
      dy = points[i + 1].y - points[i - 1].y;
    }
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-12) return { x: pt.x, y: pt.y };
    // Left-of-travel perpendicular: rotate (dx,dy) by +90°
    const nx = -dy / len;
    const ny = dx / len;
    return { x: pt.x + nx * amount, y: pt.y + ny * amount };
  });
}
