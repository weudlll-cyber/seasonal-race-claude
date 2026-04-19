// ============================================================
// File:        index.js
// Path:        client/src/modules/race-engine/index.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Client-side race engine — applies server state and local prediction
// ============================================================

export function createRaceEngine({ onTick } = {}) {
  let rafId = null;
  let lastTime = null;
  const state = { racers: new Map() };

  function tick(now) {
    const delta = lastTime ? now - lastTime : 0;
    lastTime = now;
    onTick?.(state, delta);
    rafId = requestAnimationFrame(tick);
  }

  return {
    start() {
      rafId = requestAnimationFrame(tick);
    },
    stop() {
      cancelAnimationFrame(rafId);
      lastTime = null;
    },
    applyServerState(serverState) {
      Object.assign(state, serverState);
    },
    getState() {
      return state;
    },
  };
}
