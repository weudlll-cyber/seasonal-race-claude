// ============================================================
// File:        User.js
// Path:        server/src/models/User.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Mongoose schema for a player account with stats and ranking
// ============================================================

const { Schema, model } = require('mongoose');

const userSchema = new Schema({
  username:     { type: String, required: true, unique: true },
  email:        { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  seasonPoints: { type: Number, default: 0 },
  totalWins:    { type: Number, default: 0 },
}, { timestamps: true });

module.exports = model('User', userSchema);
