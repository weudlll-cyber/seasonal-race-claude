// ============================================================
// runaway-parade.mjs — RUNAWAY-WINNER & PARADE-FINISH classifiers (baseline measurement).
//
// SIM-ONLY, read-only. Pure functions: no state, no I/O, no mutation. This module NEVER touches
// race state — it consumes the RAW per-race record the sim collects under --runaway-parade (a
// purely additive, flagged, read-only observer in scripts/sim-fairness.mjs) and turns it into the
// two race-level booleans + their distribution fields. The frame-level collection lives in the sim
// (it needs per-frame access); the DEFINITIONS + thresholds live here so they are testable in
// isolation and recoverable from the raw record.
//
// PRIMARY UNIT: RACER LENGTHS (the shared HUD/gap-space scale — arcT × govLenScale), same unit the
// project reasons in. The sim measures every gap in this unit before it reaches this module.
//
// TWO DEAD-ENDGAME PHENOMENA (spec definitions, verbatim):
//
//   RUNAWAY_WINNER — a race counts iff ALL of:
//     a) at progress `windowStart` the rank-1 racer leads rank-2 by >= `leadLen` racer lengths,
//     b) the same racer finishes rank 1,
//     c) the leader→P2 gap never drops below `challengeLen` lengths anywhere in [windowStart, 1.0]
//        (i.e. the win is never challenged).
//
//   PARADE_FINISH — a race counts iff at the finish snapshot there is a leading group of size >= 2
//     where
//     a) every consecutive gap INSIDE the group is <= `sideBySideLen` lengths (side by side), and
//     b) the gap from the group's last member to the next racer behind is >= `farLen` lengths (far
//        from the field).
//     We also report the group's internal speed spread over the final `speedWindow` of the race
//     (max relative speed delta) to confirm the "same speed" signature.
//
// The thresholds are PARAMETERS with the spec defaults below — the caller prints them in the output
// header so no single value is baked in silently.
// ============================================================

import { arcT } from '../../../client/src/modules/raceLengths.js';

// leaderGapLengths — the ONE source for "leader→P2 arc distance in racer lengths" (lap-aware). This is
// BOTH what the runaway-winner metric measures AND what the sim-only front distance leash steers on, so
// the thing measured and the thing steered on are identical by construction (golden symmetry test).
// racers: [{ t, index, finished }]; lenScale: govLenScale; returns 0 for a field of < 2 live racers.
export function leaderGapLengths(racers, isOpen, lenScale) {
  const live = racers.filter((r) => !r.finished).sort((a, b) => (b.t - a.t) || (a.index - b.index));
  if (live.length < 2 || !(lenScale > 0)) return 0;
  return arcT(live[0].t, live[1].t, isOpen) * lenScale;
}

// ── Runaway SPEED-SOURCE diagnostic (read-only): WHERE does the leader's overspeed come from? ──
// The applied per-frame speed chain (client/src/modules/raceStep.js advanceRacerT) is, in order:
//   effSpeed = baseSpeed · boost · brake · rowEnvMult · trajectoryMult · areaBonusMult · governorMult
// (× dt), then a FINISH clamp Math.min(advanced, finishT+0.001). There is NO pre-finish SPEED clamp —
// each factor is clamped only at its OWN source (trajectoryMult∈[0.85,1.10]; spreadFactor∈natural band;
// governorMult∈pulk envelope). rowEnvMult IS "rowBonusPost"; areaBonusMult IS "areaBonusPost".
export const SPEED_SOURCE_SAMPLES = [0.70, 0.75, 0.80, 0.85, 0.90, 0.95];

// speedProduct — the full multiplicative chain (must equal the applied Δt/dt when the finish clamp
// did not fire). `f` carries every factor captured at the advanceRacerT call site.
export function speedProduct(f) {
  return f.baseSpeed * f.boost * f.brake * f.rowEnvMult * f.trajectoryMult * f.areaBonusMult * f.governorMult;
}

// speedSaturation — per-factor ceiling saturation + remaining headroom (there is no single speed clamp).
//   servoSaturated : trajectoryMult pinned at the servo ceiling (maxMult) → the servo can't push faster.
//   servoHeadroom  : maxMult − trajectoryMult (how much MORE the servo could add to this racer).
//   bandHeadroom   : natCeil − spreadFactor (how much faster this racer's NATURAL draw could be).
export function speedSaturation(f, trajMax, natCeil) {
  return {
    servoSaturated: f.trajectoryMult >= trajMax - 1e-6,
    servoHeadroom: trajMax - f.trajectoryMult,
    bandHeadroom: natCeil - f.spreadFactor,
  };
}

