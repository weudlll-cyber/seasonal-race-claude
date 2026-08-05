// ============================================================
// File:        finishPhase.test.js
// Project:     RaceArena — FINISH-SEAM-1
//
// The point of the extraction, not an afterthought. Before this file the end of a race was five
// latches and three if-chains: you could observe the state that came out, but not WHY it came out,
// and not that the sequence had run in a legal order. Every branch of the ending is asserted here
// BY ITS REASON.
//
// L203 IS APPLIED THROUGHOUT: a switch is tested by proving its two positions DIFFER. Every gate,
// latch and threshold below is asserted in BOTH positions from the same base frame, so a test
// cannot pass with the thing it names disconnected.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  decideFinishPhase,
  evaluatePhotoFinishGate,
  finishTransitionBypasses,
  FINISH_ACTION,
  FINISH_REASON,
} from './finishPhase.js';

/** Mid-race, nothing finishing: the frame every test below perturbs by exactly one thing. */
const frame = (over = {}) => ({
  inPhotoFinish: false,
  inFinishMode: false,
  photoFinishEnterPending: false,
  finishMomentExpiry: null,
  ts: 10_000,
  finishedCount: 0,
  racerCount: 4,
  contendersHome: false,
  dramaDurationMs: 1500,
  leaderT: 3.5, // a close pair by default: 0.001 apart, well inside the 0.03 threshold
  secondT: 3.499,
  photoFinishEnabled: true,
  closeThresholdT: 0.03,
  ...over,
});

