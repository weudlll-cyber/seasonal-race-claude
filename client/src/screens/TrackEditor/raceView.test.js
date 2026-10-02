// @vitest-environment node
// ============================================================
// File:        raceView.test.js
// Path:        client/src/screens/TrackEditor/raceView.test.js
// Project:     RaceArena — PARTICLES-VISIBILITY-10
// Description: The race-view panel's zoom is the race camera's own ordinary racing zoom, its default
//              centre is the start of the track, and an item at a world position lands where the
//              race-camera transform puts it on the panel. PARTICLES-VISIBILITY-11: the track lines,
//              three racers at the race's own scale across the course, the race's layer order, and
//              the panel's area as the main view frames it.
// ============================================================
import { describe, it, expect, vi } from 'vitest';
import {
  RACE_VIEW_W,
  RACE_VIEW_H,
  RACE_VIEW_FIELD_SIZE,
  raceViewScale,
  raceViewStart,
  raceViewRacerScale,
  raceViewCourse,
  raceViewRacerPlacements,
  raceViewRowSlotPx,
  raceViewArea,
  drawRaceView,
  drawRaceViewFrame,
} from './raceView.js';
import { projectionForTrack } from '../../modules/camera/projection.js';
import { resolveZoomForCorridors } from '../../modules/camera/zoomUnit.js';
import {
  DEFAULT_CAMERA_CONFIG,
  DEFAULT_RACE_BEHAVIOR_CONFIG,
} from '../../modules/storage/defaults.js';
import { deriveSpriteGeometry } from '../../modules/raceParams.js';
import { computeStartRowCount, computeRowPhysicalY } from '../../modules/rowLayout.js';
import {
  computeRenderDisplayScale,
  getEffectiveMaxTargetScreenPx,
  DEFAULT_AUTO_SCALE_CONFIG,
} from '../../modules/autoSpriteScale.js';
import { getRacerType } from '../../racer-types/index.js';

// The owner's camera setting for the racing shot, 0.85 standard corridors of 300 world px, as his
// stored races record it; everything else from the shipped config.
const OWNER = {
  ...DEFAULT_CAMERA_CONFIG,
  referenceCorridorPx: 300,
  cameraStateProfiles: {
    ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles,
    LEADER_ZOOM: {
      ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM,
      visibleCorridors: 0.85,
    },
  },
};

describe('raceViewScale — the race camera’s racing zoom', () => {
  it('is the camera’s own corridor conversion for the LEADER_ZOOM setting', () => {
    const proj = projectionForTrack(6144, 4096, true);
    const want = resolveZoomForCorridors(0.85, {
      referenceWidthPx: 300,
      axisY: proj.axisY,
      clampCamZoom: (z) => proj.clampCamZoom(z),
    });
    const got = raceViewScale({
      worldW: 6144,
      worldH: 4096,
      isOpenTrack: true,
      trackWidthPx: 300,
      cameraConfig: OWNER,
    });
    expect(got.camZoom).toBeCloseTo(want, 12);
  });

  // By the camera's own construction the short axis shows corridors × reference world px, whatever
  // the track: 0.85 × 300 = 255 world px on the 720-px canvas, a scale of 720 / 255.
  it.each([
    ['Seatrack (open, 6144×4096)', 6144, 4096, true, 300, 720 / 255, 720 / 255],
    ['Space Sprint (open, 6000×4000)', 6000, 4000, true, 300, 720 / 255, 720 / 255],
    [
      'Dirt Oval (closed, 3072×2047)',
      3072,
      2047,
      false,
      178,
      ((720 / 255) * (1280 / 3072)) / (720 / 2047),
      720 / 255,
    ],
  ])('%s at the owner’s setting', (_, worldW, worldH, isOpenTrack, trackWidthPx, sx, sy) => {
    const got = raceViewScale({ worldW, worldH, isOpenTrack, trackWidthPx, cameraConfig: OWNER });
    expect(got.scaleY).toBeCloseTo(sy, 9);
    expect(got.scaleX).toBeCloseTo(sx, 9);
  });

  it('follows the camera config: the shipped LEADER visibleCorridors x referenceCorridorPx world px', () => {
    const shippedPx =
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM.visibleCorridors *
      DEFAULT_CAMERA_CONFIG.referenceCorridorPx;
    const got = raceViewScale({
      worldW: 6144,
      worldH: 4096,
      isOpenTrack: true,
      trackWidthPx: 300,
      cameraConfig: DEFAULT_CAMERA_CONFIG,
    });
    expect(got.scaleY).toBeCloseTo(720 / shippedPx, 9);
  });
});

