// ============================================================
// File:        seed.js
// Path:        scripts/seed.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Seeds the database with an initial season and demo users
// ============================================================

require('dotenv').config({ path: '../server/.env' });

const mongoose = require('mongoose');
const Season   = require('../server/src/models/Season');
const User     = require('../server/src/models/User');
const bcrypt   = require('bcrypt');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  await Season.deleteMany({});
  await Season.create({
    name:      'Season 1 — Spring Dash',
    number:    1,
    startDate: new Date('2026-04-19'),
    endDate:   new Date('2026-07-19'),
    isActive:  true,
  });

  console.log('Seed complete');
  await mongoose.disconnect();
}

seed().catch(console.error);
