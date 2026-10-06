// ============================================================
// File:        migrateClientIdPerTeam.js
// Path:        server/src/races/migrateClientIdPerTeam.js
// Project:     RaceArena — SERVER-DEFECTS-1
// Created:     2026-10-06
// Description: Make the client's race id unique PER TEAM in an EXISTING races database. One home for
//              the work; `scripts/migrate.mjs` is only the schedule (entry `client-id-per-team-1`).
//
// ── WHY ─────────────────────────────────────────────────────────────────────────────────────────
// `client_race_id` was declared `UNIQUE` across the whole table, and the stored-race retry check
// looked it up across every team: a race sent with another team's id was answered with THAT team's
// race. The lookup is now team-scoped (`raceStore.js`), and a new database is born with
// `UNIQUE (team_normalized, client_race_id)`. An existing database is never re-created
// (`CREATE TABLE IF NOT EXISTS`), so without this its old table-wide constraint would refuse the one
// case the fix exists for — a second team's race carrying the same id — instead of storing it.
//
// ── HOW ─────────────────────────────────────────────────────────────────────────────────────────
// SQLite cannot drop a column constraint, so the table is REBUILT: a new table from the database's
// OWN stored CREATE statement (so a column a later migration added, such as `race_source`, comes
// along) with the one constraint changed; every row copied by column name; the old table dropped;
// the new one renamed into its place; and the table's own indexes and triggers — the immutability
// trigger among them — re-created from their stored SQL. All in one transaction, with the row count
// checked before it commits. Rows are copied, never edited, so the BEFORE UPDATE trigger is not
// involved, and nothing references `races`, so dropping it orphans nothing.
//
// ── IDEMPOTENT TWICE OVER ───────────────────────────────────────────────────────────────────────
// The ledger records that it ran; this file ALSO checks for the per-team constraint first, so a
// database created with it — or already migrated — is a reported no-op.
// ============================================================

import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';

const TABLE = 'races';
const KEY = ['team_normalized', 'client_race_id'];

/**
 * Is the client id already unique per team here? A database with no races table has nothing to
 * migrate — the store creates it with the constraint the next time it opens.
 * @param {import('better-sqlite3').Database} db
 */
export function hasClientIdPerTeam(db) {
  const table = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(TABLE);
  if (!table) return true;
  return db
    .prepare(`PRAGMA index_list(${TABLE})`)
    .all()
    .filter((i) => i.unique)
    .some((i) => {
      const cols = db
        .prepare(`PRAGMA index_info(${JSON.stringify(i.name)})`)
        .all()
        .map((c) => c.name);
      return cols.length === KEY.length && cols.every((c, n) => c === KEY[n]);
    });
}

/** The stored CREATE statement, turned into the rebuilt table's: same columns, the new constraint. */
function rebuiltTableSql(createSql, name) {
  const withoutOld = createSql.replace(/(client_race_id\s+TEXT\s+NOT\s+NULL)\s+UNIQUE/i, '$1');
  if (withoutOld === createSql)
    throw new Error('races: the table-wide client_race_id UNIQUE was not found');
  const renamed = withoutOld.replace(
    /^CREATE TABLE\s+(IF NOT EXISTS\s+)?"?races"?/i,
    `CREATE TABLE ${name}`
  );
  const close = renamed.lastIndexOf(')');
  return `${renamed.slice(0, close)},\n  UNIQUE (${KEY.join(', ')})\n${renamed.slice(close)}`;
}

/**
 * Rebuild the races table with the per-team constraint, if it does not have it.
 *
 * @param {object}  p
 * @param {string}  p.dbPath   the races database file
 * @param {boolean} [p.dryRun] report what would happen; change nothing
 * @returns {{ total: number, changed: number, skipped: number }} the shape the ledger's CLI prints
 */
export function migrateClientIdPerTeam({ dbPath, dryRun = false }) {
  if (!existsSync(dbPath)) return { total: 0, changed: 0, skipped: 0 };

  const db = new Database(dbPath, { readonly: dryRun });
  try {
    if (hasClientIdPerTeam(db)) return { total: 1, changed: 0, skipped: 1 };
    if (dryRun) return { total: 1, changed: 1, skipped: 0 };

    const createSql = db
      .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(TABLE).sql;
    // The table's own indexes and triggers, re-created after the rename. Automatic indexes (the
    // old UNIQUE's) have no SQL and are not carried over — that is the point.
    const companions = db
      .prepare(
        "SELECT sql FROM sqlite_master WHERE tbl_name = ? AND type IN ('index', 'trigger') AND sql IS NOT NULL"
      )
      .all(TABLE)
      .map((r) => r.sql);
    const columns = db
      .prepare(`PRAGMA table_info(${TABLE})`)
      .all()
      .map((c) => `"${c.name}"`)
      .join(', ');
    const rebuilt = `${TABLE}_rebuild`;

    // Off for the swap (it cannot change inside a transaction); nothing references `races`, and the
    // check after the commit proves every row still points at its roster and racer types.
    db.pragma('foreign_keys = OFF');
    db.transaction(() => {
      const before = db.prepare(`SELECT COUNT(*) AS n FROM ${TABLE}`).get().n;
      db.exec(rebuiltTableSql(createSql, rebuilt));
      db.exec(`INSERT INTO ${rebuilt} (${columns}) SELECT ${columns} FROM ${TABLE}`);
      db.exec(`DROP TABLE ${TABLE}`);
      db.exec(`ALTER TABLE ${rebuilt} RENAME TO ${TABLE}`);
      for (const sql of companions) db.exec(sql);
      const after = db.prepare(`SELECT COUNT(*) AS n FROM ${TABLE}`).get().n;
      if (after !== before)
        throw new Error(`races: ${before} rows before the rebuild, ${after} after`);
    })();
    db.pragma('foreign_keys = ON');
    const broken = db.pragma('foreign_key_check');
    if (broken.length) throw new Error(`races: ${broken.length} row(s) lost their references`);
    return { total: 1, changed: 1, skipped: 0 };
  } finally {
    db.close();
  }
}
