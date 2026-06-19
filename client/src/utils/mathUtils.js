// Shared interpolation helpers — single source of truth (see Lessons on "one source").

// Linear interpolation.
export const lerp = (a, b, t) => a + (b - a) * t;

// Cubic ease-in-out (0→1). Single source — was duplicated across race modules.
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Shortest-arc angle interpolation — prevents the wrap bug at the track seam
// (t=0 / t=1 on closed tracks) where plain lerp(-π, π, 0.5) = 0 (wrong);
// this returns ±π, the correct shorter arc.
export const lerpAngle = (a, b, t) => {
  let diff = b - a;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return a + diff * t;
};
