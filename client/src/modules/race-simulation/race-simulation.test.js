// ============================================================
// File:        race-simulation.test.js
// Path:        client/src/modules/race-simulation/race-simulation.test.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Tests for race simulation module
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { createRaceSimulation } from './index.js';

describe('Race Simulation Module', () => {
  let racers;
  let sim;

  beforeEach(() => {
    racers = [
      { index: 0, name: 'Horse 1', icon: '🐴', color: '#a0522d' },
      { index: 1, name: 'Horse 2', icon: '🐴', color: '#8b6914' },
      { index: 2, name: 'Horse 3', icon: '🐴', color: '#cd853f' },
    ];
    sim = createRaceSimulation(racers, 1);
  });

  describe('createRaceSimulation', () => {
    it('should create simulation', () => {
      expect(sim).toHaveProperty('update');
      expect(sim).toHaveProperty('getRacers');
      expect(sim).toHaveProperty('getState');
      expect(sim).toHaveProperty('isFinished');
      expect(sim).toHaveProperty('getFinishOrder');
    });

    it('should initialize all racers', () => {
      const racerStates = sim.getRacers();
      expect(racerStates.length).toBe(3);
    });

    it('should start with progress at 0', () => {
      const racerStates = sim.getRacers();
      racerStates.forEach((r) => {
        expect(r.progress).toBe(0);
        expect(r.lap).toBe(0);
      });
    });
  });

  describe('update', () => {
    it('should advance racer progress', () => {
      const before = sim.getRacers()[0].progress;
      sim.update(16); // 16ms
      const after = sim.getRacers()[0].progress;
      expect(after).toBeGreaterThan(before);
    });

    it('should update elapsed time', () => {
      const before = sim.getElapsedTime();
      sim.update(1000); // 1000ms
      const after = sim.getElapsedTime();
      expect(after).toBeGreaterThan(before);
    });

    it('should not be finished initially', () => {
      expect(sim.isFinished()).toBe(false);
    });

    it('should detect lap completion', () => {
      const state = sim.getState();
      // Manually advance progress to 100+
      const racer = state.racers[0];
      racer.progress = 110;
      sim.update(16);
      const updated = sim.getRacers()[0];
      expect(updated.lap).toBeGreaterThan(0);
      expect(updated.progress).toBeLessThan(100);
    });
  });

  describe('getRacers', () => {
    it('should return array of racer states', () => {
      const racerStates = sim.getRacers();
      expect(Array.isArray(racerStates)).toBe(true);
      expect(racerStates.length).toBe(racers.length);
    });

    it('each racer should have simulation properties', () => {
      const racerStates = sim.getRacers();
      racerStates.forEach((r) => {
        expect(r).toHaveProperty('progress');
        expect(r).toHaveProperty('lap');
        expect(r).toHaveProperty('velocity');
        expect(r).toHaveProperty('finished');
      });
    });
  });

  describe('getState', () => {
    it('should return full state object', () => {
      const state = sim.getState();
      expect(state).toHaveProperty('racers');
      expect(state).toHaveProperty('time');
      expect(state).toHaveProperty('finished');
      expect(state).toHaveProperty('finishOrder');
    });
  });

  describe('getFinishOrder', () => {
    it('should be empty initially', () => {
      expect(sim.getFinishOrder()).toEqual([]);
    });

    it('should populate as racers finish', () => {
      // Fast-forward until first racer finishes
      for (let i = 0; i < 1000; i++) {
        sim.update(16);
        if (sim.isFinished()) break;
      }

      const finishOrder = sim.getFinishOrder();
      expect(finishOrder.length).toBeGreaterThan(0);
    });
  });

  describe('isFinished', () => {
    it('should be false initially', () => {
      expect(sim.isFinished()).toBe(false);
    });

    it('should be true when all racers finish', () => {
      // Fast-forward simulation
      for (let i = 0; i < 2000; i++) {
        sim.update(16);
        if (sim.isFinished()) break;
      }

      expect(sim.isFinished()).toBe(true);
      expect(sim.getFinishOrder().length).toBe(racers.length);
    });
  });

  describe('getElapsedTime', () => {
    it('should return time in seconds', () => {
      expect(sim.getElapsedTime()).toBe(0);
      sim.update(1000); // 1000ms
      expect(sim.getElapsedTime()).toBe(1);
      sim.update(1000); // another 1000ms
      expect(sim.getElapsedTime()).toBe(2);
    });
  });

  describe('racer randomization', () => {
    it('should have different max velocities for each racer', () => {
      const racerStates = sim.getRacers();
      const velocities = racerStates.map((r) => r.maxVelocity);
      const unique = new Set(velocities);
      // With high probability, at least one should differ
      expect(unique.size).toBeGreaterThan(1);
    });

    it('should maintain reasonable velocity bounds', () => {
      const racerStates = sim.getRacers();
      racerStates.forEach((r) => {
        expect(r.maxVelocity).toBeGreaterThan(2);
        expect(r.maxVelocity).toBeLessThan(3.5);
      });
    });
  });

  describe('multi-lap races', () => {
    it('should support multiple laps', () => {
      const multiLapSim = createRaceSimulation(racers, 3);
      const state = multiLapSim.getState();
      expect(state.trackLaps).toBe(3);
    });
  });
});
