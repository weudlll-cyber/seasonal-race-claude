// ============================================================
// File:        startCeremony.test.js
// Path:        client/src/modules/camera/startCeremony.test.js
// Project:     RaceArena — START-CEREMONY-CAMERA-1
//
// WHAT THIS GUARDS: the three promises the opening makes — that the target keeps EVERY racer in
// frame, that the venue shot shows the whole track, and that the move always completes before the
// gun so the framing the hold keeps was actually reached.
//
// R7's two questions are answered at each group.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  CEREMONY_EASINGS,
  DEFAULT_CEREMONY_EASING,
  ceremonyEasing,
  ceremonySchedule,
  ceremonyAt,
  ceremonyZoom,
  CEREMONY_BEAT,
  boardDurationMs,
  boardAlphaAt,
  ceremonyTotalMs,
  ceremonyScheduleFor,
  nextBeatStart,
} from './startCeremony.js';
import { fieldGuarantee } from './framingRule.js';
import { projectionForTrack, REFERENCE_CANVAS_W, REFERENCE_CANVAS_H } from './projection.js';
import { DEFAULT_CAMERA_CONFIG } from '../storage/defaults.js';
import { computeTimingFromConfig } from './cameraTimingComputation.js';
import { CameraDirector } from './CameraDirector.js';

const FRAME_W = REFERENCE_CANVAS_W;
const FRAME_H = REFERENCE_CANVAS_H;

/** A formation: `n` racers spread over `spanX` x `spanY` world px around a centre. */
function formation(n, spanX, spanY, cx = 500, cy = 300) {
  return Array.from({ length: n }, (_, i) => {
    const f = n === 1 ? 0.5 : i / (n - 1);
    return { x: cx - spanX / 2 + f * spanX, y: cy - spanY / 2 + f * spanY };
  });
}

/** Is every racer inside the centred inner-frame region at this cam.zoom? The picture's own test. */
function allInFrame(racers, centre, proj, camZoom, innerPct) {
  const halfW = (FRAME_W * innerPct) / 2;
  const halfH = (FRAME_H * innerPct) / 2;
  return racers.every((r) => {
    const sx = Math.abs(r.x - centre.x) * proj.effX(camZoom);
    const sy = Math.abs(r.y - centre.y) * proj.effY(camZoom);
    // A float epsilon, because the ceiling is exact and the boundary case is the interesting one.
    return sx <= halfW + 1e-9 && sy <= halfH + 1e-9;
  });
}

