// ============================================================
// outcome-front-battle.mjs — SUSTAINED MULTI-RACER P1 BATTLE (the merged success metric).
//
// SIM-ONLY, read-only. Pure incremental tracker + pure classifier: no I/O, no mutation of race
// state. Same split as runaway-parade.mjs / release-contest.mjs — the frame-level FEEDING lives in
// the sim (it needs per-frame access to the lap-aware length path), the DEFINITIONS live here so
// they are testable in isolation.
//
// WHY THIS EXISTS. The existing endgame metrics answer "did the leader lose the lead?" (p1Swap) and
// "how often did it change hands?" (leadChangeCount). Neither can tell a single late lunge apart
// from a sustained scrap: one pass on the last corner scores identically to four racers trading P1
// for the whole final act. The eye reads only the second as "a real P1 battle", so the measure has
// to combine CHANGE (distinct leaders, lead changes), SUSTAIN (no one racer owns the window) and
// PROXIMITY (a multi-racer group is actually there to fight) — all four at once, per race.
//
// WINDOW W = [contestWindowStart, FIRST FINISH]. contestWindowStart is supplied by the caller and is
// the LIVE choreoResolveB2 config value (shipped 0.8) — the point from which the choreography stops
// holding B2 and the front act is meant to resolve. It is NEVER hardcoded here: an owner who moves
// the config moves the measurement window with it.
//
// WHY THE WINDOW CLOSES AT THE FIRST FINISH. Racers leave the LIVE ordering by finishing, so the
// rank-1 slot is inherited straight down the field once the flag falls: measured to raceProgress
// 1.0, a 40-racer field reports ~40 "distinct leaders" and a long procession tail that dilutes every
// share — in a first measurement EVERY race saturated distinctLeaders at field size, making the
// >= 3 criterion trivially true. makeLateContestTracker already refuses to count those inheritances
// as lead CHANGES; the same exclusion has to apply to the other four primitives, and the clean way
// to state it is that there is no P1 battle left to measure once P1 has crossed the line. The
// tracker therefore freezes at the first observed frame containing a finished racer. The
// leader-crossing frame itself is still counted: the sim feeds this observer BEFORE its finish
// check, so that frame arrives with the whole field still live.
//
// FIVE PRIMITIVES per race, over W:
//   distinctLeaders      — distinct racers holding live rank 1 at any frame.
//   leadChangeCount      — genuine lead changes. REUSES makeLateContestTracker from
//                          release-contest.mjs verbatim, including its leader-finishing exclusion
//                          (a leader that leaves the live ordering by FINISHING is not a pass).
//   maxLeadHoldShare     — largest share of W-frames any single racer held rank 1. The SUSTAIN
//                          measure: 1.0 = one racer led throughout, low = the lead kept moving.
//   frontContestFraction — share of W-frames with >= minGroup live racers within nearLen of P1.
//   p1LongestMultiSec    — longest CONTINUOUS stretch (seconds) satisfying that same predicate.
//                          frontContestFraction can be reached by many scattered instants;
//                          this one is only reached by a group that stays together.
//
// GROUP-SIZE CONVENTION: "within nearLen of P1" INCLUDES P1 itself (it is trivially within 0 of
// itself), so minGroup = 3 means the leader plus two chasers. This differs from
// runaway-parade's within3P1At090, which counts only the racers BEHIND P1 — that one answers "how
// many are chasing", this one answers "how big is the front group". Both are stated wherever they
// are printed so the two are never read as the same number.
// ============================================================

import { makeLateContestTracker } from './release-contest.mjs';

// FRONT_BATTLE_DEFAULTS — every threshold in one place, so the orchestrator can echo them into the
// report header. No progress constant lives here: contestWindowStart is always passed in.
export const FRONT_BATTLE_DEFAULTS = {
  nearLen: 3.0,                   // lengths behind P1 that still count as "in the front group"
  minGroup: 3,                    // group size (INCLUDING P1) that counts as contested
  minDistinctLeaders: 3,          // classifier: CHANGE
  minLeadChanges: 3,              // classifier: CHANGE
  maxLeadHoldShare: 0.70,         // classifier: SUSTAIN (<= this)
  minFrontContestFraction: 0.50,  // classifier: PROXIMITY (>= this)
};

/**
 * makeFrontBattleTracker — per-frame collector for the five primitives.
 *
 * Takes the full racers array (not a precomputed leader) for the same reason makeLateContestTracker
 * does: the finished flags are part of the definition. Takes a gapLen(aT, bT) CALLBACK rather than
 * raw positions so the lap-aware length path (arcT x govLenScale) stays in the single place the sim
 * already owns it — one shared length definition for every observer, no duplicate arc maths here.
 *
 * @param {Object}   opts
 * @param {number}   opts.windowStart   W start (the LIVE choreoResolveB2 — caller-supplied)
 * @param {number}   [opts.nearLen]     see FRONT_BATTLE_DEFAULTS
 * @param {number}   [opts.minGroup]    see FRONT_BATTLE_DEFAULTS
 */
