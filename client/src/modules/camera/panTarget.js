// ============================================================
// File:        panTarget.js
// Path:        client/src/modules/camera/panTarget.js
// Project:     RaceArena
// Created:     2026-05-07
// Description: Layer 1 of the camera pan reform — pure function that identifies
//              the world-coordinate point the camera should center on, given
//              the current camera state and racer positions.
//
//              No camera knowledge, no pipeline knowledge.
//              Racers must be sorted descending by t (leader = racers[0]).
// ============================================================

/**
 * Identify the world-coordinate pan target for the given camera state.
 *
 * @param {string} state   CAM_STATE value: 'OVERVIEW' | 'LEADER_ZOOM' | 'BATTLE_ZOOM' | 'COMEBACK_ZOOM'
 * @param {Array<{x: number, y: number}>} racers
 *   Racer positions in world coordinates, sorted descending by t (leader first).
 *   For OVERVIEW: pass all racers (or a pre-filtered set the caller wants to center on).
 *   For LEADER/BATTLE/COMEBACK: pass the top-N focus group.
 * @returns {{ x: number, y: number }}  World-coordinate point to center the camera on.
 */
export function getPanTarget(state, racers) {
  if (!racers || racers.length === 0) return { x: 0, y: 0 };

  switch (state) {
    case 'LEADER_ZOOM': {
      return { x: racers[0].x, y: racers[0].y };
    }

    case 'BATTLE_ZOOM': {
      const r0 = racers[0];
      const r1 = racers.length > 1 ? racers[1] : racers[0];
      return { x: (r0.x + r1.x) / 2, y: (r0.y + r1.y) / 2 };
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
      const cx = racers.reduce((s, r) => s + r.x, 0) / racers.length;
      const cy = racers.reduce((s, r) => s + r.y, 0) / racers.length;
      return { x: cx, y: cy };
    }
  }
}