describe('the target zoom keeps every racer in frame (START-CEREMONY-CAMERA-1)', () => {
  // What breaks if deleted: the target could be derived from something other than the formation —
  // a constant, a field size, a track name — and would look plausible on the track it was tuned on.
  // What goes unnoticed: racers cropped out of the opening shot on the tracks nobody checked. The
  // formation is symmetrical and orderly, so a shot that cuts the outermost rows still looks
  // deliberate; you cannot tell by eye that somebody is missing.
  const CASES = [
    { label: 'closed, small field', open: false, w: 1600, h: 1000, n: 4, sx: 120, sy: 40 },
    { label: 'closed, full field', open: false, w: 1600, h: 1000, n: 40, sx: 500, sy: 260 },
    { label: 'closed, tall formation', open: false, w: 1600, h: 1000, n: 40, sx: 60, sy: 700 },
    { label: 'open, full field', open: true, w: 4000, h: 900, n: 40, sx: 900, sy: 200 },
    { label: 'open, 100 racers', open: true, w: 4000, h: 900, n: 100, sx: 1200, sy: 400 },
  ];

  for (const c of CASES) {
    it(`fits every racer — ${c.label}`, () => {
      const proj = projectionForTrack(c.w, c.h, c.open);
      const racers = formation(c.n, c.sx, c.sy);
      const centre = { x: 500, y: 300 };
      const inner = DEFAULT_CAMERA_CONFIG.targetInnerFramePct ?? 0.7;
      const z = proj.clampCamZoom(
        fieldGuarantee(racers, centre, proj.axisX, proj.axisY, FRAME_W, FRAME_H, inner)
      );
      expect(allInFrame(racers, centre, proj, z, inner)).toBe(true);
    });
  }

  it('is the LARGEST such zoom — a hair tighter and somebody is cropped', () => {
    // "Every racer in frame" is trivially satisfiable by zooming all the way out. The promise is
    // that it is the tightest shot that still keeps them, so this is the half that has teeth.
    const proj = projectionForTrack(1600, 1000, false);
    const racers = formation(40, 500, 260);
    const centre = { x: 500, y: 300 };
    const inner = 0.7;
    const z = fieldGuarantee(racers, centre, proj.axisX, proj.axisY, FRAME_W, FRAME_H, inner);
    expect(allInFrame(racers, centre, proj, z, inner)).toBe(true);
    expect(allInFrame(racers, centre, proj, z * 1.001, inner)).toBe(false);
  });

  it('widens for a wider formation and never the other way', () => {
    // The owner's sentence: a bigger field spread over more ground must get a wider shot. Monotone,
    // so it cannot be right on the two tracks it was checked on and wrong in between.
    const proj = projectionForTrack(1600, 1000, false);
    const centre = { x: 500, y: 300 };
    let prev = Infinity;
    for (const span of [50, 100, 200, 400, 800]) {
      const z = fieldGuarantee(
        formation(20, span, span / 3),
        centre,
        proj.axisX,
        proj.axisY,
        FRAME_W,
        FRAME_H,
        0.7
      );
      expect(z).toBeLessThan(prev);
      prev = z;
    }
  });

  it('reads no track name, field size or constant — only where the racers are', () => {
    // Two DIFFERENT field sizes occupying the SAME extent must produce the SAME zoom. If a racer
    // count had leaked into the derivation, these would differ.
    const proj = projectionForTrack(1600, 1000, false);
    const centre = { x: 500, y: 300 };
    const args = [proj.axisX, proj.axisY, FRAME_W, FRAME_H, 0.7];
    const few = fieldGuarantee(formation(4, 400, 200), centre, ...args);
    const many = fieldGuarantee(formation(100, 400, 200), centre, ...args);
    expect(many).toBeCloseTo(few, 10);
  });

  it('gives the widest shot the camera has when the formation cannot be framed at all', () => {
    // THE HONEST LIMIT, pinned rather than hidden. The open projection cannot go wider than 1/1.5 of
    // the world width, so a formation spread wider than the inner frame at that zoom is
    // UNSATISFIABLE — no camera setting keeps everyone in shot. The guarantee returns a ceiling
    // below `minCamZoom` and the projection's clamp wins, which is the correct outcome: the widest
    // shot available. What must NOT happen is a zoom outside the projection's range, or a claim in
    // a test that everyone is framed when they are not.
    const proj = projectionForTrack(4000, 900, true);
    const racers = formation(100, 2400, 400);
    const centre = { x: 500, y: 300 };
    const raw = fieldGuarantee(racers, centre, proj.axisX, proj.axisY, FRAME_W, FRAME_H, 0.7);
    expect(raw).toBeLessThan(proj.minCamZoom);
    expect(proj.clampCamZoom(raw)).toBeCloseTo(proj.minCamZoom, 10);
    // Measured on the shipped tracks in the block's report: no real start formation reaches this.
  });

  it('constrains nothing when there is nothing to keep in frame', () => {
    const proj = projectionForTrack(1600, 1000, false);
    const c = { x: 0, y: 0 };
    const args = [c, proj.axisX, proj.axisY, FRAME_W, FRAME_H, 0.7];
    expect(fieldGuarantee([], ...args)).toBe(Infinity);
    expect(fieldGuarantee([{ x: 0, y: 0 }], ...args)).toBe(Infinity);
    expect(fieldGuarantee(null, ...args)).toBe(Infinity);
  });
});

describe('the venue shot shows the whole track (START-CEREMONY-CAMERA-1)', () => {
  // What breaks if deleted: the opening could silently stop showing the track — the old countdown
  // opened on a corridor SETTING, which is a number in track widths and says nothing about whether
  // the track is in shot.
  // What goes unnoticed: an opening shot that looks fine because a plausible amount of scenery is
  // visible, while the far end of the circuit is off screen. Nobody can tell without the geometry.
  const venueFit = (proj, worldW, worldH) =>
    proj.clampCamZoom(Math.min(FRAME_W / (worldW * proj.axisX), FRAME_H / (worldH * proj.axisY)));

  const CLOSED = [
    [1600, 1000],
    [3072, 2048],
    [1280, 720],
    [900, 1600], // taller than wide — the axis that binds is the other one
  ];

  for (const [w, h] of CLOSED) {
    it(`shows the whole world on a closed ${w}x${h} track`, () => {
      const proj = projectionForTrack(w, h, false);
      const z = venueFit(proj, w, h);
      // The visible strip must cover the world on BOTH axes at once.
      expect(proj.visibleWorldW(z, FRAME_W)).toBeGreaterThanOrEqual(w - 1e-6);
      expect(proj.visibleWorldH(z, FRAME_H)).toBeGreaterThanOrEqual(h - 1e-6);
    });
  }

  it('is the projection’s widest shot on an open track, and that is a real limit', () => {
    // NOT a whole-world claim, deliberately. The open projection maps at OPEN_TRACK_BASE_ZOOM with
    // minCamZoom = worldFitX, so the widest it allows is 1/1.5 of the world width. This pins the
    // limit so that a later block widening it has to come here and say so.
    const proj = projectionForTrack(4000, 900, true);
    const z = venueFit(proj, 4000, 900);
    expect(z).toBeCloseTo(proj.minCamZoom, 10);
    expect(proj.visibleWorldW(z, FRAME_W)).toBeCloseTo(4000 / 1.5, 6);
  });
});

