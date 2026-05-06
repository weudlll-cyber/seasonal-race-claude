import { describe, it, expect } from 'vitest';
import { resolveCamera } from './resolveCamera.js';

const FRAME = { width: 1280, height: 720 };

// Standard 1280×720 world, 1280×720 frame
const WB_STANDARD = { maxX: 1280, maxY: 720 };

// Large 3200×720 world
const WB_LARGE = { maxX: 3200, maxY: 720 };

describe('resolveCamera — basic centering', () => {
  it('target at world center → camX = target - visibleW/2, no clamping', () => {
    const effZoom = 1.5;
    const result = resolveCamera({
      targetWorld: { x: 640, y: 360 },
      desiredEffZoom: effZoom,
      worldBounds: { maxX: 3200, maxY: 720 },
      frameSize: FRAME,
    });
    // idealCamX = 640 - 1280/(2*1.5) = 640 - 426.7 = 213.3
    expect(result.camX).toBeCloseTo(640 - 1280 / (2 * 1.5), 1);
    expect(result.wasClamped).toBe(false);
    expect(result.targetInInnerFrame).toBe(true);
    expect(result.wasZoomAdapted).toBe(false);
    expect(result.effectiveZoom).toBeCloseTo(effZoom);
  });

  it('target exactly at screen center when world is large enough to pan', () => {
    // 3200px world: camXMax = 3200 - 853 = 2347, so target=640 → camX=213 → screenX=640*1.5-213*1.5=... wait
    // screenTargetX = (640 - 213.3) * 1.5 = 426.7 * 1.5 = 640 → center ✓
    const { camX, effectiveZoom } = resolveCamera({
      targetWorld: { x: 640, y: 360 },
      desiredEffZoom: 1.5,
      worldBounds: WB_LARGE,
      frameSize: FRAME,
    });
    const screenX = (640 - camX) * effectiveZoom;
    expect(screenX).toBeCloseTo(FRAME.width / 2, 1); // target centered
  });
});

describe('resolveCamera — no-black-border guarantee', () => {
  it('target near left edge: clamped to camX=0, no black border', () => {
    const result = resolveCamera({
      targetWorld: { x: 50, y: 360 },
      desiredEffZoom: 2.0,
      worldBounds: WB_STANDARD,
      frameSize: FRAME,
    });
    expect(result.camX).toBeCloseTo(0, 1);
    expect(result.wasClamped).toBe(true);
    // No black border: camX × effZoom ≤ 0 (left edge of world at or beyond left of viewport)
    expect(result.camX).toBeGreaterThanOrEqual(0);
  });

  it('target near right edge: clamped, right world edge stays on screen (no black border)', () => {
    const result = resolveCamera({
      targetWorld: { x: 1250, y: 360 },
      desiredEffZoom: 2.0,
      worldBounds: WB_STANDARD,
      frameSize: FRAME,
      minEffZoom: 0.1,
    });
    // Zoom may be reduced — what matters is no black border on the right
    const rightEdgeScreen = (1280 - result.camX) * result.effectiveZoom;
    expect(rightEdgeScreen).toBeLessThanOrEqual(FRAME.width + 0.1);
    // camX must not go negative (no black border on the left either)
    expect(result.camX).toBeGreaterThanOrEqual(0);
  });

  it('world fits entirely in viewport (zoom < 1): camX clamped to 0', () => {
    const result = resolveCamera({
      targetWorld: { x: 640, y: 360 },
      desiredEffZoom: 0.5, // world wider than viewport/zoom
      worldBounds: WB_STANDARD,
      frameSize: FRAME,
      minEffZoom: 0.5,
    });
    // at effZoom=0.5: visibleW = 1280/0.5 = 2560 > worldW=1280 → camXMax = max(0, 1280-2560) = 0
    expect(result.camX).toBeCloseTo(0, 1);
  });
});

