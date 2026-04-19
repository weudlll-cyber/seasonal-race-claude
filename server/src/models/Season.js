// ============================================================
// File:        Season.js
// Path:        server/src/models/Season.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Mongoose schema for a competitive season with start/end dates
// ============================================================

const { Schema, model } = require('mongoose');

const seasonSchema = new Schema({
  name:      { type: String, required: true },
  number:    { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate:   { type: Date, required: true },
  isActive:  { type: Boolean, default: false },
}, { timestamps: true });

module.exports = model('Season', seasonSchema);
