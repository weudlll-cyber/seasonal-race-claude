import { describe, it, expect, vi } from 'vitest';
import { renderMinimap, MINIMAP_W, MINIMAP_H, MINIMAP_MARGIN } from './Minimap.js';

const SAMPLES = 80;

function makeMockShape(closed = true) {
  const bbox = { minX: 100, minY: 100, maxX: 900, maxY: 500 };
  return {
    isOpen: !closed,
    getBoundingBox: () => bbox,
    // MINIMAP-ONE-SOURCE-1: `getEdgePoints` THROWS, and that is the test. The band fill and both
    // edge outlines used to be built from it by index while the marks and the tail were built from
    // `getPosition` — two parameterisations of one ribbon, which is what left a sliver between
    // them. A mock that merely stopped providing it would let a reintroduced call read `undefined`
    // and fail somewhere unhelpful; one that throws names the defect at the moment it returns.
    getEdgePoints: () => {
      throw new Error(
        'Minimap must read the track through getPosition only (MINIMAP-ONE-SOURCE-1).'
      );
    },
    // A straight band running left to right: t sets x, the lateral offset sets y. Deliberately
    // monotonic in t, so a mark drawn at the WRONG t lands at the wrong x and the tests below see
    // it — a mock that folded t back on itself could not tell start from finish apart.
    // The offset follows the real EditorShape: -0.5 is the INNER edge, +0.5 the OUTER.
    getPosition: (t, offset) => ({ x: 100 + t * 800, y: 300 + offset * 400, angle: 0 }),
  };
}

function makeMockRacers(n) {
  return Array.from({ length: n }, (_, i) => ({
    x: 200 + i * 100,
    y: 300,
    color: '#ff0000',
  }));
}

/**
 * Records WHAT was drawn and in WHICH order, not just that a method was called. The order is the
 * point: several of the tests below are about layering (marks under dots) and about one drawing
 * being distinguishable from another, and neither is expressible with call counts alone.
 */
function makeCtx() {
  const ctx = {
    ops: [],
    _path: [],
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(() => {
      ctx._path = [];
    }),
    moveTo: vi.fn((x, y) => ctx._path.push({ x, y })),
    lineTo: vi.fn((x, y) => ctx._path.push({ x, y })),
    closePath: vi.fn(),
    arc: vi.fn((x, y, r) => ctx.ops.push({ op: 'arc', x, y, r })),
    fill: vi.fn(() =>
      ctx.ops.push({ op: 'fill', fillStyle: ctx.fillStyle, path: ctx._path.slice() })
    ),
    stroke: vi.fn(() =>
      ctx.ops.push({
        op: 'stroke',
        strokeStyle: ctx.strokeStyle,
        lineWidth: ctx.lineWidth,
        lineCap: ctx.lineCap,
        path: ctx._path.slice(),
      })
    ),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
  };
  return ctx;
}

/**
 * The start/finish marks are the only strokes in this module made of exactly two points: the band
 * edges carry SAMPLES+1 and the racer rings carry none (an arc adds no path point to this mock).
 * Identifying them structurally rather than by colour keeps these tests off the palette.
 */
function markSegments(ctx) {
  return ctx.ops.filter((o) => o.op === 'stroke' && o.path.length === 2);
}

const segMidX = (s) => Math.round((s.path[0].x + s.path[1].x) / 2);
const segLen = (s) => Math.hypot(s.path[1].x - s.path[0].x, s.path[1].y - s.path[0].y);

/**
 * The two AREA fills: the track band and, on an open track, the unraced tail behind the finish.
 * Racer dots also call fill(), but after an arc, which adds no path point to this mock — so a
 * multi-point path is what separates a region from a dot without naming any colour.
 */
const areaFills = (ctx) => ctx.ops.filter((o) => o.op === 'fill' && o.path.length > 2);

/** Splits mark segments into one bucket per position on the panel. */
function marksByPosition(ctx) {
  const buckets = new Map();
  for (const s of markSegments(ctx)) {
    const key = segMidX(s);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(s);
  }
  return [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([x, segs]) => ({ x, segs }));
}

/** Renders an OPEN track and reports the colour its solid start bar used. */
function startColorFromOpenRender() {
  const ctx = makeCtx();
  renderMinimap(ctx, makeMockShape(false), makeMockRacers(1), 0, 1280, 720, null, {
    startT: 0,
    finishT: 0.6,
  });
  const [start] = marksByPosition(ctx);
  return start.segs[0].strokeStyle;
}