// ── Runaway FORMATION diagnostic (read-only): WHEN does the leader→P2 gap form? ────────────────
// Thresholds/boundaries are parameters with these defaults (printed in the sweep header).
export const FORMATION_DEFAULTS = {
  t15: 1.5,        // "gap opened" threshold (lengths)
  t30: 3.0,        // "runaway lead" threshold (lengths) — same as RUNAWAY_PARADE_DEFAULTS.leadLen
  windowEnd: 0.90, // the sustained-window end (matches the runaway-winner measurement point)
  sample1: 0.30,   // boundary sample A (mid-chaos)
  sample2: 0.60,   // boundary sample B (PULK→OUTCOME handoff)
};

// makeFormationTracker — a PURE, incremental per-frame tracker (no I/O, no mutation of race state).
// The sim feeds it (gap, progress, leaderIdx) every frame; result() returns the per-race formation
// fields. `gap` is the leader→P2 arc length (racer lengths) from the shared leaderGapLengths — the
// SAME quantity the runaway-winner metric uses. `leaderIdx` is the current live rank-1 racer index.
//
// firstCrossNN  = the earliest progress at which gap first reached the threshold (null = never).
// sustainedNN   = did the gap stay >= threshold continuously from firstCrossNN through windowEnd?
//                 (true on the crossing frame; flipped false only if it dips below before windowEnd;
//                  null when never crossed. A crossing at/after windowEnd stays true — no window to break.)
// gapAt030/060  = the gap sampled at the first frame at/after sample1 / sample2 (one-shot).
// leaderIdxAtCross30 = the live rank-1 racer index at the firstCross30 frame (null = never crossed) —
//                 lets the caller decide leaderStable (does that racer finish rank 1?).
export function makeFormationTracker(D = FORMATION_DEFAULTS) {
  let firstCross15 = null, sustained15 = null;
  let firstCross30 = null, sustained30 = null;
  let leaderIdxAtCross30 = null;
  let gapAt030 = null, gapAt060 = null;
  let done030 = false, done060 = false;
  return {
    observe(gap, progress, leaderIdx) {
      if (!done030 && progress >= D.sample1) { gapAt030 = gap; done030 = true; }
      if (!done060 && progress >= D.sample2) { gapAt060 = gap; done060 = true; }
      if (firstCross15 === null) {
        if (gap >= D.t15) { firstCross15 = progress; sustained15 = true; }
      } else if (sustained15 && progress <= D.windowEnd && gap < D.t15) {
        sustained15 = false;
      }
      if (firstCross30 === null) {
        if (gap >= D.t30) { firstCross30 = progress; sustained30 = true; leaderIdxAtCross30 = leaderIdx; }
      } else if (sustained30 && progress <= D.windowEnd && gap < D.t30) {
        sustained30 = false;
      }
    },
    result() {
      return { firstCross15, sustained15, firstCross30, sustained30, gapAt030, gapAt060, leaderIdxAtCross30 };
    },
  };
}

// formationLeaderStable — does the racer leading when 3.0L was first crossed finish rank 1?
// null when 3.0L was never crossed (leaderIdxAtCross30 null) or the finish map is missing.
export function formationLeaderStable(leaderIdxAtCross30, finalRankByIndex) {
  if (leaderIdxAtCross30 == null) return null;
  const winner = winnerIndexOf(finalRankByIndex);
  if (winner == null) return null;
  return leaderIdxAtCross30 === winner;
}

// formationBucket — bucket a firstCross progress into the report's histogram bins.
// Returns one of: 'lt030' | '030to060' | '060to075' | '075to090' | 'never'.
export function formationBucket(firstCross) {
  if (firstCross == null) return 'never';
  if (firstCross < 0.30) return 'lt030';
  if (firstCross < 0.60) return '030to060';
  if (firstCross < 0.75) return '060to075';
  if (firstCross < 0.90) return '075to090';
  return 'never'; // crossing at/after 0.90 → not "formed during the race" for this histogram
}

export const RUNAWAY_PARADE_DEFAULTS = {
  windowStart:   0.90, // progress at which the runaway lead is first measured, and the [.,1.0] window opens
  leadLen:       3.0,  // (RUNAWAY a) rank-1 must lead rank-2 by >= this many lengths at windowStart
  challengeLen:  1.0,  // (RUNAWAY c) leader→P2 gap must never drop below this in [windowStart, 1.0]
  sideBySideLen: 0.5,  // (PARADE a) max consecutive gap INSIDE the leading group
  farLen:        3.0,  // (PARADE b) min gap from the group's last member to the next racer behind
  speedWindow:   0.05, // (PARADE report) final fraction of the race over which the group speed spread is measured
};

