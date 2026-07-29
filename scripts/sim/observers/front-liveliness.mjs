// ============================================================
// front-liveliness.mjs — READ-ONLY. One per-frame leader/gap track feeding three measurements:
//
//   (STAGE 0) LAW — Longest Actionless Window: largest race-progress span with NO leader change.
//             LAW_full over [0,1], LAW_last50 over [0.5,1]. Ported measurement-only from the chain line.
//
//   (STAGE 1) PULK window [chaosEnd, windowHi] (default [0.25, 0.60]): how flat the mid-race is —
//             whether an early breakaway leader holds the front through the pulk.
//
//   (ADDENDUM v2) CHAOS window [0, chaosEnd] (default [0, 0.25]): where the owner sighted the ≥5-length
//             breakaways forming. maxGap, the handover gap + field spread at chaosEnd, and the identity of
//             the leader at chaosEnd (drawn rank captured here; start-row / steer enriched sim-side).
//
// Pure + incremental: no I/O, no mutation. The caller feeds the live field, race progress, and a
// gapLen(aT,bT) callback (the shared lap-aware arcT×govLenScale length path) each frame. drawnRank(index)
// returns the racer's DRAWN target rank so the observer can tell whether the long leader is the pre-sorted
// band-1 favourite. gapCapG is the shipped gap-cap re-roll-bias threshold (lengths) — the leader's
// anti-runaway TRIGGER is armed when P1→P2 gap ≥ G (paired sim-side with the actual brake-fire events).
// ============================================================

const longestGap = (points) => {
  let m = 0;
  for (let i = 1; i < points.length; i++) m = Math.max(m, points[i] - points[i - 1]);
  return +m.toFixed(4);
};

export function makeFrontLivelinessTracker({
  drawnRank,
  chaosEnd = 0.25,
  windowHi = 0.6,
  breakawayLen = 2.0,
  b1Edge = 5,
  gapCapG = null,
} = {}) {
  // Whole-race leader-change progresses (for LAW).
  let prevLeaderAll = null;
  const leadChangesAll = [];
  // CHAOS window [0, chaosEnd].
  let chaosGapMax = 0;
  // One-shot handover snapshot at the first frame ≥ chaosEnd.
  let snapDone = false;
  let gapAtChaosEnd = null; // P1→P2 gap (lengths) at chaosEnd
  let fieldSpreadAtChaosEnd = null; // P1→last live span (lengths) at chaosEnd
  let leaderIdxAtChaosEnd = null;
  let leaderDrawnRankAtChaosEnd = null;
  // PULK window [chaosEnd, windowHi].
  const winLeaderFrames = new Map();
  let winFrames = 0;
  let winGapSum = 0;
  let winGapMax = 0;
  let winBreakawayFrames = 0;
  let winLeaderB1Frames = 0;
  let winBrakeArmedFrames = 0;
  let prevLeaderWin = null;
  let winLeadChanges = 0;

  return {
    observe(racers, progress, gapLen) {
      const live = (racers ?? [])
        .filter((r) => !r.finished)
        .sort((a, b) => b.t - a.t || a.index - b.index);
      if (!live.length) return;
      const leader = live[0];

      // Whole-race lead changes → LAW.
      if (prevLeaderAll != null && leader.index !== prevLeaderAll) {
        leadChangesAll.push(+progress.toFixed(4));
      }
      prevLeaderAll = leader.index;

      const gap = live.length >= 2 ? gapLen(leader.t, live[1].t) : 0;

      // CHAOS window.
      if (progress <= chaosEnd) {
        if (gap > chaosGapMax) chaosGapMax = gap;
      }
      // Handover snapshot — first frame at/after chaosEnd.
      if (!snapDone && progress >= chaosEnd) {
        snapDone = true;
        gapAtChaosEnd = +gap.toFixed(3);
        fieldSpreadAtChaosEnd = +gapLen(live[0].t, live[live.length - 1].t).toFixed(3);
        leaderIdxAtChaosEnd = leader.index;
        leaderDrawnRankAtChaosEnd = drawnRank ? drawnRank(leader.index) : null;
      }

      // PULK window.
      if (progress < chaosEnd || progress > windowHi) return;
      winFrames++;
      winLeaderFrames.set(leader.index, (winLeaderFrames.get(leader.index) ?? 0) + 1);
      if (prevLeaderWin != null && leader.index !== prevLeaderWin) winLeadChanges++;
      prevLeaderWin = leader.index;
      winGapSum += gap;
      if (gap > winGapMax) winGapMax = gap;
      if (gap >= breakawayLen) winBreakawayFrames++;
      if (gapCapG != null && gap >= gapCapG) winBrakeArmedFrames++;
      const dr = drawnRank ? drawnRank(leader.index) : null;
      if (dr != null && dr <= b1Edge) winLeaderB1Frames++;
    },

    result() {
      let maxHold = 0;
      for (const n of winLeaderFrames.values()) if (n > maxHold) maxHold = n;
      const firstChangeAfterChaos = leadChangesAll.find((p) => p >= chaosEnd);
      return {
        // STAGE 0 — LAW.
        LAW_full: longestGap([0, ...leadChangesAll, 1]),
        LAW_last50: longestGap([0.5, ...leadChangesAll.filter((x) => x >= 0.5), 1]),
        leadChangesTotal: leadChangesAll.length,
        // ADDENDUM v2 — CHAOS window [0, chaosEnd].
        maxGapP1P2_chaos: +chaosGapMax.toFixed(3),
        gapAtChaosEnd,
        fieldSpreadAtChaosEnd,
        leaderIdxAtChaosEnd,
        leaderDrawnRankAtChaosEnd,
        // STAGE 1 — PULK window [chaosEnd, windowHi] (null when no window frames).
        windowFrames: winFrames,
        maxLeadHoldShare_mid: winFrames ? +(maxHold / winFrames).toFixed(4) : null,
        distinctLeaders_mid: winLeaderFrames.size,
        leadChanges_mid: winLeadChanges,
        meanGapP1P2_mid: winFrames ? +(winGapSum / winFrames).toFixed(3) : null,
        maxGapP1P2_mid: +winGapMax.toFixed(3),
        earlyBreakaway: winFrames ? winBreakawayFrames / winFrames >= 0.5 : false,
        leaderIsDrawnB1_mid: winFrames ? +(winLeaderB1Frames / winFrames).toFixed(4) : null,
        // brake TRIGGER armed (gap ≥ G) share — pair with the sim-side actual fire events + the design gate.
        brakeArmed_mid: gapCapG != null && winFrames ? +(winBrakeArmedFrames / winFrames).toFixed(4) : null,
        firstLeadChangeFromChaosEnd:
          firstChangeAfterChaos != null ? +(firstChangeAfterChaos - chaosEnd).toFixed(4) : null,
      };
    },
  };
}
