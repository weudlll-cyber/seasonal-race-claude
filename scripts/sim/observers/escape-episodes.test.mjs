// ============================================================
// escape-episodes.test.mjs — leader escape-episode state machine.
//
// Run: node --test scripts/sim/observers/escape-episodes.test.mjs
//
// The tracker is a pure state machine, so every boundary is pinned exactly: the episode opens strictly
// ABOVE G (not at it), closes at or below G, survives to the line as UNRESOLVED, and the structural
// "no dice left" classification is asserted both ways. These are the definitions the late-escaper
// verdict rests on, so a drift here must fail loudly rather than quietly re-label a cause.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makeEscapeEpisodeTracker,
  summarizeEpisodes,
} from "./escape-episodes.mjs";

const G = 0.75;
const WIN = 54000; // window end in ms

test("no episode while the gap stays at or below G", () => {
  const t = makeEscapeEpisodeTracker({ G, windowEndMs: WIN });
  t.observe(0.5, 0.1, 1000, 3, 2000, 0);
  t.observe(G, 0.2, 2000, 3, 2000, 0); // exactly G is NOT an escape
  t.finish(0.3, 3000, 0);
  assert.equal(t.result().episodes.length, 0);
});

test("an episode opens above G and closes when the gap returns to G", () => {
  const t = makeEscapeEpisodeTracker({ G, windowEndMs: WIN });
  t.observe(1.0, 0.3, 10000, 3, 12000, 0); // open
  t.observe(2.5, 0.4, 14000, 3, 12000, 0); // deepen
  t.observe(0.7, 0.5, 18000, 3, 20000, 1); // close (a tilt landed → corrected)
  const eps = t.result().episodes;
  assert.equal(eps.length, 1);
  assert.equal(eps[0].resolved, true);
  assert.equal(eps[0].corrected, true);
  assert.equal(eps[0].downTiltsDuring, 1);
  assert.equal(eps[0].peakGapLen, 2.5);
  assert.equal(eps[0].durationMs, 8000);
  assert.equal(eps[0].startP, 0.3);
  assert.equal(eps[0].endP, 0.5);
});

test("an episode still open at the line is UNRESOLVED — ran free", () => {
  const t = makeEscapeEpisodeTracker({ G, windowEndMs: WIN });
  t.observe(1.5, 0.8, 48000, 7, Infinity, 0);
  t.observe(4.0, 0.95, 57000, 7, Infinity, 0);
  t.finish(1.0, 60000, 0);
  const e = t.result().episodes[0];
  assert.equal(e.resolved, false);
  assert.equal(e.corrected, false);
  assert.equal(e.peakGapLen, 4.0);
});

test("OUT-OF-ROLLS: no scheduled roll remains inside the window at episode start", () => {
  const t = makeEscapeEpisodeTracker({ G, windowEndMs: WIN });
  // next roll is AFTER the window end → structurally uncorrectable
  t.observe(1.2, 0.85, 50000, 7, 56000, 0);
  t.finish(1.0, 60000, 0);
  const e = t.result().episodes[0];
  assert.equal(e.hadCorrectableRollAhead, false);
});

test("a roll inside the window counts as correctable, even late", () => {
  const t = makeEscapeEpisodeTracker({ G, windowEndMs: WIN });
  t.observe(1.2, 0.8, 45000, 7, 53000, 0); // 53000 <= 54000 → still correctable
  t.finish(1.0, 60000, 0);
  assert.equal(t.result().episodes[0].hadCorrectableRollAhead, true);
});

test("startedAfterWindowEnd flags escapes beginning past the last correctable instant", () => {
  const t = makeEscapeEpisodeTracker({ G, windowEndMs: WIN });
  t.observe(1.2, 0.93, 55000, 7, Infinity, 0);
  t.finish(1.0, 60000, 0);
  assert.equal(t.result().episodes[0].startedAfterWindowEnd, true);
});

