// ============================================================
// File:        raceStore.js
// Path:        server/src/races/raceStore.js
// Project:     RaceArena — RACE-STORE-2
// Created:     2026-09-06
// Description: The database races live in. THE SHELF ONLY — as of this piece nothing writes to it
//              and nothing reads it: there is no route, and no race path calls any of this.
//
// ── WHY ITS OWN FILE AND NOT THE SESSION DATABASE ───────────────────────────────────────────────
// `server/src/auth/session.js:79` opens the only other SQLite database in the project, and putting
// these tables beside its one is the obvious economy. It is refused, for four reasons, and the
// first is on its own decisive:
//
// 1. SESSIONS ARE DISPOSABLE AND RACES ARE THE RECORD. Clearing sessions is a legitimate
//    operational act — it forces everyone to log in again and it is the documented answer to a
//    session store that has gone strange. If the two share a file, that act deletes the race
//    history, and it deletes it at exactly the moment somebody is already troubleshooting. The
//    owner's races must not be one `rm sessions.sqlite` away from gone.
// 2. THE SESSION FILE'S SCHEMA IS NOT OURS. `better-sqlite3-session-store` creates its table,
//    chooses its columns and runs a sweep timer that DELETEs from it every fifteen minutes. Our
//    tables would live inside a file a third-party library believes it owns, and its next version
//    is entitled to migrate, re-create or vacuum it without asking.
// 3. THE LIFETIMES ALREADY DISAGREE. `session.js` uses `:memory:` under test (`isTest`), so races
//    sharing that handle would vanish between test files while the production path wrote to disk —
//    the store would be exercised in a mode it never ships in.
// 4. BACKUP AND SIZE DIVERGE. A session row is bytes that expire in thirty days; a race is kept
//    forever and is the thing worth copying somewhere safe. One file cannot have two retention
//    policies.
//
// So: `DATA_ROOT/races.sqlite`, its own handle, `RA_RACES_DB` to redirect it — the same shape
// `usersStore.js` uses for `RA_USERS_DB`, so the isolation the test suites already rely on works
// here without inventing a second mechanism.
//
// ── A ROW IS NEVER OVERWRITTEN AND NEVER UPDATED IN PLACE ───────────────────────────────────────
// The owner's requirement of 2026-09-06, and the reason the design is shaped this way. He changes
// racer values on the Dev Screen regularly; a race that ran last week must not change its outcome
// because a setting moved afterwards.
//
// It is enforced THREE times over, because a rule that lives only in the code that happens to be
// written today is a rule until somebody adds a second writer:
//
//   (a) CONTENT ADDRESSING makes an overwrite meaningless. Changed values hash to a different id,
//       so they are a different row by construction — there is no slot to write over. See
//       contentAddress.js.
//   (b) NO UPDATE STATEMENT EXISTS in this module. Every write is an INSERT. There is no code path
//       here that can modify a stored row, so no caller can ask for one.
//   (c) SQLite TRIGGERS REFUSE UPDATE on all three tables. This is the one that still holds when a
//       later piece adds a route, when somebody opens the file in a CLI, or when a future writer
//       forgets (a) and (b). The database itself says no, and says it with the reason attached.
//
// DELETE is deliberately NOT blocked, and that is a decision rather than an omission. The
// requirement is about overwriting, and whether the owner may one day forget a race is his to
// decide, not mine to prejudge with a trigger he would have to find and remove. The orphan case —
// deleting a roster an old race still points at — is already refused by `PRAGMA foreign_keys = ON`.
//
// ── WHAT THIS STORE DOES NOT PROTECT AGAINST ────────────────────────────────────────────────────
// If the ENGINE CODE changes, an old race can run differently from identical stored values. Nothing
// in this file can see that, and nothing in it tries: it stores inputs faithfully, and identical
// inputs through different code are a different race. That is what the fingerprints exist to
// detect. RACE-STORE-2.md states it plainly and proposes nothing — what re-running an old race
// should mean once the history exists is the owner's decision, not this store's.
// ============================================================

