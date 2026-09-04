// ============================================================
// item7Membership.test.js — ITEM7-MEMBERSHIP-1
//
// THE OWNER'S DECISION, 2026-09-04: a racer who has fallen back so far that he can no longer win
// does not have to be in the picture. Requirement 7 is unchanged in wording and in meaning; what
// changed is WHICH SET answers it.
//
//     MEMBER  =  survivor of the geometric loop  MINUS  every racer at contention weight 0
//
// WHY THIS FILE EXISTS AT ALL. Before it, NOTHING tested `_abreastContenders` — established by
// searching every tracked file for `_abreastContenders` and `abreastContenders`: 24 files, of which
// one is the director, two are the probe and the payload site, and every other is a document, a
// report or a diag script. Not one test. So the distinction this block turns on — the loop's
// survivors versus the loop's survivors PLUS a fallback pair — had no test that could notice it
// collapsing back into one thing.
//
// EACH TEST CARRIES ITS SABOTAGE, in the body next to the assertion it justifies, in the manner
// levelSet.test.js established: a test that has never been seen to fail proves nothing.
// ============================================================

import { describe, it, expect } from 'vitest';
import { CameraDirector } from './CameraDirector.js';
import { DEFAULT_CAMERA_CONFIG } from '../cameraConfig.js';

const WORLD = 4000;
const CANVAS_H = 720;
const ROAD = 300;
const BODY = 36;

const mkShape = () => ({
  isOpen: true,
  getPosition: (t, offset = 0) => ({
    x: Math.max(0, Math.min(1, t)) * WORLD,
    y: 360 + offset,
    angle: 0,
  }),
  getActualTrackWidth: () => ROAD,
});

/** A field carrying the geometry both rules need. `back` is world px behind the leader. */
const mkField = (followers = []) => {
  const leader = {
    index: 0,
    t: 0.98,
    x: 0.98 * WORLD,
    y: 360,
    physicalY: 0,
    pathLengthPx: WORLD,
    drawnBodyLengthPx: BODY,
    drawnBodyWidthPx: BODY,
  };
  const out = [leader];
  followers.forEach((f, i) => {
    const t = 0.98 - f.back / WORLD;
    out.push({
      index: i + 1,
      t,
      x: t * WORLD,
      y: 360 + f.lateral,
      physicalY: (f.lateral * 2) / ROAD,
      pathLengthPx: WORLD,
      drawnBodyLengthPx: BODY,
      drawnBodyWidthPx: BODY,
    });
  });
  return out;
};

const mkDirector = () =>
  new CameraDirector(WORLD, CANVAS_H, true, { ...DEFAULT_CAMERA_CONFIG }, 36, mkShape(), ROAD);

