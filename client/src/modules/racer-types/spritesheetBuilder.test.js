// ============================================================
// File:        spritesheetBuilder.test.js
// Path:        client/src/modules/racer-types/spritesheetBuilder.test.js
// Project:     RaceArena
// Description: Verifies that drawSpriteFrame applies the centering offset to
//              the drawImage destination coordinates rather than via a prior
//              ctx.translate, so the animation pivot remains at canvas center.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./spriteAnimations.js', () => ({
  computeFrameTransforms: vi.fn(() => ({
    rotate: 0,
    translateX: 0,
    translateY: 0,
    scaleX: 1,
    scaleY: 1,
    shearX: 0,
    shadowScale: 1,
  })),
}));

import { drawSpriteFrame, FRAME_SIZE } from './spritesheetBuilder.js';
import { computeFrameTransforms } from './spriteAnimations.js';

const FAKE_IMG = {};
const HALF = FRAME_SIZE / 2; // 64

function makeCtx() {
  const calls = [];
  return {
    ctx: {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn((...a) => calls.push(['translate', ...a])),
      rotate: vi.fn((...a) => calls.push(['rotate', ...a])),
      scale: vi.fn(),
      transform: vi.fn(),
      drawImage: vi.fn((...a) => calls.push(['drawImage', ...a])),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      ellipse: vi.fn(),
      fill: vi.fn(),
      fillStyle: '',
    },
    calls,
  };
}

const BASE_CFG = { baseRotationOffset: 0 };

describe('drawSpriteFrame — centering offset in drawImage destination', () => {
  beforeEach(() => {
    computeFrameTransforms.mockReturnValue({
      rotate: 0,
      translateX: 0,
      translateY: 0,
      scaleX: 1,
      scaleY: 1,
      shearX: 0,
      shadowScale: 1,
    });
  });

  it('zero offset: drawImage receives (-half, -half)', () => {
    const { ctx, calls } = makeCtx();
    drawSpriteFrame(ctx, FAKE_IMG, 0, 4, BASE_CFG, 0, FRAME_SIZE, { offsetX: 0, offsetY: 0 });
    const di = calls.find((c) => c[0] === 'drawImage');
    expect(di[2]).toBe(-HALF); // dx = -64
    expect(di[3]).toBe(-HALF); // dy = -64
    expect(di[4]).toBe(FRAME_SIZE);
    expect(di[5]).toBe(FRAME_SIZE);
  });

  it('non-zero offset: drawImage destination = (-half + offsetX, -half + offsetY)', () => {
    const { ctx, calls } = makeCtx();
    drawSpriteFrame(ctx, FAKE_IMG, 0, 4, BASE_CFG, 0, FRAME_SIZE, { offsetX: 20, offsetY: 15 });
    const di = calls.find((c) => c[0] === 'drawImage');
    expect(di[2]).toBe(-HALF + 20); // -44
    expect(di[3]).toBe(-HALF + 15); // -49
  });

  it('does NOT call ctx.translate with the centering offset values', () => {
    const { ctx, calls } = makeCtx();
    drawSpriteFrame(ctx, FAKE_IMG, 0, 4, BASE_CFG, 0, FRAME_SIZE, { offsetX: 20, offsetY: 15 });
    const spurious = calls.find((c) => c[0] === 'translate' && c[1] === 20 && c[2] === 15);
    expect(spurious).toBeUndefined();
  });

  it('ctx.rotate is called before ctx.drawImage — pivot remains at canvas center', () => {
    const cfg = { baseRotationOffset: Math.PI / 2 };
    const { ctx, calls } = makeCtx();
    drawSpriteFrame(ctx, FAKE_IMG, 0, 4, cfg, 0, FRAME_SIZE, { offsetX: 30, offsetY: 0 });
    const rotIdx = calls.findIndex((c) => c[0] === 'rotate');
    const diIdx = calls.findIndex((c) => c[0] === 'drawImage');
    expect(rotIdx).toBeGreaterThanOrEqual(0);
    expect(diIdx).toBeGreaterThan(rotIdx);
    // The only translate before rotate is ctx.translate(cx=64, cy=64); no centering translate
    const translatesBeforeRotate = calls.slice(0, rotIdx).filter((c) => c[0] === 'translate');
    expect(translatesBeforeRotate).toHaveLength(1);
    expect(translatesBeforeRotate[0][1]).toBe(HALF); // cx = 64
    expect(translatesBeforeRotate[0][2]).toBe(HALF); // cy = 64
  });

  it('breathing animation: drawImage destination has centering offset, scale anchored at canvas center', () => {
    computeFrameTransforms.mockReturnValueOnce({
      rotate: 0,
      translateX: 0,
      translateY: 0,
      scaleX: 1.05,
      scaleY: 1.05,
      shearX: 0,
      shadowScale: 1,
    });
    const { ctx, calls } = makeCtx();
    drawSpriteFrame(ctx, FAKE_IMG, 4, 8, BASE_CFG, 0, FRAME_SIZE, { offsetX: 25, offsetY: 10 });
    const di = calls.find((c) => c[0] === 'drawImage');
    expect(di[2]).toBe(-HALF + 25); // -39
    expect(di[3]).toBe(-HALF + 10); // -54
    // No centering translate before scale
    const scaleIdx = calls.findIndex((c) => c[0] === 'scale' || c[0] === 'drawImage');
    const spurious = calls.slice(0, scaleIdx).find((c) => c[0] === 'translate' && c[1] === 25);
    expect(spurious).toBeUndefined();
  });

  it('shear branch: both drawImage calls receive the centering offset', () => {
    computeFrameTransforms.mockReturnValueOnce({
      rotate: 0,
      translateX: 0,
      translateY: 0,
      scaleX: 1,
      scaleY: 1,
      shearX: 0.1, // triggers shear branch
      shadowScale: 1,
    });
    const { ctx, calls } = makeCtx();
    drawSpriteFrame(ctx, FAKE_IMG, 0, 4, BASE_CFG, 0, FRAME_SIZE, { offsetX: 10, offsetY: 5 });
    const draws = calls.filter((c) => c[0] === 'drawImage');
    expect(draws).toHaveLength(2);
    expect(draws[0][2]).toBe(-HALF + 10);
    expect(draws[0][3]).toBe(-HALF + 5);
    expect(draws[1][2]).toBe(-HALF + 10);
    expect(draws[1][3]).toBe(-HALF + 5);
  });
});