describe('the ceremony always completes before the gun (START-CEREMONY-CAMERA-1)', () => {
  // What breaks if deleted: the beats could outrun the countdown.
  // What goes unnoticed: the whole of the hold. It keeps the framing the ceremony ARRIVED at; if the
  // push were still travelling when the gun went, the held shot would be a half-finished one, and it
  // would look like a deliberate framing rather than like a bug.
  // WHAT BREAKS IF DELETED: the beats' independence. START-BOARD-2 removed the proportional
  // rescale; without this nothing would notice it coming back.
  // WHAT GOES UNNOTICED: raising one slider quietly shortening two others — which is exactly what
  // stopped anyone lengthening the push before this change.
  it('each beat is EXACTLY what it was asked for — no beat rescales another', () => {
    const s = ceremonySchedule(1400, 2000, 600, 0);
    expect(s.venueMs).toBe(1400);
    expect(s.pushMs).toBe(2000);
    expect(s.settledMs).toBe(600);
    // Ask for beats that would have overrun the old 4000 ms cap: they are still exact.
    const big = ceremonySchedule(3000, 3000, 3000, 0);
    expect(big.venueMs).toBe(3000);
    expect(big.pushMs).toBe(3000);
    expect(big.settledMs).toBe(3000);
    expect(big.totalMs).toBe(9000);
  });

  // WHAT BREAKS IF DELETED: the countdown's length. It is the SUM now, and nothing else defines it.
  // WHAT GOES UNNOTICED: a gun that fires before the ceremony finishes, or long after it.
  //
  // ── RE-DERIVED BY CEREMONY-OPENING-2 ────────────────────────────────────────────────────────────
  // IT ASSERTED: `boardHoldMs` was 0 when the board was shorter than the push and `board - push`
  // when it was longer — i.e. the board started during the travel and only held for what it still
  // needed afterwards. The equivalent statement under the new order is that the board contributes
  // ALL of itself, whatever the push is, because it no longer starts until the travel is over.
  //
  // ONE HALF OF THE OLD TEST HAS NO EQUIVALENT AND IS NOT SILENTLY DROPPED: "a small field is not
  // made longer" was a property OF the coupling, and removing the coupling removes it. A small field
  // IS now made longer, by exactly the board's length, and that is the deliberate price of giving
  // the track a beat of its own. It is asserted below rather than left unstated — the cost of a
  // change belongs in the suite just as much as its benefit.
  it('the countdown FOLLOWS the beats: totalMs is their sum, and the board contributes all of itself', () => {
    // A board SHORTER than the push no longer hides inside it: it costs its own 1500 ms.
    const small = ceremonySchedule(1400, 2000, 600, 1500);
    expect(small.boardMs).toBe(1500);
    expect(small.totalMs).toBe(1400 + 2000 + 1500 + 600);
    // A board LONGER than the push costs all of itself too — there is no difference-taking left.
    const big = ceremonySchedule(1400, 2000, 600, 8000);
    expect(big.boardMs).toBe(8000);
    expect(big.totalMs).toBe(1400 + 2000 + 8000 + 600);
    // THE PRICE, stated: the same small field under the old coupling totalled 4000 ms, because 1500
    // of board fitted inside 2000 of push and cost nothing. It is 5500 now.
    expect(small.totalMs).toBe(5500);
    // and the push itself is untouched in both — the camera's rhythm is never stretched
    expect(small.pushMs).toBe(2000);
    expect(big.pushMs).toBe(2000);
    // THE COUPLING IS GONE, asserted directly so it cannot come back by accident: the board's start
    // depends on the push's LENGTH (it follows it) but its DURATION does not.
    expect(ceremonySchedule(1400, 5000, 600, 1500).boardMs).toBe(1500);
    expect(ceremonySchedule(1400, 0, 600, 1500).boardMs).toBe(1500);
  });

  it('has arrived at the target by the gun, for every schedule', () => {
    // The gun is at `totalMs` now rather than at a countdown handed in from outside, and a board
    // that outlasts the push must not delay the ARRIVAL — only the departure.
    for (const [v, p, st, board] of [
      [1400, 2000, 600, 0],
      [3000, 3000, 3000, 0],
      [0, 4000, 0, 0],
      [4000, 0, 0, 0],
      [0, 0, 0, 0],
      [1400, 2000, 600, 8000],
    ]) {
      const s = ceremonySchedule(v, p, st, board);
      expect(ceremonyZoom(1, 5, s.totalMs, s, CEREMONY_EASINGS.easeInOutCubic)).toBeCloseTo(5, 9);
      // …and it has arrived by the END OF THE PUSH, not merely by the gun: the board hold that
      // follows is time the camera spends already there.
      expect(ceremonyZoom(1, 5, v + p, s, CEREMONY_EASINGS.easeInOutCubic)).toBeCloseTo(5, 9);
    }
  });

  it('holds the venue shot still through the first beat, then moves', () => {
    const s = ceremonySchedule(1400, 2000, 600, 0);
    expect(ceremonyAt(0, s).beat).toBe(CEREMONY_BEAT.VENUE);
    expect(ceremonyAt(1399, s).beat).toBe(CEREMONY_BEAT.VENUE);
    expect(ceremonyZoom(1, 5, 0, s, CEREMONY_EASINGS.linear)).toBe(1);
    expect(ceremonyZoom(1, 5, 1399, s, CEREMONY_EASINGS.linear)).toBe(1);
    expect(ceremonyAt(1401, s).beat).toBe(CEREMONY_BEAT.PUSH);
    expect(ceremonyAt(3500, s).beat).toBe(CEREMONY_BEAT.SETTLED);
  });

  it('never moves backwards during the push', () => {
    // A curve that overshot or dipped would show as the camera pulling back mid-ceremony.
    const s = ceremonySchedule(1400, 2000, 600, 0);
    for (const name of Object.keys(CEREMONY_EASINGS)) {
      let prev = -Infinity;
      for (let t = 0; t <= 4000; t += 25) {
        const z = ceremonyZoom(1, 5, t, s, CEREMONY_EASINGS[name]);
        expect(z).toBeGreaterThanOrEqual(prev - 1e-9);
        prev = z;
      }
    }
  });
});

