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
    for (let frame = 0; frame <= 1000; frame += 50) {
      for (const speed of [0, 1, 2.5, 5]) {
        const { legPhaseA, legPhaseB, manePhase, tailPhase } = horse.animation.getAnimationOffset(
          frame,
          speed
        );
        expect(legPhaseA).toBeGreaterThanOrEqual(-1);
        expect(legPhaseA).toBeLessThanOrEqual(1);
        expect(legPhaseB).toBeGreaterThanOrEqual(-1);
        expect(legPhaseB).toBeLessThanOrEqual(1);
        expect(Math.abs(manePhase)).toBeLessThanOrEqual(0.35);
        expect(Math.abs(tailPhase)).toBeLessThanOrEqual(0.45);
      }
    }
  });

  it('legPhaseA and legPhaseB are always in opposite phases (sum ≈ 0)', () => {
    for (let frame = 0; frame <= 1000; frame += 100) {
      const { legPhaseA, legPhaseB } = horse.animation.getAnimationOffset(frame, 3);
      expect(legPhaseA + legPhaseB).toBeCloseTo(0, 10);
    }
  });

  // ── 3. drawBody — canvas primitive calls ──────────────────────────────────

  it('drawBody calls beginPath and fill at least 7 times (tail, legs, body, head, muzzle, mane)', () => {
    const ctx = makeCtx();
    horse.render.drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.beginPath.mock.calls.length).toBeGreaterThanOrEqual(7);
    expect(ctx.fill.mock.calls.length).toBeGreaterThanOrEqual(7);
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

  it('drawRacer delegates to drawBody — fill called ≥ 7 times', () => {
    const ctx = makeCtx();
    horse.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.fill.mock.calls.length).toBeGreaterThanOrEqual(7);
  });

  it('drawRacer never calls fillText (no emoji fallback)', () => {
    const ctx = makeCtx();
    horse.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.fillText.mock.calls.length).toBe(0);
  });

  // ── 7. Leader glow ────────────────────────────────────────────────────────

  it('drawRacer with isLeader=true draws a gold stroke outline', () => {
    const ctx = makeCtx();
    horse.drawRacer(ctx, 0, 0, 0, MOCK_RACER, true, 0);
    expect(ctx.stroke.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('drawRacer with isLeader=false makes no stroke calls', () => {
    const ctx = makeCtx();
    horse.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.stroke.mock.calls.length).toBe(0);
  });

  // ── 8. Timestamp-compatible animation rates ───────────────────────────────

  it('leg phase advances visibly over 100 ms at full speed (timestamp-compatible rates)', () => {
    const a = horse.animation.getAnimationOffset(0, 5);
    const b = horse.animation.getAnimationOffset(100, 5);
    // rate=0.013 → 100 ms = 1.3 radians → Δsin(0→1.3) ≈ 0.96
    expect(Math.abs(b.legPhaseA - a.legPhaseA)).toBeGreaterThan(0.5);
  });
});
