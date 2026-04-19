// ============================================================
// File:        index.js
// Path:        server/src/modules/db/index.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: SQLite database connection and schema bootstrap via better-sqlite3
// ============================================================

const Database = require('better-sqlite3');
const path     = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../../../data/racearena.db');

let db = null;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    bootstrap(db);
  }
  return db;
}

function bootstrap(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      username    TEXT    NOT NULL UNIQUE,
      email       TEXT    NOT NULL UNIQUE,
      password_hash TEXT  NOT NULL,
      season_points INTEGER NOT NULL DEFAULT 0,
      total_wins  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS seasons (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      number     INTEGER NOT NULL,
      start_date TEXT    NOT NULL,
      end_date   TEXT    NOT NULL,
      is_active  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS races (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      track      TEXT    NOT NULL,
      season_id  INTEGER REFERENCES seasons(id),
      started_at TEXT,
      ended_at   TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS race_results (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      race_id     INTEGER NOT NULL REFERENCES races(id),
      user_id     INTEGER NOT NULL REFERENCES users(id),
      finish_time INTEGER,
      rank        INTEGER
    );
  `);
}

module.exports = { getDb };