describe('the settled beat is a control, not a remainder (CEREMONY-HANDOVER-1)', () => {
  // What breaks if deleted: the settled beat could quietly go back to being whatever was left of the
  // countdown — it was written that way once, and the shorter expression is the wrong one.
  // What goes unnoticed: the owner setting the slider and the picture not changing, or changing by
  // the wrong amount, because the other two beats had eaten the time. He watched the formation shot
  // last "VERY briefly" and had no control over it; a silent regression would put him back there
  // with a slider on screen that appears to do nothing.
  it('honours the slider rather than recomputing it from what is left', () => {
    // The proof that it is not a remainder: the venue and the push are held constant while the
    // COUNTDOWN grows. A remainder would grow with it; a control does not.
    const a = ceremonySchedule(1000, 1000, 500, 0);
    expect(a.settledMs).toBe(500);
    // The same beats in a countdown with room to spare. A remainder would swell to fill it; a
    // control does not move. This is the assertion that caught the first attempt, which handed the
    // slack to the settled beat and so made the slider a no-op exactly here.
    const b = ceremonySchedule(1000, 1000, 500, 0);
    expect(b.settledMs).toBe(500);
    expect(b.venueMs).toBe(1000);
    expect(b.pushMs).toBe(1000);
  });

  it('lengthens the stillness without moving the push, which is the point of the slider', () => {
    const short = ceremonySchedule(1400, 2000, 200, 0);
    const long = ceremonySchedule(1400, 2000, 1400, 0);
    expect(long.settledMs).toBeGreaterThan(short.settledMs);
    // The move itself is untouched — the owner tunes the pause without retuning the ceremony.
    expect(long.venueMs).toBe(short.venueMs);
    expect(long.pushMs).toBe(short.pushMs);
  });

  // REWRITTEN BY START-BOARD-2. This used to assert that the settled beat was SCALED with the other
  // two when the three overran the countdown — the behaviour that is gone. The intent it was
  // protecting survives and is stronger now: the settled beat is never sacrificed to make room,
  // because there is no longer any room to make.
  // WHAT BREAKS IF DELETED: the settled beat could quietly become a remainder again, which is the
  // defect CEREMONY-HANDOVER-1 removed.
  // WHAT GOES UNNOTICED: the gun firing while the board is still up.
  it('is never sacrificed to the others, however long they are', () => {
    const s = ceremonySchedule(2000, 2000, 2000, 0);
    expect(s.settledMs).toBe(2000);
    expect(s.totalMs).toBe(6000);
    // And with a board that outlasts everything, the settled beat is STILL exactly what was asked.
    const withBoard = ceremonySchedule(2000, 2000, 2000, 20000);
    expect(withBoard.settledMs).toBe(2000);
    // The board's window ends where the settled beat begins — the gun fires on a clean picture.
    expect(withBoard.boardEndMs).toBe(withBoard.totalMs - 2000);
  });

  it('still fills the countdown when the settled beat is set to zero', () => {
    const s = ceremonySchedule(1400, 2000, 0, 0);
    expect(s.venueMs).toBe(1400);
    expect(s.pushMs).toBe(2000);
    expect(s.settledMs).toBe(0); // asked for none, given none — the remaining 600 ms is simply still
  });
});