describe('ITEM7-MEMBERSHIP-1 — the loop answers who can win, the fallback answers who to frame', () => {
  // ★ THE TEST THE SABOTAGE MUST TRIP. Break the membership so the fallback leaks back in — that
  // is, read `_abreastContenders` where `_abreastSurvivors` is meant — and this goes red, because
  // the two return different arrays for exactly the field this block was opened for.
  it('WITH NOBODY LEVEL: the loop returns the leader ALONE, the framing set returns two', () => {
    const cd = mkDirector();
    // One follower, four body lengths back on a clear lane — dirt-oval seed 3's shape, where the
    // measured gap was 3.66 body lengths. He cannot win and the geometric rule says so.
    const field = mkField([{ back: BODY * 4, lateral: 0 }]);

    const survivors = cd._abreastSurvivors(field);
    expect(survivors.map((r) => r.index)).toEqual([0]);

    // The framing set is DIFFERENT, and deliberately so: the photo finish needs somebody to hold.
    const framed = cd._abreastContenders(field);
    expect(framed.map((r) => r.index)).toEqual([0, 1]);

    // THE SABOTAGE, stated as the property it breaks: if the membership ever read the framing set,
    // these two would be equal and item 7 would be back to requiring a racer who cannot win.
    expect(survivors.length).not.toBe(framed.length);
  });

  it('WITH A RACER GENUINELY LEVEL: both sets contain him — the loop is not simply "the leader"', () => {
    const cd = mkDirector();
    // Half a body length back AND on a free lane. The lane half matters: `lateralPx` is
    // `|physicalY| * ROAD / 2` and `contactWidth` is one body width, so a follower needs more than
    // BODY px of lateral offset or condition 2 blocks him for sitting in the leader's wheel tracks.
    // The first fixture written here used `lateral: 0` and this test failed — correctly, and the
    // rule was right; see the report's note on it.
    const field = mkField([{ back: BODY * 0.5, lateral: BODY * 2 }]);
    expect(cd._abreastSurvivors(field).map((r) => r.index)).toEqual([0, 1]);
    expect(cd._abreastContenders(field).map((r) => r.index)).toEqual([0, 1]);
    // SABOTAGE PAIR for the test above: a rule that always returned `[leader]` would pass that one
    // and fail this one, so neither test alone can be satisfied by a constant.
  });

  it('THE FALLBACK IS UNCHANGED — the framing set is never shorter than two on a real field', () => {
    const cd = mkDirector();
    for (const back of [BODY * 0.2, BODY * 2, BODY * 10, BODY * 40]) {
      const framed = cd._abreastContenders(mkField([{ back, lateral: 0 }]));
      expect(framed.length).toBe(2);
    }
    // Delete the fallback and this goes red at back = 2, 10 and 40 body lengths. It is a FRAMING
    // device and this block does not touch it.
  });

  it('THE MEMBERSHIP SUBTRACTS A RELEASED RACER, and the weight is what does it', () => {
    const cd = mkDirector();
    const field = mkField([{ back: BODY * 0.5, lateral: BODY * 2 }]);
    // Both are level and on free lanes, so both survive the loop.
    expect(cd._abreastSurvivors(field).map((r) => r.index)).toEqual([0, 1]);

    // Now the race decides him: the contention watch releases him and the ease runs out.
    cd._contentionWatch = true;
    cd._contentionOut.add(1);
    cd._contentionReleasedAt.set(1, 0);
    const after = cd._runInOpenMs + 1;

    expect(cd._contentionWeight(0, after)).toBe(1); // the leader is never released
    expect(cd._contentionWeight(1, after)).toBe(0);

    const member = cd
      ._abreastSurvivors(field)
      .filter((r) => cd._contentionWeight(r.index, after) > 0)
      .map((r) => r.index);
    expect(member).toEqual([0]);

    // SABOTAGE: drop the weight filter and `member` is [0, 1] — item 7 would then require a racer
    // the race has already decided, which is the half of this block the owner's decision is about.
  });

  it('MID-EASE HE IS STILL A MEMBER — the subtraction is at weight ZERO, not at release', () => {
    const cd = mkDirector();
    const field = mkField([{ back: BODY * 0.5, lateral: BODY * 2 }]);
    cd._contentionWatch = true;
    cd._contentionOut.add(1);
    cd._contentionReleasedAt.set(1, 0);
    const mid = cd._runInOpenMs / 2;

    const w = cd._contentionWeight(1, mid);
    expect(w).toBeGreaterThan(0);
    expect(w).toBeLessThan(1);

    const member = cd
      ._abreastSurvivors(field)
      .filter((r) => cd._contentionWeight(r.index, mid) > 0)
      .map((r) => r.index);
    expect(member).toEqual([0, 1]);

    // Delete the ease — release him to weight 0 in one step — and this goes red. The framing still
    // holds him while he eases out, so item 7 still requires him; the two stay in step.
  });

  // ★ MONOTONICITY, which is the claim that makes this change safe to ship: the membership is a
  // SUBSET of the framing set on every field, so item 7 can move FAIL -> PASS and never the reverse.
  it('THE MEMBERSHIP IS ALWAYS A SUBSET of what item 7 used to grade', () => {
    const cd = mkDirector();
    const backs = [0.1, 0.4, 0.9, 1.1, 2, 3.66, 8, 25];
    const laterals = [0, 20, 60, 140, -80];
    for (const b of backs) {
      for (const l of laterals) {
        const field = mkField([
          { back: BODY * b, lateral: l },
          { back: BODY * b * 2, lateral: -l },
        ]);
        const framed = new Set(cd._abreastContenders(field).map((r) => r.index));
        for (const r of cd._abreastSurvivors(field)) {
          // Every survivor is in the framing set. The leader is always admitted by the loop, so the
          // fallback's `slice(0, 2)` can only ADD to it, never replace it.
          expect(framed.has(r.index)).toBe(true);
        }
      }
    }
    // SABOTAGE: make the loop admit somebody the framing set excludes — for instance by dropping
    // condition 2 from the survivors only — and this goes red, and with it the guarantee that no
    // race can move PASS -> FAIL.
  });
});
