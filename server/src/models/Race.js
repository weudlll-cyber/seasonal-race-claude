// ============================================================
// File:        Race.js
// Path:        server/src/models/Race.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Mongoose schema for a race event (track, players, results)
// ============================================================

const { Schema, model } = require('mongoose');

const raceSchema = new Schema({
  track:     { type: String, required: true },
  season:    { type: Schema.Types.ObjectId, ref: 'Season' },
  players:   [{ type: Schema.Types.ObjectId, ref: 'User' }],
  results:   [{ player: Schema.Types.ObjectId, finishTime: Number, rank: Number }],
  startedAt: Date,
  endedAt:   Date,
}, { timestamps: true });

module.exports = model('Race', raceSchema);
