// @vitest-environment node
// ============================================================
// File:        raceView.test.js
// Path:        client/src/screens/TrackEditor/raceView.test.js
// Project:     RaceArena — PARTICLES-VISIBILITY-10
// Description: The race-view panel's zoom is the race camera's own ordinary racing zoom, its default
//              centre is the start of the track, and an item at a world position lands where the
//              race-camera transform puts it on the panel.
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  RACE_VIEW_W,
  RACE_VIEW_H,
  raceViewScale,
  raceViewStart,
  drawRaceView,
} from './raceView.js';
import { projectionForTrack } from '../../modules/camera/projection.js';
import { resolveZoomForCorridors } from '../../modules/camera/zoomUnit.js';
import { DEFAULT_CAMERA_CONFIG } from '../../modules/storage/defaults.js';

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

  it('follows the camera config: the shipped 0.75 shows 225 world px', () => {
    const got = raceViewScale({
      worldW: 6144,
      worldH: 4096,
      isOpenTrack: true,
      trackWidthPx: 300,
      cameraConfig: DEFAULT_CAMERA_CONFIG,
    });
    expect(got.scaleY).toBeCloseTo(720 / 225, 9);
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
