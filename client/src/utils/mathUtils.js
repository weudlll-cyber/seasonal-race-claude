// Shared interpolation helpers — single source of truth (see Lessons on "one source").

// Linear interpolation.
export const lerp = (a, b, t) => a + (b - a) * t;

// Shortest-arc angle interpolation — prevents the wrap bug at the track seam
// (t=0 / t=1 on closed tracks) where plain lerp(-π, π, 0.5) = 0 (wrong);
// this returns ±π, the correct shorter arc.
export const lerpAngle = (a, b, t) => {
  let diff = b - a;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return a + diff * t;
};