// classifyRace — turn ONE raw per-race record into the two booleans + distribution fields.
//
// raw (collected by the sim, all gaps already in racer lengths):
//   {
//     leaderIdxAt090:      number,           // racer index frontmost at windowStart
//     leaderGapP2At090Len: number,           // that racer's lead over P2 at windowStart (lengths)
//     minLeadFrom090Len:   number,           // MIN lead of leaderIdxAt090 over the field across
//                                            //   [windowStart, its own finish] (lengths; <0 if passed)
//     line: { order: number[], gaps: number[] }, // finish snapshot: racer indices front→back and the
//                                            //   consecutive gaps between them (gaps[i] = order[i]→order[i+1])
//     speed095ByIndex:  { [idx]: number },   // per-racer avg speed over the final speedWindow (t-units/sec)
//     finalRankByIndex: { [idx]: number },   // final finishing rank per racer index
//   }
//
// Returns { runawayWinner, paradeFinish, leaderGapAt090Len, minLeadFrom090Len, winnerIdx,
//           winnerIsLeaderAt090, paradeGroupSize, paradeSpeedSpread, paradeNextGapLen }.
export function classifyRace(raw, D = RUNAWAY_PARADE_DEFAULTS) {
  const winnerIdx = winnerIndexOf(raw.finalRankByIndex);

  // ── RUNAWAY_WINNER ──
  const winnerIsLeaderAt090 = winnerIdx != null && raw.leaderIdxAt090 === winnerIdx;
  const runawayWinner =
    raw.leaderGapP2At090Len >= D.leadLen && // (a)
    winnerIsLeaderAt090 &&                   // (b)
    raw.minLeadFrom090Len >= D.challengeLen; // (c)

  // ── PARADE_FINISH ──
  const group = leadingGroup(raw.line, D);
  const paradeFinish = group.isParade;
  const paradeSpeedSpread = paradeFinish
    ? relativeSpeedSpread(group.members, raw.speed095ByIndex)
    : null;

  return {
    runawayWinner,
    paradeFinish,
    leaderGapAt090Len:  raw.leaderGapP2At090Len,
    minLeadFrom090Len:  raw.minLeadFrom090Len,
    winnerIdx,
    winnerIsLeaderAt090,
    paradeGroupSize:    group.size,          // 0 when no qualifying group
    paradeNextGapLen:   group.nextGapLen,    // gap from the group's last member to the next racer (null if none)
    paradeSpeedSpread,                       // (max-min)/mean of the group's final-window speeds
  };
}

// winnerIndexOf — the racer index whose final rank is 1 (null if absent).
export function winnerIndexOf(finalRankByIndex) {
  for (const [idx, rank] of Object.entries(finalRankByIndex ?? {})) {
    if (rank === 1) return Number(idx);
  }
  return null;
}

// leadingGroup — from the finish-snapshot front order + consecutive gaps, extend a group from the
// FRONT while every internal gap is <= sideBySideLen. Report whether it is a PARADE (size >= 2 AND the
// gap that broke the group is >= farLen). Also returns the group members + the breaking ("next") gap.
export function leadingGroup(line, D = RUNAWAY_PARADE_DEFAULTS) {
  const order = line?.order ?? [];
  const gaps  = line?.gaps ?? [];
  let k = 0; // number of internal (<= sideBySideLen) gaps consumed
  while (k < gaps.length && gaps[k] <= D.sideBySideLen) k++;
  const size = order.length ? k + 1 : 0; // members = order[0..k]
  const members = order.slice(0, size);
  // gaps[k] is the gap AFTER the last group member (undefined if the group runs to the field's tail).
  const nextGapLen = k < gaps.length ? gaps[k] : null;
  const isParade = size >= 2 && nextGapLen != null && nextGapLen >= D.farLen;
  return { size: isParade ? size : (size >= 2 ? size : 0), members, nextGapLen, isParade };
}

// relativeSpeedSpread — max relative speed delta among a set of racers = (max-min)/mean of their
// final-window speeds. Returns 0 for a degenerate/empty set (guards a zero mean).
export function relativeSpeedSpread(memberIndices, speedByIndex) {
  const speeds = (memberIndices ?? [])
    .map((i) => speedByIndex?.[i])
    .filter((s) => typeof s === 'number' && isFinite(s));
  if (speeds.length < 2) return 0;
  let mn = Infinity, mx = -Infinity, sum = 0;
  for (const s of speeds) { if (s < mn) mn = s; if (s > mx) mx = s; sum += s; }
  const mean = sum / speeds.length;
  return mean > 0 ? +((mx - mn) / mean).toFixed(6) : 0;
}