describe('decideFinishPhase — the sequence, branch by branch', () => {
  it('mid-race: no finish phase is running, so the normal priority chain gets the frame', () => {
    const d = decideFinishPhase(frame());
    expect(d.action).toBe(FINISH_ACTION.NONE);
    expect(d.reason).toBe(FINISH_REASON.NOT_FINISHING);
  });

  // ── THE MOMENT: the fork at the first crossing ──────────────────────────────────────────────

  it('first crossing with the top two together → the PHOTO FINISH', () => {
    const d = decideFinishPhase(frame({ finishedCount: 1 }));
    expect(d.action).toBe(FINISH_ACTION.ENTER_PHOTO_FINISH);
    expect(d.reason).toBe(FINISH_REASON.PHOTO_FINISH_FIRST_CROSSING);
  });

  it('first crossing with the top two APART → the DRAMA pulse (the fork, both positions)', () => {
    const d = decideFinishPhase(frame({ finishedCount: 1, secondT: 3.2 }));
    expect(d.action).toBe(FINISH_ACTION.ENTER_DRAMA);
    expect(d.reason).toBe(FINISH_REASON.DRAMA_FIRST_CROSSING);
  });

  it('the closeness THRESHOLD decides the fork — the same field forks both ways around it', () => {
    const field = { finishedCount: 1, leaderT: 3.5, secondT: 3.48 }; // 0.02 apart
    expect(decideFinishPhase(frame({ ...field, closeThresholdT: 0.03 })).action).toBe(
      FINISH_ACTION.ENTER_PHOTO_FINISH
    );
    expect(decideFinishPhase(frame({ ...field, closeThresholdT: 0.01 })).action).toBe(
      FINISH_ACTION.ENTER_DRAMA
    );
  });

  it('photoFinishEnabled OFF sends the SAME close finish to the drama instead', () => {
    const f = { finishedCount: 1 };
    expect(decideFinishPhase(frame({ ...f, photoFinishEnabled: true })).action).toBe(
      FINISH_ACTION.ENTER_PHOTO_FINISH
    );
    expect(decideFinishPhase(frame({ ...f, photoFinishEnabled: false })).action).toBe(
      FINISH_ACTION.ENTER_DRAMA
    );
  });

  it('a field of one cannot be a photo finish — it takes the drama', () => {
    const d = decideFinishPhase(frame({ finishedCount: 1, racerCount: 1, secondT: undefined }));
    expect(d.action).toBe(FINISH_ACTION.ENTER_DRAMA);
  });

  // ── THE DRAMA WINDOW: it holds, and it ENDS ─────────────────────────────────────────────────

  it('inside the drama window: holds, and says it is the drama holding', () => {
    const d = decideFinishPhase(
      frame({ finishedCount: 1, finishMomentExpiry: 11_000, ts: 10_500 })
    );
    expect(d.action).toBe(FINISH_ACTION.HOLD);
    expect(d.reason).toBe(FINISH_REASON.DRAMA_HOLDS);
  });

  it('the drama window ENDS at its expiry — one millisecond decides it', () => {
    const inWindow = decideFinishPhase(
      frame({ finishedCount: 1, finishMomentExpiry: 11_000, ts: 10_999 })
    );
    const atExpiry = decideFinishPhase(
      frame({ finishedCount: 1, finishMomentExpiry: 11_000, ts: 11_000 })
    );
    expect(inWindow.reason).toBe(FINISH_REASON.DRAMA_HOLDS);
    expect(atExpiry.action).toBe(FINISH_ACTION.END_DRAMA);
    expect(atExpiry.reason).toBe(FINISH_REASON.DRAMA_EXPIRED);
  });

  it('the expiry latch is what makes the fork a ONE-SHOT: once set, the fork is never asked again', () => {
    // Same close field, same finishedCount — only the expiry latch differs. With it null the fork
    // fires; with it set the frame can only hold or end. Nothing re-enters.
    expect(decideFinishPhase(frame({ finishedCount: 1, finishMomentExpiry: null })).action).toBe(
      FINISH_ACTION.ENTER_PHOTO_FINISH
    );
    expect(
      decideFinishPhase(frame({ finishedCount: 1, finishMomentExpiry: 11_000, ts: 10_500 })).action
    ).toBe(FINISH_ACTION.HOLD);
  });

  // ── THE PHOTO FINISH: it owns the state, and ends on crossings only ─────────────────────────

  it('while the photo finish holds, NO other transition may fire', () => {
    const d = decideFinishPhase(frame({ inPhotoFinish: true, finishedCount: 1 }));
    expect(d.action).toBe(FINISH_ACTION.HOLD);
    expect(d.reason).toBe(FINISH_REASON.PHOTO_FINISH_HOLDS);
  });

  it('the photo finish ends when THE CONTENDERS are home — not when two racers have crossed', () => {
    // The distinction is not academic: measured on all nine finishing tracks these differ by 6–57
    // frames, and the second racer across is usually neither of the pair. Both positions asserted.
    const twoCrossedButNotThePair = frame({
      inPhotoFinish: true,
      finishedCount: 2,
      contendersHome: false,
    });
    expect(decideFinishPhase(twoCrossedButNotThePair).action).toBe(FINISH_ACTION.HOLD);

    const pairHome = frame({ inPhotoFinish: true, finishedCount: 2, contendersHome: true });
    expect(decideFinishPhase(pairHome).reason).toBe(FINISH_REASON.PHOTO_FINISH_PAUSE);
  });

  it('the safety net: everybody home ends it even if a contender never arrives', () => {
    const d = decideFinishPhase(
      frame({ inPhotoFinish: true, finishedCount: 1, racerCount: 1, contendersHome: false })
    );
    expect(d.action).toBe(FINISH_ACTION.PAUSE_AFTER_PHOTO_FINISH);
  });

  it('THE PAUSE runs on the photo-finish path, on the same dial as the drama pulse', () => {
    const d = decideFinishPhase(
      frame({ inPhotoFinish: true, finishedCount: 2, contendersHome: true })
    );
    expect(d.action).toBe(FINISH_ACTION.PAUSE_AFTER_PHOTO_FINISH);
    expect(d.reason).toBe(FINISH_REASON.PHOTO_FINISH_PAUSE);
  });

  it('there is NO wall-clock cap — an arbitrarily late ts still holds the shot', () => {
    const d = decideFinishPhase(frame({ inPhotoFinish: true, finishedCount: 1, ts: 9_999_999 }));
    expect(d.action).toBe(FINISH_ACTION.HOLD);
  });

  // ── THE PRE-LINE DOOR ───────────────────────────────────────────────────────────────────────

  it('a pending pre-line entry is taken, and says which door it came through', () => {
    const d = decideFinishPhase(frame({ photoFinishEnterPending: true }));
    expect(d.action).toBe(FINISH_ACTION.ENTER_PHOTO_FINISH);
    expect(d.reason).toBe(FINISH_REASON.PHOTO_FINISH_PRE_LINE);
  });

  it('the pending flag is the whole difference — without it the same frame does nothing', () => {
    expect(decideFinishPhase(frame({ photoFinishEnterPending: false })).action).toBe(
      FINISH_ACTION.NONE
    );
    expect(decideFinishPhase(frame({ photoFinishEnterPending: true })).action).toBe(
      FINISH_ACTION.ENTER_PHOTO_FINISH
    );
  });

  // ── THE AFTERMATH ───────────────────────────────────────────────────────────────────────────

  it('FINISH_OVERVIEW is absolute: once in finish mode, nothing else is chosen', () => {
    const d = decideFinishPhase(frame({ finishedCount: 3, inFinishMode: true }));
    expect(d.action).toBe(FINISH_ACTION.HOLD);
    expect(d.reason).toBe(FINISH_REASON.FINISH_MODE_LOCKED);
  });

  it('the lock is the difference — the same frame without it starts a finish shot', () => {
    expect(decideFinishPhase(frame({ finishedCount: 3, inFinishMode: false })).action).toBe(
      FINISH_ACTION.ENTER_PHOTO_FINISH
    );
    expect(decideFinishPhase(frame({ finishedCount: 3, inFinishMode: true })).action).toBe(
      FINISH_ACTION.HOLD
    );
  });
});

