// LEADER-LATERAL-BUILD-1 — the leader's own lateral guarantee.
//
// The owner's rule: hold the corridor centreline; step aside only when the leader would otherwise be
// clipped, and only as far as needed; return as soon as he fits again.
//
// EVERY TEST HERE CARRIES A SABOTAGE ARM — the same input with the mechanism's own number turned off
// or inverted — because the defect this piece exists to fix was a rule that was PRESENT AND INERT.
// LEADER-LATERAL-MINIMAL-1 proposed adding the leader to `_applyLateralGuarantee`'s subject list and
// measurement showed that changes the answer on 0 of 2,019 frames. A test that only asserts the
// shipped path would have passed on that inert version too, so each one is paired with an arm that
// proves it can fail.
import { describe, it, expect } from 'vitest';
import { lateralAdmissibleForBody } from './framingRule.js';
import { CameraDirector, CAM_STATE } from './CameraDirector.js';

const FW = 1280;
const FH = 720;

/** A body pointing along +x, centred where asked, with the given half extents. */
const body = (cx, cy, halfLen = 60, halfWid = 20) => ({
  cx,
  cy,
  ux: 1,
  uy: 0,
  halfLen,
  halfWid,
});

describe('lateralAdmissibleForBody — the interval that keeps one drawn body whole', () => {
  it('admits zero when the body is already comfortably inside the frame', () => {
    // Shifting the pan target moves him on screen along -v; v here is straight down the y axis.
    const r = lateralAdmissibleForBody(body(640, 360), 0, 1, FW, FH);
    expect(r.lo).toBeLessThanOrEqual(0);
    expect(r.hi).toBeGreaterThanOrEqual(0);

    // SABOTAGE: an absurd margin must DEGRADE SAFELY, not produce a wild shift. It is clamped so the
    // box cannot invert, and what is left is a window too narrow for any body — an empty interval,
    // which the caller reads as "no sideways move fits him" and answers by leaving the pan alone.
    // The failure mode of a bad setting is therefore a leader who keeps clipping, never a camera
    // that swings; that direction is the one that matters.
    const sab = lateralAdmissibleForBody(body(640, 360), 0, 1, FW, FH, 10_000);
    expect(sab.lo).toBeGreaterThan(sab.hi);
    // ...and it is genuinely the margin doing that, not a broken body: at a sane margin it fits.
    const sane = lateralAdmissibleForBody(body(640, 360), 0, 1, FW, FH, 90);
    expect(sane.lo).toBeLessThanOrEqual(0);
    expect(sane.hi).toBeGreaterThanOrEqual(0);
  });

  it('EXCLUDES zero when the body hangs over an edge, and the nearest endpoint is the least move', () => {
    // His body spans y = 360 +/- 20 across, x = 1250 +/- 60 along -> reaches x = 1310, past 1280.
    // v = (1, 0): one world px of shift moves him one screen px along -x.
    const r = lateralAdmissibleForBody(body(1250, 360), 1, 0, FW, FH);
    expect(r.lo).toBeLessThanOrEqual(r.hi);
    // Zero is NOT admissible — he is clipped where he stands.
    expect(r.lo).toBeGreaterThan(0);
    // The least move is exactly the overhang: 1310 - 1280 = 30.
    expect(r.lo).toBeCloseTo(30, 6);

    // SABOTAGE: shrink the body to a point and the same position fits, so the interval must admit
    // zero. This is what proves the test is reading his BODY and not merely his centre — the half
    // sprite is the difference between the two answers.
    const sab = lateralAdmissibleForBody(body(1250, 360, 0, 0), 1, 0, FW, FH);
    expect(sab.lo).toBeLessThanOrEqual(0);
    expect(sab.hi).toBeGreaterThanOrEqual(0);
  });

  it('returns an EMPTY interval when no sideways move can fit him — the along-track residual', () => {
    // v is purely along +x while the body overhangs the TOP edge (y = 360 - 400 < 0). No amount of
    // x-shift changes his y, so nothing fits him. The caller must leave the pan alone here.
    const r = lateralAdmissibleForBody(body(640, -40, 60, 20), 1, 0, FW, FH);
    expect(r.lo).toBeGreaterThan(r.hi);

    // SABOTAGE: give v a y component and the very same body becomes reachable. That is precisely the
    // 500 world px chase the note on `lateralShiftToFit` records, and it is why the caller bounds
    // the step rather than trusting this interval to be modest.
    const sab = lateralAdmissibleForBody(body(640, -40, 60, 20), 0, 1, FW, FH);
    expect(sab.lo).toBeLessThanOrEqual(sab.hi);
  });

  it('the margin tightens the interval and can turn a fitting body into an engaging one', () => {
    // 100 px from the right edge with a 60 px half-length: fits bare, does not fit with a 90 margin.
    const bare = lateralAdmissibleForBody(body(1180, 360), 1, 0, FW, FH, 0);
    expect(bare.lo).toBeLessThanOrEqual(0);

    const withMargin = lateralAdmissibleForBody(body(1180, 360), 1, 0, FW, FH, 90);
    expect(withMargin.lo).toBeGreaterThan(0);
    // It asks for exactly the shortfall: 1240 - (1280 - 90) = 50.
    expect(withMargin.lo).toBeCloseTo(50, 6);

    // SABOTAGE: the margin is the whole difference between the two answers above. With it at zero
    // the interval must go back to admitting zero — if this arm ever passes while the shipped arm
    // also passes, the margin is not being read.
    const sab = lateralAdmissibleForBody(body(1180, 360), 1, 0, FW, FH, 0);
    expect(sab.lo).toBeLessThanOrEqual(0);
    expect(sab.lo).not.toBeCloseTo(withMargin.lo, 6);
  });

  it('is degenerate-safe: no geometry, no answer, and never a NaN shift', () => {
    for (const bad of [
      null,
      { cx: NaN, cy: 0, ux: 1, uy: 0, halfLen: 1, halfWid: 1 },
      { cx: 0, cy: 0, ux: 1, uy: 0, halfLen: Infinity, halfWid: 1 },
    ]) {
      const r = lateralAdmissibleForBody(bad, 1, 0, FW, FH);
      expect(r.lo).toBeGreaterThan(r.hi); // empty: the caller leaves the shift alone
    }
    // A zero-size frame is not a frame.
    const r = lateralAdmissibleForBody(body(0, 0), 1, 0, 0, 0);
    expect(r.lo).toBeGreaterThan(r.hi);
  });
});

