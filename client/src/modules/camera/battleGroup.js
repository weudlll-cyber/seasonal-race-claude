// ============================================================
// File:        battleGroup.js
// Path:        client/src/modules/camera/battleGroup.js
// Project:     RaceArena — CAMERA-HYGIENE-2
//
// WHAT THIS IS FOR: answering "who is fighting whom right now", from track positions and a set of
// thresholds. It is the camera's only source for that question, and it is the hardest algorithm in
// the camera path — a triple-nested seed search with greedy expansion and an isolation veto.
//
// WHAT IT IS NOT FOR: anything to do with cameras. Nothing here knows about zoom, pan, states or
// the frame. It takes racers, returns racers, and holds no state between calls. That is the whole
// reason it is a file: it was 174 lines inside CameraDirector reachable only through a constructed
// director with a config, so the group rules could only be tested by driving a camera at them.
//
// THE UNIT IS ARC, NOT PIXELS (15b). Every distance here is `shortestArcDeltaT` — the lap-normalised
// shortest arc between two track parameters. World px was tried and failed: the same threshold meant
// 1.5% of a lap on one track and 4.9% on another across the 3072–6144 px worlds, so a single knob
// could not mean the same closeness twice and rejected every real cluster on the large ones. Raw `t`
// will not do either, because it accumulates across laps and two racers either side of the
// start/finish seam must read as adjacent.
// ============================================================

import { shortestArcDeltaT } from '../../utils/mathUtils.js';

/**
 * The first group of >= 3 racers that simultaneously satisfy every BATTLE condition:
 *   1. Closeness  — all pairwise arc distances <= gates.closenessT
 *   2. Isolation  — no non-member within gates.isolationT of any member (skipped when 0)
 *   3. Positional — frontmost group racer at rank 3 or worse (P1/P2 are LEADER territory),
 *                   seed-triple rank span <= 3, frontmost rank inside gates.minTopN
 *   4. Expansion  — greedy, capped at gates.maxSize members and gates.maxRankSpan total rank span
 *
 * @param {Array<{t:number}>} racers  full racer list, any order
 * @param {{closenessT:number, isolationT:number, maxSize:number, maxRankSpan:number, minTopN:number}} gates
 * @returns {Array|null}  the group sorted frontmost-first (highest t), or null when none qualifies
 */
export function detectPulkGroup(racers, gates) {
  if (!racers || racers.length < 3) return null;
  const sorted = [...racers].sort((a, b) => b.t - a.t);
  const n = sorted.length;
  if (n < 3) return null;
  const tThr = gates.closenessT;
  const isoThrT = gates.isolationT;
  const maxSize = gates.maxSize ?? 6;
  const maxRankSpan = gates.maxRankSpan ?? 5;
  // i >= 2: frontmost battle racer must be at rank 3 or worse (P1/P2 are LEADER territory).
  // i < minTopN: frontmost must be in the configured top-N (default top-10).
  const minTopN = gates.minTopN ?? 10;
  for (let i = 2; i < n - 2 && i < minTopN; i++) {
    for (let j = i + 1; j < n && j - i <= 3; j++) {
      for (let k = j + 1; k < n && k - i <= 3; k++) {
        const ri = sorted[i],
          rj = sorted[j],
          rk = sorted[k];
        if (
          shortestArcDeltaT(ri.t, rj.t) > tThr ||
          shortestArcDeltaT(ri.t, rk.t) > tThr ||
          shortestArcDeltaT(rj.t, rk.t) > tThr
        )
          continue;
        // Q2: greedy expansion — add adjacent-rank racers (index >= 2, not P1/P2) up to maxSize.
        // Track rank span: reject candidates that would push (maxIdx - minIdx) > maxRankSpan.
        const group = [ri, rj, rk];
        const groupSet = new Set([i, j, k]);
        let minGroupIdx = i; // seed frontmost always has best rank (i <= j <= k)
        let maxGroupIdx = k;
        for (let e = 2; e < n && group.length < maxSize; e++) {
          if (groupSet.has(e)) continue;
          const re = sorted[e];
          // Rank-span guard: check before the arc test (cheaper)
          const candMin = Math.min(minGroupIdx, e);
          const candMax = Math.max(maxGroupIdx, e);
          if (candMax - candMin > maxRankSpan) continue;
          let fits = true;
          for (const gm of group) {
            if (shortestArcDeltaT(gm.t, re.t) > tThr) {
              fits = false;
              break;
            }
          }
          if (fits) {
            group.push(re);
            groupSet.add(e);
            minGroupIdx = candMin;
            maxGroupIdx = candMax;
          }
        }
        // Q1: isolation — reject when any non-member is within isoThrT of any member.
        if (isoThrT > 0) {
          let isolated = true;
          outer: for (let o = 0; o < n; o++) {
            if (groupSet.has(o)) continue;
            const ro = sorted[o];
            for (const gm of group) {
              if (shortestArcDeltaT(gm.t, ro.t) < isoThrT) {
                isolated = false;
                break outer;
              }
            }
          }
          if (!isolated) continue;
        }
        return group; // sorted frontmost-first (highest t), size 3..maxSize
      }
    }
  }
  return null;
}

/**
 * Are all members still within `closenessT` of each other? BATTLE enters and exits on the SAME
 * measure, deliberately — a state that entered on arc and left on something else would have a
 * hysteresis nobody chose.
 * @param {Array<{t:number}>} group
 * @param {number} closenessT
 */
export function groupStillCohesive(group, closenessT) {
  for (let a = 0; a < group.length; a++) {
    for (let b = a + 1; b < group.length; b++) {
      if (shortestArcDeltaT(group[a].t, group[b].t) > closenessT) return false;
    }
  }
  return true;
}

/**
 * Has any member of a stored group climbed into P1 or P2? The battle shot is for the fight BEHIND
 * the lead; once a member reaches the front it is LEADER's subject, not BATTLE's.
 * @param {Array} racers  current full racer list
 * @param {Array<number|null>} groupIndices  stable indices captured when the group formed
 */
export function groupHoldsP1OrP2(racers, groupIndices) {
  if (!racers || !groupIndices?.length) return false;
  const sorted = [...racers].sort((a, b) => b.t - a.t);
  const p12 = new Set([sorted[0]?.index, sorted[1]?.index].filter((v) => v != null));
  if (p12.size === 0) return false;
  return groupIndices.some((idx) => idx != null && p12.has(idx));
}

/**
 * Stable racer lookup. Tries `r.index === idx` first — this is the one that matters, because
 * renderInterpolation hands the camera a fresh spread-copy of every racer each frame, so a stored
 * object reference stops being `===` anything in the live array. Falls back to reference identity
 * for callers (older tests) whose racers have no index.
 * @returns {object|null}
 */
export function findByIndex(racers, idx, fallbackRef) {
  if (idx != null) {
    const r = racers.find((r) => r.index === idx);
    if (r) return r;
  }
  if (fallbackRef) return racers.find((r) => r === fallbackRef) ?? null;
  return null;
}

/**
 * Resolve stored group indices back to this frame's live racer objects, slot by slot, dropping any
 * that have gone (finished or absent).
 * @param {Array} racers  current full racer list
 * @param {Array<number|null>} indices  stable indices captured when the group formed
 * @param {Array} fallbackRefs  the objects captured alongside them, for index-less callers
 */
export function resolveGroup(racers, indices, fallbackRefs) {
  if (!racers || !indices?.length) return fallbackRefs ?? [];
  return indices
    .map((idx, i) => findByIndex(racers, idx, fallbackRefs?.[i] ?? null))
    .filter(Boolean);
}
