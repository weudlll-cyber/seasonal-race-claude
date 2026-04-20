// ============================================================
// File:        index.js
// Path:        client/src/modules/race-simulation/index.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Horse race simulation — movement, AI, lap tracking
// ============================================================

/**
 * Create race state for a single racer
 */
function createRacerState(racer, index) {
  return {
    ...racer,
    index,
    progress: 0, // 0-100 (percent of track)
    lap: 0, // current lap
    finished: false,
    finishTime: null,
    velocity: 0,
    maxVelocity: 2 + Math.random() * 1, // randomize horse speed
    acceleration: 0.02 + Math.random() * 0.01,
    lastParticleTime: 0,
  };
}

/**
 * Create race simulation
 */
export function createRaceSimulation(racers, trackLaps = 1) {
  const state = {
    racers: racers.map((r, i) => createRacerState(r, i)),
    trackLaps,
    totalLaps: racers.length * trackLaps,
    time: 0,
    finished: false,
    finishOrder: [],
  };

  return {
    /**
     * Update simulation tick
     */
    update(delta) {
      state.time += delta;

      for (const racer of state.racers) {
        if (racer.finished) continue;

        // Update velocity with slight randomness
        const randomFactor = 0.95 + Math.random() * 0.1;
        racer.velocity = Math.min(
          racer.maxVelocity * randomFactor,
          racer.velocity + racer.acceleration
        );

        // Move racer
        racer.progress += racer.velocity;

        // Check for lap completion
        if (racer.progress >= 100) {
          racer.lap += Math.floor(racer.progress / 100);
          racer.progress = racer.progress % 100;

          // Check if finished
          if (racer.lap >= state.trackLaps) {
            racer.finished = true;
            racer.finishTime = state.time;
            state.finishOrder.push(racer);

            if (state.finishOrder.length === state.racers.length) {
              state.finished = true;
            }
          }
        }
      }
    },

    /**
     * Get current racer positions
     */
    getRacers() {
      return state.racers;
    },

    /**
     * Get race state
     */
    getState() {
      return state;
    },

    /**
     * Check if race is finished
     */
    isFinished() {
      return state.finished;
    },

    /**
     * Get finish order (podium)
     */
    getFinishOrder() {
      return state.finishOrder;
    },

    /**
     * Get elapsed time in seconds
     */
    getElapsedTime() {
      return Math.floor(state.time / 1000);
    },
  };
}
