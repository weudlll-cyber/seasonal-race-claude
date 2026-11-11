// ============================================================
// File:        identityStore.js
// Path:        server/src/website/identityStore.js
// Project:     RaceArena — WEBSITE-EMBED-1 pieces 3a and 3b
// Created:     2026-11-11
// Description: What the race knows about each website member it has met: id, display name, the
//              race role the last sign-in mapped them to, an EPOCH, and whether the website has
//              locked or deleted the account. Plus the account-changes feed's cursor (piece 3b).
//
// ── IN THE SERVER'S EXISTING SQLITE FILE, registrations.sqlite ─────────────────────────────────
// Not a new file: these rows are mutable and short-lived in meaning, like registrations, and the
// file is already in the backup's list (scripts/backup.mjs `SQLITE_FILES`). Not users.json: most
// members are PLAYERS, who get no user record at all (the brief's rule), and this store must answer
// for them too. `CREATE TABLE IF NOT EXISTS` when the store opens is the same check-then-create the
// registration store uses (registrationStore.js `SCHEMA`), so a live install, a restored older
// backup and a test folder all get the tables without a migration step.
//
// ── THE EPOCH IS THE ONE SESSION-ENDING MECHANISM FOR WEBSITE MEMBERS ──────────────────────────
// The same idea as `sessionEpoch` on a user record (usersStore.js, checked in guards.js): a session
// carries the epoch it was made under; bumping the identity's epoch ends every older session on its
// next request. It is bumped when a sign-in maps the member to a DIFFERENT role than last time (a
// revoked host's director session on another device ends), and by the feed's `locked` and `rights`
// events (piece 3b). Do not build a second mechanism beside it.
// ============================================================

import Database from 'better-sqlite3';
import { REGISTRATIONS_DB_PATH } from '../registrations/registrationStore.js';

/** The race roles a member can be mapped to. Never anything above admin (the brief's rule). */
export const WEBSITE_ROLES = ['player', 'operator', 'admin'];

const SCHEMA = `
CREATE TABLE IF NOT EXISTS website_identities (
  website_user_id  TEXT PRIMARY KEY,
  display_name     TEXT NOT NULL,
  mapped_role      TEXT NOT NULL,
  epoch            INTEGER NOT NULL DEFAULT 0,
  locked           INTEGER NOT NULL DEFAULT 0,
  deleted_at_ms    INTEGER,
  updated_at_ms    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS website_feed_state (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);
`;

const toIdentity = (row) =>
  row && {
    websiteUserId: row.website_user_id,
    displayName: row.display_name,
    mappedRole: row.mapped_role,
    epoch: row.epoch,
    locked: row.locked === 1,
    deleted: row.deleted_at_ms != null,
  };

/**
 * Open (creating the tables if needed) the identity store.
 * @param {string} [filePath] defaults to the registrations database
 * @param {{ now?: () => number }} [opts]
 */
export function createIdentityStore(
  filePath = REGISTRATIONS_DB_PATH,
  { now = () => Date.now() } = {}
) {
  const db = new Database(filePath);
  db.exec(SCHEMA);

  const getRow = (id) =>
    db.prepare('SELECT * FROM website_identities WHERE website_user_id = ?').get(id);

  /** A row for a member the race has not met, made by a feed event (no sign-in yet). */
  const ensureRow = (id) => {
    db.prepare(
      'INSERT OR IGNORE INTO website_identities (website_user_id, display_name, mapped_role, updated_at_ms) ' +
        "VALUES (?, '', 'player', ?)"
    ).run(id, now());
  };

  return {
    /** The identity, or null when the race has never heard of this member. */
    get(id) {
      return toIdentity(getRow(id)) ?? null;
    },

    /**
     * Record a sign-in: create the identity, or update its name and role. A role DIFFERENT from the
     * last one bumps the epoch, so sessions made under the old role end on their next request.
     * The caller has already refused locked and deleted members.
     * @returns {object} the identity after the sign-in
     */
    recordSignIn({ websiteUserId, displayName, role }) {
      if (!WEBSITE_ROLES.includes(role)) throw new Error(`not a website role: ${role}`);
      const apply = db.transaction(() => {
        const row = getRow(websiteUserId);
        if (!row) {
          db.prepare(
            'INSERT INTO website_identities (website_user_id, display_name, mapped_role, updated_at_ms) ' +
              'VALUES (?, ?, ?, ?)'
          ).run(websiteUserId, displayName, role, now());
        } else {
          const bump = row.mapped_role !== role ? 1 : 0;
          db.prepare(
            'UPDATE website_identities SET display_name = ?, mapped_role = ?, epoch = epoch + ?, ' +
              'updated_at_ms = ? WHERE website_user_id = ?'
          ).run(displayName, role, bump, now(), websiteUserId);
        }
        return toIdentity(getRow(websiteUserId));
      });
      return apply.immediate();
    },

    /** End every session of this member (feed: locked, rights). Safe to apply twice. */
    bumpEpoch(id) {
      ensureRow(id);
      db.prepare(
        'UPDATE website_identities SET epoch = epoch + 1, updated_at_ms = ? WHERE website_user_id = ?'
      ).run(now(), id);
    },

    /** Lock or unlock sign-in (feed: locked / unlocked). Safe to apply twice. */
    setLocked(id, locked) {
      ensureRow(id);
      db.prepare(
        'UPDATE website_identities SET locked = ?, updated_at_ms = ? WHERE website_user_id = ?'
      ).run(locked ? 1 : 0, now(), id);
    },

    /** Mark the member deleted (feed: deleted); the first time is kept. Safe to apply twice. */
    markDeleted(id) {
      ensureRow(id);
      db.prepare(
        'UPDATE website_identities SET deleted_at_ms = COALESCE(deleted_at_ms, ?), epoch = epoch + 1, ' +
          'updated_at_ms = ? WHERE website_user_id = ?'
      ).run(now(), now(), id);
    },

    /** Every member id marked deleted — what the display-time masking of past races reads (3b). */
    deletedIds() {
      return db
        .prepare('SELECT website_user_id FROM website_identities WHERE deleted_at_ms IS NOT NULL')
        .all()
        .map((r) => r.website_user_id);
    },

    /** The feed's cursor, or null before the first answer (piece 3b). */
    getFeedCursor() {
      return (
        db.prepare("SELECT value FROM website_feed_state WHERE key = 'cursor'").get()?.value ?? null
      );
    },

    /** Store the feed's cursor (piece 3b). */
    setFeedCursor(cursor) {
      db.prepare(
        "INSERT INTO website_feed_state (key, value) VALUES ('cursor', ?) " +
          'ON CONFLICT(key) DO UPDATE SET value = excluded.value'
      ).run(String(cursor));
    },

    /** Run several writes as one transaction (piece 3b applies a feed page this way). */
    transaction(fn) {
      return db.transaction(fn).immediate();
    },

    close() {
      db.close();
    },
  };
}

// One store per process, opened lazily so importing this module opens no file (the registrations
// router's pattern, routes/registrations.js `getDefaultRegistrationStore`).
let defaultStore = null;
export function getDefaultIdentityStore() {
  defaultStore ??= createIdentityStore();
  return defaultStore;
}
