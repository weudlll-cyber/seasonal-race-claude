// ============================================================
// pulk-contest.mjs — PULK-window contest + density observers (SWEEP support, read-only).
//
// SIM-ONLY, read-only. Pure functions + one small stateful tracker factory. No I/O, no race-state
// mutation. Fed frame-by-frame from the existing --action-metrics PULK-window loop in sim-fairness.mjs
// (it already sorts the live order each PULK frame — we piggyback that sort, we do NOT add a second
// per-frame loop). The MATH lives here; sim-fairness.mjs only calls observe()/result().
//
// WHAT IT MEASURES (window: the LIVE PULK window [pulkStartFrac, pulkEndFrac), read from the plan
// fractions — never a pinned constant):
//   1. maxLinkGapLengths — the largest gap between two ADJACENT-ranked live racers, in RACER LENGTHS.
//      The "max consecutive-link gap": one big hole means the field has torn, even if the leader→P2
//      gap is small. PRIMARY density unit = racer lengths (the shared conversion in raceLengths.js).
//   2. held top-5 overtakes — a rank swap BETWEEN two racers that are BOTH in the live top 5 which
//      HOLDS for at least HELD_HOLD_PROGRESS of leader-progress. A flicker from lateral jitter (order
//      flips for a frame then reverts) does NOT count. Hold is in LEADER-PROGRESS, never wall seconds
//      (a second-hold scales with speed; progress does not). This is the "REAL top-5 overtake" metric.
//
// The threshold HELD_HOLD_PROGRESS lives HERE (its home), documented, single-source — the caller never
// repeats it.
// ============================================================

import { arcT } from '../../../client/src/modules/raceLengths.js';

// Hold threshold for a top-5 overtake, in LEADER-PROGRESS fraction. 0.02 ≈ 1.2 s of a 60 s race — long
// enough to reject a one-frame lateral-jitter order flicker, short enough to catch a real pass inside
// the ~0.25-wide PULK window. Calibratable; documented as a proposal (the owner may retune by eye).
export const HELD_HOLD_PROGRESS = 0.02;

// maxLinkGapLengths: the largest adjacent-rank arc gap in racer lengths, over a live order (rank 1
// first, i.e. sorted DESC by t). `lenScale` = pathLengthPx / meanBodyLen (the shared racer-length
// scale). Returns 0 for a field of < 2. Pure.
export function maxLinkGapLengths(orderDescByT, isOpen, lenScale) {
  const n = orderDescByT.length;
  if (n < 2 || !(lenScale > 0)) return 0;
  let max = 0;
  for (let i = 0; i < n - 1; i++) {
    const gap = arcT(orderDescByT[i].t, orderDescByT[i + 1].t, isOpen) * lenScale;
    if (gap > max) max = gap;
  }
  return max;
}

// makeHeldOvertakeTracker: a stateful tracker for HELD top-5 overtakes. Feed it, each PULK frame, the
// ordered array of the current top-5 racer indices (rank 1 first) and the current leader-progress.
// It watches every pair of racers that are BOTH currently in the top 5: when their relative order
// flips versus the last CONFIRMED order and the flip persists >= holdProgress, it counts one held
// overtake and confirms the new order. A flip that reverts before holdProgress is discarded (jitter).
//
//   const t = makeHeldOvertakeTracker();
//   ...each PULK frame: t.observe([idxRank1, idxRank2, ...idxRank5], progress);
//   ...at race end:     t.count  // number of held top-5 overtakes
//
// Pair key: `${min}-${max}`. Confirmed order stored as the index currently ahead. Pending flip stores
// the progress at which the order first disagreed with the confirmed order.
export function makeHeldOvertakeTracker(holdProgress = HELD_HOLD_PROGRESS) {
  const confirmedAhead = new Map(); // pairKey -> index confirmed to be ahead
  const pendingSince = new Map();   // pairKey -> progress at which the current disagreement began
  let count = 0;
  const api = {
    get count() {
      return count;
    },
    observe(top5Order, progress) {
      const m = top5Order.length;
      const rankIn = new Map();
      for (let i = 0; i < m; i++) rankIn.set(top5Order[i], i);
      for (let i = 0; i < m; i++) {
        for (let j = i + 1; j < m; j++) {
          const a = top5Order[i]; // ahead this frame (lower rank index)
          const b = top5Order[j];
          const key = a < b ? `${a}-${b}` : `${b}-${a}`;
          const conf = confirmedAhead.get(key);
          if (conf === undefined) {
            confirmedAhead.set(key, a); // first sighting of the pair together — seed the order
            pendingSince.delete(key);
            continue;
          }
          if (conf === a) {
            pendingSince.delete(key); // order matches the confirmed order — no pending flip
          } else {
            // Order disagrees with the confirmed order (b was ahead, now a is).
            const since = pendingSince.get(key);
            if (since === undefined) {
              pendingSince.set(key, progress);
            } else if (progress - since >= holdProgress) {
              count++;
              confirmedAhead.set(key, a); // the flip held → it is a real overtake; confirm it
              pendingSince.delete(key);
            }
          }
        }
      }
    },
  };
  return api;
}
