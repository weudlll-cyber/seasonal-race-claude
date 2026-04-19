// ============================================================
// File:        season.js
// Path:        server/src/routes/season.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Express router for season info and standings endpoints
// ============================================================

const router = require('express').Router();
const ctrl   = require('../controllers/seasonController');

router.get('/current',          ctrl.getCurrentSeason);
router.get('/current/standings', ctrl.getSeasonStandings);

module.exports = router;