describe('decideFinishPhase — precedence, and the orders that must stay impossible', () => {
  it('the photo-finish guard outranks the crossing block — a pre-line shot survives the crossing', () => {
    // This hoist is the whole reason a drama and a photo finish can never both run in one race:
    // with finishedCount 1 and no expiry set, the crossing block WOULD start a drama, and does not.
    const held = decideFinishPhase(frame({ inPhotoFinish: true, finishedCount: 1 }));
    expect(held.action).toBe(FINISH_ACTION.HOLD);
    const withoutTheShot = decideFinishPhase(frame({ inPhotoFinish: false, finishedCount: 1 }));
    expect(withoutTheShot.action).not.toBe(FINISH_ACTION.HOLD);
  });

  it('IMPOSSIBLE ORDER: a drama can never start while the photo finish holds', () => {
    // Every combination of ts and expiry that would otherwise start or end a drama, while the shot
    // is up. None of them may produce a drama action.
    for (const finishedCount of [0, 1]) {
      for (const finishMomentExpiry of [null, 9_000, 11_000]) {
        for (const ts of [9_500, 10_000, 12_000]) {
          const d = decideFinishPhase(
            frame({ inPhotoFinish: true, finishedCount, finishMomentExpiry, ts })
          );
          expect(d.action).not.toBe(FINISH_ACTION.ENTER_DRAMA);
          expect(d.action).not.toBe(FINISH_ACTION.END_DRAMA);
        }
      }
    }
  });

  it('IMPOSSIBLE ORDER: the pre-line door is unreachable once anybody has crossed', () => {
    // This is what makes the pending flag provably consumed on the frame it is set: the gate that
    // sets it requires finishedCount === 0, and block 2 returns before block 3 for every other value.
    for (const finishedCount of [1, 2, 4]) {
      const d = decideFinishPhase(frame({ photoFinishEnterPending: true, finishedCount }));
      expect(d.reason).not.toBe(FINISH_REASON.PHOTO_FINISH_PRE_LINE);
    }
    expect(
      decideFinishPhase(frame({ photoFinishEnterPending: true, finishedCount: 0 })).reason
    ).toBe(FINISH_REASON.PHOTO_FINISH_PRE_LINE);
  });

  it('IMPOSSIBLE ORDER: the finish-mode lock outranks a pending pre-line entry', () => {
    // Only reachable through the crossing block, which is where the lock lives — so the pending
    // flag can never resurrect the shot after FINISH_OVERVIEW has begun.
    const d = decideFinishPhase(
      frame({ inFinishMode: true, finishedCount: 2, photoFinishEnterPending: true })
    );
    expect(d.reason).toBe(FINISH_REASON.FINISH_MODE_LOCKED);
  });

  it('every branch carries a dev-console sentence, and HOLD/NONE fall back to the reason itself', () => {
    const withText = [
      frame({ finishedCount: 1 }),
      frame({ finishedCount: 1, secondT: 3.2 }),
      frame({ inPhotoFinish: true, finishedCount: 2, contendersHome: true }),
      frame({ inPhotoFinish: true, contendersHome: true, dramaDurationMs: 0 }),
      frame({ finishedCount: 1, secondT: 3.2, dramaDurationMs: 0 }),
      frame({ finishedCount: 1, finishMomentExpiry: 11_000, ts: 11_000 }),
      frame({ photoFinishEnterPending: true }),
    ];
    for (const f of withText) {
      const d = decideFinishPhase(f);
      expect(typeof d.text).toBe('string');
      expect(d.text.length).toBeGreaterThan(0);
      expect(d.text).not.toBe(d.reason); // a real sentence, not the slug
    }
    expect(decideFinishPhase(frame()).text).toBe(FINISH_REASON.NOT_FINISHING);
  });

  it('A PAUSE OF ZERO means NO pause on BOTH paths — not a one-frame one', () => {
    // The owner asked for 0 specifically so he can find his own value by playing. A one-frame pulse
    // would still be a state entry, a hold and a hand-off, i.e. a visible hitch — so zero has to
    // mean the aftermath begins on the same frame, on each path independently.
    const pfZero = decideFinishPhase(
      frame({ inPhotoFinish: true, finishedCount: 2, contendersHome: true, dramaDurationMs: 0 })
    );
    expect(pfZero.action).toBe(FINISH_ACTION.END_PHOTO_FINISH); // straight to the aftermath
    expect(pfZero.action).not.toBe(FINISH_ACTION.PAUSE_AFTER_PHOTO_FINISH);

    const dramaZero = decideFinishPhase(
      frame({ finishedCount: 1, secondT: 3.2, dramaDurationMs: 0 })
    );
    expect(dramaZero.action).toBe(FINISH_ACTION.END_DRAMA); // never enters the pulse at all
    expect(dramaZero.reason).toBe(FINISH_REASON.PAUSE_DISABLED);
  });

  it('...and any NON-ZERO value takes the pause, on both paths (L203 pair for the above)', () => {
    for (const ms of [1, 100, 1500, 5000]) {
      expect(
        decideFinishPhase(
          frame({
            inPhotoFinish: true,
            finishedCount: 2,
            contendersHome: true,
            dramaDurationMs: ms,
          })
        ).action
      ).toBe(FINISH_ACTION.PAUSE_AFTER_PHOTO_FINISH);
      expect(
        decideFinishPhase(frame({ finishedCount: 1, secondT: 3.2, dramaDurationMs: ms })).action
      ).toBe(FINISH_ACTION.ENTER_DRAMA);
    }
  });

  it('is pure — the same inputs give the same answer and nothing is mutated', () => {
    const f = frame({ finishedCount: 1 });
    const snapshot = JSON.stringify(f);
    expect(decideFinishPhase(f)).toEqual(decideFinishPhase(f));
    expect(JSON.stringify(f)).toBe(snapshot);
  });
});

