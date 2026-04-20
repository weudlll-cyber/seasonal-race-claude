// ============================================================
// File:        track-canvas.test.js
// Path:        client/src/modules/track-canvas/track-canvas.test.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Tests for track canvas module
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateOvalTrack, getTrackLayout, createCanvasRenderer } from './index.js';

describe('Track Canvas Module', () => {
  let mockCanvas;
  let mockContext;

  beforeEach(() => {
    // Mock canvas and context
    mockContext = {
      clearRect: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      fillText: vi.fn(),
      setLineDash: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: '',
      textBaseline: '',
    };

    mockCanvas = {
      width: 800,
      height: 500,
      getContext: vi.fn(() => mockContext),
    };
  });

  describe('generateOvalTrack', () => {
    it('should generate track points', () => {
      const points = generateOvalTrack(800, 500, 100);
      expect(points.length).toBe(100);
    });

    it('each point should have x and y coordinates', () => {
      const points = generateOvalTrack(800, 500, 10);
      points.forEach((p) => {
        expect(typeof p.x).toBe('number');
        expect(typeof p.y).toBe('number');
      });
    });

    it('should create a closed loop (first and last points should be close)', () => {
      const points = generateOvalTrack(800, 500, 200);
      const first = points[0];
      const last = points[points.length - 1];
      const distance = Math.sqrt((first.x - last.x) ** 2 + (first.y - last.y) ** 2);
      expect(distance).toBeLessThan(50); // Allow small margin
    });

    it('should scale with canvas dimensions', () => {
      const points1 = generateOvalTrack(800, 500, 50);
      const points2 = generateOvalTrack(400, 250, 50);
      // Points should be scaled proportionally
      const ratio1 = Math.max(...points1.map((p) => Math.abs(p.x))) / 800;
      const ratio2 = Math.max(...points2.map((p) => Math.abs(p.x))) / 400;
      expect(Math.abs(ratio1 - ratio2)).toBeLessThan(0.1);
    });
  });

  describe('getTrackLayout', () => {
    it('should return layout for dirt-oval', () => {
      const layout = getTrackLayout('dirt-oval', 800, 500);
      expect(layout).toHaveProperty('trackColor');
      expect(layout).toHaveProperty('name');
      expect(layout.name).toBe('Dirt Oval');
    });

    it('should return layout for river-run', () => {
      const layout = getTrackLayout('river-run', 800, 500);
      expect(layout.name).toBe('River Run');
      expect(layout).toHaveProperty('backgroundGradient');
    });

    it('should return default layout for unknown track', () => {
      const layout = getTrackLayout('unknown', 800, 500);
      expect(layout).toHaveProperty('trackColor');
    });

    it('should have all required properties', () => {
      const layout = getTrackLayout('dirt-oval', 800, 500);
      expect(layout).toHaveProperty('trackColor');
      expect(layout).toHaveProperty('innerColor');
      expect(layout).toHaveProperty('outerColor');
      expect(layout).toHaveProperty('backgroundGradient');
      expect(layout).toHaveProperty('name');
    });
  });

  describe('createCanvasRenderer', () => {
    it('should throw if no canvas provided', () => {
      expect(() => createCanvasRenderer(null)).toThrow();
    });

    it('should create renderer with mocked canvas', () => {
      const renderer = createCanvasRenderer(mockCanvas);
      expect(renderer).toHaveProperty('initTrack');
      expect(renderer).toHaveProperty('drawTrack');
      expect(renderer).toHaveProperty('drawRacers');
      expect(renderer).toHaveProperty('clear');
      expect(renderer).toHaveProperty('getRacerPosition');
      expect(renderer).toHaveProperty('getAngleAtPoint');
    });

    it('should initialize track and generate points', () => {
      const renderer = createCanvasRenderer(mockCanvas);
      renderer.initTrack('dirt-oval', 800, 500);
      const points = renderer.getTrackPoints();
      expect(points.length).toBeGreaterThan(0);
    });

    it('should call canvas getContext on initialization', () => {
      createCanvasRenderer(mockCanvas);
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
    });

    it('should get racer position by progress', () => {
      const renderer = createCanvasRenderer(mockCanvas);
      renderer.initTrack('dirt-oval', 800, 500);
      const pos = renderer.getRacerPosition(50);
      expect(pos).toHaveProperty('x');
      expect(pos).toHaveProperty('y');
      expect(typeof pos.x).toBe('number');
      expect(typeof pos.y).toBe('number');
    });

    it('should get angle at point', () => {
      const renderer = createCanvasRenderer(mockCanvas);
      renderer.initTrack('dirt-oval', 800, 500);
      const angle = renderer.getAngleAtPoint(10);
      expect(typeof angle).toBe('number');
    });

    it('should return valid angle between -PI and PI', () => {
      const renderer = createCanvasRenderer(mockCanvas);
      renderer.initTrack('dirt-oval', 800, 500);
      for (let i = 0; i < 100; i += 10) {
        const angle = renderer.getAngleAtPoint(i);
        expect(angle).toBeGreaterThanOrEqual(-Math.PI);
        expect(angle).toBeLessThanOrEqual(Math.PI);
      }
    });

    it('should clear canvas', () => {
      const renderer = createCanvasRenderer(mockCanvas);
      renderer.clear();
      expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 800, 500);
    });

    it('should call drawing methods without throwing', () => {
      const renderer = createCanvasRenderer(mockCanvas);
      renderer.initTrack('dirt-oval', 800, 500);
      expect(() => renderer.drawTrack()).not.toThrow();
      expect(() => renderer.drawRacers([])).not.toThrow();
    });
  });
});
