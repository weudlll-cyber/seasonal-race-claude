// ============================================================
// File:        migrateRaceSource.js
// Path:        server/src/races/migrateRaceSource.js
// Project:     RaceArena — RACE-SOURCE-1
// Created:     2026-09-25
// Description: Add the `race_source` column to an EXISTING races database. One home for the work;
//              `scripts/migrate.mjs` is only the schedule.
//
// ── WHY A MIGRATION IS NEEDED AT ALL ──────────────────────────────────────────────────────────
// `raceStore.js` creates its tables with `CREATE TABLE IF NOT EXISTS`, so a database that does not
// exist yet is born with the column and needs nothing. A database that ALREADY exists is never
// re-created, and SQLite will not add a column to it on its own — so an instance that has already
// stored a race would keep a table with no `race_source`, and every insert would fail on an unknown
// column. This closes that gap and nothing else.
//
// ── ★★ WHAT IT DELIBERATELY DOES NOT DO: BACK-FILL ────────────────────────────────────────────
// Existing rows get NULL and KEEP it. That is not an omission, it is the rule: **absent is not
// real** (`shared/raceSource.mjs`), so every race stored before 2026-09-25 reads as a test race —
// which is exactly what the owner established on 2026-09-25: every race stored so far is a test
// race, and none of them is carried over when the move to a server happens.
//
// It also COULD not back-fill without breaking something more important. Rows are immutable by
// SQLite trigger (`raceStore.js`, `IMMUTABILITY_TRIGGERS`), and weakening that trigger to write a
// value nobody needs would trade the owner's 2026-09-06 requirement for nothing. `ALTER TABLE ...
// ADD COLUMN` is DDL and does not touch a row, so it passes the BEFORE UPDATE trigger untouched.
//
// ── IDEMPOTENT TWICE OVER ─────────────────────────────────────────────────────────────────────
// The ledger in `scripts/migrate.mjs` records that this ran and refuses a second run. This file
// ALSO checks `PRAGMA table_info` before altering, so running it directly — or against a database
// created fresh with the column already in the schema — is a reported no-op rather than an error.
// Two guards, because the ledger is a schedule and this is the work: neither should depend on the
// other being correct.
// ============================================================

import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';

/** The column this migration adds, and the table it belongs to. Stated once. */
export const RACE_SOURCE_COLUMN = 'race_source';
const TABLE = 'races';

/**
 * Does this races database already have the column?
 *
 * Exported because the ledger's observable-state probe and the migration itself ask the same
 * question, and two spellings of one question is how they come to disagree.
 *
 * @param {import('better-sqlite3').Database} db
 * @returns {boolean}
 */
export function hasRaceSourceColumn(db) {
  const tableExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(TABLE);
  // No table means no races have ever been stored in this file. `CREATE TABLE IF NOT EXISTS` will
  // build it WITH the column the next time the store opens, so there is nothing here to migrate.
  if (!tableExists) return true;
  return db
    .prepare(`PRAGMA table_info(${TABLE})`)
    .all()
    .some((c) => c.name === RACE_SOURCE_COLUMN);
}

/**
 * Add the column if it is missing.
 *
 * @param {object}  p
 * @param {string}  p.dbPath   the races database file
 * @param {boolean} [p.dryRun] report what would happen; change nothing
 * @returns {{ total: number, changed: number, skipped: number }} the shape the ledger's CLI prints
 */
export function migrateRaceSource({ dbPath, dryRun = false }) {
  // A file that does not exist is not a database with an old schema — it is an instance that has
  // never stored a race. Creating one here just to alter it would put a file on disk that the
  // migration itself invented.
  if (!existsSync(dbPath)) return { total: 0, changed: 0, skipped: 0 };

  const db = new Database(dbPath, { readonly: dryRun });
  try {
    if (hasRaceSourceColumn(db)) return { total: 1, changed: 0, skipped: 1 };
    if (dryRun) return { total: 1, changed: 1, skipped: 0 };
    // No DEFAULT and no NOT NULL. Existing rows take NULL, which reads as a test race — see the
    // header. A default of 'race' here would silently promote every legacy row to a real one, which
    // is the single worst thing this file could do.
    db.exec(`ALTER TABLE ${TABLE} ADD COLUMN ${RACE_SOURCE_COLUMN} TEXT`);
    return { total: 1, changed: 1, skipped: 0 };
  } finally {
    db.close();
  }
}