describe('raceViewStart — the default centre', () => {
  const base = { worldW: 1000, worldH: 800, centerPoints: [], innerPoints: [], outerPoints: [] };
  it('is the first centre point in centre mode', () => {
    expect(
      raceViewStart({
        ...base,
        mode: 'center',
        centerPoints: [
          { x: 10, y: 20 },
          { x: 30, y: 40 },
        ],
      })
    ).toEqual({ x: 10, y: 20 });
  });
  it('is the midpoint of the first inner and outer points in boundary mode', () => {
    expect(
      raceViewStart({
        ...base,
        mode: 'boundary',
        innerPoints: [{ x: 0, y: 0 }],
        outerPoints: [{ x: 10, y: 20 }],
      })
    ).toEqual({ x: 5, y: 10 });
  });
  it('is the world centre when nothing is drawn', () => {
    expect(raceViewStart({ ...base, mode: 'center' })).toEqual({ x: 500, y: 400 });
  });
});

describe('drawRaceView — where an item lands', () => {
  function trackingCtx() {
    let m = { a: 1, d: 1, e: 0, f: 0 };
    const stack = [];
    const arcs = [];
    const known = {
      canvas: { width: RACE_VIEW_W, height: RACE_VIEW_H },
      arcs,
      save: () => stack.push({ ...m }),
      restore: () => {
        m = stack.pop() ?? { a: 1, d: 1, e: 0, f: 0 };
      },
      scale: (sx, sy) => {
        m = { ...m, a: m.a * sx, d: m.d * sy };
      },
      translate: (tx, ty) => {
        m = { ...m, e: m.e + m.a * tx, f: m.f + m.d * ty };
      },
      getTransform: () => ({ a: m.a, b: 0, c: 0, d: m.d, e: m.e, f: m.f }),
      arc: (x, y, r) => arcs.push({ x: m.a * x + m.e, y: m.d * y + m.f, r: r * m.a }),
    };
    return new Proxy(known, {
      get: (t, k) => (k in t ? t[k] : () => ({ addColorStop: () => {} })),
      set: () => true,
    });
  }

  it('the centre lands at the panel centre, and an offset lands scaled by the race zoom', () => {
    const ctx = trackingCtx();
    const view = {
      centre: { x: 2000, y: 1500 },
      scaleX: 2.5,
      scaleY: 2.0,
      bgPath: null,
      worldW: 6144,
      worldH: 4096,
      frame: 0,
    };
    const effect = {
      render: (c) => {
        c.arc(2000, 1500, 4);
        c.arc(2040, 1470, 4);
      },
    };
    expect(drawRaceView(ctx, view, [effect])).toBe(true);
    const [centre, offset] = ctx.arcs.slice(-2);
    expect(centre.x).toBeCloseTo(RACE_VIEW_W / 2, 9);
    expect(centre.y).toBeCloseTo(RACE_VIEW_H / 2, 9);
    expect(offset.x).toBeCloseTo(RACE_VIEW_W / 2 + 40 * 2.5, 9);
    expect(offset.y).toBeCloseTo(RACE_VIEW_H / 2 - 30 * 2.0, 9);
    // An item is drawn at the race's own canvas-pixel size: a 4-world-px radius × the zoom.
    expect(centre.r).toBeCloseTo(4 * 2.5, 9);
  });
});

// ── PARTICLES-VISIBILITY-11: the panel's reference points ───────────────────────────────────────

/** A context that logs, in order, every line, circle, rectangle and racer drawn, at SCREEN position. */
function loggingCtx() {
  let m = { a: 1, d: 1, e: 0, f: 0 };
  const stack = [];
  const log = [];
  const at = (x, y) => ({ x: m.a * x + m.e, y: m.d * y + m.f });
  const known = {
    canvas: { width: RACE_VIEW_W, height: RACE_VIEW_H },
    log,
    save: () => stack.push({ ...m }),
    restore: () => {
      m = stack.pop() ?? { a: 1, d: 1, e: 0, f: 0 };
    },
    scale: (sx, sy) => {
      m = { ...m, a: m.a * sx, d: m.d * sy };
    },
    translate: (tx, ty) => {
      m = { ...m, e: m.e + m.a * tx, f: m.f + m.d * ty };
    },
    getTransform: () => ({ a: m.a, b: 0, c: 0, d: m.d, e: m.e, f: m.f }),
    lineTo: (x, y) => log.push({ op: 'line', ...at(x, y) }),
    arc: (x, y, r) => log.push({ op: 'arc', ...at(x, y), r }),
    strokeRect: (x, y, w, h) => log.push({ op: 'rect', ...at(x, y), w: w * m.a, h: h * m.d }),
  };
  return new Proxy(known, {
    get: (t, k) => (k in t ? t[k] : () => ({ addColorStop: () => {} })),
    set: (t, k, v) => {
      if (k === 'lineWidth') t.lineWidthSet = v;
      return true;
    },
  });
}

