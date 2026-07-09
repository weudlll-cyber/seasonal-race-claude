// ============================================================
// gap-metrics.mjs — GAP-SPACE race-quality observers (INFRA 5C).
//
// SIM-ONLY, read-only. Pure functions: no state, no I/O, no mutation.
//
// WHY THIS FILE EXISTS
// Every quality metric the project owns lives in RANK space. `reachedFront := live
// rank <= 5` is satisfied by a racer finishing 5th, fifteen lengths behind a lone
// winner. That is how the numbers said "the comeback works" while the owner's eye saw
// a dead race. These GAP-space metrics measure the race in TIME behind the leader, so
// a strung-out field and a bunched field with IDENTICAL final ranks score differently.
//
// "Seconds behind the leader" is the tv-gap: how long ago the leader was where this
// racer is now. It is computed from the leader's own progress-vs-time trace, so it is
// robust to the leader's speed changing over the race.
//
// CALIBRATION — X / Y / Z are NOT chosen by optimisation. They are proposals awaiting
// the owner's calibration against a race he watches. Callers must report RAW
// distributions, never pass/fail, until the owner fixes the thresholds. The proposed
// values live in PROPOSED_THRESHOLDS below with their reasoning.
// ============================================================

// Proposed thresholds — AWAITING OWNER CALIBRATION. Do not treat as gates.
//   inContentionSec (X): within this many s of the leader counts as "in contention".
//   comebackDepthSec (Y): must have been at least this far behind after chaos.
//   comebackFinishSec (Z): must finish within this many s of the leader.
//   deadRaceGapSec: leader→P2 gap above this for most of the final third = processional.
// Reasoning (races run ~30–60 s): 2 s ≈ a few body lengths (a genuine threat); 5 s ≈ a
// clearly detached chaser; 1.5 s ≈ a close, photo-ish finish; 3 s of persistent leader→P2
// gap through the run-in reads as visibly processional. All provisional.
export const PROPOSED_THRESHOLDS = {
  inContentionSec: 2.0, // X
  comebackDepthSec: 5.0, // Y
  comebackFinishSec: 1.5, // Z
  deadRaceGapSec: 3.0,
  deadRaceMajorityFrac: 0.5, // "most of" the final third
};

// Linear-interpolate the raceTs (ms) at which the monotonic leader trace first reached
// track-position `t`. leaderTrace: ascending-by-t array of { ts, t } (ts ms, t track-pos).
// Returns the earliest ts. Clamps to the trace ends when `t` is outside the sampled range.
export function leaderTsAtPosition(leaderTrace, t) {
  const n = leaderTrace.length;
  if (n === 0) return 0;
  if (t <= leaderTrace[0].t) return leaderTrace[0].ts;
  if (t >= leaderTrace[n - 1].t) return leaderTrace[n - 1].ts;
  // Binary search for the first sample with trace.t >= t.
  let lo = 0;
  let hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (leaderTrace[mid].t < t) lo = mid + 1;
    else hi = mid;
  }
  const b = leaderTrace[lo];
  const a = leaderTrace[lo - 1];
  const span = b.t - a.t;
  if (span <= 0) return a.ts;
  const frac = (t - a.t) / span;
  return a.ts + frac * (b.ts - a.ts);
}

// secondsBehindLeader: how long ago (seconds) the leader was at the racer's CURRENT
// position `racerT`. 0 for the leader itself. Never negative.
export function secondsBehindLeader(racerT, leaderTrace, nowTs) {
  const leaderTs = leaderTsAtPosition(leaderTrace, racerT);
  return Math.max(0, (nowTs - leaderTs) / 1000);
}

// percentile(values, q) with linear interpolation between order statistics; q in [0,1].
// Non-mutating (copies before sort). Returns NaN for an empty array.
export function percentile(values, q) {
  const v = values.filter((x) => Number.isFinite(x)).slice().sort((a, b) => a - b);
  const n = v.length;
  if (n === 0) return NaN;
  if (n === 1) return v[0];
  const idx = q * (n - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return v[lo];
  return v[lo] + (v[hi] - v[lo]) * (idx - lo);
}

// fieldSpreadP10P90: p90 − p10 of the field's seconds-behind-leader at one instant.
export function fieldSpreadP10P90(behindSecondsArray) {
  return percentile(behindSecondsArray, 0.9) - percentile(behindSecondsArray, 0.1);
}

// gapsAtLine: from finish times (seconds) sorted ascending, the finish-order spreads.
//   leaderGapToP2 = t[1] − t[0]; top5Spread = t[k] − t[0], k = min(4, last).
// Returns { leaderGapToP2, top5Spread } (0 when the field is too small to define them).
export function gapsAtLine(sortedFinishSeconds) {
  const t = sortedFinishSeconds;
  const n = t.length;
  if (n < 2) return { leaderGapToP2: 0, top5Spread: 0 };
  const leaderGapToP2 = t[1] - t[0];
  const k = Math.min(4, n - 1);
  const top5Spread = t[k] - t[0];
  return { leaderGapToP2, top5Spread };
}

// inContentionFraction: share of a per-racer behind-seconds SERIES within X s of the leader.
export function inContentionFraction(behindSeconds, X) {
  const n = behindSeconds.length;
  if (n === 0) return 0;
  let c = 0;
  for (const b of behindSeconds) if (b <= X) c++;
  return c / n;
}

// visibleComeback: was at least Y s behind the leader AFTER chaos AND finished within Z s
// of the leader. This is the HONEST comeback definition — NOT rank <= 5.
export function visibleComeback(maxBehindAfterChaos, finalBehindSeconds, Y, Z) {
  return maxBehindAfterChaos >= Y && finalBehindSeconds <= Z;
}

// deadRaceFlag: the leader→P2 gap exceeds `thresholdSeconds` through MORE THAN
// `majorityFrac` of the final third (a processional run-in).
export function deadRaceFlag(gapToP2SeriesFinalThird, thresholdSeconds, majorityFrac = 0.5) {
  const n = gapToP2SeriesFinalThird.length;
  if (n === 0) return false;
  let over = 0;
  for (const g of gapToP2SeriesFinalThird) if (g > thresholdSeconds) over++;
  return over / n > majorityFrac;
}

// ── Rank-space reference metrics (for the golden test only) ──────────────────────────
// Deliberately simple re-implementations of the project's rank-space measures, so the
// golden test can prove that rank-space metrics are BLIND to the bunched/strung
// difference that the gap-space metrics above catch.

// reachedFront: did the racer's final rank land in the front band (<= edge, default 5)?
export function reachedFront(finalRank, frontEdge = 5) {
  return finalRank <= frontEdge;
}

// bandReach: did the final rank land in the target band? bands = ascending edge list.
export function bandReach(finalRank, targetRank, edges = [5, 15, 25, 40]) {
  const bandOf = (r) => {
    for (let i = 0; i < edges.length; i++) if (r <= edges[i]) return i;
    return edges.length;
  };
  return bandOf(finalRank) === bandOf(targetRank);
}

// placesGained: start rank minus final rank (positive = climbed).
export function placesGained(startRank, finalRank) {
  return startRank - finalRank;
}
