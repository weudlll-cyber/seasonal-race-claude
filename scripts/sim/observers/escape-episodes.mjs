// ============================================================
// escape-episodes.mjs — LEADER ESCAPE EPISODES (read-only observer).
//
// SIM-ONLY, read-only, pure state machine. No I/O, no race-state mutation. The sim feeds it one
// sample per frame; all definitions live here so they are testable in isolation and recoverable from
// the raw record alone.
//
// WHAT AN EPISODE IS. The owner's finding is about a sequence, not an instant: a racer ESCAPES (the
// P1->P2 gap opens past the gap-reroll threshold G), and then either gets corrected — the eye sees a
// visible brake — or is never corrected and wins alone. So the unit of analysis is the EPISODE:
//
//   episode STARTS  the first frame the leader's gap exceeds G
//   episode ENDS    the first frame it is back at or below G   (resolved)
//                   ...or the race ends first                  (UNRESOLVED — "ran free to the line")
//
// Per episode we record how deep it got, how long it lasted, whether a gap-reroll DOWN-tilt landed on
// the leader while it was running, and — the diagnostic that matters for the late-escaper question —
// whether the leader still had a gap-correctable scheduled roll ahead of it when the escape began.
//
// WHY THAT LAST FIELD EXISTS. The gap-reroll only ever acts at a racer's SCHEDULED re-roll, and the
// transform additionally refuses to act once the roll schedule's own deadline is near
// (`elapsedMs > lastRollDeadlineMs - reRollTransitionDurationMs`). So an escape that begins after the
// leader's last correctable roll is STRUCTURALLY uncorrectable — not a priority conflict, not a tuning
// miss, simply no dice left to load. `hadCorrectableRollAhead` captures that at episode start, which
// is what separates "the mechanism declined to act" from "the mechanism had already retired".
// ============================================================

/**
 * @param {object} cfg
 * @param {number} cfg.G            gap threshold in racer lengths (the escape definition)
 * @param {number} cfg.windowEndMs  last instant a gap-reroll can act
 *                                  (= lastRollDeadlineMs − reRollTransitionDurationMs)
 */
export function makeEscapeEpisodeTracker({ G, windowEndMs }) {
  const episodes = [];
  let open = null;

  const close = (ep, endP, endMs, resolved, downCount) => {
    ep.endP = endP;
    ep.endMs = endMs;
    ep.durationMs = endMs - ep.startMs;
    ep.resolved = resolved;
    ep.downTiltsDuring = downCount - ep.downCountAtStart;
    ep.corrected = ep.downTiltsDuring > 0;
    delete ep.downCountAtStart;
    episodes.push(ep);
  };

  return {
    /**
     * One frame. `leaderDownCount` is the controller's running count of DOWN-tilts applied to the live
     * leader — the tracker only differences it, so it never needs to know how tilts are computed.
     * `leaderNextRollMs` is the leader's next scheduled roll time (Infinity/null if it has none).
     */
    observe(gapLen, raceProgress, raceTs, leaderIdx, leaderNextRollMs, leaderDownCount) {
      if (gapLen > G) {
        if (!open) {
          const nextRoll = leaderNextRollMs == null ? Infinity : leaderNextRollMs;
          open = {
            startP: raceProgress,
            startMs: raceTs,
            leaderIdxAtStart: leaderIdx,
            peakGapLen: gapLen,
            downCountAtStart: leaderDownCount,
            // Structural question: is there any scheduled roll left that the transform could still
            // act on? Both conditions must hold — a roll must exist AND fall inside the window.
            hadCorrectableRollAhead: nextRoll <= windowEndMs,
            startedAfterWindowEnd: raceTs > windowEndMs,
          };
        } else if (gapLen > open.peakGapLen) {
          open.peakGapLen = gapLen;
        }
      } else if (open) {
        close(open, raceProgress, raceTs, true, leaderDownCount);
        open = null;
      }
    },

    /** Call once at race end. Closes any still-open episode as UNRESOLVED (ran free to the line). */
    finish(raceProgress, raceTs, leaderDownCount) {
      if (open) {
        close(open, raceProgress, raceTs, false, leaderDownCount);
        open = null;
      }
    },

    result() {
      const r4 = (x) => (x == null ? null : +Number(x).toFixed(4));
      return {
        G,
        windowEndMs,
        episodes: episodes.map((e) => ({
          startP: r4(e.startP),
          endP: r4(e.endP),
          durationMs: Math.round(e.durationMs),
          peakGapLen: r4(e.peakGapLen),
          resolved: e.resolved,
          corrected: e.corrected,
          downTiltsDuring: e.downTiltsDuring,
          leaderIdxAtStart: e.leaderIdxAtStart,
          hadCorrectableRollAhead: e.hadCorrectableRollAhead,
          startedAfterWindowEnd: e.startedAfterWindowEnd,
        })),
      };
    },
  };
}

/**
 * Aggregate episode records across races. Pure.
 * Classification (mutually exclusive, in this order):
 *   CORRECTED            — a leader down-tilt landed during the episode
 *   OUT-OF-ROLLS         — uncorrected AND no gap-correctable scheduled roll remained at start
 *   UNCORRECTED-OTHER    — uncorrected although a correctable roll was still ahead
 * The middle bucket is the structural one; the last is the only bucket where a priority conflict or a
 * tuning miss could hide, so it is the one that must be explained rather than assumed.
 */
export function summarizeEpisodes(records) {
  const all = records.flatMap((r) => r.episodes ?? []);
  const n = all.length;
  const corrected = all.filter((e) => e.corrected);
  const uncorrected = all.filter((e) => !e.corrected);
  const outOfRolls = uncorrected.filter((e) => !e.hadCorrectableRollAhead);
  const other = uncorrected.filter((e) => e.hadCorrectableRollAhead);
  const unresolved = all.filter((e) => !e.resolved);
  const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
  const pctl = (a, p) => {
    if (!a.length) return null;
    const s = [...a].sort((x, y) => x - y);
    return s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))];
  };
  return {
    nEpisodes: n,
    correctedRate: n ? corrected.length / n : null,
    uncorrectedRate: n ? uncorrected.length / n : null,
    outOfRollsRate: n ? outOfRolls.length / n : null,
    uncorrectedOtherRate: n ? other.length / n : null,
    // Of the UNCORRECTED ones specifically, what share is structural?
    outOfRollsShareOfUncorrected: uncorrected.length ? outOfRolls.length / uncorrected.length : null,
    unresolvedRate: n ? unresolved.length / n : null,
    durationMsMed: pctl(all.map((e) => e.durationMs), 50),
    durationMsP90: pctl(all.map((e) => e.durationMs), 90),
    peakGapMed: pctl(all.map((e) => e.peakGapLen), 50),
    peakGapP90: pctl(all.map((e) => e.peakGapLen), 90),
    startPMed: pctl(all.map((e) => e.startP), 50),
    // Phase split: escapes that began after the gap-reroll window had already closed.
    startedAfterWindowEndRate: n ? all.filter((e) => e.startedAfterWindowEnd).length / n : null,
    correctedStartPMed: pctl(corrected.map((e) => e.startP), 50),
    uncorrectedStartPMed: pctl(uncorrected.map((e) => e.startP), 50),
  };
}
