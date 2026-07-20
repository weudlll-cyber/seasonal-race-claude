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
