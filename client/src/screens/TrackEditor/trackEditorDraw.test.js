// ============================================================
// File:        trackEditorDraw.test.js
// Path:        client/src/screens/TrackEditor/trackEditorDraw.test.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: Unit tests for drawStaticScene (Track Editor visibility improvements)
//              Verifies overlay rendering, thicker lines, and improved control points.
//              A5 — track editor visibility tests
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drawStaticScene } from './trackEditorDraw.js';

vi.mock('../../modules/track-editor/catmullRom.js', () => ({
  catmullRomSpline: vi.fn((pts) => pts.map((p) => ({ x: p.x, y: p.y }))),
  offsetCurve: vi.fn((pts) => pts.map((p) => ({ x: p.x + 1, y: p.y + 1 }))),
}));

function makeFakeCtx() {
  const calls = [];
  const record =
    (name) =>
    (...args) =>
      calls.push({ name, args });

  return {
    calls,
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    beginPath: record('beginPath'),
    arc: record('arc'),
    fill: record('fill'),
    stroke: record('stroke'),
    fillRect: record('fillRect'),
    strokeRect: record('strokeRect'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    closePath: record('closePath'),
    setLineDash: record('setLineDash'),
    drawImage: record('drawImage'),
  };
}

const POINTS_3 = [
  { x: 100, y: 100 },
  { x: 200, y: 150 },
  { x: 300, y: 100 },
];

describe('drawStaticScene — smoke tests', () => {
  let ctx;

  beforeEach(() => {
    ctx = makeFakeCtx();
  });

  it('runs without throwing for empty state', () => {
    expect(() => drawStaticScene(ctx, {})).not.toThrow();
  });

  it('runs without throwing for null state', () => {
    expect(() => drawStaticScene(ctx, null)).not.toThrow();
  });

  it('fills background when no bgImage is provided', () => {
    drawStaticScene(ctx, {});
    expect(ctx.calls.some((c) => c.name === 'fillRect')).toBe(true);
  });

  it('calls drawImage when bgImage is provided', () => {
    const bgImage = { width: 1280, height: 720 };
    drawStaticScene(ctx, { bgImage });
    expect(ctx.calls.some((c) => c.name === 'drawImage')).toBe(true);
  });
});

describe('drawStaticScene — A1: dark overlay', () => {
  let ctx;
  const alphaValues = [];

  beforeEach(() => {
    ctx = makeFakeCtx();
    alphaValues.length = 0;

    const originalFillRect = ctx.fillRect;
    ctx.fillRect = (...args) => {
      alphaValues.push({ alpha: ctx.globalAlpha, fillStyle: ctx.fillStyle });
      originalFillRect(...args);
    };
  });

  it('draws a fillRect with opacity ~0.35 and black fill after background', () => {
    drawStaticScene(ctx, {});
    const overlayCall = alphaValues.find(
      (v) => Math.abs(v.alpha - 0.35) < 0.01 && v.fillStyle === '#000000'
    );
    expect(overlayCall).toBeDefined();
  });

  it('resets globalAlpha to 1 after overlay', () => {
    drawStaticScene(ctx, { centerPoints: POINTS_3, mode: 'center' });
    expect(ctx.globalAlpha).not.toBe(0.35);
  });
});

describe('drawStaticScene — A2: thicker lines', () => {
  it('draws center line with lineWidth >= 3', () => {
    const ctx = makeFakeCtx();
    const lineWidths = [];
    ctx.stroke = () => lineWidths.push(ctx.lineWidth);

    drawStaticScene(ctx, { centerPoints: POINTS_3, mode: 'center', closed: false });

    expect(lineWidths.some((w) => w >= 3)).toBe(true);
  });

  it('draws width-boundary dashes with lineWidth >= 1.5', () => {
    const ctx = makeFakeCtx();
    const lineWidths = [];
    ctx.stroke = () => lineWidths.push(ctx.lineWidth);

    drawStaticScene(ctx, { centerPoints: POINTS_3, mode: 'center', centerWidth: 120 });

    expect(lineWidths.some((w) => w >= 1.5)).toBe(true);
  });

  it('draws boundary-mode curves with lineWidth >= 3', () => {
    const ctx = makeFakeCtx();
    const lineWidths = [];
    ctx.stroke = () => lineWidths.push(ctx.lineWidth);

    drawStaticScene(ctx, {
      mode: 'boundary',
      innerPoints: POINTS_3,
      outerPoints: POINTS_3,
      activeBoundary: 'inner',
    });

    expect(lineWidths.some((w) => w >= 3)).toBe(true);
  });
});

describe('drawStaticScene — A3: improved control points', () => {
  it('draws center control points with white fill', () => {
    const ctx = makeFakeCtx();
    const fillStyles = [];
    ctx.fill = () => fillStyles.push(ctx.fillStyle);

    drawStaticScene(ctx, { centerPoints: POINTS_3, mode: 'center' });

    expect(fillStyles.some((f) => f === '#ffffff')).toBe(true);
  });

  it('draws center control points with radius >= 7', () => {
    const ctx = makeFakeCtx();
    const radii = [];
    ctx.arc = (...args) => radii.push(args[2]);

    drawStaticScene(ctx, { centerPoints: POINTS_3, mode: 'center', selectedPointIndex: -1 });

    expect(radii.some((r) => r >= 7)).toBe(true);
  });

  it('draws selected ring with radius >= 12', () => {
    const ctx = makeFakeCtx();
    const radii = [];
    ctx.arc = (...args) => radii.push(args[2]);

    drawStaticScene(ctx, { centerPoints: POINTS_3, mode: 'center', selectedPointIndex: 0 });

    expect(radii.some((r) => r >= 12)).toBe(true);
  });

  it('draws inactive boundary points with radius >= 5', () => {
    const ctx = makeFakeCtx();
    const arcCalls = [];
    ctx.arc = (...args) => arcCalls.push(args);

    drawStaticScene(ctx, {
      mode: 'boundary',
      innerPoints: POINTS_3,
      outerPoints: POINTS_3,
      activeBoundary: 'inner',
    });

    // At least one arc with radius >= 5 among inactive-opacity draws
    expect(arcCalls.some((a) => a[2] >= 5)).toBe(true);
  });

  it('draws control points with dark stroke (not white)', () => {
    const ctx = makeFakeCtx();
    const strokeStyles = [];
    ctx.stroke = () => strokeStyles.push(ctx.strokeStyle);

    drawStaticScene(ctx, { centerPoints: POINTS_3, mode: 'center' });

    expect(strokeStyles.some((s) => s === '#222222')).toBe(true);
  });
});
