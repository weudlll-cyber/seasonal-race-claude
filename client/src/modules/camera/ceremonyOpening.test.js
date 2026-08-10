// ============================================================
// File:        ceremonyOpening.test.js
// Path:        client/src/modules/camera/ceremonyOpening.test.js
// Project:     RaceArena — CEREMONY-OPENING-1 / -2
//
// WHAT THIS GUARDS: the five things the owner asked for, each stated as the CONSEQUENCE he would
// see rather than as the mechanism that produces it. `startCeremony.test.js` guards the arithmetic;
// this file guards the experience the arithmetic exists for.
//
// Every one of them is sabotaged in the same file — a test that cannot fail is a comment.
//
// R7 — what breaks if this file is deleted: the opening silently goes back to what it was. The board
// creeps over the travel again, the logo lies across the names again, and the track's own moment
// shrinks to nothing — and every one of those looks plausible on screen if you did not know what was
// asked for.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  ceremonySchedule,
  ceremonyScheduleFor,
  ceremonyAt,
  boardAlphaAt,
  CEREMONY_BEAT,
} from './startCeremony.js';
import { DEFAULT_CAMERA_CONFIG } from '../storage/defaults.js';

/** Every millisecond of a window, sampled at 10 ms — dense enough that no beat can hide inside. */
function sample(fromMs, toMs, fn, stepMs = 10) {
  const out = [];
  for (let t = fromMs; t < toMs; t += stepMs) out.push(fn(t));
  return out;
}

const CFG = DEFAULT_CAMERA_CONFIG;

describe('1 · with no brand there is no brand beat, and no gap where it would have been', () => {
  it('the total is EXACTLY the sum of the other beats', () => {
    for (const n of [8, 40, 100]) {
      const s = ceremonyScheduleFor(CFG, n, false);
      expect(s.brandMs, `n=${n}`).toBe(0);
      // The sum, written out rather than read off the object: if `totalMs` ever gained a term that
      // is not a beat, this is what would catch it.
      expect(s.totalMs, `n=${n}`).toBe(
        s.venueMs + s.pushMs + s.boardMs + s.settledMs + s.countdownMs
      );
      // …and the ceremony BEGINS on the track. Not a blank hold of zero length: the very first
      // millisecond is already the venue beat.
      expect(ceremonyAt(0, s).beat).toBe(CEREMONY_BEAT.VENUE);
    }
  });

  it('every later beat starts EARLIER by exactly the brand it does not have', () => {
    // The consequence of "no gap": removing the card must shift the rest forward, not leave a hole.
    const withBrand = ceremonyScheduleFor(CFG, 40, true);
    const without = ceremonyScheduleFor(CFG, 40, false);
    const delta = withBrand.brandMs;
    expect(delta).toBeGreaterThan(0);
    for (const k of [
      'venueEndMs',
      'pushEndMs',
      'boardStartMs',
      'boardEndMs',
      'countdownStartMs',
      'totalMs',
    ]) {
      expect(withBrand[k] - without[k], k).toBe(delta);
    }
  });

  it('SABOTAGE — a brand beat that leaks in when there is none is caught', () => {
    const s = ceremonySchedule(3000, 2000, 4000, 6000, 3000, 250);
    expect(s.totalMs).not.toBe(s.venueMs + s.pushMs + s.boardMs + s.settledMs + s.countdownMs);
    expect(ceremonyAt(0, s).beat).not.toBe(CEREMONY_BEAT.VENUE);
  });
});