describe('the easing curves and their settings (START-CEREMONY-CAMERA-1)', () => {
  // What breaks if deleted: a curve could arrive somewhere other than the target.
  // What goes unnoticed: a push-in that stops at 0.98 leaves the formation permanently a little too
  // small, and the hold then keeps THAT — a wrong framing for the whole opening, off by an amount
  // no one would think to measure.
  it('every curve starts at 0 and arrives at exactly 1', () => {
    for (const [name, f] of Object.entries(CEREMONY_EASINGS)) {
      expect(f(0), name).toBeCloseTo(0, 12);
      expect(f(1), name).toBeCloseTo(1, 12);
    }
  });

  it('resolves an unknown curve name to the shipped one instead of throwing', () => {
    expect(ceremonyEasing('nonsense')).toBe(CEREMONY_EASINGS[DEFAULT_CEREMONY_EASING]);
    expect(ceremonyEasing(undefined)).toBe(CEREMONY_EASINGS[DEFAULT_CEREMONY_EASING]);
  });

  it('the ceremonial default begins slower than the curve it replaced', () => {
    // The reason the default changed: ease-OUT starts at full speed, which reads as the camera
    // catching up to something. This pins the distinction rather than trusting the description.
    expect(CEREMONY_EASINGS.easeInOutCubic(0.1)).toBeLessThan(CEREMONY_EASINGS.easeOutCubic(0.1));
    expect(CEREMONY_EASINGS.easeInOutQuint(0.1)).toBeLessThan(CEREMONY_EASINGS.easeInOutCubic(0.1));
  });

  it('the no-config fallbacks agree with the shipped defaults', () => {
    // The duplication guard. `cameraTimingComputation.js` deliberately keeps its own fallbacks for a
    // director built with no config; this asserts they have not drifted from defaults.js, the same
    // answer autoSpriteScale.js gives for CANVAS_H_REF. Without it the two are free to disagree and
    // nothing would say which one a given race used.
    const t = computeTimingFromConfig(null);
    expect(t.ceremonyVenueMs).toBe(DEFAULT_CAMERA_CONFIG.ceremonyVenueMs);
    expect(t.ceremonyPushMs).toBe(DEFAULT_CAMERA_CONFIG.ceremonyPushMs);
    expect(t.ceremonySettledMs).toBe(DEFAULT_CAMERA_CONFIG.ceremonySettledMs);
    expect(t.ceremonyEasing).toBe(DEFAULT_CAMERA_CONFIG.ceremonyEasing);
    // START-BOARD-2 added two more to the same duplication, so they join the same guard.
    expect(t.startBoardFloorMs).toBe(DEFAULT_CAMERA_CONFIG.startBoardFloorMs);
    expect(t.startBoardMsPerName).toBe(DEFAULT_CAMERA_CONFIG.startBoardMsPerName);
    // CEREMONY-OPENING-2 adds the brand card, and this test EARNED its place the moment the venue
    // default moved: it failed on the mirror in cameraTimingComputation.js that still said 1400
    // while defaults.js said 3000. That is the whole reason the duplication is allowed to exist.
    expect(t.ceremonyBrandMs).toBe(DEFAULT_CAMERA_CONFIG.ceremonyBrandMs);
  });
});

