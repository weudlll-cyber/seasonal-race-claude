// ============================================================
// File:        index.js
// Path:        server/src/modules/utils/index.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Shared server-side utility functions
// ============================================================

function paginate(query, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  return { query: `${query} LIMIT ? OFFSET ?`, params: [limit, offset] };
}

function nowIso() {
  return new Date().toISOString();
}

module.exports = { paginate, nowIso };
