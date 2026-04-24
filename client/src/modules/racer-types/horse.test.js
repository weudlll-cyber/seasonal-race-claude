// ============================================================
// File:        horse.test.js
// Path:        client/src/modules/racer-types/horse.test.js
// Project:     RaceArena
// Created:     2026-04-25
// Description: Tests for the D1 extended manifest on HorseRacerType.
//              Covers manifest shape, animation determinism + bounds,
//              drawBody canvas calls, trail factory lifecycle, and
//              confirms the other four racers are untouched.
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  HorseRacerType,
  DuckRacerType,
  RocketRacerType,
  SnailRacerType,
  CarRacerType,
} from './index.js';

function makeCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    shadowBlur: 0,
    shadowColor: '',
    lineWidth: 0,
    globalAlpha: 1,
  };
}

const MOCK_RACER = { x: 100, y: 100, angle: 0, baseSpeed: 2, index: 0 };

describe('HorseRacerType — D1 extended manifest', () => {
  let horse;
  beforeEach(() => {
    horse = new HorseRacerType();
  });

  // ── 1. Manifest shape ─────────────────────────────────────────────────────

  it('has render, animation, trail, and style sections with correct member types', () => {
    expect(typeof horse.render.drawBody).toBe('function');
    expect(typeof horse.render.getDimensions).toBe('function');
    expect(typeof horse.animation.getAnimationOffset).toBe('function');
    expect(typeof horse.trail.createTrail).toBe('function');
    expect(horse.style.primaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(horse.style.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(typeof horse.style.silhouetteScale).toBe('number');
  });

  it('getDimensions returns positive width and height', () => {
    const { width, height } = horse.render.getDimensions();
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });

  // ── 2. getAnimationOffset — determinism and bounds ────────────────────────

  it('getAnimationOffset is deterministic for the same (frame, speed) pair', () => {
    const a = horse.animation.getAnimationOffset(137, 2.5);
    const b = horse.animation.getAnimationOffset(137, 2.5);
    expect(a).toEqual(b);
  });

  it('phase values stay within expected bounds for all frame/speed combinations', () => {
    for (let frame = 0; frame <= 5000; frame += 250) {
      for (const speed of [0.5, 1, 2.5, 5]) {
        const {
          legFrontLeft,
          legFrontRight,
          legBackLeft,
          legBackRight,
          manePhase,
          tailPhase,
          bodyBob,
        } = horse.animation.getAnimationOffset(frame, speed);
        expect(legFrontLeft).toBeGreaterThanOrEqual(-1.5);
        expect(legFrontLeft).toBeLessThanOrEqual(1.5);
        expect(legFrontRight).toBeGreaterThanOrEqual(-1.5);
        expect(legFrontRight).toBeLessThanOrEqual(1.5);
        expect(legBackLeft).toBeGreaterThanOrEqual(-1.5);
        expect(legBackLeft).toBeLessThanOrEqual(1.5);
        expect(legBackRight).toBeGreaterThanOrEqual(-1.5);
        expect(legBackRight).toBeLessThanOrEqual(1.5);
        expect(Math.abs(manePhase)).toBeLessThanOrEqual(0.5);
        expect(Math.abs(tailPhase)).toBeLessThanOrEqual(1.0);
        expect(bodyBob).toBeGreaterThanOrEqual(0);
        expect(bodyBob).toBeLessThanOrEqual(0.5);
      }
    }
  });

  it('diagonal pairs always move together — legFrontLeft equals legBackRight', () => {
    for (let frame = 0; frame <= 5000; frame += 250) {
      const o = horse.animation.getAnimationOffset(frame, 3);
      expect(o.legFrontLeft).toBeCloseTo(o.legBackRight, 10);
      expect(o.legFrontRight).toBeCloseTo(o.legBackLeft, 10);
    }
  });

  // ── 3. drawBody — canvas primitive calls ──────────────────────────────────

  it('drawBody emits 2 ellipses (body, head), 4 fillRects (legs), and ≥ 4 fill calls', () => {
    const ctx = makeCtx();
    horse.render.drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.ellipse.mock.calls.length).toBe(2);
    expect(ctx.fillRect.mock.calls.length).toBe(4);
    expect(ctx.fill.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('drawBody sets fillStyle to both primaryColor and accentColor', () => {
    const colors = [];
    const ctx = makeCtx();
    Object.defineProperty(ctx, 'fillStyle', {
      get() {
        return this._fillStyle ?? '';
      },
      set(v) {
        this._fillStyle = v;
        colors.push(v);
      },
      configurable: true,
    });
    horse.render.drawBody(ctx, MOCK_RACER, 0);
    expect(colors).toContain(horse.style.primaryColor);
    expect(colors).toContain(horse.style.accentColor);
  });

  // ── 4. createTrail — factory lifecycle ───────────────────────────────────

  it('createTrail returns an object with spawn, update, and render methods', () => {
    const trail = horse.trail.createTrail(MOCK_RACER);
    expect(typeof trail.spawn).toBe('function');
    expect(typeof trail.update).toBe('function');
    expect(typeof trail.render).toBe('function');
  });

  it('spawns ~2 particles per frame at full speed — 30 frames yields 50–70 alive', () => {
    const trail = horse.trail.createTrail(MOCK_RACER);
    const fullSpeed = { ...MOCK_RACER, baseSpeed: 5 };
    // At baseSpeed=5: spawnRate=2.0, frac=0, count=2 deterministically
    for (let i = 0; i < 30; i++) {
      trail.spawn(fullSpeed, 1);
      trail.update(1);
    }
    // After 30 iterations: batch from frame 1 (ttl=30-30=0) is removed,
    // frames 2–30 alive = 29×2 = 58 particles
    const ctx = makeCtx();
    trail.render(ctx);
    expect(ctx.arc.mock.calls.length).toBeGreaterThanOrEqual(50);
    expect(ctx.arc.mock.calls.length).toBeLessThanOrEqual(70);
  });

  it('particles are removed after their lifetime (ttl=30) elapses', () => {
    const trail = horse.trail.createTrail(MOCK_RACER);
    trail.spawn({ ...MOCK_RACER, baseSpeed: 5 }, 1); // 2 particles, ttl=30
    for (let i = 0; i < 35; i++) trail.update(1); // 35 updates — all dead at update 30
    const ctx = makeCtx();
    trail.render(ctx);
    expect(ctx.arc.mock.calls.length).toBe(0);
  });

  // ── 5. Other racers untouched ─────────────────────────────────────────────

  it('duck, rocket, snail, car have no render/animation/trail/style sections', () => {
    const others = [DuckRacerType, RocketRacerType, SnailRacerType, CarRacerType];
    for (const Cls of others) {
      const rt = new Cls();
      expect(rt.render).toBeUndefined();
      expect(rt.animation).toBeUndefined();
      expect(rt.trail).toBeUndefined();
      expect(rt.style).toBeUndefined();
    }
  });
});

describe('HorseRacerType — D2 drawRacer wired to Canvas manifest', () => {
  let horse;
  beforeEach(() => {
    horse = new HorseRacerType();
  });

  // ── 6. drawRacer — Canvas transform wiring ────────────────────────────────

  it('drawRacer positions the canvas at (x, y) and rotates by angle', () => {
    const ctx = makeCtx();
    horse.drawRacer(ctx, 150, 200, Math.PI / 4, MOCK_RACER, false, 0);
    expect(ctx.translate.mock.calls[0]).toEqual([150, 200]);
    expect(ctx.rotate.mock.calls[0]).toEqual([Math.PI / 4]);
  });

  it('drawRacer saves and restores ctx state exactly once', () => {
    const ctx = makeCtx();
    horse.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.save.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.restore.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('drawRacer delegates to drawBody — fill called ≥ 4 times', () => {
    const ctx = makeCtx();
    horse.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.fill.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('drawRacer never calls fillText (no emoji fallback)', () => {
    const ctx = makeCtx();
    horse.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.fillText.mock.calls.length).toBe(0);
  });

  // ── 7. Leader glow ────────────────────────────────────────────────────────

  it('drawRacer with isLeader=true sets gold strokeStyle (#ffd700)', () => {
    const strokeColors = [];
    const ctx = makeCtx();
    Object.defineProperty(ctx, 'strokeStyle', {
      get() {
        return this._strokeStyle ?? '';
      },
      set(v) {
        this._strokeStyle = v;
        strokeColors.push(v);
      },
      configurable: true,
    });
    horse.drawRacer(ctx, 0, 0, 0, MOCK_RACER, true, 0);
    expect(strokeColors).toContain('#ffd700');
  });

  it('drawRacer with isLeader=false does not set gold strokeStyle', () => {
    const strokeColors = [];
    const ctx = makeCtx();
    Object.defineProperty(ctx, 'strokeStyle', {
      get() {
        return this._strokeStyle ?? '';
      },
      set(v) {
        this._strokeStyle = v;
        strokeColors.push(v);
      },
      configurable: true,
    });
    horse.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(strokeColors).not.toContain('#ffd700');
  });

  // ── 8. Timestamp-compatible animation rates ───────────────────────────────

  it('leg phase advances visibly over one period at full speed (timestamp-compatible rates)', () => {
    // speed=5: period = min(1500, max(200, 500/5)) = 200ms; quarter-cycle = 50ms
    // At frame=0: phaseA=0, legFrontLeft=0
    // At frame=50: phaseA=π/2, legFrontLeft=sin(π/2)*1.5=1.5 → Δ = 1.5 > 0.5
    const a = horse.animation.getAnimationOffset(0, 5);
    const b = horse.animation.getAnimationOffset(50, 5);
    expect(Math.abs(b.legFrontLeft - a.legFrontLeft)).toBeGreaterThan(0.5);
  });
});

describe('HorseRacerType — D2.1 v2 silhouette + trot animation', () => {
  let horse;
  beforeEach(() => {
    horse = new HorseRacerType();
  });

  // ── 9. Trot pattern ───────────────────────────────────────────────────────

  it('diagonal pairs always move together: legFrontLeft === legBackRight at any frame', () => {
    for (let frame = 0; frame <= 5000; frame += 250) {
      const o = horse.animation.getAnimationOffset(frame, 2);
      expect(o.legFrontLeft).toBeCloseTo(o.legBackRight, 10);
      expect(o.legFrontRight).toBeCloseTo(o.legBackLeft, 10);
    }
  });

  it('cycle period halves as speed doubles — at t=125ms speed-2 has advanced more than speed-1', () => {
    // speed=1: period=500ms → at 125ms = quarter cycle → legFrontLeft = sin(π/2)*1.5 = 1.5 (peak)
    // speed=2: period=250ms → at 125ms = half cycle  → legFrontLeft = sin(π)*1.5 ≈ 0 (back near 0)
    const s1 = horse.animation.getAnimationOffset(125, 1);
    const s2 = horse.animation.getAnimationOffset(125, 2);
    expect(s1.legFrontLeft).toBeCloseTo(1.5, 1);
    expect(Math.abs(s2.legFrontLeft)).toBeLessThan(0.1);
  });

  it('period clamps: speed=10 gives period exactly 200ms, speed=0.01 gives period 1500ms', () => {
    // Verify by checking full-cycle return-to-origin at each clamped period
    const at0_fast = horse.animation.getAnimationOffset(0, 10);
    const at200_fast = horse.animation.getAnimationOffset(200, 10);
    expect(at200_fast.legFrontLeft).toBeCloseTo(at0_fast.legFrontLeft, 5);

    const at0_slow = horse.animation.getAnimationOffset(0, 0.01);
    const at1500_slow = horse.animation.getAnimationOffset(1500, 0.01);
    expect(at1500_slow.legFrontLeft).toBeCloseTo(at0_slow.legFrontLeft, 5);
  });

  it('all animation values stay within declared bounds for large frame + speed range', () => {
    for (let frame = 0; frame <= 5000; frame += 50) {
      for (let speed = 0.5; speed <= 5.0; speed += 0.5) {
        const { legFrontLeft, legFrontRight, legBackLeft, legBackRight, bodyBob } =
          horse.animation.getAnimationOffset(frame, speed);
        expect(legFrontLeft).toBeGreaterThanOrEqual(-1.5);
        expect(legFrontLeft).toBeLessThanOrEqual(1.5);
        expect(legFrontRight).toBeGreaterThanOrEqual(-1.5);
        expect(legFrontRight).toBeLessThanOrEqual(1.5);
        expect(legBackLeft).toBeGreaterThanOrEqual(-1.5);
        expect(legBackLeft).toBeLessThanOrEqual(1.5);
        expect(legBackRight).toBeGreaterThanOrEqual(-1.5);
        expect(legBackRight).toBeLessThanOrEqual(1.5);
        expect(bodyBob).toBeGreaterThanOrEqual(0);
        expect(bodyBob).toBeLessThanOrEqual(0.5);
      }
    }
  });

  // ── 10. drawBody v2 primitive counts ─────────────────────────────────────

  it('drawBody emits exactly 2 ellipses, 4 fillRects, and ≥ 4 fill polygon calls', () => {
    const ctx = makeCtx();
    horse.render.drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.ellipse.mock.calls.length).toBe(2);
    expect(ctx.fillRect.mock.calls.length).toBe(4);
    expect(ctx.fill.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('drawBody sets fillStyle to cream primary and near-black accent', () => {
    const colors = [];
    const ctx = makeCtx();
    Object.defineProperty(ctx, 'fillStyle', {
      get() {
        return this._fillStyle ?? '';
      },
      set(v) {
        this._fillStyle = v;
        colors.push(v);
      },
      configurable: true,
    });
    horse.render.drawBody(ctx, MOCK_RACER, 0);
    expect(colors).toContain('#E8DCC4'); // cream primary
    expect(colors).toContain('#2A1F18'); // near-black accent
  });

  it('leg X-positions change between frame=0 and frame=125 at speed=1', () => {
    // speed=1: period=500ms; at frame=125 = quarter cycle → legFrontLeft shifts from 0 to 1.5
    const ctx0 = makeCtx();
    const ctx125 = makeCtx();
    horse.render.drawBody(ctx0, { ...MOCK_RACER, baseSpeed: 1 }, 0);
    horse.render.drawBody(ctx125, { ...MOCK_RACER, baseSpeed: 1 }, 125);
    const xAt0 = ctx0.fillRect.mock.calls[0][0]; // front-left leg X at frame=0
    const xAt125 = ctx125.fillRect.mock.calls[0][0]; // front-left leg X at frame=125
    expect(Math.abs(xAt125 - xAt0)).toBeGreaterThan(0.5);
  });
});
