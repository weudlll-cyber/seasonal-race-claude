// ============================================================
// levelSet.test.js — RUNIN-LEVEL-SET-BUILD-1
//
// THE OWNER'S RULE, 2026-08-24: any racer at most ONE RACER LENGTH behind the leader ALONG THE TRACK
// must be in frame, however far to the side he is running.
//
// EVERY TEST HERE CARRIES ITS SABOTAGE. A test that has never been seen to fail proves nothing, so
// each one either runs the same scenario with the mechanism stubbed out and asserts the opposite, or
// asserts a property that the stub demonstrably breaks. The sabotage is in the test body, next to
// the assertion it justifies, rather than described in a comment.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { CameraDirector, CAM_STATE } from './CameraDirector.js';
import { DEFAULT_CAMERA_CONFIG } from '../cameraConfig.js';
import { contenderGuarantee, anchorScreenPoint } from './framingRule.js';

const WORLD = 4000;
const CANVAS_W = 1280;
const CANVAS_H = 720;
const ROAD = 300;
const FINISH_T = 1;
const BODY = 36;
/** One racer length between two equal racers — the unit the rule is written in. */
const ONE_LENGTH = BODY;
const RS = { finishT: FINISH_T, finishedCount: 0, raceElapsed: 60000 };

const mkShape = () => ({
  isOpen: true,
  getPosition: (t, offset = 0) => ({
    x: Math.max(0, Math.min(1, t)) * WORLD,
    y: 360 + offset,
    angle: 0,
  }),
  getActualTrackWidth: () => ROAD,
});

/**
 * A field carrying the geometry the rule needs. `lateral` is world px off the centreline, so a
 * racer at +140 is running near the outside edge of a 300-px road.
 * `back` is world px behind the leader ALONG the track.
 */
const mkField = (p, followers = []) => {
  const at = (t, lateral) => ({
    x: Math.max(0, Math.min(1, t)) * WORLD,
    y: 360 + lateral,
  });
  const leader = {
    index: 0,
    t: p * FINISH_T,
    ...at(p, 0),
    physicalY: 0,
    pathLengthPx: WORLD,
    drawnBodyLengthPx: BODY,
    drawnBodyWidthPx: BODY,
  };
  const out = [leader];
  followers.forEach((f, i) => {
    const t = p * FINISH_T - f.back / WORLD;
    out.push({
      index: i + 1,
      t,
      ...at(t, f.lateral),
      physicalY: (f.lateral * 2) / ROAD,
      pathLengthPx: WORLD,
      drawnBodyLengthPx: BODY,
      drawnBodyWidthPx: BODY,
    });
  });
  return out;
};

/**
 * A director warmed before the closing window and then walked to `toP`, the same shape the endgame
 * tests already use. `fieldAt(p, frame)` supplies the followers for each frame.
 */
const drive = (fromP, toP, frames, fieldAt, cfg = {}) => {
  const cd = new CameraDirector(
    cfg.worldW ?? WORLD,
    CANVAS_H,
    true,
    { ...DEFAULT_CAMERA_CONFIG, ...cfg },
    BODY,
    mkShape(),
    ROAD
  );
  // THE CAMERA SEED IS PINNED, and without it none of the paired comparisons in this file mean
  // anything. The director draws its own `Math.random()` seed per construction, so two runs of the
  // "same" race diverge on the director's own jitter — which is why every harness in this project
  // fixes it. Found by this file's before-the-run-in test passing alone and failing in the suite.
  cd.setRandomSeed(1439767152);
  cd.state = cfg.state ?? CAM_STATE.LEADER_ZOOM;
  let ts = 1000;
  for (let w = 0; w < 180; w++) {
    cd.update(fieldAt(fromP, -1), ts, RS, CANVAS_W, CANVAS_H);
    ts += 1000 / 60;
  }
  const trace = [];
  for (let f = 0; f < frames; f++) {
    const p = fromP + ((toP - fromP) * f) / (frames - 1);
    const racers = fieldAt(p, f);
    cd.update(racers, ts, RS, CANVAS_W, CANVAS_H);
    trace.push({
      p,
      ts,
      f,
      racers,
      zoom: cd.zoom,
      offsetX: cd.offsetX,
      offsetY: cd.offsetY,
      composing: !!cd._runInComposingNow,
      guaranteed: cd._framingProbe?.guaranteed,
      preLevel: cd._framingProbe?.levelPreWidth,
      levelCeiling: cd._framingProbe?.levelCeiling,
      levelBound: !!cd._framingProbe?.levelBound,
      setSize: cd._framingProbe?.levelSetSize,
    });
    ts += 1000 / 60;
  }
  return { cd, trace, ts };
};

