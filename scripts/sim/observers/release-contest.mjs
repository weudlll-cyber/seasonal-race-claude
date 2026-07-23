// ============================================================
// release-contest.mjs — LATE LEAD CHANGE & POST-RELEASE BAND DRIFT (release-sweep metrics).
//
// SIM-ONLY, read-only. Pure functions + pure incremental trackers: no I/O, no mutation of race
// state. Same split as runaway-parade.mjs — the frame-level FEEDING lives in the sim (it needs
// per-frame access), the DEFINITIONS live here so they are testable in isolation.
//
// TWO METRICS, answering two different questions about moving choreoReleaseProgress earlier:
//
//   p1SwapAfter090 — the PAYOFF. Share of races whose progress-0.90 leader is NOT the final
//     winner, i.e. a genuine late pass happened. Derived from the record runaway-parade.mjs
//     already produces (winnerIsLeaderAt090), so it needs no new frame-level collection; the
//     companion leadChangeCount DOES (how many times the lead actually changed hands in
//     [0.90, 1.0] — one swap and a five-way scrap both read as "swap" without it).
//
//   bandExitAfterRelease — the FAIRNESS COST, and the reason this sweep is not just a payoff
//     hunt. Endpoint band-reach cannot tell "never got there" apart from "was there and drifted
//     out after being released". This metric isolates the second: of the racers who were INSIDE
//     their assigned band AT the release point, what share finished OUTSIDE it. Releasing the
//     field earlier gives more free-run runway for a P1 fight — and equally more runway to drift
//     off an already-correct position. That is exactly how the pack strictness-release experiment failed
//     (endgame drift while endpoint reach still looked acceptable), so it is measured up front
//     rather than inferred afterwards.
// ============================================================

import { BAND_EDGES } from '../../../client/src/modules/racePlanner.js';

// zoneIdxOf — 0-based band index of a finishing rank (0=B1 … 4=B5). Mirrors racePlanner's
// rankToBandIndex; duplicated here only because that one is module-private.
export function zoneIdxOf(rank) {
  for (let i = 0; i < BAND_EDGES.length; i++) if (rank <= BAND_EDGES[i]) return i;
  return BAND_EDGES.length;
}

// ── Late lead change ─────────────────────────────────────────────────────────────────────────
// makeLateContestTracker — counts how many times the lead genuinely CHANGES HANDS at/after
// windowStart. Takes the full racers array (not a precomputed leader index) because the
// distinction it has to make needs the finished flags:
//
//   A racer leaving the front of the LIVE ordering is not automatically a pass. Near the end of a
//   race the leader leaves that ordering by FINISHING, and the next racer inherits the front slot.
//   Counting those would report ~one "lead change" per finisher — in a 40-racer field that buries
//   the handful of real passes under ~39 phantoms. So a change is counted only when the outgoing
//   leader is still ON TRACK, i.e. it was actually overtaken.
//
// The first observation inside the window seeds the identity and is never a change.
export function makeLateContestTracker(windowStart = 0.9) {
  let current = null;
  let changes = 0;
  return {
    observe(racers, progress) {
      if (progress < windowStart) return;
      const live = [...(racers ?? [])]
        .filter((r) => !r.finished)
        .sort((a, b) => b.t - a.t || a.index - b.index);
      if (!live.length) return;
      const leader = live[0].index;
      if (current === null) {
        current = leader;
        return;
      }
      if (leader === current) return;
      const prev = racers.find((r) => r.index === current);
      if (prev && !prev.finished) changes++; // a real overtake, not the leader finishing
      current = leader;
    },
    result() {
      return { leadChangeCount: changes, leaderIdxAtEnd: current };
    },
  };
}

// ── Post-release band drift ──────────────────────────────────────────────────────────────────
// makeReleaseRankTracker — ONE-SHOT capture of every racer's live rank at the first frame at/after
// releaseProgress. Live rank = position in the t-descending order (1-based), the same ordering
// every other observer uses. Finished racers keep their achieved rank rather than dropping out of
// the ordering, so a racer that finished before the release point is still counted where it ended.
export function makeReleaseRankTracker(releaseProgress) {
  let captured = null;
  return {
    observe(racers, progress) {
      if (captured !== null || progress < releaseProgress) return;
      const order = [...racers].sort((a, b) => b.t - a.t || a.index - b.index);
      captured = {};
      order.forEach((r, i) => {
        captured[r.index] = i + 1;
      });
    },
    result() {
      return captured; // null when the race never reached releaseProgress
    },
  };
}

/**
 * bandExitAfterRelease — of the racers who were INSIDE their assigned band at the release point,
 * what share finished OUTSIDE it, per band.
 *
 * A racer contributes to band B's denominator only if sollBereich === B AND it was already inside
 * B at release. Racers outside their band at release are excluded entirely: they never had a
 * correct position to lose, so counting them would blend "never arrived" back into the metric this
 * exists to separate out.
 *
 * @param {Array<{sollBereich:number, rankAtRelease:number, finalRank:number}>} rows one row per racer
 * @param {number[]} bands which bands to report (default B1, B2)
 * @returns {Object<number, {inside:number, exited:number, rate:number|null}>} keyed by band
 */
export function bandExitAfterRelease(rows, bands = [1, 2]) {
  const out = {};
  for (const b of bands) out[b] = { inside: 0, exited: 0, rate: null };
  for (const r of rows ?? []) {
    if (r?.sollBereich == null || r.rankAtRelease == null || r.finalRank == null) continue;
    const acc = out[r.sollBereich];
    if (!acc) continue;
    const target = r.sollBereich - 1;
    if (zoneIdxOf(r.rankAtRelease) !== target) continue; // not inside at release → not at risk
    acc.inside++;
    if (zoneIdxOf(r.finalRank) !== target) acc.exited++;
  }
  for (const b of bands) {
    const acc = out[b];
    acc.rate = acc.inside > 0 ? acc.exited / acc.inside : null;
  }
  return out;
}

/**
 * p1SwapAfter090 — did the progress-0.90 leader fail to win? One boolean per race.
 * Null when the record cannot answer it (no leader captured, or no winner in the finish map),
 * so "unknown" never silently counts as "no swap".
 *
 * @param {{winnerIsLeaderAt090:boolean, winnerIdx:number|null}} classified from classifyRace
 * @param {{leaderIdxAt090:number|null}} raw the per-race record
 * @returns {boolean|null}
 */
export function p1SwapAfter090(classified, raw) {
  if (raw?.leaderIdxAt090 == null || classified?.winnerIdx == null) return null;
  return !classified.winnerIsLeaderAt090;
}
