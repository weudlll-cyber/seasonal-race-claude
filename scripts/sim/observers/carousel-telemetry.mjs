// ============================================================
// carousel-telemetry.mjs — DID THE AUTHORED HANDOVERS ACTUALLY HAPPEN? (C1)
//
// SIM-ONLY, read-only. Pure incremental tracker: no I/O, no mutation of race state. Same split as
// the other observers here — the frame-level feeding lives in the sim, the definition lives here so
// it is testable in isolation.
//
// WHY THIS EXISTS SEPARATELY FROM THE CONTEST OBSERVER. outcome-front-battle.mjs measures what the
// RACE did (lead changes, distinct leaders). This measures what the MECHANISM did: of the handovers
// the carousel authored, how many the servo actually delivered. The two can diverge in both
// directions and the gap between them is the diagnostic that matters —
//   authored >> completed  → the curve is a fiction; the servo cannot track it (saturation, traffic)
//   authored ≈ completed   → the mechanism works; any shortfall in p1ContestRate is a schedule
//                            problem (too few segments fit the window), not an actuator problem
// Without the split, a low contest rate is uninterpretable: it looks identical whether the carousel
// never fired or fired and was ignored.
//
// COMPLETION IS A HOLD, NOT A TOUCH. A handover counts as completed only when the segment's authored
// leader holds LIVE rank 1 continuously for at least the authored dwell. A racer that noses ahead for
// two frames and is swallowed again did not take the lead in any sense the eye would accept, and
// counting it would let a jittering front manufacture a perfect score.
// ============================================================

/**
 * makeCarouselTracker — per-frame collector for authored-vs-completed handovers and dwell lengths.
 *
 * @param {Object}   opts
 * @param {Array<{start:number, climbEnd:number, end:number, leader:number}>} opts.segments authored schedule
 * @param {number[]} opts.order      rotation slot → racer index
 * @param {number}   opts.dwellSec   minimum continuous rank-1 hold that counts as a completed handover
 */
export function makeCarouselTracker({ segments = [], order = [], dwellSec = 0 } = {}) {
  // Per segment: the longest continuous hold of live rank 1 by that segment's AUTHORED leader.
  const bestHoldMs = new Array(segments.length).fill(0);
  let curSeg = -1;          // segment index being observed
  let holdStartMs = null;   // start of the current continuous hold by the authored leader
  let lastMs = null;

  const closeHold = () => {
    if (curSeg >= 0 && holdStartMs != null && lastMs != null) {
      const held = lastMs - holdStartMs;
      if (held > bestHoldMs[curSeg]) bestHoldMs[curSeg] = held;
    }
    holdStartMs = null;
  };

  return {
    /**
     * @param {Array<{index:number,t:number,finished:boolean}>} racers full field this frame
     * @param {number} progress race progress (0..1)
     * @param {number} raceTsMs race clock in ms
     */
    observe(racers, progress, raceTsMs) {
      if (!segments.length) return;
      // Which authored segment is this frame in? -1 = outside the carousel schedule entirely.
      let seg = -1;
      for (let i = 0; i < segments.length; i++) {
        if (progress >= segments[i].start && progress < segments[i].end) { seg = i; break; }
      }
      if (seg !== curSeg) { closeHold(); curSeg = seg; }
      if (seg < 0) return;

      const live = (racers ?? []).filter((r) => !r.finished);
      if (!live.length) { closeHold(); return; }
      let leader = live[0];
      for (const r of live) if (r.t > leader.t || (r.t === leader.t && r.index < leader.index)) leader = r;

      const authored = order[segments[seg].leader];
      if (leader.index === authored) {
        if (holdStartMs === null) holdStartMs = raceTsMs;
        lastMs = raceTsMs;
      } else {
        closeHold();
      }
    },

    /**
     * @returns {{authoredHandovers:number, completedHandovers:number, completionRate:number|null,
     *            dwellsSec:number[]}}
     *   authoredHandovers = segments - 1 (the first segment only establishes the opening leader;
     *   no lead has changed hands yet when it begins).
     */
    result() {
      // Non-destructive: fold the still-open hold into a copy, never into the live state.
      const holds = bestHoldMs.slice();
      if (curSeg >= 0 && holdStartMs != null && lastMs != null) {
        const held = lastMs - holdStartMs;
        if (held > holds[curSeg]) holds[curSeg] = held;
      }
      const dwellMs = dwellSec * 1000;
      // Segment 0 establishes the opening leader; handovers are the transitions INTO segments 1..S-1.
      const authoredHandovers = Math.max(0, segments.length - 1);
      let completed = 0;
      for (let i = 1; i < holds.length; i++) if (holds[i] >= dwellMs) completed++;
      return {
        authoredHandovers,
        completedHandovers: completed,
        completionRate: authoredHandovers > 0 ? completed / authoredHandovers : null,
        dwellsSec: holds.map((ms) => +(ms / 1000).toFixed(3)),
      };
    },
  };
}