/** Is this racer's BODY inside the canvas, under the frame the director actually delivered? */
const onScreen = (r, row) => {
  const eff = 1.5 * row.zoom; // OPEN_TRACK_BASE_ZOOM x cam.zoom, both axes
  const sx = r.x * eff + row.offsetX;
  const sy = r.y * eff + row.offsetY;
  const rad = (BODY / 2) * eff;
  return sx + rad >= 0 && sx - rad <= CANVAS_W && sy + rad >= 0 && sy - rad <= CANVAS_H;
};

/** The same run with the level guarantee removed — the shot as master composes it today. */
const withoutRule = (fn) => {
  const spy = vi.spyOn(CameraDirector.prototype, '_levelCeiling').mockReturnValue(Infinity);
  try {
    return fn();
  } finally {
    spy.mockRestore();
  }
};

// ────────────────────────────────────────────────────────────────────────────────────────────────
describe('the membership rule — the along-track gap decides, the lane decides nothing', () => {
  const cdFor = () =>
    new CameraDirector(WORLD, CANVAS_H, true, DEFAULT_CAMERA_CONFIG, BODY, mkShape(), ROAD);

  it('admits a racer level with the leader however far to the side he runs', () => {
    const cd = cdFor();
    // Same along-track position, on the far edge of the road.
    const set = cd._levelContenders(mkField(0.98, [{ back: 0, lateral: 148 }]));
    expect(set.map((r) => r.index).sort()).toEqual([0, 1]);

    // ...and at the opposite edge, and at both edges at once.
    expect(cd._levelContenders(mkField(0.98, [{ back: 0, lateral: -148 }])).length).toBe(2);
    expect(
      cd._levelContenders(
        mkField(0.98, [
          { back: 0, lateral: 148 },
          { back: 0, lateral: -148 },
        ])
      ).length
    ).toBe(3);
  });

  it('does NOT admit a racer more than one racer length behind, however clear his lane', () => {
    const cd = cdFor();
    const just = cd._levelContenders(mkField(0.98, [{ back: ONE_LENGTH - 1, lateral: 0 }]));
    const past = cd._levelContenders(mkField(0.98, [{ back: ONE_LENGTH + 1, lateral: 0 }]));
    expect(just.length).toBe(2); // inside the length: admitted
    expect(past.length).toBe(1); // one world px past it: not admitted

    // SABOTAGE — the predicate with the unit inflated. If membership were not bounded by exactly
    // one racer length, the racer above would come in and the assertion below would be the one
    // that holds instead.
    const wide = vi
      .spyOn(CameraDirector, 'contactLengthBetween')
      .mockImplementation(() => ONE_LENGTH * 4);
    expect(cd._levelContenders(mkField(0.98, [{ back: ONE_LENGTH + 1, lateral: 0 }])).length).toBe(
      2
    );
    wide.mockRestore();
  });

  it('is the same unit the rest of the endgame uses, not a second definition', () => {
    // `contactLengthBetween` IS the expression the two shipped call sites carry.
    const a = { drawnBodyLengthPx: 30 };
    const b = { drawnBodyLengthPx: 50 };
    expect(CameraDirector.contactLengthBetween(a, b)).toBe(40);
    expect(CameraDirector.contactLengthBetween(a, a)).toBe(30); // one body length between equals
  });

  it('cannot be applied without geometry, and says so by admitting nobody', () => {
    const cd = cdFor();
    // A director test on bare shapes, or camera-replay's marker fields: no pathLengthPx, no body.
    expect(cd._levelContenders([{ index: 0, t: 0.98, x: 3920, y: 360 }])).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────────────────────────────────
describe('a span is not a presence — the CAMERA-ANCHOR-TRUTH-1 repair', () => {
  const AX = 1.5;
  const AY = 1.5;
  const INNER = 0.7;

  it('holds a pair that the span reading lets slip: close together, far from the anchor', () => {
    // luger-hill 40 seed 11 in miniature: two racers ~46 world px apart, running ~140 px wide of
    // the point the camera is looking at. Their SPAN is tiny; their PRESENCE is not.
    const anchorWorld = { x: 1000, y: 360 };
    const at = anchorScreenPoint(CANVAS_W, CANVAS_H, 0.66, { x: AX, y: 0 });
    const pair = [
      { x: 1020, y: 360 + 140 },
      { x: 1060, y: 360 + 140 },
    ];
    const span = contenderGuarantee(pair, AX, AY, CANVAS_W, CANVAS_H, INNER, BODY);
    const presence = contenderGuarantee(
      pair,
      AX,
      AY,
      CANVAS_W,
      CANVAS_H,
      INNER,
      BODY,
      anchorWorld,
      at
    );
    // The span reading is far more permissive — it is measuring the wrong thing.
    expect(presence).toBeLessThan(span);
    expect(span / presence).toBeGreaterThan(3);

    // AND THE CONSEQUENCE, not just the number: at the span-derived zoom a member is off frame;
    // at the presence-derived zoom every member is inside it.
    const inFrame = (z) =>
      pair.every((p) => {
        const sx = at.x + (p.x - anchorWorld.x) * AX * z;
        const sy = at.y + (p.y - anchorWorld.y) * AY * z;
        return sx >= 0 && sx <= CANVAS_W && sy >= 0 && sy <= CANVAS_H;
      });
    expect(inFrame(span)).toBe(false); // SABOTAGE: this is what shipping the span alone delivers
    expect(inFrame(presence)).toBe(true);
  });

  it('needs only ONE subject to constrain, because a lone racer can be off frame', () => {
    const anchorWorld = { x: 1000, y: 360 };
    const at = anchorScreenPoint(CANVAS_W, CANVAS_H, 0.66, { x: AX, y: 0 });
    const lone = [{ x: 1000, y: 360 + 140 }];
    // A span needs two points and returns Infinity for one — which is exactly the blindness.
    expect(contenderGuarantee(lone, AX, AY, CANVAS_W, CANVAS_H, INNER, BODY)).toBe(Infinity);
    expect(
      contenderGuarantee(lone, AX, AY, CANVAS_W, CANVAS_H, INNER, BODY, anchorWorld, at)
    ).toBeLessThan(Infinity);
  });

  it('passing no anchor is today behaviour, exactly — every existing caller is untouched', () => {
    const pair = [
      { x: 1000, y: 360 },
      { x: 1200, y: 420 },
    ];
    const before = contenderGuarantee(pair, AX, AY, CANVAS_W, CANVAS_H, INNER, BODY);
    const withNulls = contenderGuarantee(pair, AX, AY, CANVAS_W, CANVAS_H, INNER, BODY, null, null);
    expect(withNulls).toBe(before);
  });
});

// ────────────────────────────────────────────────────────────────────────────────────────────────
describe('the shot the rule delivers', () => {
  const sideRunner = (lateral) => (p) => mkField(p, [{ back: 4, lateral }]);

  it('holds a member who is far to the side, where today he is cut', () => {
    const field = sideRunner(140);
    const withRule = drive(0.9, 0.999, 300, field);
    const composing = withRule.trace.filter((x) => x.composing);
    expect(composing.length).toBeGreaterThan(50);
    const cutWith = composing.filter((row) => !onScreen(row.racers[1], row)).length;

    // SABOTAGE — the same race with the level guarantee removed.
    const without = withoutRule(() => drive(0.9, 0.999, 300, field));
    const cutWithout = without.trace
      .filter((x) => x.composing)
      .filter((row) => !onScreen(row.racers[1], row)).length;

    expect(cutWithout).toBeGreaterThan(0); // the fault is present without the rule...
    expect(cutWith).toBe(0); // ...and gone with it
  });

  it('holds TWO members on opposite sides at once — river-run seed 49 in miniature', () => {
    const field = (p) =>
      mkField(p, [
        { back: 2, lateral: 138 },
        { back: 6, lateral: -138 },
      ]);
    const withRule = drive(0.9, 0.999, 300, field);
    const composing = withRule.trace.filter((x) => x.composing);
    expect(composing.length).toBeGreaterThan(50);
    const cutWith = composing.filter(
      (row) => !onScreen(row.racers[1], row) || !onScreen(row.racers[2], row)
    ).length;

    const without = withoutRule(() => drive(0.9, 0.999, 300, field));
    const cutWithout = without.trace
      .filter((x) => x.composing)
      .filter((row) => !onScreen(row.racers[1], row) || !onScreen(row.racers[2], row)).length;

    expect(cutWithout).toBeGreaterThan(0);
    expect(cutWith).toBe(0);
  });

  it('does not widen for a racer who is merely far to the side but NOT level', () => {
    // Same lane, same lateral offset, but two racer lengths back: the rule says nothing about him.
    const field = (p) => mkField(p, [{ back: ONE_LENGTH * 2 + 4, lateral: 140 }]);
    const { trace } = drive(0.9, 0.999, 300, field);
    const composing = trace.filter((x) => x.composing);
    expect(composing.length).toBeGreaterThan(50);
    expect(composing.every((row) => row.setSize === 1)).toBe(true);
    expect(composing.some((row) => row.levelBound)).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────────────────────────
describe('the invariants the build must not break', () => {
  it('NEVER TIGHTENS — the delivered width is never narrower than the shot without the rule', () => {
    const field = (p) => mkField(p, [{ back: 4, lateral: 140 }]);
    const { trace } = drive(0.9, 0.999, 300, field);
    const composing = trace.filter((x) => x.composing);
    expect(composing.length).toBeGreaterThan(50);
    // A ceiling on cam.zoom is a lower bound on WIDTH: delivered <= pre-level, always.
    for (const row of composing) {
      expect(row.guaranteed).toBeLessThanOrEqual(row.preLevel + 1e-9);
    }
    // And it really does bind somewhere, or the assertion above is vacuous.
    expect(composing.some((row) => row.levelBound)).toBe(true);
  });

  it('EVERY FRAME BEFORE THE RUN-IN IS UNCHANGED, to the pixel', () => {
    const field = (p) => mkField(p, [{ back: 4, lateral: 140 }]);
    const withRule = drive(0.5, 0.999, 400, field);
    const without = withoutRule(() => drive(0.5, 0.999, 400, field));
    const firstComposing = withRule.trace.findIndex((x) => x.composing);
    expect(firstComposing).toBeGreaterThan(20); // there IS a stretch before the run-in

    for (let i = 0; i < firstComposing; i++) {
      expect(withRule.trace[i].zoom).toBe(without.trace[i].zoom);
      expect(withRule.trace[i].offsetX).toBe(without.trace[i].offsetX);
      expect(withRule.trace[i].offsetY).toBe(without.trace[i].offsetY);
    }
    // The two DO diverge later, or this test would pass on a build that does nothing at all.
    expect(withRule.trace.some((row, i) => row.zoom !== without.trace[i].zoom)).toBe(true);
  });

  it('the forward view is untouched — the leader keeps his place in frame', () => {
    const field = (p) => mkField(p, [{ back: 4, lateral: 140 }]);
    // THE WORLD IS WIDER THAN THE PATH HERE, and that is the point of the test rather than a
    // convenience. On a world whose edge IS the finish, the pan clamp (`camXMax = worldW -
    // canvasW / effZoom`) binds EARLIER for a wider frame, so the leader drifts forward in frame
    // for a reason that has nothing to do with this rule. Real tracks carry margin past the line;
    // the synthetic one above does not. The clamped case is asserted separately below.
    const cfg = { worldW: WORLD + 1600 };
    const withRule = drive(0.9, 0.999, 300, field, cfg);
    const without = withoutRule(() => drive(0.9, 0.999, 300, field, cfg));
    const rows = withRule.trace.map((r, i) => [r, without.trace[i]]).filter(([r]) => r.composing);
    expect(rows.length).toBeGreaterThan(50);
    const drift = [];
    for (const [a, b] of rows) {
      // The leader's position IN FRAME is a fraction, so it must not move when only width does.
      // The framing rule places him at the same FRACTION under either width; what is left is the
      // pan smoother's lag, which differs because the zoom it is lagging at differs. Bounded, not
      // asserted equal — an exact equality here would be asserting the smoother away.
      const fa = (a.racers[0].x * 1.5 * a.zoom + a.offsetX) / CANVAS_W;
      const fb = (b.racers[0].x * 1.5 * b.zoom + b.offsetX) / CANVAS_W;
      // The room AHEAD of him, in world px, never shrinks — that is the requirement itself.
      const aheadA = (CANVAS_W - (a.racers[0].x * 1.5 * a.zoom + a.offsetX)) / (1.5 * a.zoom);
      const aheadB = (CANVAS_W - (b.racers[0].x * 1.5 * b.zoom + b.offsetX)) / (1.5 * b.zoom);
      expect(aheadA).toBeGreaterThanOrEqual(aheadB - 1e-6);
      drift.push(Math.abs(fa - fb));
    }
    // THE PLACEMENT DRIFT IS THE PAN SMOOTHER'S LAG, AND IT IS BOUNDED RATHER THAN ABSENT.
    // The framing rule puts the leader at the same FRACTION under either width — that part is
    // arithmetic. What is left is the smoother: the forward bias is a screen displacement converted
    // to world at the current zoom, so a wider shot gives the smoother a further-travelled target,
    // and the zoom is moving every frame of the close, so the lag never fully settles. MEASURED at
    // 0.037 of the frame width over the last quarter here; the bound is set just above it and the
    // number is reported rather than tuned away. THE REQUIREMENT ITSELF — the room ahead in world
    // px — is asserted strictly, frame by frame, above.
    const tail = drift.slice(Math.floor(drift.length * 0.75));
    expect(Math.max(...tail)).toBeLessThan(0.05);
  });

  // MEASURED AND REPORTED RATHER THAN ASSERTED AWAY. Where the world edge sits at the finish line,
  // a wider frame reaches the pan clamp sooner and the leader's PLACEMENT moves forward. The
  // requirement is about the room AHEAD of him in world px, and that is what is held: the wider
  // frame still carries more world ahead of the leader, clamp or no clamp.
  it('even against the world edge, the room ahead of the leader never shrinks', () => {
    const field = (p) => mkField(p, [{ back: 4, lateral: 140 }]);
    const withRule = drive(0.9, 0.999, 300, field); // world edge AT the finish
    const without = withoutRule(() => drive(0.9, 0.999, 300, field));
    const rows = withRule.trace.map((r, i) => [r, without.trace[i]]).filter(([r]) => r.composing);
    expect(rows.length).toBeGreaterThan(50);
    let placementMoved = false;
    for (const [a, b] of rows) {
      const ahead = (row) =>
        (CANVAS_W - (row.racers[0].x * 1.5 * row.zoom + row.offsetX)) / (1.5 * row.zoom);
      expect(ahead(a)).toBeGreaterThanOrEqual(ahead(b) - 1e-6);
      const frac = (row) => (row.racers[0].x * 1.5 * row.zoom + row.offsetX) / CANVAS_W;
      if (Math.abs(frac(a) - frac(b)) > 0.02) placementMoved = true;
    }
    // ...and it DOES move here, which is why the test above runs on a world with margin.
    expect(placementMoved).toBe(true);
  });

  it('where nobody is level, today shot stands — the rule constrains nothing', () => {
    const field = (p) => mkField(p, [{ back: ONE_LENGTH * 6, lateral: 40 }]);
    const withRule = drive(0.9, 0.999, 300, field);
    const without = withoutRule(() => drive(0.9, 0.999, 300, field));
    expect(withRule.trace.some((x) => x.composing)).toBe(true);
    for (let i = 0; i < withRule.trace.length; i++) {
      expect(withRule.trace[i].zoom).toBe(without.trace[i].zoom);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────────────────────────
describe('a LIVE set does not pump the width', () => {
  /** A racer crossing the one-length boundary every few frames — the churn the pin exists to fear. */
  const oscillating = (period) => (p, f) => {
    const inSet = f >= 0 && Math.floor(f / period) % 2 === 0;
    return mkField(p, [{ back: inSet ? ONE_LENGTH - 6 : ONE_LENGTH + 6, lateral: 140 }]);
  };

  /**
   * HOW MUCH THE WIDTH MOVES, not how often it changes direction. A count of reversals measures the
   * CHURN'S cadence and would be roughly the same however small the moves were; what a viewer sees
   * as pumping is AMPLITUDE. Both are in log space, because a scale change is perceived
   * logarithmically — the same reasoning the schedule's own easing rests on.
   */
  const motion = (trace) => {
    const w = trace.filter((x) => x.composing).map((x) => x.guaranteed);
    let maxStep = 0;
    let variation = 0;
    for (let i = 1; i < w.length; i++) {
      const d = Math.abs(Math.log(w[i] / w[i - 1]));
      variation += d;
      if (d > maxStep) maxStep = d;
    }
    return { maxStep, variation, n: w.length };
  };

  it('a racer oscillating across the boundary does not make the width oscillate', () => {
    const field = oscillating(6);
    const eased = drive(0.9, 0.999, 300, field);
    expect(eased.trace.filter((x) => x.composing).length).toBeGreaterThan(50);
    expect(eased.trace.some((x) => x.levelBound)).toBe(true); // it really is firing

    // SABOTAGE — the same churn with the release ease removed, i.e. membership applied raw.
    // `runInOpenMs` of 0 is how `_levelCeiling` expresses "no ease": it takes the target at once.
    const raw = drive(0.9, 0.999, 300, field, { runInOpenMs: 0 });

    const m0 = motion(raw.trace);
    const m1 = motion(eased.trace);
    // Raw membership throws the width across a visible range on single frames...
    expect(m0.maxStep).toBeGreaterThan(0.15);
    // ...and the ease holds it: the biggest single-frame move and the total travel both collapse.
    expect(m1.maxStep).toBeLessThan(m0.maxStep / 3);
    expect(m1.variation).toBeLessThan(m0.variation / 3);
  });

  // ── RUNIN-EASED-ADMIT-1 REPLACED THIS TEST, AND THE OWNER REPLACED THE RULE IT PINNED ─────────
  //
  // It used to assert that the admit is INSTANT — "a racer is never cut while it thinks" — which was
  // true and was the defect: admitting by the member's full demand in one frame is the width step he
  // has been watching. His instruction of 2026-08-26 is that the picture may not change abruptly in
  // the closing phase, and he accepts that a new member is not fully guaranteed while the width grows
  // onto him. So the property to pin is inverted: the FIRST frame must cost almost nothing, and the
  // guarantee must arrive shortly after rather than immediately.
  it('a newly admitted member does not move the width by his full demand in one frame', () => {
    const field = (p, f) => (f < 150 ? mkField(p, []) : mkField(p, [{ back: 4, lateral: 145 }]));
    const { trace } = drive(0.9, 0.999, 300, field);
    const composing = trace.filter((x) => x.composing);
    expect(composing.length).toBeGreaterThan(40); // the phase ran, or nothing is proved

    const i = trace.findIndex((x) => x.composing && x.f >= 150);
    expect(i).toBeGreaterThan(0);
    const before = trace[i - 1];
    const admit = trace[i];

    // THE STEP IS GONE ON THE ADMIT FRAME. In log space, because a width change is perceived
    // logarithmically and that is the unit the ease itself works in.
    const firstStep = Math.abs(Math.log(admit.zoom / before.zoom));
    expect(firstStep).toBeLessThan(0.02); // ~2%, far below anything a viewer reads as a jump

    // AND THE GUARANTEE STILL ARRIVES — the member is held once the width has grown onto him, or
    // this would pass on a build that simply ignores him.
    const late = trace.filter((x) => x.composing && x.f >= 150 + 40);
    expect(late.length).toBeGreaterThan(10);
    expect(late.every((row) => onScreen(row.racers[1], row))).toBe(true);

    // ── SABOTAGE: the same race with the level guarantee removed never widens for him at all, so
    // "the guarantee arrives" is a real assertion rather than a property of the fixture.
    const without = withoutRule(() => drive(0.9, 0.999, 300, field));
    const lateWithout = without.trace.filter((x) => x.composing && x.f >= 150 + 40);
    expect(lateWithout.some((row) => !onScreen(row.racers[1], row))).toBe(true);
  });
});
