// ============================================================
// File:        season.js
// Path:        server/src/routes/season.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Express router for season info and standings endpoints
// ============================================================

const router    = require('express').Router();
const { getDb } = require('../modules/db');

router.get('/current', (req, res) => {
  const season = getDb().prepare('SELECT * FROM seasons WHERE is_active = 1 LIMIT 1').get();
  if (!season) return res.status(404).json({ error: 'No active season' });
  res.json(season);
});

router.get('/current/standings', (req, res) => {
  const rows = getDb()
    .prepare('SELECT id, username, season_points, total_wins FROM users ORDER BY season_points DESC LIMIT 50')
    .all();
  res.json(rows);
});

module.exports = router;
