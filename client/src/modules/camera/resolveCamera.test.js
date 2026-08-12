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

/**
 * How far outside the inner band the target lands, in screen px, on the worse axis — the same
 * quantity the loop compares between steps, recomputed here from the PUBLIC return so the property
 * below is checked against what callers actually see rather than against an internal.
 */
function missOf(result, targetWorld, frameSize, innerFramePct) {
  const sx = (targetWorld.x - result.camX) * result.effectiveZoom;
  const sy = (targetWorld.y - result.camY) * result.effectiveZoom;
  const mx = (frameSize.width * (1 - innerFramePct)) / 2;
  const my = (frameSize.height * (1 - innerFramePct)) / 2;
  return Math.max(0, mx - sx, sx - (frameSize.width - mx), my - sy, sy - (frameSize.height - my));
}

describe('resolveCamera — widening only when widening helps (RESOLVE-CONVERGE-1)', () => {
  // Both regimes of the clamp, because they answer "does widening help" in opposite directions —
  // and a rule tested in only one of them is a rule nobody has seen take both positions.
  const CASES = [
    {
      // World WIDER than the frame, target pinned against the right world edge. The clamp holds the
      // frame at that edge, so widening slides the target further out. This is the ice-track shape.
      name: 'wide world, target at the right edge',
      args: {
        targetWorld: { x: 1250, y: 360 },
        desiredEffZoom: 2.0,
        worldBounds: WB_STANDARD,
        frameSize: FRAME,
        minEffZoom: 0.1,
      },
      expectAdapted: false,
    },
    {
      name: 'wide world, target at the left edge',
      args: {
        targetWorld: { x: 50, y: 360 },
        desiredEffZoom: 2.0,
        worldBounds: WB_STANDARD,
        frameSize: FRAME,
        minEffZoom: 1.5,
      },
      expectAdapted: false,
    },
    {
      // World already FITS the frame on X, target on the far side: the frame cannot move, but a
      // wider shot pulls the target back toward the centre. Here the loop earns its width.
      name: 'world fits the frame, target on the far side',
      args: {
        targetWorld: { x: 1100, y: 360 },
        desiredEffZoom: 1.0,
        worldBounds: WB_STANDARD,
        frameSize: FRAME,
        innerFramePct: 0.5,
        minEffZoom: 0.1,
      },
      expectAdapted: true,
    },
    {
      // The same regime on Y — a world shorter than the frame, target low in it.
      name: 'short world, target near the bottom',
      args: {
        targetWorld: { x: 640, y: 390 },
        desiredEffZoom: 1.6,
        worldBounds: { maxX: 1280, maxY: 400 },
        frameSize: FRAME,
        minEffZoom: 0.5,
      },
      expectAdapted: true,
    },
    {
      name: 'target already in the inner frame',
      args: {
        targetWorld: { x: 1600, y: 360 },
        desiredEffZoom: 1.5,
        worldBounds: WB_LARGE,
        frameSize: FRAME,
      },
      expectAdapted: false,
    },
  ];

  // THE PROPERTY. Width is only ever given away for a target that ends up closer to the inner
  // frame than it was at the zoom the caller asked for. This is the whole of the repair, and it
  // replaces two tests that asserted the old loop's INSTANCES — one of which asserted, as correct,
  // a run all the way to minEffZoom that left the target outside the frame it was widening for.
  it.each(CASES)('$name', ({ args, expectAdapted }) => {
    const pct = args.innerFramePct ?? 0.7;
    const result = resolveCamera(args);
    // The single attempt at the requested zoom: the floor raised to the desired zoom cannot step.
    const unwidened = resolveCamera({ ...args, minEffZoom: args.desiredEffZoom });
    expect(result.wasZoomAdapted).toBe(expectAdapted);
    if (!expectAdapted) {
      expect(result.effectiveZoom).toBeCloseTo(args.desiredEffZoom, 6);
    } else {
      expect(result.effectiveZoom).toBeLessThan(args.desiredEffZoom);
      expect(missOf(result, args.targetWorld, args.frameSize, pct)).toBeLessThan(
        missOf(unwidened, args.targetWorld, args.frameSize, pct)
      );
    }
    expect(result.effectiveZoom).toBeGreaterThanOrEqual((args.minEffZoom ?? 0) - 1e-9);
  });

  it('the property is not vacuous: the table holds both positions', () => {
    expect(CASES.some((c) => c.expectAdapted)).toBe(true);
    expect(CASES.some((c) => !c.expectAdapted)).toBe(true);
  });
});

describe('resolveCamera — zoom reduction (inner frame)', () => {
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