test("a null next-roll time is treated as no roll ahead, not as roll-at-zero", () => {
  const t = makeEscapeEpisodeTracker({ G, windowEndMs: WIN });
  t.observe(1.2, 0.5, 20000, 7, null, 0);
  t.finish(1.0, 60000, 0);
  assert.equal(t.result().episodes[0].hadCorrectableRollAhead, false);
});

test("separate escapes produce separate episodes", () => {
  const t = makeEscapeEpisodeTracker({ G, windowEndMs: WIN });
  t.observe(1.0, 0.2, 5000, 1, 6000, 0);
  t.observe(0.2, 0.3, 9000, 1, 12000, 1); // close #1 corrected
  t.observe(1.4, 0.7, 40000, 2, Infinity, 1);
  t.finish(1.0, 60000, 1); // close #2 unresolved, uncorrected
  const eps = t.result().episodes;
  assert.equal(eps.length, 2);
  assert.equal(eps[0].corrected, true);
  assert.equal(eps[1].corrected, false);
  assert.equal(eps[1].resolved, false);
});

// ── Equality boundaries. Both fields are decided by a comparison against windowEndMs, and each uses
// a DIFFERENT operator (<= for the roll, > for the start). The exactly-equal frame is therefore the
// one place a silent operator flip would change a classification without any other test noticing.
test("boundary: nextRoll EXACTLY at windowEndMs still counts as correctable (<=, not <)", () => {
  const t = makeEscapeEpisodeTracker({ G, windowEndMs: WIN });
  t.observe(1.2, 0.8, 45000, 7, WIN, 0); // nextRoll === windowEndMs
  t.finish(1.0, 60000, 0);
  // The transform refuses only once elapsed is PAST the cutoff, so a roll landing exactly on it is
  // still actionable. Flipping this to `<` would mis-file that episode as structurally out-of-rolls.
  assert.equal(t.result().episodes[0].hadCorrectableRollAhead, true);
});

test('boundary: an episode starting EXACTLY at windowEndMs is NOT "after window end" (>, not >=)', () => {
  const t = makeEscapeEpisodeTracker({ G, windowEndMs: WIN });
  t.observe(1.2, 0.9, WIN, 7, WIN, 0); // raceTs === windowEndMs
  t.finish(1.0, 60000, 0);
  const e = t.result().episodes[0];
  assert.equal(e.startedAfterWindowEnd, false);
  // ...and the two fields stay consistent at the shared boundary: the window has not closed, and the
  // roll sitting on it is still correctable.
  assert.equal(e.hadCorrectableRollAhead, true);
});

