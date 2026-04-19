// ============================================================
// File:        index.js
// Path:        server/src/modules/race/index.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Race module — HTTP handlers for race CRUD and results
// ============================================================

const { getDb } = require('../db');

exports.listRaces = (req, res) => {
  const races = getDb().prepare('SELECT * FROM races ORDER BY created_at DESC').all();
  res.json(races);
};

exports.createRace = (req, res) => {
  const { track, season_id } = req.body;
  const info = getDb()
    .prepare('INSERT INTO races (track, season_id) VALUES (?, ?)')
    .run(track, season_id ?? null);
  res.status(201).json({ id: info.lastInsertRowid, track, season_id });
};

exports.getRace = (req, res) => {
  const race = getDb().prepare('SELECT * FROM races WHERE id = ?').get(req.params.id);
  if (!race) return res.status(404).json({ error: 'Not found' });
  res.json(race);
};

exports.finishRace = (req, res) => {
  const db      = getDb();
  const { results } = req.body;
  const insertResult = db.prepare(
    'INSERT INTO race_results (race_id, user_id, finish_time, rank) VALUES (?, ?, ?, ?)'
  );
  const insertMany = db.transaction((rows) => {
    for (const r of rows) insertResult.run(req.params.id, r.user_id, r.finish_time, r.rank);
  });
  insertMany(results ?? []);
  db.prepare('UPDATE races SET ended_at = datetime(\'now\') WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
};
