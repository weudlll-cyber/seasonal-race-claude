// ============================================================
// File:        auth.js
// Path:        server/src/middleware/auth.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: JWT verification middleware — attaches user to req on success
// ============================================================

const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
