// ============================================================
// File:        heroChoreography.js
// Path:        client/src/modules/heroChoreography.js
// Project:     RaceArena
// Description: Pure hero position-curve helper for the choreo choreographed director (Step 1).
//              "Position" here is finishing RANK (1 = front). A hero curve is an ordered list of
//              { progress, rank } control points over leader-progress ∈ [0,1]. sampleHeroCurve
//              returns a smooth target-rank(progress) via MIN-JERK interpolation (quintic Hermite
//              with zero endpoint acceleration), so the authored target evolves without kinks.
//
//              The chaos→choreo handoff is JERK-MATCHED: anchorHeroCurve replaces the first control
//              point with the hero's ACTUAL (progress, rank, rankVelocity) captured at the choreo
//              boundary, so the sampled target is continuous in VALUE and FIRST DERIVATIVE across the
//              handoff — no target jump, and the downstream trajectory servo sees no step.
//
//              No engine state, no randomness, no side effects — every function is pure and
//              independently unit-tested. Shared by the browser engine and the headless sim via the
//              race plan (single source).
// ============================================================

/**
 * Quintic Hermite interpolation of ONE segment, matching value + first derivative at both ends with
 * ZERO endpoint acceleration (the minimum-jerk boundary). Velocities are in units of x per unit-τ
 * (i.e. already scaled to the segment's parameter span).
 *
 * @param {number} x0 start value
 * @param {number} v0 start velocity (d x / d τ)
 * @param {number} x1 end value
 * @param {number} v1 end velocity (d x / d τ)
 * @param {number} tau normalized position in [0,1]
 * @returns {number}
 */
export function quinticHermite(x0, v0, x1, v1, tau) {
  const t = tau < 0 ? 0 : tau > 1 ? 1 : tau;
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  const t5 = t4 * t;
  // Basis with acceleration terms dropped (a0 = a1 = 0 → minimum jerk).
  const h0 = 1 - 10 * t3 + 15 * t4 - 6 * t5; // × x0
  const h1 = t - 6 * t3 + 8 * t4 - 3 * t5; // × v0
  const h3 = 10 * t3 - 15 * t4 + 6 * t5; // × x1
  const h4 = -4 * t3 + 7 * t4 - 3 * t5; // × v1
  return h0 * x0 + h1 * v0 + h3 * x1 + h4 * v1;
}

/**
 * Per-control-point tangents (d rank / d progress). Interior points use a Catmull-Rom central
 * difference; the FIRST point uses its explicit `vel` when present (the handoff anchor's measured
 * rank-velocity) else a one-sided difference; the LAST point settles to 0 (the racer eases into its
 * band, no residual drift). Pure — returns a new number[] the same length as points.
 *
 * @param {Array<{progress:number, rank:number, vel?:number}>} points ordered by progress
 * @returns {number[]} tangent per point, in rank-per-progress units
 */
export function computeTangents(points) {
  const n = points.length;
  const tan = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      tan[i] =
        points[0].vel != null
          ? points[0].vel
          : n > 1
            ? (points[1].rank - points[0].rank) / (points[1].progress - points[0].progress)
            : 0;
    } else if (i === n - 1) {
      tan[i] = points[i].vel != null ? points[i].vel : 0; // settle into band (no drift)
    } else {
      const dp = points[i + 1].progress - points[i - 1].progress;
      tan[i] = dp > 0 ? (points[i + 1].rank - points[i - 1].rank) / dp : 0;
    }
  }
  return tan;
}

/**
 * Validate a raw waypoint list: ≥2 points, each { progress∈[0,1], rank≥1 }, strictly increasing in
 * progress. Throws on violation (caller authors these; a malformed curve is a programming error).
 *
 * @param {Array<{progress:number, rank:number}>} waypoints
 */
export function validateWaypoints(waypoints) {
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    throw new Error('heroCurve: need ≥2 waypoints');
  }
  for (let i = 0; i < waypoints.length; i++) {
    const w = waypoints[i];
    if (typeof w.progress !== 'number' || w.progress < 0 || w.progress > 1) {
      throw new Error(`heroCurve: waypoint ${i} progress out of [0,1]`);
    }
    if (typeof w.rank !== 'number' || w.rank < 1) {
      throw new Error(`heroCurve: waypoint ${i} rank must be ≥1`);
    }
    if (i > 0 && w.progress <= waypoints[i - 1].progress) {
      throw new Error('heroCurve: waypoints must strictly increase in progress');
    }
  }
}

/**
 * Build a hero curve from authored waypoints. Returns an immutable descriptor { points } where each
 * point is { progress, rank, vel? }. Tangents are derived lazily in sampleHeroCurve so an anchored
 * curve re-derives them from the new first point.
 *
 * @param {Array<{progress:number, rank:number}>} waypoints
 * @returns {{points: Array<{progress:number, rank:number, vel?:number}>}}
 */
export function makeHeroCurve(waypoints) {
  validateWaypoints(waypoints);
  return { points: waypoints.map((w) => ({ progress: w.progress, rank: w.rank })) };
}

/**
 * Jerk-match the curve to the chaos→choreo handoff: replace the FIRST control point with the hero's
 * ACTUAL state at the boundary — (anchorProgress, anchorRank, anchorVel) — so value AND first
 * derivative are continuous there. Later waypoints (whose progress ≤ anchorProgress) are dropped so
 * the anchor is the true curve start. Pure — returns a new curve.
 *
 * @param {{points: Array}} curve
 * @param {number} anchorProgress leader-progress at the handoff (~pulkStart)
 * @param {number} anchorRank     hero's actual current rank at the handoff
 * @param {number} anchorVel      hero's actual rank-velocity (d rank / d progress) at the handoff
 * @returns {{points: Array}}
 */
export function anchorHeroCurve(curve, anchorProgress, anchorRank, anchorVel) {
  const tail = curve.points.filter((p) => p.progress > anchorProgress);
  const anchor = { progress: anchorProgress, rank: anchorRank, vel: anchorVel };
  // Guarantee ≥2 points so a segment always exists (degenerate authored tail → hold the last rank).
  if (tail.length === 0) {
    const last = curve.points[curve.points.length - 1];
    return { points: [anchor, { progress: 1, rank: last.rank, vel: 0 }] };
  }
  return { points: [anchor, ...tail] };
}

/**
 * Sample the target rank at a given leader-progress. Before the first control point the curve is not
 * yet active (returns the first rank); after the last it holds the final rank. Between points it is
 * the min-jerk quintic Hermite through the two bracketing control points and their tangents.
 *
 * @param {{points: Array<{progress:number, rank:number, vel?:number}>}} curve
 * @param {number} progress leader-progress [0,1]
 * @returns {number} target rank (real-valued; caller may round for display)
 */
export function sampleHeroCurve(curve, progress) {
  const pts = curve.points;
  if (progress <= pts[0].progress) return pts[0].rank;
  if (progress >= pts[pts.length - 1].progress) return pts[pts.length - 1].rank;
  const tan = computeTangents(pts);
  let i = 0;
  while (i < pts.length - 1 && progress > pts[i + 1].progress) i++;
  const a = pts[i];
  const b = pts[i + 1];
  const span = b.progress - a.progress;
  const tau = (progress - a.progress) / span;
  // Tangents are per-progress; scale to per-τ for the segment (v_τ = v_progress × span).
  return quinticHermite(a.rank, tan[i] * span, b.rank, tan[i + 1] * span, tau);
}