import Database from 'better-sqlite3';
import { join } from 'path';
import { DATA_ROOT } from '../dataPaths.js';
import { normalizeTeam, isWellFormedTeam } from '../auth/teams.js';
import { canonicalString, contentId } from './contentAddress.js';

const DEFAULT_RACES_PATH = process.env.RA_RACES_DB ?? join(DATA_ROOT, 'races.sqlite');

// ── The schema ────────────────────────────────────────────────────────────────
//
// Column-per-fact for everything a person reads or a query filters on, and a canonical JSON string
// only where the value is an opaque bag (a config diff, a result list). The RACES row carries every
// identifier input that is not in one of the two shared tables — see RACE-STORE-2.md for the
// field-by-field mapping from `client/src/modules/raceIdentifier.js`, which is the list this schema
// answers to.

const SCHEMA = `
CREATE TABLE IF NOT EXISTS rosters (
  id      TEXT PRIMARY KEY,
  content TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS racer_types (
  id      TEXT PRIMARY KEY,
  content TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS races (
  id                   TEXT PRIMARY KEY,

  -- THE CLIENT'S OWN ID FOR THIS RACE, and the reason the same race cannot land twice.
  -- The result screen already mints one (newId(), ResultScreen:208) before anything is sent, so a
  -- retry, a double click or a second tab all carry the id the first attempt carried. UNIQUE makes
  -- that a property of the table rather than of the code that happens to insert today.
  client_race_id       TEXT NOT NULL UNIQUE,

  -- Who may see it. Both forms, for the same reason a user carries both (TEAMS-1): the display
  -- spelling is what a person reads, the normalised key is what a query joins on.
  team                 TEXT NOT NULL,
  team_normalized      TEXT NOT NULL,

  -- When.
  finished_at          TEXT NOT NULL,

  -- The identifier's own two envelope fields. Kept because a stored race that cannot say which
  -- encoding and which build it came from cannot be honestly re-run: the world travels as a diff
  -- against shipped defaults, so a diff from another build describes a different config.
  identifier_version   INTEGER NOT NULL,
  build_id             TEXT NOT NULL,

  -- The race's own inputs.
  geometry_id          TEXT NOT NULL,
  racer_type_id        TEXT NOT NULL,
  race_plan_seed       INTEGER NOT NULL,
  race_action_stage    TEXT NOT NULL,
  race_plan_enabled    INTEGER NOT NULL,
  target_laps          INTEGER,
  target_duration_sec  REAL,

  -- The world, minus the racer-type half, which is shared and lives in racer_types.
  --
  -- ★ STORED RESOLVED, NOT AS THE IDENTIFIER'S DIFF, and this is the one place the store carries a
  -- field in a different SHAPE from raceIdentifier.js. The identifier sends the config as a diff
  -- against shipped defaults because it must fit in a string a person can pass to someone else —
  -- length was its binding constraint (IDENTIFIER-LENGTH-1 measured 4,008 characters and the
  -- problem was that nobody could type it). A database has no such constraint, so inheriting that
  -- compression would inherit its cost with none of its benefit.
  --
  -- The cost is real: a diff means nothing without the defaults it was taken against, so once
  -- defaults.js moves, every stored race's config becomes readable only by going back through
  -- git for the old defaults. Resolved, the row says what the config WAS, forever, on its own.
  -- The information is identical — diff + defaults IS the resolved config, which is exactly what
  -- applyDiff reconstructs — so nothing the identifier encodes is lost by storing the other end
  -- of that equality. build_id is kept regardless, because which build ran is a fact about the
  -- race and not merely a key for decoding it.
  world_schema_version INTEGER,
  world_configs        TEXT NOT NULL,

  -- The two shared tables.
  roster_id            TEXT NOT NULL REFERENCES rosters(id),
  racer_types_id       TEXT NOT NULL REFERENCES racer_types(id),

  -- The outcome.
  elapsed_sec          REAL,
  results              TEXT NOT NULL,
  winners              TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS races_by_team ON races(team_normalized, finished_at DESC);
`;

