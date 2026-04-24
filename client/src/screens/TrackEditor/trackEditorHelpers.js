/**
 * Returns the index of the point at canvas position (x, y) within `radius` pixels.
 * When multiple points overlap, the last one (topmost / highest index) wins.
 * Returns -1 if no point is within radius.
 */
export function findPointAtPosition(points, x, y, radius) {
  let found = -1;
  for (let i = 0; i < points.length; i++) {
    const dx = points[i].x - x;
    const dy = points[i].y - y;
    if (dx * dx + dy * dy <= radius * radius) {
      found = i;
    }
  }
  return found;
}

/**
 * Finds the polyline segment closest to (x, y) and returns the insertion index.
 *
 * Uses straight lines between consecutive input points (the polyline), not the smooth
 * Catmull-Rom curve. Deliberate simplification: the spline never strays far from its
 * control-point polyline, so the insertion position feels correct in practice.
 *
 * Returns { insertAtIndex: n } if within tolerance, or null otherwise.
 * insertAtIndex is the splice index: array.splice(insertAtIndex, 0, newPt).
 * For closed tracks, the wrap-around segment (last→first) returns insertAtIndex = n.
 */
export function findSegmentNearPoint(points, x, y, tolerance, closed = false) {
  if (points.length < 2) return null;

  const n = points.length;
  const segCount = closed ? n : n - 1;
  let bestDist = Infinity;
  let bestIndex = -1;

  for (let i = 0; i < segCount; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    const dist = distToSegment(x, y, a.x, a.y, b.x, b.y);
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }

  if (bestDist <= tolerance) {
    return { insertAtIndex: bestIndex + 1 };
  }
  return null;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  if (len2 < 1e-12) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / len2));
  return Math.hypot(px - (ax + t * abx), py - (ay + t * aby));
}