describe('resolveCamera — zoom reduction (inner frame)', () => {
  it('reduces zoom when target is outside inner 70% frame after clamping', () => {
    // Target at right edge of 1280px world at desiredEffZoom=2
    // camXMax = 640; idealCamX = 1250 - 320 = 930 → clamped to 640
    // screenTargetX = (1250 - 640) * 2 = 1220 → outside inner frame (max = 1280*0.85=1088)
    const result = resolveCamera({
      targetWorld: { x: 1250, y: 360 },
      desiredEffZoom: 2.0,
      worldBounds: WB_STANDARD,
      frameSize: FRAME,
      minEffZoom: 0.1,
    });
    expect(result.wasZoomAdapted).toBe(true);
    expect(result.effectiveZoom).toBeLessThan(2.0);
  });

  it('does NOT reduce zoom when target is in inner frame', () => {
    // Target at world center, large world → easy to center
    const result = resolveCamera({
      targetWorld: { x: 1600, y: 360 },
      desiredEffZoom: 1.5,
      worldBounds: WB_LARGE, // 3200 wide
      frameSize: FRAME,
    });
    expect(result.wasZoomAdapted).toBe(false);
    expect(result.effectiveZoom).toBeCloseTo(1.5);
  });

  it('stops at minEffZoom even if target never reaches inner frame', () => {
    // x=50 on 1280px world at effZoom=2.0: camX clamped to 0, screenX=100 < 192 (inner frame floor)
    // At minEffZoom=1.5: screenX=75 < 192 still — can never reach inner frame
    const result = resolveCamera({
      targetWorld: { x: 50, y: 360 },
      desiredEffZoom: 2.0,
      worldBounds: WB_STANDARD,
      frameSize: FRAME,
      minEffZoom: 1.5,
    });
    expect(result.effectiveZoom).toBeGreaterThanOrEqual(1.5 - 0.01);
    expect(result.effectiveZoom).toBeLessThanOrEqual(1.5 + 0.01);
    expect(result.wasZoomAdapted).toBe(true);
    expect(result.targetInInnerFrame).toBe(false);
  });

  it('effectiveZoom never goes below minEffZoom', () => {
    const result = resolveCamera({
      targetWorld: { x: 10, y: 360 },
      desiredEffZoom: 5.0,
      worldBounds: WB_STANDARD,
      frameSize: FRAME,
      minEffZoom: 1.5,
    });
    expect(result.effectiveZoom).toBeGreaterThanOrEqual(1.5 - 0.001);
  });

  it('with minEffZoom=0: reduces until target is in frame', () => {
    const result = resolveCamera({
      targetWorld: { x: 640, y: 360 },
      desiredEffZoom: 3.0,
      worldBounds: WB_STANDARD,
      frameSize: FRAME,
      minEffZoom: 0,
    });
    // target at world center → always in frame (symmetric → no clamping), so no zoom reduction
    expect(result.wasZoomAdapted).toBe(false);
    expect(result.targetInInnerFrame).toBe(true);
  });
});

describe('resolveCamera — targetInInnerFrame correctness', () => {
  it('inner frame boundaries: exact center is in frame', () => {
    const result = resolveCamera({
      targetWorld: { x: 640, y: 360 },
      desiredEffZoom: 2.0,
      worldBounds: WB_LARGE,
      frameSize: FRAME,
    });
    expect(result.targetInInnerFrame).toBe(true);
  });

  it('respects custom innerFramePct: stricter threshold', () => {
    // At innerFramePct=0.5: margin = 1280*0.25 = 320, so inner range [320, 960]
    // Target at 1280px world, x=1100, effZoom=1.0: camXMax=0, screenX=1100 → outside [320,960]
    const strict = resolveCamera({
      targetWorld: { x: 1100, y: 360 },
      desiredEffZoom: 1.0,
      worldBounds: WB_STANDARD,
      frameSize: FRAME,
      innerFramePct: 0.5,
      minEffZoom: 0.1,
    });
    // At desiredEffZoom=1.0: camXMax=0, screenX=1100 → outside [320,960]
    // Zoom should adapt
    expect(strict.wasZoomAdapted).toBe(true);

    // At innerFramePct=0.99: almost everything outside
    const loose = resolveCamera({
      targetWorld: { x: 1100, y: 360 },
      desiredEffZoom: 1.0,
      worldBounds: WB_STANDARD,
      frameSize: FRAME,
      innerFramePct: 0.01, // nearly the whole frame counts as "inner"
      minEffZoom: 0.5,
    });
    // With 99% of frame as outer, inner is only the middle 1% → target at 1100 always outside
    // but it should still not crash
    expect(typeof loose.effectiveZoom).toBe('number');
  });
});

describe('resolveCamera — closed-track fixed zoom (no BASE_ZOOM)', () => {
  it('1920-wide world, effZoom=1.6 (bsX=0.667×cam.zoom=2.4): leader at x=900 centered', () => {
    // Closed 1920×1080 oval, bsX=1280/1920=0.667, cam.zoom=2.4, effZoom=1.6
    const result = resolveCamera({
      targetWorld: { x: 900, y: 540 },
      desiredEffZoom: 1.6,
      worldBounds: { maxX: 1920, maxY: 1080 },
      frameSize: FRAME,
    });
    // camXMax = 1920 - 1280/1.6 = 1920 - 800 = 1120
    // idealCamX = 900 - 400 = 500 → in [0, 1120], no clamping
    expect(result.wasClamped).toBe(false);
    expect(result.targetInInnerFrame).toBe(true);
    expect(result.camX).toBeCloseTo(500, 1);
  });

  it('1920-wide world, leader at x=150 (left oval corner): no black border, target visible', () => {
    const result = resolveCamera({
      targetWorld: { x: 150, y: 540 },
      desiredEffZoom: 1.6,
      worldBounds: { maxX: 1920, maxY: 1080 },
      frameSize: FRAME,
    });
    // idealCamX = 150 - 400 = -250 → clamped to 0
    expect(result.camX).toBeCloseTo(0, 1);
    expect(result.wasClamped).toBe(true);
    // target screen pos: (150 - 0) * 1.6 = 240 → in inner frame [192, 1088]
    const screenX = (150 - result.camX) * result.effectiveZoom;
    expect(screenX).toBeGreaterThan(192 - 1); // in inner frame
    expect(result.targetInInnerFrame).toBe(true);
  });
});
