// ============================================================
// File:        particle-effects.test.js
// Path:        client/src/modules/particle-effects/particle-effects.test.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Tests for particle effects module
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createParticleEffects, PARTICLE_TYPES } from './index.js';

describe('Particle Effects Module', () => {
  let effects;
  let mockContext;

  beforeEach(() => {
    effects = createParticleEffects();
    // Mock canvas context
    mockContext = {
      fillStyle: '',
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    };
  });

  describe('createParticleEffects', () => {
    it('should create effects system', () => {
      expect(effects).toHaveProperty('emit');
      expect(effects).toHaveProperty('update');
      expect(effects).toHaveProperty('draw');
      expect(effects).toHaveProperty('clear');
      expect(effects).toHaveProperty('getParticles');
    });
  });

  describe('emit', () => {
    it('should add particles to system', () => {
      effects.emit(100, 100, PARTICLE_TYPES.DUST, 5);
      const particles = effects.getParticles();
      expect(particles.length).toBe(5);
    });

    it('should create particles at specified position', () => {
      effects.emit(100, 100, PARTICLE_TYPES.DUST, 1);
      const particles = effects.getParticles();
      const p = particles[0];
      expect(p.x).toBe(100);
      expect(p.y).toBe(100);
    });

    it('should create particles with correct properties', () => {
      effects.emit(100, 100, PARTICLE_TYPES.DUST, 1);
      const particles = effects.getParticles();
      const p = particles[0];
      expect(p).toHaveProperty('x', 100);
      expect(p).toHaveProperty('y', 100);
      expect(p).toHaveProperty('vx');
      expect(p).toHaveProperty('vy');
      expect(p).toHaveProperty('life');
      expect(p).toHaveProperty('maxLife');
      expect(p).toHaveProperty('size');
      expect(p).toHaveProperty('type', PARTICLE_TYPES.DUST);
    });

    it('should emit with different velocities', () => {
      effects.emit(100, 100, PARTICLE_TYPES.DUST, 3);
      const particles = effects.getParticles();
      const velocities = particles.map((p) => Math.sqrt(p.vx ** 2 + p.vy ** 2));
      // Should have some variation
      const unique = new Set(velocities.map((v) => Math.round(v * 100)));
      expect(unique.size).toBeGreaterThan(1);
    });

    it('should emit multiple times', () => {
      effects.emit(100, 100, PARTICLE_TYPES.DUST, 3);
      effects.emit(200, 200, PARTICLE_TYPES.SPARK, 2);
      const particles = effects.getParticles();
      expect(particles.length).toBe(5);
    });

    it('should default to DUST type', () => {
      effects.emit(100, 100);
      const particles = effects.getParticles();
      expect(particles[0].type).toBe(PARTICLE_TYPES.DUST);
    });

    it('should handle different particle types', () => {
      effects.emit(100, 100, PARTICLE_TYPES.DUST, 1);
      effects.emit(100, 100, PARTICLE_TYPES.SPARK, 1);
      effects.emit(100, 100, PARTICLE_TYPES.TRAIL, 1);
      const particles = effects.getParticles();
      expect(particles.length).toBe(3);
      expect(particles[0].type).toBe(PARTICLE_TYPES.DUST);
      expect(particles[1].type).toBe(PARTICLE_TYPES.SPARK);
      expect(particles[2].type).toBe(PARTICLE_TYPES.TRAIL);
    });
  });

  describe('update', () => {
    it('should update particle positions', () => {
      effects.emit(100, 100, PARTICLE_TYPES.DUST, 1);
      const before = { ...effects.getParticles()[0] };
      effects.update(16); // 16ms delta
      const after = effects.getParticles()[0];
      expect(after.x).not.toBe(before.x);
      expect(after.y).not.toBe(before.y);
    });

    it('should apply velocity to position', () => {
      effects.emit(100, 100, PARTICLE_TYPES.DUST, 1);
      const particle = effects.getParticles()[0];
      const initialX = particle.x;
      const vx = particle.vx;
      effects.update(100); // 100ms (applies velocity once per update call)
      const updated = effects.getParticles()[0];
      expect(updated.x).toBe(initialX + vx);
    });

    it('should apply gravity', () => {
      effects.emit(100, 100, PARTICLE_TYPES.DUST, 1);
      const particle = effects.getParticles()[0];
      const initialVy = particle.vy;
      effects.update(16);
      const updated = effects.getParticles()[0];
      expect(updated.vy).toBeGreaterThan(initialVy);
    });

    it('should decay particle life', () => {
      effects.emit(100, 100, PARTICLE_TYPES.DUST, 1);
      const before = effects.getParticles()[0];
      const initialLife = before.life;
      effects.update(100); // 100ms
      const after = effects.getParticles()[0];
      expect(after.life).toBeLessThan(initialLife);
    });

    it('should remove dead particles', () => {
      effects.emit(100, 100, PARTICLE_TYPES.DUST, 1);
      const particle = effects.getParticles()[0];
      // DUST particles have maxLife of 0.5s = 500ms
      expect(particle.maxLife).toBe(0.5);
      effects.update(600); // 600ms > 500ms
      const particles = effects.getParticles();
      expect(particles.length).toBe(0);
    });

    it('should keep particles alive until max life', () => {
      effects.emit(100, 100, PARTICLE_TYPES.DUST, 1);
      effects.update(400); // 400ms < 500ms
      expect(effects.getParticles().length).toBe(1);
      effects.update(100); // total 500ms
      expect(effects.getParticles().length).toBe(0);
    });

    it('should handle multiple particles with different lifetimes', () => {
      effects.emit(100, 100, PARTICLE_TYPES.DUST, 1); // 500ms lifetime
      effects.emit(100, 100, PARTICLE_TYPES.SPARK, 1); // 1000ms lifetime
      effects.update(600); // > 500ms but < 1000ms
      const particles = effects.getParticles();
      expect(particles.length).toBe(1);
      expect(particles[0].type).toBe(PARTICLE_TYPES.SPARK);
    });
  });

  describe('clear', () => {
    it('should clear all particles', () => {
      effects.emit(100, 100, PARTICLE_TYPES.DUST, 10);
      expect(effects.getParticles().length).toBe(10);
      effects.clear();
      expect(effects.getParticles().length).toBe(0);
    });

    it('should allow emission after clearing', () => {
      effects.emit(100, 100, PARTICLE_TYPES.DUST, 5);
      effects.clear();
      effects.emit(100, 100, PARTICLE_TYPES.DUST, 3);
      expect(effects.getParticles().length).toBe(3);
    });
  });

  describe('draw', () => {
    it('should call draw methods on context', () => {
      effects.emit(100, 100, PARTICLE_TYPES.DUST, 3);
      effects.draw(mockContext);
      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.arc).toHaveBeenCalled();
      expect(mockContext.fill).toHaveBeenCalled();
    });

    it('should draw all particles', () => {
      effects.emit(100, 100, PARTICLE_TYPES.DUST, 5);
      effects.draw(mockContext);
      // Should call arc 5 times (once per particle)
      expect(mockContext.arc).toHaveBeenCalledTimes(5);
    });

    it('should handle empty particles', () => {
      expect(() => effects.draw(mockContext)).not.toThrow();
      expect(mockContext.beginPath).not.toHaveBeenCalled();
    });
  });

  describe('PARTICLE_TYPES', () => {
    it('should have DUST type', () => {
      expect(PARTICLE_TYPES.DUST).toBe('dust');
    });

    it('should have SPARK type', () => {
      expect(PARTICLE_TYPES.SPARK).toBe('spark');
    });

    it('should have TRAIL type', () => {
      expect(PARTICLE_TYPES.TRAIL).toBe('trail');
    });
  });
});