// ── THE BOARD'S OWN DURATION, AND WHAT THE CEREMONY COSTS AT EACH FIELD SIZE (START-BOARD-2) ────
describe('the board gets its own duration, and the countdown follows it', () => {
  // WHAT BREAKS IF DELETED: finding 1 — the owner could not find his racer in the time given, and
  // this is the arithmetic that fixes it. A floor that stopped scaling would look fine at 8 racers
  // and fail again at 100, which is exactly the field he reported on.
  // WHAT GOES UNNOTICED: nothing by eye at a small field — the defect only appears where the board
  // is longest, and that is the case nobody runs by hand.
  it('is max(floor, per-name × n), so it scales with the field and never below the floor', () => {
    expect(boardDurationMs(8, 3000, 80)).toBe(3000); // the floor binds
    expect(boardDurationMs(20, 3000, 80)).toBe(3000);
    expect(boardDurationMs(40, 3000, 80)).toBe(3200); // the per-name term takes over
    expect(boardDurationMs(100, 3000, 80)).toBe(8000);
    // and it is monotone — a bigger field never gets LESS reading time
    let prev = 0;
    for (const n of [1, 8, 20, 40, 70, 100, 200]) {
      const d = boardDurationMs(n, 3000, 80);
      expect(d).toBeGreaterThanOrEqual(prev);
      prev = d;
    }
  });

  // WHAT BREAKS IF DELETED: requirement 1(b) — the camera's rhythm. Stretching the push to cover a
  // hundred names is the obvious wrong fix, and it would look like a working board.
  // WHAT GOES UNNOTICED: a crawling push, which reads as the game being slow rather than as a
  // setting being wrong.
  it('the PUSH never stretches — the extra time is a HOLD after the camera has arrived', () => {
    for (const n of [8, 40, 100, 400]) {
      const s = ceremonySchedule(1400, 2000, 600, boardDurationMs(n, 3000, 80));
      expect(s.pushMs, `push at n=${n}`).toBe(2000);
      expect(s.venueMs).toBe(1400);
      expect(s.settledMs).toBe(600);
    }
  });

  // WHAT BREAKS IF DELETED: requirement 1(d), which is the one the owner would see instantly.
  // WHAT GOES UNNOTICED: the gun firing with the board still on screen.
  it('the board is GONE before the settled beat ends, at every field size', () => {
    for (const n of [1, 8, 40, 100, 400]) {
      const s = ceremonySchedule(1400, 2000, 600, boardDurationMs(n, 3000, 80));
      expect(boardAlphaAt(s.totalMs - 1, s), `alpha just before the gun at n=${n}`).toBe(0);
      expect(boardAlphaAt(s.boardEndMs, s)).toBe(0);
      // …and it was genuinely up before that, or the assertion above is vacuous.
      expect(boardAlphaAt((s.boardStartMs + s.boardEndMs) / 2, s)).toBe(1);
    }
  });

  // WHAT BREAKS IF DELETED: the fade would be a fraction of the window, so a ten-second board would
  // spend three seconds fading — reading time spent on nothing.
  // WHAT GOES UNNOTICED: it only shows at the largest field.
  it('the fade is a fixed time, not a fraction — a long board does not fade for longer', () => {
    const small = ceremonySchedule(1400, 2000, 600, 3000);
    const big = ceremonySchedule(1400, 2000, 600, 8000);
    // 60 ms into the window both are at the same point of the same fade.
    expect(boardAlphaAt(small.boardStartMs + 60, small)).toBeCloseTo(
      boardAlphaAt(big.boardStartMs + 60, big),
      9
    );
  });

  // ── RE-DERIVED BY CEREMONY-OPENING-2 ──────────────────────────────────────────────────────────
  // IT ASSERTED: START-BOARD-2's published totals — 5.0 s at 8 and 20, 5.2 s at 40, 10.0 s at 100 —
  // under the coupling, where the board's first 2000 ms were free because they ran under the push.
  // The equivalent statement is the same four field sizes with the board paid for in full, and the
  // CONTENT it was really pinning is untouched: which term of `max(floor, perName x n)` binds where.
  // The floor binds at 8 and 20 (identical totals), the per-name term binds from 40 up.
  // WHAT IT NOW CATCHES: the board's arithmetic silently changing — a floor that stopped scaling
  // would still look right at 8 and fail at 100, which is the field the owner reported on.
  it('the totals, with the board paid for in full: 7.0 s at 8 and 20, 7.2 s at 40, 12.0 s at 100', () => {
    const cfg = {
      ceremonyVenueMs: 1400,
      ceremonyPushMs: 2000,
      ceremonySettledMs: 600,
      startBoardFloorMs: 3000,
      startBoardMsPerName: 80,
      // EXPLICIT ZERO, and it is the point of CEREMONY-TRUTH-1. This test states the totals from
      // START-BOARD-2, which predates the digits beat; before that block's fallbacks became the
      // DEFAULTS, omitting the key here silently meant 0 and the test read as if it still described
      // the shipped ceremony. It describes a four-beat ceremony, and now it says so.
      countdownDigitsMs: 0,
    };
    expect(ceremonyTotalMs(cfg, 8)).toBe(7000);
    expect(ceremonyTotalMs(cfg, 20)).toBe(7000);
    expect(ceremonyTotalMs(cfg, 40)).toBe(7200);
    expect(ceremonyTotalMs(cfg, 100)).toBe(12000);
    // The shape, asserted rather than left to the numbers: the floor binds while the field is small
    // and the per-name term takes over, which is the only thing this arithmetic is for.
    expect(ceremonyTotalMs(cfg, 8)).toBe(ceremonyTotalMs(cfg, 20));
    expect(ceremonyTotalMs(cfg, 100) - ceremonyTotalMs(cfg, 40)).toBe(80 * 100 - 80 * 40);
  });

  // WHAT BREAKS IF DELETED: the sum. `countdownDigitsMs` is a WINDOW and the one thing it must never
  // become is a cap — that is the mistake `countdownDurationMs` made and START-BOARD-2 removed.
  // WHAT GOES UNNOTICED: the digits' window silently shortening the opening instead of extending it,
  // which would take the searching time back out of the ceremony that just gained it.
  it('the digits window ADDS to the total, and never caps a beat', () => {
    const base = { ceremonyVenueMs: 1400, ceremonyPushMs: 2000, ceremonySettledMs: 4000 };
    const cfg = { ...base, startBoardFloorMs: 6000, startBoardMsPerName: 120 };
    // CEREMONY-OPENING-2: 1400 + 2000 + 6000 + 4000 = 13400 without digits — the board's full 6000
    // now, where it used to contribute 6000 - 2000.
    expect(ceremonyTotalMs({ ...cfg, countdownDigitsMs: 0 }, 8)).toBe(13400);
    // …and exactly the window more with them. THE CLAIM IS THE DIFFERENCE, not the absolute.
    expect(ceremonyTotalMs({ ...cfg, countdownDigitsMs: 3000 }, 8)).toBe(16400);
    expect(
      ceremonyTotalMs({ ...cfg, countdownDigitsMs: 3000 }, 8) -
        ceremonyTotalMs({ ...cfg, countdownDigitsMs: 0 }, 8)
    ).toBe(3000);
    // At 100 the board's per-name term binds instead of the floor: 120 x 100 = 12000.
    expect(ceremonyTotalMs({ ...cfg, countdownDigitsMs: 3000 }, 100)).toBe(22400);
    // Every other beat is untouched by the window — no scaling factor is left in this file.
    // `boardHoldMs` is gone with the coupling; `boardMs` and `boardStartMs` are what must not move.
    const withDigits = ceremonySchedule(1400, 2000, 4000, 6000, 3000);
    const without = ceremonySchedule(1400, 2000, 4000, 6000, 0);
    for (const k of ['venueMs', 'pushMs', 'boardMs', 'settledMs', 'boardStartMs', 'boardEndMs']) {
      expect(withDigits[k], k).toBe(without[k]);
    }
  });

  // WHAT BREAKS IF DELETED: the defect the owner reported twice — no 3-2-1 at all.
  //
  // AND WHY IT IS SHAPED LIKE THIS. A test that only called `ceremonySchedule` with five arguments
  // passed while the bug was live, because the bug was not in the function: it was that the DIRECTOR
  // called it with four and the RENDERER with five. The consequence is the only thing worth
  // asserting — the total the director plans and the total the renderer derives are ONE number, and
  // the digit window inside it is not empty.
  it('the director and the renderer plan the SAME ceremony, with a real digit window in it', () => {
    const cfg = { ...DEFAULT_CAMERA_CONFIG };
    const cd = new CameraDirector({ worldWidth: 4000, worldHeight: 2000, config: cfg });
    for (const n of [8, 40, 100]) {
      const racers = Array.from({ length: n }, (_, i) => ({ index: i, x: i, y: 0, t: 0 }));
      const fromDirector = cd.ceremonySchedule(racers);
      // CEREMONY-OPENING-2: exactly how renderRaceFrame assembles it — which is now ONE CALL, and
      // that is the point. This used to write the five arguments out by hand, which is the same
      // shape as the defect the test exists for: two assemblies of one schedule, free to disagree.
      // Calling the shared assembler is the stronger check, because it is literally what ships.
      const fromRenderer = ceremonyScheduleFor(cfg, n, false);
      expect(fromDirector.totalMs, `total at n=${n}`).toBe(fromRenderer.totalMs);
      expect(fromDirector.countdownStartMs, `digit window opens at n=${n}`).toBe(
        fromRenderer.countdownStartMs
      );
      // THE CONSEQUENCE: the gun fires at totalMs, so the digits must have room BEFORE it.
      expect(fromDirector.totalMs - fromDirector.countdownStartMs, `window at n=${n}`).toBe(
        cfg.countdownDigitsMs
      );
      expect(fromDirector.totalMs - fromDirector.countdownStartMs).toBeGreaterThan(0);
      // THE NEW WAY THEY COULD DISAGREE (CEREMONY-OPENING-1): the brand beat. The director is TOLD
      // whether there is a brand; the renderer INFERS it from the card it was handed. If those two
      // answers ever came apart, the gun would fire at one time and the board would be scheduled for
      // another — the same class of defect as the missing digit window, in a new place.
      cd.setCeremonyBrandActive(true);
      const brandedDirector = cd.ceremonySchedule(racers);
      const brandedRenderer = ceremonyScheduleFor(cfg, n, true);
      expect(brandedDirector.totalMs, `branded total at n=${n}`).toBe(brandedRenderer.totalMs);
      expect(brandedDirector.boardStartMs).toBe(brandedRenderer.boardStartMs);
      // and the brand beat is worth exactly its setting, on top of the unbranded ceremony
      expect(brandedDirector.totalMs - fromDirector.totalMs).toBe(cfg.ceremonyBrandMs);
      cd.setCeremonyBrandActive(false);
    }
  });

  // WHAT BREAKS IF DELETED: the moment the owner asked for — formation in view, with no clock on it.
  // WHAT GOES UNNOTICED: the digits creeping back over the searching time, which is the exact state
  // this block was built to leave behind.
  it('the digits start only after the searching time, and the count still ends at the gun', () => {
    // CEREMONY-OPENING-2: the board now STARTS at 3400 (when the push ends) and runs its full 6000,
    // so it is gone at 9400 rather than 7400. The RELATIONS below are the content and are unchanged.
    const sch = ceremonySchedule(1400, 2000, 4000, 6000, 3000);
    expect(sch.boardStartMs).toBe(3400); // …only once the camera has arrived…
    expect(sch.boardEndMs).toBe(9400); // …the board is gone…
    expect(sch.countdownStartMs).toBe(13400); // …4000 ms before the first digit
    expect(sch.countdownStartMs - sch.boardEndMs).toBe(sch.settledMs);
    expect(sch.totalMs - sch.countdownStartMs).toBe(sch.countdownMs);
  });
});

