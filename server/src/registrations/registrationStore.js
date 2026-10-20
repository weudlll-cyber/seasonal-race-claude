// ============================================================
// File:        registrationStore.js
// Path:        server/src/registrations/registrationStore.js
// Project:     RaceArena — REGISTRATION-1
// Created:     2026-10-21
// Description: The database player registrations live in. A director opens a registration for a
//              track with a fixed number of places and a deadline; players add their own names
//              until the deadline (the owner's decisions of 2026-10-20). Written and read by
//              routes/registrations.js (the director) and by the public link and the integration
//              seam for a signed-in players' site (REGISTRATION-1 piece 2).
//
// ── ITS OWN FILE: `DATA_ROOT/registrations.sqlite` ─────────────────────────────────────────────
// Not a table in `races.sqlite`, for the reason `raceStore.js` keeps sessions out of its file: the
// lifetimes disagree. Stored races are immutable by trigger and kept forever; a registration is
// edited (closed, extended, names removed) and deleted when the director is done with it. Putting
// mutable rows beside the immutability triggers would make "every table in this file refuses
// UPDATE" untrue. There is no `RA_*` override for the path: tests isolate it through `RA_DATA_DIR`
// (test/env-setup.js) or by passing a path, so the file is always under the data root and the
// backup (scripts/backup.mjs, `SQLITE_FILES`) cannot miss it.
//
// ── THE SERVER'S CLOCK DECIDES, AND NOTHING ELSE ───────────────────────────────────────────────
// A registration is CLOSED when it was closed early or when now >= its deadline. That is computed
// from the clock on every read and on every attempt to register; nothing has to run AT the deadline
// (no timer, no job), so a registration that expires while the server is down or the director's
// page is closed is closed the moment anybody asks, and a restart changes nothing.
//
// ── NO MORE PLAYERS THAN PLACES, AS A PROPERTY OF ONE TRANSACTION ──────────────────────────────
// `addEntry` counts and inserts inside one IMMEDIATE transaction. better-sqlite3 runs synchronously,
// so two requests cannot interleave between the count and the insert in this process, and taking
// the write lock first makes the same true against another connection to the file (measured by
// registrationStore.test.js with worker threads). The
// UNIQUE constraints on (registration, name key) and (registration, external id) make a doubled
// name or a doubled external id a property of the table too, not only of the check before it.
// ============================================================

import Database from 'better-sqlite3';
import { join } from 'path';
import { randomBytes, randomUUID } from 'crypto';
import { DATA_ROOT } from '../dataPaths.js';
import { normalizeTeam, isWellFormedTeam } from '../auth/teams.js';
// The player-name rules the Players tab and the player-groups route already use — one home each.
import { isNameLengthValid, nameTooLongMessage } from '../../../shared/nameLimits.mjs';
import { playerNameKey } from '../../../shared/playerNames.mjs';