describe("the clamp the director applies — the owner's rule, as arithmetic", () => {
  // The director takes the corridor's answer `d` and clamps it into the leader's interval, then
  // bounds how far that clamp may move it. That is three lines in `_applyLateralGuarantee`; these
  // assert the arithmetic those lines must produce, so a future edit that reorders them is caught.
  const applied = (d, lo, hi, cap) => {
    const want = Math.min(hi, Math.max(lo, d));
    const extra = Math.max(-cap, Math.min(cap, want - d));
    return d + extra;
  };

  it('does NOTHING when the corridor answer already keeps him whole', () => {
    // This is the case that must stay untouched — 90.27% of frames in the shipped measurement.
    expect(applied(12, -50, 50, 70)).toBe(12);
    expect(applied(0, -50, 50, 70)).toBe(0);
    expect(applied(-33, -50, 50, 70)).toBe(-33);

    // SABOTAGE: an interval that excludes the corridor's answer MUST move it. If this arm returned
    // `d` unchanged the rule would be the inert version this piece exists to replace.
    expect(applied(12, 30, 50, 70)).not.toBe(12);
  });

  it('moves the LEAST that works when he does not fit', () => {
    // d = 0 but he needs at least 30: the answer is exactly 30, not the middle of the interval and
    // not its far end.
    expect(applied(0, 30, 500, 70)).toBe(30);
    expect(applied(0, -500, -30, 70)).toBe(-30);

    // SABOTAGE: taking the far end instead would give 500. Assert we are not doing that.
    expect(applied(0, 30, 500, 70)).not.toBe(500);
  });

  it('BOUNDS the step, leaving him partly clipped rather than swinging the camera', () => {
    // He asks for 400; the bound is 70; he gets 70 and stays partly clipped. Deliberate: the note on
    // `lateralAdmissibleForBody` records the 500 world px chase an unbounded rectangle test produced.
    expect(applied(0, 400, 900, 70)).toBe(70);
    expect(applied(0, -900, -400, 70)).toBe(-70);

    // SABOTAGE: without the bound the same input swings the camera 400 px. This arm is the whole
    // reason the bound is a shipped number and not a comment.
    expect(applied(0, 400, 900, Infinity)).toBe(400);
  });

  it("bounds the EXTRA only — it never claws back the corridor's own shift", () => {
    // d = 200 from the corridor, leader wants 210: the extra is 10, well inside the bound, and the
    // result is 210 rather than anything bounded to 70. The bound is on this rule's contribution.
    expect(applied(200, 210, 400, 70)).toBe(210);
    // And when the leader is happy anywhere, a large corridor shift survives untouched.
    expect(applied(200, -1000, 1000, 70)).toBe(200);
  });
});

