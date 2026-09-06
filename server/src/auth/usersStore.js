// ============================================================
// File:        usersStore.js
// Path:        server/src/auth/usersStore.js
// Project:     RaceArena
// Created:     2026-06-13
// Description: Users data store — bcrypt hashing, username normalization, CRUD
// ============================================================

import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { readFileSync, existsSync, chmodSync, statSync } from 'node:fs';
import { join } from 'path';
import { atomicWriteJson } from '../../utils/atomicWriteJson.js';
import { DATA_ROOT } from '../dataPaths.js';
import { normalizeTeam, isWellFormedTeam } from './teams.js';

const DEFAULT_USERS_PATH = process.env.RA_USERS_DB ?? join(DATA_ROOT, 'users.json');

const BCRYPT_COST = 12;

// ── Username normalization ────────────────────────────────────────────────────

// NFC is the deliberate canonical form; NFKC was rejected because compatibility folding can merge visually-distinct usernames unexpectedly.
export function normalizeUsername(raw) {
  return String(raw).trim().normalize('NFC').toLowerCase();
}

// ── Password hashing ──────────────────────────────────────────────────────────

export async function hashPassword(plain) {
  if (!plain || !String(plain).trim()) {
    const err = new Error('Password must not be empty');
    err.code = 'INVALID_PASSWORD';
    throw err;
  }
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain, hash) {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

// ── Safe projection ───────────────────────────────────────────────────────────

export function toSafeUser(user) {
  const { passwordHash: _p, sessionEpoch: _e, ...safe } = user;
  return safe;
}

// ── Store factory ─────────────────────────────────────────────────────────────

export function createUsersStore(filePath = DEFAULT_USERS_PATH) {
  function readUsers() {
    if (!existsSync(filePath)) return [];
    const raw = readFileSync(filePath, 'utf8').trim();
    if (!raw) return [];
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const err = new Error('users.json is corrupt or not an array');
      err.code = 'USERS_STORE_CORRUPT';
      throw err;
    }
    if (!Array.isArray(parsed)) {
      const err = new Error('users.json is corrupt or not an array');
      err.code = 'USERS_STORE_CORRUPT';
      throw err;
    }
    return parsed;
  }

  function countUsers() {
    return readUsers().length;
  }

  /** @internal Returns the full auth record INCLUDING passwordHash. Callers that respond
   * to a client MUST pass the result through toSafeUser first. */
  function findAuthRecordByUsername(rawOrNormalized) {
    const normalized = normalizeUsername(rawOrNormalized);
    return readUsers().find((u) => u.usernameNormalized === normalized) ?? null;
  }

  /** @internal Returns the full auth record INCLUDING passwordHash. Callers that respond
   * to a client MUST pass the result through toSafeUser first. */
  function findAuthRecordById(id) {
    return readUsers().find((u) => u.id === id) ?? null;
  }

  // ── Teams ───────────────────────────────────────────────────────────────────
  //
  // THE SET OF TEAMS IS DERIVED, NEVER STORED SEPARATELY. See teams.js for why there is no teams
  // table: the live teams ARE the teams on live users, and a second home for that fact would be a
  // second thing to keep true.

  /**
   * Every distinct team currently on a user, newest-agnostic and stable.
   *
   * CANONICAL SPELLING: users are read in stored order (which is creation order, since createUser
   * pushes), and the FIRST display spelling seen for a normalised key wins. That is deterministic
   * rather than arbitrary, and after createUser's adoption rule there is normally only one
   * spelling per key to choose from anyway — the tie-break only matters for records written
   * before teams existed or edited outside the store.
   *
   * @param {object[]} [usersList] pass the list already read inside a lock, so a caller does not
   *                               re-read the file mid-transaction and see a different world.
   * @returns {{name: string, key: string, memberCount: number}[]} sorted by display name
   */
  function listTeams(usersList) {
    const users = usersList ?? readUsers();
    const byKey = new Map();
    for (const u of users) {
      if (!isWellFormedTeam(u.team)) continue;  // a user awaiting the backfill has none; skip, never invent
      const key = u.teamNormalized ?? normalizeTeam(u.team);
      const seen = byKey.get(key);
      if (seen) seen.memberCount += 1;
      else byKey.set(key, { name: u.team, key, memberCount: 1 });
    }
    return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Decide what team a create/update is actually asking for, against the teams that exist.
   * THIS IS THE TYPO GATE — the reasoning for its two branches is in teams.js and is not repeated.
   *
   * @param {string} raw            the team as typed
   * @param {boolean} allowNewTeam  the caller's EXPLICIT statement that it is founding a new team
   * @param {object[]} users        the list read inside the lock
   * @returns {{team: string, teamNormalized: string}} the display form to store, and its key
   * @throws INVALID_TEAM if nothing usable was passed; UNKNOWN_TEAM if it matches no existing team
   *         and the caller did not say it meant to make one.
   */
  function resolveTeam(raw, allowNewTeam, users) {
    if (!isWellFormedTeam(raw)) {
      const err = new Error('Team is required');
      err.code = 'INVALID_TEAM';
      throw err;
    }

    const key = normalizeTeam(raw);
    const known = listTeams(users);
    const match = known.find((t) => t.key === key);

    // ADOPT THE EXISTING SPELLING. "seasonal entertainment" typed into the form becomes the
    // "Seasonal Entertainment" already on the other members — one display form per team, always.
    if (match) return { team: match.name, teamNormalized: key };

    if (!allowNewTeam) {
      const err = new Error(
        known.length
          ? `Unknown team "${String(raw).trim()}". Existing teams: ${known.map((t) => t.name).join(', ')}. ` +
            'Pick one, or pass allowNewTeam to create a new team on purpose.'
          : `Unknown team "${String(raw).trim()}". No team exists yet; pass allowNewTeam to create the first one.`
      );
      err.code = 'UNKNOWN_TEAM';
      err.knownTeams = known.map((t) => t.name);
      throw err;
    }

    // A NEW TEAM, ON PURPOSE. Store the tidied display form so the spelling every later member
    // adopts is already whitespace-stable.
    return { team: String(raw).trim().replace(/\s+/gu, ' '), teamNormalized: key };
  }

  // Shared write helper — all three mutating methods use this to apply chmod.
  // POSIX mode bits are a soft no-op on Windows (ACL-based); hardens Linux/Docker deployments.
  function writeUsers(users) {
    atomicWriteJson(filePath, users, { mode: 0o600 });
    try {
      chmodSync(filePath, 0o600);
    } catch {
      // chmod is only load-bearing on the EPERM-overwrite fallback (≈Windows, where mode bits are
      // ACL-based no-ops anyway). On the normal POSIX rename path the file already inherited 0o600
      // from the tmp inode. Only fail loud if the file is ACTUALLY left more permissive than 0o600.
      if (process.platform !== 'win32') {
        const fileMode = statSync(filePath).mode & 0o777;
        if (fileMode & 0o077) {  // any group/other permission bit set
          const err = new Error('users.json could not be secured to 0o600');
          err.code = 'USERS_STORE_PERM';
          throw err;
        }
      }
    }
  }

  // Promise-chain lock: serialises ALL mutating operations (create/update/delete) so concurrent
  // calls cannot interleave, cause lost writes, duplicate usernames, or bypass the last-admin check.
  // The chain always settles to resolved (via the no-op rejection handler) so a failed call never
  // blocks its successors.
  let lockChain = Promise.resolve();

  function enqueue(run) {
    const result = lockChain.then(run);
    lockChain = result.then(
      () => {},
      () => {},
    );
    return result;
  }

  // `team` is REQUIRED and has NO DEFAULT HERE, deliberately. Every call site names the team it
  // means — the admin path passes what the admin chose, and the two call sites that pass the
  // founding constant (setup, and the recovery CLI) do so visibly, at the call site, where a
  // reader can see which team a user is landing in. A default in this function would be the one
  // place a user could acquire a team nobody chose.
  async function createUser({ username, password, role, team, allowNewTeam = false, createdBy }) {
    return enqueue(async function run() {
      if (!username || !String(username).trim()) {
        const err = new Error('Username must not be empty');
        err.code = 'INVALID_USERNAME';
        throw err;
      }
      if (!password || !String(password).trim()) {
        const err = new Error('Password must not be empty');
        err.code = 'INVALID_PASSWORD';
        throw err;
      }
      if (role !== 'operator' && role !== 'admin') {
        const err = new Error('Role must be "operator" or "admin"');
        err.code = 'INVALID_ROLE';
        throw err;
      }

      const usernameNormalized = normalizeUsername(username);
      const users = readUsers();

      if (users.some((u) => u.usernameNormalized === usernameNormalized)) {
        const err = new Error('Username already taken');
        err.code = 'USERNAME_TAKEN';
        throw err;
      }

      // Resolved INSIDE the lock against the freshly read list, for the same reason the last-admin
      // guard is: two concurrent creates naming the same new team must not each decide it is new.
      const resolvedTeam = resolveTeam(team, allowNewTeam, users);

      const record = {
        id: randomUUID(),
        username: String(username).trim(),  // display form
        usernameNormalized,                 // uniqueness key (NFC + lowercased)
        passwordHash: await hashPassword(password),
        role,
        team: resolvedTeam.team,                       // display form, adopted from the team if it exists
        teamNormalized: resolvedTeam.teamNormalized,   // the join key — see teams.js
        // THE SESSION-INVALIDATION MECHANISM, and the only one. Bumping this ends every session
        // that predates the bump, because requireAuth (guards.js) compares the session's stamped
        // copy against this and rejects a mismatch. It is bumped in updateUser inside the same
        // serialised write as the new hash, so a password can never change without it.
        // DO NOT BUILD A SECOND ONE beside it — no enumerating the session store, no deleting
        // rows. A route that must keep the REQUESTING session alive calls restampSession.js.
        sessionEpoch: 0,                    // bumped on password reset; login writes this into session
        createdAt: new Date().toISOString(),
        createdBy: createdBy ?? 'setup',
      };

      // NOTE: this read-modify-write is NOT the atomic create-if-none bootstrap guard;
      // the atomic single-admin guard is added in Phase A step 3 (AUTH.md §5).
      users.push(record);
      writeUsers(users);

      return toSafeUser(record);
    });
  }

  async function updateUser(id, { role, password, team, allowNewTeam = false } = {}) {
    return enqueue(async function run() {
      const hasRole = role !== undefined && role !== null;
      const hasPassword = password !== undefined && password !== null && password !== '';
      // A team is DATA, so moving a user between teams is an ordinary edit — it does not touch
      // the password, does not bump sessionEpoch, and does not log anybody out.
      const hasTeam = team !== undefined && team !== null;

      if (!hasRole && !hasPassword && !hasTeam) {
        const err = new Error('updateUser requires at least one of: role, password, team');
        err.code = 'EMPTY_UPDATE';
        throw err;
      }

      const users = readUsers();
      const idx = users.findIndex((u) => u.id === id);
      if (idx === -1) {
        const err = new Error('User not found');
        err.code = 'NOT_FOUND';
        throw err;
      }

      const record = { ...users[idx] };

      if (hasRole) {
        if (role !== 'operator' && role !== 'admin') {
          const err = new Error('Role must be "operator" or "admin"');
          err.code = 'INVALID_ROLE';
          throw err;
        }
        // Last-admin guard: demoting the only admin is forbidden (checked inside lock against
        // the freshly read list, so concurrent demotions cannot both pass).
        if (record.role === 'admin' && role === 'operator') {
          const adminCount = users.filter((u) => u.role === 'admin').length;
          if (adminCount <= 1) {
            const err = new Error('Cannot demote the last admin');
            err.code = 'LAST_ADMIN';
            throw err;
          }
        }
        record.role = role;
      }

      if (hasTeam) {
        // Same gate as create, same reasoning (teams.js) — an admin retyping a team on an edit
        // can split it exactly as easily as one retyping it on a create.
        const resolvedTeam = resolveTeam(team, allowNewTeam, users);
        record.team = resolvedTeam.team;
        record.teamNormalized = resolvedTeam.teamNormalized;
      }

      if (hasPassword) {
        record.passwordHash = await hashPassword(password);
        // Bump epoch so requireAuth invalidates sessions that predate this reset.
        record.sessionEpoch = (record.sessionEpoch ?? 0) + 1;
      }

      users[idx] = record;
      writeUsers(users);
      return toSafeUser(record);
    });
  }

  async function deleteUser(id) {
    return enqueue(function run() {
      const users = readUsers();
      const idx = users.findIndex((u) => u.id === id);
      if (idx === -1) {
        const err = new Error('User not found');
        err.code = 'NOT_FOUND';
        throw err;
      }

      const record = users[idx];

      // Last-admin guard: deleting the only admin is forbidden (checked inside lock against
      // the freshly read list).
      if (record.role === 'admin') {
        const adminCount = users.filter((u) => u.role === 'admin').length;
        if (adminCount <= 1) {
          const err = new Error('Cannot delete the last admin');
          err.code = 'LAST_ADMIN';
          throw err;
        }
      }

      users.splice(idx, 1);
      writeUsers(users);
      return toSafeUser(record);
    });
  }

  return {
    readUsers,
    countUsers,
    listTeams,
    findAuthRecordByUsername,
    findAuthRecordById,
    createUser,
    updateUser,
    deleteUser,
  };
}

// Default instance bound to DEFAULT_USERS_PATH
export default createUsersStore();