export function makeFrontBattleTracker({
  windowStart,
  nearLen = FRONT_BATTLE_DEFAULTS.nearLen,
  minGroup = FRONT_BATTLE_DEFAULTS.minGroup,
} = {}) {
  const leaderFrames = new Map(); // racer index -> frames held at live rank 1
  let frames = 0;                 // W-frames observed (frames with at least one live racer)
  let contestFrames = 0;          // of those, frames whose front group reached minGroup
  // Longest continuous contested stretch. runStartMs = when the current run began, runLastMs = the
  // most recent contested frame in it; a non-contested frame (or a frame with no live racers)
  // closes the run. Duration is measured between FRAMES, so a single isolated contested frame is
  // 0s — one instant is not a stretch.
  let runStartMs = null, runLastMs = null, longestMs = 0;
  let frozen = false;             // set by the first frame containing a finished racer (see header)
  const lateContest = makeLateContestTracker(windowStart);

  const closeRun = () => {
    if (runStartMs != null && runLastMs != null && runLastMs - runStartMs > longestMs) {
      longestMs = runLastMs - runStartMs;
    }
    runStartMs = null; runLastMs = null;
  };

  return {
    /**
     * @param {Array<{index:number,t:number,finished:boolean}>} racers full field this frame
     * @param {number} progress race progress (0..1)
     * @param {number} raceTsMs race clock in ms
     * @param {(aT:number,bT:number)=>number} gapLen lap-aware gap in racer lengths (a ahead of b)
     */
    observe(racers, progress, raceTsMs, gapLen) {
      if (frozen || progress < windowStart) return;
      // The flag has fallen: the front act is decided, and everything past here is the finish
      // procession inheriting rank 1 downwards. Close the open stretch and take no further frames.
      if ((racers ?? []).some((r) => r.finished)) { closeRun(); frozen = true; return; }

      // Lead changes: delegated verbatim, fed the same unfiltered field it expects.
      lateContest.observe(racers, progress);

      const live = (racers ?? [])
        .filter((r) => !r.finished)
        .sort((a, b) => b.t - a.t || a.index - b.index);
      if (!live.length) { closeRun(); return; } // defensive: no live racers, not a W-frame

      frames++;
      const leader = live[0];
      leaderFrames.set(leader.index, (leaderFrames.get(leader.index) ?? 0) + 1);

      // Front group INCLUDING P1 (see GROUP-SIZE CONVENTION above). Live order is t-descending, so
      // the scan can stop at the first racer outside nearLen.
      let group = 1;
      for (let i = 1; i < live.length; i++) {
        if (gapLen(leader.t, live[i].t) > nearLen) break;
        group++;
      }

      if (group >= minGroup) {
        if (runStartMs === null) runStartMs = raceTsMs;
        runLastMs = raceTsMs;
        contestFrames++;
      } else {
        closeRun();
      }
    },

    /**
     * @returns {{windowFrames:number, distinctLeaders:number, leadChangeCount:number,
     *            maxLeadHoldShare:number|null, frontContestFraction:number|null,
     *            p1LongestMultiSec:number}}
     *   maxLeadHoldShare / frontContestFraction are null when the race produced no W-frames at all
     *   (e.g. it never reached windowStart), so "no data" never reads as 0.
     */
    result() {
      let maxHold = 0;
      for (const n of leaderFrames.values()) if (n > maxHold) maxHold = n;
      // Non-destructive close: a run still open at race end must count.
      const openMs = runStartMs != null && runLastMs != null ? runLastMs - runStartMs : 0;
      const bestMs = Math.max(longestMs, openMs);
      return {
        windowFrames: frames,
        distinctLeaders: leaderFrames.size,
        leadChangeCount: lateContest.result().leadChangeCount,
        maxLeadHoldShare: frames > 0 ? maxHold / frames : null,
        frontContestFraction: frames > 0 ? contestFrames / frames : null,
        p1LongestMultiSec: bestMs / 1000,
      };
    },
  };
}

/**
 * classifyFrontBattle — does this race count as REAL P1 ACTION?
 *
 * ALL FOUR must hold: enough distinct leaders AND enough genuine lead changes AND no single racer
 * owning the window AND a multi-racer front group present for at least half of it. The conjunction
 * is the point — each condition alone is satisfiable by a race the eye would not call a battle.
 * p1LongestMultiSec is reported but deliberately NOT a criterion: it is a seconds quantity, and its
 * threshold would be track- and duration-dependent.
 *
 * @param {ReturnType<ReturnType<typeof makeFrontBattleTracker>['result']>} m primitives
 * @param {Object} [params] threshold overrides (defaults from FRONT_BATTLE_DEFAULTS)
 * @returns {boolean|null} null when the race yielded no W-frames (unknown, never a silent "no")
 */
export function classifyFrontBattle(m, params = {}) {
  if (!m || !m.windowFrames) return null;
  const p = { ...FRONT_BATTLE_DEFAULTS, ...params };
  if (m.maxLeadHoldShare == null || m.frontContestFraction == null) return null;
  return (
    m.distinctLeaders >= p.minDistinctLeaders &&
    m.leadChangeCount >= p.minLeadChanges &&
    m.maxLeadHoldShare <= p.maxLeadHoldShare &&
    m.frontContestFraction >= p.minFrontContestFraction
  );
}
