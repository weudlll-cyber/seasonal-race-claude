// ============================================================
// File:        race.js
// Path:        server/src/routes/race.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Express router for race-related REST endpoints
// ============================================================

const router = require('express').Router();
const ctrl   = require('../controllers/raceController');
const auth   = require('../middleware/auth');

router.get('/',         ctrl.listRaces);
router.post('/',  auth, ctrl.createRace);
router.get('/:id',      ctrl.getRace);
router.post('/:id/finish', auth, ctrl.finishRace);

module.exports = router;
