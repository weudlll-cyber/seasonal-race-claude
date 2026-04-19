// ============================================================
// File:        raceEngine.js
// Path:        server/src/services/raceEngine.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Core race simulation logic — physics tick, collision, scoring
// ============================================================

class RaceEngine {
  constructor(track) {
    this.track   = track;
    this.players = new Map();
  }

  addPlayer(id, state) {
    this.players.set(id, state);
  }

  tick(delta) {
    // Apply physics updates to each player state
  }

  getState() {
    return Object.fromEntries(this.players);
  }
}

module.exports = RaceEngine;