// A straight open track along x, centre points (0, 500) → (2000, 500), 300 wide.
const LINES = {
  mode: 'center',
  centerPoints: [
    { x: 0, y: 500 },
    { x: 2000, y: 500 },
  ],
  innerPoints: [],
  outerPoints: [],
  activeBoundary: 'inner',
  selectedPointIndex: -1,
  centerWidth: 300,
  closed: false,
};

describe('the track course and the racer reference', () => {
  it('the course at the centre: the nearest centre-line point, its direction, the corridor width', () => {
    const c = raceViewCourse(LINES, { x: 1000, y: 520 });
    // The nearest of 200 spline samples along 2000 world px: within one sample spacing.
    expect(Math.abs(c.x - 1000)).toBeLessThanOrEqual(2000 / 199);
    expect(c.y).toBeCloseTo(500, 6);
    expect(c.angle).toBeCloseTo(0, 6);
    expect(c.width).toBe(300);
    expect(raceViewCourse({ ...LINES, centerPoints: [] }, { x: 0, y: 0 })).toBeNull();
  });

  it('three racers side by side ACROSS the course, one start-grid slot apart, facing along it', () => {
    const p = raceViewRacerPlacements({ x: 1000, y: 500, angle: 0, width: 300 }, 60);
    expect(p).toHaveLength(3);
    expect(p.map((q) => q.x)).toEqual([1000, 1000, 1000]);
    expect(p.map((q) => q.y)).toEqual([440, 500, 560]);
    expect(p.every((q) => q.angle === 0)).toBe(true);
  });

  it('the slot is the race’s own start-grid spacing for the field', () => {
    const racerType = getRacerType('dolphin');
    const c = racerType.config;
    const behaviorConfig = DEFAULT_RACE_BEHAVIOR_CONFIG;
    const spread = behaviorConfig.startSpreadRange;
    const { physicalSpriteSize } = deriveSpriteGeometry({
      displaySize: c.displaySize,
      bodyFillX: c.bodyFillX,
      bodyFillY: c.bodyFillY,
      nRacers: RACE_VIEW_FIELD_SIZE,
      effectiveWidth: 300 * spread,
      autoScaleConfig: DEFAULT_AUTO_SCALE_CONFIG,
    });
    const rowSize = Math.ceil(
      RACE_VIEW_FIELD_SIZE /
        computeStartRowCount(300 * spread, RACE_VIEW_FIELD_SIZE, physicalSpriteSize)
    );
    // Two neighbours in a row, as the race places them (computeRowPhysicalY, ±0.5 = the edge).
    const a = computeRowPhysicalY(0, rowSize, spread) / 2;
    const b = computeRowPhysicalY(1, rowSize, spread) / 2;
    const got = raceViewRowSlotPx({
      racerType,
      trackWidthPx: 300,
      autoScaleConfig: DEFAULT_AUTO_SCALE_CONFIG,
      behaviorConfig,
      hasDisplaySizeOverride: false,
    });
    expect(rowSize).toBeGreaterThan(1);
    expect(got).toBeCloseTo((b - a) * 300, 9);
  });

  // Three zooms: the owner's racing zoom, one wide enough for the readability floor to lift the
  // racer, and one tight enough for the size ceiling to cap it — so the test tells the two steps
  // apart, and proves the bounds are applied rather than only the track-density scale.
  it('the racer scale is the race’s own: deriveSpriteGeometry, then computeRenderDisplayScale', () => {
    const racerType = getRacerType('dolphin');
    const c = racerType.config;
    // The shipped configs the race loads on a machine with nothing stored.
    const auto = DEFAULT_AUTO_SCALE_CONFIG;
    const behaviorConfig = DEFAULT_RACE_BEHAVIOR_CONFIG;
    const { displaySizeScale } = deriveSpriteGeometry({
      displaySize: c.displaySize,
      bodyFillX: c.bodyFillX,
      bodyFillY: c.bodyFillY,
      nRacers: RACE_VIEW_FIELD_SIZE,
      effectiveWidth: 300 * behaviorConfig.startSpreadRange,
      autoScaleConfig: auto,
    });
    let boundApplied = false;
    for (const scaleX of [720 / 255, 0.05, 40]) {
      const got = raceViewRacerScale({
        racerType,
        trackWidthPx: 300,
        scaleX,
        cameraConfig: OWNER,
        autoScaleConfig: auto,
        behaviorConfig,
        hasDisplaySizeOverride: false,
      });
      const want = computeRenderDisplayScale(
        c.displaySize,
        displaySizeScale,
        scaleX,
        getEffectiveMaxTargetScreenPx(c.maxTargetScreenPx, OWNER.maxTargetScreenPx),
        OWNER.minDrawnFrameFrac,
        720
      );
      expect(got).toBeCloseTo(want, 12);
      if (Math.abs(want - displaySizeScale) > 1e-9) boundApplied = true;
    }
    expect(boundApplied).toBe(true);
  });
});

