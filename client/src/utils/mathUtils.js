// ============================================================
// File:        mathUtils.js
// Path:        client/src/utils/mathUtils.js
// Project:     RaceArena
// Description: Shared interpolation helpers — single source of truth (see Lessons on "one source").
// ============================================================

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

// Normalize a track-progress value to the position fraction [0,1). r.t accumulates
// across laps (lap 2: t=1.x) and closed-track back rows start at NEGATIVE t, so callers
// must normalize before any same-lap distance check. Plain `t % 1` keeps JS's sign and
// breaks for t<0; this matches the canonical tPos = ((t%1)+1)%1 used for rendering.
const tFrac = (t) => ((t % 1) + 1) % 1;

// Shortest-arc t-distance on a closed loop (≥0), lap-normalized. Use instead of a raw
// `|a−b|; if(>0.5) 1−` wrap, which is only correct for inputs already in [0,1].
export function shortestArcDeltaT(a, b) {
  let dT = Math.abs(tFrac(a) - tFrac(b));
  if (dT > 0.5) dT = 1 - dT;
  return dT;
}

// Signed shortest-arc delta from a to b on the closed loop (positive = b is ahead of a
// on the track). Same lap-normalization as shortestArcDeltaT.
export function signedArcDeltaT(a, b) {
  let sd = tFrac(b) - tFrac(a);
  if (sd > 0.5) sd -= 1;
  else if (sd < -0.5) sd += 1;
  return sd;
}