describe('finishTransitionBypasses — the three ways the finish reaches the transition decision', () => {
  const bp = (over = {}) => ({
    inFinishDrama: false,
    inPhotoFinish: false,
    inFinishMode: false,
    finishMomentExpiry: null,
    ts: 10_000,
    finishedCount: 0,
    racerCount: 4,
    ...over,
  });

  it('nothing fires mid-race', () => {
    expect(finishTransitionBypasses(bp())).toEqual({
      finishDramaExpired: false,
      forceFinishDrama: false,
      photoFinishEndReady: false,
    });
  });

  it('finishDramaExpired needs BOTH the drama flag and the elapsed window', () => {
    expect(
      finishTransitionBypasses(bp({ inFinishDrama: true, finishMomentExpiry: 9_000 }))
        .finishDramaExpired
    ).toBe(true);
    expect(
      finishTransitionBypasses(bp({ inFinishDrama: true, finishMomentExpiry: 11_000 }))
        .finishDramaExpired
    ).toBe(false);
    expect(
      finishTransitionBypasses(bp({ inFinishDrama: false, finishMomentExpiry: 9_000 }))
        .finishDramaExpired
    ).toBe(false);
  });

  it('forceFinishDrama fires on the first crossing and is switched off by the finish-mode lock', () => {
    expect(finishTransitionBypasses(bp({ finishedCount: 1 })).forceFinishDrama).toBe(true);
    expect(
      finishTransitionBypasses(bp({ finishedCount: 1, inFinishMode: true })).forceFinishDrama
    ).toBe(false);
    expect(
      finishTransitionBypasses(bp({ finishedCount: 1, finishMomentExpiry: 11_000 }))
        .forceFinishDrama
    ).toBe(false);
  });

  it('THE OVERLAP, pinned: forceFinishDrama is ALSO true throughout a photo finish', () => {
    // Between the 1st and 2nd crossing of a photo finish there is no drama and no expiry, so the
    // "force the drama" bypass is true every frame. It is harmless — decideFinishPhase then picks
    // the photo-finish branch — but it means the recorded transition reason is not a reliable
    // label here. Pinned so a change to the sequence has to face it deliberately.
    const b = finishTransitionBypasses(bp({ inPhotoFinish: true, finishedCount: 1 }));
    expect(b.forceFinishDrama).toBe(true);
    expect(b.photoFinishEndReady).toBe(false);
  });

  it('photoFinishEndReady mirrors the shot’s own end condition, in both positions', () => {
    expect(
      finishTransitionBypasses(bp({ inPhotoFinish: true, finishedCount: 2 })).photoFinishEndReady
    ).toBe(true);
    expect(
      finishTransitionBypasses(bp({ inPhotoFinish: true, finishedCount: 1 })).photoFinishEndReady
    ).toBe(false);
    expect(
      finishTransitionBypasses(bp({ inPhotoFinish: true, finishedCount: 1, racerCount: 1 }))
        .photoFinishEndReady
    ).toBe(true);
    // ...and it needs the shot to be up at all.
    expect(
      finishTransitionBypasses(bp({ inPhotoFinish: false, finishedCount: 2 })).photoFinishEndReady
    ).toBe(false);
  });
});