describe('drawRaceView — lines, racers, and the race’s layer order', () => {
  const view = {
    centre: { x: 1000, y: 500 },
    scaleX: 2,
    scaleY: 2,
    bgPath: null,
    worldW: 2000,
    worldH: 1000,
    frame: 0,
  };
  const effect = { render: (c) => c.arc(1010, 505, 1.5) };

  it('draws the track lines, exactly three racers at the given scale, in the race’s order', () => {
    const ctx = loggingCtx();
    const drawRacer = vi.fn((c, x, y) => c.log.push({ op: 'racer', x, y }));
    const racers = {
      racerType: { drawRacer },
      displayScale: 0.77,
      placements: raceViewRacerPlacements({ x: 1000, y: 500, angle: 0, width: 300 }, 60),
    };
    drawRaceView(ctx, { ...view, lines: LINES, racers }, [effect]);

    expect(drawRacer).toHaveBeenCalledTimes(3);
    for (const call of drawRacer.mock.calls) expect(call[7]).toBe(0.77);
    // The race's order: background, effects, track markings, racers. The background draws a line of
    // its own (the top of its crowd strip), so the track lines are the ones AFTER the effect.
    const effectAt = ctx.log.findIndex((e) => e.op === 'arc' && e.r === 1.5);
    const firstRacer = ctx.log.findIndex((e) => e.op === 'racer');
    expect(effectAt).toBeGreaterThanOrEqual(0);
    expect(firstRacer).toBeGreaterThan(effectAt);
    const trackLines = ctx.log.slice(effectAt, firstRacer).filter((e) => e.op === 'line');
    expect(trackLines.length).toBeGreaterThan(0);
    expect(ctx.log.slice(firstRacer).filter((e) => e.op === 'line')).toHaveLength(0);
    // The course runs through the panel's centre row: its line points sit at y = 180 on the panel.
    expect(trackLines.some((l) => Math.abs(l.y - RACE_VIEW_H / 2) < 1e-6)).toBe(true);
  });

  it('draws neither lines nor racers when it is given none', () => {
    const ctx = loggingCtx();
    drawRaceView(ctx, view, [effect]);
    const effectAt = ctx.log.findIndex((e) => e.op === 'arc' && e.r === 1.5);
    const after = ctx.log.slice(effectAt + 1);
    expect(after.filter((e) => e.op === 'line' || e.op === 'racer')).toHaveLength(0);
  });
});

describe('the frame in the main view', () => {
  it('is exactly the panel’s world area, and its line stays 1.5 screen px', () => {
    const view = { centre: { x: 1000, y: 500 }, scaleX: 2.5, scaleY: 2 };
    const area = raceViewArea(view);
    const w = RACE_VIEW_W / 2.5;
    const h = RACE_VIEW_H / 2;
    expect(area).toEqual({ x: 1000 - w / 2, y: 500 - h / 2, w, h });
    const ctx = loggingCtx();
    drawRaceViewFrame(ctx, view, 0.25);
    const rect = ctx.log.find((e) => e.op === 'rect');
    expect(rect).toEqual({ op: 'rect', x: area.x, y: area.y, w: area.w, h: area.h });
    expect(ctx.lineWidthSet).toBeCloseTo(1.5 / 0.25, 12);
  });
});