const DEFAULT_REGISTRATIONS_PATH = join(DATA_ROOT, 'registrations.sqlite');

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** The shortest window a registration may have: one minute (the owner's decision of 2026-10-20). */
export const MIN_WINDOW_MS = MINUTE_MS;
/** The latest a deadline may be, counted from creation, also after an extension: 30 days. */
export const MAX_WINDOW_MS = 30 * DAY_MS;
/**
 * The most places a registration may have. The client sends the track's own limit, computed the way
 * the Players tab computes it (client/src/screens/SetupScreen/fieldCap.js `fieldCapFor`); the server
 * cannot read the operator's race defaults, so it bounds the number by the widest value the Dev
 * Screen lets either limit take (RaceDefaults.jsx accepts 1..100).
 */
export const CAPACITY_MAX = 100;
/** The longest event name, the same bound a player group's name has (routes/playerGroups.js). */
export const EVENT_NAME_MAX = 100;

/** The two ways a name arrives: through the public link, or from an integrated site. */
export const ENTRY_SOURCES = ['public', 'integration'];

const SCHEMA = `
CREATE TABLE IF NOT EXISTS registrations (
  id               TEXT PRIMARY KEY,
  -- The public code in the join link: 128 random bits, base64url. UNIQUE so a collision is refused
  -- by the table rather than silently sharing a link.
  code             TEXT NOT NULL UNIQUE,
  -- Who may see it: the director's team, both spellings, as a stored race carries them.
  team             TEXT NOT NULL,
  team_normalized  TEXT NOT NULL,
  created_by       TEXT NOT NULL,
  track_id         TEXT NOT NULL,
  -- The track's name as it was at creation, so the public page can name the track without reading
  -- the track records.
  track_name       TEXT NOT NULL,
  capacity         INTEGER NOT NULL,
  event_name       TEXT,
  created_at_ms    INTEGER NOT NULL,
  opens_at_ms      INTEGER NOT NULL,
  closes_at_ms     INTEGER NOT NULL,
  -- Set when the director closed it before the deadline; NULL otherwise.
  closed_early_ms  INTEGER
);

CREATE INDEX IF NOT EXISTS registrations_by_team ON registrations(team_normalized, created_at_ms DESC);

CREATE TABLE IF NOT EXISTS registration_entries (
  id               TEXT PRIMARY KEY,
  registration_id  TEXT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  -- The name exactly as accepted (trimmed), and its comparison key (shared/playerNames.mjs).
  name             TEXT NOT NULL,
  name_key         TEXT NOT NULL,
  source           TEXT NOT NULL,
  external_id      TEXT,
  created_at_ms    INTEGER NOT NULL,
  UNIQUE (registration_id, name_key),
  UNIQUE (registration_id, external_id)
);

CREATE INDEX IF NOT EXISTS entries_by_registration ON registration_entries(registration_id, created_at_ms);
`;

/** A refusal with a code the routes turn into a status; the message is fit for a person. */
function refusal(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

const iso = (ms) => (ms == null ? null : new Date(ms).toISOString());

/** A new public code: 16 random bytes, URL-safe, 22 characters. */
export function newRegistrationCode() {
  return randomBytes(16).toString('base64url');
}

/**
 * Open (creating if needed) the registration database.
 *
 * @param {string} [filePath] defaults to DATA_ROOT/registrations.sqlite
 * @param {{ now?: () => number }} [opts] the clock, in ms; tests pass their own
 */
export function createRegistrationStore(
  filePath = DEFAULT_REGISTRATIONS_PATH,
  { now = () => Date.now() } = {}
) {
  const db = new Database(filePath);
  // Asked for per connection: it is what makes deleting a registration delete its entries.
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);

  const isClosed = (row, at) => row.closed_early_ms != null || at >= row.closes_at_ms;

  const entriesOf = (id) =>
    db
      .prepare(
        'SELECT id, name, source, external_id, created_at_ms FROM registration_entries ' +
          'WHERE registration_id = ? ORDER BY created_at_ms, rowid'
      )
      .all(id);

  const countOf = (id) =>
    db.prepare('SELECT COUNT(*) AS n FROM registration_entries WHERE registration_id = ?').get(id)
      .n;

  /** The director's view of one row; `entries` only when asked for. */
  function toDirectorView(row, { withEntries = false } = {}) {
    const at = now();
    const taken = countOf(row.id);
    const view = {
      id: row.id,
      code: row.code,
      team: row.team,
      createdBy: row.created_by,
      trackId: row.track_id,
      trackName: row.track_name,
      capacity: row.capacity,
      eventName: row.event_name,
      createdAt: iso(row.created_at_ms),
      opensAt: iso(row.opens_at_ms),
      closesAt: iso(row.closes_at_ms),
      closedEarlyAt: iso(row.closed_early_ms),
      state: isClosed(row, at) ? 'closed' : 'open',
      taken,
      placesLeft: Math.max(0, row.capacity - taken),
    };
    if (withEntries) {
      view.entries = entriesOf(row.id).map((e) => ({
        id: e.id,
        name: e.name,
        source: e.source,
        ...(e.external_id != null ? { externalId: e.external_id } : {}),
        createdAt: iso(e.created_at_ms),
      }));
    }
    return view;
  }

  /**
   * The public view: what a person holding the link may know. NEVER another player's name, the
   * director, the team or the internal id — the routes return this object and nothing else.
   */
  function toPublicView(row) {
    const taken = countOf(row.id);
    return {
      eventName: row.event_name,
      trackName: row.track_name,
      capacity: row.capacity,
      placesLeft: Math.max(0, row.capacity - taken),
      state: isClosed(row, now()) ? 'closed' : 'open',
      closesAt: iso(row.closes_at_ms),
    };
  }

  const rowById = (id, team) => {
    if (typeof id !== 'string' || !isWellFormedTeam(team)) return undefined;
    return db
      .prepare('SELECT * FROM registrations WHERE id = ? AND team_normalized = ?')
      .get(id, normalizeTeam(team));
  };

  const rowByCode = (code) =>
    typeof code === 'string'
      ? db.prepare('SELECT * FROM registrations WHERE code = ?').get(code)
      : undefined;

  /** Refuses a deadline outside [now + 1 minute, created + 30 days]; returns it in ms. */
  function checkDeadline(closesAt, createdAtMs, at) {
    const ms = typeof closesAt === 'string' ? Date.parse(closesAt) : NaN;
    if (Number.isNaN(ms)) {
      throw refusal('INVALID_REGISTRATION', 'closesAt must be a date and time.');
    }
    if (ms - at < MIN_WINDOW_MS) {
      throw refusal(
        'INVALID_REGISTRATION',
        'The registration must stay open for at least 1 minute from now.'
      );
    }
    if (ms - createdAtMs > MAX_WINDOW_MS) {
      throw refusal(
        'INVALID_REGISTRATION',
        'A registration can stay open for at most 30 days from when it was opened.'
      );
    }
    return ms;
  }

  /**
   * Open a registration. It opens at once and closes at `closesAt`.
   *
   * @param {{ team: string, createdBy: string, trackId: string, trackName: string,
   *           capacity: number, eventName?: string|null, closesAt: string }} input
   */
  function create({ team, createdBy, trackId, trackName, capacity, eventName, closesAt }) {
    if (!isWellFormedTeam(team)) {
      throw refusal('INVALID_TEAM', 'A registration needs the team of the user who opens it.');
    }
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > CAPACITY_MAX) {
      throw refusal(
        'INVALID_REGISTRATION',
        `capacity must be a whole number from 1 to ${CAPACITY_MAX}.`
      );
    }
    const at = now();
    const closesAtMs = checkDeadline(closesAt, at, at);
    const id = randomUUID();
    const name = typeof eventName === 'string' && eventName.trim() ? eventName.trim() : null;
    db.prepare(
      `INSERT INTO registrations (id, code, team, team_normalized, created_by, track_id, track_name,
         capacity, event_name, created_at_ms, opens_at_ms, closes_at_ms, closed_early_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`
    ).run(
      id,
      newRegistrationCode(),
      team,
      normalizeTeam(team),
      String(createdBy ?? ''),
      trackId,
      trackName,
      capacity,
      name,
      at,
      at,
      closesAtMs
    );
    return toDirectorView(rowById(id, team), { withEntries: true });
  }

  /** The team's registrations, newest first, without their entries. At most `limit` (50). */
  function list(team, { limit = 50 } = {}) {
    if (!isWellFormedTeam(team)) return [];
    return db
      .prepare(
        'SELECT * FROM registrations WHERE team_normalized = ? ORDER BY created_at_ms DESC LIMIT ?'
      )
      .all(normalizeTeam(team), limit)
      .map((row) => toDirectorView(row));
  }

  /** One registration of this team, with its entries; null for an unknown id or another team's. */
  function get(id, team) {
    const row = rowById(id, team);
    return row ? toDirectorView(row, { withEntries: true }) : null;
  }

  /** Close it now. Closing a closed registration changes nothing and is not an error. */
  function close(id, team) {
    const row = rowById(id, team);
    if (!row) return null;
    if (!isClosed(row, now())) {
      db.prepare('UPDATE registrations SET closed_early_ms = ? WHERE id = ?').run(now(), id);
    }
    return get(id, team);
  }

  /**
   * Move the deadline later. Only while it is open: a closed registration stays closed (decided by
   * rule, REGISTRATION-1 morning sheet). The new deadline must be later than the current one and at
   * most 30 days from creation.
   */
  function extend(id, team, closesAt) {
    const row = rowById(id, team);
    if (!row) return null;
    const at = now();
    if (isClosed(row, at)) {
      throw refusal('CLOSED', 'This registration is closed and cannot be extended.');
    }
    const ms = checkDeadline(closesAt, row.created_at_ms, at);
    if (ms <= row.closes_at_ms) {
      throw refusal('INVALID_REGISTRATION', 'The new deadline must be later than the current one.');
    }
    db.prepare('UPDATE registrations SET closes_at_ms = ? WHERE id = ?').run(ms, id);
    return get(id, team);
  }

  /** Remove one name. Returns the registration, or null when either id is not this team's. */
  function removeEntry(id, team, entryId) {
    const row = rowById(id, team);
    if (!row) return null;
    const res = db
      .prepare('DELETE FROM registration_entries WHERE id = ? AND registration_id = ?')
      .run(String(entryId ?? ''), id);
    return res.changes === 0 ? null : get(id, team);
  }

  /** Delete the registration and every name in it. True when something was deleted. */
  function remove(id, team) {
    const row = rowById(id, team);
    if (!row) return false;
    db.prepare('DELETE FROM registrations WHERE id = ?').run(id);
    return true;
  }

  /**
   * Add a name to the registration behind `code`. Every rule in one transaction: the registration
   * exists and is open, the name is a valid player name, it is not already in this registration, an
   * external id is not already in it, and there is a place left.
   *
   * @param {string} code
   * @param {{ name: unknown, source: 'public'|'integration', externalId?: unknown }} input
   * @returns {{ entry: {id: string, name: string}, number: number, capacity: number }}
   */
  const addEntryTransaction = db.transaction((code, { name, source, externalId }) => {
    const row = rowByCode(code);
    if (!row) throw refusal('NOT_FOUND', 'There is no registration with this link.');
    const at = now();
    if (isClosed(row, at)) throw refusal('CLOSED', 'Registration is closed.');

    if (typeof name !== 'string' || !name.trim()) {
      throw refusal('INVALID_NAME', 'Please enter your name.');
    }
    const trimmed = name.trim();
    // NAME-LIMIT-1's rule: an over-long name is refused with the reason, never trimmed.
    if (!isNameLengthValid(trimmed)) throw refusal('INVALID_NAME', nameTooLongMessage([trimmed]));
    const key = playerNameKey(trimmed);

    if (!ENTRY_SOURCES.includes(source)) throw new Error(`unknown entry source: ${source}`);
    const external = source === 'integration' ? externalId : null;
    if (source === 'integration' && (typeof external !== 'string' || !external.trim())) {
      throw refusal('INVALID_ENTRY', 'externalId is required.');
    }

    const clash = db
      .prepare('SELECT name FROM registration_entries WHERE registration_id = ? AND name_key = ?')
      .get(row.id, key);
    if (clash) {
      // The same rule that refuses a name twice in one race (the owner's decision of 2026-10-04).
      throw refusal(
        'DUPLICATE_NAME',
        `The name "${clash.name}" is already registered for this race. Please choose a different ` +
          'name (capitals and extra spaces do not make a name different).'
      );
    }
    if (
      external != null &&
      db
        .prepare('SELECT 1 FROM registration_entries WHERE registration_id = ? AND external_id = ?')
        .get(row.id, external)
    ) {
      throw refusal('DUPLICATE_EXTERNAL_ID', 'This player is already registered for this race.');
    }
    if (countOf(row.id) >= row.capacity) throw refusal('FULL', 'This race is full.');

    const id = randomUUID();
    db.prepare(
      `INSERT INTO registration_entries (id, registration_id, name, name_key, source, external_id,
         created_at_ms) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, row.id, trimmed, key, source, external, at);
    return { entry: { id, name: trimmed }, number: countOf(row.id), capacity: row.capacity };
  });
  // ★ IMMEDIATE: the write lock is taken BEFORE the count is read. A deferred transaction would let
  // a second connection read the same count and then fail its write with SQLITE_BUSY instead of
  // waiting; immediate makes it wait (better-sqlite3's busy timeout) and then count again.
  const addEntry = (code, input) => addEntryTransaction.immediate(code, input);

  /** The public view of the registration behind `code`, or null. */
  function publicInfo(code) {
    const row = rowByCode(code);
    return row ? toPublicView(row) : null;
  }

  /**
   * A device's own entry, found by the entry id its cookie carries: its name and its place in the
   * list (1-based, in the order names arrived), or null when the entry is gone (removed by the
   * director) or belongs to another registration.
   */
  function ownEntry(code, entryId) {
    const row = rowByCode(code);
    if (!row || typeof entryId !== 'string') return null;
    const entries = entriesOf(row.id);
    const index = entries.findIndex((e) => e.id === entryId);
    if (index < 0) return null;
    return { name: entries[index].name, number: index + 1, capacity: row.capacity };
  }

  return {
    create,
    list,
    get,
    close,
    extend,
    removeEntry,
    remove,
    addEntry,
    publicInfo,
    ownEntry,
    // The database handle's own close, named apart from `close` (which closes a REGISTRATION).
    closeDatabase: () => db.close(),
  };
}