// ── The APPROACH gate. Moved here from transitionDecision.test.js by FINISH-SEAM-1, unchanged:
//    the gate is a finish question, not a transition question, and it now lives with the rest of
//    the sequence it belongs to.
describe('evaluatePhotoFinishGate — the predicate, with the latches left to the caller', () => {
  const base = (over = {}) => ({
    gateDone: false,
    enabled: true,
    finishedCount: 0,
    leaderProgress: 0.9,
    leadProgressThreshold: 0.85,
    racers: [{ t: 10.0 }, { t: 10.001 }],
    closeThresholdT: 0.01,
    ...over,
  });

  it('does not evaluate once the gate is done — it is a one-shot', () => {
    expect(evaluatePhotoFinishGate(base({ gateDone: true }))).toEqual({
      evaluated: false,
      close: false,
    });
  });

  it('does not evaluate when disabled', () => {
    expect(evaluatePhotoFinishGate(base({ enabled: false })).evaluated).toBe(false);
  });

  it('does not evaluate once anybody has finished', () => {
    expect(evaluatePhotoFinishGate(base({ finishedCount: 1 })).evaluated).toBe(false);
  });

  it('does not evaluate before the leader reaches the progress threshold', () => {
    expect(evaluatePhotoFinishGate(base({ leaderProgress: 0.84 })).evaluated).toBe(false);
  });

  it('evaluates AND reports close when the top two are within the threshold', () => {
    expect(evaluatePhotoFinishGate(base())).toEqual({ evaluated: true, close: true });
  });

  it('evaluates but reports NOT close when the top two are apart — the caller still latches done', () => {
    // Half a lap apart: tFrac 0.0 vs 0.5, the maximum possible shortest-arc separation.
    const r = evaluatePhotoFinishGate(base({ racers: [{ t: 10.0 }, { t: 9.5 }] }));
    expect(r).toEqual({ evaluated: true, close: false });
  });

  it('measures TRACK POSITION, not race distance — exactly one lap apart reads as CLOSE', () => {
    // PRE-EXISTING behaviour, pinned here rather than changed: the gate uses shortestArcDeltaT,
    // which compares fractional t, so a leader a whole lap ahead sits at the same point on the
    // track and the gate calls it a photo finish. FINISH-SEAM-1 did not introduce it and does not
    // repair it — the helper is the same one BATTLE uses, and changing it is a behaviour change
    // outside a behaviour-free stage. Recorded in the report's noticed-but-left list.
    const r = evaluatePhotoFinishGate(base({ racers: [{ t: 10.0 }, { t: 9.0 }] }));
    expect(r).toEqual({ evaluated: true, close: true });
  });

  it('a field of one cannot be close', () => {
    expect(evaluatePhotoFinishGate(base({ racers: [{ t: 10 }] }))).toEqual({
      evaluated: true,
      close: false,
    });
  });

  it('close implies evaluated — the property that makes the caller mapping exact', () => {
    const cases = [
      base(),
      base({ gateDone: true }),
      base({ enabled: false }),
      base({ finishedCount: 3 }),
      base({ leaderProgress: 0 }),
      base({ racers: [{ t: 10 }, { t: 1 }] }),
    ];
    for (const c of cases) {
      const r = evaluatePhotoFinishGate(c);
      if (r.close) expect(r.evaluated).toBe(true);
    }
  });

  it('ranks by t rather than trusting array order', () => {
    const r = evaluatePhotoFinishGate(base({ racers: [{ t: 5.0 }, { t: 10.0 }, { t: 10.001 }] }));
    expect(r).toEqual({ evaluated: true, close: true });
  });

  it('does not mutate the caller’s racer array', () => {
    const racers = [{ t: 1 }, { t: 9 }, { t: 5 }];
    const before = racers.map((r) => r.t);
    evaluatePhotoFinishGate(base({ racers }));
    expect(racers.map((r) => r.t)).toEqual(before);
  });
});

