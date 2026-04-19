// ============================================================
// File:        database.js
// Path:        server/src/config/database.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: MongoDB connection setup via Mongoose
// ============================================================

const mongoose = require('mongoose');

module.exports = async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/racearena';
  await mongoose.connect(uri);
  console.log('MongoDB connected');
};
