import { describe, it, expect } from 'vitest';
import {
  OPEN_TRACK_BASE_ZOOM,
  effectiveZoom,
  openTrackPanBounds,
  openTrackPanTarget,
} from './openTrackCamera.js';

describe('openTrackCamera', () => {
  it('OPEN_TRACK_BASE_ZOOM is 1.5', () => {
    expect(OPEN_TRACK_BASE_ZOOM).toBe(1.5);
  });

  describe('effectiveZoom', () => {
    it('base 1.5 × director 1.6 = 2.4', () => {
      expect(effectiveZoom(1.6)).toBeCloseTo(2.4);
    });

    it('base 1.5 × director 1.0 = 1.5', () => {
      expect(effectiveZoom(1.0)).toBeCloseTo(1.5);
    });

    it('treats falsy directorZoom as 1', () => {
      expect(effectiveZoom(0)).toBeCloseTo(1.5);
      expect(effectiveZoom(null)).toBeCloseTo(1.5);
    });
  });

  describe('openTrackPanBounds', () => {
    const CW = 1280;
    const CH = 720;

    it('ww=1280 at base zoom 1.5: visibleWorldW=853, camXMax=427', () => {
      const { camXMax } = openTrackPanBounds(1280, CH, CW, CH, 1.5);
      // visibleW = 1280/1.5 ≈ 853.3; camXMax = 1280 - 853.3 ≈ 426.7
      expect(camXMax).toBeCloseTo(1280 - CW / 1.5);
    });

    it('ww=3200 at base zoom 1.5: camXMax=2347', () => {
      const { camXMax } = openTrackPanBounds(3200, CH, CW, CH, 1.5);
      expect(camXMax).toBeCloseTo(3200 - CW / 1.5);
    });

    it('camXMax is never negative', () => {
      // tiny world at high zoom — clamp to 0
      const { camXMax } = openTrackPanBounds(100, 100, 1280, 720, 1.5);
      expect(camXMax).toBe(0);
    });

    it('background always covers viewport: camXMax + visibleW = worldWidth', () => {
      const ww = 1280;
      const effZoom = 1.5;
      const { camXMax } = openTrackPanBounds(ww, CH, CW, CH, effZoom);
      const visibleW = CW / effZoom;
      expect(camXMax + visibleW).toBeCloseTo(ww);
    });
  });

  describe('openTrackPanTarget', () => {
    const CW = 1280;
    const CH = 720;

    it('3 racers at x=200,600,1000 ww=1280 zoom=1.5 → targetX≈173.5', () => {
      const racers = [
        { x: 200, y: 360 },
        { x: 600, y: 360 },
        { x: 1000, y: 360 },
      ];
      const effZoom = 1.5;
      const { camXMax } = openTrackPanBounds(1280, CH, CW, CH, effZoom);
      const { targetX } = openTrackPanTarget(racers, CW, CH, effZoom, camXMax, 0);
      // midX=600, visibleW=853.3, target = 600 - 426.7 = 173.3
      expect(targetX).toBeCloseTo(600 - CW / effZoom / 2, 0);
    });

    it('clamps to 0 when racer is near left edge: x=100 zoom=2.4', () => {
      const racers = [{ x: 100, y: 360 }];
      const effZoom = 2.4;
      const { camXMax } = openTrackPanBounds(1280, CH, CW, CH, effZoom);
      const { targetX } = openTrackPanTarget(racers, CW, CH, effZoom, camXMax, 0);
      // midX=100, visibleW=533, target = 100-266.5 = -166.5 → clamped to 0
      expect(targetX).toBe(0);
    });

    it('clamps to camXMax when racer is near right edge', () => {
      const racers = [{ x: 1280, y: 360 }];
      const effZoom = 1.5;
      const { camXMax } = openTrackPanBounds(1280, CH, CW, CH, effZoom);
      const { targetX } = openTrackPanTarget(racers, CW, CH, effZoom, camXMax, 0);
      expect(targetX).toBe(camXMax);
    });
  });
});