// The immutability the owner asked for, enforced by the database rather than by the caller.
// One pair per table; the message is what a future reader sees when they try.
const IMMUTABILITY_TRIGGERS = ['races', 'rosters', 'racer_types']
  .map(
    (t) => `
CREATE TRIGGER IF NOT EXISTS ${t}_is_immutable BEFORE UPDATE ON ${t}
BEGIN
  SELECT RAISE(ABORT, '${t} rows are immutable — changed content is a NEW row, never an edit (RACE-STORE-2)');
END;`
  )
  .join('\n');

// ── Store factory ─────────────────────────────────────────────────────────────

/**
 * Open (creating if needed) the race database.
 *
 * @param {string} [filePath] defaults to RA_RACES_DB, else DATA_ROOT/races.sqlite
 */
export function createRaceStore(filePath = DEFAULT_RACES_PATH) {
  const db = new Database(filePath);

  // Referential integrity is OFF by default in SQLite and must be asked for per connection. It is
  // what stops a roster an old race still points at from being deleted out from under it.
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  db.exec(IMMUTABILITY_TRIGGERS);

  // ── Content-addressed insert, shared by both value tables ───────────────────
  //
  // THE COLLISION CHECK LIVES HERE, and it is the second half of contentAddress.js's argument: an
  // id that already exists is only accepted as "the same content" after the stored bytes have been
  // compared with the bytes being written. Equal → reuse the row. Unequal → refuse loudly, because
  // the alternative is one race silently resolving to another race's values.
  function putContent(table, value) {
    const id = contentId(value);
    const content = canonicalString(value);

    const existing = db.prepare(`SELECT content FROM ${table} WHERE id = ?`).get(id);
    if (existing) {
      if (existing.content !== content) {
        const err = new Error(
          `SHA-256 collision in ${table} for id ${id} — refusing to store, because reusing this row ` +
            'would silently give one race another race\'s values'
        );
        err.code = 'HASH_COLLISION';
        throw err;
      }
      return { id, stored: false };
    }

    db.prepare(`INSERT INTO ${table} (id, content) VALUES (?, ?)`).run(id, content);

    return { id, stored: true };
  }

  function required(record, field) {
    const v = record[field];
    if (v === undefined || v === null || v === '') {
      const err = new Error(`storeRace requires "${field}"`);
      err.code = 'INVALID_RACE';
      throw err;
    }
    return v;
  }

  /**
   * Store one race, with its roster and its tuned racer values.
   *
   * All three inserts happen in ONE transaction: a race row that referenced a roster row that was
   * never written would be a race that cannot be resolved, and that is the failure this whole
   * topic exists to prevent.
   *
   * @param {object} race
   * @returns {{id: string, rosterId: string, racerTypesId: string,
   *            stored: {race: boolean, roster: boolean, racerTypes: boolean}}}
   *          `stored` reports which rows were newly written; false means the identical content was
   *          already there and was reused, which is the ordinary case for a roster.
   */
  const storeRace = db.transaction((race) => {
    if (!isWellFormedTeam(race?.team)) {
      const err = new Error('storeRace requires a team');
      err.code = 'INVALID_TEAM';
      throw err;
    }
    if (!Array.isArray(race.names) || race.names.length === 0) {
      const err = new Error('storeRace requires a non-empty roster ("names")');
      err.code = 'INVALID_ROSTER';
      throw err;
    }
    if (!Array.isArray(race.results)) {
      const err = new Error('storeRace requires "results" as an array');
      err.code = 'INVALID_RESULTS';
      throw err;
    }
    if (!Array.isArray(race.winners)) {
      const err = new Error('storeRace requires "winners" as an array');
      err.code = 'INVALID_RESULTS';
      throw err;
    }

    // THE ROSTER: the name list IN ORDER. Order is content, not presentation — a name is physics
    // (`stablePairBit` hashes it), so the same names in a different order are a different roster
    // and must hash differently. Nothing here sorts them.
    // No `size` column: the field size is the roster's length and that is its one home. A stored
    // count would be a second copy of a derived fact, which is the shape that drifts. The history
    // piece can add an indexed count when it has a query that needs one.
    // ★ THE SAME RACE ARRIVING TWICE IS STORED ONCE, and this is where that is decided. The check
    // is on the CLIENT'S id, not on the content hash, because the two answer different questions: a
    // hash asks "are these bytes identical", and a resend that was rebuilt from the same race can
    // differ in a field that does not matter (a re-serialised result list, a field added by a later
    // build) while still being the same race. Keyed on the id the result screen minted, a second
    // arrival is recognised whatever else moved, and it is ACCEPTED QUIETLY — the caller gets the
    // race that is already stored, not an error, because a retry succeeding is the normal case.
    const already = db
      .prepare('SELECT * FROM races WHERE client_race_id = ?')
      .get(String(race.clientRaceId ?? ''));
    if (already) {
      return {
        id: already.id,
        rosterId: already.roster_id,
        racerTypesId: already.racer_types_id,
        stored: { race: false, roster: false, racerTypes: false },
      };
    }

    const roster = putContent('rosters', { names: race.names });

    // THE TUNED RACER VALUES: the two halves of the world that carry per-racer tuning, and the
    // four-fifths of the identifier that repeat across races. `racerTypeId` is deliberately NOT in
    // here — it is a per-race CHOICE of which type to run, one short string, and folding it into
    // this row would split the shared blob every time the choice changed while the tuning did not.
    const racerTypes = putContent('racer_types', {
      racerTypeOverrides: race.racerTypeOverrides ?? {},
      effectiveRacerTypes: race.effectiveRacerTypes ?? {},
    });

    const row = {
      client_race_id: required(race, 'clientRaceId'),
      team: String(race.team).trim(),
      team_normalized: normalizeTeam(race.team),
      finished_at: required(race, 'finishedAt'),
      identifier_version: required(race, 'identifierVersion'),
      build_id: required(race, 'buildId'),
      geometry_id: required(race, 'geometryId'),
      racer_type_id: required(race, 'racerTypeId'),
      race_plan_seed: required(race, 'racePlanSeed'),
      race_action_stage: required(race, 'raceActionStage'),
      race_plan_enabled: race.racePlanEnabled ? 1 : 0,
      target_laps: race.targetLaps ?? null,
      target_duration_sec: race.targetDurationSec ?? null,
      world_schema_version: race.worldSchemaVersion ?? null,
      world_configs: canonicalString(race.worldConfigs ?? {}),
      roster_id: roster.id,
      racer_types_id: racerTypes.id,
      elapsed_sec: race.elapsedSec ?? null,
      results: canonicalString(race.results),
      winners: canonicalString(race.winners),
    };

    // The race is content-addressed too, over the row it is about to become. Two genuinely
    // different races always differ somewhere (the seed, the time, the outcome), so this never
    // merges two real races; what it makes idempotent is storing the SAME race twice, which a
    // retry or a double-submit would otherwise turn into two rows of one event.
    const id = contentId(row);
    const existing = db.prepare('SELECT id FROM races WHERE id = ?').get(id);
    if (existing) {
      return {
        id,
        rosterId: roster.id,
        racerTypesId: racerTypes.id,
        stored: { race: false, roster: roster.stored, racerTypes: racerTypes.stored },
      };
    }

    const cols = ['id', ...Object.keys(row)];
    db.prepare(
      `INSERT INTO races (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
    ).run(id, ...Object.values(row));

    return {
      id,
      rosterId: roster.id,
      racerTypesId: racerTypes.id,
      stored: { race: true, roster: roster.stored, racerTypes: racerTypes.stored },
    };
  });

  /** Turn a stored row back into the race it describes, with both references RESOLVED. */
  function hydrate(row) {
    if (!row) return null;
    const roster = db.prepare('SELECT content FROM rosters WHERE id = ?').get(row.roster_id);
    const racerTypes = db.prepare('SELECT content FROM racer_types WHERE id = ?').get(row.racer_types_id);
    const rosterContent = JSON.parse(roster.content);
    const racerTypesContent = JSON.parse(racerTypes.content);

    return {
      id: row.id,
      clientRaceId: row.client_race_id,
      team: row.team,
      teamNormalized: row.team_normalized,
      finishedAt: row.finished_at,
      identifierVersion: row.identifier_version,
      buildId: row.build_id,
      geometryId: row.geometry_id,
      racerTypeId: row.racer_type_id,
      racePlanSeed: row.race_plan_seed,
      raceActionStage: row.race_action_stage,
      racePlanEnabled: row.race_plan_enabled === 1,
      targetLaps: row.target_laps ?? undefined,
      targetDurationSec: row.target_duration_sec ?? undefined,
      worldSchemaVersion: row.world_schema_version,
      worldConfigs: JSON.parse(row.world_configs),
      elapsedSec: row.elapsed_sec ?? undefined,
      results: JSON.parse(row.results),
      winners: JSON.parse(row.winners),

      rosterId: row.roster_id,
      racerTypesId: row.racer_types_id,
      names: rosterContent.names,
      fieldSize: rosterContent.names.length,
      racerTypeOverrides: racerTypesContent.racerTypeOverrides,
      effectiveRacerTypes: racerTypesContent.effectiveRacerTypes,
    };
  }

  /** One race by its id, references resolved. `null` when there is no such race. */
  function getRaceById(id) {
    return hydrate(db.prepare('SELECT * FROM races WHERE id = ?').get(id));
  }

  /** One race by the id the CLIENT minted for it. `null` when it has not been stored. */
  function getRaceByClientId(clientRaceId) {
    return hydrate(db.prepare('SELECT * FROM races WHERE client_race_id = ?').get(clientRaceId));
  }

  /**
   * Every race belonging to a team, newest first.
   *
   * Matched on the NORMALISED key, so a caller that types the team in a different case gets the
   * same races — the same rule TEAMS-1 established for deciding that two users are colleagues, and
   * read from the same module rather than re-implemented here.
   */
  function listRacesByTeam(team, { limit = 100, offset = 0 } = {}) {
    if (!isWellFormedTeam(team)) return [];
    const rows = db
      .prepare(
        'SELECT * FROM races WHERE team_normalized = ? ORDER BY finished_at DESC, id ASC LIMIT ? OFFSET ?'
      )
      .all(normalizeTeam(team), limit, offset);
    return rows.map(hydrate);
  }

  /** The raw stored content of a roster / racer-type row, for tests and for a later history piece. */
  function getRoster(id) {
    const row = db.prepare('SELECT content FROM rosters WHERE id = ?').get(id);
    return row ? { id, ...JSON.parse(row.content) } : null;
  }

  function getRacerTypes(id) {
    const row = db.prepare('SELECT content FROM racer_types WHERE id = ?').get(id);
    return row ? { id, ...JSON.parse(row.content) } : null;
  }

  function counts() {
    return {
      races: db.prepare('SELECT COUNT(*) AS n FROM races').get().n,
      rosters: db.prepare('SELECT COUNT(*) AS n FROM rosters').get().n,
      racerTypes: db.prepare('SELECT COUNT(*) AS n FROM racer_types').get().n,
    };
  }

  return {
    storeRace,
    getRaceById,
    getRaceByClientId,
    listRacesByTeam,
    getRoster,
    getRacerTypes,
    counts,
    close: () => db.close(),
    /** @internal for tests that need to prove the database itself refuses an update. */
    _db: db,
  };
}
