// ============================================================
// File:        panTarget.js
// Path:        client/src/modules/camera/panTarget.js
// Project:     RaceArena
// Created:     2026-05-07
//
// WHAT THIS IS FOR: the WORLD POINT a state centres on, given its subjects. One pure function,
// one answer per state, no knowledge of cameras or the pipeline.
//
// WHAT IT IS NOT FOR: zoom, framing, or which subjects those are — the caller has already decided
// who matters and passes them in. On a closed track BATTLE's midpoint is taken along the RACING
// LINE rather than as a euclidean average, because the euclidean midpoint of two racers on opposite
// sides of a bend sits in the infield.
//
// CONTRACT: racers arrive sorted descending by t, so racers[0] is the leader.
// ============================================================

/**
 * Identify the world-coordinate pan target for the given camera state.
 *
 * @param {string} state   CAM_STATE value: 'OVERVIEW' | 'LEADER_ZOOM' | 'BATTLE_ZOOM' | 'COMEBACK_ZOOM'
 * @param {Array<{x: number, y: number, t?: number}>} racers
 *   Racer positions in world coordinates, sorted descending by t (leader first).
 *   For OVERVIEW: pass all racers (or a pre-filtered set the caller wants to center on).
 *   For LEADER/BATTLE/COMEBACK: pass the top-N focus group.
 * @param {object|null} [shape=null]
 *   Optional EditorShape instance. When provided and state is BATTLE_ZOOM with ≥2 racers,
 *   the pan target is resolved at t = (r0.t + r1.t) / 2 on the racing line (track-curve-aware
 *   midpoint). Without shape the euclidean midpoint is used as fallback — this keeps open-track
 *   callers and tests that omit shape working identically to before.
 * @returns {{ x: number, y: number }}  World-coordinate point to center the camera on.
 */
export function getPanTarget(state, racers, shape = null) {
  if (!racers || racers.length === 0) return { x: 0, y: 0 };

  switch (state) {
    case 'LEADER_ZOOM': {
      const r0 = racers[0];
      return { x: r0.x, y: r0.y };
    }

    case 'BATTLE_ZOOM': {
      const r0 = racers[0];
      const r1 = racers.length > 1 ? racers[1] : racers[0];
      // Track-curve-aware midpoint: interpolate along the racing line at the
      // arc-length midpoint between the two racers. On curved tracks (ovals) the
      // euclidean midpoint lies in the infield; tMid stays on the track surface.
      // Falls back to euclidean when shape is absent (open-track callers, tests
      // that don't supply shape) or when there is only one racer.
      if (shape && racers.length > 1) {
        const tMid = (r0.t + r1.t) / 2;
        const pos = shape.getPosition(tMid, 0);
        return { x: pos.x, y: pos.y };
      }
      return {
        x: (r0.x + r1.x) / 2,
        y: (r0.y + r1.y) / 2,
      };
    }

    case 'COMEBACK_ZOOM': {
      // 3rd-place racer in the passed group (index 2), or last if fewer.
      // Mirrors CameraDirector's historical behavior: target is the back of the
      // focus group, not the last-place racer across the whole field.
      const target = racers[Math.min(2, racers.length - 1)];
      return { x: target.x, y: target.y };
    }

    case 'OVERVIEW':
    default: {
      // Centroid of all passed racers — caller controls which set to include.
      // OVERVIEW is at low zoom; smoothing not needed, use physics positions.
      const cx = racers.reduce((s, r) => s + r.x, 0) / racers.length;
      const cy = racers.reduce((s, r) => s + r.y, 0) / racers.length;
      return { x: cx, y: cy };
    }
  }
}