describe('the DIRECTOR itself — the wiring, not a replica of it', () => {
  // The block above asserts the arithmetic. These drive `_applyLateralGuarantee` on a real director,
  // because arithmetic tests cannot tell whether the director CALLS it — and "present but never
  // called" is exactly the failure this piece was written to repair.
  const WORLD = 4000;
  const TRACK_W = 300;
  // A dead-straight track along +x at y = WORLD/2. `getPosition(t, lateral)` is all the director
  // needs from a shape for this path.
  const shape = {
    getPosition: (t, lateral = 0) => ({ x: t * WORLD, y: WORLD / 2 + lateral }),
    getTangent: () => ({ x: 1, y: 0 }),
  };
  const make = () => {
    const cd = new CameraDirector(WORLD, WORLD, false, null, 40, shape, TRACK_W);
    cd.state = CAM_STATE.LEADER_ZOOM;
    return cd;
  };
  const frameSize = { width: 1280, height: 720 };
  // A racer on the straight, `lateral` world px off the centreline, with a drawn body sized to this
  // fixture's scale. It matters that it IS sized: at this zoom (effX 5.69, effY 3.20 on a 300 px
  // corridor) an over-large sprite is wider than the frame along the track, no sideways move fits it,
  // and the rule correctly declines — which looks exactly like the rule being inert. The first cut of
  // these tests made that mistake and the sabotage arm below is what caught it.
  const racer = (t, lateral, len = 60, wid = 24) => ({
    index: 0,
    t,
    x: t * WORLD,
    y: WORLD / 2 + lateral,
    drawnBodyLengthPx: len,
    drawnBodyWidthPx: wid,
  });
  const run = (cd, leader) => {
    const anchor = shape.getPosition(leader.t, 0);
    const subjects = { point: anchor, t: leader.t, pair: [null, null] };
    cd._applyLateralGuarantee(anchor, leader.t, subjects, cd._leaderZoom, frameSize, leader);
    return cd._lastLeaderLateralExtra;
  };

  it('A LEADER WHO FITS FROM THE CENTRELINE IS UNTOUCHED — the rule contributes exactly zero', () => {
    // Dead on the centreline, mid-track: nothing to fix, so the rule must add nothing at all.
    const cd = make();
    expect(run(cd, racer(0.5, 0))).toBe(0);

    // Still nothing a little off the line, while he remains comfortably whole.
    expect(run(make(), racer(0.5, 20))).toBe(0);

    // SABOTAGE: the same director, the same frame, a leader pushed far enough across that his body
    // leaves the margin — now it MUST contribute. Without this arm the assertions above would pass
    // just as happily on a rule that never fires, which is the state this piece found the tree in.
    const moved = run(make(), racer(0.5, 100));
    expect(Math.abs(moved)).toBeGreaterThan(0);
    // And it is the LEAST that works, not the bound and not the interval's far end.
    expect(Math.abs(moved)).toBeLessThan(make()._leaderLateralMaxPx);
  });

  it('steps aside toward the side he hangs off, and never further than the bound', () => {
    const cdPos = make();
    const ePos = run(cdPos, racer(0.5, 160));
    const cdNeg = make();
    const eNeg = run(cdNeg, racer(0.5, -160));
    // Opposite displacements produce opposite corrections — it follows him, it does not drift.
    expect(Math.sign(ePos)).toBe(-Math.sign(eNeg));
    // And neither exceeds the shipped bound.
    expect(Math.abs(ePos)).toBeLessThanOrEqual(cdPos._leaderLateralMaxPx + 1e-9);
    expect(Math.abs(eNeg)).toBeLessThanOrEqual(cdNeg._leaderLateralMaxPx + 1e-9);

    // SABOTAGE: with the bound at zero the rule can contribute nothing, whatever he does. If this
    // arm still moved the camera, the bound is not the thing limiting the step.
    const capped = new CameraDirector(WORLD, WORLD, false, null, 40, shape, TRACK_W);
    capped.state = CAM_STATE.LEADER_ZOOM;
    capped._leaderLateralMaxPx = 0;
    expect(run(capped, racer(0.5, 160))).toBe(0);
  });

  it('is scoped to LEADER_ZOOM — no anchor racer, no contribution', () => {
    // The call site passes the anchor racer only in LEADER_ZOOM; every other state passes null, and
    // this is what keeps LEAD_CHANGE and OVERVIEW on their current behaviour.
    const cd = make();
    const leader = racer(0.5, 160);
    const anchor = shape.getPosition(leader.t, 0);
    cd._applyLateralGuarantee(
      anchor,
      leader.t,
      { point: anchor, t: leader.t, pair: [null, null] },
      cd._leaderZoom,
      frameSize,
      null
    );
    expect(cd._lastLeaderLateralExtra).toBe(0);
  });
});