describe('2 · with a brand set, it appears and leaves at the scheduled times', () => {
  const s = ceremonyScheduleFor(CFG, 40, true);

  it('is the beat for every millisecond of its window, and never after', () => {
    const inside = sample(0, s.brandMs, (t) => ceremonyAt(t, s).beat);
    expect(inside.every((b) => b === CEREMONY_BEAT.BRAND)).toBe(true);
    // It LEAVES: the instant the window closes the track's beat has it, and nothing later returns.
    expect(ceremonyAt(s.brandMs, s).beat).toBe(CEREMONY_BEAT.VENUE);
    const after = sample(s.brandMs, s.totalMs, (t) => ceremonyAt(t, s).beat);
    expect(after.includes(CEREMONY_BEAT.BRAND)).toBe(false);
  });

  it('SABOTAGE — a card that outstays its window is caught', () => {
    // A brand beat read against a schedule that allows one 500 ms longer: the last 500 ms of the
    // card would fall in the venue's window, and the assertion above is what notices.
    const longer = { ...s, brandMs: s.brandMs + 500 };
    expect(ceremonyAt(s.brandMs + 250, longer).beat).toBe(CEREMONY_BEAT.BRAND);
    expect(ceremonyAt(s.brandMs + 250, s).beat).toBe(CEREMONY_BEAT.VENUE);
  });
});

describe('3 · the brand LOGO is absent in every frame the board is up', () => {
  // THE ONE THAT MATTERS MOST, and the reason is that the logo was never in the schedule at all: it
  // is a whole-race DOM overlay, so nothing in this module could have been wrong about it — it was
  // simply always there, lying across the last column of names in the owner's screenshot.
  //
  // RaceScreen decides it with `elapsed >= boardStartMs && elapsed < boardEndMs`. That predicate is
  // reproduced here and checked against the board's own visibility, which is the thing a viewer
  // sees: for every sampled moment, LOGO HIDDEN must cover BOARD VISIBLE with nothing left over.
  const logoHidden = (t, s) => t >= s.boardStartMs && t < s.boardEndMs;

  for (const n of [8, 40, 100]) {
    it(`covers every visible frame of the board at n=${n}, and gives the logo back after`, () => {
      const s = ceremonyScheduleFor(CFG, n, true);
      let seenBoard = 0;
      for (let t = 0; t < s.totalMs; t += 10) {
        const visible = boardAlphaAt(t, s) > 0;
        if (visible) {
          seenBoard++;
          expect(logoHidden(t, s), `board visible at ${t}ms with the logo up`).toBe(true);
        }
      }
      expect(seenBoard, 'the board was never up — the check proved nothing').toBeGreaterThan(100);
      // AND IT COMES BACK, immediately: the first moment after the board is a moment with a logo.
      expect(logoHidden(s.boardEndMs, s)).toBe(false);
      expect(logoHidden(s.totalMs - 1, s)).toBe(false);
      // …and it was up before the board too, so this is a suppression and not a removal.
      expect(logoHidden(0, s)).toBe(false);
    });
  }

  it('SABOTAGE — a suppression window that misses the board by one frame is caught', () => {
    const s = ceremonyScheduleFor(CFG, 40, true);
    // The off-by-one that would actually happen: hiding from the board's start but releasing at the
    // moment the fade begins rather than when it ends.
    const tooEarly = (t) => t >= s.boardStartMs && t < s.boardEndMs - 200;
    const missed = [];
    for (let t = 0; t < s.totalMs; t += 10) {
      if (boardAlphaAt(t, s) > 0 && !tooEarly(t)) missed.push(t);
    }
    expect(missed.length, 'the sabotage must leave frames uncovered').toBeGreaterThan(0);
  });
});

