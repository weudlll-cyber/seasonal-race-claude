// ============================================================
// File:        errorHandler.js
// Path:        server/src/middleware/errorHandler.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Express error-handling middleware — formats and logs errors
// ============================================================

module.exports = function errorHandler(err, req, res, _next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
};
