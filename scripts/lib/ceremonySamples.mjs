// ============================================================
// File:        scripts/lib/ceremonySamples.mjs
// Project:     RaceArena — RENDER-SAMPLER-CEREMONY
//
// WHERE THE RENDER FINGERPRINT SAMPLES THE START CEREMONY — derived from the schedule the game
// itself computes, never typed.
//
// ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────────────────────────
//
// `render-fingerprint.mjs` carried `CD_SAMPLE_MS = [0, 1500, 2400, 3800, 4900]`, five fixed
// milliseconds chosen against the ceremony's rhythm ON THE DAY THEY WERE CHOSEN. CEREMONY-OPENING
// then gave the track its own beat and stopped the board overlapping the push, and at 40 racers the
// board now runs 5000-11000 ms. **Every one of the five points lands before 5000.** The starters
// board, the settled beat and the countdown digits — more than two thirds of the opening — were
// outside the instrument, and the render record says so in its own words: adding one sample at
// 7000 ms moved the hash, so the board really was being drawn differently and unseen.
//
// The defect is not the five numbers. It is that a number typed against a rhythm cannot follow the
// rhythm when it changes, and nothing says so — the instrument goes quiet exactly when a beat moves,
// which is when it is most needed. **So the points are computed from `ceremonyScheduleFor`'s own
// output.** A future beat change moves the sample points with it, by construction.
//
// ── ONE POINT PER BEAT, AT ITS MIDPOINT ─────────────────────────────────────────────────────────
//
// The midpoint, not an offset from either end: it is the only choice that cannot land on a boundary
// however short or long a beat becomes, and a sample on a boundary is a sample whose beat depends on
// a rounding. A beat of zero length contributes NO point rather than a degenerate one — that is what
// makes the brand beat simply absent when no brand is active, instead of a frame hashed at time zero
// twice.
//
// THE BOARD GETS TWO, and it is the one asymmetry. Its alpha ramps in and out over a fixed fade
// (`BOARD_FADE_MS`), so its midpoint frame is the board at full opacity and says nothing about the
// ramp — and the ramp is a mechanism of its own (`boardAlphaAt`), not a detail of the drawing. The
// second point sits at half the fade, where alpha is ~0.5. The board is also the beat this
// instrument was blind to for a whole ship, which is reason enough to spend one extra frame on it.
//
// ── WHAT THIS DOES NOT DECIDE ───────────────────────────────────────────────────────────────────
//
// Whether a beat EXISTS. That is `ceremonyScheduleFor`'s answer and this function only reads it. In
// particular the BRAND beat is zero-length unless the caller has told the director a brand is
// active — see the harness, which does, and says why.
// ============================================================

/**
 * The ceremony sample points for one schedule.
 *
 * @param {object} s  a schedule from `ceremonyScheduleFor` — it is read, never rebuilt
 * @param {number} fadeMs  the board's fade length (`BOARD_FADE_MS`), passed in rather than imported
 *   so this file stays free of the client tree and can be tested without loading it
 * @returns {{beat:string, ms:number}[]} ascending by `ms`; every point strictly inside its beat
 */
export function ceremonySamplePoints(s, fadeMs) {
  const out = [];
  const mid = (name, from, to) => {
    if (!(to > from)) return; // a beat with no length has no frame to sample
    out.push({ beat: name, ms: from + (to - from) / 2 });
  };
  mid("brand", 0, s.brandEndMs);
  mid("venue", s.brandEndMs, s.venueEndMs);
  mid("push", s.venueEndMs, s.pushEndMs);
  if (s.boardEndMs > s.boardStartMs) {
    // Inside the fade-in, at roughly half alpha. `boardAlphaAt` clamps the fade to half the window,
    // so this stays inside the board however short the board becomes.
    const fade = Math.min(fadeMs, (s.boardEndMs - s.boardStartMs) / 2);
    out.push({ beat: "board-fade", ms: s.boardStartMs + fade / 2 });
  }
  mid("board", s.boardStartMs, s.boardEndMs);
  mid("settled", s.boardEndMs, s.countdownStartMs);
  mid("digits", s.countdownStartMs, s.totalMs);
  return out.sort((a, b) => a.ms - b.ms);
}

/** The beats this sampler knows about, in ceremony order. One home for the label set. */
export const CEREMONY_SAMPLE_BEATS = [
  "brand",
  "venue",
  "push",
  "board-fade",
  "board",
  "settled",
  "digits",
];