const MARKS_CLOSED = { startT: 0, finishT: 3 };
const MARKS_OPEN = { startT: 0, finishT: 0.6 };
// A finish deliberately OFF the 80-step band grid. `MARKS_OPEN`'s 0.6 is exactly 48/80, so a tail
// that re-divides its own span evenly lands on the grid ANYWAY and a grid-sharing test written
// against it passes either way — which it did, until this was added. 0.633 is on no step.
const MARKS_OPEN_OFFGRID = { startT: 0, finishT: 0.633 };

describe('renderMinimap', () => {
  it('does not throw with a valid closed shape and racers', () => {
    const ctx = makeCtx();
    expect(() =>
      renderMinimap(ctx, makeMockShape(true), makeMockRacers(3), 0, 1280, 720, null, MARKS_CLOSED)
    ).not.toThrow();
  });

  it('draws the background panel at bottom-left with correct dimensions', () => {
    const ctx = makeCtx();
    renderMinimap(ctx, makeMockShape(true), makeMockRacers(3), 0, 1280, 720, null, MARKS_CLOSED);
    expect(ctx.fillRect).toHaveBeenCalledTimes(1);
    const [bx, by, w, h] = ctx.fillRect.mock.calls[0];
    expect(bx).toBe(MINIMAP_MARGIN);
    expect(by).toBe(720 - MINIMAP_H - MINIMAP_MARGIN);
    expect(w).toBe(MINIMAP_W);
    expect(h).toBe(MINIMAP_H);
  });

  it('draws n+1 arc calls total: one dot per racer plus leader ring, marks or not', () => {
    // DELETE THIS and a mark drawn with dots instead of bars would inflate the dot layer silently:
    // the arc count is what pins the racer dots as the ONLY circles on the panel.
    const ctx = makeCtx();
    const racers = makeMockRacers(4);
    renderMinimap(ctx, makeMockShape(true), racers, 0, 1280, 720, null, MARKS_CLOSED);
    // 4 racer dots + 1 leader ring = 5
    expect(ctx.arc).toHaveBeenCalledTimes(racers.length + 1);
  });

  it('wraps drawing in save/restore to protect caller ctx state', () => {
    // DELETE THIS and the module's lineCap='butt' (needed so the checker cells do not bleed into
    // each other) would escape into the caller's context and change how the race canvas strokes.
    const ctx = makeCtx();
    renderMinimap(ctx, makeMockShape(true), makeMockRacers(2), 0, 1280, 720, null, MARKS_CLOSED);
    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
  });

  it('draws no marks and no tail at all when no marks are passed', () => {
    // DELETE THIS and the marks become unconditional, so any future caller that has no start/finish
    // to give (a shape preview, an editor panel) would crash or draw a mark at a made-up t. The
    // tail rides on the same condition: it BEGINS at finishT, so with no finish there is no tail.
    const ctx = makeCtx();
    renderMinimap(ctx, makeMockShape(false), makeMockRacers(2), 0, 1280, 720);
    expect(markSegments(ctx)).toHaveLength(0);
    expect(areaFills(ctx)).toHaveLength(1);
  });

  it('OPEN shape: draws two marks, one per t, and they are tellable apart', () => {
    // DELETE THIS and the whole point of the change goes unguarded — on an open track the band
    // runs on past the finish, so a missing or misplaced finish mark is exactly the defect this
    // was built to remove. It also pins the two marks to their OWN t: the start bar must sit at
    // startT and the checker at finishT, never swapped.
    const ctx = makeCtx();
    renderMinimap(ctx, makeMockShape(false), makeMockRacers(3), 0, 1280, 720, null, MARKS_OPEN);

    const positions = marksByPosition(ctx);
    expect(positions).toHaveLength(2);

    const [start, finish] = positions;
    // The mock maps a larger t to a larger x, so finishT 0.6 must land to the RIGHT of startT 0.
    expect(finish.x).toBeGreaterThan(start.x);

    // Start = one solid bar. Finish = a checker of alternating cells in two colours.
    expect(start.segs).toHaveLength(1);
    expect(finish.segs.length).toBeGreaterThanOrEqual(4);
    const checkerColors = new Set(finish.segs.map((s) => s.strokeStyle));
    expect(checkerColors.size).toBe(2);
    expect(checkerColors.has(start.segs[0].strokeStyle)).toBe(false);
  });

  it('CLOSED shape: start and finish coincide, so ONE mark says both', () => {
    // DELETE THIS and the closed case regresses to two identical bars stacked at t 0 — visually a
    // single smeared mark that claims to be only the finish. It also guards the lap-count wrap:
    // a closed race's finishT is "3 laps", and 3 must resolve to the gate at t 0, not off the end.
    const ctx = makeCtx();
    renderMinimap(ctx, makeMockShape(true), makeMockRacers(3), 0, 1280, 720, null, MARKS_CLOSED);

    const positions = marksByPosition(ctx);
    expect(positions).toHaveLength(1);

    const segs = positions[0].segs;
    const checkerWidth = Math.min(...segs.map((s) => s.lineWidth));
    const checker = segs.filter((s) => s.lineWidth === checkerWidth);
    const plate = segs.filter((s) => s.lineWidth > checkerWidth);

    expect(plate).toHaveLength(1);
    expect(checker.length).toBeGreaterThanOrEqual(4);
    // The plate must be visible AROUND the checker, not hidden under it.
    expect(segLen(plate[0])).toBeGreaterThan(checker.reduce((sum, s) => sum + segLen(s), 0));
    // …and it must be the same green that means "start" on an open track, or the combined mark
    // does not actually say "start" to anyone who learned the marks on an open track.
    expect(plate[0].strokeStyle).toBe(startColorFromOpenRender());
  });

  it('OPEN shape: washes the unraced tail, in a fill distinct from the raced band', () => {
    // DELETE THIS and the addition itself goes unguarded: the stretch behind the finish is never
    // raced, and without a distinct fill an open track gives no way to see how much race is left.
    // It also pins the tail to the track END — a tail that ran past t 1 would smear off the
    // geometry, and `getPosition` CLAMPS rather than throwing, so nothing else would notice.
    const ctx = makeCtx();
    renderMinimap(ctx, makeMockShape(false), makeMockRacers(3), 0, 1280, 720, null, MARKS_OPEN);

    const fills = areaFills(ctx);
    expect(fills).toHaveLength(2);
    const [band, tail] = fills;
    expect(tail.fillStyle).not.toBe(band.fillStyle);

    // The band spans the whole track, so its far end IS the track end. The tail must reach it and
    // stop there.
    const farEnd = (f) => Math.max(...f.path.map((p) => p.x));
    expect(farEnd(tail)).toBeCloseTo(farEnd(band), 6);
  });

  it('OPEN shape: the tail SEAM is the finish mark itself, to the pixel', () => {
    // DELETE THIS and the one thing that makes the tail honest is unguarded. The band USED to be
    // built from getEdgePoints BY INDEX and the marks from getPosition; those two parameterisations
    // disagree by up to 502 world px on luger-hill. MINIMAP-ONE-SOURCE-1 put all four on one walk,
    // and this test is what says the seam still lands under the checker rather than near it.
    const ctx = makeCtx();
    renderMinimap(ctx, makeMockShape(false), makeMockRacers(3), 0, 1280, 720, null, MARKS_OPEN);

    const tail = areaFills(ctx)[1];
    const checker = marksByPosition(ctx)[1].segs;
    const barEnds = [checker[0].path[0], checker[checker.length - 1].path[1]];

    for (const end of barEnds) {
      const onSeam = tail.path.some(
        (p) => Math.abs(p.x - end.x) < 1e-6 && Math.abs(p.y - end.y) < 1e-6
      );
      expect(onSeam).toBe(true);
    }
  });

  it('CLOSED shape: no tail — a loop is raced in full', () => {
    // DELETE THIS and a tail could appear on closed tracks, where it would be a lie: the loop is
    // raced end to end, and `finishT` there is a LAP COUNT that wraps to 0, so an ungated tail
    // would wash the ENTIRE band.
    const ctx = makeCtx();
    renderMinimap(ctx, makeMockShape(true), makeMockRacers(3), 0, 1280, 720, null, MARKS_CLOSED);
    expect(areaFills(ctx)).toHaveLength(1);
  });

  it('draws the tail BEFORE the marks and before the dots', () => {
    // DELETE THIS and the wash could land on top of the checker or the racer dots, dimming the two
    // things it exists to make legible.
    const ctx = makeCtx();
    renderMinimap(ctx, makeMockShape(false), makeMockRacers(3), 0, 1280, 720, null, MARKS_OPEN);

    const tailIdx = ctx.ops.indexOf(areaFills(ctx)[1]);
    const firstMark = ctx.ops.findIndex((o) => o.op === 'stroke' && o.path.length === 2);
    const firstDot = ctx.ops.findIndex((o) => o.op === 'arc');
    expect(tailIdx).toBeGreaterThanOrEqual(0);
    expect(tailIdx).toBeLessThan(firstMark);
    expect(tailIdx).toBeLessThan(firstDot);
  });

  // ── MINIMAP-ONE-SOURCE-1 ───────────────────────────────────────────────────────────────────
  //
  // The band, both edges, both marks and the tail are ONE ribbon. Before this block they were two
  // parameterisations of it — the band and edges from `getEdgePoints` by index, the marks and tail
  // from `getPosition` — and the two disagree, because `getEdgePoints` rounds t to the nearest
  // stored sample while `getPosition` interpolates. Measured on all ten shipped tracks by
  // `scripts/minimap-truth.mjs`: up to 1.886 panel px of un-washed band beside the tail, and up to
  // 0.919 px between a mark's ends and the band edge it spans. Both are 0.000 now.

  it('reads the track through getPosition ONLY — nothing calls getEdgePoints', () => {
    // DELETE THIS and the whole block can be undone by one convenient line. The mock's
    // `getEdgePoints` throws, so any reader of the second parameterisation fails here and names
    // itself; without it, a reintroduced call would draw a band that is silently 1.9 px off the
    // tail again — a defect that is visible on the panel and invisible to every other test.
    for (const closed of [true, false]) {
      const ctx = makeCtx();
      expect(() =>
        renderMinimap(ctx, makeMockShape(closed), makeMockRacers(3), 0, 1280, 720, null, {
          startT: 0,
          finishT: closed ? 3 : 0.6,
        })
      ).not.toThrow();
    }
  });

  it('the band fill and BOTH edge outlines are the same walk, not three', () => {
    // DELETE THIS and the band could go back to being sampled once per drawing. Three walks of one
    // ribbon is how the file ended up with two parameterisations in the first place: each drawing
    // owned its own sampling, so one of them could drift without the others.
    const ctx = makeCtx();
    renderMinimap(ctx, makeMockShape(false), makeMockRacers(2), 0, 1280, 720, null, MARKS_OPEN);

    const band = areaFills(ctx)[0].path;
    const half = band.length / 2;
    const bandOuter = band.slice(0, half);
    const bandInner = band.slice(half).reverse();

    const edges = ctx.ops.filter((o) => o.op === 'stroke' && o.path.length > 2);
    expect(edges).toHaveLength(2);
    expect(edges[0].path).toEqual(bandOuter);
    expect(edges[1].path).toEqual(bandInner);
  });

  it('the band is sampled at TRACK_SAMPLES + 1 cross-sections', () => {
    // DELETE THIS and the density could change without anyone noticing. It is not a free number:
    // the tail shares this grid, so halving it would coarsen the tail's outline too.
    const ctx = makeCtx();
    renderMinimap(ctx, makeMockShape(false), makeMockRacers(2), 0, 1280, 720, null, MARKS_OPEN);
    expect(areaFills(ctx)[0].path).toHaveLength((SAMPLES + 1) * 2);
  });

  it('OPEN shape: every tail vertex after the first IS a band vertex', () => {
    // DELETE THIS and the tail can go back to re-dividing its own span evenly. That is still ONE
    // SOURCE and still leaves a sliver — measured at up to 1.472 px — because two polylines through
    // the same curve at different sample points are not the same polyline: where one's chord cuts a
    // corner the other's does not. Sharing the band's grid is what takes the sliver to 0.000, and
    // this is the only test that says the grid is shared.
    // The finish is OFF the grid on purpose — see MARKS_OPEN_OFFGRID. With an on-grid finish an
    // evenly re-divided tail lands on the grid by accident and this test cannot fail.
    const ctx = makeCtx();
    renderMinimap(
      ctx,
      makeMockShape(false),
      makeMockRacers(2),
      0,
      1280,
      720,
      null,
      MARKS_OPEN_OFFGRID
    );

    const band = areaFills(ctx)[0].path;
    const tail = areaFills(ctx)[1].path;
    const key = (p) => `${p.x.toFixed(9)},${p.y.toFixed(9)}`;
    const bandKeys = new Set(band.map(key));

    const half = tail.length / 2;
    const tailInner = tail.slice(0, half);
    const tailOuter = tail.slice(half).reverse();
    // The FIRST cross-section is the finish, which is an arbitrary t and deliberately not on the
    // grid — that is the whole reason the tail needs `getPosition` at all.
    for (const p of tailInner.slice(1)) expect(bandKeys.has(key(p))).toBe(true);
    for (const p of tailOuter.slice(1)) expect(bandKeys.has(key(p))).toBe(true);
    expect(tailInner.length).toBeGreaterThan(1);
  });

  it('OPEN shape: both mark bars land ON the band edges, not near them', () => {
    // DELETE THIS and a mark could drift off the band it claims to span while every other test
    // stayed green — the marks were measured at up to 0.919 px off the drawn edge before this
    // block, and nothing failed. The start bar is at a grid t here, so it must match exactly.
    const ctx = makeCtx();
    renderMinimap(ctx, makeMockShape(false), makeMockRacers(2), 0, 1280, 720, null, MARKS_OPEN);

    const band = areaFills(ctx)[0].path;
    const key = (p) => `${p.x.toFixed(9)},${p.y.toFixed(9)}`;
    const bandKeys = new Set(band.map(key));

    // startT 0 and finishT 0.6 are both on the 80-step grid, so both bars' ends are band vertices.
    for (const bucket of marksByPosition(ctx)) {
      const ends = [bucket.segs[0].path[0], bucket.segs[bucket.segs.length - 1].path[1]];
      for (const e of ends) expect(bandKeys.has(key(e))).toBe(true);
    }
  });

  it('the tail is drawn AFTER the band fill and BEFORE the edge outlines', () => {
    // DELETE THIS and the layering that makes the tail readable goes unguarded in BOTH directions.
    // Before the band fill, the wash would be painted over. After the edges, it would dim the cyan
    // outline and the tail would read as "the track ends here" — the opposite of true, and the one
    // misreading this addition could cause.
    const ctx = makeCtx();
    renderMinimap(ctx, makeMockShape(false), makeMockRacers(2), 0, 1280, 720, null, MARKS_OPEN);

    const fills = areaFills(ctx);
    const bandIdx = ctx.ops.indexOf(fills[0]);
    const tailIdx = ctx.ops.indexOf(fills[1]);
    const firstEdge = ctx.ops.findIndex((o) => o.op === 'stroke' && o.path.length > 2);

    expect(bandIdx).toBeLessThan(tailIdx);
    expect(tailIdx).toBeLessThan(firstEdge);
  });

  it('the drawing ORDER is unchanged: panel, band, tail, edges, marks, dots', () => {
    // DELETE THIS and the one promise this simplification makes — that only the sliver moves — is
    // unguarded as a whole. Each pair above pins one adjacency; this pins the sequence, which is
    // what a reader of the panel actually sees.
    const ctx = makeCtx();
    renderMinimap(ctx, makeMockShape(false), makeMockRacers(3), 0, 1280, 720, null, MARKS_OPEN);

    const fills = areaFills(ctx);
    const order = [
      ctx.ops.indexOf(fills[0]), // band
      ctx.ops.indexOf(fills[1]), // tail
      ctx.ops.findIndex((o) => o.op === 'stroke' && o.path.length > 2), // first edge
      ctx.ops.findIndex((o) => o.op === 'stroke' && o.path.length === 2), // first mark
      ctx.ops.findIndex((o) => o.op === 'arc'), // first dot
    ];
    expect(order.every((v) => v >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('draws the marks BEFORE the racer dots', () => {
    // DELETE THIS and a later edit that moves the marks below the dot loop would hide racers under
    // a mark exactly where they matter most — on the line, at the start and at the finish.
    const ctx = makeCtx();
    renderMinimap(ctx, makeMockShape(false), makeMockRacers(3), 0, 1280, 720, null, MARKS_OPEN);

    const lastMark = ctx.ops.findLastIndex((o) => o.op === 'stroke' && o.path.length === 2);
    const firstDot = ctx.ops.findIndex((o) => o.op === 'arc');
    expect(lastMark).toBeGreaterThanOrEqual(0);
    expect(firstDot).toBeGreaterThanOrEqual(0);
    expect(lastMark).toBeLessThan(firstDot);
  });
});
