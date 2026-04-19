// ============================================================
// File:        user.js
// Path:        server/src/routes/user.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Express router for authentication and user profile endpoints
// ============================================================

const router   = require('express').Router();
const { getDb } = require('../modules/db');
const auth     = require('../middleware/auth');
const jwt      = require('jsonwebtoken');

router.post('/register', (req, res) => {
  const { username, email, password_hash } = req.body;
  try {
    const info = getDb()
      .prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)')
      .run(username, email, password_hash);
    res.status(201).json({ id: info.lastInsertRowid, username, email });
  } catch (e) {
    res.status(409).json({ error: 'Username or email already exists' });
  }
});

router.post('/login', (req, res) => {
  const { username } = req.body;
  const user = getDb().prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

router.get('/profile', auth, (req, res) => {
  const user = getDb().prepare('SELECT id, username, email, season_points, total_wins FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

module.exports = router;