// ============================================================================================
// CEREMONY-SKIP-1 — where a skip lands.
//
// The mechanism is one number: the caller moves `countdownStart` backwards so `elapsed` becomes
// what `nextBeatStart` returns. These tests pin WHERE that is, because everything else in the
// opening follows from it by construction and would follow a wrong answer just as faithfully.
// ============================================================================================
describe('CEREMONY-SKIP-1 — nextBeatStart', () => {
  // ceremonySchedule is POSITIONAL: (venueMs, pushMs, settledMs, boardMs, countdownMs, brandMs).
  const sched = ceremonySchedule(2000, 1000, 500, 1500, 3000, 1200);

  // IF DELETED: a skip could land anywhere and every consumer would follow it there without
  // complaint, because they all derive from the one clock. This is the only assertion that says the
  // landing is the START of the next beat rather than somewhere inside it.
  it('from inside each beat, it lands on the first millisecond of the next', () => {
    expect(nextBeatStart(0, sched)).toBe(sched.brandMs);
    expect(nextBeatStart(sched.brandMs - 1, sched)).toBe(sched.brandMs);
    expect(nextBeatStart(sched.brandMs, sched)).toBe(sched.venueEndMs);
    expect(nextBeatStart(sched.venueEndMs, sched)).toBe(sched.boardStartMs);
    expect(nextBeatStart(sched.boardStartMs, sched)).toBe(sched.boardEndMs);
  });

  // IF DELETED: the last click would land short of the gun and the owner's final skip would open a
  // beat instead of starting the race — the one moment the whole aid exists to reach.
  it('from the last beat it returns totalMs, so the final click fires the gun', () => {
    expect(nextBeatStart(sched.boardEndMs, sched)).toBe(sched.totalMs);
    expect(nextBeatStart(sched.totalMs - 1, sched)).toBe(sched.totalMs);
  });

  // IF DELETED: nothing would notice a skip landing INSIDE a zero-length beat, and the visible
  // result is a card on screen for one frame that must not exist at all. It cannot be caught by
  // reading the code either — the boundaries simply coincide.
  it('never lands inside a beat of length zero', () => {
    const noBrand = ceremonySchedule(2000, 1000, 500, 1500, 3000, 0);
    // With no brand the first boundary is the venue's end, not a zero-length brand boundary.
    expect(noBrand.brandMs).toBe(0);
    expect(nextBeatStart(0, noBrand)).toBe(noBrand.venueEndMs);
    const noBoard = ceremonySchedule(2000, 1000, 500, 0, 3000, 1200);
    expect(noBoard.boardMs).toBe(0);
    // From the push, the next beat with length is the settled one — the board is stepped over.
    expect(nextBeatStart(noBoard.venueEndMs, noBoard)).toBe(noBoard.boardStartMs);
    expect(nextBeatStart(noBoard.boardStartMs, noBoard)).toBe(noBoard.totalMs);
  });

  // IF DELETED: the two could drift apart and a skip would land on a boundary the renderer does not
  // agree is a boundary — which is the exact defect CEREMONY-TRUTH-1 was written about, a second
  // list of beats beside the first.
  it('agrees with ceremonyAt: the beat AT the returned elapsed is the next beat', () => {
    let e = 0;
    const seen = [];
    for (let i = 0; i < 8 && e < sched.totalMs; i++) {
      const beat = ceremonyAt(e, sched).beat;
      seen.push(beat);
      const next = nextBeatStart(e, sched);
      expect(next).toBeGreaterThan(e);
      if (next < sched.totalMs) expect(ceremonyAt(next, sched).beat).not.toBe(beat);
      e = next;
    }
    expect(seen[0]).toBe(CEREMONY_BEAT.BRAND);
    expect(seen).toContain(CEREMONY_BEAT.VENUE);
    expect(e).toBe(sched.totalMs);
  });

  // IF DELETED: a malformed schedule would return NaN and the caller would set countdownStart to
  // NaN, which stops the ceremony dead with no error anywhere.
  it('a nonsense elapsed or an absent schedule still returns a number', () => {
    expect(nextBeatStart(NaN, sched)).toBe(sched.brandMs);
    expect(nextBeatStart(-5, sched)).toBe(sched.brandMs);
    expect(Number.isFinite(nextBeatStart(0, {}))).toBe(true);
  });
});