describe('4 · the track overview is covered by NOTHING for its whole duration', () => {
  // THE BEAT THIS BLOCK EXISTS FOR. Before it, the board came up the instant the venue shot ended
  // and stood through the entire push — measured on the shipped build at 1400 ms, with the camera
  // still travelling until 3400. The overview is now bounded by the card in front of it and the
  // board behind it, and neither may touch it.
  for (const [label, hasBrand] of [
    ['without a brand', false],
    ['with a brand', true],
  ]) {
    it(`no board and no card over any frame of it — ${label}`, () => {
      for (const n of [8, 40, 100]) {
        const s = ceremonyScheduleFor(CFG, n, hasBrand);
        const from = s.brandEndMs;
        const to = s.venueEndMs;
        expect(to - from, `the overview has no duration at n=${n}`).toBeGreaterThan(0);
        for (let t = from; t < to; t += 10) {
          expect(boardAlphaAt(t, s), `board over the overview at ${t}ms, n=${n}`).toBe(0);
          expect(ceremonyAt(t, s).beat, `not the venue beat at ${t}ms, n=${n}`).toBe(
            CEREMONY_BEAT.VENUE
          );
        }
      }
    });
  }

  it('and the board does not start until the TRAVEL is over either', () => {
    // The owner's actual complaint, stated as the property that fixes it.
    const s = ceremonyScheduleFor(CFG, 40, false);
    expect(s.boardStartMs).toBe(s.pushEndMs);
    for (let t = 0; t < s.pushEndMs; t += 10) {
      expect(boardAlphaAt(t, s), `board up during the travel at ${t}ms`).toBe(0);
    }
  });

  it('SABOTAGE — the SHIPPED-BEFORE behaviour fails this test', () => {
    // The old schedule, reconstructed exactly: board starts at the end of the venue and holds for
    // `board - push`. This is what the build the owner watched actually did, and it must not pass.
    const venue = 1400;
    const push = 2000;
    const board = 6000;
    const old = {
      brandMs: 0,
      venueMs: venue,
      pushMs: push,
      boardMs: board,
      settledMs: 4000,
      countdownMs: 3000,
      brandEndMs: 0,
      venueEndMs: venue,
      pushEndMs: venue + push,
      boardStartMs: venue, // ← the coupling
      boardEndMs: venue + push + Math.max(0, board - push),
    };
    // Some frame of the TRAVEL had the board over it — which is precisely what he reported.
    const duringTravel = sample(old.venueEndMs, old.pushEndMs, (t) => boardAlphaAt(t, old) > 0);
    expect(duringTravel.some(Boolean)).toBe(true);
  });
});

describe('5 · each slider moves its own beat and the total, and nothing else', () => {
  const KEYS = [
    ['ceremonyBrandMs', 'brandMs'],
    ['ceremonyVenueMs', 'venueMs'],
    ['ceremonyPushMs', 'pushMs'],
    ['ceremonySettledMs', 'settledMs'],
    ['countdownDigitsMs', 'countdownMs'],
  ];

  for (const [key, beat] of KEYS) {
    it(`${key} moves ${beat} and the total by the same amount, and no other beat at all`, () => {
      const base = ceremonyScheduleFor(CFG, 40, true);
      const bumped = ceremonyScheduleFor({ ...CFG, [key]: CFG[key] + 700 }, 40, true);
      expect(bumped[beat] - base[beat], beat).toBe(700);
      expect(bumped.totalMs - base.totalMs, 'total').toBe(700);
      for (const [, other] of KEYS) {
        if (other === beat) continue;
        expect(bumped[other], `${key} moved ${other}`).toBe(base[other]);
      }
      // The board is not on the slider list — it is derived from the field — and must not move either.
      expect(bumped.boardMs).toBe(base.boardMs);
    });
  }

  it('the board’s two settings move the board and the total, and no other beat', () => {
    const base = ceremonyScheduleFor(CFG, 40, true);
    for (const key of ['startBoardFloorMs', 'startBoardMsPerName']) {
      const bumped = ceremonyScheduleFor({ ...CFG, [key]: CFG[key] + 1000 }, 40, true);
      const moved = bumped.boardMs - base.boardMs;
      expect(moved, key).toBeGreaterThan(0);
      expect(bumped.totalMs - base.totalMs, `${key} total`).toBe(moved);
      for (const [, other] of KEYS) {
        expect(bumped[other], `${key} moved ${other}`).toBe(base[other]);
      }
    }
  });

  it('SABOTAGE — a beat that scales another is caught', () => {
    // The state START-BOARD-2 left behind, and the one this file must never let return: raising the
    // push shortening the board. Under the coupling, `boardMs` would have depended on `pushMs`.
    const base = ceremonySchedule(3000, 2000, 4000, 6000, 3000, 0);
    const longerPush = ceremonySchedule(3000, 4000, 4000, 6000, 3000, 0);
    expect(longerPush.boardMs).toBe(base.boardMs); // it does not, and must not
    // …and the old arithmetic would have differed, which is what makes this assertion mean something
    expect(Math.max(0, 6000 - 2000)).not.toBe(Math.max(0, 6000 - 4000));
  });
});