// ── The SAME closeness question, asked at the two doors ──────────────────────────────────────
// The pre-line gate and the first-crossing fork both ask "are the top two within
// photoFinishCloseThresholdT of each other", through the same helper. That agreement is behaviour
// — if the two doors ever disagreed, whether you got a photo finish would depend on which one the
// race happened to reach first.
describe('the two doors ask the same closeness question', () => {
  const cases = [
    { racers: [{ t: 10.0 }, { t: 10.001 }], close: true },
    { racers: [{ t: 10.0 }, { t: 10.02 }], close: true },
    { racers: [{ t: 10.0 }, { t: 10.05 }], close: false },
    { racers: [{ t: 10.0 }, { t: 9.5 }], close: false },
  ];

  for (const c of cases) {
    it(`gap ${Math.abs(c.racers[0].t - c.racers[1].t).toFixed(3)} → close=${c.close} at BOTH doors`, () => {
      const gate = evaluatePhotoFinishGate({
        gateDone: false,
        enabled: true,
        finishedCount: 0,
        leaderProgress: 0.99,
        leadProgressThreshold: 0.97,
        racers: c.racers,
        closeThresholdT: 0.03,
      });
      const ordered = [...c.racers].sort((a, b) => b.t - a.t);
      const crossing = decideFinishPhase(
        frame({
          finishedCount: 1,
          racerCount: ordered.length,
          leaderT: ordered[0].t,
          secondT: ordered[1].t,
          closeThresholdT: 0.03,
        })
      );
      expect(gate.close).toBe(c.close);
      expect(crossing.action).toBe(
        c.close ? FINISH_ACTION.ENTER_PHOTO_FINISH : FINISH_ACTION.ENTER_DRAMA
      );
    });
  }
});
