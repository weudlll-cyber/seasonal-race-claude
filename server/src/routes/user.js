// ============================================================
// File:        user.js
// Path:        server/src/routes/user.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Express router for authentication and user profile endpoints
// ============================================================

const router = require('express').Router();
const ctrl   = require('../controllers/userController');
const auth   = require('../middleware/auth');

router.post('/register',   ctrl.register);
router.post('/login',      ctrl.login);
router.get('/profile', auth, ctrl.getProfile);

module.exports = router;
