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
} from './startCeremony.js';
import { fieldGuarantee } from './framingRule.js';
import { projectionForTrack, REFERENCE_CANVAS_W, REFERENCE_CANVAS_H } from './projection.js';
import { DEFAULT_CAMERA_CONFIG } from '../storage/defaults.js';
import { computeTimingFromConfig } from './cameraTimingComputation.js';

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
  it('fits inside the countdown when the three beats fill it exactly', () => {
    const s = ceremonySchedule(1400, 2000, 600, 4000);
    expect(s.venueMs).toBe(1400);
    expect(s.pushMs).toBe(2000);
    expect(s.settledMs).toBe(600);
    expect(s.scaled).toBe(false);
  });

  it('scales all three beats proportionally rather than truncating one', () => {
    // Truncation would cut the push off mid-move. Scaling keeps the RATIO the owner set, which is
    // what he was actually expressing.
    const s = ceremonySchedule(3000, 3000, 3000, 4000);
    expect(s.venueMs + s.pushMs + s.settledMs).toBeCloseTo(4000, 9);
    expect(s.venueMs / s.pushMs).toBeCloseTo(1, 9);
    expect(s.settledMs / s.pushMs).toBeCloseTo(1, 9);
    expect(s.scaled).toBe(true);
    const uneven = ceremonySchedule(1000, 3000, 1000, 2500);
    expect(uneven.venueMs + uneven.pushMs + uneven.settledMs).toBeCloseTo(2500, 9);
    expect(uneven.pushMs / uneven.venueMs).toBeCloseTo(3, 9);
  });

  it('has arrived at the target by the gun, for every schedule', () => {
    for (const [v, p, st, total] of [
      [1400, 2000, 600, 4000],
      [3000, 3000, 3000, 4000],
      [0, 4000, 0, 4000],
      [4000, 0, 0, 4000],
      [0, 0, 0, 4000],
    ]) {
      const s = ceremonySchedule(v, p, st, total);
      expect(ceremonyZoom(1, 5, total, s, CEREMONY_EASINGS.easeInOutCubic)).toBeCloseTo(5, 9);
    }
  });

  it('holds the venue shot still through the first beat, then moves', () => {
    const s = ceremonySchedule(1400, 2000, 600, 4000);
    expect(ceremonyAt(0, s).beat).toBe(CEREMONY_BEAT.VENUE);
    expect(ceremonyAt(1399, s).beat).toBe(CEREMONY_BEAT.VENUE);
    expect(ceremonyZoom(1, 5, 0, s, CEREMONY_EASINGS.linear)).toBe(1);
    expect(ceremonyZoom(1, 5, 1399, s, CEREMONY_EASINGS.linear)).toBe(1);
    expect(ceremonyAt(1401, s).beat).toBe(CEREMONY_BEAT.PUSH);
    expect(ceremonyAt(3500, s).beat).toBe(CEREMONY_BEAT.SETTLED);
  });

  it('never moves backwards during the push', () => {
    // A curve that overshot or dipped would show as the camera pulling back mid-ceremony.
    const s = ceremonySchedule(1400, 2000, 600, 4000);
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
    const a = ceremonySchedule(1000, 1000, 500, 2500);
    expect(a.settledMs).toBe(500);
    // The same beats in a countdown with room to spare. A remainder would swell to fill it; a
    // control does not move. This is the assertion that caught the first attempt, which handed the
    // slack to the settled beat and so made the slider a no-op exactly here.
    const b = ceremonySchedule(1000, 1000, 500, 6000);
    expect(b.settledMs).toBe(500);
    expect(b.venueMs).toBe(1000);
    expect(b.pushMs).toBe(1000);
  });

  it('lengthens the stillness without moving the push, which is the point of the slider', () => {
    const short = ceremonySchedule(1400, 2000, 200, 5000);
    const long = ceremonySchedule(1400, 2000, 1400, 5000);
    expect(long.settledMs).toBeGreaterThan(short.settledMs);
    // The move itself is untouched — the owner tunes the pause without retuning the ceremony.
    expect(long.venueMs).toBe(short.venueMs);
    expect(long.pushMs).toBe(short.pushMs);
  });

  it('is scaled with the others when the three overrun, not sacrificed to them', () => {
    // The failure this rules out: making room by zeroing the settled beat, which would restore the
    // old behaviour under a new name.
    const s = ceremonySchedule(2000, 2000, 2000, 3000);
    expect(s.settledMs).toBeGreaterThan(0);
    expect(s.settledMs).toBeCloseTo(1000, 9);
    expect(s.venueMs + s.pushMs + s.settledMs).toBeCloseTo(3000, 9);
  });

  it('still fills the countdown when the settled beat is set to zero', () => {
    const s = ceremonySchedule(1400, 2000, 0, 4000);
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
  });
});
