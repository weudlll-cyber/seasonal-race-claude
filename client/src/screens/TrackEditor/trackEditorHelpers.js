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