// ── Integration-style: the post-finish cascade. This is the actual failure mode the finishedCount
// guard in sim-fairness.mjs exists to prevent, and it is the one that would silently manufacture the
// exact signal this observer is meant to test — so it is pinned here against a replica of the sim's
// call pattern rather than trusted to a comment.
test("the finishedCount guard excludes the post-finish cascade (the failure mode it exists for)", () => {
  // Replica of the sim's per-frame loop. After the leader crosses the line, racers drop out of the
  // live set one by one and the "leader gap" churns violently — a burst of spurious sub-second
  // episodes pinned near progress 1.0, every one necessarily uncorrected and out-of-rolls.
  const frames = [
    // …pre-finish: one genuine, resolved escape.
    { gap: 1.2, p: 0.4, ts: 24000, nextRoll: 30000, finished: 0 },
    { gap: 1.8, p: 0.45, ts: 27000, nextRoll: 30000, finished: 0 },
    { gap: 0.3, p: 0.5, ts: 30000, nextRoll: 36000, finished: 0 },
    // …post-finish: the churn. Alternating over/under G as the live set collapses.
    { gap: 3.0, p: 1.0, ts: 58000, nextRoll: Infinity, finished: 1 },
    { gap: 0.2, p: 1.0, ts: 58200, nextRoll: Infinity, finished: 1 },
    { gap: 4.0, p: 1.0, ts: 58400, nextRoll: Infinity, finished: 2 },
    { gap: 0.1, p: 1.0, ts: 58600, nextRoll: Infinity, finished: 2 },
    { gap: 5.0, p: 1.0, ts: 58800, nextRoll: Infinity, finished: 3 },
    { gap: 0.1, p: 1.0, ts: 59000, nextRoll: Infinity, finished: 3 },
  ];
  const run = (guard) => {
    const t = makeEscapeEpisodeTracker({ G, windowEndMs: WIN });
    for (const f of frames) {
      if (guard && f.finished > 0) continue; // the sim's `escapeEpisodes && finishedCount === 0`
      t.observe(f.gap, f.p, f.ts, 7, f.nextRoll, 1);
    }
    t.finish(1.0, 60000, 1);
    return t.result().episodes;
  };

  // WITHOUT the guard the cascade is counted: the churn manufactures extra episodes, all of them
  // uncorrected and out-of-rolls — precisely the structural signal the analysis is testing for.
  const unguarded = run(false);
  assert.equal(unguarded.length, 4);
  const phantoms = unguarded.slice(1);
  assert.ok(
    phantoms.every(
      (e) => e.corrected === false && e.hadCorrectableRollAhead === false,
    ),
  );
  assert.ok(phantoms.every((e) => e.startP === 1));
  // WITH the guard only the genuine pre-finish escape survives, correctly classified.
  const guarded = run(true);
  assert.equal(guarded.length, 1);
  assert.equal(guarded[0].resolved, true);
  assert.equal(guarded[0].corrected, false);
  assert.equal(guarded[0].startP, 0.4);
  assert.equal(guarded[0].endP, 0.5);
  // No episode survives that started at the line.
  assert.ok(guarded.every((e) => e.startP < 1));

  // THE POINT, stated as a number. outOfRollsShareOfUncorrected is the headline the late-escaper
  // verdict rests on. The cascade drags it from 0 (the genuine escape had a correctable roll ahead —
  // nothing structural about it) to 0.75, purely from frames after the race was decided. That is not
  // noise around a finding; it is a fabricated finding.
  assert.equal(
    summarizeEpisodes([{ episodes: guarded }]).outOfRollsShareOfUncorrected,
    0,
  );
  assert.equal(
    summarizeEpisodes([{ episodes: unguarded }]).outOfRollsShareOfUncorrected,
    0.75,
  );
});

test("summarizeEpisodes splits corrected / out-of-rolls / other", () => {
  const recs = [
    {
      episodes: [
        {
          startP: 0.3,
          endP: 0.4,
          durationMs: 1000,
          peakGapLen: 2,
          resolved: true,
          corrected: true,
          downTiltsDuring: 1,
          hadCorrectableRollAhead: true,
          startedAfterWindowEnd: false,
        },
        {
          startP: 0.9,
          endP: 1.0,
          durationMs: 5000,
          peakGapLen: 5,
          resolved: false,
          corrected: false,
          downTiltsDuring: 0,
          hadCorrectableRollAhead: false,
          startedAfterWindowEnd: true,
        },
        {
          startP: 0.5,
          endP: 0.6,
          durationMs: 2000,
          peakGapLen: 3,
          resolved: true,
          corrected: false,
          downTiltsDuring: 0,
          hadCorrectableRollAhead: true,
          startedAfterWindowEnd: false,
        },
      ],
    },
  ];
  const s = summarizeEpisodes(recs);
  assert.equal(s.nEpisodes, 3);
  assert.equal(s.correctedRate, 1 / 3);
  assert.equal(s.outOfRollsRate, 1 / 3);
  assert.equal(s.uncorrectedOtherRate, 1 / 3);
  assert.equal(s.outOfRollsShareOfUncorrected, 0.5);
  assert.equal(s.unresolvedRate, 1 / 3);
  // uncorrected episodes start later than corrected ones in this fixture
  assert.ok(s.uncorrectedStartPMed > s.correctedStartPMed);
});

test("summarizeEpisodes is safe on an empty set", () => {
  const s = summarizeEpisodes([]);
  assert.equal(s.nEpisodes, 0);
  assert.equal(s.correctedRate, null);
  assert.equal(s.durationMsMed, null);
});
